/**
 * viewer3d.js - interactive 3D models for the build guide.
 *
 * Implements the agreed spec:
 *  - vendored three.js (see the importmap in index.html), zero CDN calls
 *  - cream backdrop + invisible shadow catcher
 *  - HTML labels via CSS2DRenderer, read from the GLB's own "extras"
 *  - 3/4 isometric default, full orbit, zoom limits, pan
 *  - reset / fullscreen / labels chrome only
 *  - lazy init on scroll, one active renderer, DPR capped at 2
 *
 * Rendering is on-demand: frames are drawn only when the camera moves, so a
 * page with nine viewers costs nothing while the reader scrolls past them.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const CREAM = 0xf7f2e8;

// Bumped when the GLBs are rebuilt, so browsers never serve a stale model.
const MODEL_VERSION = '2026-10-31b';

const loader = new GLTFLoader();

/**
 * World-space corners of every mesh in the model.
 *
 * Fitting against the eight corners of the whole-scene box is far too
 * conservative for a flat model viewed obliquely, so collect each mesh's own
 * box corners instead: a much tighter stand-in for the real silhouette.
 */
function collectCorners(model) {
  const points = [];
  const box = new THREE.Box3();
  model.updateWorldMatrix(true, true);
  model.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    obj.geometry.computeBoundingBox();
    box.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
    for (let i = 0; i < 8; i += 1) {
      points.push(new THREE.Vector3(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      ));
    }
  });
  return points;
}

function fitCamera(camera, points, centre, dir, fill = 0.9) {
  let reach = 0;
  for (const p of points) reach = Math.max(reach, p.distanceTo(centre));

  let dist = reach * 2.4;
  const projected = new THREE.Vector3();

  for (let iter = 0; iter < 16; iter += 1) {
    camera.position.copy(centre).addScaledVector(dir, dist);
    camera.lookAt(centre);
    camera.updateMatrixWorld(true);

    let worst = 0;
    for (const p of points) {
      projected.copy(p).project(camera);
      const edge = Math.max(Math.abs(projected.x), Math.abs(projected.y));
      if (edge > worst) worst = edge;
    }
    if (worst <= 0.001) break;
    if (Math.abs(worst - fill) < 0.006) break;
    dist *= worst / fill;
  }
  return { centre, dist };
}

class ModelViewer {
  constructor(root) {
    this.root = root;
    this.src = root.dataset.model;
    this.labelsOn = true;
    this.ready = false;
    this.visible = false;

    this.canvasHost = root.querySelector('.viewer3d-canvas');
    this.labelHost = root.querySelector('.viewer3d-labels');
    this.status = root.querySelector('.viewer3d-status');
    this.labels = [];

    root.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this.action(btn.dataset.action));
    });
  }

  action(name) {
    if (name === 'reset' && this.home) {
      this.camera.position.copy(this.home.position);
      this.controls.target.copy(this.home.target);
      this.controls.update();
      this.render();
    } else if (name === 'labels') {
      this.labelsOn = !this.labelsOn;
      this.labelHost.style.display = this.labelsOn ? '' : 'none';
      const btn = this.root.querySelector('[data-action="labels"]');
      if (btn) btn.setAttribute('aria-pressed', String(this.labelsOn));
      this.render();
    } else if (name === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen();
      else this.root.requestFullscreen?.();
    }
  }

  init() {
    if (this.ready || this.failed || this.initing) return;
    this.initing = true;

    const width = this.canvasHost.clientWidth || 640;
    const height = this.canvasHost.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CREAM);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.004, 40);
    this.camera.position.set(0.30, 0.22, 0.34);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvasHost.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer({ element: this.labelHost });
    this.labelRenderer.setSize(width, height);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(0.42, 0.62, 0.38);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 3;
    key.shadow.bias = -0.0006;
    const sc = key.shadow.camera;
    sc.near = 0.05;
    sc.far = 2.5;
    sc.left = -0.2; sc.right = 0.2; sc.top = 0.2; sc.bottom = -0.2;
    this.scene.add(key);
    this.keyLight = key;

    const fill = new THREE.DirectionalLight(0xdfece6, 0.75);
    fill.position.set(-0.5, 0.3, 0.25);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffe9d8, 0.5);
    rim.position.set(-0.2, 0.35, -0.55);
    this.scene.add(rim);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.15));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;   // on-demand rendering stays honest
    this.controls.enablePan = true;
    this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('change', () => this.render());

    if (this.status) this.status.textContent = 'Loading 3D…';

    loader.load(
      this.src + (this.src.includes('?') ? '&' : '?') + 'v=' + MODEL_VERSION,
      (gltf) => this.onLoaded(gltf),
      undefined,
      (err) => {
        this.failed = true;
        console.warn('3D model failed to load:', this.src, err);
        if (this.status) this.status.textContent = '3D model unavailable';
        this.root.classList.add('is-failed');
      }
    );
  }

  onLoaded(gltf) {
    const model = gltf.scene;
    this.scene.add(model);

    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        if (obj.material) obj.material.envMapIntensity = 0.6;
      }
      const data = obj.userData || {};
      if (data.kind === 'part' && data.label) this.addLabel(obj, data);
    });

    const box = this.meshBounds(model);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // shadow catcher: invisible plane just under the lowest mesh
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size.length() * 4, size.length() * 4),
      new THREE.ShadowMaterial({ color: 0x2b3a33, opacity: 0.16 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = box.min.y - size.y * 0.002;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // fit the shadow camera to the model
    const r = Math.max(size.x, size.z) * 0.85;
    const cam = this.keyLight.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.updateProjectionMatrix();
    this.keyLight.position.copy(centre)
      .add(new THREE.Vector3(0.35, 0.55, 0.32).multiplyScalar(size.length()));

    // 3/4 view from above: the drone reads as a planform, not edge-on
    const dir = new THREE.Vector3(0.86, 1.02, 1.12).normalize();
    const corners = collectCorners(model);
    const fit = fitCamera(this.camera, corners, centre, dir);
    const dist = fit.dist;
    this.camera.near = Math.max(dist / 400, 0.002);
    this.camera.far = dist * 8;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(fit.centre);
    this.controls.minDistance = dist * 0.45;
    this.controls.maxDistance = dist * 3.2;
    this.controls.maxPolarAngle = Math.PI * 0.495;   // never dip under the bench
    this.controls.update();

    this.home = {
      position: this.camera.position.clone(),
      target: centre.clone(),
    };

    this.ready = true;
    if (this.status) this.status.textContent = '';
    this.root.classList.add('is-ready');
    this.render();
  }

  meshBounds(model) {
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    model.updateWorldMatrix(true, true);
    model.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        obj.geometry.computeBoundingBox();
        tmp.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
        box.union(tmp);
      }
    });
    return box;
  }

  addLabel(obj, data) {
    const el = document.createElement('span');
    el.className = 'viewer3d-label';
    el.textContent = data.label;
    if (data.detail) el.title = data.detail;
    const css2d = new CSS2DObject(el);
    css2d.position.copy(obj.position);
    obj.parent.add(css2d);
    this.labels.push(css2d);
  }

  resize() {
    if (!this.ready) return;
    const w = this.canvasHost.clientWidth;
    const h = this.canvasHost.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.render();
  }

  render() {
    if (!this.ready) return;
    this.renderer.render(this.scene, this.camera);
    if (this.labelsOn) this.labelRenderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext
      && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function boot() {
  const roots = [...document.querySelectorAll('.viewer3d[data-model]')];
  if (!roots.length) return;

  if (!hasWebGL()) {
    roots.forEach((root) => root.classList.add('is-failed'));
    return;
  }

  const viewers = roots.map((root) => new ModelViewer(root));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const viewer = viewers[roots.indexOf(entry.target)];
      if (!viewer) return;
      viewer.visible = entry.isIntersecting;
      if (entry.isIntersecting) viewer.init();
    });
  }, { rootMargin: '250px 0px' });

  roots.forEach((root) => io.observe(root));

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      viewers.forEach((v) => { if (v.visible) v.resize(); });
    }, 160);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
