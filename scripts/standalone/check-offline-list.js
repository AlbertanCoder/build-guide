#!/usr/bin/env node
/*
 * Check that every file the offline service worker (sw.js) pre-caches exists, and that every file the
 * page loads at runtime (scripts, models, step pictures, importmap files) is on that list.
 *
 *   node scripts/standalone/check-offline-list.js
 *
 * Exits 1 on any miss. Run it after adding a model, script or picture.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const block = sw.slice(sw.indexOf("const PRECACHE = ["), sw.indexOf("];", sw.indexOf("const PRECACHE = [")));
const listed = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "./");

let bad = 0;
for (const f of listed) {
  if (!fs.existsSync(path.join(ROOT, f))) { console.log("MISSING on disk: " + f); bad += 1; }
}

const used = new Set();
for (const m of html.matchAll(/(?:src|href|data-model)="((?:docs\/[^"]+|shad-drone-icon\.svg|manifest\.webmanifest))"/g)) used.add(m[1]);
for (const m of html.matchAll(/"(\.\/docs\/vendor\/[^"]+)"/g)) used.add(m[1].replace(/^\.\//, ""));
/* the importmap folder: list the files in it that the viewer may import */
const vendor = [];
(function walk(d) {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const rel = d + "/" + e.name;
    if (e.isDirectory()) walk(rel); else if (/\.js$/.test(e.name)) vendor.push(rel);
  }
})("docs/vendor/three");
vendor.forEach((v) => used.add(v));

for (const u of used) {
  if (u.endsWith("/")) continue;                                             /* a folder entry in the importmap */
  if (/\.md$/.test(u) || /^docs\/images\/(?!build\/)/.test(u)) continue;     /* not needed to run the page */
  if (!listed.includes(u)) { console.log("NOT PRE-CACHED: " + u); bad += 1; }
}
console.log(listed.length + " files pre-cached, " + used.size + " files the page uses" + (bad ? ", " + bad + " problem(s)" : ", all matched"));
process.exit(bad ? 1 : 0);
