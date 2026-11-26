# Municipal overview handoff / 市域远景交接

Step 3 of the [municipal plan](MUNICIPAL_3D_PLAN.md), in the isolated atlas only. Open `?focus=city&epoch=baseline`. Choose **West corridor / 西部走廊** or **North corridor / 北部走廊** for a closer LOD0 view. The **Core basin / 核心区** pin switches to the existing detailed September core. Selecting an imagery or comparison surface temporarily hides the built baseline without changing the selected scene. The 1979 and January 1984 buttons still open the older study kits; they are not derived municipal states.

This handoff describes the archived Step 3 export. For the current build command and portable filename, see the [Step 4 pilot](MUNICIPAL_LOD1.md).

## What the overview shows / 远景内容

- One 400 m modern relief mesh with a smooth municipal colour texture and a few merged corridor batches. Sea and reservoir shapes are coloured on the terrain, not assigned an unverified flat water datum. The river is a draped overview ribbon, not a channel profile. The 19 October 1979 water comparator determines valid cells; modern water is visual fallback **only** where the comparator is unknown. The evidence rasters are unchanged.
- Traced and interpreted routes are solid. Estimated road and rail candidates are dashed; the Buji–Pinghu and farther-north railway legs are wide dashed **review bands**, not rails. Route widths are exaggerated for readability at city scale, not survey widths. The estimates toggle hides both dashed batches, not the mapped base. Each estimate retains the evidence for existence, the geometry source and its search width.
- Mapped settlement envelopes get coarse roof clusters on comparator dry ground. Most outlying areas have terrain only: no invented town blocks, secondary road grid, dams, or coastline survey. The adjoining core river reaches now share their boundary cross-section normal. The core camera still uses its own ground, and automatic spatial LOD switching and the collar seam are Step 4.

## Prepare and export / 准备与导出

From `build/3d-snapshots/Shenzhen-step3` (or the equivalent detached atlas directory), with the existing GIS virtual environment:

```powershell
npm run prepareData -w @sz/snapshot-3d -- 'C:/Building Shenzhen'
& 'C:/Building Shenzhen/pipeline/.venv/Scripts/python.exe' apps/snapshot-3d/prepare-relief.py
& 'C:/Building Shenzhen/pipeline/.venv/Scripts/python.exe' apps/snapshot-3d/prepare-municipal-view.py
npm run build -w @sz/snapshot-3d
node apps/snapshot-3d/portable.mjs
```

The municipal packer checks the Step 2 export against the prepared grid, including the comparator registration and class counts. It produces `public/grid/municipal-gis.json` and `municipal-water.bin` (one byte per atlas cell). Build first, then create `dist/Shenzhen_Municipal_LOD0.html`. The export requires both municipal files and embeds neither the local 2 m chip, private warps nor the GIS review plates. For a fresh atlas in which the municipal files are missing or invalid, the served viewer keeps the earlier city view and explains the missing input in the evidence drawer. The neighbourhood view identifies whether it is using the prepared relief or the 100 m fallback.

## Browser spot checks / 浏览器抽查

Desktop Chromium on Windows with ANGLE/AMD Radeon Graphics (D3D11), 980 × 664 CSS pixels, DPR 1.20. Sixteen warm frames per camera, driven by alternating the zoom buttons. The timings include browser scheduling and CPU submission and are not GPU timings or an FPS guarantee.

| Camera / 相机 | Reported draw calls / 绘制调用 | Median frame interval / 中位帧间隔 |
|---|---:|---:|
| Municipal overview / 市域远景 | 7 | 13.8 ms |
| West corridor / 西部走廊 | 7 | 21.0 ms |
| North corridor / 北部走廊 | 7 | 20.8 ms |
| Existing core / 现有核心区 | 17 | Not timed / 未计时 |

Checks also cover plan containment, exact portal coordinates, running with the generated inputs, preserved comparator dates, and toggling back to the bookends. For Step 4, keep the regional batches as a distant fallback, partition visible neighbourhoods before generating individual blocks, and calculate long profiles before clipping at tile boundaries. Do not upgrade the northern review bands to functioning track just because finer chunks exist.
