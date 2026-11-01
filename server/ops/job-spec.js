/**
 * job-spec — turn "add 3 harder detection questions" into a structured job.
 *
 *   const spec = require("./job-spec.js");
 *   spec.parseIntent("add 3 harder detection questions")
 *   -> { ok: true, job: { op: "quiz-add", target: "detect", count: 3, minLevel: 3 } }
 *
 * Why a deterministic parser instead of asking the model: it costs nothing, it
 * cannot drift between runs, and it can REFUSE things the model should not be
 * allowed to decide — like "delete all the rules questions". The model's job
 * starts after this, with a target, a count and a difficulty already fixed.
 */
"use strict";

const MAX_BATCH = 10; /* a quiz caps at 12 questions, so a batch bigger than this is a mistake */

const WORD_NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

/* Destructive or out-of-scope verbs. Decision R6 is additive-only by default, and
   the agent must not be talked into stripping the guide by a sentence. */
const DESTRUCTIVE = /\b(delete|remove|drop|wipe|clear|replace|rewrite|redo|strip)\b/;

const TARGETS = [
  { id: "detect", words: /\b(detect|detection|hotspot|hot spot|mapping|mapping)\b/ },
  { id: "payload", words: /\b(payload|thermal|camera|sensor|pi|raspberry)\b/ },
  { id: "airframe", words: /\b(airframe|frame|build|motors?|esc|battery|props?|stack)\b/ },
  { id: "rules", words: /\b(rules?|safety|legal|law|regulations?|transport canada|car)\b/ },
  { id: "final", words: /\b(final|exam|overall)\b/ }
];

/** Difficulty ladder from decision R8: 1 recall … 5 combine two facts. */
function difficultyOf(text) {
  if (/\b(much harder|expert|brutal|level 5|hardest)\b/.test(text)) { return 5; }
  if (/\b(combine|multi-?step|two facts)\b/.test(text)) { return 5; }
  if (/\b(harder|hard|difficult|trickier|trickier|challenging)\b/.test(text)) { return 3; }
  if (/\b(spot the false|which is wrong|incorrect)\b/.test(text)) { return 4; }
  if (/\b(easier|simpler|basic|beginner)\b/.test(text)) { return 1; }
  return 1; /* recall, unless asked otherwise */
}

function countOf(text) {
  const digit = text.match(/\b(\d{1,2})\b/);
  if (digit) { return Number(digit[1]); }
  const words = text.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (WORD_NUMBERS[w] != null) { return WORD_NUMBERS[w]; }
  }
  return 1; /* "add a question" means one */
}

function targetOf(text) {
  for (const t of TARGETS) {
    if (t.words.test(text)) { return t.id; }
  }
  return "";
}

function parseIntent(sentence) {
  const text = String(sentence || "").toLowerCase();

  if (!text.trim()) { return { ok: false, error: "say what you want added, e.g. \"add 3 harder detection questions\"" }; }

  if (DESTRUCTIVE.test(text)) {
    return {
      ok: false,
      error: "this only adds questions, it never deletes or rewrites them (decision R6). " +
        "Ask for an item to be changed explicitly and one at a time."
    };
  }

  const target = targetOf(text);
  if (!target) {
    return {
      ok: false,
      error: 'which quiz? Name one of: airframe, payload, detect, rules, final ' +
        '(e.g. "add 2 harder detect questions")'
    };
  }

  const count = countOf(text);
  if (!Number.isInteger(count) || count < 1) {
    return { ok: false, error: "how many questions? e.g. \"add 3 ...\"" };
  }
  if (count > MAX_BATCH) {
    return {
      ok: false,
      error: "that is " + count + " at once; the most this will draft in one go is " + MAX_BATCH +
        ". Ask in batches so you can actually read them."
    };
  }

  const minLevel = difficultyOf(text);
  return {
    ok: true,
    job: {
      op: "quiz-add",
      target: target,
      count: count,
      minLevel: minLevel,
      intent: { add: count, minLevel: minLevel }
    }
  };
}

module.exports = { parseIntent: parseIntent, difficultyOf: difficultyOf, MAX_BATCH: MAX_BATCH };
