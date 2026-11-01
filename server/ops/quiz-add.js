/**
 * quiz-add — one named operation, validated before it is allowed to change anything.
 *
 *   const op = require("./quiz-add.js");
 *   op.validate(payload, ctx)  -> { ok, errors[], derived }
 *   op.apply(payload, html)    -> { ok, html, changes[] }
 *
 * Why an operation instead of "the model rewrites the file": a named operation
 * can be checked against a schema and against the corpus *before* it is applied,
 * and it can only ever do one thing. A free-form edit can be applied cleanly to
 * the wrong place, and "cleanly wrong" is the worst outcome there is.
 *
 * Decision references: R4 (named operations), R6 (additive only), R7 (answer
 * provable from the cited corpus), R9 (distractors must be refutable), R10
 * (near-duplicate rejection), R18 (declared intent must hold).
 */
"use strict";

const ENG = require("../cost-engine.js");
const BANS = require("../bans.js");

const OPTION_COUNT = 4;
const MIN_LEVEL = 1;
const MAX_LEVEL = 5;
const MAX_QUIZ = 12;
const DUP_THRESHOLD = 0.85;

/**
 * Pull an object literal out of a JavaScript source file by matching braces,
 * while ignoring braces inside strings.
 *
 * This evaluates the guide's *own data literal* — it is the same file the
 * browser runs, on a local machine, in a build tool. It is not evaluating
 * anything a model wrote.
 */
function sliceLiteral(source, marker) {
  const at = source.indexOf(marker);
  if (at === -1) { return null; }
  const start = source.indexOf("{", at);
  if (start === -1) { return null; }
  let depth = 0;
  let quote = null;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) { quote = null; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") { depth += 1; }
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) { return source.slice(start, i + 1); }
    }
  }
  return null;
}

function readQuizzes(html) {
  const quizzesLiteral = sliceLiteral(html, "const QUIZZES = {");
  const titlesLiteral = sliceLiteral(html, "const QUIZ_TITLES = {");
  if (!quizzesLiteral) { throw new Error("could not find const QUIZZES in the source"); }
  return {
    /* eslint-disable no-new-func */
    quizzes: new Function("return (" + quizzesLiteral + ");")(),
    titles: titlesLiteral ? new Function("return (" + titlesLiteral + ");")() : {}
  };
}

/** Everything that must be true BEFORE a question is allowed to exist. */
function validate(op, ctx) {
  const c = ctx || {};
  const errors = [];
  const quizzes = c.quizzes || {};
  const corpus = String(c.corpus || "");
  const correctValues = Array.isArray(c.correctValues) ? c.correctValues : [];

  if (!op || op.op !== "quiz-add") { errors.push('op must be "quiz-add"'); }
  const target = String((op && op.target) || "");
  if (!target) { errors.push("no target quiz named"); }
  else if (!quizzes[target]) {
    errors.push('unknown quiz "' + target + '" (known: ' + Object.keys(quizzes).join(", ") + ")");
  }

  const q = (op && op.question) || {};
  const text = String(q.q || "").trim();
  if (text.length < 20) { errors.push("question text missing or too short (" + text.length + " chars)"); }
  if (text.length > 300) { errors.push("question text is longer than 300 characters"); }

  const options = Array.isArray(q.a) ? q.a.map((s) => String(s).trim()) : [];
  if (options.length !== OPTION_COUNT) {
    errors.push("expected exactly " + OPTION_COUNT + " options, got " + options.length);
  }
  if (options.some((o) => !o)) { errors.push("one of the options is empty"); }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    errors.push("two options are worded identically");
  }
  if (!Number.isInteger(q.c) || q.c < 0 || q.c >= options.length) {
    errors.push("correct-answer index c must be an integer 0.." + (options.length - 1));
  }
  if (String(q.why || "").trim().length < 15) {
    errors.push("the why/explanation is missing or too short");
  }

  const level = Number(op && op.level);
  if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
    errors.push("level must be an integer " + MIN_LEVEL + "-" + MAX_LEVEL);
  }

  /* R10: near-duplicate rejection, using the same stemmed tokens as the cache. */
  const list = quizzes[target] || [];
  let worst = 0;
  let worstQ = "";
  const sig = ENG.uniqTokens(text);
  list.forEach((existing) => {
    const score = ENG.jaccard(sig, ENG.uniqTokens(existing.q || ""));
    if (score > worst) { worst = score; worstQ = String(existing.q || ""); }
  });
  if (worst >= DUP_THRESHOLD) {
    errors.push("too similar to an existing question (" + worst.toFixed(2) + "): " + worstQ.slice(0, 70));
  }
  if (list.length >= MAX_QUIZ) {
    errors.push('"' + target + '" already has ' + list.length + " questions (max " + MAX_QUIZ + ")");
  }

  /* R7: the answer must be provable from the corpus, not merely asserted. */
  const citation = (op && op.citation) || {};
  const must = String(citation.mustContain || "").trim();
  if (!String(citation.source || "").trim()) { errors.push("no citation.source"); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(citation.verified || ""))) {
    errors.push("citation.verified must be a YYYY-MM-DD date");
  }
  if (must.length < 2) {
    errors.push("citation.mustContain is missing — the answer has to be provable from the corpus");
  } else if (corpus.indexOf(must) === -1) {
    errors.push('the cited answer "' + must + '" does not appear in the corpus');
  }

  /* R9: a wrong option must not secretly be a right value. */
  options.forEach((o, i) => {
    if (i === q.c) { return; }
    const clash = correctValues.find((v) => String(v).trim().toLowerCase() === o.toLowerCase());
    if (clash) {
      errors.push('option ' + (i + 1) + ' "' + o + '" is a value the corpus treats as correct');
    }
  });

  /* The five bans (decision 25): a question or explanation carrying a banned
     claim is refused here, so direct ops and drafted candidates both pass
     through the same net. */
  BANS.screenText(text + " " + String(q.why || "")).hits.forEach(function (h) {
    errors.push("banned claim (" + h.id + "): " + h.say);
  });

  /* R18: the declared intent has to be arithmetic, not a claim. */
  const derived = describe(op, ctx);
  const intent = (op && op.intent) || {};
  if (intent.totalAfter != null && Number(intent.totalAfter) !== derived.totalAfter) {
    errors.push("intent.totalAfter says " + intent.totalAfter + " but the truth is " + derived.totalAfter);
  }
  if (intent.totalBefore != null && Number(intent.totalBefore) !== derived.totalBefore) {
    errors.push("intent.totalBefore says " + intent.totalBefore + " but the truth is " + derived.totalBefore);
  }
  if (intent.minLevel != null && level < Number(intent.minLevel)) {
    errors.push("level " + level + " is below the declared minimum " + intent.minLevel);
  }

  return { ok: errors.length === 0, errors: errors, derived: derived, similarity: Number(worst.toFixed(2)) };
}

function describe(op, ctx) {
  const quizzes = ctx.quizzes || {};
  const target = String(op && op.target || "");
  const list = quizzes[target] || [];
  const before = list.length;
  const totalBefore = Object.keys(quizzes).reduce((n, k) => n + quizzes[k].length, 0);
  return {
    target: target,
    before: before,
    after: before + 1,
    totalBefore: totalBefore,
    totalAfter: totalBefore + 1,
    thresholdBefore: Math.ceil(before * 0.75),
    thresholdAfter: Math.ceil((before + 1) * 0.75),
    /* true when adding this question raises the bar for an already-earned pass */
    regression: Math.ceil((before + 1) * 0.75) > Math.ceil(before * 0.75)
  };
}

function escRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply the op to the source text and return the new text.
 *
 * Pure on purpose: it writes nothing and touches no file, so the caller can run
 * it against a copy, diff the result, and only then decide. Two edits, never
 * more: append the question, and fix the title that states the count.
 */
function apply(op, html) {
  const source = String(html || "");
  const target = String((op && op.target) || "");
  const changes = [];

  let parsed;
  try { parsed = readQuizzes(source); } catch (e) {
    return { ok: false, error: "could not read the quizzes out of the source: " + e.message };
  }
  const existing = parsed.quizzes[target];
  if (!existing) { return { ok: false, error: 'quiz "' + target + '" not found in the source' }; }
  const newCount = existing.length + 1;

  /* --- 1. append the question as the LAST element (additive only, R6) --- */
  const found = new RegExp("\\n([ \\t]*)" + escRe(target) + "[ \\t]*:[ \\t]*\\[").exec(source);
  if (!found) { return { ok: false, error: 'could not locate the "' + target + '" array literal' }; }
  const openIdx = source.indexOf("[", found.index + found[0].length - 1);

  let i = openIdx;
  let depth = 0;
  let quote = null;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) { quote = null; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "[") { depth += 1; }
    else if (ch === "]") { depth -= 1; if (depth === 0) { break; } }
  }
  if (depth !== 0) { return { ok: false, error: "could not find the end of the quiz array" }; }
  const closeIdx = i;

  const inner = source.slice(openIdx + 1, closeIdx);
  const firstBrace = inner.indexOf("{");
  const itemIndent = firstBrace === -1
    ? found[1] + "  "
    : (inner.slice(0, firstBrace).split("\n").pop() || found[1] + "  ");

  const q = op.question;
  const pad = itemIndent + "  ";
  const item = "{ q: " + JSON.stringify(q.q) + ",\n" +
    pad + "a: [" + q.a.map((o) => JSON.stringify(o)).join(", ") + "],\n" +
    pad + "c: " + q.c + ",\n" +
    pad + "why: " + JSON.stringify(q.why) + " }";

  const before = source.slice(0, closeIdx);
  const tailWs = /[ \t\r\n]*$/.exec(before)[0];
  const body = before.slice(0, before.length - tailWs.length);
  let out = body + (firstBrace === -1 ? "" : ",") + "\n" + itemIndent + item + tailWs + source.slice(closeIdx);
  changes.push("QUIZZES." + target + ": " + (newCount - 1) + " -> " + newCount + " questions");

  /* --- 2. the title states the count, so it has to agree or it lies --- */
  const titleRe = new RegExp("(" + escRe(target) + ":[ \\t]*\"[^\"]*\\()\\d+([ \\t]*questions\\))");
  if (titleRe.test(out)) {
    out = out.replace(titleRe, "$1" + newCount + "$2");
    changes.push("QUIZ_TITLES." + target + " now says " + newCount + " questions");
  } else {
    return { ok: false, error: "the title for " + target + " does not state a question count; refusing to leave it wrong" };
  }

  /* --- post-condition: the result must still parse, with exactly one more --- */
  let after;
  try { after = readQuizzes(out); } catch (e) {
    return { ok: false, error: "the edit produced source that no longer parses" };
  }
  if ((after.quizzes[target] || []).length !== newCount) {
    return { ok: false, error: "post-check: expected " + newCount + " questions, found " + (after.quizzes[target] || []).length };
  }
  if (!new RegExp("\\(" + newCount + " questions\\)").test(out)) {
    return { ok: false, error: "post-check: the title does not show the new count" };
  }

  return { ok: true, html: out, changes: changes, count: newCount, derived: describe(op, parsed) };
}

module.exports = {
  validate: validate,
  apply: apply,
  describe: describe,
  readQuizzes: readQuizzes,
  OPTION_COUNT: OPTION_COUNT,
  MAX_QUIZ: MAX_QUIZ
};
