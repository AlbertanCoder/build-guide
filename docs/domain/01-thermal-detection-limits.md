# Thermal detection limits — what this camera can and cannot see

tags:: thermal, mlx90640, detection, resolution, pixel, range, sensitivity, fov, hot spot, limits, resolution limit

Every block below carries a `source::` and a `verified::` line. The build script
refuses to publish a block without both, because an unsourced number is the one
failure this project has actually shipped.

## The sensor is a 32 by 24 array

The MLX90640 gives 768 temperature readings per frame, at roughly ±2 °C over a
0–100 °C range. That is the specification, not a measured detection result.

source:: MLX90640 datasheet; Guide, Learn, Lesson 6 (the honest line)
verified:: 2026-11-03

## The ground footprint decides your pixel size

Ground width for a downward camera is 2 × altitude × tan(FOV ÷ 2). With the 55°
lens at 30 m that is about 31.2 m across, which over 32 pixels is roughly
0.98 m per pixel.

source:: Guide, Learn, Lesson 5 (altitude and coverage calculator)
verified:: 2026-11-03

## A one metre heat source at 30 m is about one pixel

At 30 m with the 55° lens a 1 m target covers about one pixel, so detection is a
sampling question before it is an algorithm question. This is why the guide
refuses to promise "finds a 1 m heat source from 30 m" as a capability.

source:: Guide, Learn, Lessons 5 and 6; audit pass 2 finding 12
verified:: 2026-11-03

## What the customer actually receives

FPInnovations describes the mission product as a map of GPS-referenced hotspots
delivered to the firefighter — not an aircraft that finds fires by itself. That
framing is what the prototype should be measured against.

source:: FPInnovations TR-2020-N29
verified:: 2026-11-01

## Accuracy and contrast are different numbers

±2 °C is absolute accuracy, not the smallest temperature difference the array can
resolve; thermal contrast sensitivity is a separate, smaller figure. Quoting the
accuracy figure as if it were sensitivity overstates detection capability.

source:: Not from a source — verify against the MLX90640 datasheet before quoting
verified:: 2026-11-01
