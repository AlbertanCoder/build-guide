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
const total = Object.keys(parsed.quizzes).reduce((n, k) => n + parsed.quizzes[k].length, 0);

check("reads the real quizzes out of index.html", Object.keys(parsed.quizzes).length === 5,
  Object.keys(parsed.quizzes).join(", "));
check("the guide has 28 questions today", total === 28, String(total));
check("detect has 5 questions today", parsed.quizzes.detect.length === 5);

const OP = {
  op: "quiz-add",
  target: "detect",
  intent: { add: 1, minLevel: 3, totalBefore: 28, totalAfter: 29 },
  question: {
    q: "At 30 m with the 55 degree lens, roughly how much ground does one pixel cover?",
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

const CTX = { quizzes: parsed.quizzes, corpus: corpus, correctValues: ["0.98 m per pixel", "CA$1,714.94"] };

/* ---- the numbers the proposal must declare, computed not claimed ---------- */
const d = op.describe(OP, CTX);
check("derived totals are 28 -> 29", d.totalBefore === 28 && d.totalAfter === 29,
  d.totalBefore + " -> " + d.totalAfter);
check("the pass bar for detect is 4/5 today", d.thresholdBefore === 4, "need " + d.thresholdBefore);
check("the pass bar becomes 5/6 after the change", d.thresholdAfter === 5, "need " + d.thresholdAfter);
check("and that is a regression for an earned 4/5 pass", d.regression === true);

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
check("the question count goes to 6", res.count === 6, String(res.count));
check("apply reports both edits", res.changes.length === 2, res.changes.join(" ; "));

let reparsed = null;
try { reparsed = op.readQuizzes(res.html); } catch (e) { /* covered below */ }
check("the edited source still parses", !!reparsed);
if (reparsed) {
  const list = reparsed.quizzes.detect;
  const newTotal = Object.keys(reparsed.quizzes).reduce((n, k) => n + reparsed.quizzes[k].length, 0);
  check("detect now has 6 questions", list.length === 6, String(list.length));
  check("the guide total is now 29", newTotal === 29, String(newTotal));
  check("the new question was appended last", list[list.length - 1].q === OP.question.q);
  check("the first existing question is untouched", list[0].q === parsed.quizzes.detect[0].q);
  check("the title now advertises 6 questions", /\(6 questions\)/.test(res.html));
}
check("INDEX.HTML ON DISK IS BYTE-IDENTICAL", before === after,
  before === after ? "sha256 unchanged" : "APPLY WROTE TO THE FILE");

check("apply refuses a target that is not there",
  op.apply(mutated((o) => { o.target = "nope"; }), html).ok === false);

console.log("");
if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
console.log("quiz-add operation verified.");

