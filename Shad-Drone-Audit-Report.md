# Shad's Heat-Spotting Drone — Audit & Order Plan

**Updated:** 2026-10-31  
**Guide:** `index.html` (source) and the generated standalone  
**Order document:** `Shad-Drone-Order-List.md`  
**Payload:** `Shad-Drone-Payload/`

## Result

The discontinued/unavailable components have been replaced with live alternatives. The build now has one exact order plan covering the airframe, analog FPV, thermal/GPS payload, power, tools, configuration laptop and compliance allowance. The included payload software has **19 passing synthetic tests**, a working demo and a verified map API.

This is a **source-verified build plan**, not a claim that retail stock is reserved or that physical testing is unnecessary. Checkout stock/freight and the documented assembly, bench and flight acceptance tests remain part of the process.

## Audit pass 2 — 2026-10-31 (evening), independent re-verification

A second pass re-opened every listing and every cited primary source. Result: **the prices and specifications held, but three buy-blocking errors and several smaller ones did.**

| # | Finding | Verdict |
|---|---|---|
| 1 | **TBS Diamond antenna is 850–950 MHz** — a Crossfire *link* antenna, not 5.8 GHz video. The build had no correct video antenna at all. | **Fixed** → TBS Triumph PRO SMA RHCP, CA$29.99 (5500–6000 MHz) |
| 2 | **Frame OUT OF STOCK** at Rotor Village (not "only 1 shown"). | Flagged + fallback rule |
| 3 | **GEPRC 50A stack OUT OF STOCK**; the 65A V2 (the first-choice alternate) is also out of stock. | Flagged; in-stock alternates named (DakeFPV CA$95.99, GEPRC BL32 70A CA$159.99) |
| 4 | **Skyzone M5F ships with no 18650 and no SD card**, yet Stage 6's "done when" requires the DVR to record. | **Fixed** → both added as line items |
| 5 | **Qwiic PRT-17912 pin order (GND,3V3,SDA,SCL) cannot match** the Pimoroni header (3V3,SDA,SCL,INT,GND) — plugged as written it shorts GND to 3V3. | **Fixed** → CAB-17261 female-jumper, same price |
| 6 | **SparkFun Qwiic HAT has reversed SDA/SCL silkscreen** (SparkFun's own note), so "match the labels" was wrong advice. | **Fixed** → wire by cable colour |
| 7 | **CAR 901.25 (400 ft / 122 m AGL ceiling)** was missing from an otherwise accurate legal section. | **Fixed** → legal block + both flight checklists |
| 8 | **Registration fee stated as $5** in one place; TC raised it to **$10 on 1 Apr 2025**. The package table still used a $15 allowance, which is the $1,673 vs $1,678 split. | **Fixed** → $20 allowance everywhere |
| 9 | **GST of CA$81.10** implies an unexplained $1,622.01 base. | **Fixed** → CA$84.75 on CA$1,694.94 |
| 10 | RP1 V2 **ships on ExpressLRS v2.4**; a new radio ships 3.x/4.x, so binding fails until the receiver is flashed. | **Fixed** → explicit flash step |
| 11 | Step 7 put the Pi "over the middle of the frame" while step 6 demanded a downward lens — the lens would stare at the frame. | **Fixed** → lens-line rule + measure-before-drilling gate |
| 12 | "It finds a 1-metre heat source from 30 metres" contradicted the guide's own "may occupy about one pixel" limitation. | **Fixed** → reworded to match the honest limit |
| 13 | "All 35 links live (HTTP 200)" — an out-of-stock page also returns HTTP 200. | **Fixed** → "links load; stock is NOT guaranteed" |

Two items were *not* changed, deliberately: the **1900 KV / 4S motor pairing** (it is a 6S-class wind, but at ~550–570 g estimated AUW it still gives roughly 4.5–5:1 thrust-to-weight — efficient, just not punchy, now documented), and the **30 W M4AC charger** (slow but in spec, and it caps you at 4S).

Also noted for follow-up: the in-progress `docs/js/assistant.js` knowledge base still states that the TBS Diamond "is SMA" without noting it is a 900 MHz part, and the currently built standalone embeds that text.

## Scope correction

The original prompt referred to an APEX bundle and Construction Inspector, while the supplied HTML described a 5-inch build and Systems Analyst/Data Engineer careers. The audit uses the actual supplied file and preserves its relevant career section. The order plan selects one coherent 5-inch analog FPV architecture rather than mixing in the unrelated bundle.

## [1] A–G verdicts after substitutions

| Category | Verdict | Result and source |
|---|---|---|
| A — Live buy list | **PASS after correction** | Exact items and quantities selected. All order links load — but the **frame and the GEPRC 50A stack were both out of stock** on the 31 Oct re-check, and an out-of-stock page still returns HTTP 200. Stock re-check required at checkout. [Order list](Shad-Drone-Order-List.md) |
| B — Specifications/compatibility | **PASS after correction** | 30.5mm stack mounting, CRSF receiver, 4S power, 5V/3A Pi supply, shared I2C addresses and analog video are coherent. The **video antenna band was wrong (900 MHz) and is now 5.8 GHz**. Assembly/bench tests remain mandatory. |
| C — GoA MRS | **PASS** | Systems Analyst Level 1 routes checked against the current MRS PDF; overbroad equivalency wording corrected. [MRS](https://www.alberta.ca/system/files/custom_downloaded_images/psc-recruitment-standards-systems-analyst.pdf) |
| D — Wages/NOC | **PASS** | Job Bank NOC 21211 Alberta/Edmonton low/median/high wages confirmed as $28.00/$43.27/$57.69. [Job Bank](https://www.jobbank.gc.ca/marketreport/wages-occupation/24510/AB) |
| E — Fire math/code | **PASS (software); hardware validation next** | 55°×35° geometry corrected; payload code included; 19/19 unit tests and demo/map checks passed. [Payload README](Shad-Drone-Payload/README.md) |
| F — Legal | **PASS after correction** | Basic, **CAR 901.25 altitude ceiling**, night-light and forest-fire rules linked to current TC/CAR sources; flight-specific checks remain. [TC Basic](https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/drone-operation-categories-pilot-certificates/basic-operations) |
| G — Cost/cuts | **PASS (complete-cost disclosure)** | Full build cost is stated rather than forcing CA$750: **CA$1,714.94** plus **CA$84.75** GST = **CA$1,799.69** before freight; ≈CA$1,840–1,870 landed. [Cost summary](Shad-Drone-Order-List.md#exact-cost-summary) |

## [2] Principal substitutions and fixes

1. **Stack:** SpeedyBee F405 V4 (discontinued) → **GEPRC TAKER F405 BLS 50A Combo Stack**, CA$85.99, with 30.5mm mounting, 3–6S input and 5V/3A output. **Out of stock on the 31 Oct 2026 re-check (as is the 65A V2)**; in-stock alternates: DakeFPV F405 + 65A CA$95.99, GEPRC TAKER F405 BL32 70A CA$159.99. [Listing](https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/)
2. **Receiver:** ER4 PWM example → **RadioMaster RP1 V2 CRSF serial**, CA$27.99. UART binding/failsafe instructions remain explicit.
3. **Frame/motors/props:** unspecified → **TBS Source One V6**, four **Emax ECO III 2207 1900KV**, and two **Gemfan 51499** sets.
4. **Flight batteries/charger:** mixed 4S/6S → two **GNB 1500mAh 4S 120C HV XT60** packs and **ToolkitRC M4AC**, which explicitly supports 1–4S LiHV.
5. **Pi:** unavailable/headerless board → **Raspberry Pi Zero 2 WH Pi-hole hardware kit** with pre-soldered header, 32GB card, reader and 5.1V/2.5A bench supply. [Listing](https://www.pishop.ca/product/raspberry-pi-zero-2wh-pi-hole-kit/)
6. **Thermal camera:** out-of-stock Adafruit 4407 → in-stock **Pimoroni MLX90640 55°**, CA$86.95. [Listing](https://www.pishop.ca/product/mlx90640-thermal-camera-breakout/)
7. **GPS:** unspecified/optional → in-stock **Pimoroni PA1010D**, I2C address 0x10, CA$41.95. [Listing](https://www.pishop.ca/product/pa1010d-gps-breakout/)
8. **Sensor mounting:** direct/flat connection that could not orient both sensors correctly → four-port Qwiic HAT plus two independent **CAB-17261 female-jumper** cables (not PRT-17912, whose rigid GND/3V3/SDA/SCL block cannot match the Pimoroni 3V3/SDA/SCL/INT/GND header); thermal lens down, GPS antenna up.
9. **FPV:** missing chain/out-of-stock goggles → RunCam Phoenix 2 SE, TBS Unify Pro HV VTX, **TBS Triumph PRO 5.8 GHz SMA antenna** and Skyzone M5F analog diversity monitor/DVR (which ships without a battery or SD card — both now line items).
10. **Pi aircraft power:** vague connection → meter-checked 24AWG micro-USB power-only pigtail from the GEPRC's regulated 5V/3A output; VTX and COB lights use separate battery power.
11. **Tools:** bare-iron assumption → Flywoo kit with 65W iron, stand, solder, flux, multimeter, hex drivers, cutters, tweezers and prop tool, plus smoke stopper, safety glasses and meter batteries.
12. **Configuration computer:** unstated → recertified Acer Aspire 1 with one-year Acer warranty; Windows 11 S mode must be switched off for Betaflight/Pi Imager.
13. **Software:** absent modules/test claims → included `hotspots.py`, `geo.py`, `payload.py`, `map_server.py`, requirements and 19 unit tests.
14. **Budget:** legacy partial prices → exact item-level order list with CA$1,714.94 known subtotal, GST and freight shown separately.
15. **Logo:** no readable replacement image was available, so the existing `shad-drone-icon.svg` remains as requested by the fallback instruction.

## [3] Compatibility matrix

| Interface | Verified selection | Acceptance test |
|---|---|---|
| Frame ↔ FC/ESC | Source One V6 and GEPRC stack both use 30.5×30.5mm mounting | Confirm ESC/capacitor clearance during assembly |
| Motors/props/battery | 1900KV ×4 (5 mm outer shaft, 31.6 g), 51499 props, 4S packs, 50A ESC, XT60 | Restrained current/temperature test, confirm hover throttle, short hover |
| Pocket ↔ RP1 V2 | ELRS/CRSF serial; **RX ships on ELRS v2.4, radio ships 3.x/4.x** | Flash the RX to the radio's major version, cross TX/RX at a free UART, bind and test failsafe |
| Pi ↔ thermal/GPS | Pre-soldered Zero 2 WH, Qwiic HAT, 3.3V I2C, addresses 0x33/0x10, CAB-17261 cables wired 3V3/SDA/SCL/GND | Enumerate both devices, confirm pin order (pin 4 skipped), run hardware API tests |
| Pi power | GEPRC regulated 5V/3A via 24AWG micro-USB power-only pigtail | Meter polarity/voltage and check undervoltage under load |
| Analog FPV | Phoenix 2 (5–36V), Unify Pro HV (2–6S), **TBS Triumph PRO 5.8 GHz SMA antenna**, Skyzone M5F monitor | Match channel/band and use lawful RF settings; a 900 MHz Crossfire antenna will not work |
| Charging | M4AC supports 1–4S LiHV and AC input | Select LiHV 4S and balance-charge attended |
| Software | Included source, GPS/camera drivers, JSONL log and offline viewer | 19/19 synthetic tests passed; perform hardware/survey tests |

The complete system is coherent on manufacturer specifications. Physical clearance, power stability, RF behaviour, vibration, detection performance and flight safety are verified during the documented build—not presumed from a product listing.

## [4] Cost and build time

- Merchandise + shown laptop freight + compliance allowance: **CA$1,714.94**.
- Alberta GST at 5% on the CA$1,694.94 taxable subtotal (TC fees are not taxable): **CA$84.75**.
- Total before remaining freight: **CA$1,799.69**. Estimated freight CA$40–70, so **≈CA$1,840–1,870 landed**.
- Rotor Village/PiShop freight is weight/address-based. SparkFun freight/import charges and any small-Walmart-item charge are checkout-dependent.
- Original CA$750 remains visible in the interactive meter only as a comparison target; the complete build is not represented as fitting it.

The 19-step build estimate is **46 hands-on hours**. The slider uses 2–40 hours/week, step 2, default 8; rounds weeks to the nearest 0.5; derives a finish date from the current local date; and persists `hoursWeek` in the existing guide state object.

## [5] Software and validation

Included files:

- `hotspots.py`: validated 32×24, 4-connected flood fill.
- `geo.py`: validated 55°×35° footprint, heading rotation and coordinate conversion.
- `payload.py`: real Pimoroni/Adafruit sensor backends, GPS data, logging and deterministic demo.
- `map_server.py`: dependency-free JSONL log, JSON API and offline coordinate viewer.
- `test_drone_logic.py`: 19 tests covering grouping, geometry, invalid inputs, persistence and the end-to-end demo.

**Completed checks:**

- **19/19 payload unit tests passed**.
- Demo logged one hotspot successfully.
- `/health` returned true, `/api/hotspots` returned one record, and the viewer returned HTTP 200.
- **55/55 Playwright checks passed** for tabs, checkboxes, slider math/date/persistence, coverage, budget editing, MRS picker, all quizzes/28 points, flashcards and 390px layouts, with no browser errors.
- Both inline JavaScript blocks passed Node syntax checks.
- All retailer/source links in the order document load. **Loading ≠ stock:** the frame and the GEPRC 50A stack were out of stock on the 31 Oct 2026 re-check.
- All local guide links resolve to the order list, audit report and payload files.

Reusable checks: a local check script on the build laptop (not in this repository) and `Shad-Drone-Payload/test_drone_logic.py`.

**ORDER PLAN — buy the exact listed items after confirming stock and freight at checkout, then follow the documented assembly, bench and flight acceptance tests.**

## Revision note, 2026-11-03 (earlier text above is left as written)

- The Acer Aspire 1 laptop (CA$269.00 + CA$35.99 delivery, Walmart) was removed from the plan: Shad uses his own laptop. Figures in the sections above that include it (CA$1,714.94 merchandise, CA$84.75 GST, CA$1,799.69 total) are superseded. New figures: merchandise + CA$20 allowance CA$1,409.95; GST 5% on CA$1,389.95 = CA$69.50; total CA$1,479.45 before freight.
- Added a 24 V 3 A DC adapter for the kit's iron (Abra Electronics, CA$16.43, in stock 2026-11-03; connector 5.5 x 2.5 mm, source: the product page; iron rated DC 12-24 V, 5.5 x 2.5 mm, source: the Rotor Village listing). Plug polarity is not stated on either page, so the guide says to check it with the multimeter before first use. Updated figures: merchandise + CA$20 allowance CA$1,426.38; GST 5% on CA$1,406.38 = CA$70.32; total CA$1,496.70 before freight.
