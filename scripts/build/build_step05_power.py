"""
build_step05_power.py - radio cells and LiPo charging.

Step 5: "Set up power before the first flight". Pocket with its 18650 pair, the
M4AC set to LiHV 4S, and a pack sitting inside an open LiPo bag.
Run:  blender -b --factory-startup -P build_step05_power.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

BAG = (-0.010, -0.070, 0.0)
PACK = (BAG[0], BAG[1], 0.004)


def build():
    C.reset()
    P = C.palette()

    # radio, standing with cells loaded
    K.radio_pocket(P, (-0.090, 0.048, 0.0), rot_z=-0.22)
    K.cells_18650(P, (0.010, 0.070, 0.0))

    # charger with XT60 + balance lead running to the pack
    K.charger_m4ac(P, (0.120, 0.045, 0.0))
    C.tube("charge_xt60_red", [(0.144, 0.015, 0.012),
                               (0.150, -0.030, 0.010),
                               (0.070, -0.055, 0.010),
                               (0.020, -0.062, 0.022)], 0.0016, P["wire_red"], res=6)
    C.tube("charge_xt60_black", [(0.140, 0.015, 0.012),
                                 (0.146, -0.026, 0.010),
                                 (0.066, -0.051, 0.010),
                                 (0.016, -0.058, 0.022)], 0.0016,
           P["wire_black"], res=6)
    K.jumper(P, "balance_lead",
             [(0.124, 0.024, 0.010), (0.100, -0.020, 0.012),
              (0.045, -0.050, 0.020), (0.012, -0.070, 0.028)],
             ("wire_black", "wire_yellow", "wire_blue", "wire_red"))

    # bag with the pack inside it
    K.lipo_bag(P, BAG)
    Q.battery(P, PACK, crosswise=False, label=False)

    C.label("POCKET RADIO", (-0.090, 0.048, 0.055),
            detail="2x 18650 installed, USB-C charging")
    C.label("18650 PAIR", (0.010, 0.070, 0.090), detail="Remove contact insulator")
    C.label("M4AC CHARGER", (0.120, 0.045, 0.060),
            detail="AC 100-240V, select LiHV + 4S, balance charge")
    C.label("4S PACK IN LiPo BAG", (BAG[0], BAG[1] - 0.010, 0.070),
            detail="Charge attended, never unattended")
    C.label("XT60 + BALANCE LEAD", (0.080, -0.052, 0.030))

    print("STEP 5 - radio + charging")
    C.summary()
    C.export("step-05-power", preview=True,
             camera_at=(0.24, -0.30, 0.26), target=(0.02, -0.01, 0.03))


build()
