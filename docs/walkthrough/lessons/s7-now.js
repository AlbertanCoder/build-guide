// Step 7, the bullets marked NOW (S7.1, S7.3 NOW, S7.5, S7.6, S7.7 NOW). The payload is NOT fitted yet: the page says
// fit it only after the bare drone's first hover (Step 8, item 8). Words follow the guide (index.html, after the
// 10 Nov audit). Parts: docs/models/step-07-mount.glb, which shows the finished mount; here the payload parts are only
// "held in place" (drawn see-through), then marked. Directions: +x = front (camera), +z = the drone's right side seen
// from the tail looking forward (the model's M1 rear right sits at -x, +z).
export default {
  T: 52,
  steps: [
    { t0: 0,  text: "<b>Do not fit the payload</b> (the Pi, the thermal camera and the GPS) until the bare drone has made its <b>first hover</b> (item 8 in Step 8). Do the bullets marked <b>NOW</b> first, then go to Step 8 and finish item 8, then come back for the bullets marked <b>AFTER THE FIRST HOVER</b>.",
      why: "The rule: the thermal lens needs an unobstructed vertical line to the ground. Mounted on top of the frame it just stares at the top plate and the battery.",
      simple: "Payload later. First the NOW jobs, then the first hover, then the payload." },
    { t0: 8,  text: "<b>NOW</b> hold the parts in place and <b>mark</b> where they go; <b>stick nothing yet</b>. Under the bottom plate, centre the <b>Pi 36 mm behind the stack centre</b>. Hold the <b>MLX90640</b> just ahead of the Pi, <b>lens straight down</b>, its wide side across the drone. Hold the <b>PA1010D</b> on the top plate in front of the battery, <b>antenna up</b>. Mark each spot with the marker.",
      why: "Hold the real parts in place first: these positions come from a design simulation, not a test fit.",
      simple: "Hold, don't stick. Pi under the plate behind the stack, camera just ahead of it looking down, GPS on top in front of the battery. Mark." },
    { t0: 18, text: "Lay the <b>GPS cable's route</b> along the drone's <b>right-hand side</b> (right as seen from the tail looking forward): from the HAT up through the bottom plate's window next to the Pi, over the flight controller, and round the front edge of the top plate to the GPS. If a stack screw head or tip sticks out under the bottom plate, <b>mark it too</b>.",
      why: "A screw tip under the pad would stop it lying flat; marking it now means you can cut a small hole for it later.",
      simple: "Lay the GPS cable along the right side and mark any screw sticking out underneath." },
    { t0: 26, text: "<b>NOW</b> nothing hanging below the bottom plate may be the <b>lowest point</b> of the drone: a landing on the lens or the Pi will break it. Before the first flight WITH the payload, <b>landing legs</b> must stand lower than it (you fit them later: S7.8, after the first hover). The legs must stand at least <b>40 mm</b> below the bottom plate; the payload's lowest part sits about <b>29 mm</b> below it.",
      why: "The 29 mm comes from the design check (see \"How this was checked\" in the guide).",
      simple: "Plan the legs now: at least 40 mm, because the payload hangs about 29 mm." },
    { t0: 33, text: "<b>NOW</b> route every cable <b>out of the prop circles</b>. Tie the loose ends down.",
      why: "A cable that reaches a spinning prop gets cut, or stops the prop.",
      simple: "No cable in a prop's circle. Tie the loose ends." },
    { t0: 38, text: "<b>NOW</b> for the first hover (no payload yet): slide the battery on the grip pad until the drone <b>balances on two fingers under the arms</b>, about <b>3 mm ahead of the frame centre</b>, then strap it down with the <b>first Kevlar strap</b>.",
      why: "The Li-ion pack is 44 mm tall and wide against the LiPo's 38 x 26 mm, so its strap goes about 177 mm round instead of 128 mm.",
      simple: "Slide the battery until it balances on two fingers, then strap it." },
    { t0: 46, text: "Now go to <b>Step 8</b> and work through to <b>item 8, the first hover</b>. Then come back to Step 7's AFTER THE FIRST HOVER bullets.",
      why: "The bare drone flies first, so a problem with the drone itself shows up before the payload is on it.",
      simple: "Next: Step 8, up to the first hover." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-07-mount.glb", { at: V(0, 9, 0), hide: /^(campose_|cone_pilot|battery_pack_liion|LBL_)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    const PAY = /^(pi_|hat_|thermal_|gps_pcb|gps_antenna|gps_foam|gps_cable|pigtail_5v|zip_tie|pi_strap)/;
    // "held in place": see-through, so it reads as a position, not a fitted part
    const ghost = (re, k) => m.all(re).forEach(o => o.traverse(x => { if (x.isMesh) { x.material.transparent = k < 1; x.material.opacity = k; x.material.depthWrite = k >= 1; } }));
    const marks = ["pi_pcb", "thermal_pcb", "gps_pcb"].map(n => {
      const s = E.mesh(new E.THREE.SphereGeometry(0.28, 12, 10), E.mat(0x111111), root); s.visible = false; return [n, s];
    });
    const front = m.at("stack_fc");
    const ov = [V(-16, 22, 26), V(0, 8, 0)];
    const under = [V(-6, 2, 20), V(-1, 7.5, 0)];
    const right = [V(-8, 16, 22), V(0, 10, 1)];
    const side = [V(0, 11, 36), V(0, 8.5, 0)];
    let st = {};
    return {
      cams: [[0, ...ov], [7.4, ...ov], [8.4, ...under], [17.4, ...under], [18.4, ...right], [25.4, ...right], [26.4, ...side], [32.4, ...side], [33.4, ...ov], [37.4, ...ov], [38.4, ...side], [52, ...side]],
      tags: [
        { text: "Payload only after the first hover", cls: "red", at: () => V(0, 17, 0), from: 0.6, to: 8 },
        { text: "Lens needs a clear line straight down", cls: "blue", at: () => m.at("thermal_lens").add(V(0, -5.2, 0)), from: 3, to: 8 },
        { text: "Pi: 36 mm behind the stack centre", cls: "blue", at: () => m.at("pi_pcb").add(V(0, -3, 0)), from: 9.2, to: 13.4 },
        { text: "Lens straight down", cls: "blue", at: () => m.at("thermal_pcb").add(V(0, -3, 0)), from: 13.6, to: 18 },
        { text: "Hold and mark: stick nothing yet", cls: "warn", at: () => m.at("gps_pcb").add(V(0, 1.6, 0)), from: 9.2, to: 18 },
        { text: "Right-hand side", cls: "blue", at: () => m.at("gps_cable_joint_2_0").add(V(0, 0.4, 2.2)), from: 19.2, to: 22.4 },
        { text: "Mark any screw sticking out underneath", cls: "warn", at: () => front.clone().add(V(0, -3.6, 0)), from: 22.6, to: 26 },
        { text: "Legs: at least 40 mm", cls: "blue", at: () => m.at("leg_front_0_foot").add(V(0, -3.2, 0)), from: 28.4, to: 33 },
        { text: "Payload: about 29 mm", cls: "warn", at: () => m.at("thermal_lens").add(V(0, -3.6, 0)), from: 27.2, to: 33 },
        { text: "Out of the prop circles", cls: "red", at: () => m.at("clearance_M4").add(V(0, 1.4, 0)), from: 33.6, to: 38 },
        { text: "Balance: about 3 mm ahead of centre", cls: "blue", at: () => m.at("cg_ball").add(V(0, 2.5, 0)), from: 40, to: 43 },
        { text: "First Kevlar strap", cls: "blue", at: () => m.at("strap_top_2").add(V(0, 2.2, 0)), from: 43.2, to: 46 },
        { text: "Next: Step 8, up to the first hover", cls: "good", at: () => V(0, 18, 0), from: 46.5, to: 52 },
      ],
      update(t) {
        // the thermal camera's view cone, only for the rule at the start
        show(/^cone_thermal/, t > 2.6 && t < 8);
        // the payload: held in place (see-through) for the marking jobs, otherwise not on the drone
        const held = (t > 0.5 && t < 8) || (t >= 8.6 && t < 33);
        show(PAY, held);
        ghost(PAY, 0.4);
        show(/^zip_tie|^pi_strap|^pi_pad|^pi_standoff|^pigtail_5v|^gps_foam|^thermal_tape/, false);     // pad, ties, second strap, foam tapes and the Pi lead come after the first hover
        show(/^gps_cable/, t >= 18.6 && t < 26);
        ghost(/^gps_cable/, 1);     // the cable is laid along its route, so it is drawn solid
        marks.forEach(([n, s], i) => { s.visible = t >= 14 + i * 1.2 && t < 26; s.position.copy(m.at(n)).add(V(0, n === "gps_pcb" ? -0.25 : n === "pi_pcb" ? 1.45 : 0.35, 0)); });   // each mark on the plate itself
        // legs: planned now, fitted in S7.8; shown see-through while the plan is explained
        show(/^leg_/, t >= 26.6 && t < 33);
        ghost(/^leg_/, 0.4);
        show(/^clearance_/, t >= 33.4 && t < 38);
        // the battery slides to the balance point (about 3 mm ahead of the frame centre: 11 Nov audit, NEW-5; it was drawn at 7), then the strap goes on
        const bk = prog(t, 39, 42);
        m.shift(/^battery_(pack|grip|band|balance|xt60|lead)/, V(-0.015 + 0.0155 * bk, 0, 0));   // the model's home x is 2.5 mm ahead; ends at 3 mm ahead
        show(/^strap_/, t >= 43);
        show(/^cg_/, t >= 40 && t < 46.5);
        st = { payloadShown: held, payloadSeeThrough: true, marks: marks.filter(([, s]) => s.visible).length, legsPlanned: t >= 26.6 && t < 33,
               batteryAheadMm: Math.round((2.5 + (-15 + 15.5 * bk)) * 10) / 10, strapped: t >= 43 };
      },
      state() { return st; },
    };
  },
};
