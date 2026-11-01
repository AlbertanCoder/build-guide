// Tests for the prose-rewrite operation: everything it must refuse, and proof
// that applying it cannot touch the real file.
//
//   node scripts/dev/check-prose-op.js
//
// The important checks are the same ones that matter for quiz-add: apply() is
// pure, so this runs it against the real index.html *in memory* and then proves
// the file on disk is byte-identical afterwards. The rest is the refusal list —
// every way a well-meaning but wrong edit must be stopped before it exists.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const op = require("../../server/ops/prose-rewrite.js");

const ROOT = path.resolve(__dirname, "..", "..");
const INDEX = path.join(ROOT, "index.html");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}
const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const html = fs.readFileSync(INDEX, "utf8");

/* A real paragraph out of a real section, whatever it currently says. */
const buildSpan = op.sectionSpan(html, "p-build");
const whySpan = op.sectionSpan(html, "p-why");
const ANCHOR = /<p\b[^>]*>[\s\S]*?<\/p>/.exec(html.slice(buildSpan.start, buildSpan.end))[0];
const WHYPARA = /<p\b[^>]*>[\s\S]*?<\/p>/.exec(html.slice(whySpan.start, whySpan.end))[0];

const sections = op.listSections(html);
check("reads the real section list",
  sections.indexOf("p-build") !== -1 && sections.indexOf("p-why") !== -1,
  sections.length + " sections: " + sections.join(", "));
check("finds a real paragraph to work with", ANCHOR.length > 50, ANCHOR.length + " chars");

const NONCE = "fixture" + Date.now().toString(36);
/* Three <strong> tags against the anchor's one: inline tag counts may change in
   a legitimate rewrite, structural ones may not (that distinction is checked
   below). */
const NEW = "<p><strong>Fixture</strong> rewrite " + NONCE +
  " <strong>keeps</strong> this paragraph long enough to be a <strong>real</strong> one.</p>";

const OP = {
  op: "prose-rewrite",
  section: "p-build",
  oldText: ANCHOR,
  newText: NEW
};

const CTX = { html: html };

function mutated(fn) {
  const copy = JSON.parse(JSON.stringify(OP));
  fn(copy);
  return copy;
}
function rejects(label, payload, keyword, ctx) {
  const r = op.validate(payload, ctx || CTX);
  const hit = r.errors.some((e) => e.indexOf(keyword) !== -1);
  check("refuses: " + label, r.ok === false && hit,
    r.ok ? "accepted it" : (hit ? r.errors[0] : "wrong reason: " + r.errors[0]));
}

/* ---- the good case ------------------------------------------------------- */
const good = op.validate(OP, CTX);
check("a sound rewrite validates", good.ok === true, good.ok ? "ok" : good.errors.join(" | "));

const d = op.describe(OP, CTX);
check("describe names the section and its heading",
  d.section === "p-build" && /How it works/.test(d.heading || ""),
  d.section + " / " + d.heading);

/* ---- apply(): pure, and the file on disk must not move ------------------- */
const before = hash(fs.readFileSync(INDEX));
const res = op.apply(OP, html);
const after = hash(fs.readFileSync(INDEX));

check("apply accepts the op", res.ok === true, res.ok ? "ok" : res.error);
check("a rewrite may change the number of inline tags",
  res.ok && (html.match(/<strong\b/g) || []).length !== (res.html.match(/<strong\b/g) || []).length,
  res.ok
    ? "strongs " + (html.match(/<strong\b/g) || []).length + " -> " + (res.html.match(/<strong\b/g) || []).length
    : "apply refused");
check("the old paragraph is gone from the result",
  res.ok && op.countOf(res.html, ANCHOR) === 0);
check("the new paragraph appears exactly once",
  res.ok && op.countOf(res.html, NEW) === 1);
if (res.ok) {
  const at = res.html.indexOf(NEW);
  const span2 = op.sectionSpan(res.html, "p-build");
  check("the edit landed inside the named section",
    span2 && !span2.error && at >= span2.start && at + NEW.length <= span2.end);
  const count = (s, re) => (s.match(re) || []).length;
  check("the p tags are balanced before and after",
    count(html, /<p\b[^>]*>/g) === count(res.html, /<p\b[^>]*>/g) &&
    count(html, /<\/p>/g) === count(res.html, /<\/p>/g));
  check("the section tags are balanced before and after",
    count(html, /<section\b/g) === count(res.html, /<section\b/g) &&
    count(html, /<\/section>/g) === count(res.html, /<\/section>/g));
} else {
  check("the edit landed inside the named section", false, "apply refused");
  check("the p tags are balanced before and after", false, "apply refused");
  check("the section tags are balanced before and after", false, "apply refused");
}
check("INDEX.HTML ON DISK IS BYTE-IDENTICAL", before === after,
  before === after ? "sha256 unchanged" : "APPLY WROTE TO THE FILE");

check("apply refuses an unknown section",
  op.apply(mutated((o) => { o.section = "p-nope"; }), html).ok === false);
check("apply refuses an anchor that is not there",
  op.apply(mutated((o) => { o.oldText = "<p>zzz nothing like this exists anywhere zzz</p>"; }), html).ok === false);

/* ---- every way validate must refuse ------------------------------------- */
rejects("a different op name", mutated((o) => { o.op = "quiz-add"; }), "op must be");
rejects("no section named", mutated((o) => { delete o.section; }), "section is missing");
rejects("an unknown section", mutated((o) => { o.section = "p-nope"; }), "unknown section");
rejects("empty oldText", mutated((o) => { o.oldText = ""; }), "oldText is missing");
rejects("empty newText", mutated((o) => { o.newText = ""; }), "newText is missing");
rejects("oldText that is not a paragraph",
  mutated((o) => { o.oldText = "<div>hello there old text</div>"; }), "one complete");
rejects("newText that is not a paragraph",
  mutated((o) => { o.newText = "<div>hello there new text</div>"; }), "one complete");
rejects("two paragraphs in newText",
  mutated((o) => { o.newText = "<p>aaa bbb ccc ddd eee</p><p>fff ggg hhh iii jjj</p>"; }),
  "more than one <p>");
rejects("a script tag in newText",
  mutated((o) => { o.newText = "<p><script>bad()</script> filler words to reach length</p>"; }),
  "not allowed");
rejects("a heading tag in newText",
  mutated((o) => { o.newText = "<p><h2>Heading</h2> filler words to reach length</p>"; }),
  "not allowed");
rejects("an event handler in newText",
  mutated((o) => { o.newText = '<p onclick="bad()">some reasonably long paragraph text</p>'; }),
  "event handler");
rejects('a "javascript:" URI in newText',
  mutated((o) => { o.newText = '<p><a href="javascript:bad()">click this link now</a></p>'; }),
  "javascript:");

rejects('"100%" language in newText',
  mutated((o) => { o.newText = "<p>This is 100% safe and full of filler words here.</p>"; }),
  "100%");
rejects('the word "verified" in newText',
  mutated((o) => { o.newText = "<p>The numbers here are verified by careful testing of parts.</p>"; }),
  "verified");
rejects("confidence stated as a percentage in newText",
  mutated((o) => { o.newText = "<p>We are 95% confident this holds with filler words.</p>"; }),
  "percentage");
rejects("oldText identical to newText", mutated((o) => { o.newText = o.oldText; }), "identical");
rejects("newText longer than the cap",
  mutated((o) => { o.newText = "<p>" + "x".repeat(5000) + "</p>"; }), "longer than");
rejects("oldText shorter than a real paragraph",
  mutated((o) => { o.oldText = "<p>hi</p>"; }), "too short");
rejects("newText shorter than a real paragraph",
  mutated((o) => { o.newText = "<p>tiny</p>"; }), "too short");

/* ---- refusals that need a different guide to provoke --------------------- */
const DUP_HTML =
  '<section role="tabpanel" id="p-x">\n' + WHYPARA + "\n</section>\n" +
  '<section role="tabpanel" id="p-x">\n<p>other text in the second copy</p>\n</section>';
rejects("two sections carrying the same id",
  mutated((o) => { o.section = "p-x"; o.oldText = WHYPARA; }),
  "more than one section", { html: DUP_HTML });

const TWICE_HTML =
  '<section role="tabpanel" id="p-x">\n' + WHYPARA + "\n</section>\n" +
  '<section role="tabpanel" id="p-y">\n' + WHYPARA + "\n</section>";
rejects("an anchor that appears twice",
  mutated((o) => { o.section = "p-x"; o.oldText = WHYPARA; }),
  "exactly once", { html: TWICE_HTML });

rejects("an anchor outside the named section",
  mutated((o) => { o.oldText = WHYPARA; }), "outside");
rejects("an anchor that is not in the guide",
  mutated((o) => { o.oldText = "<p>zzz nothing like this exists anywhere zzz</p>"; }),
  "does not appear");

/* ---- validate is pure too ----------------------------------------------- */
const vBefore = hash(fs.readFileSync(INDEX));
op.validate(OP, CTX);
const vAfter = hash(fs.readFileSync(INDEX));
check("VALIDATE LEAVES THE FILE BYTE-IDENTICAL", vBefore === vAfter,
  vBefore === vAfter ? "sha256 unchanged" : "VALIDATE WROTE TO THE FILE");

console.log("");
if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
console.log("prose-rewrite operation verified.");