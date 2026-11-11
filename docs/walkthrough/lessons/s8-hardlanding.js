// Step 8: "After a hard landing", the twelve checks before you fly again (the box at the end of Step 8).
// Words follow the guide (index.html, after the 10 Nov audit). Parts: docs/models/step-08-test.glb (drone with payload,
// legs and props); each check lights up the parts it is about. Numbered as on the page: 1 disarm, 2 battery (with
// the 0.2 V rule), 3 props, 4 motors, 5 arms, 6 legs, 7 solder, 8 antenna, 9 payload, 10 strap, 11 sensors, 12 hover. Nothing is animated as broken: the lesson shows WHERE
// to look, the guide says what counts as damage.
const STEPS = [
  { re: /^battery_xt60|^xt60/, cam: "rear", tag: "Disarm; battery out first",
    text: "<b>Disarm</b>, then <b>take the battery out</b> before you touch anything.", why: "A drone that is still powered can spin a prop while your hands are on it.", simple: "Disarm. Battery out. Then touch." },
  { re: /^battery_pack$|^battery_balance_plug/, cam: "top", tag: "Dents, punctures, swelling? A cell 0.2 V low?",
    text: "Look at the <b>battery</b>. Dents, punctures or swelling: <b>do not charge or fly it again</b>. Put it in the LiPo bag. Do not throw it in the household bin: ask a recycling facility. When you charge it, if <b>one cell reads more than 0.2 V below the others</b>, retire the pack.", why: "A damaged pack can catch fire. When the charger arrives, check: the M7AC shows each cell's voltage while it charges (its first screen; its manual).", simple: "Damaged pack, or a cell 0.2 V lower than the rest: retire it. LiPo bag, then a recycling facility." },
  { re: /^prop_/, cam: "top", tag: "Chipped, bent, white at the hub: replace",
    text: "<b>Props</b>: replace any that are <b>chipped, bent or white at the hub</b>. Spares are on the buy list.", why: "A damaged prop shakes the drone and can fly apart.", simple: "Any damaged prop: new one." },
  { re: /^M[1-4]_bell/, cam: "side", tag: "Spin by hand: scraping = bent bell",
    text: "<b>Motors</b>, props off: <b>spin each one by hand</b>. A periodic scraping means a <b>bent bell</b>. After the next flight, a motor much hotter than the others points to a bent shaft or bearing.", why: "A bent motor works harder and gets hot.", simple: "Props off, spin each motor: it must not scrape." },
  { re: /^frame_arm|^frame_bottom_plate|^frame_top_plate/, cam: "top", tag: "Hairline cracks where the arms meet the plates",
    text: "<b>Arms and frame</b>: hold them to a light and look for <b>hairline cracks</b>, especially where the arms meet the plates.", why: "A cracked arm can snap in the air.", simple: "Look for thin cracks, mostly where the arms join." },
  { re: /^leg_/, cam: "side", tag: "Straight, tight, four feet; stands level",
    text: "<b>Legs</b>: straight, set screws tight, all four feet on. The drone must still <b>stand level</b>.", why: "The legs keep the payload off the ground.", simple: "Legs straight and tight, four feet, level." },
  { re: /^wire_batt|^stack_capacitor|^wire_motor/, cam: "side", tag: "Look and gently tug: re-solder any that move",
    text: "<b>Solder joints</b>: look at and gently tug the <b>battery lead, the capacitor and the motor wires</b>. Re-solder any that move or crack.", why: "A joint that cracks in the air cuts a motor or the power.", simple: "Tug the big joints gently. Loose or cracked: re-solder." },
  { re: /^antenna_triumph|^antenna_zip_tie/, cam: "rear", tag: "Nut tight, not bent; two zip ties hold",
    text: "<b>Video antenna</b>: the nut is tight and not bent. The two zip ties still hold it.", why: "The antenna takes the hit first when the drone lands upside down.", simple: "Antenna nut tight, ties holding." },
  { re: /^zip_tie|^thermal_|^gps_pcb|^gps_cable/, cam: "under", tag: "Ties, camera tape, GPS tape, cable joints",
    text: "<b>Payload</b>: the joined zip ties are not cut or slipped, the thermal camera still sits flat on its tape, the GPS board is still stuck down, and the GPS cable joints are not pulled.", why: "A loose payload can fall into the props or give wrong readings.", simple: "Ties, camera, GPS and cable all still in place." },
  { re: /^strap_|^battery_band/, cam: "top", tag: "Strap not cut; pack not slid",
    text: "<b>Battery strap</b>: not cut, and the pack has not slid.", why: "A slid pack changes the balance.", simple: "Strap fine, pack where it was." },
  { re: /^thermal_lens|^gps_antenna/, cam: "side", tag: "Heat test and GPS line again",
    text: "<b>Sensors</b>: check again that the <b>heat test</b> finds the mug and not your hand (Step 8, item 9) and that the <b>GPS line</b> appears (item 10), before you fly the payload again.", why: "A knock can move or loosen a sensor without any visible damage.", simple: "Redo the heat test and the GPS line." },
  { re: /^frame_bottom_plate/, cam: "side", tag: "Short low hover, then a normal flight",
    text: "Then a <b>short low hover</b>, then a normal flight.", why: "A short low hover shows a problem while the drone is still close to the ground.", simple: "Short low hover first, then fly normally." },
];
const DT = 5.5;
export default {
  T: STEPS.length * DT + 2,
  steps: STEPS.map((s, i) => ({ t0: i * DT, text: s.text, why: s.why, simple: s.simple })),
  async build(E, root) {
    const { V } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, 5.8, 0),
      hide: /^(campose_|cone_|HS_|arrow_|radio_|battery_pack_liion|smokestopper_|monitor_|LBL_|mug_|hand_|laptop_tag)/ });
    const lit = new Set();
    const glowAll = (re, on) => m.all(re).forEach(o => o.traverse(x => { if (x.isMesh) { x.material.emissive = new E.THREE.Color(0x1d7cff); x.material.emissiveIntensity = on ? 0.55 : 0; } }));
    const C = { top: [V(-9, 40, 0), V(0, 7, 0)], side: [V(4, 14, 34), V(0, 5, 0)], rear: [V(-30, 16, 14), V(-4, 7, 0)], under: [V(-6, 2.5, 26), V(-1, 4, 0)] };
    const cams = [];
    STEPS.forEach((s, i) => { cams.push([i * DT + (i ? 0.6 : 0), ...C[s.cam]], [i * DT + DT - 0.4, ...C[s.cam]]); });
    cams.push([STEPS.length * DT + 2, ...C[STEPS[STEPS.length - 1].cam]]);
    let st = {};
    return {
      cams,
      tags: STEPS.map((s, i) => ({ text: `${i + 1}. ${s.tag}`, cls: i < 2 ? "red" : "blue", at: () => { const o = m.all(s.re)[0]; return o ? o.getWorldPosition(new E.THREE.Vector3()).add(V(0, 2.2, 0)) : V(0, 12, 0); }, from: i * DT + 0.6, to: i * DT + DT })),
      update(t) {
        const k = Math.min(STEPS.length - 1, Math.floor(t / DT));
        STEPS.forEach((s, i) => { const on = i === k; if (on !== lit.has(i)) { glowAll(s.re, on); if (on) lit.add(i); else lit.delete(i); } });
        // the battery is drawn in place so its checks can point at it; the guide's first check takes it out
        // check 4 (motors) is done props off
        m.all(/^prop_/).forEach(o => { o.visible = k !== 3; });
        st = { check: k + 1, of: STEPS.length, lit: [...lit].map(i => i + 1) };
      },
      state() { return st; },
    };
  },
};
