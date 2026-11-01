# Shad's Fire-Detecting Drone — Source-Verified Order Plan

**Checked:** 2026-10-31 (evening) · **stock re-checked 2026-10-31**  
**Build:** 5-inch analog FPV quad + Raspberry Pi thermal/GPS payload  
**Scope:** exact parts, quantities, live sources, tested payload code, and landed-cost assumptions.

Every category needed for the build is covered below. Prices and stock are point-in-time observations, not reservations; recheck the linked listing before payment. Compatibility is verified against specifications, followed by mandatory assembly/bench/flight acceptance tests—not represented as a guarantee against defects or future stock changes.

> **Re-check 2026-10-31 (evening):** every link loads, but **loading is not stock** — four items are
> constrained and two are unbuyable:
>
> 1. **TBS Source One V6 frame — OUT OF STOCK** at Rotor Village.
> 2. **GEPRC TAKER F405 BLS 50A stack — OUT OF STOCK**, and so is the 65A V2. In-stock 30.5×30.5
>    alternates: **DakeFPV F405 + 65A, CA$95.99**; **GEPRC TAKER F405 BL32 70A, CA$159.99**; Aocoda
>    F480 V3.2 F405+80A, CA$159.99. Your Stage 1–3 purchases are unaffected — the stack is not needed until Stage 5.
> 3. **Acer laptop — OUT OF STOCK** at Walmart (price still CA$269.00). Substitute any recertified
>    Windows laptop, or skip it if you own a computer.
> 4. **Zip ties — only 1 left**; the Flywoo tool kit (3), Skyzone M5F (1) and TBS Triumph (3) are low stock.
>
> **Corrected in this revision:** the TBS Diamond antenna is an **850–950 MHz Crossfire link antenna**,
> not 5.8 GHz video — replaced by the **TBS Triumph PRO SMA RHCP ($29.99)**. The Qwiic cable is now the
> **CAB-17261 female-jumper** (the PRT-17912's pin order cannot be made to match the Pimoroni header).
> The monitor **ships with no 18650 and no SD card**, so both are now separate lines. Transport Canada
> registration is **CA$10** (raised 1 Apr 2025), so the fee allowance is CA$20. Walmart blocked automated
> re-checks of the AAA cells and safety glasses; their 31 Oct observations stand.
>
> Spec checks retained: GEPRC stack has a 5V/3A BEC, 3–6S input, 6 UARTs and 30.5 mm mounting; ECO III
> 2207 is 31.6 g with a **5 mm outer / 4 mm inner shaft** and an M5 prop seat (the 51499's 5 mm hub fits);
> it is a **6S-class wind driven here on 4S** for torque and efficiency, so expect roughly 60–65 % of the
> thrust of a 2400 KV 4S build (estimate, not measured) — check hover throttle on the bench.

## Order 1 — Rotor Village, Winkler, Manitoba (CAD)

| Qty | Exact item | Extended CAD | Live listing / observed availability |
|---:|---|---:|---|
| 1 | TBS Source One V6 5-inch frame | $48.99 | [**OUT OF STOCK** 31 Oct 2026](https://rotorvillage.ca/tbs-source-one-v6-5/) |
| 1 | GEPRC TAKER F405 BLS 50A Combo Stack, GP-V8 | $85.99 | [**OUT OF STOCK** 31 Oct 2026](https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/) — see alternates above |
| 4 | Emax ECO III 2207 1900KV motors | $87.96 | [13 shown](https://rotorvillage.ca/emax-eco-iii-series-2207-1900kv-motor/) |
| 2 | Gemfan 51499 Hurricane tri-blade prop sets (2CW+2CCW per set) | $8.58 | [Choose options](https://rotorvillage.ca/gemfan-51499-hurricane-tri-blade-prop-2cw-2ccw/) |
| 1 | RadioMaster Pocket ELRS, charcoal, RM-G5 | $99.99 | [80 shown](https://rotorvillage.ca/radiomaster-pocket-transmitter-elrs-charcoal-edition/) |
| 1 | RadioMaster Pocket 18650 3200mAh battery pair | $17.99 | [Add to cart](https://rotorvillage.ca/radiomaster-pocket-18650-3200mah-3-7v-battery-2pcs/) |
| 1 | RadioMaster RP1 V2 TCXO ELRS serial receiver | $27.99 | [Add to cart](https://rotorvillage.ca/radiomaster-rp1-v2-tcxo-expresslrs-2-4ghz-receiver/) |
| 2 | GNB 1500mAh 4S 120C HV LiPo, XT60 | $67.98 | [21 shown](https://rotorvillage.ca/gnb-1500mah-4s-120c-hv-lipo-xt60/) |
| 1 | ToolkitRC M4AC 30W/2.5A AC charger (LiHV, 1–4S) | $49.99 | [7 shown](https://rotorvillage.ca/toolkitrc-m4ac-charger-30w-2-5a/) |
| 1 | RunCam Phoenix 2 Special Edition analog camera | $36.99 | [8 shown](https://rotorvillage.ca/runcam-phoenix-2-special-edition/) |
| 1 | TBS Unify Pro 5G8 HV VTX, 2–6S, SMA | $77.99 | [7 shown](https://rotorvillage.ca/tbs-unify-pro-5g8-hv-vtx/) |
| 1 | **TBS Triumph PRO SMA RHCP 5.8 GHz antenna** (5500–6000 MHz, 11.5 g) | $29.99 | [Only 3 shown](https://rotorvillage.ca/tbs-triumph-pro-sma-rhcp/) |
| 1 | Skyzone M5F 5-inch diversity analog FPV monitor/DVR | $249.99 | [Only 1 shown](https://rotorvillage.ca/skyzone-m5-diversity-fpv-monitor/) |
| 1 | **Samsung 30Q 18650 cell, 2-pack** — the M5F ships with NO battery | $15.99 | [179 in stock](https://rotorvillage.ca/samsung-30q-18650-3000mah-15a-li-ion-2pc/); flat-top, unprotected — add a spacer if the holder misses contact |
| 1 | Rotor Village Kevlar battery straps, 2-pack | $8.99 | [Add to cart](https://rotorvillage.ca/rvs-kevlar-battery-strap-2pk/) |
| 1 | LED COB strip, 4S/1m | $11.99 | [Choose options](https://rotorvillage.ca/led-cob-strip-4s-1m/) |
| 1 | Flywoo Ultra Grip battery pad | $3.99 | [Add to cart](https://rotorvillage.ca/flywoo-ultra-grip-super-sticky-battery-pad/) |
| 1 | Flywoo FPV Quad Tool Kit with 65W iron and multimeter | $103.99 | [Only 3 shown; contents listed](https://rotorvillage.ca/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron/) |
| 1 | iFlight Smart Smoke Stopper, XT30/XT60 | $11.99 | [Add to cart](https://rotorvillage.ca/iflight-smart-smoke-stopper-xt30-xt60/) |
| 1 | RVS LiPo storage bag | $14.99 | [Add to cart](https://rotorvillage.ca/rvs-lipo-storage-bag/) |
| 10 | 6mm × 150mm black heat shrink | $4.90 | [Add to cart](https://rotorvillage.ca/heat-shrink-6mm-x-150mm-black/) |
| 2 | 38mm × 150mm clear heat shrink | $3.18 | [Add to cart](https://rotorvillage.ca/pvc-heat-shrink-38mm-x-150mm-clear/) |
| 1 | 3mm × 100mm zip ties, 100-pack | $12.99 | [**Only 1 left**](https://rotorvillage.ca/zip-ties-100pcs-3mm-x-100mm/) |

**Rotor Village merchandise subtotal: CA$1,083.42.** Freight is calculated by cart weight/dimensions at checkout and is not included. The retailer states that orders ship from Canada; return shipping for verified DOA items is covered under its 30-day DOA process.

## Order 2 — PiShop Canada, Ottawa (CAD)

| Qty | Exact item | Extended CAD | Live listing / observed availability |
|---:|---|---:|---|
| 1 | Raspberry Pi Zero 2WH Pi-hole kit, K2B-1322-1: pre-soldered Pi, 32GB card, reader, 5.1V/2.5A supply, adapters/case/heatsink | $94.95 | [In stock; full contents](https://www.pishop.ca/product/raspberry-pi-zero-2wh-pi-hole-kit/) |
| 1 | Pimoroni MLX90640 Thermal Camera Breakout, 55°×35°, SKU 1842, with 1×5 headers | $86.95 | [In stock](https://www.pishop.ca/product/mlx90640-thermal-camera-breakout/) |
| 1 | Pimoroni PA1010D GPS Breakout, SKU 476-1, I2C 0x10, with 1×5 headers | $41.95 | [In stock](https://www.pishop.ca/product/pa1010d-gps-breakout/) |
| 1 | Micro-USB M/M right-angle cable, 24AWG | $4.95 | [In stock; modify only as documented for aircraft power](https://www.pishop.ca/product/micro-usb-cable-mm-right-angle-micro-usb-24-awg-2-m-6-ft/) |
| 2 | Nylon M2.5 × 12mm standoff sets, 4 per pack | $1.90 | [In stock](https://www.pishop.ca/product/nylon-11mm-m2-5-standoff-set-pack-of-4/) |
| 1 | **32GB microSD card for the monitor's DVR** (SanDisk Ultra, Class 10, blank) | $27.95 | [In stock](https://www.pishop.ca/search.php?search_query=32gb+microsd) — any spare card works, but the DVR cannot record without one |

**PiShop merchandise subtotal: CA$258.65.** Freight is weight-based and calculated after entering the shipping address. PiShop ships only within Canada. The Pi-hole kit is used as a hardware bundle; flash its included blank card with Raspberry Pi OS — that card is **not** spare for the DVR.

## Order 3 — SparkFun, United States (USD shown, CAD converted)

Bank of Canada daily rate checked for 2026-10-30: **CA$1.3960 per US$1**. Use the card issuer's actual rate at purchase.

| Qty | Exact item | USD | Converted CAD | Live listing |
|---:|---|---:|---:|---|
| 1 | SparkFun Qwiic HAT for Raspberry Pi, DEV-14459 | US$6.95 | CA$9.70 | [In stock](https://www.sparkfun.com/sparkfun-qwiic-hat-for-raspberry-pi.html) |
| 2 | **Flexible Qwiic Cable – Female Jumper, CAB-17261, 150mm** | US$3.90 | CA$5.45 | [In stock](https://www.sparkfun.com/flexible-qwiic-cable-female-jumper-4-pin.html) |
| **Total** |  | **US$10.85** | **CA$15.15** | Freight/import charges not included |

**Pin order matters — this is not a "match the labels" job.** The Pimoroni 1×5 header is **3V3, SDA, SCL, INT, GND** (it maps to Pi pins 1,3,5,7,9). The PRT-17912 breadboard-jumper cable is wired **GND, 3V3, SDA, SCL** in a rigid 4-pin block, so it physically cannot be plugged in correctly — hence the **CAB-17261 female-jumper** cable in this list, whose four ends can be placed in the right order with pin 4 skipped. Ignore the Qwiic HAT's silkscreen: SparkFun states its SDA/SCL labels are reversed. Wire by cable colour — black GND, red 3V3, blue SDA, yellow SCL. This arrangement lets the camera lens face down and the GPS antenna face up independently.
## Order 4 — Walmart Canada / Edmonton (CAD)

| Qty | Exact item | Extended CAD | Live listing / availability |
|---:|---|---:|---|
| 1 | Acer Aspire 1, 15.6-inch, Celeron N4500/4GB/64GB, Windows 11 S, recertified with 1-year Acer warranty | $269.00 | [Out of stock at 2026-11-01 re-check, price still $269.00; was add-to-cart via BuySmart](https://www.walmart.ca/en/ip/Acer-Aspire-1-FHD-15-6-Laptop-Intel-Celeron-N4500-4GB-DDR4-64GB-eMMC-UHD-Graphics-W11-S-mode-Excellent-Recertified-Year-Manufacturer-Warranty/7ICF4XI4BCLN) |
| 1 | BuySmart delivery to Edmonton shown on listing | $35.99 | Same laptop listing; actual address changes quote |
| 1 | Permatex Blue Medium Strength 242 threadlocker | $10.28 | [Sold by Walmart](https://www.walmart.ca/en/ip/Permatex-Blue-Medium-Strength-242-Threadlocker/10045329) |
| 1 | Energizer MAX AAA batteries, 8-pack (multimeter uses two) | $9.47 | [Sold by Walmart](https://www.walmart.ca/en/ip/Energizer-MAX-AAA-Batteries-8-Pack-Triple-A-Alkaline-Batteries/4MNIVQS3GCTW) |
| 1 | 3M SecureFit 200 clear anti-fog safety glasses | $12.98 | [Sold by Walmart](https://www.walmart.ca/en/ip/3M-SecureFit-200-Eyewear-SF200P1-DC-Clear-Clear-Lens-Anti-Fog/6000207407268) |

**Walmart/laptop subtotal including shown laptop freight: CA$337.72.** Switch Windows 11 out of S mode before installing Betaflight Configurator and Raspberry Pi Imager. The three small Walmart items total CA$32.73; if their free-pickup/delivery threshold is not met, any separate charge belongs in the freight section below.

## Compliance allowance

| Item | Planning allowance | Source |
|---|---:|---|
| Small Basic exam CA$10 + one drone registration CA$10 (2025 fee schedule) | CA$20.00 | [Exam portal](https://tc.canada.ca/en/aviation/drone-safety/drone-pilot-licensing/take-drone-pilot-online-exam) and [Basic rules](https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/drone-operation-categories-pilot-certificates/basic-operations); confirm the live amount in the portal before payment |

## Backup sources (buy here if the primary is sold out)

Every budget row in the guide also carries a second ↗ link. Big-ticket parts have real alternate product pages; generic hardware links to an Amazon search so you can pick any in-stock equivalent. Note: the US shops (RaceDayQuads, GetFPV, Pyrodrone, TBS) ship to Canada but add freight and possible duty — use them only when the Canadian primary is out; Amazon.ca / EpicFPV keep shipping domestic.

| Part | Backup source |
|---|---|
| TBS Source One V6 frame | [GetFPV](https://www.getfpv.com/tbs-source-one-v6-5-frame-kit.html) |
| GEPRC TAKER F405 BLS 50A stack | [Pyrodrone](https://pyrodrone.com/products/geprc-taker-f405-stack-with-bls-50a-4in1-esc-30-30mm) |
| EMAX ECO III 2207 motors ×4 | [RaceDayQuads](https://www.racedayquads.com/products/emax-e3-series-2207-motor-1700kv-1900kv-2400kv) |
| Gemfan 51499 props ×8 | [RaceDayQuads](https://www.racedayquads.com/products/gemfan-hurricane-durable-3-blade-51499-propeller-choose-your-color) |
| RadioMaster Pocket ELRS | [Amazon.ca](https://www.amazon.ca/Radiomaster-Pocket-Controller-Transmitter-Helicopter/dp/B0F3D5Z531) |
| Samsung 35E 18650s | [Amazon search](https://www.amazon.ca/s?k=RadioMaster+18650+3200mAh) |
| RadioMaster RP1 V2 receiver | [RaceDayQuads](https://www.racedayquads.com/products/radiomaster-rp1-v2-2-4ghz-elrs-nano-receiver) |
| GNB 1500 mAh 4S batteries ×2 | [EpicFPV (Canada)](https://epicfpv.ca/products/gnb-lihv-4s-15-2v-1500mah-120c-xt60-lipo-battery-longrange) |
| ToolkitRC M4AC charger | [RaceDayQuads](https://www.racedayquads.com/products/toolkitrc-m4ac-30w-2-5a-2-4s-ac-smart-charger-xt60) |
| RunCam Phoenix 2 SE camera | [RaceDayQuads](https://www.racedayquads.com/products/runcam-phoenix-2-special-edition-micro-1000tvl-cmos-4-3-16-9-ntsc-pal-fpv-camera) |
| TBS Unify Pro HV VTX | [TBS official](https://www.team-blacksheep.com/products/prod:unify_pro_hv_sma) |
| TBS Triumph PRO 5.8 GHz antenna | [TBS official](https://www.team-blacksheep.com/products/prod:triumph_pro_sma) |
| Skyzone M5F monitor/DVR | [Amazon](https://www.amazon.com/SKYZONE-Monitor-5inch-5-8Ghz-Receiver/dp/B0F2MT7VZN) |
| Kevlar battery straps | [Amazon search](https://www.amazon.ca/s?k=kevlar+battery+strap) |
| COB LED strip | [Amazon search](https://www.amazon.ca/s?k=4S+COB+LED+strip) |
| Battery grip pad | [Amazon search](https://www.amazon.ca/s?k=fpv+battery+grip+pad) |
| Flywoo tool kit | [GetFPV](https://www.getfpv.com/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron.html) |
| Smoke stopper | [Pyrodrone](https://pyrodrone.com/products/iflight-smart-smoke-stopper-xt60-xt30) |
| LiPo safe bag | [Amazon search](https://www.amazon.ca/s?k=lipo+battery+safe+bag) |
| Heat shrink (6 mm / 38 mm) | [Amazon search](https://www.amazon.ca/s?k=heat+shrink+tubing+assortment) |
| Zip ties | [Amazon search](https://www.amazon.ca/s?k=3mm+zip+ties) |
| M2.5 standoffs | [Amazon search](https://www.amazon.ca/s?k=nylon+M2.5+standoff) |
| Right-angle micro-USB cable | [Amazon search](https://www.amazon.ca/s?k=right+angle+micro+usb+cable) |
| Pi Zero 2 WH kit | [Amazon kit](https://www.amazon.ca/WH-Kit-Aluminum-Alloy-MicroSD/dp/B0G69QHBYN) |
| MLX90640 thermal sensor | [Adafruit MLX90640 55°](https://www.adafruit.com/product/4407) (same sensor, slightly narrower lens) |
| PA1010D GPS | [Adafruit Mini GPS PA1010D](https://www.adafruit.com/product/4415) (same module, STEMMA QT) |
| SparkFun Qwiic HAT | [Amazon search](https://www.amazon.ca/s?k=SparkFun+Qwiic+HAT) |
| Qwiic jumper cables | [Amazon search](https://www.amazon.ca/s?k=SparkFun+Qwiic+jumper+cable) |
| Windows laptop (optional) | [Amazon search](https://www.amazon.ca/s?k=recertified+windows+laptop) |
| Permatex 242 threadlock | [Amazon search](https://www.amazon.ca/s?k=Permatex+242) |
| Energizer AAA | [Amazon search](https://www.amazon.ca/s?k=Energizer+MAX+AAA) |
| Safety glasses | [Amazon search](https://www.amazon.ca/s?k=3M+SecureFit+200) |
| Exam + registration | Transport Canada is the only source (see links in the guide) |

## Exact cost summary

| Component | Amount |
|---|---:|
| Rotor Village merchandise | CA$1,083.42 |
| PiShop merchandise | CA$258.65 |
| SparkFun merchandise, converted at 1.3960 | CA$15.15 |
| Walmart/laptop, including shown laptop freight | CA$337.72 |
| Compliance allowance (exam $10 + registration $10) | CA$20.00 |
| **Merchandise + known laptop freight + allowance** | **CA$1,714.94** |
| Alberta GST at 5% on the CA$1,694.94 taxable subtotal (TC fees are not taxable) | CA$84.75 |
| **Total before Rotor Village/PiShop/SparkFun/other freight** | **CA$1,799.69** |
| Estimated remaining retailer freight | CA$40–70 |
| **Estimated landed total** | **CA$1,840–1,870** |

If you take the DakeFPV stack alternate instead of waiting for the GEPRC restock, add CA$10.00.

Freight from Rotor Village and PiShop is weight-based; SparkFun international freight/import charges and any small-Walmart-item charge require checkout quotes. No duty is expected on the Canadian-stocked Rotor Village/PiShop orders, but taxes and carrier charges still apply. The original CA$750 goal is not realistic for this complete new-parts/tools/laptop build; this is the full selected system rather than a reduced-feature list.

## Compatibility and assembly verification

| Interface | Source-backed selection | Required acceptance check |
|---|---|---|
| Frame ↔ stack | Source One V6 supports 30.5×30.5mm; GEPRC stack uses the same pattern and 3–6S/5V 3A | Confirm ESC clearance and capacitor placement before tightening |
| Motors/props/battery | Four 1900KV motors (**5 mm outer / 4 mm inner hardened shaft**, 31.6 g, M5 prop seat — the 51499's 5 mm hub fits; 16×16 M3 mounting), 51499 props, 4S packs, 50A ESC, XT60. Note: 1900KV is EMAX's 6S-class wind; on 4S it gives ~79 % of the rpm and roughly **60–65 % of the thrust** of a 2400 KV 4S build (estimate, not measured) — a torquey, efficient payload hauler, not a freestyle rocket. Going 6S later also means a new charger (the M4AC is 1–4S). | Verify current/temperature in a restrained low-power test, confirm hover throttle, then short hover |
| Radio ↔ receiver | Pocket ELRS and RP1 V2 CRSF serial. **The receiver ships on ExpressLRS v2.4** — flash it to the same major version as the radio before binding | Cross TX/RX at a free UART (confirm the pad name from the FC manual; "R2/T2" is unverified), set the Canada domain, bind, verify channels/failsafe |
| Pi ↔ thermal/GPS | Pre-soldered Zero 2 WH + four-port Qwiic HAT; 0x33 camera and 0x10 GPS on 3.3V I2C | Solder 1×5 headers, wire **3V3/SDA/SCL/GND in Pimoroni order (pin 4 skipped)** with CAB-17261 cables, ignore the HAT silkscreen, run address/API tests |
| Payload mounting | Pi under the bottom plate (or over a measured cutout); MLX90640 below it, lens down; PA1010D above, patch antenna up | **Measure before drilling** — the lens needs a clear vertical line to the ground, and no board may touch bare carbon |
| Pi power | GEPRC regulated 5V/3A to micro-USB power-only pigtail; separate bench PSU | Meter polarity/voltage and check undervoltage under load before flight |
| Analog FPV | Phoenix 2 (5–36V), Unify Pro HV (2–6S), **TBS Triumph PRO 5.8 GHz SMA antenna**, Skyzone M5F analog monitor (needs its own 18650 and microSD) | Match channel/band and legal RF settings; use 25 mW / default legal channels unless properly licensed. A 900 MHz Crossfire antenna (e.g. TBS Diamond) will not work here |
| Charging | M4AC supports 1–4S LiPo/LiHV and AC input | Select LiHV 4S, attended balance charging in LiPo bag |
| Software | Included local package with GPS/camera drivers, logging and offline viewer | **19/19 synthetic tests passed**, then perform Pi hardware and surveyed-target tests |

Payload package: `C:\Users\SHADHUNTER\Desktop\build-guide-repo\Shad-Drone-Payload`  
Instructions: `C:\Users\SHADHUNTER\Desktop\build-guide-repo\Shad-Drone-Payload\README.md`

The order is complete; assembly, binding, power, I2C, vibration, weight/CG, RF, detection accuracy and flight safety still need the documented acceptance tests. These are normal build steps, not missing purchases.


