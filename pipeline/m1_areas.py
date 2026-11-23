"""M1: compile content/slice/areas.yaml against the Spike A grid (phase1-slice.md §3, §5.1).

Usage: python -I pipeline/m1_areas.py
Checks: each proxy subdistrict resolves to exactly one grid id; no subdistrict is in two areas; no area is empty.
Writes:
  data/starts/slice_areas.json             versioned; sim-core's input (cells as row runs [y, x0, x1], inclusive)
  apps/map-spike/public/grid/areas.json    the same, for the map viewer (git-ignored)
The site half of the area invariant is checked by pipeline/m1b_sites.py.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slice_areas import AREAS_YAML, GRID, ROOT, area_mask, load_areas, load_grid  # noqa: E402

OUT = ROOT / "data/starts/slice_areas.json"


def runs(mask):
    out = []
    for y in np.nonzero(mask.any(axis=1))[0]:
        row = np.concatenate([[0], mask[y].astype(np.int8), [0]])
        d = np.diff(row)
        for x0, x1 in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1):
            out.append([int(y), int(x0), int(x1)])
    return out


def main():
    g = load_grid()
    m = area_mask(g)
    meta = g["meta"]
    areas = []
    for a in load_areas():
        r = runs(m == a["id"])
        if not r:
            raise SystemExit(f"area {a['id']} ({a['key']}) has no cells")
        rec = {k: a[k] for k in ("id", "key", "name", "access", "flag", "proxy_subdistricts") if k in a}
        rec["cell_count"] = int((m == a["id"]).sum())
        rec["runs"] = r
        areas.append(rec)
    out = {
        "format": 1,
        "generated_by": "pipeline/m1_areas.py",
        "areas_sha256": hashlib.sha256(AREAS_YAML.read_bytes().replace(b"\r\n", b"\n")).hexdigest(),  # LF-normalised
        "grid": {k: meta[k] for k in ("width", "height", "cell_m", "origin_top_left", "crs")},
        "areas": areas,
    }
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    (GRID / "areas.json").write_text(text, encoding="utf-8")
    for a in areas:
        print(f"{a['id']} {a['key']:<16} {a['access']:<9} {a['cell_count']:>5} cells, {len(a['runs'])} runs")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(text) // 1024} KiB)")


if __name__ == "__main__":
    main()
