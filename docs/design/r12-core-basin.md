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
| 1984 overlay: reference areas | Done | Lizhi Park, the municipal compound and the three yards are drawn on the 1984 plan (`context` in the overlay file), with their own key entry. No game effect. |
| Historical run follows the 1984 map | In progress | Explicit-cell zone plans (`DesignZonePlan`, §5.9) and the switch are done. All 20 bands pass, but the path fell (see below). Recalibration next. |

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

## The historical run on the design map

The historical plan now draws the design map's zones on their own cells and lays six roads that touch every zone,
because frontage grows only from a zone's own road-side cells (`zoneFrontage`). Checked against the game grid, all
332 design cells are playable and formable. Seven Luohu commercial cells sit on Jianshe Road and are clipped. The
design's Shennan Road row (y 380) lies outside area 7, so the plan lays the road one row north.

The first switch, before any tuning (end 1983, old plan → design plan): GDP ¥43.5M → ¥32.1M, revenue
¥6.50M → ¥4.38M, residents 65.8k → 56.7k, firm jobs 17.5k → 11.4k. Debt ÷ revenue rose 0.31 → 0.49 and trade
imports fell by about 70%. Why:

- **Roads.** They are longer and cost more early: 1980 project spend was ¥1.63M against ¥0.85M.
- **Luohu commercial.** The trading blocks are small after the road clip (4 cells) and open late, so customs falls.
- **Servicing.** It goes to the zone with the least room, so each newly drawn zone takes the crews. Shangbu's
  factories stop at 12 serviced cells while the graded works zones get 18.
- **Footprint.** By 1984 the run services about 50 cells. The design map has about 190 built and 110 graded. Matching
  that footprint would need more crew capacity or cheaper servicing per cell, which are sim parameters, not plan
  levers.

**Plan levers tried** (end-1983 GDP / revenue; old plan ¥43.5M / ¥6.50M; first switch ¥32.1M / ¥4.38M):

| Variant | GDP | Revenue | Note |
|---|---|---|---|
| crews 0.5, room ahead 20k or 40k, three road slots, later works zones | 30.1–32.6 | 4.27–4.51 | Servicing is not limited by room, and crews or staging barely move the path. |
| Luohu core at standard intensity from turn 4 | 36.3 | 5.87 | Against the design: the core is high-rise. |
| The old plan's 6 Luohu commercial cells | 39.7 | 6.05 | Not design cells. |
| **The Luohu commercial strip at x 387, beside Jianshe Road** | **39.7** | **5.96** | The design's own intent. |

The lever is early commercial land in Luohu, because customs depends on the trading companies' premises. The design
map loses its Luohu commercial strip: the generator keeps the design's avenue cells unzoned, and it lays Renmin Road
(a proxy avenue) at x 387 with the strip at x 386. In the game, x 386 is Jianshe Road, so all 7 strip cells are
clipped. The fix belongs in the design map: put the strip at x 387 beside the game's Jianshe Road, and move Renmin
Road or drop it. The historical plan does not lay Renmin Road. With the strip, about 9% of GDP and 8% of revenue are
still short of the old path.
