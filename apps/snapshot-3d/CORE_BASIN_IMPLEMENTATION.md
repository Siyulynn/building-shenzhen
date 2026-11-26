# Core basin 3D implementation plan / 核心盆地三维实施计划

**Scope:** `build/3d-snapshots/`, on the isolated `3d-snapshots` branch. This plan does not change the Phase 1 playable slice, simulation, or production renderer.

## Target / 目标

Build a continuous 3D core basin **including Shangbu (上步)**. From a fixed high or tilted aerial camera, the old town, villages, worksites, railway, roads, water, fields and hills should read as one landscape. Most of that landscape will use procedural geometry. Key buildings and selected streets or compounds will use detailed models checked against dated photos. Neither procedural massing nor an inferred detail becomes historical evidence just because it looks convincing.

| Built scene / 三维场景 | Role / 用途 |
|---|---|
| **11 September 1980 / 1980 年 9 月 11 日** | Build first, as a selectable 3D baseline tied to the KH‑9 acquisition. Visible features constrain the scene; inferred geometry and illustrative fill remain marked as such. The KH‑9 photo, traces and place pins stay independently selectable. |
| **1979 opening / 1979 年初** | Derive from the baseline using earlier evidence and explicit backwards changes. October 1979 imagery can corroborate broad features but does not depict the opening cutoff. |
| **January 1984 / 1984 年 1 月** | Derive from the baseline using dated changes and the January visit cutoff. Show work in progress where supported, not the eventual finished buildings or road network. |

Extend the existing **4.9 × 3.3 km** review window west to encompass Shangbu, including the Shennan approach and early industrial sites. Lock the actual UTM bounds after checking image coverage and framing the district with the other core areas. Keep Shenzhenxu, Caiwuwei, Yumin, Luohu/Guomao, Wenjindu and the eastern uplands in view; include enough river-bank, northern and hillside context to avoid a visible seam. Shangbu is in scope; further expansion into Sungang or Bagualing is not required for this delivery. Shekou and Nantou remain separate studies.

## Starting point / 现有基础

- **Terrain and viewer:** The M0–M2 atlas has a shared metre grid (UTM 50N, `EPSG:32650`), modern Copernicus relief on the 100 m atlas grid, six illustrative focus areas, two built scenes and an offline viewer. It does not yet have period street grades or full-basin 3D buildings.
- **Imagery and mapping:** The [KH‑9 georeference review](../../../georef/README.md) and [`kh9-observations.json`](kh9-observations.json) supply a 2 m *sampled* A048/c chip, 19 selected geometry traces and 17 bilingual place pins. The inherited A048/c **28.5 m RMS is relative to Landsat**, not survey accuracy. The refined 1977 street-sheet and 1987 composite trials missed their placement gates (60.3 m and 46.0 m reserved-check RMS respectively). Use them for names and relationships, not metric placement. The crop does not yet reach Shangbu.
- **Basin and assets:** [`src/basin.ts`](src/basin.ts) draws older draft ribbons and textured polygons from `core-trace.json`; it does not turn the newer observations into geometry. [`atlas.json`](atlas.json) and `src/parts.ts` assemble illustrative boxes and kit parts. The [3D review](../../../../../docs/spikes/3d-scene-review.md) and [Yumin study](../../../../../docs/spikes/yumin-street-field-study.md) establish reusable massing, Blender kits and Hybrid “Illustrated Maquette” styling, not photo-calibrated site layouts.
- **Closing-date gap:** The [catalog check](../../../../../docs/research/kh9-core-basin-shortlist.md) excludes the previously listed November 1983 frames from the core; the reported October–December 1983 search found no core hits. The available November 1984 MSS also misses the core and postdates the target. Do not wait for a single closing-date aerial or treat later maps as January ground truth.

## Work packages / 实施步骤

### 1. Extend the base and map one pilot area / 扩展底图与试点制图

**Delivered for modelling:** see the [September 1980 base-map handoff](basemap/README.md) for the extended Shangbu window, editable vectors, projected export, review plate, relief proxy and unresolved features.

1. Preserve the original crop and its pixel-relative picks. Use the archived A048/c segment to extract a **versioned wider chip** through Shangbu. Inspect native validity, relief displacement and overlap with the original crop; reproject its picks to metres without changing their IDs or locations. Use the archived F047 as an independent visual check for missing reaches and ambiguous crossings **if usable**; its earlier basin registration did not pass, so don't assume a usable warp or stereo model. Use stable, unambiguous points and held-out checks across the extension. Record weak areas rather than stretching the image to fit.
2. Build a small projected GIS input set for the atlas (GeoPackage for editing; an atlas-ready export in the same reference system). Start with **Shenzhenxu from the old-town crossroads to the railway**. Extend by sector into Yumin/Luohu and Caiwuwei–Shangbu once the pilot works. Track coverage as mapped, uncertain or unmapped; model fill may cover any of these, but is not an observation.

| Map layer / 图层 | Minimum to author / 最小制图要求 |
|---|---|
| Water and lowlands / 水系与低地 | Major channel centrelines, visible banks and pond/bund edges where resolvable; separate pond cells from village land. Review the eastern Shenzhen River gap and upstream Buji. Preserve unresolved gaps in the observations; any needed rendered connection is separate and labelled. |
| Transport / 交通 | Rail alignment, Luohu yard and major sidings where legible, station/bridge approaches, major roads including the Shennan corridor west to Shangbu, town street skeleton and select dyke lanes. Record width bands only where defensible; distinguish bridge crossings from at-grade junctions. Do not equate bright lines with named roads without corroboration. |
| Settlement and works / 聚落与工地 | Map settlement and worksite envelopes, principal frontages and orientation, not every roof. Separate Shenzhenxu, Yumin, station/yard, Caiwuwei, outlying villages and Shangbu development areas. Keep visually inferred building types, individual placements and project names separate from the traced envelopes. |
| Fields, slopes and cover / 农田、地形与植被 | Map field blocks and their dominant direction, open land, scrub/wooded upland and possible bare or graded ground. Allow `unknown` where crop type, use or limits aren't clear. Use broad relief for context, not the modern DEM as evidence of historic hill cutting. |

**Start modelling when:** the expanded bounds and coverage are documented, the existing observations align in the new metre frame, and the pilot has street and settlement envelopes, terrain contact and no unexplained network intersections. A complete parcel map, resolved paper-map fit or three dates of aerial coverage is not a prerequisite.

### 2. Build the September 1980 aerial scene / 建设 1980 年 9 月航空视角场景

**First pass delivered:** see the [procedural basin generator](BASIN_GENERATOR.md) for the illustrative basin-wide fabric, civil ribbons, bridges, water, detail-area masks and the review of this handoff.

1. Make the Shenzhenxu pilot as seeded, street-oriented rows and courtyards of low-rise 3D massing with simple roof profiles. Replace the generic cross layout in the pilot rather than adding duplicate fabric under it. Review it from overhead and a tilted aerial before scaling the generator.
2. Apply the same approach across the basin: instanced village and compound masses; fields with narrow bunds, ditches and varied plot orientation; separate pond surfaces and banks; road and rail beds, junctions and bridges; clustered vegetation on slopes. Use one Hybrid palette for the generated and hand-authored parts. Build coarse silhouettes for distant views and reserve detailed roofs, façades and props for focus cameras.
3. Test a local native 30 m Copernicus patch and blend its edges into the atlas grid. It is still a **modern surface proxy**. Use explicit local grades, foundations and crossing geometry where the DEM cannot support water, rail or roads cleanly. Keep Luohu Hill contours and grading unplaced unless dated relief or works evidence supports them.
4. Give focus areas clear replacement boundaries so detailed models can take over without duplicate buildings, roads or terrain. Keep the 1980 photo review intact as the reference for matched overhead checks, not a texture for the built scene.

**Aerial acceptance:** fixed overhead and tilted frames show a continuous basin from Shangbu to the eastern uplands; water, transport, settlement and fields read at the intended zoom. No floating buildings, obvious terrain seams, submerged bridge decks or doubled focus blocks. Compare against the traced envelopes and alignments, not a claimed per-roof fit. Measure draw calls and frame time at fixed cameras on a recorded test device; use the [3D protocol](../../../../../docs/design/3d-modelling-protocol.md) neighbourhood target (≤120 draw calls) as an initial budget, not a measured result.

### 3. Gather references and qualify detailed areas / 收集照片与核定细节区

See the [Task 3 photo register / 任务三影像登记](../../../../../docs/research/core-basin-task3-references.md) for local photo triage, period references, and placement checks by area.

Start with the [local photo inventory](../../../../../data/evidence/observations/shenzhenxu_manual_references.csv) and inspect uncatalogued files under `data/raw/` before requesting new material. Match or recover the original caption, photographer/holding, date or date range, and viewpoint. Screen pre-opening and intermediate KH‑9 leads by footprint and preview before acquiring scans. For the border, check Hong Kong historical aerials and the April 1984 revised survey sheets (`HKRS728-6-3`, `HKRS728-6-9`) as later comparators. For each detailed model, collect a dated and locatable view, an independent placement or scale anchor, and a second angle or plan where possible. Record what each source actually constrains: position, orientation, extent, bays/storeys, roofline, frontage or construction stage.

| Priority / 优先区 | Gather and resolve before detailed placement / 精模前需核实 |
|---|---|
| **Shenzhenxu / 深圳墟** | Locate the Jiefang–Renmin crossroads and Nantang Market lanes using dated street or oblique photos and stable anchors; recover original captions for the local market panoramas. Prioritise one photographed frontage and Shenzhen Theatre; add Friendship Department Store to January 1984 only once its period site is anchored. Keep the theatre, old bus station and other uncertain roofs as search areas until matched. |
| **Luohu–Guomao / 罗湖—国贸** | Locate the period station building, yard and bridge deck separately; obtain a dated station/bridge photo set and site plan if available. Establish Guomao and Guoshang placement independently, then use dated obliques or works records for the January slipform stage. The visit establishes work in progress, not the exact January storey count. Preserve that uncertainty rather than fitting a finished tower backwards. |
| **Yumin / 渔民村** | Verify the original caption and viewpoint of the Water Bureau aerial labelled “1981”; seek a second angle or dated plan tying house rows, lanes and ponds together. Look for villa and workshop frontage views. Do not use pond positions as house footprints or force the disputed early villa count into the scene. |
| **Caiwuwei–Shangbu / 蔡屋围—上步** | Locate the county compound and road works using the 1981 Caiwuwei and 1982 Shennan photo leads; distinguish design widths from what was built on each section. For Shangbu, map the lowland and village envelopes first, then seek dated site plans or photos for early factories (including Huafa No. 1) and the Electronics Building. A development proposal does not locate an as-built footprint. |

**Detail acceptance:** check each model from a recreated photo camera against silhouette, frontage rhythm and anchored proportions. Compare a second angle or a plan where possible. Unknown sides, dimensions and finishes remain inferred; if identity, date or placement is still ambiguous, keep the asset as a prototype or use anonymous procedural fabric. Time one human-authored stretch and verify the transition from the detailed area to the aerial basin before expanding close-up coverage.

### 4. Derive and compare both bookends / 派生与对比两端快照

- Use **stable feature IDs plus explicit per-epoch changes**, not three disconnected copies or hard-coded year rules. Each feature records its observation date/range, source and locator/claim IDs, what the source supports, placement uncertainty, and modelling status. Distinguish observed geometry, source-supported inference and illustrative fill. Record additions, removals, moves, footprint changes and construction stages separately. A feature may be observed in one scene and inferred in another.
- **1979:** use pre-opening sources to corroborate continuity and roll back known post-opening changes. The 1977 maps can guide the street skeleton; screen the December 1977 coverage and 1979 leads for scene-specific corroboration. If unchanged-looking fabric is reused without a period confirmation, record that as a continuity assumption, not a backdated observation.
- **January 1984:** apply only changes supported by the cutoff. Prioritise the visible differences in Yumin housing/workshops, Shennan and Shangbu works, and the Guomao/Guoshang skyline. Use the project records to bound stages and dated photos or plans to place them. Later 1984 photos and the 1985 map can help identify locations or bracket changes, not prove those changes were already complete in January.
- Keep all three camera framings comparable. Test that date switches apply the intended changes, retained features stay put, and the independent photo layers and pins do not change date or position. Check valid geometry, crossings and clearances, containment of generated instances, terrain seams, and deterministic regeneration.

## Delivery / 交付

Deliver the expanded coverage map and trace/change register, the September 1980 baseline, the two derived scenes, and a matched-camera review set with source notes and unresolved items. Export a **new** portable atlas without overwriting previous reviews. The earlier distributable coarse imagery can remain; keep the native 2 m chips, reference-only scans, private warps and unlicensed photo pixels out of the export. Run `npm run check`, the atlas build, and desktop-browser checks of all three scenes and the offline export.

**First implementation pass:** lock the Shangbu extent, extract the wider A048/c review chip, and map and mesh the Shenzhenxu pilot. Begin photo triage alongside that work; do not wait for every hero reference to start the procedural basin.
