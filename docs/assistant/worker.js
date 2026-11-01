/**
 * Guide Assistant proxy — optional, off unless you deploy it.
 *
 * Why this exists: the page is a static file on GitHub Pages, so it cannot hold
 * an API key. If you want the assistant to *draft* prose instead of returning
 * the curated entry verbatim, deploy this Worker, put the key in a secret, and
 * point the page at it:
 *
 *   <script>window.GUIDE_ASSISTANT = { endpoint: "https://your-worker.workers.dev/ask" };</script>
 *   <script src="docs/js/assistant.js"></script>
 *
 * Hard rules baked in below, because the guide's credibility is its product:
 *   - answer only from the passages the page sends (retrieved from the guide)
 *   - never invent a price, part number, or regulation
 *   - say "not in this guide" instead of guessing
 *   - return structured JSON with sources, so the UI can show where it came from
 *
 * The page falls back to its offline answers whenever this returns an error,
 * a timeout, or malformed JSON. Deployment steps: docs/assistant/README.md
 */

const ALLOWED_ORIGINS = (env) => String(env.ALLOWED_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const TABS = ["why", "build", "parts", "steps", "career", "quiz", "limits"];
const MAX_QUESTION = 400;
const MAX_PASSAGES = 6;
const RATE_LIMIT = 12;          // requests per window, per IP
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map();         // per-isolate; resets on cold start by design

function corsHeaders(origin, env) {
  const allow = ALLOWED_ORIGINS(env);
  const ok = allow.length === 0 || allow.includes(origin);
  return {
    "access-control-allow-origin": ok ? (origin || "*") : "null",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin"
  };
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, since: now };
  if (now - rec.since > RATE_WINDOW_MS) { rec.count = 0; rec.since = now; }
  rec.count += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) { hits.clear(); }
  return rec.count > RATE_LIMIT;
}

function systemPrompt() {
  return [
    "You are the Guide Assistant inside a single-page build guide for a 5-inch analog FPV",
    "quadcopter carrying a Raspberry Pi Zero 2 WH, a Pimoroni MLX90640 thermal camera and a",
    "PA1010D GPS. The author's ethos is verified, sourced, honest claims.",
    "",
    "Rules you must follow exactly:",
    "1. Answer only from the PASSAGES provided. Do not use outside knowledge for hardware",
    "   specifics, prices, part numbers, or aviation law.",
    "2. If the passages do not contain the answer, say: \"That is not in this guide.\" and",
    "   suggest what the user could check instead. Never guess.",
    "3. Never state a price, a fee, or a regulation except as quoted in a passage, and always",
    "   attribute it to that passage's label in `sources`.",
    "4. Be practical: numbered steps, safety first (props off, LiPo handling, 3.3V sensors,",
    "   never transmit into no antenna). Maximum 160 words.",
    "5. Never claim measured detection performance. Sampling geometry is not detection proof.",
    "",
    "Reply with JSON only, exactly this shape:",
    '{"answer":"2-4 short paragraphs separated by \\n\\n","steps":["..."],"sources":["passage labels you actually used"],"see":[{"label":"...","tab":"why|build|parts|steps|career|quiz|limits","step":1}],"chips":["..."],"note":""}',
    "`steps` may be empty. `note` is for a safety warning, or empty."
  ].join("\n");
}

function buildUserPrompt(question, passages) {
  const blocks = passages.map((p, i) =>
    `[P${i + 1}] ${p.label || "guide passage"} (tab: ${p.tab || "?"}` +
    `${p.step ? `, assembly step ${p.step}` : ""})\n${String(p.text || "").slice(0, 1200)}`
  ).join("\n\n");
  return `PASSAGES FROM THE GUIDE:\n\n${blocks}\n\nUSER QUESTION:\n${question}`;
}

/* Models like to wrap JSON in prose or fences; recover anything usable. */
function parseModelJson(text) {
  if (!text) { return null; }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last <= first) { return null; }
  try { return JSON.parse(candidate.slice(first, last + 1)); } catch (e) { return null; }
}

/* ---- module entry point (fetch handler) --------------------------------
   Helper functions below are hoisted, so declaring the handler first keeps
   the Cloudflare Workers convention of "entry point at the top". */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return Response.json({ error: "POST only" }, { status: 405, headers: cors });
    }
    const allowed = ALLOWED_ORIGINS(env);
    if (allowed.length && !allowed.includes(origin)) {
      return Response.json({ error: "origin not allowed" }, { status: 403, headers: cors });
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (rateLimited(ip)) {
      return Response.json({ error: "rate limited" }, { status: 429, headers: cors });
    }
    if (!env.OPENAI_API_KEY) {
      return Response.json({ error: "assistant not configured" }, { status: 500, headers: cors });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ error: "bad json" }, { status: 400, headers: cors });
    }

    const question = String(body.question || "").trim().slice(0, MAX_QUESTION);
    if (!question) {
      return Response.json({ error: "question required" }, { status: 400, headers: cors });
    }
    const passages = (Array.isArray(body.passages) ? body.passages : [])
      .slice(0, MAX_PASSAGES)
      .map((p) => ({
        label: String(p.label || "").slice(0, 160),
        tab: TABS.includes(String(p.tab)) ? String(p.tab) : "",
        step: Number(p.step) || null,
        text: String(p.text || "").slice(0, 1300)
      }));

    const endpoint = env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.MODEL || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: buildUserPrompt(question, passages) }
        ]
      })
    });

    if (!res.ok) {
      return Response.json({ error: `upstream ${res.status}` }, { status: 502, headers: cors });
    }

    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : "";
    const parsed = parseModelJson(text);
    if (!parsed || !parsed.answer) {
      return Response.json({ error: "unparseable model output" }, { status: 502, headers: cors });
    }

    return Response.json(sanitise(parsed), {
      headers: { ...cors, "cache-control": "no-store" }
    });
  }
};
/* ---- output shaping: the model's JSON is never trusted raw ---- */
function sanitise(obj) {
  return {
    answer: String(obj.answer || "").slice(0, 2000),
    steps: Array.isArray(obj.steps)
      ? obj.steps.slice(0, 8).map((s) => String(s).slice(0, 300)) : [],
    sources: Array.isArray(obj.sources)
      ? obj.sources.slice(0, 6).map((s) => String(s).slice(0, 160)) : [],
    note: String(obj.note || "").slice(0, 300),
    chips: Array.isArray(obj.chips)
      ? obj.chips.slice(0, 3).map((c) => String(c).slice(0, 80)) : [],
    /* links are whitelisted: a model must never be able to invent a target */
    see: (Array.isArray(obj.see) ? obj.see : [])
      .filter((s) => s && TABS.includes(String(s.tab || "")))
      .slice(0, 3)
      .map((s) => ({
        label: String(s.label || "Open").slice(0, 60),
        tab: String(s.tab),
        step: Number(s.step) >= 1 && Number(s.step) <= 8 ? Number(s.step) : null
      }))
  };
}
