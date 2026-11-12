// Fly safely, Step 7: take off and land on a board.
// Words follow the guide's rule in "Before you fly" (index.html): "Take off and land on a flat board or hard flat ground,
// not grass: the Pi hangs only about 2.5 cm above the ground. Land straight down and slowly, then disarm as soon as the
// feet touch. The feet are close together side to side, so if the drone lands leaning or sliding sideways it falls on its
// side and a prop and an arm hit the ground."
// Parts: docs/models/step-08-test.glb (drone with payload, legs and props). In the model the lowest point of the payload
// (the zip-tie joins under the Pi) is 2.6 cm above the feet, and the feet are 3 cm apart at the front. The tip-over is
// drawn about the right feet until the right arm ends and a right prop reach the board; it shows WHAT happens, not a measured fall.
// The board's size and the grass are a drawing. In the model +x = front, +z = right.
const TIP = 0.59;      // radians: the lean at which the right arm ends and a right prop reach the board (measured on the model: 0 to 1 mm clear)
export default {
  T: 35,
  steps: [
    { t0: 0,  text: "Take off and land on a <b>flat board</b> or <b>hard flat ground</b>, <b>not grass</b>.",
      why: "The Pi hangs only about <b>2.5 cm</b> above the ground.",
      simple: "A board or hard flat ground. Not grass." },
    { t0: 10, text: "Land <b>straight down and slowly</b>, then <b>disarm as soon as the feet touch</b>.",
      simple: "Straight down, slowly. Feet touch: disarm." },
    { t0: 20, text: "The feet are <b>close together side to side</b>. If the drone lands <b>leaning or sliding sideways</b>, it <b>falls on its side</b>, and a prop and an arm hit the ground.",
      why: "If that happens, do the \"After a hard landing\" checklist (its own lesson).",
      simple: "Lean or slide on landing, and it tips over onto a prop and an arm." },
  ],
  async build(E, root) {
    const { THREE, V, prog, clamp01 } = E;
    // open ground, a flat board, and a patch of grass beside it
    const ground = E.mesh(new THREE.BoxGeometry(1400, 0.4, 1400), E.mat(0xb3ab8f, { roughness: 0.95 }), root); ground.position.set(-40, -0.2, 0); ground.castShadow = false;
    const BOARD = 1.2;
    E.mesh(new THREE.BoxGeometry(60, BOARD, 60), E.mat(0xc9a66b, { roughness: 0.8 }), root).position.y = BOARD / 2;
    const GX = -80;
    const turf = E.mesh(new THREE.BoxGeometry(72, 0.3, 62), E.mat(0x4f7a3a, { roughness: 1 }), root); turf.position.set(GX, 0.15, 0); turf.castShadow = false;
    const N = 900, blade = new THREE.ConeGeometry(0.3, 1, 4); blade.translate(0, 0.5, 0);
    const grass = new THREE.InstancedMesh(blade, E.mat(0xffffff, { roughness: 0.9 }), N);
    const o = new THREE.Object3D(), col = new THREE.Color(); let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      o.position.set(GX + (rnd() - 0.5) * 68, 0.2, (rnd() - 0.5) * 58);
      o.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3.14, (rnd() - 0.5) * 0.5);
      o.scale.set(1, 5 + rnd() * 3.5, 1);
      o.updateMatrix(); grass.setMatrixAt(i, o.matrix);
      grass.setColorAt(i, col.setHSL(0.27 + rnd() * 0.06, 0.5, 0.3 + rnd() * 0.12));
    }
    grass.receiveShadow = true; root.add(grass);
    const Y0 = BOARD + 5.6;                           // the rear feet stand on the board
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, Y0, 0),
      hide: /^(campose_|cone_|HS_|arrow_|radio_|battery_pack_liion|smokestopper_|monitor_|LBL_|mug_|hand_|laptop_tag)/ });
    const droneRoot = m.n("drone_root"), p0 = droneRoot.position.clone(), q0 = droneRoot.quaternion.clone();
    const Yax = V(0, 1, 0);
    const props = [1, 2, 3, 4].map(i => {
      const hub = m.home(`prop_M${i}_hub`).p.clone(), bl = m.n(`prop_M${i}_blades`), bh = m.home(`prop_M${i}_blades`);
      return { i, bl, off: bh.p.clone().sub(hub), hub, q: bh.q.clone(), a: 0 };
    });
    const turn = (pr, a) => { pr.bl.position.copy(pr.hub).add(pr.off.clone().applyAxisAngle(Yax, a)); pr.bl.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(Yax, a)).multiply(pr.q); };
    const feet = m.all(/^leg_.*_foot$/);
    const glowFeet = on => feet.forEach(f => f.traverse(x => { if (x.isMesh) { x.material.emissive = new THREE.Color(0x1d7cff); x.material.emissiveIntensity = on ? 0.7 : 0; } }));
    // the gap under the Pi: a bar from the board up to the payload's lowest point
    const lowest = Y0 - 3.0;
    const gap = new THREE.Group(); root.add(gap);
    const orange = E.mat(0xb45a00, { roughness: 0.6 });
    E.mesh(new THREE.BoxGeometry(0.16, lowest - BOARD, 0.16), orange, gap).position.set(-3.9, (lowest + BOARD) / 2, 2.7);
    E.mesh(new THREE.BoxGeometry(1.1, 0.12, 0.16), orange, gap).position.set(-3.9, lowest, 2.7);
    E.mesh(new THREE.BoxGeometry(1.1, 0.12, 0.16), orange, gap).position.set(-3.9, BOARD + 0.06, 2.7);
    // how far apart the front feet stand: a bar on the board in front of them
    const span = E.mesh(new THREE.BoxGeometry(0.5, 0.12, 3.8), orange, root); span.position.set(8.2, BOARD + 0.06, 0);
    const PIV = { y: -0.055, z: 0.0175 };            // model metres: the outer edge of the right feet
    const wide = [V(-36, 70, 132), V(-43, 2, 0)];
    const gapCam = [V(-3.5, BOARD + 2.6, 24), V(-3.5, BOARD + 3.0, 0)];
    const sideFar = [V(8, 24, 74), V(0, 19, 0)];
    const front = [V(40, Y0 + 4, -5), V(0, Y0 + 0.5, 0)];        // the drone standing, seen from the front
    const fall = [V(48, Y0 + 5, -2), V(0, Y0 + 0.5, 10)];         // room on the right side for the slide and the fall
    const dronePos = up => droneRoot.getWorldPosition(new THREE.Vector3()).add(V(0, up, 0));
    const rightArms = [m.n("frame_arm_M1"), m.n("frame_arm_M2")], rightFeet = [m.n("leg_front_1_foot"), m.n("leg_rear_1_foot")], rightProps = [m.n("prop_M1_blades"), m.n("prop_M2_blades")];
    const lowY = list => Math.round((Math.min(...list.map(o => new THREE.Box3().setFromObject(o, true).min.y)) - BOARD) * 10) / 10;   // cm above the board
    let lastT = 0, st = {}, feetLit = false;
    return {
      cams: [[0, ...wide], [3.8, ...wide], [4.8, ...gapCam], [9.4, ...gapCam], [10.4, ...sideFar], [19.4, ...sideFar], [20.4, ...front], [24.8, ...front], [25.8, ...fall], [35, ...fall]],
      tags: [
        { text: "A flat board or hard flat ground", cls: "good", at: () => V(0, Y0 + 8, 0), from: 0.6, to: 4.2 },
        { text: "Not grass", cls: "red", at: () => V(GX, 12, 0), from: 0.6, to: 4.2 },
        { text: "The Pi: about 2.5 cm above the ground", cls: "warn", at: () => V(-12.5, lowest + 0.2, 2.7), from: 5.4, to: 10 },
        { text: "Straight down, slowly", cls: "blue", at: () => dronePos(9), from: 12.6, to: 17.6 },
        { text: "Feet touch: disarm", cls: "good", at: () => dronePos(9), from: 17.8, to: 20 },
        { text: "Feet close together side to side", cls: "warn", at: () => V(5.3, Y0 + 8, 0), from: 21, to: 24.4 },
        { text: "Leaning, sliding sideways", cls: "warn", at: () => dronePos(9), from: 26, to: 28.4 },
        { text: "On its side: a prop and an arm hit the ground", cls: "red", at: () => dronePos(16), from: 29.8, to: 35 },
      ],
      update(t) {
        let h = 0, z = 0, lean = 0, spin = false;
        if (t >= 10 && t < 20) {            // up, then straight down and slowly; feet touch at 17.6 s, disarmed at 17.9 s
          h = 0.35 * (prog(t, 10, 11.6) - prog(t, 12.6, 17.6)); spin = t < 17.9;
        } else if (t >= 24.6) {             // up again; this time it comes down leaning and sliding to the right
          const down = prog(t, 26, 28.4), tip = clamp01((t - 28.4) / 1.1);
          h = 0.14 * (prog(t, 24.6, 25.8) - down);
          z = 0.14 * down;
          lean = 0.14 * prog(t, 25.8, 27.4) + (TIP - 0.14) * tip * tip;
          spin = t < 28.7;
        }
        // lean about the right feet (the pivot stays where it is)
        const c = Math.cos(lean), s = Math.sin(lean);
        droneRoot.quaternion.copy(q0); droneRoot.rotateX(lean);
        droneRoot.position.copy(p0).add(V(0, h + PIV.y - (PIV.y * c - PIV.z * s), z + PIV.z - (PIV.y * s + PIV.z * c)));
        const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
        props.forEach(pr => { pr.a += (pr.i === 1 || pr.i === 4 ? -1 : 1) * (spin ? 40 : 0) * dt; turn(pr, pr.a); });
        gap.visible = t >= 4.4 && t < 10;
        span.visible = t >= 20.4 && t < 24.6;
        const lit = t >= 20.6 && t < 24.6; if (lit !== feetLit) { feetLit = lit; glowFeet(lit); }
        st = { heightCm: Math.round(h * 100), slideCm: Math.round(z * 100), leanDeg: Math.round(lean * 180 / Math.PI), propsTurning: spin, onItsSide: lean >= TIP - 1e-6 };
      },
      // for the checks: how far the right feet, the right arms and the right props are above the board, measured on the drawn parts
      state() { droneRoot.updateMatrixWorld(true); return { ...st, aboveBoardCm: { rightFeet: lowY(rightFeet), rightArms: lowY(rightArms), rightProps: lowY(rightProps) } }; },
    };
  },
};
