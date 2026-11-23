"""M1c: what changed between the 1979-10-19 and 1984-11-22 Landsat MSS scenes, per 100 m grid cell.

Spike-grade (Phase 0 builds no archival tooling; this runs because the slice's 1979->1984 arc needs it).
Inputs:  data/raw/sources/landsat_1979_10_19/extracted (Landsat 3, bands 4-7)
         data/raw/sources/landsat_1984_11_22/extracted (Landsat 5 MSS, bands 1-4 = the same green, red, NIR, NIR)
         the Spike A grid (apps/map-spike/public/grid)
Outputs (apps/map-spike/public/grid/, git-ignored):
  landsat1984.png        false colour (NIR, red, green) at 50 m, like landsat1979.png; black = no data
  change_79_84.bin       uint8 per cell: 0 no data or excluded, 1 stable land, 2 greener, 3 cleared or built,
                         4 water then, land later (reservoir level change or fill), 5 land then, water later, 6 water both
  change_79_84.json      thresholds, the control, per-area table, caveats

Method:
  - DN -> top-of-atmosphere reflectance with the MTL factors, divided by sin(sun elevation) (46.0 vs 39.2 degrees).
  - Validity: the QA_PIXEL fill bit AND finite band data in both scenes (the 1984 QA is not flagged where the
    bands are already zero; the 1984 band data stops at about UTM E 205 km). Cells above 120 m or steeper than 8 degrees are excluded:
    hill shadow differs between the two sun angles.
  - Water: NIR reflectance below a fixed threshold, checked against the Shenzhen Reservoir and open sea in both years.
  - Greenness: NDVI from red and NIR. The seasonal shift (October vs late November, harvest) is removed by
    subtracting the median NDVI change over a control: low flat land in Longgang district, outside the SEZ.
  - "Cleared or built": NDVI fell by more than k x the control's spread AND red reflectance rose. It cannot tell
    a building site from bare fields, so it is a lead observation, never a target.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slice_areas import AREAS, GRID, ROOT, area_mask, load_grid  # noqa: E402

SCENES = {
    1979: (ROOT / "data/raw/sources/landsat_1979_10_19/extracted", {"green": 4, "red": 5, "nir": 7}),
    1984: (ROOT / "data/raw/sources/landsat_1984_11_22/extracted", {"green": 1, "red": 2, "nir": 4}),
}
WATER_NIR = 0.06       # TOA reflectance; checked against the reservoir and sea below
K_SPREAD = 3.0         # cleared or built: NDVI drop beyond K x control MAD
MAX_ELEV, MAX_SLOPE = 120, 8.0


def mtl(d):
    txt = next(d.glob("*_MTL.txt")).read_text()
    get = lambda k: float(re.search(rf"\b{k} = ([-\d.E+]+)", txt).group(1))
    return get, get("SUN_ELEVATION")


def to_grid(path, transform, shape, resampling, nodata_out=0.0):
    out = np.full(shape, nodata_out, dtype=np.float32)
    with rasterio.open(path) as s:
        reproject(rasterio.band(s, 1), out, src_transform=s.transform, src_crs=s.crs, dst_transform=transform,
                  dst_crs="EPSG:32650", resampling=resampling, src_nodata=0, dst_nodata=nodata_out)
    return out


def scene(year, transform, shape):
    d, bands = SCENES[year]
    get, sun = mtl(d)
    refl = {}
    for name, b in bands.items():
        dn = to_grid(next(d.glob(f"*_B{b}.TIF")), transform, shape, Resampling.average)
        r = (dn * get(f"REFLECTANCE_MULT_BAND_{b}") + get(f"REFLECTANCE_ADD_BAND_{b}")) / np.sin(np.radians(sun))
        refl[name] = np.where(dn > 0, r, np.nan)
    qa = np.zeros(shape, dtype=np.uint16)
    with rasterio.open(next(d.glob("*_QA_PIXEL.TIF"))) as s:
        reproject(rasterio.band(s, 1), qa, src_transform=s.transform, src_crs=s.crs, dst_transform=transform,
                  dst_crs="EPSG:32650", resampling=Resampling.nearest, src_nodata=None, dst_nodata=1)
    # QA_PIXEL alone overstates coverage: the 1984 QA is not flagged fill where the band data is already zero.
    refl["valid"] = ((qa & 1) == 0) & np.all([np.isfinite(refl[k]) for k in bands], axis=0)
    refl["sun_elevation"] = sun
    return refl


def false_colour(year, x0, y1, W, H, cell):
    d, bands = SCENES[year]
    tr, shape = from_origin(x0, y1, cell / 2, cell / 2), (H * 2, W * 2)
    rgb = [to_grid(next(d.glob(f"*_B{bands[k]}.TIF")), tr, shape, Resampling.bilinear) for k in ("nir", "red", "green")]
    valid = rgb[0] > 0
    img = np.zeros((3, *shape), dtype=np.uint8)
    for i, b in enumerate(rgb):
        lo, hi = np.percentile(b[valid], [2, 98])
        img[i] = np.clip((b - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
    img[:, ~valid] = 0
    with rasterio.open(GRID / f"landsat{year}.png", "w", driver="PNG", width=W * 2, height=H * 2, count=3,
                       dtype="uint8") as dst:
        dst.write(img)


def main():
    g = load_grid()
    W, H, cell = g["W"], g["H"], g["meta"]["cell_m"]
    x0, y1 = g["meta"]["origin_top_left"]
    tr = from_origin(x0, y1, cell, cell)
    s = {y: scene(y, tr, (H, W)) for y in SCENES}
    ndvi = {y: (s[y]["nir"] - s[y]["red"]) / (s[y]["nir"] + s[y]["red"]) for y in s}

    elev = g["elev"].astype(float)
    gy, gx = np.gradient(elev, cell)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    areas = area_mask(g)
    both = s[1979]["valid"] & s[1984]["valid"]
    usable = both & (elev <= MAX_ELEV) & (slope <= MAX_SLOPE)

    # water threshold check: Shenzhen Reservoir (area 6, water on today's DEM) and open sea outside the city
    reservoir = both & (areas == 6) & (g["water"] == 1) | both & (areas == 6) & (g["elev"] < 30) & (s[1979]["nir"] < 0.05)
    sea = both & (g["dist"] == 0) & (g["water"] == 1)
    landref = usable & (g["water"] == 0) & (g["dist"] == 5)
    check = {f"{y}": {k: round(float(np.nanmedian(s[y]["nir"][m])), 4) for k, m in
                      (("reservoir", reservoir), ("sea", sea), ("low_land_longgang", landref))} for y in s}
    w = {y: s[y]["nir"] < WATER_NIR for y in s}

    # control: low, flat land in Longgang, outside the slice, land in both years
    control = usable & (g["dist"] == 5) & (areas == 0) & ~w[1979] & ~w[1984]
    dn = ndvi[1984] - ndvi[1979]
    offset = float(np.nanmedian(dn[control]))
    mad = float(np.nanmedian(np.abs(dn[control] - offset)) * 1.4826)
    adj = dn - offset
    red_up = s[1984]["red"] > s[1979]["red"]

    ch = np.zeros((H, W), dtype=np.uint8)
    land_both = usable & ~w[1979] & ~w[1984]
    ch[land_both] = 1
    ch[land_both & (adj > K_SPREAD * mad)] = 2
    ch[land_both & (adj < -K_SPREAD * mad) & red_up] = 3
    ch[usable & w[1979] & ~w[1984]] = 4
    ch[usable & ~w[1979] & w[1984]] = 5
    ch[usable & w[1979] & w[1984]] = 6
    (GRID / "change_79_84.bin").write_bytes(ch.tobytes())
    for y in SCENES:
        false_colour(y, x0, y1, W, H, cell) if y == 1984 else None

    km2 = lambda m: round(float(m.sum()) * cell * cell / 1e6, 2)
    table = []
    for a, (key, _) in AREAS.items():
        m = areas == a
        land_now = m & (g["water"] == 0)
        row = {"area": a, "key": key, "land_cells": int(land_now.sum()),
               "usable_share": round(float((m & usable).sum() / max(land_now.sum(), 1)), 2),
               "cleared_or_built_km2": km2(m & (ch == 3)), "water_to_land_km2": km2(m & (ch == 4)),
               "land_to_water_km2": km2(m & (ch == 5)), "greener_km2": km2(m & (ch == 2)),
               "stable_land_km2": km2(m & (ch == 1))}
        table.append(row)
    out = {
        "scenes": {"1979": "landsat_1979_10_19 (1979-10-19)", "1984": "landsat_1984_11_22 (1984-11-22)"},
        "sun_elevation": {str(y): s[y]["sun_elevation"] for y in s},
        "water_nir_threshold": WATER_NIR, "water_check_median_nir": check,
        "control": {"where": "Longgang district, outside the slice, <= 120 m, <= 8 deg, land both years",
                    "cells": int(control.sum()), "ndvi_change_median": round(offset, 4), "ndvi_change_mad": round(mad, 4)},
        "cleared_threshold": f"NDVI change < -{K_SPREAD} x MAD after removing the control median, and red reflectance up",
        "per_area": table,
        "caveats": [
            "Two dates 5 years apart and 5 weeks apart in season (October vs late November); harvest and fallow can read as cleared.",
            "60 m MSS pixels averaged to 100 m cells; geometric RMSE about 27 m (1979) and 18 m (1984).",
            "'Cleared or built' cannot separate building sites, roads and bare fields: a lead observation, never a calibration target.",
            "Cells above 120 m or steeper than 8 degrees are excluded (different sun angles, hill shadow).",
            "The 1984 scene (path 121) has band data only east of about UTM E 205 km: of the slice areas, only Huangbeiling (4) and Donghu-Liantang (6). The core (areas 1-3, 5, 7) and the west need KH-9 1983-11-01.",
            "Water-then-land cells next to water on both dates are most likely a reservoir or pond level change, not fill; "
            "pipeline/m1c_checks.py counts them. The cleared share on the control is the false-alarm baseline.",
            "1984-11-22 is eleven months after the slice's end-1983 checkpoint.",
        ],
    }
    (GRID / "change_79_84.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: out[k] for k in ("water_check_median_nir", "control")}, ensure_ascii=False))
    for r in table:
        print(r)


if __name__ == "__main__":
    main()
