// Step 4 (part 2): connect the receiver to Betaflight and to the radio (S4.5). Words follow the guide's S4.5
// (index.html, after the 10 Nov audit). Parts: docs/models/step-04-receiver-fpv.glb (its small laptop and USB cable),
// the Pocket from s3r-radio.js. The laptop and radio screens are DRAWINGS: they show only the words the guide uses
// (Ports, Serial RX, UART2, Receiver, Serial (via UART), CRSF, ExpressLRS, WiFi Connectivity, Enable WiFi,
// ExpressLRS TX / expresslrs, RadioMaster RP1 2.4GHz RX, RadioMaster Pocket, ISM 2400, BetaflightPassthrough, WiFi,
// Build, 10.0.0.1, Update, firmware.bin); real screens differ. Radio part (10 Nov audit, fix S7): Build first, then
// the radio's Wi-Fi, then upload at 10.0.0.1 (expresslrs.org/quick-start/transmitters/rm-internal, "Manual Upload via AP").
// The receiver light: slow blink = waiting for the radio, solid = bound (the guide's "Before you go on" box).
import { makePocket } from "./s3r-radio.js";
export default {
  T: 66,
  steps: [
    { t0: 0,  text: "Radio charged, with its cells in (Stage 3; if not, do Step 5's first two items now). Open <b>Betaflight Configurator</b> on the laptop and connect the flight controller by <b>USB</b>: <b>no battery</b>. No Betaflight yet? Get it from github.com/betaflight/betaflight-configurator/releases/latest, or use <b>app.betaflight.com</b> in Chrome.",
      why: "USB powers the flight controller: enough to set it up, with nothing that can spin. (When the receiver arrives, check that it powers from USB alone.)",
      simple: "Drone to laptop with the USB cable. No battery. Open Betaflight." },
    { t0: 8,  text: "<b>Ports</b> tab: turn on <b>Serial RX</b> for <b>UART2</b>, then <b>Save</b>.",
      why: "The receiver is soldered to UART2 (Step 4's first lesson). Serial RX tells the board to listen for the receiver there.",
      simple: "Ports tab: Serial RX on UART2. Save." },
    { t0: 14, text: "<b>Receiver</b> tab: pick <b>Serial (via UART)</b> and <b>CRSF</b>, then <b>Save</b>.",
      why: "CRSF is the language an ExpressLRS receiver speaks to the flight controller.",
      simple: "Receiver tab: Serial (via UART), CRSF. Save." },
    { t0: 20, text: "On the radio, press <b>SYS</b> (if a short press does not open the <b>Tools</b> menu, hold it). Open <b>ExpressLRS</b> and scroll to the <b>bottom</b>. <b>Note the version</b> shown.",
      why: "The receiver must run the same ExpressLRS version as the radio, so the radio's version is the one you build for.",
      simple: "SYS, ExpressLRS, scroll to the bottom, write down the version." },
    { t0: 27, text: "Install the <b>ExpressLRS Configurator</b> on the laptop (github.com/ExpressLRS/ExpressLRS-Configurator/releases). Build the receiver's firmware (in the list: <b>RadioMaster RP1 2.4GHz RX</b>) for the <b>same version as the radio</b>, regulatory domain <b>ISM 2400</b>, and a <b>bind phrase</b> of your own. <b>Write the phrase down.</b>",
      why: "ExpressLRS has no separate Canada option: ISM 2400 is the one to use. Do not pick EU CE/LBT. The bind phrase is what pairs your radio with only your receiver.",
      simple: "Same version as the radio, ISM 2400, your own bind phrase. Write the phrase down.",
      more: "Which version is the receiver on now? The shop says v2.4 and RadioMaster's RP1 manual says v3.0, so don't assume either: you flash it to the radio's version anyway." },
    { t0: 35, text: "Flash the receiver <b>through the flight controller</b>: receiver still wired to UART2. <b>Close Betaflight</b>, then <b>unplug the flight controller's USB cable and plug it back in</b>. In the Configurator pick the <b>RadioMaster RP1 2.4GHz RX</b> target, Flashing Method <b>BetaflightPassthrough</b>, and press <b>Flash</b>.",
      why: "BetaflightPassthrough: the flight controller passes the new firmware on to the receiver over the UART2 wires.",
      simple: "Close Betaflight. Unplug the USB cable and plug it back in. RadioMaster RP1 2.4GHz RX, BetaflightPassthrough, Flash.",
      more: "Using the receiver's own Wi-Fi instead? ExpressLRS says a receiver on 2.x firmware must first be flashed to version 2.5.2, and only then to the radio's version. On that old firmware there is no Update tab: scroll down to the Firmware Update section." },
    { t0: 43, text: "Now the radio. Before you join its Wi-Fi: in the Configurator pick the <b>RadioMaster Pocket Internal 2.4GHz TX</b> target, Flashing Method <b>WiFi</b>, the <b>same version</b>, <b>ISM 2400</b> and the <b>same bind phrase</b>, and press <b>Build</b>, not Flash. A folder opens with the file <b>firmware.bin</b>: leave it open.",
      why: "Same phrase on both ends: that is the whole pairing. Flash works only after the radio has been set up to join your home Wi-Fi, and the laptop has no internet while it is on the radio's Wi-Fi.",
      simple: "Pocket, WiFi, same version, ISM 2400, same phrase. Build, not Flash. Keep firmware.bin." },
    { t0: 48, text: "On the radio press <b>SYS</b>, open <b>ExpressLRS</b>, choose <b>WiFi Connectivity</b>, then <b>Enable WiFi</b>. On the laptop, join the Wi-Fi network <b>ExpressLRS TX</b> (password <b>expresslrs</b>). Open a browser at <b>10.0.0.1</b>, open the <b>Update</b> tab, choose <b>firmware.bin</b> and press <b>Update</b>. Wait for the success message (a minute or two).",
      why: "The radio gets the same bind phrase and ISM 2400 over its own Wi-Fi.",
      simple: "Radio: SYS, ExpressLRS, WiFi Connectivity, Enable WiFi. Laptop: join ExpressLRS TX, 10.0.0.1, Update tab, firmware.bin, Update.",
      more: "No Update tab? On older firmware, scroll down to the Firmware Update section instead." },
    { t0: 58, text: "With a bind phrase on both, they <b>connect on their own</b>. With the radio on, the receiver stops its <b>slow blink</b> and its light goes <b>solid</b>: bound.",
      why: "A slow blink means the receiver is waiting for the radio.",
      simple: "Radio on. The receiver's light stops blinking and stays on. Done." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    // the model's solder dots on the flight controller's TOP face are hidden: the pads are on the face that points down (picture fix, 11 Nov 2026)
    const m = await E.loadStepModel(root, "step-04-receiver-fpv.glb", { at: V(0, 0.5, 0), hide: /^(monitor_|cone_pilot|campose_pilot|finder_|frame_top_plate)|^(vtx|finder)_wire_.*_solder_b$/ });
    // the laptop's screen: a canvas laid on the model's screen face (the face is 10.6 x 6.2 cm; model units are metres)
    const face = m.n("laptop_tag_screen_face");
    const lt = E.canvasTex(1060, 620, () => {});
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.106, 0.062), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false }));
    disp.position.z = 0.0006; face.add(disp);
    // the receiver's light (shown white: the guide does not name its colour), on top of the receiver
    const led = E.mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8a8a80, emissive: 0xfff6d8, emissiveIntensity: 0 }), root);
    led.position.copy(m.at("rx_rp1")).add(V(0, 0.45, 0));
    // the radio, on the bench to the left of the laptop
    const p = makePocket(E, root, V(-19, 6.2, -24));
    p.group.rotation.y = 0.45;
    p.group.updateMatrixWorld(true);

    let drawn = "";
    function screen(kind, k = 0) {
      const key = kind + Math.round(k * 20); if (key === drawn) return; drawn = key;
      const c = lt.canvas.getContext("2d"), W = 1060, H = 620;
      c.fillStyle = "#1b2430"; c.fillRect(0, 0, W, H);
      const title = s => { c.fillStyle = "#e9f1ff"; c.font = "bold 52px Arial"; c.fillText(s, 40, 80); };
      const row = (label, value, y, on) => {
        c.font = "40px Arial"; c.fillStyle = "#c9d6e6"; c.fillText(label, 40, y);
        if (value) {
          c.fillStyle = on ? "#1d7cff" : "#2c3846"; c.fillRect(470, y - 40, 540, 56); c.fillStyle = "#fff";
          let f = 40; while (c.measureText(value).width > 500 && f > 22) { f -= 2; c.font = f + "px Arial"; }
          c.fillText(value, 490, y);
        }
      };
      const save = (y, lit) => { c.fillStyle = lit ? "#2fb36a" : "#2c3846"; c.fillRect(40, y - 44, 220, 60); c.fillStyle = "#fff"; c.font = "bold 40px Arial"; c.fillText("Save", 100, y); };
      const note = () => { c.font = "28px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: real screens may differ)", 40, H - 26); };
      if (kind === "off") { c.fillStyle = "#0b0d10"; c.fillRect(0, 0, W, H); lt.tex.needsUpdate = true; return; }
      if (kind === "connect") { title("Betaflight Configurator"); row("USB, no battery", k > 0.5 ? "Connected" : "Connect", 220, k > 0.5); note(); }
      else if (kind === "ports") { title("Ports"); row("UART1", "", 200); row("UART2", k > 0.4 ? "Serial RX: on" : "Serial RX: off", 290, k > 0.4); save(420, k > 0.8); note(); }
      else if (kind === "receiver") { title("Receiver"); row("Receiver mode", k > 0.3 ? "Serial (via UART)" : "...", 200, k > 0.3); row("Provider", k > 0.6 ? "CRSF" : "...", 290, k > 0.6); save(420, k > 0.85); note(); }
      else if (kind === "build" || kind === "rx" || kind === "tx") {
        title("ExpressLRS Configurator");
        row("Target", kind === "tx" ? "RadioMaster Pocket Internal 2.4GHz TX" : (kind === "rx" || k > 0.2 ? "RadioMaster RP1 2.4GHz RX" : "..."), 170, true);
        row("Version", k > 0.35 || kind !== "build" ? "same as the radio" : "...", 245, true);
        row("Domain", k > 0.5 || kind !== "build" ? "ISM 2400" : "...", 320, true);
        row("Bind phrase", k > 0.7 || kind !== "build" ? "(your own)" : "...", 395, true);
        if (kind !== "build") {
          row("Method", kind === "tx" ? "WiFi" : "BetaflightPassthrough", 470, true);
          c.fillStyle = "#2c3846"; c.fillRect(470, 510, 540, 26); c.fillStyle = "#2fb36a"; c.fillRect(470, 510, 540 * k, 26);
          c.font = "bold 34px Arial"; c.fillStyle = "#fff"; c.fillText(kind === "tx" ? (k >= 1 ? "Built: firmware.bin" : "Build") : (k >= 1 ? "Done" : "Flash"), 40, 536);
        }
        note();
      } else if (kind === "wifi") { title("Wi-Fi networks"); row("Join", "ExpressLRS TX", 200, k > 0.4); row("Password", k > 0.7 ? "expresslrs" : "", 290, k > 0.7); note(); }
      else if (kind === "upload") {
        title("Browser: 10.0.0.1"); row("Tab", "Update", 200, true); row("File", k > 0.25 ? "firmware.bin" : "...", 290, k > 0.25);
        c.fillStyle = "#2c3846"; c.fillRect(470, 380, 540, 26); c.fillStyle = "#2fb36a"; c.fillRect(470, 380, 540 * Math.max(0, (k - 0.4) / 0.6), 26);
        c.font = "bold 34px Arial"; c.fillStyle = "#fff"; c.fillText(k >= 1 ? "Success" : "Update", 40, 406);
        note();
      }
      lt.tex.needsUpdate = true;
    }

    const lapScr = m.at("laptop_tag_screen_face");
    const wide = [V(-8, 30, 26), V(-6, 3, -16)];
    const lap = [lapScr.clone().add(V(0, 3.5, 15)), lapScr.clone().add(V(0, 0.4, 0))];
    const radio = [p.at("screen").add(V(3, 5, 15)), p.at("screen").add(V(0, -1.8, 0))];   // further back and lower, so the SYS button is in the picture (picture fix, 11 Nov 2026)
    const rx = [V(-7, 9, -7), V(-2.8, 1, -1.4)];
    let st = {};
    return {
      cams: [[0, ...wide], [3.4, ...wide], [4.4, ...lap], [19.4, ...lap], [20.4, ...radio], [26.4, ...radio], [27.4, ...lap], [42.4, ...lap], [47.6, ...lap], [48.6, ...radio], [51.8, ...radio], [52.8, ...lap], [57.4, ...lap], [58.4, ...rx], [66, ...rx]],
      tags: [
        { text: "USB only: no battery", cls: "red", at: () => m.at("usb_cable").add(V(0, 2, 0)), from: 0.8, to: 7.5 },
        { text: "Serial RX on UART2", cls: "blue", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 9, to: 14 },
        { text: "Serial (via UART), CRSF", cls: "blue", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 15, to: 20 },
        { text: "SYS: short press, or hold", cls: "blue", at: () => p.at("SYS"), from: 20.6, to: 23.5 },
        { text: "Note the version", cls: "warn", at: () => p.at("screen").add(V(0, 1.6, 0)), from: 23.5, to: 27 },
        { text: "ISM 2400 (not EU CE/LBT)", cls: "warn", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 28, to: 31.5 },
        { text: "Write the bind phrase down", cls: "warn", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 31.5, to: 35 },
        { text: "Close Betaflight, then replug the USB", cls: "red", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 35.4, to: 38 },
        { text: "BetaflightPassthrough", cls: "blue", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 38, to: 43 },
        { text: "Same phrase, same version", cls: "good", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 43.4, to: 45.6 },
        { text: "Build, not Flash", cls: "warn", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 45.6, to: 48 },
        { text: "WiFi Connectivity, Enable WiFi", cls: "blue", at: () => p.at("screen").add(V(0, 1.6, 0)), from: 48.8, to: 52 },
        { text: "Join ExpressLRS TX", cls: "blue", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 52.9, to: 54.6 },
        { text: "10.0.0.1: Update tab, firmware.bin", cls: "blue", at: () => lapScr.clone().add(V(0, 3.2, 0)), from: 54.8, to: 58 },
        { text: "Slow blink = waiting", cls: "warn", at: () => led.position.clone().add(V(0, 1.2, 0)), from: 58.6, to: 61.5 },
        { text: "Solid = bound", cls: "good", at: () => led.position.clone().add(V(0, 1.2, 0)), from: 61.6, to: 66 },
      ],
      update(t) {
        // laptop
        if (t < 2) screen("off");
        else if (t < 8) screen("connect", prog(t, 4.5, 6.5));
        else if (t < 14) screen("ports", prog(t, 9.5, 13));
        else if (t < 20) screen("receiver", prog(t, 15, 19));
        else if (t < 35) screen("build", prog(t, 28, 34));
        else if (t < 43) screen("rx", prog(t, 39, 42.5));
        else if (t < 48.6) screen("tx", prog(t, 45.6, 47.6));
        else if (t < 54.6) screen("wifi", prog(t, 52.9, 54.4));
        else screen("upload", prog(t, 54.9, 56.8));
        // radio: Tools, ExpressLRS (version at the bottom), WiFi Connectivity, Enable WiFi
        p.throttle(-1);
        p.press("SYS", (t > 21 && t < 21.8) || (t > 48.8 && t < 49.5) ? 1 : 0);
        const wheelPush = [[22.4, 23], [49.8, 50.3], [50.7, 51.2]].some(([a, b]) => t > a && t < b);
        p.press("wheel", wheelPush ? 1 : 0);
        p.roll(prog(t, 23.2, 25.5) * 0.3 + prog(t, 49.5, 49.8) * 0.05);
        if (t < 21.8 || (t >= 27 && t < 49.5)) p.home("FIREWATCH");
        else if (t < 23) p.screen("TOOLS", ["ExpressLRS", "..."], 0);
        else if (t < 27) { const end = t > 25.5; p.screen("ExpressLRS", end ? ["...", "...", "version: note it"] : ["...", "WiFi Connectivity", "..."], end ? 2 : -1); }
        else if (t < 50.3) p.screen("TOOLS", ["ExpressLRS", "..."], 0);
        else if (t < 51.2) p.screen("ExpressLRS", ["...", "WiFi Connectivity", "..."], 1);
        else p.screen("WiFi Connectivity", ["Enable WiFi", "..."], 0);
        // the receiver: slow blink until both ends have the phrase, then solid
        const bound = t >= 61.6;
        led.material.emissiveIntensity = bound ? 2.2 : (Math.floor(t / 1.2) % 2 ? 1.8 : 0.05);
        st = { laptop: drawn.replace(/\d+$/, ""), radio: p.shown().split("|")[0], bound };
      },
      state() { return st; },
    };
  },
};
