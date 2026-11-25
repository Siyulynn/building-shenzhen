# Phase 1 revision: three passes (R7–R9) / 第一阶段修订：三个批次

Status: **draft, decisions recorded 2026-11-24 (§7).** Nothing here is implemented yet.
Scope: the playable slice only (`docs/design/systems/phase1-slice.md`). No 3D, no archival tooling, no building
serializer. Nothing is pushed.

The M6b calibration, the §5.10 findings and the goldens are the baseline this plan starts from. A pass is done when
`npm run check` is green, its goldens are regenerated with the movement explained, and its slice of the spec is
updated **before** the code that depends on it.

---

## 0. What is wrong now, in one line each

| Symptom | Where it hurts |
|---|---|
| "Servicing" means both 三通一平 and the service industry | the tool rail, the inspector, the briefing, every hint |
| Turn 1 shows ¥0 GDP and no decision | the first screen teaches nothing |
| The opening card fires in step 2 of the first tick, so it surfaces on Turn 2 | §5.8 prologue |
| Cards have names but no description and no effect summary | the player cannot judge an option |
| Chips are unlabelled number pairs; no committed-this-turn spend; no projected funds | §11.2 first level |
| A road drag that starts on an existing road throws | road tool, every time |
| `public` is a land use with no mechanic behind it | §5.3, `zones.ts`, the tool rail |
| Land is a boolean. Farmland, fishpond, village and hillside cost the same to service | §5.5, `m3b_buildable.py` |
| Water and power are per-cell sources; water has no role beyond a share | §5.5, `works.ts` |
| Road tiers would differ only in price | §5.6/§5.7, road tool |
| The prologue still commits M4 area-dropdown projects | `events.yaml`, §2.1 |

---

## 1. The vocabulary decision (pass 1, but it is a spec decision)

**现状 / now:** 三通一平 is rendered "Servicing", the same word the HUD uses for the service sector. That is the root
of most of the confusion in playtests.

**决定 / decision:** the player-facing English term becomes **"Site formation"**. 三通一平 stays the Chinese term.

- 三通一平 (literally "three connections, one levelling") = water, electricity and road connection at the plot edge,
  plus levelling. **The hint must say that water and power connections are already included** — the player is not
  buying them again by placing a substation.
- The **process** is site formation; the **outcome** is *formed land* (土地平整完成). The current "serviced land" in
  the readiness bar becomes "formed land".
- Internal identifiers (`servicedLand`, `stage: 'servicing' | 'serviced'`, `commit_works{kind:'service'}`) are **not**
  renamed in this revision. They are recorded in the spec as legacy internal keys with a one-line note. A mechanical
  rename touches ~40 files and every golden; it buys the player nothing. It can happen in any later cleanup.
- The service *sector* keeps "Services"; the `service` works order becomes **"Site formation order"** in the UI and
  the `Service` tool becomes **"Form site"**.

Spec edit: §4 action table, §5.5, §11.2 tool rail and inspector, §13 vocabulary note.

---

## 2. Pass 1 — Clarity (R7)

**Goal:** a new player can read Turn 1, answer a decision, and understand what a chip means, without reading a doc.
**No mechanics.** One exception, item 1.4, which moves goldens and is called out.

### 1.1 Terms and hints
- `apps/slice-ui/src/strings.ts`: Site formation / 三通一平; Form site / 平整土地; formed land / 已平整土地;
  formation order; the stage names `planned / forming / formed`.
- The Site formation hint reads, in both languages: *"Clearing, levelling, internal lanes, and the water and power
  connection at the plot edge. Already included — you do not build these separately."*
- Inspector "Held back by" rungs 3, 5, 6 and 7 restated in the new vocabulary.

### 1.2 Road drags that start on a road
`packages/sim-core/src/orders.ts` `buildRoad`:
- Strip every already-built cell (roads or cells in a queued path) anywhere along the drag, not only the prefix,
  instead of throwing, then validate what is left. Today's error at line ~209 fires on the first cell, so *every*
  drag from an existing road fails, and so does any drag that crosses one.
- What is left may be several segments. Each segment must touch the network (or a queued path) at one end.
- Throw **"that drag adds no new road"** only when nothing is left.
- Test: drag that begins on a road and extends it; drag that crosses an existing road; drag entirely along a road;
  drag that touches a structure; drag whose only new cell is not adjacent to the network.

### 1.3 Cards that can be judged
- `content/slice/events.yaml`: every card gains `description: { zh, en }` — two sentences, what happened and why it
  matters, no numbers that belong to params.
- Option effect badges are **derived**, not authored: a pure `effectBadges(event, params, state)` in `views.ts` turns
  `effects` / `on_answer` into short `{zh,en}` strings (`Cost ¥1.2M`, `Unlocks investment`, `Readiness +`, `No
  effect`). Derived, so a badge cannot lie about the effects. Where a number comes from params it is read from params.
- `render.ts` card layout: title, description, then options each with name + badges. Badges wrap, no colour-only
  distinction.
- Test: every card in `events.yaml` has a non-empty `{zh,en}` description; every option yields at least one badge;
  `lang.test.ts` covers both languages.

### 1.4 Turn 1 tells the truth
Two changes, deliberately separate commits:
- **GDP (no golden movement).** Extract the baseline-GDP expression in `systems/statistics.ts` (lines ~54–64) into
  `gdpNow(state, params)`. `statistics` calls it for the series; the briefing, the chip and `summary` call it when
  `history.gdp` has no entry yet. Turn 1 then shows the starting economy's monthly output instead of ¥0, and the
  monthly series is untouched.
- **Opening decision (moves goldens).** Turn-0 scripted beats (`prologue_turn: 0`, i.e. `event.first_project`) are
  evaluated as part of `initialState`, not in the first tick's event step. They land in `events.fired` dated
  `1979-01`, so the card is pending before the player's first action. Deterministic: init has no RNG.
  - Golden effect: the opening card is answered at 1979-01 instead of 1979-04. `historical_prologue` and
    `aggressive` take `project.road_link`, whose obligations now start a quarter earlier; `default`, `cautious` and
    `decline_all` take their usual options. Expect small resident moves and a `params_sha256`-only change on the idle
    policies. **Regenerate and write the delta in the commit message; if a policy moves more than ±2% residents,
    stop and report before continuing.**
  - Test: `initialState` has exactly one pending interrupting card; the first `step` does not re-fire it.
  - R9 rewrites this card's options (map instructions instead of M4 projects), so the goldens move again there. That
    second move is expected, not a regression.

### 1.5 Chips and money you can see
- Every chip gets a visible label above its two numbers (Building / Budget / Population / Industry / Land), not just
  an icon and a hover.
- Budget chip second stat becomes **committed this turn · projected funds after commitments**: the sum of live orders'
  `budget − spent` plus obligations already due this quarter, and `moneyForProjects()` less that commitment. Both from
  existing exports; no new sim fields.
- Building chip gains the same committed figure on its first stat pair, since that is where the queue lives.
- Test: chips read the same numbers as the drawer at the same state; a queued order immediately lowers projected funds.

### 1.6 Park the things that are not real yet
- Hide `public` from the zones flyout (the enum removal is Pass 2, item 2.2) and say why on hover: *"Public buildings
  are placed directly; there is no public zone."*
- **Not** the water tool. `utilityShare` takes the lower of power and water, so water still limits firms until R8c;
  hiding its tool now would leave a block the player cannot fix. Water's tool and its constraint leave together in
  R8c.

**Done when:** `npm run check` green; the five golden runs regenerated with §1.4's delta explained; a playthrough of
Turn 1–3 shows a labelled chip strip, a described card with badges, and an extended road.

**Commits:** `terms: site formation` · `roads: strip built prefix` · `cards: descriptions and effect badges` ·
`gdp: current month from gdpNow` · `prologue: turn-0 beats fire at init` · `chips: labels and commitments`.

---

## 3. Pass 2 — Ground truth and networks (R8)

The biggest pass. Five commits (R8a–R8e), each independently green, landing in the order a, c, d, b, e (R8b's
`high` tier needs R8d's avenues). Spec first, in this order: §5.3 (land uses),
§5.5 (land cover, utilities), §5.6 (roads), §11.1 (layers), §5.1 (migration).

### 3.1 R8a — The land-cover layer

**What it is.** One integer class per 100 m cell over the seven playable areas, derived by a documented rule, shipped
as data with its caveats. It replaces the boolean `buildable` layer and becomes the input to site formation cost,
buildability and compensation.

**Sources — and what each can honestly do.**

| Source | Status | Use |
|---|---|---|
| Landsat 3 MSS, 1979-10-19 (`data/raw/sources/landsat_1979_10_19`) | georeferenced to the grid by `m1b_landsat_1979.py`; 60 m, RMSE ~27 m | spectral class: NDVI, brightness |
| KH-9, 1980-09-11, A048/F048 (`m1c_kh9_georef.py`, `m1c_kh9_mosaic.py`) | georeferenced, ~7.5 m, mosaic written to `apps/map-spike/public/grid/kh9_1980.png` (git-ignored) | built-up / village texture, pond outlines, sample audit |
| Spike A DEM + water grid (`grid.bin`) | present-day | slope, elevation, present water |
| `water1979.bin`, `coast_change.bin` (`m1b`, `m1c`) | automatic thresholds, `lead` | 1979 water; inland water in 1979 that is land now = fishponds/reservoir |
| `sites_1979.yaml` village and farmland points | `lead`, proxy OSM points | anchors for village/farmland class assignment |
| `data/Shenzhenxu/` 1977 street sheet, 1977 Bao'an county map, 1960s–80s keyholes | **ungeoreferenced, `reference_only`** | **not** rasterised into the grid; used for (a) place-name and feature confirmation and (b) a manual audit of ~40 sampled cells |

The last row matters: the 1977 street sheet cannot be resampled onto the grid, so it cannot drive the classification.
Pretending otherwise would dress an ungeoreferenced scan as a data source. The honest split is: **rasters classify,
paper maps audit and label.**

**Eight classes (decided).** Only classes the sources can actually separate. One October MSS scene cannot tell paddy
from dry field or orchard (19 October is around the late-rice harvest, so paddy reads either way), so those merge into
`lowland_farm`, and scrub and orchard merge into `upland`. `bare` is dropped.

**Rule** (`pipeline/m3c_landcover.py`, writes `data/starts/slice_landcover.json`), first match wins:

1. `water` — DEM water, or `water1979 == 1`.
2. `tidal_flat` — `coast_change == 2` within two cells of 1979 water, or elevation < 3 m within two cells of the sea.
3. `pond` — `coast_change == 3` (inland water in 1979, land now).
4. `hill` — slope > 15% (from `m3b_buildable.py`'s slope function).
5. `village` — within a radius of a `kind: village` site point **and** built texture on KH-9 1980.
6. `town` — within a radius of a `kind: town`, `state_unit` or `railway` point **and** built texture on KH-9 1980.
7. `upland` — 6% < slope ≤ 15%.
8. `lowland_farm` — everything else (slope ≤ 6%, not built).

Thresholds (KH-9 texture, radii) are **fixed numbers set once from the audit sample**, not quantiles per area:
quantiles would put a fixed share of every area into each class whatever is on the ground. The layer is
`placeholder: true` and every class carries `evidence_status: lead`; the rule cites `phase1.map.landsat_1979`,
`phase1.map.kh9_1980` and `phase1.map.shenzhenxu_refs` as `design_note`. No claim is promoted to `sourced` on the
strength of this derivation.

**Audit.** About 70 stratified cells (about 10 per class where the class has that many), read against KH-9 1980 and the
1977 street sheet crop, written as a confusion table in `docs/research/phase1-landcover.md`. Weight the sample towards
the borders that change cost: `lowland_farm`/`pond`, `upland`/`hill`, `village`/`lowland_farm`. A class below 70%
agreement has its threshold reset and the rule re-run. The table is the number a reviewer reads; without it the layer
is a guess.

**Effects (params under `growth.land_cover`, all placeholders).** Costs are multiples of R6's formation cost per cell
(`works` service budget, ¥30,000 at R6); compensation is a multiple of the same base, so the two stay in proportion when
formation is re-tuned.

| Class | Formable | Formation cost × | Compensation × base | Note |
|---|---|---|---|---|
| water | no | — | — | river, sea, reservoir |
| tidal_flat | no | — | — | reclamation is a later phase, card only |
| hill | no | — | — | terracing is not modelled |
| village | **no** | — | — | the village stays; see below |
| upland | yes | 1.6 | 0.5 | cut and fill; scrub, orchards, lychee and bamboo |
| lowland_farm | yes | 1.2 | 2.0 | villagers' fields; drain first |
| pond | yes | 1.8 | 2.5 | fishponds; fill and drain |
| town | yes | 1.2 | 3.0 | town fringe; existing users move |

**Villages are not formable (decided).** Development wraps around them and their `village_rental` floor keeps growing,
which is what §9's `village_outgrows_planned` check measures and how urban villages (城中村) begin. Zoning a village
cell stays legal (like other unbuildable land, §5.3) and adds no capacity; the inspector names the reason. The
historical pattern (collective house plots kept while farmland was requisitioned) needs a claim at `lead` before any
card or hint states it.

**Compensation (decided): a one-off obligation**, not a new income flow. The ledger already pays obligations from
`general`, money stays conserved, and the player sees it in the Budget drawer as 征地补偿 / land compensation.
- Posted once on `commit_works`, for the cells committed, due the next month.
- Committed cells join a sorted `requisitioned` cell list in state. Cancelling refunds nothing (the land stays
  requisitioned); recommitting a requisitioned cell does not pay again.
- Scale guard: a 12-cell `lowland_farm` zone owes 12 × 2.0 × base. At R6's base that is ¥720,000, about four months
  of county revenue; R6's fiscal bands must still pass with the historical plan's zones.
- Household income effects are explicitly out of scope; say so in the spec rather than half-modelling them.

**Code.**
- `packages/sim-core/src/landcover.ts` (new): `LandCover` loaded from content, `landCoverAt(cell)`,
  `formationCost(cell)`, `compensation(cell)`, `buildable(cell)`.
- Zoning unformable land stays legal (§5.3, as with today's unbuildable cells): it adds no capacity, and the
  inspector names the class as the ladder's rung 1 reason. Only `commit_works` refuses it.
- `orders.ts` `commitWorks`: `workPerCell` and `budget` come from the cell class, and committing compensation posts
  the obligation once per cell. A zone spanning two classes gets a mixed cost — the preview shows the total and the
  split.
- `growth.ts`: `developableCells` reads the layer; `m3b_buildable.py` is kept for reference and marked superseded in
  its docstring. `data/starts/slice_buildable.json` stays until the layer is proven, then is deleted in its own
  commit.
- `app.config`/content load: `landcover_sha256` joins the save header, like `buildable_sha256`.
- Overlay: `Land cover` in the overlay switcher, one colour per class, with a legend in the drawer.
- Tests: every playable area's classes partition its cells (no gaps, no overlaps); a pond cell costs more than a
  `lowland_farm` cell; an unformable class (including `village`) refuses `commit_works` with a named reason and
  adds no capacity; compensation is posted once, only on commit, and never again after a cancel and recommit;
  save/load preserves the layer hash and the `requisitioned` list; determinism of the classifier on a fixture grid.

### 3.2 R8b — Zones: drop `public`, add an intensity tier

**Drop `public`.** `LAND_USES` becomes `industrial | residential | commercial | reserve`. Facilities stay direct
placement (`place_structure{kind:'facility'}`), which is what they already are. Migration maps any `public` zone to
`reserve` (there are none in the starts) and drops the floor-type union member. Spec §5.3, §4 table, §11.2 rail.

**Intensity tier (decided: "tiered zones" means intensity, for this slice).** `Zone.intensity: 'low' | 'standard' |
'high'`, default `standard`. No tier may be the best choice on every count, so each pays for its floor differently
(all placeholders, under `growth.intensity`):

| Tier | FAR × | Formation cost × | Formation work × | Firm power × | Requires |
|---|---|---|---|---|---|
| low | 0.6 | 0.5 | 0.5 | 0.8 | any road, a `track` is enough |
| standard | 1.0 | 1.0 | 1.0 | 1.0 | a `street` or better touches the zone |
| high | 1.8 | 1.6 | 1.5 | 1.3 | an `avenue` touches the zone |

Low is the cheap, fast, early option; high gives the most floor per cell but costs more per m², takes longer to form
and draws more power per job, so overbuilding it is how a player runs past the power pool (R8c).

- `zoneRoomM2` multiplies `G.far[use]` by the tier; site formation multiplies cost and work by the tier's factors;
  a firm's `powerKw` in a zone multiplies by the tier's power factor.
- Test: per m² of floor, no tier is cheapest in money, work and power at once.
- R8b depends on R8d's road classes, so R8d lands first (commit order below).
- **Later, not now:** differentiate zones by firm and product type (what a zone attracts, not only how dense it is).
  Recorded as an open design question for after Phase 1's slice; intensity is the only tier in R8.
- `high` is checked at `create_zone` and at `commit_works`, with a named reason when no avenue reaches the zone.
- Tier is per zone, chosen in the zones flyout after the use. Migration: every existing zone → `standard`.
- Unlock: `intensity.high` key, set by the SEZ beat in Pass 3. Until then the tier exists in state and content but
  the tool offers only low and standard.
- Tests: FAR moves the room, not the demand; a high zone without an avenue is refused; migration fills `standard`;
  a high zone on the same land serviced the same way yields more floor.

### 3.3 R8c — Power: one city pool, local substations

**What changes.** Water leaves the active constraint set for this phase. Power becomes a city-level pool distributed
through substations. No cell-by-cell wire grid, ever, in Phase 1.

**Power must bind (decided).** R6 found power never binding: floor, ramp and crews capped firms first, and bought power
raised no posts. In the new design the 1979 supply is meagre, new major plant takes years, and the early years run
mostly on purchased power. A player who overbuilds intense industry runs past the pool and sees firms post fewer jobs.

- `ACTIVE_UTILITIES = ['power']` in `works.ts`. `Utility` keeps `'water'` so the schema and any future phase stay
  honest; `placedSupply`, `prospectiveShare`, `utilityShare`, the I/C/R headroom and the inspector all read
  `ACTIVE_UTILITIES`. The water tools and actions come off the rail here, together with water's constraint (R7 leaves
  them in place).
- **Supply** comes from three sources:
  - *Inherited local plant:* `Σ area.utilities.powerCap`, set meagre in `start_1979.yaml` (a placeholder, cited as
    `design_note` next to `phase1_power_supply.yaml`'s leads).
  - *Purchased power:* `state.power.importedKw`. `buy_power` loses its `area` argument and adds to `importedKw` after a
    short lead time (`fiscal.power_import.lead_months`, a quarter or two), posting a permanent monthly obligation at
    `yuan_per_kw_month`. A ceiling, `fiscal.power_import.max_kw` (the line's limit), stops purchase from being an
    unlimited tap; raising it is a works or card decision, not a click.
  - *Major power stations:* a new works kind, `power_station`, placed as a structure and built as a works order whose
    work total takes **years** (`works.power_station.build_months`, placeholder 24–36), with crews and a budget like
    any order. It adds its full capacity only when finished. This is what replaces the one-quarter `power_source`.
  - City capacity = local + purchased + finished stations.
- **Calibration target:** power binds in `aggressive` by a named checkpoint (the 1981 or 1982 report), and the
  historical plan buys power in the early years and finishes a station within the slice. §5.10's R6 finding is
  replaced, with the before and after in the tuning log.
- **Distribution.** `power_substation` replaces `power_source` as the placeable. It sits on a road-attached cell with
  a `capacity` in kW and serves cells via the existing `allocateUtility` road allocation. A cell's power share is
  `min(1, substation share, city share)` where the city share is the pool allocated across areas in `AREA_ORDER`, pro
  rata to open-firm demand.
- **Demand** is unchanged from `placedSupply`'s firm demand; only the derivation of supply changes.
- `power_source` stays in `STRUCTURE_KINDS` for old saves but is not offered; migration converts a placed
  `power_source` to `power_substation` with the same capacity and cell.
- **Visible.** A `Power` overlay (substation reach and share) and a Power chip stat: pool kW · spare kW · unmet areas.
  The industrial headroom bar reads power only.
- Tests: a substation raises shares in its reach and not outside; the city pool caps the sum of substations (a second
  substation with an exhausted pool changes nothing); `buy_power` raises the cap after its lead time, posts one
  obligation and refuses past `max_kw`; a power station adds nothing until its order completes; no source means zero
  share and no organic firms; high-intensity firms draw more kW than standard ones; water never blocks a firm.

### 3.4 R8d — Road tiers and the gateway bottleneck

**The question.** Do simple roads and municipal avenues need a capacity mechanism, or is a price difference enough?

**Recommendation: yes, one bottleneck — freight through the two gateways — and no general traffic sim.**
Reasoning:
1. With cost alone, the tier is a pure money tax. The player's optimal move is always "cheapest road that connects",
   which is what the current single class already does. A tier that cannot be the *wrong* choice is not a decision.
2. Throughput is the right shape of constraint for this place: goods to Hong Kong by rail through Lo Wu and by lorry
   through 文锦渡 / Wenjindu, and supplies from the mainland arriving at Shenzhen station. **The capacities are a design
   setting (decided), not a historical quantity:** logistics capacity is hard to quantify from the sources, so every
   gateway number is a placeholder cited as `design_note`, and no hint or card states a historical volume.
3. It is cheap to compute: a widest-path (maximin) search over ≤ 7,000 road cells per gateway per month is
   microseconds, deterministic, and testable. It adds no new spatial machinery — `roadNetwork` already exists.
4. It stays bounded because it gates **three flows only**: exports, imported firm inputs, and construction materials
   from the mainland. Crews, deliveries to shops, commuting and housing are untouched. Nothing else queues.

**Mechanics.**
- `RoadClass = 'track' | 'street' | 'avenue'`, per cell. `build_road` gains `class?` (default `street`); the road
  flyout offers a tier before the drag. Costs, units and capacity come from `params.works.roads.classes`.
- State: one sorted cell list (or run array, like `servicedLand`) per class, migrated from today's `s.roads`
  (`number[]`) = all `street`.
  `spatialViews` reads the union for reach and the class map for capacity.
- `content/slice/gateways.yaml`. Each gateway names its site (its cell comes from `slice_site_cells.json`, never a
  hand-typed coordinate), the side it faces, and a capacity per direction:
  ```yaml
  - id: gateway.luohu
    site: site.luohu_crossing
    faces: hong_kong
    mode: rail
    capacity_t_month: { out: 90000, in: 30000 }   # placeholder, design_note
  - id: gateway.wenjindu
    site: site.wenjindu_crossing
    faces: hong_kong
    mode: road
    capacity_t_month: { out: 12000, in: 6000 }    # placeholder: a narrow road crossing
  - id: gateway.shenzhen_station
    site: site.shenzhen_station
    faces: mainland
    mode: rail
    capacity_t_month: { in: 40000, out: 10000 }   # placeholder: supplies from the mainland arrive here
  - id: gateway.guangshen_road
    site: site.guangshen_road                     # the road's northern edge cell
    faces: mainland
    mode: road
    capacity_t_month: { in: 15000, out: 5000 }    # placeholder
  ```
  Each cites its site's claims plus `phase1.transport.*` as `design_note`.
- **Three flows**, all derived from what the sim already computes, never authored per firm:
  - *Exports* (out, to Hong Kong): a firm's monthly exports × `freight.t_per_yuan[archetype]`, by the archetype's
    `freight.mode` (processing by rail, fresh food and light goods by road).
  - *Firm inputs* (in): exports × `freight.input_ratio[archetype]`, split between Hong Kong and the mainland by
    `freight.input_from`.
  - *Construction materials* (in, from the mainland): crew units at work in an area × `freight.t_per_crew_month`,
    through the mainland gateways. This is what makes **the station a bottleneck for building**, not only for
    industry.
  - Archetypes with no `freight` block (start firms, services, shops) need no gateway.
- **Computed per area, not per firm.** Each month, for each (area, gateway) pair, one widest-path (maximin) search on
  the road network: nodes are road cells, a node's weight is its class capacity, and the path's capacity is its
  weakest cell. Rail gateways count only the road from the area to the station or crossing yard.
  - An area's flow to a gateway is the lower of its demand, its path capacity and its share of the gateway.
  - A gateway's capacity is shared **pro rata to the areas' demand**, not first come in `AREA_ORDER`, so a later area
    is never silently starved. Remainders go by largest remainder in area order, for determinism.
  - Simplification, stated in the spec: two areas whose paths share a street do not share that street's capacity.
    Only gateways and each area's weakest link are capacities. That is what keeps this from being a flow model.
- **Where the shortfall lands.** There is no `sold` share: output is `staffed × output_per_job_month`. So:
  - The area's freight share for firms (the lower of export and input shares, last month's) joins the existing
    `min(ramp, floor, utilities, orders)` in `postFirmJobs`. A firm that cannot ship does not hire, and jobs, output,
    exports and value added fall together through code that already exists.
  - The area's materials share scales construction progress the way crew shortfalls already do: works and builds
    advance more slowly, and nothing is lost or refunded.
- **Roads must bind before gateways.** If a gateway caps first, upgrading roads does nothing and the player has no
  lever. Gateway capacities sit above what the start network and a street grid can carry; widening a gateway is a
  content card (e.g. a station or crossing upgrade) with its claims, not a free action.
- Report `freightUnmetT` per gateway and direction in the series; the Industry chip shows unmet tonnage; the Building
  drawer shows the materials share; the Gateway drawer lists used/capacity per gateway and each area's bottleneck
  cell, so the fix is legible.
- The start network's routes do not count for **readiness** (unchanged rule) but do count for **throughput**, with a
  `class` per route in `start_network.yaml` (`street` for Jianshe Road and the Guangshen road).
- Calibration guard: set capacities so the 1979 start and the whole prologue are **not** constrained (the player must
  meet the bottleneck by growing, not by turn 2), and so the `aggressive` run does hit it by 1982 — that is the point
  of the tier. The materials flow must not become a second crew cap in the prologue. If `historical_prologue` fails a
  §9 band because of freight, raise the capacities rather than the bands, and record it in the tuning log.

- Tests: widest path picks the avenue over the parallel track; a gateway's capacity is shared pro rata and its
  remainder deterministically; an area's flow never exceeds its weakest cell; an unmet export share lowers firm posts
  and nothing else; an unmet materials share slows works and builds without losing money or work; a firm with no
  `freight` is unaffected; shares are recomputed from state, never stored; save/load reproduces the same allocation.

### 3.5 R8e — Save migration and content hashes

- One version bump covers: zone `intensity`, `public`→`reserve`, `s.roads`→`s.roadClass`, the `requisitioned` cell
  list, the `power` pool (purchased kW and its pending purchases), substations, power stations, freight fields. Written as a table in §5.1's migration section, with a load test from the previous version's
  fixture.
- `landcover_sha256`, `gateways_sha256` join the header.
- `npm run evidence:validate` and `evidence:status` clean; new content files cite claims, every placeholder flagged.

**Done when:** `npm run check` green; goldens regenerated and explained per commit; a playthrough shows the land-cover
overlay, a pond cell costing more than a farmland one, a village cell refusing formation, purchased power carrying
the early years while a station is built, a substation raising a share, and a road upgrade lifting gateway
throughput.

**Commits, in this order** (R8b needs R8d's road classes): `landcover: layer, rule and audit` · `power: city pool,
purchases, stations and substations` · `roads: classes and gateway throughput` · `zones: drop public, add intensity`
· `save: migration vN+1`.

---

## 4. Pass 3 — The guided prologue (R9)

**Goal:** the first six quarters teach the loop by doing it, with one beat per quarter, each unlocking exactly the
tool the next beat needs. Then the SEZ hands over the rest.

### 4.1 Beats

| Turn | Beat | Unlocks | The one choice |
|---|---|---|---|
| 1979-Q1 | Meet the pair; where does the first work go? | Zones, Roads | the first zone and the first road, on the map |
| 1979-Q2 | The first processing contract | Site formation | accept on premises, in a zone, or decline |
| 1979-Q3 | The permit regime | Form site (bulk), priorities | standard / loose / strict |
| 1979-Q4 | The construction corps | Facilities | quarters / bamboo sheds and tents |
| 1980-Q1 | Co-financing | Power substations | accept / decline |
| 1980-Q2 | The readiness check | — | noted / rush |
| 1980-Q3 | The SEZ | everything, incl. high intensity and leasing | the priority mix |

- Tool gates are content: `tool_gate: { tool: 'road', requires: 'tool.roads' }` in a new `content/slice/tools.yaml`,
  read by the rail. An un-unlocked tool is shown greyed with its beat name, not hidden — the player should see what is
  coming.
- Retire the M4 projects from the prologue: `event.first_project` options become map instructions, not
  `project.road_link` / `project.water_main`; `event.cofinancing` offers a **specific works order at zero city cost**
  through the existing co-financed path (`commitCofinanced`), not `project.power_line`. `project.water_main` disappears
  with water (R8c).
- `event.petition` fires only for works in an area with village-class cells (or from a compensation obligation), so the
  card stops arriving for work the player did not do there.
- Every beat's card has the Pass 1 description and derived badges.
- Power purchase (`buy_power`) is available from the 1980-Q1 co-financing beat at the latest, since the early years
  run on bought power (§3.3); the first power station can be ordered from the SEZ beat, so it finishes inside the
  slice.

**Framing (2026-11-25).** Four of these beats need reframing before they are built: the office is a
市革命委员会 until late 1981, the Q1 1979 first project is the city's own survey rather than the documented
Luohu works, the 1980-Q1 co-financing should carry the Luohu formation package rather than an undocumented
Hong Kong power line, and the Q3 1979 permit card is about applying the province's rules, not inventing a
permit regime. The mechanics above stand. See §4.3.

### 4.3 The political weather and the news layer (research done, 2026-11-25)

**Decision: a separate `news` family, not a card for every political event.** The zone's 1981–1983 history is a
fight over whether it is a concession, a smuggling channel or a model, and R9 currently jumps from the SEZ
(1980-Q3) to the visit (1984-Q1) with almost none of it. But twenty political cards would bury the prologue's
one-beat-per-quarter discipline. The news layer carries the weather; cards stay for decisions.

- **Shape.** A `news` event fires once, is recorded in `events.fired`, has `news: { desk, tone, weather? }` and
  `text: { zh, en }`, no card and no effects. The briefing renders one lead item and at most two one-liners.
  The `weather` value (-2..+2) is read by the investor and scrutiny steps through a four-quarter window; it is
  optional and can wait.
- **Coverage.** Twenty-four entries cover 1979-Q1 to 1984-Q1, one lead per quarter. Eight carry a weather value;
  two are decisions: the 1982-Q1 concession storm (`1982 《旧中国租界的由来》`) and the 1983-Q4 plenum
  (rectification and "spiritual pollution"). The rest are colour.
- **Selection rule.** An item earns a place only if it changes a decision, explains a mechanic, is directly
  about the city, or is a visible weather vane. Plena and congresses that do not change the zone's room to
  manoeuvre are dropped; the dropped list is in the note.
- **The opening voice.** Two letters, both fiction: a provincial organization-department assignment and a
  handover note from the outgoing county office. The first gives the mission; the second gives three tasks
  (hang the map, choose one piece of land, watch the grant) and the period's tone. "The city seal is not cut
  yet" replaces a tutorial pop-up.
- **The 1982 card.** Options are postures, not outcomes: write the summary honestly, answer the concession
  charge in public, or send numbers only. The detailed effects wait for the politics pass.
- **The 1981 institutional beat.** The 1981-07 Document 27 requires a zone people's government; the
  government is established 1981-10-20 and renamed 深圳市人民政府 on 1981-12-21. This is the end of the
  opening's transitional form and belongs in the news layer.

**Not in this pass:** factions, elite politics, a response tree, a public-opinion model. The user's "later" is
the right call.

**Where it is written:** `docs/design/systems/prologue-flavor-and-news.md` (design, text, calendar) and
`docs/research/phase1-political-calendar.md` (dates, sources, uncertainties, selection). New evidence:
`data/evidence/claims/phase1_political_calendar.yaml`, `data/evidence/sources/phase1_political_calendar.yaml`,
`data/evidence/conflicts/phase1_political_calendar.yaml`. Two conflicts are open: the title/medium of the 1982
concession material, and the East Lake Garden signing date.

**Spec edits for the implementation:** §2.1's prologue table (reframed beats), §5.8 (the `news` family and
briefing section), §7 (the twenty-four records). No code yet.


### 4.2 Recalibration
- Re-run the §9 checkpoints for all five policies. Explain every golden that moves.
- Targets: `historical_prologue` and `aggressive` inside their bands as now; `cautious` may improve once the prologue
  no longer pushes an M4 project it cannot finish, but it is not required to pass.
- Update `docs/design/m6-tuning-log.md` (or a successor log) with the new numbers and the freight and land-cover
  effects.
- Update §5.10, §12 (add R7–R9), and the `AGENTS.md` phase line.

**Done when:** `npm run check` green; a fresh save plays 1979-Q1 to 1984-01 in the browser with tools arriving one at
a time; every §9 band is met or explained as structural; the goldens are explained in the commit.

**Commits:** `prologue: beats and tool gates` · `prologue: retire M4 projects` · `calibration: R9 rebalance` ·
`docs: §5.10, §12, AGENTS`.

### 4.4 The unlock schedule and timed modifiers (decided 2026-11-25)

**Gates live in the sim, not only on the rail.** A gated action (by tool, zone use, road class or intensity) is
refused by `step` with a named reason while its key is unset, so headless policies, replays and the UI obey the same
schedule. The rail shows a locked tool greyed with the beat or event that opens it; nothing is hidden. Gates are
content (`content/slice/tools.yaml`: `{ gate, requires }`); keys are set only by event `unlock` effects. Scripted beats
cite `design_note`; an anchor or news unlock cites that record's claims. No code checks a date.

| Opens at | Source | Unlocks |
|---|---|---|
| start (1979-Q1) | — | industrial and reserve zones; low and standard intensity; `track` and `street` roads; Form site on one zone at a time; cards |
| 1979-Q2 | `event.first_processing_contract` | Form site in bulk (several zones, one order) |
| 1979-Q3 | `event.permit_choice` | works priorities; `set_enforcement` (with the scrutiny gauge, which it already unlocks) |
| 1979-Q4 | `event.corps_advance` | facilities; residential zones; `contract_team` |
| 1979-Q4 | `news.1979q4.provincial_city` | `buy_power` (the province now plans and supplies the city directly) |
| 1980-Q1 | `event.cofinancing` | power substations (the co-financed works order is a substation or formation package, §4.1 framing) |
| 1980-Q3 | `event.sez_established` | commercial zones; `avenue` roads; `power_station` orders; the investor market (`investors.sez`, as now) |
| 1982-Q4 | `news.1982q4.storm_passes` | `high` intensity (`intensity.high`): more autonomy after the summary is approved |

- Mechanisms not in the table are open from the start. `public` and water are gone (R8).
- A save or headless plan that issues a gated action before its key is refused like any invalid action. The five
  policies are re-timed to the schedule; that is part of the R9 golden delta.
- The opening first project and the co-financing beat change as §4.1's framing says; no other beat moves.

**Timed modifiers: yes, a few, all placeholder magnitudes.** The news `weather` value is not a hidden four-quarter
sum. Instead a news record or a card option may carry one explicit **timed modifier**, shown in the briefing with
its size and the quarters left, so the weather is legible:

- Effect shape: `{ kind: modifier, target, factor, months }`, stored in `state.events.modifiers` as
  `{ source, target, factor, until }`. Same-target modifiers multiply; expired ones drop at the month's end.
- Targets are a whitelist of existing knobs, nothing new: `investor_rate` (multiplies every archetype's
  `rate_per_quarter`) and `scrutiny_gain` (multiplies the scrutiny step's gains). Adding a target is a spec change.
- Factors and durations live in `params/slice.yaml` under `events.<id>`, all `placeholder`, cited `design_note`; the
  text states the political fact (claims), never the number.

| Record | Target · factor · months (placeholders) |
|---|---|
| `news.1981q4.chenyun` | `investor_rate` × 0.9 · 6 |
| `news.1982q1.concession_material` | `investor_rate` × 0.75 and `scrutiny_gain` × 1.5 · 9 |
| `event.1982q1.concession_storm` options | the chosen posture shortens or lengthens the storm modifiers (honest summary −3 months; public answer ±0 with a scrutiny cost; numbers only +3 months) |
| `news.1982q4.storm_passes` | `investor_rate` × 1.2 · 12, and unlocks `high` |
| `news.1983q3.strike_hard` | `scrutiny_gain` × 1.25 · 12 |
| `event.1983q4.rectification` options | `scrutiny_gain` modifier by option; detailed effects wait for the politics pass |

Every other news record is presentation only. Tests: a modifier changes its target only while live and only by its
factor; two modifiers on one target multiply; save/load keeps them; the briefing shows each live one; a news record
with any effect other than `unlock` or `modifier` fails the compiler. Calibration: `historical_prologue` and
`aggressive` stay inside their §9 bands with the storm included; if they don't, shorten or soften the modifiers
before touching a band.

### 4.5 Construction capacity arrives in waves (2026-11-25)

**The finding behind it.** R8's diagnostics show the crew pool is fully committed from 1980: 79 cohorts under
construction at end-1983 in `historical_prologue`, 33 firms accepted in the Shangbu zone and only 20 open, and the
last firms accepted in 1982-10 still unopened in 1984-01. Yet `capacity.local_crew` is a flat 600 from 1979-Q1, so the
arrival of the engineering corps is a +60 rounding error and the 1982 deployment a +200 one. The prologue has no
capacity squeeze, and the late game has no release.

**The change: capacity is a stock that arrives, not a rate granted at the start.**

- `capacity.local_crew` becomes the county's own core only: **200** units. It pays for the survey, the first frontage
  and one road in the prologue; it cannot build a zone.
- Crew arrives through events as a **permanent** increment to the pool:
  `state.crew: { team: string; crew: number; from: YM }[]`, sorted, required from save v7. It is a stock because the
  corps stayed and worked for years; a 12-month contract is the right model for a *hired* company
  (`team.outside_soe`), not for the corps that was deployed to the city.
- A new event effect `{ kind: 'crew_arrival', team }` appends `{ team, crew: p.teams[team].crew, from: s.date }`. The
  size stays in params under the team's id, so content carries no number.
- `poolSupply` becomes `crewPool(s, p)` = `p.capacity.local_crew` + arrived increments + live pool contracts. Every
  caller (projects, works, the chip, the planning preview) reads the one function.
- `team.engineering_corps` becomes `event_only`; the player's `contract_team` (unlocked 1979-Q4, §4.4) hires
  `team.outside_soe` or a county crew instead. "The main wave" is not something you buy from a menu.

**The schedule** (sizes are placeholders, to be set by the calibration in §4.2):

| When | Beat | Pool after | The point |
|---|---|---|---|
| 1979-Q1 | start | 200 | one frontage at a time; the plan must choose |
| 1979-Q4 | `event.corps_advance` (already scripted) | +100 → 300 | the first real capacity; the prologue's remaining beats become possible |
| 1980-Q3 | `event.sez_established` | +150 → 450 | the zone's own construction force; the first industrial season |
| 1982-09 | `event.corps_deployment` (already scripted) | +900 → 1,350 | the main wave; the backlog clears before the 1984 visit |

The two existing beats keep their cards and their claims. `corps_advance`'s quarters-or-tents choice now also reads as
a housing decision: the corps needs beds, and the ~100 units it adds pull construction migrants. `corps_deployment`
keeps its accept/decline card, so declining is a real (bad) choice rather than a hidden default.

**Companion brake: no firm is accepted faster than it can be built.** Today the growth pass creates a firm whenever a
zone has room, so a small pool simply piles up unfinished firms (the 1982-10 cohort that never opens). Add
`growth.industrial.max_backlog_m2` (placeholder: three months of pooled cohort work, about 15,000 m²): the pass skips
a new firm while the zone's under-construction floor is above it. Capacity then shows up as *no new starts* — visible
on the map and in the I/C/R cue — rather than as an invisible queue. This is a mechanic, so spec first (§5.5, §13.3).

**Why this helps the calibration.** It splits the run into a squeeze and a release, which is the shape the slice
wants:
- 1979–81 pool 200–450 against today's 600: the spending ratio falls (the 1983 ratio is the binding band at 1.17–1.20
  of revenue), the prologue's choices bite, and R9's staggered tools stop being the only constraint.
- 1982-09 +900: the cohort backlog clears, firms open 6–12 months earlier, and the 1983 GDP multiple moves off the
  band floor (currently 3.42 against 3.34) without touching productivity. That headroom is what R9 needs.
- The wave is also a migration event: 900 construction jobs pull construction migrants, which raises the temporary
  population — the other number this pass is chasing — as long as beds exist (village rental and dormitories answer,
  §5.11).
- It gives the R9 ladder a second spine: tools unlock, and capacity arrives. The two need not be the same beats, but
  the 1979-Q4 and 1982-09 arrivals line up with the schedule in §4.4.

**Risks and how to read them.** More late crew competes with factory jobs for the same people (R8's labour finding:
`posted` outran `staffed` whenever jobs arrived faster than migrants). If the 1982 wave crowds out production, the
wave is too large or the beds too few, and the sign is a rising `turnedAway` with flat `staffed`. Calibrate the core
first (the 1979 spending ratio), the 1979-Q4 increment second (the prologue's pace), the 1982 wave last (1983 GDP and
temporary population).

**Tests.** `crewPool` before and after each arrival; a declined deployment adds nothing; an unarrived or `event_only`
team cannot be contracted; the 1982 pool is at least twice the 1979 one; save/load and replay keep the arrivals; a
zone above `max_backlog_m2` accepts no new firm and the I/C/R cue reads the backlog; determinism unchanged.

**Files.** `content/slice/events.yaml`, `content/slice/teams.yaml`; `params/slice.yaml`
(`capacity.local_crew`, `teams.*.crew`, `growth.industrial.max_backlog_m2`, `events.*.crew`);
`packages/sim-core/src/{events,projects,state,save,growth}.ts`, `systems/construction.ts`, `mapPlan.ts`
(skip an unarrived team), `summary.ts` (the pool in the checkpoint), `apps/slice-ui/src/{views,render,strings}.ts`.

### 4.6 Hasten construction: what the numbers say (tested 2026-11-25)

**The question.** Should accelerating construction be a slider with diminishing returns, an on/off button, or
something else, and what does endorsing 时间就是金钱，效率就是生命 add?

**Tested with the R8 golden harness** (seed 1, end-1983; `historical_prologue` shown, `aggressive` behaves the same
way). Each row is a named-parameter proxy for one design, run all the way through the five policies:

| Design (proxy) | GDP × | Temp | Residents | Spending ÷ revenue | Bands |
|---|---:|---:|---:|---:|---|
| **Base** | 3.42 | 24,589 | 50,103 | 1.17 | 20/20 |
| Global works rush, **Push** (works units ×0.75, money ×1.25) | 2.80 | 17,288 | 45,996 | 1.55 | 18/20 |
| Global works rush, **All-out** (×0.55, ×1.6) | 2.16 | 11,379 | 38,747 | 1.65 | 17/20 |
| More crew per works order (40 → 60 a month) | 2.72 | 17,064 | 46,232 | 1.51 | 18/20 |
| Formation only, Push (40 → 30 units, ¥30k → ¥37.5k) | 2.81 | 16,674 | 45,281 | 1.41 | 17/20 |
| Global +10% pace at **no extra money** (units −10%, cost same) | 2.79 | 16,265 | 45,584 | 1.43 | 18/20 |
| **Private builders 10% faster** (cohort crew per m² 0.018) | 3.65 | 26,231 | 51,272 | 1.14 | 20/20 |
| **Private builders 25% faster** (0.015) | 4.00 | 29,075 | 53,267 | 1.09 | 20/20 |

**Reading it.** Every design that speeds up **city works** raises 1983 spending faster than revenue and trips the
deficit rule: the plan always has a queue, so a saved month is spent on the next order, while the new zone's revenue
arrives six months of building plus a ramp later. A global works rush is not a lever, it is a trap — it costs 0.6 to
1.3 GDP multiples and fails two or three bands. Only speeding up the **private builders** is free to the city (they
pay their own way) and it is the strongest single lever measured in this pass: +10% buys +0.23 GDP and +1,600
temporary residents; +25% buys +0.58 and +4,500, with every band still green.

**Consequence for the design:**
1. **No global slider and no global toggle.** Both were tested above and both lose. The only defensible control is
   **per works order, three steps, chosen at commit**: Normal / Push / All-out, with
   `unitsTotal × {1, 0.75, 0.55}` and `budget × {1, 1.25, 1.6}`. The monthly crew draw stays `crew_per_order`, so a
   rush does not starve the builders; it frees the pool sooner. Three steps rather than a continuous slider because
   the cost is convex (the third step is the decision), the preview must be readable on a map, and headless plans
   need a finite choice. Not on/off, because there is no interior choice and it collapses to always-on.
2. **"More crew" stays where it already is: priority.** The test shows that taking more crew per order starves the
   cohorts (row 4). `set_works_priority` is the crew-allocation lever, and the order preview must say what it takes
   from. Rush is the money-for-time lever; priority is the crew-for-time lever; neither hides the other.
3. **The slogan is the free lever, and it is private-builders only.** A card at 1981-Q3 (`news`/`event`, Shekou's
   slogan) offers to endorse it. Endorsing sets a timed `construction_pace` modifier: cohort crew per m² × 0.9 for
   nine months (≈ +0.03–0.04 GDP over the slice — "a little", as asked), plus standing with the reformers and, under
   a strict permit regime, a scrutiny modifier. Declining leaves it alone. It never touches city works, which is what
   keeps it free of the fiscal trap.
4. **The preview is the feature.** An order row shows: months saved, extra yuan, the quarter's projected spending ÷
   revenue, and a red warning when the rush would cross the band. Without that, the trap is invisible and the player
   learns it by failing a review.

**Why the plans must not use it.** `historical_prologue` sits at 1.17 of the 1.20 spending ceiling. Even a 10% push
on formation alone (row 5) breaks it. So the golden plans keep Normal and the mechanic is demonstrated in one test
run only; a player who rushes must also skip something else. That is a real trade, not a balance bug.

**Tests.** Units and budget scale exactly by the step; sunk work is never re-priced (a step change re-prices only
unworked units); the monthly draw is unchanged; the preview's projected ratio matches `fiscalViews` on a clone; the
slogan modifier multiplies `cohortCrew` only while live and expires; a rush that crosses the band is allowed but
warned, not blocked.

---

## 5. Golden impact, at a glance

| Pass | Moves goldens? | Why |
|---|---|---|
| 1 | **yes, once** (§1.4 opening beat at init) | the first card is answered a quarter earlier |
| 2 | yes, heavily | land cover changes serviceable land; power changes who builds; freight changes revenue |
| 3 | yes | new prologue content and re-tuned params |

Every pass regenerates `test/golden/*.json` with `npm run golden:update` and states the resident, GDP and band deltas
in the commit message. A golden that moves without a sentence is a bug report.

Invariants that must keep passing in every pass: determinism (same seed + actions), population and money conservation
across save/load and replay, no negative stock, and M5b's calibration properties (§5.8).

---

## 6. What I am deliberately not doing

- No 3D, no archival tooling, no building serializer, no full traffic simulation, no wastewater/drainage, no water
  demand, no reclamation of tidal flats, no terracing of hills, no internal rename of `servicedLand`.
- No new evidence claims promoted to `sourced` by the land-cover derivation. The layer is a lead with a documented
  rule and an audit table.

---

## 7. Decisions (recorded 2026-11-24)

1. **Road tiers:** the gateway-throughput bottleneck (§3.4), with four gateways. Shenzhen station is a bottleneck too,
   for supplies from the mainland, including construction materials. Capacities are a **design setting**
   (`design_note`), not a researched quantity.
2. **"Tiered zones":** a per-zone **intensity tier** for this slice (§3.2). Differentiating zones by firm and product
   type is a later question, not part of R8.
3. **Site formation cost:** compensation is a **one-off obligation** on commit (§3.1), with a `requisitioned` list so
   it is never paid twice.
4. **Land-cover classes:** the **eight** in §3.1 (water, tidal_flat, hill, village, upland, lowland_farm, pond, town),
   with fixed thresholds and a ~70-cell audit.
5. **Villages are not formable** in Phase 1 (§3.1); development wraps around them.
6. **Power must bind** (§3.3): meagre 1979 supply, purchased power in the early years, major stations that take years
   to build, and high-intensity industry that can outrun the pool.
