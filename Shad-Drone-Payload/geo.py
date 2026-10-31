"""Ideal-nadir thermal-pixel geolocation with explicit validation.

This approximation ignores terrain, camera tilt, lens distortion, GPS error and
height/heading error. Validate against surveyed targets before field use.
"""
from __future__ import annotations

import math

METRES_PER_DEGREE = 111_320.0
WIDTH = 32
HEIGHT = 24


def footprint_dimensions(altitude_m, fov_x_deg=55.0, fov_y_deg=35.0):
    altitude = float(altitude_m)
    fov_x = float(fov_x_deg)
    fov_y = float(fov_y_deg)
    if not math.isfinite(altitude) or altitude <= 0:
        raise ValueError("altitude_m must be finite and greater than zero")
    if not (0 < fov_x < 170 and 0 < fov_y < 170):
        raise ValueError("FoV values must be between 0 and 170 degrees")
    width = 2 * altitude * math.tan(math.radians(fov_x / 2))
    height = 2 * altitude * math.tan(math.radians(fov_y / 2))
    return width, height


def ground_offset_m(x, y, altitude_m, heading_deg=0.0,
                    fov_x_deg=55.0, fov_y_deg=35.0):
    """Return (north_m, east_m) for a thermal pixel centroid.

    At heading zero (north), +x is east and +y is south. Heading is clockwise
    from north. Inputs may be fractional pixel centroids.
    """
    x = float(x)
    y = float(y)
    heading = float(heading_deg)
    if not all(math.isfinite(v) for v in (x, y, heading)):
        raise ValueError("pixel and heading values must be finite")
    if not (0 <= x <= WIDTH - 1 and 0 <= y <= HEIGHT - 1):
        raise ValueError("pixel is outside the 32x24 frame")
    width, height = footprint_dimensions(altitude_m, fov_x_deg, fov_y_deg)
    right = (x - (WIDTH - 1) / 2) * width / WIDTH
    down = (y - (HEIGHT - 1) / 2) * height / HEIGHT
    angle = math.radians(heading)
    north = -(down * math.cos(angle) + right * math.sin(angle))
    east = right * math.cos(angle) - down * math.sin(angle)
    return north, east


def pixel_to_geo(x, y, altitude_m, lat, lon, heading_deg=0.0,
                 fov_x_deg=55.0, fov_y_deg=35.0):
    """Return {lat, lon, north_m, east_m} for a thermal pixel centroid."""
    lat = float(lat)
    lon = float(lon)
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise ValueError("invalid latitude/longitude")
    if abs(abs(lat) - 90) < 1e-9:
        raise ValueError("longitude scaling is undefined at the poles")
    north, east = ground_offset_m(x, y, altitude_m, heading_deg,
                                  fov_x_deg, fov_y_deg)
    return {
        "lat": lat + north / METRES_PER_DEGREE,
        "lon": lon + east / (METRES_PER_DEGREE * math.cos(math.radians(lat))),
        "north_m": north,
        "east_m": east,
    }
