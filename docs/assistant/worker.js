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

const TABS = ["why", "build", "parts", "steps", "quiz"];
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
    "2b. Corrections on file (passages labelled \"Correction on file\") supersede the",
    "   guide: when one disagrees with a passage, show both and say the correction is",
    "   authoritative for this build.",
    "3. Never state a price, a fee, or a regulation except as quoted in a passage, and always",
    "   attribute it to that passage's label in `sources`.",
    "4. Be practical: numbered steps, safety first (props off, LiPo handling, 3.3V sensors,",
    "   never transmit into no antenna). Maximum 160 words.",
    "5. Never claim measured detection performance. Sampling geometry is not detection proof.",
    "",
    "Reply with JSON only, exactly this shape:",
    '{"answer":"2-4 short paragraphs separated by \\n\\n","steps":["..."],"sources":["passage labels you actually used"],"see":[{"label":"...","tab":"why|build|parts|steps|quiz","step":1}],"chips":["..."],"note":""}',
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

/* ---- BANS:BEGIN (generated from server/bans.js by scripts/dev/build-worker-bans.js) ---- */
function sentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

const DATE_RE = /\b20\d\d-\d\d-\d\d\b|\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+20\d\d\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?,?\s+20\d\d\b/i;

const BANS = [
  {
    id: "detection-performance",
    say: "detection performance must not be stated as fact - report only what was actually measured",
    allow: /\b(measured|recorded|observed|logged|in (our|your|my) (test|tests|trials|flights?|runs?)|not guaranteed|no guarantee|is not proof|may be difficult|your mileage|estimat)/i,
    re: [
      /\b\d+(\.\d+)?\s*%\s*[a-z-]*\b(detect|accura|success|reliab)/i,
      /\b(detects?|resolves?|identifies?|spots?)\b[^.]{0,60}\b(at|from|up to)\s+\d+(\.\d+)?\s*m\b/i,
      /\bdetection (rate|accuracy|performance|range|capability|distance)\b[^.]{0,40}\b(is|are|of|at)\s*\d/i,
      /\b(guaranteed|reliable|foolproof|perfect)\s+(detection|detections)\b/i
    ]
  },
  {
    id: "unsourced-price-or-regulation",
    say: "a price, fee or regulation must carry the date it was checked",
    /* The date may sit anywhere in the answer - the source line convention - so
       this is the one ban whose allowance is tested against the whole text. */
    allowScope: "text",
    allow: DATE_RE,
    re: [
      /\bCA?\$\s?\d/i,
      /\b(fees?|fines?|prices?|costs?)\b[^.]{0,30}\d/i,
      /* A regulation claim WITHOUT its identifier ("regulation 601.15 ...").
         "CAR 601.15" names its own source and passes on its own. */
      /\b(regulations?|the rule|the law)\s+(number\s+)?\d/i
    ]
  },
  {
    id: "flying-near-a-wildfire",
    say: "flying near or over a wildfire is not allowed (CAR 601.15)",
    allow: /\b(never|do not|don'?t|must not|shall not|is not allowed|not allowed|illegal|prohibited|banned|refus|avoid|CAR 601\.15|keep away|stay away)\b/i,
    re: [
      /\b(fly|flying|flown|flight|airborne|launch(?:ing)?|drone)\b[^.]{0,60}\b(over|near|above|close to|within|towards?|into|across)\b[^.]{0,40}\b(wildfire|forest fire|wildland fire|active fire|fire perimeters?|fire grounds?|the fire|the flames)/i
    ]
  },
  {
    id: "certification-or-approval-claim",
    say: "claiming certification or legal approval - this build is neither certified nor approved",
    allow: /\b(not certified|not approved|no (certification|approval)|never claim|do not claim|don'?t claim|without (certification|approval)|is not (certified|approved|legal)|is neither|refus|cannot claim|can'?t claim|uncontrolled|hobby)\b/i,
    re: [
      /\b(we|it|this|the (build|system|drone|guide|project|aircraft|payload))\b[^.]{0,40}\b(is|are|has been|now|fully)\b[^.]{0,24}\b(certified|approved|authorized|licensed|cleared|compliant)\b/i,
      /\b(fully|legally) (compliant|approved|certified|authorized)\b/i,
      /\bcertified (drone|pilot|operator|system|aircraft)\b/i
    ]
  },
  {
    id: "edit-without-approval",
    say: "edits happen only through a proposal you accept - claim no change has landed without one",
    allow: /\b(proposal|proposed|pending|not yet|branch|after you accept|until you accept|waiting for|would be|once accepted|can be accepted|draft)\b/i,
    re: [
      /\b(I (have|'ve)|I'?ve)\s+(edited|changed|updated|rewritten|fixed|altered|added (to|in))\b/i,
      /\b(the (guide|document|page|file|source|section))\b[^.]{0,30}\b(has been|is now|was)\b[^.]{0,20}\b(edited|updated|changed|rewritten|modified|fixed)\b/i
    ]
  }
];

/** Screen text against all five bans. */
function screenText(text) {
  const full = String(text || "");
  const hits = [];
  BANS.forEach(function (ban) {
    const allowEverywhere = ban.allowScope === "text" && ban.allow && ban.allow.test(full);
    if (allowEverywhere) { return; }
    sentences(full).forEach(function (sentence) {
      const matches = ban.re.some(function (re) { return re.test(sentence); });
      if (!matches) { return; }
      if (ban.allowScope !== "text" && ban.allow && ban.allow.test(sentence)) { return; }
      hits.push({ id: ban.id, say: ban.say, sentence: sentence.slice(0, 200) });
    });
  });
  return { ok: hits.length === 0, hits: hits };
}

/** What replaces a blocked answer. Loud and specific - never a silent rewrite. */
function blockNotice(hits) {
  const says = [];
  (hits || []).forEach(function (h) { if (says.indexOf(h.say) === -1) { says.push(h.say); } });
  return "That answer was blocked by the guide's safety checks (the five code-enforced " +
    "bans): " + says.join("; ") + ". Nothing was shown as fact and nothing was cached.";
}
/* ---- BANS:END (generated) ---- */

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

    /* The five code-enforced bans (decision 25) - the same detectors the local
       server runs, generated from server/bans.js into the region above. A
       banned claim is replaced with a loud block notice, never returned raw. */
    const banned = screenText(
      [String(parsed.answer)].concat(
        Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
        [String(parsed.note || "")]
      ).join("\n")
    );
    if (!banned.ok) {
      return Response.json(sanitise({
        answer: blockNotice(banned.hits),
        steps: [], sources: [], see: [], chips: [], note: ""
      }), { headers: { ...cors, "cache-control": "no-store" } });
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
