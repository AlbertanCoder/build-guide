// Stage 3: make the drone's model, tidy up extras, name it FIREWATCH (Shad's choice, 7 Nov).
// Sources (see ~/bench-clips/radio-facts/POCKET-FACTS.md): short MDL = Model Select; Enter on an empty slot =
// Create Model / Restore Model; on a model that is not in use: Select / Backup / Copy / Move / Delete Model; the star
// marks the model in use; new models are named MODEL + slot number; PAGE> from Model Select = Setup; Name: max 10,
// push to edit, roll for the letter, push for the next, long push = capital/small, RTN ends typing; changes save on
// their own a few seconds later (EdgeTX source, not tested). Screens follow Shad's photos (MODEL SEL, 1/12, the star).
import { makePocket } from "./s3r-radio.js";
const NAME = "FIREWATCH";
export default {
  T: 62,
  steps: [
    { t0: 0,  text: "On the main screen, <b>short-press MDL</b> (round button, right of the power button). <b>Model Select</b> opens: a list of numbered <b>slots</b>, one <b>model</b> in each. The <b>star (*)</b> marks the model in use.", photo: "photos/model-select.jpg",
      why: "A <b>model</b> is a saved set of settings for one aircraft. Your drone gets its own, so its switches and timer stay put.",
      simple: "MDL opens the list of saved drones. The star = the one the radio is using.",
      more: "Pilots with several aircraft keep one model per aircraft, so a plane's settings never end up on a drone. You only need one." },
    { t0: 6,  text: "<b>Roll</b> the wheel down, past the models already there (a new Pocket comes with FPV DRONE, DELTA and HELI), to the <b>first empty slot</b>: just a number, no name.",
      why: "The models that came with the radio are examples. Yours goes in a free slot so nothing gets overwritten.",
      simple: "Roll down to a number with no name next to it." },
    { t0: 11, text: "<b>Push</b> the wheel. A small box opens with the dark bar on <b>Create Model</b>: push again. The slot gets a name like <b>MODEL05</b>, and the star moves to it: your new model is the one in use.",
      why: "Create Model makes a fresh model with the sticks already set up on channels 1 to 4.",
      simple: "Push, push. Now you have your own model." },
    { t0: 18, text: "Made two by accident (on your radio: MODEL05 and MODEL06)? <b>Keep the one with the star</b>. Roll to the other one, push the wheel, roll to <b>Delete Model</b> and push. If it asks you to confirm, push again.",
      why: "One drone, one model: a spare one is easy to pick by mistake later.",
      simple: "Keep the starred one. Delete the other." },
    { t0: 26, text: "Press <b>PAGE></b> (second oval under the left stick). The title changes to <b>SETUP</b>: the settings of the model with the star.",
      why: "PAGE> turns to the next page of the model's settings. Setup is the first one.",
      simple: "PAGE> once. You should see SETUP at the top." },
    { t0: 31, text: "The dark bar is on <b>Name</b> (if not, roll up to it). <b>Push</b> the wheel: now you're changing the name.",
      why: "The name is what the main screen shows, so you can tell at a glance it's the drone's model.",
      simple: "Dark bar on Name, push." },
    { t0: 36, text: "Type <b>FIREWATCH</b>: <b>roll</b> to pick a letter, <b>push</b> for the next one. A <b>long push</b> switches capital / small. Up to <b>10</b> letters. Wrong letter? Keep rolling; push only when the right one shows.",
      why: "FIREWATCH fits the 10-letter limit and says what your drone is for.",
      simple: "Roll = letter. Push = next letter.",
      more: "The name only shows on your radio's screen, nowhere else, so it's just to help you see at a glance that the right model is loaded." },
    { t0: 50, text: "Press <b>RTN</b> to finish typing. Wait about <b>5 seconds</b> before switching the radio off: it saves by itself, there's no Save button.",
      why: "The radio writes your changes a few seconds after the last one.",
      simple: "RTN, then wait 5 seconds. It saves itself." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const p = makePocket(E, root, V(0, 6.2, 0));
    p.group.updateMatrixWorld(true);
    const scr = p.at("screen");
    const wide = [scr.clone().add(V(0, 5, 17)), p.world(0, 0.4)], close = [scr.clone().add(V(0, 3.5, 10)), scr], mid = [scr.clone().add(V(1.5, 2.5, 12)), p.world(1.5, -0.6)];
    let st = {};
    // the list on Shad's Pocket (photo 7 Nov: 02 FPV DRONE, 03 DELTA, 04 HELI; 01 was POCKET, the name on his main screen)
    const base = [["01", "POCKET"], ["02", "FPV DRONE"], ["03", "DELTA"], ["04", "HELI"], ["05", ""], ["06", ""], ["07", ""], ["08", ""]];
    const made = base.map((r, i) => i === 4 ? ["05", "MODEL05"] : r);
    const two = made.map((r, i) => i === 5 ? ["06", "MODEL06"] : r);
    const tidy = two.map((r, i) => i === 4 ? ["05", ""] : r);
    const OPTS = ["Select model", "Backup model", "Copy model", "Move model", "Delete model"];
    return {
      // 11 Nov (pictures, row 23): the middle view stays until PAGE> has been pressed (27-27.8 s); the close view cut that button off on a desktop
      // (row 38): the last step goes back to the middle view, so the RTN button it asks for is in the picture (the close view cut it in half)
      cams: [[0, ...wide], [2.2, ...wide], [3.2, ...mid], [27.6, ...mid], [28.6, ...close], [49.6, ...close], [50.4, ...mid], [62, ...mid]],
      tags: [
        { text: "MDL: short press", cls: "blue", at: () => p.at("MDL"), from: 0.6, to: 6 },
        { text: "Roll", cls: "blue", at: () => p.at("wheel"), from: 6.4, to: 11 },
        { text: "Push = Enter", cls: "blue", at: () => p.at("wheel"), from: 11.4, to: 18 },
        { text: "Keep the star, delete the other", cls: "warn", at: () => p.world(4.6, 3.6), from: 18.4, to: 26 },   // 11 Nov (pictures, row 24): beside the screen; above it, it was outside the desktop picture
        { text: "PAGE>", cls: "blue", at: () => p.at("PAGE>"), from: 26.4, to: 31 },
        { text: "Up to 10 letters", cls: "good", at: () => p.at("screen").add(V(0, 1.6, 0)), from: 37, to: 50 },
        { text: "RTN", cls: "blue", at: () => p.at("RTN"), from: 50.4, to: 62 },
      ],
      update(t) {
        p.throttle(-1);
        p.press("MDL", t > 1.2 && t < 2.2 ? 1 : 0);
        p.press("PAGE>", t > 27 && t < 27.8 ? 1 : 0);
        p.press("RTN", t > 51 && t < 51.8 ? 1 : 0);
        const pushes = [[12, 12.8], [15, 15.8], [20.5, 21.2], [23.6, 24.3], [32, 32.8]];
        for (let i = 0; i < NAME.length; i++) pushes.push([37.6 + i * 1.4, 38.1 + i * 1.4]);
        p.press("wheel", pushes.some(([a, b]) => t > a && t < b) ? 1 : 0);
        p.roll(prog(t, 6.6, 9.4) * 0.3 + prog(t, 19, 20) * 0.06 + prog(t, 21.6, 23.2) * 0.2 + (t > 37 && t < 50 ? (t - 37) * 0.12 : 0));
        let typed = "";
        if (t < 2.2) p.home("POCKET");
        else if (t < 6.4) p.modelList(base, 0, 0);
        else if (t < 12.8) p.modelList(base, Math.min(4, Math.floor(prog(t, 6.6, 9.4) * 4.999)), 0);
        else if (t < 15.8) { p.modelList(base, 4, 0); p.popup(["Create Model", "Restore Model"], 0); }
        else if (t < 18) p.modelList(made, 4, 4);
        else if (t < 21.2) p.modelList(two, t < 19.5 ? 5 : 4, 5);
        else if (t < 24.3) { p.modelList(two, 4, 5); p.popup(OPTS, Math.min(4, Math.floor(prog(t, 21.6, 23.2) * 4.999))); }
        else if (t < 27.8) p.modelList(tidy, 4, 5);
        else {
          const n = t < 37.6 ? 0 : Math.min(NAME.length, Math.floor((t - 37.6) / 1.4) + 1);
          typed = NAME.slice(0, n);
          const editing = t >= 32.8 && t < 51.8;
          p.screen("SETUP", ["Name  " + (n ? typed + (editing ? "_" : "") : "MODEL06" + (editing ? "_" : "")), "Timer 1  00:00", "Timer 2  00:00"], 0);
        }
        st = { screen: p.shown(), typed, nameLen: typed.length };
      },
      state() { return st; },
    };
  },
};
