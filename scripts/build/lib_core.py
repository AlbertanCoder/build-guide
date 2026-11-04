"""
lib_core.py - shared Blender helpers for the Shad build-guide 3D models.

Design rules (agreed in the 25-question spec):
  * Low-poly proxies, correct proportions, key features only (<15k tris/model).
  * Hybrid materials: plausibly physical (matte carbon, black PCB, silicone
    wire) on the guide's cream backdrop with green/orange accents.
  * Labels are Empty objects named LBL_* carrying a "label" custom property, so
    the web viewer builds crisp HTML labels from the GLB itself - no drift
    between model and manifest.
  * Models are built in metres, Z-up, +X forward. glTF export converts to Y-up.

Meshes are built from explicit vertex data rather than bpy.ops/bmesh
primitives, which keeps behaviour stable across Blender versions.
"""

import math
import os

import bpy
from mathutils import Vector

# Guide palette ---------------------------------------------------------------
CREAM = (0.969, 0.949, 0.910, 1.0)   # #f7f2e8 page backdrop
PINE = (0.106, 0.369, 0.310, 1.0)    # #1b5e4f primary green
ACCENT = (0.761, 0.341, 0.106, 1.0)  # #c2571b warning / marker orange

_HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get("GA_MODEL_OUT") or os.path.normpath(os.path.join(_HERE, "..", "..", "docs", "models"))
PREVIEW_DIR = os.environ.get("GA_MODEL_OUT") or os.path.normpath(os.path.join(_HERE, "..", "..", "docs", "renders"))


def reset():
    """Start from a guaranteed-empty scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "MILLIMETERS"
    return scene


_MAT_CACHE = {}


def material(name, color, metallic=0.0, roughness=0.5, alpha=1.0,
             emission=None, emission_strength=0.0):
    """Principled PBR material, cached by name so GLB export reuses it."""
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness

    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha

    if emission is not None:
        for key in ("Emission Color", "Emission"):  # 4.x renamed this socket
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = emission
                break
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength

    if alpha < 1.0:
        # Set every alpha-mode knob that exists so the exporter emits BLEND
        # regardless of which Blender version built the model.
        for key, value in (("blend_method", "BLEND"),
                           ("surface_render_method", "BLENDED"),
                           ("shadow_method", "NONE"),
                           ("use_transparency_overlap", True)):
            if hasattr(mat, key):
                try:
                    setattr(mat, key, value)
                except (TypeError, AttributeError):
                    pass

    _MAT_CACHE[name] = mat
    return mat



def palette():
    """The full material set: hybrid PBR, guide palette for accents."""
    return {
        # structure
        "carbon": material("Carbon", (0.055, 0.058, 0.062, 1), 0.15, 0.52),
        "carbon_edge": material("CarbonEdge", (0.035, 0.037, 0.040, 1), 0.10, 0.62),
        "alu": material("Aluminium", (0.72, 0.74, 0.76, 1), 1.0, 0.28),
        "steel": material("Steel", (0.55, 0.57, 0.60, 1), 1.0, 0.34),
        "brass": material("Brass", (0.80, 0.62, 0.28, 1), 1.0, 0.30),
        # electronics
        "pcb_black": material("PCBBlack", (0.055, 0.058, 0.070, 1), 0.0, 0.44),
        "pcb_green": material("PCBPiGreen", (0.035, 0.180, 0.110, 1), 0.0, 0.46),
        "pcb_red": material("PCBRed", (0.340, 0.045, 0.045, 1), 0.0, 0.44),
        "pcb_blue": material("PCBBlue", (0.045, 0.115, 0.290, 1), 0.0, 0.44),
        "plastic_black": material("PlasticBlack", (0.045, 0.048, 0.052, 1), 0.0, 0.40),
        "plastic_white": material("PlasticWhite", (0.86, 0.87, 0.86, 1), 0.0, 0.42),
        "plastic_grey": material("PlasticGrey", (0.30, 0.31, 0.33, 1), 0.0, 0.46),
        "gold": material("GoldPad", (0.85, 0.66, 0.30, 1), 1.0, 0.24),
        "copper": material("Copper", (0.72, 0.36, 0.20, 1), 1.0, 0.30),
        "motor_bell": material("MotorBell", (0.095, 0.100, 0.112, 1), 0.55, 0.42),
        "magnet": material("Magnet", (0.16, 0.08, 0.06, 1), 0.45, 0.55),
        # silicone wire - guide colours: red 3.3V, black GND, blue SDA, yellow SCL
        "wire_red": material("WireRed", (0.480, 0.045, 0.045, 1), 0.0, 0.42),
        "wire_black": material("WireBlack", (0.045, 0.045, 0.050, 1), 0.0, 0.42),
        "wire_blue": material("WireBlue", (0.045, 0.150, 0.420, 1), 0.0, 0.42),
        "wire_yellow": material("WireYellow", (0.720, 0.560, 0.045, 1), 0.0, 0.42),
        "wire_white": material("WireWhite", (0.80, 0.81, 0.80, 1), 0.0, 0.42),
        "silicone_black": material("SiliconeBlack", (0.055, 0.055, 0.060, 1), 0.0, 0.52),
        # battery / soft goods
        "battery": material("BatteryWrap", (0.055, 0.095, 0.240, 1), 0.0, 0.36),
        "battery_liion": material("BatteryWrapLiion", (0.090, 0.090, 0.095, 1), 0.0, 0.40),   # wrap colour drawn (not from a photo)
        "battery_label": material("BatteryLabel", (0.78, 0.79, 0.80, 1), 0.0, 0.44),
        "strap": material("KevlarStrapVisible", (0.96, 0.80, 0.08, 1), 0.0, 0.60),   # colour shown for visibility
        "bag": material("LiPoBag", (0.44, 0.20, 0.14, 1), 0.0, 0.78),
        "rubber": material("Rubber", (0.070, 0.072, 0.075, 1), 0.0, 0.75),
        # glazing / display
        "glass": material("DisplayGlass", (0.020, 0.024, 0.030, 1), 0.3, 0.08),
        "screen": material("ScreenGlow", (0.30, 0.85, 0.62, 1), 0.0, 0.20,
                           emission=(0.32, 0.92, 0.66, 1), emission_strength=2.4),
        "led": material("LedStrip", (0.95, 0.55, 0.16, 1), 0.0, 0.30,
                        emission=(1.0, 0.58, 0.16, 1), emission_strength=3.2),
        # props / markers
        "prop": material("PropPoly", (0.085, 0.090, 0.105, 1), 0.0, 0.44),
        "prop_ghost": material("PropGhost", (0.32, 0.50, 0.62, 1), 0.0, 0.28, alpha=0.34),
        "accent": material("AccentOrange", ACCENT, 0.0, 0.42),
        "pine": material("PineGreen", PINE, 0.0, 0.44),
        "paper": material("PaperCream", CREAM, 0.0, 0.80),
        # bright colours for small accessories so they read against black carbon (tap-to-name says so)
        "vis_cyan": material("VisCyan", (0.00, 0.72, 0.83, 1), 0.0, 0.45),
        "vis_magenta": material("VisMagenta", (0.85, 0.12, 0.62, 1), 0.0, 0.50),
        # camera view cones (hidden until a camera-view button turns one on)
        "cone_pilot": material("ConePilot", (0.20, 0.62, 0.45, 1), 0.0, 0.5, alpha=0.20),
        "cone_thermal": material("ConeThermal", (1.00, 0.42, 0.10, 1), 0.0, 0.5, alpha=0.22),
        # greyed, see-through: a position or part that is NOT confirmed yet (truth table CANNOT VERIFY)
        "planned": material("PlannedGrey", (0.55, 0.57, 0.58, 1), 0.0, 0.6, alpha=0.42),
    }


def cone(name, apex, direction, hfov_deg, vfov_deg, length, mat, up=(0, 0, 1)):
    """Translucent view pyramid from a camera lens: apex at the lens, opening along `direction` (build axes)."""
    d = Vector(direction).normalized()
    u = Vector(up)
    if abs(d.dot(u)) > 0.98:
        u = Vector((1, 0, 0))
    side = d.cross(u).normalized()
    upv = side.cross(d).normalized()
    hw = length * math.tan(math.radians(hfov_deg) / 2.0)
    hh = length * math.tan(math.radians(vfov_deg) / 2.0)
    c = d * length
    verts = [(0, 0, 0)] + [tuple(c + side * sx * hw + upv * sy * hh) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    faces = [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1), (4, 3, 2, 1)]
    ob = _link(name, verts, faces, mat, loc=apex)
    return ob


def tag_parts():
    """Give every mesh its plain name and accuracy tag (parts.PART_INFO) for tap-to-name."""
    import parts as S
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH":
            continue
        info = S.part_info(ob.name)
        if info:
            ob["part"], ob["acc"] = info[0], info[1]
            if info[2]:
                ob["vis_colour"] = True


def mark_planned(objs, why):
    """Tag meshes as 'planned, not confirmed' so the viewer and the checks can tell them apart."""
    for ob in objs:
        ob["planned"] = True
        ob["why"] = why
    return objs


def extrude(name, outline_mm, thickness_mm, z0_mm=0.0, mat=None, loc=(0, 0, 0), rot_z=0.0):
    """Extrude a 2-D outline (list of (x, y) in mm) upward from z0. Concave outlines are fine."""
    pts = [(x / 1000.0, y / 1000.0) for x, y in outline_mm]
    if len(pts) > 2 and pts[0] == pts[-1]:
        pts = pts[:-1]
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
               for i in range(len(pts)))
    if area < 0:
        pts = pts[::-1]
    n = len(pts)
    z0, z1 = z0_mm / 1000.0, (z0_mm + thickness_mm) / 1000.0
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return _link(name, verts, faces, mat, loc, (0, 0, rot_z))


# ----------------------------------------------------------------------------
# explicit mesh construction
# ----------------------------------------------------------------------------
def _link(name, verts, faces, mat, loc=(0, 0, 0), rot=(0, 0, 0), smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(verbose=False)
    me.update()
    if smooth:
        for poly in me.polygons:
            poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    if mat is not None:
        ob.data.materials.append(mat)
    return ob


def box(name, size, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.0, seg=1):
    """Box with full dimensions (x, y, z)."""
    sx, sy, sz = (v / 2.0 for v in size)
    verts = [
        (-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
        (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz),
    ]
    faces = [
        (3, 2, 1, 0), (4, 5, 6, 7),
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
    ]
    ob = _link(name, verts, faces, mat, loc, rot)
    if bevel > 0.0:
        _bevel(ob, bevel, seg)
    return ob


def cyl(name, radius, height, loc=(0, 0, 0), rot=(0, 0, 0), mat=None,
        seg=24, radius_top=None, bevel=0.0, smooth=True, cap=True):
    """Cylinder or cone along local Z."""
    rt = radius if radius_top is None else radius_top
    hz = height / 2.0
    verts, faces = [], []
    for i in range(seg):
        a = 2.0 * math.pi * i / seg
        verts.append((radius * math.cos(a), radius * math.sin(a), -hz))
    for i in range(seg):
        a = 2.0 * math.pi * i / seg
        verts.append((rt * math.cos(a), rt * math.sin(a), hz))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
    if cap:
        faces.append(tuple(range(seg - 1, -1, -1)))
        faces.append(tuple(range(seg, 2 * seg)))
    ob = _link(name, verts, faces, mat, loc, rot, smooth=smooth)
    if bevel > 0.0:
        _bevel(ob, bevel, 1)
    return ob


def plate(name, width, depth, thickness, loc=(0, 0, 0), rot=(0, 0, 0),
          mat=None, corner=0.0):
    """Rectangular plate (optionally rounded corners) lying in local XY."""
    hw, hd = width / 2.0, depth / 2.0
    hz = thickness / 2.0
    c = min(corner, hw * 0.9, hd * 0.9)
    if c <= 0.0:
        outline = [(-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd)]
    else:
        outline, steps = [], 3
        for cx, cy, a0 in ((hw - c, -hd + c, -90), (hw - c, hd - c, 0),
                           (-hw + c, hd - c, 90), (-hw + c, -hd + c, 180)):
            for s in range(steps + 1):
                a = math.radians(a0 + 90.0 * s / steps)
                outline.append((cx + c * math.cos(a), cy + c * math.sin(a)))
    n = len(outline)
    verts = [(x, y, -hz) for x, y in outline] + [(x, y, hz) for x, y in outline]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return _link(name, verts, faces, mat, loc, rot)


def ring(name, radius, thickness, height, loc=(0, 0, 0), rot=(0, 0, 0),
         mat=None, seg=32):
    """Annulus - used for prop-clearance circles and washers."""
    verts, faces = [], []
    for i in range(seg):
        a = 2.0 * math.pi * i / seg
        for r in (radius - thickness / 2.0, radius + thickness / 2.0):
            for z in (-height / 2.0, height / 2.0):
                verts.append((r * math.cos(a), r * math.sin(a), z))
    for i in range(seg):
        j = (i + 1) % seg
        a, b = i * 8, j * 8
        faces.append((a + 0, a + 1, b + 1, b + 0))
        faces.append((a + 2, a + 3, b + 3, b + 2))
        faces.append((a + 1, a + 3, b + 3, b + 1))
        faces.append((a + 0, a + 2, b + 2, b + 0))
    return _link(name, verts, faces, mat, loc, rot)


def _smooth_path(pts, per=2):
    """Catmull-Rom through the given points (ends kept), so a wire bends in a curve instead of a sharp kink."""
    if len(pts) < 3:
        return pts
    P = [pts[0] + (pts[0] - pts[1]) * 0.0] + pts + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(per):
            t = k / per
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


def tube(name, points, radius, mat, res=8, smooth=True, curve=True, solder=""):
    """Sweep a circle along a path - used for every wire and cable. curve=True bends it smoothly through the points.
    solder="a" / "b" / "ab": a solder fillet (a small shiny cone on the pad) at the first / last / both ends, made a
    child of the wire (named <wire>_solder_a / _b) so it moves with every animation of the wire."""
    pts = [Vector(p) for p in points]
    if curve:
        pts = _smooth_path(pts)
    seg = res
    verts, faces = [], []
    for i, p in enumerate(pts):
        if i == 0:
            direction = pts[1] - pts[0]
        elif i == len(pts) - 1:
            direction = pts[-1] - pts[-2]
        else:
            direction = pts[i + 1] - pts[i - 1]
        if direction.length < 1e-9:
            direction = Vector((0, 0, 1))
        direction.normalize()
        up = Vector((0, 0, 1))
        if abs(direction.dot(up)) > 0.95:
            up = Vector((0, 1, 0))
        side = direction.cross(up).normalized()
        up2 = side.cross(direction).normalized()
        for s in range(seg):
            a = 2.0 * math.pi * s / seg
            verts.append(tuple(p + side * (math.cos(a) * radius)
                               + up2 * (math.sin(a) * radius)))
    for i in range(len(pts) - 1):
        for s in range(seg):
            s2 = (s + 1) % seg
            a, b = i * seg, (i + 1) * seg
            faces.append((a + s, a + s2, b + s2, b + s))
    faces.append(tuple(range(seg - 1, -1, -1)))
    last = (len(pts) - 1) * seg
    faces.append(tuple(range(last, last + seg)))
    ob = _link(name, verts, faces, mat, smooth=smooth)
    for end in solder:
        solder_joint(f"{name}_solder_{end}", tuple(pts[0] if end == "a" else pts[-1]), radius, parent=ob)
    return ob


def solder_joint(name, loc, wire_r, parent=None, seg=10):
    """A solder fillet where a wire meets a pad: a low shiny cone around the wire end, its base on the pad.
    Size is drawn (ASSUMPTION: base about 2.2 x the wire radius, 1 mm tall), not measured."""
    base_r, top_r, h = max(2.2 * wire_r, 0.0011), 1.15 * wire_r, 0.0010
    x, y, z = loc
    ob = cyl(name, base_r, h, (x, y, z - 0.0002 + h / 2.0), mat=material("Solder", (0.78, 0.79, 0.80, 1), 0.9, 0.22),
             seg=seg, radius_top=top_r)
    if parent is not None:
        ob.parent = parent
        ob.matrix_parent_inverse = parent.matrix_basis.inverted()
    return ob


def screw(name, radius, length, loc, head="top", mat=None, rot=(0, 0, 0), seg=8, head_r=None, head_h=None):
    """An M-size socket cap screw: the shaft (named name, as before) with a round head and a hex key recess, the head
    a child of the shaft (<name>_screw_head, <name>_hex) so it moves with every animation of the screw.
    M3 head 5.5 mm across and 3 mm tall (ISO 4762 nominal for M3, ASSUMPTION for these screws); hex 2.5 mm."""
    head_r = head_r or radius * 1.83
    head_h = head_h or radius * 2.0
    shaft = cyl(name, radius, length, loc, rot=rot, mat=mat, seg=seg)
    x, y, z = loc
    sgn = 1 if head == "top" else -1
    hz = z + sgn * (length / 2.0 + head_h / 2.0)
    h = cyl(f"{name}_screw_head", head_r, head_h, (x, y, hz), mat=mat, seg=16, bevel=head_h * 0.12)
    hx = cyl(f"{name}_hex", radius * 0.96, head_h * 0.55, (x, y, hz + sgn * head_h * 0.25), mat=material("HexRecess", (0.04, 0.04, 0.045, 1), 0.6, 0.6),
             seg=6, smooth=False)
    for ob in (h, hx):
        ob.parent = shaft
        ob.matrix_parent_inverse = shaft.matrix_basis.inverted()
    return shaft


def _bevel(ob, width, segments=1):
    mod = ob.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(50)
    _apply_modifiers(ob)


def _apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            ob.modifiers.remove(mod)


def group(name, loc=(0, 0, 0), rot=(0, 0, 0)):
    """Empty used as a tidy node root in the exported GLB."""
    ob = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    ob.empty_display_size = 0.01
    return ob


def label(text, loc, detail=None, kind="part"):
    """
    Anchor for a crisp HTML label in the web viewer.

    Exported as a glTF node whose extras carry the text, so the viewer needs no
    separate manifest.
    """
    ob = bpy.data.objects.new("LBL_" + slug(text), None)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.empty_display_size = 0.004
    ob["label"] = text
    ob["kind"] = kind
    if detail:
        ob["detail"] = detail
    return ob


def hotspot(stage, title, detail, loc, targets=""):
    """
    Clickable step-8 test-stage marker.

    `targets` is a comma-separated list of mesh-name prefixes the viewer tints
    when the pin is activated, so the hotspot can point at the subsystem the
    stage actually tests.
    """
    ob = bpy.data.objects.new("HS_" + stage, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.empty_display_size = 0.006
    ob["label"] = title
    ob["detail"] = detail
    ob["stage"] = stage
    ob["targets"] = targets
    ob["kind"] = "hotspot"
    return ob


def slug(text):
    out = []
    for ch in text.lower():
        if ch.isalnum():
            out.append(ch)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).strip("-")


def collect(fn, *args, **kwargs):
    """
    Call a part builder and return (result, every object it created).

    Needed because builders also create label/hotspot empties that are not in
    their return list; shifting a sub-assembly must move those too.
    """
    before = set(bpy.context.scene.objects)
    result = fn(*args, **kwargs)
    created = [ob for ob in bpy.context.scene.objects if ob not in before]
    return result, created


def shift(objs, dx=0.0, dy=0.0, dz=0.0):
    moving = set(objs)
    for ob in objs:
        if ob.parent in moving:      # children ride along with their parent; moving them too would double it
            continue
        ob.location.x += dx
        ob.location.y += dy
        ob.location.z += dz
    return objs


# ----------------------------------------------------------------------------
# export + preview
# ----------------------------------------------------------------------------
def export(name, preview=False, camera_at=(0.30, -0.32, 0.22),
           target=(0, 0, 0.012), ortho_scale=None, res=None, samples=None, animate=False):
    """Write docs/models/<name>.glb and optionally a preview PNG.

    Preview resolution/samples can be raised for gallery renders via the
    PREVIEW_RES and PREVIEW_SAMPLES environment variables.
    """
    res = res or int(os.environ.get("PREVIEW_RES", "700"))
    samples = samples or int(os.environ.get("PREVIEW_SAMPLES", "36"))
    """Write docs/models/<name>.glb and optionally a preview PNG."""
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name + ".glb")

    tag_parts()
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_extras=True,       # carries LBL_/HS_ extras into the viewer
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_animations=animate,
        # one clip for the whole scene, named after the scene; still pose = the current (end) frame
        **({"export_animation_mode": "SCENE", "export_anim_scene_split_object": False,
            "export_current_frame": True, "export_frame_range": True,
            "export_force_sampling": True, "export_frame_step": 3} if animate else {}),
    )
    import glb_pack                                   # normals to 8 bits (KHR_mesh_quantization), compact JSON
    before, after = glb_pack.pack(path)
    print(f"EXPORTED {path} ({after / 1024.0:.1f} KB; {before / 1024.0:.1f} KB before packing)")

    if preview:
        _render_preview(name, camera_at, target, ortho_scale, res, samples)
    return path


def _render_preview(name, camera_at, target, ortho_scale, res, samples, ground_z=None):
    scene = bpy.context.scene
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    # Auto-frame: keep the requested viewing direction, but compute the
    # distance from the actual scene bounds so nothing is cropped or tiny.
    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    for ob in scene.objects:
        if ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            world = ob.matrix_world @ Vector(corner)
            for i in range(3):
                lo[i] = min(lo[i], world[i])
                hi[i] = max(hi[i], world[i])
    if lo[0] > hi[0]:
        lo, hi = [-0.1, -0.1, 0.0], [0.1, 0.1, 0.1]
    centre = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
    radius = 0.5 * Vector((hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])).length
    if ground_z is None:
        ground_z = lo[2] - 0.0008

    cam_data = bpy.data.cameras.new("PreviewCam")
    if ortho_scale:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = max(ortho_scale, radius * 2.4)
    else:
        cam_data.lens = 48
    direction = (Vector(camera_at) - Vector(target))
    if direction.length < 1e-6:
        direction = Vector((0.6, -0.7, 0.5))
    direction.normalize()
    half_fov = math.atan(18.0 / cam_data.lens)      # 36 mm sensor, half-width
    dist = radius / math.sin(half_fov) * 1.06
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = centre + direction * dist
    look_at(cam, centre)
    scene.camera = cam
    target = tuple(centre)

    key = bpy.data.lights.new("Key", type="AREA")
    key.energy = 5.0
    key.size = 0.6
    ko = bpy.data.objects.new("Key", key)
    scene.collection.objects.link(ko)
    ko.location = (0.36, -0.32, 0.50)
    look_at(ko, Vector(target))

    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 1.5
    fill.size = 0.8
    fo = bpy.data.objects.new("Fill", fill)
    scene.collection.objects.link(fo)
    fo.location = (-0.42, -0.18, 0.28)
    look_at(fo, Vector(target))

    rim = bpy.data.lights.new("Rim", type="AREA")
    rim.energy = 2.5
    rim.size = 0.5
    ro = bpy.data.objects.new("Rim", rim)
    scene.collection.objects.link(ro)
    ro.location = (-0.20, 0.42, 0.30)
    look_at(ro, Vector(target))

    world = bpy.data.worlds.new("PreviewWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = CREAM
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.22
    scene.world = world

    ground = plate("PreviewGround", 4.0, 4.0, 0.004, (0, 0, ground_z),
                   mat=material("PreviewGroundMat", (0.86, 0.83, 0.78, 1.0),
                                0.0, 0.88))

    # Standard transform keeps the guide's cream/green/orange palette honest;
    # AgX would desaturate the accents into greys.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = -0.45

    scene.render.engine = "CYCLES"
    scene.cycles.device = os.environ.get("PREVIEW_DEVICE", "CPU")
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = res
    scene.render.resolution_y = res
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(PREVIEW_DIR, name + ".png")
    bpy.ops.render.render(write_still=True)
    print(f"PREVIEW {scene.render.filepath}")

    for ob in (cam, ko, fo, ro, ground):
        bpy.data.objects.remove(ob, do_unlink=True)


def look_at(ob, target):
    direction = Vector(target) - Vector(ob.location)
    ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def summary():
    tris = 0
    meshes = 0
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH":
            meshes += 1
            ob.data.calc_loop_triangles()
            tris += len(ob.data.loop_triangles)
    print(f"SCENE: {meshes} meshes / {tris} triangles")
    return tris
