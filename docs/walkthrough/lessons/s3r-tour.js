// Stage 3 (part 1): meet the RadioMaster Pocket. Button names and places from the Pocket manual's drawing (p.2);
// the throttle warning's words from Shad's own radio (photo, 7 Nov). The "USB power alone" test is skipped
// (audit 7 Nov: the radio does not work on USB alone; it needs its cells).
import { makePocket } from "./s3r-radio.js";
export default {
  T: 54,
  steps: [
    { t0: 0,  text: "<b>The big picture.</b> This radio is your drone's controller, like a game controller with two sticks. Today: <b>1)</b> meet the radio, <b>2)</b> learn what each stick does, <b>3)</b> plug it into the laptop and fly the simulator, <b>4)</b> then set it up for your real drone.",
      why: "The simulator is a safe place to learn the sticks: crashing costs nothing.",
      simple: "The radio = the controller. First we learn it, then we fly a pretend drone on the laptop.",
      more: "Stage 3 is all about your hands. In Step 8 your first real hover uses the same sticks and switches you learn here, so every minute in the simulator makes that first flight calmer." },
    { t0: 6,  text: "<b>Two 18650 batteries</b> go in first (they sit under the back grips). The radio does <b>not</b> work on the USB cord alone. Then charge them with the radio's own USB-C cord.",
      why: "The batteries power the radio. The USB cord only charges them or talks to the laptop.",
      simple: "Batteries in first, or nothing works. Then charge them with the radio's own cord.",
      more: "The radio takes two 3.7 V lithium-ion 18650 batteries. Its built-in charger is only for that kind: never 3.6 V LiFe ones." },
    { t0: 12, text: "To switch on: press and hold the <b>power button</b> (the oval one in the middle, under the screen) until the radio buzzes and the screen lights up.",
      why: "Holding it, not tapping, stops the radio turning on or off by accident in your bag.",
      simple: "Hold the middle button until it buzzes." },
    { t0: 18, text: "<b>THROTTLE WARNING, Throttle not idle</b>: push the <b>left stick all the way down</b>. It stays down: that's right, it's the throttle (the power). Your screen looks like this:", photo: "photos/throttle-warning.jpg",
      why: "Safety: the radio won't start with the power stick up, so a drone can't take off by surprise.",
      simple: "The warning means 'power stick not at zero'. Push the left stick down.",
      more: "Any time the radio starts with the throttle up, it stops and warns you. Real drones can spin up the moment they get a signal, so this check is there to protect your fingers." },
    { t0: 25, text: "The buttons: round <b>SYS</b> (left) and round <b>MDL</b> (right) beside the power button. Under the left stick, four small ovals, top to bottom: <b>RTN, PAGE>, PAGE<, TELE</b>. Today you use <b>MDL, PAGE>, PAGE<</b> and <b>RTN</b>.",
      why: "MDL opens your drone's settings. PAGE> and PAGE< flip between screens, like turning pages. RTN goes back.",
      simple: "MDL = drone settings. PAGE> / PAGE< = next / previous screen. RTN = back." },
    { t0: 32, text: "On every menu screen, a <b>dark bar</b> shows where you are. <b>Roll</b> the <b>Menu Wheel</b> (the tall roller under the right stick) to move the bar up or down.",
      why: "The dark bar is like the cursor on a computer: whatever it's on is what you'll change.",
      simple: "Roll the wheel = move the dark bar.",
      more: "Every EdgeTX radio (the radio's software) works this way, so once you learn roll + push, every menu on this radio makes sense." },
    { t0: 35.5, text: "<b>Push</b> the wheel in to open or change what the dark bar is on: pushing it is called <b>Enter</b>. <b>RTN</b> takes you back one step.",
      why: "Roll to choose, push to do it: every menu on this radio works this way.",
      simple: "Push the wheel = yes / open. RTN = back." },
    { t0: 39, text: "Two USB-C ports: the <b>bottom</b> one is for <b>charging</b>. The <b>top</b> one, beside the antenna, is the <b>USB Port</b> for the laptop.",
      why: "RadioMaster labels them that way, and reviewers say the top one is the one that talks to a computer or simulator.",
      simple: "Bottom = charge. Top = laptop." },
    { t0: 46, text: "<b>Lost?</b> Press <b>RTN</b> again and again until you see the <b>main screen</b>: the big model name and the battery number (like 7.7V). If a screen doesn't change (for example <b>CHANNELS MONITOR</b>), press <b>PAGE<</b> once. Want to try all of this without the real radio? <a href=\"practice-radio.html\" target=\"_blank\">Practise on a pretend radio ▸</a>", photo: "photos/main-screen.jpg",
      why: "You can't break anything by pressing RTN. Every lesson starts from this main screen.",
      simple: "RTN, RTN, RTN until you see the big name. That's home.",
      more: "On the main screen, PAGE> and PAGE< flip between five home screens. The last one is CHANNELS MONITOR, which shows every channel live. You'll use it later to check your switches." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const p = makePocket(E, root, V(0, 6.2, 0));
    p.group.updateMatrixWorld(true);
    // 11 Nov (pictures, row 7): the power button's green light is on only once the radio is switched on (14 s); before, it
    // glowed from the first picture, with the screen still blank. Found here, so the shared radio drawing stays as it is.
    const glowRing = p.group.children.find(o => o.isMesh && o.geometry && o.geometry.type === "TorusGeometry" && o.material && o.material.isMeshBasicMaterial);
    const powerBtn = p.group.children.find(o => o.isMesh && o.material && o.material.emissive && o.material.emissive.getHex() === 0x22dd55);
    // 11 Nov (pictures, row 10): steps 6 and 7 show a real menu (Model Select, as on his radio) with the dark bar, from a view that has the screen in it
    const LIST = [["01", "POCKET"], ["02", "FPV DRONE"], ["03", "DELTA"], ["04", "HELI"], ["05", ""], ["06", ""], ["07", ""], ["08", ""]];
    const OPTS = ["Select model", "Backup model", "Copy model", "Move model", "Delete model"];
    const scr = p.at("screen"), front = [V(0, 13, 30), V(0, 6, 0)], back = [V(-6, 16, -26), V(0, 6, 0)];
    const close = [scr.clone().add(V(0, 4, 11)), scr], btn = [V(-1, 11, 16), p.world(-0.5, -2.2)], top = [V(4, 22, 12), p.at("usbTop")], bottom = [V(3, 4, 16), p.at("usbBottom")];
    const menu = [scr.clone().add(V(1.5, 3.5, 15)), p.world(1.2, 0.2)];
    let st = {};
    return {
      cams: [[0, ...front], [5.4, ...front], [6.6, ...back], [11.4, ...back], [12.6, ...front], [17.4, ...front], [18.6, ...close], [24.4, ...close], [25.6, ...btn], [31.4, ...btn], [32.4, ...menu], [38.4, ...menu], [39.6, ...top], [42.6, ...top], [43.6, ...bottom], [45.6, ...bottom], [46.6, ...menu], [54, ...menu]],   // (row 34): the last step uses the view with the whole screen in it; the buttons view cut the main screen's name off on a desktop
      tags: [
        { text: "Screen", cls: "blue", at: () => p.at("screen").add(V(0, 1.4, 0)), from: 1, to: 6 },
        { text: "Left stick = throttle", cls: "blue", at: () => p.at("stickL"), from: 2, to: 6 },
        { text: "2 x 18650 cells", cls: "blue", at: () => p.at("back").add(V(-2, 3, -2)), from: 7, to: 12 },
        { text: "Power: hold", cls: "good", at: () => p.at("power"), from: 12.6, to: 18 },
        { text: "Left stick all the way down", cls: "warn", at: () => p.at("stickL"), from: 19, to: 25 },
        { text: "SYS", cls: "blue", at: () => p.at("SYS"), from: 25.6, to: 32 },
        { text: "MDL", cls: "blue", at: () => p.at("MDL"), from: 25.6, to: 32 },
        { text: "RTN · PAGE> · PAGE< · TELE", cls: "blue", at: () => p.at("RTN").add(V(-1.5, 0.6, 0)), from: 26.4, to: 32 },
        { text: "Menu Wheel: roll + push (Enter)", cls: "blue", at: () => p.at("wheel"), from: 32.4, to: 39 },
        { text: "Dark bar = where you are", cls: "good", at: () => p.at("screen").add(V(0, 1.4, 0)), from: 33, to: 36.9 },
        { text: "RTN = back one step", cls: "good", at: () => p.at("RTN"), from: 37.8, to: 39 },
        { text: "USB Port (top)", cls: "blue", at: () => p.at("usbTop").add(V(0, 0.8, 0)), from: 39.6, to: 43 },
        { text: "Charge Port (bottom)", cls: "blue", at: () => p.at("usbBottom").add(V(0, -0.4, 1)), from: 43.6, to: 46 },
        { text: "RTN = back (get home)", cls: "good", at: () => p.at("RTN"), from: 46.6, to: 54 },
      ],
      update(t) {
        p.cells(prog(t, 7, 10.5));
        const on = t >= 14;
        p.press("power", t > 12.6 && t < 14.2 ? 1 : 0);
        if (glowRing) glowRing.visible = on; if (powerBtn && !on) powerBtn.material.emissiveIntensity = 0;
        // throttle: in the middle until he pushes it down
        const thr = 0.1 - 1.1 * prog(t, 20, 22);
        p.throttle(thr);
        if (!on) p.screen("", []);
        else if (t < 22.2) p.throttleWarning();
        // from step 6 the screen is on Model Select: the bar moves down as the wheel rolls (33-36 s); a push opens a small box
        // (37-38.3 s), RTN closes it; it stays on the list until the first RTN of the last step (47.3 s)
        else if (t >= 32 && t < 47.3) { const row = Math.min(3, Math.floor(prog(t, 33, 36) * 3.999)); p.modelList(LIST, row, 0); if (t >= 37 && t < 38.3) p.popup(OPTS, 0); }
        else p.home("POCKET");
        for (const b of ["SYS", "MDL"]) p.press(b, t > 26 && t < 32 ? 0.5 + 0.5 * Math.sin(t * 6) : 0);
        ["RTN", "PAGE>", "PAGE<", "TELE"].forEach((b, i) => p.press(b, t > 27 + i && t < 28 + i ? 1 : 0));
        p.roll(t > 33 && t < 36 ? (t - 33) * 0.25 : 0);
        p.press("wheel", t > 36.5 && t < 37.3 ? 1 : 0);
        if (t > 37) p.press("RTN", [38, 47, 48.2, 49.4].some(a => t > a && t < a + 0.6) ? 1 : 0);
        st = { cellsIn: prog(t, 7, 10.5) >= 1, throttle: thr, screen: p.shown() };
      },
      state() { return st; },
    };
  },
};
