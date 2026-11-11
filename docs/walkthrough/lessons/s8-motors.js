// Step 8, item 3 (S8.3): motor order and direction in Betaflight's Motors tab, Angle mode, the tilt checks.
// Words follow the guide (index.html, after the 10 Nov audit). Parts: docs/models/step-08-test.glb (payload, legs and
// props hidden: props OFF, payload after the first hover). Motor places from the page: M1 rear right, M2 front right,
// M3 rear left, M4 front left (from above, camera at the front); in the model +x = front, +z = right.
// Spin direction: the page says "the way the diagram shows"; the bells here turn the way S8.4's props need
// (CW props on M1 and M4, CCW on M2 and M3), seen from above. ANGLE goes on SD as in Stage 3 (s3r-switches).
import { makePocket } from "./s3r-radio.js";
const PLACE = { 1: "rear right", 2: "front right", 3: "rear left", 4: "front left" };
export default {
  T: 54,
  steps: [
    { t0: 0,  text: "Still <b>props OFF</b> and <b>without the smoke stopper</b>. Open Betaflight Configurator (github.com/betaflight/betaflight-configurator/releases/latest, or app.betaflight.com in Chrome). Plug in the USB cable and press <b>Connect</b>. Plug in the battery.",
      why: "The Motors tab only spins motors with the battery in; USB alone can't power them.",
      simple: "Props off. Betaflight connected. Battery in." },
    { t0: 6,  text: "<b>Motors</b> tab: tick the <b>confirmation box</b>. Raise <b>one motor's slider a little at a time</b>. Check the motor that spins is the right one: <b>M1 rear right, M2 front right, M3 rear left, M4 front left</b>, seen from above with the camera at the front. Check it spins the way the diagram shows.",
      why: "A motor in the wrong place, or spinning the wrong way, would flip the drone the moment it lifts.",
      simple: "One slider at a time. M1 rear right, M2 front right, M3 rear left, M4 front left.",
      more: "On the laptop, check: does Configurator show a slider for each motor, or only the Master slider?" },
    { t0: 18, text: "If a motor spins the wrong way, reverse it with the <b>Motor direction</b> button in the same tab (props off). <b>Lower the sliders.</b> Unplug the battery when you are done.",
      why: "Reversing in Betaflight saves re-soldering the motor wires.",
      simple: "Wrong way? Motor direction button. Sliders down, battery out." },
    { t0: 24, text: "Set up <b>Angle mode</b> first. In the <b>Modes</b> tab, click <b>Add Range</b> next to <b>ANGLE</b> and put it on a switch on your radio (SD, if you followed Stage 3).",
      why: "ANGLE is the self-levelling mode: let go of the right stick and the drone levels itself.",
      simple: "Modes tab: ANGLE on a switch." },
    { t0: 30, text: "Before you arm, still connected and disarmed: <b>tilt the drone</b> and check the <b>3D model on the Setup tab tilts the same way</b>.",
      why: "If the model tilts the other way, the board thinks up is down, and Angle mode would fight you.",
      simple: "Tilt the drone: the picture on the Setup tab must tilt the same way." },
    { t0: 36, text: "Press <b>Disconnect</b> (it will not arm while connected). Radio on, arm switch off, then <b>plug the battery in again</b> (it came out at the end of the motor check). Props off: <b>arm</b>, switch to <b>Angle</b> mode, and raise the throttle about <b>a third</b> of the way. <b>Keep your hands clear of the motors.</b> Tilt the drone nose down: the motors on the <b>low side</b> (here the two front motors) <b>must speed up</b>.",
      why: "Speeding up on the low side is Angle mode pushing that side back up to level.",
      simple: "Disconnect, battery in, arm, Angle, a third throttle, nose down: the front motors speed up." },
    { t0: 47, text: "If <b>any check fails</b>: disarm, unplug the battery and <b>do not fly</b>. Ask for help before trying again.",
      why: "Every one of these checks is something that would crash the drone on its first hover.",
      simple: "Anything wrong: disarm, battery out, don't fly, ask." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, 0.5, 0),
      hide: /^(campose_|cone_|HS_|arrow_|mug_|hand_|prop_|radio_|leg_|pi_|hat_|thermal_|gps_pcb|gps_antenna|gps_foam|gps_cable|zip_tie|pigtail_5v|battery_pack_liion|smokestopper_|monitor_)/ });
    const droneRoot = m.n("drone_root"), droneQ = droneRoot.quaternion.clone(), droneP = droneRoot.position.clone();
    const face = m.n("laptop_tag_screen_face");
    const lt = E.canvasTex(1060, 620, () => {});
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.106, 0.062), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false }));
    disp.position.z = 0.0006; face.add(disp);
    let lapKey = "";
    const lap = (key, fn) => { if (key === lapKey) return; lapKey = key; const c = lt.canvas.getContext("2d"); c.fillStyle = "#1b2430"; c.fillRect(0, 0, 1060, 620); c.fillStyle = "#e9f1ff"; fn(c); c.font = "26px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: real screens may differ)", 30, 600); lt.tex.needsUpdate = true; };
    const p = makePocket(E, root, V(-25, 6.2, -14));
    p.group.rotation.y = 0.5; p.group.updateMatrixWorld(true);
    const bells = [1, 2, 3, 4].map(i => m.n(`M${i}_bell`));
    bells.forEach(b => b.traverse(o => { if (o.isMesh) o.material = o.material.clone(); }));   // so one bell can light up alone
    const dir = [-1, 1, 1, -1];     // seen from above: M1 and M4 clockwise (negative y), M2 and M3 anticlockwise
    const ang = [0, 0, 0, 0];
    let lastT = 0;
    const scr = m.at("laptop_tag_screen_face");
    const lapCam = [scr.clone().add(V(0, 3.5, 13)), scr.clone().add(V(0, 0.4, 0))];
    const top = [V(-9, 34, 0), V(0, 2, 0)];   // from above, camera (front) at the top of the screen, right side on the right
    const both = [V(16, 20, 26), V(2, 2, -10)];
    const side = [V(0, 9, 30), V(0, 3, 0)];
    let st = {};
    return {
      cams: [[0, ...both], [5.4, ...both], [6.4, ...top], [23.4, ...top], [24.4, ...lapCam], [29.4, ...lapCam], [30.4, ...both], [35.4, ...both], [36.4, ...side], [54, ...side]],
      tags: [
        { text: "Props OFF, no smoke stopper", cls: "red", at: () => V(0, 9, 0), from: 0.5, to: 6 },
        ...[1, 2, 3, 4].map(i => ({ text: `M${i} ${PLACE[i]}`, cls: "blue", at: () => m.at(`M${i}_bell`).add(V(0, 2, 0)), from: 7 + (i - 1) * 2.6, to: 18 })),
        { text: "Camera = front", cls: "warn", at: () => m.at("cam_body").add(V(-1.6, 2, 0)), from: 7, to: 18 },
        { text: "Wrong way? Motor direction button", cls: "warn", at: () => V(0, 9, 0), from: 18.6, to: 24 },
        { text: "ANGLE on a switch", cls: "blue", at: () => scr.clone().add(V(0, 3.4, 0)), from: 25.2, to: 30 },
        { text: "The Setup tab model tilts the same way", cls: "good", at: () => scr.clone().add(V(0, 3.4, 0)), from: 31, to: 36 },
        { text: "Hands clear", cls: "red", at: () => V(0, 10, 0), from: 37, to: 40 },
        { text: "Low side (front) speeds up", cls: "good", at: () => m.at("M2_bell").add(V(0, 2.2, 0)), from: 41, to: 47 },
        { text: "Any check fails: don't fly", cls: "red", at: () => V(0, 9, 0), from: 47.6, to: 54 },
      ],
      update(t) {
        // which motor runs: one at a time in the Motors tab (7-17 s), all four in the armed Angle test (38.5-46 s)
        const one = t >= 7 && t < 17.4 ? 1 + Math.floor((t - 7) / 2.6) : 0;
        const armed = t >= 38 && t < 46.5;
        const tilt = prog(t, 41, 42.5) * (1 - prog(t, 45, 46.2));
        const speed = i => (one === i + 1 ? 6 : 0) + (armed && t > 38.5 ? (i === 1 || i === 3 ? 10 + 14 * tilt : 10) : 0);
        const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
        bells.forEach((b, i) => { ang[i] += dir[i] * speed(i) * dt; b.rotation.y = ang[i]; });
        [1, 2, 3, 4].forEach(i => m.glow("M" + i + "_bell", one === i ? 1 : 0));   // the motor that runs lights up (picture check, row 38)
        // tilt: the Setup tab check (31-35 s, both ways) and nose down in the armed test (41-45 s)
        const look = t >= 31 && t < 35.4 ? Math.sin((t - 31) * 1.6) * 0.25 : 0;
        droneRoot.quaternion.copy(droneQ);
        droneRoot.rotateZ(-0.22 * tilt + look);
        // lifted 3 cm while it is tilted, as in a hand, so the low end does not sink into the bench (picture check, row 37)
        droneRoot.position.copy(droneP); droneRoot.position.y += 0.03 * Math.min(1, Math.abs(-0.22 * tilt + look) / 0.2);
        // radio
        p.flick("SA", armed ? 1 : -1);
        p.flick("SD", t >= 26 ? 1 : -1);
        p.throttle(armed ? -1 + 0.66 * prog(t, 38.5, 40) : -1);
        p.home("FIREWATCH");
        // laptop
        if (t < 6) lap("connect", c => { c.font = "bold 48px Arial"; c.fillText("Betaflight: Connect", 30, 80); c.font = "34px Arial"; c.fillText("USB in, battery in, props OFF", 30, 170); });
        else if (t < 24) lap("motors" + one, c => { c.font = "bold 48px Arial"; c.fillText("Motors", 30, 80); c.font = "32px Arial"; c.fillText("[x] I understand the risks (props off)", 30, 150);
          [1, 2, 3, 4].forEach((i, k) => { c.fillStyle = "#c9d6e6"; c.fillText("M" + i, 40 + k * 150, 560); c.fillStyle = "#2c3846"; c.fillRect(50 + k * 150, 200, 40, 320); c.fillStyle = "#e3a21a"; const h = one === i ? 70 : 0; c.fillRect(50 + k * 150, 520 - h, 40, h); });
          c.fillStyle = "#c9d6e6"; c.fillText("Master", 640, 560); c.fillStyle = "#2c3846"; c.fillRect(660, 200, 40, 320);
          c.fillText("Motor direction", 780, 300); });
        else if (t < 30) lap("modes", c => { c.font = "bold 48px Arial"; c.fillText("Modes", 30, 80); c.font = "36px Arial"; c.fillText("ARM", 30, 180); c.fillText("ANGLE  [Add Range]", 30, 260); c.fillStyle = "#2fb36a"; c.fillRect(420, 230, 300, 40); });
        else if (t < 36) lap("setup" + Math.round(look * 20), c => { c.font = "bold 48px Arial"; c.fillText("Setup", 30, 80); c.font = "32px Arial"; c.fillText("the 3D model tilts with the drone", 30, 150);
          c.save(); c.translate(530, 360); c.rotate(-look); c.fillStyle = "#c9d6e6"; c.fillRect(-200, -12, 400, 24); c.fillRect(-12, -120, 24, 240); c.restore(); });
        else lap("disc", c => { c.font = "bold 48px Arial"; c.fillText("Betaflight: Disconnect", 30, 80); c.font = "34px Arial"; c.fillText("(it will not arm while connected)", 30, 170); });
        st = { motor: one ? `M${one} ${PLACE[one]}` : "", armed, angle: t >= 26, noseDown: tilt > 0.9, frontFaster: armed && tilt > 0.5 && speed(1) > speed(0) };
      },
      state() { return st; },
    };
  },
};
