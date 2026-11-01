# Shad's Fire-Detecting Drone Build Guide

## [â–¶ Open the Interactive HTML Guide](https://albertancoder.github.io/build-guide/)

**Quick links:** [Live guide](https://albertancoder.github.io/build-guide/) Â· [HTML source file](index.html) Â· [Exact order list](Shad-Drone-Order-List.md) Â· [Audit report](Shad-Drone-Audit-Report.md) Â· [Payload software](Shad-Drone-Payload/)

A single-page, interactive order and build guide for a 5-inch analog FPV quadcopter with a Raspberry Pi thermal/GPS payload.

## Preview

### Main page and 46-hour build-time calculator

[![Main guide and build-time calculator](docs/images/overview.png)](docs/images/overview.png)

### Parts and interactive budget

Open **3 Parts & Budget** for the interactive order plan â€” every row links to its live retailer
listing â€” plus the **pay-as-you-go staging plan**: nine affordable purchase stages (CA$0â€“400
each) that each deliver something to build, test or learn the day they arrive, ending at the
same CA$1,714.94 complete plan without one big bill.

[![Parts and budget](docs/images/order-plan.png)](docs/images/order-plan.png)

### Detection pipeline and coverage calculator

[![Detection pipeline and coverage calculator](docs/images/logic.png)](docs/images/logic.png)

### IKEA-style assembly instructions

Open **4 Build Steps** in the guide for the assembly manual: one step at a time, each with
its interactive 3D model and flat picture, a parts strip, numbered actions, a safety note
and a check gate before the next step. Big Previous/Next buttons walk through the eight
steps â€” inventory, frame assembly, soldering, receiver/FPV wiring, charging, Pi/sensor
wiring, payload mounting and testing â€” or a toggle shows all eight at once.

[![Illustrated 8-step build](docs/images/illustrated-build.png)](docs/images/illustrated-build.png)

The individual SVG diagrams are also available in `docs/images/build/`.

### Interactive 3D models

Each of the eight steps â€” plus the finished aircraft â€” is an interactive 3D model you can
orbit, zoom and pan, with HTML part labels read from the model itself. three.js is vendored in
`docs/vendor/three` (no CDN), models are lazy-loaded on scroll, and each step also shows its
flat picture underneath the model. Step 8's six test stages are clickable hotspots
(Aâ€“F) that highlight the hardware each stage exercises.

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
the page but no 3D. For a double-clickable copy, build the self-contained single file instead â€”
three.js, all nine models, every diagram and the Guide Assistant get inlined, and the result works
from any folder:

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

### Guide Assistant (an AI that answers from this guide)

A panel in the bottom-right corner answers troubleshooting questions about *this* build â€” "the
thermal image is noisy at 8 Hz", "the receiver won't bind", "i2cdetect shows nothing" â€” streams the
answer, and links straight into the tab or assembly step it used.

**Run it as a real AI assistant (3 minutes, needs a key):**

```powershell
Copy-Item server/.env.example server/.env   # add one provider key, or point it at Ollama
node server/assistant-server.js             # http://localhost:8790/
```

`server/assistant-server.js` is a zero-dependency proxy: it serves the guide and streams answers from
any OpenAI-compatible provider or Anthropic, with the key kept server-side. The page detects the
server and switches itself on. No key at all? Put the same `.env` on Ollama or LM Studio and it runs
free and offline. While the server runs, `http://localhost:8790/review` is a read-only review
page: any open proposal shown as a diff next to a live rendering of the change.

**Grounding is enforced, not requested.** Every request carries passages retrieved from the guide
plus curated troubleshooting entries for the exact parts ordered; the proxy refuses to call a model
when no passages arrive (`422`); the prompt forbids answering from general knowledge; and answers
show a source line plus up to two navigation buttons. If the service is unreachable the assistant
falls back to its built-in offline answers and says so.

For the public GitHub Pages site, deploy `docs/assistant/worker.js` to Cloudflare (Pages cannot run
Node) and point the page at it. Everything â€” routes, costs, the evaluation checklist for trusting a
model â€” is in [docs/assistant/README.md](docs/assistant/README.md).

**It is built to be cheap as well as good.** Five layers, cheapest first: a
confident curated entry answers locally with no model call at all; a repeat
question is replayed from a signature cache; the cheap tier answers by default and
the strong tier is reached only when a question needs it; passages are compressed
to the sentences that answer the question; and `DAILY_USD_MAX` puts a hard ceiling
on spend, falling back to the offline engine rather than billing past it.
`/api/stats` shows the real numbers. Everything is in
[docs/assistant/README.md](docs/assistant/README.md).

Run the tests:

```powershell
# Everything at once: 378 named checks, one exit code.
node scripts/dev/gate.js
node scripts/dev/gate.js --quick    # skip the browser suite (needs Chrome)
node scripts/dev/gate.js --json     # machine-readable

# Or one suite at a time:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev/check-llm-path.ps1   # AI path, mock provider, no key
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev/check-assistant.ps1 -Target "dist/Shad's Build Guide.html"
node scripts/dev/check-kb-prices.js          # every KB price must also appear in the guide
node scripts/dev/check-cost-engine.js        # cache, router, meter, compression (26 checks)
node scripts/dev/check-cost-path.js          # zero-cost repeat, cap, escalation (30 checks)
node scripts/dev/build-domain.js --check     # domain pack is current and every claim is sourced
node scripts/dev/check-settings.js           # key never returned, budget clamped (31 checks)
node scripts/dev/check-browser.js            # real Chrome: drawer clicks, quiz pass survival (28)
node scripts/dev/check-quiz-op.js            # the quiz-add operation: 29 checks, incl. refusals
node scripts/dev/check-prose-op.js           # the prose-rewrite operation: 38 checks, incl. refusals
node scripts/dev/check-bans.js              # the five code-enforced bans: 33 checks, none inert
```

*These are previews of the HTML guide, not a completed aircraft. Click any image to view it full-size.*

## Open the guide

Open `index.html` in a browser. Tabs, build checkboxes, progress, quizzes, flashcards, the coverage calculator, editable budget and persistent 46-hour build-time calculator work locally in the browser.

## Included documents

- `Shad-Drone-Order-List.md` â€” exact parts, quantities, live retailer links, prices, compatibility and cost breakdown.
- `Shad-Drone-Audit-Report.md` â€” Aâ€“G review, component substitutions, compatibility and validation results.
- `Shad-Drone-Payload/` â€” thermal hotspot grouping, geolocation, real/synthetic payload backends, offline coordinate viewer and unit tests.
- `shad-drone-icon.svg` â€” current favicon/header artwork.
- `docs/js/assistant.js` + `docs/assistant/` â€” the offline Guide Assistant, plus the optional Cloudflare Worker that lets a model draft answers from retrieved passages.

The unavailable stack, thermal camera, Pi and goggles were replaced with live alternatives, then re-checked on **31 October 2026**. Every link loads, but **a working link is not stock** â€” the frame and the GEPRC 50A stack were out of stock on that re-check, so confirm availability and freight at checkout. The complete selected plan costs **CA$1,714.94**, or **CA$1,799.69 after 5% GST**, before remaining retailer freight â€” roughly **CA$1,840â€“1,870 landed**.

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
- 12/12 Guide Assistant offline self-tests passed on both the served page and the offline single-file build.
- 11/11 Guide Assistant AI-path checks passed end to end against a mock streaming provider
  (`scripts/dev/check-llm-path.ps1`): SSE streaming reached the browser, markdown rendered as real
  lists, the `[[NAV]]` directive became a button and was stripped from the prose, retrieval ran
  before the model call, and an empty-passage request was rejected with `422`.
- 4/4 Guide Assistant price checks passed (`scripts/dev/check-kb-prices.js`): every figure in the
  assistant's knowledge base also appears in the guide, the budget arithmetic closes
  (CA$1,694.94 Ã— 5% = CA$84.75; CA$1,714.94 + CA$84.75 = CA$1,799.69), and the superseded
  CA$1,678.00 total is absent. Verified non-vacuous by re-running it against a deliberately
  reverted copy, where it failed as intended.
- 26/26 cost-engine unit checks passed (`scripts/dev/check-cost-engine.js`), and 30/30 cost-path
  checks passed end to end (`scripts/dev/check-cost-path.js`) against a mock provider: a repeat
  question produced **zero** upstream calls, passages were compressed 2,308 â†’ 698 characters,
  duplicates were dropped, `/api/stats` accounted the spend, the daily cap returned `402` without
  calling the provider, and a cheap-tier refusal escalated exactly once to the strong tier.
- 14/14 Guide Assistant offline self-tests passed, including that a confident curated question is
  answered with no model call and an unanswerable one is not.
- `node --check` clean on `docs/js/assistant.js`, `server/assistant-server.js` and the mock provider;
  UTF-8 integrity verified for every shipped file.
- 19/19 payload unit tests passed.
- Demo, map health/API and viewer responses passed.
- Every order-document link resolves, but a working link is not stock: the frame and the GEPRC 50A
  stack were out of stock on the 31 Oct 2026 re-check.

Product availability, compatibility and performance must still be verified during assembly, bench testing and controlled flight testing. This is a prototype builder's roadmap, not career or legal advice.
