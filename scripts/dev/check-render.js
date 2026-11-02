// Tests 3D explainer views: the plan checker, the Blender runner and the routes.
//
//   node scripts/dev/check-render.js
//
// The AI only ever writes a plan (data). These checks prove that anything not on
// the allow-list is refused or dropped before Blender sees it, that the Python
// runner refuses it again on its own, and that no provider is ever called.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const R = require("../../server/ops/render.js");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

const py = fs.readFileSync(R.RUNNER, "utf8");
const pyParts = Array.from(py.slice(py.indexOf("PARTS = {"), py.indexOf("}\n", py.indexOf("PARTS = {")))
  .matchAll(/^\s+"([a-z_0-9]+)":/gm)).map((m) => m[1]).sort();
check("the JavaScript and Python part allow-lists are identical",
  JSON.stringify(pyParts) === JSON.stringify(R.PARTS.slice().sort()), pyParts.length + " vs " + R.PARTS.length);
const pyColours = (/COLOURS = \(([\s\S]*?)\)/.exec(py) || [, ""])[1].match(/"([a-z_]+)"/g).map((s) => s.slice(1, -1)).sort();
check("the JavaScript and Python colour allow-lists are identical",
  JSON.stringify(pyColours) === JSON.stringify(R.COLOURS.slice().sort()), pyColours.length + " vs " + R.COLOURS.length);

const good = {
  title: "Where the receiver wires go",
  explain: "The receiver floats above a faint frame.",
  parts: [{ part: "frame", ghost: true }, { part: "flight_stack", explode: 0.03 }, { part: "monitor", at: [0.2, -0.1, 0] }],
  shapes: [{ shape: "wire", points: [[-0.1, 0.03, 0.07], [0, 0, 0.03]], colour: "wire_red" },
    { shape: "arrow", from: [0, 0, 0.09], to: [0, 0, 0.05], colour: "accent" },
    { shape: "box", at: [-0.1, 0.03, 0.07], size: [0.02, 0.012, 0.002], colour: "pcb_black" }],
  labels: [{ text: "RP1 V2 receiver", at: [-0.1, 0.03, 0.09], detail: "5V and GND" }]
};
let c = R.checkPlan(good);
check("a plan using only listed parts, shapes and colours passes untouched",
  c.errors.length === 0 && c.plan.parts.length === 3 && c.plan.shapes.length === 3 && c.plan.labels.length === 1,
  c.errors.join("; "));

c = R.checkPlan({ parts: ["frame", "__import__", { part: "os.system" }] });
check("an unknown part is refused and named in the reason",
  c.errors.length === 2 && /__import__/.test(c.errors[0]) && c.plan.parts.length === 1, c.errors.join("; "));

c = R.checkPlan({ parts: ["frame"], shapes: [{ shape: "box", at: [0, 0, 5], size: [0.01, 0.01, 0.01] }] });
check("a point outside the bench scene is refused", c.errors.length === 1 && c.plan.shapes.length === 0, c.errors.join("; "));

c = R.checkPlan({ parts: ["frame"], shapes: [{ shape: "wire", points: [[0, 0, 0], [0, 0, 0.1]], colour: "neon" }] });
check("an unknown colour is refused", c.errors.length === 1 && /neon/.test(c.errors[0]), c.errors.join("; "));

c = R.checkPlan({ python: "import os", parts: [{ part: "frame", script: "x", ghost: true }],
  labels: [{ text: "A", at: [0, 0, 0], onclick: "x" }] });
check("keys the builder does not know are dropped, never passed on",
  !("python" in c.plan) && !("script" in c.plan.parts[0]) && !("onclick" in c.plan.labels[0]) && c.plan.parts[0].ghost === true);

c = R.checkPlan({ parts: ["frame"], labels: Array.from({ length: 20 }, () => ({ text: "x", at: [0, 0, 0] })) });
check("more labels than the limit are flagged and cut",
  c.errors.some((e) => /too many labels/.test(e)) && c.plan.labels.length === R.MAX_LABELS);

c = R.checkPlan({ title: "nothing", parts: [], shapes: [] });
check("a plan that shows nothing is flagged", c.errors.some((e) => /shows nothing/.test(e)));

const fenced = R.extractJson("Here you go:\n```json\n{\"parts\":[\"frame\"]}\n```\nHope that helps.");
check("the plan is pulled out of prose and a code fence", fenced && fenced.parts && fenced.parts[0] === "frame");

const prompt = R.buildPrompt({ request: "show the GPS mast", context: "Mount the GPS on its mast" }, ["unknown colour \"neon\""]);
check("the prompt carries the request, the answer being pictured, the refusal reasons and the guide's own model labels",
  /show the GPS mast/.test(prompt) && /Mount the GPS on its mast/.test(prompt) && /unknown colour/.test(prompt) &&
  /PA1010D/.test(prompt) && /TX -> R2  \/  RX -> T2 \(Crossed on purpose\)/.test(prompt) && /5\.1" TRI-BLADE PROPS/.test(prompt));

function run(cmd, args, env, ms) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, env: Object.assign({}, process.env, env), stdio: "ignore", windowsHide: true });
    const t = setTimeout(() => child.kill(), ms);
    child.on("close", (code) => { clearTimeout(t); resolve(code); });
    child.on("error", () => { clearTimeout(t); resolve(-1); });
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ga-render-check-"));
const blender = R.findBlender("");

(async () => {
  if (blender) {
    const goodDir = path.join(tmp, "good");
    fs.mkdirSync(goodDir);
    fs.writeFileSync(path.join(goodDir, "plan.json"), JSON.stringify(R.checkPlan(good).plan));
    let built = await R.runBlender(blender, path.join(goodDir, "plan.json"), goodDir, 120000);
    const glb = path.join(goodDir, "view.glb");
    const magic = fs.existsSync(glb) ? fs.readFileSync(glb).slice(0, 4).toString("latin1") : "";
    check("Blender builds a checked plan into a 3D model file", built.ok && magic === "glTF", magic || R.blenderError(built.log));

    const badDir = path.join(tmp, "bad");
    fs.mkdirSync(badDir);
    fs.writeFileSync(path.join(badDir, "plan.json"), JSON.stringify({ parts: ["__import__"] }));
    built = await R.runBlender(blender, path.join(badDir, "plan.json"), badDir, 120000);
    check("the Blender runner refuses an unknown part on its own, without the JavaScript check",
      !built.ok && /^unknown part: '__import__'$/.test(R.blenderError(built.log)), R.blenderError(built.log));
  } else {
    check("Blender builds a checked plan into a 3D model file", false, "Blender is not installed, so this cannot be proved here");
    check("the Blender runner refuses an unknown part on its own, without the JavaScript check", false, "Blender is not installed");
  }

  const port = 8900 + Math.floor(Math.random() * 80);
  const rendersDir = path.join(tmp, "renders");
  fs.mkdirSync(path.join(rendersDir, "abc123-def456"), { recursive: true });
  fs.writeFileSync(path.join(rendersDir, "abc123-def456", "view.glb"), "glTF-test");
  const server = spawn(process.execPath, [path.join(ROOT, "server", "assistant-server.js")], {
    cwd: ROOT, stdio: "ignore", windowsHide: true,
    env: Object.assign({}, process.env, {
      PORT: String(port), GA_TEST: "1", SETTINGS_FILE: path.join(tmp, "settings.json"),
      CONVERSATIONS_DIR: path.join(tmp, "conv"), CACHE_FILE: path.join(tmp, "cache.json"), RENDERS_DIR: rendersDir,
      OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", API_KEY: "", PROVIDER: "openai", BASE_URL: "https://api.openai.com/v1"
    })
  });
  const base = "http://127.0.0.1:" + port;
  try {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try { if ((await fetch(base + "/api/health")).ok) break; } catch (e) { /* starting */ }
    }
    let r = await fetch(base + "/api/render");
    check("GET /api/render is refused (making a view is POST only)", r.status === 405, String(r.status));

    r = await fetch(base + "/api/render", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ request: "show the stack" }) });
    let j = await r.json();
    check("with no key a 3D request stops before any provider call", r.status === 501 && /key|Blender/.test(j.error), r.status + " " + j.error);

    r = await fetch(base + "/api/render", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    check("a 3D request that is not JSON is refused (blocks cross-site form posts)", r.status === 415, String(r.status));

    r = await fetch(base + "/api/render/abc123-def456/view.glb");
    const served = await r.text();
    check("a finished view is served as a 3D model file",
      r.status === 200 && /gltf-binary/.test(r.headers.get("content-type") || "") && served === "glTF-test", r.status + " " + r.headers.get("content-type"));

    r = await fetch(base + "/api/render/..%2F..%2Fsettings/view.glb");
    check("a path outside the views folder is not served", r.status === 404, String(r.status));

    j = await (await fetch(base + "/api/settings")).json();
    check("settings report the 3D model, thinking effort and Blender status",
      j.renderEffort === "medium" && Array.isArray(j.efforts) && j.efforts.join() === "off,low,medium,high" &&
      typeof j.blenderPath === "string" && j.renderModelInUse === j.cheapModel, j.renderEffort + " / " + j.renderModelInUse);

    const post = (body) => fetch(base + "/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    r = await post({ renderModel: "anthropic/claude-sonnet-5.5", renderEffort: "high" });
    j = await r.json();
    check("the 3D model and thinking effort save, separately from the answer model",
      r.ok && j.renderModelInUse === "anthropic/claude-sonnet-5.5" && j.renderEffort === "high" && j.cheapModel !== j.renderModelInUse,
      j.renderModelInUse + " / " + j.renderEffort + " / answers " + j.cheapModel);

    r = await post({ renderEffort: "maximum" });
    const r2 = await post({ blenderPath: path.join(ROOT, "README.md") });
    check("an unknown effort and a Blender path that is not Blender are both refused",
      r.status === 400 && r2.status === 400, r.status + " / " + r2.status);
  } finally {
    server.kill();
    await new Promise((r) => setTimeout(r, 400));
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("render verified.");
})();
