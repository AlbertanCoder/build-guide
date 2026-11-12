// Fly safely, Step 2: mark the registration number on the drone.
// Words: Transport Canada, "Registering your drone" (read 12 Nov 2026): register in the Drone Management Portal; "You must
// clearly mark your drone with its registration number"; permanent marker, permanent label or engraving; "The registration
// number must be clearly visible on the drone"; "We also recommend including your name and contact information".
// The guide's Fly safely page: a drone of 250 g or more must be registered, home-built ones too; carry proof of
// registration and your pilot certificate.
// Transport Canada does NOT say where on the drone. The place shown is a suggestion for this build, taken from the model
// (docs/models/step-08-test.glb): the top plate behind the battery, beside the battery lead. Nothing has to come off to
// read it, and it is not under the battery, its strap or a prop's circle. It has not been tried on the real frame.
// The number drawn is a placeholder (C- and ten # signs), never a real one. In the model +x = front, +z = right.
const NUM = "C-##########";
export default {
  T: 36,
  steps: [
    { t0: 0,  text: "<b>Register the drone</b> in Transport Canada's <b>Drone Management Portal</b>. You get a <b>registration number</b>.",
      why: "A drone of 250 g or more must be registered, home-built ones too. This build is over that.",
      simple: "Register it online first. You get a number." },
    { t0: 7,  text: "<b>Mark the number on the drone.</b> You can use a <b>permanent marker</b>, a <b>permanent label</b> or <b>engraving</b>.",
      why: "Transport Canada: \"You must clearly mark your drone with its registration number.\"",
      simple: "Write the number on the drone so it stays on." },
    { t0: 15, text: "The number must be <b>clearly visible</b> on the drone. Transport Canada does not say where. <b>A suggestion for this build:</b> the <b>top plate, behind the battery</b>.",
      why: "Nothing has to come off to read it there, and it is not under the battery, its strap or a prop.",
      simple: "Put it where you can read it without taking anything off.",
      more: "When the drone is built, check: the spot is flat and clear, and the number can still be read with the battery strapped on and plugged in." },
    { t0: 23, text: "Transport Canada also recommends adding your <b>name and contact information</b>.",
      why: "It is a recommendation, not a rule.",
      simple: "Add your name and how to reach you." },
    { t0: 29, text: "<b>Carry your proof of registration</b> whenever you fly, with your pilot certificate.",
      why: "The Basic rules ask for both.",
      simple: "Number on the drone. Proof of registration with you." },
  ],
  async build(E, root) {
    const { THREE, V, prog, clamp01 } = E;
    E.makeBench(root, { wall: false });
    const Y0 = 5.6;                                  // the rear feet stand on the bench
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, Y0, 0),
      hide: /^(campose_|cone_|HS_|arrow_|radio_|battery_pack_liion|smokestopper_|monitor_|LBL_|mug_|hand_)/ });
    m.shift(/^laptop_tag/, V(0, -Y0 / 100, 0));      // the laptop stands on the bench, not at the drone's height
    m.scene.updateWorldMatrix(true, true);
    // the laptop's screen: a drawing of the portal
    const face = m.n("laptop_tag_screen_face");
    const lt = E.canvasTex(1060, 620, c => {
      c.fillStyle = "#1b2430"; c.fillRect(0, 0, 1060, 620);
      c.fillStyle = "#e9f1ff"; c.font = "bold 58px Arial"; c.fillText("Drone Management Portal", 40, 90);
      c.font = "38px Arial"; c.fillStyle = "#c9d6e6"; c.fillText("Register a drone", 40, 160);
      c.fillStyle = "#26323f"; c.fillRect(40, 220, 980, 230);
      c.fillStyle = "#c9d6e6"; c.font = "36px Arial"; c.fillText("Your registration number", 70, 285);
      c.fillStyle = "#ffffff"; c.font = "bold 96px 'Courier New', monospace"; c.fillText(NUM, 70, 400);
      c.font = "26px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: the real page looks different)", 40, 590);
    });
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.106, 0.062), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false }));
    disp.position.z = 0.0006; face.add(disp);
    // the number, written on the top plate behind the battery (left of the battery lead); it reads from the drone's left side
    const P = V(-6.0, Y0 + 3.43, -1.25);
    const nt = E.canvasTex(660, 160, () => {});
    let shownN = -1;
    const drawNum = n => {
      if (n === shownN) return; shownN = n;
      const c = nt.canvas.getContext("2d"); c.clearRect(0, 0, 660, 160);
      c.fillStyle = "#f4f6f8"; c.font = "bold 86px 'Courier New', monospace"; c.textBaseline = "middle"; c.fillText(NUM.slice(0, n), 18, 84);
      nt.tex.needsUpdate = true;
    };
    const num = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.8), new THREE.MeshBasicMaterial({ map: nt.tex, transparent: true, toneMapped: false }));
    num.position.copy(P);
    num.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0)));   // text runs toward the tail, its top toward the right side
    root.add(num);
    // a marker pen: tip at the group's origin, body toward local -x
    const pen = new THREE.Group(); root.add(pen);
    E.mesh(E.alongX(new THREE.ConeGeometry(0.16, 0.5, 16)).translate(-0.25, 0, 0), E.mat(0xe9ecef), pen);
    E.mesh(E.alongX(new THREE.CylinderGeometry(0.16, 0.3, 0.9, 16)), E.M.dark, pen).position.x = -0.95;
    E.mesh(E.alongX(new THREE.CylinderGeometry(0.6, 0.6, 10.5, 24)), E.M.black, pen).position.x = -6.65;
    pen.quaternion.copy(E.qFromDir(V(0.85, -0.5, 0.12)));
    // a white permanent label with the name and contact, on the other side of the battery lead; it reads from the right side
    const P2 = V(-6.0, Y0 + 3.43, 1.25);
    const lb = E.canvasTex(600, 140, c => {
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, 600, 140);
      c.fillStyle = "#111111"; c.font = "bold 50px Arial"; c.textBaseline = "middle"; c.fillText("YOUR NAME · PHONE", 26, 74);
    });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.7), E.mat(0xffffff, { map: lb.tex, roughness: 0.6 }));
    lab.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 0, -1), V(0, 1, 0)));
    root.add(lab);
    const scr = m.at("laptop_tag_screen_face");
    const both = [V(18, 24, 28), V(3, 5, -13)];
    const lapCam = [scr.clone().add(V(0, 3.5, 13)), scr.clone().add(V(0, 0.4, 0))];
    const leftClose = [V(-6.3, Y0 + 14.5, -5.6), V(-6.0, Y0 + 3.4, -1.0)];
    const where = [V(-13, Y0 + 27, -19), V(-2, Y0 + 2, -2.5)];
    const rightClose = [V(-6.3, Y0 + 14.5, 5.6), V(-6.0, Y0 + 3.4, 1.0)];
    const ov = [V(-20, 28, 36), V(0, 6, 0)];
    let st = {};
    return {
      cams: [[0, ...both], [1.6, ...both], [2.6, ...lapCam], [7.4, ...lapCam], [8.4, ...leftClose], [18.4, ...leftClose], [19.4, ...where], [23.4, ...where], [24.4, ...rightClose], [29.4, ...rightClose], [30.4, ...ov], [36, ...ov]],
      tags: [
        { text: "Register here first", cls: "blue", at: () => scr.clone().add(V(0, 3.6, 0)), from: 0.6, to: 7 },
        { text: "Permanent marker, permanent label or engraving", cls: "blue", at: () => P.clone().add(V(0, 2.4, 0)), from: 8.6, to: 15 },
        { text: "A suggestion: top plate, behind the battery", cls: "good", at: () => P.clone().add(V(0, 1.2, 0)), from: 15.6, to: 23 },
        { text: "Recommended: your name and contact", cls: "blue", at: () => P2.clone().add(V(0, 1.2, 0)), from: 24.6, to: 29 },
        { text: "Carry proof of registration", cls: "warn", at: () => V(0, Y0 + 9, 0), from: 30.6, to: 36 },
      ],
      update(t) {
        // the pen comes down at 9 s, writes until 12.5 s, lifts away
        const k = clamp01((t - 9) / 3.5);
        drawNum(Math.round(NUM.length * k));
        const lift = (1 - prog(t, 8, 9)) + prog(t, 12.6, 13.6);
        const wob = k > 0 && k < 1 ? Math.sin(t * 18) * 0.1 : 0;
        pen.visible = t >= 7.6 && t < 13.8;
        pen.position.set(-4.45 - 3.1 * k - 3 * lift, Y0 + 3.47 + 5 * lift, -1.25 + wob);
        // the name label is pressed on at 24 to 25.2 s
        lab.visible = t >= 24;
        lab.position.copy(P2).add(V(0, 3 * (1 - prog(t, 24, 25.2)), 0));
        st = { written: shownN, of: NUM.length, number: NUM.slice(0, shownN), nameLabel: t >= 25.2 };
      },
      state() { return st; },
    };
  },
};
