'use strict';
/* ============================================================
   PDF Studio — application logic
   ============================================================ */

/* ---------- tiny helpers ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => Math.round(v * 10) / 10;

const pdfjsLib = window.pdfjsLib;
const PDFLib = window.PDFLib;
// `fabric` is a global `var` declared by the fabric UMD bundle — use it directly.

if (pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';

/* ---------- icons ---------- */
const ICONS = {
  open: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  redo: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  cursor: '<path d="M4 4l7.5 16 2.6-8 8-2.6z"/>',
  pan: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
  text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  signature: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>',
  pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><polyline points="2 2 9.6 9.6"/>',
  highlighter: '<path d="M6 20h12"/><path d="M17.5 3.5l3 3L8 19H5v-3z"/><path d="M14.5 6.5l3 3"/>',
  rect: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  line: '<line x1="5" y1="19" x2="19" y2="5"/>',
  arrow: '<line x1="5" y1="19" x2="19" y2="5"/><polyline points="11 5 19 5 19 13"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  tofront: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><line x1="12" y1="5" x2="12" y2="19"/><polyline points="8.5 8.5 12 5 15.5 8.5"/>',
  toback: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><line x1="12" y1="5" x2="12" y2="19"/><polyline points="8.5 15.5 12 19 15.5 15.5"/>',
  'chev-left': '<polyline points="15 18 9 12 15 6"/>',
  'chev-right': '<polyline points="9 18 15 12 9 6"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  pages: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
};
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ''; });

/* ---------- custom cursors (colored SVGs — avoids the GPU/AMD white-cursor bug) ---------- */
function svgCursor(svg, hx, hy) {
  const encoded = svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'");
  return `url("data:image/svg+xml,${encoded}") ${hx} ${hy}, auto`;
}
const CURSORS = {
  select: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M12 3v18M12 3L7 8M12 3l5 5' stroke='#4f46e5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/></svg>", 12, 3),
  move: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3' stroke='#4f46e5' stroke-width='2' stroke-linecap='round'/></svg>", 12, 12),
  text: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect x='11' y='3' width='2' height='18' rx='1' fill='#4f46e5'/><path d='M7 6h10M7 18h10' stroke='#4f46e5' stroke-width='2' stroke-linecap='round'/></svg>", 12, 12),
  crosshair: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='4.5' fill='none' stroke='#4f46e5' stroke-width='2'/><path d='M12 2v6M12 16v6M2 12h6M16 12h6' stroke='#4f46e5' stroke-width='2' stroke-linecap='round'/></svg>", 12, 12),
  pen: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='7' cy='7' r='4.5' fill='#4f46e5'/><path d='M10.5 10.5l9 9' stroke='#4f46e5' stroke-width='3.5' stroke-linecap='round'/></svg>", 7, 7),
  highlighter: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect x='2' y='15' width='20' height='6' rx='2.5' fill='#fde047' stroke='#b45309' stroke-width='1.5'/><path d='M7 15L5 4l4 .7-2 10.3' fill='#b45309'/></svg>", 6, 15),
  grab: svgCursor("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M9 12V7a1.75 1.75 0 0 1 3.5 0v4.5M12.5 11.5V6a1.75 1.75 0 0 1 3.5 0v5.5M16 12V8a1.75 1.75 0 0 1 3.5 0v6.5L16 21h-6.5L6 17.5l1.5-2L9 17v-4' fill='#fff' stroke='#4f46e5' stroke-width='1.6' stroke-linejoin='round'/></svg>", 12, 12),
};

function pageCenter() {
  const sz = state.pageSizes[state.currentPage - 1] || { w: 612, h: 792 };
  return { x: sz.w / 2, y: sz.h / 2 };
}

/* ---------- DOM refs ---------- */
const stage = $('stage');
const viewport = $('viewport');
const pdfCanvas = $('pdfCanvas');
const overlayCanvas = $('overlayCanvas');
const sheetWrap = $('sheetWrap');
const thumbList = $('thumbList');

/* ---------- global state ---------- */
const state = {
  pdfBytes: null,        // Uint8Array of the working PDF
  pdfDoc: null,          // pdf.js document
  pdfLibDoc: null,       // pdf-lib document (for page ops + save base)
  fileName: '',
  pageCount: 0,
  currentPage: 1,
  zoom: 1,
  zoomMode: 'fit-width',
  tool: 'select',
  annotations: [],       // per page: array of fabric object JSON
  pending: null,         // {type:'image'|'stamp', dataUrl}
  customFontBytes: {},
  undoStack: [],
  redoStack: [],
  dirty: false,
  loading: false,
  livePushed: false,
  pageSizes: [],
  sigState: { tab: 'draw', color: '#111827', typeColor: '#111827', width: 3, strokes: [], drawing: false, uploadDataUrl: null },
};

/* ---------- tool style presets (seeded from the props panel) ---------- */
const TEXT_STYLE = { fontFamily: 'Helvetica', fontSize: 24, color: '#1f2430', weight: 'normal', style: 'normal', align: 'left' };
const INK_STYLE = { color: '#1f2430', width: 3 };
const SHAPE_STYLE = { fill: 'rgba(79,70,229,0.12)', stroke: '#4f46e5', strokeWidth: 2, rx: 0 };
const HIGHLIGHT_STYLE = { color: '#fde047', opacity: 0.4 };

const DRAW_TOOLS = new Set(['pen', 'highlighter', 'rect', 'ellipse', 'line', 'arrow']);

const TOOL_HINTS = {
  select: 'Select: click an item to edit it, drag to move, drag handles to resize or rotate.',
  pan: 'Pan: drag anywhere to scroll around the page.',
  text: 'Text: click the page to add a text box, then type. Double-click any text to edit it.',
  image: 'Image: choose a file, then click the page to place it. Click the page again to place more.',
  signature: 'Signature: draw, type or upload one, then click the page to place it.',
  pen: 'Pen: drag to draw freehand notes.',
  highlighter: 'Highlighter: drag across text to mark it.',
  rect: 'Rectangle: drag on the page to draw.',
  ellipse: 'Ellipse: drag on the page to draw.',
  line: 'Line: drag on the page to draw.',
  arrow: 'Arrow: drag from the start to the tip.',
};

/* ---------- fonts ---------- */
const STD_FONTS = {
  Helvetica: { nn: 'Helvetica', bn: 'Helvetica-Bold', ni: 'Helvetica-Oblique', bi: 'Helvetica-BoldOblique' },
  Times: { nn: 'Times-Roman', bn: 'Times-Bold', ni: 'Times-Italic', bi: 'Times-BoldItalic' },
  Courier: { nn: 'Courier', bn: 'Courier-Bold', ni: 'Courier-Oblique', bi: 'Courier-BoldOblique' },
};
const STD_TO_PDFLIB = {
  'Helvetica': 'Helvetica', 'Helvetica-Bold': 'HelveticaBold',
  'Helvetica-Oblique': 'HelveticaOblique', 'Helvetica-BoldOblique': 'HelveticaBoldOblique',
  'Times-Roman': 'TimesRoman', 'Times-Bold': 'TimesBold',
  'Times-Italic': 'TimesItalic', 'Times-BoldItalic': 'TimesBoldItalic',
  'Courier': 'Courier', 'Courier-Bold': 'CourierBold',
  'Courier-Oblique': 'CourierOblique', 'Courier-BoldOblique': 'CourierBoldOblique',
};

function b64ToBytes(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
if (window.EMBEDDED_FONTS) {
  for (const [k, v] of Object.entries(window.EMBEDDED_FONTS)) state.customFontBytes[k] = b64ToBytes(v);
}

/* ============================================================
   Fabric canvas
   ============================================================ */
const fc = new fabric.Canvas('overlayCanvas', {
  selection: true,
  preserveObjectStacking: true,
  stopContextMenu: true,
  enablePointerEvents: true, // unified mouse + touch handling via Pointer Events
  selection: true,
  preserveObjectStacking: true,
  stopContextMenu: true,
  selectionColor: 'rgba(79,70,229,0.12)',
  selectionBorderColor: '#4f46e5',
  selectionLineWidth: 1,
});
fabric.Object.prototype.set({
  borderColor: '#4f46e5',
  cornerColor: '#ffffff',
  cornerStrokeColor: '#4f46e5',
  cornerSize: 11,
  cornerStyle: 'circle',
  transparentCorners: false,
  borderScaleFactor: 1.5,
});

/* ============================================================
   PDF loading + rendering
   ============================================================ */
async function openFile(file) {
  if (!file) return;
  if (!/\.pdf$/i.test(file.name || '')) { toast('Please choose a PDF file.', 'error'); return; }
  setBusy(true);
  try {
    const buf = await file.arrayBuffer();
    await loadPdf(new Uint8Array(buf), file.name || 'document.pdf');
  } catch (err) {
    console.error(err);
    toast('Could not open that PDF: ' + (err && err.message ? err.message : err), 'error');
  } finally { setBusy(false); }
}

async function loadPdf(bytes, name) {
  state.pdfBytes = bytes.slice(); // pristine copy — pdf.js detaches the buffer it receives
  state.fileName = name;
  $('fileName').textContent = name;
  $('fileName').title = name;
  state.pdfLibDoc = await PDFLib.PDFDocument.load(state.pdfBytes);
  state.pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
  state.pageCount = state.pdfDoc.numPages;
  state.annotations = Array.from({ length: state.pageCount }, () => []);
  state.pageSizes = [];
  state.currentPage = 1;
  state.dirty = false;
  state.undoStack = [];
  state.redoStack = [];
  state.pending = null;
  $('emptyState').classList.add('hidden');
  viewport.classList.remove('hidden');
  buildThumbnails();
  updatePageUI();
  updateTitle();
  setStatusRight('');
  toast('Loaded ' + name + ' — ' + state.pageCount + (state.pageCount === 1 ? ' page' : ' pages'));
  await fitZoom('fit-width');
  updateToolAvailability();
}

let renderToken = 0;

async function renderCurrentPage() {
  if (!state.pdfDoc) return;
  const token = ++renderToken;
  const page = await state.pdfDoc.getPage(state.currentPage);
  if (token !== renderToken) return;
  const base = page.getViewport({ scale: 1 });
  state.pageSizes[state.currentPage - 1] = { w: base.width, h: base.height };
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(1, base.width * state.zoom);
  const cssH = Math.max(1, base.height * state.zoom);

  pdfCanvas.style.width = cssW + 'px';
  pdfCanvas.style.height = cssH + 'px';
  pdfCanvas.width = Math.floor(cssW * dpr);
  pdfCanvas.height = Math.floor(cssH * dpr);
  try {
    await page.render({ canvasContext: pdfCanvas.getContext('2d'), viewport: page.getViewport({ scale: state.zoom * dpr }) }).promise;
  } catch (err) { /* page render cancelled/superseded — ignore */ }
  if (token !== renderToken) return;

  state.loading = true;
  fc.setDimensions({ width: cssW, height: cssH });
  fc.setZoom(state.zoom);
  fc.clear();
  fc.discardActiveObject();
  const objs = state.annotations[state.currentPage - 1] || [];
  await new Promise((res) => fc.loadFromJSON({ objects: objs }, res));
  fc.getObjects().forEach((o) => { if (o.type === 'textbox') o.set('editable', true); });
  fc.requestRenderAll();
  state.loading = false;

  updateZoomUI();
  updatePageUI();
  updateDocInfo();
  setStatusRight(`Page ${state.currentPage} of ${state.pageCount} · ${Math.round(state.zoom * 100)}% · ${Math.round(base.width)} × ${Math.round(base.height)} pt`);
}

async function fitZoom(mode) {
  if (!state.pdfDoc) return;
  state.zoomMode = mode || state.zoomMode;
  const page = await state.pdfDoc.getPage(state.currentPage);
  const base = page.getViewport({ scale: 1 });
  const availW = Math.max(120, stage.clientWidth - 90);
  const availH = Math.max(120, stage.clientHeight - 90);
  let z = state.zoom;
  if (state.zoomMode === 'fit-width') z = availW / base.width;
  else if (state.zoomMode === 'fit-page') z = Math.min(availW / base.width, availH / base.height);
  state.zoom = clamp(z, 0.12, 6);
  await renderCurrentPage();
}

async function applyZoom(z) {
  state.zoom = clamp(z, 0.12, 6);
  state.zoomMode = 'custom';
  await renderCurrentPage();
}

const ZOOM_OPTS = [25, 50, 75, 100, 125, 150, 200, 300, 400];
function zoomOptionFor(pct) {
  let best = 100, bd = Infinity;
  for (const o of ZOOM_OPTS) { const d = Math.abs(o - pct); if (d < bd) { bd = d; best = o; } }
  return String(best);
}
function updateZoomUI() {
  const z = $('zoomSelect');
  if (state.zoomMode === 'fit-width') z.value = 'fit-width';
  else if (state.zoomMode === 'fit-page') z.value = 'fit-page';
  else z.value = zoomOptionFor(Math.round(state.zoom * 100));
  $('btnZoomIn').disabled = !state.pdfDoc;
  $('btnZoomOut').disabled = !state.pdfDoc;
}

/* ---------- page navigation ---------- */
async function goToPage(p) {
  if (!state.pdfDoc) return;
  p = clamp(Math.round(p) || 1, 1, state.pageCount);
  if (p === state.currentPage && state.pageSizes[p - 1]) {
    // still refresh the canvas (cheap enough) so undo/redo paint correctly
    await renderCurrentPage();
    return;
  }
  syncPage();
  state.currentPage = p;
  viewport.scrollTop = 0;
  viewport.scrollLeft = 0;
  updatePageUI();
  if (state.zoomMode === 'fit-width' || state.zoomMode === 'fit-page') await fitZoom(state.zoomMode);
  else await renderCurrentPage();
}

function updatePageUI() {
  $('pageInput').value = state.currentPage;
  $('pageInput').max = state.pageCount || 1;
  $('pageCountLabel').textContent = '/ ' + (state.pageCount || 0);
  $('btnPrevPage').disabled = !state.pdfDoc || state.currentPage <= 1;
  $('btnNextPage').disabled = !state.pdfDoc || state.currentPage >= state.pageCount;
  updateThumbActive();
}

/* ---------- thumbnails ---------- */
function buildThumbnails() {
  thumbList.innerHTML = '';
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        const i = Number(en.target.dataset.i);
        renderThumb(i);
        io.unobserve(en.target);
      }
    }
  }, { root: thumbList, rootMargin: '300px' });
  for (let i = 0; i < state.pageCount; i++) {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.dataset.i = i;
    d.innerHTML = '<div class="thumb-loading">Loading…</div><span class="thumb-num">' + (i + 1) + '</span>';
    d.addEventListener('click', () => { closeDrawers(); goToPage(i + 1); });
    thumbList.appendChild(d);
    io.observe(d);
  }
  updateThumbActive();
}

async function renderThumb(i) {
  const el = thumbList.querySelector(`.thumb[data-i="${i}"]`);
  if (!el || el.dataset.rendered) return;
  try {
    const page = await state.pdfDoc.getPage(i + 1);
    const base = page.getViewport({ scale: 1 });
    const w = 176;
    const s = w / base.width;
    const c = document.createElement('canvas');
    c.width = w * 2;
    c.height = Math.max(1, Math.round(base.height * s * 2));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: s * 2 }) }).promise;
    el.innerHTML = '';
    el.appendChild(c);
    el.appendChild(Object.assign(document.createElement('span'), { className: 'thumb-num', textContent: String(i + 1) }));
    el.dataset.rendered = '1';
  } catch (err) {
    const l = el.querySelector('.thumb-loading');
    if (l) l.textContent = '⚠';
  }
}

function updateThumbActive() {
  thumbList.querySelectorAll('.thumb').forEach((t) => {
    t.classList.toggle('active', Number(t.dataset.i) === state.currentPage - 1);
  });
}

/* ============================================================
   Annotation persistence (per-page JSON) + undo/redo
   ============================================================ */
function currentObjectsJSON() {
  return fc.toJSON(['annType', 'shapeKind', 'underlined']).objects;
}
function syncPage() {
  if (state.loading || !state.pdfDoc) return;
  state.annotations[state.currentPage - 1] = currentObjectsJSON();
}

/* Undo model: the undo stack always holds snapshots of the state BEFORE a change,
   so a single undo restores exactly the previous state. Gestures capture the pre
   state when they start (capturePre) and commit it once (commitPre) when they end;
   one-shot actions call pushUndo() before mutating. */
let pendingPre = null;
function capturePre() { pendingPre = JSON.stringify(state.annotations); }
function commitPre() {
  if (pendingPre === null) return;
  pushUndo(pendingPre);
  pendingPre = null;
}
function pushUndo(snapshot) {
  if (state.loading) return;
  if (state.loading) return;
  pendingPre = null; // any explicit push supersedes a stale gesture snapshot
  if (state.loading) return;
  pendingPre = null; // any explicit push supersedes a stale gesture snapshot
  const snap = snapshot !== undefined ? snapshot : JSON.stringify(state.annotations);
  if (state.undoStack[state.undoStack.length - 1] === snap) return; // skip no-op snapshots
  state.undoStack.push(snap);
  if (state.undoStack.length > 60) state.undoStack.shift();
  state.redoStack = [];
  setDirty(true);
  updateUndoButtons();
}
let syncTimer = null;
function undo() {
  if (!state.undoStack.length) return;
  pendingPre = null;
  state.livePushed = false;
  syncPage();
  state.redoStack.push(JSON.stringify(state.annotations));
  state.annotations = JSON.parse(state.undoStack.pop());
  setDirty(true);
  updateUndoButtons();
  renderCurrentPage();
}
function redo() {
  if (!state.redoStack.length) return;
  pendingPre = null;
  state.livePushed = false;
  syncPage();
  state.undoStack.push(JSON.stringify(state.annotations));
  state.annotations = JSON.parse(state.redoStack.pop());
  setDirty(true);
  updateUndoButtons();
  renderCurrentPage();
}
function updateUndoButtons() {
  $('btnUndo').disabled = !state.undoStack.length;
  $('btnRedo').disabled = !state.redoStack.length;
}
function setDirty(d) {
  state.dirty = d;
  updateTitle();
}
function updateTitle() {
  const dot = state.dirty ? '● ' : '';
  document.title = dot + (state.fileName ? state.fileName + ' — ' : '') + 'PDF Studio';
}

/* ============================================================
   Tools
   ============================================================ */
function setTool(t) {
  state.tool = t;
  document.querySelectorAll('.tool-btn').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  const draw = DRAW_TOOLS.has(t);
  fc.selection = (t === 'select');
  fc.skipTargetFind = !(t === 'select');
  const cursorMap = { select: CURSORS.select, pan: CURSORS.grab, text: CURSORS.text, pen: CURSORS.pen, highlighter: CURSORS.highlighter };
  fc.defaultCursor = cursorMap[t] || CURSORS.crosshair;
  fc.hoverCursor = t === 'select' ? CURSORS.move : fc.defaultCursor;
  stage.style.cursor = t === 'pan' ? CURSORS.grab : '';
  fc.upperCanvasEl.style.cursor = fc.defaultCursor; // apply right away, not only after mouseenter
  stage.classList.toggle('panning', t === 'pan');
  setStatusHint(TOOL_HINTS[t] || '');
  if (typeof updateSelBar === 'function') updateSelBar();
  if (t !== 'image' && t !== 'signature') state.pending = null;
  if (t === 'image') {
    if (!state.pdfDoc) { toast('Open a PDF first', 'error'); setTool('select'); return; }
    openImagePicker();
  } else if (t === 'signature') {
    if (!state.pdfDoc) { toast('Open a PDF first', 'error'); setTool('select'); return; }
    openSigModal();
  }
}

function setStatusHint(text) {
  $('statusLeft').textContent = text;
}
function setStatusRight(text) {
  $('statusRight').textContent = text;
}

/* ---------- fabric pointer pipeline ---------- */
function onFabricMouseDown(e) {
  if (state.loading || !state.pdfDoc) return;
  const tool = state.tool;
  const p = fc.getPointer(e.e);
  if (tool === 'select' || tool === 'pan') return;
  if (tool === 'text') { addText(p); return; }
  if (tool === 'image') { openImagePicker(); return; }
  if (tool === 'signature') { openSigModal(); return; }
  if (DRAW_TOOLS.has(tool)) beginDraw(tool, p);
}

let drawState = null;
function beginDraw(tool, p) {
  drawState = { tool, start: p, last: p, points: [p], obj: null };
  capturePre(); // pre-draw state — committed once the stroke/shape is finalized
  if (tool === 'pen') {
    const path = new fabric.Path(`M ${p.x} ${p.y}`, {
      stroke: INK_STYLE.color, strokeWidth: INK_STYLE.width,
      fill: null, strokeLineCap: 'round', strokeLineJoin: 'round',
      objectCaching: false, annType: 'ink',
    });
    drawState.obj = path;
    fc.add(path);
  }
}

function onFabricMouseMove(e) {
  if (!drawState) return;
  const p = fc.getPointer(e.e);
  const t = drawState.tool;
  if (t === 'pen') {
    const last = drawState.last;
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
    drawState.last = p;
    drawState.points.push(p);
    drawState.obj.path.push(['L', p.x, p.y]);
    drawState.obj.setCoords();
    fc.requestRenderAll();
  } else {
    updateShape(drawState, p);
  }
}

function updateShape(ds, p) {
  const s = ds.start;
  const x = Math.min(s.x, p.x), y = Math.min(s.y, p.y);
  const w = Math.abs(p.x - s.x), h = Math.abs(p.y - s.y);
  let obj = null;
  if (ds.tool === 'highlighter') {
    obj = new fabric.Rect({ left: x, top: y, width: w, height: h, fill: HIGHLIGHT_STYLE.color, strokeWidth: 0, opacity: HIGHLIGHT_STYLE.opacity, annType: 'highlight' });
  } else if (ds.tool === 'rect') {
    obj = new fabric.Rect({ left: x, top: y, width: w, height: h, fill: SHAPE_STYLE.fill, stroke: SHAPE_STYLE.stroke, strokeWidth: SHAPE_STYLE.strokeWidth, rx: SHAPE_STYLE.rx || 0, annType: 'shape', shapeKind: 'rect' });
  } else if (ds.tool === 'ellipse') {
    obj = new fabric.Ellipse({ left: (s.x + p.x) / 2, top: (s.y + p.y) / 2, rx: w / 2, ry: h / 2, originX: 'center', originY: 'center', fill: SHAPE_STYLE.fill, stroke: SHAPE_STYLE.stroke, strokeWidth: SHAPE_STYLE.strokeWidth, annType: 'shape', shapeKind: 'ellipse' });
  } else if (ds.tool === 'line') {
    obj = new fabric.Line([s.x, s.y, p.x, p.y], { stroke: SHAPE_STYLE.stroke, strokeWidth: SHAPE_STYLE.strokeWidth, strokeLineCap: 'round', annType: 'shape', shapeKind: 'line' });
  } else if (ds.tool === 'arrow') {
    obj = buildArrowPath(s, p, SHAPE_STYLE);
  }
  if (!obj) return;
  if (ds.obj) fc.remove(ds.obj);
  ds.obj = obj;
  fc.add(obj);
}

function buildArrowPath(s, p, style) {
  const dx = p.x - s.x, dy = p.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const head = Math.min(18, len * 0.35);
  const hx = p.x - ux * head, hy = p.y - uy * head;
  const nx = -uy, ny = ux;
  const spread = head * 0.45;
  const p1x = hx + nx * spread, p1y = hy + ny * spread;
  const p2x = hx - nx * spread, p2y = hy - ny * spread;
  const pathStr = `M ${s.x} ${s.y} L ${p.x} ${p.y} L ${p1x} ${p1y} M ${p.x} ${p.y} L ${p2x} ${p2y}`;
  return new fabric.Path(pathStr, {
    stroke: style.stroke, strokeWidth: style.strokeWidth, fill: null,
    strokeLineCap: 'round', strokeLineJoin: 'round',
    annType: 'shape', shapeKind: 'arrow',
  });
}

function onFabricMouseUp() {
  if (!drawState) return;
  const ds = drawState;
  drawState = null;
  const obj = ds.obj;
  if (!obj) return;
  if (ds.tool === 'pen') {
    if (ds.points.length < 2) { pendingPre = null; fc.remove(obj); fc.requestRenderAll(); return; }
    // The stroke was grown point-by-point, which leaves the selection bounding
    // box stuck at its initial size. Re-run the path geometry calculation so the
    // border/handles fully surround the drawing.
    obj._setPath(obj.path, {});
    // fabric insets the box by half the stroke width on left/top but not on
    // right/bottom — extend it so the stroke's round caps are fully enclosed.
    obj.set({ width: obj.width + obj.strokeWidth, height: obj.height + obj.strokeWidth });
    obj.setCoords();
  } else {
    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);
    if (w < 2 && h < 2) { pendingPre = null; fc.remove(obj); fc.requestRenderAll(); return; }
  }
  fc.setActiveObject(obj);
  fc.requestRenderAll();
  syncPage();
  commitPre();
  refreshProps();
}

/* ---------- text tool ---------- */
function addText(p) {
  syncPage();
  pushUndo(); // pre-add state — one undo removes the new text box
  const tb = new fabric.Textbox('Your text', {
    left: p.x, top: p.y, width: 240,
    fontFamily: TEXT_STYLE.fontFamily, fontSize: TEXT_STYLE.fontSize,
    fill: TEXT_STYLE.color, fontWeight: TEXT_STYLE.weight, fontStyle: TEXT_STYLE.style,
    textAlign: TEXT_STYLE.align, lineHeight: 1.2,
    editable: true, annType: 'text', lockScalingFlip: true,
  });
  fc.add(tb);
  fc.setActiveObject(tb);
  fc.requestRenderAll();
  tb.enterEditing();
  tb.selectAll();
  fc.requestRenderAll();
  syncPage();
  setTool('select'); // one text box per click — go back to Select/Move
}

/* ---------- image + stamp placement ---------- */
function placePending(p) {
  if (!state.pending) return;
  syncPage();
  pushUndo(); // pre-add state — one undo removes the placed item
  const pend = state.pending;
  fabric.Image.fromURL(pend.dataUrl, (img) => {
    const iw = img.width || 1, ih = img.height || 1;
    const maxD = 420;
    const s = Math.min(1, maxD / Math.max(iw, ih));
    img.set({
      left: p.x - (iw * s) / 2, top: p.y - (ih * s) / 2,
      scaleX: s, scaleY: s,
      lockUniScaling: true,
      annType: pend.type,
      opacity: pend.type === 'stamp' ? 0.95 : 1,
    });
    fc.add(img);
    fc.setActiveObject(img);
    fc.requestRenderAll();
    syncPage();
    refreshProps();
  }, {});
}

/* ---------- image import ---------- */
function openImagePicker() {
  $('imageInput').click();
}
function normalizeImageFile(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, (maxDim || 2200) / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * s));
        const h = Math.max(1, Math.round(img.height * s));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: c.toDataURL('image/png'), w, h });
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   Signature modal
   ============================================================ */
function openSigModal() {
  const modal = $('sigModal');
  modal.classList.remove('hidden');
  state.sigState.strokes = [];
  state.sigState.uploadDataUrl = null;
  $('sigUploadWrap').classList.add('hidden');
  $('sigDrop').classList.remove('hidden');
  $('sigTypeInput').value = '';
  switchSigTab('draw');
  initSigCanvas();
}

function closeSigModal() {
  $('sigModal').classList.add('hidden');
  if (state.tool === 'signature' && !state.pending) setTool('select');
}

function switchSigTab(tab) {
  state.sigState.tab = tab;
  document.querySelectorAll('.sig-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.sig-pane').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== tab));
  if (tab === 'draw') initSigCanvas();
  if (tab === 'type') renderTypePreview();
}

/* --- draw tab --- */
const sigCanvas = $('sigCanvas');
let sigCtx = null;
function initSigCanvas() {
  sigCanvas.style.cursor = CURSORS.pen; // colored pen cursor (GPU white-cursor workaround)
  const r = sigCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  sigCanvas.width = Math.max(1, Math.round(r.width * dpr));
  sigCanvas.height = Math.max(1, Math.round(r.height * dpr));
  sigCtx = sigCanvas.getContext('2d');
  sigCtx.scale(dpr, dpr);
  redrawSig();
}
function sigPos(e) {
  const r = sigCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function redrawSig() {
  if (!sigCtx) return;
  const r = sigCanvas.getBoundingClientRect();
  sigCtx.clearRect(0, 0, r.width, r.height);
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  for (const s of state.sigState.strokes) {
    sigCtx.strokeStyle = s.color;
    sigCtx.lineWidth = s.width;
    sigCtx.beginPath();
    s.pts.forEach((p, i) => (i ? sigCtx.lineTo(p.x, p.y) : sigCtx.moveTo(p.x, p.y)));
    sigCtx.stroke();
  }
}
function exportSigDraw() {
  const strokes = state.sigState.strokes;
  if (!strokes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const p of s.pts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const pad = 10;
  const w = Math.max(1, maxX - minX + pad * 2);
  const h = Math.max(1, maxY - minY + pad * 2);
  const scale = 3;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-minX + pad, -minY + pad);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  return c.toDataURL('image/png');
}

/* --- type tab --- */
function renderTypePreview() {
  const txt = $('sigTypeInput').value.trim();
  const c = $('sigTypeCanvas');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  if (!txt) return;
  const size = Math.min(64, (r.width - 40) / Math.max(1, txt.length * 0.62));
  ctx.font = size + 'px Pacifico, cursive';
  ctx.fillStyle = state.sigState.typeColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, 20, r.height / 2 + size * 0.08);
}
function exportSigType() {
  const txt = $('sigTypeInput').value.trim();
  if (!txt) return null;
  const size = 96;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = size + 'px Pacifico, cursive';
  const m = meas.measureText(txt);
  const scale = 3;
  const c = document.createElement('canvas');
  c.width = Math.ceil((m.width + 40) * scale);
  c.height = Math.ceil(size * 1.5 * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  ctx.font = size + 'px Pacifico, cursive';
  ctx.fillStyle = state.sigState.typeColor;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(txt, 8, size * 1.0);
  // tight-crop by scanning alpha
  const iw = c.width, ih = c.height;
  const data = ctx.getImageData(0, 0, iw, ih).data;
  let l = iw, t = ih, rr = 0, b = 0;
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      if (data[(y * iw + x) * 4 + 3] > 8) {
        if (x < l) l = x; if (x > rr) rr = x;
        if (y < t) t = y; if (y > b) b = y;
      }
    }
  }
  if (rr <= l || b <= t) return c.toDataURL('image/png');
  const pad = 6 * scale;
  l = Math.max(0, l - pad); t = Math.max(0, t - pad);
  rr = Math.min(iw, rr + pad); b = Math.min(ih, b + pad);
  const out = document.createElement('canvas');
  out.width = rr - l; out.height = b - t;
  out.getContext('2d').drawImage(c, l, t, rr - l, b - t, 0, 0, rr - l, b - t);
  return out.toDataURL('image/png');
}

/* --- upload tab --- */
function showSigUpload(dataUrl) {
  state.sigState.uploadDataUrl = dataUrl;
  $('sigUploadPreview').src = dataUrl;
  $('sigUploadWrap').classList.remove('hidden');
  $('sigDrop').classList.add('hidden');
}

function onSigOk() {
  let dataUrl = null;
  const tab = state.sigState.tab;
  if (tab === 'draw') dataUrl = exportSigDraw();
  else if (tab === 'type') dataUrl = exportSigType();
  else dataUrl = state.sigState.uploadDataUrl;
  if (!dataUrl) { toast('Please draw, type or upload a signature first', 'error'); return; }
  state.pending = { type: 'stamp', dataUrl };
  closeSigModal();
  placePending(pageCenter()); // stamp appears on the page right away
  state.pending = null;
  setTool('select');
}

/* ============================================================
   Props panel
   ============================================================ */
function showProps() {
  if (state.loading) return;
  const sel = fc.getActiveObjects();
  const has = sel.length > 0;
  $('propsEmpty').classList.toggle('hidden', has);
  $('propsObject').classList.toggle('hidden', !has);
  if (!has) { fillDocInfo(); return; }
  const kinds = new Set(sel.map((o) => o.annType));
  $('propsText').classList.toggle('hidden', !(kinds.size === 1 && kinds.has('text')));
  $('propsShape').classList.toggle('hidden', !(kinds.size === 1 && kinds.has('shape')));
  $('propsInk').classList.toggle('hidden', !(kinds.size === 1 && kinds.has('ink')));
  $('propsHighlight').classList.toggle('hidden', !(kinds.size === 1 && kinds.has('highlight')));
  const one = sel.length === 1 ? sel[0] : null;
  if (one) fillGeneric(one);
  else clearGeneric();
  if (one && kinds.has('text')) fillText(one);
  if (one && kinds.has('shape')) fillShape(one);
  if (one && kinds.has('ink')) fillInk(one);
  if (one && kinds.has('highlight')) fillHighlight(one);
}

function refreshProps() { showProps(); }
function updateDocInfo() { fillDocInfo(); }

function fillDocInfo() {
  const sz = state.pageSizes[state.currentPage - 1];
  $('docInfo').innerHTML =
    '<div><b>File:</b> ' + escHtml(state.fileName || '—') + '</div>' +
    '<div><b>Pages:</b> ' + state.pageCount + '</div>' +
    (sz ? '<div><b>Page size:</b> ' + Math.round(sz.w) + ' × ' + Math.round(sz.h) + ' pt</div>' : '') +
    '<div style="margin-top:8px;color:var(--muted)">Use the tools on the left to add text, images, signatures and shapes. Everything you place is saved back into the PDF.</div>';
}
function escHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function toHex(c) {
  try { return '#' + new fabric.Color(c || '#000').toHex(); } catch (e) { return '#000000'; }
}

function fillGeneric(one) {
  const v = (id, val) => { $(id).value = val; };
  v('propX', round1(one.left));
  v('propY', round1(one.top));
  v('propW', round1((one.width || 0) * (one.scaleX || 1)));
  v('propH', round1((one.height || 0) * (one.scaleY || 1)));
  const ang = ((one.angle || 0) % 360 + 360) % 360;
  v('propRot', Math.round(ang));
  v('propRotNum', Math.round(ang));
  const op = Math.round((one.opacity ?? 1) * 100);
  v('propOpacity', op);
  v('propOpacityNum', op);
}
function clearGeneric() {
  ['propX', 'propY', 'propW', 'propH', 'propRot', 'propRotNum', 'propOpacity', 'propOpacityNum'].forEach((id) => { $(id).value = ''; });
}

function fillText(one) {
  $('propFontFamily').value = one.fontFamily || 'Helvetica';
  $('propFontSize').value = Math.round((one.fontSize || 24) * (one.scaleY || 1));
  const hex = toHex(one.fill);
  $('propTextColor').value = hex;
  $('propTextColorHex').textContent = hex;
  $('propBold').classList.toggle('active', (one.fontWeight || 'normal') === 'bold');
  $('propItalic').classList.toggle('active', (one.fontStyle || 'normal') === 'italic');
  $('propUnderline').classList.toggle('active', isUnderlined(one));
  document.querySelectorAll('.align-btn').forEach((b) => b.classList.toggle('active', b.dataset.align === (one.textAlign || 'left')));
}

function isUnderlined(obj) {
  const st = obj.styles;
  if (!st) return false;
  for (const k in st) { const line = st[k]; for (const j in line) { if (line[j] && line[j].underline) return true; } }
  return false;
}
function setUnderline(obj, on) {
  if (on) {
    const lines = String(obj.text || '').split('\n');
    const styles = {};
    lines.forEach((ln, li) => {
      styles[li] = {};
      for (let ci = 0; ci < ln.length; ci++) styles[li][ci] = { underline: true };
    });
    obj.set('styles', styles);
  } else {
    obj.set('styles', {});
  }
}

function fillShape(one) {
  const fhex = toHex(one.fill);
  $('propFill').value = fhex;
  $('propFillHex').textContent = fhex;
  const shex = toHex(one.stroke || '#000');
  $('propStroke').value = shex;
  $('propStrokeHex').textContent = shex;
  $('propStrokeWidth').value = (one.strokeWidth || 0) * (Math.abs(one.scaleX || 1) + Math.abs(one.scaleY || 1)) / 2;
  const isRect = one.shapeKind === 'rect';
  $('propCornerRow').classList.toggle('hidden', !isRect);
  if (isRect) $('propCornerRadius').value = Math.round((one.rx || 0) * (one.scaleX || 1));
}

function fillInk(one) {
  const hex = toHex(one.stroke || '#000');
  $('propInkColor').value = hex;
  $('propInkColorHex').textContent = hex;
  const w = Math.round((one.strokeWidth || 2) * (Math.abs(one.scaleX || 1) + Math.abs(one.scaleY || 1)) / 2);
  $('propInkWidth').value = w;
  $('propInkWidthNum').value = w;
}

function fillHighlight(one) {
  const hex = toHex(one.fill).toUpperCase();
  document.querySelectorAll('#propHlSwatches .swatch').forEach((b) => b.classList.toggle('active', b.dataset.c.toUpperCase() === hex));
  const op = Math.round((one.opacity ?? 0.4) * 100);
  $('propHlOpacity').value = op;
  $('propHlOpacityNum').value = op;
}

/* generic apply helpers */
function applyToActive(fn) {
  const objs = fc.getActiveObjects();
  if (!objs.length) return;
  syncPage();
  pushUndo(); // push the pre-change state — one undo reverts the property change
  objs.forEach(fn);
  fc.requestRenderAll();
  refreshProps();
}
function applyLive(fn) {
  if (!state.livePushed) {
    state.livePushed = true;
    syncPage();
    pushUndo(); // push once per slider/drag gesture
  }
  fc.getActiveObjects().forEach(fn);
  fc.requestRenderAll();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPage, 500); // keep annotations fresh without pushing undo
}

/* ============================================================
   Save — flatten annotations into the PDF with pdf-lib
   ============================================================ */
async function savePdf() {
  if (!state.pdfDoc) { toast('Open a PDF first', 'error'); return; }
  syncPage();
  setBusy(true);
  try {
    const pdfDoc = await PDFLib.PDFDocument.load(state.pdfBytes);
    if (window.fontkit) { try { pdfDoc.registerFontkit(window.fontkit); } catch (e) { /* fontkit optional */ } }
    const fontCache = new Map();
    // Draw sequentially — pdf-lib's async font/image embedding is not re-entrant,
    // so concurrent tasks corrupt each other's output.
    for (let i = 0; i < state.pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const objs = state.annotations[i] || [];
      for (const obj of objs) {
        await drawAnnotation(pdfDoc, page, obj, fontCache);
      }
    }
    const bytes = await pdfDoc.save({ useObjectStreams: true });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const name = (state.fileName || 'document.pdf').replace(/\.pdf$/i, '') + '-edited.pdf';
    triggerDownload(blob, name);
    state.dirty = false;
    updateTitle();
    toast('Saved — ' + name, 'success');
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + (err && err.message ? err.message : err), 'error');
  } finally {
    setBusy(false);
  }
}

async function drawAnnotation(pdfDoc, page, obj, fontCache) {
  const ph = page.getHeight();
  const type = obj.annType;
  try {
    if (type === 'text') return await drawTextAnnotation(pdfDoc, page, obj, ph, fontCache);
    if (type === 'image' || type === 'stamp') return await drawImageAnnotation(pdfDoc, page, obj, ph);
    if (type === 'ink') return drawInkAnnotation(page, obj, ph);
    if (type === 'shape') return drawShapeAnnotation(page, obj, ph);
    if (type === 'highlight') return drawHighlightAnnotation(page, obj, ph);
  } catch (err) {
    console.warn('Skipping annotation', obj.annType, err);
  }
}

/* ----- color helpers ----- */
function colorToRgb(c) {
  if (!c) return { r: 0, g: 0, b: 0 };
  c = String(c).trim();
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    if (isNaN(n)) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return { r: 0, g: 0, b: 0 };
}
function pdfColor(c) {
  const { r, g, b } = colorToRgb(c);
  return PDFLib.rgb(r / 255, g / 255, b / 255);
}
function fillColorOrNull(c) {
  if (!c) return null;
  c = String(c).trim();
  if (c === 'transparent') return null;
  const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)[,\s]*([\d.]*)\)/);
  if (m && m[4] !== undefined && m[4] !== '' && parseFloat(m[4]) <= 0.001) return null;
  return pdfColor(c);
}
function fillAlpha(c, fallback) {
  if (!c) return fallback;
  const m = String(c).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)[,\s]*([\d.]*)\)/);
  if (m && m[4] !== undefined && m[4] !== '') return parseFloat(m[4]);
  return fallback;
}

// Pre-blend a color with white at the given alpha. pdf-lib's ExtGState (opacity)
// registration fails on pages with inherited resources (e.g. PowerPoint-generated
// PDFs), so translucent fills are baked into the color instead.
function blendWithWhite(c, alpha) {
  const { r, g, b } = colorToRgb(c);
  const a = Math.min(1, Math.max(0, alpha || 0));
  return PDFLib.rgb((r * a + 255 * (1 - a)) / 255, (g * a + 255 * (1 - a)) / 255, (b * a + 255 * (1 - a)) / 255);
}
function rotatePoint(x, y, cx, cy, rad) {
  const dx = x - cx, dy = y - cy;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}
function centerAnchor(cx, cy, w, h, angleRad) {
  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  return { x: cx - (w / 2 * cos - h / 2 * sin), y: cy - (w / 2 * sin + h / 2 * cos) };
}
function mapPointThroughObject(p, obj) {
  const cx = obj.left + (obj.width * (obj.scaleX || 1)) / 2;
  const cy = obj.top + (obj.height * (obj.scaleY || 1)) / 2;
  const rad = ((obj.angle || 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const lx = (p.x - cx) * (obj.scaleX || 1);
  const ly = (p.y - cy) * (obj.scaleY || 1);
  return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
}

/* ----- fonts ----- */
async function resolveFont(pdfDoc, family, weight, style, cache) {
  const key = family + '|' + weight + '|' + style;
  if (cache.has(key)) return cache.get(key);
  let font;
  if (family === 'Roboto') {
    const k = (weight === 'bold' ? 'Bold' : '') + (style === 'italic' ? 'Italic' : '');
    const file = k === 'BoldItalic' ? 'Roboto-BoldItalic' : k === 'Bold' ? 'Roboto-Bold' : k === 'Italic' ? 'Roboto-Italic' : 'Roboto-Regular';
    font = await pdfDoc.embedFont(state.customFontBytes[file], { subset: true });
  } else if (family === 'Pacifico') {
    font = await pdfDoc.embedFont(state.customFontBytes['Pacifico-Regular'], { subset: true });
  } else {
    const std = STD_FONTS[family] || STD_FONTS.Helvetica;
    const nm = std[(weight === 'bold' ? 'b' : 'n') + (style === 'italic' ? 'i' : 'n')];
    font = await pdfDoc.embedFont(PDFLib.StandardFonts[STD_TO_PDFLIB[nm]]);
  }
  cache.set(key, font);
  return font;
}

/* ----- text ----- */
function wrapWords(font, words, size, maxW) {
  const spaceW = font.widthOfTextAtSize(' ', size);
  const lines = [];
  let cur = [], curW = 0;
  for (const word of words) {
    const w = font.widthOfTextAtSize(word, size);
    const addW = cur.length ? w + spaceW : w;
    if (cur.length && curW + addW > maxW) {
      lines.push({ words: cur, width: curW });
      cur = [word]; curW = w;
    } else {
      cur.push(word); curW += addW;
    }
  }
  if (cur.length) lines.push({ words: cur, width: curW });
  if (!lines.length) lines.push({ words: [''], width: 0 });
  return lines;
}

async function drawTextAnnotation(pdfDoc, page, obj, ph, fontCache) {
  const text = String(obj.text || '');
  if (!text.trim()) return;
  const family = obj.fontFamily || 'Helvetica';
  const weight = (obj.fontWeight || 'normal') === 'bold' ? 'bold' : 'normal';
  const style = (obj.fontStyle || 'normal') === 'italic' ? 'italic' : 'normal';
  const font = await resolveFont(pdfDoc, family, weight, style, fontCache);
  const size = (obj.fontSize || 24) * (obj.scaleY || 1);
  const lineHeight = obj.lineHeight || 1.2;
  const effW = Math.max(1, (obj.width || 200) * (obj.scaleX || 1));
  const effH = Math.max(size, (obj.height || size) * (obj.scaleY || 1));
  const angleRad = ((obj.angle || 0) * Math.PI) / 180;
  const color = pdfColor(obj.fill || '#000');
  const opacity = obj.opacity ?? 1;
  const align = obj.textAlign || 'left';
  const cx = obj.left + effW / 2;
  const cyPdf = ph - (obj.top + effH / 2);
  const spaceW = font.widthOfTextAtSize(' ', size);

  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const lines = wrapWords(font, words, size, effW);

  const drawAt = (x, y, str) => {
    let ax = x, ay = y;
    if (angleRad !== 0) {
      const r = rotatePoint(x, y, cx, cyPdf, angleRad);
      ax = r.x; ay = r.y;
    }
    page.drawText(str, { x: ax, y: ay, size, font, color, rotate: PDFLib.degrees(obj.angle || 0), opacity });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    let x0 = obj.left;
    if (align === 'center') x0 = obj.left + (effW - line.width) / 2;
    else if (align === 'right') x0 = obj.left + effW - line.width;
    const baseline = obj.top + size + i * size * lineHeight;
    const y = ph - baseline;
    if (align === 'justify' && line.words.length > 1 && !isLast) {
      const extra = (effW - line.width) / (line.words.length - 1);
      let x = x0;
      for (let k = 0; k < line.words.length; k++) {
        drawAt(x, y, line.words[k].text);
        if (k < line.words.length - 1) x += line.words[k].width + spaceW + extra;
      }
    } else {
      drawAt(x0, y, line.words.join(' '));
    }
    if (isUnderlined(obj)) {
      const uy = ph - (baseline + Math.max(1, size * 0.08) + 1.5);
      let p1 = { x: x0, y: uy };
      let p2 = { x: x0 + line.width, y: uy };
      if (angleRad !== 0) { p1 = rotatePoint(p1.x, p1.y, cx, cyPdf, angleRad); p2 = rotatePoint(p2.x, p2.y, cx, cyPdf, angleRad); }
      page.drawLine({ start: p1, end: p2, thickness: Math.max(0.6, size * 0.07), color, opacity });
    }
  }
}

/* ----- images ----- */
function dataUrlToBytes(dataUrl) {
  const b64 = (dataUrl.split(',')[1] || '').replace(/\s/g, '');
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function drawImageAnnotation(pdfDoc, page, obj, ph) {
  const dataUrl = obj.src;
  if (!dataUrl) return;
  const bytes = dataUrlToBytes(dataUrl);
  let image;
  try {
    image = dataUrl.startsWith('data:image/jpeg') ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
  } catch (e) { return; }
  const w = Math.max(0.5, (obj.width || image.width) * (obj.scaleX || 1));
  const h = Math.max(0.5, (obj.height || image.height) * (obj.scaleY || 1));
  const cx = obj.left + w / 2;
  const cy = ph - (obj.top + h / 2);
  const a = centerAnchor(cx, cy, w, h, ((obj.angle || 0) * Math.PI) / 180);
  page.drawImage(image, { x: a.x, y: a.y, width: w, height: h, rotate: PDFLib.degrees(obj.angle || 0), opacity: obj.opacity ?? 1 });
}

/* ----- path-based (ink, arrow) ----- */
function parsePath(pathData) {
  const polys = [];
  let cur = null;
  // fabric serializes paths as arrays of commands: [['M',x,y],['L',x,y],...]
  if (Array.isArray(pathData)) {
    for (const cmd of pathData) {
      const op = cmd[0];
      const x = cmd[1], y = cmd[2];
      if (op === 'M') { cur = [{ x, y }]; polys.push(cur); }
      else if (op === 'L' && cur) cur.push({ x, y });
    }
    return polys;
  }
  // string form: 'M x y L x y ...'
  const re = /([ML])\s*([-\d.eE]+)[,\s]+([-\d.eE]+)/g;
  let m;
  while ((m = re.exec(pathData))) {
    const x = parseFloat(m[2]), y = parseFloat(m[3]);
    if (m[1] === 'M') { cur = [{ x, y }]; polys.push(cur); }
    else if (cur) cur.push({ x, y });
  }
  return polys;
}

function drawInkAnnotation(page, obj, ph) {
  const polys = parsePath(obj.path || '');
  if (!polys.length) return;
  const sw = (obj.strokeWidth || 2) * (Math.abs(obj.scaleX || 1) + Math.abs(obj.scaleY || 1)) / 2;
  const color = pdfColor(obj.stroke || '#000');
  const opacity = obj.opacity ?? 1;
  for (const poly of polys) {
    if (poly.length < 2) continue;
    let prev = mapPointThroughObject(poly[0], obj);
    for (let i = 1; i < poly.length; i++) {
      const p = mapPointThroughObject(poly[i], obj);
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1.1) continue;
      page.drawLine({
        start: { x: prev.x, y: ph - prev.y }, end: { x: p.x, y: ph - p.y },
        thickness: sw, color, opacity,
        lineCap: PDFLib.LineCapStyle.Round, lineJoin: PDFLib.LineJoinStyle.Round,
      });
      prev = p;
    }
  }
}

/* ----- shapes ----- */
function drawShapeAnnotation(page, obj, ph) {
  const kind = obj.shapeKind;
  if (kind === 'rect') drawRectShape(page, obj, ph);
  else if (kind === 'ellipse') drawEllipseShape(page, obj, ph);
  else if (kind === 'line') drawLineShape(page, obj, ph);
  else if (kind === 'arrow') drawInkAnnotation(page, obj, ph);
}

function drawRectShape(page, obj, ph) {
  const w = Math.max(0.5, (obj.width || 0) * (obj.scaleX || 1));
  const h = Math.max(0.5, (obj.height || 0) * (obj.scaleY || 1));
  const cx = obj.left + w / 2;
  const cy = ph - (obj.top + h / 2);
  const rad = ((obj.angle || 0) * Math.PI) / 180;
  const a = centerAnchor(cx, cy, w, h, rad);
  const fill = fillColorOrNull(obj.fill);
  const stroke = fillColorOrNull(obj.stroke);
  const bw = (obj.strokeWidth || 0) * Math.abs(obj.scaleX || 1);
  const fillAlphaVal = (obj.opacity ?? 1) * fillAlpha(obj.fill, 1);
  const fillColor = fill && fillAlphaVal < 1 ? blendWithWhite(obj.fill, fillAlphaVal) : fill;
  const opts = { x: a.x, y: a.y, width: w, height: h, rotate: PDFLib.degrees(obj.angle || 0) };
  const rx = Math.min((obj.rx || 0) * Math.abs(obj.scaleX || 1), w / 2, h / 2);
  if (rx > 0.5) {
    const d = `M ${rx} 0 H ${w - rx} Q ${w} 0 ${w} ${rx} V ${h - rx} Q ${w} ${h} ${w - rx} ${h} H ${rx} Q 0 ${h} 0 ${h - rx} V ${rx} Q 0 0 ${rx} 0 Z`;
    if (fillColor) opts.fillColor = fillColor;
    if (stroke && bw > 0) { opts.borderColor = stroke; opts.borderWidth = bw; }
    page.drawSvgPath(d, opts);
  } else {
    if (fillColor) opts.color = fillColor;
    if (stroke && bw > 0) { opts.borderColor = stroke; opts.borderWidth = bw; }
    page.drawRectangle(opts);
  }
}

function drawEllipseShape(page, obj, ph) {
  const rx = Math.max(0.5, (obj.rx || 0) * (obj.scaleX || 1));
  const ry = Math.max(0.5, (obj.ry || 0) * (obj.scaleY || 1));
  const fillAlphaVal = (obj.opacity ?? 1) * fillAlpha(obj.fill, 1);
  const fill = fillColorOrNull(obj.fill);
  const stroke = fillColorOrNull(obj.stroke);
  const bw = (obj.strokeWidth || 0) * Math.abs(obj.scaleX || 1);
  const opts = {
    x: obj.left, y: ph - obj.top, xRadius: rx, yRadius: ry,
    rotate: PDFLib.degrees(obj.angle || 0),
  };
  if (fill) opts.fillColor = fillAlphaVal < 1 ? blendWithWhite(obj.fill, fillAlphaVal) : fill;
  if (stroke && bw > 0) { opts.borderColor = stroke; opts.borderWidth = bw; }
  page.drawEllipse(opts);
}

function drawLineShape(page, obj, ph) {
  if (obj.x1 === undefined) return;
  const p1 = mapPointThroughObject({ x: obj.x1, y: obj.y1 }, obj);
  const p2 = mapPointThroughObject({ x: obj.x2, y: obj.y2 }, obj);
  const sw = (obj.strokeWidth || 1) * (Math.abs(obj.scaleX || 1) + Math.abs(obj.scaleY || 1)) / 2;
  page.drawLine({
    start: { x: p1.x, y: ph - p1.y }, end: { x: p2.x, y: ph - p2.y },
    thickness: sw, color: pdfColor(obj.stroke || '#000'), opacity: obj.opacity ?? 1,
    lineCap: PDFLib.LineCapStyle.Round,
  });
}

function drawHighlightAnnotation(page, obj, ph) {
  const w = Math.max(0.5, (obj.width || 0) * (obj.scaleX || 1));
  const h = Math.max(0.5, (obj.height || 0) * (obj.scaleY || 1));
  const cx = obj.left + w / 2;
  const cy = ph - (obj.top + h / 2);
  const a = centerAnchor(cx, cy, w, h, ((obj.angle || 0) * Math.PI) / 180);
  page.drawRectangle({
    x: a.x, y: a.y, width: w, height: h, rotate: PDFLib.degrees(obj.angle || 0),
    color: blendWithWhite(obj.fill || '#fde047', obj.opacity ?? 0.4),
  });
}

/* ============================================================
   Selection helpers: delete / duplicate / layers / context menu
   ============================================================ */
function deleteSelected() {
  const objs = fc.getActiveObjects();
  if (!objs.length) return;
  syncPage();
  pushUndo(); // pre-delete state — one undo brings the items back
  objs.forEach((o) => fc.remove(o));
  fc.discardActiveObject();
  fc.requestRenderAll();
  refreshProps();
}

function duplicateSelected() {
  const objs = fc.getActiveObjects();
  if (!objs.length) return;
  const clones = [];
  Promise.all(objs.map((o) => hydrate(o.toObject(['annType', 'shapeKind', 'underlined'])))).then((hydrated) => {
    syncPage();
    pushUndo(); // pre-duplicate state
    hydrated.forEach((c, i) => {
      c.set({ left: (c.left || 0) + 16, top: (c.top || 0) + 16 });
      fc.add(c);
      clones.push(c);
    });
    fc.discardActiveObject();
    clones.forEach((c) => fc.setActiveObject(c, false));
    fc.requestRenderAll();
    syncPage();
    refreshProps();
  });
}

function hydrate(json) {
  return new Promise((resolve, reject) => {
    const opts = JSON.parse(JSON.stringify(json));
    if (opts.type === 'image') {
      fabric.Image.fromURL(opts.src, (img) => { img.set(opts); resolve(img); }, {}, { crossOrigin: 'anonymous' });
    } else if (opts.type === 'textbox') {
      const tb = new fabric.Textbox(opts.text || '', opts);
      tb.set('editable', true);
      resolve(tb);
    } else if (opts.type === 'path') {
      resolve(new fabric.Path(opts.path || [], opts));
    } else if (opts.type === 'line') {
      resolve(new fabric.Line([opts.x1 || 0, opts.y1 || 0, opts.x2 || 0, opts.y2 || 0], opts));
    } else {
      const Klass = fabric[opts.type[0].toUpperCase() + opts.type.slice(1)];
      if (typeof Klass !== 'function') return reject(new Error('Unknown type ' + opts.type));
      resolve(new Klass(opts));
    }
  });
}

function bringToFront() {
  const objs = fc.getActiveObjects();
  if (!objs.length) return;
  syncPage();
  pushUndo(); // pre-reorder state
  const all = fc.getObjects();
  objs.slice().sort((a, b) => all.indexOf(a) - all.indexOf(b)).forEach((o) => fc.moveTo(o, all.length - 1));
  fc.requestRenderAll();
  syncPage();
  refreshProps();
}
function sendToBack() {
  const objs = fc.getActiveObjects();
  if (!objs.length) return;
  syncPage();
  pushUndo(); // pre-reorder state
  objs.slice().sort((a, b) => fc.getObjects().indexOf(b) - fc.getObjects().indexOf(a)).forEach((o) => fc.moveTo(o, 0));
  fc.requestRenderAll();
  syncPage();
  refreshProps();
}

/* ---------- context menu ---------- */
function showCtxMenu(x, y) {
  const m = $('ctxMenu');
  m.classList.remove('hidden');
  m.style.left = Math.min(x, window.innerWidth - 170) + 'px';
  m.style.top = Math.min(y, window.innerHeight - 150) + 'px';
}
function hideCtxMenu() { $('ctxMenu').classList.add('hidden'); }

/* ============================================================
   Page operations (add / delete)
   ============================================================ */
async function addPage() {
  if (!state.pdfDoc) return;
  syncPage();
  pushUndo();
  state.pdfLibDoc.addPage([612, 792]);
  state.annotations.push([]);
  await resyncPdf();
  state.currentPage = state.pageCount;
  await goToPage(state.pageCount);
}
async function deletePage() {
  if (!state.pdfDoc) return;
  if (state.pageCount <= 1) { toast('Cannot delete the only page', 'error'); return; }
  syncPage();
  pushUndo();
  state.pdfLibDoc.removePage(state.currentPage - 1);
  state.annotations.splice(state.currentPage - 1, 1);
  await resyncPdf();
  state.currentPage = clamp(state.currentPage, 1, state.pageCount);
  await goToPage(state.currentPage);
}
async function resyncPdf() {
  const bytes = await state.pdfLibDoc.save();
  state.pdfBytes = bytes;
  state.pdfDoc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  state.pageCount = state.pdfDoc.numPages;
  state.pageSizes = [];
  buildThumbnails();
  updatePageUI();
}

/* ============================================================
   File I/O, drag & drop, misc UI
   ============================================================ */
function triggerDownload(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

function setBusy(busy) {
  const btn = $('btnSave');
  btn.disabled = busy || !state.pdfDoc;
  $('saveLabel').textContent = busy ? 'Saving…' : 'Save PDF';
  const spinner = btn.querySelector('.spinner');
  const svg = btn.querySelector('svg');
  if (busy) {
    if (svg) svg.remove();
    if (!spinner) btn.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
  } else {
    if (spinner) spinner.remove();
    if (!btn.querySelector('svg')) {
      btn.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" data-icon="save"></svg>');
      const s = btn.querySelector('svg');
      if (s) s.innerHTML = ICONS.save;
    }
  }
}

function updateToolAvailability() {
  const has = !!state.pdfDoc;
  ['btnZoomIn', 'btnZoomOut', 'btnUndo', 'btnRedo'].forEach((id) => { $(id).disabled = !has; });
  $('btnSave').disabled = !has;
  $('btnAddPage').disabled = !has;
  $('btnDelPage').disabled = !has;
}

let toastTimer = null;
function toast(msg, type) {
  const root = $('toastRoot');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 260); }, 2600);
}

function handleDroppedFiles(files) {
  if (!files || !files.length) return;
  const pdf = Array.from(files).find((f) => /\.pdf$/i.test(f.name));
  const img = Array.from(files).find((f) => /image\//i.test(f.type) && !/\.pdf$/i.test(f.name));
  if (pdf) { openFile(pdf); return; }
  if (img && state.pdfDoc) {
    normalizeImageFile(img).then(({ dataUrl }) => {
      state.pending = { type: 'image', dataUrl };
      const sz = state.pageSizes[state.currentPage - 1] || { w: 612, h: 792 };
      placePending({ x: sz.w / 2, y: sz.h / 2 });
      state.pending = null;
      toast('Image added to page ' + state.currentPage);
    }).catch(() => toast('Could not read that image', 'error'));
    return;
  }
  toast('Drop a PDF (or an image) here', 'error');
}

/* ============================================================
   Events
   ============================================================ */
fc.on('mouse:down', onFabricMouseDown);
fc.on('mouse:move', onFabricMouseMove);
fc.on('mouse:up', onFabricMouseUp);
// capture the pre-gesture state when a transform (move/resize/rotate) is about
// to start in Select mode; committed once on object:modified
fc.on('mouse:down', (e) => {
  state.livePushed = false;
  if (state.tool === 'select' && e.target) capturePre();
});
fc.on('mouse:up', () => { state.livePushed = false; });
fc.on('selection:created', () => { refreshProps(); updateSelBar(); });
fc.on('selection:updated', () => { refreshProps(); updateSelBar(); });
fc.on('selection:cleared', () => { refreshProps(); updateSelBar(); });
fc.on('object:modified', () => { syncPage(); commitPre(); refreshProps(); updateSelBar(); });
fc.on('object:moving', () => { const o = fc.getActiveObjects()[0]; if (o) { $('propX').value = round1(o.left); $('propY').value = round1(o.top); } updateSelBar(); });
fc.on('object:scaling', () => { refreshProps(); updateSelBar(); });
fc.on('object:rotating', () => { refreshProps(); updateSelBar(); });
fc.on('text:editing:entered', () => { capturePre(); updateSelBar(); });
fc.on('text:editing:exited', () => { syncPage(); commitPre(); refreshProps(); updateSelBar(); });
// end a live slider gesture when a control commits its value
$('propsBody').addEventListener('change', () => { state.livePushed = false; });

/* pan tool: scroll the stage */
let panState = null;
stage.addEventListener('pointerdown', (e) => {
  if (state.tool !== 'pan' || !state.pdfDoc) return;
  panState = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  e.preventDefault();
});
stage.addEventListener('pointermove', (e) => {
  if (!panState) return;
  stage.scrollLeft = panState.sl - (e.clientX - panState.x);
  stage.scrollTop = panState.st - (e.clientY - panState.y);
});
stage.addEventListener('pointerup', () => { panState = null; });
stage.addEventListener('pointercancel', () => { panState = null; });

/* pinch-to-zoom (touch): two fingers change zoom and pan the stage together,
   like a native photo/map viewer. Runs on the capture phase so it takes
   priority over fabric's own pointer handling and the pan-tool drag above —
   works no matter which tool is active. The first finger's own down/move/up
   events are left alone until a second finger joins; only then do we start
   swallowing events, so whatever the first finger was doing (draw/select/pan)
   simply freezes during the pinch and finalizes normally once it lifts. */
const pinchTouches = new Map(); // pointerId -> {x, y}
let pinchState = null;
let pinchRAF = null;
let pinchPending = null;

function pinchDist(pts) { return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); }
function pinchMid(pts) { return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }; }

async function applyPinchZoom(z, midX, midY) {
  if (!pinchState) return;
  state.zoom = clamp(z, 0.12, 6);
  state.zoomMode = 'custom';
  await renderCurrentPage();
  if (!pinchState) return; // pinch ended while the render was in flight
  const rect = stage.getBoundingClientRect();
  stage.scrollLeft = pinchState.anchorX * state.zoom - (midX - rect.left);
  stage.scrollTop = pinchState.anchorY * state.zoom - (midY - rect.top);
}

function schedulePinchZoom(z, midX, midY) {
  pinchPending = { z, midX, midY };
  if (pinchRAF) return;
  pinchRAF = requestAnimationFrame(() => {
    pinchRAF = null;
    const p = pinchPending; pinchPending = null;
    if (p) applyPinchZoom(p.z, p.midX, p.midY);
  });
}

function endPinchTouch(e) {
  pinchTouches.delete(e.pointerId);
  if (pinchTouches.size < 2) pinchState = null;
}

stage.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !state.pdfDoc) return;
  pinchTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinchTouches.size < 2) return;
  e.preventDefault();
  e.stopPropagation();
  if (pinchState) return; // a third finger — keep pinching with the original two
  panState = null;
  fc.discardActiveObject();
  fc.requestRenderAll();
  const pts = Array.from(pinchTouches.values()).slice(0, 2);
  const rect = stage.getBoundingClientRect();
  const mid = pinchMid(pts);
  pinchState = {
    startDist: Math.max(1, pinchDist(pts)),
    startZoom: state.zoom,
    anchorX: (stage.scrollLeft + (mid.x - rect.left)) / state.zoom,
    anchorY: (stage.scrollTop + (mid.y - rect.top)) / state.zoom,
  };
}, { capture: true, passive: false });

stage.addEventListener('pointermove', (e) => {
  if (!pinchTouches.has(e.pointerId)) return;
  pinchTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!pinchState || pinchTouches.size < 2) return;
  e.preventDefault();
  e.stopPropagation();
  const pts = Array.from(pinchTouches.values()).slice(0, 2);
  const dist = pinchDist(pts);
  if (dist < 1) return;
  const mid = pinchMid(pts);
  schedulePinchZoom(pinchState.startZoom * (dist / pinchState.startDist), mid.x, mid.y);
}, { capture: true, passive: false });

stage.addEventListener('pointerup', endPinchTouch, { capture: true });
stage.addEventListener('pointercancel', endPinchTouch, { capture: true });
stage.addEventListener('pointerleave', endPinchTouch, { capture: true });

// keep the floating selection toolbar anchored while the page scrolls
stage.addEventListener('scroll', () => updateSelBar());

/* ============================================================
   Mobile drawers (small screens: panels become slide-in overlays)
   ============================================================ */
const mqMobile = window.matchMedia('(max-width: 860px)');
function isMobile() { return mqMobile.matches; }
function openDrawer(kind) {
  $('thumbsPanel').classList.toggle('drawer-open', kind === 'thumbs');
  $('propsPanel').classList.toggle('drawer-open', kind === 'props');
  $('drawerBackdrop').classList.toggle('hidden', false);
}
function closeDrawers() {
  $('thumbsPanel').classList.remove('drawer-open');
  $('propsPanel').classList.remove('drawer-open');
  $('drawerBackdrop').classList.add('hidden');
}
/* burger menu (mobile) — toggle + actions */
function toggleMenu() {
  $('menuDropdown').classList.toggle('hidden');
}
function hideMenu() {
  $('menuDropdown').classList.add('hidden');
}
$('btnMenu').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
$('menuDropdown').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const act = btn.dataset.act;
  hideMenu();
  if (act === 'open') $('fileInput').click();
  else if (act === 'undo') undo();
  else if (act === 'redo') redo();
  else if (act === 'pages') openDrawer('thumbs');
  else if (act === 'props') openDrawer('props');
  else if (act === 'zoomin') applyZoom(state.zoom * 1.2);
  else if (act === 'zoomout') applyZoom(state.zoom / 1.2);
  else if (act === 'fitwidth') fitZoom('fit-width');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#menuDropdown') && !e.target.closest('#btnMenu')) hideMenu();
});

/* floating selection toolbar (mobile): delete / layers / duplicate above the selection */
function updateSelBar() {
  const bar = $('selBar');
  if (!isMobile() || state.tool !== 'select' || state.loading) {
    bar.classList.add('hidden');
    return;
  }
  const active = fc.getActiveObject();
  const objs = fc.getActiveObjects();
  if (!active || !objs.length || objs.some((o) => o.isEditing)) {
    bar.classList.add('hidden');
    return;
  }
  // fabric's getCoords() returns the selection corners in canvas-element CSS
  // pixels already (the viewport transform is included), so no zoom scaling here.
  const coords = active.getCoords() || [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of coords) {
    if (p && typeof p.x === 'number') {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX === Infinity) { bar.classList.add('hidden'); return; }
  const cRect = fc.upperCanvasEl.getBoundingClientRect();
  const cx = cRect.left + (minX + maxX) / 2;
  const topEdge = cRect.top + minY;
  const bottomEdge = cRect.top + maxY;
  const barH = 46;
  const gap = 10;
  let top = topEdge - barH - gap;
  if (top < 60) top = bottomEdge + gap;
  bar.style.left = Math.round(cx) + 'px';
  bar.style.top = Math.round(top) + 'px';
  bar.classList.remove('hidden');
}
$('selBar').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.sel === 'del') deleteSelected();
  else if (btn.dataset.sel === 'front') bringToFront();
  else if (btn.dataset.sel === 'back') sendToBack();
  else if (btn.dataset.sel === 'dup') duplicateSelected();
  setTimeout(updateSelBar, 0);
});
$('drawerBackdrop').addEventListener('click', closeDrawers);
// close drawers when interacting with the page itself
fc.on('mouse:down', () => { if (isMobile()) closeDrawers(); });
// bigger touch handles on small screens
if (isMobile()) {
  fabric.Object.prototype.set({ cornerSize: 16, touchCornerSize: 20 });
}

/* context menu */
stage.addEventListener('contextmenu', (e) => {
  if (!state.pdfDoc || fc.getActiveObjects().length === 0) return;
  e.preventDefault();
  showCtxMenu(e.clientX, e.clientY);
});
document.addEventListener('mousedown', (e) => { if (!$('ctxMenu').contains(e.target)) hideCtxMenu(); });
$('ctxMenu').addEventListener('click', (e) => {
  const act = e.target.closest('button') && e.target.closest('button').dataset.act;
  hideCtxMenu();
  if (act === 'front') bringToFront();
  else if (act === 'back') sendToBack();
  else if (act === 'dup') duplicateSelected();
  else if (act === 'del') deleteSelected();
});

/* toolbar buttons */
$('btnOpen').addEventListener('click', () => { $('fileInput').click(); });
$('btnOpenEmpty').addEventListener('click', () => { $('fileInput').click(); });
$('fileInput').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
$('imageInput').addEventListener('change', (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  normalizeImageFile(f).then(({ dataUrl }) => {
    state.pending = { type: 'image', dataUrl };
    placePending(pageCenter()); // appear on the page right away, no extra click
    state.pending = null;
    setTool('select');
  }).catch(() => toast('Could not read that image', 'error'));
});
$('btnSave').addEventListener('click', savePdf);
$('btnUndo').addEventListener('click', undo);
$('btnRedo').addEventListener('click', redo);
$('btnPrevPage').addEventListener('click', () => goToPage(state.currentPage - 1));
$('btnNextPage').addEventListener('click', () => goToPage(state.currentPage + 1));
$('pageInput').addEventListener('change', (e) => goToPage(parseInt(e.target.value, 10)));
$('btnZoomIn').addEventListener('click', () => applyZoom(state.zoom * 1.2));
$('btnZoomOut').addEventListener('click', () => applyZoom(state.zoom / 1.2));
$('zoomSelect').addEventListener('change', (e) => {
  const v = e.target.value;
  if (v === 'fit-width' || v === 'fit-page') fitZoom(v);
  else applyZoom(parseInt(v, 10) / 100);
});
$('btnAddPage').addEventListener('click', addPage);
$('btnDelPage').addEventListener('click', deletePage);

/* tool rail */
document.querySelectorAll('.tool-btn').forEach((b) => {
  b.addEventListener('click', () => setTool(b.dataset.tool));
});

/* keyboard shortcuts */
window.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toUpperCase();
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  const modalOpen = !$('sigModal').classList.contains('hidden');

  if (modalOpen) {
    if (e.key === 'Escape') closeSigModal();
    return;
  }
  if (typing) {
    if (e.key === 'Escape' && e.target.blur) e.target.blur();
    return;
  }
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod) {
    if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (k === 'y') { e.preventDefault(); redo(); }
    else if (k === 's') { e.preventDefault(); savePdf(); }
    else if (k === 'o') { e.preventDefault(); $('fileInput').click(); }
    else if (k === 'c') { e.preventDefault(); copySelection(); }
    else if (k === 'v') { e.preventDefault(); pasteClipboard(); }
    else if (k === 'd') { e.preventDefault(); duplicateSelected(); }
    else if (k === 'b') { e.preventDefault(); toggleTextProp('bold'); }
    else if (k === 'i') { e.preventDefault(); toggleTextProp('italic'); }
    else if (k === 'u') { e.preventDefault(); toggleTextProp('underline'); }
    else if (k === '=' || k === '+') { e.preventDefault(); applyZoom(state.zoom * 1.2); }
    else if (k === '-') { e.preventDefault(); applyZoom(state.zoom / 1.2); }
    else if (k === '0') { e.preventDefault(); applyZoom(1); }
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
  else if (e.key === 'Escape') {
    const sel = fc.getActiveObjects();
    if (sel.length) { fc.discardActiveObject(); fc.requestRenderAll(); refreshProps(); }
    else if (state.tool !== 'select') setTool('select');
    else { state.pending = null; setStatusHint(TOOL_HINTS.select); }
  }
  else if (e.key.startsWith('Arrow')) {
    const sel = fc.getActiveObjects();
    if (!sel.length) return;
    e.preventDefault();
    const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    const mult = e.shiftKey ? 10 : 1;
    syncPage();
    pushUndo(); // pre-nudge state — one undo steps the selection back
    sel.forEach((o) => { o.set({ left: o.left + dx * mult, top: o.top + dy * mult }); o.setCoords(); });
    fc.requestRenderAll();
    const one = sel[0];
    $('propX').value = round1(one.left);
    $('propY').value = round1(one.top);
  }
  else if (['v', 'h', 't', 'p', 'y', 'r', 'o', 'l', 'a'].includes(k)) {
    const map = { v: 'select', h: 'pan', t: 'text', p: 'pen', y: 'highlighter', r: 'rect', o: 'ellipse', l: 'line', a: 'arrow' };
    setTool(map[k]);
  }
});

/* clipboard (copy/paste within the app) */
let clipJSON = null;
function copySelection() {
  const objs = fc.getActiveObjects();
  if (!objs.length) return;
  clipJSON = objs.map((o) => o.toObject(['annType', 'shapeKind', 'underlined']));
  toast('Copied ' + objs.length + (objs.length === 1 ? ' item' : ' items'));
}
function pasteClipboard() {
  if (!clipJSON || !clipJSON.length || !state.pdfDoc) return;
  Promise.all(clipJSON.map((j) => hydrate(JSON.parse(JSON.stringify(j))))).then((hydrated) => {
    syncPage();
    pushUndo(); // pre-paste state
    hydrated.forEach((c) => { c.set({ left: (c.left || 0) + 20, top: (c.top || 0) + 20 }); fc.add(c); });
    fc.discardActiveObject();
    hydrated.forEach((c) => fc.setActiveObject(c, false));
    fc.requestRenderAll();
    syncPage();
    refreshProps();
  });
}

function toggleTextProp(prop) {
  const objs = fc.getActiveObjects();
  if (!objs.length || objs.some((o) => o.annType !== 'text')) return;
  const one = objs[0];
  let val;
  if (prop === 'bold') val = (one.fontWeight || 'normal') === 'bold' ? 'normal' : 'bold';
  else if (prop === 'italic') val = (one.fontStyle || 'normal') === 'italic' ? 'normal' : 'italic';
  else if (prop === 'underline') { applyToActive((o) => setUnderline(o, !isUnderlined(o))); return; }
  applyToActive((o) => { o.set(prop === 'bold' ? { fontWeight: val } : { fontStyle: val }); });
  refreshProps();
}

/* drag & drop */
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
  dragDepth++;
  const hasPdf = Array.from(e.dataTransfer.items || []).some((it) => it.type === 'application/pdf' || /\.pdf$/i.test(it.type));
  $('dropLabel').textContent = hasPdf ? 'Drop your PDF here' : state.pdfDoc ? 'Drop PDF or image here' : 'Drop your PDF here';
  $('dropOverlay').classList.remove('hidden');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) $('dropOverlay').classList.add('hidden');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('dropOverlay').classList.add('hidden');
  handleDroppedFiles(e.dataTransfer && e.dataTransfer.files);
});

/* resize */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!state.pdfDoc) return;
    // The soft keyboard opening resizes the viewport. Re-rendering while a text
    // box is being edited would rebuild the canvas, destroy the edit session and
    // dismiss the keyboard — so skip it until the user finishes typing.
    if (fc.getObjects().some((o) => o.isEditing)) return;
    if (state.zoomMode === 'fit-width' || state.zoomMode === 'fit-page') fitZoom(state.zoomMode);
    else renderCurrentPage();
    updateSelBar();
  }, 150);
});

/* ctrl+wheel zoom */
window.addEventListener('wheel', (e) => {
  if (!state.pdfDoc || !(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  applyZoom(state.zoom * f);
}, { passive: false });

/* ============================================================
   Props panel wiring
   ============================================================ */
/* generic */
$('propX').addEventListener('change', (e) => applyToActive((o) => o.set({ left: parseFloat(e.target.value) || 0 })));
$('propY').addEventListener('change', (e) => applyToActive((o) => o.set({ top: parseFloat(e.target.value) || 0 })));
$('propW').addEventListener('change', (e) => applyToActive((o) => { const v = parseFloat(e.target.value); if (v > 0 && o.width) o.set({ scaleX: v / o.width }); }));
$('propH').addEventListener('change', (e) => applyToActive((o) => { const v = parseFloat(e.target.value); if (v > 0 && o.height) o.set({ scaleY: v / o.height }); }));
$('propRot').addEventListener('input', (e) => applyLive((o) => o.set({ angle: parseFloat(e.target.value) })));
$('propRotNum').addEventListener('input', (e) => { const v = clamp(parseFloat(e.target.value) || 0, 0, 360); $('propRot').value = v; applyLive((o) => o.set({ angle: v })); });
$('propOpacity').addEventListener('input', (e) => { const v = parseFloat(e.target.value) / 100; $('propOpacityNum').value = e.target.value; applyLive((o) => o.set({ opacity: v })); });
$('propOpacityNum').addEventListener('input', (e) => { const v = clamp(parseFloat(e.target.value) || 100, 5, 100); $('propOpacity').value = v; applyLive((o) => o.set({ opacity: v / 100 })); });
$('propFront').addEventListener('click', bringToFront);
$('propBack').addEventListener('click', sendToBack);
$('propDuplicate').addEventListener('click', duplicateSelected);
$('propDelete').addEventListener('click', deleteSelected);

/* text */
$('propFontFamily').addEventListener('change', (e) => applyToActive((o) => { o.set({ fontFamily: e.target.value }); if (o.initDimensions) o.initDimensions(); o.setCoords(); }));
$('propFontSize').addEventListener('change', (e) => applyToActive((o) => { const v = clamp(parseFloat(e.target.value) || 12, 4, 400); o.set({ fontSize: v / (o.scaleY || 1) }); o.setCoords(); }));
$('propTextColor').addEventListener('input', (e) => applyLive((o) => o.set({ fill: e.target.value })));
$('propTextColor').addEventListener('change', () => applyToActive(() => {}));
$('propBold').addEventListener('click', () => toggleTextProp('bold'));
$('propItalic').addEventListener('click', () => toggleTextProp('italic'));
$('propUnderline').addEventListener('click', () => toggleTextProp('underline'));
document.querySelectorAll('.align-btn').forEach((b) => {
  b.addEventListener('click', () => applyToActive((o) => o.set({ textAlign: b.dataset.align })));
});

/* shape */
$('propFill').addEventListener('input', (e) => applyLive((o) => o.set({ fill: e.target.value })));
$('propStroke').addEventListener('input', (e) => applyLive((o) => o.set({ stroke: e.target.value })));
$('propStrokeWidth').addEventListener('change', (e) => applyToActive((o) => o.set({ strokeWidth: Math.max(0, parseFloat(e.target.value) || 0) })));
$('propCornerRadius').addEventListener('input', (e) => applyLive((o) => { if (o.shapeKind === 'rect') o.set({ rx: parseFloat(e.target.value) / (o.scaleX || 1) }); }));

/* ink */
$('propInkColor').addEventListener('input', (e) => { INK_STYLE.color = e.target.value; applyLive((o) => o.set({ stroke: e.target.value })); });
$('propInkWidth').addEventListener('input', (e) => { const v = parseFloat(e.target.value); INK_STYLE.width = v; $('propInkWidthNum').value = v; applyLive((o) => o.set({ strokeWidth: v })); });
$('propInkWidthNum').addEventListener('input', (e) => { const v = clamp(parseFloat(e.target.value) || 3, 1, 20); INK_STYLE.width = v; $('propInkWidth').value = v; applyLive((o) => o.set({ strokeWidth: v })); });

/* highlight */
document.querySelectorAll('#propHlSwatches .swatch').forEach((b) => {
  b.addEventListener('click', () => { HIGHLIGHT_STYLE.color = b.dataset.c; applyToActive((o) => o.set({ fill: b.dataset.c })); });
});
$('propHlOpacity').addEventListener('input', (e) => { const v = parseFloat(e.target.value) / 100; HIGHLIGHT_STYLE.opacity = v; $('propHlOpacityNum').value = e.target.value; applyLive((o) => o.set({ opacity: v })); });
$('propHlOpacityNum').addEventListener('input', (e) => { const v = clamp(parseFloat(e.target.value) || 40, 10, 80); HIGHLIGHT_STYLE.opacity = v / 100; $('propHlOpacity').value = v; applyLive((o) => o.set({ opacity: v / 100 })); });

/* ============================================================
   Signature modal wiring
   ============================================================ */
document.querySelectorAll('#sigModal [data-close]').forEach((b) => b.addEventListener('click', closeSigModal));
$('sigModal').addEventListener('mousedown', (e) => { if (e.target === $('sigModal')) closeSigModal(); });
$('sigOk').addEventListener('click', onSigOk);
document.querySelectorAll('.sig-tab').forEach((b) => b.addEventListener('click', () => switchSigTab(b.dataset.tab)));
document.querySelectorAll('#sigSwatches .swatch').forEach((b) => {
  b.addEventListener('click', () => {
    state.sigState.color = b.dataset.c;
    document.querySelectorAll('#sigSwatches .swatch').forEach((x) => x.classList.toggle('active', x === b));
  });
});
document.querySelectorAll('#sigTypeSwatches .swatch').forEach((b) => {
  b.addEventListener('click', () => {
    state.sigState.typeColor = b.dataset.c;
    document.querySelectorAll('#sigTypeSwatches .swatch').forEach((x) => x.classList.toggle('active', x === b));
    renderTypePreview();
  });
});
$('sigUndo').addEventListener('click', () => { state.sigState.strokes.pop(); redrawSig(); });
$('sigClear').addEventListener('click', () => { state.sigState.strokes = []; redrawSig(); });
$('sigTypeClear').addEventListener('click', () => { $('sigTypeInput').value = ''; renderTypePreview(); });
$('sigTypeInput').addEventListener('input', renderTypePreview);
$('sigTypeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onSigOk(); } });

/* signature canvas drawing */
sigCanvas.addEventListener('pointerdown', (e) => {
  if (state.sigState.tab !== 'draw') return;
  const p = sigPos(e);
  state.sigState.strokes.push({ color: state.sigState.color, width: state.sigState.width, pts: [p] });
  state.sigState.drawing = true;
  try { sigCanvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  redrawSig();
});
sigCanvas.addEventListener('pointermove', (e) => {
  if (!state.sigState.drawing) return;
  const p = sigPos(e);
  const s = state.sigState.strokes[state.sigState.strokes.length - 1];
  s.pts.push(p);
  sigCtx.strokeStyle = s.color;
  sigCtx.lineWidth = s.width;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  sigCtx.beginPath();
  const prev = s.pts[s.pts.length - 2];
  sigCtx.moveTo(prev.x, prev.y);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
});
sigCanvas.addEventListener('pointerup', () => { state.sigState.drawing = false; });
sigCanvas.addEventListener('pointercancel', () => { state.sigState.drawing = false; });
$('sigWidth').addEventListener('input', (e) => { state.sigState.width = parseFloat(e.target.value); });

/* signature upload */
$('sigDrop').addEventListener('click', () => $('sigImageInput').click());
$('sigBrowse').addEventListener('click', (e) => { e.stopPropagation(); $('sigImageInput').click(); });
$('sigImageInput').addEventListener('change', (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  normalizeImageFile(f).then(({ dataUrl }) => showSigUpload(dataUrl)).catch(() => toast('Could not read that image', 'error'));
});
$('sigUploadWrap').addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && /image\//i.test(f.type)) normalizeImageFile(f).then(({ dataUrl }) => showSigUpload(dataUrl));
});
$('sigDrop').addEventListener('dragover', (e) => e.preventDefault());
$('sigDrop').addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && /image\//i.test(f.type)) normalizeImageFile(f).then(({ dataUrl }) => showSigUpload(dataUrl));
});
$('sigReplace').addEventListener('click', () => { $('sigImageInput').click(); });

/* window error surfacing */
window.addEventListener('error', (e) => { console.error(e.error || e.message); });

/* init */
updateToolAvailability();
updateUndoButtons();

/* debug handle (also handy for console experiments) */
window.__pdfStudio = { fc, state, fabric };

