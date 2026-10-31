"""
build_step01_parts.py - the bench flat-lay: five zones, nothing assembled.

Step 1 of the guide: "Put every part on the bench first".
Run:  blender -b --factory-startup -P build_step01_parts.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

# zone centres on the bench
ZONE = {
    "airframe": (-0.255, 0.145),
    "radio_power": (-0.005, 0.150),
    "analog_fpv": (0.250, 0.145),
    "thermal": (-0.130, -0.150),
    "tools": (0.140, -0.150),
}


def build():
    C.reset()
    P = C.palette()

    # --- A: airframe -------------------------------------------------------
    ax, ay = ZONE["airframe"]
    _, frame = C.collect(Q.frame, P)
    C.shift(frame, dx=ax, dy=ay)
    for i, (mx, my) in enumerate(((-0.030, 0.048), (0.030, 0.048),
                                  (-0.030, -0.048), (0.030, -0.048))):
        _, m = C.collect(Q.motor, P, f"M{i + 1}", (mx, my))
        C.shift(m, dx=ax, dy=ay - 0.052)
    _, prop = C.collect(Q.propeller, P, "prop_set", (0.0, 0.0), ghost=False)
    C.shift(prop, dx=ax + 0.075, dy=ay - 0.010)
    C.label("AIRFRAME", (ax, ay, 0.075),
            detail="Frame, 4 motors, 2 prop sets, straps, battery pad")

    # --- B: radio + power -------------------------------------------------
    bx, by = ZONE["radio_power"]
    K.radio_pocket(P, (bx, by, 0.0))
    K.cells_18650(P, (bx + 0.075, by + 0.030, 0.0))
    # RP1 V2 receiver: tiny board with an antenna stub
    C.plate("rp1_board", 0.020, 0.012, 0.0016, (bx - 0.080, by + 0.040, 0.001),
            mat=P["pcb_black"], corner=0.001)
    C.tube("rp1_antenna", [(bx - 0.086, by + 0.040, 0.002),
                           (bx - 0.092, by + 0.046, 0.024)], 0.0010,
           P["wire_black"], res=5)
    K.charger_m4ac(P, (bx + 0.078, by - 0.035, 0.0))
    Q.battery(P, (bx - 0.035, by - 0.052, 0.0), crosswise=False, label=False)
    Q.battery(P, (bx + 0.030, by - 0.055, 0.0), crosswise=True, label=False)
    C.label("RADIO + POWER", (bx, by, 0.075),
            detail="Pocket, 18650 pair, RP1 V2, 2x 4S, M4AC charger")

    # --- C: analog FPV ----------------------------------------------------
    cx, cy = ZONE["analog_fpv"]
    _, cam = C.collect(Q.front_camera, P)
    C.shift(cam, dx=cx - 0.040, dy=cy + 0.045)
    C.plate("vtx_loose", 0.030, 0.020, 0.0016, (cx + 0.035, cy + 0.048, 0.001),
            mat=P["pcb_black"], corner=0.0015)
    C.cyl("antenna_loose_stem", 0.0022, 0.020, (cx + 0.035, cy + 0.012, 0.012),
          mat=P["plastic_black"], seg=10)
    for i, tag in enumerate(("a", "b")):
        C.box(f"antenna_loose_{tag}", (0.020, 0.0018, 0.030),
              (cx + 0.035, cy + 0.012, 0.036), rot=(0, 0, 45 * i),
              mat=P["plastic_grey"], bevel=0.0006)
    K.monitor_skyzone(P, (cx, cy - 0.030, 0.0))
    C.label("ANALOG FPV", (cx, cy + 0.020, 0.090),
            detail="Phoenix 2, Unify HV, SMA antenna, M5 monitor")

    # --- D: thermal payload ----------------------------------------------
    dx_, dy_ = ZONE["thermal"]
    _, payload = C.collect(Q.pi_payload, P, z_base=0.006, gps_mast=False,
                           label_sensors=False)
    C.shift(payload, dx=dx_, dy=dy_)
    K.jumper(P, "jumper_thermal",
             [(dx_ - 0.010, dy_ - 0.030, 0.012), (dx_ - 0.030, dy_ - 0.060, 0.010),
              (dx_ - 0.055, dy_ - 0.070, 0.004)],
             ("wire_red", "wire_black", "wire_blue", "wire_yellow"))
    C.label("THERMAL PAYLOAD", (dx_, dy_, 0.075),
            detail="Zero 2 WH + Qwiic HAT, MLX90640, PA1010D, jumpers")

    # --- E: tools + computer ---------------------------------------------
    ex, ey = ZONE["tools"]
    K.soldering_iron(P, (ex - 0.070, ey + 0.050, 0.0))
    K.multimeter(P, (ex - 0.010, ey + 0.050, 0.0))
    K.smoke_stopper(P, (ex + 0.055, ey + 0.050, 0.010))
    K.glasses(P, (ex + 0.020, ey - 0.020, 0.004))
    K.sd_reader(P, (ex + 0.055, ey - 0.030, 0.006))
    K.laptop(P, (ex + 0.150, ey - 0.075, 0.0), rot_z=-0.55)
    C.label("TOOLS + COMPUTER", (ex, ey + 0.090, 0.080),
            detail="Flywoo kit, smoke stopper, laptop, SD reader, glasses")

    print("STEP 1 - parts flat lay")
    C.summary()
    C.export("step-01-parts", preview=True,
             camera_at=(0.28, -0.42, 0.52), target=(0.0, 0.0, 0.02))


build()
