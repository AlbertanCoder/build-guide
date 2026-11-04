"""
lib_quad.py - the 5-inch quad, built from parts.py sizes and TBS's own frame outlines.

Axes: metres, +X forward, +Y left, Z up. Origin = stack centre on the bottom of the bottom plate.
Frame stack-up (derived from the TBS drawing hole matches, see extract_so1v6.py):
    0  - 2   bottom plate (press nuts)
    2  - 8   four 6 mm arms + arm spacer
    8  - 10  middle plate (stack sits here)
    10 - 32  22 mm standoffs middle->top (front); 30 mm standoffs bottom->top (rear)
    32 - 34  top plate (battery)
Motor numbering and spin follow Betaflight Quad X, props in (R28): M1 rear right CW, M2 front right CCW,
M3 rear left CCW, M4 front left CW.

Public names are kept stable: build_from_plan.py (the assistant's "Show in 3D") calls them.
"""

import math

import lib_core as C
import parts as S

mm = S.mm
F = S.FRAME
O = S.FRAME_OUTLINES["parts"]

PLATE_T = mm(F["plate_t"])
ARM_T = mm(F["arm_t"])
Z_ARM = PLATE_T + ARM_T / 2.0                     # arm centre
Z_MID = PLATE_T + ARM_T                           # middle plate bottom (8 mm)
Z_MID_TOP = Z_MID + PLATE_T                       # 10 mm: the stack sits here
Z_TOP = Z_MID_TOP + mm(F["standoff_short"])       # 32 mm: top plate bottom
Z_TOP_TOP = Z_TOP + PLATE_T                       # 34 mm
Z_MOTOR = PLATE_T + ARM_T                         # motors sit on top of the arms
_MS = S.MOTOR_SPLIT
Z_PROP = Z_MOTOR + mm(_MS["base_h"] + _MS["bell_h"]) + mm(S.PROP["hub_t"]) / 2.0
Z_ESC = Z_MID_TOP + mm(S.STACK_GAP["esc_above_plate"])   # kept name: ESC board bottom

MOTOR_XY = mm(S.motor_xy("M1")[1]) * -1           # 84.85 mm
MOTORS = {name: (mm(S.motor_xy(name)[0]), mm(S.motor_xy(name)[1])) for name in ("M1", "M2", "M3", "M4")}
SPIN = {name: S.MOTOR_LAYOUT[name]["spin"] for name in MOTORS}

# Where the battery sits (kept name: build_from_plan uses it). Pack lies lengthwise on the top plate, at the middle
# of the range the simulation found balances the approved layout.
BAT = (mm(S.LAYOUT["battery_x"]), 0.0, Z_TOP_TOP)
WINDOWS = S.FRAME_OUTLINES["parts"]["bottom_plate"].get("windows", [])


def frame(P, with_top=True, carbon=None, standoffs=None):
    """Source One V6: real outlines for every plate, arm and the spacer; standoffs where the holes match.
    with_top=False leaves the top plate off (no step text fits it before step 7); standoffs default to with_top."""
    standoffs = with_top if standoffs is None else standoffs
    carbon = carbon or P["carbon"]
    objs = [C.extrude("frame_bottom_plate", O["bottom_plate"]["outline"], F["plate_t"], 0.0, carbon),
            C.extrude("frame_arm_spacer", O["arm_spacer"]["outline"], F["arm_t"], F["plate_t"], carbon),
            C.extrude("frame_middle_plate", O["middle_plate"]["outline"], F["plate_t"], F["plate_t"] + F["arm_t"], carbon)]
    for name, (mx, my) in MOTORS.items():
        ang = math.atan2(-my, -mx)                # arm +x runs from the motor toward the centre
        objs.append(C.extrude(f"frame_arm_{name}", O["arm"]["outline"], F["arm_t"], F["plate_t"], carbon,
                              loc=(mx, my, 0.0), rot_z=ang))
    if with_top:
        objs.append(C.extrude("frame_top_plate", O["top_plate"]["outline"], F["plate_t"], Z_TOP * 1000.0, carbon))
    if standoffs:
        asm = S.FRAME_OUTLINES["assembly"]
        r = mm(F["standoff_od"]) / 2.0
        for i, (x, y) in enumerate(asm["standoffs_30mm_bottom_to_top_xy"]):
            objs.append(C.cyl(f"frame_standoff_30mm_{i}", r, mm(F["standoff_long"]),
                              (mm(x), mm(y), PLATE_T + mm(F["standoff_long"]) / 2.0), mat=P["silicone_black"], seg=10))
        for i, (x, y) in enumerate(asm["standoffs_22mm_middle_to_top_xy"]):
            objs.append(C.cyl(f"frame_standoff_22mm_{i}", r, mm(F["standoff_short"]),
                              (mm(x), mm(y), Z_MID_TOP + mm(F["standoff_short"]) / 2.0), mat=P["silicone_black"], seg=10))
    return objs


def motor(P, name, loc, rot_z=0.0, ghost=False, screws=True):
    """2207 outrunner, 28.6 mm across, 32.8 mm tall with the shaft (split between parts is drawn).
    screws=True adds its four M3 screws up through the arm on the 16 mm pattern (R4), heads under the arm; their
    length is drawn (the motor's screw set is not published), as in Step 2."""
    x, y = loc
    r = mm(S.MOTOR["dia"]) / 2.0
    z0 = Z_MOTOR
    bh, base_h, sh = mm(_MS["bell_h"]), mm(_MS["base_h"]), mm(_MS["shaft_above"])
    bell = P["prop_ghost"] if ghost else P["motor_bell"]
    half = mm(S.MOTOR["mount"]) / 2.0
    extra = []
    if screws and not ghost:
        for i, (sx, sy) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
            sc = C.screw(f"{name}_screw_{i}", 0.0015, 0.008, (x + sx * half, y + sy * half, z0 - 0.002), head="bottom", mat=P["steel"])
            sc["approx"] = True
            extra.append(sc)
    return extra + [
        C.cyl(f"{name}_base", r * 0.92, base_h, (x, y, z0 + base_h / 2.0), mat=P["alu"], seg=20),
        C.cyl(f"{name}_bell", r, bh, (x, y, z0 + base_h + bh / 2.0), mat=bell, seg=24, smooth=False),
        C.cyl(f"{name}_shaft", mm(S.MOTOR["shaft_dia"]) / 2.0, sh,
              (x, y, z0 + base_h + bh + sh / 2.0), mat=P["steel"], seg=10),
    ]


def propeller(P, name, loc, radius=None, blades=None, ghost=False, rot_z=0.0, hub_z=None, pitch=16.0, spin=None):
    """Gemfan 51499 tri-blade (5.1 in). spin='CW' or 'CCW' sets which way the blades lean (seen from above)."""
    radius = radius or mm(S.PROP["dia"]) / 2.0
    blades = blades or S.PROP["blades"]
    x, y = loc
    z = Z_PROP if hub_z is None else hub_z
    mat = P["prop_ghost"] if ghost else P["prop"]
    hub_t = mm(S.PROP["hub_t"])
    objs = [C.cyl(f"{name}_hub", 0.0085, hub_t, (x, y, z), rot=(0, 0, rot_z), mat=mat, seg=18)]
    # A prop's leading edge is the high edge: for CW (seen from above) the blade rises toward -angle.
    hand = -1.0 if spin == "CW" else 1.0
    verts, faces = [], []
    segs, r0 = 8, 0.0095
    for b in range(blades):
        base = 2.0 * math.pi * b / blades + rot_z
        start = len(verts)
        for i in range(segs + 1):
            t = i / segs
            r = r0 + (radius - r0) * t
            chord = 0.0150 * (1.0 - 0.30 * t) + 0.0020
            thick = 0.0016 * (1.0 - 0.45 * t) + 0.0006
            p = math.radians(pitch * (0.55 + 0.75 * t)) * hand
            sweep = math.radians(5.5) * t * t * -hand
            cy, cz = math.cos(p), math.sin(p)
            for sy, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                u, v = sy * chord / 2.0, sz * thick / 2.0
                yv, zv = u * cy - v * cz, u * cz + v * cy
                a = base + sweep
                verts.append((r * math.cos(a) - yv * math.sin(a), r * math.sin(a) + yv * math.cos(a), zv))
        for i in range(segs):
            for k in range(4):
                k2 = (k + 1) % 4
                a = start + i * 4 + k
                b2 = start + i * 4 + k2
                faces.append((a, b2, b2 + 4, a + 4))
        last = start + segs * 4
        faces.append((start, start + 1, start + 2, start + 3))
        faces.append((last, last + 3, last + 2, last + 1))
    blades_ob = C._link(f"{name}_blades", verts, faces, mat, loc=(x, y, z), smooth=True)
    if spin:
        blades_ob["spin"] = spin
    objs.append(blades_ob)
    return objs


def clearance_ring(P, name, loc, radius=None, thickness=0.0012, mat=None):
    """Thin outline of a prop's swept circle."""
    radius = radius or mm(S.PROP["dia"]) / 2.0
    x, y = loc
    return C.ring(name, radius, thickness, 0.0008, (x, y, Z_PROP), mat=mat or P["accent"], seg=40)


# ----------------------------------------------------------------------------
# electronics
# ----------------------------------------------------------------------------
def stack_screws(P, top_z):
    """The four long stack screws through the 30.5 mm holes, with their soft grommets."""
    h = mm(S.ESC["holes"]) / 2.0
    objs = []
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        sc = C.screw(f"stack_screw_{i}", 0.0015, top_z, (sx * h, sy * h, top_z / 2.0), head="bottom", mat=P["steel"])
        # nylon lock nut on top (M3: 5.5 mm across the flats, drawn 4 mm tall: ASSUMPTION, not from the kit's list)
        nut = C.cyl(f"stack_screw_{i}_nut", 0.00318, 0.004, (sx * h, sy * h, top_z - 0.002), mat=P["plastic_black"], seg=6, smooth=False)
        nut.parent = sc
        nut.matrix_parent_inverse = sc.matrix_basis.inverted()
        objs.append(sc)
    return objs


def flight_stack(P, z_base=None, explode=0.0, with_fc=True, with_cable=True):
    """GEPRC 50A ESC (42.9 x 39.7) on grommets, the F405 FC (36.8 x 36.8) above it. explode lifts the FC."""
    z = Z_MID_TOP if z_base is None else z_base
    t = mm(S.PCB_T["t"])
    esc_z = z + mm(S.STACK_GAP["esc_above_plate"])
    objs = [C.plate("stack_esc", mm(S.ESC["d"]), mm(S.ESC["w"]), t, (0, 0, esc_z + t / 2.0),
                    mat=P["pcb_black"], corner=0.002)]
    h = mm(S.ESC["holes"]) / 2.0
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        objs.append(C.cyl(f"stack_grommet_{i}", 0.0035, mm(S.STACK_GAP["esc_above_plate"]),
                          (sx * h, sy * h, z + mm(S.STACK_GAP["esc_above_plate"]) / 2.0), mat=P["vis_magenta"], seg=12))
    # motor pads along the left and right edges, battery pads at the rear (manual R1)
    for name, (mx, my) in MOTORS.items():
        sx = 1 if mx > 0 else -1
        sy = 1 if my > 0 else -1
        for k in range(3):
            objs.append(C.box(f"stack_esc_pad_{name}_{k}", (0.0035, 0.0045, 0.0005),
                              (sx * (0.0065 + k * 0.0055), sy * (mm(S.ESC["w"]) / 2.0 - 0.003), esc_z + t + 0.00025),
                              mat=P["gold"]))
    for sign, tag in ((1, "pos"), (-1, "neg")):
        objs.append(C.box(f"stack_esc_batt_pad_{tag}", (0.006, 0.008, 0.0006),
                          (-mm(S.ESC["d"]) / 2.0 + 0.004, sign * 0.006, esc_z + t + 0.0003), mat=P["gold"]))
    fc_z = esc_z + t + mm(S.STACK_GAP["fc_above_esc"]) + explode
    if with_fc:
        objs.append(C.plate("stack_fc", mm(S.FC["d"]), mm(S.FC["w"]), t, (0, 0, fc_z + t / 2.0),
                            mat=P["pcb_black"], corner=0.002))
        objs.append(C.box("stack_fc_usb", (0.008, 0.009, 0.003), (0.0, mm(S.FC["w"]) / 2.0 - 0.004, fc_z + t + 0.0015),
                          mat=P["alu"], bevel=0.0004))
        if with_cable:
            objs.append(C.tube("stack_esc_fc_cable", [(-0.012, -0.016, esc_z + t + 0.001),
                                                        (-0.016, -0.019, (esc_z + fc_z) / 2.0 + 0.002),
                                                        (-0.012, -0.016, fc_z - 0.0005)], 0.0016, P["wire_white"], res=6))
    return objs, fc_z + t


def fc_pad(name):
    """Pad positions on the FC (approximate: the manual shows which pad, not exact coordinates)."""
    w = mm(S.FC["w"]) / 2.0
    d = mm(S.FC["d"]) / 2.0
    return {
        "R2": (-d + 0.004, w - 0.006), "T2": (-d + 0.004, w - 0.009), "5V_rx": (-d + 0.004, w - 0.012),
        "G_rx": (-d + 0.004, w - 0.015),
        "CAM": (d - 0.004, w - 0.006), "5V_cam": (d - 0.004, w - 0.009), "G_cam": (d - 0.004, w - 0.012),
        "9V": (-d + 0.004, -w + 0.006), "VTX": (-d + 0.004, -w + 0.009), "T1": (-d + 0.004, -w + 0.012),
        "G_vtx": (-d + 0.004, -w + 0.015),
        "5V_pi": (0.004, -w + 0.004), "G_pi": (0.008, -w + 0.004),
    }[name]


def motor_wires(P):
    """Three wires per motor from the arm to its own ESC pads (motor N to pads MN)."""
    objs = []
    esc_z = Z_ESC + mm(S.PCB_T["t"])
    for name, (mx, my) in MOTORS.items():
        sx = 1 if mx > 0 else -1
        sy = 1 if my > 0 else -1
        for k, key in enumerate(("wire_blue", "wire_yellow", "wire_white")):   # colours shown for visibility
            start = (mx * 0.82, my * 0.82 + 0.0015 * (k - 1), Z_MOTOR + 0.001)
            mid = (mx * 0.40, my * 0.40, Z_MID_TOP + 0.002)
            end = (sx * (0.0065 + k * 0.0055), sy * (mm(S.ESC["w"]) / 2.0 - 0.003), esc_z + 0.0008)
            objs.append(C.tube(f"wire_motor_{name}_{k}", [start, mid, end], 0.00055, P[key], res=5, solder="b"))
    return objs


def battery_lead(P, tip=None):
    """XT60 lead and the capacitor on the ESC battery pads (+ to +, - to -), leaving at the rear."""
    esc_z = Z_ESC + mm(S.PCB_T["t"])
    px = -mm(S.ESC["d"]) / 2.0 + 0.004
    tip = tip or (-0.095, 0.0, Z_TOP_TOP + 0.004)
    objs = []
    for sign, key, tag in ((1, "wire_red", "red"), (-1, "wire_black", "black")):
        objs.append(C.tube(f"wire_batt_{tag}", [(px, sign * 0.006, esc_z + 0.0008),
                                                  (px - 0.030, sign * 0.006, esc_z + 0.010),
                                                  (tip[0], tip[1] + sign * 0.003, tip[2])], 0.0012, P[key], res=7, solder="a"))
    objs.append(C.box("xt60_body", (0.016, 0.009, 0.008), (tip[0] - 0.008, tip[1], tip[2]),
                      mat=P["plastic_black"], bevel=0.0008))
    cr, ch = mm(S.CAPACITOR["dia"]) / 2.0, mm(S.CAPACITOR["h"])
    objs.append(C.cyl("stack_capacitor", cr, ch, (px - 0.008, 0.0, Z_MID_TOP + cr + 0.001),
                      rot=(math.radians(90), 0, 0), mat=P["plastic_black"], seg=14))
    objs.append(C.box("stack_capacitor_stripe", (0.002, ch * 0.9, 0.0004), (px - 0.008, 0.0, Z_MID_TOP + 2 * cr + 0.0012),
                      mat=P["plastic_white"]))
    return objs


def front_camera(P, tilt_deg=None):
    """RunCam Phoenix 2 SE, 19 x 19 x 22 mm, at the front between middle and top plates (mount is planned).

    The camera sits on a tilt pivot (empty 'cam_pivot', extras kind='tilt') so the viewer can change the tilt;
    default = parts.CAM_TILT (10 degrees up, a sourced beginner start). Carries the flying-camera pose and cone."""
    w, h, dpt = mm(S.CAMERA["w"]), mm(S.CAMERA["h"]), mm(S.CAMERA["depth"])
    x = mm(max(p[0] for p in O["middle_plate"]["outline"])) - dpt / 2.0 - 0.004
    z = (Z_MID_TOP + Z_TOP) / 2.0
    tilt = S.CAM_TILT["default"] if tilt_deg is None else tilt_deg
    pivot = C.group("cam_pivot", (x, 0.0, z))
    pivot["kind"] = "tilt"
    for k in ("min", "max", "step", "default"):
        pivot[k] = S.CAM_TILT[k]
    pivot["why"] = "Start at 10 degrees (beginner range 10-15, Oscar Liang); raise 5 degrees at a time"
    lens_x = dpt / 2.0 + 0.0055
    objs = [
        C.box("cam_body", (dpt, w, h), (0, 0, 0), mat=P["plastic_black"], bevel=0.0012),
        C.cyl("cam_lens", 0.0065, 0.006, (dpt / 2.0 + 0.002, 0.0, 0.0), rot=(0, math.radians(90), 0),
              mat=P["plastic_black"], seg=18),
        C.cyl("cam_glass", 0.0048, 0.0010, (lens_x, 0.0, 0.0), rot=(0, math.radians(90), 0), mat=P["glass"], seg=18),
    ]
    pose = C.group("campose_pilot", (lens_x + 0.001, 0.0, 0.0))
    pose["kind"], pose["cam"] = "campose", "pilot"
    pose["hfov"], pose["vfov"], pose["dir"] = S.PILOT_CAM["hfov"], S.PILOT_CAM["vfov"], [1.0, 0.0, 0.0]
    cn = C.cone("cone_pilot", (lens_x + 0.001, 0.0, 0.0), (1, 0, 0), S.PILOT_CAM["hfov"], S.PILOT_CAM["vfov"], 0.09,
                P["cone_pilot"])
    cn["kind"], cn["cam"] = "cone", "pilot"
    for ob in objs + [pose, cn]:
        ob.parent = pivot
    pivot.rotation_euler = (0.0, -math.radians(tilt), 0.0)   # up-tilt: nose of the camera raised
    return objs + [cn]


def vtx_and_antenna(P, antenna_x=None, planned=True, mounted=True):
    """TBS Unify Pro HV (31 x 22 x 6) at the rear, TBS Triumph PRO SMA antenna (78 mm). Positions are planned."""
    vx = -0.045
    z = PLATE_T + 0.004
    objs = [C.plate("vtx_board", mm(S.VTX["w"]), mm(S.VTX["d"]), mm(S.VTX["h"]), (vx, 0.0, z + mm(S.VTX["h"]) / 2.0),
                    mat=P["pcb_black"], corner=0.0015),
            C.cyl("vtx_sma_socket", 0.0032, 0.007, (vx - mm(S.VTX["w"]) / 2.0 - 0.003, 0.0, z + 0.003),
                  rot=(0, math.radians(90), 0), mat=P["gold"], seg=12)]
    ax = antenna_x if antenna_x is not None else -0.080
    base = (ax, 0.0, z + 0.003)
    hgt = mm(S.ANTENNA["height"])
    objs.append(C.tube("antenna_triumph_cable", [(vx - mm(S.VTX["w"]) / 2.0 - 0.006, 0.0, z + 0.003),
                                                   (ax, 0.0, z + 0.004), (ax - 0.006, 0.0, z + hgt - 0.021)],
                       0.0016, P["plastic_black"], res=6))
    objs.append(C.cyl("antenna_triumph_head", 0.0095, 0.022, (ax - 0.006, 0.0, z + hgt - 0.011),
                      mat=P["plastic_grey"], seg=16, bevel=0.0))
    # approved S4.4: the VTX sits on a strip of the foam mounting tape; two zip ties hold the antenna's base to the two
    # rear standoffs. Colours are for visibility; thicknesses are drawn (the tape's thickness is not published).
    # mounted=False (step 1's parts piles): loose parts only, nothing fitted yet.
    if mounted:
        objs.extend(vtx_mounting(P, vx, z, ax))
    if planned:
        C.mark_planned(objs, "VTX and antenna position on the V6 not confirmed")
    return objs


def vtx_mounting(P, vx, z, ax):
    objs = []
    objs.append(C.box("vtx_foam_tape", (mm(S.VTX["w"]) - 0.002, mm(S.VTX["d"]) - 0.002, z - PLATE_T),
                      (vx, 0.0, PLATE_T + (z - PLATE_T) / 2.0), mat=P["vis_magenta"]))
    rear = [p for p in S.FRAME_OUTLINES["assembly"]["standoffs_30mm_bottom_to_top_xy"] if p[0] < -50]
    for (sx, sy) in rear:
        a, b = (mm(sx), mm(sy), z + 0.006), (ax, 0.0, z + 0.006)
        cx, cy = (a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0
        L = math.hypot(a[0] - b[0], a[1] - b[1]) + 0.006
        ang = math.atan2(a[1] - b[1], a[0] - b[0])
        objs.append(C.box(f"antenna_zip_tie_{'l' if sy > 0 else 'r'}", (L, 0.003, 0.0012), (cx, cy, a[2]),
                          rot=(0, 0, ang), mat=P["vis_cyan"]))
    return objs


def receiver(P, loc=(-0.030, 0.012, None)):
    """RadioMaster RP1 V2, 13 x 11 x 3 mm, and its 65 mm T antenna on the UFL socket."""
    x, y, z = loc
    z = z if z is not None else PLATE_T + 0.004
    objs = [C.box("rx_rp1", (mm(S.RX["w"]), mm(S.RX["d"]), mm(S.RX["h"])), (x, y, z + mm(S.RX["h"]) / 2.0),
                  mat=P["pcb_black"]),
            C.tube("rx_antenna", [(x - 0.006, y, z + 0.002), (x - 0.020, y + 0.012, z + 0.010),
                                  (x - 0.040, y + 0.030, z + 0.022)], 0.0007, P["wire_black"], res=5)]
    return objs


def led_strip(P):
    """Kept for build_from_plan only; no build step names an LED strip, so no step model uses it."""
    return [C.box(f"led_strip_{tag}", (0.050, 0.006, 0.0012), (-0.030, sy * 0.020, -0.0007), mat=P["led"])
            for sy, tag in ((-1, "l"), (1, "r"))]


# ----------------------------------------------------------------------------
# Raspberry Pi thermal payload
# ----------------------------------------------------------------------------
PI_W, PI_D = mm(S.PI["w"]), mm(S.PI["d"])


def pi_bench(P, loc=(0, 0, 0), with_cables=True):
    """Pi Zero 2 WH with the Qwiic HAT pressed on, both sensors cabled, as on the bench (step 6)."""
    x0, y0, z0 = loc
    objs = []
    t = 0.0016
    objs.append(C.plate("pi_pcb", PI_W, PI_D, t, (x0, y0, z0 + t / 2.0), mat=P["pcb_green"], corner=0.003))
    hx, hy = mm(S.PI["hole_dx"]) / 2.0, mm(S.PI["hole_dy"]) / 2.0
    objs.append(C.box("pi_header_40", (0.051, 0.005, 0.0085), (x0, y0 + PI_D / 2.0 - 0.0035, z0 + t + 0.00425),
                      mat=P["plastic_black"]))
    objs.append(C.box("pi_usb_power", (0.0075, 0.0055, 0.003), (x0 + hx - 0.013, y0 - PI_D / 2.0 + 0.003, z0 + t + 0.0015),
                      mat=P["alu"], bevel=0.0004))
    hz = z0 + t + 0.0085
    objs.append(C.plate("hat_pcb", mm(S.HAT["w"]), mm(S.HAT["d"]), t, (x0, y0 + PI_D / 2.0 - mm(S.HAT["d"]) / 2.0,
                                                                      hz + t / 2.0), mat=P["pcb_red"], corner=0.0015))
    ports = []
    for i, px in enumerate((-0.0185, -0.0095, -0.0005, 0.0085)):
        p = (x0 + px, y0 + PI_D / 2.0 - mm(S.HAT["d"]) + 0.003, hz + t + 0.0015)
        ports.append(p)
        objs.append(C.box(f"hat_qwiic_port_{i}", (0.0055, 0.0045, 0.003), p, mat=P["plastic_white"], bevel=0.0003))
    return objs, ports


def sensor_board(P, kind, loc, lens_down=False):
    """MLX90640 (19 x 22, two holes 13.6 apart) or PA1010D (28 x 21 x 9), with the straight male 1x5 header."""
    x, y, z = loc
    t = 0.0016
    if kind == "mlx":
        w, d = mm(S.MLX["w"]), mm(S.MLX["d"])
        objs = [C.plate("thermal_pcb", w, d, t, (x, y, z), mat=P["pcb_black"], corner=0.002)]
        for sx in (-1, 1):
            objs.append(C.cyl(f"thermal_hole_{'l' if sx < 0 else 'r'}", 0.0012, t * 1.2,
                              (x + sx * mm(S.MLX["hole_dx"]) / 2.0, y + d / 2.0 - mm(S.MLX["hole_from_top"]), z),
                              mat=P["gold"], seg=10))
        lz = -1 if lens_down else 1
        objs.append(C.cyl("thermal_lens", 0.0045, 0.006, (x, y + d / 2.0 - 0.0085, z + lz * 0.0035),
                          mat=P["alu"], seg=16))
        hdr_y = y - d / 2.0 + 0.0015
    else:
        w, d = mm(S.GPS["w"]), mm(S.GPS["d"])
        objs = [C.plate("gps_pcb", w, d, t, (x, y, z), mat=P["pcb_black"], corner=0.002),
                C.box("gps_antenna", (0.015, 0.015, mm(S.GPS["h"]) - 0.003), (x, y + 0.002, z + mm(S.GPS["h"]) / 2.0 - 0.0005),
                      mat=P["plastic_grey"], bevel=0.0006)]
        hdr_y = y - d / 2.0 + 0.0015
    pins = []
    for k in range(5):
        px = x + (k - 2) * 0.00254
        objs.append(C.box(f"{'thermal' if kind == 'mlx' else 'gps'}_pin_{k + 1}", (0.00064, 0.00064, 0.008),
                          (px, hdr_y, z - 0.001), mat=P["gold"]))
        pins.append((px, hdr_y, z - 0.005))
    return objs, pins


def pi_payload(P, z_base=None, with_gps=True, gps_mast=True, gps_xy=None, label_sensors=True, planned=False):
    """
    Payload on the aircraft in the APPROVED layout (simulation L515, Shad's option 1): a flat pad on the underside of
    the bottom plate, the Pi on four 12 mm nylon standoffs below it (header and HAT facing down), the MLX90640 just
    ahead of the Pi on the same pad looking straight down, two zip ties through the plate's windows, the GPS on the top
    plate in front of the battery. Positions come from the simulation; fit with the real parts is still to check.
    """
    L = S.LAYOUT
    mat_planned = P["planned"] if planned else None
    objs = []
    px, py = mm(L["pi_x"]), 0.0
    pad_t = mm(S.PAD["t"])
    so = mm(L["standoff"])
    mx = px + PI_W / 2.0 + mm(L["mlx_gap"]) + mm(S.MLX["d"]) / 2.0
    pad_x0 = px - PI_W / 2.0 - mm(S.PAD["margin"])
    pad_x1 = mx + mm(S.MLX["d"]) / 2.0 + mm(S.PAD["margin"])
    # approved S7.3: the pad is two layers of the foam mounting tape (outer layer keeps its backing)
    for k in range(2):
        objs.append(C.box(f"pi_pad_layer_{k}", (pad_x1 - pad_x0, PI_D + 2 * mm(S.PAD["margin"]), pad_t / 2.0 - 0.0001),
                          ((pad_x0 + pad_x1) / 2.0, py, -pad_t / 4.0 - k * pad_t / 2.0), mat=P["plastic_white"], bevel=0.0004))
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        objs.append(C.box(f"pi_standoff_tape_{i}", (0.010, 0.010, 0.0008),
                          (px + sx * mm(S.PI["hole_dx"]) / 2.0, py + sy * mm(S.PI["hole_dy"]) / 2.0, -pad_t - 0.0004),
                          mat=P["vis_magenta"]))
        objs.append(C.cyl(f"pi_standoff_{i}", 0.0025, so,
                          (px + sx * mm(S.PI["hole_dx"]) / 2.0, py + sy * mm(S.PI["hole_dy"]) / 2.0, -pad_t - so / 2.0),
                          mat=P["plastic_white"], seg=10))
    pi_top = -pad_t - so
    objs.append(C.plate("pi_pcb", PI_W, PI_D, 0.0016, (px, py, pi_top - 0.0008), mat=mat_planned or P["pcb_green"], corner=0.003))
    objs.append(C.box("pi_header_40", (0.051, 0.005, 0.0085), (px, py + PI_D / 2.0 - 0.0035, pi_top - 0.0016 - 0.00425),
                      mat=P["plastic_black"]))
    objs.append(C.box("pi_usb_power", (0.0075, 0.0055, 0.003), (px + mm(S.PI["hole_dx"]) / 2.0 - 0.013, py - PI_D / 2.0 + 0.003,
                                                              pi_top - 0.0016 - 0.0015), mat=P["alu"], bevel=0.0004))
    hat_z = pi_top - 0.0016 - 0.0085 - 0.0008
    objs.append(C.plate("hat_pcb", mm(S.HAT["w"]), mm(S.HAT["d"]), 0.0016, (px, py + PI_D / 2.0 - mm(S.HAT["d"]) / 2.0, hat_z),
                        mat=mat_planned or P["pcb_red"], corner=0.0015))
    for i, qx in enumerate((-0.0185, -0.0095)):
        objs.append(C.box(f"hat_qwiic_port_{i}", (0.0055, 0.0045, 0.003),
                          (px + qx, py + PI_D / 2.0 - mm(S.HAT["d"]) + 0.003, hat_z - 0.0008 - 0.0015), mat=P["plastic_white"]))
    # thermal camera: stuck to the pad with a square of the foam mounting tape on the back of the board, lens straight
    # down (approved S7.3, Shad's choice for G2; camera-view re-check: 0 % blocked). Tape thickness drawn (1 mm).
    tape = 0.001
    mlx_top = -pad_t - tape
    objs.append(C.box("thermal_tape", (mm(S.MLX["d"]) - 0.004, mm(S.MLX["w"]) - 0.004, tape), (mx, py, -pad_t - tape / 2.0),
                      mat=P["vis_magenta"]))
    objs.append(C.plate("thermal_pcb", mm(S.MLX["d"]), mm(S.MLX["w"]), 0.0016, (mx, py, mlx_top - 0.0008),
                        mat=mat_planned or P["pcb_black"], corner=0.002))
    objs.append(C.cyl("thermal_lens", 0.0045, 0.006, (mx, py, mlx_top - 0.0016 - 0.003), mat=P["alu"], seg=16))
    lens = (mx, py, mlx_top - 0.0016 - 0.0062)
    pose = C.group("campose_thermal", lens)
    pose["kind"], pose["cam"] = "campose", "thermal"
    pose["hfov"], pose["vfov"], pose["dir"] = S.THERMAL_CAM["hfov"], S.THERMAL_CAM["vfov"], [0.0, 0.0, -1.0]
    cn = C.cone("cone_thermal", lens, (0, 0, -1), S.THERMAL_CAM["hfov"], S.THERMAL_CAM["vfov"], 0.25, P["cone_thermal"],
                up=(1, 0, 0))                    # 55 degrees across the drone (Y), 35 degrees along it (X): simulated 'wide-Y'
    cn["kind"], cn["cam"] = "cone", "thermal"
    objs.append(cn)
    # two zip ties through the windows nearest the pad: a loop round the Pi and the plate
    near = sorted(WINDOWS, key=lambda w: abs(sum(p[0] for p in w) / len(w) - px * 1000.0))[:2]
    for k, w in enumerate(near):
        wx = mm(sum(p[0] for p in w) / len(w))
        wy = mm(sum(p[1] for p in w) / len(w))
        top_z, bot_z = PLATE_T + 0.0008, hat_z - 0.0018
        objs.append(C.box(f"zip_tie_{k}_under", (0.003, PI_D + 0.010, 0.0012), (wx, py, bot_z), mat=P["vis_cyan"]))
        objs.append(C.box(f"zip_tie_join_{k}", (0.006, 0.005, 0.004), (wx, py + 0.006, bot_z - 0.0015), mat=P["vis_cyan"]))
        objs.append(C.box(f"zip_tie_{k}_over", (0.003, 0.012, 0.0012), (wx, wy, top_z), mat=P["vis_cyan"]))
        for sy in (-1, 1):
            objs.append(C.box(f"zip_tie_{k}_side_{'l' if sy > 0 else 'r'}", (0.003, 0.0012, top_z - bot_z),
                              (wx, py + sy * (PI_D / 2.0 + 0.004), (top_z + bot_z) / 2.0), mat=P["vis_cyan"]))
    if with_gps:
        gx, gy = (mm(L["gps_x"]), 0.0) if gps_xy is None else gps_xy
        objs.append(C.box("gps_foam_tape", (mm(S.GPS["w"]) - 0.004, mm(S.GPS["d"]) - 0.004, 0.0032), (gx, gy, Z_TOP_TOP + 0.0016),
                          mat=P["vis_magenta"]))
        objs.append(C.plate("gps_pcb", mm(S.GPS["w"]), mm(S.GPS["d"]), 0.0016, (gx, gy, Z_TOP_TOP + 0.004),
                            mat=mat_planned or P["pcb_black"], corner=0.002))
        objs.append(C.box("gps_antenna", (0.015, 0.015, 0.006), (gx, gy, Z_TOP_TOP + 0.0078),
                          mat=mat_planned or P["plastic_grey"], bevel=0.0006))
        if gps_xy is None:
            objs += gps_cable(P)
    for ob in objs:
        ob["layout"] = "simulated L515 (approved): check fit with the real parts"
    if planned:
        C.mark_planned(objs, "payload layout not confirmed")
    if label_sensors:
        C.label("PI ZERO 2 WH + QWIIC HAT (SIMULATED LAYOUT)", (px, py, hat_z - 0.010))
        C.label("MLX90640 THERMAL CAMERA - LENS DOWN", (mx, py, mlx_top - 0.016))
        if with_gps:
            C.label("PA1010D GPS - ANTENNA UP", (mm(L["gps_x"]), 0.0, Z_TOP_TOP + 0.016))
    return objs


def _along(pts, s):
    """point at distance s (same units as pts) along a polyline, and the index of its segment."""
    acc = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        L = math.dist(a, b)
        if acc + L >= s or i == len(pts) - 2:
            t = 0.0 if L == 0 else max(0.0, min(1.0, (s - acc) / L))
            return [a[k] + (b[k] - a[k]) * t for k in range(3)], i
        acc += L
    return list(pts[-1]), len(pts) - 2


def gps_cable(P):
    """The GPS's CAB-17261, lengthened (Shad's decision, change request 43): four wires from the HAT's second Qwiic port
    along the route in docs/build-truth/geometry/routes.json, with two heat-shrunk joints per wire, staggered."""
    import verify_inputs as VI
    route = VI.routes(VI.positions())["qwiic_to_gps_front"]["pts"]
    E = S.GPS_EXT
    off = [0.577, 0.577, 0.577]
    objs = []
    for k, key in enumerate(("wire_red", "wire_blue", "wire_yellow", "wire_black")):
        o = (k - 1.5) * 0.7
        pts = [[p[i] + off[i] * o for i in range(3)] for p in route]
        objs.append(C.tube(f"gps_cable_{key}", [tuple(mm(v) for v in p) for p in pts], 0.0006, P[key], res=5))
        s1 = E["from_plug"] + E["stagger"] * k
        for j, s in enumerate((s1, s1 + E["cut"] - 2 * E["joint_loss"])):
            a, _ = _along(pts, s - 7.5)
            b, _ = _along(pts, s + 7.5)
            objs.append(C.tube(f"gps_cable_joint_{k}_{j}", [tuple(mm(v) for v in a), tuple(mm(v) for v in b)], 0.0011,
                               P["glass"], res=6))
    return objs


PI_POWER = (mm(S.LAYOUT["pi_x"]) + mm(S.PI["hole_dx"]) / 2.0 - 0.013, -PI_D / 2.0 + 0.003,
            -mm(S.PAD["t"]) - mm(S.LAYOUT["standoff"]) - 0.0031)


def battery(P, loc=None, crosswise=False, label=True):
    """GNB 1500 mAh 4S LiHV, 79 x 38 x 26 mm, XT60 lead and JST-XH balance lead."""
    x0, y0, z0 = loc if loc is not None else BAT
    l, w, h = mm(S.PACK["l"]), mm(S.PACK["w"]), mm(S.PACK["h"])
    sx, sy = (w, l) if crosswise else (l, w)
    cz = z0 + h / 2.0
    objs = [C.box("battery_pack", (sx, sy, h), (x0, y0, cz), mat=P["battery"], bevel=0.0022, seg=2),
            C.box("battery_band", (sx * 0.5, sy * 0.8, 0.0004), (x0, y0, z0 + h + 0.0002), mat=P["battery_label"])]
    end = (x0 - sx / 2.0, y0, cz) if not crosswise else (x0, y0 - sy / 2.0, cz)
    objs += [C.tube("battery_lead", [end, (end[0] - 0.012, end[1] - 0.004, cz - 0.004),
                                     (end[0] - 0.020, end[1] - 0.006, cz - 0.010)], 0.0012, P["wire_red"], res=6),
             C.tube("battery_lead_black", [(end[0], end[1] + 0.004, cz), (end[0] - 0.012, end[1] + 0.002, cz - 0.004),
                                           (end[0] - 0.020, end[1] + 0.001, cz - 0.010)], 0.0012, P["wire_black"], res=6),
             C.box("battery_xt60", (0.016, 0.009, 0.008), (end[0] - 0.028, end[1] - 0.002, cz - 0.012),
                   mat=P["plastic_black"], bevel=0.0008),
             C.box("battery_balance_plug", (0.004, 0.012, 0.005), (end[0] - 0.006, end[1] + 0.012, cz + 0.008),
                   mat=P["plastic_white"], bevel=0.0004)]
    if label:
        C.label("4S 1500 LIHV PACK", (x0, y0, z0 + h + 0.010))
    return objs


def battery_liion(P, loc=None, crosswise=False, label=True, ghost=False):
    """More Volts 4S 5000 mAh Li-ion (TenPower 50XG), 79.15 x 44.25 x 44.25 mm, XT60H lead and JST-XH balance lead
    (R-MV5000). ghost=True: a see-through outline, to show how the taller pack fits where the LiPo is strapped."""
    x0, y0, z0 = loc if loc is not None else BAT
    l, w, h = mm(S.PACK_LIION["l"]), mm(S.PACK_LIION["w"]), mm(S.PACK_LIION["h"])
    sx, sy = (w, l) if crosswise else (l, w)
    cz = z0 + h / 2.0
    mat = P["prop_ghost"] if ghost else P["battery_liion"]
    objs = [C.box("battery_pack_liion", (sx, sy, h), (x0, y0, cz), mat=mat, bevel=0.004, seg=2)]
    if not ghost:
        end = (x0 - sx / 2.0, y0, cz) if not crosswise else (x0, y0 - sy / 2.0, cz)
        objs += [C.tube("battery_liion_lead", [end, (end[0] - 0.012, end[1] - 0.004, cz - 0.006), (end[0] - 0.020, end[1] - 0.006, cz - 0.014)],
                        0.0012, P["wire_red"], res=6),
                 C.tube("battery_liion_lead_black", [(end[0], end[1] + 0.004, cz), (end[0] - 0.012, end[1] + 0.002, cz - 0.006),
                                                     (end[0] - 0.020, end[1] + 0.001, cz - 0.014)], 0.0012, P["wire_black"], res=6),
                 C.box("battery_liion_xt60", (0.016, 0.009, 0.008), (end[0] - 0.028, end[1] - 0.002, cz - 0.016), mat=P["plastic_black"], bevel=0.0008),
                 C.box("battery_liion_balance_plug", (0.004, 0.012, 0.005), (end[0] - 0.006, end[1] + 0.014, cz + 0.012), mat=P["plastic_white"], bevel=0.0004)]
    if label:
        C.label("MORE VOLTS 4S 5000 LI-ION PACK", (x0, y0, z0 + h + 0.010))
    return objs


def battery_pad(P, loc=None, crosswise=False):
    x0, y0, z0 = loc if loc is not None else BAT
    l, w = mm(S.PACK["l"]), mm(S.PACK["w"])
    sx, sy = (w, l) if crosswise else (l, w)
    return [C.box("battery_grip_pad", (sx * 0.9, sy * 0.9, 0.0012), (x0, y0, z0 - 0.0006), mat=P["rubber"])]


def strap(P, x, half_y=None, z_top=None, z_bottom=None, width=None):
    """Kevlar strap (20 mm wide) across the pack and under the top plate."""
    half_y = half_y if half_y is not None else mm(S.PACK["w"]) / 2.0 + 0.0008
    z_top = z_top if z_top is not None else BAT[2] + mm(S.PACK["h"]) + 0.0006
    z_bottom = z_bottom if z_bottom is not None else Z_TOP - 0.0008
    width = width or mm(S.STRAP["w"])
    tag = str(abs(int(x * 1000)))
    h = max(z_top - z_bottom, 0.001)
    return [C.box(f"strap_top_{tag}", (width, half_y * 2.0, 0.0012), (x, 0.0, z_top), mat=P["strap"]),
            C.box(f"strap_l_{tag}", (width, 0.0012, h), (x, -half_y, (z_top + z_bottom) / 2.0), mat=P["strap"]),
            C.box(f"strap_r_{tag}", (width, 0.0012, h), (x, half_y, (z_top + z_bottom) / 2.0), mat=P["strap"]),
            C.box(f"strap_under_{tag}", (width, half_y * 2.0, 0.0012), (x, 0.0, z_bottom), mat=P["strap"])]


def legs(P, planned=True):
    """Shad's legs: stacked M3 standoffs in the frame's own spare standoff holes, rubber foot on each (planned until in hand)."""
    G = S.LEGS
    asm = S.FRAME_OUTLINES["assembly"]
    rear = [p for p in asm["standoffs_30mm_bottom_to_top_xy"] if p[0] < -50]
    front = [p for p in asm["standoffs_22mm_middle_to_top_xy"] if p[0] > 40]
    objs = []
    for tag, pts, top_z, piece in (("rear", rear, 0.0, G["rear_piece"]), ("front", front, Z_MID * 1.0, G["front_piece"])):
        for i, (x, y) in enumerate(pts):
            x, y = mm(x), mm(y)
            z = top_z
            for k in range(int(G["pieces"])):
                h = mm(piece)
                objs.append(C.cyl(f"leg_{tag}_{i}_piece_{k}", mm(G["od"]) / 2.0, h, (x, y, z - h / 2.0), mat=P["alu"], seg=12))
                z -= h
            fh = mm(G["foot_h"])
            objs.append(C.cyl(f"leg_{tag}_{i}_foot", mm(G["foot_d"]) / 2.0, fh, (x, y, z - fh / 2.0), mat=P["rubber"], seg=14))
    if planned:
        C.mark_planned(objs, "legs chosen (Rotor Village standoffs + rubber feet); check the fit in hand")
    return objs
