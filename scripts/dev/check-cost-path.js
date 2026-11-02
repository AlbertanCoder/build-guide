// End-to-end proof of the cost path, with no API key and no network.
//
//   node scripts/dev/check-cost-path.js
//
// Starts the mock provider and the real server as child processes, then asserts
// what the cost engine promises:
//
//   1. a repeat question makes ZERO upstream calls   (cache)
//   2. the passages actually sent are smaller        (compression)
//   3. /api/stats accounts for the spend in dollars  (telemetry)
//   4. the daily cap degenerates instead of spending (budget guard)
//   5. a refusal on the cheap tier escalates once    (router)
//
// "Zero upstream calls" is measured at the provider, not inferred from the
// server's own logs, so a cache that secretly still called would fail here.
"use strict";

const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const MOCK_PORT = 8793;
const APP_PORT = 8794;
const CAP_PORT = 8795;
const ESC_PORT = 8796;

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

const procs = [];
function start(script, args, env) {
  const p = spawn(process.execPath, [path.join(ROOT, script)].concat(args || []), {
    cwd: ROOT,
    env: Object.assign({}, process.env,
      { SETTINGS_FILE: path.join(require("os").tmpdir(), "ga-cost-path-settings-" + process.pid + ".json") },
      env || {}),
    stdio: "ignore"
  });
  procs.push(p);
  return p;
}
function stopAll() {
  for (const p of procs) {
    try { p.kill(); } catch (e) { /* already gone */ }
  }
}

async function waitFor(url, tries) {
  for (let i = 0; i < (tries || 80); i += 1) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch (e) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 125));
  }
  return false;
}

/* One long, realistic passage, reused so compression has something to cut. */
const BODY =
  "The thermal camera is a Pimoroni MLX90640 breakout wired to 3.3V I2C at address 0x33. " +
  "It reports 768 temperatures per frame. If the image looks noisy or speckled at 8 Hz, the " +
  "I2C link is being asked for more frames than it can carry. Set REFRESH_2_HZ in the payload " +
  "configuration and restart the service. Do not raise the I2C clock to fix this. Also remember " +
  "that the sensor is 3.3V only, that the lens must face down, and no board may touch carbon. ";

const PASSAGES = [
  { label: "Step 6 - thermal + GPS", tab: "steps", step: 6, text: BODY + BODY },
  { label: "Thermal + GPS", tab: "steps", step: 6, text: BODY + BODY },
  { label: "Parts & budget", tab: "parts", text: "Every row links to a live retailer listing plus a backup. " + BODY }
];

const RAW_CHARS = PASSAGES.reduce((n, p) => n + p.text.length, 0);

async function ask(port, question, passages, extra) {
  const res = await fetch("http://127.0.0.1:" + port + "/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(Object.assign({
      question: question,
      passages: passages,
      history: [{ role: "user", content: question }]
    }, extra || {}))
  });
  const raw = await res.text();
  const meta = {};
  let text = "";
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    let evt;
    try { evt = JSON.parse(t.slice(5).trim()); } catch (e) { continue; }
    if (evt.type === "delta") text += evt.text;
    if (evt.type === "replace") text = evt.text;
    if (evt.type === "meta") Object.assign(meta, evt);
    if (evt.type === "error") meta.error = evt.error;
  }
  return { status: res.status, meta: meta, text: text };
}

async function mockStats() {
  const r = await fetch("http://127.0.0.1:" + MOCK_PORT + "/__stats");
  return r.json();
}

(async () => {
  try {
    start("scripts/dev/mock-llm.js", [String(MOCK_PORT)]);
    start("server/assistant-server.js", [], {
      PROVIDER: "openai",
      BASE_URL: "http://127.0.0.1:" + MOCK_PORT + "/v1",
      MODEL: "mock-model",
      API_KEY: "test-key-not-real",
      PORT: String(APP_PORT),
      GA_TEST: "1"
    });

    const mockUp = await waitFor("http://127.0.0.1:" + MOCK_PORT + "/v1/models");
    const appUp = await waitFor("http://127.0.0.1:" + APP_PORT + "/api/health");
    check("mock provider started", mockUp);
    check("assistant server started", appUp);
    if (!mockUp || !appUp) { throw new Error("processes did not start"); }

    const health = await (await fetch("http://127.0.0.1:" + APP_PORT + "/api/health")).json();
    check("health reports both tiers", !!health.cheapModel && !!health.strongModel,
      health.cheapModel + " / " + health.strongModel);
    check("an explicit MODEL does not invent a second tier", health.canEscalate === false);

    /* ---- 1. a real question costs real tokens --------------------------- */
    const first = await ask(APP_PORT, "the thermal image is noisy at 8 hz", PASSAGES);
    check("first question answered", first.status === 200 && first.text.length > 100,
      "status=" + first.status + " chars=" + first.text.length);
    check("first answer is not from cache", first.meta.cached === false);
    check("first answer reports a cost", Number(first.meta.cost) > 0, "$" + first.meta.cost);

    const afterFirst = await mockStats();
    check("the provider was called exactly once", afterFirst.calls === 1, "calls=" + afterFirst.calls);

    /* ---- 2. what was sent is smaller than what we handed over ----------- */
    check("compression shrank the passages",
      afterFirst.last.userChars < RAW_CHARS,
      RAW_CHARS + " -> " + afterFirst.last.userChars + " chars");
    check("duplicate passages were dropped",
      afterFirst.last.passageCount <= 2,
      "passages sent=" + afterFirst.last.passageCount + " of 3");
    check("usage was requested from the provider", !!afterFirst.last.streamOptions);

    /* ---- 3. the same question again is free ----------------------------- */
    const second = await ask(APP_PORT, "The thermal image is noisy at 8 Hz.", PASSAGES);
    check("repeat question answered", second.status === 200);
    check("repeat answer came from the cache", second.meta.cached === true);
    check("repeat answer cost nothing", Number(second.meta.cost) === 0, "$" + second.meta.cost);
    const afterSecond = await mockStats();
    check("the repeat made no upstream call", afterSecond.calls === 1, "calls=" + afterSecond.calls);
    check("the repeat returned the same answer",
      second.text.slice(0, 60) === first.text.slice(0, 60));

    /* ---- 4. the meter can prove it -------------------------------------- */
    const stats = await (await fetch("http://127.0.0.1:" + APP_PORT + "/api/stats")).json();
    check("stats count one paid call", stats.cost.totals.calls === 1, "calls=" + stats.cost.totals.calls);
    check("stats count one cache hit", stats.cost.counters.cacheHits === 1);
    check("stats record input tokens", stats.cost.totals.inputTokens > 0, stats.cost.totals.inputTokens);
    check("stats record dollars", stats.cost.totals.usd > 0, "$" + stats.cost.totals.usd);
    check("stats count the cache hit rate", stats.cache.hitRate > 0, "hitRate=" + stats.cache.hitRate);

    /* ---- 5. the budget cap degrades instead of spending ----------------- */
    start("server/assistant-server.js", [], {
      PROVIDER: "openai",
      BASE_URL: "http://127.0.0.1:" + MOCK_PORT + "/v1",
      MODEL: "mock-model",
      API_KEY: "test-key-not-real",
      PORT: String(CAP_PORT),
      GA_TEST: "1",
      DAILY_USD_MAX: "0.0001" /* less than a single question costs */
    });
    check("cap server started", await waitFor("http://127.0.0.1:" + CAP_PORT + "/api/health"));

    const beforeCap = await mockStats();
    const capFirst = await ask(CAP_PORT, "why is the receiver not binding", PASSAGES);
    check("under the cap a question still works", capFirst.status === 200, "status=" + capFirst.status);
    const capSecond = await ask(CAP_PORT, "how wide is the frame at 30 m", PASSAGES);
    check("over the cap the server refuses to spend", capSecond.status === 402, "status=" + capSecond.status);
    const afterCap = await mockStats();
    check("the refused request made no upstream call",
      afterCap.calls === beforeCap.calls + 1,
      "calls " + beforeCap.calls + " -> " + afterCap.calls);

    /* ---- 6. the cheap tier refusing escalates once ---------------------- */
    start("server/assistant-server.js", [], {
      PROVIDER: "openai",
      BASE_URL: "http://127.0.0.1:" + MOCK_PORT + "/v1",
      MODEL: "mock-model",
      STRONG_MODEL: "mock-strong",
      API_KEY: "test-key-not-real",
      PORT: String(ESC_PORT),
      GA_TEST: "1"
    });
    check("escalation server started", await waitFor("http://127.0.0.1:" + ESC_PORT + "/api/health"));
    const escHealth = await (await fetch("http://127.0.0.1:" + ESC_PORT + "/api/health")).json();
    check("two different tiers enable escalation", escHealth.canEscalate === true);

    const beforeEsc = await mockStats();
    const escalated = await ask(ESC_PORT, "please refuse this question about the frame", PASSAGES);
    const afterEsc = await mockStats();
    check("a refusal triggers exactly one escalation",
      afterEsc.calls === beforeEsc.calls + 2,
      "calls " + beforeEsc.calls + " -> " + afterEsc.calls);
    check("the escalated answer came from the strong tier",
      escalated.meta.model === "mock-strong", escalated.meta.model);
    check("the escalated answer is not a refusal",
      !/that is not in this guide/i.test(escalated.text), escalated.text.slice(0, 45));
  } catch (err) {
    check("the test ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    stopAll();
  }

  console.log("");
  if (bad) {
    console.log(bad + " check(s) failed.");
    process.exit(1);
  }
  console.log("Cost path verified end to end.");
})();

