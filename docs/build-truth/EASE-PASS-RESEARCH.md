# Ease pass: research for the beginner testers' rows (Opus)

Plan: `beginner-test/ease-pass-plan.md` (a planning file outside this repo) (91 rows). This file covers the 48 rows that name Opus or are research or model rows, in the plan's batch order. For each: what I found, where (URL and the exact words), and a status:
- **FOUND**: a primary source says it.
- **PARTLY**: some of it is sourced; the rest is marked.
- **NOT FOUND [REQUIRES REAL INPUT]**: nobody publishes it; it becomes an arrival check.
- **TRUTH**: worked out from the design files (the model, the simulation, the build check), not from a listing.
- **CHECKED**: definitions or wording checked against the listings.

Wording proposals are in `CHANGE-REQUESTS.md` under "Ease pass", all NOT approved.

## Batch B: Stage 1 (soldering, iron, multimeter, pigtail)

### B1 How the 24 V adapter connects to the iron
Status: PARTLY
- Rotor Village, Flywoo tool kit (https://rotorvillage.ca/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron/, saved in sources/rv-toolkit.txt).
  - Iron: "Working voltage: DC12--24V", "Temp Range: 220-400 C", "Power Interface: 5.5*2.5", "Work Current: >=1.5A", "Power: 65w".
  - Box: "1x XT60 to DC Cable"; features: "XT60 Plug power cable".
  - Meter: "Powered by 2 x 1.5V batteries (NOT included)".
- The adapter on the list is "24 V 3 A power adapter for the iron (5.5 x 2.5 mm plug)" (buy list, Abra). **Same plug size as the iron's power interface, so the adapter plugs straight into the iron.**
- The "XT60 to DC Cable" is the other way to power the iron: XT60 into a flight pack, round plug into the iron. That is my reading of the cable's name; no listing shows a picture of its ends. A second listing (ht-dron.pl, "Kabel XT60 do DC", "Złącze zasilania: 5,5 × 2,5 mm") says the same.
- **Can it run from a charged 4S pack?** Yes by the numbers. A 4S LiHV pack is about 13.2-17.4 V (4 x 3.3 to 4 x 4.35 V, R12/R42), inside "DC12--24V". At 15 V the iron gets less than its full 65 W (my arithmetic: power rises with voltage). Not on the page today; a choice for Shad.
- **Polarity marking:** NOT FOUND [REQUIRES REAL INPUT]. Rotor Village, ht-dron.pl and getfpv.com do not state it. The only polarity found was for a different kit (NewBeeDrone V1.7: "inner positive and outside negative"). Flywoo's own page answered 403 to me. Arrival check "Iron adapter polarity" already exists.
- **Heat-up time:** NOT FOUND [REQUIRES REAL INPUT]. Listings only say "fast heating" ("szybkim nagrzewaniem", ht-dron.pl), with no number. New arrival note: time it on first use.

### B6 The micro-USB power pigtail
Status: FOUND (cable), TRUTH (lengths)
- PiShop listing (https://www.pishop.ca/product/micro-usb-cable-mm-right-angle-micro-usb-24-awg-2-m-6-ft/, saved in sources/ps-usb.txt):
  - "This here is your standard A to micro-B USB cable, for USB 1.1 or 2.0, but with a twist! ... there's a right angle bend"
  - "We got cables with extra-beefy 24 AWG power wires, and 28 AWG data lines"
  - "Length: 56.25" / 1.42m"
  So: keep the right-angle micro-B end (it goes into the Pi) and cut off the big USB-A end. **The two thicker wires are power, the two thinner are data.**
- Micro-B pin order (Wikipedia, USB hardware, "Mini- and Micro-USB pin assignments"): pin 1 VBUS "+5 V", red; pin 2 D- white; pin 3 D+ green; pin 4 ID "only used in connectors, not cables"; pin 5 GND black. Colours are "Usual USB color-coding", not promised for this cable, so the guide uses thickness plus a meter check, not colour alone.
- Meter setting: the kit's ZOYI meter lists resistance "0.1Ω - 40MΩ" but no continuity beep in any listing I opened (Rotor Village, ht-dron.pl). So the check uses the lowest ohms range (a joined wire reads close to 0 Ω). Arrival check "Multimeter beep setting" covers the beep.
- Length to keep, TRUTH: the route from the FC's 5V pad to the Pi's power socket is about 150 mm (positions.json, NET-pigtail). Keeping 20 cm leaves room to route it out of the prop circles and to redo a joint once.
- Heat shrink: 3 mm clear for each thin data wire's cut end (Rotor Village listing, "Shrink rate: 2:1"). The 6 mm black goes over the two power joints at the FC end in Step 7.

## Batch A: whole guide (order, cross-references, words)

### A3 Which Step 7 actions are "now" and which come "after the first hover"
Status: TRUTH (assembly.json order, verify_build replay)
- NOW, before the first hover (bare quad):
  - S7.6: route the quad's own cables out of the prop circles.
  - S7.7, first part: battery pad, battery and strap for the bare quad.
  - S7.3, dry fit only: "Hold the real parts in place first". Measure and mark, fix nothing.
  - S7.5: read the rule.
- AFTER the first hover (S8.5):
  - S7.3: fix the pad and standoffs.
  - S7.4: zip ties and the second strap.
  - S7.4b: solder the pigtail to the FC.
  - S7.8: legs.
  - S7.7, second part: battery forward to about 2 mm from the GPS.
  - Then S8.6.
- **Found while doing this, a real gap.** S7.7's approved wording ("until it is about 2 mm from the GPS board") cannot apply before the first hover, because the GPS is not fitted yet.
  - Bare quad, TRUTH (verify_build weights, without the Pi, thermal camera, GPS, HAT, pad, pigtail, extension or legs): about 502 g.
  - It balances with the battery about **7 mm ahead** of the frame centre (balance point -2.1 mm at battery 0, -1.3 mm at 2.5 mm).
  - Nothing is in the way: the pack's front edge would be 46 mm ahead, and the top plate reaches 75 mm.
  - Wording in change request 48.

### A4 Words used in this guide (definitions checked)
Status: CHECKED. A part's own listing is cited where it defines the word; "common usage" means standard hobby meaning with no single listing.
- **Betaflight**: the free program on your laptop that sets up the flight controller. Its firmware target is "GEPRCF405" (R2 "Firmware Target: GEPRCF405").
- **ESC (speed controller)**: the board that drives the four motors. Here the 50 A four-in-one board in the stack (R2 "GEP-BLS50A-4IN1 ESC").
- **FC (flight controller)**: the board with the gyro that keeps the drone level and talks to the receiver (R2 product "GEPRC TAKER F405 BLS 50A Combo Stack"; F405 is the FC).
- **The stack**: the FC and ESC stacked on the same four screws (R2 "Combo Stack").
- **VTX (video transmitter)**: sends the camera picture to the monitor (R8 "TBS Unify Pro 5G8 HV").
- **Receiver**: gets your stick commands from the radio (R7 "RadioMaster RP1 V2 ... ExpressLRS 2.4GHz Receiver").
- **ELRS (ExpressLRS)**: the radio link system the radio and receiver both use (R7, R13).
- **UART**: a numbered pair of pads (TX and RX) on the FC for talking to one device; the FC has 6 (R2 "UART: 6").
- **TX / RX**: send / receive. A TX pad always goes to the other device's RX (common usage; netlist check NET-txrx).
- **AWG**: wire thickness; a bigger number is thinner (common usage; motor leads "20# AWG", R5; the thin wire is 26 AWG).
- **4S**: a battery of 4 cells in series (R12 "4S").
- **LiPo / LiHV**: lithium polymer battery / the high-voltage kind charged to 4.35 V a cell (R12 "15.2V (LiHV)"; R42 "4.35V LiHv").
- **Windings**: the copper wire coils inside a motor (common usage; S2.4).
- **Threadlock**: liquid that stops a screw working loose; blue can still be undone (buy list "Permatex Blue 242").
- **Standoff**: a metal or nylon post with threads that holds two plates apart (R3 "M3 30mm standoff").
- **Knurled**: with a gripping texture on the outside (rv-so25 "Knurled Black Textured Stand-off").
- **Set screw**: a screw with no head, threaded all the way (buy list "M3 set screw assortment").
- **Grommets**: soft rubber rings the stack sits on to soak up vibration (R2 "8 x Silicone grommets", "φ4mm hole becomes φ3mm after using a silicone shock-absorbing circle").
- **Tinning**: putting a thin layer of solder on a pad or wire end before joining them (common usage).
- **Polarity**: which side is + and which is - (common usage).
- **Solder bridge**: solder that joins two pads that must stay separate (common usage).
- **XT60**: the yellow battery plug on the packs and the quad (R12 "Discharge Lead: 85mm, XT60").
- **Smoke stopper**: a plug-in fuse for the first power-up; "Input Voltage: 7-25V", cuts out at 1.2 A (R14).
- **OSD**: the text drawn on top of the video (battery, timer); the FC has one (R2 "BetaFlight OSD w/ AT7456E chip").
- **CRSF**: the language the receiver uses to talk to the FC; you pick it in Betaflight (common usage; page S4.5).
- **Bind**: pairing the radio with the receiver so it only listens to your radio (common usage; elrs-bind source).
- **Flash**: writing new firmware onto a board (common usage).
- **I2C, Qwiic, HAT, header**:
  - I2C: the two-wire link the sensors use (R19, R20 "I2C").
  - Qwiic: SparkFun's small 4-pin plug for I2C (R21, R22).
  - HAT: a board that plugs onto the Pi's 40 pins (R21).
  - Header: a row of metal pins (common usage).
- **Payload**: everything the drone carries for the job: Pi, thermal camera, GPS (common usage).
- **Bare quad**: the drone without the payload (common usage).
- **Hover**: staying still in the air (common usage).
- **Arm / disarm**: switching the motors live or dead with a radio switch (common usage; Betaflight Modes tab).
- **Throttle**: the stick that sets motor speed (common usage).
- **AGL**: above ground level (Transport Canada usage).

### A6 Sentences that point at a picture, the 3D view or a file
Status: TRUTH (page text listed by script)
- S7.3: "Run the GPS cable as the 3D view shows". The route is on the drone's **right-hand side** (looking from the tail forward), from routes.json (y = -9 to -17 mm). Words in change request 49.
- S7.5: "(design simulation, docs/build-truth/SIMULATION.md)". The file path goes; say "(from the design check)" instead. Change request 49.
- S8.4: "as the Betaflight diagram shows". Already says the motors in words (change request 41, approved); no change.
- "check the 3D model in Betaflight tilts the same way". That is Betaflight's own 3D view on the laptop, not ours; fine as it is.
- "Look at the picture" (top of the guide) is the Builder's.

### A9 Facts that live only in a picture or the 3D view
Status: TRUTH. These are the facts my models show that the step text does not say, with the words to add.
- **Leg holes** (S7.8, "spare standoff holes"):
  - Back pair: the two 30 mm standoff holes at the very back of the bottom plate, about 81 mm behind the stack centre and 11 mm either side.
  - Front pair: the two 22 mm standoff holes at the front of the middle plate, about 53 mm ahead and 15 mm either side.
  - Source: TBS drawing via frame_outlines.json.
- **Zip-tie windows** (S7.4, "windows nearest the Pi"): the two slots on the bottom plate's centre line about 32 and 47 mm behind the stack centre (windows 3 and 1, frame_outlines.json; the model's zip ties use these). The GPS cable goes up through the one at 47 mm.
- **ESC motor pads** (S3.2): each motor's three pads are on the ESC's edge nearest that motor; the battery pads are at the back (GEPRC manual R1; check X-esc-pads).
- **Where the pigtail goes on the FC** (S7.4b): in the model, a 5V and GND pad pair on the FC's right-hand edge, about 4 mm ahead of centre (fc_pad_5v_pi, positions.json). That position is drawn, not sourced; the real pads come from the GEPRC diagram (see D1/G3).
- **Camera tilt**: about 10 degrees up, already in words (S4.3b).

## Batch C: Step 8 (first flight, props, tests)

### C1 Take-off, hover, landing and checking the motors
Status: PARTLY
- TheDroneFlight, "First FPV Flight Checklist" (https://thedroneflight.com/blogs/news/first-fpv-flight-checklist-pre-flight-setup-safety-checks-beginner-tips): "Slowly increase throttle to hover (mid-stick)", "Practice hovering in place for 30 seconds", "Land when battery reaches 3.7V per cell", "Disarm if you lose orientation or control". It gives no hover height and nothing on motor heat.
- Motor heat: "warm, not hot" and "one motor cold while the others are warm may mean that ESC or motor has failed" appeared only in search-result summaries. The pages behind them (fpvger.notion.site) did not load. So: NOT FOUND in a page I opened. The wording below compares the motors with each other and gives no temperature.
- Betaflight setup guide (https://betaflight.com/docs/wiki/getting-started/setup-guide): "`ARM` activates the PID loop and allows the motors to spin." Disarm before touching anything.
- The page's own rules (certificate, registration, uncontrolled airspace, 30 m, 122 m) stay as they are; only the missing verb is fixed.

### C4 Betaflight download, motors tab, motor numbers
Status: FOUND
- Betaflight setup guide:
  - "You need the Betaflight Configurator installed on your PC." Link https://github.com/betaflight/betaflight-configurator/releases/latest. The site menu also links the web version, "Betaflight App", https://app.betaflight.com/
  - Motors: "Plug in a battery, tick the confirmation checkbox, and slowly raise the `Master` slider." and "**Remove propellers before testing motors.**"
- Betaflight Motors tab (https://betaflight.com/docs/wiki/app/motors-tab, saved): "Motor direction - opens a motor direction test tool which allows you to gently spin motors and easily reverse"; "Props should be removed before testing motors. Once a battery is connected and the ESC is online the motors can be spun using the sliders."
- Motor numbers in words: change request 40 (approved). M1 rear right, M2 front right, M3 rear left, M4 front left, seen from above with the camera at the front (R28).

### C6 Angle mode and the tilt test
Status: FOUND (except a throttle number)
- Betaflight setup guide:
  - "In ANGLE mode, without propellers, throttle at approximately 30% : tilt the aircraft so one motor points toward the ground — does that motor spin up and stay at high RPM until the craft is levelled again?"
  - "`ANGLE` — A self-levelling mode useful for beginners or as a recovery aid."
  - Modes tab: "Click **Add Range** — this creates a range slider tied to an AUX channel."
- How 30 % shows in the Receiver tab: NOT FOUND. Betaflight's Receiver tab page gives no number range. The wording says "about a third of the way up the throttle stick" instead.

### C8 NAV Drone
Status: FOUND (link); the pass rule stays the page's
- NAV CANADA (https://www.navcanada.ca/en/flight-planning/drone-flight-planning.aspx): the app is "NAV Drone"; web version https://portal.navdrone.ca; Apple https://apps.apple.com/ca/app/nav-drone/id1541014888; Google https://play.google.com/store/apps/details?id=ca.navcanada.navdrone. Its wording: "discover where you can fly" and "request permission to fly in airspace controlled by NAV CANADA".
- The page does not say what a pass looks like on the map. So the guide keeps its own rule (the distances already on the page) and points to the Before you fly card, as the plan says.

### C9 How to know the GPS is ready
Status: FOUND (payload code)
- Shad-Drone-Payload/payload.py lines 83-84 print: "Ground height set to ... m above sea level from the first GPS fix. Fly only after this line appears."
- README step 3: "Put the GPS antenna outside with a clear sky view and wait for a fix." No waiting time is given anywhere; the guide says "wait for that line".

### C10 Heat test with a mug of hot water and a hand (Shad: no hot plate)
Status: TRUTH (simulation with thermal_preview.py maths), assumptions stated
Assumptions (mine): water just poured from a kettle, about 80 C at the surface; a hand about 33 C. The camera points straight down at it with the lens 0.5 m or 1 m away.

| Target | Distance | Size of one pixel | Hottest pixel | Detector (60 C, 3 pixels) |
|---|---|---|---|---|
| Mug, 8 cm across, 80 C | 0.5 m | 1.6 x 1.3 cm | about 80 C | fires (21 pixels at 60 C or more) |
| Same | 1 m | 3.3 x 2.6 cm | about 80 C | fires (5 pixels) |
| Mug cooled to 60 C | 0.5 m | | about 61 C | does not fire |
| Hand, 33 C | 0.5 m / 1 m | | about 33 C | does not fire, as expected |

Pass: the mug is reported as a hot spot and the hand is not. If the mug is not found, refill with fresh hot water and try again at 0.5 m.

## Batch E: Step 3 (solder the stack)
GEPRC "TAKER F405 BLS 50A Stack" diagram: the manual is a drawing-only PDF, read from the saved images in sources/img/man/ (overview.png, t21.png, t31.png). Listed at https://geprc.com/electronics/fc-manual/ (R1).

### E1 Which board is which, and which end is the rear
Status: FOUND
- The stack box holds "1 x Flight Controller", "1 x ESC" (Rotor Village listing, https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/, "Package Contents").
- GEPRC diagram:
  - The ESC is the board with the big copper motor pads on two edges ("MOTOR 1" ... "MOTOR 4"), two large battery pads with the red and black leads on a third edge, and an 8-pin socket on the edge opposite the battery pads.
  - The FC is the board with the USB socket and the small plugs.
- Rear: the battery pads' edge is the rear. The diagram puts MOTOR 1 and MOTOR 2 on one side and 3 and 4 on the other, with the battery leads between M3 and M1, the rear motors. That matches M1 rear right and M3 rear left (R28).
- Screws and nuts: "4 x M3*30 Screws", "8 x Nylon nuts", "8 x Silicone grommets". A grommet sits under and over each board's hole (the listing: "φ4mm hole becomes φ3mm after using a silicone shock-absorbing circle"). Which way the screws go in is NOT FOUND: the build check's "Stack screw length" arrival test covers it.

### E2 Tinning and the motor pads
Status: PARTLY
- Pads: each motor has three pads on the ESC edge next to that motor (diagram). The order of a motor's three wires does not matter for wiring: a motor that spins the wrong way is reversed in Betaflight's Motor direction tool (Betaflight Motors tab page; change request 28, approved).
- Tinning, a good joint, solder bridges: common practice, no listing. Words for the Builder, plainly marked as general advice: "tin = melt a thin layer of solder onto the pad and onto the stripped wire end first"; "a good joint is smooth and shiny"; "a bridge is solder joining two pads; remove it with the iron and the kit's tweezers".

### E3 Are the XT60 lead and capacitor in the stack box?
Status: FOUND: yes, both
- Rotor Village, stack "Package Contents": "1 x Capacitor", "1 x XT60 Power cable" (also "1 x Flight Controller Adapter Cable", "1 x Camera connection cable", "2 x sh1.0 4pinsilicone cable", "1 x DJI Air Unit Adapter Cable"). So nothing to add to the buy list.
- Capacitor rating: "1x 35V 1000uF capacitor" (Oscar Liang's review of this stack, R34). 35 V is above the 4S maximum of 17.4 V.
- Pads: GEPRC diagram shows the red lead on one battery pad and the black on the other. Polarity marks are printed beside the pads ("−" readable on one). Check + and - with the meter on the XT60 lead before soldering: red probe on the XT60's + pin. That is the page's own rule and the plan's wording.

### E4 What the smoke stopper's light means
Status: FOUND
- Rotor Village, iFlight Smart Smoke Stopper (https://rotorvillage.ca/iflight-smart-smoke-stopper-xt30-xt60/, saved as sources/rv-smoke.txt):
  - "The LED indicator turns solid green in normal situation,"
  - "The LED indicator turns off and starts beeping in abnormal situation."
  - Purpose: "A smoke stopper can help avoid damage when you power on a mini quad drone for the first time."
- So: green = fine; light off and beeping = unplug the battery at once and look for a short. The page's "cuts out at 1.2 A" is from R14.

### E5 How long to cut each motor wire
Status: TRUTH (estimated pad positions), PARTLY
- Motor leads "Lead: 20# AWG 120mm" (R5).
- Route from each motor to its three pads, along the arm with 10 % for bends (verify_build positions): about 95, 99 and 104 mm, so 16 to 25 mm spare. **The three wires need different lengths**, so "the same length for all three" would be wrong.
- Words: lay each wire along the arm to its own pad, add about 5 mm, cut. The 5 mm is my choice. The pad positions in the model are estimated (ESC "pads drawn", parts.json), so the cut must follow the real pad.
- Strip length: NOT FOUND in a listing. 2 mm is common practice for pads this size; marked as general advice.

### E6 The 8-wire cable
Status: FOUND (sockets), general advice (plug direction)
- GEPRC diagram: the ESC's 8-pin socket is labelled "NC, CUR, M4, M3, M2, M1, BAT, GND". The FC has a matching row "R4, CUR, M4, M3, M2, M1, BAT, GND" next to its CAM and LED pads. The box cable is "1 x Flight Controller Adapter Cable".
- Plug direction: these small plugs fit one way only. "If it does not slide in, turn it round; never force it" is general advice. No GEPRC text says it.
- "FC arrow": the diagram shows no arrow I can read. NOT FOUND [REQUIRES REAL INPUT]: look on the real FC for an arrow or "front" mark; if there is one, it usually points forward, to the camera end (usual meaning, not from GEPRC).

## Batch G: Step 7 (mount and balance)

### G1 What the "flat foam or rubber pad" is
Status: NOT FOUND [REQUIRES REAL INPUT] (thicknesses), TRUTH (what the pad must do)
- Flywoo Ultra Grip pad (https://rotorvillage.ca/flywoo-ultra-grip-super-sticky-battery-pad/): "This durable battery pads made from PU material", "1 x Pad", "Now: $3.99", "259 in stock". No size or thickness on the page. It is also already needed under the battery (S7.7).
- Scotch heavy-duty foam mounting tape, 1.2 cm x 1.9 m (Canadian Tire): no thickness in any listing I could find. Canadian Tire's pages do not load for my tool, and search results give only width and length (and two different weight ratings, 2 lb and 15 lb).
- What the pad must do (TRUTH, my design): keep the Pi's standoffs and the thermal camera off bare carbon, and cushion them. The parts are held by the zip ties and strap, not by the pad. Any thickness from about 1 to 4 mm keeps the payload's lowest point well above the legs' feet (build check CLEAR-ground: 15.6 mm to spare at 2 mm).
- Suggestion for Shad (decision): use two layers of the foam mounting tape already on the list, stuck to the plate, with the backing left on the side the standoffs touch. Measure the thickness on arrival.

### G2 How the thermal camera is fixed
Status: TRUTH: the current wording cannot be done as written
- The page: "fix it by those to short standoffs on the pad". The model (lib_quad.pi_payload) draws two short standoffs from the pad to the camera's two holes. Nothing fixes the standoffs to the pad: an M2.5 standoff cannot screw into foam, and there is no window near the camera (it sits about 2-21 mm ahead of the stack centre; every bottom-plate window is more than 23 mm behind it, frame_outlines.json).
- Options for Shad:
  a) Foam tape the camera board's back straight to the pad. Lens down, header pins soldered pointing sideways or down. Needs: the Pimoroni board's back to be flat (NOT FOUND: arrival check). The build check must be re-run for the camera view, because sockets hanging below could reach into it.
  b) Drill two 2.7 mm holes in the bottom plate for M2.5 screws. The design avoided drilling.
  c) A thin strap or zip tie round the board and plate. No window is near, so it would have to go round the plate's edge.
- The M2.5 set on the list ("M2.5 nylon screw, nut and standoff set (420 pieces)") supplies screws for (b).
- **Shad chose (a) (DECISIONS.md). Camera-view re-check, ray test like simulate_design's thermal check:**
  - Set-up: the board taped flat to the pad (pad plus tape 2, 3 or 5 mm thick), lens straight down; header pins and cable plugs pointing down, 14 or 20 mm below the board; header toward the Pi or toward the front; legs and props included.
  - Result: **0.0 % of the view blocked in all 12 cases.** The lens now sits about 10-13 mm below the bottom plate, not 23 mm.
  - Sanity test of the method: plugs right under the lens block 100 %, 5 mm off 43 %, 8 mm off 14 %, 11.8 mm off 0 %.
  - The Pimoroni drawing puts the lens centre about 5.8 mm from the board's top edge and the header row at the bottom edge, roughly 15 mm apart, more than the 11.8 mm used.
  - The lowest point of the payload stays the Pi's HAT (about 29 mm below the plate).
  - `[REQUIRES REAL INPUT]`: the board's back is flat enough for tape; plug length.

### G3 The pigtail on the flight controller
Status: FOUND (pads, Pi socket)
- GEPRC diagram (t31.png): the FC has a pad group "GND, 5V, LED" on its edge, meant for an LED strip. The guide uses no LED strip (the buy line is a page fix). Those 5V and GND pads are free for the pigtail. The 5V rail is "5V 3A" (R2).
- Raspberry Pi documentation (https://www.raspberrypi.com/documentation/computers/getting-started.html): "One of the micro-USB ports is labelled PWR IN and is reserved for power input only". The Zero 2 W brief: "Input power: 5V DC 2.5A".
- Order: battery unplugged; slide 6 mm heat shrink onto each pigtail power wire; solder + to 5V and - to GND; shrink; plug the micro-USB into PWR IN. "Meter-checked" means the Stage 1 test (CR 47).

### G4 How a leg is fixed to the frame, and the 56 mm
Status: FOUND (frame hardware), TRUTH (sums)
- The leg holes are not "spare". Each one already holds a frame standoff's own bottom screw. The frame's hardware is "20X M3x10 allen screw ... 4X OD 5mm M3 30mm standoff, 4X OD 5mm M3 22mm standoff" (R3).
- To fit a leg: take out that standoff's bottom screw and screw an M3 x 10 set screw through the plate into the standoff. Which of the frame's screws sits there (M3 x 10, 12 or 14: the frame also has "4X M3x12 allen screw" and "4X M3x14 allen screw") is NOT FOUND: the TBS manual or the real frame tells. The set screw needs the standoff to take at least about 4 mm of thread. About half of it is left sticking out below. Screw the first leg standoff onto it, then a second set screw, the second leg standoff, and the foot. Build check FIT-leg-setscrew: about 4 mm of thread each side of a 2 mm plate (1 mm more than my 3 mm minimum).
- The 56 mm:
  - Back legs hang from the bottom plate: 25 + 25 + 6.3 mm foot = 56.3 mm.
  - Front legs hang from the middle plate, which is 8 mm above the bottom plate's underside: 28 + 28 + 6.3 - 8 = 54.3 mm below the bottom plate.
  - Foot "Height: 6.3mm" (gf-feet).
  - So the page's "about 56 mm" is the back legs. Both pairs are within 2 mm of each other.
- Still guesses (stay as arrival checks): the knurled standoffs threaded at both ends, and the foot screw length.

### G5 How the GPS board is fixed
Status: TRUTH (model), NOT FOUND (board back)
- The model puts the GPS board 4 mm above the top plate, which the foam tape stands for. Wording: a strip of the foam mounting tape (on the list) between the board and the carbon.
- Whether the PA1010D's back is flat enough for tape: NOT FOUND (Pimoroni lists size "approx 28x21x9mm" only, R20). Arrival check.

### G7 Zip-tie route, length and the two straps
Status: TRUTH; a real gap found (zip tie length)
- Which slots: the two on the bottom plate's centre line about 32 and 47 mm behind the stack centre (frame_outlines.json windows 3 and 1). They measure about 7 x 12 mm (window 1) and 16 x 11 mm (window 3), so a 3 or 4 mm zip tie fits.
- Route (TRUTH, my rough estimate): up through the slot, across the plate's top, down, along the plate's underside out to the Pi's edge, down past the Pi, under it, and back the other way. With the Pi 14 mm below the plate (2 mm pad + 12 mm standoffs), the loop is about 110-130 mm. That is round the Pi board only, or round the Pi and its HAT, plus the bit the zip-tie head needs.
- **The list's zip ties are "3mm x 100MM". That is too short on this estimate.** Options:
  - (a) Join two of the 100 mm ties end to end. Free; common practice, not from a listing.
  - (b) Rotor Village "Zip Ties (100pcs) - 4mm x 250MM", $12.99, shown as available (https://rotorvillage.ca/zip-ties-100pcs-4mm-x-250mm/).
- Straps: the list has "Kevlar battery straps, 2 pack". One goes round the Pi as the second lock (S7.4), one round the battery (S7.7). At the first hover only the battery strap is on.
- Cut tails flush: general advice.

## Batch F: Step 6 (Pi setup and GPS cable)

### F1 Getting the Pi ready
Status: FOUND
- Raspberry Pi documentation, Getting started (https://www.raspberrypi.com/documentation/computers/getting-started.html):
  - Imager: "download the latest version from the Raspberry Pi website" (https://www.raspberrypi.com/software/).
  - Device and OS: "In the Device tab, select your Raspberry Pi model from the list and then select Next."; "the recommended OS for your Raspberry Pi model is at the top of the list".
  - Settings: "The username must be lowercase and contain only letters, numbers, underscores, and hyphens."; Wi-Fi: "enter the SSID of the appropriate wireless network"; SSH: "turn on Enable SSH using the corresponding toggle."
  - Drive warning: "If you have more than one storage device connected to your computer, take care to choose the correct storage device." and "This prevents you from permanently erasing your data".
  - Remote use: "On first boot, the only remote access options to your headless Raspberry Pi are SSH or Raspberry Pi Connect."
- Raspberry Pi documentation, Configuration (https://www.raspberrypi.com/documentation/computers/configuration.html): I2C is "3 Interface Options > I5 I2C" in `sudo raspi-config`. On the desktop it is Preferences > Control Centre > Interfaces > I2C.
- The kit has the card and reader: "Raspberry Pi Zero 2 WH kit (Pi, 32 GB card, reader, power supply)" (buy list).

### F2 Staggered joints on the GPS cable
Status: TRUTH (my numbers; the model staggers the same way)
- Cut the wires at different distances from the Qwiic plug, 2 cm apart: red 5 cm, blue 7 cm, yellow 9 cm, black 11 cm.
- Each 12 cm piece adds about 11 cm once both ends are lapped (5 mm per joint, my estimate). So each wire's second joint lands about 11 cm further on (at about 16, 18, 20 and 22 cm). Those are staggered too. All four pieces stay 12 cm.
- Strip about 5 mm on each end to be joined. That is the overlap my length check assumes (joint_loss 5 mm, GPS_EXT in parts.py). With it, the build check WIRE-qwiic-gps gives about 21 mm to spare.
- "All red": the extension pieces are red because the only thin wire on the list is red. Each wire's two ends keep their own colour, and only the middle piece is red.

### F3 Checking the sensors on the bench
Status: FOUND
- Shad-Drone-Payload/README.md line 31: "Check that both sensors answer after the reboot (camera at 0x33, GPS at 0x10): `sudo i2cdetect -y 1`." The table it prints shows 33 and 10 at those places.
- Which socket is power: "One of the micro-USB ports is labelled PWR IN and is reserved for power input only" (Raspberry Pi docs). The kit's supply is "Micro-USB Power Supply, 5.1V/2.5A" (R24).
- GPS fix and sky: README step 3, "Put the GPS antenna outside with a clear sky view and wait for a fix." The address check (0x10) needs no sky; the fix does.

### F6 Which end of the 5-pin strip is first
Status: FOUND
- Pimoroni MLX90640 mechanical drawing (sources/img/mlx-mech.png): seen from the front, lens at the top and the 5-pin header along the bottom edge, "INT" is printed above the 4th pin from the left. So from the left: 3V3, SDA, SCL, INT, GND. That is the Pimoroni order already on the page.
- The GPS board uses the same "Raspberry Pi-compatible pinout (pins 1, 3, 5, 7, 9)" (Pimoroni PA1010D listing). Its own drawing was not opened, so its left-to-right direction is an arrival check: look for the printed "INT".
- "Pi pins 1, 3, 5, 7, 9" is Pimoroni's note about plugging the board straight onto a Pi. It is not needed here (the plan says remove it).
- HAT labels: "SparkFun confirms its SDA/SCL labels are reversed" stays as the page has it (R21).

## Batch D: Step 4 (receiver, camera, VTX, software)

### D1 Receiver pads, and the stack box's own receiver cable
Status: FOUND
- GEPRC diagram (sources/img/man/t21.png):
  - The FC has a 4-pin socket labelled "G, 5V, R2, T2", drawn wired to the receiver's pads "R, T, 5, G": GND to G, 5V to 5, the FC's RX (R2) to the receiver's T, the FC's TX (T2) to the receiver's R.
  - The same R2 and T2 also appear as solder pads on the FC's other edge (t30.png).
  - The Receiver table there sets UART2 to Serial RX, with "Serial Receiver Provider" CRSF.
- Stack box: "2 x sh1.0 4pinsilicone cable" (Rotor Village). So the receiver can use a box cable: plug it into the FC's 4-pin socket and solder its four cut ends to the receiver. No loose wires on the FC, and less silicone wire.
- ExpressLRS wiring page (https://www.expresslrs.org/quick-start/receivers/wiring-up/): "The TX or T pad should be connected to an RX pad of the same UART number where the RX or R wire is on the Flight Controller(FC)" and "The RX or R pad should be connected to a TX pad ...".
- Wire colours of the box cable: NOT FOUND (the diagram's colours are drawings). So: follow each wire from its labelled socket pin, and check with the meter.

### D2 Software, versions, flashing and binding
Status: FOUND
- ExpressLRS Configurator: "Download the latest ExpressLRS Configurator application for your platform." https://github.com/ExpressLRS/ExpressLRS-Configurator/releases, marked "(Recommended)". The Web Flasher is https://expresslrs.github.io/web-flasher/ (https://www.expresslrs.org/quick-start/installing-configurator/).
- Receiver as shipped: "Firmware Version: ExpressLRS v2.4 pre-installed" (Rotor Village RP1 V2 listing).
- Radio's version: "Press the SYS key on your radio, open the ExpressLRS script in the Tools menu, and scroll to the bottom", where you "see the Current Version flashed into your TX module" (https://www.expresslrs.org/quick-start/transmitters/firmware-version/).
- Updating over Wi-Fi (https://www.expresslrs.org/quick-start/receivers/updating/):
  - Power the receiver, then "Let it be for at least 60s" until "Rapid Blinking".
  - Connect to the "ExpressLRS RX Access Point", password "expresslrs", and open "10.0.0.1".
  - Use the Update tab ("Drag and drop the Firmware file ... into the File Upload field").
  - Close Betaflight first: "Disconnect and close your FC Configurator app".
- Bind phrase: "Note this phrase as it should be the same on your other devices, or they will not bind or sync". "A Receiver flashed or set with a Binding Phrase WILL NOT initiate Manual Binding mode" (binding page).
- Betaflight side: "Bind Receiver button in Betaflight Configurator 10.10 (or newer) Receiver Tab" (binding page).
- Ports: in Betaflight's "Ports Tab", the "Serial RX" column (Ports tab page).

### D3 Betaflight tab names
Status: FOUND (tab names), general (Save)
- Betaflight app pages list the tabs: "Setup Tab Sensors Tab Ports Tab Configuration Tab Power & Battery Tab Failsafe Tab Presets Tab PID Tuning Tab Receiver Tab Modes Tab ... Motors Tab OSD Tab Video ..." (setup-tab and ports-tab pages).
- Setup tab: "Calibrate Accelerometer" (https://betaflight.com/docs/wiki/app/setup-tab).
- Failsafe: "Configure Failsafe Stage 2 to Drop"; "Bench test of Stage 2 Drop Mode - remove the props!" (Failsafe guide).
- Battery: "vbat_max_cell_voltage - Maximum voltage per cell, used for auto-detecting battery voltage" (Battery guide). The 4.40 V reasoning stays (the testers praised it).
- Save: each tab has a Save button, and changes are lost without it. General knowledge of the Configurator; no quote opened.

### D4 Setting the VTX to 25 mW
Status: PARTLY
- TBS Unify Pro 5G8 HV manual (sources/tbs-unify-manual.txt): "25mW (up to 800mW with HAM license*)". The power levels are 25 / 200 / 500 / 800 mW, and the higher ones need unlocking: "(FOR HAM USERS ONLY!) Press button for 20 to 25 seconds".
- Its startup lights show the setting: "First the RED LED flashes to indicate the item being shown. One flash for channel, two flashes for band, three flashes for power level. Subsequently, the BLUE LED will indicate the value." So 3 red then 1 blue = power level 1 = 25 mW (my reading of the table).
- Betaflight side: "In the Ports Tab, enable SmartAudio or Tramp as a peripheral on the UART your VTX is connected to. Then configure the VTX in ..." (setup guide). The VTX's "Data (white) - Smartaudio VTX remote control input" goes to T1.
- **With USB only, the VTX is probably not powered.** It runs from the FC's 9V pad, and the stack's 9 V comes from "9V 2.5A + 5V 3A dual independent BEC" (R2), which runs from the battery. That USB does not power it is my inference: NOT FOUND stated. So the 25 mW check belongs with the first battery power-up (S8.2, through the smoke stopper, antenna on).
- Channel: "factory-enabled channel" is the page's. The manual's startup code also shows channel and band (1 and 2 red flashes).

### D5 Camera and VTX wires
Status: FOUND
- TBS manual, HV wiring: "7V-26V (red cable) - Connect directly to Battery voltage, 2S to 6S LIPO"; "GND (black)"; "5V out (orange) - Supply for your camera. Never connect to Battery or it will permanently damage your VTX!"; "Video (yellow) - Video input"; "Audio (green)"; "Data (white) - Smartaudio VTX remote control input."
- GEPRC diagram (t30.png):
  - GEPRC's example VTX has its "7-28V" on the FC's "9V" pad, GND on GND, "VTX" on the FC's "VTX" pad, and its control "RX" on "T1".
  - UART1 is set to "VTX,IRC Tamp" (for a TBS unit the choice is SmartAudio).
  - The camera goes to the FC's "CAM, GND, 5V" pads (t31.png), and the box has "1 x Camera connection cable".
- Camera power: "Power: DC 5-36V" (rv-phoenix), so the FC's 5V pad is in range.
- **Found:** the VTX's orange 5V-out and green audio wires are not used here. Each must be cut short and insulated. The page does not say so today.
- Note for Shad: TBS says to connect its red wire to battery voltage, while the GEPRC diagram and the page use the 9V pad. 9 V is inside the VTX's 7-26 V, so both work; the page's choice stands.

### D6 How the VTX and its antenna are held
Status: PARTLY
- The model puts the VTX on the bottom plate behind the stack (x -45 mm), and the antenna at the rear.
- TBS: "SMA connector with frame mounting holes integrated" (TBS manual features).
- TBS's Source One repository has "So1-V6-2025-SMA-mount.stl", a 3D-printed SMA mount that is NOT in the frame box: the Rotor Village frame listing names only a "TPU 3D Printed Camera Mount".
- Words: stick the VTX to the bottom plate with a strip of the foam mounting tape (on the list). Hold the antenna's SMA with two zip ties to the two rear 30 mm standoffs. General practice, not from a listing.
- `[REQUIRES REAL INPUT]`: whether the V6 has a hole that fits the SMA nut (arrival check).

### D8 Top plate screws
Status: PARTLY
- The frame has "20X M3x10 allen screw", "4X M3x12 allen screw", "4X M3x14 allen screw", 4 x 30 mm and 4 x 22 mm standoffs (R3). The top plate sits on all 8 standoffs, so 8 screws.
- Which screw size: NOT FOUND (no TBS build manual opened). M3 x 10 is the likely one (20 of them for 16 standoff ends), but that is my inference.
- Threadlock: "only if the manual says so" (page). The TBS manual was not found: arrival.
- "No wire trapped between plate and standoff": general advice.

### D9 The receiver's antenna
Status: FOUND
- Rotor Village RP1 V2: "1 x 65mm UFL 2.4Ghz T Antenna" ("Antenna: 65mm 2.4ghz T Antenna"). UFL is a tiny snap-on plug: press it straight down onto the receiver's UFL socket until it clicks. "Clicks" is general; UFL is the listing's word.
- Where: point the T's two arms away from carbon and out of the prop circles, for example taped along a rear arm. General practice; no listing.

### D11 How to know the receiver is bound
Status: FOUND (LED meanings), TRUTH (check)
- ExpressLRS wiring page, LED chart: "Slow blink 500ms on/off: Waiting for connection from transmitter"; "Double blink then pause: Binding mode is active"; "Fast blinking 25ms on/off: WiFi mode has started. Starts after 60s."; "Solid on: Bootloader mode is active".
- The chart has no "connected" pattern. So the sure sign is Betaflight's Receiver tab: the bars move with your sticks. Also: the receiver stops the slow blink once the radio is on and bound (my reading of "Waiting for connection").

## Batch H: Step 5 (charging)
ToolkitRC M4AC manual (sources/m4ac-manual.txt, from the ToolkitRC site, R11/R45).

### H1 Start, finished, the surface, and if it smokes
Status: FOUND (start, finished, fire steps), general (surface)
- Manual, "Quick start":
  - "1，Connect the M4AC to a suitable 100-240V AC to power outlet."
  - "4，Short press [Type/Current] key to release the locked state."
  - "5，Long press [Type/Current] key to select the cut-off voltage to be charged."
  - "6，Short press [Type/Current] key to select the current to be charged."
  - "7，When the output main port and the balance port voltage match, it will automatically start charging."
  - So there is no Start button: it starts itself when the pack is plugged in.
- **Found: the order on the page is the wrong way round.** The manual's "Start charging": "After setting the battery voltage and current, connect the battery." The page plugs the pack in first (S5.2), then chooses the type (S5.3) and the current (S5.3b).
- Finished: the screen shows "F:The battery or one of the cells is full." (manual, display description). No time is given. My arithmetic: 1500 mAh at 1.0 A is up to about 1.5 hours from empty.
- Surface: Rotor Village's warning, "ALWAYS charge in or on a fire-proof surface" (R16). "A ceramic tile, a concrete floor or a metal tray" are general examples, not from a listing.
- Smoke or fire, Oscar Liang's LiPo guide (https://oscarliang.com/lipo-battery-guide/): unplug if you can, use a fire extinguisher or cover with sand, "Do NOT use water", "Avoid breathing in smoke". Shad is pricing an extinguisher or sand (Staples Kidde 1-A:10-B:C $34.99, see C10 notes).

### H2 Are the packs HV?
Status: FOUND: yes
- Rotor Village: "GNB 1500mah 4S 120C HV LiPo XT60", model "GNB15004S120AHV". EpicFPV backup: "GNB LiHV 4S 15.2V 1500mAh 120C XT60 LiPo Battery", "Voltage: 15.2V (LiHV)".
- On the M4AC, LiHV is the 4.35 V cut-off. Manual display: "4.20v: The selected rechargeable battery type. 4.35v 3.85v 3.60v: Other types". Its spec lists "LiPo LiHv LiFe LipoStorage".
- Where the pack's own label says HV: NOT FOUND (no photo opened). Arrival check: read "HV" or "LiHV" on the pack.

### H4 Main plug and balance lead; the charger's mains cable
Status: FOUND
- Pack: "Discharge Lead: 85mm, XT60", "Balance Lead: 40mm, JST-XH" (R12). So the thick yellow XT60 plug with two wires is the main plug, and the small white plug with five thin wires is the balance lead. Five wires for 4S is general knowledge (cells + 1).
- Charger: "output main port and the balance port" (manual).
- Mains cable: ToolkitRC "IN THE BOX: M4AC Charger × 1, AC Input Cable × 1, Quick Manual × 1" (https://www.toolkitrc.com/m4ac/, tk-m4ac.txt). Rotor Village's "PACKAGE CONTENTS" lists only "1 x Toolkit M4AC Charger" with "Input Type: AC Only". The maker's list includes the cable.
- Bag first: put the pack in the bag before connecting. The bag's "leads out through the opening" wording is the page's.

### H5 Charging the radio
Status: FOUND (cord), NOT FOUND (time, full signal)
- RadioMaster Pocket box: "1x USB-C Charging Cord" (R13; STEP-TRUTH S5.N) and "Supports USB-C direct charging" (R13). So use the cord from the radio's box, not the flight controller's data cable.
- Power source: "a phone charger or a laptop USB port" is general; no RadioMaster wording opened.
- Charge time and the "full" signal: NOT FOUND in the listing. Arrival: read the radio's manual.
- Duplicate with Stage 3: Stage 3 already says "Charge the cells in the radio". S5.1 and S5.1b repeat it. The plan says remove the duplicate (the Builder's call; S5.1/S5.1b have model chips, so say if they go).

### H6 Storage mode
Status: PARTLY
- Charger: "LipoStorage" is one of its battery types (manual and listings). Choose it with the same long press as the type ("Long press [Type/Current] key to select the cut-off voltage"); it shows as 3.85 V.
- Whether the M4AC can bring a full pack DOWN to storage (discharge): the manual text I have does not say. A RaceDayQuads Q&A answer says "Yes it does discharge to storage voltage" (a shop's answer, not the maker's). ToolkitRC's spec table has a "Discharge Power/Channel" row whose value I could not read. So: `[REQUIRES REAL INPUT]`.
- When: Oscar Liang, store at "3.80V to 3.85V per cell" for "longer than 2 weeks", and he returns packs to storage if not flying in "the next couple of days". The page's "a day or two" is close.
- Where: in the LiPo bag (the bag is "for storing and transporting", R16).

### H7 Swollen, damaged, cooling
Status: FOUND (signs), NOT FOUND (time)
- Oscar Liang: dispose of a battery "if it's swollen like a balloon" or if it "becomes dented from a crash"; "Never use or charge a damaged or swollen battery."; "Allow batteries to cool down completely after a flight before charging them."
- Cooling time: no source gives one. Wording: "until it feels no warmer than your hand" (my test, marked).

## Batch I: Step 2 (build the frame)
No TBS Source One V6 build manual was found. The "Getting into FPV with SOURCE ONE" manual in TBS's repository (sources/s1-manual.txt) is for the ORIGINAL frame ("Arms (4.0mm), 4pcs", "M3x8mm, 16pcs (frame body top / bottom)"). It does not match the V6 (arms 6 mm, R3), so it is not used.

### I1 Hex drivers, screws, threadlock
Status: PARTLY
- Kit: "1x 4-in-1 Hexagon Socket Screwdriver Set" (Rotor Village kit listing). Its sizes are not listed.
- V6 hardware (Rotor Village frame listing, R3): "20X M3x10 allen screw", "4X M3x12 allen screw", "4X M3x14 allen screw", "4X OD 5mm M3 30mm standoff", "4X OD 5mm M3 22mm standoff", "1X OD 5mm M3 20mm standoff", "8x M3 press insert nut", "TPU 3D Printed Camera Mount".
- Hex size: an M3 socket-head screw normally takes a 2.5 mm hex key (the usual metric standard). General, not from TBS. Arrival check: try the 2.5 mm bit of the kit's set.
- Threadlock: no V6 manual found, so "only if the manual says so" cannot be answered. NOT FOUND [REQUIRES REAL INPUT]: look for a paper sheet in the frame box.

### I2 Arms and standoffs
Status: TRUTH (TBS drawing), counts inferred
- TBS drawing (frame_outlines.json, extract_so1v6.py): each arm has two root holes and sits between the bottom plate and the middle plate, with the arm spacer between them in the centre. Stack-up: bottom 0-2 mm, arms 2-8 mm, middle plate 8-10 mm.
- So "Bolt the arms to the bottom plate" really means: arms between the bottom plate and the middle plate, two screws per arm through all three.
- Counts: 4 arms x 2 holes = 8 screws, which matches the 4 x M3x12 + 4 x M3x14 in the box, and the "8x M3 press insert nut". Which screw goes in which hole is my inference: NOT FOUND in a TBS text.
- Standoffs (TBS drawing hole matches):
  - The 4 x 30 mm stand on the bottom plate: two beside the stack's rear corners, two at the very back.
  - The 4 x 22 mm stand on the middle plate at the front.
  - Both sets end at the same top-plate height (2 + 30 = 2 + 6 + 2 + 22 = 32 mm).
  - The 1 x 20 mm standoff's use is NOT FOUND.
- Tightness: "snug, not forced" is general advice (plan).

## Batch K: Stage 3 (radio and simulator)

### K1 A free simulator, and the Plan tab's Liftoff claim
Status: FOUND
- **Liftoff is not free.** Steam (https://store.steampowered.com/app/410340/Liftoff_FPV_Drone_Racing/): "CDN$ 25.99"; "Liftoff requires a remote or controller to play." No free demo shown. So the Plan tab's "Liftoff" as a free simulator is wrong.
- **FPV SkyDive is free.** Steam (https://store.steampowered.com/app/1278060): "FPV SkyDive : FPV Drone Simulator", "Free To Play", developer ORQA, "Windows (7,8,10) 64-bit", graphics "NVIDIA GeForce GTX 650 (2GB) or better", "Preferably a transmitter radio is wanted for best flying experience."
  - `[REQUIRES REAL INPUT]`: whether Shad's laptop meets that graphics line. The page says "Graphic settings can be changed to suit lower-end devices" (search summary of the same page, not re-opened).
- A second free one, "FPV Drone Simulator" (DreamEscape, Steam app 691730), is "Free To Play ... Early Access" per search results only (not opened).
- Using the Pocket as the controller:
  - Oscar Liang (https://oscarliang.com/opentx-usb-joystick-mass-storage/): in "Model Setup", "USB Mode" set to "Ask", then pick "USB Joystick (HID)" when you plug in. That page is about OpenTX, which EdgeTX grew out of. EdgeTX's manual has a "USB Joystick" page (manual.edgetx.org, not opened in full).
  - Rotor Village Pocket listing: "Note: Batteries are not included. Controller will NOT function on USB alone, it still needs batteries." So the cells must be in and charged even to use the simulator.

### K2 Minimum EdgeTX set-up
Status: PARTLY
- Pocket listing: "Preinstalled with EdgeTX firmware", "Charging: Built-in USB-C QC3 Charging", "1x USB-C Charging Cord", "Built-in LED lights help visualize your switch inputs".
- Switch names and which switch is a 2-position one: NOT FOUND in the listing. Arrival check: read the Pocket's manual.
- Minimum set-up words (general practice, marked):
  - create a model and name it after the drone;
  - pick a 2-position switch as the arm switch, with "down = disarmed";
  - set a timer to count down 3 minutes for the first flights.
  - The arm switch's channel is set in Betaflight's Modes tab (Step 4).

## Batch J: Step 1 (lay out the parts)

### J1 The manuals and where they are
Status: FOUND (links), with gaps marked
| Part | Maker's page or manual |
|---|---|
| Frame, TBS Source One V6 | https://github.com/tbs-trappy/source_one (drawings only; no V6 build manual found) |
| Flight stack, GEPRC TAKER F405 BLS 50A | https://geprc.com/electronics/fc-manual/ (one-page wiring diagram, R1) |
| Receiver, RadioMaster RP1 V2 | https://www.expresslrs.org/quick-start/receivers/wiring-up/ (ExpressLRS guide; no RadioMaster manual opened) |
| Video transmitter, TBS Unify Pro 5G8 HV | https://www.team-blacksheep.com/tbs-unify-pro-5g8-manual.pdf (linked from https://www.team-blacksheep.com/products/prod:unify_pro_hv_sma) |
| Thermal camera, Pimoroni MLX90640 | https://shop.pimoroni.com/products/mlx90640-thermal-camera-breakout |
| GPS, Pimoroni PA1010D | https://shop.pimoroni.com/products/pa1010d-gps-breakout |
| Charger, ToolkitRC M4AC | https://www.toolkitrc.com/m4ac/ |
| Radio, RadioMaster Pocket (EdgeTX) | https://manual.edgetx.org (EdgeTX manual; no RadioMaster PDF opened) |

## Calm-markers gaps (architect, 2026-11-03): six [REQUIRES REAL INPUT] notes researched

### M1 The meter method for the battery-lead joints (S3.3 and the Step 3 check)
Status: PARTLY (general electronics, quoted from forum experts; no maker text)
- To find which XT60 wire is +: the lead is not connected to anything yet, so there is no voltage to measure. Use the meter's beep (continuity) or lowest ohms setting: one probe on the XT60 pin marked +, the other on a wire end; the wire that beeps (close to 0 ohms) is +. That XT60 shells are marked + and - is NOT FOUND in a listing: arrival check, look at the plug.
- After soldering, checking for a short across + and -, a capacitor sits across the pads:
  - EEVblog forum (https://www.eevblog.com/forum/beginners/capacitors-shorted-is-this-normal/): "It is also possible that your meter is beeping only momentarily, which does NOT indicate that the capacitor is shorted" and "If you hold the probes on the cap for more than a second or two it is likely that the beep will stop." A true short reads "less than 1" ohm (same thread).
  - So: a short beep that stops within a few seconds is the capacitor charging and is fine; a beep that never stops, or a reading below 1 ohm that stays, is a short.
- IntoFPV (https://intofpv.com/t-multimeter-and-continuity-question-before-i-move-on-with-my-build), on motor wires: between the battery leads and a motor wire "there should be no continuity between those"; between the wires of one motor, "there continuity through the motor windings" (a beep is expected and normal).

### M2 Radio charge time and the full sign (S5.1b)
Status: NOT FOUND [REQUIRES REAL INPUT]
- RadioMaster Pocket quick-start manual (sources/radiomaster/Pocket_User_Manual.pdf, from https://xcopter.com/download/Pocket_User_Manual.pdf): "POCKET is powered by 2x 3.7V 18650 Lithium Ion cells and is charged using the built-in USB-C port", "the maximum charging voltage is 4.2V", "never charge the device unattended". It gives no charge time and no charge-light meaning: it points to the full manual on RadioMaster's site, which I did not reach.
- Rotor Village listing: "Charging: Built-in USB-C QC3 Charging". Oscar Liang's Pocket guide: nothing on charging.
- So the page keeps its tag; arrival check: watch the radio while it charges and note what the screen or light shows when full.
- Found on the way (for S4.5 / D11): the same manual's binding steps say "The LED on the receiver should now be solid, indicating successful bind." That firms up change request 81: bound = a solid receiver light.

### M3 Install steps for the laptop (S8.1)
Status: FOUND by running it on this Windows laptop
- The README's install block is for Raspberry Pi OS (python3 -m venv ..., pip install -r requirements.txt). The requirements (adafruit-circuitpython-mlx90640, pa1010d, pynmea2) are the sensor drivers, needed only on the Pi.
- Tested 2026-11-03 on this laptop, Windows 11, Python 3.12.10, nothing installed, on a copy of the folder:
  - python -m unittest -v test_drone_logic.py printed "Ran 28 tests in 0.021s" and "OK".
  - python payload.py --demo printed "Ground height set to 670.0 m above sea level from the first GPS fix. Fly only after this line appears." and "1 hotspot(s) logged".
- So the laptop steps are: install Python from python.org, open a terminal in the Shad-Drone-Payload folder, run the two commands. No pip install is needed on the laptop.
- `[REQUIRES REAL INPUT]`: that "python" opens Python on Shad's laptop (the Windows installer may offer the "py" launcher instead).

### M4 Where Betaflight shows the channels (S8.2)
Status: FOUND
- Betaflight Receiver tab page (https://betaflight.com/docs/wiki/app/receiver-tab): the preview shows channel states "in channel value and graph forms". The setup guide calls it the Receiver Tab ("Bind Receiver button in Betaflight Configurator 10.10 (or newer) Receiver Tab", ExpressLRS binding page). So: yes, the Receiver tab. Every bar should move as you move each stick and switch.

### M5 How you see the payload's printed line (S8.6)
Status: FOUND (payload code) + TRUTH
- payload.py prints to the terminal it runs in (print() at lines 83-84). On the drone the Pi has no screen, so the line shows in the SSH window on the laptop where you started python payload.py (Step 6A set up SSH). Demo run above shows the exact text.
- With --serve, the payload also runs a small web page (README: "Open http://127.0.0.1:8000"); that is on the Pi itself. Reaching it from the laptop needs the Pi's address, which is not set up in the guide, so the guide uses the SSH window.

### M6 How long a GPS fix takes (S8.6)
Status: PARTLY
- Maritex, CDTop PA1010D module listing (https://www.maritex.eu/en/product/cdtop-technology-pa1010d-gnss-modules-gps-cdpa1010d): "TTFF 1s/35s" (time to first fix). The page does not label which is which; the usual meaning is about 1 s for a warm start and 35 s from cold. CDTop's own datasheet was not opened.
- Pimoroni PA1010D page: "an indicator LED, which will flash whenever the module has a satellite fix" and "If it's taking a long time to get a satellite fix, try taking it outside or pointing the antenna upwards or towards a window."
- So: outdoors with a clear sky, expect about half a minute the first time (seconds after that); the board's light flashes once it has a fix (colour not given), and then the payload prints its line.

## Shad's questions (architect, 2026-11-03): fees, flight time, where to fly, clubs. Research only, no page change.

### Q1 Transport Canada Basic exam fee
Status: FOUND
- TC page "Take a drone pilot online exam: Small Basic" (https://tc.canada.ca/en/aviation/drone-safety/drone-pilot-licensing/take-drone-pilot-online-exam/small-basic), read in Chrome 2026-11-03: fee "$10.17"; "Additional attempts have the same fee."
- Same page: "35 multiple choice questions", "90 minutes", "A score of 65% or higher is considered a pass", "You must be 14 years of age or older to take this exam."
- The dollar figure is filled in by the page's script: a plain fetch shows "Fee: ." with no amount, so read it in a browser.

### Q2 Must you own a drone to take the exam?
Status: NOT FOUND (the TC exam page names only the age limit)
- The Small Basic exam page's only eligibility line is "You must be 14 years of age or older to take this exam." It says nothing about owning, registering or having a drone (checked twice, in Chrome and by fetch).
- So nothing on TC's page makes owning a drone a condition. The online course's question about whether Shad owns or flies one is not explained there. `[REQUIRES REAL INPUT]`: if the exam form itself asks, answer truthfully; I did not open the paid exam form.

### Q3 Drone registration fee (page says CA$10; the architect thought CA$5)
Status: FOUND: CA$10.17
- TC "Registering your drone: Overview" (https://tc.canada.ca/en/aviation/drone-safety/registering-your-drone-overview, served at .../registering-your-drone), Fees and service standards table: "Issuance of a certificate of registration" "$10.17", "Online service available immediately".
- So the page's CA$10 is close but low by 17 cents, and CA$5 is wrong. Suggested page wording: "about CA$10 (CA$10.17 in 2026)".

### Q4 How a custom-built drone is registered, and when
Status: FOUND (rule); PARTLY (what to type for a home build)
- Same TC page: "All drones weighing at least 250 g must be registered. This includes custom-built drones and drones built from a kit or off-the shelf."
- When: before it flies. TC: "If you fly a drone without meeting these requirements, you may be fined. Fines are: $5,000 for recreational users". So register it once it is built and weighs 250 g or more (ours: about 549 g with the payload, about 502 g bare, from verify_build WEIGHT-total), before the first outdoor flight.
- How: "through the Drone Management Portal"; "It should take 3 minutes"; you need "purchase date (if applicable)", "make, model, serial number and type of drone", and a credit card, Apple Pay or Google Pay.
- Marking: "You must clearly mark your drone with its registration number", by "permanent marker", "permanent label" or "engraving"; TC also recommends "your name and contact information".
- `[REQUIRES REAL INPUT]`: what a home build should enter for make, model and serial number. TC's overview does not say. Ask TC or read the portal's help when registering.

### Q5 Flight time for a ~550 g 5-inch quad on 4S 1500 mAh (EMAX ECO III 2207 1900KV, Gemfan 51499)
Status: PARTLY (estimates from other people's builds; nothing for this exact motor and prop)
- No published hover or flight-time figure was found for this exact motor, prop and weight. EMAX's ECO III thrust table found in search is at 6S with a different prop, so it does not answer this.
- Others' builds (estimates, not ours):
  - Rotorbuilds build 25530 (https://rotorbuilds.com/build/25530): "quad w/ out battery: 343g"; on a 4S 1300 mAh pack, 506 g all-up, about 6 minutes max. That build is set up for long flights (2305 motors, 5048 tri-blade props).
  - IntoFPV thread (https://intofpv.com/t-iflight-nazgul-evoque-hd-4s-version): a heavier 5-inch on 4S 1500 mAh gets about 2.5 to 3 minutes of hard flying.
  - Unmanned Tech blog (https://www.unmannedtechshop.co.uk/de/blogs/knowledge-base/fpv-drone-flight-time-how-to-get-more-minutes-in-the-air), a shop's article: typical 5-inch 4S freestyle is 3 to 5 minutes on 1300 mAh; going up to 1800 mAh adds only 30 to 60 seconds.
- My own judgement (not sourced): calm hover and slow flying at about 550 g on 1500 mAh likely gives roughly 4 to 6 minutes, and hard flying roughly 3. Land at the pack's low-voltage warning, not by the clock. `[REQUIRES REAL INPUT]`: time the first three calm flights and write the real number here.
- Seen in a search summary but not opened: a shop reply about the older ECO II 2207 1900KV said it flies on 4S but is "quite sluggish". Not checked against our motor; for the architect, not the page.

### Q6 Legal places to fly near Edmonton under Basic rules (550 g)
Status: PARTLY
- Northern Alberta FPV League (MAAC club 928), MAAC club page (https://maac.ca/clubs/view/928): outdoor field "Ministik Park (5773)", "located approximately 22km East of Edmonton on Highway 14", GPS 53.396080, -113.014008. Indoor sites: Veterans Association Food Bank (18504 111 Ave NW), M.E. Lazerte High School (6804 144 Ave NW), Western Canada Fire and First Aid Warehouse (4120 101 St NW), Telus World of Science (11211 142 St NW).
  - The indoor sites run 1S whoop races (small ducted drones), not 5-inch drones like ours. The outdoor field is where a 5-inch would go: `[REQUIRES REAL INPUT]` ask the club when Ministik is in use and if a 550 g 5-inch is fine there.
  - Club rule at their events: "all pilots need a MAAC membership. You can sign up for MAAC at the event."
- Edmonton Radio Control Society (https://www.ercs.ab.ca): it will no longer operate "Bremner Field" after August 15, 2025; indoor flying now at the Alberta Aviation Museum on Kingsway. The site does not say whether multirotors are allowed.
- City parks: covered by change request 99 (City parks are for drones under 250 g; this one needs private land with the owner's permission), so not repeated here.
- `[REQUIRES REAL INPUT]`: the airspace at Ministik Park was not checked. Check it in NAV Drone or the NRC tool before going.

### Q7 Is the Orchards at Ellerslie in controlled airspace?
Status: PARTLY (NRC map read; the neighbourhood edge not confirmed)
- NRC Drone Site Selection Tool 2 (https://nrc.canada.ca/en/drone-tool-2/), Basic view, read in Chrome 2026-11-03. The search "The Orchards at Ellerslie" put the pin at Ellerslie Rd SW and 50 St SW. Clicking the map there and just south of it showed no zone.
- The big red zone a short way south-west is "Edmonton Intl, AB [CZ]", "Class C", "SFC to 4600ft (2200ft AAE)", with "Basic RPAS operations are not permitted within the zone indicated by the red filled shape." Its edge runs past Heritage Valley and the "Edmonton South Central East" label, south-west of the pin.
- So the north-east part of the Orchards is outside controlled airspace on the NRC map. The south-west part sits closer to the Class C edge: check the exact take-off spot before each flight.
- NAV Drone needs an account: "not read (login)". The city-land rule (change request 99) still applies to the Orchards' parks.
- `[REQUIRES REAL INPUT]`: the exact neighbourhood boundary (not taken from a city source).

### Q8 Edmonton-area RC and FPV clubs and meetups
Status: PARTLY
- Northern Alberta FPV League (FPV drones, MAAC club 928), event page https://northernalbertafpv.ca/event/nov-8-wcff-igniter-whoop-race/:
  - Newcomers: "All skill levels -- first-timers encouraged -- spectators welcome"; "if not, we have loaners!" (goggles, radio, drone). Getting-started page: "Yes, we want you to join us!"; "including absolute beginners".
  - Cost: "the race fee will be a $10 donation". MAAC is required: "If cost is an issue, let us know and we can help."
  - Upcoming (all indoor 1S whoop races): Nov 8 and Nov 29 at 4120 101 St NW; Nov 15, Dec 6 and Dec 20 at M.E. Lazerte High School; Nov 22 and Dec 13 at the Veterans Food Bank.
  - Contact: "contact George at info@northernalbertaFPV.ca"; Discord https://bit.ly/YEGFPV ("Help channel"); sign-ups through MultiGP (free account).
  - Facebook: "Northern Alberta FPV League - Edmonton & Area MultiGP Drone Racing", "Public group · 155 members", https://www.facebook.com/groups/1587979951989528. Read from Shad's existing Chrome session; I did not join or post.
- MAAC (https://maac.ca/membership/join): "Open Membership $115.00", "Introductory Membership $30.00", "Junior Membership $25.00", plus GST; "Membership expires December 31st each year"; joining midyear, you "may wish to wait until September 1st for a 16-month membership option". Insurance: "$10 Million liability policy" (https://maac.ca/about/why-join-maac). The join form lists "FPV (First Person View)" and "Multi-Rotor (Drone)" as interests. `[REQUIRES REAL INPUT]`: what the Introductory membership allows (not explained on the page).
- Edmonton Radio Control Society (https://www.ercs.ab.ca): "ground school and in-flight training at no charge to members"; contacts president@ercs.ab.ca and membership@ercs.ab.ca. Drones not mentioned; its Facebook group not opened.
- Edmonton R/C Helicopter Association: rules PDF on maac.ca returned 403, "not read (403)". A search summary says it needs MAAC and a TC pilot certificate.
- Other MAAC clubs near Edmonton (names only, from MAAC's club list): St. Albert Aero Modeling Society, Strathcona Remote Control Flyers, Morinville Radio Control Flyers, Leduc Alberta Radio Control Society, Tofield Miniature Aircraft Association, Windy West R.C. Club. Whether they take drones was not checked.
- Meetup: a search for "drone" groups within 30 km of Edmonton (https://www.meetup.com/find/?keywords=drone&location=ca--ab--Edmonton&source=GROUPS) returned no drone or FPV group.

## Crash and protection review (architect, 2026-11-03; Shad approved the review). Research and proposals only, no page change.
Geometry is computed by scratchpad tip_geom.py from docs/build-truth/geometry (positions.json, weights.json) and verify_build's
DIMS. z is measured from the bottom plate's underside. Lines marked EST use my estimates (centre-of-gravity height, prop
plane height, the drawn motor split).

### C1 What breaks first, and which of our parts are most exposed
Status: FOUND (sources) + COMPUTED (our geometry, some EST)
- Sources:
  - Unmanned Tech, a shop's crash guide (https://www.unmannedtechshop.co.uk/blogs/knowledge-base/fpv-drone-crash-diagnosis-damage-checklist-after-impact): on a 5-inch, "the first casualty is a propeller, then a bent motor bell or cracked arm".
  - Same guide: "A partially sheared SMA connector" on the antenna; "LiPo cells punctured by standoff bolts show no external damage".
- Our stance is narrow. The feet are 22.0 mm apart side to side at the rear and 29.2 mm at the front, against 133.6 mm front to back. The legs are 56 mm tall (2 x 25 mm or 2 x 28 mm plus a 6.3 mm foot).
- Sideways tip (EST, centre of gravity about 22 mm above the plate underside, 551 g):
  - It falls over once it leans about 8 to 10 degrees, or less if it is sliding sideways as it touches down.
  - At about 33 degrees the arm tip, the motor's base and the spinning prop tip all reach the ground together. So a sideways tip-over hits a prop and an arm first.
- Forward and back:
  - Forward, it falls at about 35 degrees. The front prop tip touches at about 43 degrees, the front arm at about 51 and the FPV camera only at about 69.
  - Backward, the rear prop tip touches at about 53 degrees.
- Upside down, the first thing to touch is the video antenna. It stands about 78 mm tall at the rear, so its top is about 84 mm up (planned position), against 60 mm for the battery top, about 48 mm for the GPS antenna and 41 mm for the motor shafts. The antenna and its SMA socket take the hit, then the battery. If it rolls off the battery, the props touch after about 9 degrees.
- The payload is not the first thing to touch in any tip:
  - The Pi pod is 25.6 mm above the ground and sits between the legs. The thermal lens is 43.7 mm up.
  - A straight-down hard landing loads the legs first: aluminium M3 standoffs joined with set screws. A bent leg or a loose set screw is the likely damage, and it would let the pod reach the ground.
- Most exposed, in order (my judgement from the above): props; arm tips and motors (side tips); the video antenna and SMA socket (upside down); the legs and their set-screw joints (hard vertical landings); the battery (punctures, and upside down after the antenna); the payload last.

### C2 Cheap protection without a 3D printer (real listings; weight; thermal view; balance)
Status: PARTLY
- Already on the buy list, no change: props-spare (2 extra sets, 8 props); legs-25 and legs-28 10-packs (6 spare pieces each); legs-feet 8-pack (4 spare); zip ties (100); lipo-bag.
- Take-off and landing surface: a flat board (scrap plywood) or hard flat ground instead of grass. Weight 0 g on the drone; thermal view and balance unchanged. My own judgement, from the 25.6 mm payload clearance above and the tip-over angle.
- Prop guards: not recommended now (my judgement).
  - None found at Rotor Village. A US listing (StanFPV universal 5", Pyrodrone) mounts under the motors, which needs longer motor screws. Our motor's bolt pattern is itself in conflict in the sources: R4 says 16 mm, R5 says 19 x 19 (parts.py).
  - Weight: about 10 g for a set of 4 by a search summary (Unmanned Tech UK listing, not opened). Balance: symmetric, so no shift.
  - Thermal view: guards sit at arm or prop height, above the downward-facing lens (z -10.6 mm), so they cannot enter its view (geometry; the view check was not re-run with guards).
- Spare arms: no Source One V6 arm found at Rotor Village or in a search. Older V5 6 mm arms are sold in the US and UK; whether they fit is not confirmed. The whole frame is CA$48.99 at Rotor Village (search card). No buy line proposed.
- Balance headroom for anything added: WEIGHT-forward-stop has 2.48 mm margin nominally and 0.59 mm in the worst of 10,000 runs (verification-results.csv).
  - Mass added at the Pi (x -36 mm) moves the balance point back by about 0.061 mm per gram. So about 9 g there uses up the worst-case margin, and about 40 g the nominal one.
  - Mass at the centre has almost no effect; mass at the front helps. My calculation from verify_build's figures; a verify_build run with the real added weights is the proof.

### C3 Moisture and dirt from grass on the bare boards
Status: PARTLY
- Oscar Liang (https://oscarliang.com/waterproofing-drone-electronics/):
  - Coating protects against "humidity and moisture from wet grass or leaves". He recommends "MG Chemicals Silicone Conformal Coating 422C".
  - Do not coat the FC's "boot button, USB port, barometer", the camera's image sensor, the VTX channel button or the receiver bind button. Plug connectors in before coating; "Areas like plugs and buttons will still be susceptible to water."
  - "one to two coat layers"; dry overnight to be safe.
- Rotor Village listing, Flywoo X30 PCBA Waterproof Superhydrophobic Invisible Spray, CA$36.99 (https://rotorvillage.ca/flywoo-x30-pcba-waterproof-superhydrophobic-invisible-spray/):
  - "Capacity: 56.7g (For example: '20X20 Flight Controller' double-sided spray 3 times, need to use 2.5g)"; "spray repeatedly for 2 - 3 times"; "re-spraying before each flight"; "use of coating products will void warranties".
  - On lenses: "it will reduce the permeability by 30%".
  - The rest of its claims (Huawei tests) are the maker's own.
  - MG 422C: no Canadian price found (US listings about US$24-35).
- Our boards nearest the grass are the payload: Pi Zero 2 W, Qwiic HAT and cables, the thermal camera board and the GPS cable joints. The Pi pod's bottom is 25.6 mm above the ground. Grass longer than that touches it on landing (geometry).
- The thermal camera's sensor window must not be coated or sprayed. The Flywoo listing's own lens note says light through a sprayed lens drops by 30%, and the thermal camera sees through its window. My inference: keep its 0% blocked by masking it.
- Do not coat the Pi's microSD slot, micro-USB sockets or the HAT header while unplugged; the FPV camera lens; or the GPS board's ceramic antenna top.
- Weight: by the listing's own figure, up to about 2.5 g per 20 x 20 mm board for 3 coats both sides. For the FC, speed controller, receiver, VTX, Pi and HAT, my upper estimate is 10 to 15 g, mostly near the centre and the Pi. That fits the balance headroom in C2 only if under about 9 g lands at the Pi. So weigh the drone before and after.
- `[REQUIRES REAL INPUT]`: how much coating stays on (weigh it), and whether the GPS antenna top may be coated (not found).

### C4 "After a hard landing" checklist
Status: FOUND (sources) + own wording
1. Disarm, then battery out before touching anything. Our page: "Battery out whenever your hands are on props or motors" (step 8 safety line).
2. Battery (Oscar Liang, https://oscarliang.com/lipo-battery-guide/): check for "Dents or punctures in the cells"; "If a battery has been badly damaged, don't risk charging or flying it again"; swollen, punctured or seriously dented means retire it. Put it in the LiPo bag. "Never throw LiPo batteries into ordinary household trash"; "check with the recycling facility before bringing in damaged or swollen packs". Unmanned Tech: retire a cell "more than 0.2V below the others" (the charger's cell view; `[REQUIRES REAL INPUT]` that the M4AC shows each cell).
3. Props: replace any that are chipped, bent or white at the hub. Spares are on the buy list.
4. Motor bells, props off: spin each by hand. "A bent bell produces a periodic scraping" (Unmanned Tech). After the next flight, a motor much hotter than the others points to a bent shaft or bearing (search summary of the same guides).
5. Arms and frame: hold them to a light for hairline cracks, and look where the arms meet the plates ("compression delamination", Unmanned Tech).
6. Legs: straight, set screws tight, all four feet on. It must still stand level (S7.8, within 3 mm). Use spares from the 10-packs.
7. Solder joints: look at and gently tug the battery lead, the capacitor and the motor wire joints; re-solder any that move or crack (my wording).
8. Video antenna: the SMA nut is tight and not bent ("A partially sheared SMA connector", Unmanned Tech). The two zip ties are still holding it.
9. Payload: the joined zip ties are not cut or slipped; the thermal camera still sits flat on its tape; the GPS board is still stuck down; the GPS cable joints are not pulled.
10. Battery strap: not cut, pack not slid (S7.7's position).
11. Sensors still found: redo S8.6 (the GPS line appears) and the S8.7 heat test (mug found, hand not) before flying the payload again. These are the page's existing checks; no new claim about error messages.
12. Then a short low hover before a normal flight (Unmanned Tech's order ends with a 0.5 m hover test).

### C5 A crash check in verify_build
Status: PROPOSED (not added)
- An honest check is possible because it needs only measured and drawn geometry, not the estimated centre of gravity: "When the drone tips sideways, forward or back, a prop or arm touches before any payload part" (true by the angles above). A second, worded as a warning rather than a pass: "Upside down, the video antenna touches first".
- Not added yet. It would raise build verification 181 to 182 or 183 and the gate's declared counts, and needs a full gate run. Waiting for the architect's yes.

## Wider leg stance from existing holes (architect, 2026-11-03; Shad asked). Proposal: none possible without printing or drilling.
Status: FOUND (TBS's own drawing) + COMPUTED
- Source: TBS's Source One V6 drawing, So1-V6-2025-AUG-19.dxf (github.com/tbs-trappy/source_one, saved in sources/tbs-s1). Every hole was listed by scratchpad stance_holes.py and arm_slots.py with the extractor's own registration (scripts/build/extract_so1v6.py).
- Arm, per arm:
  - the motor shaft hole;
  - four curved motor-screw slots, 8.1 to 9.6 mm from the shaft (they fit both the 16 mm and 19 mm motor patterns);
  - two root holes, about 15.2 and 10 mm from the frame centre on the diagonal, which land on the stack's 30.5 and 20 mm hole positions.
  - So there is no spare hole out along the arm. The only outboard holes hold the motor screws.
- Bottom plate: every hole is within 15.25 mm of the centre line:
  - stack holes at +-15.25 and +-10 (in use);
  - the 30 mm standoffs at (-27.88, +-14.6) and (-80.75, +-11) (the rear legs are on the latter);
  - small 2.2 mm and 2.0 mm holes at +-10 and +-8.
  - The front legs already sit at +-14.6 under the front 22 mm standoffs.
- The only move possible: the rear legs from (-80.75, +-11) to the middle standoffs at (-27.88, +-14.6).
  - It collides with the payload. The Pi board spans x -68.5 to -3.5 and y +-15, and its pad reaches y +-18, so a 5 mm leg at y 14.6 (12.1 to 17.1) runs through the Pi's edge and the pad.
  - It would also cut the front-to-back stance from 133.6 to 80.8 mm.
  - The sideways gain would be small: half-width 11 to 14.6 mm moves the fall angle from about 8 to about 10.6 degrees (EST centre of gravity, as C1).
- Motor screws as leg mounts: not proposed. A leg on a motor screw needs a male thread through the 6 mm arm and into the motor. The safe depth into our motor is not published, and the page's own S2.4 warns "none may touch the copper windings".
- Weight, balance and thermal view: unchanged, since nothing changes.
- So: with no printing and no drilling, the V6 gives no wider stance. CR 100 and CR 101 (approved) are the protection for now. Outside those limits (not researched further, my judgement): clamp-on or printed landing gear on the arms, or drilled holes. Both need Phase G or new parts, a new thermal-view check and a new balance check.

## Real-drone findings from the game's thermal model (2026-11-03, for Shad, via the architect)
Status: COMPUTED (a simulation that runs the payload's own detection and position code, ported to the game and
checked against the Python: 1507 of 1507 hot spots identical). Not measured with the real drone.
Numbers from drone-sim tests/thermal.test.mjs (camera at 30 m, a 3 m fire).

1. The payload assumes the drone faces north.
   - Why: it is started with "python payload.py --serve --heading 0" (Step 8, S8.6) and never reads a compass.
   - Simulated: facing east, the fire's position on the map was 11.4 m wrong; with the real heading it was 0.02 m wrong.
   - Honest wording: "Before you take the reading you want to report, turn the drone's nose to north. Facing any
     other way, the map puts the hot spot in the wrong place, and the further from north, the bigger the error."
2. The payload assumes the camera looks straight down.
   - Simulated: tilted 10 degrees nose down (gentle forward flight), a fire straight below was placed 5.1 m away.
     Past 17.5 degrees nose down (half of the camera's 35-degree view along the drone), the ground straight below
     is out of view altogether: in fast forward flight the camera looks backward.
   - Honest wording: "To read a hot spot's position, stop and hover level for a second or two first. In forward
     flight the positions are metres out."
3. The payload measures height from the take-off spot, not from the ground below.
   - Why: payload.py takes the first GPS fix as the ground (GroundReference).
   - Simulated: over ground 20 m higher than the take-off spot, flying 10 m above it, the payload still thinks it is
     30 m up. By the footprint maths (the footprint grows with height) the hot spot's offset from the drone then
     comes out about 3 times too large (computed from geo.py, not a separate test).
   - Honest wording: "Take off from ground at about the same level as the area you search."

Proposals (not done; list only): put the three sentences in Step 8 near S8.6 and in the payload README; later, a
code change so the payload reads the real heading (for example from the flight controller), which needs its own
tests before any page claims it.

## Motor: Emax ECO 2207 1900KV, 4S or 6S? (architect, 2026-11-03; decide before the Stage 4 motors are bought)
Status: FOUND (Emax's own pages, read 2026-11-03) + COMPUTED (the 4S figures are my estimate, scaled from Emax's tables; not measured)
- ECO III, the guide's motor. Emax shop, https://shop.emaxmodel.com/products/eamx-ecoiii-series-2207-3-6s-1700kv-1900kv-2400kv-brushless-motor-drone-motor-accessories,
  spec-sheet image "ECOIII-2207", KV1900 column: "No.of cells 3-6S", "Propeller 5"", "Peak Current（6S） 50A",
  "Max.Power（6S） 1260W", "Internal Resistance 64mΩ", "31.6g(W/O Silicone Wire)". The KV2400 column says "No.of cells 3-4S".
- Emax USA, https://shop.emax-usa.com/products/e3-series-2207-brushless-motor-choose-kv: "1700KV and 1900KV for 6S
  efficiency builds, 2100KV as the all-around 5" freestyle sweet spot, and 2400KV for 3–4S setups".
- ECO (II) series, https://shop.emaxmodel.com/products/emax-eco-series-2207-3-6s-1700kv-1900kv-2400kv-brushless-motor-for-rc-drone-fpv-racing:
  "No. of cells: 3-4s 2400KV No. of cells: 3-6s 1700KV 1900kv", "Propeller: 5" - 5.5"".
- Emax's thrust table (the ECO III shop page, last image): "ECOIII-2207-1900KV" at "25.2" V (6S) with an "EMAX AVAN5026
  3-blade propeller". Current A / thrust g / power W: 2.45 / 250 / 61.74; 4.82 / 430 / 121.46; 8.13 / 620 / 204.88;
  12.2 / 850 / 307.44; 18.1 / 1090 / 456.12; 24.2 / 1300 / 609.84; 30.7 / 1500 / 773.64; 40.6 / 1800 / 1023.12 (speed "Max").
  There is NO 4S table for the 1900KV. The only 4S table is the 2400KV at "16.8" V: top row 35.8 A / 1300 g / 601.44 W.
- Answer: 4S is inside Emax's rating (3-6S), but Emax pitches the 1900KV at 6S and the 2400KV at 3-4S. On 4S the
  1900KV spins about a third slower (1900 x 16.8 V against 1900 x 25.2 V).
- My estimate for 1900KV on a full 4S pack, same prop as Emax's test. Thrust grows with speed squared, power with speed cubed:
  - from the 6S table: 1800 g x (16.8 / 25.2)^2 = about 800 g per motor; from the 2400KV 4S table: 1300 g x (1900 / 2400)^2 = about 815 g.
  - power at full throttle: 1023 W x (16.8 / 25.2)^3 = about 300 W per motor, about 18 A at 16.8 V.
  - Our 5.1 inch Gemfan 51499 is not the AVAN5026, so treat these as rough.
- What it means at 551 g: 4 x about 800 g = about 3.2 kg of thrust, about 5.8 times the weight on a full pack. Hover
  needs about 138 g per motor. That is plenty for calm camera and search flying, with less punch than a 2400KV or a 6S build
  (my judgement, not sourced).
- Options for Shad (through the architect; the recommended one first):
  - A. Keep the 1900KV on 4S. Gentler, lower current, comfortably inside the motor's, ESC's and pack's limits; suits a
    search drone and a first build. Nothing to re-buy.
  - B. Switch to the 2400KV, Emax's 4S choice. More punch, more current (Emax: 35.8 A per motor at full on 4S).
  - C. Keep the 1900KV and fly 6S, Emax's intended pairing. New packs, and every 6S rating (ESC, VTX, charger, smoke
    stopper) must be re-checked before buying.
- For the game: the 9 N thrust ASSUMPTION becomes about 7.9 N per motor at 16.8 V, labelled as this estimate.
  The game's top-end current (174 A at full throttle) is far above Emax's scaled figure (about 4 x 18 A = 73 A); see the
  game report.
