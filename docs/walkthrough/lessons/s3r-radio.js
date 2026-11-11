// The RadioMaster Pocket for the Stage 3 lessons, drawn from the Pocket user manual's own drawings
// (page 1 "Gimbal adjustment", page 2 "Remote control overview"; saved in .claude/audit-2026-11-03/sources/radiomaster/).
// Positions are scaled from that drawing: screen top-middle, power button under it with a trim cross each side,
// SYS (round, left) and MDL (round, right), the column RTN / PAGE> / PAGE< / TELE under the left stick,
// the Menu Wheel under the right stick, SA/SD on the shoulders, SB/SC on top, the USB port on top
// beside the antenna and the TYPE-C charge port in the middle of the bottom edge. Shapes are simplified.
// Units: cm. The radio stands on the bench, face toward +z, leaning back a little.
export function makePocket(E, root, at) {
  const { THREE, V } = E;
  const g = new THREE.Group(); g.position.copy(at); g.rotation.x = -0.32; root.add(g);
  const W = 17, H = 10.4, D = 3.2, FZ = D / 2;          // body width, height, thickness; front face z
  // smoky see-through shell, as on Shad's radio (photo 7 Nov): the dark board shows through it
  const body = E.mat(0x4a525c, { roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.72, depthWrite: false });
  // body outline: rounded top, two grips at the bottom
  const s = new THREE.Shape();
  s.moveTo(-6.4, 5.2); s.lineTo(6.4, 5.2); s.quadraticCurveTo(8.6, 5.2, 8.7, 3.0);
  s.lineTo(8.6, -3.2); s.quadraticCurveTo(8.4, -5.6, 6.0, -5.6); s.quadraticCurveTo(4.0, -5.6, 3.0, -4.6);
  s.lineTo(-3.0, -4.6); s.quadraticCurveTo(-4.0, -5.6, -6.0, -5.6); s.quadraticCurveTo(-8.4, -5.6, -8.6, -3.2);
  s.lineTo(-8.7, 3.0); s.quadraticCurveTo(-8.6, 5.2, -6.4, 5.2);
  const bg = new THREE.ExtrudeGeometry(s, { depth: D - 0.8, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 4, curveSegments: 24 });
  bg.translate(0, 0, -(D - 0.8) / 2);
  E.mesh(bg, body, g).castShadow = false;
  // the board inside: same outline, a little smaller, dark green-grey
  const inner = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 24 });
  inner.scale(0.94, 0.92, 1); inner.translate(0, 0, -0.6);
  E.mesh(inner, E.mat(0x1d2622, { roughness: 0.7 }), g);

  const parts = {};
  const label = (text, w, h, px = 40, fg = "#e8ecf0", bgc = null) => E.canvasTex(256 * w / h, 256, (c, cv) => {
    if (bgc) { c.fillStyle = bgc; c.fillRect(0, 0, cv.width, cv.height); }
    c.fillStyle = fg; c.font = `bold ${px * 4}px Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, cv.width / 2, cv.height / 2 + 6);
  }).tex;
  const printed = (text, x, y, w, h, px) => {
    const p = E.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: label(text, w, h, px), transparent: true, toneMapped: false }), g);
    p.position.set(x, y, FZ + 0.02); p.castShadow = false; return p;
  };
  printed("RADIOMASTER", 0, 4.55, 6, 0.7, 34);

  // screen (EdgeTX black-and-white: light grey with dark pixels, as in Shad's photo)
  const bez = E.mesh(new THREE.BoxGeometry(4.6, 3.0, 0.3), E.M.black, g); bez.position.set(0, 2.55, FZ);
  const scr = E.canvasTex(512, 296, () => {});
  const sp = E.mesh(new THREE.PlaneGeometry(4.0, 2.3), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }), g);
  sp.position.set(0, 2.55, FZ + 0.17); sp.castShadow = false;
  parts.screen = sp;
  printed("POCKET", 0, 0.62, 2.4, 0.5, 34);

  // the two sticks: a ring (gimbal) and a stick with a knurled top
  const sticks = [];
  for (const sx of [-4.7, 4.7]) {
    const ring = E.mesh(new THREE.TorusGeometry(2.0, 0.22, 12, 48), E.mat(0x15171a, { roughness: 0.4 }), g); ring.position.set(sx, 1.3, FZ + 0.12);
    const well = E.mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.2, 40), E.mat(0x202328, { roughness: 0.6 }), g); well.rotation.x = Math.PI / 2; well.position.set(sx, 1.3, FZ + 0.02);
    const win = E.mesh(new THREE.BoxGeometry(2.2, 1.6, 0.12), E.mat(0x0d0e10, { roughness: 0.8 }), g); win.position.set(sx, 1.3, FZ + 0.1);
    const pivot = new THREE.Group(); pivot.position.set(sx, 1.3, FZ); g.add(pivot);
    const shaft = E.mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.0, 16), E.M.metal, pivot); shaft.rotation.x = Math.PI / 2; shaft.position.z = 1.0;
    // gold knurled stick tops, as on Shad's radio
    const gold = E.mat(0xc9a256, { metalness: 0.85, roughness: 0.3 });
    const cap = E.mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.75, 18), gold, pivot); cap.rotation.x = Math.PI / 2; cap.position.z = 2.15;
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const r = E.mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), gold, pivot); r.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 2.15); }
    const top = E.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 18), E.mat(0xe8d9a8, { metalness: 0.6, roughness: 0.35 }), pivot); top.rotation.x = Math.PI / 2; top.position.z = 2.54;
    sticks.push(pivot);
  }
  parts.stickL = sticks[0]; parts.stickR = sticks[1];

  // buttons: each with its own material so it can glow when pressed
  const btns = {};
  const button = (name, geo, x, y, text, w, h) => {
    const m = E.mesh(geo, E.mat(0x3a3f46, { roughness: 0.5 }), g); m.position.set(x, y, FZ + 0.12); btns[name] = { m, x, y };
    if (text) { const p = printed(text, x, y, w, h, 46); p.position.z = FZ + 0.26; btns[name].label = p; }
    return m;
  };
  const pill = (w, h) => { const sh = new THREE.Shape(); E.roundRect({ beginPath() {}, moveTo: (a, b) => sh.moveTo(a, b), arcTo: (a, b, c, d, r) => sh.absarc ? sh.quadraticCurveTo(a, b, c === a ? a : (a + c) / 2 > a ? a + r : a - r, d === b ? b : b) : 0, closePath() {} }, -w / 2, -h / 2, w, h, h / 2); return sh; };
  void pill;
  const pillGeo = (w, h) => { const geo = new THREE.CapsuleGeometry(h / 2, w - h, 6, 16); geo.rotateZ(Math.PI / 2); geo.scale(1, 1, 0.45); return geo; };
  const roundGeo = r => { const geo = new THREE.CylinderGeometry(r, r, 0.3, 28); geo.rotateX(Math.PI / 2); return geo; };
  button("power", pillGeo(1.7, 0.85), 0, -0.75, "⏻", 0.6, 0.6);
  // power button: dark, with the green glow Shad's radio shows when it's on
  btns.power.m.material.color.set(0x16301c); btns.power.m.material.emissive = new THREE.Color(0x22dd55); btns.power.m.material.emissiveIntensity = 0.9;
  const glow = E.mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0x4dff7a, toneMapped: false }), g);
  glow.scale.set(1.75, 1, 1); glow.position.set(0, -0.75, FZ + 0.2);
  button("trimL", roundGeo(0.5), -2.15, -0.75, "+", 0.5, 0.5);
  button("trimR", roundGeo(0.5), 2.15, -0.75, "+", 0.5, 0.5);
  button("SYS", roundGeo(0.58), -2.75, -2.55, "SYS", 0.8, 0.4);
  button("MDL", roundGeo(0.58), 2.75, -2.55, "MDL", 0.8, 0.4);
  [["RTN", -1.3], ["PAGE>", -2.15], ["PAGE<", -3.0], ["TELE", -3.85]].forEach(([n, y]) => button(n, pillGeo(1.25, 0.55), -4.75, y, n, 1.0, 0.36));
  // Menu Wheel: an upright roller you roll up/down and push in
  const wheel = E.mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.7, 24), E.mat(0x3a3f46, { roughness: 0.4 }), g);
  wheel.position.set(4.45, -2.75, FZ + 0.15); // axis along y: rolls up/down
  const ridges = [];
  for (let i = 0; i < 12; i++) { const r = E.mesh(new THREE.BoxGeometry(0.06, 2.6, 0.08), E.M.black, wheel); const a = i / 12 * Math.PI * 2; r.position.set(Math.sin(a) * 0.63, 0, Math.cos(a) * 0.63); r.rotation.y = a; ridges.push(r); }
  btns.wheel = { m: wheel, x: 4.45, y: -2.75 };
  printed("speaker", 0, -2.6, 2.2, 0.4, 30).material.opacity = 0.5;

  // switches: SA / SD on the shoulders, SB / SC on top (flick = tilt toward or away from you)
  const sw = {};
  const lever = (name, x, y, z, lean) => {
    const piv = new THREE.Group(); piv.position.set(x, y, z); piv.rotation.z = lean; g.add(piv);
    const base = E.mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), E.M.dark, piv);
    const arm = new THREE.Group(); piv.add(arm);
    const rod = E.mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 12), E.M.metal, arm); rod.position.y = 0.6;
    const tip = E.mesh(new THREE.SphereGeometry(0.2, 12, 10), E.M.metal, arm); tip.position.y = 1.15;
    sw[name] = { arm, piv }; void base; return piv;
  };
  lever("SA", -7.4, 4.6, 0.2, 0.55); lever("SD", 7.4, 4.6, 0.2, -0.55);
  lever("SB", -3.6, 5.45, 0.1, 0); lever("SC", 3.6, 5.45, 0.1, 0);
  // antenna and the two USB-C ports
  const ant = E.mesh(new THREE.BoxGeometry(1.4, 1.6, 0.9), E.M.dark, g); ant.position.set(0, 5.9, -0.2);
  const port = (x, y, rotZ) => { const p = E.mesh(new THREE.BoxGeometry(0.95, 0.35, 0.4), E.M.black, g); p.position.set(x, y, 0.2); p.rotation.z = rotZ; return p; };
  const usbTop = port(1.9, 5.3, 0), usbBottom = port(0, -4.72, 0);
  void usbTop; void usbBottom;
  // the cord: plug + cable, shown at the top port or the bottom port
  const cord = new THREE.Group(); g.add(cord);
  const plug = E.mesh(new THREE.BoxGeometry(1.1, 1.6, 0.6), E.mat(0x111111), cord); plug.position.y = 0.8;
  const cab = E.mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 12), E.mat(0x111111), cord); cab.position.y = 5.0;
  cord.visible = false;

  // 18650 cells (two), shown beside the radio, then slid into the back
  const cells = [];
  for (const cx of [-5.2, 5.2]) {
    const c = new THREE.Group(); g.add(c);
    const tube = E.mesh(new THREE.CylinderGeometry(0.9, 0.9, 6.5, 24), E.mat(0x2a6bd8, { roughness: 0.35 }), c);
    const cap = E.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 18), E.M.metal, c); cap.position.y = 3.3;
    c.position.set(cx * 1.9, -1.2, 0); cells.push(c); void tube;
  }

  // cells start inside the radio (hidden); only the tour lesson shows them going in
  cells.forEach(c => { c.visible = false; });
  let shown = "";
  return {
    group: g,
    world: (x, y, z = FZ) => g.localToWorld(V(x, y, z)),
    at(name) {
      const b = btns[name]; if (b) return g.localToWorld(V(b.x, b.y, FZ + 0.6));
      if (sw[name]) return sw[name].piv.localToWorld(V(0, 1.4, 0));
      if (name === "screen") return g.localToWorld(V(0, 2.55, FZ + 0.3));
      if (name === "stickL") return g.localToWorld(V(-4.7, 1.3, FZ + 2.6));
      if (name === "stickR") return g.localToWorld(V(4.7, 1.3, FZ + 2.6));
      if (name === "usbTop") return g.localToWorld(V(1.9, 5.5, 0.2));
      if (name === "usbBottom") return g.localToWorld(V(0, -4.9, 0.2));
      if (name === "back") return g.localToWorld(V(-5, 0, -FZ - 0.4));
      throw new Error("Pocket has no part " + name);
    },
    /** k = 0..1: how far the button is pressed (it moves in and glows) */
    press(name, k) { const b = btns[name]; b.m.position.z = FZ + 0.12 - 0.12 * k;
      if (name === "power") { b.m.material.emissiveIntensity = 0.9 + 0.6 * k; } else { b.m.material.emissive = new THREE.Color(0x1d7cff); b.m.material.emissiveIntensity = 0.7 * k; } if (b.label) b.label.position.z = FZ + 0.26 - 0.12 * k; },
    /** roll the Menu Wheel: a = angle in turns */
    roll(a) { wheel.rotation.y = a * Math.PI * 2; },
    /** left stick up/down: v = -1 (all the way down) .. 1 (all the way up) */
    throttle(v) { sticks[0].rotation.x = -0.38 * v; },
    /** left stick sideways (yaw): x = -1 .. 1 */
    yawL(x) { sticks[0].rotation.y = 0.38 * x; },
    stickR(x, y) { sticks[1].rotation.x = -0.38 * y; sticks[1].rotation.y = 0.38 * x; },
    /** a switch: v = 1 up (away from you), -1 down (toward you) */
    flick(name, v) { sw[name].arm.rotation.x = -0.5 * v; },
    switchUp(name) { return sw[name].arm.rotation.x < 0; },
    /** where = "top", "bottom" or null; k = 0 (away) .. 1 (plugged in) */
    cord(where, k) {
      cord.visible = !!where && k > 0;
      if (where === "top") { cord.rotation.set(0, 0, 0); cord.position.set(1.9, 5.45 + 3 * (1 - k), 0.2); }
      if (where === "bottom") { cord.rotation.set(0, 0, Math.PI); cord.position.set(0, -4.85 - 3 * (1 - k), 0.2); }
    },
    /** cells: k = 0 beside the radio, 1 inside (hidden) */
    cells(k) { cells.forEach((c, i) => { const sx = i ? 1 : -1; c.position.set(sx * (9.9 - 4.7 * k), -1.2, -FZ - 1.6 * (1 - k) - 0.1); c.visible = k < 0.97; }); },
    /** draw the screen: title (inverted bar), lines, the highlighted line, optional big warning */
    screen(title, lines = [], hi = -1) {
      const key = title + "|" + lines.join("|") + "|" + hi; if (key === shown) return; shown = key;
      const c = scr.canvas.getContext("2d");
      c.fillStyle = "#dfe6ea"; c.fillRect(0, 0, 512, 296);
      if (title === "") { scr.tex.needsUpdate = true; return; }
      c.font = "bold 40px monospace"; c.textBaseline = "middle";
      c.fillStyle = "#1a1d22"; c.fillRect(0, 0, 512, 52); c.fillStyle = "#dfe6ea"; c.fillText(title, 12, 28);
      lines.forEach((l, i) => {
        const y = 52 + 8 + i * 46;
        if (i === hi) { c.fillStyle = "#1a1d22"; c.fillRect(0, y, 512, 44); c.fillStyle = "#dfe6ea"; } else c.fillStyle = "#1a1d22";
        c.fillText(l, 14, y + 23);
      });
      scr.tex.needsUpdate = true;
    },
    /** Model Select, laid out as on Shad's radio (photo 7 Nov): a short title bar, "1/12" at the right,
     *  one slot per line "02 FPV DRONE", a star before the model in use, empty slots show only their number.
     *  rows = [[num, name]], hi = index of the cursor row, star = index of the model in use; 7 rows fit */
    modelList(rows, hi, star) {
      const top = Math.max(0, Math.min(rows.length - 7, hi - 5));
      const key = "MODELSEL|" + rows.map(r => r.join(" ")).join("|") + "|" + hi + "|" + star + "|" + top; if (key === shown) return; shown = key;
      const c = scr.canvas.getContext("2d");
      c.fillStyle = "#dfe6ea"; c.fillRect(0, 0, 512, 296); c.textBaseline = "middle";
      c.fillStyle = "#1a1d22"; c.fillRect(8, 4, 200, 34); c.fillStyle = "#dfe6ea"; c.font = "bold 28px monospace"; c.fillText("MODEL SEL", 16, 22);
      c.fillStyle = "#1a1d22"; c.font = "bold 30px monospace"; c.fillText("1/12", 420, 40);
      rows.slice(top, top + 7).forEach(([num, name], j) => {
        const i = top + j, y = 44 + j * 35;
        c.font = "bold 32px monospace";
        if (i === hi) { c.fillStyle = "#1a1d22"; c.fillRect(44, y, name ? 26 + 20 * (num.length + 1 + name.length) : 46, 34); c.fillStyle = "#dfe6ea"; } else c.fillStyle = "#1a1d22";
        c.fillText(num + (name ? " " + name : ""), 50, y + 18);
        if (i === star) { c.fillStyle = "#1a1d22"; c.fillText("*", 16, y + 18); }
      });
      scr.tex.needsUpdate = true;
    },
    /** the main screen, as in Shad's photo: model name big, battery volts, timer, trim bars */
    home(name, timer = "00:00") {
      const key = "HOME|" + name + "|" + timer; if (key === shown) return; shown = key;
      const c = scr.canvas.getContext("2d");
      c.fillStyle = "#dfe6ea"; c.fillRect(0, 0, 512, 296); c.fillStyle = "#1a1d22"; c.strokeStyle = "#1a1d22"; c.lineWidth = 4;
      c.font = "bold 62px Arial"; c.textBaseline = "alphabetic"; c.fillText(name, 60, 70);
      c.fillRect(60, 84, 110, 34); c.fillStyle = "#dfe6ea"; c.font = "bold 28px monospace"; c.fillText("7.7V", 72, 111); c.fillStyle = "#1a1d22";
      c.strokeRect(60, 120, 110, 26);
      [[24, 60, 24, 240], [488, 60, 488, 240], [40, 268, 210, 268], [302, 268, 472, 268]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
      c.font = "bold 40px monospace"; c.fillText(timer, 205, 282);
      scr.tex.needsUpdate = true;
    },
    /** EdgeTX's throttle warning, worded as on Shad's radio (photo, 7 Nov) */
    throttleWarning() {
      const key = "THROTTLE WARNING"; if (key === shown) return; shown = key;
      const c = scr.canvas.getContext("2d");
      c.fillStyle = "#dfe6ea"; c.fillRect(0, 0, 512, 296); c.fillStyle = "#1a1d22"; c.fillRect(20, 20, 472, 120);
      c.fillStyle = "#dfe6ea"; c.font = "bold 48px monospace"; c.fillText("THROTTLE", 150, 70); c.fillText("WARNING", 150, 122);
      c.fillRect(40, 34, 90, 92); c.fillStyle = "#1a1d22"; c.font = "bold 70px Arial"; c.fillText("✋", 46, 108);
      c.font = "bold 34px monospace"; c.fillText("Throttle not idle", 24, 200); c.fillText("Press any key to skip", 24, 256);
      scr.tex.needsUpdate = true;
    },
    /** a small menu box over whatever is on the screen */
    popup(lines, hi) {
      const key = shown + "|POP|" + lines.join("|") + hi; if (shown.includes("|POP|") && shown.endsWith(lines.join("|") + hi)) return;
      const c = scr.canvas.getContext("2d");
      const h = 30 + lines.length * 48; const y0 = (296 - h) / 2;
      c.fillStyle = "#dfe6ea"; c.fillRect(60, y0, 392, h); c.strokeStyle = "#1a1d22"; c.lineWidth = 5; c.strokeRect(60, y0, 392, h);
      c.font = "bold 36px monospace"; c.textBaseline = "middle";
      lines.forEach((l, i) => { const y = y0 + 15 + i * 48; if (i === hi) { c.fillStyle = "#1a1d22"; c.fillRect(66, y, 380, 46); c.fillStyle = "#dfe6ea"; } else c.fillStyle = "#1a1d22"; c.fillText(l, 80, y + 24); });
      shown = key; scr.tex.needsUpdate = true;
    },
    shown: () => shown,
    /** the 2D canvas the screen is drawn on (the practice page shows it big beside the 3D radio) */
    screenCanvas: scr.canvas,
    /** forget what was last drawn, so the next draw always repaints */
    redraw() { shown = ""; },
    size: { W, H, D },
  };
}
