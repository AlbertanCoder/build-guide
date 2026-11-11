// Stage 3 (part 4b): link each stick and switch to its row in FPV SkyDive's Controls page.
// The game's page, as in Shad's photos (7 Nov): tabs GENERAL DRONE AUDIO GRAPHICS CONTROLS RATES; "Choose Input"
// = "Radiomaster Pocket Joystick"; "Input Calibration" = "Configure"; rows Throttle, Yaw, Pitch, Roll, Arm,
// Flight Mode, Pause, Restart, each with a moving bar ("Channel Map"), an Invert button and "Assigned Axis"
// ("Press to assign" or "Axis N"); a PREVIEW button. His screen showed Throttle Axis 2, Yaw Axis 3, Roll Axis 0,
// Flight Mode Axis 4, Restart Axis 1, Pitch and Arm empty.
// Which axis is which: EdgeTX's USB joystick sends channel 1 as the X axis, 2 as Y, 3 as Z, 4 as X rotation,
// 5 as Y rotation (manual.edgetx.org, radio setup, "USB Joystick"). With his channel order (roll, pitch, throttle,
// yaw; it matches the three rows the game already found) and SA on channel 5, the game counts from 0:
// Axis 0 = roll, Axis 1 = pitch, Axis 2 = throttle, Axis 3 = yaw, Axis 4 = SA. A forum user also reports SkyDive
// asking for the arm switch as "AXIS 4" (intofpv.com thread 23284). How the game empties a row is NOT documented.
import { makePocket } from "./s3r-radio.js";
export default {
  T: 64,
  steps: [
    { t0: 0, text: "The game's <b>Controls</b> page has <b>one row per job</b>. You link each row to one stick or switch: click the box on the <b>right</b> of the row, then move that stick <b>all the way, both ways</b>. The game hears which part moved and writes its axis number.",
      why: "The game doesn't know your radio. You show it, one job at a time.",
      simple: "Click the right-hand box of a row, then wiggle the matching stick.",
      more: "An 'axis' is just the game's name for one stick direction or one switch. You use five of them here: Axis 0 to Axis 4. Each one must do only one job." },
    { t0: 8, text: "<b>Throttle</b> row: click its right-hand box, then move the <b>left stick up and down</b>, all the way. It should say <b>Axis 2</b>.",
      why: "Throttle is power: up = climb, down = sink.",
      simple: "Throttle = left stick up and down = Axis 2." },
    { t0: 15, text: "<b>Yaw</b> row: click its right-hand box, then move the <b>left stick left and right</b>, all the way. It should say <b>Axis 3</b>.",
      why: "Yaw turns the nose left or right, like turning your head.",
      simple: "Yaw = left stick left and right = Axis 3." },
    { t0: 22, text: "<b>Pitch</b> row: click its right-hand box, then move the <b>right stick up and down</b>, all the way. It should say <b>Axis 1</b>.",
      why: "Pitch tips the drone forward or back.",
      simple: "Pitch = right stick up and down = Axis 1." },
    { t0: 29, text: "<b>Roll</b> row: click its right-hand box, then move the <b>right stick left and right</b>, all the way. It should say <b>Axis 0</b>.",
      why: "Roll tilts the drone sideways.",
      simple: "Roll = right stick left and right = Axis 0." },
    { t0: 36, text: "<b>Arm</b> row: left stick <b>all the way down</b> first. Click Arm's right-hand box, then flick <b>SA</b> (top left switch) <b>up, then back down</b>. It should say <b>Axis 4</b>. If nothing happens, SA may have no channel yet: do the lesson <b>Arm switch SA (CH5)</b>, then come back.",
      why: "Arm turns the motors on and off. Same switch as your real drone, so your hand learns it now.",
      simple: "Arm = switch SA = Axis 4.",
      more: "Throttle down first, because the game (and a real drone) won't arm with the throttle up." },
    { t0: 43, text: "<b>Flight Mode, Pause, Restart</b>: these must <b>not</b> show Axis 0, 1, 2, 3 or 4. If <b>Restart says Axis 1</b>, pushing pitch would restart the game. Click that box and try <b>Backspace</b>, then <b>Delete</b>. If it won't empty, stop and ask in the chat.",
      why: "Each axis can do only one job. Two jobs on one stick = the game does both at once.",
      simple: "Bottom three rows: no Axis 0-4 on them.",
      more: "The game's makers don't say how to empty a row, so Backspace and Delete are guesses to try. Your radio has no spare channel set up for these three yet; the keyboard can do Pause and Restart." },
    { t0: 50, text: "At the top, <b>Input Calibration</b>: click <b>Configure</b> and follow its steps. Move sticks in <b>straight lines</b>, all the way. <b>Rest a finger on SA</b> before the switch step: it goes fast.",
      why: "Calibrating teaches the game where each stick's ends and middle are.",
      simple: "Configure, do what it says, finger ready on SA." },
    { t0: 57, text: "Click <b>PREVIEW</b> and move each stick. The <b>matching bar</b> must move, the right way. If one moves backwards, click the <b>⇄ (Invert)</b> button on that row.",
      why: "This is the test: each thumb move shows up on the right row before you fly.",
      simple: "Wiggle each stick, watch its bar. Backwards? Click ⇄." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const p = makePocket(E, root, V(-11, 6.2, 5));
    p.group.rotation.y = 0.4;
    p.group.updateMatrixWorld(true);
    // laptop: base, keys, lid with the drawn Controls page (a drawing of his screen, not a picture of the game)
    const lap = new THREE.Group(); lap.position.set(9, 0, -5); lap.rotation.y = -0.22; root.add(lap);
    const base = E.mesh(new THREE.BoxGeometry(36, 1.6, 24), E.mat(0x24272c, { roughness: 0.5 }), lap); base.position.y = 0.8;
    const keys = E.mesh(new THREE.BoxGeometry(31, 0.1, 10), E.mat(0x15171a), lap); keys.position.set(0, 1.65, -2.5);
    const lid = new THREE.Group(); lid.position.set(0, 1.6, -12); lid.rotation.x = -0.12; lap.add(lid);
    const shell = E.mesh(new THREE.BoxGeometry(36, 23, 0.8), E.mat(0x24272c, { roughness: 0.5 }), lid); shell.position.y = 11.5;
    const scr = E.canvasTex(1000, 620, () => {});
    const disp = E.mesh(new THREE.PlaneGeometry(34, 21.08), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }), lid);
    disp.position.set(0, 11.7, 0.42); disp.castShadow = false;
    const portAt = lap.localToWorld(V(-18.2, 0.9, -4));
    const cord = E.liveTube(root, 0x111111, 0.22);

    const ROWS = ["Throttle", "Yaw", "Pitch", "Roll", "Arm", "Flight Mode", "Pause", "Restart"];
    const rowY = i => 196 + i * 50;
    let drawn = "";
    function page(assign, vals, hi, focus) {
      const key = JSON.stringify([assign, vals.map(v => Math.round(v * 20)), hi, focus]); if (key === drawn) return; drawn = key;
      const c = scr.canvas.getContext("2d");
      c.fillStyle = "#26282d"; c.fillRect(0, 0, 1000, 620);
      c.textBaseline = "middle"; c.font = "bold 24px Arial";
      ["GENERAL", "DRONE", "AUDIO", "GRAPHICS", "CONTROLS", "RATES"].forEach((t, i) => {
        c.fillStyle = t === "CONTROLS" ? "#ffffff" : "#b9bec6"; c.fillText(t, 20 + i * 160, 30);
        if (t === "CONTROLS") { c.fillRect(20 + i * 160, 50, 150, 4); }
      });
      const box = (y, label, val, lit) => {
        c.fillStyle = "#c9ccd1"; c.fillRect(20, y, 960, 44); c.fillStyle = "#2a2d33"; c.font = "bold 24px Arial"; c.fillText(label, 36, y + 22);
        c.fillStyle = lit ? "#1d7cff" : "#6d7178"; c.fillRect(470, y + 5, 500, 34); c.fillStyle = "#fff"; c.textAlign = "center"; c.fillText(val, 720, y + 22); c.textAlign = "left";
      };
      box(70, "Choose Input", "Radiomaster Pocket Joystick", false);
      box(120, "Input Calibration", "Configure", focus === "configure");
      c.fillStyle = "#e8eaee"; c.font = "bold 20px Arial";
      c.fillText("Action", 40, 178); c.fillText("Channel Map", 340, 178); c.fillText("Invert", 708, 178); c.fillText("Assigned Axis", 820, 178);
      ROWS.forEach((r, i) => {
        const y = rowY(i), on = i === hi;
        c.fillStyle = on ? "#ffffff" : "#c9ccd1"; c.fillRect(20, y, 960, 44);
        c.fillStyle = "#2a2d33"; c.font = "bold 22px Arial"; c.fillText(r, 36, y + 22);
        c.fillStyle = "#6d7178"; c.fillRect(200, y + 8, 480, 28);
        const f = Math.max(0, Math.min(1, (vals[i] + 1) / 2));
        c.fillStyle = "#f2f3f5"; c.fillRect(214, y + 15, 452 * f, 14); c.fillStyle = "#9da1a8"; c.fillRect(214 + 452 * f, y + 15, 452 * (1 - f), 14);   // 11 Nov (pictures, row 20): the moving bar is 14 high (it was 6: about 2 dots in the wide view, too thin to see move)
        c.fillStyle = "#6d7178"; c.fillRect(696, y + 8, 64, 28); c.fillStyle = "#fff"; c.font = "bold 22px Arial"; c.fillText("⇄", 716, y + 22);
        const a = assign[r];
        c.fillStyle = on ? "#1d7cff" : (a ? "#5a5e66" : "#8d9198"); c.fillRect(772, y + 5, 196, 34);
        c.fillStyle = "#fff"; c.textAlign = "center"; c.font = "bold 21px Arial"; c.fillText(a || "Press to assign", 870, y + 22); c.textAlign = "left";
      });
      c.fillStyle = focus === "preview" ? "#1d7cff" : "#8d9198"; c.fillRect(30, 590, 160, 26); c.fillStyle = "#fff"; c.font = "bold 18px Arial"; c.fillText("PREVIEW", 70, 603);
      c.fillStyle = "#b9bec6"; c.font = "16px Arial"; c.fillText("(a drawing of your Controls page)", 600, 603);
      scr.tex.needsUpdate = true;
    }

    let st = {};
    const both = [V(-1, 24, 36), V(1, 9, -3)];
    // 11 Nov (pictures, row 37): a little further back, so the whole page is in the picture (a phone cut the first letter off every
    // row name, a desktop cut the top line)
    const screenCam = [lap.localToWorld(V(0, 13.6, 17.5)), lap.localToWorld(V(0, 13.2, -13))];
    const radioCam = [p.at("screen").add(V(3, 6, 14)), p.at("screen").add(V(0, 0.5, 0))];
    const saCam = [p.at("SA").add(V(-4, 7, 12)), p.at("SA")];
    return {
      // 11 Nov (pictures, row 20): the page close-up is held until step 1 ends; each stick label now also says the axis the row should
      // show (in the wide view the page's own letters are too small to read), and sits above the stick's ring, not on the stick
      cams: [[0, ...screenCam], [7.4, ...screenCam], [8.4, ...both], [35.4, ...both], [36.4, ...saCam], [42.2, ...saCam], [43.2, ...screenCam], [56.4, ...screenCam], [57.4, ...both], [64, ...both]],
      tags: [
        { text: "One row per job", cls: "blue", at: () => lap.localToWorld(V(-2, 14, -11.5)), from: 1, to: 8 },   // over the grey bars, not over the row names
        { text: "Click here, then move the stick", cls: "good", at: () => lap.localToWorld(V(11, 16, -11.5)), from: 2.5, to: 8 },
        { text: "THROTTLE: left stick up/down = Axis 2", cls: "good", at: () => p.world(-4.7, 3.9), from: 8.5, to: 15 },
        { text: "YAW: left stick left/right = Axis 3", cls: "good", at: () => p.world(-4.7, 3.9), from: 15.5, to: 22 },
        { text: "PITCH: right stick up/down = Axis 1", cls: "good", at: () => p.world(4.7, 3.9), from: 22.5, to: 29 },
        { text: "ROLL: right stick left/right = Axis 0", cls: "good", at: () => p.world(4.7, 3.9), from: 29.5, to: 36 },
        { text: "ARM: switch SA, up then down = Axis 4", cls: "warn", at: () => p.at("SA"), from: 36.8, to: 43 },
        { text: "No Axis 0-4 down here", cls: "warn", at: () => lap.localToWorld(V(8, 5.5, -11.5)), from: 44, to: 50 },
        { text: "Configure = calibrate", cls: "good", at: () => lap.localToWorld(V(4, 19.5, -11.5)), from: 51, to: 57 },
        { text: "PREVIEW: each bar follows its stick", cls: "good", at: () => lap.localToWorld(V(-12, 2.8, -11.5)), from: 58, to: 64 },
      ],
      update(t) {
        // the radio is plugged into the laptop the whole time (top port), showing its main screen
        p.cord("top", 1); p.home("POCKET");   // still POCKET here (FIREWATCH is named in the next lesson)
        const a = p.at("usbTop").add(V(0, 1.6, 0)), b = portAt.clone();
        cord([a, a.clone().add(V(0, 5, -2)), b.clone().add(V(-6, 3, 0)), b]);
        const wig = (t0, t1) => t > t0 && t < t1 ? Math.sin((t - t0) / (t1 - t0) * Math.PI * 4) : 0;
        const pv = t > 58 && t < 63.5;   // preview: every stick moves in turn
        const thr = (t > 9.5 && t < 13.5) ? wig(9.5, 13.5) : pv ? wig(58, 59.4) : -1;
        const yaw = wig(16.5, 20.5) || (pv ? wig(59.4, 60.8) : 0);
        const pit = wig(23.5, 27.5) || (pv ? wig(60.8, 62.2) : 0);
        const rol = wig(30.5, 34.5) || (pv ? wig(62.2, 63.5) : 0);
        const saUp = (t > 38.5 && t < 40.5) || (t > 53 && t < 54.2);
        p.throttle(thr); p.yawL(yaw); p.stickR(rol, pit); p.flick("SA", saUp ? 1 : -1);
        // what the game shows: his screen at the start, fixed one row at a time
        const as = { Throttle: "Axis 2", Yaw: "Axis 3", Pitch: "", Roll: "Axis 0", Arm: "", "Flight Mode": "Axis 4", Pause: "", Restart: "Axis 1" };
        if (t > 25) as.Pitch = "Axis 1";
        if (t > 39) as.Arm = "Axis 4";
        if (t > 46) { as.Restart = ""; as["Flight Mode"] = ""; }
        const hi = t < 8 ? -1 : t < 15 ? 0 : t < 22 ? 1 : t < 29 ? 2 : t < 36 ? 3 : t < 43 ? 4 : t < 50 ? 7 : -1;
        const vals = [thr, yaw, pit, rol, saUp ? 1 : -1, 0, 0, 0];
        page(as, vals, hi, t >= 50 && t < 57 ? "configure" : t >= 57 ? "preview" : "");
        const used = Object.values(as).filter(Boolean);
        st = { assign: as, row: hi >= 0 ? ROWS[hi] : "", unique: new Set(used).size === used.length, saUp, thr };
      },
      state() { return st; },
    };
  },
};
