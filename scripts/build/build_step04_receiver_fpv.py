"""
build_step04_receiver_fpv.py - Step 4 "Add control and video".

Text (STEP-TRUTH S4.1-S4.7, approved wording): RP1 V2 on UART2 (receiver T -> R2, R -> T2, 5V, GND) with its
UFL antenna; camera into the FC's CAM socket; VTX video from the FC's VTX pad, power from the 9V pad, control
wire to T1; Triumph PRO screwed on the VTX's SMA socket before any power; Betaflight on USB only (no battery,
no props); monitor (runs from a 4S pack on its cable) for the picture later; top plate fitted last (item 32). Positions the V6 drawing does not settle are 'planned'.
Run:  blender -b --factory-startup -P scripts/build/build_step04_receiver_fpv.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib_anim as A
import lib_core as C
import lib_kit as K
import lib_quad as Q


def wire(name, a, b, key, P, lift=0.008, solder=""):
    mid = ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0, max(a[2], b[2]) + lift)
    return C.tube(name, [a, mid, b], 0.0006, P[key], res=5, solder=solder)


def build():
    C.reset()
    P = C.palette()

    Q.frame(P)                     # last action (change request 32): fit the top plate
    for name, (mx, my) in Q.MOTORS.items():
        Q.motor(P, name, (mx, my))
    stack, fc_top = Q.flight_stack(P)
    Q.motor_wires(P)
    Q.battery_lead(P, tip=(-0.100, 0.0, Q.Z_MID_TOP + 0.006))

    # receiver on UART2 with the stack box's own 4-wire cable (approved batch D, S4.1): its plug in the FC's 4-pin
    # socket "G, 5V, R2, T2" (GEPRC diagram), the cut end soldered to the receiver: G-G, 5V-5, R2-T, T2-R.
    # The cable's wire colours are not published, so the model keeps the drawing colours.
    rx_loc = (-0.030, 0.015, Q.PLATE_T + 0.002)
    rx = Q.receiver(P, rx_loc)
    C.mark_planned(rx, "receiver position on the frame not confirmed")
    pads = [Q.fc_pad(p_) for p_ in ("R2", "T2", "5V_rx", "G_rx")]
    plug = (sum(p_[0] for p_ in pads) / 4.0, sum(p_[1] for p_ in pads) / 4.0, fc_top + 0.0015)
    C.box("rx_box_cable_plug", (0.0045, 0.0060, 0.0030), plug, mat=P["plastic_white"])
    for k, (pad, key) in enumerate((("R2", "wire_white"), ("T2", "wire_yellow"), ("5V_rx", "wire_red"), ("G_rx", "wire_black"))):
        wire(f"rx_box_cable_{pad}", (rx_loc[0] + 0.006, rx_loc[1] - 0.003 + k * 0.002, rx_loc[2] + 0.003),
             (plug[0] - 0.0015 + k * 0.001, plug[1], plug[2]), key, P, solder="a")   # soldered on the RP1, plugged at the FC

    # camera into the CAM socket
    cam = Q.front_camera(P)
    C.mark_planned(cam, "camera mount on the V6 not confirmed (Phoenix 2 is 19 mm)")
    cpx, cpy = Q.fc_pad("CAM")
    C.tube("cam_cable", [(0.055, 0.0, Q.Z_MID_TOP + 0.010), (0.030, cpy * 0.5, fc_top + 0.006), (cpx, cpy, fc_top)],
           0.0011, P["wire_black"], res=6)

    # VTX: power from 9V, video from the VTX pad, control to T1, then the antenna
    Q.vtx_and_antenna(P, antenna_x=-0.085)
    vtx_in = (-0.045 + 0.0155, 0.0, Q.PLATE_T + 0.007)
    for k, (pad, key) in enumerate((("9V", "wire_red"), ("G_vtx", "wire_black"), ("VTX", "wire_yellow"), ("T1", "wire_white"))):
        px, py = Q.fc_pad(pad)
        wire(f"vtx_wire_{pad}", (vtx_in[0], vtx_in[1] - 0.003 + k * 0.002, vtx_in[2]), (px, py, fc_top), key, P, solder="b")   # harness at the VTX, soldered on the FC pad
    # the VTX's two unused wires (TBS manual: orange "5V out", green "Audio"), cut short and capped (approved D, S4.3)
    for k, (tag, key) in enumerate((("orange", "copper"), ("green", "pcb_green"))):
        a = (vtx_in[0], vtx_in[1] + 0.006 + k * 0.002, vtx_in[2])
        b = (vtx_in[0] + 0.010, vtx_in[1] + 0.008 + k * 0.003, vtx_in[2] + 0.002)
        C.tube(f"vtx_wire_unused_{tag}", [a, b], 0.0006, P[key], res=5)
        c = (b[0] + 0.004, b[1] + 0.0004, b[2] + 0.0002)
        C.tube(f"vtx_wire_cap_{tag}", [(b[0] - 0.001, b[1], b[2]), c], 0.0011, P["plastic_black"], res=6)

    # Betaflight on USB only, from your laptop; monitor and its cell waiting on the bench
    K.laptop(P, (0.0, 0.330, 0.0), rot_z=0.0, lid_angle=105.0)
    C.tube("usb_cable", [(0.0, 0.0145, fc_top + 0.0015), (0.0, 0.080, 0.010), (0.0, 0.295, 0.004)], 0.0016,
           P["plastic_black"], res=6)
    K.monitor_skyzone(P, (0.0, -0.250, 0.0))
    Q.finder(P, label=True)          # S4.9: VIFLY Finder 2 in the front bay, before the top plate goes on

    C.label("RP1 V2 RECEIVER ON UART2", (rx_loc[0], rx_loc[1], rx_loc[2] + 0.012), detail="UART2: receiver T to R2, R to T2, plus 5V and GND")
    C.label("TX -> R2  /  RX -> T2 (Crossed on purpose)", (rx_loc[0] + 0.012, rx_loc[1] + 0.012, rx_loc[2] + 0.020),
            detail="receiver TX to the FC's R2, receiver RX to T2 (GEPRC manual, UART2)")
    C.label("RECEIVER ANTENNA", (rx_loc[0] - 0.040, rx_loc[1] + 0.030, rx_loc[2] + 0.028), detail="clip on before any power")
    C.label("PHOENIX 2 CAMERA", (0.072, 0.0, Q.Z_TOP + 0.004), detail="plug into the FC's CAM socket")
    C.label("UNIFY PRO HV VTX", (-0.045, -0.018, Q.PLATE_T + 0.016), detail="video from the FC's VTX pad, control to T1")
    C.label("VTX POWER: 9V PAD", (-0.020, -0.020, fc_top + 0.010), detail="and ground")
    C.label("TRIUMPH PRO ANTENNA (SMA)", (-0.091, 0.0, Q.PLATE_T + 0.090), detail="screw on before any power")
    C.label("USB ONLY: NO BATTERY, NO PROPS", (0.0, 0.120, 0.030), detail="Betaflight setup on your laptop")
    C.label("YOUR LAPTOP (NOT IN THE BOX)", (0.0, 0.330, 0.012))
    C.label("TOP PLATE: FIT IT LAST", (0.030, 0.0, Q.Z_TOP_TOP + 0.006), detail="on the 22 mm and 30 mm standoffs")
    C.label("M5F MONITOR (RUNS FROM YOUR USB-C POWER BANK)", (0.0, -0.250, 0.040), detail="for the picture test in step 8; no 18650 needed")

    # ---- clip ----
    A.appear(A.named("rx_rp1", "rx_box_cable_"), 0.0, 1.6)
    A.appear(A.named("rx_antenna"), 2.0, 2.8)
    A.appear(A.named("cam_cable", "vtx_wire_"), 3.2, 5.0)
    A.appear(A.named("antenna_triumph", "vtx_foam_tape", "antenna_zip_tie_"), 5.4, 6.6)
    A.appear(A.named("usb_cable"), 7.0, 8.0)
    A.appear(A.named("finder_"), 10.6, 11.4)
    A.slide(A.named("frame_top_plate"), (0, 0, 0.040), 12.0, 13.2)
    rxf = [rx_loc[0], rx_loc[1], rx_loc[2]]
    actions = [
        {"id": "S4.1", "hold": 1.7, "shows": ["rx_rp1", "rx_box_cable_R2", "rx_box_cable_T2", "rx_box_cable_plug"], "hides": ["frame_top_plate"], "time": 0.0, "short": "Receiver on UART2",
         "text": "Wire the receiver with one of the two small 4-wire cables from the stack box. Its plug goes into the flight controller's 4-pin socket marked G, 5V, R2, T2. Cut the other end and solder its four wires to the receiver's pads: G (ground) goes to the receiver's G pad 5V goes to the receiver's 5 pad R2 (the FC listens here) goes to the receiver's T pad (the receiver talks here) T2 (the FC talks here) goes to the receiver's R pad (the receiver listens here) A talking pin always goes to a listening pin. Follow each wire from its socket pin with the meter before you cut. When the stack box arrives, check: the colours of the wires in the 4-wire cable, and that its plug fits the 4-pin socket.",
         "focus": rxf, "dist": 0.09},
        {"id": "S4.2", "hold": 1.0, "shows": ["rx_antenna"], "hides": ["frame_top_plate"], "time": 2.0, "short": "Receiver antenna", "text": "Press the 65 mm T antenna that came with the receiver onto its tiny UFL socket, straight down until it clicks, before any power. Point the antenna's two arms away from carbon and out of the prop circles, for example taped along a rear arm."},
        {"id": "S4.3", "hold": 1.7, "shows": ["cam_cable", "vtx_wire_9V", "vtx_wire_VTX", "vtx_wire_T1", "vtx_wire_cap_orange", "vtx_wire_cap_green"], "hides": ["frame_top_plate"], "time": 3.2, "short": "Camera and VTX plug in",
         "text": "Camera: plug the camera into its cable (the one you plugged into the CAM socket, or soldered to the CAM pads, in Step 3). (The camera runs on 5 to 36 V.) VTX (video transmitter): plug the cable you soldered to the flight controller in Step 3 into the video transmitter. The plug fits one way only; never force it. (Red goes to 9V, both blacks to GND, yellow to VTX, white to T1; the orange and green wires are cut short and covered.) This way the OSD (the numbers on your video: pack voltage, timer, warnings) reaches your screen."},
        {"id": "S4.3b", "hold": 0.3, "shows": ["cam_body", "cam_lens"], "hides": ["frame_top_plate"], "time": 5.0,
         "short": "Camera tilt about 10° up", "text": "Tilt the flying camera up about 10°. Loosen the two side screws on the camera mount, tilt the camera, then tighten the screws again. Use a free phone level app to read the angle. Once you are hovering and the controls feel easy, raise it 5° at a time. The beginner range is 10 to 15°. When the frame arrives, check: does the camera mount (the plastic holder that comes with the frame) tilt by loosening two side screws? If it works another way, follow the frame’s manual.",
         "focus": [0.0675, 0.0, 0.021], "dist": 0.09},
        {"id": "S4.4", "hold": 1.3, "shows": ["antenna_triumph_head", "vtx_foam_tape", "antenna_zip_tie_l", "antenna_zip_tie_r"], "hides": ["frame_top_plate"], "time": 5.4, "short": "VTX antenna on", "text": "Stick the VTX to the bottom plate behind the stack with a strip of the foam mounting tape. Screw the 5.8 GHz antenna onto its gold SMA socket, finger tight, before any power. Hold the antenna's base with two zip ties to the two rear standoffs, so it points up and back, out of the props. If the drone lands upside down, the antenna takes the hit first: check its nut and the two zip ties. When the frame arrives, check: does it have a hole for the antenna's SMA nut?"},
        {"id": "S4.5", "hold": 0.6, "shows": [], "hides": ["frame_top_plate", "battery_pack"], "time": 7.0, "short": "Bind on ISM 2400",
         "text": "Radio charged, with its cells in (you did this in Stage 3; if not, do Step 5's first two items now). Open Betaflight Configurator on the laptop and connect the flight controller by USB (no battery). If you do not have it yet, download it from github.com/betaflight/betaflight-configurator/releases/latest, or use app.betaflight.com in Chrome. In Betaflight's Ports tab, turn on Serial RX for UART2, then Save. In the Receiver tab, pick Serial (via UART) and CRSF, then Save. On the radio, press SYS (the EdgeTX manual says press, the Pocket manual says long-press: if a short press does not open the Tools menu, hold it), open ExpressLRS in the Tools menu and scroll to the bottom. Note the version shown. Install the ExpressLRS Configurator on the laptop (github.com/ExpressLRS/ExpressLRS-Configurator/releases). Build the RP1 V2 firmware for the same version as the radio, with regulatory domain ISM 2400 and a bind phrase of your own. (ExpressLRS has no separate Canada option. Do not pick EU CE/LBT.) Write the phrase down. The receiver's version: the shop says it ships on v2.4 and RadioMaster's RP1 manual says v3.0, so do not assume either: you flash it to the radio's version anyway. Flash the receiver through the flight controller: keep the receiver wired to UART2 and the flight controller on USB, and close Betaflight. In the Configurator pick the RP1 V2 target, set Flashing Method to BetaflightPassthrough, and press Flash. (If you use the receiver's own Wi-Fi instead: on firmware v2.4 there is no Update tab; scroll down to the Firmware Update section.) Put the same bind phrase and ISM 2400 on the radio: press SYS, open ExpressLRS, choose WiFi Connectivity, then Enable WiFi. On the laptop, join the Wi-Fi network \"ExpressLRS TX\" (password expresslrs). In the Configurator pick the RadioMaster Pocket target, Flashing Method WiFi, the same version, ISM 2400 and the same bind phrase, and press Flash. With a bind phrase on both, they connect on their own. When the receiver arrives, check: it powers from USB alone (arrival test \"Receiver, video transmitter and smoke stopper\"), what Wi-Fi name it shows, and, on its Wi-Fi page, which ExpressLRS version it runs (do not assume 2.4)."},
        {"id": "S4.6", "hold": 0.6, "shows": ["usb_cable"], "hides": ["frame_top_plate", "battery_pack"], "time": 8.2, "short": "Betaflight on USB only",
         "text": "Set up Betaflight with the flight controller on USB only: no battery, no propellers. Press Save on each tab before you leave it. Setup tab: check the board says GEPRCF405. Calibrate Accelerometer with the frame level. Configuration tab: ESC protocol DShot (as the ESC manual names). Receiver tab: Serial (via UART), CRSF. Move the sticks and check the bars move. Modes tab: Add Range for ARM on the switch you choose. Failsafe tab: Stage 2 = Drop, so the motors stop if the radio link is lost. Power & Battery tab: maximum cell voltage 4.40 V. (The GNB is LiHV and charges to 4.35 V per cell. At 4.35, Betaflight would count a full pack as 5 cells.) Then open the CLI tab once, paste these lines and press Enter: set vbat_warning_cell_voltage = 330, set vbat_min_cell_voltage = 280, rateprofile 1, set throttle_limit_type = SCALE, set throttle_limit_percent = 65, rateprofile 2, set throttle_limit_type = SCALE, set throttle_limit_percent = 65, rateprofile 0, set throttle_limit_type = OFF, set throttle_limit_percent = 100, adjrange 0 0 2 900 2100 12 2 0 0, save. That gives one low-battery warning at 3.3 V per cell for both packs. On the GNB, the radio's 3-minute timer is your main land-now signal. It also puts a 65 % throttle limit in rate profiles 2 and 3, for the Li-ion pack only (the CLI counts rate profiles from 0, so rate profile 2 is rateprofile 1). Why: on a full punch this drone draws more than the Li-ion pack's recommended 30 to 50 A; at 65 % it stays near 41 A (the game's flight model, an ESTIMATE). The pack switch, so you never type a profile in the field. On the radio, put a 3-position switch that is not your ARM or ANGLE switch on a free channel: channel 7, if ARM is on 5 and ANGLE on 6 (EdgeTX: Model, Mixes, add a mix on CH7 with that switch as its source). Channel 7 is AUX 3 in Betaflight, and the adjrange line above makes AUX 3 choose the rate profile. Check it on the bench, USB only: in the Receiver tab, flick the switch; AUX 3 sits near 1000, 1500 and 2000. Near 1000 is rate profile 1 (the GNB, no limit); near 1500 and near 2000 are rate profiles 2 and 3 (both the Li-ion's 65 % limit). Put a strip of tape by the switch: the position near 1000 is GNB, the other two are Li-ion."},
        {"id": "S4.7", "hold": 0.6, "shows": [], "hides": ["frame_top_plate"], "time": 9.4, "short": "VTX at 25 mW", "text": "The VTX comes locked to 25 mW, its lowest power. (Running the VTX at any power needs the ISED Amateur Radio Operator Certificate (Basic): see Fly safely. Higher powers also need a long button press.) Check it at the first battery power-up in Step 8, with the antenna on. When it powers up, its red light flashes 3 times and then its blue light flashes once. That means power level 1: 25 mW. To change the channel or the power from Betaflight later, set UART1 to SmartAudio in the Ports tab. At the first battery power-up, check: the VTX light flashes red 3 times, then blue once (25 mW). The VTX does not power from USB."},
        {"id": "S4.9", "hold": 1.0, "shows": ["finder_body", "finder_wire_"], "hides": ["frame_top_plate"], "time": 10.6,
         "short": "Finder beeper in the front bay", "text": "Plug the Finder's 3-pin cable (soldered to the flight controller in Step 3: BZ to BP, GND and 5V to the pads just below it) into the Finder. Stick the Finder with foam tape on the middle plate in the front bay, between the four 22 mm standoffs and just ahead of the stack (leave about 2 mm), long side pointing forward and the cable end toward the stack, clear of the GPS cable. Betaflight needs no setting for it.",
         "focus": [0.034, 0.002, 0.018], "dist": 0.17, "view": [0.55, 0.65, 0.6], "labels": ["FINDER"]},
        {"id": "S4.8", "hold": 1.3, "shows": ["frame_top_plate"], "hides": [], "time": 12.0, "short": "Fit the top plate", "text": "Fit the top plate on the eight standoffs with eight of the frame's short screws (likely the M3 x 10 ones). Before tightening, check that no wire is trapped between the plate and a standoff. When the frame arrives, check: the screw size its manual names for the top plate, and whether it wants threadlock."},
    ]
    A.finish("step-04-main", 14.4, actions)

    print("STEP 4 - receiver and video")
    C.summary()
    C.export("step-04-receiver-fpv", preview=False, animate=True)


build()
