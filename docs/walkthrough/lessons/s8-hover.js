// Step 8, items 4-5 (S8.4, S8.5): props on, weigh, check the site, then the first hover of the bare quad.
// Words follow the guide (index.html, after the 10 Nov audit). Parts: docs/models/step-08-test.glb (props, the 1 m
// hover arrow); payload and legs hidden (they go on after this hover, Step 7 AFTER). The kitchen scale is a simple box
// and shows "____ g": the guide asks him to write his own reading, so no number is drawn. Props turn about their hubs,
// M1 and M4 clockwise seen from above (CW props), M2 and M3 anticlockwise (CCW props).
import { makePocket } from "./s3r-radio.js";
const CW = { 1: "CW", 2: "CCW", 3: "CCW", 4: "CW" };
const PLACE = { 1: "rear right", 2: "front right", 3: "rear left", 4: "front left" };
export default {
  T: 62,
  steps: [
    { t0: 0,  text: "<b>Unplug the battery.</b> Look at each prop before you fit it: no chips, cracks or bends. Fit the props: each has a <b>CW</b> or <b>CCW</b> marking. <b>CW props go on M1 and M4. CCW props go on M2 and M3.</b> (M1 rear right, M2 front right, M3 rear left, M4 front left.) Tighten each nut with the <b>prop tool</b> from the tool kit.",
      why: "A prop on the wrong motor pushes air up instead of down, and the drone flips at take-off.",
      simple: "Battery out. CW props on M1 and M4, CCW on M2 and M3. Tighten with the prop tool.",
      more: "When the prop tool arrives, check: it fits the Gemfan prop nut." },
    { t0: 9,  text: "<b>Spin each prop with a finger</b>: it should spin freely and straight.",
      why: "A prop that rubs or wobbles shakes the drone and the camera picture.",
      simple: "Flick each prop: free and straight.",
      more: "When the props arrive, check: how Gemfan marks CW and CCW on a prop, and which face goes up (look for the letters); and what to do if a prop has no letters (the manufacturer's page)." },
    { t0: 14, text: "<b>Weigh the drone</b> with its battery fitted (the payload is not on yet) on your kitchen scale. Write the number down: ____ g. Compare it with the <b>weight in Fly safely, Step 0</b>. Your scale reading is the one that counts. <b>250 g or more must be registered.</b>",
      why: "The rules that apply depend on the real weight, not the planned one.",
      simple: "Weigh it with the battery. Write it down. 250 g or more = register it." },
    { t0: 21, text: "Check the site on <b>NAV Drone</b> first (NAV CANADA's map, NAV Drone Viewer: map.navdrone.ca, no account needed, or the NAV Drone app). Basic flying needs <b>uncontrolled airspace</b>, more than <b>5.6 km from an airport</b> and <b>1.9 km from a heliport</b>. <b>Edmonton city parks are not allowed</b> for this drone (it is over 250 g): use private land with the owner's permission.",
      why: "See Fly safely, Step 5, in the guide.",
      simple: "NAV Drone first. Not near airports. Not in city parks: private land with permission." },
    { t0: 29, text: "<b>First hover of the bare quad.</b> Fly only when <b>all six</b> are true: you hold the Basic drone pilot certificate; you hold the ISED amateur radio certificate (Basic); the drone is registered; its registration number is marked on it; the site is in uncontrolled airspace; nobody is within <b>30 m</b> sideways. Never above <b>122 m</b>.",
      why: "If you fly by a screen, you need a visual observer; until then, fly looking at the drone.",
      simple: "Six things true, then fly. Nobody within 30 m. Look at the drone, not the screen." },
    { t0: 38, text: "Use the <b>GNB pack</b> (the learning pack). Drone on flat open ground, <b>camera pointing away from you</b>. Radio on, <b>arm switch OFF</b>, <b>Angle switch ON</b>, pack switch on its GNB position. Plug in the battery and <b>step back at least 5 m</b>. <b>Arm.</b> Slowly raise the throttle until it lifts off; hold it about <b>1 metre</b> up for up to <b>30 seconds</b>. Lower the throttle gently to land. <b>Disarm. Unplug the battery.</b>",
      why: "Camera away from you means the sticks work the way you practised in the simulator.",
      simple: "Angle switch on, 5 m back, arm, slowly up to 1 m, 30 s, gently down, disarm, battery out." },
    { t0: 50, text: "<b>Touch each motor</b>: they should all feel about the same. If one is much hotter or colder than the others, <b>do not fly again</b> until you have found out why.",
      why: "One motor working much harder than the rest points to a problem with it or its prop.",
      simple: "Feel the motors. One very different: don't fly until you know why." },
    { t0: 55, text: "<b>Landing:</b> the bare drone has no legs yet, so take off and land on a <b>flat board or hard flat ground, not grass</b>. Land <b>straight down and slowly</b>, then disarm as soon as it touches. (Later, with the payload and legs on, the Pi hangs only about 2.5 cm above the ground and the feet are close together: the same rule matters even more.)",
      why: "After a hard landing, use the \"After a hard landing\" checklist (its own lesson).",
      simple: "Hard flat ground. Straight down, slow, disarm on touch-down." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, 0.5, 0),
      hide: /^(campose_|cone_|HS_|arrow_|mug_|hand_|radio_|leg_|pi_|hat_|thermal_|gps_pcb|gps_antenna|gps_foam|gps_cable|zip_tie|pigtail_5v|battery_pack_liion|smokestopper_|monitor_|laptop_tag)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    const droneRoot = m.n("drone_root"), dHome = droneRoot.position.clone();
    const Y = V(0, 1, 0);
    const props = [1, 2, 3, 4].map(i => {
      const hub = m.home(`prop_M${i}_hub`).p.clone(), bl = m.n(`prop_M${i}_blades`), bh = m.home(`prop_M${i}_blades`);
      return { i, bl, off: bh.p.clone().sub(hub), hub, q: bh.q.clone(), a: 0 };
    });
    const turn = (pr, a) => { pr.bl.position.copy(pr.hub).add(pr.off.clone().applyAxisAngle(Y, a)); pr.bl.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(Y, a)).multiply(pr.q); };
    // kitchen scale under the drone while it is weighed
    const scale = new THREE.Group(); root.add(scale);
    E.mesh(new THREE.BoxGeometry(22, 2, 22), E.mat(0xe8eaec, { roughness: 0.4 }), scale).position.y = 1;
    const sd = E.canvasTex(300, 100, c => { c.fillStyle = "#c9e3b8"; c.fillRect(0, 0, 300, 100); c.fillStyle = "#111"; c.font = "bold 64px monospace"; c.fillText("____ g", 20, 72); });
    const disp = E.mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ map: sd.tex, toneMapped: false }), scale);
    disp.position.set(0, 1.4, 11.05); disp.castShadow = false;
    scale.visible = false;
    // the radio with the pilot, behind the drone's tail (camera pointing away from him), facing the drone
    // picture check 11 Nov, row 15: the radio lies 5 m behind the tail (it was 45 cm), on flat ground, with a 5 m bar
    const p = makePocket(E, root, V(-500, 6.2, 0));
    p.group.rotation.y = Math.PI / 2; p.group.updateMatrixWorld(true);
    const ground = E.mesh(new THREE.BoxGeometry(1500, 0.2, 1000), E.mat(0xdfe6dc, { roughness: 0.9 }), root);
    ground.position.set(-230, -0.25, 0); ground.castShadow = false; ground.visible = false;
    const bar5 = E.mesh(new THREE.BoxGeometry(440, 1, 40), E.mat(0xb45a00, { roughness: 0.6 }), root);   // 40 cm wide, or it is under 1 px on a phone
    bar5.position.set(-250, 0.3, 0); bar5.castShadow = false; bar5.visible = false;
    let lastT = 0;
    const top = [V(-9, 34, 0), V(0, 2, 0)];
    const ov = [V(-20, 26, 34), V(0, 3, 0)];
    const far = [V(-230, 60, 140), V(-20, 50, 0)];   // the hover is drawn at its real height, 1 m
    const back5 = [V(-250, 110, 560), V(-250, 45, 0)];   // drone and radio in one picture, 5 m apart
    const motorCam = [V(18, 14, 22), V(0, 2, 0)];
    let st = {};
    return {
      cams: [[0, ...top], [13.4, ...top], [14.4, ...ov], [28.4, ...ov], [29.4, ...far], [37.4, ...far], [38.4, ...back5], [41.4, ...back5], [42.4, ...far], [49.4, ...far], [50.4, ...motorCam], [54.4, ...motorCam], [55.4, ...ov], [62, ...ov]],
      tags: [
        { text: "Battery out", cls: "red", at: () => m.at("battery_xt60").add(V(0, 2, 0)), from: 0.4, to: 3 },
        ...[1, 2, 3, 4].map(i => ({ text: `M${i} ${PLACE[i]}: ${CW[i]}`, cls: CW[i] === "CW" ? "blue" : "warn", at: () => m.at(`prop_M${i}_hub`).add(V(0, 2, 0)), from: 2 + (i - 1) * 1.5, to: 9 })),
        { text: "Free and straight", cls: "good", at: () => m.at("prop_M2_hub").add(V(0, 2, 0)), from: 10, to: 14 },
        { text: "Write your reading: ____ g", cls: "blue", at: () => V(0, 4, 13), from: 15.5, to: 21 },
        { text: "250 g or more: register it", cls: "warn", at: () => V(0, 12, 0), from: 17, to: 21 },
        { text: "NAV Drone first; no city parks", cls: "warn", at: () => V(0, 12, 0), from: 22, to: 29 },
        { text: "All six true; nobody within 30 m", cls: "red", at: () => V(0, 30, 0), from: 29.6, to: 38 },
        { text: "Step back at least 5 m", cls: "warn", at: () => p.at("screen").add(V(0, 20, 0)), from: 39, to: 42.4 },
        { text: "About 1 m, up to 30 s", cls: "good", at: () => droneRoot.getWorldPosition(new THREE.Vector3()).add(V(0, 10, 0)), from: 43, to: 47.5 },
        { text: "Disarm, battery out", cls: "warn", at: () => V(0, 12, 0), from: 48, to: 50 },
        { text: "All about the same", cls: "good", at: () => m.at("M2_bell").add(V(0, 2.4, 0)), from: 51, to: 55 },
        { text: "Hard flat ground, not grass", cls: "warn", at: () => V(0, 12, 0), from: 56, to: 62 },
      ],
      update(t) {
        // props appear one by one (2-8 s)
        [1, 2, 3, 4].forEach(i => show(new RegExp(`^prop_M${i}_`), t >= 2 + (i - 1) * 1.5));
        // finger spin (10-13 s), then the hover (armed 41-48 s)
        const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
        const armed = t >= 41 && t < 48;
        props.forEach((pr, k) => {
          const dir = pr.i === 1 || pr.i === 4 ? -1 : 1;
          const flick = t >= 10 + k * 0.7 && t < 11 + k * 0.7 ? 8 : 0;
          pr.a += dir * (armed ? 40 : flick) * dt; turn(pr, pr.a);
        });
        // weighing (14.5-21 s): the drone sits on the scale
        scale.visible = t >= 14.5 && t < 21;
        const up = prog(t, 41.5, 44) * (1 - prog(t, 46, 47.8));     // 0..1 of the 1 m hover
        droneRoot.position.copy(dHome).add(V(0, (scale.visible ? 0.02 : 0) + 1.0 * up, 0));   // model metres
        show(/^arrow_hover/, false);   // the model's arrow is drawn short (about 15 cm); here the drone really rises 1 m
        ground.visible = t >= 29 && t < 51;      // open ground while the far views are used; the bench top reads as the flat board
        bar5.visible = t >= 38.4 && t < 43;      // the 5 m between the drone and the pilot
        // radio: arm switch off until 40.6 s, throttle up, hold, down; the pilot stands 5 m back facing the drone's tail
        p.flick("SA", armed ? 1 : -1);
        p.throttle(armed ? -1 + 0.9 * prog(t, 41.2, 42.5) - 0.3 * prog(t, 46, 47.6) : -1);
        p.home("FIREWATCH");
        st = { props: [1, 2, 3, 4].filter(i => t >= 2 + (i - 1) * 1.5).map(i => `M${i}:${CW[i]}`), onScale: scale.visible, armed, heightM: Math.round(up * 100) / 100 };
      },
      state() { return st; },
    };
  },
};
