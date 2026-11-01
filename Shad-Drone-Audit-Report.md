# Shad's Fire-Detecting Drone — Audit & Order Plan

**Updated:** 2026-10-31  
**Guide:** `C:\Users\SHADHUNTER\Desktop\Shad's Build Guide.html`  
**Order document:** `C:\Users\SHADHUNTER\Desktop\Shad-Drone-Order-List.md`  
**Payload:** `C:\Users\SHADHUNTER\Desktop\Shad-Drone-Payload`

## Result

The discontinued/unavailable components have been replaced with live alternatives. The build now has one exact order plan covering the airframe, analog FPV, thermal/GPS payload, power, tools, configuration laptop and compliance allowance. The included payload software has **19 passing synthetic tests**, a working demo and a verified map API.

This is a **source-verified build plan**, not a claim that retail stock is reserved or that physical testing is unnecessary. Checkout stock/freight and the documented assembly, bench and flight acceptance tests remain part of the process.

## Scope correction

The original prompt referred to an APEX bundle and Construction Inspector, while the supplied HTML described a 5-inch build and Systems Analyst/Data Engineer careers. The audit uses the actual supplied file and preserves its relevant career section. The order plan selects one coherent 5-inch analog FPV architecture rather than mixing in the unrelated bundle.

## [1] A–G verdicts after substitutions

| Category | Verdict | Result and source |
|---|---|---|
| A — Live buy list | **PASS** | Exact items and quantities selected; all 35 order links opened successfully. [Order list](Shad-Drone-Order-List.md) |
| B — Specifications/compatibility | **PASS (specification)** | 30.5mm stack mounting, CRSF receiver, 4S power, 5V/3A Pi supply, shared I2C addresses and analog video are selected coherently. Assembly/bench tests remain mandatory. |
| C — GoA MRS | **PASS** | Systems Analyst Level 1 routes checked against the current MRS PDF; overbroad equivalency wording corrected. [MRS](https://www.alberta.ca/system/files/custom_downloaded_images/psc-recruitment-standards-systems-analyst.pdf) |
| D — Wages/NOC | **PASS** | Job Bank NOC 21211 Alberta/Edmonton low/median/high wages confirmed as $28.00/$43.27/$57.69. [Job Bank](https://www.jobbank.gc.ca/marketreport/wages-occupation/24510/AB) |
| E — Fire math/code | **PASS (software); hardware validation next** | 55°×35° geometry corrected; payload code included; 19/19 unit tests and demo/map checks passed. [Payload README](Shad-Drone-Payload/README.md) |
| F — Legal | **PASS (guide corrections)** | Basic, night-light and forest-fire rules linked to current TC/CAR sources; flight-specific checks remain. [TC Basic](https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/drone-operation-categories-pilot-certificates/basic-operations) |
| G — Cost/cuts | **PASS (complete-cost disclosure)** | Full build cost is stated rather than forcing CA$750: CA$1,678.00 plus CA$81.10 GST = CA$1,759.10 before remaining freight. [Cost summary](Shad-Drone-Order-List.md#exact-cost-summary) |

## [2] Principal substitutions and fixes

1. **Stack:** SpeedyBee F405 V4 (discontinued) → **GEPRC TAKER F405 BLS 50A Combo Stack**, CA$85.99, with 30.5mm mounting, 3–6S input and 5V/3A output. [Listing](https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/)
2. **Receiver:** ER4 PWM example → **RadioMaster RP1 V2 CRSF serial**, CA$27.99. UART binding/failsafe instructions remain explicit.
3. **Frame/motors/props:** unspecified → **TBS Source One V6**, four **Emax ECO III 2207 1900KV**, and two **Gemfan 51499** sets.
4. **Flight batteries/charger:** mixed 4S/6S → two **GNB 1500mAh 4S 120C HV XT60** packs and **ToolkitRC M4AC**, which explicitly supports 1–4S LiHV.
5. **Pi:** unavailable/headerless board → **Raspberry Pi Zero 2 WH Pi-hole hardware kit** with pre-soldered header, 32GB card, reader and 5.1V/2.5A bench supply. [Listing](https://www.pishop.ca/product/raspberry-pi-zero-2wh-pi-hole-kit/)
6. **Thermal camera:** out-of-stock Adafruit 4407 → in-stock **Pimoroni MLX90640 55°**, CA$86.95. [Listing](https://www.pishop.ca/product/mlx90640-thermal-camera-breakout/)
7. **GPS:** unspecified/optional → in-stock **Pimoroni PA1010D**, I2C address 0x10, CA$41.95. [Listing](https://www.pishop.ca/product/pa1010d-gps-breakout/)
8. **Sensor mounting:** direct/flat connection that could not orient both sensors correctly → four-port Qwiic HAT plus two independent PRT-17912 jumper cables; thermal lens down, GPS antenna up.
9. **FPV:** missing chain/out-of-stock goggles → RunCam Phoenix 2 SE, TBS Unify Pro HV VTX, TBS Diamond antenna and Skyzone M5 analog diversity monitor/DVR.
10. **Pi aircraft power:** vague connection → meter-checked 24AWG micro-USB power-only pigtail from the GEPRC's regulated 5V/3A output; VTX and COB lights use separate battery power.
11. **Tools:** bare-iron assumption → Flywoo kit with 65W iron, stand, solder, flux, multimeter, hex drivers, cutters, tweezers and prop tool, plus smoke stopper, safety glasses and meter batteries.
12. **Configuration computer:** unstated → recertified Acer Aspire 1 with one-year Acer warranty; Windows 11 S mode must be switched off for Betaflight/Pi Imager.
13. **Software:** absent modules/test claims → included `hotspots.py`, `geo.py`, `payload.py`, `map_server.py`, requirements and 19 unit tests.
14. **Budget:** legacy partial prices → exact item-level order list with CA$1,678.00 known subtotal, GST and freight shown separately.
15. **Logo:** no readable replacement image was available, so the existing `shad-drone-icon.svg` remains as requested by the fallback instruction.

## [3] Compatibility matrix

| Interface | Verified selection | Acceptance test |
|---|---|---|
| Frame ↔ FC/ESC | Source One V6 and GEPRC stack both use 30.5×30.5mm mounting | Confirm ESC/capacitor clearance during assembly |
| Motors/props/battery | 1900KV ×4, 51499 props, 4S packs, 50A ESC, XT60 | Restrained current/temperature test and short hover |
| Pocket ↔ RP1 V2 | ELRS/CRSF serial | Cross TX/RX at a free UART, bind and test failsafe |
| Pi ↔ thermal/GPS | Pre-soldered Zero 2 WH, Qwiic HAT, 3.3V I2C, addresses 0x33/0x10 | Enumerate both devices and run hardware API tests |
| Pi power | GEPRC regulated 5V/3A via 24AWG micro-USB power-only pigtail | Meter polarity/voltage and check undervoltage under load |
| Analog FPV | Phoenix 2 (5–36V), HV VTX (2–6S), SMA antenna, M5 analog monitor | Match channel/band and use lawful RF settings |
| Charging | M4AC supports 1–4S LiHV and AC input | Select LiHV 4S and balance-charge attended |
| Software | Included source, GPS/camera drivers, JSONL log and offline viewer | 19/19 synthetic tests passed; perform hardware/survey tests |

The complete system is coherent on manufacturer specifications. Physical clearance, power stability, RF behaviour, vibration, detection performance and flight safety are verified during the documented build—not presumed from a product listing.

## [4] Cost and build time

- Merchandise + shown laptop freight + compliance allowance: **CA$1,678.00**.
- Alberta GST planning amount on taxable merchandise: **CA$81.10**.
- Total before remaining freight: **CA$1,759.10**.
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
- All 35 retailer/source links in the order document returned successfully.
- All local guide links resolve to the order list, audit report and payload files.

Reusable checks: `C:\Users\SHADHUNTER\Desktop\.claude\check_drone_guide.py` and `C:\Users\SHADHUNTER\Desktop\Shad-Drone-Payload\test_drone_logic.py`.

**ORDER PLAN — buy the exact listed items after confirming stock and freight at checkout, then follow the documented assembly, bench and flight acceptance tests.**

