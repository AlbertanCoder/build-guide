"""
parts.py - every real part size the 3D models use, in ONE place.

If Shad buys a substitute part (the frame, stack, Pi kit and thermal camera are out of stock), change its
entry here and rebuild; nothing else should hold a size.

Units: millimetres. Each entry carries `src` (a source id from docs/build-truth/STEP-TRUTH.md, or a file)
and, where no source gives the number, `approx=True` with the reason. approx sizes are drawn so the part
reads right; they are never quoted as fact in a label.

Plain Python on purpose: check_models.py imports it without Blender.
"""

import json
import math
import os

_HERE = os.path.dirname(os.path.abspath(__file__))


def P(src, approx=False, why="", **dims):
    d = dict(dims)
    d["src"] = src
    d["approx"] = approx
    if why:
        d["why"] = why
    return d


# --- frame: TBS Source One V6 5" -------------------------------------------------------------
# Outlines come from TBS's own drawing (scripts/build/data/so1v6_outlines.json, made by extract_so1v6.py).
FRAME = P("R3 + TBS So1-V6-2025-AUG-19.dxf",
          wheelbase=240.0,             # R3 "Wheelbase 5": 240"
          arm_t=6.0,                   # R3 "Arm thickness 5": 6mm"; drawing label "6mm"
          plate_t=2.0,                 # drawing labels "2mm" (R3 lists bottom 2.5mm: conflict, drawing used)
          standoff_long=30.0,          # R3 "Standoff height: 30 and 22mm"
          standoff_short=22.0,
          standoff_od=5.0,             # R3 "OD 5mm M3"
          stack_hole=30.5)             # R3 "Stack Mounting: 30.5 x 30.5mm"
with open(os.path.join(_HERE, "data", "so1v6_outlines.json")) as _f:
    FRAME_OUTLINES = json.load(_f)

# --- motors: EMAX ECO III 2207 1900KV ---------------------------------------------------------
MOTOR = P("R4 R5", dia=28.6, height=32.8,      # R5 "Motor Dimensions: 28.6 x 32.8 mm"
          shaft_dia=5.0,                         # R4 "Outer shaft diameter: 5mm"
          mount=16.0,                            # R4 "Mounting holes: 16mm M3" (R5 says 19x19: conflict)
          lead_len=120.0, lead_awg=20)          # R5 "Lead: 20# AWG 120mm"
MOTOR_SPLIT = P("none", approx=True, why="bell/stator/shaft split not published",
                base_h=4.0, bell_h=20.0, shaft_above=8.8)   # adds to MOTOR height 32.8

# Betaflight Quad X, props in (R28): position and spin seen from above. +X forward, +Y left.
MOTOR_LAYOUT = {
    "M1": {"pos": "rear right",  "sx": -1, "sy": -1, "spin": "CW"},
    "M2": {"pos": "front right", "sx": +1, "sy": -1, "spin": "CCW"},
    "M3": {"pos": "rear left",   "sx": -1, "sy": +1, "spin": "CCW"},
    "M4": {"pos": "front left",  "sx": +1, "sy": +1, "spin": "CW"},
}

# --- props: Gemfan 51499 ----------------------------------------------------------------------
PROP = P("R6", dia=5.1 * 25.4, pitch_in=4.99, hub_bore=5.0, hub_t=7.0, blades=3)

# --- stack: GEPRC TAKER F405 BLS 50A ----------------------------------------------------------
ESC = P("R2", w=42.9, d=39.7, holes=30.5)                 # "Size: 42.9×39.7mm, hole30.5×30.5mm"
FC = P("R2", w=36.8, d=36.8, holes=30.5)                  # "Size: 36.8×36.8mm"
PCB_T = P("none", approx=True, why="board thickness not published", t=1.6)
STACK_GAP = P("none", approx=True, why="grommet/nut heights not published", esc_above_plate=3.0, fc_above_esc=7.0)
CAPACITOR = P("R34", approx=True, why="35V 1000uF given; can size not published", dia=10.0, h=20.0)

# --- control and video ------------------------------------------------------------------------
RX = P("R7", w=13.0, d=11.0, h=3.0, antenna_len=65.0)     # "Dimension: 13mm*11mm*3mm", "65mm ... T Antenna"
CAMERA = P("R2 rv-phoenix", w=19.0, h=19.0, depth=22.0)    # "Dimensions: 19mm*19mm*22mm"
VTX = P("R8 rv-vtx", w=31.0, d=22.0, h=6.0)               # "31x22x6mm form factor"
ANTENNA = P("R10", height=78.0, approx=True, why="only height and weight published; shape drawn simple")

# --- payload ----------------------------------------------------------------------------------
PI = P("pizero2-brief", w=65.0, d=30.0, hole_inset=3.5, hole_dx=58.0, hole_dy=23.0)   # "Form factor: 65mm×30mm"
HAT = P("SparkFun Qwiic_Hat_for_Raspberry_Pi .brd", w=52.32, d=22.99,
        approx=True, why="design file may be an earlier revision than DEV-14459")
MLX = P("R19 + mechanical drawing", w=19.0, d=22.0, t=2.75, hole_dx=13.6, hole_from_top=2.7)
GPS = P("R20", w=28.0, d=21.0, h=9.0)
STANDOFF_PI = P("R25", len=12.0, thread="M2.5")
QWIIC_CABLE = P("R22", len=150.0)
# Shad 2026-11-03 (DECISIONS.md): keep the GPS at the front and lengthen its cable with silicone wire. Piece length,
# joint overlap and joint spacing are my proposal (change request 43), not measured.
GPS_EXT = P("Shad decision 2026-11-03 + change request 43", approx=True, why="extension piece and joint overlap: my proposal",
            cut=120.0, joint_loss=5.0, joints_per_wire=2, stagger=20.0, from_plug=50.0)

# --- power ------------------------------------------------------------------------------------
PACK = P("R12", l=79.0, w=38.0, h=26.0, xt60_lead=85.0, balance_lead=40.0)
# Shad's second flight pack (mixed Stage 5, 2026-11-04): More Volts 4S 5000mAh Li-ion (TenPower 50XG cells), read 2026-11-04.
# R-MV5000 "Weight: 307.9g (±5 g)"; "Dimensions (L×W×H): ~79.15 x 44.25 x 44.25 mm"; XT60H; "30-50A (typical UAV/FPV use)".
PACK_LIION = P("R-MV5000", l=79.15, w=44.25, h=44.25, mass_g=307.9)
# VIFLY Finder 2 lost-drone beeper (Shad approved 2026-11-04). R-FINDER2 Rotor Village listing (read 2026-11-04):
# "Dimensions: 24x13x16 mm", "Weight: 5 g", "Input Voltage:4.5-8.5V", "1 x 3 Pin Wire". Pads not named on the listing.
FINDER = P("R-FINDER2", l=24.0, w=13.0, h=16.0, mass_g=5.0)
# Where it sits (Opus geometry check 2026-11-04, against every part of the finished model): on the middle plate in the
# front bay, between the four 22 mm standoffs, its back 2 mm ahead of the stack's front edge (ESC 39.7 mm deep -> 19.85),
# long side forward, 2 mm left of the centre line (nearest parts 3.5-3.8 mm: M4 arm, GPS-cable joint, a 22 mm standoff).
FINDER_AT = P("Opus geometry check 2026-11-04 (S4.9 page wording)", x=19.85 + 2.0 + 12.0, y=2.0, tape=1.6)
# microSD card: SD Association microSD form factor 15 x 11 x 1.0 mm
SPARE_SD = P("SD Association microSD form factor", l=15.0, w=11.0, h=1.0)
STRAP = P("R18", len=245.0, w=20.0)
CELL_18650 = P("rv sam30q", dia=18.33, len=64.85)        # "Approximate Dimensions: 18.33mm x 64.85mm"
# Shad replaced the M4AC with the ToolkitRC M7AC (mixed Stage 5, 2026-11-04; it has a Li-ion mode). R-M7AC: Amain Hobbies
# listing "Size: 112x73x38mm", "Weight: 245g" (read 2026-11-04). The M4AC was R11 "Product size 75*54*30mm".
CHARGER = P("R-M7AC", l=112.0, w=73.0, h=38.0, mass_g=245.0)
SMOKE_STOPPER = P("R14", l=42.0, w=32.0, h=11.0)        # "Size(L x W x H): 42 x 32 x 11 mm"
LIPO_BAG = P("R16", w=220.0, d=110.0, h=170.0)          # "Height: 170mm Width: 220mm Depth: 110mm"

# --- bench gear -------------------------------------------------------------------------------
RADIO = P("R13", w=156.6, d=65.1, h=125.3)              # "156.6*65.1*125.3mm (Folded size)"
MONITOR = P("R17", w=135.0, d=88.0, h=16.0)             # "Dimension: 135x88x16mm"
IRON = P("R15", handle_l=110.0, handle_w=16.0, tip_l=115.0, tip_d=5.5)
MULTIMETER = P("R15", l=120.0, w=80.0, h=20.0)
LAPTOP = P("none", approx=True, why="Shad's own laptop; size unknown", w=320.0, d=220.0, h=14.0)


def mm(v):
    """mm -> metres for Blender."""
    return v / 1000.0


def motor_xy(name):
    """Motor centre in mm: 120 mm from the centre at 45 degrees (wheelbase 240 / 2)."""
    r = FRAME["wheelbase"] / 2.0 / math.sqrt(2.0)
    lay = MOTOR_LAYOUT[name]
    return lay["sx"] * r, lay["sy"] * r


def approx_parts():
    """Names of entries whose size is drawn, not sourced (check_models.py lists them)."""
    return sorted(k for k, v in globals().items() if isinstance(v, dict) and v.get("approx"))


# --- cameras: views, tilt (Phase E) ------------------------------------------------------------
# Flying (pilot) camera: RunCam Phoenix 2 SE "Lens: FOV D:160° H:124° V:95°" (rv-phoenix listing).
PILOT_CAM = P("rv-phoenix", hfov=124.0, vfov=95.0)
# Start tilt: Oscar Liang, https://oscarliang.com/camera-angle/ : "If you are new to FPV, a 10-15 degree camera angle is an
# excellent starting point" (his words: "a 10°–15° camera angle is an excellent starting point"). Default = the low end;
# adjustable; raise in 5 degree steps ("Even a 5° increase can dramatically change how fast everything feels").
CAM_TILT = P("oscarliang camera-angle", default=10.0, min=0.0, max=40.0, step=5.0)
# Thermal camera: Pimoroni MLX90640 55 degree version, "Field of view: 55°x35°" (R19). Points straight down.
THERMAL_CAM = P("R19", hfov=55.0, vfov=35.0)

# --- what tap-to-name shows: node-name prefix -> (plain name, accuracy tag, colour shown for visibility?) ---
# CAD = maker drawing; DATASHEET = maker/listing numbers; ESTIMATED = drawn, check with the real part.
PART_INFO = {
    "frame_": ("Source One V6 frame part", "CAD", False),
    "frame_standoff_30mm": ("Frame standoff, 30 mm (bottom to top plate); blue = colour shown for visibility", "CAD", True),
    "frame_standoff_22mm": ("Frame standoff, 22 mm (middle to top plate); yellow = colour shown for visibility", "CAD", True),
    "loose_": ("Source One V6 frame part (loose)", "CAD", False),
    "M1_": ("Motor M1, rear right, spins clockwise", "DATASHEET", False),
    "M2_": ("Motor M2, front right, spins anticlockwise", "DATASHEET", False),
    "M3_": ("Motor M3, rear left, spins anticlockwise", "DATASHEET", False),
    "M4_": ("Motor M4, front left, spins clockwise", "DATASHEET", False),
    "loose_motor": ("Motor (not numbered until fitted)", "DATASHEET", False),
    "motor_screw": ("Motor screw (length drawn)", "ESTIMATED", True),
    "prop_M1": ("Prop on M1: clockwise (CW) prop", "DATASHEET", False),
    "prop_M2": ("Prop on M2: anticlockwise (CCW) prop", "DATASHEET", False),
    "prop_M3": ("Prop on M3: anticlockwise (CCW) prop", "DATASHEET", False),
    "prop_M4": ("Prop on M4: clockwise (CW) prop", "DATASHEET", False),
    "prop_bag": ("Props, still in their bag", "ESTIMATED", False),
    "stack_esc": ("50 A 4-in-1 ESC (speed controller), 42.9 x 39.7 mm", "DATASHEET", False),
    "stack_esc_pad_": ("ESC motor pad", "ESTIMATED", False),
    "stack_esc_batt_pad_pos": ("ESC battery pad, + (red lead)", "ESTIMATED", False),
    "stack_esc_batt_pad_neg": ("ESC battery pad, - (black lead)", "ESTIMATED", False),
    "stack_esc_fc_cable": ("8-wire ESC-to-FC cable (from the stack box)", "ESTIMATED", True),
    "stack_fc": ("F405 flight controller, 36.8 x 36.8 mm", "DATASHEET", False),
    "stack_fc_usb": ("Flight controller USB-C socket", "ESTIMATED", False),
    "stack_grommet": ("Soft stack grommet", "ESTIMATED", True),
    "stack_screw": ("Long stack screw (M3)", "DATASHEET", True),
    "stack_capacitor": ("Capacitor 35 V 1000 uF: long leg +, stripe -", "ESTIMATED", False),
    "solder_joint": ("Solder joint (shiny, cone-shaped)", "ESTIMATED", False),
    "wire_motor_": ("Motor wire to its own ESC pads", "DATASHEET", True),
    "wire_batt_red": ("Battery lead, red: to the + pad", "ESTIMATED", False),
    "wire_batt_black": ("Battery lead, black: to the - pad", "ESTIMATED", False),
    "xt60": ("XT60 battery plug", "ESTIMATED", False),
    "rx_rp1": ("RP1 V2 receiver (on UART2)", "DATASHEET", False),
    "rx_antenna": ("Receiver antenna, 65 mm T (clips onto the UFL socket)", "DATASHEET", False),
    "rx_wire_R2": ("Receiver TX wire -> FC pad R2", "ESTIMATED", True),
    "rx_wire_T2": ("Receiver RX wire -> FC pad T2", "ESTIMATED", True),
    "rx_wire_5V": ("Receiver 5V wire -> FC 5V pad", "ESTIMATED", True),
    "rx_wire_G": ("Receiver ground wire -> FC GND pad", "ESTIMATED", True),
    "cam_": ("Phoenix 2 flying camera (you fly by its picture)", "DATASHEET", False),
    "cam_cable": ("Camera cable -> FC CAM socket", "ESTIMATED", True),
    "vtx_board": ("Unify Pro HV video transmitter, 31 x 22 x 6 mm", "DATASHEET", False),
    "vtx_sma": ("VTX SMA antenna socket", "ESTIMATED", False),
    "vtx_wire_9V": ("VTX power wire -> FC 9V pad", "ESTIMATED", True),
    "vtx_wire_G": ("VTX ground wire -> FC GND pad", "ESTIMATED", True),
    "vtx_wire_VTX": ("VTX video wire from the FC VTX pad", "ESTIMATED", True),
    "vtx_wire_T1": ("VTX control wire -> FC pad T1", "ESTIMATED", True),
    "antenna_triumph": ("Triumph PRO 5.8 GHz video antenna (SMA), 78 mm", "DATASHEET", False),
    "vtx_foam_tape": ("Foam mounting tape under the VTX (colour shown for visibility; thickness drawn)", "ESTIMATED", True),
    "antenna_zip_tie_": ("Zip tie holding the antenna base to a rear standoff (colour shown for visibility)", "ESTIMATED", True),
    "usb_cable": ("USB cable from your laptop (setup only)", "ESTIMATED", False),
    "laptop_tag": ("Your laptop (not in the box)", "ESTIMATED", False),
    "battery_pack": ("GNB 1500 mAh 4S LiHV pack, 79 x 38 x 26 mm", "DATASHEET", False),
    "battery_": ("GNB 4S pack lead", "ESTIMATED", False),
    "battery_balance": ("Balance lead plug (JST-XH)", "DATASHEET", False),
    "battery_pack_liion": ("More Volts 4S 5000 mAh Li-ion pack, 79 x 44 x 44 mm (colour drawn)", "DATASHEET", False),
    "battery_liion_": ("More Volts pack lead (XT60H, JST-XH balance)", "ESTIMATED", False),
    "battery_grip_pad": ("Battery grip pad", "ESTIMATED", True),
    "strap_": ("Kevlar battery strap, 20 mm wide", "DATASHEET", True),
    "pi_strap_second_lock": ("Kevlar strap: second lock on the Pi", "DATASHEET", True),
    "pi_pcb": ("Raspberry Pi Zero 2 WH, 65 x 30 mm", "CAD", False),
    "pi_standoff": ("Nylon standoff M2.5 x 12 mm", "DATASHEET", True),
    "pi_pad_layer_": ("Pad: one of two layers of the foam mounting tape (colour shown for visibility; thickness drawn)", "ESTIMATED", True),
    "pi_standoff_tape_": ("1 cm square of foam tape under a Pi standoff (colour shown for visibility)", "ESTIMATED", True),
    "thermal_tape": ("Foam tape square holding the thermal camera's board to the pad (colour shown for visibility)", "ESTIMATED", True),
    "gps_foam_tape": ("Foam tape strip under the GPS board (colour shown for visibility)", "ESTIMATED", True),
    "zip_tie_join_": ("Where two 100 mm zip ties are joined into one long tie (colour shown for visibility)", "ESTIMATED", True),
    "pi_header": ("Pi 40-pin header (pre-soldered)", "CAD", False),
    "pi_usb_power": ("Pi power socket (micro-USB)", "ESTIMATED", False),
    "pi_bench_supply": ("Kit power supply, 5.1 V 2.5 A (bench only)", "DATASHEET", False),
    "hat_": ("SparkFun Qwiic HAT (on the Pi's 40 pins)", "CAD", False),
    "hat_qwiic_port": ("Qwiic socket on the HAT", "CAD", False),
    "thermal_": ("MLX90640 thermal camera (finds heat; lens points DOWN)", "CAD", False),
    "thermal_pin_": ("MLX90640 header pin", "CAD", False),
    "gps_": ("PA1010D GPS (antenna points UP)", "DATASHEET", False),
    "gps_pin_": ("PA1010D header pin", "DATASHEET", False),
    "cab17261_": ("CAB-17261 Qwiic-to-jumper cable", "DATASHEET", False),
    "rx_box_cable_": ("Stack box 4-wire cable: plug in the FC socket G/5V/R2/T2, cut end soldered to the receiver (wire colours not published)", "DATASHEET", True),
    "vtx_wire_unused_": ("Unused VTX wire (orange 5 V out / green audio): cut short", "DATASHEET", False),
    "vtx_wire_cap_": ("Heat shrink over an unused VTX wire, so it touches nothing", "DATASHEET", True),
    "gps_cable_": ("GPS cable (CAB-17261) lengthened with 12 cm of silicone wire per wire", "ESTIMATED", True),
    "gps_cable_joint_": ("Soldered joint in 3 mm clear heat shrink (GPS cable extension)", "ESTIMATED", True),
    "pigtail": ("Micro-USB power pigtail (meter-checked)", "ESTIMATED", False),
    "zip_tie": ("Zip tie", "ESTIMATED", True),
    "leg_": ("Landing leg: two M3 standoffs, set screws, rubber foot (planned: check in hand)", "DATASHEET", False),
    "clearance_": ("Prop circle: keep every cable outside it", "DATASHEET", False),
    "cg_": ("Centre-of-gravity mark: balance here", "ESTIMATED", False),
    "cone_pilot": ("What the flying camera sees", "DATASHEET", False),
    "cone_thermal": ("What the thermal camera sees (55 x 35 degrees, straight down)", "DATASHEET", False),
    "radio_": ("RadioMaster Pocket radio", "DATASHEET", False),
    "cell_18650": ("18650 cell", "DATASHEET", False),
    "charger_": ("ToolkitRC M7AC charger (LiPo, LiHV and Li-ion)", "DATASHEET", False),
    "charge_lead": ("Charger main lead", "ESTIMATED", False),
    "balance_lead": ("Balance lead to the charger", "ESTIMATED", False),
    "bag_": ("LiPo bag", "DATASHEET", False),
    "fireproof_surface": ("Fireproof surface (tile or tray)", "ESTIMATED", False),
    "fire_extinguisher": ("Fire extinguisher or sand bucket", "ESTIMATED", False),
    "smokestopper": ("Smoke stopper (first plug-in only)", "DATASHEET", False),
    "monitor_": ("Skyzone M5F monitor", "DATASHEET", False),
    "meter_": ("Multimeter", "DATASHEET", False),
    "iron_": ("Soldering iron", "DATASHEET", False),
    "glasses_": ("Safety glasses", "ESTIMATED", False),
    "toolkit_": ("Tool roll with hex drivers", "ESTIMATED", False),
    "order_list": ("Your order list", "ESTIMATED", False),
    "mug_": ("Mug of water just poured from the kettle (heat test target)", "ESTIMATED", False),
    "hand_": ("Your open hand, beside the mug (it must NOT be reported as hot)", "ESTIMATED", False),
    "arrow_": ("Direction arrow", "ESTIMATED", False),
    "finder_": ("VIFLY Finder 2 lost-drone beeper, 24 x 13 x 16 mm, 5 g (placement per arrival test)", "DATASHEET", False),
    "finder_tape": ("Foam tape under the Finder (colour shown for visibility; thickness drawn)", "ESTIMATED", True),
    "finder_wire_": ("Finder's 3-pin cable to the FC buzzer pads (pads not confirmed; wire colours drawn)", "ESTIMATED", True),
    "spare_sd": ("Spare microSD card for the Pi (SanDisk Ultra 32 GB), labelled SPARE", "DATASHEET", False),
    "cutaway_": ("Cut-away drawing: a motor screw's length against the motor's copper windings (sizes drawn)", "ESTIMATED", False),
}


# parts whose colour IS the message (blue 30 mm / yellow 22 mm standoffs; the cut-away's carbon, aluminium and
# copper): the viewer keeps their own colour when it highlights them, instead of tinting them orange
KEEP_COLOUR = ("frame_standoff_", "cutaway_")


def part_info(node_name):
    """Longest PART_INFO prefix that matches a node name, or None."""
    best = None
    for pre, val in PART_INFO.items():
        if node_name.startswith(pre) and (best is None or len(pre) > len(best[0])):
            best = (pre, val)
    return best[1] if best else None


# --- payload layout: simulation L515, approved by Shad 2026-11-03 (board DECISIONS.md, option 1) ---------------
# docs/build-truth/SIMULATION.md "Recommended layout". Positions are simulated, not yet checked on real parts.
# battery_x: change request 43c (approved 2026-11-03): slid forward to about 2 mm from the GPS = 58 - 28/2 - 2 - 79/2 = 2.5 mm.
# battery_ok_from/to: where the balance point stays within 5 mm of centre (verify_build.py, with the unweighed parts).
LAYOUT = P("sim L515, Shad option 1; change request 43", pi_x=-36.0, standoff=12.0, mlx_gap=4.0, gps_x=58.0, battery_x=2.5,
           battery_ok_from=-6.0, battery_ok_to=2.5, legs_min=40.0)
PAD = P("none", approx=True, why="foam/rubber pad: off-the-shelf, size cut to fit", t=2.0, margin=3.0)


# --- landing legs: Shad's choice 2026-11-03 (board DECISIONS.md) ---------------------------------------------------
# Rotor Village "M3 x 25mm Knurled Black Textured Stand-off (10pk)" CA$7.99, "68 in stock", "Material: Aluminum",
# "Height: 25mm"; "M3 x 28mm ..." CA$7.99, "59 in stock", "Height: 28mm" (pages opened 2026-11-03).
# Rear legs: two 25 mm under the rear 30 mm frame standoffs (bottom plate). Front legs: two 28 mm under the front 22 mm
# standoffs (middle plate, 8 mm higher), so both pairs end within 2 mm of the same level. Joined with M3 set screws.
# Foot: Lumenier M3 rubber landing foot, "Height: 6.3mm" (getfpv.com, US shop: freight and duty not included).
LEGS = P("rv-so25 rv-so28 gf-feet", rear_piece=25.0, front_piece=28.0, pieces=2, od=5.0, foot_h=6.3, foot_d=9.6)
