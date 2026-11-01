// Generates the BANS region of docs/assistant/worker.js from server/bans.js.
//
//   node scripts/dev/build-worker-bans.js          # write the region
//   node scripts/dev/build-worker-bans.js --check  # fail if the worker copy is stale
//
// Why generate: the local server and the public Cloudflare Worker must run the
// SAME five detectors. Two hand-copied lists would drift the first time one of
// them is edited, so one is derived from the other and --check proves it — the
// same pattern as scripts/dev/build-domain.js.
"use strict";

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const SRC = path.join(REPO, "server", "bans.js");
const WORKER = path.join(REPO, "docs", "assistant", "worker.js");
const CHECK = process.argv.includes("--check");

const BEGIN = "/* ---- BANS:BEGIN (generated from server/bans.js by scripts/dev/build-worker-bans.js) ---- */";
const END = "/* ---- BANS:END (generated) ---- */";

/* The shared core is everything from the sentence splitter to just before the
   module.exports line — self-contained, no requires, worker-safe. */
function generatedRegion() {
  const src = fs.readFileSync(SRC, "utf8");
  const start = src.indexOf("function sentences(text) {");
  const end = src.indexOf("module.exports");
  if (start === -1 || end === -1 || end <= start) {
    console.error("FAIL could not find the shared core in server/bans.js");
    process.exit(1);
  }
  return BEGIN + "\n" + src.slice(start, end).trim() + "\n" + END;
}

const worker = fs.readFileSync(WORKER, "utf8");
const beginAt = worker.indexOf(BEGIN);
const endAt = worker.indexOf(END);
if (beginAt === -1 || endAt === -1 || endAt < beginAt) {
  console.error("FAIL worker.js is missing the BANS:BEGIN / BANS:END markers");
  process.exit(1);
}

const fresh = generatedRegion();
const current = worker.slice(beginAt, endAt + END.length);

if (CHECK) {
  if (current !== fresh) {
    console.error("FAIL docs/assistant/worker.js bans copy is stale — run: node scripts/dev/build-worker-bans.js");
    process.exit(1);
  }
  console.log("PASS worker bans copy is current (generated from server/bans.js)");
  process.exit(0);
}

if (current !== fresh) {
  fs.writeFileSync(WORKER, worker.slice(0, beginAt) + fresh + worker.slice(endAt + END.length), "utf8");
  console.log("wrote docs/assistant/worker.js bans region from server/bans.js");
} else {
  console.log("docs/assistant/worker.js bans region already current");
}