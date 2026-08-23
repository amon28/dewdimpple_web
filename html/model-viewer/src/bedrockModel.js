// src/bedrockModel.js
//
// Parses Minecraft: Bedrock Edition entity geometry JSON ("*.geo.json") into
// three.js Object3D hierarchies, and provides the UV-unwrap math Bedrock
// uses for its "box UV" cubes.
//
// Supports:
//  - legacy geometry format:  { "format_version": "1.8.0", "geometry.foo": { ... } }
//  - modern geometry format:  { "format_version": "1.12.0",
//                               "minecraft:geometry": [ { "description": {...}, "bones": [...] } ] }
//  - box UV (cube.uv = [u, v]) and per-face UV (cube.uv = {north: {uv, uv_size}, ...})
//  - bone/cube mirroring, inflate, and bone/cube rotation (pivot-based)
//  - bone hierarchy via "parent"

import * as THREE from 'three';

/**
 * Extract every named geometry definition from a parsed model JSON file.
 * Returns an array of { key, texturewidth, textureheight, bones, visible_bounds_width,
 * visible_bounds_height, visible_bounds_offset } — one entry per "geometry.xxx" found.
 */
export function extractGeometries(json) {
  const out = [];

  if (!json || typeof json !== 'object') return out;

  // Modern array format
  if (Array.isArray(json['minecraft:geometry'])) {
    for (const geo of json['minecraft:geometry']) {
      const desc = geo.description || {};
      const key = desc.identifier || 'geometry.unknown';
      out.push({
        key,
        texturewidth: desc.texture_width || 64,
        textureheight: desc.texture_height || 64,
        visible_bounds_width: desc.visible_bounds_width,
        visible_bounds_height: desc.visible_bounds_height,
        visible_bounds_offset: desc.visible_bounds_offset,
        bones: geo.bones || [],
      });
    }
  }

  // Legacy flat format: any top-level key starting with "geometry."
  for (const key of Object.keys(json)) {
    if (key === 'format_version' || key === 'minecraft:geometry') continue;
    if (!key.startsWith('geometry.')) continue;
    const geo = json[key];
    if (!geo || typeof geo !== 'object') continue;
    out.push({
      key,
      texturewidth: geo.texturewidth || geo.texture_width || 64,
      textureheight: geo.textureheight || geo.texture_height || 64,
      visible_bounds_width: geo.visible_bounds_width,
      visible_bounds_height: geo.visible_bounds_height,
      visible_bounds_offset: geo.visible_bounds_offset,
      bones: geo.bones || [],
    });
  }

  return out;
}

/**
 * Apply Bedrock's standard "box UV" unwrap to a BoxGeometry.
 * (u, v) is the top-left of the unwrap region; (w, h, d) are the cube's
 * size on x/y/z. texW/texH are the full texture dimensions in pixels.
 */
function applyBoxUV(geometry, u, v, w, h, d, texW, texH, mirror) {
  const uvs = [];

  const addFace = (u1, v1, u2, v2, flip) => {
    const left = u1 / texW;
    const right = u2 / texW;
    const top = 1 - v1 / texH;
    const bottom = 1 - v2 / texH;

    if (flip) {
      uvs.push(right, top, left, top, right, bottom, left, bottom);
    } else {
      uvs.push(left, top, right, top, left, bottom, right, bottom);
    }
  };

  // Face order matches BoxGeometry's own group order: +x, -x, +y, -y, +z, -z
  // i.e. East, West, Up, Down, South, North (Minecraft: +x=east, +y=up, +z=south)
  let faces = [
    { u1: u + d + w, v1: v + d, u2: u + d + w + d, v2: v + d + h }, // East (+x)
    { u1: u, v1: v + d, u2: u + d, v2: v + d + h }, // West (-x)
    { u1: u + d, v1: v, u2: u + d + w, v2: v + d }, // Up (+y)
    { u1: u + d + w, v1: v, u2: u + d + w + w, v2: v + d }, // Down (-y)
    { u1: u + d, v1: v + d, u2: u + d + w, v2: v + d + h }, // South (+z)
    { u1: u + d + w + d, v1: v + d, u2: u + d + w + d + w, v2: v + d + h }, // North (-z)
  ];

  // Minecraft mirrors by swapping east/west texture assignment
  if (mirror) {
    const tmp = faces[0];
    faces[0] = faces[1];
    faces[1] = tmp;
  }

  faces.forEach((f) => addFace(f.u1, f.v1, f.u2, f.v2, mirror));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}

/**
 * Apply Bedrock's per-face UV format:
 *   uv: { north: {uv:[u,v], uv_size:[w,h]}, east: {...}, south, west, up, down }
 * Any face not present is left untextured (mapped to 0,0 - degenerate, invisible-ish).
 */
function applyPerFaceUV(geometry, uvDef, texW, texH, mirror) {
  const uvs = new Array(6 * 8).fill(0);

  // index -> BoxGeometry group order
  const order = ['east', 'west', 'up', 'down', 'south', 'north'];

  order.forEach((faceName, i) => {
    let name = faceName;
    // Mirroring swaps east/west sampling, same as box UV
    if (mirror) {
      if (faceName === 'east') name = 'west';
      else if (faceName === 'west') name = 'east';
    }

    const f = uvDef[name];
    if (!f || !f.uv) return;

    const [u, v] = f.uv;
    const size = f.uv_size || [0, 0];
    const w = size[0];
    const h = size[1];

    const left = u / texW;
    const right = (u + w) / texW;
    const top = 1 - v / texH;
    const bottom = 1 - (v + h) / texH;

    const base = i * 8;
    if (mirror && (faceName === 'east' || faceName === 'west')) {
      uvs[base + 0] = right; uvs[base + 1] = top;
      uvs[base + 2] = left; uvs[base + 3] = top;
      uvs[base + 4] = right; uvs[base + 5] = bottom;
      uvs[base + 6] = left; uvs[base + 7] = bottom;
    } else {
      uvs[base + 0] = left; uvs[base + 1] = top;
      uvs[base + 2] = right; uvs[base + 3] = top;
      uvs[base + 4] = left; uvs[base + 5] = bottom;
      uvs[base + 6] = right; uvs[base + 7] = bottom;
    }
  });

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}

const DEG = Math.PI / 180;

/**
 * Bedrock bone/cube rotation -> three.js Euler.
 * Bedrock's X and Y rotation axes are inverted relative to three.js's
 * right-handed convention; Z matches. Order is ZYX (Bedrock applies
 * rotations Z, then Y, then X in its own pipeline).
 */
function applyBedrockRotation(object3d, rotation) {
  if (!rotation) return;
  const [rx, ry, rz] = rotation;
  object3d.rotation.order = 'ZYX';
  object3d.rotation.x = -(rx || 0) * DEG;
  object3d.rotation.y = -(ry || 0) * DEG;
  object3d.rotation.z = (rz || 0) * DEG;
}

/**
 * Build a three.js Group for one geometry definition (as produced by
 * extractGeometries) using the given material (single texture atlas,
 * as Bedrock always maps one texture per geometry).
 *
 * Returns { root, boneGroups } where boneGroups maps bone name -> THREE.Group.
 */
export function buildModel(geo, material) {
  const texW = geo.texturewidth || 64;
  const texH = geo.textureheight || 64;

  const root = new THREE.Group();
  root.name = geo.key;

  const boneGroups = new Map();
  const boneData = new Map();

  // First pass: create a THREE.Group per bone, positioned at its pivot.
  for (const bone of geo.bones || []) {
    const group = new THREE.Group();
    group.name = bone.name;
    const pivot = bone.pivot || [0, 0, 0];
    group.userData.pivot = pivot;
    group.userData.bedrockBone = bone;
    boneGroups.set(bone.name, group);
    boneData.set(bone.name, bone);
  }

  // Second pass: build cubes for each bone (cubes sit inside the bone's
  // group, offset from the bone's own pivot).
  for (const bone of geo.bones || []) {
    const group = boneGroups.get(bone.name);
    const pivot = bone.pivot || [0, 0, 0];
    const boneMirror = bone.mirror === true;

    if (bone.reset) {
      // "reset" bones intentionally have no cubes of their own in most packs;
      // nothing special needed since we don't support pose animation.
    }

    for (const cube of bone.cubes || []) {
      const size = cube.size || [0, 0, 0];
      const [w, h, d] = size;
      const origin = cube.origin || [0, 0, 0];
      const inflate = cube.inflate || 0;

      const fix = 0.001; // avoid degenerate (zero-thickness) box geometry
      const boxGeom = new THREE.BoxGeometry(
        Math.max(w, 0) + fix,
        Math.max(h, 0) + fix,
        Math.max(d, 0) + fix,
      );

      const isMirrored = cube.mirror === true || (cube.mirror === undefined && boneMirror);

      if (cube.uv) {
        if (Array.isArray(cube.uv)) {
          applyBoxUV(boxGeom, cube.uv[0], cube.uv[1], w, h, d, texW, texH, isMirrored);
        } else if (typeof cube.uv === 'object') {
          applyPerFaceUV(boxGeom, cube.uv, texW, texH, isMirrored);
        }
      }

      const mesh = new THREE.Mesh(boxGeom, material);

      // cube center, relative to the bone's pivot (since the bone group is
      // itself positioned at the pivot)
      const cx = origin[0] + w / 2 - pivot[0];
      const cy = origin[1] + h / 2 - pivot[1];
      const cz = origin[2] + d / 2 - pivot[2];

      if (inflate) {
        mesh.scale.set(
          w > 0 ? (w + inflate * 2) / w : 1,
          h > 0 ? (h + inflate * 2) / h : 1,
          d > 0 ? (d + inflate * 2) / d : 1,
        );
      }

      if (cube.rotation) {
        // Cube rotates around its own pivot (defaults to cube origin)
        const cubePivot = cube.pivot || origin;
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(
          cubePivot[0] - pivot[0],
          cubePivot[1] - pivot[1],
          cubePivot[2] - pivot[2],
        );
        mesh.position.set(cx - (cubePivot[0] - pivot[0]), cy - (cubePivot[1] - pivot[1]), cz - (cubePivot[2] - pivot[2]));
        applyBedrockRotation(pivotGroup, cube.rotation);
        pivotGroup.add(mesh);
        group.add(pivotGroup);
      } else {
        mesh.position.set(cx, cy, cz);
        group.add(mesh);
      }
    }
  }

  // Third pass: nest bones under their parent (or root), offsetting by the
  // pivot delta, and apply the bone's own rotation.
  for (const bone of geo.bones || []) {
    const group = boneGroups.get(bone.name);
    const pivot = bone.pivot || [0, 0, 0];

    applyBedrockRotation(group, bone.rotation);

    if (bone.parent && boneGroups.has(bone.parent)) {
      const parentBone = boneData.get(bone.parent);
      const parentPivot = (parentBone && parentBone.pivot) || [0, 0, 0];
      group.position.set(
        pivot[0] - parentPivot[0],
        pivot[1] - parentPivot[1],
        pivot[2] - parentPivot[2],
      );
      boneGroups.get(bone.parent).add(group);
    } else {
      group.position.set(pivot[0], pivot[1], pivot[2]);
      root.add(group);
    }
  }

  return { root, boneGroups };
}

/**
 * Compute the world-space bounding box of an Object3D (after it has been
 * added to a scene / had its matrix world updated).
 */
export function computeBounds(object3d) {
  const box = new THREE.Box3().setFromObject(object3d);
  return box;
}
