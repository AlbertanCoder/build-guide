"""
build_step03_stack.py - Step 3 "Solder the stack".

Text (STEP-TRUTH S3.0-S3.4, approved wording): ESC on the four long stack screws and soft grommets, battery
pads to the rear; motor wires cut to reach; three wires per motor to its own pads; XT60 lead and capacitor on
the battery pads (+ to +, - to -, stripe = -); the 8-wire cable; FC on the same screws above the ESC.
Bench items from the step: multimeter, smoke stopper and a charged pack (S3.5: the first power-up, through the smoke stopper).
Run:  blender -b --factory-startup -P scripts/build/build_step03_stack.py
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

    Q.frame(P, with_top=False, standoffs=True)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))

    (stack, fc_top), stack_objs = C.collect(Q.flight_stack, P)
    _, screws = C.collect(Q.stack_screws, P, fc_top + 0.002)
    _, wires = C.collect(Q.motor_wires, P)
    _, lead = C.collect(Q.battery_lead, P, tip=(-0.100, 0.0, Q.Z_MID_TOP + 0.006))

    # solder joints on motor 2's three pads (the close-up): a small shiny fillet per pad
    esc_top = Q.Z_ESC + S.mm(S.PCB_T["t"])
    m2x, m2y = Q.MOTORS["M2"]
    sx, sy = (1 if m2x > 0 else -1), (1 if m2y > 0 else -1)
    joints = [C.cyl(f"solder_joint_M2_{k}", 0.0016, 0.0012, (sx * (0.0065 + k * 0.0055), sy * (S.mm(S.ESC["w"]) / 2.0 - 0.003),
                    esc_top + 0.0011), mat=P["alu"], seg=10, radius_top=0.0008) for k in range(3)]

    # bench: smoke stopper waiting for the first power-up, multimeter for the polarity check
    K.smoke_stopper(P, (-0.150, 0.0, 0.0055))
    bench_pack = Q.battery(P, loc=(-0.250, 0.0, 0.0), label=False)   # S3.5: a charged pack for the first power-up
    K.multimeter(P, (0.0, -0.190, 0.0))

    C.label("50A 4-IN-1 ESC", (0.0, 0.026, Q.Z_ESC + 0.004), detail="on the 4 stack screws + soft grommets, battery pads to the rear")
    C.label("F405 FLIGHT CONTROLLER", (0.0, 0.0, fc_top + 0.010), detail="same 4 screws, above the ESC")
    C.label("8-WIRE ESC-FC CABLE", (-0.016, -0.022, (Q.Z_ESC + fc_top) / 2.0), detail="from the stack box, plugged at both ends")
    C.label("MOTOR WIRES", (0.040, 0.040, Q.Z_MID_TOP + 0.004), detail="3 per motor, motor N to pads MN")
    C.label("CAPACITOR", (-0.028, 0.0, Q.Z_MID_TOP + 0.016), detail="long leg +, striped side -")
    C.label("XT60 LEAD", (-0.100, 0.0, Q.Z_MID_TOP + 0.016), detail="red to +, black to -")
    C.label("SMOKE STOPPER", (-0.150, 0.0, 0.020), detail="S3.5: first power-up, props off; solid green = no short")
    C.label("MULTIMETER", (0.0, -0.190, 0.026), detail="check polarity, no bridges")

    # ---- clip ----
    esc = [o for o in stack_objs if o.name.startswith(("stack_esc", "stack_grommet"))]
    fc = [o for o in stack_objs if o.name.startswith(("stack_fc", "stack_esc_fc_cable"))]
    cable = [o for o in fc if o.name.startswith("stack_esc_fc_cable")]
    fc_board = [o for o in fc if not o.name.startswith("stack_esc_fc_cable")]
    A.slide(esc, (0, 0, 0.030), 0.0, 1.2)
    for i, name in enumerate(("M1", "M2", "M3", "M4")):
        A.appear([o for o in wires if o.name.startswith(f"wire_motor_{name}_")], 1.6 + i * 0.9, 2.3 + i * 0.9)
    A.appear(joints, 5.4, 6.4)
    A.appear([o for o in lead if o.name.startswith(("wire_batt", "xt60"))], 6.8, 7.8)
    A.appear(bench_pack, 11.6, 12.0)
    A.appear([o for o in lead if o.name.startswith("stack_capacitor")], 7.8, 8.6)
    A.appear(cable, 9.0, 9.8)
    A.slide(fc_board + screws, (0, 0, 0.030), 10.0, 11.2)
    pads = (-S.mm(S.ESC["d"]) / 2.0 + 0.004, 0.0, esc_top)
    actions = [
        {"id": "S3.0", "hold": 1.3, "shows": ["stack_esc_pad_", "stack_esc_batt_pad_", "stack_grommet_"], "hides": ["stack_fc", "wire_motor_M1_"], "time": 0.0, "short": "ESC in the frame",
         "text": "The stack box has two boards. The ESC (speed controller: it runs the motors) has big copper pads on three edges: three for each motor, and two large battery pads with a red and a black lead. The FC (flight controller) is the other board, the one with the USB socket. Fit the ESC in the centre of the frame on the four long (M3 x 30) stack screws, with a soft grommet in each hole. The battery pads face the rear: the tail, away from the camera. When the stack arrives, check: which way the stack screws go in and where the nuts go. (Arrival test \"Stack screw length\".)"},
        {"id": "S3.1", "hold": 3.6, "shows": ["wire_motor_M1_", "wire_motor_M4_"], "hides": ["stack_fc"], "time": 1.6, "short": "Cut the motor wires", "text": "Lay each motor wire along the arm to its own pad on the ESC, add about 5 mm, and cut. The three wires reach different pads, so they end up slightly different lengths. Strip about 2 mm of each end."},
        {"id": "S3.2", "hold": 1.1, "shows": ["solder_joint_M2_"], "hides": ["stack_fc"], "time": 5.4, "short": "Tin and solder",
         "text": "Tin the pads: melt a thin layer of solder onto each pad, and onto each stripped wire end. Each motor has three pads on the ESC edge nearest that motor. Solder that motor's three wires to them, in any order. If a motor later spins the wrong way, you fix it in Betaflight, not with the iron. A good joint is smooth and shiny and covers the pad. If solder joins two pads, remove it with the iron before you go on. Practise first on scrap (Stage 1).",
         "focus": [sx * 0.012, sy * (S.mm(S.ESC["w"]) / 2.0 - 0.003), esc_top], "dist": 0.06},
        {"id": "S3.3", "hold": 1.9, "shows": ["wire_batt_red", "wire_batt_black", "stack_capacitor"], "hides": ["stack_fc"], "time": 6.8, "short": "XT60 + capacitor",
         "text": "The XT60 lead and the capacitor both come in the stack box. Before you solder, check with the meter which XT60 wire is +. Set the meter to its beep or lowest ohms setting. Touch one probe to the XT60 pin marked +, the other to a wire end: the wire that beeps is +. Find the + and - marks beside the ESC's two battery pads. When the plug arrives, check: that the XT60 is marked + and -. Look at the plug. Slide heat shrink onto the wires first. Solder the XT60 lead and the capacitor to the ESC's battery pads: + to +, - to -. On the capacitor the long leg is + and the striped side is -. Do not cut the capacitor's legs until both are soldered the right way round. A wrong-way battery lead can destroy the ESC the first time it is plugged in. When the stack arrives, check: the + and - marks beside the battery pads. (The maker's diagram shows only the - mark clearly.)",
         "focus": list(pads), "dist": 0.08},
        {"id": "S3.4", "hold": 2.4, "shows": ["stack_esc_fc_cable", "stack_fc"], "hides": [], "time": 9.0, "short": "8-wire cable, then the FC",
         "text": "Plug the 8-wire cable from the stack box into the ESC's 8-pin socket (on the edge across from the battery pads) and into the matching socket on the flight controller. The plugs fit one way only. If one does not slide in, turn it round. Never force it. Then fit the flight controller on the same four screws above the ESC, with a grommet under it and the USB socket where you can reach it. When the flight controller arrives, check: does it have an arrow or the word FRONT? If yes, point it toward the front of the drone."},
        {"id": "S3.5", "hold": 1.2, "shows": ["smokestopper_body", "battery_pack"], "hides": [], "time": 11.6, "short": "First power-up, props off",
         "text": "First power-up, props off. Plug a charged pack into the smoke stopper, then plug the smoke stopper into the drone. Its light must stay solid green: that means no short. Then unplug."}
    ]
    A.finish("step-03-main", 13.0, actions)

    print("STEP 3 - solder the stack")
    C.summary()
    C.export("step-03-stack", preview=False, animate=True)


build()
