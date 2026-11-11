// Step 1: lay out all the parts. Parts come from the guide's own step model (docs/models/step-01-parts.glb,
// real sizes, metres -> cm), which already places the five piles, the LiPo bag, the order list and the laptop.
// Words follow the guide's Step 1 (index.html, "Lay out all the parts"), including the buying-in-stages note.
export default {
  T: 54,
  steps: [
    { t0: 0,  text: "Clear a table. Have <b>small cups or bags for loose screws</b>, a pen and your laptop. You are buying in stages: <b>do this step again every time a stage arrives</b>, with only what came.", why: "Loose screws roll away, and laying parts out shows at once if anything is missing.", simple: "Clear table, cups for screws, a pen, your laptop. Repeat this every time a box of parts arrives." },
    { t0: 7,  text: "Pile 1, <b>airframe</b>: frame, motors, propellers (and the spare sets), battery straps, battery pad, foam tape, standoffs, screws, the leg parts, the LED strip if you bought it (not used in any step).", why: "These are the parts that make the drone's body.", simple: "Pile 1: everything that makes the drone's body." },
    { t0: 13, text: "Pile 2, <b>radio and power</b>: radio and its cells, receiver, flight stack, flight batteries, charger, extinguisher, smoke stopper, LiPo bag, USB-C data cable. <b>The flight batteries stay in the LiPo bag.</b>", why: "The bag slows a fire if a pack ever fails (it does not stop it).", simple: "Pile 2: radio, batteries and charging. The flight batteries live in the LiPo bag." },
    { t0: 21, text: "Pile 3, <b>video</b>: camera, video transmitter, its antenna, the monitor (and its memory card if you bought it).", why: "These make the live picture you fly by.", simple: "Pile 3: everything for the live picture." },
    { t0: 26, text: "Pile 4, <b>thermal payload</b>: Raspberry Pi kit, thermal camera, GPS board, Qwiic HAT and its cables, micro-USB cable.", why: "This is the heat-spotting part. The Pi and the thermal camera go under the bottom plate; the GPS goes on the top plate.", simple: "Pile 4: the Pi and the heat camera parts." },
    { t0: 31, text: "Pile 5, <b>tools and supplies</b>: tool kit, the iron's power adapter, safety glasses, wire stripper, practice board, wire, heat shrink, zip ties, threadlocker.", why: "Having every tool out stops you hunting mid-job.", simple: "Pile 5: tools and the small supplies." },
    { t0: 36, text: "<b>Tick each line on the Buy page.</b> \"2 x ... (4 per pack)\" means two packs of four: count the pieces. The Basic exam and the drone registration are not a pile: you do these online.", why: "Ticking shows what is really here, and counting catches a short pack now, not mid-build.", simple: "Tick every line on the Buy page. Count the pieces." },
    { t0: 43, text: "On your laptop, <b>download or bookmark the manuals</b>: frame drawings, stack sheet, receiver, video transmitter, sensors, charger, radio.", why: "You'll need them on the bench, and pages can disappear.", simple: "Save the manuals on your laptop." },
    { t0: 48, text: "<b>Propellers stay in their packet</b> until the very end. If a part for the step you want to build is missing, <b>stop</b>: write it down and check the Buy page.", why: "Props on a powered drone can cut you; a missing part means that step waits.", simple: "Props stay in the packet. Missing part? Stop and write it down." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-01-parts.glb", { at: V(0, 0, 0), hide: /^cone_/ });   // the see-through "what the camera sees" cone is not part of this step (picture fix, 11 Nov 2026)
    // the guide: "The flight batteries stay in the LiPo bag" and the flight stack is in pile 2 (radio and power).
    // The model has the packs behind the bag and the stack beside the airframe, so both are moved (audit 8 Nov).
    m.shift(/^battery_/, V(0, 0, 0.11));
    m.shift(/^stack_/, V(0.16, 0, -0.01));
    const L = n => m.at(n);
    const piles = ["LBL_airframe", "LBL_radio-power", "LBL_video", "LBL_thermal-payload", "LBL_tools"];
    const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => "order_list_tick_" + i);
    // close-up: look down at the pile from above and in front (target on the table, not at the hidden label's height)
    const near = (n, up = 48, back = 40) => { const p = L(n).setY(1); return [p.clone().add(V(0, up, back)), p.clone()]; };
    // the model ships 4 boxes ticked (green) and 5 not (grey); start all grey and tick them one by one
    const GREEN = 0x1b5e4f, GREY = 0x4d4f54;
    const paint = (n, hex) => m.n(n).traverse(o => { if (o.isMesh) o.material.color.setHex(hex); });
    const all = [V(0, 92, 78), V(-3, 0, -6)];
    let st = {};
    // pile 2's view is aimed between the pile and the LiPo bag, so the packs inside the bag and their label are in the picture
    const powAt = (() => { const p = L("LBL_radio-power").lerp(L("bag_floor"), 0.5).setY(1); return [p.clone().add(V(0, 52, 44)), p]; })();
    const at = { air: near("LBL_airframe"), pow: powAt, vid: near("LBL_video"), pay: near("LBL_thermal-payload"),
                 tool: near("LBL_tools"), list: near("LBL_order-list-tick-every-pile", 42, 34), lap: near("LBL_your-laptop-not-in-the-box-download-the-manuals", 40, 34),
                 props: near("LBL_props-stay-in-the-bag", 40, 34) };
    return {
      cams: [[0, ...all], [6.4, ...all], [7.4, ...at.air], [12.4, ...at.air], [13.4, ...at.pow], [20.4, ...at.pow], [21.4, ...at.vid], [25.4, ...at.vid],
             [26.4, ...at.pay], [30.4, ...at.pay], [31.4, ...at.tool], [35.4, ...at.tool], [36.4, ...at.list], [42.4, ...at.list],
             [43.4, ...at.lap], [47.4, ...at.lap], [48.4, ...at.props], [51, ...at.props], [52.5, ...all], [54, ...all]],
      tags: [
        { text: "Repeat when each stage arrives", cls: "blue", at: () => V(-3, 14, -6), from: 1, to: 7 },
        { text: "1 Airframe", cls: "blue", at: () => L("LBL_airframe").setY(4), from: 7.6, to: 13 },
        { text: "2 Radio and power", cls: "blue", at: () => L("LBL_radio-power").setY(4), from: 13.6, to: 21 },
        { text: "Batteries stay in the LiPo bag", cls: "warn", at: () => L("bag_floor").add(V(0, 7, 0)), from: 16, to: 21 },
        { text: "3 Video", cls: "blue", at: () => L("LBL_video").setY(4), from: 21.6, to: 26 },
        { text: "4 Thermal payload", cls: "blue", at: () => L("LBL_thermal-payload").setY(1.5), from: 26.6, to: 31 },
        { text: "5 Tools and supplies", cls: "blue", at: () => L("LBL_tools").setY(1.5), from: 31.6, to: 36 },
        { text: "Tick every line, count the pieces", cls: "blue", at: () => L("LBL_order-list-tick-every-pile").setY(4), from: 36.6, to: 43 },
        { text: "Download the manuals", cls: "blue", at: () => L("LBL_your-laptop-not-in-the-box-download-the-manuals").setY(4), from: 43.6, to: 48 },
        { text: "Props stay in the packet", cls: "red", at: () => L("LBL_props-stay-in-the-bag").setY(4), from: 48.6, to: 54 },
      ],
      update(t) {
        // the ticks appear one by one on the order list
        const ticked = ticks.map((n, i) => t >= 37 + i * 0.6);
        ticks.forEach((n, i) => paint(n, ticked[i] ? GREEN : GREY));
        // which pile the camera is on (0-4), for the checker
        const now = t >= 7 && t < 36 ? Math.min(4, [7, 13, 21, 26, 31].filter(x => t >= x).length - 1) : -1;
        const bf = new THREE.Box3().setFromObject(m.n("bag_floor")), bp = m.at("battery_pack");
        st = { packsInBag: bp.x > bf.min.x && bp.x < bf.max.x && bp.z > bf.min.z && bp.z < bf.max.z, stackNearPower: m.at("stack_esc").distanceTo(m.at("smokestopper_body")) < m.at("stack_esc").distanceTo(m.at("loose_bottom_plate")), pile: now, pileLabel: now >= 0 ? piles[now] : "", ticks: ticked.filter(Boolean).length };
      },
      state() { return st; },
    };
  },
};
