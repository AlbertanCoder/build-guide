# Airframes — why this quad is built the way it is

tags:: airframe, 5-inch, quad, 4S, motors, 1900kv, stack, power, analog FPV, build, battery

Every block below carries a `source::` and a `verified::` line. The build script
refuses to publish a block without both, because an unsourced number is the one
failure this project has actually shipped.

## The parts are a chosen set, not a mood board

The airframe is a TBS Source One V6 5-inch frame with four Emax ECO III 2207
1900KV motors, Gemfan 51499 tri-blade props, and two different packs: a GNB
1500mAh 4S 120C HV LiPo and a More Volts 4S 5000mAh Li-ion (CA$48.99 frame and
CA$87.96 motors, checked 2026-11-03; CA$33.99 GNB and CA$63.99 More Volts,
checked 2026-11-04).

source:: Guide, Buy (buy list checked 2026-11-03 and 2026-11-04)
verified:: 2026-11-10

## The motor wind is a known trade-off

Retailers pitch the 1900 KV for 6S builds (Emax's own pages could not be opened to
confirm), and it is kept deliberately on 4S at roughly 550–570 g AUW with
restrained current — an efficiency-style build that still carries the payload.
Audit pass 2 recorded the trade-off and chose not to change it.

source:: Shad-Drone-Audit-Report.md, audit pass 2 (2026-10-31); retailer attribution per the guide's motor note (audit row E9)
verified:: 2026-11-10

## Power is split on purpose

The GEPRC TAKER F405 BLS 50A combo stack (CA$85.99, checked 2026-11-03, out of
stock at Rotor Village that day; check stock again at checkout) feeds the Pi through a regulated 5V/3A output;
the analog video transmitter runs from the flight controller's 9V pad (its cable
is soldered there in Step 3). Sensor boards take 3.3 V from the Qwiic HAT and
nothing in that chain takes 5 V.

source:: Order list; payload README wiring and power; Guide Step 3 (S3.4)
verified:: 2026-11-10

## Stock is a design constraint

The frame and the flight stack were both out of stock at Rotor Village on
3 Nov 2026 (checked 2026-11-03): the frame was in stock at EpicFPV, the stack only
at a US shop.
Confirm at checkout, and keep an alternate in the plan.

source:: Guide, Buy (stock badges and backups, checked 2026-11-03)
verified:: 2026-11-03

## Why it matters for your build

The airframe exists to carry a calibrated payload — thermal lens down, GPS
antenna up, independent retention, boards clear of carbon fibre. Bench-test
power and sensors before the first flight.

source:: payload README wiring; Guide steps 6–8
verified:: 2026-11-01