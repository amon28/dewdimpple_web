// src/app.js — wires the DOM up to PackStore + Viewer.

import { PackStore } from './packStore.js';
import { Viewer } from './viewer.js';

const store = new PackStore();
const viewer = new Viewer(document.getElementById('canvas'));

const el = (id) => document.getElementById(id);

const ui = {
  packName: el('packName'),
  btnImport: el('btnImport'),
  fileImport: el('fileImport'),
  btnDemo: el('btnDemo'),
  exportName: el('exportName'),
  btnExport: el('btnExport'),

  countEntities: el('countEntities'),
  entityIssueBadge: el('entityIssueBadge'),
  searchEntities: el('searchEntities'),
  listEntities: el('listEntities'),
  entityListView: el('entityListView'),
  entityDetailView: el('entityDetailView'),
  btnEntityBack: el('btnEntityBack'),
  entityDetailIdentifier: el('entityDetailIdentifier'),
  entityDetailPath: el('entityDetailPath'),
  entityIssues: el('entityIssues'),
  entityModelsList: el('entityModelsList'),
  entityTexturesList: el('entityTexturesList'),

  countModels: el('countModels'),
  countTextures: el('countTextures'),
  searchModels: el('searchModels'),
  searchTextures: el('searchTextures'),
  listModels: el('listModels'),
  listTextures: el('listTextures'),
  btnAddModel: el('btnAddModel'),
  btnAddTexture: el('btnAddTexture'),

  selectModel: el('selectModel'),
  selectTexture: el('selectTexture'),
  viewerEmpty: el('viewerEmpty'),
  toast: el('toast'),
  dropOverlay: el('dropOverlay'),
  tmplFileRow: el('tmplFileRow'),
  toggleGrid: el('toggleGrid'),
  toggleAxes: el('toggleAxes'),
  toggleWireframe: el('toggleWireframe'),
  selectBg: el('selectBg'),
  btnFrame: el('btnFrame'),
};

let selection = { modelPath: null, modelKey: null, texturePath: null };

// `null` = entity list view. Otherwise a real entity object from store.entities,
// or the string 'ungrouped' for the synthetic "files not tied to any entity" bucket.
let activeEntity = null;

// ---------------------------------------------------------------- toast ---

let toastTimer = null;
function toast(message, isError) {
  ui.toast.textContent = message;
  ui.toast.classList.toggle('error', !!isError);
  ui.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 4200);
}

// -------------------------------------------------------------- loading ---

function setLoading(isLoading) {
  ui.btnImport.disabled = isLoading;
  ui.btnDemo.disabled = isLoading;
}

async function loadZipFile(file) {
  setLoading(true);
  try {
    const buf = await file.arrayBuffer();
    await store.loadFromZip(buf, file.name);
    onPackLoaded();
    const counts = store.getTotalIssueCounts();
    const issueNote = counts.errors || counts.warnings ? ` — ${counts.errors} error(s), ${counts.warnings} warning(s) found` : '';
    toast(`Loaded "${store.rootName}" — ${store.entities.length} entit${store.entities.length === 1 ? 'y' : 'ies'}, ${store.models.length} model(s), ${store.textures.length} texture(s)${issueNote}.`);
  } catch (e) {
    console.error(e);
    toast('Could not read that file as a resource pack zip: ' + e.message, true);
  } finally {
    setLoading(false);
  }
}

async function loadDemoPack() {
  setLoading(true);
  try {
    const res = await fetch('assets/demo/demo-pack.zip');
    const buf = await res.arrayBuffer();
    await store.loadFromZip(buf, 'demo_pack');
    onPackLoaded();
    toast('Loaded the demo pack.');
  } catch (e) {
    console.error(e);
    toast('Could not load the demo pack: ' + e.message, true);
  } finally {
    setLoading(false);
  }
}

function onPackLoaded() {
  ui.packName.textContent = store.rootName;
  ui.exportName.value = store.rootName;
  ui.btnExport.disabled = !store.isLoaded;
  selection = { modelPath: null, modelKey: null, texturePath: null };
  activeEntity = null;
  autoSelectDefaults();
  renderAll();
}

function autoSelectDefaults() {
  const pair = store.getDefaultPairing();
  if (!pair) return;
  selection.modelPath = pair.modelPath;
  selection.modelKey = pair.modelKey;
  selection.texturePath = pair.texturePath;
  if (pair.entityPath) {
    const entity = store.entities.find((e) => e.path === pair.entityPath);
    if (entity) activeEntity = entity;
  }
}

function findEntityForModel(path, key) {
  return store.entities.find((e) => e.geometry.some((g) => g.models.some((m) => m.path === path && m.key === key))) || null;
}

// -------------------------------------------------------------- render ----

function groupByDir(items, pathOf) {
  const groups = new Map();
  for (const item of items) {
    const path = pathOf(item);
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '(root)';
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(item);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function matchesFilter(text, query) {
  return !query || text.toLowerCase().includes(query.toLowerCase());
}

function renderAll() {
  renderEntities();
  renderModelList();
  renderTextureList();
  renderSelects();
  updateViewer();
  ui.viewerEmpty.classList.toggle('hidden', store.models.some((m) => m.geo));
}

// ------------------------------------------------------------- entities ---

function renderEntities() {
  const counts = store.getTotalIssueCounts();
  ui.countEntities.textContent = store.entities.length ? `(${store.entities.length})` : '';
  if (counts.errors > 0) {
    ui.entityIssueBadge.textContent = `⚠ ${counts.errors}`;
    ui.entityIssueBadge.className = 'issue-badge has-errors';
  } else if (counts.warnings > 0) {
    ui.entityIssueBadge.textContent = `⚠ ${counts.warnings}`;
    ui.entityIssueBadge.className = 'issue-badge has-warnings-only';
  } else {
    ui.entityIssueBadge.className = 'issue-badge hidden';
  }

  if (activeEntity) {
    ui.entityListView.classList.add('hidden');
    ui.entityDetailView.classList.remove('hidden');
    renderEntityDetail(activeEntity);
  } else {
    ui.entityListView.classList.remove('hidden');
    ui.entityDetailView.classList.add('hidden');
    renderEntityList();
  }
}

function entitySeverity(entity) {
  if (entity === 'ungrouped') return null;
  if (entity.errors.length) return 'err';
  if (entity.warnings.length) return 'warn';
  return 'ok';
}

function renderEntityList() {
  const query = ui.searchEntities.value.trim();
  ui.listEntities.innerHTML = '';

  const filtered = store.entities.filter(
    (e) => matchesFilter(e.identifier || '', query) || matchesFilter(e.path, query),
  );

  if (store.entities.length === 0 && store.isLoaded) {
    const note = document.createElement('p');
    note.className = 'entity-sublist-empty';
    note.textContent = 'This pack has no entity/*.json files — browse its files under the Models and Textures tabs instead.';
    ui.listEntities.appendChild(note);
  }

  for (const [dir, items] of groupByDir(filtered, (e) => e.path)) {
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = dir;
    ui.listEntities.appendChild(header);

    for (const entity of items) {
      ui.listEntities.appendChild(buildEntityRow(entity));
    }
  }

  const orphanCount = store.orphanModelPaths.size + store.orphanTexturePaths.size;
  if (orphanCount > 0 && matchesFilter('ungrouped files', query)) {
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = 'Not tied to an entity';
    ui.listEntities.appendChild(header);
    ui.listEntities.appendChild(
      buildEntityRow({
        identifier: 'Ungrouped files',
        path: `${store.orphanModelPaths.size} model(s), ${store.orphanTexturePaths.size} texture(s)`,
        errors: [],
        warnings: [],
      }, 'ungrouped'),
    );
  }
}

function buildEntityRow(entity, kind) {
  const row = document.createElement('div');
  row.className = 'file-row';

  const info = document.createElement('div');
  info.className = 'file-info';
  const name = document.createElement('div');
  name.className = 'file-name';
  name.textContent = entity.identifier || entity.path.split('/').pop();
  const path = document.createElement('div');
  path.className = 'file-path';
  path.textContent = entity.path;
  info.appendChild(name);
  info.appendChild(path);
  row.appendChild(info);

  const badges = document.createElement('div');
  badges.className = 'entity-row-badges';
  const severity = kind === 'ungrouped' ? null : entitySeverity(entity);
  if (severity) {
    const dot = document.createElement('span');
    dot.className = 'entity-dot ' + severity;
    dot.title = severity === 'err' ? `${entity.errors.length} error(s)` : severity === 'warn' ? `${entity.warnings.length} warning(s)` : 'No issues found';
    badges.appendChild(dot);
  }
  row.appendChild(badges);

  row.addEventListener('click', () => {
    activeEntity = kind === 'ungrouped' ? 'ungrouped' : entity;
    if (kind !== 'ungrouped') {
      const pair = store.getDefaultPairingForEntity(entity);
      if (pair) {
        selection.modelPath = pair.modelPath;
        selection.modelKey = pair.modelKey;
        selection.texturePath = pair.texturePath;
      }
    }
    renderAll();
  });

  return row;
}

function renderEntityDetail(entity) {
  const isUngrouped = entity === 'ungrouped';

  ui.entityDetailIdentifier.textContent = isUngrouped ? 'Ungrouped files' : entity.identifier || '(no identifier)';
  ui.entityDetailPath.textContent = isUngrouped
    ? 'Models and textures in this pack that no entity/*.json refers to.'
    : entity.path;

  ui.entityIssues.innerHTML = '';
  if (!isUngrouped) {
    if (entity.errors.length === 0 && entity.warnings.length === 0) {
      const ok = document.createElement('div');
      ok.className = 'entity-issues-empty';
      ok.textContent = 'No issues found for this entity.';
      ui.entityIssues.appendChild(ok);
    } else {
      for (const message of entity.errors) ui.entityIssues.appendChild(buildIssueRow(message, 'err'));
      for (const message of entity.warnings) ui.entityIssues.appendChild(buildIssueRow(message, 'warn'));
    }
  }

  const models = isUngrouped
    ? store.models.filter((m) => store.orphanModelPaths.has(m.path))
    : store.getEntityModels(entity);
  const textures = isUngrouped
    ? store.textures.filter((t) => store.orphanTexturePaths.has(t.path))
    : store.getEntityTextures(entity);

  ui.entityModelsList.innerHTML = '';
  if (models.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'entity-sublist-empty';
    empty.textContent = 'No model files here.';
    ui.entityModelsList.appendChild(empty);
  } else {
    for (const m of models) ui.entityModelsList.appendChild(buildModelRow(m));
  }

  ui.entityTexturesList.innerHTML = '';
  if (textures.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'entity-sublist-empty';
    empty.textContent = 'No texture files here.';
    ui.entityTexturesList.appendChild(empty);
  } else {
    for (const t of textures) ui.entityTexturesList.appendChild(buildTextureRow(t));
  }
}

function buildIssueRow(message, severity) {
  const div = document.createElement('div');
  div.className = 'entity-issue ' + severity;
  div.textContent = (severity === 'err' ? '✕ ' : '⚠ ') + message;
  return div;
}

ui.btnEntityBack.addEventListener('click', () => {
  activeEntity = null;
  renderEntities();
});

// ---------------------------------------------------------- model/texture rows

function buildModelRow(item) {
  return buildFileRow({
    name: item.key || item.path.split('/').pop(),
    path: item.path,
    error: item.error,
    selected: selection.modelPath === item.path && selection.modelKey === item.key,
    onSelect: () => {
      selection.modelPath = item.path;
      selection.modelKey = item.key;
      if (!selection.texturePath && item.key) {
        const suggested = store.suggestTextureFor(item.key);
        if (suggested) selection.texturePath = suggested;
      }
      const owner = findEntityForModel(item.path, item.key);
      if (owner) activeEntity = owner;
      renderAll();
    },
    onView: () => {
      const record = store.files.get(item.path);
      const blob = new Blob([record.bytes], { type: 'application/json' });
      window.open(URL.createObjectURL(blob), '_blank');
    },
    onReplace: (arrayBuffer) => {
      store.replaceFile(item.path, arrayBuffer);
      toast(`Replaced ${item.path}`);
      renderAll();
    },
    onRemove: () => {
      if (!confirm(`Remove "${item.path}" from the pack?`)) return;
      store.removeFile(item.path);
      if (selection.modelPath === item.path) {
        selection.modelPath = null;
        selection.modelKey = null;
        autoSelectDefaults();
      }
      renderAll();
    },
  });
}

function buildTextureRow(item) {
  const record = store.files.get(item.path);
  return buildFileRow({
    name: item.path.split('/').pop(),
    path: item.path,
    thumb: record.blobUrl,
    error: item.formatIssue,
    selected: selection.texturePath === item.path,
    onSelect: () => {
      selection.texturePath = item.path;
      renderAll();
    },
    onView: () => window.open(record.blobUrl, '_blank'),
    onReplace: (arrayBuffer) => {
      store.replaceFile(item.path, arrayBuffer);
      toast(`Replaced ${item.path}`);
      renderAll();
    },
    onRemove: () => {
      if (!confirm(`Remove "${item.path}" from the pack?`)) return;
      store.removeFile(item.path);
      if (selection.texturePath === item.path) selection.texturePath = null;
      renderAll();
    },
  });
}

function renderModelList() {
  const query = ui.searchModels.value.trim();
  ui.listModels.innerHTML = '';
  ui.countModels.textContent = store.models.length ? `(${store.models.length})` : '';

  const filtered = store.models.filter(
    (m) => matchesFilter(m.path, query) || matchesFilter(m.key || '', query),
  );

  for (const [dir, items] of groupByDir(filtered, (m) => m.path)) {
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = dir;
    ui.listModels.appendChild(header);

    for (const item of items) ui.listModels.appendChild(buildModelRow(item));
  }
}

function renderTextureList() {
  const query = ui.searchTextures.value.trim();
  ui.listTextures.innerHTML = '';
  ui.countTextures.textContent = store.textures.length ? `(${store.textures.length})` : '';

  const filtered = store.textures.filter((t) => matchesFilter(t.path, query));

  for (const [dir, items] of groupByDir(filtered, (t) => t.path)) {
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = dir;
    ui.listTextures.appendChild(header);

    for (const item of items) ui.listTextures.appendChild(buildTextureRow(item));
  }
}

function buildFileRow({ name, path, error, thumb, selected, onSelect, onView, onReplace, onRemove }) {
  const frag = ui.tmplFileRow.content.cloneNode(true);
  const row = frag.querySelector('.file-row');
  const img = frag.querySelector('.file-thumb');
  const nameEl = frag.querySelector('.file-name');
  const pathEl = frag.querySelector('.file-path');
  const fileInput = frag.querySelector('.row-file-input');

  nameEl.textContent = error ? `⚠ ${name}` : name;
  pathEl.textContent = path;
  if (error) { row.classList.add('error'); row.title = error; }
  if (selected) row.classList.add('selected');

  if (thumb) {
    img.src = thumb;
    img.hidden = false;
  }

  row.addEventListener('click', (e) => {
    if (e.target.closest('.file-actions')) return;
    onSelect();
  });

  frag.querySelector('.row-view').addEventListener('click', (e) => {
    e.stopPropagation();
    onView();
  });

  frag.querySelector('.row-replace').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    onReplace(buf);
  });

  frag.querySelector('.row-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove();
  });

  return row;
}

function renderSelects() {
  ui.selectModel.innerHTML = '<option value="">— none —</option>';
  for (const m of store.models) {
    if (!m.geo) continue;
    const opt = document.createElement('option');
    opt.value = `${m.path}::${m.key}`;
    opt.textContent = `${m.key}  (${m.path.split('/').pop()})`;
    if (selection.modelPath === m.path && selection.modelKey === m.key) opt.selected = true;
    ui.selectModel.appendChild(opt);
  }

  ui.selectTexture.innerHTML = '<option value="">— none —</option>';
  for (const t of store.textures) {
    const opt = document.createElement('option');
    opt.value = t.path;
    opt.textContent = t.path;
    if (selection.texturePath === t.path) opt.selected = true;
    ui.selectTexture.appendChild(opt);
  }
}

// -------------------------------------------------------------- viewer ----

let renderToken = 0;

async function updateViewer() {
  const model = store.models.find((m) => m.path === selection.modelPath && m.key === selection.modelKey);
  if (!model || !model.geo) {
    viewer.clearModel();
    return;
  }

  const texRecord = selection.texturePath ? store.files.get(selection.texturePath) : null;
  const token = ++renderToken;
  try {
    await viewer.setModel(model.geo, texRecord ? texRecord.blobUrl : null);
  } catch (e) {
    if (token !== renderToken) return;
    console.error(e);
    toast('Could not render this model: ' + e.message, true);
  }
}

// ---------------------------------------------------------------- events --

ui.btnImport.addEventListener('click', () => ui.fileImport.click());
ui.fileImport.addEventListener('change', () => {
  const file = ui.fileImport.files[0];
  if (file) loadZipFile(file);
  ui.fileImport.value = '';
});

ui.btnDemo.addEventListener('click', loadDemoPack);

ui.btnExport.addEventListener('click', async () => {
  try {
    const blob = await store.exportZip(ui.exportName.value.trim() || store.rootName);
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${(ui.exportName.value.trim() || store.rootName).replace(/[\\/:*?"<>|]/g, '_')}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Pack exported.');
  } catch (e) {
    console.error(e);
    toast('Export failed: ' + e.message, true);
  }
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    el('panel-entities').classList.toggle('hidden', which !== 'entities');
    el('panel-models').classList.toggle('hidden', which !== 'models');
    el('panel-textures').classList.toggle('hidden', which !== 'textures');
  });
});

ui.searchEntities.addEventListener('input', renderEntityList);
ui.searchModels.addEventListener('input', renderModelList);
ui.searchTextures.addEventListener('input', renderTextureList);

ui.selectModel.addEventListener('change', () => {
  const [path, key] = ui.selectModel.value.split('::');
  if (!path) { selection.modelPath = null; selection.modelKey = null; }
  else {
    selection.modelPath = path;
    selection.modelKey = key;
    const owner = findEntityForModel(path, key);
    if (owner) activeEntity = owner;
  }
  renderAll();
});

ui.selectTexture.addEventListener('change', () => {
  selection.texturePath = ui.selectTexture.value || null;
  renderAll();
});

function addNewFile(kind) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = kind === 'model' ? '.json' : '.png,.tga,.jpg,.jpeg';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const defaultDir = kind === 'model' ? 'models/entity/' : 'textures/entity/';
    const suggested = defaultDir + file.name;
    const path = prompt(`Add as which path inside the pack?`, suggested);
    if (!path) return;
    const buf = await file.arrayBuffer();
    if (!store.addFile(path, buf)) {
      toast(`A file already exists at "${path}".`, true);
      return;
    }
    toast(`Added ${path}`);
    renderAll();
  });
  input.click();
}

ui.btnAddModel.addEventListener('click', () => addNewFile('model'));
ui.btnAddTexture.addEventListener('click', () => addNewFile('texture'));

document.querySelectorAll('[data-cam]').forEach((btn) => {
  btn.addEventListener('click', () => viewer.setCameraPreset(btn.dataset.cam));
});
ui.btnFrame.addEventListener('click', () => viewer.frameModel());

ui.toggleGrid.addEventListener('change', () => viewer.setGridVisible(ui.toggleGrid.checked));
ui.toggleAxes.addEventListener('change', () => viewer.setAxesVisible(ui.toggleAxes.checked));
ui.toggleWireframe.addEventListener('change', () => viewer.setWireframe(ui.toggleWireframe.checked));
ui.selectBg.addEventListener('change', () => viewer.setBackground(Number(ui.selectBg.value)));

// -------------------------------------------------------- drag & drop -----

let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer || ![...e.dataTransfer.items].some((i) => i.kind === 'file')) return;
  dragDepth++;
  ui.dropOverlay.classList.remove('hidden');
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) ui.dropOverlay.classList.add('hidden');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragDepth = 0;
  ui.dropOverlay.classList.add('hidden');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file && /\.(zip|mcpack)$/i.test(file.name)) {
    loadZipFile(file);
  } else if (file) {
    toast('Drop a .zip or .mcpack resource pack file.', true);
  }
});

// ------------------------------------------------------------------ init --

renderAll();
