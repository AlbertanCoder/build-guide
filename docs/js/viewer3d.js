/**
 * viewer3d.js - interactive 3D models for the build guide.
 *
 * Implements the agreed spec:
 *  - vendored three.js (see the importmap in index.html), zero CDN calls
 *  - cream backdrop + invisible shadow catcher
 *  - HTML labels via CSS2DRenderer, read from the GLB's own "extras"
 *  - 3/4 isometric default, full orbit, zoom limits, pan
 *  - reset / fullscreen / labels chrome only
 *  - lazy init on scroll, DPR capped at 2
 *  - one short looping clip per model with play / pause / scrub and one chip per numbered action
 *    (the action list travels in the GLB as scene extras "actions": [{id, time, text, focus?, dist?}])
 *  - at most MAX_ALIVE viewers hold a WebGL context; a viewer that leaves the screen releases
 *    everything (geometry, materials, textures, renderer, canvas, labels, clock) and comes back
 *    where it was when it returns
 *
 * Rendering is on-demand: frames are drawn only when the camera moves or a clip is playing on screen.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const CREAM = 0xf7f2e8;

// Bumped when the GLBs are rebuilt, so browsers never serve a stale model.
const MODEL_VERSION = '2026-11-03e';

// Most WebGL contexts alive at once (the current step plus one neighbour). Old laptops freeze with more.
const MAX_ALIVE = 2;
// Phone-width viewers (Shad's iPhone review 2026-11-04: labels overlapped, the close-up covered them): at most this
// many step labels, never touching, no close-up box. Both numbers are ART (picked for a ~360 px wide viewer).
const PHONE_MAX_W = 560;
const PHONE_LABELS_MAX = 3;
const PHONE_FILL = 0.7;         // phone: the camera moves in until the highlighted part is this share of the view (ART),
                                // in height AND width, so the whole group stays in frame (Builder's phone shots 2026-11-04)
const PHONE_OVERVIEW = 0.5;     // phone: no move-in when the highlighted parts span this share of the model or more (ART)
const PHONE_EASE_MS = 450;
// phone: the steps whose highlighted parts are too thin to see when the whole group is framed (long wires across the
// payload), so they keep the close-up box: the one exception (measured by check_viewer: 24 px of outline framed whole)
const PHONE_CLOSEUP_STEPS = new Set(['S6.1']);
const PHONE_OUTLINE_PX = 3.5;   // phone: an ember rim this many CSS px wide around each highlighted part (ART)      // ...in a quick ease, not a slow fly-through (ART)

const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

let liveRenderers = 0;

/**
 * Resolve a model URL.
 *
 * The repo build fetches the .glb next to the page. The standalone single-file
 * build cannot fetch anything from file://, so it inlines every model as a
 * data: URI in window.BUILD_GUIDE_MODEL_DATA and we use that instead.
 */
function resolveModelUri(src) {
  const embedded = window.BUILD_GUIDE_MODEL_DATA;
  if (embedded && embedded[src]) return embedded[src];
  return src + (src.includes('?') ? '&' : '?') + 'v=' + MODEL_VERSION;
}

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
    if (!obj.isMesh || !obj.geometry || obj.userData.kind === 'cone') return;
    obj.geometry.computeBoundingBox();
    box.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
    if (box.isEmpty()) return;
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

function injectStyle() {
  if (document.getElementById('viewer3d-anim-style')) return;
  const s = document.createElement('style');
  s.id = 'viewer3d-anim-style';
  s.textContent = [
    '.viewer3d-anim{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.viewer3d-anim input[type=range]{flex:1 1 140px;min-width:120px;accent-color:#1b5e4f}',
    '.viewer3d-anim .viewer3d-time{font-size:12px;font-variant-numeric:tabular-nums;min-width:7ch}',
    '.viewer3d-chips{display:flex;gap:6px;flex-wrap:wrap;width:100%}',
    '.viewer3d-chips button.is-active{background:#1b5e4f;color:#fff;border-color:#1b5e4f}',
    '.viewer3d-views{display:inline-flex;gap:6px;flex-wrap:wrap}',
    '.viewer3d-tilt{display:inline-flex;align-items:center;gap:6px;font-size:12px}',
    '.viewer3d-tilt input{width:110px;accent-color:#c2571b}',
    '.viewer3d-views button[aria-pressed=true]{background:#c2571b;color:#fff;border-color:#c2571b}',
    '.viewer3d-tag{position:absolute;z-index:3;display:none;max-width:240px;padding:5px 8px;border-radius:6px;background:rgba(20,30,26,.88);color:#fff;font-size:12px;line-height:1.35;pointer-events:none}',
    '.viewer3d-tag b{display:block;font-size:12.5px}.viewer3d-tag span{display:block;opacity:.85}',
    '.viewer3d-actlabels{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}',
    '.viewer3d-actlabel{position:absolute;transform:translate(-50%,-115%);white-space:nowrap;padding:3px 7px;border-radius:5px;background:rgba(20,30,26,.9);color:#fff;font:700 11.5px/1.25 sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.35)}',
    '.viewer3d-actlabels.is-phone .viewer3d-actlabel{font-size:14px;padding:4px 8px}',
    '.viewer3d-inset{position:absolute;z-index:2;display:none;border:4px solid #ff6a1a;box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,0,0,.35);border-radius:4px;color:#ff6a1a;font:700 11px sans-serif;padding:2px 5px;box-sizing:border-box;pointer-events:none}',
  ].join('\n');
  document.head.appendChild(s);
}

/* Remembered viewer choices (labels, focus). Private browsing may block storage, so fail quietly. */
const store = {
  get(k) { try { return window.localStorage.getItem('bg3d-' + k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem('bg3d-' + k, v); } catch (e) { /* not available */ } },
};

const EMBER = 0xff6a1a;          // focus outline / arrow colour: readable against black carbon
const ACC_TEXT = {
  CAD: 'from the maker\'s drawing',
  DATASHEET: 'from the datasheet',
  ESTIMATED: 'estimate: check with the real part',
};

function disposeMaterial(m) {
  if (!m) return;
  for (const key of Object.keys(m)) {
    const v = m[key];
    if (v && v.isTexture) v.dispose();
  }
  m.dispose();
}

class ModelViewer {
  constructor(root) {
    this.root = root;
    this.src = root.dataset.model;
    // Labels start OFF (Shad's choice); the Labels button turns them on and the choice is remembered.
    this.labelsOn = store.get('labels') === '1';
    this.focusOn = store.get('focus') !== '0';
    this.coneOn = { pilot: false, thermal: false };
    this.dimmed = [];
    this.matCache = new Map();
    this.ready = false;
    this.visible = false;
    this.gen = 0;              // bumped on release so a late load callback is ignored
    this.saved = null;         // camera and clip position kept across release / re-init

    this.canvasHost = root.querySelector('.viewer3d-canvas');
    this.labelHost = root.querySelector('.viewer3d-labels');
    this.status = root.querySelector('.viewer3d-status');
    this.hint = root.querySelector('.viewer3d-hint');
    this.labels = [];
    this.pins = [];
    this.tinted = [];
    this.hintText = this.hint ? this.hint.textContent : '';

    root.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this.action(btn.dataset.action));
    });
    if (this.labelHost) this.labelHost.style.display = this.labelsOn ? '' : 'none';
    const lbtn = root.querySelector('[data-action="labels"]');
    if (lbtn) lbtn.setAttribute('aria-pressed', String(this.labelsOn));
  }

  action(name) {
    if (name === 'reset' && this.home) {
      this.controls.maxPolarAngle = Math.PI * 0.495;   // back above the bench after a from-below close-up
      this.applyFocus(null);
      this.camera.position.copy(this.home.position);
      this.controls.target.copy(this.home.target);
      this.controls.update();
      this.clearHighlight();
      this.pins.forEach((pin) => {
        if (pin.element) pin.element.classList.remove('is-active');
      });
      if (this.hint) this.hint.textContent = this.hintText;
      this.render();
    } else if (name === 'labels') {
      this.labelsOn = !this.labelsOn;
      store.set('labels', this.labelsOn ? '1' : '0');
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
    const gen = this.gen;

    const width = this.canvasHost.clientWidth || 640;
    const height = this.canvasHost.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CREAM);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.004, 40);
    this.camera.position.set(0.30, 0.22, 0.34);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    liveRenderers += 1;
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

    const rim = new THREE.DirectionalLight(0xffe9d8, 1.3);
    rim.position.set(-0.2, 0.35, -0.55);
    this.scene.add(rim);
    const back = new THREE.DirectionalLight(0xffffff, 0.8);   // edges on black parts
    back.position.set(0.1, 0.15, -0.7);
    this.scene.add(back);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.15));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;   // on-demand rendering stays honest
    this.controls.enablePan = true;
    this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('change', () => this.render());
    const cnv = this.renderer.domElement;
    cnv.addEventListener('pointerdown', (e) => { this.downAt = [e.clientX, e.clientY]; });
    cnv.addEventListener('pointerup', (e) => {
      const d = this.downAt; this.downAt = null;
      if (d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 6) this.pick(e.clientX, e.clientY);
    });
    /* Full screen and panel resizes change the canvas without resizing the
       window, so watch the canvas itself or the picture stretches and the
       labels stay at their old positions. */
    if (window.ResizeObserver) {
      this.sizeWatch = new ResizeObserver(() => this.resize());
      this.sizeWatch.observe(this.canvasHost);
    }

    if (this.status) this.status.textContent = 'Loading 3D…';
    if (this.onInit) this.onInit(this);

    loader.load(
      resolveModelUri(this.src),
      (gltf) => { if (gen === this.gen) this.onLoaded(gltf); },
      undefined,
      (err) => {
        if (gen !== this.gen) return;
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
    const cones = [];
    this.cones = {};
    this.camPoses = {};
    this.tiltPivot = null;

    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        if (obj.material) obj.material.envMapIntensity = 0.6;
      }
      const data = obj.userData || {};
      if (data.kind === 'part' && data.label) this.addLabel(obj, data);
      if (data.kind === 'hotspot' && data.label) this.addPin(obj, data);
      if (data.kind === 'cone') cones.push(obj);
      if (data.kind === 'campose' && data.cam) this.camPoses[data.cam] = obj;
      if (data.kind === 'tilt') this.tiltPivot = obj;
    });
    this.model = model;
    cones.forEach((c) => { c.visible = false; c.castShadow = false; this.cones[c.userData.cam] = c; });

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

    // 3/4 view from above: the drone reads as a planform, not edge-on. Keep that height angle, but turn
    // around the model to the side that lets it sit closest, so it fills wide (laptop) and tall (phone) frames.
    const base = new THREE.Vector3(0.86, 1.02, 1.12).normalize();
    const elev = Math.asin(base.y);
    const az0 = Math.atan2(base.x, base.z);
    const corners = collectCorners(model);
    let fit = null;
    let dir = base;
    for (let k = 0; k < 16; k += 1) {
      const az = az0 + (k * Math.PI) / 8;
      const d = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
      const f = fitCamera(this.camera, corners, centre.clone(), d);
      // prefer the usual corner unless another side is clearly (8 %) closer
      if (!fit || f.dist < fit.dist * (k === 0 ? 1 : 0.92)) { fit = f; dir = d; }
    }
    fitCamera(this.camera, corners, fit.centre, dir);
    const dist = fit.dist;
    this.camera.near = Math.max(dist / 400, 0.002);
    this.camera.far = dist * 8;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(fit.centre);
    this.controls.minDistance = dist * 0.25;
    this.controls.maxDistance = dist * 3.2;
    this.controls.maxPolarAngle = Math.PI * 0.495;   // never dip under the bench
    this.controls.update();

    this.home = {
      position: this.camera.position.clone(),
      target: centre.clone(),
    };
    if (this.saved && this.saved.position) {
      this.camera.position.copy(this.saved.position);
      this.controls.target.copy(this.saved.target);
      this.controls.update();
    }

    this.ready = true;
    this.initing = false;
    if (this.status) this.status.textContent = '';
    this.root.classList.add('is-ready');
    this.setupAnimation(gltf);
    this.setupViews();
    this.render();
  }

  // -------------------------------------------------------------------------
  // animation: one clip, play / pause / scrub, one chip per numbered action
  // -------------------------------------------------------------------------
  setupAnimation(gltf) {
    const clip = gltf.animations && gltf.animations[0];
    if (!clip) return;
    let actions = (gltf.scene.userData && gltf.scene.userData.actions) || [];
    if (typeof actions === 'string') {
      try { actions = JSON.parse(actions); } catch (e) { actions = []; }
    }
    this.clip = clip;
    this.duration = clip.duration;
    this.actionList = Array.isArray(actions) ? actions.slice().sort((a, b) => a.time - b.time) : [];
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clipAction = this.mixer.clipAction(clip);
    this.clipAction.play();

    injectStyle();
    const bar = document.createElement('div');
    bar.className = 'viewer3d-bar viewer3d-anim';
    bar.innerHTML = '<button type="button" data-anim="play" aria-pressed="false">Play</button>'
      + '<input type="range" min="0" step="0.01" aria-label="Animation time">'
      + '<span class="viewer3d-time"></span><div class="viewer3d-chips"></div>';
    this.playBtn = bar.querySelector('[data-anim="play"]');
    this.scrub = bar.querySelector('input');
    this.timeText = bar.querySelector('.viewer3d-time');
    this.scrub.max = String(this.duration);
    this.playBtn.addEventListener('click', () => (this.playing ? this.pause() : this.play()));
    this.scrub.addEventListener('input', () => { this.pause(); this.seek(Number(this.scrub.value)); });
    const chips = bar.querySelector('.viewer3d-chips');
    this.chips = this.actionList.map((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (i + 1) + '. ' + (a.short || a.id);
      b.title = a.text || a.id;
      b.dataset.actionId = a.id;
      b.addEventListener('click', () => this.jumpTo(i));
      chips.appendChild(b);
      return b;
    });
    const oldBar = this.root.querySelector('.viewer3d-bar:not(.viewer3d-anim)');
    this.root.insertBefore(bar, oldBar || null);
    this.animBar = bar;

    const start = this.saved ? this.saved.time : (reducedMotion() ? this.duration : 0);
    this.seek(Math.min(start, this.duration));
    if (this.saved ? !this.saved.paused : !reducedMotion()) this.play();
  }

  play() {
    if (!this.mixer) return;
    // phone: parts move while the clip plays (Step 1 lays out its piles), so a framing made for one moment crops the
    // next; playing goes back to the view the viewer had before any phone move-in (Builder's real-page shot, f0c6a9c)
    if (this.phonePrePose) { this.easeCamera(this.phonePrePose.target, this.phonePrePose.position, PHONE_EASE_MS); this.phonePrePose = null; }
    this.playing = true;
    this.playBtn.textContent = 'Pause';
    this.playBtn.setAttribute('aria-pressed', 'true');
    this.kick();
  }

  pause() {
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.playBtn) {
      this.playBtn.textContent = 'Play';
      this.playBtn.setAttribute('aria-pressed', 'false');
    }
  }

  /* Start the frame loop only if the clip is playing, the viewer is on screen and the tab is shown. */
  kick() {
    if (!this.playing || !this.ready || this.raf || !this.visible || document.hidden) return;
    let last = performance.now();
    const step = (now) => {
      this.raf = 0;
      if (!this.playing || !this.ready || !this.visible || document.hidden) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      this.mixer.update(dt);
      this.syncUi();
      this.render();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  seek(t) {
    if (!this.mixer) return;
    // a looping clip set to exactly its length wraps to 0 (the unassembled pose), so stop just short of it
    this.mixer.setTime(Math.max(0, Math.min(t, this.duration - 0.001)));
    this.syncUi();
    this.render();
  }

  currentTime() {
    return this.clipAction ? this.clipAction.time : 0;
  }

  syncUi() {
    const t = this.currentTime();
    if (this.scrub) this.scrub.value = String(t);
    if (this.timeText) this.timeText.textContent = t.toFixed(1) + ' / ' + this.duration.toFixed(1) + ' s';
    let active = -1;
    this.actionList.forEach((a, i) => { if (t + 1e-3 >= a.time) active = i; });
    if (active !== this.activeChip) {
      this.activeChip = active;
      this.chips.forEach((c, i) => c.classList.toggle('is-active', i === active));
      if (this.hint && active >= 0) this.hint.textContent = this.actionList[active].text;
      this.applyFocus(active >= 0 ? this.actionList[active] : null);
    }
  }

  jumpTo(i) {
    const a = this.actionList[i];
    if (!a) return;
    this.pause();
    // land just after the action's moment, so its pose is complete
    this.seek(Math.min(a.time + (a.hold || 0.6), this.duration));
    this.controls.maxPolarAngle = Math.PI * 0.495;
    if (a.focus && this.camera) {
      const f = new THREE.Vector3(a.focus[0], a.focus[2], -a.focus[1]);   // build axes -> Y-up
      let dir = this.camera.position.clone().sub(this.controls.target).normalize();
      if (a.view) {   // this moment needs its own angle, e.g. from below for a payload under the frame
        dir = new THREE.Vector3(a.view[0], a.view[2], -a.view[1]).normalize();
        if (dir.y < 0) this.controls.maxPolarAngle = Math.PI * 0.97;
      }
      const d = a.dist || this.camera.position.distanceTo(this.controls.target) * 0.45;
      this.controls.target.copy(f);
      this.camera.position.copy(f).addScaledVector(dir, d);
      this.controls.update();
    }
    this.render();
  }

  // -------------------------------------------------------------------------
  // seeing small parts: tap-to-name, focus (dim + ember outline + arrow), magnifier, camera views
  // -------------------------------------------------------------------------
  partInfo(obj) {
    const d = obj.userData || {};
    const name = d.part || obj.name.replace(/_\d+$/, '').replace(/_/g, ' ');
    let acc = ACC_TEXT[d.acc] || '';
    if (d.planned) acc = 'planned spot: not confirmed' + (acc ? '; ' + acc : '');
    if (d.vis_colour) acc += (acc ? '; ' : '') + 'colour shown for visibility; yours may differ';
    return { name, acc };
  }

  pick(cx, cy) {
    if (!this.ready || !this.model) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObject(this.model, true).filter((h) => h.object.isMesh && h.object.visible
      && h.object.userData.kind !== 'cone' && h.object.scale.x > 0.05);
    this.showTag(hits.length ? this.partInfo(hits[0].object) : null, cx - r.left, cy - r.top);
  }

  showTag(info, x, y) {
    if (!this.tag) {
      this.tag = document.createElement('div');
      this.tag.className = 'viewer3d-tag';
      this.canvasHost.appendChild(this.tag);
    }
    clearTimeout(this.tagTimer);
    if (!info) { this.tag.style.display = 'none'; return; }
    this.tag.replaceChildren();
    const b = document.createElement('b'); b.textContent = info.name; this.tag.appendChild(b);
    if (info.acc) { const s = document.createElement('span'); s.textContent = info.acc; this.tag.appendChild(s); }
    this.tag.style.left = Math.round(x + 10) + 'px';
    this.tag.style.top = Math.round(y + 10) + 'px';
    this.tag.style.display = 'block';
    this.lastTag = info;
    this.tagTimer = setTimeout(() => { if (this.tag) this.tag.style.display = 'none'; }, 5000);
  }

  setupViews() {
    const names = { pilot: 'Flying camera view', thermal: 'Thermal camera view' };
    const keys = Object.keys(this.cones || {}).filter((k) => names[k]);
    const bar = this.animBar || this.root.querySelector('.viewer3d-bar');
    if (!bar || (!keys.length && !this.animBar)) return;
    const holder = document.createElement('span');
    holder.className = 'viewer3d-views';
    if (this.animBar) {
      const fbtn = document.createElement('button');
      fbtn.type = 'button'; fbtn.dataset.view = 'focus'; fbtn.textContent = 'Focus';
      fbtn.setAttribute('aria-pressed', String(this.focusOn));
      fbtn.title = 'Dim everything else and outline the parts this step uses';
      fbtn.addEventListener('click', () => {
        this.focusOn = !this.focusOn; store.set('focus', this.focusOn ? '1' : '0');
        fbtn.setAttribute('aria-pressed', String(this.focusOn));
        this.applyFocus(this.activeChip >= 0 ? this.actionList[this.activeChip] : null);
      });
      holder.appendChild(fbtn);
    }
    keys.forEach((k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.view = k; b.textContent = names[k];
      b.setAttribute('aria-pressed', String(!!this.coneOn[k]));
      b.title = k === 'pilot' ? 'What the flying camera sees (you fly by this picture)'
        : 'What the thermal camera sees (it finds heat; it points straight down)';
      b.addEventListener('click', () => this.toggleView(k));
      holder.appendChild(b);
    });
    Object.keys(this.cones).forEach((c) => { this.cones[c].visible = !!this.coneOn[c]; });
    if (this.tiltPivot) {
      const d = this.tiltPivot.userData;
      const q0 = this.tiltPivot.quaternion.clone();
      const lab = document.createElement('label');
      lab.className = 'viewer3d-tilt';
      lab.title = d.why || '';
      const span = document.createElement('span');
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = String(d.min); inp.max = String(d.max); inp.step = String(d.step || 5);
      inp.value = String(this.savedTilt != null ? this.savedTilt : d.default);
      inp.setAttribute('aria-label', 'Flying camera tilt in degrees');
      const apply = () => {
        const deg = Number(inp.value);
        this.tiltDeg = deg;
        span.textContent = 'Flying camera tilt ' + deg + '\u00b0' + (deg === d.default ? ' (start here)' : '');
        // up-tilt about the camera's side axis: build +Y is three -Z, so +delta about three +Z
        const dq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ((deg - d.default) * Math.PI) / 180);
        this.tiltPivot.quaternion.copy(dq.multiply(q0));
        this.render();
      };
      inp.addEventListener('input', apply);
      lab.append(span, inp);
      holder.appendChild(lab);
      this.tiltInput = inp;
      apply();
    }
    bar.insertBefore(holder, bar.querySelector('.viewer3d-chips') || null);
    this.viewHolder = holder;
  }

  toggleView(k) {
    this.coneOn[k] = !this.coneOn[k];
    if (this.coneOn[k]) Object.keys(this.coneOn).forEach((o) => { if (o !== k) this.coneOn[o] = false; });
    if (this.viewHolder) {
      this.viewHolder.querySelectorAll('[data-view]').forEach((x) => {
        if (x.dataset.view !== 'focus') x.setAttribute('aria-pressed', String(!!this.coneOn[x.dataset.view]));
      });
    }
    Object.keys(this.cones || {}).forEach((c) => { this.cones[c].visible = !!this.coneOn[c]; });
    this.render();
  }

  material(kind, orig) {
    const key = kind + ':' + orig.uuid;
    let m = this.matCache.get(key);
    if (!m) {
      m = orig.clone();
      if (kind === 'keep') {
        // a highlighted part whose colour is the message (standoff lengths, the cut-away): own colour, light ember glow
        m.emissive = new THREE.Color(EMBER); m.emissiveIntensity = 0.06;
        if (m.transparent) { m.opacity = 1; m.transparent = false; m.depthWrite = true; }
      } else if (kind === 'dim') {
        // the other parts: darker slate and mostly solid, so shapes still read on the cream bench (fresh-eyes review
        // 2026-11-04: at 16 % they turned pale see-through grey and merged with the background)
        if (m.color) m.color = m.color.clone().lerp(new THREE.Color(0x4a535c), 0.55);
        if (m.emissive) m.emissive = new THREE.Color(0x000000);
        m.transparent = true; m.opacity = 0.62; m.depthWrite = false;
      }
      else {
        // the parts this step uses: ember glow, tinted toward ember, and solid enough to see even when
        // the part is pale (paper) or see-through (props, 'planned' payload)
        m.emissive = new THREE.Color(EMBER); m.emissiveIntensity = 0.75;
        if (m.color) {
          const hsl = {}; m.color.getHSL(hsl);
          m.color = m.color.clone().lerp(new THREE.Color(EMBER), hsl.l > 0.75 ? 0.9 : 0.65);   // near-white parts need more
          if (hsl.l > 0.75) { m.emissiveIntensity = 0.1; m.color.multiplyScalar(0.5); }   // strong light washes pale parts to peach
        }
        if (m.transparent) { m.opacity = 1; m.transparent = false; m.depthWrite = true; }
      }
      this.matCache.set(key, m);
    }
    return m;
  }

  involvedFor(a) {
    const pre = (a && a.shows) || [];
    if (!pre.length || !this.model) return [];
    const out = [];
    this.model.traverse((o) => { if (o.isMesh && pre.some((p) => o.name.startsWith(p))) out.push(o); });
    return out;
  }

  applyFocus(a) {
    if (!this.model) return;
    this.clearHighlight();
    for (const o of this.dimmed) o.material = o.userData._orig;
    this.dimmed = [];
    if (this.arrow) { this.scene.remove(this.arrow); this.arrow.dispose?.(); this.arrow = null; }
    this.clearOutlines();
    this.focusParts = this.focusOn && a ? this.involvedFor(a) : [];
    this.actionLabelsFor(a);
    if (this.focusParts.length) {
      const inv = new Set(this.focusParts);
      this.model.traverse((o) => {
        if (!o.isMesh || o.userData.kind === 'cone') return;
        if (!o.userData._orig) o.userData._orig = o.material;
        o.material = this.material(inv.has(o) ? (o.userData.keep_colour ? 'keep' : 'glow') : 'dim', o.userData._orig);
        this.dimmed.push(o);
      });
      this.arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 0.03, EMBER, 0.012, 0.008);
      this.scene.add(this.arrow);
      if (this.isPhone()) this.addOutlines(this.focusParts.filter((o) => !o.userData.keep_colour));
    }
    this.render();
    Promise.resolve().then(() => this.phoneMoveIn());          // after jumpTo's own camera move (same click)
  }

  /* Phone width: thin parts (prop blades, wires) are hard to see on a small screen, so each highlighted part gets an
     ember rim PHONE_OUTLINE_PX CSS px wide: its own geometry, back faces, moved outward on screen (constant width). */
  addOutlines(parts) {
    if (!this.outlineMat) {
      this.outlineU = { uOutlinePx: { value: PHONE_OUTLINE_PX }, uViewport: { value: new THREE.Vector2(640, 420) } };
      const m = new THREE.MeshBasicMaterial({ color: EMBER, side: THREE.BackSide, toneMapped: false });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, this.outlineU);
        sh.vertexShader = 'uniform float uOutlinePx;\nuniform vec2 uViewport;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
	{
		vec4 nc = projectionMatrix * modelViewMatrix * vec4( transformed + normalize( normal ) * 0.001, 1.0 );
		vec2 d = nc.xy / nc.w - gl_Position.xy / gl_Position.w;
		float l = length( d );
		if ( l > 1e-7 ) gl_Position.xy += ( d / l ) * uOutlinePx * 2.0 / uViewport * gl_Position.w;
	}`);
      };
      m.customProgramCacheKey = () => 'v3d-outline';
      this.outlineMat = m;
    }
    this.outlines = this.outlines || [];
    for (const o of parts) {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.normal) continue;
      const rim = new THREE.Mesh(o.geometry, this.outlineMat);
      rim.raycast = () => {};                                 // never picked by tap-to-name
      rim.renderOrder = -1;
      o.add(rim);
      this.outlines.push(rim);
    }
  }

  clearOutlines() {
    for (const r of this.outlines || []) if (r.parent) r.parent.remove(r);
    this.outlines = [];
  }

  /* Phone width: one picture, nothing covering anything (Shad's iPhone review 2026-11-04). When the highlighted part is
     small in the view, the main camera eases in until it fills PHONE_FILL of the view height, from the same side. */
  phoneMoveIn() {
    this.phoneNeedsCloseup = false;
    if (!this.ready || !this.camera || !this.isPhone() || this.root.dataset.closeup === 'on') return;
    if (this.playing) return;                                    // only when paused (a chip tap): parts move while playing
    if (!this.focusParts || !this.focusParts.length) return;
    const box = this.focusBox();
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 1e-3);
    // an overview step (Step 1's five piles, all four props): the highlighted parts span half the model or more, so
    // the whole view stays (ART threshold)
    const all = new THREE.Box3().setFromObject(this.model);
    const overview = !all.isEmpty() && size >= PHONE_OVERVIEW * all.getSize(new THREE.Vector3()).length();
    // the narrower of the view's height and width decides, so the group fits both ways
    const half = Math.tan((this.camera.fov * Math.PI) / 360) * Math.min(1, this.camera.aspect || 1);
    const cur = Math.max(this.camera.position.distanceTo(c), 1e-4);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    // overview steps only pull back as far as the whole group needs (the phone's narrow frame cut them off);
    // other steps move in to PHONE_FILL, but never so far that the group leaves the frame
    let d = overview ? cur : Math.min(cur, Math.max(size / (2 * PHONE_FILL * half), this.camera.near * 4));
    // perspective makes the near side of the group bigger than its size says: from the pose the camera will end in,
    // back off until all eight corners of the group sit inside 92 % of the frame (Builder's phone shot, 656be08)
    const probe = this.camera.clone(), corners = [];
    for (let k = 0; k < 8; k++) corners.push(new THREE.Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z));
    const fits = () => {
      probe.position.copy(c).addScaledVector(dir, d); probe.lookAt(c); probe.updateMatrixWorld(true);
      return corners.every((q) => { const v = q.clone().project(probe); return v.z < 1 && Math.abs(v.x) <= 0.92 && Math.abs(v.y) <= 0.92; });
    };
    for (let k = 0; k < 30 && !fits(); k++) d *= 1.12;
    const act = this.activeChip >= 0 ? this.actionList[this.activeChip] : null;
    this.phoneNeedsCloseup = !!(act && PHONE_CLOSEUP_STEPS.has(act.id));   // the named exception keeps its close-up box
    if (Math.abs(d - cur) < 0.02 * cur && c.distanceTo(this.controls.target) < 0.02 * cur) return;   // already right
    if (!this.phonePrePose) this.phonePrePose = { target: this.controls.target.clone(), position: this.camera.position.clone() };
    this.easeCamera(c, c.clone().addScaledVector(dir, d), PHONE_EASE_MS);
  }

  /* Move the orbit target and camera together, smoothly (ease in-out); instant with reduced motion. */
  easeCamera(t1, p1, ms) {
    if (this.easeRaf) { cancelAnimationFrame(this.easeRaf); this.easeRaf = 0; }
    const t0 = this.controls.target.clone(), p0 = this.camera.position.clone();
    const apply = (e) => {
      this.controls.target.lerpVectors(t0, t1, e);
      this.camera.position.lerpVectors(p0, p1, e);
      this.controls.update();
      if (!this.playing) this.render();
    };
    if (reducedMotion() || !(ms > 0)) { apply(1); this.camEaseDone = Promise.resolve(); return; }
    this.camEaseDone = new Promise((res) => {
      const start = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        apply(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
        if (k < 1 && this.ready) this.easeRaf = requestAnimationFrame(step);
        else { this.easeRaf = 0; res(); }
      };
      this.easeRaf = requestAnimationFrame(step);
    });
  }

  focusBox() {
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    this.model.updateMatrixWorld(true);
    for (const o of this.focusParts) {
      if (o.scale.x < 0.05) continue;
      o.geometry.computeBoundingBox();
      tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      box.union(tmp);
    }
    return box;
  }

  /* The magnifier: a second camera drawn into a corner of the SAME canvas (scissor), never a second WebGL context. */
  insetCamera() {
    const pose = Object.keys(this.coneOn).find((k) => this.coneOn[k] && this.camPoses && this.camPoses[k]);
    if (pose) {
      const p = this.camPoses[pose];
      const d = p.userData;
      const cam = this.viewCam || (this.viewCam = new THREE.PerspectiveCamera(50, 1.5, 0.005, 20));
      cam.fov = d.vfov;
      cam.aspect = Math.tan((d.hfov * Math.PI) / 360) / Math.tan((d.vfov * Math.PI) / 360);
      cam.updateProjectionMatrix();
      p.getWorldPosition(cam.position);
      const dir = new THREE.Vector3(d.dir[0], d.dir[2], -d.dir[1])
        .applyQuaternion(p.getWorldQuaternion(new THREE.Quaternion()));
      cam.up.set(0, 1, 0);
      if (Math.abs(dir.clone().normalize().y) > 0.98) cam.up.set(1, 0, 0);   // looking straight down
      cam.lookAt(cam.position.clone().add(dir));
      return { cam, title: pose === 'pilot' ? 'Flying camera sees' : 'Thermal camera sees (heat finder)' };
    }
    this.insetZoom = null; this.focusFill = null;
    if (!this.focusParts || !this.focusParts.length) return null;
    const box = this.focusBox();
    if (box.isEmpty()) return null;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    if (this.arrow) {
      const len = Math.max(size * 0.9, 0.02);
      this.arrow.position.copy(c).add(new THREE.Vector3(0, len + size * 0.5, 0));
      this.arrow.setLength(len, Math.min(len * 0.4, 0.014), Math.min(len * 0.25, 0.009));
    }
    // On a phone-width viewer the close-up box covered the labels (Shad, iPhone, 2026-11-04): none there (the main camera
    // moves in on the part instead, phoneMoveIn), unless the page turns it on with data-closeup="on" ("More 3D options").
    if (this.isPhone() && this.root.dataset.closeup !== 'on' && !this.phoneNeedsCloseup) return null;
    if (this.isPhone() && this.phoneNeedsCloseup) {
      // the named phone exception: the main view shows the whole group; the box zooms on the first part the step names
      const act = this.activeChip >= 0 ? this.actionList[this.activeChip] : null, first = act && (act.shows || [])[0];
      const o = this.focusParts.find((q) => first && q.name.startsWith(first)) || this.focusParts[0];
      const pb = new THREE.Box3();
      if (o && o.geometry) { o.geometry.computeBoundingBox(); pb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
      if (!pb.isEmpty()) {
        const pc = pb.getCenter(new THREE.Vector3()), ps = Math.max(pb.getSize(new THREE.Vector3()).length(), 0.01);
        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
        const cam = this.magCam || (this.magCam = new THREE.PerspectiveCamera(32, 4 / 3, 0.002, 20));
        cam.aspect = 4 / 3; cam.updateProjectionMatrix();
        cam.position.copy(pc).addScaledVector(dir, Math.max(ps * 1.6, 0.03)); cam.lookAt(pc);
        this.insetZoom = null; this.focusFill = null;
        return { cam, title: 'Close-up' };
      }
    }
    // A close-up only when it is a TRUE zoom: the part at least 2x bigger than in the main view (fresh-eyes review
    // 2026-11-04: for a big group like the four arms the old box showed the same view, only smaller). Otherwise none:
    // the part is already large in the main view.
    const H = this.canvasHost.clientHeight || 420;
    const W = this.canvasHost.clientWidth || 640;
    const insetH = Math.round(Math.min(W * 0.38, 300)) / (4 / 3);
    const half = (deg) => Math.tan((deg * Math.PI) / 360);
    const mainDist = Math.max(this.camera.position.distanceTo(c), 1e-4);
    this.focusFill = size / (2 * mainDist * half(this.camera.fov));     // part's size / main view height
    const insetDist = Math.max(size * 2.0, 0.04);
    const zoom = (insetH / H) * (mainDist * half(this.camera.fov)) / (insetDist * half(32));
    this.insetZoom = zoom;
    if (zoom < 2) return null;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const cam = this.magCam || (this.magCam = new THREE.PerspectiveCamera(32, 4 / 3, 0.002, 20));
    cam.aspect = 4 / 3; cam.updateProjectionMatrix();
    cam.position.copy(c).addScaledVector(dir, insetDist);
    cam.lookAt(c);
    return { cam, title: 'Close-up' };
  }

  // -------------------------------------------------------------------------
  // release: give the WebGL context back; re-init restores where it was
  // -------------------------------------------------------------------------
  release() {
    if (!this.ready && !this.initing) return;
    if (document.fullscreenElement === this.root) return;
    if (this.ready && this.camera) {
      this.savedTilt = this.tiltDeg;
      this.saved = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
        time: this.currentTime(),
        paused: !this.playing,
      };
    }
    this.gen += 1;
    if (this.easeRaf) { cancelAnimationFrame(this.easeRaf); this.easeRaf = 0; }
    this.pause();
    this.clearHighlight();
    this.clearOutlines();
    if (this.outlineMat) { this.outlineMat.dispose(); this.outlineMat = null; this.outlineU = null; }
    for (const o of this.dimmed) o.material = o.userData._orig;
    this.dimmed = [];
    this.focusParts = [];
    for (const m of this.matCache.values()) m.dispose();
    this.matCache.clear();
    if (this.tag) { this.tag.remove(); this.tag = null; }
    if (this.insetBox) { this.insetBox.remove(); this.insetBox = null; }
    if (this.actHost) { this.actHost.remove(); this.actHost = null; }
    this.actLabels = []; this.actName = null;
    if (this.viewHolder) { this.viewHolder.remove(); this.viewHolder = null; }
    this.arrow = this.magCam = this.viewCam = null;
    if (this.sizeWatch) { this.sizeWatch.disconnect(); this.sizeWatch = null; }
    if (this.controls) this.controls.dispose();
    if (this.mixer) {
      this.mixer.stopAllAction();
      if (this.model) this.mixer.uncacheRoot(this.model);
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) [].concat(obj.material).forEach(disposeMaterial);
        if (obj.isLight && obj.shadow && obj.shadow.map) obj.shadow.dispose();
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      liveRenderers -= 1;
    }
    if (this.labelHost) this.labelHost.replaceChildren();
    if (this.animBar) this.animBar.remove();
    this.animBar = this.playBtn = this.scrub = this.timeText = null;
    this.chips = [];
    this.labels = [];
    this.pins = [];
    this.scene = this.camera = this.renderer = this.labelRenderer = this.controls = null;
    this.model = this.mixer = this.clip = this.clipAction = null;
    this.activeChip = undefined;
    this.ready = false;
    this.initing = false;
    this.root.classList.remove('is-ready');
    if (this.status) this.status.textContent = 'Loading 3D…';
    if (this.onRelease) this.onRelease(this);
  }

  meshBounds(model) {
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    model.updateWorldMatrix(true, true);
    model.traverse((obj) => {
      if (obj.isMesh && obj.geometry && obj.userData.kind !== 'cone') {
        obj.geometry.computeBoundingBox();
        tmp.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
        if (!tmp.isEmpty()) box.union(tmp);
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

  addPin(obj, data) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'viewer3d-pin';
    el.textContent = data.stage || '?';
    el.title = data.label;
    el.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.activatePin(el, data);
    });
    const css2d = new CSS2DObject(el);
    css2d.position.copy(obj.position);
    obj.parent.add(css2d);
    this.pins.push(css2d);
  }

  activatePin(el, data) {
    if (this.dimmed.length) { for (const o of this.dimmed) o.material = o.userData._orig; this.dimmed = []; this.focusParts = []; }
    this.pins.forEach((pin) => {
      if (pin.element) pin.element.classList.remove('is-active');
    });
    el.classList.add('is-active');

    if (this.hint) {
      this.hint.textContent = data.detail
        ? `${data.label} — ${data.detail}`
        : data.label;
    }
    this.highlight(data.targets);
  }

  highlight(targets) {
    this.clearHighlight();
    if (!targets || !this.model) {
      this.render();
      return;
    }
    const prefixes = String(targets).split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    this.model.traverse((obj) => {
      if (!obj.isMesh || !obj.name) return;
      if (!prefixes.some((p) => obj.name.startsWith(p))) return;
      const original = obj.material;
      const tinted = original.clone();
      tinted.emissive = new THREE.Color(0xc2571b);
      tinted.emissiveIntensity = 0.65;
      obj.material = tinted;
      this.tinted.push([obj, original]);
    });
    this.render();
  }

  clearHighlight() {
    for (const [obj, original] of this.tinted) {
      if (obj.material && obj.material !== original) obj.material.dispose();
      obj.material = original;
    }
    this.tinted = [];
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
    const r = this.renderer;
    const inset = this.insetCamera();
    if (this.outlineU) this.outlineU.uViewport.value.set(this.canvasHost.clientWidth || 640, this.canvasHost.clientHeight || 420);
    if (this.arrow) this.arrow.visible = !!(inset || (this.focusParts && this.focusParts.length));
    const W = this.canvasHost.clientWidth || 640;
    const H = this.canvasHost.clientHeight || 420;
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    r.render(this.scene, this.camera);
    if (inset) {
      const w = Math.round(Math.min(W * 0.38, 300));
      const h = Math.round(w / inset.cam.aspect);
      const x = W - w - 8;
      const y = 8;
      r.setScissorTest(true);
      r.setScissor(x, y, w, h);
      r.setViewport(x, y, w, h);
      r.render(this.scene, inset.cam);
      r.setScissorTest(false);
      r.setViewport(0, 0, W, H);
      if (!this.insetBox) {
        this.insetBox = document.createElement('div');
        this.insetBox.className = 'viewer3d-inset';
        this.canvasHost.appendChild(this.insetBox);
      }
      Object.assign(this.insetBox.style, { display: 'block', right: '8px', bottom: '8px', width: w + 'px', height: h + 'px' });
      this.insetBox.textContent = inset.title;
      this.insetShown = inset.title;
    } else {
      this.insetShown = null;
      if (this.insetBox) this.insetBox.style.display = 'none';
    }
    if (this.labelsOn) this.labelRenderer.render(this.scene, this.camera);
    this.drawActionLabels();
  }

  /* Labels start OFF (Shad's choice), but each action names what it is about (fresh-eyes review 2026-11-04: "nothing
     is named in frame"): the labels the action lists (a.labels, matched by the start of their text), or, if it lists
     none, the tap-to-name of the part it highlights. Drawn in their own layer; the full label set stays off. */
  actionLabelsFor(a) {
    this.actLabels = []; this.actName = null; this.actObj = null;
    if (!a) return;
    const want = (a.labels || []).map((t) => String(t).toUpperCase());
    if (want.length) {
      this.actLabels = this.labels.filter((l) => want.some((w) => l.element.textContent.toUpperCase().startsWith(w)));
    } else if (this.focusParts && this.focusParts.length) {
      const first = (a.shows || [])[0];
      const o = this.focusParts.find((p) => first && p.name.startsWith(first)) || this.focusParts[0];
      this.actName = this.partInfo(o).name;
      this.actObj = o;
    }
  }

  drawActionLabels() {
    const items = [];
    if (!this.labelsOn && this.camera) {
      for (const l of this.actLabels || []) items.push({ text: l.element.textContent, pos: l.getWorldPosition(new THREE.Vector3()) });
      if (this.actName && this.actObj && this.actObj.geometry) {
        // on the part it names (not the middle of the whole group, which can be off screen), kept inside the frame
        this.model.updateMatrixWorld(true);
        this.actObj.geometry.computeBoundingBox();
        const b = this.actObj.geometry.boundingBox.clone().applyMatrix4(this.actObj.matrixWorld);
        if (!b.isEmpty()) { const c = b.getCenter(new THREE.Vector3()); c.y = b.max.y; items.push({ text: this.actName, pos: c, keep: true }); }
      }
    }
    if (!items.length && !this.actHost) { this.actShown = []; return; }
    if (!this.actHost) {
      this.actHost = document.createElement('div');
      this.actHost.className = 'viewer3d-actlabels';
      this.canvasHost.appendChild(this.actHost);
    }
    const W = this.canvasHost.clientWidth || 640;
    const H = this.canvasHost.clientHeight || 420;
    const phone = this.isPhone();
    this.actHost.classList.toggle('is-phone', phone);
    this.actHost.replaceChildren();
    this.actShown = [];
    const host = this.actHost.getBoundingClientRect(), taken = [];
    if (phone && this.insetShown === 'Close-up') {               // labels never touch the close-up box
      const w = Math.round(Math.min(W * 0.38, 300)), h = Math.round(w / (4 / 3));
      taken.push({ l: W - w - 8, t: H - h - 8, r: W - 8, b: H - 8 });
      this.insetRect = taken[0];
    } else this.insetRect = null;
    for (const it of items) {
      if (phone && this.actShown.length >= PHONE_LABELS_MAX) break;
      const v = it.pos.clone().project(this.camera);
      if (v.z < -1 || v.z > 1) continue;
      if (it.keep) { v.x = Math.max(-0.85, Math.min(0.85, v.x)); v.y = Math.max(-0.8, Math.min(0.88, v.y)); }
      else if (Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      const el = document.createElement('span');
      el.className = 'viewer3d-actlabel';
      el.textContent = it.text;
      let x = ((v.x + 1) / 2) * W;
      const y = ((1 - v.y) / 2) * H;
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
      this.actHost.appendChild(el);
      let r = null;
      if (phone) {
        // phone: keep the label inside the frame, and drop it if it would touch one already shown (first listed wins)
        r = el.getBoundingClientRect();
        const shift = Math.max(2 - (r.left - host.left), 0) - Math.max(r.right - host.left - (W - 2), 0);
        if (shift) { x += shift; el.style.left = Math.round(x) + 'px'; r = el.getBoundingClientRect(); }
        const box = { l: r.left - host.left, t: r.top - host.top, r: r.right - host.left, b: r.bottom - host.top };
        if (taken.some((q) => box.l < q.r + 4 && box.r > q.l - 4 && box.t < q.b + 4 && box.b > q.t - 4)) { el.remove(); continue; }
        taken.push(box); r = box;
      }
      this.actShown.push({ text: it.text, x, y, box: r });
    }
  }

  /* Phone width: the viewer's own width, so a narrow column on a big screen counts too (ASSUMPTION: under 560 px). */
  isPhone() { return (this.canvasHost.clientWidth || 640) < PHONE_MAX_W; }
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

let pageViewers = [];
let pageAdd = null;             // set by boot(): adds a viewer made later to the page's limit and scroll release

function boot() {
  const roots = [...document.querySelectorAll('.viewer3d[data-model]')];
  if (!roots.length) return;

  if (!hasWebGL()) {
    roots.forEach((root) => root.classList.add('is-failed'));
    return;
  }

  const viewers = roots.map((root) => new ModelViewer(root));
  pageViewers = viewers;
  const alive = new Set();

  /* Keep at most MAX_ALIVE contexts: release the live viewers furthest from the middle of the screen. */
  const distance = (v) => {
    const r = v.root.getBoundingClientRect();
    return Math.abs((r.top + r.bottom) / 2 - window.innerHeight / 2);
  };
  const enforce = (keep) => {
    if (alive.size <= MAX_ALIVE) return;
    const extra = [...alive].filter((v) => v !== keep).sort((a, b) => distance(b) - distance(a));
    while (alive.size > MAX_ALIVE && extra.length) extra.shift().release();
  };
  viewers.forEach((v) => {
    v.onInit = (me) => { alive.add(me); enforce(me); };
    v.onRelease = (me) => { alive.delete(me); };
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const viewer = viewers[roots.indexOf(entry.target)];
      if (!viewer) return;
      viewer.visible = entry.isIntersecting;
      if (entry.isIntersecting) {
        viewer.init();
        viewer.kick();
      } else {
        viewer.release();
      }
    });
  }, { rootMargin: '250px 0px' });

  roots.forEach((root) => io.observe(root));
  // viewers mounted later (BuildGuideViewer.mount) join the same limit and release-on-scroll
  pageAdd = (root) => {
    const v = new ModelViewer(root);
    roots.push(root); viewers.push(v);
    v.onInit = (me) => { alive.add(me); enforce(me); };
    v.onRelease = (me) => { alive.delete(me); };
    io.observe(root);
    return v;
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) viewers.forEach((v) => v.kick());
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      viewers.forEach((v) => { if (v.visible) v.resize(); });
    }, 160);
  });
}

/* For views made after the page loaded (the Guide Assistant's 3D answers):
   same markup as the guide's own viewers, mounted on demand. */
window.BuildGuideViewer = {
  mount(root) {
    if (!hasWebGL()) { root.classList.add('is-failed'); return null; }
    const viewer = pageAdd ? pageAdd(root) : new ModelViewer(root);
    viewer.visible = true;
    viewer.init();
    return viewer;
  },
  /* The page's viewers, for the test page that proves each action's pose (scripts/build/viewer-test.html). */
  instances() {
    return pageViewers.slice();
  },
  /* Read-only numbers for tests and for measuring load on a slow laptop. */
  stats() {
    return {
      liveRenderers,
      viewers: pageViewers.map((v) => ({
        src: v.src, ready: v.ready, visible: v.visible, playing: !!v.playing,
        clip: v.clip ? v.clip.name : null, duration: v.duration || 0,
        actions: (v.actionList || []).map((a) => a.id), chips: (v.chips || []).length,
      })),
    };
  },
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
