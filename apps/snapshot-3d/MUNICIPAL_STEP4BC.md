# Step 4B–4C: streaming hardening and GIS review / 分块加载加固与底图复核

Review [the standalone atlas](../../../Shenzhen_Municipal_LOD1_Step4BC.html) and [the municipal GIS plate](../../../georef/municipal-step4c/municipal-review.png). The Step 3 and original Step 4 HTMLs, KH‑9 observation layer, and 1979/January 1984 kits remain unchanged. No Step 5 scenes are built here.

This page records the archived Step 4B–4C release. The current build filename and first Step 5 study are in the [Shenzhenxu handoff](SHENZHENXU_LOD2.md).

## 4B — Streaming / 分块加载

- The worker retains the deterministic world plan, compiles route/terrain surfaces, and builds one requested tile at a time. Transferable mesh/instance buffers and precomputed bounds keep polygon queries, clipping and instance assembly off the main thread. The main thread attaches the buffers to shared viewer materials. A browser that blocks workers can still build the same tiles synchronously. Switching out of the September surface releases the worker and tile cache.
- A visible pilot tile can load even when the camera target is outside the pilot. The original 3.2 km tiles, separate enter/exit spans, and 16-tile cap remain. Coarse and fine tiles use complementary dither over about 180 ms, in both directions; LOD0 remains underneath pending tiles. The focus-clear switch rebuilds core and nearby affected geometry without discarding remote cached tiles.
- The core collar blends toward the exterior mesh normals and leaves heights untouched. The estuary proxy never rises downstream from its core portal. Modern terrain hides parts of this illustrative surface, so a thin terrain-draped alignment guide keeps the reach legible without inventing a channel cut. Neither is a surveyed bank or tide level.

### Browser spot checks / 浏览器抽查

Windows Chromium, ANGLE/AMD Radeon Graphics, 1000 × 700 CSS pixels, DPR 1.20. The original pilot measured **88–101 ms of main-thread renderer setup** and a **75 ms main-thread cold tile**. With the worker enabled, sampled main-thread setup was **6.5–7.8 ms** in most runs and **34.7 ms** in one offline run; the slowest measured synchronous tile attachment was **2.8 ms**. These timers exclude render submission and GPU uploads. One offline cold Buji view took **1.14 s** to show any detail, with LOD0 visible in the meantime. Worker wall times reached **about 99 ms** for a cold tile and **251 ms** during a clear-mask rebuild. The forced no-worker fallback passed but blocks while planning; the atlas is not yet a frame-rate or latency sign-off.

The overview stayed at **7 draw calls**; the previously profiled fixed neighbourhood cameras stayed within the **120** budget. A 20-step core seam pan settled at **53** calls before and after, with a **2.8 ms** median synchronous event time. The mask toggle kept outer tiles cached. At the pilot edge, three pilot tiles stayed active with the camera target outside the pilot; further panning faded them out rather than clearing the cache. Traversing both corridors reached the 16-tile cap; switching to the October diagnostic and back released it and restored the six uploaded overview geometries. The standalone export passed the estimates switch, four reservoir cameras, both study dates, and the KH‑9 layer with no HTTP resource loads or browser console errors.

Review URLs (dev server or an equivalent local URL): four-tile seam `?focus=core&at=38520,38440&span=2600`, pilot edge `?focus=city&at=15950,43400&span=2600`, estuary join `?focus=core&at=35180,39660&span=2600`. Wait for tiles, then focus the map and pan with the arrow keys. See the [seam plate](../../../Step4BC_Core_Seam.jpg) and [estuary plate](../../../Step4BC_Estuary.jpg).

## 4C — New GIS coverage / 新增底图覆盖

| Addition / 新增 | Basis and decision / 依据与决定 |
|---|---|
| Tiegang / 铁岗 | 461 connected October 1979 MSS water cells. The September KH‑9 shape corroborates the visible portion; the strip cuts across its northern branches. |
| Xili / 西沥（今西丽） | 225 connected October 1979 MSS water cells. KH‑9 corroborates the water body, not an exact shoreline. The viewer records the earlier name rather than using the later name alone. |
| Shiyan / 石岩 | 282 connected October 1979 MSS water cells. Outside the useful September KH‑9 strip; no shoreline interpolation from modern water. |
| Chiwan and Shatoujiao vicinities / 赤湾及沙头角附近 | Two small interpreted KH‑9 texture pockets, with roofs only on comparator dry ground. The historical citations establish settlement identity, not the footprint. No exact old village, temple, historic street, port works, boundary, or fill is placed. |

Reservoir seeds select whole connected components within checked search windows from the original October mask, independently of the coastal elevation cutoff. These are raster sample counts, **not** surveyed areas, levels, September shoreline geometry, or dams. The old Shenzhen Reservoir entry is unchanged (378 cells). In the Municipality view, coastal camera buttons are under the pilot cameras; the four reservoir cameras and citations are in **Evidence & placement / 依据与定位**.

**Northern rail / 铁路北段.** The 30 m modern Copernicus DSM was reprojected to the atlas CRS and smoothed at one pixel. Compare maximum absolute surface slope over roughly 210 m on the current band centre and a terrain-only candidate within that band's width, retaining its portals:

| Leg / 路段 | Band centre / 搜索带中心 | Terrain-only candidate / 仅按地形的候选 |
|---|---:|---:|
| Buji–Pinghu / 布吉—平湖 | 8.4% | 5.4% |
| North of Pinghu / 平湖以北 | 17.3% | 9.8% |

The screening highlights where terrain conflicts remain. It cannot distinguish a historical alignment, grade, cut, bridge, or later earthworks. Both legs still use the same wide dashed **review bands**; no track or narrower search width was promoted. Eastern trunks and unmapped settlements remain open.

## Rebuild / 重建

From `build/3d-snapshots/Shenzhen-step3`, using the existing local GIS inputs and Python environment:

```powershell
$py = 'C:/Building Shenzhen/pipeline/.venv/Scripts/python.exe'
npm run prepareData -w @sz/snapshot-3d -- 'C:/Building Shenzhen'
& $py apps/snapshot-3d/prepare-relief.py
& $py apps/snapshot-3d/prepare-municipal.py
& $py apps/snapshot-3d/prepare-municipal-view.py
npm run check
npm run build -w @sz/snapshot-3d
node apps/snapshot-3d/portable.mjs
```

The GIS compiler writes `../georef/municipal-step4c/` rather than overwriting the original handoff. Its JSON records source hashes, reservoir controls and the detailed rail screen. The portable build in `apps/snapshot-3d/dist/` contains the packed GIS, water classes and coarse KH‑9 layer, not native DSM files, private scans, the local 2 m chip, or GIS plates.
