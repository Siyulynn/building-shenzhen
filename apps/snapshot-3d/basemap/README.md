# September 1980 base-map handoff / 1980 年 9 月底图交接

**Decision:** ready to start **illustrative aerial modelling**, beginning with the Shenzhenxu pilot. Not a surveyed, parcel-level, photo-calibrated or dated-height reconstruction. This handoff adds no meshes and does not change any built snapshot.

## Coverage and controls / 覆盖与配准

- **11 September 1980**, KH‑9 `D3C1216-300662A048`, segment C. The expanded **6.8 × 3.3 km** east–west window includes Shangbu, Caiwuwei, Shenzhenxu, Yumin, the Luohu–Guomao corridor, and the eastern hills and river approaches. Bounds `[198800, 2494100, 205600, 2497400]` in UTM 50N (`EPSG:32650`); atlas cell edges `[344,365,412,398]`. This is a modelling extent, not a period boundary.
- The new 3400 × 1650 chip has 100% valid raster samples. All 4,042,500 overlapping raw samples matched the original chip exactly. The original chip, viewer pins and picks are unchanged. The audit reran 2 km holdouts on Landsat-based ties: **21.1 m RMS west**, **26.1 m central**, **25.5 m east** and **24.7 m across the window** (54/74/81/209 points respectively). These are not independent survey checks or roof accuracy. In the west, the 90th-percentile distance to the nearest tie is 795 m, so fine placement in weak areas is not justified.
- Same-day F047/a was aligned locally to A048/c **for visual comparison only**. It corroborates the broad Shangbu cleared corridor and the previously open section of the eastern Shenzhen River meanders; no F047 geometry, height or placement accuracy is imported. The 1977 and 1987 paper references remain for names and relationships only.

## Files / 文件

| File | Use |
|---|---|
| [`basin-picks.json`](basin-picks.json) | Editable versioned observations in pixel-edge coordinates on the extended chip. Context claim IDs support names and chronology, not the measured positions of the picks. |
| [Projected JSON](../../../../georef/core-basin-1980-09-11.json) · [GeoPackage](../../../../georef/core-basin-1980-09-11.gpkg) | Authoring and atlas inputs in **UTM metres**, not WGS84 GeoJSON. The vector GeoPackage has one layer per JSON layer and no embedded raster. |
| [Local review plate](../../../../georef/basin-map-review-local.png) | Inspect coloured cover, crossings, the white Shenzhenxu pilot boundary and field-direction arrows on the KH‑9 chip. Uncoloured means unclassified. Local only. |
| [Modern 30 m relief patch](../../../../georef/basin_modern_dsm_30m.tif) · [Control and grounding report](../../../../georef/basin-controls.json) | Modern Copernicus DSM reprojected into the same CRS, with a 300 m collar and no missing samples. The grounding report flags raw modern gradients that are unsuitable for direct extrusion. Not period terrain, road grade, river stage or bathymetry. |

The export provides **22 alignments, 78 area picks, 10 junction/crossing records, five interpreted bank spans, seven field-direction clues and 21 place or gap markers**. The disjoint `cover` layer has 114 polygons, including **30.4% explicitly unclassified**. It covers the full window without gaps or positive-area overlaps. The Shenzhenxu pilot is about 43 ha, including about 28 ha of settlement envelopes and 5.5 ha unclassified. Five pilot frontage/connection lines tie the anonymous block skeleton to the western railway approach. None of these lines makes the Jiefang–Renmin names or widths certain.

## Use for the next pass / 后续建模用法

1. Read `alignments` and `cover` for the first blockout; use `area_picks` for original boundaries and follow stable parent IDs when attaching later changes. The `/1`, `/2`, … cover fragments are derived by priority clipping; don't use them as historical IDs. In atlas world coordinates, `x = E − 164450` and `z = 2533850 − N` (the origin is the centre of grid cell 0,0). Do not move the 100 m atlas grid.
2. Start inside `pilot-extent`: orient anonymous low-rise rows to the street candidates; use explicit no-build land, water and railway exclusions. Use visually neutral terrain for `unknown` rather than adding invented compounds or filling unmapped ground with fields. Use `pond_complex` as mixed bank-and-pond fabric, not a single water plane. `river_margin` is a **generated model exclusion**; bank-span picks are approximate image-edge checks, not surveyed widths. Leave sample widths and profiles editable in the model.
3. Treat the Luohu rail bridge and eastern bridge candidate as spans. `crossing_undetermined` does **not** authorise an at-grade junction. Don't assign the eastern span to Wenjindu without independent evidence or extend upstream Buji by joining nearby visible fragments. Don't make the representative yard tracks a surveyed turnout plan.
4. Ground the pilot with a local smoothed visual grade where the modern DSM runs over buildings or later works. The DSM gives a pilot sample range of 1.2–34.5 m, and it produces implausible raw grades along the river, rail and some streets. Use the flagged route spans to place grading checks; don't drape civil infrastructure on the raw cells or infer the state of Luohu Hill. Do not derive the 1979 or January 1984 geography from this export alone.

**Still open:** historic level and grade, individual building footprints and photo calibration, upstream Buji, the Wenjindu facility identity, and the named Shangbu sites. Refining uncertain banks, cover and these placements is compatible with starting anonymous aerial modelling. Leave the native 2 m raster, private comparison images and paper-map scans out of portable builds.

## Rebuild and verify / 重建与验证

From the research checkout root, with the existing GIS venv and `uv` (the vector exporter uses pinned GDAL bindings in an isolated tool environment):

```powershell
& 'pipeline/.venv/Scripts/python.exe' 'build/3d-snapshots/georef/extract_kh9_core.py' --basin
uv run --no-project --with 'pyogrio==0.12.1' --with 'shapely==2.2.0' python 'build/3d-snapshots/georef/export_basin_map.py'
& 'pipeline/.venv/Scripts/python.exe' 'build/3d-snapshots/georef/basin_controls.py'
& 'pipeline/.venv/Scripts/python.exe' 'build/3d-snapshots/georef/basin_map_review.py'
```

Run `basin_pick_grid.py` to regenerate the local pick grids, and `check_f047.py` for the optional alternate-view comparison. The exporter checks original-pick offsets, extent containment, polygon validity, area conservation, intersections and their classifications, route continuity, and the GeoPackage read-back. Check `checks` in the projected JSON for current counts.
