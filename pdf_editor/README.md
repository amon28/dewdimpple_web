# PDF Studio

A feature-rich, offline-first PDF editor that runs entirely in your browser.

## Quick start

**Double-click `index.html`** and you're in. No install, no server, no internet needed —
all libraries and fonts are bundled locally. It works on phones too — on narrow screens
the tool rail moves to a bottom bar and the pages/properties panels become slide-out
drawers (use the **pages** and **properties** buttons in the top bar).

> Tip: If your browser ever refuses to load the bundled PDF worker (rare, only on
> `file://` in some setups), either open `index.html` from a simple local server or
> just click *Open* and import your PDF — pdf.js automatically falls back to a
> script-based worker in that case.

## What you can do

- **Import a PDF** — via the *Open* button or by dragging a file onto the window.
- **Page overview** — thumbnails on the left show every page; click one to jump.
  Add blank pages or delete the current page from the panel header.
- **Annotate with the tools on the left:**
  - **Select** — move, resize and rotate anything you've placed (V)
  - **Pan** — drag to scroll the page (H)
  - **Text** — click the page to add a text box, then just type. Double-click
    existing text to edit it (T)
  - **Image** — pick an image, then click the page to place it
  - **Signature** — draw one on the pad, type it in a cursive font, or upload a
    PNG; then click the page to stamp it
  - **Pen** — freehand notes (P)
  - **Highlighter** — mark text like a marker (Y)
  - **Rectangle / Ellipse / Line / Arrow** — drag to draw (R / O / L / A)
- **Properties panel (right)** — tweak whatever is selected: fonts (Helvetica,
  Times, Courier, embedded **Roboto**, cursive **Pacifico**), size, color,
  bold/italic/underline, alignment, rotation, opacity, layer order, position.
- **Save** — the *Save PDF* button flattens everything back into the PDF:
  text is stored as real selectable text (with embedded fonts), images and
  signatures are embedded, shapes stay vector, and the file downloads as
  `*-edited.pdf`.

## Shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl+O` / `Ctrl+S` | Open / Save |
| `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` | Undo / Redo |
| `Delete` | Remove selected item |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+D` | Copy / Paste / Duplicate |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Bold / Italic / Underline |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom in / out / 100% |
| `Ctrl+scroll` | Zoom |
| `V H T P Y R O L A` | Switch tools |
| Arrow keys | Nudge selection (hold Shift for 10×) |
| `Esc` | Deselect / exit tool |

## Project layout

```
index.html        app shell + layout
styles.css        all styling
app.js            all editor logic (rendering, tools, save pipeline)
fonts.js          base64-embedded TTF fonts (Roboto family + Pacifico)
fonts/           raw font files (source for fonts.js)
libs/             vendor libraries: pdf.js, pdf-lib, fontkit, fabric.js
test-assets/      sample files used during development/testing
```

## Regenerating the embedded fonts bundle

`fonts.js` is a build artifact. If you add or replace fonts in `fonts/`, rebuild it
with:

```bash
for f in fonts/*.ttf; do
  key=$(basename "$f" .ttf)
  printf '  "%s": "%s",\n' "$key" "$(base64 -w0 "$f")"
done
```
wrapped in `window.EMBEDDED_FONTS = { ... };`

## Notes & limitations

- Text uses the standard 14 PDF fonts plus the bundled Roboto/Pacifico; any other
  family chosen in the picker maps to its closest standard equivalent on save.
- Transparency for highlights and translucent fills is pre-composited into the
  color so it renders in every PDF viewer (some viewers need real ExtGState
  entries, which pdf-lib can't always attach to every PDF's page tree).
- Very large multi-page documents work, but thumbnails render lazily as you scroll.
