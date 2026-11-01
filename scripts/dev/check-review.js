// Tests the read-only review surface: the proposal list, the diff endpoint, the
// rendered preview, and the refusals that keep "review" from ever becoming a
// write path. Runs against a throwaway clone with one fixture proposal in it.
//
//   node scripts/dev/check-review.js
//
// The server code under test is the WORKING TREE code, copied into the clone
// (the same policy check-propose.js follows), so a fix and its tests are
// validated in one run.
"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-review-"));
const CLONE = path.join(TMP, "clone");
const PORT = 8796;
const BASE = "http://127.0.0.1:" + PORT;

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
const gitOut = (args) => run("git", args, CLONE).out;

async function waitFor(url, tries) {
  for (let i = 0; i < (tries || 40); i += 1) {
    try { const r = await fetch(url); if (r.ok) { return true; } } catch (e) { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

const NONCE = "review" + Date.now().toString(36);
const MARKER = "<!-- fixture " + NONCE + " -->";
const FIXTURE = "proposal/review-fixture-" + NONCE;

(async () => {
  let server = null;
  try {
    let r = run("git", ["clone", "--quiet", "--branch", "main", ROOT, CLONE], TMP);
    check("cloned main of the repo to a temp dir", r.status === 0,
      r.status === 0 ? "ok" : r.out.slice(0, 150));
    if (r.status !== 0) { throw new Error("clone failed"); }

    /* ---- one fixture proposal: a branch with a marker in index.html ------- */
    const indexPath = path.join(CLONE, "index.html");
    const mainHtml = fs.readFileSync(indexPath, "utf8");
    run("git", ["checkout", "-b", FIXTURE], CLONE);
    fs.writeFileSync(indexPath, mainHtml.replace("</head>", MARKER + "\n</head>"), "utf8");
    run("git", ["add", "index.html"], CLONE);
    run("git", ["commit", "--quiet", "-m", "Fixture: one marker for the review tests"], CLONE);
    run("git", ["checkout", "main"], CLONE);
    check("a fixture proposal exists in the clone",
      gitOut(["branch", "--list", "proposal/*"]).indexOf(FIXTURE) !== -1, FIXTURE);

    /* ---- the code under test is the working tree's ------------------------ */
    const serverDir = path.join(ROOT, "server");
    fs.mkdirSync(path.join(CLONE, "server", "ops"), { recursive: true });
    fs.readdirSync(serverDir).filter((f) => f.endsWith(".js")).forEach(function (f) {
      fs.copyFileSync(path.join(serverDir, f), path.join(CLONE, "server", f));
    });
    fs.readdirSync(path.join(serverDir, "ops")).forEach(function (f) {
      fs.copyFileSync(path.join(serverDir, "ops", f), path.join(CLONE, "server", "ops", f));
    });
    fs.mkdirSync(path.join(CLONE, "docs", "js"), { recursive: true });
    fs.mkdirSync(path.join(CLONE, "docs", "assistant"), { recursive: true });
    fs.copyFileSync(path.join(ROOT, "docs", "js", "review.js"), path.join(CLONE, "docs", "js", "review.js"));
    fs.copyFileSync(path.join(ROOT, "docs", "assistant", "review.html"), path.join(CLONE, "docs", "assistant", "review.html"));
    run("git", ["add", "-A"], CLONE);
    run("git", ["commit", "--quiet", "-m", "code under test (working tree, placed by check-review)"], CLONE);

    /* ---- start the server from the clone ---------------------------------- */
    server = spawn(process.execPath, [path.join(CLONE, "server", "assistant-server.js")], {
      cwd: CLONE, windowsHide: true,
      env: Object.assign({}, process.env, { PORT: String(PORT), GA_TEST: "" })
    });
    const up = await waitFor(BASE + "/api/health");
    check("the review server starts", up, up ? BASE : "never became healthy");

    const enc = encodeURIComponent(FIXTURE);

    /* ---- the list --------------------------------------------------------- */
    const list = await (await fetch(BASE + "/api/proposals")).json();
    check("the proposal list contains the fixture",
      list.ok === true && list.proposals.indexOf(FIXTURE) !== -1,
      (list.proposals || []).join(", "));
    const detail = (list.details || []).filter((d) => d.name === FIXTURE)[0] || {};
    check("the list details carry the proposal's subject and sha",
      /Fixture: one marker/.test(detail.subject || "") && /^[0-9a-f]{8}$/.test(detail.sha || ""),
      (detail.sha || "") + " " + (detail.subject || ""));

    /* ---- the diff --------------------------------------------------------- */
    const diffRes = await fetch(BASE + "/api/proposals/" + enc + "/diff");
    const diff = await diffRes.json();
    check("the diff endpoint returns the proposal's diff",
      diffRes.status === 200 && diff.ok === true && diff.diff.indexOf(NONCE) !== -1,
      (diff.diff || "").split(/\r?\n/).length + " lines");
    check("the diff includes a stat summary",
      typeof diff.stat === "string" && /index\.html/.test(diff.stat), diff.stat);

    /* ---- the rendered preview --------------------------------------------- */
    const previewRes = await fetch(BASE + "/proposals/" + enc + "/preview");
    const previewHtml = await previewRes.text();
    check("the preview serves the proposal's index.html with the marker",
      previewRes.status === 200 && previewHtml.indexOf(MARKER) !== -1,
      previewHtml.length + " bytes");
    const mainRes = await fetch(BASE + "/index.html");
    const mainServed = await mainRes.text();
    check("the served main page does not carry the marker",
      mainServed.indexOf(MARKER) === -1);

    /* ---- refusals: review can never reach anything else -------------------- */
    const nope = await fetch(BASE + "/api/proposals/" + encodeURIComponent("proposal/nope-1") + "/diff");
    check("an unknown proposal name is refused", nope.status === 404);
    const notProposal = await fetch(BASE + "/api/proposals/" + encodeURIComponent("main") + "/diff");
    check('the name "main" is refused', notProposal.status === 404);
    const traversal = await fetch(BASE + "/api/proposals/" + encodeURIComponent("proposal/../main") + "/diff");
    check("a traversal name is refused", traversal.status === 404);
    const traversal2 = await fetch(BASE + "/proposals/" + encodeURIComponent("proposal/x:index.html") + "/preview");
    check("a ref-injection name is refused", traversal2.status === 404);
    const post = await fetch(BASE + "/api/proposals/" + enc + "/diff", { method: "POST", body: "x" });
    check("the diff route refuses POST (review has no write path)", post.status === 405);
    const postPreview = await fetch(BASE + "/proposals/" + enc + "/preview", { method: "DELETE" });
    check("the preview route refuses DELETE", postPreview.status === 405);

    /* ---- the page --------------------------------------------------------- */
    const page = await (await fetch(BASE + "/review")).text();
    check("the review page is served",
      /review-diff/.test(page) && /review-preview/.test(page) && /review-list/.test(page));
    check("the review page states it is read-only and names the CLI commands",
      /Read-only/.test(page) && /accept\.js/.test(page) && /reject\.js/.test(page));

    /* ---- the diff classifier the page renders with -------------------------- */
    const reviewJs = require(path.join(ROOT, "docs", "js", "review.js"));
    const sample = "diff --git a/index.html b/index.html\n--- a/index.html\n+++ b/index.html\n" +
      "@@ -1,2 +1,2 @@\n keep\n-old line\n+new line";
    const cls = reviewJs.diffLines(sample);
    const kinds = cls.map((l) => l.type);
    check("diffLines classifies meta, hunk, context, deletions and additions",
      kinds.filter((t) => t === "meta").length === 3 &&
      kinds.filter((t) => t === "hunk").length === 1 &&
      kinds.filter((t) => t === "ctx").length === 1 &&
      kinds.filter((t) => t === "del").length === 1 &&
      kinds.filter((t) => t === "add").length === 1,
      kinds.join(","));
    check("diffLines handles an empty diff", reviewJs.diffLines("").length === 0);

    /* ---- read-only proof: nothing above moved a branch ---------------------- */
    check("the branch list is unchanged after all the review traffic",
      gitOut(["branch", "--list", "proposal/*"]).indexOf(FIXTURE) !== -1 &&
      gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim() === "main",
      gitOut(["branch", "--list", "proposal/*"]).trim());
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    if (server) { try { server.kill(); } catch (e) { /* already gone */ } }
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("review surface verified: read-only, and it refuses everything else.");
})();