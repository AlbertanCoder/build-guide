/**
 * correction-add — the corrections memory's write path (decisions 11 and 12).
 *
 *   const op = require("./correction-add.js");
 *   op.validate(payload, ctx)  -> { ok, errors[], derived }
 *   op.apply(payload, content) -> { ok, content, changes[] }
 *   op.fromSentence(text)      -> payload | { error }
 *
 * "Learn" here means a REVIEWED corrections memory, never training and never
 * auto-ingestion: a correction is drafted (from a chat sentence or an op file),
 * validated, screened by the five bans, and lands on a proposal branch. It
 * enters the corpus only when a human accepts — committed, auditable, diffable
 * and undoable, in docs/domain/corrections.md, retrieved by the same BM25 as
 * every other block ("learning costs no new machinery").
 */
"use strict";

const BANS = require("../bans.js");
const ENG = require("../cost-engine.js");

const MAX_SAYS = 600;
const MIN_SAYS = 20;
const DUP_THRESHOLD = 0.85;

const FILE = "docs/domain/corrections.md";
const HEADER = [
  "# Corrections on file — what the assistant must say instead",
  "",
  "tags:: corrections, correction, supersedes, errata, wrong, instead, fix, updated",
  "",
  "Every block below is a **reviewed correction**: a claim the assistant now makes",
  "in place of something the guide or a previous answer said. Each block carries a",
  "`source::` and a `verified::` line like every domain page, and names what it",
  "supersedes. Corrections are authoritative for the assistant's answers; when one",
  "disagrees with the guide, the assistant shows both and says so.",
  ""
].join("\n");

/** The block as it will appear in the file. Pure. */
function compose(op) {
  const says = String(op.says || "").trim();
  const corrects = String(op.corrects || "").trim();
  const supersedes = String(op.supersedes || "").trim();
  const date = String(op.verified || "").trim();
  const title = (corrects || says).replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
  const body = (corrects ? "What was wrong: " + corrects + " " : "") +
    "What is right: " + says;
  return [
    "## Correction — " + title.replace(/[#\[\]]/g, ""),
    "",
    body,
    "",
    "This supersedes: " + supersedes + ".",
    "",
    "source:: user correction, accepted through the proposal loop (" + date + ")",
    "verified:: " + date,
    ""
  ].join("\n");
}

function countOf(hay, needle) {
  if (!needle) { return 0; }
  let n = 0;
  let i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n += 1; i += needle.length; }
  return n;
}

/** Everything that must be true BEFORE a correction may exist. */
function validate(op, ctx) {
  const c = ctx || {};
  const errors = [];

  if (!op || op.op !== "correction-add") { errors.push('op must be "correction-add"'); }
  const says = String((op && op.says) || "").trim();
  const corrects = String((op && op.corrects) || "").trim();
  const supersedes = String((op && op.supersedes) || "").trim();
  const date = String((op && op.verified) || "").trim();

  if (says.length < MIN_SAYS) {
    errors.push("says is missing or too short (" + says.length + " chars) - state what is right");
  }
  if (says.length > MAX_SAYS) { errors.push("says is longer than " + MAX_SAYS + " characters"); }
  if (!supersedes) {
    errors.push("supersedes is missing - a correction must name what it replaces (decision 4: conflicts are labelled, never hidden)");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("verified must be a YYYY-MM-DD date - say when the correction was checked");
  }

  /* The five bans plus the standing no-claims rules apply to corrections too. */
  BANS.screenText(says + " " + corrects + " " + supersedes).hits.forEach(function (h) {
    errors.push("banned claim (" + h.id + "): " + h.say);
  });
  if (/\bverified\b|\b100\s*%/.test(says + " " + corrects)) {
    errors.push('banned language: corrections may not claim "verified" or "100%"');
  }

  /* Near-duplicate: the same correction twice would make the memory noisy. */
  const existing = String(c.existing || "");
  if (existing) {
    const sig = ENG.uniqTokens(says);
    const blocks = existing.split(/^## /m).slice(1);
    let worst = 0;
    let worstHead = "";
    blocks.forEach(function (b) {
      /* Compare against the block's own "what is right" payload — comparing
         against the whole block dilutes the score with its framing words. */
      const bm = /What is right: ([^\r\n]+)/.exec(b);
      const btext = bm ? bm[1] : b;
      const score = ENG.jaccard(sig, ENG.uniqTokens(btext.replace(/\s+/g, " ").slice(0, 600)));
      if (score > worst) { worst = score; worstHead = b.split(/\r?\n/)[0]; }
    });
    if (worst >= DUP_THRESHOLD) {
      errors.push("too similar to a correction already on file (" + worst.toFixed(2) + "): " + worstHead.slice(0, 60));
    }
  }

  return {
    ok: errors.length === 0,
    errors: errors,
    derived: {
      file: FILE,
      block: errors.length === 0 ? compose(op) : null,
      supersedes: supersedes
    }
  };
}

/**
 * Apply the correction to the file's content as a pure function.
 * content === "" (or a missing file) starts the file with its header.
 */
function apply(op, content) {
  const v = validate(op, { existing: String(content || "") });
  if (!v.ok) {
    return { ok: false, error: v.errors.join("; "), errors: v.errors };
  }
  const block = compose(op);
  const had = String(content || "");
  const out = had.trim() ? had.replace(/\s*$/, "\n\n") + block : HEADER + "\n" + block;

  /* --- post-conditions: the memory must be true, not merely look true --- */
  if (countOf(out, block) !== 1) {
    return { ok: false, error: "post-check: the correction does not appear exactly once" };
  }
  if (!/^# /m.test(out)) {
    return { ok: false, error: "post-check: the file lost its title" };
  }
  if (!/^## /m.test(out)) {
    return { ok: false, error: "post-check: the file has no correction blocks" };
  }
  return {
    ok: true,
    content: out,
    changes: ["correction-add: 1 correction (" + String(op.supersedes || "").slice(0, 40) + ")"],
    derived: v.derived
  };
}

/**
 * The chat path: "correction: <what is right>. supersedes: <what it replaces>".
 * No model is needed — the user's sentence is the content; this only structures
 * it. Returns a payload for validate(), or an error to show the user.
 */
function fromSentence(text) {
  const t = String(text || "").trim();
  const m = /^(?:correction|correct|remember|wrong)\s*[:\-]\s*([\s\S]+)$/i.exec(t);
  if (!m) {
    return { error: 'a correction must start with "correction:" and say what is right' };
  }
  const body = m[1].trim();
  const sup = /\bsupersedes\s*[:\-]\s*([\s\S]+)$/i.exec(body);
  if (!sup) {
    return { error: 'a correction must name what it replaces - end it with "supersedes: <passage or claim>"' };
  }
  const says = body.slice(0, sup.index).replace(/[\s.]+$/, "").trim();
  return {
    op: "correction-add",
    says: says,
    supersedes: sup[1].trim(),
    verified: new Date().toISOString().slice(0, 10)
  };
}

module.exports = {
  validate: validate,
  apply: apply,
  compose: compose,
  fromSentence: fromSentence,
  countOf: countOf,
  FILE: FILE,
  HEADER: HEADER
};