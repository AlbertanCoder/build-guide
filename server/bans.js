/**
 * bans.js — the five code-enforced bans (decision 25).
 *
 *   const BANS = require("./bans.js");
 *   BANS.screenText(text) -> { ok, hits: [{ id, say, sentence }] }
 *
 * These five were prompt text until now, and prompt text is the one thing this
 * project has repeatedly proven cannot be trusted alone. They are enforced in
 * code at every place an answer can leave: AI answers (replaced with a block
 * notice before the response completes and never cached), quiz questions and
 * explanations (quiz-add.validate, which is also the drafter's screen), prose
 * rewrites (prose-rewrite's content checks), and the shipped offline answers
 * (checked by the gate; they cannot change without passing it).
 *
 * Each detector is sentence-scoped with an ALLOWANCE: the bans exist to stop
 * false claims, not to stop the guide's own honest sentences ("never fly near a
 * wildfire (CAR 601.15)", "the detection rate I actually measured", "this build
 * is not certified"). A sentence that matches a banned pattern but carries the
 * allowance passes — and every one of those cases has its own test.
 */
"use strict";

/* Split into sentences, good enough for claim detection: punctuation or line
   breaks. Keeping whole sentences (not paragraphs) is what lets a refusal or a
   measurement marker sit NEXT TO the claim it governs. */
function sentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

const DATE_RE = /\b20\d\d-\d\d-\d\d\b|\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+20\d\d\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?,?\s+20\d\d\b/i;

const BANS = [
  {
    id: "detection-performance",
    say: "detection performance must not be stated as fact - report only what was actually measured",
    allow: /\b(measured|recorded|observed|logged|in (our|your|my) (test|tests|trials|flights?|runs?)|not guaranteed|no guarantee|is not proof|may be difficult|your mileage|estimat)/i,
    re: [
      /\b\d+(\.\d+)?\s*%\s*[a-z-]*\b(detect|accura|success|reliab)/i,
      /\b(detects?|resolves?|identifies?|spots?)\b[^.]{0,60}\b(at|from|up to)\s+\d+(\.\d+)?\s*m\b/i,
      /\bdetection (rate|accuracy|performance|range|capability|distance)\b[^.]{0,40}\b(is|are|of|at)\s*\d/i,
      /\b(guaranteed|reliable|foolproof|perfect)\s+(detection|detections)\b/i
    ]
  },
  {
    id: "unsourced-price-or-regulation",
    say: "a price, fee or regulation must carry the date it was checked",
    /* The date may sit anywhere in the answer - the source line convention - so
       this is the one ban whose allowance is tested against the whole text. */
    allowScope: "text",
    allow: DATE_RE,
    re: [
      /\bCA?\$\s?\d/i,
      /\b(fees?|fines?|prices?|costs?)\b[^.]{0,30}\d/i,
      /* A regulation claim WITHOUT its identifier ("regulation 601.15 ...").
         "CAR 601.15" names its own source and passes on its own. */
      /\b(regulations?|the rule|the law)\s+(number\s+)?\d/i
    ]
  },
  {
    id: "flying-near-a-wildfire",
    say: "flying near or over a wildfire is not allowed (CAR 601.15)",
    allow: /\b(never|do not|don'?t|must not|shall not|is not allowed|not allowed|illegal|prohibited|banned|refus|avoid|CAR 601\.15|keep away|stay away)\b/i,
    re: [
      /\b(fly|flying|flown|flight|airborne|launch(?:ing)?|drone)\b[^.]{0,60}\b(over|near|above|close to|within|towards?|into|across)\b[^.]{0,40}\b(wildfire|forest fire|wildland fire|active fire|fire perimeters?|fire grounds?|the fire|the flames)/i
    ]
  },
  {
    id: "certification-or-approval-claim",
    say: "claiming certification or legal approval - this build is neither certified nor approved",
    allow: /\b(not certified|not approved|no (certification|approval)|never claim|do not claim|don'?t claim|without (certification|approval)|is not (certified|approved|legal)|is neither|refus|cannot claim|can'?t claim|uncontrolled|hobby)\b/i,
    re: [
      /\b(we|it|this|the (build|system|drone|guide|project|aircraft|payload))\b[^.]{0,40}\b(is|are|has been|now|fully)\b[^.]{0,24}\b(certified|approved|authorized|licensed|cleared|compliant)\b/i,
      /\b(fully|legally) (compliant|approved|certified|authorized)\b/i,
      /\bcertified (drone|pilot|operator|system|aircraft)\b/i
    ]
  },
  {
    id: "edit-without-approval",
    say: "edits happen only through a proposal you accept - claim no change has landed without one",
    allow: /\b(proposal|proposed|pending|not yet|branch|after you accept|until you accept|waiting for|would be|once accepted|can be accepted|draft)\b/i,
    re: [
      /\b(I (have|'ve)|I'?ve)\s+(edited|changed|updated|rewritten|fixed|altered|added (to|in))\b/i,
      /\b(the (guide|document|page|file|source|section))\b[^.]{0,30}\b(has been|is now|was)\b[^.]{0,20}\b(edited|updated|changed|rewritten|modified|fixed)\b/i
    ]
  }
];

/** Screen text against all five bans. */
function screenText(text) {
  const full = String(text || "");
  const hits = [];
  BANS.forEach(function (ban) {
    const allowEverywhere = ban.allowScope === "text" && ban.allow && ban.allow.test(full);
    if (allowEverywhere) { return; }
    sentences(full).forEach(function (sentence) {
      const matches = ban.re.some(function (re) { return re.test(sentence); });
      if (!matches) { return; }
      if (ban.allowScope !== "text" && ban.allow && ban.allow.test(sentence)) { return; }
      hits.push({ id: ban.id, say: ban.say, sentence: sentence.slice(0, 200) });
    });
  });
  return { ok: hits.length === 0, hits: hits };
}

/** What replaces a blocked answer. Loud and specific - never a silent rewrite. */
function blockNotice(hits) {
  const says = [];
  (hits || []).forEach(function (h) { if (says.indexOf(h.say) === -1) { says.push(h.say); } });
  return "That answer was blocked by the guide's safety checks (the five code-enforced " +
    "bans): " + says.join("; ") + ". Nothing was shown as fact and nothing was cached.";
}

module.exports = { BANS: BANS, screenText: screenText, blockNotice: blockNotice, sentences: sentences };