// Step 3 (part 2): motor wires to the ESC: lay, cut (+5 mm), strip 2 mm, tin pads and ends, solder, check.
// Parts from docs/models/step-03-stack.glb. Solder beads, bare ends and the bridge example are drawn here.
import * as K from "../kit-bench.js";
export default {
  T: 52,
  steps: [
    { t0: 0,  text: "Lay each motor wire along its arm to <b>its own pad</b> on the ESC, add <b>about 5 mm</b>, and cut. (The three wires end up slightly different lengths.)", why: "Wires that are too long flap about; too short won't reach.", simple: "Lay each motor's wires along its arm to the nearest pads, add about half a centimetre, and cut." },
    { t0: 10, text: "<b>Strip about 2 mm</b> off each wire end.", why: "Only a little bare copper is needed for these small pads.", simple: "Strip 2 mm of plastic off each wire end." },
    { t0: 15, text: "<b>Tin the pads:</b> melt a thin layer of solder onto each pad, and onto each stripped wire end.", why: "Pre-tinned pads and wires join with one quick touch of the iron.", simple: "Melt a thin layer of solder on each pad and each wire end." },
    { t0: 25, text: "Solder each motor's <b>three wires</b> to the <b>three pads on the ESC edge nearest that motor</b>, in any order. (A motor spinning the wrong way is fixed in Betaflight, not with the iron.)", why: "Any order works; which way a motor spins is set later in Betaflight.", simple: "Solder each motor's 3 wires to the 3 pads closest to that motor." },
    { t0: 37, text: "A good joint is <b>smooth, shiny and covers the pad</b>. If solder <b>joins two pads</b>, remove it with the iron before you go on.", why: "Solder joining two pads makes a short that can burn the ESC.", simple: "Each joint should be shiny and cover its pad. If solder connects two pads, melt it and pull it away." },
    { t0: 46, text: "<b>Tug each wire gently.</b> It must not move.", why: "A loose motor wire in the air means a crash.", simple: "Pull each wire lightly. Nothing should move." },
  ],
  async build(E, root) {
    const { THREE, V, prog, poseTrack, pose } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-03-stack.glb", { at: V(0, 1.0, 0),
      hide: /^(battery_|meter_|smokestopper_|xt60_|wire_batt|solder_joint|stack_capacitor|stack_fc|stack_esc_fc_cable|stack_screw_\d_nut)/ });   // no nuts yet: the flight controller is not on (picture fix, 11 Nov 2026)
    const N = [1, 2, 3, 4];
    const pad = (n, i) => `stack_esc_pad_M${n}_${i}`, wire = (n, i) => `wire_motor_M${n}_${i}`;
    const padW = (n, i) => m.at(pad(n, i));
    const escC = m.at("stack_esc");
    // bare copper ends and beads at every pad
    const ends = [], beads = [], tins = [];
    for (const n of N) for (let i = 0; i < 3; i++) {
      const p = padW(n, i), out = V(p.x - escC.x, 0, p.z - escC.z).normalize();
      const cu = E.staticTube(root, 0, 0.045, [p.clone().add(V(0, 0.12, 0)).addScaledVector(out, 0.05), p.clone().add(V(0, 0.12, 0)).addScaledVector(out, 0.25)], 4, E.M.copper); cu.visible = false; ends.push(cu);
      tins.push(K.makeBead(root, p.clone().add(V(0, 0.01, 0)), 0.11));
      beads.push(K.makeBead(root, p.clone().add(V(0, 0.02, 0)), 0.15));
    }
    // the bridge example: a short bright blob that joins TWO pads (picture fix, 11 Nov 2026: it was a dark bar under three pads, not visible)
    const bridge = E.mesh(new THREE.BoxGeometry(0.22, 0.16, 0.6), E.mat(0xe9edf0, { roughness: 0.3 }), root);
    { const a = padW(1, 0), b = padW(1, 1); bridge.position.copy(a).lerp(b, 0.5).add(V(0, 0.14, 0)); bridge.lookAt(b.clone().add(V(0, 0.14, 0))); }
    const iron = K.makeIron(root); iron.setHeat(1);
    const solder = K.makeSolderStick(root, 3);
    const cutters = K.makePliers(root, 0xd03b3b);
    const D = V(-0.45, -0.75, 0.5).normalize();   // handle away from the viewer
    const ironAt = p => pose(p.clone().add(V(0, 0.16, 0)), D), AWAY = pose(V(14, 1, -14), V(-1, 0, 0));
    const solderAt = p => pose(p.clone().add(V(0.12, 0.2, 0.2)), V(-0.6, -0.4, -0.7).normalize()), SAWAY = pose(V(-14, 0.4, 14), V(1, 0, 0));
    const order = N.flatMap(n => [0, 1, 2].map(i => [n, i]));
    let st = {};
    const close = [V(-5.5, 7, 8), V(0, 1.6, 0.3)], wide = [V(-16, 18, 18), V(0, 2, 0)];
    return {
      cams: [[0, ...wide], [9.4, ...wide], [10.4, ...close], [52, ...close]],
      tags: [
        { text: "To its own pad, + about 5 mm", cls: "blue", at: () => padW(1, 1).add(V(-4, 3, 4)), from: 1.2, to: 10 },
        { text: "Strip 2 mm", cls: "blue", at: () => padW(2, 1).add(V(0, 0.8, 0.4)), from: 11, to: 15 },
        { text: "Thin layer on each pad", cls: "good", at: () => padW(2, 1).add(V(0, 1.4, 0)), from: 17, to: 25 },
        { text: "3 wires = the 3 pads nearest that motor", cls: "warn", at: () => padW(4, 1).add(V(0, 0.9, -0.3)), from: 27, to: 37 },
        // the two labels take turns, so they never lie on top of each other and each points at its own joint
        { text: "Good: smooth, shiny, covers the pad", cls: "good", at: () => padW(2, 1).add(V(0, 0.8, 0)), from: 38, to: 39.3 },
        { text: "Bridge! Remove it with the iron", cls: "red", at: () => bridge.position.clone().add(V(0, 0.8, 0)), from: 39.4, to: 44 },
        { text: "Good: smooth, shiny, covers the pad", cls: "good", at: () => padW(2, 1).add(V(0, 0.8, 0)), from: 44.1, to: 46 },
        { text: "Gentle tug: must not move", cls: "good", at: () => padW(1, 2).add(V(0, 0.8, 0)), from: 46.6, to: 52 },
      ],
      update(t) {
        // 1. wires appear motor by motor, then the cutters snip
        N.forEach((n, k) => [0, 1, 2].forEach(i => { m.n(wire(n, i)).visible = t >= 0.8 + k * 1.6; }));
        const cutAt = padW(1, 1).add(V(-0.2, 0.3, 0.5));
        poseTrack(cutters.group, t, [[6.6, pose(V(-12, 0.6, 12), V(0, 0, -1))], [7.6, pose(cutAt, V(0, 0, -1))], [10, pose(cutAt, V(0, 0, -1))], [10.8, pose(V(-12, 0.6, 12), V(0, 0, -1))]]);   // the cutters stay to the end of step 1, so the frame the player stops on shows the cut
        cutters.close(prog(t, 7.8, 8.3) * (1 - prog(t, 8.6, 8.9)));
        // 2. bare ends
        ends.forEach((c, j) => { c.visible = t >= 11 + j * 0.25; });
        // 3. tin pads: iron + solder visit pads, a thin silver layer appears on each
        const tinK = j => prog(t, 15.6 + j * 0.75, 16.2 + j * 0.75);
        tins.forEach((f, j) => f(tinK(j) * 0.35));
        // 4. solder joints
        const jK = j => prog(t, 25.6 + j * 0.9, 26.3 + j * 0.9);
        beads.forEach((f, j) => f(jK(j)));
        const cur = (t0, step) => { const j = Math.floor((t - t0) / step); return j >= 0 && j < 12 ? order[j] : null; };
        const tinOn = cur(15.6, 0.75), jOn = cur(25.6, 0.9), on = tinOn || jOn;
        if (on) { const p = padW(on[0], on[1]); iron.group.position.copy(ironAt(p).p); iron.group.quaternion.copy(ironAt(p).q); solder.position.copy(solderAt(p).p); solder.quaternion.copy(solderAt(p).q); }
        else { iron.group.position.copy(AWAY.p); iron.group.quaternion.copy(AWAY.q); solder.position.copy(SAWAY.p); solder.quaternion.copy(SAWAY.q); }
        if (t > 41.6 && t < 43.6) { const p = bridge.position; iron.group.position.copy(p).add(V(0, 0.12, 0)); iron.group.quaternion.copy(ironAt(p).q); }
        bridge.visible = t >= 39 && t < 43.2;
        // 6. tug
        const tug = t > 47 && t < 49 ? Math.sin((t - 47) * 10) * 0.006 : 0;   // 6 mm, so the tug can be seen (was 1.5 mm)
        m.n(wire(1, 2)).position.copy(m.home(wire(1, 2)).p).add(V(0, tug, 0));
        iron.ironCord(V(30, 0, -25));   // the adapter's plug and cable at the iron's back
        st = { wires: N.every(n => [0, 1, 2].every(i => m.n(wire(n, i)).visible)), bare: t >= 14, tinned: t >= 25, joints: t >= 36.6, bridgeGone: !bridge.visible, ironOnPad: on ? iron.group.position.distanceTo(padW(on[0], on[1])) : null };
      },
      state() { return st; },
    };
  },
};
