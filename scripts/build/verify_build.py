"""
verify_build.py - check the whole build guide before the parts arrive.

    python -I scripts/build/verify_build.py            # plain-English report; exit 1 if any check FAILS
    python -I scripts/build/verify_build.py --quiet    # just the summary lines (used by the gate)

What it does (Phase F brief, .claude/audit-2026-11-03/OPUS-PHASE-F-VERIFICATION.md):
  1. Replays the build action by action (docs/build-truth/geometry/assembly.json) and checks, at every action, that
     what it needs already exists and that the safety order holds.
  2. Fit, tool access, clearance, wiring, power, weight and balance checks, from the sourced sizes (parts.json),
     positions (positions.json), cable routes (routes.json), netlist (netlist.json) and ratings (power.json).
  3. Repeats every measured check 10,000 times with each size varied inside its accuracy band (tolerances.json),
     with a fixed seed, and says which input drives any failure.
  4. Cross-checks the buy list, the page's action ids, the 3D models' action lists and the motor order.
Every result is PASS, FAIL, NEEDS REAL PARTS (it cannot be settled without the part in hand: it becomes an arrival
check) or PAGE FIX (a mismatch between the page's own lists; it does not stop anything fitting; the page owner fixes it).
Writes docs/build-truth/verification-summary.json and docs/build-truth/verification-results.csv.
Needs numpy (already used by simulate_design.py).
"""

import csv
import datetime
import glob
import html
import json
import math
import os
import re
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
GEO = os.path.join(ROOT, "docs", "build-truth", "geometry")
OUTD = os.path.join(ROOT, "docs", "build-truth")
PAGE = os.path.normpath(os.path.join(ROOT, "..", "build-guide-ui", "index.html"))   # Builder's LIVE page, read only
if "--page" in sys.argv:                                                           # override: --page PATH
    PAGE = os.path.abspath(sys.argv[sys.argv.index("--page") + 1])
sys.path.insert(0, HERE)
import simulate_design as SIM  # noqa: E402  (the design simulation's frame geometry and ray checks)


def load(name):
    with open(os.path.join(GEO, name), encoding="utf-8") as f:
        return json.load(f)


PARTS = load("parts.json")["parts"]
POS = load("positions.json")
ASM = load("assembly.json")
NET = load("netlist.json")
PWR = load("power.json")
TOL = load("tolerances.json")
ARR = load("arrival.json")["checks"]
BUY = load("buy_list.json")
# The buy list comes from the live page's buy-data (it was a hand-made copy, stale since 10:10 on 2026-11-03);
# buy_list.json is rewritten as a copy so other tools and readers see the same list.
BUY_SRC = "buy_list.json (page not found)"
if os.path.exists(PAGE):
    _m = re.search(r'<script type="application/json" id="buy-data">(.*?)</script>', open(PAGE, encoding="utf-8").read(), re.S)
    if _m:
        BUY = json.loads(_m.group(1))
        BUY_SRC = PAGE + " #buy-data"
        with open(os.path.join(GEO, "buy_list.json"), "w", encoding="utf-8") as _f:
            json.dump(BUY, _f, indent=1, ensure_ascii=False)
ROUTES = load("routes.json")
V = lambda n: PARTS[n]["values_mm"]  # noqa: E731
RUNS = int(TOL["runs"])
SEED = int(TOL["seed"])

RESULTS = []          # every check: dict(id, cat, action, name, status, margin, unit, detail, pass_rate, driver, arrival)


def add(cid, cat, action, name, status, detail="", margin=None, unit="mm", arrival=None, mc=None):
    RESULTS.append({"id": cid, "category": cat, "action": action, "name": name, "status": status, "detail": detail,
                    "margin": None if margin is None else round(float(margin), 2), "unit": unit, "arrival": arrival,
                    "pass_rate": None, "runs": 0, "driver": "", "worst": None, "_mc": mc})


# =================================================================================================================
# Sizes that vary in the tolerance runs. tag decides the band (tolerances.json); 'src' says where the number is from.
# =================================================================================================================
F = V("FRAME")
DIMS = {
    # name: (nominal, tag, source)
    "bottom_t": (2.0, "RANGE 2.0-2.5", "TBS drawing label '2mm'; Rotor Village listing says 'Bottom Plate: 2.5mm'"),
    "mid_t": (F["plate_t"], "CAD", "TBS drawing"), "top_t": (F["plate_t"], "CAD", "TBS drawing"),
    "arm_t": (F["arm_t"], "CAD", "TBS drawing / listing 'Arm thickness 5\": 6mm'"),
    "so22": (F["standoff_short"], "DATASHEET", "R3 'Standoff height: 30 and 22mm'"),
    "so30": (F["standoff_long"], "DATASHEET", "R3"),
    "esc_gap": (V("STACK_GAP")["esc_above_plate"], "ESTIMATED", "grommet height, drawn"),
    "fc_gap": (V("STACK_GAP")["fc_above_esc"], "ESTIMATED", "grommet + gap, drawn"),
    "pcb_t": (V("PCB_T")["t"], "ESTIMATED", "board thickness, drawn"),
    "stack_screw": (30.0, "DATASHEET", "R2 stack box '4 x M3*30 Screws'"),
    "nut_h": (4.0, "ESTIMATED", "M3 nylon nut height, not published in the stack listing"),
    "motor_r": (V("MOTOR")["mount"] / 2.0, "DATASHEET", "R4 'Mounting holes: 16mm M3' (16 mm across = 8.0 from the shaft)"),
    "slot_r0": (8.0, "HOLE", "TBS drawing: arm slot inner end 8.0 mm from the shaft"),
    "slot_r1": (9.5, "HOLE", "TBS drawing: arm slot outer end 9.5 mm from the shaft"),
    "slot_w": (3.0, "CAD", "TBS drawing: slot width 3.0 mm"),
    "m3_d": (3.0, "DATASHEET", "M3 = 3.0 mm screw"),
    "esc_holes": (V("ESC")["holes"], "HOLE", "R2 'hole30.5x30.5'"), "fc_holes": (V("FC")["holes"], "HOLE", "R2"),
    "frame_stack": (F["stack_hole"], "HOLE", "R3 'Stack Mounting: 30.5 x 30.5mm'"),
    "pi_x": (POS["pi_xy"][0], "HAND", "approved layout L515: Pi 36 mm behind the stack centre"),
    "pi_y": (0.0, "HAND", "Pi centred left-right"),
    "standoff": (V("LAYOUT")["standoff"], "DATASHEET", "R25 'Nylon Standoffs - M2.5x12mm'"),
    "pad_t": (V("PAD")["t"], "ESTIMATED", "foam pad thickness, drawn"),
    "hdr_h": (8.5, "ESTIMATED", "HAT header height, drawn (simulate_design.py)"),
    "qwiic_h": (3.0, "ESTIMATED", "Qwiic plug height, drawn"),
    "lens_drop": (6.0, "ESTIMATED", "MLX lens below its board, drawn"),
    "mlx_tape": (1.0, "ESTIMATED", "foam tape square under the thermal camera (approved S7.3), thickness drawn"),
    "gps_x": (V("LAYOUT")["gps_x"], "HAND", "approved layout: GPS on the top plate at x 58"),
    "battery_x": (V("LAYOUT")["battery_x"], "HAND", "S7.7 'Start at 4 mm behind'"),
    "pack_l": (V("PACK")["l"], "DATASHEET", "R12 '79mm x 38mm x 26mm'"), "pack_w": (V("PACK")["w"], "DATASHEET", "R12"),
    "gps_w": (V("GPS")["w"], "DATASHEET", "R20 'approx 28x21x9mm'"), "gps_d": (V("GPS")["d"], "DATASHEET", "R20"),
    "prop_d": (V("PROP")["dia"], "DATASHEET", "R6 'Length: 5.1 inch'"),
    "wheelbase": (F["wheelbase"], "CAD", "R3 'Wheelbase 5\": 240'"),
    "leg_rear": (V("LEGS")["rear_piece"], "DATASHEET", "rv-so25 'Height: 25mm'"),
    "leg_front": (V("LEGS")["front_piece"], "DATASHEET", "rv-so28 'Height: 28mm'"),
    "foot_h": (V("LEGS")["foot_h"], "DATASHEET", "gf-feet 'Height: 6.3mm'"),
    "setscrew": (10.0, "DATASHEET", "buy list 'includes 20 x M3 x 10 mm'"),
    "iron_tip": (V("IRON")["tip_d"], "DATASHEET", "R15 iron tip"),
    "usb_plug": (6.5, "ESTIMATED", "USB-C plug body thickness, not published for the cable on the list"),
    "motor_base_r": (V("MOTOR")["dia"] / 2.0, "DATASHEET", "R5 'Motor Dimensions: 28.6 x 32.8 mm'"),
    "motor_lead": (V("MOTOR")["lead_len"], "DATASHEET", "R5 'Lead: 20# AWG 120mm'"),
    "qwiic_len": (V("QWIIC_CABLE")["len"], "DATASHEET", "R22 'length is 150mm'"),
    "ext_cut": (V("GPS_EXT")["cut"], "HAND", "change request 43: cut 120 mm pieces"),
    "joint_loss": (V("GPS_EXT")["joint_loss"], "ESTIMATED", "overlap lost at each spliced joint, my estimate"),
}


def sample(n, seed):
    """n random builds. CAD +-0.2 mm, DATASHEET +-0.5 mm, ESTIMATED +-max(2 mm, 10 %) (never below a quarter of the
    drawn size), HOLE +-0.2 mm, HAND +-3 mm, RANGE = anywhere in the range; each uniform."""
    rng = np.random.default_rng(seed)
    out = {}
    for k, (nom, tag, _) in DIMS.items():
        if tag.startswith("RANGE"):
            lo, hi = [float(x) for x in tag.split()[1].split("-")]
            out[k] = rng.uniform(lo, hi, n)
            continue
        band = {"CAD": TOL["CAD"]["mm"], "DATASHEET": TOL["DATASHEET"]["mm"], "HOLE": TOL["holes_mm"],
                "HAND": TOL["hand_placement_mm"]}.get(tag)
        if band is None:  # ESTIMATED
            band = max(TOL["ESTIMATED"]["mm"], abs(nom) * TOL["ESTIMATED"]["pct"] / 100.0)
        v = rng.uniform(nom - band, nom + band, n)
        if tag == "ESTIMATED" and nom > 0:
            v = np.maximum(v, nom * 0.25)
        out[k] = v
    out["_wscale"] = rng.uniform(1 - TOL["weights_pct"] / 100.0, 1 + TOL["weights_pct"] / 100.0, (n, 32))
    return out


NOM = {k: np.array([v[0]]) for k, v in DIMS.items()}
NOM["_wscale"] = np.ones((1, 32))


def z_fc_top(d):
    return d["bottom_t"] + d["arm_t"] + d["mid_t"] + d["esc_gap"] + d["pcb_t"] + d["fc_gap"] + d["pcb_t"]


def z_top_under(d):
    return d["bottom_t"] + d["so30"]


def lowest_payload(d):
    """lowest point of the payload below the bottom plate's underside (negative = below)."""
    z_pi = -(d["pad_t"] + d["standoff"]) - d["pcb_t"]
    pod = z_pi - d["hdr_h"] - d["pcb_t"] - d["qwiic_h"]
    lens = -(d["pad_t"] + d["mlx_tape"]) - 1.6 - d["lens_drop"]             # camera taped to the pad
    return np.minimum(pod, lens)


# =================================================================================================================
# 1. Dependencies and safety order (replay)
# =================================================================================================================
def replay():
    buy_ids = {l["id"] for l in BUY["lines"]}
    have = set(ASM["always_have"]) | set(ASM["before_build"])
    state = {"props_on": False, "battery_connected": False, "antenna_on": False, "payload_on": False,
             "hovered": False, "smoke_stopper_first": None, "vtx_powered": False}
    first_plug = None
    for a in ASM["actions"]:
        missing = []
        for n in a["needs"] + a["tools"]:
            if n.startswith("buy:"):
                if n[4:] not in buy_ids:
                    missing.append(n + " (not on the buy list)")
            elif n == "your laptop":
                continue
            elif n not in have:
                missing.append(n)
        add("DEP-" + a["id"], "dependencies", a["id"], f"{a['id']} {a['short']}: everything it needs is there",
            "FAIL" if missing else "PASS", ("missing: " + ", ".join(missing)) if missing else
            "needs " + (", ".join(x for x in a["needs"] if not x.startswith("buy:")) or "only bought parts"), unit="")
        have |= set(a["produces"])
        s = a["set"]
        if s.get("battery_connected") and first_plug is None:
            first_plug = (a["id"], bool(s.get("smoke_stopper_first")))
        if s.get("vtx_powered"):
            state["vtx_powered_at"] = a["id"]
            state["antenna_when_vtx"] = state["antenna_on"] or bool(s.get("antenna_on"))
        for k in ("props_on", "battery_connected", "antenna_on", "payload_on"):
            if k in s:
                state[k] = s[k]
        if s.get("props_on"):
            state["props_on_at"] = a["id"]
            state["battery_when_props"] = state["battery_connected"]      # after this action's own changes
        if "hovered" in a["produces"]:
            state["hovered"] = True
        if s.get("payload_on"):
            state["payload_after_hover"] = state["hovered"]
        state.setdefault("props_seen", []).append((a["id"], state["props_on"]))
    ids = [a["id"] for a in ASM["actions"]]
    before_fit = [i for i, p in state["props_seen"] if p and ids.index(i) < ids.index("S8.4")]
    add("SAFE-1", "dependencies", "S8.4", "Props stay off until 'Fit the props' (S8.4)", "PASS" if not before_fit else "FAIL",
        "props on at " + ", ".join(before_fit) if before_fit else "props first go on at S8.4", unit="")
    heat = dict(state["props_seen"]).get("S8.7")
    add("SAFE-2", "dependencies", "S8.7", "Props are off again for the heat test (S8.7)", "PASS" if heat is False else "FAIL",
        "S8.7 sets props off", unit="")
    add("SAFE-3", "dependencies", first_plug[0] if first_plug else "", "The first battery plug-in goes through the smoke stopper",
        "PASS" if first_plug and first_plug[1] else "FAIL", f"first plug-in at {first_plug[0] if first_plug else '-'}", unit="")
    add("SAFE-4", "dependencies", state.get("vtx_powered_at", ""), "The video antenna is on before the VTX is first powered",
        "PASS" if state.get("antenna_when_vtx") else "FAIL", f"antenna fitted at S4.4, VTX first powered at {state.get('vtx_powered_at')}", unit="")
    add("SAFE-5", "dependencies", state.get("props_on_at", ""), "Battery out while the props go on",
        "PASS" if state.get("props_on_at") and not state.get("battery_when_props") else "FAIL",
        "S8.4 has the battery disconnected; the page's step 8 safety line says 'Battery out whenever your hands are on props or motors'", unit="")
    add("SAFE-6", "dependencies", "S7.3", "Payload goes on only after the bare quad has hovered", "PASS" if state.get("payload_after_hover") else "FAIL",
        "S8.5 (first hover) comes before S7.3 in the real order (S7.1 says so)", unit="")


# =================================================================================================================
# 2. Fit, access, clearance, wiring, power, weight: measured checks. Each margin function works on a dict of arrays,
#    so the same code runs once (nominal) and 10,000 times (tolerances).
# =================================================================================================================
def ground_rear(d):
    return -(2 * d["leg_rear"] + d["foot_h"])


def ground_front(d):
    return d["bottom_t"] + d["arm_t"] - (2 * d["leg_front"] + d["foot_h"])


L515 = [l for l in SIM.layouts() if l["id"] == "L515"][0]
REAR_LEGS = [tuple(p) for p in POS["legs"]["rear"]]
FRONT_LEGS = [tuple(p) for p in POS["legs"]["front"]]
SIM.leg_positions = lambda: REAR_LEGS + FRONT_LEGS          # the chosen legs (as simulate_design.py --check does)
PROP_ANGLES = list(range(0, 120, 3))


def place_d(d, i):
    """the simulation's placement of the approved layout for build number i."""
    l = dict(L515, pi_xy=[float(d["pi_x"][i]), float(d["pi_y"][i])])
    s = float(d["standoff"][i] + d["pad_t"][i])
    pt = float(d["pcb_t"][i])
    px, py = l["pi_xy"]
    z_pi = -s - pt
    pod_bot = z_pi - float(d["hdr_h"][i]) - pt - float(d["qwiic_h"][i])
    mx = px + SIM.PI["w"] / 2 + V("LAYOUT")["mlx_gap"] + SIM.MLX["d"] / 2
    zb = -float(d["pad_t"][i]) - float(d["mlx_tape"][i])          # taped to the pad (approved S7.3)
    P = {"pod": ([px - SIM.PI["w"] / 2, py - SIM.PI["d"] / 2, pod_bot], [px + SIM.PI["w"] / 2, py + SIM.PI["d"] / 2, -s]),
         "mlx_board": ([mx - SIM.MLX["w"] / 2, py - SIM.MLX["d"] / 2, zb - 1.6], [mx + SIM.MLX["w"] / 2, py + SIM.MLX["d"] / 2, zb]),
         "lens": [mx, py, zb - 1.6 - float(d["lens_drop"][i])], "gps": [float(d["gps_x"][i]), 0.0],
         "pi_holes_on_plate": [], "mlx_holes": []}
    P["lowest"] = min(pod_bot, P["lens"][2])
    return l, P


def per_build(fn):
    """wrap a per-build simulation call so it runs over every sample."""
    def run(d):
        n = len(d["pi_x"])
        return np.array([fn(d, i) for i in range(n)], float)
    return run


def thermal_margin(d, i):
    l, P = place_d(d, i)
    leg = max(-float(ground_rear(d)[i]), -float(ground_front(d)[i]))
    return -SIM.thermal_blocked(l, P, leg, PROP_ANGLES)          # 0 = nothing blocked; negative = % blocked


# pad coverage and windows depend only on where the Pi sits: a table over the hand-placement band, then look it up
_PAD = {}


def pad_table():
    if _PAD:
        return _PAD
    band = TOL["hand_placement_mm"]
    xs = np.arange(-band, band + 1e-6, 0.5)
    for dx in xs:
        for dy in xs:
            l = dict(L515, pi_xy=[POS["pi_xy"][0] + dx, dy])
            P = SIM.place(l)
            lo, hi = P["pod"]
            cov = SIM.carbon_coverage(lo, hi)
            mcov = SIM.carbon_coverage(*P["mlx_board"])
            win = SIM.windows_near(lo, hi)
            _PAD[(round(dx * 2) / 2, round(dy * 2) / 2)] = (cov, mcov, win)
    return _PAD


def pad_lookup(d, k):
    t = pad_table()
    dx = np.clip(np.round((d["pi_x"] - POS["pi_xy"][0]) * 2) / 2, -3, 3)
    dy = np.clip(np.round(d["pi_y"] * 2) / 2, -3, 3)
    return np.array([t[(float(a), float(b))][k] for a, b in zip(np.atleast_1d(dx), np.atleast_1d(dy))])


def route_len(name, d):
    pts = np.array(ROUTES[name]["pts"], float)
    base = float(np.sum(np.linalg.norm(np.diff(pts, axis=0), axis=1)))
    # the route stretches with the frame and stack heights and with where the Pi and GPS sit
    dz = (z_fc_top(d) - POS["z"]["fc_top"]) + (d["bottom_t"] - 2.0) + (d["standoff"] + d["pad_t"] - V("LAYOUT")["standoff"] - V("PAD")["t"])
    dx = 0.0
    if "gps" in name:
        dx = np.abs(d["gps_x"] - V("LAYOUT")["gps_x"]) + np.abs(d["pi_x"] - POS["pi_xy"][0])
    else:
        dx = np.abs(d["pi_x"] - POS["pi_xy"][0]) * 0.0
    return base + np.abs(dz) + dx


# --- weights and centre of gravity
WITEMS = None


def weight_items():
    global WITEMS
    if WITEMS is None:
        P = SIM.place(L515)
        items = SIM.items_for_cg(L515, P, V("LAYOUT")["battery_x"])
        est = [("legs: 8 aluminium standoffs (ESTIMATED 1.0 g each)", 8.0, None, None, "ESTIMATED"),
               ("legs: 4 rubber feet (ESTIMATED 1.0 g each; the listing's weight line is a typo)", 4.0, None, None, "ESTIMATED"),
               ("Pi pad, 6 nylon standoffs, screws, zip ties (ESTIMATED 6 g)", 6.0, POS["pi_xy"][0], 0.0, "ESTIMATED"),
               ("Qwiic HAT + 2 cables (ESTIMATED 6 g; not weighed on the page)", 6.0, POS["pi_xy"][0], 0.0, "ESTIMATED"),
               ("micro-USB pigtail (ESTIMATED 5 g)", 5.0, -20.0, 0.0, "ESTIMATED"),
               ("wires, XT60, solder, capacitor (ESTIMATED 15 g)", 15.0, -10.0, 0.0, "ESTIMATED"),
               ("GPS cable extension: 4 x 120 mm 26 AWG, 8 joints, heat shrink (ESTIMATED 2 g)", 2.0, 0.0, 0.0, "ESTIMATED")]
        WITEMS = (items, est)
    return WITEMS


def cg_x(d):
    items, est = weight_items()
    n = len(d["pi_x"])
    w = d["_wscale"][:, :len(items) + len(est)]
    m = np.zeros(n); mx = np.zeros(n); my = np.zeros(n)
    # parts placed by hand move with their sampled position; everything else stays where the model puts it
    moves_with = {"Raspberry Pi Zero 2 W (board)": "pi", "Thermal camera board, MLX90640": "pi", "GPS board, PA1010D": "gps",
                  "Flight battery, GNB 1500 mAh 4S": "battery", "Battery strap, Rotor Village Kevlar": "battery"}
    dx = {"pi": d["pi_x"] - DIMS["pi_x"][0], "gps": d["gps_x"] - DIMS["gps_x"][0], "battery": d["battery_x"] - DIMS["battery_x"][0]}
    dy = {"pi": d["pi_y"], "gps": 0.0, "battery": 0.0}
    legs_x = float(np.mean([p[0] for p in REAR_LEGS + FRONT_LEGS]))
    rows = [(name, g, x, y, moves_with.get(name)) for name, g, x, y, _f in items]
    rows += [(name, g, legs_x if x is None else x, 0.0 if y is None else y,
              "pi" if x is not None and abs(x - POS["pi_xy"][0]) < 1e-6 else None) for name, g, x, y, _f in est]
    m = np.zeros(n); mx = np.zeros(n); my = np.zeros(n)
    for j, (name, g, x, y, mv) in enumerate(rows):
        gm = g * w[:, j]
        xs = x + (dx[mv] if mv else 0.0)
        ys = y + (dy[mv] if mv else 0.0)
        m += gm; mx += gm * xs; my += gm * ys
    return mx / m, my / m, m


def battery_needed(d):
    """battery centre x that puts the centre of gravity on the frame centre (cg is linear in the battery's x)."""
    d0 = dict(d); d0["battery_x"] = np.zeros_like(d["battery_x"])
    d1 = dict(d); d1["battery_x"] = np.full_like(d["battery_x"], 10.0)
    x0, _, _ = cg_x(d0)
    x1, _, _ = cg_x(d1)
    # cg_x puts the battery (and its strap) at d["battery_x"], so these are absolute positions 0 and 10 mm
    return 0.0 - x0 * 10.0 / (x1 - x0)


def tip_first_contact(d):
    """Crash review C1 (approved 2026-11-03): tip the drone over each edge of its four feet. A point at outward distance
    s and height h above that edge reaches the ground after atan2(h, s) degrees. Margin = the payload's first-contact
    angle minus the props' and arms' first-contact angle (positive = a prop or arm touches first). Geometry only: no
    centre of gravity, so it says what hits first, not when the drone falls."""
    zr, zf = ground_rear(d), ground_front(d)
    feet = [(REAR_LEGS[1], zr), (FRONT_LEGS[1], zf), (FRONT_LEGS[0], zf), (REAR_LEGS[0], zr)]   # right rear, right front, left front, left rear
    sp, ms = V("MOTOR_SPLIT"), V("MOTOR")
    z_arm = d["bottom_t"]                                            # arm underside (arms sit on the bottom plate)
    z_prop = d["bottom_t"] + d["arm_t"] + sp["base_h"] + sp["bell_h"]   # prop on the bell top (drawn split)
    ang = np.radians(np.arange(0, 360, 10))
    hard = []                                                        # (x, y, z) arrays: prop disc edge and arm/motor-base edge
    for mx, my in POS["motors"].values():
        for a in ang:
            hard.append((mx + V("PROP")["dia"] / 2 * np.cos(a), my + V("PROP")["dia"] / 2 * np.sin(a), z_prop))
            hard.append((mx + ms["dia"] / 2 * np.cos(a), my + ms["dia"] / 2 * np.sin(a), z_arm))
    z_pi = -(d["pad_t"] + d["standoff"]) - d["pcb_t"]
    pod = z_pi - d["hdr_h"] - d["pcb_t"] - d["qwiic_h"]
    lens = -(d["pad_t"] + d["mlx_tape"]) - 1.6 - d["lens_drop"]
    px, py = d["pi_x"], d["pi_y"]
    mxc = px + SIM.PI["w"] / 2 + V("LAYOUT")["mlx_gap"] + SIM.MLX["d"] / 2
    soft = [(px + sx * SIM.PI["w"] / 2, py + sy * SIM.PI["d"] / 2, pod) for sx in (-1, 1) for sy in (-1, 1)]
    soft += [(mxc + sx * SIM.MLX["w"] / 2, py + sy * SIM.MLX["d"] / 2, lens) for sx in (-1, 1) for sy in (-1, 1)]
    worst = None
    for k in range(4):
        (ax, ay), az = feet[k]
        (bx, by), bz = feet[(k + 1) % 4]
        ex, ey = bx - ax, by - ay
        L2 = ex * ex + ey * ey
        nx, ny = ey / np.sqrt(L2), -ex / np.sqrt(L2)                 # outward: the feet run counter-clockwise seen from above (+X forward, +Y left)
        def first(pts):
            best = None
            for x, y, z in pts:
                s = (x - ax) * nx + (y - ay) * ny
                t = ((x - ax) * ex + (y - ay) * ey) / L2
                h = z - (az + t * (bz - az))
                th = np.degrees(np.arctan2(h, s))
                best = th if best is None else np.minimum(best, th)
            return best
        m = first(soft) - first(hard)
        worst = m if worst is None else np.minimum(worst, m)
    return worst


def measured():
    W = 10.0  # routing slack my choice, added to every wire need
    R = POS["motor_radius"]

    def motor_lead(m):
        mx, my = POS["motors"][m]
        pads = POS["esc_motor_pads"][m]
        far = max(pads, key=lambda p: math.hypot(p[0] - mx, p[1] - my))

        def f(d):
            k = d["wheelbase"] / F["wheelbase"]
            ux, uy = mx * k, my * k
            r = np.hypot(ux, uy)
            ex, ey = ux - ux / r * d["motor_base_r"], uy - uy / r * d["motor_base_r"]     # lead leaves the base on the inner side
            plan = np.hypot(ex - far[0], ey - far[1])
            dz = (d["bottom_t"] + d["arm_t"] + d["mid_t"] + d["esc_gap"] + d["pcb_t"]) - (d["bottom_t"] + d["arm_t"])
            return d["motor_lead"] - (plan * 1.10 + np.abs(dz) + W)
        return f
    for m in ("M1", "M2", "M3", "M4"):
        add(f"WIRE-lead-{m}", "wiring", "S3.1", f"Motor {m}'s 120 mm leads, measured from the motor's edge, reach the ESC pad farthest from the motor, "
            "with the climb up to the ESC board, 10 % extra for bends and 10 mm to spare",
            "", mc=motor_lead(m), arrival=None)

    def q(name, lengthened=False):
        def f(d):
            have = d["qwiic_len"]
            if lengthened:
                have = have + d["ext_cut"] - V("GPS_EXT")["joints_per_wire"] * d["joint_loss"]
            return have - (route_len(name, d) + ROUTES[name]["slack"])
        return f
    add("WIRE-qwiic-mlx", "wiring", "S6.3", "Qwiic cable (150 mm) reaches from the HAT to the thermal camera", "", mc=q("qwiic_to_mlx"))
    unext = q("qwiic_to_gps_front")(NOM)[0]
    add("WIRE-qwiic-gps", "wiring", "S6.3", "GPS cable, lengthened by 12 cm per wire (Shad's choice), reaches from the HAT to the GPS on the top plate",
        "", mc=q("qwiic_to_gps_front", lengthened=True), arrival="GPS cable route")
    RESULTS[-1]["detail_extra"] = (ROUTES["qwiic_to_gps_front"]["why"] + " (routes.json). Without the extension the 150 mm cable "
                                   f"is {-unext:.0f} mm short.")

    # --- fit
    add("FIT-stack-holes", "fit", "S3.0", "ESC, FC and frame stack holes line up (30.5 mm, with the soft grommets)", "",
        mc=lambda d: 0.5 - np.maximum(np.abs(d["esc_holes"] - d["frame_stack"]), np.abs(d["fc_holes"] - d["frame_stack"])) / 2.0)
    add("FIT-top-plate", "fit", "S4.8", "Both standoff sets end at the same top-plate height (2+30 = 2+6+2+22), within 1 mm", "",
        mc=lambda d: 1.0 - np.abs(d["so30"] - (d["arm_t"] + d["mid_t"] + d["so22"])), arrival="Top plate sits flat")
    add("FIT-stack-nut", "fit", "S3.4", "M3 x 30 stack screw leaves room for its nut above the FC (screw heads under the bottom plate)", "",
        mc=lambda d: d["stack_screw"] - (z_fc_top(d) + d["nut_h"]), arrival="Stack")
    add("FIT-stack-tip", "clearance", "S4.8", "Stack screw tip stays below the top plate", "", mc=lambda d: z_top_under(d) - d["stack_screw"])
    add("FIT-motor-slot", "fit", "S2.3", "Motor screw holes (16 mm across) sit inside the arm slots (8.0-9.5 mm from the shaft, 3.0 mm wide)", "",
        mc=lambda d: np.minimum(d["motor_r"] - d["slot_r0"], d["slot_r1"] - d["motor_r"]) + (d["slot_w"] - d["m3_d"]) / 2.0,
        arrival="Motor screws line up with the arm slots")
    add("FIT-leg-setscrew", "fit", "S7.8", "M3 x 10 set screw: at least 3 mm of thread on each side of the plate", "",
        mc=lambda d: (d["setscrew"] - np.maximum(d["bottom_t"], d["mid_t"])) / 2.0 - 3.0)
    # zip ties (approved S7.4): two 100 mm ties joined, up through a centre-line slot, back down, round under the Pi
    zt = NET["zip_tie"]
    avail = zt["joined"] * (zt["single_mm"] - zt["head_mm"] - zt["grip_tail_mm"])
    slots = [w for w in SIM.WINDOWS if abs(float(w[:, 1].mean())) < 1.0 and float(w[:, 0].mean()) > -50]   # windows 3 and 1

    def ziptie(d):
        drop = d["pad_t"] + d["standoff"] + d["pcb_t"] + d["hdr_h"] + d["pcb_t"]      # plate underside to under the HAT
        worst = None
        for w in slots:
            half = float(w[:, 1].max() - w[:, 1].min()) / 2.0
            loop = (2 * half                     # across the plate's top, from one side of the slot to the other
                    + 2 * d["bottom_t"]          # through the plate, up and back down
                    + 2 * np.maximum(SIM.PI["d"] / 2.0 - half, 0)   # under the plate, out to the Pi's edges
                    + 2 * drop                   # down both sides of the Pi and its HAT
                    + SIM.PI["d"])               # across under the HAT
            m = avail - loop
            worst = m if worst is None else np.minimum(worst, m)
        return worst
    add("FIT-ziptie-length", "fit", "S7.4", "Two joined 100 mm zip ties reach round the Pi through each centre-line slot", "", mc=ziptie)
    one = zt["single_mm"] - zt["head_mm"] - zt["grip_tail_mm"]
    RESULTS[-1]["detail_extra"] = (f"Usable length: 2 x ({zt['single_mm']:.0f} - {zt['head_mm']:.0f} head - {zt['grip_tail_mm']:.0f} tail) = "
                                   f"{avail:.0f} mm (my estimates). One tie alone gives {one:.0f} mm and would not reach.")
    # camera fixing (approved S7.3): taped to the pad, lens down; the tape must hold most of the board's back
    add("FIT-camera-tape", "fit", "S7.3", "The thermal camera's tape square covers at least half of its board's back (no screws into foam)", "",
        mc=lambda d: np.full(len(d["pi_x"]), ((SIM.MLX["w"] - 4.0) * (SIM.MLX["d"] - 4.0)) / (SIM.MLX["w"] * SIM.MLX["d"]) * 100.0 - 50.0),
        unit="% points")
    RESULTS[-1]["detail_extra"] = "Tape square drawn 2 mm in from each edge of the 19 x 22 mm board (lib_quad); half is my minimum."
    add("FIT-pad-pi", "fit", "S7.3", "Pi pad sits on carbon over at least 60 % of its footprint", "",
        mc=lambda d: (pad_lookup(d, 0) - SIM.PAD_MIN) * 100.0, unit="% points")
    add("FIT-pad-mlx", "fit", "S7.3", "Thermal camera's pad sits on carbon over at least 60 % of its footprint", "",
        mc=lambda d: (pad_lookup(d, 1) - SIM.PAD_MIN) * 100.0, unit="% points")
    add("ACCESS-zipties", "access", "S7.4", "At least two bottom-plate windows beside the Pi for the zip ties", "",
        mc=lambda d: pad_lookup(d, 2) - 2.0, unit="windows")
    sx = POS["stack_screws"]
    pad = POS["pad"]
    covered = [p for p in sx if pad["x0"] <= p[0] <= pad["x1"] and abs(p[1]) <= pad["half_y"]]
    add("FIT-pad-screws", "fit", "S7.3", "Foam pad clears the stack screw heads or tips under the bottom plate", "NEEDS REAL PARTS",
        f"{len(covered)} of 4 stack screws ({', '.join('(%.1f, %.1f)' % tuple(p) for p in covered)}) sit inside the pad's footprint. "
        "Whether a head or tip sticks out below the plate depends on how the stack box's screws and the frame's press nuts go together.",
        arrival="Stack")
    add("FIT-motor-screw-len", "fit", "S2.4", "Motor screws grip the motor but stop short of the windings", "NEEDS REAL PARTS",
        "The motor's 'Screw Set' length is not published; arm 6 mm (TBS).", arrival="Motor screw length")
    add("FIT-foot-screw", "fit", "S7.8", "Foot screw (M3 x 10: the 6.3 mm foot leaves about 3.7 mm of thread) holds the rubber foot", "NEEDS REAL PARTS",
        "Foot body thickness at the screw is not published.", arrival="Landing-leg standoffs + set screws")
    add("FIT-leg-thread", "fit", "S7.8", "Leg standoffs are threaded inside at both ends", "NEEDS REAL PARTS",
        "Rotor Village gives height and material only.", arrival="Landing-leg standoffs + set screws")
    add("FIT-pi-standoff", "fit", "S7.3", "M2.5 standoffs go through the Pi's holes", "NEEDS REAL PARTS",
        "The Pi brief gives hole positions, not the hole size.", arrival="Pi standoffs fit the Pi")
    add("FIT-camera-back", "fit", "S7.3", "The thermal camera's board sits flat on its tape square", "NEEDS REAL PARTS",
        "Pimoroni lists the board size, not what is on its back.", arrival="Foam tape and boards")
    add("POWER-rx-usb", "power", "S4.6", "The receiver lights up on USB power alone (the channel check is done on USB)", "NEEDS REAL PARTS",
        "Whether the FC's USB power reaches the UART2 5 V pad is not stated in the GEPRC listing.", arrival="Receiver, video transmitter and smoke stopper")
    add("X-prop-marking", "cross-checks", "S8.4", "You can tell CW from CCW props and which face goes up", "NEEDS REAL PARTS",
        "Not found in the Gemfan listing; the page tags it 'Check on arrival'.", arrival="Software and props")
    add("FIT-payload-hold", "fit", "S7.3", "The Pi, pad and thermal camera sit where the simulation puts them", "NEEDS REAL PARTS",
        "Positions come from the design simulation; the page says to hold the real parts in place first.", arrival="Payload fit under the plate")
    add("TOOL-iron-cables", "power", "S3.2", "The XT60 to DC cable's ends, the iron's polarity drawing and its heat-up time are known", "NEEDS REAL PARTS",
        "No listing shows the cable's ends, the iron's polarity or a heat-up time.", arrival="Iron and its cables")
    add("WIRE-pigtail-pins", "wiring", "S1.3", "Pins 1 and 5 can be found inside the micro-USB plug; the cable's wire colours are known", "NEEDS REAL PARTS",
        "PiShop lists 24 AWG power and 28 AWG data wires, not their colours.", arrival="Micro-USB cable for the pigtail")
    add("FIT-stack-marks", "fit", "S3.3", "The ESC's + and - pad marks, any FC front mark, the camera connection and 5 V on the LED pads are confirmed", "NEEDS REAL PARTS",
        "The GEPRC diagram is a drawing; only '-' is readable beside the pads.", arrival="Stack")
    add("WIRE-rx-box-cable", "wiring", "S4.1", "The stack box's 4-wire cable fits the FC's G/5V/R2/T2 socket; its colours are known", "NEEDS REAL PARTS",
        "The box lists '2 x sh1.0 4pinsilicone cable'; colours and fit are not published.", arrival="Stack box 4-wire cable")
    add("FIT-frame-sma-screws", "fit", "S4.4", "The frame has a hole for the SMA nut; the top-plate screws and threadlock are named", "NEEDS REAL PARTS",
        "No Source One V6 build manual was found.", arrival="Frame")
    add("POWER-vtx-smoke-lights", "power", "S8.2", "The VTX's startup flashes (25 mW) and the smoke stopper's light are seen at the first power-up", "NEEDS REAL PARTS",
        "Read from the TBS manual's table and the iFlight listing; not seen on the real parts.", arrival="Receiver, video transmitter and smoke stopper")
    add("POWER-pack-hv-storage", "power", "S5.3", "The packs' labels say HV; the charger's storage mode can lower a full pack", "NEEDS REAL PARTS",
        "Shop names say HV; only a shop's Q&A says the charger discharges to storage.", arrival="Packs and charger")
    add("FIT-tape-backs", "fit", "S7.3", "The foam tape's thickness, the GPS board's back and the real zip-tie loop are checked", "NEEDS REAL PARTS",
        "Thickness and loop length are not published; the design uses estimates.", arrival="Foam tape and boards")
    add("TOOL-motor-sliders-prop-tool", "cross-checks", "S8.3", "Betaflight's Motors tab sliders and the kit's prop tool on the prop nut are checked", "NEEDS REAL PARTS",
        "Betaflight's docs name the Master slider; the prop tool's fit is not listed.", arrival="Software and props")
    add("TOOL-heat-source", "access", "S6.2b", "Something on the list can shrink the heat shrink (the iron's side)", "NEEDS REAL PARTS",
        "The kit has a 65 W iron but no heat gun; a lighter is not on the list. Whether the iron's side shrinks the 3 mm tube "
        "cleanly is not stated anywhere.", arrival="Heat source for the heat shrink")
    add("TOOL-meter-beep", "access", "S6.2b", "The kit's multimeter has a beep (continuity) setting for the cable check", "NEEDS REAL PARTS",
        "The tool kit listing names a multimeter, not its settings; the page tags this 'Check on arrival'.", arrival="Multimeter basics")
    add("FIT-cam-tilt", "fit", "S4.3b", "Camera mount lets the camera tilt to about 10 degrees", "NEEDS REAL PARTS",
        "The TPU mount's adjustment is not described on the listing.", arrival="Camera tilt adjust")

    # --- tool access
    add("ACCESS-iron-fc5v", "access", "S7.4b", "Iron tip (5.5 mm) fits between the FC and the fitted top plate to solder the pigtail", "",
        mc=lambda d: z_top_under(d) - (z_fc_top(d) + d["iron_tip"]), arrival="Iron reaches the flight controller pad with the top plate on")
    add("ACCESS-usbc", "access", "S8.3", "USB-C plug fits between the FC and the top plate (Motors tab, top plate on)", "",
        mc=lambda d: z_top_under(d) - (z_fc_top(d) + 1.6 + d["usb_plug"] / 2.0), arrival="USB-C plug with the top plate on")
    for aid, what in (("S3.2", "ESC motor pads"), ("S3.3", "ESC battery pads"), ("S4.1", "FC UART2 pads"), ("S4.3", "FC camera/VTX pads")):
        add(f"ACCESS-open-{aid}", "access", aid, f"Iron reaches the {what}: nothing is fitted above them yet", "PASS",
            "replay order: " + ("the FC goes on at S3.4" if aid in ("S3.2", "S3.3") else "the top plate goes on at S4.8"), unit="")
    front_room = min(SIM.dist_to_edge(p, a) for p in FRONT_LEGS for a in SIM.ARMS)
    add("ACCESS-front-legs", "access", "S7.8", "Fingers can turn the front legs: open space round the middle-plate holes", "",
        mc=lambda d: np.full(len(d["pi_x"]), front_room) - 2.5 - 8.0 - 0.2 * 0)
    RESULTS[-1]["detail"] = f"nearest arm edge {front_room:.1f} mm from a front leg hole; needs leg radius 2.5 + 8 mm finger room (my choice)"
    add("ACCESS-motor-screws", "access", "S2.3", "Hex driver reaches the motor screws from under the arms", "PASS",
        "the motor ends of the arms stick out past the plates (TBS drawing)", unit="")

    # --- clearance
    def prop_r(d):
        return d["prop_d"] / 2.0
    mr = lambda d: d["wheelbase"] / 2.0 / math.sqrt(2.0)  # noqa: E731
    add("CLEAR-prop-prop", "clearance", "S8.4", "Neighbouring props do not touch", "",
        mc=lambda d: d["wheelbase"] / math.sqrt(2.0) - d["prop_d"])

    def to_box(d, cx, hx, hy):
        mx = mr(d)
        dx = np.maximum(np.abs(mx - cx) - hx, 0)
        dy = np.maximum(mx - hy, 0)
        return np.hypot(dx, dy) - prop_r(d)
    add("CLEAR-prop-battery", "clearance", "S7.7", "Prop circles clear the battery", "",
        mc=lambda d: to_box(d, d["battery_x"], d["pack_l"] / 2.0, d["pack_w"] / 2.0))
    add("CLEAR-prop-gps", "clearance", "S7.3", "Prop circles clear the GPS board", "",
        mc=lambda d: to_box(d, d["gps_x"], d["gps_w"] / 2.0, d["gps_d"] / 2.0))
    add("CLEAR-battery-gps", "clearance", "S7.7", "Battery at S7.7's forward limit (2 mm ahead, +-3 mm by hand) leaves a gap to the GPS", "",
        mc=lambda d: (d["gps_x"] - d["gps_w"] / 2.0) - (V("LAYOUT")["battery_ok_to"] + (d["battery_x"] - DIMS["battery_x"][0]) + d["pack_l"] / 2.0),
        arrival="Battery and GPS do not touch")
    # Design-level overlap (Fable M5c): graded on the drawn sizes only, so an estimated size or a hand tolerance cannot hide it.
    bat_front = max(float(NOM["battery_x"][0]), float(V("LAYOUT")["battery_ok_to"]), float(POS["battery_x"])) + float(NOM["pack_l"][0]) / 2.0
    gps_rear = float(NOM["gps_x"][0]) - float(NOM["gps_w"][0]) / 2.0
    add("CLEAR-battery-gps-design", "clearance", "S7.7", "As designed, the battery (at its drawn place and at its forward limit) does not overlap the GPS",
        "PASS" if gps_rear - bat_front >= -1e-9 else "FAIL",
        f"battery front edge {bat_front:.1f} mm (furthest forward of parts.json battery_x, battery_ok_to and positions.json battery_x, "
        f"plus half the {float(NOM['pack_l'][0]):g} mm pack); GPS rear edge {gps_rear:.1f} mm", margin=gps_rear - bat_front)
    add("CLEAR-wire-prop", "clearance", "S7.4b", "Pigtail route stays out of the prop circles", "",
        mc=per_build(lambda d, i: SIM.prop_wire_clearance(*place_d(d, i))))
    add("CLEAR-thermal-view", "clearance", "S7.3", "Thermal camera sees past the Pi, legs, plates and props at every prop angle", "",
        mc=per_build(thermal_margin), unit="% blocked (0 = clear)")
    add("CLEAR-ground", "clearance", "S7.8", "Legs, not the payload, touch the ground (10 mm to spare)", "",
        mc=lambda d: np.minimum(-ground_rear(d), -ground_front(d)) - (-lowest_payload(d)) - 10.0)
    add("CRASH-tip-first-contact", "clearance", "S7.8", "When the drone tips over any side, a prop or arm touches the ground before the Pi or thermal camera", "",
        mc=tip_first_contact, unit="degrees")
    RESULTS[-1]["detail_extra"] = ("Crash review C1. Geometry only: says what touches first, not how far the drone can lean before it falls "
                                   "(that needs the centre of gravity, an estimate). Upside down, the video antenna touches first (about "
                                   "84 mm up vs the battery's 60 mm, planned position): see the after-a-hard-landing checklist.")
    add("CLEAR-level", "clearance", "S7.8", "Front and rear feet within 3 mm of level", "",
        mc=lambda d: 3.0 - np.abs(ground_rear(d) - ground_front(d)), arrival="Drone stands level on its legs")
    add("CLEAR-legs-pad", "clearance", "S7.8", "Rear legs clear the Pi pad by at least 2 mm", "",
        mc=lambda d: ((d["pi_x"] - SIM.PI["w"] / 2 - V("PAD")["margin"]) - (max(p[0] for p in REAR_LEGS) + V("LEGS")["od"] / 2)) - 2.0)
    add("CLEAR-xt60", "clearance", "S8.2", "Quad's XT60 lead reaches the pack's 85 mm lead", "NEEDS REAL PARTS",
        "The stack box's XT60 lead length is not published. Pack lead 85 mm (R12).", arrival="Quad battery lead reaches the pack")
    add("CLEAR-cam-cable", "wiring", "S4.3", "Camera cable reaches the FC's CAM socket", "NEEDS REAL PARTS",
        "The stack box's camera cable length is not published.", arrival="Camera cable length")

    # --- weight and balance. S7.7: slide the battery until it balances, between 10 mm behind and 2 mm ahead.
    lo_b, hi_b = V("LAYOUT")["battery_ok_from"], V("LAYOUT")["battery_ok_to"]
    def cg_at(d, b):
        d2 = dict(d); d2["battery_x"] = np.full_like(d["battery_x"], b)
        return cg_x(d2)[0]
    gap_min = 2.0

    def forward_stop(d):
        """change request 43: battery slid forward until about 2 mm from the GPS; by hand it may stop up to 3 mm short."""
        return (d["gps_x"] - d["gps_w"] / 2.0) - gap_min - d["pack_l"] / 2.0 - np.abs(d["battery_x"] - DIMS["battery_x"][0])
    add("WEIGHT-forward-stop", "weight", "S7.7", "Battery slid forward to about 2 mm from the GPS (change request 43) leaves the balance point within 5 mm of centre",
        "", mc=lambda d: SIM.BAL_TOL - np.abs(cg_x(dict(d, battery_x=forward_stop(d)))[0]))
    RESULTS[-1]["detail_extra"] = ("Includes about 46 g of parts the page does not weigh yet (legs, HAT, pad, pigtail, wires, GPS cable "
                                   "extension: my estimates). The exact balance point is about %.0f mm ahead of centre, past the GPS, so the "
                                   "drone stays a little tail-heavy." % float(battery_needed(NOM)[0]))

    def feet(d):
        x, y, m = cg_x(d)
        xs = [p[0] for p in REAR_LEGS + FRONT_LEGS]
        side = min(abs(p[1]) for p in REAR_LEGS + FRONT_LEGS)
        return np.minimum(np.minimum(x - min(xs), max(xs) - x), side - np.abs(y))
    add("WEIGHT-feet", "weight", "S7.8", "Centre of gravity sits inside the four feet", "", mc=feet)


def static_checks():
    # --- wiring netlist
    nets = NET["nets"]
    ends = {}
    for n in nets:
        for e in n["ends"]:
            ends.setdefault(e, []).append(n["net"])
    shared = {e: v for e, v in ends.items() if len(v) > 1}
    add("NET-shorts", "wiring", "S3.3", "No pad or pin belongs to two different nets", "PASS" if not shared else "FAIL",
        f"{len(ends)} ends in {len(nets)} nets" + ("" if not shared else "; shared: " + str(shared)), unit="")
    loose = [n["net"] for n in nets if len(n["ends"]) < 2]
    add("NET-open", "wiring", "S4.1", "Every net has both ends connected", "PASS" if not loose else "FAIL", ", ".join(loose), unit="")
    bad = [n["net"] for n in nets if "uart" in n and n["uart"] != ["T", "R"]]
    txrx = [n for n in nets if "uart" in n]
    ok_dir = all(re.search(r"\bT\d?$|T$|T2$|T1$", n["ends"][0].split()[-1]) and re.search(r"R\d?$|R2$|\(SmartAudio\)|RX", n["ends"][1])
                 for n in txrx)
    add("NET-txrx", "wiring", "S4.1", "Every TX goes to an RX (receiver T->R2, FC T2->receiver R, FC T1->VTX)",
        "PASS" if (not bad and ok_dir) else "FAIL", "; ".join(f"{n['ends'][0]} -> {n['ends'][1]}" for n in txrx), unit="")
    order = NET["pimoroni_pin_order"]
    i2c = [n for n in nets if "pins" in n]
    pos = [[order.index(p) + 1 for p in n["pins"]] for n in i2c]
    add("NET-i2c", "wiring", "S6.3", "Qwiic cable ends land on header pins 1, 2, 3, 5 (3V3, SDA, SCL, GND); INT (pin 4) empty",
        "PASS" if all(p == [1, 2, 3, 5] for p in pos) else "FAIL",
        f"Pimoroni order {', '.join(order)}; colours " + ", ".join(f"{k} {v}" for k, v in NET["cable_colours"].items()), unit="")
    add("NET-esc-fc", "wiring", "S3.4", "ESC and FC joined by the stack box's 8-wire cable (TLM, CUR, M4, M3, M2, M1, BAT, GND)", "PASS",
        "STEP-TRUTH S3.4 [R1][R2]", unit="")
    add("NET-pigtail", "wiring", "S7.4b", "Pigtail (1.42 m cable before cutting) is long enough", "PASS",
        "needs about 150 mm from the FC to the Pi (route in positions.json); cable 1420 mm", margin=1420 - 150)
    uses = NET["silicone_uses"]
    need_wire = sum(n * (mm_ + NET["silicone_waste_mm"]) for _w, n, mm_ in uses)
    wire_lines = [l for l in BUY["lines"] if l["id"] == "silicone-wire"]
    have_wire = sum(l["qty"] for l in wire_lines) * 304.8          # the list sells it in "1 foot lengths"
    add("NET-silicone", "wiring", "S6.3", "Silicone wire on the buy list covers every cut wire (receiver, VTX, GPS extension)",
        "PASS" if have_wire >= need_wire else "PAGE FIX",
        "; ".join(f"{w}: {n} x {mm_:.0f} mm" for w, n, mm_ in uses) + f"; plus {NET['silicone_waste_mm']:.0f} mm waste per piece. "
        f"Needs about {need_wire:.0f} mm; the list has {have_wire:.0f} mm ({sum(l['qty'] for l in wire_lines)} feet)."
        + ("" if have_wire >= need_wire else " Buy list: add 2 more feet of the same Rotor Village wire (CA$1.39 a foot)."),
        margin=have_wire - need_wire)
    shrink = [l for l in BUY["lines"] if l["id"].startswith("heat-shrink")]
    small = [l for l in shrink if (lambda m: m and float(m.group(1)) <= 4.0)(re.search(r"(\d+(?:\.\d+)?) ?mm x", l["item"]))]
    add("NET-heatshrink", "wiring", "S6.3", "Heat shrink on the list grips a 26 AWG joint (4 mm or less before shrinking, 2:1)",
        "PASS" if small else "PAGE FIX", "list has: " + "; ".join(l["item"] for l in shrink) + (
            "" if small else ". Buy list: add 'Heat Shrink - 3mm x 150mm - Clear', Rotor Village, CA$0.79, '96 in stock', "
            "'Shrink rate: 2:1' (rotorvillage.ca/heat-shrink-3mm-x-150mm-clear/, opened 2026-11-03), 2 pieces."), unit="")

    # --- connectors
    for c in NET["connectors"]:
        st = "PASS" if c["mates"] is True else ("NEEDS REAL PARTS" if c["mates"] is None else "FAIL")
        arr = {"pack -> charger": "Packs and charger", "legs -> frame standoffs": "Landing-leg standoffs + set screws",
               "iron -> adapter": "Iron adapter"}.get(c["pair"])
        if c["pair"] == "iron -> adapter":
            add("CONN-iron-adapter", "cross-checks", "S3.2", "Iron and 24 V adapter: 5.5 x 2.5 mm plug matches", "PASS", c["a"] + " / " + c["b"], unit="")
            add("CONN-iron-polarity", "power", "S3.2", "Adapter plug is centre-positive", "NEEDS REAL PARTS", c["check"], arrival=arr, unit="")
            continue
        add("CONN-" + re.sub(r"[^a-z0-9]+", "-", c["pair"].lower()).strip("-"), "cross-checks", "", f"Connector: {c['pair']} mates",
            st, f"{c['a']}  /  {c['b']}", arrival=arr if st != "PASS" else None, unit="")

    # --- power
    pv = PWR["pack_v"]
    rails = {"pack": (pv["min"], pv["max"]), "9V rail": (9.0, 9.0), "5V rail": (5.0, 5.0), "3V3 (HAT)": (3.3, 3.3)}
    for r in PWR["rated"]:
        lo, hi = rails[r["on"]]
        ok = r["min"] <= lo and hi <= r["max"]
        st = "PASS" if ok else "FAIL"
        if "NOT sourced" in r["src"]:
            st = "NEEDS REAL PARTS" if ok else "FAIL"
        add("POWER-" + re.sub(r"[^a-z0-9]+", "-", r["part"].lower()).strip("-"), "power", "S8.2",
            f"{r['part']} rated {r['min']:.1f}-{r['max']:.1f} V; it gets {lo:.1f}-{hi:.1f} V ({r['on']})", st, r["src"],
            margin=min(lo - r["min"], r["max"] - hi), unit="V",
            arrival="5 V rail carries the Pi, camera and receiver" if st == "NEEDS REAL PARTS" else None)
    nine = sum(l["amps"] for l in PWR["loads"] if l["rail"] == "9V" and l["amps"])
    nine_cap = PWR["rails"]["9V"]["amps"]
    add("POWER-9v-load", "power", "S4.7", f"9 V rail load (VTX at 25 mW) within its {nine_cap:g} A",
        "PASS" if nine <= nine_cap else "FAIL",
        "; ".join(f"{l['part']}: {l['amps']:g} A ({l['src']})" for l in PWR["loads"] if l["rail"] == "9V") + f"; rail {nine_cap:g} A ({PWR['rails']['9V']['src']})",
        margin=nine_cap - nine, unit="A")
    unsourced = [l["part"] for l in PWR["loads"] if l["rail"].startswith("5V") and l["amps"] is None]
    add("POWER-5v-load", "power", "S8.6", "5 V rail (3 A) carries the Pi, receiver, camera and sensors", "NEEDS REAL PARTS",
        "no published current for: " + ", ".join(unsourced), arrival="5 V rail carries the Pi, camera and receiver", unit="")
    ir = PWR["iron"]
    amps = ir["watts"] / ir["adapter_v"]
    add("POWER-iron", "power", "S3.2", f"Iron ({ir['watts']:g} W) on the {ir['adapter_v']:g} V {ir['adapter_a']:g} A adapter",
        "PASS" if amps <= ir["adapter_a"] else "FAIL",
        f"{ir['watts']:g} W / {ir['adapter_v']:g} V = {amps:.2f} A of {ir['adapter_a']:g} A ({ir['src_adapter']})",
        margin=ir["adapter_a"] - amps, unit="A")
    add("POWER-charge", "power", "S5.3b", "Charge current 1.0 A is within 1C for the 1500 mAh packs", "PASS",
        "1C = 1.5 A (R12 1500 mAh); charger manual '1C to 2C' (R11)", margin=1.5 - 1.0, unit="A")

    # --- weight total (report)
    items, est = weight_items()
    listed = sum(i[1] for i in items)
    estd = sum(e[1] for e in est)
    add("WEIGHT-total", "weight", "S8.6", f"All-up weight: {listed:.0f} g from the page's sourced weights + {estd:.0f} g estimated "
        f"= about {listed + estd:.0f} g", "PASS", "estimates: " + "; ".join(e[0] for e in est), margin=None, unit="g")


# =================================================================================================================
# 3. Cross-checks (buy list, ids, models, motor order)
# =================================================================================================================
def glb_actions():
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "docs", "models", "*.glb"))):
        with open(f, "rb") as fh:
            data = fh.read()
        n = struct.unpack_from("<I", data, 12)[0]
        j = json.loads(data[20:20 + n].decode("utf-8"))
        sc = j.get("scenes", [{}])[j.get("scene", 0)]
        for a in (sc.get("extras") or {}).get("actions", []) or []:
            out[a["id"]] = (os.path.basename(f), a)
    return out


def page_ids():
    if not os.path.exists(PAGE):
        return None
    from page_text import action_lines        # follows nested lists inside a step line
    return action_lines(open(PAGE, encoding="utf-8").read())


def cross_checks():
    truth = open(os.path.join(OUTD, "STEP-TRUTH.md"), encoding="utf-8").read()
    truth_ids = set(re.findall(r"^\| (S\d\.[\w]+) \|", truth, re.M))
    G = glb_actions()
    P = page_ids()
    asm_ids = [a["id"] for a in ASM["actions"]]
    no_truth = [i for i in asm_ids if i not in truth_ids]
    add("X-ids-truth", "cross-checks", "", "Every replayed action id is in STEP-TRUTH.md", "PASS" if not no_truth else "FAIL",
        ", ".join(no_truth) or f"{len(asm_ids)} ids", unit="")
    no_model = [i for i in asm_ids if i not in G]
    add("X-ids-model", "cross-checks", "", "Every replayed action has a button in the 3D models", "PASS" if not no_model else "FAIL",
        ", ".join(no_model) or f"{len(G)} model actions", unit="")
    extra_model = [i for i in G if i not in truth_ids]
    add("X-model-truth", "cross-checks", "", "Every 3D action id is in STEP-TRUTH.md", "PASS" if not extra_model else "FAIL",
        ", ".join(extra_model) or "all found", unit="")
    if P is None:
        add("X-page", "cross-checks", "", "Page action ids (Builder's page)", "NEEDS REAL PARTS", "page file not found: " + PAGE, unit="")
    else:
        untagged = [i for i in G if i not in P]
        add("X-page-tags", "cross-checks", "", "Every 3D action id is tagged on the page", "PASS" if not untagged else "PAGE FIX",
            ("not tagged yet: " + ", ".join(untagged)) if untagged else f"{len(P)} page ids", unit="")
        pend = ASM.get("approved_wording_pending", {})
        lag = []
        for i, w in pend.items():
            if i in P and not re.sub(r"\W+", " ", P[i]).strip().startswith(re.sub(r"\W+", " ", w["new"]).strip()):
                lag.append(f"{i} (change request {w['cr']})")
            P[i] = w["new"]
        add("X-page-approved", "cross-checks", "", "Approved wording changes are on the page", "PASS" if not lag else "PAGE FIX",
            ("page still has the old text: " + ", ".join(lag)) if lag else "all applied", unit="")
        for w in ASM.get("decided_wording_pending", []):
            add(f"X-page-cr{w['cr']}-{w['where']}", "cross-checks", w["where"], f"Page words follow Shad's decision: {w['what']}", "PAGE FIX",
                f"change request {w['cr']} ({w['status']})", unit="")
        num = re.compile(r"\d+(?:\.\d+)?")
        bad = []
        for i, (_f, a) in G.items():
            if i in P:
                extra = [x for x in num.findall(a["text"]) if x not in num.findall(P[i])]
                if extra:
                    bad.append(f"{i}: {', '.join(extra)}")
        add("X-chip-numbers", "cross-checks", "", "Every number in a 3D chip also appears in its page line", "PASS" if not bad else "FAIL",
            "; ".join(bad) or "no chip adds a number", unit="")
        dirs = re.compile(r"\b(CW|CCW|front|rear|left|right|up|down|UP|DOWN)\b")
        badd = []
        for i, (_f, a) in G.items():
            if i in P:
                pd = set(w.lower() for w in dirs.findall(P[i]))
                extra = [w for w in dirs.findall(a["text"]) if w.lower() not in pd]
                if extra:
                    badd.append(f"{i}: {', '.join(extra)}")
        add("X-chip-directions", "cross-checks", "", "Every direction word in a 3D chip (CW, front, up...) is in its page line",
            "PASS" if not badd else "FAIL", "; ".join(badd) or "none added", unit="")
    # motor order
    bf = {"M1": ("rear right", "CW"), "M2": ("front right", "CCW"), "M3": ("rear left", "CCW"), "M4": ("front left", "CW")}
    import parts as PP
    lay = {m: (v["pos"], v["spin"]) for m, v in PP.MOTOR_LAYOUT.items()}
    add("X-motor-order", "cross-checks", "S2.3", "M1-M4 positions and spins match Betaflight's props-in diagram (R28)",
        "PASS" if lay == bf else "FAIL", "; ".join(f"{m} {p} {s}" for m, (p, s) in lay.items()), unit="")
    xy_ok = all((POS["motors"][m][0] > 0) == ("front" in bf[m][0]) and (POS["motors"][m][1] > 0) == ("left" in bf[m][0]) for m in bf)
    add("X-motor-xy", "cross-checks", "S2.3", "Motor positions in the model axes (+X front, +Y left) match their names", "PASS" if xy_ok else "FAIL",
        json.dumps(POS["motors"]), unit="")
    labels = {k: v[0] for k, v in PP.PART_INFO.items() if k.startswith("prop_M")}
    lab_ok = all(("(CW)" in labels[f"prop_{m}"]) == (bf[m][1] == "CW") for m in bf)
    add("X-prop-labels", "cross-checks", "S8.4", "Tap-to-name prop labels say CW on M1/M4 and CCW on M2/M3", "PASS" if lab_ok else "FAIL",
        "; ".join(labels.values()), unit="")
    pads_ok = all((POS["esc_motor_pads"][m][0][0] > 0) == ("front" in bf[m][0]) and (POS["esc_motor_pads"][m][0][1] > 0) == ("left" in bf[m][0]) for m in bf)
    add("X-esc-pads", "cross-checks", "S3.2", "Each motor's ESC pads are on its own corner (GEPRC manual R1)", "PASS" if pads_ok else "FAIL", "", unit="")

    # Fable M5b: which motor gets which prop, read sentence by sentence as whole words (so "CW" never matches inside "CCW")
    def prop_claims(text):
        spin, where = {}, {}
        for s in re.split(r"(?<=[.;])\s+", text):
            turn = set(re.findall(r"\b(CCW|CW)\b", s))
            motors = re.findall(r"\b(M[1-4])\b", s)
            if len(turn) == 1 and motors and " is " not in s:
                for mm in motors:
                    spin.setdefault(mm, set()).add(next(iter(turn)))
            for mm, fr, lr in re.findall(r"\b(M[1-4]) is (front|rear) (left|right)\b", s):
                where.setdefault(mm, set()).add(f"{fr} {lr}")
        return spin, where
    design = {m: (v["pos"], v["spin"]) for m, v in PP.MOTOR_LAYOUT.items()}
    geo_layout = {m: (v["pos"], v["spin"]) for m, v in load("parts.json").get("motor_layout", {}).items()}
    probs = []
    if geo_layout != design:
        probs.append("parts.json motor_layout differs from parts.py: " + json.dumps(geo_layout))
    texts = []
    if P is not None and "S8.4" in P:
        texts.append(("page S8.4", P["S8.4"]))
    if "S8.4" in G:
        texts.append(("3D chip S8.4", G["S8.4"][1]["text"]))
    for label, text in texts:
        spin, where = prop_claims(text)
        for m, (pos, sp) in design.items():
            if spin.get(m) != {sp}:
                probs.append(f"{label}: {m} gets {'/'.join(sorted(spin.get(m, []))) or 'no prop direction'}, design says {sp}")
            if where.get(m, {pos}) != {pos}:
                probs.append(f"{label}: {m} is {'/'.join(sorted(where[m]))}, design says {pos}")
    if P is None:
        st = "NEEDS REAL PARTS"
    else:
        st = "PASS" if not probs and len(texts) == 2 else "FAIL"
        if len(texts) < 2:
            probs.append("S8.4 missing from " + ("the 3D chips" if "S8.4" not in G else "the page"))
    add("X-prop-directions", "cross-checks", "S8.4", "The page and the 3D chip put CW props on the motors the design spins CW (and CCW on the rest), "
        "and name each motor's corner as the design does", st,
        "; ".join(probs) or "; ".join(f"{m} {p} {s}" for m, (p, s) in design.items()), unit="")

    # buy list: every line used, every used line on the list, quantities enough
    buy = {}
    for l in BUY["lines"]:
        buy.setdefault(l["id"], []).append(l)
    used = {}
    for a in ASM["actions"]:
        for n in a["needs"] + a["tools"] + list(a["uses"]):
            if n.startswith("buy:"):
                used.setdefault(n[4:], []).append(a["id"])
    elsewhere = ASM["buy_used_elsewhere"]
    optional = set(BUY.get("optionalStages", []))
    unused_required = []
    for bid, lines in buy.items():
        where = used.get(bid)
        if where:
            st, why = "PASS", "used in " + ", ".join(sorted(set(where)))
            if bid in elsewhere:
                why += "; also " + elsewhere[bid]
        elif bid in elsewhere:
            st, why = "PASS", elsewhere[bid]
        elif all(l["stage"] in optional for l in lines):
            st, why = "PASS", f"not used by a step; exempt: stage {lines[0]['stage']} is optional ({BUY['stageNames'].get(str(lines[0]['stage']), '')})"
        else:
            st, why = "PAGE FIX", "no build step or stage checklist line uses it"
            unused_required.append(f"{bid} (stage {lines[0]['stage']})")
        add("BUY-used-" + bid, "cross-checks", "", f"Buy list '{lines[0]['item'][:60]}' is used by a step", st, why, unit="")
        if st == "PAGE FIX":
            RESULTS[-1]["page_text"] = f"'{lines[0]['item']}' is on the buy list, but no build step or stage checklist uses it."
    # Fable M5d: an unused line in a REQUIRED stage means money spent on nothing (or a step that lost its part): fail it
    add("BUY-required-all-used", "cross-checks", "", "Every buy line in a required stage is used by a step or a stage checklist "
        f"(optional stages {', '.join(str(s) for s in sorted(optional))} exempt)", "FAIL" if unused_required else "PASS",
        ("unused: " + ", ".join(unused_required)) if unused_required else f"{len(buy)} lines checked, from {BUY_SRC}", unit="")
    for bid in used:
        if bid not in buy:
            add("BUY-listed-" + bid, "cross-checks", ",".join(used[bid]), f"'{bid}' needed by a step is on the buy list", "FAIL", "", unit="")
    need = {}
    for a in ASM["actions"]:
        for k, q in a["uses"].items():
            need[k[4:]] = need.get(k[4:], 0) + q
    pieces = ASM["pieces_per_line"]
    for bid, q in sorted(need.items()):
        have = sum(l["qty"] for l in buy.get(bid, [])) * pieces.get(bid, 1)
        add("BUY-qty-" + bid, "cross-checks", "", f"Enough {bid}: steps use {q}, the list gives {have}", "PASS" if have >= q else "FAIL",
            ASM["pieces_src"].get(bid, ""), margin=have - q, unit="pieces")


# =================================================================================================================
# 4. Run: nominal, then the tolerance runs, then the report
# =================================================================================================================
def run_mc():
    D = sample(RUNS, SEED)
    keys = [k for k in DIMS]
    for r in RESULTS:
        f = r.pop("_mc")
        if f is None:
            continue
        nom = float(np.atleast_1d(f(NOM))[0])
        r["margin"] = round(nom, 2)
        vals = np.atleast_1d(f(D)).astype(float)
        if vals.size == 1:
            vals = np.full(RUNS, vals[0])
        ok = vals >= -1e-9
        r["runs"] = int(vals.size)
        r["pass_rate"] = round(100.0 * ok.mean(), 2)
        r["worst"] = round(float(vals.min()), 2)
        # sensitivity: the input whose spread lines up best with the margin's spread
        best = []
        for k in keys:
            x = D[k]
            if np.std(x) < 1e-12 or np.std(vals) < 1e-12:
                continue
            c = float(np.corrcoef(x, vals)[0, 1])
            if not math.isnan(c):
                best.append((abs(c), k, c))
        best.sort(reverse=True)
        r["driver"] = ", ".join(f"{k} (r={c:+.2f})" for _, k, c in best[:2])
        fail_rate = 100.0 - r["pass_rate"]
        if nom < -1e-9 and r.get("page_fix_if_fail"):
            r["status"] = "PAGE FIX"
            r["detail"] = (r.get("detail") or "") + " Fails as the page reads now; " + r["page_fix_if_fail"] + "."
        elif nom < -1e-9:
            r["status"] = "FAIL"
        elif fail_rate > 0.1:
            r["status"] = "NEEDS REAL PARTS" if r["arrival"] else "FAIL"
            r["detail"] = (r.get("detail") or "") + f" Passes in {r['pass_rate']}% of {RUNS:,} tolerance runs (more than 0.1% fail)."
        else:
            r["status"] = "PASS"
    for r in RESULTS:
        r.pop("_mc", None)


PLAIN = [
    (r"\s*\((?:approved )?change requests? [^)]*\)", ""),          # "(change request 43)" -> gone
    (r"[Cc]hange requests? \d+[a-z]?(?: ?(?:\+|and|,) ?\d+[a-z]?)*:? ?", ""),
    (r"\bESCs?\b", "speed controller"), (r"\bFC\b", "flight controller"), (r"\bVTX\b", "video transmitter"),
    (r"\(S(\d)\.\w+\)", "(step \\1)"), (r"\bS(\d)\.\w+'s\b", "step \\1's"), (r"\bS(\d)\.\w+\b", "step \\1"),
    (r"  +", " "),
]


def plain(s):
    """reader-facing wording: no part abbreviations, no change-request numbers, no action ids."""
    if not isinstance(s, str):
        return s
    for pat, rep in PLAIN:
        s = re.sub(pat, rep, s)
    return s.strip()


CAT_WORDS = {"dependencies": "Build order and safety order", "fit": "Parts fit (holes, screws, pads)",
             "access": "Tools can reach (iron, driver, fingers)", "clearance": "Nothing hits anything (props, ground, views)",
             "wiring": "Wiring (every connection, every wire long enough)", "power": "Power (voltages and currents)",
             "weight": "Weight and balance", "cross-checks": "Lists, ids and directions agree"}


def write_report(summary, tot, counts, mc_checks):
    """docs/build-truth/VERIFICATION.md: plain English first, details after. Rewritten on every run."""
    R = summary["results"]
    L = []
    w = L.append
    w("# How this build was checked")
    w("")
    w(f"Written by `python -I scripts/build/verify_build.py` on {summary['date']}. Run it again any time; it rewrites this page.")
    w("")
    w("## In plain words")
    w("")
    w(f"- **{summary['totals']['checks']} checks** on the guide, the 3D models and the parts list.")
    w(f"- **{tot['PASS']} passed.**")
    w(f"- **{tot['FAIL']} failed.**" + (" Each one is listed below, with what it means." if tot["FAIL"] else ""))
    w(f"- **{tot['NEEDS REAL PARTS']} need the real parts.** Listings leave out a size or a detail, so you check these in your hands "
      f"before you build. That is the arrival checklist at the end: {len(summary['arrival_checklist'])} short tests.")
    w(f"- **{tot['PAGE FIX']} are page fixes.** The page's own lists disagree with each other, for example a part on the buy list "
      "that no step uses. They do not stop anything fitting.")
    w(f"- Every measured check was repeated **{summary['tolerance_runs']:,} times**. Each run used slightly different sizes, so a part "
      "a little bigger or smaller than its listing is covered. The random seed is fixed (" + str(summary["seed"]) + "), so every run of this "
      "page gives the same numbers.")
    w("- This is not a promise that nothing can go wrong. It says exactly what was checked, how, and what can only be checked with the "
      "parts in hand. The list of things not checked at all is near the end.")
    w("")
    if summary["failures"]:
        w("## What failed")
        w("")
        for f in summary["failures"]:
            w("- " + f)
        w("")
    w("## What was checked")
    w("")
    w("| What | Passed | Failed | Needs the real parts | Page fixes |")
    w("|---|---|---|---|---|")
    for k, c in counts.items():
        w(f"| {CAT_WORDS.get(k, k)} | {c['PASS']} | {c['FAIL']} | {c['NEEDS REAL PARTS']} | {c['PAGE FIX']} |")
    w("")
    w("## The smallest safety margins that still pass")
    w("")
    for s in summary["weakest_margins"]:
        w("- " + s)
    w("")
    w("## How the sizes were varied")
    w("")
    for k, v in summary["tolerances"].items():
        w(f"- {k}: {v}")
    w("- Each run picks every size at random inside its band, all at once. A check that fails in more than 0.1 % of runs is either "
      "redesigned or moved to the arrival checklist with a test you can do in your hands.")
    w("- \"Driven by\" names the size whose wobble lines up best with the check's result (correlation r). That is the size to measure first.")
    w("")
    w("## Arrival checklist (do these before you build)")
    w("")
    for i, a in enumerate(summary["arrival_checklist"], 1):
        w(f"{i}. **{a['item']}** ({a['parcel']}). Test: {a['test']} Pass: {a['pass']} If not: {a['fail']}")
    w("")
    w("## Not checked at all")
    w("")
    for s in summary["not_checked"]:
        w("- " + s)
    w("")
    w("## Every check")
    w("")
    w("Margin = how much room is left at the design sizes. Runs = the share of the tolerance runs that pass, and the worst result seen.")
    w("")
    w("| Result | Check | Step | Margin | Runs (worst) | Driven by | Note |")
    w("|---|---|---|---|---|---|---|")
    for r in R:
        m = "" if r["margin"] is None else f"{r['margin']} {r['unit']}"
        runs = f"{r['pass_rate']}% ({r['worst']})" if r["runs"] else ""
        note = (r["detail"] + " " + r.get("detail_extra", "")).strip().replace("|", "/")
        drv = r["driver"] if r["runs"] and r["pass_rate"] < 100 else ""
        w(f"| {r['status']} | {r['name'].replace('|', '/')} | {r['action']} | {m} | {runs} | {drv} | {note} |")
    w("")
    w("## Inputs (plain files, for anyone who wants to write their own checker)")
    w("")
    w("All in `docs/build-truth/geometry/`: `parts.json` (every size, its accuracy tag and source), `weights.json`, "
      "`frame_outlines.json` (TBS drawing), `positions.json`, `routes.json` (cable paths), `assembly.json` (the build order, what "
      "each action needs and makes), `netlist.json` (every connection and connector), `power.json`, `tolerances.json`, `arrival.json`, "
      "`buy_list.json` (copy of the page's buy list). Units mm and g; +X forward, +Y left, Z up; origin = stack centre on the underside "
      "of the bottom plate. The inputs are written by `scripts/build/verify_inputs.py`.")
    with open(os.path.join(OUTD, "VERIFICATION.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def main():
    quiet = "--quiet" in sys.argv
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    replay()
    measured()
    static_checks()
    cross_checks()
    run_mc()
    arrival_names = {a["item"] for a in ARR}
    missing_arr = sorted({r["arrival"] for r in RESULTS if r["status"] == "NEEDS REAL PARTS" and r["arrival"] and r["arrival"] not in arrival_names})
    for name in missing_arr:
        RESULTS.append({"id": "ARRIVAL-" + name, "category": "cross-checks", "action": "", "status": "FAIL", "unit": "",
                        "name": f"Arrival checklist has a test for '{name}'", "detail": "missing from arrival.json", "margin": None,
                        "arrival": None, "pass_rate": None, "runs": 0, "driver": "", "worst": None})
    counts = {}
    for r in RESULTS:
        c = counts.setdefault(r["category"], {"PASS": 0, "FAIL": 0, "NEEDS REAL PARTS": 0, "PAGE FIX": 0})
        c[r["status"]] += 1
    tot = {s: sum(c[s] for c in counts.values()) for s in ("PASS", "FAIL", "NEEDS REAL PARTS", "PAGE FIX")}
    mc_checks = [r for r in RESULTS if r["runs"]]
    weakest = sorted([r for r in mc_checks if r["status"] == "PASS" and r["unit"] == "mm"], key=lambda r: r["worst"])[:5]
    used_arr = sorted({r["arrival"] for r in RESULTS if r["status"] == "NEEDS REAL PARTS" and r["arrival"]})
    arrival = [a for a in ARR if a["item"] in used_arr] + [a for a in ARR if a["item"] not in used_arr]

    for r in RESULTS:
        r["name_plain"] = plain(r["name"])
    summary = {
        "date": datetime.date.today().isoformat(), "command": "python -I scripts/build/verify_build.py",
        "totals": {"checks": len(RESULTS), "passed": tot["PASS"], "failed": tot["FAIL"], "need_real_parts": tot["NEEDS REAL PARTS"],
                   "page_fixes": tot["PAGE FIX"]},
        "per_category": counts, "tolerance_runs": RUNS, "seed": SEED, "measured_checks_varied": len(mc_checks),
        "tolerances": {"CAD": "+-0.2 mm", "datasheet": "+-0.5 mm", "estimated": "+-2 mm or 10 %, whichever is larger",
                       "hole positions": "+-0.2 mm", "weights": "+-5 %", "placed by hand (Pi, GPS, battery)": "+-3 mm (my assumption)",
                       "bottom plate": "anywhere 2.0-2.5 mm (drawing says 2, listing says 2.5)"},
        "weakest_margins": [plain(f"{r['name']}: {r['margin']} mm as designed, {r['worst']} mm in the worst of {RUNS:,} runs") for r in weakest],
        "failures": [plain(" ".join(x for x in (f"{r['name']}." + (f" Margin {r['margin']} {r['unit']} at the design sizes." if r['margin'] is not None else ""),
                                                r["detail"], r.get("detail_extra", "")) if x).strip()) for r in RESULTS if r["status"] == "FAIL"],
        "page_fixes": [plain(r.get("page_text") or f"{r['name']}: {r['detail']}") for r in RESULTS if r["status"] == "PAGE FIX"],
        "arrival_checklist": [dict({k: plain(v) if k in ("item", "parcel", "test", "pass", "fail") else v for k, v in a.items()},
                                   needed_by=[r["id"] for r in RESULTS if r["arrival"] == a["item"]]) for a in arrival],
        "wording": "Reader-facing text is in plain words (speed controller, flight controller; no change-request numbers). "
                   "Each result keeps its short id; 'name_plain' is the page wording.",
        "not_checked": ["how the props are marked CW/CCW and which face goes up (read the real props)",
                        "real wire stiffness and bend room (cables are lines with slack added)",
                        "thrust, flight time and motor heat (no thrust data on the list)",
                        "whether the stack screws go in from below with nuts on top, or from above into the frame's press nuts"],
        "results": RESULTS,
    }
    with open(os.path.join(OUTD, "verification-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=1, ensure_ascii=False)
    write_report(summary, tot, counts, mc_checks)
    with open(os.path.join(OUTD, "verification-results.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id", "category", "action", "status", "name", "margin", "unit", "pass_rate", "runs", "worst",
                                          "driver", "arrival", "detail"], extrasaction="ignore")
        w.writeheader(); w.writerows(RESULTS)

    if not quiet:
        for r in RESULTS:
            extra = ""
            if r["margin"] is not None:
                extra += f" [margin {r['margin']} {r['unit']}]"
            if r["runs"]:
                extra += f" [{r['pass_rate']}% of {r['runs']:,} runs pass; worst {r['worst']}" + (f"; driven by {r['driver']}" if r["driver"] and r["pass_rate"] < 100 else "") + "]"
            print(f"{r['status']:16s} {r['id']:22s} {r['name']}{extra}")
            if r["status"] != "PASS" and (r["detail"] or r.get("detail_extra")):
                print(" " * 17 + (r["detail"] + " " + r.get("detail_extra", "")).strip())
        print()
    print(f"{tot['PASS']} checks passed, {tot['FAIL']} failed, {tot['NEEDS REAL PARTS']} need the real parts, "
          f"{tot['PAGE FIX']} are page fixes; {RUNS:,} tolerance runs (seed {SEED}) on {len(mc_checks)} measured checks.")
    if weakest:
        print("Weakest margin: " + summary["weakest_margins"][0])
    print("Arrival checklist: %d tests (docs/build-truth/verification-summary.json)" % len(summary["arrival_checklist"]))
    print("VERIFY PASSED" if tot["FAIL"] == 0 else "VERIFY FAILED")
    return 1 if tot["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
