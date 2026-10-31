"""
build_step08_test.py - the six-stage test sequence on the bench.

Step 8: "Prove each stage before moving to the next". One bench scene with six
clickable hotspots (A-F); each carries the mesh-name prefixes the viewer tints.
Run:  blender -b --factory-startup -P build_step08_test.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

PI_DX = 0.002
BAT = (-0.050, 0.0, 0.016)


def hot_plate(P, loc):
    x, y, z = loc
    return [
        C.box("hotplate_body", (0.120, 0.120, 0.030), (x, y, z + 0.015),
              mat=P["plastic_grey"], bevel=0.004, seg=2),
        C.plate("hotplate_surface", 0.105, 0.105, 0.006, (x, y, z + 0.033),
                mat=P["steel"], corner=0.008),
        C.cyl("hotplate_dial", 0.010, 0.008, (x - 0.048, y - 0.048, z + 0.034),
              mat=P["accent"], seg=12),
        C.tube("hotplate_cord", [(x + 0.060, y, z + 0.010),
                                 (x + 0.085, y - 0.020, z + 0.004),
                                 (x + 0.105, y - 0.040, z + 0.004)],
               0.0022, P["wire_black"], res=6),
    ]


def build():
    C.reset()
    P = C.palette()

    # the whole aircraft, props fitted, sitting on the bench
    Q.frame(P)
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))
        Q.propeller(P, f"prop_{name}", (mx, my), rot_z=0.3)
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

    # bench equipment the stages need
    K.laptop(P, (0.175, 0.135, 0.0), rot_z=-0.65)
    hot_plate(P, (0.100, -0.135, 0.0))
    K.multimeter(P, (-0.150, -0.120, 0.0))

    # six clickable stages
    C.hotspot("A", "A - SOFTWARE", "19/19 unit tests, demo + map API",
              (0.150, 0.120, 0.090), "laptop_")
    C.hotspot("B", "B - BENCH", "I2C + GPS fix, 5V under load",
              (0.020, 0.010, 0.062), "pi_,hat_,gps_,thermal_")
    C.hotspot("C", "C - RADIO / FPV", "Bind + failsafe, video + legal channel",
              (-0.075, 0.010, 0.080), "antenna_,vtx_,monitor_,rp1_")
    C.hotspot("D", "D - PROPS OFF", "Motor order + direction, smoke stopper first",
              (-0.078, 0.078, 0.048), "M1_,prop_M1,smokestopper_")
    C.hotspot("E", "E - FIRST HOVER", "Legal open site, 1 m, land, inspect",
              (0.010, -0.060, 0.105), "frame_,M2_")
    C.hotspot("F", "F - HOT PLATE", "Hot + cold controls, measure errors, repeat",
              (0.100, -0.135, 0.055), "hotplate_")

    print("STEP 8 - test sequence")
    C.summary()
    C.export("step-08-test", preview=True,
             camera_at=(0.30, -0.36, 0.26), target=(0.01, -0.01, 0.04))


build()
