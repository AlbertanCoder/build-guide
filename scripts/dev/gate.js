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
    expect: 4
  },
  {
    name: "domain pack",
    cmd: ["node", ["scripts/dev/build-domain.js", "--check"]],
    expect: 1
  },
  {
    name: "cost engine",
    cmd: ["node", ["scripts/dev/check-cost-engine.js"]],
    expect: 26
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
    expect: 31
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
    name: "build sync",
    cmd: ["node", ["scripts/dev/check-build-sync.js"]],
    expect: 23
  },
  {
    name: "suggest an edit",
    cmd: ["node", ["scripts/dev/check-suggest.js"]],
    expect: 126
  },
  {
    name: "browser",
    cmd: ["node", ["scripts/dev/check-browser.js"]],
    expect: 28,
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
    name: "ai path",
    cmd: PS("scripts/dev/check-llm-path.ps1", []),
    expect: 11
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
  return {
    name: suite.name,
    result: result,
    passed: passed,
    expect: suite.expect,
    ms: r.ms,
    detail: detail,
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

