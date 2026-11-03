"""
build_step05_power.py - Step 5 "Charge the batteries safely".

Text (STEP-TRUTH S5, approved wording incl. items 9-11, 24-26, 31): two 18650 cells in the radio, radio charged
by its USB-C cord; 4S pack inside the LiPo bag on a fireproof surface, leads out through the opening, main plug
AND balance lead into the M4AC; LiHV / 4S / 1.0 A checked on the screen before start; extinguisher or sand
within reach; you stay beside it. The charger's socket types are not published, so its ports are 'planned'.
Run:  blender -b --factory-startup -P scripts/build/build_step05_power.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_kit as K
import lib_quad as Q
import parts as S

BAG = (0.000, -0.080, 0.006)


def build():
    C.reset()
    P = C.palette()

    # radio: two cells going in, USB-C cord to charge it
    K.radio_pocket(P, (-0.150, 0.110, 0.0), rot_z=0.0)
    K.cells_18650(P, (-0.040, 0.110, 0.0))
    C.tube("radio_usb_c_cord", [(-0.228, 0.110, 0.012), (-0.260, 0.110, 0.006), (-0.300, 0.140, 0.004)],
           0.0015, P["plastic_black"], res=6)

    # fireproof surface, bag on it, pack inside, leads out through the opening
    C.box("fireproof_surface", (0.320, 0.340, 0.006), (0.000, -0.120, 0.003), mat=P["plastic_grey"], bevel=0.002)
    K.lipo_bag(P, BAG)
    pack_loc = (BAG[0] - 0.020, BAG[1], BAG[2] + 0.004)
    Q.battery(P, pack_loc, crosswise=False, label=False)

    # charger on the bench; its socket types are not published -> ports drawn generic, planned
    K.charger_m4ac(P, (0.180, 0.080, 0.0))
    ports = [ob for ob in C.bpy.context.scene.objects if ob.name.startswith(("charger_xt60", "charger_balance_port"))]
    C.mark_planned(ports, "charger socket types not published (XT60 or XT30?)")
    lead_out = (pack_loc[0] - S.PACK["l"] / 2000.0 - 0.028, pack_loc[1] - 0.002, pack_loc[2] + 0.002)
    C.tube("charge_lead_red", [lead_out, (0.060, -0.010, 0.012), (0.204, 0.050, 0.012)], 0.0012, P["wire_red"], res=6)
    C.tube("charge_lead_black", [(lead_out[0], lead_out[1] + 0.004, lead_out[2]), (0.062, -0.006, 0.012),
                                 (0.200, 0.050, 0.012)], 0.0012, P["wire_black"], res=6)
    K.jumper(P, "balance_lead", [(pack_loc[0] - 0.045, pack_loc[1] + 0.012, pack_loc[2] + 0.021),
                                 (0.040, 0.000, 0.016), (0.184, 0.050, 0.012)],
             ("wire_black", "wire_yellow", "wire_blue", "wire_red"))

    # the charger's mains cable (ToolkitRC: "AC Input Cable x 1") from its back to the wall
    C.tube("charger_mains_cable", [(0.215, 0.080, 0.015), (0.260, 0.110, 0.006), (0.330, 0.160, 0.004)], 0.0020,
           P["plastic_black"], res=6)

    # fire extinguisher within reach (size drawn)
    ext = [C.cyl("fire_extinguisher_body", 0.040, 0.300, (0.300, -0.130, 0.150), mat=P["pcb_red"], seg=20),
           C.cyl("fire_extinguisher_head", 0.015, 0.040, (0.300, -0.130, 0.320), mat=P["plastic_black"], seg=12)]
    for ob in ext:
        ob["approx"] = True

    C.label("RADIO", (-0.150, 0.110, 0.070), detail="RadioMaster Pocket")
    C.label("TWO 18650 CELLS INTO THE RADIO", (-0.040, 0.110, 0.080))
    C.label("USB-C CORD: CHARGE THE RADIO", (-0.280, 0.130, 0.020))
    C.label("4S LIHV PACK", (pack_loc[0], pack_loc[1], pack_loc[2] + 0.040), detail="only packs marked HV")
    C.label("LIPO BAG ON A FIREPROOF SURFACE", (BAG[0], BAG[1] - 0.070, 0.070), detail="leads out through the opening")
    C.label("M4AC CHARGER", (0.180, 0.080, 0.050))
    C.label("SCREEN: LIHV 4S 1.0A", (0.170, 0.080, 0.040), detail="set it BEFORE the pack is plugged in")
    C.label("MAINS CABLE INTO THE WALL", (0.300, 0.160, 0.020))
    C.label("MAIN PLUG AND BALANCE LEAD", (0.090, 0.000, 0.030))
    C.label("FIRE EXTINGUISHER OR SAND", (0.300, -0.130, 0.360), detail="within reach; stay beside the charger")

    # ---- clip: the page's order (approved batch H, change request 82): screen set before the pack goes in ----
    A.slide(A.named("cell_18650"), (0, 0, 0.060), 0.0, 1.2)
    A.appear(A.named("radio_usb_c_cord"), 1.6, 2.4)
    A.appear(A.named("charger_mains_cable"), 2.8, 3.6)
    A.appear(A.named("charger_screen"), 4.0, 4.4)
    A.slide(A.named("battery_"), (0, -0.120, 0.030), 5.2, 6.4)
    A.appear(A.named("charge_lead", "balance_lead"), 6.8, 7.8)
    A.appear(A.named("fire_extinguisher"), 9.6, 10.4)
    actions = [
        {"id": "S5.1", "hold": 1.3, "shows": ["cell_18650_0", "cell_18650_1"], "hides": [], "time": 0.0, "short": "Cells into the radio",
         "text": "Put the two 18650 cells in the radio."},
        {"id": "S5.1b", "hold": 0.9, "shows": ["radio_usb_c_cord"], "hides": [], "time": 1.6, "short": "Charge the radio (radio's own cord)",
         "text": "Charge the radio with the USB-C cord from the radio's box (not the flight controller's cable), from a phone charger or a laptop USB port. If you already did this in Stage 3, you can skip it. When the radio arrives, check: how long it takes to charge and what shows when it is full. The quick-start manual gives neither. Watch it the first time and note it here."},
        {"id": "S5.2", "hold": 0.9, "shows": ["charger_mains_cable", "fireproof_surface"], "hides": [], "time": 2.8, "short": "Fireproof surface, mains cable in",
         "text": "Put the charger on a fireproof surface (a ceramic tile, a concrete floor or a metal tray). Plug the charger's mains cable (it is in the charger's box) into the wall."},
        {"id": "S5.3", "hold": 1.0, "shows": ["charger_screen"], "hides": ["charge_lead_red"], "time": 4.0, "short": "Set LiHV and 1.0 A first",
         "text": "Set the type and the current before you connect the pack. Short-press the Type/Current key to unlock it. Long-press it until the screen shows LiHV (4.35 V). Short-press to set 1.0 A. Check that the screen shows 4S and LiHV. Your packs are HV packs (\"HV\" is in the shop's name for them), so LiHV is right. If you ever charge a pack that is not marked HV, choose LiPo (4.20 V) instead. When the packs arrive, check: the label says HV or LiHV. The charger offers 0.5, 1.0, 2.0 and 2.5 A. Its manual recommends 1C to 2C (1.5 to 3 A for these packs) and says not to set an excessive current. This guide uses 1.0 A, the cautious setting just below that range.",
         "focus": [0.170, 0.080, 0.032], "dist": 0.12},
        {"id": "S5.3c", "hold": 1.3, "shows": ["battery_pack"], "hides": ["charge_lead_red"], "time": 5.2, "short": "Pack into the bag",
         "text": "Put the pack in the LiPo bag with its leads out through the opening."},
        {"id": "S5.4a", "hold": 1.1, "shows": ["charge_lead_red", "balance_lead_"], "hides": [], "time": 6.8, "short": "Main plug + balance lead: it starts",
         "text": "Plug in the thick yellow plug (the main plug) and the small white plug with five thin wires (the balance lead). Charging starts by itself when both are in. There is no Start button."},
        {"id": "S5.4", "hold": 0.6, "shows": ["charger_screen", "battery_pack"], "hides": [], "time": 8.1, "short": "Stay beside it until F",
         "text": "Stay next to it the whole time. It is finished when the screen shows F (full). That takes about 2 hours from empty."},
        {"id": "S5.5", "hold": 0.4, "shows": ["charger_screen"], "hides": [], "time": 9.0, "short": "Storage mode if not flying soon",
         "text": "If you will not fly within a day or two, put the pack to storage. Choose LipoStorage (3.85 V) instead of LiHV in step 2 above, plug the pack in the same way, and keep it in the LiPo bag afterwards. When the charger arrives, check: can storage mode bring a full pack DOWN to 3.85 V? Only a shop's Q&A says it can."},
        {"id": "S5.S", "hold": 0.9, "shows": ["fire_extinguisher_body"], "hides": [], "time": 9.6, "short": "Extinguisher or sand",
         "text": "⚠ Safety: never charge unattended. Never charge a swollen or damaged pack: one that is puffed up like a balloon, dented from a crash, or has a torn wrapper or damaged leads. Let a pack cool completely after flying before you charge it, until it feels no warmer than your hand. Keep a fire extinguisher or a bucket of sand within reach. The bag slows a fire but does not stop it. If a pack smokes or catches fire: unplug the charger at the wall if you can do it safely, use the fire extinguisher or cover the bag with sand, never water, and keep away from the smoke."},
    ]
    A.finish("step-05-main", 11.0, actions)

    print("STEP 5 - charging")
    C.summary()
    C.export("step-05-power", preview=False, animate=True)


build()
