"""Raster-first R8a candidate. Run via m3c_landcover.py --candidate [--selftest].

Writes only to build/r8a-landcover/. The 3D renderer and GIS polygons are not
inputs. No candidate is used in the playable slice without a fresh audit.
"""
import argparse
import json

import cv2
import numpy as np
import rasterio
import yaml
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from scipy import ndimage

from m1_areas import runs
from m1b_landsat_1979 import sea_from_edges
from m1c_kh9_1977 import digest
from m1c_landsat_change import scene
from m3b_buildable import slope_pct
from slice_areas import GRID, ROOT, area_mask, load_areas, load_grid

OUT = ROOT / "build/r8a-landcover"
A010 = ROOT / "data/raw/sources/kh9_1977_12_03_a010/registered"
DSM = ROOT / "data/raw/sources/copernicus_dem_glo30"
TOWN = ROOT / "data/evidence/observations/r8a_town_core.yaml"
CLASSES = ["water", "tidal_flat", "pond", "hill", "village", "town", "upland", "lowland_farm"]
FORMABLE = (2, 5, 6, 7)
T = {
    "kh9_min_cover": .75, "texture77": 20., "texture80_fallback": 43.,
    "worksite_gray80": 200., "worksite_brighten": 40.,
    "texture77_strong": 30., "ndvi_built_strong": .40, "pond_ndvi": .24,
    "ndvi_built": .29, "ndvi_built_fallback": .26,
    "pond_max_elev_m": 20., "pond_max_slope_pct": 6.,
    "pond_nir": .157, "pond_gray77": 103., "pond_gray80": 116., "pond_texture77": 24.,
    "hill_slope_pct": 15., "upland_slope_pct": 6.,
    "dsm_sample_m": 30., "dsm_opening_px": 5, "dsm_max_correction_m": 10.,
    "large_water_min_cells": 50,
}
CLAIMS = [{"id": id_, "use": "design_note"} for id_ in (
    "phase1.map.kh9_1977", "phase1.map.kh9_1980", "phase1.map.landsat_1979", "phase1.map.shenzhenxu_refs",
    "site.shenzhen_market_town.exists_1979", "site.shenzhen_station.exists_1979")]


def photo_features(gray, valid, shape, box, ppc):
    """Use valid pixels only, including in the high-pass neighbourhood."""
    x0, y0, x1, y1 = box
    h, w = y1-y0, x1-x0
    if gray.shape != (h*ppc, w*ppc) or valid.shape != gray.shape:
        raise ValueError("KH-9 raster size does not match slice metadata")
    gray = gray.astype(np.float32)
    reduce = lambda a: a.reshape(h, ppc, w, ppc).sum(axis=(1, 3))
    blur = lambda a: cv2.GaussianBlur(a, (0, 0), 3.)
    support = blur(valid.astype(np.float32))
    smooth = blur(np.where(valid, gray, 0.)) / np.maximum(support, 1e-6)
    tex_valid = valid & (support >= .75)
    sl = np.s_[y0:y1, x0:x1]
    coverage = np.zeros(shape, dtype=np.float32)
    coverage[sl] = reduce(valid) / (ppc**2)
    features = {"coverage": coverage}
    for key, values, use in (("gray", gray, valid), ("texture", np.abs(gray - smooth), tex_valid)):
        a = np.full(shape, np.nan, dtype=np.float32)
        count = reduce(use)
        a[sl] = np.divide(reduce(np.where(use, values, 0.)), count,
                          out=np.full((h, w), np.nan, np.float32), where=count > 0)
        if key == "texture":
            a[sl][count / (ppc**2) < T["kh9_min_cover"]] = np.nan
        features[key] = a
    return features


def photos(g):
    info = json.loads((GRID / "kh9_1980.json").read_text(encoding="utf-8"))["slice"]
    box = info["cell_box"]
    shape = (g["H"], g["W"])
    ppc = round(g["meta"]["cell_m"] / info["px_m"])
    path80 = GRID / info["file"]
    img = cv2.imread(str(path80), cv2.IMREAD_UNCHANGED)
    if img is None or img.ndim != 3 or img.shape[2] != 4:
        raise ValueError(f"Missing or invalid 1980 RGBA mosaic: {path80}")
    f80 = photo_features(img[:, :, 0], img[:, :, 3] == 255, shape, box, ppc)
    report = json.loads((A010 / "registration.json").read_text(encoding="utf-8"))
    row = next(r for r in report["segments"] if r["segment"] == "D3C1213-400953A010_c")
    if not row["status"].startswith("relative registration passes") or report["reference_sha256"] != digest(path80):
        raise ValueError("Re-register A010/c against the current slice mosaic")
    path77 = A010 / (row["segment"] + ".tif")
    if digest(path77) != row["tif_sha256"]:
        raise ValueError("A010/c GeoTIFF does not match the registration report")
    west, north = g["meta"]["origin_top_left"]
    cell = g["meta"]["cell_m"]
    tr = from_origin(west + box[0]*cell, north - box[1]*cell, info["px_m"], info["px_m"])
    with rasterio.open(path77) as ds:
        if ds.crs.to_epsg() != 32650 or ds.transform != tr or ds.count != 2:
            raise ValueError("1977 KH-9 and the 1980 mosaic are not on the same grid")
        f77 = photo_features(ds.read(1), ds.read(2) == 255, shape, box, ppc)
    return f77, f80, {"kh9_1977": row["tif_sha256"], "kh9_1980": report["reference_sha256"],
                     "registration": digest(A010 / "registration.json")}


def terrain(g, playable):
    """Suppress small DSM peaks on a 30 m lattice; never call this historic bare earth."""
    cell = float(g["meta"]["cell_m"])
    west, north = g["meta"]["origin_top_left"]
    step = T["dsm_sample_m"]
    y, x = np.where(playable)
    x0, y0 = max(0, x.min()-4), max(0, y.min()-4)
    x1, y1 = min(g["W"], x.max()+5), min(g["H"], y.max()+5)
    e, n = west + x0*cell, north - y0*cell
    fine = np.full((int(np.ceil((y1-y0)*cell/step)), int(np.ceil((x1-x0)*cell/step))), np.nan, np.float32)
    fine_tr = from_origin(e, n, step, step)
    paths = sorted(DSM.glob("*.tif"))
    if not paths:
        raise FileNotFoundError(f"No Copernicus source tiles in {DSM}")
    for path in paths:
        with rasterio.open(path) as ds:
            reproject(rasterio.band(ds, 1), fine, dst_crs="EPSG:32650", dst_transform=fine_tr,
                      resampling=Resampling.bilinear, dst_nodata=np.nan, init_dest_nodata=False)
    valid = np.isfinite(fine)
    if not valid.any():
        raise ValueError("Copernicus tiles do not cover the playable window")
    if not valid.all():
        nearest = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True)
        fine[~valid] = fine[tuple(nearest[:, ~valid])]
    opened = ndimage.grey_opening(fine, size=(T["dsm_opening_px"],)*2)
    # Local cap: removing a narrow peak is plausible; wholesale regrading isn't.
    opened = np.maximum(opened, fine - T["dsm_max_correction_m"])
    opened[~valid] = np.nan
    patch = np.full((y1-y0, x1-x0), np.nan, np.float32)
    reproject(opened, patch, src_transform=fine_tr, src_crs="EPSG:32650", src_nodata=np.nan,
              dst_transform=from_origin(e, n, cell, cell), dst_crs="EPSG:32650", dst_nodata=np.nan,
              resampling=Resampling.average)
    elev = g["elev"].astype(np.float32)
    sl = np.s_[y0:y1, x0:x1]
    elev[sl] = np.where(np.isfinite(patch), patch, elev[sl])
    return elev, slope_pct(elev, cell)


def town_mask(shape):
    data = yaml.safe_load(TOWN.read_text(encoding="utf-8"))
    if data["coordinate_system"] != "slice_grid_cell_edges":
        raise ValueError("Town context mask must use slice cell edges")
    polys = [{"type": "Polygon", "coordinates": [r["ring"]]} for r in data["envelopes"]]
    return rasterize(polys, out_shape=shape, dtype="uint8").astype(bool)


def classify(water79, modern_water, elev, slope, f77, f80, nir, ndvi, town):
    """First match wins. A context polygon can split built cells but cannot create them."""
    wet = water79 == 1
    labels, n = ndimage.label(wet)
    sizes = np.bincount(labels.ravel(), minlength=n+1)
    large_water = wet & (sizes[labels] >= T["large_water_min_cells"])
    sea79 = sea_from_edges(water79)
    water = large_water | sea79 | (modern_water & (water79 == 255))
    tidal = ((water79 == 0) & modern_water & (elev < 3.) &
             ndimage.binary_dilation(sea79, iterations=2))
    ok77 = (f77["coverage"] >= T["kh9_min_cover"]) & np.isfinite(f77["texture"])
    ok80 = (f80["coverage"] >= T["kh9_min_cover"]) & np.isfinite(f80["texture"])
    dark_both = (ok77 & ok80 & (f77["gray"] < T["pond_gray77"]) & (f80["gray"] < T["pond_gray80"]) &
                 (f77["texture"] < T["pond_texture77"]))
    # open water reflects little NIR and has no canopy: a dark grove village is dark on both dates too, but green
    dark_wet = dark_both & (nir < T["pond_nir"]) & (ndvi <= T["pond_ndvi"])
    pond = ((elev <= T["pond_max_elev_m"]) & (slope <= T["pond_max_slope_pct"]) & ((wet & ~sea79) | dark_wet))
    # 1979-80 clearing: bright, bare ground in September 1980 that brightened since December 1977. It is not
    # pre-opening fabric, whatever its 1977 field-bund texture (Shangbu's and Caiwuwei's worksites)
    cleared = (ok77 & ok80 & (f80["gray"] >= T["worksite_gray80"])
               & (f80["gray"] - f77["gray"] >= T["worksite_brighten"]))
    # strong 1977 roof texture stands even where October 1979 reflectance is green (tree-shaded villages)
    built77 = ok77 & ~cleared & (((f77["texture"] >= T["texture77"]) & (ndvi <= T["ndvi_built"]))
                                 | ((f77["texture"] >= T["texture77_strong"]) & (ndvi <= T["ndvi_built_strong"])))
    built80 = ~ok77 & ok80 & (f80["texture"] >= T["texture80_fallback"]) & (ndvi <= T["ndvi_built_fallback"])
    built = built77 | built80
    rules = [water, tidal, pond, slope > T["hill_slope_pct"], built & ~town, built & town,
             slope > T["upland_slope_pct"], np.ones(slope.shape, dtype=bool)]
    cls = np.select(rules, np.arange(len(CLASSES), dtype=np.uint8), default=np.uint8(255))
    return cls, {"kh9_1977_usable": ok77, "kh9_1980_usable": ok80, "built_1977_support": built77,
                 "built_1980_only": built80, "cleared_1979_80": cleared, "pond_dual_date_signal": dark_wet}


def selftest():
    good = np.ones((6, 6), dtype=bool)
    alpha = good.copy()
    alpha[:, 0] = False
    img = np.where(alpha, 150, 0).astype(np.uint8)
    f = photo_features(img, alpha, (1, 1), (0, 0, 1, 1), 6)
    assert f["coverage"][0, 0] > .75 and f["gray"][0, 0] == 150 and f["texture"][0, 0] < 1e-3
    z = np.zeros((3, 6))
    water = z.copy()
    water[1, 0] = water[1, 3] = 1
    elev, slope = z + 10, z.copy()
    slope[1, 1:3] = [8, 16]
    f77 = {"coverage": z + 1, "gray": z + 150, "texture": z + 35}
    f80 = {"coverage": z + 1, "gray": z + 150, "texture": z + 50}
    f77["coverage"][0, 1] = 0
    f77["texture"][0, 2:4] = 8
    f77["gray"][0, 3] = f80["gray"][0, 3] = 60
    ndvi, nir = z + .2, z + .13
    ndvi[0, 4] = .5
    ndvi[1, 1] = .5
    town = z.astype(bool)
    town[0, :5] = True
    args = water, z.astype(bool), elev, slope, f77, f80, nir, ndvi, town
    a, flags = classify(*args)
    assert np.array_equal(a, classify(*args)[0])
    assert list(a[0]) == [5, 5, 7, 2, 7, 4] and list(a[1, :4]) == [0, 6, 3, 2]
    assert flags["built_1980_only"].sum() == 1
    print("Raster candidate self-test passed")


def record_areas(cls, mask):
    for a in load_areas():
        if a["access"] == "playable":
            inside = mask == a["id"]
            by = {c: inside & (cls == i) for i, c in enumerate(CLASSES)}
            row_runs = {c: runs(v) for c, v in by.items()}
            yield {"id": a["id"], "key": a["key"], "cell_count": int(inside.sum()),
                   "counts": {c: int(v.sum()) for c, v in by.items()},
                   "runs": {c: v for c, v in row_runs.items() if v}}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    if parser.parse_args(argv).selftest:
        return selftest()
    g = load_grid()
    shape = (g["H"], g["W"])
    mask = area_mask(g)
    playable = np.isin(mask, [a["id"] for a in load_areas() if a["access"] == "playable"])
    cell = g["meta"]["cell_m"]
    tr = from_origin(*g["meta"]["origin_top_left"], cell, cell)
    s = scene(1979, tr, shape)
    nir, red = (np.where(s["valid"], s[k], np.nan) for k in ("nir", "red"))
    ndvi = (nir - red) / np.where(nir + red > 0, nir + red, np.nan)
    water79 = np.fromfile(GRID / "water1979.bin", dtype=np.uint8).reshape(shape)
    f77, f80, hashes = photos(g)
    elev, slope = terrain(g, playable)
    cls, flags = classify(water79, g["water"] > 0, elev, slope, f77, f80, nir, ndvi, town_mask(shape))
    areas_path = ROOT / "data/starts/slice_areas.json"
    mss_paths = sorted(p for p in (ROOT / "data/raw/sources/landsat_1979_10_19/extracted").iterdir()
                       if p.name.upper().endswith(("_B4.TIF", "_B5.TIF", "_B7.TIF", "_QA_PIXEL.TIF", "_MTL.TXT")))
    out = {
        "format": 1, "generated_by": "pipeline/m3c_landcover.py --candidate", "placeholder": True,
        "evidence_status": "lead", "areas_sha256": json.loads(areas_path.read_text(encoding="utf-8"))["areas_sha256"],
        "classes": CLASSES, "thresholds": T, "claims": CLAIMS,
        "inputs": {**hashes, "town_context": digest(TOWN), "water1979": digest(GRID / "water1979.bin"),
                   "grid": digest(GRID / "grid.bin"),
                   "landsat": {p.name: digest(p) for p in mss_paths},
                   "dsm": {p.name: digest(p) for p in sorted(DSM.glob("*.tif"))}},
        "caveats": ["Unshipped candidate; thresholds are exploratory. Acquisitions bracket the opening, not a January 1979 survey.",
                    "1977 support is relative to 1980. 1980-only built calls have no pre-opening image corroboration.",
                    "Filtered modern DSM is not period relief. The town mask names detected fabric, not parcels.",
                    "Dark-tone and Landsat signals only flag pond candidates; missing coverage proves nothing."],
        "grid": {"width": shape[1], "height": shape[0], "cell_m": cell},
        "areas": list(record_areas(cls, mask)),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "candidate.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n",
                                       encoding="utf-8", newline="\n")
    np.savez_compressed(OUT / "features.npz", cls=cls, area=np.where(playable, mask, 0),
                        elev=elev, slope=slope, nir=nir, ndvi=ndvi, **flags)
    for a in out["areas"]:
        p = mask == a["id"]
        usable = int((p & flags["kh9_1977_usable"]).sum())
        print(a["key"], f"1977 usable {usable}/{p.sum()}", " ".join(f"{c}={n}" for c, n in a["counts"].items()))
