// Item D: cited edit suggestions, safe Accept/Reject behavior, and the one
// existing proposal loop. Every real write happens only in a throwaway clone.
//
//   node scripts/dev/check-suggest.js
//
// There is deliberately no declared assertion total here. gate.js owns that
// count after the suite has run; this file only reports what it actually ran.
"use strict";

const { spawn, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { isDeepStrictEqual } = require("util");

const ROOT = path.resolve(__dirname, "..", "..");
const INDEX = path.join(ROOT, "index.html");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ga-suggest-"));
const CLONE = path.join(TMP, "clone");
const html = fs.readFileSync(INDEX, "utf8");
const PROSE = require("../../server/ops/prose-rewrite.js");
const SUGGEST = require("../../server/ops/suggest.js");
const BANS = require("../../server/bans.js");

let bad = 0;
let total = 0;
function check(name, ok, detail) {
  total += 1;
  if (!ok) { bad += 1; }
  console.log((ok ? "PASS " : "FAIL ") + name +
    (detail ? "  [" + String(detail).replace(/[\r\n]+/g, " ").slice(0, 240) + "]" : ""));
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function sha(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function fileSha(file) { return sha(fs.readFileSync(file)); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd: cwd || CLONE, encoding: "utf8", windowsHide: true, timeout: 30000
  });
  return {
    status: r.status,
    out: String(r.stdout || "") + String(r.stderr || "") + String(r.error || "")
  };
}
function git(args, cwd) { return run("git", args, cwd || CLONE); }
function gitOut(args, cwd) { return git(args, cwd).out.trim(); }
function branches(cwd) {
  const out = gitOut(["branch", "--list", "proposal/*"], cwd);
  return out ? out.split(/\r?\n/).map((s) => s.replace(/^[*+]\s*/, "").trim()).filter(Boolean) : [];
}
function treeState(cwd) {
  return {
    head: gitOut(["rev-parse", "HEAD"], cwd),
    branch: gitOut(["rev-parse", "--abbrev-ref", "HEAD"], cwd),
    status: gitOut(["status", "--porcelain", "--untracked-files=no"], cwd),
    branches: branches(cwd).sort(),
    index: fileSha(path.join(cwd, "index.html"))
  };
}
function sameTree(a, b) {
  return a.head === b.head && a.branch === b.branch && a.status === b.status &&
    a.index === b.index && JSON.stringify(a.branches) === JSON.stringify(b.branches);
}
function errorsOf(result) {
  return result && Array.isArray(result.errors) ? result.errors.join(" | ") :
    String((result && (result.error || result.message)) || "no error detail");
}

/* This is the server's existing domainPassages() shape, including corrections. */
function domainPassages() {
  const dir = path.join(ROOT, "docs", "domain");
  const out = [];
  fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().forEach((file) => {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    text.split(/\n(?=##\s)/).forEach((block) => {
      const trimmed = block.trim();
      if (!trimmed || trimmed.indexOf("## ") !== 0) { return; }
      const heading = trimmed.split(/\r?\n/)[0].replace(/^##\s*/, "").slice(0, 80);
      out.push({ label: file.replace(/\.md$/, "") + " — " + heading, text: trimmed.slice(0, 900) });
    });
  });
  return out;
}

const SECTION = "p-build";
const OTHER_SECTION = "p-why";
const domain = domainPassages();
const corpus = SUGGEST.createCorpus(html, SECTION, domain);
const other = SUGGEST.guideEntries(html, OTHER_SECTION);
const anchor = corpus.guide.length ? corpus.guide[0].raw : "";
const NONCE = "suggest" + Date.now().toString(36);
const NEW_TEXT = "<p>A clearer pipeline explanation " + NONCE +
  " separates sensing, location, and mapping so each stage is easy to follow.</p>";
const OP = { op: "prose-rewrite", section: SECTION, oldText: anchor, newText: NEW_TEXT };
const guideText = corpus.guide.length ? corpus.guide[0].text : "";
const GUIDE_QUOTE = guideText.slice(0, Math.min(100, guideText.length));
const DOMAIN_QUOTE = domain.length ? (domain[0].text.split(/\r?\n/).find((line) =>
  line.trim().length >= 24 && !/20\d\d-\d\d-\d\d|source::|verified::/i.test(line)
) || domain[0].text.slice(0, 100)).trim() : "";

function candidate() {
  return {
    op: copy(OP),
    report: {
      improves: [{ claim: "The rewrite makes the pipeline sequence easier to follow.",
        citations: [{ source: "G1", quote: GUIDE_QUOTE }] }],
      corpusSupport: [{ claim: "The curated passage grounds the explanation.",
        citations: [{ source: "D1", quote: DOMAIN_QUOTE }] }],
      conflicts: []
    }
  };
}
function mutated(fn) { const value = candidate(); fn(value); return value; }
function entriesById() {
  const map = Object.create(null);
  corpus.guide.concat(corpus.domain).forEach((entry) => { map[entry.id] = entry; });
  return map;
}
function expectedResult() {
  const byId = entriesById();
  const result = candidate();
  Object.keys(result.report).forEach((group) => {
    result.report[group].forEach((claim) => claim.citations.forEach((citation) => {
      citation.label = byId[citation.source].label;
    }));
  });
  return { ok: true, op: result.op, report: result.report };
}
function refuses(name, value, context) {
  let result;
  try {
    result = SUGGEST.validateSuggestion(value, context || { html: html, section: SECTION, corpus: corpus });
  } catch (e) {
    check(name, false, "threw: " + (e.message || e));
    return;
  }
  check(name, result && result.ok === false && Array.isArray(result.errors) && result.errors.length > 0,
    result && result.ok ? "accepted a hostile fixture" : errorsOf(result));
}

/* ---- corpus and prompt: the model sees evidence, not the whole guide ------ */
check("pure helper exports the five contracted functions",
  ["guideEntries", "createCorpus", "buildPrompt", "parseSuggestion", "validateSuggestion", "suggest"]
    .every((name) => typeof SUGGEST[name] === "function"));
check("guide corpus has real paragraph entries with the exact raw anchor",
  corpus.guide.length > 0 && corpus.guide.every((entry, i) =>
    entry.id === "G" + (i + 1) && entry.label.indexOf(SECTION) !== -1 &&
    entry.raw && entry.text && html.indexOf(entry.raw) !== -1 &&
    Object.keys(entry).sort().join(",") === "id,label,raw,text"));
check("guide corpus contains only the selected editable section",
  other.length > 0 && corpus.guide.every((entry) => entry.raw !== other[0].raw) &&
  !corpus.guide.some((entry) => entry.label.indexOf(OTHER_SECTION) !== -1));
check("domain passages become D1... while retaining the server's labels",
  corpus.domain.length === domain.filter((p) => String(p.text || "").trim()).length &&
  corpus.domain.every((entry, i) => entry.id === "D" + (i + 1) &&
    entry.label === domain[i].label && entry.text === domain[i].text.trim()));
check("the domain corpus includes corrections when the server supplies them",
  !domain.some((p) => /corrections/i.test(p.label)) ||
  corpus.domain.some((entry) => /corrections/i.test(entry.label)));

const prompt = SUGGEST.buildPrompt({ sentence: "Make the pipeline clearer", section: SECTION }, corpus);
check("the prompt carries the instruction, section, and every corpus id",
  prompt.indexOf("Make the pipeline clearer") !== -1 && prompt.indexOf(SECTION) !== -1 &&
  corpus.guide.concat(corpus.domain).every((entry) => prompt.indexOf("[" + entry.id + "]") !== -1));
check("the prompt carries exact guide anchors and curated domain evidence",
  prompt.indexOf(anchor) !== -1 && prompt.indexOf(GUIDE_QUOTE) !== -1 &&
  corpus.domain.every((entry) => prompt.indexOf(entry.text) !== -1));
check("the prompt excludes paragraphs from every unselected guide section",
  other.length > 0 && prompt.indexOf(other[0].raw) === -1 && prompt.indexOf(other[0].text) === -1);
check("the prompt requires one cited JSON object and no unsupported operation",
  /ONLY one JSON object/.test(prompt) && /one to four citations/.test(prompt) &&
  /prose-rewrite/.test(prompt) && /uncited claims/.test(prompt));

/* ---- parsing: a fence is a wrapper, not permission for extra prose -------- */
const candidateJson = JSON.stringify(candidate());
check("parseSuggestion accepts one bare object", !!SUGGEST.parseSuggestion(candidateJson));
check("parseSuggestion accepts one optionally fenced object",
  !!SUGGEST.parseSuggestion("```json\n" + candidateJson + "\n```"));
check("parseSuggestion refuses malformed JSON", SUGGEST.parseSuggestion('{"op":') === null);
check("parseSuggestion refuses prose before the object",
  SUGGEST.parseSuggestion("Here is the edit:\n" + candidateJson) === null);
check("parseSuggestion refuses prose after a fenced object",
  SUGGEST.parseSuggestion("```json\n" + candidateJson + "\n```\nHope that helps") === null);
check("parseSuggestion refuses two objects and non-object JSON",
  SUGGEST.parseSuggestion("{}{}") === null && SUGGEST.parseSuggestion("[]") === null &&
  SUGGEST.parseSuggestion("null") === null);

/* ---- the valid fixture and its server-owned citation labels --------------- */
const valid = SUGGEST.validateSuggestion(candidate(), { html: html, section: SECTION, corpus: corpus });
check("a valid fixture passes the real prose and citation validators", valid.ok === true, errorsOf(valid));
check("a successful operation has exactly the four prose-rewrite fields",
  valid.ok && JSON.stringify(valid.op) === JSON.stringify(OP) &&
  Object.keys(valid.op).sort().join(",") === "newText,oldText,op,section");
check("a successful report has exactly the three contracted arrays",
  valid.ok && Object.keys(valid.report).sort().join(",") === "conflicts,corpusSupport,improves" &&
  ["improves", "corpusSupport", "conflicts"].every((group) => Array.isArray(valid.report[group])));
check("improves and corpusSupport are nonempty while conflicts may be empty",
  valid.ok && valid.report.improves.length > 0 && valid.report.corpusSupport.length > 0 &&
  valid.report.conflicts.length === 0);
const validClaims = valid.ok ? Object.keys(valid.report).reduce((all, group) =>
  all.concat(valid.report[group]), []) : [];
const byId = entriesById();
check("every successful claim is plain text with one to four exact-quote citations",
  validClaims.length === 2 && validClaims.every((claim) =>
    claim.claim.trim() && Object.keys(claim).sort().join(",") === "citations,claim" &&
    claim.citations.length >= 1 && claim.citations.length <= 4 && claim.citations.every((citation) =>
      byId[citation.source] && byId[citation.source].text.indexOf(citation.quote) !== -1 &&
      citation.quote.trim().length >= 12)));
check("validator output attaches source, server label, and quote without model-only fields",
  validClaims.every((claim) => claim.citations.every((citation) =>
    Object.keys(citation).sort().join(",") === "label,quote,source" &&
    citation.label === byId[citation.source].label)));
const forged = SUGGEST.validateSuggestion(mutated((value) => {
  value.report.improves[0].citations[0].label = "model-invented label";
}), { html: html, section: SECTION, corpus: corpus });
check("a model cannot forge a citation label",
  !forged.ok || forged.report.improves[0].citations[0].label === corpus.guide[0].label);
check("a successful result contains no confidence score, percentage badge, prompt, or raw model field",
  valid.ok && !/(?:confidence|certainty|\d+\s*%\s*(?:confident|certain|sure)|raw|prompt|reasoning)/i
    .test(JSON.stringify(valid)));


/* ---- citation/report/schema and prose anchors all refuse whole candidates - */
refuses("refuses a report with no object", mutated((v) => { v.report = null; }));
["improves", "corpusSupport", "conflicts"].forEach((group) => {
  refuses("refuses a missing report array: " + group, mutated((v) => { delete v.report[group]; }));
});
refuses("refuses an empty improves array", mutated((v) => { v.report.improves = []; }));
refuses("refuses an empty corpusSupport array", mutated((v) => { v.report.corpusSupport = []; }));
refuses("refuses a claim with missing citations", mutated((v) => {
  v.report.improves[0].citations = [];
}));
refuses("refuses an unknown source id", mutated((v) => {
  v.report.improves[0].citations[0].source = "D999999";
}));
refuses("refuses a misquoted source", mutated((v) => {
  v.report.improves[0].citations[0].quote = "this exact sentence is not in the cited entry";
}));
{
  const wrappedEntry = corpus.guide.find((e) => /\S\s*\n\s*\S/.test(e.raw));
  const wrapped = mutated((v) => { if (wrappedEntry) { v.op.oldText = wrappedEntry.raw.replace(/\s+/g, " "); } });
  const r = SUGGEST.validateSuggestion(wrapped, { html: html, section: SECTION, corpus: corpus });
  check("a hard-wrapped anchor copied back with collapsed line breaks is accepted and restored exactly",
    !!wrappedEntry && r.ok && r.op.oldText === wrappedEntry.raw, errorsOf(r));

  const quoteEntry = corpus.domain.find((e) => /[a-z,] *\r?\n *[a-z]/.test(e.text));
  const m = quoteEntry ? /[a-z,] *\r?\n *[a-z]/.exec(quoteEntry.text) : null;
  const span = m ? quoteEntry.text.slice(Math.max(0, m.index - 30), m.index + 30) : "";
  const quoted = mutated((v) => {
    v.report.corpusSupport[0].citations[0] = { source: quoteEntry ? quoteEntry.id : "D1", quote: span.replace(/\s+/g, " ").trim() };
  });
  const q = SUGGEST.validateSuggestion(quoted, { html: html, section: SECTION, corpus: corpus });
  check("a quote spanning a source line break is accepted when the model writes a space",
    !!m && /\n/.test(span) && q.ok, errorsOf(q));
}
refuses("refuses a real quote attributed to the wrong source", mutated((v) => {
  v.report.improves[0].citations[0].source = "G2";
}));
refuses("refuses a trivial citation quote", mutated((v) => {
  v.report.improves[0].citations[0].quote = "short";
}));
refuses("refuses an empty claim", mutated((v) => { v.report.improves[0].claim = "  "; }));
refuses("refuses more than four citations on one claim", mutated((v) => {
  const citation = v.report.improves[0].citations[0];
  v.report.improves[0].citations = [citation, citation, citation, citation, citation];
}));
["improves", "corpusSupport", "conflicts"].forEach((group) => {
  refuses("refuses more than six claims in " + group, mutated((v) => {
    v.report[group] = Array.from({ length: 7 }, () => copy(v.report.improves[0]));
  }));
});
refuses("refuses a confidence percentage in report text", mutated((v) => {
  v.report.improves[0].claim = "This rewrite is 95% confidence rated.";
}));
refuses("refuses an unsupported operation", mutated((v) => { v.op.op = "quiz-add"; }));
refuses("refuses a cross-section operation", mutated((v) => { v.op.section = OTHER_SECTION; }));
refuses("refuses an anchor outside the requested section", mutated((v) => {
  v.op.oldText = other[0].raw;
}));
refuses("refuses a missing anchor", mutated((v) => { v.op.oldText = ""; }));
refuses("refuses an invented anchor", mutated((v) => {
  v.op.oldText = "<p>This anchor does not exist anywhere in the real guide.</p>";
}));
refuses("refuses a duplicate anchor even when the wording is real", candidate(), {
  html: html + "\n" + anchor, section: SECTION, corpus: corpus
});
refuses("refuses a script in the replacement paragraph", mutated((v) => {
  v.op.newText = "<p><script>window.bad=true</script> enough unsafe replacement text</p>";
}));
refuses("refuses an event handler in the replacement paragraph", mutated((v) => {
  v.op.newText = '<p onclick="window.bad=true">enough unsafe replacement text for refusal</p>';
}));
refuses("refuses multiple replacement paragraphs", mutated((v) => {
  v.op.newText = "<p>first replacement paragraph with enough words</p><p>second forbidden paragraph</p>";
}));
refuses("refuses a javascript URI in the replacement paragraph", mutated((v) => {
  v.op.newText = '<p><a href="javascript:bad()">an unsafe replacement link with enough words</a></p>';
}));

/* Prove each hostile fixture really trips the detector it is meant to test. */
const BAN_CASES = [
  { id: "detection-performance", text: "The system detects a 1 m target at 40 m every time." },
  { id: "unsourced-price-or-regulation", text: "The price is CA$99 for this component." },
  { id: "flying-near-a-wildfire", text: "Fly the drone near a wildfire to inspect the flames." },
  { id: "certification-or-approval-claim", text: "This build is certified for flight operations." },
  { id: "edit-without-approval", text: "I have edited the guide for you." }
];
BAN_CASES.forEach((ban) => {
  check("ban fixture is live: " + ban.id,
    BANS.screenText(ban.text).hits.some((hit) => hit.id === ban.id));
  refuses("ban family refuses report text: " + ban.id, mutated((v) => {
    v.report.improves[0].claim = ban.text;
  }));
  refuses("ban family refuses the proposed paragraph: " + ban.id, mutated((v) => {
    v.op.newText = "<p>" + ban.text + " This adds enough safe-length text to the fixture.</p>";
  }));
});


/* ---- review regressions: fields are screened independently ---------------- */
refuses("a certified claim cannot borrow not-certified allowance from another field", mutated((v) => {
  v.report.improves[0].claim = "This build is certified for flight operations.";
  v.report.corpusSupport[0].claim = "This build is not certified.";
}));
const hostileQuoteCorpus = {
  guide: corpus.guide,
  domain: [{ id: "D1", label: "hostile quote fixture",
    text: "This build is certified for flight operations." }]
};
refuses("a banned citation quote cannot borrow allowance from a claim", mutated((v) => {
  v.report.corpusSupport[0].claim = "This build is not certified.";
  v.report.corpusSupport[0].citations[0].quote = "This build is certified for flight operations.";
}), { html: html, section: SECTION, corpus: hostileQuoteCorpus });
const negatedQuoteCorpus = {
  guide: corpus.guide,
  domain: [{ id: "D1", label: "negated quote fixture",
    text: "This build is not certified for flight operations." }]
};
const negatedQuote = SUGGEST.validateSuggestion(mutated((v) => {
  v.report.corpusSupport[0].citations[0].quote = "This build is not certified for flight operations.";
}), { html: html, section: SECTION, corpus: negatedQuoteCorpus });
check("a legitimate negated source quotation remains valid", negatedQuote.ok === true, errorsOf(negatedQuote));
[
  ["qualitative confidence", "Confidence: high"],
  ["qualitative certainty", "This is certainly an improvement."],
  ["quantitative likelihood", "This rewrite is 80% likely to be better."],
  ["self-graded verification", "Verified: true"]
].forEach((fixture) => {
  refuses("refuses " + fixture[0] + " in a report claim", mutated((v) => {
    v.report.improves[0].claim = fixture[1];
  }));
});
const judgementQuoteCorpus = {
  guide: corpus.guide,
  domain: [{ id: "D1", label: "judgement quote fixture",
    text: "Confidence: high; certainly; 80% likely; Verified: true" }]
};
const judgementQuote = SUGGEST.validateSuggestion(mutated((v) => {
  v.report.corpusSupport[0].citations[0].quote = "Confidence: high; certainly; 80% likely; Verified: true";
}), { html: html, section: SECTION, corpus: judgementQuoteCorpus });
check("source quotations are not rejected for discussing confidence or verification",
  judgementQuote.ok === true, errorsOf(judgementQuote));

/* ---- process and HTTP helpers; every child is owned by this suite --------- */
const procs = [];
const servers = [];
function stopTree(p) {
  if (!p || !p.pid) { return; }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    try { p.kill("SIGTERM"); } catch (e) { /* already gone */ }
  }
}
function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port || 0, "127.0.0.1", () => resolve(server.address().port));
  });
}
function closeHttp(server) {
  return new Promise((resolve) => {
    if (!server || !server.listening) { resolve(); return; }
    if (typeof server.closeAllConnections === "function") { server.closeAllConnections(); }
    server.close(() => resolve());
  });
}
async function freePort() {
  const server = http.createServer();
  const port = await listen(server, 0);
  await closeHttp(server);
  return port;
}
async function waitFor(url, tries) {
  for (let i = 0; i < (tries || 100); i += 1) {
    try { const r = await fetch(url); if (r.ok) { return true; } } catch (e) { /* not up */ }
    await sleep(100);
  }
  return false;
}
async function postRaw(port, urlPath, raw, headers) {
  const response = await fetch("http://127.0.0.1:" + port + urlPath, {
    method: "POST", headers: headers || {}, body: raw, signal: AbortSignal.timeout(12000)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* deliberately non-JSON */ }
  return { status: response.status, json: json, text: text, headers: response.headers };
}
function post(port, urlPath, body, headers) {
  return postRaw(port, urlPath, JSON.stringify(body), Object.assign({
    "content-type": "application/json"
  }, headers || {}));
}
function startApp(port, extra) {
  const child = spawn(process.execPath, ["server/assistant-server.js"], {
    cwd: CLONE, windowsHide: true, stdio: "ignore",
    env: Object.assign({}, process.env, {
      PORT: String(port), PROVIDER: "openai", BASE_URL: providerBase,
      MODEL: "mock-model", API_KEY: "test-key-not-real", GA_TEST: "1",
      OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "",
      BIND: "127.0.0.1", ALLOW_WRITE: "0", GA_WRITE_TOKEN: "",
      SETTINGS_FILE: path.join(TMP, "settings-" + port + ".json"),
      CACHE: "off", CACHE_FILE: path.join(TMP, "cache-" + port + ".json"),
      CONVERSATIONS_DIR: path.join(TMP, "conversations-" + port),
      DAILY_USD_MAX: "0"
    }, extra || {})
  });
  procs.push(child);
  return child;
}

/* ---- an observable OpenAI-compatible mock, with no real credentials ------- */
const provider = { calls: 0, prompts: [], server: null, port: 0 };
let providerBase = "";
function quizFixture() {
  return [{
    q: "Roughly how much ground does one pixel cover at 30 m with the 55 degree lens? (" + NONCE + ")",
    a: ["About 10 cm", "About 1 m", "About 10 m", "About 30 m"], c: 1,
    why: "2 x 30 m x tan(27.5 deg) is about 31.2 m across; over 32 pixels that is about 0.98 m.",
    citation: {
      source: "docs/domain/01-thermal-detection-limits.md", verified: "2026-11-01",
      mustContain: "0.98 m per pixel"
    },
    level: 3
  }];
}
async function startProvider() {
  provider.server = http.createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
      return;
    }
    if (req.url !== "/v1/chat/completions" || req.method !== "POST") {
      res.writeHead(404); res.end(); return;
    }
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw); } catch (e) { /* counted as a bad request below */ }
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const user = messages.filter((m) => m.role === "user").pop() || {};
      const content = String(user.content || "");
      provider.calls += 1;
      provider.prompts.push(content);
      if (/provider failure/i.test(content)) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "injected provider failure" }));
        return;
      }
      let payload;
      if (/JSON array/i.test(content) && !/GUIDE CORPUS/.test(content)) {
        payload = JSON.stringify(quizFixture());
      } else if (/refuse candidate/i.test(content)) {
        payload = "RAW_MODEL_LEAK_7f39 " + JSON.stringify(candidate());
      } else if (/validation leak/i.test(content)) {
        const invalid = candidate();
        invalid.op.section = "RAW_VALIDATION_LEAK_91c2";
        payload = JSON.stringify(invalid);
      } else if (/malformed candidate/i.test(content)) {
        payload = '{"op":';
      } else {
        payload = JSON.stringify(candidate());
      }
      const budget = /budget probe/i.test(content);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        choices: [{ message: { role: "assistant", content: payload } }],
        usage: budget ? { prompt_tokens: 100000, completion_tokens: 10000 } :
          { prompt_tokens: 10, completion_tokens: 10 }
      }));
    });
  });
  servers.push(provider.server);
  provider.port = await listen(provider.server, 0);
  providerBase = "http://127.0.0.1:" + provider.port + "/v1";
}

async function runSuite() {
  const outerBefore = treeState(ROOT);
  try {
    const invalid = mutated((v) => { v.op.section = "RAW_VALIDATION_LEAK_91c2"; });
    const refusal = await SUGGEST.suggest(
      { sentence: "Make this clearer", section: SECTION },
      { html: html, domain: domain }, async () => JSON.stringify(invalid));
    check("the async helper returns a fixed validation refusal without model values",
      refusal.ok === false && refusal.error === "The suggestion was refused by the validation checks." &&
      !/RAW_VALIDATION_LEAK_91c2/.test(JSON.stringify(refusal)), errorsOf(refusal));

    const client = fs.readFileSync(path.join(ROOT, "docs", "js", "assistant.js"), "utf8");
    const renderBlock = client.slice(client.indexOf("function renderSuggestion"), client.indexOf("/* ---------- markdown-lite"));
    const rejectMatch = /reject\.addEventListener\("click", function \(\) \{([\s\S]*?)\n    \}\);/.exec(client);
    const acceptBlock = client.slice(client.indexOf("function acceptSuggestion"), client.indexOf("function looksLikeEdit"));
    const suggestBlock = client.slice(client.indexOf("function suggestEdit"), client.indexOf("function curatedAnswer"));
    check("the page exposes Suggest an edit and builds report cards without innerHTML",
      /id = "ga-suggest"/.test(client) && !!renderBlock && !/innerHTML/.test(renderBlock));
    check("Reject is local-only, disables both actions, and persists dismissal",
      !!rejectMatch && !/fetch|syncThread|propose|acceptSuggestion/.test(rejectMatch[1]) &&
      /dismissed/.test(rejectMatch[1]) && /accept\.disabled = true/.test(rejectMatch[1]) &&
      /reject\.disabled = true/.test(rejectMatch[1]) && /persist\(true\)/.test(rejectMatch[1]));
    check("Accept posts the same structured op with write-token headers and pending disables",
      /fetch\("\/api\/propose"/.test(acceptBlock) && /body: JSON\.stringify\(\{ op: s\.op \}\)/.test(acceptBlock) &&
      /writeTokenHeaders/.test(acceptBlock) && /accept\.disabled = true/.test(acceptBlock) &&
      /reject\.disabled = true/.test(acceptBlock) && !/accept\.js|merge|publish\s*\(/.test(acceptBlock));
    check("offline suggestions stay local and reload clears pending state",
      suggestBlock.indexOf("if (!settingsAvailable())") !== -1 &&
      suggestBlock.indexOf("if (!settingsAvailable())") < suggestBlock.indexOf('fetch("/api/suggest"') &&
      /no suggestion request was sent/.test(suggestBlock) && /s\.status === "accepting"\) \{ s\.status = "ready"/.test(client));

    let r = run("git", ["clone", "--quiet", "--branch", "main", ROOT, CLONE], TMP);
    check("an isolated main clone is created for all live proposal tests", r.status === 0, r.out.slice(0, 180));
    if (r.status !== 0) { throw new Error("clone failed"); }
    /* server/memory.js and server/cost-engine.js (job 8): the server under test needs the memory module and the prices it reads */
    const FIXTURE = ["server/assistant-server.js", "server/memory.js", "server/cost-engine.js", "server/ops/suggest.js", "docs/js/assistant.js", "index.html"];
    FIXTURE.forEach((rel) => {
      fs.copyFileSync(path.join(ROOT, rel), path.join(CLONE, rel));
    });
    git(["config", "user.email", "suggest-test@example.invalid"]);
    git(["config", "user.name", "Suggestion Test"]);
    git(["add", "--"].concat(FIXTURE));
    r = git(["diff", "--cached", "--quiet"]);
    if (r.status !== 0) { r = git(["commit", "--quiet", "-m", "Item D test fixture"]); }
    check("the isolated clone has a clean Item D fixture", r.status === 0 && treeState(CLONE).status === "", r.out.slice(0, 180));
    if (r.status !== 0) { throw new Error("fixture commit failed"); }
    const cloneBefore = treeState(CLONE);

    await startProvider();
    const port = await freePort();
    startApp(port);
    check("the suggest test server starts against the mock provider",
      await waitFor("http://127.0.0.1:" + port + "/api/health"));
    const request = { sentence: "Make the pipeline clearer", section: SECTION };

    r = await postRaw(port, "/api/suggest", "{}", { "content-type": " Application/JSON ; charset=utf-8" });
    check("JSON media type parsing normalizes case, whitespace, and parameters", r.status === 400);
    for (const type of ["application/jsonp", "text/plain; application/json", "application/json+lookalike"]) {
      r = await postRaw(port, "/api/suggest", JSON.stringify(request), { "content-type": type });
      check("rejects non-JSON media type: " + type, r.status === 415);
    }
    for (const value of [null, [], "not an object"]) {
      r = await post(port, "/api/suggest", value);
      check("rejects a non-object JSON request: " + JSON.stringify(value), r.status === 400);
    }
    for (const value of [null, []]) {
      r = await post(port, "/api/suggest", { sentence: value, section: SECTION });
      check("rejects a non-string sentence: " + JSON.stringify(value), r.status === 400);
      r = await post(port, "/api/suggest", { sentence: "Make this clearer", section: value });
      check("rejects a non-string section: " + JSON.stringify(value), r.status === 400);
    }
    r = await post(port, "/api/suggest", { sentence: "  ", section: SECTION });
    check("rejects an empty suggestion instruction", r.status === 400);
    r = await post(port, "/api/suggest", { sentence: "Make this clearer", section: "p-not-real" });
    check("rejects an unknown editable section", r.status === 400);
    r = await postRaw(port, "/api/suggest", "{bad json", { "content-type": "application/json" });
    check("rejects malformed request JSON", r.status === 400);
    r = await postRaw(port, "/api/suggest", " ".repeat(16385), { "content-type": "application/json" });
    check("rejects a suggest body over 16 KiB", r.status === 413);
    const callsBeforeOrigin = provider.calls;
    r = await post(port, "/api/suggest", request, { origin: "https://hostile.example" });
    check("the suggest route enforces the Origin/Host rule without calling the model",
      r.status === 403 && provider.calls === callsBeforeOrigin);

    const callsBeforeValid = provider.calls;
    r = await post(port, "/api/suggest", request);
    check("a valid live request returns the exact validated operation and report",
      r.status === 200 && isDeepStrictEqual(r.json, expectedResult()),
      "op=" + (JSON.stringify(r.json && r.json.op) === JSON.stringify(expectedResult().op)) +
      " report=" + (JSON.stringify(r.json && r.json.report) === JSON.stringify(expectedResult().report)) +
      " keys=" + Object.keys(r.json || {}).join(",") + " " + r.text.slice(0, 160));
    check("a valid live request calls the mock model exactly once", provider.calls === callsBeforeValid + 1);
    check("a valid live prompt contains only the selected guide section and curated evidence",
      provider.prompts.length > 0 && provider.prompts[provider.prompts.length - 1].indexOf(other[0].raw) === -1 &&
      provider.prompts[provider.prompts.length - 1].indexOf(anchor) !== -1);
    check("suggest performs no source write, git write, branch creation, or main movement",
      sameTree(cloneBefore, treeState(CLONE)));

    r = await post(port, "/api/suggest", { sentence: "validation leak", section: SECTION });
    check("route validation refusal is fixed and never reflects model-controlled values",
      r.status === 200 && r.json && r.json.ok === false &&
      r.json.error === "The suggestion was refused by the validation checks." &&
      !/RAW_VALIDATION_LEAK_91c2/.test(r.text), r.text.slice(0, 180));
    r = await post(port, "/api/suggest", { sentence: "refuse candidate", section: SECTION });
    check("unusable model output is refused without returning raw model text",
      r.status === 200 && r.json && r.json.ok === false && !/RAW_MODEL_LEAK_7f39/.test(r.text));
    r = await post(port, "/api/suggest", { sentence: "malformed candidate", section: SECTION });
    check("malformed provider JSON receives a plain suggestion refusal",
      r.status === 200 && r.json && r.json.ok === false && /usable JSON object/.test(r.json.error || ""));
    const failurePort = await freePort();
    startApp(failurePort);
    check("a provider-failure fixture server starts", await waitFor("http://127.0.0.1:" + failurePort + "/api/health"));
    r = await post(failurePort, "/api/suggest", { sentence: "provider failure", section: SECTION });
    check("provider failure is generic and leaks no provider body, prompt, key, or reasoning",
      r.status === 502 && r.json && r.json.error === "The suggestion provider failed. No suggestion was returned." &&
      !/injected|test-key-not-real|GUIDE CORPUS|reasoning/i.test(r.text), r.text.slice(0, 180));

    const noKeyPort = await freePort();
    startApp(noKeyPort, { API_KEY: "", BASE_URL: "https://provider.invalid/v1" });
    check("a no-key fixture server starts", await waitFor("http://127.0.0.1:" + noKeyPort + "/api/health"));
    r = await post(noKeyPort, "/api/suggest", request);
    check("missing provider credentials return 501", r.status === 501);

    const budgetPort = await freePort();
    startApp(budgetPort, { DAILY_USD_MAX: "0.01" });
    check("a budget fixture server starts", await waitFor("http://127.0.0.1:" + budgetPort + "/api/health"));
    r = await post(budgetPort, "/api/suggest", { sentence: "budget probe", section: SECTION });
    check("the budget fixture records its mock provider cost", r.status === 200 && r.json && r.json.ok === true);
    const callsBeforeBlocked = provider.calls;
    r = await post(budgetPort, "/api/suggest", request);
    check("a spent budget returns 402 without another provider call",
      r.status === 402 && provider.calls === callsBeforeBlocked);

    /* Accept is the existing proposal route, tested only in this isolated clone. */
    r = await post(port, "/api/propose", { op: OP });
    const acceptedSlug = r.json && r.json.proposal && r.json.proposal.slug;
    check("Accept creates a proposal through the existing prose operation route",
      r.status === 200 && r.json && r.json.ok === true && acceptedSlug === "proposal/prose-rewrite-p-build-1",
      r.text.slice(0, 220));
    let after = treeState(CLONE);
    check("Accept leaves main, its HEAD, and the working source unchanged",
      after.head === cloneBefore.head && after.branch === "main" && after.status === "" && after.index === cloneBefore.index);
    check("Accept creates only the proposal branch with the returned operation",
      after.branches.length === 1 && after.branches[0] === acceptedSlug &&
      gitOut(["show", acceptedSlug + ":index.html"]).indexOf(NEW_TEXT) !== -1 &&
      gitOut(["show", acceptedSlug + ":index.html"]).indexOf(anchor) === -1);
    const cacheDir = path.join(CLONE, "server", ".cache");
    check("Accept removes its temporary structured operation file",
      !fs.existsSync(cacheDir) || fs.readdirSync(cacheDir).every((name) => !/^suggest-op-.*\.json$/.test(name)));

    const noFlagPort = await freePort();
    startApp(noFlagPort, { BIND: "0.0.0.0" });
    check("a reachable no-flag Accept fixture starts", await waitFor("http://127.0.0.1:" + noFlagPort + "/api/health"));
    const branchesBeforeGates = branches(CLONE).length;
    r = await post(noFlagPort, "/api/propose", { op: OP });
    check("Accept obeys the explicit write-flag gate without creating a branch",
      r.status === 403 && branches(CLONE).length === branchesBeforeGates);
    const noTokenPort = await freePort();
    startApp(noTokenPort, { BIND: "0.0.0.0", ALLOW_WRITE: "1", GA_WRITE_TOKEN: "" });
    check("a reachable no-token Accept fixture starts", await waitFor("http://127.0.0.1:" + noTokenPort + "/api/health"));
    r = await post(noTokenPort, "/api/propose", { op: OP });
    check("Accept obeys the configured-token gate without creating a branch",
      r.status === 403 && branches(CLONE).length === branchesBeforeGates);

    const token = "suggest-test-token";
    const gatedPort = await freePort();
    startApp(gatedPort, { BIND: "0.0.0.0", ALLOW_WRITE: "1", GA_WRITE_TOKEN: token });
    check("a reachable token-gated Accept fixture starts", await waitFor("http://127.0.0.1:" + gatedPort + "/api/health"));
    r = await post(gatedPort, "/api/propose", { op: OP });
    check("Accept refuses a missing write token", r.status === 401 && branches(CLONE).length === branchesBeforeGates);
    r = await post(gatedPort, "/api/propose", { op: OP }, { "x-write-token": "wrong" });
    check("Accept refuses a wrong write token", r.status === 401 && branches(CLONE).length === branchesBeforeGates);
    const remoteOp = copy(OP);
    remoteOp.newText = NEW_TEXT.replace("</p>", " The token gate passed.</p>");
    r = await post(gatedPort, "/api/propose", { op: remoteOp }, { "x-write-token": token });
    check("the correct write token permits only another review proposal",
      r.status === 200 && r.json && r.json.ok === true && branches(CLONE).length === branchesBeforeGates + 1 &&
      treeState(CLONE).head === cloneBefore.head && treeState(CLONE).branch === "main", r.text.slice(0, 180));

    const branchesBeforeSentence = branches(CLONE).length;
    r = await post(port, "/api/propose", { sentence: "add 1 harder detect questions" });
    check("the existing sentence-based proposal path still creates a quiz proposal",
      r.status === 200 && r.json && r.json.ok === true && r.json.job && r.json.job.op === "quiz-add" &&
      branches(CLONE).length === branchesBeforeSentence + 1, r.text.slice(0, 220));
    after = treeState(CLONE);
    check("all proposal paths finish on clean main with the original HEAD and source",
      after.head === cloneBefore.head && after.branch === "main" && after.status === "" && after.index === cloneBefore.index);
    check("the suite never changes the outer repository state", sameTree(outerBefore, treeState(ROOT)));
  } catch (err) {
    check("the suggestion integration suite ran without throwing", false,
      String(err && err.stack ? err.stack : err).slice(0, 500));
  } finally {
    procs.forEach(stopTree);
    for (const server of servers) { await closeHttp(server); }
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log("");
  if (bad) {
    console.log(bad + " of " + total + " suggestion checks failed.");
    process.exitCode = 1;
  } else {
    console.log(total + " suggestion checks passed; all child processes and temporary files cleaned up.");
  }
}

runSuite();

