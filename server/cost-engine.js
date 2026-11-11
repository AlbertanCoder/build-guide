/**
 * Cost engine — the part that makes a cheap model behave like an expensive one.
 *
 * Zero dependencies on purpose: the assistant server is a single `node` command
 * with nothing to install, and this module has to run in Node, in a Cloudflare
 * Worker and inside a test script without a build step.
 *
 * Four ideas, in order of how much money they save:
 *
 *   1. don't ask      — the curated answer already on the user's machine is free
 *   2. don't re-ask   — a question asked before costs nothing the second time
 *   3. ask cheaply    — pay $0.10/MTok by default, escalate rarely
 *   4. ask less       — send fewer passages, fewer turns, fewer words
 *
 * Everything here is deterministic and inspectable. Nothing calls a model.
 */
"use strict";

/* ---------------------------------------------------------------------------
   PRICES — used only to *estimate* spend for the budget guard and /api/stats.
   Verified 2026-11-01 against developers.openai.com/api/docs/pricing and
   platform.claude.com/docs/en/about-claude/pricing. USD per 1M tokens.
   A wrong number here does not change what a provider charges; it only makes
   the local estimate drift, so re-check these when you change MODEL.
   --------------------------------------------------------------------------- */
const PRICES = {
  /* OpenAI */
  "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
  "gpt-6-luna": { input: 0.1, cached: 0.01, output: 0.5 },
  "gpt-4.1-nano": { input: 0.1, cached: 0.025, output: 0.4 },
  "gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2.0 },
  "gpt-5.4-mini": { input: 0.75, cached: 0.075, output: 4.5 },
  "gpt-4.1-mini": { input: 0.4, cached: 0.1, output: 1.6 },
  "gpt-6.1-terra": { input: 1.0, cached: 0.05, output: 5.0 },
  "gpt-5.2": { input: 1.75, cached: 0.175, output: 14.0 },
  "gpt-6.1-sol": { input: 2.0, cached: 0.1, output: 10.0 },
  /* Anthropic — cache reads are 0.1x input; writes are 1.25x (5m) or 2x (1h).
     The estimate below bills writes at 1.25x and reads at the listed hits. */
  "claude-haiku-5.5": { input: 0.1, cached: 0.01, output: 0.5, write: 0.125 },
  "claude-haiku-4.5": { input: 1.0, cached: 0.1, output: 5.0, write: 1.25 },
  "claude-sonnet-5.5": { input: 2.0, cached: 0.1, output: 10.0, write: 2.5 },
  /* DeepSeek direct, from DeepSeek's own page https://api-docs.deepseek.com/quick_start/pricing (checked
     2026-11-03; the page has no "last updated" date). "cached" is their cache-hit price. Billed here at their
     PEAK rate (01:00-04:00 and 06:00-10:00 UTC, Monday to Friday: Edmonton weekday evenings) so a cap is never
     under-counted; off-peak is half. */
  "deepseek-flash": { input: 0.3, cached: 0.006, output: 1.2 },
  "deepseek-v4-pro": { input: 1.32, cached: 0.044, output: 3.96 },
  /* The same model through OpenRouter, from OpenRouter's public list https://openrouter.ai/api/v1/models
     (checked 2026-11-03). The full "maker/model" name is matched before the bare one. */
  "deepseek/deepseek-v4.1-flash-1017": { input: 0.15, cached: 0.003, output: 0.6 },
  /* Anything unlisted: assume the mid-tier we used to hardcode. */
  __default: { input: 0.15, cached: 0.075, output: 0.6 }
};

/* OpenRouter names models "maker/model" and sometimes adds ":variant"; the
   bare name is what the table lists. */
function priceFor(model) {
  const key = String(model || "").toLowerCase();
  const bare = key.replace(/^[^/]+\//, "").replace(/:.*$/, "");
  return PRICES[key] || PRICES[bare] || PRICES.__default;
}

/* ---------------------------------------------------------------------------
   TEXT — the same stemming the browser uses, so a question and its stored
   signature agree exactly on both sides of the wire.
   --------------------------------------------------------------------------- */
const STOP = new Set(
  (",a,an,the,and,or,but,if,then,than,so,as,at,by,for,from,in,into,of,on,onto,to,with," +
    "is,are,was,were,be,been,being,am,do,does,did,doing,have,has,had,it,its,this,that," +
    "these,those,i,im,ive,me,my,we,our,you,your,he,she,they,them,their,what,which,who," +
    "whom,when,where,why,how,not,no,yes,can,could,should,would,will,just,also,very," +
    "really,about,get,got,up,down,out,off,over,under,again,still,any,some,more,most," +
    "all,one,two,use,using,need,needs,want,wants,make,makes,goes,going,go,please,tell")
    .split(",")
);

function normalize(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[^a-z0-9'.+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Deliberately crude: enough to join noise/noisy, sensor/sensors, bind/binding
   without shipping a stemmer or a dictionary. */
function stem(w) {
  if (w.length <= 3) return w;
  if (/ies$/.test(w)) return w.slice(0, -3) + "y";
  if (/(sses|shes|ches|xes)$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
  if (/ing$/.test(w) && w.length > 5) return w.slice(0, -3);
  if (/ed$/.test(w) && w.length > 4) return w.slice(0, -2);
  return w;
}

function tokens(s) {
  const out = [];
  for (const raw of normalize(s).split(" ")) {
    /* normalize() keeps dots on purpose, so "2.4" and "0x33" survive. That
       leaves "stock." as its own token, which would miss "stock" in the cache.
       Strip leading and trailing punctuation from the word, not the inside. */
    const w = raw.replace(/^[.']+|[.']+$/g, "");
    if (!w || w.length < 2) continue;
    const st = stem(w);
    if (STOP.has(w) || STOP.has(st)) continue;
    out.push(st);
  }
  return out;
}

function uniqTokens(s) {
  return Array.from(new Set(tokens(s)));
}

/* A question's identity: order-free, punctuation-free, stemmed. "What does this
   cost?" and "cost what does this" collapse to the same signature on purpose. */
function signature(question) {
  return uniqTokens(question).sort().join(" ");
}

function jaccard(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const b = new Set(bTokens);
  let inter = 0;
  for (const t of new Set(aTokens)) if (b.has(t)) inter += 1;
  const union = new Set(aTokens.concat(bTokens)).size;
  return union ? inter / union : 0;
}

/* ---------------------------------------------------------------------------
   COMPRESSION — send the sentences that answer the question, not the page.

   A guide passage is up to 1,400 characters. Most of it is preamble that the
   model pays for and ignores. Keeping only the sentences that share words with
   the question cuts input tokens hard, and usually *improves* the answer
   because the relevant sentence stops being buried.
   --------------------------------------------------------------------------- */

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(\u2014-])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Keep the best-scoring sentences in their original order, so a numbered
   procedure never gets reordered. Immediate neighbours are kept too, because
   "Set REFRESH_2_HZ." is useless without the sentence before it. */
function compressPassage(text, qTokens, maxChars) {
  const q = new Set(qTokens);
  const sentences = splitSentences(text);
  const budget = Math.max(200, maxChars || 600);
  if (!sentences.length) return "";

  const scored = sentences.map((s, i) => {
    const t = tokens(s);
    if (!t.length) return { i: i, score: 0 };
    let hits = 0;
    for (const w of t) if (q.has(w)) hits += 1;
    return { i: i, score: hits / Math.sqrt(t.length) };
  });

  const keep = new Set();
  scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .forEach((x) => {
      if (x.score > 0) {
        keep.add(x.i);
        if (x.i > 0) keep.add(x.i - 1);
        if (x.i < sentences.length - 1) keep.add(x.i + 1);
      }
    });

  /* Nothing matched: keep the opening sentences, which carry the heading and
     the point, rather than returning an empty passage. */
  const order = keep.size
    ? Array.from(keep).sort((a, b) => a - b)
    : sentences.map((_, i) => i);

  let out = "";
  for (const i of order) {
    const next = (out ? " " : "") + sentences[i];
    if (out && out.length + next.length > budget) break;
    out += next;
  }
  return out || String(text).slice(0, budget);
}

function shingles(text, n) {
  const w = normalize(text).split(" ").filter(Boolean);
  const size = n || 5;
  const out = new Set();
  for (let i = 0; i + size <= w.length; i += 1) out.add(w.slice(i, i + size).join(" "));
  if (!out.size && w.length) out.add(w.join(" "));
  return out;
}

/* Two passages that overlap heavily cost twice and teach once. */
function dedupePassages(passages, threshold) {
  const kept = [];
  const limit = threshold == null ? 0.5 : threshold;
  for (const p of passages) {
    const ps = shingles(p.text);
    let dup = false;
    for (const k of kept) {
      if (!k.__sh) k.__sh = shingles(k.text);
      let inter = 0;
      for (const s of ps) if (k.__sh.has(s)) inter += 1;
      const union = ps.size + k.__sh.size - inter;
      if (union && inter / union >= limit) { dup = true; break; }
    }
    if (!dup) kept.push(p);
  }
  for (const k of kept) delete k.__sh;
  return kept;
}

/**
 * The whole passage budget: dedupe, compress each, then hard-cap the total.
 * Returns saved chars so the caller can log the win instead of claiming one.
 */
function compressPassages(passages, question, opts) {
  const o = opts || {};
  const perPassage = o.perPassageChars || 600;
  const totalChars = o.totalChars || 2600;
  const maxCount = o.maxCount || 3;
  const q = uniqTokens(question);
  const list = Array.isArray(passages) ? passages : [];

  const sentChars = list.reduce((n, p) => n + String(p.text || "").length, 0);
  const deduped = dedupePassages(list);

  const out = [];
  let used = 0;
  for (const p of deduped) {
    if (out.length >= maxCount) break;
    const text = compressPassage(p.text, q, perPassage);
    if (!text) continue;
    if (used + text.length > totalChars && out.length) break;
    used += text.length;
    out.push({
      label: p.label,
      tab: p.tab,
      step: p.step == null ? null : p.step,
      text: text
    });
  }

  return { passages: out, sentChars: sentChars, savedChars: Math.max(0, sentChars - used) };
}

/* Six full turns is roughly 600 tokens re-sent on every question. Two turns
   plus a one-line recap keeps follow-ups working for a fraction of that. */
function compressHistory(history, opts) {
  const o = opts || {};
  const keep = o.keepTurns || 2;
  const charCap = o.charCap || 400;
  const list = (Array.isArray(history) ? history : []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && m.content
  );
  const trim = (m) => ({ role: m.role, content: String(m.content).slice(0, charCap) });
  if (list.length <= keep) return list.map(trim);

  const dropped = list.slice(0, list.length - keep);
  const recap = dropped
    .filter((m) => m.role === "user")
    .map((m) => String(m.content).slice(0, 60))
    .slice(-3)
    .join("; ");
  const tail = list.slice(-keep).map(trim);
  return recap ? [{ role: "user", content: "Earlier questions: " + recap }].concat(tail) : tail;
}

/* ---------------------------------------------------------------------------
   ROUTER — who answers, and how expensively.

   Default is the cheap tier, because most questions are a lookup in passages
   already in hand. The strong tier is for questions needing reasoning across
   passages, or ones the cheap tier already refused.
   --------------------------------------------------------------------------- */

const MULTI_HOP =
  /(compare|versus|\bvs\.?\b|better|worse|trade-?\s?off|instead of|alternative|should i|worth it|why|explain|plan around|between|which one)/;

function routeDecision(input) {
  const o = input || {};
  const question = String(o.question || "");
  const q = normalize(question);
  const curatedHit = !!o.curatedHit;
  const topScore = Number(o.topScore || 0);

  if (o.forceStrong) return { tier: "strong", reason: "forced" };
  if (o.triedCheap && o.cheapRefused) return { tier: "strong", reason: "cheap tier refused" };

  /* A curated entry is the cheapest answer and the most reliable one: a human
     wrote it for this exact build, so a small model is enough to phrase it. */
  if (curatedHit) return { tier: "cheap", reason: "curated entry available" };

  /* Weak or scattered evidence needs reasoning across passages, which is
     exactly where a small model drifts. */
  if (topScore > 0 && topScore < 1.5) return { tier: "strong", reason: "low retrieval score" };
  if (MULTI_HOP.test(q) || question.length > 180) {
    return { tier: "strong", reason: "multi-hop question" };
  }
  return { tier: "cheap", reason: "default" };
}

/* ---------------------------------------------------------------------------
   METER — what it cost, in dollars, so a budget can be enforced and shown.
   Estimator only: the provider's invoice is the truth. It exists so the guard
   stops at a threshold *before* a surprise bill, not to reconcile one.
   --------------------------------------------------------------------------- */

function todayKey(now) {
  return new Date(now || Date.now()).toISOString().slice(0, 10);
}

function estimateUsd(model, usage) {
  const p = priceFor(model);
  const u = usage || {};
  const input = Number(u.inputTokens || 0);
  const cached = Number(u.cachedTokens || 0);
  const output = Number(u.outputTokens || 0);
  const write = Number(u.cacheWriteTokens || 0);
  /* Cached tokens are a *subset* of input tokens already billed at the full
     rate by some providers, so bill the fresh remainder plus the cache rate. */
  const fresh = Math.max(0, input - cached);
  const usd =
    (fresh * p.input) / 1e6 +
    (cached * p.cached) / 1e6 +
    (write * (p.write == null ? p.input * 1.25 : p.write)) / 1e6 +
    (output * p.output) / 1e6;
  return usd;
}

class CostMeter {
  constructor(opts) {
    const o = opts || {};
    this.dailyUsdMax = Number(o.dailyUsdMax || 0); // 0 or negative = no cap
    this.day = todayKey();
    this.reset();
  }

  reset() {
    this.totals = { calls: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0, usd: 0 };
    this.models = {};
    this.counters = { questions: 0, cacheHits: 0, localAnswers: 0, escalated: 0, blocked: 0 };
  }

  roll() {
    const k = todayKey();
    if (k !== this.day) { this.day = k; this.reset(); }
  }

  record(model, usage) {
    this.roll();
    const usd = estimateUsd(model, usage);
    const u = usage || {};
    const m = this.models[model] || (this.models[model] = {
      calls: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0, usd: 0
    });
    m.calls += 1;
    m.inputTokens += Number(u.inputTokens || 0);
    m.cachedTokens += Number(u.cachedTokens || 0);
    m.outputTokens += Number(u.outputTokens || 0);
    m.usd += usd;

    this.totals.calls += 1;
    this.totals.inputTokens += Number(u.inputTokens || 0);
    this.totals.cachedTokens += Number(u.cachedTokens || 0);
    this.totals.outputTokens += Number(u.outputTokens || 0);
    this.totals.usd += usd;
    return usd;
  }

  count(name, n) {
    this.roll();
    if (this.counters[name] == null) this.counters[name] = 0;
    this.counters[name] += n == null ? 1 : n;
  }

  /** True when the daily cap is reached: the caller must degrade, not fail. */
  blocked() {
    this.roll();
    return this.dailyUsdMax > 0 && this.totals.usd >= this.dailyUsdMax;
  }

  remaining() {
    if (!(this.dailyUsdMax > 0)) return Infinity;
    this.roll();
    return Math.max(0, this.dailyUsdMax - this.totals.usd);
  }

  snapshot() {
    this.roll();
    return {
      day: this.day,
      dailyUsdMax: this.dailyUsdMax,
      remainingUsd: this.remaining() === Infinity ? null : Number(this.remaining().toFixed(6)),
      blocked: this.blocked(),
      totals: {
        calls: this.totals.calls,
        inputTokens: this.totals.inputTokens,
        cachedTokens: this.totals.cachedTokens,
        outputTokens: this.totals.outputTokens,
        usd: Number(this.totals.usd.toFixed(6))
      },
      counters: Object.assign({}, this.counters),
      models: Object.keys(this.models).reduce((acc, k) => {
        const m = this.models[k];
        acc[k] = {
          calls: m.calls,
          inputTokens: m.inputTokens,
          cachedTokens: m.cachedTokens,
          outputTokens: m.outputTokens,
          usd: Number(m.usd.toFixed(6))
        };
        return acc;
      }, {})
    };
  }
}

/* ---------------------------------------------------------------------------
   CACHE — a question already answered costs nothing the second time.

   Two levels, cheapest first:
     exact      same stemmed signature            (score 1)
     near-dupe  Jaccard >= threshold on tokens    ("what does it cost?" vs
                                                  "what is the cost?")
   Near-dupes are what actually earn here: people rephrase the same question
   rather than retyping it. The threshold is deliberately high — a wrong cached
   answer is worse than a paid fresh one.
   --------------------------------------------------------------------------- */

class AnswerCache {
  constructor(opts) {
    const o = opts || {};
    this.file = o.file || "";
    this.ttlMs = o.ttlMs == null ? 30 * 24 * 60 * 60 * 1000 : o.ttlMs;
    this.maxEntries = o.maxEntries || 400;
    this.threshold = o.threshold == null ? 0.85 : o.threshold;
    this.entries = [];
    this.hits = 0;
    this.misses = 0;
    this.stores = 0;
    this._timer = null;
    if (this.file && o.persist !== false) this.load();
  }

  _now() {
    return Date.now();
  }

  _fresh(e) {
    return this._now() - e.at < this.ttlMs;
  }

  load() {
    try {
      const fs = require("fs");
      if (!fs.existsSync(this.file)) return 0;
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      const list = raw && Array.isArray(raw.entries) ? raw.entries : [];
      this.entries = list.filter(
        (e) => e && typeof e.sig === "string" && e.payload && typeof e.payload.answer === "string"
      );
      this.purge();
      return this.entries.length;
    } catch (e) {
      /* A corrupt cache must never stop the assistant from starting. */
      this.entries = [];
      return 0;
    }
  }

  /* scope (optional; Fable audit S4, 10 Nov 2026): a string that must be the same for an entry to count. The server
     passes where the user is, the step on screen, the memory version and the guide's fingerprint. Before, those were
     glued onto the question itself, their words outnumbered the question's, and two different questions scored as
     near-duplicates. With no scope given, the cache behaves exactly as before. */
  get(question, scope) {
    const sig = signature(question);
    if (!sig) return null;
    const sc = scope == null ? "" : String(scope);
    const toks = sig.split(" ");
    let best = null;
    let bestScore = 0;
    for (const e of this.entries) {
      if (!this._fresh(e)) continue;
      if ((e.scope || "") !== sc) continue;
      const score = e.sig === sig ? 1 : jaccard(toks, e.tokens || e.sig.split(" "));
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (!best || bestScore < this.threshold) { this.misses += 1; return null; }
    best.used = this._now();
    best.hits = (best.hits || 0) + 1;
    this.hits += 1;
    return {
      answer: best.payload.answer,
      model: best.payload.model || "",
      sources: best.payload.sources || [],
      see: best.payload.see || [],
      question: best.question,
      usd: best.payload.usd || 0,
      at: best.at,
      hits: best.hits,
      score: bestScore,
      exact: bestScore === 1
    };
  }

  set(question, payload, scope) {
    const sig = signature(question);
    if (!sig || !payload || !payload.answer) return false;
    const sc = scope == null ? "" : String(scope);
    const existing = this.entries.findIndex((e) => e.sig === sig && (e.scope || "") === sc);
    const entry = {
      sig: sig,
      scope: sc,
      tokens: sig.split(" "),
      question: String(question).slice(0, 300),
      payload: {
        answer: String(payload.answer).slice(0, 4000),
        model: payload.model || "",
        sources: payload.sources || [],
        see: payload.see || [],
        usd: payload.usd || 0
      },
      at: this._now(),
      used: this._now(),
      hits: 0
    };
    if (existing >= 0) this.entries[existing] = entry;
    else this.entries.push(entry);

    /* Evict the least recently used, not the oldest written: a question asked
       every day should survive. */
    if (this.entries.length > this.maxEntries) {
      this.entries.sort((a, b) => (a.used || a.at) - (b.used || b.at));
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }
    this.stores += 1;
    this.schedule();
    return true;
  }

  purge() {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => this._fresh(e));
    return before - this.entries.length;
  }

  schedule() {
    if (!this.file || this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush();
    }, 2000);
    if (this._timer.unref) this._timer.unref();
  }

  flush() {
    if (!this.file) return false;
    try {
      const fs = require("fs");
      const path = require("path");
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(
        this.file,
        JSON.stringify({ version: 1, savedAt: this._now(), entries: this.entries }),
        "utf8"
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.entries.length,
      maxEntries: this.maxEntries,
      ttlDays: Math.round(this.ttlMs / 86400000),
      hits: this.hits,
      misses: this.misses,
      stores: this.stores,
      hitRate: total ? Number((this.hits / total).toFixed(3)) : 0
    };
  }
}

module.exports = {
  PRICES,
  priceFor,
  normalize,
  stem,
  tokens,
  uniqTokens,
  signature,
  jaccard,
  splitSentences,
  compressPassage,
  dedupePassages,
  compressPassages,
  compressHistory,
  routeDecision,
  estimateUsd,
  todayKey,
  CostMeter,
  AnswerCache
};




