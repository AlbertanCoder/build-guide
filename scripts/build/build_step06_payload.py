"""
build_step06_payload.py - Pi, Qwiic HAT and the two I2C sensors, close up.

Step 6: "Two sensors, one shared 3.3V I2C bus". The jumpers are coloured exactly
as the guide states (red 3.3V, black GND, blue SDA, yellow SCL) and both
orientation arrows are drawn.
Run:  blender -b --factory-startup -P build_step06_payload.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

TH_DX, TH_DZ = -0.088, 0.014      # thermal board, moved beside the Pi
GPS_X, GPS_Z = 0.086, 0.019       # GPS board on the other side


def build():
    C.reset()
    P = C.palette()

    _, payload = C.collect(Q.pi_payload, P, with_gps=False, label_sensors=False)
    # slide the thermal board out from under the HAT to the left, level with it
    for ob in payload:
        if ob.name.startswith("thermal_"):
            C.shift([ob], dx=TH_DX, dz=TH_DZ)

    # GPS board on the right, antenna up
    C.plate("gps_pcb", 0.0254, 0.0254, 0.0016, (GPS_X, -0.006, GPS_Z),
            mat=P["pcb_blue"], corner=0.001)
    C.box("gps_antenna", (0.016, 0.016, 0.0040), (GPS_X, -0.006, GPS_Z + 0.0030),
          mat=P["plastic_white"], bevel=0.0006)
    C.box("gps_header", (0.0127, 0.0025, 0.0025), (GPS_X, -0.006, GPS_Z - 0.0020),
          mat=P["plastic_black"])

    # jumpers: HAT Qwiic ports out to each sensor's 1x5 header
    hat_z = 0.0300
    K.jumper(P, "jumper_thermal",
             [(0.002, -0.010, hat_z), (-0.024, -0.038, hat_z - 0.004),
              (-0.058, -0.030, 0.020), (TH_DX + 0.006, -0.014, 0.020)],
             ("wire_red", "wire_black", "wire_blue", "wire_yellow"))
    K.jumper(P, "jumper_gps",
             [(0.014, -0.010, hat_z), (0.040, -0.036, hat_z - 0.004),
              (0.070, -0.026, 0.020), (GPS_X - 0.006, -0.006, 0.020)],
             ("wire_red", "wire_black", "wire_blue", "wire_yellow"))
    K.qwiic_plug(P, "qwiic_thermal", (0.002, -0.010, hat_z + 0.002))
    K.qwiic_plug(P, "qwiic_gps", (0.014, -0.010, hat_z + 0.002))

    # orientation arrows: thermal lens down, GPS antenna up
    K.arrow(P, "arrow_down", (TH_DX, -0.014, 0.012), (TH_DX, -0.014, -0.010))
    K.arrow(P, "arrow_up", (GPS_X, -0.006, 0.026), (GPS_X, -0.006, 0.046))

    C.label("ZERO 2 WH + QWIIC HAT", (0.012, 0.010, 0.044))
    C.label("MLX90640 - 0x33", (TH_DX, -0.014, 0.040),
            detail="Thermal lens points DOWN")
    C.label("PA1010D GPS - 0x10", (GPS_X, -0.006, 0.056),
            detail="Ceramic antenna points UP")
    C.label("3.3V I2C BUS", (0.0, -0.052, 0.036),
            detail="Red 3.3V, black GND, blue SDA, yellow SCL")

    print("STEP 6 - Pi payload wiring")
    C.summary()
    C.export("step-06-payload", preview=True,
             camera_at=(0.20, -0.26, 0.20), target=(0.0, -0.01, 0.024))


build()
