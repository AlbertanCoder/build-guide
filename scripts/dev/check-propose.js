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

function run(cmd, args, cwd, env) {
  const r = spawnSync(cmd, args, {
    cwd: cwd || CLONE, encoding: "utf8", windowsHide: true,
    env: Object.assign({}, process.env, env || {})
  });
  return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}
const node = (args) => run(process.execPath, args, CLONE);
const gitOut = (args) => run("git", args, CLONE).out;

/* A nonce keeps this fixture unique across runs. Without it, accepting the
   proposal in the real repo would leave the question in the bank, and the next
   test run would be refused as a duplicate — the test would fail forever after
   a successful acceptance. */
const NONCE = "probe" + Date.now().toString(36);

const OP = {
  op: "quiz-add",
  target: "detect",
  intent: { add: 1, minLevel: 3 },
  question: {
    q: "At 30 m with the 55 degree lens, roughly how much ground does one pixel cover? (" + NONCE + ")",
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
    /* --branch main matters: a plain local clone inherits the outer repo's HEAD,
       and during accept the outer repo is briefly on the proposal branch. Without
       this, the clone landed on the branch and propose refused to run. */
    let r = run("git", ["clone", "--quiet", "--branch", "main", ROOT, CLONE], TMP);
    check("cloned main of the repo to a temp dir", r.status === 0,
      r.status === 0 ? "ok" : r.out.slice(0, 150));
    if (r.status !== 0) { throw new Error("clone failed"); }
    check("the clone is on main regardless of what the outer repo is doing",
      gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim() === "main",
      gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim());

    const indexPath = path.join(CLONE, "index.html");
    const startHtml = fs.readFileSync(indexPath, "utf8");
    /* Read the baseline rather than hardcoding it. Once a real question is
       accepted the repo legitimately has 6 detection questions, and a test that
       insisted on 5 would go red for a CORRECT change — the exact thing R22
       exists to prevent. */
    const cloneOp = require(path.join(CLONE, "server", "ops", "quiz-add.js"));
    const startQuizzes = cloneOp.readQuizzes(startHtml).quizzes;
    const startDetect = startQuizzes.detect.length;
    const startTotal = Object.keys(startQuizzes)
      .reduce((n, k) => n + startQuizzes[k].length, 0);
    check("the clone has a detection quiz to add to", startDetect >= 1,
      startDetect + " detection, " + startTotal + " total");

    /* The ops under test are the WORKING TREE ones, copied into the throwaway
       clone and committed THERE as "the code under test": a fix and its tests are
       then validated in the same run, instead of testing the previous commit's
       code (approved change, R22, propose loop 32 -> 38). The real working repo
       is still never a test subject, and nothing here ever pushes. */
    fs.mkdirSync(path.join(CLONE, "server", "ops"), { recursive: true });
    ["propose.js", "quiz-add.js", "prose-rewrite.js", "known-values.json",
      "accept.js", "undo.js", "reject.js"].forEach(function (f) {
      fs.copyFileSync(path.join(ROOT, "server", "ops", f), path.join(CLONE, "server", "ops", f));
    });
    fs.copyFileSync(path.join(ROOT, "server", "cost-engine.js"), path.join(CLONE, "server", "cost-engine.js"));
    run("git", ["add", "-A"], CLONE);
    run("git", ["commit", "--quiet", "-m", "code under test (working tree, placed by check-propose)"], CLONE);

    const proseMod = require(path.join(ROOT, "server", "ops", "prose-rewrite.js"));
    const pBuildSpan = proseMod.sectionSpan(startHtml, "p-build");
    const PROSE_ANCHOR = /<p\b[^>]*>[\s\S]*?<\/p>/.exec(
      startHtml.slice(pBuildSpan.start, pBuildSpan.end))[0];
    const PROSE_NEW = "<p>Prose fixture " + NONCE +
      " rewrites this paragraph with enough words to satisfy every length rule.</p>";

    fs.writeFileSync(path.join(CLONE, "op.json"), JSON.stringify(OP, null, 2), "utf8");

    r = node(["server/ops/propose.js", "op.json"]);
    check("propose succeeded", r.status === 0,
      r.status === 0 ? "ok" : r.out.split(/\r?\n/).slice(0, 3).join(" / "));

    check("a proposal branch was created",
      /proposal\/quiz-add-detect-1/.test(gitOut(["branch", "--list", "proposal/*"])),
      gitOut(["branch", "--list", "proposal/*"]).trim());

    /* ---- the assertions that matter: main must not have moved ---------- */
    const mainNow = fs.readFileSync(indexPath, "utf8");
    const mainQuizzes = cloneOp.readQuizzes(mainNow).quizzes;
    const mainTotal = Object.keys(mainQuizzes)
      .reduce((n, k) => n + mainQuizzes[k].length, 0);
    check("MAIN IS UNCHANGED: detection still has " + startDetect,
      mainQuizzes.detect.length === startDetect, String(mainQuizzes.detect.length));
    check("MAIN IS UNCHANGED: still " + startTotal + " questions on disk",
      mainTotal === startTotal, String(mainTotal));
    check("we are back on main",
      gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim() === "main");
    check("the working tree is clean after proposing",
      gitOut(["status", "--porcelain", "--untracked-files=no"]).trim() === "");

    /* ---- the branch itself --------------------------------------------- */
    const branchHtml = gitOut(["show", "proposal/quiz-add-detect-1:index.html"]);
    check("the branch adds exactly one detection question",
      new RegExp("\\(" + (startDetect + 1) + " questions\\)").test(branchHtml));
    const branchReadme = gitOut(["show", "proposal/quiz-add-detect-1:docs/assistant/README.md"]);
    check("the branch updated the stated total in the docs",
      new RegExp((startTotal + 1) + " questions").test(branchReadme));

    /* ---- a second proposal gets its own number ------------------------- */
    r = node(["server/ops/propose.js", "op.json"]);
    check("a second proposal is numbered -2",
      /proposal\/quiz-add-detect-2/.test(gitOut(["branch", "--list", "proposal/*"])));

    /* ---- a hand-written op file with a UTF-8 BOM must still work --------- */
    const bomFile = path.join(CLONE, "bom-op.json");
    fs.writeFileSync(bomFile, "\ufeff" + JSON.stringify(OP, null, 2), "utf8");
    r = node(["server/ops/propose.js", "bom-op.json"]);
    check("an op file saved with a UTF-8 BOM is accepted",
      r.status === 0, r.out.split(/\r?\n/)[0].slice(0, 90));

    /* ---- prose-rewrite through the same loop ----------------------------- */
    const proseHtmlBefore = fs.readFileSync(indexPath, "utf8");
    fs.writeFileSync(path.join(CLONE, "prose.json"), JSON.stringify(
      { op: "prose-rewrite", section: "p-build", oldText: PROSE_ANCHOR, newText: PROSE_NEW },
      null, 2), "utf8");
    r = node(["server/ops/propose.js", "prose.json"]);
    check("propose runs a prose-rewrite end to end", r.status === 0,
      r.status === 0 ? "ok" : r.out.split(/\r?\n/).slice(0, 3).join(" / "));
    check("a prose-rewrite proposal branch was created",
      /proposal\/prose-rewrite-p-build-1/.test(gitOut(["branch", "--list", "proposal/*"])),
      gitOut(["branch", "--list", "proposal/*"]).trim());
    check("MAIN IS UNCHANGED: the prose proposal moved no bytes",
      fs.readFileSync(indexPath, "utf8") === proseHtmlBefore);
    const proseBranchHtml = gitOut(["show", "proposal/prose-rewrite-p-build-1:index.html"]);
    check("the branch carries the rewritten paragraph",
      proseBranchHtml.indexOf(PROSE_NEW) !== -1 && proseBranchHtml.indexOf(PROSE_ANCHOR) === -1);
    const proseBranchQuizzes = cloneOp.readQuizzes(proseBranchHtml).quizzes;
    const proseBranchTotal = Object.keys(proseBranchQuizzes)
      .reduce((n, k) => n + proseBranchQuizzes[k].length, 0);
    check("the prose branch left the question total at " + startTotal,
      proseBranchTotal === startTotal, String(proseBranchTotal));

    fs.writeFileSync(path.join(CLONE, "prose-bad.json"), JSON.stringify(
      {
        op: "prose-rewrite", section: "p-build", oldText: PROSE_ANCHOR,
        newText: "<p>Bad fixture claims this is 100% safe and deserves to be rewritten.</p>"
      }, null, 2), "utf8");
    const branchesBeforeProse = gitOut(["branch", "--list", "proposal/*"]);
    r = node(["server/ops/propose.js", "prose-bad.json"]);
    check("a prose op with banned language is refused and leaves no branch",
      r.status !== 0 && /100%/.test(r.out) &&
      gitOut(["branch", "--list", "proposal/*"]) === branchesBeforeProse,
      r.out.split(/\r?\n/)[0].slice(0, 90));

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

    /* ---- accept with a GREEN gate: merges, and admits what it skipped --- */
    const greenGate = path.join(CLONE, "gate-green.js");
    fs.writeFileSync(greenGate, "process.exit(0);\n", "utf8");
    const redGate = path.join(CLONE, "gate-red.js");
    fs.writeFileSync(redGate, "console.log('FAIL a check is broken');\nprocess.exit(1);\n", "utf8");

    let a = run(process.execPath, ["server/ops/accept.js", "proposal/quiz-add-detect-1"], CLONE,
      { GATE_CMD: greenGate });
    check("accept succeeds when the gate is green", a.status === 0, a.out.split(/\r?\n/)[0].slice(0, 90));
    const merged = fs.readFileSync(indexPath, "utf8");
    check("main now carries the new question",
      new RegExp("\\(" + (startDetect + 1) + " questions\\)").test(merged));
    check("accept says it SKIPPED the single-file build rather than pretending",
      /SKIPPED/.test(a.out), (a.out.split(/\r?\n/).filter((l) => /build/.test(l))[0] || "").trim().slice(0, 80));
    check("the accepted branch is kept as a record",
      /proposal\/quiz-add-detect-1/.test(gitOut(["branch", "--list", "proposal/*"])));

    /* ---- undo: revert AND rebuild, not just revert --------------------- */
    const undoRun = run(process.execPath, ["server/ops/undo.js"], CLONE, { GATE_CMD: greenGate });
    check("undo succeeds", undoRun.status === 0, undoRun.out.split(/\r?\n/)[0].slice(0, 90));
    const afterUndo = cloneOp.readQuizzes(fs.readFileSync(indexPath, "utf8")).quizzes;
    check("undo puts the question count back", afterUndo.detect.length === startDetect,
      String(afterUndo.detect.length));
    check("undo reports the build it could not do rather than pretending",
      /SKIPPED/.test(undoRun.out),
      (undoRun.out.split(/\r?\n/).filter((l) => /build/.test(l))[0] || "").trim().slice(0, 80));

    const again = run(process.execPath, ["server/ops/undo.js"], CLONE, { GATE_CMD: greenGate });
    check("undo with nothing left to undo refuses clearly",
      again.status !== 0 && /already undone/.test(again.out),
      again.out.split(/\r?\n/)[0].slice(0, 90));

    /* ---- accept with a RED gate: merges nothing ------------------------- */
    const beforeRed = fs.readFileSync(indexPath, "utf8");
    a = run(process.execPath, ["server/ops/accept.js", "proposal/quiz-add-detect-2"], CLONE,
      { GATE_CMD: redGate });
    check("accept refuses when the gate is red", a.status !== 0 && /RED/.test(a.out),
      a.out.split(/\r?\n/)[0].slice(0, 90));
    check("a red gate leaves main byte-identical",
      fs.readFileSync(indexPath, "utf8") === beforeRed);
    check("the refused branch is kept for inspection",
      /proposal\/quiz-add-detect-2/.test(gitOut(["branch", "--list", "proposal/*"])));

    /* ---- reject deletes the branch and touches nothing else ------------- */
    const beforeReject = fs.readFileSync(indexPath, "utf8");
    const rj = run(process.execPath, ["server/ops/reject.js", "proposal/quiz-add-detect-2"], CLONE);
    check("reject succeeds", rj.status === 0, rj.out.trim().slice(0, 80));
    check("the rejected branch is gone",
      !/proposal\/quiz-add-detect-2/.test(gitOut(["branch", "--list", "proposal/*"])));
    check("reject left main byte-identical",
      fs.readFileSync(indexPath, "utf8") === beforeReject);

    const guard = run(process.execPath, ["server/ops/reject.js", "main"], CLONE);
    check("reject refuses to delete anything that is not a proposal",
      guard.status !== 0, guard.out.split(/\r?\n/)[0].slice(0, 80));

    /* ---- fault injection: a crash must not strand the repo ---------------- */
    /* Patch the clone's copy of propose() to throw AFTER the edit is staged —
       the exact accident this hardening was paid for. */
    const clonePropose = path.join(CLONE, "server", "ops", "propose.js");
    const proposeSrc = fs.readFileSync(clonePropose, "utf8");
    const marker = 'const message = "Proposal: " + applied.changes.join("; ");';
    fs.writeFileSync(clonePropose,
      proposeSrc.split(marker).join('throw new Error("fault injection");\n    ' + marker), "utf8");
    /* Commit the patch inside the clone, or the clean-tree guard fires before the
       injected crash can happen. */
    run("git", ["add", "-A"], CLONE);
    run("git", ["commit", "--quiet", "-m", "fault injection"], CLONE);
    fs.writeFileSync(path.join(CLONE, "fault.json"), JSON.stringify(
      { op: "prose-rewrite", section: "p-build", oldText: PROSE_ANCHOR, newText: PROSE_NEW },
      null, 2), "utf8");
    const faultBefore = fs.readFileSync(indexPath, "utf8");
    const faultBranches = gitOut(["branch", "--list", "proposal/*"]);
    r = node(["server/ops/propose.js", "fault.json"]);
    check("an unexpected crash during propose leaves no branch and puts you back on main",
      r.status !== 0 && /unexpected error/.test(r.out) &&
      gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim() === "main" &&
      gitOut(["branch", "--list", "proposal/*"]) === faultBranches &&
      gitOut(["status", "--porcelain", "--untracked-files=no"]).trim() === "" &&
      fs.readFileSync(indexPath, "utf8") === faultBefore,
      r.out.split(/\r?\n/)[0].slice(0, 90));

    /* ---- the artifact chain: rebuild writes where mirror reads ------------- */
    /* The bug this catches: rebuild refreshed the tracked root artifact while
       mirror shipped the stale dist/ copy to the Desktop. */
    const acceptMod = require(path.join(CLONE, "server", "ops", "accept.js"));
    fs.mkdirSync(path.join(CLONE, "dist"), { recursive: true });
    fs.writeFileSync(path.join(CLONE, "dist", "bundle.js"), "fake bundle", "utf8");
    const fakeBuild = path.join(CLONE, "fake-build.js");
    fs.writeFileSync(fakeBuild,
      'require("fs").writeFileSync(process.argv[3], "KNOWN-BUILD-" + Date.now(), "utf8");\n', "utf8");
    process.env.BUILD_CMD = fakeBuild;
    const built = acceptMod.rebuild();
    const distFile = path.join(CLONE, "dist", acceptMod.BUILD_NAME);
    const rootFile = path.join(CLONE, acceptMod.BUILD_NAME);
    check("rebuild refreshes both the tracked artifact and the mirror source",
      built.ok &&
      /^KNOWN-BUILD-/.test(fs.readFileSync(distFile, "utf8")) &&
      /^KNOWN-BUILD-/.test(fs.readFileSync(rootFile, "utf8")),
      built.ok ? "dist and root both refreshed" : String(built.reason || "rebuild failed"));

    const desktopTmp = path.join(TMP, "desktop-copy.html");
    process.env.GUIDE_DESKTOP_COPY = desktopTmp;
    const mirrored = acceptMod.mirror();
    const sameBytes = fs.existsSync(desktopTmp) &&
      fs.readFileSync(desktopTmp).equals(fs.readFileSync(distFile));
    check("mirror leaves the target byte-identical to the built file",
      mirrored.ok && sameBytes,
      mirrored.ok ? (sameBytes ? "byte-identical" : "copy differs") : String(mirrored.reason || "mirror failed"));
    delete process.env.BUILD_CMD;
    delete process.env.GUIDE_DESKTOP_COPY;
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("propose / accept / reject verified; main never moved.");
})();

