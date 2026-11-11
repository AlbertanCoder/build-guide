// Step 6A: get the Pi ready (S6.0). Words follow the guide's S6.0 (index.html, after the 10 Nov audit).
// Parts: docs/models/step-06-payload.glb (only the Pi and its bench supply are shown: the HAT, sensors and cables come
// in 6B and 6C). The laptop (lessons/laptop.js), the card, the card reader and the phone are simple shapes; the screens
// are DRAWINGS with only the guide's words and commands. The card goes in at the Pi's short end away from PWR IN.
import { makeLaptop, terminal, form } from "./laptop.js";
const U = "username";   // the guide's placeholder: the username he sets in Imager
export default {
  T: 80,
  steps: [
    { t0: 0,  text: "On your laptop, install <b>Raspberry Pi Imager</b> from raspberrypi.com/software. Put the kit's <b>card</b> in the kit's <b>card reader</b> and plug it into the laptop.",
      why: "Imager puts the Pi's operating system on the card. The Pi has no other storage.",
      simple: "Install Raspberry Pi Imager. Card in the reader, reader in the laptop." },
    { t0: 6,  text: "In Imager: Device = <b>Raspberry Pi Zero 2 W</b>; OS = the <b>recommended one at the top of the list</b>; Storage = <b>the card</b>. Take care to pick the card and not another drive, or you will <b>erase that drive</b>.",
      why: "Writing the card wipes whatever drive you pick.",
      simple: "Zero 2 W, the top OS, and the CARD. Not another drive." },
    { t0: 13, text: "Imager then asks a few things, one screen at a time. <b>Hostname</b>: type <b>raspberrypi</b>. <b>Localisation</b>: pick Canada (it also sets the Wi-Fi country). <b>User</b>: a <b>username</b> (lowercase letters and numbers) and a <b>password</b>. <b>Wi-Fi</b>: your <b>iPhone's hotspot name and password</b>. <b>Remote access</b>: turn on <b>SSH</b>.",
      why: "The hostname is the Pi's name on the network: the ssh command you type later uses it. SSH lets you type commands on the Pi from your laptop, so the Pi needs no screen or keyboard.",
      simple: "Hostname raspberrypi, Canada, username, password, your iPhone hotspot, SSH on." },
    { t0: 20, text: "On the iPhone, open <b>Settings > Personal Hotspot</b> and turn on <b>Maximize Compatibility</b>: that puts the hotspot on 2.4 GHz. Your laptop joins the <b>same hotspot</b>, at home and at the field.",
      why: "The Pi Zero 2 W has 2.4 GHz Wi-Fi only.",
      simple: "iPhone: Maximize Compatibility on. Laptop on the same hotspot." },
    { t0: 27, text: "<b>Write</b> the card. Put the card in the Pi and power it from the <b>kit's supply</b>, in the socket marked <b>PWR IN</b>.",
      why: "The kit's supply goes in the socket marked PWR IN, as the guide says.",
      simple: "Write the card, card into the Pi, power into PWR IN." },
    { t0: 33, text: "Connect from your laptop over <b>SSH</b>: in a terminal, type <code>ssh username@raspberrypi.local</code> (use the username you set in Imager).",
      why: "On Windows, the Raspberry Pi documentation has a separate page on how to connect over SSH.",
      simple: "In a terminal: ssh, your username, @raspberrypi.local." },
    { t0: 39, text: "Turn on <b>I2C</b>: type <code>sudo raspi-config</code>, choose <b>3 Interface Options</b>, then <b>I5 I2C</b>, answer <b>Yes</b>, then <b>Finish</b>.",
      why: "I2C is the two-wire bus the thermal camera and the GPS talk on.",
      simple: "raspi-config, Interface Options, I2C, Yes, Finish." },
    { t0: 45, text: "Set the I2C bus to <b>400 kHz</b>, as the payload README says: <code>sudo nano /boot/firmware/config.txt</code>, add the line <code>dtparam=i2c_arm_baudrate=400000</code> at the <b>end</b>, save with <b>Ctrl+O, Enter</b>, then <b>Ctrl+X</b>. Type <code>sudo reboot</code> and connect over SSH again.",
      why: "The payload README asks for this bus speed.",
      simple: "Add the 400000 line at the end of config.txt, save, reboot, SSH back in." },
    { t0: 54, text: "Copy the payload code to the Pi. On the laptop, in the folder that holds <b>Shad-Drone-Payload</b>, type <code>scp -r Shad-Drone-Payload username@raspberrypi.local:</code> (with the <b>colon at the end</b>).",
      why: "scp copies files over the same connection as SSH. The colon means \"into your home folder on the Pi\".",
      simple: "scp the folder to the Pi. Don't forget the colon." },
    { t0: 60, text: "On the Pi, in the SSH window: <code>cd Shad-Drone-Payload</code>, then install the drivers as the payload README shows: <code>python3 -m venv --system-site-packages .venv</code>, then <code>source .venv/bin/activate</code>, then <code>python -m pip install -r requirements.txt</code>.",
      why: "The drivers go in their own folder (.venv) so they don't clash with the Pi's own Python.",
      simple: "cd into the folder, make the .venv, activate it, pip install the requirements." },
    { t0: 68, text: "<b>Spare card:</b> when this whole step works, do it again on the spare card (Stage 2): the same Imager settings, then the same payload set-up. Label it <b>SPARE</b> and keep it with the drone.",
      why: "If a crash or a pulled pack leaves the Pi unable to start, swap cards.",
      simple: "Make a second card the same way. Label it SPARE." },
    { t0: 74, text: "<b>Stopping point:</b> the Pi starts and you can log in from your laptop. You can stop here for the day. (When the Pi arrives, check: it joins your iPhone's hotspot and the laptop reaches it with <code>ssh username@raspberrypi.local</code>.)",
      why: "6A is done.",
      simple: "Pi on, you can log in. Done for today." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-06-payload.glb", { at: V(0, 0.5, 6), hide: /^(hat_|cab17261_|thermal_|gps_|arrow_|pigtail_|LBL_)/ });
    const lap = makeLaptop(E, root, V(-2, 0, -20), 0);
    // the card: a small dark card; the reader: a small grey block at the laptop's left side
    const card = E.mesh(new THREE.BoxGeometry(1.1, 0.08, 1.5), E.mat(0x1d2433, { roughness: 0.4 }), root);
    const reader = E.mesh(new THREE.BoxGeometry(2.2, 0.8, 3.2), E.mat(0x8c939b, { roughness: 0.5 }), root);
    const side = lap.sideAt();
    const readerIn = side.clone().add(V(-1.6, 0, 0)), readerAway = V(-28, 0.4, -6);
    const piPos = m.at("pi_pcb"), slot = piPos.clone().add(V(-3.6, 0.15, 0));
    // the phone, face up, with its hotspot screen
    const phone = new THREE.Group(); phone.position.set(18, 0.45, -6); phone.rotation.y = -0.3; root.add(phone);
    E.mesh(new THREE.BoxGeometry(7.2, 0.8, 14.6), E.mat(0x202328, { roughness: 0.4 }), phone);
    const ps = E.canvasTex(360, 720, () => {});
    const pscr = E.mesh(new THREE.PlaneGeometry(6.6, 13.6), new THREE.MeshBasicMaterial({ map: ps.tex, toneMapped: false }), phone);
    pscr.rotation.x = -Math.PI / 2; pscr.position.y = 0.42; pscr.castShadow = false;
    let phoneDrawn = "";
    const phoneScreen = on => {
      const k = on ? "on" : "off"; if (k === phoneDrawn) return; phoneDrawn = k;
      const c = ps.canvas.getContext("2d"); c.fillStyle = "#f2f2f7"; c.fillRect(0, 0, 360, 720);
      c.fillStyle = "#111"; c.font = "bold 34px Arial"; c.fillText("Personal Hotspot", 24, 80);
      c.font = "26px Arial"; c.fillText("Maximize", 24, 200); c.fillText("Compatibility", 24, 234);
      c.fillStyle = on ? "#34c759" : "#c7c7cc"; c.beginPath(); c.roundRect(250, 190, 90, 50, 25); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(on ? 315 : 275, 215, 21, 0, 7); c.fill();
      c.fillStyle = "#555"; c.font = "22px Arial"; c.fillText(on ? "2.4 GHz: the Pi can join" : "", 24, 300);
      c.fillText("(a drawing)", 24, 690);
      ps.tex.needsUpdate = true;
    };
    const supplyPlug = m.n("pi_bench_supply"), plugHome = m.home("pi_bench_supply").p.clone();
    const scr = lap.screenAt(0, 0);
    const wide = [V(-4, 34, 34), V(0, 3, -6)];
    const screen = [scr.clone().add(V(0, 4, 28)), scr];
    const pi = [piPos.clone().add(V(-4, 12, 12)), piPos];
    const phoneCam = [phone.position.clone().add(V(-2, 18, 8)), phone.position.clone()];
    const T1 = [];
    let st = {};
    const cmds = {
      ssh: ["$ ssh " + U + "@raspberrypi.local", U + "@raspberrypi:~ $"],
      i2c: ["$ sudo raspi-config", "  3 Interface Options", "    I5 I2C  ->  Yes", "  Finish"],
      baud: ["$ sudo nano /boot/firmware/config.txt", "  ...", "  (at the end:)", "  dtparam=i2c_arm_baudrate=400000", "  Ctrl+O, Enter, Ctrl+X", "$ sudo reboot", "$ ssh " + U + "@raspberrypi.local"],
      scp: ["(on the laptop, in the folder that holds it)", "$ scp -r Shad-Drone-Payload " + U + "@raspberrypi.local:", "  (the last character is a colon)"],
      pip: ["$ cd Shad-Drone-Payload", "$ python3 -m venv --system-site-packages .venv", "$ source .venv/bin/activate", "$ python -m pip install -r requirements.txt"],
    };
    void T1;
    return {
      cams: [[0, ...wide], [5.4, ...wide], [6.4, ...screen], [19.4, ...screen], [20.4, ...phoneCam], [26.4, ...phoneCam], [27.4, ...pi], [32.4, ...pi], [33.4, ...screen], [67.4, ...screen], [68.4, ...wide], [80, ...wide]],
      tags: [
        { text: "Card in the card reader", cls: "blue", at: () => reader.position.clone().add(V(0, 1.6, 0)), from: 1, to: 6 },
        { text: "Storage = the card, not another drive", cls: "red", at: () => lap.screenAt(4, -3.8), from: 9.5, to: 13 },
        { text: "SSH on", cls: "blue", at: () => lap.screenAt(13, 8.5), from: 14, to: 20 },
        { text: "Maximize Compatibility: 2.4 GHz", cls: "good", at: () => phone.position.clone().add(V(-0.4, 1, 1.5)), from: 21, to: 27 },
        { text: "Card into the Pi", cls: "blue", at: () => slot.clone().add(V(0, 1.2, 0)), from: 28, to: 30.3 },
        { text: "PWR IN: read the print on the board", cls: "warn", at: () => m.at("pi_usb_power").add(V(0, 1.2, 0)), from: 30.5, to: 33 },
        { text: "Colon at the end", cls: "warn", at: () => lap.screenAt(9, 2.4), from: 55, to: 60 },
        { text: "Stopping point: you can log in", cls: "good", at: () => piPos.clone().add(V(0, 2.2, 0)), from: 75, to: 80 },
      ],
      update(t) {
        // the reader goes into the laptop with the card, then the card moves to the Pi
        const rk = prog(t, 1, 3) * (1 - prog(t, 27, 28));
        reader.position.lerpVectors(readerAway, readerIn, rk);
        if (t < 27.6) card.position.copy(reader.position).add(V(0, 0.45, 0.4));
        else card.position.lerpVectors(reader.position.clone().add(V(0, 0.45, 0.4)), slot, prog(t, 27.6, 29.6));
        // the supply plug goes into PWR IN
        supplyPlug.visible = t >= 29.5;
        supplyPlug.position.copy(plugHome).add(V(0.03 * (1 - prog(t, 29.6, 31)), 0, 0));
        phoneScreen(t >= 22.5);
        // the laptop
        if (t < 3) lap.draw("off", c => { c.fillStyle = "#0b0d10"; c.fillRect(0, 0, 1000, 600); });
        else if (t < 6) lap.draw("imager0", c => form(c, "Raspberry Pi Imager", [["Device", "...", false], ["OS", "...", false], ["Storage", "...", false]]));
        else if (t < 13) { const k = Math.floor(prog(t, 7, 11) * 3.99);
          lap.draw("imager" + k, c => form(c, "Raspberry Pi Imager", [["Device", k >= 1 ? "Raspberry Pi Zero 2 W" : "...", k >= 1], ["OS", k >= 2 ? "the recommended one (top)" : "...", k >= 2], ["Storage", k >= 3 ? "the card" : "...", k >= 3]])); }
        else if (t < 20) lap.draw("settings", c => form(c, "Imager asks, one screen at a time", [["Hostname", "raspberrypi", true], ["Localisation", "Canada", true], ["Username", "lowercase + numbers", true], ["Password", "********", true], ["Wi-Fi", "iPhone hotspot + password", true], ["SSH", "on", true]]));
        else if (t < 33) { const w = prog(t, 27, 28.5); lap.draw("write" + Math.round(w * 10), c => { form(c, "Raspberry Pi Imager", [["Write", w >= 1 ? "Done" : "Writing...", w >= 1]]); c.fillStyle = "#2c3846"; c.fillRect(30, 260, 940, 30); c.fillStyle = "#2fb36a"; c.fillRect(30, 260, 940 * w, 30); }); }
        else if (t < 39) lap.draw("ssh", c => terminal(c, cmds.ssh));
        else if (t < 45) lap.draw("i2c", c => terminal(c, cmds.i2c));
        else if (t < 54) lap.draw("baud", c => terminal(c, cmds.baud));
        else if (t < 60) lap.draw("scp", c => terminal(c, cmds.scp));
        else if (t < 74) lap.draw("pip", c => terminal(c, cmds.pip));
        else lap.draw("done", c => terminal(c, cmds.ssh));
        st = { laptop: lap.shown(), hotspot: t >= 22.5, cardInPi: card.position.distanceTo(slot) < 0.05, powered: t >= 31 };
      },
      state() { return st; },
    };
  },
};
