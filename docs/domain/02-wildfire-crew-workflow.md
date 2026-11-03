# Wildfire crew workflow — what the mission actually delivers

tags:: wildfire, crew, workflow, mission, hotspot map, reporting, FPInnovations, operations, safe targets, mug of hot water, VLOS

Every block below carries a `source::` and a `verified::` line. The build script
refuses to publish a block without both, because an unsourced number is the one
failure this project has actually shipped.

## The mission product is a map, not an autopilot

FPInnovations describes the deliverable as a map of GPS-referenced hotspots
handed to the firefighter — not an aircraft that finds fires by itself. The
prototype should be measured against that framing.

source:: FPInnovations TR-2020-N29 (2020), as cited in Guide tab 7 and domain 01
verified:: 2026-11-01

## A real fire is agency airspace

Unauthorised drones near a wildfire ground air tankers and endanger crews, which
is why the guide says plainly that no drone may fly over or within 5 nautical
miles (9.3 km) of a wildfire below 3,000 ft (CAR 601.15). Real fires are not
practice.

source:: Guide tab 1 and tab 4; CAR 601.15
verified:: 2026-11-01

## Training happens on safe heat targets

You train on a safe heat target: a mug of hot water, never a fire. The
acceptance run is the Step 8 heat test over the mug among cold objects, then
replaying the logged map.

source:: Guide Step 8 heat test; DECISIONS (heat target = a mug of hot water)
verified:: 2026-11-03

## Reports keep measured values and limitations

The pipeline's report step logs what was actually measured and the limitations
that came with it; no unsupported briefing is claimed. The acceptance step is
repeated controlled tests with logged error and honest limitations.

source:: Guide CHAIN steps 5 and 6; payload README limitations
verified:: 2026-11-01

## Why it matters for your build

The build is judged on delivering a credible hotspot map a crew could act on,
with the caveats attached — not on "finding fires". Every design choice that
looks conservative follows from that.

source:: Guide tab 1; FPInnovations TR-2020-N29 (2020)
verified:: 2026-11-01