// check_viewer.js - prove the 3D viewer in a real browser: contexts released, clips play / pause / scrub, chips work.
//
//   node scripts/build/check_viewer.js
//
// Serves the repo on a local port, opens scripts/build/viewer-test.html (all nine models, far apart) in headless
// Chrome with the GPU path, scrolls through every model, and reads the page's report. Exit 1 on any failure.
"use strict";

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const MAX_ALIVE = 2;
const SHEETS = process.argv.includes("--sheets");   // also write docs/build-truth/contact-step-0N.png
const results = {};
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".json": "application/json" };

let fails = 0;
function check(ok, msg) {
  console.log((ok ? "PASS " : "FAIL ") + msg);
  if (!ok) fails += 1;
}

let report = null;
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/report") {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { report = JSON.parse(body); res.end("ok"); });
    return;
  }
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404; res.end(); return;
  }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  if (!CHROME) { check(false, "Chrome found"); return finish(null); }
  // two passes: the desktop page, then the same models at a phone column's width (Shad's iPhone review 2026-11-04)
  const run = async (query, size, extra = []) => {
    report = null;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-test-"));
    const chrome = spawn(CHROME, ["--headless=new", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist",
      "--no-first-run", "--no-sandbox", "--window-size=" + size, "--user-data-dir=" + profile, ...extra,
      "http://127.0.0.1:" + port + "/scripts/build/viewer-test.html" + query], { stdio: "ignore" });
    for (let i = 0; i < 1800 && !report; i += 1) await new Promise((r) => setTimeout(r, 100));
    try { chrome.kill(); } catch (e) { /* gone */ }
    return report;
  };
  const desk = await run(SHEETS ? "?sheets=1" : "", "900,800");
  const phone = SHEETS ? null : await run("?phone=1", "420,900");   // CSS pixels (1x): what a person sees
  finish(desk, phone);
});

function finishPhone(ph) {
  if (!ph) { check(false, "phone width: the test page reported (no report in 180 s)"); return; }
  check(ph.errors.length === 0, "phone width: no page errors " + (ph.errors.length ? JSON.stringify(ph.errors.slice(0, 3)) : ""));
  ph.steps.forEach((s) => {
    const name = (s.model || "?").split("/").pop();
    if (s.phoneCloseups) console.log(`INFO phone width ${name}: close-up box kept (parts too small framed whole) on ${s.phoneCloseups.join(", ")}`);
    (s.actionChecks || []).forEach((c) => check(c.ok, `phone width ${name}: ${c.id}: no close-up box, at most 3 labels, none overlapping, 14 px text` +
      (c.ok ? "" : " (" + c.bad.join("; ") + ")")));
  });
}

function finish(desk, phone) {
  report = desk;
  server.close();
  if (!SHEETS) finishPhone(phone);
  if (!report) {
    check(false, "the test page reported (no report in 180 s)");
  } else {
    check(report.errors.length === 0, "no page errors " + (report.errors.length ? JSON.stringify(report.errors.slice(0, 3)) : ""));
    check(report.maxLive <= MAX_ALIVE, `at most ${MAX_ALIVE} WebGL renderers alive at once (max seen ${report.maxLive})`);
    check(report.reinitFirst, "a released viewer comes back when scrolled to again");
    report.steps.forEach((s) => {
      const name = (s.model || "?").split("/").pop();
      check(s.ready, `${name}: loads`);
      if (s.namedParts) {
        check(s.labelsOffByDefault, `${name}: labels start OFF`);
        check(s.namedParts[0] >= 0.9 * s.namedParts[1], `${name}: tap-to-name knows ${s.namedParts[0]} of ${s.namedParts[1]} parts`);
        if (s.views.includes("pilot")) {
          check(s.pilotInset === "Flying camera sees" && s.pilotConeVisible, `${name}: flying-camera view shows its cone and picture`);
          check(s.tiltRaisesView, `${name}: tilt slider raises the flying camera's view`);
        }
        if (s.views.includes("thermal")) {
          check(s.thermalInset && s.thermalInset.startsWith("Thermal camera sees") && s.thermalConeVisible,
                `${name}: thermal-camera view shows its cone and picture`);
        }
      }
      if (s.fill) console.log(`INFO ${name}: default view reaches ${s.fill[0]} across, ${s.fill[1]} up/down (1.0 = frame edge), aspect ${s.aspect}`);
      check(s.canvases <= MAX_ALIVE, `${name}: ${s.canvases} canvases in the page (<= ${MAX_ALIVE})`);
      if (s.clip) console.log(`INFO ${name}: playing=${s.playing} reducedMotion=${s.reduced} hidden=${s.hidden}`);
      if (s.clip) {
        const want = name.replace(/^step-(\d\d).*$/, "step-$1-main");
        if (name.startsWith("step-")) check(s.clip === want, `${name}: clip named ${want} (got ${s.clip})`);
        check(s.hasBar, `${name}: play / pause / scrub bar shown`);
        if (s.reduced) {
          check(s.reducedNoAutoplay, `${name}: reduced motion -> no autoplay`);
          check(s.reducedStartsAtEnd, `${name}: reduced motion -> shows the finished pose`);
        }
        check(s.timeMovesWhilePlaying, `${name}: time moves while playing`);
        check(s.timeStopsWhenPaused, `${name}: time stops when paused`);
        check(s.scrubSetsTime, `${name}: the slider sets the time`);
        check((s.actions || []).length === s.chips && s.chips > 0, `${name}: one chip per action (${s.chips})`);
        check(s.lastChipActive, `${name}: clicking a chip jumps to it`);
        (s.actionChecks || []).forEach((c) => check(c.ok, `${name}: ${c.id} pose at ${c.t} s shows what the text names` +
          (c.ok ? "" : " (" + c.bad.join("; ") + ")")));
        if (SHEETS && s.sheet) {
          const num = name.slice(5, 7);
          const out = path.join(ROOT, "docs", "build-truth", `contact-step-${num}.png`);
          fs.writeFileSync(out, Buffer.from(s.sheet.split(",")[1], "base64"));
          console.log("WROTE " + path.relative(ROOT, out));
          results[name] = s.actionChecks;
        }
      } else {
        console.log(`INFO ${name}: no clip in this model yet`);
      }
    });
  }
  if (SHEETS) fs.writeFileSync(path.join(ROOT, "docs", "build-truth", "contact-results.json"), JSON.stringify(results, null, 1));
  console.log(fails ? fails + " FAILED" : "ALL PASS");
  process.exit(fails ? 1 : 0);
}
