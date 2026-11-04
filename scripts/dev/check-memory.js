// Job 8 (2026-11-03): the assistant's memory, step awareness, phone pairing, its security and the monthly cap.
//
//   node scripts/dev/check-memory.js
//
// Part 1 tests server/memory.js directly with a moved clock. Part 2 starts the real server (port 8806, its own
// temp folders, a fake AI on 8807) and a phone listener on 127.0.0.2 standing in for the laptop's home-network
// address, then talks to both the way the laptop's page and a phone would. Nothing touches the real
// server/.memory, settings or conversations.
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-mem-"));
const { createMemory, extractRemember, LIMITS } = require(path.join(ROOT, "server", "memory.js"));
const PORT = 8806, AI = 8807, PHONE = "127.0.0.2";

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

/* ---------------- part 1: the memory module ---------------- */
function part1() {
  let t = Date.UTC(2026, 10, 3, 20, 0, 0);
  const clock = () => t;
  const dir = path.join(TMP, "unit");
  const m = createMemory({ dir: dir, now: clock });

  const a = m.facts.add("The 4S packs arrived on 3 Nov", { kind: "build", from: "phone" });
  t += 1000;
  m.facts.add("He has no hot glue gun", { kind: "build" });
  const list = m.facts.list();
  check("facts: a fact is kept with its kind and where it came from; newest first",
    a.ok && list.length === 2 && list[0].text === "He has no hot glue gun" && list[1].from === "phone" && list[1].kind === "build", list.map((f) => f.text).join(" | "));
  const again = m.facts.add("the 4s PACKS arrived on 3 nov");
  check("facts: the same fact told twice is kept once", again.ok && again.existed && m.facts.list().length === 2);
  const refused = ["My API key is sk-abc123def456ghi789", "email me at shad@example.com", "I live at 12345 104 Avenue NW",
    "call 780 555 0199", "the password is hunter2", "token abcdefghijklmnopqrstuvwxyz0123456789"].map((s) => m.facts.add(s).ok);
  check("facts: keys, passwords, emails, street addresses and phone numbers are never kept", refused.every((x) => x === false), JSON.stringify(refused));
  const keepOk = ["4 standoffs are screwed in place", "Step 3 is done", "The XT60 lead is soldered"].map((s) => m.facts.add(s).ok);
  check("facts: ordinary build facts are not mistaken for addresses", keepOk.every(Boolean), JSON.stringify(keepOk));
  const m2 = createMemory({ dir: dir, now: clock });
  check("facts: they survive a restart (a new server reads the same folder)", m2.facts.list().length === 5);
  const id = m.facts.list().find((f) => /glue/.test(f.text)).id;
  check("facts: one can be deleted", m.facts.remove(id) && !m.facts.list().some((f) => f.id === id) && m.facts.remove(id) === false);
  const rel = m.facts.relevant("which packs do I charge first?", 3);
  check("facts: the ones that match the question come first", rel[0] && /packs/.test(rel[0].text), rel.map((f) => f.text).join(" | "));
  const v1 = m.facts.version(); m.facts.add("A new fact about props"); const v2 = m.facts.version();
  check("facts: the memory version changes when a fact is added (the answer cache keys on it)", v1 !== v2);
  m.facts.clear();
  check("facts: forget everything empties the list", m.facts.list().length === 0);
  for (let i = 0; i < LIMITS.facts; i++) { t += 1; m.facts.add("Problem number " + i + " happened", { kind: i < 3 ? "problem" : "build" }); }
  t += 1; m.facts.add("One more build fact");
  const capped = m.facts.list();
  check("facts: capped at " + LIMITS.facts + "; when full the oldest problem goes first",
    capped.length === LIMITS.facts && !capped.some((f) => f.text === "Problem number 0 happened") && capped.some((f) => f.text === "Problem number 3 happened"), capped.length + " facts");

  // progress
  const p = m.progress.merge({ "asm-1": { v: true, at: t - 5000 }, "asm-2": { v: true, at: t - 4000 } });
  const older = m.progress.merge({ "asm-1": { v: false, at: t - 9000 } });
  const newer = m.progress.merge({ "asm-2": { v: false, at: t - 1000 } });
  const junk = m.progress.merge({ "bad key!": { v: true, at: t }, "asm-3": { v: true, at: t + 3600 * 1000 }, "asm-4": { v: "yes", at: t } });
  const ticks = m.progress.get().ticks;
  check("progress: each tick keeps its latest change; an older change from another device loses",
    p.applied === 2 && older.applied === 0 && newer.applied === 1 && ticks["asm-1"].v === true && ticks["asm-2"].v === false, JSON.stringify(ticks));
  check("progress: bad keys, non-true/false values and times far in the future are refused", junk.applied === 0 && !ticks["asm-3"] && !ticks["asm-4"]);

  // pairing
  const s1 = m.devices.startPairing();
  check("pairing: the code is 6 digits and lasts 5 minutes", s1.ok && /^\d{6}$/.test(s1.code) && s1.expiresInS === 300);
  const good = m.devices.pair(s1.code, "Shad's phone");
  const reuse = m.devices.pair(s1.code, "again");
  check("pairing: the right code pairs once; the same code a second time is refused", good.ok && good.token.length >= 40 && !reuse.ok, reuse.reason);
  const stored = fs.readFileSync(path.join(dir, "devices.json"), "utf8");
  check("pairing: the phone's token is stored only as a hash", stored.indexOf(good.token) === -1 && /"hash": "[0-9a-f]{64}"/.test(stored));
  check("pairing: the token is recognised; a wrong token is not", !!m.devices.verify(good.token) && m.devices.verify(good.token + "x") === null && m.devices.verify("") === null);
  const s2 = m.devices.startPairing(); t += 5 * 60 * 1000 + 1;
  const late = m.devices.pair(s2.code, "late");
  check("pairing: a code is refused after 5 minutes", !late.ok && /expired/.test(late.reason), late.reason);
  const s3 = m.devices.startPairing();
  const wrong = s3.code === "000000" ? "111111" : "000000";
  const tries = [1, 2, 3, 4, 5].map(() => m.devices.pair(wrong, "x"));
  const whileLocked = m.devices.pair(s3.code, "x");
  check("pairing: five wrong codes lock pairing, and even the right code is refused while locked",
    tries.slice(0, 4).every((r) => r.reason === "wrong code") && tries[4].reason === "locked" && !whileLocked.ok && whileLocked.reason === "locked", tries.map((r) => r.reason).join(","));
  t += LIMITS.lockMs + 1;
  check("pairing: the lock ends after 10 minutes", m.devices.startPairing().ok);
  const devId = m.devices.list()[0].id;
  check("devices: removing a phone kills its token at once", m.devices.remove(devId) && m.devices.verify(good.token) === null);

  // spend
  const sp = createMemory({ dir: path.join(TMP, "spend"), now: clock });
  sp.spend.record(0.4); sp.spend.record(0.35);
  const inMonth = sp.spend.get();
  check("spend: adds up within the month and blocks at the cap", Math.abs(inMonth.usd - 0.75) < 1e-9 && !sp.spend.blocked(2) && sp.spend.blocked(0.75), JSON.stringify(inMonth));
  t = Date.UTC(2026, 11, 2, 12, 0, 0);
  check("spend: a new month starts from zero", sp.spend.get().usd === 0 && sp.spend.get().month === "2026-12");

  // the answer's hidden lines
  const ex = extractRemember("Charge them at 1.0 A.\n\n[[REMEMBER The packs arrived]]\n[[REMEMBER He uses the M4AC charger]]\n[[REMEMBER third one]]");
  check("answers: [[REMEMBER ...]] lines are taken out of the text and at most two are kept",
    ex.text === "Charge them at 1.0 A." && ex.facts.length === 2 && ex.facts[0] === "The packs arrived", JSON.stringify(ex));
}

/* ---------------- part 2: the real server, the laptop and a phone ---------------- */
function raw(host, method, urlPath, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const body = opts.body === undefined ? null : (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body));
    const headers = Object.assign({ host: (opts.hostHeader || host) + ":" + PORT }, body !== null ? { "content-type": "application/json" } : {}, opts.headers || {});
    const req = http.request({ host: host, port: PORT, method: method, path: urlPath, headers: headers, timeout: 15000 }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        let json = null; try { json = JSON.parse(data); } catch (e) { /* SSE or HTML */ }
        resolve({ status: res.statusCode, json: json, text: data });
      });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.code || e.message, text: "" }));
    req.on("timeout", () => { req.destroy(); });
    if (body !== null) { req.write(body); }
    req.end();
  });
}
const laptop = (method, p, o) => raw("127.0.0.1", method, p, o);
const phone = (method, p, o) => raw(PHONE, method, p, o);
function sse(text) {
  let out = "", meta = null;
  text.split("\n").forEach((l) => {
    if (l.indexOf("data: ") !== 0) { return; }
    try {
      const e = JSON.parse(l.slice(6));
      if (e.type === "delta") { out += e.text; }
      if (e.type === "replace") { out = e.text; }
      if (e.type === "meta") { meta = e; }
    } catch (err) { /* not json */ }
  });
  return { text: out, meta: meta };
}
const PASSAGE = { label: "Step 4: the flight stack", tab: "steps", step: 4,
  text: "Step 4 mounts the GEPRC TAKER F405 stack on the 30.5 mm standoffs with the arrow facing forward, then the ESC is wired to the XT60 lead." };
function askBody(q, extra) {
  return Object.assign({ question: q, passages: [PASSAGE], history: [{ role: "user", content: q }] }, extra || {});
}
const CTX4 = { step: 4, stepTitle: "Mount the flight stack", done: [1, 2, 3], next: ["Fit the stack with the arrow forward"] };

function fakeAi() {
  const st = { calls: 0, lastUser: "" };
  const srv = http.createServer((req, res) => {
    if (req.url === "/__stats") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(st)); return; }
    let rawBody = "";
    req.on("data", (c) => { rawBody += c; });
    req.on("end", () => {
      let body = {}; try { body = JSON.parse(rawBody); } catch (e) { /* */ }
      const user = ((body.messages || []).filter((m) => m.role === "user").pop() || {}).content || "";
      st.calls += 1; st.lastUser = String(user);
      const q = (/USER QUESTION: (.*)$/m.exec(user) || [])[1] || "";
      let text = "At step 4, fit the stack with the arrow facing forward, then check the motor order before you plug in.";
      if (/arrived/i.test(q)) { text = "Good: then charge them first at 1.0 A.\n[[REMEMBER The 4S flight packs arrived]]"; }
      res.writeHead(200, { "content-type": "text/event-stream" });
      const chunk = (o) => res.write("data: " + JSON.stringify(o) + "\n\n");
      chunk({ id: "x", object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: text } }] });
      chunk({ id: "x", object: "chat.completion.chunk", choices: [], usage: { prompt_tokens: 1500, completion_tokens: 120, prompt_tokens_details: { cached_tokens: 0 } } });
      res.write("data: [DONE]\n\n"); res.end();
    });
  });
  return new Promise((resolve) => srv.listen(AI, "127.0.0.1", () => resolve({ srv, st })));
}
async function aiStats() {
  return new Promise((resolve) => http.get({ host: "127.0.0.1", port: AI, path: "/__stats" }, (r) => {
    let d = ""; r.on("data", (c) => { d += c; }); r.on("end", () => resolve(JSON.parse(d)));
  }));
}

async function part2() {
  const ai = await fakeAi();
  const memDir = path.join(TMP, "server-memory");
  const srv = spawn(process.execPath, ["server/assistant-server.js"], {
    cwd: ROOT, windowsHide: true,
    env: Object.assign({}, process.env, {
      PORT: String(PORT), GA_TEST: "1", PHONE_BIND: PHONE, MEMORY_DIR: memDir,
      SETTINGS_FILE: path.join(TMP, "settings.json"), CONVERSATIONS_DIR: path.join(TMP, "conversations"),
      BASE_URL: "http://127.0.0.1:" + AI + "/v1", PROVIDER: "openai", MODEL: "mock-model", CHEAP_MODEL: "mock-model", STRONG_MODEL: "mock-model",
      API_KEY: "", DAILY_USD_MAX: "0", MONTHLY_USD_MAX: ""
    })
  });
  let log = ""; srv.stdout.on("data", (d) => { log += d; }); srv.stderr.on("data", (d) => { log += d; });
  try {
    let up = false;
    for (let i = 0; i < 60 && !up; i++) { up = (await laptop("GET", "/api/health")).status === 200; if (!up) { await new Promise((r) => setTimeout(r, 250)); } }
    check("server: starts with the memory folder in place", up, up ? "" : log.slice(-300));
    if (!up) { return; }

    const h = (await laptop("GET", "/api/health")).json;
    check("health: shows this month's spend against the US$2.00 cap, where questions go, and phone access off",
      h.month && h.month.cap === 2 && h.month.usd === 0 && h.sendsTo === "127.0.0.1" && h.phone && h.phone.on === false, JSON.stringify({ month: h.month, sendsTo: h.sendsTo, phone: h.phone }));

    // step awareness
    const r1 = await laptop("POST", "/api/ask", { body: askBody("How do I fit the stack?", { context: CTX4 }) });
    let s = await aiStats();
    check("step awareness: the question reaches the AI with his step, the steps he has done and what is next",
      r1.status === 200 && /WHERE SHAD IS IN THE BUILD:\nStep 4: Mount the flight stack \(steps done: 1, 2, 3\)\nNext on this step: Fit the stack/.test(s.lastUser), s.lastUser.slice(0, 160).replace(/\n/g, " / "));
    const callsBefore = s.calls;
    await laptop("POST", "/api/ask", { body: askBody("How do I fit the stack?", { context: CTX4 }) });
    const sameStep = (await aiStats()).calls;
    await laptop("POST", "/api/ask", { body: askBody("How do I fit the stack?", { context: Object.assign({}, CTX4, { step: 5 }) }) });
    const otherStep = (await aiStats()).calls;
    check("step awareness: the same question at the same step comes from the cache; at another step it is asked again",
      sameStep === callsBefore && otherStep === callsBefore + 1, "calls " + callsBefore + " -> " + sameStep + " -> " + otherStep);

    // memory through a real answer
    const r2 = sse((await laptop("POST", "/api/ask", { body: askBody("My batteries arrived today", { context: CTX4 }) })).text);
    const mem1 = (await laptop("GET", "/api/memory")).json;
    check("memory: a fact the AI marks to remember is taken out of the answer and kept on the laptop",
      !/REMEMBER/.test(r2.text) && /charge them first/.test(r2.text) && mem1.facts.length === 1 && mem1.facts[0].text === "The 4S flight packs arrived" && mem1.facts[0].from === "laptop"
      && r2.meta && r2.meta.remembered && r2.meta.remembered.length === 1, r2.text.slice(0, 80) + " | " + JSON.stringify(mem1.facts.map((f) => f.text)));
    await laptop("POST", "/api/ask", { body: askBody("Which packs should I charge?", { context: CTX4 }) });
    s = await aiStats();
    check("memory: what he told it goes into the next question", /WHAT SHAD HAS TOLD YOU \(remembered on his laptop\):\n- The 4S flight packs arrived/.test(s.lastUser));
    check("memory: the answer reports the month's spend", r2.meta && r2.meta.month && r2.meta.month.usd > 0 && r2.meta.month.cap === 2, JSON.stringify(r2.meta && r2.meta.month));

    // memory API
    const noAll = await laptop("DELETE", "/api/memory");
    const del = await laptop("DELETE", "/api/memory/" + mem1.facts[0].id);
    const gone = (await laptop("GET", "/api/memory")).json.facts.length;
    check("memory API: one fact can be deleted; forgetting everything needs ?all=1", noAll.status === 400 && del.status === 200 && gone === 0);
    await laptop("POST", "/api/ask", { body: askBody("The batteries arrived", { context: CTX4 }) });
    const all = await laptop("DELETE", "/api/memory?all=1");
    check("memory API: forget everything", all.status === 200 && (await laptop("GET", "/api/memory")).json.facts.length === 0);

    // never served
    const leaks = await Promise.all(["/server/.memory/facts.json", "/server/memory.js", "/server/.settings.json"].map((p) => laptop("GET", p)));
    check("never served: the memory folder, server code and settings", leaks.every((r) => r.status === 403), leaks.map((r) => r.status).join(","));

    // progress
    const t0 = Date.now();
    await laptop("POST", "/api/progress", { body: { changes: { "asm-1": { v: true, at: t0 - 2000 }, "asm-2": { v: true, at: t0 - 1000 } } } });
    const pg = (await laptop("GET", "/api/progress")).json;
    check("progress: ticks sent from one device are there for the next", pg.ticks["asm-1"].v === true && pg.ticks["asm-2"].v === true);
    const noJson = await laptop("POST", "/api/progress", { body: "x", headers: { "content-type": "text/plain" } });
    check("progress: a change must be JSON (a form from another site cannot send one)", noJson.status === 415);

    // monthly cap (clamped in settings; enforced on the server)
    const setLow = await laptop("POST", "/api/settings", { body: { monthlyUsdMax: 0.01 } });
    const setHigh = await laptop("POST", "/api/settings", { body: { monthlyUsdMax: 999 } });
    await laptop("POST", "/api/settings", { body: { monthlyUsdMax: 2 } });
    check("monthly cap: the setting is kept between US$0.50 and US$20", setLow.json.monthlyUsdMax === 0.5 && setHigh.json.monthlyUsdMax === 20);
    const month = (await laptop("GET", "/api/health")).json.month.month;
    fs.writeFileSync(path.join(memDir, "spend.json"), JSON.stringify({ month: month, usd: 2.0 }));
    const before = (await aiStats()).calls;
    const capped = await laptop("POST", "/api/ask", { body: askBody("Is the cap working?", { context: CTX4 }) });
    check("monthly cap: at US$2.00 the server refuses to call the AI and says so plainly",
      capped.status === 402 && /This month's AI budget is spent \(US\$2\.00 of US\$2\.00\)/.test(capped.json.error) && (await aiStats()).calls === before, capped.json && capped.json.error);
    fs.writeFileSync(path.join(memDir, "spend.json"), JSON.stringify({ month: month, usd: 0 }));

    // phone access
    const off = await phone("GET", "/");
    check("phone access: off by default (nothing listens on the home-network address)", off.status === 0, off.error);
    const pairEarly = await laptop("POST", "/api/pair/start", { body: {} });
    check("pairing: no code while phone access is off", pairEarly.status === 409);
    const on = await laptop("POST", "/api/phone", { body: { on: true } });
    check("phone access: turning it on opens the home-network address", on.status === 200 && on.json.on === true && on.json.url === "http://" + PHONE + ":" + PORT + "/", JSON.stringify(on.json));
    const page = await phone("GET", "/index.html");
    check("phone: the guide page itself loads without pairing", page.status === 200 && /<html/i.test(page.text));
    const unpaired = await Promise.all([phone("GET", "/api/memory"), phone("POST", "/api/ask", { body: askBody("hi there, how do I fit it", { context: CTX4 }) }), phone("GET", "/api/progress")]);
    check("phone: before pairing, memory, questions and progress are refused (401, 'pair first')",
      unpaired.every((r) => r.status === 401 && r.json && r.json.pair === true), unpaired.map((r) => r.status).join(","));
    const laptopOnly = await Promise.all([phone("GET", "/api/settings"), phone("POST", "/api/settings", { body: { apiKey: "zzzzzzzzzzzz" } }),
      phone("POST", "/api/phone", { body: { on: false } }), phone("POST", "/api/pair/start", { body: {} }), phone("GET", "/review"), phone("POST", "/api/propose", { body: {} })]);
    check("phone: settings, the key, phone access, pairing codes, edits and review are laptop-only (403)",
      laptopOnly.every((r) => r.status === 403), laptopOnly.map((r) => r.status).join(","));
    const wrongHost = await phone("GET", "/index.html", { hostHeader: "evil.example" });
    const foreign = await phone("POST", "/api/pair", { body: { code: "123456" }, headers: { origin: "http://evil.example" } });
    const xsite = await phone("GET", "/api/memory", { headers: { "sec-fetch-site": "cross-site" } });
    check("phone: another Host (DNS rebinding), a foreign Origin and a cross-site request are refused",
      wrongHost.status === 403 && foreign.status === 403 && xsite.status === 403, [wrongHost.status, foreign.status, xsite.status].join(","));
    const code = (await laptop("POST", "/api/pair/start", { body: {} })).json;
    const paired = await phone("POST", "/api/pair", { body: { code: code.code, name: "Test phone" } });
    const twice = await phone("POST", "/api/pair", { body: { code: code.code, name: "again" } });
    check("pairing over the network: the laptop's code pairs the phone once", paired.status === 200 && paired.json.token && twice.status === 403, JSON.stringify(twice.json));
    const tok = { "x-device-token": paired.json.token };
    const pm = await phone("GET", "/api/memory", { headers: tok });
    const pp = await phone("GET", "/api/progress", { headers: tok });
    check("phone, paired: it reads the same memory and the same progress as the laptop",
      pm.status === 200 && pp.status === 200 && pp.json.ticks["asm-2"] && pp.json.ticks["asm-2"].v === true);
    const pr = sse((await phone("POST", "/api/ask", { body: askBody("The batteries arrived", { context: CTX4 }), headers: tok })).text);
    const fromPhone = (await laptop("GET", "/api/memory")).json.facts.find((f) => /packs arrived/.test(f.text));
    check("phone, paired: questions work and what it remembers is marked as told on the phone",
      /charge them first/.test(pr.text) && fromPhone && fromPhone.from === "phone", JSON.stringify(fromPhone));
    const stillLaptopOnly = await phone("GET", "/api/settings", { headers: tok });
    check("phone, paired: settings stay laptop-only even with a token", stillLaptopOnly.status === 403);
    const c2 = (await laptop("POST", "/api/pair/start", { body: {} })).json;
    const wrongCode = c2.code === "000000" ? "111111" : "000000";
    const attempts = [];
    for (let i = 0; i < 5; i++) { attempts.push((await phone("POST", "/api/pair", { body: { code: wrongCode } })).status); }
    const lockedRight = await phone("POST", "/api/pair", { body: { code: c2.code } });
    check("pairing over the network: five wrong codes lock it (429), the right code too while locked",
      attempts.slice(0, 4).every((x) => x === 403) && attempts[4] === 429 && lockedRight.status === 429, attempts.join(",") + " then " + lockedRight.status);
    const devs = (await laptop("GET", "/api/phone")).json.devices;
    const rm = await laptop("DELETE", "/api/devices/" + devs[0].id);
    const after = await phone("GET", "/api/memory", { headers: tok });
    check("devices: removing the phone on the laptop locks it out at once", rm.status === 200 && after.status === 401);
    const offAgain = await laptop("POST", "/api/phone", { body: { on: false } });
    const closed = await phone("GET", "/index.html");
    check("phone access: turning it off closes the home-network address", offAgain.json.on === false && closed.status === 0, closed.error);
  } finally {
    srv.kill();
    ai.srv.close();
  }
}

(async () => {
  part1();
  await part2();
  console.log(bad === 0 ? "\nall memory, pairing and cap checks passed" : "\n" + bad + " check(s) failed");
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* a file still open on Windows */ }
  process.exit(bad ? 1 : 0);
})();
