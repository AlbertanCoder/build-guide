"""
build_step03_stack.py - soldering the stack, exploded.

Step 3: "Solder, inspect, then use a smoke stopper". The FC floats above the
ESC so the motor pads, battery lead, capacitor leg and the inline smoke stopper
are all legible at once.
Run:  blender -b --factory-startup -P build_step03_stack.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

EXPLODE = 0.026   # how far the FC lifts off the ESC


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))

    stack, fc_z = Q.flight_stack(P, explode=EXPLODE)
    Q.motor_wires(P)
    Q.battery_lead(P, tip=(0.070, -0.070, 0.030))

    # smoke stopper inline between the battery lead and the pack
    K.smoke_stopper(P, (0.088, -0.088, 0.030), rot_z=0.6)
    C.tube("stopper_link_red",
           [(0.082, -0.079, 0.030), (0.090, -0.092, 0.030)], 0.0016,
           P["wire_red"], res=6)

    C.label("F405 FLIGHT CONTROLLER", (0, 0, fc_z + 0.020),
            detail="Type-C to the Acer laptop")
    C.label("50A 4-IN-1 ESC", (0, 0.020, 0.014),
            detail="Motor order per manual, capacitor + battery pads")
    C.label("CAPACITOR", (-0.010, -0.014, 0.030))
    C.label("XT60 -> 4S", (0.072, -0.072, 0.040))
    C.label("SMOKE STOPPER", (0.092, -0.094, 0.044), detail="First power only")
    C.label("M1-M4 MOTOR WIRES", (-0.048, 0.052, 0.020))

    print("STEP 3 - stack soldering, exploded")
    C.summary()
    C.export("step-03-stack", preview=True,
             camera_at=(0.26, -0.30, 0.19), target=(0.01, -0.01, 0.030))


build()
