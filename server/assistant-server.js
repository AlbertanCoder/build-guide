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
const PROVIDER = String(ENV.PROVIDER || "openai").toLowerCase();
const MODEL = ENV.MODEL || (PROVIDER === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini");
const BASE_URL = (ENV.BASE_URL || (PROVIDER === "anthropic"
  ? "https://api.anthropic.com"
  : "https://api.openai.com/v1")).replace(/\/$/, "");
const API_KEY = ENV.API_KEY || ENV.OPENAI_API_KEY || ENV.ANTHROPIC_API_KEY || "";
const MAX_QUESTION = 500;
const MAX_PASSAGES = 6;
const MAX_TOKENS = 700;
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
async function streamOpenAI(messages, onDelta) {
  const res = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + (API_KEY || "local")
    },
    body: JSON.stringify({
      model: MODEL, stream: true, temperature: 0.2, max_tokens: MAX_TOKENS, messages: messages
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
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") { return; }
      try {
        const json = JSON.parse(payload);
        const choice = json.choices && json.choices[0];
        const piece = choice && choice.delta ? choice.delta.content : "";
        if (piece) { onDelta(piece); }
      } catch (e) { /* keep-alive or split line */ }
    }
  }
}

async function streamAnthropic(messages, onDelta) {
  const rest = messages.slice(1);
  const res = await fetch(BASE_URL + "/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: MAX_TOKENS, temperature: 0.2,
      system: messages[0].content, stream: true, messages: rest
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
        if (json.type === "message_stop") { return; }
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
  const passages = (Array.isArray(body.passages) ? body.passages : [])
    .slice(0, MAX_PASSAGES)
    .map((p) => ({
      label: String(p.label || "").slice(0, 160),
      tab: TABS.includes(String(p.tab)) ? String(p.tab) : "",
      step: Number(p.step) || null,
      text: String(p.text || "").slice(0, 1400)
    }))
    .filter((p) => p.text.length > 40);

  if (!question) { sendJson(res, 400, { error: "A question is required." }); return; }
  if (!passages.length) {
    /* No evidence, no call. This is the anti-hallucination tripwire. */
    sendJson(res, 422, { error: "No guide passages were supplied for that question." });
    return;
  }
  if (!API_KEY && !/127\.0\.0\.1|localhost/.test(BASE_URL)) {
    sendJson(res, 501, { error: "No API key configured. See server/.env.example." });
    return;
  }

  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-6)
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 1500) }));

  const messages = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: userPrompt(question, passages, history.slice(0, -1)) }
  ];

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });
  const send = (obj) => res.write("data: " + JSON.stringify(obj) + "\n\n");

  let full = "";
  const onDelta = (piece) => {
    full += piece;
    send({ type: "delta", text: piece });
  };

  try {
    if (PROVIDER === "anthropic") { await streamAnthropic(messages, onDelta); }
    else { await streamOpenAI(messages, onDelta); }

    const nav = extractNav(full);
    if (nav.text !== full) { send({ type: "replace", text: nav.text }); }
    send({
      type: "meta",
      sources: ["Retrieved from this guide"],
      see: nav.see,
      model: MODEL
    });
    send({ type: "done" });
  } catch (err) {
    send({ type: "error", error: String(err && err.message ? err.message : err).slice(0, 300) });
  } finally {
    res.end();
  }
}

const server = http.createServer((req, res) => {
  const u = (req.url || "/").split("?")[0];

  if (u === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      provider: PROVIDER,
      model: MODEL,
      baseUrl: BASE_URL,
      keyConfigured: !!API_KEY,
      local: /127\.0\.0\.1|localhost/.test(BASE_URL)
    });
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

server.listen(PORT, "127.0.0.1", () => {
  const keyState = API_KEY ? "set" : (/(127\.0\.0\.1|localhost)/.test(BASE_URL) ? "not needed (local model)" : "MISSING");
  console.log("");
  console.log("  Guide Assistant server");
  console.log("  → http://localhost:" + PORT + "/            (the guide, with a live assistant)");
  console.log("  → http://localhost:" + PORT + "/api/health  (what the assistant is using)");
  console.log("");
  console.log("  provider : " + PROVIDER);
  console.log("  model    : " + MODEL);
  console.log("  base url : " + BASE_URL);
  console.log("  api key  : " + keyState);
  if (keyState === "MISSING") {
    console.log("");
    console.log("  No key yet: the page will answer from its offline engine.");
    console.log("  Copy server/.env.example to server/.env and add a key (or run a local model).");
  }
  console.log("");
});



