# How this build was checked

Written by `python -I scripts/build/verify_build.py` on 2026-11-11. Run it again any time; it rewrites this page.

## In plain words

- **243 checks** on the guide, the 3D models and the parts list.
- **206 passed.**
- **0 failed.**
- **37 need the real parts.** Listings leave out a size or a detail, so you check these in your hands before you build. That is the arrival checklist at the end: 30 short tests.
- **0 are page fixes.** The page's own lists disagree with each other, for example a part on the buy list that no step uses. They do not stop anything fitting.
- Every measured check was repeated **10,000 times**. Each run used slightly different sizes, so a part a little bigger or smaller than its listing is covered. The random seed is fixed (20261103), so every run of this page gives the same numbers.
- This is not a promise that nothing can go wrong. It says exactly what was checked, how, and what can only be checked with the parts in hand. The list of things not checked at all is near the end.

## What was checked

| What | Passed | Failed | Needs the real parts | Page fixes |
|---|---|---|---|---|
| Build order and safety order | 57 | 0 | 0 | 0 |
| Wiring (every connection, every wire long enough) | 14 | 0 | 3 | 0 |
| Parts fit (holes, screws, pads) | 6 | 0 | 14 | 0 |
| Nothing hits anything (props, ground, views) | 14 | 0 | 4 | 0 |
| Tools can reach (iron, driver, fingers) | 8 | 0 | 3 | 0 |
| Power (voltages and currents) | 13 | 0 | 8 | 0 |
| Lists, ids and directions agree | 89 | 0 | 5 | 0 |
| Weight and balance | 5 | 0 | 0 | 0 |

## The smallest safety margins that still pass

- speed controller, flight controller and frame stack holes line up (30.5 mm, with the soft grommets): 0.5 mm as designed, 0.3 mm in the worst of 10,000 runs
- M3 x 10 set screw: at least 3 mm of thread on each side of the plate: 1.0 mm as designed, 0.5 mm in the worst of 10,000 runs
- Stack screw tip stays below the top plate: 2.0 mm as designed, 1.03 mm in the worst of 10,000 runs
- Motor M1's 120 mm leads, measured from the motor's edge, reach the speed controller pad farthest from the motor, with the climb up to the speed controller board, 10 % extra for bends and 10 mm to spare: 6.09 mm as designed, 1.25 mm in the worst of 10,000 runs
- Motor M2's 120 mm leads, measured from the motor's edge, reach the speed controller pad farthest from the motor, with the climb up to the speed controller board, 10 % extra for bends and 10 mm to spare: 6.09 mm as designed, 1.25 mm in the worst of 10,000 runs

## How the sizes were varied

- CAD: +-0.2 mm
- datasheet: +-0.5 mm
- estimated: +-2 mm or 10 %, whichever is larger
- hole positions: +-0.2 mm
- weights: +-5 %
- placed by hand (Pi, GPS, battery): +-3 mm (my assumption)
- bottom plate: anywhere 2.0-2.5 mm (drawing says 2, listing says 2.5)
- Each run picks every size at random inside its band, all at once. A check that fails in more than 0.1 % of runs is either redesigned or moved to the arrival checklist with a test you can do in your hands.
- "Driven by" names the size whose wobble lines up best with the check's result (correlation r). That is the size to measure first.

## Arrival checklist (do these before you build)

1. **Landing-leg standoffs + set screws** (Rotor Village (legs) + set-screw assortment). Test: Count the M3 x 10 mm set screws in the kit first (you need 8; the listing says it has 20). Then screw two leg standoffs together with one M3 x 10 set screw, then screw that onto a frame standoff. Pass: Both ends take the set screw and the joint feels tight with no wobble. If not: If an end is not threaded inside, use M3 x 25 + M3 x 28 male-female standoffs instead, or one long M3 screw through both. Fewer than 8 M3 x 10 mm in the kit: ask the seller for the missing ones before Step 7 (this kit is the only set-screw source on the list).
2. **Stack** (Rotor Village (GEPRC stack)). Test: Fit the speed controller and flight controller on the four stack screws and check each nut is fully on; feel under the bottom plate where the pad goes. Find the + and - marks beside the speed controller's battery pads, any arrow or FRONT mark on the flight controller, whether the camera cable plugs straight in or the camera goes on pads, and (battery in, props off) that the GND/5V/LED pad group reads about 5 V. Pass: Nuts fully on, nothing sticks out more than about 1 mm under the plate, the marks are found, the camera connection is known, and the LED group reads about 5 V. If not: Nut will not go on: use the longer screws. Something sticks out: cut a hole in the pad there. No 5 V on the LED pads: ask before soldering the pigtail there.
3. **Top plate sits flat** (Frame). Test: Fit the top plate on all eight standoffs and press each corner. Pass: It sits flat and does not rock. If not: Swap standoffs between corners until it sits flat; if one is clearly short, ask Rotor Village or TBS for a spare.
4. **Drone stands level on its legs** (Rotor Village (legs) + feet). Test: Before fitting, measure a foot's height (the guide assumes 6.3 mm) and check the foot screw length against a foot. After fitting the legs, stand the drone on a flat table and look from the side. Pass: The foot screw holds the foot; all four feet touch and it does not rock. If not: Swap leg pieces between corners until it stands steady. Foot screw wrong: buy the right length (Stage 4 list).
5. **Battery and GPS do not touch** (Battery + GPS (after balancing)). Test: Measure the pack: the design assumes 79 mm; a pack over 81 mm closes the 2 mm gap. After balancing (step 7), look at the gap between the front of the battery and the GPS board. Pass: The pack is 81 mm long or less, and the battery and the GPS do not touch. If not: Move the GPS forward, up to the front edge of the top plate.
6. **Motor screw length** (Frame + motors). Test: Before fitting, hold a motor screw against the arm and the motor: arm (6 mm) plus thread inside the motor base. Pass: The screw goes in fully and the motor still spins freely by hand. If not: If it rubs or stops, use a 1-2 mm shorter screw (motor box or frame hardware).
7. **Packs and charger** (Rotor Village (packs, charger)). Test: Read each pack's label for HV or LiHV. Plug a pack's XT60 and balance plug into the charger (charger off) to see they fit. Then see whether LipoStorage brings a FULL pack down to 3.85 V. Pass: Labels say HV or LiHV, both plugs fit, and you know whether storage mode can lower a full pack. If not: No HV on the label: charge as LiPo (4.20 V). Main socket is XT30: buy an XT60-to-XT30 charge lead. Storage cannot lower a pack: fly it down or leave it a few days before storing.
8. **Iron adapter** (Amazon.ca (24 V adapter)). Test: Read the adapter's label: it should say 24 V and 5 A. Meter on DC volts: red probe in the plug's centre, black on the outside sleeve, adapter in the wall. Pass: About +24 V (positive), within what the label allows. If not: A minus reading: do not use it with the iron; message the shop with a photo. A reading far from the label: do not use it.
9. **Pi standoffs fit the Pi** (PiShop). Test: Screw one M2.5 nylon standoff into a Pi corner hole by hand. Pass: It goes through and sits flat. If not: If the hole is too small, use the M2.5 screws from the nylon set, not a bigger size.
10. **Foam tape and boards** (Canadian Tire (foam tape) + PiShop (thermal camera, GPS)). Test: Measure the foam tape's thickness and stick two layers on scrap; press the thermal camera's back and the GPS board's back onto a tape square; wrap a string round the Pi on its standoffs and measure the loop. Pass: Two layers stay put, both boards sit flat on the tape, and the loop is shorter than two joined 100 mm zip ties (about 168 mm usable). If not: Boards do not sit flat: add a second layer of tape so parts sit in the foam. Loop too long: join a third tie or buy longer ties.
11. **Camera tilt adjust** (Frame (TPU camera mount) + camera). Test: Fit the camera and look for side screws that let it tilt. Pass: It tilts to about 10 degrees up and locks. If not: If it is fixed, check the frame's other camera plates or ask on the TBS page; do not print a part.
12. **Receiver, video transmitter and smoke stopper** (Rotor Village (receiver, video transmitter, smoke stopper)). Test: Step 4: plug only USB into the flight controller and look at the receiver's light; note the Wi-Fi name it shows in Wi-Fi mode. Step 5 (step 5), the first battery power-up through the smoke stopper: find the smoke stopper's light. Step 8 (step 8): watch the video transmitter's light at start-up. Pass: The receiver light is on with USB alone; the smoke stopper shows solid green; the video transmitter's start-up flashes end with the power group, 3 red then 1 blue (25 mW, its lowest power), then a steady blue light (locked to the legal channels). If not: No receiver light on USB: do the channel check on a battery through the smoke stopper (props off). Smoke stopper light off and beeping: unplug at once. Other video transmitter flashes: check the manual's table before flying.
13. **5 V rail carries the Pi, camera and receiver** (Everything on the drone). Test: With props off and the payload fitted, power on and run 'vcgencmd get_throttled' on the Pi. Pass: It prints throttled=0x0. If not: Any other value: power the Pi from a separate 5 V regulator.
14. **Software and props** (Rotor Village (props) + your laptop). Test: In Betaflight's Motors tab, see whether there is a slider for each motor or only the Master slider. Try the kit's prop tool on a prop nut. Read the props' CW/CCW marking. Pass: You know how the Motors tab spins one motor, the prop tool fits the nut, and you can tell CW from CCW props. If not: Only a Master slider: spin one motor at a time with the others' sliders at zero as the tab allows, or ask. No letters on a prop: hold it flat, the leading edge is the higher edge; match it to the motor's spin.
15. **Quad battery lead reaches the pack** (Stack (XT60 lead) + pack). Test: Before you solder the XT60 lead in Step 3, hold it from the speed controller's battery pads to where the pack will sit, on top of the standoffs where the top plate will go, with the pack held there, and hold the pack's XT60 next to the lead's plug, without plugging them together (plugging in would power the drone). Look again with the pack strapped on (Step 7). Pass: They would meet without stretching and stay clear of the props. If not: Before soldering: use a longer XT60 lead (same wire size). Once soldered: move the pack within its balance range.
16. **Camera cable length** (Stack (camera cable) + camera). Test: Hold the camera in its mount and run its cable to the flight controller's CAM socket. Pass: It reaches with a little slack. If not: Use the camera's own 6-pin cable or splice in silicone wire.
17. **Multimeter basics** (Rotor Village (tool kit) + two 1.5 V batteries you have at home). Test: Find the meter's battery cover (and whether it needs the kit's small screwdriver); put in two 1.5 V batteries. Find the dial position for DC volts that covers about 24 V, and the beep (continuity) symbol. Touch the probes together on beep. Pass: You know the battery cover and the DC volts position, and it beeps when the probes touch. If not: No beep symbol: use the lowest resistance (ohms) setting instead; touching probes should read close to 0.
18. **Heat source for the heat shrink** (Rotor Village (tool kit + 3 mm heat shrink)). Test: Slide a spare 1 cm piece of the 3 mm heat shrink onto a scrap of wire, heat the iron, and stroke the tube with the side of the iron (not the tip). Pass: The tube shrinks tight round the wire and is not melted through. If not: Use a lighter held well back (about 3 cm), moving it all the time. No lighter at home: it is not on the list yet, ask before buying.
19. **Iron and its cables** (Rotor Village (tool kit)). Test: Look at both ends of the kit's XT60 to DC cable, and find the iron's polarity drawing (a dot and ring with + and -). The first time the iron is on, time how long it takes to melt solder, find how to set the temperature, and write the time down. Pass: You know which end goes into the battery and which into the iron, the iron's drawing matches the adapter, and you have its heat-up time. If not: No polarity drawing: power the iron only from a charged pack on the kit's own XT60 to DC cable, and message the shop.
20. **Micro-USB cable for the pigtail** (PiShop (micro-USB cable)). Test: Before cutting, look inside the small micro-USB plug for the row of five pins, and note the wire colours once the jacket is stripped (Stage 1 pigtail). Pass: You can see pin 1 at one end and pin 5 at the other, and the two thicker wires are found. If not: If the colours do not match red/black, go by the thicker wires and the meter check (Stage 1).
21. **Stack box 4-wire cable** (Rotor Village (GEPRC stack box)). Test: Note the four wire colours on the small 4-wire cable, and push its plug into the flight controller's 4-pin socket marked G, 5V, R2, T2 (no power). Pass: It plugs in fully one way only, and you know which colour comes from which socket pin. If not: If it does not fit that socket, use the other 4-wire cable from the box, or solder to the R2/T2 pads instead.
22. **Frame** (Rotor Village (TBS Source One V6)). Test: Look for a hole that fits the antenna's SMA nut, and for any sheet in the frame box naming the top-plate screw size and threadlock. Pass: You know where the antenna mounts and which screws hold the top plate. If not: No SMA hole: hold the antenna's base with the two zip ties to the rear standoffs (Step 4). No sheet: use the short M3 screws, no threadlock.
23. **Motor screws line up with the arm slots** (Frame + motors). Test: Sit one motor on an arm and look through the arm's four slots from below. Pass: All four motor screw holes show through a slot. If not: If one hole sits just past a slot's end, try the motor turned a quarter turn; if it still misses, ask TBS or Rotor Village before forcing a screw.
24. **USB-C plug with the top plate on** (Stack + USB-C cable). Test: With the top plate fitted, plug the USB-C cable into the flight controller. Pass: It goes fully in without pushing on the top plate. If not: Use a thinner or right-angle USB-C plug, or loosen the top plate for the Motors tab.
25. **Payload fit under the plate** (Frame + Pi + thermal camera + foam tape). Test: Hold the Pi on its standoffs and the thermal camera on the foam under the bottom plate at the marked spots. Pass: Both sit flat on carbon, the zip-tie windows are next to the Pi, and nothing touches the stack screws. If not: Slide the pod a few mm forward or back (simulation allows this) and recheck the lens view.
26. **Practice boards** (Amazon.ca (Eiechip practice boards)). Test: When the boards arrive, check that the pads take solder on the side you use: tin one pad on each side of a board (the listing says double-sided; pad size and hole spacing are not stated). Pass: Solder flows onto the pads on the side you use and they stay on the board. If not: A side will not take solder: use the other side, or another board from the set. Pads lift off: use a lower iron temperature and less time.
27. **Pi joins the iPhone hotspot** (PiShop (Raspberry Pi kit) + your iPhone + laptop). Test: After you write the card (step 6), turn on the iPhone's Personal Hotspot with Maximize Compatibility on (2.4 GHz). Power the Pi from the kit's supply in PWR IN, join the laptop to the same hotspot, and type ssh username@raspberrypi.local. Pass: The Pi joins the hotspot and the laptop logs in over ssh. If not: Check Maximize Compatibility is on (the Pi Zero 2 W has 2.4 GHz Wi-Fi only), and that the hotspot name and password in Imager are exact; write the card again.
28. **Radio runs on its cells** (Rotor Village (radio)). Test: Rotor Village says: "Controller will NOT function on USB alone, it still needs batteries." So do not test it with the cells out. Put the two 18650 cells in, plug its USB-C cord into a USB charger and switch the radio on. Pass: It switches on with its cells in, and its screen works while the cord is plugged in (useful for setup at the desk). If not: It does not switch on: check that the cells are in the right way round, then charge them with the cord.
29. **GPS cable route** (Frame + PiShop (Pi, HAT) + GPS + Qwiic cable). Test: Before you cut anything, hold the Pi and the GPS in place and lay a piece of string along the cable's path in the 3D view: from the HAT's second Qwiic port, up through the bottom plate's window, over the flight controller, round the front of the top plate to the GPS pins. Measure the string. Pass: The string is no longer than 250 mm (the 150 mm cable plus the 12 cm extension, less the joints). If not: Cut longer extension pieces (the string length minus 140 mm, plus 10 mm), from the same silicone wire.
30. **Pi lead reaches the Pi under the bottom plate** (Frame + stack (Step 3, once the flight controller is mounted)). Test: With the flight controller mounted, lead the Pi power lead (soldered to the flight controller in Step 3) down to where the Pi will sit under the bottom plate, centred 36 mm behind the stack centre. Pass: The micro-USB plug reaches the Pi's PWR IN socket without pulling tight. If not: Too short: stop and ask before you cut or extend anything.

## Not checked at all

- how the props are marked CW/CCW and which face goes up (read the real props)
- real wire stiffness and bend room (cables are lines with slack added)
- thrust, flight time and motor heat (no thrust data on the list)
- whether the stack screws go in from below with nuts on top, or from above into the frame's press nuts

## Every check

Margin = how much room is left at the design sizes. Runs = the share of the tolerance runs that pass, and the worst result seen.

| Result | Check | Step | Margin | Runs (worst) | Driven by | Note |
|---|---|---|---|---|---|---|
| PASS | S1.1 Five piles: everything it needs is there | S1.1 |  |  |  | needs only bought parts |
| PASS | S1.2 Tick the order list: everything it needs is there | S1.2 |  |  |  | needs sorted |
| PASS | S1.3 Download the manuals: everything it needs is there | S1.3 |  |  |  | needs checked |
| PASS | S2.1 Arms on the bottom plate: everything it needs is there | S2.1 |  |  |  | needs checked |
| PASS | S2.2 Standoffs: everything it needs is there | S2.2 |  |  |  | needs arms_on |
| PASS | S2.3 Motors M1-M4: everything it needs is there | S2.3 |  |  |  | needs arms_on |
| PASS | S2.4 Motor screws clear the windings: everything it needs is there | S2.4 |  |  |  | needs motors_on |
| PASS | S5.1 Cells into the radio: everything it needs is there | S5.1 |  |  |  | needs only bought parts |
| PASS | S5.1b Charge the radio: everything it needs is there | S5.1b |  |  |  | needs radio_cells |
| PASS | S5.2 Fireproof surface, charger mains cable in: everything it needs is there | S5.2 |  |  |  | needs only bought parts |
| PASS | S5.3 Set LiHV and 1.0 A before the pack goes in: everything it needs is there | S5.3 |  |  |  | needs charger_on |
| PASS | S5.3c Pack into the LiPo bag: everything it needs is there | S5.3c |  |  |  | needs only bought parts |
| PASS | S5.4a Main plug and balance lead: it starts by itself: everything it needs is there | S5.4a |  |  |  | needs charger_set, pack_in_bag |
| PASS | S5.4 Stay beside it until the screen shows F: everything it needs is there | S5.4 |  |  |  | needs charging |
| PASS | S5.5 Storage mode if not flying soon: everything it needs is there | S5.5 |  |  |  | needs charger_on |
| PASS | S3.0 ESC in the frame: everything it needs is there | S3.0 |  |  |  | needs motors_on |
| PASS | S3.1 Cut the motor wires: everything it needs is there | S3.1 |  |  |  | needs esc_on |
| PASS | S3.2 Tin and solder the motor wires: everything it needs is there | S3.2 |  |  |  | needs wires_cut |
| PASS | S3.3 XT60 lead + capacitor: everything it needs is there | S3.3 |  |  |  | needs esc_on |
| PASS | S3.4 8-wire cable, then the FC: everything it needs is there | S3.4 |  |  |  | needs esc_on, motors_soldered, power_lead |
| PASS | S4.1 Receiver on UART2 with the stack box 4-wire cable: everything it needs is there | S4.1 |  |  |  | needs fc_on |
| PASS | S4.2 Receiver antenna: everything it needs is there | S4.2 |  |  |  | needs rx_wired |
| PASS | S4.3 Camera and VTX wires: everything it needs is there | S4.3 |  |  |  | needs fc_on |
| PASS | S4.3b Camera tilt about 10 degrees: everything it needs is there | S4.3b |  |  |  | needs video_wired |
| PASS | S4.4 VTX antenna on: everything it needs is there | S4.4 |  |  |  | needs video_wired |
| PASS | S4.5 Bind on ISM 2400: everything it needs is there | S4.5 |  |  |  | needs rx_antenna, radio_ready |
| PASS | S4.6 Betaflight on USB only: everything it needs is there | S4.6 |  |  |  | needs bound |
| PASS | S4.7 VTX at 25 mW: everything it needs is there | S4.7 |  |  |  | needs vtx_antenna |
| PASS | S4.9 Finder beeper in the front bay: everything it needs is there | S4.9 |  |  |  | needs fc_on |
| PASS | S4.8 Fit the top plate: everything it needs is there | S4.8 |  |  |  | needs standoffs_on, vtx_antenna, bf_setup, finder_on |
| PASS | S5.4b First power-up through the smoke stopper, props off: everything it needs is there | S5.4b |  |  |  | needs fc_on, packs_charged |
| PASS | S6.0 Card flashed, I2C on: everything it needs is there | S6.0 |  |  |  | needs only bought parts |
| PASS | S6.1 Straight male headers: everything it needs is there | S6.1 |  |  |  | needs only bought parts |
| PASS | S6.2 HAT onto the Pi: everything it needs is there | S6.2 |  |  |  | needs pi_ready |
| PASS | S6.2b Lengthen the GPS cable: everything it needs is there | S6.2b |  |  |  | needs only bought parts |
| PASS | S6.3 Cables: pins 1, 2, 3, 5: everything it needs is there | S6.3 |  |  |  | needs hat_on, headers, gps_cable_long |
| PASS | S6.4 Bench power: 0x33, 0x10: everything it needs is there | S6.4 |  |  |  | needs sensors_cabled |
| PASS | S7.1 Payload only after the first hover: everything it needs is there | S7.1 |  |  |  | needs top_plate |
| PASS | S7.6 Cables out of the prop circles: everything it needs is there | S7.6 |  |  |  | needs top_plate |
| PASS | S7.7 Battery on the pad, strap, balance: everything it needs is there | S7.7 |  |  |  | needs top_plate, packs_charged |
| PASS | S8.1 Laptop tests: everything it needs is there | S8.1 |  |  |  | needs only bought parts |
| PASS | S8.2 Bench power: smoke stopper, then failsafe: everything it needs is there | S8.2 |  |  |  | needs battery_mount, packs_charged, vtx_antenna, bound, bf_setup |
| PASS | S8.3 Motors tab, props off: everything it needs is there | S8.3 |  |  |  | needs failsafe_ok |
| PASS | S8.4 Fit the props: everything it needs is there | S8.4 |  |  |  | needs motors_ok |
| PASS | S8.5 First hover, no payload: everything it needs is there | S8.5 |  |  |  | needs props_on, licence, registration_marked |
| PASS | S7.3 Pi 36 mm behind the stack, on a pad: everything it needs is there | S7.3 |  |  |  | needs hovered, payload_bench_ok |
| PASS | S7.4 Zip ties through the windows, strap: everything it needs is there | S7.4 |  |  |  | needs payload_placed |
| PASS | S7.4b Pigtail from the FC 5V pad: everything it needs is there | S7.4b |  |  |  | needs payload_fixed |
| PASS | S7.8 Fit the landing legs: everything it needs is there | S7.8 |  |  |  | needs payload_fixed |
| PASS | S8.7 Payload on, heat test, props off: everything it needs is there | S8.7 |  |  |  | needs payload_powered, legs_on |
| PASS | S8.6 Hover again with the payload: everything it needs is there | S8.6 |  |  |  | needs payload_heat_ok, hovered |
| PASS | Props stay off until 'Fit the props' (S8.4) | S8.4 |  |  |  | props first go on at S8.4 |
| PASS | Props are off again for the heat test (S8.7) | S8.7 |  |  |  | S8.7 sets props off |
| PASS | The first battery plug-in goes through the smoke stopper | S5.4b |  |  |  | first plug-in at S5.4b |
| PASS | The video antenna is on before the VTX is first powered | S8.2 |  |  |  | antenna fitted at S4.4, VTX first powered at S8.2 |
| PASS | Battery out while the props go on | S8.4 |  |  |  | S8.4 has the battery disconnected; the page's step 8 safety line says 'Battery out whenever your hands are on props or motors' |
| PASS | Payload goes on only after the bare quad has hovered | S7.3 |  |  |  | S8.5 (first hover) comes before S7.3 in the real order (S7.1 says so) |
| PASS | Motor M1's 120 mm leads, measured from the motor's edge, reach the ESC pad farthest from the motor, with the climb up to the ESC board, 10 % extra for bends and 10 mm to spare | S3.1 | 6.09 mm | 100.0% (1.25) |  |  |
| PASS | Motor M2's 120 mm leads, measured from the motor's edge, reach the ESC pad farthest from the motor, with the climb up to the ESC board, 10 % extra for bends and 10 mm to spare | S3.1 | 6.09 mm | 100.0% (1.25) |  |  |
| PASS | Motor M3's 120 mm leads, measured from the motor's edge, reach the ESC pad farthest from the motor, with the climb up to the ESC board, 10 % extra for bends and 10 mm to spare | S3.1 | 6.09 mm | 100.0% (1.25) |  |  |
| PASS | Motor M4's 120 mm leads, measured from the motor's edge, reach the ESC pad farthest from the motor, with the climb up to the ESC board, 10 % extra for bends and 10 mm to spare | S3.1 | 6.09 mm | 100.0% (1.25) |  |  |
| PASS | Qwiic cable (150 mm) reaches from the HAT to the thermal camera | S6.3 | 60.47 mm | 100.0% (50.67) |  |  |
| PASS | GPS cable, lengthened by 12 cm per wire (Shad's choice), reaches from the HAT to the GPS on the top plate | S6.3 | 20.58 mm | 100.0% (2.99) |  | under the Pi to its edge, up to the plate, in through window 1, over the FC, out under the top plate's front edge, round it and back to the GPS header (routes.json). Without the extension the 150 mm cable is 89 mm short. |
| PASS | ESC, FC and frame stack holes line up (30.5 mm, with the soft grommets) | S3.0 | 0.5 mm | 100.0% (0.3) |  |  |
| NEEDS REAL PARTS | Both standoff sets end at the same top-plate height (2+30 = 2+6+2+22), within 1 mm | S4.8 | 1.0 mm | 98.65% (-0.3) | so22 (r=-0.04), so30 (r=+0.02) | Passes in 98.65% of 10,000 tolerance runs (more than 0.1% fail). |
| NEEDS REAL PARTS | M3 x 30 stack screw leaves room for its nut above the FC (screw heads under the bottom plate) | S3.4 | 2.8 mm | 78.55% (-6.74) | pcb_t (r=-0.71), fc_gap (r=-0.40) | Passes in 78.55% of 10,000 tolerance runs (more than 0.1% fail). |
| PASS | Stack screw tip stays below the top plate | S4.8 | 2.0 mm | 100.0% (1.03) |  |  |
| NEEDS REAL PARTS | Motor screw holes (16 mm across) sit inside the arm slots (8.0-9.5 mm from the shaft, 3.0 mm wide) | S2.3 | 0.0 mm | 50.38% (-0.97) | motor_r (r=+0.83), m3_d (r=-0.41) | Passes in 50.38% of 10,000 tolerance runs (more than 0.1% fail). |
| PASS | M3 x 10 set screw: at least 3 mm of thread on each side of the plate | S7.8 | 1.0 mm | 100.0% (0.5) |  |  |
| PASS | Two joined 100 mm zip ties reach round the Pi through each centre-line slot | S7.4 | 52.6 mm | 100.0% (36.47) |  | Usable length: 2 x (100 - 6 head - 10 tail) = 168 mm (my estimates). One tie alone gives 84 mm and would not reach. |
| PASS | The thermal camera's tape square covers at least half of its board's back (no screws into foam) | S7.3 | 14.59 % points | 100.0% (14.59) |  | Tape square drawn 2 mm in from each edge of the 19 x 22 mm board (lib_quad); half is my minimum. |
| PASS | Pi pad sits on carbon over at least 60 % of its footprint | S7.3 | 17.91 % points | 100.0% (11.6) |  |  |
| PASS | Thermal camera's pad sits on carbon over at least 60 % of its footprint | S7.3 | 23.48 % points | 100.0% (10.22) |  |  |
| PASS | At least two bottom-plate windows beside the Pi for the zip ties | S7.4 | 3.0 windows | 100.0% (3.0) |  |  |
| NEEDS REAL PARTS | Foam pad clears the stack screw heads or tips under the bottom plate | S7.3 |  |  |  | 4 of 4 stack screws ((-15.2, -15.2), (-15.2, 15.2), (15.2, -15.2), (15.2, 15.2)) sit inside the pad's footprint. Whether a head or tip sticks out below the plate depends on how the stack box's screws and the frame's press nuts go together. |
| NEEDS REAL PARTS | Motor screws grip the motor but stop short of the windings | S2.4 |  |  |  | The motor's 'Screw Set' length is not published; arm 6 mm (TBS). |
| NEEDS REAL PARTS | Foot screw (M3 x 10: the 6.3 mm foot leaves about 3.7 mm of thread) holds the rubber foot | S7.8 |  |  |  | Foot body thickness at the screw is not published. |
| NEEDS REAL PARTS | Leg standoffs are threaded inside at both ends | S7.8 |  |  |  | Rotor Village gives height and material only. |
| NEEDS REAL PARTS | M2.5 standoffs go through the Pi's holes | S7.3 |  |  |  | The Pi brief gives hole positions, not the hole size. |
| NEEDS REAL PARTS | The thermal camera's board sits flat on its tape square | S7.3 |  |  |  | Pimoroni lists the board size, not what is on its back. |
| NEEDS REAL PARTS | The receiver lights up on USB power alone (the channel check is done on USB) | S4.6 |  |  |  | Whether the FC's USB power reaches the UART2 5 V pad is not stated in the GEPRC listing. |
| NEEDS REAL PARTS | You can tell CW from CCW props and which face goes up | S8.4 |  |  |  | Not found in the Gemfan listing; the page tags it 'Check on arrival'. |
| NEEDS REAL PARTS | The Pi, pad and thermal camera sit where the simulation puts them | S7.3 |  |  |  | Positions come from the design simulation; the page says to hold the real parts in place first. |
| NEEDS REAL PARTS | The XT60 to DC cable's ends, the iron's polarity drawing and its heat-up time are known | S3.2 |  |  |  | No listing shows the cable's ends, the iron's polarity or a heat-up time. |
| NEEDS REAL PARTS | Pins 1 and 5 can be found inside the micro-USB plug; the cable's wire colours are known | S1.3 |  |  |  | PiShop lists 24 AWG power and 28 AWG data wires, not their colours. |
| NEEDS REAL PARTS | The ESC's + and - pad marks, any FC front mark, the camera connection and 5 V on the LED pads are confirmed | S3.3 |  |  |  | The GEPRC diagram is a drawing; only '-' is readable beside the pads. |
| NEEDS REAL PARTS | The stack box's 4-wire cable fits the FC's G/5V/R2/T2 socket; its colours are known | S4.1 |  |  |  | The box lists '2 x sh1.0 4pinsilicone cable'; colours and fit are not published. |
| NEEDS REAL PARTS | The frame has a hole for the SMA nut; the top-plate screws and threadlock are named | S4.4 |  |  |  | No Source One V6 build manual was found. |
| NEEDS REAL PARTS | The VTX's startup flashes (25 mW) and the smoke stopper's light are seen at the first power-up | S8.2 |  |  |  | Read from the TBS manual's table and the iFlight listing; not seen on the real parts. |
| NEEDS REAL PARTS | On the Li-ion pack, a throttle limit keeps a full punch near the pack's recommended current | S4.6 |  |  |  | Listing: '30-50A (typical UAV/FPV use)', '90A (Thermally limited)'. Betaflight throttle_limit_type SCALE / throttle_limit_percent (flight/mixer.c; per rate profile, cli/settings.c PROFILE_RATE_VALUE). The game's flight model (drone-sim tests/packs.test.mjs, an ESTIMATE from the Emax-scaled thrust and power) draws about 88 A at full throttle and about 41 A at SCALE 65 %. Needs a current reading on the real drone. |
| PASS | The M7AC has a Li-ion mode that stays at or below the Li-ion pack's maximum charge voltage | S5.3 | 0.1 V per cell |  |  | ToolkitRC M7 manual V1.0 (the M7AC's own manual not read): 'Lion ... a fully charged battery of 4.10V', end voltage fixed for Lion ('Only LiPo, LiHV, LiFe batteries can set the cut-off voltage'); M7AC types 'Lipo LiHV LiFe Lion LTO@1-6S', AC 'MAX 100W' (Oscar Liang's review); pack: 'Max Charge Voltage: 16.8 V (4.2 V/cell)'. 4.10 V <= 4.2 V. |
| NEEDS REAL PARTS | The packs' labels say HV; the charger's storage mode can lower a full pack | S5.3 |  |  |  | Shop names say HV (the real label is not seen yet). Charger: ToolkitRC M7 manual V1.0 (the M7AC's own manual not read) 'Lipo, LiHV, LiFe, Lion batteries can be charged, discharged, and stored'. |
| NEEDS REAL PARTS | The foam tape's thickness, the GPS board's back and the real zip-tie loop are checked | S7.3 |  |  |  | Thickness and loop length are not published; the design uses estimates. |
| NEEDS REAL PARTS | Betaflight's Motors tab sliders and the kit's prop tool on the prop nut are checked | S8.3 |  |  |  | Betaflight's docs name the Master slider; the prop tool's fit is not listed. |
| NEEDS REAL PARTS | Something on the list can shrink the heat shrink (the iron's side) | S6.2b |  |  |  | The kit has a 65 W iron but no heat gun; a lighter is not on the list. Whether the iron's side shrinks the 3 mm tube cleanly is not stated anywhere. |
| NEEDS REAL PARTS | The kit's multimeter has a beep (continuity) setting for the cable check | S6.2b |  |  |  | The tool kit listing names a multimeter, not its settings; the page tags this 'Check on arrival'. |
| NEEDS REAL PARTS | Camera mount lets the camera tilt to about 10 degrees | S4.3b |  |  |  | The TPU mount's adjustment is not described on the listing. |
| PASS | Iron reaches the FC's GND and 5V pads for the Pi lead: they are soldered on the bench, before the FC is mounted | S3.4 |  |  |  | replay order: the FC's pad wires go on at S3.4, before the 8-wire cable and the mounting |
| NEEDS REAL PARTS | USB-C plug fits between the FC and the top plate (Motors tab, top plate on) | S8.3 | 3.95 mm | 90.39% (-4.39) | pcb_t (r=-0.77), fc_gap (r=-0.43) | Passes in 90.39% of 10,000 tolerance runs (more than 0.1% fail). |
| PASS | Iron reaches the ESC motor pads: nothing is fitted above them yet | S3.2 |  |  |  | replay order: the FC goes on at S3.4 |
| PASS | Iron reaches the ESC battery pads: nothing is fitted above them yet | S3.3 |  |  |  | replay order: the FC goes on at S3.4 |
| PASS | Iron reaches the receiver's pads, not the FC's: the cable's plug goes into the FC's 4-pin socket and its other end is soldered to the receiver | S4.1 |  |  |  | replay order: the top plate goes on at S4.8 |
| PASS | No iron at S4.3: the camera and VTX plug into cables whose FC ends were soldered at S3.4 | S4.3 |  |  |  | replay order: the top plate goes on at S4.8 |
| PASS | Fingers can turn the front legs: open space round the middle-plate holes | S7.8 | 8.82 mm | 100.0% (8.82) |  | nearest arm edge 19.3 mm from a front leg hole; needs leg radius 2.5 + 8 mm finger room (my choice) |
| PASS | Hex driver reaches the motor screws from under the arms | S2.3 |  |  |  | the motor ends of the arms stick out past the plates (TBS drawing) |
| PASS | Neighbouring props do not touch | S8.4 | 40.17 mm | 100.0% (39.53) |  |  |
| PASS | Prop circles clear the battery | S7.7 | 13.8 mm | 100.0% (11.76) |  |  |
| PASS | Prop circles clear the GPS board | S7.3 | 10.69 mm | 100.0% (9.74) |  |  |
| NEEDS REAL PARTS | Battery at S7.7's forward limit (2 mm ahead, +-3 mm by hand) leaves a gap to the GPS | S7.7 | 2.0 mm | 78.35% (-4.12) | battery_x (r=-0.70), gps_x (r=+0.70) | Passes in 78.35% of 10,000 tolerance runs (more than 0.1% fail). |
| PASS | As designed, the battery (at its drawn place and at its forward limit) does not overlap the GPS | S7.7 | 2.0 mm |  |  | battery front edge 42.0 mm (furthest forward of parts.json battery_x, battery_ok_to and positions.json battery_x, plus half the 79 mm pack); GPS rear edge 44.0 mm |
| PASS | Prop circles clear the Li-ion pack (79 x 44 mm) | S7.7 | 11.16 mm | 100.0% (9.24) |  |  |
| NEEDS REAL PARTS | Li-ion pack at S7.7's forward limit (2 mm ahead, +-3 mm by hand) leaves a gap to the GPS | S7.7 | 1.92 mm | 77.42% (-4.01) | battery_x (r=-0.70), gps_x (r=+0.70) | Passes in 77.42% of 10,000 tolerance runs (more than 0.1% fail). |
| PASS | As designed, the Li-ion pack (at its drawn place and at its forward limit) does not overlap the GPS | S7.7 | 1.92 mm |  |  | pack front edge 42.08 mm (half the listing's 79.15 mm pack); GPS rear edge 44.0 mm |
| PASS | Pigtail route stays out of the prop circles | S7.4b | 42.76 mm | 100.0% (40.8) |  |  |
| PASS | Thermal camera sees past the Pi, legs, plates and props at every prop angle | S7.3 | -0.0 % blocked (0 = clear) | 100.0% (-0.0) |  |  |
| PASS | Legs, not the payload, touch the ground (10 mm to spare) | S7.8 | 15.6 mm | 100.0% (5.68) |  |  |
| PASS | When the drone tips over any side, a prop or arm touches the ground before the Pi or thermal camera | S7.8 | 49.89 degrees | 100.0% (38.52) |  | Crash review C1. Geometry only: says what touches first, not how far the drone can lean before it falls (that needs the centre of gravity, an estimate). Upside down, the video antenna touches first (about 84 mm up vs the battery's 60 mm, planned position): see the after-a-hard-landing checklist. |
| NEEDS REAL PARTS | Front and rear feet within 3 mm of level | S7.8 | 1.0 mm | 79.92% (-1.5) | leg_rear (r=-0.69), leg_front (r=+0.69) | Passes in 79.92% of 10,000 tolerance runs (more than 0.1% fail). |
| PASS | Rear legs clear the Pi pad by at least 2 mm | S7.8 | 4.75 mm | 100.0% (1.75) |  |  |
| NEEDS REAL PARTS | Quad's XT60 lead reaches the pack's 85 mm lead | S8.2 |  |  |  | The stack box's XT60 lead length is not published. Pack lead 85 mm (R12). |
| NEEDS REAL PARTS | Camera cable reaches the FC's CAM socket | S4.3 |  |  |  | The stack box's camera cable length is not published. |
| PASS | Battery slid forward to about 2 mm from the GPS (change request 43) leaves the balance point within 5 mm of centre | S7.7 | 3.72 mm | 100.0% (1.79) |  | Includes about 46 g of parts the page does not weigh yet (legs, HAT, pad, pigtail, wires, GPS cable extension: my estimates). The exact balance point is about 7 mm ahead of centre, past the GPS, so the drone stays a little tail-heavy. |
| PASS | Centre of gravity sits inside the four feet | S7.8 | 10.92 mm | 100.0% (10.78) |  |  |
| PASS | With the Li-ion pack slid forward to about 2 mm from the GPS, the balance point stays within 5 mm of centre | S7.7 | 4.53 mm | 100.0% (1.74) |  |  |
| PASS | With the Li-ion pack, the centre of gravity sits inside the four feet | S7.8 | 10.94 mm | 100.0% (10.83) |  |  |
| PASS | The 245 mm strap goes round the LiPo pack and the top plate, with 40 mm to fasten | S7.7 | 73.0 mm |  |  | 2 x (38 + 26 + 2 plate) + 40 overlap (ASSUMPTION) = 172.0 mm; strap 245 mm (R18) |
| PASS | The 245 mm strap goes round the Li-ion pack and the top plate, with 40 mm to fasten | S7.7 | 24.0 mm |  |  | 2 x (44.25 + 44.25 + 2 plate) + 40 overlap (ASSUMPTION) = 221.0 mm; strap 245 mm (R18) |
| PASS | No pad or pin belongs to two different nets | S3.3 |  |  |  | 58 ends in 28 nets |
| PASS | Every net has both ends connected | S4.1 |  |  |  |  |
| PASS | Every TX goes to an RX (receiver T->R2, FC T2->receiver R, FC T1->VTX) | S4.1 |  |  |  | RP1 T -> FC R2; FC T2 -> RP1 R; FC T1 -> VTX RX (SmartAudio) |
| PASS | Qwiic cable ends land on header pins 1, 2, 3, 5 (3V3, SDA, SCL, GND); INT (pin 4) empty | S6.3 |  |  |  | Pimoroni order 3V3, SDA, SCL, INT, GND; colours 3V3 red, SDA blue, SCL yellow, GND black |
| PASS | ESC and FC joined by the stack box's 8-wire cable (TLM, CUR, M4, M3, M2, M1, BAT, GND) | S3.4 |  |  |  | STEP-TRUTH S3.4 [R1][R2] |
| PASS | Pigtail (1.42 m cable before cutting) is long enough | S7.4b | 1270.0 mm |  |  | needs about 150 mm from the FC to the Pi (route in positions.json); cable 1420 mm |
| PASS | Silicone wire on the buy list covers every cut wire (receiver, VTX, GPS extension) | S6.3 | 759.0 mm |  |  | VTX wires 9V, video, T1 if its own cable is too short (S4.3): 3 x 60 mm; GPS cable extension (change request 43): 4 x 120 mm; plus 15 mm waste per piece. Needs about 765 mm; the list has 1524 mm (5 feet). |
| PASS | Heat shrink on the list grips a 26 AWG joint (4 mm or less before shrinking, 2:1) | S6.3 |  |  |  | list has: Heat shrink 6 mm x 150 mm, black; Heat shrink 3 mm x 150 mm, clear |
| PASS | Connector: flight pack -> quad mates |  |  |  |  | XT60 (pack, R12 'Discharge Lead: 85mm, XT60')  /  XT60 (stack box 'XT60 Power cable', R2) |
| PASS | Connector: pack -> smoke stopper mates |  |  |  |  | XT60  /  XT30 & XT60 in and out (R14) |
| PASS | Connector: pack -> monitor mates |  |  |  |  | XT60  /  monitor 'included cable with XT60 plug' (R17) |
| NEEDS REAL PARTS | Connector: pack -> charger mates |  |  |  |  | XT60 + JST-XH balance (R12)  /  charger 'output main port', 'balance port': type not published (R11, R45) |
| PASS | Connector: VTX -> antenna mates |  |  |  |  | SMA Female Socket (R8)  /  Connector: SMA (R10) |
| PASS | Connector: receiver -> antenna mates |  |  |  |  | UFL socket (R7)  /  65mm UFL T antenna (R7) |
| PASS | Connector: HAT -> sensors mates |  |  |  |  | Qwiic 1 mm JST (R21, R22)  /  CAB-17261 female jumpers onto male 1x5 header (R22) |
| PASS | Connector: FC -> laptop mates |  |  |  |  | USB Type-C (R2)  /  USB-C data cable (buy list) |
| PASS | Connector: pigtail -> Pi mates |  |  |  |  | micro-USB male (PiShop cable)  /  Pi Zero micro-USB power |
| PASS | Iron and 24 V adapter: 5.5 x 2.5 mm plug matches | S3.2 |  |  |  | Power Interface: 5.5*2.5 (R15) / 24 V 3 A, 5.5 x 2.5 mm plug (shopping list) |
| NEEDS REAL PARTS | Adapter plug is centre-positive | S3.2 |  |  |  | polarity: centre-positive not confirmed for the iron |
| NEEDS REAL PARTS | Connector: legs -> frame standoffs mates |  |  |  |  | M3 knurled standoff (female assumed)  /  frame standoff M3 (R3) via M3 set screw |
| PASS | ESC rated 9.0-26.1 V; it gets 13.2-17.4 V (pack) | S8.2 | 4.2 V |  |  | R2 'Input Voltage: 3-6S Lipo' |
| PASS | FC rated 9.0-26.1 V; it gets 13.2-17.4 V (pack) | S8.2 | 4.2 V |  |  | R2 'Input Voltage: 3-6S LiPo' |
| PASS | VTX rated 6.0-28.0 V; it gets 9.0-9.0 V (9V rail) | S8.2 | 3.0 V |  |  | R9 'Input ... 6V to 28V (2S - 6S) VBat' |
| PASS | camera rated 5.0-36.0 V; it gets 5.0-5.0 V (5V rail) | S8.2 | 0.0 V |  |  | rv-phoenix 'Power: DC 5-36V' |
| PASS | receiver rated 5.0-5.0 V; it gets 5.0-5.0 V (5V rail) | S8.2 | 0.0 V |  |  | R7 'Working voltage: 5v' |
| NEEDS REAL PARTS | Pi Zero 2 W rated 5.0-5.2 V; it gets 5.0-5.0 V (5V rail) | S8.2 | 0.0 V |  |  | kit supply 'Micro-USB Power Supply, 5.1V/2.5A' (R24); 5.25 V upper limit NOT sourced |
| PASS | MLX90640 rated 3.0-6.0 V; it gets 3.3-3.3 V (3V3 (HAT)) | S8.2 | 0.3 V |  |  | R19 '3-6V supply' |
| PASS | PA1010D rated 3.0-5.0 V; it gets 3.3-3.3 V (3V3 (HAT)) | S8.2 | 0.3 V |  |  | R20 '3V to 5V compatible' |
| PASS | smoke stopper rated 7.0-25.0 V; it gets 13.2-17.4 V (pack) | S8.2 | 6.2 V |  |  | R14 'Input Voltage: 7-25V' |
| PASS | monitor rated 6.0-26.1 V; it gets 13.2-17.4 V (pack) | S8.2 | 7.2 V |  |  | R17 '2-6S DC IN' |
| PASS | 9 V rail load (VTX at 25 mW) within its 2.5 A | S4.7 | 2.25 A |  |  | VTX at 25 mW: 0.25 A (R9 '25mW: 250mA'); rail 2.5 A (R2 '9V 2.5A') |
| NEEDS REAL PARTS | 5 V rail (3 A) carries the Pi, receiver, camera and sensors | S8.6 |  |  |  | no published current for: Pi Zero 2 W, receiver, camera, MLX90640 + PA1010D |
| PASS | Iron (65 W) on the 24 V 5 A adapter | S3.2 | 2.29 A |  |  | 65 W / 24 V = 2.71 A of 5 A (buy list (live page, iron-psu): 'SHNITPWR 24 V DC 5 A 120 W power supply for the iron (5.5 x 2.5 mm plug)') |
| PASS | Charge current 1.0 A is within 1C for the 1500 mAh packs | S5.3b | 0.5 A |  |  | 1C = 1.5 A (R12 1500 mAh); charger: ToolkitRC M7 manual V1.0 (the M7AC's own manual not read) 'set the charging rate of 1-2C', 'step by 0.1A' (2026-11-04: the M7AC replaced the M4AC) |
| PASS | All-up weight: 512 g from the page's sourced weights + 46 g estimated = about 558 g | S8.6 |  |  |  | estimates: legs: 8 aluminium standoffs (ESTIMATED 1.0 g each); legs: 4 rubber feet (ESTIMATED 1.0 g each; the listing's weight line is a typo); Pi pad, 6 nylon standoffs, screws, zip ties (ESTIMATED 6 g); Qwiic HAT + 2 cables (ESTIMATED 6 g; not weighed on the page); micro-USB pigtail (ESTIMATED 5 g); wires, XT60, solder, capacitor (ESTIMATED 15 g); GPS cable extension: 4 x 120 mm 26 AWG, 8 joints, heat shrink (ESTIMATED 2 g) |
| PASS | Every replayed action id is in STEP-TRUTH.md |  |  |  |  | 51 ids |
| PASS | Every replayed action has a button in the 3D models |  |  |  |  | 55 model actions |
| PASS | Every 3D action id is in STEP-TRUTH.md |  |  |  |  | all found |
| PASS | Every 3D action id is tagged on the page |  |  |  |  | 55 page ids |
| PASS | Approved wording changes are on the page |  |  |  |  | all applied |
| PASS | Every number in a 3D chip also appears in its page line |  |  |  |  | no chip adds a number |
| PASS | Every direction word in a 3D chip (CW, front, up...) is in its page line |  |  |  |  | none added |
| PASS | M1-M4 positions and spins match Betaflight's props-in diagram (R28) | S2.3 |  |  |  | M1 rear right CW; M2 front right CCW; M3 rear left CCW; M4 front left CW |
| PASS | Motor positions in the model axes (+X front, +Y left) match their names | S2.3 |  |  |  | {"M1": [-84.85281374238569, -84.85281374238569], "M2": [84.85281374238569, -84.85281374238569], "M3": [-84.85281374238569, 84.85281374238569], "M4": [84.85281374238569, 84.85281374238569]} |
| PASS | Tap-to-name prop labels say CW on M1/M4 and CCW on M2/M3 | S8.4 |  |  |  | Prop on M1: clockwise (CW) prop; Prop on M2: anticlockwise (CCW) prop; Prop on M3: anticlockwise (CCW) prop; Prop on M4: clockwise (CW) prop |
| PASS | Each motor's ESC pads are on its own corner (GEPRC manual R1) | S3.2 |  |  |  |  |
| PASS | The page and the 3D chip put CW props on the motors the design spins CW (and CCW on the rest), and name each motor's corner as the design does | S8.4 |  |  |  | M1 rear right CW; M2 front right CCW; M3 rear left CCW; M4 front left CW |
| PASS | Buy list 'RadioMaster Pocket ELRS radio, charcoal' is used by a step |  |  |  |  | used in S4.5, S5.1 |
| PASS | Buy list 'RadioMaster Pocket 18650 battery pair' is used by a step |  |  |  |  | used in S5.1; also Stage 3 checklist (charge the cells in the radio) and S5.1 |
| PASS | Buy list 'Flywoo tool kit with iron and multimeter' is used by a step |  |  |  |  | used in S2.1, S2.2, S2.3, S3.0, S3.1, S3.2, S3.3, S3.4, S4.1, S4.3, S4.3b, S4.8, S4.9, S6.1, S6.2b, S7.4b |
| PASS | Buy list 'iFlight smoke stopper, XT30/XT60' is used by a step |  |  |  |  | used in S5.4b, S8.2 |
| PASS | Buy list 'RVS LiPo storage bag' is used by a step |  |  |  |  | used in S5.3c |
| PASS | Buy list 'Heat shrink 6 mm x 150 mm, black' is used by a step |  |  |  |  | used in S3.3, S7.4b; also Stage 2 checklist (insulate the pigtail), S3.3, S7.4b |
| PASS | Buy list 'Heat shrink 3 mm x 150 mm, clear' is used by a step |  |  |  |  | used in S6.2b |
| PASS | Buy list 'Zip ties 3 mm x 100 mm, 100 pack' is used by a step |  |  |  |  | used in S7.4, S7.6 |
| PASS | Buy list 'Nylon M2.5 x 12 mm standoff set (4 per pack)' is used by a step |  |  |  |  | used in S7.3 |
| PASS | Buy list 'Micro-USB cable, right angle, 24 AWG' is used by a step |  |  |  |  | used in S7.4b; also Stage 2 checklist (build the pigtail) and S7.4b |
| PASS | Buy list 'SHNITPWR 24 V DC 5 A 120 W power supply for the iron (5.5 x ' is used by a step |  |  |  |  | used in S3.2, S3.3, S4.9, S6.1, S6.2b, S7.4b |
| PASS | Buy list 'Permatex Blue 242 threadlocker' is used by a step |  |  |  |  | Step 2 parts line: 'Threadlock (only if the manual says so)' |
| PASS | Buy list 'Raspberry Pi Zero 2 WH kit (Pi, 32 GB card, reader, power su' is used by a step |  |  |  |  | used in S6.0 |
| PASS | Buy list 'Spare microSD card for the Pi (SanDisk Ultra 32 GB, set up l' is used by a step |  |  |  |  | used in S6.0 |
| PASS | Buy list 'Pimoroni MLX90640 thermal camera, 55 degree' is used by a step |  |  |  |  | used in S6.1 |
| PASS | Buy list 'Pimoroni PA1010D GPS board' is used by a step |  |  |  |  | used in S6.1 |
| PASS | Buy list 'SparkFun Qwiic HAT + 2 jumper cables (US shop)' is used by a step |  |  |  |  | used in S6.2, S6.2b |
| PASS | Buy list 'TBS Source One V6 5-inch frame' is used by a step |  |  |  |  | used in S2.1 |
| PASS | Buy list 'Emax ECO III 2207 1900KV motors' is used by a step |  |  |  |  | used in S2.3 |
| PASS | Buy list 'Gemfan 51499 propellers (set of 4)' is used by a step |  |  |  |  | used in S8.4 |
| PASS | Buy list 'Kevlar battery straps, 2 pack' is used by a step |  |  |  |  | used in S7.4, S7.7 |
| PASS | Buy list 'Flywoo Ultra Grip battery pad' is used by a step |  |  |  |  | used in S7.7 |
| PASS | Buy list 'VIFLY Finder 2 lost-drone beeper (its own battery)' is used by a step |  |  |  |  | used in S4.9 |
| PASS | Buy list 'LED COB strip, 4S, 1 m' is used by a step |  |  |  |  | not used by a step; exempt: stage 8 is optional (Optional extras) |
| PASS | Buy list 'GEPRC TAKER F405 BLS 50A flight stack' is used by a step |  |  |  |  | used in S3.0, S4.1 |
| PASS | Buy list 'RadioMaster RP1 V2 receiver' is used by a step |  |  |  |  | used in S4.1 |
| PASS | Buy list 'GNB 1500 mAh 4S HV LiPo (the learning pack)' is used by a step |  |  |  |  | used in S5.3c |
| PASS | Buy list 'More Volts 4S 5000 mAh Li-ion pack (long, gentle searches)' is used by a step |  |  |  |  | used in S5.3c |
| PASS | Buy list 'ToolkitRC M7AC charger (LiPo, LiHV and Li-ion)' is used by a step |  |  |  |  | used in S5.2 |
| PASS | Buy list 'Small home fire extinguisher for electrical fires: Garrison ' is used by a step |  |  |  |  | Stage 5 note: 'Before your first charge: buy a small home fire extinguisher rated for electrical fires. ... Keep it within reach of the charging spot' |
| PASS | Buy list 'RunCam Phoenix 2 Special Edition camera' is used by a step |  |  |  |  | used in S4.3 |
| PASS | Buy list 'TBS Unify Pro 5G8 HV video transmitter' is used by a step |  |  |  |  | used in S4.3 |
| PASS | Buy list 'TBS Triumph PRO SMA 5.8 GHz antenna' is used by a step |  |  |  |  | used in S4.4 |
| PASS | Buy list 'Skyzone M5F video monitor with recorder' is used by a step |  |  |  |  | used in S8.2 |
| PASS | Buy list '32 GB microSD card for the monitor recorder' is used by a step |  |  |  |  | not used by a step; exempt: stage 8 is optional (Optional extras) |
| PASS | Buy list 'Small Basic exam (Transport Canada)' is used by a step |  |  |  |  | S8.5 needs the Basic certificate |
| PASS | Buy list 'Drone registration (Transport Canada)' is used by a step |  |  |  |  | S8.5 needs the drone registered and marked |
| PASS | Buy list 'Hakko wire stripper and cutter (20 to 30 AWG)' is used by a step |  |  |  |  | used in S4.1 |
| PASS | Buy list 'Eiechip 12-piece prototype boards for soldering practice (5 ' is used by a step |  |  |  |  | Stage 1 checklist: 'practise on one of the practice boards (the Eiechip set)' |
| PASS | Buy list '26 AWG silicone wire, 1 foot lengths (5 feet to start)' is used by a step |  |  |  |  | used in S6.2b |
| PASS | Buy list 'M2.5 nylon screw, nut and standoff set (420 pieces)' is used by a step |  |  |  |  | used in S7.4 |
| PASS | Buy list 'Scotch heavy-duty foam mounting tape, 1.2 cm x 1.9 m' is used by a step |  |  |  |  | used in S4.9, S7.3 |
| PASS | Buy list 'USB-C data cable (flight controller to your laptop)' is used by a step |  |  |  |  | used in S4.5, S4.6, S8.3 |
| PASS | Buy list 'Gemfan 51499 spare propeller sets (4 per set)' is used by a step |  |  |  |  | optional by the list's own note: 'buy these after the first flight, for the first crash' |
| PASS | Buy list 'Flywoo X30 waterproof invisible coating spray, 56.7 g (optio' is used by a step |  |  |  |  | not used by a step; exempt: stage 8 is optional (Optional extras) |
| PASS | Buy list 'M3 x 25 mm knurled aluminium standoffs, 10 pack (back legs)' is used by a step |  |  |  |  | used in S7.8 |
| PASS | Buy list 'M3 x 28 mm knurled aluminium standoffs, 10 pack (front legs)' is used by a step |  |  |  |  | used in S7.8 |
| PASS | Buy list 'Lumenier M3 rubber landing feet, 8 pack (US shop)' is used by a step |  |  |  |  | used in S7.8 |
| PASS | Buy list 'M3 set screw assortment, 200 pieces (includes 20 x M3 x 10 m' is used by a step |  |  |  |  | used in S7.8 |
| PASS | Buy list 'M3 x 10 mm steel button-head screws, 10 pack (for the 4 rubb' is used by a step |  |  |  |  | used in S7.8 |
| PASS | Every buy line in a required stage is used by a step or a stage checklist (optional stages 8 exempt) |  |  |  |  | 50 lines checked, from index.html #buy-data |
| PASS | Enough foam-tape: steps use 1, the list gives 1 |  | 0.0 pieces |  |  |  |
| PASS | Enough heat-shrink: steps use 4, the list gives 10 |  | 6.0 pieces |  |  |  |
| PASS | Enough heat-shrink-3mm: steps use 1, the list gives 2 |  | 1.0 pieces |  |  |  |
| PASS | Enough legs-25: steps use 4, the list gives 10 |  | 6.0 pieces |  |  |  |
| PASS | Enough legs-28: steps use 4, the list gives 10 |  | 6.0 pieces |  |  |  |
| PASS | Enough legs-feet: steps use 4, the list gives 8 |  | 4.0 pieces |  |  |  |
| PASS | Enough legs-footscrews: steps use 4, the list gives 8 |  | 4.0 pieces |  |  |  |
| PASS | Enough legs-setscrews: steps use 8, the list gives 20 |  | 12.0 pieces |  |  | list item: 'includes 20 x M3 x 10 mm' |
| PASS | Enough liion-5000: steps use 1, the list gives 1 |  | 0.0 pieces |  |  |  |
| PASS | Enough m25-screws: steps use 6, the list gives 420 |  | 414.0 pieces |  |  | list item: '420 pieces' (screws, nuts and standoffs together) |
| PASS | Enough motors: steps use 4, the list gives 4 |  | 0.0 pieces |  |  |  |
| PASS | Enough props: steps use 4, the list gives 8 |  | 4.0 pieces |  |  | list item: 'set of 4' |
| PASS | Enough spare-sd: steps use 1, the list gives 1 |  | 0.0 pieces |  |  |  |
| PASS | Enough standoffs: steps use 6, the list gives 8 |  | 2.0 pieces |  |  | list item: '4 per pack' |
| PASS | Enough straps: steps use 2, the list gives 2 |  | 0.0 pieces |  |  |  |
| PASS | Enough zip-ties: steps use 8, the list gives 100 |  | 92.0 pieces |  |  |  |
| PASS | Every part drawn in the 3D models comes from a buy line (or is named as not bought: your laptop, the mug, guide marks) |  |  |  |  | 559 drawn parts in 9 models from 39 buy lines; Step 1 counts: batteries 1 of 1, liion-5000 1 of 1, charger 1 of 1, radio 1 of 1, monitor 1 of 1; not bought: arrow_, cg_, clearance_, cone_pilot, cone_thermal, cutaway_, fireproof_surface, glasses_, hand_, laptop_tag, mug_, order_list; stack box contents: page Stage 5: 'The stack box also holds: the four long (M3 x 30) stack screws, the soft grommets, the 8-wire cable, the XT60 lead and the capacitor' |
| NEEDS REAL PARTS | Parts the models draw that the page says to check in the box | S5.2 |  |  |  | charge_lead: the M7AC listing names only the charger; its output lead to the pack's XT60 is not listed: check the box; charger_mains_cable: page Stage 5: 'M7AC charger and a mains cable (the listing names only the charger: check the box)' |

## Inputs (plain files, for anyone who wants to write their own checker)

All in `docs/build-truth/geometry/`: `parts.json` (every size, its accuracy tag and source), `weights.json`, `frame_outlines.json` (TBS drawing), `positions.json`, `routes.json` (cable paths), `assembly.json` (the build order, what each action needs and makes), `netlist.json` (every connection and connector), `power.json`, `tolerances.json`, `arrival.json`, `buy_list.json` (copy of the page's buy list). Units mm and g; +X forward, +Y left, Z up; origin = stack centre on the underside of the bottom plate. The inputs are written by `scripts/build/verify_inputs.py`.
