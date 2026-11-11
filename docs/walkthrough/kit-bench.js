// Bench models for Stage 1 lessons: iron, stand, tile, sponge, practice board,
// solder, wire pieces, stripper, cutters, glasses, micro-USB cable.
// Simplified shapes; colours of small parts are chosen for visibility.
import { THREE, V, mat, mesh, alongX, M, canvasTex, staticTube, liveTube } from "./engine.js";

/** Soldering iron: SanErYiGo SH72 (from Shad's photos): grey metal tube, dotted grip, temperature wheel
 *  (200-420), the drawing (-)-C-(+) "DC5525 12-24V" near the back, and a DC socket at the back end.
 *  Local +x = where the tip points, origin = the tip. */
export function makeIron(root) {
  const g = new THREE.Group(); root.add(g);
  const tipMat = mat(0x8d9299, { metalness: 1, roughness: 0.35 });
  const body = mat(0x5b5f65, { metalness: 0.6, roughness: 0.45 });
  mesh(alongX(new THREE.ConeGeometry(0.12, 1.2, 20)).translate(-0.6, 0, 0), tipMat, g);
  mesh(alongX(new THREE.CylinderGeometry(0.22, 0.22, 3.2, 20)), mat(0xc4c8cc, { metalness: 1, roughness: 0.25 }), g).position.x = -2.8;
  mesh(alongX(new THREE.CylinderGeometry(0.42, 0.62, 1.4, 24)), body, g).position.x = -5.1;
  // body tube, then the printed label as a thin decal on the +z side. Canvas: 256 wide (around) x 1024 tall (along);
  // the text runs from the back end (canvas bottom) toward the tip (canvas top), so it reads left to right when the tip points right.
  mesh(alongX(new THREE.CylinderGeometry(0.65, 0.65, 10.4, 40)), body, g).position.x = -11.0;
  const lab = canvasTex(256, 1024, c => {
    c.fillStyle = "#5b5f65"; c.fillRect(0, 0, 256, 1024);
    c.translate(150, 1010); c.rotate(-Math.PI / 2);
    c.fillStyle = "#eef0f2"; c.strokeStyle = "#eef0f2"; c.lineWidth = 4;
    const x = 40, y = -40;   // the drawing (-)-C-(+)
    c.beginPath(); c.arc(x, y, 15, 0, 7); c.stroke(); c.fillRect(x - 9, y - 2, 18, 4);
    c.beginPath(); c.moveTo(x + 15, y); c.lineTo(x + 42, y); c.moveTo(x + 72, y); c.lineTo(x + 99, y); c.stroke();
    c.beginPath(); c.arc(x + 57, y, 15, 0.75, Math.PI * 2 - 0.75); c.stroke(); c.beginPath(); c.arc(x + 57, y, 5, 0, 7); c.fill();
    c.beginPath(); c.arc(x + 114, y, 15, 0, 7); c.stroke(); c.fillRect(x + 105, y - 2, 18, 4); c.fillRect(x + 112, y - 9, 4, 18);
    c.font = "bold 34px Arial"; c.fillText("DC5525", 30, 5); c.fillText("12-24V", 30, 45);
    c.font = "bold 50px Arial"; c.fillText("SH72", 470, 20);
    c.font = "bold 30px Arial"; c.fillText("SanErYiGo", 640, 20);
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(880 + (i % 4) * 26, -30 + Math.floor(i / 4) * 26, 5, 0, 7); c.fill(); }
  });
  const decal = mesh(alongX(new THREE.CylinderGeometry(0.656, 0.656, 10.4, 24, 1, true, -0.8, 1.6)), new THREE.MeshStandardMaterial({ map: lab.tex, metalness: 0.5, roughness: 0.45 }), g);
  decal.position.x = -11.0; decal.castShadow = false;
  // temperature wheel on top, near the back
  const wheel = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 32).rotateX(Math.PI / 2), mat(0x2a2c30, { roughness: 0.7 }), g); wheel.position.set(-12.2, 0.55, 0);
  const notch = mesh(new THREE.BoxGeometry(0.08, 0.36, 0.1), mat(0xffffff), wheel); notch.position.set(0, 0.5, 0.15);
  // back end: open socket with a centre pin
  const ring = mesh(alongX(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24, 1, true)), mat(0xc9cdd1, { metalness: 1, roughness: 0.3, side: THREE.DoubleSide }), g); ring.position.x = -16.0;
  const sock = mesh(new THREE.CircleGeometry(0.4, 24), mat(0x0b0b0b), g); sock.rotation.y = -Math.PI / 2; sock.position.x = -15.95;
  const pin = mesh(alongX(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12)), M.metal, g); pin.position.x = -15.95;
  const blob = mesh(new THREE.SphereGeometry(0.16, 16, 12), M.solder, g); blob.position.set(-0.35, 0, 0); blob.visible = false;
  // the adapter's round plug pushed into the back, and its cable (shown by lessons that call ironCord())
  const plugIn = new THREE.Group(); g.add(plugIn); plugIn.visible = false;
  mesh(alongX(new THREE.CylinderGeometry(0.55, 0.6, 2.3, 24)), M.black, plugIn).position.x = -17.3;
  mesh(alongX(new THREE.CylinderGeometry(0.3, 0.45, 1.2, 16)), M.black, plugIn).position.x = -19.0;
  const cord = liveTube(root, 0x1b1d20, 0.22); let cordMesh = null;
  return {
    group: g,
    /** draw the plugged-in round plug and its cable, lying back along the table toward `toward` (world point) */
    ironCord(toward) {
      plugIn.visible = true;
      const a = g.localToWorld(V(-19.5, 0, 0)), b = g.localToWorld(V(-22, 0, 0));
      const pts = [a, b];
      if (b.y > 1.0) pts.push(V(b.x, Math.max(0.3, b.y * 0.3), b.z));
      const t = toward.clone(); t.y = 0.3;
      pts.push(V(b.x, 0.3, b.z).lerp(t, 0.4).setY(0.3), t);
      cordMesh = cord(pts);
    },
    back: () => g.localToWorld(V(-16.2, 0, 0)),
    labelAt: () => g.localToWorld(V(-15.0, 0.3, 0.7)), wheelAt: () => g.localToWorld(V(-12.2, 0.95, 0)),
    setWheel(k) { wheel.rotation.z = -k * 2.4; },
    setHeat(k) { tipMat.color.setRGB(0.55 + 0.25 * k, 0.57 - 0.07 * k, 0.6 - 0.25 * k); },
    setBlob(k) { blob.visible = k > 0.02; blob.scale.setScalar(0.4 + k); },
  };
}
/** Iron stand from Shad's kit: a small black tray, a bent wire holder on one half, a yellow sponge on the other.
 *  The iron rests on the holder with its tip off the far end of the tray. holdPose() = pose for the iron's tip. */
export function makeStand(root, at) {
  const g = new THREE.Group(); g.position.copy(at); root.add(g);
  mesh(new THREE.BoxGeometry(6.6, 0.8, 4.2), mat(0x1d1f22, { roughness: 0.6 }), g).position.y = 0.4;
  const sponge = mesh(new THREE.BoxGeometry(2.8, 0.45, 3.5), mat(0xe9d43a, { roughness: 0.95 }), g); sponge.position.set(1.6, 1.02, 0);
  const wireM = mat(0xc9cdd1, { metalness: 1, roughness: 0.3 });
  const hz = 1.2;   // holder height above the tray top
  staticTube(g, 0, 0.06, [V(-2.6, 0.8, -1.4), V(-2.6, 0.8 + hz, -1.0), V(-1.6, 0.8 + hz * 0.85, 0.2), V(-0.6, 0.8 + hz, -1.0), V(-0.6, 0.8, -1.4)], 40, wireM);
  const D = V(0, -0.12, -1).normalize();
  const tip = () => g.localToWorld(V(-1.6, 0.8 + hz + 0.55 - 0.12 * 4.0, 0.2 - 4.0));
  return { group: g, holdPose: () => ({ p: tip(), q: new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), D.clone().applyQuaternion(g.quaternion)) }), spongeAt: () => g.localToWorld(V(1.6, 1.3, 0)) };
}
export function makeTile(root, at, size = 20) { const t = mesh(new THREE.BoxGeometry(size, 0.7, size), mat(0xe9e2d4, { roughness: 0.4 }), root); t.position.copy(at).add(V(0, 0.35, 0)); return t; }
/** Practice board (perfboard): grid of copper pads. Returns pad world positions. */
export function makeBoard(root, at, cols = 12, rows = 8, pitch = 0.6) {
  const g = new THREE.Group(); g.position.copy(at); root.add(g);
  const W = cols * pitch + 0.6, H = rows * pitch + 0.6;
  mesh(new THREE.BoxGeometry(W, 0.16, H), mat(0x2f7a3b, { roughness: 0.6 }), g).position.y = 0.08;
  const pad = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18), M.copper, cols * rows);
  const hole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), mat(0x0a0a0a), cols * rows);
  const m4 = new THREE.Matrix4(); let i = 0; const pads = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = (c - (cols - 1) / 2) * pitch, z = (r - (rows - 1) / 2) * pitch; m4.makeTranslation(x, 0.175, z); pad.setMatrixAt(i, m4); m4.makeTranslation(x, 0.18, z); hole.setMatrixAt(i, m4); pads.push(V(x, 0.19, z)); i++; }
  pad.receiveShadow = true; g.add(pad); g.add(hole);
  return { group: g, pad: (c, r) => g.localToWorld(pads[r * cols + c].clone()), size: { W, H } };
}
/** a shiny solder bead (tinned pad or joint): grow k 0..1 */
export function makeBead(root, at, r = 0.24) {
  const b = mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.solder, root); b.position.copy(at); b.scale.set(1, 0.001, 1); b.visible = false;
  return k => { b.visible = k > 0.01; b.scale.set(0.5 + 0.5 * k, Math.max(0.001, 0.75 * k), 0.5 + 0.5 * k); };
}
/** solder from Shad's kit: a clear tube with a blue cap; the wire comes out of the cap. Local +x = the wire's end. */
export function makeSolderStick(root, len = 3) {
  const g = new THREE.Group(); root.add(g);
  mesh(alongX(new THREE.CylinderGeometry(0.05, 0.05, len, 10)).translate(-len / 2, 0, 0), M.solder, g);
  mesh(alongX(new THREE.CylinderGeometry(0.62, 0.62, 0.7, 24)), mat(0x2f8fd8, { roughness: 0.5 }), g).position.x = -len - 0.35;
  const tube = mesh(alongX(new THREE.CylinderGeometry(0.58, 0.58, 7, 24)), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 }), g); tube.position.x = -len - 4.2; tube.castShadow = false;
  mesh(alongX(new THREE.CylinderGeometry(0.42, 0.42, 6.2, 24)), M.solder, g).position.x = -len - 4.3;
  return g;
}
/** a short piece of thin silicone wire with an optional bare end at +x. Local +x = the bare end, origin = the very end */
export function makeWirePiece(root, color, len = 6, bare = 0.3) {
  const g = new THREE.Group(); root.add(g);
  const ins = mesh(alongX(new THREE.CylinderGeometry(0.08, 0.08, len, 12)).translate(-len / 2 - bare, 0, 0), mat(color, { roughness: 0.5 }), g);
  const cu = mesh(alongX(new THREE.CylinderGeometry(0.05, 0.05, bare, 10)).translate(-bare / 2, 0, 0), M.copper, g);
  return { group: g, setBare(b) { cu.visible = b > 0; ins.position.x = b > 0 ? 0 : bare; } };
}
/** simple plier-style tool (stripper or cutters). Local +x = the jaws, origin = the jaw tip. close 0..1 */
export function makePliers(root, color) {
  const g = new THREE.Group(); root.add(g);
  const a = new THREE.Group(), b = new THREE.Group(); g.add(a); g.add(b);
  for (const [h, s] of [[a, 1], [b, -1]]) {
    mesh(new THREE.BoxGeometry(2.2, 0.25, 0.35).translate(-1.1, 0, 0), mat(0x8e959c, { metalness: 1, roughness: 0.3 }), h);
    mesh(new THREE.BoxGeometry(7.5, 0.5, 0.7).translate(-6, 0, s * 0.4), mat(color, { roughness: 0.5 }), h);
  }
  return { group: g, close(k) { const ang = (1 - k) * 0.22; a.rotation.y = ang; b.rotation.y = -ang; } };
}
export function makeGlasses(root) {
  // clear wrap-around safety glasses: two framed lenses, a bridge and two thin arms folded back
  const g = new THREE.Group(); root.add(g);
  const frame = mat(0x2a2d31, { roughness: 0.4 });
  const lens = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.35, roughness: 0.05 });
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape(); const w = 2.6, h = 1.7, r = 0.7;
    shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r); shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h); shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r); shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
    const l = mesh(new THREE.ShapeGeometry(shape, 12), lens, g); l.position.x = s * 2.9; l.castShadow = false;
    const pts = shape.getPoints(24).map(p => V(p.x + s * 2.9, p.y, 0));
    staticTube(g, 0, 0.12, [...pts, pts[0]], 80, frame);
    staticTube(g, 0, 0.1, [V(s * 5.5, 1.0, 0), V(s * 5.9, 1.0, -1.5), V(s * 5.9, 0.9, -8), V(s * 5.7, 0.2, -9.5)], 30, frame);
  }
  staticTube(g, 0, 0.12, [V(-0.3, 0.9, 0), V(0, 1.2, 0), V(0.3, 0.9, 0)], 8, frame);
  return g;
}
