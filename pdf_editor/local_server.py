"""Local-only PDF Studio server with a layout-aware PDF to DOCX converter."""

from __future__ import annotations

import json
import logging
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PACKAGES = ROOT / ".local-python"
if PACKAGES.is_dir():
    sys.path.insert(0, str(PACKAGES))

try:
    from pdf2docx import Converter
except ImportError:
    Converter = None

STATIC_FILES = {"index.html", "app.js", "styles.css", "fonts.js"}
STATIC_DIRS = {"libs", "fonts"}
MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".ttf": "font/ttf",
}
MAX_PDF_BYTES = 40 * 1024 * 1024
ALLOWED_ORIGINS = {
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "https://amon28.github.io",
}


class StudioHandler(BaseHTTPRequestHandler):
    server_version = "PDFStudioLocal/1.0"

    def valid_host(self) -> bool:
        host = self.headers.get("Host", "").split(":", 1)[0].lower()
        if host in ("127.0.0.1", "localhost"):
            return True
        self.send_error(403)
        return False

    def reply(self, status: int, data: bytes, content_type: str, **headers: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        for key, value in headers.items():
            self.send_header(key.replace("_", "-"), value)
        self.end_headers()
        self.wfile.write(data)

    def json_reply(self, status: int, value: dict) -> None:
        self.reply(status, json.dumps(value).encode("utf-8"), "application/json; charset=utf-8")

    def do_OPTIONS(self) -> None:
        if not self.valid_host():
            return
        if urlsplit(self.path).path != "/api/word":
            self.send_error(404)
            return
        if self.headers.get("Origin") not in ALLOWED_ORIGINS:
            self.send_error(403)
            return
        if self.headers.get("Access-Control-Request-Method") != "POST":
            self.send_error(405)
            return
        self.reply(
            204,
            b"",
            "text/plain",
            Access_Control_Allow_Methods="POST",
            Access_Control_Allow_Headers="Content-Type",
            Access_Control_Allow_Private_Network="true",
        )

    def do_GET(self) -> None:
        if not self.valid_host():
            return
        path = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        if path == "api/health":
            self.json_reply(200, {"converter": Converter is not None})
            return
        parts = Path(path).parts
        if not parts or ".." in parts or any(part.startswith(".") for part in parts):
            self.send_error(404)
            return
        if path not in STATIC_FILES and not (len(parts) == 2 and parts[0] in STATIC_DIRS):
            self.send_error(404)
            return
        file_path = ROOT.joinpath(*parts)
        if not file_path.is_file():
            self.send_error(404)
            return
        self.reply(200, file_path.read_bytes(), MIME_TYPES.get(file_path.suffix, "application/octet-stream"))

    def do_POST(self) -> None:
        if not self.valid_host():
            return
        origin = self.headers.get("Origin")
        if origin and origin not in ALLOWED_ORIGINS:
            self.send_error(403)
            return
        if urlsplit(self.path).path != "/api/word":
            self.send_error(404)
            return
        if Converter is None:
            self.json_reply(503, {"error": "The local converter is not installed. Run start-local.cmd."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip() != "application/pdf":
            self.json_reply(415, {"error": "Expected a PDF file."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length < 5 or length > MAX_PDF_BYTES:
            self.json_reply(413, {"error": "PDF must be between 5 bytes and 40 MB."})
            return
        pdf_bytes = self.rfile.read(length)
        if len(pdf_bytes) != length or not pdf_bytes.startswith(b"%PDF-"):
            self.json_reply(400, {"error": "Invalid PDF data."})
            return
        try:
            with tempfile.TemporaryDirectory(prefix="pdf-studio-") as temp:
                pdf_path = Path(temp) / "input.pdf"
                docx_path = Path(temp) / "output.docx"
                pdf_path.write_bytes(pdf_bytes)
                converter = Converter(str(pdf_path))
                try:
                    converter.convert(str(docx_path))
                finally:
                    converter.close()
                result = docx_path.read_bytes()
            if not result.startswith(b"PK\x03\x04"):
                raise ValueError("Converter did not produce a Word document")
            self.reply(
                200,
                result,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        except Exception:
            logging.exception("PDF to Word conversion failed")
            self.json_reply(422, {"error": "Could not convert this PDF. Check the local server log."})


def main() -> None:
    if Converter is None:
        print("pdf2docx is missing. Run start-local.cmd to install the local converter.", file=sys.stderr)
        raise SystemExit(1)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), StudioHandler)
    print("PDF Studio is ready at http://127.0.0.1:8765")
    print("PDFs are converted on this computer. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
