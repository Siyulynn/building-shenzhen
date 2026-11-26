# 3D Modelling & Municipality Rendering Protocol

**Status:** active technical protocol (v0.1, 2026-11-23).
**Covers:** [PLAN §6.5 & Spike B](../../PLAN.md), [buildings-and-construction §9–10](systems/buildings-and-construction.md), and [external-resources-plan.md](external-resources-plan.md).
**Phase boundary:** Phase 1 on `main` remains 2D-only (`AGENTS.md`). This protocol governs the Spike B / `3d-track` work and production `packages/render` once Phase 1 exits.

---

## 1. Core Architectural Decisions (Revised from Benchmarks)

Five disposable technical experiments established the baseline for building the whole ~2,000 km² Shenzhen municipality in 3D:

1. **Procedural 3D + modular Blender kits over 2D isometric sprites.** Real Shenzhen relief (1–942 m, Wutong Mountain, coastal hills, dated reclamation) plus multi-decade vertical growth is far cheaper to maintain in 3D than redrawing elevation-aware sprites.
2. **Two-tier split between Three.js and Blender 4.5+:**
   - **Native Three.js (~95% of built volume):** boxy/rectilinear building shells, standard factories, dormitories, walk-ups, towers, handshake rental blocks, floor additions, stalled/active frames, and procedural canvas facade textures. Avoids export cycles and GLB payloads for ordinary structures.
   - **Blender 4.5+ → GLB (~5% of built volume, high silhouette impact):** hero landmarks (Guomao, Luohu Station/Bridge, Bamboo Garden Hotel, Electronics Building, later towers) and non-boxy repeatable kit pieces (Lingnan pitched clay-tile roofs, bamboo/steel scaffolds, tower cranes, balconies/AC cages, era vehicles/bicycles, subtropical trees).
3. **Strict three-scale LOD hierarchy (proven by GPU benchmarks):**
   - Naive whole-city chunking (1,156 draw calls at city orbit) hurts main-thread submission with zero culling benefit.
   - Conversely, a single unculled batch hurts close-up GPU time (6.07 ms vs 0.14 ms chunked).
   - **Rule:** Citywide view uses coarse super-batches (**≤ 16 draw calls** across 93 × 68.5 km); Neighborhood view uses frustum-culled **3.2 × 3.2 km spatial chunks**; Close-up / walkable view streams nearby tracked blocks + instanced LOD2 kit pieces and culls/fogs distant horizon chunks.
4. **Hybrid “Illustrated Maquette” is the default visual target.** Imported Blender GLBs never ship final look-dev shaders; `packages/render` binds every mesh’s semantic `role` to the active `StyleKit` (`hybrid` default, `maquette` / `realism` supported) so procedural buildings and Blender kits share palette, lighting, and edge treatment.
5. **The renderer never owns or mutates simulation state.** All geometry derives deterministically from `PhysicalState` (`BlockStock` cohorts/events, tracked `Building` records, `RoadNetwork`) stored as Struct-of-Arrays (SoA) TypedArrays (~4 MiB RAM, ~1.4 MiB gzipped save, < 100 KiB/turn worker delta at 100k blocks + 10k tracked buildings).

---

## 2. Coordinate System, Units & Grounding Contract

| Rule | Standard | Notes |
|---|---|---|
| **Map projection** | UTM Zone 50N (`EPSG:32650`), **1 unit = 1 metre** | Matches `apps/map-spike/public/grid/meta.json` (`931 × 686` cells, `cell_m = 100`). |
| **World axes (Three.js / glTF)** | `+X` = East, `+Y` = Elevation Up, `+Z` = South | Cell `(col, row)` centre maps to `(col * 100, elev_m, row * 100)`. |
| **Authoring axes (Blender)** | `+X` = East, `+Y` = North, `+Z` = Up | Blender glTF exporter maps `(X, Y, Z)` → `(X, Z, -Y)`. Verified to `< 1 mm` round-trip. |
| **Asset local origin** | Ground contact at local `Y = 0` (Blender `Z = 0`), centred in X/Z | Exception: snap-on roof caps (`lingnan-roof`) place origin at **wall-plate height** (`Y = 0`). |
| **Asset local front** | Blender `-Y` → glTF / Three.js `+Z` | Apply all scale transforms (`1, 1, 1`) before export. |
| **Slope grounding** | Every ground-contact building includes a **downward foundation skirt** (`1.5–4.0 m` below `Y = 0`) | Prevents floating corners on sloped 100 m DEM cells without sculpting every parcel. |
| **Micro-terrain on routes** | 100 m DEM is for broad municipality/neighborhood relief only | Walkable routes (`data/routes/<route>/`) carry local street-grade height overrides; never derive lane curbs or doorways from 100 m vertices. |

### Dated Coastlines & Terrain Integrity
- The base elevation mesh comes from Copernicus DEM GLO-30 (`grid.bin`, 2011–2015 surface).
- Historical water/reclamation layers (`water1979.bin`, later reclamation epochs) are rendered as **separate visual/water-plane overlays** (filtered to lowland `≤ 20 m` where optical hill-shadow noise exists). Never destructively carve modern DEM elevation to fake historical bathymetry without verified bathymetric claims.

---

## 3. Whole-Municipality Three-Scale LOD Specification

| Scale & Camera | Terrain | Untracked Buildings (`BlockStock`) | Tracked Buildings & Kits | Shadows & Target Budget |
|---|---|---|---|---|
| **LOD0 — Citywide** (ortho / high aerial, > 2.5 km) | 1 coarse mesh (400 m step, vertex-coloured Hybrid relief + dated coastline mask) | 4–8 global `InstancedMesh` batches grouped by era/use archetype; no roofs/props | Hero landmarks as simple silhouettes only | Shadows **OFF**; **≤ 16 draw calls**, **< 4 ms GPU** |
| **LOD1 — Neighborhood** (ortho / tilted City view, 150 m – 2.5 km) | Frustum-culled **3.2 × 3.2 km** (32×32 cell) 100 m DEM chunks | Frustum-culled **3.2 × 3.2 km** chunked `InstancedMesh` per archetype; **simplified pitched roof caps** (≤ 30 tris) on village stock; world-metre UVs | Hero landmarks + **instanced** LOD1 kit parts (no un-instanced scene clones) | Shadows **ON** (2048² around camera target); **≤ 120 draw calls**, **< 5 ms GPU** |
| **LOD2 — Postcard & Walkable Route** (perspective, < 150 m) | Local chunks within 4 km + route micro-terrain patch; distant horizon switched to LOD0 + atmospheric fog | Tracked parcels + nearby procedural facades with `add_floors` alteration seams | Detailed Blender GLB kit modules (**instanced per mesh**): tiled roofs, scaffolds, shopfronts, cranes, bicycles, vehicles, trees | Shadows **ON** (tight frustum); **≤ 150 draw calls**, **< 6 ms GPU** |

### UV & Facade Rules (Learned from Scale Test)
- **Never apply fixed texture repeats to non-uniformly scaled `BoxGeometry` instances.** Scaling a unit cube to both 2-storey and 20-storey heights stretches or crams window rows.
- **Required pattern:** either (a) generate procedural building shells per-storey / quantized height bands with **world-metre planar UVs** (e.g., 1 V-repeat = 1 storey = `2.8–3.2 m`, 1 U-repeat = 1 bay = `4.0 m`), or (b) use a lightweight shader / vertex-attribute UV scale on `InstancedMesh` so window proportions stay constant across every building height.
- **Alteration invariance:** modular buildings (`shop` + repeatable `floor` + `cap`) must assemble by storey index at runtime so an `add_floors` event leaves the ground-floor mesh and lower-storey seed untouched and requires **zero GLB re-export**.

---

## 4. Blender Authoring & GLB Export Standard

All hand-authored or Geometry-Nodes assets live as editable `.blend` sources alongside deterministic export scripts (or clean `.blend` files) and export to **glTF 2.0 binary (`.glb`)** with `export_extras=True`.

### 4.1 Required Custom Properties (`userData` in Three.js)
Every exported GLB root node must carry:
- `name_en` (string) & `name_zh` (string) — paired English and Simplified Chinese labels.
- `status` — one of `stylized_prototype` | `inferred` | `observed`.
- `origin` — `ground_contact` | `wall_plate` | `socket`.
- `claim_ids` — semicolon-separated claim IDs from `data/evidence/claims/` whenever the asset represents a historical landmark or observed route structure.

Every child mesh must carry:
- `group` — logical part for runtime toggles/animation (e.g., `foundation`, `tower`, `slipform`, `crane_mast`, `crane_jib`, `shop`, `floor`, `cap`).
- `role` — semantic material slot mapped by `StyleKit` at load time.

### 4.2 Canonical Semantic Material Roles
Blender materials are preview-only; `packages/render` maps `mesh.userData.role` to the active `StyleKit`:

| Role | Meaning / Use |
|---|---|
| `ground`, `redEarth`, `road`, `water` | Terrain & civil works surfaces |
| `villageWall`, `villageRental`, `villageRoof`, `tile`, `tileLight`, `ridge` | Urban village & Lingnan residential kits |
| `factory`, `shedWall`, `shedRoof`, `danwei` | 1980s industrial sheds, standard factories & work-unit housing |
| `beigeTower`, `beigePodium`, `guomaoCore`, `guomaoSlab`, `parapet` | 1980s–1990s high-rises, podiums, raw concrete slabs |
| `glassTower`, `whiteTile` | 1990s–2000s expansion era facades (Phase 5–6) |
| `craneSteel`, `ochre`, `safetyNet`, `bamboo`, `timber`, `steel`, `darkMetal`, `rust` | Construction rigs, scaffolding, balconies, frames |
| `redBanner`, `signage` | Period banners & street signboards |
| `foliage`, `vehicleWhite`, `vehicleAccent`, `tyre`, `rubber`, `silver` | Trees, vehicles, bicycles, street props |

### 4.3 Geometry & Payload Budgets (Mandatory per LOD Tier)

| Asset Class | LOD1 (Neighborhood / Instanced) | LOD2 (Close-Up / Route) | Max Uncompressed GLB |
|---|---|---|---|
| **Ordinary building shell** | Native Three.js procedural (12–48 tris/storey) | Native procedural + modular facade trim (≤ 400 tris/building) | 0 KB (code) |
| **Repeatable roof / balcony / scaffold kit** | **≤ 120 tris** (clean silhouette, no individual tile rods) | **≤ 2,500 tris** (detailed tiles, rails, lashings) | ≤ 150 KiB |
| **Street prop / vehicle / bicycle / tree** | **≤ 150 tris** (billboard or low-poly silhouette) | **≤ 1,800 tris** (spokes/fenders only at route range) | ≤ 120 KiB |
| **Hero landmark** (Guomao, Luohu Station, etc.) | **≤ 2,000 tris** | **≤ 12,000 tris** (tagged stage groups for construction progress) | ≤ 500 KiB |

*(Note: our Phase B prototype `lingnan-roof.glb` at 6,420 tris and `upright-bicycle.glb` at 3,196 tris must be paired with simplified LOD1 variants and trimmed before widespread placement; `scaffold-bay.glb` at 1,308 tris and `guomao-slipform.glb` at 8,364 tris fit close-up/hero budgets.)*

### 4.4 Instancing Rule for Imported GLBs
- **Never call `gltf.scene.clone(true)` N times** for repeated roofs, scaffolds, bicycles, trees, or vehicles in a chunk.
- On load, extract each unique `(group, role)` `BufferGeometry` from the GLB once, rebind its `StyleKit` material, and populate a chunk-scoped `THREE.InstancedMesh` (or `BatchedMesh`). Every repeated prop type across a 3.2 km chunk should cost **1 draw call per material role**, not 1 per instance.

---

## 5. Era Kit Progression (Mapped to `buildings-and-construction.md`)

All 3D archetypes key off `(archetype, era, stage, legality)` from `sim-core`—**never branch on calendar year in renderer code**:

1. **Era 0 — County & Early SEZ (archetypes active in Phase 1):** `village_house` (clay-tile pitched roof), `village_rental` (2–5 storey concrete walk-up + shopfront), `standard_factory` (3–5 storey concrete frame), `dormitory`, `danwei_flats`, `shop_market`, plus active construction states (`under_construction` bamboo/steel scaffold + net; `stalled` / 烂尾 bare concrete frame, idle crane, no red banner).
2. **Era 1 — Boom & High-Rise (1985–1992):** beige-tile towers, podium commercial blocks, wider arterial corridors, reclamation strips.
3. **Era 2 — White Tile & Handshake Villages (1993–2000):** white-ceramic-tile towers with blue tinted glass; dense 6–9 storey urban-village handshake blocks (`add_floors` visible as upper-storey material shift).
4. **Era 3 — Metropolis (2001–2009):** curtain-wall glass office towers, gated residential estates, metro stations/viaducts.

---

## 6. Historical Evidence, GIS & Licensing Discipline

1. **Evidence protocol applies to 3D.** Every observed landmark or walkable-route building links to `data/evidence/observations/` and claim IDs under [evidence-protocol.md](../research/evidence-protocol.md). Unverified geometry is explicitly flagged `stylized_prototype` or `inferred`—never presented as archival fact.
2. **Modern OSM & OSM2World boundary:** OSM2World is an **offline spatial/scale reference tool only**. Never stream raw OSM2World GLBs (a 1.78 km² cropped patch produced 37.48 MB and 2,027 draw calls) and never treat modern OSM footprints as 1979–1990s geometry. Any OSM-derived dataset keeps ODbL attribution and stays separate from dated historical observations.
3. **Historical footprint workflow (modernized `histo3d` pattern):** georeference period maps/imagery in `pipeline/` → vectorize legible footprints & streets in QGIS → attach provenance & claim IDs in GeoJSON → extrude/assemble via Blender 4.x Geometry Nodes or Three.js.
4. **Archival photographs:** private modelling reference only. Do not bundle unlicensed photos or crop photo pixels into game textures.
5. **External asset & code allowlist:** only MIT, Apache-2.0, BSD-3-Clause, and CC0 assets/code may be imported (recorded in `THIRD-PARTY-NOTICES.md`). GPL/AGPL projects remain study-only.

---

## 7. Automated Asset & Scene Validation Checklist

Every new `.glb` kit or procedural generator entering `packages/render` must pass an automated check before merge:

1. **Geometry sanity:** zero `NaN`/infinite vertices, non-empty positive bounds, valid mesh winding/normals, scale applied `(1, 1, 1)`.
2. **Origin & facing:** `min.y` within `±0.15 m` of `0` (for ground-contact or wall-plate snap assets); front aligned to `+Z` in glTF.
3. **Metadata completeness:** root `userData` has `name_en`, `name_zh`, `status`, `origin` (plus `claim_ids` if historical); every mesh has valid `group` and canonical `role`.
4. **Budget gate:** triangle count and GLB byte size within §4.3 limits for its LOD tier.
5. **StyleKit binding check:** renders cleanly under `hybrid` materials with zero unbound/missing role errors.
6. **Alteration test (modular buildings):** adding storeys preserves ground-floor transform, mesh identity, and requires zero re-export.

---

## 8. Whole-Municipality Build Order (Post–Phase 1)

Proceed strictly in this sequence once Phase 1 (M5–M6 playable 2D slice) exits on `main`:

1. **Remaining Human Gate (Spike B closeout):** One timed artist/human pass on a short **Yumin Village (渔民村)** stretch against dated photographs (early vs. dense snapshot) to measure real authoring hours per finished street and set the final route count (`PLAN.md` §10).
2. **Stage 1 — Terrain & Coastline Engine (`packages/render/terrain`):** Load full 931 × 686 `grid.bin` into LOD0 coarse mesh + LOD1 3.2 km chunks + dated coastline/reclamation overlay layer.
3. **Stage 2 — LOD0 Citywide Massing:** Connect SoA `BlockStock` TypedArrays from `sim-core` Worker deltas to 4–8 global `InstancedMesh` era batches (≤ 16 draw calls across the whole municipality).
4. **Stage 3 — LOD1 Chunked Neighborhoods & Era Kits:** Stream 3.2 km spatial chunks around camera; add world-metre procedural facades, foundation skirts, simplified instanced Blender roof/scaffold/tree kits, and road ribbons (adapting A/B Street’s junction polygonization).
5. **Stage 4 — Heroes, Postcards & Walkable Routes:** Integrate tracked `Building` records, alteration seams (`add_floors`), Guomao/Luohu/Shekou landmarks, and the photo-checked Yumin Village route with instanced LOD2 kits.
