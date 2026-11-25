# M6b tuning log (the slice's balance pass)

Companion to `docs/design/systems/phase1-slice.md` §5.10. Every change below is a named parameter in
`params/slice.yaml` or a headless policy's plan. No sim mechanic changed, except the tested `buy_power` action
described at the end.

## Baseline (M6a report, 2026-11-24, before this pass)

| Policy | End-1983 residents | Resident growth | GDP growth | 1983 spending ÷ revenue | Bands |
|---|---:|---:|---:|---:|---|
| default | 30,780 | ×1.015 | ×1.024 | 1.40 | growth, spending, design fail |
| cautious | 30,585 | ×1.008 | ×1.036 | 1.33 | growth, spending, design fail |
| aggressive | 31,196 | ×1.028 | ×1.071 | 1.75 | growth, spending, design fail |
| decline_all | 30,334 | ×1.000 | ×0.994 | 1.42 | growth, design fail |
| historical_prologue | 31,308 | ×1.032 | ×1.054 | 1.62 | growth, spending, design fail |

The baseline's four constraints were money, construction crews, spare power and from-scratch labour matching
(§5.10). R4 had already replaced the fourth with incumbency; the golden runs showed the first three still bind.

## Attempts

1. **Map-first plans and source frontage.** The playing policies now draw roads, phase servicing to the crew pool,
   and place sources through the works queue. A service spur around the Shangbu template (and around the zone the
   aggressive plan draws) gives each source a free cell beside a road that touches the zone. Unbuilt plan-road
   cells are reserved so a source cannot block a later road. Before any fiscal or migration change this raised
   aggressive's end-1983 residents from 31,196 to about 31,300; it did not move the other policies.
2. **Money, crews and utilities.** Service cost ¥100,000 → ¥30,000 a cell; power source ¥500,000 / 500 kW →
   ¥200,000 / 1,000 kW; water source ¥400,000 / 200 m³/day → ¥150,000 / 500 m³/day; local crews 120 → 600; one
   organic firm 100 → 500 jobs (5,000 m² factory + 750 m² dormitory), demand 1,500 → 6,000 m² a month, minimum
   utility share 0.5 → 0.3; processing output ¥400 → ¥520 a job-month; the spending that supports one service job
   ¥100 → ¥60 a month. This is the step that lets the Shangbu zone fill and lets construction finish.
3. **Migration and crowding.** Migrant base 600/300 → 2,000/1,000 people a month; `K_vac` 500 → 200; housing push
   0.1 → 0.02; `crowding_max` 1.6 → 2.5. The migration base is the one that brings residents inside the band; the
   lower housing push and higher cap keep the newcomers from leaving before they become usual residents.
4. **Fiscal.** County revenue ¥130,000 → ¥168,000 a month; county obligations ¥150,000 → ¥100,000; per-head admin
   ¥2 → ¥1, police ¥0.5 → ¥0.3, sanitation ¥0.02 → ¥0.01; collection 0.8 → 0.9; austerity cap 0.2 → 0.3; the short
   loan's revenue multiple 0.25 → 0.5, rate 0.8% → 0.6% a month, term 12 → 24 months. The M4 road link's budget
   ¥600,000 → ¥1,100,000 and site preparation ¥100,000 → ¥130,000 a cell keep the 1979 spending ratio in its band
   after the cheaper works; these are project budgets, not map-works costs. The 1983 golden runs end with no arrears
   and the 1984 fiscal test positive for both playing policies.
5. **Bought power (test only).** A `buy_power` contract adds capacity for a monthly service line (param
   `fiscal.power_import.yuan_per_kw_month`, 8 in the test). Buying 3,000 kW for area 7 every fourth turn from turn 8
   raised historical_prologue's end GDP by 1.2% (×3.42 → ×3.46) but pushed spending ÷ revenue from 0.96 to 1.32.
   Firm posts did not move: by then the open firms were limited by floor, ramp and crews, not by power. It is not
   used by any policy. The action and its test stay available for a later decision on the source (Hong Kong or
   Guangdong) and the network's limit.

## Final bands (seed 1)

| Policy | Resident growth | GDP growth | 1983 spending ÷ revenue | §9 measured bands |
|---|---:|---:|---:|---|
| historical_prologue | ×1.64 | ×3.47 | 1.08 | 20 pass, 0 fail |
| aggressive | ×1.80 | ×3.95 | 1.17 | 20 pass, 0 fail |
| cautious | ×1.20 | ×1.76 | 0.71 | 15 pass, 5 fail (structural) |
| default | ×1.02 | ×1.04 | 0.97 | growth/design fail (idle) |
| decline_all | ×1.00 | ×0.97 | 0.73 | growth/design fail (idle) |

The bands checked are the end-1979 and 1980-Q2 snapshot bands and the end-1983 checkpoint, including the design
bands. The two cross-run or not-checkable records (`readiness_moves_wave`, `stall_after_credit`) are reported as
such, not counted as passes.

## Structural failures, with reasons

- **default and decline_all are idle by design.** They answer cards and take no turn actions (§5.9), so they cannot
  build, service or attract firms. Their end-1983 growth and design-band failures are the comparison, not a tuning
  target.
- **cautious is a deliberately small plan.** It draws 12 industrial cells and 4 residential cells, keeps a quarter
  of the crews, and declines the project loan, the co-financing and every shortcut. Its 12 industrial cells cap
  industrial floor at 120,000 m², which caps the GDP multiple below the citywide lower band (×3.34) even when the
  zone is full. It also under-spends the 1979/1980/1983 spending-ratio bands because it refuses the loan. Its
  resident growth (×1.20) passes the §9 SEZ band [×1.164, ×3.491] but not the design band [×1.5, ×5]. Making it
  pass would mean changing what "cautious" means (a larger zone or taking the loan), not a parameter.
- **The GDP band is a citywide multiple applied to a slice.** It is an upper bound from the city's 1979–83 series
  and a growth multiple, not a slice figure. The historical and aggressive runs pass it; the cautious run cannot at
  its plan's scale.

## Evidence status

- Every checked band resolves its numbers from `data/evidence/claims/`: the city and SEZ population series, the
  city nominal GDP, exports and budget revenue/spending. All are `sourced`, none `verified`, so the draft compile
  tags them `[UNVERIFIED]`.
- No band in this pass rests on a `lead` claim. The temporary routes, the 1979 site placement and the buildable
  layer remain leads/placeholders, but they are not calibration targets.
- The two vintages are kept apart: citywide 2014-vintage series for the city growth band and upper bounds; the
  1985-vintage SEZ series for the SEZ usual/temporary bands.
- No conflicting figures were averaged. The open conflict records (including the 1978 population and the Guomao
  topping-out scope) are not used by these bands.

## Invariants

`npm run check` is green: population and money are conserved, no stock goes negative, the runs are deterministic,
and the M5b calibration properties still hold (the historical run passes the snapshot and the later reviews,
`declineAll` fails every review after the lightweight one, and readiness still moves the first wave).

## R8 (Pass 2, 2026-11-25)

R8 adds land cover, power, freight and intensity (`phase1-revision-plan.md` §3). Each commit is checked against the
R7 band results for `historical_prologue` and `aggressive` (seed 1). Both had 20 passes and 0 failures before R8.
Bands are never widened; the tuning goes into parameters.

### R8a: land cover and compensation

| Run | Plan's first table (farm ×2.0) | No compensation | Half table (farm ×1.0), kept |
|---|---|---|---|
| historical 1983 spending ÷ revenue | 1.334, **fails** (≤ 1.204) | 1.040 | 1.191 |
| aggressive 1983 spending ÷ revenue | 1.524, **fails** | 1.180 | 1.182 |
| aggressive 1983 GDP multiple | 3.351 | 3.580 | 3.480 (band ≥ 3.341) |

- With compensation off and the cost factor at 1, both runs reproduce R7 exactly. The plans' zones avoid every
  village cell: they are lowland_farm (98% of the historical plan's cells, 80% of the aggressive plan's),
  and the rest is upland.
- At ¥60,000 a farm cell, compensation was about a fifth of 1983 revenue in the historical run, which pushed spending
  out of the band. Halving every multiple keeps the ordering the plan wanted: upland 0.25, farm 1.0, pond 1.25, town
  1.5.
- The aggressive run's response is not monotonic: farm ×0.75 fails at 1.222. The 1983 ratio sits near the deficit
  rule and the loan timing, so it is fragile. R8c's purchased power adds monthly obligations on the same account, so
  it must be checked against this margin.

The kept values give these results.

| Run | Residents | GDP (yuan) | Readiness |
|---|---|---|---|
| historical | 49,815 → 50,690 | 28.79 M → 29.36 M | 0.745 → 0.706 |
| aggressive | 54,329 → 49,980 | 32.93 M → 29.76 M | 0.784 → 0.685 |

- Both runs pass all 20 bands.
- Aggressive builds less because formation costs 1.2–1.6× and compensation competes for the same money.
- Cautious moves a little: 36,266 → 36,268 residents, and GDP 14.24 M → 14.28 M. Its five structural failures are
  unchanged.
- Default and decline_all are unchanged, because they draw no zones.

### R8c: the city power pool

The numbers are those of commit 2b1d766 (seed 1, end-1983).

| Run | Residents | GDP multiple | Why |
|---|---|---|---|
| historical | 50,690 → 50,577 | ×3.464 → ×3.455 | purchases owe a service line; no water sources to build (projects completed 5 → 3) |
| aggressive | 49,980 → 50,704 | ×3.480 → ×3.491 | water no longer binds; power binds in 1982-Q4 (share 0.97) and 1983-Q1 (0.75), and eases when its station finishes in 1983-04 |
| cautious | 36,268 → 39,964 | ×1.766 → ×2.189 | water no longer binds; it buys 500 kW from turn 4 |

- Both banded runs pass all 20 bands.
- Default and decline_all are unchanged.
- The historical run's `fiscalTest.balance` turned slightly negative (−58k). It is not banded.

### R8d: road tiers and gateway freight

**Placeholders (design_note):**
- Classes:
  - track: 6 units, 2,000 t a month;
  - street: 12 units (works.road's), 8,000 t;
  - avenue: 18 units, 30,000 t.
- Gateways: the plan's capacities, unchanged.
- Freight:
  - processing: 0.003 t per yuan of exports, inputs 0.3 of that;
  - materials: 2 t per crew unit;
  - yard: 6 cells.

**Why these:**
- Avenue was 24 units in the first try. The historical plan could not afford the corridor until 1982-07, so it was cut to 18.
- Materials were 5 t a unit in the first try. That reported unmet station tonnage the pool never needed: the "wanted" units exceed the pool, so they were cut to 2. At 2 t, materials never bind in the golden runs.

**What binds:** every run's Shangbu firms ship to Luohu over the start streets (Guangshen road, then Jianshe Road), so each area's path is one street (8,000 t). Area 7's exports reach that in 1982-Q2 in every map plan, because the historical run's exports are at or above the aggressive run's through 1982. The plans differ by when they upgrade the corridor to avenue (`MapPlan.upgrades`, three legs, about ¥700k and 282 crew units):

| Plan | Upgrades | Binds | 1983 GDP multiple |
|---|---|---|---|
| aggressive, no upgrade | none | 1982-07 to the end | ×2.275, **fails** 3 bands |
| aggressive, upgrades as soon as its roads are built | 1980-10 to 1981-06 | never | ×2.747, **fails** 3 bands: power binds instead (below) |
| aggressive, from turn 12, kept | 1982-04 to 1982-12 | 1982-07 to 1983-01 | ×3.486, passes |
| historical, kept | first leg 1981-04, then 1982-04 to 1982-09 (money) | 1982-04 to 1982-09 | ×3.418, passes |

- **Why the early upgrade fails.** It is not the first wave: readiness, formed cells and firm counts match the kept run quarter for quarter until 1983. The upgrade's money is spent in turn 9, the plan's `station_turn`, so the plan orders its power station a year late (1982-04). The station is still unfinished at the end, the pool stays at 4,250 kW against 10,250 kW in the kept run, and posts plateau near 8,400. It is an ordering effect inside the plan script (works before utilities), but a player can fall into the same trap: an upgrade ordered ahead of need can starve the power that the firms need first.
- **Materials are inert at these settings.** At 2 t a crew unit, one street carries 4,000 crew units a month per area, far above the pool. So the station never limits building in these runs. Lowering the rate from 5 t hid the overstated demand (each job's pace, not the pool's supply) rather than fixing it. Capping the materials demand at the pool is the fix to make before the materials flow is tuned to bind.
- Raising capacities was not needed.

**Goldens (end-1983):**

| Run | Residents | GDP multiple |
|---|---|---|
| historical | 50,577 → 50,103 | ×3.455 → ×3.418 |
| aggressive | 50,704 → 50,022 | ×3.491 → ×3.486 |
| cautious (no upgrade; binds from 1982-Q2) | 39,964 → 37,441 | ×2.189 → ×1.865 |

- Default and decline_all move only `params_sha256`.
- historical_prologue and aggressive pass all 20 bands.

### R8b: no public zone, and the zone intensity

**What changed:**
- `public` left `LAND_USES` and the zones flyout.
- Zones gained `intensity` (low, standard, high), absent meaning standard.
- The tier factors are in `growth.intensity` (phase1-slice §5.3).

**Deviation from plan §3.2:** low's formation cost is ×0.7, not ×0.5. At 0.5, low was the cheapest per m² of floor in money, work and power at once. At 0.7, high is the cheapest in money, low in power, and the two tie in work. A test holds this.

**Effect on the goldens:** none, beyond `params_sha256`. No map plan or policy sets a tier, and no content unlocks `high`. Residents, GDP and every band are unchanged in all five runs. The tiers become a lever only when a player or a later plan chooses one.

## R9 (Pass 3, 2026-11-25)

R9 adds the guided prologue (`phase1-revision-plan.md` §4): the news layer, the tool gates, the reframed prologue
cards, timed modifiers, crew in waves (§4.5) and works pace (§4.6). Each commit is checked against the R8 results for
`historical_prologue` and `aggressive` (seed 1), which passed all 20 bands before R9. Bands are never widened.

**End-1983 goldens and the 1979 spending ratio, by commit** (residents, GDP in ¥m, 1983 and 1979 spending ÷ revenue;
the 1979-Q4 band is [1.295, 2.158], the 1983 band [0.722, 1.204]):

| Commit | historical | aggressive | cautious |
|---|---|---|---|
| before R9 | 50,103 · 28.97 · 1.173 · **1.364** | 50,023 · 29.69 · 1.202 · **1.385** | 37,441 · 15.08 · 0.783 · 0.933 |
| 74b9c37 news | unchanged | unchanged | unchanged |
| f8df6d1 gates | 49,014 · 28.77 · 1.161 · 1.140 | 49,744 · 30.88 · 1.260 · 1.167 | unchanged |
| b9ec2a1 prologue cards | 49,059 · 28.76 · 1.050 · 0.768 | 49,139 · 30.70 · 1.161 · 0.632 | 37,148 · 14.92 · 0.814 · 0.807 |
| 36ebbcd modifiers | unchanged | 49,022 · 30.65 · 1.159 · 0.632 | unchanged |
| 69a80ce crew waves | 48,897 · 30.60 · 1.066 · 0.768 | 48,694 · 31.25 · 1.095 · 0.632 | 37,167 · 14.92 · 0.745 · 0.807 |
| b7ec4fd, e1e948b pace | hash only | hash only | hash only |
| 7d33d64 borrowing | 51,317 · 33.21 · 1.125 · 0.874 | 48,507 · 31.29 · 1.128 · 0.946 | unchanged |

**Why the 1979 ratio fell.**
- **The gates (f8df6d1).** They hold back the tools the plans used in 1979, which took the ratio to about 1.14–1.17.
- **Retiring M4's road link from the prologue (b9ec2a1, plan §4.1).** This took most of it. The old opening card
  committed project.road_link (¥1.1m, tuned in M6b step 4 to hold this band). The commit ran ahead of the money, so it
  raised the ¥3m state-bank loan, and the run spent ¥2.18m on projects in 1979.
- **The map plans could not make it up as they were.** They committed only what they had, and each works order draws at most
  `crew_per_order` (40) crew a month. A road order spends about ¥100,000 a month and a service order about ¥30,000.

**What was tried (7d33d64 and after):**

| Lever | historical 1979 | aggressive 1979 | Other bands | Kept |
|---|---|---|---|---|
| `borrow_until_turn: 3`: the plan counts the loan's principal while it is unoffered | 0.768 → 0.874 | 0.632 → 0.946; 1980-Q2 passes | no new failure | yes (7d33d64) |
| plus 5 parallel service orders on one zone, each a turn of one order's crew | 0.874 | 0.909 | aggressive 1983 spending fails, 1.232 | no |
| plus the turn works in the first month (the first road at turn 0) | 1.106 | 1.019 | none | yes |
| plus `roads_at_once: 2` and a Luohu street (19 cells) | **1.337**, all 20 pass | 1.249 | none | yes, historical |
| aggressive: `roads_at_once: 3` and a second Luohu street (10 cells) | | **1.338**, all 20 pass | none | yes |
| modifiers softened | none touch 1979 | | | not needed |

**Result:** historical_prologue and aggressive pass all 20 bands.

| Band | historical | aggressive | Range |
|---|---|---|---|
| 1979-Q4 spending ÷ revenue | 1.337 | 1.338 | [1.295, 2.158] |
| 1980-Q2 | 1.204 | 1.207 | [0.987, 2.158] |
| 1983-Q4 | 1.070 | 1.082 | [0.722, 1.204] |

- **The 1979 margin is thin.** A later change that cuts 1979 city works will trip this band first.
- **The Luohu streets are design roads** (design_note): they run east from Jianshe Road into area 2, where the co-financed substation goes.

**End-1983 goldens of the roads commit** (against 7d33d64):
- historical: residents 51,317 → 52,360 (+2.0%), GDP +1.3%, readiness 0.44 → 0.51.
- aggressive: residents 48,507 → 48,887 (+0.8%), GDP +1.3%.
- default, cautious, decline_all: unchanged. They neither borrow nor run roads at once.

**Modifiers (36ebbcd):** placeholders as in `params/slice.yaml` `events.*`. Neither required run's 1983 band moved out
of range with the 1982 storm included, so no modifier was softened.

**Crew waves (69a80ce):** the core stays at 600. 200 failed the aggressive power and freight run-shape tests at every
backlog brake tried. The brake is 40,000 m² (15,000 failed the same tests).


## R9.1 (path calibration, 2026-11-25)

**Goal.** R6–R9 checked three points: end-1979, 1980-Q2 and end-1983. The claims store also holds annual values for
1980, 1981, 1982 and 1984 — population by category, nominal GDP and its sectors, budget revenue and spending,
employment (`data/evidence/claims/phase1_statistics.yaml`). This pass tests the slice's **path** against them and
audits the realism of the system numbers. Named parameters only; no mechanic changed.

**The measure.** Per year, the model's multiple over its end-1979 value divided by the claim's multiple over 1979.
1.0 means the slice grows exactly like the SEZ (population) or the city (GDP); below 1 means it lags. Levels are not
compared: the slice is a subset and no claim covers its own geography (§9). A good calibration keeps this ratio
*stable*, not equal to 1.

**The path before this pass** (`historical_prologue`, seed 1; quarter ends are January, so the 1981 row is end-1980):

| Year end | Residents | Model × | Claim × | Ratio | GDP ¥m | Model × | Claim × | Ratio | Temporary |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1979 | 30,338 | 1.000 | 1.000 | 1.00 | 8 | 1.000 | 1.000 | 1.00 | 559 |
| 1980 | 30,901 | 1.019 | 1.186 | 0.86 | 10 | 1.133 | 1.375 | 0.82 | 2,347 |
| 1981 | 35,569 | 1.172 | 1.386 | 0.85 | 17 | 1.995 | 2.524 | 0.79 | 10,191 |
| 1982 | 42,087 | 1.387 | 1.814 | 0.76 | 24 | 2.806 | 4.205 | 0.67 | 17,369 |
| 1983 | 52,360 | 1.726 | 2.327 | 0.74 | 34 | 3.988 | 6.682 | 0.60 | 27,344 |

**What was wrong.** The ratio eroded every year: the slice started at 0.86 of the claim's growth and fell to 0.74
(residents) and 0.60 (GDP). Two causes:

- **1980–81 barely grew.** Industrial demand was 6,000 m² a month with the county regime's 0.3 factor, and a firm
  needed six months of work plus a three-month ramp. End-1980 showed 1,008 factory posts and one open firm.
- **1982 had a power cliff.** The plan's 6,000 kW station finished in 1982-10; from 1981-10 to 1982-09 the pool
  share sat at 0.71–0.89, so firms posted 11–29% fewer jobs for four quarters. The 1982 column fell, then 1983
  jumped when the station came on.

**Levers kept** (now in `params/slice.yaml`):

| Lever | Before | After | Why |
|---|---|---|---|
| `growth.industrial.floor_m2_per_month` | 6,000 | 8,000 | firms start earlier, so 1981 and 1982 fill |
| `growth.industrial.firm.build_months` / `ramp_months` | 6 / 3 | 5 / 2 | a small factory rises in five months; posts arrive sooner |
| `migration.base` | 2,000 / 1,000 | 2,300 / 1,150 | the vacancies exist; 2,400 breaks the quiet-village test below, so this is the ceiling |
| `fiscal.power_import.max_kw` | 3,000 | 4,500 | the line bridges the station, removing the 1982 cliff (cost: ¥36k a month) |
| `growth.industrial.regime_factor.county_1979` | 0.3 | 0.4 | a little building before the SEZ, without erasing the regime's effect |

**The path after this pass:**

| Year end | Residents | Model × | Ratio | GDP ¥m | Model × | Ratio | Temporary | Spending ÷ revenue |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1979 | 30,338 | 1.000 | 1.00 | 8 | 1.000 | 1.00 | 566 | 1.34 |
| 1980 | 31,059 | 1.024 | 0.86 | 10 | 1.239 | 0.90 | 3,452 | 0.97 |
| 1981 | 38,307 | 1.263 | 0.91 | 21 | 2.441 | 0.97 | 13,887 | 1.29 |
| 1982 | 46,726 | 1.540 | 0.85 | 28 | 3.294 | 0.78 | 19,816 | 1.23 |
| 1983 | 55,451 | 1.828 | 0.79 | 37 | 4.428 | 0.66 | 31,085 | 1.11 |

The resident ratio now sits in a 0.79–0.91 band instead of eroding to 0.74, and the 1982 cliff is gone (0.76 → 0.85).
The temporary population is 31,085 at end-1983 (was 27,344), against the 120,000 SEZ bound.

**Levers rejected, with the reason.**

- **Migration base 2,400+.** It makes a *quiet* village add rental floor in `growth.test.ts` (migrants arrive in an
  area with no pressure, crowding rises and the village builds). The property is a start-of-game guard; 2,300 keeps
  it and still adds 3,700 temporary residents.
- **County factor 0.6.** It erased the "SEZ builds more than the county" property in `growth.test.ts` (both runs hit
  the fixture's land cap) and bought only 1.6% residents. 0.4 keeps the property.
- **`village_build.response` 0.6–0.8.** Same quiet-village failure (a 21–28 m² boundary effect of the response
  rate). 0.5 keeps the property; `village_outgrows_planned` still passes.
- **`housing.base_rent` 3.0 / `rent_elasticity` 1.5.** A more realistic rent level, but it also let the quiet village
  clear its build hurdle. Reverted; rents stay crowding-driven.
- **Industrial FAR 1.25.** +0.2 GDP multiple but it broke the per-cell floor arithmetic in `offers.test.ts` and adds
  land, not finished firms. The builders and the labour supply are the cap.
- **Higher street freight capacity** (8,000 → 12,000 t): no effect. The historical run never leaves a gateway unmet;
  the 1982 constraint was power, not the road.
- **A global works rush** (§4.6): tested and rejected earlier; every variant trips the spending band.

**Realism panel** (`historical_prologue`, end-1983):

| Number | Value | Read |
|---|---|---|
| Factory posts | 19,765 from 46 open firms | 430 jobs and ~5,125 m² of factory + dormitory each |
| Industrial power | 10,543 kW over 235,750 m² | 45 W/m², plausible for light processing |
| Employment | 95–99% of the participating labour force | a migration-fed boom town; the model has no separate unemployment series |
| Rents | ¥2.8 → 9.3 → 9.8 → 5.5 → 4.7 a m² | follows crowding; real rents were stickier (see below) |
| Village vs planned floor | +66,613 vs +65,850 m² | village rental outgrows planned housing, by 763 m²: passes, but thinly |
| Exports | ¥68m a year | a slice of the city's total; no slice claim to test against |
| 1984 balance without the grant | ¥69,728 (1.8% of revenue) | the grant cliff bites the historical run first |

**Structural notes, recorded not forced.**

- **The GDP ratio settles at 0.66, not 1.0.** The Shangbu plan's 36 cells are full at end-1983, with 46 open firms.
  Wider FAR adds land, not finished firms: construction capacity and labour set the 1983 output, and widening the
  plan trades against the 1979 and 1983 spending bands. A 0.8 ratio needs a larger plan, which is a policy change,
  not a parameter.
- **Rents follow crowding, so they fall after 1982** as the village response catches up. A rent trend with income is
  a mechanic (a spec change), not a parameter; not in this pass.
- **`aggressive` tracks less closely** (resident ratio 0.86/0.85/0.73/0.76; GDP 0.89/0.80/0.65/0.62). Its plan
  spends early on the station and the avenue and its 1982 spending ÷ revenue is 1.44. It passes the §9 bands at
  end-1983; the path is not forced, because that needs a different plan.
- **The village design check is thin.** 763 m² of margin means the next change that favours dormitories will flip
  `village_outgrows_planned`. It is kept and flagged rather than widened.
- **One test changed its measure.** The m6a fiscal check used to assert that cautious's projected 1984 balance
  exceeded aggressive's in *absolute* yuan. After R9 made the corps an arrival rather than a paid contract, and R9.1
  lifted the aggressive tax base, aggressive's balance is larger (290,220 against 200,064). The check now asserts the
  design intent, a thinner *margin* (7.2% against 8.0%), and that both stay positive.

**Goldens (end-1983, seed 1).** Against R9:

| Policy | Residents | GDP | Spending ÷ revenue | Bands |
|---|---:|---:|---:|---|
| historical_prologue | 52,360 → 55,451 | 33.6M → 37.4M | 1.07 → 1.11 | 20 pass |
| aggressive | 48,887 → 53,626 | 32.7M → 35.7M | 1.08 → 1.02 | 20 pass |
| cautious | 37,167 → 37,204 | 14.9M → 15.0M | 0.75 → 0.79 | 16 pass, 4 structural |
| default | 30,828 → 30,822 | 8.1M | 0.94 | idle |
| decline_all | 30,340 | 7.65M | 0.64 | idle |

`decline_all` moves only `params_sha256`. Every playing policy keeps its band count.

**Invariants.** `npm run check` green: determinism, population and money conserved, no negative stock, M5b's
properties, and the §9 bands unchanged (no band was widened; the pass moved parameters, not targets).

## R9.2 (tempo, electricity and the 1982 programme, 2026-11-25)

**Goal.** R9.1 matched the yearly *index* to 1983. This pass checks the **year-over-year tempo** of residents, GDP and
electricity against the claims, adds the missing electricity series so the 1979–82 consumption claim can be read as a
curve, and adds the 1982 investment programme as **content** rather than another parameter.

**The tempo, before and after** (`historical_prologue`; the claim's rate in the last column):

| Year | Residents before → after | Claim | GDP before → after | Claim |
|---|---:|---:|---:|---:|
| 1980 | 2% → **5%** | 19% | 24% → **32%** | 38% |
| 1981 | 23% → **24%** | 17% | 97% → **89%** | 84% |
| 1982 | 22% → **16%** | 31% | 35% → **40%** | 67% |
| 1983 | 19% → **32%** | 28% | 34% → **39%** | 59% |

The index ratios now sit at 0.88 / 0.94 / 0.84 / 0.85 for residents (was 0.86 / 0.91 / 0.85 / 0.79) and
0.96 / 0.99 / 0.82 / 0.74 for GDP (was 0.90 / 0.97 / 0.78 / 0.66). 1980 and 1983 are the clear gains; **1982 remains
the gap**: the model's boom is front-loaded in 1981, while the historical series accelerates through 1982.

**What changed.**

| Lever | Before | After | Why |
|---|---|---|---|
| `HISTORICAL_PLAN.zones` | 36 industrial cells | +18 in Shangbu (54) | the plan's zone was full by 1982; the later cells fill in 1982–83 |
| `power.consumption` | absent | a new series (see below) | the electricity curve was unmeasurable |
| `event.investment_programme` | absent | 1982-Q1 card: +400 crew, investor-rate modifier, a cost | capacity and investment arrive as an event, not a parameter |

**The electricity series (R9.2, §5.5).** A pure function, `electricityMonthly(s, p)`, recorded once a month as
`history.electricity` (save v8):

`hours_month × firm_load_factor × Σ(open firm's connected kW × staffed/jobs) + present × kwh_person_month + base jobs × kwh_job_month`

with `hours_month 730`, `firm_load_factor 0.35`, `kwh_person_month 8`, `kwh_job_month 60` (placeholders). The
coefficients were set so 1979 reads 0.14×10^8 kWh: the slice is 43% of the SEZ population, so its share of the
citywide 0.33×10^8 is 0.14. Result (10^8 kWh, annualised): **0.14 / 0.16 / 0.26 / 0.36 / 0.52** for 1979–83.

- 1980 is slow (+14%) for the same reason population is (the first firms open in 1980).
- 1982–83 run +40% and +44% a year, near the claim's 36–45%/yr arithmetic. The claim's **">60%/yr"** is a *demand*
  claim, not consumption; 1979→82 consumption is +45%/yr (33→100) or +34%/yr if the 41.25 alternative is read.
- **Not a band.** The 1979 figure has an open conflict (0.33 labelled supply vs 0.4125 labelled consumption,
  `phase1.shenzhen.electricity_consumption.1979`). It is reported in the checkpoint table, not averaged and not
  banded. The model's `powerKw` is connected demand and `area.utilities.powerCap` is *spare industrial capacity*, so
  neither equals consumption; the new series exists because the two could not be compared.

**The 1982 investment programme (content).** `event.investment_programme` fires in 1982-Q1 as an interrupting card.
Accepting it adds `team.investment_corps` (+400 permanent crew, §5.6), a `investor_rate` modifier (×1.2 for 12
months, `params.events.event.investment_programme`) and a ¥150,000 cost. Declining keeps the plan's own pace. The
card cites `phase1.event.construction_corps_arrival` as a `design_note`.

The effect is real but modest: 1982 GDP +36% → +40% and 1983 residents +30% → +32%. It cannot close the 1982 point,
because a firm accepted in 1982-Q1 opens in mid-1982 and ramps into 1983; a firm accepted in 1981 is what moves 1982.
Moving the event to 1981-Q4 was tested and made 1982 worse (the resources land in 1981); it stays in 1982-Q1.

**Rejected: a timed second wave.** A `later_zones` plan field was built and tested: Sungang, 16 cells from 1980-Q3.
It diverts `crew_share` servicing from Shangbu, opens its firms too late to add 1982 output, and pushes planned
dormitories past village rental (`village_outgrows_planned` fails). Enlarging the initial Shangbu zone instead adds
the same cells without a second servicing front, and keeps all 20 bands. The field was removed rather than shipped
unused.

**Rejected: an earlier station.** Moving `station_turn` 6 → 4 removes the 1982 power cliff but costs ¥1.5m in 1980
and slows the main zone (1983 residents 54,098); the station at turn 6 with the existing import line is better.

**Goldens (end-1983, seed 1).** Against R9.1:

| Policy | Residents | GDP | Spending ÷ revenue | Electricity 10^8 kWh | Bands |
|---|---:|---:|---:|---:|---|
| historical_prologue | 55,451 → 60,375 | 37.4M → 42.0M | 1.11 → 1.02 | 0.52 | 20 pass |
| aggressive | 53,626 → 53,661 | 35.7M → 35.4M | 1.02 | 0.45 | 20 pass |
| cautious | 37,204 → 37,265 | 15.0M | 0.79 | 0.13 | 16 pass, 4 structural |
| default | 30,822 | 8.1M | 0.94 | 0.13 | idle |
| decline_all | 30,340 | 7.65M | 0.64 | 0.13 | 12 pass, 8 fail (idle; it accepts the programme's first option) |

**Remaining gap.** 1982's claim (+31% residents, +67% GDP) needs firms opening through 1982 from land zoned and
serviced by 1981. With one Shangbu front that is not reachable: the second front costs more crew than it adds. The
next honest lever is a **second road-and-zone front with its own servicing share**, which is a plan-and-crew change,
not a parameter, or accepting that the slice's 1982 is flatter than the SEZ's because Shekou led that year.

**Invariants.** `npm run check` green; save v8 migrates with zeros for the new series; determinism, conservation and
the §9 bands unchanged.

## R9.3 (sector split, foreign investment, land and debt, 2026-11-25)

**New data, as leads.** Two secondary aggregator pages (聚汇数据, accessed 2026-11-25) give the city's GDP by sector
and subsector for 1979–84 and foreign capital actually used. Their GDP totals agree with the existing 2014-yearbook
claims; the sector detail and FDI await the yearbook pages. They are recorded in
`docs/research/phase1-secondary-series.md` as a lead, not as claims, and no band uses them.

**What was added (reporting only, no save change).**
- `gdpBySector(s, p)` (§5.6): primary is base farming; secondary is the firms' factory value added plus base factory
  and construction jobs plus the construction residual (recorded GDP less firms and base); tertiary is state,
  services and service posts. Pure, from state and params.
- `YearPoint` gains `gdpSector`, `foreignValueAddedShare`, `foreignCapitalUsdYear` (a proxy: the construction cost of
  foreign firms accepted in the year), `landRevenueYear`, `landShare` and `debtToRevenue`.

**The comparison** (`historical_prologue`, 1983; city shares from the lead):

| | Primary | Secondary | Tertiary |
|---|---:|---:|---:|
| City 1979 → 1983 | 37% → 17% | 20% → 43% | 43% → 40% |
| Slice 1979 → 1983 | 18% → 4% | 33% → 76% | 48% → 20% |

- **The slice is an industrial core, not the city.** Its primary is small because the seven areas hold little
  farmland; its secondary share grows to 76% because firm value added dominates and service jobs are induced from
  spending only. The claim's construction share (25% of 1983 GDP) is not reproduced: the model's construction is a
  small residual.
- **A rebalance was tested and reverted.** Raising `gdp.base_va_per_job_month.services`/`state` to 55 and the
  `hk_processing` value-added ratio to 0.18 moved the split only to 5 / 69 / 27. It also raised the 1979 base, cut
  the GDP multiple from 4.87 to 4.19 and left aggressive at 3.52, near the band floor. A ratio cannot close the gap:
  the service sector needs a size model (producer services, government employment), not a parameter.
- **FDI is not modelled.** The proxy reads 0.45 / 4.95 / 8.55 / 5.85 / 7.65 US$m against the claim's 5 / 28 / 86 /
  58 / 113 US$m: an order of magnitude low because equipment and working capital are absent. It is a
  direction-of-travel indicator, not a target.
- **Land and debt.** `landShare` (land ÷ recurring revenue + land) reads 0 / 0 / 0 / 46% / 57%; `debtToRevenue`
  0.88 / 0.86 / 0.67 / 0.45 / 0.31. The 1983 land share is high but plausible for a land-financed infrastructure
  push; 1979's debt ratio is the ¥3m project loan against a small base.

**Goldens.** The reporting fields change every year point; the headline numbers do not. `historical_prologue`
60,375 residents and 42.0M GDP, `aggressive` 53,661 and 35.4M, both 20 pass. No band widened.

**Invariants.** `npm run check` green; no save version change (the fields are derived, never stored).

## R10 (Pass 4: composition and the revenue base, 2026-11-25)

**Targets, not bands** (revision plan §4b.2 item 6). The 1987 Statistical Bureau compilation
(`docs/research/phase1-statistics-1979-1985.md`, claims in `phase1_statistics.yaml`) is all `lead`, so none of this
is a §9 band. Each pass reports the historical run (seed 1) against:

| Target | Evidence (lead) | Tolerance |
|---|---|---|
| Sector split 1981–83, annual | SEZ 7 / 49 / 44 (1981), 5 / 51 / 44 (1982), 5 / 50 / 45 (1983) | tertiary 35–55%, secondary 40–60% |
| Customs share of budget revenue | 39% (1979), 53%, 71% ⚠, 39%, 39% (1983) | 25–60% by 1983 |
| GDP level, end-1983 | today's ¥42.17M (historical), ¥35.42M (aggressive) | ±15% |

The split is read from `gdpSectorYear` (the trailing 12 months of `history.gdpSector`), not December's month.

### R10a: reporting and save version 9 (no golden value moves)

- **Construction** is now a line under secondary: base construction jobs plus the month's work × 0.35. It is not a
  small residual: 17% of 1979 GDP, 26–32% in 1980–82 and 18% in 1983 (the claim: 25% of 1983 GDP). R9.3's "small
  residual" read the December month only.
- **The baseline split (annual, historical):** 19 / 31 / 50 (1979), 15 / 47 / 39 (1980), 8 / 70 / 23 (1981),
  5 / 76 / 18 (1982), 4 / 79 / 18 (1983). Aggressive: 19 / 30 / 51 → 5 / 79 / 16. **The start is near the evidence**
  (1979 tertiary 50% against the city's 42.5% and the SEZ's 50% in 1980); the gap opens in 1981, when organic
  factories arrive and services grow only with wages.
- **Population categories** (present, non-overlapping), historical end-1983: registered 30,000, temporary 32,329
  (construction 1,735, factory 30,574, other 20). The SEZ's 1983 ratio is 16.5万 registered : 12万 temporary; the
  slice's registered stock does not grow (no transfers in), which is outside R10.
- **Goldens:** every pre-existing value is identical (checked by stripping the new fields and comparing with the
  R9.3 files); the new fields are `gdpSector.construction`, `gdpSectorYear`, `population` and
  `checkpoints[].population.categories`. No content hash moved.

### R10b: the start's composition, local collectives and workshop-sized firms

| Attempt | Change | Historical 1983 GDP · split | Aggressive 1983 GDP · split | Bands |
|---|---|---|---|---|
| 0 | R10a | ¥42.17M · 4 / 79 / 18 | ¥35.42M · 5 / 79 / 16 | 20 + 20 |
| 1 | collectives (1,500 m²/month, 60 jobs) only | ¥41.59M · 4 / 79 / 17 | ¥33.79M · 5 / 78 / 17 | 20 + 20 |
| 2 | + processing firm 120 jobs, floor 5,500, backlog 12,000, spend per service job 35 | ¥36.58M · 5 / 73 / 23 | ¥29.38M · 6 / 73 / 22 | 20 + 18: aggressive GDP multiple 3.333 < 3.341, spending ÷ revenue 1.2047 > 1.204 |
| 3 | floor 7,000, spend 25 | ¥35.96M · 5 / 69 / 26 | ¥30.82M · 5 / 72 / 23 | 20 + 19: aggressive spending ÷ revenue 1.2097 |
| 4 | processing backlog back to 40,000, floor 6,500 | ¥43.95M · 4 / 75 / 22 | ¥38.89M · 4 / 76 / 20 | 20 + 20 |
| 5 | base services and state value added 50 a job-month, floor 6,000 | ¥45.85M · 4 / 71 / 25 | ¥40.56M · 4 / 73 / 23 | 20 + 20; aggressive +14.5% |
| 6 | floor 5,000 / **4,500** / 4,000 | ¥44.51M / **¥42.64M** / ¥40.20M | ¥39.45M / **¥38.27M** / ¥37.08M | 20 + 20 each |

- **Kept: attempt 6 at 4,500 m² a month.** Historical +1.1%, aggressive +8.0%, both inside ±15%.
- **The backlog brake counts floor.** At 12,000 m² it throttled the small firms (1983 firm jobs 17,400 against
  19,900), so it stays at 40,000 m² for processing: the same pipeline of floor, four times as many firms.
- **The split (annual, historical):** 17 / 30 / 53 (1979), 13 / 43 / 43 (1980), 8 / 63 / 30 (1981),
  5 / 68 / 26 (1982), 4 / 69 / 27 (1983). Against the SEZ's 5 / 50 / 45, tertiary 1981–83 is still about 15 points
  short. That gap is R10c's (trade); R10b's levers are the induced services and the start's value added.
- **The firms (historical, end-1983):** 164 organic processing firms of 120 jobs (17,160 posted), 50 collectives of
  60 (2,940 posted), 7 card firms. Collectives are 13% of firm jobs.
- **The binding band is spending ÷ revenue.** Smaller firms pay less tax: historical 1.02 → 1.13 against 1.204,
  aggressive 1.08. Customs (R10c) is new revenue.
- **The aggressive run's projected 1984 balance turned negative** (−¥102,000), as `band.1983q4.grant_test`'s note
  expects; m6a's test now asks only that cautious stays positive with the thicker margin.
- **Goldens (end-1983):** historical 60,375 → 63,252 residents, ¥42.17M → ¥42.64M; aggressive 53,661 → 56,778,
  ¥35.42M → ¥38.27M; cautious 37,265 → 39,904, ¥15.14M → ¥17.16M; default 30,822 → 30,917, ¥8.13M → ¥8.88M;
  decline_all 30,340, ¥7.65M → ¥8.33M. The idle runs' GDP rises 9% from the start's base value added alone.
### R10c: trading firms, customs and forex

| Attempt | Change | Historical 1983 GDP · split · customs share | Aggressive 1983 GDP · split · customs share | Bands |
|---|---|---|---|---|
| 0 | R10b | ¥42.64M · 4 / 69 / 27 · 0% | ¥38.27M · 4 / 71 / 24 · 0% | 20 + 20 |
| 1 | trading stream (1,500 m²/month, 40 jobs, turnover 800, VA 0.2, imports 0.5), customs 0.02 / 0.25 × local 0.5, a Luohu commercial block | ¥44.84M · 4 / 69 / 27 · 5% | ¥38.39M · 4 / 71 / 24 · 5% | 20 + 20 |
| 2 | fix: a services firm opens when its shop floor is complete (attempt 1's trading firms never opened) | ¥45.76M · 4 / 68 / 29 · 11% | unchanged | 20 + 20 |
| 3 | historical plan: on equal room, the zone with fewest cells left is serviced first | ¥37.48M · 4 / 55 / 41 · 22% | (then global: ¥37.83M · 4 / 62 / 34) | 20 + 20 |
| 4 | trading floor 2,500 m²/month | ¥38.23M · 4 / 55 / 40 · 22%; quota down to $0.4M | | 20 + 20 |
| 5 | **VA 0.25, import share 0.35, import duty 0.35** | **¥41.25M · 4 / 51 / 45 · 28%** | **¥38.39M · 4 / 71 / 24 · 5%** | 20 + 20 |

- **Kept: attempt 5.** Historical −3.3% against R10b, aggressive +0.3%. Historical spending ÷ revenue 0.846 (floor
  0.722), aggressive 1.024.
- **The binding constraint was servicing, not demand.** The plan services one zone at a time, least room first, ties
  by id: the template zone (id 1) won every tie at zero room, so the new commercial zones waited until 1983. The
  historical plan now breaks the tie by cells left (`small_zones_first`), so Luohu's 6 cells are serviced in 1981
  and the rest of Shangbu after. That delay is what shrinks industry in the same pass (firm jobs 1983 18,940 →
  17,420; exports ¥92M → ¥68M): no industry parameter moved. Made global, it also delayed the aggressive plan's
  Sungang zone and R8d's freight limit stopped binding by 1982 (a test), so the aggressive plan keeps its
  industry-first order: its 1983 tertiary stays 24%, a policy outcome, not a target.
- **Forex binds trade.** At import share 0.5 the trading firms ran the quota down to $0.4M by end-1983 and their
  turnover was capped; at 0.35 it ends at $1.2M (R10b: $10.5M unspent). The plans now check the quota before
  placing a structure: trade imports had left a substation's $10,000 uncovered, and the order threw.
- **The split (annual, historical):** 17 / 30 / 53 (1979), 13 / 43 / 43 (1980), 7 / 61 / 32 (1981),
  5 / 59 / 36 (1982), 4 / 51 / 45 (1983). **1983 meets the target; 1981–82 miss it** (tertiary 32% and 36%
  against 44%): Luohu is serviced in 1981 and its firms ramp through 1982. Customs is 3% / 13% / 28% of revenue in
  1981–83 (target 25–60% by 1983: met at the low end). 1979–80 customs is zero (the border trade is inside the
  county base, a stated gap).
- **Goldens (end-1983):** historical 63,252 → 58,792 residents, ¥42.64M → ¥41.25M, split 4/69/27 → 4/51/45, revenue
  ¥4.33M → ¥5.79M; aggressive 56,778 → 57,266, ¥38.27M → ¥38.39M, revenue ¥4.05M → ¥4.28M (customs on inputs and
  a late trading block); cautious revenue ¥3.23M → ¥3.32M (customs on processing inputs), GDP and residents
  unchanged; default and decline_all unchanged.

### R10d: the import quota

- **The gate.** `tools.import_quota` is unlocked by `news.1982q1.concession_material` (1982-02), which already reports
  the January 1982 notice against smuggling. No claim describes an import quota rule, so no card text was written:
  the gate's date is a design_note.
- **First numbers** (demand ×0.6/1/1.4, forex share 0.2/0.5/1, scrutiny 0/0/1.5) had no bite: from the historical
  run's 1982-Q2 state, all three settings gave the same 21 months (land and the quota did not bind). R10d adds a
  turnover factor on importers (0.6 / 1 / 1.5).
- **The counterfactual** (historical run's 1982-Q2 state, 21 months with no further plan, seed 5):

  | Setting | GDP, last year | Tertiary | Customs | Trade imports | Quota at the end |
  |---|---|---|---|---|---|
  | strict | ¥27.91M | 39.6% | ¥469,424 | $1.34M | $6.07M |
  | balanced | ¥28.86M | 41.6% | ¥680,472 | $2.23M | $4.64M |
  | open | ¥30.06M | 43.9% | ¥944,279 | $3.35M | $2.84M |

  Retention still outruns imports in that continuation, so the quota rises and open draws no scrutiny there; with
  retention off it does (a test).
- **Golden runs.** Historical keeps balanced: no value moves (the 0.5 share never binds; monthly imports are about a
  tenth of the quota). Aggressive sets open from 1982-02, but its Luohu block is serviced last and no trading firm
  opens before the visit (forex burned $0). The higher trading demand shifts the crew pool in late 1983: factory floor
  built by the visit +1,800 m² (233,350 → 235,150), GDP ¥38,394,515 → ¥38,396,440. Cautious, default and decline_all:
  only the new verdict field.
- **The verdict's forex** (historical): $8.54M burned on trade imports, $9.80M earned by retention, $1.24M left.
- **Not done: customs in the fiscal test.** Counting customs as recurring revenue turns the aggressive run's 1984
  balance from −¥107,748 to +¥176,388 (historical −¥1,548 → +¥2.03M), against `band.1983q4.grant_test`'s note that
  aggressive should end negative. It was reverted; the note needs a decision first.
