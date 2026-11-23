# Spike A: the 100 m grid (2026-11-23)

**Status:** done. The spike code is throwaway (`pipeline/spike_a_grid.py`, `apps/map-spike/`); keep these notes.

## How to run
1. Raw inputs live in `data/raw/sources/` (git-ignored). Hashes are recorded in `data/evidence/sources/copernicus_dem_glo30.yaml` and `osm_shenzhen_admin.yaml`.
2. `npm run spike:grid` builds `apps/map-spike/public/grid/` (needs the Python venv in `pipeline/.venv`: numpy, rasterio, pyproj, shapely).
3. `npm run spike:map` serves the viewer at http://localhost:5173.

## Findings
- **The grid:** 931 × 686 cells at 100 m in UTM 50N (EPSG:32650), cropped to the city's land plus a 2 km margin. 292,694 cells fall inside the nine districts, and about 1,958 km² of them are land (the official area is about 1,997 km²). The bulk of that gap is probably inland water or flat reclaimed land at or below 0.5 m being classed as water.
- **The elevation checks out:** the highest cell is 942 m, which matches Wutong Mountain (about 944 m).
- **OSM district polygons extend far out to sea** (they total 4,009 km²). Land area has to come from cells that are inside a district *and* not water.
- **The Shenshan Special Cooperation Zone** is left out. It is a distant exclave and was not part of the city in 1979–2009.
- **Size and speed:** the browser loads 3.8 MB of binary data. Colouring all the cells into a canvas takes well under a second. A pan or zoom redraw takes up to about 40 ms with all 74 subdistrict labels on, which is enough for the 2D map. Labels should be culled to the viewport later.
- **Stack:** plain TypeScript, Vite and a 2D canvas are enough for the Phase 1 map. 3D waits for Spike B.

## Not done (needs your input or research)
- **The 1979 coastline.** The DEM is from 2011–15, so its water mask already includes the reclamation at Shekou, Qianhai, Houhai and the airport. Tracing 1979 needs the 1970s imagery: the USGS aerial frames (V15) and the Landsat scenes (V16). Downloading Landsat from USGS EarthExplorer needs a free account in your name.
- **The 8–12 Phase 1 areas.** The viewer highlights Luohu district plus the 蛇口 and 招商 subdistricts using present-day boundaries. The game's 1979–85 areas (片区) still need defining in the Phase 1 spec.
