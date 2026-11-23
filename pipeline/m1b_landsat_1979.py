"""M1b: put the 1979-10-19 Landsat 3 MSS scene on the Spike A grid.

Input:  data/raw/sources/landsat_1979_10_19/extracted/*_B4..B7.TIF  (source landsat_1979_10_19)
        apps/map-spike/public/grid/meta.json + grid.bin              (Spike A grid, present-day DEM water)
Output (apps/map-spike/public/grid/, git-ignored):
  landsat1979.png      false colour (B7, B5, B4) at 50 m, aligned to the grid (2 px per cell)
  water1979.bin        uint8 per grid cell: 0 land, 1 water, 255 no data
  coast_change.bin     uint8 per grid cell: 0 same, 1 water in 1979 but land now (candidate reclamation),
                       2 land in 1979 but water now (mudflat, tide or error),
                       3 inland water in 1979, land on the DEM now (fishponds, reservoirs), 255 no data
  landsat1979.json     threshold, stats and caveats

Caveats (also written to landsat1979.json):
  - 60 m MSS pixels; USGS geometric RMSE 26.8 m; Tier 2.
  - A single acquisition at about 10:10 local time: tide state unknown, so mudflats in Shenzhen Bay may read as land.
  - The water/land split is an automatic threshold on the near-infrared band: an observation at `lead` until a person checks it.
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data/raw/sources/landsat_1979_10_19/extracted"
GRID = ROOT / "apps/map-spike/public/grid"
CRS = "EPSG:32650"


def band(n):
    return next(SRC.glob(f"*_B{n}.TIF"))


def to_grid(path, transform, shape, resampling):
    with rasterio.open(path) as src:
        out = np.zeros(shape, dtype=np.float32)
        reproject(rasterio.band(src, 1), out, src_transform=src.transform, src_crs=src.crs,
                  dst_transform=transform, dst_crs=CRS, resampling=resampling, src_nodata=0, dst_nodata=0)
    return out


def otsu(values):
    hist, edges = np.histogram(values, bins=256)
    centers = (edges[:-1] + edges[1:]) / 2
    w0 = np.cumsum(hist); w1 = w0[-1] - w0
    m0 = np.cumsum(hist * centers) / np.maximum(w0, 1)
    m1 = (np.sum(hist * centers) - np.cumsum(hist * centers)) / np.maximum(w1, 1)
    return float(centers[np.argmax(w0 * w1 * (m0 - m1) ** 2)])


def sea_from_edges(water):
    """Water cells connected to the grid edge (the 1979 sea and estuary), 4-connected flood fill."""
    H, W = water.shape
    sea = np.zeros_like(water, dtype=bool)
    q = deque((y, x) for y in range(H) for x in (0, W - 1) if water[y, x] == 1)
    q.extend((y, x) for x in range(W) for y in (0, H - 1) if water[y, x] == 1)
    for y, x in q:
        sea[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < H and 0 <= nx < W and not sea[ny, nx] and water[ny, nx] == 1:
                sea[ny, nx] = True
                q.append((ny, nx))
    return sea


def main():
    meta = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))
    W, H, cell = meta["width"], meta["height"], meta["cell_m"]
    x0, y1 = meta["origin_top_left"]
    n = W * H
    raw = (GRID / "grid.bin").read_bytes()
    water_now = np.frombuffer(raw, "u1", n, 2 * n).reshape(H, W)

    # 1. false-colour composite at 50 m
    hi_tr, hi_shape = from_origin(x0, y1, cell / 2, cell / 2), (H * 2, W * 2)
    rgb = [to_grid(band(b), hi_tr, hi_shape, Resampling.bilinear) for b in (7, 5, 4)]
    valid = rgb[0] > 0
    img = np.zeros((3, *hi_shape), dtype=np.uint8)
    for i, b in enumerate(rgb):
        lo, hi = np.percentile(b[valid], [2, 98])
        img[i] = np.clip((b - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
    img[:, ~valid] = 0
    with rasterio.open(GRID / "landsat1979.png", "w", driver="PNG", width=W * 2, height=H * 2, count=3,
                       dtype="uint8") as dst:
        dst.write(img)

    # 2. water mask at grid resolution from the near-infrared band (B7)
    nir = to_grid(band(7), from_origin(x0, y1, cell, cell), (H, W), Resampling.average)
    ok = nir > 0
    t = otsu(nir[ok])
    water79 = np.where(ok, (nir < t).astype(np.uint8), 255).astype(np.uint8)
    sea79 = sea_from_edges(water79)
    change = np.full((H, W), 255, dtype=np.uint8)
    change[ok] = 0
    change[ok & sea79 & (water_now == 0)] = 1                  # sea in 1979, land now: candidate reclamation
    change[ok & (water79 == 0) & (water_now == 1)] = 2
    change[ok & (water79 == 1) & ~sea79 & (water_now == 0)] = 3  # inland water in 1979 (ponds, reservoirs)
    (GRID / "water1979.bin").write_bytes(water79.tobytes())
    (GRID / "coast_change.bin").write_bytes(change.tobytes())

    dist = np.frombuffer(raw, "u1", n, 3 * n).reshape(H, W)
    inside = dist > 0
    stats = {
        "nir_threshold_dn": t,
        "cells_with_data": int(ok.sum()),
        "water_1979_cells_inside_city": int((inside & (water79 == 1)).sum()),
        "candidate_reclaimed_km2_inside_city": round(float((inside & (change == 1)).sum()) * cell * cell / 1e6, 1),
        "inland_water_1979_km2_inside_city": round(float((inside & (change == 3)).sum()) * cell * cell / 1e6, 1),
        "land_1979_water_now_km2_inside_city": round(float((inside & (change == 2)).sum()) * cell * cell / 1e6, 1),
    }
    out = {
        "source": "landsat_1979_10_19", "acquired": "1979-10-19T02:10Z", "bands": "B7,B5,B4 false colour",
        "png_cell_m": cell / 2, "stats": stats,
        "caveats": [
            "60 m MSS pixels; USGS geometric RMSE 26.8 m; Collection 2 Tier 2.",
            "One acquisition at about 10:10 local time; tide unknown, so mudflats may read as land.",
            "Automatic NIR threshold (Otsu): a lead-level observation until a person checks it.",
            "Present-day water comes from the 2011-15 DEM (<= 0.5 m), so inland reservoirs and fishponds differ in kind.",
            "About a fifth of the inland-water-1979 cells lie above 50 m: hill shadow, not water. Trust that class only on the plains.",
        ],
    }
    (GRID / "landsat1979.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
