// The gate: one command that answers "is the whole thing green?".
//
//   node scripts/dev/gate.js            # everything
//   node scripts/dev/gate.js --quick    # skip the browser suite (needs Chrome)
//   node scripts/dev/gate.js --json     # machine-readable, for the future agent
//
// Why this exists: 150 named checks across ten commands is a lot of judgement to
// apply by hand, and "I read the ten outputs and they looked fine" is not a gate.
// Decision R24 says the agent may never modify its own checks — a rule that only
// means something once the checks are one protected, invocable object.
//
// Two deliberate strictnesses:
//   1. A suite that CANNOT run is a FAIL, not a skip. A missing Chrome must not
//      quietly disable the only sensor that catches a broken page.
//   2. Each suite declares its expected number of checks. If that number drops,
//      the gate fails even when everything present passes — so deleting a check
//      can never be how you get a green run.
"use strict";

const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");

const ROOT = path.resolve(__dirname, "..", "..");
const PS = (script, args) => ["powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass",
  "-File", script].concat(args || [])];

/* expect = the number of "PASS " lines this suite must produce. */
const SUITES = [
  {
    name: "encoding",
    cmd: ["node", ["scripts/dev/check-encoding.js"]],
    expect: 3
  },
  {
    name: "price guard",
    cmd: ["node", ["scripts/dev/check-kb-prices.js"]],
    expect: 5   /* 4 -> 5 (2026-11-04): no written answer, domain fact, known value or server prompt states a superseded figure */
  },
  {
    name: "domain pack",
    cmd: ["node", ["scripts/dev/build-domain.js", "--check"]],
    expect: 1
  },
  {
    name: "cost engine",
    cmd: ["node", ["scripts/dev/check-cost-engine.js"]],
    expect: 27
  },
  {
    name: "cost path",
    cmd: ["node", ["scripts/dev/check-cost-path.js"]],
    expect: 30
  },
  {
    name: "quiz operation",
    cmd: ["node", ["scripts/dev/check-quiz-op.js"]],
    expect: 29
  },
  {
    name: "prose operation",
    cmd: ["node", ["scripts/dev/check-prose-op.js"]],
    expect: 38
  },
  {
    name: "job spec",
    cmd: ["node", ["scripts/dev/check-job-spec.js"]],
    expect: 8
  },
  {
    name: "drafter",
    cmd: ["node", ["scripts/dev/check-draft.js"]],
    expect: 15
  },
  {
    name: "propose loop",
    cmd: ["node", ["scripts/dev/check-propose.js"]],
    expect: 41
  },
  {
    name: "settings api",
    cmd: ["node", ["scripts/dev/check-settings.js"]],
    expect: 39
  },
  {
    name: "review api",
    cmd: ["node", ["scripts/dev/check-review.js"]],
    expect: 20
  },
  {
    name: "per-item acceptance",
    cmd: ["node", ["scripts/dev/check-pick.js"]],
    expect: 18
  },
  {
    name: "the five bans",
    cmd: ["node", ["scripts/dev/check-bans.js"]],
    expect: 37
  },
  {
    name: "corrections memory",
    cmd: ["node", ["scripts/dev/check-corrections.js"]],
    expect: 22
  },
  {
    name: "write gates",
    cmd: ["node", ["scripts/dev/check-write-gates.js"]],
    expect: 13
  },
  {
    name: "conversation memory",
    cmd: ["node", ["scripts/dev/check-conversations.js"]],
    expect: 29
  },
  {
    /* job 8 (2026-11-03): what the assistant remembers, step awareness, phone pairing and its security, the monthly cap */
    name: "memory and phone",
    cmd: ["node", ["scripts/dev/check-memory.js"]],
    expect: 51
  },
  {
    /* job 8 in a real browser (Python Playwright, Chromium): status line, memory view, pairing a phone, synced
       ticks, More detail, where questions go, the monthly cap */
    name: "chat memory (browser)",
    cmd: ["python", ["scripts/dev/check-chat-memory.py"]],
    expect: 31,   /* 28 -> 31 (2026-11-04, the public release): the public site makes no /api/ request; the laptop and the paired phone still do. 22 -> 28 (2026-11-04, Shad's chat): stage-first where-you-are, AI answers say so, a greeting gets one line, the model question from the settings, an empty answer asked again, a banned buying answer followed by the written one. 18 -> 22 (2026-11-04): a part ticked bought on the laptop shows as bought on the phone (own:<id>); a returning browser with the old code's leftovers is repaired; page and script versions match */
    optional: true
  },
  {
    /* fresh-eyes fixes (approved 2026-11-04) in a real browser: the Home card follows the stages, the parcel tests
       follow what was ticked bought, the threadlocker test (Python Playwright, Chromium) */
    name: "stages and parcels (browser)",
    cmd: ["python", ["scripts/dev/check-fresh-eyes.py"]],
    expect: 13,
    optional: true
  },
  {
    /* the phone pass (job 11, approved 2026-11-04) in a real browser: on a phone the 3D views fold their extras under
       "More 3D options" and the finished drone waits as a picture; the step line, the chat button, the stock chips, no
       sideways scroll, no zoom-in on text boxes, and the one-time "Copy my ticks to my phone" link; the laptop keeps
       everything (Python Playwright, Chromium) */
    name: "phone pass (browser)",
    cmd: ["python", ["scripts/dev/check-phone.py"]],
    expect: 30,   /* 24 -> 30 (2026-11-04, job 12, Shad's iPhone shots 9-13): the touch hint, the opened finished drone folded and fitting 390 px, the chat's reply to a vague ask and its 5 buttons */
    optional: true
  },
  {
    name: "build sync",
    cmd: ["node", ["scripts/dev/check-build-sync.js"]],
    expect: 23
  },
  {
    name: "suggest an edit",
    cmd: ["node", ["scripts/dev/check-suggest.js"]],
    expect: 128
  },
  {
    name: "browser",
    cmd: ["node", ["scripts/dev/check-browser.js"]],
    expect: 29,  /* 28 -> 29 (2026-11-03): the step prerequisite boxes' text contrast (Fable Part 2, S1) */
    optional: true /* needs Chrome; --quick skips it, and a skip is reported as skipped */
  },
  {
    name: "self-test served",
    served: true, /* the page must be served over http, not file:// */
    expect: 24
  },
  {
    name: "self-test single file",
    cmd: PS("scripts/dev/check-assistant.ps1", ["-Target", "dist/Shad's Build Guide.html"]),
    expect: 24
  },
  {
    name: "3d views",
    cmd: ["node", ["scripts/dev/check-render.js"]],
    expect: 21
  },
  {
    name: "ai path",
    cmd: PS("scripts/dev/check-llm-path.ps1", []),
    expect: 11
  },
  {
    /* Phase D: each step model against its step text - budgets, labels, motor positions, one clip per step,
       every action id in STEP-TRUTH.md and in its own step section, every part an action or pin names exists. */
    name: "step models",
    cmd: ["python", ["-I", "scripts/build/check_models.py"]],
    expect: 511   /* 510 -> 511 (2026-11-04, guide audit page 1, card 8): S8.6 names the props going back on (prop_M1_blades). 503 -> 510 (2026-11-04, practical cards, Opus): the Step 4 FINDER label, S4.9's own checks and the longer S2.2/S2.4 shows. Before: 494 -> 503 (2026-11-04 Phase G): Step 2 names the FRONT and Step 7 the Li-ion ghost pack (+2); S1.1 now highlights one part per pile and S2.1-S2.3 the FRONT arrow, so their 'part an action names exists' checks grew (+7). Before: 493 -> 494 (2026-11-04, Shad's mixed Stage 5): Step 5 also needs a label naming the Li-ion pack's charge setting ('LION, 2.5 A'); the M4AC label check became M7AC, same count. Before: 488 -> 493 (2026-11-03 re-sync): the new S3.5 first power-up action adds its clip, order, step, part-name and on-the-page checks; the Step 3 "no battery_pack" rule became "battery_pack only on the bench" (S3.5 puts a pack there), same count. Before: 435 -> 488 (2026-11-03): check_models now reads the LIVE page (build-guide-ui/index.html, or --page); it had read the repo's old 05:06 copy, which has no data-action-ids, so 53 "action is on the page" checks were silently skipped and now really run */
  },
  {
    /* Phase D: the viewer in headless Chrome - at most 2 WebGL contexts, release / re-init, play / pause / scrub,
       chips, reduced motion, and every action's pose shows what its text names. */
    name: "3d viewer",
    cmd: ["node", ["scripts/build/check_viewer.js"]],
    expect: 235   /* 179 -> 235 (2026-11-04, Opus's 229cdba): 56 phone-width checks (no close-up box, at most 3 labels, none touching, the camera eases in). Before: 178 -> 179 (2026-11-04, practical cards, Opus): S4.9's pose. Before: 177 -> 178 (2026-11-03): the new S3.5 action's pose shows what its text names */
  },
  {
    /* Phase E: payload layout sweeps on the real frame outlines (thermal view, fit, balance, legs, wires) */
    name: "design simulations",
    cmd: ["python", ["-I", "scripts/build/simulate_design.py", "--check"]],
    expect: 13
  },
  {
    /* Phase F: build verification (replay, fit, access, clearance, wiring, power, weight, cross-checks; 10,000 tolerance runs) */
    name: "build verification",
    cmd: ["python", ["-I", "scripts/build/verify_build.py"]],
    expect: 205   /* 200 -> 205 (2026-11-04, practical cards, Opus): BUY-used-finder, BUY-used-spare-sd, BUY-qty-spare-sd, BUY-qty-foam-tape, DEP-S4.9. Before: 199 -> 200 (2026-11-04 Phase G): X-models-buy-list, every part drawn in the 3D models comes from a buy line or is named as not bought, and Step 1 shows no more of a pack, charger, radio or monitor than the list buys (X-models-box-check, the M7AC's unlisted mains cable and lead, is NEEDS REAL PARTS). Before: 197 -> 199 (2026-11-04 joint commit with the Builder's battery cards): X-chip-numbers, X-chip-directions and BUY-required-all-used pass again now the model chips match the new page and S5.3c uses the More Volts line; one fewer page fix. 197 (2026-11-04, Shad's mixed Stage 5): +7 checks for the second flight pack, the More Volts 4S 5000 Li-ion (prop, GPS-gap design, forward-stop balance, feet, strap for both packs, M7AC Li-ion charge voltage; 2 more are NEEDS REAL PARTS: the Li-ion GPS-gap tolerance run and its current). Before: 190 (2026-11-03 re-sync): +1 replay check for the new S3.5 (DEP-S3.5); the first battery plug-in moved from S8.2 to S3.5 (SAFE-3 still passes); the iron adapter is now 24 V 5 A. Before: 179 -> 178 (AAA line left the buy list), then 181: zip-tie length and camera-tape checks added; 182: crash tip check (crash review C1); 184: prop-direction and battery-GPS design-overlap checks (Fable M5) ; 189: the buy list is now read from the live page's buy-data (it was a 10:10 copy): -1 glasses (now owned, not bought), +3 new lines checked (extinguisher, practice board, X30 spray), +2 LED strip and DVR card moved to optional stage 8 (exempt PASS, were PAGE FIX), +1 required-stage-lines-all-used check (Fable M5). One BUY-used check per buy line, so adding or removing a buy line moves this count by 1 */
  }
];

const argv = process.argv.slice(2);
const QUICK = argv.includes("--quick");
const JSON_OUT = argv.includes("--json");
const TIMEOUT_MS = 180000;

function run(cmd, cwd) {
  const t0 = Date.now();
  const r = spawnSync(cmd[0], cmd[1], {
    cwd: cwd || ROOT,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true
  });
  return {
    ok: r.status === 0,
    status: r.status,
    out: String(r.stdout || "") + String(r.stderr || ""),
    ms: Date.now() - t0
  };
}

function countLines(text, prefix) {
  return text.split(/\r?\n/).filter((l) => l.indexOf(prefix) === 0).length;
}

/* Ports (4 Nov 2026). Shad's own guide server listens on 8790 (the Desktop launcher, "Start Guide Assistant.cmd"),
   so no suite may ever use it, and the gate refuses to start when a port a suite needs is already taken, instead of
   failing oddly half-way. Every fixed port the suites use is listed here, in this one place; portPreflight() scans
   the suite files and refuses if one uses a port this list does not name. The "served" suite and check-render pick
   free or random ports of their own, so they are not listed. */
const LIVE_GUIDE_PORT = 8790;
const SUITE_PORTS = {
  "check-write-gates.js": [8781, 8782, 8783, 8784],
  "check-conversations.js": [8791, 8792, 8793, 8794],
  "check-llm-path.ps1": [8791, 8792],
  "mock-llm.js": [8791],
  "check-cost-path.js": [8793, 8794, 8795, 8796],
  "check-bans.js": [8794, 8795],
  "check-review.js": [8796],
  "check-settings.js": [8797, 8798],
  "check-browser.js": [8799, 8800],
  "check-build-sync.js": [8802],
  "check-memory.js": [8806, 8807],
  "check-chat-memory.py": [8808, 8809],
  "check-fresh-eyes.py": [8813],
  "check-phone.py": [8815],
  "check-assistant.ps1": [8899]   /* only in a usage comment: the gate serves this suite on a free port */
};

/* Taken = something already answers there, or the port cannot be bound. Both, because on Windows a server opened
   with address reuse (Python's http.server does this) still lets a second program bind the same port. */
function portAnswers(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port: port, host: "127.0.0.1" });
    const done = (v) => { sock.destroy(); resolve(v); };
    sock.setTimeout(400, () => done(false));
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}

function portTaken(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(true));
    srv.listen(port, host, () => srv.close(() => resolve(false)));
  });
}

async function portPreflight() {
  const problems = [];
  const dir = path.join(ROOT, "scripts", "dev");
  fs.readdirSync(dir).filter((f) => /\.(js|py|ps1)$/.test(f) && f !== "gate.js").forEach((f) => {
    const found = new Set((fs.readFileSync(path.join(dir, f), "utf8").match(/\b8[78]\d\d\b/g) || []).map(Number));
    found.forEach((p) => {
      if (p === LIVE_GUIDE_PORT) { problems.push(f + " uses port " + p + ", the port of Shad's own guide server"); }
      else if (!(SUITE_PORTS[f] || []).includes(p)) { problems.push(f + " uses port " + p + ", which gate.js SUITE_PORTS does not list"); }
    });
  });
  const listed = [...new Set([].concat(...Object.values(SUITE_PORTS)))].filter((p) => p !== 8899).sort((a, b) => a - b);
  for (const p of listed) {
    if (p === LIVE_GUIDE_PORT) { problems.push("SUITE_PORTS lists " + p + ", the port of Shad's own guide server"); continue; }
    if (await portAnswers(p) || await portTaken(p, "127.0.0.1") || await portTaken(p, "0.0.0.0")) {
      problems.push("port " + p + " is already in use by another program; stop it, then run the gate again");
    }
  }
  return { problems: problems, ports: listed };
}

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

async function waitForUrl(url, tries) {
  for (let i = 0; i < (tries || 80); i += 1) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch (e) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 125));
  }
  return false;
}

function summarise(suite, r) {
  const passed = countLines(r.out, "PASS ");
  const failed = countLines(r.out, "FAIL ");
  const short = passed < suite.expect;
  const result = r.ok && !failed && !short ? "PASS" : "FAIL";
  let detail = "";
  if (r.status === null) { detail = "timed out or could not start"; }
  else if (failed) { detail = failed + " failing check(s)"; }
  else if (short) { detail = "only " + passed + " checks, expected " + suite.expect; }
  else if (!r.ok) { detail = "exit " + r.status; }
  /* A failing suite's whole output (its tracebacks included) is kept in a file, so a failure that cannot be
     reproduced later can still be read (2026-11-04: a suite stopped early in someone else's run and left no trace). */
  let log = "";
  if (result === "FAIL") {
    try {
      const dir = path.join(require("os").tmpdir(), "guide-gate-logs");
      fs.mkdirSync(dir, { recursive: true });
      log = path.join(dir, new Date().toISOString().replace(/[:.]/g, "-") + "-" + suite.name.replace(/[^a-z0-9]+/gi, "-") + ".log");
      fs.writeFileSync(log, "exit " + r.status + "\n" + r.out, "utf8");
    } catch (e) { log = ""; }
  }
  return {
    name: suite.name,
    result: result,
    passed: passed,
    expect: suite.expect,
    ms: r.ms,
    detail: detail,
    log: log,
    failures: r.out.split(/\r?\n/).filter((l) => l.indexOf("FAIL ") === 0)
  };
}

async function runSuite(suite) {
  if (suite.optional && QUICK) {
    return { name: suite.name, result: "SKIP", passed: 0, expect: suite.expect, ms: 0,
      detail: "--quick", failures: [] };
  }

  if (suite.served) {
    /* The page has to come over http for its self-test to behave; file:// is a
       different code path, covered by the single-file suite. */
    const port = await freePort();
    const srv = spawn("python", ["-m", "http.server", String(port)],
      { cwd: ROOT, stdio: "ignore", windowsHide: true });
    try {
      const up = await waitForUrl("http://127.0.0.1:" + port + "/index.html");
      if (!up) {
        return { name: suite.name, result: "FAIL", passed: 0, expect: suite.expect, ms: 0,
          detail: "could not start a local web server (is python on PATH?)", failures: [] };
      }
      const r = run(["powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        "scripts/dev/check-assistant.ps1", "-Target",
        "http://127.0.0.1:" + port + "/index.html"]]);
      return summarise(suite, r);
    } finally {
      try { srv.kill(); } catch (e) { /* already gone */ }
    }
  }

  return summarise(suite, run(suite.cmd));
}

(async () => {
  const pre = await portPreflight();
  if (pre.problems.length) {
    console.log("GATE REFUSED: a port the suites need cannot be used, so nothing was run.");
    pre.problems.forEach((p) => console.log("  - " + p));
    process.exit(2);
  }
  if (!JSON_OUT) {
    console.log("  ports: the suites' " + pre.ports.length + " fixed ports are free; " + LIVE_GUIDE_PORT +
      " (Shad's own guide) is never used by the gate");
  }
  const results = [];
  for (const suite of SUITES) {
    process.stdout.write("  " + suite.name.padEnd(24) + " ");
    const res = await runSuite(suite);
    results.push(res);
    console.log(res.result + (res.detail ? "   " + res.detail : ""));
  }

  const failed = results.filter((r) => r.result === "FAIL");
  const skipped = results.filter((r) => r.result === "SKIP");
  const totalChecks = results.reduce((n, r) => n + r.passed, 0);
  const expected = results.reduce((n, r) => n + (r.result === "SKIP" ? 0 : r.expect), 0);

  /* The READMEs have stated the wrong total three separate times. A gate that lets
     the documentation lie about the gate is not doing its job, so check it here. */
  const docProblems = [];
  ["README.md", "docs/assistant/README.md"].forEach(function (rel) {
    let text;
    try { text = fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { return; }
    const m = text.match(/(\d+) named checks/);
    if (!m) { docProblems.push(rel + " states no check total"); return; }
    if (Number(m[1]) !== expected) {
      docProblems.push(rel + " says " + m[1] + " checks; the gate actually runs " + expected);
    }
    const suites = text.match(/(\d+) suites/);
    if (suites && Number(suites[1]) !== SUITES.length) {
      docProblems.push(rel + " says " + suites[1] + " suites; there are " + SUITES.length);
    }
  });

  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: failed.length === 0, totalChecks, expected, results }, null, 2));
    process.exit(failed.length ? 1 : 0);
  }

  console.log("");
  console.log("  " + "suite".padEnd(24) + "result".padEnd(9) + "checks".padEnd(10) + "time");
  console.log("  " + "-".repeat(52));
  for (const r of results) {
    const checks = r.result === "SKIP" ? "-" : r.passed + "/" + r.expect;
    console.log("  " + r.name.padEnd(24) + r.result.padEnd(9) + checks.padEnd(10) +
      (r.ms / 1000).toFixed(1) + "s");
  }
  console.log("  " + "-".repeat(52));
  console.log("  " + String(totalChecks + "/" + expected).padEnd(33) + "named checks");

  if (failed.length) {
    console.log("");
    console.log("  FAILURES");
    for (const r of failed) {
      console.log("  " + r.name + ": " + (r.detail || "failed"));
      r.failures.slice(0, 8).forEach((f) => console.log("      " + f.trim()));
      if (r.log) { console.log("      full output: " + r.log); }
    }
  }
  if (skipped.length) {
    console.log("");
    console.log("  SKIPPED: " + skipped.map((s) => s.name).join(", ") +
      " (--quick; not counted as passing)");
  }

  if (docProblems.length) {
    console.log("");
    console.log("  THE DOCUMENTATION DOES NOT MATCH THE GATE");
    docProblems.forEach(function (p) { console.log("    " + p); });
  }

  console.log("");
  if (failed.length || docProblems.length) {
    if (failed.length) { console.log("  GATE FAILED — " + failed.length + " suite(s) red."); }
    if (docProblems.length) { console.log("  GATE FAILED — the docs disagree with the checks."); }
    process.exit(1);
  }
  console.log("  GATE PASSED" + (skipped.length ? " (with " + skipped.length + " suite skipped)" : ""));
  process.exit(0);
})();

