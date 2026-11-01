# Shad's Fire-Detecting Drone Build Guide

## [▶ Open the Interactive HTML Guide](https://albertancoder.github.io/build-guide/)

**Quick links:** [Live guide](https://albertancoder.github.io/build-guide/) · [HTML source file](index.html) · [Exact order list](Shad-Drone-Order-List.md) · [Audit report](Shad-Drone-Audit-Report.md) · [Payload software](Shad-Drone-Payload/)

A single-page, interactive order and build guide for a 5-inch analog FPV quadcopter with a Raspberry Pi thermal/GPS payload.

## Preview

### Main page and 46-hour build-time calculator

[![Main guide and build-time calculator](docs/images/overview.png)](docs/images/overview.png)

### Parts and interactive budget

[![Parts and budget](docs/images/order-plan.png)](docs/images/order-plan.png)

### Detection pipeline and coverage calculator

[![Detection pipeline and coverage calculator](docs/images/logic.png)](docs/images/logic.png)

### IKEA-style assembly instructions

Open **4 Build Steps** in the guide for the assembly manual: one step at a time, each with
its interactive 3D model and flat picture, a parts strip, numbered actions, a safety note
and a check gate before the next step. Big Previous/Next buttons walk through the eight
steps — inventory, frame assembly, soldering, receiver/FPV wiring, charging, Pi/sensor
wiring, payload mounting and testing — or a toggle shows all eight at once.

[![Illustrated 8-step build](docs/images/illustrated-build.png)](docs/images/illustrated-build.png)

The individual SVG diagrams are also available in `docs/images/build/`.

### Interactive 3D models

Each of the eight steps — plus the finished aircraft — is an interactive 3D model you can
orbit, zoom and pan, with HTML part labels read from the model itself. three.js is vendored in
`docs/vendor/three` (no CDN), models are lazy-loaded on scroll, and each step also shows its
flat picture underneath the model. Step 8's six test stages are clickable hotspots
(A–F) that highlight the hardware each stage exercises.

Models are generated from committed Blender scripts, so they can be rebuilt at any time:

```bash
blender -b --factory-startup -P scripts/build/build_step02_frame.py
blender -b --factory-startup -P scripts/build/build_final_product.py   # etc.
```

| File | Purpose |
|---|---|
| `scripts/build/lib_core.py` | materials, explicit-mesh primitives, label anchors, GLB export, preview render |
| `scripts/build/lib_quad.py` | the quad itself: frame, motors, propellers, stack, payload, battery |
| `scripts/build/lib_kit.py` | bench hardware: radio, charger, LiPo bag, smoke stopper, monitor, laptop, tools |
| `scripts/build/build_*.py` | one builder per model |
| `docs/models/*.glb` | exported models (all under 7k triangles) |
| `docs/js/viewer3d.js` | on-demand viewer: orbit/zoom/pan, CSS2D labels, hotspots, shadow catcher |

Labels travel inside the GLB as node `extras`, so a model and its labels can never drift apart.
To view locally, serve the repo root (ES modules and GLB fetches need HTTP):

```bash
python -m http.server 8000
```

### Opening the guide by double-click (no server)

Browsers block ES modules and `.glb` fetches on `file://`, so opening `index.html` directly shows
the page but no 3D. For a double-clickable copy, build the self-contained single file instead —
three.js, all nine models and every diagram get inlined, and the result works from any folder:

```bash
# once, in a scratch dir: npm install esbuild
esbuild docs/js/viewer3d.js --bundle --format=iife --minify --target=es2020 \
  --alias:three=./docs/vendor/three/build/three.module.js \
  --alias:three/addons/controls/OrbitControls.js=./docs/vendor/three/addons/controls/OrbitControls.js \
  --alias:three/addons/loaders/GLTFLoader.js=./docs/vendor/three/addons/loaders/GLTFLoader.js \
  --alias:three/addons/renderers/CSS2DRenderer.js=./docs/vendor/three/addons/renderers/CSS2DRenderer.js \
  --outfile=bundle.js

node scripts/standalone/make-standalone.js bundle.js "Shad's Build Guide.html"
```

The build steps tab is deep-linkable: `#p-steps` opens it directly.

*These are previews of the HTML guide, not a completed aircraft. Click any image to view it full-size.*

## Open the guide

Open `index.html` in a browser. Tabs, build checkboxes, progress, quizzes, flashcards, the coverage calculator, editable budget and persistent 46-hour build-time calculator work locally in the browser.

## Included documents

- `Shad-Drone-Order-List.md` — exact parts, quantities, live retailer links, prices, compatibility and cost breakdown.
- `Shad-Drone-Audit-Report.md` — A–G review, component substitutions, compatibility and validation results.
- `Shad-Drone-Payload/` — thermal hotspot grouping, geolocation, real/synthetic payload backends, offline coordinate viewer and unit tests.
- `shad-drone-icon.svg` — current favicon/header artwork.

The unavailable stack, thermal camera, Pi and goggles were replaced with live alternatives checked on **31 October 2026**. Stock and freight still need confirmation at checkout. The complete selected plan costs **CA$1,673.00**, or **CA$1,754.10 after 5% GST**, before remaining retailer freight.

## Payload setup

See `Shad-Drone-Payload/README.md` for wiring, power, installation and acceptance checks. Run the software tests before hardware integration:

```bash
cd Shad-Drone-Payload
python -m unittest -v test_drone_logic.py
python payload.py --demo
python payload.py --demo --serve
```

The viewer defaults to `http://127.0.0.1:8000` and the append-only log is `flight-log.jsonl`.

## Validation

- 55/55 browser checks passed, including all tabs, saved state, quizzes, flashcards, budget, coverage and mobile layouts.
- 19/19 payload unit tests passed.
- Demo, map health/API and viewer responses passed.
- 35/35 order-document links opened successfully.

Product availability, compatibility and performance must still be verified during assembly, bench testing and controlled flight testing. This is a prototype builder's roadmap, not career or legal advice.
