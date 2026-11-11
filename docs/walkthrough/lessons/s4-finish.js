// Step 4 (last part): after Betaflight is set up, the Finder goes in (S4.9) and the top plate goes on (S4.8), in the
// page's order. Words follow the guide's S4.9 and S4.8 (index.html, after the 10 Nov audit); moved here from s4-wiring
// (verified there 10 Nov) so the lessons follow the page: S4.1-S4.4, S4.5, S4.6-S4.7, then S4.9, S4.8.
// Parts: docs/models/step-04-receiver-fpv.glb.
export default {
  T: 18,
  steps: [
    { t0: 0, text: "<b>Finder:</b> plug its 3-pin cable (soldered in Step 3) into it. Foam-tape it on the middle plate in the <b>front bay, just ahead of the stack</b> (leave about 2 mm), long side forward, cable end toward the stack, clear of the GPS cable.", why: "It beeps after a crash so you can find the drone; Betaflight needs no setting for it.", simple: "Plug in the beeper and tape it down at the front, just in front of the stack." },
    { t0: 7, text: "<b>Top plate</b> on the eight standoffs with eight of the frame's short screws (likely the M3 x 10 ones). Before tightening, check <b>no wire is trapped</b>. Never power the VTX without its antenna; <b>props stay off</b> until Step 8. (When the frame arrives, check the screw size its manual names and whether it wants threadlock.)", why: "A trapped wire can be cut or shorted the first time the frame flexes.", simple: "Screw the top plate on. Check no wire is pinched. Propellers stay off." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    // the model's solder dots on the flight controller's TOP face are hidden: the pads are on the face that points down (picture fix, 11 Nov 2026)
    const m = await E.loadStepModel(root, "step-04-receiver-fpv.glb", { at: V(0, 0.5, 0), hide: /^(laptop_tag|usb_cable|monitor_|cone_pilot|campose_pilot)|^(vtx|finder)_wire_.*_solder_b$/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    const ov = [V(-14, 22, 24), V(0, 2.5, 0)];
    const finCam = [V(11, 14, -10), V(3.4, 2.4, -0.2)];
    let st = {};
    return {
      cams: [[0, ...ov], [1, ...finCam], [6.4, ...finCam], [7.4, ...ov], [18, ...ov]],
      tags: [
        { text: "Finder: front bay, ahead of the stack", cls: "blue", at: () => m.at("LBL_finder-beeper-front-bay-ahead-of-the-stack"), from: 1.2, to: 7 },
        { text: "Top plate last; no wire trapped", at: () => m.at("LBL_top-plate-fit-it-last"), from: 9, to: 18 },
        { text: "Props stay off", cls: "red", at: () => V(0, 9, 0), from: 11, to: 18 },
      ],
      update(t) {
        // S4.9: the Finder drops into the front bay
        show(/^finder_/, t >= 1);
        m.shift(/^finder_/, V(0, 0.03 * (1 - prog(t, 1, 3)), 0));
        // S4.8: the top plate comes down onto the standoffs
        show(/^frame_top_plate/, t >= 7.5);
        m.slide("frame_top_plate", V(0, 0.06, 0), prog(t, 7.5, 10));
        st = { finder: m.n("finder_body").visible, topPlate: m.n("frame_top_plate").visible, plateDown: prog(t, 7.5, 10) >= 1 };
      },
      state() { return st; },
    };
  },
};
