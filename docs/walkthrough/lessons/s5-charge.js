// Step 5: charge safely. Parts from docs/models/step-05-power.glb (radio, 18650 cells, M7AC charger, LiPo bag,
// GNB LiHV pack, More Volts Li-ion pack, fireproof surface, extinguisher). The charger screen is drawn here with
// the guide's settings; times are the guide's ESTIMATE.
export default {
  T: 62,
  steps: [
    { t0: 0,  text: "Put the <b>two 18650 cells</b> in the radio. Charge the radio with the <b>USB-C cord from the radio's box</b> (phone charger or laptop port). Skip this if you did it in Stage 3.", why: "The radio needs its own batteries before anything else.", simple: "Put the two big round cells in the radio, then charge it with its own cord." },
    { t0: 8,  text: "Charger on a <b>fireproof surface</b> (tile, concrete or a metal tray). Mains cable into the wall, then the <b>AC switch on its back</b>.", why: "If a battery fails while charging, a fireproof surface stops a fire spreading.", simple: "Charger on a tile or metal tray. Plug it in and switch it on at the back." },
    { t0: 15, text: "<b>Set everything before you connect the pack.</b> Short-press OK, turn the wheel to move, OK to change a line, then OK and Exit to keep it.", why: "Charging with the wrong settings can damage the pack or start a fire.", simple: "Change the settings before you plug the battery in." },
    { t0: 21, text: "Check the pack's label first: the GNB says <b>HV or LiHV</b>, the More Volts says <b>Li-ion, 4S</b>. Then <b>Battery Type: LiHv</b> for the GNB pack (<b>Lion</b> for the More Volts pack). <b>Cells: Auto.</b> <b>Mode: Charge.</b>", why: "Each battery type charges to a different full voltage.", simple: "Read the pack's label first. LiHv for the GNB pack (Lion for the More Volts pack). Cells: Auto. Mode: Charge." },
    { t0: 28, text: "<b>Current: 1.0 A</b> for the GNB 1500 (<b>2.5 A</b> for the More Volts 5000). Leave End Voltage as it is.", why: "A gentle current is safer and easier on the battery.", simple: "1.0 A for the GNB pack (2.5 A for the More Volts pack)." },
    { t0: 34, text: "Pack <b>in the LiPo bag</b>, leads out through the opening.", why: "The bag slows a fire but does not stop it: you still stay close.", simple: "Put the battery inside the bag with its wires out." },
    { t0: 39, text: "<b>Thick yellow plug</b> into the output port, <b>small white balance plug</b> into the balance port. Scroll to Start, press OK.", why: "The small white plug lets the charger balance each cell.", simple: "Plug in the thick yellow plug and the small white plug, then press Start." },
    { t0: 47, text: "<b>Stay next to it the whole time.</b> Full = a message and a tone (about 1.5 h for the GNB at 1.0 A, 2 h for the More Volts at 2.5 A, from empty; an estimate).", why: "Charging problems are rare but fast; you need to be there.", simple: "Stay close until it says it's done." },
    { t0: 54, text: "Never charge a <b>swollen or damaged</b> pack, or a warm one. Keep the <b>fire extinguisher (label with a C) and a bucket of water</b> within reach, and read how to use the extinguisher before you need it. If a pack smokes or catches fire: <b>unplug the charger at the wall</b> if you can do it safely, <b>use the extinguisher</b>, then <b>pour plenty of water</b> on the pack. <b>Never cover it with sand</b>. <b>Keep away from the smoke.</b> If you cannot put it out at once, or you are in any doubt: <b>get everyone out and call 911</b>. Not flying for a day or two: Mode <b>Storage</b>.", why: "Damaged or warm packs are the ones that catch fire; covering a burning pack keeps the heat in.", simple: "Never charge a puffy, dented or warm battery. Extinguisher and a bucket of water close by. Fire: unplug, extinguisher, then lots of water. No sand. Stay out of the smoke. In doubt: everyone out, call 911." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-05-power.glb", { at: V(0, 0, 0), hide: /^(battery_liion|battery_pack_liion)/ });
    // the charger screen, drawn over the model's screen
    const sb = new THREE.Box3().setFromObject(m.n("charger_screen"));
    const scr = E.canvasTex(480, 280, () => {});
    const plane = E.mesh(new THREE.PlaneGeometry(sb.max.x - sb.min.x, sb.max.z - sb.min.z), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }), root);
    plane.rotation.x = -Math.PI / 2; plane.position.set((sb.min.x + sb.max.x) / 2, sb.max.y + 0.02, (sb.min.z + sb.max.z) / 2); plane.castShadow = false;
    let shown = "";
    function screen(lines, hi) {
      const key = lines.join("|") + hi; if (key === shown) return; shown = key;
      const c = scr.canvas.getContext("2d"); c.fillStyle = "#0e1a2b"; c.fillRect(0, 0, 480, 280);
      c.font = "bold 34px Arial";
      lines.forEach((l, i) => { if (i === hi) { c.fillStyle = "#1d7cff"; c.fillRect(8, 14 + i * 50, 464, 46); } c.fillStyle = "#e9f1ff"; c.fillText(l, 22, 48 + i * 50); });
      scr.tex.needsUpdate = true;
    }
    // the bag's handle strap is drawn yellow in the model: make it dark so it is not mistaken for the yellow plug
    m.n("bag_handle").traverse(o => { if (o.isMesh) o.material.color.setHex(0x2b2b2b); });
    // the guide says "thick yellow plug": XT60s are yellow (the model draws it dark)
    m.n("battery_xt60").traverse(o => { if (o.isMesh) o.material.color.setHex(0xf2c418); });
    // the guide puts the CHARGER on a fireproof surface too: a tile under it (the model only has one under the bag)
    { const cb = new THREE.Box3().setFromObject(m.n("charger_body")); const tile = E.mesh(new THREE.BoxGeometry(cb.max.x - cb.min.x + 4, 0.5, cb.max.z - cb.min.z + 4), E.mat(0xd9d2c5, { roughness: 0.8 }), root);
      tile.position.set((cb.min.x + cb.max.x) / 2, 0.25, (cb.min.z + cb.max.z) / 2); }
    const plugParts = ["charge_lead_red", "charge_lead_black", "balance_lead_wire_black", "balance_lead_wire_blue", "balance_lead_wire_red", "balance_lead_wire_yellow"];
    // Picture fix, 11 Nov 2026: the guide says "leads out through the opening". The bag's opening is its front (the flap lies
    // there). The model runs the leads through the back wall, so the model's leads stay hidden and the leads are drawn here:
    // out through the open front onto the flap (step 6), then round the bag to the charger (step 7).
    const leadR = E.liveTube(root, 0xc8231d, 0.17, 40), leadK = E.liveTube(root, 0x1b1b1b, 0.17, 40), leadB = E.liveTube(root, 0xe2e2e2, 0.1, 40);
    const REST = [V(-8.6, 1.4, 11.0), V(-6.0, 1.3, 14.2), V(-3.5, 1.25, 15.8), V(-1.2, 1.25, 16.4), V(0.5, 1.4, 16.5)];
    const PLUG = [V(-8.6, 1.4, 11.0), V(-4.0, 1.3, 14.6), V(12.8, 1.1, 15.2), V(15.5, 1.1, 5.0)];
    let st = {};
    const radioCam = [V(-12, 14, 4), V(-15, 2.5, -11)], chg = [V(12, 14, 8), V(18, 3.5, -7)], chgScreen = [V(15, 11, -2), V(16.5, 3.8, -8)], bag = [V(-6, 20, 30), V(0, 3, 9)], all = [V(-18, 36, 64), V(10, 9, 0)];
    return {
      // the far view comes back to the charger's screen for "FULL" (end of step 8) and "Mode: Storage" (start of step 9)
      cams: [[0, ...radioCam], [7.4, ...radioCam], [8.4, ...chg], [14.4, ...chg], [15.4, ...chgScreen], [33.4, ...chgScreen], [34.4, ...bag], [38.4, ...bag], [39.4, V(4, 16, 22), V(6, 2.5, 2)], [46.4, V(4, 16, 22), V(6, 2.5, 2)], [47.4, ...all], [50.2, ...all], [51.2, ...chgScreen], [56.4, ...chgScreen], [57.4, ...all], [62, ...all]],
      tags: [
        { text: "2 x 18650 into the radio", cls: "blue", at: () => m.at("LBL_two-18650-cells-into-the-radio"), from: 1, to: 5 },
        { text: "Its own USB-C cord", cls: "blue", at: () => m.at("LBL_usb-c-cord-charge-the-radio"), from: 4.6, to: 8 },
        { text: "Fireproof surface", cls: "warn", at: () => m.at("charger_body").add(V(-6.5, -1.4, 4.5)), from: 9, to: 15 },
        { text: "AC switch (back)", at: () => m.at("charger_ac_switch").add(V(0, 1.4, 0)), from: 11, to: 15 },
        { text: "OK", cls: "blue", at: () => m.at("charger_button_ok").add(V(0, 1, 0)), from: 15.6, to: 21 },   // to the end of step 3: both names are on the frame the player stops on
        { text: "Wheel", cls: "blue", at: () => m.at("charger_scroll_wheel").add(V(0, 1, 0)), from: 16.4, to: 21 },
        { text: "In the LiPo bag, leads out the front", cls: "warn", at: () => m.at("LBL_lipo-bag-on-a-fireproof-surface"), from: 35, to: 39 },
        { text: "Main plug + balance plug", cls: "blue", at: () => m.at("charger_xt60").add(V(-1, 2.4, 0)), from: 40, to: 47 },
        { text: "Stay with it", cls: "red", at: () => m.at("charger_body").add(V(1.5, 1.5, -5)), from: 47.6, to: 54 },   // by the charger, so it shows in the far view and in the close view of the "FULL" screen
        { text: "Extinguisher + bucket of water (never sand)", cls: "red", at: () => m.at("LBL_fire-extinguisher"), from: 54.6, to: 62 },
      ],
      update(t) {
        // each cell moves from beside the radio into it, then is hidden (inside)
        const into = m.home("radio_body").p.clone().sub(m.home("cell_18650_0").p).setY(-0.01);
        [0, 1].forEach(i => { const k = prog(t, 1.2 + i * 1.2, 2.4 + i * 1.2); for (const nm of [`cell_18650_${i}`, `cell_18650_cap_${i}`]) { m.n(nm).position.copy(m.home(nm).p).addScaledVector(into, k); m.n(nm).visible = k < 0.98; } });
        m.n("radio_usb_c_cord").visible = t >= 4.4;
        m.n("charger_mains_cable").visible = t >= 9.6;
        m.glow("charger_ac_switch", t > 11 && t < 15 ? 1 : 0, 0x22dd55);
        // settings screen
        const L = ["Type: LiHv", "Cells: Auto", "Mode: Charge", "Current: 1.0A", "Start"];
        const on = t >= 12;
        if (!on) screen(["", "", "", "", ""], -1);
        else if (t < 21) screen(L.map((l, i) => i < 4 ? l.split(":")[0] + ": ..." : l), t >= 15.6 ? 0 : -1);
        else if (t < 24) screen(["Type: LiHv", "Cells: ...", "Mode: ...", "Current: ...", "Start"], 0);
        else if (t < 26) screen(["Type: LiHv", "Cells: Auto", "Mode: ...", "Current: ...", "Start"], 1);
        else if (t < 28) screen(["Type: LiHv", "Cells: Auto", "Mode: Charge", "Current: ...", "Start"], 2);
        else if (t < 44) screen(L, t < 34 ? 3 : 4);
        else if (t < 54) screen(["CHARGING", "16.2V 1.0A (example)", "4S LiHv", "", t > 51 ? "FULL (tone)" : ""], t > 51 ? 4 : -1);
        else screen(["Mode: Storage", "(not flying", " for a day or two)", "", ""], 0);
        // pack drops into the bag, then the two plugs connect
        const drop = 0.12 * (1 - prog(t, 34.6, 36.4)), plugK = prog(t, 40.4, 41.8);
        m.shift(/^battery_(pack|band|xt60|balance_plug|lead)/, V(0, drop, 0));
        plugParts.forEach(p => { m.n(p).visible = false; });   // the model's own leads pass through the bag's back wall: not shown
        // the thick yellow XT60 and the small white balance plug lie on the flap in front of the bag from the start of step 6,
        // and go INTO the charger's two ports in step 7 (40.4 to 41.8 s)
        { const x = m.n("battery_xt60"), bp = m.n("battery_balance_plug"), up = V(0, Math.sin(plugK * Math.PI) * 3, 0);
          const port = m.at("charger_xt60").add(V(-0.9, 0.1, 0)), bport = m.at("charger_balance_port").add(V(0, 0.1, 0.5));
          const xAt = REST[4].clone().lerp(port, plugK).add(up), bAt = REST[4].clone().add(V(-1.7, -0.1, 0.6)).lerp(bport, plugK).add(up);
          x.position.copy(x.parent.worldToLocal(xAt.clone())); bp.position.copy(bp.parent.worldToLocal(bAt.clone()));
          const path = (end, off) => [V(-8.1, 1.7 + drop * 100, 8.2).add(off), ...REST.slice(0, 4).map((p, i) => p.clone().lerp(PLUG[i], plugK).add(V(0, drop * 100 * [0.5, 0.1, 0, 0][i] + up.y * i / 4, 0)).add(off)), end];
          const on = t >= 34.2;
          leadR(path(xAt, V(0, 0, 0))).visible = on; leadK(path(xAt.clone().add(V(0, 0, 0.36)), V(0, 0, 0.36))).visible = on; leadB(path(bAt, V(-0.3, 0.2, -0.4))).visible = on; }
        st = { xt60InCharger: m.at("battery_xt60").distanceTo(m.at("charger_xt60")) < 1.5, cellsIn: !m.n("cell_18650_0").visible && !m.n("cell_18650_1").visible, packInBag: prog(t, 34.6, 36.4) >= 1, plugged: plugK >= 1, settingsDone: t >= 28 && t < 54, screen: shown };
      },
      state() { return st; },
    };
  },
};
