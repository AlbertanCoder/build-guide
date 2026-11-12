# ML and computer vision — what the payload code does and does not claim

tags:: ml, computer vision, hotspots, threshold, connectivity, geolocation, logging, payload, ai, briefing, hotspots.py, geo.py

Every block below carries a `source::` and a `verified::` line. The build script
refuses to publish a block without both, because an unsourced number is the one
failure this project has actually shipped.

## Hotspot detection here is grouping, not learning

hotspots.py groups connected warm pixels — 4-connectivity, minimum size, and a
threshold inclusion rule — rather than running a learned model. The standard
library suite covers no/single/multiple hotspots, connectivity, minimum size,
edge cases, the end-to-end synthetic pipeline and the bench mode (31 synthetic tests
in the whole package).

source:: payload README tests section; Guide CHAIN step 2
verified:: 2026-11-03

## The resolution floor comes before the algorithm

At 30 m with the 55° lens a 1 m heat source covers about one pixel, so detection
is a sampling question before it is an algorithm question. Ideal-nadir geometry
also omits tilt, terrain, lens distortion and GPS/altitude/heading errors.

source:: domain 01; payload README limitations; Guide, Learn, Lesson 5 (calculator)
verified:: 2026-11-03

## Geolocation is geometry plus assumptions

geo.py turns GPS position, altitude and heading into coordinates for each
detected hotspot. Heading must be set clockwise from north — the code does not
infer reliable heading while stationary — and surveyed-target error is still to
be measured.

source:: payload README run-on-hardware section; Guide CHAIN step 3
verified:: 2026-11-01

## The log is the record, the viewer is a convenience

flight-log.jsonl is the authoritative append-only record; the map viewer is an
offline coordinate plot, not internet map tiles. Reports keep measured values
and limitations, and no unsupported AI briefing is claimed.

source:: payload README verify-the-demo section; Guide CHAIN steps 4 and 5
verified:: 2026-11-01

## Why it matters for your build

What matters is the honest pipeline — group, locate, map, report, prove —
not a model claim. Each stage is testable on the bench before anything flies.

source:: Guide, Learn, Lesson 5 ("the pipeline matters more than the airframe"); payload README
verified:: 2026-11-03