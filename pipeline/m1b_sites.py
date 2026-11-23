"""M1b: turn the 1979 site register into map flags for the viewer.

Input:  content/slice/sites_1979.yaml       the register (phase1-slice.md §3.1)
        build/evidence/claims.json           from `npm run evidence:compile` (claim statuses)
        apps/map-spike/public/grid/meta.json, water1979.bin, coast_change.bin  (Spike A grid, m1b_landsat_1979.py)
Output: apps/map-spike/public/grid/sites.json (git-ignored)

Each site gets:
  evidence_status  the weakest status among its own claims cited for `encyclopedia` or `geometry`
                   (design_note claims are context, they do not raise or lower the flag)
  cell             grid x, y of the proxy point (None when unplaced)
  landsat_check    what the 1979 scene shows at that cell: an automatic hint for the person who places the site
"""
import json
from pathlib import Path

import numpy as np
import yaml
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
GRID = ROOT / "apps/map-spike/public/grid"
RANK = {"rejected": -1, "superseded": -1, "lead": 0, "disputed": 0, "sourced": 1, "verified": 2}
CHANGE = {0: "same as now", 1: "sea in 1979 (land now)", 2: "land in 1979 (water now)",
          3: "inland water in 1979", 255: "no 1979 data"}


def main():
    sites = yaml.safe_load((ROOT / "content/slice/sites_1979.yaml").read_text(encoding="utf-8"))
    claims = json.loads((ROOT / "build/evidence/claims.json").read_text(encoding="utf-8"))["claims"]
    meta = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))
    W, H, cell = meta["width"], meta["height"], meta["cell_m"]
    x0, y1 = meta["origin_top_left"]
    water79 = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(H, W)
    change = np.fromfile(GRID / "coast_change.bin", dtype=np.uint8).reshape(H, W)
    to_utm = Transformer.from_crs("EPSG:4326", meta["crs"], always_xy=True)

    out = []
    for s in sites:
        cited = []
        for c in s.get("claims", []):
            cid, use = (c, "encyclopedia") if isinstance(c, str) else (c["id"], c.get("use", "encyclopedia"))
            cl = claims.get(cid)
            if cl is None:
                raise SystemExit(f"{s['id']}: unknown claim {cid} (run npm run evidence:compile first)")
            cited.append({"id": cid, "use": use, "status": cl["status"], "summary": cl.get("summary"),
                          "source": cl.get("source")})
        own = [c for c in cited if c["use"] in ("encyclopedia", "geometry") and c["id"].startswith(s["id"] + ".")]
        status = min((c["status"] for c in own), key=RANK.__getitem__) if own else "lead"

        geom = s.get("geometry") or {"kind": "unplaced"}
        rec = {k: s.get(k) for k in ("id", "name", "kind", "area", "in_start_state", "research")}
        rec.update(placeholder=bool(s.get("placeholder")), evidence_status=status, claims=cited,
                   geometry=geom, cell=None, landsat_check=None)
        if geom["kind"] == "point":
            lon, lat = geom["lonlat"]
            x, y = to_utm.transform(lon, lat)
            cx, cy = int((x - x0) // cell), int((y1 - y) // cell)
            rec["cell"] = [cx, cy]
            w = int(water79[cy, cx])
            rec["landsat_check"] = {"water_1979": {0: "land", 1: "water", 255: "no data"}[w],
                                    "change": CHANGE[int(change[cy, cx])]}
        out.append(rec)

    (GRID / "sites.json").write_text(json.dumps({"source": "content/slice/sites_1979.yaml", "sites": out},
                                                ensure_ascii=False, indent=1), encoding="utf-8")
    for r in out:
        print(f"{r['id']:<32} {r['evidence_status']:<8} {str(r['cell']):<12} {r['landsat_check']}")


if __name__ == "__main__":
    main()
