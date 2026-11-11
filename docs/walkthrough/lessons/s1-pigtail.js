// Stage 1: build the micro-USB power pigtail.
// Source: the guide's Stage 1 pigtail text. Wire colours inside a USB cable vary: the colours here are
// for visibility only (the guide says to check yours). Which end of the pin row is pin 1 is not shown as fact.
import * as K from "../kit-bench.js";
export default {
  T: 56,
  steps: [
    { t0: 0,  text: "Keep the small <b>right-angle micro-USB plug</b>. Cut off the big flat USB-A plug, leaving <b>about 20 cm</b> of cable.", why: "The small plug goes into the Pi; the cut end gets soldered to the drone later.", simple: "Cut the cable about 20 cm from the small plug. Keep the small plug side." },
    { t0: 7,  text: "<b>Strip 3 cm</b> of the outer jacket. Inside: <b>two thicker wires</b> (power) and <b>two thinner wires</b> (data).", why: "The power wires are inside the outer cover.", simple: "Carefully cut and pull off 3 cm of the outer cover to see the small wires inside." },
    { t0: 14, text: "<b>Find the + wire with a phone charger.</b> On the cut-off USB-A piece, strip back its outer cover, then strip 3 mm off its <b>two thick wires</b> and keep the bare ends <b>apart</b>. Plug it into any USB phone charger. (Both thick wires the same colour? Stop and ask.) Meter on <b>DC volts</b>: red probe on one thick wire, black on the other. <b>About 5, no minus sign</b> = the wire under the red probe is +. A minus sign = the other one. Unplug the charger.", why: "The meter can only show which wire reaches which pin; the charger shows which one is +. It is the same cable, so the same colour is + on your pigtail.", simple: "Plug the cut-off big plug into a phone charger, meter on volts on its two thick wires: about 5 with no minus sign means the red-probe wire is +. Same colour = + on your cable." },
    { t0: 24, text: "Now check where that + wire goes: dial on <b>Ω</b>. One probe pressed on the <b>copper</b> of the cut end of the + wire (same colour), the other on the <b>end pin</b> of the plug. Close to 0 on one end pin = that end is <b>pin 1 (+)</b>; pin 5 (-) is at the other end.", why: "You must know which wire is + so it goes to + on the drone. The meter tells you.", simple: "Meter on ohms. One tip on a thick wire, the other on the pin at one end of the plug. Near 0 means that wire goes to that pin." },
    { t0: 34, text: "<b>Close to 0 = connected.</b> Write down which wire is + and what the meter read. Then check the other thick wire against the other end pin.", why: "Writing it down means you never have to guess later.", simple: "When you see a number near 0, write down which wire it was. Then check the other thick wire the same way." },
    { t0: 39, text: "Wrap a small piece of <b>tape round the + wire</b>.", why: "The tape marks the + wire so you can't mix them up in Step 3.", simple: "Wrap a small piece of tape round the + wire." },
    { t0: 42, text: "Cut the two <b>thin data wires short</b> and cover each end with a piece of <b>3 mm heat shrink</b>.", why: "The thin wires aren't used. Covering them stops them touching anything.", simple: "Cut the two thin wires short and slide a small piece of heat shrink over each end." },
    { t0: 48, text: "<b>Glasses on.</b> <b>Strip 3 mm</b> off each power wire and <b>tin it</b>. Leave them loose until Step 3. Iron in its stand, unplug it, <b>wash your hands</b>.", why: "Tinned ends are quick and easy to solder to the drone later.", simple: "Strip 3 mm off each thick wire and melt a little solder onto the bare copper." },
  ],
  build(E, root) {
    const { THREE, V, prog, poseTrack, pose, mesh, mat, alongX } = E;
    E.makeBench(root, { wall: false });
    K.makeTile(root, V(-2, 0, 2), 34);
    const Y = 0.9, Z = 0;                       // cable height and line
    // micro-USB right-angle plug at x = -12, its metal end points toward -z
    const MP = new THREE.Group(); MP.position.set(-12.7, Y, Z); root.add(MP);
    mesh(new THREE.BoxGeometry(1.4, 0.7, 1.0), E.M.black, MP);
    mesh(new THREE.BoxGeometry(0.75, 0.24, 0.65), mat(0xc9cdd1, { metalness: 1, roughness: 0.3 }), MP).position.set(0, 0, -0.82);
    const face = mesh(new THREE.PlaneGeometry(0.66, 0.16), mat(0x101010), MP); face.position.set(0, 0, -1.151); face.rotation.y = Math.PI;
    const pinX = i => -0.26 + i * 0.13;
    for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.05, 0.03, 0.3), mat(0xe2b84a, { metalness: 1, roughness: 0.3 }), MP).position.set(pinX(i), -0.03, -0.98);
    const pinWorld = i => MP.localToWorld(V(pinX(i), -0.03, -1.12));
    // cable: plug -> x = 8 (20 cm), then the part that is cut off -> USB-A plug
    const J = mat(0x1b1d20, { roughness: 0.5 });
    E.staticTube(root, 0, 0.18, [V(-12, Y, Z), V(-4, Y - 0.6, Z + 1.5), V(5, Y, Z)], 40, J);
    const jacketEnd = mesh(alongX(new THREE.CylinderGeometry(0.18, 0.18, 3, 16)), J, root); jacketEnd.position.set(6.5, Y, Z);
    const offcut = new THREE.Group(); root.add(offcut);
    mesh(alongX(new THREE.CylinderGeometry(0.18, 0.18, 7, 16)).translate(3.5, 0, 0), J, offcut);
    mesh(new THREE.BoxGeometry(2.4, 0.8, 1.6), E.M.black, offcut).position.set(8.2, 0, 0);
    mesh(new THREE.BoxGeometry(1.4, 0.45, 1.2), mat(0xc9cdd1, { metalness: 1, roughness: 0.3 }), offcut).position.set(10.1, 0, 0);
    // the four wires inside the last 3 cm (x 5 -> 8)
    const W = [
      // 11 Nov (pictures, row 15): the four ends are fanned out so each wire shows from the lesson's camera (before, the
      // black hid behind the red and the white behind both), and the white one is drawn light grey: white on the white tile could not be seen
      { name: "thickA", color: 0xd02a2a, r: 0.07, dy: -0.2, dz: 0.3 },
      { name: "thickB", color: 0x222222, r: 0.07, dy: 0.1, dz: -0.1 },
      { name: "thinC", color: 0x2fa84f, r: 0.045, dy: 0.3, dz: -0.2 },
      { name: "thinD", color: 0xaab2bb, r: 0.045, dy: -0.12, dz: 0.0 },
    ];
    for (const w of W) {
      w.full = E.staticTube(root, w.color, w.r, [V(5, Y, Z), V(6, Y + w.dy * 0.6, Z + w.dz * 0.6), V(8, Y + w.dy, Z + w.dz)], 16);
      w.end = V(8, Y + w.dy, Z + w.dz);
      if (w.name.startsWith("thin")) {
        w.short = E.staticTube(root, w.color, w.r, [V(5, Y, Z), V(5.6, Y + w.dy * 0.4, Z + w.dz * 0.4), V(6.2, Y + w.dy * 0.6, Z + w.dz * 0.6)], 10); w.short.visible = false;
        w.shrink = mesh(alongX(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 14)), mat(0x5b5bd6, { roughness: 0.6 }), root); w.shrink.position.set(6.0, Y + w.dy * 0.6, Z + w.dz * 0.6); w.shrink.visible = false;
      } else {
        w.cu = mesh(alongX(new THREE.CylinderGeometry(w.r * 0.8, w.r * 0.8, 0.3, 10)), E.M.copper, root); w.cu.position.set(7.85, Y + w.dy, Z + w.dz); w.cu.visible = false;
        w.tin = mesh(alongX(new THREE.CylinderGeometry(w.r * 0.95, w.r * 0.95, 0.3, 10)), E.M.solder, root); w.tin.position.copy(w.cu.position); w.tin.visible = false;
      }
    }
    const tape = mesh(alongX(new THREE.CylinderGeometry(0.13, 0.13, 0.45, 16)), mat(0xf2d230), root); tape.position.set(6.9, Y + W[0].dy * 0.8, Z + W[0].dz * 0.8); tape.visible = false;
    const cutters = K.makePliers(root, 0xd03b3b);
    const ROLL = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2);
    const CU = { away: pose(V(14, 0.6, 14), V(0, 0, 1)), a: pose(V(8, Y, Z + 0.4), V(0, 0, 1)), thin: pose(V(6.2, Y, Z + 0.5), V(0, 0, 1)) };
    // meter + probes for finding + and -
    const meter = E.makeMeter(root, V(-6, 0.7, 15));
    const probes = E.makeProbePair(root, meter);
    const PR = { rest: pose(V(-2, 1.3, 22), V(1, 0, 0)), pin: pose(pinWorld(0).add(V(0, 0, -0.02)), V(0, 0, 1)), pinNear: pose(pinWorld(0).add(V(0, 0, -3)), V(0, 0, 1)),
                 pin5: pose(pinWorld(4).add(V(0, 0, -0.02)), V(0, 0, 1)) };
    const BK = { rest: pose(V(-2, 1.3, 23.5), V(1, 0, 0)), wire: pose(W[0].end.clone().add(V(0.02, 0, 0)), V(-1, 0, 0)), near: pose(W[0].end.clone().add(V(3, 0, 0)), V(-1, 0, 0)),
                 wireB: pose(W[1].end.clone().add(V(0.02, 0, 0)), V(-1, 0, 0)) };
    const iron = K.makeIron(root); iron.setHeat(1);
    const IR = { away: pose(V(34, 0.65, -14), V(-1, 0, 0.4)), a: pose(W[0].end.clone().add(V(-0.15, 0.08, 0.05)), V(-0.4, -0.8, -0.45)), b: pose(W[1].end.clone().add(V(-0.15, 0.08, -0.05)), V(-0.4, -0.8, 0.45)) };
    let st = {}, lcd = "off";
    const ends = [V(4, 4, 7), V(6.6, Y, Z)];
    const self = {
      cams: [
        [0, V(-2, 16, 16), V(-1, 0.5, 0)], [6.4, V(-2, 16, 16), V(-1, 0.5, 0)],
        [7.4, ...ends], [13.4, ...ends],
        [14.4, V(-15.5, 2.4, -4.4), V(-12.7, Y, -1.1)], [18.2, V(-15.5, 2.4, -4.4), V(-12.7, Y, -1.1)],
        [19.2, V(11, 3.6, 5), V(8, Y, 0)], [21.4, V(11, 3.6, 5), V(8, Y, 0)],
        [22.4, V(-6, 10.5, 19), V(-6, 3, 11)], [28.4, V(-6, 10.5, 19), V(-6, 3, 11)],
        [29.4, ...ends], [45.4, ...ends], [46, ...ends],
      ],
      tags: [
        { text: "Keep this plug", cls: "good", at: () => MP.localToWorld(V(0, 0.8, 0)), from: 0.6, to: 7 },
        { text: "About 20 cm", cls: "blue", at: () => V(-2, Y + 0.8, 1.2), from: 1.6, to: 7 },
        { text: "Cut here", cls: "red", at: () => V(8, Y + 1, Z), from: 2.2, to: 5 },
        { text: "2 thick = power, 2 thin = data", cls: "good", at: () => W[2].end.clone().add(V(0, 0.3, 0)), from: 10, to: 14 },   // 11 Nov (pictures, row 16): one label; the two it replaces lay on top of each other
        { text: "Colours vary: check yours", cls: "warn", at: () => V(6.2, Y + 1.4, -0.8), from: 11.4, to: 14 },
        { text: "End pin (one end of the row of five)", cls: "red", at: () => pinWorld(0).add(V(0, 0.4, 0)), from: 15.4, to: 19 },
        { text: "Cut end of a thick wire", at: () => W[0].end.clone().add(V(0, 0.5, 0)), from: 19.6, to: 22 },
        { text: "Close to 0 = this wire goes to that pin", cls: "good", at: () => meter.lcdAt(), from: 23.2, to: 29 },
        { text: "Tape = the + wire", cls: "warn", at: () => tape.position.clone().add(V(0, 0.9, 0)), from: 29.8, to: 32 },
        { text: "Data wires cut short", cls: "blue", at: () => V(6.2, Y + 0.6, 0), from: 33.4, to: 35 },
        { text: "3 mm heat shrink on each", cls: "blue", at: () => W[2].shrink.position.clone().add(V(0, 0.4, 0)), from: 35, to: 38 },
        // 11 Nov (pictures, row 33): the two labels take turns beside the wire ends; before, the second sat on the tinned ends
        { text: "3 mm bare, then tinned", cls: "good", at: () => W[0].end.clone().add(V(1.3, 0.3, 0)), from: 39.6, to: 43.6 },
        { text: "Leave loose until Step 3", cls: "blue", at: () => W[0].end.clone().add(V(1.3, 0.3, 0)), from: 43.6, to: 46 },
      ],
      update(t) {
        // 1. cut the USB-A plug off at x = 8
        poseTrack(cutters.group, t, [[1.6, CU.away], [2.8, CU.a], [4.2, CU.a], [5.4, CU.away], [32.4, CU.away], [33.4, CU.thin], [34.2, CU.thin], [35, CU.away]]);
        cutters.group.quaternion.multiply(ROLL);
        cutters.close(Math.max(prog(t, 3, 3.8) * (1 - prog(t, 4.2, 4.6)), prog(t, 33.4, 33.8) * (1 - prog(t, 34.2, 34.5))));
        const off = prog(t, 4.2, 6.2); offcut.position.set(8 + 0.01 + off * 3, Y, Z + off * 4); offcut.visible = off < 0.99;
        // 2. strip 3 cm of jacket: the end piece slides off and the wires show
        const sj = prog(t, 8, 9.6); jacketEnd.position.x = 6.5 + sj * 3.5; jacketEnd.visible = sj < 0.99;
        const shown = t >= 8.2;
        for (const w of W) {
          const thin = w.name.startsWith("thin"), cut = thin && t >= 33.8;
          w.full.visible = shown && !cut;
          if (thin) { w.short.visible = cut; w.shrink.visible = cut && t >= 34.8; if (w.shrink.visible) w.shrink.position.x = 6.6 - prog(t, 34.8, 36) * 0.5; }
          else { w.cu.visible = t >= 39; w.tin.visible = t >= 41.6 + (w.name === "thickB" ? 1.6 : 0); }
        }
        tape.visible = t >= 29.6;
        // 3. probes: red on the end pin, black on thick wire A
        poseTrack(probes.red, t, [[14.6, PR.rest], [15.6, PR.pinNear], [16.6, PR.pin], [26.2, PR.pin], [26.8, PR.pin5], [29, PR.pin5], [29.6, PR.rest]]);
        poseTrack(probes.black, t, [[17.6, BK.rest], [19, BK.near], [20, BK.wire], [26.2, BK.wire], [26.8, BK.wireB], [29, BK.wireB], [29.6, BK.rest]]);
        probes.update();
        // 11 Nov (pictures, row 5): the second check stays on the meter until the step ends (it stopped on OL under "Close to 0");
        // OL only while the probes are in the air between the two checks
        const touching = (t >= 20 && t < 26.2) || (t >= 26.8 && t < 29);
        meter.turn("offR", "ohm", prog(t, 14.4, 15.4)); if (t >= 29) meter.turn("ohm", "offR", prog(t, 29, 29.6));
        lcd = t < 15.4 || t >= 29.6 ? "off" : touching ? "0.2 Ω" : "OL Ω"; meter.setLcd(lcd);
        // 6. tin the power wires
        poseTrack(iron.group, t, [[40, IR.away], [41, IR.a], [41.8, IR.a], [42.6, IR.b], [43.4, IR.b], [44.4, IR.away]]);
        iron.ironCord(V(44, 0, -22));   // the adapter's plug and cable at the iron's back
        st = { lcd, cut: off >= 0.99, stripped: sj >= 0.99, redOnPin: probes.red.position.distanceTo(pinWorld(0)) < 0.1, blackOnWire: probes.black.position.distanceTo(W[0].end) < 0.1,
               tape: tape.visible, thinShort: t >= 33.8, shrink: t >= 34.8, tinned: t >= 43.2 };
      },
      state() { return st; },
    };
    // ---- 8 Nov: a 10 s "find + with a phone charger" step is inserted at 14 s (audit finding P1). Everything that
    // was at or after 14 s plays 10 s later; during 14-24 s the meter shows the charger reading on DC volts.
    const SH = 14, D = 10, late = x => (x >= SH ? x + D : x);
    const lesson = self;
    // the charger check: a USB phone charger, the cut-off USB-A piece plugged into it, its two thick wires stripped
    // (bare ends apart), red probe on one, black on the other
    const CH = new THREE.Group(); root.add(CH); CH.visible = false;
    { const at = V(15, 0.7, 9);
      mesh(new THREE.BoxGeometry(4.2, 3.2, 4.2), mat(0xd9dde1, { roughness: 0.7 }), CH).position.copy(at).add(V(0, 1.6, 0));
      mesh(new THREE.BoxGeometry(1.9, 0.75, 1.4), mat(0xa9afb5, { metalness: 0.6, roughness: 0.3 }), CH).position.copy(at).add(V(-2.6, 1.6, 0));
      E.staticTube(CH, 0x1c1c1c, 0.22, [at.clone().add(V(-3.5, 1.6, 0)), V(10, 1.6, 10.5), V(9, 1.0, 12.4)]); }
    const WP = V(6.6, 0.95, 11.0), WN = V(6.6, 0.95, 14.4);   // the two stripped thick-wire ends, apart
    E.staticTube(CH, 0xd33b2c, 0.1, [V(9, 1.0, 12.4), V(8, 0.95, 11.2), WP]);
    E.staticTube(CH, 0x1c1c1c, 0.1, [V(9, 1.0, 12.4), V(8, 0.95, 14.2), WN]);
    [WP, WN].forEach(p => mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), E.M.copper, CH).position.copy(p).add(V(-0.15, 0, 0)));
    lesson.cams = lesson.cams.map(([t, ...r]) => [late(t), ...r]);
    { const eye = V(3, 20, 32), aim = V(3.5, 0.6, 12.5);
      lesson.cams.push([SH + 0.6, eye, aim], [SH + D - 0.6, eye, aim]); lesson.cams.sort((x, y) => x[0] - y[0]); }
    lesson.tags = lesson.tags.map(g => ({ ...g, from: late(g.from), to: g.to > SH ? g.to + D : g.to }));   // a tag ending at 14 s keeps ending there
    lesson.tags.push({ text: "About 5 V, no minus sign = red-probe wire is +", cls: "good", at: () => meter.lcdAt(), from: 18, to: 24 });
    // 11 Nov (pictures, row 17): one probe label, shown before the reading label (the black one sat on the black wire's bare end,
    // and on a phone the reading label was half covered); the probes and the labels now stay until the step ends
    lesson.tags.push({ text: "Red probe on one thick wire, black on the other", cls: "red", at: () => WP.clone().add(V(0.6, 1.0, -1.6)), from: 16, to: 18 });
    lesson.tags.push({ text: "Bare ends apart", cls: "warn", at: () => WP.clone().lerp(WN, 0.5).add(V(-1.4, 0.5, 0)), from: 14.6, to: 16 });
    lesson.tags.push({ text: "Phone charger", cls: "blue", at: () => V(15, 4.5, 9), from: 14.6, to: 24 });
    const upd = lesson.update.bind(lesson), base = lesson.state;
    let extra = {};
    lesson.update = t => {
      CH.visible = t >= SH && t < SH + D;
      cutters.group.visible = !CH.visible;   // the cutters rest where the charger stands: hide them during this step
      if (t >= SH && t < SH + D) { upd(SH - 0.01);
        const tipP = WP.clone().add(V(-0.12, 0.05, 0)), tipN = WN.clone().add(V(-0.12, 0.05, 0));
        poseTrack(probes.red, t, [[SH + 0.4, PR.rest], [SH + 1.4, pose(tipP, V(1, -0.25, 0))], [SH + D, pose(tipP, V(1, -0.25, 0))]]);
        poseTrack(probes.black, t, [[SH + 0.2, BK.rest], [SH + 1.2, pose(tipN, V(1, -0.25, 0))], [SH + D, pose(tipN, V(1, -0.25, 0))]]);
        probes.update();
        const onW = probes.red.position.distanceTo(tipP) < 0.1 && probes.black.position.distanceTo(tipN) < 0.1;
        meter.turn("offR", "dcV", prog(t, SH, SH + 0.8)); meter.setLcd(onW ? "5.01 V" : "0.00 V"); extra = { chargerStep: true, probesOnWires: onW, lcd: meter.lcd }; }
      else { upd(t >= SH ? t - D : t); extra = {}; }
    };
    lesson.state = () => ({ ...base(), ...extra });
    return lesson;
  },
};
