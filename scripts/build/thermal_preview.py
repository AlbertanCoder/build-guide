"""
thermal_preview.py - SIMULATION of what the MLX90640 (55 x 35 degrees, 32 x 24 pixels) would show of a campfire-sized
heat source from 10, 30, 60 and 100 m straight up. Not a measurement.

    python -I scripts/build/thermal_preview.py

Writes docs/build-truth/thermal-preview.json (for the page's slider) and docs/build-truth/THERMAL-PREVIEW.md.

How a pixel's reading is made here:
  1. Ground footprint and metres per pixel with the payload's own maths (Shad-Drone-Payload/geo.py:
     width = 2 x height x tan(55/2), depth = 2 x height x tan(35/2), divided by 32 and 24 pixels).
  2. A round target (1 m across) on flat ground at a stated temperature; everything else at the stated ground temperature.
  3. Each pixel sees a mix: the share of its footprint the target covers (worked out on a 24 x 24 grid inside the pixel).
     Mixing is done in infrared brightness (Planck's law over 8-14 micrometres, my assumption for the band), then
     turned back into a temperature: a small, very hot patch reads as a medium-warm pixel.
  4. Sensor noise added (fixed seed); readings clipped to the sensor's range (-40 to 300 C).
  5. The payload's own hotspot detector (Shad-Drone-Payload/hotspots.py, 60 C and at least 3 touching pixels) is run on
     the simulated frame.
"""

import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "Shad-Drone-Payload"))
import geo  # noqa: E402   (the payload's footprint maths)
import hotspots  # noqa: E402   (the payload's detector)

W, H = geo.WIDTH, geo.HEIGHT
HEIGHTS = [10, 30, 60, 100]
GROUND_C = 10.0                       # my assumption: ground and air at 10 C, no sun heating
NOISE_K_1HZ = 0.25                    # Melexis datasheet rev 11, Table 14: 1 Hz RMS noise averages 0.14 K and 0.25 K for the two
NOISE_K = NOISE_K_1HZ * math.sqrt(2)  # versions (larger used); payload runs at 2 Hz: x sqrt(2) is my assumption, not read off Fig. 19
RANGE_C = (-40.0, 300.0)              # Pimoroni: "-40 to 300°C detection with approximately 1°C accuracy"; Melexis: "Target temperature -40°C … 300°C"
THRESHOLD_C, MIN_PIXELS = 60.0, 3     # Shad-Drone-Payload/payload.py defaults (--threshold 60, --min-pixels 3)
SEED = 20261103
SUB = 24                              # sub-samples per pixel side for the coverage share

TARGETS = [
    {"id": "burning", "name": "Burning campfire", "diameter_m": 1.0, "temp_c": 510.0,
     "source": "Fraser, Choo, Kimble, Sutch, 'The morning after the night before: campfires revisited', Med J Aust 2003; 178(1): 30 "
               "(https://www.mja.com.au/journal/2003/178/1/morning-after-night-campfires-revisited): 'Each of the fires burned at greater "
               "than 510oC.' 510 C is the lowest value they give; the 1 m size is my choice ('campfire-sized')."},
    {"id": "buried", "name": "Campfire buried in sand, 8 hours later", "diameter_m": 1.0, "temp_c": 91.0,
     "source": "Same study: 'After 8 hours, the mean temperature was 91°C (range, 77°–118°C).' Read through a small hole in the sand, "
               "so it is a stand-in: the sand's own surface is probably cooler (not measured)."},
]


def band_radiance(t_c, lo=8e-6, hi=14e-6, n=200):
    """relative in-band radiance (Planck, 8-14 um) of a black body at t_c Celsius."""
    h, c, k = 6.62607015e-34, 2.99792458e8, 1.380649e-23
    lam = np.linspace(lo, hi, n)
    t = np.asarray(t_c, float)[..., None] + 273.15
    b = (2 * h * c ** 2 / lam ** 5) / (np.exp(h * c / (lam * k * t)) - 1.0)
    return np.trapezoid(b, lam, axis=-1) if hasattr(np, "trapezoid") else np.trapz(b, lam, axis=-1)


_T = np.arange(-60.0, 1201.0, 0.25)
_L = band_radiance(_T)


def radiance_to_c(L):
    return np.interp(L, _L, _T)


def coverage(height_m, diameter_m, centre_px):
    """share of each pixel's footprint covered by a round target centred at centre_px (fractional pixel coordinates)."""
    fw, fh = geo.footprint_dimensions(height_m)
    px_w, px_h = fw / W, fh / H
    r = diameter_m / 2.0
    cx, cy = centre_px
    sub = (np.arange(SUB) + 0.5) / SUB
    cov = np.zeros((H, W))
    for row in range(H):
        for col in range(W):
            # only pixels near the target need sampling
            dx0 = abs((col + 0.5 - cx) * px_w) - px_w
            dy0 = abs((row + 0.5 - cy) * px_h) - px_h
            if dx0 > r or dy0 > r:
                continue
            X = (col + sub[None, :] - cx) * px_w
            Y = (row + sub[:, None] - cy) * px_h
            cov[row, col] = float(((X ** 2 + Y ** 2) <= r * r).mean())
    return cov, px_w, px_h


def frame(height_m, target, centre_px, rng):
    cov, px_w, px_h = coverage(height_m, target["diameter_m"], centre_px)
    L = cov * band_radiance(target["temp_c"]) + (1 - cov) * band_radiance(GROUND_C)
    t = radiance_to_c(L) + rng.normal(0.0, NOISE_K, (H, W))
    return np.clip(t, *RANGE_C), cov, px_w, px_h


def main():
    rng = np.random.default_rng(SEED)
    placements = {"corner": (W / 2.0, H / 2.0), "centre": (W / 2.0 + 0.5, H / 2.0 + 0.5)}
    out = {
        "label": "SIMULATION - not a measurement",
        "what": "What the MLX90640 thermal camera (55 x 35 degrees, 32 x 24 pixels) would show of a 1 m heat source on flat ground, "
                "seen from straight above.",
        "sensor": {"pixels": [W, H], "fov_deg": [55.0, 35.0], "range_c": list(RANGE_C),
                   "accuracy": "about 1 C (Pimoroni); the Melexis datasheet adds: only when the object fills the pixel's view, under "
                               "settled conditions, and +-2 % of the difference from the sensor's own temperature",
                   "noise_k_rms": round(NOISE_K, 2),
                   "noise_source": "Melexis MLX90640 datasheet rev 11 Table 14: 1 Hz RMS noise averages 0.14 K and 0.25 K (larger used); "
                                   "x sqrt(2) for the payload's 2 Hz is my assumption",
                   "datasheet": ".claude/audit-2026-11-03/sources/melexis/MLX90640-Datasheet-sparkfun.pdf (copy of "
                                "https://cdn.sparkfun.com/assets/3/1/c/6/f/MLX90640-Datasheet.pdf)"},
        "detector": {"threshold_c": THRESHOLD_C, "min_pixels": MIN_PIXELS,
                     "code": "Shad-Drone-Payload/hotspots.py find_hotspots (4-connected pixels), defaults from payload.py"},
        "ground_c": GROUND_C,
        "maths": "footprint = 2 x height x tan(FOV/2) (Shad-Drone-Payload/geo.py, same as the guide's coverage calculator); each pixel "
                 "mixes target and ground by the share of its footprint the target covers, mixed in 8-14 um infrared brightness",
        "placement": "Main grids: the target centred where four pixels meet (a fair case). Also reported: centred on one pixel (hotter peak, but fewer pixels, so it can miss the 3-pixel rule).",
        "seed": SEED,
        "targets": [],
        "not_simulated": ["smoke and steam between the fire and the camera", "wind, flames moving, flicker",
                          "emissivity (every surface treated as a perfect emitter)", "sun-heated rocks, roofs, roads or vehicles",
                          "lens blur (the real pixel edges are soft, which spreads and lowers a small hot spot further)",
                          "drone tilt, height error and motion during the 0.5 s frame", "trees, grass or anything covering the fire",
                          "real fires: a campfire is not a flat 1 m disc at one temperature"],
    }
    for tg in TARGETS:
        rows = []
        for h in HEIGHTS:
            fw, fh = geo.footprint_dimensions(h)
            res = {}
            for pname, c in placements.items():
                t, cov, px_w, px_h = frame(h, tg, c, rng)
                spots = hotspots.find_hotspots([float(v) for v in t.ravel()], THRESHOLD_C, MIN_PIXELS)
                hot = int((t >= THRESHOLD_C).sum())
                res[pname] = {"grid_c": [[round(float(v), 1) for v in r] for r in t], "max_c": round(float(t.max()), 1),
                              "pixels_touched": int((cov > 0).sum()), "pixels_full": int((cov >= 0.999).sum()),
                              "target_in_pixels": round(float(cov.sum()), 3), "pixels_at_or_above_threshold": hot,
                              "detector_triggers": bool(spots), "hotspots": spots}
            main = res["corner"]
            rows.append({
                "height_m": h, "footprint_m": [round(fw, 1), round(fh, 1)], "m_per_pixel": [round(fw / W, 2), round(fh / H, 2)],
                "target_share_of_one_pixel_pct": round(100 * math.pi * (tg["diameter_m"] / 2) ** 2 / ((fw / W) * (fh / H)), 1),
                "grid_c": main["grid_c"], "max_c": main["max_c"], "pixels_touched": main["pixels_touched"],
                "pixels_full": main["pixels_full"], "pixels_at_or_above_threshold": main["pixels_at_or_above_threshold"],
                "detector_triggers": main["detector_triggers"],
                "if_centred_on_one_pixel": {k: res["centre"][k] for k in ("max_c", "pixels_touched", "pixels_at_or_above_threshold",
                                                                                  "detector_triggers")},
            })
        out["targets"].append(dict(tg, heights=rows))
    with open(os.path.join(ROOT, "docs", "build-truth", "thermal-preview.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)

    L = ["# What the thermal camera would see (SIMULATION, not a measurement)", "",
         "Made by `python -I scripts/build/thermal_preview.py`; the numbers for the page are in `thermal-preview.json`.", "",
         "## In plain words", "",
         "A 1 m heat source seen from straight above by the 32 x 24 pixel thermal camera (55 x 35 degree view). The higher the drone, "
         "the more ground each pixel covers. When the fire is smaller than one pixel, that pixel reads a blend of fire and cold ground, "
         "so it looks much cooler than the fire really is. The payload's detector needs 60 C or more on at least 3 touching pixels.", ""]
    for tg in out["targets"]:
        L += [f"### {tg['name']} ({tg['temp_c']:.0f} C, {tg['diameter_m']:.0f} m across)", "",
              "| Height | Ground seen | Metres per pixel | Fire's size, in pixels | Hottest pixel | Pixels at 60 C+ | Detector fires? | If centred on one pixel instead |",
              "|---|---|---|---|---|---|---|---|"]
        for r in tg["heights"]:
            b = r["if_centred_on_one_pixel"]
            L.append(f"| {r['height_m']} m | {r['footprint_m'][0]} x {r['footprint_m'][1]} m | {r['m_per_pixel'][0]} x {r['m_per_pixel'][1]} | "
                     f"{r['target_share_of_one_pixel_pct'] / 100:.2f} | {r['max_c']} C | {r['pixels_at_or_above_threshold']} | "
                     f"{'yes' if r['detector_triggers'] else 'no'} | {b['max_c']} C, {b['pixels_at_or_above_threshold']} px, "
                     f"{'yes' if b['detector_triggers'] else 'no'} |")
        L += ["", "Source: " + tg["source"], ""]
    L += ["## Assumptions", "",
          f"- Ground at {GROUND_C:.0f} C (my assumption). Sensor noise {NOISE_K:.2f} C (see the JSON for the source). Readings clipped at -40 and 300 C, the sensor's range.",
          "- Infrared mixing over 8-14 micrometres (my assumption for the sensor's band; the datasheet text I have does not state it).",
          "- Main case: fire centred where four pixels meet. Also shown: fire centred on one pixel (hotter single pixel, fewer pixels).", "",
          "## Not simulated", ""] + ["- " + s for s in out["not_simulated"]]
    with open(os.path.join(ROOT, "docs", "build-truth", "THERMAL-PREVIEW.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    for tg in out["targets"]:
        for r in tg["heights"]:
            b = r["if_centred_on_one_pixel"]
            print(f"{tg['id']:8s} {r['height_m']:4d} m  {r['m_per_pixel'][0]:5.2f} x {r['m_per_pixel'][1]:5.2f} m/px  share {r['target_share_of_one_pixel_pct']:6.1f}%  "
                  f"max {r['max_c']:6.1f} C  hot px {r['pixels_at_or_above_threshold']:3d}  trigger {r['detector_triggers']}  | one pixel: max {b['max_c']} hot {b['pixels_at_or_above_threshold']} trigger {b['detector_triggers']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
