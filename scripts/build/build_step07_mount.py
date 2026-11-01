"""
build_step07_mount.py - payload mounted, weight and CG checked.

Step 7: "Secure it twice, then check weight and centre of gravity". This is the
finished airframe without props, plus the CG marker and clearance discs.
Run:  blender -b --factory-startup -P build_step07_mount.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

PI_DX = 0.002
BAT = (-0.050, 0.0, 0.016)


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))

    stack, fc_z = Q.flight_stack(P)
    Q.motor_wires(P)
    Q.battery_lead(P)
    Q.front_camera(P)
    Q.vtx_and_antenna(P, antenna_x=-0.075)
    Q.led_strip(P)

    _, payload = C.collect(Q.pi_payload, P, label_sensors=False)
    C.shift(payload, dx=PI_DX)

    Q.battery_pad(P, BAT)
    Q.battery(P, BAT, label=False)
    for sx in (-0.058, -0.038):
        Q.strap(P, sx, z_top=BAT[2] + 0.0265, z_bottom=BAT[2])

    # clearance discs: props stay off, but the swept area is drawn so cable
    # routing can be checked against it
    for name, (mx, my) in Q.MOTORS.items():
        Q.clearance_ring(P, f"clearance_{name}", (mx, my))

    K.cg_marker(P, (0.0, 0.0, 0.0125), radius=0.020)

    C.label("ZERO 2 WH + QWIIC HAT", (0.014, 0.0, 0.034))
    C.label("THERMAL LENS DOWN", (0.040, -0.052, 0.001))
    C.label("GPS ANTENNA UP", (0.022, -0.009, 0.062))
    C.label("4S PACK + STRAP", (BAT[0], 0.0, BAT[2] + 0.034))
    C.label("CG MARKER", (0.0, -0.034, 0.014), detail="Balance about frame centre")
    C.label("PROP CLEARANCE", (Q.MOTOR_XY, Q.MOTOR_XY, 0.026),
            detail="No cable enters a prop circle")

    print("STEP 7 - mounted and balanced")
    C.summary()
    C.export("step-07-mount", preview=True,
             camera_at=(0.30, -0.32, 0.20), target=(0, 0, 0.024))


build()
