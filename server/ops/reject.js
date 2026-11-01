/**
 * reject — throw a proposal away.
 *
 *   node server/ops/reject.js proposal/quiz-add-detect-1
 *
 * Deletes the branch and nothing else. main was never touched by the proposal,
 * so there is no state to clean up and no residue to remember.
 */
"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

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
const branchExists = (slug) => git(["rev-parse", "--verify", "--quiet", "refs/heads/" + slug]).ok;

function reject(slug, opts) {
  const o = opts || {};
  const log = o.log || function () {};

  if (!slug) { return { ok: false, error: "no proposal named" }; }
  if (!/^proposal\//.test(slug)) {
    /* A guard worth having: `git branch -D main` would be a bad day. */
    return { ok: false, error: 'refusing to delete "' + slug + '" — only proposal/* branches can be rejected' };
  }
  if (!branchExists(slug)) { return { ok: false, error: 'there is no branch called "' + slug + '"' }; }

  if (currentBranch() === slug) {
    const back = git(["checkout", "main"]);
    if (!back.ok) { return { ok: false, error: "could not return to main first: " + back.out.trim() }; }
  }

  const r = git(["branch", "-D", slug]);
  if (!r.ok) { return { ok: false, error: "could not delete the branch: " + r.out.trim() }; }

  log("rejected " + slug);
  return { ok: true, slug: slug, deleted: true };
}

module.exports = { reject: reject };

/* ---------- command line: node server/ops/reject.js <proposal-branch> ---------- */
if (require.main === module) {
  const res = reject(process.argv[2], { log: function (m) { console.log(m); } });
  if (!res.ok) {
    console.error("NOT REJECTED: " + res.error);
    process.exit(1);
  }
  console.log("  deleted " + res.slug + ". main was never touched.");
  process.exit(0);
}
