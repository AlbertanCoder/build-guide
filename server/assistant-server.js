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
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const ENGINE = require("./cost-engine.js");
const QUIZ = require("./ops/quiz-add.js");
const PROSE = require("./ops/prose-rewrite.js");
const JOBSPEC = require("./ops/job-spec.js");
const DRAFT = require("./ops/draft.js");
const SUGGEST = require("./ops/suggest.js");
const PROPOSE = require("./ops/propose.js");
const CORRECTION = require("./ops/correction-add.js");
const BANS = require("./bans.js");
const RENDER = require("./ops/render.js");

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
const BIND = String(ENV.BIND || "127.0.0.1");

/* Decision 14's three write gates: a loopback-only bind (the default — the
   machine itself is the gate), a token in server/.env, and an explicit
   --allow-write flag. On a loopback bind nothing else is needed; anywhere the
   server is REACHABLE (a VPS on a tailnet), the other two gates are mandatory,
   and each one alone is enough to stop an accident. */
const WRITE_TOKEN = String(ENV.GA_WRITE_TOKEN || "");
const ALLOW_WRITE = process.argv.includes("--allow-write") || ENV.ALLOW_WRITE === "1";
const REMOTE = !/^(127\.0\.0\.1|localhost|::1)$/.test(BIND);

function writeGate(req) {
  if (!REMOTE) { return { ok: true }; }
  if (!ALLOW_WRITE) {
    return { ok: false, status: 403, error: "write is disabled on this server; start it with --allow-write to enable it" };
  }
  if (!WRITE_TOKEN) {
    return { ok: false, status: 403, error: "no write token configured; set GA_WRITE_TOKEN in server/.env" };
  }
  const auth = String(req.headers.authorization || "");
  const got = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : String(req.headers["x-write-token"] || "");
  if (got !== WRITE_TOKEN) {
    return { ok: false, status: 401, error: "write token missing or wrong" };
  }
  return { ok: true };
}
/* Which Host header this server answers to. A web page on another site can make
   the browser point its own name at 127.0.0.1 ("DNS rebinding"); its requests then
   arrive with that site's name in the Host header. Refusing every Host that is not
   this machine stops it reading files or calling the API that way. A remote bind
   adds its own address; ALLOWED_HOSTS (comma-separated) adds names such as a
   tailnet DNS name. */
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]
  .concat(/^(0\.0\.0\.0|::)$/.test(BIND) ? [] : [BIND.toLowerCase()])
  .concat(String(ENV.ALLOWED_HOSTS || "").split(",").map(function (h) { return h.trim().toLowerCase(); }).filter(Boolean)));
function hostAllowed(req) {
  const h = String(req.headers.host || "");
  if (!h) { return true; } /* only non-browser HTTP/1.0 clients omit Host; browsers always send it */
  const name = h.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  return ALLOWED_HOSTS.has(name);
}
/* A write from another site: browsers send Origin on every cross-site POST, and
   Sec-Fetch-Site says where a request came from. */
function crossSite(req) {
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (String(req.headers["sec-fetch-site"] || "") === "cross-site") { return true; }
  return !!(origin && host && origin.replace(/^https?:\/\//, "") !== host);
}
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

/* 3D views have their own model and thinking effort: placing parts in space
   is harder than answering from text, so it is worth a stronger model there
   even when answers run on a cheap one. Empty model = use the answer model. */
let RENDER_MODEL = SETTINGS.renderModel || ENV.RENDER_MODEL || "";
let RENDER_EFFORT = SETTINGS.renderEffort || ENV.RENDER_EFFORT || "medium";
let BLENDER_PATH = SETTINGS.blenderPath || ENV.BLENDER || "";
const RENDER_SUGGESTED = "anthropic/claude-sonnet-5.5";

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
    cheap: "anthropic/claude-haiku-5.5", strong: "anthropic/claude-sonnet-5.5" },
  /* deepseek-flash: the cheaper of the two models on DeepSeek's own pricing page (checked 2026-11-03) */
  { id: "deepseek", label: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1",
    cheap: "deepseek-flash", strong: "deepseek-flash" },
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
/* Fable audit S4 (10 Nov 2026): 6 -> 12 passages and 700 -> 1500 answer tokens. With 6 x 1,400 offered, 3 x 600 kept
   and 700 tokens (which this model also spends on thinking), the chat said "That is not in this guide" for facts
   written on the open step and stopped answers mid-sentence (5 of 14 page-fact questions right). */
const MAX_PASSAGES = 12;
const MAX_TOKENS = 1500;
const EMPTY_RETRY_TOKENS = 2000;      /* the second try after an empty answer (4 Nov 2026) */

/* The guide's fingerprint, part of every answer-cache key: when the page or the domain pack changes, answers saved
   about the old text are never replayed (4 Nov 2026: Shad was served a 2 Nov answer with an old total). */
let guideStampMemo = { key: "", stamp: "" };
function guideStamp() {
  try {
    const files = ["index.html", "docs/js/domain.js"].map((f) => path.join(__dirname, "..", f));
    const key = files.map((f) => fs.statSync(f).mtimeMs + ":" + fs.statSync(f).size).join("|");
    if (key !== guideStampMemo.key) {
      const h = require("crypto").createHash("sha256");
      files.forEach((f) => h.update(fs.readFileSync(f)));
      guideStampMemo = { key: key, stamp: h.digest("hex").slice(0, 12) };
    }
    return guideStampMemo.stamp;
  } catch (e) { return "no-guide"; }
}
/* Passage budget after compression. The browser sends up to 12 x 1,400 chars;
   these caps are what actually decides how many tokens get paid for.
   Fable audit S4 (10 Nov 2026): 600 / 2,600 / 3 -> 1,400 / 16,000 / 12. The old caps left the model about 1,800
   characters of the guide per question: a long step's facts never reached it. About 3,000 tokens of context costs a
   small fraction of a cent on the cheap tier; set the three numbers in server/.env to pay less. */
const PASSAGE_CHARS = Number(ENV.PASSAGE_CHARS || 1400);
const PASSAGE_TOTAL = Number(ENV.PASSAGE_TOTAL || 16000);
const PASSAGE_COUNT = Number(ENV.PASSAGE_COUNT || 12);
const HISTORY_TURNS = Number(ENV.HISTORY_TURNS || 2);

/* Cost control. DAILY_USD_MAX=0 means no cap; set it and the server degrades to
   the page's offline engine instead of spending past it. */
const TEST_MODE = ENV.GA_TEST === "1";
const DAILY_USD_MAX = Number(SETTINGS.dailyUsdMax || ENV.DAILY_USD_MAX || 0);
const CACHE_OFF = String(ENV.CACHE || "").toLowerCase() === "off";
const CACHE_FILE = ENV.CACHE_FILE || path.join(__dirname, ".cache", "answers.json");
const meter = new ENGINE.CostMeter({ dailyUsdMax: DAILY_USD_MAX });

/* ---------- job 8 (2026-11-03): memory, the monthly cap, phone access ----------
   What the assistant remembers lives in server/.memory/ (memory.js); nothing goes to the cloud except the
   question itself, to the AI provider. The monthly cap is kept here, on the server, so the page cannot raise it. */
const MEMORY = require("./memory.js");
const MEMORY_DIR = ENV.MEMORY_DIR || path.join(__dirname, ".memory");
const MEM = MEMORY.createMemory({ dir: MEMORY_DIR });
const MONTHLY_MIN = 0.5, MONTHLY_MAX = 20;          /* USD per month the settings may choose between */
let MONTHLY_USD_MAX = Number(SETTINGS.monthlyUsdMax != null ? SETTINGS.monthlyUsdMax : (ENV.MONTHLY_USD_MAX || 2));
function monthState() { const s = MEM.spend.get(); return { month: s.month, usd: s.usd, cap: MONTHLY_USD_MAX, blocked: MEM.spend.blocked(MONTHLY_USD_MAX) }; }
/* the company the questions go to, named from the provider's address (shown in the chat's Settings) */
function providerHost() {
  try { return new URL(BASE_URL).hostname.replace(/^api\./, ""); } catch (e) { return String(PROVIDER); }
}

/* Phone access: a SECOND listener on the laptop's home-network address, off by default. Every /api request
   that arrives on it needs a paired device's token; its Host must be that address; cross-site is refused;
   laptop-only routes (settings, pairing codes, edits, review) are refused outright. */
const os = require("os");
function lanAddress() {
  if (ENV.PHONE_BIND) { return ENV.PHONE_BIND; }     /* tests: a second loopback address stands in for the home network */
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if ((n.family === "IPv4" || n.family === 4) && !n.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)) { return n.address; }
    }
  }
  return null;
}
let phoneServer = null, phoneAddr = null;
function phoneUrl() { return phoneAddr ? "http://" + phoneAddr + ":" + PORT + "/" : null; }
const PHONE_ROUTES = /^\/api\/(health|ask|stats|progress|memory(\/[a-f0-9]{6,16})?|conversations(\/[^/]+)?)$/;
function phoneGate(req, res) {
  const u = (req.url || "/").split("?")[0];
  const host = String(req.headers.host || "").toLowerCase();
  if (!phoneAddr || (host !== phoneAddr && host !== phoneAddr + ":" + PORT)) {
    sendJson(res, 403, { error: "Wrong address for this server." }); return false;
  }
  if (crossSite(req)) { sendJson(res, 403, { error: "Cross-site request refused." }); return false; }
  if (u === "/api/pair") { return true; }             /* the one route a phone may use before it is paired */
  if (u.indexOf("/api/") === 0) {
    if (!PHONE_ROUTES.test(u)) { sendJson(res, 403, { error: "That only works on the laptop." }); return false; }
    const dev = MEM.devices.verify(String(req.headers["x-device-token"] || ""));
    if (!dev) { sendJson(res, 401, { error: "This phone is not paired yet.", pair: true }); return false; }
    req.device = dev;
    return true;
  }
  if (u === "/review" || u.indexOf("/proposals/") === 0) { sendJson(res, 403, { error: "That only works on the laptop." }); return false; }
  return true;                                        /* the guide's own files (the deny list in serveStatic still applies) */
}
function setPhoneAccess(on) {
  return new Promise(function (resolve) {
    if (!on) {
      if (!phoneServer) { resolve({ on: false }); return; }
      const s = phoneServer; phoneServer = null; phoneAddr = null;
      s.close(function () { resolve({ on: false }); });
      if (s.closeAllConnections) { s.closeAllConnections(); }
      return;
    }
    if (phoneServer) { resolve({ on: true, url: phoneUrl() }); return; }
    if (REMOTE) { resolve({ on: false, error: "Phone access is for a server bound to this laptop only." }); return; }
    const addr = lanAddress();
    if (!addr) { resolve({ on: false, error: "No home-network address found: is the laptop on Wi-Fi?" }); return; }
    const s = http.createServer(function (req, res) { req.fromPhone = true; if (phoneGate(req, res)) { route(req, res); } });
    s.once("error", function (e) { resolve({ on: false, error: "Could not open phone access: " + String(e.code || e.message || e) }); });
    s.listen(PORT, addr, function () { phoneServer = s; phoneAddr = addr; resolve({ on: true, url: phoneUrl() }); });
  });
}
/* a small JSON body (POST/DELETE): null when it is too big or not JSON */
function readJson(req, max) {
  return new Promise(function (resolve) {
    let raw = "", big = false;
    req.on("data", function (c) { raw += c; if (raw.length > max) { big = true; req.destroy(); resolve(null); } });
    req.on("end", function () { if (big) { return; } try { resolve(JSON.parse(raw || "{}")); } catch (e) { resolve(null); } });
    req.on("error", function () { resolve(null); });
  });
}
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
    "1. Answer from the PASSAGES provided first. They are excerpts from the guide itself plus",
    "   curated troubleshooting entries written for this exact build.",
    "2. Never invent a part number, price, fee or regulation. If a passage states a number you",
    "   may repeat it and attribute it. If no passage states it, say what the guide does say.",
    "   Any price, cost or fee you state must carry the date the guide checked it, written",
    "   like \"(checked <the date in that passage>)\", in the same answer. If no passage gives",
    "   that date, leave the number out and point to the Parts tab.",
    "3. If the passages do not answer the question, first line exactly: That is not in this guide.",
    "   Then say in one sentence what the user could check instead. Never guess.",
    "   If the question is general (programming, electronics concepts, tools, learning, how-to),",
    "   you may then add a short answer under a line that reads exactly:",
    "   General knowledge, not from this guide:",
    "   Never use general knowledge for part numbers, prices, fees, regulations, flight-safety",
    "   limits or detection performance. A greeting or \"can you help me\" gets one or two",
    "   sentences on what you can help with, drawn from the passages.",
  "3b. Corrections on file (passages labelled \"Correction on file\") supersede the guide: when one disagrees with a guide passage, show both and say the correction is authoritative for this build.",
    "4. Safety before cleverness: props off for any configuration, never charge a LiPo",
    "   unattended, never power a VTX without its antenna, sensors are 3.3V only, CAR 601.15",
    "   keeps you away from wildfires, Basic operations keeps you more than 30 m from anyone.",
    "5. Never claim measured detection performance. Sampling geometry is not detection proof:",
    "   a 1 m target at 30 m with the 55 degree lens is about one pixel.",
    "6. Style: practical and short. Lead with the fix. Numbered list for sequences, max 5 items,",
    "   one line each. Plain words, no marketing, no exclamation marks. Max 160 words.",
    "   When the user asks for more detail, up to 400 words.",
    "7. You may add navigation buttons by writing a directive on its own line:",
    "   [[NAV steps 6]] or [[NAV parts]]. Tabs: why, build, parts, steps, quiz.",
    "   Use at most two, and only for places you actually referenced.",
    "8. WHERE SHAD IS and WHAT SHAD HAS TOLD YOU, when given, describe this user's own build. Answer for",
    "   his current step and his parts, and say which step you mean. Do not repeat advice he has already",
    "   acted on. A generic, FAQ-style answer is a failure when you know his step.",
    "   Say where he is in the build only when he asks what to do next or where he is, or when the answer",
    "   really depends on it. Do not end other answers with a reminder of his stage.",
    "   THE STEP OPEN ON HIS SCREEN, when given, is the step he is reading: \"this step\" means that step.",
    "   Passages labelled as that step, or as where he is, come in parts: read every part before you say",
    "   something is not in the guide.",
    "9. Memory: when the user tells you a lasting fact about his build (a part arrived or is missing, a tool",
    "   he has or lacks, a problem he hit, a preference), add at most two lines at the very end, each exactly",
    "   [[REMEMBER the fact in plain words]]. Never remember keys, passwords, addresses, emails, phone",
    "   numbers or other people's names. Do not mention these lines.",
    "   Remember only what he clearly said, not what you infer from it: \"I have stage 1 and 3\" means those",
    "   parcels arrived, not that their practice is done. If a message could mean two things, ask him instead",
    "   of remembering it, and do not tell him to tick anything he has not said he finished."
  ].join("\n");
}

function userPrompt(question, passages, history, extra) {
  extra = extra || {};
  const c = extra.context || {};
  const where = c.stageText
    ? ["WHERE SHAD IS IN THE BUILD:", c.stageText + " (he is still buying and practising; the build steps come later)"].join("\n")
    : c.step
    ? ["WHERE SHAD IS IN THE BUILD:",
      "Step " + c.step + (c.stepTitle ? ": " + c.stepTitle : "") + " (" + (c.done && c.done.length ? "steps done: " + c.done.join(", ") : "no steps ticked yet") + ")",
      c.next && c.next.length ? "Next on this step: " + c.next.join("; ") : ""].filter(Boolean).join("\n")
    : "";
  const onScreen = c.openStep
    ? "THE STEP OPEN ON HIS SCREEN: Step " + c.openStep + (c.openTitle ? ": " + c.openTitle : "") + " (when he says \"this step\", he means this one)"
    : "";
  const told = extra.facts && extra.facts.length
    ? "WHAT SHAD HAS TOLD YOU (remembered on his laptop):\n" + extra.facts.map(function (f) { return "- " + f.text; }).join("\n")
    : "";
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
    where ? where + "\n" : "",
    onScreen ? onScreen + "\n" : "",
    told ? told + "\n" : "",
    convo ? "CONVERSATION SO FAR:\n" + convo + "\n" : "",
    extra.detail ? "The user asked for more detail this time." : "",
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
    /* a retry after an empty answer: on OpenRouter ask for low reasoning so the budget goes to the answer */
    ...(o.lowReasoning && /openrouter\.ai/i.test(BASE_URL) ? { reasoning: { effort: "low" } } : {}),
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
        if (choice && typeof o.onFinish === "function") {
          const d = choice.delta || {};
          o.onFinish(choice.finish_reason || "", String(d.reasoning || d.reasoning_content || "").length);
        }
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
const TABS = ["why", "build", "parts", "steps", "quiz"];
const TAB_LABEL = {
  why: "Learn: What it is, and why", build: "Learn: How it works", parts: "Parts & budget",
  steps: "Build steps", quiz: "Learn: Prove it"
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
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
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
    presets: PRESETS.map(function (p) {
      return { id: p.id, label: p.label, models: p.cheap === p.strong ? [p.cheap] : [p.strong, p.cheap] };
    }),
    dailyUsdMax: cap,
    budgetMin: BUDGET_MIN,
    budgetMax: BUDGET_MAX,
    /* job 8: the hard monthly cap, this month's spend, and the company the questions go to */
    monthlyUsdMax: MONTHLY_USD_MAX,
    monthlyMin: MONTHLY_MIN,
    monthlyMax: MONTHLY_MAX,
    month: monthState(),
    sendsTo: providerHost(),
    /* A research job must never be able to eat the whole day. */
    jobBudgetUsd: Number(Math.min(0.05, Math.max(0.02, cap / 2)).toFixed(3)),
    remainingUsd: snap.remainingUsd,
    spentTodayUsd: snap.totals.usd,
    blocked: snap.blocked,
    local: /127\.0\.0\.1|localhost/.test(BASE_URL),
    renderModel: RENDER_MODEL,
    renderModelInUse: RENDER_MODEL || CHEAP_MODEL,
    renderSuggested: /openrouter\.ai/.test(BASE_URL) ? RENDER_SUGGESTED
      : (PRESETS.find((p) => p.id === presetFor()) || {}).strong || "",
    renderEffort: RENDER_EFFORT,
    efforts: EFFORTS,
    effortSupported: !!effortStyle(),
    blenderPath: RENDER.findBlender(BLENDER_PATH)
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

/* The models this key can use, straight from the provider's model list (a free
   call, no tokens). Kept ten minutes per provider + key so opening the drawer
   does not hit the provider every time. Never throws. */
let modelListCache = { sig: "", at: 0, ids: [] };
async function listModels() {
  const local = /127\.0\.0\.1|localhost/.test(BASE_URL);
  if (TEST_MODE || (!API_KEY && !local)) { return { ids: [], detail: API_KEY ? "" : "No key saved yet." }; }
  const sig = PROVIDER + "|" + BASE_URL + "|" + API_KEY.slice(-6);
  if (modelListCache.sig === sig && Date.now() - modelListCache.at < 10 * 60 * 1000) {
    return { ids: modelListCache.ids, detail: "" };
  }
  const url = PROVIDER === "anthropic" ? BASE_URL + "/v1/models?limit=1000" : BASE_URL + "/models";
  try {
    const headers = PROVIDER === "anthropic"
      ? { "x-api-key": API_KEY, "anthropic-version": "2023-06-01" }
      : { authorization: "Bearer " + (API_KEY || "local") };
    const res = await fetch(url, { method: "GET", headers: headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) { return { ids: [], detail: "The provider did not list its models (HTTP " + res.status + ")." }; }
    const j = await res.json();
    const ids = Array.from(new Set((Array.isArray(j.data) ? j.data : [])
      .map(function (m) { return m && typeof m.id === "string" ? m.id.slice(0, 120) : ""; })
      .filter(Boolean))).sort();
    modelListCache = { sig: sig, at: Date.now(), ids: ids };
    return { ids: ids, detail: "" };
  } catch (e) {
    return { ids: [], detail: "Could not reach the provider: " + String(e.message || e).slice(0, 200) };
  }
}

/* One non-streaming call, used by the drafter. Streaming is for answers; a
   drafting job wants the whole JSON array before it does anything. */
/* Thinking effort, for the providers whose API takes one. The token figures
   are the Anthropic thinking budgets; the others take the word itself. */
const EFFORTS = ["off", "low", "medium", "high"];
const THINK_BUDGET = { low: 2048, medium: 6000, high: 12000 };
function effortStyle() {
  if (PROVIDER === "anthropic") { return "anthropic"; }
  if (/openrouter\.ai/.test(BASE_URL)) { return "openrouter"; }
  if (/api\.openai\.com/.test(BASE_URL)) { return "openai"; }
  return "";
}

async function askOnce(prompt, opts) {
  opts = opts || {};
  const model = opts.model || CHEAP_MODEL;
  const effort = EFFORTS.indexOf(opts.effort) > 0 ? opts.effort : "";
  const style = effort ? effortStyle() : "";
  const maxTokens = opts.maxTokens || 1500;
  if (!API_KEY && !/127\.0\.0\.1|localhost/.test(BASE_URL)) {
    throw new Error("no API key yet — open the gear in the panel and add one");
  }
  if (PROVIDER === "anthropic") {
    const body = { model: model, max_tokens: maxTokens, temperature: 0.4, messages: [{ role: "user", content: prompt }] };
    if (style === "anthropic") {
      body.thinking = { type: "enabled", budget_tokens: THINK_BUDGET[effort] };
      body.max_tokens = maxTokens + THINK_BUDGET[effort];
      delete body.temperature;
    }
    const res = await fetch(BASE_URL + "/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body)
    });
    if (!res.ok) { throw new Error("provider " + res.status + ": " + (await res.text()).slice(0, 180)); }
    const json = await res.json();
    if (json.usage) { meter.record(model, { inputTokens: json.usage.input_tokens || 0, outputTokens: json.usage.output_tokens || 0 }); }
    const block = (json.content || []).find((b) => b.type === "text");
    return block ? block.text : "";
  }
  const body = { model: model, temperature: 0.4, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] };
  if (style === "openrouter") {
    body.reasoning = { effort: effort };
    body.max_tokens = maxTokens + THINK_BUDGET[effort];
  } else if (style === "openai") {
    body.reasoning_effort = effort;
    body.max_completion_tokens = maxTokens + THINK_BUDGET[effort];
    delete body.max_tokens;
    delete body.temperature;
  }
  const res = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + (API_KEY || "local") },
    body: JSON.stringify(body)
  });
  if (!res.ok) { throw new Error("provider " + res.status + ": " + (await res.text()).slice(0, 180)); }
  const json = await res.json();
  if (json.usage) {
    meter.record(model, {
      inputTokens: json.usage.prompt_tokens || 0,
      outputTokens: json.usage.completion_tokens || 0
    });
  }
  const choice = json.choices && json.choices[0];
  return (choice && choice.message && choice.message.content) || "";
}

/* The evidence the drafter is allowed to use: the curated domain pages, one block
   per heading. Small enough to send whole, and every block is already sourced. */
function domainPassages() {
  const dir = path.join(REPO, "docs", "domain");
  const out = [];
  if (!fs.existsSync(dir)) { return out; }
  fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().forEach((file) => {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    text.split(/\n(?=##\s)/).forEach((block) => {
      const trimmed = block.trim();
      if (!trimmed || trimmed.indexOf("## ") !== 0) { return; }
      const heading = trimmed.split(/\r?\n/)[0].replace(/^##\s*/, "").slice(0, 80);
      out.push({ label: file.replace(/\.md$/, "") + " — " + heading, text: trimmed.slice(0, 900) });
    });
  });
  return out;
}

function hasJsonMediaType(req) {
  const type = String(req.headers["content-type"] || "");
  return type.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

/** POST /api/suggest — cited judgement and a candidate, but never a write. */
/* 3D explainer views. The AI returns a scene plan (data), RENDER.checkPlan
   keeps only allow-listed parts and numbers, and Blender builds it with the
   fixed scripts/build/build_from_plan.py. One build at a time; old views are
   pruned so the folder cannot grow without bound. */
const RENDERS_DIR = ENV.RENDERS_DIR || path.join(__dirname, ".renders");
const RENDERS_KEPT = 30;
let renderBusy = false;

function pruneRenders() {
  try {
    const dirs = fs.readdirSync(RENDERS_DIR)
      .map((d) => ({ d: d, t: fs.statSync(path.join(RENDERS_DIR, d)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    dirs.slice(RENDERS_KEPT).forEach((x) => fs.rmSync(path.join(RENDERS_DIR, x.d), { recursive: true, force: true }));
  } catch (e) { /* nothing to prune */ }
}

async function handleRender(req, res) {
  const ip = req.socket.remoteAddress || "local";
  if (rateLimited(ip)) { sendJson(res, 429, { error: "Too many requests. Wait a minute." }); return; }
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (!hasJsonMediaType(req)) { sendJson(res, 415, { error: "Send application/json." }); return; }
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) {
    sendJson(res, 403, { error: "Cross-origin 3D request refused." }); return;
  }
  let raw = "";
  let tooBig = false;
  await new Promise((resolve) => {
    req.on("data", (chunk) => { if (raw.length + chunk.length > 16384) { tooBig = true; } else { raw += chunk; } });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  if (tooBig) { sendJson(res, 413, { error: "Request too large; the limit is 16 KiB." }); return; }
  let body;
  try { body = JSON.parse(raw || "{}"); } catch (e) { sendJson(res, 400, { error: "Bad JSON." }); return; }
  const request = body && typeof body.request === "string" ? body.request.trim().slice(0, RENDER.MAX_REQUEST) : "";
  const context = body && typeof body.context === "string" ? body.context.trim().slice(0, RENDER.MAX_CONTEXT) : "";
  if (!request) { sendJson(res, 400, { error: "Say what you want to see." }); return; }

  const blender = RENDER.findBlender(BLENDER_PATH);
  if (!blender) {
    sendJson(res, 501, { error: "Blender is not installed, so 3D views cannot be made. Install it free from blender.org, or set its path in Settings." });
    return;
  }
  if (meter.blocked()) {
    sendJson(res, 402, { error: "the daily budget is spent, so no 3D views until it resets", budget: meter.snapshot() }); return;
  }
  if (!API_KEY && !/127\.0\.0\.1|localhost/.test(BASE_URL)) {
    sendJson(res, 501, { error: "no API key yet — open the gear in the panel and add one" }); return;
  }
  if (renderBusy) { sendJson(res, 429, { error: "A 3D view is already being made. Wait for it to finish." }); return; }
  renderBusy = true;
  meter.count("renders");
  try {
    const ask = (prompt) => askOnce(prompt, { model: RENDER_MODEL || CHEAP_MODEL, effort: RENDER_EFFORT, maxTokens: 3000 });
    let checked = RENDER.checkPlan(RENDER.extractJson(await ask(RENDER.buildPrompt({ request: request, context: context }))));
    if (checked.errors.length) {
      checked = RENDER.checkPlan(RENDER.extractJson(await ask(RENDER.buildPrompt({ request: request, context: context }, checked.errors.slice(0, 12)))));
    }
    if (!checked.plan || (!checked.plan.parts.length && !checked.plan.shapes.length)) {
      sendJson(res, 422, { error: "The AI did not produce a usable 3D plan. Try asking again, or describe one thing to show." }); return;
    }
    const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    const dir = path.join(RENDERS_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
    const planFile = path.join(dir, "plan.json");
    fs.writeFileSync(planFile, JSON.stringify(checked.plan), "utf8");
    const built = await RENDER.runBlender(blender, planFile, dir, 120000);
    if (!built.ok) {
      const why = RENDER.blenderError(built.log);
      sendJson(res, 500, { error: "Blender could not build that view" + (why ? ": " + why : ".") }); return;
    }
    pruneRenders();
    sendJson(res, 200, {
      ok: true, id: id, title: checked.plan.title, explain: checked.plan.explain,
      url: "/api/render/" + id + "/view.glb", warnings: checked.errors.slice(0, 6)
    });
  } catch (e) {
    sendJson(res, 502, { error: "The 3D request failed: " + String(e.message || e).replace(/sk-[\w-]+/g, "[key]").slice(0, 160) });
  } finally {
    renderBusy = false;
  }
}

async function handleSuggest(req, res) {
  const ip = req.socket.remoteAddress || "local";
  if (rateLimited(ip)) {
    sendJson(res, 429, { error: "Too many suggestions. Wait a minute." }); return;
  }
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (!hasJsonMediaType(req)) {
    sendJson(res, 415, { error: "Send application/json." }); return;
  }
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) {
    sendJson(res, 403, { error: "Cross-origin suggestion refused." }); return;
  }

  let raw = "";
  let size = 0;
  let tooBig = false;
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 16384) { tooBig = true; } else { raw += chunk; }
    });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  if (tooBig) { sendJson(res, 413, { error: "Request too large; the limit is 16 KiB." }); return; }
  let body;
  try { body = JSON.parse(raw || "{}"); } catch (e) {
    sendJson(res, 400, { error: "Bad JSON." }); return;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    sendJson(res, 400, { error: "Send one JSON object." }); return;
  }
  if (typeof body.sentence !== "string" || typeof body.section !== "string") {
    sendJson(res, 400, { error: "Sentence and section must be strings." }); return;
  }
  const sentence = body.sentence.trim().slice(0, SUGGEST.MAX_SENTENCE);
  const section = body.section.trim();
  if (!sentence) { sendJson(res, 400, { error: "A suggestion instruction is required." }); return; }

  let html;
  let domain;
  try {
    html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
    domain = domainPassages();
  } catch (e) {
    sendJson(res, 500, { error: "could not prepare the suggestion corpus" }); return;
  }
  if (PROSE.listSections(html).indexOf(section) === -1) {
    sendJson(res, 400, { error: "Choose an existing guide section." }); return;
  }
  meter.count("suggestions");
  if (meter.blocked()) {
    meter.count("blocked");
    sendJson(res, 402, { error: "the daily budget is spent, so no suggestions until it resets", budget: meter.snapshot() });
    return;
  }
  if (!API_KEY && !/127\.0\.0\.1|localhost/.test(BASE_URL)) {
    sendJson(res, 501, { error: "no API key yet — open the gear in the panel and add one" }); return;
  }

  try {
    const result = await SUGGEST.suggest(
      { sentence: sentence, section: section },
      { html: html, domain: domain },
      askOnce
    );
    sendJson(res, 200, result);
  } catch (e) {
    /* Provider bodies and thrown messages can contain prompts, credentials, or
       model output. None of those diagnostics belong in the client response. */
    sendJson(res, 502, { error: "The suggestion provider failed. No suggestion was returned." });
  }
}

/** POST /api/propose { sentence } — the chat asks for a change and gets a branch. */
async function handlePropose(req, res) {
  /* This writes files and runs git, so it gets the same guards as the settings
     endpoint: a JSON content type (which forces a preflight a hostile page cannot
     satisfy) and a same-origin check. */
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (String(req.headers["content-type"] || "").indexOf("application/json") === -1) {
    sendJson(res, 415, { error: "Send application/json." }); return;
  }
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) {
    sendJson(res, 403, { error: "Cross-origin change refused." }); return;
  }
  const gate = writeGate(req);
  if (!gate.ok) { sendJson(res, gate.status, { error: gate.error }); return; }

  let raw = "";
  let tooBig = false;
  await new Promise((resolve) => {
    req.on("data", (c) => { raw += c; if (raw.length > 4000) { tooBig = true; req.destroy(); resolve(); } });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  if (tooBig) { sendJson(res, 413, { error: "Request too large." }); return; }

  let body;
  try { body = JSON.parse(raw || "{}"); } catch (e) { sendJson(res, 400, { error: "Bad JSON." }); return; }

  /* Item D Accept: a structured prose operation still uses the one existing
      proposal loop. This branch creates a proposal only, never merges it. */
  if (Object.prototype.hasOwnProperty.call(body, "op")) {
    const input = body.op;
    if (!input || input.op !== "prose-rewrite") {
      sendJson(res, 400, { error: 'Only a structured "prose-rewrite" operation is accepted.' }); return;
    }
    const op = {
      op: "prose-rewrite",
      section: String(input.section || "").trim(),
      oldText: String(input.oldText || "").trim(),
      newText: String(input.newText || "").trim()
    };
    const banned = BANS.screenText(JSON.stringify(op));
    if (!banned.ok) {
      sendJson(res, 200, { ok: false, error: BANS.blockNotice(banned.hits), rejected: [] }); return;
    }
    let verdict;
    try {
      const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
      verdict = PROSE.validate(op, { html: html });
    } catch (e) {
      sendJson(res, 500, { error: "could not prepare the operation checks" }); return;
    }
    if (!verdict.ok) {
      sendJson(res, 200, { ok: false, error: verdict.errors.join("; "), rejected: [] }); return;
    }

    const tmp = path.join(REPO, "server", ".cache", "suggest-op-" + process.pid + "-" +
      Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".json");
    let proposed;
    try {
      fs.mkdirSync(path.dirname(tmp), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(op, null, 2), "utf8");
      proposed = PROPOSE.propose(tmp, {});
    } catch (e) {
      sendJson(res, 500, { error: "could not create the proposal: " + String(e.message || e).slice(0, 200) });
      return;
    } finally {
      try { fs.rmSync(tmp, { force: true }); } catch (e) { /* best effort */ }
    }
    sendJson(res, 200, {
      ok: proposed.ok,
      job: { kind: "prose-rewrite" },
      drafted: 1,
      rejected: [],
      proposal: proposed.ok
        ? { slug: proposed.slug, changes: proposed.changes, synced: proposed.synced, next: proposed.next }
        : null,
      error: proposed.ok ? "" : proposed.error
    });
    return;
  }

  const sentence = String(body.sentence || "");

  /* The corrections memory's chat door (decisions 11 and 12):
     "correction: <what is right>. supersedes: <what it replaces>". No model and
     no key needed - the user's sentence is the content - but it still lands only
     as a proposal branch for the human to accept. Nothing is auto-ingested. */
  if (/^\s*(correction|correct|remember|wrong)\s*[:\-]/i.test(sentence)) {
    const built = CORRECTION.fromSentence(sentence);
    if (built.error) { sendJson(res, 200, { ok: false, error: built.error, rejected: [] }); return; }
    let existing = "";
    try {
      const cp = path.join(REPO, CORRECTION.FILE);
      existing = fs.existsSync(cp) ? fs.readFileSync(cp, "utf8") : "";
    } catch (e) { /* treated as an empty memory */ }
    const verdict = CORRECTION.validate(built, { existing: existing });
    if (!verdict.ok) {
      sendJson(res, 200, { ok: false, error: verdict.errors.join("; "), rejected: [] });
      return;
    }
    try {
      const tmp = path.join(REPO, "server", ".cache", "correction-op.json");
      fs.mkdirSync(path.join(REPO, "server", ".cache"), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(built, null, 2), "utf8");
      const proposed = PROPOSE.propose(tmp, {});
      sendJson(res, 200, {
        ok: proposed.ok,
        job: { kind: "correction-add" },
        drafted: 1,
        rejected: [],
        proposal: proposed.ok
          ? { slug: proposed.slug, changes: proposed.changes, synced: proposed.synced, next: proposed.next }
          : null,
        error: proposed.ok ? "" : proposed.error
      });
    } catch (e) {
      sendJson(res, 500, { error: "could not record the correction: " + String(e.message || e).slice(0, 200) });
    }
    return;
  }

  const parsed = JOBSPEC.parseIntent(String(body.sentence || ""));
  if (!parsed.ok) { sendJson(res, 400, { error: parsed.error }); return; }
  const job = parsed.job;

  if (meter.blocked()) {
    sendJson(res, 402, { error: "the daily budget is spent, so no drafting until it resets", budget: meter.snapshot() });
    return;
  }
  if (!API_KEY && !/127\.0\.0\.1|localhost/.test(BASE_URL)) {
    sendJson(res, 501, { error: "no API key yet — open the gear in the panel and add one" });
    return;
  }

  let ctx;
  try {
    const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
    ctx = {
      quizzes: QUIZ.readQuizzes(html).quizzes,
      corpus: PROPOSE.buildCorpus(),
      correctValues: PROPOSE.loadKnownValues()
    };
  } catch (e) {
    sendJson(res, 500, { error: "could not prepare the checks: " + String(e.message || e) });
    return;
  }

  let drafted;
  try {
    drafted = await DRAFT.draft(job, ctx, askOnce, { passages: domainPassages() });
  } catch (e) {
    sendJson(res, 502, { error: String(e.message || e).slice(0, 240) });
    return;
  }

  if (!drafted.ok) {
    sendJson(res, 200, { ok: false, job: job, error: drafted.error, rejected: drafted.rejected });
    return;
  }

  const proposed = PROPOSE.proposeMany(drafted.survivors.slice(0, job.count));
  sendJson(res, 200, {
    ok: proposed.ok,
    job: job,
    drafted: drafted.survivors.length,
    rejected: drafted.rejected,
    proposal: proposed.ok
      ? { slug: proposed.slug, changes: proposed.changes, synced: proposed.synced, next: proposed.next }
      : null,
    error: proposed.ok ? "" : proposed.error
  });
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

/* ---------- the read-only review surface (R14) ----------
   A proposal can be INSPECTED here, never acted on: diff and rendered preview
   only. Accept and reject stay CLI commands, so this server gains no write path
   and there is nothing here to secure. */
function git(args) {
  try {
    return {
      ok: true,
      out: String(execFileSync("git", args, {
        cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024
      }) || "")
    };
  } catch (e) {
    return { ok: false, out: String((e.stdout || "") + (e.stderr || "") || e.message) };
  }
}

/* A review target must be an OPEN proposal branch and nothing else. The name is
   decoded once, matched against a strict pattern, and then against the real
   branch list — three gates before any git command sees it, and git is invoked
   with an argument array, never a shell string. */
function proposalRef(raw) {
  let decoded = String(raw || "");
  try { decoded = decodeURIComponent(decoded); } catch (e) { return null; }
  if (!/^proposal\/[A-Za-z0-9._-]+$/.test(decoded)) { return null; }
  if (PROPOSE.listProposals().indexOf(decoded) === -1) { return null; }
  return decoded;
}

function handleProposalDiff(res, rawName) {
  const name = proposalRef(rawName);
  if (!name) { sendJson(res, 404, { error: "no such proposal" }); return; }
  const diff = git(["diff", "main..." + name]);
  if (!diff.ok) { sendJson(res, 500, { error: "could not read the diff" }); return; }
  const stat = git(["diff", "--stat", "main..." + name]);
  const head = git(["log", "-1", "--format=%s", name]);
  sendJson(res, 200, {
    ok: true, name: name, subject: head.out.trim(), diff: diff.out, stat: stat.out.trim()
  });
}

function handleProposalPreview(res, rawName) {
  const name = proposalRef(rawName);
  if (!name) { res.writeHead(404); res.end("no such proposal"); return; }
  const show = git(["show", name + ":index.html"]);
  if (!show.ok) { res.writeHead(404); res.end("this proposal does not carry an index.html"); return; }
  const body = show.out;
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
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
  /* never serve secrets or tooling inside it either: the saved API key
     (server/.settings.json), server/.env, .git, .claude, conversations, caches.
     Any part of the path that starts with a dot is refused, and so is all of
     server/ and node_modules/. The page needs none of them. */
  const parts = path.relative(REPO, file).split(path.sep);
  if (parts.some(function (p) { return p.charAt(0) === "."; }) || parts[0] === "server" || parts[0] === "node_modules") {
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
  /* A question costs money, so another website must not be able to send one:
     JSON only (a cross-site form or text/plain post cannot set it without a
     preflight this server never approves) and no cross-site Origin. */
  if (!hasJsonMediaType(req)) { sendJson(res, 415, { error: "Send application/json." }); return; }
  if (crossSite(req)) { sendJson(res, 403, { error: "Cross-origin question refused." }); return; }
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
  /* job 8: the hard MONTHLY cap, kept on the server. Same fallback, said plainly. */
  if (MEM.spend.blocked(MONTHLY_USD_MAX)) {
    meter.count("blocked");
    const m = monthState();
    sendJson(res, 402, {
      error: "This month's AI budget is spent (US$" + m.usd.toFixed(2) + " of US$" + m.cap.toFixed(2) + "), so answers come from the written ones until next month.",
      month: m
    });
    return;
  }

  /* job 8: where Shad is in the build (from the page) and what he has told it (from the laptop's memory) */
  const c = body.context && typeof body.context === "object" ? body.context : {};
  const stepN = Number(c.step);
  const context = {
    step: Number.isInteger(stepN) && stepN >= 1 && stepN <= 8 ? stepN : null,
    stepTitle: String(c.stepTitle || "").replace(/\s+/g, " ").slice(0, 120),
    done: (Array.isArray(c.done) ? c.done : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 8).slice(0, 8),
    next: (Array.isArray(c.next) ? c.next : []).map((s) => String(s).replace(/\s+/g, " ").slice(0, 160)).filter(Boolean).slice(0, 3),
    /* the Home card's where-you-are (stages before steps, 4 Nov 2026), e.g. "Stage 1 practice · Workshop and safety" */
    stageText: String(c.stageText || "").replace(/\s+/g, " ").slice(0, 160),
    /* Fable audit S4 (10 Nov 2026): the step open in the Build walker, when Build is on screen */
    openStep: Number.isInteger(Number(c.openStep)) && Number(c.openStep) >= 1 && Number(c.openStep) <= 8 ? Number(c.openStep) : null,
    openTitle: String(c.openTitle || "").replace(/\s+/g, " ").slice(0, 120)
  };
  const facts = MEM.facts.relevant(question, 10);
  const detail = body.detail === true;

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

  /* Layer 4, compression. The browser sends up to 12 x 1,400 chars; this is what
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
    { role: "user", content: userPrompt(question, passages, history, { context: context, facts: facts, detail: detail }) }
  ];
  /* the same words at another step, or after he told it something new, are a different question */
  /* Fable audit S4 (10 Nov 2026): the question alone is compared for near-duplicates; where he is, the step on screen,
     his memory and the guide's fingerprint must match exactly (the "scope"). They used to be glued onto the question,
     so two different short questions shared most of their words and one got the other's saved answer
     ("Where does motor 1 go?" was given the saved answer to "Which props go on which motors?"). */
  const cacheKey = question;
  const cacheScope = "where:" + (context.stageText || "step" + (context.step || 0)) + "|open:" + (context.openStep || 0) + "|mem:" + MEM.facts.version() +
    "|guide:" + guideStamp() + (detail ? "|detail" : "");

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
  const cached = cache.get(cacheKey, cacheScope);
  if (cached) {
    meter.count("cacheHits");
    /* A cached answer passes the five bans like any other: an old cache entry
       must not smuggle a banned claim past a check that post-dates it. */
    const cachedBans = BANS.screenText(cached.answer);
    send({ type: "delta", text: cachedBans.ok ? cached.answer : BANS.blockNotice(cachedBans.hits) });
    send({
      type: "meta",
      sources: cachedBans.ok ? ["Saved AI answer (" + (cached.model || "model") + "), grounded in this guide's passages"] : [],
      see: cachedBans.ok ? cached.see : null,
      model: cached.model || "cache",
      cached: true,
      cost: 0,
      tier: "cache",
      reason: cachedBans.ok ? "answered before" : "blocked by the five bans"
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
  const callStream = async (msgs, name, live, extra) => {
    let text = "";
    let usage = null;
    let finish = "", reasoningChars = 0;
    const onDelta = (piece) => {
      text += piece;
      if (live) { send({ type: "delta", text: piece }); }
    };
    const onUsage = (u) => { usage = u; };
    if (PROVIDER === "anthropic") {
      await streamAnthropic(msgs, onDelta, { model: name, onUsage: onUsage });
    } else {
      await streamOpenAI(msgs, onDelta, Object.assign({ model: name, onUsage: onUsage,
        onFinish: (f, r) => { if (f) { finish = f; } reasoningChars += r || 0; } }, extra || {}));
    }
    return { text: text, usage: usage, finish: finish, reasoningChars: reasoningChars };
  };

  const BARE_REFUSAL = /that is not in this guide/i;
  const REFUSAL = { test: (t) => BARE_REFUSAL.test(t) && !/general knowledge, not from this guide/i.test(t) };
  let spent = 0;

  try {
    let first = await callStream(messages, model, true);
    spent += meter.record(model, first.usage || fallbackUsage(messages, first.text));
    if (!String(first.text || "").trim()) {
      /* 4 Nov 2026 (Shad's chat): some models spend the whole answer budget "thinking" and send back no text.
         Log why (never the key), then ask once more with a bigger budget and, on OpenRouter, low reasoning. */
      console.warn("[ask] empty answer from " + model + ": finish_reason=" + (first.finish || "?") +
        ", reasoning chars=" + (first.reasoningChars || 0) + ", output tokens=" + ((first.usage || {}).outputTokens || "?") + "; asking once more");
      meter.count("emptyRetry");
      first = await callStream(messages, model, true, { maxTokens: EMPTY_RETRY_TOKENS, lowReasoning: true });
      spent += meter.record(model, first.usage || fallbackUsage(messages, first.text));
      if (!String(first.text || "").trim()) {
        console.warn("[ask] still empty from " + model + ": finish_reason=" + (first.finish || "?") + ", reasoning chars=" + (first.reasoningChars || 0));
        MEM.spend.record(spent);
        send({ type: "error", error: "The AI sent back an empty answer twice (finish: " + (first.finish || "unknown") + "), so this is the guide's written answer." });
        return;
      }
    }
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

    /* Fable audit S4 (10 Nov 2026): the model stopped because it ran out of answer tokens. Say so, and do not save it:
       cut-off answers used to be shown as finished and then replayed from the saved answers. */
    const cutOff = first.finish === "length" && full === first.text;
    if (cutOff) { full = full.replace(/\s+$/, "") + "\n\n(This answer was cut short. Ask again, or open the step itself.)"; }
    const nav0 = extractNav(full);
    /* job 8: [[REMEMBER ...]] lines come out of the answer and into the laptop's memory (at most two) */
    const rem = MEMORY.extractRemember(nav0.text);
    const nav = { text: rem.text, see: nav0.see };
    if (nav.text !== full || cutOff) { send({ type: "replace", text: nav.text }); }
    const remembered = [];
    rem.facts.forEach(function (f) {
      const r = MEM.facts.add(f, { from: req.fromPhone ? "phone" : "laptop" });
      if (r.ok && !r.existed) { remembered.push({ id: r.fact.id, text: r.fact.text }); }
    });
    MEM.spend.record(spent);

    /* The five code-enforced bans: a banned claim is REPLACED with a block
       notice before the response completes, and never cached. The replacement
       is loud and names the ban - never a silent rewrite (decision 4). */
    const bans = BANS.screenText(nav.text);
    if (!bans.ok) {
      send({ type: "replace", text: BANS.blockNotice(bans.hits) });
    }

    send({
      type: "meta",
      sources: ["AI answer (" + model + "), grounded in this guide's passages"],
      see: nav.see,
      model: model,
      cached: false,
      cost: Number(spent.toFixed(6)),
      tier: decision.tier,
      reason: bans.ok ? decision.reason : "blocked by the five bans",
      compressedChars: packed.savedChars,
      estimated: !first.usage,
      remembered: remembered,
      step: context.step,
      month: monthState()
    });
    send({ type: "done" });

    /* Never cache a refusal: "not in this guide" is exactly the answer that
       deserves a second opinion next time, not a stored verdict. And never
       cache a banned answer - the check must run again next time. Nor an answer
       that remembered something: it was about that moment. */
    /* Fable audit S4 (10 Nov 2026): also not an answer that says "not in this guide" and then adds general knowledge
       (it was saved, so a miss was repeated for a month), and not a cut-off answer. */
    if (bans.ok && !REFUSAL.test(nav.text) && !BARE_REFUSAL.test(nav.text) && !cutOff && !rem.facts.length) {
      cache.set(cacheKey, {
        answer: nav.text,
        model: model,
        sources: ["AI answer (" + model + "), grounded in this guide's passages"],
        see: nav.see,
        usd: spent
      }, cacheScope);
    }
  } catch (err) {
    send({ type: "error", error: String(err && err.message ? err.message : err).slice(0, 300) });
  } finally {
    res.end();
  }
}

/* ---------- conversation memory (Item B; decisions 11's spirit: kept, never
   trained on) -------------------------------------------------------------
   Threads live in server/.conversations/ (git-ignored): one JSON file per
   thread, mirrored from the page so the phone and the desktop share the same
   conversations. Writes ride through the same three write gates as settings and
   proposals. Reads are open on a loopback bind (the machine itself is the gate);
   on a reachable bind they need the write token too, because a thread is private
   chat history (M6, chat audit). A corrupt or
   missing file is never fatal — the page's localStorage copy keeps it. */
const CONVERSATIONS_DIR = ENV.CONVERSATIONS_DIR || path.join(__dirname, ".conversations");
const THREAD_ID = /^[a-z0-9-]{1,64}$/i;
const BUILD_TABS = ["why", "build", "parts", "steps", "quiz"];

function cleanBuild(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) { return null; }
  const tab = BUILD_TABS.indexOf(value.tab) !== -1 ? value.tab : "why";
  const n = Number(value.step);
  const step = tab === "steps" && Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
  return { tab: tab, step: step };
}

function convFile(id) {
  return path.join(CONVERSATIONS_DIR, id + ".json");
}

function listThreads() {
  let names = [];
  try { names = fs.readdirSync(CONVERSATIONS_DIR); } catch (e) { return []; }
  const out = [];
  names.forEach(function (n) {
    if (!/\.json$/.test(n)) { return; }
    try {
      const t = JSON.parse(fs.readFileSync(path.join(CONVERSATIONS_DIR, n), "utf8"));
      out.push({
        id: n.replace(/\.json$/, ""),
        title: String(t.title || "conversation").slice(0, 70),
        count: Array.isArray(t.messages) ? t.messages.length : 0,
        updatedAt: Number(t.updatedAt || 0)
      });
    } catch (e) { /* a corrupt thread is skipped, never fatal */ }
  });
  out.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
  return out;
}

/* M6: on a reachable bind, reading conversation history needs the write token. */
function readGate(req) {
  if (!REMOTE) { return { ok: true }; }
  if (!WRITE_TOKEN) {
    return { ok: false, status: 403, error: "conversation history is private on a reachable server; set GA_WRITE_TOKEN in server/.env" };
  }
  const auth = String(req.headers.authorization || "");
  const got = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : String(req.headers["x-write-token"] || "");
  if (got !== WRITE_TOKEN) { return { ok: false, status: 401, error: "token missing or wrong" }; }
  return { ok: true };
}

async function handleConversations(req, res, u) {
  const m = /^\/api\/conversations\/([^/]+)$/.exec(u);
  if (req.method === "GET") {
    const g = readGate(req);
    if (!g.ok) { sendJson(res, g.status, { error: g.error }); return; }
  }

  /* GET the list (read gate above). */
  if (!m && req.method === "GET") {
    sendJson(res, 200, { ok: true, threads: listThreads() });
    return;
  }
  if (!m) { sendJson(res, 405, { error: "GET only on the list." }); return; }

  const id = m[1];
  if (!THREAD_ID.test(id)) { sendJson(res, 400, { error: "Bad thread id." }); return; }

  /* GET one thread (read gate above). */
  if (req.method === "GET") {
    try {
      const t = JSON.parse(fs.readFileSync(convFile(id), "utf8"));
      sendJson(res, 200, {
        ok: true,
        thread: {
          title: t.title || "conversation",
          messages: Array.isArray(t.messages) ? t.messages : [],
          history: Array.isArray(t.history) ? t.history : [],
          lastId: String(t.lastId || ""),
          build: cleanBuild(t.build)
        }
      });
    } catch (e) {
      sendJson(res, 404, { ok: false, error: "no such thread" });
    }
    return;
  }

  if (req.method !== "PUT") { sendJson(res, 405, { error: "GET or PUT." }); return; }

  /* PUT: the page's mirror. The same three guards as every other write. */
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (String(req.headers["content-type"] || "").indexOf("application/json") === -1) {
    sendJson(res, 415, { error: "Send application/json." }); return;
  }
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) {
    sendJson(res, 403, { error: "Cross-origin change refused." }); return;
  }
  const gate = writeGate(req);
  if (!gate.ok) { sendJson(res, gate.status, { error: gate.error }); return; }

  let raw = "";
  let tooBig = false;
  await new Promise((resolve) => {
    req.on("data", (c) => {
      if (tooBig) { return; }
      raw += c;
      if (Buffer.byteLength(raw, "utf8") > 262144) { tooBig = true; raw = ""; }
    });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  if (tooBig) { sendJson(res, 413, { error: "Request too large." }); return; }

  let body;
  try { body = JSON.parse(raw || "{}"); } catch (e) { sendJson(res, 400, { error: "Bad JSON." }); return; }

  const thread = {
    title: String(body.title || "conversation").slice(0, 70),
    messages: Array.isArray(body.messages) ? body.messages.slice(-200) : [],
    history: Array.isArray(body.history) ? body.history.slice(-12) : [],
    lastId: String(body.lastId || "").slice(0, 200),
    build: cleanBuild(body.build),
    updatedAt: Date.now()
  };
  try {
    fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
    fs.writeFileSync(convFile(id), JSON.stringify(thread), "utf8");
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 500, { error: "could not save the thread: " + String(e.message || e).slice(0, 200) });
  }
}

const server = http.createServer(function (req, res) { req.fromPhone = false; route(req, res); });
/* Every request, from the laptop's own listener or (already through phoneGate) from the phone listener. */
function route(req, res) {
  const u = (req.url || "/").split("?")[0];
  if (!req.fromPhone && !hostAllowed(req)) { sendJson(res, 403, { error: "This server only answers on this machine." }); return; }

  /* ---------- job 8: memory, progress, phone access ---------- */
  if (u.indexOf("/api/memory") === 0 || u === "/api/progress" || u === "/api/phone" || u.indexOf("/api/pair") === 0 || u.indexOf("/api/devices") === 0) {
    handleMemoryRoutes(req, res, u);
    return;
  }

  /* ---------- settings: the key and the daily cap, set from the page ----------
     Guarded three ways: the server binds loopback, the JSON content type forces a
     preflight that this server never approves (so a hostile page cannot POST),
     and a same-origin check rejects a mismatched Origin. The response never
     contains the key — only whether one is set and its last four characters. */
  if (u === "/api/models") {
    if (req.method !== "GET") { sendJson(res, 405, { error: "GET only." }); return; }
    listModels().then(function (r) { sendJson(res, 200, r); });
    return;
  }

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
    const gate = writeGate(req);
    if (!gate.ok) { sendJson(res, gate.status, { error: gate.error }); return; }

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
      let keyCleared = false;
      if (typeof body.preset === "string" && body.preset) {
        const oldBase = BASE_URL;
        const applied = applyPreset(body.preset);
        if (!applied) {
          sendJson(res, 400, { error: 'unknown provider preset "' + body.preset + '"' });
          return;
        }
        patch.provider = applied.kind;
        patch.baseUrl = applied.baseUrl;
        patch.cheapModel = applied.cheap;
        patch.strongModel = applied.strong;
        /* M4 (chat audit): a key only works with the provider that issued it. Keeping it after a switch would
           send, say, an OpenAI key to Groq on the next question, silently. A new provider starts with no key,
           and the reply says so, unless a key comes in the same request. */
        if (applied.baseUrl.replace(/\/$/, "") !== oldBase.replace(/\/$/, "") && typeof body.apiKey !== "string" && API_KEY) {
          API_KEY = "";
          patch.apiKey = "";
          keyCleared = true;
        }
      }
      if (typeof body.model === "string" && body.model.trim()) {
        /* A free-text model field, because a preset's hardcoded model name is the
           fastest way to get a confusing "model not found" on day one. Setting it
           here collapses both tiers to one model, which is the honest default. */
        const model = body.model.trim().slice(0, 120);
        MODEL = model;
        CHEAP_MODEL = model;
        STRONG_MODEL = model;
        patch.cheapModel = model;
        patch.strongModel = model;
      }
      if (typeof body.renderModel === "string") {
        RENDER_MODEL = body.renderModel.trim().slice(0, 120);
        patch.renderModel = RENDER_MODEL;
      }
      if (typeof body.renderEffort === "string") {
        if (EFFORTS.indexOf(body.renderEffort) === -1) {
          sendJson(res, 400, { error: "Thinking effort must be one of: " + EFFORTS.join(", ") + "." }); return;
        }
        RENDER_EFFORT = body.renderEffort;
        patch.renderEffort = RENDER_EFFORT;
      }
      if (typeof body.blenderPath === "string") {
        const p = body.blenderPath.trim().replace(/^"|"$/g, "");
        if (p && (!/blender(\.exe)?$/i.test(p) || !fs.existsSync(p))) {
          sendJson(res, 400, { error: "That is not a Blender program on this computer (it should end in blender.exe)." }); return;
        }
        BLENDER_PATH = p;
        patch.blenderPath = p;
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
      if (body.monthlyUsdMax != null) {
        const n = Number(body.monthlyUsdMax);
        if (!Number.isFinite(n)) {
          sendJson(res, 400, { error: "The monthly budget must be a number." }); return;
        }
        patch.monthlyUsdMax = Number(Math.min(MONTHLY_MAX, Math.max(MONTHLY_MIN, n)).toFixed(2));
        MONTHLY_USD_MAX = patch.monthlyUsdMax;
      }
      try { writeSettings(patch); } catch (e) {
        sendJson(res, 500, { error: "Could not save settings: " + String(e.message || e) });
        return;
      }

      sendJson(res, 200, Object.assign(settingsPayload(), keyCleared ? { keyCleared: true } : {}));
    });
    return;
  }

  /* Optional: prove the key works before trusting it. Only runs when asked, so a
     normal save costs nothing. */
  if (u === "/api/settings/verify" && req.method === "POST") {
    if (crossSite(req)) { sendJson(res, 403, { error: "Cross-origin request refused." }); return; }
    verifyKey().then((result) => sendJson(res, 200, result));
    return;
  }

  if (u === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      /* which copy of the guide this server serves: the launcher refuses to open a server from another folder */
      folder: REPO,
      provider: PROVIDER,
      model: MODEL,
      cheapModel: CHEAP_MODEL,
      strongModel: STRONG_MODEL,
      canEscalate: canEscalate(),
      baseUrl: BASE_URL,
      keyConfigured: !!API_KEY,
      local: /127\.0\.0\.1|localhost/.test(BASE_URL),
      budget: meter.blocked() ? "reached" : "ok",
      cacheEntries: cache.stats().entries,
      /* job 8: the month's spend against the hard cap, where the questions go, and phone access */
      month: monthState(),
      sendsTo: providerHost(),
      memoryFacts: MEM.facts.list().length,
      phone: { on: !!phoneServer, here: !!req.fromPhone }
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

  /* Suggestions are read-only; Accept still goes through /api/propose below. */
  if (u === "/api/render" && req.method === "POST") { handleRender(req, res); return; }
  if (u === "/api/render") { sendJson(res, 405, { error: "POST only." }); return; }
  const renderFile = /^\/api\/render\/([a-z0-9]+-[a-z0-9]+)\/view\.glb$/.exec(u);
  if (renderFile) {
    const file = path.join(RENDERS_DIR, renderFile[1], "view.glb");
    if (req.method !== "GET" || !fs.existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": "model/gltf-binary", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
    return;
  }

  if (u === "/api/suggest" && req.method === "POST") { handleSuggest(req, res); return; }
  if (u === "/api/suggest") { sendJson(res, 405, { error: "POST only." }); return; }

  /* The chat asking for a change: sentence in, proposal branch out. */
  if (u === "/api/propose" && req.method === "POST") { handlePropose(req, res); return; }
  if (u === "/api/propose") { sendJson(res, 405, { error: "POST only." }); return; }

  /* Open proposals, so the panel can tell the user what is waiting for them,
     and the review page can list them with what each one changes. */
  if (u === "/api/proposals") {
    const names = PROPOSE.listProposals();
    const details = names.map(function (n) {
      const head = git(["log", "-1", "--format=%H%x09%s", n]);
      const parts = head.out.trim().split("\t");
      const stat = git(["diff", "--shortstat", "main..." + n]);
      return {
        name: n,
        sha: (parts[0] || "").slice(0, 8),
        subject: parts.slice(1).join("\t"),
        shortstat: stat.out.trim()
      };
    });
    sendJson(res, 200, { ok: true, proposals: names, details: details });
    return;
  }

  /* Conversation memory: threads mirrored from every device (Item B).
     Writes are gated like settings and proposals; reads are open on loopback only. */
  if (u === "/api/conversations" || /^\/api\/conversations\/[^/]+$/.test(u)) {
    handleConversations(req, res, u);
    return;
  }

  /* Review: the diff and the rendered proposal, side by side. Read-only. */
  const diffMatch = /^\/api\/proposals\/([^/]+)\/diff$/.exec(u);
  if (diffMatch) {
    if (req.method !== "GET") { sendJson(res, 405, { error: "GET only - review is read-only." }); return; }
    handleProposalDiff(res, diffMatch[1]);
    return;
  }
  const previewMatch = /^\/proposals\/([^/]+)\/preview$/.exec(u);
  if (previewMatch) {
    if (req.method !== "GET") { res.writeHead(405); res.end("GET only - review is read-only."); return; }
    handleProposalPreview(res, previewMatch[1]);
    return;
  }
  if (u === "/review") { req.url = "/docs/assistant/review.html"; serveStatic(req, res); return; }

  serveStatic(req, res);
}

/* Job 8 routes. Reads are open on the laptop and to paired phones (phoneGate checked the token); changes need
   JSON from the same site; pairing codes, the device list and phone access itself are laptop-only. */
function handleMemoryRoutes(req, res, u) {
  const laptopOnly = function () {
    if (req.fromPhone) { sendJson(res, 403, { error: "That only works on the laptop." }); return true; }
    return false;
  };
  const writeOk = function () {
    if (!hasJsonMediaType(req)) { sendJson(res, 415, { error: "Send application/json." }); return false; }
    if (crossSite(req)) { sendJson(res, 403, { error: "Cross-site request refused." }); return false; }
    return true;
  };
  const query = (req.url || "").split("?")[1] || "";

  if (u === "/api/memory") {
    if (req.method === "GET") { sendJson(res, 200, { ok: true, facts: MEM.facts.list(), limit: MEMORY.LIMITS.facts }); return; }
    if (req.method === "DELETE") {
      if (crossSite(req)) { sendJson(res, 403, { error: "Cross-site request refused." }); return; }
      if (!/(^|&)all=1(&|$)/.test(query)) { sendJson(res, 400, { error: "Add ?all=1 to forget everything." }); return; }
      MEM.facts.clear(); sendJson(res, 200, { ok: true, facts: [] }); return;
    }
    sendJson(res, 405, { error: "GET or DELETE." }); return;
  }
  const one = /^\/api\/memory\/([a-f0-9]{6,16})$/.exec(u);
  if (one) {
    if (req.method !== "DELETE") { sendJson(res, 405, { error: "DELETE only." }); return; }
    if (crossSite(req)) { sendJson(res, 403, { error: "Cross-site request refused." }); return; }
    const gone = MEM.facts.remove(one[1]);
    sendJson(res, gone ? 200 : 404, gone ? { ok: true } : { error: "No such fact." }); return;
  }
  if (u === "/api/progress") {
    if (req.method === "GET") { sendJson(res, 200, Object.assign({ ok: true }, MEM.progress.get())); return; }
    if (req.method !== "POST") { sendJson(res, 405, { error: "GET or POST." }); return; }
    if (!writeOk()) { return; }
    readJson(req, 40000).then(function (body) {
      if (!body || typeof body.changes !== "object") { sendJson(res, 400, { error: "Send { changes: { key: { v, at } } }." }); return; }
      const r = MEM.progress.merge(body.changes);
      sendJson(res, 200, { ok: true, applied: r.applied, ticks: r.ticks });
    });
    return;
  }
  if (u === "/api/pair") {
    if (req.method !== "POST") { sendJson(res, 405, { error: "POST only." }); return; }
    if (!writeOk()) { return; }
    readJson(req, 2000).then(function (body) {
      if (!body) { sendJson(res, 400, { error: "Bad JSON." }); return; }
      const r = MEM.devices.pair(body.code, body.name);
      if (r.ok) { sendJson(res, 200, { ok: true, token: r.token, name: r.name }); return; }
      sendJson(res, r.reason === "locked" ? 429 : 403, { error: r.reason, triesLeft: r.triesLeft, retryInS: r.retryInS });
    });
    return;
  }
  if (laptopOnly()) { return; }
  if (u === "/api/pair/start") {
    if (req.method !== "POST") { sendJson(res, 405, { error: "POST only." }); return; }
    if (!writeOk()) { return; }
    if (!phoneServer) { sendJson(res, 409, { error: "Turn phone access on first." }); return; }
    const r = MEM.devices.startPairing();
    sendJson(res, r.ok ? 200 : 429, r.ok ? { ok: true, code: r.code, expiresInS: r.expiresInS, url: phoneUrl() } : { error: r.reason, retryInS: r.retryInS });
    return;
  }
  if (u === "/api/phone") {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, on: !!phoneServer, url: phoneUrl(), devices: MEM.devices.list(), pairingOpen: MEM.devices.pairingOpen, locked: MEM.devices.locked });
      return;
    }
    if (req.method !== "POST") { sendJson(res, 405, { error: "GET or POST." }); return; }
    if (!writeOk()) { return; }
    readJson(req, 500).then(function (body) {
      if (!body || typeof body.on !== "boolean") { sendJson(res, 400, { error: "Send { on: true|false }." }); return; }
      setPhoneAccess(body.on).then(function (r) {
        sendJson(res, r.error ? 500 : 200, Object.assign({ ok: !r.error, devices: MEM.devices.list() }, r));
      });
    });
    return;
  }
  const dev = /^\/api\/devices\/([a-f0-9]{8})$/.exec(u);
  if (dev) {
    if (req.method !== "DELETE") { sendJson(res, 405, { error: "DELETE only." }); return; }
    if (crossSite(req)) { sendJson(res, 403, { error: "Cross-site request refused." }); return; }
    const gone = MEM.devices.remove(dev[1]);
    sendJson(res, gone ? 200 : 404, gone ? { ok: true, devices: MEM.devices.list() } : { error: "No such device." });
    return;
  }
  sendJson(res, 404, { error: "not found" });
}

/* Persist the cache on the way out: a Ctrl-C should not cost the answers that
   were already paid for. */
process.on("exit", () => { cache.flush(); });
process.on("SIGINT", () => { cache.flush(); process.exit(0); });

server.listen(PORT, BIND, () => {
  const keyState = API_KEY ? "set" : (/(127\.0\.0\.1|localhost)/.test(BASE_URL) ? "not needed (local model)" : "MISSING");
  const writeState = REMOTE
    ? (ALLOW_WRITE
      ? (WRITE_TOKEN ? "gated: --allow-write + token required" : "REFUSED: --allow-write given but GA_WRITE_TOKEN is not set")
      : "read-only (start with --allow-write to enable edits)")
    : "enabled on this machine only";
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
  const m = monthState();
  console.log("  month    : US$" + m.usd.toFixed(2) + " spent of US$" + m.cap.toFixed(2) + " (hard cap, " + m.month + ")");
  console.log("  memory   : " + MEMORY_DIR + "  (" + MEM.facts.list().length + " facts)");
  console.log("  sends to : " + providerHost());
  console.log("  phone    : off (turn it on in the chat's Settings)");
  console.log("  cache    : " + (CACHE_OFF ? "off" : CACHE_FILE + "  (" + cache.stats().entries + " entries)"));
  console.log("  base url : " + BASE_URL);
  console.log("  bind     : " + BIND);
  console.log("  writes   : " + writeState);
  console.log("  api key  : " + keyState);
  if (keyState === "MISSING") {
    console.log("");
    console.log("  No key yet: the page will answer from its offline engine.");
    console.log("  Copy server/.env.example to server/.env and add a key (or run a local model).");
  }
  console.log("");
});



