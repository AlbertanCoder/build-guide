"""
build_step01_parts.py - Step 1 "Lay out all the parts".

Text (STEP-TRUTH S1): five piles - airframe, radio & power, video, thermal payload, tools - ticked against the
order list; manuals downloaded on the laptop; propellers stay in their bag. Every part is a loose part here,
drawn from parts.py sizes and the TBS frame outlines.
Run:  blender -b --factory-startup -P scripts/build/build_step01_parts.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_kit as K
import lib_quad as Q
import parts as S

mm = S.mm
O = S.FRAME_OUTLINES["parts"]
PILE = {"airframe": (-0.300, 0.170), "radio_power": (0.020, 0.200), "video": (0.330, 0.170),
        "thermal": (-0.200, -0.170), "tools": (0.150, -0.180)}


def loose(name, outline, t, at, rot_z=0.0, mat=None):
    return C.extrude(name, outline, t, 0.0, mat, loc=at, rot_z=rot_z)


def build():
    C.reset()
    P = C.palette()

    # --- airframe: plates and arms flat, motors, stack, props in their closed bag ---
    ax, ay = PILE["airframe"]
    carbon = P["carbon"]
    loose("loose_bottom_plate", O["bottom_plate"]["outline"], 2.0, (ax - 0.060, ay + 0.050, 0.0), 1.5708, carbon)
    loose("loose_middle_plate", O["middle_plate"]["outline"], 2.0, (ax - 0.060, ay, 0.0), 1.5708, carbon)
    loose("loose_top_plate", O["top_plate"]["outline"], 2.0, (ax - 0.060, ay - 0.055, 0.0), 1.5708, carbon)
    for i in range(4):
        loose(f"loose_arm_{i}", O["arm"]["outline"], 6.0, (ax + 0.030 + i * 0.032, ay + 0.060, 0.0), -1.5708, carbon)
    loose("loose_arm_spacer", O["arm_spacer"]["outline"], 6.0, (ax + 0.080, ay - 0.090, 0.0), 0.0, carbon)
    for i in range(4):          # not numbered yet: M1-M4 are assigned when they go on the arms (step 2)
        _, m = C.collect(Q.motor, P, f"loose_motor_{i + 1}", (0.0, 0.0))
        C.shift(m, dx=ax + 0.040 + (i % 2) * 0.034, dy=ay - 0.040 - (i // 2) * 0.034, dz=-Q.Z_MOTOR)
    _, stk = C.collect(Q.flight_stack, P, z_base=0.0, with_cable=False)
    C.shift(stk, dx=ax + 0.120, dy=ay - 0.040)
    C.box("prop_bag_closed", (0.090, 0.060, 0.012), (ax + 0.130, ay - 0.110, 0.006), mat=P["plastic_grey"], bevel=0.003)

    # --- radio & power ---
    bx, by = PILE["radio_power"]
    K.radio_pocket(P, (bx, by + 0.030, 0.0))
    K.cells_18650(P, (bx + 0.100, by + 0.040, 0.0))
    Q.receiver(P, (bx + 0.130, by + 0.090, 0.0))
    Q.battery(P, (bx - 0.040, by - 0.060, 0.0), label=False)
    _, b2 = C.collect(Q.battery, P, (bx + 0.050, by - 0.060, 0.0), label=False)
    for ob in b2:
        ob.name = ob.name + "_2"
    K.charger_m7ac(P, (bx + 0.150, by - 0.050, 0.0))
    Q.battery_liion(P, (bx - 0.040, by - 0.115, 0.0), label=False)      # Shad's second flight pack (mixed Stage 5)
    K.smoke_stopper(P, (bx - 0.120, by - 0.050, 0.0055))
    K.lipo_bag(P, (bx - 0.020, by - 0.170, 0.0), open_top=False)

    # --- video ---
    vx, vy = PILE["video"]
    _, cam = C.collect(Q.front_camera, P)
    C.shift(cam, dx=vx - 0.060 - 0.068, dy=vy + 0.060, dz=-0.012)
    _, vtx = C.collect(Q.vtx_and_antenna, P, antenna_x=-0.085, planned=False, mounted=False)
    C.shift(vtx, dx=vx + 0.060, dy=vy + 0.060, dz=-Q.PLATE_T)
    K.monitor_skyzone(P, (vx, vy - 0.040, 0.0))

    # --- thermal payload ---
    tx, ty = PILE["thermal"]
    Q.pi_bench(P, (tx, ty + 0.030, 0.0))
    Q.sensor_board(P, "mlx", (tx - 0.060, ty - 0.040, 0.008))
    Q.sensor_board(P, "gps", (tx + 0.010, ty - 0.040, 0.008))
    for i in range(2):
        K.jumper(P, f"cab17261_{i}", [(tx + 0.060, ty + 0.010 - i * 0.025, 0.002), (tx + 0.090, ty - i * 0.025, 0.002),
                                      (tx + 0.120, ty + 0.010 - i * 0.025, 0.002)],
                 ("wire_red", "wire_black", "wire_blue", "wire_yellow"))
    C.tube("pigtail_cable", [(tx - 0.070, ty + 0.080, 0.002), (tx, ty + 0.085, 0.002)], 0.0013, P["plastic_black"], res=6)

    # --- tools ---
    ex, ey = PILE["tools"]
    K.soldering_iron(P, (ex - 0.080, ey + 0.040, 0.0))
    K.multimeter(P, (ex + 0.020, ey + 0.040, 0.0))
    K.glasses(P, (ex + 0.110, ey + 0.030, 0.004))
    K.toolkit_roll(P, (ex + 0.000, ey - 0.080, 0.0))

    # --- laptop and the order list ---
    K.laptop(P, (0.420, -0.200, 0.0), lid_angle=105.0)
    C.box("order_list_paper", (0.216, 0.279, 0.0008), (-0.480, -0.170, 0.0004), mat=P["paper"])

    C.label("AIRFRAME", (ax, ay + 0.120, 0.040), detail="frame plates and arms, 4 motors, the stack")
    C.label("PROPS STAY IN THE BAG", (ax + 0.130, ay - 0.110, 0.030), detail="they go on in step 8")
    C.label("RADIO & POWER", (bx, by + 0.120, 0.080), detail="radio, cells, receiver, 2 packs, charger, smoke stopper, LiPo bag")
    C.label("VIDEO", (vx, vy + 0.120, 0.050), detail="camera, VTX, antenna, monitor (runs from a 4S pack on its cable)")
    C.label("THERMAL PAYLOAD", (tx, ty + 0.100, 0.040), detail="Pi Zero 2 WH, Qwiic HAT, MLX90640, PA1010D, 2 cables, pigtail")
    C.label("TOOLS", (ex, ey + 0.100, 0.060), detail="iron, multimeter, glasses, hex drivers")
    C.label("ORDER LIST: TICK EVERY PILE", (-0.480, -0.170, 0.020))
    C.label("YOUR LAPTOP (NOT IN THE BOX): DOWNLOAD THE MANUALS", (0.420, -0.200, 0.020))

    # ---- clip: one pile at a time, then the tick against the order list ----
    def in_pile(ob, px, py, r=0.17):
        return abs(ob.location.x - px) < r and abs(ob.location.y - py) < r
    meshes = [o for o in C.bpy.context.scene.objects if o.type == "MESH" and not o.name.startswith(("order_list", "laptop_"))]
    order = ("airframe", "radio_power", "video", "thermal", "tools")
    for i, key in enumerate(order):
        px, py = PILE[key]
        pile = [o for o in meshes if in_pile(o, px, py)]
        meshes = [o for o in meshes if o not in pile]
        A.appear(pile, 0.4 + i * 1.4, 1.4 + i * 1.4)
    A.appear(meshes, 0.4, 1.4)   # anything left over
    A.appear(A.named("laptop_"), 8.0, 9.0)
    actions = [
        {"id": "S1.1", "hold": 1.2, "shows": ["loose_bottom_plate"], "hides": [], "time": 0.4, "short": "Five piles",
         "text": "Put the parts in 5 piles: airframe · radio & power · video · thermal payload · tools. Keep the flight batteries in the LiPo bag. • Airframe: frame, motors, propellers (and the spare sets), Kevlar battery straps, battery grip pad, foam mounting tape, nylon M2.5 standoffs, M2.5 screw, nut and standoff set, the leg parts (M3 standoffs 25 mm and 28 mm, rubber feet, set screws, foot screws), the LED strip if you bought it (optional, not used in any step) • Radio and power: radio and its 18650 cells, receiver, the flight stack (flight controller and ESC), the 4S flight batteries, charger, fire extinguisher, smoke stopper, LiPo bag, USB-C data cable • Video: camera, video transmitter, its antenna, the monitor, and its memory card if you bought it (optional) • Thermal payload: Raspberry Pi kit, thermal camera, GPS board, Qwiic HAT and its jumper cables, micro-USB cable • Tools and supplies: tool kit, the iron's power adapter, safety glasses, wire stripper, practice board, silicone wire, heat shrink (both sizes), zip ties, threadlocker • Paperwork (not a pile): the Basic exam and the drone registration: you do these online"},
        {"id": "S1.2", "hold": 0.5, "shows": ["order_list_paper"], "hides": [], "time": 7.4, "short": "Tick the order list", "text": "Tick each line on the Buy page. A line says how many packs you bought and how many pieces are in a pack. For example “2 x ... (4 per pack)” means two packs of four.",
         "focus": [-0.480, -0.170, 0.0], "dist": 0.35},
        {"id": "S1.3", "hold": 1.1, "shows": ["laptop_tag"], "hides": [], "time": 8.0, "short": "Download the manuals",
         "text": "Download or bookmark these: Frame (TBS Source One V6): github.com/tbs-trappy/source_one (drawings only) Flight stack (GEPRC TAKER F405 BLS 50A): geprc.com/electronics/fc-manual (one-page wiring diagram) Receiver (RadioMaster RP1 V2): expresslrs.org/quick-start/receivers/wiring-up (the ExpressLRS guide) Video transmitter (TBS Unify Pro 5G8 HV): team-blacksheep.com/tbs-unify-pro-5g8-manual.pdf Thermal camera (Pimoroni MLX90640): shop.pimoroni.com/products/mlx90640-thermal-camera-breakout GPS (Pimoroni PA1010D): shop.pimoroni.com/products/pa1010d-gps-breakout Charger (ToolkitRC M7AC, manual V1.0): download.toolkitrc.com/m7ac Radio (RadioMaster Pocket, EdgeTX): manual.edgetx.org No V6 build manual was found (drawings only), and no RadioMaster PDF was opened."},
        {"id": "S1.S", "hold": 0.5, "shows": ["prop_bag_closed"], "hides": [], "time": 9.4, "short": "Props stay bagged",
         "text": "⚠ Safety: leave the propellers in the packet they came in. They go on at the very end, after everything works."},
    ]
    A.finish("step-01-main", 11.0, actions)

    print("STEP 1 - parts in five piles")
    C.summary()
    C.export("step-01-parts", preview=False, animate=True)


build()
