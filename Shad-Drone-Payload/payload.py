"""Thermal/GPS payload loop with a deterministic demo backend.

Run demo:  python payload.py --demo --serve
Real Pi:    python payload.py --serve --heading 0
"""
from __future__ import annotations

import argparse
import threading
import time
from datetime import datetime, timezone

from geo import pixel_to_geo
from hotspots import find_hotspots
from map_server import MapStore, serve


class SyntheticBackend:
    def read(self):
        frame = [22.0] * 768
        for index in (366, 367, 398):
            frame[index] = 85.0 + (index % 2)
        position = {"lat": 53.5461, "lon": -113.4937,
                    "altitude_m": 30.0, "heading_deg": 0.0}
        return frame, position


class PiBackend:
    def __init__(self, heading_deg):
        import board
        import busio
        import adafruit_mlx90640
        from pa1010d import PA1010D

        self.heading_deg = heading_deg
        self.i2c = busio.I2C(board.SCL, board.SDA, frequency=800000)
        self.mlx = adafruit_mlx90640.MLX90640(self.i2c)
        self.mlx.refresh_rate = adafruit_mlx90640.RefreshRate.REFRESH_2_HZ
        self.gps = PA1010D()

    def read(self):
        self.gps.update()
        data = self.gps.data
        if not data.get("gps_qual") or data.get("latitude") is None or data.get("longitude") is None:
            raise RuntimeError("GPS has no usable fix; move the antenna outdoors with a clear sky view")
        if data.get("altitude") is None:
            raise RuntimeError("GPS altitude is unavailable")
        frame = [0] * 768
        try:
            self.mlx.getFrame(frame)
        except ValueError as error:
            raise RuntimeError("Thermal frame was not ready; retry") from error
        position = {"lat": data["latitude"], "lon": data["longitude"],
                    "altitude_m": float(data["altitude"]), "heading_deg": self.heading_deg}
        return frame, position


def process_once(backend, store, threshold_c=60.0, min_pixels=3):
    frame, position = backend.read()
    detected = find_hotspots(frame, threshold_c, min_pixels)
    records = []
    for hotspot in detected:
        coordinate = pixel_to_geo(
            hotspot["x"], hotspot["y"], position["altitude_m"],
            position["lat"], position["lon"], position["heading_deg"])
        record = {
            **hotspot,
            **coordinate,
            "camera_lat": position["lat"],
            "camera_lon": position["lon"],
            "camera_altitude_m": position["altitude_m"],
            "heading_deg": position["heading_deg"],
            "threshold_c": threshold_c,
            "captured_utc": datetime.now(timezone.utc).isoformat(),
        }
        records.append(store.append(record))
    return records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--heading", type=float, default=0.0)
    parser.add_argument("--threshold", type=float, default=60.0)
    parser.add_argument("--min-pixels", type=int, default=3)
    parser.add_argument("--log", default="flight-log.jsonl")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    store = MapStore(args.log)
    backend = SyntheticBackend() if args.demo else PiBackend(args.heading)
    if args.serve:
        threading.Thread(target=serve, args=(args.log, args.host, args.port), daemon=True).start()
        print(f"Map available at http://{args.host}:{args.port}")
    try:
        while True:
            try:
                records = process_once(backend, store, args.threshold, args.min_pixels)
                print(f"{len(records)} hotspot(s) logged")
            except RuntimeError as error:
                print(error)
            if not args.serve:
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
