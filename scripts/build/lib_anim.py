"""
lib_anim.py - one short looping clip per step model, plus the action list the viewer turns into chips.

Rules (handoff Phase C):
  * one glTF animation per model, named step-0N-main (the scene name);
  * the still pose (no WebGL animation, reduced motion) is the END of the clip: everything assembled;
  * parts appear by scaling up from almost nothing about their own centre, or slide in from an offset;
  * scene extras "actions" = [{id, time, text, short, focus?, dist?}] with ids from STEP-TRUTH.md.
Times are in seconds.
"""

import bpy
from mathutils import Matrix, Vector

FPS = 24
TINY = 0.001


def f(t):
    return int(round(t * FPS))


def origin_to_centre(ob):
    """Move a mesh's origin to the centre of its own geometry, so scaling grows it in place."""
    if ob.type != "MESH" or not ob.data.vertices:
        return
    lo = Vector((min(v.co.x for v in ob.data.vertices), min(v.co.y for v in ob.data.vertices), min(v.co.z for v in ob.data.vertices)))
    hi = Vector((max(v.co.x for v in ob.data.vertices), max(v.co.y for v in ob.data.vertices), max(v.co.z for v in ob.data.vertices)))
    c = (lo + hi) / 2.0
    if c.length < 1e-9:
        return
    ob.data.transform(Matrix.Translation(-c))
    ob.data.update()
    ob.location = ob.matrix_world @ c


def _key(ob, path, t, value):
    setattr(ob, path, value)
    ob.keyframe_insert(path, frame=f(t))


def appear(objs, t0, t1):
    """Hidden until t0, grown to full size by t1."""
    for ob in objs:
        if ob.type == "MESH":
            origin_to_centre(ob)
        full = tuple(ob.scale)
        _key(ob, "scale", 0.0, (TINY, TINY, TINY))
        _key(ob, "scale", t0, (TINY, TINY, TINY))
        _key(ob, "scale", t1, full)


def slide(objs, offset, t0, t1, hidden_before=True):
    """Arrive from loc+offset between t0 and t1 (hidden before t0 if asked)."""
    dx, dy, dz = offset
    for ob in objs:
        end = tuple(ob.location)
        start = (end[0] + dx, end[1] + dy, end[2] + dz)
        _key(ob, "location", 0.0, start)
        _key(ob, "location", t0, start)
        _key(ob, "location", t1, end)
        if hidden_before:
            full = tuple(ob.scale)
            _key(ob, "scale", 0.0, (TINY, TINY, TINY))
            _key(ob, "scale", max(t0 - 0.05, 0.0), (TINY, TINY, TINY))
            _key(ob, "scale", t0, full)


def spin(objs, direction, t0, t1, turns=3.0):
    """Turn about the object's own Z: direction 'CW' or 'CCW' seen from above (Z up)."""
    import math
    sign = -1.0 if direction == "CW" else 1.0
    for ob in objs:
        r0 = ob.rotation_euler.z
        _key(ob, "rotation_euler", 0.0, (ob.rotation_euler.x, ob.rotation_euler.y, r0))
        _key(ob, "rotation_euler", t0, (ob.rotation_euler.x, ob.rotation_euler.y, r0))
        _key(ob, "rotation_euler", t1, (ob.rotation_euler.x, ob.rotation_euler.y, r0 + sign * turns * 2 * math.pi))
        if ob.animation_data and ob.animation_data.action:
            _linear(ob)


def _linear(ob, only_rotation=True):
    act = ob.animation_data.action
    curves = []
    if hasattr(act, "fcurves"):
        curves = list(act.fcurves)
    else:   # layered actions (Blender 4.4+)
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    curves += list(bag.fcurves)
    for fc in curves:
        if fc.data_path == "rotation_euler" or not only_rotation:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


def finish(clip_name, duration, actions):
    """Name the clip, set the frame range, store the action list, leave the scene at the END pose."""
    sc = bpy.context.scene
    # straight-line keys export as-is (no per-frame sampling), which keeps the GLB small
    for ob in sc.objects:
        if ob.animation_data and ob.animation_data.action:
            _linear(ob, only_rotation=False)
    sc.name = clip_name
    sc.render.fps = FPS
    sc.frame_start = 0
    sc.frame_end = f(duration)
    sc["actions"] = [dict(a) for a in actions]
    sc.frame_set(f(duration))


def named(*prefixes, exclude=()):
    """Scene objects whose names start with any prefix (meshes only, labels and pins are never animated)."""
    return [o for o in bpy.context.scene.objects
            if o.type == "MESH" and o.name.startswith(prefixes) and not o.name.startswith(tuple(exclude) or ("\0",))]
