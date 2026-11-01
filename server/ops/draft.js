/**
 * draft — ask a model for candidate quiz questions, then keep ONLY the ones that
 * survive the same checks a hand-written question has to pass.
 *
 * This is the piece that makes the assistant more than a chatbot: it produces
 * work, and the work is screened before a human ever sees it.
 *
 * Design notes:
 *   - `buildPrompt`, `parseCandidates` and `screenCandidates` are pure functions,
 *     so all the risky logic is testable without a network or a key.
 *   - the model call is injected as `askFn(prompt) -> text`, so the server can wire
 *     in its own provider and a test can wire in a fake.
 *   - nothing here writes a file. It returns { survivors, rejected } and the caller
 *     decides what to do with them.
 */
"use strict";

const quizAdd = require("./quiz-add.js");

const MAX_CANDIDATES = 12;

/** One strict instruction block. The model is a supplier, not a decision-maker. */
function buildPrompt(job, passages) {
  const pass = (passages || [])
    .map((p, i) => "[P" + (i + 1) + "] " + (p.label || "passage") + "\n" + String(p.text || "").slice(0, 900))
    .join("\n\n");

  return [
    "You are drafting multiple-choice quiz questions for a build guide about a",
    "fire-detecting drone. The reader is the person building it.",
    "",
    "RULES — a candidate that breaks any of these is discarded by a machine, not by a person:",
    "1. The correct answer must be provable from the PASSAGES below. Put the exact",
    "   phrase that proves it in citation.mustContain — the checker looks for that",
    "   string in the corpus.",
    "2. Exactly 4 options. Exactly one correct, given as c = 0..3.",
    "3. A wrong option must be WRONG. Never use a figure that the passages treat as",
    "   correct anywhere.",
    "4. Do not restate a question that already exists in this quiz.",
    "5. difficulty " + job.minLevel + "+ on a 1-5 ladder: 1 recall, 2 apply a number,",
    "   3 choose between plausible values, 4 spot the false claim, 5 combine two facts.",
    "6. Return ONLY a JSON array. No prose, no markdown fence.",
    "",
    "Each element:",
    '{"q":"question","a":["opt","opt","opt","opt"],"c":1,"why":"one sentence",' +
      '"citation":{"source":"where in the guide","verified":"YYYY-MM-DD","mustContain":"exact phrase"},' +
      '"level":3}',
    "",
    "Produce exactly " + job.count + " candidate" + (job.count === 1 ? "" : "s") + " for the quiz: " + job.target,
    "",
    "PASSAGES:",
    pass || "(none supplied — do not invent facts; return an empty array)"
  ].join("\n");
}

/** Pull the first JSON array out of whatever the model said, fences and all. */
function parseCandidates(text) {
  const raw = String(text || "");
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidateText = fenced ? fenced[1] : raw;

  const start = candidateText.indexOf("[");
  if (start === -1) { return []; }

  let depth = 0;
  let inString = false;
  let quote = "";
  for (let i = start; i < candidateText.length; i += 1) {
    const ch = candidateText[i];
    if (inString) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) { inString = false; }
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; continue; }
    if (ch === "[") { depth += 1; }
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(candidateText.slice(start, i + 1));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }
    }
  }
  return [];
}

/**
 * Run each candidate through the real validator and split them into survivors and
 * rejects-with-reasons. A reject reason is shown to the user, so "it didn't work"
 * becomes "the distractor was secretly correct".
 */
function screenCandidates(candidates, ctx, target) {
  const survivors = [];
  const rejected = [];

  (candidates || []).slice(0, MAX_CANDIDATES).forEach((candidate, i) => {
    const op = {
      op: "quiz-add",
      target: target,
      level: Number(candidate && candidate.level),
      citation: (candidate && candidate.citation) || {},
      question: {
        q: candidate && candidate.q,
        a: candidate && candidate.a,
        c: candidate && candidate.c,
        why: candidate && candidate.why
      }
    };
    const verdict = quizAdd.validate(op, ctx);
    if (verdict.ok) {
      survivors.push(op);
    } else {
      rejected.push({
        index: i,
        question: String((candidate && candidate.q) || "").slice(0, 90),
        reasons: verdict.errors
      });
    }
  });

  return { survivors: survivors, rejected: rejected };
}

/**
 * The whole job: prompt, ask, parse, screen. `askFn` returns the model's text.
 */
async function draft(job, ctx, askFn, opts) {
  const o = opts || {};
  const prompt = buildPrompt(job, o.passages || []);
  const text = await askFn(prompt);
  const candidates = parseCandidates(text);
  if (!candidates.length) {
    return {
      ok: false,
      error: "the model returned no usable JSON array, so nothing was drafted",
      raw: String(text || "").slice(0, 400),
      survivors: [],
      rejected: []
    };
  }
  const screened = screenCandidates(candidates, ctx, job.target);
  return {
    ok: screened.survivors.length > 0,
    error: screened.survivors.length ? "" :
      "all " + candidates.length + " candidate(s) were refused by the checks",
    prompt: prompt,
    survivors: screened.survivors,
    rejected: screened.rejected
  };
}

module.exports = {
  buildPrompt: buildPrompt,
  parseCandidates: parseCandidates,
  screenCandidates: screenCandidates,
  draft: draft,
  MAX_CANDIDATES: MAX_CANDIDATES
};
