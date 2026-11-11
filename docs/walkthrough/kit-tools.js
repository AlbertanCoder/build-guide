// Tools used in the build steps (from Shad's photos): hex driver, tape labels, threadlocker tube.
// Simplified shapes; colours chosen to match the photos where possible.
import { THREE, V, mat, mesh, alongX, canvasTex } from "./engine.js";

/** Hex driver: black handle, silver collar, copper bit. Local +x = the bit tip, origin = the tip. */
export function makeHexDriver(root) {
  const g = new THREE.Group(); root.add(g);
  mesh(alongX(new THREE.CylinderGeometry(0.1, 0.1, 4, 6)).translate(-2, 0, 0), mat(0xb5652b, { metalness: 1, roughness: 0.35 }), g);
  mesh(alongX(new THREE.CylinderGeometry(0.5, 0.42, 1.4, 24)), mat(0xd0d4d8, { metalness: 1, roughness: 0.25 }), g).position.x = -4.7;
  mesh(alongX(new THREE.CylinderGeometry(0.62, 0.62, 6.5, 6)), mat(0x1c1d20, { roughness: 0.45 }), g).position.x = -8.65;
  return g;
}
/** A strip of tape with writing on it, lying flat (length along x). */
export function makeTapeLabel(root, text, w = 3.2, h = 1.1, color = "#f4e9a8") {
  const tx = canvasTex(320, 110, c => { c.fillStyle = color; c.fillRect(0, 0, 320, 110); c.fillStyle = "#1a1a1a"; c.font = "bold 64px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 160, 58); });
  const m = mesh(new THREE.PlaneGeometry(w, h), mat(0xffffff, { map: tx.tex, roughness: 0.8 }), root); m.rotation.x = -Math.PI / 2; m.castShadow = false;
  return m;
}
/** A small flag of tape folded round a wire, with a number on it. */
export function makeWireFlag(root, text) {
  const tx = canvasTex(128, 96, c => { c.fillStyle = "#f2f2ee"; c.fillRect(0, 0, 128, 96); c.fillStyle = "#111"; c.font = "bold 70px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 64, 52); });
  const m = mesh(new THREE.BoxGeometry(1.4, 1.05, 0.04), [mat(0xf2f2ee), mat(0xf2f2ee), mat(0xf2f2ee), mat(0xf2f2ee), mat(0xffffff, { map: tx.tex }), mat(0xffffff, { map: tx.tex })], root);
  return m;
}
/** Permatex Blue threadlocker tube (6 mL). Local +x = the nozzle tip, origin = the tip. */
export function makeThreadlocker(root) {
  const g = new THREE.Group(); root.add(g);
  mesh(alongX(new THREE.ConeGeometry(0.16, 0.9, 16)).translate(-0.45, 0, 0), mat(0xf4f4f4), g);
  mesh(alongX(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 20)), mat(0xf4f4f4), g).position.x = -1.2;
  mesh(new THREE.BoxGeometry(4.2, 0.35, 1.2).translate(-3.6, 0, 0), mat(0x1f3fb0, { roughness: 0.4 }), g);
  const drop = mesh(new THREE.SphereGeometry(0.12, 12, 8), mat(0x2457e0, { roughness: 0.2 }), g); drop.position.x = 0.1; drop.visible = false;
  return { group: g, drop };
}
