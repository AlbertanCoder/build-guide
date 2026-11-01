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

