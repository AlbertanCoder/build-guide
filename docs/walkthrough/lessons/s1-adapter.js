// Stage 1: test the power adapter before the iron is ever plugged in.
// Source: the guide's Stage 1 adapter test, corrected for Shad's real parts
// (ZOYI VC921 has built-in leads, no sockets; the barrel plug has a hole in the middle).
export default {
  T: 35,
  steps: [
    { t0: 0,    text: "Turn the dial to the <b>V with a straight line</b> (DC volts). The screen shows DC and AUTO.", why: "The adapter gives steady power (DC), so you measure it on DC volts.", simple: "Turn the knob to the V with the straight line." },
    { t0: 5,    text: "Look at the round plug: a <b>metal ring</b> on the outside, and a <b>small hole with metal inside</b> it.", why: "You need to know which metal part is the middle and which is the outside, so the probes go in the right places.", simple: "Look at the end of the round plug: a metal ring outside, and a hole in the middle with metal inside it." },
    { t0: 10.4, text: "Plug the power cord into the adapter, then <b>plug it into the wall</b>.", why: "The adapter only gives power when it's plugged in, so there's something to measure.", simple: "Push the power cord into the adapter box, then push its plug into the wall." },
    { t0: 16,   text: "<b>Red probe into the hole</b>, touching the metal inside. <b>Black probe on the outside ring.</b> Keep the two probes apart.", why: "Red goes to the part that should be +. The reading then tells you if it really is.", simple: "Red tip inside the hole. Black tip on the outside ring. Don't let the two tips touch each other." },
    { t0: 23,   text: "Read the screen. <b>About 24, no minus sign</b> = the middle is + (good: it matches the symbol on your adapter's label). About -24, or 0, 1 or OL, or a number far from 24 = unplug and stop.", why: "Your iron needs the middle to be + (its drawing says so). About 24 with no minus sign proves it.", simple: "About 24 with no minus sign: good. A minus sign, 0, 1 or OL, or a number far from 24: unplug and stop." },
    { t0: 29.2, text: "Take the probes off, then <b>unplug the adapter from the wall</b>.", why: "It's safer to leave it unplugged until the iron is ready.", simple: "Take the probes off, then pull the plug out of the wall." },
  ],
  build(E, root) {
    const { V, prog, poseTrack, pose } = E;
    E.makeBench(root);
    const meter = E.makeMeter(root, V(-22, 0, 2));
    const P = { tipX: 1.0, y: 0.62, z: 6 };
    const plug = E.makeBarrelPlug(root); plug.position.set(P.tipX, P.y, P.z);
    const adapter = E.makeAdapter(root, V(10, 0, -8));
    E.staticTube(root, 0x1b1d20, 0.22, [V(4.7, 0.6, 6), V(6.5, 0.35, 5), V(5, 0.3, 0), V(2, 0.8, -6), V(2.6, 1.6, -8), adapter.dcOut()], 80, E.M.black);
    const mains = E.makeMains(root, V(24, 6, -19.85));
    const probes = E.makeProbePair(root, meter);
    const BLK = V(-0.6, -1, 0.25).normalize();
    const R = { rest: pose(V(2, 0.62, 12.5), V(1, 0, 0)), near: pose(V(-2, P.y, P.z), V(1, 0, 0)), in: pose(V(1.5, P.y, P.z), V(1, 0, 0)) };
    const on = V(1.75, P.y + E.BARREL.rSleeve + 0.01, P.z);
    const B = { rest: pose(V(2, 0.62, 14.2), V(1, 0, 0)), near: pose(on.clone().addScaledVector(BLK, -3), BLK), on: pose(on, BLK) };
    let reading = "off";
    return {
      cams: [
        [0, V(-22, 12, 14), V(-22, 2.4, 1.6)], [4.6, V(-22, 12, 14), V(-22, 2.4, 1.6)],
        [5.8, V(-1.6, 1.8, 7.6), V(1.3, 0.62, 6)], [9.9, V(-1.6, 1.8, 7.6), V(1.3, 0.62, 6)],   // 11 Nov (pictures, row 18): held until step 2 ends
        [11.1, V(11, 12, 7), V(19, 4, -13)], [15.4, V(11, 12, 7), V(19, 4, -13)],
        [16.6, V(-3.5, 5.5, 12.5), V(0.4, 0.7, 6)], [22.4, V(-3.5, 5.5, 12.5), V(0.4, 0.7, 6)],
        [23.4, V(-11, 21, 22), V(-10, 1, 3)], [25.4, V(-11, 21, 22), V(-10, 1, 3)],
        [26.4, V(-22, 10.5, 5.5), V(-22, 2.4, -2.4)], [28.8, V(-22, 10.5, 5.5), V(-22, 2.4, -2.4)],
        [29.8, V(-3.5, 5.5, 12.5), V(0.4, 0.7, 6)], [31, V(-3.5, 5.5, 12.5), V(0.4, 0.7, 6)],   // 11 Nov (pictures, row 27): the probes are seen coming off
        [32, V(1, 17, 21), V(8, 2, -6)], [35, V(1, 17, 21), V(8, 2, -6)],
      ],
      tags: [
        { text: "DC volts: the V with a straight line", at: () => meter.labelAt("dcV"), from: 0.3, to: 5 },
        { text: "Metal ring (outside)", at: () => V(P.tipX + 0.55, P.y + 0.275, P.z), from: 6.0, to: 10.4 },
        { text: "Metal inside the hole", at: () => V(P.tipX + 0.05, P.y - 0.05, P.z), from: 6.6, to: 10.4 },
        { text: "Cord into the adapter", at: () => adapter.inlet().add(V(0.8, 1.2, 0)), from: 11.0, to: 13 },
        { text: "Into the wall", at: () => mains.outlet.clone().add(V(0, 5.5, 1)), from: 13.0, to: 16 },
        { text: "Red: into the hole", cls: "red", at: () => probes.red.localToWorld(V(-4, 0.5, 0)), from: 18.4, to: 23 },
        { text: "Black: on the ring", at: () => probes.black.localToWorld(V(-2.2, 0.3, 0)), from: 21.2, to: 23 },   // 11 Nov (pictures, row 24): lower on the probe, so it is inside the desktop picture
        { text: "Middle = +   Ring = –", cls: "good", at: () => V(P.tipX + 1.5, P.y + 1.4, P.z), from: 23.6, to: 25.6 },
        { text: "Example reading: about 24, no minus sign = good", cls: "good", at: () => meter.lcdAt(), from: 23.6, to: 29.2 },
      ],
      update(t) {
        meter.turn("offR", "dcV", prog(t, 1.0, 3.0));
        const wallK = prog(t, 13.2, 14.8) * (1 - prog(t, 32.8, 34.2));
        mains.update(adapter.inlet(), prog(t, 11.2, 12.6), wallK);
        poseTrack(probes.red, t, [[17, R.rest], [18.6, R.near], [20, R.in], [29.6, R.in], [31.2, R.rest]]);
        poseTrack(probes.black, t, [[20, B.rest], [21, B.near], [21.8, B.on], [29.6, B.on], [31.2, B.rest]]);
        probes.update();
        const touching = t >= 21.8 && t < 29.6 && wallK >= 1;
        reading = t < 3 ? "off" : touching ? "24.0 V" : "0.0 mV";
        meter.setLcd(reading);
      },
      state() {
        const r = probes.red.position, k = probes.black.position;
        return { lcd: reading, redTip: { x: r.x, y: r.y, z: r.z }, blackTip: { x: k.x, y: k.y, z: k.z }, plug: { ...P, ...E.BARREL } };
      },
    };
  },
};
