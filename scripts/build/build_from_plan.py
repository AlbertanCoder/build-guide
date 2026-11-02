"""
build_from_plan.py - a one-off explainer model built from a JSON plan.

The Guide Assistant asks the AI for a plan (which parts to show, extra boxes,
wires, arrows and labels) and runs this file on it. The plan is data only:
every entry is looked up in the allow-lists below and every number is clamped
to the bench scene, so a plan can never run code of its own.
Run:  set GA_PLAN=plan.json & set GA_MODEL_OUT=dir & blender -b --factory-startup -P build_from_plan.py
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_core as C
import lib_kit as K
import lib_quad as Q

REACH = 0.40                      # metres: nothing is placed further out
BAT = (-0.050, 0.0, 0.016)        # same pack position as the finished build
MAX_SHAPES = 40
MAX_LABELS = 14
COLOURS = (
    "carbon", "alu", "steel", "brass", "pcb_black", "pcb_green", "pcb_red", "pcb_blue",
    "plastic_black", "plastic_white", "plastic_grey", "gold", "copper", "wire_red",
    "wire_black", "wire_blue", "wire_yellow", "wire_white", "battery", "accent", "pine",
)


def num(v, lo=-REACH, hi=REACH, default=0.0):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return max(lo, min(hi, f))


def point(v):
    if not isinstance(v, (list, tuple)) or len(v) != 3:
        raise ValueError("a point needs exactly three numbers [x, y, z]")
    return tuple(num(c) for c in v)


def text(v, n=48):
    return str(v if v is not None else "")[:n]


def colour(P, name, fallback="accent"):
    return P[name] if name in COLOURS else P[fallback]


def ghost_material():
    return C.material("GhostFrame", (0.35, 0.42, 0.42, 1), 0.0, 0.6, alpha=0.16)


def kit(fn):
    return lambda P, o: fn(P, point(o.get("at", (0, 0, 0))), rot_z=num(o.get("turn", 0), -7, 7))


def payload(P, o):
    _, objs = C.collect(Q.pi_payload, P)
    C.shift(objs, dx=0.002)


def pack(P, o):
    Q.battery_pad(P, BAT)
    Q.battery(P, BAT)
    for sx in (-0.058, -0.038):
        Q.strap(P, sx, z_top=BAT[2] + 0.0265, z_bottom=BAT[2])


def motors(P, o):
    for name, xy in Q.MOTORS.items():
        Q.motor(P, name, xy, ghost=bool(o.get("ghost")))


def props(P, o):
    for name, (mx, my) in Q.MOTORS.items():
        Q.propeller(P, "prop_" + name, (mx, my), ghost=bool(o.get("ghost")),
                    rot_z=0.35 * (1 if mx * my > 0 else -1))


PARTS = {
    "frame": lambda P, o: Q.frame(P, carbon=ghost_material() if o.get("ghost") else None),
    "motors": motors,
    "propellers": props,
    "flight_stack": lambda P, o: Q.flight_stack(P, explode=num(o.get("explode", 0), 0, 0.05)),
    "motor_wires": lambda P, o: Q.motor_wires(P),
    "battery_lead": lambda P, o: Q.battery_lead(P),
    "front_camera": lambda P, o: Q.front_camera(P),
    "vtx_and_antenna": lambda P, o: Q.vtx_and_antenna(P, antenna_x=-0.075),
    "led_strip": lambda P, o: Q.led_strip(P),
    "pi_payload": payload,
    "battery": pack,
    "smoke_stopper": kit(K.smoke_stopper),
    "monitor": kit(K.monitor_skyzone),
    "laptop": kit(K.laptop),
    "glasses": kit(K.glasses),
    "soldering_iron": kit(K.soldering_iron),
    "multimeter": kit(K.multimeter),
    "radio": kit(K.radio_pocket),
    "sd_reader": lambda P, o: K.sd_reader(P, point(o.get("at", (0, 0, 0)))),
    "charger": lambda P, o: K.charger_m4ac(P, point(o.get("at", (0, 0, 0)))),
    "lipo_bag": lambda P, o: K.lipo_bag(P, point(o.get("at", (0, 0, 0)))),
}


def shape(P, i, s):
    kind = s.get("shape")
    mat = colour(P, s.get("colour"))
    name = "plan_%02d_%s" % (i, kind)
    if kind == "box":
        size = tuple(num(c, 0.0005, 0.2, 0.01) for c in (s.get("size") or (0.01, 0.01, 0.01))[:3])
        if len(size) != 3:
            raise ValueError("box size needs three numbers")
        C.box(name, size, point(s.get("at")), mat=mat, bevel=min(size) * 0.1)
    elif kind == "cylinder":
        axis = {"x": (0, math.pi / 2, 0), "y": (math.pi / 2, 0, 0)}.get(s.get("axis"), (0, 0, 0))
        C.cyl(name, num(s.get("radius"), 0.0005, 0.1, 0.005), num(s.get("height"), 0.0005, 0.2, 0.01),
              point(s.get("at")), rot=axis, mat=mat, seg=16)
    elif kind == "wire":
        pts = [point(p) for p in (s.get("points") or [])[:8]]
        if len(pts) < 2:
            raise ValueError("a wire needs at least two points")
        C.tube(name, pts, num(s.get("thickness"), 0.0005, 0.004, 0.0011), mat, res=6)
    elif kind == "arrow":
        K.arrow(P, name, point(s.get("from")), point(s.get("to")), color=mat)
    elif kind == "marker":
        K.cg_marker(P, point(s.get("at")))
    else:
        raise ValueError("unknown shape: %r" % (kind,))


def build(plan):
    C.reset()
    P = C.palette()
    for entry in plan.get("parts", []):
        o = entry if isinstance(entry, dict) else {"part": entry}
        fn = PARTS.get(o.get("part"))
        if fn is None:
            raise ValueError("unknown part: %r" % (o.get("part"),))
        fn(P, o)
    for i, s in enumerate(plan.get("shapes", [])[:MAX_SHAPES]):
        shape(P, i, s)
    for lab in plan.get("labels", [])[:MAX_LABELS]:
        C.label(text(lab.get("text")).upper(), point(lab.get("at")),
                detail=text(lab.get("detail"), 80) or None)
    print("PLAN - " + text(plan.get("title"), 80))
    C.summary()
    C.export("view", preview=False)


with open(os.environ["GA_PLAN"], "r", encoding="utf-8") as f:
    build(json.load(f))
