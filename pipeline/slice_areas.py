"""Stand-in slice areas on the Spike A grid, from the proxy subdistricts in phase1-slice.md §3 (v0.3).

Replaced by content/slice/areas.yaml in M1. Import: from slice_areas import load_grid, area_mask
"""
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
GRID = ROOT / "apps/map-spike/public/grid"
AREAS = {  # area -> (key, proxy subdistricts without 街道)
    1: ("market_town", ["东门", "翠竹"]), 2: ("luohu_crossing", ["南湖"]), 3: ("caiwuwei", ["桂园"]),
    4: ("huangbeiling", ["黄贝"]), 5: ("sungang", ["笋岗", "清水河"]), 6: ("donghu_liantang", ["东湖", "东晓", "莲塘"]),
    7: ("shangbu", ["华强北", "园岭"]), 8: ("shekou", ["蛇口", "招商"]), 9: ("nantou", ["南头"]),
}


def load_grid():
    meta = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))
    W, H = meta["width"], meta["height"]
    n = W * H
    raw = (GRID / "grid.bin").read_bytes()
    g = {
        "meta": meta, "W": W, "H": H,
        "elev": np.frombuffer(raw, "<i2", n, 0).reshape(H, W),
        "water": np.frombuffer(raw, "u1", n, 2 * n).reshape(H, W),
        "dist": np.frombuffer(raw, "u1", n, 3 * n).reshape(H, W),
        "sub": np.frombuffer(raw, "<u2", n, 4 * n).reshape(H, W),
    }
    return g


def area_mask(g):
    """uint8 grid: slice area number per cell (0 = none)."""
    ids = {s["name"]: s["id"] for s in g["meta"]["subdistricts"]}
    out = np.zeros((g["H"], g["W"]), dtype=np.uint8)
    for a, (_, subs) in AREAS.items():
        for s in subs:
            out[g["sub"] == ids[s + "街道"]] = a
    return out
