// Item C: build position round-trips through conversation memory and restores in
// a real browser. All state and browser profiles live in a temporary directory.
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-build-sync-"));
const PORT = 8802;
const BASE = "http://127.0.0.1:" + PORT;
const CONVERSATIONS = path.join(TMP, "conversations");
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
async function waitFor(url) {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(url); if (r.ok) return true; } catch (e) { /* not up */ }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  return false;
}
async function send(method, id, body) {
  const r = await fetch(BASE + "/api/conversations" + (id ? "/" + id : ""), {
    method: method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: r.status, json: await r.json() };
}
function thread(build) {
  return {
    title: "build position",
    messages: [{ role: "user", text: "where did I stop?" }],
    history: [], lastId: "message-1", build: build
  };
}

(async () => {
  let server = null;
  let chrome = null;
  try {
    server = spawn(process.execPath, ["server/assistant-server.js"], {
      cwd: ROOT, windowsHide: true, stdio: "ignore",
      env: Object.assign({}, process.env, {
        PORT: String(PORT), CONVERSATIONS_DIR: CONVERSATIONS,
        SETTINGS_FILE: path.join(TMP, "settings.json"),
        BASE_URL: "http://127.0.0.1:1/v1", GA_TEST: "1", CACHE_OFF: "1"
      })
    });
    check("the build-sync test server starts", await waitFor(BASE + "/api/health"));

    let r = await send("PUT", "build-sync-api", thread({ tab: "steps", step: 4 }));
    check("PUT accepts a build position", r.status === 200 && r.json.ok === true);
    const disk = JSON.parse(fs.readFileSync(path.join(CONVERSATIONS, "build-sync-api.json"), "utf8"));
    check("the thread on disk preserves tab and step",
      disk.build && disk.build.tab === "steps" && disk.build.step === 4);
    r = await send("GET", "build-sync-api");
    check("GET round-trips the build position",
      r.status === 200 && r.json.thread.build.tab === "steps" && r.json.thread.build.step === 4);
    check("adding build state preserves the conversation payload",
      r.json.thread.title === "build position" && r.json.thread.messages.length === 1 &&
      r.json.thread.lastId === "message-1");

    r = await send("PUT", "build-sync-legacy", {
      title: "legacy", messages: [], history: [], lastId: ""
    });
    check("a legacy thread without build state still saves", r.status === 200);
    r = await send("GET", "build-sync-legacy");
    check("a legacy thread loads with no forced navigation",
      r.status === 200 && r.json.thread.build === null);

    await send("PUT", "build-sync-invalid", thread({ tab: "not-a-tab", step: 99 }));
    r = await send("GET", "build-sync-invalid");
    check("an unknown tab is normalized", r.json.thread.build.tab === "why");
    check("an out-of-range step is discarded", r.json.thread.build.step === null);
    await send("PUT", "build-sync-parts", thread({ tab: "parts", step: 7 }));
    r = await send("GET", "build-sync-parts");
    check("a non-assembly tab cannot carry a step",
      r.json.thread.build.tab === "parts" && r.json.thread.build.step === null);

    check("a real browser is available for build-sync coverage", !!CHROME);
    if (!CHROME) { throw new Error("Chrome or Edge is required"); }
    chrome = spawn(CHROME, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
      "--user-data-dir=" + path.join(TMP, "profile"),
      BASE + "/index.html?ga-build-sync-test"
    ], { stdio: "ignore" });

    let lines = null;
    for (let i = 0; i < 160; i += 1) {
      try {
        const probe = await (await fetch(BASE + "/api/probe")).json();
        if (probe && probe.probe && Array.isArray(probe.probe.buildSync)) {
          lines = probe.probe.buildSync;
          break;
        }
      } catch (e) { /* page not ready */ }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    check("the browser reported its build-sync results", Array.isArray(lines),
      lines ? lines.length + " browser checks" : "no report arrived");
    (lines || []).forEach(function (line) {
      if (line.indexOf("PASS ") !== 0) bad += 1;
      console.log(line);
    });

    /* loadThread persists the restored position again; wait for that write, then
       verify it independently rather than trusting only the page's report. */
    await new Promise((resolve) => setTimeout(resolve, 500));
    r = await send("GET", "build-sync-api"); /* API fixture remains independent. */
    const browserThreads = await send("GET", "");
    const browserThread = (browserThreads.json.threads || [])[0];
    check("the browser thread remains listed after restoration",
      browserThreads.status === 200 && !!browserThread && browserThread.count >= 1,
      browserThread ? browserThread.id : "missing");
    const restored = browserThread ? await send("GET", browserThread.id) : null;
    check("the server independently holds the restored browser position",
      !!restored && restored.json.thread.build.tab === "steps" && restored.json.thread.build.step === 4,
      restored ? JSON.stringify(restored.json.thread.build) : "missing");
    check("the API fixture was not changed by the browser",
      r.json.thread.build.tab === "steps" && r.json.thread.build.step === 4);
  } catch (err) {
    check("the build-sync suite ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    if (chrome) { try { chrome.kill(); } catch (e) { /* already gone */ } }
    if (server) { try { server.kill(); } catch (e) { /* already gone */ } }
    await new Promise((resolve) => setTimeout(resolve, 250));
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("Build sync round-trips through the server and restores in the browser.");
})();
