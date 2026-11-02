// The five code-enforced bans (decision 25): every ban refuses bad claims, lets
// the guide's own honest sentences through, and is provably not inert.
//
//   node scripts/dev/check-bans.js
//
// Also screens the shipped content (the 44 offline answers, the quiz bank) and
// the enforcement points (quiz-add.validate, prose-rewrite, and the AI answer
// path end to end through the mock provider).
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const BANS = require("../../server/bans.js");
const quizAdd = require("../../server/ops/quiz-add.js");
const proseRewrite = require("../../server/ops/prose-rewrite.js");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

/* bad: must be refused, each naming its own ban. good: must pass - including
   sentences that exercise the ALLOWANCE (the claim pattern fires, the honest
   marker next to it lets the sentence through). */
const CASES = [
  {
    id: "detection-performance",
    bad: [
      "This drone detects a 1 m target at 40 m every time.",
      "Detection accuracy is 95% in all conditions and weather."
    ],
    good: [
      "In our test flights we measured 40% detection on cold targets at dusk.",
      "Detection is not guaranteed at 100 m; lower the aircraft only where legal and safe."
    ]
  },
  {
    id: "unsourced-price-or-regulation",
    bad: [
      "The registration fee is CA$5 per flight.",
      "The fine for that mistake is $3000 under the rules."
    ],
    good: [
      "The frame cost CA$438.90 when checked on 2026-10-31.",
      "CAR 601.15 forbids it; the Parks Canada fee (checked 31 October 2026) is separate."
    ]
  },
  {
    id: "flying-near-a-wildfire",
    bad: [
      "You can fly the drone over the wildfire to get better footage.",
      "Launch the aircraft into the smoke above the fire perimeter."
    ],
    good: [
      "Never fly near or over a wildfire - CAR 601.15 forbids it.",
      "Do not fly the drone above the active fire; keep away from fire grounds."
    ]
  },
  {
    id: "certification-or-approval-claim",
    bad: [
      "This build is fully compliant and the drone is certified for operations.",
      "The system has been approved for use over people."
    ],
    good: [
      "This build is not certified and carries no legal approval.",
      "Never claim certification or approval you do not have; this is a hobby build."
    ]
  },
  {
    id: "edit-without-approval",
    bad: [
      "I have updated the guide to fix the battery section.",
      "The guide has been rewritten to say something else."
    ],
    good: [
      "A proposal is waiting for you; nothing changes until you accept it.",
      "The guide has been updated - see the proposal waiting for you."
    ]
  }
];

const covered = {};
CASES.forEach(function (c) {
  c.bad.forEach(function (sample) {
    const v = BANS.screenText(sample);
    const hit = v.hits.filter((h) => h.id === c.id).length > 0;
    if (hit) { covered[c.id] = true; }
    check("refuses (" + c.id + "): " + sample.slice(0, 52), v.ok === false && hit,
      v.ok ? "ACCEPTED IT" : v.hits.map((h) => h.id).join(","));
  });
  c.good.forEach(function (sample) {
    const v = BANS.screenText(sample);
    check("allows: " + sample.slice(0, 52), v.ok === true,
      v.ok ? "ok" : v.hits.map((h) => h.id + ": " + h.sentence.slice(0, 40)).join(" | "));
  });
});

check("every declared ban is proven not inert (each refused at least one sample)",
  BANS.BANS.every((b) => covered[b.id] === true),
  BANS.BANS.map((b) => b.id + (covered[b.id] ? "" : " INERT")).join(", "));

const notice = BANS.blockNotice(BANS.screenText(CASES[0].bad[0]).hits);
check("the block notice is loud, names the ban, and says nothing was cached",
  /blocked by the guide's safety checks/.test(notice) &&
  /detection performance/.test(notice) && /nothing was cached/.test(notice));

/* ---- the shipped content: the offline answers and the quiz bank ------------ */
/* A kb(id, title, tags, [steps], { note, why, src }) call. The bans cover what
   the assistant SAYS - the answer fields (steps and the extras). The title is a
   quoted user question and the tags are retrieval keywords; screening those
   would block honest answers to hard questions. */
function kbAnswerText(block) {
  const inner = block.slice(1, -1);
  const args = [];
  let depth = 0;
  let q = null;
  let cur = "";
  for (let i = 0; i < inner.length; i += 1) {
    const c = inner[i];
    if (q) {
      cur += c;
      if (c === "\\") { cur += inner[i + 1]; i += 1; continue; }
      if (c === q) { q = null; }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { q = c; cur += c; continue; }
    if (c === "(" || c === "[" || c === "{") { depth += 1; }
    if (c === ")" || c === "]" || c === "}") { depth -= 1; }
    if (c === "," && depth === 0) { args.push(cur); cur = ""; continue; }
    cur += c;
  }
  args.push(cur);
  return args.slice(3).join(" ");
}

function extractKbBlocks(src) {
  const blocks = [];
  const re = /(^|\n)\s*kb\(/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length - 1;
    let depth = 0;
    let inStr = null;
    for (let i = start; i < src.length; i += 1) {
      const ch = src[i];
      if (inStr) {
        if (ch === "\\") { i += 1; continue; }
        if (ch === inStr) { inStr = null; }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
      if (ch === "(") { depth += 1; }
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) { blocks.push(src.slice(start, i + 1)); break; }
      }
    }
  }
  return blocks;
}

const kbSrc = fs.readFileSync(path.join(ROOT, "docs", "js", "assistant.js"), "utf8");
const kbBlocks = extractKbBlocks(kbSrc);
const kbHits = [];
kbBlocks.forEach(function (block, i) {
  const v = BANS.screenText(kbAnswerText(block));
  if (!v.ok) { kbHits.push("entry " + i + ": " + v.hits.map((h) => h.id).join(",")); }
});
check("the offline knowledge base has answers to screen", kbBlocks.length >= 40, kbBlocks.length + " entries");
check("every shipped offline answer passes the five bans", kbBlocks.length >= 40 && kbHits.length === 0,
  kbHits.length ? kbHits.slice(0, 4).join(" | ") : kbBlocks.length + " entries clean");

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const quizzes = quizAdd.readQuizzes(html).quizzes;
const questionHits = [];
Object.keys(quizzes).forEach(function (k) {
  quizzes[k].forEach(function (q, i) {
    const v = BANS.screenText(String(q.q || "") + " " + String(q.why || ""));
    if (!v.ok) { questionHits.push(k + "#" + i + ": " + v.hits.map((h) => h.id).join(",")); }
  });
});
check("every quiz question and explanation in the bank passes the five bans",
  questionHits.length === 0, questionHits.length ? questionHits.slice(0, 4).join(" | ") : "bank clean");

/* The domain pack: block TEXT only (the source::/verified:: lines are
   provenance, not claims). Every curated page must pass the same screen. */
function domainBlockTexts(dir) {
  const out = [];
  fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().forEach(function (f) {
    let block = null;
    fs.readFileSync(path.join(dir, f), "utf8").split(/\r?\n/).forEach(function (line) {
      if (/^##\s+/.test(line)) {
        if (block) { out.push(block); }
        block = { where: f + " / " + line.replace(/^##\s+/, "").trim(), text: [] };
        return;
      }
      if (!block) { return; }
      if (/^(source|verified|tags)::/.test(line)) { return; }
      block.text.push(line);
    });
    if (block) { out.push(block); }
  });
  return out;
}

const domainBlocks = domainBlockTexts(path.join(ROOT, "docs", "domain"));
const domainHits = [];
domainBlocks.forEach(function (b) {
  const v = BANS.screenText(b.text.join(" "));
  if (!v.ok) { domainHits.push(b.where + ": " + v.hits.map((h) => h.id).join(",")); }
});
check("every domain pack block passes the five bans",
  domainBlocks.length > 0 && domainHits.length === 0,
  domainHits.length ? domainHits.slice(0, 4).join(" | ") : domainBlocks.length + " blocks clean");

/* ---- the public worker carries the same five bans -------------------------
   The Cloudflare Worker answers the public site. Its detectors are GENERATED
   from server/bans.js (scripts/dev/build-worker-bans.js): one source of truth,
   and these checks prove the copy is current, effective, and actually wired
   into the answer path. */
const { spawnSync } = require("child_process");
const genCheck = spawnSync(process.execPath,
  [path.join(ROOT, "scripts", "dev", "build-worker-bans.js"), "--check"],
  { cwd: ROOT, encoding: "utf8" });
check("the Cloudflare worker's bans copy is current (generated from server/bans.js)",
  genCheck.status === 0,
  (String(genCheck.stdout || "") + String(genCheck.stderr || "")).trim().split(/\r?\n/)[0]);

const workerSrc = fs.readFileSync(path.join(ROOT, "docs", "assistant", "worker.js"), "utf8");
const beginAt = workerSrc.indexOf("/* ---- BANS:BEGIN");
const endAt = workerSrc.indexOf("/* ---- BANS:END");
const workerBans = new Function(
  workerSrc.slice(workerSrc.indexOf("function sentences", beginAt), endAt) +
  "\nreturn { screenText: screenText, blockNotice: blockNotice };")();
const workerHitIds = CASES.map(function (c) {
  return workerBans.screenText(c.bad[0]).hits.map(function (h) { return h.id; })[0] || "";
});
check("the worker's own copy refuses one banned sample per ban",
  CASES.every(function (c, i) { return workerHitIds[i] === c.id; }),
  workerHitIds.join(","));
check("the worker's answer path runs the screen and returns the block notice",
  /const banned = screenText\(/.test(workerSrc) &&
  /blockNotice\(banned\.hits\)/.test(workerSrc));

/* ---- the enforcement points ------------------------------------------------ */
const bannedQuestion = {
  op: "quiz-add",
  target: "detect",
  intent: { add: 1, minLevel: 3 },
  question: {
    q: "This drone detects a 1 m target at 40 m every time - which sensor does that? (" + Date.now().toString(36) + ")",
    a: ["The thermal camera", "The GPS", "The barometer", "The compass"], c: 0,
    why: "Detection accuracy is 95% and it always works like this in the field."
  },
  citation: {
    source: "docs/domain/01-thermal-detection-limits.md",
    verified: "2026-11-01",
    mustContain: "0.98 m per pixel"
  },
  level: 3
};
const quizVerdict = quizAdd.validate(bannedQuestion,
  { quizzes: quizzes, corpus: "0.98 m per pixel", correctValues: [] });
check("quiz-add.validate refuses a question carrying a banned claim",
  quizVerdict.ok === false && quizVerdict.errors.some((e) => /banned claim/.test(e)),
  quizVerdict.ok ? "ACCEPTED IT" : quizVerdict.errors.filter((e) => /banned/.test(e))[0]);

const bannedProse = proseRewrite.validate({
  op: "prose-rewrite",
  section: "p-build",
  oldText: /<p\b[^>]*>[\s\S]*?<\/p>/.exec(html.slice(
    proseRewrite.sectionSpan(html, "p-build").start,
    proseRewrite.sectionSpan(html, "p-build").end))[0],
  newText: "<p>This drone detects a 1 m target at 40 m every time, and the guide has been updated to say so.</p>"
}, { html: html });
check("prose-rewrite refuses replacement text carrying a banned claim",
  bannedProse.ok === false && bannedProse.errors.some((e) => /banned claim/.test(e)),
  bannedProse.ok ? "ACCEPTED IT" : bannedProse.errors.filter((e) => /banned/.test(e))[0]);

/* ---- end to end: a banned answer is blocked on the wire -------------------- */
const MOCK_PORT = 8794;
const APP_PORT = 8795;
const BASE = "http://127.0.0.1:" + APP_PORT;

function start(script, args, env) {
  return spawn(process.execPath, [path.join(ROOT, script)].concat(args || []), {
    cwd: ROOT, windowsHide: true,
    env: Object.assign({}, process.env,
      { SETTINGS_FILE: path.join(require("os").tmpdir(), "ga-bans-settings-" + process.pid + ".json"),
        CONVERSATIONS_DIR: path.join(require("os").tmpdir(), "ga-bans-conversations-" + process.pid) },
      env || {})
  });
}
async function waitFor(url, tries) {
  for (let i = 0; i < (tries || 40); i += 1) {
    try { const r = await fetch(url); if (r.ok) { return true; } } catch (e) { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}
function frames(body) {
  return String(body).split(/\r?\n/)
    .filter((l) => l.indexOf("data: ") === 0)
    .map((l) => { try { return JSON.parse(l.slice(6)); } catch (e) { return null; } })
    .filter(Boolean);
}
async function ask(question) {
  const r = await fetch(BASE + "/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: question,
      passages: [{ label: "fixture", tab: "", text: "A synthetic passage long enough to pass the evidence tripwire in the server." }]
    })
  });
  return frames(await r.text());
}

(async () => {
  let mock = null;
  let app = null;
  try {
    mock = start("scripts/dev/mock-llm.js", [String(MOCK_PORT)]);
    app = start("server/assistant-server.js", [], {
      PORT: String(APP_PORT),
      PROVIDER: "openai",
      BASE_URL: "http://127.0.0.1:" + MOCK_PORT + "/v1",
      CHEAP_MODEL: "mock-model",
      STRONG_MODEL: "mock-model",
      MODEL: "mock-model"
    });
    const up = await waitFor("http://127.0.0.1:" + MOCK_PORT + "/v1/models") &&
      await waitFor(BASE + "/api/health");
    check("the mock provider and the assistant server start", up);

    const bannedFrames = await ask("banned-sample: how good is the detector?");
    const replace = bannedFrames.filter((f) => f.type === "replace").pop();
    const meta = bannedFrames.filter((f) => f.type === "meta").pop();
    check("a banned answer is REPLACED with the block notice on the wire",
      !!replace && /blocked by the guide's safety checks/.test(replace.text || ""),
      replace ? (replace.text || "").slice(0, 70) : "no replace frame");
    check("the block notice names the ban and says nothing was cached",
      !!replace && /detection performance/.test(replace.text || "") &&
      /nothing was cached/.test(replace.text || ""));
    check("the meta frame reports the block honestly",
      !!meta && meta.reason === "blocked by the five bans",
      meta ? String(meta.reason) : "no meta frame");

    const cleanFrames = await ask("what does the refresh rate change do?");
    const cleanText = cleanFrames.filter((f) => f.type === "delta").map((f) => f.text).join("");
    const cleanBlocked = cleanFrames.some((f) => f.type === "replace" &&
      /blocked by the guide's safety checks/.test(f.text || ""));
    check("a clean answer is delivered normally (no false positive on the wire)",
      !cleanBlocked && /refresh rate/i.test(cleanText),
      cleanText.slice(0, 60));

    const stats1 = await (await fetch("http://127.0.0.1:" + MOCK_PORT + "/__stats")).json();
    await ask("banned-sample: how good is the detector?");
    const stats2 = await (await fetch("http://127.0.0.1:" + MOCK_PORT + "/__stats")).json();
    check("a banned answer is never cached (the model is asked again)",
      stats2.calls === stats1.calls + 1, stats1.calls + " -> " + stats2.calls + " mock calls");
  } catch (err) {
    check("the end-to-end test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    if (app) { try { app.kill(); } catch (e) { /* already gone */ } }
    if (mock) { try { mock.kill(); } catch (e) { /* already gone */ } }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("the five bans are code-enforced, and none of them is inert.");
})();