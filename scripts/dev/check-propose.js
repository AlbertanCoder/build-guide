// Tests the propose loop inside a throwaway clone of the repo.
//
//   node scripts/dev/check-propose.js
//
// It clones the committed state to a temp directory and runs propose there, so
// the real working repo is never a test subject. The assertions that matter most
// are the ones proving main did not move.
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-propose-"));
const CLONE = path.join(TMP, "clone");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd: cwd || CLONE, encoding: "utf8", windowsHide: true });
  return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}
const node = (args) => run(process.execPath, args, CLONE);
const gitOut = (args) => run("git", args, CLONE).out;

const OP = {
  op: "quiz-add",
  target: "detect",
  intent: { add: 1, minLevel: 3 },
  question: {
    q: "At 30 m with the 55 degree lens, roughly how much ground does one pixel cover?",
    a: ["About 10 cm", "About 1 m", "About 10 m", "About 30 m"],
    c: 1,
    why: "2 x 30 m x tan(27.5 deg) is about 31.2 m across; over 32 pixels that is about 0.98 m."
  },
  citation: {
    source: "docs/domain/01-thermal-detection-limits.md",
    verified: "2026-11-01",
    mustContain: "0.98 m per pixel"
  },
  level: 3
};

(async () => {
  try {
    let r = run("git", ["clone", "--quiet", ROOT, CLONE], TMP);
    check("cloned the committed repo to a temp dir", r.status === 0,
      r.status === 0 ? "ok" : r.out.slice(0, 150));
    if (r.status !== 0) { throw new Error("clone failed"); }

    const indexPath = path.join(CLONE, "index.html");
    const startHtml = fs.readFileSync(indexPath, "utf8");
    check("the clone starts with 5 detection questions",
      /Quiz: Detection & mapping \(5 questions\)/.test(startHtml));

    fs.writeFileSync(path.join(CLONE, "op.json"), JSON.stringify(OP, null, 2), "utf8");

    r = node(["server/ops/propose.js", "op.json"]);
    check("propose succeeded", r.status === 0,
      r.status === 0 ? "ok" : r.out.split(/\r?\n/).slice(0, 3).join(" / "));

    check("a proposal branch was created",
      /proposal\/quiz-add-detect-1/.test(gitOut(["branch", "--list", "proposal/*"])),
      gitOut(["branch", "--list", "proposal/*"]).trim());

    /* ---- the assertions that matter: main must not have moved ---------- */
    const mainNow = fs.readFileSync(indexPath, "utf8");
    check("MAIN IS UNCHANGED: still says 5 questions",
      /Quiz: Detection & mapping \(5 questions\)/.test(mainNow));
    const cloneOp = require(path.join(CLONE, "server", "ops", "quiz-add.js"));
    const mainTotal = Object.keys(cloneOp.readQuizzes(mainNow).quizzes)
      .reduce((n, k) => n + cloneOp.readQuizzes(mainNow).quizzes[k].length, 0);
    check("MAIN IS UNCHANGED: still 28 questions on disk", mainTotal === 28, String(mainTotal));
    check("we are back on main",
      gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim() === "main");
    check("the working tree is clean after proposing",
      gitOut(["status", "--porcelain", "--untracked-files=no"]).trim() === "");

    /* ---- the branch itself --------------------------------------------- */
    const branchHtml = gitOut(["show", "proposal/quiz-add-detect-1:index.html"]);
    check("the branch has 6 detection questions",
      /Quiz: Detection & mapping \(6 questions\)/.test(branchHtml));
    const branchReadme = gitOut(["show", "proposal/quiz-add-detect-1:docs/assistant/README.md"]);
    check("the branch updated the stated total in the docs", /29 questions/.test(branchReadme));

    /* ---- a second proposal gets its own number ------------------------- */
    r = node(["server/ops/propose.js", "op.json"]);
    check("a second proposal is numbered -2",
      /proposal\/quiz-add-detect-2/.test(gitOut(["branch", "--list", "proposal/*"])));

    /* ---- refusals leave no residue ------------------------------------- */
    const dup = JSON.parse(JSON.stringify(OP));
    dup.question.q = "How does the code find a fire in 768 numbers?";
    fs.writeFileSync(path.join(CLONE, "dup.json"), JSON.stringify(dup, null, 2), "utf8");
    const branchesBefore = gitOut(["branch", "--list", "proposal/*"]);
    r = node(["server/ops/propose.js", "dup.json"]);
    check("a near-duplicate is refused", r.status !== 0 && /too similar/.test(r.out),
      r.out.split(/\r?\n/)[0].slice(0, 90));
    check("and the refusal created no branch",
      gitOut(["branch", "--list", "proposal/*"]) === branchesBefore);

    /* ---- uncommitted changes to a TRACKED file block a proposal -------- */
    const saved = fs.readFileSync(indexPath, "utf8");
    fs.writeFileSync(indexPath, saved + "\n<!-- uncommitted edit -->\n", "utf8");
    r = node(["server/ops/propose.js", "op.json"]);
    check("uncommitted changes to a tracked file are refused",
      r.status !== 0 && /not clean/.test(r.out), r.out.split(/\r?\n/)[0].slice(0, 90));
    fs.writeFileSync(indexPath, saved, "utf8");
    check("restoring the file makes the tree clean again",
      gitOut(["status", "--porcelain", "--untracked-files=no"]).trim() === "");
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("propose verified, and main never moved.");
})();

