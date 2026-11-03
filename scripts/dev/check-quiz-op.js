// Tests for the quiz-add operation: everything it must refuse, and proof that
// applying it cannot touch the real file.
//
//   node scripts/dev/check-quiz-op.js
//
// The last two checks are the important ones: apply() is pure, so the test runs
// it against the real index.html *in memory* and then proves the file on disk is
// byte-identical afterwards.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const op = require("../../server/ops/quiz-add.js");

const ROOT = path.resolve(__dirname, "..", "..");
const INDEX = path.join(ROOT, "index.html");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}
const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const html = fs.readFileSync(INDEX, "utf8");
const corpus = fs.readFileSync(
  path.join(ROOT, "docs", "domain", "01-thermal-detection-limits.md"), "utf8");

const parsed = op.readQuizzes(html);
const START_TOTAL = Object.keys(parsed.quizzes).reduce((n, k) => n + parsed.quizzes[k].length, 0);
const START_DETECT = parsed.quizzes.detect.length;
const NEED_BEFORE = Math.ceil(START_DETECT * 0.75);
const NEED_AFTER = Math.ceil((START_DETECT + 1) * 0.75);

check("reads the real quizzes out of index.html", Object.keys(parsed.quizzes).length === 5,
  Object.keys(parsed.quizzes).join(", "));
/* These used to assert "28 questions" and "5 detect", which meant a legitimate
   accepted question turned the whole gate red. Read the baseline instead. */
check("the guide has questions to work with", START_TOTAL > 0, String(START_TOTAL));
check("the detect quiz has questions to work with", START_DETECT > 0, String(START_DETECT));

/* Deliberately worded differently from the question that gets accepted into the
   repo, plus a nonce. A short nonce alone left 0.90 similarity against the
   accepted question — still over the 0.85 duplicate bar — so the wording has to
   differ too. */
const NONCE = "fixture" + Date.now().toString(36);

const OP = {
  op: "quiz-add",
  target: "detect",
  intent: { add: 1, minLevel: 3, totalBefore: START_TOTAL, totalAfter: START_TOTAL + 1 },
  question: {
    q: "Using the coverage calculator, what is the approximate ground width of one pixel at 30 m altitude with the 55 degree lens? (" + NONCE + ")",
    a: ["About 10 cm", "About 1 m", "About 10 m", "About 30 m"],
    c: 1,
    why: "2 x 30 m x tan(27.5 deg) is about 31.2 m across; over 32 pixels that is about 0.98 m."
  },
  citation: {
    source: "docs/domain/01-thermal-detection-limits.md",
    verified: "2026-11-01",
    mustContain: "0.98 m per pixel"
  },
  level: 3
};

const CTX = { quizzes: parsed.quizzes, corpus: corpus, correctValues: ["0.98 m per pixel", "CA$1,607.26"] };

/* ---- the numbers the proposal must declare, computed not claimed ---------- */
const d = op.describe(OP, CTX);
check("derived totals step by exactly one",
  d.totalBefore === START_TOTAL && d.totalAfter === START_TOTAL + 1,
  d.totalBefore + " -> " + d.totalAfter);
check("the pass bar today is " + NEED_BEFORE + "/" + START_DETECT,
  d.thresholdBefore === NEED_BEFORE, "got " + d.thresholdBefore);
check("the pass bar after the change is " + NEED_AFTER + "/" + (START_DETECT + 1),
  d.thresholdAfter === NEED_AFTER, "got " + d.thresholdAfter);
check("the regression flag matches the arithmetic",
  d.regression === (NEED_AFTER > NEED_BEFORE), String(d.regression));

/* ---- the good case ------------------------------------------------------- */
const good = op.validate(OP, CTX);
check("a sound question validates", good.ok === true, good.ok ? "ok" : good.errors.join(" | "));

/* ---- every way it must refuse ------------------------------------------- */
function mutated(fn) {
  const copy = JSON.parse(JSON.stringify(OP));
  fn(copy);
  return copy;
}
function rejects(label, payload, keyword) {
  const r = op.validate(payload, CTX);
  const hit = r.errors.some((e) => e.indexOf(keyword) !== -1);
  check("refuses: " + label, r.ok === false && hit,
    r.ok ? "accepted it" : (hit ? r.errors[0] : "wrong reason: " + r.errors[0]));
}

rejects("an unknown quiz target", mutated((o) => { o.target = "nope"; }), "unknown quiz");
rejects("three options instead of four", mutated((o) => { o.question.a = ["a", "b", "c"]; }), "exactly 4 options");
rejects("a correct index out of range", mutated((o) => { o.question.c = 9; }), "correct-answer index");
rejects("two identical options", mutated((o) => { o.question.a[2] = "About 1 m"; }), "worded identically");
rejects("no mustContain proof", mutated((o) => { delete o.citation.mustContain; }), "mustContain is missing");
rejects("a proof that is not in the corpus",
  mutated((o) => { o.citation.mustContain = "purple monkey dishwasher"; }), "does not appear in the corpus");
rejects("a distractor that is actually a correct value",
  mutated((o) => { o.question.a[3] = "0.98 m per pixel"; }), "treats as correct");
rejects("a near-duplicate of an existing question",
  mutated((o) => { o.question.q = parsed.quizzes.detect[0].q; }), "too similar");
rejects("a difficulty outside 1-5", mutated((o) => { o.level = 0; }), "level must be an integer");
rejects("an intent that lies about the total",
  mutated((o) => { o.intent.totalAfter = 99; }), "intent.totalAfter says 99");

/* ---- apply(): pure, and the file on disk must not move ------------------ */
const before = hash(fs.readFileSync(INDEX));
const res = op.apply(OP, html);
const after = hash(fs.readFileSync(INDEX));

check("apply accepts the op", res.ok === true, res.ok ? "ok" : res.error);
check("the question count goes to " + (START_DETECT + 1), res.count === START_DETECT + 1, String(res.count));
check("apply reports both edits", res.changes.length === 2, res.changes.join(" ; "));

let reparsed = null;
try { reparsed = op.readQuizzes(res.html); } catch (e) { /* covered below */ }
check("the edited source still parses", !!reparsed);
if (reparsed) {
  const list = reparsed.quizzes.detect;
  const newTotal = Object.keys(reparsed.quizzes).reduce((n, k) => n + reparsed.quizzes[k].length, 0);
  check("detect now has " + (START_DETECT + 1) + " questions", list.length === START_DETECT + 1, String(list.length));
  check("the guide total is now " + (START_TOTAL + 1), newTotal === START_TOTAL + 1, String(newTotal));
  check("the new question was appended last", list[list.length - 1].q === OP.question.q);
  check("the first existing question is untouched", list[0].q === parsed.quizzes.detect[0].q);
  check("the title now advertises the new count",
    new RegExp("\\(" + (START_DETECT + 1) + " questions\\)").test(res.html));
}
check("INDEX.HTML ON DISK IS BYTE-IDENTICAL", before === after,
  before === after ? "sha256 unchanged" : "APPLY WROTE TO THE FILE");

check("apply refuses a target that is not there",
  op.apply(mutated((o) => { o.target = "nope"; }), html).ok === false);

console.log("");
if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
console.log("quiz-add operation verified.");

