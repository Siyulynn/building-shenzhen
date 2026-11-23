# M1c: KH-9 1980 registration and the 1979→1984 change map

**Status:** first pass done (2026-11-23). This is spike-grade tooling: Phase 0 builds no archival tooling, and this work exists only because the slice's 1979→1983 arc needs a picture of what changed. Everything below is a `lead` observation. Nothing here is a calibration target.

## What this gives the gameplan, and what it doesn't

| Slice area | KH-9 1980-09-11 | Landsat 1984-11-22 | 1979→1984 change |
|---|---|---|---|
| 1 Market town | registered | no band data | — |
| 2 Luohu crossing | registered | no band data | — |
| 3 Caiwuwei | registered | no band data | — |
| 4 Huangbeiling | registered | 77% of land usable | **20% of compared land "cleared or built" (1.12 km²)**, against 1% on the control |
| 5 Sungang | registered, few control points | no band data | — |
| 6 Donghu–Liantang | 84% covered, few control points | 35% usable | 3% cleared (0.39 km²); "water then land" is reservoir level |
| 7 Shangbu | registered | no band data | — |
| 8 Shekou (card only) | 80% covered, west edge extrapolated | no band data | — |
| 9 Nantou (card only) | registered | no band data | — |

- **The 1984 Landsat scene does not cover the core.** Its band data stops at about UTM E 205.3 km (grid column 409). The scene's QA mask reports more than that: earlier in this session I said the 1984 coverage was better than the research suggested, and that was wrong. Of the playable areas, only Huangbeiling (4) and Donghu–Liantang (6) lie east of the edge.
- **So the end-1983 picture of the core needs other imagery.** The candidates in hand are listed in `docs/research/phase1-usgs-inventory.csv`:
  - the KH-9 frames of 1983-11-01 (`D3C1218-200853A005`, `A006`, `F005`, `F006`), the only end-1983 coverage. A KH-9 1980 → KH-9 1983 comparison is the same sensor, so it would beat the Landsat pair;
  - Landsat 3 `LM03_L1TP_131044_19820810` (path 131, the same path as the 1979 scene) as a same-sensor midpoint for the core.

  Neither is downloaded yet. The pipeline below runs on them unchanged.
- **Huangbeiling is the one firm signal.** About a fifth of its low, flat land changed from vegetated to bright between October 1979 and November 1984, twenty times the false-alarm rate on the control. In the KH-9 frame, 89% of those cells are *not* among the brightest land in September 1980. So most of the change came after 1980-09. That fits the slice's arc of building starting after the zone opens. The map can't say what was built, though: building sites, roads and bare fields look alike at 60 m.

## Inputs
| Source | Use |
|---|---|
| `landsat_1979_10_19` (Landsat 3 MSS, sun 46.0°) | reference geometry; the "before" scene |
| `landsat_1984_11_22` (Landsat 5 MSS, sun 39.2°) | the "after" scene (east only) |
| `kh9_1980_09_11_a048`, `_f047`, `_f048` (KH-9 Declass 3) | the 1980-09-11 photo |
| Spike A grid (UTM 50N, 100 m cells) | output grid; `pipeline/slice_areas.py` reads the slice areas from `content/slice/areas.yaml` (M1) |

## KH-9 registration (`pipeline/m1c_kh9_georef.py`)
1. `pipeline/kh9_reduce.py` streams each scan segment out of the archive (37289×24802 px, about 0.9 m) and keeps an 8× block average (about 7.5 m).
2. A coarse fit: SIFT matches against Landsat 1979 red, with voting over rotation (the aft camera is turned about 180°) and scale.
3. Tile-wise SIFT, pooled into an order-2 polynomial. This absorbs most of the panoramic distortion.
4. Two dense passes of normalised cross-correlation on difference-of-Gaussian band-passed images, against Landsat 1979 green+red (B4+B5) at 30 m. Only points with NCC ≥ 0.6 on low, flat land are kept. Order-2, then order-3 polynomials, with 3-sigma robust rejection.

**Accuracy, in metres, relative to Landsat 1979** (whose own geometric RMSE is 26.8 m):

| Segment | Points kept | Random 5-fold hold-out RMSE (median, p90) | 2 km spatial-block hold-out RMSE (median, p90) |
|---|---|---|---|
| A048 c (aft, the Luohu–Shangbu core) | 3408 | 27.8 (21.0, 42.4) | 28.5 (21.5, 43.8) |
| F048 b (forward, Shekou–Nantou) | 653 | 30.6 (24.1, 48.2) | 32.2 (26.3, 49.9) |

For comparison, A048 c's hold-out is 396.9 m at order 1 and 37.1 m at order 2. These two segments failed:
- A048 b, F047 b: too few points (cloud, or sea);
- F047 a and c, F048 a: the coarse fit failed.

**Control-point spread per area** (`pipeline/m1c_checks.py`):

| Area | Points inside | Median / p90 distance from a cell to the nearest point |
|---|---|---|
| 1–4, 7, 9 | 23–112 each | 107–143 m / 226–516 m |
| 5 Sungang | 20 | 845 m / 2.1 km |
| 6 Donghu–Liantang | 37 | 1.2 km / 3.2 km |
| 8 Shekou | 49 | 826 m / 10.4 km |

Points sit on low, flat land only. In the hills of Sungang and Donghu–Liantang, and on Shekou's western shore, the polynomial extrapolates. Read those parts by eye against the base map, and expect errors larger than the table's.

**The mosaic** (`pipeline/m1c_kh9_mosaic.py`, A048 c first, F048 b fills): the whole grid at 25 m, and the playable areas' box at 6.25 m. A check overlay put the 1979 site proxy points and today's water edges on the 1980 frame. The rail line, Luohu bridge and Shenzhen River sit where expected.

## The change map (`pipeline/m1c_landsat_change.py`)
1. DN to top-of-atmosphere reflectance, divided by sin(sun elevation).
2. A cell is valid when the QA fill bit is clear AND the band data is finite in both scenes. Cells above 120 m or steeper than 8° are excluded, because hill shadow differs between the two sun angles.
3. Water is NIR reflectance below 0.06. Median NIR is 0.028 / 0.032 for the reservoir and 0.022 / 0.028 for the sea (1979 / 1984), against 0.21 for low land.
4. Seasonal shift: the median NDVI change over a control (low, flat Longgang land outside the slice, 19,238 cells) is −0.081, with a MAD of 0.082. That median is subtracted.
5. A cell is **cleared or built** when its adjusted NDVI fell by more than 3 MADs AND red reflectance rose.
   - The control's own rate is **1.0%**: that is the false-alarm baseline.
   - Huangbeiling: 19.9%. Donghu–Liantang: 3.2%.
6. **Water then, land later:**
   - In Donghu–Liantang, 48 of the 52 cells lie within 200 m of water present on both dates (median elevation 28 m). That reads as a reservoir level change, not fill.
   - The viewer labels the class "level change or fill".

**KH-9 brightness at cleared cells:** a cell counts as already bright in 1980-09 when its KH-9 grey value is above the 90th percentile of stable land in the same area.
- Huangbeiling: 12 of 112 cells (11%).
- Donghu–Liantang: 6 of 33 (18%).

## Caveats
- Every layer is dated to its acquisition: 1979-10-19, 1980-09-11 and 1984-11-22. None of them is "1979" or "end-1983". 1984-11-22 is eleven months past the checkpoint.
- October against late November: harvest and fallow can read as cleared. The control removes the average shift, not local cropping patterns.
- 60 m MSS pixels are averaged into 100 m cells. KH-9's absolute error is a few tens of metres. That's good enough for 100 m cells and for spotting features. It isn't good enough for tracing footprints.
- A panoramic camera shifts hills by relief displacement.
- The slice areas are whole present-day proxy subdistricts (`content/slice/areas.yaml`), not period boundaries.
- **Nothing here goes into `checkpoint_1983q4.yaml` as a number.** The per-area shares may inform `design_note` bands, for example "Huangbeiling visibly breaks ground by 1984 while the hills stay green". They do that through claims only after a person reviews the imagery.

## Evidence records
- Control points: `data/evidence/observations/kh9/<source>_<segment>_gcps.csv`, each with a sidecar `.yaml` (protocol §10).
- The fitted models live in the git-ignored `data/raw/sources/<source>/reduced/<segment>_georef.json`. Steps 1–4 above refit them from the CSVs and the archived scans.

## How to rebuild
The venv (`pipeline/.venv`) needs rasterio, numpy, pyyaml, `opencv-python-headless` and scipy.
1. `pipeline/.venv/Scripts/python -I pipeline/kh9_reduce.py <source_id>` for each KH-9 archive.
2. `pipeline/.venv/Scripts/python -I pipeline/m1c_kh9_georef.py <source_id> <segment>`, for example `kh9_1980_09_11_a048 c`.
3. `pipeline/.venv/Scripts/python -I pipeline/m1c_kh9_mosaic.py kh9_1980 kh9_1980_09_11_a048:c kh9_1980_09_11_f048:b`.
4. `pipeline/.venv/Scripts/python -I pipeline/m1c_landsat_change.py`. This needs both Landsat bundles extracted under `data/raw/sources/<id>/extracted/`.
5. `pipeline/.venv/Scripts/python -I pipeline/m1c_checks.py kh9_1980 kh9_1980_09_11_a048:c kh9_1980_09_11_f048:b`.
6. `npm run spike:map`. The panel has toggles for the KH-9 1980 photo (it sharpens past 4× zoom), Landsat 1984 and the change map. Hovering shows each cell's change class.
