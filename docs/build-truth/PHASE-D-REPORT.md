# Phase D report: proof that each animation matches its text (final report of the handoff)

2026-11-03.
- **Contact sheets:** `docs/build-truth/contact-step-01.png` ... `contact-step-08.png`, one frame per action with the action's words under it.
- **Per-action results:** STEP-TRUTH.md section "Phase D: animation against text" (46 actions, 46 auto PASS, all 46 looked at).
- **Gate:** now 26 suites / 1,162 named checks. New suites: "step models" (`check_models.py`, 398) and "3d viewer" (`check_viewer.js`, 139).

## The three gate checks the handoff asked for
1. **Every action id is in the truth table** (strict) **and in index.html.** For index.html it is strict for any step whose list items carry `data-action-id`. None do yet, so it prints INFO until change request 33 lands. The model's own step section on the page is checked strictly.
2. **Every part an action or a pin names exists in the model** (strict).
3. **Budgets** (strict): each model at most 500 KB and 20,000 triangles, the set at most 4 MB (now 2.5 MB).

## Found and fixed by looking at the sheets
- **S2.4:** the screw check showed the motor from above. Motor 2 now lifts so the screws show.
- **S7.3, S7.4, S7.4b, S8.6:** the payload hangs under the frame and couldn't be seen. These moments now look from below; reset brings the camera back above the bench.
- **S8.7:** the heat test said props OFF, but the props were on. They now come off before it.
- **S3.0:** the check matched the wrong part (the 8-wire cable that only appears at S3.4).
- **Default framing:** models filled only half the width on wide screens. The viewer now turns to the side that lets the model sit closest: 0.59-0.89 of the width (was 0.46-0.66).
- **Flat pictures:** "Acer" in 01-parts.svg and 03-stack.svg replaced with "your laptop" (none left).

## Each step
| Step | Text verified (Phase A) | Animation matches (auto + looked) | Still `[REQUIRES REAL INPUT]` |
|---|---|---|---|
| 1 Lay out | yes | yes | (none in this step) |
| 2 Frame | yes, from TBS's drawing | yes | the V6 printed instructions (assembly order is derived from the drawing's holes); threadlock; motor screw length |
| 3 Stack | yes | yes | iron adapter polarity (meter test) |
| 4 Control and video | yes; R2/T2 confirmed by GEPRC | yes | whether the receiver gets power on USB alone; camera, VTX and receiver positions on the frame (greyed planned) |
| 5 Charging | yes | yes | the charger's plug and balance socket types; how the monitor's 18650 is charged |
| 6 Payload bench | yes | yes | (none in this step) |
| 7 Mount | the layout is not confirmed | yes; the payload is greyed planned | payload layout, landing legs, MLX hole size, whether the 5 V supply carries Pi + camera + receiver |
| 8 Test | yes | yes | how the props are marked CW/CCW and which face goes up |

## Not done
- **Page check pending:** action ids aren't on the page yet (change request 33, the Builder's file).
- **Phone layout not measured:** the framing was measured at a 16:9 frame only.
- **Not seen by a human in the real page yet.** The Builder measured release() on the real page: at most 2 renderers, 0 left at the end.
- **`dist/`** needs the Builder's rebuild.
