"""
build_final_product.py - the finished drone: every part in its flying position.

Frame from TBS's drawing, motors and props per Betaflight props-in (CW on M1 and M4, CCW on M2 and M3), battery
strapped on the top plate. The payload layout is not confirmed (STEP-TRUTH S7.3), so it is greyed 'planned'.
No LED strip (no step mentions one) and no landing legs (not chosen yet).
Run:  blender -b --factory-startup -P scripts/build/build_final_product.py
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
        Q.propeller(P, f"prop_{name}", (mx, my), spin=Q.SPIN[name])
    Q.flight_stack(P)
    Q.motor_wires(P)
    Q.battery_lead(P)
    Q.front_camera(P)
    Q.vtx_and_antenna(P, antenna_x=-0.085)
    Q.receiver(P, (-0.030, 0.015, Q.PLATE_T + 0.002))
    Q.pi_payload(P)
    Q.legs(P)
    Q.battery_pad(P)
    Q.battery(P)
    Q.strap(P, Q.BAT[0])

    C.label("5.1\" TRI-BLADE PROPS", (Q.MOTORS["M4"][0], Q.MOTORS["M4"][1], Q.Z_PROP + 0.014),
            detail="CW on M1 and M4, CCW on M2 and M3")
    C.label("PAYLOAD: SIMULATED LAYOUT (APPROVED)", (-0.036, 0.0, -0.045), detail="check fit with the real parts")

    print("FINAL PRODUCT - full build")
    C.summary()
    C.export("final-product", preview=False)


build()
