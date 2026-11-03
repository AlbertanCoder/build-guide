# Phase A summary: what in the 8 steps is wrong, missing or unproven

2026-11-03. Full detail and source quotes: `STEP-TRUTH.md`. Exact new wording: `CHANGE-REQUESTS.md`.
71 lines checked: 42 confirmed, 22 need a change, 7 cannot be verified (a few confirmed rows also carry an unverified part). Below is everything that is not confirmed.

## Good news first
GEPRC's own manual for your exact stack **is** online (a one-page wiring diagram). It settles three open questions:
- Receiver goes on **UART2**: receiver T to **R2**, receiver R to **T2**, plus 5V and GND.
- The board **does** have analog camera and video pads (CAM, VTX), so the on-screen battery readout works.
- Motor pads: 1 rear right, 2 front right, 3 rear left, 4 front left, the same as Betaflight's diagram.

## Needs change: safety
1. **Smoke stopper in step 8 (S8.2, S8.3).** It cuts out at 1.2 A. One motor spinning with no prop draws about 1.5 A. The failsafe and motor tests cannot run through it. Use it for the first plug-in only, then remove it.
2. **Charging bag (S5.4).** The bag is sold for storing and carrying. The shop's rule is "charge in or on a fire-proof surface, never unattended". Say "pack in the bag, on a fireproof surface, leads out, you beside it" instead of "closed bag".
3. **Sensor voltage (S6.S).** "3.3 V only, never 5 V" is false: Pimoroni says both boards take 3 to 5 V. The right advice stays: power them from the cable's red 3.3 V wire.
4. **VTX warning (S4.S).** Keep "never power it without the antenna"; drop "burns out in seconds" (no source says that).

## Needs change: missing or wrong steps
5. Step 3: mount the ESC in the frame **before** cutting motor wires; plug the 8-wire ESC-to-flight-controller cable; the stack sits on its own screws and grommets, not the frame standoffs.
6. Step 4: say UART2 (R2/T2); drop the "if it has no analog pads" fallback; add where the video transmitter gets power (the 9V pad) and its control wire (T1).
7. Step 4 check: "arms in the Configurator" should be "the ARM range lights in the Modes tab".
8. Step 5: add "charge the radio by USB-C" (the cord is listed but never used).
9. Step 6: solder the **straight male** header (the cables need pins); flash the card and turn on I2C first; "skip pin 4" should read "leave the 4th pin (INT) empty".
10. Step 7: the thermal camera board **has** two mounting holes; nothing connects the Pi's power to the drone; the battery is never strapped down.
11. Step 8: "Acer laptop" should be "your laptop"; name the 30 m-from-people rule instead of "site checks".

## Cannot verify: you have to check with the real parts
- Frame V6 assembly order and threadlock (the only online manual is for the older frame).
- Which plug the charger has (XT60 or XT30; shops disagree) and its balance socket.
- How the monitor's 18650 gets charged (or run it from USB-C or a 4S pack).
- Whether the receiver gets power from USB alone (step 4 assumes yes).
- How the props mark clockwise vs anticlockwise, and which face goes up.
- Payload layout under the frame, landing legs, ESC and camera fit, hole size on the thermal board.
- Battery full-charge 4.35 V per cell (setting is right for these packs, but I found no page that states the number).
- Polarity of the new 24 V iron adapter (multimeter test). Note: the tool kit includes an XT60-to-iron cable, so a charged pack can also run the iron.

## Not step text (for you and Sonnet)
Parts list is short on silicone wire, M2.5 screws and nuts, and a monitor-cell charger. The chat assistant still says "TBS Diamond"; not touched.

## Independent safety review (Fable, given only the truth table): `SAFETY-REVIEW.md`
It agreed with every safety call but one, and that one I re-checked and it is right:
- **Step 4's "4.35 V" setting is wrong.** Your packs do charge to 4.35 V per cell, but Betaflight counts cells as (voltage ÷ that setting) + 1, so a full pack reads as 5 cells and the low-battery warnings are wrong. Set **4.40 V**. (Checked in Betaflight's own code.)
- Item 20 (smoke stopper) keeps its meaning; its wording is revised: arm and raise the throttle a little before switching the radio off, or the failsafe test can mislead.
- Missing safety items it found, now new items 23-31: charge current (1.0 A; the charger manual says 1C-2C), check 4S + LiHV on screen before start, storage mode, check the site on NAV Drone (uncontrolled airspace, 5.6 km from airports), how to reverse a wrong-way motor, the props-off tilt tests ("if any fail, do not fly"), battery out whenever hands are on props, cool packs before charging, extinguisher or sand nearby.

## To go on to Phase B (modelling), I need from you
1. The architect session recorded a yes from you to items 1-22. Please confirm it here too, and confirm item 20's revised wording.
2. Yes or no on new items 23-31 in `CHANGE-REQUESTS.md`.
Models will show the "cannot verify" items as greyed "planned" only, never as fact.
