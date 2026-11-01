// Tests the corrections memory's write path (decisions 11 and 12): a correction
// is drafted, validated, screened, and lands on a proposal branch — never
// auto-ingested, never unreviewed.
//
//   node scripts/dev/check-corrections.js
//
// The important checks: apply() is pure (the real repo's docs/domain/ must be
// byte-identical after the suite), every refusal names itself, and the propose
// loop carries the correction AND its regenerated index in one commit (R23).
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const op = require("../../server/ops/correction-add.js");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}
const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const NONCE = "correction" + Date.now().toString(36);

function goodOp(n, says) {
  return {
    op: "correction-add",
    corrects: "",
    says: says,
    supersedes: "Guide tab 3, the battery note (" + NONCE + "-" + n + ")",
    verified: "2026-11-01"
  };
}

const GOOD = goodOp(1,
  "The plan uses GNB 1500mAh 4S packs because the motors are a 6S-class wind kept deliberately on 4S.");

const domainBefore = hash(fs.readFileSync(path.join(ROOT, "docs", "js", "domain.js")));
const corrPath = path.join(ROOT, "docs", "domain", "corrections.md");
const corrBefore = fs.existsSync(corrPath) ? hash(fs.readFileSync(corrPath)) : null;

/* ---- the good case ------------------------------------------------------- */
const good = op.validate(GOOD, {});
check("a sound correction validates", good.ok === true, good.ok ? "ok" : good.errors.join(" | "));

const block = op.compose(GOOD);
check("the composed block carries its schema lines",
  /^## Correction/m.test(block) && /^source:: /m.test(block) &&
  /^verified:: \d{4}-\d{2}-\d{2}$/m.test(block) && /This supersedes: /.test(block),
  block.split(/\r?\n/)[0]);

/* ---- the chat sentence --------------------------------------------------- */
const built = op.fromSentence(
  "correction: the stack is the GEPRC TAKER F405 BLS 50A, not the SpeedyBee. supersedes: the parts table row for the stack");
check("fromSentence structures a correction sentence",
  built.op === "correction-add" && /GEPRC TAKER/.test(built.says) &&
  /SpeedyBee/.test(built.says) && /the parts table row/.test(built.supersedes) &&
  /^\d{4}-\d{2}-\d{2}$/.test(built.verified),
  built.says ? built.says.slice(0, 40) : "no payload");
check("fromSentence refuses a sentence that names nothing superseded",
  typeof op.fromSentence("correction: something helpful and true about the frame").error === "string",
  op.fromSentence("correction: something helpful and true about the frame").error);
check("fromSentence refuses a non-correction sentence",
  typeof op.fromSentence("add 3 harder detect questions").error === "string");

/* ---- every way validate must refuse ------------------------------------- */
function mutated(fn) {
  const copy = JSON.parse(JSON.stringify(GOOD));
  fn(copy);
  return copy;
}
function rejects(label, payload, keyword, ctx) {
  const r = op.validate(payload, ctx || {});
  const hit = r.errors.some((e) => e.indexOf(keyword) !== -1);
  check("refuses: " + label, r.ok === false && hit,
    r.ok ? "accepted it" : (hit ? r.errors[0] : "wrong reason: " + r.errors[0]));
}

rejects("a different op name", mutated((o) => { o.op = "quiz-add"; }), "op must be");
rejects("a says that is too short", mutated((o) => { o.says = "too short"; }), "too short");
rejects("no supersedes", mutated((o) => { o.supersedes = ""; }), "supersedes is missing");
rejects("a bad verified date", mutated((o) => { o.verified = "yesterday"; }), "YYYY-MM-DD");
rejects('says claiming "100%"', mutated((o) => {
  o.says = "This fix is 100% the right answer and always has been for the battery note.";
}), "banned language");
rejects("says claiming detection performance", mutated((o) => {
  o.says = "The drone detects a 1 m target at 40 m every time with this one change to the lens.";
}), "banned claim");

const existing = op.compose(goodOp(9,
  "The plan uses GNB 1500mAh 4S packs because the motors are a 6S-class wind kept deliberately on 4S."));
rejects("a near-duplicate of a correction already on file", GOOD, "too similar",
  { existing: existing });

/* ---- apply(): pure, and the file it builds is honest --------------------- */
const made = op.apply(GOOD, "");
check("apply starts the corrections file with its header",
  made.ok === true && /^# Corrections on file/m.test(made.content) && /^## Correction/m.test(made.content),
  made.ok ? "header + 1 block" : made.error);
const twice = op.apply(goodOp(2, "The charger is the ToolkitRC M4AC and it balances charges attended."),
  made.content);
check("apply appends a second correction without touching the first",
  twice.ok === true &&
  op.countOf(twice.content, "## Correction") === 2 &&
  twice.content.indexOf(NONCE + "-1") !== -1 && twice.content.indexOf(NONCE + "-2") !== -1,
  twice.ok ? op.countOf(twice.content, "## Correction") + " blocks" : twice.error);

/* ---- purity: the real repo must not move --------------------------------- */
const domainAfter = hash(fs.readFileSync(path.join(ROOT, "docs", "js", "domain.js")));
check("docs/js/domain.js ON DISK IS BYTE-IDENTICAL", domainBefore === domainAfter,
  domainBefore === domainAfter ? "sha256 unchanged" : "THE SUITE WROTE TO THE FILE");
const corrAfter = fs.existsSync(corrPath) ? hash(fs.readFileSync(corrPath)) : null;
check("the real repo's corrections memory was not touched",
  corrBefore === corrAfter, corrAfter === null ? "absent, as expected" : "unchanged");

/* ---- the propose loop: the correction AND its index, one commit ----------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-corr-"));
const CLONE = path.join(TMP, "clone");
function run(cmd, args, cwd, env) {
  const r = spawnSync(cmd, args, {
    cwd: cwd || CLONE, encoding: "utf8", windowsHide: true,
    env: Object.assign({}, process.env, env || {})
  });
  return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}
const gitOut = (args) => run("git", args, CLONE).out;

let r = run("git", ["clone", "--quiet", "--branch", "main", ROOT, CLONE], TMP);
check("cloned main of the repo to a temp dir", r.status === 0,
  r.status === 0 ? "ok" : r.out.slice(0, 150));

if (r.status === 0) {
  /* code under test = working tree */
  const serverDir = path.join(ROOT, "server");
  fs.mkdirSync(path.join(CLONE, "server", "ops"), { recursive: true });
  fs.readdirSync(serverDir).filter((f) => f.endsWith(".js")).forEach(function (f) {
    fs.copyFileSync(path.join(serverDir, f), path.join(CLONE, "server", f));
  });
  fs.readdirSync(path.join(serverDir, "ops")).forEach(function (f) {
    fs.copyFileSync(path.join(serverDir, "ops", f), path.join(CLONE, "server", "ops", f));
  });
  fs.copyFileSync(path.join(ROOT, "scripts", "dev", "build-domain.js"),
    path.join(CLONE, "scripts", "dev", "build-domain.js"));
  run("git", ["add", "-A"], CLONE);
  run("git", ["commit", "--quiet", "-m", "code under test (working tree, placed by check-corrections)"], CLONE);

  const proposeMod = require(path.join(CLONE, "server", "ops", "propose.js"));
  const fixture = goodOp(3,
    "The VTX is powered separately from the 4S battery, not from the Pi's regulated 5V rail.");
  const proposed = proposeMod.propose(
    writeTmp(fixture), { log: function () {} });
  check("a correction proposal is created", proposed.ok === true,
    proposed.ok ? proposed.slug : proposed.error);

  const slug = proposed.slug;
  const committed = gitOut(["show", "--stat", "--format=", slug])
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => /\|/.test(l));
  check("the proposal commits the correction AND its regenerated index together",
    committed.some((l) => /corrections\.md/.test(l)) && committed.some((l) => /domain\.js/.test(l)),
    committed.join(" ; ").slice(0, 120));
  check("main is untouched by the proposal",
    !fs.existsSync(path.join(CLONE, "docs", "domain", "corrections.md")));

  const greenGate = path.join(CLONE, "gate-green.js");
  fs.writeFileSync(greenGate, "process.exit(0);\n", "utf8");
  const a = run(process.execPath, ["server/ops/accept.js", slug], CLONE, { GATE_CMD: greenGate });
  check("accept brings the correction onto main", a.status === 0 &&
    fs.existsSync(path.join(CLONE, "docs", "domain", "corrections.md")),
    a.status === 0 ? "accepted" : a.out.split(/\r?\n/).slice(0, 2).join(" / "));

  const pack = spawnSync(process.execPath, ["scripts/dev/build-domain.js", "--check"],
    { cwd: CLONE, encoding: "utf8" });
  check("the accepted correction passes the domain pack build (sourced, dated)",
    pack.status === 0, String(pack.stdout || "").trim().split(/\r?\n/)[0]);
}
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }

function writeTmp(fixture) {
  const p = path.join(TMP, "corr-op.json");
  fs.writeFileSync(p, JSON.stringify(fixture, null, 2), "utf8");
  return p;
}

console.log("");
if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
console.log("corrections memory verified: reviewed, sourced, labelled, and pure.");