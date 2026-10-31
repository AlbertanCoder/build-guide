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

### Illustrated 8-step build

Open **4 Build Steps** in the guide for eight custom diagrams covering inventory, frame assembly, soldering, receiver/FPV wiring, charging, Pi/sensor wiring, payload mounting and testing.

[![Illustrated 8-step build](docs/images/illustrated-build.png)](docs/images/illustrated-build.png)

The individual SVG diagrams are also available in `docs/images/build/`.

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
