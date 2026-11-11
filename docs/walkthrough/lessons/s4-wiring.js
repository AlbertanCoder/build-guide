// Step 4 (part 1): the hardware. Receiver on UART2 with the stack box's 4-wire cable (S4.1), its antenna (S4.2),
// the camera and VTX plugs (S4.3; both cables were soldered to the flight controller in Step 3, fix A1), the 10° camera
// tilt (S4.3b), the VTX on the bottom plate with its antenna (S4.4). The page then does S4.5-S4.7 (s4-bind,
// s4-betaflight) and only then the Finder (S4.9) and the top plate (S4.8): those are s4-finish.
// Words follow the guide's Step 4 (index.html, after the 10 Nov audit). Parts: docs/models/step-04-receiver-fpv.glb.
export default {
  T: 47,
  steps: [
    { t0: 0,  text: "Take one of the two small <b>4-wire cables from the stack box</b>. Its plug goes into the flight controller's <b>4-pin socket marked G, 5V, R2, T2</b>. Follow each wire from its socket pin with the meter, then cut the other end.", why: "You need to know which colour is which pin before the plug end is gone.", simple: "Plug the little 4-wire cable into the board, check each wire with the meter, then cut the far end." },
    { t0: 7,  text: "Solder its four wires to the receiver: <b>G to G</b>, <b>5V to 5</b>, <b>R2 to the receiver's T</b> and <b>T2 to the receiver's R</b>.", why: "A talking pin always goes to a listening pin: the board listens on R2, where the receiver talks (T).", simple: "Ground to ground, 5V to 5. The two data wires cross over: R2 to T, T2 to R." },
    { t0: 13, text: "Press the receiver's <b>65 mm T antenna</b> onto its tiny UFL socket, straight down until it <b>clicks</b>, before any power. Arms away from carbon and out of the prop circles, for example taped along a rear arm.", why: "Carbon blocks radio, and a prop will cut an antenna that hangs into its circle.", simple: "Click the little antenna on. Keep it away from carbon and propellers." },
    { t0: 19, text: "<b>Camera:</b> plug it into its cable (the one in the CAM socket, or on the CAM pads, from Step 3). <b>VTX:</b> plug the cable you soldered to the flight controller in Step 3 into it. The plug fits one way only; <b>never force it</b>.", why: "Red goes to 9V, both blacks to GND, yellow to VTX, white to T1; the orange and green wires were cut and covered in Step 3.", simple: "Plug the camera and the video transmitter into their cables. They only go in one way." },
    { t0: 27, text: "Tilt the camera <b>up about 10°</b>: loosen the two side screws on the mount, tilt, tighten. A free phone level app reads the angle. (Check when the frame arrives that its mount tilts this way; if not, follow the frame's manual.)", why: "Flying forward tips the drone nose-down; a little up-tilt keeps the horizon in view.", simple: "Loosen two screws, tip the camera up a little (10°), tighten." },
    { t0: 34, text: "Stick the <b>VTX</b> to the bottom plate <b>behind the stack</b> with a strip of foam tape. Screw the <b>5.8 GHz antenna</b> onto its gold SMA socket, <b>finger tight, before any power</b>.", why: "A video transmitter powered without its antenna can burn itself out.", simple: "Tape the video transmitter down behind the stack. Antenna on before any power." },
    { t0: 41, text: "Hold the antenna's base with <b>two zip ties</b> to the two rear standoffs, pointing up and back, out of the props. (When the frame arrives, check: does it have a hole for the antenna's SMA nut?)", why: "If the drone lands upside down, the antenna takes the hit first: check its nut and the ties.", simple: "Two zip ties hold the antenna up and back, away from the propellers." },
  ],
  async build(E, root) {
    const { V, prog } = E;
    E.makeBench(root, { wall: false });
    // Picture fix, 11 Nov 2026: the model ends the VTX and Finder wires in solder dots on the flight controller's TOP face;
    // the pads are on the face that points down, so the dots are hidden here (the wires themselves need a model change).
    const m = await E.loadStepModel(root, "step-04-receiver-fpv.glb", { at: V(0, 0.5, 0), hide: /^(laptop_tag|usb_cable|monitor_|cone_pilot|campose_pilot)|^(vtx|finder)_wire_.*_solder_b$/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    // the receiver's antenna is a thin dark wire on dark carbon in the model: drawn light here so it can be seen
    m.n("rx_antenna").traverse(o => { if (o.isMesh) o.material.color.setHex(0xe6e9ec); });
    // camera tilt: turn the camera's pivot about the drone's side axis (z), nose up
    const piv = m.n("cam_pivot"), pivHome = piv.quaternion.clone();
    const ov = [V(-14, 22, 24), V(0, 2.5, 0)];
    const rxCam = [V(-7, 9, -7), V(-2.8, 1, -1.4)];
    const antCam = [V(-12, 10, -12), V(-5, 1.8, -3)];
    const plugCam = [V(12, 11, 11), V(1, 2.2, 0)];
    const tiltCam = [V(16, 7, 9), V(6.7, 2.4, 0)];
    const vtxCam = [V(-18, 12, 11), V(-6, 3, 0)];
    let st = {};
    return {
      cams: [[0, ...ov], [1.2, ...rxCam], [12.4, ...rxCam], [13.4, ...antCam], [18.4, ...antCam], [19.4, ...plugCam], [26.4, ...plugCam], [27.4, ...tiltCam], [33.4, ...tiltCam], [34.4, ...vtxCam], [47, ...vtxCam]],
      tags: [
        { text: "4-pin socket: G 5V R2 T2 (wire colours vary)", cls: "blue", at: () => m.at("rx_box_cable_plug").add(V(0, 1.6, 0)), from: 1.5, to: 7 },
        { text: "R2 to T, T2 to R (crossed on purpose)", cls: "warn", at: () => m.at("LBL_tx-r2-rx-t2-crossed-on-purpose"), from: 7.5, to: 10.4 },
        { text: "Receiver on UART2", at: () => m.at("LBL_rp1-v2-receiver-on-uart2"), from: 10.5, to: 13 },
        { text: "Antenna: click it on, away from carbon", cls: "blue", at: () => m.at("LBL_receiver-antenna").add(V(0, 2.4, 0)), from: 13.5, to: 19 },   // higher, so the label does not cover the antenna
        { text: "Camera plugs into its cable", cls: "blue", at: () => m.at("LBL_phoenix-2-camera"), from: 19.5, to: 27 },
        { text: "VTX cable: soldered underneath in Step 3", at: () => m.at("LBL_vtx-power-9v-pad"), from: 21, to: 27 },
        { text: "About 10° up", cls: "blue", at: () => m.at("LBL_phoenix-2-camera"), from: 28, to: 34 },
        { text: "VTX behind the stack, foam tape", at: () => m.at("LBL_unify-pro-hv-vtx"), from: 34.5, to: 41 },
        { text: "Antenna on before any power", cls: "red", at: () => m.at("LBL_triumph-pro-antenna-sma"), from: 36.5, to: 47 },
        { text: "Two zip ties to the rear standoffs", at: () => m.at("antenna_zip_tie_l").add(V(0, 1.5, 0)), from: 41.5, to: 47 },
      ],
      update(t) {
        // the receiver, its cable and its antenna arrive in S4.1 / S4.2
        show(/^rx_box_cable/, t >= 1.2);
        show(/^rx_rp1/, t >= 7.4);
        show(/^rx_antenna/, t >= 14);
        m.glow("rx_box_cable_plug", t > 1.5 && t < 7 ? 1 : 0);
        m.glow("rx_rp1", t > 7.5 && t < 13 ? 1 : 0);   // the receiver sits at the foot of a standoff in the model: lit while it is soldered
        // S4.3: the VTX board appears and its cable plug glows; the camera plug glows
        show(/^vtx_board|^vtx_sma_socket/, t >= 19.8);
        m.glow("cam_cable", t > 19.6 && t < 23 ? 1 : 0);
        m.glow("vtx_board", t > 21.5 && t < 26.5 ? 1 : 0);
        // S4.3b: tilt the camera 10° up. The model's camera already stands at 10°, so it is drawn level first and ends at 10°
        // (picture fix, 11 Nov 2026: it used to go from 10° to 20°).
        const a = (10 * Math.PI / 180) * prog(t, 28.5, 31.5);
        piv.quaternion.copy(pivHome);
        piv.rotateZ(a - 10 * Math.PI / 180);
        // S4.4: foam tape, antenna, zip ties
        show(/^vtx_foam_tape/, t >= 35);
        show(/^antenna_triumph/, t >= 37);
        show(/^antenna_zip_tie/, t >= 42);
        // the Finder (S4.9) and the top plate (S4.8) come after the Betaflight setup: s4-finish
        show(/^finder_/, false);
        show(/^frame_top_plate/, false);
        st = { receiver: m.n("rx_rp1").visible, rxAntenna: m.n("rx_antenna").visible, vtx: m.n("vtx_board").visible, antenna: m.n("antenna_triumph_head").visible,
               tiltDeg: Math.round(a * 180 / Math.PI * 10) / 10, finder: m.n("finder_body").visible, topPlate: m.n("frame_top_plate").visible };
      },
      state() { return st; },
    };
  },
};
