# Municipal GIS draft and core-polish handoff / 全市底图初稿与核心区完善

Implementation of [steps 1–2](../MUNICIPAL_3D_PLAN.md). The core polish is live in `snapshot-3d`; the municipal output is a **separate GIS review draft**, not yet the citywide 3D scene.

This is the Steps 1–2 handoff. The [Step 4B–4C handoff](../MUNICIPAL_STEP4BC.md) describes the expanded draft, current rebuild commands, and 30 m rail review.

## Core / 核心区

- The 30 m Copernicus modern surface patch is sampled in UTM before smoothing. The 20 m render lattice still meets the 100 m atlas terrain exactly at its edge. Old or unprepared viewers can use the explicitly labelled 100 m fallback. Neither input is historical grade evidence.
- Smooth base relief shading, subtle haze and neutral colour variation soften the core patch; no objects were generated on `unknown`. The outer settlement and civil extent remains visible until the municipal collar is rendered.
- Draft river widths are 82 / 62 / 48 m (western main reach / eastern main reach / Buji). They are model values guided by scattered bank-span picks, not an adoption of any one visible span as a fixed width. The main reaches taper to a common width and height at their join; carving, corridor clearance and bridge span use the model profile. Ballast skirts are narrower.
- Four rail intersections render approximate level approaches. The southern transverse road has a generic estimated deck over the lower Buji. The west approach at Buji remains open. The KH‑9 crossing records are unchanged; each visual treatment is listed in the viewer and in `basin-gen.json`. Existing dated layouts, the photo layer, and named landmark placements are unchanged.

## Municipal / 市域底图

| Handoff | Content |
|---|---|
| [`municipal-picks.json`](municipal-picks.json) | The editable guides and source locators (cell-edge coordinates or exact core endpoint references). The 1977 sheet supplies topology, not a projected metric line. Modern station coordinates are only Buji/Pinghu vicinity controls. |
| [Projected JSON](../../../../georef/municipal-gis.json) | Eight lines (four KCR corridor spans, two old Guangzhou–Shenzhen road spans, one cleared Shangbu continuation and one downstream Shenzhen River continuation), and five coarse settlement/field envelopes. Separate from the core and in EPSG:32650 metres. The inferred connection to the core’s unnamed southern approach is not its identification as the old through road. |
| [Water context](../../../../georef/municipal-water-context-oct1979.tif) | October 1979 MSS-derived sea-connected lowland water, possible intertidal/change cells, isolated lowland water, the Shenzhen Reservoir component and unknown/shadow/no data. This is a dated comparator, not a September 1980 shoreline, dam map or historical water-level reconstruction. |
| [Review plate](../../../../georef/municipal-review.png) | Draft vectors over neutral modern relief and the water comparator. Dashed routes are estimates, orange highlights the rail legs requiring profile review, and hatching marks missing or ambiguous water data. The core bounds are shown in white. No private scans are in the plate or the portable viewer. |

The export validates feature and claim references, same-corridor continuity, core endpoint matches, outline validity and absence of unintended line intersections. A terrain-constrained candidate stays inside the authored search band; the band is a desk-review extent, not a statistical error or a surveyed right of way. The rough profiles screen the geometry against a smoothed **modern** surface, not against period engineering grades. **Buji–Pinghu and the northern continuation stay `review_required`**; the Lo Wu context still has two water-candidate samples near the river crossing to retain for profile review. No candidate has been promoted to observed or true-to-life placement.

Registered KH‑9 alpha covers about **27% of the whole grid**, **93% of the selected core–Buji collar**, and almost none of the selected Buji-to-north box. Alpha only measures available raster samples; it does not exclude cloud, edge/film markings or misregistration. Prioritise better rail controls north of Buji, dated east/northeast road sources, additional water and settlement pilots and verified junction types before compiling a full city network. Do not invent a continuous Shennan carriageway, dams or a fence line from the present draft.

## Rebuild / 重建

From the research checkout with the existing GIS venv (prepare the base grid first):

```powershell
& 'pipeline/.venv/Scripts/python.exe' 'build/3d-snapshots/Shenzhen-3d/apps/snapshot-3d/prepare-relief.py'
& 'pipeline/.venv/Scripts/python.exe' 'build/3d-snapshots/Shenzhen-3d/apps/snapshot-3d/prepare-municipal.py'
```

The relief command packs the handoff GeoTIFF into `public/grid/core-relief.json`, also embedded by `portable.mjs` when available. The second command writes the local GIS artifacts under `build/3d-snapshots/georef/`. It does not change source GIS, copy image pixels to the atlas or load municipal features into either dated epoch.
