import math
import os
import tempfile
import unittest
from pathlib import Path

from geo import footprint_dimensions, ground_offset_m, pixel_to_geo
from hotspots import find_hotspots
from map_server import MapStore
from payload import (BenchBackend, GpsThermalBackend, GroundReference, SyntheticBackend, bench_once, process_once,
                     run_bench, run_loop)


class HotspotTests(unittest.TestCase):
    def test_no_hotspots(self):
        self.assertEqual(find_hotspots([20] * 768, 60, 1), [])

    def test_single_pixel(self):
        frame = [20] * 768
        frame[100] = 90
        result = find_hotspots(frame, 60, 1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["pixels"], 1)
        self.assertEqual(result[0]["max_c"], 90)

    def test_adjacent_pair_is_one_group(self):
        frame = [20] * 768
        frame[65] = frame[66] = 80
        self.assertEqual(find_hotspots(frame, 60, 1)[0]["pixels"], 2)

    def test_diagonal_pair_is_separate(self):
        frame = [20] * 768
        frame[65] = frame[98] = 80
        self.assertEqual(len(find_hotspots(frame, 60, 1)), 2)

    def test_minimum_pixels_filters_group(self):
        frame = [20] * 768
        frame[65] = frame[66] = 80
        frame[100] = 85
        result = find_hotspots(frame, 60, 2)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["pixels"], 2)

    def test_edges_do_not_wrap(self):
        frame = [20] * 768
        frame[31] = frame[32] = 80
        self.assertEqual(len(find_hotspots(frame, 60, 1)), 2)

    def test_threshold_is_inclusive(self):
        frame = [60] + [20] * 767
        self.assertEqual(len(find_hotspots(frame, 60, 1)), 1)

    def test_nonfinite_rejected(self):
        frame = [20] * 768
        frame[0] = float("nan")
        with self.assertRaises(ValueError):
            find_hotspots(frame, 60, 1)

    def test_wrong_frame_size_rejected(self):
        with self.assertRaises(ValueError):
            find_hotspots([20] * 10, 60, 1)

    def test_invalid_minimum_rejected(self):
        with self.assertRaises(ValueError):
            find_hotspots([20] * 768, 60, 0)


class GeoTests(unittest.TestCase):
    def test_footprint_at_100m(self):
        width, height = footprint_dimensions(100)
        self.assertAlmostEqual(width, 104.1134101, places=5)
        self.assertAlmostEqual(height, 63.0597578, places=5)
        self.assertAlmostEqual(width * height, 6565.3664, places=2)

    def test_frame_centre_has_zero_offset(self):
        self.assertEqual(ground_offset_m(15.5, 11.5, 100), (0.0, 0.0))

    def test_right_edge_at_heading_zero(self):
        north, east = ground_offset_m(31, 11.5, 100, 0)
        self.assertAlmostEqual(north, 0)
        self.assertAlmostEqual(east, 50.4299330, places=5)

    def test_right_edge_at_heading_90(self):
        north, east = ground_offset_m(31, 11.5, 100, 90)
        self.assertAlmostEqual(north, -50.4299330, places=5)
        self.assertAlmostEqual(east, 0, places=7)

    def test_centre_geolocation(self):
        result = pixel_to_geo(15.5, 11.5, 100, 53.5, -113.5)
        self.assertEqual(result["lat"], 53.5)
        self.assertEqual(result["lon"], -113.5)

    def test_invalid_latitude_rejected(self):
        with self.assertRaises(ValueError):
            pixel_to_geo(0, 0, 100, 91, 0)

    def test_invalid_altitude_rejected(self):
        with self.assertRaises(ValueError):
            footprint_dimensions(0)


class PipelineTests(unittest.TestCase):
    def test_store_and_demo_pipeline(self):
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / "flight.jsonl"
            store = MapStore(log)
            records = process_once(SyntheticBackend(), store)
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["pixels"], 3)
            self.assertEqual(len(store.latest()), 1)
            self.assertEqual(len(log.read_text(encoding="utf-8").splitlines()), 1)
            reopened = MapStore(log)
            self.assertEqual(len(reopened.latest()), 1)

    def test_store_rejects_bad_coordinates(self):
        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            with self.assertRaises(ValueError):
                store.append({"lat": 100, "lon": 0})


class FakeMlx:
    """Thermal camera stand-in: three hot pixels in a vertical line at column x."""

    def __init__(self, x=31, y=11):
        self.x, self.y = x, y

    def getFrame(self, frame):
        for i in range(768):
            frame[i] = 22.0
        for yy in (self.y - 1, self.y, self.y + 1):
            frame[yy * 32 + self.x] = 90.0


class FakeGps:
    """GPS stand-in: update() moves to the next altitude; an item that is an exception class is raised."""

    def __init__(self, steps, lat=53.5461, lon=-113.4937):
        self.steps = list(steps)
        self.lat, self.lon = lat, lon
        self.data = {}

    def update(self):
        step = self.steps.pop(0) if len(self.steps) > 1 else self.steps[0]
        if isinstance(step, type) and issubclass(step, BaseException):
            raise step("simulated")
        self.data = {"gps_qual": 1, "latitude": self.lat, "longitude": self.lon, "altitude": step}


class HeightAboveGroundTests(unittest.TestCase):
    """GPS altitude is above SEA LEVEL (Edmonton is about 670 m); the footprint needs height above the GROUND."""

    def test_first_fix_becomes_the_ground_reference(self):
        ground = GroundReference()
        self.assertEqual(ground.height(670.0), 0.0)
        self.assertAlmostEqual(ground.height(700.0), 30.0)
        self.assertEqual(ground.ground_alt_m, 670.0)

    def test_explicit_ground_altitude_is_used(self):
        ground = GroundReference(670.0)
        self.assertAlmostEqual(ground.height(683.5), 13.5)
        self.assertFalse(ground.from_first_fix)

    def test_nonfinite_altitude_rejected(self):
        with self.assertRaises(RuntimeError):
            GroundReference(670.0).height(float("nan"))
        with self.assertRaises(ValueError):
            GroundReference(float("inf"))

    def test_sea_level_altitude_is_not_used_as_height(self):
        """A hotspot at the frame edge, 30 m up in Edmonton (GPS says 700 m above sea level)."""
        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            backend = GpsThermalBackend(FakeMlx(), FakeGps([700.0]), 0.0, ground_alt_m=670.0)
            records = process_once(backend, store)
            self.assertEqual(len(records), 1)
            record = records[0]
            self.assertAlmostEqual(record["camera_altitude_m"], 30.0)
            self.assertEqual(record["gps_altitude_m"], 700.0)
            self.assertEqual(record["ground_altitude_m"], 670.0)
            # about 15 m from the centre, as the real geometry says
            self.assertAlmostEqual(record["east_m"], 15.1, delta=0.5)
            self.assertLess(abs(record["east_m"]), 20)
            # the old behaviour fed 700 m in as the height: that lands the hotspot about 350 m away
            wrong = pixel_to_geo(31, 11, 700.0, 53.5461, -113.4937)
            self.assertGreater(abs(wrong["east_m"]), 300)

    def test_first_frame_on_the_ground_is_rejected_then_flight_works(self):
        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            backend = GpsThermalBackend(FakeMlx(), FakeGps([670.0, 670.0, 684.0]), 0.0)
            with self.assertRaises(RuntimeError):
                process_once(backend, store)         # first fix: height 0, ground set to 670
            self.assertEqual(backend.ground.ground_alt_m, 670.0)
            with self.assertRaises(RuntimeError):
                process_once(backend, store)         # still on the ground
            records = process_once(backend, store)   # 14 m up
            self.assertAlmostEqual(records[0]["camera_altitude_m"], 14.0)

    def test_height_zero_or_below_is_rejected_for_any_backend(self):
        class FixedHeight:
            def __init__(self, height):
                self.height = height

            def read(self):
                return [22.0] * 768, {"lat": 53.5, "lon": -113.5, "altitude_m": self.height, "heading_deg": 0.0}

        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            for bad in (0, -3.0, float("nan")):
                with self.assertRaises(RuntimeError):
                    process_once(FixedHeight(bad), store)
            self.assertEqual(store.latest(), [])


class LoopSurvivalTests(unittest.TestCase):
    def test_timeout_and_oserror_do_not_stop_the_loop(self):
        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            gps = FakeGps([TimeoutError, OSError, 700.0])
            backend = GpsThermalBackend(FakeMlx(), gps, 0.0, ground_alt_m=670.0)
            said = []
            done = run_loop(backend, store, max_iterations=3, sleep=lambda seconds: None, say=said.append)
            self.assertEqual(done, 3)
            self.assertTrue(any("TimeoutError" in m for m in said))
            self.assertTrue(any("OSError" in m for m in said))
            self.assertEqual(said[-1], "1 hotspot(s) logged")
            self.assertEqual(len(store.latest()), 1)

    def test_runtime_error_still_reported_and_survived(self):
        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            gps = FakeGps([700.0])
            gps.data = {}
            backend = GpsThermalBackend(FakeMlx(), gps, 0.0, ground_alt_m=670.0)
            gps.update = lambda: None            # never gets a fix
            said = []
            run_loop(backend, store, max_iterations=2, sleep=lambda seconds: None, say=said.append)
            self.assertEqual(len(said), 2)
            self.assertTrue(all("no usable fix" in m for m in said))

    def test_single_pass_without_serve(self):
        with tempfile.TemporaryDirectory() as folder:
            store = MapStore(Path(folder) / "flight.jsonl")
            done = run_loop(SyntheticBackend(), store, keep_going=False, say=lambda m: None)
            self.assertEqual(done, 1)
            self.assertEqual(len(store.latest()), 1)


class MugFrameMlx:
    """A mug on a table seen from 50 cm: a 3 x 3 patch at 70 C on a 22 C background."""

    def getFrame(self, frame):
        for i in range(768):
            frame[i] = 22.0
        for yy in (11, 12, 13):
            for xx in (15, 16, 17):
                frame[yy * 32 + xx] = 70.0


class BenchModeTests(unittest.TestCase):
    """Fable W1: the mug test must run without a GPS fix."""

    def test_bench_reads_the_camera_without_any_gps(self):
        backend = BenchBackend(MugFrameMlx())
        self.assertFalse(hasattr(backend, "gps"))
        frame, position = backend.read()
        self.assertEqual(len(frame), 768)
        self.assertEqual(position, {"altitude_m": 0.5})

    def test_bench_finds_the_mug_and_prints_it(self):
        said = []
        found = bench_once(BenchBackend(MugFrameMlx()), say=said.append)
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["pixels"], 9)
        self.assertEqual((found[0]["x"], found[0]["y"]), (16.0, 12.0))
        self.assertEqual(said, ["Hot spot at pixel (16.0, 12.0): 9 pixels, peak 70.0 C"])

    def test_bench_writes_nothing_to_disk(self):
        with tempfile.TemporaryDirectory() as folder:
            before = os.getcwd()
            os.chdir(folder)
            try:
                said = []
                done = run_bench(BenchBackend(MugFrameMlx()), max_iterations=2, sleep=lambda seconds: None,
                                 say=said.append)
            finally:
                os.chdir(before)
            self.assertEqual(done, 2)
            self.assertEqual(os.listdir(folder), [])
            self.assertTrue(said[0].startswith("Bench mode: thermal camera only, no GPS."))
            self.assertEqual(sum(1 for m in said if m.startswith("Hot spot at pixel")), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
