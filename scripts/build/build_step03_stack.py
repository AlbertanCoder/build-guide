"""
build_step03_stack.py - Step 3 "Solder the stack".

Text (STEP-TRUTH S3.0-S3.4, approved wording): ESC on the four long stack screws and soft grommets, battery
pads to the rear; motor wires cut to reach; three wires per motor to its own pads; XT60 lead and capacitor on
the battery pads (+ to +, - to -, stripe = -); the 8-wire cable; FC on the same screws above the ESC.
Bench items: multimeter. The smoke stopper and a charged pack stay on the bench for the 3D lesson of the first
power-up, which the page does at the end of Step 5 (S5.4b; it was S3.5 until audit row B3, 10 Nov 2026).
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
    bench_pack = Q.battery(P, loc=(-0.250, 0.0, 0.0), label=False)   # a charged pack for the first power-up lesson (page: S5.4b)
    K.multimeter(P, (0.0, -0.190, 0.0))

    C.label("50A 4-IN-1 ESC", (0.0, 0.026, Q.Z_ESC + 0.004), detail="on the 4 stack screws + soft grommets, battery pads to the rear")
    C.label("F405 FLIGHT CONTROLLER", (0.0, 0.0, fc_top + 0.010), detail="same 4 screws, above the ESC")
    C.label("8-WIRE ESC-FC CABLE", (-0.016, -0.022, (Q.Z_ESC + fc_top) / 2.0), detail="from the stack box, plugged at both ends")
    C.label("MOTOR WIRES", (0.040, 0.040, Q.Z_MID_TOP + 0.004), detail="3 per motor, motor N to pads MN")
    C.label("CAPACITOR", (-0.028, 0.0, Q.Z_MID_TOP + 0.016), detail="long leg +, striped side -")
    C.label("XT60 LEAD", (-0.100, 0.0, Q.Z_MID_TOP + 0.016), detail="red to +, black to -")
    C.label("SMOKE STOPPER", (-0.150, 0.0, 0.020), detail="first power-up at the end of Step 5, props off; solid green = no short")
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
         "text": "The stack box has two boards. The ESC (speed controller: it runs the motors) has big copper pads on three edges: three for each motor, and two large battery pads with a red and a black lead. The FC (flight controller) is the other board, the one with the USB socket. Fit the ESC in the centre of the frame on the four long (M3 x 30) stack screws, with a soft grommet in each hole. The battery pads face the rear: the tail, away from the camera. When the stack arrives, check: which way the stack screws go in and where the nuts go. (Arrival test \"Stack\".)"},
        {"id": "S3.1", "hold": 3.6, "shows": ["wire_motor_M1_", "wire_motor_M4_"], "hides": ["stack_fc"], "time": 1.6, "short": "Cut the motor wires", "text": "Lay each motor wire along the arm to its own pad on the ESC, add about 5 mm, and cut. The three wires reach different pads, so they end up slightly different lengths. Strip about 2 mm of each end."},
        {"id": "S3.2", "hold": 1.1, "shows": ["solder_joint_M2_"], "hides": ["stack_fc"], "time": 5.4, "short": "Tin and solder",
         "text": "Tin the pads: melt a thin layer of solder onto each pad, and onto each stripped wire end. Each motor has three pads on the ESC edge nearest that motor. Solder that motor's three wires to them, in any order. If a motor later spins the wrong way, you fix it in Betaflight, not with the iron. A good joint is smooth and shiny and covers the pad. If solder joins two pads, remove it with the iron before you go on. Practise first on scrap (Stage 1).",
         "focus": [sx * 0.012, sy * (S.mm(S.ESC["w"]) / 2.0 - 0.003), esc_top], "dist": 0.06},
        {"id": "S3.3", "hold": 1.9, "shows": ["wire_batt_red", "wire_batt_black", "stack_capacitor"], "hides": ["stack_fc"], "time": 6.8, "short": "XT60 + capacitor",
         "text": "The XT60 lead and the capacitor both come in the stack box. Before you solder, check: the lead reaches the pack. Hold the lead from the ESC's battery pads to where the pack will sit, on top of the standoffs where the top plate will go, with the pack held there. Hold the pack's XT60 next to the lead's plug, without plugging them together. They must meet without stretching and stay clear of the props. Too short: use a longer XT60 lead (same wire size). Then check with the meter which XT60 wire is +. Set the meter to its beep or lowest ohms setting. Touch one probe to the XT60 pin marked +, the other to a wire end: the wire that beeps is +. Find the + and - marks beside the ESC's two battery pads. When the plug arrives, check: that the XT60 is marked + and -. Look at the plug. Slide heat shrink onto the wires first. Solder the XT60 lead and the capacitor to the ESC's battery pads: + to +, - to -. On the capacitor the long leg is + and the striped side is -. Do not cut the capacitor's legs until both are soldered the right way round. A wrong-way battery lead can destroy the ESC the first time it is plugged in. When the stack arrives, check: the + and - marks beside the battery pads. (The maker's diagram shows only the - mark clearly.)",
         "focus": list(pads), "dist": 0.08},
        {"id": "S3.4", "hold": 2.4, "shows": ["stack_esc_fc_cable", "stack_fc"], "hides": [], "time": 9.0, "short": "FC wires first, then the FC",
         "text": "First, on the bench, solder the flight controller's pad-side wires. Do this before you plug in the 8-wire cable or mount the board. The flight controller has two faces: one with the plug sockets, one with the small solder pads. Mounted as shown, the pad face points down at the ESC, where the iron cannot reach. Lay the board on the bench pad face up, and use the GEPRC one-page diagram from Step 1 to find each pad. Read each pad's label before you solder it. The video transmitter's cable (it unplugs from the video transmitter), on the pads along the left side: red to 9V, both black wires to GND, yellow (video) to VTX, white (control) to T1. The orange wire (5 V out) and the green wire (audio) are not used: cut each one short and cover it with heat shrink, so it touches nothing. The Finder's 3-pin cable (it unplugs from the Finder): BZ to the pad marked BP (the buzzer pad), GND to the G pad just below BP, and 5V to the 5V pad just below that G. Before you solder, check: the BP pad on your board matches the diagram. The Pi power lead from Stage 1: + to 5V and - to GND, on the group of three pads marked GND, 5V and LED in the bottom right corner (they are for an LED strip, which this build does not use). This is a different group from the Finder's pads. Before you solder it, check its length: hold the lead against the frame from the flight controller's GND, 5V and LED pads down to where the Pi will sit under the bottom plate (centred 36 mm behind the stack centre). The micro-USB plug must reach without pulling tight; if it does not, stop and ask. Leave its micro-USB end free: it goes into the Pi in Step 7. Tape it out of the way. The camera: try the stack box's camera cable. If it plugs into both the camera and the flight controller's 3-pin socket marked CAM, G, 5V (on the socket face), you solder nothing for the camera. If no cable plugs into both, stop before you mount the board and ask (send a photo of both cables): which cable to cut and solder to the pads marked CAM, GND and 5V at the top right of the pad face, and how long it must be to reach the camera mount, depend on what is in the boxes. When the stack arrives, check: does the camera cable plug straight in, or does the camera go on the pads? Tug each wire gently: it must not move. No blob of solder may join two pads. The video transmitter, the Finder and the camera stay unplugged from their cables until Step 4. Plug the 8-wire cable from the stack box into the ESC's 8-pin socket (on the edge across from the battery pads) and into the matching socket on the flight controller. The plugs fit one way only. If one does not slide in, turn it round. Never force it. Then fit the flight controller on the same four screws above the ESC, socket face up, with a grommet under it and the USB socket where you can reach it. When the flight controller arrives, check: does it have an arrow or the word FRONT? If yes, point it toward the front of the drone. Once the flight controller is mounted, check: the Pi lead still reaches where the Pi will sit, without pulling tight. (Arrival test \"Pi lead reaches the Pi under the bottom plate\".)"},
    ]
    A.finish("step-03-main", 13.0, actions)

    print("STEP 3 - solder the stack")
    C.summary()
    C.export("step-03-stack", preview=False, animate=True)


build()
