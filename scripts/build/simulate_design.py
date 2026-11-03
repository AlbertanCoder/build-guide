"""
simulate_design.py - design simulations on the real frame outlines and sourced sizes/weights.

    python -I scripts/build/simulate_design.py            # run every sweep, write results, print the summary
    python -I scripts/build/simulate_design.py --check    # also print PASS/FAIL lines (gate-style) and exit 1 on FAIL

Reads ONLY docs/build-truth/geometry/*.json (parts.json, weights.json, frame_outlines.json) plus the layout
definitions it writes to docs/build-truth/geometry/layouts.json, so another checker can be written from the same inputs.
Writes docs/build-truth/sim-results.csv (one row per layout variant x leg height), sim-pilot-camera.csv (tilt x prop
angle), sim-summary.json. Every check is described in docs/build-truth/SIMULATION.md.

Units: mm, g, degrees. Axes: +X forward, +Y left, Z up; origin = stack centre, underside of the bottom plate.
Anything the inputs mark ESTIMATED stays an estimate in the results; the summary says which.
"""

import csv
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
GEO = os.path.join(ROOT, "docs", "build-truth", "geometry")
OUTD = os.path.join(ROOT, "docs", "build-truth")

PARTS = json.load(open(os.path.join(GEO, "parts.json"), encoding="utf-8"))["parts"]
WEIGHTS = json.load(open(os.path.join(GEO, "weights.json"), encoding="utf-8"))
FRAME = json.load(open(os.path.join(GEO, "frame_outlines.json"), encoding="utf-8"))
V = lambda name: PARTS[name]["values_mm"]          # noqa: E731

# ---------------------------------------------------------------- fixed geometry (from the inputs)
PLATE_T, ARM_T = V("FRAME")["plate_t"], V("FRAME")["arm_t"]
Z_BOT = (0.0, PLATE_T)
Z_ARM = (PLATE_T, PLATE_T + ARM_T)
Z_MID = (PLATE_T + ARM_T, 2 * PLATE_T + ARM_T)
Z_TOP = (Z_MID[1] + V("FRAME")["standoff_short"], Z_MID[1] + V("FRAME")["standoff_short"] + PLATE_T)
R_MOTOR = V("FRAME")["wheelbase"] / 2.0 / math.sqrt(2.0)
MOTORS = {"M1": (-R_MOTOR, -R_MOTOR), "M2": (R_MOTOR, -R_MOTOR), "M3": (-R_MOTOR, R_MOTOR), "M4": (R_MOTOR, R_MOTOR)}
SPLIT = V("MOTOR_SPLIT")
PROP_R = V("PROP")["dia"] / 2.0
PROP_Z = (Z_ARM[1] + SPLIT["base_h"] + SPLIT["bell_h"], Z_ARM[1] + SPLIT["base_h"] + SPLIT["bell_h"] + V("PROP")["hub_t"])
PROP_CHORD = 17.0          # ESTIMATED blade width at its widest; the listing gives none
INFLATE = 2.0              # every obstacle is grown by 2 mm: the margin the 'clear view' result includes
OUTLINE = {k: np.array(FRAME["parts"][k]["outline"]) for k in ("bottom_plate", "middle_plate", "top_plate", "arm_spacer")}
WINDOWS = [np.array(w) for w in FRAME["parts"]["bottom_plate"].get("windows", [])]
ARM = np.array(FRAME["parts"]["arm"]["outline"])
PI, HAT, MLX, GPS, PACK = V("PI"), V("HAT"), V("MLX"), V("GPS"), V("PACK")
PI_T, HDR_H, QWIIC_H = 1.6, 8.5, 3.0      # ESTIMATED: board thickness, header height, Qwiic plug height
LENS_DROP = 6.0                            # ESTIMATED: MLX lens can below its board
CAM_FOV = (V("THERMAL_CAM")["hfov"], V("THERMAL_CAM")["vfov"])
PILOT_FOV = (V("PILOT_CAM")["hfov"], V("PILOT_CAM")["vfov"])
BAL_TOL = 5.0                              # my choice: CG within 5 mm of the motor-square centre counts as balanced
GROUND_MARGIN = 10.0                       # my choice: legs must stand 10 mm lower than the lowest payload part
EDGE_MARGIN = 2.0                          # screw hole edge to plate edge, beyond the hole radius (my choice)


def point_in_poly(pts, poly):
    """Vectorised even-odd test. pts (N,2), poly (M,2)."""
    x, y = pts[:, 0][:, None], pts[:, 1][:, None]
    x1, y1 = poly[:, 0][None, :], poly[:, 1][None, :]
    x2, y2 = np.roll(poly[:, 0], -1)[None, :], np.roll(poly[:, 1], -1)[None, :]
    cond = (y1 > y) != (y2 > y)
    xint = (x2 - x1) * (y - y1) / np.where(y2 - y1 == 0, 1e-12, y2 - y1) + x1
    return np.sum(cond & (x < xint), axis=1) % 2 == 1


def dist_to_edge(pt, poly):
    p = np.array(pt)
    a, b = poly, np.roll(poly, -1, axis=0)
    ab = b - a
    t = np.clip(np.sum((p - a) * ab, axis=1) / np.maximum(np.sum(ab * ab, axis=1), 1e-12), 0, 1)
    return float(np.min(np.linalg.norm(a + ab * t[:, None] - p, axis=1)))


def arm_polys():
    out = []
    for name, (mx, my) in MOTORS.items():
        ang = math.atan2(-my, -mx)
        c, s = math.cos(ang), math.sin(ang)
        out.append(np.column_stack([mx + ARM[:, 0] * c - ARM[:, 1] * s, my + ARM[:, 0] * s + ARM[:, 1] * c]))
    return out


ARMS = arm_polys()


def plate_material(xy):
    """True where the bottom plate has carbon (inside the outline, not in a window)."""
    inside = point_in_poly(xy, OUTLINE["bottom_plate"])
    for w in WINDOWS:
        inside &= ~point_in_poly(xy, w)
    return inside


# ---------------------------------------------------------------- rays
def frustum_rays(hfov, vfov, fwd, up, n=(31, 21)):
    fwd = np.array(fwd, float); fwd /= np.linalg.norm(fwd)
    up = np.array(up, float); right = np.cross(fwd, up); right /= np.linalg.norm(right); up = np.cross(right, fwd)
    a = np.tan(np.radians(np.linspace(-hfov / 2, hfov / 2, n[0])))
    b = np.tan(np.radians(np.linspace(-vfov / 2, vfov / 2, n[1])))
    A, B = np.meshgrid(a, b)
    d = fwd[None, :] + A.reshape(-1, 1) * right[None, :] + B.reshape(-1, 1) * up[None, :]
    return d / np.linalg.norm(d, axis=1, keepdims=True)


def hit_box(o, d, lo, hi):
    lo, hi = np.array(lo) - INFLATE, np.array(hi) + INFLATE
    with np.errstate(divide="ignore", invalid="ignore"):
        t1, t2 = (lo - o) / d, (hi - o) / d
    tmin = np.nanmax(np.minimum(t1, t2), axis=1)
    tmax = np.nanmin(np.maximum(t1, t2), axis=1)
    return (tmax >= np.maximum(tmin, 1e-6))


def hit_slab(o, d, z0, z1, test_xy):
    """Rays crossing the slab z0..z1: is the crossing point inside the shape? (sampled at the slab middle)"""
    zm = (z0 + z1) / 2.0
    with np.errstate(divide="ignore", invalid="ignore"):
        t = (zm - o[2]) / d[:, 2]
    ok = np.isfinite(t) & (t > 1e-6)
    out = np.zeros(len(d), bool)
    if ok.any():
        pts = o[None, :2] + d[ok, :2] * t[ok, None]
        out[ok] = test_xy(pts)
    return out


def grow(poly, by=INFLATE):
    c = poly.mean(axis=0)
    v = poly - c
    n = np.linalg.norm(v, axis=1, keepdims=True)
    return c + v * (1 + by / np.maximum(n, 1e-9))


FRAME_SLABS = [(Z_BOT, lambda p: plate_material(p)),
               (Z_MID, lambda p: point_in_poly(p, grow(OUTLINE["middle_plate"]))),
               (Z_TOP, lambda p: point_in_poly(p, grow(OUTLINE["top_plate"]))),
               (Z_ARM, lambda p: np.any([point_in_poly(p, grow(a)) for a in ARMS], axis=0)
                | point_in_poly(p, grow(OUTLINE["arm_spacer"])))]


def prop_hit(o, d, angle_deg):
    def blades(pts):
        hit = np.zeros(len(pts), bool)
        for name, (mx, my) in MOTORS.items():
            q = pts - np.array([mx, my])
            r = np.linalg.norm(q, axis=1)
            for k in range(3):
                a = math.radians(angle_deg + 120 * k) * (1 if name in ("M2", "M3") else -1)
                along = q[:, 0] * math.cos(a) + q[:, 1] * math.sin(a)
                across = -q[:, 0] * math.sin(a) + q[:, 1] * math.cos(a)
                hit |= (along > 0) & (r <= PROP_R + INFLATE) & (np.abs(across) <= PROP_CHORD / 2 + INFLATE)
        return hit
    return hit_slab(o, d, PROP_Z[0], PROP_Z[1], blades)


# ---------------------------------------------------------------- layouts
def layouts():
    """Three families, varied in small steps.
    pi_xy = Pi centre; mount = 'drill' (screw holes drilled in the plate) or 'ties' (standoff feet on carbon, zip ties
    through the plate's windows, no drilling); gps = 'front' or 'rear' of the battery on the top plate."""
    L = []
    for fam, pxs in (("A forward pod under the plate", [-6.0, -9.0, -12.0, -15.0, -18.0, -21.0, -24.0]),
                     ("B rear pod under the plate", [-36.0, -40.0, -44.0, -48.0, -52.0, -56.0])):
        for px in pxs:
            for s in (12.0, 20.0):                          # 12 = the sourced standoff; 20 = a longer option
                for mpos in ("front-end", "rear-end", "side"):
                    for orient in ("wide-X", "wide-Y"):
                        for mount in ("drill", "ties", "pad"):
                            for gps in ("front", "rear"):
                                L.append({"family": fam, "pi_xy": [px, 0.0], "standoff": s, "mlx_pos": mpos,
                                          "orient": orient, "mount": mount, "gps": gps, "pi_on_top": False})
    # C: Pi on the top plate behind the battery, MLX on the bottom plate looking down through a window
    for wi, w in enumerate(WINDOWS):
        c = w.mean(axis=0)
        for orient in ("wide-X", "wide-Y"):
            for mount in ("drill", "ties", "pad"):
                for gps in ("front", "on-pi"):
                    L.append({"family": "C Pi on top, MLX through a plate window", "pi_xy": [-50.0, 0.0], "standoff": 0.0,
                              "mlx_pos": "window", "window": wi, "window_centre": [float(c[0]), float(c[1])],
                              "orient": orient, "mount": mount, "gps": gps, "pi_on_top": True})
    for i, l in enumerate(L):
        l["id"] = "L%03d" % (i + 1)
    return L


GPS_SPOT = {"front": [58.0, 0.0], "rear": [-68.0, 0.0], "on-pi": [-50.0, 0.0]}


def place(l):
    """Concrete boxes and points for one layout."""
    px, py = l["pi_xy"]
    out = {}
    if not l["pi_on_top"]:
        s = l["standoff"] + (V("PAD")["t"] if l.get("mount") == "pad" else 0.0)   # the pad sits between plate and standoffs
        z_pi = -s - PI_T
        z_pod_bottom = z_pi - HDR_H - PI_T - QWIIC_H
        out["pod"] = ([px - PI["w"] / 2, py - PI["d"] / 2, z_pod_bottom], [px + PI["w"] / 2, py + PI["d"] / 2, -s])
        holes = [(px + sx * PI["hole_dx"] / 2, py + sy * PI["hole_dy"] / 2) for sx in (-1, 1) for sy in (-1, 1)]
        out["pi_holes_on_plate"] = holes
        if l["mlx_pos"] == "front-end":
            mx, my = px + PI["w"] / 2 + MLX["d"] / 2 + 4.0, py
        elif l["mlx_pos"] == "rear-end":
            mx, my = px - PI["w"] / 2 - MLX["d"] / 2 - 4.0, py
        else:
            mx, my = px, py + PI["d"] / 2 + MLX["w"] / 2 + 4.0
        z_board = -s - PI_T                                  # MLX on its own standoffs at the Pi's level
        out["mlx_board"] = ([mx - MLX["w"] / 2, my - MLX["d"] / 2, z_board - 1.6], [mx + MLX["w"] / 2, my + MLX["d"] / 2, z_board])
        out["lens"] = [mx, my, z_board - 1.6 - LENS_DROP]
        out["mlx_holes"] = [(mx - MLX["hole_dx"] / 2, my + MLX["d"] / 2 - MLX["hole_from_top"]),
                            (mx + MLX["hole_dx"] / 2, my + MLX["d"] / 2 - MLX["hole_from_top"])]
        out["lowest"] = min(z_pod_bottom, out["lens"][2])
        out["gps"] = GPS_SPOT[l["gps"]]
    else:
        out["pod"] = ([px - PI["w"] / 2, py - PI["d"] / 2, Z_TOP[1]], [px + PI["w"] / 2, py + PI["d"] / 2, Z_TOP[1] + 12.0])
        out["pi_holes_on_plate"] = []
        mx, my = l["window_centre"]
        z_board = Z_BOT[1] + 3.0                             # MLX on 3 mm standoffs on top of the bottom plate
        out["mlx_board"] = ([mx - MLX["w"] / 2, my - MLX["d"] / 2, z_board], [mx + MLX["w"] / 2, my + MLX["d"] / 2, z_board + 1.6])
        out["lens"] = [mx, my, z_board - 0.1]
        out["mlx_holes"] = [(mx - MLX["hole_dx"] / 2, my + MLX["d"] / 2 - MLX["hole_from_top"]),
                            (mx + MLX["hole_dx"] / 2, my + MLX["d"] / 2 - MLX["hole_from_top"])]
        out["lowest"] = 0.0
        out["gps"] = GPS_SPOT[l["gps"]]
    return out


# ---------------------------------------------------------------- checks
def thermal_blocked(l, P, leg_h, prop_angles):
    lens = np.array(P["lens"], float)
    fwd = [0, 0, -1]
    up = [1, 0, 0] if l["orient"] == "wide-Y" else [0, 1, 0]
    d = frustum_rays(CAM_FOV[0], CAM_FOV[1], fwd, up)
    o = lens
    blocked = np.zeros(len(d), bool)
    for (z0, z1), test in FRAME_SLABS:
        if z1 <= lens[2] or True:
            blocked |= hit_slab(o, d, z0, z1, test) if z0 < lens[2] else np.zeros(len(d), bool)
    if not l["pi_on_top"]:
        blocked |= hit_box(o, d, *P["pod"])
    for (lx, ly) in leg_positions():
        if leg_h > 0:
            blocked |= hit_box(o, d, [lx - 4, ly - 4, -leg_h], [lx + 4, ly + 4, 0.0])
    worst = 0.0
    for a in prop_angles:
        b = blocked | prop_hit(o, d, a)
        worst = max(worst, float(b.mean()))
    return 100.0 * worst


def leg_positions():
    """Where off-the-shelf legs would go: under each arm, 45 mm out from the centre (legs are NOT chosen yet)."""
    r = 45.0 / math.sqrt(2.0)
    return [(sx * r, sy * r) for sx in (-1, 1) for sy in (-1, 1)]


def items_for_cg(l, P, bat_x):
    """(name, grams, x, y, flag) from weights.json at the positions in this layout."""
    w = {p["name"]: p for p in WEIGHTS["parts"]}
    cam_x = max(OUTLINE["middle_plate"][:, 0]) - V("CAMERA")["depth"] / 2 - 4.0
    items = []

    def add(key, x, y, qty=None):
        p = w[key]
        q = p["qty"] if qty is None else qty
        items.append((key, p["g"] * q, x, y, p.get("opus_flag", "")))
    # frame: area-weighted centroid of its own plates and arms
    def centroid(poly):
        x, y = poly[:, 0], poly[:, 1]
        a = x * np.roll(y, -1) - np.roll(x, -1) * y
        A = a.sum() / 2
        return abs(A), ((x + np.roll(x, -1)) * a).sum() / (6 * A), ((y + np.roll(y, -1)) * a).sum() / (6 * A)
    tot = cx = cy = 0.0
    for poly, t in [(OUTLINE["bottom_plate"], PLATE_T), (OUTLINE["middle_plate"], PLATE_T), (OUTLINE["top_plate"], PLATE_T),
                    (OUTLINE["arm_spacer"], ARM_T)] + [(a, ARM_T) for a in ARMS]:
        A, x0, y0 = centroid(poly)
        tot += A * t; cx += A * t * x0; cy += A * t * y0
    add("Frame, TBS Source One V6 5-inch", cx / tot, cy / tot)
    add("Flight controller, GEPRC TAKER F405", 0.0, 0.0)
    add("Speed controller board (50 A 4-in-1)", 0.0, 0.0)
    add("Motors, Emax ECO III 2207 1900KV", 0.0, 0.0)     # four, symmetric about the centre
    add("Propellers, Gemfan 51499", 0.0, 0.0)
    add("Radio receiver, RadioMaster RP1 V2", -30.0, 15.0)
    add("Flight battery, GNB 1500 mAh 4S", bat_x, 0.0)
    add("Battery strap, Rotor Village Kevlar", bat_x, 0.0)
    add("Camera, RunCam Phoenix 2 Special Edition", cam_x, 0.0)
    add("Video transmitter, TBS Unify Pro HV", -45.0, 0.0)
    add("Video antenna, TBS Triumph PRO", -88.0, 0.0)
    pod = P["pod"]
    add("Raspberry Pi Zero 2 W (board)", (pod[0][0] + pod[1][0]) / 2, (pod[0][1] + pod[1][1]) / 2)
    add("Thermal camera board, MLX90640", P["lens"][0], P["lens"][1])
    add("GPS board, PA1010D", P["gps"][0], P["gps"][1])
    return items


def cg(items):
    m = sum(i[1] for i in items)
    return sum(i[1] * i[2] for i in items) / m, sum(i[1] * i[3] for i in items) / m, m


def battery_range(l, P):
    """Battery centre positions (whole pack on the top plate, not over a top-mounted Pi or the GPS) that balance it."""
    top = OUTLINE["top_plate"]
    xmin, xmax = top[:, 0].min() + PACK["l"] / 2, top[:, 0].max() - PACK["l"] / 2
    ok = []
    for bx in np.arange(math.ceil(xmin), math.floor(xmax) + 0.01, 1.0):
        pack = (bx - PACK["l"] / 2, bx + PACK["l"] / 2)
        clash = False
        if l["pi_on_top"]:
            clash |= not (pack[1] < P["pod"][0][0] - 2 or pack[0] > P["pod"][1][0] + 2)
        gx = P["gps"][0]
        if l["gps"] != "on-pi":
            clash |= not (pack[1] < gx - GPS["w"] / 2 - 2 or pack[0] > gx + GPS["w"] / 2 + 2)
        x, y, _ = cg(items_for_cg(l, P, bx))
        if not clash and abs(x) <= BAL_TOL:
            ok.append(float(bx))
    return ok, (float(xmin), float(xmax))


def gps_sky_blocked(l, P, bat_x):
    """Upward cone (60 degrees off vertical) from the GPS antenna: share of rays that hit the battery, antenna or a top Pi."""
    gx, gy = P["gps"]
    o = np.array([gx, gy, Z_TOP[1] + GPS["h"]], float)
    d = frustum_rays(120, 120, [0, 0, 1], [1, 0, 0], n=(25, 25))
    blocked = hit_box(o, d, [bat_x - PACK["l"] / 2, -PACK["w"] / 2, Z_TOP[1]], [bat_x + PACK["l"] / 2, PACK["w"] / 2, Z_TOP[1] + PACK["h"]])
    blocked |= hit_box(o, d, [-98, -10, Z_TOP[1]], [-78, 10, 90])        # video antenna head and cable (drawn)
    if l["pi_on_top"]:
        blocked |= hit_box(o, d, *P["pod"])
    return 100.0 * float(blocked.mean())


def carbon_margin(pt, radius):
    """Distance from a round foot/hole edge to the nearest plate edge or window edge (negative = not on carbon)."""
    inside = bool(plate_material(np.array([pt]))[0])
    e = min([dist_to_edge(pt, OUTLINE["bottom_plate"])] + [dist_to_edge(pt, w) for w in WINDOWS])
    return (e - radius) if inside else -(e + radius)


def windows_near(box_lo, box_hi, reach=8.0):
    """Windows whose outline comes within `reach` mm of the footprint (for zip ties)."""
    n = 0
    for w in WINDOWS:
        dx = np.maximum(np.maximum(box_lo[0] - w[:, 0], w[:, 0] - box_hi[0]), 0)
        dy = np.maximum(np.maximum(box_lo[1] - w[:, 1], w[:, 1] - box_hi[1]), 0)
        if float(np.min(np.hypot(dx, dy))) <= reach:
            n += 1
    return n


def carbon_coverage(lo, hi, step=1.0):
    xs = np.arange(lo[0], hi[0] + 1e-6, step)
    ys = np.arange(lo[1], hi[1] + 1e-6, step)
    X, Y = np.meshgrid(xs, ys)
    return float(plate_material(np.column_stack([X.ravel(), Y.ravel()])).mean())


PAD_MIN = 0.6     # my choice: a pad under the part needs carbon under at least 60 % of its footprint


def fit(l, P):
    """Smallest fit margin (mm). drill: screw holes (r 1.4) need EDGE_MARGIN of carbon round them.
    ties: standoff feet (r 2.5, OD 5 mm) must sit fully on carbon and at least two windows must sit beside the part
    for zip ties; nothing is drilled."""
    margins = []
    foot_r, hole_r = 2.5, 1.4
    if not l["pi_on_top"]:
        lo, hi = P["pod"]
        if l["mount"] == "pad":
            margins.append((carbon_coverage(lo, hi) - PAD_MIN) * 20.0)     # 70 % coverage -> 2.0
            margins.append(3.0 if windows_near(lo, hi) >= 2 else -3.0)
        else:
            for h in P["pi_holes_on_plate"]:
                margins.append(carbon_margin(h, hole_r if l["mount"] == "drill" else foot_r))
            if l["mount"] == "ties":
                margins.append(3.0 if windows_near(lo, hi) >= 2 else -3.0)
        mlo, mhi = P["mlx_board"]
        if l["mount"] == "pad":
            margins.append((carbon_coverage(mlo, mhi) - PAD_MIN) * 20.0)
        else:
            for h in P["mlx_holes"]:
                margins.append(carbon_margin(h, hole_r if l["mount"] == "drill" else foot_r))
    else:
        lo, hi = P["mlx_board"]
        if l["mount"] == "pad":
            margins.append((carbon_coverage(lo, hi) - PAD_MIN) * 20.0)
            margins.append(3.0 if windows_near(lo, hi) >= 2 else -3.0)
        else:
            for h in P["mlx_holes"]:
                margins.append(carbon_margin(h, hole_r if l["mount"] == "drill" else foot_r))
            if l["mount"] == "ties":
                margins.append(3.0 if windows_near(lo, hi) >= 2 else -3.0)
        corners = np.array([[P["pod"][0][0], P["pod"][0][1]], [P["pod"][1][0], P["pod"][0][1]],
                            [P["pod"][1][0], P["pod"][1][1]], [P["pod"][0][0], P["pod"][1][1]]])
        margins.append(min(dist_to_edge(c, OUTLINE["top_plate"]) if point_in_poly(c[None], OUTLINE["top_plate"])[0]
                           else -dist_to_edge(c, OUTLINE["top_plate"]) for c in corners))
    return min(margins) if margins else 0.0


def thermal_side_margin(l, P):
    """How far the nearest pod edge sits outside the thermal view at the pod's lowest level (mm; negative = inside)."""
    if l["pi_on_top"]:
        return 99.0
    lens = P["lens"]
    depth = lens[2] - P["pod"][0][2]
    if depth <= 0:
        return 99.0
    hx = math.tan(math.radians((CAM_FOV[0] if l["orient"] == "wide-X" else CAM_FOV[1]) / 2)) * depth + 4.5
    hy = math.tan(math.radians((CAM_FOV[1] if l["orient"] == "wide-X" else CAM_FOV[0]) / 2)) * depth + 4.5
    lo, hi = P["pod"]
    gap_x = max(lo[0] - (lens[0] + hx), (lens[0] - hx) - hi[0])
    gap_y = max(lo[1] - (lens[1] + hy), (lens[1] - hy) - hi[1])
    return float(max(gap_x, gap_y))


def prop_wire_clearance(l, P):
    """Pigtail from the FC's 5V pad (on the FC edge) down to the Pi: closest approach to a prop disc (3-D, mm)."""
    start = np.array([4.0, -14.4, 22.0])
    end = np.array([P["pod"][0][0] + 10, P["pod"][0][1], P["pod"][1][2]]) if not l["pi_on_top"] else np.array(
        [P["pod"][0][0] + 10, P["pod"][0][1], P["pod"][0][2]])
    via = np.array([start[0], -24.0, 5.0])
    best = 1e9
    for a, b in ((start, via), (via, end)):
        for t in np.linspace(0, 1, 40):
            p = a + (b - a) * t
            for (mx, my) in MOTORS.values():
                r = math.hypot(p[0] - mx, p[1] - my) - PROP_R
                dz = 0.0 if PROP_Z[0] <= p[2] <= PROP_Z[1] else min(abs(p[2] - PROP_Z[0]), abs(p[2] - PROP_Z[1]))
                best = min(best, math.hypot(max(r, 0), dz) if r > 0 or dz > 0 else -1)
    return float(best)


def pilot_sweep():
    rows = []
    cam_x = max(OUTLINE["middle_plate"][:, 0]) - V("CAMERA")["depth"] / 2 - 4.0
    lens = np.array([cam_x + V("CAMERA")["depth"] / 2 + 5.5, 0.0, (Z_MID[1] + Z_TOP[0]) / 2])
    for tilt in range(0, 45, 5):
        t = math.radians(tilt)
        fwd = [math.cos(t), 0, math.sin(t)]
        d = frustum_rays(PILOT_FOV[0], PILOT_FOV[1], fwd, [-math.sin(t), 0, math.cos(t)], n=(41, 31))
        frame = np.zeros(len(d), bool)
        for (z0, z1), test in FRAME_SLABS:
            frame |= hit_slab(lens, d, z0, z1, test)
        props = [float(prop_hit(lens, d, a).mean()) for a in range(0, 120, 6)]
        rows.append({"tilt_deg": tilt, "frame_in_view_pct": round(100 * float(frame.mean()), 2),
                     "props_in_view_pct_min": round(100 * min(props), 2), "props_in_view_pct_max": round(100 * max(props), 2),
                     "sky_pct": round(100 * float((d[:, 2] > 0).mean()), 1)})
    return rows


def main():
    check_mode = "--check" in sys.argv
    L = layouts()
    with open(os.path.join(GEO, "layouts.json"), "w", encoding="utf-8") as f:
        json.dump(L, f, indent=1)
    prop_angles = list(range(0, 120, 3))
    rows = []
    for l in L:
        P = place(l)
        bat, (bxmin, bxmax) = battery_range(l, P)
        bat_mid = (min(bat) + max(bat)) / 2 if bat else None
        bat_margin = (min(bat_mid - bxmin, bxmax - bat_mid, (max(bat) - min(bat)) / 2) if bat else -1.0)
        fitm = fit(l, P)
        side = thermal_side_margin(l, P)
        wire = prop_wire_clearance(l, P)
        gps_b = gps_sky_blocked(l, P, bat_mid if bat_mid is not None else 0.0)
        need_leg = -P["lowest"] + GROUND_MARGIN
        cgx, cgy, mass = cg(items_for_cg(l, P, bat_mid if bat_mid is not None else 0.0))
        for leg_h in range(0, 55, 5):
            tb = thermal_blocked(l, P, leg_h, prop_angles)
            legs_ok = leg_h >= need_leg
            passed = (tb == 0.0) and fitm >= EDGE_MARGIN and bool(bat) and legs_ok and wire > 5.0
            rows.append({
                "id": l["id"], "family": l["family"], "pi_x": l["pi_xy"][0], "standoff_mm": l["standoff"],
                "mlx_pos": l["mlx_pos"] + (str(l.get("window", "")) if l["mlx_pos"] == "window" else ""), "orient": l["orient"],
                "mount": l["mount"], "gps": l["gps"],
                "leg_h_mm": leg_h, "thermal_blocked_pct": round(tb, 2), "thermal_side_margin_mm": round(side, 1),
                "hole_edge_margin_mm": round(fitm, 1), "battery_x_ok_from": min(bat) if bat else "", "battery_x_ok_to": max(bat) if bat else "",
                "battery_margin_mm": round(bat_margin, 1), "cg_x_mm": round(cgx, 1), "cg_y_mm": round(cgy, 1),
                "mass_listed_g": round(mass, 1), "lowest_part_mm": round(P["lowest"], 1), "leg_needed_mm": round(need_leg, 1),
                "gps_sky_blocked_pct": round(gps_b, 1), "wire_to_prop_mm": round(wire, 1), "PASS": passed,
            })
    with open(os.path.join(OUTD, "sim-results.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    pilot = pilot_sweep()
    with open(os.path.join(OUTD, "sim-pilot-camera.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(pilot[0].keys()))
        w.writeheader(); w.writerows(pilot)
    # best: passes with the shortest legs it can, then the biggest of the smallest margins
    best_by_layout = {}
    for r in rows:
        if not r["PASS"]:
            continue
        cur = best_by_layout.get(r["id"])
        if cur is None or r["leg_h_mm"] < cur["leg_h_mm"]:
            best_by_layout[r["id"]] = r
    def score(r):
        return min(r["battery_margin_mm"] / 10.0, r["hole_edge_margin_mm"] / 2.0, r["thermal_side_margin_mm"] / 5.0,
                   (100 - r["gps_sky_blocked_pct"]) / 25.0, r["wire_to_prop_mm"] / 10.0, 50.0 / max(r["leg_h_mm"], 1))
    ranked = sorted(best_by_layout.values(), key=score, reverse=True)
    fams = {}
    for r in rows:
        fams.setdefault(r["family"], {"variants": set(), "pass_variants": set()})
        fams[r["family"]]["variants"].add(r["id"])
        if r["PASS"]:
            fams[r["family"]]["pass_variants"].add(r["id"])
    summary = {
        "runs": len(rows), "layout_variants": len(L), "prop_angles_per_thermal_run": len(prop_angles),
        "families": {k: {"variants": len(v["variants"]), "passing": len(v["pass_variants"])} for k, v in fams.items()},
        "best": [dict(r, score=round(score(r), 2)) for r in ranked[:6]],
        "pilot_camera": pilot,
        "estimated_inputs": ["prop chord 17 mm", "board thickness 1.6 mm", "header 8.5 mm", "Qwiic plug 3 mm",
                             "MLX lens 6 mm below its board", "motor bell/shaft split", "VTX, receiver, antenna, camera positions",
                             "leg positions (legs not chosen)"],
        "my_thresholds": {"obstacle_inflation_mm": INFLATE, "balance_tolerance_mm": BAL_TOL, "ground_margin_mm": GROUND_MARGIN,
                          "hole_edge_margin_mm": EDGE_MARGIN, "wire_to_prop_min_mm": 5.0},
        "unweighed": WEIGHTS.get("unlisted", []),
    }
    with open(os.path.join(OUTD, "sim-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=1, default=list)
    print("RUNS %d (layout variants %d x leg heights 11; thermal rays 651 per run x %d prop angles)" % (len(rows), len(L), len(prop_angles)))
    for k, v in summary["families"].items():
        print("FAMILY %-45s variants %2d  passing %2d" % (k, v["variants"], v["passing"]))
    for r in summary["best"][:5]:
        print("BEST %s %-38s pi_x %5.0f standoff %4.0f mlx %-8s %s %s gps-%s legs %2d mm  battery %s..%s  fit margin %.1f  side %.1f  gps-sky-blocked %.0f%%  score %.2f"
              % (r["id"], r["family"], r["pi_x"], r["standoff_mm"], r["mlx_pos"], r["orient"], r["mount"], r["gps"], r["leg_h_mm"],
                 r["battery_x_ok_from"], r["battery_x_ok_to"], r["hole_edge_margin_mm"], r["thermal_side_margin_mm"],
                 r["gps_sky_blocked_pct"], r["score"]))
    for p in pilot:
        print("PILOT tilt %2d deg: frame in view %.1f%%, props in view %.1f-%.1f%%, sky %.0f%%"
              % (p["tilt_deg"], p["frame_in_view_pct"], p["props_in_view_pct_min"], p["props_in_view_pct_max"], p["sky_pct"]))
    if check_mode:
        fails = 0
        def chk(ok, msg):
            nonlocal fails
            print(("PASS " if ok else "FAIL ") + msg)
            fails += 0 if ok else 1
        chk(len(L) >= 30, f"at least 30 layout variants ({len(L)})")
        chk(len(fams) >= 3, f"at least three layout families ({len(fams)})")
        chk(len(rows) == len(L) * 11, f"every variant run at 11 leg heights ({len(rows)} runs)")
        chk(len(pilot) == 9, "pilot camera tilt swept 0-40 degrees in 5 degree steps")
        chk(bool(ranked), "at least one layout passes every check")
        chk(all(r["thermal_blocked_pct"] == 0 for r in ranked), "every passing layout has 0% of thermal rays blocked")
        chk(os.path.exists(os.path.join(GEO, "layouts.json")), "layout inputs written as a plain file")
        chk(all(p["frame_in_view_pct"] < 5 for p in pilot if p["tilt_deg"] <= 15), "the frame stays out of the flying camera's view at beginner tilts")
        # Shad's chosen legs on the approved layout (L515): positions = the frame's spare standoff holes
        G = V("LEGS")
        asm = FRAME["assembly"]
        rear = [p for p in asm["standoffs_30mm_bottom_to_top_xy"] if p[0] < -50]
        front = [p for p in asm["standoffs_22mm_middle_to_top_xy"] if p[0] > 40]
        rear_bottom = -(G["pieces"] * G["rear_piece"] + G["foot_h"])
        front_bottom = Z_ARM[1] - (G["pieces"] * G["front_piece"] + G["foot_h"])
        global leg_positions
        leg_positions = lambda: [tuple(p) for p in rear + front]         # noqa: E731
        L515 = [l for l in L if l["id"] == "L515"][0]
        P = place(L515)
        tb = max(thermal_blocked(L515, P, -rear_bottom, prop_angles), thermal_blocked(L515, P, -front_bottom, prop_angles))
        chk(tb == 0.0, f"chosen legs: thermal view still 0% blocked at every prop angle ({tb:.1f}%)")
        ground = min(-rear_bottom, -front_bottom) - (-P["lowest"])
        chk(ground >= GROUND_MARGIN, f"chosen legs: payload {ground:.1f} mm above the ground when landed (need {GROUND_MARGIN:.0f})")
        chk(abs(rear_bottom - front_bottom) <= 3.0, f"chosen legs: front and rear feet within 3 mm of level ({abs(rear_bottom - front_bottom):.1f} mm)")
        pod_gap = (P["pod"][0][0] - V("PAD")["margin"]) - (max(p[0] for p in rear) + G["od"] / 2)
        chk(pod_gap > 2.0, f"chosen legs: rear legs clear the payload pad by {pod_gap:.1f} mm")
        cgx, cgy, _ = cg(items_for_cg(L515, P, V("LAYOUT")["battery_x"]))
        feet = np.array(rear + front)
        hull = np.array([feet[np.argmin(feet[:, 0] + 0 * feet[:, 1])]])
        inside = (feet[:, 0].min() < cgx < feet[:, 0].max()) and (abs(cgy) < min(abs(p[1]) for p in rear + front))
        side = min(abs(p[1]) for p in rear + front) - abs(cgy)
        chk(inside, f"chosen legs: centre of gravity ({cgx:.1f}, {cgy:.1f}) mm sits inside the four feet; side margin {side:.1f} mm (narrow: land on flat ground)")
        summary["chosen_legs"] = {"rear_bottom_mm": rear_bottom, "front_bottom_mm": front_bottom, "thermal_blocked_pct": tb,
                                  "payload_ground_clearance_mm": round(ground, 1), "pad_gap_mm": round(pod_gap, 1),
                                  "cg_xy_mm": [round(cgx, 1), round(cgy, 1)], "side_margin_mm": round(side, 1)}
        with open(os.path.join(OUTD, "sim-summary.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=1, default=list)
        print("ALL PASS" if not fails else f"{fails} FAILED")
        return 1 if fails else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
