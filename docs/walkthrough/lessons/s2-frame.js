// Step 2 (part 1): build the frame: plates, arms, spacer, root screws, standoffs, FRONT tape.
// Parts come from the guide's own step model (docs/models/step-02-frame.glb, real sizes, metres -> cm).
// Root-screw spots are shown roughly (no V6 build manual was found); the guide's words are the rule.
import * as T from "../kit-tools.js";
export default {
  T: 50,
  steps: [
    { t0: 0,  text: "Bottom plate down. The <b>front</b> is the end where the camera will sit (the arrow). (When the frame arrives, check which screw length goes in which hole, and where the press nuts sit. No V6 manual was found.)", why: "Everything later (motors, camera) depends on which end is the front.", simple: "The front is where the camera will go. Follow the arrow." },
    { t0: 6,  text: "Lay the <b>four arms</b> on the bottom plate, <b>root ends in the middle</b>.", why: "The arms' wide ends get clamped between the plates in the middle.", simple: "Lay the four arms on the bottom plate with their wide ends meeting in the middle." },
    { t0: 14, text: "The small <b>arm spacer</b> goes in the centre.", why: "The spacer fills the middle so the plates squeeze the arms evenly.", simple: "Put the small spacer piece in the very centre." },
    { t0: 18, text: "<b>Middle plate on top</b>, so each arm is sandwiched between the two plates.", why: "The two plates squeeze the arms so they can't move.", simple: "Lay the middle plate on top so the arms are sandwiched." },
    { t0: 23, text: "<b>Two screws</b> through each arm's two root holes. Tighten <b>snug, not forced</b>.", why: "Overtightening can crack the carbon or strip the small screws.", simple: "Two screws through each arm's holes near the middle. Tighten until snug, then stop." },
    { t0: 31, text: "Screw the four <b>30 mm standoffs</b> onto the bottom plate: two beside the stack's rear corners, two at the very back.", why: "These posts hold the top plate up at the back.", simple: "Screw the four longer posts (30 mm) onto the bottom plate at the back." },
    { t0: 37, text: "Screw the four <b>22 mm standoffs</b> onto the middle plate at the front. All eight end at the same height.", why: "These posts hold the top plate up at the front, at the same height as the back ones.", simple: "Screw the four shorter posts (22 mm) onto the middle plate at the front." },
    { t0: 43, text: "Tape on the <b>front end</b> of the frame and write <b>FRONT</b> on it, before any motor goes on.", why: "Once it's built, front and back look alike. The tape stops mistakes.", simple: "Stick tape on the front end and write FRONT on it." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-02-frame.glb", { at: V(0, 1.0, 0), hide: /^(M[1-4]_|motor_screw_|cutaway_)/ });
    const arms = ["frame_arm_M1", "frame_arm_M2", "frame_arm_M3", "frame_arm_M4"];
    const s30 = [0, 1, 2, 3].map(i => "frame_standoff_30mm_" + i), s22 = [0, 1, 2, 3].map(i => "frame_standoff_22mm_" + i);
    const bb = new THREE.Box3().setFromObject(m.n("frame_bottom_plate"));
    const mb = new THREE.Box3().setFromObject(m.n("frame_middle_plate"));
    // the bottom plate's front end sits under the middle plate in this model, so the tape goes on the frame's visible front end
    const tape = T.makeTapeLabel(root, "FRONT"); tape.position.set(mb.max.x - 1.4, mb.max.y + 0.03, 0);
    const drv = T.makeHexDriver(root);
    const top = new THREE.Box3().setFromObject(m.n("frame_middle_plate")).max.y;
    // Picture fix, 11 Nov 2026: the 8 screw spots are EXAMPLES (no V6 manual was found). They used to lie 3.8 and 5.5 cm out,
    // on the bare arm outside both plates. Now 2.3 and 3.1 cm out: past the centre spacer, where both plates cover the arm
    // (bottom plate x -8.49..2.27, middle plate x -2.46..8.25, both 4.86 wide), and a screw head stays behind.
    const holes = arms.flatMap(a => { const h = m.home(a).p; const d = V(h.x, 0, h.z).normalize(); return [0.192, 0.258].map(f => V(0, top, 0).addScaledVector(d, 12.0 * f)); });
    const heads = holes.map(p => { const h = E.mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 14), E.M.metal, root); h.position.set(p.x, p.y + 0.06, p.z); h.visible = false; return h; });
    let st = {};
    const over = [V(-26, 24, 0.01), V(0, 1, 0)];
    return {
      cams: [
        [0, ...over], [5.4, ...over],
        [6.4, V(-12, 30, 16), V(0, 1, 0)], [17.4, V(-12, 30, 16), V(0, 1, 0)],
        [18.4, V(-20, 16, 18), V(0, 2, 0)], [22.4, V(-20, 16, 18), V(0, 2, 0)],
        [23.4, V(-10, 22, 14), V(0, 2, 0)], [30.4, V(-10, 22, 14), V(0, 2, 0)],
        [31.4, V(-16, 14, 14), V(-2, 3, 0)], [42.4, V(-16, 14, 14), V(-2, 3, 0)],
        // from above and the drone's right: the word on the tape reads level, and no standoff stands in front of a letter
        [43.4, V(mb.max.x - 1.4, 17, 4), V(mb.max.x - 1.4, 2, 0)], [50, V(mb.max.x - 1.4, 17, 4), V(mb.max.x - 1.4, 2, 0)],
      ],
      tags: [
        { text: "FRONT (camera end)", cls: "blue", at: () => V(8.5, 1.5, 0), from: 0.6, to: 6 },
        { text: "Root ends in the middle", at: () => V(0, 3.2, 0), from: 9, to: 14 },
        { text: "Arm spacer", at: () => m.at("frame_arm_spacer").add(V(0, 1.5, 0)), from: 14.8, to: 18 },
        { text: "Arms sandwiched", at: () => m.at("frame_arm_M2").add(V(-3, 2.2, -3)), from: 20, to: 23 },
        { text: "2 screws per arm: snug, not forced", cls: "warn", at: () => holes[0].clone().add(V(0, 3, 0)), from: 24, to: 31 },
        { text: "Example spots: use the holes in YOUR frame", cls: "blue", at: () => holes[7].clone().add(V(0, 2.6, 0)), from: 25.5, to: 31 },
        { text: "30 mm (rear)", cls: "blue", at: () => m.at("frame_standoff_30mm_0").add(V(0, 2.5, 0)), from: 32.6, to: 37 },
        { text: "22 mm (front)", cls: "blue", at: () => m.at("frame_standoff_22mm_0").add(V(0, 2.5, 0)), from: 38, to: 43 },
        { text: "Write FRONT on it", cls: "warn", at: () => tape.position.clone().add(V(0, 1, 0)), from: 44, to: 50 },
      ],
      update(t) {
        m.n("arrow_front_head").visible = m.n("arrow_front_shaft").visible = t < 6;
        arms.forEach((a, i) => { const h = m.home(a).p, out = V(h.x, 0, h.z).normalize().multiplyScalar(0.08); m.slide(a, out, prog(t, 6.6 + i * 1.6, 8.0 + i * 1.6)); m.n(a).visible = t >= 6.6 + i * 1.6 - 0.01; });
        m.slide("frame_arm_spacer", V(0, 0.05, 0), prog(t, 14.4, 15.6)); m.n("frame_arm_spacer").visible = t >= 14.4;
        m.slide("frame_middle_plate", V(0, 0.06, 0), prog(t, 18.6, 20.2)); m.n("frame_middle_plate").visible = t >= 18.6;
        s30.forEach((s, i) => { const k = prog(t, 31.6 + i * 1.1, 32.5 + i * 1.1); m.slide(s, V(0, 0.04, 0), k); m.n(s).rotation.y = (1 - k) * 6; m.n(s).visible = t >= 31.6 + i * 1.1; });
        s22.forEach((s, i) => { const k = prog(t, 37.4 + i * 1.0, 38.3 + i * 1.0); m.slide(s, V(0, 0.04, 0), k); m.n(s).rotation.y = (1 - k) * 6; m.n(s).visible = t >= 37.4 + i * 1.0; });
        // driver: visits the 8 root holes, turning, then lifts away
        const dk = (t - 23.6) / 6.8; drv.visible = dk > 0 && dk < 1;
        if (drv.visible) {
          const i = Math.min(7, Math.floor(dk * 8)), f = dk * 8 - i, p = holes[i];
          drv.position.set(p.x, p.y + 0.1 + (f < 0.25 ? (0.25 - f) * 6 : 0), p.z);
          drv.quaternion.setFromUnitVectors(V(1, 0, 0), V(0, -1, 0)); drv.rotateX(f * 12);
        }
        heads.forEach((h, i) => { h.visible = t >= 23.6 + (i + 0.7) * 0.85; });   // each screw's head shows once the driver has turned it
        tape.visible = t >= 43.6;
        st = { arms: arms.every(a => m.n(a).position.distanceTo(m.home(a).p) < 1e-4), middle: m.n("frame_middle_plate").position.distanceTo(m.home("frame_middle_plate").p) < 1e-4,
               standoffs: [...s30, ...s22].every(s => m.n(s).visible && m.n(s).position.distanceTo(m.home(s).p) < 1e-4), tape: tape.visible,
               boxes: { bottom: [bb.min.x, bb.max.x, bb.max.y], middle: (() => { const b = new THREE.Box3().setFromObject(m.n("frame_middle_plate")); return [b.min.x, b.max.x, b.max.y]; })(), tape: [tape.position.x, tape.position.y] } };
      },
      state() { return st; },
    };
  },
};
