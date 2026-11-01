/**
 * Guide Assistant — local LLM server (zero dependencies).
 *
 *   node server/assistant-server.js
 *
 * Serves the build guide AND a streaming /api/ask endpoint, so the browser never
 * sees an API key. Works with any OpenAI-compatible provider (OpenAI, Groq,
 * OpenRouter, DeepSeek, Mistral, Together, vLLM, LM Studio, Ollama) or Anthropic.
 *
 * Configuration lives in server/.env (copy .env.example). Nothing is required to
 * start: without a key the server still serves the guide, and the page falls
 * back to its offline answers.
 *
 * Grounding: the browser sends the passages it retrieved from the guide. This
 * server refuses to ask the model anything without them, so the assistant cannot
 * slide into general-purpose chatter about a build it has no evidence for.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const ENGINE = require("./cost-engine.js");

/* ---------- .env (no dependency) ---------- */
function loadEnv() {
  const file = path.join(__dirname, ".env");
  const out = {};
  if (!fs.existsSync(file)) { return out; }
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) { return; }
    const i = t.indexOf("=");
    if (i < 1) { return; }
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  });
  return out;
}

const ENV = Object.assign({}, loadEnv(), process.env);
const PORT = Number(ENV.PORT || 8790);
let PROVIDER = String(ENV.PROVIDER || "openai").toLowerCase();

/* ---------- settings the page may change (git-ignored) ----------
   The API key is accepted through the UI, written to disk here, and never sent
   back to the browser. Reading it out would put a key in localStorage on a
   machine that also opens the public site; so the endpoint reports only a masked
   hint. The daily budget is stored here too, because a cap enforced in the page
   is a suggestion, not a cap. */
const SETTINGS_FILE = ENV.SETTINGS_FILE || path.join(__dirname, ".settings.json");
const BUDGET_MIN = 0.1; /* USD/day - about 500 cheap questions */
const BUDGET_MAX = 2.0; /* USD/day - about 3,200 mixed questions */

function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch (e) {
    return {}; /* missing or corrupt: fall back to .env, never fail to start */
  }
}

function writeSettings(patch) {
  const next = Object.assign(readSettings(), patch);
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

const SETTINGS = readSettings();

/* .settings.json wins over .env once the page has been used to configure things,
   so the drawer is the source of truth after the first save. */
if (SETTINGS.provider) { PROVIDER = String(SETTINGS.provider).toLowerCase(); }
/* Two tiers, so the cheap model does the ordinary work and the strong one is
   reserved for questions that need it. If MODEL is set explicitly we do NOT
   invent a second, pricier model behind your back: both tiers become MODEL,
   which is exactly the old behaviour. Leave MODEL unset to get the cheap
   default plus an escalation path. */
const MODEL_EXPLICIT = !!ENV.MODEL;
const DEFAULT_CHEAP = PROVIDER === "anthropic" ? "claude-haiku-5.5" : "gpt-6-luna";
const DEFAULT_STRONG = PROVIDER === "anthropic" ? "claude-sonnet-5.5" : "gpt-6.1-terra";
let MODEL = SETTINGS.cheapModel || ENV.MODEL || DEFAULT_CHEAP;
let CHEAP_MODEL = SETTINGS.cheapModel || ENV.CHEAP_MODEL || MODEL;
let STRONG_MODEL = SETTINGS.strongModel || ENV.STRONG_MODEL || (MODEL_EXPLICIT ? MODEL : DEFAULT_STRONG);
/* Derived, never stored: escalation only exists when the two tiers differ. */
function canEscalate() { return STRONG_MODEL !== CHEAP_MODEL; }

/* Provider presets. `kind` is the adapter — anything OpenAI-compatible is
   "openai", the Messages API is "anthropic". This exists so the drawer can offer
   a choice instead of making you hand-edit .env to use a non-OpenAI key. */
const PRESETS = [
  { id: "openai", label: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1",
    cheap: "gpt-6-luna", strong: "gpt-6.1-terra" },
  { id: "anthropic", label: "Anthropic (Claude)", kind: "anthropic", baseUrl: "https://api.anthropic.com",
    cheap: "claude-haiku-5.5", strong: "claude-sonnet-5.5" },
  { id: "groq", label: "Groq", kind: "openai", baseUrl: "https://api.groq.com/openai/v1",
    cheap: "llama-3.3-70b-versatile", strong: "llama-3.3-70b-versatile" },
  { id: "openrouter", label: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1",
    cheap: "anthropic/claude-3.5-haiku", strong: "anthropic/claude-sonnet-4.5" },
  { id: "deepseek", label: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1",
    cheap: "deepseek-chat", strong: "deepseek-chat" },
  { id: "mistral", label: "Mistral", kind: "openai", baseUrl: "https://api.mistral.ai/v1",
    cheap: "mistral-small-latest", strong: "mistral-large-latest" },
  { id: "ollama", label: "Ollama (local, free, no key)", kind: "openai",
    baseUrl: "http://127.0.0.1:11434/v1", cheap: "qwen2.5:7b", strong: "qwen2.5:7b" }
];

function presetFor() {
  const hit = PRESETS.find((p) => p.kind === PROVIDER && p.baseUrl === BASE_URL);
  return hit ? hit.id : "";
}

function applyPreset(id) {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) { return null; }
  PROVIDER = p.kind;
  BASE_URL = p.baseUrl;
  MODEL = p.cheap;
  CHEAP_MODEL = p.cheap;
  STRONG_MODEL = p.strong;
  return p;
}
let BASE_URL = (SETTINGS.baseUrl || ENV.BASE_URL || (PROVIDER === "anthropic"
  ? "https://api.anthropic.com"
  : "https://api.openai.com/v1")).replace(/\/$/, "");
/* `let`, not `const`: the settings endpoint can replace it while the server runs.
   A key saved through the UI wins over one in .env, so the page is the source of
   truth once it has been used. */
let API_KEY = SETTINGS.apiKey || ENV.API_KEY || ENV.OPENAI_API_KEY || ENV.ANTHROPIC_API_KEY || "";
const MAX_QUESTION = 500;
const MAX_PASSAGES = 6;
const MAX_TOKENS = 700;
/* Passage budget after compression. The browser sends up to 6 x 1,400 chars;
   these caps are what actually decides how many tokens get paid for. */
const PASSAGE_CHARS = Number(ENV.PASSAGE_CHARS || 600);
const PASSAGE_TOTAL = Number(ENV.PASSAGE_TOTAL || 2600);
const PASSAGE_COUNT = Number(ENV.PASSAGE_COUNT || 3);
const HISTORY_TURNS = Number(ENV.HISTORY_TURNS || 2);

/* Cost control. DAILY_USD_MAX=0 means no cap; set it and the server degrades to
   the page's offline engine instead of spending past it. */
const TEST_MODE = ENV.GA_TEST === "1";
const DAILY_USD_MAX = Number(SETTINGS.dailyUsdMax || ENV.DAILY_USD_MAX || 0);
const CACHE_OFF = String(ENV.CACHE || "").toLowerCase() === "off";
const CACHE_FILE = ENV.CACHE_FILE || path.join(__dirname, ".cache", "answers.json");
const meter = new ENGINE.CostMeter({ dailyUsdMax: DAILY_USD_MAX });
const cache = new ENGINE.AnswerCache({
  /* tests always start with an empty cache, so a second run of a test still
     exercises the provider instead of replaying the first run's answer */
  file: TEST_MODE || CACHE_OFF ? "" : CACHE_FILE,
  ttlMs: Number(ENV.CACHE_TTL_DAYS || 30) * 86400000,
  maxEntries: Number(ENV.CACHE_MAX || 400),
  persist: !(TEST_MODE || CACHE_OFF)
});
const RATE_LIMIT = 20;               // requests per window per IP
const RATE_WINDOW = 5 * 60 * 1000;
const rate = new Map();
let lastProbe = null;   /* test-only, see /api/probe */

function rateLimited(ip) {
  const now = Date.now();
  const rec = rate.get(ip) || { n: 0, t: now };
  if (now - rec.t > RATE_WINDOW) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  rate.set(ip, rec);
  if (rate.size > 2000) { rate.clear(); }
  return rec.n > RATE_LIMIT;
}

/* ---------- prompt ---------- */
function systemPrompt() {
  return [
    "You are the Guide Assistant inside a single-page build guide for a 5-inch analog FPV",
    "quadcopter carrying a Raspberry Pi Zero 2 WH, a Pimoroni MLX90640 thermal camera (I2C 0x33)",
    "and a PA1010D GPS (I2C 0x10) on a SparkFun Qwiic HAT. The flight stack is a GEPRC TAKER",
    "F405 BLS 50A running Betaflight; the radio is a RadioMaster Pocket (ELRS) with an RP1 V2",
    "receiver on UART2/CRSF. Analog video: RunCam Phoenix 2 + TBS Unify Pro 5G8 HV + Skyzone M5F.",
    "",
    "The author's credibility rests on verified, sourced, honest claims. Obey these rules:",
    "1. Answer ONLY from the PASSAGES provided. They are excerpts from the guide itself plus",
    "   curated troubleshooting entries written for this exact build.",
    "2. Never invent a part number, price, fee or regulation. If a passage states a number you",
    "   may repeat it and attribute it. If no passage states it, say what the guide does say.",
    "3. If the passages do not answer the question, reply exactly: That is not in this guide.",
    "   Then say in one sentence what the user could check instead. Never guess.",
    "4. Safety before cleverness: props off for any configuration, never charge a LiPo",
    "   unattended, never power a VTX without its antenna, sensors are 3.3V only, CAR 601.15",
    "   keeps you away from wildfires, Basic operations keeps you more than 30 m from anyone.",
    "5. Never claim measured detection performance. Sampling geometry is not detection proof:",
    "   a 1 m target at 30 m with the 55 degree lens is about one pixel.",
    "6. Style: practical and short. Lead with the fix. Numbered list for sequences, max 5 items,",
    "   one line each. Plain words, no marketing, no exclamation marks. Max 160 words.",
    "7. You may add navigation buttons by writing a directive on its own line:",
    "   [[NAV steps 6]] or [[NAV parts]]. Tabs: why, build, parts, steps, career, quiz, limits.",
    "   Use at most two, and only for places you actually referenced."
  ].join("\n");
}

function userPrompt(question, passages, history) {
  const blocks = passages.map((p, i) =>
    "[P" + (i + 1) + "] " + (p.label || "guide passage") +
    (p.tab ? " (tab: " + p.tab + (p.step ? ", step " + p.step : "") + ")" : "") +
    "\n" + String(p.text || "").slice(0, 1400)
  ).join("\n\n");

  const convo = (history || []).slice(-6).map((m) =>
    (m.role === "user" ? "User" : "You") + ": " + String(m.content || "").slice(0, 400)
  ).join("\n");

  return [
    "PASSAGES FROM THE GUIDE:",
    "",
    blocks,
    "",
    convo ? "CONVERSATION SO FAR:\n" + convo + "\n" : "",
    "USER QUESTION: " + question
  ].filter(Boolean).join("\n");
}

/* ---------- provider adapters (streaming) ---------- */
/* Ask OpenAI-compatible providers for the usage frame so the bill is measured
   rather than guessed. stream_options is OpenAI-specific: Ollama and LM Studio
   may reject it, so a 400 naming it is retried once without it. Losing usage
   costs an estimate; losing the answer would cost the feature. */
async function streamOpenAI(messages, onDelta, opts) {
  const o = opts || {};
  const body = {
    model: o.model || CHEAP_MODEL,
    stream: true,
    temperature: 0.2,
    max_tokens: o.maxTokens || MAX_TOKENS,
    stream_options: { include_usage: true },
    messages: messages
  };

  let res = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + (API_KEY || "local")
    },
    body: JSON.stringify(body)
  });
  if (!res.ok && res.status === 400 && body.stream_options) {
    const detail = await res.text().catch(() => "");
    if (/stream_options|unrecognized|unknown|unexpected/i.test(detail)) {
      delete body.stream_options;
      res = await fetch(BASE_URL + "/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + (API_KEY || "local")
        },
        body: JSON.stringify(body)
      });
    } else {
      throw new Error("provider " + res.status + ": " + detail.slice(0, 200));
    }
  }
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error("provider " + res.status + ": " + detail.slice(0, 200));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const step = await reader.read();
    if (step.done) { return; }
    buf += decoder.decode(step.value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) { continue; }
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") { return; }
      try {
        const json = JSON.parse(payload);
        if (json.usage) {
          if (typeof o.onUsage === "function") {
            const details = json.usage.prompt_tokens_details || {};
            o.onUsage({
              inputTokens: Number(json.usage.prompt_tokens || 0),
              cachedTokens: Number(details.cached_tokens || 0),
              outputTokens: Number(json.usage.completion_tokens || 0)
            });
          }
        }
        const choice = json.choices && json.choices[0];
        const piece = choice && choice.delta ? choice.delta.content : "";
        if (piece) { onDelta(piece); }
      } catch (e) { /* keep-alive or split line */ }
    }
  }
}

/* Anthropic adapter. Reports usage too, because cache reads are billed at 0.1x
   input and a guess would hide the saving that makes caching worth doing.
   PROMPT_CACHE=1 marks the system prompt cacheable — worth it only when that
   block clears the provider's minimum cacheable length (1024 tokens for most
   models, 2048 for Haiku 3.5); below that the API accepts it but caches nothing,
   so it is off unless you ask. */
async function streamAnthropic(messages, onDelta, opts) {
  const o = opts || {};
  const rest = messages.slice(1);
  const cacheOn = o.promptCache == null ? ENV.PROMPT_CACHE === "1" : !!o.promptCache;
  const system = cacheOn
    ? [{ type: "text", text: messages[0].content, cache_control: { type: "ephemeral" } }]
    : messages[0].content;
  const usage = { inputTokens: 0, cachedTokens: 0, cacheWriteTokens: 0, outputTokens: 0 };
  const res = await fetch(BASE_URL + "/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: o.model || CHEAP_MODEL, max_tokens: o.maxTokens || MAX_TOKENS, temperature: 0.2,
      system: system, stream: true, messages: rest
    })
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error("provider " + res.status + ": " + detail.slice(0, 200));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const step = await reader.read();
    if (step.done) { return; }
    buf += decoder.decode(step.value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) { continue; }
      try {
        const json = JSON.parse(t.slice(5).trim());
        if (json.type === "content_block_delta" && json.delta && json.delta.text) {
          onDelta(json.delta.text);
        }
        if (json.type === "message_start" && json.message && json.message.usage) {
          const u = json.message.usage;
          usage.inputTokens = Number(u.input_tokens || 0);
          usage.cachedTokens = Number(u.cache_read_input_tokens || 0);
          usage.cacheWriteTokens = Number(u.cache_creation_input_tokens || 0);
        }
        if (json.type === "message_delta" && json.usage && json.usage.output_tokens) {
          usage.outputTokens = Number(json.usage.output_tokens);
        }
        if (json.type === "message_stop") {
          if (typeof o.onUsage === "function") { o.onUsage(usage); }
          return;
        }
      } catch (e) { /* ignore */ }
    }
  }
}

/* ---------- navigation directives ----------------
   The model may ask for a button by writing [[NAV steps 6]]. Those are stripped
   from the prose and handed to the client as buttons, so a model can never
   inject markup or a URL into the page. */
const TABS = ["why", "build", "parts", "steps", "career", "quiz", "limits"];
const TAB_LABEL = {
  why: "What you're building & why", build: "How it works", parts: "Parts & budget",
  steps: "Build steps", career: "Career & pay", quiz: "Quizzes", limits: "Honest limits"
};

function extractNav(text) {
  const see = [];
  const clean = String(text).replace(/\[\[NAV:?\s*([a-z]+)(?:\s+([1-8]))?\s*\]\]/gi, (whole, tab, step) => {
    const t = String(tab || "").toLowerCase();
    if (!TABS.includes(t)) { return ""; }
    const n = step ? Number(step) : null;
    if (see.length < 2) {
      see.push({
        label: n ? "Step " + n : (TAB_LABEL[t] || t),
        tab: t,
        step: n && n >= 1 && n <= 8 ? n : null
      });
    }
    return "";
  }).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text: clean, see: see };
}


/* ======================================================================
   HTTP: static files + /api/health + streaming /api/ask
   ====================================================================== */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

/* The settings shape sent to the page. Deliberately does NOT include the key. */
function settingsPayload() {
  const cap = Number(meter.dailyUsdMax || 0);
  const snap = meter.snapshot();
  return {
    ok: true,
    keyConfigured: !!API_KEY,
    keyHint: API_KEY ? "\u2026" + String(API_KEY).slice(-4) : "",
    provider: PROVIDER,
    baseUrl: BASE_URL,
    cheapModel: CHEAP_MODEL,
    strongModel: STRONG_MODEL,
    preset: presetFor(),
    presets: PRESETS.map(function (p) { return { id: p.id, label: p.label }; }),
    dailyUsdMax: cap,
    budgetMin: BUDGET_MIN,
    budgetMax: BUDGET_MAX,
    /* A research job must never be able to eat the whole day. */
    jobBudgetUsd: Number(Math.min(0.05, Math.max(0.02, cap / 2)).toFixed(3)),
    remainingUsd: snap.remainingUsd,
    spentTodayUsd: snap.totals.usd,
    blocked: snap.blocked,
    local: /127\.0\.0\.1|localhost/.test(BASE_URL)
  };
}

/* Ask the provider whether this key resolves. Never throws: a verification that
   crashes is worse than one that honestly reports "could not check". */
async function verifyKey() {
  if (!API_KEY) { return { ok: true, verified: false, detail: "No key saved yet." }; }
  const url = PROVIDER === "anthropic" ? BASE_URL + "/v1/models" : BASE_URL + "/models";
  try {
    const headers = PROVIDER === "anthropic"
      ? { "x-api-key": API_KEY, "anthropic-version": "2023-06-01" }
      : { authorization: "Bearer " + API_KEY };
    const res = await fetch(url, { method: "GET", headers: headers });
    if (res.ok) { return { ok: true, verified: true, detail: "The provider accepted the key." }; }
    if (res.status === 401 || res.status === 403) {
      return { ok: true, verified: false, detail: "The provider rejected this key (" + res.status + ")." };
    }
    return { ok: true, verified: false, detail: "Could not check (HTTP " + res.status + ")." };
  } catch (e) {
    return { ok: true, verified: false, detail: "Could not reach the provider: " + String(e.message || e) };
  }
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store"
  });
  res.end(body);
}

function serveStatic(req, res) {
  const clean = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const file = path.resolve(REPO, rel);
  /* never serve anything outside the repo */
  if (!file.startsWith(REPO + path.sep) && file !== REPO) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "content-length": stat.size,
      "cache-control": "no-cache"
    });
    fs.createReadStream(file).pipe(res);
  });
}

async function handleAsk(req, res) {
  const ip = req.socket.remoteAddress || "local";
  if (rateLimited(ip)) {
    sendJson(res, 429, { error: "Too many questions. Wait a minute." });
    return;
  }

  let raw = "";
  let tooBig = false;
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 40000) { tooBig = true; req.destroy(); resolve(); }
    });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  if (tooBig) { sendJson(res, 413, { error: "Request too large." }); return; }

  let body;
  try { body = JSON.parse(raw || "{}"); } catch (e) {
    sendJson(res, 400, { error: "Bad JSON." }); return;
  }

  const question = String(body.question || "").trim().slice(0, MAX_QUESTION);
  if (!question) { sendJson(res, 400, { error: "A question is required." }); return; }

  meter.count("questions");

  /* Layer 5, budget guard. Degrade to the page's own offline engine rather than
     spending past the cap. A non-OK status is deliberate: the page treats any
     failure as "answer it yourself", so the assistant keeps working for free. */
  if (meter.blocked()) {
    meter.count("blocked");
    sendJson(res, 402, {
      error: "Daily AI budget reached; answering from the offline engine.",
      budget: meter.snapshot()
    });
    return;
  }

  const rawPassages = (Array.isArray(body.passages) ? body.passages : [])
    .slice(0, MAX_PASSAGES)
    .map((p) => ({
      label: String(p.label || "").slice(0, 160),
      tab: TABS.includes(String(p.tab)) ? String(p.tab) : "",
      step: Number(p.step) || null,
      text: String(p.text || "").slice(0, 1400)
    }))
    .filter((p) => p.text.length > 40);

  if (!rawPassages.length) {
    /* No evidence, no call. This is the anti-hallucination tripwire, and it is
       checked before the cache so a cached answer can never bypass it. */
    sendJson(res, 422, { error: "No guide passages were supplied for that question." });
    return;
  }
  if (!API_KEY && !/127\.0\.0\.1|localhost/.test(BASE_URL)) {
    sendJson(res, 501, { error: "No API key configured. See server/.env.example." });
    return;
  }

  /* Layer 4, compression. The browser sends up to 6 x 1,400 chars; this is what
     decides how many of those characters are actually paid for. */
  const packed = ENGINE.compressPassages(rawPassages, question, {
    perPassageChars: PASSAGE_CHARS,
    totalChars: PASSAGE_TOTAL,
    maxCount: PASSAGE_COUNT
  });
  const passages = packed.passages.length ? packed.passages : rawPassages.slice(0, 1);

  /* The page pushes the current question onto history before asking, so the
     last entry is this question and must not be sent back as context. */
  const prior = (Array.isArray(body.history) ? body.history : []).slice(0, -1);
  const history = ENGINE.compressHistory(prior, { keepTurns: HISTORY_TURNS, charCap: 400 });

  /* Layer 2, routing. Cheap unless the question earns the strong model. */
  const curatedHit = body.curated === true;
  const decision = ENGINE.routeDecision({
    question: question,
    curatedHit: curatedHit,
    topScore: Number(body.topScore || 0),
    forceStrong: body.strong === true
  });
  let model = decision.tier === "strong" ? STRONG_MODEL : CHEAP_MODEL;

  const messages = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: userPrompt(question, passages, history) }
  ];

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });
  const send = (obj) => res.write("data: " + JSON.stringify(obj) + "\n\n");

  /* Layer 1, the cache. A question already answered is replayed, not re-bought.
     Checked after the 422 tripwire so a cached answer cannot dodge the rule that
     no evidence means no answer. */
  const cached = cache.get(question);
  if (cached) {
    meter.count("cacheHits");
    send({ type: "delta", text: cached.answer });
    send({
      type: "meta",
      sources: cached.sources.length ? cached.sources : ["Retrieved from this guide"],
      see: cached.see,
      model: cached.model || "cache",
      cached: true,
      cost: 0,
      tier: "cache",
      reason: "answered before"
    });
    send({ type: "done" });
    res.end();
    return;
  }

  /* Some compatible providers (Ollama, LM Studio) report no usage at all. Rather
     than claim a cost of zero, fall back to ~4 chars per token and say so. */
  const approxTokens = (text) => Math.max(0, Math.round(String(text || "").length / 4));
  const fallbackUsage = (msgs, out) => ({
    inputTokens: approxTokens(msgs.map((m) => m.content).join(" ")),
    cachedTokens: 0,
    outputTokens: approxTokens(out)
  });

  /* One call to one model. `live` decides whether the user watches it arrive:
     a speculative escalation must not be shown until it wins. */
  const callStream = async (msgs, name, live) => {
    let text = "";
    let usage = null;
    const onDelta = (piece) => {
      text += piece;
      if (live) { send({ type: "delta", text: piece }); }
    };
    const onUsage = (u) => { usage = u; };
    if (PROVIDER === "anthropic") {
      await streamAnthropic(msgs, onDelta, { model: name, onUsage: onUsage });
    } else {
      await streamOpenAI(msgs, onDelta, { model: name, onUsage: onUsage });
    }
    return { text: text, usage: usage };
  };

  const REFUSAL = /that is not in this guide/i;
  let spent = 0;

  try {
    const first = await callStream(messages, model, true);
    spent += meter.record(model, first.usage || fallbackUsage(messages, first.text));
    let full = first.text;

    /* Escalation, bounded to one retry and only when a second model is actually
       configured. The cheap answer has already streamed, so a better one is
       swapped in with `replace` rather than shown as a second message. */
    if (canEscalate() && decision.tier === "cheap" && REFUSAL.test(full)) {
      meter.count("escalated");
      try {
        const second = await callStream(messages, STRONG_MODEL, false);
        spent += meter.record(STRONG_MODEL, second.usage || fallbackUsage(messages, second.text));
        if (second.text && !REFUSAL.test(second.text)) {
          full = second.text;
          model = STRONG_MODEL;
          send({ type: "replace", text: extractNav(full).text });
        }
      } catch (e) { /* the cheap answer stands; the escalation was a bonus */ }
    }

    const nav = extractNav(full);
    if (nav.text !== full) { send({ type: "replace", text: nav.text }); }

    send({
      type: "meta",
      sources: ["Retrieved from this guide"],
      see: nav.see,
      model: model,
      cached: false,
      cost: Number(spent.toFixed(6)),
      tier: decision.tier,
      reason: decision.reason,
      compressedChars: packed.savedChars,
      estimated: !first.usage
    });
    send({ type: "done" });

    /* Never cache a refusal: "not in this guide" is exactly the answer that
       deserves a second opinion next time, not a stored verdict. */
    if (!REFUSAL.test(nav.text)) {
      cache.set(question, {
        answer: nav.text,
        model: model,
        sources: ["Retrieved from this guide"],
        see: nav.see,
        usd: spent
      });
    }
  } catch (err) {
    send({ type: "error", error: String(err && err.message ? err.message : err).slice(0, 300) });
  } finally {
    res.end();
  }
}

const server = http.createServer((req, res) => {
  const u = (req.url || "/").split("?")[0];

  /* ---------- settings: the key and the daily cap, set from the page ----------
     Guarded three ways: the server binds loopback, the JSON content type forces a
     preflight that this server never approves (so a hostile page cannot POST),
     and a same-origin check rejects a mismatched Origin. The response never
     contains the key — only whether one is set and its last four characters. */
  if (u === "/api/settings") {
    if (req.method === "GET") { sendJson(res, 200, settingsPayload()); return; }
    if (req.method !== "POST") { sendJson(res, 405, { error: "GET or POST." }); return; }

    const origin = String(req.headers.origin || "");
    const host = String(req.headers.host || "");
    const type = String(req.headers["content-type"] || "");
    if (type.indexOf("application/json") === -1) {
      sendJson(res, 415, { error: "Send application/json." }); return;
    }
    if (origin && host && origin.replace(/^https?:\/\//, "") !== host) {
      sendJson(res, 403, { error: "Cross-origin settings change refused." }); return;
    }

    let raw = "";
    let tooBig = false;
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 8000) { tooBig = true; req.destroy(); }
    });
    req.on("end", () => {
      if (tooBig) { sendJson(res, 413, { error: "Body too large." }); return; }
      let body;
      try { body = JSON.parse(raw || "{}"); } catch (e) {
        sendJson(res, 400, { error: "Bad JSON." }); return;
      }

      const patch = {};
      if (typeof body.preset === "string" && body.preset) {
        const applied = applyPreset(body.preset);
        if (!applied) {
          sendJson(res, 400, { error: 'unknown provider preset "' + body.preset + '"' });
          return;
        }
        patch.provider = applied.kind;
        patch.baseUrl = applied.baseUrl;
        patch.cheapModel = applied.cheap;
        patch.strongModel = applied.strong;
      }
      if (typeof body.apiKey === "string") {
        const key = body.apiKey.trim();
        if (key && key.length < 8) {
          sendJson(res, 400, { error: "That key looks too short to be real." }); return;
        }
        patch.apiKey = key; /* an empty string clears it */
        API_KEY = key;
      }
      if (body.dailyUsdMax != null) {
        const n = Number(body.dailyUsdMax);
        if (!Number.isFinite(n)) {
          sendJson(res, 400, { error: "The daily budget must be a number." }); return;
        }
        /* Clamped, not rejected: a slider can only send values in range, so an
           out-of-range number means someone hand-rolled a request. */
        const clamped = Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, n));
        patch.dailyUsdMax = Number(clamped.toFixed(2));
        meter.dailyUsdMax = patch.dailyUsdMax;
      }
      try { writeSettings(patch); } catch (e) {
        sendJson(res, 500, { error: "Could not save settings: " + String(e.message || e) });
        return;
      }

      sendJson(res, 200, settingsPayload());
    });
    return;
  }

  /* Optional: prove the key works before trusting it. Only runs when asked, so a
     normal save costs nothing. */
  if (u === "/api/settings/verify" && req.method === "POST") {
    verifyKey().then((result) => sendJson(res, 200, result));
    return;
  }

  if (u === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      provider: PROVIDER,
      model: MODEL,
      cheapModel: CHEAP_MODEL,
      strongModel: STRONG_MODEL,
      canEscalate: canEscalate(),
      baseUrl: BASE_URL,
      keyConfigured: !!API_KEY,
      local: /127\.0\.0\.1|localhost/.test(BASE_URL),
      budget: meter.blocked() ? "reached" : "ok",
      cacheEntries: cache.stats().entries
    });
    return;
  }

  /* What today has cost, and how much of it was free. This is the number that
     makes "very low" verifiable instead of hopeful. */
  if (u === "/api/stats") {
    sendJson(res, 200, { ok: true, cost: meter.snapshot(), cache: cache.stats() });
    return;
  }

  /* Test-only: scripts/dev/check-llm-path.ps1 has the page report what it
     actually rendered. Disabled unless the server is started with GA_TEST=1. */
  if (u === "/api/probe") {
    if (process.env.GA_TEST !== "1") { sendJson(res, 404, { error: "not found" }); return; }
    if (req.method === "GET") { sendJson(res, 200, { probe: lastProbe }); return; }
    if (req.method !== "POST") { sendJson(res, 405, { error: "GET or POST" }); return; }
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      try { lastProbe = JSON.parse(raw); } catch (e) { lastProbe = { error: "bad json" }; }
      sendJson(res, 200, { ok: true });
    });
    return;
  }

  if (u === "/api/ask" && req.method === "POST") { handleAsk(req, res); return; }
  if (u === "/api/ask") { sendJson(res, 405, { error: "POST only." }); return; }
  serveStatic(req, res);
});

/* Persist the cache on the way out: a Ctrl-C should not cost the answers that
   were already paid for. */
process.on("exit", () => { cache.flush(); });
process.on("SIGINT", () => { cache.flush(); process.exit(0); });

server.listen(PORT, "127.0.0.1", () => {
  const keyState = API_KEY ? "set" : (/(127\.0\.0\.1|localhost)/.test(BASE_URL) ? "not needed (local model)" : "MISSING");
  console.log("");
  console.log("  Guide Assistant server");
  console.log("  → http://localhost:" + PORT + "/            (the guide, with a live assistant)");
  console.log("  → http://localhost:" + PORT + "/api/health  (what the assistant is using)");
  console.log("");
  console.log("  provider : " + PROVIDER);
  console.log("  model    : " + MODEL);
  console.log("  cheap    : " + CHEAP_MODEL);
  console.log("  strong   : " + STRONG_MODEL + (canEscalate() ? "" : "   (no escalation; set STRONG_MODEL to enable)"));
  console.log("  budget   : " + (DAILY_USD_MAX > 0 ? "$" + DAILY_USD_MAX + "/day" : "no cap (set DAILY_USD_MAX)"));
  console.log("  cache    : " + (CACHE_OFF ? "off" : CACHE_FILE + "  (" + cache.stats().entries + " entries)"));
  console.log("  base url : " + BASE_URL);
  console.log("  api key  : " + keyState);
  if (keyState === "MISSING") {
    console.log("");
    console.log("  No key yet: the page will answer from its offline engine.");
    console.log("  Copy server/.env.example to server/.env and add a key (or run a local model).");
  }
  console.log("");
});



