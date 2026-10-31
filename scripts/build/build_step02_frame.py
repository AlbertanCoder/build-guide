"""
build_step02_frame.py - frame + motors + stack, props ghosted.

Step 2 of the guide: "Build the X frame - props stay OFF".
Run:  blender -b --factory-startup -P build_step02_frame.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_quad as Q


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)

    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))
        Q.propeller(P, f"prop_{name}", (mx, my), ghost=True)
        # M1-M4 keep the SVG's numbering so the page text still matches
        C.label(name, (mx * 1.06, my * 1.06, Q.Z_PROP + 0.016),
                detail="motor position")

    stack, fc_z = Q.flight_stack(P)
    C.label("F405 + 50A ESC STACK", (0, 0, fc_z + 0.012),
            detail="30.5 mm mounting")
    C.label("GHOST PROPS - STAY OFF", (Q.MOTOR_XY, -Q.MOTOR_XY, Q.Z_PROP + 0.005),
            detail="clearance check only")
    C.label("5 mm CARBON ARMS", (-Q.MOTOR_XY * 0.62, Q.MOTOR_XY * 0.62,
                                 Q.Z_ARM + 0.006))

    print("STEP 2 - frame assembly")
    C.summary()
    C.export("step-02-frame", preview=True,
             camera_at=(0.30, -0.30, 0.21), target=(0, 0, 0.012))


build()
