# Phase B report: 3D models that match the step text

2026-11-03. Proof command: `python -I scripts/build/check_models.py` (172 checks, ALL PASS). Gate: 625/625 PASSED.

## What changed
- **One place for sizes:** `scripts/build/parts.py`. A substitute frame, stack, Pi or camera is a one-line change, then a rebuild.
- **Real frame shapes:** TBS publishes the Source One V6 drawing (github.com/tbs-trappy/source_one, `So1-V6-2025-AUG-19.dxf`). `scripts/build/extract_so1v6.py` turns it into outlines (`scripts/build/data/so1v6_outlines.json`). It also prints the hole matches that fix how the parts go together:
  - the arm root holes sit 14.08 and 21.47 mm from centre, on the 20 × 20 (14.14) and 30.5 × 30.5 (21.57) stack holes, so the stack screws clamp the arms;
  - top-plate holes land on middle-plate holes (22 mm standoffs) and on bottom-plate holes (30 mm standoffs); 2 + 30 = 2 + 6 + 2 + 22 = 32 mm.
- **Motor numbering fixed.** The old models were mirrored (motor 1 sat rear-left). Now motor 1 is rear right (CW), 2 front right (CCW), 3 rear left (CCW), 4 front left (CW), as in Betaflight and the GEPRC manual. Checked in every model with motors.
- **Arms** are 6 mm, and motors are 240 mm apart corner to corner (checked: 240.0 mm).
- The antenna is the TBS Triumph PRO (no "diamond" part anywhere; checked). No LED strip (no step mentions one). No Acer label.
- **"Planned" grey:** anything whose position is not confirmed is drawn greyed and tagged `planned` in the model. That covers the payload layout, the pigtail route, the receiver, camera and VTX positions, and the charger sockets.

## Each model
| Model | Shows (from the step text) | KB | Triangles |
|---|---|---|---|
| step-01-parts | five piles, props in a closed bag, order list, laptop | 422 | 8,878 |
| step-02-frame | V6 frame (no top plate yet), standoffs, motors M1-M4 with spin | 153 | 3,864 |
| step-03-stack | ESC on grommets, motor wires, XT60 lead + capacitor, 8-wire cable, FC; smoke stopper and meter on the bench | 228 | 5,292 |
| step-04-receiver-fpv | RP1 on UART2 (T→R2, R→T2), camera to CAM, VTX on 9V/VTX/T1, Triumph PRO, laptop on USB only, monitor + 18650, top plate fitted last | 283 | 6,574 |
| step-05-power | radio + 2 cells + USB-C; pack in the bag on a fireproof surface; M4AC "LIHV 4S 1.0A"; extinguisher | 83 | 1,636 |
| step-06-payload | Pi + HAT, both sensors on straight male headers, cables to pins 1, 2, 3, 5 (4 = INT empty), bench supply, pigtail | 82 | 1,348 |
| step-07-mount | payload greyed planned; ties; strap; pigtail from FC 5V; battery on pad with its strap; prop circles; centre mark | 323 | 7,410 |
| step-08-test | the 7 actions as pins S8.1-S8.7; props see-through, marked CW/CCW per motor; smoke stopper apart; hot plate | 377 | 9,058 |
| final-product | finished quad, props CW/CCW, battery strapped, payload greyed planned | 302 | 7,606 |
| **Whole set** | budget 4,096 KB | **2,252** | each under 20,000 |

## Found while modelling
- **No step fitted the top plate.** Change request 32: Shad approved it (DECISIONS.md).
- **Prop clearance** from the real outlines: 5.7 mm from prop tip to the nearest plate edge.
- **Source conflicts**, recorded in parts.py: the shop says the bottom plate is 2.5 mm, the TBS drawing says 2 mm (the drawing is used); one shop gives the motor bolt spacing as 16 mm, another as 19 × 19 mm; the HAT design file may be an older version than DEV-14459.
- **Sizes drawn, not sourced** (`approx` in parts.py, never quoted in labels): antenna shape, capacitor can, HAT revision, laptop, motor bell/shaft split, board thickness, stack spacing.

## Not done in Phase B
- **No preview pictures** (architect's memory limit: under 3 GB free). The GLB is what the page uses.
- **Not looked at in the real web viewer yet.** Checked with `check_models.py` sketches (top and side views, scratch folder) and the gate's browser suite.
- **`dist/` (the double-click single file) still holds the old models.** The Builder owns that build; it needs a rebuild.
- **Phase C (animation clips, play/pause/scrub, action chips) and Phase D (contact sheets)** have not started.
