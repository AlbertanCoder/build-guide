// Settings endpoint checks: the key is stored, never returned, the budget is
// clamped server-side, and a hostile page cannot change either.
//
//   node scripts/dev/check-settings.js
//
// Uses a temp settings file (SETTINGS_FILE) so a test run can never overwrite a
// real saved key.
"use strict";

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..", "..");
const MOCK_PORT = 8797;
const APP_PORT = 8798;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-settings-"));
const SETTINGS_FILE = path.join(TMP, "settings.json");

const KEY = "sk-test-1234567890abcd7f3a";

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
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(url); if (r.ok) return true; } catch (e) {}
    await new Promise((r) => setTimeout(r, 125));
  }
  return false;
}

const appEnv = (extra) => Object.assign({
  PROVIDER: "openai",
  BASE_URL: "http://127.0.0.1:" + MOCK_PORT + "/v1",
  MODEL: "mock-model",
  API_KEY: "",
  PORT: String(APP_PORT),
  GA_TEST: "1",
  SETTINGS_FILE: SETTINGS_FILE
}, extra || {});

async function getSettings() {
  const r = await fetch("http://127.0.0.1:" + APP_PORT + "/api/settings");
  return { status: r.status, body: await r.text() };
}
async function postSettings(payload, headers) {
  const r = await fetch("http://127.0.0.1:" + APP_PORT + "/api/settings", {
    method: "POST",
    headers: Object.assign({ "content-type": "application/json" }, headers || {}),
    body: typeof payload === "string" ? payload : JSON.stringify(payload)
  });
  return { status: r.status, body: await r.text() };
}

(async () => {
  try {
    start("scripts/dev/mock-llm.js", [String(MOCK_PORT)]);
    start("server/assistant-server.js", [], appEnv());
    check("mock provider started", await waitFor("http://127.0.0.1:" + MOCK_PORT + "/v1/models"));
    check("server started", await waitFor("http://127.0.0.1:" + APP_PORT + "/api/health"));

    const first = await getSettings();
    const s1 = JSON.parse(first.body);
    check("settings readable", first.status === 200 && s1.ok === true);
    check("no key configured yet", s1.keyConfigured === false);
    check("budget bounds exposed", s1.budgetMin === 0.1 && s1.budgetMax === 2,
      s1.budgetMin + "-" + s1.budgetMax);

    /* ---- the key is stored, and never handed back ------------------------ */
    const saved = await postSettings({ apiKey: KEY });
    const s2 = JSON.parse(saved.body);
    check("key saved", saved.status === 200 && s2.keyConfigured === true);
    check("only the last four characters are shown", s2.keyHint === "\u20267f3a", s2.keyHint);
    check("the response never contains the key", saved.body.indexOf(KEY) === -1);

    const reread = await getSettings();
    check("reading settings never contains the key", reread.body.indexOf(KEY) === -1);
    check("the key really was written to disk",
      fs.existsSync(SETTINGS_FILE) && fs.readFileSync(SETTINGS_FILE, "utf8").indexOf(KEY) !== -1);

    /* ---- the budget is clamped by the server, not the slider ------------ */
    const mid = JSON.parse((await postSettings({ dailyUsdMax: 0.5 })).body);
    check("a budget inside the range is kept", mid.dailyUsdMax === 0.5, "$" + mid.dailyUsdMax);
    const high = JSON.parse((await postSettings({ dailyUsdMax: 99 })).body);
    check("an absurdly high budget is clamped to $2", high.dailyUsdMax === 2, "$" + high.dailyUsdMax);
    const low = JSON.parse((await postSettings({ dailyUsdMax: 0.01 })).body);
    check("a near-zero budget is raised to $0.10", low.dailyUsdMax === 0.1, "$" + low.dailyUsdMax);
    const nan = await postSettings({ dailyUsdMax: "lots" });
    check("a non-numeric budget is rejected", nan.status === 400, "status=" + nan.status);

    /* ---- a research job must never eat the whole day -------------------- */
    const tiny = JSON.parse((await postSettings({ dailyUsdMax: 0.1 })).body);
    check("job sub-budget shrinks with a small cap",
      tiny.jobBudgetUsd <= 0.05 && tiny.jobBudgetUsd > 0, "$" + tiny.jobBudgetUsd);

    /* ---- hostile / malformed requests ----------------------------------- */
    const wrongType = await postSettings("apiKey=x", { "content-type": "text/plain" });
    check("a non-JSON content type is refused", wrongType.status === 415, "status=" + wrongType.status);
    const crossOrigin = await postSettings({ dailyUsdMax: 1 }, { origin: "https://evil.example" });
    check("a cross-origin change is refused", crossOrigin.status === 403, "status=" + crossOrigin.status);
    const shortKey = await postSettings({ apiKey: "abc" });
    check("an implausibly short key is refused", shortKey.status === 400, "status=" + shortKey.status);

    /* ---- it survives a restart ------------------------------------------ */
    stopAll();
    procs.length = 0;
    await new Promise((r) => setTimeout(r, 400));
    /* Restart the mock too: stopAll() killed it, and the verify check below
       needs a provider to talk to. The earlier run of this test failed here for
       exactly that reason. */
    start("scripts/dev/mock-llm.js", [String(MOCK_PORT)]);
    start("server/assistant-server.js", [], appEnv());
    check("mock provider restarted", await waitFor("http://127.0.0.1:" + MOCK_PORT + "/v1/models"));
    check("server restarted", await waitFor("http://127.0.0.1:" + APP_PORT + "/api/health"));
    const after = JSON.parse((await getSettings()).body);
    check("the budget survived a restart", after.dailyUsdMax === 0.1, "$" + after.dailyUsdMax);
    check("the key survived a restart", after.keyConfigured === true && after.keyHint === "\u20267f3a");

    /* ---- verifying the key against the provider ------------------------- */
    const verify = await (await fetch("http://127.0.0.1:" + APP_PORT + "/api/settings/verify",
      { method: "POST" })).json();
    check("key verification reports a verdict", verify.ok === true && verify.verified === true, verify.detail);
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    stopAll();
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("Settings verified.");
})();

