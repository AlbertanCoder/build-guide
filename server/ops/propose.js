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
const proseRewrite = require("./prose-rewrite.js");
const correctionAdd = require("./correction-add.js");

const ROOT = path.resolve(__dirname, "..", "..");

/* The named operations propose knows how to run. Each one validates before it
   may change anything (R4). quiz-add moves the stated question total along with
   the edit (R23); prose-rewrite does not touch counts at all; correction-add
   writes the corrections memory and regenerates the domain pack index in the
   same commit (also R23: a fact and its index move together). */
const OP_MODULES = {
  "quiz-add": {
    mod: quizAdd,
    syncTotals: true,
    ctx: function (html) {
      return {
        quizzes: quizAdd.readQuizzes(html).quizzes,
        corpus: buildCorpus(),
        correctValues: loadKnownValues()
      };
    }
  },
  "prose-rewrite": {
    mod: proseRewrite,
    syncTotals: false,
    ctx: function (html) { return { html: html }; }
  },
  "correction-add": {
    mod: correctionAdd,
    syncTotals: false,
    target: correctionAdd.FILE,
    rebuild: "domain",
    ctx: function (html, content) { return { html: html, existing: content }; }
  }
};

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
  const base = "proposal/" + op.op + "-" + (op.target || op.section || "change");
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
    return fail("Edit not made: this folder has changes that are not saved in git yet (the working tree is not clean), so a chat edit could mix with your own work. Save or set those changes aside first.");
  }
  const branch = currentBranch();
  if (branch !== "main") {
    return fail("Edit not made: this folder is on " + (branch ? "the branch " + branch : "no branch (a detached HEAD)") + ", not main. The chat only makes edits from main, so they start from what you have.");
  }

  let op;
  try { op = readOp(opPath); } catch (e) {
    return fail("could not read the op file: " + e.message);
  }

  const indexPath = path.join(ROOT, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");

  const spec = OP_MODULES[op && op.op];
  if (!spec) {
    return fail('unknown op "' + (op && op.op) + '" (known: ' + Object.keys(OP_MODULES).join(", ") + ")");
  }

  const targetRel = spec.target || "index.html";
  const targetPath = path.join(ROOT, targetRel);
  const targetContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";

  let ctx;
  try {
    ctx = spec.ctx(html, targetContent);
  } catch (e) {
    return fail("could not prepare the checks: " + e.message);
  }

  const verdict = spec.mod.validate(op, ctx);
  if (!verdict.ok) {
    return fail("the change was refused before anything was created", { errors: verdict.errors, derived: verdict.derived });
  }

  const slug = slugFor(op, listProposals());
  let r = git(["checkout", "-b", slug]);
  if (!r.ok) { return fail("could not create the branch: " + r.out.trim()); }

  /* From here on, every failure path must put main back and delete the branch —
     including paths no one wrote a message for. reset --hard clears the staged
     copy too: git checkout -- . does not touch the index, and a crash after
     git add once smuggled a staged edit into an unrelated commit (2026-11-01). */
  const abortBranch = function (message) {
    git(["reset", "--hard"]);
    git(["checkout", "main"]);
    git(["branch", "-D", slug]);
    return fail(message);
  };

  /* The try wraps the rest of the function body. */
  try {
  const applied = spec.mod.apply(op, targetContent);
  if (!applied.ok) { return abortBranch("the change could not be applied: " + applied.error); }
  const outText = ("html" in applied) ? applied.html : applied.content;
  fs.writeFileSync(targetPath, outText, "utf8");

  /* A fact and its index move together (R23): a correction commits the
     regenerated domain pack beside the correction itself. */
  if (spec.rebuild === "domain") {
    try {
      execFileSync(process.execPath, ["scripts/dev/build-domain.js"],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      return abortBranch("the domain pack rebuild failed: " +
        String((e.stdout || "") + (e.stderr || "") || e.message).slice(0, 200));
    }
    git(["add", "docs/js/domain.js"]);
  }

  let synced = null;
  if (spec.syncTotals) {
    try {
      synced = syncTotal(verdict.derived.totalBefore, verdict.derived.totalAfter);
    } catch (e) {
      return abortBranch("could not update the stated question total: " + e.message);
    }
  }

  git(["add", targetRel]);
  ((synced && synced.files) || []).forEach(function (f) { git(["add", f]); });

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
  } catch (e) {
    return abortBranch("an unexpected error stopped the proposal: " +
      (e && e.message ? e.message : String(e)));
  }
}

function syncTotalReport(synced) {
  const files = (synced && synced.files) || [];
  return files.length ? files.join("; ") : null;
}

module.exports = {
  propose: propose,
  proposeMany: proposeMany,
  listProposals: listProposals,
  buildCorpus: buildCorpus,
  loadKnownValues: loadKnownValues,
  currentBranch: currentBranch,
  isClean: isClean
};

/**
 * proposeMany — one branch carrying several validated changes, committed once.
 *
 * The drafter needs this: the user asked for three questions, which is ONE thing to
 * review, not three branches to merge separately. Every op is validated up front; if
 * any one fails, nothing is created.
 */
function proposeMany(ops, opts) {
  const o = opts || {};
  const log = o.log || function () {};
  const list = Array.isArray(ops) ? ops : [ops];

  if (!list.length) { return fail("no changes were supplied"); }
  if (!isClean()) {
    return fail("Edit not made: this folder has changes that are not saved in git yet (the working tree is not clean), so a chat edit could mix with your own work. Save or set those changes aside first.");
  }
  if (currentBranch() !== "main") {
    return fail("Edit not made: this folder is on " + (currentBranch() ? "the branch " + currentBranch() : "no branch (a detached HEAD)") + ", not main. The chat only makes edits from main.");
  }

  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");

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

  /* Validate every op against the ORIGINAL state before touching anything. */
  const verdicts = list.map((op) => quizAdd.validate(op, ctx));
  const bad = verdicts.filter((v) => !v.ok);
  if (bad.length) {
    return fail(bad.length + " of " + list.length + " change(s) were refused before anything was created", {
      errors: bad.reduce((acc, v) => acc.concat(v.errors), [])
    });
  }

  const target = list[0].target;
  const totalBefore = verdicts[0].derived.totalBefore;
  const totalAfter = totalBefore + list.length;

  let slug = o.slug || "";
  if (slug) {
    if (!/^(proposal|accept-pick)\//.test(slug)) {
      return fail('a staged branch must be named proposal/... or accept-pick/... (got "' + slug + '")');
    }
    if (listProposals().indexOf(slug) !== -1 || git(["rev-parse", "--verify", "--quiet", "refs/heads/" + slug]).ok) {
      return fail('a branch called "' + slug + '" already exists');
    }
  } else {
    slug = slugFor({ op: list[0].op, target: target }, listProposals());
  }
  let r = git(["checkout", "-b", slug]);
  if (!r.ok) { return fail("could not create the branch: " + r.out.trim()); }

  /* The item record: the ops themselves, committed with the proposal. This is
     what --pick replays (the kept items) against current main — diffs of items
     that touch shared lines (counts, titles) cannot be recombined without
     conflicts, so the ops are the honest unit of choice. */
  const recordRel = "proposals/" + slug.replace(/^(proposal|accept-pick)\//, "") + ".json";
  if (o.record !== false) {
    fs.mkdirSync(path.join(ROOT, "proposals"), { recursive: true });
    fs.writeFileSync(path.join(ROOT, recordRel), JSON.stringify(list, null, 2), "utf8");
    git(["add", recordRel]);
  }

  const abortBranch = function (message) {
    git(["reset", "--hard"]);
    git(["clean", "-fd", "proposals"]);
    git(["checkout", "main"]);
    git(["branch", "-D", slug]);
    return fail(message);
  };

  /* The try wraps the rest of the function body. */
  try {
  /* One commit per item (R15): reviewing 7 of 10 must mean keeping 7 of 10.
     The commits are the record of what was drafted; the ops record is what
     accept --pick replays, because item diffs that touch shared lines (counts,
     titles) cannot be recombined without conflicts. */
  const changes = [];
  const syncedFiles = [];
  let running = totalBefore;
  for (let i = 0; i < list.length; i += 1) {
    const op = list[i];
    const applied = quizAdd.apply(op, html);
    if (!applied.ok) {
      return abortBranch("change " + (i + 1) + " of " + list.length +
        " could not be applied: " + applied.error);
    }
    html = applied.html;
    changes.push(applied.changes[0]);
    fs.writeFileSync(indexPath, html, "utf8");

    let synced;
    try {
      synced = syncTotal(running, running + 1);
    } catch (e) {
      return abortBranch("could not update the stated question total: " + e.message);
    }
    running += 1;
    (synced.files || []).forEach(function (f) {
      if (syncedFiles.indexOf(f) === -1) { syncedFiles.push(f); }
      git(["add", f]);
    });

    git(["add", "index.html"]);
    const itemMessage = "Proposal item " + (i + 1) + "/" + list.length + ": " + applied.changes[0];
    r = git(["commit", "-m", itemMessage]);
    if (!r.ok) { return abortBranch("the commit for change " + (i + 1) + " failed: " + r.out.trim()); }
  }
  const message = "Proposal: " + list.length + " change(s), one commit each";

  r = git(["checkout", "main"]);
  if (!r.ok) { return fail("committed on " + slug + " but switching back to main failed: " + r.out.trim()); }

  log("proposed " + slug);
  return {
    ok: true,
    slug: slug,
    message: message,
    changes: changes,
    count: list.length,
    synced: syncedFiles.length ? syncedFiles.join("; ") : null,
    next: [
      "node server/ops/accept.js " + slug + " --pick 1" + (list.length > 1 ? ",2" : "") + "   (chosen items only)",
      "node server/ops/accept.js " + slug + "   (all " + list.length + ")",
      "node server/ops/reject.js " + slug
    ]
  };
  } catch (e) {
    return abortBranch("an unexpected error stopped the proposal: " +
      (e && e.message ? e.message : String(e)));
  }
}

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

