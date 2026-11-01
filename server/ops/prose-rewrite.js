/**
 * prose-rewrite — rewrite exactly one paragraph in a named section.
 *
 *   const op = require("./prose-rewrite.js");
 *   op.validate(payload, ctx)  -> { ok, errors[], derived }
 *   op.apply(payload, html)    -> { ok, html, changes[] }
 *
 * This is the operation the handoff called "the gap between 'it adds questions'
 * and 'it edits the guide'". It is validated the same way quiz-add is: everything
 * that can be checked is checked BEFORE it is allowed to change anything, and
 * apply() is a pure function that cannot write to disk.
 *
 * What it may touch: the inner markup of exactly one <p>…</p> in a named
 * tabpanel section. What it may never touch: headings, <script> data literals
 * (including QUIZZES), SVG, and anything outside the named section — the anchor
 * must appear exactly once in the whole file AND lie inside the section's span,
 * so a correct-looking edit cannot land in the wrong place.
 *
 * Decision references: R4 (named operations, exact-once find/replace for prose),
 * R5 (structured reads), R18 (declared intent must hold), plus the project rule
 * "no percentage confidence, no '100% verified' language, anywhere, ever" —
 * enforced here in code, not in a prompt, because prompt text is the thing this
 * project has repeatedly proven cannot be trusted alone.
 */
"use strict";

const MAX_TEXT = 4000;
const MIN_TEXT = 20;

/* Tags allowed inside the new paragraph: inline prose markup only. Anything not
   on this list is refused — a whitelist, because a blacklist of dangerous tags
   is exactly the list that grows one tag per incident. */
const ALLOWED_TAGS = [
  "strong", "em", "b", "i", "code", "a", "br", "span", "sup", "sub", "small",
  "abbr", "mark", "u", "kbd", "samp", "q", "cite", "time", "del", "ins", "var"
];

/* The project bans: no percentage confidence and no "100% verified" language,
   anywhere, ever. Each pattern gets its own refusal message and its own test. */
const BANNED_LANGUAGE = [
  {
    name: "100% claims",
    re: /100\s*%|100\s+per\s?cent/i,
    say: 'banned language: "100%" claims are not allowed'
  },
  {
    name: "the word 'verified'",
    re: /\bverified\b/i,
    say: 'banned language: the word "verified" is not allowed'
  },
  {
    name: "confidence as a percentage",
    re: /\d+(?:\.\d+)?\s*%\s*(?:confident|confidence|certain|certainty|sure|accurate|reliab|guaranteed)/i,
    say: "banned language: confidence stated as a percentage is not allowed"
  },
  {
    name: "confidence as a percentage",
    re: /(?:confidence|certainty)\s*(?:of|:|=|at)?\s*\d+(?:\.\d+)?\s*%/i,
    say: "banned language: confidence stated as a percentage is not allowed"
  }
];

/** Count non-overlapping occurrences of needle in hay. */
function countOf(hay, needle) {
  if (!needle) { return 0; }
  let n = 0;
  let i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n += 1; i += needle.length; }
  return n;
}

/**
 * The byte span of a named section, from its opening tag to its matching close.
 * Sections nest (the build steps are sections inside a section), so this counts
 * <section/</section> depth rather than searching for the next close tag.
 */
function sectionSpan(html, id) {
  const openRe = /<section\b[^>]*>/g;
  let m;
  let open = -1;
  while ((m = openRe.exec(html))) {
    const idm = /\bid\s*=\s*"([^"]*)"/.exec(m[0]);
    if (idm && idm[1] === id) {
      if (open !== -1) { return { error: "more than one section is tagged " + id }; }
      open = m.index;
    }
  }
  if (open === -1) { return null; }
  const depthRe = /<section\b|<\/section>/g;
  depthRe.lastIndex = open;
  let depth = 0;
  while ((m = depthRe.exec(html))) {
    if (m[0] === "</section>") {
      depth -= 1;
      if (depth === 0) { return { start: open, end: depthRe.lastIndex }; }
    } else {
      depth += 1;
    }
  }
  return { error: "section " + id + " is never closed" };
}

/** The section ids that exist, as the op must name one of them. */
function listSections(html) {
  const ids = [];
  const re = /<section\b[^>]*\bid\s*=\s*"([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) { ids.push(m[1]); }
  return ids;
}

/** Exactly one complete <p>…</p> element, and nothing else. */
function paragraphShape(text) {
  const t = String(text || "").trim();
  const m = /^<p(\s[^>]*)?>([\s\S]*)<\/p>$/.exec(t);
  if (!m) { return { ok: false, multi: false }; }
  if (/<p\b|<\/p>/i.test(m[2])) { return { ok: false, multi: true }; }
  return { ok: true, inner: m[2] };
}

/** Everything that must be true of the TEXT itself, with or without the guide. */
function contentErrors(op) {
  const errors = [];
  const oldText = String((op && op.oldText) || "").trim();
  const newText = String((op && op.newText) || "").trim();

  if (!oldText) { errors.push("oldText is missing"); }
  if (!newText) { errors.push("newText is missing"); }
  if (!oldText || !newText) { return errors; }

  if (oldText === newText) {
    errors.push("oldText and newText are identical - there is nothing to change");
  }

  const oldShape = paragraphShape(oldText);
  if (!oldShape.ok) {
    errors.push(oldShape.multi
      ? "oldText must be exactly one paragraph; it contains more than one <p>"
      : "oldText must be exactly one complete <p>...</p> paragraph");
  }
  const newShape = paragraphShape(newText);
  if (!newShape.ok) {
    errors.push(newShape.multi
      ? "newText must be exactly one paragraph; it contains more than one <p>"
      : "newText must be exactly one complete <p>...</p> paragraph");
  }

  if (oldText.length < MIN_TEXT) {
    errors.push("oldText is too short to be a real paragraph (" + oldText.length + " chars)");
  }
  if (newText.length < MIN_TEXT) {
    errors.push("newText is too short to be a real paragraph (" + newText.length + " chars)");
  }
  if (newText.length > MAX_TEXT) {
    errors.push("newText is longer than " + MAX_TEXT + " characters");
  }

  /* The wrapper is a <p> by shape above; the whitelist applies to what is
     INSIDE it. Handlers and URI schemes are checked on the whole text, because
     they could ride on the wrapper's own attributes. */
  if (newShape.ok) {
    const seen = [];
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;
    let m;
    while ((m = tagRe.exec(newShape.inner))) {
      const tag = m[1].toLowerCase();
      if (ALLOWED_TAGS.indexOf(tag) === -1 && seen.indexOf(tag) === -1) {
        seen.push(tag);
        errors.push("the tag <" + tag + "> is not allowed inside a paragraph");
      }
    }
    BANNED_LANGUAGE.forEach(function (b) {
      if (b.re.test(newShape.inner) && errors.indexOf(b.say) === -1) { errors.push(b.say); }
    });
  }
  if (/<[a-zA-Z][^>]*\son[a-z]+\s*=/i.test(newText)) {
    errors.push("an event handler attribute is not allowed in new text");
  }
  if (/javascript\s*:/i.test(newText)) {
    errors.push('the "javascript:" scheme is not allowed in new text');
  }

  return errors;
}

/**
 * Everything that must be true AGAINST THE GUIDE before an edit may apply:
 * the section is real, and the anchor sits exactly once inside its span.
 */
function structuralErrors(op, html) {
  const errors = [];
  const source = String(html || "");

  if (!op || op.op !== "prose-rewrite") { errors.push('op must be "prose-rewrite"'); }
  if (!source) {
    errors.push("there is no guide source to check against");
    return errors;
  }

  const section = String((op && op.section) || "");
  if (!section) { errors.push("section is missing - name the tabpanel id, e.g. p-build"); }
  const oldText = String((op && op.oldText) || "").trim();

  if (!section || !oldText) { return errors; }

  const span = sectionSpan(source, section);
  if (!span) {
    errors.push('unknown section "' + section + '" (known: ' + listSections(source).join(", ") + ")");
    return errors;
  }
  if (span.error) { errors.push(span.error); return errors; }

  const total = countOf(source, oldText);
  if (total === 0) {
    errors.push("oldText does not appear in the guide");
  } else if (total > 1) {
    errors.push("oldText appears " + total + " times in the guide; it must appear exactly once");
  } else {
    const at = source.indexOf(oldText);
    if (at < span.start || at + oldText.length > span.end) {
      errors.push('oldText is outside the named section "' + section + '"');
    }
  }
  return errors;
}

/** Everything that must be true BEFORE a rewrite is allowed to exist. */
function validate(op, ctx) {
  const c = ctx || {};
  const errors = contentErrors(op).concat(structuralErrors(op, c.html));
  return {
    ok: errors.length === 0,
    errors: errors,
    derived: errors.length === 0 ? describe(op, c) : undefined
  };
}

/** What the change says about itself, computed from the source, not claimed. */
function describe(op, ctx) {
  const html = String((ctx && ctx.html) || "");
  const section = String((op && op.section) || "");
  const span = html ? sectionSpan(html, section) : null;
  let heading = null;
  if (span && !span.error) {
    const hm = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html.slice(span.start, span.end));
    if (hm) { heading = hm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); }
  }
  return {
    section: section,
    heading: heading,
    anchorAt: html && op ? html.indexOf(String(op.oldText || "").trim()) : -1,
    oldLen: String((op && op.oldText) || "").trim().length,
    newLen: String((op && op.newText) || "").trim().length
  };
}

/**
 * Apply the rewrite as a pure function. It re-derives every structural fact from
 * the string it is handed — never from anything validate said — then proves the
 * result before returning it.
 */
function apply(op, source) {
  const html = String(source || "");
  const structural = structuralErrors(op, html);
  if (structural.length) {
    return { ok: false, error: structural.join("; "), errors: structural };
  }
  const content = contentErrors(op);
  if (content.length) {
    return { ok: false, error: content.join("; "), errors: content };
  }

  const section = op.section;
  const oldText = String(op.oldText).trim();
  const newText = String(op.newText).trim();

  const out = html.split(oldText).join(newText);
  const changes = [
    "prose-rewrite " + section + ": rewrote 1 paragraph (" + oldText.length + " -> " + newText.length + " chars)"
  ];

  /* --- post-conditions: the result must be true, not merely look true --- */
  if (countOf(out, oldText) !== 0) {
    return { ok: false, error: "post-check: the old paragraph is still present" };
  }
  if (countOf(out, newText) !== 1) {
    return { ok: false, error: "post-check: the new paragraph does not appear exactly once" };
  }
  const spanAfter = sectionSpan(out, section);
  if (!spanAfter || spanAfter.error) {
    return { ok: false, error: "post-check: the named section did not survive the edit" };
  }
  const at = out.indexOf(newText);
  if (at < spanAfter.start || at + newText.length > spanAfter.end) {
    return { ok: false, error: "post-check: the new paragraph landed outside the named section" };
  }
  const tagCounts = ["p", "section", "script", "style", "strong", "em", "a", "div"];
  for (const tag of tagCounts) {
    const openRe = new RegExp("<" + tag + "\\b[^>]*>", "gi");
    const closeRe = new RegExp("</" + tag + ">", "gi");
    const opensBefore = (html.match(openRe) || []).length;
    const opensAfter = (out.match(new RegExp("<" + tag + "\\b[^>]*>", "gi")) || []).length;
    const closesBefore = (html.match(closeRe) || []).length;
    const closesAfter = (out.match(new RegExp("</" + tag + ">", "gi")) || []).length;
    if (opensBefore !== opensAfter || closesBefore !== closesAfter) {
      return {
        ok: false,
        error: "post-check: the edit changed the number of <" + tag + "> elements (" +
          opensBefore + "/" + closesBefore + " -> " + opensAfter + "/" + closesAfter + ")"
      };
    }
  }

  return { ok: true, html: out, changes: changes, derived: describe(op, { html: html }) };
}

module.exports = {
  validate: validate,
  apply: apply,
  describe: describe,
  sectionSpan: sectionSpan,
  listSections: listSections,
  countOf: countOf,
  MAX_TEXT: MAX_TEXT,
  MIN_TEXT: MIN_TEXT,
  ALLOWED_TAGS: ALLOWED_TAGS
};