"""
lib_kit.py - the bench hardware the later steps need: radio, charger, LiPo bag,
smoke stopper, FPV monitor, laptop, tools, sensors and helpers.

All low-poly, all named, all label-friendly. Sizes are the real ones in metres.
"""

import math

import lib_core as C


def cells_18650(P, loc, count=2, gap=0.021):
    """Pair of 18650 cells standing upright."""
    x, y, z = loc
    objs = []
    for i in range(count):
        ox = (i - (count - 1) / 2.0) * gap
        objs.append(C.cyl(f"cell_18650_{i}", 0.0092, 0.065,
                          (x + ox, y, z + 0.0325), mat=P["plastic_grey"], seg=16))
        objs.append(C.cyl(f"cell_18650_cap_{i}", 0.0045, 0.0025,
                          (x + ox, y, z + 0.0662), mat=P["alu"], seg=12))
    return objs


def radio_pocket(P, loc=(0, 0, 0), rot_z=0.0):
    """RadioMaster Pocket: 145 x 75 x 25 mm body, screen, twin gimbals."""
    x0, y0, z0 = loc
    objs = [
        C.box("radio_body", (0.145, 0.075, 0.025), (x0, y0, z0 + 0.0125),
              rot=(0, 0, rot_z), mat=P["plastic_black"], bevel=0.004, seg=2),
        C.box("radio_face", (0.135, 0.066, 0.004), (x0, y0, z0 + 0.026),
              rot=(0, 0, rot_z), mat=P["rubber"], bevel=0.002),
        C.box("radio_screen", (0.030, 0.022, 0.0012), (x0 - 0.030, y0, z0 + 0.0282),
              mat=P["screen"]),
        C.box("radio_screen_bezel", (0.036, 0.028, 0.0022),
              (x0 - 0.030, y0, z0 + 0.0272), mat=P["plastic_black"]),
    ]
    for i, sx in enumerate((-0.048, 0.048)):
        objs.append(C.cyl(f"radio_gimbal_{i}", 0.0115, 0.004,
                          (x0 + sx, y0, z0 + 0.027), mat=P["plastic_grey"], seg=16))
        objs.append(C.cyl(f"radio_stick_{i}", 0.0022, 0.012,
                          (x0 + sx, y0, z0 + 0.034), mat=P["steel"], seg=8))
    for i, sx in enumerate((-0.014, 0.014)):
        objs.append(C.cyl(f"radio_switch_{i}", 0.0018, 0.009,
                          (x0 + sx, y0 + 0.028, z0 + 0.030),
                          mat=P["alu"], seg=8))
    objs.append(C.box("radio_antenna_nub", (0.014, 0.008, 0.008),
                      (x0 - 0.070, y0 + 0.020, z0 + 0.010),
                      mat=P["plastic_black"]))
    return objs


def charger_m4ac(P, loc=(0, 0, 0)):
    """ToolkitRC M4AC: 30 W AC charger with a readable LiHV 4S screen."""
    x0, y0, z0 = loc
    objs = [
        C.box("charger_body", (0.080, 0.060, 0.030), (x0, y0, z0 + 0.015),
              mat=P["plastic_black"], bevel=0.004, seg=2),
        C.box("charger_screen", (0.034, 0.022, 0.0016), (x0 - 0.010, y0, z0 + 0.0306),
              mat=P["screen"]),
        C.box("charger_screen_bezel", (0.040, 0.028, 0.0022),
              (x0 - 0.010, y0, z0 + 0.0296), mat=P["plastic_grey"]),
        # XT60 output + balance port on the front edge
        C.box("charger_xt60", (0.012, 0.010, 0.010), (x0 + 0.024, y0 - 0.030, z0 + 0.012),
              mat=P["plastic_white"], bevel=0.0006),
        C.box("charger_balance_port", (0.018, 0.008, 0.006),
              (x0 + 0.004, y0 - 0.030, z0 + 0.012), mat=P["plastic_white"]),
        C.cyl("charger_knob", 0.006, 0.006, (x0 + 0.028, y0 + 0.014, z0 + 0.032),
              mat=P["alu"], seg=12),
        C.box("charger_stand", (0.060, 0.040, 0.008), (x0, y0, z0 + 0.004),
              mat=P["plastic_grey"], bevel=0.002),
    ]
    return objs


def lipo_bag(P, loc=(0, 0, 0), open_top=True):
    """Fire-retardant LiPo bag with the flap folded open."""
    x0, y0, z0 = loc
    w, d, h, t = 0.185, 0.130, 0.055, 0.004
    objs = [
        C.box("bag_floor", (w, d, t), (x0, y0, z0 + t / 2), mat=P["bag"]),
        C.box("bag_wall_left", (t, d, h), (x0 - w / 2, y0, z0 + h / 2), mat=P["bag"]),
        C.box("bag_wall_right", (t, d, h), (x0 + w / 2, y0, z0 + h / 2), mat=P["bag"]),
        C.box("bag_wall_back", (w, t, h), (x0, y0 + d / 2, z0 + h / 2), mat=P["bag"]),
    ]
    if open_top:
        # front panel folded down flat so you can see the pack inside
        objs.append(C.box("bag_flap", (w, d * 0.75, t),
                          (x0, y0 - d * 1.05, z0 + t / 2), mat=P["bag"]))
    else:
        objs.append(C.box("bag_wall_front", (w, t, h),
                          (x0, y0 - d / 2, z0 + h / 2), mat=P["bag"]))
    objs.append(C.box("bag_handle", (0.040, 0.006, 0.004),
                      (x0, y0 + d / 2 + 0.006, z0 + h), mat=P["strap"]))
    return objs


def smoke_stopper(P, loc=(0, 0, 0), rot_z=0.0):
    """iFlight smart smoke stopper: inline XT60 module with a status LED."""
    x0, y0, z0 = loc
    objs = [
        C.box("smokestopper_body", (0.034, 0.022, 0.014), (x0, y0, z0),
              rot=(0, 0, rot_z), mat=P["plastic_white"], bevel=0.002),
        C.box("smokestopper_label", (0.020, 0.016, 0.0012), (x0, y0, z0 + 0.0074),
              mat=P["accent"]),
        C.box("smokestopper_xt60_in", (0.011, 0.009, 0.009),
              (x0 - 0.022, y0, z0), rot=(0, 0, rot_z), mat=P["plastic_black"]),
        C.box("smokestopper_xt60_out", (0.011, 0.009, 0.009),
              (x0 + 0.022, y0, z0), rot=(0, 0, rot_z), mat=P["plastic_black"]),
        C.cyl("smokestopper_led", 0.0018, 0.0016, (x0, y0 - 0.008, z0 + 0.0074),
              mat=P["led"], seg=8),
    ]
    return objs


def monitor_skyzone(P, loc=(0, 0, 0), rot_z=0.0):
    """Skyzone M5 5-inch analog diversity monitor with sun hood."""
    x0, y0, z0 = loc
    objs = [
        C.box("monitor_body", (0.135, 0.085, 0.024), (x0, y0, z0 + 0.012),
              rot=(0, 0, rot_z), mat=P["plastic_black"], bevel=0.004, seg=2),
        C.box("monitor_screen", (0.100, 0.062, 0.002), (x0, y0, z0 + 0.0245),
              rot=(0, 0, rot_z), mat=P["screen"]),
        C.box("monitor_hood", (0.100, 0.002, 0.030), (x0 + 0.030, y0, z0 + 0.032),
              rot=(0, math.radians(-35), rot_z), mat=P["plastic_black"]),
        C.box("monitor_stand", (0.070, 0.040, 0.010), (x0, y0, z0 + 0.002),
              mat=P["plastic_grey"], bevel=0.002),
    ]
    for i, sy in enumerate((-0.036, 0.036)):
        objs.append(C.cyl(f"monitor_antenna_{i}", 0.0030, 0.052,
                          (x0 - 0.052, y0 + sy, z0 + 0.050),
                          rot=(math.radians(18) * (1 if sy > 0 else -1), 0, 0),
                          mat=P["plastic_grey"], seg=10))
    return objs


def laptop(P, loc=(0, 0, 0), rot_z=0.0, lid_angle=100.0):
    """
    Acer-style laptop with the lid open.

    The lid is a plate whose *thickness* runs along local X, width along Y and
    height along Z, hinged on the back edge; lid_angle is measured from the
    closed (flat) position, so 90 degrees is upright.
    """
    x0, y0, z0 = loc
    theta = math.radians(lid_angle)
    phi = theta - math.pi / 2.0          # tilt that maps local +Z to the lid plane
    hinge_x = x0 - 0.160
    hinge_z = z0 + 0.014

    objs = [
        C.box("laptop_base", (0.320, 0.220, 0.014), (x0, y0, z0 + 0.007),
              rot=(0, 0, rot_z), mat=P["alu"], bevel=0.003, seg=2),
        C.box("laptop_keyboard", (0.280, 0.170, 0.002),
              (x0 + 0.010, y0, z0 + 0.0145), rot=(0, 0, rot_z),
              mat=P["plastic_black"]),
        C.box("laptop_trackpad", (0.070, 0.045, 0.0012),
              (x0 + 0.100, y0, z0 + 0.0145), rot=(0, 0, rot_z),
              mat=P["plastic_grey"]),
    ]

    lid_cx = hinge_x - math.cos(theta) * 0.100
    lid_cz = hinge_z + math.sin(theta) * 0.100
    objs.append(C.box("laptop_lid", (0.008, 0.320, 0.200),
                      (lid_cx, y0, lid_cz), rot=(0, phi, rot_z),
                      mat=P["alu"], bevel=0.003, seg=2))
    objs.append(C.box("laptop_screen", (0.002, 0.290, 0.170),
                      (lid_cx + math.cos(phi) * 0.004, y0,
                       lid_cz - math.sin(phi) * 0.004),
                      rot=(0, phi, rot_z), mat=P["screen"]))
    return objs


def glasses(P, loc=(0, 0, 0), rot_z=0.0):
    """Safety glasses: two lenses, bridge and arms."""
    x0, y0, z0 = loc
    objs = []
    for i, sy in enumerate((-0.033, 0.033)):
        objs.append(C.box(f"glasses_lens_{i}", (0.055, 0.048, 0.0018),
                          (x0, y0 + sy, z0), rot=(0, 0, rot_z),
                          mat=P["glass"], bevel=0.004))
    objs.append(C.box("glasses_bridge", (0.014, 0.020, 0.0018),
                      (x0, y0, z0), rot=(0, 0, rot_z), mat=P["plastic_grey"]))
    for i, sy in enumerate((-0.070, 0.070)):
        objs.append(C.box(f"glasses_arm_{i}", (0.090, 0.0035, 0.003),
                          (x0 - 0.040, y0 + sy, z0), rot=(0, 0, rot_z),
                          mat=P["plastic_grey"]))
    return objs


def soldering_iron(P, loc=(0, 0, 0), rot_z=0.0):
    """Flywoo 65 W iron resting in its coiled stand."""
    x0, y0, z0 = loc
    return [
        C.box("iron_stand_base", (0.070, 0.055, 0.008), (x0, y0, z0 + 0.004),
              mat=P["steel"], bevel=0.002),
        C.cyl("iron_coil", 0.008, 0.026, (x0, y0, z0 + 0.030),
              mat=P["steel"], seg=12, radius_top=0.005),
        C.cyl("iron_handle", 0.011, 0.100, (x0 + 0.030, y0, z0 + 0.062),
              rot=(math.radians(28), 0, rot_z), mat=P["plastic_black"], seg=14),
        C.cyl("iron_barrel", 0.0045, 0.048, (x0 - 0.004, y0, z0 + 0.035),
              rot=(math.radians(64), 0, rot_z), mat=P["alu"], seg=12),
        C.cyl("iron_tip", 0.0012, 0.016, (x0 - 0.024, y0, z0 + 0.013),
              rot=(math.radians(64), 0, rot_z), mat=P["copper"], seg=8),
    ]


def multimeter(P, loc=(0, 0, 0), rot_z=0.0):
    x0, y0, z0 = loc
    return [
        C.box("meter_body", (0.075, 0.100, 0.022), (x0, y0, z0 + 0.011),
              rot=(0, 0, rot_z), mat=P["plastic_grey"], bevel=0.004, seg=2),
        C.box("meter_screen", (0.052, 0.028, 0.0016),
              (x0, y0 + 0.024, z0 + 0.0232), rot=(0, 0, rot_z),
              mat=P["screen"]),
        C.cyl("meter_knob", 0.011, 0.007, (x0, y0 - 0.014, z0 + 0.024),
              rot=(0, 0, rot_z), mat=P["plastic_black"], seg=14),
    ]


def toolkit_roll(P, loc=(0, 0, 0)):
    """Rolled tool pouch that ships with the Flywoo kit."""
    x0, y0, z0 = loc
    return [
        C.box("toolkit_roll", (0.140, 0.090, 0.030), (x0, y0, z0 + 0.015),
              mat=P["strap"], bevel=0.006, seg=2),
        C.box("toolkit_strap", (0.018, 0.092, 0.032), (x0, y0, z0 + 0.015),
              mat=P["plastic_black"]),
        C.cyl("toolkit_driver", 0.004, 0.110, (x0 + 0.010, y0, z0 + 0.030),
              rot=(0, math.radians(90), 0), mat=P["plastic_grey"], seg=10),
    ]


def sd_reader(P, loc=(0, 0, 0)):
    x0, y0, z0 = loc
    return [
        C.box("sd_reader_body", (0.030, 0.018, 0.008), (x0, y0, z0),
              mat=P["plastic_black"], bevel=0.001),
        C.box("sd_reader_plug", (0.012, 0.008, 0.003), (x0 - 0.020, y0, z0),
              mat=P["alu"]),
    ]


# ----------------------------------------------------------------------------
# diagram aids
# ----------------------------------------------------------------------------
def arrow(P, name, start, end, color=None, shaft_r=0.0014, head=0.008):
    """3D arrow for orientation markers (thermal lens down / GPS up)."""
    from mathutils import Vector

    mat = color or P["accent"]
    sx, sy, sz = start
    ex, ey, ez = end
    direction = Vector((ex - sx, ey - sy, ez - sz))
    length = direction.length
    if length < 1e-6:
        return []
    direction.normalize()

    tip = Vector((ex, ey, ez))
    head_len = min(head * 1.5, length * 0.5)
    shaft_end = tip - direction * head_len
    objs = [C.tube(f"{name}_shaft", [start, tuple(shaft_end)],
                   shaft_r, mat, res=6)]
    cone = C.cyl(f"{name}_head", head * 0.55, head_len,
                 tuple(tip - direction * (head_len / 2)), mat=mat, seg=10,
                 radius_top=0.0002)
    cone.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    objs.append(cone)
    return objs


def cg_marker(P, loc, radius=0.016):
    """Centre-of-gravity marker: orange ball inside a flat crosshair ring."""
    x, y, z = loc
    return [
        C.cyl("cg_ball", radius * 0.40, 0.0035, (x, y, z), mat=P["accent"], seg=12),
        C.box("cg_cross_x", (radius * 2, 0.0012, 0.0009), (x, y, z), mat=P["accent"]),
        C.box("cg_cross_y", (0.0012, radius * 2, 0.0009), (x, y, z), mat=P["accent"]),
        C.ring("cg_ring", radius, 0.0013, 0.0008, (x, y, z), mat=P["accent"], seg=36),
    ]


def jumper(P, name, points, colors):
    """
    Four-conductor pigtail, coloured per the guide:
    red 3.3V, black GND, blue SDA, yellow SCL.
    """
    objs = []
    for i, key in enumerate(colors):
        offset = (i - (len(colors) - 1) / 2.0) * 0.0012
        path = [(p[0], p[1] + offset, p[2] + abs(offset) * 0.35) for p in points]
        objs.append(C.tube(f"{name}_{key}", path, 0.00085, P[key], res=6))
    return objs


def qwiic_plug(P, name, loc, color_key="plastic_white"):
    x, y, z = loc
    return [C.box(f"{name}_plug", (0.0055, 0.0045, 0.0040), (x, y, z),
                  mat=P[color_key], bevel=0.0004)]
