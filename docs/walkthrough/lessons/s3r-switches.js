// Stage 3: the arm switch (CH5 = SA), the Angle switch (CH6 = SD), checking which way is "disarmed", the 3-minute timer.
// Guide order: Mixes first, then Timer (settled 7 Nov). Radio facts: the owner's own notes on his Pocket (not in this repo).
// - new models have only the sticks on CH1-CH4; CH5 is empty (ELRS tx-prep; EdgeTX source)
// - Enter on an EMPTY mix line opens a new mix; Enter on a line that already has a mix starts copy/move (RTN cancels)
// - Source: push, flick the switch, push again (ELRS tx-prep); OBSERVED on Shad's radio: Source shows SA
// - SA (top-left) and SD (top-right) are 2-position; ELRS: AUX1 (CH5) must be the arm switch, LOW = disarmed
// - which way SA must point for LOW is NOT STATED: check it on CHANNELS MONITOR (PAGE> from the main screen)
// - Setup to Mixes is 2-4 PAGE> presses depending on hidden pages: "press PAGE> until the title says MIXES"
// - Timer: Start 3:00 then Remain counts down; THs = throttle up AND switch on, stops if either goes back
import { makePocket } from "./s3r-radio.js";
export default {
  T: 70,
  steps: [
    { t0: 0,  text: "Why this lesson: a new model only sends the <b>sticks</b>, on <b>channels</b> 1 to 4. A switch sends nothing until you give it a channel. That's what the <b>Mixes</b> page does.",
      why: "A <b>channel</b> is one numbered lane of information from the radio to the drone. Lanes 1-4 are the sticks; lane 5 and up are free for switches.",
      simple: "Channels are lanes. The sticks already have lanes 1-4. Your switches need lanes too.",
      more: "The radio sends the drone a list of numbers many times a second: one number per channel. Sticks fill channels 1-4. A mix tells the radio which control fills which channel." },
    { t0: 3,  text: "From the main screen, <b>short-press MDL</b> (the model list), then press <b>PAGE></b> again and again. Each press shows the next page, with its name at the top. Stop at <b>MIXES</b> (3 to 5 presses). Went past it? <b>PAGE<</b> goes back.",
      why: "Mixes lives inside your model's settings, so you open them with MDL first. PAGE> on the main screen shows other screens, such as CHANNELS MONITOR.",
      simple: "MDL, then PAGE> until the top says MIXES." },
    { t0: 9,  text: "Roll the dark bar down to the <b>CH5</b> line (empty) and <b>push</b> the wheel. The CH5 mix screen opens. (Pushed a line that already has something, like CH1? Press <b>RTN</b> and try again.)",
      why: "CH5 is the lane for the arm switch. The radio-to-drone link (ExpressLRS) sends lane 5 in every message: the most reliable way to get 'motors off' through.",
      simple: "Dark bar on CH5, push.",
      more: "ExpressLRS (the radio link) sends channel 5 with every single packet, but other switch channels only now and then. That's why it insists the arm switch is on channel 5: 'motors off' must always get through, even when the signal is weak." },
    { t0: 14, text: "Leave <b>Mix name</b> empty (it's only a label). Roll down one to <b>Source</b>, <b>push</b>, <b>flick SA</b> (the switch on the top-left corner), then <b>push again</b>. Source now says <b>SA</b>:", photo: "photos/ch5-mix-sa.jpg",
      why: "<b>Source</b> = what drives this channel. SA is a 2-position switch that stays where you put it, which is what an <b>arm switch</b> (motors on/off) needs.",
      simple: "Source line, push, flick SA, push. It says SA. Done." },
    { t0: 24, text: "Press <b>RTN</b> (once or twice) until you're back at the MIXES list. The CH5 line now shows SA.",
      why: "RTN leaves the mix screen. There's no Save button: the radio saves by itself.",
      simple: "RTN back to the list." },
    { t0: 28, text: "Do the same on <b>CH6</b> with <b>SD</b>, the switch on the <b>top-right corner</b>: dark bar on CH6, push, Source, push, flick SD, push, RTN. SD will switch <b>Angle mode</b> (self-levelling).",
      why: "SD is the other 2-position switch, so your hands learn: left corner = motors, right corner = levelling.",
      simple: "Same as before: CH6 gets SD." },
    { t0: 37, text: "Now find out which way is <b>off</b>. Press <b>RTN</b> until the main screen, then <b>PAGE></b> once: <b>CHANNELS MONITOR</b>. Flick SA: the CH5 number jumps between <b>-100</b> and <b>100</b>.", photo: "photos/channels-monitor.jpg",
      why: "-100 is LOW, and the drone's radio link treats LOW as <b>disarmed</b> (motors off). The manuals don't say whether that's SA up or SA down, so you check it here.",
      simple: "Flick SA and watch CH5: -100 means motors off.",
      more: "-100 and 100 are the two ends of a channel's range. In the drone's terms they're about 1000 and 2000. ExpressLRS treats LOW (1000, shown as -100) as disarmed." },
    { t0: 43, text: "Leave SA where CH5 shows <b>-100</b>, and remember that position: that's <b>disarmed</b>. Keep SA there whenever you're not flying. Then press <b>PAGE<</b> once to go back to the main screen.",
      why: "Your hand needs to know where 'motors off' is without looking.",
      simple: "-100 = off. Remember which way that is." },
    { t0: 47, text: "Timer: <b>MDL</b>, then <b>PAGE></b> once to <b>SETUP</b>. Roll down to <b>Timer 1</b>. Set its <b>Mode</b> first: <b>THs</b>. Then its <b>Switch: SA in the armed position</b> (the opposite of the -100 way).",
      why: "The timer's other lines show only once Mode is no longer OFF, so Mode comes first. THs counts only while you're armed AND the throttle is up.",
      simple: "Timer 1: Mode THs first, then switch SA.",
      more: "THs stops counting if either goes back: the switch or the throttle. So the countdown only uses up time while the motors are actually working." },
    { t0: 56, text: "Then set Timer 1's <b>Start</b>: push, roll to <b>3:00</b>, push. A new choice appears next to it: set it to <b>Remain</b>, so it counts down. If your screen looks different, tell the guide chat.",
      why: "A countdown tells you when it's time to land, before the drone's battery runs low. (3 minutes is the guide's choice for your first flights.)",
      simple: "Then Start: 3:00, then Remain. It counts down while flying.",
      more: "3 minutes is the guide's starting time for your first flights. You can change it later." },
    { t0: 64, text: "Done with the radio settings. In <b>Step 4</b> you'll tell the drone's flight controller (Betaflight) that SA on CH5 means arm.",
      why: "The radio sends the switch; the drone still has to be told what that switch means.",
      simple: "The radio part is done. The drone part comes in Step 4." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const p = makePocket(E, root, V(0, 6.2, 0));
    p.group.updateMatrixWorld(true);
    const scr = p.at("screen");
    // 11 Nov (pictures, row 21): the whole-radio view stands a quarter closer, so the screen's words are bigger
    const wide = [scr.clone().add(V(0, 5, 14.5)), p.world(0, 0.4)], close = [scr.clone().add(V(0, 3.5, 10)), scr];
    const sa = [p.at("SA").add(V(-3, 6, 10)), p.at("SA").add(V(2, -2, 0))], sd = [p.at("SD").add(V(3, 6, 10)), p.at("SD").add(V(-2, -2, 0))];
    let st = {};
    const mixes = (c5, c6) => ["CH1  stick", "CH2  stick", "CH3  stick", "CH4  stick", "CH5 " + c5, "CH6 " + c6];
    const win = (lines, hi) => { const s0 = Math.max(0, Math.min(lines.length - 4, hi - 2)); return [lines.slice(s0, s0 + 4), hi - s0]; };
    const press = (name, list) => p.press(name, list.some(a => (t => t > a && t < a + 0.5)(cur)) ? 1 : 0);
    let cur = 0;
    return {
      cams: [[0, ...wide], [14.4, ...wide], [15.4, ...sa], [23.4, ...sa], [24.4, ...wide], [30.4, ...wide], [31.4, ...sd], [35.4, ...sd], [36.4, ...close], [64, ...close], [65, ...wide], [70, ...wide]],
      tags: [
        { text: "CH1-CH4 = sticks", cls: "blue", at: () => p.at("stickL"), from: 0.6, to: 3 },
        { text: "1. MDL", cls: "blue", at: () => p.at("MDL"), from: 3.4, to: 5 },   // 11 Nov (pictures, row 39): one label on each button, in turn
        { text: "2. PAGE> until the top says MIXES", cls: "blue", at: () => p.at("PAGE>"), from: 5, to: 9 },
        { text: "Push = open CH5", cls: "blue", at: () => p.at("wheel"), from: 10, to: 14 },
        { text: "SA = arm switch", cls: "warn", at: () => p.at("SA"), from: 16, to: 24 },
        { text: "RTN", cls: "blue", at: () => p.at("RTN"), from: 24.4, to: 28 },
        { text: "SD = Angle mode", cls: "blue", at: () => p.at("SD"), from: 31.4, to: 37 },
        { text: "-100 = disarmed (motors off)", cls: "red", at: () => p.at("screen").add(V(0, 1.6, 0)), from: 39, to: 45 },
        { text: "THs: armed AND throttle up", cls: "good", at: () => p.at("screen").add(V(0, 1.6, 0)), from: 50, to: 56 },
        { text: "3:00 + Remain = countdown", cls: "good", at: () => p.at("screen").add(V(0, 1.6, 0)), from: 57, to: 64 },
      ],
      update(t) {
        cur = t;
        p.throttle(-1);
        press("MDL", [3.6, 47.4]);
        press("PAGE>", [5.0, 6.0, 7.0, 38.6, 48.6]);
        press("PAGE<", [45.0]);
        press("RTN", [24.6, 35.4, 37.4, 37.9]);
        press("wheel", [10.8, 16.4, 20.6, 29.0, 30.4, 33.6, 50.6, 52.6, 53.8, 58.4, 60.4]);
        p.roll(prog(t, 9.2, 10.4) * 0.2 + prog(t, 15.2, 15.8) * 0.04 + prog(t, 28.2, 28.8) * 0.04 + prog(t, 29.4, 29.9) * 0.04 + prog(t, 49.4, 50.4) * 0.06 + prog(t, 51.2, 52.4) * 0.1 + prog(t, 57.2, 58.2) * 0.05);
        // SA: starts in the disarmed position (-1), flicked at 18 (set Source), then flicked twice on the monitor, ends at -1
        const saPos = t < 18 ? -1 : t < 19 ? 1 : t < 40.5 ? -1 : t < 42 ? 1 : -1;
        p.flick("SA", saPos);
        p.flick("SD", t > 32 && t < 33 ? -1 : 1);
        p.flick("SB", 1); p.flick("SC", 1);
        const ch5val = saPos < 0 ? -100 : 100;
        let timer = "", c5 = t < 20.6 ? "" : "SA", c6 = t < 33.6 ? "" : "SD";
        if (t < 3.6) p.home("FIREWATCH");
        else if (t < 5.0) p.modelList([["01", "POCKET"], ["02", "FPV DRONE"], ["03", "DELTA"], ["04", "HELI"], ["05", ""], ["06", "FIREWATCH"], ["07", ""], ["08", ""]], 5, 5);
        else if (t < 6.0) p.screen("SETUP", ["Name  FIREWATCH", "Timer 1  00:00", "Timer 2  00:00"], 0);
        else if (t < 7.0) p.screen("INPUTS", ["(not this page:", " keep pressing", " PAGE>)"], -1);
        else if (t < 10.8) { const [l, h] = win(mixes("", ""), t < 9.2 ? 0 : 4); p.screen("MIXES", l, t < 9.2 ? 0 : h); }
        else if (t < 24.6) {
          const hi = t < 15.2 ? 0 : 1;
          p.screen("MIXES CH5", ["Mix name  ---", "Source    " + (t < 18 ? "---" : "SA"), "Weight    100", "Offset    0"], hi);
        }
        else if (t < 29.0) { const [l, h] = win(mixes("SA", ""), t < 28.4 ? 4 : 5); p.screen("MIXES", l, h); }
        else if (t < 35.4) p.screen("MIXES CH6", ["Mix name  ---", "Source    " + (t < 32 ? "---" : "SD"), "Weight    100", "Offset    0"], t < 29.6 ? 0 : 1);
        else if (t < 37.4) { const [l, h] = win(mixes("SA", "SD"), 5); p.screen("MIXES", l, h); }
        else if (t < 38.6) p.home("FIREWATCH");
        else if (t < 45.0) p.screen("CHANNELS MONITOR", ["CH1  ...", "CH2  ...", "CH3  ...", "CH4  ...", "CH5  " + ch5val], 4);
        else if (t < 47.4) p.home("FIREWATCH");
        else if (t < 48.6) p.modelList([["01", "POCKET"], ["02", "FPV DRONE"], ["03", "DELTA"], ["04", "HELI"], ["05", ""], ["06", "FIREWATCH"], ["07", ""], ["08", ""]], 5, 5);
        else {
          // 11 Nov audit (S23): Mode and Switch first; EdgeTX shows the timer's other lines only once Mode is no longer OFF
          // (manual.edgetx.org/bw-radios/model-select/setup). Then Start, and Remain appears beside it.
          const mode = t < 52.6 ? "OFF" : "THs", sw = t < 53.8 ? "---" : "SA", start = t < 58.4 ? "00:00" : "03:00", rem = t < 60.4 ? "" : " Remain";
          timer = `${start}${rem} ${mode} ${sw}`;
          const rows = ["Name  FIREWATCH", "Timer 1 " + mode].concat(mode === "OFF" ? [] : ["  Switch " + sw, "  Start " + start + rem]);
          p.screen("SETUP", rows, t < 50.4 ? 0 : t < 53.2 ? 1 : t < 56 ? 2 : 3);
        }
        st = { screen: p.shown(), ch5: c5, ch6: c6, ch5val, armSwitchDown: saPos < 0, timer };
      },
      state() { return st; },
    };
  },
};
