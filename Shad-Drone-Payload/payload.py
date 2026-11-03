"""Thermal/GPS payload loop with a deterministic demo backend.

Run demo:  python payload.py --demo --serve
Real Pi:    python payload.py --serve --heading 0
            python payload.py --serve --heading 0 --ground-alt-m 670
Bench test: python payload.py --bench     (the real thermal camera, no GPS: the mug test indoors)

Height: the GPS reports altitude above SEA LEVEL (Edmonton is about 670 m). The footprint maths needs height
above the GROUND. The payload takes the ground reference from the first GPS fix it sees (switch it on while the
drone is on the ground), or from --ground-alt-m, and subtracts it. A frame whose height is zero or below is
rejected, not guessed.
"""
from __future__ import annotations

import argparse
import math
import threading
import time
from datetime import datetime, timezone

from geo import footprint_dimensions, pixel_to_geo
from hotspots import find_hotspots
from map_server import MapStore, serve

# Anything a flaky bus, a missing fix or a slow GPS library can raise. The loop prints it and carries on.
RECOVERABLE = (RuntimeError, TimeoutError, OSError)


class SyntheticBackend:
    """Demo data. altitude_m is already a height above the ground."""

    def read(self):
        frame = [22.0] * 768
        for index in (366, 367, 398):
            frame[index] = 85.0 + (index % 2)
        position = {"lat": 53.5461, "lon": -113.4937,
                    "altitude_m": 30.0, "heading_deg": 0.0}
        return frame, position


class GroundReference:
    """Turns GPS altitude (above sea level) into height above the ground.

    The ground altitude is fixed once: by the caller (--ground-alt-m) or by the first reading it is shown.
    """

    def __init__(self, ground_alt_m=None):
        if ground_alt_m is not None:
            ground_alt_m = float(ground_alt_m)
            if not math.isfinite(ground_alt_m):
                raise ValueError("ground altitude must be a finite number")
        self.ground_alt_m = ground_alt_m
        self.from_first_fix = ground_alt_m is None

    def height(self, gps_alt_m):
        gps_alt_m = float(gps_alt_m)
        if not math.isfinite(gps_alt_m):
            raise RuntimeError("GPS altitude is not a finite number")
        if self.ground_alt_m is None:
            self.ground_alt_m = gps_alt_m
        return gps_alt_m - self.ground_alt_m


class GpsThermalBackend:
    """Reads a thermal camera and a GPS. The devices are passed in, so the logic can be tested without a Pi."""

    def __init__(self, mlx, gps, heading_deg, ground_alt_m=None):
        self.mlx = mlx
        self.gps = gps
        self.heading_deg = heading_deg
        self.ground = GroundReference(ground_alt_m)

    def read(self):
        self.gps.update()
        data = self.gps.data
        if not data.get("gps_qual") or data.get("latitude") is None or data.get("longitude") is None:
            raise RuntimeError("GPS has no usable fix; move the antenna outdoors with a clear sky view")
        if data.get("altitude") is None:
            raise RuntimeError("GPS altitude is unavailable")
        first = self.ground.ground_alt_m is None
        gps_alt = float(data["altitude"])
        height = self.ground.height(gps_alt)
        if first:
            print(f"Ground height set to {self.ground.ground_alt_m:.1f} m above sea level from the first GPS fix. "
                  "Fly only after this line appears.")
        if height <= 0:
            raise RuntimeError(
                f"Height above ground is {height:.1f} m (GPS {gps_alt:.1f} m, ground {self.ground.ground_alt_m:.1f} m); "
                "frame skipped until the drone is above the ground reference")
        frame = [0] * 768
        try:
            self.mlx.getFrame(frame)
        except ValueError as error:
            raise RuntimeError("Thermal frame was not ready; retry") from error
        position = {"lat": data["latitude"], "lon": data["longitude"],
                    "altitude_m": height, "heading_deg": self.heading_deg,
                    "gps_altitude_m": gps_alt, "ground_altitude_m": self.ground.ground_alt_m}
        return frame, position


def open_thermal_camera():
    """The MLX90640 on the Pi's I2C bus, at 2 Hz. Returns (i2c, mlx)."""
    import board
    import busio
    import adafruit_mlx90640

    # The I2C speed on a Pi is set in the config file (dtparam=i2c_arm_baudrate=400000), not by this call: a
    # frequency passed here is ignored. The file is /boot/firmware/config.txt on Pi OS bookworm and later and
    # /boot/config.txt before (Adafruit's "Change the Clock Speed" guide). See the README install steps.
    i2c = busio.I2C(board.SCL, board.SDA)
    mlx = adafruit_mlx90640.MLX90640(i2c)
    mlx.refresh_rate = adafruit_mlx90640.RefreshRate.REFRESH_2_HZ
    return i2c, mlx


class PiBackend(GpsThermalBackend):
    def __init__(self, heading_deg, ground_alt_m=None):
        from pa1010d import PA1010D

        i2c, mlx = open_thermal_camera()
        super().__init__(mlx, PA1010D(), heading_deg, ground_alt_m)
        self.i2c = i2c


BENCH_HEIGHT_M = 0.5


class BenchBackend:
    """Bench mode (--bench): the real thermal camera and NO GPS, so the mug test runs indoors.

    The flight backend asks the GPS first and stops without a fix (Fable's review, W1), so it never reads the
    camera on a table. Bench mode reads only the camera. The camera is taken to be BENCH_HEIGHT_M above the table;
    no position is worked out and nothing is written to the flight log, so no made-up place reaches the map.
    """

    def __init__(self, mlx, height_m=BENCH_HEIGHT_M):
        self.mlx = mlx
        self.height_m = height_m

    def read(self):
        frame = [0] * 768
        try:
            self.mlx.getFrame(frame)
        except ValueError as error:
            raise RuntimeError("Thermal frame was not ready; retry") from error
        return frame, {"altitude_m": self.height_m}


def bench_once(backend, threshold_c=60.0, min_pixels=3, say=print):
    """Read one frame and print every hot spot (same detector as in flight). Returns the hot spots."""
    frame, _ = backend.read()
    found = find_hotspots(frame, threshold_c, min_pixels)
    if not found:
        say(f"No hot spot: nothing at or above {threshold_c:g} C over {min_pixels} or more pixels")
    for spot in found:
        say(f"Hot spot at pixel ({spot['x']:.1f}, {spot['y']:.1f}): {spot['pixels']} pixels, "
            f"peak {spot['max_c']:.1f} C")
    return found


def run_bench(backend, threshold_c=60.0, min_pixels=3, sleep=time.sleep, max_iterations=None, say=print):
    """Bench loop: read and print until stopped (Ctrl+C). Writes nothing to disk."""
    width, height = footprint_dimensions(backend.height_m)
    say(f"Bench mode: thermal camera only, no GPS. At {backend.height_m * 100:.0f} cm above the table it sees "
        f"about {width * 100:.0f} x {height * 100:.0f} cm. Nothing is written to the flight log.")
    done = 0
    while True:
        try:
            bench_once(backend, threshold_c, min_pixels, say)
        except RECOVERABLE as error:
            say(f"{type(error).__name__}: {error}")
        done += 1
        if max_iterations is not None and done >= max_iterations:
            return done
        sleep(0.5)


def process_once(backend, store, threshold_c=60.0, min_pixels=3):
    frame, position = backend.read()
    height = position["altitude_m"]
    if not isinstance(height, (int, float)) or not math.isfinite(height) or height <= 0:
        raise RuntimeError(f"Height above ground must be above zero (got {height!r}); frame skipped")
    detected = find_hotspots(frame, threshold_c, min_pixels)
    records = []
    for hotspot in detected:
        coordinate = pixel_to_geo(
            hotspot["x"], hotspot["y"], height,
            position["lat"], position["lon"], position["heading_deg"])
        record = {
            **hotspot,
            **coordinate,
            "camera_lat": position["lat"],
            "camera_lon": position["lon"],
            "camera_altitude_m": height,
            "heading_deg": position["heading_deg"],
            "threshold_c": threshold_c,
            "captured_utc": datetime.now(timezone.utc).isoformat(),
        }
        if "gps_altitude_m" in position:
            record["gps_altitude_m"] = position["gps_altitude_m"]
            record["ground_altitude_m"] = position["ground_altitude_m"]
        records.append(store.append(record))
    return records


def run_loop(backend, store, threshold_c=60.0, min_pixels=3, keep_going=True,
             sleep=time.sleep, max_iterations=None, say=print):
    """Read, detect and log until stopped. A recoverable error is reported and the loop carries on."""
    done = 0
    while True:
        try:
            records = process_once(backend, store, threshold_c, min_pixels)
            say(f"{len(records)} hotspot(s) logged")
        except RECOVERABLE as error:
            say(f"{type(error).__name__}: {error}")
        done += 1
        if not keep_going or (max_iterations is not None and done >= max_iterations):
            return done
        sleep(0.5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--bench", action="store_true",
                        help="Bench test: read the real thermal camera with no GPS and print every hot spot "
                             "(the mug test). Writes nothing to the flight log.")
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--heading", type=float, default=0.0)
    parser.add_argument("--ground-alt-m", type=float, default=None,
                        help="GPS altitude above sea level at the take-off spot, in metres. "
                             "If left out, the first GPS fix is used (switch on while on the ground).")
    parser.add_argument("--threshold", type=float, default=60.0)
    parser.add_argument("--min-pixels", type=int, default=3)
    parser.add_argument("--log", default="flight-log.jsonl")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    if args.bench:
        _, mlx = open_thermal_camera()
        try:
            run_bench(BenchBackend(mlx), args.threshold, args.min_pixels)
        except KeyboardInterrupt:
            pass
        return

    store = MapStore(args.log)
    backend = SyntheticBackend() if args.demo else PiBackend(args.heading, args.ground_alt_m)
    if args.serve:
        threading.Thread(target=serve, args=(args.log, args.host, args.port), daemon=True).start()
        print(f"Map available at http://{args.host}:{args.port}")
    try:
        run_loop(backend, store, args.threshold, args.min_pixels, keep_going=args.serve)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
