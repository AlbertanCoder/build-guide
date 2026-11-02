// Decision 14's three write gates, proven against a running server:
// loopback bind (the default), --allow-write, and the GA_WRITE_TOKEN header.
//
//   node scripts/dev/check-write-gates.js
//
// Each gate alone must be enough to stop an accident: a reachable server with
// no flag is read-only, a flag with no token refuses everything, and the wrong
// token never gets through. Loopback keeps working with none of it.
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-write-"));

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

function start(port, extra) {
  return spawn(process.execPath, ["server/assistant-server.js"], {
    cwd: ROOT, windowsHide: true,
    env: Object.assign({}, process.env, {
      PORT: String(port),
      SETTINGS_FILE: path.join(TMP, "settings-" + port + ".json"),
      CONVERSATIONS_DIR: path.join(TMP, "conversations-" + port),
      BASE_URL: "http://127.0.0.1:1/v1"
    }, extra || {})
  });
}
async function waitFor(url, tries) {
  for (let i = 0; i < (tries || 40); i += 1) {
    try { const r = await fetch(url); if (r.ok) { return true; } } catch (e) { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}
async function post(port, urlPath, body, headers) {
  const r = await fetch("http://127.0.0.1:" + port + urlPath, {
    method: "POST",
    headers: Object.assign({ "content-type": "application/json" }, headers || {}),
    body: JSON.stringify(body)
  });
  let j = null;
  try { j = await r.json(); } catch (e) { /* non-json */ }
  return { status: r.status, json: j };
}

const TOKEN = "test-write-token-" + Date.now().toString(36);

(async () => {
  const servers = [];
  try {
    /* --- a reachable server with no --allow-write is read-only ------------ */
    const ro = start(8781, { BIND: "0.0.0.0" });
    servers.push(ro);
    check("a reachable server starts (read-only)", await waitFor("http://127.0.0.1:8781/api/health"));

    let r = await post(8781, "/api/settings", { dailyUsdMax: 1 });
    check("gate 2: no --allow-write refuses a settings write",
      r.status === 403 && /write is disabled/.test((r.json && r.json.error) || ""),
      (r.json && r.json.error) || String(r.status));
    r = await post(8781, "/api/propose", { sentence: "delete all the rules questions" });
    check("gate 2: no --allow-write refuses a document write",
      r.status === 403 && /write is disabled/.test((r.json && r.json.error) || ""),
      (r.json && r.json.error) || String(r.status));

    /* --- the flag without a token refuses everything ---------------------- */
    const noTok = start(8782, { BIND: "0.0.0.0", ALLOW_WRITE: "1" });
    servers.push(noTok);
    check("a reachable server starts (--allow-write, no token)", await waitFor("http://127.0.0.1:8782/api/health"));
    r = await post(8782, "/api/propose", { sentence: "delete all the rules questions" });
    check("gate 3: --allow-write without GA_WRITE_TOKEN refuses writes",
      r.status === 403 && /no write token configured/.test((r.json && r.json.error) || ""),
      (r.json && r.json.error) || String(r.status));

    /* --- the token gates: missing, wrong, right --------------------------- */
    const gated = start(8783, { BIND: "0.0.0.0", ALLOW_WRITE: "1", GA_WRITE_TOKEN: TOKEN });
    servers.push(gated);
    check("a reachable server starts (flag + token)", await waitFor("http://127.0.0.1:8783/api/health"));

    r = await post(8783, "/api/propose", { sentence: "delete all the rules questions" });
    check("a missing token is refused",
      r.status === 401 && /token missing or wrong/.test((r.json && r.json.error) || ""),
      (r.json && r.json.error) || String(r.status));
    r = await post(8783, "/api/propose", { sentence: "delete all the rules questions" },
      { "x-write-token": "wrong-token" });
    check("a wrong token is refused",
      r.status === 401 && /token missing or wrong/.test((r.json && r.json.error) || ""),
      (r.json && r.json.error) || String(r.status));

    r = await post(8783, "/api/propose", { sentence: "delete all the rules questions" },
      { "x-write-token": TOKEN });
    check("the right token passes the gate (the job rules take over)",
      r.status !== 401 && r.status !== 403 && /destructive|delete|refus/i.test((r.json && r.json.error) || ""),
      (r.json && r.json.error) || String(r.status));
    r = await post(8783, "/api/settings", { dailyUsdMax: 1 }, { "x-write-token": TOKEN });
    check("the right token can save settings",
      r.status === 200 && r.json && r.json.ok !== false, "status " + r.status);

    const s = await (await fetch("http://127.0.0.1:8783/api/settings")).json();
    check("the token is never echoed back by the server",
      JSON.stringify(s).indexOf(TOKEN) === -1);

    /* --- loopback keeps working with none of it (regression) -------------- */
    const local = start(8784, {});
    servers.push(local);
    check("a loopback server starts", await waitFor("http://127.0.0.1:8784/api/health"));
    r = await post(8784, "/api/settings", { dailyUsdMax: 1 });
    check("gate 1: loopback writes still work with no flag and no token",
      r.status === 200, "status " + r.status);
  } catch (err) {
    check("the write-gate tests ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    servers.forEach(function (s) { try { s.kill(); } catch (e) { /* already gone */ } });
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("the three write gates are real: each one alone stops a write.");
})();