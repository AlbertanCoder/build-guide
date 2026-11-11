// Step 3 (part 1): the two boards, and the ESC on the stack screws with grommets, battery pads to the rear.
// Parts from docs/models/step-03-stack.glb (real sizes). The guide says to check which way the stack screws go
// and where the nuts go when the stack arrives; this clip shows the screws coming up from under the frame as drawn.
export default {
  T: 30,
  steps: [
    { t0: 0,  text: "The stack box has <b>two boards</b>. The <b>ESC</b> (runs the motors) has big copper pads on three edges. The <b>FC</b> (flight controller) is the one with the <b>USB socket</b>.", why: "The two boards look alike but do different jobs.", simple: "The board with big copper pads is the ESC. The board with the USB socket is the FC." },
    { t0: 8,  text: "The four long <b>M3 x 30 stack screws</b> go in the centre of the frame, with a <b>soft grommet</b> in each hole.", why: "The soft rubber rings soak up vibration that would confuse the flight controller.", simple: "Put the four long screws through the middle of the frame, with a soft rubber ring in each hole." },
    { t0: 15, text: "Fit the <b>ESC</b> on the four screws. Its <b>battery pads face the rear</b>: the tail, away from the camera.", why: "The battery lead comes in from the back, so the battery pads face the back.", simple: "Slide the ESC down onto the screws with its big battery pads toward the back." },
    { t0: 23, text: "Leave the FC to one side for now. When the stack arrives, check which way the screws go in and where the nuts go (arrival test \"Stack\").", why: "The guide's order: the FC's pad wires are soldered on the bench first, then it is mounted.", simple: "Keep the FC to one side for now." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-03-stack.glb", { at: V(0, 1.0, 0),
      // Picture fix, 11 Nov 2026: the model's screws carry their nuts; no nut is shown here, because the boards go on first
      hide: /^(battery_|meter_|smokestopper_|xt60_|wire_|solder_joint|stack_capacitor|stack_esc_fc_cable|stack_screw_\d_nut)/ });
    const screws = [0, 1, 2, 3].map(i => "stack_screw_" + i), grommets = [0, 1, 2, 3].map(i => "stack_grommet_" + i);
    let st = {};
    const look = [V(-9, 11, 3), V(0, 2.2, 0)];   // from behind and a little to the right: both battery pads show between the rear standoffs
    return {
      cams: [[0, V(-4, 12, 12), V(0, 3, 0)], [7.4, V(-4, 12, 12), V(0, 3, 0)], [8.4, ...look], [22.4, ...look], [23.4, V(-10, 13, 15), V(0, 1.5, 3)], [30, V(-10, 13, 15), V(0, 1.5, 3)]],   // step 4 looks a little to the right, so the waiting FC is whole in the picture
      tags: [
        { text: "ESC: big copper pads", cls: "blue", at: () => m.at("stack_esc").add(V(0, 1.4, 0)), from: 0.8, to: 8 },
        { text: "FC: the one with the USB socket", cls: "blue", at: () => m.at("stack_fc").add(V(0, 1.4, 0)), from: 1.6, to: 8 },
        { text: "M3 x 30 stack screws", at: () => m.at("stack_screw_0").add(V(0, 2.0, 0)), from: 9.6, to: 15 },
        { text: "Soft grommet in each hole", cls: "warn", at: () => m.at("stack_grommet_2").add(V(0, 1.0, 0)), from: 13, to: 15 },   // from 13 s: its grommet has landed, so the label stands still
        { text: "Which way the screws go: check yours", cls: "warn", at: () => V(-3.6, 2.2, 0.6), from: 9.6, to: 15 },   // one row below the other two labels, behind the stack
        { text: "Battery pads: REAR (tail)", cls: "red", at: () => m.at("stack_esc_batt_pad_pos").add(V(-0.4, 1.0, 0.6)), from: 18, to: 23 },
        { text: "Front (camera end)", cls: "good", at: () => V(8, 2.6, 0), from: 18, to: 23 },
        { text: "FC waits to one side", cls: "blue", at: () => m.at("stack_fc").add(V(0, 1.4, 0)), from: 23.6, to: 30 },
        { text: "Which way the screws go: check yours", cls: "warn", at: () => m.at("stack_screw_0").add(V(0, 2.4, 0)), from: 23.6, to: 30 },
      ],
      update(t) {
        // the two boards side by side at first, then the FC moves aside and the ESC goes on the screws
        const H = n => m.home(n).p, mix = (a, b, k) => a.clone().lerp(b, k);
        m.shift(/^stack_esc(?!_fc_cable)/, mix(V(0, 0.035, -0.045), V(0, 0, 0), prog(t, 15.4, 17.2)));
        // the FC waits flat on the bench between the two right-hand arms, in clear view (it used to lie half hidden behind a motor)
        m.shift(/^stack_fc/, mix(V(0, 0.02, 0.045), V(0, -0.0312, 0.08), prog(t, 8.0, 8.8)));
        screws.forEach((s, i) => { m.slide(s, V(0, -0.04, 0), prog(t, 8.6 + i * 0.6, 9.6 + i * 0.6)); m.n(s).visible = t >= 8.4; });
        grommets.forEach((g, i) => { m.slide(g, V(0, 0.03, 0), prog(t, 11 + i * 0.6, 11.8 + i * 0.6)); m.n(g).visible = t >= 11; });
        // the ESC's pads glow while they are pointed at
        m.glow("stack_esc_batt_pad_pos", t > 17.6 && t < 23 ? 1 : 0, 0xff3b30); m.glow("stack_esc_batt_pad_neg", t > 17.6 && t < 23 ? 1 : 0, 0xff3b30);
        const esc = m.n("stack_esc").position.distanceTo(m.home("stack_esc").p) < 1e-4;
        st = { escOn: esc, screws: screws.every(s => m.n(s).position.distanceTo(m.home(s).p) < 1e-4), grommets: grommets.every(g => m.n(g).position.distanceTo(m.home(g).p) < 1e-4),
               battRear: m.at("stack_esc_batt_pad_pos").x < m.at("stack_esc").x };
      },
      state() { return st; },
    };
  },
};
