"""M3b: the buildable layer for the slice's playable areas (phase1-slice.md §5.5).

SUPERSEDED by pipeline/m3c_landcover.py (R8a): the slice now reads data/starts/slice_landcover.json, whose formable
classes are the buildable cells. Kept for reference, and for slope_pct, which m3c imports; slice_buildable.json
stays on disk until the land-cover layer is proven, then goes in its own commit.

Usage: pipeline/.venv/Scripts/python.exe -I pipeline/m3b_buildable.py
A cell is buildable if it is land on the present-day DEM, not water in the 1979 Landsat mask, and its slope on the
100 m grid is <= SLOPE_MAX_PCT. Reads the Spike A grid (git-ignored): grid.bin and water1979.bin
(pipeline/m1b_landsat_1979.py).
Writes data/starts/slice_buildable.json: per playable area, its buildable cells as row runs [y, x0, x1], inclusive.
A placeholder layer: the DEM is present-day, and the 1979 water mask is an automatic threshold (a lead).
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from m1_areas import runs  # noqa: E402
from slice_areas import GRID, ROOT, area_mask, load_areas, load_grid  # noqa: E402

OUT = ROOT / "data/starts/slice_buildable.json"
SLOPE_MAX_PCT = 15.0          # a placeholder: steeper hillsides need terracing the slice does not model


def slope_pct(elev, cell_m):
    """Steepest slope per cell, in percent, from central differences on the grid (one-sided at the edges)."""
    dy, dx = np.gradient(elev.astype(np.float64), cell_m)
    return np.hypot(dx, dy) * 100.0


def main():
    g = load_grid()
    H, W, cell = g["H"], g["W"], float(g["meta"]["cell_m"])
    m = area_mask(g)
    water79 = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(H, W)
    ok = (g["water"] == 0) & (water79 != 1) & (slope_pct(g["elev"], cell) <= SLOPE_MAX_PCT)
    areas = []
    for a in load_areas():
        if a["access"] != "playable":
            continue
        inside = m == a["id"]
        b = inside & ok
        areas.append({"id": a["id"], "key": a["key"], "cell_count": int(inside.sum()),
                      "buildable_count": int(b.sum()), "runs": runs(b)})
    out = {
        "format": 1,
        "generated_by": "pipeline/m3b_buildable.py",
        "areas_sha256": json.loads((ROOT / "data/starts/slice_areas.json").read_text(encoding="utf-8"))["areas_sha256"],
        "placeholder": True,
        "rule": "land on the present-day DEM, not water in the 1979 Landsat mask, slope <= slope_max_pct",
        "slope_max_pct": SLOPE_MAX_PCT,
        "caveats": [
            "The DEM is present-day: cut, fill and reclamation since 1979 are not undone.",
            "The 1979 water mask is an automatic Landsat threshold (lead), with no hand check.",
            "Slope is taken on the 100 m grid, which smooths small terraces and cuttings.",
        ],
        "grid": {"width": W, "height": H, "cell_m": cell},
        "areas": areas,
    }
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"
    OUT.write_text(text, encoding="utf-8", newline="\n")
    for a in areas:
        print(f"{a['id']} {a['key']:<16} {a['buildable_count']:>5} of {a['cell_count']:>5} cells buildable")


if __name__ == "__main__":
    main()
