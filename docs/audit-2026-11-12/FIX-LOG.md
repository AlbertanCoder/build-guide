# Fixes made from the 12 Nov audit

Shad, 12 Nov 13:00: "Fix what you found", then "apply the ones that are correct and true and remove the information
that's not correct and true". Findings are in `FINDINGS.md`, beside this file.

Three answers from Shad during the work (multiple choice, 13:22 to 13:26): publish when the full check passes: yes;
the standoff sentence: "What do you recommend" (I wrote one sentence that is true for both kinds of standoff);
a same-shop freight line under "Buy next": yes.

## One line per finding

| ID | Status | What changed, or why it was left |
|---|---|---|
| W1 | FIXED | Line `stack`: "Only 4 left", checked 12 Nov (Rotor Village read again at 13:07: "$85.99 ... Only 4 left", "Current Stock: 4"). Its "on its way" note is replaced; the Stage 5 note now says the stack is back. Stage 5 is no longer shown as waiting on stock. |
| W2 | FIXED | The stage that opens in the list, and where Home's "Open the shopping list" lands, is now the stage "Buy next" names (`nextBuy()`), not the first stage still to buy. |
| W3 | FIXED | Line `pi`, second backup (Abra): now "Add to Cart shown, checked 12 Nov" with the shop's words "Availability: Delivery within 2-3 weeks" (read again at 13:07). The Stage 2 note says the same. |
| W4 | FIXED | Home's money card names the same next stage as "Buy next". When the week's money does not reach it: "Not enough for Stage N yet (CA$X)." and then "This week's money covers: ...". When every open stage waits on stock it says so; when all required stages are bought it says so. The old sentence "This is not enough for a whole stage yet." is gone. |
| B1 | FIXED | Line `qwiic`: the note names the cable ("Flexible Qwiic Cable - Female Jumper (4-pin)", CAB-17261, with its page) and warns off the look-alike with pins (PRT-17912). Both read at SparkFun at 13:09: US$1.95, in stock. |
| B2 | FIXED in part | Step 7 now says how the nylon standoffs fix to the Pi (stud: nut from the M2.5 set; hole at both ends: short screw from the set), names the M2.5 set under "You will need", and says to check what driver the set's screws take. The 3D lesson for that step says the same. Left: the key size for the M3 set screws, and new on-arrival tests (those live in three files with their own checks). |
| B3 | FIXED | A stage chip says "only N left, buy soon" also for a low line with no Canadian backup (required stages only). Today: flight stack, charger, antenna, GPS board, monitor. |
| B4 | FIXED | New line under "Buy next": which other stages the same shops sell, and that one order per shop costs less freight. No receipt amounts are shown on the page. |
| B5 | FIXED | A stage that waits on stock now also says how many of its lines can be bought now ("4 of its 6 lines can be bought now"), and keeps its low-stock words. |
| B6 | RETRACTED | Not a fault. The page already hides the "Not enough here" warning on a bought line (`index.html:239`). My audit test had read the hidden words. Proved in the browser: shown when the motors are not ticked, hidden when they are. |
| B7 | FIXED | One function (`stockCount`) reads the shop's count for both the line warning and the chip. |
| B8 | LEFT | It gives the right answer for every line today; changing which backups count would be a design change with nothing to gain now. |
| B9 | LEFT | Updating the US-dollar rate moves two prices by CA$0.42 in total and with them every total on the page, in the chat's knowledge and in the README. The lines already say "price from 30 Oct". |
| B10 | LEFT | The LED strip is Shad's own line: keep or drop is his choice. |
| B11 | LEFT | Whether the guide should name Liftoff is Shad's choice. |
| B12 | LEFT | Nothing on the page is wrong: the shop's price is CA$12.99 today. |
| B13 | LEFT | Changing a check, or the Step 5 camera move, needs Shad's yes (the repo's rule on checks). The gate passed 1749 of 1749 twice today after the fixes. |
| B14 | LEFT | Notes only (ask the shop about the charger's mains cable; the motor's screws are covered by the on-arrival test). No fact on the page is wrong. |

## Files changed in the guide

- `index.html`: the parts list (4 lines of facts, 2 stage notes), the Buy page code (4 places), Step 7 (2 places), one style line, one new line under "Buy next", the version tag.
- `sw.js`: offline copy `build-guide-v14` to `build-guide-v15`.
- `Shad's Build Guide.html` (and the untracked `dist` copy): rebuilt from this `index.html`.
- `docs/walkthrough/lessons/s7-after.js`: the same standoff sentence as the page.
- `docs/build-truth/geometry/buy_list.json`: the gate's copy of the parts list (equal to the page's).
- `docs/build-truth/VERIFICATION.md`, `verification-summary.json`: the date of today's verification run.

## Proof (the files named here are kept on Shad's PC, not published)

- Browser: `prove-fixes.py`, 711 checks, 0 failed, on the final `index.html` (`proof-browser.json`, `proof-browser.log`).
  Ten tick states at six money values on a laptop, the same ten at phone width, and one named check per fix.
- Full gate in the repo, on the final files: `1749/1749 named checks`, `GATE PASSED` (`gate-run.txt`, 13:27 to 13:31).
  The first run, before the last two edits, also passed (`gate-run-1.txt`).
- Shop pages read again at fix time: `shop-reads-fix1.txt`, `shop-reads-fix-b1.txt`, `refresh-check-only.txt`.
- Pictures at phone size: `buy-page-phone-after-1.png`, `buy-page-phone-after-2.png`.
- Tools: `edit-buy-data.js` (guarded parts-list edits), `patch-page.js` (guarded page patches).

## Undo

One commit holds all of it: `2f93afe`. `git revert 2f93afe` and a push take the guide back to `4df8c47`.
