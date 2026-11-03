// Unit checks for server/cost-engine.js. No server, no key, no network.
//
//   node scripts/dev/check-cost-engine.js
//
// The point of these checks is that the engine's savings are *measured*, not
// asserted in a README: characters actually dropped, the meter actually adds up,
// and the cache actually returns the same answer without a provider call.
const os = require("os");
const fs = require("fs");
const path = require("path");
const eng = require("../../server/cost-engine.js");

let bad = 0;
function check(name, ok, detail) {
  if (!ok) bad += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

/* ---- signature: order and punctuation must not matter -------------------- */
check(
  "signature ignores word order and punctuation",
  eng.signature("What does this cost?") === eng.signature("cost what does this"),
  eng.signature("What does this cost?")
);
check(
  "signature ignores a trailing full stop and capitals",
  eng.signature("Is the frame in stock.") === eng.signature("is the frame in stock")
);

/* ---- the cache is intentionally conservative ----------------------------- */
const s1 = eng.signature("what does this cost");
const s2 = eng.signature("how much does it cost");
check(
  "a question that only adds filler words is the same signature",
  s1 === eng.signature("what does this cost then"),
  "sig=" + s1
);
check(
  "adding a real word drops below the 0.85 near-dupe threshold (by design)",
  eng.jaccard(s1.split(" "), s2.split(" ")) < 0.85,
  "jaccard=" + eng.jaccard(s1.split(" "), s2.split(" ")).toFixed(2)
);

/* ---- compression actually removes characters ----------------------------- */
const long =
  "The thermal camera is a Pimoroni MLX90640 breakout on 3.3V I2C at address 0x33. " +
  "It reports 768 temperatures per frame. If the image looks noisy or speckled at 8 Hz, " +
  "the I2C link is being asked for more frames than it can carry. Set REFRESH_2_HZ in the " +
  "payload configuration and restart the service. Do not raise the I2C clock to fix this. " +
  "Also remember that the sensor is 3.3V only and that the lens must face down.";
const out = eng.compressPassages(
  [{ label: "Step 6", tab: "steps", step: 6, text: long }],
  "the image is noisy at 8 hz",
  { perPassageChars: 400, totalChars: 600, maxCount: 3 }
);
const kept = out.passages[0] ? out.passages[0].text : "";
check(
  "compression drops characters",
  kept.length > 0 && kept.length < long.length,
  long.length + " -> " + kept.length
);
check(
  "compression keeps the sentence that answers the question",
  /REFRESH_2_HZ/.test(kept),
  kept.slice(0, 60)
);

/* ---- near-identical passages are sent once ------------------------------- */
const dupA = { label: "A", tab: "steps", text: long };
const dupB = { label: "B", tab: "steps", text: long };
check("duplicate passages are collapsed", eng.dedupePassages([dupA, dupB]).length === 1);

check("an OpenRouter model id (maker/model:variant) is priced like the bare model, not the cheap default",
  eng.priceFor("anthropic/claude-sonnet-5.5") === eng.PRICES["claude-sonnet-5.5"] &&
  eng.priceFor("anthropic/claude-sonnet-5.5:beta") === eng.PRICES["claude-sonnet-5.5"] &&
  eng.priceFor("someone/unlisted-model") === eng.PRICES.__default);

/* ---- history shrinks to a recap plus the last turns ---------------------- */
const history = [];
for (let i = 0; i < 6; i += 1) {
  history.push({ role: "user", content: "question number " + i });
  history.push({ role: "assistant", content: "answer number " + i });
}
const hist = eng.compressHistory(history, { keepTurns: 2, charCap: 200 });
check("history is compressed", hist.length <= 3, hist.length + " entries from " + history.length);
check("history keeps a recap of earlier questions", /Earlier questions:/.test(hist[0].content));

/* ---- the router picks the cheap tier by default -------------------------- */
check(
  "curated entry -> cheap tier",
  eng.routeDecision({ question: "what does this cost", curatedHit: true, topScore: 9 }).tier === "cheap"
);
check(
  "multi-hop question -> strong tier",
  eng.routeDecision({ question: "compare the 55 and 110 lens", topScore: 9 }).tier === "strong"
);
check(
  "low retrieval score -> strong tier",
  eng.routeDecision({ question: "weird thing", topScore: 0.4 }).tier === "strong"
);
check(
  "cheap tier refusing escalates",
  eng.routeDecision({ question: "x", topScore: 9, triedCheap: true, cheapRefused: true }).tier === "strong"
);
check("forced -> strong tier", eng.routeDecision({ forceStrong: true }).tier === "strong");

/* ---- the meter adds up at the published rates ---------------------------- */
const oneM = eng.estimateUsd("gpt-4o-mini", { inputTokens: 1000000, outputTokens: 0 });
check("gpt-4o-mini input is $0.15/MTok", Math.abs(oneM - 0.15) < 1e-9, "$" + oneM);
const lunaOut = eng.estimateUsd("gpt-6-luna", { inputTokens: 0, outputTokens: 1000000 });
check("gpt-6-luna output is $0.50/MTok", Math.abs(lunaOut - 0.5) < 1e-9, "$" + lunaOut);
const haikuRead = eng.estimateUsd("claude-haiku-5.5", { inputTokens: 1000000, cachedTokens: 1000000 });
check("claude-haiku-5.5 cache read is $0.01/MTok", Math.abs(haikuRead - 0.01) < 1e-9, "$" + haikuRead);

const meter = new eng.CostMeter({ dailyUsdMax: 0.01 });
check("meter starts unblocked", meter.blocked() === false);
meter.record("gpt-4o-mini", { inputTokens: 50000, outputTokens: 5000 });
check("meter accrues tokens", meter.snapshot().totals.inputTokens === 50000);
check("meter blocks at the daily cap", meter.blocked() === true, "usd=" + meter.snapshot().totals.usd);

/* ---- the cache returns the stored answer without a provider ------------- */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ga-cost-"));
const file = path.join(dir, "answers.json");
const cache = new eng.AnswerCache({ file: file, persist: false });
cache.set("what does this cost", { answer: "CA$1,607.26", model: "gpt-6-luna", sources: ["guide"] });
const hit = cache.get("What does this cost?");
check("cache hit returns the same answer", !!hit && hit.answer === "CA$1,607.26");
check("cache hit is marked exact", !!hit && hit.exact === true);
check("cache misses a different question", cache.get("how do i bind the receiver") === null);

cache.flush();
check("cache file was written", fs.existsSync(file));
const reloaded = new eng.AnswerCache({ file: file });
check("cache survives a restart", reloaded.get("what does this cost") !== null);

const expired = new eng.AnswerCache({ file: "", persist: false, ttlMs: -1 });
expired.set("what does this cost", { answer: "stale" });
check("expired entries are not served", expired.get("what does this cost") === null);

fs.rmSync(dir, { recursive: true, force: true });

console.log("");
if (bad) {
  console.log(bad + " check(s) failed.");
  process.exit(1);
}
console.log("Cost engine verified.");

