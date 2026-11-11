// Step 2 (part 2): motors: positions, number flags, threadlocker, 16 screws, screw-length check, spin test.
// Parts from docs/models/step-02-frame.glb (real sizes). Motor wires are drawn as short stubs (colour for visibility).
import * as T from "../kit-tools.js";
export default {
  T: 54,
  steps: [
    { t0: 0,  text: "Look from <b>behind</b>, toward the front. <b>M1 rear right, M2 front right, M3 rear left, M4 front left</b> (the order Betaflight uses).", why: "The flight controller expects each motor in a set place; motors in the wrong places make it flip on take-off.", simple: "Stand behind the drone: M1 back right, M2 front right, M3 back left, M4 front left." },
    { t0: 7,  text: "Before a motor goes on, put a <b>flag of tape on its wire</b> and write its number, 1 to 4.", why: "The motors' wires all look the same; numbers stop mix-ups when you solder.", simple: "Wrap a small piece of tape round each motor's wires and write its number on it." },
    { t0: 13, text: "<b>Before the first motor goes on</b>, do the arrival test \"Motor screw length\": hold a motor screw against the arm and the motor. Use a shorter screw if it would reach the copper windings. Then a <b>small drop of blue threadlocker</b> on each motor screw's thread.", why: "A screw that's too long touches the copper coils inside and can wreck the motor. Vibration loosens screws: blue threadlocker holds them, but you can still undo them later.", simple: "First hold a screw against the arm and the motor: it must not reach the copper inside. Then put a tiny drop of the blue liquid on each screw's threads." },
    { t0: 19, text: "Screw each motor onto its arm: <b>4 screws each, 16 in all</b>, from underneath the arm.", why: "Screws from underneath the arm hold the motor on.", simple: "Hold the motor on top of the arm, put its 4 screws in from underneath, tighten." },
    { t0: 33, text: "<b>Screw length again:</b> after fitting, look from underneath. A screw must stop in the motor's base, <b>never touch the copper windings</b>. Too long: use a shorter screw with the same thread.", why: "A screw that's too long touches the copper coils inside and can wreck the motor.", simple: "Look under each motor: the screw tips must not reach the copper inside. If one does, use a shorter screw." },
    { t0: 42, text: "Twist the frame gently: nothing moves or clicks. <b>Turn each motor with one finger</b>: it turns freely (a slight magnetic bump is normal, scraping is not).", why: "This catches loose screws or rubbing motors before anything is powered.", simple: "Twist the frame gently: nothing should move. Spin each motor with a finger: it should turn smoothly." },
    { t0: 50, text: "Propellers stay in their packet. <b>No battery</b> in this step. Take a photo for the build log.", why: "Propellers can cut you badly if a motor starts by accident.", simple: "Leave the propellers in their bag, and no battery yet." },
  ],
  async build(E, root) {
    const { THREE, V, prog, poseTrack, pose } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-02-frame.glb", { at: V(0, 6.0, 0), hide: /^(arrow_front)/ });
    const box = E.mesh(new THREE.BoxGeometry(7, 5.5, 5), E.mat(0xb8a27a, { roughness: 0.9 }), root); box.position.set(-2, 2.75, 0);   // a small box holds the frame up
    const NUM = [1, 2, 3, 4];
    const screw = (n, i) => n === 2 ? `motor_screw_M2_${i}` : `M${n}_screw_${i}`;
    const parts = n => [`M${n}_base`, `M${n}_bell`, `M${n}_shaft`];
    const cut = ["cutaway_ok_arm", "cutaway_ok_base", "cutaway_ok_screw", "cutaway_ok_windings", "cutaway_bad_arm", "cutaway_bad_base", "cutaway_bad_screw", "cutaway_bad_windings"];
    // motor wire stubs with number flags (wires run from each motor toward the middle)
    const flags = NUM.map(n => {
      const b = m.at(`M${n}_base`), d = V(-b.x, 0, -b.z).normalize();
      const grp = new THREE.Group(); root.add(grp);
      const w = E.staticTube(grp, 0x151515, 0.12, [b.clone().add(V(0, -0.2, 0)), b.clone().addScaledVector(d, 2.2).add(V(0, 0.1, 0)), b.clone().addScaledVector(d, 4.2).add(V(0, 0.15, 0))], 16);
      const f = T.makeWireFlag(grp, String(n)); f.position.copy(b).addScaledVector(d, 3.2).add(V(0, 0.75, 0)); f.lookAt(f.position.clone().add(V(-1, 0, 0)));
      return { w, f, grp };
    });
    const tube = T.makeThreadlocker(root);
    const drv = T.makeHexDriver(root);
    let st = {};
    const behind = [V(-28.5, 43, 0.01), V(-2, 7, 0)];   // high behind the tail: all four motor labels in the picture, on a phone too (10 Nov audit: V(-40, 55, 0.01), V(-4.5, 7, 0); 11 Nov: a quarter closer and aimed 2.5 cm further forward, so the two front labels are not pushed against the top edge)
    const under = [V(-15, 1.2, 13), V(-5, 5, 4)];
    const cutCam = [V(11, 9, 21), V(12.8, 6.5, 11.3)];   // a little from the left, so the "OK" block stands clear of the real motor M2 (picture fix, 11 Nov 2026)
    const S1 = m.at(screw(1, 0)), S1pre = S1.clone().add(V(0, -3.5, 0));
    return {
      cams: [
        [0, ...behind], [6.4, ...behind],
        [7.4, V(-17, 16, 2), V(-6.3, 12.5, 6.3)], [12.4, V(-17, 16, 2), V(-6.3, 12.5, 6.3)],   // close on motor 1's flag from behind, to the left of the motor, so the number can be read (was a wide view)
        [13.4, S1pre.clone().add(V(-5, 1.5, 6)), S1pre.clone().add(V(0, 0.6, 0))], [18.4, S1pre.clone().add(V(-5, 1.5, 6)), S1pre.clone().add(V(0, 0.6, 0))],
        [19.4, V(-22, 25, 20), V(0, 7, 0)], [27.4, V(-22, 25, 20), V(0, 7, 0)], [28.4, ...under], [32.4, ...under],
        [33.4, ...cutCam], [41.4, ...cutCam],
        [42.4, V(-22, 21, 18), V(0, 7, 0)], [54, V(-22, 21, 18), V(0, 7, 0)],
      ],
      tags: [
        ...NUM.map(n => ({ text: ["", "M1 rear right", "M2 front right", "M3 rear left", "M4 front left"][n], cls: "blue", at: () => m.at(`M${n}_base`).add(V(0, 3.2, 0)), from: 0.6, to: 7 })),
        { text: "FRONT ↑", cls: "good", at: () => V(4.5, 7.5, 0), from: 0.6, to: 7 },   // on the body between the two front arms, below the two front motor labels (kept apart from them on every screen size)   // in this view from behind the front is at the top (the arrow used to point right)
        { text: "Number on the wire", cls: "warn", at: () => flags[0].f.position.clone().add(V(0, 5.9, 0)), from: 9, to: 13 },   // +5: the flag hangs 5 cm up with its motor until it is fitted
        { text: "First: hold a screw against the arm and motor (length test)", cls: "warn", at: () => S1pre.clone().add(V(0, 3.3, 0)), from: 13.6, to: 19 },   // one row above "Small drop on the thread" (3.9 was above the top of a desktop picture, so the label was not shown there)
        { text: "Small drop on the thread", cls: "blue", at: () => tube.group.position.clone().add(V(0, 1.2, 0)), from: 14.6, to: 19 },
        { text: "4 screws from underneath", cls: "warn", at: () => m.at(screw(1, 0)).add(V(0, -1.4, 0)), from: 28.6, to: 33 },
        { text: "OK: stops in the base", cls: "good", at: () => m.at("LBL_ok-stops-in-the-base").add(V(0, -1.2, 0)), from: 34.4, to: 42 },
        { text: "Too long: touches the copper", cls: "red", at: () => m.at("LBL_too-long-touches-the-copper"), from: 35.4, to: 42 },
        { text: "Turns freely", cls: "good", at: () => m.at("M2_bell").add(V(0, 2.6, 0)), from: 45, to: 50 },
        { text: "No props, no battery", cls: "red", at: () => V(0, 11, 0), from: 50.4, to: 54 },
      ],
      update(t) {
        // motors: off the frame until their turn; numbered flags first; threadlocker; then fitted one by one
        NUM.forEach((n, i) => {
          const k = prog(t, 19.6 + i * 2.0, 20.6 + i * 2.0);
          parts(n).forEach(p => m.slide(p, V(0, 0.05, 0), k));
          [0, 1, 2, 3].forEach(j => { const s = screw(n, j); m.slide(s, V(0, -0.035, 0), prog(t, 20.6 + i * 2.0 + j * 0.25, 21.1 + i * 2.0 + j * 0.25)); m.n(s).visible = t >= 13; m.glow(s, t >= 15 ? 1 : 0, 0x2457e0); });
          flags[i].f.visible = flags[i].w.visible = t >= 8 + i * 0.8;
          flags[i].grp.position.y = 5 * (1 - k);   // the wire and its flag hang with the motor until it is fitted
        });
        cut.forEach(c => { m.n(c).visible = t >= 33 && t < 42; });
        // threadlocker tube over M1's first screw (shown lifted below the arm)
        const TP = pose(S1pre.clone().add(V(0, 0.9, 0)), V(0.5, -1, 0.6)), TA = pose(V(-14, 0.6, 18), V(1, 0, 0));
        poseTrack(tube.group, t, [[13.2, TA], [14.4, TP], [19, TP], [19.8, TA]]);   // the tube stays to the end of step 3, so the frame the player stops on shows the drop
        tube.drop.visible = t >= 14.8 && t < 19;
        // driver under the arms while the screws go in
        const dk = (t - 20.6) / 8.2; drv.visible = dk > 0 && dk < 1;
        if (drv.visible) { const i = Math.min(15, Math.floor(dk * 16)), n = 1 + (i >> 2), j = i & 3, p = m.at(screw(n, j)); drv.position.copy(p).add(V(0, -0.35, 0)); drv.quaternion.setFromUnitVectors(V(1, 0, 0), V(0, 1, 0)); drv.rotateX((dk * 16 - i) * 12); }
        // spin test: each bell turns by finger
        NUM.forEach((n, i) => { m.n(`M${n}_bell`).rotation.y = Math.max(0, Math.min(1, (t - 44 - i * 1.3) / 1.3)) * Math.PI * 2; });
        root.rotation.y = t > 42.4 && t < 44 ? Math.sin((t - 42.4) * 8) * 0.012 : 0;
        st = { fitted: NUM.every(n => parts(n).every(p => m.n(p).position.distanceTo(m.home(p).p) < 1e-4)),
               screws: NUM.every(n => [0, 1, 2, 3].every(j => m.n(screw(n, j)).position.distanceTo(m.home(screw(n, j)).p) < 1e-4)),
               flags: flags.every(f => f.f.visible), cutaway: m.n("cutaway_ok_screw").visible };
      },
      state() { return st; },
    };
  },
};
