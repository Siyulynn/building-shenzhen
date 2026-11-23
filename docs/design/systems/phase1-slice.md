# System spec: the Phase 1 slice ("Luohu and Shekou, 1979–1984")
**Status:** draft v0.3. Decisions taken:
- start 1979-Q1, with a six-quarter prologue (§2.1), and end at the January 1984 visit;
- seven playable areas from Luohu to Shangbu, with Shekou and Nantou by cards only;
- quarterly turns;
- readiness as one bar of three parts;
- the provincial grant cliff as the slice's fiscal arc (§6.7). **Covers:** `PLAN.md` §10 Phase 1 and §14 step 3. **Uses the Phase 1 subsets of:** fiscal-and-macro §11, buildings-and-construction §13 and leadership-and-reviews §7. Those specs own their schemas, and this spec only says which parts the slice switches on and how they connect.

**Every number in this spec is a starting parameter** (in `params/slice.yaml`) unless it cites a claim. The start state uses placeholder values, flagged `placeholder: true`, until the slice's research targets (§9) are found. Evidence compiles in **draft mode** (evidence protocol §9), so the slice is allowed to run on `lead` and placeholder data, with every such value tagged `[UNVERIFIED]`.

---

## 1. What the slice must prove
Phase 1 tests the core triangle: **growth vs fiscal survival vs politics and reviews.** If it is fun in ugly 2D, the project is validated.

**Exit criteria** (from PLAN §10):
1. You can play all 21 quarters (1979-Q1 to 1984-Q1), and the town grows plausibly in response to your choices.
2. Budget pressure and the review target force at least one hard trade-off a year. A loan taken today visibly squeezes a later year.
3. The slice is checked against its own plausibility bands and growth multiples (§9), at the 1980-Q2 snapshot and at the end of 1983. Whole-city and whole-SEZ totals serve only as upper bounds.
4. **No empty quarters in the prologue.** Every prologue quarter offers at least one decision with a visible effect (§2.1).
5. A headless 21-quarter run takes seconds, and the invariant tests pass.
6. **You want to play it again.** This one is judged by playtests (§12), not tests.

**The three tensions the player should feel:**
- **Obligations, loans and import access.** Every school, road and loan commits future money. Forex quota decides whether you can import the crane or the generator at all.
- **Village building.** Villagers add rental floors faster than you can plan. It houses the workers your factories need, and it blights the review.
- **The Secretary–Mayor pair and the review.** The deal-maker's shortcut closes the investor today, and raises a risk that can sink you at the year-end review.

**Out of scope** (later phases): the authority layer beyond one climate value; villages as full actors; the informal economy beyond one illegal-floor value per area; block assembly and developers; reclamation; title reviews; rotation of leaders; 3D; strict evidence gating.

---

## 2. Time and turns
- **Start:** 1979-Q1, when the area is still Bao'an County. **End:** 1984-Q1, with the January 1984 visit by Deng Xiaoping as the closing event. That is 21 quarterly turns of three monthly sub-steps each (PLAN §2). Quarterly turns are kept.
- **The arc:**
  - **Prologue** (§2.1): six quarters, 1979-Q1 to 1980-Q2. Powers are constrained, and each quarter adds one system.
  - **The SEZ's establishment** in 1980-Q3: the major early event (§7.1), which unlocks the zone's powers.
  - **Building the zone:** 1980-Q4 to 1983-Q4. The provincial grant halves in 1983 (§6.7).
  - **The visit:** 1984-Q1, the slice's verdict (§7.2). It is also the first budget without the grant.
- **Anchor dates are `sourced`** (`phase1.event.*` in `data/evidence/claims/phase1_findings.yaml`) and wait for a person's check. Historical mode needs them `verified`. Don't create new lead claims for them: the old `event.*` leads in `anchors_1979_1984.yaml` are duplicates waiting to be marked superseded.
- **Quarter character** (PLAN §2): Q1 Spring Festival departures and the annual budget card; Q2 the construction peak; Q3 typhoon risk; Q4 the year-end review.
- **Turn flow:** briefing → cards → plan and build → govern → end turn. Interrupting cards pause the turn mid-quarter (PLAN §6.2).

### 2.1 The prologue: 1979-Q1 to 1980-Q2
The prologue teaches the sim through history, with no text tutorial. Powers start small, and each quarter adds one beat: a card that asks for a decision, plus the system it switches on. The deadline is the zone (§7.1), so every beat also feeds **readiness**.

**Kinds of beat:**
- **Anchors** fire on their sourced dates.
- **Scripted beats** are design milestones. Their content triggers on the prologue turn number (`trigger: { prologue_turn: n }`), never on a year.
- **Guaranteed emergent beats** are emergent events with a floor: at least one fires in the prologue.

| Quarter | Beat | Kind | What it teaches | Switches on | Evidence |
|---|---|---|---|---|---|
| 1979-Q1 | The county becomes Shenzhen City (in March). Meet the Secretary and the Mayor (fictional). First project: a road and water link toward Luohu | anchor, then scripted | Projects create obligations. The provincial grant keeps the county's basic obligations afloat | Land-use painting, city projects, the three ledger views | `phase1.event.shenzhen_city_approval` |
| 1979-Q2 | Shekou's construction headquarters is set up next door. **A guaranteed first processing contract (三来一补)** is offered in the market town | anchor + scripted | Gross exports against small value added; the forex quota from retention; that basic industry needs serviced land | Investor cards (Hong Kong processing and inland state units only), the import-access view | `phase1.event.shekou_command`, `forex.retention.start`, `phase1.industry.processing_contract` |
| 1979-Q3 | Shekou breaks ground (July). Young residents escape to Hong Kong. Typhoon season | anchor + guaranteed emergent | Wages and migration push. Disasters raise scrutiny. Permits trade inflow against scrutiny | The temporary-permit regime, the scrutiny gauge | `phase1.event.shekou_works`; `phase1.event.escapes_1979` (lead); `phase1.event.typhoon_1979` (lead) |
| 1979-Q4 | **The first, lightweight review** (forex and order only; it scores but cannot fail). Shacks and rental rooms appear near the border. An engineering corps advance party (基建工程兵先遣队) reaches Shenzhen. Arrange temporary quarters and supplies for its construction crews | scripted | The review and visible vs real values. Village building and enforcement. Construction crews need beds and supplies | Enforcement level, the pre-inspection sweep (§6.8), the special construction units | `phase1.event.construction_corps_first_units`, `phase1.event.construction_corps_december_arrival` |
| 1980-Q1 | Spring Festival departures. **The Q1 budget briefing** brings the state-bank project loan and the co-financing offer | scripted | Debt service and borrowing capacity: a loan today squeezes later years | The loan, the co-financing offer | `phase1.fiscal.guaranteed_infrastructure_loans` (context) |
| 1980-Q2 | **The readiness check:** a report on roads, serviced land and water and power near Luohu and Shangbu, with the bottleneck named. The last quarter to commit | scripted | The three parts of readiness and the deadline | The readiness bar becomes a forecast of the first wave | design_note |
| 1980-Q3 | **The SEZ is established** (§7.1) | anchor | Everything the prologue taught now scales | Keyed to the event, not the date: SEZ tax incentives (15%), wider investor origins, leasing to outside investors, the priority choice | `phase1.event.sez_regulations`, `phase1.fiscal.sez_income_tax_1980` |

**Rules of the prologue:**
- **No empty quarters.** A quarter's beat is a decision with an effect, so a turn never ends with nothing to do. This is tested (§10).
- **No soft-lock on imports.** The city starts with a small municipal forex quota (fiscal §11, `forex_start_quota_usd`, placeholder). The 1979-Q2 contract adds quota through retention. Declining every investor still leaves enough to import one generator before 1980-Q3 (tested, §10).
- **Advance crews in 1979-Q4.** Eyewitness accounts document late-1979 movements. The tutorial card represents an advance deployment on the prologue turn. The first arrival across all units and the total number present that quarter remain open. The 1982 card represents the much larger mobilization. [Construction corps research](../../research/phase1-1979-1984.md#the-construction-corps)
- **The 1980-Q2 snapshot** (§9.1) is saved at the end of the prologue. It is the goal the prologue is calibrated against, and an alternative start at 1980-Q3.

---

## 3. The map
- **The grid** is the Spike A grid (`docs/spikes/spike-a-map.md`): 100 m cells in UTM 50N. Only cells inside the slice areas are playable. Everything else is drawn but locked.
- **The coastline.** The start-state baseline is the Landsat 3 MSS scene of 1979-10-19 (source `landsat_1979_10_19`; `pipeline/m1b_landsat_1979.py`, notes in `docs/spikes/m1b-sites.md`). An automatic near-infrared threshold gives a 1979 water mask per cell and a change layer: about 79 km² inside today's city was sea in 1979 and is land now. The mask is a `lead` observation (60 m pixels, tide pending) until a person checks it.
  - **Playable land in Phase 1 comes from the present-day DEM, by decision.** All seven playable areas lie inland around Luohu and Shangbu, where the 1979 and present-day shorelines don't change what is buildable.
  - The reclaimed coast is in Shekou, Nantou and the locked Futian and Nanshan shore, which are card-only or locked. Hand-tracing the 1979 shoreline is deferred to Phase 2, when the western cluster becomes playable.
  - The 1979 mask stays a visual layer with its caveat.
- **What changed, 1979→1984 (M1c, `docs/spikes/m1c-imagery.md`).** The KH-9 photo of 1980-09-11 is registered over all seven playable areas (about 30 m relative to Landsat 1979). It is the visual reference for the 1980-Q2 snapshot and for placing sites.
  - The Landsat scene of 1984-11-22 has band data only for Huangbeiling (4) and Donghu–Liantang (6). Huangbeiling shows a clear "cleared or built" signal, most of it after 1980-09.
  - **The core (areas 1–3, 5, 7) has no end-1983 imagery in hand.** The KH-9 frames of 1983-11-01 are the candidate for a same-sensor 1980 → 1983 comparison, and Landsat 3 of 1982-08-10 is the candidate for a midpoint.
  - All of it is `lead`. It can shape `design_note` bands for the checkpoint (§9.2) only through reviewed claims, never as numbers.
- **1979 is not a blank map.** The start state is built from a register of sites that already existed (§3.1), each flagged on the map with its evidence status.
- **The SEZ boundary** does not exist at the start. It is drawn onto the map by the establishment event (§7.1), and only cells inside it get SEZ policies afterwards.
- **Slice areas.** Seven playable areas and two card-only areas, as a **design proposal** (decided 2026-11-23, §13). Their names and roles come from general knowledge and are `lead`.
  - **Geometry:** each area is a union of whole present-day OSM subdistricts, used as proxies. No subdistrict is split. The areas should be redrawn from period maps (`docs/research/phase1-map-sources.md` §6) once those are in hand.

| # | Area (proposal) | Proxy geometry (whole present-day subdistricts) | Role in the slice | Status |
|---|---|---|---|---|
| 1 | 深圳墟 Shenzhen market town (Dongmen) | 东门 + 翠竹 | Existing town: shops, state units, the first services | lead |
| 2 | 罗湖 border crossing, station and 渔民村 Yumin | 南湖 | Border crossing, railway, hotels, Hong Kong traffic; Yumin and Xiangxi, the fishing and farming villages that turn to rental housing (V18) | lead |
| 3 | 蔡屋围 Caiwuwei | 桂园 | Village land beside the town; the relocated county offices; an early high-rise site | lead |
| 4 | 黄贝岭 Huangbeiling and 文锦渡 Wenjindu | 黄贝 | A village and the freight crossing | lead |
| 5 | 笋岗 Sungang | 笋岗 + 清水河 | Flat land north of the railway: warehousing and industry | lead |
| 6 | 东湖–莲塘 reservoir hills and eastern edge | 东湖 + 东晓 + 莲塘 | Water supply, hills and the border edge: mostly not buildable | lead |
| 7 | 上步 Shangbu | 华强北 + 园岭 | Early industrial zone west of the town (later Huaqiangbei) | lead |
| 8 | 蛇口工业区 Shekou Industrial Zone | 蛇口 + 招商 | **Card-only, the rival enclave** | lead |
| 9 | 南头 Nantou | 南头 | **Card-only:** the old county town and its villages | lead |

Areas 1–7 are contiguous and playable. Areas 8–9 form the western cluster, which appears in Phase 1 **only through cards**. It has no daily commuting to Luohu and no playable land. The land between the two clusters (present-day Futian and Nanshan) is locked.

- **The card-only areas:** the player cannot zone, build or lease in areas 8–9 at any point in the slice.
  - **Shekou** (8) competes with the player for investors, and becomes an enclave when its industrial zone begins (§7).
  - **Nantou** (9) appears through village, water and road cards. The 1981 water plant (`phase1.water.nantou_1981_capacity`) is one of them.
- **The area invariant:** every placed site's `area` equals the area whose cells contain its point.
  - A point that falls on no land cell inside the city (the Luohu bridge on the river, Chiwan offshore in 1979) takes the nearest one.
  - `pipeline/m1b_sites.py` checks this against `content/slice/areas.yaml` once that file exists (M1), and fails on a mismatch.

### 3.1 The 1979 site register: what already existed
Shenzhen in 1979 had a market town, a border crossing and railway, villages, farmland, fishponds, a reservoir, roads and state units. These are **researched and flagged**, never assumed. Each existing site is a record in `content/slice/sites_1979.yaml`:
```yaml
- id: site.shenzhen_market_town
  name: { zh: 深圳墟, en: Shenzhen market town }
  kind: town            # town | village | crossing | railway | road | reservoir | farmland | fishpond | state_unit | factory | school | clinic | military | border
  area: 1               # slice area (§3)
  geometry: { kind: point, lonlat: [114.1136, 22.5466], proxy: osm_shenzhen_places, confidence: 0.2 }
  # kind: point (a present-day proxy) | polygon (ref: data/evidence/observations/sites_1979/<id>.geojson) | unplaced
  in_start_state: block_stock      # tracked_building | block_stock | facility | road | land_use | card_only (areas 8–9)
  claims:
    - { id: site.shenzhen_market_town.exists_1979, use: encyclopedia }
    - { id: site.shenzhen_market_town.location, use: geometry }
  # evidence_status is computed, not stored: the weakest of the site's own encyclopedia and geometry claims.
  # design_note claims (context such as later figures) don't move the flag.
  research: [USGS 1977 aerial (V15), period maps, county gazetteer]
```
- **Flags on the map:** every site shows a marker coloured by evidence status: `lead` (red), `sourced` (amber), `verified` (green). Clicking it opens the claims, the sources and what is still unknown. The sites stay flagged in the slice, so the player always sees which parts of 1979 are researched.
- **How sites enter the start state:** a village becomes a block stock with village houses and farmland; the market town becomes block stocks of shops and state-unit buildings; the station and the bridge become tracked landmarks; the reservoir becomes water and unbuildable land; roads and the railway become network edges.
- **Placeholders:** where a site is known to exist but its size is not, the start file uses a placeholder (`placeholder: true`) and the map says so.
- **Status (M1b, 2026-11-23):** 20 sites in the register.
  - 15 have present-day OSM proxy points (source `osm_shenzhen_places`), and 5 are unplaced (county offices, railway line, Guangzhou road, border fence, military land).
  - 17 existence claims are `sourced` (`docs/research/phase1-map-sources.md` §5). Every placement is still `lead`, so every placed flag is red.
  - The viewer shows what the 1979 Landsat scene has at each proxy point, as a hint for placing it.
- **The key sources for placement:**
  - the Landsat scene of 1979-10-19 (60 m), for coastline, water and the largest built-up patches;
  - the KH-9 frames of 1980-09-11 (A048, F047, F048, in hand). Their dates postdate the start, so a 1979 feature they show needs earlier corroboration;
  - the 1977 KH-9 candidates and the USGS aerial imagery from 1969 and 1977 (V15).

  Georeferenced against the Spike A grid, they show the footprints of villages, fields, ponds and roads (evidence protocol §5.5).

**Candidate sites to study** (existence now mostly `sourced`; placement `lead` throughout):

| Site | Area | Kind | What to establish |
|---|---|---|---|
| 深圳墟 Shenzhen market town (the Dongmen streets) | 1 | town | Extent, streets, the market, shops, state units |
| The county's offices and state units in the town | 1, 3 | state_unit | Which units, where, how many staff |
| 罗湖桥 Luohu bridge and the border crossing | 2 | crossing | Facilities, daily crossings, checkpoint |
| The Kowloon–Canton railway and Shenzhen station | 2 | railway | Line, station site, freight sidings |
| The Guangzhou–Shenzhen road | 1, 5 | road | Route and condition |
| 蔡屋围 Caiwuwei village | 3 | village | Houses, fields, population, lineage |
| 渔民村 Yumin village | 2 | village | Houses, fishponds, boats, population (V18) |
| 黄贝岭 Huangbeiling village | 4 | village | Houses, fields, population |
| 湖贝, 向西 and other villages around the town | 1, 2 | village | Which villages, where |
| 笋岗 Sungang village and farmland | 5 | village, farmland | Extent of fields and ponds |
| 深圳水库 Shenzhen Reservoir and its water supply | 6 | reservoir | Capacity; supply commitments, including to Hong Kong |
| The Shenzhen River and the border fence | 2, 4, 6 | border | Fence line, patrol roads, restricted strip |
| 上步 Shangbu: what stood there before the industrial zone | 7 | farmland, village | Land use in 1979 |
| 南头古城 Nantou old town | 9 | town | Walls, streets, population (card-only) |
| Villages and farmland around Nantou | 9 | village, farmland | Which villages, where (card-only) |
| Shekou: fishing villages, the harbour, oyster beds | 8 | village, fishpond | Shown only through cards (Shekou is an enclave) |
| Small factories, schools and clinics in the slice | all | factory, school, clinic | Which existed, capacity |
| Military and restricted land | all | military | Where building was not allowed |


---

## 4. What the player can do
In the prologue the actions unlock one beat at a time (§2.1). From the SEZ's establishment, all of them are available.

| Action | System | Notes |
|---|---|---|
| Draw, edit, rename or remove zones (industrial, residential, commercial, public, reserve) on any playable cells; view the historical zone template, or apply one of its zones | §5.3, buildings §3.1 | Zoning is free. The plan guides investors and city builders (M3b) but does not bind village households. A zone close enough to a historical one in location, purpose and scale takes its name (§5.3) |
| Lease a parcel by allocation or negotiation | fiscal §5 | Leasing to outside investors opens with the SEZ; land-use fees follow the 1981 regulations. Auctions are locked in the slice |
| Build a road, water main, power line, school, clinic or police post | fiscal §6.2, §6.1 | Creates a project, then obligations once it is finished |
| Accept or decline an investor card | §6.5 | Shows the partial-equilibrium preview (fiscal §7.2). Before the SEZ, only a few kinds of investor can be accepted (§6.5) |
| Take the state-bank project loan; accept the co-financing offer | fiscal §11 | One of each in the slice |
| Answer the deficit card | fiscal §7.1 | Borrow, use land money, or cut |
| Set enforcement priority against illegal floors (low, medium, high) | buildings §5 | One enforcement level for the whole slice |
| Order a pre-inspection sweep (突击整治) before the Q4 review | leadership §4.4 | Cheap. It masks the visible illegal-floor share for 2–3 months, costs migrant mood, and risks the unannounced team (§6.8) |
| Set the temporary-permit regime (loose, standard, strict) | §6.2 | Changes migrant inflow and the climate value |
| Accept or decline the leader's shortcut | leadership §2.5 | One shortcut card type (deal-maker) |
| Prepare for the zone in the prologue: roads, water and power near Luohu and Shangbu, land cleared and surveyed | §7.1 | One readiness bar of three parts decides the size of the first investor wave |
| Answer event cards | §7 | About 15 events |

---

## 5. State in the slice
The slice uses the schemas from the owning specs, switched to their Phase 1 subsets:
- **Physical** (buildings §2): `BlockStock` for every block in the slice areas; a handful of tracked `Building` records for landmarks (the station, the first hotel, the first industrial building in Shekou: names `lead`). No promotion. Stages include `stalled`.
- **Fiscal** (fiscal §3): accounts `general`, `land`, `debt` and a simplified `forex` quota, which starts above zero (fiscal §11).
  - **Two regimes:** `regime.county_1979` before the SEZ (a county-level budget with little room) and `regime.contracting_1980s` after it. Their tax parameters are `lead` placeholders.
  - **The provincial base grant** (fiscal §4.2, sourced) runs through both regimes on its own schedule.
- **Leadership** (leadership §2.1): one Secretary and one Mayor, both fictional, no rotation; the Mayor has the deal-maker trait. From 1979-03 they lead the new city; before that, the county.
- **Reviews:** no title reviews. The annual performance review (leadership §3) runs with the slice's targets (§6.8).

**Phase-1-only state** (sketched here; moves to the pops and authority specs when they are written):
```ts
interface SliceArea { id: number; key: string; name: LocalizedString; cells: Uint32Array;
  access: 'playable' | 'card_only';                       // areas 8–9 are card_only; locked land is in no area
  flag?: 'shekou_enclave';
  utilities: { waterCap: number; powerCap: number };    // from built mains and lines
  facilities: { schoolPlaces: number; clinicVisits: number; policePosts: number };
  illegalFloorShare: number;                              // summary of the block stocks
  serviceGap: number; }                                   // fiscal §6.1
type PopKind = 'villager' | 'urban_resident' | 'migrant_factory' | 'migrant_construction' | 'hk_manager';
type Sector = 'farming_fishing' | 'factory' | 'construction' | 'services' | 'state';   // Phase 1 subset of PLAN §3.2
interface PopGroup { area: number; kind: PopKind;
  registration: 'local' | 'nonlocal' | 'hmt';             // PLAN §3.2 attributes, fixed per kind in Phase 1
  size: number;                                           // usual residents of the area (integer)
  stayedSixMonths: number;                                // integer: here six months or more (resident, 常住)
  underSix: [number, number, number, number, number, number];  // integer arrival cohorts: slot k arrived k months ago
  present: number;                                        // integer: sleeping here this month (Spring Festival, §6.2)
  employed: Record<Sector, number>; wage: number; savings: number; mood: number; }
// size === stayedSixMonths + Σ underSix, always (§5.2)
interface Climate { reformWind: number /* −1..1, exogenous series */; scrutiny: number /* 0..100 */ }
interface Readiness { roads: number; servicedLand: number; waterPower: number }   // each 0..1; the bar is their weighted mean (§7.1)
interface Sweep { active: boolean; monthsLeft: number }  // the visible vs real gap itself is leadership §4.4's
```
- **The five pop kinds** are fixed combinations of PLAN §3.2's attributes. Villagers hold local rural hukou and village membership. Urban residents hold local hukou (state units, the town). Factory and construction migrants hold non-local hukou. Hong Kong managers are `hmt`. The three population counts (registered, resident, present) are filtered sums, as in PLAN §3.2.
- **Six building archetypes:** village house, village rental block, standard factory (标准厂房), dormitory, state-unit flats, shop or market. Public facilities are tracked as facility capacity on the area.

### 5.1 The sim-core contract (M1)
This section owns the shared types that no other spec defines yet. Each later milestone adds its own state module from its owning spec. M1 adds no fiscal, physical, leadership or pop state.

**Content.**
- **`content/slice/areas.yaml`:** one record per area, with `id`, `key`, `name: { zh, en }`, `access: playable | card_only`, an optional `flag`, and `proxy_subdistricts`, a list of whole present-day subdistrict names without 街道. The areas' roles stay in this spec. They are not stored there.
- **`content/slice/scenario.yaml`:** `start` (a `YYYY-MM` month), `turns`, `months_per_turn`, and `claims` for the dates. The sim reads the start month and the turn count from here, so no year appears in code.
- **`data/starts/slice_areas.json`:** compiled by `pipeline/m1_areas.py` (generated, versioned, PLAN §6.6). It holds:
  - `format` (1) and `generated_by`;
  - the grid's `width`, `height`, `cell_m`, `origin_top_left` and `crs`;
  - `areas_sha256`, the sha256 of `areas.yaml` with LF line endings;
  - per area, the `areas.yaml` fields, plus `cell_count` and its cells as row runs `[y, x0, x1]` (inclusive).

  sim-core takes this file's parsed content as input and does no file IO. So `npm run check` runs without the git-ignored grid.

**Types.**
```ts
type YM = number;            // absolute month index: year * 12 + (month - 1). Formatting helpers exist for display only
interface CardInstance { id: string; card: string; options: string[]; interrupting: boolean; raisedAt: YM }
type PlayerAction =
  | { type: 'answer_card'; instance: string; option: string }
  | { type: 'set_enforcement'; level: 'low' | 'medium' | 'high' }           // M2, §4
  | { type: 'set_permit_regime'; regime: 'loose' | 'standard' | 'strict' }  // M2, §4
  | { type: 'create_zone'; use: LandUse; runs: CellRuns; template?: string } // M3a, §5.3
  | { type: 'edit_zone'; zone: number; add?: CellRuns; remove?: CellRuns; use?: LandUse }
  | { type: 'remove_zone'; zone: number }
  | { type: 'rename_zone'; zone: number; name: { zh: string; en: string } | null };   // later milestones add kinds
interface ActionLogEntry { date: YM; subStep: 0 | 1 | 2; action: PlayerAction }
interface GameState {
  date: YM;                  // the month the next step() simulates
  turn: number;              // 0-based quarter index; subStep 0..2 within it
  subStep: 0 | 1 | 2;
  scenario: { start: YM; turns: number; monthsPerTurn: number };
  areas: SliceArea[];        // §5, utilities, facilities and the summaries start at zero
  pendingCards: CardInstance[];
  actionLog: ActionLogEntry[];
  history: { months: YM[] }; // statistics series join here as systems arrive
}
interface SimEvent { step: string; kind: string; detail?: Record<string, unknown> }   // e.g. 'card_raised'
interface MonthStats { date: YM }                                                       // grows with the systems
type DecisionPolicy = (state: GameState, pending: CardInstance[]) => PlayerAction[];
```

**`step(state, actions, rng, steps?)`** (PLAN §6.2):
1. It applies `actions` first. Each answer must name a pending instance and one of its options, or `step()` throws. The answer is logged and the card removed.
2. If an interrupting card is still pending, it returns `{ status: 'paused', state, pendingCards }` without advancing the month.
3. Otherwise it runs the 14 tick steps of §6 in order. These are named functions, all no-ops in M1 except `statistics`, which appends the month to `history.months`. Then it advances `date`, `subStep` and `turn`, and returns `{ status: 'advanced', state, events, stats }`.
4. Past the last turn, no month runs. Cards that the last month raised (the closing event) can still be answered. A call that clears them returns `{ status: 'finished', state }`. A call with nothing left to answer throws.

- **Cards raised during a step:** this is a decision, made so that `step()` stays one indivisible month.
  - Interrupting cards pause *between* monthly sub-steps, never mid-tick. The month that raised a card still completes.
  - The answer applies at the top of the next call, before the next month runs, and is logged there. Example: a deficit card raised by `finance` in month t (fiscal §7.1) is answered before month t+1.
  - Non-interrupting cards wait without pausing.
- **Turn actions while paused:** `step()` applies the answers in a call first. If an interrupting card is still unanswered after them, it applies none of the other actions (`set_enforcement`, `set_permit_regime`, the zone actions, and later building), logs none, and returns `paused`; the caller sends them again. Applied turn actions are logged like answers, after them, so replay feeds them back in the same order.
- **Inputs:** `step()` never changes the state it is given.
  - Each state module added later must be copied in `cloneState`.
  - Append-only logs (the action log, the ledger's entries) copy the array and share entries, which are never changed after they are written.
- **Start month:** it must be the first month of a quarter, so that `subStep` matches the calendar quarter. `createInitialState` throws otherwise.
- **The `steps` argument** (optional) replaces the tick pipeline. Tests use it to raise fixture cards and draw randomness.
- **`runQuarter(state, actions, rng, steps?)`:** one player turn, shared by the CLI and the UI. It runs up to three sub-steps, with `actions` applied before the first. It returns:
  - `paused`, when a sub-step leaves an interrupting card mid-quarter. Answer it and call again to finish the quarter;
  - `turn_end`, when the quarter is over. Interrupting cards from its last month come back in `pendingCards`, and are answered with the next turn's actions;
  - `finished`, when the scenario is over.
- **Headless helpers:**
  - `runMonths(state, months, rng, policy, steps?)` asks the policy for answers before every step, and throws if it leaves an interrupting card unanswered;
  - `firstOption` answers every pending card with its first option;
  - `replay(initial, log, months, rng, steps?)` feeds each logged answer back at its own month and sub-step.

**RNG:** sfc32, one named stream per tick step, each seeded by splitmix32 from the run's seed and the step's name. A system added later gets its own stream, so it never shifts another system's draws in a golden run. The streams' state is plain numbers and goes in the save.
- **Previews never touch the live `Rng`.** `step()` advances it in place. A preview, such as the investor preview (M3, fiscal §7), is either deterministic or runs on a copy, `Rng.load(rng.save())`.

**Save** (PLAN §6.7):
- sim-core produces `{ header, body, arrays }`:
  - `header`: `{ format: 'sz-save', version, date, seed, content: { areas_sha256 } }`;
  - `body`: the state as JSON, with each typed array replaced by a reference;
  - `arrays`: the named typed arrays.
- `saveToJson` gives a canonical text form, with the arrays as base64.
- **Saving fails on NaN or Infinity**, which JSON would otherwise turn into `null` without warning.
- **Arrays are `u32le` only.** A milestone that keeps per-cell layers of another type adds its dtype (`u8`, `i16le`, `u16le`, `f32le`) here first.
- Compression and the file container belong to the caller, because no synchronous deflate exists without DOM or Node.
- Loading runs the migration table from the saved `version` up to the current one. Version 1 is the first.

**M1's tests:**
- save at month k, load, continue, and match an uninterrupted run byte for byte;
- replay from the seed plus the action log;
- the pause contract with a fixture card, including a card raised by the last month and quarters run with `runQuarter`;
- a known-answer test for the RNG;
- saving refuses non-finite numbers;
- a recursive source scan of sim-core: no `Math.random`, no `Date`, no `node:` imports, no imports from `apps` or `render`, and no year literals.

### 5.2 Pops, labour, migration and housing (M2)
M2 adds four tick steps from §6: labour (5), housing (7), migration (8) and construction (4, village households only). It also adds statistics fields (13). This section owns their model until the pops spec exists.

**Units and conventions.**
- **Units:**
  - money is nominal yuan;
  - wages are yuan per worker-month;
  - rents are yuan per m² per month;
  - floor area is m².
- **People are integers.** A flow computed as a real number x becomes `floor(x)`, plus 1 with probability `frac(x)`, drawn from the step's own RNG stream (seeded stochastic rounding). A slice-wide total is split across areas by largest remainder, with ties going to the lower area id.
- **Fixed order:**
  - Systems loop over the constant arrays `POP_KINDS`, `SECTORS`, `AREA_ORDER` (state order) and `ARCHETYPES`, never over a record's keys. A save sorts keys, so iterating over them would change draws and float sums after a load.
  - The kind and sector names are schema enums, not balance data.
- **Params:** `params/slice.yaml` is parsed once and validated: no nulls, every number finite. Then `createTickSteps(params)` builds the tick pipeline. Params never enter `GameState`. The save header carries `params_sha256` next to `areas_sha256`.
- **Seasonality:** seasonality reads the month of the year (`date % 12`). The months it uses come from params. No code reads the calendar year.

**The start state (`content/slice/start_1979.yaml`, placeholder).** For each playable area it gives:
- pop sizes by kind (all counted as `stayedSixMonths` at the start);
- baseline jobs by sector (the 1979 economy: farming and fishing, the town's shops, state units);
- housing floor area by archetype;
- the village plot footprint, which caps village floors;
- block-stock rights.

Every number is a `placeholder: true` design guess. The claims it cites are upper bounds only (§9.1): SEZ residents, agricultural and non-agricultural residents, and non-registered residents at end-1979. Areas 8–9 have no pops (§6.1).

**State added by M2.**
```ts
interface LabourMarket { wage: Record<Sector, number>;                     // slice-wide, yuan per worker-month
  jobs: { area: number; sector: Sector; jobs: number; filled: number }[];  // this month's demand and its fill
  baseJobs: { area: number; sector: Sector; jobs: number }[] }             // the start economy; M3 adds industry
interface HousingMarket { area: number;
  beds: { local: number; rental: number };          // capacity from completed floor (buildings §7)
  occupants: { local: number; rental: number };     // usual residents (size) by pool: an away migrant keeps their bed
  crowding: number;                                 // rental occupants ÷ max(1, rental beds), may exceed 1
  rent: number }                                    // yuan / m² / month, rental pool
interface MigrationState { stockLag: Record<'migrant_factory' | 'migrant_construction', number[]> }  // slice stock, last network_lag_months months
interface PolicyLevers { permitRegime: 'loose' | 'standard' | 'strict'; enforcement: 'low' | 'medium' | 'high' }  // §4; set by the M2 actions above (the prologue's unlocks gate them in M5)
// GameState gains: pops: PopGroup[]; blocks: BlockStock[] (buildings §2.2); villagePlots: { area; footprintM2 }[];
//                  labour; housing: HousingMarket[]; migration; policy; history gains the series under "Statistics"
```
- **The start is at rest by construction.** `createInitialState` fills `housing` from the start blocks and pops, and sets each area's rent to its target at the start crowding (below), so nothing moves until something changes.
- **`present` and `size`:** `size` is usual residence. Workers away for the Spring Festival keep their jobs and their beds, so labour and housing read `size`. `present` is the PLAN §3.2 count; it feeds the series in M2, and production and needs when they arrive.

**Block stocks.**
- **Granularity:** one `BlockStock` per playable area for M2 (`blockId` = area id, `cell` = the area's first cell). `village` is unset. The split into villages follows the site register in a later milestone.
- **Cohorts** use buildings §2.2 with two additions: `archetype` (one of §5's six) and `due` (the completion month, for cohorts under construction).
- **Era:** `era` is an index into `params.eras`. M2 has one era.
- **Bed pools:**
  - **Local:** village houses and state flats, for villagers, urban residents and Hong Kong managers. No rent.
  - **Rental:** village rental blocks and dormitories, for migrants. This pool has the rent.
- **Beds** = completed m² ÷ `m2_per_bed[archetype]`, rounded down.

**Labour (step 5).**
- **Labour force:** `size × participation[kind]`, rounded to the nearest person. It is a stock, not a flow, so it takes no draw, and the unemployment rate that migration reads uses the same number.
- **Jobs:**
  - `baseJobs`;
  - construction jobs, from m² under construction × `construction_jobs_per_m2`;
  - in M3, industry.
- **Who works where:** each sector is filled from the kinds in `fill_order[sector]`, in that order. A kind not listed never works in that sector.
- **Matching:** each month from scratch. Jobs are filled within the area first, in `AREA_ORDER` and `SECTORS` order. Leftover vacancies then take unemployed workers from the other playable areas: per sector and kind (in `fill_order`), the slice's idle workers are split across the areas' remaining vacancies by largest remainder, so no area is staffed first because of its id. A cross-area worker counts as employed in their home group.
- **`employed` stays whole after outflows:** when people leave a group later in the month (housing cap, migration), the unemployed leave first. If `Σ employed` then exceeds the group's labour force, employment is trimmed (by largest remainder over sectors) and the job rows' `filled` with it, the home area's row first. So `Σ employed ≤ labour force ≤ size`, and `Σ employed = Σ filled` per sector, at the end of every step.
- **Wages:** each sector's wage moves toward clearing, `wage += wage_speed × wage × (vacancy_rate − unemployment_rate)`, and never falls below `wage_floor[sector]`.

**Housing market (step 7).**
- Occupants are each pool's usual residents. `crowding = rental occupants ÷ max(1, rental beds)`. Migration refreshes occupants and crowding at the end of step 8 (rent is not recomputed), so the market and the series show the end-of-month stock.
- **Rent moves gradually**, so there is no cobweb:
  - `target = base_rent × max(crowding, crowding_floor)^rent_elasticity`;
  - `rent += rent_speed × (target − rent)`.
- **Over the cap:** if crowding exceeds `crowding_max`, the excess migrants leave this month as a housing outflow (newest arrivals first). So no one sleeps above the cap, and the people are conserved as an outflow.
- **Locals** are assumed housed in their own pool in M2. Its crowding is reported, not enforced.

**Migration (step 8).** Inflow is slice-level per migrant kind k, then allocated across areas.
- **Inflow:**
  - `gap = max(0, (wage[sector(k)] − inland_wage) ÷ inland_wage)`;
  - `pull = vacancies ÷ (vacancies + K_vac)`, which saturates;
  - `network = 1 + network_alpha × ln(1 + lagged slice stock ÷ K_net)`, which is concave and at least 1, so an empty slice can still attract migrants;
  - `inflow = base[k] × gap × pull × network × permit_factor[regime]`.
- **Allocation:** weights are the area's vacancies in sector(k) plus its free rental beds under `crowding_max`, counted after this month's outflow. No area takes more than its free beds; an area's overflow is shared again among the areas that still have free beds (by the same weights), until everyone is placed or no bed is left. Whoever finds no bed in the slice does not come: that inflow is lost, not stored, and so is the whole inflow when every weight is zero. An area with no rental beds at all (area 6 at the start) takes no migrants, so its villagers never see rental demand: intended for the rural north until content seeds it.
- **Arrivals** enter `underSix[0]` and are present at once.
- **Outflow per group:**
  - `size × (base_exit + unemployment_push × unemployment_rate + housing_push × max(0, crowding − 1))`;
  - taken from the newest cohort first, then from `stayedSixMonths`; `present` falls in proportion.
- **Order within the step:** outflow, then ageing, then arrivals. Ageing shifts each queue: `underSix[5]` moves into `stayedSixMonths`, so a newcomer counts as resident only after six months.
- **Spring Festival** (`spring.away_months` are months of the year, `date % 12`):
  - It runs at the start of step 5, before matching, so production, needs and the month's statistics all see the same people present.
  - In the first away month (this month away, last month not), migrants' `present = size − away`, with `away` the share `spring.away_share` of `size`, stochastically rounded. It stays low through the away months (January and February with the start params, January 1979 included).
  - In the first month after them, `away × (nonreturn + nonreturn_unemployment × unemployment_rate)`, stochastically rounded, leave as a real outflow, and the rest come back. The unemployment rate is last month's matching, so the jobless are the ones who stay home.
  - Usual residence (`size`) does not change while people are away.
- **Rest:** the start params set `base_exit` and `nonreturn` to 0, so exits come only from unemployment and crowding, and the start is a fixed point. A churn with replacement inflow needs a vacancy mechanism that M2 does not have (matching backfills vacated jobs with locals).
- **Births and deaths** are explicit zero flows in M2.

**Village building (step 4).** Once a month, for each area with village plots:
- **The test (buildings §3.1):**
  - `value = rent × min(1, crowding) × horizon_months` per m²;
  - `cost = build_cost_per_m2`;
  - `risk = p_enforce[enforcement] × cost`;
  - it builds when `value − cost − risk > hurdle × cost`.
- **How much:** `starts = min(villagers × max_start_m2_per_villager_month, unmet rental beds × m2_per_bed.village_rental × response)`. Unmet beds are rental occupants minus rental beds minus the beds already under construction.
- **Which market:** the test reads last month's housing market (step 7 runs after step 4).
- **Era:** a start takes the era of the block's first cohort. M2 has one era, and changes of era arrive with content.
- **How high:** village floor area is capped at `footprint × max_floors`, where `max_floors = min(structural_max_floors[era], enforcement_max_floors[enforcement])`.
  - Floors up to `legal_floors` are `permitted`.
  - Floors above that are `unpermitted_tolerated` (buildings §5).
- **Completion:** a start becomes an `under_construction` cohort with `due = date + duration_months`, and an event `start`. It completes in step 4 of its due month (event `complete`). Only completed floor supplies beds (buildings §11).
- **`illegalFloorShare`** = illegal floor ÷ all village floor, recomputed from the block stock each month.

**Statistics (step 13).** Monthly slice series in `history`:
- the three counts of PLAN §3.2, as filtered sums:
  - `registered` = Σ `size` over local-hukou kinds;
  - `resident` = Σ `stayedSixMonths`;
  - `present` = Σ `present`;
- `migrants` (Σ `size` over migrant kinds);
- `jobs` and `employed`, by sector;
- `rentalBeds`;
- `crowding` (slice rental occupants ÷ rental beds) and `rent` (weighted by rental beds);
- `underConstructionM2`;
- `illegalShare` (of completed village floor);
- `inflow` and `outflow`, summed from the month's `flow` events (migration and the housing cap).

**Deferred past M2** (zero or absent):
- escapes to Hong Kong (they need the event system, M5);
- investor dormitories (M3) and state flats (city projects, M4);
- births and deaths;
- savings, and mood beyond its start value (needs, M5).

**M2's tests:**
- **At rest:** with no shock, 63 months move no count (migrants included), crowding or rent by more than 2%, and nothing is built. The Spring Festival lowers `present` only.
- **A fixture job shock** (factory jobs added to `baseJobs` through `steps`) runs the whole loop: jobs → migrants → crowding → rent → village floors, including illegal floors under low enforcement.
- **Stability:**
  - inflow starts with zero migrants in the slice;
  - the migrant stock stays bounded over 63 months under the shock;
  - rent settles after the shock, without swings that grow.
- **Invariants** (property tests over seeds):
  - per group, Δsize = inflow − outflow;
  - `size = stayedSixMonths + Σ underSix`;
  - no negative people, jobs, beds or floor;
  - `illegalFloorShare` and the bed counts equal what the block stocks give.
- **M1's determinism tests** rerun on the real M2 tick: save/load/continue, replay, and input not changed.

### 5.3 Zones, the historical template and historical names (M3a)
The player zones freely (pillar 1: you plan, the city happens). Zones guide investors and city builders from M3b. Village households ignore them (§4). History enters in two optional ways:
- **the template:** the historical zones, which the player can show as a reference overlay or apply one at a time;
- **names:** any zone close enough to a historical zone in location, purpose and scale takes that zone's name, however it was drawn.

Names are labels. They appear in cards, the briefing and the encyclopedia, and never feed the economy.

**State added by M3a.**
```ts
type LandUse = 'industrial' | 'residential' | 'commercial' | 'public' | 'reserve';   // buildings §2.2's plannedUse
type CellRuns = [number, number, number][];   // [y, x0, x1], inclusive, sorted by y then x0, disjoint: plain JSON
interface Zone {
  id: number;                 // from nextZoneId, never reused
  use: LandUse;
  runs: CellRuns; cellCount: number;
  area: number;               // the playable area holding most of its cells (ties: lower id); recomputed on edit
  created: YM;
  template?: string;          // the precedent it was applied from: a record of what the player did, not of history
  name: { kind: 'generic' } | { kind: 'precedent'; precedent: string } | { kind: 'custom'; zh: string; en: string };
}
// GameState gains: grid: { width: number; height: number } (from the areas content); zones: Zone[] (id order);
//                  nextZoneId: number
```
- **Cells as runs:** saves extract only the areas' cells as typed arrays, so zones keep plain runs.
- **The plan layer** (land use per cell, for the map) is derived from the zones and is not stored.

**Validity.** `step()` throws on an invalid zone action, as it does on a bad answer. The UI clips a stroke first with the exported `zoneCellsAllowed(state, runs)`.
- Every cell lies in a playable area: none in areas 8–9 (§3), none on locked land.
- No cell is in two zones.
- Runs are well formed. An edit may not leave a zone empty (`remove_zone` deletes one).
- sim-core has no buildability mask. Zoning water or hills is allowed and attracts nothing; M3b reads buildability from the grid.

**Applying the template** is not an action of its own. The pure helper `templateZoneAction(state, precedent)` returns a `create_zone` for the precedent's cells, clipped to playable cells not already zoned, with `template` set. The UI and the `historical_prologue` policy use it. The log records the `create_zone`, so replay needs no content beyond the precedents.

**Precedents** (`content/slice/precedents.yaml`): historical zones now, and the named things of §5.4 later.
```yaml
- id: precedent.zone.shangbu_industrial
  kind: zone                        # zone (M3a); enterprise | landmark | cluster (§5.4)
  name: { zh: 上步工业区, en: Shangbu Industrial Zone }
  use: industrial
  geometry: { kind: square, cell: [351, 372], side: 6, proxy: "osm_shenzhen_places way 588326736", placeholder: true }
  # kind: square (a placeholder footprint around a proxy cell) | runs (traced from period maps) | unplaced
  claims: [ { id: precedent.zone.shangbu_industrial.exists, use: encyclopedia },
            { id: precedent.zone.shangbu_industrial.location, use: geometry } ]
```
- **Compiled at load:** `compilePrecedents(raw, areas)` validates the ids, kinds and uses, and turns each placed geometry into runs clipped to the grid. `createTickSteps(params, precedents)` takes the result. Precedents never enter `GameState`, and the save header gains `precedents_sha256`.
- **The template** is the placed zone precedents. The overlay is drawn by the renderer from content and touches no state.

**Name matching** (tick step 3, before investors look for sites). Each month, a pure function of the zones, the precedents and `params.zoning.names`, with no RNG, gives each zone at most one precedent and each precedent at most one zone:
1. **A pair matches** when all of these hold:
   - **purpose:** the zone's use equals the precedent's;
   - **location:** the zone covers at least `min_overlap` of the precedent's cells, or the two centroids are within `max_offset_cells`;
   - **scale:** the zone's cell count ÷ the precedent's is within [1 ÷ `max_scale_ratio`, `max_scale_ratio`];
   - the precedent is placed, and the zone has no custom name.
2. **Keeping:** a zone keeps last month's precedent while the pair still matches, so drawing a better match later does not take the name away.
3. **The rest are assigned greedily by score**, highest first: `w.overlap × overlap share + w.offset × (1 − offset ÷ max_offset_cells) + w.scale × (1 − |ln ratio| ÷ ln max_scale_ratio)`. Ties go to the lower zone id, then to the precedent's order in the file.
4. **Losing a name:** a zone edited until it no longer matches falls back to its generic label, and the name is free for any zone that matches it. A custom name (`rename_zone`) takes the zone out of matching; renaming to `null` puts it back.
- **The generic label** is rendered from the area and the id, for example `上步 · 工业区 #3 / Shangbu · industrial zone #3`. It never takes the bare form of a precedent's name.
- **Gates:** a precedent may carry `after_event` (an event whose claim it cites), keyed to the event, never to a date. None does until M5's events exist.

**The Phase 1 precedents.** Placement is `lead` and every footprint is a placeholder.

| Precedent | Area (from the proxy) | Placement | Existence |
|---|---|---|---|
| 上步工业区 Shangbu Industrial Zone | 7 | Centre of OSM way 588326736 (present-day `landuse=commercial`), 6 × 6 placeholder cells | Named on p. 363 of `phase1_1985_industrial_buildings`, whose sourced claims give its plants and floor |
| 八卦岭工业区 Bagualing Industrial Zone | — | Unplaced: the OSM export's query never asked for it | Named on the same page, in the combined floor claim |
| 水贝工业区 Shuibei Industrial Zone | 1 | The OSM 水贝社区 quarter point, placeholder cells. A second 水贝 point falls in area 6 | Lead only: named in the design brief |

- **Scale:** the paired figure (`phase1.housing.shangbu_bagualing.completed_industrial_floor.1984`, about 110,000 m² through end-1983) covers both zones together. It is not split. The template's scale is its placeholder cell count until each zone's extent is traced on period maps (§9).
- **Timing:** when each zone started is not in the store. So no precedent has a gate yet, and the 1980-Q2 snapshot applies none (§9.1).

**Params** (`params/slice.yaml`, `zoning.names`): `min_overlap` 0.25, `max_offset_cells` 10, `max_scale_ratio` 3, `weights` { overlap 0.5, offset 0.25, scale 0.25 }.

**What M3b reads from a zone:** its use, its cells by area, and from the grid which of them are buildable and serviced. Investors locate only in industrial and commercial zones.

**M3a's tests:**
- **Validity:** refuse cells in areas 8–9 or outside every area, overlapping zones, malformed runs and edits that empty a zone. Ids are never reused.
- **Names:**
  - an applied template zone takes its precedent's name;
  - a zone drawn shifted (within the offset) or resized (within the ratio) takes it too;
  - a zone with the wrong use, too far or too large takes none, and an unplaced precedent never matches;
  - one zone per name; the first matching zone keeps it when a better one is drawn; an edit that breaks the match frees the name for the next zone; a custom name opts out.
- **No effect on the economy:** with zones present, M2's at-rest and shock runs give the same pops, blocks and history.
- **Determinism:** save, load and continue, and replay, with zone actions in the log. Zone actions are refused while an interrupting card is pending.

### 5.4 Named emergence (M3c, held)
A sketch, not built.
- **Generic emergent things:** enterprises, landmarks and clusters (an electronics market, a first supermarket) form from sim conditions at any location: firms by product line, shop floor, demand, with a seeded hazard. They are `emergent` events (PLAN §7).
- **Historical names attach by the zone rule:** a precedent of the same kind and archetype gives its name when the location, purpose and scale are close enough. Otherwise the thing gets a generic name, so other electronics hubs can emerge elsewhere under their own names.
- **Location preference:** a precedent may add a modest hazard multiplier (a param) at its real place, so history leans toward it without forcing it.
- **Why it is held:**
  - The store has no claims for the brief's examples (the first Wanjia supermarket, the Huaqiangbei electronics complex). Whether either falls inside 1979–83 is the first thing to check (leads `precedent.landmark.wanjia_first_store`, `precedent.cluster.huaqiangbei_electronics`).
  - If both postdate the slice, Phase 1 has no named content for the engine. Candidates inside the window, such as the early electronics plants in Shangbu (`phase1_shangbu_huaqiang_history`, section 深圳电子工业肇启), are research targets (§9).
  - Firms with product lines arrive in M3b. The engine follows once an in-window precedent is sourced.

---

## 6. Systems and the monthly tick
The tick follows PLAN §3.15's order. Steps marked *off* do nothing in the slice.

| # | Step | What it does in the slice |
|---|---|---|
| 1 | External and national state | Read exogenous series: Hong Kong order demand, reform wind, credit conditions, national prices |
| 2 | Events | Draw and fire events whose triggers hold (§7) |
| 3 | Investment decisions | Investors arrive as cards; accepted firms join the industry blocks |
| 4 | Construction | Builders allocate starts; the pipeline advances; stalls and resumes (buildings §3–§4) |
| 5 | Labour market | Match jobs to pops by area, with a simple commute penalty between areas |
| 6 | Production | `output = min(orders, staffed, floor, utilities)` per industry block (fiscal §8.1) |
| 7 | Housing market | Beds vs people who sleep there; occupancy and rents per area |
| 8 | Migration | Inflow and outflow (§6.2) |
| 9 | Needs and consumption | *Reduced:* mood from housing, wages, services and the service gap only |
| 10 | Informal economy | *Reduced:* the illegal-floor share per area, from the block stocks |
| 11 | Finance | Revenue, obligations, projects, loans, the deficit rule (fiscal §4–§7) |
| 12 | Stability | *Reduced:* a single unrest value per area from mood, enforcement and service gaps |
| 13 | Statistics | Monthly series and the three population counts |
| 14 | Reviews | In Q4: the annual performance review (§6.8) |

### 6.1 Labour
- **Jobs** come from industry blocks (by sector) and public facilities. **Workers** come from pop groups.
- **Matching:** within an area first, then across the seven playable areas, with a commute penalty. The card-only western cluster has no pops in the sim, and no daily commuting to Luohu.
- **Wages** drift toward the level that clears each sector's local market, bounded below by an exogenous floor (no minimum wage yet).

### 6.2 Migration
```
inflow[kind]  = base[kind] × max(0, wage_gap) × vacancy_pull × network(stock, lag) × permit_factor[regime]
outflow[kind] = stock × (base_exit + unemployment_push + housing_push) + spring_festival_nonreturn (Q1)
```
- `permit_factor` falls as the regime tightens; a strict regime also lowers `scrutiny` growth and raises `mood` penalties for migrants.
- **Spring Festival (Q1):** a share of migrants leave in January–February. Most return; the non-return share rises with unemployment. Departures free beds, but usual residence does not change (PLAN §3.2).
- **Escapes to Hong Kong** are an outflow of young local residents, rising when local wages lag Hong Kong's. They feed an event (§7).

### 6.3 Housing and village building
- **Bed capacity** = Σ completed residential and dormitory floor ÷ m² per bed (buildings §7). Occupancy is the result.
- **Village households** add floors when rent × expected occupancy beats construction cost plus enforcement risk (buildings §3.1). In the slice this is the main source of beds for migrants, and the main source of illegal floor area.
- **Factories** may add dormitories as part of an investor deal.
- **State-unit flats** are built only by the city, as projects.

### 6.4 Production and GDP
- **Industry blocks:** area × sector × ownership. Slice sectors: processing and assembly (三来一补), light manufacturing, construction, trade and services, state administration, farming and fishing.
- **Orders** for processing come from the Hong Kong demand series, split among firms by their contracts.
- **GDP** is value added: nominal only in Phase 1 (fiscal §11). The ratio for processing is low, so exports look large and local GDP small. That is intended.

### 6.5 Investors
- **Before the SEZ:** Hong Kong processing contracts (三来一补) and inland state units only.
  - **Cadence:** the first contract is guaranteed in 1979-Q2 (§2.1). After that, a random card comes every two quarters or so.
  - **No dead quarters:** the prologue beats fill the quarters with no investor card.
  - **Evidence:** processing contracts are defined in `phase1.industry.processing_contract`. The research notes a 1978 predecessor trade (`docs/research/phase1-1979-1984.md`), so the card is "our first contract", not the city's.
- **After the SEZ:** about one investor card a quarter, and the origins widen to overseas Chinese and foreign firms, with SEZ tax incentives. The first wave's size depends on readiness (§7.1). Fields: origin (Hong Kong, overseas Chinese, inland state unit), sector, jobs, floor needed, utilities needed, the terms asked (land price, tax holiday, labour terms, forex), and whether they bring forex.
- **The preview** (fiscal §7.2) shows cash this quarter, retained tax per year, jobs, beds needed and new obligations.
- **Declining** an investor sends some of them to Shekou, which competes for them.
- **The deal-maker's shortcut** can attach to a card: accept a sweetheart price to close it now (leadership §2.5).

### 6.6 Construction economy
- **Builders in the slice:** village households, the city (projects) and Hong Kong investors (factories, dormitories, the hotel). No developers or block assembly.
- **Stalls** happen when credit tightens or a city project loses its funding.

### 6.7 Fiscal
Exactly fiscal-and-macro §11, with the deficit rule (§7.1) and the investor preview (§7.2). The three views shown are recurring money, money for projects and import access.
- **The loan:** one state-bank project loan. It is offered at the 1980-Q1 budget briefing (§2.1), and again whenever the player commits to a road or water project bigger than they can fund, until it is taken.
- **The co-financing offer:** one investor offers to pay for a power line, in exchange for a long tax holiday and cheap land. It is offered at the same briefing.

**The provincial grant cliff: the slice's fiscal arc** (fiscal §4.2, sourced):

| Years | Grant | What the player should feel |
|---|---|---|
| 1979–1980 (prologue) | Full | The grant keeps the county's basic obligations afloat while the player scrapes money together for roads and water |
| 1981–1982 | Full (unchanged in 1982) | Borrow and build. From the 1982-Q1 budget card, the four-quarter warning shows the coming cut and the recurring balance without it |
| 1983 | Half, from the 1983-Q1 budget card | Loans and recurring obligations bite: the deficit card becomes likely if the player overbuilt |
| 1984 | None, from the 1984-Q1 budget card | The closing test: can the city carry 1984 on its own revenue? (§7.2) |

- **The schedule comes from the regime content,** citing `phase1.fiscal.provincial_base.1982`, `.1983` and `.1984`.
- **The base amount** is a placeholder (`provincial_base_grant`). Tune it so the grant covers the county's baseline obligations at the start, and record why. It is not sourced.
- **Calibration of the shape:** the citywide ratio of budget spending to revenue fell from 1.73 in 1979 to 0.96 in 1983 (§9.2). A deficit-heavy start that closes as the grant goes is the shape to reproduce.

### 6.8 Leaders and the annual review
- **The pair:** a Secretary (fictional, cautious) and a Mayor (fictional, deal-maker). Mandate: "open the first export processing zone" (leadership §7), set when the SEZ is established. Briefings at inauguration, the Q1 budget and crises.
- **The annual review (Q4):** targets for exports, foreign investment used, forex earned and infrastructure built, plus one basic sanitation and order check that includes an unannounced team. The era framing of these targets is `lead` (leadership §3).
- **The pre-inspection sweep (突击整治):** a card offered in each Q4 before the review, from the first lightweight review in 1979-Q4. It is the cleanup campaign of leadership §4.4, with that spec's numbers.
  - **What it does:** it costs little cash. For 2–3 months it lowers the *visible* illegal-floor share (the real share and the block stocks don't change), and it lowers migrant mood.
  - **The risk:** the unannounced team catches it with `p_caught`, which grows with the gap between visible and real. If caught, the review fails, scrutiny jumps and the leaders' standing falls.
  - **The dilemma it tests:** real investment against cosmetic cleanup, in Phase 1 instead of Phase 2.
  - **Evidence:** a design_note. That such sweeps happened is a lead to research.
- **The first review (1979-Q4)** is lightweight: forex and the order check only. It scores and teaches, but it cannot fail.
- **Results:** political capital and the leaders' standing, and the scrutiny value.
- **Discipline risk** comes from accepted shortcuts (leadership §2.6). A fall from grace in the slice freezes projects and replaces the Mayor with a cautious figure, and can fail that year's review if the case touches an accepted shortcut.

### 6.9 Climate (the one authority value)
- **Reform wind** is an exogenous series in the slice. Its shape for 1979–84 is a `design_note` until sourced.
- **Scrutiny** rises with grey choices (a loose permit regime, tolerated illegal floors, accepted shortcuts) and with disasters, and decays slowly.
- **The failure state:** if scrutiny stays above a threshold for four quarters, the run ends with "the experiment is declared a failure" (PLAN §3.8).

---

## 7. Content
```
content/slice/areas.yaml          # the nine areas: keys, names (en + zh), proxy subdistricts, access, flags (M1)
content/slice/sites_1979.yaml     # the 1979 site register (§3.1)
content/slice/prologue.yaml       # the scripted prologue beats and their unlocks (§2.1)
content/slice/snapshot_1980q2.yaml   # the 1980-Q2 snapshot: facts, bands, and the save once M1 exists (§9.1)
content/slice/checkpoint_1983q4.yaml # the end-1983 calibration checkpoint (§9.2)
content/slice/start_1979.yaml     # start state compiled from the site register plus placeholders (placeholder: true until sourced)
content/slice/precedents.yaml     # historical zones (the template) and, later, named enterprises and landmarks (§5.3, §5.4)
content/slice/investors.yaml      # investor card templates
content/slice/events/*.yaml       # about 15 events
content/slice/targets.yaml        # annual review targets
params/slice.yaml                 # all tunable numbers
```
Every historical statement cites claim IDs (AGENTS.md). Claims that don't exist yet are created as `lead` in the same change.

**The events** (about 15). *Anchor* dates are fixed in Historical mode; *milestones* are timed by the player; *emergent* events fire from sim conditions. Anchors need `verified` claims (protocol §4). The `phase1.*` claims below are `sourced` from the Phase 1 research (`docs/research/phase1-1979-1984.md`) and wait for a person's check. They replace the earlier `event.*` leads, which stay in the store with a note until a person marks them superseded.

| # | Event | Family | Reference | Claim |
|---|---|---|---|---|
| 1 | Bao'an County becomes Shenzhen City | anchor | 1979-03-05 | `phase1.event.shenzhen_city_approval` (sourced) |
| 2 | Shekou's construction headquarters set up (Q2); works begin in July (Q3) (area 8 becomes the enclave) | anchor | 1979-04-01, 1979-07 | `phase1.event.shekou_command`, `phase1.event.shekou_works` (sourced) |
| 3 | Forex retention: quotas to buy foreign exchange | anchor (in force at start) | 1979 | `forex.retention.start` (sourced) |
| 4 | **The SEZ is established** (a chain of cards, §7.1) | anchor | 1980-08-26 | `phase1.event.sez_regulations` (sourced) |
| 5 | Land-use rules: decided 1981-11-17, in force 1982-01-01 | anchor | 1982-01-01 | `phase1.event.land_rules_1981` (sourced) |
| 6 | The second-line fence goes up | anchor | 1982-06 | `phase1.event.second_line_construction` (sourced) |
| 7 | **Deng Xiaoping's visit** (the closing event, §7.2) | anchor | 1984-01-24 | `phase1.event.deng_first_visit` (sourced) |
| 7a | The Bamboo Garden Hotel opens | anchor (card) | 1981-01-25 | `phase1.event.bamboo_garden_opens` (sourced) |
| 7b | The main construction corps deployment begins | anchor (card) | 1982 (autumn) | `phase1.event.construction_corps_arrival` (sourced) |
| 7c | Interim rules on residence and temporary-residence papers | anchor (card) | 1983-07-06 | `phase1.event.temporary_residence_documents` (sourced) |
| 7d | The provincial grant halves, then ends (the budget cards) | anchor (card) | 1983, 1984 | `phase1.fiscal.provincial_base.1983`, `.1984` (sourced) |
| 7e | Advance engineering corps crews (1979-Q4 beat) | scripted | — | `phase1.event.construction_corps_first_units`, `phase1.event.construction_corps_december_arrival` (sourced) |
| 8 | Our first processing contract signed (guaranteed in 1979-Q2) | scripted milestone | — | design_note; `phase1.industry.processing_contract` |
| 9 | The first export processing zone opens (the mandate) | milestone | — | design_note |
| 10 | Shekou poaches an investor | emergent | — | design_note |
| 11 | Hong Kong orders surge, or slump | emergent | — | design_note |
| 12 | A typhoon (Q3); at least the threat comes in the 1979-Q3 beat | emergent | — | design_note; `phase1.event.typhoon_1979` (lead) |
| 13 | A fire in a mixed factory and dormitory | emergent | — | design_note |
| 14 | Young villagers escape to Hong Kong (strongest before the SEZ; the 1979-Q3 beat) | emergent | — | `phase1.event.escapes_1979` (lead) |
| 15 | A village petitions over land compensation | emergent | — | design_note |
| 16 | Unannounced inspection team; the pre-inspection sweep card (§6.8) | emergent (Q4) | — | design_note |

### 7.1 The SEZ's establishment: the major early event
The six prologue quarters (1979-Q1 to 1980-Q2, §2.1) are a **prologue with a deadline**. The player knows a zone is coming, but not its terms.
- **Before it:** the prologue beats (§2.1). The goal is plain: *get roads, water, power and cleared land ready near Luohu and Shangbu before August 1980.*
- **Readiness is one bar with three parts** (decided 2026-11-23), each 0–1 and measured over the readiness cells: the playable cells of areas 1, 2, 3 and 7 that are buildable.

  | Part | Measures |
  |---|---|
  | **Roads and access** | Share of readiness cells within a set distance of a road connected to the Luohu crossing |
  | **Serviced land** | Share of readiness cells cleared, surveyed and with village compensation agreed |
  | **Water and power** | Built water and power capacity against the demand of a standard first wave, capped at 1 |

  - **The bar** is their weighted mean (weights in `params`).
  - **The panel names the weakest part.** The 1980-Q2 readiness check (§2.1) turns the bar into a forecast of the first wave.
  - **No split by sector:** the priority choice in step 2 below steers the mix.
- **The chain (1980-Q3).** Every unlock keys to the event firing, never to the date.
  1. *The announcement card:* the zone's boundary is drawn onto the map. Cells inside become eligible for SEZ policies. The area figure (327.5 km², PLAN Appendix A) is still a lead and needs its own claim.
  2. *A choice of first priorities:* industry and processing, the port and trade, or commerce and tourism. This sets the mix of the first investor wave and the mandate's emphasis.
  3. *The opening:* the first wave of investor cards arrives, and its size scales with readiness. The unlocks:
     - the SEZ's 15% enterprise income tax (`phase1.fiscal.sez_income_tax_1980`);
     - investor origins widening to overseas Chinese and foreign firms;
     - foreign-owned firms;
     - leasing to outside investors.

     The fiscal regime switches to `regime.contracting_1980s`. The provincial grant continues on its own schedule.
  4. *Attention from above:* scrutiny rises, and the first annual review targets are set.
- **What the player feels:** preparation pays off (a big first wave), or the zone opens to a muddy field and investors go to Shekou.

### 7.2 The January 1984 visit: the closing event
- **The visit ends the slice.** It is a historical anchor.
  - **Its date** (1984-01-24) is `sourced` (`phase1.event.deng_first_visit`) and waits for a person's check.
  - **The itinerary** is not in the store. Any stop shown needs its own claim.
  - **Timing:** the slice closes at the start of 1984-Q1, after 1983-Q4 has run. The final state is end-1983.
- **Real people** follow PLAN §11: national figures appear only through documented public actions and words, with sources. The game never invents what Deng said or thought. Any words shown are sourced quotes; until then the card shows only the documented fact of the visit, as a `[UNVERIFIED]` lead.
- **The slice's verdict** is the game's own scorecard, shown alongside the visit. It does not imply the visitor's judgement. It covers growth, the ledger's health, the year's review, scrutiny and the illegal-floor share. It compares the run with the end-1983 checkpoint (§9.2).
- **The fiscal test: "Can the city carry 1984 without the provincial grant?"** The 1984-Q1 budget card is the first with no grant (§6.7). The scorecard projects the 1984 recurring balance as a pure function of the end-1983 state: retained revenue at its 1983-Q4 rate, minus obligations due in 1984 (debt service included), with a grant of zero. A city that survives only on the grant shows it here.

---

## 8. Parameters (sketch of `params/slice.yaml`)
```yaml
# M2 (§5.2): labour, migration, housing and village_build live in params/slice.yaml in full (placeholder: true).
# Wages, rents, m² per bed, build costs and migration bases are design guesses, not historical figures.
production: { value_added_ratio: { processing_hk: 0.2 } }       # fiscal §12
climate: { scrutiny_decay: 0.05, failure_threshold: 80, failure_quarters: 4 }
review: { pass_mark: 0.6 }
investors: { cards_per_quarter: 1, shekou_capture_on_decline: 0.5 }
readiness: { weights: { roads: 0.3, serviced_land: 0.35, water_power: 0.35 }, road_reach_cells: 5,
             first_wave: { min_cards: 1, max_cards: 4 } }
sweep: { cash_cost: null, mood_penalty: 0.05 }                  # campaign_months and p_caught: leadership params
corps: { tent_mood_penalty_per_month: 0.03 }                    # special construction units living in tents
```
The provincial grant's base and the starting forex quota are in `params/fiscal.yaml` (fiscal §12).
`null` means "no defensible starting guess yet": choose one during M2 and record why.

---

## 9. Calibration: plausibility bands, then targets
- **What the store has:** sourced citywide (2014 vintage) and SEZ-footprint (1985 vintage) series for 1979, 1980 and 1983. There are still no series for the slice's own geography.
- **How they are used:**
  - **Upper bounds:** the slice is a subset of the SEZ and of the city.
  - **Growth multiples between checkpoints:** these carry over better across geographies than levels do.
  - **Ratios** such as spending to revenue.
- **Rules:**
  - The two vintages are never mixed or averaged (protocol §6), and SEZ usual (常住) and temporary (暂住) residents stay separate categories.
  - No point value is interpolated between year ends. A mid-year check is a band between the two year ends.
  - Every target cites its claims with `use: calibration_target`, so the draft compile tags it `[UNVERIFIED]` until a person verifies them.

### 9.1 The 1980-Q2 snapshot: the prologue's goal, and an alternative start
`content/slice/snapshot_1980q2.yaml` has three parts:
1. **Declared facts:** which anchors have fired (the city, Shekou's headquarters and works, forex retention) and which have not (the SEZ). What the prologue has unlocked. The grant at full.
2. **Bands:** the end-1979 checkpoint, a hard check against the year-end claims, and the 1980-Q2 bands, between the end-1979 and end-1980 claims.
3. **The save:** generated once M1's save format exists, by running the prologue with the scripted `historical_prologue` policy and a fixed seed. A save that fails the bands is not shipped. Until then the state body is `placeholder: true`.

It applies no template zones until the store says which zones existed by 1980-Q2 (§5.3).

The same save doubles as a 1980-Q3 start for players who skip the prologue. It enters with the zone's announcement card on top.

### 9.2 The end-1983 checkpoint: the final state before the visit
- **When:** the slice's last state, after 1983-Q4 (§7.2), is compared with end-1983 figures, not end-1984. `content/slice/checkpoint_1983q4.yaml` holds the targets.

| Measure | End 1983 | Claim | Vintage | Used as |
|---|---|---|---|---|
| City residents | 59.52万 | `phase1.pop.city.resident.1983` | 2014 | Upper bound; growth ×1.89 from end-1979 (31.41万) |
| SEZ usual residents (常住) | 16.50万 | `phase1.pop.sez.period_resident.1983` | 1985 | Upper bound; growth ×2.33 from end-1979 (7.09万) |
| SEZ temporary residents (暂住) | 12.00万 | `phase1.pop.sez.period_temporary.1983` | 1985 | Upper bound; a separate category from usual residents |
| City nominal GDP | ¥1.31bn (131,212万元) | `phase1.gdp.city.nominal.1983` | 2014 | Upper bound; growth ×6.7 from 1979 (19,638万元) |
| City budget spending ÷ revenue | 0.96 (15,025 ÷ 15,605万元) | `phase1.fiscal.city.budget_spending.1983`, `.budget_revenue.1983` | 2014 | Shape: from 1.73 in 1979 to about 1.0 |

- **The growth bands** are the multiple × [0.5, 1.5] to start with (`design_note`), and they narrow when the slice's own geography gets sourced figures.

**The remaining plausibility bands** (`design_note`), each replaced by a real target when a claim reaches `verified`:
- the resident population of the slice roughly multiplies over the period, rather than staying flat or exploding;
- processing exports grow much faster than local GDP;
- village rental floor grows faster than planned housing;
- the city runs at least one recurring deficit before 1984, most likely in 1983 when the grant halves;
- readiness before the SEZ visibly changes the size of the first investor wave;
- at least one stalled building appears after a credit tightening.

**Research targets for the slice** (leads to open; record them as claims):
- **the 1979 site register (§3.1):** existence, location and size of each site, starting from the USGS 1969 and 1977 aerial imagery (V15);
- population of Luohu and Shekou (or of the SEZ) by year, 1979–84, with registered and resident counts;
- Shekou Industrial Zone: firms, jobs and output by year;
- county and city budget revenue and spending, and foreign investment used, 1979–84;
- the terms the SEZ opened with in 1980 (tax incentives, what foreign firms could do, leasing);
- the extent, start and first firms of the Shangbu, Bagualing and Shuibei industrial zones, from period plans (§5.3); the dates and places of the first Wanjia supermarket and the Huaqiangbei electronics complex, and any named electronics plant or market inside 1979–83 (§5.4);
- the terms of the 1980s fiscal contracting arrangement (fiscal §13);
- period maps of the Luohu and Shekou areas, for the area boundaries and the 1979 coastline;
- for M2's placeholders (`params/slice.yaml`, `content/slice/start_1979.yaml`):
  - wages by sector in Shenzhen, inland and in Hong Kong, 1979–84;
  - urban-village rents, and floor area per bed in village rooms, dormitories and state flats;
  - village house construction cost and time;
  - the population, jobs and housing floor area of the slice areas in 1979.

---

## 10. The headless runner and tests
- **`apps/cli`**: `slice run --seed N --quarters 21 --policy default` writes a JSON series and a short HTML report.
- **Decision policies:**
  - `default` (first option), `cautious`, `aggressive`;
  - `decline_all` (declines every investor and offer);
  - `historical_prologue` (scripted, for the 1980-Q2 snapshot);
  - plus scripted answers.

  Every card answer goes into the action log (PLAN §6.2).
- **Prologue tests:**
  - every prologue quarter offers at least one decision whose options lead to different states (no empty quarters, §2.1);
  - under `decline_all`, the forex quota still covers one generator before the SEZ fires (no soft-lock);
  - the `historical_prologue` run passes the snapshot's bands (§9.1).
- **The area invariant** (§3): every placed site's area contains its point, and every area is a union of whole proxy subdistricts.
- **Golden runs:** fixed seeds for the three policies. A change that moves their numbers must say so.
- **Invariants** (property tests over random seeds and policies):
  - population conservation: births + inflow − deaths − outflow = Δpop, for every kind and area;
  - the ledger balances every month (fiscal §10), and the month always closes (fiscal §7.1);
  - capacity ignores occupancy, and floor space is never negative (buildings §11);
  - the same seed and the same actions give the same run;
  - no code reads the calendar year for balance (a lint rule, PLAN §6.2).
- **Speed:** 21 quarters headless in under 5 seconds on a laptop.

---

## 11. The 2D UI (ugly on purpose)
- **The map** reuses the Spike A canvas: land use, illegal floor share, occupancy and service gaps as overlays; the slice areas outlined.
- **The turn screen:** the briefing (a front page with the quarter's deltas), the card stack, an end-turn button.
- **The ledger panel:** the three views, obligations by kind, the loan schedule, the forex quota.
- **The area panel:** pops by kind, beds and occupancy, jobs, facilities and gaps.
- **The leaders panel:** the two portraits (placeholders), rapport, the mandate, hints of discipline risk.
- **The review panel:** targets vs actuals during the year.

---

## 12. Build order (small commits, one system at a time)
| Milestone | Contents | Done when |
|---|---|---|
| M1 | `sim-core` package: state, seeded RNG, `step()`, the action log, save and load. Also: `content/slice/areas.yaml` from whole proxy subdistricts, with the area invariant checked by `m1b_sites.py`; the map viewer's slice overlay synced to it (playable vs card-only, replacing the hard-coded Luohu + Shekou sets in `apps/map-spike/src/main.ts`) | The §5.1 tests pass (save, load and continue matches an uninterrupted 63-month run; replay from the log; the pause contract); the area invariant passes. *Status:* done. Rebuild the areas with `pipeline/m1_areas.py`, then run `pipeline/m1b_sites.py` (the invariant); sim-core's tests run in `npm run check` |
| M1b | The 1979 site register: candidate sites with claims, rough geometry, site flags on the map; start state compiled from it | Every site in the start state has a flag and a claim. *Status:* register and flags done; the start state is not compiled yet |
| M2 | Pops, labour, migration, housing (block stocks), village building (§5.2) | At rest, the start state holds still. Under a fixture job shock, the town fills with migrants and village rental floors on its own, illegal floors included. Without M3 there is no job growth, so the shock stands in for investors. M2's tests in §5.2 pass. *Status:* done, with placeholder numbers (`params/slice.yaml`, `content/slice/start_1979.yaml`). Tests: `packages/sim-core/test/m2.test.ts` |
| M3a | Zones, the historical template and historical names (§5.3) | The §5.3 tests pass: free zoning, the template applies, names attach by location, purpose and scale, and M2 runs are unchanged |
| M3b | Industry blocks, production, investors and the preview; investors locate in zones | Accepted investors create jobs, orders and housing demand |
| M3c | Named emergence (§5.4) | Held until an in-window precedent is sourced. Then: a cluster emerges where conditions hold, takes its historical name only near its real place, and can emerge elsewhere under a generic name |
| M4 | Fiscal: ledger, obligations, projects, the loan, the deficit rule; nominal GDP | Overbuilding forces a deficit card; the loan squeezes later years |
| M5 | Leaders, the shortcut, the annual review and the sweep, the climate value, the events, the prologue beats, the SEZ chain, the grant cliff and the closing visit | Each year's review forces a trade-off; readiness visibly changes the first wave; the prologue tests pass; the 1980-Q2 snapshot is generated and passes its bands |
| M6 | The CLI, golden runs, the plausibility report; the 2D UI on the Spike A canvas | All five exit criteria can be checked |
| Playtest | Several full playthroughs; notes in `docs/playtests/` | You want to play it again |

---

## 13. Decisions and open questions
**Decided (2026-11-23):**
1. **Start 1979-Q1, end at the January 1984 visit** (21 quarters). The SEZ's establishment is the major early event.
2. **1979 existing sites are researched and flagged** (§3.1).
3. **Shangbu is included**, though it lies outside present-day Luohu.
4. **Shekou is card-only** for the whole slice.
5. **Quarterly turns.**
6. **A six-quarter prologue** (1979-Q1 to 1980-Q2) with one teaching beat per quarter and constrained powers. The SEZ in 1980-Q3 unlocks the rest (§2.1).
7. **Seven playable areas.** The reservoir hills and Liantang merge into one area (§3).
8. **The whole western cluster, Shekou and Nantou, is card-only** in Phase 1. Phase 1 stays a contiguous Luohu–Shangbu map (§3).
9. **Readiness is one bar of three physical parts:** roads and access, serviced land, water and power. The 1980-Q3 priority choice steers the investor mix (§7.1).
10. **The provincial grant cliff** is the fiscal arc: full to 1982, half in 1983, none in 1984 (§6.7).
11. **Calibration checkpoints:** end-1979, the 1980-Q2 snapshot, and end-1983 before the visit (§9).
12. **Free zoning with an optional historical template** (2026-11-23, §5.3). Zones are explicit entities with stable ids, so names survive edits, saves and replay.
13. **Historical names attach by closeness, not by script:** location, purpose and scale (§5.3). Named emergence follows the same rule (§5.4).

**Still open:**
1. The exact sequence and on-site headcount of the 1979 advance crews (§2.1). Period orders or transport records could reconcile the September account with the later eyewitness dates.
2. Whether the 1979 typhoon becomes an anchor (`phase1.event.typhoon_1979`, lead).
3. The provincial grant's base amount (fiscal §13).
4. **Named emergence in Phase 1** (§5.4): whether any named enterprise, landmark or cluster falls inside 1979–83. If none does, M3c moves to the phase that covers its era.
5. The real extents of the three historical zones, which replace the placeholder squares (§5.3).
