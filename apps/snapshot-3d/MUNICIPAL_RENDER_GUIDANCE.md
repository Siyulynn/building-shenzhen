# Guidance for Steps 3 and 4: LOD0 Municipal View & LOD1 Chunked Streaming / 第三、四步实施指南：市域远景与街区分块流式加载

**Applies to:** [Municipal 3D Plan](MUNICIPAL_3D_PLAN.md) Steps 3–4, building on the [Step 1–2 handoff](basemap/MUNICIPAL_GIS.md) and the [3D Modelling Protocol](../../../../../docs/design/3d-modelling-protocol.md).
**Scope:** isolated `apps/snapshot-3d` viewer only. Do not touch Phase 1 `sim-core` or `slice-ui`.

---

## 0. Pre-flight fixes from the Step 1–2 review / 前置收尾项

Close these small defects before wiring municipal meshes so they do not multiply across 600+ chunks:

1. **Weld adjoining river-reach normals (`src/procgen/mesh.ts`):** `river-main-west` and `river-main-east` share width and level at their join (`[203460, 2494894]`), but independent end normals leave a small triangular notch on the outer bend. Average the tangent across matching corridor endpoints (or join same-corridor reaches before ribbon generation).
2. **Package inputs reproducibly:**
   - Add a `prepare-municipal-data.mjs` step (mirroring `prepare-basin.mjs`) that copies/hashes `georef/municipal-gis.json` into `apps/snapshot-3d/municipal-gis.json` and packs `georef/municipal-water-context-oct1979.tif` into a compact 1 byte/cell `public/grid/municipal-water.bin` (embedded by `portable.mjs`).
   - Wire `prepare-relief.py` into the documented prep flow so a fresh checkout doesn't silently fall back to 100 m relief.
3. **Update fog dynamically (`src/main.ts`):** Recompute `scene.fog.near` / `far` on `controls` zoom/pan changes (not only inside `frame()`), and turn fog off cleanly at citywide orbit.
4. **Settle two municipal GIS inputs before Step 3 renders them:**
   - **Eastern MSS no-data (`255`, east of Mirs Bay):** In `municipal-water.bin`, keep `255` explicit in the evidence/comparator layer, but define a clear **3D render fallback** using `modernWater` from `grid.bin` wherever `water === 255` so Mirs Bay and Daya Bay render as sea instead of khaki land (disclose this fallback in the evidence drawer).
   - **`review_required` rail legs (`kcr-buji-pinghu`, `kcr-north-continuation`):** Either refine them against the native 30 m Copernicus DSM (the 100 m DSM blurs narrow rail cuttings into adjoining hills) OR explicitly render `review_required` legs as subdued dashed corridor bands at LOD0 rather than solid ballast/track.
   - **Optional quick enrichment (high visual value for LOD0):** Extract the other major 1979 reservoirs already clearly visible in `water1979.bin` / KH‑9 (e.g. Tiegang, Xili, Shiyan) and add broad envelopes for Chiwan and Shatoujiao so the coastal horizon reads naturally.

---

## 1. Step 3 — LOD0 Municipal View (`focus === 'city'` or `span > 4000 m`)

### Goal
Make the whole **93.1 × 68.6 km** window readable as one continuous September 1980 landscape from citywide orbit, with the core basin visibly anchored inside it instead of disappearing when switching to `Municipality · 全市`.

### Architecture & Budgets
- **Target budget:** **≤ 20 draw calls**, shadows **OFF**, zero individual trees/bunds/bridge piers.
- **New module:** `src/procgen/municipal-lod0.ts` (pure plan + mesh builder, reusing `toWorld` and `relief` colour ramp).

### What LOD0 builds
1. **Coarse terrain (`terrain.ts`):**
   - Keep the existing `step = 4` (400 m) municipal mesh.
   - Generate a **September 1980 baseline texture** using `LinearFilter`:
     - Relief ramp (`#dcd4ae` → `#92a889` → `#647f71`) with subtle slope/hillshade;
     - **Sea & reservoirs** from `municipal-water.bin` (`1 = sea`, `3 = reservoir`, plus `modernWater` fallback where `255` — **never** paint class `4` hill-shadow noise above 20 m);
     - Soft tint for `2 = possible intertidal / nearshore change` (muted silt-teal `#88a39e`);
     - Subtle cover tints inside `core-basin-gis.json` + `municipal-gis.json` settlement/field envelopes so the 6.8 km core blends seamlessly into its collar instead of reading as a pasted rectangle.
2. **Global water sheet (1 merged mesh):**
   - Flat low-elevation water planes for extracted reservoirs (Shenzhen Reservoir + any newly added 1979 reservoirs) and wide estuary reaches (`river-main-west`, `river-main-east`, `shenzhen-river-estuary`) with `polygonOffset` to prevent Z-fighting at 85 km camera height.
3. **Global transport ribbons (1–2 merged meshes, vertex-coloured):**
   - Render the union of core main alignments + `municipal-gis.json` lines at **LOD0 exaggerated readable widths** (e.g., rail 28–36 m, trunk road 22–28 m, works strip 40 m) lifted slightly (`+1.5–3 m` at 400 m DEM scale) so they stay crisp from 60 km altitude.
   - **Visual provenance split:**
     - `visible` / `interpreted` alignments: solid ribbons (`rail`, `road`, `works`);
     - `estimated` (`aerial_candidate`): distinct muted/dashed ribbon style (via simple vertex-alpha or repeating 1D dash texture);
     - `review_required`: thinner translucent search-corridor ribbon (or hidden unless the "Show estimated corridors" toggle is on).
4. **Macro settlement super-batches (2–3 global `InstancedMesh`es):**
   - Populate every traced/interpreted settlement envelope (core settlements + `nantou-town-envelope`, `shekou-frontage-envelope`, `south-sungang-envelope`, plus any added Tier B envelopes) with **coarse 40–60 m cluster blocks** (simple pitched or low boxy roof silhouettes, `height = 5–12 m`, grounded with 4 m skirts).
   - Do **not** instantiate the 11.9k individual core houses or 42k field boxes at LOD0.
   - Optionally add 1 coarse upland-canopy `InstancedMesh` (large 80–140 m low-poly clusters on steep slopes `> 15°` / `elev > 80 m`) if bare mountain ridges look too smooth; keep total LOD0 instances `< 15,000`.

### UI & Evidence Rules for Step 3
- Keep **Surface layer** (`oct79`, `nov84`, `mss79`, `mss84`, `kh9`) independent: when an imagery or diagnostic layer is selected, hide LOD0 baseline super-batches just like the core baseline hides under KH‑9.
- Add a checkbox in `focus === 'city'`: **`Show estimated municipal corridors / 显示估计市域交通线`** (on by default in Sep 1980 baseline; turning it off hides `basis === 'estimated'` lines so reviewers can immediately see what is observed vs. estimated).
- Evidence drawer in `focus === 'city'` lists each rendered municipal corridor with its `basis`, `render_status`, `searchHalfWidthM`, and cited `claims` (replacing the generic "unplotted" list for corridors that are now shown as estimates, while still listing truly unplaced items like `site.military_land` and `site.border_fence`).

### Step 3 Acceptance Gates
- `focus === 'city'` renders the whole municipality with continuous core-to-Nantou/Bao'an road, core-to-Buji/north rail, Shenzhen River estuary, and 1979 coastline in **≤ 20 draw calls** and **0 console errors**.
- Zooming from `city` into `core` transitions cleanly without the core disappearing or jumping in colour.
- Unit tests verify: no feature overlaps the core box; every estimated line cites at least one claim and has `basis === 'estimated'`; toggling estimates off removes every estimated draw segment; portable HTML builds without private scans.
- Record measured frame time and draw calls on fixed `city`, `core-to-nantou`, and `core-to-buji` cameras.

---

## 2. Step 4 — LOD1 Neighbourhood Chunks (`3.2 × 3.2 km` streaming, `span ≤ 4000 m`)

### Goal
Replace the single unculled core group with frustum-culled, on-demand **3.2 × 3.2 km chunks** so the camera can pan smoothly across the core basin and out along the pilot corridors (**Core → Futian → Nantou → Shekou** and **Core → Sungang → Buji**) without exceeding memory or GPU budgets.

### Chunk Grid & Coordinate Contract
- **Chunk size:** `32 × 32` atlas cells = **3,200 × 3,200 m** (`chunkId = "${cx},${cz}"`, where `cx = Math.floor(x / 3200)`, `cz = Math.floor(z / 3200)`).
- **Exact alignment with `terrain.ts`:** `buildTerrain` already uses `tile = 32` cells (`3200 m`). Use the **exact same chunk boundaries** so terrain tiles and procedural chunks share edge vertices and culling math.
- **Terrain heights per chunk (do NOT allocate a 20 m lattice citywide):**
  - Chunks overlapping the core window (`[344, 365, 412, 398]`) sample the existing **20 m smoothed 30 m-DSM lattice** inside the core window, and the **100 m DEM** outside it (exact boundary match already proven in `ground.ts`).
  - Outer chunks sample the **100 m DEM** directly (with a lightweight local carve/flatten only under traced/estimated rivers and ponds inside that chunk). Reserve future 30 m DSM patches for specific hero zones (e.g., Shekou, Nantou) using the same hole-stitching pattern.

### Global-First Planning, Chunk-Scoped Meshing (Mandatory Invariant)
Never run hydrology or road-profile smoothing independently per chunk—that creates vertical steps at chunk borders. Split planning into two stages:

1. **Stage A — Global Lightweight Network Plan (run once at startup, `< 150 ms`):**
   - Combine `core-basin-gis.json` + `municipal-gis.json` alignments (respecting `render_status` policy) into **one `GlobalNetwork`**:
     - Monotone downstream river profiles across the entire river chain (`river-main-east` → `river-main-west` → `shenzhen-river-estuary`, plus `buji-lower`);
     - Continuous road/rail long profiles, bridge deck overrides, and `Corridors` spatial index across chunk seams;
     - Global `Mask[]` array (Shenzhenxu, Luohu, Yumin, Caiwuwei, plus future Shekou/Nantou masks).
   - Clip ribbons (`roads`, `rail`, `tracks`, `rivers`, `dykes`, `banks`) into chunk slices **after** computing world-space `ys` and `chainage` (`s`), inserting exact interpolated seam vertices at `x = cx * 3200` and `z = cz * 3200` so track sleeper UVs and embankment heights match to `< 1 mm` across adjacent chunks.

2. **Stage B — On-Demand Per-Chunk Fabric Plan (`planChunk(cx, cz, globalNet, cfg)`):**
   - Query only the cover polygons (`core` + `municipal`) whose bounding box intersects `[cx * 3200, cz * 3200, (cx + 1) * 3200, (cz + 1) * 3200]`.
   - **Single-owner rule (zero duplicates, zero missing structures):**
     - Every generated building, tree, land piece, or bridge box belongs to **one chunk** based strictly on its centre: `Math.floor(item.x / 3200) === cx && Math.floor(item.z / 3200) === cz`.
     - For polygons spanning multiple chunks, run `fabric.ts` parcel loops over the **world parcel indices** `(i, j)` whose parcel box intersects the chunk, then keep only items owned by `(cx, cz)`. Because `rng(seed, parentFeatureId, i, j)` depends only on world parcel indices—never on chunk coordinates—seam neighbours agree bit-for-bit and moving a chunk boundary never reshuffles buildings.
   - **Outer-chunk density control (avoid box explosion outside the core):**
     - Inside `core-basin-gis.json` envelopes: keep full `fabric.ts` detail.
     - Inside `municipal-gis.json` settlement envelopes (`nantou-town-envelope`, `shekou-frontage-envelope`, `south-sungang-envelope`): run `settlement()` with slightly coarser parcel sizing (`parcel_m = 72–80`) so towns read convincingly from aerial height with fewer instances.
     - Inside `municipal-gis.json` field envelopes (`futian-lowland-fabric`, `xixiang-foreshore-grid`): render as textured/tinted ground polygons or low-count strip meshes rather than 4 bund boxes per plot.
     - On `unknown` / unclassified rural ground outside mapped envelopes: render smooth terrain tint + optional sparse noise-clustered upland groves on slopes `> 12°` only—never invent towns or dense paddy grids.

### Streaming Manager, Frustum Culling & Memory Hygiene
- **New module:** `src/procgen/streamer.ts`:
  - Maintains `Map<string, {group: T.Group; lastUsed: number; counts: ...}>` with an **LRU cap of 16 chunks** (`maxChunks = 16`, covering a ~12 × 12 km neighbourhood around the camera).
  - **Shared global resources:** Create `facadeTextures()`, `facadeMaterial` instances, `flatMat`, `waterMat`, `civilMat`, `unitBox()`, `gableRoof()`, `sphere`, and `cone` **once** in a shared `ChunkResources` object. On chunk eviction, dispose **only** the chunk's `InstancedMesh` matrices and per-chunk merged ribbon/water `BufferGeometry`—never dispose shared materials/textures or leak GPU buffers!
  - **LOD switch & hysteresis:**
    - `span > 4500 m` (or `focus === 'city'`): show **LOD0**, hide LOD1 chunk groups (keep LRU warm briefly to avoid thrashing on zoom bounce).
    - `span <= 4000 m`: show **LOD1** chunks whose AABB intersects the camera frustum + 1-chunk margin; hide LOD0 super-batches inside active LOD1 chunks (keep LOD0 visible for distant horizon chunks outside the LOD1 ring!).
  - **Frame-budget pacing:** Build at most **1–2 missing chunks per animation frame** (ordered closest-to-camera-target first) so panning never freezes the main thread; move `planChunk()` to a Web Worker only if profiling shows `planChunk` exceeds `25 ms` on desktop.
- **Shadow frustum:** Lock directional sun shadows to the active camera target (`±span`, capped at `±2500 m`) so shadow resolution stays sharp as you pan from Luohu to Nantou.

### Pilot Rollout & Step 4 Acceptance Gates
Roll out and profile on **two continuous test corridors first** before enabling all 29 × 22 chunks:
1. **Corridor 1 (West):** `Shenzhenxu → Shangbu → Futian lowland → Nantou → Shekou` (~22 km, ~8 chunks).
2. **Corridor 2 (North):** `Luohu → Shenzhenxu → Sungang → Buji` (~10 km, ~4 chunks).

**Automated tests (`test/municipal-stream.test.ts`):**
- **Seam height & UV continuity:** sample roads, rail, and rivers `±0.1 m` across every crossed `3200 m` chunk edge; assert vertical delta `< 1e-4 m` and continuous chainage.
- **Unique ownership:** sum of buildings/trees/pieces across all chunks covering the core equals the unchunked core count exactly (zero duplicates, zero dropped footprints at seams).
- **Determinism & mask invariance:** loading chunks in forward vs. reverse order yields identical building keys/transforms; enabling `&clear=1` clears only masked items inside chunks touching those masks.
- **Eviction & memory hygiene:** simulate panning 20 steps across Corridor 1 and back; assert active chunk count never exceeds `maxChunks` and `renderer.info.memory.geometries` returns to baseline after eviction (no leak).
- **Draw-call budget:** verify `≤ 20` draw calls at `city` (LOD0) and `≤ 120` draw calls at fixed cameras along Corridor 1 and Corridor 2 (including chunk-border cameras where 4 chunks meet).
- **Browser & portable verification:** pan across a chunk seam in headless Chromium with 0 console errors, capture matched before/after seam plates, and verify portable HTML offline load.
