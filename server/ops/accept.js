/**
 * accept — merge a proposal, but only if the gate is green on it.
 *
 *   node server/ops/accept.js proposal/quiz-add-detect-1
 *
 * Order, and it matters:
 *   1. the branch must exist, the tree must be clean, and we must be on main
 *   2. check the branch out and run the WHOLE gate against it
 *   3. red gate  -> nothing merged, main restored, branch kept so you can look
 *   4. green gate -> merge into main, rebuild the single file, mirror the Desktop copy
 *
 * The gate runs on the branch rather than on main after a merge, so a red result
 * can never leave a broken commit on main.
 *
 * Two things are skipped with a loud warning rather than faked: the single-file
 * rebuild needs dist/bundle.js (git-ignored, so absent in a fresh clone), and the
 * Desktop mirror needs GUIDE_DESKTOP_COPY.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const BUILD_NAME = "Shad's Build Guide.html";

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
const branchExists = (slug) => git(["rev-parse", "--verify", "--quiet", "refs/heads/" + slug]).ok;

function runGate() {
  /* GATE_CMD is a path to a JS file run by node, so the loop can be tested
     hermetically in a clone where the single-file suite cannot run. It defaults
     to the real gate. Passing a path rather than a shell string avoids every
     quoting problem Windows has with commands containing spaces. */
  const script = process.env.GATE_CMD || "scripts/dev/gate.js";
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT, encoding: "utf8", timeout: 600000, maxBuffer: 32 * 1024 * 1024
  });
  return { ok: r.status === 0, status: r.status, tail: String(r.stdout || "") + String(r.stderr || "") };
}

function rebuild() {
  const bundle = path.join(ROOT, "dist", "bundle.js");
  if (!fs.existsSync(bundle)) {
    return {
      ok: false, skipped: true,
      reason: "dist/bundle.js is not present (it is git-ignored), so the single-file build cannot be made here"
    };
  }
  const r = spawnSync(process.execPath,
    ["scripts/standalone/make-standalone.js", "dist/bundle.js", BUILD_NAME],
    { cwd: ROOT, encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) {
    return { ok: false, reason: "the rebuild failed: " + String((r.stdout || "") + (r.stderr || "")).slice(0, 300) };
  }
  return { ok: true };
}

function mirror() {
  const dest = process.env.GUIDE_DESKTOP_COPY;
  if (!dest) { return { skipped: true, reason: "GUIDE_DESKTOP_COPY is not set" }; }
  const src = path.join(ROOT, "dist", BUILD_NAME);
  if (!fs.existsSync(src)) { return { skipped: true, reason: "there is no built file to copy" }; }
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return { ok: true, dest: dest };
  } catch (e) {
    return { ok: false, reason: "could not copy to " + dest + ": " + e.message };
  }
}

function fail(message, extra) {
  return Object.assign({ ok: false, error: message }, extra || {});
}

function accept(slug, opts) {
  const o = opts || {};
  const log = o.log || function () {};

  if (!slug) { return fail("no proposal named"); }
  if (!branchExists(slug)) { return fail('there is no branch called "' + slug + '"'); }
  if (!isClean()) { return fail("the working tree is not clean — commit or stash first"); }
  if (currentBranch() !== "main") {
    return fail("switch to main before accepting (you are on " + currentBranch() + ")");
  }

  let r = git(["checkout", slug]);
  if (!r.ok) { return fail("could not check out the proposal: " + r.out.trim()); }

  /* Bring the proposal up to date with main before gating it. A proposal made an
     hour ago carries the tests from an hour ago, and gating stale tests either
     fails a good change or passes a bad one. Merging main in first means the
     proposal is always judged by the CURRENT checks. */
  const upToDate = git(["merge", "main", "--no-edit", "-m", "Merge main into " + slug + " before gating"]);
  if (!upToDate.ok) {
    git(["merge", "--abort"]);
    git(["checkout", "main"]);
    return fail("this proposal conflicts with the current main; re-propose it against the latest main");
  }

  log("running the gate on " + slug + " ...");
  const gate = runGate();
  if (!gate.ok) {
    git(["checkout", "main"]);
    return fail("the gate is RED on this proposal; nothing was merged. The branch is still there to inspect.",
      { gate: gate.tail.split(/\r?\n/).filter((l) => /FAIL|GATE|named checks/.test(l)).slice(0, 12) });
  }

  r = git(["checkout", "main"]);
  if (!r.ok) { return fail("the gate passed but switching back to main failed: " + r.out.trim()); }

  r = git(["merge", "--no-ff", slug, "-m", "Accept " + slug]);
  if (!r.ok) { return fail("the merge failed: " + r.out.trim()); }

  const build = rebuild();
  const copy = mirror();

  log("accepted " + slug);
  return {
    ok: true,
    slug: slug,
    build: build,
    copy: copy,
    undo: 'git revert -m 1 HEAD   # or: git reset --hard HEAD~1'
  };
}

module.exports = { accept: accept, branchExists: branchExists, runGate: runGate, rebuild: rebuild, mirror: mirror };

/* ---------- command line: node server/ops/accept.js <proposal-branch> ---------- */
if (require.main === module) {
  const slug = process.argv[2];
  const res = accept(slug, { log: function (m) { console.log(m); } });
  if (!res.ok) {
    console.error("NOT ACCEPTED: " + res.error);
    (res.gate || []).forEach(function (l) { console.error("  " + l.trim()); });
    process.exit(1);
  }
  console.log("");
  console.log("  merged " + res.slug + " into main.");
  console.log("  single-file build : " + (res.build.ok ? "rebuilt" : "SKIPPED - " + res.build.reason));
  console.log("  desktop copy      : " + (res.copy.ok ? "updated " + res.copy.dest
    : res.copy.skipped ? "SKIPPED - " + res.copy.reason : "FAILED - " + res.copy.reason));
  console.log("");
  console.log("  to undo: " + res.undo);
  process.exit(0);
}
