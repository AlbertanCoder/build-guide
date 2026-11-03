#!/usr/bin/env node
/*
 * Refresh the shop snapshot (price, stock, date checked) in the guide's buy-data block.
 *
 *   node scripts/standalone/refresh-stock.js            # check only: print what the shops say, change nothing
 *   node scripts/standalone/refresh-stock.js --write    # write status, stock note and date back into index.html
 *   node scripts/standalone/refresh-stock.js --write --backups   # also check each line's backup page
 *
 * The public site cannot check live, so the page shows this as a dated snapshot and warns
 * when a check is more than 3 days old. Run this before you buy.
 *
 * What it reads:
 *   Rotor Village, Abra Electronics: the page's own product data (price, availability) and the stock text.
 *   PiShop: the page's IN STOCK / Out of stock marker and price.
 *   Anything else (Walmart blocks automated checks, SparkFun and others): left as "not checked"
 *   unless the page gives a clear answer.
 * It never changes a price in the file by itself: a price that differs from the file is printed as a
 * MISMATCH so a person decides.
 *
 * Standard library only (Node 18+ for fetch).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const INDEX = path.resolve(__dirname, "..", "..", "index.html");
const WRITE = process.argv.includes("--write");
const BACKUPS = process.argv.includes("--backups");
const OPEN = '<script type="application/json" id="buy-data">';
const CLOSE = "</script>";
const UA = "Mozilla/5.0 (compatible; guide-stock-check/1.0)";

function todayIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-CA" }, redirect: "follow" });
  const text = await res.text();
  return { code: res.status, text, finalUrl: res.url };
}

function ldProduct(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const j = JSON.parse(m[1]);
      const list = Array.isArray(j) ? j : [j];
      for (const o of list) {
        if (o && o["@type"] === "Product") {
          const of = Array.isArray(o.offers) ? o.offers[0] : o.offers;
          return {
            name: o.name,
            price: of && of.price !== undefined ? Number(of.price) : null,
            availability: of && of.availability ? String(of.availability).split("/").pop() : null
          };
        }
      }
    } catch (e) { /* not JSON we understand */ }
  }
  return null;
}

/* Returns { status: in_stock|low|out|unknown, stockNote, price, name } */
function parse(host, html) {
  const out = { status: "unknown", stockNote: "", price: null, name: null };
  const ld = ldProduct(html);
  if (ld) { out.price = ld.price; out.name = ld.name; }
  let availability = ld && ld.availability;
  if (!availability) {
    const m = html.match(/"availability"\s*:\s*"[^"]*?(InStock|OutOfStock|PreOrder|SoldOut|BackOrder)"/i);
    if (m) availability = m[1];
  }
  if (host.endsWith("rotorvillage.ca")) {
    const sm = html.match(/class="productView-stockStatus[^"]*">\s*([^<]+?)\s*</);
    const note = sm ? sm[1].replace(/\s+/g, " ") : "";
    if (/^only \d+ left/i.test(note)) { out.status = "low"; out.stockNote = note.replace(/^./, (c) => c.toUpperCase()); }
    else if (/\d+ in stock/i.test(note)) { out.status = "in_stock"; out.stockNote = note; }
    else if (availability === "InStock") { out.status = "in_stock"; out.stockNote = "In stock"; }
    else if (availability) { out.status = "out"; out.stockNote = "Out of stock"; }
  } else if (host.endsWith("pishop.ca")) {
    if (out.price === null) {
      const pm = html.match(/price--withoutTax">\s*\$?([\d.,]+)/);
      if (pm) out.price = Number(pm[1].replace(/,/g, ""));
    }
    if (/>\s*IN STOCK\s*</i.test(html)) { out.status = "in_stock"; out.stockNote = "In stock"; }
    else if (/Notify Me/i.test(html) || availability === "OutOfStock") { out.status = "out"; out.stockNote = "Out of stock"; }
  } else if (host.endsWith("abra-electronics.com")) {
    if (availability === "InStock") { out.status = "in_stock"; out.stockNote = "In stock"; }
    else if (availability) { out.status = "out"; out.stockNote = "Out of stock"; }
  } else if (availability) {
    if (availability === "InStock") { out.status = "in_stock"; out.stockNote = "In stock"; }
    else { out.status = "out"; out.stockNote = "Out of stock"; }
  }
  return out;
}

function skip(url) {
  if (!url) return "no link";
  if (/walmart\.ca/.test(url)) return "Walmart blocks automated checks";
  if (/amazon\./.test(url)) return "Amazon blocks automated checks";
  if (/canadiantire\.ca|getfpv\.com/.test(url)) return "this shop blocks automated checks (open it by hand)";
  if (/tc\.canada\.ca/.test(url)) return "fee page, not a shop";
  if (/search/.test(url)) return "search page, not a product";
  return null;
}

async function checkOne(label, url, expectUnit, usd) {
  const why = skip(url);
  if (why) return { label, url, skipped: why };
  let r;
  try { r = await get(url); } catch (e) { return { label, url, error: String(e.message || e) }; }
  if (r.code !== 200) return { label, url, error: "HTTP " + r.code };
  const host = new URL(r.finalUrl).hostname;
  const p = parse(host, r.text);
  p.label = label; p.url = url; p.code = r.code;
  if (expectUnit !== undefined && !usd && p.price !== null && Math.abs(p.price - expectUnit) > 0.005) {
    p.mismatch = "page price " + p.price + " vs file " + expectUnit;
  }
  return p;
}

(async function main() {
  const raw = fs.readFileSync(INDEX, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const a = raw.indexOf(OPEN);
  const b = raw.indexOf(CLOSE, a);
  if (a < 0 || b < 0) { console.error("buy-data block not found in index.html"); process.exit(1); }
  const data = JSON.parse(raw.slice(a + OPEN.length, b));
  const today = todayIso();
  let problems = 0;

  console.log("Checking " + data.lines.length + " lines on " + today + (WRITE ? " (will write)" : " (check only)"));
  for (const line of data.lines) {
    const r = await checkOne(line.item, line.url, line.unit, line.usd);
    await sleep(1500);
    let tag;
    if (r.skipped) { tag = "SKIP  " + r.skipped; }
    else if (r.error) { tag = "ERROR " + r.error; problems += 1; }
    else {
      tag = r.status.toUpperCase().padEnd(9) + (r.stockNote || "").padEnd(14) + (r.name ? "[" + r.name.slice(0, 52) + "]" : "") + (r.mismatch ? "  MISMATCH: " + r.mismatch : "");
      if (r.mismatch) problems += 1;
      if (r.status !== "unknown") {
        line.status = r.status; line.stockNote = r.stockNote; line.checkedOn = today;
      }
    }
    console.log("  " + line.shop.padEnd(18) + line.item.slice(0, 46).padEnd(48) + tag);

    if (BACKUPS && line.backup && line.backup.url) {
      const rb = await checkOne(line.item + " (backup)", line.backup.url);
      await sleep(1500);
      let btag;
      if (rb.skipped) btag = "SKIP  " + rb.skipped;
      else if (rb.error) { btag = "ERROR " + rb.error; problems += 1; }
      else {
        btag = rb.status.toUpperCase() + " " + (rb.stockNote || "") + (rb.price !== null ? "  price " + rb.price : "") + (rb.name ? "  [" + rb.name.slice(0, 40) + "]" : "");
        if (rb.status !== "unknown") { line.backup.status = rb.status; line.backup.checkedOn = today; }
      }
      console.log("      backup " + line.backup.shop.padEnd(14) + btag);
    }
  }

  if (WRITE) {
    const body = JSON.stringify(data, null, 1).replace(/<\//g, "<\\/").replace(/\n/g, nl);
    const next = raw.slice(0, a + OPEN.length) + nl + body + nl + "    " + raw.slice(b);
    fs.writeFileSync(INDEX, next);
    console.log("Wrote " + path.relative(process.cwd(), INDEX));
  }
  console.log(problems ? problems + " problem(s) to look at." : "No problems.");
  process.exit(problems ? 2 : 0);
})();
