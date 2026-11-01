/**
 * undo — revert an accepted proposal, then rebuild and re-mirror.
 *
 *   node server/ops/undo.js            # undo the most recent accept
 *   node server/ops/undo.js <commit>   # undo a specific accept
 *
 * Why this exists: `git revert` restores the SOURCE but leaves the built
 * single-file copy and the Desktop mirror untouched. During the Stage 2
 * rehearsal that meant the Desktop copy still carried the reverted question —
 * which you would only discover while demoing. Undo has to include the build,
 * or it is not really undone.
 */
"use strict";

const path = require("path");
const { execFileSync } = require("child_process");
const accept = require("./accept.js");

const ROOT = path.resolve(__dirname, "..", "..");

function git(args) {
  try {
    const out = execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out: String(out || "") };
  } catch (e) {
    return { ok: false, out: String((e.stdout || "") + (e.stderr || "") || e.message) };
  }
}
const currentBranch = () => git(["rev-parse", "--abbrev-ref", "HEAD"]).out.trim();
const isClean = () => {
  const r = git(["status", "--porcelain", "--untracked-files=no"]);
  return r.ok && r.out.trim() === "";
};

/** The most recent commit whose message starts with "Accept ". */
function lastAccept() {
  const r = git(["log", "-1", "--format=%H%x09%s", "--grep=^Accept "]);
  if (!r.ok || !r.out.trim()) { return null; }
  const parts = r.out.trim().split("\t");
  return { sha: parts[0], subject: parts.slice(1).join(" ") };
}

function fail(message, extra) {
  return Object.assign({ ok: false, error: message }, extra || {});
}

function undo(target, opts) {
  const o = opts || {};
  const log = o.log || function () {};

  if (!isClean()) { return fail("the working tree is not clean — commit or stash first"); }
  if (currentBranch() !== "main") {
    return fail("switch to main before undoing (you are on " + currentBranch() + ")");
  }

  let sha = target;
  let subject = "";
  if (!sha) {
    /* Without this guard, `git log --grep` keeps finding the same accept commit
       forever, so a second undo would try to revert something already reverted. */
    const head = git(["log", "-1", "--format=%s"]).out.trim();
    if (/^Revert "Accept /.test(head)) {
      return fail("the most recent accepted proposal is already undone");
    }
    const found = lastAccept();
    if (!found) { return fail('there is no accepted proposal to undo (no commit message starts with "Accept ")'); }
    sha = found.sha;
    subject = found.subject;
  }

  /* An accept is a merge commit, so it needs -m 1 to say which side is the base. */
  const parents = git(["rev-list", "--parents", "-n", "1", sha]).out.trim().split(/\s+/);
  const isMerge = parents.length > 2;

  const revertArgs = ["revert", "--no-edit"].concat(isMerge ? ["-m", "1"] : []).concat([sha]);
  const r = git(revertArgs);
  if (!r.ok) {
    git(["revert", "--abort"]);
    return fail("the revert failed (a conflict?): " + r.out.trim().split(/\r?\n/)[0]);
  }
  log("reverted " + sha.slice(0, 7) + (subject ? " (" + subject + ")" : ""));

  /* Rebuild before the gate, because the gate's single-file suite reads the build. */
  const build = accept.rebuild();
  const copy = accept.mirror();

  const gate = accept.runGate();
  if (!gate.ok) {
    log("WARNING: the gate is red after the revert. The revert is committed; inspect before trusting main.");
  }

  return {
    ok: true,
    reverted: sha,
    subject: subject,
    build: build,
    copy: copy,
    gateOk: gate.ok,
    gateTail: gate.ok ? "" : gate.tail.split(/\r?\n/).filter((l) => /FAIL|GATE/.test(l)).slice(0, 8)
  };
}

module.exports = { undo: undo, lastAccept: lastAccept };

/* ---------- command line: node server/ops/undo.js [commit] ---------- */
if (require.main === module) {
  const res = undo(process.argv[2], { log: function (m) { console.log(m); } });
  if (!res.ok) {
    console.error("NOT UNDONE: " + res.error);
    process.exit(1);
  }
  console.log("");
  console.log("  reverted " + res.reverted.slice(0, 7) + (res.subject ? "  (" + res.subject + ")" : ""));
  console.log("  single-file build : " + (res.build.ok ? "rebuilt" : "SKIPPED - " + res.build.reason));
  console.log("  desktop copy      : " + (res.copy.ok ? "updated " + res.copy.dest
    : res.copy.skipped ? "SKIPPED - " + res.copy.reason : "FAILED - " + res.copy.reason));
  console.log("  gate              : " + (res.gateOk ? "green" : "RED — inspect before trusting main"));
  (res.gateTail || []).forEach(function (l) { console.log("      " + l.trim()); });
  process.exit(0);
}
