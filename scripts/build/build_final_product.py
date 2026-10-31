"""
build_final_product.py - the finished drone: every part in its flying position.

This is the hero model ("The finished build" section) and the reference for the
later step models.
Run:  blender -b --factory-startup -P build_final_product.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_quad as Q

# payload sits slightly forward of centre so the battery can strap behind it
PI_DX = 0.002
BAT = (-0.050, 0.0, 0.016)
ANTENNA_X = -0.075


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))
        Q.propeller(P, f"prop_{name}", (mx, my),
                    rot_z=0.35 * (1 if mx * my > 0 else -1))

    stack, fc_z = Q.flight_stack(P)
    Q.motor_wires(P)
    Q.battery_lead(P)
    Q.front_camera(P)
    Q.vtx_and_antenna(P, antenna_x=ANTENNA_X)
    Q.led_strip(P)

    # Pi + Qwiic HAT + thermal board + GPS on its mast (clear view of sky)
    _, payload = C.collect(Q.pi_payload, P)
    C.shift(payload, dx=PI_DX)

    # 4S pack crosswise behind the payload, on a grip pad, under two straps
    Q.battery_pad(P, BAT)
    Q.battery(P, BAT)
    for sx in (-0.058, -0.038):
        Q.strap(P, sx, z_top=BAT[2] + 0.0265, z_bottom=BAT[2])

    # Label anchors come from the part builders themselves (pi_payload, battery)
    # so they stay in sync with the geometry; only the props need one here.
    C.label("5.1\" TRI-BLADE PROPS", (Q.MOTOR_XY, Q.MOTOR_XY, Q.Z_PROP + 0.014))

    print("FINAL PRODUCT - full build")
    C.summary()
    C.export("final-product", preview=True,
             camera_at=(0.30, -0.33, 0.145), target=(0, 0, 0.024))


build()
