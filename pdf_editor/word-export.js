'use strict';
// Small, dependency-free DOCX writer. DOCX is a ZIP of Office Open XML parts.
// Keeping this local lets the editor export from file:// without uploading a PDF.
window.WordExport = (() => {
  const enc = new TextEncoder();
  const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const bytes = (value) => typeof value === 'string' ? enc.encode(value) : value;
  const u16 = (v) => [v & 255, (v >>> 8) & 255];
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const crcTable = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(data) {
    let c = 0xffffffff;
    for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(entries) {
    const parts = [], central = [];
    let offset = 0;
    for (const [name, value] of entries) {
      const n = enc.encode(name), data = bytes(value), crc = crc32(data);
      const local = new Uint8Array([
        0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(n.length), ...u16(0),
      ]);
      parts.push(local, n, data);
      central.push(new Uint8Array([
        0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc),
        ...u32(data.length), ...u32(data.length), ...u16(n.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ]), n);
      offset += local.length + n.length + data.length;
    }
    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array([
      0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
      ...u32(centralSize), ...u32(offset), ...u16(0),
    ]);
    return new Blob([...parts, ...central, end], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
  const documentStart = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"' +
    ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"' +
    ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' +
    ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>';
  const documentEnd = '</w:body></w:document>';
  const pageSize = (width, height) => {
    const w = Math.round(Math.max(72, Math.min(1584, width)) * 20);
    const h = Math.round(Math.max(72, Math.min(1584, height)) * 20);
    return `<w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="288" w:right="288" w:bottom="288" w:left="288" w:header="0" w:footer="0" w:gutter="0"/>`;
  };
  const section = (width, height) => `<w:sectPr>${pageSize(width, height)}</w:sectPr>`;
  const paragraph = (text) => `<w:p><w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const baseParts = (documentXml, images) => {
    const entries = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        (images.length ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : '') +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>'],
      ['word/document.xml', documentXml],
      ['word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        images.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${i + 1}.jpg"/>`).join('') +
        '</Relationships>'],
    ];
    images.forEach((image, i) => entries.push([`word/media/page${i + 1}.jpg`, image]));
    return zip(entries);
  };
  function extractLines(items) {
    // PDF text often arrives one word at a time and in arbitrary paint order.
    // Group by baseline, then restore left-to-right order and visible gaps.
    const positioned = items.filter((item) => item.str && item.str.trim()).map((item) => ({
      text: item.str, x: item.transform[4], y: item.transform[5],
      width: item.width || 0, height: item.height || Math.abs(item.transform[3]) || 12,
    })).sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const item of positioned) {
      let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2, Math.min(candidate.height, item.height) * 0.35));
      if (!line) { line = { y: item.y, height: item.height, parts: [] }; lines.push(line); }
      line.parts.push(item);
    }
    return lines.sort((a, b) => b.y - a.y).map((line) => {
      line.parts.sort((a, b) => a.x - b.x);
      let result = '', right = -Infinity;
      for (const part of line.parts) {
        const gap = part.x - right;
        if (result && !/\s$/.test(result) && gap > Math.max(1.5, part.height * 0.12)) result += ' ';
        result += part.text;
        right = Math.max(right, part.x + part.width);
      }
      return result.trim();
    }).filter(Boolean);
  }
  async function editable(pdf) {
    const pages = [], first = await pdf.getPage(1);
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      pages.push(extractLines((await page.getTextContent()).items));
    }
    // A page without selectable text may be a scan. Preserve it via layout export
    // rather than silently dropping its content from an otherwise editable file.
    if (pages.some((lines) => !lines.length)) return null;
    const size = first.getViewport({ scale: 1 });
    const body = pages.map((lines, i) => (i ? pageBreak : '') + lines.map(paragraph).join('')).join('') + section(size.width, size.height);
    return baseParts(documentStart + body + documentEnd, []);
  }
  function imageParagraph(index, width, height, sectionXml = '') {
    const cx = Math.round(width * 12700), cy = Math.round(height * 12700);
    return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${sectionXml}</w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${index}" name="PDF page ${index}"/>` +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
      `<pic:nvPicPr><pic:cNvPr id="${index}" name="Page ${index}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="rId${index}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>` +
      '</wp:inline></w:drawing></w:r></w:p>';
  }
  async function layout(pdf, onProgress) {
    const images = [], sections = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const size = page.getViewport({ scale: 1 });
      const renderScale = Math.min(2, 1800 / Math.max(size.width, size.height));
      const view = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
      await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: view }).promise;
      const image = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!image) throw new Error('Could not render page ' + i);
      images.push(new Uint8Array(await image.arrayBuffer()));
      canvas.width = canvas.height = 0;
      const wordWidth = Math.max(72, Math.min(1584, size.width));
      const wordHeight = Math.max(72, Math.min(1584, size.height));
      const fit = Math.min((wordWidth - 28.8) / size.width, (wordHeight - 64) / size.height);
      sections.push({ width: wordWidth, height: wordHeight, imageWidth: size.width * fit, imageHeight: size.height * fit });
      if (onProgress) onProgress(i, pdf.numPages);
    }
    const body = sections.map((page, i) => imageParagraph(i + 1, page.imageWidth, page.imageHeight,
      i < sections.length - 1 ? section(page.width, page.height) : '')).join('') +
      section(sections[sections.length - 1].width, sections[sections.length - 1].height);
    return baseParts(documentStart + body + documentEnd, images);
  }
  return { editable, layout, extractLines };
})();
