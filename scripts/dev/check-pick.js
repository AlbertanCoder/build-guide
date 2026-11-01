// Tests per-item acceptance: a 3-item proposal where the user keeps 2.
//
//   node scripts/dev/check-pick.js
//
// The claim under test is R15's: "you will like seven of ten" must mean KEEPING
// seven of ten. Main receives exactly the picked items as one commit; the others
// never merge and stay on the proposal branch as the record. Everything runs in
// a throwaway clone with the working-tree ops copied in.
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-pick-"));
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
const node = (args, env) => run(process.execPath, args, CLONE, env);
const gitOut = (args) => run("git", args, CLONE).out;

const NONCE = "pick" + Date.now().toString(36);

function questionOp(n, q, a, c, why) {
  return {
    op: "quiz-add",
    target: "detect",
    intent: { add: 1, minLevel: 3 },
    question: { q: q + " (" + NONCE + "-" + n + ")", a: a, c: c, why: why },
    citation: {
      source: "docs/domain/01-thermal-detection-limits.md",
      verified: "2026-11-01",
      mustContain: "0.98 m per pixel"
    },
    level: 3
  };
}

const OP1 = questionOp(1,
  "With the 55 degree lens at 30 m, about how much ground does one pixel cover?",
  ["About 10 cm", "About 1 m", "About 10 m", "About 30 m"], 1,
  "2 x 30 m x tan(27.5 deg) is about 31.2 m across; over 32 pixels that is about 0.98 m.");
const OP2 = questionOp(2,
  "Which included file turns telemetry into a hotspot GPS position?",
  ["geo.py", "hotspots.py", "map_server.py", "flightlog.bin"], 0,
  "geo.py implements position, altitude and heading for each detected hotspot.");
const OP3 = questionOp(3,
  "How many temperature readings does the selected thermal sensor return per frame?",
  ["64", "256", "768", "2048"], 2,
  "The MLX90640 returns 768 temperature readings per frame, as the guide states.");

(async () => {
  try {
    let r = run("git", ["clone", "--quiet", "--branch", "main", ROOT, CLONE], TMP);
    check("cloned main of the repo to a temp dir", r.status === 0,
      r.status === 0 ? "ok" : r.out.slice(0, 150));
    if (r.status !== 0) { throw new Error("clone failed"); }

    /* ---- code under test = working tree ---------------------------------- */
    const serverDir = path.join(ROOT, "server");
    fs.mkdirSync(path.join(CLONE, "server", "ops"), { recursive: true });
    fs.readdirSync(serverDir).filter((f) => f.endsWith(".js")).forEach(function (f) {
      fs.copyFileSync(path.join(serverDir, f), path.join(CLONE, "server", f));
    });
    fs.readdirSync(path.join(serverDir, "ops")).forEach(function (f) {
      fs.copyFileSync(path.join(serverDir, "ops", f), path.join(CLONE, "server", "ops", f));
    });
    run("git", ["add", "-A"], CLONE);
    run("git", ["commit", "--quiet", "-m", "code under test (working tree, placed by check-pick)"], CLONE);

    const proposeMod = require(path.join(CLONE, "server", "ops", "propose.js"));
    const quizMod = require(path.join(CLONE, "server", "ops", "quiz-add.js"));
    const indexPath = path.join(CLONE, "index.html");
    const startHtml = fs.readFileSync(indexPath, "utf8");
    const startQuizzes = quizMod.readQuizzes(startHtml).quizzes;
    const startDetect = startQuizzes.detect.length;
    const startTotal = Object.keys(startQuizzes).reduce((n, k) => n + startQuizzes[k].length, 0);

    /* ---- one proposal carrying three items ------------------------------- */
    const proposed = proposeMod.proposeMany([OP1, OP2, OP3]);
    check("proposeMany proposes all three items on one branch",
      proposed.ok === true && proposed.count === 3,
      proposed.ok ? proposed.slug + ": " + (proposed.changes || []).join(" ; ") : proposed.error);
    const slug = proposed.slug;

    const subjects = gitOut(["log", "--reverse", "--format=%s", "main.." + slug])
      .split(/\r?\n/).filter(Boolean);
    check("each item is its own commit",
      subjects.filter((s) => s.indexOf("Proposal item ") === 0).length === 3,
      subjects.join(" | "));
    check("the item commits are numbered 1/3 to 3/3 in order",
      subjects[0].indexOf("Proposal item 1/3") === 0 &&
      subjects[1].indexOf("Proposal item 2/3") === 0 &&
      subjects[2].indexOf("Proposal item 3/3") === 0);

    const recOnBranch = gitOut(["show",
      slug + ":proposals/" + slug.replace(/^proposal\//, "") + ".json"]);
    check("the proposal carries an item record of all three ops",
      recOnBranch.indexOf(NONCE + "-1") !== -1 && recOnBranch.indexOf(NONCE + "-3") !== -1 &&
      /"op": "quiz-add"/.test(recOnBranch));

    /* ---- keep 1 and 3, drop 2 ------------------------------------------- */
    const greenGate = path.join(CLONE, "gate-green.js");
    fs.writeFileSync(greenGate, "process.exit(0);\n", "utf8");

    let a = node(["server/ops/accept.js", slug, "--pick", "1,3"], { GATE_CMD: greenGate });
    check("accept --pick 1,3 succeeds", a.status === 0,
      a.status === 0 ? "ok" : a.out.split(/\r?\n/).slice(0, 3).join(" / "));
    check("the report says which items were kept and dropped",
      /kept items 1,3/.test(a.out) && /dropped items\s*: 2/.test(a.out),
      a.out.split(/\r?\n/).filter((l) => /kept|dropped/.test(l))[0] || "");

    const afterHtml = fs.readFileSync(indexPath, "utf8");
    check("main carries item 1's question", afterHtml.indexOf(NONCE + "-1") !== -1);
    check("main carries item 3's question", afterHtml.indexOf(NONCE + "-3") !== -1);
    check("main does NOT carry item 2's question", afterHtml.indexOf(NONCE + "-2") === -1);
    const afterQuizzes = quizMod.readQuizzes(afterHtml).quizzes;
    const afterTotal = Object.keys(afterQuizzes).reduce((n, k) => n + afterQuizzes[k].length, 0);
    check("the totals count exactly the two kept items (" + (startTotal + 2) + ")",
      afterTotal === startTotal + 2 && afterQuizzes.detect.length === startDetect + 2,
      afterQuizzes.detect.length + " detect, " + afterTotal + " total");
    check("the stated question total in the docs moved with the items",
      /(\d+) questions/.test(fs.readFileSync(path.join(CLONE, "docs", "assistant", "README.md"), "utf8")) &&
      fs.readFileSync(path.join(CLONE, "docs", "assistant", "README.md"), "utf8")
        .indexOf((startTotal + 2) + " questions") !== -1);

    const keptBranch = gitOut(["log", "--reverse", "--format=%s", "main.." + slug])
      .split(/\r?\n/).filter(Boolean);
    check("the proposal branch still holds all three items as the record",
      keptBranch.filter((s) => s.indexOf("Proposal item ") === 0).length === 3);

    /* ---- refusals leave nothing behind ----------------------------------- */
    const branchesBefore = gitOut(["branch", "--list", "*"]);
    a = node(["server/ops/accept.js", slug, "--pick", "9"], { GATE_CMD: greenGate });
    check("an out-of-range item is refused", a.status !== 0 && /outside 1-3/.test(a.out),
      a.out.split(/\r?\n/)[0].slice(0, 90));
    a = node(["server/ops/accept.js", slug, "--pick", "1;x"], { GATE_CMD: greenGate });
    check("garbage in the pick list is refused", a.status !== 0 && /cannot read/.test(a.out),
      a.out.split(/\r?\n/)[0].slice(0, 90));
    check("the refusals left no staging branch behind",
      gitOut(["branch", "--list", "accept-pick/*"]).trim() === "" &&
      gitOut(["branch", "--list", "*"]) === branchesBefore);

    /* ---- undo takes the picked items back out ----------------------------- */
    const u = node(["server/ops/undo.js"], { GATE_CMD: greenGate });
    check("undo of a --pick accept succeeds", u.status === 0,
      u.out.split(/\r?\n/)[0].slice(0, 90));
    const undoneHtml = fs.readFileSync(indexPath, "utf8");
    check("undo puts main back: none of the three questions remain",
      undoneHtml.indexOf(NONCE) === -1);
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("per-item acceptance verified: picked items land, the rest never do.");
})();