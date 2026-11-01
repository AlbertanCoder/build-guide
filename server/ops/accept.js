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
  /* BUILD_CMD is a path to a JS file run by node, so the artifact chain can be
     tested hermetically with a stand-in for make-standalone (like GATE_CMD). */
  const build = process.env.BUILD_CMD || "scripts/standalone/make-standalone.js";
  const distOut = path.join("dist", BUILD_NAME);
  const r = spawnSync(process.execPath, [build, "dist/bundle.js", distOut],
    { cwd: ROOT, encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) {
    return { ok: false, reason: "the rebuild failed: " + String((r.stdout || "") + (r.stderr || "")).slice(0, 300) };
  }
  /* Two copies exist on purpose: dist/ is what the gate tests and the mirror
     ships; the repo root carries the tracked artifact a fresh clone gets.
     Refreshing only one of them is how the Desktop copy ended up demoing last
     week's document (paid for 2026-11-01). */
  try {
    fs.copyFileSync(path.join(ROOT, distOut), path.join(ROOT, BUILD_NAME));
  } catch (e) {
    return { ok: false, reason: "the build succeeded but the tracked artifact could not be refreshed: " + e.message };
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
    const a = fs.readFileSync(src);
    const b = fs.readFileSync(dest);
    if (!a.equals(b)) {
      return { ok: false, reason: "the copy at " + dest + " does not match the built file; not reporting success" };
    }
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

  /* --no-commit: the merged source and the rebuilt artifact land in ONE commit
     (R19), so reverting the accept reverts the artifact with it, and the tree is
     never left dirty for the next propose or undo to trip over. */
  r = git(["merge", "--no-ff", "--no-commit", slug]);
  if (!r.ok) { return fail("the merge failed: " + r.out.trim()); }

  const build = rebuild();
  const copy = mirror();
  if (build.ok) { git(["add", BUILD_NAME]); }

  r = git(["commit", "-m", "Accept " + slug]);
  if (!r.ok) {
    /* Rollback: nothing merged, and the built copies are put back to match main. */
    git(["merge", "--abort"]);
    git(["checkout", "--", BUILD_NAME]);
    rebuild();
    mirror();
    return fail("the final commit failed; nothing was merged: " + r.out.trim());
  }

  log("accepted " + slug);
  return {
    ok: true,
    slug: slug,
    build: build,
    copy: copy,
    undo: "node server/ops/undo.js   # reverts the accept, rebuilds, re-mirrors"
  };
}

module.exports = { accept: accept, branchExists: branchExists, runGate: runGate, rebuild: rebuild, mirror: mirror, BUILD_NAME: BUILD_NAME };

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
