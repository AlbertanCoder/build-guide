"""
build_step07_mount.py - Step 7 "Mount and balance" (props still off).

Text (STEP-TRUTH S7, approved wording incl. items 16-18): payload fitted only after the first hover; lens needs
a clear line straight down; Pi on nylon standoffs + zip ties + the Kevlar strap as second lock; MLX fixed by its
two holes; pigtail from a 5V/GND pad pair on the FC to the Pi's power socket; cables out of the prop circles;
battery on the grip pad, strapped with the second Kevlar strap, balanced on the centre.
The payload LAYOUT is not confirmed (S7.3), so every payload part is drawn greyed 'planned'. Landing legs are
not chosen, so none are drawn. The top plate is shown because the battery sits on it (change request 32).
Run:  blender -b --factory-startup -P scripts/build/build_step07_mount.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_kit as K
import lib_quad as Q
import parts as S


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))
    stack, fc_top = Q.flight_stack(P)
    Q.motor_wires(P)
    Q.battery_lead(P)
    Q.front_camera(P)
    Q.vtx_and_antenna(P, antenna_x=-0.085)
    Q.receiver(P, (-0.030, 0.015, Q.PLATE_T + 0.002))

    payload = Q.pi_payload(P, label_sensors=False)
    # the second lock: a Kevlar strap round the Pi and the bottom plate (zip ties come with the payload builder)
    pi_x = S.mm(S.LAYOUT["pi_x"])
    lock = [C.box("pi_strap_second_lock", (S.mm(S.STRAP["w"]), 0.040, 0.0012), (pi_x - 0.012, 0.0, Q.PI_POWER[2] - 0.016),
                  mat=P["strap"])]

    # pigtail: FC 5V/GND pads -> round the plate edge -> the Pi's power socket (route drawn, keep it tied down)
    px, py = Q.fc_pad("5V_pi")
    pp = Q.PI_POWER
    pig = [C.tube("pigtail_5v", [(px, py, fc_top), (px - 0.010, -0.0265, Q.Z_MID_TOP + 0.003), (pp[0], -0.0265, -0.004),
                                 (pp[0], pp[1] - 0.004, pp[2])], 0.0011, P["wire_red"], res=6, solder="a")]   # soldered on the FC 5V pad

    # battery on the grip pad, strapped with the second Kevlar strap
    Q.battery_pad(P)
    Q.battery(P, label=False)
    # Shad's second pack (More Volts 4S 5000 Li-ion, 79 x 44 x 44 mm) as a see-through outline where the LiPo sits:
    # the same grip pad and strap; its name starts with battery_pack so it hides, shows and slides with the LiPo
    Q.battery_liion(P, ghost=True, label=False)
    Q.strap(P, Q.BAT[0])

    for name, (mx, my) in Q.MOTORS.items():
        Q.clearance_ring(P, f"clearance_{name}", (mx, my))
    Q.legs(P)
    K.cg_marker(P, (0.0, 0.0, Q.Z_TOP_TOP + S.mm(S.PACK["h"]) + 0.004), radius=0.014)

    C.label("PAYLOAD: SIMULATED LAYOUT (APPROVED), CHECK WITH THE REAL PARTS", (pi_x, 0.0, -0.040),
            detail="Pi 36 mm behind the stack, thermal camera just ahead, lens straight down")
    C.label("FOAM PAD + NYLON STANDOFFS", (pi_x - 0.030, 0.012, -0.008), detail="no drilling")
    C.label("ZIP TIES THROUGH THE PLATE WINDOWS", (pi_x, 0.026, 0.004))
    C.label("KEVLAR STRAP: SECOND LOCK ON THE PI", (pi_x - 0.012, -0.024, -0.034))
    C.label("MICRO-USB PIGTAIL FROM THE FC 5V PAD", (-0.010, -0.030, 0.006))
    C.label("BATTERY ON THE GRIP PAD + KEVLAR STRAP", (0.0, 0.0, Q.Z_TOP_TOP + 0.040))
    C.label("BALANCE ON THE CENTRE", (0.0, -0.030, Q.Z_TOP_TOP + 0.032))
    C.label("LI-ION PACK: 44 MM TALL, SAME STRAP", (0.0, 0.030, Q.Z_TOP_TOP + 0.056),
            detail="about 2 mm from the GPS: measure on arrival")
    C.label("KEEP CABLES OUT OF THE PROP CIRCLES", (Q.MOTORS["M4"][0], Q.MOTORS["M4"][1], Q.Z_PROP + 0.010))
    C.label("MLX90640 LENS DOWN, PA1010D ANTENNA UP", (0.010, 0.0, -0.024))
    C.label("LANDING LEGS (PLANNED): AT LEAST 40 MM", (0.053, 0.015, -0.050),
            detail="2 stacked M3 standoffs + rubber foot, in the frame's spare standoff holes; the payload's lowest part is about 29 mm below the plate")

    # ---- clip ----
    A.slide(A.named("pi_", "hat_", "thermal_", exclude=("pi_strap",)), (0, 0, -0.040), 1.2, 2.6)
    A.slide(A.named("gps_", exclude=("gps_cable",)), (0, 0, 0.040), 1.2, 2.6)
    A.appear(A.named("gps_cable"), 1.2, 2.6)
    A.appear(A.named("zip_tie_", "pi_strap_second_lock"), 3.0, 4.0)
    A.appear(A.named("pigtail_5v"), 4.4, 5.4)
    A.appear(A.named("clearance_"), 5.8, 6.6)
    A.slide(A.named("battery_", "strap_"), (0, 0, 0.050), 7.0, 8.4)
    A.appear(A.named("cg_"), 8.8, 9.6)
    A.appear(A.named("leg_"), 9.8, 10.6)
    actions = [
        {"id": "S7.1", "hold": 0.6, "shows": ["frame_bottom_plate"], "hides": ["pi_pcb", "battery_pack"], "time": 0.0, "short": "Payload only after the first hover",
         "text": "Do not fit the payload to the drone until the bare drone has made its first hover (item 8 in Step 8). The payload is the Pi, the thermal camera and the GPS. The bare drone is the drone without them. Do the bullets marked NOW first. Then go to Step 8 and finish item 8. Come back here for the bullets marked AFTER THE FIRST HOVER."},
        {"id": "S7.3", "hold": 1.5, "shows": ["pi_pcb", "thermal_pcb", "gps_pcb", "gps_cable_wire_blue"], "hides": ["battery_pack"], "time": 1.2, "short": "Pi 36 mm behind the stack, on a pad; GPS cable route",
         "text": "NOW hold the parts in place now; AFTER THE FIRST HOVER fix them. Under the bottom plate, centre the Pi 36 mm behind the stack centre. Make the pad from two layers of the foam mounting tape (on the Stage 4 list), stuck to the plate. Leave the backing on the outer layer, so the standoffs rest on it without sticking. Put a 1 cm square of the same tape under each of the Pi's four standoffs. The pad stops the board touching carbon, and you do not need to drill the plate. When the tape arrives, check: its thickness, and that two layers stay put under the zip ties. Stick the MLX90640 to the pad, just ahead of the Pi, with a square of the foam mounting tape on the back of the board. The lens points straight down. Its wide side runs across the drone. When the thermal camera arrives, check: the back of the board is flat enough for tape. Stick the PA1010D to the top plate in front of the battery with a strip of the foam mounting tape, so the board does not touch the carbon. The antenna points up. When the GPS board arrives, check: the back of the board is flat enough for tape. Hold the real parts in place first: these positions come from a design simulation, not a test fit. Run the GPS cable along the drone's right-hand side (right as seen from the tail looking forward): from the HAT up through the bottom plate's window next to the Pi, over the flight controller, and round the front edge of the top plate to the GPS. If a stack screw head or tip sticks out under the bottom plate, cut a small hole in the pad there so the pad lies flat.",
         "focus": [-0.020, 0.0, -0.016], "dist": 0.22, "view": [0.55, -0.55, -0.62]},
        {"id": "S7.4", "hold": 1.1, "shows": ["zip_tie_", "pi_strap_second_lock", "pi_standoff_"], "hides": ["battery_pack"], "time": 3.0, "short": "Zip ties through the windows, strap",
         "text": "AFTER THE FIRST HOVER Use the two slots on the bottom plate's centre line just behind the stack (about 3 and 5 cm behind it). For each slot, make a long zip tie by joining two of the 100 mm zip ties end to end. Thread it up through one end of the slot, across the top of the plate, and back down through the other end of the same slot, then round under the Pi. Pull it snug and cut the tail flush. (A cut tail is sharp.) Then add the second Kevlar strap round the Pi and the plate as a second lock. The first strap stays on the battery. When the Pi is on its standoffs, check: wrap a string round it and measure the loop. Two 100 mm ties joined must reach.",
         "focus": [-0.020, 0.0, -0.010], "dist": 0.18, "view": [0.55, -0.55, -0.62]},
        {"id": "S7.4b", "hold": 1.1, "shows": ["pigtail_5v"], "hides": ["battery_pack"], "time": 4.4, "short": "Pigtail from the FC 5V pad",
         "text": "AFTER THE FIRST HOVER Battery unplugged. Use the pigtail you made and checked in Stage 1. On the flight controller, find the three pads marked GND, 5V and LED. (They are for an LED strip, which this build does not use.) Slide a piece of 6 mm heat shrink onto each pigtail wire. Solder the + wire to 5V and the - wire to GND. Then shrink the heat shrink over the joints. Plug the micro-USB end into the Pi's socket marked PWR IN (not the one marked USB). When the flight controller arrives, check: the LED group's 5V pad gives 5 V. (The \"5 V rail\" test covers the load.)",
         "focus": [-0.015, -0.015, 0.000], "dist": 0.18, "view": [0.40, -0.70, -0.60]},
        {"id": "S7.6", "hold": 0.9, "shows": ["clearance_M1"], "hides": ["battery_pack"], "time": 5.8, "short": "Cables out of the prop circles", "text": "NOW Route every cable out of the prop circles. Tie the loose ends down."},
        {"id": "S7.8", "hold": 0.9, "shows": ["leg_rear_0_piece_0", "leg_front_0_foot"], "hides": [], "time": 9.8,
         "short": "Fit the landing legs",
         "text": "AFTER THE FIRST HOVER Fit the landing legs, one at a time. Each leg goes on in place of the bottom screw of one of the frame's standoffs: the two at the very back of the bottom plate, and the two at the front of the middle plate, ahead of the stack. Take out that one screw. Screw an M3 x 10 set screw halfway into the standoff through the plate, so half sticks out below. Screw a leg standoff onto it. Then a second set screw, the second leg standoff, and a rubber foot with its short screw. Use 25 mm standoffs at the back and 28 mm at the front. The back legs reach about 56 mm below the bottom plate (25 + 25 + the 6.3 mm foot). The front legs start 8 mm higher, on the middle plate, so they end about 54 mm below it. The legs, not the payload, must touch the ground. The payload's lowest part is about 29 mm below the plate. The stance is narrow, so land on flat ground. When the parts arrive, check: Each knurled standoff has a screw thread inside at BOTH ends. (A thread on the inside is called a female thread.) Screw two together with a set screw: they should hold with no wobble. The short screws for the rubber feet. When the feet arrive, check: the foot screw length. The list now has 10 mm screws (the 6.3 mm foot leaves about 3.7 mm of thread in the standoff): check that they hold the foot.The standoffs, set screws, feet and screws are on the Stage 4 list."},
        {"id": "S7.7", "hold": 1.5, "shows": ["battery_pack", "battery_grip_pad", "strap_top_"], "hides": ["prop_"], "time": 7.0, "short": "Battery to 2 mm from the GPS, then strap",
         "text": "NOW For the first hover (no payload yet): slide the battery on the grip pad until the drone balances on two fingers under the arms, about 7 mm ahead of the frame centre, then strap it down with the first Kevlar strap. AFTER THE FIRST HOVER After the payload is on: loosen the strap and slide the battery forward on the grip pad until it is about 2 mm from the GPS board, then strap it down again with the first Kevlar strap. The GPS stops it from reaching the exact balance point, so the drone sits about 3 mm tail-heavy. That is inside the 5 mm the design allows. Check by lifting it on two fingers under the arms: it should tip back only gently."},
    ]
    actions.sort(key=lambda a: a["time"])
    actions.append({"id": "S7.5", "hold": 0.7, "shows": ["leg_front_0_foot", "leg_rear_0_foot", "thermal_lens"], "hides": [], "time": 10.8,
                    "short": "Legs stand lower than the payload",
                    "text": "NOW Nothing hanging below the bottom plate may be the lowest point of the drone: a landing on the lens or the Pi will break it. Plan for it now; you fit them later (S7.8, after the first hover): before the first flight WITH the payload, landing legs must stand lower than it. The legs must stand at least 40 mm below the bottom plate. The payload's lowest part sits about 29 mm below it (from the design check; see “How this was checked”).",
                    "focus": [-0.012, 0.0, -0.030], "dist": 0.30, "view": [0.0, -1.0, -0.15]})
    A.finish("step-07-main", 11.6, actions)

    print("STEP 7 - mount and balance")
    C.summary()
    C.export("step-07-mount", preview=False, animate=True)


build()
