// Stage 3 (part 4): practise in the simulator. Words from the guide's Stage 3 text: plug the radio into the laptop
// by USB, choose "USB Joystick (HID)" on the radio's screen, pick it as the controller in FPV SkyDive (free on Steam),
// use the self-levelling (Angle) mode; done = a 30-second hover inside a box about 3 m wide, three times in a row,
// then arm and disarm without looking. Which radio port carries data is being checked on Shad's radio (7 Nov):
// the manual's drawing labels the top one "USB Port" and the bottom one "TYPE-C Charge Port".
import { makePocket } from "./s3r-radio.js";
export default {
  T: 46,
  steps: [
    { t0: 0,  text: "Radio on, on its main screen. Plug its cord into the radio's <b>top USB Port</b> (beside the antenna) and into a USB port on the laptop.",
      why: "The top port is the one that talks to the laptop. The bottom one is for charging.",
      simple: "Top of the radio to the laptop, with the radio already on." },
    { t0: 8,  text: "The radio shows a small menu. Roll the dark bar onto <b>USB Joystick (HID)</b> and push the wheel. The laptop now sees the radio as a game controller.",
      why: "The radio can be a game controller, a memory stick or a serial port. The simulator needs the game controller.",
      simple: "Pick 'USB Joystick (HID)'. That makes it a controller.",
      more: "The radio can act as three things over USB: a game controller (USB Joystick), a memory stick (USB Storage) or a serial port (USB Serial). Windows showed your radio as 'HID-compliant game controller' once it worked." },
    { t0: 15, text: "In <b>FPV SkyDive</b> (free on Steam), go to <b>Settings &gt; Controls</b> and calibrate. Follow its steps. <b>Rest a finger on the switch before the switch step</b>: it goes fast, and if you miss it you start again. The lesson <b>Game controls</b> shows this page row by row: do it before you fly.",
      why: "Calibrating teaches the game where each stick's ends and middle are, so the pretend drone does exactly what your thumbs do.",
      simple: "Settings, Controls, Calibrate. Do what it asks. Be quick on the switch.",
      more: "Calibrating tells the game where each stick's ends and middle are. If the drone drifts or the throttle feels wrong later, calibrate again in the game. Don't recalibrate the radio itself unless you're sure the radio is the problem." },
    { t0: 21, text: "Choose the <b>self-levelling mode</b> (usually called <b>Angle</b>). Let go of the right stick and the drone levels itself.",
      why: "It's the easiest mode to learn in, and it's the mode of your first real hover in Step 8.",
      simple: "Pick 'Angle'. It keeps the drone level for you." },
    { t0: 27, text: "Target: <b>hover for 30 seconds</b> inside a box about <b>3 m wide</b>, <b>three times in a row</b>. Crash as much as you like: it costs nothing.",
      why: "Hovering in one spot is the first thing you'll do with the real drone. Practising here saves real parts.",
      simple: "Stay still in the air for 30 seconds, three times. Crashing is fine." },
    { t0: 37, text: "Then <b>arm and disarm</b> (motors on and off) with your <b>arm switch, SA</b>, <b>without looking</b> at the radio. If the game won't arm, its makers say pressing <b>P</b> on the keyboard also arms.",
      why: "With a real drone you watch the drone, not the radio. Your hand has to know where the off switch is.",
      simple: "Practise flicking SA without looking.",
      more: "On a real drone, arming means the motors can spin. That's why it's a switch you set on purpose, and why 'off' must be easy to find without looking." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const p = makePocket(E, root, V(-9, 6.2, 6));
    p.group.rotation.y = 0.35;
    p.group.updateMatrixWorld(true);
    // a plain laptop: base, keyboard area, screen showing the simulator (drawn, not a picture of the real game)
    const lap = new THREE.Group(); lap.position.set(14, 0, -6); lap.rotation.y = -0.3; root.add(lap);
    const base = E.mesh(new THREE.BoxGeometry(34, 1.6, 23), E.mat(0x24272c, { roughness: 0.5 }), lap); base.position.y = 0.8;
    const keys = E.mesh(new THREE.BoxGeometry(29, 0.1, 10), E.mat(0x15171a), lap); keys.position.set(0, 1.65, -2.5);
    const lid = new THREE.Group(); lid.position.set(0, 1.6, -11.4); lid.rotation.x = -0.2; lap.add(lid);
    const shell = E.mesh(new THREE.BoxGeometry(34, 22, 0.8), E.mat(0x24272c, { roughness: 0.5 }), lid); shell.position.y = 11;
    const sim = E.canvasTex(800, 480, () => {});
    const disp = E.mesh(new THREE.PlaneGeometry(32, 19.2), new THREE.MeshBasicMaterial({ map: sim.tex, toneMapped: false }), lid); disp.position.set(0, 11.2, 0.42); disp.castShadow = false;
    const portAt = lap.localToWorld(V(-17.2, 0.9, -4));
    let drawn = "";
    function simScreen(kind, k = 0) {
      const key = kind + Math.round(k * 30); if (key === drawn) return; drawn = key;
      const c = sim.canvas.getContext("2d");
      if (kind === "off") { c.fillStyle = "#0b0d10"; c.fillRect(0, 0, 800, 480); }
      else if (kind === "pick") {
        c.fillStyle = "#1b2430"; c.fillRect(0, 0, 800, 480); c.fillStyle = "#e9f1ff"; c.font = "bold 40px Arial"; c.fillText("Simulator: Controls", 40, 70);
        c.font = "32px Arial"; c.fillText("Controller:", 40, 150); c.fillStyle = "#1d7cff"; c.fillRect(230, 115, 520, 50); c.fillStyle = "#fff"; c.fillText("(your radio)", 245, 150);
        c.fillStyle = "#e9f1ff"; c.fillText("Flight mode:", 40, 240); c.fillText(kind === "pick" && k > 0.5 ? "Angle (self-levelling)" : "...", 245, 240);
        c.font = "24px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: the real menu words may differ)", 40, 440);
      } else {
        // a hover: sky, ground, a 3 m box, the pretend drone, a 30 s count
        c.fillStyle = "#8fc3ea"; c.fillRect(0, 0, 800, 260); c.fillStyle = "#6f9a4e"; c.fillRect(0, 260, 800, 220);
        c.strokeStyle = "#ffd23f"; c.lineWidth = 6; c.strokeRect(250, 300, 300, 120); c.fillStyle = "#222"; c.font = "bold 26px Arial"; c.fillText("3 m box", 340, 455);
        const x = 400 + Math.sin(k * 9) * 60, y = 210 + Math.cos(k * 7) * 18;
        c.fillStyle = "#1a1d22"; c.fillRect(x - 40, y - 6, 80, 12); c.beginPath(); c.arc(x - 40, y - 10, 14, 0, 7); c.arc(x + 40, y - 10, 14, 0, 7); c.fill();
        // 11 Nov (pictures, row 6): no counters on this drawn screen (one 30 s hover was counted as "3 in a row", and nobody here
        // knows what the real game shows); the target is in the label above it
        c.fillStyle = "#fff"; c.font = "bold 34px Arial"; c.fillText("A drawing: your screen will differ", 30, 56);
      }
      sim.tex.needsUpdate = true;
    }
    // the cord from the radio's top port to the laptop's side port
    const cord = E.liveTube(root, 0x111111, 0.22);
    let st = {};
    const both = [V(-4, 26, 40), V(2, 7, -2)], radio = [p.at("screen").add(V(2, 4, 11)), p.at("screen")], screen = [V(10, 16, 18), lap.localToWorld(V(0, 12, -11))], hands = [V(-14, 20, 22), p.at("SA")];
    return {
      cams: [[0, ...both], [7.4, ...both], [8.4, ...radio], [14.4, ...radio], [15.4, ...screen], [36.4, ...screen], [37.4, ...hands], [46, ...hands]],
      tags: [
        { text: "Top USB Port", cls: "blue", at: () => p.at("usbTop").add(V(0, 0.8, 0)), from: 1, to: 8 },
        { text: "USB Joystick (HID)", cls: "good", at: () => p.at("screen").add(V(0, 1.5, 0)), from: 9.5, to: 15 },
        { text: "Pick the radio", cls: "blue", at: () => lap.localToWorld(V(7.5, 17.2, -11)), from: 16, to: 21 },
        { text: "Angle (self-levelling)", cls: "good", at: () => lap.localToWorld(V(14, 10.7, -12.8)), from: 22, to: 27 },   // 11 Nov (pictures, row 36): to the right of the drawn line, not on it
        { text: "30 s, 3 m box, 3 in a row", cls: "good", at: () => lap.localToWorld(V(0, 23, -15.5)), from: 28, to: 37 },   // 11 Nov (pictures): on the lid's top edge, clear of the drawn line "A drawing: ..."
        { text: "Arm / disarm without looking", cls: "warn", at: () => p.at("SA"), from: 37.6, to: 46 },
      ],
      update(t) {
        p.throttle(t > 30 && t < 36 ? -0.1 + 0.15 * Math.sin(t * 2) : -1);
        p.stickR(t > 30 && t < 36 ? 0.2 * Math.sin(t * 3) : 0, t > 30 && t < 36 ? 0.15 * Math.cos(t * 2.4) : 0);
        const k = prog(t, 2, 5);
        p.cord("top", k);
        const a = p.at("usbTop").add(V(0, 1.6 + 3 * (1 - k), 0)), b = portAt.clone();
        cord([a, a.clone().add(V(0, 5, -2)), b.clone().add(V(-6, 3, 0)), b]);
        // 11 Nov (pictures, row 19): the menu stays on the radio's screen until the step ends (the wheel is pushed last);
        // the model is still POCKET here, as in the first lesson (FIREWATCH is named two lessons later)
        if (t < 9) p.home("POCKET");
        else { p.home("POCKET"); p.popup(["USB Joystick (HID)", "...", "..."], 0); }
        p.press("wheel", t > 14.2 && t < 14.95 ? 1 : 0);
        if (t >= 15) p.home("POCKET");
        if (t < 15) simScreen("off"); else if (t < 27) simScreen("pick", prog(t, 21, 23)); else simScreen("hover", prog(t, 28, 36));
        const arm = t < 39 ? -1 : t < 41 ? 1 : t < 43 ? -1 : -1;
        p.flick("SA", arm);
        st = { cordIn: k >= 1, hid: t >= 15, screen: p.shown(), armDownAtEnd: arm < 0 };
      },
      state() { return st; },
    };
  },
};
