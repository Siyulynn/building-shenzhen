# R12: the core-basin opening and the 1984 plan

The game's 1979 opening and its 1984 reference plan follow the core-basin design maps in
`docs/spikes/scene-review/zoning/` (spec: `phase1-slice.md` §1.1 and §5.5). The maps are design notes, not evidence:
their outlines cite claims for the sites, not for the extents.

## Status

| Step | Status | Notes |
|---|---|---|
| 1984 overlay | Done | `pipeline/m3d_historical_zones.py` copies cells and routes from `core-basin-design-grid.json`. The first version scraped the SVG and drew the plan 3 cells east and 9 south. |
| 1979 yards | Done | Land-cover class `transport_yard` (ninth, last): Luohu station, Sungang freight yard, Wenjindu crossing. Not formable; roads cross at the road rate. |
| 1979 streets | Done | Jiefang Road, Renmin Road and the old-town west approach join the start network as temporary paths. Proxy streets and tracks stay on the map only. |
| 1979 map reconciliation | Done | See below. |
| Main menu, save and load | Done | Title screen (New game, Continue, Load), a Game menu in play (three slots, an autosave at each turn start, export and import as a file). Saves only at a turn start; a save keeps the unsent answers and queued actions, so End turn after a load gives what it would have given. `apps/slice-ui/src/saves.ts`. |
| Historical run follows the 1984 map | Later | Needs explicit-cell zone plans (spec first) and a recalibration. |

## 1979 reconciliation

The design map's base layer is the game's land cover, so the inherited zones are labels over it. The check was
whether any label contradicts the cell class underneath.

- **No reclassification of game cells.** The land cover classes come from the KH-9 1980 texture and the site points;
  the design boxes were coarse. Where they disagreed the boxes were split, not the cells changed.
- **Caiwuwei.** The "villages" box covered 41 town cells around the old county seat (the county offices moved to
  Caiwuwei in 1953, `site.county_offices.exists_1979`). They are now their own inherited zone, *Old county seat*.
- **Coverage.** Villages now take every village cell in the box, and a *Town fringe* zone takes the remaining town
  cells (the school, hospital and rail land north of Dongmen). Of 322 settlement cells in the box, 305 are labelled
  and every label matches its class; 17 beside the railway and river channels stay unlabelled because the
  generator keeps those cells clear as route barriers.
- **Wenjindu.** The design box sat in area 2, but the game's Wenjindu site and its Hong Kong freight gateway belong to
  area 4. Moving the site would move the gateway between areas, so the box moved onto the site instead (cells
  399–401, 380–382 beside the river; 9 yard cells, 6 in area 4).
- **Shangbu.** The `site.shangbu_land` point moved one row south, into the Shangbu reserve. It still derives from
  the same OSM proxy and stays a lead.
- **Luohu.** The 1979 reserve cited a 1980 estimate as if it were known in January 1979. It is now labelled *Luohu
  lowland (the 1980 site)*: a later fact, with its later claim.

Golden runs: only the land cover hash changed. Neither the Shangbu point nor the Wenjindu yard cells move any
number in the five runs.

## Kept for the 1984 plan

The Municipal compound and Lizhi Park (civic and park ground) have no game effect but stay in the 1984 plan as
reference areas, with the yards, when the overlay and the historical run are extended.

## Generator

`build/3d-snapshots/jan84-stage-b/make-zoning-maps.py` writes the maps and the resolved grid. It sits in the ignored
`build/` folder with its atlas inputs, so the maps cannot yet be rebuilt from a clean checkout. R12 changes to it:
the `transport_yard` shade, and an optional `land_classes` on an inherited zone (which built classes it takes).
