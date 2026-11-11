// Stage 1: check the iron's polarity, set up safely, plug in, heat, first melt.
// Source: the guide's Stage 1 iron text + Shad's photos of the SH72 (drawing "(-)-C-(+) DC5525 12-24V"
// near the back, temperature wheel 200-420, DC socket at the back) and the SNT-2405 adapter label.
import * as K from "../kit-bench.js";
export default {
  T: 50,
  steps: [
    { t0: 0,  text: "Find the small drawing on your iron, <b>near the back end</b>, next to DC5525 12-24V.", why: "The iron's drawing tells you which part of its socket is + and which is -.", simple: "Look near the back end of the iron, next to DC5525 12-24V. There's a small drawing of three circles." },
    { t0: 6,  text: "It shows <b>the middle is +</b>. Your adapter's label shows the same drawing. <b>Same = polarity check passed.</b> (If yours differed: don't plug in, message the shop.)", why: "If both drawings say the middle is +, the adapter and the iron match and are safe to connect.", simple: "Your adapter's label has the same drawing. Same drawing = they fit together safely." },
    { t0: 12, text: "<b>Safety glasses on.</b> Check the frame says Z87 or CSA. Open a window and switch a fan on.", why: "Hot solder can spit, and the smoke from it isn't good to breathe.", simple: "Put your safety glasses on. Open a window and turn a fan on." },
    { t0: 17, text: "Stand on the <b>tile</b>, sponge <b>damp</b> (not dripping). Iron rests on the stand's <b>wire holder</b>, tip off the far end.", why: "The iron is hot enough to burn things. The stand holds it safely and the damp sponge cleans the tip.", simple: "Put the black stand on something that can't burn. Wet the yellow sponge and squeeze it out. Rest the iron on the wire holder." },
    { t0: 23, text: "Check the tip is in <b>all the way</b>: unscrew the silver front nose, push the tip in past the little lip until it stops, screw the nose back on. (If it isn't, the iron stays cold.) Then push the adapter's <b>round plug into the socket at the back</b>.", why: "The tip only gets power when it's pushed all the way in. The round plug brings the power from the adapter.", simple: "Unscrew the silver front, push the tip in until it stops, screw the front back on. Then push the adapter's round plug into the back of the iron." },
    { t0: 28, text: "Plug the adapter into the wall. Turn the <b>small wheel to 350</b> to start (marked 200 to 420). If solder won't melt within a second later, go to <b>400</b>. (A common starting point, not from the SH72 manual.)", why: "350 is a common starting point. If solder will not melt there, 400 is the next try.", simple: "Plug the adapter into the wall. Turn the small wheel until 350 lines up with the little triangle." },
    { t0: 33, text: "<b>Wait for it to heat.</b> Every so often touch a little solder to the tip: <b>when it melts at once, it's ready</b>. Time it the first time and write the time down.", why: "Solder only flows well when the iron is fully hot.", simple: "Wait a moment, then touch a little solder to the tip. When it melts straight away, it's ready." },
    { t0: 39, text: "Touch a little solder to the tip. It should <b>melt at once</b>: the iron is hot enough.", why: "This quick test proves the iron is ready before you touch a board.", simple: "Touch the solder wire to the tip. It should turn liquid immediately." },
    { t0: 46, text: "Put the iron <b>back in its stand</b>, every time you let go of it.", why: "A hot iron left on a table can burn you, the table or a cable.", simple: "Every time you let go of the iron, put it back on its stand." },
  ],
  build(E, root) {
    const { THREE, V, prog, poseTrack, pose } = E;
    E.makeBench(root);
    K.makeTile(root, V(2, 0, -2), 22);
    const stand = K.makeStand(root, V(3, 0.7, -4));
    const iron = K.makeIron(root);
    // 11 Nov (pictures, row 9): the silver front nose, and the tip with its shaft, so the tip check can be shown
    const nose = E.mesh(E.alongX(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 24)), E.M.metal, iron.group); nose.position.x = -4.4;
    const tipParts = [iron.group.children[0], iron.group.children[1]], tipHome = tipParts.map(o => o.position.x);
    const adapter = E.makeAdapter(root, V(-14, 0, -10));
    const mains = E.makeMains(root, V(8, 6, -19.85));
    const plug = E.makeBarrelPlug(root);
    const dcCable = E.liveTube(root, 0x1b1d20, 0.22);
    const glasses = K.makeGlasses(root);
    const solder = K.makeSolderStick(root, 3);
    const H = stand.holdPose();
    // 11 Nov (pictures, rows 8 and 9): where the wheel and the tip are once the iron rests in the stand, for the two close-ups
    const wheelStand = V(-12.2, 0.95, 0).applyQuaternion(H.q).add(H.p), tipStand = H.p.clone();
    const wheelCam = [wheelStand.clone().add(V(4.5, 5, 6.5)), wheelStand.clone()], tipCam = [tipStand.clone().add(V(7, 5.4, 8.6)), tipStand.clone().add(V(0, 0.4, 2.6))];
    const IR = {
      table: pose(V(6, 0.65, 9), V(1, 0, 0)),
      stand: { p: H.p, q: H.q },
      hand: pose(V(2, 3.4, 5), V(0.55, -0.65, 0.5)),
    };
    const tipHand = IR.hand.p.clone();
    const SO = { away: pose(V(-6, 0.3, 14), V(1, 0, -0.2)), near: pose(tipHand.clone().add(V(-3.2, 0.6, 2.2)), V(0.8, -0.15, -0.55)), touch: pose(tipHand.clone().add(V(-0.25, 0.08, 0.2)), V(0.8, -0.15, -0.55)) };
    const GL = { table: pose(V(-6, 0.3, 6), V(1, 0, 0)) };
    let st = {};
    return {
      cams: [
        [0, V(-13, 2.6, 14), V(-9.5, 0.6, 9)], [5.6, V(-13, 2.6, 14), V(-9.5, 0.6, 9)],
        [6.8, V(-8, 22, 18), V(-6, 0.5, -1)], [11.4, V(-8, 22, 18), V(-6, 0.5, -1)],
        [12.4, V(0, 14, 30), V(0, 3, 2)], [16.6, V(0, 14, 30), V(0, 3, 2)],
        [17.6, V(14, 14, 18), V(2, 3, -3)], [22.6, V(14, 14, 18), V(2, 3, -3)],
        [23.2, ...tipCam], [24.9, ...tipCam], [25.7, V(9, 9, 17), V(3.5, 3.6, 8)], [27.6, V(9, 9, 17), V(3.5, 3.6, 8)],
        [28.6, V(-4, 16, 16), V(1, 5, -10)], [30.2, V(-4, 16, 16), V(1, 5, -10)], [31, ...wheelCam], [32.6, ...wheelCam],
        [33.6, V(12, 8, 12), V(3, 2.4, -4)], [38.6, V(12, 8, 12), V(3, 2.4, -4)],
        [39.6, V(6, 6, 13), V(2, 3.2, 5)], [45.6, V(6, 6, 13), V(2, 3.2, 5)],
        [46.6, V(14, 14, 18), V(2, 3, -3)], [50, V(14, 14, 18), V(2, 3, -3)],
      ],
      tags: [
        { text: "This drawing: the middle is +", cls: "good", at: () => iron.labelAt(), from: 1, to: 6 },
        { text: "Iron: middle is +", cls: "good", at: () => iron.labelAt(), from: 7, to: 12 },
        { text: "Adapter: middle is +", cls: "good", at: () => adapter.group.localToWorld(V(-3, 3.6, 1.5)), from: 7.6, to: 12 },
        { text: "Glasses on", cls: "blue", at: () => V(0, 6, 12), from: 12.6, to: 15.4 },
        { text: "Window open, fan on", cls: "blue", at: () => V(0, 12, -18), from: 14.4, to: 17 },
        { text: "Damp sponge", at: () => stand.spongeAt(), from: 18, to: 23 },
        { text: "Iron on the wire holder", at: () => iron.group.localToWorld(V(-6, 0.9, 0)), from: 20.4, to: 23 },
        { text: "Unscrew the silver nose", at: () => iron.group.localToWorld(V(-3.4, 0.7, 0)), from: 23.8, to: 24.5 },
        { text: "Push the tip in until it stops", cls: "good", at: () => iron.group.localToWorld(V(-1.2, 0.6, 0)), from: 24.5, to: 25.6 },
        { text: "Round plug into the back", at: () => iron.back().add(V(0, 0.5, 0)), from: 25.6, to: 28 },
        { text: "Into the wall", at: () => mains.outlet.clone().add(V(0, 5.5, 1)), from: 29, to: 30.8 },
        { text: "Wheel to 350", cls: "warn", at: () => iron.wheelAt(), from: 31.4, to: 33 },
        { text: "Heating: time it, write it down", cls: "warn", at: () => iron.group.localToWorld(V(-1, 1.2, 0)), from: 34, to: 39 },
        { text: "Melts at once = hot enough", cls: "good", at: () => tipHand.clone().add(V(0, 1.0, 0)), from: 42.4, to: 46 },
        { text: "Back on the stand", cls: "blue", at: () => iron.group.localToWorld(V(-6, 0.9, 0)), from: 47.6, to: 50 },
      ],
      update(t) {
        poseTrack(iron.group, t, [[18, IR.table], [20.4, IR.stand], [39.2, IR.stand], [40.6, IR.hand], [46, IR.hand], [47.6, IR.stand]]);
        // glasses: rise toward the viewer and disappear (= put on)
        const gk = prog(t, 12.6, 14.4);
        glasses.position.lerpVectors(V(-16, 0.3, 5), V(0, 9, 26), gk); glasses.visible = gk < 0.98;
        glasses.rotation.set(-0.3 * (1 - gk), 0, 0);
        // round plug follows the iron's back: 4 cm away, then pushed in
        const back = iron.back(), bdir = V(-1, 0, 0).applyQuaternion(iron.group.quaternion);
        // the round plug lies on the table, is carried to the back of the iron (25-26 s, after the tip check), then pushed in
        const inK = prog(t, 26, 26.9), carry = prog(t, 25, 26);
        // tip check (23.8-25.5 s): the nose is unscrewed, the tip is pushed in until it stops, the nose goes back on
        const noseOff = prog(t, 23.8, 24.3) * (1 - prog(t, 25, 25.5)), tipOut = prog(t, 24.1, 24.4) * (1 - prog(t, 24.6, 24.9));
        nose.position.x = -4.4 + 1.5 * noseOff; tipParts.forEach((o, i) => { o.position.x = tipHome[i] + 0.5 * tipOut; });
        const tableP = V(-12, 0.62, 2), tableQ = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), V(-1, 0, 0));
        const nearP = back.clone().addScaledVector(bdir, 4), nearQ = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), bdir);
        if (carry < 1) { plug.position.lerpVectors(tableP, nearP, carry); plug.position.y += Math.sin(carry * Math.PI) * 3; plug.quaternion.slerpQuaternions(tableQ, nearQ, carry); }
        else { plug.position.copy(back).addScaledVector(bdir, 4 * (1 - inK) - 0.55); plug.quaternion.copy(nearQ); }
        const pEnd = plug.localToWorld(V(3.5, 0, 0)), pBack = plug.localToWorld(V(5.5, 0, 0));
        const out = adapter.dcOut();
        const cpts = [pEnd, pBack];
        if (pBack.y > 1.0) cpts.push(V(pBack.x, Math.max(0.3, pBack.y * 0.3), pBack.z));
        cpts.push(V((pBack.x + out.x) / 2, 0.3, (pBack.z + out.z) / 2), V(out.x - 2.5, 0.3, out.z), V(out.x - 0.9, out.y - 0.3, out.z), out);
        dcCable(cpts);
        // 11 Nov (pictures, row 3): until it is plugged in (step 6) the wall plug lies on the tile in front of the socket;
        // before, it hung in the air at the socket and read as plugged in
        const wallK = prog(t, 29.3, 30.6), oy = mains.outlet.y;
        mains.outlet.y = oy + (0.06 - oy) * (1 - wallK); mains.update(adapter.inlet(), 1, wallK, 12); mains.outlet.y = oy;
        iron.setWheel(prog(t, 31.6, 32.8) * (350 - 200) / (420 - 200));   // 200 -> 350 on the 200-420 scale
        const heat = prog(t, 33.2, 38.4); iron.setHeat(heat);
        poseTrack(solder, t, [[40, SO.away], [41.4, SO.near], [42.4, SO.touch], [44.6, SO.touch], [46, SO.away]]);
        const melt = prog(t, 42.4, 43.6); iron.setBlob(t < 46 ? melt : 1);
        st = { plugged: inK >= 1, wall: wallK >= 1, heat, melt, ironInStand: iron.group.position.distanceTo(IR.stand.p) < 0.05,
               plugToBack: plug.position.distanceTo(back), glassesOn: gk >= 0.98, solderToTip: solder.position.distanceTo(iron.group.position) };
      },
      state() { return st; },
    };
  },
};
