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
