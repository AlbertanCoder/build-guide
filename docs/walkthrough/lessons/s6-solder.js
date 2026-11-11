// Step 6B: solder the pins, fit the HAT, lengthen the GPS cable (S6.1, S6.2, S6.2b, with S6.S's safety lines).
// Words follow the guide (index.html, after the 10 Nov audit). Parts: docs/models/step-06-payload.glb, whose GPS cable
// is already drawn cut and lengthened: per wire, the plug-side piece (cab17261_gps_wire_<colour>), the red extension
// (..._ext), the sensor-side piece (..._b) and two heat-shrunk joints (gps_cable_joint_bench_<n>_0 / _1; n = 0 red,
// 1 blue, 2 yellow, 3 black, matched by each extension's midpoint). Which side of the board the pins go through is a
// "check when it arrives" item, so the beads are drawn at the board, not on a named side. Iron: kit-bench.js.
import * as K from "../kit-bench.js";
const COLOURS = ["red", "blue", "yellow", "black"];
export default {
  T: 68,
  steps: [
    { t0: 0,  text: "<b>Safety glasses on.</b> Put the iron in its stand when you are not holding it.",
      why: "Solder can spit, and a hot iron left on the bench burns whatever touches it.",
      simple: "Glasses on. Iron in the stand when you let go of it." },
    { t0: 4,  text: "Solder the <b>straight male 1x5 header</b> onto each sensor board. (A header is a row of metal pins.) Keep the <b>right-angle socket header spare</b>. Practise first on the practice board from Stage 1.",
      why: "The pins are what the cable's ends push onto in 6C.",
      simple: "Five straight pins on each sensor board. Keep the bent one spare.",
      more: "When the sensor boards arrive, check: which side of the board the pins go through, and how the headers are supplied (loose strips or with the boards)." },
    { t0: 14, text: "Push the <b>Qwiic HAT</b> onto the Pi. (A HAT is a board that plugs onto the Pi's 40 pins.) Line up the rows of pins. <b>Press down gently and evenly</b> until it sits flat. <b>Do not wiggle it.</b>",
      why: "Wiggling bends the pins.",
      simple: "Line it up, press straight down until flat. No wiggling.",
      more: "When the HAT arrives, check: which way round it faces." },
    { t0: 21, text: "Lengthen the <b>GPS cable</b>. (The thermal camera's cable is long enough as it is.) Before you cut anything, check the cable's path with a <b>piece of string</b>. If it is longer than <b>250 mm</b>, cut longer pieces, as that test says.",
      why: "The string test is the arrival test \"GPS cable route\": it tells you how long the cable must be on the drone.",
      simple: "String along the cable's path first. Over 250 mm? Longer pieces." },
    { t0: 28, text: "Cut <b>4 pieces of silicone wire, 12 cm each</b> (longer if the string test said so). Strip about <b>5 mm</b> off each end of each piece.",
      why: "These are the extension pieces, one for each of the cable's four wires.",
      simple: "Four 12 cm wires, 5 mm bare at each end." },
    { t0: 34, text: "Work on <b>one wire at a time</b>, so each wire keeps its own colour at both ends. Cut the wires at different places, 2 cm apart: <b>red 5 cm</b> from the Qwiic plug, <b>blue 7 cm</b>, <b>yellow 9 cm</b>, <b>black 11 cm</b>. Strip about 5 mm off each cut end.",
      why: "Staggered joints keep the bundle thin and stop two bare joints sitting side by side.",
      simple: "One wire at a time. Cuts at 5, 7, 9 and 11 cm." },
    { t0: 42, text: "For each wire: slide <b>two 15 mm pieces of 3 mm heat shrink</b> onto its extension piece. <b>Solder</b> the extension piece's ends to the two cut ends. Slide one piece over each joint and <b>shrink</b> it with the iron's side or a lighter held well back, away from the Pi, the plug and the battery. <b>Only then cut the next wire.</b>",
      why: "The heat shrink must go on before you solder: afterwards it can't get past the joint.",
      simple: "Shrink tube on first, solder both ends, cover each joint, shrink. Then the next wire." },
    { t0: 54, text: "Check with the <b>multimeter</b> on its continuity (beep) setting, or its lowest resistance setting: each colour connects to the <b>same colour</b> at the far end, and <b>no two different colours</b> connect. The extension pieces are all red, so the middle of every wire is red; the two ends keep their own colour.",
      why: "A swapped or touching wire would feed the sensor the wrong signal or short its power.",
      simple: "Meter: colour to same colour beeps; different colours never beep.",
      more: "When the meter arrives, check: does it have a beep setting? Look for a sound-wave symbol next to the dial. If it does not, use its lowest resistance setting instead." },
    { t0: 62, text: "<b>Stopping point:</b> the sensor pins and the cable are done and checked with the meter. 6B is done.",
      why: "Next, 6C: connect and test.",
      simple: "Pins and cable done and checked. Stop here if you like." },
  ],
  async build(E, root) {
    const { V, prog, pose, poseTrack } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-06-payload.glb", { at: V(0, 0.5, 0), hide: /^(arrow_|pigtail_|LBL_|cab17261_thermal|cab17261_.*socket|pi_bench_supply)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    const stand = K.makeStand(root, V(16, 0.4, -10));
    const iron = K.makeIron(root); iron.setHeat(1);
    // the pins: five per board, a bead each once soldered
    const pins = [1, 2, 3, 4, 5].map(i => m.at("thermal_pin_" + i)).concat([1, 2, 3, 4, 5].map(i => m.at("gps_pin_" + i)));
    const beads = pins.map(p => K.makeBead(root, p.clone().add(V(0, 0.08, 0)), 0.09));
    // the cable joints and their heat shrink
    const J = [0, 1, 2, 3].map(n => [m.at(`gps_cable_joint_bench_${n}_0`), m.at(`gps_cable_joint_bench_${n}_1`)]);
    const jBeads = J.flat().map(p => K.makeBead(root, p, 0.07));
    // picture check 11 Nov, rows 9, 10, 11 and 28:
    // - four loose extension pieces (12 cm, red) lie on the bench from step 5; each goes away when it is soldered in
    // - every wire is drawn whole (a bridge in its own colour) until its own turn to be cut: red in step 6, the others one at a time
    // - the two sleeves wait on the extension piece, 8 mm back from its two joints, BEFORE the joints are soldered, then slide over them
    // - while the cable is cut and soldered, the Pi with its HAT and the GPS board are 4.5 cm away from its two ends
    const WIRE = { red: 0xb83b3b, blue: 0x3b6cad, yellow: 0xddc53b, black: 0x3b3b40 };   // the model's wire colours as the screen shows them
    const bridge = COLOURS.map((c, n) => { const b = E.staticTube(root, WIRE[c], 0.055, [J[n][0], J[n][1]], 2); b.visible = false; return b; });
    const loose = COLOURS.map((c, n) => { const b = E.staticTube(root, WIRE.red, 0.055, [V(-6, 0.1, 7 + n * 0.5), V(6, 0.1, 7 + n * 0.5)], 2); b.visible = false; return b; });
    const park = J.map(pair => pair.map((p, k) => pair[1 - k].clone().sub(p).normalize().multiplyScalar(0.008)));   // model metres: each sleeve waits 8 mm back from its joint, on the extension piece
    const cutAt = n => n === 0 ? 36 : 42 + n * 2.4;
    const D = V(0.55, -0.7, 0.45).normalize();
    const at = p => pose(p.clone().add(V(0, 0.05, 0)), D);
    const H = stand.holdPose(), IRS = { p: H.p, q: H.q };
    // iron keys: the ten pins (4.6 .. 12.6 s), then the eight cable joints (42.8 .. 51.6 s)
    const keys = [[0.5, IRS], [3.8, IRS]];
    pins.forEach((p, i) => { const t = 4.6 + i * 0.8; keys.push([t, at(p)], [t + 0.5, at(p)]); });
    keys.push([13.4, IRS], [42.2, IRS]);
    J.forEach((pair, n) => pair.forEach((p, k) => { const t = 42.8 + n * 2.4 + k * 1.0; keys.push([t, at(p)], [t + 0.6, at(p)]); }));
    keys.push([52.6, IRS]);
    const hatHome = m.home("hat_pcb").p.clone();
    const plug = m.at("cab17261_gps_plug");
    // the string test (21-34 s): a white string along the cable's path, plug to GPS; the cable itself stays out of
    // sight until the cut step (34 s), so nothing looks cut before the string test is done
    const gpsEnd = m.at("cab17261_gps_wire_red_b");
    const string = E.staticTube(root, 0xf4f1e8, 0.05, [plug.clone().add(V(0, 0.3, 0)), plug.clone().lerp(gpsEnd, 0.5).add(V(0, 0.6, 0)), gpsEnd.clone().add(V(0, 0.3, 0))], 30);
    const ov = [V(-12, 20, 22), V(0, 1, 0)];
    const pinCam = [V(0, 13, 19), V(0, 1.4, 4.5)];
    const hatCam = [V(6, 9, 6), V(0, 1.2, -4.4)];
    const cabCam = [V(-3, 10, 9), V(2.6, 0.9, 0.8)];
    let st = {};
    return {
      cams: [[0, ...ov], [3.4, ...ov], [4.4, ...pinCam], [13.4, ...pinCam], [14.4, ...hatCam], [20.4, ...hatCam], [21.4, ...ov], [33.4, ...ov], [34.4, ...cabCam], [61.4, ...cabCam], [62.4, ...ov], [68, ...ov]],
      tags: [
        { text: "Safety glasses on", cls: "warn", at: () => V(0, 7, 0), from: 0.5, to: 4 },
        { text: "Straight 1x5 header on each board", cls: "blue", at: () => m.at("thermal_pcb").add(V(0, 1.6, 0)), from: 5, to: 9.4 },
        { text: "Which side the pins stick out: check yours", cls: "warn", at: () => m.at("gps_pcb").add(V(0, 2.2, 0)), from: 9.6, to: 14 },
        { text: "Press evenly; no wiggling", cls: "warn", at: () => m.at("hat_pcb").add(V(0, 1.6, 0)), from: 15, to: 21 },
        { text: "String test first, along the route on the drone (250 mm)", cls: "blue", at: () => plug.clone().lerp(gpsEnd, 0.5).add(V(0, 1.6, 0)), from: 22, to: 28 },
        { text: "4 x 12 cm, 5 mm stripped", cls: "blue", at: () => V(0, 1.4, 7.75), from: 29, to: 34 },
        { text: "Red 5 cm, blue 7, yellow 9, black 11", cls: "warn", at: () => V(0.5, 0.4, 2.6), from: 35, to: 42 },
        { text: "Heat shrink on BEFORE soldering", cls: "red", at: () => J[0][1].clone().add(V(0, 1.4, 0)), from: 42.6, to: 47.8 },
        { text: "Shrink it well back from the Pi and plug", cls: "warn", at: () => J[2][1].clone().add(V(0, 1.4, 0)), from: 48, to: 54 },
        { text: "Colour to same colour: beep", cls: "good", at: () => J[3][1].clone().add(V(0, 1.4, 0)), from: 55, to: 62 },
        { text: "Different colours: never", cls: "red", at: () => J[0][0].clone().add(V(0, 1.4, 0)), from: 57, to: 62 },
      ],
      update(t) {
        poseTrack(iron.group, t, keys);
        iron.ironCord(V(30, 0, -22));
        const away = 1.5 * prog(t, 33.4, 34);   // 1.5 = the Pi with its HAT and the GPS board stand 4.5 cm back, clear of the cable's two ends
        beads.forEach((b, i) => b(prog(t, 4.8 + i * 0.8, 5.1 + i * 0.8) * (i >= 5 ? Math.max(0, 1 - away) : 1)));
        // the header pins appear on the boards just before they are soldered
        show(/^thermal_pin/, t >= 4.2); show(/^gps_pin/, t >= 4.2);
        // the HAT comes down onto the 40 pins
        show(/^hat_/, t >= 14.6);
        const hk = prog(t, 15, 18.5);
        m.n("hat_pcb").position.copy(hatHome).add(V(0, 0.03 * (1 - hk), -0.03 * away));
        m.shift(/^hat_qwiic/, V(0, 0.03 * (1 - hk), -0.03 * away));
        m.shift(/^pi_(pcb|header|usb)/, V(0, 0, -0.03 * away));
        m.shift(/^gps_(pcb|antenna|pin_)/, V(0, 0, -0.03 * away));
        // the string test is done on the drone (the route of Step 7), so no string is laid on the bench (picture check, row 8)
        string.visible = false;
        // the cable from the cut step (34 s), without the ends that go on the GPS pins in 6C
        show(/^cab17261_gps_(wire|plug)/, t >= 34);
        COLOURS.forEach((c, n) => {
          const t0 = 42.4 + n * 2.4;
          bridge[n].visible = t >= 34 && t < cutAt(n);
          loose[n].visible = t >= 28.6 && t < t0;
          show(new RegExp(`^cab17261_gps_wire_${c}_ext`), t >= t0);
          show(new RegExp(`^gps_cable_joint_bench_${n}_`), t >= t0);
          const sk = 1 - prog(t, t0 + 1.9, t0 + 2.25);   // 1 = both sleeves wait on the extension, back from the joints
          m.shift(new RegExp(`^gps_cable_joint_bench_${n}_0`), park[n][0].clone().multiplyScalar(sk));
          m.shift(new RegExp(`^gps_cable_joint_bench_${n}_1`), park[n][1].clone().multiplyScalar(sk));
          jBeads[n * 2](prog(t, t0 + 0.4, t0 + 0.6)); jBeads[n * 2 + 1](prog(t, t0 + 1.4, t0 + 1.6));
        });
        st = { string: string.visible, cable: t >= 34, pinsSoldered: beads.filter((_, i) => t >= 5.1 + i * 0.8).length, hatDown: hk >= 1,
               extensions: COLOURS.filter((c, n) => t >= 42.4 + n * 2.4).length, shrunk: COLOURS.filter((c, n) => t >= 44 + n * 2.4).length };
      },
      state() { return st; },
    };
  },
};
