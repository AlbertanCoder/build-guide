// Verifies the shipped HTML/JS are valid UTF-8 with no double-encoding damage.
const fs = require("fs");
const path = require("path");

const files = [
  "index.html",
  "docs/js/assistant.js",
  path.join("dist", "Shad's Build Guide.html")
];

let bad = 0;
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const emDash = (s.match(/\u2014/g) || []).length;
  const mojibake = (s.match(/\u00e2\u20ac|\u00c3\u00a2|\u00ef\u00bf\u00bd/g) || []).length;
  const replacement = (s.match(/\ufffd/g) || []).length;
  const ok = mojibake === 0 && replacement === 0;
  if (!ok) bad += 1;
  console.log(
    (ok ? "PASS " : "FAIL ") + f.padEnd(34) +
    " em-dashes=" + String(emDash).padStart(5) +
    " mojibake=" + String(mojibake).padStart(3) +
    " replacement-chars=" + replacement
  );
}
process.exit(bad ? 1 : 0);
