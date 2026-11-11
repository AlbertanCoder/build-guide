"""
build_step05_power.py - Step 5 "Charge the batteries safely".

Text (STEP-TRUTH S5, approved wording incl. items 9-11, 24-26, 31): two 18650 cells in the radio, radio charged
by its USB-C cord; 4S pack inside the LiPo bag on a fireproof surface, leads out through the opening, main plug
AND balance lead into the M7AC; LiHV / 4S / 1.0 A checked on the screen before start; fire extinguisher
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
    # Shad's second pack waits its turn on the fireproof surface (charged one at a time, Lion type)
    li_loc = (BAG[0] + 0.020, BAG[1] - 0.150, 0.006)
    Q.battery_liion(P, li_loc, crosswise=False, label=False)

    # charger on the bench; its socket types are not published -> ports drawn generic, planned
    K.charger_m7ac(P, (0.180, 0.080, 0.0))
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

    # S5.4b (audit row B3, 10 Nov 2026): the stack's first power-up, through the smoke stopper, with the pack just
    # charged. The drone itself is not drawn here (this model has no frame); Step 3's model and the 3D lesson show it.
    K.smoke_stopper(P, (-0.200, -0.080, 0.0055))
    stopper = [ob for ob in C.bpy.context.scene.objects if ob.name.startswith("smokestopper")]

    C.label("RADIO", (-0.150, 0.110, 0.070), detail="RadioMaster Pocket")
    C.label("TWO 18650 CELLS INTO THE RADIO", (-0.040, 0.110, 0.080))
    C.label("USB-C CORD: CHARGE THE RADIO", (-0.280, 0.130, 0.020))
    C.label("GNB 4S LIHV PACK: TYPE LIHV, 1.0 A", (pack_loc[0], pack_loc[1], pack_loc[2] + 0.040), detail="the learning pack; its label says HV")
    C.label("MORE VOLTS LI-ION PACK: TYPE LION, 2.5 A", (li_loc[0], li_loc[1], li_loc[2] + 0.060), detail="one pack at a time; its label says Li-ion, 4S")
    C.label("LIPO BAG ON A FIREPROOF SURFACE", (BAG[0], BAG[1] - 0.070, 0.070), detail="leads out through the opening")
    C.label("M7AC CHARGER", (0.180, 0.080, 0.060))
    C.label("SCREEN: TYPE, CELLS AUTO, MODE CHARGE, CURRENT", (0.170, 0.080, 0.050), detail="set it BEFORE the pack is plugged in")
    C.label("MAINS CABLE INTO THE WALL", (0.300, 0.160, 0.020))
    C.label("MAIN PLUG AND BALANCE LEAD", (0.090, 0.000, 0.030))
    C.label("FIRE EXTINGUISHER", (0.300, -0.130, 0.360), detail="within reach; then water to cool the pack, never cover it")
    C.label("SMOKE STOPPER: THE STACK'S FIRST POWER-UP", (-0.200, -0.080, 0.030), detail="after the charge, props off; solid green = no short")

    # ---- clip: the page's order (approved batch H, change request 82): screen set before the pack goes in ----
    A.slide(A.named("cell_18650"), (0, 0, 0.060), 0.0, 1.2)
    A.appear(A.named("radio_usb_c_cord"), 1.6, 2.4)
    A.appear(A.named("charger_mains_cable"), 2.8, 3.6)
    A.appear(A.named("charger_screen"), 4.0, 4.4)
    A.slide(A.named("battery_"), (0, -0.120, 0.030), 5.2, 6.4)
    A.appear(A.named("charge_lead", "balance_lead"), 6.8, 7.8)
    A.appear(stopper, 8.3, 8.6)
    # the fire extinguisher stands in the scene from the start: within reach before the first charge and S5.4b (no appear clip)
    actions = [
        {"id": "S5.1", "hold": 1.3, "shows": ["cell_18650_0", "cell_18650_1"], "hides": [], "time": 0.0, "short": "Cells into the radio",
         "text": "Put the two 18650 cells in the radio."},
        {"id": "S5.1b", "hold": 0.9, "shows": ["radio_usb_c_cord"], "hides": [], "time": 1.6, "short": "Charge the radio (radio's own cord)",
         "text": "Charge the radio with the USB-C cord from the radio's box (not the flight controller's cable), from a phone charger or a laptop USB port. If you already did this in Stage 3, you can skip it. When the radio arrives, check: how long it takes to charge and what shows when it is full. The quick-start manual gives neither. Watch it the first time and note it here."},
        {"id": "S5.2", "hold": 0.9, "shows": ["charger_mains_cable", "fireproof_surface"], "hides": [], "time": 2.8, "short": "Fireproof surface, mains cable in",
         "text": "Put the charger on a fireproof surface (a ceramic tile, a concrete floor or a metal tray). Plug the charger into the wall with a mains cable and switch it on with the AC switch on its back. When the charger arrives, check: is a mains cable in the box? Rotor Village lists only the charger."},
        {"id": "S5.3", "hold": 1.0, "shows": ["charger_screen"], "hides": ["charge_lead_red"], "time": 4.0, "short": "Set LiHV and 1.0 A first",
         "text": "Set everything before you connect the pack. On the main screen, short-press OK to open the charge settings. Turn the scroll wheel to move, press OK to change a line, then press OK and Exit to keep it: Battery Type: LiHv for the GNB pack, Lion for the More Volts pack. The M7AC charges Lion to 4.10 V per cell, a little under the pack's 4.2 V maximum: slightly less flight, never over. Nothing else: the manual warns a wrong type can damage the pack and become a fire hazard. Cells: Auto. It counts the cells from the balance plug, so the balance plug must be in. Mode: Charge. Charge Current: 1.0 A for the GNB 1500 (this guide's cautious setting, about 0.7C: well under the manual's 1 to 2C, which for this pack is 1.5 to 3 A). 2.5 A for the More Volts 5000 (half its capacity: its listing gives no charge current, so the guide stays well under 1C). Leave End Voltage as it is: the manual says not to change it unless you know the battery, and it cannot be changed for Lion. When the packs arrive, check: the GNB label says HV or LiHV, and the More Volts label says Li-ion, 4S.",
         "focus": [0.170, 0.080, 0.032], "dist": 0.12},
        {"id": "S5.3c", "hold": 1.3, "shows": ["battery_pack"], "hides": ["charge_lead_red"], "time": 5.2, "short": "Pack into the bag",
         "text": "Put the pack in the LiPo bag with its leads out through the opening."},
        {"id": "S5.4a", "hold": 1.1, "shows": ["charge_lead_red", "balance_lead_"], "hides": [], "time": 6.8, "short": "Main plug + balance lead: it starts",
         "text": "Plug the thick yellow plug (the main plug) into the charger's output port and the small white plug with five thin wires (the balance lead) into its balance port. Then scroll to Start and press OK."},
        {"id": "S5.4", "hold": 0.6, "shows": ["charger_screen", "battery_pack"], "hides": [], "time": 8.1, "short": "Stay beside it until F",
         "text": "Stay next to it the whole time. When it is full, the charger shows a message and sounds a tone. From empty that is roughly 1.5 hours for the GNB at 1.0 A and 2 hours for the More Volts at 2.5 A (an ESTIMATE: capacity divided by current; the last part of a charge is slower)."},
        {"id": "S5.4b", "hold": 0.15, "shows": ["smokestopper_body", "battery_pack"], "hides": [], "time": 8.8, "short": "First power-up, props off",
         "text": "First power-up of the stack, with the pack you just charged. Props off, glasses on, window open, the fire extinguisher still within reach. Until you hold the amateur radio certificate, unplug the video transmitter from its cable first (plug it back in afterwards). Battery unplugged, do the meter check from Step 3's \"Before you go on\": probes on the XT60's two pins; a short beep that stops is fine, a beep that never stops is a short, so stop and find it. Then plug the charged pack into the smoke stopper, then plug the smoke stopper into the drone. Never plug the pack in directly: the smoke stopper is a plug-in fuse that cuts the power if something is shorted. Its light must stay solid green: that means no short. If the light goes off and it beeps, unplug the battery at once and look for a solder bridge or a wire touching where it should not. While the pack is still plugged in, check the Pi lead: meter on DC volts (the V with a straight line), red probe on pin 1 of its micro-USB plug, black probe on pin 5 (the two end pins you found in Stage 1). Use the probes' sharp tips, touch only the pins (not the metal shell around them), and hold the black probe still before you place the red one. It should read about 5 V. No 5 V, or a minus sign: stop and ask before you go on. Then unplug the pack."},
        {"id": "S5.5", "hold": 0.4, "shows": ["charger_screen"], "hides": [], "time": 9.0, "short": "Storage mode if not flying soon",
         "text": "If you will not fly within a day or two, put the pack to storage: the same settings, but Mode: Storage. The M7AC stores LiPo, LiHV and Li-ion packs, and it brings a full pack down by itself, slowly (at most 3.0 A and 15 W inside the charger). Keep the pack in the LiPo bag afterwards. When the charger arrives, check: the storage voltage it shows for LiHv and for Lion. The More Volts listing says store Li-ion at 3.4 to 3.6 V per cell."},
        {"id": "S5.S", "hold": 0.9, "shows": ["fire_extinguisher_body"], "hides": [], "time": 9.6, "short": "Extinguisher, then water",
         "text": "⚠ Safety: never charge unattended. Never charge a swollen or damaged pack: one that is puffed up like a balloon, dented from a crash, or has a torn wrapper or damaged leads. Let a pack cool completely after flying before you charge it, until it feels no warmer than your hand. Keep the fire extinguisher and a bucket of water within reach. The bag slows a fire but does not stop it. If a pack smokes or catches fire: unplug the charger at the wall if you can do it safely, use the fire extinguisher, then pour plenty of water on the pack to cool it. Do not cover it with sand or anything else: covering keeps the heat in and the other cells can catch. Keep away from the smoke."},
    ]
    A.finish("step-05-main", 11.0, actions)

    print("STEP 5 - charging")
    C.summary()
    C.export("step-05-power", preview=False, animate=True)


build()
