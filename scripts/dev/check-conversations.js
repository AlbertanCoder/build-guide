// Item B's conversation memory, proven against a running server:
// threads live in CONVERSATIONS_DIR as <id>.json, and every PUT goes through
// Decision 14's three write gates while GETs stay open.
//
//   node scripts/dev/check-conversations.js
//
// A thread saves and reloads unchanged (title, messages, history, lastId), the
// list is newest first with the right counts, and a second save with the same
// id replaces the first (upsert). The write gates are the same three that guard
// /api/settings and /api/propose: a reachable server with no flag is read-only,
// a flag with no token refuses everything, and the wrong token never gets
// through. Reads are not writes - GET works with no token even on a reachable
// server. A bad id, bad JSON, or oversized body never reaches the disk.
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-conv-"));

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

/* Threads live wherever CONVERSATIONS_DIR points. Here that is always inside
   TMP, so the suite can never write into the real repo's server/.conversations. */
function convDir(port) {
  return path.join(TMP, "conversations-" + port);
}

function start(port, extra) {
  return spawn(process.execPath, ["server/assistant-server.js"], {
    cwd: ROOT, windowsHide: true,
    env: Object.assign({}, process.env, {
      PORT: String(port),
      SETTINGS_FILE: path.join(TMP, "settings-" + port + ".json"),
      CONVERSATIONS_DIR: convDir(port),
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
async function send(port, method, urlPath, raw, headers) {
  try {
    const r = await fetch("http://127.0.0.1:" + port + urlPath, {
      method: method,
      headers: Object.assign({ "content-type": "application/json" }, headers || {}),
      body: raw
    });
    let j = null;
    try { j = await r.json(); } catch (e) { /* non-json */ }
    return { status: r.status, json: j };
  } catch (err) {
    /* a dropped connection must fail its own check, not the whole run */
    return { status: 0, json: null, error: String(err && err.message ? err.message : err) };
  }
}
async function get(port, urlPath, headers) {
  return send(port, "GET", urlPath, undefined, headers);
}
async function put(port, urlPath, body, headers) {
  return send(port, "PUT", urlPath, JSON.stringify(body), headers);
}
async function putRaw(port, urlPath, raw, headers) {
  return send(port, "PUT", urlPath, raw, headers);
}
function why(r) {
  return (r.json && r.json.error) || r.error || ("status " + r.status);
}
function same(a, b) {
  if (a === b) { return true; }
  if (typeof a !== typeof b || a === null || b === null) { return false; }
  if (Array.isArray(a) !== Array.isArray(b)) { return false; }
  if (typeof a !== "object") { return false; }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) { return false; }
  return ka.every((k) => same(a[k], b[k]));
}

/* What a thread holds: whatever the page sent, back unchanged. */
const THREAD_A = {
  title: "propeller choice",
  messages: [
    { role: "user", content: "what propellers fit the 5-inch frame?" },
    { role: "assistant", content: "5x4.3x3 tri-blades, per the frame section." }
  ],
  history: [{ at: "2026-11-01T00:00:00Z", prompt: "what propellers fit the 5-inch frame?" }],
  lastId: "msg-a2"
};
const THREAD_A2 = {
  title: "propeller choice (revised)",
  messages: [{ role: "user", content: "actually, would 6-inch fit?" }],
  history: [{ at: "2026-11-01T00:05:00Z", prompt: "actually, would 6-inch fit?" }],
  lastId: "msg-c1"
};
const THREAD_B = {
  title: "battery wiring",
  messages: [{ role: "user", content: "how thick should the battery leads be?" }],
  history: [],
  lastId: "msg-b1"
};
const GATE_THREAD = {
  title: "gate thread",
  messages: [{ role: "user", content: "saved through the token gate." }],
  history: [],
  lastId: "msg-g1"
};

const TOKEN = "test-write-token-" + Date.now().toString(36);
(async () => {
  const servers = [];
  try {
    /* --- a thread saves, reloads, lists and upserts (loopback) ------------ */
    const local = start(8791, {});
    servers.push(local);
    check("a loopback server starts (conversations)", await waitFor("http://127.0.0.1:8791/api/health"));

    let r = await put(8791, "/api/conversations/conv-alpha", THREAD_A);
    check("PUT saves a thread and returns {ok:true}",
      r.status === 200 && r.json && r.json.ok === true, why(r));

    let onDisk = null;
    try {
      onDisk = JSON.parse(fs.readFileSync(path.join(convDir(8791), "conv-alpha.json"), "utf8"));
    } catch (e) { /* missing or unparsable: the check below reports it */ }
    check("CONVERSATIONS_DIR is honored: the thread lands as <id>.json with updatedAt",
      !!onDisk && onDisk.title === THREAD_A.title && same(onDisk.messages, THREAD_A.messages) &&
      same(onDisk.history, THREAD_A.history) && onDisk.lastId === THREAD_A.lastId && onDisk.updatedAt != null,
      onDisk ? "updatedAt " + JSON.stringify(onDisk.updatedAt) : "no conv-alpha.json on disk");

    r = await get(8791, "/api/conversations/conv-alpha");
    const t = (r.json && r.json.thread) || {};
    check("GET returns {ok:true, thread:{title, messages, history, lastId}}",
      r.status === 200 && r.json && r.json.ok === true && !!r.json.thread, why(r));
    check("save+reload round-trip preserves messages",
      r.status === 200 && same(t.messages, THREAD_A.messages), why(r));
    check("save+reload round-trip preserves title, history and lastId",
      r.status === 200 && t.title === THREAD_A.title && same(t.history, THREAD_A.history) &&
      t.lastId === THREAD_A.lastId, why(r));

    r = await get(8791, "/api/conversations/never-saved");
    check("GET of an unknown id returns 404 'no such thread'",
      r.status === 404 && r.json && r.json.ok === false && /no such thread/.test(String(r.json.error || "")),
      why(r));

    await new Promise((resolve) => setTimeout(resolve, 200)); /* distinct updatedAt */
    r = await put(8791, "/api/conversations/conv-beta", THREAD_B);
    check("PUT saves a second thread", r.status === 200 && r.json && r.json.ok === true, why(r));

    r = await get(8791, "/api/conversations");
    const list = (r.json && r.json.threads) || [];
    check("the list returns {ok:true, threads:[...]}",
      r.status === 200 && r.json && r.json.ok === true && Array.isArray(r.json.threads), why(r));
    check("the list shows saved threads newest first by updatedAt",
      list.length >= 2 && list[0].id === "conv-beta" && list[1].id === "conv-alpha",
      list.slice(0, 2).map((x) => x.id).join(", "));
    check("each list entry carries the title it was saved with",
      list.length >= 2 && list[0].title === THREAD_B.title && list[1].title === THREAD_A.title,
      list.slice(0, 2).map((x) => JSON.stringify(x.title)).join(", "));
    check("each list entry's count matches its messages",
      list.length >= 2 && list[0].count === THREAD_B.messages.length &&
      list[1].count === THREAD_A.messages.length,
      list.slice(0, 2).map((x) => x.count).join(", "));

    await new Promise((resolve) => setTimeout(resolve, 200));
    r = await put(8791, "/api/conversations/conv-alpha", THREAD_A2);
    const reread = await get(8791, "/api/conversations/conv-alpha");
    const t2 = (reread.json && reread.json.thread) || {};
    check("PUT upserts: a second save with the same id replaces the thread",
      r.status === 200 && r.json && r.json.ok === true &&
      reread.status === 200 && t2.title === THREAD_A2.title && same(t2.messages, THREAD_A2.messages) &&
      same(t2.history, THREAD_A2.history) && t2.lastId === THREAD_A2.lastId,
      "put " + r.status + ", get " + reread.status);

    /* --- a reachable server with no --allow-write is read-only ------------ */
    const ro = start(8792, { BIND: "0.0.0.0" });
    servers.push(ro);
    check("a reachable server starts (read-only)", await waitFor("http://127.0.0.1:8792/api/health"));

    r = await put(8792, "/api/conversations/conv-remote", THREAD_A);
    check("gate 2: no --allow-write refuses a conversation write",
      r.status === 403 && /write is disabled/.test(String((r.json && r.json.error) || "")),
      why(r));
    r = await get(8792, "/api/conversations");
    check("GET works with no token on a reachable read-only server",
      r.status === 200 && r.json && r.json.ok === true && Array.isArray(r.json.threads), why(r));

    /* --- the flag without a token refuses everything ---------------------- */
    const noTok = start(8793, { BIND: "0.0.0.0", ALLOW_WRITE: "1" });
    servers.push(noTok);
    check("a reachable server starts (--allow-write, no token)", await waitFor("http://127.0.0.1:8793/api/health"));
    r = await put(8793, "/api/conversations/conv-notoken", THREAD_A);
    check("gate 3: --allow-write without GA_WRITE_TOKEN refuses a conversation write",
      r.status === 403 && /no write token configured/.test(String((r.json && r.json.error) || "")),
      why(r));

    /* --- the token gates: missing, wrong, right --------------------------- */
    const gated = start(8794, { BIND: "0.0.0.0", ALLOW_WRITE: "1", GA_WRITE_TOKEN: TOKEN });
    servers.push(gated);
    check("a reachable server starts (flag + token)", await waitFor("http://127.0.0.1:8794/api/health"));

    r = await put(8794, "/api/conversations/gate-thread", GATE_THREAD);
    check("a missing token is refused",
      r.status === 401 && /token missing or wrong/.test(String((r.json && r.json.error) || "")), why(r));
    r = await put(8794, "/api/conversations/gate-thread", GATE_THREAD, { "x-write-token": "wrong-token" });
    check("a wrong token is refused",
      r.status === 401 && /token missing or wrong/.test(String((r.json && r.json.error) || "")), why(r));
    r = await put(8794, "/api/conversations/gate-thread", GATE_THREAD, { "x-write-token": TOKEN });
    check("the right token can save a conversation",
      r.status === 200 && r.json && r.json.ok === true, why(r));

    const bareList = await get(8794, "/api/conversations");
    const bareThread = await get(8794, "/api/conversations/gate-thread");
    check("GETs work with no token on a token-gated server (reads are not writes)",
      bareList.status === 200 && bareList.json && bareList.json.ok === true &&
      bareThread.status === 200 && bareThread.json && bareThread.json.ok === true &&
      same((bareThread.json.thread || {}).messages, GATE_THREAD.messages),
      "list " + bareList.status + ", thread " + bareThread.status);

    /* --- loopback keeps working with none of it (regression) -------------- */
    r = await put(8791, "/api/conversations/gate-matrix", THREAD_B);
    check("gate 1: loopback writes work with no flag and no token",
      r.status === 200 && r.json && r.json.ok === true, why(r));

    /* --- a bad id, bad JSON, or oversized body never reaches the disk ----- */
    r = await get(8791, "/api/conversations/Bad_Id");
    check("GET rejects a bad thread id with 400", r.status === 400, why(r));
    r = await put(8791, "/api/conversations/Bad_Id", { title: "x", messages: [], history: [], lastId: "x" });
    check("PUT rejects a bad thread id with 400", r.status === 400, why(r));
    const gTrav = await get(8791, "/api/conversations/..%2F..%2Fevil");
    const pTrav = await put(8791, "/api/conversations/..%2F..%2Fevil",
      { title: "x", messages: [], history: [], lastId: "x" });
    check("a path-traversal id is refused with 400 on GET and PUT",
      gTrav.status === 400 && pTrav.status === 400, "get " + gTrav.status + ", put " + pTrav.status);
    r = await putRaw(8791, "/api/conversations/bad-json-target", "{not json");
    check("PUT rejects a bad JSON body with 400", r.status === 400, why(r));
    r = await putRaw(8791, "/api/conversations/oversized-target",
      "{\"pad\":\"" + "x".repeat(300 * 1024) + "\"}");
    check("PUT rejects an oversized body (>256KB) with 413", r.status === 413, why(r));
  } catch (err) {
    check("the conversation tests ran without throwing", false, String(err && err.message ? err.message : err));
  } finally {
    servers.forEach(function (s) { try { s.kill(); } catch (e) { /* already gone */ } });
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) { console.log(bad + " check(s) failed."); process.exit(1); }
  console.log("conversation memory is real: threads round-trip, and every write gate holds.");
})();
