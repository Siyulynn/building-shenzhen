"""M1b: turn the 1979 site register into map flags for the viewer.

Input:  content/slice/sites_1979.yaml       the register (phase1-slice.md §3.1)
        build/evidence/claims.json           from `npm run evidence:compile` (claim statuses)
        apps/map-spike/public/grid/meta.json, water1979.bin, coast_change.bin  (Spike A grid, m1b_landsat_1979.py)
Output: apps/map-spike/public/grid/sites.json (git-ignored)
        data/starts/slice_site_cells.json (committed projection for the playable slice)

Each site gets:
  evidence_status  the weakest status among its own encyclopedia claims and its placement claims
                   (design_note claims are context, they do not raise or lower the flag)
  cell             grid x, y of the proxy point (None when unplaced)
  landsat_check    what the 1979 scene shows at that cell: an automatic hint for the person who places the site
The area invariant (phase1-slice.md §3): every placed site's `area` equals the area of content/slice/areas.yaml
whose cells contain its point. A point on no land cell inside the city takes the nearest one. A mismatch fails the run.
"""
import hashlib
import json
from pathlib import Path

import sys

import numpy as np
import yaml
from pyproj import Transformer
from scipy.ndimage import distance_transform_edt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slice_areas import area_mask, load_grid  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
GRID = ROOT / "apps/map-spike/public/grid"
RANK = {"rejected": -1, "superseded": -1, "lead": 0, "disputed": 0, "sourced": 1, "verified": 2}
CHANGE = {0: "same as now", 1: "sea in 1979 (land now)", 2: "land in 1979 (water now)",
          3: "inland water in 1979", 255: "no 1979 data"}


def main():
    register = (ROOT / "content/slice/sites_1979.yaml").read_text(encoding="utf-8")
    sites = yaml.safe_load(register)
    claims = json.loads((ROOT / "build/evidence/claims.json").read_text(encoding="utf-8"))["claims"]
    meta = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))
    W, H, cell = meta["width"], meta["height"], meta["cell_m"]
    x0, y1 = meta["origin_top_left"]
    water79 = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(H, W)
    change = np.fromfile(GRID / "coast_change.bin", dtype=np.uint8).reshape(H, W)
    to_utm = Transformer.from_crs("EPSG:4326", meta["crs"], always_xy=True)
    g = load_grid()
    areas = area_mask(g)
    # for each cell, the nearest land cell inside the city (present-day grid): points on the river, offshore or
    # across the border snap to it
    _, (near_y, near_x) = distance_transform_edt((g["water"] != 0) | (g["dist"] == 0), return_indices=True)
    mismatches = []

    out = []
    placements = {}
    for s in sites:
        cited = []
        for c in s.get("claims", []):
            cid, use = (c, "encyclopedia") if isinstance(c, str) else (c["id"], c.get("use", "encyclopedia"))
            cl = claims.get(cid)
            if cl is None:
                raise SystemExit(f"{s['id']}: unknown claim {cid} (run npm run evidence:compile first)")
            cited.append({"id": cid, "use": use, "status": cl["status"], "summary": cl.get("summary"),
                          "source": cl.get("source")})
        evidence = [c for c in cited if c["use"] == "geometry"
                    or (c["use"] == "encyclopedia" and c["id"].startswith(s["id"] + "."))]
        status = min((c["status"] for c in evidence), key=RANK.__getitem__) if evidence else "lead"

        geom = s.get("geometry") or {"kind": "unplaced"}
        rec = {k: s.get(k) for k in ("id", "name", "kind", "area", "in_start_state", "research")}
        rec.update(placeholder=bool(s.get("placeholder")), evidence_status=status, claims=cited,
                   geometry=geom, cell=None, landsat_check=None)
        if geom["kind"] == "point":
            lon, lat = geom["lonlat"]
            x, y = to_utm.transform(lon, lat)
            cx, cy = int((x - x0) // cell), int((y1 - y) // cell)
            if not (0 <= cx < W and 0 <= cy < H):
                raise SystemExit(f"{s['id']}: projected point outside grid")
            rec["cell"] = [cx, cy]
            ly, lx = int(near_y[cy, cx]), int(near_x[cy, cx])
            got = int(areas[ly, lx]) or None
            placements[s["id"]] = {"cell": [cx, cy], "landCell": [lx, ly]}
            if s.get("area") != got:
                mismatches.append(f"{s['id']}: area {s.get('area')} in the register, but its point lies in area {got}"
                                  f" (cell {lx},{ly})")
            w = int(water79[cy, cx])
            rec["landsat_check"] = {"water_1979": {0: "land", 1: "water", 255: "no data"}[w],
                                    "change": CHANGE[int(change[cy, cx])]}
        out.append(rec)

    (GRID / "sites.json").write_text(json.dumps({"source": "content/slice/sites_1979.yaml", "sites": out},
                                                ensure_ascii=False, indent=1), encoding="utf-8")
    for r in out:
        print(f"{r['id']:<32} {r['evidence_status']:<8} {str(r['cell']):<12} {r['landsat_check']}")
    if mismatches:
        raise SystemExit("area invariant failed:" + "".join(f"\n  {m}" for m in mismatches))
    projection = {"format": 1, "register_sha256": hashlib.sha256(register.encode()).hexdigest(),
                  "grid": {k: meta[k] for k in ("width", "height", "cell_m", "origin_top_left", "crs")},
                  "placements": placements}
    (ROOT / "data/starts/slice_site_cells.json").write_text(
        json.dumps(projection, indent=2) + "\n", encoding="utf-8")
    print(f"area invariant ok: {sum(r['cell'] is not None for r in out)} placed sites in their areas")


if __name__ == "__main__":
    main()
