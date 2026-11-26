# External resources: reuse plan

**Status:** revised after Spike B technical benchmarks (2026-11-23). Supplements [PLAN §5, §6 and Spike B](../../PLAN.md) and feeds directly into the [3D Modelling & Municipality Rendering Protocol](3d-modelling-protocol.md). Phase 1 on `main` stays a playable top-down 2D slice; all disposable benchmark artifacts stay in Git-ignored `build/`.

## What to adopt

| Source | Use in Building Shenzhen | Boundary |
|---|---|---|
| [Blender Geometry Nodes](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/index.html) and [Building Tools](https://github.com/ranjian0/building_tools) (MIT add-on) | Offline authoring of modular roofs, balconies, windows and landmark pieces; bake and export reusable GLBs. Time an add-on workflow against native Blender before depending on it. | Blender is an authoring tool, not the runtime or the source of simulation state. Don't start by exporting every building as a bespoke scene. |
| [OSM2World](https://github.com/tordanik/OSM2World) (MIT; [default style](https://github.com/tordanik/OSM2World-default-style) CC0) | Run offline on a small modern Luohu extract to benchmark geometry import, visual scale and rendering. | Modern OSM is a proxy or performance fixture, never period geometry by default. A small extract is not a citywide performance test. |
| [histo3d](https://github.com/CamilleMorlighem/histo3d) (MIT repository; audit bundled code separately) | Adopt the workflow: georeference a dated source, vectorize what is legible, attach provenance, then generate volumes with separate rules. Use the existing Python GIS pipeline and QGIS for hand correction. | Don't adopt the legacy Blender/GRASS/add-on stack as a dependency. The imagery already registered is suitable for context, not individual footprint or facade claims at its current accuracy. Use better dated maps/photos for route geometry or mark the result as inferred. |
| [Procedural Building Grammar](https://github.com/p-schulz/osm_building_grammar) (Apache-2.0) | Reference its pattern of deduplicated GLB parts plus placement data, if hand-authoring repeated detail becomes costly. | No new placement schema or building serializer during Phase 1. |
| [Kenney Industrial](https://kenney.nl/assets/city-kit-industrial) and [Poly Haven](https://polyhaven.com/license) (CC0 assets) | Placeholders and generic surfaces; first compare against the lab's own palette and procedural textures. | Not evidence for Shenzhen architecture. Check each imported asset's terms and don't use conspicuously modern or off-style props in a period scene. |
| [IsoCity](https://github.com/amilich/isometric-city) and [Cimulity](https://github.com/zeikar/cimulity) (MIT code) | At M6, use their toolbar and inspector patterns, zoning drag previews, and blocker explanations. Keep the existing zone-run contract and `zoneCellsAllowed`. | No fork, no imported economy, no requirement for Next.js or PixiJS. Buildability comes from Shenzhen's existing layer, not from a donor's slope rules. |
| [A/B Street](https://github.com/a-b-street/abstreet) (Apache-2.0) | Later, consult its [intersection geometry](https://a-b-street.github.io/docs/tech/map/geometry/index.html) for joining buffered road centrelines and turning a network into drawable geometry. | Adapt only if a small set of actual junctions needs it. Keep area-to-area travel times; no Rust runtime or vehicle-level traffic dependency. |
| [UrbanSim](https://github.com/UDST/urbansim) (BSD-3-Clause) | Later, compare location-choice and development feasibility against the existing area-demand and parcel-selection rules. Test offline with evidence-backed inputs as part of calibration. | No wholesale adoption, no assumptions imported as Shenzhen data, no Python runtime inside `sim-core`. |

## Where the work belongs

- **Phase 1:** stay with the existing Canvas planning map. Use interface patterns as playability needs them; the deterministic monthly simulation, quarterly turns, and authoritative state stay in `sim-core`.
- **After Phase 1, Spike B:** use the existing `3d-track` `apps/render-lab` as the visual baseline: realism, maquette and hybrid styles; rooftop, aerial and Yumin cameras; scripted construction-state controls. Those controls are fixtures, not a simulation integration. Compare new geometry under a fixed camera and style rather than replacing the art direction.
- **Production path if the spike succeeds:** the renderer assembles ordinary buildings from block stocks and stable identifiers, and reads tracked structures and alterations from the owning specs. Generate repeated city fabric and distant masses in Three.js; keep close-up parts and landmarks as optional Blender-authored GLBs. The renderer never writes simulation state. Draw imported and generated pieces with a coherent palette; don't make a full-scene `.blend` file the authoritative map.
- **Keep two different views:** straight-down for zoning and data overlays; fixed-angle orthographic 3D as the first candidate for City view. An authored 3D kit handles arbitrary slopes and variable storeys without redrawing sprites. Full free-fly earns its place with the scale test. If 3D runtime cost is too high, bake fixed-angle sprites from the same kit; don't start a parallel hand-pixel-art pipeline.

## Test order and gates

1. **Terrain round trip:** crop the existing `grid.bin` in UTM 50N, localize to metre coordinates, generate a Blender mesh, and export GLB. Check elevations, axis orientation, scale and footprint placement on import. Use only the elevation plane for relief; a dated water mask is a separate lead-level overlay, not a way to turn a modern surface model into historical terrain. The 100 m grid is suitable for broad relief, not lanes or building foundations on a reconstructed walk.
2. **Compare one building, not a city:** model the same small prototype form both as procedural browser geometry and as a Blender kit. Compare hands-on time, file/draw cost and how well a storey addition preserves its ground floor. Use geometry that can be shaded with the existing lab styles. Keep Blender where it saves recurring authoring time.
3. **Separate historical and performance checks:** choose one Yumin stretch (渔民村) with a source-backed early view and a later view, and record what is observed versus inferred. Use OSM2World on a separate modern crop if useful; use the municipality-wide massing fixture for the actual scale check. Record authoring hours, readability, frame-time spikes, memory, worker transfer and save size per [PLAN §10](../../PLAN.md). If a source or tool fails its narrow test, drop it rather than build infrastructure around it.

### Terrain round trip: passed

Blender 4.5.0 read the elevation plane of the existing [Spike A grid](../spikes/spike-a-map.md). The Luohu/Yumin test crop spans **11.1 × 6.5 km between sample centres**, with elevations of **1–681 m** in the input. The resulting 14,430-triangle terrain and three placeholder houses share a **301,140-byte GLB**. No add-ons or external art were necessary. The houses have one, two and three storeys, all built from one shared storey mesh and one shared roof mesh.

Three.js r174, the same revision as `render-lab`, loaded the GLB in a headless check. It preserved the projected origin, metre scale and orientation. Downward ray checks matched five raw grid elevations and all three building anchors within 1 mm of the tested values; that is **round-trip agreement**, not DEM accuracy. The exported nodes share mesh geometry, but this does not establish GPU instancing or citywide performance.

The overhead preview makes the broad relief useful; the close-up is too smooth for lane-scale terrain. The model uses the modern Copernicus surface grid, not 1979 terrain. The crop has no water in the DEM threshold layer and 312 flagged cells in `water1979.bin`; the latter was inspected but **not** rendered as water or used to lower the terrain. The house geometry and placement are technical placeholders, not reconstructions. No comparison against the lab's materials or against hand-modelling time was made.

Local artifacts and disposable scripts are in the Git-ignored `build/terrain-test/`: `luohu-dem-overview.png`, `luohu-kit-detail.png`, `luohu-dem-kit.blend`, `luohu-dem-kit.glb`, and `report.json`.

### One building both ways: matched

A fictional rental block with a shopfront, repeatable balcony floor, and parapet was authored independently in Blender 4.5.0 (via Python) and in Three.js r174. A side-by-side browser fixture used `render-lab`'s actual Hybrid materials and lighting values, with the same camera, planar UV mapping and batching for both. All 19 corresponding parts matched in size and placement. The imported meshes fit the style when material roles were reassigned at load rather than taking Blender's materials as final.

| State | Native Three.js | Blender kit in Three.js |
|---|---:|---:|
| Shop + two rental storeys | 17 draw calls, 326 triangles | 17 draw calls, 326 triangles |
| Shop + four rental storeys | 25 draw calls, 518 triangles | 25 draw calls, 518 triangles |
| Geometry input | 1.2 KB fixture module; no model download | 30.8 KB uncompressed GLB, loaded once |

Counts include the test pad and outline draw calls, but no shadow pass. Both versions added floors and lifted the roof without relocating or replacing the shopfront or the lower floors. The modular GLB needed no re-export or fetch for this change; a change to the authored Blender geometry would need an export. This does not measure citywide performance or hands-on authoring time: both models were scripted, and no artist performed a timed modelling/edit pass.

For boxy ordinary buildings, start with native geometry: it matches visually with fewer pipeline steps and no model payload. Keep Blender for distinctive components that are costly to express in code, while letting Three.js assemble and update them. At Spike B, time an actual authoring and revision pass on one non-boxy detail before making Blender an expected part of the workflow. Local artifacts in `build/building-test/`: `side-by-side-two.png`, `side-by-side-four.png`, `rental-kit.blend`, and `rental-kit.glb`.

### Phase B asset kit: first four models

Blender 4.5.0 produced four editable `.blend` files and independent GLBs. Three.js r174 loaded all four in a standalone gallery using Hybrid lighting, verified their mesh counts and bounds, and tested the lab's concrete, crane and net materials on the hero. These are stylized design prototypes; no historical geometry claims or project runtime data changed.

| Asset | Reuse | Triangles | GLB |
|---|---|---:|---:|
| Guomao slipform construction / 国贸大厦滑模施工 | Hero vignette; tagged foundation, tower, slipform and crane components | 8,364 | 432 KiB |
| Lingnan-inspired tile roof / 岭南风格瓦屋顶 | Wall-plate snap origin; reusable roof, trim and eaves | 6,420 | 325 KiB |
| Two-bay scaffold / 双跨脚手架 | Modular frame, deck and ladder; repeat at 3.2 m nominal pitch | 1,308 | 68 KiB |
| Upright roadster bicycle / 直把通勤自行车 | Ground-origin close-up prop; not rigged | 3,196 | 174 KiB |

The Guomao concept refers to `phase1.guomao.slipform_trials` and `phase1.guomao.construction_visible_january_visit`. The dimensions, floor count, crane placement and visible details are artistic, not sourced geometry. Test artifacts and authoring script are in Git-ignored `build/phase-b-assets/`. The roof's individual tile runs and the bicycle's spokes are close-up detail, not citywide defaults: use simplified variants before widespread placement. This pass did not integrate the models into `render-lab` or test the assembled route.

### OSM2World scale benchmark

The [modern OpenStreetMap extract](https://www.openstreetmap.org/#map=16/22.544/114.1115) was **1.776 km²** (west, south, east, north: `114.105,22.538,114.118,22.550`, map API 0.6, retrieved 2026-11-23). Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. OSM2World 0.4.0 exported LoD 1 with its default style. The raw export's bounds stretched to 22 km because the API returns ways that extend beyond the request box. Re-export with `clipToBounds = true` yielded a **37.48 MB GLB** with a **1,337 × 1,336 m** horizontal extent. Three.js loaded and framed that cropped model without clipping; it drew 2,027 calls and 43,314 triangles in the overview. Conversion took about 16 seconds including Java startup and logged geometry errors without stopping, so import success does not establish feature completeness. Treat the converter as an offline reference tool, not a way to stream production city geometry.

For the scale test, 296 closed building ways from the same extract became axis-aligned boxes, independent of the detailed GLB. Only 24 ways had usable height or storey tags; the rest used a uniform 12 m test height. Building parts and multipolygons were omitted. Repeating the patch 34 × 34 times created **342,176 boxes over 2,053 km²**. This is a deliberately dense synthetic load, not historical terrain, actual municipal coverage, or an estimate of Shenzhen's building counts. The test compared one uncullable instanced draw with 1,156 frustum-culled instanced chunks under identical cameras and materials.

| View | Batching | Median draw calls | Median boxes submitted | GPU ms median / p95 | Main-thread render submission ms median / p95 |
|---|---|---:|---:|---:|---:|
| Neighborhood pan | Single batch | 1 | 342,176 | 6.07 / 10.04 | 0.10 / 0.30 |
| Neighborhood pan | Chunks | 11 | 3,256 | 0.14 / 0.86 | 0.80 / 1.60 |
| Whole-city orbit | Single batch | 1 | 342,176 | 5.42 / 5.86 | <0.10 / 0.10 |
| Whole-city orbit | Chunks | 1,156 | 342,176 | 5.47 / 6.09 | 4.60 / 7.80 |

Three.js r174, WebGL2 at 1280 × 720, AMD Radeon integrated graphics on Windows via ANGLE/D3D11. One short pass, 18 timed frames per condition after 8 warm-up frames; GPU elapsed queries, not displayed-frame latency. The embedded browser paced `requestAnimationFrame` at about 1 Hz in every mode, so its intervals were excluded. No terrain, labels, shadows, streaming, or game sim were enabled. The orthographic city camera fit the synthetic extent; chunk culling removed 99% of box submissions at neighborhood zoom but nothing at full extent. Try spatial chunks at neighborhood zoom and coarser massing with fewer batches at city zoom. Repeat on a normal foreground browser with real Shenzhen data before setting a frame-rate target. The temporary GLBs, source extract, and derived box fixture were discarded after measurement.

### Whole-municipality real-DEM, two-tier LOD & data budget test: passed

To close the gaps left by the flat-box OSM2World test, a full-municipality test (`build/municipality-scale-test/`) combined the **real 931 × 686 Copernicus DEM** (`grid.bin`, 93.0 × 68.5 km, 1–942 m), the `water1979.bin` coastline overlay (visual lowland layer only), **99,995 synthetic building masses** placed on real buildable Shenzhen land cells (`elev ≤ 80 m`, with 3 m foundation skirts), `render-lab`'s Hybrid lighting/materials, 2048² directional soft shadows, and all four Phase B Blender GLB kits seated on real Luohu elevation (`cell [387, 381]`, `7 m`).

**1. WebGL2 two-tier LOD & Hybrid shadows (1280 × 720, AMD Radeon integrated via ANGLE/D3D11, 18 timed frames after 6 warm-up):**

| Scale | Setup | Median draw calls | Median triangles | GPU ms median / p95 | CPU submit ms median / p95 |
|---|---|---:|---:|---:|---:|
| **Citywide (LOD0)** | 1 coarse terrain mesh + 4 global archetype batches, shadows off | **5** | 1,279,284 | **2.93 / 3.27** | **1.10 / 1.60** |
| **Neighborhood (LOD1)** | 3.2 km frustum-culled terrain & building chunks + 6-tri instanced village roofs + hero, shadows on | **186** | 173,924 | **2.43 / 4.56** | **3.80 / 5.80** |
| **Close-up (LOD2)** | Perspective view: Guomao hero + detailed Lingnan roofs + scaffolds + bicycles + procedural neighbors, shadows on | **371** | 388,994 | **2.63 / 5.58** | **4.30 / 5.80** |

**2. Whole-municipality Struct-of-Arrays (SoA) memory, save & Worker delta check (`budget_check.mjs`, Node):**
- **Fixture:** 100,000 `BlockStock` records + 10,000 tracked `Building` records + 10,000 road edges on Shenzhen's 157,161 buildable land cells (`buildings-and-construction.md` §10 ceiling).
- **SoA RAM:** **3.97 MiB** (blocks 3.60 MB, tracked 0.44 MB, roads 0.12 MB).
- **Gzip save size:** **1.36 MiB** (level 6, 123.1 ms).
- **Busy-month Worker → UI delta** (2,500 dirty blocks + 500 dirty tracked): **73.2 KiB** (target `< 1 MiB`), `structuredClone` **0.14 ms**.
- **Monthly dirty-block & cell-summary update:** **0.83 ms** (target `< 50 ms`).

**Findings folded into the revised 3D design plan ([3d-modelling-protocol.md](3d-modelling-protocol.md)):**
- Switching to a coarse LOD0 super-batch at citywide zoom cuts city orbit from 1,156 draw calls (OSM2World test) to **5 draw calls** and **2.93 ms GPU** across the real 93 × 68.5 km terrain.
- In close-up perspective view, cloning un-instanced GLB trees/roofs/bikes and rendering distant 20 km horizon chunks inflated draw calls to 371. Production `packages/render` must **instance repeated GLB kit meshes per chunk**, cap LOD1 kits to low-poly silhouettes, and swap horizon chunks > 4 km to LOD0 + fog.
- Scaling unit boxes with fixed texture repeats stretches/crams window rows across different building heights; production procedural shells must use **world-metre UV normalization** (or per-instance UV scaling).
- **One remaining human gate:** all technical Spike B checks (terrain round trip, modular alteration invariance, Hybrid kit shading, whole-municipality GPU/LOD scaling, and SoA memory/worker/save budgets) are now verified. Only the **human-timed Yumin Village street authoring pass** against dated photographs remains before fixing the final number of walkable routes.
- Local artifacts in Git-ignored `build/municipality-scale-test/`: `city-lod0.png`, `hood-lod1.png`, `close-lod2.png`, `budget-report.json`, and disposable test scripts.

## Intake and rights

Before copying a component, record its upstream URL, pinned revision or asset version, exact files, license, modifications, attribution, and intended use. Preserve required notices for copied code; an upstream code license does not automatically cover artwork, data or trademarks. GPL/AGPL code stays reference-only by default unless we explicitly choose to meet its terms. A standalone authoring tool is a different case from bundled code; assess the output and its inputs separately.

Keep modern ODbL data and derivatives distinguishable from dated observations, and assess attribution and database share-alike before distribution. Record historical geometry against claims and source locators under the [evidence protocol](../research/evidence-protocol.md); keep uncertain positions and heights marked as proxies or inferences. Don't ship archival imagery or derive game textures from it without checking the specific reuse terms. Use paired English and Simplified Chinese for player-facing labels.
