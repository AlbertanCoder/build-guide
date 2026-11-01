// Tests the plain-English -> structured job parser.
//
//   node scripts/dev/check-job-spec.js
//
// The parser is the part that must never be creative: it decides the target, the
// number and the difficulty, and it refuses anything destructive.
"use strict";

const spec = require("../../server/ops/job-spec.js");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

function job(sentence) {
  const r = spec.parseIntent(sentence);
  return { r: r, j: r.job || {} };
}

let x = job("add 3 harder detection questions");
check('"add 3 harder detection questions" -> detect, 3, level 3+',
  x.r.ok && x.j.target === "detect" && x.j.count === 3 && x.j.minLevel === 3,
  x.r.ok ? x.j.target + "/" + x.j.count + "/" + x.j.minLevel : x.r.error);

x = job("add five payload questions");
check('"add five payload questions" -> payload, 5, no difficulty asked',
  x.r.ok && x.j.target === "payload" && x.j.count === 5 && x.j.minLevel === 1,
  x.r.ok ? x.j.target + "/" + x.j.count + "/" + x.j.minLevel : x.r.error);

x = job("2 more final exam questions, make them harder");
check('two-part sentence parses the count and the difficulty',
  x.r.ok && x.j.target === "final" && x.j.count === 2 && x.j.minLevel === 3,
  x.r.ok ? x.j.target + "/" + x.j.count + "/" + x.j.minLevel : x.r.error);

x = job("add one easier airframe question");
check('"easier" means level 1',
  x.r.ok && x.j.target === "airframe" && x.j.count === 1 && x.j.minLevel === 1,
  x.r.ok ? x.j.target + "/" + x.j.count + "/" + x.j.minLevel : x.r.error);

x = job("make the detect quiz much harder");
check('"much harder" means level 5 and defaults to one question',
  x.r.ok && x.j.target === "detect" && x.j.count === 1 && x.j.minLevel === 5,
  x.r.ok ? x.j.target + "/" + x.j.count + "/" + x.j.minLevel : x.r.error);

x = job("add a question about the receiver");
check("no quiz named is refused, with the choices listed",
  x.r.ok === false && /which quiz/i.test(x.r.error), x.r.error.slice(0, 70));

x = job("delete all the rules questions");
check("a destructive sentence is refused outright",
  x.r.ok === false && /never deletes or rewrites/i.test(x.r.error), x.r.error.slice(0, 70));

x = job("add 99 detect questions");
check("an oversized batch is refused",
  x.r.ok === false && /at once/.test(x.r.error), x.r.error.slice(0, 70));

console.log("");
if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
console.log("job-spec verified.");
