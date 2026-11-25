# Phase 1 land cover (R8a): the rule, the audit and what it cannot do

The slice's land-cover layer (`data/starts/slice_landcover.json`) gives each 100 m cell of the seven playable areas
one of eight classes. `pipeline/m3c_landcover.py` writes it, and `packages/sim-core/src/landcover.ts` compiles it.
The game rules that read it are in `docs/design/systems/phase1-slice.md` §5.5, and the decisions behind them are in
`docs/design/phase1-revision-plan.md` §3.1.

**Status: placeholder, every class `lead`.** The rule cites `phase1.map.landsat_1979`, `phase1.map.kh9_1980` and
`phase1.map.shenzhenxu_refs` (`data/evidence/claims/phase1_landcover.yaml`) as `design_note`. The derivation promotes
no claim. The audit below is the number a reviewer should read. On a held-out sample it agrees with a visual reading
for about half the cells, and for some classes much less.

## The rule

The rule takes the first match, with fixed thresholds. They are never per-area quantiles, and the numbers are in the
JSON file's `thresholds`.

| # | Class | Test |
|---|---|---|
| 1 | water | DEM water, or a 1979 Landsat water body (four-connected) of ≥ 50 cells |
| 2 | tidal_flat | coast change 2 within two cells of 1979 water, or elevation < 3 m within two cells of DEM water |
| 3 | pond | coast change 3 (1979 water, land now) in a smaller body, at ≤ 50 m elevation |
| 4 | hill | slope > 15% (the slope function of `m3b_buildable.py`) |
| 5 | village | within 5 cells (Chebyshev) of a `kind: village` point, and KH-9 built texture |
| 6 | town | within 6 cells of a `town`, `state_unit` or `railway` point, and KH-9 built texture |
| 7 | upland | slope > 6% |
| 8 | lowland_farm | everything else |

**Built texture** is measured per cell. The cell's 16 × 16 pixels on the KH-9 mosaic of 1980-09-11 (6.25 m) are
high-passed (the grey level minus a Gaussian blur with σ = 3 px), and the cell is built if the mean absolute value is
at least 40 grey levels. A cell with less than half its pixels on the mosaic has no built evidence, so it is never
village or town.

**Two deviations from the plan's first wording.** The inputs forced both.
- In the playable areas, every `water1979` cell is also coast change 3. This is because `m1b` defines code 3 as
  "1979 water, DEM land". Taken literally, "water if `water1979 == 1`" would turn every fishpond into water. So the
  reservoir and the river are told apart from the ponds by the size of their 1979 water body.
- About a fifth of the 1979 inland-water cells lie on hill slopes, where shadow reads as water (the caveats in
  `landsat1979.json`). So `pond` has an elevation ceiling, and a shadow cell falls through to `hill` or `upland`.

**The totals over the 8,439 playable cells** are:

| Class | Cells |
|---|---|
| water | 378 |
| tidal_flat | 0 |
| pond | 21 |
| hill | 3,412 |
| village | 113 |
| town | 45 |
| upland | 1,576 |
| lowland_farm | 2,894 |

No playable area reaches the 1979 shore, so `tidal_flat` is empty in the slice. The class stays in the schema for
later areas.

**Self-test.** `python -I pipeline/m3c_landcover.py --selftest` classifies a 24 × 24 synthetic grid twice. It checks
that every rule fires on its patch, that rule order resolves overlaps (village before town, slope before built
texture), and that the two results are identical.

## The audit

**Method.** The cells were read blind. Each cell got a crop of 5 × 5 cells around it at twice the KH-9 resolution,
with the cell outlined and no predicted class shown. The cells came in sheets of twelve. Each was read as one of the
eight classes, or `?` where it could not be read. Readers also used the 1977 street sheet of Shenzhen town
(`data/Shenzhenxu/`). That sheet is not georeferenced, so it located no cell. It confirms the broad pattern near the
station:
- the built town between the railway and the Wenjindu road;
- the county offices and Hongling west of the line;
- Yumin by the river;
- ponds along the railway;
- Wenjindu to the east.

**The sample.** Cells were stratified by predicted class: about 10 per class where the class has that many (water 4,
pond 10, hill 8, village 10, town 10, upland 12, lowland_farm 16). The extra weight went on the borders that change
cost. Each round used its own random seed.

**Round 1** (seed 2) ran with built texture ≥ 30 and a village radius of 4. Overall it agreed on 27 of 67 readable
cells. Every class except water was below 70%. Four of the ten town cells read as farmland whose field texture passed the
threshold, and four of the ten village cells read as town. So the texture threshold went up to 40 and the village
radius to 5, and the rule was run again.

**Round 2 (held out)** used seed 3 and excluded every cell used for tuning or in round 1. It ran with the final
thresholds and agreed on 32 of 69 readable cells.

| layer \ reading | water | tidal_flat | pond | hill | village | town | upland | lowland_farm | ? | n | agree |
|---|---|---|---|---|---|---|---|---|---|---|---|
| water | 3 | · | · | 1 | · | · | · | · | · | 4 | 3/4 = 75% |
| pond | · | · | 7 | · | 2 | 1 | · | · | · | 10 | 7/10 = 70% |
| hill | · | · | · | 3 | · | · | 5 | · | · | 8 | 3/8 = 38% |
| village | · | · | 1 | · | 6 | 1 | 1 | 1 | · | 10 | 6/10 = 60% |
| town | · | · | · | · | 4 | 6 | · | · | · | 10 | 6/10 = 60% |
| upland | 1 | · | 1 | 2 | 2 | · | 3 | 2 | 1 | 12 | 3/11 = 27% |
| lowland_farm | · | · | 1 | 1 | 6 | · | 4 | 4 | · | 16 | 4/16 = 25% |

For comparison, round 1's table, with the earlier thresholds:

| layer \ reading | water | pond | hill | village | town | upland | lowland_farm | ? | n | agree |
|---|---|---|---|---|---|---|---|---|---|---|
| water | 3 | · | · | · | · | · | · | 1 | 4 | 3/3 = 100% |
| pond | · | 4 | · | 3 | 3 | · | · | · | 10 | 4/10 = 40% |
| hill | · | · | 5 | · | · | 3 | · | · | 8 | 5/8 = 62% |
| village | · | 2 | · | 2 | 4 | · | 2 | · | 10 | 2/10 = 20% |
| town | · | 1 | · | 2 | 3 | · | 4 | · | 10 | 3/10 = 30% |
| upland | · | · | 5 | · | · | 3 | 2 | 2 | 12 | 3/10 = 30% |
| lowland_farm | · | · | · | 6 | 1 | 2 | 7 | · | 16 | 7/16 = 44% |

**What the tables say.** The plan asks for a class below 70% to have its threshold reset and the rule run again. That
happened once, between the rounds. After round 2, five classes are still below 70%. For each one the cause is
structural, so another pass of tuning on the same readings would fit the sample rather than the ground:
- **Unpointed villages read as lowland_farm** (6 of the 16 farm cells). The built texture is there, but no OSM village
  point lies within 5 cells. The rule can only find villages that have a point, so the fix is a 1979 village point
  register, not a threshold.
- **Hill and upland are slope classes**, from the present-day DEM. A visual reading of an oblique 1980 photograph
  cannot measure slope (relief displacement, shadow), so those readings are low-confidence in both directions. The
  hill/upland confusion (5 of 8) is a disagreement between two weak instruments, not a measured error.
- **Village and town cannot be told apart reliably** at 6.25 m in the Luohu core (4 of the 10 town cells read as
  village). The rule separates them by the nearest point, which is as good as the points are.
- **A KH-9 dark-pixel pond test was tried and rejected.** It did not separate ponds from village roofs and lanes.

Round 2 has 69 readable cells, so each class has 4 to 16. A single class's agreement carries an uncertainty of about
±15 percentage points.

## Caveats (also in the JSON file)

- The DEM is present-day, so cut, fill and reclamation since 1979 are not undone.
- Water and ponds come from one automatic Landsat MSS threshold (60 m, October 1979). Fishponds smaller than its
  pixels are missed and read as lowland_farm.
- Built texture is from September 1980, after the first works began. It is evidence for that date, not for 1979.
- The village and town points are present-day OSM proxies (confidence 0.2–0.4). A village with no point never
  becomes the village class.
- About a sixth of Donghu-Liantang lies outside the KH-9 frames, so it can never be village or town.
- The 1977 street sheet and the county map are not georeferenced. They audit and label; they classify nothing.

## What would improve it

1. Draw a 1979 village point register from the 1977 county map and the KH-9 frames. Each point would be a `lead`
   claim with a locator. This would move most of the farm→village errors.
2. Georeference the 1977 street sheet against the KH-9 mosaic. It would then be an audit instrument for the town
   class, cell by cell.
3. Check slope against a second elevation source, or against the 1980 contours, before reading slope classes visually
   again.
