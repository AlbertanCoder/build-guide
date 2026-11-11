// A plain laptop (the same shape as the one in s3r-sim), with a canvas screen the lessons draw on.
// Screens drawn on it are DRAWINGS of what the guide says to look for, not pictures of real programs.
export function makeLaptop(E, root, at, rotY = 0) {
  const { THREE, V } = E;
  const lap = new THREE.Group(); lap.position.copy(at); lap.rotation.y = rotY; root.add(lap);
  const base = E.mesh(new THREE.BoxGeometry(34, 1.6, 23), E.mat(0x24272c, { roughness: 0.5 }), lap); base.position.y = 0.8;
  E.mesh(new THREE.BoxGeometry(29, 0.1, 10), E.mat(0x15171a), lap).position.set(0, 1.65, -2.5);
  const lid = new THREE.Group(); lid.position.set(0, 1.6, -11.4); lid.rotation.x = -0.2; lap.add(lid);
  E.mesh(new THREE.BoxGeometry(34, 22, 0.8), E.mat(0x24272c, { roughness: 0.5 }), lid).position.y = 11;
  const ct = E.canvasTex(1000, 600, () => {});
  const disp = E.mesh(new THREE.PlaneGeometry(32, 19.2), new THREE.MeshBasicMaterial({ map: ct.tex, toneMapped: false }), lid);
  disp.position.set(0, 11.2, 0.42); disp.castShadow = false;
  void base;
  let drawn = "";
  return {
    group: lap,
    /** world point on the screen: x, y in cm from the screen's centre */
    screenAt: (x = 0, y = 0) => lid.localToWorld(V(x, 11.2 + y, 0.5)),
    /** world point at the laptop's left side (a USB port / card slot) */
    sideAt: () => lap.localToWorld(V(-17.2, 0.9, -4)),
    /** draw once per key: fn(ctx, W, H) */
    draw(key, fn) {
      if (key === drawn) return; drawn = key;
      const c = ct.canvas.getContext("2d");
      c.fillStyle = "#1b2430"; c.fillRect(0, 0, 1000, 600);
      fn(c, 1000, 600);
      c.font = "26px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: real screens may differ)", 30, 580);
      ct.tex.needsUpdate = true;
    },
    shown: () => drawn,
  };
}
/** a terminal: lines of text, newest at the bottom */
export function terminal(c, lines) {
  c.fillStyle = "#0d1014"; c.fillRect(0, 0, 1000, 600);
  c.font = "30px monospace";
  lines.slice(-14).forEach((l, i) => { c.fillStyle = l.startsWith("$") ? "#9be29b" : "#d6dde6"; c.fillText(l, 24, 50 + i * 37); });
}
/** a settings form: title, then [label, value, highlighted] rows */
export function form(c, title, rows) {
  c.fillStyle = "#e9f1ff"; c.font = "bold 48px Arial"; c.fillText(title, 30, 70);
  rows.forEach(([label, value, on], i) => {
    const y = 160 + i * 74;
    c.font = "36px Arial"; c.fillStyle = "#c9d6e6"; c.fillText(label, 30, y);
    if (value) { c.fillStyle = on ? "#1d7cff" : "#2c3846"; c.fillRect(400, y - 40, 570, 56); c.fillStyle = "#fff"; c.fillText(value, 418, y); }
  });
}
