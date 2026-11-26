# Neighbourhood streaming pilot / 街区分块试点

Step 4 of the [municipal atlas plan](MUNICIPAL_3D_PLAN.md). Open `Shenzhen_Municipal_LOD1.html` for the September 1980 overview. Zoom into the core or along the west or north pilot corridor to load detail. Use the **Shangbu–Futian**, **Nantou**, **Shekou**, **Sungang** and **Buji** cameras in the municipality view to review the pilot. Shift-drag pans; arrow keys also pan when the map is focused. The original LOD0 export and both 1979 and January 1984 study kits are unchanged.

This page records the original pilot and its timings. See [Step 4B–4C](MUNICIPAL_STEP4BC.md) for the current export, preparation commands, and findings.

## Implementation / 实施

- **3.2 km squares, at most 16 cached.** The overview stays until each replacement tile is ready, and remains at the horizon and outside the pilot. The viewer loads one missing tile per animation frame, prioritising camera-visible tiles and retaining nearby ones. In the municipality view, detail enters at a view span of 4.0 km and exits above 4.8 km; the dedicated core view uses 7.6/8.4 km so the full basin can remain visible. Zooming out keeps the cache warm; switching to imagery or another date releases tile GPU resources. Citywide shadows are off.
- **Plan before cutting.** The core's deterministic plan is prepared in a worker on first close view (with a synchronous fallback if workers are unavailable). Pilot profiles are planned in world metres and pinned at core endpoints. Road, track, and water triangles are clipped after profile and texture-coordinate generation; adjacent tiles share seam positions, normals and UVs. Detailed terrain uses the existing 20 m core lattice and the 100 m relief outside it, with a collar towards the 400 m overview. The existing core river, crossing gaps, and focus masks remain. The outer estuary is still a draped proxy, not a continuous hydraulic profile, surveyed shoreline, or tide datum.
- **Only mapped fabric.** Core structures and civil pieces have one owner by centre. The three mapped outer settlement envelopes generate coarser, illustrative parcels by stable world parcel indices and use the same ownership rule. Regional fields retain the ground tint; unclassified land gets no buildings. LOD1 estimates are warm-coloured and toggle with the dashed LOD0 estimates. The two unresolved northern rail legs remain wide dashed **search bands**, not track. The 11 September KH-9 imagery, traces and clickable names remain a separate observation layer.

## Build / 构建

Prepare the terrain, relief and municipal package as described in [the LOD0 handoff](MUNICIPAL_LOD0.md). From the isolated atlas worktree:

```powershell
npm run check
npm run build -w @sz/snapshot-3d
node apps/snapshot-3d/portable.mjs
```

The standalone file is `apps/snapshot-3d/dist/Shenzhen_Municipal_LOD1.html`. It bundles the coarse observation surface but not private scans or the local 2 m chip. The worker is bundled inline.

## Review / 检查

Windows Chromium, ANGLE/AMD Radeon Graphics (D3D11), 1000 × 700 CSS pixels, DPR 1.20. The viewer's reported draw counts are from settled cameras.

| Camera / 相机 | Draw calls / 绘制调用 | Ready tiles / 已加载分块 |
|---|---:|---:|
| Municipality / 市域 | 7 | — |
| Shangbu–Futian / 上步—福田 | 48 | 7 |
| Nantou / 南头 | 19 | 4 |
| Shekou / 蛇口 | 18 | 4 |
| Sungang / 笋岗 | 43 | 6 |
| Buji / 布吉 | 23 | 5 |
| Core four-tile seam / 核心区四块交界 | 53 | 6 |

Twenty warm arrow-key steps across the core seam took **2.0 ms median** per event including CPU submission; the largest measured cold tile build was **75 ms**, and renderer preparation after the worker reply was about **88–101 ms**. These are CPU-side spot checks, not GPU timings or a frame-rate promise. The browser run reached the 16-tile cap across both corridors; switching to October 1979 diagnostics and back returned the renderer to the six uploaded geometries of the clean overview. The separate offline HTML was tested with close tiles, the estimates switch, both dated kits, and KH-9, with zero console errors and no HTTP resource loads.

Review cameras can still show a visible change when coarse fabric is replaced; the pilot does not cross-fade, prefetch the entire municipality, or establish that all cold frames meet the interactive budget. The recorded seam plates are `Step4_Core_Seam_Before.jpg` and `Step4_Core_Seam_After.jpg` beside the standalone export. To reproduce, open `?focus=core&at=38520,38440&span=2600`, wait for tiles, focus the map and pan left with the arrow keys.
