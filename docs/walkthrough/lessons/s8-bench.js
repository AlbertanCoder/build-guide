// Step 8, items 1-2: the software tests on the laptop (S8.1) and the bench power test (S8.2), after the step's two
// rules (the box at the top of Step 8). Words follow the guide (index.html, after the 10 Nov audit).
// Parts: docs/models/step-08-test.glb (drone, smoke stopper, monitor, small laptop); the payload and the legs are
// hidden (they go on after the first hover, Step 7 AFTER), props hidden (props OFF). The radio is the Pocket from
// s3r-radio.js (ARM on SA, as in Stage 3). Screens and lights are DRAWINGS of what the guide says to see.
import { makePocket } from "./s3r-radio.js";
export default {
  T: 72,
  steps: [
    { t0: 0,  text: "Two rules for every test in this step: <b>unplug the battery whenever your hands are on the props or the motors</b>. <b>Radio on and arm switch off before the battery goes in.</b>",
      why: "A motor that starts while your fingers are on it, or a drone that arms the moment it gets power, is how people get cut.",
      simple: "Hands on props or motors = battery out. Radio on, arm off, then battery." },
    { t0: 5,  text: "On the laptop, open a terminal in the <b>Shad-Drone-Payload</b> folder. Run <code>python -m unittest -v test_drone_logic.py</code>: it should end with <b>OK</b>. Run <code>python payload.py --demo</code>. Then <code>python payload.py --demo --serve</code> and open <b>http://127.0.0.1:8000</b> in a browser: a plot of <b>fake hotspots</b>, not a map.",
      why: "On Windows: install Python from python.org, then python --version in a new terminal; if that is not recognised, use py instead of python. Nothing else needs installing: the sensor drivers are only for the Pi.",
      simple: "Run the tests (OK), the demo, then the demo page in the browser." },
    { t0: 14, text: "<b>Bench power test. Props OFF.</b> Before this you hold the <b>ISED Amateur Radio Operator Certificate (Basic)</b>: this is the <b>first time the video transmitter transmits</b>. The VTX is plugged into its cable (plug it back in if you unplugged it for an earlier test) and its <b>antenna is screwed on</b>. Radio on. Arm switch off.",
      why: "The VTX transmits from the moment it is powered, and running it at any power needs that certificate.",
      simple: "Certificate first. Props off, VTX plugged in, antenna on, radio on, arm off." },
    { t0: 21, text: "Plug a charged pack into the <b>smoke stopper</b>, then the smoke stopper into the drone. Watch its light: it must <b>stay green</b>. If it is not green, or you see or smell smoke, <b>unplug at once</b>.",
      why: "The smoke stopper is a safety plug that cuts the power at 1.2 A, so a short shows up before it can burn anything.",
      simple: "Pack into the smoke stopper, into the drone. Green = good. Anything else: unplug.",
      more: "At this power-up, check: where the smoke stopper's light is." },
    { t0: 28, text: "Watch the <b>VTX light</b>: at start-up it flashes three groups (channel, band, power). The last group, <b>3 red then 1 blue</b>, means <b>25 mW</b>, its lowest power. A <b>steady blue</b> light afterwards means it is locked to the legal channels.",
      why: "This is the check Step 4 told you to do at the first battery power-up.",
      simple: "Last flashes: red, red, red, blue = 25 mW. Then steady blue.",
      more: "At this power-up, check: the VTX light pattern, as in Step 4." },
    { t0: 35, text: "Move every stick and switch on the radio: <b>every channel must respond</b>. To see it, open Betaflight Configurator, plug in the USB cable, press <b>Connect</b> and open the <b>Receiver</b> tab: every bar should move.",
      why: "A channel that does not move here will not move in the air.",
      simple: "Betaflight Receiver tab: every bar moves with every stick and switch." },
    { t0: 41, text: "The <b>picture must appear on the monitor</b>. Screw both of the monitor's own antennas on, plug your <b>USB-C power bank</b> into the monitor's USB-C port, <b>short-press the power button, then hold it for 3 seconds</b>, and use <b>auto search</b> to find the video channel.",
      why: "Auto search finds whichever channel the VTX is on.",
      simple: "Monitor: antennas on, power bank in, press then hold power, auto search." },
    { t0: 48, text: "Unplug the pack. <b>Take the smoke stopper off.</b> Put your <b>safety glasses</b> on. Hold the drone down or put it where it cannot move. Radio on, arm switch off. Plug the pack in <b>directly</b>.",
      why: "Spinning motors can draw more than 1.2 A, which would trip the smoke stopper and hide the result.",
      simple: "Smoke stopper off, glasses on, drone held, pack straight in." },
    { t0: 54, text: "If the laptop is connected to Betaflight, press <b>Disconnect</b> first. <b>Arm.</b> Raise the throttle a little: the motors spin. <b>Switch the radio off.</b> The motors keep turning for about <b>1 to 1.5 seconds</b>, then they <b>must stop</b>. If they do not, unplug the battery.",
      why: "Betaflight will not arm while it is connected. The 1 to 1.5 seconds is Betaflight's failsafe guard time; then the Drop you set in Step 4 stops the motors.",
      simple: "Disconnect, arm, a little throttle, radio OFF: motors stop within about 1.5 s." },
    { t0: 64, text: "<b>Low-power range test</b> in the yard, once you hold the amateur radio certificate (Basic): the video transmitter transmits from the moment it is powered. If you bought the optional memory card, record it on the monitor's <b>DVR</b>.",
      why: "A short walk away with the picture on the monitor shows how far a clean picture reaches.",
      simple: "With the certificate: walk away in the yard and watch the picture." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, 0.5, 0),
      hide: /^(campose_|cone_|HS_|arrow_|mug_|hand_|prop_|radio_|leg_|pi_|hat_|thermal_|gps_pcb|gps_antenna|gps_foam|gps_cable|zip_tie|pigtail_5v|battery_pack_liion|monitor_hood)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    // laptop screen (the model's small laptop): a canvas on its screen face, as in s4-bind
    const face = m.n("laptop_tag_screen_face");
    const lt = E.canvasTex(1060, 620, () => {});
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.106, 0.062), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false }));
    disp.position.z = 0.0006; face.add(disp);
    let lapKey = "";
    const lap = (key, fn) => { if (key === lapKey) return; lapKey = key; const c = lt.canvas.getContext("2d"); c.fillStyle = "#0d1014"; c.fillRect(0, 0, 1060, 620); fn(c); c.font = "26px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: real screens may differ)", 30, 600); lt.tex.needsUpdate = true; };
    const term = lines => c => { c.font = "34px monospace"; lines.forEach((l, i) => { c.fillStyle = l.startsWith("$") ? "#9be29b" : "#d6dde6"; c.fillText(l, 24, 60 + i * 46); }); };
    // monitor picture: a plane over the monitor's screen
    const ms = E.canvasTex(500, 310, () => {});
    const mp = E.mesh(new THREE.PlaneGeometry(10, 6.2), new THREE.MeshBasicMaterial({ map: ms.tex, toneMapped: false }), root);
    mp.rotation.x = -Math.PI / 2; mp.position.copy(m.at("monitor_screen")).add(V(0, 0.13, 0)); mp.castShadow = false;
    let monKey = "";
    const monitor = (key) => { if (key === monKey) return; monKey = key; const c = ms.canvas.getContext("2d");
      if (key === "off") { c.fillStyle = "#050607"; c.fillRect(0, 0, 500, 310); }
      else if (key === "search") { c.fillStyle = "#1b2430"; c.fillRect(0, 0, 500, 310); c.fillStyle = "#fff"; c.font = "bold 40px Arial"; c.fillText("Auto search...", 40, 170); }
      else { c.fillStyle = "#8fc3ea"; c.fillRect(0, 0, 500, 160); c.fillStyle = "#9a8f7a"; c.fillRect(0, 160, 500, 150); c.fillStyle = "#fff"; c.font = "bold 28px monospace"; c.fillText("pack volts  timer", 20, 40); c.font = "20px Arial"; c.fillText("(a drawing)", 20, 295); }
      ms.tex.needsUpdate = true; };
    // the smoke stopper's light and the VTX's light (small spheres)
    const ssLed = m.n("smokestopper_led");
    ssLed.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x22dd55); o.material.emissiveIntensity = 0; } });
    const vtxLed = E.mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xff2020, emissiveIntensity: 0 }), root);
    vtxLed.position.copy(m.at("vtx_board")).add(V(0, 0.45, 0));
    // the radio, on the bench where the model's simple radio stood
    const p = makePocket(E, root, V(-25, 6.2, -14));
    p.group.rotation.y = 0.5; p.group.updateMatrixWorld(true);
    // motors: the bells turn while armed, and for about 1.2 s after the radio goes off
    const bells = [1, 2, 3, 4].map(i => m.n(`M${i}_bell`));
    // the pack lead: the smoke stopper sits between pack and drone until 48 s
    const ss = /^smokestopper_/;
    // picture check 11 Nov, row 12: the smoke stopper lies beside the tail. While it is in use the pack's plug sits on one
    // end of it and the drone's plug on the other, each on an extra cable (the model's own leads cannot bend).
    const SSX = 0.05;   // model metres: the smoke stopper lies 5 cm nearer the tail than the model has it
    const ssAt = m.at("smokestopper_body").add(V(SSX * 100, 0, 0));
    const packPlugHome = m.at("battery_xt60"), dronePlugHome = m.at("xt60_body");
    const packPlugAt = m.at("smokestopper_xt60_out").add(V(SSX * 100 + 1.35, 0, 0)), dronePlugAt = m.at("smokestopper_xt60_in").add(V(SSX * 100 - 1.35, 0, 0));
    const packOff = packPlugAt.clone().sub(packPlugHome).multiplyScalar(0.01), droneOff = dronePlugAt.clone().sub(dronePlugHome).multiplyScalar(0.01);
    const packRear = m.at("battery_pack").add(V(-3.95, 0.1, 0.3));
    const packCable = E.staticTube(root, 0x7a1414, 0.17, [packRear, packRear.clone().add(V(-2.6, 0.6, 2.4)), packPlugAt.clone().add(V(1.6, 1.9, 0.2)), packPlugAt.clone().add(V(0.3, 0.45, 0))], 40);
    const droneCable = E.staticTube(root, 0x1c1c1c, 0.17, [dronePlugHome.clone().add(V(0.8, 0, 0)), dronePlugHome.clone().add(V(-2.3, 0.6, 0.9)), dronePlugAt.clone().add(V(0.95, 2.25, -1)), dronePlugAt.clone().add(V(0, 0.45, 0))], 40);
    packCable.visible = droneCable.visible = false;
    const ov = [V(-14, 30, 38), V(-8, 2, -2)];
    const lapCam = [m.at("laptop_tag_screen_face").add(V(0, 3.5, 13)), m.at("laptop_tag_screen_face").add(V(0, 0.4, 0))];
    const ssCam = [ssAt.clone().add(V(1, 11, 17)), ssAt.clone().add(V(3.5, 1.6, -2.5))];
    const plugCam = [V(-21, 12, 13), V(-7.5, 3.6, 0)];   // the tail from behind, for "pack in directly"
    const vtxCam = [V(-18, 12, 11), V(-6, 3, 0)];
    const radioCam = [p.at("screen").add(V(4, 6, 16)), p.at("screen").add(V(6, -2, 0))];
    const monCam = [m.at("monitor_screen").add(V(-1, 15, 6)), m.at("monitor_screen").add(V(-1, 0, 0))];
    const droneCam = [V(18, 16, 22), V(0, 2, 0)];
    let st = {};
    return {
      cams: [[0, ...ov], [4.4, ...ov], [5.4, ...lapCam], [13.4, ...lapCam], [14.4, ...ov], [20.4, ...ov], [21.4, ...ssCam], [27.4, ...ssCam], [28.4, ...vtxCam], [34.4, ...vtxCam],
        [35.4, ...radioCam], [40.4, ...radioCam], [41.4, ...monCam], [47.4, ...monCam], [48.4, ...plugCam], [53.4, ...plugCam], [54.4, ...droneCam], [63.4, ...droneCam], [64.4, ...ov], [72, ...ov]],
      tags: [
        { text: "Hands on props or motors: battery out", cls: "red", at: () => V(0, 9, 0), from: 0.5, to: 5 },
        { text: "Radio on, arm off, then the battery", cls: "warn", at: () => p.at("SA"), from: 1.5, to: 5 },
        { text: "Tests end with OK", cls: "good", at: () => m.at("laptop_tag_screen_face").add(V(0, 3.4, 0)), from: 6.5, to: 9.2 },
        { text: "Fake hotspots, not a map", cls: "blue", at: () => m.at("laptop_tag_screen_face").add(V(0, 3.4, 0)), from: 11.2, to: 14 },
        { text: "Certificate first: the VTX transmits now", cls: "red", at: () => m.at("antenna_triumph_head").add(V(0, 1.2, 0)), from: 14.6, to: 21 },
        { text: "Props OFF", cls: "red", at: () => m.at("M2_bell").add(V(0, 1.6, 0)), from: 15.5, to: 21 },
        { text: "Pack into the smoke stopper, then into the drone", cls: "blue", at: () => ssLed.getWorldPosition(new THREE.Vector3()).add(V(0, 1.2, 0)), from: 22.2, to: 24.6 },
        { text: "Must stay green", cls: "good", at: () => ssLed.getWorldPosition(new THREE.Vector3()).add(V(0, 1.2, 0)), from: 24.8, to: 28 },
        { text: "3 red, then 1 blue = 25 mW", cls: "blue", at: () => vtxLed.position.clone().add(V(0, 1.2, 0)), from: 29, to: 32.8 },
        { text: "Then steady blue", cls: "good", at: () => vtxLed.position.clone().add(V(0, 1.2, 0)), from: 33, to: 35 },
        { text: "Every bar moves", cls: "good", at: () => p.at("stickR").add(V(0, 1.6, 0)), from: 36, to: 41 },
        { text: "Press, then hold 3 s; auto search", cls: "blue", at: () => m.at("monitor_screen").add(V(0, 1, -4.4)), from: 42, to: 48 },
        { text: "Smoke stopper off; pack in directly", cls: "warn", at: () => m.at("xt60_body").add(V(0, 1.6, 0)), from: 48.6, to: 54 },
        { text: "Safety glasses; drone held down", cls: "warn", at: () => V(0, 9, 0), from: 50, to: 54 },
        { text: "Disconnect Betaflight first", cls: "warn", at: () => m.at("laptop_tag_screen_face").add(V(0, 3.4, 0)), from: 54.4, to: 57 },
        { text: "Radio off: motors stop in about 1-1.5 s", cls: "red", at: () => V(0, 9, 0), from: 59, to: 64 },
        { text: "Range test: certificate first", cls: "warn", at: () => V(0, 9, 0), from: 64.6, to: 72 },
      ],
      update(t) {
        // laptop
        if (t < 5.4) lap("off", c => {});
        else if (t < 9.2) lap("test", term(["$ python -m unittest -v test_drone_logic.py", "...", "OK"]));
        else if (t < 11) lap("demo", term(["$ python payload.py --demo", "..."]));
        else if (t < 14) lap("serve", c => { term(["$ python payload.py --demo --serve", "http://127.0.0.1:8000"])(c);
          c.fillStyle = "#1b2430"; c.fillRect(30, 180, 1000, 380); c.fillStyle = "#e9f1ff"; c.font = "30px Arial"; c.fillText("fake hotspots (a plot, not a map)", 50, 220);
          [[200, 380], [520, 300], [800, 450]].forEach(([x, y]) => { c.fillStyle = "#ff7a2f"; c.beginPath(); c.arc(x, y, 18, 0, 7); c.fill(); }); });
        else if (t < 35) lap("idle", c => {});
        else if (t < 54) lap("rx", c => { c.fillStyle = "#e9f1ff"; c.font = "bold 44px Arial"; c.fillText("Betaflight: Receiver", 30, 70);
          ["Roll", "Pitch", "Yaw", "Throttle", "AUX 1", "AUX 2"].forEach((l, i) => { c.font = "32px Arial"; c.fillStyle = "#c9d6e6"; c.fillText(l, 30, 140 + i * 62); c.fillStyle = "#2c3846"; c.fillRect(220, 112 + i * 62, 600, 34); c.fillStyle = "#e3a21a"; c.fillRect(220, 112 + i * 62, 300 + 200 * Math.sin(i + 1), 34); }); });
        else if (t < 56) lap("disc", c => { c.fillStyle = "#e9f1ff"; c.font = "bold 44px Arial"; c.fillText("Betaflight: Disconnect", 30, 70); });
        else lap("idle2", c => {});
        // power: pack into the smoke stopper (22.4 s), smoke stopper into the drone (23.8 s), light on at 24.6 s, all out
        // at 48 s; from 53 s the drone's plug goes straight onto the pack's plug
        const inSS = t >= 22.4 && t < 48, viaSS = t >= 24.6 && t < 48, direct = t >= 53;
        m.shift(ss, V(SSX, 0, 0));
        show(ss, t < 48.4);
        m.shift(/^battery_xt60/, packOff.clone().multiplyScalar(inSS ? prog(t, 22.4, 23) : 0));
        m.shift(/^xt60_body/, inSS ? droneOff.clone().multiplyScalar(prog(t, 23.8, 24.4)) : V(0.022, -0.003, 0.002).multiplyScalar(direct ? prog(t, 53, 53.6) : 0));
        show(/^battery_lead/, !(inSS && t >= 22.7));
        packCable.visible = inSS && t >= 22.7; droneCable.visible = inSS && t >= 24.1;
        ssLed.traverse(o => { if (o.isMesh) { o.material.color.set(viaSS ? 0x22dd55 : 0x334433); o.material.emissiveIntensity = viaSS ? 1.2 : 0; } });
        // VTX start-up: three groups of flashes; the last is 3 red then 1 blue; then steady blue
        let vc = 0x000000, vi = 0;
        const since = viaSS ? t - 28.4 : -1;
        if (since >= 0 && since < 4.2) { const k = Math.floor(since / 0.35); if (k % 2 === 0 && k <= 6) { vi = 1.8; vc = k < 6 ? 0xff2020 : 0x2a6bff; } }   // k = 0, 2, 4 red; k = 6 blue, once
        else if (since >= 4.2 || (direct && t > 53.5)) { vi = 1.6; vc = 0x2a6bff; }
        vtxLed.material.emissive.setHex(vc || 0x000000); vtxLed.material.emissiveIntensity = vi;
        // the monitor
        monitor(t < 43 ? "off" : t < 45.5 ? "search" : viaSS || direct ? "picture" : "off");
        show(/^monitor_antenna/, t >= 42);
        // radio: sticks and switches move in the Receiver step; arm, throttle, then the radio goes OFF
        const sticks = t > 36 && t < 41;
        const armed = t >= 56 && t < 59.5;
        const radioOn = t < 59.5;
        p.flick("SA", armed ? 1 : -1);
        p.throttle(sticks ? -1 + 0.8 * (1 + Math.sin(t * 6)) / 2 : armed ? -0.75 : -1);
        p.stickR(sticks ? 0.6 * Math.sin(t * 9) : 0, sticks ? 0.5 * Math.cos(t * 7) : 0);
        p.flick("SD", sticks ? (Math.sin(t * 3) > 0 ? 1 : -1) : -1);
        p.press("power", t > 59 && t < 59.6 ? 1 : 0);
        if (radioOn) p.home("FIREWATCH"); else p.screen("", []);
        // motors: spin while armed with a little throttle; after the radio goes off they keep turning ~1.2 s, then stop
        const spin = armed && t > 57 ? 1 : (t >= 59.5 && t < 60.7 ? 1 : 0);
        bells.forEach((b, i) => { b.rotation.y = spin ? (t * 30) * (i === 0 || i === 3 ? -1 : 1) : b.rotation.y; });   // seen from above: M1, M4 clockwise (negative y), M2, M3 anticlockwise, matching S8.4's CW props on M1 and M4
        st = { smokeStopper: viaSS, ssGreen: viaSS, vtxLight: vi ? (vc === 0xff2020 ? "red" : "blue") : "off", monitor: monKey, armed, radioOn, motorsSpinning: !!spin, laptop: lapKey };
      },
      state() { return st; },
    };
  },
};
