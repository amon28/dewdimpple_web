// src/packStore.js
//
// Loads a Bedrock resource pack (.zip / .mcpack) into an in-memory file map,
// classifies files (model / texture / other), links them together through
// entity/*.json + render_controllers/*.json definitions, validates those
// links, keeps track of edits, and can re-export the whole thing as a new
// zip.
//
// Nothing here ever leaves the browser tab: the pack is only ever read from
// the file the user picked and written back to a file they choose to save.

import { extractGeometries } from './bedrockModel.js';

const MODEL_RE = /\.geo\.json$|models[\\/].*\.json$/i;
const TEXTURE_RE = /\.(png|tga|jpg|jpeg)$/i;
const ENTITY_RE = /entity[\\/].*\.json$/i;
const RENDER_CONTROLLER_RE = /render_controllers[\\/].*\.json$/i;
const TEXTURE_EXTS = ['.png', '.tga', '.jpg', '.jpeg'];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ---------------------------------------------------------------------------
// Vanilla asset index — lets us tell "this texture/model isn't in the pack,
// but it's a real vanilla Minecraft asset so it's fine" apart from "this
// texture/model isn't in the pack, and isn't vanilla either, so it's
// probably a mistake". Built offline from Mojang's bedrock-samples resource
// pack (see assets/vanilla/README.txt) and shipped as two small static JSON
// files; fetched once, lazily, the first time a pack is loaded.
const VANILLA_TEXTURES_URL = 'assets/vanilla/vanilla_textures.json';
const VANILLA_GEOMETRY_URL = 'assets/vanilla/vanilla_geometry.json';
const VANILLA_RENDER_CONTROLLERS_URL = 'assets/vanilla/vanilla_render_controllers.json';
let vanillaIndexPromise = null;

function loadVanillaIndex() {
  if (!vanillaIndexPromise) {
    vanillaIndexPromise = Promise.all([
      fetch(VANILLA_TEXTURES_URL).then((r) => (r.ok ? r.json() : [])),
      fetch(VANILLA_GEOMETRY_URL).then((r) => (r.ok ? r.json() : [])),
      fetch(VANILLA_RENDER_CONTROLLERS_URL).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([textures, geometry, renderControllers]) => ({
        textures: new Set(textures),
        texturesLower: new Set(textures.map((t) => t.toLowerCase())),
        geometry: new Set(geometry),
        geometryLower: new Set(geometry.map((g) => g.toLowerCase())),
        renderControllers: new Set(renderControllers),
        renderControllersLower: new Set(renderControllers.map((c) => c.toLowerCase())),
      }))
      .catch(() => ({
        textures: new Set(),
        texturesLower: new Set(),
        geometry: new Set(),
        geometryLower: new Set(),
        renderControllers: new Set(),
        renderControllersLower: new Set(),
      }));
  }
  return vanillaIndexPromise;
}

// Classification order matters: "models/entity/foo.geo.json" contains the
// substring "entity/" too, so model paths must be checked (and excluded)
// before the generic entity-file pattern is allowed to match.
function isModelPath(path) {
  return MODEL_RE.test(path) && !/\.mcmeta$/i.test(path);
}
function isTexturePath(path) {
  return TEXTURE_RE.test(path);
}
function isRenderControllerPath(path) {
  return RENDER_CONTROLLER_RE.test(path);
}
function isEntityPath(path) {
  return ENTITY_RE.test(path) && !isModelPath(path) && !isRenderControllerPath(path);
}

function isPngSignature(bytes) {
  const head = new Uint8Array(bytes, 0, Math.min(8, bytes.byteLength));
  if (head.length < 8) return false;
  for (let i = 0; i < 8; i++) if (head[i] !== PNG_SIGNATURE[i]) return false;
  return true;
}

/**
 * Strip `//` and `/* *\/` comments from `text`, leaving string contents
 * untouched. Bedrock's own JSON reader tolerates comments in every pack
 * file (entities, geometry, render controllers, …), and real-world packs
 * use them constantly — treating every commented file as a syntax error
 * would be far too noisy to be useful.
 */
function stripJsonComments(text) {
  let out = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (c === '\n') {
        inLineComment = false;
        out += c;
      }
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (escapeNext) escapeNext = false;
      else if (c === '\\') escapeNext = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    out += c;
  }

  return out;
}

/** Drop a trailing comma before `]`/`}` (outside strings) — another thing
 * Bedrock's reader tolerates that the standard JSON.parse doesn't. */
function stripTrailingCommas(text) {
  let out = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      out += c;
      if (escapeNext) escapeNext = false;
      else if (c === '\\') escapeNext = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (text[j] === ']' || text[j] === '}') continue; // drop this comma
    }
    out += c;
  }

  return out;
}

/**
 * Parse Bedrock-flavored JSON: try strict JSON.parse first (the common
 * case, and cheapest), and only fall back to comment/trailing-comma
 * stripping if that fails. Throws the error from the *final* attempt if
 * the text is still unparseable, so genuine syntax errors are still
 * reported.
 */
function parseLenientJSON(text) {
  try {
    return JSON.parse(text);
  } catch (firstError) {
    try {
      return JSON.parse(stripTrailingCommas(stripJsonComments(text)));
    } catch (secondError) {
      throw secondError;
    }
  }
}

/** Bedrock's render_controllers reference textures/geometry as e.g. "Texture.default" /
 * "Geometry.default" inside molang strings and arrays — extract every short key mentioned,
 * whatever shape (direct reference, or inside an `arrays` table) they take. This is a
 * best-effort text scan rather than a full molang evaluator, which is enough to catch the
 * common "render controller expects a key the entity never defines" mistake. */
function extractShortKeyRefs(rawText, prefix) {
  const re = new RegExp(prefix + '\\.([A-Za-z0-9_]+)', 'gi');
  const keys = new Set();
  let m;
  while ((m = re.exec(rawText))) keys.add(m[1].toLowerCase());
  return keys;
}

function flattenControllerRefs(list) {
  if (!Array.isArray(list)) return [];
  const ids = [];
  for (const item of list) {
    if (typeof item === 'string') ids.push(item);
    else if (item && typeof item === 'object') ids.push(...Object.keys(item));
  }
  return ids;
}

export class PackStore {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {Map<string, {type:string, bytes:ArrayBuffer, text?:string, blobUrl?:string, dir:boolean}>} */
    this.files = new Map();
    this.rootName = 'resource_pack';
    this.models = []; // { path, key, geo, error? }
    this.textures = []; // { path, formatIssue? }
    this.entities = []; // see _indexEntities()
    this.renderControllers = new Map(); // id -> { path, textureKeys:Set, geometryKeys:Set }
    this.orphanModelPaths = new Set();
    this.orphanTexturePaths = new Set();
    this._loadGen = (this._loadGen || 0) + 1;
    // Filled in by loadFromZip/loadFromFileList before validation runs; empty
    // until then, which just means "nothing recognized as vanilla yet"
    // rather than a hard failure.
    this._vanillaTextures = this._vanillaTextures || new Set();
    this._vanillaTexturesLower = this._vanillaTexturesLower || new Set();
    this._vanillaGeometry = this._vanillaGeometry || new Set();
    this._vanillaGeometryLower = this._vanillaGeometryLower || new Set();
    this._vanillaRenderControllers = this._vanillaRenderControllers || new Set();
    this._vanillaRenderControllersLower = this._vanillaRenderControllersLower || new Set();
  }

  _applyVanillaIndex(vanillaIndex) {
    this._vanillaTextures = vanillaIndex.textures;
    this._vanillaTexturesLower = vanillaIndex.texturesLower;
    this._vanillaGeometry = vanillaIndex.geometry;
    this._vanillaGeometryLower = vanillaIndex.geometryLower;
    this._vanillaRenderControllers = vanillaIndex.renderControllers;
    this._vanillaRenderControllersLower = vanillaIndex.renderControllersLower;
  }

  get isLoaded() {
    return this.files.size > 0;
  }

  async loadFromZip(arrayBuffer, suggestedName) {
    // Bump the generation token up front so that if another load starts
    // before this one finishes, this one's result gets discarded instead of
    // corrupting whatever the newer load committed (both loads mutate the
    // same instance, and this method has several `await`s a second load
    // could interleave with).
    const myGen = (this._loadGen || 0) + 1;
    this._loadGen = myGen;

    // Kick this off in parallel with the zip decompression below — it's a
    // small same-origin fetch that's normally done long before extraction
    // finishes, so it doesn't add noticeable load time.
    const vanillaIndexLoading = loadVanillaIndex();

    const zip = await JSZip.loadAsync(arrayBuffer);

    const entries = Object.values(zip.files).filter((e) => !e.dir);
    // Guess the root folder name (top-level common prefix), used only for
    // cosmetics (pre-filling the export name).
    const topDirs = new Set();

    // Kick off all decompressions concurrently rather than one at a time —
    // large packs (hundreds of small files) load much faster this way, and
    // it keeps each individual await short so a busy render loop can't
    // starve the import for seconds at a time.
    const extracted = await Promise.all(
      entries.map(async (entry) => ({ path: entry.name, bytes: await entry.async('arraybuffer') })),
    );

    if (this._loadGen !== myGen) return; // superseded by a newer load while we were extracting

    this.files = new Map();
    this.rootName = 'resource_pack';

    for (const { path, bytes } of extracted) {
      this._addFile(path, bytes);
      const firstSlash = path.indexOf('/');
      if (firstSlash > 0) topDirs.add(path.slice(0, firstSlash));
    }

    if (topDirs.size === 1) {
      this.rootName = [...topDirs][0];
    } else if (suggestedName) {
      this.rootName = suggestedName.replace(/\.(zip|mcpack)$/i, '');
    }

    const vanillaIndex = await vanillaIndexLoading;
    if (this._loadGen !== myGen) return; // superseded while we were waiting
    this._applyVanillaIndex(vanillaIndex);

    this._reindex();
  }

  /** Load a flat set of {path, arrayBuffer} pairs (e.g. dropped folder). */
  async loadFromFileList(fileEntries, suggestedName) {
    this.reset();
    for (const { path, bytes } of fileEntries) {
      this._addFile(path, bytes);
    }
    if (suggestedName) this.rootName = suggestedName;
    this._applyVanillaIndex(await loadVanillaIndex());
    this._reindex();
  }

  _addFile(path, bytes) {
    const type = isModelPath(path)
      ? 'model'
      : isTexturePath(path)
        ? 'texture'
        : isEntityPath(path)
          ? 'entity'
          : isRenderControllerPath(path)
            ? 'render_controller'
            : 'other';
    const record = { type, bytes, dir: false };

    if (type === 'texture') {
      record.blobUrl = URL.createObjectURL(new Blob([bytes]));
      record.isPng = isPngSignature(bytes);
    } else {
      try {
        record.text = new TextDecoder('utf-8').decode(bytes);
      } catch (e) {
        record.text = '';
      }
    }

    this.files.set(path, record);
  }

  /** Recompute this.models / this.textures / this.entities from this.files. */
  _reindex() {
    this.models = [];
    this.textures = [];

    for (const [path, record] of this.files) {
      if (record.type === 'texture') {
        const formatIssue = texFormatIssue(path, record);
        this.textures.push({ path, formatIssue });
      } else if (record.type === 'model') {
        let json;
        try {
          json = parseLenientJSON(record.text);
        } catch (e) {
          this.models.push({ path, key: null, geo: null, error: 'Syntax error: ' + e.message });
          continue;
        }
        const geos = extractGeometries(json);
        if (geos.length === 0) {
          this.models.push({ path, key: null, geo: null, error: 'No geometry found in file.' });
        } else {
          for (const geo of geos) {
            this.models.push({ path, key: geo.key, geo });
          }
        }
      }
    }

    this.textures.sort((a, b) => a.path.localeCompare(b.path));
    this.models.sort((a, b) => (a.key || a.path).localeCompare(b.key || b.path));

    this._indexRenderControllers();
    this._indexEntities();
  }

  _indexRenderControllers() {
    this.renderControllers = new Map();

    for (const [path, record] of this.files) {
      if (record.type !== 'render_controller') continue;
      let json;
      try {
        json = parseLenientJSON(record.text);
      } catch (e) {
        this.renderControllers.set(path, { path, id: path, parseError: e.message, textureKeys: new Set(), geometryKeys: new Set() });
        continue;
      }
      // Older packs (format_version < ~1.10) use the bare "render_controllers"
      // key; newer ones namespace it as "minecraft:render_controllers".
      const controllers = json && (json['minecraft:render_controllers'] || json['render_controllers']);
      if (!controllers || typeof controllers !== 'object') continue;

      for (const id of Object.keys(controllers)) {
        const raw = JSON.stringify(controllers[id]);
        this.renderControllers.set(id, {
          path,
          id,
          textureKeys: extractShortKeyRefs(raw, 'texture'),
          geometryKeys: extractShortKeyRefs(raw, 'geometry'),
        });
      }
    }
  }

  /**
   * Parse entity/*.json client-entity definitions into `this.entities`,
   * resolving each declared texture/geometry short key against the files
   * actually present in the pack, and cross-checking every render
   * controller the entity uses against what that controller actually
   * references — this is what surfaces "render controller expects a
   * texture/model the entity doesn't define" and "entity points at a
   * texture/model file that isn't in the pack" as concrete errors.
   */
  _indexEntities() {
    this.entities = [];

    const texByBase = new Map(); // "textures/entity/foo" (no ext, pack-root-relative) -> full path
    const texByShort = new Map(); // "foo" (filename, no ext) -> full path
    for (const { path } of this.textures) {
      // Entity JSON refs are always pack-root-relative (e.g. "textures/custom/custom0"),
      // but `path` here is the full zip path including the pack's root folder
      // (e.g. "NPC R V11/textures/custom/custom0.png") — strip that prefix before
      // indexing so the exact-path lookup below actually has a chance to match,
      // instead of always missing and silently falling through to the ambiguous
      // short-filename map (which breaks when multiple folders share a filename,
      // e.g. textures/custom/custom0.png vs textures/custom_slim/custom0.png).
      const relative = stripRoot(path, this.rootName);
      const base = relative.replace(/\.(png|tga|jpg|jpeg)$/i, '');
      if (!texByBase.has(base)) texByBase.set(base, path);
      const short = base.split('/').pop();
      if (!texByShort.has(short)) texByShort.set(short, path);
    }

    const modelsByKey = new Map(); // geoKey -> [model entries]
    for (const m of this.models) {
      if (!m.key) continue;
      if (!modelsByKey.has(m.key)) modelsByKey.set(m.key, []);
      modelsByKey.get(m.key).push(m);
    }

    const resolveTexture = (ref) => {
      const clean = String(ref).replace(/^\/+/, '');
      return texByBase.get(clean) || texByBase.get(clean.replace(/\.(png|tga|jpg|jpeg)$/i, '')) || texByShort.get(clean.split('/').pop()) || null;
    };

    for (const [path, record] of this.files) {
      if (record.type !== 'entity') continue;

      const entity = {
        path,
        identifier: null,
        parseError: null,
        textures: [], // { shortKey, ref, resolvedPath, error }
        geometry: [], // { shortKey, geoKey, models: [entries], error }
        renderControllerRefs: [], // { id, found, missingTextureKeys, missingGeometryKeys }
        errors: [],
        warnings: [],
      };

      let json;
      try {
        json = parseLenientJSON(record.text);
      } catch (e) {
        entity.parseError = 'Syntax error: ' + e.message;
        entity.errors.push(`Could not parse this entity file: ${e.message}`);
        this.entities.push(entity);
        continue;
      }

      const desc = json && json['minecraft:client_entity'] && json['minecraft:client_entity'].description;
      if (!desc) {
        entity.parseError = 'Missing "minecraft:client_entity.description".';
        entity.errors.push('This file is missing a "minecraft:client_entity" → "description" block.');
        this.entities.push(entity);
        continue;
      }

      entity.identifier = desc.identifier || '(no identifier)';

      const texMap = desc.textures || {};
      const geomMap = desc.geometry || {};

      for (const shortKey of Object.keys(texMap)) {
        const ref = texMap[shortKey];
        const resolvedPath = resolveTexture(ref);
        const item = { shortKey, ref, resolvedPath, error: null };
        if (!resolvedPath) {
          const cleanRef = String(ref).replace(/^\/+/, '').replace(/\.(png|tga|jpg|jpeg)$/i, '');
          if (this._vanillaTextures.has(cleanRef) || this._vanillaTexturesLower.has(cleanRef.toLowerCase())) {
            // Confirmed against Mojang's bedrock-samples pack: this is a
            // real vanilla texture, not a missing file — nothing to flag.
            item.isVanilla = true;
          } else {
            // Not necessarily a mistake even so: the vanilla index is a
            // snapshot of one game version and may not be exhaustive, so
            // this can still legitimately mean "reuses a built-in vanilla
            // texture" — flag it, but as a warning rather than a hard error.
            item.error = `Texture "${ref}" (short key "${shortKey}") isn't included in this pack and isn't a recognized vanilla Minecraft texture either — expected a file like "${ref}.png".`;
            entity.warnings.push(item.error);
          }
        } else {
          const texRecord = this.files.get(resolvedPath);
          const issue = texFormatIssue(resolvedPath, texRecord);
          if (issue) {
            item.formatIssue = issue;
            entity.warnings.push(`Texture "${resolvedPath}" (short key "${shortKey}"): ${issue}`);
          }
        }
        entity.textures.push(item);
      }

      for (const shortKey of Object.keys(geomMap)) {
        const geoKey = geomMap[shortKey];
        const matches = modelsByKey.get(geoKey) || [];
        const item = { shortKey, geoKey, models: matches, error: null };
        if (matches.length === 0) {
          if (this._vanillaGeometry.has(geoKey) || this._vanillaGeometryLower.has(String(geoKey).toLowerCase())) {
            // Confirmed against Mojang's bedrock-samples pack: this is a
            // real vanilla geometry identifier this pack never overrides.
            item.isVanilla = true;
          } else {
            // Same reasoning as textures above: the vanilla index is a
            // snapshot of one game version and may not cover everything,
            // so this can still legitimately be a vanilla geometry — flag
            // it, but as a warning rather than a hard error.
            item.error = `Geometry "${geoKey}" (short key "${shortKey}") wasn't found in any model file in this pack and isn't a recognized vanilla Minecraft geometry either.`;
            entity.warnings.push(item.error);
          }
        } else {
          for (const m of matches) {
            if (m.error) entity.errors.push(`Model "${m.path}" for geometry "${geoKey}" has a problem: ${m.error}`);
          }
        }
        entity.geometry.push(item);
      }

      const texKeys = new Set(Object.keys(texMap).map((k) => k.toLowerCase()));
      const geoKeys = new Set(Object.keys(geomMap).map((k) => k.toLowerCase()));

      const controllerIds = flattenControllerRefs(desc.render_controllers);
      for (const id of controllerIds) {
        const controller = this.renderControllers.get(id);
        if (!controller) {
          entity.renderControllerRefs.push({ id, found: false, missingTextureKeys: [], missingGeometryKeys: [] });
          if (!this._vanillaRenderControllers.has(id) && !this._vanillaRenderControllersLower.has(id.toLowerCase())) {
            // As with textures/geometry: not found in the pack could still
            // legitimately mean "uses the vanilla render controller of this
            // name" rather than a mistake — only flag it when it's not a
            // recognized vanilla one either.
            entity.warnings.push(`Render controller "${id}" is referenced by this entity but wasn't found in the pack and isn't a recognized vanilla Minecraft render controller either.`);
          }
          continue;
        }
        if (controller.parseError) {
          entity.warnings.push(`Render controller "${id}" (${controller.path}) has a syntax error: ${controller.parseError}`);
          continue;
        }

        const missingTextureKeys = [...controller.textureKeys].filter((k) => !texKeys.has(k));
        const missingGeometryKeys = [...controller.geometryKeys].filter((k) => !geoKeys.has(k));

        entity.renderControllerRefs.push({ id, found: true, missingTextureKeys, missingGeometryKeys });

        for (const k of missingTextureKeys) {
          entity.errors.push(`Render controller "${id}" expects a texture short key "${k}" that this entity doesn't define.`);
        }
        for (const k of missingGeometryKeys) {
          entity.errors.push(`Render controller "${id}" expects a geometry short key "${k}" that this entity doesn't define.`);
        }
      }

      this.entities.push(entity);
    }

    this.entities.sort((a, b) => (a.identifier || a.path).localeCompare(b.identifier || b.path));

    // Which models/textures aren't claimed by any entity at all (still
    // browsable, just under an "ungrouped" bucket in the UI).
    const claimedModelPaths = new Set();
    const claimedTexturePaths = new Set();
    for (const entity of this.entities) {
      for (const g of entity.geometry) for (const m of g.models) claimedModelPaths.add(m.path);
      for (const t of entity.textures) if (t.resolvedPath) claimedTexturePaths.add(t.resolvedPath);
    }
    this.orphanModelPaths = new Set(this.models.map((m) => m.path).filter((p) => !claimedModelPaths.has(p)));
    this.orphanTexturePaths = new Set(this.textures.map((t) => t.path).filter((p) => !claimedTexturePaths.has(p)));
  }

  /** All (model, texture) pairs an entity can preview, in declared order. */
  getEntityModels(entity) {
    const seen = new Set();
    const out = [];
    for (const g of entity.geometry) {
      for (const m of g.models) {
        const k = m.path + '::' + m.key;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(m);
      }
    }
    return out;
  }

  getEntityTextures(entity) {
    return entity.textures.filter((t) => t.resolvedPath).map((t) => this.textures.find((tex) => tex.path === t.resolvedPath)).filter(Boolean);
  }

  /**
   * The best (model, texture) pair to preview for one entity. Prefers a
   * short key whose geometry *and* texture both actually resolve in this
   * pack (so e.g. shortKey "animal3" only wins if both its model and its
   * texture are really included) — many packs mix a handful of fully
   * custom short keys in with others that intentionally fall back to
   * vanilla assets, and picking "first resolvable model" and "first
   * resolvable texture" independently can pair up two unrelated entries.
   * Falls back to that independent-first-of-each approach only if no
   * short key resolves both ways.
   */
  getDefaultPairingForEntity(entity) {
    for (const g of entity.geometry) {
      if (g.models.length === 0) continue;
      const t = entity.textures.find((t) => t.shortKey === g.shortKey && t.resolvedPath);
      if (t) return { modelPath: g.models[0].path, modelKey: g.models[0].key, texturePath: t.resolvedPath };
    }

    const model = this.getEntityModels(entity)[0];
    if (!model) return null;
    const anyTexture = entity.textures.find((t) => t.resolvedPath);
    return { modelPath: model.path, modelKey: model.key, texturePath: anyTexture ? anyTexture.resolvedPath : null };
  }

  getEntityIssueCount(entity) {
    return { errors: entity.errors.length, warnings: entity.warnings.length };
  }

  getTotalIssueCounts() {
    let errors = 0;
    let warnings = 0;
    for (const e of this.entities) {
      errors += e.errors.length;
      warnings += e.warnings.length;
    }
    return { errors, warnings };
  }

  /** A default texture to pair with `geoKey`, preferring an entity that declares it. */
  suggestTextureFor(geoKey) {
    for (const entity of this.entities) {
      const g = entity.geometry.find((g) => g.geoKey === geoKey);
      if (!g) continue;
      const t = entity.textures.find((t) => t.resolvedPath) || entity.textures[0];
      if (t && t.resolvedPath) return t.resolvedPath;
    }
    return null;
  }

  /**
   * Pick a sensible starting model+texture pair to show right after a pack
   * loads. Prefers a pairing backed by an actual entity definition (so the
   * very first thing shown is a real, correctly-textured model) over an
   * arbitrary alphabetical first/first, and avoids obviously-wrong texture
   * fallbacks like the pack icon or spawn egg sprite.
   */
  getDefaultPairing() {
    for (const entity of this.entities) {
      const pair = this.getDefaultPairingForEntity(entity);
      if (!pair) continue;
      return { ...pair, entityPath: entity.path };
    }

    const model = this.models.find((m) => m.geo);
    if (!model) return null;

    const suggested = model.key ? this.suggestTextureFor(model.key) : null;
    const decentTexture = this.textures.find((t) => !/pack_icon|spawn_egg/i.test(t.path));
    const texturePath = suggested || (decentTexture ? decentTexture.path : this.textures[0] ? this.textures[0].path : null);

    return { modelPath: model.path, modelKey: model.key, texturePath, entityPath: null };
  }

  getModelJSON(path) {
    const record = this.files.get(path);
    if (!record) return null;
    try {
      return parseLenientJSON(record.text);
    } catch (e) {
      return null;
    }
  }

  /** Replace an existing file's bytes in place (path unchanged). */
  replaceFile(path, arrayBuffer) {
    if (!this.files.has(path)) return false;
    const old = this.files.get(path);
    if (old.blobUrl) URL.revokeObjectURL(old.blobUrl);
    this._addFile(path, arrayBuffer);
    this._reindex();
    return true;
  }

  /** Add a brand new file at `path`. Fails (returns false) if it already exists. */
  addFile(path, arrayBuffer) {
    path = path.replace(/^\/+/, '');
    if (this.files.has(path)) return false;
    this._addFile(path, arrayBuffer);
    this._reindex();
    return true;
  }

  renameFile(oldPath, newPath) {
    newPath = newPath.replace(/^\/+/, '');
    if (!this.files.has(oldPath) || this.files.has(newPath)) return false;
    const record = this.files.get(oldPath);
    this.files.delete(oldPath);
    this.files.set(newPath, record);
    this._reindex();
    return true;
  }

  removeFile(path) {
    const record = this.files.get(path);
    if (!record) return false;
    if (record.blobUrl) URL.revokeObjectURL(record.blobUrl);
    this.files.delete(path);
    this._reindex();
    return true;
  }

  /** Build a JSZip and return it as a Blob, ready to download. */
  async exportZip(rootFolderName) {
    const zip = new JSZip();
    const useRoot = rootFolderName && rootFolderName.trim();

    for (const [path, record] of this.files) {
      const finalPath = useRoot ? `${useRoot}/${stripRoot(path, this.rootName)}` : path;
      zip.file(finalPath, record.bytes);
    }

    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }
}

/** null if the texture file looks fine, else a short human-readable problem description. */
function texFormatIssue(path, record) {
  if (!record) return null;
  const hasPngExt = /\.png$/i.test(path);
  if (!record.isPng) {
    return hasPngExt
      ? 'File has a .png extension but its contents are not a valid PNG image.'
      : 'Not a PNG file — Bedrock textures must be PNG.';
  }
  if (!hasPngExt) {
    return 'File is a valid PNG but does not use a .png extension.';
  }
  return null;
}

function stripRoot(path, rootName) {
  if (rootName && path.startsWith(rootName + '/')) {
    return path.slice(rootName.length + 1);
  }
  return path;
}
