"""
build_step06_payload.py - Step 6 "Wire the Pi payload", on the bench.

Text (STEP-TRUTH S6, approved wording incl. items 12-15): card flashed and I2C on; straight male 1x5 header
on each sensor; Qwiic HAT pressed onto the Pi; each sensor cabled with one CAB-17261: red 3V3 to pin 1, blue
SDA to pin 2, yellow SCL to pin 3, pin 4 (INT) empty, black GND to pin 5; bench power from the kit supply;
addresses 0x33 and 0x10. On the bench both boards lie FACE UP (thermal lens up, GPS antenna up), so the pin order in
the picture is the order the words give for a board held face up (11 Nov 2026 audit: the thermal camera was drawn lens
down with the same pin order, a mirror image of the real board). An arrow shows the lens goes down later, on the drone. The micro-USB pigtail waits for step 7.
Pin order on the board follows Pimoroni's drawing (INT is the 4th pin).
Run:  blender -b --factory-startup -P scripts/build/build_step06_payload.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_kit as K
import lib_quad as Q

SLEEVE_BACK = {}   # sleeve name -> offset (m) where it waits on the wire before the joint is soldered
PIN_KEYS = ("wire_red", "wire_blue", "wire_yellow", None, "wire_black")   # 3V3, SDA, SCL, INT (empty), GND


def _lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def cable(P, name, port, pins, extend=False):
    """CAB-17261: Qwiic plug at the HAT, four female ends on header pins 1, 2, 3 and 5.
    extend=True (GPS cable, change request 43): each wire cut once, a red 12 cm silicone piece soldered in, both joints in
    3 mm clear heat shrink, joints staggered so no two sit side by side."""
    K.qwiic_plug(P, name, port)
    for k, key in enumerate(PIN_KEYS):
        if key is None:
            continue
        px, py, pz = pins[k]
        start = (port[0] + (k - 2) * 0.0008, port[1] - 0.002, port[2])
        mid = ((start[0] + px) / 2.0, (start[1] + py) / 2.0 - 0.010, 0.006)
        end = (px, py, pz - 0.002)
        if not extend:
            C.tube(f"{name}_{key}", [start, mid, end], 0.0006, P[key], res=5)
        else:
            j = min(k, 3)
            t1 = 0.18 + 0.07 * j                       # first joint, staggered along the wire
            a, b = _lerp(start, mid, t1 * 2), _lerp(mid, end, t1 * 1.2)
            C.tube(f"{name}_{key}", [start, a], 0.0006, P[key], res=5)
            C.tube(f"{name}_{key}_ext", [a, mid, b], 0.0006, P["wire_red"], res=5)
            C.tube(f"{name}_{key}_b", [b, end], 0.0006, P[key], res=5)
            for jj, (q, r) in enumerate(((a, _lerp(a, mid, 0.12)), (_lerp(b, mid, 0.10), b))):
                C.tube(f"gps_cable_joint_bench_{j}_{jj}", [_lerp(q, r, -0.5), _lerp(q, r, 1.0)], 0.0011, P["glass"], res=6)
                d = [r[i] - q[i] for i in range(3)]
                L = sum(v * v for v in d) ** 0.5 or 1.0
                away = 1.0 if jj == 0 else -1.0                   # both wait on the red extension piece (change request 45)
                SLEEVE_BACK[f"gps_cable_joint_bench_{j}_{jj}"] = tuple(away * 0.008 * v / L for v in d)
        C.box(f"{name}_socket_{k + 1}", (0.0025, 0.0025, 0.007), (px, py, pz - 0.002), mat=P["plastic_black"])


def build():
    C.reset()
    P = C.palette()

    _, ports = Q.pi_bench(P, (0.0, 0.040, 0.004))
    mlx, mlx_pins = Q.sensor_board(P, "mlx", (-0.070, -0.040, 0.012), lens_down=False)
    gps, gps_pins = Q.sensor_board(P, "gps", (0.070, -0.040, 0.012))
    cable(P, "cab17261_thermal", ports[0], mlx_pins)
    cable(P, "cab17261_gps", ports[1], gps_pins, extend=True)

    # bench power: the kit's 5.1 V supply into the Pi's power socket
    C.tube("pi_bench_supply", [(0.019, 0.026, 0.007), (0.030, 0.010, 0.004), (0.120, 0.000, 0.004)], 0.0015,
           P["plastic_black"], res=6)
    # micro-USB pigtail, meter-checked, waiting for step 7
    C.tube("pigtail_cable", [(-0.020, 0.110, 0.003), (0.020, 0.115, 0.003), (0.060, 0.105, 0.003)], 0.0013,
           P["plastic_black"], res=6)
    C.box("pigtail_plug", (0.008, 0.006, 0.003), (-0.025, 0.110, 0.003), mat=P["alu"])

    K.arrow(P, "arrow_lens_down", (-0.070, -0.031, 0.040), (-0.070, -0.031, 0.022))
    K.arrow(P, "arrow_antenna_up", (0.070, -0.038, 0.026), (0.070, -0.038, 0.046))

    C.label("PI ZERO 2 WH", (0.0, 0.040, 0.010), detail="card flashed, I2C on")
    C.label("QWIIC HAT", (0.0, 0.055, 0.020), detail="pressed onto the 40 pins")
    C.label("MLX90640 THERMAL CAMERA (0x33) - FACE UP HERE; LENS DOWN ON THE DRONE", (-0.070, -0.040, 0.050))
    C.label("PA1010D GPS (0x10) - ANTENNA UP", (0.070, -0.040, 0.054))
    C.label("CAB-17261 CABLE x2", (0.0, -0.010, 0.012), detail="red 3V3, blue SDA, yellow SCL, black GND")
    C.label("GPS CABLE + 12 CM PER WIRE", (0.045, -0.020, 0.016), detail="one wire at a time, joints in 3 mm heat shrink")
    C.label("PIN 1 3V3 ... PIN 4 (INT) EMPTY ... PIN 5 GND", (-0.070, -0.052, 0.006), detail="straight male header")
    C.label("BENCH POWER", (0.110, 0.000, 0.012), detail="the kit's 5.1 V supply")
    C.label("MICRO-USB PIGTAIL (STEP 7)", (0.020, 0.115, 0.012))

    # ---- clip ----
    A.appear(A.named("thermal_pin_", "gps_pin_"), 0.6, 1.8)
    A.slide(A.named("hat_"), (0, 0, 0.030), 2.2, 3.4)
    # S6.2b: the GPS cable, lengthened one wire at a time (wire, its red piece, its two joints)
    A.appear(A.named("cab17261_gps_plug"), 3.6, 3.8)
    for k, key in enumerate(("wire_red", "wire_blue", "wire_yellow", "wire_black")):
        A.appear(A.named(f"cab17261_gps_{key}", f"gps_cable_joint_bench_{k}_"), 3.6 + k * 0.35, 3.9 + k * 0.35)
        for jj in (0, 1):                                      # heat shrink waits on the wire, then slides over the joint
            nm = f"gps_cable_joint_bench_{k}_{jj}"
            A.slide(A.named(nm), SLEEVE_BACK[nm], 3.9 + k * 0.35, 4.15 + k * 0.35)
    for k, key in enumerate(("wire_red", "wire_blue", "wire_yellow", "wire_black")):
        A.appear(A.named(f"cab17261_thermal_{key}"), 6.0 + k * 0.8, 6.6 + k * 0.8)
    A.appear(A.named("cab17261_thermal_socket", "cab17261_gps_socket", "cab17261_thermal_plug"), 5.6, 6.0)
    A.appear(A.named("pi_bench_supply"), 9.6, 10.4)
    A.appear(A.named("arrow_lens_down", "arrow_antenna_up"), 11.0, 11.8)
    import bpy
    jo = bpy.data.objects["gps_cable_joint_bench_1_0"]
    vs = [jo.matrix_world @ v.co for v in jo.data.vertices]
    joint = [round(sum(v[i] for v in vs) / len(vs), 4) for i in range(3)]      # close-up on the blue wire's first joint
    actions = [
        {"id": "S6.0", "part": "6A", "hold": 0.5, "shows": ["pi_pcb"], "hides": ["hat_pcb"], "time": 0.0, "short": "Card flashed, I2C on", "text": "Get the Pi ready: On your laptop, install Raspberry Pi Imager from raspberrypi.com/software. Put the kit's card in the kit's card reader and plug it into the laptop. In Imager: Device = Raspberry Pi Zero 2 W; OS = the recommended one at the top of the list; Storage = the card. Take care to pick the card and not another drive, or you will erase that drive. In the settings, set a username (lowercase letters and numbers), a password, and turn on SSH. For Wi-Fi, enter your iPhone’s hotspot name and password. On the iPhone, open Settings > Personal Hotspot and turn on Maximize Compatibility: that puts the hotspot on 2.4 GHz, and the Pi Zero 2 W has 2.4 GHz Wi-Fi only. Your laptop joins the same hotspot, at home and at the field. Write the card. Put the card in the Pi, power it from the kit's supply in the socket marked PWR IN, and connect from your laptop over SSH: in a terminal, type ssh username@raspberrypi.local (use the username you set in Imager). Turn on I2C: type sudo raspi-config, choose 3 Interface Options, then I5 I2C, answer Yes, then Finish. Set the I2C bus to 400 kHz, as the payload README says: type sudo nano /boot/firmware/config.txt, add the line dtparam=i2c_arm_baudrate=400000 at the end, save with Ctrl+O, Enter, then Ctrl+X, then type sudo reboot and connect over SSH again. Copy the payload code to the Pi. On the laptop, in the folder that holds Shad-Drone-Payload, type scp -r Shad-Drone-Payload username@raspberrypi.local: (with the colon at the end). On the Pi, in the SSH window: cd Shad-Drone-Payload, then install the drivers as the payload README shows: python3 -m venv --system-site-packages .venv, then source .venv/bin/activate, then python -m pip install -r requirements.txt. Spare card: when this whole step works, do it again on the spare card (Stage 2): the same Imager settings, then the same payload set-up. Label it SPARE and keep it with the drone. If a crash or a pulled pack leaves the Pi unable to start, swap cards. On Windows, the Raspberry Pi documentation has a separate page on how to connect over SSH. When the Pi arrives, check: after you write the card, the Pi joins your iPhone’s hotspot (Maximize Compatibility on) and the laptop reaches it with ssh username@raspberrypi.local."},
        {"id": "S6.1", "part": "6B", "hold": 1.3, "shows": ["thermal_pin_1", "gps_pin_1"], "hides": ["hat_pcb"], "time": 0.6, "short": "Straight male headers",
         "text": "Solder the straight male 1x5 header onto each sensor board. (A header is a row of metal pins.) Keep the right-angle socket header spare. Practise first on the practice board from Stage 1. When the sensor boards arrive, check: which side of the board the pins go through, and how the headers are supplied (loose strips or with the boards).", "focus": [-0.070, -0.050, 0.010], "dist": 0.07},
        {"id": "S6.2", "part": "6B", "hold": 1.3, "shows": ["hat_pcb"], "hides": [], "time": 2.2, "short": "HAT onto the Pi", "text": "Push the Qwiic HAT onto the Pi. (A HAT is a board that plugs onto the Pi's 40 pins.) Line up the rows of pins. Press down gently and evenly until it sits flat. Do not wiggle it. When the HAT arrives, check: which way round it faces."},
        {"id": "S6.2b", "part": "6B", "hold": 1.6, "shows": ["cab17261_gps_wire_blue_ext", "gps_cable_joint_bench_1_0"], "hides": [], "time": 3.6,
         "short": "Lengthen the GPS cable, one wire at a time",
         "text": "Lengthen the GPS cable. (The thermal camera's cable is long enough as it is.) Before you cut anything, check: the cable's path with a piece of string. If it is longer than 250 mm, cut longer pieces, as that test says. (Arrival test \"GPS cable route\".) Cut 4 pieces of silicone wire, 12 cm each (longer if the string test said so). Strip about 5 mm off each end of each piece. Work on one wire at a time, so each wire keeps its own colour at both ends. Cut the wires at different places, 2 cm apart: red 5 cm from the Qwiic plug, blue 7 cm, yellow 9 cm, black 11 cm. Strip about 5 mm off each cut end. For each wire: slide two 15 mm pieces of 3 mm heat shrink onto its extension piece. Solder the extension piece's ends to the two cut ends. Slide one piece over each joint and shrink it with the iron's side or a lighter held well back, away from the Pi, the plug and the battery. Only then cut the next wire. Check with the multimeter on its continuity (beep) setting, or its lowest resistance setting: each colour connects to the same colour at the far end, and no two different colours connect. The extension pieces are all red, so the middle piece of every wire is red. The two ends of each wire keep their own colour. When the meter arrives, check: does it have a beep setting? Look for a sound-wave symbol next to the dial. If it does not, use its lowest resistance setting instead.",
         "focus": joint, "dist": 0.06},
        {"id": "S6.3", "part": "6C", "hold": 3.5, "shows": ["cab17261_thermal_wire_red", "cab17261_thermal_wire_blue", "cab17261_thermal_wire_yellow", "cab17261_thermal_wire_black"], "hides": ["cab17261_thermal_socket_4"], "time": 5.6, "short": "3V3, SDA, SCL, INT empty, GND",
         "text": "Connect each sensor to the HAT with one cable. Hold each sensor board face up with its five pins along the bottom edge. From the left, the pins are 3.3 V, SDA, SCL, INT, GND. The printed label for the 4th pin should read INT (this order is from Pimoroni's pin list; check the printed labels on your boards). Push each of the cable's four separate ends onto its own pin in that order. Leave the 4th pin (INT) empty. Ignore the letters printed on the HAT: SparkFun confirms its SDA and SCL labels are swapped. Trust the cable colours: black GND, red 3.3 V, blue SDA, yellow SCL. When each sensor board arrives, check: its left-to-right pin order as printed (look for the printed INT), and which HAT socket each cable goes into.",
         "focus": [-0.070, -0.050, 0.010], "dist": 0.07},
        {"id": "S6.4", "part": "6C", "hold": 0.9, "shows": ["pi_bench_supply"], "hides": [], "time": 9.6, "short": "Bench power: 0x33, 0x10",
         "text": "Power the Pi on the bench from the kit's supply, in the socket marked PWR IN. Over SSH, type sudo i2cdetect -y 1. In the table it prints, you should see 33 (the thermal camera) and 10 (the GPS). The GPS needs to be outdoors with a clear view of the sky to get a position, but it answers at 10 indoors too. When the Pi is running, check: the i2cdetect table against a screenshot from the real Pi."},
        {"id": "S6.S", "part": "6C", "hold": 0.9, "shows": ["arrow_lens_down_", "arrow_antenna_up_"], "hides": [], "time": 11.0, "short": "Lens down, antenna up",
         "text": "⚠ Safety: wear your safety glasses. Put the iron in its stand when you are not holding it. Power the sensors from the cable's red 3.3 V wire only. Later, on the drone: the round glass window of the thermal camera faces the ground; the flat square of the GPS faces the sky. You do not need to do that yet."},
    ]
    A.finish("step-06-main", 13.0, actions)

    print("STEP 6 - payload on the bench")
    C.summary()
    C.export("step-06-payload", preview=False, animate=True)


build()
