"""
build_step02_frame.py - Step 2 "Build the frame": the V6 frame and the four motors, nothing else.

Text (STEP-TRUTH S2.1-S2.4): arms on the bottom plate, standoffs on top, motors M1-M4 on the arms, no motor
screw touching a winding. The stack, props and wiring belong to later steps, so they are not here.
Clip step-02-main: S2.1 plate + arms, S2.2 standoffs, S2.3 motors one by one, S2.4 close-up of one motor's screws.
Run:  blender -b --factory-startup -P scripts/build/build_step02_frame.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_quad as Q
import parts as S


def by_prefix(objs, *prefixes):
    return [o for o in objs if o.name.startswith(prefixes)]


def build():
    C.reset()
    P = C.palette()

    _, fr = C.collect(Q.frame, P, with_top=False, standoffs=True)   # the text never fits the top plate here
    motors = {}
    for name, (mx, my) in Q.MOTORS.items():
        _, motors[name] = C.collect(Q.motor, P, name, (mx, my))
        lay = S.MOTOR_LAYOUT[name]
        C.label(name, (mx * 1.08, my * 1.08, Q.Z_PROP + 0.010),
                detail=f"{lay['pos']}, spins {lay['spin']} (Betaflight props-in)")

    # four motor screws up through the M2 arm (length drawn: the motor's screw set is not published)
    m2x, m2y = Q.MOTORS["M2"]
    half = S.mm(S.MOTOR["mount"]) / 2.0
    screws = []
    for i, (sx, sy) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
        screws.append(C.cyl(f"motor_screw_M2_{i}", 0.0015, 0.008, (m2x + sx * half, m2y + sy * half, Q.Z_MOTOR - 0.002),
                            mat=P["steel"], seg=8))
        screws[-1]["approx"] = True

    C.label("SOURCE ONE V6 FRAME", (-0.060, 0.0, Q.Z_TOP + 0.010), detail="outlines from TBS's own drawing")
    C.label("ARMS ON THE BOTTOM PLATE", (0.030, 0.030, Q.Z_ARM + 0.004), detail="6 mm arms; stack holes clamp them")
    C.label("STANDOFFS", (0.050, 0.0, Q.Z_TOP - 0.006), detail="22 mm front, 30 mm rear")
    C.label("MOTOR SCREWS", (m2x, m2y, Q.Z_MOTOR - 0.012), detail="none may touch the copper windings")

    # ---- clip ----
    A.appear(by_prefix(fr, "frame_bottom_plate"), 0.0, 0.8)
    for i, name in enumerate(("M1", "M2", "M3", "M4")):
        mx, my = Q.MOTORS[name]
        A.slide(by_prefix(fr, f"frame_arm_{name}"), (mx * 0.5, my * 0.5, 0.0), 0.8 + i * 0.4, 1.6 + i * 0.4)
    A.slide(by_prefix(fr, "frame_arm_spacer", "frame_middle_plate"), (0, 0, 0.040), 3.0, 3.8)
    A.slide(by_prefix(fr, "frame_standoff_"), (0, 0, 0.030), 4.0, 5.0)
    for i, name in enumerate(("M1", "M2", "M3", "M4")):
        if name != "M2":
            A.slide(motors[name], (0, 0, 0.050), 5.4 + i * 0.6, 6.0 + i * 0.6)
    # M2 is the close-up: it drops on, lifts so the screws can be seen coming up through the arm and stopping
    # short of the windings, then settles back down onto them
    for ob in motors["M2"]:
        z = ob.location.z
        for t_, dz in ((0.0, 0.050), (6.0, 0.050), (6.6, 0.0), (8.4, 0.0), (8.9, 0.022), (10.0, 0.022), (10.6, 0.0)):
            A._key(ob, "location", t_, (ob.location.x, ob.location.y, z + dz))
        ob.location.z = z
        full = tuple(ob.scale)
        A._key(ob, "scale", 0.0, (A.TINY,) * 3)
        A._key(ob, "scale", 5.95, (A.TINY,) * 3)
        A._key(ob, "scale", 6.0, full)
    A.slide(screws, (0, 0, -0.012), 9.0, 9.8)

    actions = [
        {"id": "S2.1", "hold": 2.9, "shows": ["frame_bottom_plate", "frame_arm_M1", "frame_arm_M4"], "hides": ["M1_bell"], "time": 0.0, "short": "Arms on the bottom plate", "text": "Lay the four arms on the bottom plate, root ends in the middle, with the small arm spacer in the centre. Put the middle plate on top, so each arm is sandwiched between the two plates. Fit two screws through each arm's two root holes. Tighten snug, not forced."},
        {"id": "S2.2", "hold": 1.1, "shows": ["frame_standoff_"], "hides": ["M1_bell"], "time": 4.0, "short": "Standoffs", "text": "Screw the four 30 mm standoffs onto the bottom plate (two beside the stack's rear corners, two at the very back) and the four 22 mm standoffs onto the middle plate at the front. All eight end at the same height, ready for the top plate in Step 4. When the frame arrives, check: which screw length goes in which hole, and where the press nuts sit. (No V6 manual was found.)"},
        {"id": "S2.3", "hold": 2.6, "shows": ["M1_bell", "M4_bell"], "hides": [], "time": 5.4, "short": "Motors M1-M4",
         "text": "The front is the end the camera faces. Look at the drone from behind, toward the front. Before you screw a motor on, put a flag of packing tape on its wire and write its number, 1 to 4, on it with a marker. Screw the 4 motors onto the arms: M1 rear right, M2 front right, M3 rear left, M4 front left (the order Betaflight uses)."},
        {"id": "S2.4", "hold": 1.4, "shows": ["motor_screw_M2_"], "hides": [], "time": 8.4, "short": "Screws clear the windings",
         "text": "Check every motor screw underneath. None may touch the windings (the thin copper coils inside the motor). If a screw sticks in, use a shorter screw with the same thread.",
         "focus": [m2x, m2y, Q.Z_MOTOR], "dist": 0.07},
    ]
    A.finish("step-02-main", 12.0, actions)

    print("STEP 2 - frame and motors")
    C.summary()
    C.export("step-02-frame", preview=False, animate=True)


build()
