// Step 4 (part 3): set up Betaflight (S4.6) and the VTX power note (S4.7). Words follow the guide's S4.6 and S4.7
// (index.html:3137-3138, after the 10 Nov audit). Parts: docs/models/step-04-receiver-fpv.glb (its small laptop and
// USB cable), the Pocket from s3r-radio.js. Laptop screens are DRAWINGS with only the guide's words; real screens differ.
// The arm switch: Stage 3's lesson (s3r-switches) puts ARM on SA (CH5) and ANGLE on SD (CH6).
// The pack switch: the page only says "a 3-position switch that is not your ARM or ANGLE switch". The lesson flicks SB
// and calls it an example. Source that SB is 3-position: ~/bench-clips/radio-facts/POCKET-FACTS.md:33-34,
// "| SB | Top edge, left, inside SA | 3-position | "SB-Position" [RM-QS] PDF p3; ... "type": "3POS" [ETX-SRC] pocket.json |"
// (and the same for SC); [RM-QS] = RadioMaster Pocket quick-start PDF, [ETX-SRC] = EdgeTX source, pocket.json.
// Which way up reads near 1000 is not stated anywhere: the page has you read it in the Receiver tab and tape it.
import { makePocket } from "./s3r-radio.js";
const CLI = ["set vbat_warning_cell_voltage = 330", "set vbat_min_cell_voltage = 280", "rateprofile 1", "set throttle_limit_type = SCALE",
  "set throttle_limit_percent = 65", "rateprofile 2", "set throttle_limit_type = SCALE", "set throttle_limit_percent = 65", "rateprofile 0",
  "set throttle_limit_type = OFF", "set throttle_limit_percent = 100", "adjrange 0 0 2 900 2100 12 2 0 0", "save"];
export default {
  T: 76,
  steps: [
    { t0: 0,  text: "Set up Betaflight with the flight controller on <b>USB only: no battery, no propellers</b>. Press <b>Save</b> on each tab before you leave it.",
      why: "A tab you leave without saving loses its changes.",
      simple: "USB only. Save on every tab." },
    { t0: 5,  text: "<b>Setup</b> tab: check the board says <b>GEPRCF405</b>. <b>Calibrate Accelerometer</b> with the frame <b>level</b>.",
      why: "The accelerometer learns what level looks like; the drone uses it to level itself.",
      simple: "Board name GEPRCF405. Frame flat, then Calibrate Accelerometer." },
    { t0: 11, text: "<b>Configuration</b> tab: ESC protocol <b>DShot</b> (as the ESC manual names).",
      why: "The flight controller and the ESC must speak the same language.",
      simple: "Configuration: DShot." },
    { t0: 15, text: "<b>Receiver</b> tab: Serial (via UART), CRSF. <b>Move the sticks</b> and check the bars move.",
      why: "Moving bars prove the radio's sticks reach the flight controller.",
      simple: "Move the sticks: the bars must move." },
    { t0: 21, text: "<b>Modes</b> tab: <b>Add Range</b> for <b>ARM</b> on the switch you choose (SA, if you followed Stage 3). Flick it: the marker moves into the ARM range.",
      why: "Arming is what lets the motors spin, so it lives on its own switch.",
      simple: "Modes: ARM on your arm switch. Flick it: the marker moves into the range." },
    { t0: 28, text: "<b>Failsafe</b> tab: <b>Stage 2 = Drop</b>, so the motors stop if the radio link is lost.",
      why: "If the link is lost, a drone that keeps flying is the danger.",
      simple: "Failsafe: Drop." },
    { t0: 33, text: "<b>Power & Battery</b> tab: maximum cell voltage <b>4.40 V</b>.",
      why: "The GNB is LiHV and charges to 4.35 V per cell. At 4.35, Betaflight would count a full pack as 5 cells.",
      simple: "Max cell voltage 4.40." },
    { t0: 39, text: "Open the <b>CLI</b> tab once, <b>paste these lines</b> (on the screen and in the guide) and press <b>Enter</b>. They give <b>one low-battery warning at 3.3 V per cell</b> for both packs, and a <b>65 % throttle limit</b> in rate profiles 2 and 3, for the Li-ion pack only.",
      why: "On a full punch this drone draws more than the Li-ion pack's recommended 30 to 50 A; at 65 % it stays near 41 A (the game's flight model, an ESTIMATE). The CLI counts rate profiles from 0, so rate profile 2 is <code>rateprofile 1</code>.",
      simple: "CLI tab: paste the lines from the guide, press Enter.",
      more: "On the GNB, the radio's 3-minute timer is your main land-now signal." },
    { t0: 49, text: "The <b>pack switch</b>, so you never type a profile in the field. On the radio, put a <b>3-position switch that is not your ARM or ANGLE switch</b> on <b>channel 7</b> (EdgeTX: Model, Mixes, add a mix on CH7 with that switch as its source). Here: <b>SB</b>, as an example.",
      why: "Channel 7 is AUX 3 in Betaflight, and the adjrange line makes AUX 3 choose the rate profile.",
      simple: "A 3-position switch on channel 7: it picks the pack." },
    { t0: 57, text: "Check it on the bench, USB only: in the <b>Receiver</b> tab, flick the switch; <b>AUX 3</b> sits near <b>1000, 1500 and 2000</b>. Near 1000 is rate profile 1 (<b>GNB</b>, no limit); near 1500 and 2000 are rate profiles 2 and 3 (<b>Li-ion</b>, 65 % limit). Put a strip of <b>tape</b> by the switch: near 1000 = GNB, the other two = Li-ion.",
      why: "Reading it on the screen is the only way to know which way is GNB on your radio.",
      simple: "Flick it, read AUX 3, tape the GNB position." },
    { t0: 66, text: "The <b>VTX comes locked to 25 mW</b>, its lowest power. Running it at any power needs the <b>ISED Amateur Radio Operator Certificate (Basic)</b>: see Fly safely. Check it the first time the VTX gets power, the bench power test in <b>Step 8</b> (item 2), antenna on: its light flashes three groups (channel, band, power); the last group, <b>3 red then 1 blue</b>, = 25 mW. It does not power from USB.",
      why: "Higher powers also need a long button press. To change channel or power from Betaflight later, set UART1 to SmartAudio in the Ports tab.",
      simple: "VTX stays at 25 mW. You check its lights in Step 8." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    // the model's solder dots on the flight controller's TOP face are hidden: the pads are on the face that points down (picture fix, 11 Nov 2026)
    const m = await E.loadStepModel(root, "step-04-receiver-fpv.glb", { at: V(0, 0.5, 0), hide: /^(monitor_|cone_pilot|campose_pilot|finder_|frame_top_plate)|^(vtx|finder)_wire_.*_solder_b$/ });
    const face = m.n("laptop_tag_screen_face");
    const lt = E.canvasTex(1060, 620, () => {});
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.106, 0.062), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false }));
    disp.position.z = 0.0006; face.add(disp);
    const p = makePocket(E, root, V(-19, 6.2, -24));
    p.group.rotation.y = 0.45;
    p.group.updateMatrixWorld(true);

    let drawn = "";
    function screen(kind, a = 0, b = 0) {
      const key = kind + "|" + Math.round(a * 20) + "|" + Math.round(b * 20); if (key === drawn) return; drawn = key;
      const c = lt.canvas.getContext("2d"), W = 1060, H = 620;
      c.fillStyle = "#1b2430"; c.fillRect(0, 0, W, H);
      const title = s => { c.fillStyle = "#e9f1ff"; c.font = "bold 52px Arial"; c.fillText(s, 40, 80); };
      const row = (label, value, y, on) => {
        c.font = "40px Arial"; c.fillStyle = "#c9d6e6"; c.fillText(label, 40, y);
        if (value) { c.fillStyle = on ? "#1d7cff" : "#2c3846"; c.fillRect(500, y - 40, 510, 56); c.fillStyle = "#fff"; c.fillText(value, 520, y); }
      };
      const save = (y, lit) => { c.fillStyle = lit ? "#2fb36a" : "#2c3846"; c.fillRect(40, y - 44, 220, 60); c.fillStyle = "#fff"; c.font = "bold 40px Arial"; c.fillText("Save", 100, y); };
      // Picture fix, 11 Nov 2026: the bar, Modes and AUX 3 screens are only seen from far (radio and laptop together),
      // so their letters are drawn much bigger than on the close-up screens.
      const bar = (label, v, y) => {   // v = 1000..2000
        c.font = "56px Arial"; c.fillStyle = "#c9d6e6"; c.fillText(label, 40, y);
        c.fillStyle = "#2c3846"; c.fillRect(300, y - 46, 500, 54); c.fillStyle = "#e3a21a"; c.fillRect(300, y - 46, 500 * (v - 1000) / 1000, 54);
        c.fillStyle = "#fff"; c.fillText(String(Math.round(v)), 830, y);
      };
      const note = () => { c.font = "28px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: real screens may differ)", 40, H - 26); };
      if (kind === "start") { title("Betaflight Configurator"); row("USB only", "no battery, no props", 220, true); note(); }
      else if (kind === "setup") { title("Setup"); row("Board", "GEPRCF405", 200, true); row("Frame level", a > 0.5 ? "Calibrated" : "Calibrate Accelerometer", 300, a > 0.5); note(); }
      else if (kind === "config") { title("Configuration"); row("ESC protocol", a > 0.4 ? "DShot" : "...", 200, a > 0.4); save(330, a > 0.8); note(); }
      else if (kind === "rx") { title("Receiver"); const s = v => 1500 + 500 * v;
        bar("Roll", s(Math.sin(a * 9) * 0.6 * b), 190); bar("Pitch", s(Math.cos(a * 7) * 0.5 * b), 290); bar("Yaw", s(Math.sin(a * 5) * 0.5 * b), 390); bar("Throttle", 1000 + 400 * b * (1 + Math.sin(a * 6)) / 2, 490);
        note(); }
      else if (kind === "aux3") { title("Receiver"); bar("AUX 3", a, 230);
        c.font = "56px Arial"; c.fillStyle = "#e9f1ff"; c.fillText(a < 1250 ? "near 1000: rate profile 1, GNB" : "near " + (a < 1750 ? "1500" : "2000") + ": Li-ion, 65 % limit", 40, 370); note(); }
      else if (kind === "modes") { title("Modes"); c.font = "64px Arial"; c.fillStyle = "#c9d6e6"; c.fillText("ARM", 40, 215);
        c.fillStyle = "#2c3846"; c.fillRect(240, 165, 720, 56); c.fillStyle = "#2fb36a"; c.fillRect(240 + 720 * 0.6, 165, 720 * 0.4, 56);   // the ARM range, top of the switch's travel
        c.fillStyle = "#ffd23f"; c.fillRect(240 + 720 * (0.1 + 0.8 * a) - 7, 153, 14, 80);
        c.fillStyle = "#fff"; c.font = "56px Arial"; c.fillText(a > 0.5 ? "in the ARM range" : "Add Range: ARM", 240, 320); save(430, true); note(); }
      else if (kind === "failsafe") { title("Failsafe"); row("Stage 2", a > 0.4 ? "Drop" : "...", 200, a > 0.4); save(330, a > 0.8); note(); }
      else if (kind === "power") { title("Power & Battery"); row("Max cell voltage", a > 0.4 ? "4.40 V" : "...", 200, a > 0.4); save(330, a > 0.8); note(); }
      else if (kind === "cli") { title("CLI"); c.font = "24px monospace"; c.fillStyle = "#cfe8cf";
        const n = Math.round(a * CLI.length); CLI.slice(0, n).forEach((l, i) => c.fillText(l, 40 + (i < 7 ? 0 : 545), 140 + (i % 7) * 52));
        note(); }
      else if (kind === "vtx") { title("VTX (video transmitter)"); row("Power", "25 mW (locked)", 200, true); row("Check", "Step 8, battery, antenna on", 290, false); note(); }
      lt.tex.needsUpdate = true;
    }

    const lapScr = m.at("laptop_tag_screen_face");
    const wide = [V(-8, 30, 26), V(-6, 3, -16)];
    const lap = [lapScr.clone().add(V(0, 3.5, 15)), lapScr.clone().add(V(0, 0.4, 0))];
    const both = [V(-11.5, 16, 7), V(-11.5, 6, -29)];   // a little further back and to the left, so the arm switch (SA) is in the picture on a phone too (picture fix, 11 Nov 2026)
    const radio = [p.at("screen").add(V(3, 5, 12)), p.at("screen").add(V(0, 1.2, 0))];
    const level = [V(10, 6, 22), V(0, 2, 0)];
    const vtx = [V(-18, 12, 11), V(-6, 3, 0)];
    const tagAt = () => lapScr.clone().add(V(0, 3.2, 0));
    let st = {};
    return {
      cams: [[0, ...wide], [4.4, ...wide], [5.4, ...lap], [7.4, ...lap], [8, ...level], [10.4, ...level], [11.4, ...lap], [14.4, ...lap], [15.4, ...both], [19, ...both], [20, ...lap], [20.4, ...lap], [21.4, ...both], [25.4, ...both], [26.4, ...lap], [48.4, ...lap],
        // Picture fix, 11 Nov 2026: steps 4, 5 and 10 show radio and laptop together, then end close on the laptop,
        // so the frame the player stops on shows the screen big enough to read
        [49.4, ...radio], [56.4, ...radio], [57.4, ...both], [63.8, ...both], [64.8, ...lap], [65.4, ...lap], [66.4, ...vtx], [76, ...vtx]],
      tags: [
        { text: "USB only: no battery, no props", cls: "red", at: () => m.at("usb_cable").add(V(0, 2, 0)), from: 0.8, to: 5 },
        { text: "GEPRCF405", cls: "blue", at: tagAt, from: 5.6, to: 8 },
        { text: "Frame level", cls: "warn", at: () => V(0, 3.4, 0), from: 8.2, to: 11 },   // on the drone (it used to hang in front of the radio)
        { text: "DShot", cls: "blue", at: tagAt, from: 11.6, to: 15 },
        { text: "Sticks move the bars", cls: "good", at: () => p.at("stickR").add(V(0, 1.5, 0)), from: 16, to: 20.2 },
        { text: "Sticks move the bars", cls: "good", at: tagAt, from: 20.4, to: 21 },
        { text: "Arm switch (SA)", cls: "blue", at: () => p.at("SA"), from: 22, to: 26.4 },
        { text: "Marker in the ARM range", cls: "good", at: tagAt, from: 26.8, to: 28 },
        { text: "Stage 2 = Drop", cls: "blue", at: tagAt, from: 28.6, to: 33 },
        { text: "4.40 V (LiHV)", cls: "blue", at: tagAt, from: 33.6, to: 39 },
        { text: "Paste the lines from the guide page, then Enter", cls: "blue", at: tagAt, from: 39.6, to: 49 },
        { text: "For example SB: 3 positions", cls: "warn", at: () => p.at("SB"), from: 50, to: 57 },
        { text: "AUX 3: tape the GNB position", cls: "good", at: () => p.at("SB"), from: 58, to: 64.6 },
        { text: "Near 1000 = GNB: tape that switch position", cls: "good", at: tagAt, from: 65, to: 66 },
        { text: "Locked to 25 mW; lights checked in Step 8", cls: "warn", at: () => m.at("LBL_unify-pro-hv-vtx"), from: 66.6, to: 76 },
        { text: "Not on USB power", cls: "red", at: () => m.at("vtx_board").add(V(0, -3.6, 0)), from: 69, to: 76 },   // lower, clear of the other label
      ],
      update(t) {
        // radio: sticks in the Receiver tab, SA for ARM, SB for the pack switch
        const sticks = t > 16 && t < 21 ? prog(t, 16, 17) : 0;
        p.throttle(sticks ? -1 + 0.8 * (1 + Math.sin(t * 6)) / 2 : -1);
        p.stickR(sticks ? 0.6 * Math.sin(t * 9) : 0, sticks ? 0.5 * Math.cos(t * 7) : 0);
        p.yawL(sticks ? 0.5 * Math.sin(t * 5) : 0);
        const arm = t > 24 && t < 28;   // stays armed to the end of the step, so the frame the player stops on shows the marker in the ARM range
        p.flick("SA", arm ? 1 : -1);
        const sbPos = t < 58.5 ? -1 : t < 61 ? 0 : t < 63.5 ? 1 : -1;   // example only: which end reads 1000 is checked on screen
        p.flick("SB", sbPos);
        if (t < 16 || t >= 21) p.home("FIREWATCH");
        // laptop
        if (t < 5) screen("start");
        else if (t < 11) screen("setup", prog(t, 8.5, 10));
        else if (t < 15) screen("config", prog(t, 12, 14));
        else if (t < 21) screen("rx", t, sticks);
        else if (t < 28) screen("modes", arm ? 1 : 0);
        else if (t < 33) screen("failsafe", prog(t, 29, 32));
        else if (t < 39) screen("power", prog(t, 34.5, 38));
        else if (t < 49) screen("cli", prog(t, 40, 46));
        else if (t < 57) screen("start");
        else if (t < 66) screen("aux3", sbPos < 0 ? 1000 : sbPos === 0 ? 1500 : 2000);
        else screen("vtx");
        st = { laptop: drawn.split("|")[0], armed: arm, sb: sbPos, aux3: sbPos < 0 ? 1000 : sbPos === 0 ? 1500 : 2000, cliLines: t >= 46 ? CLI.length : Math.round(prog(t, 40, 46) * CLI.length) };
      },
      state() { return st; },
    };
  },
};
