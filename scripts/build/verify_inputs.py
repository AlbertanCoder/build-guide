"""
verify_inputs.py - write the Phase F verification inputs as plain JSON (docs/build-truth/geometry/), so another checker
(for example a Fable session) can re-run every check without reading my code.

    python -I scripts/build/verify_inputs.py

Writes: assembly.json (build sequence, what each action needs and produces, state changes), netlist.json (every
connection with its source), power.json (ratings, rails, loads), tolerances.json (by accuracy tag), positions.json
(the positions the checks use, in mm), arrival.json (the in-hand tests). Facts carry a source id or URL; anything
without a source says so.
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "docs", "build-truth", "geometry")
sys.path.insert(0, HERE)
import parts as S  # noqa: E402

# ---------------------------------------------------------------------------------------------------------------
# Build sequence. 'order' is the real build order: step 7's payload work is deferred until after the first hover
# (S7.1 says so), so the replay runs S8.1-S8.5 before S7.3/S7.4/S7.4b/S7.8 and then S8.6/S8.7.
# needs/produces are names; 'buy:<id>' means a line on the Builder's buy list (buy_list.json).
# ---------------------------------------------------------------------------------------------------------------
A = []


def act(aid, step, short, needs=(), produces=(), set_=None, uses=None, tools=(), notes=""):
    A.append({"id": aid, "step": step, "short": short, "needs": list(needs), "produces": list(produces),
              "set": set_ or {}, "uses": uses or {}, "tools": list(tools), "notes": notes})


act("S1.1", 1, "Five piles", produces=["sorted"])
act("S1.2", 1, "Tick the order list", needs=["sorted"], produces=["checked"])
act("S1.3", 1, "Download the manuals", needs=["checked"], produces=["manuals"], tools=["your laptop"])
act("S2.1", 2, "Arms on the bottom plate", needs=["buy:frame", "checked"], produces=["arms_on"], tools=["buy:tools"])
act("S2.2", 2, "Standoffs", needs=["arms_on"], produces=["standoffs_on"], tools=["buy:tools"])
act("S2.3", 2, "Motors M1-M4", needs=["arms_on", "buy:motors"], produces=["motors_on"], uses={"buy:motors": 4}, tools=["buy:tools"])
act("S2.4", 2, "Motor screws clear the windings", needs=["motors_on"], produces=["motor_screws_ok"])
# Step 3 says "You need a charged flight battery for the first power-up in this step. If you have not charged one
# yet, do Step 5 first." So the replay charges the packs (Step 5) before Step 3.
act("S5.1", 5, "Cells into the radio", needs=["buy:radio", "buy:radio-cells"], produces=["radio_cells"])
act("S5.1b", 5, "Charge the radio", needs=["radio_cells"], produces=["radio_ready"])
act("S5.2", 5, "Fireproof surface, charger mains cable in", needs=["buy:charger"], produces=["charger_on"])
act("S5.3", 5, "Set LiHV and 1.0 A before the pack goes in", needs=["charger_on"], produces=["charger_set"])
act("S5.3c", 5, "Pack into the LiPo bag", needs=["buy:batteries", "buy:lipo-bag"], produces=["pack_in_bag"])
act("S5.4a", 5, "Main plug and balance lead: it starts by itself", needs=["charger_set", "pack_in_bag"], produces=["charging"])
act("S5.4", 5, "Stay beside it until the screen shows F", needs=["charging"], produces=["packs_charged"])
act("S5.5", 5, "Storage mode if not flying soon", needs=["charger_on"])
act("S3.0", 3, "ESC in the frame", needs=["motors_on", "buy:stack"], produces=["esc_on"], tools=["buy:tools"])
act("S3.1", 3, "Cut the motor wires", needs=["esc_on"], produces=["wires_cut"], tools=["buy:tools"])
act("S3.2", 3, "Tin and solder the motor wires", needs=["wires_cut"], produces=["motors_soldered"],
    tools=["buy:tools", "buy:iron-psu", "safety_glasses"])
act("S3.3", 3, "XT60 lead + capacitor", needs=["esc_on"], produces=["power_lead"], tools=["buy:tools", "buy:iron-psu"],
    uses={"buy:heat-shrink": 2})
act("S3.4", 3, "8-wire cable, then the FC", needs=["esc_on", "motors_soldered", "power_lead"], produces=["fc_on"],
    tools=["buy:tools"])
act("S3.5", 3, "First power-up through the smoke stopper, props off", needs=["fc_on", "packs_charged", "buy:smoke-stopper"],
    produces=["first_power_ok"], set_={"smoke_stopper_first": True, "battery_connected": True},
    notes="page: 'Its light must stay solid green: that means no short. Then unplug.' The first battery plug-in is here now, not S8.2")
act("S4.1", 4, "Receiver on UART2 with the stack box 4-wire cable", needs=["fc_on", "buy:receiver", "buy:stack"], produces=["rx_wired"],
    tools=["buy:tools", "buy:strippers"])
act("S4.2", 4, "Receiver antenna", needs=["rx_wired"], produces=["rx_antenna"])
act("S4.3", 4, "Camera and VTX wires", needs=["fc_on", "buy:fpv-camera", "buy:vtx"], produces=["video_wired"],
    tools=["buy:tools"])
act("S4.3b", 4, "Camera tilt about 10 degrees", needs=["video_wired"], produces=["cam_tilted"], tools=["buy:tools"])
act("S4.4", 4, "VTX antenna on", needs=["video_wired", "buy:vtx-antenna"], produces=["vtx_antenna"],
    set_={"antenna_on": True})
act("S4.5", 4, "Bind on ISM 2400", needs=["rx_antenna", "buy:radio", "radio_ready"], produces=["bound"],
    tools=["your laptop", "buy:usbc-cable"],
    notes="needs the radio powered: the radio cells and charge come in S5.1/S5.1b; replay checks the order")
act("S4.6", 4, "Betaflight on USB only", needs=["bound"], produces=["bf_setup"], tools=["your laptop", "buy:usbc-cable"])
act("S4.7", 4, "VTX at 25 mW", needs=["vtx_antenna"], produces=["vtx_set"])
act("S4.8", 4, "Fit the top plate", needs=["standoffs_on", "vtx_antenna", "bf_setup"], produces=["top_plate"],
    tools=["buy:tools"])
act("S6.0", 6, "Card flashed, I2C on", needs=["buy:pi"], produces=["pi_ready"], tools=["your laptop"])
act("S6.1", 6, "Straight male headers", needs=["buy:thermal", "buy:gps"], produces=["headers"], tools=["buy:tools", "buy:iron-psu"])
act("S6.2", 6, "HAT onto the Pi", needs=["pi_ready", "buy:qwiic"], produces=["hat_on"])
act("S6.2b", 6, "Lengthen the GPS cable", needs=["buy:qwiic", "buy:silicone-wire", "buy:heat-shrink-3mm"], produces=["gps_cable_long"],
    tools=["buy:tools", "buy:iron-psu", "meter_batteries"], uses={"buy:heat-shrink-3mm": 1},
    notes="one wire at a time; continuity check with the kit's multimeter")
act("S6.3", 6, "Cables: pins 1, 2, 3, 5", needs=["hat_on", "headers", "gps_cable_long"], produces=["sensors_cabled"])
act("S6.4", 6, "Bench power: 0x33, 0x10", needs=["sensors_cabled"], produces=["payload_bench_ok"])
act("S7.1", 7, "Payload only after the first hover", needs=["top_plate"])
act("S7.6", 7, "Cables out of the prop circles", needs=["top_plate"], produces=["cables_tidy"], uses={"buy:zip-ties": 6})
act("S7.7", 7, "Battery on the pad, strap, balance", needs=["top_plate", "buy:battery-pad", "buy:straps", "packs_charged"],
    produces=["battery_mount"], uses={"buy:straps": 1})
act("S8.1", 8, "Laptop tests", tools=["your laptop"], produces=["software_ok"])
act("S8.2", 8, "Bench power: smoke stopper, then failsafe", needs=["battery_mount", "packs_charged", "buy:smoke-stopper",
    "buy:monitor", "vtx_antenna", "bound", "bf_setup"], produces=["failsafe_ok", "video_ok"],
    set_={"smoke_stopper_first": True, "vtx_powered": True, "battery_connected": True})
act("S8.3", 8, "Motors tab, props off", needs=["failsafe_ok"], produces=["motors_ok"], tools=["your laptop", "buy:usbc-cable"])
act("S8.4", 8, "Fit the props", needs=["motors_ok", "buy:props"], produces=["props_on"], uses={"buy:props": 4},
    set_={"props_on": True, "battery_connected": False}, notes="battery out while fitting props")
act("S8.5", 8, "First hover, no payload", needs=["props_on", "licence", "registration_marked"], produces=["hovered"])
act("S7.3", 7, "Pi 36 mm behind the stack, on a pad", needs=["hovered", "payload_bench_ok", "buy:foam-tape", "buy:standoffs"],
    produces=["payload_placed"], uses={"buy:standoffs": 6}, set_={"payload_on": True})
act("S7.4", 7, "Zip ties through the windows, strap", needs=["payload_placed", "buy:zip-ties", "buy:straps"],
    produces=["payload_fixed"], uses={"buy:zip-ties": 2, "buy:straps": 1, "buy:m25-screws": 6})
act("S7.4b", 7, "Pigtail from the FC 5V pad", needs=["payload_fixed", "buy:micro-usb"], produces=["payload_powered"],
    tools=["buy:tools", "buy:iron-psu"], uses={"buy:heat-shrink": 2},
    notes="solders to the FC with the top plate already on: see the tool-access check")
act("S7.8", 7, "Fit the landing legs", needs=["payload_fixed", "buy:legs-25", "buy:legs-28", "buy:legs-feet",
    "buy:legs-setscrews", "buy:legs-footscrews"], produces=["legs_on"],
    uses={"buy:legs-25": 4, "buy:legs-28": 4, "buy:legs-feet": 4, "buy:legs-setscrews": 8, "buy:legs-footscrews": 4})
act("S8.6", 8, "Payload on, hover again", needs=["payload_powered", "legs_on", "hovered"], produces=["hovered_payload"])
act("S8.7", 8, "Heat test, props off", needs=["hovered_payload"], set_={"props_on": False})

ALWAYS_HAVE = ["licence", "registration_marked"]   # Transport Canada steps outside the build (buy:exam, buy:registration)
# Done before the 8 build steps, in the page's stage checklists (quotes from the guide page, index.html)
BEFORE_BUILD = {
    "radio_ready": "Stage 3 checklist: 'Charge the cells in the radio; set up EdgeTX: switches, arm switch, timer, model name.'",
    "meter_batteries": "Stage 1 checklist: 'Put two 1.5 V batteries (AA or AAA, whichever fits the battery door) in the multimeter. The kit does not include them. You already have these.'",
    "safety_glasses": "Stage 1 note (live page): 'Safety glasses: you already have a pair. Check the frame says Z87 or CSA.'",
    "pigtail_built": "Stage 2 checklist: 'Build the micro-USB power pigtail: cut one end, meter-check the wires, insulate with heat shrink.'",
}
# Buy-list lines used outside the 8 steps (stage checklists, parts lines), or optional by the list's own note
BUY_USED_ELSEWHERE = {
    "radio-cells": "Stage 3 checklist (charge the cells in the radio) and S5.1",
    "micro-usb": "Stage 2 checklist (build the pigtail) and S7.4b",
    "heat-shrink": "Stage 2 checklist (insulate the pigtail), S3.3, S7.4b",
    "threadlock": "Step 2 parts line: 'Threadlock (only if the manual says so)'",
    "props-spare": "optional by the list's own note: 'buy these after the first flight, for the first crash'",
    "exam": "S8.5 needs the Basic certificate",
    "registration": "S8.5 needs the drone registered and marked",
    "practice-board": "Stage 1 checklist: 'practise on one of the practice boards (the Eiechip set)'",
    "extinguisher": "Stage 5 note: 'Before your first charge: buy a small home fire extinguisher rated for electrical fires. ... Keep it within reach of the charging spot'",
}
# Approved wording changes the page may not show yet: the checks compare the 3D chips with the approved new words
# Approved wording the page may not show yet. Empty since 2026-11-03: the Builder merges approved change requests
# in its own words, and the page's actual text is the authority the 3D chips follow (architect's instruction).
APPROVED_PENDING = {}
# Decided by Shad but the wording is not approved yet (the checks use the decided design)
DECIDED_PENDING = []
# How many usable pieces one buy-list line gives (from the item names on the list)
PIECES = {"zip-ties": 100, "standoffs": 4, "m25-screws": 420, "straps": 2, "legs-25": 10, "legs-28": 10, "legs-feet": 8,
          "legs-setscrews": 20, "legs-footscrews": 8, "props": 4, "motors": 1, "heat-shrink": 1, "batteries": 1}
PIECES_SRC = {"legs-setscrews": "list item: 'includes 20 x M3 x 10 mm'", "standoffs": "list item: '4 per pack'",
              "props": "list item: 'set of 4'", "m25-screws": "list item: '420 pieces' (screws, nuts and standoffs together)"}

# Cable routes (mm, model axes) as waypoints. ESTIMATED: the path is my reading of how a cable has to go round the
# plates (no hole through a plate except the bottom-plate windows); the lengths come from the sourced parts.
def routes(p):
    z = p["z"]
    w1 = [-46.8, 0.0]                       # bottom-plate window 1 (TBS drawing), straight above the HAT ports
    port0, port1 = p["qwiic_ports"]
    top_front = 75.4                        # top plate front edge near y = -9 (TBS drawing)
    top_rear = -84.9
    gps_h = [p["gps_spots"]["front"][0], p["gps_header_offset_y"]]
    return {
        "qwiic_to_gps_front": {"len_avail": S.QWIIC_CABLE["len"] + S.GPS_EXT["cut"] - S.GPS_EXT["joints_per_wire"] * S.GPS_EXT["joint_loss"],
            "extension": {k: v for k, v in S.GPS_EXT.items() if k not in ("src", "approx", "why")},
            "len_note": "150 mm cable (R22) + one 120 mm silicone piece per wire, less 5 mm overlap at each of its 2 joints (my estimate)",
            "slack": 10.0, "pts": [
            [port1[0], port1[1], z["qwiic_port_z"]], [port1[0], -17.0, z["qwiic_port_z"]], [port1[0], -17.0, -1.0],
            [w1[0], w1[1] - 4.0, -1.0], [w1[0], w1[1] - 4.0, 2.0 + 1.0], [w1[0], -9.0, z["fc_top"] + 3.0],
            [top_front + 1.0, -9.0, z["fc_top"] + 3.0], [top_front + 1.0, -9.0, z["top_plate_top"] + 1.0],
            [gps_h[0], gps_h[1], z["top_plate_top"] + 1.6]],
            "why": "under the Pi to its edge, up to the plate, in through window 1, over the FC, out under the top plate's front edge, round it and back to the GPS header"},
        "qwiic_to_gps_rear_option": {"len_avail": 150.0, "slack": 10.0, "pts": [
            [port1[0], port1[1], z["qwiic_port_z"]], [port1[0], -17.0, z["qwiic_port_z"]], [port1[0], -17.0, -1.0],
            [-60.2, -4.0, -1.0], [-60.2, -4.0, 3.0], [top_rear - 1.0, -9.0, 20.0], [top_rear - 1.0, -9.0, z["top_plate_top"] + 1.0],
            [p["gps_spots"]["rear"][0], -9.0, z["top_plate_top"] + 1.6]],
            "why": "for comparison only: the same cable to the rear GPS spot, through window 2 and round the top plate's back edge"},
        "qwiic_to_mlx": {"len_avail": 150.0, "slack": 10.0, "pts": [
            [port0[0], port0[1], z["qwiic_port_z"]], [port0[0], port0[1], z["qwiic_port_z"] - 3.0],
            [p["mlx_header"][0] - 3.0, 0.0, z["qwiic_port_z"] - 3.0], [p["mlx_header"][0], 0.0, -(S.PAD["t"] + 0.001 * 1000 + 1.6) - 3.0]],   # camera taped to the pad, header pins down
            "why": "along under the Pi to the thermal camera's header"},
    }


# ---------------------------------------------------------------------------------------------------------------
# Positions (mm) used by the length, access and clearance checks; same numbers the models use.
# ---------------------------------------------------------------------------------------------------------------
def positions():
    F = S.FRAME
    pt, at = F["plate_t"], F["arm_t"]
    mid_top = 2 * pt + at
    top_bot = mid_top + F["standoff_short"]
    esc_bot = mid_top + S.STACK_GAP["esc_above_plate"]
    esc_top = esc_bot + S.PCB_T["t"]
    fc_bot = esc_top + S.STACK_GAP["fc_above_esc"]
    fc_top = fc_bot + S.PCB_T["t"]
    L = S.LAYOUT
    pad_t = S.PAD["t"]
    so = L["standoff"]
    pi_x = L["pi_x"]
    pi_top = -pad_t - so
    hat_z = pi_top - S.PCB_T["t"] - 8.5 - 0.8
    port_z = hat_z - 0.8 - 1.5
    r = F["wheelbase"] / 2.0 / math.sqrt(2.0)
    mlx_x = pi_x + S.PI["w"] / 2 + L["mlx_gap"] + S.MLX["d"] / 2
    return {
        "z": {"bottom_plate_top": pt, "middle_plate_top": mid_top, "top_plate_bottom": top_bot, "top_plate_top": top_bot + pt,
              "esc_bottom": esc_bot, "esc_top": esc_top, "fc_bottom": fc_bot, "fc_top": fc_top, "pi_top": pi_top,
              "hat_z": hat_z, "qwiic_port_z": port_z, "motor_base": pt + at},
        "motors": {m: S.motor_xy(m) for m in S.MOTOR_LAYOUT},
        "motor_radius": S.MOTOR["dia"] / 2,
        "esc_motor_pads": {m: [[(1 if S.motor_xy(m)[0] > 0 else -1) * (6.5 + k * 5.5),
                                (1 if S.motor_xy(m)[1] > 0 else -1) * (S.ESC["w"] / 2 - 3.0)] for k in range(3)]
                           for m in S.MOTOR_LAYOUT},
        "esc_batt_pads_x": -S.ESC["d"] / 2 + 4.0,
        "fc_pad_5v_pi": [4.0, -S.FC["w"] / 2 + 4.0],
        "fc_usb": [0.0, S.FC["w"] / 2 - 4.0],
        "stack_screws": [[sx * 15.25, sy * 15.25] for sx in (-1, 1) for sy in (-1, 1)],
        "pi_xy": [pi_x, 0.0], "mlx_xy": [mlx_x, 0.0],
        "qwiic_ports": [[pi_x - 18.5, S.PI["d"] / 2 - S.HAT["d"] + 3.0], [pi_x - 9.5, S.PI["d"] / 2 - S.HAT["d"] + 3.0]],
        "mlx_header": [mlx_x - S.MLX["d"] / 2 + 1.5, 0.0],
        "gps_spots": {"front": [L["gps_x"], 0.0], "rear": [-68.0, 0.0]},
        "gps_header_offset_y": -S.GPS["d"] / 2 + 1.5,
        "battery_x": L["battery_x"], "pack": [S.PACK["l"], S.PACK["w"], S.PACK["h"]],
        "pad": {"t": pad_t, "x0": pi_x - S.PI["w"] / 2 - S.PAD["margin"], "x1": mlx_x + S.MLX["d"] / 2 + S.PAD["margin"],
                "half_y": S.PI["d"] / 2 + S.PAD["margin"]},
        "camera_xyz": [max(p[0] for p in S.FRAME_OUTLINES["parts"]["middle_plate"]["outline"]) - S.CAMERA["depth"] / 2 - 4.0, 0.0,
                       (mid_top + top_bot) / 2],
        "vtx_xyz": [-45.0, 0.0, pt + 4.0], "rx_xyz": [-30.0, 15.0, pt + 2.0],
        "legs": {"rear": [p for p in S.FRAME_OUTLINES["assembly"]["standoffs_30mm_bottom_to_top_xy"] if p[0] < -50],
                 "front": [p for p in S.FRAME_OUTLINES["assembly"]["standoffs_22mm_middle_to_top_xy"] if p[0] > 40]},
        "standoffs_30": S.FRAME_OUTLINES["assembly"]["standoffs_30mm_bottom_to_top_xy"],
        "standoffs_22": S.FRAME_OUTLINES["assembly"]["standoffs_22mm_middle_to_top_xy"],
        "estimated_note": "stack heights, pad pads and header heights are ESTIMATED (parts.json)",
    }


# ---------------------------------------------------------------------------------------------------------------
# Wiring netlist: every connection, the documents that define it, and how long a wire is available.
# ---------------------------------------------------------------------------------------------------------------
NETS = [
    {"net": "BAT+", "ends": ["XT60 lead +", "ESC battery pad +", "capacitor +"], "wire": "stack box XT60 lead", "len_mm": None,
     "src": "R33 'Negative to negative, positive to positive'; R1 battery leads"},
    {"net": "BAT-", "ends": ["XT60 lead -", "ESC battery pad -", "capacitor -"], "wire": "stack box XT60 lead", "len_mm": None, "src": "R33"},
] + [{"net": f"{m}-phase-{k}", "ends": [f"motor {m} lead {k}", f"ESC pad {m}-{k}"], "wire": "motor lead", "len_mm": 120.0,
      "src": "R5 'Lead: 20# AWG 120mm'; R1 MOTOR 1-4 pads"} for m in S.MOTOR_LAYOUT for k in (1, 2, 3)] + [
    {"net": "ESC-FC harness", "ends": ["ESC 8-pin", "FC 8-pin"], "wire": "stack box 8-wire cable", "len_mm": None, "src": "R1, R2"},
    {"net": "RX 5V", "ends": ["RP1 5", "FC 5V (UART2 plug)"], "wire": "stack box 4-wire cable (sh1.0 plug)", "len_mm": "cut", "src": "R1, R32; stack box '2 x sh1.0 4pinsilicone cable'", "volts": 5.0},
    {"net": "RX GND", "ends": ["RP1 G", "FC G (UART2 plug)"], "wire": "cut silicone wire", "len_mm": "cut", "src": "R1"},
    {"net": "RX TX->FC", "ends": ["RP1 T", "FC R2"], "wire": "cut silicone wire", "len_mm": "cut", "src": "R1 'receiver T to R2', R32",
     "uart": ["T", "R"]},
    {"net": "FC TX->RX", "ends": ["FC T2", "RP1 R"], "wire": "cut silicone wire", "len_mm": "cut", "src": "R1, R32", "uart": ["T", "R"]},
    {"net": "Camera", "ends": ["Phoenix 2 plug", "FC CAM/G/5V socket"], "wire": "stack box camera cable", "len_mm": None, "src": "R1, R2"},
    {"net": "VTX power", "ends": ["FC 9V", "VTX 7-28V in"], "wire": "VTX cable or cut wire", "len_mm": "cut", "src": "R1 '7-28V' to '9V', R9", "volts": 9.0},
    {"net": "VTX video", "ends": ["FC VTX", "VTX video in"], "wire": "VTX cable or cut wire", "len_mm": "cut", "src": "R1"},
    {"net": "VTX control", "ends": ["FC T1", "VTX RX (SmartAudio)"], "wire": "VTX cable or cut wire", "len_mm": "cut", "src": "R1 'UART1 VTX,IRC Tamp'",
     "uart": ["T", "R"]},
    {"net": "Pi 5V", "ends": ["FC 5V pad", "Pi micro-USB power"], "wire": "micro-USB pigtail (1.42 m cable, cut)", "len_mm": 1420.0,
     "src": "PiShop 'Length: 56.25\" / 1.42m'", "volts": 5.0},
    {"net": "I2C to MLX90640", "ends": ["HAT Qwiic port 0", "MLX pins 1,2,3,5 (INT empty)"], "wire": "CAB-17261", "len_mm": 150.0,
     "src": "R22 'length is 150mm'; R19 pin order", "pins": ["3V3", "SDA", "SCL", "GND"]},
    {"net": "I2C to PA1010D", "ends": ["HAT Qwiic port 1", "GPS pins 1,2,3,5 (INT empty)"],
     "wire": "CAB-17261 lengthened: 120 mm of 26 AWG silicone wire spliced into each wire (2 joints each, 3 mm heat shrink)",
     "len_mm": 150.0 + 120.0 - 10.0, "src": "R22; R20; Shad's decision 2026-11-03; change request 43", "pins": ["3V3", "SDA", "SCL", "GND"]},
    {"net": "Video RF", "ends": ["VTX SMA female", "Triumph PRO SMA"], "wire": "connector", "len_mm": 0, "src": "R8, R10"},
    {"net": "Receiver RF", "ends": ["RP1 UFL", "65 mm T antenna UFL"], "wire": "connector", "len_mm": 0, "src": "R7"},
]
SILICONE_USES = [  # (what, pieces, mm each): my estimates for the cut wires; waste added per piece in the check
    ("VTX wires 9V, video, T1 if its own cable is too short (S4.3)", 3, 60.0),
    ("GPS cable extension (change request 43)", 4, 120.0),
]
SILICONE_WASTE_MM = 15.0      # strip ends and a bad cut, per piece (my estimate)
ZIP_TIE = {"single_mm": 100.0, "head_mm": 6.0, "grip_tail_mm": 10.0, "joined": 2,
           "note": "list item 'Zip ties 3 mm x 100 mm'; head length and the tail needed to grip are my estimates"}
PIMORONI_ORDER = ["3V3", "SDA", "SCL", "INT", "GND"]
CABLE_COLOURS = {"3V3": "red", "SDA": "blue", "SCL": "yellow", "GND": "black"}

CONNECTORS = [
    {"pair": "flight pack -> quad", "a": "XT60 (pack, R12 'Discharge Lead: 85mm, XT60')", "b": "XT60 (stack box 'XT60 Power cable', R2)", "mates": True},
    {"pair": "pack -> smoke stopper", "a": "XT60", "b": "XT30 & XT60 in and out (R14)", "mates": True},
    {"pair": "pack -> monitor", "a": "XT60", "b": "monitor 'included cable with XT60 plug' (R17)", "mates": True},
    {"pair": "pack -> charger", "a": "XT60 + JST-XH balance (R12)", "b": "charger 'output main port', 'balance port': type not published (R11, R45)", "mates": None},
    {"pair": "VTX -> antenna", "a": "SMA Female Socket (R8)", "b": "Connector: SMA (R10)", "mates": True},
    {"pair": "receiver -> antenna", "a": "UFL socket (R7)", "b": "65mm UFL T antenna (R7)", "mates": True},
    {"pair": "HAT -> sensors", "a": "Qwiic 1 mm JST (R21, R22)", "b": "CAB-17261 female jumpers onto male 1x5 header (R22)", "mates": True},
    {"pair": "FC -> laptop", "a": "USB Type-C (R2)", "b": "USB-C data cable (buy list)", "mates": True},
    {"pair": "pigtail -> Pi", "a": "micro-USB male (PiShop cable)", "b": "Pi Zero micro-USB power", "mates": True},
    {"pair": "iron -> adapter", "a": "Power Interface: 5.5*2.5 (R15)", "b": "24 V 3 A, 5.5 x 2.5 mm plug (shopping list)", "mates": True,
     "check": "polarity: centre-positive not confirmed for the iron"},
    {"pair": "legs -> frame standoffs", "a": "M3 knurled standoff (female assumed)", "b": "frame standoff M3 (R3) via M3 set screw", "mates": None},
]

POWER = {
    "pack_v": {"min": 4 * 3.3, "nominal": 15.2, "max": 17.4, "src": "R12 '15.2V (LiHV)'; R42 '4.35V LiHv' x 4"},
    "rated": [
        {"part": "ESC", "min": 3 * 3.0, "max": 6 * 4.35, "on": "pack", "src": "R2 'Input Voltage: 3-6S Lipo'"},
        {"part": "FC", "min": 3 * 3.0, "max": 6 * 4.35, "on": "pack", "src": "R2 'Input Voltage: 3-6S LiPo'"},
        {"part": "VTX", "min": 6.0, "max": 28.0, "on": "9V rail", "src": "R9 'Input ... 6V to 28V (2S - 6S) VBat'"},
        {"part": "camera", "min": 5.0, "max": 36.0, "on": "5V rail", "src": "rv-phoenix 'Power: DC 5-36V'"},
        {"part": "receiver", "min": 5.0, "max": 5.0, "on": "5V rail", "src": "R7 'Working voltage: 5v'"},
        {"part": "Pi Zero 2 W", "min": 5.0, "max": 5.25, "on": "5V rail", "src": "kit supply 'Micro-USB Power Supply, 5.1V/2.5A' (R24); 5.25 V upper limit NOT sourced"},
        {"part": "MLX90640", "min": 3.0, "max": 6.0, "on": "3V3 (HAT)", "src": "R19 '3-6V supply'"},
        {"part": "PA1010D", "min": 3.0, "max": 5.0, "on": "3V3 (HAT)", "src": "R20 '3V to 5V compatible'"},
        {"part": "smoke stopper", "min": 7.0, "max": 25.0, "on": "pack", "src": "R14 'Input Voltage: 7-25V'"},
        {"part": "monitor", "min": 2 * 3.0, "max": 6 * 4.35, "on": "pack", "src": "R17 '2-6S DC IN'"},
    ],
    "rails": {"5V": {"amps": 3.0, "src": "R2 '5V 3A'"}, "9V": {"amps": 2.5, "src": "R2 '9V 2.5A'"}},
    "loads": [
        {"part": "VTX at 25 mW", "rail": "9V", "amps": 0.25, "src": "R9 '25mW: 250mA'"},
        {"part": "Pi Zero 2 W", "rail": "5V", "amps": None, "src": "not published as a draw (the kit's 2.5 A is the supply rating)"},
        {"part": "receiver", "rail": "5V", "amps": None, "src": "not published"},
        {"part": "camera", "rail": "5V", "amps": None, "src": "not published"},
        {"part": "MLX90640 + PA1010D", "rail": "5V via the Pi's 3V3", "amps": None, "src": "not fetched"},
    ],
    "iron": {"watts": 65.0, "src_w": "R15 'Power: 65w'", "adapter_v": 24.0, "adapter_a": 5.0,
             "src_adapter": "buy list (live page, iron-psu): 'SHNITPWR 24 V DC 5 A 120 W power supply for the iron (5.5 x 2.5 mm plug)'"},
}

TOLERANCES = {
    "CAD": {"mm": 0.2}, "DATASHEET": {"mm": 0.5}, "ESTIMATED": {"mm": 2.0, "pct": 10.0},
    "holes_mm": 0.2, "weights_pct": 5.0, "hand_placement_mm": 3.0,
    "notes": "CAD/DATASHEET/ESTIMATED and holes/weights from the Phase F brief; hand placement (+-3 mm, where Shad sets "
             "the Pi, pad and GPS by hand) is my assumption. Each sample draws uniformly inside the band.",
    "seed": 20261103, "runs": 10000,
}

ARRIVAL = [
    {"item": "Landing-leg standoffs + set screws", "parcel": "Rotor Village (legs) + set-screw assortment",
     "test": "Screw two leg standoffs together with one M3 x 10 set screw, then screw that onto a frame standoff.",
     "pass": "Both ends take the set screw and the joint feels tight with no wobble.",
     "fail": "If an end is not threaded inside, use M3 x 25 + M3 x 28 male-female standoffs instead, or one long M3 screw through both."},
    {"item": "Stack", "parcel": "Rotor Village (GEPRC stack)",
     "test": "Fit the ESC and FC on the four stack screws and check each nut is fully on; feel under the bottom plate where the pad goes. Find the + and - marks beside the ESC's battery pads, any arrow or FRONT mark on the FC, whether the camera cable plugs straight in or the camera goes on pads, and (battery in, props off) that the GND/5V/LED pad group reads about 5 V.",
     "pass": "Nuts fully on, nothing sticks out more than about 1 mm under the plate, the marks are found, the camera connection is known, and the LED group reads about 5 V.",
     "fail": "Nut will not go on: use the longer screws. Something sticks out: cut a hole in the pad there. No 5 V on the LED pads: ask before soldering the pigtail there."},
    {"item": "Top plate sits flat", "parcel": "Frame",
     "test": "Fit the top plate on all eight standoffs and press each corner.",
     "pass": "It sits flat and does not rock.",
     "fail": "Swap standoffs between corners until it sits flat; if one is clearly short, ask Rotor Village or TBS for a spare."},
    {"item": "Drone stands level on its legs", "parcel": "Rotor Village (legs) + feet",
     "test": "After fitting the legs, stand the drone on a flat table and look from the side.",
     "pass": "All four feet touch and it does not rock.",
     "fail": "Swap leg pieces between corners until it stands steady."},
    {"item": "Battery and GPS do not touch", "parcel": "Battery + GPS (after balancing)",
     "test": "Measure the pack: the design assumes 79 mm; a pack over 81 mm closes the 2 mm gap. After balancing (S7.7), look at the gap between the front of the battery and the GPS board.",
     "pass": "The pack is 81 mm long or less, and the battery and the GPS do not touch.",
     "fail": "Move the GPS forward, up to the front edge of the top plate."},
    {"item": "Motor screw length", "parcel": "Frame + motors",
     "test": "Before fitting, hold a motor screw against the arm and the motor: arm (6 mm) plus thread inside the motor base.",
     "pass": "The screw goes in fully and the motor still spins freely by hand.",
     "fail": "If it rubs or stops, use a 1-2 mm shorter screw (motor box or frame hardware)."},
    {"item": "Packs and charger", "parcel": "Rotor Village (packs, charger)",
     "test": "Read each pack's label for HV or LiHV. Plug a pack's XT60 and balance plug into the charger (charger off) to see they fit. Then see whether LipoStorage brings a FULL pack down to 3.85 V.",
     "pass": "Labels say HV or LiHV, both plugs fit, and you know whether storage mode can lower a full pack.",
     "fail": "No HV on the label: charge as LiPo (4.20 V). Main socket is XT30: buy an XT60-to-XT30 charge lead. Storage cannot lower a pack: fly it down or leave it a few days before storing."},
    {"item": "Iron adapter", "parcel": "Amazon.ca (24 V adapter)",
     "test": "Read the adapter's label: it should say 24 V and 5 A. Meter on DC volts: red probe in the plug's centre, black on the outside sleeve, adapter in the wall.",
     "pass": "About +24 V (positive), within what the label allows.",
     "fail": "A minus reading: do not use it with the iron; message the shop with a photo. A reading far from the label: do not use it."},
    {"item": "Pi standoffs fit the Pi", "parcel": "PiShop",
     "test": "Screw one M2.5 nylon standoff into a Pi corner hole by hand.",
     "pass": "It goes through and sits flat.",
     "fail": "If the hole is too small, use the M2.5 screws from the nylon set, not a bigger size."},
    {"item": "Foam tape and boards", "parcel": "Canadian Tire (foam tape) + PiShop (thermal camera, GPS)",
     "test": "Measure the foam tape's thickness and stick two layers on scrap; press the thermal camera's back and the GPS board's back onto a tape square; wrap a string round the Pi on its standoffs and measure the loop; check the foot screw length against a foot.",
     "pass": "Two layers stay put, both boards sit flat on the tape, the loop is shorter than two joined 100 mm zip ties (about 168 mm usable), and the foot screw holds the foot.",
     "fail": "Boards do not sit flat: add a second layer of tape so parts sit in the foam. Loop too long: join a third tie or buy longer ties. Foot screw wrong: buy the right length (Stage 4 list)."},
    {"item": "Camera tilt adjust", "parcel": "Frame (TPU camera mount) + camera",
     "test": "Fit the camera and look for side screws that let it tilt.",
     "pass": "It tilts to about 10 degrees up and locks.",
     "fail": "If it is fixed, check the frame's other camera plates or ask on the TBS page; do not print a part."},
    {"item": "Receiver, video transmitter and smoke stopper", "parcel": "Rotor Village (receiver, VTX, smoke stopper)",
     "test": "Step 4: plug only USB into the FC and look at the receiver's light; note the Wi-Fi name it shows in Wi-Fi mode. Step 3 (S3.5), the first battery power-up through the smoke stopper: find the smoke stopper's light. Step 8 (S8.2): watch the VTX's light at start-up.",
     "pass": "The receiver light is on with USB alone; the smoke stopper shows solid green; the VTX's start-up flashes end with the power group, 3 red then 1 blue (25 mW, its lowest power), then a steady blue light (locked to the legal channels).",
     "fail": "No receiver light on USB: do the channel check on a battery through the smoke stopper (props off). Smoke stopper light off and beeping: unplug at once. Other VTX flashes: check the manual's table before flying."},
    {"item": "5 V rail carries the Pi, camera and receiver", "parcel": "Everything on the drone",
     "test": "With props off and the payload fitted, power on and run 'vcgencmd get_throttled' on the Pi.",
     "pass": "It prints throttled=0x0.",
     "fail": "Any other value: power the Pi from a separate 5 V regulator."},
    {"item": "Practice boards", "parcel": "Amazon.ca (Eiechip practice boards)",
     "test": "When the boards arrive, check that the pads take solder on the side you use: tin one pad on each side of a board (the listing says double-sided; pad size and hole spacing are not stated).",
     "pass": "Solder flows onto the pads on the side you use and they stay on the board.",
     "fail": "A side will not take solder: use the other side, or another board from the set. Pads lift off: use a lower iron temperature and less time."},
    {"item": "Pi joins the iPhone hotspot", "parcel": "PiShop (Raspberry Pi kit) + your iPhone + laptop",
     "test": "After you write the card (S6.0), turn on the iPhone's Personal Hotspot with Maximize Compatibility on (2.4 GHz). Power the Pi from the kit's supply in PWR IN, join the laptop to the same hotspot, and type ssh username@raspberrypi.local.",
     "pass": "The Pi joins the hotspot and the laptop logs in over ssh.",
     "fail": "Check Maximize Compatibility is on (the Pi Zero 2 W has 2.4 GHz Wi-Fi only), and that the hotspot name and password in Imager are exact; write the card again."},
    {"item": "Radio on USB power alone", "parcel": "Rotor Village (radio)",
     "test": "Does the radio work on USB power alone? With its 18650 cells out, plug its USB-C cord into a USB charger and switch the radio on.",
     "pass": "You know whether it switches on and its screen works on USB alone (useful for setup at the desk).",
     "fail": "It does not switch on without cells: put the charged cells back in. Either way, fly on its cells."},
    {"item": "Software and props", "parcel": "Rotor Village (props) + your laptop",
     "test": "In Betaflight's Motors tab, see whether there is a slider for each motor or only the Master slider. Try the kit's prop tool on a prop nut. Read the props' CW/CCW marking.",
     "pass": "You know how the Motors tab spins one motor, the prop tool fits the nut, and you can tell CW from CCW props.",
     "fail": "Only a Master slider: spin one motor at a time with the others' sliders at zero as the tab allows, or ask. No letters on a prop: hold it flat, the leading edge is the higher edge; match it to the motor's spin."},
    {"item": "Quad battery lead reaches the pack", "parcel": "Stack (XT60 lead) + pack",
     "test": "With the pack strapped on, plug the pack's XT60 into the quad's lead.",
     "pass": "They meet without stretching and stay clear of the props.",
     "fail": "Solder a longer XT60 lead (same wire size) or move the pack within its balance range."},
    {"item": "Camera cable length", "parcel": "Stack (camera cable) + camera",
     "test": "Hold the camera in its mount and run its cable to the FC's CAM socket.",
     "pass": "It reaches with a little slack.",
     "fail": "Use the camera's own 6-pin cable or splice in silicone wire."},
    {"item": "Multimeter basics", "parcel": "Rotor Village (tool kit) + two 1.5 V batteries you have at home",
     "test": "Find the meter's battery cover (and whether it needs the kit's small screwdriver); put in two 1.5 V batteries. Find the dial position for DC volts that covers about 24 V, the two sockets the leads use for volts, and the beep (continuity) symbol. Touch the probes together on beep.",
     "pass": "You know the battery cover, the DC volts position, the two sockets, and it beeps when the probes touch.",
     "fail": "No beep symbol: use the lowest resistance (ohms) setting instead; touching probes should read close to 0."},
    {"item": "Heat source for the heat shrink", "parcel": "Rotor Village (tool kit + 3 mm heat shrink)",
     "test": "Slide a spare 1 cm piece of the 3 mm heat shrink onto a scrap of wire, heat the iron, and stroke the tube with the side of the iron (not the tip).",
     "pass": "The tube shrinks tight round the wire and is not melted through.",
     "fail": "Use a lighter held well back (about 3 cm), moving it all the time. No lighter at home: it is not on the list yet, ask before buying."},
    {"item": "Iron and its cables", "parcel": "Rotor Village (tool kit)",
     "test": "Look at both ends of the kit's XT60 to DC cable, and find the iron's polarity drawing (a dot and ring with + and -). The first time the iron is on, time how long it takes to melt solder, find how to set the temperature, and write the time down.",
     "pass": "You know which end goes into the battery and which into the iron, the iron's drawing matches the adapter, and you have its heat-up time.",
     "fail": "No polarity drawing: power the iron only from a charged pack on the kit's own XT60 to DC cable, and message the shop."},
    {"item": "Micro-USB cable for the pigtail", "parcel": "PiShop (micro-USB cable)",
     "test": "Before cutting, look inside the small micro-USB plug for the row of five pins, and note the wire colours once the jacket is stripped (Stage 1 pigtail).",
     "pass": "You can see pin 1 at one end and pin 5 at the other, and the two thicker wires are found.",
     "fail": "If the colours do not match red/black, go by the thicker wires and the meter check (Stage 1)."},
    {"item": "Stack box 4-wire cable", "parcel": "Rotor Village (GEPRC stack box)",
     "test": "Note the four wire colours on the small 4-wire cable, and push its plug into the FC's 4-pin socket marked G, 5V, R2, T2 (no power).",
     "pass": "It plugs in fully one way only, and you know which colour comes from which socket pin.",
     "fail": "If it does not fit that socket, use the other 4-wire cable from the box, or solder to the R2/T2 pads instead."},
    {"item": "Frame", "parcel": "Rotor Village (TBS Source One V6)",
     "test": "Look for a hole that fits the antenna's SMA nut, and for any sheet in the frame box naming the top-plate screw size and threadlock.",
     "pass": "You know where the antenna mounts and which screws hold the top plate.",
     "fail": "No SMA hole: hold the antenna's base with the two zip ties to the rear standoffs (Step 4). No sheet: use the short M3 screws, no threadlock."},
    {"item": "GPS cable route", "parcel": "Frame + PiShop (Pi, HAT) + GPS + Qwiic cable",
     "test": "Before you cut anything, hold the Pi and the GPS in place and lay a piece of string along the cable's path in the 3D view: from the HAT's second Qwiic port, up through the bottom plate's window, over the flight controller, round the front of the top plate to the GPS pins. Measure the string.",
     "pass": "The string is no longer than 250 mm (the 150 mm cable plus the 12 cm extension, less the joints).",
     "fail": "Cut longer extension pieces (the string length minus 140 mm, plus 10 mm), from the same silicone wire."},
    {"item": "Motor screws line up with the arm slots", "parcel": "Frame + motors",
     "test": "Sit one motor on an arm and look through the arm's four slots from below.",
     "pass": "All four motor screw holes show through a slot.",
     "fail": "If one hole sits just past a slot's end, try the motor turned a quarter turn; if it still misses, ask TBS or Rotor Village before forcing a screw."},
    {"item": "Iron reaches the flight controller pad with the top plate on", "parcel": "Frame + stack (after step 4)",
     "test": "With the top plate fitted, slide the cold iron tip in from the side to the FC's 5V and GND pads.",
     "pass": "The tip touches the pads without touching the top plate or other parts.",
     "fail": "Take the top plate off (4 screws) to solder the pigtail, then put it back."},
    {"item": "USB-C plug with the top plate on", "parcel": "Stack + USB-C cable",
     "test": "With the top plate fitted, plug the USB-C cable into the FC.",
     "pass": "It goes fully in without pushing on the top plate.",
     "fail": "Use a thinner or right-angle USB-C plug, or loosen the top plate for the Motors tab."},
    {"item": "Payload fit under the plate", "parcel": "Frame + Pi + thermal camera + foam tape",
     "test": "Hold the Pi on its standoffs and the thermal camera on the foam under the bottom plate at the marked spots.",
     "pass": "Both sit flat on carbon, the zip-tie windows are next to the Pi, and nothing touches the stack screws.",
     "fail": "Slide the pod a few mm forward or back (simulation allows this) and recheck the lens view."},
]


ARRIVAL_NEEDS = {   # buy-list ids each test needs in hand; the first one is the part being tested
    "Landing-leg standoffs + set screws": ["legs-25", "legs-28", "legs-setscrews", "frame"],
    "Stack": ["stack", "frame"],
    "Top plate sits flat": ["frame"],
    "Drone stands level on its legs": ["legs-feet", "legs-25", "legs-28", "legs-footscrews"],
    "Battery and GPS do not touch": ["batteries", "gps"],
    "Motor screw length": ["motors", "frame"],
    "Packs and charger": ["batteries", "charger"],
    "Iron adapter": ["iron-psu", "tools"],
    "Pi standoffs fit the Pi": ["standoffs", "pi"],
    "Foam tape and boards": ["foam-tape", "thermal", "gps"],
    "Camera tilt adjust": ["fpv-camera", "frame"],
    "Receiver, video transmitter and smoke stopper": ["receiver", "stack", "vtx", "smoke-stopper"],
    "5 V rail carries the Pi, camera and receiver": ["pi", "stack", "fpv-camera", "receiver"],
    "Software and props": ["props", "tools"],
    "Practice boards": ["practice-board"],
    "Pi joins the iPhone hotspot": ["pi"],
    "Radio on USB power alone": ["radio"],
    "Quad battery lead reaches the pack": ["stack", "batteries"],
    "Camera cable length": ["fpv-camera", "stack"],
    "Multimeter basics": ["tools"],
    "Heat source for the heat shrink": ["tools", "heat-shrink-3mm"],
    "Iron and its cables": ["tools"],
    "Micro-USB cable for the pigtail": ["micro-usb"],
    "Stack box 4-wire cable": ["stack"],
    "Frame": ["frame"],
    "GPS cable route": ["qwiic", "gps", "pi", "frame"],
    "Motor screws line up with the arm slots": ["motors", "frame"],
    "Iron reaches the flight controller pad with the top plate on": ["stack", "frame", "tools"],
    "USB-C plug with the top plate on": ["usbc-cable", "stack", "frame"],
    "Payload fit under the plate": ["pi", "thermal", "foam-tape", "frame"],
}
SHOP_NAMES = {"Rotor Village": "Rotor Village", "PiShop": "PiShop", "Abra Electronics": "Abra", "Walmart": "Walmart",
              "Amazon.ca": "Amazon", "EpicFPV (Canada)": "EpicFPV", "Canadian Tire": "Canadian Tire"}


def add_shops(checks):
    """shop = where the part being tested comes from; shops = every shop whose parcel the test needs (page filter)."""
    import json as _j
    buy = _j.load(open(os.path.join(OUT, "buy_list.json"), encoding="utf-8"))["lines"]
    shop_of = {l["id"]: SHOP_NAMES.get(l["shop"], "other") for l in buy}
    for c in checks:
        need = ARRIVAL_NEEDS[c["item"]]
        missing = [b for b in need if b not in shop_of]
        assert not missing, (c["item"], missing)
        c["needs_buy"] = need
        c["shop"] = shop_of[need[0]]
        c["shops"] = sorted({shop_of[b] for b in need})
    return checks


def main():
    os.makedirs(OUT, exist_ok=True)
    dump = lambda name, obj: json.dump(obj, open(os.path.join(OUT, name), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    pos = positions()
    dump("routes.json", routes(pos))
    dump("assembly.json", {"actions": A, "always_have": ALWAYS_HAVE, "before_build": BEFORE_BUILD,
                           "buy_used_elsewhere": BUY_USED_ELSEWHERE, "approved_wording_pending": APPROVED_PENDING,
                           "decided_wording_pending": DECIDED_PENDING, "pieces_per_line": PIECES, "pieces_src": PIECES_SRC,
                           "safety_rules": [
        "props stay off until S8.4 and are off again for the heat test S8.7",
        "the first battery plug-in (S8.2) goes through the smoke stopper",
        "the video antenna is on (S4.4) before the VTX is ever powered",
        "the battery is out while the props go on (S8.4)",
        "the payload goes on only after the bare quad has hovered (S8.5 before S7.3)"]})
    dump("positions.json", pos)
    dump("netlist.json", {"nets": NETS, "pimoroni_pin_order": PIMORONI_ORDER, "cable_colours": CABLE_COLOURS,
                          "silicone_uses": SILICONE_USES, "zip_tie": ZIP_TIE, "silicone_waste_mm": SILICONE_WASTE_MM,
                          "connectors": CONNECTORS})
    dump("power.json", POWER)
    dump("tolerances.json", TOLERANCES)
    dump("arrival.json", {"checks": add_shops(ARRIVAL),
                          "shop_note": "shop = where the part being tested comes from (from buy_list.json); shops = every parcel the test needs; 'other' = SparkFun (US), GetFPV (US)"})
    print("WROTE assembly, positions, netlist, power, tolerances, arrival ->", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
