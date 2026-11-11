// Step 6C: connect and test (S6.3, S6.4, with S6.S's safety lines and the "Before you go on" box). Words follow the
// guide (index.html, after the 10 Nov audit). Parts: docs/models/step-06-payload.glb: the cable ends
// (cab17261_<sensor>_socket_1/2/3/5; there is no socket 4, so INT stays empty), the sensors' pins
// (<sensor>_pin_1..5, left to right with the board face up), the arrows for "lens down / antenna up" (later, on the
// drone). The laptop (lessons/laptop.js) shows a DRAWING of the i2cdetect table with only 10 and 33 answering.
import { makeLaptop, terminal } from "./laptop.js";
const PINS = ["3.3 V", "SDA", "SCL", "not used", "GND"];
export default {
  T: 50,
  steps: [
    { t0: 0,  text: "Connect each sensor to the HAT with <b>one cable</b>. Hold each sensor board <b>face up</b> with its five pins along the bottom edge. From the left, the pins are <b>3.3 V, SDA, SCL, a pin you do not use, GND</b>. The boards print <b>3-6V</b> or <b>3-5V</b> at the 1st pin, and a <b>crossed circle or INT</b> at the 4th.",
      why: "This order is from Pimoroni's photos; check the printed labels on your boards.",
      simple: "Board face up. Pins from the left: 3.3 V, SDA, SCL, not used, GND." },
    { t0: 8,  text: "Push each of the cable's <b>four separate ends</b> onto its own pin in that order. <b>Leave the 4th pin empty.</b>",
      why: "The cable has four wires and the board has five pins: the 4th is the one not used.",
      simple: "Four ends on four pins. The 4th pin stays empty." },
    { t0: 15, text: "<b>Ignore the letters printed on the HAT</b>: SparkFun confirms its SDA and SCL labels are swapped. <b>Trust the cable colours</b>: <b>black GND, red 3.3 V, blue SDA, yellow SCL</b>. Power the sensors from the cable's <b>red 3.3 V</b> wire only.",
      why: "Going by the HAT's swapped labels would put SDA and SCL the wrong way round.",
      simple: "Go by colour: black GND, red 3.3 V, blue SDA, yellow SCL.",
      more: "When each sensor board arrives, check: its left-to-right pin order as printed (look for the crossed circle or INT between SCL and GND), and which HAT socket each cable goes into." },
    { t0: 23, text: "Power the Pi on the bench from the <b>kit's supply</b>, in the socket marked <b>PWR IN</b>.",
      why: "The sensors take their power from the Pi through the HAT and the cables.",
      simple: "Kit supply into PWR IN." },
    { t0: 28, text: "Over SSH, type <code>sudo i2cdetect -y 1</code>. In the table it prints, you should see <b>33</b> (the thermal camera) and <b>10</b> (the GPS).",
      why: "Each sensor answers at its own address on the I2C bus. The GPS needs to be outdoors with a clear view of the sky to get a position, but it answers at 10 indoors too.",
      simple: "i2cdetect: 33 and 10 must both show.",
      more: "When the Pi is running, check: the i2cdetect table against a screenshot from the real Pi." },
    { t0: 36, text: "<b>Before you go on:</b> both sensors show up in the i2cdetect table (33 and 10); the header pins are <b>straight</b>, none bent backwards; every wire of the GPS cable still ends in <b>its own colour</b>. Step 6 is done when both sensors answer.",
      why: "These three checks catch the usual mistakes before the payload goes on the drone.",
      simple: "33 and 10 show, pins straight, colours right. Step 6 done." },
    { t0: 43, text: "Later, on the drone: the <b>round glass window</b> of the thermal camera faces the <b>ground</b>; the <b>flat square</b> of the GPS faces the <b>sky</b>. You do not need to do that yet.",
      why: "The camera looks down at the ground; the GPS needs to see the sky.",
      simple: "Later: camera glass down, GPS square up." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-06-payload.glb", { at: V(0, 0.5, 6), hide: /^(arrow_|pigtail_|LBL_)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    const lap = makeLaptop(E, root, V(-2, 0, -20), 0);
    const supply = m.n("pi_bench_supply"), supplyHome = m.home("pi_bench_supply").p.clone();
    const pinAt = (s, i) => m.at(`${s}_pin_${i}`);
    const thermal = m.at("thermal_pcb"), gps = m.at("gps_pcb");
    const near = [V(-2, 15, 21), V(0, 1, 6.5)];   // the bench from close by (steps 6 and 7)
    // picture check 11 Nov, rows 21 and 22: a real close-up of each board, from the front and a little above, so the lens
    // (or the antenna) is seen on top; one row of five pin labels, 7.5 mm apart, each on a thin leader up from its pin
    const closeUp = s => [pinAt(s, 3).add(V(0, 1.55, 3.2)), pinAt(s, 3).add(V(0, 0.2, 0))];
    const thCam = closeUp("thermal"), gpsCam = closeUp("gps");
    const fanAt = (s, i) => pinAt(s, 3).add(V((i - 2) * 0.75, 1.15, 0));
    // step 2: which wire goes on which pin (the page: black GND, red 3.3 V, blue SDA, yellow SCL; the 4th pin stays empty).
    // The wires enter their end pieces from behind, so the picture alone cannot show it.
    const ENDS = ["red 3.3 V", "blue SDA", "yellow SCL", "empty", "black GND"];
    const leaders = s => [0, 1, 2, 3, 4].map(i => { const l = E.staticTube(root, 0x44566a, 0.012, [pinAt(s, i + 1).add(V(0, 0.42, 0)), fanAt(s, i).add(V(0, -0.04, 0))], 2); l.castShadow = false; l.visible = false; return l; });
    const thLead = leaders("thermal"), gpsLead = leaders("gps");
    const pi = m.at("pi_pcb"), piCam = [pi.clone().add(V(-3, 9, 10)), pi.clone().add(V(0.6, 0.3, 0.6))];
    const hatCam = [V(-4, 10, 12), V(0, 1.5, 2)];
    const scr = lap.screenAt(0, 0);
    const screen = [scr.clone().add(V(0, 4, 28)), scr];
    const table = () => {
      const rows = ["     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f"];
      for (let r = 0; r < 8; r++) {
        let line = r + "0:";
        for (let c = 0; c < 16; c++) {
          const a = r * 16 + c;
          line += " " + (a < 3 || a > 0x77 ? "  " : a === 0x10 ? "10" : a === 0x33 ? "33" : "--");
        }
        rows.push(line);
      }
      return rows;
    };
    let st = {};
    return {
      cams: [[0, ...thCam], [7.4, ...thCam], [8.4, ...thCam], [11.4, ...thCam], [12.4, ...gpsCam], [14.4, ...gpsCam], [15.4, ...hatCam], [22.4, ...hatCam], [23.4, ...piCam], [27.4, ...piCam], [28.4, ...screen], [37.4, ...screen], [38.4, ...near], [50, ...near]],
      tags: [
        ...PINS.map((p, i) => ({ text: p, cls: i === 3 ? "warn" : "blue", at: () => fanAt("thermal", i), from: 0.6, to: 8 })),
        ...ENDS.map((p, i) => ({ text: p, cls: i === 3 ? "warn" : "blue", at: () => fanAt("thermal", i), from: 8.2, to: 10.8 })),
        { text: "Which side the pins stick out: check yours", cls: "warn", at: () => fanAt("thermal", 2), from: 11, to: 12 },
        ...ENDS.map((p, i) => ({ text: p, cls: i === 3 ? "warn" : "blue", at: () => fanAt("gps", i), from: 13.2, to: 15 })),
        { text: "HAT letters: ignore (SDA/SCL swapped)", cls: "red", at: () => m.at("hat_pcb").add(V(0, 1.8, 0)), from: 16, to: 18.4 },
        { text: "Which HAT socket: check yours", cls: "warn", at: () => m.at("hat_pcb").add(V(0, 1.8, 0)), from: 18.6, to: 20.6 },
        { text: "Black GND, red 3.3 V, blue SDA, yellow SCL", cls: "good", at: () => m.at("cab17261_gps_wire_blue_ext").add(V(0, 1.6, 0)), from: 20.8, to: 23 },
        { text: "PWR IN: read the print on the board", cls: "warn", at: () => m.at("pi_usb_power").add(V(0, 1.2, 0)), from: 24.2, to: 28 },
        { text: "33 = thermal camera, 10 = GPS", cls: "good", at: () => lap.screenAt(6, -6.5), from: 31, to: 36 },
        { text: "33 and 10 show", cls: "good", at: () => lap.screenAt(6, -6.5), from: 36.4, to: 38.2 },
        { text: "Pins straight", cls: "blue", at: () => thermal.clone().add(V(0, 1.6, 0)), from: 39.2, to: 41 },
        { text: "Each wire ends in its own colour", cls: "blue", at: () => m.at("cab17261_gps_wire_yellow_ext").add(V(0, 1.6, 0)), from: 41.2, to: 43 },
        { text: "Later: glass window down", cls: "blue", at: () => m.at("arrow_lens_down_shaft").add(V(0, 1.4, 0)), from: 43.6, to: 50 },
        { text: "Later: flat square up", cls: "blue", at: () => m.at("arrow_antenna_up_head").add(V(0, 1, 0)), from: 43.6, to: 50 },
      ],
      update(t) {
        // the cable ends go onto the pins: thermal first, then the GPS; INT (pin 4) has no end
        const kt = prog(t, 9, 10.4), kg = prog(t, 13.2, 14.4);
        // each cable waits with its ends 3 mm below and 4 mm in front of the pins, then pushes on from below
        // (the ends used to start on top of the board and sink through it)
        m.shift(/^cab17261_thermal_(socket|wire)/, V(0, -0.003 * (1 - kt), 0.004 * (1 - kt)));
        m.shift(/^cab17261_gps_(socket|wire)|^gps_cable_joint_bench/, V(0, -0.003 * (1 - kg), 0.004 * (1 - kg)));
        thLead.forEach(l => { l.visible = t >= 0.6 && t < 10.8; }); gpsLead.forEach(l => { l.visible = t >= 13.2 && t < 15; });
        // the supply goes into PWR IN
        supply.visible = t >= 24;
        supply.position.copy(supplyHome).add(V(0.03 * (1 - prog(t, 24.2, 25.6)), 0, 0));
        show(/^arrow_/, t >= 43.4);
        if (t < 28.4) lap.draw("blank", c => terminal(c, ["username@raspberrypi:~ $"]));
        else if (t < 30.5) lap.draw("cmd", c => terminal(c, ["$ sudo i2cdetect -y 1"]));
        else lap.draw("table", c => terminal(c, ["$ sudo i2cdetect -y 1", ...table()]));
        st = { thermalOn: kt >= 1, gpsOn: kg >= 1, powered: t >= 25.2, table: lap.shown() === "table", arrows: t >= 43.4 };
      },
      state() { return st; },
    };
  },
};
