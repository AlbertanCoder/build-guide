// Step 3 (part 4): fix A1 (verified 8 Nov): solder the flight controller's pad-side wires on the bench FIRST, then
// the 8-wire cable, then mount it socket face up. Words follow the guide's S3.4 (index.html).
// The close-up board on the left is a simplified, enlarged drawing of the GEPRC TAKER F405's pad face, laid out
// from GEPRC's one-page diagram (left outer column GND 5V R5 T5 S.B GND R1 T1 GND 9V | GND 5V R2 T2; inner column
// SDA SCL 9V VTX T3 R3 G 5V | BP G 5V LED; right column CAM GND 5V | R4 CUR M4 M3 M2 M1 BAT GND | GND 5V LED).
// Wire colours: TBS Unify Pro 5G8 HV manual. The stack on the right is the guide's own step model.
import { makeBead } from "../kit-bench.js";
export default {
  T: 76,
  steps: [
    { t0: 0,  text: "<b>First, on the bench, solder the flight controller's pad-side wires</b>, before the 8-wire cable and before mounting. Once it is mounted, the pad face points <b>down</b> at the ESC, where the iron can't reach.", why: "The pads you need end up underneath, out of reach.", simple: "Solder the board's wires first, while you can still reach them." },
    { t0: 8,  text: "Lay the board on the bench <b>pad face up</b> (the face with the small gold pads, not the plug sockets). Use the GEPRC one-page diagram from Step 1 and <b>read each pad's label</b> before you solder it.", why: "Each pad has a tiny printed name; the wrong pad can damage a part.", simple: "Pads up. Read each pad's name before you solder." },
    { t0: 15, text: "<b>Video transmitter cable</b> (it unplugs from the video transmitter), pads along the left side: <b>red to 9V</b>, <b>both blacks to GND</b>, <b>yellow (video) to VTX</b>, <b>white (control) to T1</b>.", why: "9V powers it, VTX carries the picture, T1 lets the flight controller change its settings.", simple: "Red 9V, blacks GND, yellow VTX, white T1." },
    { t0: 27, text: "The <b>orange</b> (5 V out) and <b>green</b> (audio) wires are not used: <b>cut each one short and cover it with heat shrink</b>, so it touches nothing.", why: "A loose bare wire can short something.", simple: "Cut orange and green short and cover them." },
    { t0: 32, text: "<b>Finder cable</b> (it unplugs from the Finder). Before you solder, check the <b>BP pad on your board matches the diagram</b>. Then <b>BZ to BP</b> (the buzzer pad), <b>GND to the G pad just below BP</b>, <b>5V to the 5V pad just below that G</b>.", why: "That is the buzzer hook-up GEPRC draws on its diagram.", simple: "Find BP on the diagram and on the board. BZ to BP, then the two pads just below it." },
    { t0: 40, text: "<b>Pi power lead</b> from Stage 1. First <b>check its length</b>: it must reach where the Pi sits under the bottom plate, without pulling tight. If it does not, stop and ask. Then <b>+ to 5V, - to GND</b> on the <b>GND / 5V / LED group in the bottom right corner</b>: a different group from the Finder's. Leave its micro-USB end free and tape it out of the way: it goes into the Pi in Step 7.", why: "Too short is hard to fix once it is soldered; the two groups must not get mixed up.", simple: "Check it reaches (if not, stop and ask). Then + to 5V, - to GND, bottom right. Tape the plug end out of the way." },
    { t0: 50, text: "<b>Camera</b>: try the stack box's camera cable. If it plugs into the camera <b>and</b> the 3-pin socket marked CAM, G, 5V (socket face), solder nothing. If no cable fits both, <b>stop and ask</b> (send a photo) before you mount the board.", why: "Which cable to cut, and how long, depends on what is in the boxes.", simple: "Camera cable fits? Good. Doesn't fit? Stop and ask." },
    { t0: 56, text: "<b>Tug each wire gently</b>: it must not move. <b>No blob of solder may join two pads.</b> The video transmitter, Finder and camera stay <b>unplugged</b> until Step 4.", why: "A loose joint or a bridge between pads causes faults that are hard to find later.", simple: "Tug test, no bridges, leave the parts unplugged." },
    { t0: 61, text: "Now plug the <b>8-wire cable</b> into the ESC's 8-pin socket and the matching socket on the flight controller. It fits <b>one way only</b>: never force it.", why: "This cable carries the signals between the two boards.", simple: "Plug in the small 8-wire cable. Don't force it." },
    { t0: 67, text: "Fit the flight controller on the same four screws, <b>socket face up</b>, a <b>grommet under it</b>, <b>USB socket where you can reach it</b>. Arrow or FRONT on it? Point it to the front. Then check the <b>Pi lead still reaches</b> where the Pi will sit. <b>Before you go on</b>, no battery: meter on the beep, probes on the <b>XT60's two pins</b>. A beep that never stops is a short: find it. Between a battery wire and any motor wire: <b>no beep</b>.", more: "A short beep that stops within a few seconds is fine: it is the capacitor charging. A reading below 1 ohm that stays there is a short too. Between two wires of the same motor a beep is normal.", why: "Socket face up keeps the plugs reachable; the pads are already done. The meter checks find a short before any battery is ever plugged in.", simple: "Board on the screws, sockets up, rubber ring under it, USB reachable. Check the Pi lead still reaches. Then the meter checks on the yellow plug: a beep that won't stop is a problem." },
  ],
  async build(E, root) {
    const { THREE, V, prog, mesh, mat, staticTube } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-03-stack.glb", { at: V(10, 1.0, 0), hide: /^(battery_|meter_|smokestopper_|solder_joint)/ });
    // Picture fix, 11 Nov 2026: the guide says "a grommet under it". The model has grommets under the ESC only, so four more
    // are drawn here, on the screws between the two boards (0.86 cm above the ESC's own).
    const fcGrommets = [0, 1, 2, 3].map(i => { const g0 = m.n("stack_grommet_" + i), g = g0.clone(); g0.parent.add(g); g.visible = false; return { g, y: g0.position.y + 0.0086 }; });

    // ---- the enlarged pad-face board on the bench (W cm square), drawn from GEPRC's diagram ----
    const W = 13, O = V(-9, 0.35, 0);
    const COL = { L: 0.17, I: 0.30, R: 0.86 };
    const ROWS = { L: ["GND", "5V", "R5", "T5", "S.B", "GND", "R1", "T1", "GND", "9V", "GND", "5V", "R2", "T2"],
                   I: [null, null, "SDA", "SCL", "9V", "VTX", "T3", "R3", "G", "5V", "BP", "G", "5V", "LED"],
                   R: ["CAM", "GND", "5V", "R4", "CUR", "M4", "M3", "M2", "M1", "BAT", "GND", "GND", "5V", "LED"] };
    const rowV = i => 0.12 + i * 0.058 + (i >= 10 ? 0.02 : 0);
    const pad = (c, i) => V(O.x + (COL[c] - 0.5) * W, O.y + 0.18, O.z + (rowV(i) - 0.5) * W);
    const face = E.canvasTex(1024, 1024, (g) => {
      g.fillStyle = "#15171a"; g.fillRect(0, 0, 1024, 1024);
      g.font = "bold 30px Arial"; g.textBaseline = "middle";
      for (const c of ["L", "I", "R"]) ROWS[c].forEach((lab, i) => {
        if (!lab) return;
        const x = COL[c] * 1024, y = rowV(i) * 1024;
        g.fillStyle = "#d4a24f"; g.fillRect(x - 22, y - 20, 44, 40);
        g.fillStyle = "#f2f2f2"; g.textAlign = c === "R" ? "right" : "left";
        g.fillText(lab, c === "R" ? x - 34 : x + 30, y);
      });
      g.strokeStyle = "#f2f2f2"; g.lineWidth = 3;
      [[COL.L, 9.55], [COL.I, 9.55], [COL.R, 2.55], [COL.R, 10.55]].forEach(([u, r]) => { g.beginPath(); g.moveTo(u * 1024 - 30, (0.12 + r * 0.058 + 0.01) * 1024); g.lineTo(u * 1024 + 30, (0.12 + r * 0.058 + 0.01) * 1024); g.stroke(); });
      g.fillStyle = "#9aa3ad"; g.font = "bold 34px Arial"; g.textAlign = "center"; g.fillText("PAD FACE (enlarged)", 600, 975);
      g.strokeStyle = "#d4a24f"; g.lineWidth = 10; [[90, 90], [934, 90], [90, 934], [934, 934]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 34, 0, 7); g.stroke(); });
    });
    const board = mesh(new THREE.BoxGeometry(W, 0.35, W), [mat(0x15171a), mat(0x15171a), new THREE.MeshStandardMaterial({ map: face.tex, roughness: 0.6 }), mat(0x15171a), mat(0x15171a), mat(0x15171a)], root);
    board.position.copy(O);

    // ---- cables: each wire runs from its pad off the board's left (or right) edge to its plug ----
    const wire = (from, toX, toZ, color, r = 0.13) => { const p0 = from.clone(), up = from.clone().add(V(0, 0.7, 0));
      const out = V(toX, O.y + 0.9, toZ); const mid = up.clone().lerp(out, 0.5).add(V(0, 0.5, 0));
      const t = staticTube(root, color, r, [p0, up, mid, out]); t.visible = false; return t; };
    const plug = (at, w, label) => { const b = mesh(new THREE.BoxGeometry(w, 0.9, 1.6), mat(0xf4f1ea), root); b.position.copy(at); b.visible = false; return b; };
    const vtxPlugAt = V(O.x - W / 2 - 4, O.y + 0.9, O.z - 1.0);
    const VTX = [["9V", "I", 4, 0xd33b2c], ["GND", "L", 5, 0x1c1c1c], ["VTX", "I", 5, 0xf2d21b], ["T1", "L", 7, 0xf5f5f5], ["GND", "L", 8, 0x2a2a2a]]
      .map(([n, c, i, col], k) => ({ n, at: pad(c, i), t: wire(pad(c, i), vtxPlugAt.x + 0.8, vtxPlugAt.z - 0.6 + k * 0.3, col), bead: makeBead(root, pad(c, i), 0.38) }));
    const vtxPlug = plug(vtxPlugAt, 1.8, "VTX");
    const stubs = [0xef7d1a, 0x2e9e4b].map((col, k) => { const s = staticTube(root, col, 0.13, [vtxPlugAt.clone().add(V(-0.2, 0, 0.9 + k * 0.4)), vtxPlugAt.clone().add(V(-1.6, 0, 1.0 + k * 0.4))]); s.visible = false;
      const hs = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12), mat(0x111111), root); hs.rotation.z = Math.PI / 2; hs.position.copy(vtxPlugAt).add(V(-1.6, 0, 1.0 + k * 0.4)); hs.visible = false; return { s, hs }; });
    const finPlugAt = V(O.x - W / 2 - 4, O.y + 0.9, O.z + 3.8);
    const FIN = [["BP", "I", 10, 0x8d949c], ["G", "I", 11, 0xa7adb4], ["5V", "I", 12, 0xc1c6cb]]   // colours unknown: grey; the tags name each wire
      .map(([n, c, i, col], k) => ({ n, at: pad(c, i), t: wire(pad(c, i), finPlugAt.x + 0.6, finPlugAt.z - 0.3 + k * 0.3, col), bead: makeBead(root, pad(c, i), 0.38) }));
    const finPlug = plug(finPlugAt, 1.2, "Finder");
    const piPlugAt = V(O.x + W / 2 + 3.5, O.y + 0.9, O.z + 5.2);
    const PI = [["5V", "R", 12, 0xd33b2c], ["GND", "R", 11, 0x1c1c1c]]
      .map(([n, c, i, col], k) => ({ n, at: pad(c, i), t: wire(pad(c, i), piPlugAt.x - 0.5, piPlugAt.z - 0.2 + k * 0.4, col), bead: makeBead(root, pad(c, i), 0.38) }));
    const piPlug = mesh(new THREE.BoxGeometry(1.1, 0.5, 0.8), mat(0x9aa0a6, { metalness: 0.6, roughness: 0.3 }), root); piPlug.position.copy(piPlugAt); piPlug.visible = false;

    const ov = [V(-9, 20, 13), V(-9, 0, 0.5)], left = [V(-15, 11, 6), V(-11, 0.5, -1)], fin = [V(-14, 10, 11), V(-11, 0.5, 4)],
          right = [V(-2, 11, 11), V(-3, 0.5, 4.5)], cam = [V(-3, 10, 2), V(-3.5, 0.5, -5)], stack = [V(4, 8, 10), V(10, 2.2, 0)], wide = [V(1, 16, 16), V(10, 4, 0)];
    const stubCam = [vtxPlugAt.clone().add(V(2.5, 6, 6)), vtxPlugAt.clone().add(V(-0.8, 0, 1))];
    // the 8-wire cable from the ESC's 8-pin socket (front edge, across from the battery pads) up to the flight controller
    const cable8 = E.liveTube(root, 0xdcdcdc, 0.14);
    const cableMid = new THREE.Vector3();
    let st = {};
    return {
      cams: [[0, V(-2, 18, 16), V(2, 1, 0)], [7.4, V(-2, 18, 16), V(2, 1, 0)], [8.4, ...ov], [14.4, ...ov], [15.4, ...left], [26.6, ...left], [27.4, ...stubCam], [31.4, ...stubCam], [32.4, ...fin], [39.4, ...fin],
             [40.4, ...right], [49.4, ...right], [50.4, ...cam], [55.4, ...cam], [56.4, ...ov], [60.4, ...ov], [61.4, ...wide], [67.4, ...wide], [68.4, ...stack], [76, ...stack]],
      tags: [
        { text: "Pads face DOWN once mounted", cls: "red", at: () => m.at("stack_fc").add(V(0, 1.6, 0)), from: 0.6, to: 8 },
        { text: "Pad face up, read each label", cls: "blue", at: () => O.clone().add(V(0, 2.5, -W / 2)), from: 8.6, to: 15 },
        { text: "red 9V", cls: "red", at: () => VTX[0].at.clone().add(V(0.6, 1.4, -0.4)), from: 17, to: 27 },
        { text: "yellow VTX", cls: "warn", at: () => VTX[2].at.clone().add(V(0.8, 1.4, 0.2)), from: 20, to: 27 },
        { text: "white T1", cls: "blue", at: () => VTX[3].at.clone().add(V(-1.6, 1.4, 0)), from: 22, to: 27 },
        { text: "both blacks GND", cls: "blue", at: () => VTX[1].at.clone().add(V(-1.8, 1.4, 0)), from: 24, to: 27 },
        { text: "orange + green: cut short, heat shrink", cls: "warn", at: () => vtxPlugAt.clone().add(V(-1.5, 1.2, 1.2)), from: 27.6, to: 32 },
        { text: "BZ to BP (find BP on YOUR board first)", cls: "blue", at: () => FIN[0].at.clone().add(V(1.0, 1.3, 0)), from: 33, to: 40 },
        { text: "G and 5V just below BP", cls: "blue", at: () => FIN[2].at.clone().add(V(1.6, 1.3, 0.4)), from: 35, to: 40 },
        { text: "Check it reaches the Pi first", cls: "warn", at: () => piPlugAt.clone().add(V(0, 1.5, 0)), from: 40.6, to: 44 },
        { text: "+ 5V, - GND (bottom right group)", cls: "blue", at: () => PI[0].at.clone().add(V(1.2, 1.4, 1.6)), from: 44, to: 50 },
        { text: "CAM pads: solder nothing here. No cable fits? Stop and ask first", cls: "warn", at: () => pad("R", 0).add(V(-2.6, 1.4, 0)), from: 50.6, to: 56 },
        { text: "Tug test. No bridges.", cls: "good", at: () => O.clone().add(V(0, 2.6, 0)), from: 56.6, to: 61 },
        { text: "8-wire cable (front edge): one way only", cls: "blue", at: () => cableMid.clone().add(V(0, 0.8, 0)), from: 62, to: 67 },
        { text: "Socket face up, grommet under", cls: "good", at: () => m.at("stack_fc").add(V(0, 1.2, 0)), from: 68, to: 72 },
        // the USB socket's side is drawn from the model and may not match the board (the maker's diagram puts it on the other side): say so
        { text: "USB reachable. Which side: check yours", cls: "good", at: () => m.at("stack_fc_usb").add(V(0, 0.8, 0)), from: 72, to: 76 },
        { text: "Then the meter check on the plug's two pins (no battery)", cls: "warn", at: () => m.at("stack_esc").add(V(-5, -0.6, 1.5)), from: 73.5, to: 76 },   // low, by the battery lead: clear of the USB socket and its label
      ],
      update(t) {
        const seq = (arr, a, step) => arr.forEach((w, i) => { const k = prog(t, a + i * step, a + i * step + step * 0.8); w.t.visible = k > 0.05; w.bead(k); });
        seq(VTX, 16, 2.0); vtxPlug.visible = t >= 16;
        stubs.forEach(({ s, hs }) => { s.visible = t >= 16; hs.visible = t >= 29; });
        seq(FIN, 33.5, 1.8); finPlug.visible = t >= 33.5;
        seq(PI, 45, 1.8); piPlug.visible = t >= 41;
        m.n("stack_esc_fc_cable").visible = t >= 62;
        m.shift(/^stack_fc/, V(0.02, 0.035, 0).multiplyScalar(1 - prog(t, 68, 70.5)));
        // a grommet drops onto each screw before the board comes down; the nuts go on after it (picture fix, 11 Nov 2026)
        fcGrommets.forEach(({ g, y }, i) => { const k = prog(t, 67.1 + i * 0.12, 67.7 + i * 0.12); g.visible = t >= 67.1; g.position.y = y + 0.03 * (1 - k); });
        [0, 1, 2, 3].forEach(i => { m.n("stack_screw_" + i + "_nut").visible = t >= 70.5; });
        m.n("stack_fc").visible = m.n("stack_fc_usb").visible = t < 8 || t >= 61.5;   // held just above the stack while the 8-wire cable goes in, then lowered
        // drawn AFTER the board has moved this frame, so the cable always ends on it
        { const esc = m.at("stack_esc"), fc = m.at("stack_fc"), on = t >= 62;
          const a = esc.clone().add(V(1.7, 0.25, 0)), b = fc.clone().add(V(1.7, -0.1, 0));
          cableMid.copy(a).lerp(b, 0.5).add(V(1.2, 0, 0));
          const tube = cable8(on ? [a, a.clone().add(V(0.9, 0.4, 0)), b.clone().add(V(0.9, -0.2, 0)), b] : [a, a.clone().add(V(0.01, 0, 0))]); tube.visible = on; }
        const done = ws => ws.filter(w => w.t.visible).length;
        st = { vtxWires: done(VTX), finderWires: done(FIN), piWires: done(PI), shrink: stubs.every(x => x.hs.visible),
               cable: m.n("stack_esc_fc_cable").visible, fcOn: m.n("stack_fc").visible && m.n("stack_fc").position.distanceTo(m.home("stack_fc").p) < 1e-4,
               solderedBeforeCable: done(VTX) === 5 && done(FIN) === 3 && done(PI) === 2 && !m.n("stack_esc_fc_cable").visible };
      },
      state() { return st; },
    };
  },
};
