// End of Step 5 (page action S5.4b; was Step 3 part 5 until audit row B3, 10 Nov 2026): checks with the battery
// unplugged, then the first power-up through the smoke stopper, with the pack just charged.
// Parts from docs/models/step-03-stack.glb (battery, smoke stopper) + Shad's VC921 meter.
export default {
  T: 56,
  steps: [
    { t0: 0,  text: "<b>Battery unplugged.</b> Meter on the beep, probes on the <b>XT60's two pins</b>. A short beep that stops = fine (the capacitor charging). <b>A beep that never stops = a short</b>: find it first.", why: "A short (two parts touching that shouldn't) would spark when the battery goes in.", simple: "Battery out. Meter on beep, tips on the two pins of the yellow plug. A short beep is fine; a beep that won't stop is a problem." },
    { t0: 11, text: "Between two wires of the <b>same motor</b> a beep is normal. Between a <b>battery wire and any motor wire</b> there must be <b>no beep</b>.", why: "A battery wire touching a motor wire would be a short.", simple: "Tip on a battery wire and the other on a motor wire: there should be no beep." },
    { t0: 19, text: "Look closely: <b>no blob of solder joins two pads</b> (phone zoom and torch help). Tug each wire gently: nothing moves.", why: "Small blobs joining pads are easy to miss.", simple: "Use your phone's zoom and torch to look for solder joining two pads." },
    { t0: 25, text: "<b>Glasses on, window open, propellers off</b>, the fire extinguisher still within reach. Until you hold the amateur radio certificate, <b>unplug the video transmitter from its cable</b> first (plug it back in afterwards). Never plug the pack straight in: the first power-up goes through the <b>smoke stopper</b>.", why: "If something is wrong, the smoke stopper cuts the power before damage is done.", simple: "Glasses on, no propellers, extinguisher close by, and the battery always goes in through the smoke stopper." },
    { t0: 31, text: "Plug the <b>pack you just charged</b> <b>into the smoke stopper</b>, then the <b>smoke stopper into the drone</b>.", why: "The smoke stopper sits between the battery and the drone to catch a short.", simple: "Battery into the smoke stopper, then the smoke stopper into the drone." },
    { t0: 38, text: "Its light must stay <b>solid green</b> = no short. If it goes off and beeps: <b>unplug the battery at once</b> and look for a solder bridge or a wire touching where it should not.", why: "Solid green means no short; anything else means unplug now.", simple: "Steady green = good. If it goes off and beeps, pull the battery out right away." },
    { t0: 44, text: "While the pack is still plugged in, <b>check the Pi lead</b>: meter on <b>DC volts</b>, red probe on <b>pin 1</b> of its micro-USB plug, black on <b>pin 5</b> (the end pins from Stage 1). Sharp tips, pins only (not the metal shell), black probe still first. <b>About 5 V</b> = good. No 5 V or a minus sign: stop and ask. <b>Then unplug the pack.</b>", why: "This proves the Pi will get the right power before it is ever plugged in.", simple: "Meter on volts, probes on the two end pins of the Pi plug: about 5 V. Then unplug the battery." },
  ],
  async build(E, root) {
    const { THREE, V, prog, poseTrack, pose } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-03-stack.glb", { at: V(0, 1.0, 0), hide: /^(meter_|solder_joint)/ });
    const meter = E.makeMeter(root, V(-21, 0, 15));
    const probes = E.makeProbePair(root, meter);
    const beep = E.makeBeep(root, V(-12, 3.4, 2.5));
    const xt = () => m.at("xt60_body");
    const pinP = () => xt().add(V(-0.95, 0, -0.36)), pinN = () => xt().add(V(-0.95, 0, 0.36));
    const REST_R = pose(V(-9, 0.62, 23), V(1, 0, 0)), REST_B = pose(V(-9, 0.62, 24.5), V(1, 0, 0));
    // smoke stopper starts beside the battery; the drone's lead is moved from the smoke stopper's socket while unplugged
    const SS = /^smokestopper_/, BAT = /^battery_/;
    // the pack, its lead and its XT60 as one group, turned round about the plug so the plug faces the smoke stopper
    const batG = new THREE.Group(); root.add(batG);
    batG.position.copy(m.at("battery_xt60")); batG.updateMatrixWorld(true);
    for (const o of m.all(BAT)) batG.attach(o);
    batG.rotation.y = Math.PI;
    // the Pi power lead soldered in Step 3 (fix A1): from under the flight controller out to its micro-USB plug on the bench
    const piPlugAt = V(-15, 0.75, 12.5);
    const fcAt = m.at("stack_fc");
    E.staticTube(root, 0x1c1c1c, 0.16, [fcAt.clone().add(V(-1.2, -0.3, 1.2)), fcAt.clone().add(V(-3, -1.2, 4)), V(-9, 0.5, 9), piPlugAt.clone().add(V(0.7, 0, 0))]);
    E.mesh(new THREE.BoxGeometry(1.3, 0.45, 0.75), E.mat(0x9aa0a6, { metalness: 0.6, roughness: 0.3 }), root).position.copy(piPlugAt);
    const pin1 = piPlugAt.clone().add(V(-0.66, 0, -0.18)), pin5 = piPlugAt.clone().add(V(-0.66, 0, 0.18));
    let st = {}, lcd = "off";
    return {
      // picture check 11 Nov, row 43: the first view stands further back so the meter's reading is inside the picture;
      // from 45.4 to 50.4 s a close view of the Pi lead's plug, so the red and the black probe can be told apart
      cams: [[0, V(-28, 16.3, 23.4), V(-16.5, 1.6, 8)], [10.4, V(-28, 16.3, 23.4), V(-16.5, 1.6, 8)], [11.4, V(-12, 16, 18), V(-1, 2, 2)], [24.4, V(-12, 16, 18), V(-1, 2, 2)], [25.4, V(-22, 22, 26), V(-14, 2, 0)], [44.4, V(-22, 22, 26), V(-14, 2, 0)],
        [45.4, V(-17.5, 9, 23), V(-17, 0.8, 13)], [50.4, V(-17.5, 9, 23), V(-17, 0.8, 13)], [51.4, V(-22, 22, 26), V(-14, 2, 0)], [56, V(-22, 22, 26), V(-14, 2, 0)]],
      tags: [
        { text: "Pi lead plug: about 5 V (pin 1 +, pin 5 -)", cls: "blue", at: () => piPlugAt.clone().add(V(0, 1.4, 0)), from: 46, to: 51 },
        { text: "Beep that never stops = a short!", cls: "red", at: () => meter.lcdAt().add(V(0, 0.6, -3.4)), from: 3, to: 5.4 },
        { text: "Short beep that stops = OK", cls: "good", at: () => meter.lcdAt().add(V(0, 0.6, -3.4)), from: 5.6, to: 11 },
        { text: "Same motor: beep is normal", cls: "good", at: () => m.at("wire_motor_M2_0").add(V(0, 1.2, 0)), from: 12, to: 15.2 },
        { text: "Battery wire to motor wire: NO beep", cls: "red", at: () => m.at("wire_batt_red").add(V(0, 1.2, 0)), from: 15.4, to: 19 },
        { text: "No solder joining two pads", cls: "warn", at: () => m.at("stack_esc").add(V(0, 1.6, 0)), from: 19.6, to: 25 },
        { text: "Props off. Glasses on.", cls: "red", at: () => V(-6, 7, 0), from: 25.4, to: 31 },
        { text: "Smoke stopper", cls: "blue", at: () => m.at("LBL_smoke-stopper"), from: 26, to: 38 },
        { text: "Solid green = no short", cls: "good", at: () => m.at("smokestopper_led").add(V(0, 1.2, 0)), from: 38.6, to: 44 },
      ],
      update(t) {
        if (t < 44) { meter.turn("offR", "beep", prog(t, 0.4, 1.4)); meter.setBeepMode(true); } else { meter.turn("beep", "dcV", prog(t, 44, 44.6)); meter.setBeepMode(false); }
        poseTrack(probes.red, t, [[1.4, REST_R], [2.6, pose(pinP(), V(1, 0, 0))], [11, pose(pinP(), V(1, 0, 0))], [11.8, REST_R], [45.0, REST_R], [46.0, pose(pin1, V(1, 0, 0))], [50.2, pose(pin1, V(1, 0, 0))], [51.0, REST_R]]);
        poseTrack(probes.black, t, [[1.6, REST_B], [2.8, pose(pinN(), V(1, 0, 0))], [11, pose(pinN(), V(1, 0, 0))], [11.8, REST_B], [44.6, REST_B], [45.6, pose(pin5, V(1, 0, 0))], [50.2, pose(pin5, V(1, 0, 0))], [51.0, REST_B]]);
        probes.update();
        const on = t >= 2.8 && t < 11;   // the probes stay on the pins until the frame the player stops on (10.999 s)
        lcd = t >= 46 && t < 50.2 ? "5.02 V" : t >= 44.6 && t < 51 ? "0.00 V" : t < 1.4 || t >= 11 ? "off" : on ? (t < 4.6 ? "0.4 Ω" : "OL Ω") : "OL Ω"; meter.setLcd(lcd);
        beep(t, on && t < 4.6);
        // the drone's XT60 waits 4 cm in front of the smoke stopper until plugged in
        const plugIn = prog(t, 33, 34.6), batIn = prog(t, 31.4, 32.8);
        // the smoke stopper (and the pack behind it) stay 4 cm back until each plug goes in; the drone side never moves
        m.shift(SS, V(-0.04 * (1 - plugIn) + 0.008 * plugIn, 0.0105 * plugIn, 0));
        const ssIn = m.at("smokestopper_xt60_in");
        batG.position.copy(ssIn).add(V(-1.2 - 4 * (1 - batIn) - (t >= 52 ? 4 * prog(t, 52, 53.4) : 0), 0, 0));
        const led = t >= 35 && t < 52.6 ? 1 : 0;   // off once the pack is unplugged
        m.n("smokestopper_led").traverse(o => { if (o.isMesh) { o.material.color.set(led ? 0x22dd55 : 0x334433); o.material.emissive = o.material.color.clone(); o.material.emissiveIntensity = led ? 1.2 : 0; } });
        st = { probesOnPiPlug: probes.red.position.distanceTo(pin1) < 0.1 && probes.black.position.distanceTo(pin5) < 0.1, ssGap: +(m.at("xt60_body").x - m.at("smokestopper_xt60_out").x).toFixed(2), lcd, probesOnPins: probes.red.position.distanceTo(pinP()) < 0.1 && probes.black.position.distanceTo(pinN()) < 0.1, plugged: plugIn >= 1 && batIn >= 1 && t < 52, led: led === 1 };
      },
      state() { return st; },
    };
  },
};
