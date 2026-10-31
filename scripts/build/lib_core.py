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
OUT_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "docs", "models"))
PREVIEW_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "docs", "renders"))


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
        "battery_label": material("BatteryLabel", (0.78, 0.79, 0.80, 1), 0.0, 0.44),
        "strap": material("KevlarStrap", (0.16, 0.14, 0.11, 1), 0.0, 0.72),
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
    }


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


def tube(name, points, radius, mat, res=8, smooth=True):
    """Sweep a circle along a polyline - used for every wire and cable."""
    pts = [Vector(p) for p in points]
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
    return _link(name, verts, faces, mat, smooth=smooth)


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


def hotspot(stage, title, detail, loc):
    """Clickable step-8 test-stage marker."""
    ob = bpy.data.objects.new("HS_" + stage, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.empty_display_size = 0.006
    ob["label"] = title
    ob["detail"] = detail
    ob["stage"] = stage
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
    for ob in objs:
        ob.location.x += dx
        ob.location.y += dy
        ob.location.z += dz
    return objs


# ----------------------------------------------------------------------------
# export + preview
# ----------------------------------------------------------------------------
def export(name, preview=False, camera_at=(0.30, -0.32, 0.22),
           target=(0, 0, 0.012), ortho_scale=None, res=760, samples=64):
    """Write docs/models/<name>.glb and optionally a preview PNG."""
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name + ".glb")

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
        export_animations=False,
    )
    print(f"EXPORTED {path} ({os.path.getsize(path) / 1024.0:.1f} KB)")

    if preview:
        _render_preview(name, camera_at, target, ortho_scale, res, samples)
    return path


def _render_preview(name, camera_at, target, ortho_scale, res, samples, ground_z=-0.0006):
    scene = bpy.context.scene
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    cam_data = bpy.data.cameras.new("PreviewCam")
    if ortho_scale:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = ortho_scale
    else:
        cam_data.lens = 52
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = camera_at
    look_at(cam, Vector(target))
    scene.camera = cam

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
    scene.cycles.device = "CPU"
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
