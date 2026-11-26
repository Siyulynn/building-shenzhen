"""Build the 1984 reported-buildings calibration layer from data/calibration/buildings_1984.yaml.

Usage: python -I pipeline/buildings_1984.py

Outputs:
  data/calibration/buildings_1984.geojson        WGS84 points for QGIS / any map
  data/calibration/buildings_1984.csv            flat table
  data/calibration/buildings_1984_report.json    grid checks and flags
  apps/map-spike/public/grid/buildings_1984.json  cells for the map spike overlay

The grid checks are hints, not verdicts. A point on 1979 water or on a cell without a 1979->84 change signal is
worth a look; it does not prove the building did not exist. Landsat 1984 has no band data over the core, so the
change signal is only present in areas 4 and 6.
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import yaml
from pyproj import Transformer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slice_areas import GRID, ROOT, area_mask, load_grid  # noqa: E402

REG = ROOT / "data/calibration/buildings_1984.yaml"
OUT = ROOT / "data/calibration"
CHANGE_1984 = {
    0: "no data or excluded", 1: "stable land", 2: "greener", 3: "cleared or built (lead)",
    4: "water then, land later", 5: "land then, water later", 6: "water both dates",
}


def main():
    text = REG.read_text(encoding="utf-8")
    rows = yaml.safe_load(text)
    claims_path = ROOT / "build/evidence/claims.json"
    known = set(json.loads(claims_path.read_text(encoding="utf-8"))["claims"]) if claims_path.exists() else None
    for r in rows:
        if r["status_1984"] not in ("built", "under_construction", "planned"):
            raise SystemExit(f"{r['id']}: bad status_1984 {r['status_1984']}")
        if (r.get("later") or {}).get("state") not in (None, "present", "renamed_or_reused", "replaced_lead", "unknown"):
            raise SystemExit(f"{r['id']}: bad later.state {(r.get('later') or {}).get('state')}")
        for cid in r.get("claims", []):
            if known is not None and cid not in known:
                raise SystemExit(f"{r['id']}: unknown claim {cid} (run npm run evidence:compile first)")
    meta = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))
    W, H, cell = meta["width"], meta["height"], meta["cell_m"]
    x0, y1 = meta["origin_top_left"]
    water = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(H, W)
    coast = np.fromfile(GRID / "coast_change.bin", dtype=np.uint8).reshape(H, W)
    change = np.fromfile(GRID / "change_79_84.bin", dtype=np.uint8).reshape(H, W)
    g = load_grid()
    areas = area_mask(g)
    to_utm = Transformer.from_crs("EPSG:4326", meta["crs"], always_xy=True)

    features, table, cells = [], [], []
    flags = []
    for r in rows:
        rec = {
            "id": r["id"], "name": r["name"], "kind": r["kind"], "area": r.get("area"),
            "status_1984": r["status_1984"], "by_1984": r.get("by_1984"), "place": r.get("place"),
            "later": r.get("later"), "claims": r.get("claims", []), "notes": r.get("notes"),
            "lonlat": r.get("lonlat"), "cell": None, "flags": [],
        }
        if r.get("lonlat"):
            lon, lat = r["lonlat"]
            x, y = to_utm.transform(lon, lat)
            cx, cy = int((x - x0) // cell), int((y1 - y) // cell)
            if not (0 <= cx < W and 0 <= cy < H):
                rec["flags"].append("outside_grid")
            else:
                rec["cell"] = [cx, cy]
                rec["area_grid"] = int(areas[cy, cx]) or None
                rec["water_1979"] = {0: "land", 1: "water", 255: "no data"}.get(int(water[cy, cx]), "?")
                rec["coast_change"] = int(coast[cy, cx])
                rec["change_1984"] = CHANGE_1984.get(int(change[cy, cx]), "?")
                if r.get("area") and rec["area_grid"] and r["area"] != rec["area_grid"]:
                    rec["flags"].append("area_mismatch")
                if int(water[cy, cx]) == 1:
                    rec["flags"].append("on_1979_water")
                if int(coast[cy, cx]) == 1:
                    rec["flags"].append("sea_then_land_now")
                cls = int(change[cy, cx])
                if rec["area_grid"] in (4, 6):
                    if cls == 3:
                        rec["flags"].append("1984_build_signal")
                    elif cls in (1, 2):
                        rec["flags"].append("no_1984_build_signal")
                else:
                    rec["change_1984"] = "no 1984 band data in this area (only 4 and 6)"
                if rec["flags"]:
                    flags.append({"id": r["id"], "name": r["name"]["zh"], "flags": rec["flags"],
                                  "cell": rec["cell"]})
        else:
            rec["flags"].append("unplaced")
        cells.append(rec)
        if rec["cell"]:
            lon, lat = r["lonlat"]
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "id": r["id"], "name_zh": r["name"]["zh"], "name_en": r["name"]["en"],
                    "kind": r["kind"], "area": r.get("area"), "status_1984": r["status_1984"],
                    "date_1984": (r.get("by_1984") or {}).get("date"), "later": (r.get("later") or {}).get("state"),
                    "cell": rec["cell"], "flags": rec["flags"], "claims": r.get("claims", []),
                },
            })
        table.append({
            "id": r["id"], "name_zh": r["name"]["zh"], "name_en": r["name"]["en"], "kind": r["kind"],
            "area": r.get("area"), "lon": (r.get("lonlat") or [None, None])[0],
            "lat": (r.get("lonlat") or [None, None])[1], "cell_x": (rec["cell"] or [None, None])[0],
            "cell_y": (rec["cell"] or [None, None])[1], "status_1984": r["status_1984"],
            "date_1984": (r.get("by_1984") or {}).get("date"), "later_state": (r.get("later") or {}).get("state"),
            "flags": " ".join(rec["flags"]), "claims": " ".join(r.get("claims", [])),
        })

    placed = [c for c in cells if c["cell"]]
    out = {"source": "data/calibration/buildings_1984.yaml",
           "source_sha256": hashlib.sha256(text.encode()).hexdigest(),
           "grid": {k: meta[k] for k in ("width", "height", "cell_m", "origin_top_left", "crs")},
           "buildings": cells}
    (OUT / "buildings_1984.geojson").write_text(json.dumps(
        {"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "buildings_1984.csv").write_text("", encoding="utf-8")
    with open(OUT / "buildings_1984.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(table[0]))
        w.writeheader()
        w.writerows(table)
    (GRID / "buildings_1984.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    report = {
        "source": out["source"],
        "count": len(cells),
        "placed": len(placed),
        "unplaced": len(cells) - len(placed),
        "by_status": {s: sum(1 for c in cells if c["status_1984"] == s) for s in ("built", "under_construction", "planned")},
        "flagged": flags,
        "caveat": ("Grid checks are hints. 1979 water is an automatic threshold (tide unknown); the 1979->84 "
                   "change layer exists only in areas 4 and 6, so outside those areas there is no 1984 build "
                   "signal to check, and its absence is not evidence that a building was missing."),
    }
    (OUT / "buildings_1984_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{len(cells)} buildings: {len(placed)} placed, {len(cells)-len(placed)} unplaced")
    for c in cells:
        cell_s = f"{c['cell'][0]},{c['cell'][1]}" if c["cell"] else "—"
        print(f"{c['id']:<32} {c['status_1984']:<18} {cell_s:<12} {' '.join(c['flags'])}")
    if flags:
        print("\nflags:")
        for f in flags:
            print(f"  {f['id']:<32} {' '.join(f['flags'])}")


if __name__ == "__main__":
    main()
