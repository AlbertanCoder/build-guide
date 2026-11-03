#!/usr/bin/env node
/*
 * Check that every web link in index.html (page text and the buy-data list, backups included) opens.
 *
 *   node scripts/standalone/check-links.js
 *
 * Prints one line per link: OK, or the HTTP status, or the error. Links on shops that block
 * automated requests (Walmart, Amazon, Canadian Tire, GetFPV) are listed as NOT CHECKABLE: open those
 * by hand. A link that opens is not proof the item is in stock; use refresh-stock.js for stock.
 * Local links (the order list, the payload folder) are checked for the file's existence.
 *
 * Standard library only (Node 18+ for fetch). One request at a time, 1 s apart.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const BLOCKS = /walmart\.ca|amazon\.|canadiantire\.ca|getfpv\.com/;

const urls = new Set();
for (const m of html.matchAll(/https?:\/\/[^\s"'<>\\)]+/g)) {
  const u = m[0].replace(/[.,;]+$/, "").replace(/&amp;/g, "&");
  if (/127\.0\.0\.1|localhost|example\.com|w3\.org|schema\.org/.test(u)) continue;
  urls.add(u);
}
const local = new Set();
for (const m of html.matchAll(/href="([^"#:]+\.(?:md|html|py|svg))"/g)) local.add(m[1]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async function main() {
  let bad = 0;
  for (const f of local) {
    const ok = fs.existsSync(path.join(ROOT, decodeURIComponent(f)));
    console.log((ok ? "OK    " : "MISSING ") + "local " + f);
    if (!ok) bad += 1;
  }
  for (const u of urls) {
    if (BLOCKS.test(u)) { console.log("NOT CHECKABLE (shop blocks scripts)  " + u); continue; }
    try {
      const res = await fetch(u, { headers: { "User-Agent": "guide-link-check/1.0" }, redirect: "follow" });
      const ok = res.status >= 200 && res.status < 400;
      console.log((ok ? "OK    " : String(res.status).padEnd(6)) + u);
      if (!ok) bad += 1;
    } catch (e) {
      console.log("ERROR " + String(e.message || e).slice(0, 60) + "  " + u);
      bad += 1;
    }
    await sleep(1000);
  }
  console.log(bad ? bad + " link(s) need a look." : "All checkable links open.");
  process.exit(bad ? 2 : 0);
})();
