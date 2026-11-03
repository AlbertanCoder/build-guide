# Design simulations: what was run, what each check means, what it cannot prove

2026-11-03.
- **Command:** `python -I scripts/build/simulate_design.py --check` (about 40 s).
- **Inputs, plain files only, so anyone can write their own checker:**
  - `geometry/parts.json`: every size, with its accuracy tag (CAD / DATASHEET / ESTIMATED), source link and quote.
  - `geometry/weights.json`: the Builder's 14 sourced weights (505.1 g listed), with my flags.
  - `geometry/frame_outlines.json`: TBS's V6 outlines, plus the bottom plate's 7 windows.
  - `geometry/layouts.json`: every layout variant tried.
- **Results:**
  - `sim-results.csv`: one row per layout × leg height, 11,220 runs.
  - `sim-pilot-camera.csv`: tilt 0-40° × prop angle.
  - `sim-summary.json`.
- **Axes:** millimetres, +X forward (camera end), +Y left, Z up; origin = stack centre on the underside of the bottom plate.

## The sweeps
- **Layout families (three):**
  - A: Pi pod under the bottom plate, just behind the stack.
  - B: Pi pod under the rear of the bottom plate.
  - C: Pi on the top plate, thermal camera on the bottom plate looking down through one of its 7 windows.
- **Within A and B, varied:**
  - Pi position, in 3-4 mm steps (13 positions);
  - standoff 12 mm (the sourced part) or 20 mm;
  - thermal board ahead of the pod, behind it, or beside it;
  - thermal camera's wide axis along or across the drone;
  - mount method: drilled holes / standoff feet tied through windows / flat pad tied through windows;
  - GPS in front of or behind the battery.
- **Totals:** 1,020 layouts. Each is run at 11 landing-leg heights (0-50 mm) and, for the thermal view, 40 prop angles (0-117° in 3° steps).
- **Battery:** slid along the top plate in 1 mm steps for every layout.
- **Flying camera:** tilt 0-40° in 5° steps × 20 prop angles.

## The checks (a layout passes only if all hold)
1. **Thermal view clear: 0% of 651 rays blocked.** Rays are cast from the lens through the 55° × 35° view, straight down to 1 m, against everything below the lens. That covers frame plates with their windows, arms, the Pi pod, legs, and all three blades of all four props at every prop angle tried. Every obstacle is grown by 2 mm first; that is the margin in "clear". Also reported: how far the pod's edge sits outside the view at the pod's lowest level.
2. **Fit.**
   - Drill: each screw hole (radius 1.4 mm) needs 2 mm of carbon around it.
   - Ties: each standoff foot (5 mm across) sits fully on carbon with 2 mm spare, and two or more windows sit within 8 mm of the part for zip ties.
   - Pad: carbon under at least 60% of the part's footprint, plus the two windows.
   - The same rule applies to the thermal board. Family C also needs the Pi's footprint on the top plate.
3. **Balance:** some battery position, with the whole pack on the top plate and clear of the GPS (and of a top-mounted Pi), puts the centre of gravity within 5 mm of the motor-square centre. Weights: weights.json. The frame's own centre of gravity comes from its real outlines.
4. **Ground:** the legs stand at least 10 mm lower than the lowest payload part.
5. **Wires:** the pigtail route from the flight controller's 5V pad stays more than 5 mm from every prop disc.

The 2 mm, 60%, 5 mm and 10 mm thresholds are **my choices**, not sourced rules. Changing them changes the passing set, and the CSV holds the raw numbers to do that.

## Results (from `sim-summary.json` and the CSV)
- **A:** 24 of 504 layouts pass.
- **B:** 40 of 432 pass.
- **C:** 0 of 84 pass. The thermal board's screw holes never land on enough carbon round a window (best -0.9 mm), and a pad would cover the window it looks through.
- **Mount method:** only the pad mount passes in A and B. The Pi's 58 × 23 mm hole pattern always puts a hole or foot at a window edge: the best drilled hole has 1.6 mm of carbon, the best foot 0.5 mm.
- **Legs:** at least 40 mm in every passing layout. The lowest payload part (the Qwiic plugs under the HAT) is 28.7 mm below the plate with the 2 mm pad (26.7 mm without it), so legs need at least 38.7 mm.
- **GPS:** in front of the battery, 10-11% of its sky is blocked; behind it, 31% (the battery and the video antenna).
- **Flying camera:** the frame is never in its view at 0-40°. Props fill 0.3-6.9% of the picture at 10° and up to 10.9% at 40°, depending on where the blades are.

### Recommended layout (L515)
- **Pi pod:** under the bottom plate, centred 36 mm behind the stack, on the sourced 12 mm nylon standoffs.
- **Mount:** standoffs on a flat insulating pad (foam or rubber), zip-tied through the plate's windows. No drilling.
- **Thermal camera:** just ahead of the pod (lens about 11 mm ahead of the stack centre), wide axis across the drone.
- **GPS:** on the top plate, in front of the battery.
- **Numbers:**
  - thermal view 0% blocked, pod edge 8.8 mm outside the view;
  - battery balances from 10 mm behind to 2 mm ahead of the centre;
  - centre of gravity -3.0 mm at the middle of that range;
  - legs at least 40 mm;
  - GPS sky 11% blocked.

## What simulation cannot prove (check with the real parts)
- **Every ESTIMATED input:** board thickness, header and plug heights, the thermal lens's drop, prop blade width, the motor's height split, where the receiver, video transmitter, antenna and camera mount, and the leg positions. They're in `geometry/parts.json` and `sim-summary.json`.
- **Unweighed parts:** the Qwiic HAT, cables, wires, screws, standoffs, ties and pad aren't in the balance. As a rule of thumb, 10 g at the pod (36 mm behind centre) moves the centre of gravity about 0.7 mm back (10 × 36 / 515). That is arithmetic, not a measurement.
- **Flight:** thrust, flight time, vibration on the thermal camera, wiring slack, heat and radio interference can't be simulated from these inputs.
- **The frame's own windows and slots** come from TBS's drawing, but whether a zip tie threads cleanly needs the real plate in hand.
- **The 1.6 mm drilled-hole web:** whether a hole that close to a window weakens the plate is a materials question, not a geometry one.
