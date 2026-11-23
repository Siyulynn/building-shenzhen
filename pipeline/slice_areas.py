"""The slice areas on the Spike A grid, read from content/slice/areas.yaml (phase1-slice.md §3, §5.1).

Import: from slice_areas import AREAS, load_areas, load_grid, area_mask
"""
import json
from pathlib import Path

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]
GRID = ROOT / "apps/map-spike/public/grid"
AREAS_YAML = ROOT / "content/slice/areas.yaml"


def load_areas():
    """The area records, in file order."""
    return yaml.safe_load(AREAS_YAML.read_text(encoding="utf-8"))


AREAS = {a["id"]: (a["key"], a["proxy_subdistricts"]) for a in load_areas()}  # area -> (key, proxy subdistricts)


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


def subdistrict_ids(g):
    """Proxy name (without 街道) -> grid subdistrict id. Fails unless each name resolves to exactly one id."""
    by_name = {}
    for s in g["meta"]["subdistricts"]:
        by_name.setdefault(s["name"], []).append(s["id"])
    out = {}
    for a, (_, subs) in AREAS.items():
        for s in subs:
            ids = by_name.get(s + "街道", [])
            if len(ids) != 1:
                raise SystemExit(f"area {a}: proxy subdistrict {s} resolves to {len(ids)} grid ids, not 1")
            out[s] = ids[0]
    return out


def area_mask(g):
    """uint8 grid: slice area number per cell (0 = none). Fails if a subdistrict is in two areas."""
    ids = subdistrict_ids(g)
    seen = {}
    out = np.zeros((g["H"], g["W"]), dtype=np.uint8)
    for a, (_, subs) in AREAS.items():
        for s in subs:
            if s in seen:
                raise SystemExit(f"proxy subdistrict {s} is in areas {seen[s]} and {a}")
            seen[s] = a
            out[g["sub"] == ids[s]] = a
    return out
