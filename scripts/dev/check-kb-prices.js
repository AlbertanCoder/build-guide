// Verifies the Guide Assistant's knowledge base never quotes a price the guide does not.
//
// Why this exists: the assistant's whole claim is that it only states what this guide
// checked. A KB entry that keeps an older total after the budget is revised is therefore
// worse than no assistant at all - it states a superseded number with full confidence.
// That is exactly what happened once (the KB kept CA$1,678.00 after the order plan moved
// to CA$1,714.94), and it survived both self-test suites because neither compared prices
// against the page. This check does, so a price edit has to reach both files.
//
// Run: node scripts/dev/check-kb-prices.js
const fs = require("fs");

const guide = fs.readFileSync("index.html", "utf8");
const assistant = fs.readFileSync("docs/js/assistant.js", "utf8");

// Figures the assistant is allowed to quote that the guide does not carry, because they
// come from an outside source cited in the same sentence. Keep this list short and say why.
const EXTERNAL = new Map([
  ["28.00", "Job Bank wage low, cited in the career entry"],
  ["43.27", "Job Bank wage median, cited in the career entry"],
  ["57.69", "Job Bank wage high, cited in the career entry"]
]);

// CA$1,714.94 -> "1714.94", the form both files are compared in.
function amountsIn(text) {
  const out = [];
  for (const m of text.matchAll(/CA\$\s?([\d,]+(?:\.\d{2})?)/g)) {
    out.push(m[1].replace(/,/g, ""));
  }
  return out;
}

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

// 1. every distinct amount in the KB must also appear somewhere in the guide
const guideAmounts = new Set(amountsIn(guide));
const kbAmounts = [...new Set(amountsIn(assistant))];
const drifted = kbAmounts.filter(
  (a) => !guideAmounts.has(a) && !EXTERNAL.has(a)
);
check(
  "every KB amount is backed by the guide",
  drifted.length === 0,
  drifted.length
    ? "not in index.html: " + drifted.map((a) => "CA$" + a).join(", ")
    : kbAmounts.length - EXTERNAL.size + " checked, " + EXTERNAL.size + " external"
);

// 2. the budget entry's own arithmetic must close, so a partial edit is caught here
const block = assistant.slice(
  assistant.indexOf('kb("budget"'),
  assistant.indexOf('.next = "stock";')
);
const budget = [...new Set(amountsIn(block))]
  .map(Number)
  // zero is not evidence: "CA$0-400" would otherwise satisfy every addition
  .filter((n) => n > 0);

// taxable subtotal * 5% must land on the stated GST (Alberta rate, transit fees excluded)
const gstPair = budget
  .flatMap((t) => budget.map((g) => [t, g]))
  .find(([t, g]) => Math.abs(t * 0.05 - g) < 0.011);
check(
  "budget entry: 5% GST closes on a stated amount",
  Boolean(gstPair),
  gstPair ? "CA$" + gstPair[0] + " x 5% = CA$" + gstPair[1] : "no taxable/GST pair found"
);

// subtotal + GST must land on the stated planning total
const totalPair = budget
  .flatMap((s) => budget.map((g) => [s, g, budget.find((x) => Math.abs(s + g - x) < 0.011)]))
  .find(([, , x]) => x !== undefined);
check(
  "budget entry: subtotal + GST closes on the planning total",
  Boolean(totalPair),
  totalPair
    ? "CA$" + totalPair[0] + " + CA$" + totalPair[1] + " = CA$" + totalPair[2]
    : "no subtotal/GST/total triple found"
);

// 3. the superseded total must not come back anywhere in the shipped assistant
check(
  "superseded total CA$1,678.00 is gone",
  !/CA\$\s?1,678/.test(assistant),
  "it accompanied the old $15 fee allowance"
);

process.exit(bad ? 1 : 0);
