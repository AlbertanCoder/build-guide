// Step 7, the bullets marked AFTER THE FIRST HOVER (S7.3 AFTER, S7.4, S7.4b, S7.7 AFTER, S7.8), with Step 7's safety
// lines and "Before you go on" box. Words follow the guide (index.html, after the 10 Nov audit).
// Parts: docs/models/step-07-mount.glb (the finished mount). Battery: the model's AFTER position is 2.5 mm ahead of
// the frame centre (front edge 42 mm, GPS board's rear edge 44 mm: the guide's "about 2 mm from the GPS board"); the
// NOW position is 3 mm ahead (the bare drone's balance point by the repo's weight table; 7 mm was the figure WITH the
// payload: 11 Nov audit, NEW-5), so the battery moves back about 0.5 mm: it barely moves (fix F2, 10 Nov: "back").
// Directions: +x = front, +z = right; model metres inside the model.
export default {
  T: 80,
  steps: [
    { t0: 0,  text: "<b>AFTER THE FIRST HOVER</b>: fix the parts on your marks. <b>Battery unplugged</b> while you work on the payload (the props may stay on). Make the <b>pad</b> from <b>two layers of the foam mounting tape</b>, stuck to the plate. <b>Leave the backing on the outer layer</b>, so the standoffs rest on it without sticking. Put a <b>1 cm square</b> of the same tape under each of the Pi's four standoffs.",
      why: "The pad stops the board touching carbon, and you do not need to drill the plate.",
      simple: "Two layers of foam tape on the plate, backing left on the outer layer. A square of tape under each Pi standoff.",
      more: "When the tape arrives, check: its thickness, and that two layers stay put under the zip ties." },
    { t0: 9,  text: "Stick the <b>MLX90640</b> to the pad, just ahead of the Pi, with a square of the foam mounting tape on the back of the board. The <b>lens points straight down</b>. Its <b>wide side runs across</b> the drone.",
      why: "The camera has to see the ground, nothing else.",
      simple: "Thermal camera on the pad, ahead of the Pi, lens down.",
      more: "When the thermal camera arrives, check: the back of the board is flat enough for tape." },
    { t0: 15, text: "If the battery covers part of the GPS mark, loosen its strap and <b>slide the battery back first</b> (you set its final place later in this lesson). Stick the <b>PA1010D</b> to the top plate in front of the battery with a strip of the foam mounting tape, so the board does not touch the carbon. The <b>antenna points up</b>.",
      why: "The GPS needs to see the sky.",
      simple: "GPS on the top plate in front of the battery, antenna up.",
      more: "When the GPS board arrives, check: the back of the board is flat enough for tape." },
    { t0: 20, text: "Run the <b>GPS cable</b> along the route you laid. Where you marked a screw head or tip, <b>cut a small hole in the pad</b> so the pad lies flat.",
      why: "A pad that rocks on a screw tip lets the Pi move.",
      simple: "Cable along its route. A small hole in the pad over any screw." },
    { t0: 25, text: "Use the <b>two slots</b> on the bottom plate's centre line just behind the stack (about <b>3 and 5 cm</b> behind it). For each slot, make a long zip tie by <b>joining two of the 100 mm zip ties</b> end to end. Thread it up through one end of the slot, across the top of the plate, back down through the other end of the same slot, then round under the Pi. Pull it snug and <b>cut the tail flush</b>.",
      why: "A cut tail is sharp: cut it flush.",
      simple: "Two long zip ties (two short ones joined), through the slots and round the Pi.",
      more: "When the Pi is on its standoffs, check: wrap a string round it and measure the loop. Two 100 mm ties joined must reach." },
    { t0: 35, text: "Then add the <b>second Kevlar strap</b> round the Pi and the plate as a second lock. The first strap stays on the battery.",
      why: "If a tie slips, the strap still holds the Pi.",
      simple: "Second strap round the Pi. First strap stays on the battery." },
    { t0: 39, text: "<b>Battery unplugged.</b> Find the <b>Pi power lead</b> you soldered to the flight controller's GND and 5V pads in Step 3 (+ to 5V, - to GND). Measure it once more before it goes into the Pi: <b>props off</b>, pack into the <b>smoke stopper</b>, smoke stopper into the drone. Meter on <b>DC volts</b>, <b>red probe on pin 1</b> of the micro-USB plug, <b>black probe on pin 5</b> (pins only, not the metal shell). It should read <b>about 5 V</b>. No 5 V, or a minus sign: <b>stop and ask</b>. Then unplug the pack.",
      why: "It has been through Steps 6 to 8 and the first hover. This is the lead's third check: its + and - in Stage 1, about 5 V at Step 5's first power-up, and now.",
      simple: "Smoke stopper, meter on the plug's pins 1 and 5: about 5 V. Then unplug." },
    { t0: 49, text: "Plug the micro-USB end into the Pi's socket marked <b>PWR IN</b> (not the one marked USB).",
      why: "The \"5 V rail\" arrival test covers the load.",
      simple: "Into PWR IN." },
    { t0: 53, text: "After the payload is on: loosen the strap and slide the battery <b>back</b> on the grip pad until it is <b>about 2 mm from the GPS board</b>, then strap it down again with the first Kevlar strap. The drone sits about <b>1 mm tail-heavy</b>, inside the 5 mm the design allows. Lift it on two fingers under the arms: it should <b>tip back only gently</b>.",
      why: "The GPS stops the battery from reaching the exact balance point.",
      simple: "Battery back to about 2 mm from the GPS, strap, check on two fingers." },
    { t0: 60, text: "Fit the <b>landing legs</b>, one at a time, each in place of the <b>bottom screw</b> of a frame standoff: the two at the very back of the bottom plate, and the two at the front of the middle plate, ahead of the stack. Take out that one screw. A small drop of <b>blue threadlocker</b> on each set screw (two per leg, eight in all). Screw an <b>M3 x 10 set screw</b> into the standoff through the plate until about <b>3.75 mm</b> sticks out below (the kit's metal ruler).",
      why: "That leaves about 3.75 mm in the standoff too, more than the 3 mm each side needs.",
      simple: "One leg at a time: screw out, set screw in with threadlocker, 3.75 mm showing." },
    { t0: 68, text: "Screw a <b>leg standoff</b> onto it, then a second set screw, the second leg standoff, and a <b>rubber foot</b> with its short screw. <b>25 mm standoffs at the back, 28 mm at the front.</b> The back legs reach about <b>56 mm</b> below the bottom plate; the front legs start 8 mm higher, on the middle plate, and end about <b>54 mm</b> below it.",
      why: "The legs, not the payload, must touch the ground: the payload's lowest part is about 29 mm below the plate. The stance is narrow, so land on flat ground.",
      simple: "Standoff, set screw, standoff, foot. 25 mm at the back, 28 mm at the front.",
      more: "When the parts arrive, check: each knurled standoff has a thread inside at BOTH ends (a female thread); two screwed together with a set screw hold with no wobble; the foot screws are 10 mm and hold the foot." },
    { t0: 75, text: "<b>Before you go on:</b> the lens has a clear view straight down; the Pi does not move when you wiggle it; on two fingers the drone tips back only gently; the battery is unplugged while you work. No bare circuit board touches carbon fibre; nothing loose near spinning props.",
      why: "These are Step 7's checks and safety lines.",
      simple: "Lens clear, Pi solid, tips back gently, battery out while working." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-07-mount.glb", { at: V(0, 9, 0), hide: /^(campose_|cone_pilot|battery_pack_liion|LBL_|clearance_)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    // picture check 11 Nov, row 16: the Pi lead hangs free beside the Pi until it has been measured (step 7) and goes
    // into the socket in step 8. It turns about its soldered end, so it stays with the drone when the drone is set down.
    // (the soldered blob is a child of the lead in the model, so the pivot hangs on the lead's own parent)
    const lead = m.n("pigtail_5v"), leadPivot = new E.THREE.Group();
    lead.parent.add(leadPivot); leadPivot.position.copy(lead.position).add(m.n("pigtail_5v_solder_a").position); leadPivot.updateMatrixWorld(true);
    leadPivot.attach(lead);
    const under = [V(-8, 1.5, 22), V(-2, 7.5, 0)];
    const top = [V(14, 22, 16), V(3, 12, 0)];
    const side = [V(0, 11, 36), V(0, 8.5, 0)];
    const legs = [V(-14, 4, 26), V(-1, 5, 0)];
    let st = {};
    return {
      cams: [[0, ...under], [14.4, ...under], [15.4, ...top], [24.4, ...top], [25.4, ...under], [52.4, ...under], [53.4, ...side], [59.4, ...side], [60.4, ...legs], [74.4, ...legs], [75.4, ...side], [80, ...side]],
      tags: [
        { text: "Battery unplugged", cls: "red", at: () => m.at("battery_xt60").add(V(0, 1.6, 0)), from: 0.5, to: 4 },
        { text: "Two layers; backing left on the outer layer", cls: "blue", at: () => m.at("pi_pad_layer_0").add(V(-3, -3.2, 0)), from: 2, to: 5 },
        { text: "1 cm square under each standoff", cls: "blue", at: () => m.at("pi_standoff_tape_0").add(V(0, -3, 0)), from: 5.2, to: 9 },
        { text: "Lens straight down, wide side across", cls: "blue", at: () => m.at("thermal_lens").add(V(0, -3.2, 0)), from: 10, to: 15 },
        { text: "Antenna up", cls: "blue", at: () => m.at("gps_antenna").add(V(0, 1.4, 0)), from: 16, to: 20 },
        { text: "Cable on its route; hole over any screw", cls: "warn", at: () => m.at("gps_cable_joint_2_0").add(V(0, 0.4, 2.2)), from: 21, to: 25 },
        { text: "Two 100 mm ties joined; tail cut flush", cls: "blue", at: () => m.at("zip_tie_0_under").add(V(0, -3.2, 0)), from: 27, to: 35 },
        { text: "Second Kevlar strap: right round the Pi and the plate", cls: "blue", at: () => m.at("pi_strap_second_lock").add(V(0, -3.2, 0)), from: 35.6, to: 39 },
        { text: "Measure first (pins 1 and 5): about 5 V", cls: "warn", at: () => m.at("pi_usb_power").add(V(1.3, -3.6, 0)), from: 41, to: 49 },
        { text: "PWR IN, not USB: read the print on the board", cls: "red", at: () => m.at("pi_usb_power").add(V(0, -3.2, 0)), from: 49.6, to: 53 },
        { text: "About 2 mm from the GPS board", cls: "blue", at: () => m.at("gps_pcb").add(V(0, 1.6, 0)), from: 55, to: 57.4 },
        { text: "Tips back only gently", cls: "good", at: () => m.at("cg_ball").add(V(0, 2.5, 0)), from: 57.6, to: 60 },
        { text: "25 mm back, 28 mm front", cls: "blue", at: () => m.at("leg_rear_0_foot").add(V(0, -3.4, 0)), from: 69, to: 72 },
        { text: "Legs, not the payload, touch down", cls: "good", at: () => m.at("leg_front_0_foot").add(V(0, -3.4, 0)), from: 72.2, to: 75 },
      ],
      update(t) {
        // pad and standoff tape, then the Pi on its standoffs
        show(/^pi_pad/, t >= 1.5);
        show(/^pi_standoff_tape/, t >= 5);
        show(/^pi_standoff_\d|^pi_pcb|^pi_header|^hat_/, t >= 6.5);
        show(/^thermal_/, t >= 10);
        show(/^gps_pcb|^gps_antenna|^gps_foam/, t >= 16);
        show(/^gps_cable/, t >= 21);
        show(/^zip_tie_0/, t >= 28); show(/^zip_tie_1/, t >= 31); show(/^zip_tie_join/, t >= 28);
        show(/^pi_strap_second_lock/, t >= 35.6);
        show(/^pigtail_5v/, t >= 40);
        m.glow("pigtail_5v", t > 41 && t < 49 ? 1 : 0);
        leadPivot.rotation.z = 0.3 * (1 - prog(t, 49.6, 50.6));   // free end 13 mm ahead of the socket until step 8 plugs it in
        show(/^pi_usb_power/, t >= 6.5);
        show(/^cone_thermal/, (t >= 10.5 && t < 15) || t >= 75);   // the lens's clear view straight down
        // once all four legs are on, the drone is set down on its feet (feet 5.3 cm below the bottom plate)
        m.scene.position.y = 9 - 3.55 * prog(t, 73.5, 75);
        // battery: from the NOW position (3 mm ahead) to the model's AFTER position (2.5 mm ahead), strap off then on
        const bk = prog(t, 54.5, 56.5);
        m.shift(/^battery_(pack|grip|band|balance|xt60|lead)/, V(0.0005 * (1 - bk), 0, 0));
        show(/^strap_/, t < 54 || t >= 57);
        show(/^cg_/, t >= 57 && t < 60);
        // legs: one at a time from 61 s
        ["leg_rear_0", "leg_rear_1", "leg_front_0", "leg_front_1"].forEach((l, i) => show(new RegExp("^" + l), t >= 61 + i * 3));
        st = { pad: t >= 1.5, thermal: t >= 10, gps: t >= 16, ties: t >= 31 ? 2 : t >= 28 ? 1 : 0, strap2: t >= 35.6,
               batteryAheadMm: Math.round((2.5 + 0.5 * (1 - bk)) * 10) / 10, legs: [0, 1, 2, 3].filter(i => t >= 61 + i * 3).length };
      },
      state() { return st; },
    };
  },
};
