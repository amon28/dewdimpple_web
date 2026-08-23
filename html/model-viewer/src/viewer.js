// src/viewer.js
//
// Three.js scene management: renderer, camera, orbit controls, lighting,
// grid, and swapping in the currently selected model + texture.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildModel } from './bedrockModel.js';

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20232a);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 2000);
    this.camera.position.set(30, 30, 45);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 1;
    this.controls.maxDistance = 800;

    this._buildLights();
    this._buildGrid();
    this._buildAxes();

    this.currentModel = null; // THREE.Group currently in the scene
    this.currentTexture = null; // THREE.Texture
    this.currentMaterial = null;
    this.wireframe = false;

    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas.parentElement);
    this.resize();

    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _buildLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(24, 40, 30);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-30, 10, -20);
    this.scene.add(fill);
  }

  _buildGrid() {
    this.grid = new THREE.GridHelper(64, 16, 0x6c7280, 0x3a3f4b);
    this.scene.add(this.grid);
  }

  _buildAxes() {
    this.axes = new THREE.AxesHelper(16);
    this.axes.visible = false;
    this.scene.add(this.axes);
  }

  setBackground(hex) {
    this.scene.background = new THREE.Color(hex);
  }

  setGridVisible(v) {
    this.grid.visible = v;
  }

  setAxesVisible(v) {
    this.axes.visible = v;
  }

  setWireframe(v) {
    this.wireframe = v;
    if (this.currentMaterial) this.currentMaterial.wireframe = v;
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _animate() {
    requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  clearModel() {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      disposeObject3D(this.currentModel);
      this.currentModel = null;
    }
  }

  disposeTexture() {
    if (this.currentTexture) {
      this.currentTexture.dispose();
      this.currentTexture = null;
    }
    if (this.currentMaterial) {
      this.currentMaterial.dispose();
      this.currentMaterial = null;
    }
  }

  /**
   * Load `geo` (a geometry descriptor from extractGeometries) textured with
   * the image at `textureUrl` (a blob: URL, or null for an untextured grey
   * placeholder material).
   */
  async setModel(geo, textureUrl) {
    this.clearModel();
    this.disposeTexture();

    let material;
    if (textureUrl) {
      const texture = await loadTexture(textureUrl);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.currentTexture = texture;
      material = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.FrontSide,
      });
    } else {
      material = new THREE.MeshLambertMaterial({ color: 0x9aa0ab, side: THREE.FrontSide });
    }
    material.wireframe = this.wireframe;
    this.currentMaterial = material;

    const { root } = buildModel(geo, material);
    this.scene.add(root);
    this.currentModel = root;

    this.frameModel();

    return root;
  }

  /** Re-fit the camera/controls target to the current model's bounds. */
  frameModel() {
    if (!this.currentModel) return;
    const box = new THREE.Box3().setFromObject(this.currentModel);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;

    this.controls.target.copy(center);

    const dist = radius / Math.sin((Math.PI * this.camera.fov) / 360) * 1.15;
    const dir = new THREE.Vector3(0.6, 0.5, 0.9).normalize();
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.near = Math.max(dist / 100, 0.01);
    this.camera.far = dist * 20 + 100;
    this.camera.updateProjectionMatrix();
    this.controls.update();

    this._lastRadius = dist;
  }

  /** Move the camera to a named preset, keeping distance from the target. */
  setCameraPreset(name) {
    const target = this.controls.target.clone();
    const dist = this.camera.position.distanceTo(target) || this._lastRadius || 40;

    const dirs = {
      front: new THREE.Vector3(0, 0.15, 1),
      back: new THREE.Vector3(0, 0.15, -1),
      left: new THREE.Vector3(-1, 0.15, 0),
      right: new THREE.Vector3(1, 0.15, 0),
      top: new THREE.Vector3(0.001, 1, 0.001),
      bottom: new THREE.Vector3(0.001, -1, 0.001),
      iso: new THREE.Vector3(0.6, 0.5, 0.9),
    };

    const dir = (dirs[name] || dirs.iso).clone().normalize();
    this.camera.position.copy(target).addScaledVector(dir, dist);
    this.camera.up.set(0, 1, 0);
    this.controls.update();
  }
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(url, resolve, undefined, reject);
  });
}

function disposeObject3D(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    // materials are shared/owned by the viewer, disposed separately
  });
}
