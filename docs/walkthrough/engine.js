// Walkthrough engine: the shared 3D stage and the parts every lesson reuses
// (meter, probes, leads, plugs, adapter, wall outlet). Simple shapes drawn from
// Shad's photos; not exact sizes. Units: centimetres, y is up, the table is y = 0.
import * as THREE from "three";
import { OrbitControls } from "../vendor/three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";

export { THREE };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const prog = (t, a, b) => ease((t - a) / (b - a));
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
export const M = {
  metal: mat(0xd4d8dc, { metalness: 1, roughness: 0.28 }),
  copper: mat(0xd88a4a, { metalness: 1, roughness: 0.3 }),
  solder: mat(0xc9ccd0, { metalness: 1, roughness: 0.18 }),
  black: mat(0x1b1d20, { roughness: 0.55 }),
  dark: mat(0x2a2d31, { roughness: 0.7 }),
};
export function mesh(geo, m, parent) { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; parent.add(o); return o; }
export const alongX = g => { g.rotateZ(-Math.PI / 2); return g; };    // cylinder/cone axis -> +x (cone point -> +x)
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), c);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, canvas: c };
}
export const qFromDir = d => new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), d.clone().normalize());
export const pose = (p, dir) => ({ p, q: qFromDir(dir) });
export function setPose(o, a, b, k) { o.position.lerpVectors(a.p, b.p, k); o.quaternion.slerpQuaternions(a.q, b.q, k); }
/** Moves o along a list of [time, pose] keys (holds before the first and after the last). */
export function poseTrack(o, t, keys) {
  if (t <= keys[0][0]) { setPose(o, keys[0][1], keys[0][1], 0); return; }
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a] = keys[i], [tb, b] = keys[i + 1];
    if (t <= tb) { setPose(o, a, b, ease((t - ta) / Math.max(1e-6, tb - ta))); return; }
  }
  const last = keys[keys.length - 1][1]; setPose(o, last, last, 0);
}
/** A tube that is rebuilt each frame (wires, cords, leads). */
export function liveTube(parent, color, radius, segs = 60) {
  const m = mat(color, { roughness: 0.5 }); let me = null;
  return pts => {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), segs, radius, 8);
    if (me) { me.geometry.dispose(); me.geometry = geo; } else me = mesh(geo, m, parent);
    return me;
  };
}
export function staticTube(parent, color, radius, pts, segs = 60, m) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), segs, radius, 8), m || mat(color, { roughness: 0.5 }), parent);
}

/* ------------------------------------------------------------------ stage */
function makeEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x6d7278, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setRGB(k, k, k); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(0, 4.9, 0, 6, 6, 3.2); panel(-4.9, 1, 0, 3, 4, 2.2); panel(4.9, 1.5, 2, 3, 3, 1.8); panel(0, 1, -4.9, 5, 3, 1.4); panel(0, 1, 4.9, 5, 3, 1.2);
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.04).texture;
}
export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe4e9);
  scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-10, 40, 25); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  return { renderer, scene, camera, controls, sun };
}
export function disposeTree(o) {
  o.traverse(c => {
    if (c.geometry) c.geometry.dispose();
    const ms = Array.isArray(c.material) ? c.material : c.material ? [c.material] : [];
    for (const m of ms) { if (m.map) m.map.dispose(); if (!Object.values(M).includes(m)) m.dispose(); }
  });
}

/* ------------------------------------------------------------------ bench */
export function makeBench(root, { wall = true } = {}) {
  const table = mesh(new THREE.PlaneGeometry(160, 100), mat(0xc9ccd0, { roughness: 0.85 }), root);
  table.rotation.x = -Math.PI / 2; table.position.set(0, 0, 10);
  if (wall) { const w = mesh(new THREE.PlaneGeometry(160, 60), mat(0xf1efe9, { roughness: 0.95 }), root); w.position.set(0, 30, -20); }
}

/* ------------------------------------------------------------------ multimeter: ZOYI VC921 (from Shad's photos) */
export const DIAL = { offR: -12, acV: 192, dcV: 158, ohm: 128, diode: 102, beep: 78, cap: 52, red: 28, offL: 205 };
export function makeMeter(root, at) {
  const g = new THREE.Group(); g.position.copy(at); root.add(g);
  const MW = 7, ML = 12.5, MT = 2.4;
  mesh(new THREE.BoxGeometry(MW, MT, ML), mat(0x34373b, { roughness: 0.75 }), g).position.y = MT / 2;
  const px = (x, y) => V((x - 350) / 100, MT + 0.011, (y - 625) / 100);
  const DC = { x: 350, y: 800 }, R = 265;
  const face = canvasTex(700, 1250, (c) => {
    c.fillStyle = "#3a3d42"; c.fillRect(0, 0, 700, 1250);
    c.fillStyle = "#c9d0d6"; roundRect(c, 40, 30, 620, 300, 18); c.fill();
    c.fillStyle = "#3b4148"; c.font = "bold 46px Arial"; c.fillText("ZOYI", 80, 92); c.font = "40px Arial"; c.fillText("VC921", 470, 92);
    c.fillStyle = "#1f2225"; roundRect(c, 80, 108, 540, 205, 8); c.fill();
    c.fillStyle = "#fff"; c.fillRect(80, 372, 40, 46); c.fillStyle = "#000"; c.font = "bold 38px Arial"; c.fillText("H", 87, 410);
    c.fillStyle = "#f0f0f0"; c.font = "30px Georgia"; c.fillText("AUTO POWER OFF", 210, 405);
    c.fillStyle = "#d39a4a"; c.font = "26px Georgia"; c.fillText("TRUE RMS", 280, 450); c.fillText("RANGE", 520, 470);
    c.fillStyle = "#e8e8e8"; c.fillText("REL△", 100, 460);
    const lab = { acV: "~V", dcV: "DC", ohm: "Ω", diode: "▶|", beep: "·)))", cap: "∥" };
    for (const [k, deg] of Object.entries(DIAL)) {
      if (k.startsWith("off")) continue;
      const a = deg * Math.PI / 180;
      c.fillStyle = k === "red" ? "#b33" : "#eee"; c.beginPath(); c.arc(DC.x + Math.cos(a) * (R + 10), DC.y - Math.sin(a) * (R + 10), 11, 0, 7); c.fill();
      if (!lab[k]) continue;
      const lx = DC.x + Math.cos(a) * (R + 62), ly = DC.y - Math.sin(a) * (R + 62);
      c.fillStyle = (k === "dcV" || k === "acV" || k === "ohm") ? "#e2a24c" : "#f2f2f2";
      c.font = "bold 40px Arial"; c.textAlign = "center"; c.textBaseline = "middle";
      if (k === "dcV") { c.fillRect(lx - 46, ly - 12, 40, 5); for (let i = 0; i < 3; i++) c.fillRect(lx - 46 + i * 15, ly - 1, 10, 5); c.fillText("V", lx + 12, ly); }
      else c.fillText(lab[k], lx, ly);
      c.textAlign = "start"; c.textBaseline = "alphabetic";
    }
    for (const [k, x] of [["offL", 34], ["offR", 560]]) {
      const a = DIAL[k] * Math.PI / 180, y = DC.y - Math.sin(a) * (R + 40) + 14;
      c.fillStyle = "#f4f4f4"; roundRect(c, x, y - 40, 110, 54, 8); c.fill(); c.fillStyle = "#111"; c.font = "bold 38px Arial"; c.fillText("OFF", x + 16, y);
    }
    c.fillStyle = "#d39a4a"; c.font = "30px Georgia"; c.fillText("AC/DC 600V MAX", 90, 1150);
    c.fillStyle = "#f4f4f4"; roundRect(c, 470, 1100, 190, 90, 10); c.fill();
    c.fillStyle = "#d22"; c.fillRect(490, 1118, 120, 14); c.fillStyle = "#111"; c.fillRect(490, 1155, 120, 14);
    c.fillStyle = "#d22"; c.font = "bold 30px Arial"; c.fillText("+", 625, 1135); c.fillStyle = "#111"; c.fillText("–", 625, 1172);
  });
  const fp = mesh(new THREE.PlaneGeometry(MW, ML), mat(0xffffff, { map: face.tex, roughness: 0.7 }), g);
  fp.rotation.x = -Math.PI / 2; fp.position.y = MT + 0.005; fp.castShadow = false;
  const lcd = canvasTex(540, 205, () => {});
  const lp = mesh(new THREE.PlaneGeometry(5.4, 2.05), new THREE.MeshBasicMaterial({ map: lcd.tex, toneMapped: false }), g);
  lp.rotation.x = -Math.PI / 2; lp.position.copy(px(350, 210.5)); lp.position.y = MT + 0.02; lp.castShadow = false;
  let shown = null;
  /** text: "off" | "<number> <unit>" e.g. "24.0 V", "OL Ω"; mode label "DC" shown for volts */
  function setLcd(text) {
    if (text === shown) return; shown = text;
    const c = lcd.canvas.getContext("2d");
    c.fillStyle = "#c7cfbf"; c.fillRect(0, 0, 540, 205);
    if (text !== "off") {
      const [num, unit = ""] = text.split(" ");
      c.fillStyle = "#1c2118"; c.font = "bold 26px Arial"; c.fillText("AUTO", 120, 36);
      if (/V$/.test(unit)) c.fillText("DC", 22, 92);
      if (/Ω/.test(unit) && beepMode) c.fillText("·)))", 22, 92);
      c.font = "bold 128px 'Courier New', monospace"; c.textAlign = "right"; c.fillText(num, 455, 170);
      c.font = "bold 36px Arial"; c.textAlign = "left"; c.fillText(unit, 465, 170);
    }
    lcd.tex.needsUpdate = true;
  }
  let beepMode = false;
  setLcd("off");
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24), mat(0x2140b8), g).position.copy(px(165, 398)).add(V(0, 0.08, 0));
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24), mat(0xe7d21e), g).position.copy(px(590, 398)).add(V(0, 0.08, 0));
  const dial = new THREE.Group(); dial.position.copy(px(DC.x, DC.y)); g.add(dial);
  mesh(new THREE.CylinderGeometry(2.2, 2.25, 0.45, 48), M.black, dial).position.y = 0.22;
  mesh(new THREE.BoxGeometry(4.2, 0.35, 0.9), mat(0x24272b, { roughness: 0.5 }), dial).position.y = 0.6;
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), mat(0xdddddd), dial).position.set(1.65, 0.79, 0);
  /* Final audit, 11 Nov 2026 (PICS): the white dot rides 0.8 cm above the face, so seen from the side it sat under the
     NEXT mark (it read as "dial on ohms" while the words said DC volts). A white pointer flat on the face, from the
     knob's edge to the mark, shows the setting from any angle. */
  mesh(new THREE.BoxGeometry(0.42, 0.04, 0.2), mat(0xffffff, { roughness: 0.6 }), dial).position.set(2.42, 0.03, 0);
  mesh(new THREE.BoxGeometry(MW, 0.35, 5.5), mat(0x2d3034), g).position.set(0, 0.18, -ML / 2 - 2.9);
  const exits = { red: V(MW / 2 + 0.05, 1.0, 5.3), black: V(MW / 2 + 0.05, 0.7, 5.7) };
  return {
    group: g,
    setDialDeg(deg) { dial.rotation.y = deg * Math.PI / 180; },
    /** turn between dial positions: from/to are DIAL keys, k 0..1 */
    turn(from, to, k) { dial.rotation.y = (DIAL[from] + (DIAL[to] - DIAL[from]) * k) * Math.PI / 180; },
    setLcd, setBeepMode(b) { if (b !== beepMode) { beepMode = b; const s = shown; shown = null; setLcd(s); } }, get lcd() { return shown; },
    exit(which) { return g.localToWorld(exits[which].clone()); },
    /** world point of a dial label, for tags */
    labelAt(key) { const a = DIAL[key] * Math.PI / 180; return g.localToWorld(px(DC.x + Math.cos(a) * (R + 62), DC.y - Math.sin(a) * (R + 62) - 30)); },
    lcdAt() { return g.localToWorld(px(350, 100)); },
  };
}

/* ------------------------------------------------------------------ probes and leads */
/** local +x = where the tip points; origin = the very tip */
export function makeProbe(root, color) {
  const g = new THREE.Group(); const m = mat(color, { roughness: 0.45 });
  mesh(alongX(new THREE.ConeGeometry(0.08, 0.3, 16)).translate(-0.15, 0, 0), M.metal, g);
  mesh(alongX(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 16)), M.metal, g).position.x = -1.05;
  mesh(alongX(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 28)), m, g).position.x = -1.92;
  mesh(alongX(new THREE.CylinderGeometry(0.45, 0.42, 8.95, 24)), m, g).position.x = -6.52;
  mesh(alongX(new THREE.CylinderGeometry(0.22, 0.35, 1.5, 16)), m, g).position.x = -11.75;
  root.add(g); return g;
}
export function makeLead(root, color) {
  const tube = liveTube(root, color, 0.09);
  return (exit, probe) => {
    // from the probe's back the lead runs on a little, hangs down to the table, then lies along it to the meter
    const back = probe.localToWorld(V(-12.5, 0, 0)), behind = probe.localToWorld(V(-14, 0, 0));
    const pts = [back, behind];
    if (behind.y > 1.0) pts.push(V(behind.x, Math.max(0.15, behind.y * 0.35), behind.z), V(behind.x, 0.15, behind.z).lerp(exit, 0.12).setY(0.15));
    const mid = exit.clone().lerp(behind, 0.5); mid.y = 0.15;
    if (mid.distanceTo(behind) > 3 && mid.distanceTo(exit) > 3) pts.push(mid);
    pts.push(exit.clone().add(V(1.2, -0.5, 0.5)), exit);
    tube(pts);
  };
}
/** probes + leads wired to a meter; returns {red, black, update()} */
export function makeProbePair(root, meter) {
  const red = makeProbe(root, 0xc81e1e), black = makeProbe(root, 0x1a1a1a);
  const lr = makeLead(root, 0xc81e1e), lb = makeLead(root, 0x1a1a1a);
  return { red, black, update() { lr(meter.exit("red"), red); lb(meter.exit("black"), black); } };
}

/* ------------------------------------------------------------------ 5.5 x 2.5 mm barrel plug: tip at the group origin, body toward local +x */
export const BARREL = { rSleeve: 0.275, rInner: 0.125, len: 0.95 };
export function makeBarrelPlug(root) {
  const g = new THREE.Group(); root.add(g);
  const s = mesh(alongX(new THREE.CylinderGeometry(BARREL.rSleeve, BARREL.rSleeve, BARREL.len, 40, 1, true)), new THREE.MeshStandardMaterial({ color: 0xd8dcdf, metalness: 1, roughness: 0.25, side: THREE.DoubleSide }), g);
  s.position.x = BARREL.len / 2;
  const ins = mesh(new THREE.RingGeometry(BARREL.rInner + 0.01, BARREL.rSleeve - 0.01, 40), mat(0x111111, { side: THREE.DoubleSide }), g); ins.rotation.y = Math.PI / 2; ins.position.x = 0.03;
  const inn = mesh(alongX(new THREE.CylinderGeometry(BARREL.rInner, BARREL.rInner, BARREL.len - 0.05, 32, 1, true)), new THREE.MeshStandardMaterial({ color: 0xe8c66a, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }), g); inn.position.x = BARREL.len / 2 + 0.04;
  const hb = mesh(new THREE.CircleGeometry(BARREL.rInner, 24), mat(0x050505), g); hb.rotation.y = -Math.PI / 2; hb.position.x = BARREL.len;
  mesh(alongX(new THREE.CylinderGeometry(0.6, 0.55, 2.3, 32)), M.black, g).position.x = BARREL.len + 1.15;
  mesh(alongX(new THREE.CylinderGeometry(0.32, 0.45, 1.2, 20)), M.black, g).position.x = BARREL.len + 2.9;
  return g;
}

/* ------------------------------------------------------------------ adapter brick: SHNITPWR SNT-2405 (from Shad's photo) */
export function makeAdapter(root, at) {
  const g = new THREE.Group(); g.position.copy(at); root.add(g);
  const BL = 14, BW = 6, BH = 3.4;
  mesh(new THREE.BoxGeometry(BL, BH, BW), mat(0x1e2023, { roughness: 0.5 }), g).position.y = BH / 2;
  const lt = canvasTex(1120, 480, (c) => {
    c.fillStyle = "#17191b"; c.fillRect(0, 0, 1120, 480);
    c.fillStyle = "#9ea3a8"; c.font = "bold 64px Georgia"; c.fillText("SHNITPWR", 50, 100);
    c.font = "36px Georgia"; c.fillText("AC/DC Adapter", 450, 96);
    c.font = "34px Arial"; c.fillText("MODEL NO.: SNT-2405", 50, 170); c.fillText("AC INPUT: 100-240V ~ 50-60Hz 1.5A", 50, 225);
    c.font = "bold 40px Arial"; c.fillText("DC OUTPUT: 24V ⎓ 5A 120W", 50, 290);
    polaritySymbol(c, 120, 380, "#c8ccd0"); c.font = "28px Arial"; c.fillText("= middle is +", 380, 390);
  });
  const lab = mesh(new THREE.PlaneGeometry(BL - 1.2, BW - 0.8), mat(0xffffff, { map: lt.tex, roughness: 0.6 }), g);
  lab.rotation.x = -Math.PI / 2; lab.position.y = BH + 0.01; lab.castShadow = false;
  mesh(new THREE.BoxGeometry(0.3, 1.6, 2.4), mat(0x0d0e0f), g).position.set(BL / 2 + 0.01, BH / 2, 0);
  for (const dz of [-0.7, 0, 0.7]) mesh(new THREE.BoxGeometry(0.6, 0.45, 0.12), M.metal, g).position.set(BL / 2 + 0.12, BH / 2 + (dz === 0 ? -0.25 : 0.25), dz);
  return { group: g, inlet: () => g.localToWorld(V(BL / 2 + 0.16, BH / 2, 0)), dcOut: () => g.localToWorld(V(-BL / 2 - 0.05, BH / 2, 0)), size: { BL, BW, BH } };
}
/** the symbol (-)--C(.)--(+): outside minus, middle plus */
export function polaritySymbol(c, x, y, color) {
  c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 5;
  c.beginPath(); c.arc(x, y, 26, 0, 7); c.stroke(); c.fillRect(x - 16, y - 3, 32, 6);
  c.beginPath(); c.moveTo(x + 26, y); c.lineTo(x + 76, y); c.moveTo(x + 136, y); c.lineTo(x + 186, y); c.stroke();
  c.beginPath(); c.arc(x + 106, y, 26, 0.75, Math.PI * 2 - 0.75); c.stroke(); c.beginPath(); c.arc(x + 106, y, 9, 0, 7); c.fill();
  c.beginPath(); c.arc(x + 212, y, 26, 0, 7); c.stroke(); c.fillRect(x + 196, y - 3, 32, 6); c.fillRect(x + 209, y - 16, 6, 32);
}

/* ------------------------------------------------------------------ wall outlet, 3-prong cord with a C13 end */
export function makeMains(root, outletAt) {
  const ot = canvasTex(256, 400, (c) => {
    c.fillStyle = "#f6f4ee"; c.fillRect(0, 0, 256, 400);
    for (const cy of [110, 290]) {
      c.fillStyle = "#e9e6de"; roundRect(c, 48, cy - 70, 160, 140, 40); c.fill();
      c.fillStyle = "#222"; c.fillRect(92, cy - 40, 12, 46); c.fillRect(152, cy - 40, 12, 46);
      c.beginPath(); c.arc(128, cy + 38, 12, Math.PI, 0); c.lineTo(140, cy + 50); c.lineTo(116, cy + 50); c.fill();
    }
  });
  const plain = mat(0xf6f4ee);
  const plate = mesh(new THREE.BoxGeometry(7, 11, 0.3), [plain, plain, plain, plain, mat(0xffffff, { map: ot.tex }), plain], root); plate.position.copy(outletAt);
  const c13 = new THREE.Group(); root.add(c13);
  mesh(new THREE.BoxGeometry(3.0, 1.9, 2.8), M.black, c13).position.x = 1.5;
  mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), M.black, c13).position.x = 3.6;
  const plug = new THREE.Group(); root.add(plug);
  mesh(new THREE.BoxGeometry(2.9, 3.1, 2.4), M.black, plug).position.z = 1.2;
  mesh(new THREE.BoxGeometry(1.2, 1.2, 1.6), M.black, plug).position.z = 3.0;
  for (const dx of [-0.82, 0.82]) mesh(new THREE.BoxGeometry(0.1, 0.6, 1.6), M.metal, plug).position.set(dx, 0.75, -0.8);
  mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 12).rotateX(Math.PI / 2), M.metal, plug).position.set(0, -0.76, -0.9);
  const cord = liveTube(root, 0x1b1d20, 0.3);
  return {
    /** inK: 0 = cord end 5 cm away from the inlet, 1 = pushed in. wallK: same for the wall plug. */
    update(inletWorld, inK, wallK, away = 5) {
      c13.position.copy(inletWorld).add(V(5 * (1 - inK), 0, 0));
      plug.position.copy(outletAt).add(V(0, 2.19, 0.6 + away * (1 - wallK)));
      const a = c13.localToWorld(V(4.3, 0, 0)), b = plug.localToWorld(V(0, 0, 3.8));
      cord([a, a.clone().add(V(2.5, -1.2, 0)), V((a.x + b.x) / 2 + 2, 0.3, (a.z + b.z) / 2 + 2), b.clone().add(V(0, -2, 2.5)), b]);
    },
    outlet: outletAt,
  };
}

/* ------------------------------------------------------------------ small helpers for lessons */
/** expanding sound rings (for the beep) at a world point; k = 0..1 strength */
export function makeBeep(root, at) {
  const rings = [0, 1, 2].map(() => { const r = mesh(new THREE.TorusGeometry(1, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: 0x1d7cff, transparent: true }), root); r.position.copy(at); r.rotation.x = -Math.PI / 2; r.castShadow = false; r.visible = false; return r; });
  return (t, on) => rings.forEach((r, i) => { const ph = ((t * 1.4) + i / 3) % 1; r.visible = on; r.scale.setScalar(0.8 + ph * 3); r.material.opacity = (1 - ph) * 0.9; });
}

/* ------------------------------------------------------------------ the guide's own step models (metres -> centimetres) */
const glbCache = new Map();
const YELLOW_PLUG = /(^| )(xt60_body|battery_xt60|battery_liion_xt60)( |$)/;
/** Loads docs/models/<file>.glb (the guide's real-size step models), scaled to cm and added to root.
 *  Hides label anchors (LBL_*) and anything matching opts.hide. Returns { scene, n(name), all(prefix), home(name) }. */
export async function loadStepModel(root, file, opts = {}) {
  const url = new URL("../models/" + file, import.meta.url).href;
  if (!glbCache.has(url)) glbCache.set(url, new GLTFLoader().loadAsync(url));
  const gltf = await glbCache.get(url);
  const scene = gltf.scene.clone(true);
  scene.scale.setScalar(100); if (opts.at) scene.position.copy(opts.at);
  root.add(scene);
  scene.updateWorldMatrix(true, true);   // so sizes measured right after loading include the cm scale
  const byName = new Map(), homes = new Map();
  scene.traverse(o => {
    if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material = o.material.clone(); }
    /* Final audit, 11 Nov 2026 (PICS): the words call the battery plug "the yellow plug"; the models drew it black. */
    if (o.isMesh && YELLOW_PLUG.test(o.name + " " + (o.parent ? o.parent.name : ""))) o.material.color.setHex(0xf2c418);
    if (o.name) { byName.set(o.name, o); homes.set(o.name, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }); }
    if (/^LBL_/.test(o.name) || (opts.hide && opts.hide.test(o.name))) o.visible = false;
  });
  const n = name => { const o = byName.get(name); if (!o) throw new Error("model " + file + " has no part named " + name); return o; };
  return {
    scene, n, has: name => byName.has(name),
    all: re => [...byName.values()].filter(o => re.test(o.name) && o.parent && !re.test(o.parent.name)),
    home: name => homes.get(name),
    /** world position of a named part (cm) */
    at: name => n(name).getWorldPosition(new THREE.Vector3()),
    /** move a part from its home by an offset (in the model's own metres), k = 0 at the offset, 1 at home */
    slide(name, off, k) { const o = n(name), h = homes.get(name); o.position.copy(h.p).addScaledVector(off, 1 - k); },
    /** place every top-level part whose name matches re at home + off (model metres) */
    shift(re, off) { for (const o of byName.values()) if (re.test(o.name) && o.parent && !re.test(o.parent.name)) o.position.copy(homes.get(o.name).p).add(off); },
    /** brighten a part (emissive tint) to point at it; k 0..1 */
    glow(name, k, color = 0x1d7cff) { n(name).traverse(o => { if (o.isMesh) { o.material.emissive = new THREE.Color(color); o.material.emissiveIntensity = 0.55 * k; } }); },
  };
}
