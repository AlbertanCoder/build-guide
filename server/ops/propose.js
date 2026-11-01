/**
 * propose — turn a validated change into a reviewable branch.
 *
 *   node server/ops/propose.js path/to/op.json
 *   node server/ops/propose.js --list
 *
 * In order:
 *   1. refuses unless the working tree is clean and we are on main
 *   2. validates the op against the real guide and corpus
 *   3. creates proposal/<name>, applies the change THERE, commits THERE
 *   4. returns to main, which is left untouched
 *
 * Nothing can reach main from here. `accept` is a separate command and `reject`
 * just deletes the branch, so a proposal can always be thrown away with no
 * cleanup and no residue.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const quizAdd = require("./quiz-add.js");

const ROOT = path.resolve(__dirname, "..", "..");

function git(args) {
  try {
    const out = execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out: String(out || "") };
  } catch (e) {
    return { ok: false, out: String((e.stdout || "") + (e.stderr || "") || e.message) };
  }
}

function currentBranch() {
  const r = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  return r.ok ? r.out.trim() : "";
}

function isClean() {
  /* --untracked-files=no on purpose: the op file itself is usually untracked, and
     a proposal must not be blocked by its own input. Uncommitted changes to
     tracked files still block, which is the case that matters — a proposal must
     never mix with your own in-progress edits. */
  const r = git(["status", "--porcelain", "--untracked-files=no"]);
  return r.ok && r.out.trim() === "";
}

function listProposals() {
  const r = git(["branch", "--list", "proposal/*"]);
  if (!r.ok) { return []; }
  return r.out.split(/\r?\n/).map((s) => s.replace(/^[*+]\s*/, "").trim()).filter(Boolean);
}

/** The corpus the answer has to be provable from: the guide plus the domain pack. */
function buildCorpus() {
  const parts = [];
  const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  parts.push(index);
  const domainDir = path.join(ROOT, "docs", "domain");
  if (fs.existsSync(domainDir)) {
    fs.readdirSync(domainDir).filter((f) => f.endsWith(".md")).sort().forEach((f) => {
      parts.push(fs.readFileSync(path.join(domainDir, f), "utf8"));
    });
  }
  return parts.join("\n\n");
}

/* The distractor guard must never be silently inert, so a missing list is a
   refusal rather than an empty array. */
function loadKnownValues() {
  const file = path.join(__dirname, "known-values.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const values = Array.isArray(raw && raw.values) ? raw.values.map(String) : [];
  if (!values.length) { throw new Error("known-values.json has no values; the distractor guard would be inert"); }
  return values;
}

function readOp(file) {
  const full = path.resolve(process.cwd(), file);
  let raw = fs.readFileSync(full, "utf8");
  /* Strip a UTF-8 BOM. PowerShell's Set-Content and Windows Notepad both write
     one, and JSON.parse rejects it with a confusing "Unexpected token" error
     even though the JSON is perfectly valid. Round-tripping a hand-written op
     file should not require knowing this. */
  if (raw.charCodeAt(0) === 0xfeff) { raw = raw.slice(1); }
  return JSON.parse(raw);
}

function slugFor(op, existing) {
  const base = "proposal/" + op.op + "-" + op.target;
  let n = 1;
  while (existing.indexOf(base + "-" + n) !== -1) { n += 1; }
  return base + "-" + n;
}

function fail(message, extra) {
  return Object.assign({ ok: false, error: message }, extra || {});
}

/**
 * The whole proposal, as one function that either returns a branch name or
 * explains why it refused. Nothing here can move main.
 */
function propose(opPath, opts) {
  const o = opts || {};
  const log = o.log || function () {};

  if (!isClean()) {
    return fail("the working tree is not clean — commit or stash first, so a proposal never mixes with your own edits");
  }
  const branch = currentBranch();
  if (branch !== "main") {
    return fail("you are on " + (branch || "a detached HEAD") + "; switch to main first, so the proposal starts from what you have");
  }

  let op;
  try { op = readOp(opPath); } catch (e) {
    return fail("could not read the op file: " + e.message);
  }

  const indexPath = path.join(ROOT, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");

  let ctx;
  try {
    ctx = {
      quizzes: quizAdd.readQuizzes(html).quizzes,
      corpus: buildCorpus(),
      correctValues: loadKnownValues()
    };
  } catch (e) {
    return fail("could not prepare the checks: " + e.message);
  }

  const verdict = quizAdd.validate(op, ctx);
  if (!verdict.ok) {
    return fail("the change was refused before anything was created", { errors: verdict.errors, derived: verdict.derived });
  }

  const slug = slugFor(op, listProposals());
  let r = git(["checkout", "-b", slug]);
  if (!r.ok) { return fail("could not create the branch: " + r.out.trim()); }

  /* From here on, every failure path must put main back and delete the branch. */
  const abortBranch = function (message) {
    git(["checkout", "--", "."]);
    git(["checkout", "main"]);
    git(["branch", "-D", slug]);
    return fail(message);
  };

  const applied = quizAdd.apply(op, html);
  if (!applied.ok) { return abortBranch("the change could not be applied: " + applied.error); }
  fs.writeFileSync(indexPath, applied.html, "utf8");

  let synced;
  try {
    synced = syncTotal(verdict.derived.totalBefore, verdict.derived.totalAfter);
  } catch (e) {
    return abortBranch("could not update the stated question total: " + e.message);
  }

  git(["add", "index.html"]);
  (synced.files || []).forEach(function (f) { git(["add", f]); });

  const message = "Proposal: " + applied.changes.join("; ");
  r = git(["commit", "-m", message]);
  if (!r.ok) { return abortBranch("the commit on the branch failed: " + r.out.trim()); }

  /* Leave the user where they started. */
  r = git(["checkout", "main"]);
  if (!r.ok) { return fail("the proposal was committed on " + slug + " but switching back to main failed: " + r.out.trim()); }

  log("proposed " + slug);
  return {
    ok: true,
    slug: slug,
    message: message,
    changes: applied.changes,
    synced: syncTotalReport(synced),
    derived: verdict.derived,
    next: [
      "node server/ops/accept.js " + slug,
      "node server/ops/reject.js " + slug
    ]
  };
}

function syncTotalReport(synced) {
  const files = (synced && synced.files) || [];
  return files.length ? files.join("; ") : null;
}

module.exports = {
  propose: propose,
  listProposals: listProposals,
  buildCorpus: buildCorpus,
  loadKnownValues: loadKnownValues,
  currentBranch: currentBranch,
  isClean: isClean
};

/**
 * The guide states the question total in more than one document, and a stale
 * count is exactly the failure class this project keeps finding. Decision R23
 * says a shared fact moves in the same change, so every file that states
 * "<n> questions" is rewritten here rather than left to rot.
 *
 * It returns the list of files it touched so the caller stages exactly those.
 */
const COUNT_FILES = [
  "README.md",
  "docs/assistant/README.md",
  "docs/assistant/DECISIONS.md",
  "Shad-Drone-Audit-Report.md"
];

function syncTotal(before, after) {
  const from = before + " questions";
  const to = after + " questions";
  const files = [];
  COUNT_FILES.forEach(function (rel) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) { return; }
    const text = fs.readFileSync(full, "utf8");
    if (text.indexOf(from) === -1) { return; }
    fs.writeFileSync(full, text.split(from).join(to), "utf8");
    files.push(rel);
  });
  return { files: files, from: from, to: to };
}

/* ---------- command line: node server/ops/propose.js <op.json> | --list ---------- */
if (require.main === module) {
  const arg = process.argv[2];
  if (!arg || arg === "--list") {
    const list = listProposals();
    console.log(list.length ? list.join("\n") : "no open proposals");
    process.exit(0);
  }
  const res = propose(arg, { log: function (m) { console.log(m); } });
  if (!res.ok) {
    console.error("REFUSED: " + res.error);
    (res.errors || []).forEach(function (e) { console.error("  - " + e); });
    process.exit(1);
  }
  console.log("");
  console.log("  " + res.message);
  res.changes.forEach(function (c) { console.log("   - " + c); });
  if (res.synced) { console.log("   - " + res.synced); }
  console.log("");
  console.log("  main is untouched. Review with:");
  console.log("    git diff main " + res.slug);
  console.log("  Accept:  " + res.next[0]);
  console.log("  Reject:  " + res.next[1]);
  process.exit(0);
}

/* NOTE: there used to be a second, older `syncTotal(file, before, after)` down
   here. Two function declarations with the same name is legal JavaScript and the
   LATER one silently wins, so the new call `syncTotal(before, after)` was reaching
   the old 3-argument version and passing 28 as a file path. It is deleted; if you
   ever add a second definition, the run-time behaviour changes without an error.
   Caught by scripts/dev/check-propose.js. */

