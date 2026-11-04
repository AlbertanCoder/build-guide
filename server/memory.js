"use strict";
/* Job 8 (2026-11-03): what the Guide Assistant keeps between conversations, on the laptop only.
   Folder server/.memory/ (git-ignored; the static server refuses any dot-folder and all of server/):
     facts.json     what Shad told it about his build (he can list, delete one, or forget everything)
     progress.json  the guide's ticks from every device, merged per tick, latest change wins
     devices.json   paired phones: a name and the SHA-256 of a long random token (the token itself is never stored)
     spend.json     this month's AI spend, for the hard monthly cap
   The pairing code lives in memory only: one use, five minutes, five wrong tries lock pairing for ten minutes.
   Pure apart from the files in `dir`; `now` is injectable so the tests can move the clock. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LIMITS = {
  facts: 200, factChars: 240, perAnswer: 2,
  codeTtlMs: 5 * 60 * 1000, codeTries: 5, lockMs: 10 * 60 * 1000,
  devices: 10, deviceName: 40, progressKeys: 600
};
const KINDS = ["build", "preference", "problem"];
/* things never to remember: keys and passwords, email addresses, street addresses, phone numbers */
const NEVER = [
  /\b(api[ _-]?key|password|passcode|secret|token)\b/i,
  /\b(sk|pk|rk)-[A-Za-z0-9_-]{8,}/, /[A-Za-z0-9_-]{32,}/,
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
  /\b\d{1,6}\s+[A-Za-z0-9 .'-]{2,40}\s(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|crescent|cres|lane|ln|trail|nw|ne|sw|se)\b/i,
  /\b\d{3}[ .-]?\d{3}[ .-]?\d{4}\b/
];

function words(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9.\s-]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2).map((w) => w.replace(/(ing|ed|es|s)$/, ""));
}
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

function createMemory(opts) {
  const dir = opts.dir;
  const now = opts.now || (() => Date.now());
  const file = (n) => path.join(dir, n);
  function read(n, dflt) {
    try { return JSON.parse(fs.readFileSync(file(n), "utf8")); } catch (e) { return dflt; }
  }
  function write(n, v) {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = file(n) + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(v, null, 1), "utf8");
    fs.renameSync(tmp, file(n));
  }

  /* ---------- facts ---------- */
  const facts = {
    list() { return read("facts.json", []).slice().sort((a, b) => b.at - a.at); },
    add(text, o) {
      o = o || {};
      const t = String(text || "").replace(/\s+/g, " ").trim().replace(/^[-*•]\s*/, "").slice(0, LIMITS.factChars);
      if (t.length < 4) return { ok: false, reason: "empty" };
      if (NEVER.some((r) => r.test(t))) return { ok: false, reason: "never kept: looks like a key, an address, an email or a phone number" };
      const all = read("facts.json", []);
      const same = all.find((f) => f.text.toLowerCase() === t.toLowerCase());
      if (same) { same.at = now(); write("facts.json", all); return { ok: true, fact: same, existed: true }; }
      const fact = { id: crypto.randomBytes(5).toString("hex"), text: t,
        kind: KINDS.includes(o.kind) ? o.kind : "build", from: o.from === "phone" ? "phone" : "laptop", at: now() };
      all.push(fact);
      while (all.length > LIMITS.facts) {                     // full: the oldest problem goes first, then the oldest
        const probs = all.filter((f) => f.kind === "problem").sort((a, b) => a.at - b.at);
        const drop = probs[0] || all.slice().sort((a, b) => a.at - b.at)[0];
        all.splice(all.indexOf(drop), 1);
      }
      write("facts.json", all);
      return { ok: true, fact };
    },
    remove(id) {
      const all = read("facts.json", []), n = all.length;
      const left = all.filter((f) => f.id !== String(id));
      if (left.length === n) return false;
      write("facts.json", left); return true;
    },
    clear() { write("facts.json", []); },
    /* the facts that matter for a question: word overlap first, then the newest; at most n */
    relevant(question, n) {
      const q = new Set(words(question));
      const all = facts.list();
      const scored = all.map((f, i) => ({ f, s: words(f.text).filter((w) => q.has(w)).length * 10 - i * 0.01 }));
      return scored.sort((a, b) => b.s - a.s).slice(0, n || 10).map((x) => x.f);
    },
    /* changes whenever a fact is added, touched or removed (part of the answer cache's key) */
    version() { return sha(JSON.stringify(read("facts.json", []).map((f) => f.id + f.at))).slice(0, 12); }
  };

  /* ---------- progress (ticks from every device) ---------- */
  const KEY_OK = /^[A-Za-z0-9:_.-]{1,60}$/;
  const progress = {
    get() { return read("progress.json", { ticks: {} }); },
    /* changes: { key: { v: true|false, at: ms } }; a change older than what is stored loses */
    merge(changes) {
      const p = progress.get();
      p.ticks = p.ticks || {};
      let applied = 0;
      const limit = now() + 60 * 1000;                        // a clock a little ahead is fine; far in the future is not
      Object.keys(changes || {}).forEach((k) => {
        const c = changes[k];
        if (!KEY_OK.test(k) || !c || typeof c.v !== "boolean" || !Number.isFinite(c.at) || c.at > limit) return;
        if (!p.ticks[k] && Object.keys(p.ticks).length >= LIMITS.progressKeys) return;
        if (!p.ticks[k] || c.at > p.ticks[k].at) { p.ticks[k] = { v: c.v, at: c.at }; applied++; }
      });
      if (applied) write("progress.json", p);
      return { applied, ticks: p.ticks };
    }
  };

  /* ---------- pairing and devices ---------- */
  let code = null;                                            // { value, expiresAt } in memory only
  let tries = 0, lockedUntil = 0;
  const devices = {
    startPairing() {
      if (now() < lockedUntil) return { ok: false, reason: "locked", retryInS: Math.ceil((lockedUntil - now()) / 1000) };
      code = { value: String(crypto.randomInt(0, 1000000)).padStart(6, "0"), expiresAt: now() + LIMITS.codeTtlMs };
      tries = 0;
      return { ok: true, code: code.value, expiresInS: LIMITS.codeTtlMs / 1000 };
    },
    pair(given, name) {
      if (now() < lockedUntil) return { ok: false, reason: "locked", retryInS: Math.ceil((lockedUntil - now()) / 1000) };
      if (!code) return { ok: false, reason: "no code: start pairing on the laptop first" };
      if (now() > code.expiresAt) { code = null; return { ok: false, reason: "the code expired: make a new one on the laptop" }; }
      const g = Buffer.from(String(given || "").replace(/\D/g, "").padEnd(6, "x").slice(0, 6));
      const ok = crypto.timingSafeEqual(g, Buffer.from(code.value));
      if (!ok) {
        tries++;
        if (tries >= LIMITS.codeTries) { lockedUntil = now() + LIMITS.lockMs; code = null; tries = 0;
          return { ok: false, reason: "locked", retryInS: LIMITS.lockMs / 1000 }; }
        return { ok: false, reason: "wrong code", triesLeft: LIMITS.codeTries - tries };
      }
      code = null; tries = 0;                                 // one use
      const token = crypto.randomBytes(32).toString("base64url");
      const all = read("devices.json", []);
      const dev = { id: crypto.randomBytes(4).toString("hex"),
        name: String(name || "Phone").replace(/[^\w .'-]/g, "").trim().slice(0, LIMITS.deviceName) || "Phone",
        hash: sha(token), at: now(), lastSeen: now() };
      all.push(dev);
      while (all.length > LIMITS.devices) all.shift();
      write("devices.json", all);
      return { ok: true, token, id: dev.id, name: dev.name };
    },
    verify(token) {
      if (!token || String(token).length < 20) return null;
      const h = sha(token);
      const all = read("devices.json", []);
      const d = all.find((x) => x.hash.length === h.length && crypto.timingSafeEqual(Buffer.from(x.hash), Buffer.from(h)));
      if (!d) return null;
      if (now() - d.lastSeen > 60 * 1000) { d.lastSeen = now(); write("devices.json", all); }
      return { id: d.id, name: d.name };
    },
    list() { return read("devices.json", []).map((d) => ({ id: d.id, name: d.name, at: d.at, lastSeen: d.lastSeen })); },
    remove(id) {
      const all = read("devices.json", []), left = all.filter((d) => d.id !== String(id));
      if (left.length === all.length) return false;
      write("devices.json", left); return true;
    },
    get pairingOpen() { return !!code && now() <= code.expiresAt; },
    get locked() { return now() < lockedUntil; }
  };

  /* ---------- this month's spend ---------- */
  const monthKey = () => { const d = new Date(now()); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  const spend = {
    get() { const s = read("spend.json", null); return s && s.month === monthKey() ? s : { month: monthKey(), usd: 0 }; },
    record(usd) {
      const s = spend.get();
      s.usd = Number((s.usd + Math.max(0, Number(usd) || 0)).toFixed(6));
      write("spend.json", s);
      return s;
    },
    blocked(capUsd) { return capUsd > 0 && spend.get().usd >= capUsd; }
  };

  return { facts, progress, devices, spend, dir };
}

/* [[REMEMBER ...]] lines the model may add at the very end of an answer: taken out of the text, at most two kept */
function extractRemember(text) {
  const found = [];
  const out = String(text || "").replace(/^[ \t]*\[\[REMEMBER\s+([^\]\n]{3,300})\]\][ \t]*$/gim, (m, f) => { found.push(f.trim()); return ""; })
    .replace(/\n{3,}/g, "\n\n").trim();
  return { text: out, facts: found.slice(0, LIMITS.perAnswer) };
}

module.exports = { createMemory, extractRemember, LIMITS };
