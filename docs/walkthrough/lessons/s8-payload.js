// Step 8, items 9-10 (S8.7 heat test, S8.6 the payload outdoors), with Step 8's safety line and "Before you go on".
// The page does S8.7 before S8.6. Words follow the guide (index.html, after the 10 Nov audit).
// Parts: docs/models/step-08-test.glb (drone with payload and legs, mug, hand, small laptop). The laptop's terminal is a
// DRAWING: it shows only the commands and the one line the guide quotes; the payload's real hot-spot printout is not
// drawn (he writes down what it prints). The Pi and GPS lights are small spheres; the guide gives no colours for them.
// North: the arrow on the ground is "north" for this drawing; +x = the drone's nose.
const GROUND = "Ground height set to ... from the first GPS fix. Fly only after this line appears.";
export default {
  T: 84,
  steps: [
    { t0: 0,  text: "Now mount the payload (Step 7). <b>Heat test, props OFF</b>: take the props off first. Radio on, arm switch off, then plug in a charged pack: it powers the Pi through its lead. Turn on your iPhone's hotspot, join it with the laptop and open the SSH window. This test needs no GPS fix: in the SSH window, <code>cd Shad-Drone-Payload</code>, then <code>source .venv/bin/activate</code>, then start the payload in bench mode: <code>python payload.py --bench</code>.",
      why: "Bench mode takes the camera as 50 cm above the table and prints every hot spot it finds.",
      simple: "Props off. Radio on, arm off, pack in. Hotspot, SSH, cd, activate, python payload.py --bench." },
    { t0: 7,  text: "Fill a mug with water <b>just poured from the kettle</b> and set it on the table. Hold the drone steady with the thermal camera about <b>50 cm above the mug</b>. Then put your <b>open hand next to the mug</b>. The payload should report the <b>mug as a hot spot, but not your hand</b>. <b>Write down what it prints.</b>",
      why: "A hand is far cooler than the 60 C the detector looks for. If the mug is not found, refill it with fresh hot water and try again at 50 cm.",
      simple: "Hot mug, drone 50 cm above it, hand beside it: the mug is found, the hand is not. Write it down." },
    { t0: 19, text: "<b>Battery out. Fit the props again</b>, as in item 5. Outdoors, with the drone on the ground: turn on your iPhone's <b>Personal Hotspot</b> (Maximize Compatibility on), power the drone, join the hotspot with the laptop and open the SSH window (<code>ssh username@raspberrypi.local</code>).",
      why: "The laptop reaches the Pi over the phone's hotspot, at the field as at home.",
      simple: "Props back on. Hotspot on, drone on, laptop on the hotspot, SSH in." },
    { t0: 26, text: "Start the payload so it keeps running if the Wi-Fi drops: <code>cd Shad-Drone-Payload</code>, <code>source .venv/bin/activate</code>, then <code>nohup python -u payload.py --serve --heading 0 > run.txt 2>&1 &</code>, then <code>tail -f run.txt</code>. <b>Wait until it prints</b>: \"" + GROUND + "\"",
      why: "The first line, \"nohup: ignoring input\", is normal. Ctrl+C stops only the watching; the payload carries on. If the SSH window drops, log in again, then cd Shad-Drone-Payload and tail -f run.txt.",
      simple: "Start it with nohup, watch run.txt, wait for the Ground height line." },
    { t0: 36, text: "Once, on the bench with props off, test it: start it this way, <b>turn the hotspot off for 30 seconds</b>, turn it on, log in again and type <code>pgrep -f payload.py</code>. <b>A number</b> means it is still running.",
      why: "This proves a Wi-Fi drop in the field won't stop the payload.",
      simple: "Bench test: hotspot off 30 s, back on, pgrep: a number = still running." },
    { t0: 42, text: "Three things the payload assumes: before the reading you want to report, <b>turn the drone's nose to north</b>; to read a hot spot's position, <b>stop and hover level</b> for a second or two first; <b>take off from ground at about the same level</b> as the area you search.",
      why: "Facing any other way, the map puts the hot spot in the wrong place, and the further from north, the bigger the error. In forward flight the positions are metres out. These come from a simulation that runs the payload's own code, not from the real drone.",
      simple: "Nose north, hover level, take off at the search area's level." },
    { t0: 51, text: "<b>Landing</b>, now that the payload and the legs are on: take off and land on a <b>flat board or hard flat ground, not grass</b>. Land <b>straight down and slowly</b>, then disarm as soon as the feet touch. Then <b>hover 1 metre</b> again: it should stay <b>level without drifting</b> to one side.",
      why: "The Pi hangs only about 2.5 cm above the ground. The feet are close together side to side, so a drone that lands leaning or sliding sideways falls on its side, and a prop and an arm hit the ground. After a hard landing, use the \"After a hard landing\" checklist (the next lesson). With the payload on, a drift shows the balance or a sensor is off.",
      simple: "Hard flat ground. 1 m hover: level, no drift. Land straight down, slowly." },
    { t0: 56, text: "After you land: <b>disarm</b>, type <code>sudo poweroff</code> in the SSH window, and <b>wait until the Pi's light stays off</b>. Only then unplug the pack.",
      why: "Pulling the pack while the Pi runs is a sudden power cut, and that can spoil the card. (How long the Pi takes to stop was not checked: time it the first time.)",
      simple: "Disarm, sudo poweroff, wait for the Pi's light to go out, then unplug." },
    { t0: 63, text: "Outdoors with a clear sky, the <b>first fix takes about half a minute</b> the first time. The <b>GPS board's light flashes</b> once it has a fix.",
      why: "The half-minute figure comes from a distributor's listing (\"TTFF 1s/35s\"); the maker's datasheet was not opened.",
      simple: "About 30 s for the first fix. The GPS light flashes when it has one." },
    { t0: 68, text: "Optional, after the payload works (only if you bought the spray): spray the flight controller, speed controller, receiver, VTX, Pi and HAT 2 to 3 times, everything plugged in first. <b>Do not spray</b> the thermal camera's window, the FPV camera lens, the USB sockets, the microSD slot, the buttons, the barometer or the GPS board's antenna. <b>Weigh before and after</b>: more than 9 g gained, ask before flying.",
      why: "The balance may change.",
      simple: "Optional spray: boards only, not lenses, sockets, buttons or the GPS antenna. Weigh before and after." },
    { t0: 76, text: "<b>Never near a wildfire</b>: the law says 5 nautical miles (9.3 km). Only controlled targets on private land with permission. Read the Before you fly card first. <b>Before you go on:</b> you have written results before you say \"it detects\".",
      why: "Step 8's safety line and its check.",
      simple: "No wildfires. Private land. Write results down before claiming it works." },
  ],
  async build(E, root) {
    const { THREE, V, prog } = E;
    E.makeBench(root, { wall: false });
    const m = await E.loadStepModel(root, "step-08-test.glb", { at: V(0, 5.8, 0),
      hide: /^(campose_|cone_pilot|HS_|arrow_|radio_|battery_pack_liion|smokestopper_|monitor_|LBL_)/ });
    const show = (re, on) => m.all(re).forEach(o => { o.visible = on; });
    // the mug and the hand rest at scale 0.001 in the model (its own animation grows them in): full size here
    m.all(/^mug_|^hand_/).forEach(o => o.scale.setScalar(1));
    const droneRoot = m.n("drone_root"), dHome = droneRoot.position.clone(), dQ = droneRoot.quaternion.clone();
    // the model stands on its legs at y 5.8 cm; the mug, hand and laptop are on the table (the model's own y, lifted 5.8 cm)
    const lift = V(0, -0.058, 0);
    for (const n of ["mug_body", "mug_handle", "mug_water", "hand_palm", "hand_thumb", "laptop_tag"]) if (m.has(n)) m.shift(new RegExp("^" + n), lift);
    m.shift(/^hand_finger/, lift);
    // laptop screen
    const face = m.n("laptop_tag_screen_face");
    const lt = E.canvasTex(1060, 620, () => {});
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.106, 0.062), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false }));
    disp.position.z = 0.0006; face.add(disp);
    let lapKey = "";
    const term = (key, lines) => { if (key === lapKey) return; lapKey = key; const c = lt.canvas.getContext("2d"); c.fillStyle = "#0d1014"; c.fillRect(0, 0, 1060, 620);
      c.font = "28px monospace"; lines.forEach((l, i) => { c.fillStyle = l.startsWith("$") ? "#9be29b" : "#d6dde6"; c.fillText(l, 20, 50 + i * 40); });
      c.font = "24px Arial"; c.fillStyle = "#9fb3c8"; c.fillText("(a drawing: real screens may differ)", 20, 600); lt.tex.needsUpdate = true; };
    // the Pi's light and the GPS board's light (children of drone_root, whose units are metres: radius 4 mm, so they can be seen)
    const led = (at, color) => { const s = E.mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: color, emissiveIntensity: 0 }), droneRoot); s.position.copy(droneRoot.worldToLocal(at)); return s; };
    const piLed = led(m.at("pi_pcb").add(V(2.2, -0.35, 1.6)), 0x33ff66), gpsLed = led(m.at("gps_pcb").add(V(-0.8, 0.3, 0.6)), 0x66ccff);
    // north arrow on the ground, ahead of the drone
    const north = new THREE.Group(); root.add(north); north.position.set(10, 0.05, -17);   // beside the nose, inside the top view
    E.mesh(new THREE.BoxGeometry(10, 0.1, 0.8), E.mat(0xd23c3c), north).position.x = 0;
    const nh = E.mesh(new THREE.ConeGeometry(1.4, 3, 3), E.mat(0xd23c3c), north); nh.rotation.z = -Math.PI / 2; nh.position.x = 6.4;
    const nl = E.canvasTex(128, 128, c => { c.fillStyle = "#d23c3c"; c.font = "bold 100px Arial"; c.fillText("N", 26, 104); });
    const nt = E.mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: nl.tex, transparent: true }), north); nt.rotation.x = -Math.PI / 2; nt.position.set(9.6, 0.1, 0);
    north.visible = false;
    const mug = m.at("mug_water");
    const ov = [V(-30, 40, 60), V(8, 10, 8)];
    const mugMid = [mug.clone().add(V(-31, 39, 95)), mug.clone().add(V(-6, 24, 0))];   // drone, mug and hand in one picture
    const gpsCam = [m.at("gps_pcb").add(V(7, 8, 10)), m.at("gps_pcb")];
    const lapCam = [m.at("laptop_tag_screen_face").add(V(0, 3.5, 13)), m.at("laptop_tag_screen_face").add(V(0, 0.4, 0))];
    const far = [V(-230, 60, 140), V(-20, 50, 0)];
    const piCam = [V(-14, 8, 22), V(-3, 4, 0)];
    const topCam = [V(-9, 56, 0), V(6, 2, -4)];
    let st = {};
    return {
      cams: [[0, ...lapCam], [6.4, ...lapCam], [7.4, ...mugMid], [18.4, ...mugMid], [19.4, ...ov], [25.4, ...ov], [26.4, ...lapCam], [41.4, ...lapCam], [42.4, ...topCam], [50.4, ...topCam],
        [51.4, ...far], [55.4, ...far], [56.4, ...piCam], [62.4, ...piCam], [63.4, ...gpsCam], [67.4, ...gpsCam], [68.4, ...ov], [83, ...ov]],
      tags: [
        { text: "Props OFF", cls: "red", at: () => m.at("laptop_tag_screen_face").add(V(0, 3.4, 0)), from: 0.5, to: 7 },
        { text: "Thermal camera about 50 cm above the mug", cls: "blue", at: () => m.at("thermal_lens").add(V(0, -24, 0)), from: 10.2, to: 19 },
        { text: "Mug: a hot spot", cls: "good", at: () => m.at("mug_water").add(V(4, 6, 0)), from: 12, to: 19 },
        { text: "Hand: not a hot spot", cls: "warn", at: () => m.at("hand_palm").add(V(-3, 2.5, 0)), from: 13, to: 19 },
        { text: "Props back on; hotspot on", cls: "blue", at: () => V(0, 16, 0), from: 20, to: 26 },
        { text: "Wait for the Ground height line", cls: "warn", at: () => m.at("laptop_tag_screen_face").add(V(0, 3.4, 0)), from: 31, to: 36 },
        { text: "pgrep: a number = still running", cls: "good", at: () => m.at("laptop_tag_screen_face").add(V(0, 3.4, 0)), from: 38.5, to: 42 },
        { text: "Nose to north", cls: "blue", at: () => north.position.clone().add(V(4, 2, 0)), from: 43, to: 47 },
        { text: "Hover level a second or two", cls: "blue", at: () => V(0, 16, 0), from: 47.2, to: 51 },
        { text: "1 m: level, no drift", cls: "good", at: () => droneRoot.getWorldPosition(new THREE.Vector3()).add(V(0, 12, 0)), from: 52.5, to: 55.5 },
        { text: "sudo poweroff; wait for the Pi's light to stay off", cls: "warn", at: () => piLed.getWorldPosition(new THREE.Vector3()).add(V(0, -3.4, 0)), from: 57, to: 63 },
        { text: "GPS light flashes = fix", cls: "good", at: () => gpsLed.getWorldPosition(new THREE.Vector3()).add(V(0, 1.6, 0)), from: 64, to: 68 },
        { text: "Not the lenses, sockets, buttons or GPS antenna", cls: "red", at: () => V(0, 18, 0), from: 69, to: 76 },
        { text: "Never near a wildfire (9.3 km)", cls: "red", at: () => V(0, 25, 0), from: 76.6, to: 84 },
        { text: "Written results before \"it detects\"", cls: "warn", at: () => V(0, 13, 0), from: 78, to: 84 },
      ],
      update(t) {
        // props: off for the heat test, back on from 20 s
        show(/^prop_/, t >= 20);
        // the drone is held about 50 cm above the mug (thermal lens over the water), then set down
        const held = prog(t, 8, 10) * (1 - prog(t, 19, 19.9));   // still held on the frame the player stops on (18.999 s)
        const over = V((mug.x - 1.1) / 100, (50 + mug.y - 5.8 + 0.8) / 100, mug.z / 100);    // model metres: lens x +1.1 cm, lens 0.8 cm under the root
        droneRoot.position.copy(dHome).lerp(over, held);
        show(/^mug_/, t >= 7.5 && t < 19.5);
        show(/^hand_/, t >= 12.5 && t < 19.5);
        show(/^cone_thermal/, t >= 9.5 && t < 19);
        // the field hover with the nose to north, then the 1 m hover
        north.visible = t >= 42.5 && t < 56;
        droneRoot.quaternion.copy(dQ);
        droneRoot.rotateY(0.9 * (1 - prog(t, 43.5, 46)) * (t >= 42.5 && t < 47 ? 1 : 0));
        const up = prog(t, 51.5, 53) * (1 - prog(t, 54.5, 55.8));
        if (held === 0) droneRoot.position.copy(dHome).add(V(0, 1.0 * up, 0));
        // lights: the Pi's light is on while it runs (until poweroff at 57.5 s, off by 60 s); the GPS flashes once it has a fix
        // picture check 11 Nov, row 17: the GPS light flashes from the fix (31 s) until the Pi is off; step 9 (63.4-68 s)
        // shows a powered payload with a fix again, in a close view of the GPS board
        const piOn = t >= 20 && t < 59.5 || t < 19 || (t >= 63.4 && t < 68);
        piLed.material.emissiveIntensity = piOn ? 1.6 : 0;
        const fix = (t >= 31 && t < 59.5) || (t >= 64 && t < 68);
        gpsLed.material.emissiveIntensity = fix && Math.floor(t * 2) % 2 === 1 ? 2 : 0;   // lit on the frames the player stops on
        // laptop
        if (t < 7) term("bench", ["$ cd Shad-Drone-Payload", "$ source .venv/bin/activate", "$ python payload.py --bench"]);
        else if (t < 19) term("bench2", ["$ python payload.py --bench", "(it prints every hot spot it finds:", " write down what it prints)"]);
        else if (t < 26) term("ssh", ["$ ssh username@raspberrypi.local"]);
        else if (t < 31) term("nohup", ["$ cd Shad-Drone-Payload", "$ source .venv/bin/activate", "$ nohup python -u payload.py --serve --heading 0 > run.txt 2>&1 &", "$ tail -f run.txt", "nohup: ignoring input"]);
        else if (t < 36) term("ground", ["$ tail -f run.txt", "nohup: ignoring input", "...", "Ground height set to ... from the first GPS fix.", "Fly only after this line appears."]);
        else if (t < 42) term("pgrep", ["(bench, props off: hotspot off 30 s, then on)", "$ ssh username@raspberrypi.local", "$ pgrep -f payload.py", "(a number = still running)"]);
        else if (t < 57) term("idle", ["$ tail -f run.txt"]);
        else term("poweroff", ["$ sudo poweroff"]);
        st = { props: t >= 20, heldOverMug: held > 0.99, lensAboveWaterCm: Math.round((m.at("thermal_lens").y - mug.y) * 10) / 10, hand: t >= 12.5 && t < 19.5,
               laptop: lapKey, north: north.visible, hover: up > 0.99, piLight: piOn, gpsFlashing: fix };
      },
      state() { return st; },
    };
  },
};
