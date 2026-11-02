# Shad's Fire-Detecting Drone Build Guide

## [▶ Open the Interactive HTML Guide](https://albertancoder.github.io/build-guide/)

**Quick links:** [Live guide](https://albertancoder.github.io/build-guide/) · [HTML source file](index.html) · [Exact order list](Shad-Drone-Order-List.md) · [Audit report](Shad-Drone-Audit-Report.md) · [Payload software](Shad-Drone-Payload/)

A single-page, interactive order and build guide for a 5-inch analog FPV quadcopter with a Raspberry Pi thermal/GPS payload.

## Preview

### Main page and 46-hour build-time calculator

[![Main guide and build-time calculator](docs/images/overview.png)](docs/images/overview.png)

### Parts and interactive budget

Open **3 Parts & Budget** for the interactive order plan — every row links to its live retailer
listing — plus the **pay-as-you-go staging plan**: nine affordable purchase stages (CA$0–400
each) that each deliver something to build, test or learn the day they arrive, ending at the
same CA$1,714.94 complete plan without one big bill.

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

A chat panel in the bottom-right corner (**Ask the guide**) answers questions about *this* build,
streams the answer, and links straight to the tab or assembly step it used. It can also suggest an
edit to a guide paragraph, with every claim backed by an exact quote from the guide.

[![The guide with the assistant open](docs/images/guide-with-assistant.png)](docs/images/guide-with-assistant.png)

#### Set it up (about 5 minutes, Windows)

1. **Install Node.js.** Download the LTS version from [nodejs.org](https://nodejs.org/) and run the
   installer with its defaults. Nothing else needs installing: the server has no dependencies.
2. **Get the code.** Either `git clone https://github.com/AlbertanCoder/build-guide.git`, or use
   **Code → Download ZIP** on GitHub and unzip it.
3. **Start it.** Double-click **`Start Guide Assistant.cmd`** in the repo folder. It starts the local
   server (a minimised window called "Guide Assistant server") and opens
   [http://localhost:8790/](http://localhost:8790/). The same thing by hand:

   ```powershell
   node server/assistant-server.js --allow-write   # then open http://localhost:8790/
   ```

   Use that address, not a double-clicked `.html` file: the double-clickable copy is offline-only
   and cannot hold a key. Closing the server window turns the AI off until you start it again.

#### Add your API key

[![The settings drawer, with no key saved yet](docs/images/assistant-settings.png)](docs/images/assistant-settings.png)

1. **Get a key.** [OpenRouter](https://openrouter.ai/settings/keys) is the recommended choice: one
   key reaches Claude, GPT, Gemini and others. Create a key, give it a credit limit (for example
   $5 a week), and add a few dollars of credit at
   [openrouter.ai/settings/credits](https://openrouter.ai/settings/credits); a limit does not add
   credit by itself. For a free tier, use [Groq](https://console.groq.com/keys) instead.
2. Open the guide at `http://localhost:8790/`, click **Ask the guide**, then the **⚙** button.
3. **Provider:** choose OpenRouter (or Groq).
4. **Model:** pick one from the dropdown; it is saved straight away. For the best suggestions on
   OpenRouter, pick `anthropic/claude-sonnet-5.5`. To use a model that is not listed, pick
   **Other (type a model name)**, type its exact id and press **Use this model**.
5. **API key:** paste the key, press **Save key**, then **Test key**. "The provider accepted the
   key" means you are done; the header changes to *AI answers · grounded in this guide*.
6. **Daily budget:** set a cap (for example $0.50). When it is reached the assistant switches back
   to its built-in answers instead of spending more.

The key is stored only on this machine, in `server/.settings.json`, which git ignores; the page
only ever sees its last four characters. No key and no money? Choose **Ollama** as the provider and run a local model.

#### Use it

[![An AI answer citing the guide](docs/images/assistant-answer.png)](docs/images/assistant-answer.png)

- **Ask anything about the build** — parts, wiring, a fault, what to buy first. Answers come from
  the guide's own text and the curated troubleshooting set, with a source line and buttons that
  jump to the step used.
- **General questions** (learning Python, how I2C works) get a short answer clearly labelled
  *General knowledge, not from this guide*.
- **Prices and regulations** are only stated with the date the guide checked them; otherwise it
  points you to the Parts tab. Five safety bans (detection claims, undated prices, flying near
  wildfires, certification claims, unapproved edits) are enforced in code, not just requested.
- **Suggest an edit:** open the tab you want to improve, type what to change ("make the opening
  paragraph clearer for a beginner") and press **Suggest an edit**. You get a proposed paragraph
  plus a report of what improves, what the guide supports, and any conflicts, each with exact
  quotes. Occasionally a suggestion is refused by the checks; just ask again.

[![A suggested edit with its cited report](docs/images/assistant-suggestion.png)](docs/images/assistant-suggestion.png)

- **Accept** creates a proposal branch only; the real guide does not change. **Reject** discards
  it without any network call. Review open proposals at
  [http://localhost:8790/review](http://localhost:8790/review), then apply or discard one:

  ```powershell
  node server/ops/accept.js proposal/<name>   # runs the full test gate, merges only if green, rebuilds
  node server/ops/reject.js proposal/<name>   # deletes the branch; main is never touched
  node server/ops/undo.js                     # reverts the last accepted change and rebuilds
  ```

**Grounding is enforced, not requested.** Every request carries passages retrieved from the guide
plus curated troubleshooting entries for the exact parts ordered; build answers must come from
them, general knowledge is labelled as such, and the five bans are checked on every answer before
it is shown or cached. If the AI service fails, the assistant says so instead of guessing.

**Troubleshooting:** *"No local server"* means you opened a file instead of
`http://localhost:8790/`, or the server window is closed: double-click `Start Guide Assistant.cmd`.
*"No API key yet"* means step 5 above has not been done. A credit or billing error on Test key
means the provider account needs credit.

For the public site, publish the repo root on **Cloudflare Pages** and deploy
`docs/assistant/worker.js` to Cloudflare Workers (Pages cannot run
Node) and point the page at it. Everything — routes, costs, the evaluation checklist for trusting a
model — is in [docs/assistant/README.md](docs/assistant/README.md).

**It is built to be cheap as well as good.** Four layers, cheapest first: a repeat
question is replayed from a signature cache; the cheap tier answers by default and
the strong tier is reached only when a question needs it; passages are compressed
to the sentences that answer the question; and `DAILY_USD_MAX` puts a hard ceiling
on spend, falling back to the offline engine rather than billing past it.
`/api/stats` shows the real numbers. Everything is in
[docs/assistant/README.md](docs/assistant/README.md).

Run the tests:

```powershell
# Everything at once: 23 suites, 603 named checks, one exit code.
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
node scripts/dev/check-bans.js              # the five code-enforced bans: 37 checks, none inert
node scripts/dev/check-corrections.js       # the corrections memory: 22 checks, reviewed and pure
node scripts/dev/check-write-gates.js      # the three write gates: 13 checks, each gate alone stops a write
```

*These are previews of the HTML guide, not a completed aircraft. Click any image to view it full-size.*

## Open the guide

Open `index.html` in a browser. Tabs, build checkboxes, progress, quizzes, flashcards, the coverage calculator, editable budget and persistent 46-hour build-time calculator work locally in the browser.

## Included documents

- `Shad-Drone-Order-List.md` — exact parts, quantities, live retailer links, prices, compatibility and cost breakdown.
- `Shad-Drone-Audit-Report.md` — A–G review, component substitutions, compatibility and validation results.
- `Shad-Drone-Payload/` — thermal hotspot grouping, geolocation, real/synthetic payload backends, offline coordinate viewer and unit tests.
- `shad-drone-icon.svg` — current favicon/header artwork.
- `docs/js/assistant.js` + `docs/assistant/` — the offline Guide Assistant, plus the optional Cloudflare Worker that lets a model draft answers from retrieved passages.

The unavailable stack, thermal camera, Pi and goggles were replaced with live alternatives, then re-checked on **31 October 2026**. Every link loads, but **a working link is not stock** — the frame and the GEPRC 50A stack were out of stock on that re-check, so confirm availability and freight at checkout. The complete selected plan costs **CA$1,714.94**, or **CA$1,799.69 after 5% GST**, before remaining retailer freight — roughly **CA$1,840–1,870 landed**.

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
  (CA$1,694.94 × 5% = CA$84.75; CA$1,714.94 + CA$84.75 = CA$1,799.69), and the superseded
  CA$1,678.00 total is absent. Verified non-vacuous by re-running it against a deliberately
  reverted copy, where it failed as intended.
- 26/26 cost-engine unit checks passed (`scripts/dev/check-cost-engine.js`), and 30/30 cost-path
  checks passed end to end (`scripts/dev/check-cost-path.js`) against a mock provider: a repeat
  question produced **zero** upstream calls, passages were compressed 2,308 → 698 characters,
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
