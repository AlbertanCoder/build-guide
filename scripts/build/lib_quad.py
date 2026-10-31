"""
lib_quad.py - the 5-inch quad geometry, built from lib_core primitives.

Scale is real: 220 mm motor-to-motor diagonal, 5.1" props, 30.5 mm stack
pattern. Everything is low-poly and named so the viewer can label it.

Vertical stack (metres, Z up):
    0.000 - 0.0025  bottom plate
    0.0025- 0.0075  arms (5 mm carbon)
    0.0075- 0.0100  top plate
    0.0100- 0.0162  ESC + standoffs + FC
    0.0193          propeller plane
"""

import math

import lib_core as C

MOTOR_XY = 0.078          # -> 220 mm diagonal
ARM_W, ARM_T = 0.016, 0.005
PLATE_T = 0.0025
Z_ARM = PLATE_T + ARM_T / 2.0          # 0.005
Z_TOP = PLATE_T + ARM_T + PLATE_T / 2  # 0.00875
Z_ESC = PLATE_T + ARM_T + PLATE_T + 0.0008
Z_PROP = 0.0193

MOTORS = {
    "M1": (-MOTOR_XY, MOTOR_XY),
    "M2": (MOTOR_XY, MOTOR_XY),
    "M3": (-MOTOR_XY, -MOTOR_XY),
    "M4": (MOTOR_XY, -MOTOR_XY),
}


def frame(P, with_top=True, carbon=None):
    """X-frame: bottom plate, four 5 mm arms, standoffs, top plate."""
    carbon = carbon or P["carbon"]
    objs = []

    objs.append(C.plate("frame_bottom_plate", 0.062, 0.062, PLATE_T,
                        (0, 0, PLATE_T / 2), mat=carbon, corner=0.010))

    for name, (mx, my) in MOTORS.items():
        # arm runs from the hub out to the motor mount, at 45 degrees
        dx, dy = mx, my
        length = math.hypot(dx, dy) - 0.010
        cx, cy = dx * (length / 2 + 0.010) / math.hypot(dx, dy), \
                 dy * (length / 2 + 0.010) / math.hypot(dx, dy)
        angle = math.atan2(dy, dx)
        objs.append(C.box(f"frame_arm_{name}", (length, ARM_W, ARM_T),
                          (cx, cy, Z_ARM), rot=(0, 0, angle), mat=carbon,
                          bevel=0.0008, seg=1))
        # motor mount pad
        objs.append(C.plate(f"frame_motorpad_{name}", 0.024, 0.019, ARM_T,
                            (mx, my, Z_ARM), rot=(0, 0, angle), mat=carbon,
                            corner=0.005))

    if with_top:
        objs.append(C.plate("frame_top_plate", 0.056, 0.056, PLATE_T,
                            (0, 0, PLATE_T + ARM_T + PLATE_T / 2),
                            mat=carbon, corner=0.009))
        for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
            objs.append(C.cyl(f"frame_standoff_{i}", 0.0025, ARM_T,
                              (sx * 0.023, sy * 0.023, Z_ARM), mat=P["alu"], seg=12))
    return objs


def motor(P, name, loc, rot_z=0.0, ghost=False):
    """2207 outrunner: mount flange, stator, bell, shaft."""
    objs = []
    x, y = loc
    z0 = PLATE_T + ARM_T
    bell = P["prop_ghost"] if ghost else P["motor_bell"]
    objs.append(C.plate(f"{name}_base", 0.019, 0.019, 0.0022, (x, y, z0 + 0.0011),
                        rot=(0, 0, rot_z), mat=P["alu"], corner=0.003))
    objs.append(C.cyl(f"{name}_stator", 0.0115, 0.0035, (x, y, z0 + 0.0040),
                      mat=P["magnet"], seg=20))
    objs.append(C.cyl(f"{name}_bell", 0.0138, 0.0075, (x, y, z0 + 0.0095),
                      mat=bell, seg=24, smooth=False))
    objs.append(C.cyl(f"{name}_bell_cap", 0.0138, 0.0016, (x, y, z0 + 0.0140),
                      mat=bell, seg=24, smooth=False))
    objs.append(C.cyl(f"{name}_shaft", 0.0025, 0.0035, (x, y, z0 + 0.0160),
                      mat=P["steel"], seg=10))
    return objs


def propeller(P, name, loc, radius=0.0648, blades=3, ghost=False,
              rot_z=0.0, hub_z=None, pitch=16.0):
    """Tri-blade prop built from swept quad rings: hub + tapered twisted blades."""
    x, y = loc
    z = Z_PROP if hub_z is None else hub_z
    mat = P["prop_ghost"] if ghost else P["prop"]
    objs = [C.cyl(f"{name}_hub", 0.0095, 0.0042, (x, y, z), rot=(0, 0, rot_z),
                  mat=mat, seg=18)]

    verts, faces = [], []
    segs = 8
    r0 = 0.0105
    for b in range(blades):
        base = 2.0 * math.pi * b / blades + rot_z
        start = len(verts)
        for i in range(segs + 1):
            t = i / segs
            r = r0 + (radius - r0) * t
            # Gemfan 5149-ish: broad chord at the root tapering toward the tip,
            # thin polycarbonate section, gentle sweep and washout twist.
            chord = 0.0152 * (1.0 - 0.30 * t) + 0.0020
            thick = 0.0018 * (1.0 - 0.45 * t) + 0.0007
            p = math.radians(pitch * (0.55 + 0.75 * t))
            sweep = math.radians(5.5) * t * t          # blade sweep back
            cy, cz = math.cos(p), math.sin(p)
            for sy, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                u = sy * chord / 2.0
                v = sz * thick / 2.0
                yv = u * cy - v * cz
                zv = u * cz + v * cy
                a = base + sweep
                verts.append((r * math.cos(a) - yv * math.sin(a),
                              r * math.sin(a) + yv * math.cos(a),
                              zv))
        for i in range(segs):
            for k in range(4):
                k2 = (k + 1) % 4
                a = start + i * 4 + k
                b2 = start + i * 4 + k2
                faces.append((a, b2, b2 + 4, a + 4))
        last = start + segs * 4
        faces.append((start, start + 1, start + 2, start + 3))
        faces.append((last, last + 3, last + 2, last + 1))

    objs.append(C._link(f"{name}_blades", verts, faces, mat, loc=(x, y, z),
                        smooth=True))
    return objs


def clearance_ring(P, name, loc, radius=0.070, thickness=0.0012, mat=None):
    """Thin outline showing a propeller's swept area."""
    x, y = loc
    return C.ring(name, radius, thickness, 0.0008, (x, y, Z_PROP + 0.0002),
                  mat=mat or P["accent"], seg=40)


# ----------------------------------------------------------------------------
# electronics
# ----------------------------------------------------------------------------
def flight_stack(P, z_base=None, explode=0.0):
    """
    50A 4-in-1 ESC with the F405 flight controller above it.

    explode > 0 lifts the FC (and the gap standoffs) by that many metres, which
    is what step 3 needs to show the soldering relationship.
    """
    z = PLATE_T + ARM_T + PLATE_T if z_base is None else z_base
    objs = []
    esc_z = z + 0.0008
    objs.append(C.plate("stack_esc", 0.036, 0.036, 0.0016, (0, 0, esc_z),
                        mat=P["pcb_black"], corner=0.002))
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        objs.append(C.cyl(f"stack_esc_mosfet_{i}", 0.0032, 0.0014,
                          (sx * 0.012, sy * 0.012, esc_z + 0.0015),
                          mat=P["plastic_black"], seg=10))
        objs.append(C.plate(f"stack_esc_pads_{i}", 0.009, 0.013, 0.0006,
                            (sx * 0.0165, sy * 0.0135, esc_z + 0.0011),
                            mat=P["gold"], corner=0.001))
    objs.append(C.cyl("stack_capacitor", 0.005, 0.011,
                      (-0.010, -0.014, esc_z + 0.0072),
                      mat=P["plastic_black"], seg=14))
    objs.append(C.cyl("stack_capacitor_top", 0.005, 0.0012,
                      (-0.010, -0.014, esc_z + 0.0128), mat=P["alu"], seg=14))

    gap = 0.0045 + explode
    fc_z = esc_z + 0.0008 + gap + 0.0008
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        objs.append(C.cyl(f"stack_standoff_{i}", 0.0022, gap,
                          (sx * 0.01525, sy * 0.01525, esc_z + 0.0008 + gap / 2),
                          mat=P["alu"], seg=10))
    objs.append(C.plate("stack_fc", 0.030, 0.030, 0.0016, (0, 0, fc_z),
                        mat=P["pcb_black"], corner=0.002))
    objs.append(C.box("stack_fc_usb", (0.008, 0.006, 0.003),
                      (0.0135, 0.0, fc_z + 0.002), mat=P["alu"], bevel=0.0004))
    objs.append(C.box("stack_fc_gyro", (0.004, 0.004, 0.0012),
                      (-0.004, 0.006, fc_z + 0.0014), mat=P["plastic_black"]))
    objs.append(C.plate("stack_fc_pads", 0.026, 0.004, 0.0005,
                        (0, -0.0105, fc_z + 0.0010), mat=P["gold"]))
    return objs, fc_z


def motor_wires(P):
    """Four silicone bundles from the ESC corner pads down to the motors."""
    objs = []
    z_esc = PLATE_T + ARM_T + PLATE_T + 0.0008
    for name, (mx, my) in MOTORS.items():
        sx = 1 if mx > 0 else -1
        sy = 1 if my > 0 else -1
        start = (sx * 0.0175, sy * 0.0145, z_esc + 0.0012)
        mid = (sx * 0.042, sy * 0.042, Z_ARM + 0.006)
        end = (mx, my, PLATE_T + ARM_T + 0.0035)
        objs.append(C.tube(f"wire_motor_{name}", [start, mid, end], 0.0011,
                           P["wire_black"], res=6))
    return objs


def battery_lead(P, tip=(0.055, -0.055, 0.006)):
    """XT60 lead from the ESC battery pads, plus the capacitor leg."""
    z_esc = PLATE_T + ARM_T + PLATE_T + 0.0008
    start = (0.0, -0.0155, z_esc + 0.0012)
    mid = (0.028, -0.048, Z_ARM + 0.004)
    objs = [
        C.tube("wire_batt_red", [start, mid, tip], 0.0016, P["wire_red"], res=7),
        C.tube("wire_batt_black",
               [(start[0] + 0.004, start[1], start[2]),
                (mid[0] + 0.004, mid[1], mid[2]),
                (tip[0] + 0.004, tip[1], tip[2])], 0.0016, P["wire_black"], res=7),
        C.box("xt60_body", (0.020, 0.011, 0.010),
              (tip[0] + 0.012, tip[1], tip[2]), mat=P["plastic_black"],
              bevel=0.0008),
        C.tube("wire_cap_leg", [(-0.010, -0.014, z_esc + 0.0012),
                                (-0.004, -0.0165, z_esc + 0.004),
                                (0.0, -0.0155, z_esc + 0.0012)], 0.0009,
               P["wire_red"], res=6),
    ]
    return objs


def front_camera(P):
    """RunCam Phoenix 2 in its 19 mm mount, tilted up 22 degrees."""
    objs = []
    tilt = math.radians(-22)
    x, z = 0.0405, PLATE_T + ARM_T + 0.010
    objs.append(C.box("cam_body", (0.019, 0.019, 0.019), (x, 0, z),
                      rot=(0, tilt, 0), mat=P["plastic_black"], bevel=0.0012))
    objs.append(C.cyl("cam_lens", 0.0068, 0.0055, (x + 0.0105, 0, z + 0.0042),
                      rot=(0, math.radians(68), 0), mat=P["plastic_black"], seg=18))
    objs.append(C.cyl("cam_glass", 0.0050, 0.0012, (x + 0.0130, 0, z + 0.0052),
                      rot=(0, math.radians(68), 0), mat=P["glass"], seg=18))
    for sy in (-1, 1):
        objs.append(C.plate("cam_side_plate", 0.021, 0.0016, 0.024,
                            (x, sy * 0.0105, z), rot=(0, tilt, 0),
                            mat=P["carbon"], corner=0.002))
    return objs


def vtx_and_antenna(P, antenna_x=-0.060):
    """TBS Unify Pro HV board plus the SMA Diamond antenna at the tail."""
    objs = []
    z = PLATE_T + ARM_T + 0.0045
    objs.append(C.plate("vtx_board", 0.030, 0.020, 0.0016, (-0.030, 0.0, z),
                        mat=P["pcb_black"], corner=0.0015))
    objs.append(C.cyl("vtx_sma_base", 0.0032, 0.006, (-0.045, 0.0, z + 0.001),
                      rot=(0, math.radians(90), 0), mat=P["alu"], seg=12))
    objs.append(C.tube("vtx_coax", [(-0.035, 0.0, z + 0.0012),
                                    ((antenna_x + 0.010), 0.0, z + 0.002),
                                    ((antenna_x + 0.002), 0.0, z + 0.006)], 0.0012,
                       P["wire_black"], res=6))
    base_z = z + 0.006
    objs.append(C.cyl("antenna_stem", 0.0022, 0.016,
                      (antenna_x, 0.0, base_z + 0.008),
                      mat=P["plastic_black"], seg=10))
    # TBS Diamond: a flat diamond-section omni, not a cone
    for i, tag in enumerate(("a", "b")):
        blade = C.box(f"antenna_diamond_{tag}", (0.020, 0.0018, 0.030),
                      (antenna_x, 0.0, base_z + 0.031),
                      rot=(0, 0, math.radians(45 * i)), mat=P["plastic_grey"],
                      bevel=0.0006)
        objs.append(blade)
    objs.append(C.cyl("antenna_cap", 0.004, 0.004,
                      (antenna_x, 0.0, base_z + 0.048),
                      mat=P["plastic_black"], seg=10, radius_top=0.002))
    return objs


def led_strip(P):
    """COB strip along the underside of the bottom plate - the hero's accent."""
    objs = []
    for sy, tag in ((-1, "l"), (1, "r")):
        objs.append(C.box(f"led_strip_{tag}", (0.050, 0.006, 0.0012),
                          (0, sy * 0.024, -0.0007), mat=P["led"]))
    return objs


# ----------------------------------------------------------------------------
# Raspberry Pi thermal payload
# ----------------------------------------------------------------------------
PI_W, PI_D = 0.065, 0.030


def pi_payload(P, z_base=None, with_gps=True, gps_mast=True,
               gps_xy=(0.020, -0.009), label_sensors=True):
    """
    Pi Zero 2 WH + Qwiic HAT, MLX90640 thermal camera, PA1010D GPS.

    The thermal board mounts below the plate with its lens facing down; the GPS
    sits on a mast above it so the ceramic antenna faces the sky.
    """
    z = PLATE_T + ARM_T + PLATE_T if z_base is None else z_base
    objs = []
    z_pi = z + 0.0088
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        objs.append(C.cyl(f"pi_standoff_{i}", 0.0022, 0.0075,
                          (sx * 0.026, sy * 0.011, z + 0.0042),
                          mat=P["plastic_white"], seg=10))
    objs.append(C.plate("pi_pcb", PI_W, PI_D, 0.0016, (0, 0, z_pi),
                        mat=P["pcb_green"], corner=0.002))
    for bx, name in ((-0.021, "usb_otg"), (-0.004, "usb_power"), (0.010, "hdmi")):
        objs.append(C.box(f"pi_{name}", (0.0075, 0.008, 0.0032),
                          (bx, -0.0125, z_pi + 0.0024), mat=P["alu"],
                          bevel=0.0004))
    objs.append(C.box("pi_header_40", (0.051, 0.005, 0.0024),
                      (0.004, 0.0105, z_pi + 0.0020), mat=P["plastic_black"]))
    objs.append(C.box("pi_sd_slot", (0.011, 0.003, 0.0012),
                      (-0.026, 0.014, z_pi + 0.0012), mat=P["plastic_grey"]))

    # Qwiic HAT stacked on the 40-pin header
    z_hat = z_pi + 0.0090
    objs.append(C.plate("hat_pcb", PI_W, PI_D, 0.0016, (0, 0, z_hat),
                        mat=P["pcb_black"], corner=0.002))
    objs.append(C.box("hat_female_header", (0.051, 0.005, 0.0045),
                      (0.004, 0.0105, z_hat - 0.0030), mat=P["plastic_black"]))
    for i, (qx, qy) in enumerate(((-0.022, -0.008), (-0.010, -0.008),
                                  (0.002, -0.008), (0.014, -0.008))):
        objs.append(C.box(f"hat_qwiic_port_{i}", (0.0055, 0.0045, 0.0030),
                          (qx, qy, z_hat + 0.0022), mat=P["plastic_white"],
                          bevel=0.0003))

    # MLX90640 thermal camera, lens pointing down through the frame
    z_th = z - 0.0055
    objs.append(C.plate("thermal_pcb", 0.0254, 0.0254, 0.0016,
                        (0.0, -0.014, z_th), mat=P["pcb_red"], corner=0.001))
    objs.append(C.cyl("thermal_lens", 0.0058, 0.0075,
                      (0.0, -0.014, z_th - 0.0045), mat=P["plastic_black"],
                      seg=16))
    objs.append(C.cyl("thermal_lens_glass", 0.0040, 0.0012,
                      (0.0, -0.014, z_th - 0.0083), mat=P["glass"], seg=16))
    objs.append(C.box("thermal_header", (0.0127, 0.0025, 0.0025),
                      (0.0, -0.014, z_th + 0.0020), mat=P["plastic_black"]))

    # PA1010D GPS on a mast so the antenna sees sky
    gx, gy = gps_xy
    z_gps = z_hat + (0.0175 if gps_mast else 0.0045)
    if with_gps:
        if gps_mast:
            objs.append(C.cyl("gps_mast", 0.0025, 0.0158,
                              (gx, gy, z_hat + 0.0092),
                              mat=P["plastic_black"], seg=10))
        objs.append(C.plate("gps_pcb", 0.0254, 0.0254, 0.0016,
                            (gx, gy, z_gps), mat=P["pcb_blue"], corner=0.001))
        objs.append(C.box("gps_antenna", (0.016, 0.016, 0.0040),
                          (gx, gy, z_gps + 0.0030),
                          mat=P["plastic_white"], bevel=0.0006))
        objs.append(C.box("gps_header", (0.0127, 0.0025, 0.0025),
                          (gx, gy, z_gps - 0.0020),
                          mat=P["plastic_black"]))

    if label_sensors:
        C.label("ZERO 2 WH + QWIIC HAT", (0.012, 0.0, z_hat + 0.004))
        C.label("MLX90640 - LENS DOWN", (0.0, -0.014, z - 0.013))
        if with_gps:
            C.label("PA1010D GPS - ANTENNA UP", (gx, gy, z_gps + 0.008))
    return objs


def battery(P, loc=(0.0, 0.0, 0.0), crosswise=True, label=True):
    """
    GNB 1500 mAh 4S pack, 72 x 34 x 26 mm.

    crosswise=True lays the long axis across the frame (Y), which is how it fits
    behind the Pi payload without overhanging the tail.
    """
    x0, y0, z0 = loc
    sx, sy, sz = (0.034, 0.072, 0.026) if crosswise else (0.072, 0.034, 0.026)
    cz = z0 + sz / 2.0
    objs = [
        C.box("battery_pack", (sx, sy, sz), (x0, y0, cz),
              mat=P["battery"], bevel=0.0022, seg=2),
    ]

    # printed label: dark brand band plus two pale spec blocks, laid on the top
    top = z0 + sz
    if crosswise:
        objs += [
            C.box("battery_band", (0.030, 0.020, 0.0004), (x0, y0, top + 0.0002),
                  mat=P["battery_label"]),
            C.box("battery_brand", (0.012, 0.046, 0.0004),
                  (x0 - 0.009, y0, top + 0.0002), mat=P["silicone_black"]),
            C.box("battery_cell_seam", (0.0012, 0.070, 0.024),
                  (x0, y0, cz), mat=P["silicone_black"]),
        ]
    else:
        objs += [
            C.box("battery_band", (0.020, 0.030, 0.0004), (x0, y0, top + 0.0002),
                  mat=P["battery_label"]),
            C.box("battery_brand", (0.046, 0.012, 0.0004),
                  (x0, y0 - 0.009, top + 0.0002), mat=P["silicone_black"]),
            C.box("battery_cell_seam", (0.070, 0.0012, 0.024),
                  (x0, y0, cz), mat=P["silicone_black"]),
        ]

    lead_x = x0 + sx / 2.0
    objs += [
        C.tube("battery_lead", [(lead_x - 0.004, y0 - 0.008, cz + 0.004),
                                (lead_x + 0.008, y0 - 0.011, cz - 0.002),
                                (lead_x + 0.016, y0 - 0.013, cz - 0.007)],
               0.0016, P["wire_red"], res=6),
        C.tube("battery_lead_black", [(lead_x - 0.004, y0 - 0.003, cz + 0.004),
                                      (lead_x + 0.008, y0 - 0.006, cz - 0.002),
                                      (lead_x + 0.016, y0 - 0.008, cz - 0.007)],
               0.0016, P["wire_black"], res=6),
        C.box("battery_xt60", (0.011, 0.020, 0.010),
              (lead_x + 0.022, y0 - 0.011, cz - 0.008),
              mat=P["plastic_black"], bevel=0.0008),
        C.box("battery_balance_plug", (0.008, 0.014, 0.004),
              (lead_x + 0.004, y0 + 0.012, cz + 0.010),
              mat=P["plastic_white"], bevel=0.0004),
    ]
    if label:
        C.label("4S 1500 LiHV PACK", (x0, y0, top + 0.010))
    return objs


def battery_pad(P, loc, crosswise=True):
    """Flywoo ultra-grip pad under the pack."""
    x0, y0, z0 = loc
    sx, sy = (0.038, 0.070) if crosswise else (0.070, 0.038)
    return [C.box("battery_grip_pad", (sx, sy, 0.006), (x0, y0, z0 - 0.003),
                  mat=P["rubber"], bevel=0.001)]


def strap(P, x, half_y=0.0364, z_top=0.0422, z_bottom=0.016, width=0.012):
    """Kevlar strap over the pack: top run plus the two hanging sides."""
    tag = str(abs(int(x * 1000)))
    h = max(z_top - z_bottom, 0.001)
    return [
        C.box(f"strap_top_{tag}", (width, half_y * 2.0, 0.0012),
              (x, 0.0, z_top), mat=P["strap"]),
        C.box(f"strap_l_{tag}", (width, 0.0012, h),
              (x, -half_y, (z_top + z_bottom) / 2.0), mat=P["strap"]),
        C.box(f"strap_r_{tag}", (width, 0.0012, h),
              (x, half_y, (z_top + z_bottom) / 2.0), mat=P["strap"]),
    ]
