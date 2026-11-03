"""
extract_so1v6.py - turn TBS's published Source One V6 drawing into outline data for the models.

Source: https://github.com/tbs-trappy/source_one  file So1-V6-2025-AUG-19.dxf (95 MB, not committed).
Run (plain Python, no Blender):
    python -I scripts/build/extract_so1v6.py path/to/So1-V6-2025-AUG-19.dxf
Writes scripts/build/data/so1v6_outlines.json and prints the hole matches that fix how the parts sit
together, so the assembly is derived from the real holes, not guessed.

Model axes: millimetres, origin = stack centre, +X forward, +Y left, Z up (as lib_core).
On the drawing the parts lie with the camera end toward -Y (see PROOF lines).
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data", "so1v6_outlines.json")

# Bounding boxes on the drawing sheet (mm) of the 5-inch parts, found by listing every closed outline.
PARTS = {
    "top_plate":    {"layer": "Draw13",        "box": (275.0, 319.0, 1398.0, 1559.0), "t": 2.0},
    "middle_plate": {"layer": "Draw3",         "box": (407.0, 456.0, 1426.5, 1534.5), "t": 2.0},
    "bottom_plate": {"layer": "Draw14",        "box": (609.0, 658.5, 1441.5, 1550.0), "t": 2.0},
    "arm_spacer":   {"layer": "Draw2",         "box": (837.5, 868.5, 1447.5, 1478.5), "t": 6.0},
    "arm":          {"layer": "Frame-Arms",    "box": (938.5, 968.5, 1402.5, 1529.5), "t": 6.0},
    "camera_plate": {"layer": "Camera-Holder", "box": (494.0, 528.5, 1446.0, 1496.0), "t": 2.0},
}


def read_entities(path):
    items, cur, in_ent, pend = [], None, False, False
    with open(path, "r", encoding="latin-1") as f:
        while True:
            code = f.readline()
            if not code:
                break
            val = f.readline().rstrip("\r\n")
            code = code.strip()
            if code == "0":
                if cur and in_ent and cur["t"] in ("LWPOLYLINE", "CIRCLE"):
                    items.append(cur)
                cur = None
                if val == "SECTION":
                    pend = True
                elif val == "ENDSEC":
                    in_ent = False
                else:
                    cur = {"t": val, "layer": "", "pts": [], "b": [], "closed": 0}
                continue
            if code == "2" and pend:
                pend, in_ent = False, (val == "ENTITIES")
                continue
            if cur is None:
                continue
            try:
                if code == "8":
                    cur["layer"] = val
                elif code == "70":
                    cur["closed"] = int(val) & 1
                elif code == "10":
                    cur["pts"].append([float(val), 0.0]); cur["b"].append(0.0)
                elif code == "20" and cur["pts"]:
                    cur["pts"][-1][1] = float(val)
                elif code == "42" and cur["b"]:
                    cur["b"][-1] = float(val)
                elif code == "40":
                    cur["r"] = float(val)
            except ValueError:
                pass
    return items


def arc_points(p, q, bulge, max_step_deg=30.0):
    if abs(bulge) < 1e-9:
        return [tuple(p)]
    ang = 4.0 * math.atan(bulge)
    dx, dy = q[0] - p[0], q[1] - p[1]
    chord = math.hypot(dx, dy)
    r = chord / (2.0 * math.sin(ang / 2.0))
    mx, my = (p[0] + q[0]) / 2.0, (p[1] + q[1]) / 2.0
    h = r * math.cos(ang / 2.0)
    cx, cy = mx - dy / chord * h, my + dx / chord * h
    a0 = math.atan2(p[1] - cy, p[0] - cx)
    n = max(2, int(math.ceil(abs(math.degrees(ang)) / max_step_deg)))
    return [(cx + abs(r) * math.cos(a0 + ang * i / n), cy + abs(r) * math.sin(a0 + ang * i / n)) for i in range(n)]


def outline(e):
    pts, out, n = e["pts"], [], len(e["pts"])
    for i in range(n):
        out += arc_points(pts[i], pts[(i + 1) % n], e["b"][i])
    return out


def inside(pt, box, pad=0.6):
    return box[0] - pad <= pt[0] <= box[1] + pad and box[2] - pad <= pt[1] <= box[3] + pad


def main(dxf):
    ents = read_entities(dxf)
    data = {"source": "TBS Source One V6, So1-V6-2025-AUG-19.dxf, github.com/tbs-trappy/source_one",
            "units": "mm", "parts": {}}
    raw = {}
    for name, spec in PARTS.items():
        box = spec["box"]
        polys = [e for e in ents if e["t"] == "LWPOLYLINE" and e["layer"] == spec["layer"] and len(e["pts"]) > 2
                 and all(inside(p, box) for p in e["pts"])]
        outer = max(polys, key=lambda e: (max(p[0] for p in e["pts"]) - min(p[0] for p in e["pts"]))
                    * (max(p[1] for p in e["pts"]) - min(p[1] for p in e["pts"])))
        holes = [(c["pts"][0][0], c["pts"][0][1], c["r"]) for c in ents
                 if c["t"] == "CIRCLE" and inside(c["pts"][0], box) and c["r"] <= 5.01]
        raw[name] = {"outline": outline(outer), "holes": holes, "t": spec["t"]}

    # --- registration, all in drawing units -------------------------------------------------
    def hole_set(name, rmin=0.9, rmax=2.2):
        return [(x, y) for x, y, r in raw[name]["holes"] if rmin <= r <= rmax]

    def centre_hole(name):
        big = [(x, y) for x, y, r in raw[name]["holes"] if abs(r - 5.0) < 0.05]
        return big[0]

    bot_c = centre_hole("bottom_plate")          # stack centre on the bottom plate
    mid_c = centre_hole("middle_plate")          # stack centre on the middle plate
    # top plate: find the y shift that makes its 14.6 mm-pitch holes land on the middle plate's
    top_h = hole_set("top_plate", 1.4, 1.6)
    mid_h = [(x - mid_c[0], y - mid_c[1]) for x, y in hole_set("middle_plate", 1.4, 1.6)]
    bot_h = [(x - bot_c[0], y - bot_c[1]) for x, y in hole_set("bottom_plate", 1.4, 1.6)]
    tx = (min(x for x, _ in top_h) + max(x for x, _ in top_h)) / 2.0
    best = None
    for (hx, hy) in top_h:
        for (mx, my) in mid_h:
            shift = my - hy
            rel = [(x - tx, y + shift) for x, y in top_h]
            score = sum(1 for p in rel for q in mid_h + bot_h if math.hypot(p[0] - q[0], p[1] - q[1]) < 0.15)
            if best is None or score > best[0]:
                best = (score, shift)
    _, top_shift = best
    top_rel = [(x - tx, y + top_shift) for x, y in top_h]
    on_mid = [p for p in top_rel if any(math.hypot(p[0] - q[0], p[1] - q[1]) < 0.15 for q in mid_h)]
    on_bot = [p for p in top_rel if any(math.hypot(p[0] - q[0], p[1] - q[1]) < 0.15 for q in bot_h)]
    print("PROOF top-plate holes on middle-plate holes (22 mm standoffs):", [(round(x, 2), round(y, 2)) for x, y in on_mid])
    print("PROOF top-plate holes on bottom-plate holes (30 mm standoffs):", [(round(x, 2), round(y, 2)) for x, y in on_bot])

    # arm: motor hole (r 3.5) and two root holes
    ah = raw["arm"]["holes"]
    motor = [(x, y) for x, y, r in ah if abs(r - 3.5) < 0.05][0]
    roots = sorted([(x, y) for x, y, r in ah if abs(r - 1.5) < 0.05], key=lambda p: -math.hypot(p[0] - motor[0], p[1] - motor[1]))
    d_far = math.hypot(roots[0][0] - motor[0], roots[0][1] - motor[1])
    d_near = math.hypot(roots[1][0] - motor[0], roots[1][1] - motor[1])
    R = 120.0  # wheelbase 240 / 2  [R3]
    print("PROOF arm root holes sit %.2f and %.2f mm from the frame centre;" % (R - d_far, R - d_near),
          "20x20 hole = %.2f, 30.5x30.5 hole = %.2f" % (10 * math.sqrt(2), 15.25 * math.sqrt(2)))

    # --- write model-space outlines -------------------------------------------------------------
    def to_model(pts, cx, cy):
        # drawing -Y is forward: model X = -(y - cy); model Y = -(x - cx) keeps the drawing seen from above
        return [(round(-(y - cy), 3), round(-(x - cx), 3)) for x, y in pts]

    data["parts"]["bottom_plate"] = {"t": 2.0, "outline": to_model(raw["bottom_plate"]["outline"], *bot_c)}
    # the bottom plate's inner cut-outs (windows), for the 'look down through the plate' layout check
    bx = PARTS["bottom_plate"]["box"]
    inner = [e for e in ents if e["t"] == "LWPOLYLINE" and e["layer"] == "Draw14" and len(e["pts"]) > 2
             and all(inside(p, bx) for p in e["pts"])]
    outer_area = max((max(p[0] for p in e["pts"]) - min(p[0] for p in e["pts"])) * (max(p[1] for p in e["pts"]) - min(p[1] for p in e["pts"])) for e in inner)
    wins = [e for e in inner if (max(p[0] for p in e["pts"]) - min(p[0] for p in e["pts"])) * (max(p[1] for p in e["pts"]) - min(p[1] for p in e["pts"])) < outer_area * 0.95]
    data["parts"]["bottom_plate"]["windows"] = [to_model(outline(e), *bot_c) for e in wins]
    print("PART bottom_plate windows:", len(wins))
    data["parts"]["middle_plate"] = {"t": 2.0, "outline": to_model(raw["middle_plate"]["outline"], *mid_c)}
    data["parts"]["top_plate"] = {"t": 2.0, "outline": to_model([(x - tx, y + top_shift) for x, y in raw["top_plate"]["outline"]], 0.0, 0.0)}
    sp = raw["arm_spacer"]["outline"]
    scx = (min(p[0] for p in sp) + max(p[0] for p in sp)) / 2.0
    scy = (min(p[1] for p in sp) + max(p[1] for p in sp)) / 2.0
    data["parts"]["arm_spacer"] = {"t": 6.0, "outline": to_model(sp, scx, scy)}
    # arm in its own frame: x along the arm from the motor hole toward the root (so root is at +x), y across
    ax, ay = roots[0][0] - motor[0], roots[0][1] - motor[1]
    L = math.hypot(ax, ay); ux, uy = ax / L, ay / L
    arm_pts = [(round((x - motor[0]) * ux + (y - motor[1]) * uy, 3), round(-(x - motor[0]) * uy + (y - motor[1]) * ux, 3))
               for x, y in raw["arm"]["outline"]]
    data["parts"]["arm"] = {"t": 6.0, "outline": arm_pts, "motor_hole_r": 3.5,
                            "note": "origin = motor shaft hole; +x runs toward the root"}
    cp = raw["camera_plate"]["outline"]
    ccx = (min(p[0] for p in cp) + max(p[0] for p in cp)) / 2.0
    ccy = (min(p[1] for p in cp) + max(p[1] for p in cp)) / 2.0
    data["parts"]["camera_plate"] = {"t": 2.0, "outline": [(round(x - ccx, 3), round(y - ccy, 3)) for x, y in cp],
                                     "note": "side plate, drawn flat; stands upright either side of the camera"}
    data["assembly"] = {
        "z_bottom_plate": [0.0, 2.0], "z_arms": [2.0, 8.0], "z_middle_plate": [8.0, 10.0], "z_top_plate": [32.0, 34.0],
        "standoffs_30mm_bottom_to_top_xy": [(round(-y, 2), round(-x, 2)) for x, y in on_bot],
        "standoffs_22mm_middle_to_top_xy": [(round(-y, 2), round(-x, 2)) for x, y in on_mid],
        "why": "2 + 30 = 32 and 2 + 6 + 2 + 22 = 32: both standoff sets end at the same top plate height",
    }
    for k, v in data["parts"].items():
        xs = [p[0] for p in v["outline"]]; ys = [p[1] for p in v["outline"]]
        print("PART %-13s %3d pts  %.1f x %.1f mm  x %.1f..%.1f" % (k, len(xs), max(xs) - min(xs), max(ys) - min(ys), min(xs), max(xs)))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(data, f, indent=1)
    print("WROTE", OUT)


if __name__ == "__main__":
    main(sys.argv[1])
