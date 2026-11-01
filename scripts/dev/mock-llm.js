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

const server = http.createServer((req, res) => {
  if (req.url === "/v1/models") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
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
    const text = ANSWER.replace("Passages received: ", "Passages received: " + passageCount + ".");

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive"
    });

    const chunks = text.match(/[\s\S]{1,18}/g) || [];
    let i = 0;
    const tick = () => {
      if (i >= chunks.length) {
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
