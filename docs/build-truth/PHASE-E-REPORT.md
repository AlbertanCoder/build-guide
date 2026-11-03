# Phase E report: accuracy, visibility, simulations

2026-11-03.
- **Gate:** 27 suites, all green under the lock.
- **Proofs:** `check_models.py` ALL PASS, `check_viewer.js` ALL PASS, `simulate_design.py --check` ALL PASS.
- **Your decisions** are recorded in `.claude/audit-2026-11-03/board/DECISIONS.md`. Your answers came by popup through the architect.

## 1. Viewer (milestone 1)
- **Labels:** OFF by default, choice remembered. Tap a part to see its name plus an accuracy tag (maker drawing / datasheet / estimate), "simulated layout" where that applies, and "colour shown for visibility" on small accessories.
- **Focus** (button, on by default): dims everything else, outlines the action's parts in ember orange, and points an arrow at them.
- **Magnifier:** a close-up drawn in the same canvas, with no second WebGL context.
- **Camera views:** "Flying camera view" and "Thermal camera view" show a translucent cone and what that camera sees.
- **Flying camera tilt slider:** 0-40°, starts at 10°. Source: Oscar Liang, oscarliang.com/camera-angle: "If you're new to FPV, a 10°–15° camera angle is an excellent starting point."
- **Lighting:** brighter rim and back light so black carbon keeps its edges.
- **Memory:** at most 2 viewers alive. The Builder measured the real page with all 8 steps open: 2 live renderers at most.

## 2. Laptop and clutter (milestone 2)
- **Laptop:** now a flat tag, "YOUR LAPTOP (NOT IN THE BOX)". "Acer" is gone from all pictures.
- **Clutter:** labels are off unless asked for. Default framing fills 0.59-0.89 of the width (was 0.46-0.66).
- **Bright colours** for small parts, flagged as visibility colours:
  - zip ties cyan;
  - straps yellow;
  - grommets magenta;
  - the three motor wires blue, yellow and white.

## 3. Accuracy (milestone 3)
- **Accuracy table:** `docs/build-truth/ACCURACY.md`, with plain inputs in `docs/build-truth/geometry/`.
- **From maker drawings:** frame (TBS drawing), Pi Zero 2 W (Raspberry Pi product brief), MLX90640 (Pimoroni drawing).
- **Estimated:** the Qwiic HAT comes from SparkFun's design file but is marked an estimate, because the file may be an older revision.
- **No maker drawing found online** for the camera or the motors. The motor screw conflict (16 vs 19 mm) is settled by the frame's own drawing: its slots take either.

## 4-5. Simulations and your layout decision
- **Families:**

| Family | Layouts | Passing |
|---|---|---|
| A forward pod under the plate | 504 | 24 |
| B rear pod under the plate | 432 | 40 |
| C Pi on top, MLX through a plate window | 84 | 0 |

- **Your choice: option 1 (layout L515).**
  - The Pi sits under the bottom plate, centred 36 mm behind the stack, on 12 mm nylon standoffs, on a foam pad, zip-tied through the windows. No drilling.
  - The thermal camera is just ahead of it, lens straight down: 0% of its view blocked, pod edge 8.8 mm outside the view.
  - The GPS goes on top in front of the battery: 11% of its sky blocked.
  - The battery balances from 10 mm behind to 2 mm ahead of centre.
  - The lowest payload part sits 28.7 mm below the plate, so legs must be at least 40 mm.
  - The models for steps 7, 8 and the finished drone follow this layout and say "simulated layout: check with the real parts".
- **Flying camera** (`sim-pilot-camera.csv`): the frame is never in view.

| Tilt (degrees) | Frame in view % | Props in view % | Sky % |
|---|---|---|---|
| 0 | 0.0 | 0.0-5.51 | 48.4 |
| 5 | 0.0 | 0.16-6.45 | 54.8 |
| 10 | 0.0 | 0.31-6.92 | 61.3 |
| 15 | 0.0 | 0.16-7.71 | 64.5 |
| 20 | 0.0 | 0.31-8.18 | 71.0 |
| 25 | 0.0 | 0.16-9.13 | 74.2 |
| 30 | 0.0 | 0.47-9.76 | 80.6 |
| 35 | 0.0 | 0.31-10.54 | 87.1 |
| 40 | 0.0 | 0.16-10.86 | 90.3 |

- **Change requests** 34-38 for the Builder: tilt, legs, layout, fixing, battery position.
- **Legs:** the question is with the architect for you. Recommended: Rotor Village M3 × 25 mm aluminium standoffs (CA$7.99 per 10, 68 in stock) stacked into 50 mm legs in the frame's own standoff holes, with M3 rubber feet. Thermal view stays 0% blocked; the stance is narrow (22-29 mm side to side).

## Visibility aid used at each action (from the contact sheets; "ember" = outline pixels on screen)
| Action | Aids | Ember px | Auto check |
|---|---|---|---|
| S1.1 | focus outline, arrow, close-up inset | 2057 | PASS |
| S1.2 | focus outline, arrow, close-up inset, camera move | 273 | PASS |
| S1.3 | focus outline, arrow, close-up inset | 530 | PASS |
| S1.S | focus outline, arrow, close-up inset | 139 | PASS |
| S2.1 | focus outline, arrow, close-up inset | 2620 | PASS |
| S2.2 | focus outline, arrow, close-up inset | 1791 | PASS |
| S2.3 | focus outline, arrow, close-up inset | 1601 | PASS |
| S2.4 | focus outline, arrow, close-up inset, camera move | 4620 | PASS |
| S3.0 | focus outline, arrow, close-up inset | 2223 | PASS |
| S3.1 | focus outline, arrow, close-up inset | 333 | PASS |
| S3.2 | focus outline, arrow, close-up inset, camera move | 2442 | PASS |
| S3.3 | focus outline, arrow, close-up inset, camera move | 5270 | PASS |
| S3.4 | focus outline, arrow, close-up inset | 1511 | PASS |
| S4.1 | focus outline, arrow, close-up inset, camera move | 1832 | PASS |
| S4.2 | focus outline, arrow, close-up inset | 336 | PASS |
| S4.3 | focus outline, arrow, close-up inset | 382 | PASS |
| S4.4 | focus outline, arrow, close-up inset | 2394 | PASS |
| S4.5 | (no part to show) | 0 | PASS |
| S4.6 | focus outline, arrow, close-up inset | 471 | PASS |
| S4.7 | (no part to show) | 0 | PASS |
| S4.8 | focus outline, arrow, close-up inset | 356 | PASS |
| S5.1 | focus outline, arrow, close-up inset | 1272 | PASS |
| S5.1b | focus outline, arrow, close-up inset | 303 | PASS |
| S5.2 | focus outline, arrow, close-up inset | 391 | PASS |
| S5.3 | focus outline, arrow, close-up inset, camera move | 641 | PASS |
| S5.4 | focus outline, arrow, close-up inset | 187 | PASS |
| S5.S | focus outline, arrow, close-up inset | 6906 | PASS |
| S6.0 | focus outline, arrow, close-up inset | 590 | PASS |
| S6.1 | focus outline, arrow, close-up inset, camera move | 324 | PASS |
| S6.2 | focus outline, arrow, close-up inset | 939 | PASS |
| S6.3 | focus outline, arrow, close-up inset, camera move | 872 | PASS |
| S6.4 | focus outline, arrow, close-up inset | 831 | PASS |
| S6.S | focus outline, arrow, close-up inset | 157 | PASS |
| S7.1 | focus outline, arrow, close-up inset | 555 | PASS |
| S7.3 | focus outline, arrow, close-up inset, camera move | 5848 | PASS |
| S7.4 | focus outline, arrow, close-up inset, camera move | 5400 | PASS |
| S7.4b | focus outline, arrow, close-up inset, camera move | 2202 | PASS |
| S7.6 | focus outline, arrow, close-up inset | 171 | PASS |
| S7.7 | focus outline, arrow, close-up inset | 3705 | PASS |
| S8.1 | focus outline, arrow, close-up inset | 2279 | PASS |
| S8.2 | focus outline, arrow, close-up inset, camera move | 4325 | PASS |
| S8.3 | focus outline, arrow, close-up inset | 4481 | PASS |
| S8.4 | focus outline, arrow, close-up inset, camera move | 55 | PASS |
| S8.5 | focus outline, arrow, close-up inset | 177 | PASS |
| S8.6 | focus outline, arrow, close-up inset, camera move | 5829 | PASS |
| S8.7 | focus outline, arrow, close-up inset | 1339 | PASS |

Every action with parts uses focus outline + arrow + close-up. Close-ups that also move the camera are listed with "camera move". Actions without new parts (laptop setup, rules) show the state and no outline.

## Still `[REQUIRES REAL INPUT]`
- **Fit with the real parts:**
  - payload layout;
  - pad thickness;
  - zip-tie paths through the windows;
  - MLX hole size;
  - how the camera mount's tilt adjusts.
- **Legs:** which to buy (question pending); standoff thread ends; set-screw source.
- **From Phase D, still open:**
  - V6 printed instructions and threadlock;
  - motor screw length;
  - iron adapter polarity;
  - receiver power on USB;
  - charger plug type;
  - prop CW/CCW marking style;
  - whether the 5 V supply can carry the Pi, camera and receiver together.
- **What simulation cannot prove:** thrust, flight time, vibration on the thermal camera, wiring slack, heat, radio interference. Details in `docs/build-truth/SIMULATION.md`.


## Legs (decided after this report was first written)
- **Your choice:** stacked M3 aluminium standoffs from Rotor Village in the frame's four spare standoff holes, with rubber feet.
  - Rear legs: 2 × 25 mm. Front legs: 2 × 28 mm (they start 8 mm higher, at the middle plate).
  - Drawn greyed "planned" in steps 7, 8 and the finished drone until you have them in hand.
- **Simulated with these exact legs** (`simulate_design.py --check`, "chosen legs" lines):
  - thermal view 0.0% blocked;
  - payload 25.6 mm above the ground when landed;
  - feet within 2 mm of level;
  - rear legs 6.8 mm clear of the pad;
  - centre of gravity [-3.0, 0.1] mm, inside the feet, with a side margin of 10.9 mm. That's narrow: land on flat ground.
- **Parts list for the Builder:** CHANGE-REQUESTS.md, "Parts for the Builder's parts list".
  - The rubber feet are from a US shop (freight and duty not included); no Canadian M3 foot was found.
  - M3 set screws: no Canadian listing I could open, so `[REQUIRES REAL INPUT]`.
- **Leg-fitting wording:** change request 39, not approved yet.
