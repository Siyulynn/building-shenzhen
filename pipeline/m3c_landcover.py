"""R8a: the 1979 land-cover layer for the slice's playable areas (phase1-slice.md §5.5, phase1-revision-plan.md §3.1).

Usage: pipeline/.venv/Scripts/python.exe -I pipeline/m3c_landcover.py [--features OUT.npz | --selftest]
       pipeline/.venv/Scripts/python.exe -I pipeline/m3c_landcover.py --candidate [--selftest]
--candidate evaluates the raster-first revision without replacing the shipped layer.
--selftest classifies a small synthetic fixture grid twice, checks that every rule fires where it should and that the
result is identical, and writes nothing.
Reads the Spike A grid (git-ignored, apps/map-spike/public/grid/): grid.bin (present-day DEM and water),
water1979.bin and coast_change.bin (pipeline/m1b_landsat_1979.py), and the KH-9 1980 slice mosaic
(kh9_1980_slice.png, pipeline/m1c_kh9_mosaic.py); and content/slice/sites_1979.yaml with
data/starts/slice_site_cells.json for the village, town and railway points.
Writes data/starts/slice_landcover.json: per playable area, its cells by class as row runs [y, x0, x1], inclusive.

One class per cell, first match wins (thresholds are fixed numbers, never per-area quantiles):
  1. water       DEM water, or a 1979 water body (water1979 == 1, four-connected) of >= RESERVOIR_MIN_CELLS cells
  2. tidal_flat  coast_change == 2 within two cells of 1979 water, or elevation < 3 m within two cells of DEM water
  3. pond        coast_change == 3 (inland water in 1979, land now) in a smaller body, below POND_MAX_ELEV_M
  4. hill        slope > HILL_SLOPE_PCT (m3b_buildable.py's slope function)
  5. village     within VILLAGE_RADIUS cells of a `kind: village` site point, and built texture on KH-9 1980
  6. town        within TOWN_RADIUS cells of a `kind: town | state_unit | railway` point, and built texture on KH-9
  7. upland      UPLAND_SLOPE_PCT < slope <= HILL_SLOPE_PCT
  8. lowland_farm everything else
Two deviations from the plan's wording, both forced by the inputs (recorded in phase1-slice.md §5.5):
  - In the playable areas every water1979 cell is also coast_change == 3, because m1b defines code 3 as "1979
    water, DEM land". Rule 1 as first written ("or water1979 == 1") would take every pond. The reservoir is told
    from fishponds by the size of its connected 1979 water body.
  - About a fifth of the 1979 inland-water cells lie on hills (shadow, landsat1979.json caveats), so pond needs
    an elevation ceiling; a shadow cell falls through to hill or upland.
Built texture is the mean absolute high-pass (|gray - Gaussian blur, sigma 3 px|) of the cell's 16 x 16 KH-9 pixels,
at or above BUILT_TEXTURE. A cell with less than half KH-9 coverage has no built evidence: it is never village or town.
A placeholder layer: every class is a lead (phase1-revision-plan.md §3.1), audited in docs/research/phase1-landcover.md.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import yaml
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from m1_areas import runs  # noqa: E402
from m3b_buildable import slope_pct  # noqa: E402
from slice_areas import GRID, ROOT, area_mask, load_areas, load_grid  # noqa: E402

OUT = ROOT / "data/starts/slice_landcover.json"
CLASSES = ["water", "tidal_flat", "pond", "hill", "village", "town", "upland", "lowland_farm"]

# Fixed thresholds, set once from the tuning crops in docs/research/phase1-landcover.md (not from the audit sample)
RESERVOIR_MIN_CELLS = 50      # a 1979 water body this large is a reservoir or river, not fishponds
POND_MAX_ELEV_M = 50          # above this, 1979 "inland water" is hill shadow (landsat1979.json caveats)
HILL_SLOPE_PCT = 15.0         # as m3b_buildable.py's slope_max_pct: terracing is not modelled
UPLAND_SLOPE_PCT = 6.0
VILLAGE_RADIUS = 5            # cells (500 m) around a village proxy point
TOWN_RADIUS = 6               # cells (600 m) around a town, state-unit or railway proxy point
BUILT_TEXTURE = 40.0          # mean |high-pass| of the cell's KH-9 pixels, grey levels
KH9_MIN_COVER = 0.5

CLAIMS = [
    {"id": "phase1.map.landsat_1979", "use": "design_note"},
    {"id": "phase1.map.kh9_1980", "use": "design_note"},
    {"id": "phase1.map.shenzhenxu_refs", "use": "design_note"},
]


def kh9_features(H, W):
    """Per grid cell: (texture, coverage) from the KH-9 slice mosaic; NaN texture and 0 coverage outside its box."""
    meta = json.loads((GRID / "kh9_1980.json").read_text(encoding="utf-8"))
    x0, y0, x1, y1 = meta["slice"]["cell_box"]
    img = cv2.imread(str(GRID / meta["slice"]["file"]), cv2.IMREAD_UNCHANGED)
    gray, alpha = img[:, :, 0].astype(np.float32), img[:, :, 3]
    h, w = y1 - y0, x1 - x0
    hp = np.abs(gray - cv2.GaussianBlur(gray, (0, 0), 3))
    tex = np.full((H, W), np.nan, dtype=np.float64)
    cov = np.zeros((H, W), dtype=np.float64)
    tex[y0:y1, x0:x1] = hp.reshape(h, 16, w, 16).mean(axis=(1, 3))
    cov[y0:y1, x0:x1] = (alpha > 0).reshape(h, 16, w, 16).mean(axis=(1, 3))
    return tex, cov


def near_points(H, W, cells, radius):
    """Cells within `radius` (Chebyshev) of any of the points."""
    out = np.zeros((H, W), dtype=bool)
    for x, y in cells:
        out[max(0, y - radius):y + radius + 1, max(0, x - radius):x + radius + 1] = True
    return out


def site_points(kinds):
    sites = yaml.safe_load((ROOT / "content/slice/sites_1979.yaml").read_text(encoding="utf-8"))
    cells = json.loads((ROOT / "data/starts/slice_site_cells.json").read_text(encoding="utf-8"))["placements"]
    return sorted((s["id"], tuple(cells[s["id"]]["cell"])) for s in sites if s["kind"] in kinds and s["id"] in cells)


def classify(g, water79, change, tex, cov, village_pts=None, town_pts=None):
    """The class index per cell (first match wins), and the features it used. Points default to the site register."""
    H, W = g["H"], g["W"]
    elev, dem_water = g["elev"].astype(np.float64), g["water"] > 0
    slope = slope_pct(g["elev"], float(g["meta"]["cell_m"]))
    lab, n = ndimage.label(water79 == 1)
    size = np.zeros(n + 1, dtype=np.int64)
    np.add.at(size, lab.ravel(), 1)
    size[0] = 0
    body = size[lab]
    built = (cov >= KH9_MIN_COVER) & (np.nan_to_num(tex, nan=0.0) >= BUILT_TEXTURE)
    if village_pts is None:
        village_pts = [c for _, c in site_points({"village"})]
    if town_pts is None:
        town_pts = [c for _, c in site_points({"town", "state_unit", "railway"})]
    rules = [
        dem_water | ((water79 == 1) & (body >= RESERVOIR_MIN_CELLS)),
        ((change == 2) & ndimage.binary_dilation(water79 == 1, iterations=2))
        | ((elev < 3) & ndimage.binary_dilation(dem_water, iterations=2)),
        (change == 3) & (body < RESERVOIR_MIN_CELLS) & (elev <= POND_MAX_ELEV_M),
        slope > HILL_SLOPE_PCT,
        near_points(H, W, village_pts, VILLAGE_RADIUS) & built,
        near_points(H, W, town_pts, TOWN_RADIUS) & built,
        slope > UPLAND_SLOPE_PCT,
        np.ones((H, W), dtype=bool),
    ]
    cls = np.full((H, W), 255, dtype=np.uint8)
    for k, r in enumerate(rules):
        cls[(cls == 255) & r] = k
    return cls, {"slope": slope, "elev": elev, "tex": tex, "cov": cov, "body": body}


def selftest():
    """A 24 x 24 fixture: one patch per rule, classified twice; every patch must land in its class, identically."""
    H = W = 24
    elev = np.full((H, W), 10.0)
    elev[:, 18:] = 10.0 + np.arange(6) * 100 * 0.2        # 20% slope: hill
    elev[0:6, 12:18] = 10.0 + np.arange(6) * 100 * 0.1     # 10% slope: upland
    g = {"H": H, "W": W, "elev": elev.astype(np.float32), "water": np.zeros((H, W), np.uint8),
         "meta": {"cell_m": 100.0}}
    g["water"][20:, 0:4] = 1                                 # DEM water
    g["elev"][19, 0:4] = 1.0                                 # low ground beside it: tidal flat
    water79 = np.zeros((H, W), np.uint8)
    change = np.zeros((H, W), np.uint8)
    water79[0:8, 0:8] = 1                                    # a 64-cell 1979 body: water (a reservoir)
    change[0:8, 0:8] = 3
    water79[10:12, 0:2] = 1                                  # a 4-cell 1979 body that is land now: pond
    change[10:12, 0:2] = 3
    tex = np.zeros((H, W))
    cov = np.ones((H, W))
    tex[14:16, 8:10] = BUILT_TEXTURE + 5                     # built, next to a village point
    tex[8:10, 14:16] = BUILT_TEXTURE + 5                     # built, next to a town point, on upland: the slope wins
    tex[14:16, 2:4] = BUILT_TEXTURE + 5                      # built, near both: village wins (first match)
    args = (g, water79, change, tex, cov, [(9, 14), (3, 14)], [(15, 9), (3, 15)])
    a, _ = classify(*args)
    b, _ = classify(*args)
    assert np.array_equal(a, b), "the classifier is not deterministic"
    k = {c: i for i, c in enumerate(CLASSES)}
    expect = {(22, 1): "water", (3, 3): "water", (19, 1): "tidal_flat", (10, 1): "pond", (12, 20): "hill", (14, 8): "village",
              (14, 2): "village", (2, 14): "upland", (22, 10): "lowland_farm"}
    for (y, x), c in expect.items():
        assert a[y, x] == k[c], f"cell ({x},{y}) is {CLASSES[a[y, x]]}, expected {c}"
    tex2 = tex.copy()
    tex2[16:18, 10:12] = BUILT_TEXTURE + 5                   # built near the town point only
    c2, _ = classify(g, water79, change, tex2, cov, [], [(10, 16)])
    assert c2[16, 10] == k["town"], "a built cell near a town point is not town"
    print("selftest ok:", " ".join(f"{c}={int((a == i).sum())}" for i, c in enumerate(CLASSES)))


def main():
    if "--candidate" in sys.argv:
        from m3c_landcover_candidate import main as candidate_main
        return candidate_main(sys.argv[sys.argv.index("--candidate") + 1:])
    if "--selftest" in sys.argv:
        return selftest()
    g = load_grid()
    H, W = g["H"], g["W"]
    m = area_mask(g)
    water79 = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(H, W)
    change = np.fromfile(GRID / "coast_change.bin", dtype=np.uint8).reshape(H, W)
    tex, cov = kh9_features(H, W)
    cls, f = classify(g, water79, change, tex, cov)
    if "--features" in sys.argv:
        np.savez(sys.argv[sys.argv.index("--features") + 1], cls=cls, area=m, **f)
    areas = []
    for a in load_areas():
        if a["access"] != "playable":
            continue
        inside = m == a["id"]
        by = {c: runs(inside & (cls == k)) for k, c in enumerate(CLASSES)}
        counts = {c: int((inside & (cls == k)).sum()) for k, c in enumerate(CLASSES)}
        areas.append({"id": a["id"], "key": a["key"], "cell_count": int(inside.sum()), "counts": counts,
                      "runs": {c: r for c, r in by.items() if r}})
    out = {
        "format": 1,
        "generated_by": "pipeline/m3c_landcover.py",
        "areas_sha256": json.loads((ROOT / "data/starts/slice_areas.json").read_text(encoding="utf-8"))["areas_sha256"],
        "placeholder": True,
        "evidence_status": "lead",
        "classes": CLASSES,
        "rule": [
            "water: DEM water, or a 1979 water body of >= reservoir_min_cells cells",
            "tidal_flat: coast_change 2 within two cells of 1979 water, or elevation < 3 m within two cells of DEM water",
            "pond: coast_change 3 in a smaller 1979 water body, at or below pond_max_elev_m",
            "hill: slope > hill_slope_pct",
            "village: within village_radius cells of a village point, and KH-9 built texture",
            "town: within town_radius cells of a town, state-unit or railway point, and KH-9 built texture",
            "upland: slope > upland_slope_pct",
            "lowland_farm: everything else",
        ],
        "thresholds": {"reservoir_min_cells": RESERVOIR_MIN_CELLS, "pond_max_elev_m": POND_MAX_ELEV_M,
                       "hill_slope_pct": HILL_SLOPE_PCT, "upland_slope_pct": UPLAND_SLOPE_PCT,
                       "village_radius": VILLAGE_RADIUS, "town_radius": TOWN_RADIUS, "built_texture": BUILT_TEXTURE,
                       "kh9_min_cover": KH9_MIN_COVER},
        "caveats": [
            "The DEM is present-day: cut, fill and reclamation since 1979 are not undone.",
            "Water and ponds come from one automatic Landsat MSS threshold (60 m, October 1979); small fishponds below "
            "its resolution are missed and read as lowland_farm.",
            "Built texture is from KH-9 of 1980-09-11, after the first works began: evidence for that date, not 1979.",
            "Village and town anchoring uses low-confidence modern or registered period-image proxies. "
            "The points supply locality only; the built-texture and terrain rules still classify the cells.",
            "Cells without KH-9 coverage (about a sixth of Donghu-Liantang) can never be village or town.",
            "The 1977 street sheet and county map are not georeferenced: they audit and label, they do not classify.",
        ],
        "claims": CLAIMS,
        "grid": {"width": W, "height": H, "cell_m": float(g["meta"]["cell_m"])},
        "areas": areas,
    }
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"
    OUT.write_text(text, encoding="utf-8", newline="\n")
    for a in areas:
        print(a["id"], f"{a['key']:<16}", " ".join(f"{c}={n}" for c, n in a["counts"].items() if n))


if __name__ == "__main__":
    main()
