"""
build_step04_receiver_fpv.py - the electrical 3D wiring diagram.

Step 4: "Receiver first, then the separate analog video chain". Components float
in space above a faint frame silhouette so the TX->R2 / RX->T2 crossover and the
video chain are readable.
Run:  blender -b --factory-startup -P build_step04_receiver_fpv.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

Z = 0.072          # height the components float at


def board(P, name, w, d, loc, color="pcb_black"):
    return C.plate(name, w, d, 0.0016, loc, mat=P[color], corner=0.001)


def build():
    C.reset()
    P = C.palette()

    # faint frame silhouette for spatial reference only
    ghost = C.material("GhostFrame", (0.35, 0.42, 0.42, 1), 0.0, 0.6, alpha=0.16)
    Q.frame(P, carbon=ghost)

    # --- receiver <-> flight controller ----------------------------------
    rx_x, rx_y = -0.105, 0.030
    board(P, "rp1_board", 0.020, 0.012, (rx_x, rx_y, Z), "pcb_black")
    C.box("rp1_shield", (0.008, 0.008, 0.0016), (rx_x + 0.004, rx_y, Z + 0.0016),
          mat=P["alu"])
    C.tube("rp1_antenna", [(rx_x - 0.008, rx_y, Z + 0.001),
                           (rx_x - 0.016, rx_y + 0.006, Z + 0.026),
                           (rx_x - 0.020, rx_y + 0.008, Z + 0.040)],
           0.0010, P["wire_black"], res=5)

    fc_x, fc_y = 0.0, 0.0
    board(P, "f405_board", 0.030, 0.030, (fc_x, fc_y, Z + 0.012), "pcb_black")
    C.box("f405_usb", (0.008, 0.006, 0.003),
          (fc_x + 0.014, fc_y, Z + 0.0146), mat=P["alu"], bevel=0.0004)
    for i, (off, tag) in enumerate(((-0.004, "r2"), (0.004, "t2"),
                                    (-0.010, "5v"), (0.010, "gnd"))):
        C.box(f"f405_pad_{tag}", (0.003, 0.003, 0.0012),
              (fc_x + off, fc_y - 0.013, Z + 0.0132), mat=P["gold"])

    # TX -> R2 crosses RX -> T2 on purpose: that is the mistake to avoid
    C.tube("sig_tx_to_r2", [(rx_x + 0.010, rx_y - 0.002, Z),
                            (rx_x + 0.032, rx_y - 0.020, Z + 0.004),
                            (fc_x - 0.004, fc_y - 0.013, Z + 0.0132)],
           0.0011, P["pine"], res=6)
    C.tube("sig_rx_to_t2", [(rx_x + 0.010, rx_y + 0.002, Z),
                            (rx_x + 0.028, rx_y - 0.006, Z + 0.018),
                            (fc_x + 0.004, fc_y - 0.013, Z + 0.0132)],
           0.0011, P["wire_blue"], res=6)
    C.tube("pwr_5v", [(rx_x + 0.006, rx_y + 0.006, Z),
                      (rx_x + 0.040, rx_y - 0.004, Z + 0.030),
                      (fc_x - 0.010, fc_y - 0.013, Z + 0.0132)],
           0.0010, P["wire_red"], res=6)
    C.tube("gnd", [(rx_x + 0.006, rx_y - 0.006, Z),
                   (rx_x + 0.044, rx_y - 0.014, Z + 0.026),
                   (fc_x + 0.010, fc_y - 0.013, Z + 0.0132)],
           0.0010, P["wire_black"], res=6)

    # --- analog video chain ----------------------------------------------
    cam = (0.100, 0.026, Z - 0.006)
    C.box("phoenix2_body", (0.019, 0.019, 0.019), cam, mat=P["plastic_black"],
          bevel=0.0012)
    C.cyl("phoenix2_lens", 0.0068, 0.006, (cam[0] + 0.011, cam[1], cam[2]),
          rot=(0, 1.5708, 0), mat=P["plastic_black"], seg=16)

    vtx = (0.052, -0.062, Z - 0.004)
    board(P, "unify_hv_board", 0.030, 0.020, vtx, "pcb_black")
    C.cyl("unify_sma", 0.0032, 0.006, (vtx[0] - 0.020, vtx[1], vtx[2]),
          rot=(0, 1.5708, 0), mat=P["alu"], seg=12)

    # camera -> VTX (video + power), VTX -> antenna, VTX -> monitor
    C.tube("video_cam_vtx", [cam, (0.080, -0.010, Z + 0.010),
                             (vtx[0] + 0.012, vtx[1] + 0.008, vtx[2])],
           0.0011, P["wire_yellow"], res=6)
    C.tube("vtx_to_antenna", [(vtx[0] - 0.020, vtx[1], vtx[2]),
                              (vtx[0] - 0.034, vtx[1] - 0.010, vtx[2] + 0.004)],
           0.0013, P["wire_black"], res=6)
    C.cyl("antenna_sma_stem", 0.0022, 0.018,
          (vtx[0] - 0.038, vtx[1] - 0.012, vtx[2] + 0.012),
          mat=P["plastic_black"], seg=10)
    for i, tag in enumerate(("a", "b")):
        C.box(f"antenna_lobe_{tag}", (0.020, 0.0018, 0.030),
              (vtx[0] - 0.038, vtx[1] - 0.012, vtx[2] + 0.034),
              rot=(0, 0, 0.7854 * i), mat=P["plastic_grey"], bevel=0.0006)

    # the monitor is ground equipment: draw it lower and to the side
    K.monitor_skyzone(P, (0.140, -0.075, 0.0))
    C.tube("video_vtx_to_monitor",
           [(vtx[0] + 0.010, vtx[1] - 0.010, vtx[2]),
            (0.110, -0.110, 0.030), (0.140, -0.100, 0.026)],
           0.0009, P["wire_white"], res=5)

    C.label("RP1 V2 RECEIVER", (rx_x, rx_y, Z + 0.048),
            detail="5V + GND, UART serial RX, CRSF")
    C.label("GEPRC F405", (fc_x, fc_y, Z + 0.034), detail="Bind + failsafe here")
    C.label("TX -> R2  /  RX -> T2", (rx_x + 0.040, rx_y - 0.026, Z + 0.026),
            detail="Crossed on purpose")
    C.label("PHOENIX 2 CAMERA", (cam[0], cam[1] + 0.026, Z + 0.010))
    C.label("UNIFY HV VTX", (vtx[0], vtx[1] - 0.018, Z + 0.006),
            detail="2-6S, never without antenna")
    C.label("SMA ANTENNA", (vtx[0] - 0.038, vtx[1] - 0.012, vtx[2] + 0.056))
    C.label("M5 MONITOR", (0.140, -0.075, 0.062), detail="Analog 5.8 GHz")

    print("STEP 4 - receiver + analog FPV wiring")
    C.summary()
    C.export("step-04-receiver-fpv", preview=True,
             camera_at=(0.26, -0.34, 0.26), target=(0.02, -0.02, 0.045))


build()
