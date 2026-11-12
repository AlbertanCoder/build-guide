# Independent audit of the drone build guide, 12 Nov 2026

Public copy. Order numbers, receipt numbers, card and mailbox details are left out; nothing else is changed. The evidence
files this report names (page reads, receipts, test logs) are kept on Shad's PC and are not published.

AUDIT STATUS: COMPLETE

Auditor: session build-guide-repo-ff (Fable 5.2), 12 Nov 2026, 09:26 to 10:16 Edmonton time. It took over from session
build-guide-repo-24, which stopped at 09:25 having written only the finish-line check. Read: commit `4df8c47` (the same
as the public site). No guide file and no tick was changed. Every claim below comes from a page, receipt, manual or
command read today; nothing is taken from the earlier session's notes.

## Update, 12 Nov 13:35: fixes made and published

Shad asked for the true findings to be applied. Done and published as commit `2f93afe` (public site, offline copy
`build-guide-v15`). One line per finding, with what changed or why it was left, is in `FIX-LOG.md`, beside this file.
Fixed: W1, W2, W3, W4, B1, B2 (in part), B3, B4, B5, B7. Withdrawn: B6 (my mistake, see below). Left for Shad's
decision or because nothing on the page is wrong: B8 to B14. The text below is the audit as written at 10:16, with B6
corrected.

## In short

1. The parts list is sound. All 50 lines were checked against today's shop pages: every price matches, every part is the
   part the steps use, and the voltages, plugs and screw sizes fit each other. No part the build needs is missing from
   the list; two small gaps in the words are listed as B2 and B14.
2. One stock fact is out of date and it matters: the flight stack is back at Rotor Village, "Only 4 left". The guide still
   says out of stock, so it tells Shad to wait for the one part that stops the build at Step 3.
3. Shad's 16 ticks all have a receipt or other proof. One purchase is not on the list: the Liftoff simulator (CA$27.29,
   8 Nov). No receipt with a price was found for the threadlocker, only a review-request email.
4. The new "Buy next" line works and agrees with Home in every state tested (350 browser checks pass). Two things do
   not agree with it: the "Open the shopping list" button lands on Stage 2 (out of stock) instead of Stage 4, and
   "Best buy for this week" names a different stage whenever the weekly money is less than the next stage's price.
5. Release hygiene is clean: cache name and version tag match, the single-file copy is byte-for-byte a fresh rebuild,
   the README's "1749 checks in 32 suites" equals the gate. The viewer check that failed once is unreliable: it failed
   again for me in 1 of 5 runs on identical files.
6. The buying order is right about which step needs which stage, but going strictly stage by stage costs freight
   (about CA$23 to CA$24 per order so far) and ignores how scarce a part is. Better: buy the stack now, and group the
   remaining lines by shop, not by stage.

## Wrong

Each item: what is wrong, the proof, how sure, the smallest fix.

### W1. The flight stack is shown as out of stock; Rotor Village has it today
- Guide: line `stack` has status "out", note "On its way to us, expected around Nov 12–19"; the Stage 5 note says
  "Out of stock on 11 Nov: the flight stack"; the Stage 5 chip says "Out of stock · Needed from Step 3. Waiting for the
  flight stack (out of stock)."; "Buy next" skips Stage 5; Home says "Waiting on stock: ... Stage 5".
- Shop today: https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/ read 09:29:36 (plain) and 09:51:12 (Chrome):
  "GEPRC TAKER F405 BLS 50A Combo Stack ... $85.99 ... Only 4 left" and "Current Stock: 4". The "on its way" note is gone.
- Sure: high (two reads, 22 minutes apart). The guide was right on 11 Nov; the shop restocked.
- Smallest fix: on line `stack` set status "low", stock note "Only 4 left", checked 12 Nov, drop the "On its way" note;
  shorten the Stage 5 note to what is still true. Then Stage 5 stops being "waiting" everywhere by itself.
- Why it matters: it is the only Canadian source found, it was out of stock yesterday, and Step 3 cannot start without it.

### W2. "Open the shopping list" lands on Stage 2, not on the stage "Buy next" names
- Seen in a real browser with Shad's ticks (file `work/open-shopping-list-button.log`), phone and laptop width:
  `Home line: Next to buy: Stage 4 · Airframe, CA$235.40 (Stage 2 waits on stock: see Buy)`
  `after the click -> ... Buy line: ... Buy next: Stage 4 · Airframe, CA$235.40. Stage 2 waits on stock.`
  `stage at the top of the screen: {'n': '2', ... 'open': True, 'next': True, 'name': 'Stage 2 · The payload laboratory'}`
- Cause: `index.html:5052` still picks the first stage not bought (`todo.filter(...)[0]`), and the button at
  `index.html:5335` scrolls to that fold. The new rule `nextBuy()` (`index.html:5117`) is not used there.
- Sure: high (seen and read).
- Smallest fix: at `index.html:5052` take the stage from `nextBuy().nx` (fall back to the old pick when it is null).

### W3. The Pi kit's second backup shop no longer says "In stock"
- Guide: line `pi`, second backup (Abra): status in stock, its page said "Availability: In stock" with no count on 11 Nov.
- Shop today (09:29:14): https://abra-electronics.com/robotics-embedded-electronics/raspberry-pi-zero/pi-zero-2wh-kit-raspberry-pi-zero-2wh-starter-kit.html
  "PI-ZERO-2WH-KIT ... Price: CA$ 109.95 ... Availability: Delivery within 2-3 weeks".
- Sure: high (one plain read; the words are unambiguous).
- Smallest fix: change that backup's status and note to "Delivery within 2-3 weeks (12 Nov)". The Stage 2 note's
  "two backup shops" then needs the same words.

### W4. "Best buy for this week" does not always agree with "Buy next"
- The code says they cannot differ (`index.html:5180`: "the two lines no longer point at different stages"). They do,
  whenever the money slider is below the price of the next stage. Browser test, file `work/buy-page-browser-test.log`,
  9 failed checks of this one kind. Two examples:
  - Shad's ticks, slider CA$100: Buy line "Buy next: Stage 4 · Airframe, CA$235.40"; Home card "Best buy for this
    week: Stage 7 Papers and first flight (CA$10.17)".
  - Shad's ticks plus Stage 4, slider CA$330: "Buy next: Stage 6 · Eyes in the sky, CA$394.96" against "Best buy for
    this week: Stage 7 Papers and first flight (CA$10.17)". Two chips are then highlighted: Stage 6 "Buy next" and
    Stage 7 "In this week's buy".
- With Shad's ticks today the two agree at CA$330 and at CA$700 (Stage 4 first). The slider's built-in start value is CA$370.
- Sure: high (seen at five slider values in ten tick states).
- Smallest fix: when the next stage costs more than the slider, start the Best-buy line with "Not enough for Stage N yet
  (CA$X)" and offer the cheaper later stage as "also fits", so both lines name the same next stage.

## Could be better

### B1. The Qwiic line does not say which cable
- Line `qwiic` reads "SparkFun Qwiic HAT + 2 jumper cables" and links only the HAT. The exact cable is named in one
  place only, a quiz answer (`index.html:4314`, "CAB-17261 female-jumper cables").
- SparkFun today sells three look-alikes at the same price (search page read 09:54): "Flexible Qwiic Cable - Female
  Jumper (4-pin)" US$1.95, "... (4-pin, Heat Shrink)" US$1.95, and "Flexible Qwiic Cable - Breadboard Jumper (4-pin)"
  US$1.95. The breadboard one has pins, not sockets, and will not push onto the sensor pins as Step 6C needs.
- Fix: name it in the line ("2 x Flexible Qwiic Cable - Female Jumper (4-pin)") and put its link in the note:
  https://www.sparkfun.com/flexible-qwiic-cable-female-jumper-4-pin.html

### B2. Three small holes in the words about screws
- Step 7 lists "Nylon M2.5 standoffs (12 mm)" and later says "the Pi's four standoffs", but no line says to screw them
  to the Pi, with which screws, or which way up. The M2.5 set (line `m25-screws`, CA$18.95) is named in Step 1's piles
  only, never in a step's "You will need".
- The tool kit lists only a "4-in-1 Hexagon Socket Screwdriver Set" (Rotor Village page). The page never names a
  cross-head screwdriver; PiShop's page for the nylon set does not say what head its screws have. If they are
  cross-head, the kit has no driver for them.
- The M3 set screws for the legs (line `legs-setscrews`) need a small hexagon key. The guide's hex-set check names only
  the bits for M3 screws ("2.0 mm or the 2.5 mm bit"); a search of the page for "1.5 mm" finds nothing.
- Fix: one sentence in Step 7 ("Screw one standoff into each corner hole of the Pi with the short screws from the
  M2.5 set"), and two lines in the arrival checks: the head of the nylon screws, and that the hex set has the size
  the set screws take.

### B3. A scarce part with one Canadian source gets no "buy soon" words
- The chip adds "only N left, buy soon" for 1 or 2 left (`index.html:5145`). The stack (4 left, no Canadian backup),
  the charger (4 left, "Backup: not looked for yet") and the GPS board (5 left) get nothing on the chip.
- Fix: also say "buy soon" when a line is low and has no Canadian backup.

### B4. Freight is the biggest avoidable cost, and the page's order maximises it
- Paid so far (receipts): Rotor Village CA$24.00 freight on CA$275.37; PiShop CA$23.22 freight on CA$31.80. That is
  CA$47.22 plus GST on CA$307.17 of goods. Rotor Village's policy page: "Real-Time Rates: Costs are calculated by
  carriers based on weight and dimensions." No free-freight amount is stated.
- Still to buy by shop (from the list): Rotor Village CA$979.95 across Stages 4, 5, 6 and 8; PiShop CA$308.65 across
  Stages 2, 5 and 8. Bought stage by stage that is 3 or 4 Rotor Village parcels and 3 PiShop parcels.
- The clearest case: line `usbc-cable` (CA$9.95) is the only PiShop line in Stage 5. Ordered with its stage it would
  cost more in freight than the cable. Its own note says "Any USB data cable with the right plugs works".
- Fix: see Part C for the order I would use. On the page, a line under "Buy next" such as "Same shop, later stages:
  add them to this order to save freight" would do it.

### B5. One out-of-stock part hides the whole stage
- The rule treats a stage as one block (`index.html:5119`). For Stage 2 the top line would say "Buy next: Stage 2 ...,
  when it is back in stock" (seen in state E of the browser test) although four of its six lines can be bought today
  and one is short (GPS "Only 5 left"). The stage's own note does say so; the top line and chip do not.
- A blocked stage's chip also drops the low-stock words for its other parts (`index.html:5138`: the "else" branch).
- Fix: when a stage is blocked, add "N lines can be bought now" to the chip.

### B6. WITHDRAWN: a bought line does not keep its "Not enough here" warning
- I reported that the motors line still warned after it was ticked. That was wrong. The page already hides the
  warning on a bought line (`index.html:239`, `.buy-row.bought .buy-short { display: none; }`). My test had read the
  words of a hidden element.
- Proved in the browser on 12 Nov 13:27 (`fix/proof-browser.log`): "B6 motors not ticked: the 'Not enough here' warning
  is shown" and "B6 motors ticked: the 'Not enough here' warning is hidden", both PASS.

### B7. Two different patterns decide "fewer than needed"
- The line warning counts "N left" and "N in stock" (`index.html:4926`); the chip counts only "only N left"
  (`index.html:5142`). Today no line falls between them. A line such as qty 10 with "8 in stock" would warn on the line
  and say nothing on the chip. Fix: use one helper for both.

### B8. Which backups count as "Canadian" is narrower than it looks
- Only the first backup is looked at, and only when it has `same: true`, `country: "CA"` and is in stock
  (`index.html:4848`). CanaKit (the Pi kit's first backup) has no country field; the second backup is never looked at.
  That is the right result today (CanaKit sells in US dollars; Abra's kit is not the same kit), but it is by accident.

### B9. The two US prices use the rate of 30 Oct
- Lines `qwiic` and `legs-feet` use 1.3960. Bank of Canada, 10 Nov 2026: 1.4181
  (https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=4). At that rate: CA$15.39 not CA$15.15, and
  CA$11.33 not CA$11.15. Small. The lines already say "price from 30 Oct".

### B10. The LED strip is on the list but no step uses it
- Step 1 says so itself ("optional, not used in any step"); Fly safely says "No step in this build fits lights".
  Rotor Village's page: "Input Voltage: 4S / 12-17V" and "Must insulate frame, exposed carbon will short the LEDs".
  A full LiHV pack is 4 x 4.35 = 17.4 V, just over that range.
- Fix: drop the line, or add one sentence on how and where it would be wired.

### B11. Shad bought Liftoff; the guide's practice names FPV SkyDive
- Steam receipt, 8 Nov 2026: "Liftoff CDN$ 25.99 ... Total CDN$ 27.29". Step 0 says "Practise in FPV SkyDive, a free
  simulator on Steam". The guide's check-on-arrival for the simulator (which mode levels itself, the EdgeTX prompt)
  is written for SkyDive. Fix: Shad's call; one line naming Liftoff as an alternative would cover it.

### B12. The threadlocker tick has no receipt with a price
- Proof of purchase: a Canadian Tire review-request email of 10 Nov, "your Permatex 24209 Medium-Strength 242
  Threadlocker, Blue, 6-mL". No receipt email exists, so the price paid could not be confirmed. Nothing to fix on
  the page (the shop shows CA$12.99 today).

### B13. The viewer check that failed once is not a reliable pass/fail
- What it does (`scripts/build/viewer-test.html:124` to `136`): it starts the animation, waits 0.7 s, then 0.8 s, then
  2.5 s by the wall clock, and each time asks whether all 8 corners of the highlighted parts are inside the picture.
  The answer depends on where the moving camera happens to be at that instant.
- My runs today on identical files: 3 runs of the suite alone, 246 of 246 each; in the first full gate 246 of 246; in
  the second full gate 245 of 246, failing with the very same words as before: "phone width step-05-power.glb: while
  playing from the start, the highlighted parts stay in frame (t 4.0 s: 2 of 8 corners outside)". So 1 failure in 5.
- Judgement: do not trust a single red on this check, and do not ignore it either. It is always the same model at the
  same second, so the Step 5 picture really is cut for a moment near 4.0 s at phone width; the check only catches it
  when the timing lines up.
- Fix: either sample after the camera has stopped moving, or fix the Step 5 camera move near 4 s so the corners stay in.

### B14. Smaller notes
- Line `charger`: the shop's box list is "1 x Toolkit M7AC Charger" only. The guide says "check the box" for a mains
  cable. Asking Rotor Village before ordering costs nothing and saves a stalled first charge.
- Line `motors`: what screws come in the "Hardware Kit" is not on any page read, and the frame's arms are 6 mm thick.
  The guide's arrival test "Motor screw length" is the right check. Spare M3 x 8 and M3 x 9 screws at EpicFPV are
  not available today (its product record lists the options M3x8 and M3x9 as not available).
- For a first-time visitor (nothing ticked) Home says "Buy today: 15 items, CA$363.14" (Stages 1 and 3) while the Buy
  page says "Buy next: Stage 1 · Workshop and safety, CA$245.16". Not a contradiction, but two different amounts.
- The stage price on a chip uses the main shop's price even when the chip says to buy at the backup (frame CA$48.99
  at Rotor Village, CA$44.99 at EpicFPV; motors CA$21.99 and CA$22.99). The two differences cancel today.
- The single-file copy still points at the 3D lessons by folder (`docs/walkthrough/...`, 11 links), so it needs the
  `docs` folder beside it for those links. The builder prints this itself ("remaining relative refs").

## Part A: is every part on the guide the right part?

### How each line was checked
1. Used in the steps: I read all of Step 0 to Step 8 and Fly safely (plain text in `work/text/`) and matched each line.
2. Fits: from the shop page's own specification list, and from maker documents where one could be opened (TBS Unify
   manual, ToolkitRC M7AC manual V1.0, Skyzone M5F manual V1.0, Transport Canada's fee service).
3. Quantity: counted against what the steps use.
4. Shop, price, stock: every main page read today, 12 Nov, 09:28 to 09:53. Rotor Village, PiShop, Abra, Adafruit,
   SparkFun, GetFPV, CanaKit, Pyrodrone, GEPRC, Fleet Network by plain read; Canadian Tire, Amazon, Walmart and the
   EpicFPV counts in Chrome. Raw words are in `work/shop/`.
5. Verdict words: OK, WRONG (see the W item), BETTER (see the B item).

### The 50 lines

| # | Line | Used in | Fit, from the page or manual | Shop page on 12 Nov (guide's note in brackets when different) | Verdict |
|---|---|---|---|---|---|
| 1 | `radio` | Step 0 practice, Steps 4, 8 | "Internal RF: ELRS", "2.400GHz-2.480GHz", "Supports USB-C direct charging", needs 18650 cells | Rotor Village $99.99, "Current Stock: 54" (56). Receipt of 3 Nov | OK |
| 2 | `radio-cells` | Step 0, Step 5 | "18650 3200mAh 3.7V", 2 per pack; radio "Operational voltage: 6.6-8.4v" | $17.99, "Current Stock: 183" (185). Receipt of 3 Nov | OK |
| 3 | `tools` | Steps 0 to 8 | iron "Working voltage: DC12--24V", "Power Interface: 5.5*2.5", 65 W; meter, flux pen, prop tool in the box list | $103.99, "Only 1 left". Receipt of 3 Nov | OK |
| 4 | `smoke-stopper` | Steps 5, 7, 8 | "Connector : XT30 & XT60", "Trip current 1.2A", "Input Voltage: 7-25V (2-6S)" | $11.99, "Current Stock: 20". Receipt of 3 Nov | OK |
| 5 | `lipo-bag` | Step 5 | 22 x 17 x 11 cm; both packs fit (79 x 44 x 44 mm the larger) | $14.99, "Current Stock: 10". Receipt of 3 Nov | OK |
| 6 | `heat-shrink` | Step 3 (battery lead) | 6 mm x 150 mm, 2:1; 10 pieces | $0.49, "Current Stock: 56". Receipt: 10 | OK |
| 7 | `heat-shrink-3mm` | Step 0 pigtail, Step 6B (8 joints x 15 mm) | 3 mm x 150 mm; 2 pieces = 300 mm, need about 150 mm | $0.79, "Current Stock: 94". Receipt: 2 | OK |
| 8 | `zip-ties` | Steps 4, 7 | 3 x 100 mm, 100 | $12.99, "Current Stock: 16". Receipt of 3 Nov | OK |
| 9 | `standoffs` | Step 7 (the Pi) | "Nylon Standoffs - M2.5x12mm - Pack of 4"; Pi holes are M2.5; 8 bought, 4 used | PiShop $0.95, "Current Stock: 4". Receipt of 3 Nov: 2 | BETTER (B2: no step says how to fit them) |
| 10 | `micro-usb` | Step 0 pigtail, Steps 3, 5, 7 | "standard A to micro-B USB cable ... right angle", "24 AWG power wires, and 28 AWG data lines", 1.42 m | $4.95, "Current Stock: 107". Receipt of 3 Nov | OK |
| 11 | `iron-psu` | Step 0 | "Output: DC 24V, Max 5A, 120W", "Central Positive(+) and Outer Negative(-)", "5.5 x 2.5mm"; iron is 12-24 V, 5.5 x 2.5 | Amazon $29.99 ("Coupon price $28.49"), In Stock. Order of 3 Nov | OK |
| 12 | `threadlock` | Steps 2, 7 | Blue 242, 6 mL; 16 motor screws + 8 set screws | Canadian Tire $12.99, "48 In Stock" Edmonton South (44). Walmart $10.28. Bought: review email only | OK (price paid not proven: B12) |
| 13 | `pi` | Step 6, 7, 8 | Kit: "Raspberry Pi Zero 2 WH ... pre-soldered GPIO header", "32GB MicroSD Card", "Card Reader", "Power Supply, 5.1V/2.5A" | PiShop $94.95, "Out of stock". CanaKit starter kit US$89.95 "Add to Cart". Abra CA$109.95 "Delivery within 2-3 weeks" (guide: in stock) | WRONG (W3: the second backup's stock words) |
| 14 | `spare-sd` | Step 6A | SanDisk Ultra microSDHC 32 GB | PiShop $27.95, "Current Stock: 4468" | OK |
| 15 | `thermal` | Steps 6, 7, 8 | "This is the 55° (standard) version", "I2C interface (address 0x33)", "3-6V supply", headers in the pack | PiShop $86.95, "Out of stock". Adafruit US$74.95 "Out of stock" | OK |
| 16 | `gps` | Steps 6, 7, 8 | "I2C interface, with a default address of 0x10", "3V to 5V compatible", headers in the pack | PiShop $41.95, "Current Stock: 5". Adafruit US$29.95 "In stock" | OK |
| 17 | `qwiic` | Step 6B, 6C | HAT plugs on the Pi's 40 pins; 4 Qwiic sockets; cable sockets push onto the sensors' header pins | SparkFun HAT US$6.95 "In stock"; cable US$1.95; 6.95 + 2 x 1.95 = 10.85 | BETTER (B1: cable not named or linked; B9: rate) |
| 18 | `frame` | Step 2 | “Arm thickness 5": 6mm”, "Stack Mounting: 30.5 × 30.5mm & 20 x 20", "Standoff height: 30 and 22mm"; another seller: "Motor mounting holes: 16/19mm M3" | Rotor Village $48.99, "Out of stock More on the way, roughly mid-November". EpicFPV $44.99, "8 in stock" | OK |
| 19 | `motors` | Steps 2, 3 | 2207 1900KV; a seller: "Mounting holes: 16mm M3", "Outer shaft diameter: 5mm"; frame takes 16 and 19 | Rotor Village $21.99, "Only 3 left" (need 4), spec tab "KV: 1700" as the guide notes. EpicFPV 1900KV $22.99, "12 in stock" | OK (maker's own page not found: see Not checked) |
| 20 | `props` | Step 8 | "Length: 5.1 inch", "Hub size: 5mm (inner)", "2 x CW ... 2 x CCW" per pack; 2 packs = one set to fly, one spare | $4.29; Blue 14, Purple 7, other colours 0 | OK |
| 21 | `straps` | Step 7 | "Length: 245mm", "Width: 20mm", 2 per pack; the guide needs 177 mm round the larger pack | $8.99, "Current Stock: 344" | OK |
| 22 | `battery-pad` | Step 7 | sticky pad, 1 | $3.99, "Current Stock: 255" | OK |
| 23 | `finder` | Steps 3, 4 | "Input Voltage:4.5-8.5V", "1 x 3 Pin Wire", own 80 mAh battery | $21.99, "Current Stock: 9" (10) | OK |
| 24 | `lights` | no step | "Input Voltage: 4S / 12-17V"; full LiHV pack is 17.4 V | $11.99; red 1, green 5, blue 5, pink 5, yellow 4 | BETTER (B10: no step uses it) |
| 25 | `stack` | Steps 3, 4, 5, 8 | "Input Voltage: 3-6S LiPo", "9V 2.5A + 5V 3A dual independent BEC", "USB Connector: Type-C", "hole 30.5×30.5mm", box: "1 x Capacitor", "1 x XT60 Power cable", "4 x M3*30 Screws", "2 x sh1.0 4pinsilicone cable", "1 x Camera connection cable" | Rotor Village $85.99, "Only 4 left" (guide: out of stock). Pyrodrone US$74.99 in stock. GEPRC US$34.99 to US$66.99 | WRONG (W1: it is in stock) |
| 26 | `receiver` | Step 4 | "ExpressLRS 2.4ghz", "Working voltage: 5v", "Bus interface: CRSF", "65mm UFL 2.4Ghz T Antenna", "ExpressLRS v2.4 pre-installed" | $27.99, "Current Stock: 11" | OK |
| 27 | `batteries` | Steps 3, 5, 8 | 4S HV, "Discharge Lead: 85mm, XT60", "Balance Lead: 40mm, JST-XH", 146 g | $33.99, "Current Stock: 21". EpicFPV $33.89 | OK |
| 28 | `liion-5000` | Steps 5, 8 | "Connectors: Amass XT60H + 4S JST-XH balance lead", "Recommended Continuous 30-50A", "Max Charge Voltage: 16.8 V", 307.9 g | $63.99, "Current Stock: 47" | OK |
| 29 | `charger` | Step 5 | "LiPo, LiHV, LiFe, Lion, LTO 1-6S", "AC 100W or Dc 300W"; manual: LiHV 4.35 V, Lion 4.10 V; 2.5 A x 16.8 V = 42 W | $118.99, "Only 4 left" | BETTER (B14: mains cable not in the box list; B3) |
| 30 | `extinguisher` | Step 5 | "Garrison 1A10BC", 2.5 lb; the label has the letter C | Canadian Tire $39.99, "33 In Stock" Edmonton South | OK |
| 31 | `fpv-camera` | Steps 3, 4 | "Power: DC 5-36V", "Dimensions: 19mm*19mm*22mm", "1x 6pin FPV Silicone Cable" | $36.99, "Current Stock: 13" | OK |
| 32 | `vtx` | Steps 3, 4, 8 | "(SMA)", "Antenna Connector: SMA Female Socket", voltage "2S - 6S"; manual: "6V to 28V", red 7V-26V, yellow video, white data, orange 5V out, green audio; fed from the 9 V pad | $77.99, "Current Stock: 7". EpicFPV $77.99 | OK |
| 33 | `vtx-antenna` | Step 4 | "TBS Triumph PRO - SMA RHCP", "Frequency range: 5500-6000MHz", "Connector: SMA" | $29.99, "Only 3 left". EpicFPV long range $29.99 | OK |
| 34 | `monitor` | Step 8 | "5.8Ghz 48 CH", "Power Supply: 2-6S DC IN, 1x 18650 Li-ion, USB Type-C"; manual: "Antenna port 2 X SMA-K", "5.8GHz 2dB antennas*2", "SD Max 128Gb" | $249.99, "Only 1 left". EpicFPV $239.99, "2 in stock" | OK |
| 35 | `dvr-card` | Step 8 (optional) | manual says "SD card slot", "SD Max 128Gb"; micro or full size is still open, as the line's note says | PiShop $27.95, in stock | OK |
| 36 | `exam` | Step 8 | Transport Canada fee service: SVC-202990, "10.17000" from 2026-04-01 to 2027-03-31; page: 35 questions, 90 minutes, 65 % | CA$10.17. Paid 1 Nov (receipt seen) | OK |
| 37 | `registration` | Step 8 | Transport Canada fee service: SVC-202935, "10.17000" to 2027-03-31, then 10.45 | CA$10.17 | OK |
| 38 | `strippers` | Steps 0, 3, 4, 6 | "AWG 30-20"; the wire is 26 AWG | PiShop $24.95, "Current Stock: 9". Receipt of 3 Nov | OK |
| 39 | `practice-board` | Step 0, Step 6B | "12pcs ... 5x7 4x6 3x7 2x8cm Double Side" | Amazon $12.99, In Stock. Order of 3 Nov | OK |
| 40 | `silicone-wire` | Steps 0, 6B | "Conductor Size: 26 AWG"; 5 ft bought; the GPS cable takes 4 x 12 cm | $1.39; red 22, black 0. Receipt: 5, red | OK |
| 41 | `m25-screws` | Step 7 (not named there) | "80 x M2.5 x 4mm screw", "120 x M2.5 hex nut", "10 x 12mm M-F hex standoff" and more | PiShop $18.95 (was $21.95), "Current Stock: 20" | BETTER (B2: no step names it) |
| 42 | `foam-tape` | Steps 4, 7 | 1.2 cm x 1.9 m; "can be used indoors", as the line's note warns | Canadian Tire $8.99, "91 In Stock" | OK |
| 43 | `usbc-cable` | Steps 4, 8 | flight controller "USB Connector: Type-C"; this cable is C to C | PiShop $9.95, "Current Stock: 482" | BETTER (B4: do not order it alone) |
| 44 | `props-spare` | after a crash | same page as line 20 | $4.29; Blue 14, Purple 7 | OK |
| 45 | `x30-spray` | Step 8 (optional) | 56.7 g; "use of coating products will void warranties" | $36.99, "Only 5 left" | OK |
| 46 | `legs-25` | Step 7, after the first hover | "Diameter: M3", "Height: 25mm", 10 per pack, 4 used | $7.99, "Current Stock: 68" | OK |
| 47 | `legs-28` | Step 7, after the first hover | "Diameter: M3", "Height: 28mm", 10 per pack, 4 used | $7.99, "Current Stock: 59" | OK |
| 48 | `legs-feet` | Step 7, after the first hover | "Size: M3 Height: 6.3mm", "M3 screws not included", 8 per pack, 4 used | GetFPV US$7.99, "In Stock" | BETTER (B9: rate; Part C: US freight for a CA$11 part) |
| 49 | `legs-setscrews` | Step 7, after the first hover | "M3*10 ... 20-Pieces"; 8 used | Amazon $15.89, In Stock | BETTER (B2: key size not named) |
| 50 | `legs-footscrews` | Step 7, after the first hover | M3 x 10, 10 per pack, 4 used; 6.3 mm foot leaves 3.7 mm of thread | EpicFPV: option M3x10, $2.89, available (the shop's product record). Rotor Village backup "Out of stock" | OK |

### Do the parts fit each other? (the chain, in one place)
- Battery to everything: both packs are 4S with XT60 and a JST-XH balance plug. Stack "3-6S". Smoke stopper "7-25V".
  Charger does LiHV (4.35 V) and Li-ion (4.10 V). The video transmitter takes 6 to 28 V and is fed from the stack's 9 V
  pad. The camera takes 5 to 36 V and is fed 5 V. The lost-drone beeper takes 4.5 to 8.5 V and is fed 5 V. All inside range.
- The Li-ion pack's page recommends 30 to 50 A; the guide's 65 % throttle limit for that pack answers it.
- Plugs: video transmitter "SMA Female Socket" with the antenna's SMA plug; the monitor has its own two antennas
  (ports "SMA-K"); the receiver has its own antenna on a UFL socket; radio and flight controller are both USB-C;
  the Pi is fed by the micro-USB pigtail; iron and adapter are both 5.5 x 2.5 mm.
- Radio link: radio "Internal RF: ELRS" 2.4 GHz with receiver "ExpressLRS 2.4ghz", "CRSF". Video: 5.8 GHz both ends.
- Screws: stack on the frame's 30.5 mm holes with the stack's own "M3*30" screws; motors on M3 holes; props' 5 mm hub
  on the motors' 5 mm shaft; Pi on M2.5; legs, feet and set screws all M3.
- Pi side: Zero 2 WH has its pins; the HAT plugs onto them; both sensors answer on I2C (0x33 and 0x10) at 3.3 V.
- Nothing found that does not fit. Three things could only be taken from seller pages, not a maker's: see Not checked.

### Is anything the build needs missing from the list?
Walked every "You will need" in Steps 0 to 8 and the Fly safely lists. Everything named is either a list line, in a
kit's box list, or something the guide says Shad already owns (safety glasses, AA or AAA cells, phone charger, tile or
tray, USB-C power bank, kitchen scale, laptop, marker, tape). Not on the list and worth a line of words:
- a small cross-head screwdriver, if the nylon M2.5 screws need one (B2);
- a mains cable for the charger, if the box has none (B14);
- the amateur radio exam (an examiner may charge; the guide explains the exam under Licences and courses);
- the Liftoff simulator Shad chose (B11).

### Transport Canada
- Exam: page https://tc.canada.ca/en/aviation/drone-safety/drone-pilot-licensing/take-drone-pilot-online-exam/small-basic
  says "35 multiple choice questions", "90 minutes", "A score of 65% or higher", "14 years of age or older". Its fee is
  filled in by a script from https://api.tc.canada.ca/siapi/api/v2/fees/id=svc-202990 which returned today:
  `amount 10.17000 from 2026-04-01 to 2027-03-31`, then `10.45476 from 2027-04-01`.
- Registration: https://tc.canada.ca/en/aviation/drone-safety/registering-your-drone, fee from
  https://api.tc.canada.ca/siapi/api/v2/fees/id=svc-202935: the same two amounts and dates.
- The guide says CA$10.17 for each, "1 Apr 2026 to 31 Mar 2027", and CA$10.45 after. Correct. File
  `work/shop/transport-canada-fees.txt`.

## Part B: today's work

### B-1. Purchases against ticks
Ticks read (read only) from `server/.memory/progress.json`: 16 `own:*` keys, 15 set on 4 Nov 05:45 and `own:exam` on
12 Nov 08:16. The receipts themselves are not published.

| Ticked line | Proof | Quantity and price against the list |
|---|---|---|
| radio, radio-cells, tools, smoke-stopper, lipo-bag, heat-shrink, zip-ties, silicone-wire, heat-shrink-3mm | Rotor Village order email, 3 Nov | all nine equal: same quantities, same unit prices |
| standoffs, micro-usb, strippers | PiShop order email, 3 Nov | all three equal |
| iron-psu, practice-board | Amazon order email, 3 Nov | $29.99 and $12.99 equal; total $43.55 after a $1.50 coupon |
| exam | Transport Canada receipt, 1 Nov | $10.17 equal |
| threadlock | Canadian Tire review-request email, 10 Nov | product equal; price paid not shown (B12) |

- A purchase not ticked: none among the list's lines.
- A tick without a receipt: none without proof; the threadlocker has proof of purchase but no receipt.
- A purchase not on the list: Liftoff, CA$27.29, 8 Nov (B11).
- Freight is not in the page's bill (it says so): CA$24.00 and CA$23.22 so far.

### B-2. The new Buy line and chips
Code read: `nextBuy()` `index.html:5117`, the line `5250` to `5268`, the chips `5270` to `5284`, `stageWhy()` `5136`.
Browser: Chrome through Playwright on a static copy of the commit (port 8853, ticks in localStorage only), laptop and
phone width, 10 tick states, 5 money values. 350 checks pass, 9 fail (all W4). Files `work/buy-page-browser-test.py`
and `.log`.

| State | Home says | Buy line says | Agree? |
|---|---|---|---|
| nothing ticked | "Buy today: 15 items, CA$363.14 before GST and freight" | "Nothing is ticked as bought yet. Buy next: Stage 1 · Workshop and safety, CA$245.16." | yes in stage, different amounts (B14) |
| Shad's ticks today | "Next to buy: Stage 4 · Airframe, CA$235.40 (Stage 2 waits on stock: see Buy)" | "You have Stage 1, Stage 3 and part of Stage 7. Buy next: Stage 4 · Airframe, CA$235.40. Stage 2 waits on stock." | yes |
| Shad's + Stage 4 | "Next to buy: Stage 6 · Eyes in the sky, CA$394.96 (Stages 2, 5 wait on stock: see Buy)" | "... Buy next: Stage 6 · Eyes in the sky, CA$394.96. Stages 2 and 5 wait on stock." | yes |
| Shad's + Stages 4, 6 | "Next to buy: Stage 7 · Papers and first flight, CA$10.17 ..." | "... Buy next: Stage 7 · Papers and first flight, CA$10.17. Stages 2 and 5 wait on stock." | yes |
| only out-of-stock stages left | "Next to buy: Stage 2 · Payload lab, CA$285.90 (2 lines out of stock: see Buy)" | "... Buy next: Stage 2 · Payload lab, CA$285.90, when it is back in stock." | yes (B5) |
| all required ticked | "Everything on the list is bought." | "Everything on the list is bought." | yes |
| everything ticked | the same | the same; every chip "Bought" with a check mark | yes |

- Home's line and the Buy line never disagreed in any state.
- "Best buy for this week" disagrees when money is short (W4).
- The opened stage and the Home button disagree (W2).
- The check mark on a bought chip is drawn by the style sheet ("✓ " before the name) and is not in the chip's text.
- No sideways scroll at phone width and no script error in any state.
- A stage whose parts are out of stock: chip "Out of stock", reason "Waiting for the Pi kit and the thermal camera
  (out of stock).", skipped by "Buy next" and named as waiting. Works as written.
- Is the advice sensible for a builder? See Part C: right about the steps, costly in freight, and today it rests on
  one out-of-date stock fact (W1).

### B-3. Release hygiene
- Cache and version tag: `sw.js:25` `const CACHE = "build-guide-v14";` and `index.html:5952`
  `docs/js/assistant.js?v=build-guide-v14`. They match. The public site serves the same: its `sw.js` says
  `build-guide-v14`, its `index.html` has the commit's checksum (`0cf53d17e83e05c1...`), and GitHub reports
  `built 4df8c47aa6ea... 2026-11-12T16:18:53Z`.
- Single-file copy: rebuilt in a scratch folder with the repo's own builder; the result is identical to the committed
  file. `sha256` of the rebuild, of `Shad's Build Guide.html` and of `dist/Shad's Build Guide.html`: all three
  `d92de3659adcecb0fec6720b6d279bfb0f93c2b3c397ee88d2e81c0166464671`.
- README count: `README.md:58` "1749 named checks in 32 suites" and `README.md:341`. `scripts/dev/gate.js` declares 32
  suites whose expected counts add up to 1749. Equal.
- The full gate, run in a faithful scratch copy (with git data and file dates; never in the repo): `1748/1749 named
  checks`, one suite red, the viewer check of B13. File `work/gate-in-faithful-scratch-copy.txt`. A first try in a
  plain copy of the tracked files failed 8 suites for reasons of the copy (not a git folder, no `dist`, file dates);
  that run says nothing about the guide and is kept only for the record (`work/gate-in-scratch-copy.txt`).
- The run rewrote two dated files in the scratch copy, as the earlier notes warned
  (`docs/build-truth/VERIFICATION.md`, `verification-summary.json`). The repo itself is untouched.

## Part C: is the buying-order advice right?

### C-1. Does each "why" match the guide and the steps?
| Stage | The page's why | The steps | Match |
|---|---|---|---|
| 1 | "The Step 0 practice uses it" | Step 0 uses the kit, adapter, boards, wire, stripper, micro-USB cable. The smoke stopper, bag, threadlocker, zip ties and standoffs wait for Steps 5, 2 and 7 | yes |
| 2 | "For the payload practice (Step 6)" | "Stage 2 practice = Step 6"; also Step 7 (mounting) and Step 8 | yes |
| 3 | "The Step 0 practice uses it" | radio set-up and simulator in Step 0; binding in Step 4 | yes |
| 4 | "Step 2 starts with it" | Step 2: frame and motors. Step 3: the beeper's cable. Step 4: beeper, foam tape. Step 7: straps, pad, legs. Step 8: props | yes |
| 5 | "Needed from Step 3" | Step 3: the stack, and a pack to check the lead reaches. Step 4: receiver, USB-C cable. Step 5: packs, charger, extinguisher | yes |
| 6 | "Needed from Step 3" | Step 3: the video transmitter's cable and the camera cable. Step 4: camera, transmitter, antenna. Step 8: the monitor | yes, but the monitor (CA$249.99 of the stage's CA$394.96) is first needed in Step 8 |
| 7 | "Needed before the first flight (Step 8)" | Step 8, item 8: certificate, registration, number marked | yes |
| 8 | "For after the first flight" | spare props, spray: yes. The memory card is used in Step 8 item 2 if bought; the LED strip in no step | mostly |

### C-2. Is this the best order for buying stage by stage?
What each step needs, in order: Step 2 needs Stage 4's frame and motors. Step 3 needs the stack (Stage 5), the video
transmitter and camera (Stage 6) and the beeper (Stage 4) all at once. Step 5 needs the rest of Stage 5. Step 8 needs
the monitor, the props and the papers. Step 6 (the payload) stands alone and can be done at any time.

So the page's order (4, then 5, then 6, then 7, with 2 whenever it is back) does let Shad build in order, with one
built-in pause: after Stage 4 he can do Step 2 and then nothing until both Stage 5 and the first three lines of
Stage 6 have arrived. The page's why lines say this; its "Buy next" line offers them one at a time.

Where a different order is better, and why:
1. Buy the stack now. Back in stock today, 4 left, CA$85.99, no Canadian backup (the first backup is a US shop at
   US$74.99 plus freight and duty), and it gates Steps 3 to 8. Today the page says to wait for it (W1).
2. Group by shop, not by stage. Each Rotor Village or PiShop parcel has cost about CA$23 to CA$24 so far (B4).
   - One EpicFPV order for what Step 2 needs: frame (Rotor Village is out; EpicFPV 8 in stock, CA$44.99), 4 motors
     (Rotor Village has 3; EpicFPV 12 in stock, CA$22.99 each), and the foot screws that are an EpicFPV line anyway
     (CA$2.89): CA$139.84.
   - One Rotor Village order for Steps 3 to 5: stack, receiver, both packs, charger (CA$330.95), video transmitter,
     camera, antenna (CA$144.97), beeper (CA$21.99), and the small Stage 4 lines (props, straps, pad, leg standoffs,
     CA$37.54): about CA$535. Add the monitor (CA$249.99) if the money is there: it has "Only 1 left", and EpicFPV
     has 2 at CA$239.99 if it goes.
   - One PiShop order, when the Pi kit and thermal camera return: all of Stage 2 plus the memory card. If the GPS
     board (5 left) starts to run out, buy the in-stock Stage 2 lines then and accept a second parcel later.
   - The USB-C cable: use one he owns, or add it to the PiShop order. Not on its own.
   - Canadian Tire: extinguisher and foam tape in one pickup; both in stock at Edmonton South today.
3. The leg parts can wait. All five leg lines are fitted "AFTER THE FIRST HOVER" (Step 7). One of them is a US shop
   (GetFPV, US$7.99): its freight and any duty will cost more than the feet. Nothing is lost by buying the legs last.
4. Papers: the exam is paid. Registration costs CA$10.17 until 31 Mar 2027 and can be done any day before the first
   flight. The amateur radio certificate is the slow one and is not a purchase; Home already says to start it now.

### C-3. How the page treats stock
| Case | What the page shows | Right? |
|---|---|---|
| A part out of stock, no Canadian backup (Pi kit, thermal camera; the stack until today) | line badge "Out of stock, checked 11 Nov"; chip "Out of stock" with "Waiting for the ... (out of stock)"; the stage is skipped and named as waiting | yes; but the whole stage waits for one part (B5) |
| A part out of stock with a Canadian backup (frame) | chip "Frame from EpicFPV (Rotor Village is out)"; the stage is not blocked | yes; the stage price still uses the main shop's price (B14) |
| Fewer left than the build needs (motors: 3 of 4) | on the line "Not enough here. Rotor Village has 3 and this build needs 4. Buy all 4 at EpicFPV instead ..."; on the chip "Rotor Village has 3 of the 4 motors: get them from EpicFPV" | yes (and the line warning hides once the line is ticked) |
| Only one or two left (monitor, tool kit) | chip "Video monitor: only 1 left, buy soon" | yes |
| Three to five left with no backup (stack now, charger, GPS) | amber badge on the line only | not shown on the chip (B3) |
| A stock fact that has gone stale | badges turn red after 3 days ("Checked N days ago, check again before buying") | the 3-day rule exists, but a 1-day-old "out" already steered the advice wrong (W1) |

## Not checked

- The flight controller's pad names, the wire-by-wire soldering, the note that SparkFun's HAT labels are swapped, and
  the sensors' pin order. These are build-step details; the maker's wiring sheet is a picture. Not re-verified.
- Emax's own page for the motor. Mounting holes, shaft and voltage come from sellers, and two sellers differ on the
  holes (Rotorama: "Mounting holes: 16mm M3"; HobbyRC's page for the series: "19×19 mm"). The frame takes both
  (Rotorama: "Motor mounting holes: 16/19mm M3"), so the motor fits either way. Which screws are in the motor's
  hardware kit: not found.
- Whether the 19 mm camera sits in the V6 frame's printed mount, and whether the frame has a hole for the antenna
  plug. No maker statement found. The guide has an on-arrival check for both.
- The charger's output plug type (the manual's text does not name it) and whether a mains cable is in the box.
- Stock counts at backup shops other than EpicFPV's frame, motors and monitor. For the thermal camera I re-read
  PiShop and Adafruit only, not Pimoroni, DigiKey, Kiwi Electronics or Mouser.
- RaceDayQuads showed its propeller prices in Canadian dollars to me (CA$5.05 and CA$7.22), so its US-dollar prices in
  the guide could not be compared word for word.
- Freight for the next orders (needs a cart), and US freight and duty for GetFPV and SparkFun.
- Shad's mailboxes were searched, not read folder by folder. No Canadian Tire receipt was found.
- The full gate in the repo itself: not run, because it rewrites two files. Run in scratch copies instead.
- The guide's chat: what it answers about what to buy next was not tested.
- The 3D lessons were searched for sizes, plugs and part names, not played one by one.
- A real phone. The public site was compared for `index.html` and `sw.js` only.

## What I touched

- Repo: nothing. `git status --porcelain` is `?? .claude/` and the checksums of `index.html`, `sw.js`, the single-file
  copy, `assistant.js` and `progress.json` are the ones recorded at the start (`work/start-hashes.txt`).
- Shad's progress: read only.
- Email: four messages were opened to read them and left as they were found. Nothing was sent, moved, deleted or
  flagged.
- Downloads: to read the frame's hole pattern I fetched TBS's drawing file from GitHub; it turned out to be 95 MB.
  It went to this session's temp folder, was read, and was deleted. It gave no usable answer. Three manuals (TBS Unify,
  ToolkitRC M7AC, Skyzone M5F; under 6 MB each) were fetched the same way, read, and deleted.
- Memory board: two turns (10 and 13 minutes), both released. Scratch copies and test servers are gone.
- Written: this file and `work/` beside it; one row in `.claude/WORK-BOARD.md`; my status file on the memory board.

## Evidence files (kept on Shad's PC, not published)

- `shop/rotorvillage-read.txt`, `shop/rotorvillage-descriptions.txt`: every Rotor Village page, price, stock, description.
- `shop/other-shops-read.txt`, `shop/epicfpv-read.txt`, `shop/browser-reads-2026-11-12.txt`: the other shops.
- `shop/transport-canada-fees.txt`: the two fees and their dates.
- `receipts-2026-11-12.txt`: every receipt, line by line.
- `buy-page-browser-test.py` and `.log`; `open-shopping-list-button.py` and `.log`.
- `gate-in-faithful-scratch-copy.txt`, `gate-in-scratch-copy.txt`, `viewer-suite-run-1.txt` to `-3.txt`.
- `text/`: the page's words by tab, as read. `lines.txt`: the 50 lines as read. `coverage.py`: the finish-line check.
