// Stage 1: learn three things the multimeter does (volts, the beep, ohms).
// Source: the guide's Stage 1 "Learn three things the multimeter does", on Shad's ZOYI VC921.
// Screen numbers are examples; labels say so.
export default {
  T: 47,
  steps: [
    { t0: 0,  text: "First put <b>two 1.5 V batteries</b> (AA or AAA, whichever fits) in the meter, under its battery cover. Match the + and - marks inside. Then turn the dial from OFF to the <b>V with a straight line</b> (DC volts). The screen should light up.", why: "The meter does not come with batteries. Batteries and the adapter give steady power (DC); this setting reads it.", simple: "Put two 1.5 V batteries in the meter. Then turn the round knob until its white dot points at the V with a straight line over it." },
    { t0: 5,  text: "<b>Volts:</b> red probe on the <b>+ end</b> of an AA battery, black probe on the <b>- end</b>. A good battery reads <b>about 1.5</b>.", why: "Testing a battery you know is good shows you what a right reading looks like.", simple: "Red tip on the bump end (+), black tip on the flat end (-). About 1.5 on the screen means the battery is fine." },
    { t0: 14, text: "Take the probes off. Turn the dial to the <b>beep symbol</b> (a dot with curved lines).", why: "The beep setting tells you if two points are connected, without reading numbers.", simple: "Lift both tips off. Turn the knob to the symbol that looks like a dot with sound waves." },
    { t0: 18, text: "<b>The beep:</b> touch the two probe tips together. The meter <b>beeps</b>.", why: "Touching the tips together is the simplest connection there is, so you learn what connected sounds like.", simple: "Touch the two metal tips to each other. You should hear a beep." },
    { t0: 24, text: "Strip about 3 mm off both ends of a short piece of thin wire, then touch the two bare ends. It <b>beeps</b>: the wire connects end to end.", why: "Later you check wires and joints this way: a beep means electricity can get through.", simple: "Touch one tip to each bare end of the wire. A beep means the wire is good." },
    { t0: 31, text: "<b>Ohms:</b> turn the dial to <b>Ω</b>. Probes apart, the screen shows <b>OL</b>: nothing connects them.", why: "Ohms tells you how easily electricity gets through. OL means it can't get through at all.", simple: "Turn the knob to the horseshoe symbol (ohms). With the tips not touching anything, the screen shows OL: not connected." },
    { t0: 37, text: "Touch the probes together: <b>close to 0</b> = connected. Touch them to the two bare ends of the wire: close to 0 too. You will use this on the USB cable later.", why: "Close to 0 means an easy path, so connected. You'll use this to find the + wire in the USB cable.", simple: "Touch the tips together, then the two bare ends of the wire. The number drops to near 0 both times: connected." },
    { t0: 42, text: "Put the probes down and turn the dial back to <b>OFF</b>.", why: "Turning it off saves the meter's batteries.", simple: "Put the probes down and turn the knob back to OFF." },
  ],
  build(E, root) {
    const { THREE, V, prog, poseTrack, pose, mesh, mat, alongX } = E;
    E.makeBench(root);
    const meter = E.makeMeter(root, V(-16, 0, 0));
    const probes = E.makeProbePair(root, meter);
    // AA battery lying along x, + end toward +x
    const BAT = { c: V(0, 0.725, 10), r: 0.725, half: 2.525 };
    const bat = new THREE.Group(); bat.position.copy(BAT.c); root.add(bat);
    const wrap = E.canvasTex(512, 256, c => { c.fillStyle = "#1f1f22"; c.fillRect(0, 0, 512, 256); c.fillStyle = "#c9a227"; c.fillRect(0, 0, 512, 46); c.save(); c.translate(256, 150); c.rotate(Math.PI / 2); c.fillStyle = "#fff"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("+  AA 1.5V  –", 0, 0); c.restore(); }); // canvas top = the + end
    mesh(alongX(new THREE.CylinderGeometry(BAT.r, BAT.r, 4.87, 40)), mat(0xffffff, { map: wrap.tex, roughness: 0.4 }), bat).position.x = -0.0875;
    mesh(alongX(new THREE.CylinderGeometry(0.27, 0.3, 0.17, 24)), E.M.metal, bat).position.x = 2.44;
    mesh(alongX(new THREE.CylinderGeometry(0.6, 0.6, 0.03, 32)), E.M.metal, bat).position.x = -2.51;
    // thin silicone wire with bare ends (blue for visibility)
    const W = { a: V(-4, 0.12, 14), b: V(4, 0.12, 14) };
    E.staticTube(root, 0x2a6df4, 0.08, [V(-3.7, 0.12, 14), V(-2, 0.1, 14.8), V(0, 0.1, 15.2), V(2, 0.1, 14.8), V(3.7, 0.12, 14)], 40);
    for (const [s, e] of [[V(-4.05, 0.12, 14), V(-3.65, 0.12, 14)], [V(3.65, 0.12, 14), V(4.05, 0.12, 14)]]) E.staticTube(root, 0, 0.05, [s, s.clone().lerp(e, 0.5), e], 4, E.M.copper);
    const beepAir = E.makeBeep(root, V(0, 4, 4)), beepWire = E.makeBeep(root, V(0, 0.3, 14.6));
    const X = V(1, 0, 0), dA = V(-1, -0.3, 0).normalize(), dB = V(1, -0.3, 0).normalize();
    const dWr = V(-0.35, -1, 0.2).normalize(), dWb = V(0.35, -1, 0.2).normalize();
    const R = {
      rest: pose(V(3, 0.62, 19), X), batNear: pose(V(5.5, 0.725, 10), V(-1, 0, 0)), bat: pose(V(BAT.half + 0.005, 0.725, 10), V(-1, 0, 0)),
      air: pose(V(0.03, 4, 4), dA), wireNear: pose(W.b.clone().addScaledVector(dWr, -2.5).setY(2.6), dWr), wire: pose(V(4.0, 0.2, 14), dWr),
    };
    const B = {
      rest: pose(V(3, 0.62, 20.5), X), batNear: pose(V(-5.5, 0.725, 10), X), bat: pose(V(-BAT.half - 0.005, 0.725, 10), X),
      air: pose(V(-0.03, 4, 4), dB), wireNear: pose(W.a.clone().addScaledVector(dWb, -2.5).setY(2.6), dWb), wire: pose(V(-4.0, 0.2, 14), dWb),
    };
    let lcd = "off", contact = "none";
    const MC = [V(-16, 12, 12), V(-16, 2.4, -0.4)], ML = [V(-16, 10.5, 3.5), V(-16, 2.4, -4.4)];
    return {
      cams: [
        [0, ...MC], [4.6, ...MC],
        [5.8, V(0, 6, 19), V(0, 0.8, 10)], [10.2, V(0, 6, 19), V(0, 0.8, 10)],
        [11.2, ...ML], [13.6, ...ML],
        [14.6, ...MC], [17.8, ...MC],
        [18.8, V(1, 6.5, 13), V(0, 3.6, 4)], [23.6, V(1, 6.5, 13), V(0, 3.6, 4)],
        [24.6, V(0, 9, 23), V(0, 0.6, 14)], [30.6, V(0, 9, 23), V(0, 0.6, 14)],
        [31.6, ...MC], [36.6, ...MC],
        [37.6, V(-8, 14, 19), V(-8, 2.6, 2)], [41.6, V(-8, 14, 19), V(-8, 2.6, 2)],
        [42.6, ...MC], [47, ...MC],
      ],
      tags: [
        { text: "DC volts: the V with a straight line", at: () => meter.labelAt("dcV"), from: 0.3, to: 5 },   // 11 Nov (pictures, row 1): stays until the step ends
        { text: "+ end: red probe", cls: "red", at: () => V(BAT.half, 1.6, 10), from: 7.6, to: 10.6 },
        { text: "– end: black probe", at: () => V(-BAT.half, 1.6, 10), from: 7.6, to: 10.6 },
        { text: "Example: about 1.5 = the battery works", cls: "good", at: () => meter.lcdAt(), from: 11.6, to: 14 },
        { text: "Beep symbol", cls: "blue", at: () => meter.labelAt("beep"), from: 15.2, to: 18 },
        { text: "BEEP!", cls: "blue", at: () => V(0, 5.2, 4), from: 20.6, to: 24 },
        { text: "Bare end", at: () => V(-4, 0.5, 14), from: 24.4, to: 26.4 },
        { text: "Bare end", at: () => V(4, 0.5, 14), from: 24.4, to: 26.4 },
        { text: "BEEP! The wire connects", cls: "blue", at: () => V(0, 1.4, 14.8), from: 27.4, to: 31 },
        { text: "Ω (ohms)", at: () => meter.labelAt("ohm"), from: 32.6, to: 37 },   // 11 Nov (pictures, row 1): stays until the step ends; from this view the knob hides the white pointer at this mark
        { text: "OL = not connected", cls: "warn", at: () => meter.lcdAt(), from: 34.8, to: 37 },
        { text: "Close to 0 = connected", cls: "good", at: () => meter.lcdAt(), from: 39.2, to: 42 },
      ],
      update(t) {
        // dial: OFF -> DC volts -> beep -> ohms -> OFF
        if (t < 16) meter.turn("offR", "dcV", prog(t, 1, 3));
        else if (t < 33) meter.turn("dcV", "beep", prog(t, 16, 17.5));
        else if (t < 44) meter.turn("beep", "ohm", prog(t, 33, 34.5));
        else meter.turn("ohm", "offR", prog(t, 44, 45.5));
        poseTrack(probes.red, t, [[5.6, R.rest], [7, R.batNear], [8.2, R.bat], [14, R.bat], [15.4, R.rest], [18.4, R.rest], [20.4, R.air], [24, R.air], [25.2, R.wireNear], [27, R.wire], [31, R.wire], [32.4, R.rest], [37, R.rest], [39, R.air], [42, R.air], [43.4, R.rest]]);
        poseTrack(probes.black, t, [[6.4, B.rest], [7.4, B.batNear], [8.6, B.bat], [14, B.bat], [15.4, B.rest], [18.4, B.rest], [20.4, B.air], [24, B.air], [25.2, B.wireNear], [27, B.wire], [31, B.wire], [32.4, B.rest], [37, B.rest], [39, B.air], [42, B.air], [43.4, B.rest]]);
        probes.update();
        const onBat = t >= 8.6 && t < 14, inAir = (t >= 20.4 && t < 24) || (t >= 39 && t < 42), onWire = t >= 27 && t < 31;
        contact = onBat ? "battery" : inAir ? "tips" : onWire ? "wire" : "none";
        meter.setBeepMode(t >= 17.5 && t < 33);
        if (t < 3 || t >= 45.5) lcd = "off";
        else if (t < 16) lcd = onBat ? "1.5 V" : "0.0 mV";
        else if (t < 17.5) lcd = "off";
        else if (t < 33) lcd = (inAir || onWire) ? "0.3 Ω" : "OL Ω";
        else if (t < 34.5) lcd = "off";
        else lcd = inAir ? "0.3 Ω" : "OL Ω";
        meter.setLcd(lcd);
        beepAir(t, t >= 20.4 && t < 24); beepWire(t, onWire);
      },
      state() { const r = probes.red.position, k = probes.black.position; return { lcd, contact, redTip: { x: r.x, y: r.y, z: r.z }, blackTip: { x: k.x, y: k.y, z: k.z }, battery: { x: BAT.c.x, half: BAT.half } }; },
    };
  },
};
