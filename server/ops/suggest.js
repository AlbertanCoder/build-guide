/**
 * suggest — propose one cited paragraph rewrite without writing anything.
 *
 * The model supplies a candidate only. This module owns the corpus, prompt,
 * parsing and deterministic validation; PROPOSE remains the only write path.
 */
"use strict";

const PROSE = require("./prose-rewrite.js");
const BANS = require("../bans.js");

const MAX_SENTENCE = 500;
const MAX_CLAIMS = 6;
const MAX_CITATIONS = 4;
const MIN_QUOTE = 12;

function decodeEntities(text) {
  const named = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    deg: "°", hellip: "…", larr: "←", rarr: "→", ldquo: "“", rdquo: "”",
    lsquo: "‘", rsquo: "’", mdash: "—", ndash: "–", middot: "·",
    minus: "−", times: "×"
  };
  return String(text || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi,
    function (whole, entity) {
      if (entity[0] !== "#") { return named[entity.toLowerCase()] || whole; }
      const hex = entity[1].toLowerCase() === "x";
      const n = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    });
}

function visibleText(raw) {
  return decodeEntities(String(raw || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}

/** Only paragraphs inside the selected section become guide citation entries. */
function guideEntries(html, section) {
  const source = String(html || "");
  const span = PROSE.sectionSpan(source, section);
  if (!span || span.error) { return []; }
  const body = source.slice(span.start, span.end);
  const out = [];
  const re = /<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi;
  let m;
  while ((m = re.exec(body))) {
    const n = out.length + 1;
    out.push({
      id: "G" + n,
      label: "Guide — " + section + " paragraph " + n,
      raw: m[0],
      text: visibleText(m[0])
    });
  }
  return out;
}

function createCorpus(html, section, domainPassages) {
  const domain = (Array.isArray(domainPassages) ? domainPassages : [])
    .filter(function (p) { return p && String(p.text || "").trim(); })
    .map(function (p, i) {
      return {
        id: "D" + (i + 1),
        label: String(p.label || ("domain entry " + (i + 1))),
        text: String(p.text || "").trim()
      };
    });
  return { guide: guideEntries(html, section), domain: domain };
}

function buildPrompt(request, corpus) {
  const lines = [
    "Suggest one safer, clearer rewrite of one existing guide paragraph.",
    "Return ONLY one JSON object, optionally in a json fence, with op and report.",
    "op must be prose-rewrite, stay in section " + request.section + ", and copy oldText",
    "exactly from one RAW guide paragraph below. newText must be one safe <p> paragraph.",
    "report must contain exactly improves, corpusSupport and conflicts arrays. Each array",
    "has at most six claims; improves and corpusSupport need at least one. Every claim",
    "needs one to four citations {source,quote}, using only the ids below. Each quote",
    "must be a nontrivial exact substring of that entry's VISIBLE/TEXT evidence.",
    "Do not add confidence, percentages, reasoning, labels, or uncited claims.",
    "An empty conflicts array means no conflict was found, not that none can exist.",
    "",
    "INSTRUCTION: " + request.sentence,
    "SECTION: " + request.section,
    "",
    "GUIDE CORPUS:"
  ];
  corpus.guide.forEach(function (entry) {
    lines.push("[" + entry.id + "] " + entry.label, "RAW: " + entry.raw,
      "VISIBLE: " + entry.text, "");
  });
  lines.push("CURATED DOMAIN CORPUS:");
  corpus.domain.forEach(function (entry) {
    lines.push("[" + entry.id + "] " + entry.label, "TEXT: " + entry.text, "");
  });
  return lines.join("\n");
}

/** Accept one object and nothing else; an optional fence is the only wrapper. */
function parseSuggestion(text) {
  let raw = String(text == null ? "" : text).trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(raw);
  if (fenced) { raw = fenced[1].trim(); }
  else if (/```/.test(raw)) { return null; }
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch (e) {
    return null;
  }
}

function banErrors(text, where) {
  return BANS.screenText(text).hits.map(function (hit) {
    return where + ": banned claim (" + hit.id + "): " + hit.say;
  });
}

/* Judgement language is checked per claim, never across a serialized object and
   never against an exact source quotation. A source may legitimately discuss
   verification or uncertainty; the model may not grade its own judgement. */
function judgementErrors(claim, where) {
  const errors = [];
  if (/\d+(?:\.\d+)?\s*(?:%|per\s?cent\b)/i.test(claim)) {
    errors.push(where + " must not contain a percentage or quantitative estimate");
  }
  if (/\b(?:confidence|certainty|certainly|undoubtedly)\b/i.test(claim)) {
    errors.push(where + " must not contain a confidence or certainty estimate");
  }
  if (/\b(?:self[- ]?(?:verified|validated|graded)|verified|verification|truth(?:fulness)?|fact[- ]?checked?)\s*[:=-]/i.test(claim) ||
      /\b(?:100\s*%\s*(?:verified|true|correct|accurate)|guaranteed\s+(?:true|correct|accurate))\b/i.test(claim)) {
    errors.push(where + " must not contain a self-graded truth or verification badge");
  }
  return errors;
}

function entriesById(corpus) {
  const map = Object.create(null);
  (corpus.guide || []).concat(corpus.domain || []).forEach(function (entry) {
    map[entry.id] = entry;
  });
  return map;
}

function validateReport(input, corpus) {
  const errors = [];
  const report = {};
  const groups = ["improves", "corpusSupport", "conflicts"];
  const byId = entriesById(corpus);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["report must be an object"] };
  }
  groups.forEach(function (group) {
    const claims = input[group];
    report[group] = [];
    if (!Array.isArray(claims)) {
      errors.push("report." + group + " must be an array");
      return;
    }
    if (claims.length > MAX_CLAIMS) {
      errors.push("report." + group + " has more than six claims");
    }
    if (group !== "conflicts" && claims.length === 0) {
      errors.push("report." + group + " needs at least one cited claim");
    }
    claims.slice(0, MAX_CLAIMS).forEach(function (item, claimIndex) {
      const at = "report." + group + "[" + claimIndex + "]";
      const claim = item && typeof item.claim === "string" ? item.claim.trim() : "";
      if (!claim || claim.length > 500 || /[<>]|[\u0000-\u001f]/.test(claim)) {
        errors.push(at + ".claim must be non-empty plain text of at most 500 characters");
      }
      errors.push.apply(errors, judgementErrors(claim, at + ".claim"));
      /* Field boundaries are safety boundaries: a negation or date in another
         field must never allow a banned claim or quote to pass. */
      errors.push.apply(errors, banErrors(claim, at + ".claim"));
      const citations = item && item.citations;
      if (!Array.isArray(citations) || citations.length < 1 || citations.length > MAX_CITATIONS) {
        errors.push(at + ".citations must contain one to four entries");
        return;
      }
      const cleanCitations = [];
      citations.forEach(function (citation, citationIndex) {
        const source = citation && typeof citation.source === "string" ? citation.source.trim() : "";
        const quote = citation && typeof citation.quote === "string" ? citation.quote.trim() : "";
        const quoteAt = at + ".citations[" + citationIndex + "].quote";
        const entry = byId[source];
        errors.push.apply(errors, banErrors(quote, quoteAt));
        if (!entry) {
          errors.push(at + ".citations[" + citationIndex + "] names an unknown source");
          return;
        }
        if (quote.length < MIN_QUOTE || quote.length > 1000 || !/[\p{L}\p{N}]/u.test(quote)) {
          errors.push(quoteAt + " is not nontrivial evidence");
          return;
        }
        if (entry.text.indexOf(quote) === -1) {
          errors.push(quoteAt + " is not an exact substring of " + source);
          return;
        }
        cleanCitations.push({ source: source, label: entry.label, quote: quote });
      });
      if (claim && cleanCitations.length === citations.length) {
        report[group].push({ claim: claim, citations: cleanCitations });
      }
    });
  });
  return { ok: errors.length === 0, errors: errors, report: report };
}

function validateSuggestion(candidate, ctx) {
  const c = ctx || {};
  const corpus = c.corpus || { guide: [], domain: [] };
  const errors = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ok: false, errors: ["the model response must be one object"] };
  }

  const input = candidate.op;
  const op = {
    op: input && input.op,
    section: input && typeof input.section === "string" ? input.section.trim() : "",
    oldText: input && typeof input.oldText === "string" ? input.oldText.trim() : "",
    newText: input && typeof input.newText === "string" ? input.newText.trim() : ""
  };
  if (op.op !== "prose-rewrite") { errors.push('op must be "prose-rewrite"'); }
  if (op.section !== c.section) { errors.push("the operation must stay in the requested section"); }
  const knownAnchor = (corpus.guide || []).some(function (entry) { return entry.raw === op.oldText; });
  if (!knownAnchor) { errors.push("oldText must be copied from a guide paragraph in the prompt"); }

  const verdict = PROSE.validate(op, { html: c.html });
  if (!verdict.ok) { errors.push.apply(errors, verdict.errors); }
  errors.push.apply(errors, banErrors(op.oldText, "model candidate anchor"));
  errors.push.apply(errors, banErrors(op.newText, "proposed paragraph"));

  const checked = validateReport(candidate.report, corpus);
  errors.push.apply(errors, checked.errors);

  const unique = Array.from(new Set(errors));
  if (unique.length) { return { ok: false, errors: unique }; }
  return { ok: true, errors: [], op: op, report: checked.report };
}

async function suggest(request, ctx, askFn) {
  const req = request && typeof request === "object" && !Array.isArray(request) ? request : {};
  const c = ctx || {};
  if (typeof req.sentence !== "string" || typeof req.section !== "string") {
    return { ok: false, error: "Sentence and section must be strings." };
  }
  const sentence = req.sentence.trim().slice(0, MAX_SENTENCE);
  const section = req.section.trim();
  if (!sentence) { return { ok: false, error: "A suggestion instruction is required." }; }
  if (!section || PROSE.listSections(String(c.html || "")).indexOf(section) === -1) {
    return { ok: false, error: "Choose an existing guide section." };
  }
  const requestBans = banErrors(sentence, "request");
  if (requestBans.length) {
    return { ok: false, error: "The suggestion request was refused by the safety checks." };
  }

  const corpus = createCorpus(c.html, section, c.domain);
  if (!corpus.guide.length) {
    return { ok: false, error: "The selected section has no editable paragraph." };
  }
  const prompt = buildPrompt({ sentence: sentence, section: section }, corpus);
  const raw = await askFn(prompt);
  const parsed = parseSuggestion(raw);
  if (!parsed) {
    return { ok: false, error: "The model did not return one usable JSON object." };
  }
  const checked = validateSuggestion(parsed, {
    html: c.html, section: section, corpus: corpus
  });
  if (!checked.ok) {
    /* checked.errors remain available to direct validator callers for internal
       diagnostics, but model-controlled values never cross the client boundary. */
    return { ok: false, error: "The suggestion was refused by the validation checks." };
  }
  return { ok: true, op: checked.op, report: checked.report };
}

module.exports = {
  guideEntries: guideEntries,
  createCorpus: createCorpus,
  buildPrompt: buildPrompt,
  parseSuggestion: parseSuggestion,
  validateReport: validateReport,
  validateSuggestion: validateSuggestion,
  suggest: suggest,
  visibleText: visibleText,
  MAX_SENTENCE: MAX_SENTENCE,
  MAX_CLAIMS: MAX_CLAIMS,
  MAX_CITATIONS: MAX_CITATIONS,
  MIN_QUOTE: MIN_QUOTE
};
