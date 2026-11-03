# Change requests for the step text (from the Opus truth table)

For the Sonnet session, which owns `index.html`. Nothing here has been applied. **Shad approves these first (Phase A gate).**
Each request names the truth-table id (see `STEP-TRUTH.md` for the source quotes). "Old" is the visible text of the step as of 2026-11-03; match it inside the one `asm-step` block, keeping any tags around it.

Safety-critical ones are marked **[SAFETY]**.

## Step 3
1. **S3.0 (new action, before "Cut each motor wire")**
   New: "Fit the ESC in the centre of the frame on the four long stack screws with the soft grommets from the stack box, battery pads to the rear."
2. **S3.3**
   Old: "Solder the XT60 lead and the capacitor — + to +, − to −."
   New: "Solder the XT60 lead and the capacitor to the ESC's battery pads — + to +, − to −. On the capacitor the long leg is +, and the striped side is −."
3. **S3.4**
   Old: "Bolt the flight controller onto the standoffs, above the ESC."
   New: "Plug the 8-wire cable from the stack box into the ESC and the flight controller, then fit the flight controller on the same four screws above the ESC."

## Step 4
4. **S4.1**
   Old: "on a free UART. Read the real pad name off the GEPRC manual — “R2/T2” is unconfirmed for this board."
   New: "on UART2: receiver T → R2, receiver R → T2 (GEPRC's TAKER F405 BLS 50A stack manual shows exactly this)."
5. **S4.3** (drop the fallback; GEPRC's manual shows the analog pads)
   Old: "If it turns out to have no analog pads, wire camera → VTX direct and rely on radio telemetry instead."
   New: "Power the VTX from the FC's 9V pad and ground, and connect its control wire to T1 (UART1), as GEPRC's manual shows."
6. **S4.6**
   Old: "Check the board target against the GEPRC manual."
   New: "Check the board target is GEPRCF405."
   Also: "In Ports, turn on VTX control for UART1" can be added if Shad wants the VTX power set from Betaflight (optional).
7. **S4.S [SAFETY]**
   Old: "never power the VTX without its antenna — it burns out in seconds."
   New: "never power the VTX without its antenna screwed on."
8. **S4.C**
   Old: "the arm switch arms and disarms in the Configurator"
   New: "the arm switch moves the indicator into the ARM range in the Modes tab"

## Step 5
9. **S5.1b (new action, after "Put the two 18650 cells in the radio.")**
   New: "Charge the radio with its USB-C cord."
10. **S5.4 [SAFETY]**
    Old: "Charge inside the closed LiPo bag and stay next to it the whole time."
    New: "Charge with the pack inside the LiPo bag on a fireproof surface, leads out through the opening, and stay next to it the whole time."
11. **S5.C**
    Old: "bag closed beside you."
    New: "pack in the bag, you beside it."

## Step 6
12. **S6.0 (new action, first)**
    New: "Flash the blank card with Raspberry Pi OS and turn on I2C (see the Pi bench steps in the stage checklist)."
13. **S6.1**
    Old: "Solder the 1×5 headers onto both sensor boards."
    New: "Solder the straight male 1×5 header onto each sensor board (keep the right-angle socket header spare)."
14. **S6.3**
    Old: "skip pin 4"
    New: "leave the 4th pin (INT) empty"
15. **S6.S [SAFETY]**
    Old: "Sensors are 3.3V only — never put 5V on them."
    New: "Power the sensors from the cable's red 3.3V wire only."

## Step 7
16. **S7.4**
    Old: "Strap the bare MLX breakout — it has no mounting holes of its own."
    New: "The MLX breakout has two small mounting holes (13.6 mm apart); fix it by those once the screw size is checked on the real board."
17. **S7.4b (new action, after S7.4)**
    New: "Solder the meter-checked micro-USB pigtail to a 5V and GND pad pair on the flight controller and plug it into the Pi's power socket."
18. **S7.7**
    Old: "Slide the battery on the grip pad until the drone balances on its centre."
    New: "Slide the battery on the grip pad until the drone balances on its centre, then strap it down with the second Kevlar strap."

## Step 8
19. **S8.N**
    Old: "Acer laptop"
    New: "Your laptop"
20. **S8.2 [SAFETY]**
    Old: "Bench power with props OFF: connect a charged pack (Step 5) through the smoke stopper. Check that every radio channel responds, that the failsafe cuts the throttle when you switch the radio off, and that the picture appears on the monitor."
    New (**REVISED after the safety review, 2026-11-03; supersedes the first wording**): "Bench power with props OFF: connect a charged pack (Step 5) through the smoke stopper. Its light must stay green. Check that every radio channel responds and that the picture appears on the monitor. Then unplug, remove the smoke stopper (it cuts out at 1.2 A, and spinning motors can draw more, which would hide the result), plug the pack in directly, arm, raise the throttle a little, and check that the motors stop when you switch the radio off."
21. **S8.3 [SAFETY]**
    Old: "Still props OFF: in Betaflight's Motors tab, check each motor's number and spin direction against the diagram."
    New: "Still props OFF and without the smoke stopper: in Betaflight's Motors tab, check each motor's number and spin direction against the diagram."
22. **S8.5**
    Old: "and the site checks are done."
    New: "and the site is in uncontrolled airspace with nobody within 30 m (100 ft) sideways."

## NEW after the independent safety review: NOT approved yet (Shad decides)
These came after Shad's yes to items 1-22. Do not apply until Shad says yes to them.

23. **S4.6 [SAFETY] (re-checked in Betaflight's source)**
    Old: "Set the battery maximum cell voltage to 4.35 V (the packs are LiHV)."
    New: "Set the battery maximum cell voltage to 4.40 V (the packs are LiHV and charge to 4.35 V per cell; at 4.35 Betaflight would count a full pack as 5 cells)."
24. **S5 charge current [SAFETY] (re-checked in the charger manual)** new action after "Select LiHV / 4S":
    New: "Set the charge current to 1.0 A (the charger offers 0.5, 1.0, 2.0 and 2.5 A; its manual recommends 1C to 2C, and 1C for these packs is 1.5 A)."
25. **S5.3 [SAFETY] (re-checked in the charger manual)**
    Old: "Select LiHV / 4S on the charger screen."
    New: "Select LiHV / 4S on the charger screen, and check both on the screen before you start. LiHV only for packs marked HV."
26. **S5 storage (re-checked in the charger manual)** new action at the end:
    New: "If you will not fly within a day or two, use the charger's storage mode."
27. **S8.5 [SAFETY] (reviewer-sourced, not re-checked by me)**
    Add: "Check the site on NAV Drone first: basic flying needs uncontrolled airspace, more than 5.6 km from an airport and 1.9 km from a heliport." (The 5.6 km figure I did check [R35]; the 1.9 km heliport line is on the same page I fetched.)
28. **S8.3 (reviewer-sourced, Betaflight Motors tab, which I fetched)**
    Add: "If a motor spins the wrong way, reverse it with the Motor direction tool in the same tab (props off)."
29. **S8 props-off checks [SAFETY] (re-checked: Betaflight setup guide lines 50, 162-165, incl. "If any of these tests fail, do not attempt to fly.")**
    New action before fitting props: "With props off and throttle at about 30% in Angle mode, tilt the drone: the low side's motors must speed up. Also check the 3D model in Betaflight tilts the same way as the drone. If any check fails, do not fly."
30. **S8 handling habit [SAFETY] (reviewer's practical rule, no single source)**
    Add to step 8 safety: "Battery out whenever your hands are on props or motors. Radio on and arm switch off before the battery goes in."
31. **S5 safety (reviewer-sourced, not re-checked: Oscar Liang LiPo guide)**
    Add: "Let a pack cool before charging it. Keep a fire extinguisher or a bucket of sand within reach; the bag slows a fire but does not stop it."

## NEW during Phase B modelling
32. **Top plate is never fitted (found while modelling)**: APPROVED by Shad by popup, recorded in board\DECISIONS.md line 32 (2026-11-03).
    No step says to fit the frame's top plate, yet step 7 straps the battery onto it. TBS's drawing shows the top plate sits on the 22 mm (front) and 30 mm (rear) standoffs.
    New action at the end of step 4 (after the VTX and antenna are mounted, before any battery): "Fit the top plate on the standoffs."

33. **Action ids on the page (Phase D; markup only, no wording change). NOT approved yet.**
    Put `data-action-id="S4.1"` (etc.) on each numbered action `<li>` (and the safety line) in each `asm-step` block. The ids are the ones in each model's action list (STEP-TRUTH.md "Phase D" table):
    - S1.1-S1.3, S1.S
    - S2.1-S2.4
    - S3.0-S3.4
    - S4.1-S4.8
    - S5.1, S5.1b, S5.2, S5.3, S5.4, S5.S
    - S6.0-S6.4, S6.S
    - S7.1, S7.3, S7.4, S7.4b, S7.6, S7.7
    - S8.1-S8.7

    Why: the gate's "step models" suite then proves that every action button in the 3D view matches a line on the page. It already checks this strictly for any step that carries the ids, and prints INFO for steps that don't yet.

## Phase E: items 34-38 APPROVED by Shad (popup via the architect, board DECISIONS.md, 2026-11-03)
34. **Flying camera tilt (step 4, new action after "Wire camera -> FC CAM ...")**
    New: "Set the flying camera's tilt to about 10° up (the beginner range is 10-15°). Loosen the two side screws on the camera mount, tilt, re-tighten. Raise it 5° at a time once hovering and throttle feel easy."
    Source: Oscar Liang, https://oscarliang.com/camera-angle/ : "If you're new to FPV, a 10°–15° camera angle is an excellent starting point." and "Even a 5° increase can dramatically change how fast everything feels."
    `[REQUIRES REAL INPUT]`: the "two side screws" are how most camera mounts work; check the V6's TPU mount when it arrives.
    Plain words for the page: the camera points slightly up on purpose, because the drone tips forward when it flies, and the picture then looks level. The 3D view has a "Flying camera tilt" slider to show this.
35. **Landing legs requirement (step 7, replaces "(Open item: the legs are not chosen yet ...)")**
    New: "Legs must stand at least 40 mm below the bottom plate: the payload's lowest part sits about 27 mm below it (design simulation, docs/build-truth/SIMULATION.md). Off-the-shelf legs only."
36. **Payload layout (step 7). Approved by Shad's layout decision (option 1, DECISIONS.md); wording to confirm.**
    Old: "Measure before you drill or cut. Hold the Pi and both sensor boards in place and sight down through the lens position. Pi under the bottom plate (or over a cutout you have measured); the MLX90640 hangs below it, lens down; the PA1010D sits on top, patch antenna up."
    New: "Under the bottom plate, centre the Pi 36 mm behind the stack centre. Put a flat foam or rubber pad between the plate and the Pi's four 12 mm nylon standoffs. The pad stops the board touching carbon, and you do not need to drill the plate. Mount the MLX90640 just ahead of the Pi on the same pad, lens straight down, its wide side across the drone. Put the PA1010D on the top plate in front of the battery, antenna up. Hold the real parts in place first: these positions come from a design simulation, not a test fit."
37. **Fixing the payload (step 7). Approved by the same decision; wording to confirm.**
    Old: "Fix the Pi on nylon standoffs and zip-tie it down, then add the Kevlar strap as the second lock. Strap the bare MLX breakout — it has no mounting holes of its own." (item 16 already corrected the MLX holes)
    New: "Thread two zip ties through the bottom plate's windows nearest the Pi and pull them snug round the Pi. Then add the Kevlar strap as a second lock. The MLX90640 has two small mounting holes, 13.6 mm apart: fix it by those to short standoffs on the pad."
38. **Battery position (step 7, S7.7). Approved by the same decision; wording to confirm.**
    New, added after the balance sentence: "With this layout the drone balances with the battery centred anywhere from 10 mm behind to 2 mm ahead of the frame centre. Start at 4 mm behind and check by lifting it on two fingers under the arms."

39. **Fitting the legs (step 7, new action after the battery). NOT approved yet.**
    New: "Fit the landing legs. In each of the four spare standoff holes, two at the back under the bottom plate and two at the front under the middle plate, screw two stacked M3 aluminium standoffs together with M3 set screws, then a rubber foot. Use 25 mm standoffs at the back and 28 mm at the front, so the drone sits level. The legs, not the payload, must touch the ground (the payload's lowest part is about 29 mm below the plate; the legs reach about 56 mm). The stance is narrow, so land on flat ground."

## From the chip-versus-page comparison (Builder, 2026-11-03): 40 and 41 APPROVED by Shad (popup via the architect, DECISIONS.md); the Builder applied them
Until these are approved, the 3D chips use the page's current wording. The extra detail stays in the 3D model's tap-to-name labels ("Motor M1, rear right, spins clockwise"; "Prop on M1: clockwise (CW) prop"), which already say it.

40. **Motor order in words (step 2, S2.3)**
    Old: "Screw the 4 motors onto the arms — the picture shows the M1–M4 order."
    New: "Screw the 4 motors onto the arms: M1 rear right, M2 front right, M3 rear left, M4 front left (the order Betaflight uses)."
    Source: [R28] Betaflight Motors tab diagram, https://betaflight.com/assets/images/betaflight_props_in_out-704f91537d690070cb896197c62fbcb6.png : seen from above, 1 rear-right, 2 front-right, 3 rear-left, 4 front-left. [R1] the GEPRC stack manual draws the ESC motor pads in the same corners, battery leads at the rear.
    Why: the page now relies on the picture alone; the words let Shad check the order without the 3D view.

41. **Which prop on which motor (step 8, S8.4)**
    Old: "Fit the props. Each prop has a CW or CCW marking; it goes on the motor that spins that way in the Betaflight diagram. Tighten the nut and check the prop spins freely and straight."
    New: "Fit the props. Each prop has a CW or CCW marking: CW props go on M1 and M4, CCW props on M2 and M3, as the Betaflight diagram shows. Tighten the nut and check the prop spins freely and straight."
    Source: [R28] Betaflight "props in" diagram: 4 front-left and 1 rear-right clockwise, 2 front-right and 3 rear-left anticlockwise, seen from above. [R6] the props come as "2 x CW Propellers 2 x CCW Propellers".
    Not in this change: "battery out while fitting props". The page's step 8 safety line already says "Battery out whenever your hands are on props or motors" (item 30, approved), so the action line does not need it again.
    Still `[REQUIRES REAL INPUT]`: how Gemfan marks CW and CCW on the prop, and which face goes up (read it off the real props; arrival checklist).

## From the Phase F build check (scripts/build/verify_build.py): NOT approved yet (Shad decides)
42. **Stack screws under the foam pad (step 7, S7.3, add one sentence at the end). APPROVED by Shad 2026-11-03; applied by the Builder.**
    New: "If a stack screw head or tip sticks out under the bottom plate, cut a small hole in the pad there so the pad lies flat."
    Why: all four stack screws (30.5 mm square round the stack centre) sit inside the pad's footprint (verify_build.py check FIT-pad-screws). Whether anything sticks out depends on how the stack box's screws (R2 "4 x M3*30 Screws", "4 x M3*24 Screws", "8 x Nylon nuts") and the frame's "8x M3 press insert nut" (R3) go together, which the listings do not say. Arrival check "Stack screw length" covers it.

43. **GPS cable extension and battery position (Shad chose: keep the GPS at the front, lengthen its cable). APPROVED by Shad 2026-11-03 (with a 'check on arrival' tag for the meter's beep setting); applied by the Builder.**
    a) Step 6, new action after "Push the Qwiic HAT onto the Pi" (S6.2), proposed id S6.2b:
       New: "Lengthen the GPS cable (the thermal camera's cable is long enough as it is). Cut 4 pieces of silicone wire, 12 cm each. Work on one wire at a time: cut one of the GPS cable's wires about 5 cm from its Qwiic plug, solder a piece between the two cut ends, and cover each joint with 3 mm heat shrink. Only then cut the next wire. Leave about 2 cm between neighbouring joints so they do not sit side by side. Because only one wire is ever cut at a time, each wire still ends in its own colour at both ends, even though the extension wire is all red. Then check with the multimeter on its continuity (beep) setting, or its lowest resistance setting: each colour connects to the same colour at the far end, and no two different colours connect."
       Why and sources: the 150 mm cable [R22 "length is 150mm"] needs about 239 mm on the route the 3D view shows (verify_build.py WIRE-qwiic-gps; route in geometry/routes.json). 150 + 120 - 2 x 5 mm of joint overlap (my estimate) = 260 mm, which leaves about 21 mm in hand (10,000 tolerance runs: all pass, worst 1.5 mm). The only thin wire on the list is Rotor Village 26 AWG and the shop sends one colour (architect, DECISIONS.md: "Thin wire only 3 ft RED"), so the one-wire-at-a-time order is what keeps SDA and SCL from swapping. No new tool: the kit has a multimeter [R15]. `[REQUIRES REAL INPUT]`: whether the kit's meter has a beep setting (otherwise use ohms).
    b) Step 7, S7.3, add at the end:
       New: "Run the GPS cable as the 3D view shows: from the HAT up through the bottom plate's window next to the Pi, over the flight controller, and round the front edge of the top plate to the GPS."
    c) Step 7, S7.7:
       Old: "Slide the battery on the grip pad until the drone balances on its centre, then strap it down with the second Kevlar strap. With this layout the drone balances with the battery centred anywhere from 10 mm behind to 2 mm ahead of the frame centre. Start at 4 mm behind and check by lifting it on two fingers under the arms."
       New: "Slide the battery forward on the grip pad until it is about 2 mm from the GPS board, then strap it down with the second Kevlar strap. The GPS stops it from reaching the exact balance point, so the drone sits about 3 mm tail-heavy. That is inside the 5 mm the design allows. Check by lifting it on two fingers under the arms: it should tip back only gently."
       Why: the exact balance point is about 12 mm ahead of the frame centre (verify_build.py, including about 46 g of parts the page does not weigh yet, my estimates), and the battery's front edge would then sit inside the GPS board. At 2 mm from the GPS the balance point is 2.5 mm behind centre (10,000 runs: all within 5 mm, worst 4.4 mm). The old range ("10 mm behind") came from my earlier simulation without those parts: at 10 mm behind it is 6.0 mm off.
    d) Buy list (the Builder's; costs money, so Shad decides):
       - 26 AWG silicone wire, same Rotor Village line: 5 feet instead of 3 (+CA$2.78). Need: receiver 4 x 60 mm, VTX up to 3 x 60 mm, GPS extension 4 x 120 mm, plus 15 mm waste per piece = about 1,065 mm; 3 feet = 914 mm (my estimates of the receiver and VTX wire lengths).
       - Heat Shrink - 3mm x 150mm - Clear, Rotor Village, CA$0.79 each, "96 in stock", "Shrink rate: 2:1", https://rotorvillage.ca/heat-shrink-3mm-x-150mm-clear/ (opened 2026-11-03): 2 pieces (+CA$1.58). The 6 mm black on the list shrinks only to about 3 mm, too loose to stay on a thin-wire joint. 8 joints x 15 mm = 120 mm, so one piece is enough and the second is spare.

44. **Correction to my own change request 43a (S6.2b): heat shrink goes on BEFORE soldering. APPROVED by Shad 2026-11-03 (DECISIONS.md).**
    Old (on the page now): "... solder a piece between the two cut ends, and cover each joint with 3 mm heat shrink. Only then cut the next wire. ..."
    New: "... slide a 15 mm piece of 3 mm heat shrink onto the wire, well away from the joint, solder a piece between the two cut ends, then slide the heat shrink over the joint and shrink it with the iron's side or a lighter held well back. Only then cut the next wire. ..."
    Why: once both ends of a wire are joined, a tube cannot be slid over the joint any more, so the step as written cannot be done. My mistake in 43a, found while building the close-up. Sources: none needed for the order (it follows from the wire being joined at both ends). "the iron's side or a lighter" is common practice, not from a listing; the kit's listing does not include a heat gun.

45. **Second correction to S6.2b (my error in 44): two heat-shrink pieces per wire, not one. APPROVED by Shad 2026-11-03 (DECISIONS.md); on the page. Shad also dropped the 38 mm heat shrink (no step uses it).**
    Old (change request 44, approved): "... slide a 15 mm piece of 3 mm heat shrink onto the wire, well away from the joint, solder a piece between the two cut ends, then slide the heat shrink over the joint and shrink it with the iron's side or a lighter held well back. ..."
    New: "... slide two 15 mm pieces of 3 mm heat shrink onto the extension piece, solder its ends to the two cut ends, then slide one piece over each joint and shrink it with the iron's side or a lighter held well back. ..."
    Why: each wire is cut once, so the extension piece has a joint at each end: two joints per wire, 8 in all (as change request 43 already says). One piece of heat shrink cannot cover both. Putting both pieces on the extension piece first means neither can be forgotten. Heat shrink needed: 8 x 15 mm = 120 mm, inside one 150 mm tube; the list has two.

## Ease pass (beginner testers, plan rows in beginner-test/ease-pass-plan.md): NOT approved yet (Shad decides batch by batch)
Research and sources for every item: docs/build-truth/EASE-PASS-RESEARCH.md (row ids in brackets).

### Batch B: Stage 1
46. **What plugs into what for the iron, and what to do if the adapter does not match [B1, with Shad's decision on the fallback]. Stage 1.**
    a) Add after "Before the iron is ever plugged in: ..." (the meter test sentence):
       New: "The adapter's round plug goes straight into the iron's power socket: both are 5.5 x 2.5 mm."
    b) Old: "Then check the iron or its cable for a polarity marking. Iron polarity is not confirmed: if the marking is missing or does not match the adapter, stop and do not plug it in."
       New: "Then check the iron for a polarity marking (a small drawing of a dot and ring with + and -). If the marking is missing, or does not match what the meter showed, do not plug the adapter into the iron. Take a photo of the iron and the adapter's label, message the shop, and wait for their answer. Until then you can still power the iron from a charged 4S flight battery (Step 5) with the kit's own short 'XT60 to DC' cable: its XT60 end goes into the battery, its round end into the iron. The iron runs on 12 to 24 V and a 4S battery gives about 13 to 17 V, so it heats a little more slowly. Unplug the battery as soon as you finish. The first time the iron is on, time how long it takes to melt solder, so you know how long to wait."
    Sources: Rotor Village kit listing (https://rotorvillage.ca/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron/): "Power Interface: 5.5*2.5", "Working voltage: DC12--24V", "Work Current: >=1.5A", "1x XT60 to DC Cable"; the features list also says "XT60 Plug power cable". Buy list: adapter "5.5 x 2.5 mm plug". Pack range from R12/R42 (4 x 3.3 to 4 x 4.35 V).
    Caveats, NOT confirmed (marked `[REQUIRES REAL INPUT]`):
    - Which end of the "XT60 to DC Cable" is which is read from its name. No listing shows it.
    - That the kit's cable matches the iron's polarity is an assumption: it ships in the same kit. No listing states either polarity. Arrival check: with a charged pack, meter the cable's round plug (red probe in the centre) and compare it with the iron's marking before first use.
    - Heat-up time: no listing gives one ("fast heating" only, ht-dron.pl).
    - "Unplug the battery as soon as you finish" is my safety wording, not from a listing. The iron has no low-voltage cut-out that any listing mentions.
    - The polarity symbol description ("a dot and ring with + and -") is the usual way it is drawn, not from this iron's listing.

47. **The micro-USB pigtail, step by step [B6]. Stage 1.**
    Old: "Build the micro-USB power pigtail: cut one end, meter-check the wires, insulate with heat shrink. A real drone part."
    New: "Build the micro-USB power pigtail: a short cable with a plug on one end and bare wires on the other. You will use it in Step 7 to power the Pi from the flight controller.
     1. Keep the small right-angle micro-USB plug (it goes into the Pi). Cut off the big flat USB-A plug, leaving about 20 cm of cable on the micro-USB side.
     2. Strip 3 cm of the outer jacket. Inside are four wires: two thicker ones carry power, two thinner ones carry data.
     3. Find which thick wire is + and which is -. Set the multimeter to its lowest resistance (ohms) setting. Touch one probe to a thick wire and the other to the outermost pin at each end of the micro-USB plug. Close to 0 ohms means connected. Pin 1 (the + pin) is at one end of the row of five pins, and pin 5 (the - pin) is at the other. Wrap a small piece of tape round the + wire.
     4. Cut the two thin data wires short and cover each end with a piece of 3 mm heat shrink.
     5. Strip 3 mm off each power wire and tin it. Leave them loose until Step 7."
    Sources: PiShop listing: "standard A to micro-B USB cable", "right angle bend", "24 AWG power wires, and 28 AWG data lines", "Length: 56.25" / 1.42m". Micro-B pins (Wikipedia, USB hardware): pin 1 VBUS "+5 V", pin 5 GND. Kit meter: "Resistance: 0.1Ω - 40MΩ". 20 cm from the 150 mm route (verify_build).
    `[REQUIRES REAL INPUT]`: wire colours inside this cable (not stated; the guide does not rely on them). How to see pin 1 and pin 5 inside a micro-USB plug needs checking on the real plug, and a picture would help: an arrival check is added.

### Batch A: whole guide
48. **Step 7: what is done now and what after the first hover [A3], and balance for the bare quad (a gap found while doing A3).**
    a) Tags for the Builder to add to each Step 7 line:
       - NOW (before the first hover): S7.6, S7.7 (first sentence, below), S7.3 (hold the parts in place only), S7.5.
       - AFTER THE FIRST HOVER: S7.3 (fixing), S7.4, S7.4b, S7.8, S7.7 (second part).
    b) S7.7, add at the start:
       New: "For the first hover (no payload yet): slide the battery on the grip pad until the drone balances on two fingers under the arms, about 7 mm ahead of the frame centre, then strap it down. After the payload is on: loosen the strap and ..." The approved S7.7 sentence follows unchanged ("... slide the battery forward ... until it is about 2 mm from the GPS board ...").
       Why: the approved sentence uses the GPS as the stop, but the GPS goes on after the first hover. TRUTH (verify_build weights): the bare quad, about 502 g, balances with the battery about 7 mm ahead of centre.

49. **Say in words what the 3D view shows; no file paths in step text [A6].**
    a) S7.3. Old: "Run the GPS cable as the 3D view shows: from the HAT up through ..."
       New: "Run the GPS cable along the drone's right-hand side (right as seen from the tail looking forward): from the HAT up through ..." The rest stays.
       Source: routes.json; the route stays on the right of the centre line all the way.
    b) S7.5. Old: "(design simulation, docs/build-truth/SIMULATION.md)". New: "(from the design check)". The file path stays only in the "How this was checked" section.

50. **Facts that were only in a picture [A9] and the words list [A4].**
    a) S7.8, after "In each of the four spare standoff holes,". Add: "(the two frame standoff holes at the very back of the bottom plate, and the two at the front of the middle plate, ahead of the stack)".
       Source: TBS drawing, frame_outlines.json: back pair about 81 mm behind the stack centre, front pair about 53 mm ahead.
    b) S7.4. Old: "through the bottom plate's windows nearest the Pi". New: "through the two slots on the bottom plate's centre line just behind the stack (about 3 and 5 cm behind it)".
       Source: frame_outlines.json, windows 3 and 1.
    c) Words card: the definitions in EASE-PASS-RESEARCH.md A4, each checked against the listings or marked "common usage". The Builder places them and adds the first-use brackets.

### Batch C: Step 8
51. **First hover, step by step [C1]. S8.5.**
    Old: "First hover of the bare quad, payload not yet mounted: 1 metre up → land → feel the motors for heat. Only after you hold the Basic certificate, the drone is registered and marked, and the site is in uncontrolled airspace with nobody within 30 m (100 ft) sideways. Never above 122 m (400 ft) AGL. If you fly by a screen, you need a visual observer; until then, fly looking at the drone."
    New: "First hover of the bare quad (no payload yet). Fly only when all five are true: you hold the Basic certificate; the drone is registered; its registration number is marked on it; the site is in uncontrolled airspace; nobody is within 30 m (100 ft) sideways. Never above 122 m (400 ft) above the ground. If you fly by a screen, you need a visual observer; until then, fly looking at the drone.
     1. Put the drone on flat open ground, camera pointing away from you. Radio on, arm switch OFF.
     2. Plug in the battery and step back at least 5 m.
     3. Arm. Slowly raise the throttle until the drone lifts off, and hold it about 1 metre up for up to 30 seconds.
     4. Lower the throttle gently to land. Disarm. Unplug the battery.
     5. Touch each motor: they should all feel about the same. If one is much hotter or colder than the others, do not fly again until you have found out why."
    Sources: TheDroneFlight first-flight checklist ("Slowly increase throttle to hover (mid-stick)", "Practice hovering in place for 30 seconds"); Betaflight ("ARM activates the PID loop and allows the motors to spin"). The five rules are the page's own (unchanged).
    Not sourced: "at least 5 m" is my choice. So is "the camera pointing away from you" (that makes the drone's left and right match yours). The motor comparison is common advice I could only find in search summaries; no temperature figure is given. Shad decides whether to keep these.

52. **Betaflight download and the Motors tab [C4]. S8.3.**
    Old: "Still props OFF and without the smoke stopper: in Betaflight's Motors tab, check each motor's number and spin direction against the diagram. If a motor spins the wrong way, reverse it with the Motor direction tool in the same tab (props off)."
    New: "Still props OFF and without the smoke stopper. Open Betaflight Configurator (download: github.com/betaflight/betaflight-configurator/releases/latest, or use app.betaflight.com in Chrome) and press Connect with the USB cable in. Plug in the battery. In the Motors tab, tick the confirmation box, then raise one motor's slider a little at a time. Check the motor that spins is the right one: M1 rear right, M2 front right, M3 rear left, M4 front left, seen from above with the camera at the front. Check it spins the way the diagram shows. If a motor spins the wrong way, reverse it with the Motor direction button in the same tab (props off). Lower the sliders and unplug the battery when done."
    Sources: Betaflight setup guide ("You need the Betaflight Configurator installed on your PC." with the releases link; "Plug in a battery, tick the confirmation checkbox, and slowly raise the Master slider."); Motors tab page ("Motor direction - opens a motor direction test tool ..."; "Once a battery is connected and the ESC is online the motors can be spun using the sliders"); motor positions from change request 40 (approved).
    `[REQUIRES REAL INPUT]`: whether this Configurator version has a slider for each motor as well as the Master slider. The docs name the Master slider; check on the laptop.

53. **Angle mode for the tilt test [C6]. The props-off tilt check line (no id).**
    Old: "With props off and throttle at about 30% in Angle mode, tilt the drone: the low side's motors must speed up. Also check the 3D model in Betaflight tilts the same way as the drone. If any check fails, do not fly."
    New: "Set up Angle mode first: in Betaflight's Modes tab, click Add Range next to ANGLE and put it on a switch on your radio (ANGLE is the self-levelling mode). Then, props off: arm, switch to Angle mode, and raise the throttle about a third of the way. Tilt the drone so one side points down, for example the nose down: the motors on the low side (here the two front motors) must speed up. Also check the 3D model in Betaflight tilts the same way as the drone. If any check fails, disarm, unplug the battery and do not fly; ask for help before trying again."
    Sources: Betaflight setup guide ("In ANGLE mode, without propellers, throttle at approximately 30% : tilt the aircraft so one motor points toward the ground — does that motor spin up and stay at high RPM ..."; "ANGLE — A self-levelling mode useful for beginners"; "Click Add Range — this creates a range slider tied to an AUX channel").
    Not sourced: "a third of the way" stands in for 30 %; Betaflight's Receiver tab page gives no number scale.

54. **NAV Drone link [C8]. The NAV Drone line (no id).**
    Old: "Check the site on NAV Drone first: basic flying needs uncontrolled airspace, more than 5.6 km from an airport and 1.9 km from a heliport."
    New: "Check the site on NAV Drone first (NAV CANADA's free map: portal.navdrone.ca, or the NAV Drone app for iPhone or Android): basic flying needs uncontrolled airspace, more than 5.6 km from an airport and 1.9 km from a heliport. See the Before you fly card."
    Source: NAV CANADA drone flight planning page (app name, the three links, "discover where you can fly"). The distances are the page's own (unchanged); NAV CANADA's page does not describe what a pass looks like.

55. **How to know the GPS is ready, and what balanced means [C9]. S8.6.**
    Old: "Now mount the payload (Step 7), wait for a GPS fix outdoors, and hover 1 metre again to check the balance."
    New: "Now mount the payload (Step 7). Outdoors, with the drone on the ground, switch the payload on and wait until it prints: 'Ground height set to ... from the first GPS fix. Fly only after this line appears.' Then hover 1 metre again: it should stay level without drifting to one side."
    Source: Shad-Drone-Payload/payload.py lines 83-84 (the exact printed line); README "Switch the payload on while the drone sits on the ground". "Without drifting" is the plan's pass rule; no number is given.

56. **Heat test with a mug of hot water and your hand (Shad: no hot plate) [C10]. S8.7.**
    Old: "Heat test: a hot plate among cold things, with the drone held steady and the props OFF. Write down what it finds."
    New: "Heat test, props OFF: fill a mug with water just poured from the kettle and set it on the table. Hold the drone steady with the thermal camera about 50 cm above the mug, then put your open hand next to the mug. The payload should report the mug as a hot spot, but not your hand (a hand is far cooler than the 60 C the detector looks for). Write down what it prints. If the mug is not found, refill it with fresh hot water and try again at 50 cm. To see what the camera would see from the air, open the thermal preview."
    Source: thermal-preview maths (thermal_preview.py) with the payload's own detector (60 C, 3 touching pixels). At 0.5 m an 8 cm mug at about 80 C covers about 24 pixels and is found; a hand at about 33 C is not. The water and skin temperatures are my assumptions, not measured.
    Model: step-08 draws a hot plate and cold objects; to change to a mug and a hand when approved.

### Batch E: Step 3
57. **Which board is which, and the rear [E1]. S3.0.**
    Old: "Fit the ESC in the centre of the frame on the four long stack screws with the soft grommets from the stack box, battery pads to the rear."
    New: "The stack box has two boards. The ESC (speed controller, it runs the motors) has big copper pads on three edges: three for each motor, and two large battery pads with a red and a black lead. The FC (flight controller) is the other board, with the USB socket. Fit the ESC in the centre of the frame on the four long (M3 x 30) stack screws, with a soft grommet in each hole, battery pads to the rear (the tail, away from the camera)."
    Sources: Rotor Village stack "Package Contents" ("1 x Flight Controller", "1 x ESC", "4 x M3*30 Screws", "8 x Silicone grommets"); GEPRC diagram (motor pads, battery leads). "Long (M3 x 30)": of the two screw sets in the box (30 and 24 mm), 30 is the long one.
    `[REQUIRES REAL INPUT]`: which way the screws go in and where the nuts go (arrival check "Stack screw length").

58. **Tinning, the motor pads and a good joint [E2]. S3.2.**
    Old: "Tin the pads. Solder the 3 wires from each motor to the ESC."
    New: "Tin the pads: melt a thin layer of solder onto each pad, and onto each stripped wire end. Each motor has three pads on the ESC edge nearest that motor. Solder that motor's three wires to them, in any order: if a motor later spins the wrong way, you fix it in Betaflight, not with the iron. A good joint is smooth and shiny and covers the pad. If solder joins two pads, remove it with the iron before you go on. Practise first on scrap (Stage 1)."
    Sources: GEPRC diagram (three pads per motor, next to it); Betaflight Motors tab page (the Motor direction tool reverses a motor in software). Tinning and what a good joint looks like are general advice, marked so; no listing says them.

59. **The XT60 lead and capacitor: both are in the stack box; check before you solder [E3]. S3.3.**
    Old: "Solder the XT60 lead and the capacitor to the ESC's battery pads — + to +, − to −. On the capacitor the long leg is +, and the striped side is −."
    New: "The XT60 lead and the capacitor both come in the stack box. Before you solder, check with the meter which XT60 wire is +, and find the + and − marks beside the ESC's two battery pads. Slide heat shrink onto the wires first. Solder the XT60 lead and the capacitor to the ESC's battery pads, + to +, − to −. On the capacitor the long leg is +, and the striped side is −. Do not cut the capacitor's legs until both are soldered the right way round. A wrong-way battery lead can destroy the ESC the first time it is plugged in."
    Sources: Rotor Village stack "Package Contents" ("1 x Capacitor", "1 x XT60 Power cable"); Oscar Liang (R34) "1x 35V 1000uF capacitor"; GEPRC diagram (battery pads, "−" mark).
    `[REQUIRES REAL INPUT]`: the + mark beside the pad is readable only as "−" on the diagram. "Can destroy the ESC" is general knowledge, not quoted from GEPRC.

60. **What the smoke stopper's light means [E4]. The "First power-up goes through the smoke stopper" line.**
    Old (Step 3 safety line): "⚠ Safety: glasses on, window open. First power-up goes through the smoke stopper — never direct."
    New: "⚠ Safety: glasses on, window open. First power-up goes through the smoke stopper (a plug-in fuse that cuts the power if something is shorted) — never direct. Its light should turn solid green. If the light goes off and it beeps, unplug the battery at once and look for a solder bridge or a wire touching where it should not."
    Source: Rotor Village iFlight listing: "The LED indicator turns solid green in normal situation," and "The LED indicator turns off and starts beeping in abnormal situation."

61. **How long to cut each motor wire [E5]. S3.1.**
    Old: "Cut each motor wire so it just reaches the ESC."
    New: "Lay each motor wire along the arm to its own pad on the ESC, add about 5 mm, and cut. The three wires reach different pads, so they end up slightly different lengths. Strip about 2 mm of each end."
    Sources: motor leads "Lead: 20# AWG 120mm" (R5). The model's routes need about 95-104 mm, so 16-25 mm is spare (verify_build; pad positions estimated). "5 mm" and "2 mm" are my choices / general advice, marked so.

62. **The 8-wire cable plugs [E6]. S3.4.**
    Old: "Plug the 8-wire cable from the stack box into the ESC and the flight controller, then fit the flight controller on the same four screws above the ESC."
    New: "Plug the 8-wire cable from the stack box into the ESC's 8-pin socket (on the edge across from the battery pads) and into the matching socket on the flight controller. The plugs fit one way only: if one does not slide in, turn it round, and never force it. Then fit the flight controller on the same four screws above the ESC, with a grommet under it, USB socket where you can reach it."
    Sources: GEPRC diagram (ESC socket "NC, CUR, M4, M3, M2, M1, BAT, GND"; FC "R4, CUR, M4, M3, M2, M1, BAT, GND"); box "1 x Flight Controller Adapter Cable". "Fits one way, never force" is general advice. "USB socket where you can reach it" follows from Step 4 (USB to the laptop).
    `[REQUIRES REAL INPUT]`: an arrow or "front" mark on the FC (none readable on the diagram).
    Model: step-03 chips S3.0-S3.4 to follow the approved words.

### Batch G: Step 7
63. **What the pad is [G1]. S7.3. A DECISION for Shad first.**
    Old: "Put a flat foam or rubber pad between the plate and the Pi's four 12 mm nylon standoffs."
    New (if Shad picks the foam tape already on the list): "Make the pad from two layers of the foam mounting tape (on the Stage 4 list), stuck to the plate. Leave the backing on the outer layer so the standoffs rest on it without sticking. Put a 1 cm square of the same tape under each of the Pi's four standoffs."
    Why: no pad is on the list. Neither the Scotch tape nor the Flywoo battery pad publishes a thickness, and the Flywoo pad is needed under the battery anyway (one pad per pack). The parts are held by the zip ties and strap; the pad only keeps them off bare carbon. Any thickness from about 1 to 4 mm keeps the payload's lowest point clear of the ground (build check CLEAR-ground).
    `[REQUIRES REAL INPUT]`: the tape's thickness (measure on arrival); whether two layers stay put under the zip ties.

64. **The thermal camera cannot be "fixed by its holes to standoffs on the pad" [G2]. S7.4. A DECISION for Shad.**
    Old: "The MLX90640 has two small mounting holes, 13.6 mm apart: fix it by those to short standoffs on the pad."
    Problem (TRUTH): a standoff cannot screw into foam, and no bottom-plate window is near the camera for a zip tie. As written, this cannot be done.
    Options (Shad picks one; wording follows):
     a) (Recommended, nothing to buy) "Stick the MLX90640 to the pad with a square of the foam mounting tape on the back of the board, lens straight down." Needs an arrival check that the board's back is flat enough. The build check's camera-view test must be re-run with the header pins pointing down.
     b) Drill two 2.7 mm holes in the bottom plate and use two M2.5 nylon screws and nuts from the 420-piece set. The design avoided drilling until now.
     c) A zip tie round the board and the plate's front edge.

65. **The pigtail on the flight controller, step by step [G3]. S7.4b.**
    Old: "Solder the meter-checked micro-USB pigtail to a 5V and GND pad pair on the flight controller and plug it into the Pi's power socket."
    New: "Battery unplugged. Use the pigtail you made and checked in Stage 1. On the flight controller, find the three pads marked GND, 5V and LED (they are for an LED strip, which this build does not use). Slide a piece of 6 mm heat shrink onto each pigtail wire. Solder the + wire to 5V and the - wire to GND, then shrink the heat shrink over the joints. Plug the micro-USB end into the Pi's socket marked PWR IN (not the one marked USB)."
    Sources: GEPRC diagram (pad group "GND, 5V, LED"); R2 "5V 3A"; Raspberry Pi docs: "One of the micro-USB ports is labelled PWR IN and is reserved for power input only".
    `[REQUIRES REAL INPUT]`: that the LED group's 5V pad shares the 5V 3A supply (the diagram labels it 5V; the arrival test "5 V rail" with vcgencmd covers the load).

66. **How a leg is fixed, and the numbers [G4]. S7.8.**
    Old: "Fit the landing legs. In each of the four spare standoff holes, two at the back under the bottom plate and two at the front under the middle plate, screw two stacked M3 aluminium standoffs together with M3 set screws, then a rubber foot. ..."
    New: "Fit the landing legs, one at a time. Each leg goes on in place of the bottom screw of one of the frame's standoffs: the two at the very back of the bottom plate, and the two at the front of the middle plate, ahead of the stack.
     1. Take out that one screw.
     2. Screw an M3 x 10 set screw halfway into the standoff through the plate, so half sticks out below.
     3. Screw a leg standoff onto it, then a second set screw, the second leg standoff, and a rubber foot with its short screw.
     Use 25 mm standoffs at the back and 28 mm at the front. The back legs reach about 56 mm below the bottom plate (25 + 25 + the 6.3 mm foot); the front legs start 8 mm higher, on the middle plate, so they end about 54 mm below it. ..." The rest (payload height, narrow stance, check on arrival, Stage 4 list) stays.
    Sources: R3 frame hardware ("20X M3x10 allen screw", "4X M3x12 allen screw", "4X M3x14 allen screw", standoffs 30 and 22 mm); gf-feet "Height: 6.3mm"; build check FIT-leg-setscrew.
    `[REQUIRES REAL INPUT]`: which of the frame's screws sits under each standoff; the leg standoffs being threaded at both ends; the foot screw length (existing arrival checks).

67. **How the GPS is fixed [G5]. S7.3, the GPS sentence.**
    Old: "Put the PA1010D on the top plate in front of the battery, antenna up."
    New: "Stick the PA1010D to the top plate in front of the battery with a strip of the foam mounting tape, so the board does not touch the carbon, antenna up."
    Source: the model's 4 mm gap stands for the tape. `[REQUIRES REAL INPUT]`: the board's back is flat enough for tape (Pimoroni lists only "approx 28x21x9mm").

68. **Zip-tie route and length, and the two straps [G7]. S7.4, first two sentences. Zip-tie length is a DECISION for Shad.**
    Old: "Thread two zip ties through the bottom plate's windows nearest the Pi and pull them snug round the Pi. Then add the Kevlar strap as a second lock."
    New: "Use the two slots on the bottom plate's centre line just behind the stack (about 3 and 5 cm behind it). For each, make a long zip tie by joining two of the 100 mm zip ties end to end [or: use one 250 mm zip tie]. Thread it up through the slot, back down, and round under the Pi. Pull it snug and cut the tail flush (a cut tail is sharp). Then add the second Kevlar strap round the Pi and the plate as a second lock. The first strap stays on the battery."
    Why: the loop round the Pi is about 110-130 mm on my estimate (Pi 14 mm below the plate), longer than one "3mm x 100MM" tie. Rotor Village also sells "Zip Ties (100pcs) - 4mm x 250MM", $12.99 (https://rotorvillage.ca/zip-ties-100pcs-4mm-x-250mm/).
    `[REQUIRES REAL INPUT]`: the real loop length (arrival check: wrap a string round the Pi on its standoffs and measure).
    Model: step-07 chips S7.3, S7.4, S7.4b, S7.8 to follow the approved words. If 64a is chosen, the camera's two standoffs become a tape square, and the build check is re-run.

### Batch F: Step 6
69. **Get the Pi ready, step by step [F1]. S6.0 (becomes the start of 6A).**
    Old: "Flash the blank card with Raspberry Pi OS and turn on I2C (see the Pi bench steps in the stage checklist)."
    New: "Get the Pi ready:
     1. On your laptop, install Raspberry Pi Imager from raspberrypi.com/software.
     2. Put the kit's card in the kit's card reader and plug it into the laptop.
     3. In Imager: Device = Raspberry Pi Zero 2 W; OS = the recommended one at the top of the list; Storage = the card. Take care to pick the card and not another drive, or you will erase that drive.
     4. In the settings, set a username (lowercase letters and numbers), a password, your Wi-Fi name and password, and turn on SSH. Write the card.
     5. Put the card in the Pi, power it from the kit's supply in the socket marked PWR IN, and connect from your laptop over SSH.
     6. Turn on I2C: type sudo raspi-config, choose 3 Interface Options, then I5 I2C, answer Yes, then Finish."
    Sources: Raspberry Pi docs, Getting started (Imager link; "select your Raspberry Pi model"; "the recommended OS ... is at the top of the list"; username rule; Wi-Fi; "Enable SSH"; "take care to choose the correct storage device", "This prevents you from permanently erasing your data"; "SSH or Raspberry Pi Connect"); Configuration ("3 Interface Options > I5 I2C"); "PWR IN" (Getting started).
    `[REQUIRES REAL INPUT]`: the exact SSH command on Windows. The Pi docs link a separate page for it, which I have not opened yet.

70. **Staggered joints and stripping [F2]. S6.2b (approved line: a new change request).**
    Old (part): "cut one of the GPS cable's wires about 5 cm from its Qwiic plug"
    New (part): "cut the wires at different places, 2 cm apart: red 5 cm from the Qwiic plug, blue 7 cm, yellow 9 cm, black 11 cm. Strip about 5 mm off each cut end and each end of the 12 cm piece."
    And replace "even though the extension wire is all red" with "even though the middle piece of every wire is red".
    Source: my length check (5 mm overlap per joint; about 21 mm to spare, build check WIRE-qwiic-gps). The 2 cm spacing is the page's own.

71. **What to type and what success looks like [F3]. S6.4.**
    Old: "Power it on the bench. Check both sensors answer: camera 0x33, GPS 0x10."
    New: "Power the Pi on the bench from the kit's supply, in the socket marked PWR IN. Over SSH, type sudo i2cdetect -y 1. In the table it prints, you should see 33 (the thermal camera) and 10 (the GPS). The GPS needs to be outdoors with a clear view of the sky to get a position, but it answers at 10 indoors too."
    Sources: Shad-Drone-Payload/README.md ("Check that both sensors answer after the reboot (camera at 0x33, GPS at 0x10): sudo i2cdetect -y 1"); "PWR IN" (Raspberry Pi docs); README step 3 (sky view for a fix).
    `[REQUIRES REAL INPUT]`: the exact look of the i2cdetect table (a grid with 33 and 10 at their places is how the tool shows it). Check against a screenshot from the real Pi.

72. **Which pin is first, without Pi pin numbers [F6]. S6.3.**
    Old: "The Pimoroni header order is 3V3, SDA, SCL, INT, GND (it maps to Pi pins 1,3,5,7,9), so plug the four cable ends in that order and leave the 4th pin (INT) empty. Ignore the HAT's silkscreen — SparkFun confirms its SDA/SCL labels are reversed."
    New: "Hold each sensor board face up with its five pins along the bottom edge. From the left, the pins are 3.3 V, SDA, SCL, INT, GND: INT is printed above the 4th pin. Push each of the cable's four separate ends onto its own pin in that order, and leave the 4th pin (INT) empty. Ignore the letters printed on the HAT: SparkFun confirms its SDA and SCL labels are swapped."
    Sources: Pimoroni MLX90640 drawing ("INT" over the 4th pin from the left, front view, header at the bottom); Pimoroni header order (R19, R20); SparkFun note (R21).
    `[REQUIRES REAL INPUT]`: the GPS board's left-to-right order (its drawing was not opened; check for the printed "INT").
    Model: step-06 chips S6.0, S6.2b, S6.3, S6.4 to follow; also the 6A/6B/6C "part" fields and clip reorder (sent earlier).

### Batch D: Step 4
73. **Receiver wiring with the stack box's own 4-pin cable [D1]. S4.1.**
    Old: "Wire the receiver: 5V + GND, then receiver TX → the FC's RX pad and receiver RX → the FC's TX pad on UART2: receiver T → R2, receiver R → T2 (GEPRC's TAKER F405 BLS 50A stack manual shows exactly this)."
    New: "Wire the receiver with one of the two small 4-wire cables from the stack box. Its plug goes into the flight controller's 4-pin socket marked G, 5V, R2, T2. Cut the other end and solder its four wires to the receiver's pads:
     | Wire from the FC socket pin | goes to receiver pad |
     | G | G |
     | 5V | 5 |
     | R2 (the FC listens here) | T (the receiver talks here) |
     | T2 (the FC talks here) | R (the receiver listens here) |
     A talking pin always goes to a listening pin. Follow each wire from its socket pin with the meter before you cut. GEPRC's stack diagram (geprc.com, TAKER F405 BLS 50A) shows this wiring."
    Sources: GEPRC diagram (socket "G, 5V, R2, T2" wired to receiver "R, T, 5, G"); Rotor Village stack box "2 x sh1.0 4pinsilicone cable"; ExpressLRS wiring ("The TX or T pad should be connected to an RX pad ...").
    `[REQUIRES REAL INPUT]`: the box cable's wire colours (not published); that its plug fits that socket (sh1.0 4-pin, as named).
    Effect: the receiver no longer uses the loose silicone wire.

74. **Software steps for the receiver [D2]. S4.5.**
    Old: "In Betaflight enable serial RX + CRSF on that UART. Then flash the RP1 V2 to the same major ExpressLRS version as your Pocket (the receiver ships on v2.4), set the 2.4 GHz regulatory domain to ISM 2400 (...) on both the radio and the receiver, and only then bind."
    New: "1. In Betaflight's Ports tab, turn on Serial RX for UART2, then Save. In the Receiver tab, pick Serial (via UART) and CRSF, then Save.
     2. On the radio, press SYS, open ExpressLRS in the Tools menu and scroll to the bottom: note the version shown.
     3. Install the ExpressLRS Configurator (github.com/ExpressLRS/ExpressLRS-Configurator/releases) on the laptop. Build the RP1 V2 firmware for the same version as the radio, with regulatory domain ISM 2400 (ExpressLRS has no separate Canada option; do not pick EU CE/LBT) and a bind phrase of your own. Write the phrase down. The receiver ships on v2.4.
     4. Close Betaflight. Power the receiver from USB and wait at least 60 seconds until its light blinks fast (Wi-Fi mode). On the laptop, join the Wi-Fi network "ExpressLRS RX" (password expresslrs), open 10.0.0.1 in a browser, and upload the firmware in the Update tab.
     5. Set the same bind phrase and ISM 2400 on the radio's ExpressLRS. With a bind phrase on both, they connect on their own."
    Sources: ExpressLRS installing-configurator page (link, "Recommended"); firmware-version page ("Press the SYS key ... ExpressLRS script in the Tools menu, and scroll to the bottom"); updating page ("at least 60s", "Rapid Blinking", "expresslrs is the Password", "10.0.0.1", "Update Tab", "Disconnect and close your FC Configurator app"); binding page (bind phrase); RP1 listing ("ExpressLRS v2.4 pre-installed"); Betaflight Ports tab ("Serial RX" column); GEPRC diagram (CRSF on UART2).
    `[REQUIRES REAL INPUT]`: that USB alone powers the receiver (arrival check "Receiver works on USB alone" exists); the exact name of the receiver's Wi-Fi network.

75. **Betaflight settings with tab names [D3]. S4.6.**
    Old: (the S4.6 paragraph)
    New: the same settings, one line each, tab first:
     "Setup tab: check the board says GEPRCF405; Calibrate Accelerometer with the frame level.
     Configuration tab: ESC protocol DShot (as the ESC manual names).
     Receiver tab: Serial (via UART), CRSF; move the sticks and check the bars move.
     Modes tab: Add Range for ARM on the switch you choose.
     Failsafe tab: Stage 2 = Drop, so the motors stop if the radio link is lost.
     Power & Battery tab: maximum cell voltage 4.40 V (the packs are LiHV and charge to 4.35 V per cell; at 4.35 Betaflight would count a full pack as 5 cells).
     Press Save on each tab before you leave it."
    Sources: Betaflight tab list (setup-tab and ports-tab pages); "Calibrate Accelerometer" (Setup tab page); "Configure Failsafe Stage 2 to Drop" (Failsafe guide); "vbat_max_cell_voltage" (Battery guide); ARM and Add Range (setup guide). "Press Save" is general knowledge of the Configurator.

76. **The VTX power check needs the battery [D4]. S4.7.**
    Old: "Set the VTX to its lowest power (25 mW) on a factory-enabled channel for bench tests."
    New: "The VTX comes locked to 25 mW, its lowest power (higher powers need a HAM licence and a long button press). Check it at the first battery power-up in Step 8 (antenna on): when it powers up, its red light flashes 3 times and then its blue light flashes once, which means power level 1 = 25 mW. To change channel or power from Betaflight later, set UART1 to SmartAudio in the Ports tab."
    Sources: TBS Unify Pro HV manual ("25mW (up to 800mW with HAM license*)"; "(FOR HAM USERS ONLY!) Press button for 20 to 25 seconds"; startup LED code: "three flashes for power level. Subsequently, the BLUE LED will indicate the value"; power table 25/200/500/800); Betaflight setup guide (SmartAudio on the VTX's UART in the Ports tab).
    `[REQUIRES REAL INPUT]`: that USB does not power the VTX (the 9 V supply is a regulator fed by the battery, R2). "3 red then 1 blue = 25 mW" is my reading of the manual's table; check it at first power-up.

77. **Camera and VTX wires, and the two wires not used [D5]. S4.3.**
    Old: "Wire camera → FC CAM and FC VTX → VTX, so Betaflight's OSD (pack voltage, timer, warnings) reaches your screen — this board has an AT7456E OSD chip. Power the VTX from the FC's 9V pad and ground, and connect its control wire to T1 (UART1), as GEPRC's manual shows."
    New: "Camera: connect its video, GND and 5V wires to the flight controller's pads marked CAM, GND and 5V (the camera runs on 5-36 V). The stack box's camera cable may plug straight in: check when it arrives. VTX: red to the FC's 9V pad, black to GND, yellow (video) to the FC's VTX pad, white (control) to T1. The VTX's orange wire (5 V out) and green wire (audio) are not used: cut each short and cover it with heat shrink, so it touches nothing. This way the OSD (the numbers on your video: pack voltage, timer, warnings) reaches your screen."
    Sources: TBS Unify Pro HV manual (red "7V-26V", black GND, orange "5V out ... Never connect to Battery", yellow "Video", green "Audio", white "Data ... Smartaudio"); GEPRC diagram (9V, VTX, T1; "CAM, GND, 5V"); stack box "1 x Camera connection cable"; RunCam "Power: DC 5-36V".
    `[REQUIRES REAL INPUT]`: whether the FC has a camera socket that the box's "Camera connection cable" fits, or only pads (the diagram shows the three pads).
    Note for Shad: TBS says to connect the red wire to battery voltage; the page (and GEPRC's diagram) use the 9V pad. Both are inside the VTX's range; this CR keeps the page's choice.

78. **How the VTX and its antenna are held [D6]. S4.4.**
    Old: "Mount the VTX and screw the 5.8 GHz antenna on before any power."
    New: "Stick the VTX to the bottom plate behind the stack with a strip of the foam mounting tape. Screw the 5.8 GHz antenna onto its gold SMA socket, finger tight, before any power. Hold the antenna's base with two zip ties to the two rear standoffs so it points up and back, out of the props."
    Sources: model position (behind the stack, antenna at the rear); TBS "SMA connector with frame mounting holes integrated"; frame listing (only a "TPU 3D Printed Camera Mount" in the box; TBS's SMA mount is a print-it-yourself file, So1-V6-2025-SMA-mount.stl).
    `[REQUIRES REAL INPUT]`: whether the V6 has a hole for the SMA nut (arrival). The zip-tie mount is general practice. If Shad has access to a 3D printer, TBS's SMA mount file is an option.

79. **Top plate screws [D8]. S4.8.**
    Old: "Fit the top plate on the standoffs."
    New: "Fit the top plate on the eight standoffs with eight of the frame's short screws (likely the M3 x 10 ones). Before tightening, check no wire is trapped between the plate and a standoff."
    Sources: R3 hardware (20 x M3x10, 4 x M3x12, 4 x M3x14; 4 + 4 standoffs).
    `[REQUIRES REAL INPUT]`: which screw size the TBS manual names; threadlock (the page says only if the manual says so).

80. **The receiver antenna [D9]. S4.2.**
    Old: "Clip the receiver's small antenna on before any power."
    New: "Press the 65 mm T antenna that came with the receiver onto its tiny UFL socket, straight down until it clicks, before any power. Point the antenna's two arms away from carbon and out of the prop circles, for example taped along a rear arm."
    Sources: RP1 V2 listing ("1 x 65mm UFL 2.4Ghz T Antenna"). "Clicks" and the placement are general practice.

81. **How to see the receiver is bound [D11]. The Step 4 check line.**
    Old (part): "Betaflight's Receiver tab shows every channel moving with the sticks · the arm switch moves the indicator into the ARM range in the Modes tab"
    New (part): "Bound: with the radio on, the receiver stops its slow blink (slow blink means it is waiting for the radio), and Betaflight's Receiver tab shows every bar moving with your sticks. The arm switch moves the marker into the ARM range in the Modes tab."
    Source: ExpressLRS LED chart ("Slow blink 500ms on/off: Waiting for connection from transmitter"; there is no separate "connected" pattern, so the Receiver tab is the sure check).
    Model: step-04 chips S4.1-S4.8 to follow the approved words. If 73 is approved, the receiver wires in the model become the box cable from the 4-pin socket. The orange and green VTX wires get end caps (77).

### Batch H: Step 5
82. **Charge in the charger's own order: set first, then plug in [H1, H4]. Reorders S5.2, S5.3, S5.3b, S5.4 (all approved lines: this is a new change request).**
    New order and words:
     "1. Put the charger on a fireproof surface (a ceramic tile, a concrete floor or a metal tray) and plug its mains cable (in its box) into the wall.
      2. Choose the type and current before you connect the pack: short-press the Type/Current key to unlock, long-press it until the screen shows LiHV (4.35 V), then short-press to set 1.0 A. Your packs are HV packs, so LiHV is right. Check 4S and LiHV on the screen.
      3. Put the pack in the LiPo bag with its leads out through the opening.
      4. Plug in the thick yellow XT60 plug (main plug) and the small white plug with five thin wires (balance lead). Charging starts by itself when both are in: there is no Start button.
      5. Stay next to it the whole time. It is finished when the screen shows F (full), up to about 1.5 hours from empty."
    Sources: M4AC manual ("Connect the M4AC to a suitable 100-240V AC to power outlet"; "Short press [Type/Current] key to release the locked state"; "Long press ... to select the cut-off voltage"; "Short press ... to select the current"; "After setting the battery voltage and current, connect the battery"; "it will automatically start charging"; "F: The battery or one of the cells is full"); ToolkitRC "AC Input Cable × 1"; pack "XT60", "Balance Lead: 40mm, JST-XH" (R12); "HV" packs (Rotor Village, EpicFPV); "fire-proof surface" (R16).
    Not sourced: the surface examples; "five thin wires" (4S = 5, general); 1.5 hours (my arithmetic, 1500 mAh at 1.0 A).
    Why it matters: today the page plugs the pack in before setting the type, and the manual says charging starts as soon as it is plugged in.

83. **Your packs are HV [H2]. S5.3 (approved; folded into 82, step 2).**
    Old: "LiHV only for packs marked HV."
    New: "Your packs are HV packs ('HV' is in the shop's name for them); check the pack's own label says HV or LiHV. If you ever charge a pack that is not marked HV, choose LiPo (4.20 V) instead."
    Sources: Rotor Village "GNB 1500mah 4S 120C HV LiPo XT60"; EpicFPV "Voltage: 15.2V (LiHV)"; manual (4.20 V = LiPo, 4.35 V = LiHv). `[REQUIRES REAL INPUT]`: the label on the real pack.

84. **Charging the radio [H5]. S5.1b (approved line).**
    Old: "Charge the radio with its USB-C cord."
    New: "Charge the radio with the USB-C cord from the radio's box (not the flight controller's cable), from a phone charger or a laptop USB port."
    Sources: R13 "1x USB-C Charging Cord", "Supports USB-C direct charging". The power source is general. `[REQUIRES REAL INPUT]`: charge time and the "full" sign (radio manual).
    Note: Stage 3 already charges the radio. Whether S5.1/S5.1b stay in Step 5 is the Builder's call; both have chips in the step 5 model.

85. **Storage mode [H6]. S5.5 (approved line).**
    Old: "If you will not fly within a day or two, use the charger's storage mode."
    New: "If you will not fly within a day or two, put the pack to storage: choose LipoStorage (3.85 V) instead of LiHV in step 2 above, plug the pack in the same way, and keep it in the LiPo bag afterwards."
    Sources: M4AC type list "LipoStorage"; Oscar Liang ("3.80V to 3.85V per cell"; "the next couple of days"); R16 bag "for storing and transporting".
    `[REQUIRES REAL INPUT]`: whether the M4AC can also bring a full pack DOWN to 3.85 V (only a shop's Q&A says yes: "Yes it does discharge to storage voltage").

86. **What swollen or damaged looks like; cooling [H7]. S5.S (approved line).**
    Old (part): "Never charge a swollen or damaged pack. Let a pack cool before charging it."
    New (part): "Never charge a swollen or damaged pack: one that is puffed up like a balloon, dented from a crash, or has a torn wrapper or damaged leads. Let a pack cool completely after flying before you charge it, until it feels no warmer than your hand."
    Sources: Oscar Liang ("swollen like a balloon", "becomes dented from a crash", "Never use or charge a damaged or swollen battery", "Allow batteries to cool down completely after a flight"). "Torn wrapper or damaged leads" and "no warmer than your hand" are my additions, marked.

87. **If it smokes or burns [H1]. S5.S (approved line): add at the end.**
    New: "If a pack smokes or catches fire: unplug the charger at the wall if you can do it safely, use the fire extinguisher or cover the bag with sand, never water, and keep away from the smoke."
    Source: Oscar Liang (unplug if possible; extinguisher or sand; "Do NOT use water"; "Avoid breathing in smoke").
    Shopping: Shad chose a small home extinguisher rated for electrical fires (DECISIONS.md). The Builder adds the shop line after checking price and stock in a real browser.
    b) Stage 5 fire-safety line, new, before the first charge:
       New: "Before your first charge, buy a small home fire extinguisher rated for electrical fires: its label shows the letter C, for example 1-A:10-B:C. Keep it within reach of the charging spot, and read how to use it before you need it."
       Source: Staples.ca, "Kidde 1-A:10-B:C Rated Home Series Fire Extinguisher (466296MTL)", "$34.99", "ULC-rated 1-A:10-B:C", "Class C fires (energized electrical equipment)" (https://www.staples.ca/products/2862184-en-kidde-1-a10-bc-rated-home-series-fire-extinguisher-466296mtl, opened 2026-11-03; stock not shown). "Read how to use it" is general advice.
    Model: step-05 chips S5.1b, S5.2-S5.5, S5.S to follow; the clip's order changes with 82 (screen setting before the plugs).

### Batch I: Step 2
88. **Hex drivers and the frame's screws [I1]. Step 2 parts line.**
    Old: "Source One V6 frame · 4 motors · Screws + standoffs · Hex drivers · Threadlock (only if the manual says so)"
    New: "Source One V6 frame (its box has the screws, standoffs and press nuts) · 4 motors (each with its own screws) · Hex drivers: the 4-in-1 set in the tool kit (M3 screws usually take the 2.5 mm bit) · Threadlock (only if a sheet in the frame box says so)"
    Sources: R3 frame hardware list; kit "1x 4-in-1 Hexagon Socket Screwdriver Set"; motor "1x Screw Set" (R4). The 2.5 mm bit is general (usual for M3 socket heads). `[REQUIRES REAL INPUT]`: the bit sizes in the set; any TBS sheet in the box.

89. **Arms and standoffs in order [I2]. S2.1, S2.2.**
    Old: "Bolt the arms to the bottom plate." / "Screw the standoffs on top."
    New: "1. Lay the four arms on the bottom plate, root ends in the middle, with the small arm spacer in the centre. Put the middle plate on top, so each arm is sandwiched between the two plates. Fit two screws through each arm's two root holes. Tighten snug, not forced.
     2. Screw the four 30 mm standoffs onto the bottom plate (two beside the stack's rear corners, two at the very back) and the four 22 mm standoffs onto the middle plate at the front. All eight end at the same height, ready for the top plate in Step 4."
    Sources: TBS drawing (layer order, hole matches, standoff positions; frame_outlines.json); R3 counts (4 + 4 screws of 12 and 14 mm, 8 press nuts, 4 x 30 and 4 x 22 mm standoffs).
    `[REQUIRES REAL INPUT]`: which screw length goes in which hole, and where the press nuts sit (no V6 manual found). "Snug, not forced" is general advice.
    Model: step-02 chips S2.1, S2.2 to follow.

### Batch K: Stage 3
90. **A named free simulator [K1]. Stage 3 line, and the Plan tab's Liftoff mention.**
    Old: "Plug the radio into the computer by USB and practice in a free FPV simulator — crash as much as you like, it costs nothing."
    New: "Practise in FPV SkyDive, a free simulator on Steam (store.steampowered.com/app/1278060; Windows 64-bit). With the radio's cells in (it will not work on USB power alone), plug the radio into the laptop by USB and choose USB Joystick (HID) on the radio's screen. Then pick it as the controller in the simulator. Crash as much as you like: it costs nothing."
    And on the Plan tab: Liftoff is not free (Steam "CDN$ 25.99"). Either remove it from "free" or say "Liftoff (about $26)".
    Sources: Steam FPV SkyDive ("Free To Play", ORQA, "Windows (7,8,10) 64-bit", "Preferably a transmitter radio is wanted"); Steam Liftoff ("CDN$ 25.99"); Oscar Liang ("USB Joystick (HID)"; OpenTX page, EdgeTX's forerunner); Pocket listing ("Controller will NOT function on USB alone, it still needs batteries").
    `[REQUIRES REAL INPUT]`: the laptop meets "GTX 650 (2GB) or better", or the low graphics settings work; the exact EdgeTX prompt text on the Pocket.

91. **Minimum radio set-up [K2]. Stage 3 line.**
    Old: "Charge the cells in the radio; set up EdgeTX: switches, arm switch, timer, model name."
    New: "Put the two cells in the radio and charge them with the radio's own USB-C cord. Then set up EdgeTX: create a model and name it after the drone; choose a 2-position switch as the arm switch (down = disarmed); set a timer to count down 3 minutes for your first flights. You tell Betaflight which switch arms in Step 4."
    Sources: Pocket listing ("1x USB-C Charging Cord", "Built-in USB-C QC3 Charging", "Preinstalled with EdgeTX firmware"). The set-up items are general practice, marked. `[REQUIRES REAL INPUT]`: switch names on the Pocket (its manual).

### Batch J: Step 1
92. **The manuals, by name and link [J1]. S1.3.**
    Old: "Download the manuals for the stack, receiver, VTX and Pi sensors."
    New: "Download or bookmark these (links in the table): frame drawings (TBS), flight stack wiring diagram (GEPRC), receiver guide (ExpressLRS), video transmitter manual (TBS), thermal camera and GPS pages (Pimoroni), charger (ToolkitRC), radio (EdgeTX manual)." The Builder adds the table from EASE-PASS-RESEARCH.md J1.
    Sources: the makers' URLs in J1. Gaps: no TBS V6 build manual and no RadioMaster PDF opened.
    Model: step-01 chip S1.3 to follow.

### Calm-markers gaps (six notes; APPROVED by Shad 2026-11-03 via the architect, with CR 98 changed: "green" dropped; CR 81 follow-up approved too). Research: EASE-PASS-RESEARCH.md M1-M6.
93. **The meter method for the battery lead [M1]. S3.3, replace "[REQUIRES REAL INPUT: the meter method.]".**
    New: "(Set the meter to its beep or lowest ohms setting. Touch one probe to the XT60 pin marked +, the other to a wire end: the wire that beeps is +.) [REQUIRES REAL INPUT: that the XT60 is marked + and - (look at the plug).]"
    Sources: general meter use; the + mark on the plug is not sourced.
94. **The short check with the capacitor fitted [M1]. Step 3 check line, replace "[REQUIRES REAL INPUT: the multimeter method. ...]".**
    New: "Then, battery unplugged, touch the probes to the XT60's two pins. A short beep that stops within a few seconds is the capacitor charging, and is fine. A beep that never stops, or a reading below 1 ohm that stays there, is a short: find it before you go on. Between two wires of the same motor a beep is normal (the motor's coils join them); between a battery wire and any motor wire there must be no beep."
    Sources: EEVblog ("beeping only momentarily, which does NOT indicate that the capacitor is shorted"; "hold the probes ... more than a second or two ... the beep will stop"; a true short "less than 1" ohm); IntoFPV ("there should be no continuity between those"; "there continuity through the motor windings").
95. **Radio charging [M2]. S5.1b: keep the tag, reworded.**
    New tag: "[REQUIRES REAL INPUT: how long the radio takes to charge and what shows when it is full. The quick-start manual gives neither; watch it the first time and note it here.]"
    Source: Pocket quick-start manual (charging lines quoted in M2).
96. **Laptop install steps [M3]. S8.1, replace the tag "[REQUIRES REAL INPUT: the install steps for your laptop. ...]".**
    New: "On Windows: install Python from python.org (tick 'Add python.exe to PATH'), then open a terminal in the Shad-Drone-Payload folder and run the commands above. Nothing else needs installing on the laptop: the sensor drivers in requirements.txt are only for the Pi."
    Source: run on this laptop, 2026-11-03 (Windows 11, Python 3.12.10, nothing installed): "Ran 28 tests ... OK", and the demo printed its ground-height line. "Tick 'Add python.exe to PATH'" is the Windows installer's option name as commonly shown; not opened in this session: mark it `[REQUIRES REAL INPUT]` if the Builder wants it exact.
97. **Where the channels show [M4]. S8.2, replace "[REQUIRES REAL INPUT: where you see this: the Betaflight Receiver tab?]".**
    New: "(Watch Betaflight's Receiver tab: every bar should move as you move each stick and switch.)"
    Source: Betaflight Receiver tab page (channel preview "in channel value and graph forms").
98. **How you see the GPS line and how long a fix takes [M5, M6]. S8.6, replace "[REQUIRES REAL INPUT: how you see the printed line, and how long a fix takes. ...]".**
    New: "The line appears in the SSH window on your laptop where you started the payload. Outdoors with a clear sky the first fix usually takes about half a minute (seconds after that); the GPS board's light flashes once it has one."
    Sources: payload.py lines 83-84; CDTop PA1010D distributor line "TTFF 1s/35s" (which is which not labelled); Pimoroni ("an indicator LED, which will flash whenever the module has a satellite fix").
    Also, from M2, for change request 81 (approved): the RadioMaster manual's binding steps say "The LED on the receiver should now be solid, indicating successful bind." The Builder may add "its light goes solid" to the bound check.

### City of Edmonton parks (APPROVED by Shad, confirmed via the architect 2026-11-03)
99. **Where this drone may take off and land in Edmonton. Add to the "Before you fly" card, and one line under the NAV Drone line in Step 8.**
    Old: (nothing on City rules; the page covers federal rules and NAV Drone only)
    New, Before you fly card: "In Edmonton, City parks are for microdrones only. The City allows drones under 250 grams (counting everything attached) to take off and land on cut grass in most named parks. This drone weighs about 550 g, so it may NOT take off or land in a City park or anywhere else on City property. Take off and land from private property instead: your own, or someone else's with the owner's permission. All flights still follow the Transport Canada rules. (City of Edmonton, Public Spaces Bylaw 20700, Section 55.)"
    New, Step 8 under the NAV Drone line: "Edmonton city parks are not allowed for this drone (it is over 250 g): use private land with the owner's permission. See the Before you fly card."
    Source: City of Edmonton, "Recreational Microdrone Use" (https://www.edmonton.ca/activities_parks_recreation/recreational-microdrone-use, read in Chrome 2026-11-03; edmonton.ca returned 502 to my fetch tool):
    - "In Edmonton, the Public Spaces Bylaw 20700, Section 55 regulates launch and landing of drones on City property. The operation of a drone weighing less than 250 grams (microdrone) is permitted within designated areas."
    - "Your drone is classified as a microdrone if it is under 250 grams. This includes any attachments such as extra battery, parachute, or other safety attachments."
    - "Drones of any size are able to launch and land from private property with express permission from the property owner."
    - "A drone operator can launch and land a microdrone from cut and groomed turf within most of the officially named parks".
    - Never, even for microdrones without a permit: "Sir Winston Churchill Square", "Joe Clarke Athletic Grounds", "Fort Edmonton Park", "Whitemud Equine Learning Centre"; and "Over public gatherings or at advertised events".
    - "City rules do not override Transport Canada regulations — they work alongside them."
    Weight: about 549 g with the payload, about 502 g bare (verify_build WEIGHT-total; part estimates included). Either way it is twice the 250 g limit.
    Not read: the bylaw text itself (Section 55). The City's page summarises it; the bylaw PDF is linked from that page as "Public Spaces Bylaw 20700". The City's filming page (edmonton.ca/filming) also mentions drones, but it returned 502 and was not read.

### Crash and protection (APPROVED by Shad 2026-11-03 via the architect: CR 100, 101, 102 as written; CR 103 + B1 as an OPTIONAL line only, in the optional stage, not Buy today). Research: EASE-PASS-RESEARCH.md C1-C5.
100. **Landing rule [C1, C2]. Add to the "Before you fly" card and under S8.5's first hover.**
    New: "Take off and land on a flat board or hard flat ground, not grass: the Pi hangs only about 2.5 cm above the ground. Land straight down and slowly, then disarm as soon as the feet touch. The feet are close together side to side, so if the drone lands leaning or sliding sideways it falls on its side and a prop and an arm hit the ground."
    Sources: verify_build CLEAR-ground geometry (legs 54.3 mm, payload lowest 28.7 mm); tip_geom.py (feet 22-29 mm apart; falls at about 8-10 degrees, EST centre of gravity).
101. **"After a hard landing" checklist [C4]. New short card after Step 8 (or in the "Before you fly" card).**
    New: the 12 lines of C4 in plain words, in that order, starting with "Disarm, then battery out."
    Sources: Oscar Liang LiPo guide; Unmanned Tech crash guide; the page's own S7.7, S7.8, S8.6 and S8.7 checks.
102. **Upside-down landings hit the video antenna first [C1]. Add to S4.4's antenna line, or to the checklist.**
    New: "If the drone lands upside down, the antenna takes the hit first: check its nut and the two zip ties."
    Source: model geometry (antenna 78 mm tall, top about 84 mm up vs battery top 60 mm; planned position).
103. **Optional coating against wet grass [C3]. Only with Shad's yes to buy line B1.**
    New, after the payload is proven (after S8.7): "Optional: spray the flight controller, speed controller, receiver, VTX, Pi and HAT 2-3 times, everything plugged in first. Do not spray the thermal camera's window, the FPV camera lens, USB sockets, the microSD slot, buttons, the barometer or the GPS board's antenna. Weigh the drone before and after; if it gained more than 9 g, ask before flying (balance)."
    Sources: Oscar Liang waterproofing page; Flywoo X30 listing (lens note "reduce the permeability by 30%"); C2's balance figure.

Buy lines (Shad 2026-11-03):
- B1 APPROVED as OPTIONAL (optional stage, not Buy today): Flywoo X30 PCBA Waterproof Superhydrophobic Invisible Spray, Rotor Village, CA$36.99, https://rotorvillage.ca/flywoo-x30-pcba-waterproof-superhydrophobic-invisible-spray/ (weight 67.2 g as shipped; on the drone, see C3).
- Not proposed: prop guards (no Canadian listing; motor bolt pattern unresolved), spare arms (no V6 arm listing found). Reasons in C2.

Question for Shad (via the architect): the narrow stance. ANSWERED 2026-11-03: A (keep the legs, add CR 100 and 101), plus a proposal on a wider stance from existing holes (EASE-PASS-RESEARCH.md "## Wider leg stance").
- A (recommended now): keep the legs and add change requests 100 and 101. No cost, no weight.
- B: look for wider landing gear later. That likely needs printed parts or new mounting (Phase G is on hold). More research, more weight, and the balance must be re-checked.

## Parts for the Builder's parts list (legs, Shad's choice)
- **Rotor Village, M3 x 25mm Knurled Black Textured Stand-off (10pk), 1 pack:** CA$7.99, "68 in stock", "Material: Aluminum", "Height: 25mm" (rotorvillage.ca/m3-x-25mm-knurled-black-textured-stand-off-10pk/, opened 2026-11-03).
- **Rotor Village, M3 x 28mm Knurled Black Textured Stand-off (10pk), 1 pack:** CA$7.99, "59 in stock", "Height: 28mm" (rotorvillage.ca/m3-x-28mm-knurled-black-textured-stand-off-10pk/, opened). Change from my first proposal (2 packs of 25 mm): the front pair is 28 mm, so the drone sits level.
- **Rubber feet:** Lumenier M3 Rubber Landing Feet (8pcs), US$7.99, "In Stock", "Height: 6.3mm" (getfpv.com/lumenier-m3-rubber-landing-feet-8pcs.html, opened). **US shop: freight and duty not included.** No Canadian M3 landing foot found: Rotor Village's "M3 Silicone Gummies" are flight-controller grommets, and Elmwood's bumpers are stick-on, not M3.
- **M3 set screws** (about 8: 4 into the frame standoffs, 4 to join the stacked pieces; about 10-12 mm long), **plus 4 short M3 screws** for the feet. `[REQUIRES REAL INPUT]`: no Canadian listing I could open. Lee's Electronic "SET SCREW KIT M3-M5" exists but returned 403 to me; Newark Canada lists M3 set screws in search results only. Also unconfirmed: the knurled standoffs are threaded at both ends (female), which this plan assumes; check in the shop.

## Not step text (flag only; owners decide)
- Parts list (Shad and Sonnet): thin silicone wire for the receiver, M2.5 screws and nuts for the Pi standoffs, and a way to power or charge the monitor's 18650 (the monitor also takes USB-C or a 4S pack on XT60).
- Chat assistant (`docs/js/assistant.js`, `server/*`): still calls the TBS Diamond antenna SMA 5.8 GHz (handoff §3). Not touched.

### Motor wording (Shad chose to KEEP the Emax ECO III 2207 1900KV on 4S, 2026-11-03, via the architect). CR 104 APPROVED by Shad 2026-11-03 (via the architect), on the Stage 4 motor buy line: no chip changes.
104. **Say honestly what Emax rates the motor for. Add to the Stage 4 motor buy line's note (or Step 2's parts line, the Builder's choice).**
    New: "Emax rates this motor for 3S to 6S and pitches the 1900KV for 6S builds. On our 4S pack it is gentler, at an estimated 800 g of thrust per motor (our estimate from Emax's tables, not an Emax figure)."
    Sources: Emax ECO III spec sheet (shop.emaxmodel.com, image "ECOIII-2207"): KV1900 "No.of cells 3-6S"; Emax USA (shop.emax-usa.com, E3 Series 2207): "1700KV and 1900KV for 6S efficiency builds ... 2400KV for 3–4S setups"; Emax's 1900KV thrust table is 6S only (top row 40.6 A / 1800 g at 25.2 V). The 800 g is scaled from that table and the 2400KV 4S table (EASE-PASS-RESEARCH.md "## Motor: Emax ECO 2207 1900KV, 4S or 6S?").
