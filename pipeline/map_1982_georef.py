"""Georeference the 1982 深圳市区图 labels and calibrate them against the existing map layers.

Usage: pipeline\\.venv\\Scripts\\python -I pipeline/map_1982_georef.py

Inputs:
  data/calibration/map_1982_labels.yaml     transcribed labels + 10 GCPs
  build/evidence/claims.json                compiled claim IDs (run `npm run evidence:compile` first)
  apps/map-spike/public/grid/meta.json      100 m UTM 50N grid
  apps/map-spike/public/grid/water1979.bin, coast_change.bin, change_79_84.bin
  data/starts/slice_landcover.json          current 1979 playable-area landcover
  content/slice/sites_1979.yaml             1979 site register
  data/calibration/buildings_1984.yaml      1984 reported-buildings register

Outputs:
  data/calibration/map_1982_labels.geojson             WGS84 points for QGIS
  data/calibration/map_1982_labels.csv                 flat table
  data/calibration/map_1982_calibration_report.json    georef RMS, site offsets & landcover calibration
  apps/map-spike/public/grid/map_1982_labels.json      grid overlay for apps/map-spike (git-ignored)
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

SRC = ROOT / "data/calibration/map_1982_labels.yaml"
OUT = ROOT / "data/calibration"


def load_landcover_grid(H, W):
    """Reconstruct (H, W) array of class names from data/starts/slice_landcover.json."""
    lc_path = ROOT / "data/starts/slice_landcover.json"
    grid = np.full((H, W), "outside_playable", dtype=object)
    if not lc_path.exists():
        return grid
    data = json.loads(lc_path.read_text(encoding="utf-8"))
    for area in data.get("areas", []):
        for cls_name, run_list in area.get("runs", {}).items():
            for y, x0, x1 in run_list:
                grid[y, x0:x1 + 1] = cls_name
    return grid


def fit_affine(gcps, to_utm):
    """Fit 6-parameter affine transform px,py -> UTM E,N and compute in-sample and LOO RMS."""
    src = np.array([[g["px"], g["py"]] for g in gcps], dtype=np.float64)
    dst = np.array([to_utm.transform(g["lonlat"][0], g["lonlat"][1]) for g in gcps], dtype=np.float64)
    A = np.hstack([src, np.ones((len(src), 1))])
    coef, _, _, _ = np.linalg.lstsq(A, dst, rcond=None)
    pred = A @ coef
    diff = pred - dst
    errs = np.linalg.norm(diff, axis=1)

    loo = []
    for i in range(len(gcps)):
        m = np.arange(len(gcps)) != i
        c2, _, _, _ = np.linalg.lstsq(A[m], dst[m], rcond=None)
        e = float(np.linalg.norm(A[i] @ c2 - dst[i]))
        loo.append({"id": gcps[i]["id"], "name": gcps[i]["name"], "loo_err_m": round(e, 1)})

    gcp_report = []
    for g, (de, dn), e in zip(gcps, diff, errs):
        gcp_report.append({
            "id": g["id"], "name": g["name"], "px": g["px"], "py": g["py"],
            "lonlat": g["lonlat"], "dE_m": round(float(de), 1), "dN_m": round(float(dn), 1),
            "err_m": round(float(e), 1),
        })

    stats = {
        "model": "6-parameter affine (px, py -> EPSG:32650 E, N)",
        "gcp_count": len(gcps),
        "scale_x_m_per_px": round(float(np.linalg.norm(coef[0])), 3),
        "scale_y_m_per_px": round(float(np.linalg.norm(coef[1])), 3),
        "in_sample_rms_m": round(float(np.sqrt(np.mean(errs ** 2))), 1),
        "loo_rms_m": round(float(np.sqrt(np.mean([x["loo_err_m"] ** 2 for x in loo]))), 1),
        "loo_median_m": round(float(np.median([x["loo_err_m"] for x in loo])), 1),
        "gcps": gcp_report,
        "loo": loo,
    }
    return coef, stats


def main():
    text = SRC.read_text(encoding="utf-8")
    doc = yaml.safe_load(text)
    gcps = doc["gcps"]
    labels = doc["labels"]

    claims_path = ROOT / "build/evidence/claims.json"
    known = set(json.loads(claims_path.read_text(encoding="utf-8"))["claims"]) if claims_path.exists() else None
    seen_ids = set()
    for r in labels:
        if r["id"] in seen_ids:
            raise SystemExit(f"duplicate id: {r['id']}")
        seen_ids.add(r["id"])
        if r["category"] not in ("building", "village", "hill", "hydro"):
            raise SystemExit(f"{r['id']}: bad category {r['category']}")
        if known is not None and r["claim"] not in known:
            raise SystemExit(f"{r['id']}: unknown claim {r['claim']} (run npm run evidence:compile first)")

    meta = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))
    W, H, cell = meta["width"], meta["height"], meta["cell_m"]
    x0, y1 = meta["origin_top_left"]
    to_utm = Transformer.from_crs("EPSG:4326", meta["crs"], always_xy=True)
    to_wgs = Transformer.from_crs(meta["crs"], "EPSG:4326", always_xy=True)

    g = load_grid()
    elev = g["elev"]
    areas = area_mask(g)
    water79 = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(H, W)
    lc = load_landcover_grid(H, W)

    coef, georef_stats = fit_affine(gcps, to_utm)

    # Load existing 1979 sites and 1984 buildings for cross-calibration
    sites_79 = {s["id"]: s for s in yaml.safe_load((ROOT / "content/slice/sites_1979.yaml").read_text(encoding="utf-8"))}
    b84_rows = {b["id"]: b for b in yaml.safe_load((ROOT / "data/calibration/buildings_1984.yaml").read_text(encoding="utf-8"))}

    features, table, items = [], [], []
    site_79_checks = []
    b84_checks = []
    landcover_gaps = []
    hill_checks = []

    for r in labels:
        e, n = np.array([r["px"], r["py"], 1.0]) @ coef
        lon, lat = to_wgs.transform(float(e), float(n))
        lon, lat = round(float(lon), 5), round(float(lat), 5)
        cx, cy = int((e - x0) // cell), int((y1 - n) // cell)
        inside = 0 <= cx < W and 0 <= cy < H
        area_id = int(areas[cy, cx]) if inside else None
        if area_id == 0:
            area_id = None
        lc_here = str(lc[cy, cx]) if inside else "outside_grid"
        # Check 2-cell (200 m) neighbourhood to reflect ~200 m map RMS
        if inside:
            y_lo, y_hi = max(0, cy - 2), min(H, cy + 3)
            x_lo, x_hi = max(0, cx - 2), min(W, cx + 3)
            lc_win = set(str(v) for v in lc[y_lo:y_hi, x_lo:x_hi].ravel())
            has_built_near = bool(lc_win & {"village", "town"})
            elev_here = int(elev[cy, cx])
            elev_max_200m = int(elev[y_lo:y_hi, x_lo:x_hi].max())
            w79 = int(water79[cy, cx])
        else:
            lc_win = set()
            has_built_near = False
            elev_here = None
            elev_max_200m = None
            w79 = None

        rec = {
            "id": r["id"], "name": r["name"], "category": r["category"], "kind": r["kind"],
            "px": r["px"], "py": r["py"], "lonlat": [lon, lat],
            "cell": [cx, cy] if inside else None, "area_grid": area_id,
            "landcover_1979": lc_here, "built_within_200m_1979": has_built_near,
            "elev_m": elev_here, "water_1979": w79,
            "planned_in_1982": bool(r.get("planned_in_1982", False)),
            "claim": r["claim"],
            "existing_1979_id": r.get("existing_1979_id"),
            "existing_1984_id": r.get("existing_1984_id"),
            "notes": r.get("notes"),
        }
        items.append(rec)

        # Calibration 1: compare against 1979 site register proxies
        s79_id = r.get("existing_1979_id")
        if s79_id and s79_id in sites_79:
            geom = sites_79[s79_id].get("geometry") or {}
            if geom.get("kind") == "point":
                slon, slat = geom["lonlat"]
                se, sn = to_utm.transform(slon, slat)
                de, dn = float(e - se), float(n - sn)
                site_79_checks.append({
                    "site_1979_id": s79_id, "label_1982_id": r["id"], "name": r["name"]["zh"],
                    "site_1979_lonlat": [slon, slat], "map_1982_lonlat": [lon, lat],
                    "offset_m": round(float(np.hypot(de, dn)), 1),
                    "dE_m": round(de, 1), "dN_m": round(dn, 1),
                    "flag": "large_offset_gt_300m" if np.hypot(de, dn) > 300 else "within_map_rms",
                })

        # Calibration 2: compare against 1984 register proxies
        b84_id = r.get("existing_1984_id")
        if b84_id and b84_id in b84_rows:
            blonlat = b84_rows[b84_id].get("lonlat")
            if blonlat:
                be, bn = to_utm.transform(blonlat[0], blonlat[1])
                de, dn = float(e - be), float(n - bn)
                b84_checks.append({
                    "b1984_id": b84_id, "label_1982_id": r["id"], "name": r["name"]["zh"],
                    "b1984_lonlat": blonlat, "map_1982_lonlat": [lon, lat],
                    "offset_m": round(float(np.hypot(de, dn)), 1),
                    "dE_m": round(de, 1), "dN_m": round(dn, 1),
                })

        # Calibration 3: 1982 village or built facility inside playable areas reading as unbuilt in 1979 landcover
        if area_id in (1, 2, 3, 4, 5, 6, 7) and not r.get("planned_in_1982"):
            if (r["category"] == "village" and r["kind"] in ("village", "residential")) or r["category"] == "building":
                if not has_built_near:
                    landcover_gaps.append({
                        "id": r["id"], "name": r["name"]["zh"], "category": r["category"], "kind": r["kind"],
                        "area": area_id, "cell": [cx, cy], "landcover_1979": lc_here,
                    })

        # Calibration 4: 1982 hills vs DEM
        if r["category"] == "hill" and inside:
            hill_checks.append({
                "id": r["id"], "name": r["name"]["zh"], "area": area_id, "cell": [cx, cy],
                "elev_at_cell_m": elev_here, "elev_max_200m_m": elev_max_200m,
                "landcover_1979": lc_here,
            })

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": r["id"], "name_zh": r["name"]["zh"], "name_en": r["name"]["en"],
                "category": r["category"], "kind": r["kind"], "area_grid": area_id,
                "cell": rec["cell"], "landcover_1979": lc_here,
                "built_within_200m_1979": has_built_near,
                "planned_in_1982": rec["planned_in_1982"], "claim": r["claim"],
            },
        })
        table.append({
            "id": r["id"], "name_zh": r["name"]["zh"], "name_en": r["name"]["en"],
            "category": r["category"], "kind": r["kind"], "px": r["px"], "py": r["py"],
            "lon": lon, "lat": lat, "cell_x": cx if inside else None, "cell_y": cy if inside else None,
            "area_grid": area_id, "landcover_1979": lc_here,
            "built_within_200m_1979": has_built_near, "planned_in_1982": rec["planned_in_1982"],
            "claim": r["claim"],
        })

    # Per-area summary of 1982 labels vs 1979 landcover
    by_area = {}
    for it in items:
        ak = str(it["area_grid"] or "outside_slice")
        d = by_area.setdefault(ak, {"total": 0, "buildings": 0, "villages": 0, "buildings_unbuilt_in_lc79": 0, "villages_unbuilt_in_lc79": 0})
        d["total"] += 1
        if it["category"] == "building":
            d["buildings"] += 1
            if it["area_grid"] in (1, 2, 3, 4, 5, 6, 7) and not it["planned_in_1982"] and not it["built_within_200m_1979"]:
                d["buildings_unbuilt_in_lc79"] += 1
        elif it["category"] == "village" and it["kind"] in ("village", "residential"):
            d["villages"] += 1
            if it["area_grid"] in (1, 2, 3, 4, 5, 6, 7) and not it["built_within_200m_1979"]:
                d["villages_unbuilt_in_lc79"] += 1

    (OUT / "map_1982_labels.geojson").write_text(json.dumps(
        {"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(OUT / "map_1982_labels.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(table[0]))
        w.writeheader()
        w.writerows(table)

    overlay = {
        "source": "data/calibration/map_1982_labels.yaml",
        "source_sha256": hashlib.sha256(text.encode()).hexdigest(),
        "georef": {k: georef_stats[k] for k in ("model", "gcp_count", "in_sample_rms_m", "loo_rms_m", "loo_median_m")},
        "grid": {k: meta[k] for k in ("width", "height", "cell_m", "origin_top_left", "crs")},
        "labels": items,
    }
    (GRID / "map_1982_labels.json").write_text(json.dumps(overlay, ensure_ascii=False, indent=1), encoding="utf-8")

    by_cat = {c: sum(1 for it in items if it["category"] == c) for c in ("building", "village", "hill", "hydro")}
    report = {
        "source": "data/calibration/map_1982_labels.yaml",
        "count": len(items),
        "by_category": by_cat,
        "georef": georef_stats,
        "calibration": {
            "sites_1979_vs_1982_map": site_79_checks,
            "buildings_1984_vs_1982_map": b84_checks,
            "by_area_summary": by_area,
            "playable_villages_missing_in_1979_landcover": [x for x in landcover_gaps if x["category"] == "village"],
            "playable_buildings_unbuilt_in_1979_landcover_count": sum(1 for x in landcover_gaps if x["category"] == "building"),
            "hills_vs_dem": hill_checks,
        },
        "caveats": [
            "1982 深圳市区图 is a schematic folded paper city map photographed at an angle (~201 m in-sample RMS, ~332 m LOO RMS).",
            "A 1982 building reading as lowland_farm in 1979 landcover may be genuine 1979->1982 construction (e.g. Shangbu), OR an existing pre-1979 facility outside the 1979 site-register radius.",
            "An overlay label with no built cell in the sampled neighbourhood is a review lead. The label alone cannot establish 1979 existence, classify the cell or delimit the site.",
        ],
    }
    (OUT / "map_1982_calibration_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"1982 map labels: {len(items)} total ({by_cat})")
    print(f"Georef: {georef_stats['in_sample_rms_m']} m in-sample RMS, {georef_stats['loo_rms_m']} m LOO RMS")
    print(f"Playable 1982 villages missing from 1979 landcover (within 200 m): {len(report['calibration']['playable_villages_missing_in_1979_landcover'])}")
    print(f"Playable 1982 buildings reading unbuilt in 1979 landcover (within 200 m): {report['calibration']['playable_buildings_unbuilt_in_1979_landcover_count']}")
    print("\n1979 site proxies vs 1982 map:")
    for s in site_79_checks:
        print(f"  {s['site_1979_id']:<26} offset={s['offset_m']:5.1f} m  dE={s['dE_m']:+6.1f}  dN={s['dN_m']:+6.1f}  {s['flag']}")
    print("\nPer-area summary:")
    for ak in sorted(by_area):
        print(f"  area {ak:<14} {by_area[ak]}")


if __name__ == "__main__":
    main()
