# What the thermal camera would see (SIMULATION, not a measurement)

Made by `python -I scripts/build/thermal_preview.py`; the numbers for the page are in `thermal-preview.json`.

## In plain words

A 1 m heat source seen from straight above by the 32 x 24 pixel thermal camera (55 x 35 degree view). The higher the drone, the more ground each pixel covers. When the fire is smaller than one pixel, that pixel reads a blend of fire and cold ground, so it looks much cooler than the fire really is. The payload's detector needs 60 C or more on at least 3 touching pixels.

### Burning campfire (510 C, 1 m across)

| Height | Ground seen | Metres per pixel | Fire's size, in pixels | Hottest pixel | Pixels at 60 C+ | Detector fires? | If centred on one pixel instead |
|---|---|---|---|---|---|---|---|
| 10 m | 10.4 x 6.3 m | 0.33 x 0.26 | 9.19 | 300.0 C | 16 | yes | 300.0 C, 15 px, yes |
| 30 m | 31.2 x 18.9 m | 0.98 x 0.79 | 1.02 | 209.0 C | 4 | yes | 300.0 C, 3 px, yes |
| 60 m | 62.5 x 37.8 m | 1.95 x 1.58 | 0.26 | 82.3 C | 4 | yes | 205.7 C, 1 px, no |
| 100 m | 104.1 x 63.1 m | 3.25 x 2.63 | 0.09 | 41.4 C | 0 | no | 104.2 C, 1 px, no |

Source: Fraser, Choo, Kimble, Sutch, 'The morning after the night before: campfires revisited', Med J Aust 2003; 178(1): 30 (https://www.mja.com.au/journal/2003/178/1/morning-after-night-campfires-revisited): 'Each of the fires burned at greater than 510oC.' 510 C is the lowest value they give; the 1 m size is my choice ('campfire-sized').

### Campfire buried in sand, 8 hours later (91 C, 1 m across)

| Height | Ground seen | Metres per pixel | Fire's size, in pixels | Hottest pixel | Pixels at 60 C+ | Detector fires? | If centred on one pixel instead |
|---|---|---|---|---|---|---|---|
| 10 m | 10.4 x 6.3 m | 0.33 x 0.26 | 9.19 | 91.4 C | 8 | yes | 91.4 C, 9 px, yes |
| 30 m | 31.2 x 18.9 m | 0.98 x 0.79 | 1.02 | 36.5 C | 0 | no | 85.3 C, 1 px, no |
| 60 m | 62.5 x 37.8 m | 1.95 x 1.58 | 0.26 | 17.3 C | 0 | no | 35.3 C, 0 px, no |
| 100 m | 104.1 x 63.1 m | 3.25 x 2.63 | 0.09 | 13.2 C | 0 | no | 19.6 C, 0 px, no |

Source: Same study: 'After 8 hours, the mean temperature was 91°C (range, 77°–118°C).' Read through a small hole in the sand, so it is a stand-in: the sand's own surface is probably cooler (not measured).

## Assumptions

- Ground at 10 C (my assumption). Sensor noise 0.35 C (see the JSON for the source). Readings clipped at -40 and 300 C, the sensor's range.
- Infrared mixing over 8-14 micrometres (my assumption for the sensor's band; the datasheet text I have does not state it).
- Main case: fire centred where four pixels meet. Also shown: fire centred on one pixel (hotter single pixel, fewer pixels).

## Not simulated

- smoke and steam between the fire and the camera
- wind, flames moving, flicker
- emissivity (every surface treated as a perfect emitter)
- sun-heated rocks, roofs, roads or vehicles
- lens blur (the real pixel edges are soft, which spreads and lowers a small hot spot further)
- drone tilt, height error and motion during the 0.5 s frame
- trees, grass or anything covering the fire
- real fires: a campfire is not a flat 1 m disc at one temperature
