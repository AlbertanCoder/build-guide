# Phase C report: one animation per step, and a lighter 3D viewer

2026-11-03. Proof commands:
- `python -I scripts/build/check_models.py`: 295 checks, ALL PASS. Clip names, every action id is in STEP-TRUTH.md, times inside the clip and in order, plus all Phase B checks.
- `node scripts/build/check_viewer.js`: headless Chrome loading all nine models from `scripts/build/viewer-test.html`, ALL PASS.
- `node scripts/dev/gate.js`: 625/625.

## The viewer (`docs/js/viewer3d.js`)
- **Memory:** a viewer that leaves the screen gives back its WebGL context. It disposes geometry, materials, textures and the shadow map, then the renderer, the canvas, the labels and the bar. It comes back at the same camera and clip time. No more than 2 are ever alive; the one furthest from the middle of the screen goes first.
- **Measured:** scrolling through all nine models, at most **1** renderer was alive at any moment. The page reported no errors, and a released viewer reloaded when scrolled back to.
- **The clip** only runs while it is playing, on screen, and the tab is shown.
- **Controls:** Play/Pause, a time slider, and one numbered button per action (for example "3. Motors M1-M4"). A button pauses the clip, jumps to that moment, shows the action's text in the hint line, and for close-up actions moves the camera in.
- **Reduced motion** (the system setting): no autoplay; the model shows the finished pose. Tested, since headless Chrome reports reduced motion.
- **Unchanged:** no WebGL still shows the flat picture; labels, pins, reset, full screen, lazy loading and the assistant's `mount()` all work as before. `MODEL_VERSION` is now `2026-11-03c`, so browsers fetch the new models.

## The clips (built in Blender, `scripts/build/lib_anim.py`)
| Model | Clip | Length | Actions | Close-ups | Size | Triangles |
|---|---|---|---|---|---|---|
| step-01-parts | step-01-main | 11.0 s | 4 | S1.2 | 453 KB | 8,878 |
| step-02-frame | step-02-main | 11.5 s | 4 | S2.4 (motor screws) | 214 KB | 3,976 |
| step-03-stack | step-03-main | 13.0 s | 5 | S3.2 (solder joints), S3.3 (battery pads) | 287 KB | 5,400 |
| step-04-receiver-fpv | step-04-main | 13.0 s | 8 | S4.1 (receiver wires) | 297 KB | 6,574 |
| step-05-power | step-05-main | 11.0 s | 6 | S5.3 (charger screen) | 104 KB | 1,636 |
| step-06-payload | step-06-main | 11.0 s | 6 | S6.1, S6.3 (pin order) | 105 KB | 1,348 |
| step-07-mount | step-07-main | 11.0 s | 6 | S7.3 (payload spot) | 361 KB | 7,410 |
| step-08-test | step-08-main | 17.5 s | 7 | S8.2 (smoke stopper), S8.4 (props) | 402 KB | 9,058 |
| final-product | none (not a step) | | | | 302 KB | 7,606 |
| **Set** | | | | | **2,548 KB** of 4,096 | each under 20,000 |

All four close-up kinds Shad asked for are covered:
- **Soldering:** S3.2, S3.3.
- **Prop direction:** S8.4. Each motor also spins in its own direction at S8.3, and the props spin the same way at S8.4.
- **Wire routing and pin order:** S4.1, S6.3.
- **Mounting:** S2.4, S7.3.

The still picture in every model is the end of its clip, with everything assembled.

## Also fixed
- **Step 2 flat picture** (`docs/images/build/02-frame.svg`): M1 and M4 were swapped, and it drew the flight stack, which step 2 doesn't fit. It now reads M4 front-left, M2 front-right, M3 rear-left, M1 rear-right, with "FRONT (camera end)" and "Stack holes".
- **S4.8** (fit the top plate) added to STEP-TRUTH.md, so the step 4 action has a truth-table row.

## Not done yet
- **Phase D:** a picture at every action time, the text-versus-animation contact sheets, and gate checks that every action id appears on the page.
- **Labels show from the start of a clip,** even before their part appears; three.js gives labels no visibility tied to scale. Phase D may hide them by action time.
- **`dist/`** (the double-click file) still holds the old models and the old viewer; the Builder rebuilds it.
- **Not yet seen by a human in the real page.** Proven in headless Chrome only.
