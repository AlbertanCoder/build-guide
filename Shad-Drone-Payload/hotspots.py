"""Validated 32x24 thermal-frame hotspot grouping (4-connectivity)."""
from __future__ import annotations

import math
from collections import deque

WIDTH = 32
HEIGHT = 24
FRAME_SIZE = WIDTH * HEIGHT


def find_hotspots(frame, threshold_c, min_pixels):
    """Return hotspot dictionaries sorted by descending peak, then first pixel.

    Each result has x/y (pixel centroid), pixels and max_c, matching the guide.
    Diagonal-only pixels are separate groups. NaN/infinite readings are invalid.
    """
    if len(frame) != FRAME_SIZE:
        raise ValueError(f"Expected {FRAME_SIZE} values, got {len(frame)}")
    if isinstance(min_pixels, bool) or not isinstance(min_pixels, int) or min_pixels < 1:
        raise ValueError("min_pixels must be a positive integer")
    if not math.isfinite(float(threshold_c)):
        raise ValueError("threshold_c must be finite")
    values = [float(value) for value in frame]
    if not all(math.isfinite(value) for value in values):
        raise ValueError("frame contains NaN or infinity")

    hot = [value >= threshold_c for value in values]
    seen = [False] * FRAME_SIZE
    groups = []
    for start, is_hot in enumerate(hot):
        if not is_hot or seen[start]:
            continue
        queue = deque([start])
        seen[start] = True
        indices = []
        while queue:
            index = queue.popleft()
            indices.append(index)
            row, col = divmod(index, WIDTH)
            for nr, nc in ((row - 1, col), (row + 1, col),
                           (row, col - 1), (row, col + 1)):
                if 0 <= nr < HEIGHT and 0 <= nc < WIDTH:
                    neighbour = nr * WIDTH + nc
                    if hot[neighbour] and not seen[neighbour]:
                        seen[neighbour] = True
                        queue.append(neighbour)
        if len(indices) >= min_pixels:
            groups.append({
                "x": sum(index % WIDTH for index in indices) / len(indices),
                "y": sum(index // WIDTH for index in indices) / len(indices),
                "pixels": len(indices),
                "max_c": max(values[index] for index in indices),
                "first": min(indices),
            })

    groups.sort(key=lambda item: (-item["max_c"], item["first"]))
    return [{"x": g["x"], "y": g["y"], "pixels": g["pixels"],
             "max_c": g["max_c"]} for g in groups]
