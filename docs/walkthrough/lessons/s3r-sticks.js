// Stage 3: what each stick does. Words: throttle, yaw, pitch, roll (Shad knew only throttle and roughly roll, 7 Nov).
// Stick layout = mode 2 ("2: Left = Rud+Thr", manual.edgetx.org/bw-radios/radio-settings/radio-setup); OBSERVED on his
// radio: the left stick stays where it is put (the throttle). A small drone beside the radio shows what each move does.
import { makePocket } from "./s3r-radio.js";
export default {
  T: 50,
  steps: [
    { t0: 0, text: "Two sticks, four moves. Each move has a name. This lesson teaches all four, one at a time, on a pretend drone.",
      why: "The simulator, and later your real drone, use exactly these four moves.",
      simple: "Left stick: two moves. Right stick: two moves. That's all a drone needs.",
      more: "These four names are used everywhere: in the simulator, in Betaflight (the drone's software) and in every FPV video. Learn them once and you'll understand other pilots." },
    { t0: 6, text: "<b>Throttle</b> = <b>left stick up and down</b>. Up = more power, the drone climbs. Down = less power, it sinks. All the way down = motors at their slowest.",
      why: "Throttle is the gas pedal. It's the only stick that stays where you leave it, so the power doesn't jump when you let go.",
      simple: "Left stick up = go up. Left stick down = go down." },
    { t0: 16, text: "<b>Yaw</b> = <b>left stick left and right</b>. The drone <b>spins on the spot</b>, like turning your head left or right. It doesn't move sideways.",
      why: "Yaw points the drone's nose (and its camera) where you want to look.",
      simple: "Left stick sideways = turn to face another way." },
    { t0: 25, text: "<b>Pitch</b> = <b>right stick up and down</b>. Up = the nose tips down and the drone <b>flies forward</b>. Down = it tips back and flies <b>backward</b>.",
      why: "A drone moves by tilting: tip forward and the propellers push it forward.",
      simple: "Right stick up = go forward. Right stick down = go back.",
      more: "A drone has no wheels and no rudder. It moves by tilting: the propellers always push 'up' from the drone's point of view, so tilting forward turns some of that push into forward motion." },
    { t0: 34, text: "<b>Roll</b> = <b>right stick left and right</b>. The drone <b>tilts to the side and slides</b> that way, without turning.",
      why: "Roll moves you sideways, like stepping left or right without turning your body.",
      simple: "Right stick sideways = slide left or right." },
    { t0: 42, text: "Recap: <b>left = throttle (up/down) + yaw (turn)</b>. <b>Right = pitch (forward/back) + roll (sideways)</b>. Let go of the right stick and it springs back to the middle: the drone stops tilting.",
      why: "Knowing which stick does what is the whole skill you practise in the simulator.",
      simple: "Left stick: up/down and turn. Right stick: forward/back and sideways.",
      more: "This layout (throttle and yaw on the left) is called Mode 2. The left stick on your radio stays where you leave it, which matches it." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const p = makePocket(E, root, V(-8, 6.2, 4));
    p.group.rotation.y = 0.25;
    p.group.updateMatrixWorld(true);
    // a simple pretend drone: X frame, four motors + props, a red nose so its front is clear
    const d = new THREE.Group(); d.position.set(12, 9, 0); d.scale.setScalar(1.5); root.add(d);
    const body = E.mesh(new THREE.BoxGeometry(3, 1, 4), E.mat(0x2b3036), d);
    const nose = E.mesh(new THREE.BoxGeometry(1.6, 0.9, 0.8), E.mat(0xd2302c), d); nose.position.set(0, 0.2, -2.3);
    const props = [];
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
      const arm = E.mesh(new THREE.BoxGeometry(0.6, 0.4, 6.2), E.M.dark, d); arm.position.set(x / 2, 0, z / 2); arm.rotation.y = Math.atan2(x, z);
      const mot = E.mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 16), E.M.metal, d); mot.position.set(x, 0.4, z);
      const pr = E.mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.06, 24), E.mat(0x9fb3c8, { transparent: true, opacity: 0.45 }), d); pr.position.set(x, 0.95, z); props.push(pr);
    }
    void body;
    const home = d.position.clone();
    let st = {};
    // 11 Nov (pictures, rows 11 and 13): seen from a little higher, so the drone does not turn edge-on when it tips forward. On a
    // narrow (phone) picture the camera also stands further back, so the left stick is in the picture too.
    const narrow = ((document.getElementById("stage") || {}).clientWidth || innerWidth) < 600;
    const both = narrow ? [V(2.5, 26, 34), V(2.5, 6.5, 0)] : [V(3, 22, 26), V(3, 6.5, 0)];
    // 11 Nov (pictures, row 12): the labels sit above each stick's ring; before, they were on the stick top and hid the stick when it was pushed up
    const overL = () => p.world(-4.7, 3.9), overR = () => p.world(4.7, 3.9);
    return {
      cams: [[0, ...both], [50, ...both]],
      tags: [
        { text: "Left stick", cls: "blue", at: overL, from: 1, to: 6 },
        { text: "Right stick", cls: "blue", at: overR, from: 1, to: 6 },
        { text: "Red = the drone's nose (front)", cls: "warn", at: () => d.localToWorld(V(0, 1.4, -2.4)), from: 2, to: 6 },
        { text: "THROTTLE: up / down", cls: "good", at: overL, from: 6.5, to: 16 },
        { text: "YAW: turn", cls: "good", at: overL, from: 16.5, to: 25 },
        { text: "PITCH: forward / back", cls: "good", at: overR, from: 25.5, to: 34 },
        { text: "ROLL: sideways", cls: "good", at: overR, from: 34.5, to: 42 },
      ],
      update(t) {
        // throttle: rests at the bottom, pushed up then back down
        const thr = t < 6.5 ? -1 : t < 16 ? -1 + 2 * Math.max(0, Math.sin(Math.min(1, (t - 7) / 7) * Math.PI)) * 0.8 : -1 + 0.9 * prog(t, 16, 16.8);   // from 16 s it is raised to the middle (it used to jump there)
        p.throttle(thr);
        p.home("POCKET");   // the model is still POCKET here (FIREWATCH is named three lessons later)
        // the left stick's yaw (sideways) is shown by tilting the stick sideways
        const yawIn = t > 17 && t < 24 ? Math.sin((t - 17) / 7 * Math.PI * 2) : 0;
        const ry = t > 26 && t < 33 ? Math.sin((t - 26) / 7 * Math.PI * 2) : 0;   // pitch input
        const rx = t > 35 && t < 41 ? Math.sin((t - 35) / 6 * Math.PI * 2) : 0;   // roll input
        p.stickR(rx, ry);
        p.yawL(yawIn);
        // the drone's response
        const climb = t < 6.5 ? 0 : t < 16 ? 4 * Math.max(0, Math.sin(Math.min(1, (t - 7) / 7) * Math.PI)) : 0;
        d.position.set(home.x + rx * 3, home.y + climb, home.z - ry * 5);
        d.rotation.set(-ry * 0.22, -yawIn * 0.9, -rx * 0.35);   // stick right = nose right (10 Nov audit: it was drawn the other way round)
        const spin = (t * 40) % (Math.PI * 2); props.forEach(pr => { pr.rotation.y = spin; });
        st = { throttle: thr, climb, pitchIn: ry, rollIn: rx, yawIn };
      },
      state() { return st; },
    };
  },
};
