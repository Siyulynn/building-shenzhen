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

## Raster-first follow-up

The comparisons below use the original R8a mask. The later [Stage A anchor review](map-1984-previews-and-1979-anchors.md#land-cover-and-golden-run-comparison) re-ran the existing classifier with refined site points; the raster-first candidate described here is still a separate experiment.

**Decision:** test option 1. The 3D branch's September 1980 cover is a comparator only. No trace, model exclusion,
generated building or polygon from that branch classifies an R8a cell. The candidate in `build/r8a-landcover/` is
not the shipped map. The Round 2 result of 32/69 readable cells still describes the shipped layer.

### December 1977 registration

`pipeline/m1c_kh9_1977.py` rebuilds from the local numbered ZIP parts or an original archive. Both archive hashes
matched the acquisition register. Only **A010/c** passed the fit against the September 1980 mosaic: **12.4 m RMS,
20.5 m p90** on 349 ties across 32 held-out 2 km blocks. This is image-to-image error after tie selection against
the 1980 reference, **not absolute accuracy**. The 1980 reference has its own Landsat-relative error. Neither
6.25 m sampling nor the 3D track's native 2 m core crop makes a cell boundary exact. Relief displacement, film
quality and lack of local control still matter.

The candidate has usable 1977 texture for **7,236/8,439 playable cells (85.7%)** after the alpha and texture-support
checks, including **3,212/4,401** in Donghu–Liantang and **264/278** at Luohu crossing. Alpha-valid pixels are
not necessarily interpretable. Uncovered cells may use a stricter 1980-plus-MSS built-up test, flagged separately;
no 1977 observation is imputed. The 1977 street sheet remains a naming/topology reference: its native-chip warp
trial missed the 30 m placement gate (60.3 m RMS on four reserved checks). Do not rasterize that sheet.

### Candidate and comparison

- Detect built-up cover with valid December 1977 texture and October 1979 Landsat red/NIR reflectance (NDVI).
  No OSM village radius is required. The small
  [town context mask](../../data/evidence/observations/r8a_town_core.yaml) splits detected cover only; it does not
  place settlement or define a legal boundary. The county-office/village mix in Caiwuwei is still unresolved.
  Where 1977 texture is usable, brightness in 1980 alone cannot create a January 1979 settlement.
- Test pond candidates with lowland terrain, MSS water or low NIR plus dark tones on both KH-9 dates and smooth
  1977 texture. This is not a fishpond-use inventory. Connected MSS water retains the reservoir; the candidate
  still cannot resolve narrow river reaches in the core. Do not buffer the 3D `river_margin` into historical water.
- Suppress narrow peaks on a 30 m modern DSM lattice before aggregating and calculating 100 m slopes. The
  correction is capped at 10 m per fine sample; it does not reverse cut, fill or reclamation. The result is a
  terrain proxy, not historical bare earth. Texture and spectral thresholds are exploratory, fixed across areas.

The audit intersects September 1980 `core-basin-gis.json` polygons from the local 3D snapshot with the 100 m cells.
Only ≥60% cover gets a dominant label; mixed and unknown stay separate. The table does **not** measure 1979
accuracy. The two methods also share imagery, and the municipal water comparator shares the historical MSS mask.

| September 1980 trace | R8a baseline → candidate |
|---|---:|
| Settlement-dominant: called village or town | 32/190 → 112/190 |
| Field-dominant: called village or town | 4/442 → 15/442 |
| Worksite-dominant: called village or town | 5/64 → 22/64 |
| Pond-complex-dominant: called pond | 2/7 → 3/7 |

Some 1980 worksites may have displaced earlier fabric; the date mismatch is not itself an error. The candidate
changes **796 cells**, with villages rising from **113 to 357** and formable cells falling from **4,536 to 4,399**.
Market town, Luohu crossing and Caiwuwei would lose **180 formable cells** between them. That is too consequential
to publish from the dated comparison alone.

### Rebuild and review

From the root, after the existing Spike A, M1b and September 1980 mosaic inputs are built:

```powershell
$py = 'pipeline/.venv/Scripts/python.exe'
& $py -I pipeline/m1c_kh9_1977.py A010 --intake
& $py -I pipeline/m3c_landcover.py --candidate
& $py -I pipeline/m3c_landcover_audit.py --packet --core build/3d-snapshots/Shenzhen-step3/apps/snapshot-3d/core-basin-gis.json
```

Omit `--intake` to reuse reduced scans; omit `--core` if the local 3D copy is unavailable. The pipeline writes the
candidate, input hashes and an `audit.json` report. Share only the `review/` packet with a reviewer, not
`review-key.csv`, predictions or the comparison table. Keep all scan-derived pixels local pending reuse clearance.

The packet has **80 cells across all seven areas**, spread over 1 km blocks and enriched for changes. The previous
rounds' cell IDs were not available in the audit record; the packet cannot certify no reuse. Recover the old IDs if
possible and pass `--exclude prior-cells.csv` (`x,y` columns), along with any cells used to tune a later candidate.
Freeze the packet and maps before scoring. Record 1977 and 1980 readings separately, then the opening-date reading
and its evidence. Use `?` for unsupported cells, ambiguous mixed cover, unresolved changes, or hill/upland splits
without an independent terrain reference. Do not grade slope using the candidate's own filtered DSM.

Fill a **copy** of `review/labels-template.csv` and run
`pipeline/m3c_landcover_audit.py --labels <filled.csv>` with the same Python invocation. Review paired confusion
tables, per-class denominators and unresolved cases, plus false-formable and false-blocked cells. Do not present
this disagreement-enriched sample as a slice-wide accuracy estimate. Aim for at least 70% per populated class
where the sample supports it, with no worsening of critical buildability mistakes. If field/worksite disagreements
remain, review those cases before any threshold change and use new blocks for the next check. Only then consider
updating the live layer, with all five golden runs and §9 bands checked and their movement explained.

## Round 3 (2026-11-25): tuned candidate, cross-validation and a blind reading

**Outcome: the candidate fails the gate. The live layer is unchanged.** Built-up cover is still below 70% in the
blind reading, so `data/starts/slice_landcover.json`, the goldens and the §9 bands do not move.

### What changed in the candidate

Thresholds were picked on the **tuning half only** of a 1 km checkerboard over the 3D core box
(`pipeline/m3c_audit_3d.py`, below):

- `texture77` 24 → **20**: more 1977 built texture counts, still gated by October 1979 NDVI ≤ 0.29.
- DSM opening 3×3 → **5×5** fine samples (150 m), with the 10 m cap kept. Field and settlement called terrain fell.
- **New 1979–80 clearing rule:** a cell with both dates usable, grey ≥ 200 in September 1980 and ≥ 40 brighter than in
  December 1977 is not built. Built-texture worksites at Shangbu and Caiwuwei are this bright (median 1980 grey
  200 against 176 for settlement). On the tuning half the rule cut worksites called village from 10 to 2 and cost
  two settlement cells.

Smaller steps (texture 18–22, NDVI 0.27–0.35) moved the tuning score by two or three cells, which is noise, and
pushed slice-wide villages from 357 up to 755. They were not taken.

### Cross-validation against the September 1980 trace

`pipeline/m3c_audit_3d.py` collapses both maps to four groups:

| Group | Reference (3D trace) | Predicted (R8a classes) |
|---|---|---|
| built | settlement | village, town |
| farm | field | lowland_farm |
| terrain | upland_cover | upland, hill |
| wet | water, pond_complex (the trace's `water` polygons are enclosed ponds) | water, tidal_flat, pond |

It scores each playable 100 m cell in the core box where one kind covers ≥ 60%. Worksite, river margin, transport
land and open ground are reported, not scored. Results on the held-out blocks (n = 320):

| | Shipped | Candidate (Round 3) |
|---|---:|---:|
| Agreement | 0.713 | **0.872** |
| Built recall / precision | 0.14 / 0.92 | 0.68 / 0.91 |
| Farm recall / precision | 0.95 / 0.78 | 0.96 / 0.87 |
| Terrain recall / precision | 0.63 / 0.24 | 0.69 / 0.73 |
| Wet recall / precision | 0.67 / 0.80 | 0.83 / 0.83 (n = 6) |
| Worksites called village | 2 of 44 | 14 of 44 |

Caveats:
- The trace was drawn on the same September 1980 frame the classifier reads, and it dates from after the opening.
  It is a comparator, not 1979 truth.
- The trace's `upland_cover` is vegetated cover, mostly on 1–3% slopes. A slope classifier rightly calls most of it
  farm, so terrain recall against it is not a fair test. Terrain precision is.
- The held-out worksite drift (14 of 44 called village) did not generalise from the tuning half.

### Blind reading (Round 3)

The packet is 80 cells across all seven areas, seed 19791203. It is enriched for cells where the two maps
disagree, so it is not a slice-wide estimate. It excludes the 164 cells of Rounds 1–2 and the earlier tuning crops.

- **Reader:** Claude, an AI model, read the paired 1977/1980 crops blind (no coordinates, area or prediction).
- **Frozen first:** the labels were written before `review-key.csv` was opened.
- **Unresolved:** 19 cells were `?`: no coverage, mixed cover, or farm/upland calls the reader could not make.

| Readable cells (n = 61) | Shipped | Candidate |
|---|---:|---:|
| Strict agreement (eight classes) | 31 (51%) | 38 (62%) |
| Agreement, hill and upland merged | 40 (66%) | **45 (74%)** |
| Built (village + town): recall / precision | 5/17 / 5/7 | **9/17 / 9/14** |
| Farm: recall / precision | 16/18 / 16/27 | 13/18 / **13/19** |
| Terrain: recall / precision | 19/20 / 19/27 | 20/20 / 20/23 |
| Wet: recall / precision | 0/6 / 0/0 | 3/6 / 3/5 |
| False formable / false blocked (strict) | 15 / 9 | 12 / 8 |

**Why the hill/upland-merged row:** the reader split hill from upland without a relief reference, against this
note's own rule. Three cells read as upland have filtered-DSM slopes of 23–54% (one at 454 m), so they are hill.
The frozen labels were not changed. The merged row is the fair comparison.

Gate (≥ 70% per populated class):
- **Terrain passes.**
- **Built fails** on recall (53%) and precision (64%).
- Farm precision just fails (68%).
- Wet has too few cells to judge.

### The built disagreements

These were reviewed after scoring, so they cannot be reused to tune:

- **Missed villages** (read village, candidate farm, upland or pond):
  - grove villages under dark tree cover (1977 grey ≈ 51, NDVI 0.25–0.28), which the dual-date pond test takes as
    pond;
  - villages with green Oct-1979 reflectance (NDVI 0.42–0.44) that fail the NDVI gate;
  - a village on a 7–10% slope, which lands in upland because the built test failed first.
- **Disputed cells** (candidate built, reader farm): four cells, two of them settlement-dominant in the 3D trace.
  The reader may be wrong there.
- **Town:** 1/3, both ways. Town and village are split only by the context mask. Two cells read as town lie outside
  it, south of the A010 coverage edge, where only the 1980 fallback applies.

### Next options (not taken here)

- **Pond rule:** exclude cells with built texture in either date from the dual-date dark test, so grove villages
  are not taken as ponds.
- **Built on slopes:** let built cover outrank upland below hill slope (≤ 15%), as the plan suggests.
- **Town mask:** extend it to the Luohu station approach, south of the A010 coverage edge.
- **Next check:** any threshold change needs a new packet over new blocks. This one is now used.

## Round 4 (2026-11-25): three fixes, a fresh packet, and still no pass

**Outcome: no improvement on the blind reading. The live layer is unchanged.**

### The fixes

Thresholds were picked on the 3D tuning half only:

- **Strong texture:** 1977 texture ≥ **30** counts as built up to NDVI **0.40**, so tree-shaded villages are kept.
  On the tuning half, built recall rose from 0.62 to 0.71 and precision fell from 0.79 to 0.75.
- **Pond NDVI cap:** the dual-date dark test needs NDVI ≤ **0.24**. Ponds and water in the trace sit at NDVI ≤ 0.11
  (p75), and grove villages at 0.25–0.28. This cost one wet cell on the tuning half.
- **Town mask:** the station envelope runs south to row 395, following the September 1980 yard envelope
  (rows 387.6–395.4) rather than the A010 coverage edge.

Held-out 3D agreement was flat: 0.866, against 0.872 in Round 3.

### The blind reading

A fresh 80-cell packet excluded the 244 cells of Rounds 1–3 and the tuning crops; the same reader read it blind.
32 cells were unreadable, mostly with no imagery on either date. The score of record, declared before reading,
merges hill and upland.

| Readable cells (n = 48) | Shipped | Candidate (Round 4) |
|---|---:|---:|
| Agreement, hill and upland merged | 34 (70.8%) | 34 (70.8%) |
| Strict agreement (eight classes) | 23 | 30 |
| Built: recall / precision | 8/16 / 8/9 | 9/16 / 9/14 |
| Farm: recall / precision | 11/14 / 11/19 | 10/14 / 10/16 |
| Terrain: recall / precision | 15/15 / 15/20 | 14/15 / 14/16 |
| False formable / false blocked | 14 / 4 | 9 / 7 |

Pooled over Rounds 3 and 4 (109 readable cells; the two rounds used slightly different candidates):

| | Shipped | Candidate |
|---|---:|---:|
| Agreement, hill and upland merged | 74 (67.9%) | 79 (72.5%) |
| Built recall | 13/33 | 18/33 |
| Built precision | 13/16 | 18/28 |

The candidate finds more of the villages, but about a third of the cells it calls built are read as something else.
Neither map reaches 70% on built cover.

### Why it stalls

The built disagreements this round were not threshold slips:

- **Green grove villages:** NDVI 0.35–0.43 with 1977 texture 20–26, below the strong-texture rule.
- **Pond banks:** bunded ponds carry 1977 texture of 27–31, so they read as village.
- **Clearing rule:** it removed one village with very bright 1980 roofs (grey 212).
- **Station approach:** its only built evidence is 1980 texture of 40, just under the 1980 fallback's 43.

At 100 m these signals overlap. With about 16 built cells per round, further tuning would chase noise.

The reader is also a limit: Claude, an AI model, read mixed cells, and in Round 3 split hill from upland
inconsistently. The two disputed cells in Round 3 that the trace calls settlement suggest the reader misses some
fabric.

### What would move this

1. **A human reading:** a person reads one pooled, frozen packet across Rounds 3 and 4 (with a relief inset), to
   check whether the reader or the map is the limit.
2. **A finer built feature:** for example, a roof-object count on the 2 m native 1977 crop in the core. A
   threshold on a 100 m mean texture can't do this.
3. **A three-class built rule:** separate pond-bund texture from roof texture using the dark-water fraction inside
   the cell rather than the cell mean.
