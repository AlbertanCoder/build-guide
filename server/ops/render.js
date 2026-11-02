"use strict";
/* 3D explainer views: the AI writes a scene plan (data, never code), this file
   checks it, and Blender builds it with scripts/build/build_from_plan.py.
   The allow-lists here must match the ones in that script; check-render.js
   compares them. */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const RUNNER = path.join(__dirname, "..", "..", "scripts", "build", "build_from_plan.py");
const MAX_REQUEST = 600;
const MAX_CONTEXT = 2400;
const MAX_SHAPES = 40;
const MAX_LABELS = 14;
const REACH = 0.4;

const PARTS = [
  "frame", "motors", "propellers", "flight_stack", "motor_wires", "battery_lead",
  "front_camera", "vtx_and_antenna", "led_strip", "pi_payload", "battery",
  "smoke_stopper", "monitor", "laptop", "glasses", "soldering_iron", "multimeter",
  "radio", "sd_reader", "charger", "lipo_bag"
];
const PLACED_PARTS = ["smoke_stopper", "monitor", "laptop", "glasses", "soldering_iron",
  "multimeter", "radio", "sd_reader", "charger", "lipo_bag"];
const SHAPES = ["box", "cylinder", "wire", "arrow", "marker"];
const COLOURS = [
  "carbon", "alu", "steel", "brass", "pcb_black", "pcb_green", "pcb_red", "pcb_blue",
  "plastic_black", "plastic_white", "plastic_grey", "gold", "copper", "wire_red",
  "wire_black", "wire_blue", "wire_yellow", "wire_white", "battery", "accent", "pine"
];

const SCENE = [
  "Units are metres. Origin = centre of the frame's bottom plate. +X = the front of the drone",
  "(the camera end), -X = the rear (battery and antenna end), +Y = the left side, +Z = up.",
  "Where the built-in parts sit once added:",
  "- frame: plates and arms, x/y -0.093..0.093, z 0..0.010. {\"part\":\"frame\",\"ghost\":true} draws it faint, for wiring diagrams.",
  "- motors: M1 (-0.078, 0.078) rear-left, M2 (0.078, 0.078) front-left, M3 (-0.078, -0.078) rear-right,",
  "  M4 (0.078, -0.078) front-right, z 0.008..0.025. propellers: hubs at the same x/y, z 0.019.",
  "- flight_stack: GEPRC F405 flight controller over the 50A 4-in-1 ESC, centre (0, 0), z 0.010..0.024.",
  "  {\"part\":\"flight_stack\",\"explode\":0.03} lifts the flight controller 0.03 above the ESC.",
  "- motor_wires: ESC pads to each motor. battery_lead: XT60 lead ending near (0.067, -0.055, 0.006).",
  "- front_camera: Phoenix 2 analog camera, x 0.026..0.056, y -0.011..0.011, z 0.002..0.033.",
  "- vtx_and_antenna: Unify HV video transmitter x -0.073..-0.015, z 0.010..0.019; antenna at x -0.075, z 0.018..0.068.",
  "- led_strip: under the frame, z about -0.001.",
  "- pi_payload: Pi Zero 2 WH + Qwiic HAT, x -0.032..0.032, y -0.016..0.016, z 0.010..0.032;",
  "  MLX90640 thermal board under it at (0, -0.014, -0.003) with the lens facing down;",
  "  PA1010D GPS on a mast at (0.020, -0.009, 0.053), antenna facing up.",
  "- battery: 4S 1500 pack crosswise at the rear, x -0.069..-0.005, y -0.036..0.036, z 0.010..0.042, with straps.",
  "- Bench items take \"at\": [x, y, z] and optional \"turn\" (radians): " + PLACED_PARTS.join(", ") + ".",
  "  Put them beside the drone (for example x 0.15..0.30) so they do not overlap it.",
  "Extra shapes (each needs \"shape\"): box {at, size:[x,y,z], colour}; cylinder {at, radius, height, axis:\"x\"|\"y\"|\"z\", colour};",
  "wire {points:[[x,y,z], ...2 to 8 points], thickness about 0.0011, colour}; arrow {from, to, colour}; marker {at} (a centre-of-gravity ring).",
  "Colours: " + COLOURS.join(", ") + ". Use accent (orange) for the thing the person must look at.",
  "Labels: {text (at most 48 characters), at:[x,y,z], detail (optional, at most 80 characters)}. Put a label just above the",
  "thing it names. Labels must be at least 0.03 apart or they overlap on screen: parts closer than that share ONE label",
  "(for example \"R2 / T2 PADS\" with the detail \"receiver TX to R2, RX to T2\"). Aim for 3 to 8 labels. Make wires 0.0015 thick so they show.",
  "Wiring diagram layout used by the guide's step 4 model (copy it for receiver or video wiring): a ghost frame;",
  "receiver board box at [-0.105, 0.030, 0.072] size [0.020, 0.012, 0.0016]; flight controller board box at [0, 0, 0.084]",
  "size [0.030, 0.030, 0.0016]; flight controller pads (gold boxes, size [0.003, 0.003, 0.0012]) on its near edge at y -0.013,",
  "z 0.0852: R2 x -0.004, T2 x 0.004, 5V x -0.010, GND x 0.010. Wires run from the receiver board's edge to those pads."
].join("\n");

/* Every label the guide's own 3D models already carry, with the step it belongs
   to. These are checked facts, so the AI can name real pads and parts instead
   of telling the person to look them up. */
let factsCache = null;
function guideFacts() {
  if (factsCache) { return factsCache; }
  const dir = path.dirname(RUNNER);
  const lines = [];
  fs.readdirSync(dir).filter((f) => /^(build_step|build_final|lib_quad)/.test(f) && f.endsWith(".py")).sort().forEach(function (f) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const step = (/Step \d+: "[^"]+"/.exec(src) || [""])[0];
    const found = [];
    const re = /C\.label\(\s*"((?:[^"\\]|\\.)+)"([\s\S]*?)\)\s*\n/g;
    let m;
    while ((m = re.exec(src))) {
      const detail = /detail="((?:[^"\\]|\\.)+)"/.exec(m[2]);
      found.push(m[1].replace(/\\(.)/g, "$1") + (detail ? " (" + detail[1].replace(/\\(.)/g, "$1") + ")" : ""));
    }
    if (found.length) { lines.push("- " + (step || f.replace(/\.py$/, "")) + ": " + found.join("; ")); }
  });
  factsCache = lines.join("\n");
  return factsCache;
}

function buildPrompt(input, feedback) {
  return [
    "You make one small 3D explainer scene for a person building this exact drone, so they can see what an",
    "instruction means. You do not write code: you return a JSON scene plan that a fixed builder turns into a model.",
    "",
    SCENE,
    "",
    "Facts the guide's own 3D models already show (label, then detail):",
    guideFacts(),
    "",
    "Rules:",
    "1. Use only the parts, shapes and colours listed above. At most " + MAX_SHAPES + " shapes and " + MAX_LABELS + " labels.",
    "2. Show only what answers the request: add the parts it is about, and the frame (often ghosted) for orientation.",
    "3. Every label names a real part or a real step from the guide, using the facts above (for example the exact pads).",
    "   Never invent part numbers, values or limits, and do not tell the person to look something up that the facts give.",
    "4. \"explain\" is one to three plain sentences telling the person what the view shows and what to look at.",
    "5. Return only the JSON object, no prose and no code fence.",
    "",
    "Shape of the answer:",
    '{"title":"...","explain":"...","parts":[{"part":"frame","ghost":true},{"part":"flight_stack","explode":0.03}],' +
      '"shapes":[{"shape":"arrow","from":[0,0,0.09],"to":[0,0,0.05],"colour":"accent"}],' +
      '"labels":[{"text":"GEPRC F405","at":[0,0,0.06],"detail":"Plug the USB cable in here"}]}',
    "",
    "What the person asked for: " + input.request,
    input.context ? "\nThe guide answer they are trying to picture:\n" + input.context : "",
    feedback ? "\nYour last plan was refused for these reasons; fix them and return the whole plan again:\n- " + feedback.join("\n- ") : ""
  ].join("\n");
}

function extractJson(text) {
  const s = String(text || "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) { return null; }
  try { return JSON.parse(s.slice(start, end + 1)); } catch (e) { return null; }
}

function isPoint(v) {
  return Array.isArray(v) && v.length === 3 &&
    v.every((c) => typeof c === "number" && Number.isFinite(c) && Math.abs(c) <= REACH);
}

function shortText(v, n) {
  return typeof v === "string" ? v.trim().slice(0, n) : "";
}

/* Returns { plan, errors }. The plan keeps only known keys, so nothing the AI
   adds on its own reaches Blender. */
function checkPlan(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { plan: null, errors: ["the answer was not one JSON object"] };
  }
  const plan = {
    title: shortText(raw.title, 80) || "3D view",
    explain: shortText(raw.explain, 400),
    parts: [],
    shapes: [],
    labels: []
  };
  (Array.isArray(raw.parts) ? raw.parts : []).forEach(function (p, i) {
    const o = typeof p === "string" ? { part: p } : p;
    if (!o || PARTS.indexOf(o.part) === -1) { errors.push("parts[" + i + "]: unknown part " + JSON.stringify(o && o.part)); return; }
    const keep = { part: o.part };
    if (o.ghost === true) { keep.ghost = true; }
    if (o.part === "flight_stack" && typeof o.explode === "number") { keep.explode = Math.max(0, Math.min(0.05, o.explode)); }
    if (PLACED_PARTS.indexOf(o.part) !== -1) {
      if (!isPoint(o.at)) { errors.push("parts[" + i + "] (" + o.part + "): \"at\" must be [x, y, z] within " + REACH + " m"); return; }
      keep.at = o.at;
      if (typeof o.turn === "number" && Number.isFinite(o.turn)) { keep.turn = o.turn; }
    }
    plan.parts.push(keep);
  });
  const shapes = Array.isArray(raw.shapes) ? raw.shapes : [];
  if (shapes.length > MAX_SHAPES) { errors.push("too many shapes: " + shapes.length + " (at most " + MAX_SHAPES + ")"); }
  shapes.slice(0, MAX_SHAPES).forEach(function (s, i) {
    const where = "shapes[" + i + "]";
    if (!s || SHAPES.indexOf(s.shape) === -1) { errors.push(where + ": unknown shape " + JSON.stringify(s && s.shape)); return; }
    const keep = { shape: s.shape };
    if (s.colour !== undefined) {
      if (COLOURS.indexOf(s.colour) === -1) { errors.push(where + ": unknown colour " + JSON.stringify(s.colour)); return; }
      keep.colour = s.colour;
    }
    if (s.shape === "wire") {
      const pts = Array.isArray(s.points) ? s.points : [];
      if (pts.length < 2 || pts.length > 8 || !pts.every(isPoint)) { errors.push(where + ": a wire needs 2 to 8 points [x, y, z] within " + REACH + " m"); return; }
      keep.points = pts;
      if (typeof s.thickness === "number") { keep.thickness = s.thickness; }
    } else if (s.shape === "arrow") {
      if (!isPoint(s.from) || !isPoint(s.to)) { errors.push(where + ": an arrow needs \"from\" and \"to\" points"); return; }
      keep.from = s.from; keep.to = s.to;
    } else {
      if (!isPoint(s.at)) { errors.push(where + ": \"at\" must be [x, y, z] within " + REACH + " m"); return; }
      keep.at = s.at;
      if (s.shape === "box") {
        if (!Array.isArray(s.size) || s.size.length !== 3 || !s.size.every((c) => typeof c === "number" && c > 0 && c <= 0.2)) {
          errors.push(where + ": a box needs \"size\": three numbers above 0 and at most 0.2"); return;
        }
        keep.size = s.size;
      }
      if (s.shape === "cylinder") {
        ["radius", "height"].forEach(function (k) { if (typeof s[k] === "number") { keep[k] = s[k]; } });
        if (["x", "y", "z"].indexOf(s.axis) !== -1) { keep.axis = s.axis; }
      }
    }
    plan.shapes.push(keep);
  });
  const labels = Array.isArray(raw.labels) ? raw.labels : [];
  if (labels.length > MAX_LABELS) { errors.push("too many labels: " + labels.length + " (at most " + MAX_LABELS + ")"); }
  labels.slice(0, MAX_LABELS).forEach(function (l, i) {
    const t = l && shortText(l.text, 48);
    if (!t) { errors.push("labels[" + i + "]: a label needs text"); return; }
    if (!isPoint(l.at)) { errors.push("labels[" + i + "]: \"at\" must be [x, y, z] within " + REACH + " m"); return; }
    const keep = { text: t, at: l.at };
    const d = shortText(l.detail, 80);
    if (d) { keep.detail = d; }
    plan.labels.push(keep);
  });
  if (!plan.parts.length && !plan.shapes.length) { errors.push("the plan shows nothing: add at least one part or shape"); }
  return { plan: plan, errors: errors };
}

/* Blender's Windows installer puts each version in its own folder; take the
   newest. An explicit path from the settings wins. */
function findBlender(configured) {
  if (configured && fs.existsSync(configured)) { return configured; }
  const roots = [];
  if (process.platform === "win32") {
    roots.push(path.join(process.env.ProgramFiles || "C:\\Program Files", "Blender Foundation"));
  }
  for (const root of roots) {
    try {
      const dirs = fs.readdirSync(root).filter((d) => /^Blender/i.test(d)).sort().reverse();
      for (const d of dirs) {
        const exe = path.join(root, d, "blender.exe");
        if (fs.existsSync(exe)) { return exe; }
      }
    } catch (e) { /* not installed there */ }
  }
  const fixed = ["/Applications/Blender.app/Contents/MacOS/Blender", "/usr/bin/blender", "/usr/local/bin/blender", "/snap/bin/blender"];
  for (const p of fixed) { if (fs.existsSync(p)) { return p; } }
  return "";
}

function runBlender(blender, planFile, outDir, timeoutMs) {
  return new Promise(function (resolve) {
    let log = "";
    const child = spawn(blender, ["-b", "--factory-startup", "--python-exit-code", "1", "-P", RUNNER], {
      env: Object.assign({}, process.env, { GA_PLAN: planFile, GA_MODEL_OUT: outDir }),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    const keep = (b) => { log = (log + b.toString()).slice(-6000); };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const timer = setTimeout(function () { child.kill(); }, timeoutMs);
    child.on("error", function (e) { clearTimeout(timer); resolve({ ok: false, log: String(e.message || e) }); });
    child.on("close", function (code) {
      clearTimeout(timer);
      const glb = path.join(outDir, "view.glb");
      resolve({ ok: code === 0 && fs.existsSync(glb), log: log });
    });
  });
}

function blenderError(log) {
  const lines = String(log || "").match(/^(ValueError|TypeError|KeyError): [^\r\n]*/gm);
  return lines ? lines[lines.length - 1].replace(/^\w+: /, "").slice(0, 200) : "";
}

module.exports = {
  PARTS, PLACED_PARTS, SHAPES, COLOURS, MAX_REQUEST, MAX_CONTEXT, MAX_SHAPES, MAX_LABELS, RUNNER,
  buildPrompt, extractJson, checkPlan, findBlender, runBlender, blenderError
};
