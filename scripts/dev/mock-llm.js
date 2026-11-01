/**
 * Mock OpenAI-compatible provider — for testing the assistant pipeline only.
 *
 *   node scripts/dev/mock-llm.js [port]
 *
 * Speaks just enough of the API for server/assistant-server.js: it streams a
 * canned, grounded-looking answer in several SSE chunks, including a [[NAV]]
 * directive, so the whole chain (browser -> server -> provider -> stream ->
 * render -> citations -> navigation) can be verified without an API key.
 *
 * It also echoes back how many passages it was given, which lets the test prove
 * that retrieval actually happened before the model was called.
 */
"use strict";

const http = require("http");

const PORT = Number(process.argv[2] || 8791);

/* Test instrumentation: how many times a model was actually asked, and what it
   was asked with. scripts/dev/check-cost-path.js asserts that a cache hit and a
   budget refusal both leave `calls` untouched. */
let calls = 0;
let last = null;

const ANSWER = [
  "Drop the refresh rate first: 8 Hz is faster than a marginal I2C link can service, so half-frames get dropped and the image looks speckled.",
  "",
  "1. Set `REFRESH_2_HZ` in the payload script.",
  "2. Slow the bus to 400000 Hz and shorten the Qwiic cable.",
  "3. Keep the try/except ValueError and continue, so one bad frame does not kill the run.",
  "",
  "Passages received: ",
  "[[NAV steps 6]]"
].join("\n");

/* Two canned candidates for the drafter: one that should pass every check, one
   whose "proof" is not in the corpus and must be refused. The point of the mock is
   that the SCREENING is what gets exercised, not the model. */
const MOCK_CANDIDATES = [
  {
    q: "Roughly how much ground does a single pixel cover at 30 m with the 55 degree lens?",
    a: ["About 10 cm", "About 1 m", "About 10 m", "About 30 m"],
    c: 1,
    why: "2 x 30 m x tan(27.5 deg) is about 31.2 m across; over 32 pixels that is about 0.98 m.",
    citation: { source: "docs/domain/01-thermal-detection-limits.md", verified: "2026-11-01", mustContain: "0.98 m per pixel" },
    level: 3
  },
  {
    q: "What resolution is the thermal array in megapixels?",
    a: ["0.0008 MP", "0.5 MP", "2 MP", "8 MP"],
    c: 0,
    why: "32 x 24 is 768 readings, which is under a hundredth of a megapixel.",
    citation: { source: "invented", verified: "2026-11-01", mustContain: "a phrase that is not in the corpus anywhere" },
    level: 3
  }
];

const server = http.createServer((req, res) => {
  if (req.url === "/v1/models") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
    return;
  }
  if (req.url === "/__stats") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ calls: calls, last: last }));
    return;
  }
  if (req.url === "/__reset") {
    calls = 0;
    last = null;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url !== "/v1/chat/completions" || req.method !== "POST") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  let raw = "";
  req.on("data", (c) => { raw += c; });
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(raw); } catch (e) { /* ignore */ }
    const userMsg = (body.messages || []).filter((m) => m.role === "user").pop() || {};
    const content = String(userMsg.content || "");
    const passageCount = (content.match(/^\[P\d+\]/gm) || []).length;
    const systems = (body.messages || []).filter((m) => m.role === "system").pop() || {};
    calls += 1;
    last = {
      model: String(body.model || ""),
      userChars: content.length,
      systemChars: String(systems.content || "").length,
      passageCount: passageCount,
      streamOptions: body.stream_options || null
    };

    /* A question containing "refuse" returns the exact sentence the prompt tells
       the model to use when the passages do not answer it, so the escalation
       path can be tested without a real model refusing. The strong tier answers
       properly, which is how the test proves escalation actually happened. */
    const refuse = /refuse/i.test(content) && String(body.model || "") !== "mock-strong";
    const text = refuse
      ? "That is not in this guide. Check the step 6 notes instead."
      : ANSWER.replace("Passages received: ", "Passages received: " + passageCount + ".");

    /* A non-streaming request is the drafter asking for JSON. Answer with the two
       canned candidates so /api/propose can be exercised end to end. */
    if (!body.stream) {
      const payload = /JSON array/i.test(content)
        ? JSON.stringify(MOCK_CANDIDATES)
        : ANSWER;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        choices: [{ message: { role: "assistant", content: payload } }],
        usage: { prompt_tokens: 900, completion_tokens: 260 }
      }));
      return;
    }

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive"
    });

    const chunks = text.match(/[\s\S]{1,18}/g) || [];
    let i = 0;
    const tick = () => {
      if (i >= chunks.length) {
        /* A usage frame, as OpenAI sends when stream_options.include_usage is
           set. The server bills from this, so the test proves real accounting
           instead of a character guess. */
        res.write("data: " + JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          choices: [],
          usage: {
            prompt_tokens: 1234,
            completion_tokens: 210,
            prompt_tokens_details: { cached_tokens: 1000 }
          }
        }) + "\n\n");
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      res.write("data: " + JSON.stringify({
        id: "chatcmpl-mock",
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { content: chunks[i] } }]
      }) + "\n\n");
      i += 1;
      setTimeout(tick, 4);
    };
    tick();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("mock provider listening on http://127.0.0.1:" + PORT + "/v1");
});
