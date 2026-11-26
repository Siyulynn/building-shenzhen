# Shenzhen snapshot atlas · 深圳历史快照

An isolated 3D study of the 1979 opening and January 1984 visit. The playable slice runs independently. The municipality view uses the full 931 × 686 terrain grid. Six focus views share the same world coordinates, physical objects and two dated assemblies.

| Milestone in this study | Implemented |
|---|---|
| M0 · registration and inputs | EPSG:32650, metre axes, pixel-centre registration, grid stride checks, site register and source-linked evidence index. |
| M1 · terrain and observations | 400 m overview surface, 100 m focus terrain in 3.2 km tiles, October 1979 water estimate and November 1984 comparison. The two MSS false-colour images have independent controls. |
| M2 · assembly | Instanced procedural building and landscape kits, two named snapshots, six camera presets, shared layouts that retain their placements across dates. |

## Open the atlas

Open `Shenzhen_1979_1984.html` from the delivery in a current desktop browser with WebGL 2. It contains its map data and runs offline. Switch dates to compare the same view. The **Surface layer / 地表图层** control selects a dated observation independently of the built scene. Click a city label or choose a focus area. The Luohu view also has three local camera buttons.

## Build and edit

This app is the consolidated Stage B atlas: it is the tracked copy of the 3D study that grew in the two
`build/3d-snapshots/` clones (the procedural basin and the municipal bookends). The clones' working files were
folded into it before this branch, so the source here is the superset. The maps generator moved to
`pipeline/make-zoning-maps.py` because the game pipeline reads the grid it writes.

From the project root, install the locked dependencies with `npm ci`. The prepared `apps/snapshot-3d/public/grid/` directory is not committed. To regenerate it, pass the Shenzhen research checkout containing the GIS products and the M2–M4 project and zoning claims.

```powershell
npm run prepareData -w @sz/snapshot-3d -- "C:/Building Shenzhen"
node apps/snapshot-3d/prepare-basin.mjs
npm run dev -w @sz/snapshot-3d
npm run check
npm run build -w @sz/snapshot-3d
node apps/snapshot-3d/portable.mjs
```

The optional `npx tsx apps/snapshot-3d/plates.ts OUTPUT_DIR` renders matched PPM review plates from the same triangulated terrain, placement records and mesh instances. Its software lighting is independent of browser lighting.

`prepare-basin.mjs` refreshes `core-basin-gis.json` from the September 1980 base-map export; `basin-gen.json` holds the procedural basin's art parameters and detail-area masks (see [BASIN_GENERATOR.md](BASIN_GENERATOR.md)). `atlas.json` owns the snapshot lists, focus cameras and component placements. Each layout references a registered site, a metre offset, and claim IDs. A part row gives the kit name, local east and south offsets, column and row counts, east and south spacing and yaw in degrees. Rows centre the repeated pieces over the offset. Add an existing layout to both epochs to retain identical placements. `src/parts.ts` supplies the reusable parts. The scene draws all study locations on a common surface.

## Reading the evidence

- Buildings represent samples of documented uses and construction stages. Footprints, count, height and local site plans are illustrative. The evidence drawer gives claim status and source locations. The original site register remains authoritative for which features have no placement.
- Yumin and Shekou's modern place proxies fall in pixels classified as water in the October 1979 layer. Their illustrative assemblies use explicit offsets to adjacent lowland. Guomao uses an illustrative offset from the market-town proxy. These adjustments are art placements, with no surveyed coordinate claim.
- The Guomao comparison holds the site camera fixed. The early frame has no model there because the 1979 site cover is unresolved. The partial tower in January 1984 uses an inferred floor count. See `phase1.guomao.construction_visible_january_visit` and `phase1.guomao.main_tower_topped`.
- The Nantou old-town geometry carries across both dates as an assumption. Its evidence drawer records the university's temporary premises and the February 1984 permanent-campus groundbreaking. See `phase1.szu.site_and_temporary_premises` and `phase1.szu.permanent_campus.ground_break`.
- The October MSS mask and the November MSS change classes are lead-level automated observations. November 1984 has little usable coverage in the west and core. The 1984 change classes include clearance, water-level variation and seasonal vegetation. A cell classified as cleared cannot locate a building. The 2011–15 DEM also includes later surface features.
- Modelled buildings currently cover the six focus areas. Municipality-wide historical building stock, individually traced parcels, walkable routes, live simulation deltas and the human-timed street reconstruction remain open.

## Data and code credits

- Terrain uses Copernicus DEM GLO-30. © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA. Project source record `copernicus_dem_glo30`.
- False-colour MSS images and water/change classifications use the USGS Landsat scenes of 19 October 1979 and 22 November 1984. Source records `landsat_1979_10_19` and `landsat_1984_11_22`.
- The grid administration bands and the site register’s modern proxy positions derive from © OpenStreetMap contributors, ODbL. The prepared GIS files are included separately from the illustrative placements. [Attribution and licence](https://www.openstreetmap.org/copyright)
- Three.js and its OrbitControls, r174, MIT. The portable build preserves the upstream licence. Procedural kit geometry is authored for this study.
