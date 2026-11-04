"""
build_step08_test.py - Step 8 "Test, in this order".

Text (STEP-TRUTH S8, approved wording incl. items 19-22, 27-30): laptop tests; bench power through the smoke
stopper (channels + picture), then stopper OUT, pack direct, arm, throttle up, radio off -> motors stop; Motors
tab props off (reverse a wrong motor there); props-off tilt checks; props on (CW on M1 and M4, CCW on M2 and
M3, battery out while fitting); first 1 m hover, nobody within 30 m, NAV Drone site check; payload on, GPS fix,
heat test with a mug, props OFF (S8.7, before S8.6 on the page since the guide audit card 8); then props back on and
hover again (S8.6). The see-through props appear at S8.4, come off for the heat test and go back on for S8.6.
One pin per action (S8.1 ... S8.7) so the viewer can step through them.
Run:  blender -b --factory-startup -P scripts/build/build_step08_test.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_kit as K
import lib_quad as Q


def mug_and_hand(P, loc):
    """Heat test target (Shad, approved batch C): a mug of water just poured from the kettle, and an open hand
    beside it for comparison (sizes drawn)."""
    x, y, z = loc
    objs = [C.cyl("mug_body", 0.042, 0.095, (x, y, z + 0.0475), mat=P["plastic_white"], seg=14),
            C.cyl("mug_water", 0.038, 0.004, (x, y, z + 0.088), mat=P["vis_magenta"], seg=14),
            C.box("mug_handle", (0.012, 0.030, 0.050), (x + 0.048, y, z + 0.050), mat=P["plastic_white"], bevel=0.004)]
    hx, hy = x - 0.120, y
    objs.append(C.box("hand_palm", (0.085, 0.095, 0.022), (hx, hy, z + 0.011), mat=P["rubber"], bevel=0.008, seg=1))
    for k in range(4):
        objs.append(C.box(f"hand_finger_{k}", (0.070, 0.017, 0.016), (hx - 0.075, hy - 0.033 + k * 0.022, z + 0.009),
                          mat=P["rubber"], bevel=0.0, seg=1))
    objs.append(C.box("hand_thumb", (0.050, 0.018, 0.016), (hx + 0.010, hy + 0.060, z + 0.009), mat=P["rubber"], bevel=0.0, seg=1))
    for ob in objs:
        ob["approx"] = True
    return objs


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))
        Q.propeller(P, f"prop_{name}", (mx, my), ghost=True, spin=Q.SPIN[name])
        C.label(f"{name} {Q.SPIN[name]}", (mx * 1.12, my * 1.12, Q.Z_PROP + 0.012),
                detail="prop with this marking goes here (Betaflight props-in)")
    stack, fc_top = Q.flight_stack(P)
    Q.motor_wires(P)
    Q.battery_lead(P)
    Q.front_camera(P)
    Q.vtx_and_antenna(P, antenna_x=-0.085)
    Q.receiver(P, (-0.030, 0.015, Q.PLATE_T + 0.002))
    Q.pi_payload(P, label_sensors=False)
    Q.legs(P)
    Q.battery_pad(P)
    Q.battery(P, label=False)
    Q.strap(P, Q.BAT[0])
    Q.finder(P)                     # VIFLY Finder 2 in the front bay (S4.9)

    K.laptop(P, (0.050, 0.330, 0.0), lid_angle=105.0)
    K.smoke_stopper(P, (-0.190, -0.040, 0.0055))
    K.radio_pocket(P, (-0.250, 0.150, 0.0))
    K.monitor_skyzone(P, (-0.250, -0.200, 0.0))
    mug_and_hand(P, (0.220, -0.250, 0.0))
    K.arrow(P, "arrow_hover_1m", (0.0, -0.140, 0.080), (0.0, -0.140, 0.160))

    C.label("YOUR LAPTOP (NOT IN THE BOX): SOFTWARE TESTS", (0.050, 0.330, 0.020))
    C.label("SMOKE STOPPER: BENCH POWER-UPS ONLY", (-0.190, -0.040, 0.024), detail="remove before arming or spinning motors")
    C.label("MOTORS TAB: PROPS OFF", (0.0, 0.0, fc_top + 0.012), detail="check number and spin; reverse a wrong motor there")
    C.label("1 M HOVER, NOBODY WITHIN 30 M", (0.0, -0.140, 0.175), detail="certificate, registration, NAV Drone site check first; in Edmonton, private land with the owner's permission")
    C.label("MUG OF HOT WATER + YOUR HAND, PROPS OFF", (0.180, -0.250, 0.130), detail="camera about 50 cm above; the mug is found, the hand is not")

    C.hotspot("S8.1", "8.1 - LAPTOP TESTS", "software tests and the demo", (0.050, 0.330, 0.040), "laptop_")
    C.hotspot("S8.2", "8.2 - BENCH POWER, PROPS OFF", "smoke stopper first; then direct pack for the failsafe test",
              (-0.190, -0.040, 0.040), "smokestopper_,battery_,monitor_")
    C.hotspot("S8.3", "8.3 - MOTORS TAB, PROPS OFF", "number and spin against the diagram", (0.0, 0.0, fc_top + 0.030), "M1_,M2_,M3_,M4_")
    C.hotspot("S8.4", "8.4 - FIT THE PROPS", "CW on M1 and M4, CCW on M2 and M3; battery out while fitting",
              (Q.MOTORS["M4"][0], Q.MOTORS["M4"][1], Q.Z_PROP + 0.030), "prop_")
    C.hotspot("S8.5", "8.5 - FIRST HOVER, NO PAYLOAD", "1 m, land, feel the motors", (0.0, -0.140, 0.190), "frame_")
    C.hotspot("S8.6", "8.6 - PAYLOAD ON, HOVER AGAIN", "GPS fix outdoors first", (-0.030, 0.0, -0.040), "pi_,hat_,thermal_,gps_")
    C.hotspot("S8.7", "8.7 - PAYLOAD ON, HEAT TEST, PROPS OFF", "mount the payload (Step 7); mug of hot water and your hand", (0.180, -0.250, 0.150), "mug_,hand_")

    # ---- clip ----
    # the whole aircraft hangs off one root so the hover is a single channel
    root = C.group("drone_root")
    bench = ("laptop_", "smokestopper_", "radio_", "monitor_", "mug_", "hand_", "arrow_hover")
    for ob in list(C.bpy.context.scene.objects):
        if ob is root or ob.parent is not None or ob.name.startswith(bench) or ob.name.startswith(("LBL_", "HS_")):
            continue
        ob.parent = root
    A.appear(A.named("smokestopper_led"), 1.2, 1.8)
    for name in ("M1", "M2", "M3", "M4"):
        A.spin(A.named(f"{name}_bell"), Q.SPIN[name], 3.0, 5.6, turns=4)
    for name in ("M1", "M2", "M3", "M4"):
        A.appear(A.named(f"prop_{name}_"), 6.0, 6.8)
        A.spin(A.named(f"prop_{name}_"), Q.SPIN[name], 7.2, 9.6, turns=6)
    A._key(root, "location", 0.0, (0, 0, 0))
    A._key(root, "location", 10.0, (0, 0, 0))
    A._key(root, "location", 11.0, (0, 0, 0.060))
    A._key(root, "location", 12.0, (0, 0, 0.060))
    A._key(root, "location", 13.0, (0, 0, 0))
    A.appear(A.named("pi_", "hat_", "thermal_", "gps_"), 13.6, 14.6)
    # props come off again before the heat test (S8.7 says props OFF)
    prop_full = {}                  # full sizes, kept for S8.6 (after a key the object holds the keyed tiny size)
    for ob in A.named("prop_"):
        full = tuple(ob.scale)
        prop_full[ob.name] = full
        A._key(ob, "scale", 14.7, full)
        A._key(ob, "scale", 15.0, (A.TINY,) * 3)
    A.appear(A.named("hand_", "mug_"), 15.2, 16.0)
    # S8.6 comes after the heat test now (page order): mug and hand away, props back on, hover 1 m again
    for ob in A.named("hand_", "mug_"):
        full = tuple(ob.scale)
        A._key(ob, "scale", 16.4, full)
        A._key(ob, "scale", 16.7, (A.TINY,) * 3)
    for ob in A.named("prop_"):
        A._key(ob, "scale", 16.6, (A.TINY,) * 3)
        A._key(ob, "scale", 17.0, prop_full[ob.name])
    A._key(root, "location", 17.4, (0, 0, 0))
    A._key(root, "location", 18.2, (0, 0, 0.060))
    A._key(root, "location", 19.0, (0, 0, 0.060))
    A._key(root, "location", 19.6, (0, 0, 0))
    actions = [
        {"id": "S8.1", "hold": 0.6, "shows": ["laptop_tag"], "hides": ["prop_M1_blades", "pi_pcb"], "time": 0.0, "short": "Laptop tests", "text": "Run the software tests and the demo on the laptop. Open a terminal in the Shad-Drone-Payload folder. Run: python -m unittest -v test_drone_logic.py. It should end with OK. Run: python payload.py --demo. Then run: python payload.py --demo --serve and open http://127.0.0.1:8000 in a browser. You see a plot of fake hotspots, not a map. On Windows: download Python from python.org and install it. Then open a new terminal in the Shad-Drone-Payload folder and type python --version. If that is not recognised, use py instead of python in the commands above. Nothing else needs installing on the laptop: the sensor drivers in requirements.txt are only for the Pi."},
        {"id": "S8.2", "hold": 0.7, "shows": ["smokestopper_body", "smokestopper_led"], "hides": ["prop_M1_blades", "pi_pcb"], "time": 1.2, "short": "Bench power, props off",
         "text": "Bench power test. Props OFF. Before this: you hold the ISED Amateur Radio Operator Certificate (Basic). This is the first time the video transmitter transmits. Radio on. Arm switch off. Plug a charged pack into the smoke stopper. Plug the smoke stopper into the drone. (The smoke stopper is a safety plug that cuts the power at 1.2 A.) Watch the light on the smoke stopper. It must stay green. At the first power-up, check: where the smoke stopper's light is. If it is not green, or you see or smell smoke, unplug at once. The antenna must be screwed on. Watch the video transmitter's light: at start-up it flashes three groups (channel, band, power). The last group, 3 red then 1 blue, means 25 mW, its lowest power. A steady blue light afterwards means it is locked to the legal channels. At the first power-up, check: the VTX light pattern, as in Step 4. Move every stick and switch on the radio. Every channel must respond. Watch Betaflight's Receiver tab: every bar should move as you move each stick and switch. The picture must appear on the monitor. To start it: screw both of the monitor's own antennas on, plug your USB-C power bank into the monitor's USB-C port, short-press the power button and then hold it for 3 seconds, and use auto search to find the video channel. Unplug the pack. Take the smoke stopper off. Spinning motors can draw more than 1.2 A, which would hide the result. Put your safety glasses on. Hold the drone down or put it where it cannot move. Radio on, arm switch off. Plug the pack in directly. Arm. Raise the throttle a little. The motors spin. Switch the radio off. The motors must stop. If they do not, unplug the battery.",
         "focus": [-0.190, -0.040, 0.010], "dist": 0.12},
        {"id": "S8.3", "hold": 1.0, "shows": ["M1_bell"], "hides": ["prop_M1_blades", "prop_M4_blades", "pi_pcb"], "time": 3.0, "short": "Motors tab, props off",
         "text": "Still props OFF and without the smoke stopper. Open Betaflight Configurator. Download it from github.com/betaflight/betaflight-configurator/releases/latest, or use app.betaflight.com in Chrome. Plug in the USB cable and press Connect. Plug in the battery. In the Motors tab, tick the confirmation box. Then raise one motor's slider a little at a time. Check that the motor that spins is the right one: M1 rear right, M2 front right, M3 rear left, M4 front left, seen from above with the camera at the front. Check it spins the way the diagram shows. If a motor spins the wrong way, reverse it with the Motor direction button in the same tab (props off). Lower the sliders. Unplug the battery when you are done. On the laptop, check: does Configurator show a slider for each motor, or only the Master slider?"},
        {"id": "S8.4", "hold": 1.0, "shows": ["prop_M1_blades", "prop_M2_blades", "prop_M3_blades", "prop_M4_blades"], "hides": ["pi_pcb"], "time": 6.0, "short": "Fit the props",
         "text": "Unplug the battery. Fit the props. Each prop has a CW or CCW marking. CW props go on M1 and M4. CCW props go on M2 and M3. M1 is rear right, M2 is front right, M3 is rear left, M4 is front left. Tighten each nut with the prop tool from the tool kit. When the prop tool arrives, check: it fits the Gemfan prop nut. Spin each prop with a finger. It should spin freely and straight. When the props arrive, check: how Gemfan marks CW and CCW on a prop, and which face goes up. Look for the letters on the prop. When the props arrive, check: what to do if a prop has no letters. Look at the manufacturer's page.",
         "focus": [Q.MOTORS["M4"][0], Q.MOTORS["M4"][1], Q.Z_PROP], "dist": 0.12},
        {"id": "S8.5", "hold": 1.5, "shows": ["prop_M1_blades"], "hides": ["pi_pcb"], "time": 10.0, "short": "1 m hover, no payload",
         "text": "First hover of the bare quad (no payload yet). Fly only when all six are true: you hold the Basic drone pilot certificate; you hold the ISED amateur radio certificate (Basic), for the video transmitter; the drone is registered; its registration number is marked on it; the site is in uncontrolled airspace; nobody is within 30 m (100 ft) sideways. Never above 122 m (400 ft) above the ground. If you fly by a screen, you need a visual observer; until then, fly looking at the drone. Put the drone on flat open ground, camera pointing away from you. Radio on, arm switch OFF. Plug in the battery and step back at least 5 m. Arm. Slowly raise the throttle until the drone lifts off, and hold it about 1 metre up for up to 30 seconds. Lower the throttle gently to land. Disarm. Unplug the battery. Touch each motor: they should all feel about the same. If one is much hotter or colder than the others, do not fly again until you have found out why. Landing: Take off and land on a flat board or hard flat ground, not grass: the Pi hangs only about 2.5 cm above the ground. Land straight down and slowly, then disarm as soon as the feet touch. The feet are close together side to side, so if the drone lands leaning or sliding sideways it falls on its side and a prop and an arm hit the ground. After a hard landing, use the “After a hard landing” checklist."},
        {"id": "S8.7", "hold": 2.6, "shows": ["mug_body", "hand_palm", "pi_pcb"], "hides": ["prop_M1_blades", "prop_M2_blades", "prop_M3_blades", "prop_M4_blades"], "time": 13.6, "short": "Payload on, heat test, props off", "text": "Now mount the payload (Step 7). Heat test, props OFF. This test needs no GPS fix: in the SSH window, cd Shad-Drone-Payload, then source .venv/bin/activate, then start the payload in bench mode with python payload.py --bench. It takes the camera as 50 cm above the table and prints every hot spot it finds. Fill a mug with water just poured from the kettle and set it on the table. Hold the drone steady with the thermal camera about 50 cm above the mug. Then put your open hand next to the mug. The payload should report the mug as a hot spot, but not your hand. (A hand is far cooler than the 60 C the detector looks for.) Write down what it prints. If the mug is not found, refill it with fresh hot water and try again at 50 cm."},
        {"id": "S8.6", "hold": 2.0, "shows": ["pi_pcb", "thermal_pcb", "prop_M1_blades"], "hides": [], "time": 16.4, "short": "Hover again with the payload", "text": "Outdoors, with the drone on the ground: turn on your iPhone’s Personal Hotspot (Maximize Compatibility on), power the drone, join the hotspot with the laptop and open the SSH window (ssh username@raspberrypi.local). Start the payload so it keeps running if the Wi-Fi drops: cd Shad-Drone-Payload, then source .venv/bin/activate, then nohup python -u payload.py --serve --heading 0 > run.txt 2>&1 &, then tail -f run.txt to watch what it prints. Wait until it prints: \"Ground height set to ... from the first GPS fix. Fly only after this line appears.\" (The first line, \"nohup: ignoring input\", is normal. Ctrl+C stops only the watching; the payload carries on.) If the SSH window drops, log in again, then cd Shad-Drone-Payload and tail -f run.txt. Once, on the bench with props off, test it: start it this way, turn the hotspot off for 30 seconds, turn it on, log in again and type pgrep -f payload.py. A number means it is still running. Three things the payload assumes, so its map is only right when they are true. Before you take the reading you want to report, turn the drone’s nose to north. Facing any other way, the map puts the hot spot in the wrong place, and the further from north, the bigger the error. To read a hot spot’s position, stop and hover level for a second or two first. In forward flight the positions are metres out. Take off from ground at about the same level as the area you search. (These come from a simulation that runs the payload’s own code, not from the real drone.) Then hover 1 metre again: it should stay level without drifting to one side. After you land: disarm, type sudo poweroff in the SSH window, and wait until the Pi’s light stays off. Only then unplug the pack. Pulling the pack while the Pi runs is a sudden power cut, and that can spoil the card. (How long the Pi takes to stop was not checked: time it the first time.) The line appears in the SSH window on your laptop where you started the payload. Outdoors with a clear sky, the first fix takes about half a minute the first time. The GPS board's light flashes once it has a fix. (The half-minute figure comes from a distributor’s listing, “TTFF 1s/35s”. The maker’s datasheet was not opened.)",
         "focus": [-0.010, 0.0, -0.012], "dist": 0.26, "view": [0.55, -0.55, -0.62]},
    ]
    A.finish("step-08-main", 20.0, actions)

    print("STEP 8 - test in order")
    C.summary()
    C.export("step-08-test", preview=False, animate=True)


build()
