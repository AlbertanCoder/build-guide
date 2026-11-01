# Guide Assistant

An AI assistant inside the build guide, for the part static docs cannot do: a confused builder
mid-assembly. It answers off-script troubleshooting questions â€” *"the MLX90640 is noisy at 8 Hz"*,
*"my receiver won't bind, the LED double-blinks"*, *"the Pi reboots when I throttle up"* â€” streams
the answer token by token, and links straight into the tab or assembly step it used.

Three design rules, because the guide's value is that it only states what was checked:

1. **Grounded.** Every request carries passages retrieved from this guide plus curated
   troubleshooting entries for the exact parts ordered. The system prompt forbids answering from
   general knowledge, and the proxy refuses to call a model at all if no passages arrive (`422`).
   Evidence first, model second.
2. **Attributed.** Answers show a source line and up to two navigation buttons. The model asks for
   those with a `[[NAV steps 6]]` directive which is stripped from the prose and turned into a real
   button â€” so a model can never inject markup or a URL into the page.
3. **Degradable.** No key, no network, or a provider outage: the page silently falls back to its
   built-in offline answers and says so in the message. The guide never becomes unusable because an
   API is down.

## Pick your route

| Route | Cost | Key needed | Works on GitHub Pages | Best for |
|---|---|---|---|---|
| **A. Local server + hosted API** | cents per hundred questions | yes | no | trying it today, fastest |
| **B. Local server + local model (Ollama / LM Studio)** | free | no | no | privacy, offline, no bill |
| **C. Deployed proxy (Cloudflare Worker)** | same as A | no (lives in the Worker) | **yes** | the public site |

The browser never holds a key in any route. GitHub Pages only serves static files, so the public
site needs route C; routes A and B run on your machine.

## Route A â€” hosted API (3 minutes)

```powershell
cd build-guide-repo
Copy-Item server/.env.example server/.env
# open server/.env, uncomment ONE provider block, paste your key
node server/assistant-server.js
```

Open <http://localhost:8790/> â€” the guide, with the assistant switched to AI automatically. The
badge reads **"AI answers Â· grounded in this guide"**. `/api/health` shows what it is using.

Any OpenAI-compatible provider works (OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Together, vLLM).
Anthropic's Messages API is supported natively with `PROVIDER=anthropic`.

## Route B â€” a local model, no key, no bill

```powershell
ollama pull qwen2.5:7b      # or llama3.1:8b, mistral-nemo
```

Then in `server/.env`:

```ini
PROVIDER=openai
BASE_URL=http://127.0.0.1:11434/v1
MODEL=qwen2.5:7b
API_KEY=ollama
```

LM Studio works the same way on `http://127.0.0.1:1234/v1`. Small local models follow the grounding
rules less reliably than frontier models â€” run the evaluation below before trusting the output.

## Route C â€” the public site (Cloudflare Worker)

```bash
cd docs/assistant
npx wrangler deploy worker.js --name guide-assistant
npx wrangler secret put OPENAI_API_KEY     # stays server-side
npx wrangler secret put MODEL              # e.g. gpt-4o-mini
npx wrangler secret put ALLOWED_ORIGINS    # https://albertancoder.github.io
```

Then load the config before the assistant script in `index.html`:

```html
<script>window.GUIDE_ASSISTANT = { endpoint: "https://guide-assistant.<you>.workers.dev/ask" };</script>
<script src="docs/js/assistant.js"></script>
```

The Worker returns JSON rather than a stream; the page detects that and renders the whole answer at
once. Both shapes go through the same citation and navigation handling.


## How a question is answered

```
typed question
  ├─ retrieval: BM25 over the page's own DOM (all 8 steps + every accordion)
  │             plus the best-matching curated entry (44 of them)
  ├─ POST /api/ask  { question, passages, history }
  │    ├─ server refuses if passages are missing → 422, and never calls the model
  │    └─ prompt: "answer only from these passages, never invent a price or a
  │               regulation, say 'that is not in this guide' rather than guess"
  ├─ stream: SSE deltas → paragraphs, numbered lists and inline code rendered as
  │          DOM nodes (no innerHTML, so model output cannot inject markup)
  └─ meta: source line + up to two navigation buttons, then the card closes
```

Conversation history (last 6 turns) travels with each request, so follow-ups work. If anything in
that chain fails, the answer comes from the offline engine with a one-line note saying why.

## The gate

18 suites, 375 named checks, one exit code:

```powershell
node scripts/dev/gate.js            # everything
node scripts/dev/gate.js --quick    # skip the browser suite
node scripts/dev/gate.js --json     # machine-readable, for the agent to consume
```

| Suite | Checks |
|---|---|
| encoding | 3 |
| price guard | 4 |
| domain pack | 1 |
| cost engine | 26 |
| cost path | 30 |
| quiz operation | 29 |
| prose operation | 38 |
| job spec | 8 |
| drafter | 15 |
| propose loop | 41 |
| settings api | 31 |
| review api | 20 |
| per-item acceptance | 18 |
| the five bans | 34 |
| browser (Chrome) | 28 |
| self-test served | 19 |
| self-test single file | 19 |
| ai path | 11 |

Two deliberate strictnesses, both proved by hand:

1. **A suite that cannot run is a FAIL, not a skip.** A missing Chrome must never
   quietly disable the only check that catches a broken page.
2. **Every suite declares its expected check count.** If the count drops, the gate
   fails even when everything present passes — so deleting a check can never be how
   you get a green run. Verified by raising `encoding` from 3 to 4, which produced
   `only 3 checks, expected 4` and exit 1.

This is the object decision R24 protects: the self-editing agent may never modify
these checks, and that rule is only enforceable now that the checks are one
invocable thing with a single name.

## The settings drawer (key and daily budget)

Open the panel and press the gear. Both settings are **server state**, not page
state.

| Setting | Range | Notes |
|---|---|---|
| **API key** | — | POSTed once to the local server, written to `server/.settings.json` (git-ignored). The endpoint returns only `keyConfigured` plus the last four characters — **the key is never sent back to the page** |
| **Daily budget** | $0.10 – $2.00 | Enforced by the server. Out-of-range values are clamped, not trusted. A research job's own budget is `min($0.05, cap ÷ 2)`, so one job can never eat a whole day |

**Test key** asks the provider whether the key resolves and reports the verdict
honestly — including "could not check", which is not the same as "invalid".

On `file://` or the public GitHub Pages site there is no server, so the drawer
disables the key field and says why. That is deliberate: a key in `localStorage`
on a machine that also opens the public site is a key you no longer control. The
endpoints also refuse a non-JSON content type (`415`) and a mismatched `Origin`
(`403`), which is what stops a hostile page from rewriting your budget.

At the verified rates, **$0.10/day is about 500 cheap questions** and
**$2.00/day about 3,200 mixed ones** — the slider's minimum is already more than
a demo needs.

## Keeping it cheap without making it dumb

Five layers, cheapest first. Each is checked by a script, not asserted here.

| Layer | What it does | Effect |
|---|---|---|
| **0. Don't ask** | A *confident* curated entry answers locally, on the user's machine | 0 tokens, instant |
| **1. Don't re-ask** | Stemmed-signature cache: exact match, plus near-duplicates; LRU + TTL | a repeat question costs $0 |
| **2. Ask cheaply** | Cheap tier by default; the strong tier is reached only for low retrieval scores, multi-hop questions, or a cheap-tier refusal | ~10x on the ordinary case |
| **3. Ask less** | Extractive sentence selection, duplicate-passage removal, 2 turns + a one-line recap | 2,308 → 698 characters in the test |
| **4. Never surprise** | `DAILY_USD_MAX`, `/api/stats`, and a `cost` field on every answer | a hard ceiling you set |

The router is deliberately conservative: a wrong cheap answer costs more than a
right expensive one, so a refusal escalates once rather than being cached. A
refusal is never stored, because "not in this guide" deserves a second opinion
next time.

**Tiers.** Leave `MODEL` unset and you get a cheap default plus an escalation
path. Set `MODEL` and both tiers collapse to it — no second vendor appears
behind your back.

**Verified prices** (2026-11-01, USD per 1M tokens, from
[OpenAI](https://developers.openai.com/api/docs/pricing) and
[Claude](https://platform.claude.com/docs/en/about-claude/pricing)):

| Model | Input | Cached input | Output |
|---|---|---|---|
| `gpt-5-nano` | $0.05 | $0.005 | $0.40 |
| `gpt-6-luna` (default cheap) | $0.10 | $0.01 | $0.50 |
| `claude-haiku-5.5` (default cheap, Anthropic) | $0.10 | $0.01 | $0.50 |
| `gpt-5-mini` | $0.25 | $0.025 | $2.00 |
| `gpt-6.1-terra` (default strong) | $1.00 | $0.05 | $5.00 |
| `claude-sonnet-5.5` (default strong, Anthropic) | $2.00 | $0.10 | $10.00 |

`server/cost-engine.js` holds this table only to *estimate* spend for the guard
and the stats page. The provider's invoice is the truth; re-check the table when
you change model.

**Watch it work:**

```powershell
curl http://localhost:8790/api/stats
```

```json
{"ok":true,
 "cost":{"totals":{"calls":3,"inputTokens":912,"cachedTokens":200,"outputTokens":540,"usd":0.0007},
         "counters":{"questions":11,"cacheHits":6,"localAnswers":2,"escalated":0},
         "models":{"gpt-6-luna":{"calls":3,"usd":0.0007}}},
 "cache":{"entries":6,"hits":6,"misses":5,"hitRate":0.545}}
```

`questions` counts everything asked; `localAnswers` is what the page answered for
free before it ever reached this server; `cacheHits` is what this server answered
from storage.

## Files

| File | Purpose |
|---|---|
| `server/assistant-server.js` | zero-dependency server: static files, streaming `/api/ask` proxy, `/api/health` |
| `server/.env.example` | every supported provider, commented; copy to `server/.env` (git-ignored) |
| `docs/js/assistant.js` | the panel: retrieval, offline engine, streaming client, rendering |
| `docs/assistant/worker.js` | optional Cloudflare Worker for the public site |
| `scripts/dev/mock-llm.js` | fake OpenAI-compatible provider used by the tests |
| `scripts/dev/check-llm-path.ps1` | 11-check end-to-end test of the AI path |
| `scripts/dev/check-assistant.ps1` | 12-check test of the offline engine, on any copy of the page |
| `scripts/dev/check-encoding.js` | fails if a shipped file has double-encoded UTF-8 |
| `scripts/dev/check-kb-prices.js` | fails if a knowledge-base price drifts from the guide, if the budget arithmetic stops closing, or if the superseded total returns |
| `server/cost-engine.js` | the zero-dependency cost engine: cache, router, compression, meter |
| `scripts/dev/check-cost-engine.js` | 26 unit checks on the engine |
| `scripts/dev/check-cost-path.js` | 30 end-to-end checks: cache, compression, stats, budget, escalation |
| `scripts/dev/check-settings.js` | 29 checks on the key, budget and provider endpoints |
| `server/ops/undo.js` | reverts an accepted proposal, then rebuilds and re-mirrors |
| `server/ops/job-spec.js` | turns "add 3 harder detect questions" into a fixed job; refuses destructive sentences |
| `server/ops/draft.js` | asks a model for candidates, then keeps only the ones the checks accept |
| `scripts/dev/check-job-spec.js` | 8 checks on that parser |
| `scripts/dev/check-draft.js` | 15 checks on the drafter — prompt shape, JSON extraction, screening |
| `scripts/dev/check-browser.js` | 28 checks in a real browser: the settings drawer, the quiz pass-survival rule, all 7 tabs render, zero page errors |
| `server/ops/quiz-add.js` | the first named operation: validate before applying, then apply as a pure function |
| `scripts/dev/check-quiz-op.js` | 29 checks on that operation — every refusal, plus proof it cannot write to disk |
| `server/ops/propose.js` | turns a validated op into a `proposal/` branch; cannot touch `main` |
| `server/ops/known-values.json` | values the corpus treats as correct, so a distractor can never secretly be right |
| `scripts/dev/check-propose.js` | 32 checks in a throwaway clone covering propose, accept, undo and reject — including that `main` never moved |
| `server/ops/accept.js` | merges a proposal only if the whole gate is green on it |
| `server/ops/reject.js` | deletes a `proposal/*` branch and nothing else |

## Tests

```powershell
# AI path: mock provider -> proxy -> real browser. No API key required.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev/check-llm-path.ps1

# Offline engine, from a served page and from the double-clickable single file
python -m http.server 8899
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev/check-assistant.ps1 -Target "http://127.0.0.1:8899/index.html"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev/check-assistant.ps1 -Target "dist/Shad's Build Guide.html"
```

A price edit has to reach two files, so one more check guards the join:

```powershell
# every figure the assistant knows must also appear in the guide
node scripts/dev/check-kb-prices.js
```

The cost path has its own two suites, and neither needs a key or a network:

```powershell
node scripts/dev/check-cost-engine.js   # 26 unit checks: cache, router, meter, compression
node scripts/dev/check-cost-path.js     # 30 end-to-end checks against a mock provider
```

The curated domain pack is built from `docs/domain/*.md`. The build **refuses to
publish a claim that has no `source::` line or no `verified::` date**, so an
unsourced number cannot reach the page:

```powershell
node scripts/dev/build-domain.js           # regenerate docs/js/domain.js
node scripts/dev/build-domain.js --check   # fail if it is stale or any claim is unsourced
node scripts/dev/check-settings.js         # 23 checks: key never returned, budget clamped, CSRF refused
node scripts/dev/check-browser.js          # 18 checks in headless Chrome: drawer clicks, tabs, no errors
```

`check-browser.js` is the one that proves the *clicking*, not just the API: it
types a key into the drawer, clicks Save, drags the slider, and then confirms
against the server that both actually landed. It also asserts all seven tabs
render and that no uncaught error occurred — which is the same smoke test any
future JavaScript edit has to pass.

`check-cost-path.js` measures the savings at the *provider*: it asserts that a
repeat question produces zero upstream calls, that the passages sent are smaller
than the ones handed over, that the daily cap returns 402 without spending, and
that a cheap-tier refusal escalates exactly once.

The AI test opens a real browser, waits for the page to report what it rendered, and asserts:
streaming finished, markdown became real list items, the `[[NAV]]` directive became a one-button
link and was stripped from the prose, retrieval supplied passages before the model was called, a
source is shown, and an empty-passage request is rejected with `422`.

## Evaluate a model before you trust it

The quiz bank is a ready-made gold set: 28 questions whose `why` fields hold the canonical, sourced
answers, and the calculators define the correct numbers.

1. Ask each quiz question through the panel; compare against the `why` text.
2. Ask *"how wide is the frame at 30 m with the 55 degree lens"* and *"what is my total after GST"* —
   check against tab 2 and tab 3.
3. Ask five things the guide does not answer; every one must come back as "that is not in this
   guide".
4. Only then publish. One confident wrong price or separation distance costs more credibility than
   the assistant adds.

## Cost, privacy, limits

- Roughly 4-8k input tokens per question (passages + rules) and a few hundred output. On a small
  model that is a fraction of a cent. The server logs nothing and stores nothing.
- What leaves your machine: the question, the retrieved guide passages, and the last few turns. If
  that matters, use Route B and keep everything local.
- Rate limit is 20 questions / 5 minutes / IP, in memory; a restart clears it. For a public site,
  add a durable limiter in the Worker.
- A model can still be wrong in ways the prompt did not anticipate. That is why the offline engine
  stays as the fallback, citations are always shown, and the evaluation above exists.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Badge still says "works offline" | `/api/health` reports `keyConfigured: false`, or the page was opened from `file://` |
| `501 No API key configured` | `server/.env` missing, or the wrong provider block left commented |
| `422 No guide passages` | the question matched nothing in the guide - the guard working as designed |
| Answer appears all at once | you are on the Worker (JSON), not the local server (SSE) |
| Model ignores the grounding rules | switch to a stronger model; small local models drift first |
| CORS error on the Worker | `ALLOWED_ORIGINS` must list the exact origin serving the page |

## Removing it

Delete the `<script src="docs/js/assistant.js">` line and the `/* Guide Assistant */` CSS block from
`index.html`, plus the inlining step in `scripts/standalone/make-standalone.js`. Nothing else in the
page depends on it, and the guide keeps working with no assistant at all.

