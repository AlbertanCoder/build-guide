// Tests the drafter: prompt shape, JSON extraction, and the screening that keeps a
// bad candidate out of the repo.
//
//   node scripts/dev/check-draft.js
//
// No network and no key: the model call is a fake function, so what is being tested
// is the screening, which is the part that matters.
"use strict";

const fs = require("fs");
const path = require("path");
const draft = require("../../server/ops/draft.js");
const quizAdd = require("../../server/ops/quiz-add.js");

const ROOT = path.resolve(__dirname, "..", "..");
const INDEX = path.join(ROOT, "index.html");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

const quizzes = quizAdd.readQuizzes(fs.readFileSync(INDEX, "utf8")).quizzes;
const corpus = fs.readFileSync(path.join(ROOT, "docs", "domain", "01-thermal-detection-limits.md"), "utf8");
const CTX = { quizzes: quizzes, corpus: corpus, correctValues: ["0.98 m per pixel", "CA$1,607.26"] };
const JOB = { op: "quiz-add", target: "detect", count: 2, minLevel: 3 };

/* ---- the prompt has to carry the rules and the evidence ------------------ */
const prompt = draft.buildPrompt(JOB, [{ label: "coverage", text: "one pixel is about 0.98 m per pixel at 30 m" }]);
check("the prompt names the quiz and the count",
  /detect/.test(prompt) && /exactly 2 candidate/.test(prompt));
check("the prompt carries the passages", /0\.98 m per pixel/.test(prompt));
check("the prompt demands JSON only and forbids invention",
  /ONLY a JSON array/.test(prompt) && /definitely|discarded|mustContain/.test(prompt));
check("the prompt states the difficulty floor", /difficulty 3\+/.test(prompt));

/* ---- parsing whatever the model actually says ---------------------------- */
const bare = draft.parseCandidates('[{"q":"a"},{"q":"b"}]');
check("a bare JSON array parses", bare.length === 2, String(bare.length));
const fenced = draft.parseCandidates('Here you go:\n```json\n[{"q":"a"}]\n```\nHope that helps.');
check("a fenced array surrounded by chatter parses", fenced.length === 1, String(fenced.length));
check("prose with no array yields nothing", draft.parseCandidates("I cannot help with that.").length === 0);
check("broken JSON yields nothing, not a throw", draft.parseCandidates('[{"q":').length === 0);

/* ---- screening: the part that protects the guide ------------------------ */
const nonce = "d" + Date.now().toString(36);
const GOOD = {
  q: "Using the coverage calculator, what ground width does one pixel cover at 30 m with the 55 degree lens? (" + nonce + ")",
  a: ["About 10 cm", "About 1 m", "About 10 m", "About 30 m"],
  c: 1,
  why: "2 x 30 m x tan(27.5 deg) is about 31.2 m across; over 32 pixels that is about 0.98 m.",
  citation: { source: "docs/domain/01-thermal-detection-limits.md", verified: "2026-11-01", mustContain: "0.98 m per pixel" },
  level: 3
};
const UNCITED = Object.assign({}, GOOD, {
  q: "How many megapixels is the thermal camera? (" + nonce + ")",
  citation: { source: "made up", verified: "2026-11-01", mustContain: "40 megapixels" }
});
const SECRETLY_RIGHT = Object.assign({}, GOOD, {
  q: "What does the whole order plan cost? (" + nonce + ")",
  a: ["About CA$900", "About CA$1,200", "CA$1,607.26", "About CA$2,500"],
  c: 0
});

const screened = draft.screenCandidates([GOOD, UNCITED, SECRETLY_RIGHT], CTX, "detect");
check("one good candidate survives", screened.survivors.length === 1, String(screened.survivors.length));
check("two candidates are refused", screened.rejected.length === 2, String(screened.rejected.length));
check("a claim that is not in the corpus is refused with a reason",
  screened.rejected.some((r) => r.reasons.some((e) => /does not appear in the corpus/.test(e))));
check("a distractor that is secretly right is refused with a reason",
  screened.rejected.some((r) => r.reasons.some((e) => /treats as correct/.test(e))));

/* ---- the whole job, with a fake model ---------------------------------- */
(async () => {
  const ok = await draft.draft(JOB, CTX, async () => JSON.stringify([GOOD, UNCITED]), { passages: [] });
  check("a job with one good candidate comes back ok", ok.ok === true, ok.error || "ok");
  check("and reports exactly what it threw away", ok.rejected.length === 1 && ok.survivors.length === 1,
    ok.survivors.length + " kept / " + ok.rejected.length + " rejected");

  const junk = await draft.draft(JOB, CTX, async () => "Sorry, I would rather not.", { passages: [] });
  check("a model that answers in prose is reported honestly",
    junk.ok === false && /no usable JSON/.test(junk.error), junk.error.slice(0, 70));

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("drafter verified: the model proposes, the checks dispose.");
})();
