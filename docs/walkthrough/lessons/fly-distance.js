// Fly safely, Step 8: keep your distance. A DIAGRAM built from simple shapes, not a model of a real place.
// In this lesson one unit is one metre (the other lessons use centimetres), so the distances are to scale:
// the circle on the ground is 30 m in radius and the ceiling is 122 m up. The people and the drone are drawn
// bigger than life so they can be seen at this scale; the first step says so.
// Words follow the guide's "Before you fly" rules (index.html): "Keep nobody within 30 m (100 ft) sideways. That is the
// Basic-operations boundary, not a safe distance in itself."; "Stay below 122 m (400 ft) above the ground ... (CAR 901.25)
// ... This is the limit beginners break first."; "Keep the drone in sight. If you fly by a screen, you need a visual
// observer; until then, fly looking at the drone." No other number is drawn or said.
export default {
  T: 33,
  steps: [
    { t0: 0,  text: "<b>Keep nobody within 30 m (100 ft) sideways</b> of the drone. This is a diagram: the distances are to scale, the people and the drone are drawn bigger.",
      why: "That is the Basic-operations boundary, not a safe distance in itself.",
      simple: "No people closer than 30 m, measured along the ground." },
    { t0: 10, text: "<b>Stay below 122 m (400 ft)</b> above the ground.",
      why: "The rule is CAR 901.25. This is the limit beginners break first.",
      simple: "Never higher than 122 m above the ground." },
    { t0: 20, text: "<b>Keep the drone in sight.</b> If you fly by a screen, you need a <b>visual observer</b>.",
      why: "Until you have one, fly looking at the drone.",
      simple: "Eyes on the drone. Flying by a screen needs a visual observer." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    const flat = (geo, color, opacity = 1) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= 1 })); o.rotation.x = -Math.PI / 2; root.add(o); return o; };
    // the ground
    const ground = E.mesh(new THREE.PlaneGeometry(1600, 1600), E.mat(0x8fae7e, { roughness: 0.95 }), root); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    // the 30 m circle around the point under the drone, and a bar along its radius
    flat(new THREE.CircleGeometry(30, 96), 0xc81e1e, 0.13).position.y = 0.03;
    flat(new THREE.RingGeometry(29.75, 30.25, 128), 0xc81e1e).position.y = 0.05;
    const bar = E.mesh(new THREE.BoxGeometry(30, 0.08, 0.35), E.mat(0xb45a00, { roughness: 0.6 }), root); bar.position.set(15, 0.08, 0); bar.castShadow = false;
    for (const x of [0, 30]) { const e = E.mesh(new THREE.BoxGeometry(0.35, 0.08, 2.2), E.mat(0xb45a00, { roughness: 0.6 }), root); e.position.set(x, 0.08, 0); e.castShadow = false; }
    // a person: body and head, drawn bigger than life
    const person = (color, at) => {
      const g = new THREE.Group(); g.position.copy(at); root.add(g);
      E.mesh(new THREE.CylinderGeometry(0.45, 0.6, 3.0, 16), E.mat(color), g).position.y = 1.5;
      E.mesh(new THREE.SphereGeometry(0.55, 20, 14), E.mat(0xe8c9a8), g).position.y = 3.65;
      return g;
    };
    const pilot = person(0x2456b8, V(-6, 0, 2));
    const bystander = person(0xc8641e, V(31.2, 0, 5));
    const observer = person(0x137a3a, V(-6, 0, 5.2));
    const head = g => g.position.clone().add(V(0, 3.65, 0));
    // the drone, drawn bigger than life: two arms, four prop circles, a body
    const drone = new THREE.Group(); root.add(drone);
    for (const a of [Math.PI / 4, -Math.PI / 4]) { const arm = E.mesh(new THREE.BoxGeometry(3.4, 0.16, 0.3), E.M.black, drone); arm.rotation.y = a; }
    E.mesh(new THREE.BoxGeometry(1.5, 0.45, 0.7), E.M.dark, drone).position.y = 0.2;
    for (const [x, z] of [[1.2, 1.2], [1.2, -1.2], [-1.2, 1.2], [-1.2, -1.2]]) { const d = E.mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 28), E.mat(0x6f7882, { transparent: true, opacity: 0.6 }), drone); d.position.set(x, 0.2, z); }
    // straight down from the drone to the ground: "sideways" is measured along the ground
    const drop = E.mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8), E.mat(0x5b6670), root); drop.castShadow = false;
    // the ceiling at 122 m, with a pole up to it
    const CEIL = 122;
    const lid = flat(new THREE.CircleGeometry(30, 96), 0xc81e1e, 0.2); lid.position.y = CEIL;
    const lidEdge = flat(new THREE.RingGeometry(29.6, 30.4, 128), 0xc81e1e); lidEdge.position.y = CEIL;
    const pole = E.mesh(new THREE.CylinderGeometry(0.7, 0.7, CEIL, 12), E.mat(0xb45a00, { roughness: 0.6 }), root); pole.position.set(-30, CEIL / 2, 0); pole.castShadow = false;
    // sight lines from an eye to the drone
    const sight = color => { const l = E.mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 8), new THREE.MeshBasicMaterial({ color }), root); l.castShadow = false; return l; };
    const between = (l, a, b) => { l.position.copy(a).lerp(b, 0.5); l.scale.set(1, a.distanceTo(b), 1); l.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); };
    const sightPilot = sight(0x0a6cff), sightObs = sight(0x137a3a);
    // the pilot's screen (goggles or a monitor), shown while the observer watches the drone
    const screen = E.mesh(new THREE.BoxGeometry(0.9, 0.5, 0.25), E.M.black, root); screen.position.copy(head(pilot)).add(V(0.45, 0.05, 0));
    const near = [V(8, 22, 70), V(1.5, 3, 0)];
    const far = [V(45, 68, 200), V(0, 59, 0)];
    const eyes = [V(-30, 9, 58), V(-2, 14.5, 0)];
    let st = {};
    return {
      cams: [[0, ...near], [9.4, ...near], [10.4, ...far], [19.4, ...far], [20.4, ...eyes], [33, ...eyes]],
      tags: [
        { text: "30 m (100 ft), measured sideways", cls: "red", at: () => V(15, 1.2, 0), from: 1, to: 5.6 },
        { text: "A person: outside the 30 m circle", cls: "blue", at: () => head(bystander).add(V(0, 1.2, 0)), from: 5.8, to: 10 },
        { text: "122 m (400 ft): stay below", cls: "red", at: () => V(0, CEIL + 4, 0), from: 11.2, to: 20 },
        { text: "Keep the drone in sight", cls: "blue", at: () => head(pilot).lerp(drone.position, 0.5), from: 21, to: 26.4 },
        { text: "Flying by a screen: a visual observer", cls: "warn", at: () => head(observer).add(V(0, 1.4, 0)), from: 27.2, to: 33 },
      ],
      update(t) {
        // the drone: low in step 1, up to just under the ceiling in step 2, back down in step 3
        const y = 12 + 96 * prog(t, 11, 16) - 76 * prog(t, 20, 23);
        drone.position.set(0, y, 0);
        drone.scale.setScalar(1 + 2 * (prog(t, 10.4, 11.4) - prog(t, 20.4, 21.4)));   // drawn bigger still in the far view
        drop.position.set(0, y / 2, 0); drop.scale.set(1, y, 1);
        const one = t < 10.4, two = t >= 10.4 && t < 20.4, three = t >= 20.4;
        bystander.visible = !three;
        lid.visible = lidEdge.visible = pole.visible = two;
        const obs = t >= 26.6;
        observer.visible = obs; screen.visible = obs;
        sightPilot.visible = three && !obs; sightObs.visible = obs;
        if (sightPilot.visible) between(sightPilot, head(pilot), drone.position);
        if (obs) between(sightObs, head(observer), drone.position);
        st = { droneHeightM: Math.round(y), belowCeiling: y < CEIL, circleM: 30, bystanderM: Math.round(Math.hypot(bystander.position.x, bystander.position.z) * 10) / 10, observer: obs, view: one ? "circle" : two ? "ceiling" : "sight" };
      },
      state() { return st; },
    };
  },
};
