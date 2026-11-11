// Stage 1: practice joints on the Eiechip practice board.
// Source: the guide's Stage 1 soldering practice (tin pads, strip 3 mm, solder wire to pads, tug,
// smooth shiny joints, iron in stand and unplug when you stop). Colours of tools are for visibility.
import * as K from "../kit-bench.js";
export default {
  T: 50,
  steps: [
    { t0: 0,  text: "<b>Safety glasses on</b>, window open, fan on. Practice board on the tile. Wipe the hot tip on the <b>damp sponge</b>.", why: "A clean tip moves heat into the pad much better.", simple: "Wipe the hot tip across the wet sponge." },
    { t0: 6,  text: "<b>Tin a pad:</b> tip on the copper pad for <b>1 to 2 seconds</b>, then feed solder onto the <b>pad</b> (not the tip). Take the solder away, then the iron: about <b>3 seconds</b> in all. A small shiny bead forms. Do a few pads.", why: "Heating the pad first makes the solder flow onto it and stick, instead of balling up on the tip.", simple: "Hold the tip on a copper pad for 1-2 seconds, touch the solder to the pad (not the tip), take the solder away, then the iron." },
    { t0: 16, text: "<b>Strip 3 mm</b> off the end of a short piece of thin wire with the stripper.", why: "Solder sticks to bare copper, not to the plastic coating.", simple: "Put the wire end in the stripper, squeeze, and pull off a 3 mm piece of plastic." },
    { t0: 23, text: "Hold the bare end on a tinned pad. Touch the iron to it until the solder <b>flows round the wire</b> (about 1 to 2 seconds). Take the iron away and keep the wire still while it sets.", why: "The pad's solder melts and wraps round the wire, joining them. Moving it while it cools makes a weak joint.", simple: "Lay the bare end on a shiny pad, touch the iron to it until the solder melts round the wire, take the iron away and hold still a few seconds." },
    { t0: 33, text: "<b>Tug the wire gently.</b> It should stay put.", why: "A gentle tug proves the joint holds before you rely on it.", simple: "Pull the wire lightly. It shouldn't move." },
    { t0: 38, text: "<b>Good joint:</b> smooth and shiny, like a small hill. <b>Redo</b> a dull ball or a lumpy blob. Repeat until three joints look smooth and shiny.", why: "Smooth and shiny means the solder flowed properly; dull or lumpy means it didn't.", simple: "Good joints look like a small shiny bump. If it's grey and round like a ball, heat it again." },
    { t0: 45, text: "When you stop: iron <b>in its stand</b>, then <b>unplug it</b> before you leave the room. <b>Wash your hands</b>: the kit's solder may contain lead, so keep food away from the bench.", why: "Never leave a hot iron alone.", simple: "When you finish: iron on the stand, then unplug it." },
  ],
  build(E, root) {
    const { V, prog, poseTrack, pose, mesh, mat, THREE } = E;
    E.makeBench(root);
    K.makeTile(root, V(0, 0, 2), 26);
    const stand = K.makeStand(root, V(8, 0.7, -5));
    const board = K.makeBoard(root, V(-2, 0.7, 4));
    const iron = K.makeIron(root); iron.setHeat(1);
    const solder = K.makeSolderStick(root, 3);
    const strip = K.makePliers(root, 0xf08a24);
    const wire = K.makeWirePiece(root, 0x2a6df4, 6, 0.3);
    const slug = mesh(E.alongX(new THREE.CylinderGeometry(0.085, 0.085, 0.3, 12)), mat(0x2a6df4), root); slug.visible = false;
    const pads = [board.pad(5, 3), board.pad(7, 3), board.pad(9, 3)];
    const beads = pads.map(p => K.makeBead(root, p, 0.22));
    // compare pair: good (low shiny hill) and bad (dull ball) on two pads lower down
    const goodAt = board.pad(3, 6), badAt = board.pad(8, 6);
    const good = K.makeBead(root, goodAt, 0.26);
    const bad = mesh(new THREE.SphereGeometry(0.27, 20, 14), mat(0x8a8d90, { roughness: 0.95, metalness: 0.2 }), root); bad.position.copy(badAt).add(V(0, 0.27, 0)); bad.visible = false;
    const joint = K.makeBead(root, pads[0], 0.28);
    const H = stand.holdPose();
    const D = V(0.55, -0.7, 0.45).normalize();                      // iron tip direction while working
    const at = (p, up = 0.05) => pose(p.clone().add(V(0, up, 0)), D);
    const SP = stand.spongeAt();
    const IR = { stand: { p: H.p, q: H.q }, spongeA: pose(SP.clone().add(V(-1.2, 0.05, 0)), V(0.3, -0.9, 0.3)), spongeB: pose(SP.clone().add(V(1.2, 0.05, 0)), V(0.3, -0.9, 0.3)),
      p0: at(pads[0]), p1: at(pads[1]), p2: at(pads[2]), j: at(pads[0].clone().add(V(0.12, 0.12, 0))), lift: at(pads[0], 3) };
    const SD = V(-0.7, -0.35, -0.6).normalize();                     // solder comes from the other side
    const sAt = p => pose(p.clone().add(V(0.3, 0.06, 0.25)), SD);
    const SO = { away: pose(V(8, 0.3, 14), V(-1, 0, 0)), p0: sAt(pads[0]), p1: sAt(pads[1]), p2: sAt(pads[2]), j: sAt(pads[0].clone().add(V(0.1, 0.1, 0))) };
    // the wire: first held by the stripper over the board edge, then laid on pad 0 coming from -x
    const W = { up: pose(V(-9, 3, 8), V(1, 0, 0)), onPad: pose(pads[0].clone().add(V(0.15, 0.1, 0)), V(1, 0, 0)), tug: pose(pads[0].clone().add(V(0.15, 0.1, 0)), V(1, 0, 0)) };
    // the stripper crosses the wire 3 mm from its end, jaws above and below it, handles pointing away from the viewer
    const STR = { away: pose(V(-22, 0.6, -6), V(0, 0, 1)), on: pose(V(-9.3, 3, 8.25), V(0, 0, 1)), pulled: pose(V(-8.3, 3, 8.25), V(0, 0, 1)) };
    const ROLL = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2);
    let st = {};
    const close = [V(-1, 5, 10), V(-1, 0.9, 3.6)];
    return {
      cams: [
        [0, V(14, 9, 10), V(6, 2, -2)], [5.4, V(14, 9, 10), V(6, 2, -2)],
        [6.4, ...close], [15.4, ...close],
        [16.4, V(-5.5, 7.5, 13), V(-9, 2.8, 7)], [22.4, V(-5.5, 7.5, 13), V(-9, 2.8, 7)],
        [23.4, ...close], [37.4, ...close],
        [38.4, V(-1, 5.5, 11), V(-1, 0.9, 5.6)], [44.4, V(-1, 5.5, 11), V(-1, 0.9, 5.6)],
        [45.4, V(16, 12, 16), V(6, 2, -3)], [50, V(16, 12, 16), V(6, 2, -3)],
      ],
      tags: [
        { text: "Wipe on the damp sponge", cls: "blue", at: () => SP.clone().add(V(0, 1.5, 0)), from: 1.4, to: 5.8 },
        { text: "Solder goes on the pad", cls: "blue", at: () => pads[0].clone().add(V(0, 1.4, 0)), from: 8.4, to: 11 },
        { text: "Shiny bead = tinned", cls: "good", at: () => pads[1].clone().add(V(0, 1.4, 0)), from: 12.6, to: 16 },
        { text: "3 mm", cls: "blue", at: () => V(-8.6, 3.8, 8), from: 18, to: 22.6 },
        { text: "Solder flows round the wire", cls: "good", at: () => pads[0].clone().add(V(0, 1.4, 0)), from: 27.4, to: 31 },
        { text: "Keep still while it sets", cls: "warn", at: () => pads[0].clone().add(V(-1.5, 1.4, 0)), from: 30.6, to: 33 },
        { text: "Gentle tug: stays put", cls: "good", at: () => pads[0].clone().add(V(-2, 1.2, 0)), from: 34, to: 38 },
        // 11 Nov (pictures, row 14): both labels sit just above their own bead; before, they floated 1 cm up and landed on the row of shiny tinned pads
        { text: "Good: smooth, shiny hill", cls: "good", at: () => goodAt.clone().add(V(0, 0.35, 0)), from: 39, to: 45 },
        { text: "Redo: dull ball", cls: "red", at: () => badAt.clone().add(V(0, 0.7, 0)), from: 39.6, to: 45 },
        { text: "Iron in its stand", cls: "blue", at: () => iron.group.localToWorld(V(-6, 0.9, 0)), from: 46, to: 50 },
        { text: "Then unplug it", cls: "warn", at: () => iron.back().add(V(0, 1.2, 0)), from: 47.4, to: 50 },
      ],
      update(t) {
        poseTrack(iron.group, t, [[0.6, IR.stand], [1.8, IR.spongeA], [3, IR.spongeB], [3.6, IR.spongeA], [4.4, IR.spongeB], [6.6, IR.p0], [11, IR.p0], [11.6, IR.p1], [13, IR.p1], [13.6, IR.p2], [15, IR.p2], [16.2, IR.stand], [23.6, IR.stand], [25.6, IR.j], [30.2, IR.j], [31.2, IR.lift], [32.4, IR.stand]]);
        poseTrack(solder, t, [[7.6, SO.away], [8.6, SO.p0], [10.2, SO.p0], [11.4, SO.p1], [12.6, SO.p1], [13.8, SO.p2], [14.8, SO.p2], [15.8, SO.away]]);   // 11 Nov (pictures, row 30): no solder is fed at the wire joint; the words say the pad's own solder flows round the wire
        beads[0](t < 26 ? prog(t, 9, 10.2) : 0); beads[1](prog(t, 11.8, 12.6)); beads[2](prog(t, 14, 14.8));
        joint(prog(t, 27.2, 29.4));
        // strip 3 mm: jaws close on the wire, slide the cut piece off
        poseTrack(strip.group, t, [[16.4, STR.away], [17.8, STR.on], [19.6, STR.on], [20.8, STR.pulled], [22, STR.away]]); strip.group.quaternion.multiply(ROLL);
        strip.close(prog(t, 17.8, 18.8) * (1 - prog(t, 21, 21.6)));
        wire.setBare(t >= 20 ? 1 : 0);
        slug.visible = t >= 20 && t < 21.4; if (slug.visible) slug.position.copy(strip.group.position).add(V(0.15, 0, -0.25));
        const tug = Math.sin(Math.max(0, t - 34) * 9) * 0.06 * (t > 34 && t < 36 ? 1 : 0);
        poseTrack(wire.group, t, [[22.6, W.up], [24.6, W.onPad]]);
        if (t > 34 && t < 36) wire.group.position.x += tug;
        good(prog(t, 38.6, 39.4)); bad.visible = t >= 39.2 && t < 45;
        iron.ironCord(V(30, 0, -22));   // the adapter's plug and cable at the iron's back
        st = { tinned: t >= 15 ? 3 : 0, bare: t >= 20, wireOnPad: wire.group.position.distanceTo(W.onPad.p) < 0.1,
               ironTipToPad: iron.group.position.distanceTo(pads[0]), ironInStand: iron.group.position.distanceTo(IR.stand.p) < 0.05,
               solderToPad0: solder.position.distanceTo(pads[0]), jointK: prog(t, 27.2, 29.4) };
      },
      state() { return st; },
    };
  },
};
