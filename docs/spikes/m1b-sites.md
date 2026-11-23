# M1b: the 1979 site register and the 1979 Landsat baseline

**Status:** first pass done (2026-11-23). Every flag is red (`lead`). Nothing here is fit for Historical mode until a person checks it.

## How to rebuild
1. `npm run spike:grid` (Spike A grid, `docs/spikes/spike-a-map.md`).
2. `pipeline/.venv/Scripts/python -I pipeline/m1b_landsat_1979.py` puts the Landsat scene on the grid. It needs the bundle extracted to `data/raw/sources/landsat_1979_10_19/extracted/`.
3. `npm run evidence:compile`, then `pipeline/.venv/Scripts/python -I pipeline/m1b_sites.py`. This writes `sites.json`, using the claim statuses and the 1979 masks. The venv also needs `pyyaml`.
4. `npm run spike:map`. The panel has toggles for the false-colour image, the coastline change and the site flags. Click a flag to see its claims.

## The 1979 Landsat scene (`landsat_1979_10_19`)
- **The scene:** LM03_L1TP_131044_19791019_20200906_02_T2. Landsat 3 MSS, 60 m pixels, Collection 2 Tier 2, geometric RMSE 26.8 m, taken at 02:10 UTC.
- **The image:** a false-colour composite (B7, B5, B4) at 50 m, aligned to the grid. Vegetation shows red, bare and built-up ground cyan or white, water dark. The 1979 market town and the Shenzhen Reservoir line up with their proxy points by eye.
- **Water mask:** NIR B7 is averaged per 100 m cell, then split by Otsu at DN 47.1. The sea is the water connected to the grid edge.
- **Results inside today's city:**

  | Change | Area |
  |---|---|
  | Sea in 1979, land now (candidate reclamation) | 78.7 km² |
  | Inland water in 1979, land on today's DEM (ponds, reservoirs) | 43.0 km² |
  | Land in 1979, water now | 0.8 km² |

  Most of the reclamation runs along Shenzhen Bay and around Shekou.
- **Caveats:**
  - The tide when the image was taken is unknown, so mudflats may read as land, or as sea.
  - The threshold is automatic.
  - Today's water comes from a DEM threshold (≤ 0.5 m), so inland water that is still water today can show as "inland water in 1979" too. The Shenzhen Reservoir is an example.
  - About 22% of the "inland water in 1979" cells lie above 50 m (median 28 m). Those are hill shadow in the morning image, not water, so trust that class only on the plains.

  So the mask is a `lead` observation. Playable land still comes from the present-day DEM, and the map keeps its caveat.

## The site register (`content/slice/sites_1979.yaml`)
- **Coverage:** 20 sites. 16 have present-day OSM proxy points (`osm_shenzhen_places`, tier D). Four are unplaced: the KCR line, the Guangzhou road, the border fence and military land.
- **Claims:** each site cites `site.<id>.exists_1979` (lead, general knowledge, use `encyclopedia`). Each placed site also cites `site.<id>.location` (lead, use `geometry`). Sourced Phase 1 claims are attached as context, and most are `design_note`. One is `geometry`: `phase1.map.yumin_river_location`.
- **Flag colour:** the weakest of the site's own encyclopedia and geometry claims.
- **What Landsat shows at each proxy point (hints, not findings):**

  | Proxy point | 1979 at that cell | Hint |
  |---|---|---|
  | 渔民村 Yumin | Inland water | Consistent with fishponds |
  | 蛇口渔港 Shekou fishing harbour | Sea, land now | The present-day harbour is on reclaimed land, so the 1979 harbour lay further inland |
  | 赤湾 Chiwan | Sea | The proxy point is offshore; move it onto the 1979 shore |
  | 深圳水库 Shenzhen Reservoir | Water | As expected |
  | All other sites | Land | — |

## What raises a flag
1. **To amber (`sourced`):** a period source (a gazetteer, yearbook, map or archive item) with a locator and a quote that says the site existed in 1979. A placement drawn on 1979 imagery and recorded as an observation (protocol §5.5) is also needed for `geometry`.
2. **To green (`verified`):** a person checks both.
