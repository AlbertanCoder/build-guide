# Phase G re-check (4 Nov 2026)

Phase G adds detail to the nine 3D models and fixes the Step 1 and Step 2 pictures that the fresh-eyes review
(`architect-selfaudit/fresh-eyes/fresh-eyes-guide.md`, "Why the step 1 and 2 pictures are hard to see") found hard to read.
Every number below came from a command run on this tree; nothing is estimated.

## What changed

- **Detail:** wires bend in smooth curves; solder joints (a small shiny cone where a wire meets a pad) and socket-head
  screws. Steps 3-8 and the finished drone show 82 solder joints and 84 screw heads. The solder size is drawn, not
  measured (ASSUMPTION), and so is the screw head (ISO 4762 M3 nominal, ASSUMPTION for these screws).
- **Smaller files:** normals stored in 8 bits, and every number in the file's text part written in its shortest form
  that reads back as the same float32 (`scripts/build/glb_pack.py`). Checked against the previous packer on the same
  input: 0 differences in 344 numbers, binary data identical.
- **Step 7:** the More Volts Li-ion pack as a see-through outline where the LiPo sits, labelled
  "LI-ION PACK: 44 MM TALL, SAME STRAP" with "about 2 mm from the GPS: measure on arrival".
- **Step 1:** ONE GNB pack and the Li-ion pack. The commit before this one (e7e5409) drew two GNB packs; the buy list
  has one. Fixed.
  - S1.1 now lands when all five piles are on the table, highlights one part per pile and names the five piles.
  - The order list has printed lines and tick boxes (it was one blank orange slab).
  - S1.2, S1.3 and S1.S frame their own item.
- **Step 2:**
  - A FRONT arrow on the frame, pointing to the camera end.
  - Motor tags such as "M1 REAR RIGHT, CW".
  - S2.3 seen from behind and above, as its text says.
- **The viewer (`docs/js/viewer3d.js`):**
  - Parts outside the step are darker and mostly solid (they were 16 % see-through grey).
  - Each action names what it is about, while the full label set still starts OFF.
  - The close-up box appears only when it is a real zoom of 2x or more, with a thicker border.
- **New checks (`scripts/build/verify_build.py`):**
  - `X-models-buy-list`: every part drawn in any model comes from a buy line, or is named as not bought (your
    laptop, the mug, guide marks), and Step 1 shows no more packs, chargers, radios or monitors than the list buys.
  - `X-models-box-check` (NEEDS REAL PARTS): the M7AC's mains cable and its lead to the pack are drawn, but the
    listing names only the charger, so check the box when it arrives.

## Model sizes (limit 500 KB each, 4 MB for the set)

| Model | Before | Now |
|---|---|---|
| step-01-parts | 476.0 KB | 431.5 KB |
| step-02-frame | 221.5 KB | 254.9 KB |
| step-03-stack | 317.0 KB | 345.6 KB |
| step-04-receiver-fpv | 319.8 KB | 335.9 KB |
| step-05-power | 142.7 KB | 118.3 KB |
| step-06-payload | 163.1 KB | 142.9 KB |
| step-07-mount | 480.2 KB | 468.9 KB |
| step-08-test | 495.8 KB | 465.7 KB |
| final-product | 385.9 KB | 373.4 KB |

Whole set: 2937 KB.

## Checks run on this tree

- `python -I scripts/build/check_models.py`: ALL PASS, 503 checks.
- `python -I scripts/build/verify_build.py`: 200 checks passed, 0 failed, 38 need the real parts, 0 are page fixes.
- `node scripts/build/check_viewer.js --sheets`: ALL PASS, 178 checks; contact sheets `contact-step-0N.png` rewritten.
  The sheets now draw each action's labels and the close-up border as the viewer shows them.
- Chip text against the page: 46 chips, 0 differ.
- The full gate: run jointly with the Builder; its result is in the Phase G commit message.

## Bugs found and fixed during Phase G

- The number shortening first ran before the data re-layout and pointed accessors at the wrong data (motor bells
  moved). check_models' motor-position check caught it; the shortening now runs last.
- The viewer test read each part's own scale, so a solder joint on a hidden wire counted as visible. It now uses the
  scale as drawn (parents included).

## Not done here

- The VIFLY Finder 2 lost-drone beeper and the monitor's USB-C power bank: waiting for the Builder's approved page
  wording.
- From the review, not in this phase's list: different colours for the 30 mm and 22 mm standoffs, a good-vs-bad
  screw cut-away for S2.4, and icons for the props packet and the laptop.
