// Step 3 (part 3): the XT60 battery lead and the capacitor: find + with the meter, heat shrink first,
// + to +, - to -, capacitor long leg + / stripe -. Parts from docs/models/step-03-stack.glb; meter = Shad's VC921.
import * as K from "../kit-bench.js";
export default {
  T: 46,
  steps: [
    { t0: 0,  text: "<b>Before you solder, check the lead reaches the pack.</b> Hold the lead from the ESC's battery pads up to where the pack will sit, on top of the standoffs, with the pack held there. The two yellow plugs must meet without stretching, clear of the props. Do not plug them together. Too short: use a longer XT60 lead (same wire size). Then: which XT60 wire is +? Meter on the <b>beep</b>. One probe on the XT60 pin <b>marked +</b>, the other on a wire end: <b>the wire that beeps is +</b>.", why: "A lead that is too short is hard to fix once it is soldered. Getting + and - backwards can destroy the ESC instantly.", simple: "First check the lead is long enough to reach the pack's plug (don't plug it in). Then meter on beep: one tip on the + pin of the yellow plug, the other on a wire end. The wire that beeps is +." },
    { t0: 11, text: "Find the <b>+ and - marks</b> beside the ESC's two battery pads (at the rear).", why: "The ESC shows which pad is which.", simple: "Look beside the two big pads at the back for a + and a - mark." },
    { t0: 16, text: "<b>Slide heat shrink onto the wires first.</b>", why: "The tubes can only go on before the wires are soldered.", simple: "Slide the heat-shrink tubes onto both wires now." },
    { t0: 21, text: "Solder the XT60 lead to the battery pads: <b>+ wire to the + pad, - wire to the - pad</b>.", why: "+ must go to +, or the ESC can be destroyed.", simple: "Solder the + wire to the + pad and the - wire to the - pad." },
    { t0: 30, text: "Solder the <b>capacitor</b> to the same pads: <b>long leg +</b>, <b>striped side -</b>. Don't cut its legs until both are soldered the right way round.", why: "The capacitor smooths out power spikes; it only works the right way round.", simple: "Solder the capacitor's long leg to + and its striped side to -." },
    { t0: 40, text: "<b>A wrong-way battery lead can destroy the ESC</b> the first time it is plugged in. Check + to + twice.", why: "This one mistake can ruin the board the first time you plug in.", simple: "Look again: the wire that beeped on the + pin goes on the + pad. Check it twice." },
  ],
  async build(E, root) {
    const { THREE, V, prog, poseTrack, pose } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-03-stack.glb", { at: V(0, 1.0, 0),
      hide: /^(battery_|meter_|smokestopper_|wire_motor|solder_joint|stack_esc_fc_cable|stack_fc|stack_screw_\d_nut)/ });   // the FC goes on last (fix A1), so no nuts yet either (picture fix, 11 Nov 2026)
    const LEAD = /^(xt60_|wire_batt_)/;
    // the capacitor's stripe marks its MINUS side: keep it on the half over the - pad (the model draws it the full length)
    { const st = m.n("stack_capacitor_stripe"), cb = new THREE.Box3().setFromObject(m.n("stack_capacitor"));
      const along = (cb.max.z - cb.min.z) >= (cb.max.x - cb.min.x) ? "z" : "x";
      const negSide = Math.sign(m.at("stack_esc_batt_pad_neg")[along] - m.at("stack_capacitor")[along]) || 1;
      st.scale[along] *= 0.45; m.home("stack_capacitor_stripe").p[along] += negSide * 0.0028; }
    // the capacitor is drawn dark blue so it stands out from the black heat shrink and the black wire (picture fix, 11 Nov 2026)
    m.n("stack_capacitor").traverse(o => { if (o.isMesh) o.material.color.setHex(0x3a5a8c); });
    const meter = E.makeMeter(root, V(-19, 0, 15));
    const probes = E.makeProbePair(root, meter);
    const beep = E.makeBeep(root, V(-6, 2.8, 5.6));
    const OFF = V(0, 0, 0.06);                                     // the lead waits 6 cm to the side
    const xt = () => m.at("xt60_body");
    const padP = m.at("stack_esc_batt_pad_pos"), padN = m.at("stack_esc_batt_pad_neg");
    const legP = E.liveTube(root, 0xc8ccd0, 0.045), legN = E.liveTube(root, 0xc8ccd0, 0.045);
    const capHalf = (() => { const b = new THREE.Box3().setFromObject(m.n("stack_capacitor")); return Math.max(b.max.z - b.min.z, b.max.x - b.min.x) / 2 * 0.85; })();
    const sleeves = [-1, 1].map(s => { const sl = E.mesh(E.alongX(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 16)), E.mat(0x262626, { roughness: 0.35, metalness: 0.1 }), root); sl.scale.set(1, 1.35, 1.35); sl.visible = false; return sl; });   // 6 mm black heat shrink (Stage 1 list)
    const beads = [padP, padN].map(p => K.makeBead(root, p.clone().add(V(0, 0.02, 0)), 0.2));
    const iron = K.makeIron(root); iron.setHeat(1);
    const D = V(-0.45, -0.75, 0.5).normalize(), AWAY = pose(V(16, 1, -16), V(-1, 0, 0));
    let st = {}, lcd = "off";
    const PIN = () => xt().add(V(-0.95, 0, -0.36)), REST_R = pose(V(-8, 0.62, 23), V(1, 0, 0)), REST_B = pose(V(-8, 0.62, 24.5), V(1, 0, 0));
    const wireEnd = () => padP.clone().add(V(0, 0.15, 0)).add(V(0, 0, 6));
    return {
      // step 1 from further back, so the whole meter (screen and dial) is in the picture; step 5 from above, so the capacitor's legs show
      cams: [[0, V(-24, 22, 34), V(-12, 1, 10)], [10.4, V(-24, 22, 34), V(-12, 1, 10)], [11.4, V(-7, 7, 0.01), V(-1.6, 2.4, 0)], [29.4, V(-7, 7, 0.01), V(-1.6, 2.4, 0)], [30.4, V(-5, 10, 0.01), V(-2, 2.4, 0)], [39.4, V(-5, 10, 0.01), V(-2, 2.4, 0)], [40.4, V(-14, 12, 12), V(-4, 2, 0)], [46, V(-14, 12, 12), V(-4, 2, 0)]],
      tags: [
        { text: "First: does the lead reach the pack? (hold, do not plug in)", cls: "warn", at: () => xt().add(V(0, 1.6, 0)), from: 0.4, to: 2.5 },
        { text: "Pin marked +", cls: "red", at: () => PIN().add(V(0, 0.8, 0)), from: 2.6, to: 11 },
        { text: "This wire beeps = +", cls: "blue", at: () => wireEnd().add(V(0, 2.2, 0)), from: 6.2, to: 11 },
        { text: "+ pad", cls: "red", at: () => padP.clone().add(V(0, 0.7, 0)), from: 12, to: 30 },
        { text: "– pad", at: () => padN.clone().add(V(0, 0.7, 0)), from: 12, to: 30 },
        { text: "Example only: read the + and – marks on YOUR board", cls: "warn", at: () => padP.clone().add(padN).multiplyScalar(0.5).add(V(0, 1.5, 0)), from: 12, to: 30 },
        { text: "Heat shrink slid on first (shrink it later)", cls: "blue", at: () => sleeves[0].position.clone().add(V(0, 0.8, 0)), from: 16.6, to: 23 },
        { text: "Long leg = +   Stripe = –", cls: "warn", at: () => m.at("LBL_capacitor").add(V(-1.6, 0, 0)), from: 32, to: 40 },
        { text: "+ to +, – to –", cls: "red", at: () => V(-3, 4.2, 0), from: 40.6, to: 46 },
      ],
      update(t) {
        const leadK = prog(t, 13.4, 15.4);   // the lead is laid by its pads before the heat-shrink step, so the tubes are seen going on
        m.shift(LEAD, OFF.clone().multiplyScalar(1 - leadK));
        // meter on the beep: red on the + pin, black on the red wire's loose end
        meter.turn("offR", "beep", prog(t, 0.6, 1.8)); meter.setBeepMode(true);
        poseTrack(probes.red, t, [[2, REST_R], [3.2, pose(PIN().add(V(-3, 0, 0)), V(1, 0, 0))], [4.2, pose(PIN(), V(1, 0, 0))], [11, pose(PIN(), V(1, 0, 0))], [11.9, REST_R]]);   // probes stay on to the end of step 1, so the frame the player stops on shows the test
        poseTrack(probes.black, t, [[4.4, REST_B], [5.6, pose(wireEnd().add(V(3, 0.5, 0)), V(-1, -0.15, 0))], [6.2, pose(wireEnd(), V(-1, -0.15, 0))], [11, pose(wireEnd(), V(-1, -0.15, 0))], [11.9, REST_B]]);
        probes.update();
        const touching = t >= 6.2 && t < 11;
        lcd = t < 1.8 ? "off" : t >= 11 ? "off" : touching ? "0.1 Ω" : "OL Ω"; meter.setLcd(lcd); beep(t, touching);
        if (t >= 11) meter.turn("beep", "offR", prog(t, 11, 11.6));
        m.glow("stack_esc_batt_pad_pos", t > 11.6 && t < 30 ? 1 : 0, 0xff3b30); m.glow("stack_esc_batt_pad_neg", t > 11.6 && t < 30 ? 0.8 : 0, 0x3a3a3a);
        // heat shrink slides on (shown on the wires near the pads after the lead is in place)
        const wr = m.at("wire_batt_red"), wb = m.at("wire_batt_black");
        // each tube goes on over the wire's bare end and is pushed back, away from the joint (it used to slide toward the pad)
        const sk = prog(t, 16.4, 18.4); sleeves[0].position.copy(padP).add(V(-0.9 - 2.1 * sk, 0.32, 0)); sleeves[1].position.copy(padN).add(V(-0.9 - 2.1 * sk, 0.32, 0));
        sleeves.forEach(s => { s.visible = t >= 16.4; });
        // soldering the two pads
        const ip = t >= 24 && t < 26.4 ? padP : t >= 26.4 && t < 28.8 ? padN : t >= 33.4 && t < 35.4 ? padP : t >= 35.4 && t < 37.4 ? padN : null;
        if (ip) { iron.group.position.copy(ip).add(V(0, 0.22, 0)); iron.group.quaternion.setFromUnitVectors(V(1, 0, 0), D); } else { iron.group.position.copy(AWAY.p); iron.group.quaternion.copy(AWAY.q); }
        beads[0](prog(t, 24.6, 26)); beads[1](prog(t, 27, 28.4));
        if (m.has("wire_batt_red_solder_a")) m.n("wire_batt_red_solder_a").visible = t >= 25.6;
        if (m.has("wire_batt_black_solder_a")) m.n("wire_batt_black_solder_a").visible = t >= 28;
        // capacitor legs: one from each end of its body down to its pad (long leg +, stripe side -)
        { const on = m.n("stack_capacitor").visible, c = m.at("stack_capacitor");
          [[padP, legP], [padN, legN]].forEach(([pd, leg]) => { const end = c.clone(); end.z = c.z + Math.sign(pd.z - c.z) * capHalf;
            const pts = [end, end.clone().lerp(pd, 0.5).add(V(0, 0.05, 0)), pd.clone().add(V(0, 0.03, 0))];
            if (pd === padP) pts.push(pd.clone().add(V(0.55, 0.08, 0)));   // the + leg is the long one: its spare end sticks out past the + pad
            const tube = leg(on ? pts : [pd, pd.clone().add(V(0, 0.001, 0))]); tube.visible = on; }); }
        m.slide("stack_capacitor", V(0, 0.04, 0), prog(t, 30.6, 32)); m.slide("stack_capacitor_stripe", V(0, 0.04, 0), prog(t, 30.6, 32));
        m.n("stack_capacitor").visible = m.n("stack_capacitor_stripe").visible = t >= 30.6;
        m.glow("stack_capacitor_stripe", t > 32 && t < 40 ? 1 : 0, 0x1d7cff);
        iron.ironCord(V(30, 0, -25));   // the adapter's plug and cable at the iron's back
        st = { lcd, leadIn: leadK >= 1, redOnPin: probes.red.position.distanceTo(PIN()) < 0.1, blackOnWire: probes.black.position.distanceTo(wireEnd()) < 0.1,
               redWireToPos: m.at("wire_batt_red").distanceTo(padP) < m.at("wire_batt_red").distanceTo(padN), cap: m.n("stack_capacitor").position.distanceTo(m.home("stack_capacitor").p) < 1e-4, sleeves: sleeves[0].visible, fcHidden: !m.n("stack_fc").visible, stripeOnNeg: m.at("stack_capacitor_stripe").distanceTo(padN) < m.at("stack_capacitor_stripe").distanceTo(padP) };
      },
      state() { return st; },
    };
  },
};
