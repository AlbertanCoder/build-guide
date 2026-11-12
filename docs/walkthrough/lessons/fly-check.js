// Fly safely, Step 7: "Every flight: the field checklist" (index.html, #flight-check-card), ten checks in the page's order:
// before you plug in the pack 1 to 8, after you plug in 9, after you land 10. The whys are the guide's own lines:
// the airspace line under "Where and when you can fly"; the 30 m line and CAR 901.35 in "Before you fly"; the wrong-prop
// line from the first-hover lesson; "A slid pack changes the balance" from the hard-landing lesson; "Never power the VTX
// without its antenna" from Step 4; the pack switch and the 3-minute timer from Step 4; the Ground height line and the
// power-off line from the payload lesson. Parts: docs/models/step-08-test.glb (drone with payload, legs and props) on a
// flat board; each check lights up the parts it is about. The radio is the Stage 3 Pocket. The page does not say which
// 3-position switch is the pack switch (it is the one you chose in Step 4), so both of the Pocket's are ringed.
// The drone's plug slides onto the pack's plug the way the bench-test lesson draws it. In the model +x = front, +z = right.
import { makePocket } from "./s3r-radio.js";
const CW = { 1: "CW", 2: "CCW", 3: "CCW", 4: "CW" };
const PLACE = { 1: "rear right", 2: "front right", 3: "rear left", 4: "front left" };
const STEPS = [
  { re: null, cam: "wide", cls: "blue", tag: "Airspace check today; NOTAMs; fire bans",
    text: "<b>Before you plug in the pack.</b> The spot <b>passed the airspace check today</b> (NAV Drone or the NRC map), and you checked <b>NOTAMs</b> and <b>fire bans</b>.", why: "Look up the exact take-off point every time: an empty park is not a legal site.", simple: "Map check today. NOTAMs and fire bans checked." },
  { re: null, cam: "high", cls: "blue", tag: "Nobody within 30 m sideways",
    text: "<b>Nobody within 30 m</b> sideways.", why: "That is the Basic-operations boundary, not a safe distance in itself.", simple: "Look around: no people within 30 m." },
  { re: /^prop_|^frame_arm|^frame_top_plate/, cam: "top", cls: "blue", tag: "No frost, ice or snow",
    text: "<b>No frost, ice or snow</b> on the props or the frame.", why: "Wipe the props and the frame clean and dry before you fly (CAR 901.35).", simple: "Props and frame clean and dry." },
  { re: /^prop_/, cam: "top", cls: "blue", tag: "Right prop on each motor; nuts tight",
    text: "<b>Props on the right motors</b>: <b>CW on M1 and M4, CCW on M2 and M3</b>, and the <b>nuts are tight</b>.", why: "A prop on the wrong motor pushes air up instead of down, and the drone flips at take-off.", simple: "CW on M1 and M4, CCW on M2 and M3. Nuts tight." },
  { re: /^strap_|^battery_band|^battery_pack$/, cam: "side", cls: "blue", tag: "Strapped tight, cannot slide",
    text: "The <b>pack is strapped tight</b> and cannot slide.", why: "A slid pack changes the balance.", simple: "Strap tight. The pack cannot slide." },
  { re: /^antenna_triumph/, cam: "rear", cls: "blue", tag: "Video antenna screwed on",
    text: "The <b>video antenna is screwed on</b>.", why: "Never power the VTX without its antenna.", simple: "Antenna screwed on." },
  { re: null, cam: "radio", cls: "blue", tag: "Pack switch matches the pack",
    text: "The <b>pack switch</b> on the radio <b>matches the pack</b>: GNB or Li-ion (Step 4).", why: "The switch picks the settings for the pack you fitted, so you never type a profile in the field.", simple: "GNB pack: switch on GNB. Li-ion pack: switch on Li-ion." },
  { re: null, cam: "screen", cls: "blue", tag: "Radio on, timer reset",
    text: "The <b>radio is on</b> and its <b>timer is reset</b>.", why: "On the GNB pack, the radio's 3-minute timer is your main land-now signal.", simple: "Radio on. Timer back to its start." },
  { re: /^pi_pcb|^hat_pcb|^gps_pcb|^gps_antenna/, cam: "under", cls: "warn", tag: "Wait for \"Ground height set\"",
    text: "<b>After you plug in:</b> start the payload the way that survives a Wi-Fi drop (Step 8), and wait for <b>\"Ground height set\"</b>.", why: "Fly only after this line appears.", simple: "Plug in. Start the payload. Wait for the Ground height line." },
  { re: /^pi_pcb|^battery_xt60|^xt60_body/, cam: "tail", cls: "good", tag: "Disarm, sudo poweroff, light off, unplug",
    text: "<b>After you land:</b> disarm. Type <code>sudo poweroff</code> in the SSH window and wait until the <b>Pi's light stays off</b>. Then unplug the pack.", why: "Pulling the pack while the Pi runs is a sudden power cut, and that can spoil the card.", simple: "Disarm, sudo poweroff, wait for the Pi's light to go out, then unplug." },
];
const DT = 6;
export default {
  T: STEPS.length * DT + 2,
  steps: STEPS.map((s, i) => ({ t0: i * DT, text: s.text, why: s.why, simple: s.simple })),
  async build(E, root) {
    const { THREE, V, prog } = E;
    // open ground and a flat board to take off from
    const ground = E.mesh(new THREE.BoxGeometry(1400, 0.4, 1400), E.mat(0x8fae7e, { roughness: 0.95 }), root); ground.position.y = -0.2; ground.castShadow = false;
    const BOARD = 1.2;
    E.mesh(new THREE.BoxGeometry(60, BOARD, 60), E.mat(0xc9a66b, { roughness: 0.8 }), root).position.y = BOARD / 2;
    const Y0 = BOARD + 5.6;                           // the rear feet stand on the board
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, Y0, 0),
      hide: /^(campose_|cone_|HS_|arrow_|radio_|battery_pack_liion|smokestopper_|monitor_|LBL_|mug_|hand_|laptop_tag)/ });
    const lit = new Set();
    const glowAll = (re, on) => m.all(re).forEach(o => o.traverse(x => { if (x.isMesh) { x.material.emissive = new THREE.Color(0x1d7cff); x.material.emissiveIntensity = on ? 0.55 : 0; } }));
    // the radio, standing on the ground beside the board
    const p = makePocket(E, root, V(-41, 6.2, 16));
    p.group.rotation.y = 0.5; p.group.updateMatrixWorld(true);
    const scr = p.at("screen"), swMid = p.at("SB").lerp(p.at("SC"), 0.5);
    const rings = ["SB", "SC"].map(n => { const r = E.mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 40), new THREE.MeshBasicMaterial({ color: 0x1d7cff }), root); r.position.copy(p.at(n)).addScaledVector(V(0, 1, 0).applyQuaternion(p.group.quaternion), -0.45); r.quaternion.copy(p.group.quaternion); r.castShadow = false; r.visible = false; return r; });
    const face = V(Math.sin(0.5), 0.34, Math.cos(0.5)).normalize();          // the way the radio's face looks
    const C = {
      wide: [V(-28, 36, 70), V(-21, 5, 3)],
      high: [V(-30, 70, 92), V(-19, 4, 2)],
      top: [V(-9, Y0 + 34, 0), V(0, Y0 + 2, 0)],
      side: [V(4, Y0 + 8.2, 34), V(0, Y0 - 0.8, 0)],
      rear: [V(-30, Y0 + 10.2, 14), V(-4, Y0 + 1.2, 0)],
      tail: [V(-27, Y0 + 6, 19), V(-5, Y0 + 0.4, 0)],
      under: [V(-6, Y0 - 3.3, 26), V(-1, Y0 - 1.8, 0)],
      radio: [scr.clone().addScaledVector(face, 25).add(V(0, 1, 0)), scr.clone().add(V(0, -1.2, 0))],
      screen: [scr.clone().addScaledVector(face, 10).add(V(0, 0.5, 0)), scr.clone().add(V(0, -0.4, 0))],
    };
    const cams = [];
    STEPS.forEach((s, i) => { cams.push([i * DT + (i ? 0.6 : 0), ...C[s.cam]], [i * DT + DT - 0.4, ...C[s.cam]]); });
    cams.push([STEPS.length * DT + 2, ...C[STEPS[STEPS.length - 1].cam]]);
    const partAt = (re, up) => { const o = m.all(re)[0]; return o ? o.getWorldPosition(new THREE.Vector3()).add(V(0, up, 0)) : V(0, Y0 + 9, 0); };
    const tagAt = [
      () => V(0, Y0 + 9, 0), () => V(0, Y0 + 9, 0),
      () => V(-1.5, Y0 + 7, 0), () => V(-1.5, Y0 + 7, 0),
      () => partAt(/^strap_top/, 2.2), () => partAt(/^antenna_triumph_head/, 2.2),
      () => swMid.clone().add(V(0, 2.2, 0)), () => scr.clone().add(V(0, 3.6, 0)),
      () => partAt(/^pi_pcb/, 4.6), () => partAt(/^battery_xt60/, 2.6),
    ];
    let st = {};
    return {
      cams,
      tags: [
        ...STEPS.map((s, i) => ({ text: `${i + 1}. ${s.tag}`, cls: s.cls, at: tagAt[i], from: i * DT + 0.6, to: i === STEPS.length - 1 ? STEPS.length * DT + 2 : i * DT + DT })),
        ...[1, 2, 3, 4].map(i => ({ text: `M${i} ${PLACE[i]}: ${CW[i]}`, cls: CW[i] === "CW" ? "blue" : "warn", at: () => m.at(`prop_M${i}_hub`).add(V(0, 2, 0)), from: 3 * DT + 1.2 + (i - 1) * 0.5, to: 4 * DT })),
      ],
      update(t) {
        const k = Math.min(STEPS.length - 1, Math.floor(t / DT));
        // lights off first, then on: checks 3 and 4 share the props
        STEPS.forEach((s, i) => { if (i !== k && lit.has(i)) { glowAll(s.re, false); lit.delete(i); } });
        if (STEPS[k].re && !lit.has(k)) { glowAll(STEPS[k].re, true); lit.add(k); }
        rings.forEach(r => { r.visible = k === 6; });
        // the radio: off until check 8, then its main screen with the timer at its start
        if (k < 7) p.screen(""); else p.home("FIREWATCH", "03:00");
        p.flick("SA", -1); p.throttle(-1);
        // the pack: plugged in at check 9, unplugged at the end of check 10
        const plugged = prog(t, 8 * DT + 0.8, 8 * DT + 1.6) * (1 - prog(t, 9 * DT + 4.6, 9 * DT + 5.4));
        m.shift(/^xt60_body/, V(0.022, -0.003, 0.002).multiplyScalar(plugged));
        st = { check: k + 1, of: STEPS.length, lit: [...lit].map(i => i + 1), radioOn: k >= 7, packPluggedIn: plugged > 0.99 };
      },
      state() { return st; },
    };
  },
};
