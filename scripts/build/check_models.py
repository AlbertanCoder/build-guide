"""
check_models.py - prove the step models match the step text and the budgets. Plain Python, no Blender.

    python -I scripts/build/check_models.py            # all checks, exit 1 on any failure
    python -I scripts/build/check_models.py --sketch   # also write top/side sketches to the scratch dir in $SKETCH_DIR

Checks (one line each, PASS/FAIL):
  * every model exists, is at most 500 KB and 20,000 triangles; the set is at most 4 MB
  * each model was rebuilt after parts.py last changed
  * every part the step text names has a label; nothing the text does not mention is in the model
  * the motors sit where Betaflight says (M1 rear right, M2 front right, M3 rear left, M4 front left), 240 mm apart
  * nothing is called "diamond" (the wrong antenna) and no label says "Acer"
  * the payload on the aircraft is drawn as 'planned' (its layout is not confirmed)
"""

import json
import math
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
MODELS = os.path.join(ROOT, "docs", "models")
sys.path.insert(0, HERE)
import parts as S  # noqa: E402

KB_MAX, TRI_MAX, SET_MAX = 500, 20000, 4 * 1024 * 1024

# Labels each step must carry (case-insensitive substring), taken from the step's own words.
# (the "Crossed on purpose", 5.1" props and PA1010D labels are also read by the gate's 3d-views check)
# "absent" = node-name prefixes that must NOT be in that step's model.
SPEC = {
    "step-01-parts": {"labels": ["AIRFRAME", "RADIO & POWER", "VIDEO", "THERMAL PAYLOAD", "TOOLS", "ORDER LIST",
                                 "LAPTOP", "PROPS STAY IN THE BAG"],
                      "absent": ["frame_top_plate"]},
    "step-02-frame": {"labels": ["M1", "M2", "M3", "M4", "SOURCE ONE V6", "STANDOFFS", "MOTOR SCREWS", "FRONT"],
                      "absent": ["stack_", "prop_", "wire_", "battery_", "cam_", "vtx_"]},
    "step-03-stack": {"labels": ["ESC", "FLIGHT CONTROLLER", "XT60", "CAPACITOR", "8-WIRE", "SMOKE STOPPER",
                                 "MULTIMETER", "MOTOR WIRES"],
                      "absent": ["prop_", "cam_", "vtx_", "rx_"],
                      # the first power-up lesson (page: S5.4b) keeps a charged pack on the BENCH; none may sit on the drone in Step 3
                      "bench_only": ["battery_pack"]},
    "step-04-receiver-fpv": {"labels": ["RP1 V2", "UART2", "PHOENIX 2", "UNIFY", "TRIUMPH", "9V", "MONITOR", "USB", "FINDER",
                                       "TX -> R2  /  RX -> T2 (Crossed on purpose)"],
                             "absent": ["prop_", "battery_pack"]},
    "step-05-power": {"labels": ["RADIO", "18650", "USB-C", "4S", "M7AC", "BALANCE", "LIPO BAG", "LIHV, 1.0 A", "LION, 2.5 A",
                                 "FIRE EXTINGUISHER"],
                      "absent": ["frame_", "prop_"]},
    "step-06-payload": {"labels": ["PI ZERO 2 WH", "QWIIC HAT", "MLX90640", "PA1010D", "CAB-17261", "PIGTAIL",
                                   "LENS DOWN", "ANTENNA UP", "3V3"],
                        "absent": ["frame_", "prop_", "battery_pack"]},
    "step-07-mount": {"labels": ["NYLON STANDOFFS", "ZIP TIES", "KEVLAR STRAP", "GRIP PAD", "PROP CIRCLES",
                                 "CENTRE", "PIGTAIL", "SIMULATED LAYOUT", "AT LEAST 40 MM", "LI-ION PACK"],
                      "absent": ["prop_", "led_strip"]},
    "step-08-test": {"labels": ["LAPTOP", "SMOKE STOPPER", "MOTORS TAB", "CW", "CCW", "1 M HOVER", "30 M",
                                "MUG OF HOT WATER", "PROPS OFF"],
                     "absent": ["led_strip"]},
    "final-product": {"labels": ["5.1\" TRI-BLADE PROPS", "4S 1500 LIHV PACK", "SIMULATED LAYOUT", "PA1010D"], "absent": ["led_strip"]},
}
TRUTH_IDS = set()
with open(os.path.join(ROOT, "docs", "build-truth", "STEP-TRUTH.md"), encoding="utf-8") as _f:
    import re as _re
    TRUTH_IDS = set(_re.findall(r"^\| (S\d\.[0-9A-Za-z]+) \|", _f.read(), flags=_re.M))
PAGE_STEPS = {}
# The guide page in this repo (read only), as verify_build reads it; --page PATH overrides. A missing page is a hard
# failure: until 2026-11-03 the page checks below were once silently skipped by reading an old page without action ids.
PAGE = os.path.join(ROOT, "index.html")
if "--page" in sys.argv:
    PAGE = os.path.abspath(sys.argv[sys.argv.index("--page") + 1])
if not os.path.isfile(PAGE):
    print(f"FAIL the guide page was not found ({os.path.basename(PAGE)}). Run from the repo, or pass --page PATH.")
    print("1 FAILED")
    sys.exit(1)
with open(PAGE, encoding="utf-8") as _f:
    _page = _f.read()
    for _m in _re.finditer(r'<section class="asm-step" data-step="(\d)"', _page):
        _end = _page.find('<section class="asm-step"', _m.end())
        PAGE_STEPS[int(_m.group(1))] = _page[_m.start(): _end if _end > 0 else len(_page)]
PLANNED_REQUIRED = {}   # Phase E: the payload follows the approved simulated layout (labelled), no longer greyed
LAYOUT_REQUIRED = {"step-07-mount": "pi_pcb", "step-08-test": "pi_pcb", "final-product": "pi_pcb"}


def read_glb(path):
    data = open(path, "rb").read()
    magic, _, _ = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF", "not a GLB"
    jlen, _ = struct.unpack_from("<II", data, 12)
    gj = json.loads(data[20:20 + jlen])
    off = 20 + jlen
    blen, _ = struct.unpack_from("<II", data, off)
    return gj, data[off + 8: off + 8 + blen]


def quat_rot(q, v):
    x, y, z, w = q
    vx, vy, vz = v
    tx = 2 * (y * vz - z * vy); ty = 2 * (z * vx - x * vz); tz = 2 * (x * vy - y * vx)
    return (vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx))


def world_nodes(gj):
    """(node, transform function) for every node, applying parents' TRS."""
    out = []

    def walk(i, parents):
        n = gj["nodes"][i]
        trs = (n.get("translation", [0, 0, 0]), n.get("rotation", [0, 0, 0, 1]), n.get("scale", [1, 1, 1]))
        chain = parents + [trs]

        def tf(p, chain=chain):
            for t, r, s in reversed(chain):
                p = (p[0] * s[0], p[1] * s[1], p[2] * s[2])
                p = quat_rot(r, p)
                p = (p[0] + t[0], p[1] + t[1], p[2] + t[2])
            return p
        out.append((n, tf))
        for c in n.get("children", []):
            walk(c, chain)
    for sc in gj.get("scenes", []):
        for i in sc.get("nodes", []):
            walk(i, [])
    return out


def positions(gj, binb, mesh_idx):
    pts = []
    for prim in gj["meshes"][mesh_idx]["primitives"]:
        acc = gj["accessors"][prim["attributes"]["POSITION"]]
        bv = gj["bufferViews"][acc["bufferView"]]
        base = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = bv.get("byteStride", 12)
        for k in range(acc["count"]):
            pts.append(struct.unpack_from("<3f", binb, base + k * stride))
    return pts


def tri_count(gj):
    n = 0
    for m in gj.get("meshes", []):
        for prim in m["primitives"]:
            if "indices" in prim:
                n += gj["accessors"][prim["indices"]]["count"] // 3
            else:
                n += gj["accessors"][prim["attributes"]["POSITION"]]["count"] // 3
    return n


def to_blender(p):
    """glTF (Y up) back to the build axes: X forward, Y left, Z up."""
    return (p[0], -p[2], p[1])


def main():
    sketch = "--sketch" in sys.argv
    fails = []

    def check(ok, msg):
        print(("PASS " if ok else "FAIL ") + msg)
        if not ok:
            fails.append(msg)

    parts_mtime = os.path.getmtime(os.path.join(HERE, "parts.py"))
    total = 0
    for name, spec in SPEC.items():
        path = os.path.join(MODELS, name + ".glb")
        if not os.path.exists(path):
            check(False, f"{name}: file exists")
            continue
        size = os.path.getsize(path)
        total += size
        gj, binb = read_glb(path)
        tris = tri_count(gj)
        check(size <= KB_MAX * 1024, f"{name}: {size / 1024:.0f} KB <= {KB_MAX} KB")
        check(tris <= TRI_MAX, f"{name}: {tris} triangles <= {TRI_MAX}")
        check(os.path.getmtime(path) >= parts_mtime, f"{name}: rebuilt after parts.py changed")
        nodes = world_nodes(gj)
        names = [n.get("name", "") for n, _ in nodes]
        labels = [(n.get("extras") or {}).get("label", "") for n, _ in nodes if (n.get("extras") or {}).get("kind") == "part"]
        lab_up = [l.upper() for l in labels]
        for want in spec["labels"]:
            check(any(want.upper() in l for l in lab_up), f"{name}: label naming '{want}'")
        for bad in spec["absent"]:
            hit = [x for x in names if x.startswith(bad)]
            check(not hit, f"{name}: nothing named {bad}* " + (f"(found {hit[:3]})" if hit else ""))
        for pre in spec.get("bench_only", []):
            where = [tf((0.0, 0.0, 0.0)) for n, tf in nodes if n.get("name", "").startswith(pre)]
            far = [math.hypot(p[0], p[2]) for p in where]
            check(bool(where) and min(far) > 0.15,
                  f"{name}: {pre}* only on the bench, more than 0.15 m from the frame centre (motors at 0.12 m)"
                  + (f" (nearest {min(far):.2f} m)" if far else " (none found)"))
        check(not any("diamond" in x.lower() for x in names), f"{name}: no 'diamond' antenna part")
        check(not any("ACER" in l for l in lab_up), f"{name}: no 'Acer' label")
        if name in LAYOUT_REQUIRED:
            pre = LAYOUT_REQUIRED[name]
            lay = [(n.get("extras") or {}).get("layout", "") for n, _ in nodes if n.get("name", "").startswith(pre)]
            check(bool(lay) and all("L515" in x for x in lay), f"{name}: payload follows the approved simulated layout L515 ({pre})")
        if name in PLANNED_REQUIRED:
            pre = PLANNED_REQUIRED[name]
            pl = [(n.get("extras") or {}).get("planned") for n, _ in nodes if n.get("name", "").startswith(pre)]
            check(bool(pl) and all(pl), f"{name}: payload drawn as planned ({pre})")
        # motor positions, where motors exist
        bells = {}
        for n, tf in nodes:
            nm = n.get("name", "")
            if nm.endswith("_bell") and nm[:2] in ("M1", "M2", "M3", "M4") and "mesh" in n:
                pts = [to_blender(tf(p)) for p in positions(gj, binb, n["mesh"])]
                bells[nm[:2]] = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
        if bells:
            for m, lay in S.MOTOR_LAYOUT.items():
                if m in bells:
                    x, y = bells[m]
                    check((x > 0) == (lay["sx"] > 0) and (y > 0) == (lay["sy"] > 0),
                          f"{name}: {m} is {lay['pos']} (x {x * 1000:.1f}, y {y * 1000:.1f} mm)")
            if "M1" in bells and "M4" in bells:
                d = math.hypot(bells["M1"][0] - bells["M4"][0], bells["M1"][1] - bells["M4"][1]) * 1000
                check(abs(d - S.FRAME["wheelbase"]) < 1.0, f"{name}: M1-M4 diagonal {d:.1f} mm = wheelbase 240")
        if name.startswith("step-"):
            anims = gj.get("animations", [])
            want = name[:7] + "-main"
            check(len(anims) == 1 and anims[0].get("name") == want, f"{name}: one clip named {want}")
            dur = max((gj["accessors"][s["input"]]["max"][0] for a in anims for s in a["samplers"]), default=0.0)
            acts = (gj["scenes"][0].get("extras") or {}).get("actions") or []
            check(len(acts) >= 3, f"{name}: action list in the model ({len(acts)} actions)")
            for a in acts:
                check(a.get("id") in TRUTH_IDS, f"{name}: action {a.get('id')} exists in STEP-TRUTH.md")
                check(0.0 <= a.get("time", -1) < dur, f"{name}: action {a.get('id')} at {a.get('time')} s is inside the {dur:.1f} s clip")
            times = [a.get("time", 0) for a in acts]
            check(times == sorted(times), f"{name}: actions in time order")
            check(all(a.get("id", "").startswith("S" + name[5:7].lstrip("0") + ".") for a in acts),
                  f"{name}: every action belongs to this step")
            mesh_names = [n.get("name", "") for n, _ in nodes if "mesh" in n]
            for a in acts:
                for pre in a.get("shows", []):
                    check(any(x.startswith(pre) for x in mesh_names), f"{name}: {a['id']} names part '{pre}' and the model has it")
            # the page: the OLD step viewer was removed from every Build step (Shad, 8 Nov 2026: "Remove from all
            # steps"; it showed the pre-A1 solder order). The step models live on in the 3D lessons
            # (docs/walkthrough). Action ids on the page must still match the model's if present.
            step_no = int(name[5:7])
            blk = PAGE_STEPS.get(step_no, "")
            check(f'docs/models/{name}.glb' not in blk, f"{name}: index.html step {step_no} section no longer shows the old 3D viewer")
            page_ids = set(_re.findall(r'data-action-id="(S\d\.[0-9A-Za-z]+)"', blk))
            if page_ids:
                for a in acts:
                    check(a["id"] in page_ids, f"{name}: action {a['id']} is on the page (data-action-id)")
            else:
                print(f"INFO {name}: index.html step {step_no} carries no data-action-id yet (change request 33)")
        for n, _ in nodes:
            ex = n.get("extras") or {}
            if ex.get("kind") == "hotspot" and ex.get("targets"):
                all_mesh = [m.get("name", "") for m, _ in nodes if "mesh" in m]
                for pre in str(ex["targets"]).split(","):
                    pre = pre.strip()
                    if pre:
                        check(any(x.startswith(pre) for x in all_mesh), f"{name}: pin {ex.get('stage')} target '{pre}' exists")
        if sketch:
            draw(name, gj, binb, nodes)
    check(total <= SET_MAX, f"whole set {total / 1024:.0f} KB <= {SET_MAX // 1024} KB")
    print("APPROX sizes (drawn, not sourced):", ", ".join(S.approx_parts()))
    print(("ALL PASS" if not fails else f"{len(fails)} FAILED"))
    return 1 if fails else 0


def draw(name, gj, binb, nodes):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    out_dir = os.environ.get("SKETCH_DIR", ".")
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(16, 8), dpi=90)
    from matplotlib.collections import LineCollection
    for n, tf in nodes:
        if "mesh" not in n:
            continue
        col = "0.65" if (n.get("extras") or {}).get("planned") else "k"
        for prim in gj["meshes"][n["mesh"]]["primitives"]:
            acc = gj["accessors"][prim["attributes"]["POSITION"]]
            bv = gj["bufferViews"][acc["bufferView"]]
            base = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
            pts = [to_blender(tf(struct.unpack_from("<3f", binb, base + k * 12))) for k in range(acc["count"])]
            if "indices" not in prim:
                continue
            ia = gj["accessors"][prim["indices"]]
            ib = gj["bufferViews"][ia["bufferView"]]
            fmt = {5123: "H", 5125: "I", 5121: "B"}[ia["componentType"]]
            ibase = ib.get("byteOffset", 0) + ia.get("byteOffset", 0)
            idx = struct.unpack_from("<%d%s" % (ia["count"], fmt), binb, ibase)
            segs_top, segs_side = [], []
            for t in range(0, len(idx), 3):
                a, b, c = (pts[idx[t]], pts[idx[t + 1]], pts[idx[t + 2]])
                for p, q in ((a, b), (b, c), (c, a)):
                    segs_top.append(((p[0] * 1000, p[1] * 1000), (q[0] * 1000, q[1] * 1000)))
                    segs_side.append(((p[0] * 1000, p[2] * 1000), (q[0] * 1000, q[2] * 1000)))
            a1.add_collection(LineCollection(segs_top, colors=col, linewidths=0.15))
            a2.add_collection(LineCollection(segs_side, colors=col, linewidths=0.15))
    a1.autoscale(); a2.autoscale()
    for n, tf in nodes:
        ex = n.get("extras") or {}
        if ex.get("label"):
            p = to_blender(tf((0, 0, 0)))
            a1.annotate(ex["label"][:28], (p[0] * 1000, p[1] * 1000), fontsize=6, color="C3")
    for a, t in ((a1, "top view (X forward, Y left), mm"), (a2, "side view (X forward, Z up), mm")):
        a.set_aspect("equal"); a.grid(True, lw=0.3); a.set_title(name + " - " + t, fontsize=9)
    fig.savefig(os.path.join(out_dir, name + "-sketch.png"), bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    sys.exit(main())
