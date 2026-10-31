import math
import tempfile
import unittest
from pathlib import Path

from geo import footprint_dimensions, ground_offset_m, pixel_to_geo
from hotspots import find_hotspots
from map_server import MapStore
from payload import SyntheticBackend, process_once


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


if __name__ == "__main__":
    unittest.main(verbosity=2)
