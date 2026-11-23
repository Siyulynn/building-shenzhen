"""M1c: checks on the KH-9 registration and the 1979->1984 change map. Spike-grade diagnostics.

Run after m1c_landsat_change.py and m1c_kh9_mosaic.py:
  python -I pipeline/m1c_checks.py kh9_1980 kh9_1980_09_11_a048:c kh9_1980_09_11_f048:b
Writes apps/map-spike/public/grid/m1c_checks.json (git-ignored) and prints it.

1. Where the 1984 scene's band data stops (the QA mask overstates it).
2. The false-alarm rate of "cleared or built" on the control (Longgang), to read the per-area shares against.
3. Whether "water then, land later" cells sit on the edge of water that is there on both dates (level change).
4. Control-point spread per area, and a hold-out by 2 km spatial blocks (less optimistic than random folds).
5. How bright the KH-9 1980-09 frame is at each "cleared or built" cell: bare by 1980-09, or cleared later.
"""
import csv
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy.ndimage import binary_dilation
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from m1c_kh9_georef import OBS, robust_fit  # noqa: E402
from slice_areas import AREAS, GRID, ROOT, area_mask, load_grid  # noqa: E402

BLOCK_M = 2000.0


def gcps(sid, seg):
    with open(OBS / f"{sid}_{seg}_gcps.csv", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r["kept"] == "1"]
    src = np.array([[float(r["scan_x_full_px"]) / 8, float(r["scan_y_full_px"]) / 8] for r in rows])
    dst = np.array([[float(r["utm50_e"]), float(r["utm50_n"])] for r in rows])
    return src, dst


def block_heldout(src, dst, order=3):
    blk = np.floor(dst / BLOCK_M).astype(int)
    keys = blk[:, 0] * 100000 + blk[:, 1]
    res = []
    for k in np.unique(keys):
        test = keys == k
        if (~test).sum() < 50:
            continue
        model, _ = robust_fit(src[~test], dst[~test], order)
        res.append(np.hypot(*(model(src[test]) - dst[test]).T))
    r = np.concatenate(res)
    return {"block_m": BLOCK_M, "rmse_m": round(float(np.sqrt(np.mean(r ** 2))), 1),
            "median_m": round(float(np.median(r)), 1), "p90_m": round(float(np.percentile(r, 90)), 1),
            "points": int(len(r))}


def main():
    tag, specs = sys.argv[1], sys.argv[2:]
    g = load_grid()
    W, H, cell = g["W"], g["H"], g["meta"]["cell_m"]
    x0, y1 = g["meta"]["origin_top_left"]
    areas = area_mask(g)
    ch = np.frombuffer((GRID / "change_79_84.bin").read_bytes(), np.uint8).reshape(H, W)
    out = {}

    # 1. the western edge of 1984 band data, along the slice's rows
    l84 = cv2.imread(str(GRID / "landsat1984.png"))
    valid84 = (l84.max(axis=2) > 0).reshape(H, 2, W, 2).any(axis=(1, 3))
    rows = np.nonzero(((areas >= 1) & (areas <= 7)).any(axis=1))[0]
    west = [int(np.nonzero(valid84[r])[0].min()) for r in rows if valid84[r].any()]
    col = int(np.median(west))
    out["landsat1984_west_edge"] = {
        "median_first_valid_column": col, "utm50_e": x0 + col * cell,
        "areas_mostly_west_of_edge": [AREAS[a][0] for a in range(1, 10)
                                      if np.median(np.nonzero(areas == a)[1]) < col]}

    # 2. false-alarm baseline: the control is land on both dates, low and flat, in Longgang outside the slice
    ctl = (g["dist"] == 5) & (areas == 0) & np.isin(ch, (1, 2, 3))
    out["cleared_share_on_control"] = round(float((ch[ctl] == 3).mean()), 3)
    per_area = []
    for a, (key, _) in AREAS.items():
        land = (areas == a) & np.isin(ch, (1, 2, 3))
        if land.sum() >= 50:
            per_area.append({"area": a, "key": key, "land_cells_compared": int(land.sum()),
                             "cleared_share": round(float((ch[land] == 3).mean()), 3)})
    out["cleared_share_by_area"] = per_area

    # 3. "water then, land later" next to water on both dates
    filled = (ch == 4)
    near_water = binary_dilation(ch == 6, iterations=2)
    out["filled_cells"] = {
        a: {"cells": int((filled & (areas == a)).sum()),
            "within_200m_of_water_both_dates": int((filled & near_water & (areas == a)).sum()),
            "median_elev_m": float(np.median(g["elev"][filled & (areas == a)])) if (filled & (areas == a)).any() else None}
        for a in (4, 6)}

    # 4. control-point spread and spatial hold-out
    allpts = []
    seg_out = []
    for s in specs:
        src, dst = gcps(*s.split(":"))
        allpts.append(dst)
        seg_out.append({"segment": s, "kept": len(dst), "heldout_2km_blocks": block_heldout(src, dst)})
    out["segments"] = seg_out
    pts = np.concatenate(allpts)
    tree = cKDTree(pts)
    yy, xx = np.nonzero(areas > 0)
    E, N = x0 + (xx + 0.5) * cell, y1 - (yy + 0.5) * cell
    d, _ = tree.query(np.stack([E, N], 1))
    gc = ((pts[:, 0] - x0) // cell).astype(int), ((y1 - pts[:, 1]) // cell).astype(int)
    inside = (gc[0] >= 0) & (gc[0] < W) & (gc[1] >= 0) & (gc[1] < H)
    gpa = np.bincount(areas[gc[1][inside], gc[0][inside]], minlength=10)
    out["gcp_spread"] = [{"area": a, "key": k, "gcps_inside": int(gpa[a]),
                          "median_dist_to_gcp_m": round(float(np.median(d[areas[yy, xx] == a])), 0),
                          "p90_dist_to_gcp_m": round(float(np.percentile(d[areas[yy, xx] == a], 90)), 0)}
                         for a, (k, _) in AREAS.items()]

    # 5. KH-9 1980-09 brightness at the cleared cells, against stable land in the same areas
    kh = cv2.imread(str(GRID / f"{tag}.png"), cv2.IMREAD_UNCHANGED)
    grey = kh[..., 0].astype(np.float32).reshape(H, 4, W, 4).mean(axis=(1, 3))
    cover = (kh[..., 3] > 0).reshape(H, 4, W, 4).all(axis=(1, 3))
    rows5 = []
    for a in (4, 6):
        stable = (areas == a) & (ch == 1) & cover
        cl = (areas == a) & (ch == 3) & cover
        if not cl.any():
            continue
        p90 = float(np.percentile(grey[stable], 90))
        rows5.append({"area": a, "key": AREAS[a][0], "cleared_cells": int(cl.sum()), "stable_p90_grey": round(p90, 1),
                      "bright_in_1980_09": int((grey[cl] > p90).sum()),
                      "bright_share": round(float((grey[cl] > p90).mean()), 2)})
    out["kh9_brightness_at_cleared"] = rows5
    (GRID / "m1c_checks.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
