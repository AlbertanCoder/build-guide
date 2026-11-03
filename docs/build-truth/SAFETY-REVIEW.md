# Safety review of STEP-TRUTH.md (safety-critical rows only)

## Reviewer and scope

Independent review by a Fable-model subagent (claude-fable-5-1), 2026-11-03. Input was only
`docs/build-truth/STEP-TRUTH.md` plus the sources listed at the bottom, opened today with curl.
No other repo file was read. Scope: LiPo/LiHV charging and handling, soldering polarity and iron
power, props, first power and bench tests (smoke stopper, VTX antenna, failsafe, arming), and
first-flight legal and physical safety. Rows outside that scope were not reviewed.

Verdict key: AGREE = the row's verdict stands. DISAGREE = the verdict should change, reason given.
"Unsourced" = I could not find a source either way.

## Row verdicts

| id | AGREE/DISAGREE | reason | source |
|---|---|---|---|
| S1.S, S2.S | AGREE | Props stay bagged until step 8; nothing to add. | [R26] "Remove propellers before testing motors." |
| S3.2 | AGREE | Motor wire order is not a polarity question; any order works, direction is set later (see Missing 6). | Physical: three-phase brushless motor. |
| S3.3 | AGREE | Lead and cap polarity sourced. The cap's 35 V rating also covers a full 4S LiHV pack (4 x 4.35 = 17.4 V, arithmetic). | [R33] "Negative to negative, positive to positive"; [R34] "35V 1000uF". |
| S3.S | AGREE | Smoke stopper on first power-up is exactly what the maker sells it for. | [R14] "when you power on a mini quad drone for the first time". |
| S3.C | AGREE as a check | But "meter confirms polarity" is too vague; see Missing 5 (a resistance test between the battery pads finds a short before any power). | Physical argument. |
| S3 iron note | AGREE | 65 W iron is DC12-24 V, so a 4S pack (14.8-17.4 V) is in range; adapter polarity rightly left to the meter. | [R15] "Working voltage: DC12--24V". |
| S4.2 | AGREE | No source says an ELRS receiver is harmed without its antenna; harmless to keep. | ELRS wiring page has no such warning (opened). |
| S4.4 | AGREE | SMA antenna on before power. | [R8][R10]. |
| S4.6 (4.35 V) | DISAGREE | The table marks 4.35 V "CANNOT VERIFY". It is sourced: LiHV full charge is 4.35 V/cell. Separate problem: Betaflight counts cells as int(V / vbat_max_cell_voltage) + 1, so a pack fresh off the charger at 17.40 V with max set to 4.35 (or the default 4.30) is counted as 5S and every voltage warning is then wrong. Set 4.40, or force the cell count to 4. Second-order safety (wrong low-battery warning), not a fire risk. | Oscar Liang LiPo guide: "can be charged up to 4.35V per cell, compared with 4.20V per cell for a standard LiPo". M4AC manual battery table: "4.35V LiHv". Betaflight battery.c line 207: `cells = (voltageMeter.displayFiltered / currentBatteryProfile->vbatmaxcellvoltage) + 1;` battery.h line 39: `VBAT_CELL_VOLTAGE_DEFAULT_MAX 430`. |
| S4.6 (arm switch) | AGREE, incomplete | "Set an arm switch" should say which channel: ExpressLRS wants it on AUX1, low = disarmed. | ELRS switch-config page: "IF you're using Arm using CH5, put your arm switch on AUX1, and set it as ~1000 is disarmed, ~2000 is armed." |
| S4.6 (failsafe Drop) | AGREE | Drop is the Betaflight default. | [R27] "Drop, the default, causing immediate disarm and motor stop." |
| S4.6 (receiver on USB) | AGREE | Whether the Taker's 5 V rail is live on USB is not in the review or the shop page I opened. Unsourced; stays REQUIRES REAL INPUT. | [R34] opened, no USB-power statement. |
| S4.7 | AGREE | 25 mW is the lowest non-pit power; Canadian 5.8 GHz band rules remain unchecked by me too. | [R9]. |
| S4.S | AGREE | The 21-page TBS manual never says "seconds" and never says "never power without antenna"; it says the VTX "will detect excess heat and shut down until it recovers". Keep the rule anyway (RF power with no antenna is dissipated as heat in the output stage). | [R9] text extracted, grep "antenna" and "shut down". |
| S4.C | AGREE, stronger reason | The check "the arm switch arms and disarms in the Configurator" can never pass: Betaflight blocks arming while the Configurator is connected. The step should say "the ARM range lights in the Modes tab", as the table proposes. | Betaflight Arming-Sequence-And-Safety: "MSP: MSP connection is active, probably via Betaflight App. Use the disconnect button in the Betaflight App (unplugging USB does not clear this flag)." |
| S5.1c | AGREE | Monitor 18650 charging is Shad's choice. Note the charger maker says 1S works with an adapter cable, so the shop's "cannot charge 1s" is incomplete. | M4AC manual: "To charge 1S batteries, you need to purchase the following adapter charging cable". |
| S5.2 | AGREE | Pack leads sourced. The M4AC manual only names an "output main port" and "balance port"; connector type unsourced. | M4AC manual lines 106-107. |
| S5.3 | AGREE, add a warning | LiHV mode is right for these packs, but the step should say LiHV mode only on packs marked HV / 4.35 V. | M4AC manual: "Choosing the wrong battery type to charge may damage the battery, the charger, and cause fire hazards." |
| S5.4, S5.C | AGREE | "Closed" bag is unsourced and the leads must exit. Add: a bag only slows a fire. | Oscar Liang LiPo guide: LiPo bags "may slow down a LiPo fire, but they won't completely contain it. Always keep a fire extinguisher nearby when charging batteries." |
| S5.S | AGREE | Sourced. See Missing 1-4 for what the step leaves out. | [R16]. |
| S8.2 | AGREE, reasoning imprecise | Right call (stopper off before arming), but "Idle Current (10V): 1.5A" is the motor's no-load spec, not its idle-throttle draw. The real reasons: four motors plus electronics can pass 1.2 A, and a trip mid-test cuts the FC and hides whether failsafe worked. Also the failsafe test as written may not test the configured Stage 2 at all (Missing 7). | [R14] "Trip current 1.2A"; [R27] (quote in Missing 7). |
| S8.3 | AGREE | I checked the Betaflight props-in image: M4 front-left CW, M2 front-right CCW, M3 rear-left CCW, M1 rear-right CW, viewed from above. Matches the table. | [R28] image, opened and viewed. |
| S8.4 | AGREE | CW props on M1 and M4, CCW on M2 and M3 follows from S8.3. Marking style and face-up stay unsourced. Add: pack unplugged while fitting props (Missing 8). | [R6][R28]. |
| S8.5 | AGREE, under-stated | The 30 m rule is right to add, but the bigger legal gap is airspace: Basic needs uncontrolled airspace, and controlled airspace needs an Advanced certificate plus a drone with a manufacturer safety declaration, which a home-built drone cannot have. Whether a given Edmonton site is controlled is unsourced here; the step must send the builder to NAV Drone first. | [R35] "you fly your drone in uncontrolled airspace ... more than 5.6 kilometers (3 nautical miles) from the center of a certified airport ... more than 1.9 kilometers (1 nautical mile) from the center of a heliport". TC "Where to fly": "To operate within controlled airspace, drone pilots need at least an advanced pilot certificate, a drone with the appropriate manufacturer safety declaration, and the air navigation service provider authorization." |
| S8.S | AGREE | 5 NM = 9.26 km, arithmetic correct. | [R39]. |

## Missing safety items

1. Charge current is never set. 1C for this pack is 1.5 A. The M4AC offers only 0.5 / 1.0 / 2.0 / 2.5 A.
   Sources: Oscar Liang: "for a 1500mAh LiPo, charging at 1C means setting the charge current to 1.5A";
   GNB (EpicFPV): "Charge Rate: 1C to 5C"; M4AC manual: "the current can be selected from 4 levels of
   values, 0.5A, 1.0A, 2.0A, 2.5A" and "recommended to use a charging rate of 1C- 2C". My judgement: 1.0 A
   for the first charges; 2.0 A (1.3C) is inside both makers' ranges.
2. Confirm the screen shows 4S and LiHV before pressing start. Oscar Liang: "Verify the number of cells and
   battery type are set correctly on your charger"; M4AC manual: the power-on lock exists "to prevent
   incorrect selection of battery type and current."
3. Let the pack cool after a flight before charging, and stop if it warms while charging. Oscar Liang:
   "Allow batteries to cool down completely after a flight before charging them"; "Your battery should NOT get
   hot during charging."
4. Storage charge when not flying soon. M4AC has a "3.85V Lipo-Stroage" mode; Oscar Liang: "Storage charge
   it to 3.80V to 3.85V per cell". No step says what to do with a full pack after a cancelled flight.
5. Before the first power-up, meter resistance between the ESC battery + and - pads (a short reads near
   0 ohm); the capacitor and XT60 are the two places a bridge hides. Physical argument, standard practice,
   no manual quote found (unsourced).
6. How to fix a motor that spins the wrong way (step 8.3 only says to check). Betaflight Motors tab:
   "Motor direction - opens a motor direction test tool which allows you to gently spin motors and easily
   reverse motors so that they match the appropriate spin direction for your Mixer. Remove props and take care".
7. The failsafe bench test needs throttle raised first. Betaflight failsafe doc: a "'fourth' internal mode,
   which applies if the throttle has been held low for at least 10 seconds before entering Stage 2 ... This
   can sometimes cause confusion when testing failsafe. Always test with throttle up at some point before
   the test." Also: "After a failsafe disarm, if the link is restored while the Arming switch is active, the
   quad will not automatically re-arm itself."
8. Pack unplugged whenever hands are on props or motors; radio on and arm switch in the disarmed position
   before the pack goes in; radio off only after the pack is out. Betaflight backstop exists ("ARMSWITCH:
   Arm switch is in an unsafe position ... Toggle the arm switch to arm") but the habit is the real guard.
9. Props-off pre-flight tests from the Betaflight setup guide are absent from step 8: "Move the flight
   controller and confirm the 3D model in the configurator moves accordingly"; "Test aileron and elevator
   input on the transmitter: does the aircraft respond in the correct direction? Without propellers,
   throttle at approximately 30%: tilt the aircraft - do the motors momentarily compensate for the tilt";
   "If any of these tests fail, do not attempt to fly." A wrong board orientation or reversed channel is
   an instant flip on the first hover.
10. Airspace check before the first hover (see S8.5): NAV Drone, uncontrolled airspace, 5.6 km from a
    certified airport, 1.9 km from a heliport. A home-built drone has no manufacturer safety declaration,
    so controlled airspace is not available under any certificate.
11. Fire extinguisher or sand within reach while charging (Oscar Liang quote under S5.4). Not in step 5.
12. Canadian legality of the 5.8 GHz analog VTX channels: not checked by the table or by me (unsourced).

## Sources opened

- STEP-TRUTH.md sources re-opened: [R6] [R8] [R9] (PDF, text extracted with pypdf, 21 pages) [R10] [R12]
  (both pages) [R14] [R15] [R16] [R26] [R27] [R28] (image viewed) [R33] [R34] [R35] [R39].
- https://betaflight.com/docs/wiki/guides/current/Arming-Sequence-And-Safety (MSP and ARMSWITCH flags).
- https://betaflight.com/docs/wiki/app/motors-tab (motor direction tool).
- https://raw.githubusercontent.com/betaflight/betaflight/master/src/main/sensors/battery.c and battery.h
  (cell-count formula, default 430).
- https://www.expresslrs.org/software/switch-config/ (arm on AUX1).
- https://www.expresslrs.org/quick-start/receivers/wiring-up/ (no antenna warning for receivers).
- https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/where-fly-your-drone
  (controlled airspace, NAV Drone, manufacturer safety declaration).
- https://oscarliang.com/lipo-battery-guide/ (4.35 V, 1C, storage, cooling, bags, extinguisher).
- https://www.toolkitrc.com/m4ac/ and
  http://download.toolkitrc.com/wp-content/uploads/2024/09/M4AC-Manual-V1.1-.pdf (15 pages, pypdf).
- https://epicfpv.ca/products/gnb-lihv-4s-15-2v-1500mah-120c-xt60-lipo-battery-longrange ("Charge Rate: 1C to 5C").
