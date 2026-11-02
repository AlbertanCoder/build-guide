// Real-browser test of the settings drawer: types a key, clicks Save, moves the
// slider, and asserts the server saw it — plus the page-level smoke test (every
// tab renders, no uncaught errors) that any JS edit has to pass.
//
//   node scripts/dev/check-browser.js
//
// Drives headless Chrome against the real server. Results come back through
// /api/probe rather than --dump-dom, because an async probe and virtual time do
// not mix reliably.
"use strict";

const { spawn, spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..", "..");
const MOCK_PORT = 8799;
const APP_PORT = 8800;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-browser-"));
const SETTINGS_FILE = path.join(TMP, "settings.json");

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].find((p) => fs.existsSync(p));

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

const procs = [];
function start(script, args, env) {
  const p = spawn(process.execPath, [path.join(ROOT, script)].concat(args || []), {
    cwd: ROOT, env: Object.assign({}, process.env, env || {}), stdio: "ignore"
  });
  procs.push(p);
  return p;
}
function stopAll() { for (const p of procs) { try { p.kill(); } catch (e) {} } }

async function waitFor(url) {
  for (let i = 0; i < 100; i += 1) {
    try { const r = await fetch(url); if (r.ok) return true; } catch (e) {}
    await new Promise((r) => setTimeout(r, 125));
  }
  return false;
}

(async () => {
  if (!CHROME) {
    console.log("FAIL no Chrome or Edge found for the browser test");
    process.exit(1);
  }
  try {
    start("scripts/dev/mock-llm.js", [String(MOCK_PORT)]);
    start("server/assistant-server.js", [], {
      PROVIDER: "openai",
      BASE_URL: "http://127.0.0.1:" + MOCK_PORT + "/v1",
      MODEL: "mock-model",
      API_KEY: "",
      PORT: String(APP_PORT),
      GA_TEST: "1",
      SETTINGS_FILE: SETTINGS_FILE,
      CONVERSATIONS_DIR: path.join(TMP, "conversations")
    });
    check("mock provider started", await waitFor("http://127.0.0.1:" + MOCK_PORT + "/v1/models"));
    check("assistant server started", await waitFor("http://127.0.0.1:" + APP_PORT + "/api/health"));

    const url = "http://127.0.0.1:" + APP_PORT + "/index.html?ga-drawer-test";
    const chrome = spawn(CHROME, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
      "--user-data-dir=" + path.join(TMP, "profile"), url
    ], { stdio: "ignore" });
    procs.push(chrome);

    /* Poll the test channel until the page reports. */
    let lines = null;
    for (let i = 0; i < 160; i += 1) {
      try {
        const r = await fetch("http://127.0.0.1:" + APP_PORT + "/api/probe");
        const j = await r.json();
        if (j && j.probe && Array.isArray(j.probe.drawer)) { lines = j.probe.drawer; break; }
      } catch (e) { /* not yet */ }
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!lines) {
      check("the page reported its drawer results", false, "no report arrived in 24s");
    } else {
      check("the page reported its drawer results", true, lines.length + " checks");
      lines.forEach((line) => {
        const ok = line.indexOf("PASS ") === 0;
        if (!ok) { bad += 1; }
        console.log(line);
      });
    }

    /* Independently verify the server state, so a lying page cannot pass. */
    const srv = await (await fetch("http://127.0.0.1:" + APP_PORT + "/api/settings")).json();
    check("the server really stored the key", srv.keyConfigured === true);
    check("the server shows only the last four characters", srv.keyHint === "\u2026wxyz", srv.keyHint);
    check("the server really stored the slider value", Number(srv.dailyUsdMax) === 0.55, "$" + srv.dailyUsdMax);
    check("the key is not present in the server response",
      JSON.stringify(srv).indexOf("sk-drawer-probe") === -1);

    /* ---- phase 2: the quiz probe, in its own browser profile ---------------- */
    try { chrome.kill(); } catch (e) { /* already gone */ }
    await new Promise((r) => setTimeout(r, 500));
    const chrome2 = spawn(CHROME, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
      "--user-data-dir=" + path.join(TMP, "profile2"),
      "http://127.0.0.1:" + APP_PORT + "/index.html?ga-quiz-test"
    ], { stdio: "ignore" });
    procs.push(chrome2);

    let quizLines = null;
    for (let i = 0; i < 160; i += 1) {
      try {
        const r = await fetch("http://127.0.0.1:" + APP_PORT + "/api/probe");
        const j = await r.json();
        if (j && j.probe && Array.isArray(j.probe.quiz)) { quizLines = j.probe.quiz; break; }
      } catch (e) { /* not yet */ }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!quizLines) {
      check("the page reported its quiz results", false, "no report arrived in 24s");
    } else {
      check("the page reported its quiz results", true, quizLines.length + " checks");
      quizLines.forEach((line) => {
        if (line.indexOf("PASS ") !== 0) { bad += 1; }
        console.log(line);
      });
    }
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    stopAll();
    await new Promise((r) => setTimeout(r, 300));
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("Browser drawer verified.");
})();
