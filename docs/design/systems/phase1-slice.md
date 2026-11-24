# System spec: the Phase 1 slice ("Luohu and Shekou, 1979–1984")
**Status:** map-first revision. [§1.1](#11-map-first-play) and §12's R milestones are the new target. The M sections describe the runnable demo and its regression baseline; in particular §5.3's template action and §5.5's routine offers are baseline mechanics. Decisions taken:
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

### 1.1 Map-first play

One simulation cell is **100 m × 100 m (1 ha)** at every zoom. The 931 × 686 rectangle is the grid extent; area runs and terrain determine playable and buildable land. The top-down municipal view shows relief, water, trunk connections and districts. At core zoom the same cell can show several roofs, yards and internal lanes. These are render-only symbols of stock and use: zooming never creates parcels, changes capacity, advances the RNG or reveals a surveyed village footprint.

The player plans a quarter on the map, previews its cost and crew time, then advances **three monthly steps**. A typical decision is whether to connect and service another industrial block or spend that crew-quarter on homes or a water source. The next quarter should show *where* work finished, which premises filled, and which constraint held the rest back.

- **Plan.** Paint industrial, residential, commercial or public land; replace or cancel unworked cells. Developed settlements are existing stock, not freely erasable zoning. Lay outbound roads and place trunk utilities, facilities and approved landmarks. Internal lanes and distribution hookups are municipal work. A master plan such as Shangbu is a guide: showing it creates no order, reservation or bill. Only the cells the player commits enter the queue.
- **Build.** Each queued cell goes `planned → servicing → serviced`. Crews consume funded work on clearing, levelling, internal streets and hookups over months. Finish accessible frontage before advancing inward; break equal priorities by queue order then cell index. The first finished cell can develop while its neighbours wait. Show progress, pause and remaining cost by cell; record sunk work separately from future commitments.
- **Occupy.** On serviced, reachable land, ordinary private or public builders respond to policy and demand without a decision card. Industrial demand draws on orders and access; worker spending supports commercial premises; housing pressure attracts dormitories and flats. Existing villages can add rental floor and shops without a municipal servicing order. Keep cards for exceptional deals, major works, policy, crises and reviews.
- **Employ and finance.** Occupied floor and utility supply limit operating jobs; active builds post construction jobs. Match reachable vacancies after keeping incumbents. Wage income supports service jobs; vacancies pull migrants, who need beds. Crowding and tolerated additions carry review and fire costs. Taxes and land receipts compete with maintenance, payroll and debt. Headless comparisons must distinguish planned area from occupied floor and approved projects from active work.
- **Inspect.** The map is the primary workspace. A cell inspector distinguishes source/proxy location, proposed use, work remaining, road access, supplied share, jobs and beds. Keep the End Quarter control, demand and fiscal summary visible; detailed ledgers and political decisions can open over the map.

**R1 spatial contract.** `buildings-and-construction.md` §13.1 owns the layers. The first increment compiles `sites_1979.yaml` with `data/starts/slice_site_cells.json` through `compileSlice` for both CLI and browser. Each playable point has its register ID, bilingual name, kind, area, proxy source/confidence, claims with their uses, projected `[x,y]` and nearest in-city land `[x,y]` for area validation. Rebuild the projection with `python -I pipeline/m1b_sites.py` using the M1b inputs. Draw the projected point, even at the border; never treat the validation cell as a road, serviced hectare or extra population. Card-only sites have no playable marker. Unplaced sites stay in the register; no straight lines inferred between endpoints. `site.shangbu_land` is a landscape point, distinct from `precedent.zone.shangbu_industrial`. The second increment adds the persistent records: cell works with their stage and sunk work, and the placed water and power sources and facilities. It also rebuilds the derived views (road frontage, interior reach and shared utility supply) from loaded state on every call, and never saves them (§13.1 "Persistent records" and "Derived views").

**Temporary routes.** The researched alignments of `site.kcr_line` and `site.guangshen_road` remain unplaced. For play, `content/slice/start_network.yaml` explicitly supplies temporary orthogonal waypoints for their core segments. Names and existence claims come from those register IDs; the waypoints carry no geometry claim. The map keys the two line styles as temporary. At the 3D branch merge replace these paths against the shared grid, keeping the IDs; importing a mesh is not required. The road can demonstrate frontage in the planning view; the railway is a separate transport layer and confers no municipal utility access.

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
interface Sweep { until?: YM }  // active from its answer through until; the visible vs real gap itself is leadership §4.4's
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
interface CardInstance { id: string; card: string; options: string[]; interrupting: boolean; raisedAt: YM;
  payload?: Record<string, unknown>; expires?: YM }   // M3b, §5.5: plain JSON for the card's system; when it lapses
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
1. It applies `actions` first. Each answer must name a pending instance and one of its options, or `step()` throws. The answer is logged and the card moves to `answered` with its option, for its system to act on in the next tick (§5.5).
2. If an interrupting card is still pending, it returns `{ status: 'paused', state, pendingCards }` without advancing the month.
3. Otherwise it runs the 14 tick steps of §6 in order. These are named functions, all no-ops in M1 except `statistics`, which appends the month to `history.months`. Then it advances `date`, `subStep` and `turn`, and returns `{ status: 'advanced', state, events, stats }`.
4. Past the last turn, no month runs. Cards that the last month raised (the closing event) can still be answered, and only answers are accepted: a turn action throws, since no turn is left for it to act in. A call that clears them returns `{ status: 'finished', state }`. A call with nothing left to answer throws.

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
- Loading runs the migration table from the saved `version` up to the current one. Version 1 is the first. Version 2 (R1) adds `cellWorks`, `structures` and `nextStructureId`, and its migration defaults them to empty (`buildings-and-construction.md` §13.1). Version 3 (R2) adds `roads`, `worksOrders` and `nextOrderId`, and the header's content gains `network_sha256` (§13.2).

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
- **Matching:** each month from scratch. Jobs are filled within the area first, in `AREA_ORDER` and `SECTORS` order. Leftover vacancies then take unemployed workers from the other playable areas: per sector and kind (in `fill_order`), the slice's idle workers are split across the areas' remaining vacancies by largest remainder, so no area is staffed first because of its id. A cross-area worker counts as employed in their home group. *R4 replaces this with incumbency, turnover and road reach (§5.11).*
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
- **Allocation:** weights are the area's vacancies in sector(k) plus its free rental beds under `crowding_max`, counted after this month's outflow. No area takes more than its free beds; an area's overflow is shared again among the areas that still have free beds (by the same weights), until everyone is placed or no bed is left. Whoever finds no bed in the slice does not come: that inflow is lost, not stored, and so is the whole inflow when every weight is zero. *From R4 the bedless are recorded as turned away and raise rents and building (§5.11).* An area with no rental beds at all (area 6 at the start) takes no migrants, so its villagers never see rental demand: intended for the rural north until content seeds it.
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
- **Rest:** the start params set `base_exit` and `nonreturn` to 0, so exits come only from unemployment and crowding, and the start is a fixed point. A churn with replacement inflow needs a vacancy mechanism that M2 does not have (matching backfills vacated jobs with locals). *R4's incumbency leaves a new post vacant until an idle worker or a migrant takes it, and migrant turnover lets idle locals into jobs migrants held (§5.11). A departed migrant's job is still backfilled by idle locals first. The start params keep the rest point.*
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
  servicedShare?: number;     // M3b hook (§5.5): the share of its buildable cells serviced (三通一平), 0–1; absent = 1
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

**Applying the template** is not an action of its own. The pure helper `templateZoneAction(state, precedent)` returns a `create_zone` for the precedent's cells, clipped to playable cells not already zoned, with `template` set. The UI and the `historical_prologue` policy use it. The log records the `create_zone`, so replay needs no content beyond the precedents. The log keeps its own deep copy of every action.

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
- **Compiled at load:** `compilePrecedents(raw, areas)` validates the ids, kinds and uses, and turns each placed geometry into sorted cells clipped to the grid, with their centroid. `createTickSteps(params, { precedents })` takes the result (§5.5). Precedents never enter `GameState`, and the save header gains `precedents_sha256`.
- **The template** is the placed zone precedents. The overlay is drawn by the renderer from content and touches no state.

**Name matching** (tick step 3, before investors look for sites). Each month, a pure function of the zones, the precedents and `params.zoning.names`, with no RNG, gives each zone at most one precedent and each precedent at most one zone:
1. **A pair matches** when all of these hold:
   - **purpose:** the zone's use equals the precedent's;
   - **location:** the zone covers at least `min_overlap` of the precedent's cells, or the two centroids are within `max_offset_cells`;
   - **scale:** the zone's cell count ÷ the precedent's is within [1 ÷ `max_scale_ratio`, `max_scale_ratio`];
   - the precedent is placed, and the zone has no custom name.
2. **Keeping:** a zone keeps last month's precedent while the pair still matches, so drawing a better match later does not take the name away.
3. **The rest are assigned greedily by score**, highest first: `w.overlap × overlap share + w.offset × max(0, 1 − offset ÷ max_offset_cells) + w.scale × (1 − |ln ratio| ÷ ln max_scale_ratio)`. The offset term floors at 0, since a pair can match on overlap alone with its centroids further apart than `max_offset_cells`. Ties go to the lower zone id, then to the precedent's order in the file.
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

### 5.5 Industry, production and investors (M3b)
Investors arrive as cards. The player sites each one in an industrial zone or, for a small processing contract, in existing premises. The accepted firm builds, hires and produces. Housing demand follows through M2: construction jobs while the factory rises, factory jobs once it opens, migrants to fill them, and dormitory beds when the deal includes them.

**Content passed to the tick, never stored in state** (like the precedents, §5.3):
```ts
createTickSteps(params, content?: { precedents?: Precedent[]; investors?: InvestorArchetype[]; buildable?: Buildable })
```
- **Without investors,** no offer is raised, so M2's and M3a's runs are unchanged.
- **Without the buildable layer,** every zone cell counts as buildable.
- **The save header gains** `investors_sha256` and `buildable_sha256`.

**State added by M3b.**
```ts
type Ownership = 'hk_processing' | 'inland_soe';   // before the SEZ; M5a adds joint ventures, foreign and overseas Chinese firms (§5.7)
interface Firm {
  id: number;                     // from nextFirmId, never reused
  archetype: string;              // the investor archetype id
  ownership: Ownership;
  sector: 'factory';              // a labour sector (§5.2); processing vs manufacturing is the ownership (fiscal §8.1)
  area: number;                   // copied at siting: the firm stays put when its zone is edited or removed
  zone?: number;                  // the zone it was sited in; absent in existing premises
  premises: 'new_factory' | 'existing';
  jobs: number;                   // at full ramp
  floorM2: number; dormM2: number;     // built in its area's block stock as standard_factory and dormitory
  powerKw: number; waterM3Day: number; // needs at full ramp
  accepted: YM; opens?: YM;       // set when its factory cohort completes; the month after acceptance in existing premises
  posted: number; staffed: number;     // this month's factory jobs posted and filled (tick step 5)
  output: number;                 // this month's gross output, yuan (tick step 6)
}
interface AnsweredCard { card: CardInstance; option: string }   // answered, awaiting its system's tick
// GameState gains: firms: Firm[] (id order); nextFirmId: number; answered: AnsweredCard[]
// CardInstance gains: payload?: Record<string, unknown> (plain JSON); expires?: YM
// History gains, per month: firmJobs (posted), firmStaffed, output, exports, valueAdded (nominal yuan)
```
- **Answers reach their system through `answered`.** `step()` moves each answered card there with its option. The tick's systems read it, and `step()` clears it after the tick. A paused call keeps it, so an accept given beside another interrupting card takes effect when the month runs.
- **Building archetypes:** §5's six. The four housing archetypes (village house, state flats, village rental, dormitory) supply beds. `standard_factory` supplies workplaces. `shop_market` has no builder until a later milestone. A completion's builder comes from its archetype: village rental → village household; standard factory and dormitory → investor.

**Investor archetypes** (`content/slice/investors.yaml`): who they are, what they may do, and the claims behind them. Their numbers are in `params/slice.yaml` under the same id.
```yaml
- id: investor.hk_processing
  name: { zh: 香港来料加工, en: Hong Kong processing contract }
  ownership: hk_processing
  existing_premises: true      # the local side supplies premises and labour (phase1.industry.processing_contract)
  claims: [ { id: phase1.industry.processing_contract, use: design_note } ]
- id: investor.inland_state_unit
  name: { zh: 内地国营单位, en: Inland state unit }
  ownership: inland_soe
  existing_premises: false
```

**Offers** (tick step 3, after zone names). Each month:
1. **Lapse:** an investor card past `expires` is removed, and the investor walks away (event `offer_lapsed`).
2. **Resolve** each answered investor card, in answer order:
   - `decline`: the investor leaves (event `offer_declined`).
   - `accept:zone:<id>` or `accept:premises:<area>`: the site is checked again, since the zone may have been removed or filled since the options were set. If it still fits, the firm is created. If not, the investor walks away (event `offer_failed`). So of two accepts into a zone with room for one, the first wins.
3. **Refresh the options** of pending investor cards, so a zone drawn after a card arrived shows up the next month:
   - every industrial zone with room for the firm, in id order (`accept:zone:<id>`);
   - for an archetype with `existing_premises`, every playable area with premises room (`accept:premises:<area>`);
   - `decline`, always last.
4. **Arrivals:** each archetype makes an offer with probability `rate_per_quarter ÷ 3` (stream `investment`). The offer's size is drawn, its options are set as in step 3, and it is raised as a non-interrupting card with the offer as its payload. It expires after `offer_months`, which is longer than a quarter because `runQuarter` does not stop between months.

**Siting and capacity.**
- **A zone's floor capacity** = its buildable cells × `servicedShare` (absent = 1) × 10,000 m² × `industry.max_far`. Its use is the floor and dormitory area of the firms sited in it. A firm fits when use + its floor + its dormitory ≤ capacity. Only `industrial` zones host firms in M3b.
- **Plan vs. fact:** editing or removing a zone leaves its firms running in their area (non-conforming). Capacity only gates new firms. A zone changed to another use takes no new firm.
- **Existing premises** (archetypes with `existing_premises` only). The local side of a processing contract supplied the premises and labour (`phase1.industry.processing_contract`). So the first contracts can use the town's and villages' existing buildings before any zone exists.
  - In each area, the jobs of firms in existing premises stay ≤ `industry.premises_jobs_per_area`.
  - Such a firm builds nothing, opens the month after acceptance, and produces at `industry.premises_output_factor`.
- **Buildable cells** come from `data/starts/slice_buildable.json`, compiled by `pipeline/m3b_buildable.py`. A cell is buildable if it is land on the present-day DEM, not water in the 1979 Landsat mask, and its slope on the 100 m grid is ≤ `slope_max_pct`.
  - **It is a placeholder layer:** its inputs are git-ignored, the 1979 water mask is an automatic threshold (`lead`), and the DEM is present-day.
  - **Zoning unbuildable cells stays legal** (§5.3). They add no capacity.
  - **The layer records the `areas_sha256` it was compiled from.** sim-core refuses a layer compiled from other areas or another grid.

**Building.** An accepted firm in a new factory starts its `standard_factory` floor and its `dormitory` floor under construction in its area's block, permitted. M2 does the rest: construction jobs while it rises, dormitory beds once it is complete.
- **Work, not dates.** Every cohort under construction carries `workDone` and `workTotal` (months of work, integers), and the firm's cohorts carry `firm`. The construction step adds a month of work to each, and completes a cohort when its work is done. `due` stays as the estimate shown to the player.
- **Work begins in the month of acceptance**, so a firm's factory completes `build_months − 1` months later. A village rental cohort starts after that month's work, so its timing is M2's.
- **The firm opens when its factory cohort completes**, not on the estimate. So when M4 makes a month's work depend on construction capacity, or stalls a cohort, a late factory opens late with no change to the firm code.
```ts
interface Cohort { /* buildings §2.2, M2 */ workDone?: number; workTotal?: number; firm?: number }   // M3b, while under construction
```

**Jobs and production** (fiscal §8.1: `output = min(orders, staffed, floor, utilities)`).
- **Posting (tick step 5, beside the base jobs).** Each month, an open firm posts the smallest of four counts (each rounded down) as factory jobs in its area:
  - **ramp:** jobs × min(1, months open ÷ `ramp_months`), counting the opening month as 1;
  - **floor:** jobs, since only an open firm posts and its floor is complete;
  - **utilities:** jobs × the area's utility share, min(1, capacity ÷ the open firms' needs), for power and for water;
  - **orders:** jobs × `industry.order_index` (1 until M5's Hong Kong demand series).
- **Staffing.** An area's filled factory jobs are shared between its base jobs and its firms by largest remainder over their posts. People who leave later in the month (the crowding cap, migration) take their jobs out of the rows, and each trimmed row is shared out again, so a firm's staffing never exceeds its row's.
- **Production (tick step 6).**
  - output = staffed × `output_per_job_month[ownership]`, × `premises_output_factor` in existing premises;
  - exports = output × `export_share[ownership]` (for processing, the gross shipment counts in trade statistics);
  - value added = output × `value_added_ratio[ownership]`. Nominal yuan only (fiscal §11).

  Because staffed ≤ posted ≤ each cap, output = min(orders, staffed, floor, utilities).
- **Utilities.** `SliceArea.utilities` (`waterCap` in m³ per day, `powerCap` in kW) start from `start_1979.yaml`, as placeholders.
  - They are the spare capacity for new industry: enough for the first contracts, and low enough that growth hits a utility bottleneck, which M4's mains and lines relieve.
  - Households draw nothing from them in M3b.

**The preview** (fiscal §7.2). `previewOffer(state, card, params, content)` is a pure function. For each site option it gives:
- jobs, the months until it opens (`build_months − 1` for a new factory, 1 in existing premises), the floor and dormitory built, and the zone's free floor or the area's free premises jobs;
- beds needed: jobs − dormitory beds, which is every job in existing premises;
- power and water needed, against what is free in the area;
- per year at full ramp: gross output, exports and value added.

**Deferred.**
- **To M4** (specified in §5.6):
  - the preview's cash this quarter, retained tax and new obligations. They need the fiscal regime.
  - **Serviced land (三通一平):** M4's site-preparation projects set a zone's `servicedShare`, which M3b already reads: road access, water, power, and cleared, level ground. A connected site stays distinct from one with spare water and power to operate.
  - **Construction capacity:** factories, roads, utilities and site preparation draw on one monthly pool of work, supplied by local labour and by teams that join it (contracted county crews, the Engineering Corps, outside state companies). A dedicated contract waives a project's draw on the pool but not its cost or time. Village self-build stays outside the pool.
- **To M5** (specified in §5.7, M5a):
  - the guaranteed first contract in 1979-Q2, and the post-SEZ origins with their incentives;
  - readiness and the first wave;
  - Shekou capturing declined investors, and the deal-maker's shortcut.

**Params** (`params/slice.yaml`, placeholders):
- **`industry`:** `max_far`, `premises_jobs_per_area`, `premises_output_factor` and `order_index`, plus per ownership:
  - `output_per_job_month`, `value_added_ratio` and `export_share`;
  - `floor_m2_per_job`, `power_kw_per_job` and `water_m3_day_per_job`.
- **`investors`:** `offer_months`, plus per archetype:
  - `rate_per_quarter`, `jobs: [min, max]` and `dorm_beds_per_job`;
  - `build_months` and `ramp_months`.

**M3b's tests:**
- **The loop:** with a fixture firm and no cards:
  - construction jobs while it is built;
  - factory jobs once it opens, and migrants to fill them;
  - dormitory beds;
  - output, exports and value added.
- **Offers:**
  - arrivals follow the seed;
  - options list the industrial zones with room, existing premises and `decline`;
  - a zone drawn after the offer shows up in the next month's options (through `runQuarter`);
  - accepting creates the firm, declining and lapsing don't;
  - an accept beside a pending interrupting card takes effect once the pause clears, and replays.
- **Capacity:**
  - a one-cell zone takes one firm and refuses the second;
  - of two accepts into it in one call, the first wins;
  - a removed zone leaves its firm running, in its area.
- **Utilities:** a small power cap binds output.
- **Sums:**
  - a firm's floor equals the block's factory floor;
  - firm plus base staffing equals the row's filled jobs;
  - the M2 invariants hold.
- **Determinism:** save, load and continue, and replay, with firms and offer cards. Input not changed.
- **No effect without content:** with no investor archetypes, M2's and M3a's runs are unchanged.

### 5.6 Fiscal, projects and construction capacity (M4)
The city earns, owes, borrows and builds. Every yuan moves through one ledger (fiscal §2). Recurring revenue pays recurring obligations. Projects spend as their work is done, and leave obligations behind them when they finish. The firms' factories and the city's works compete for one monthly pool of construction capacity. Site preparation (三通一平) is what turns a zone into land that investors can use.

**Content passed to the tick, never stored in state** (as in §5.3 and §5.5):
```ts
createTickSteps(params, content?: { …; fiscal?: FiscalContent })
interface FiscalContent { regimes: Regime[]; projects: ProjectTemplate[]; teams: TeamTemplate[] }
```
- **Without `fiscal`:** finance does nothing, no project or team action is accepted, every cohort under construction gets its month of work as in M3b, and zones keep `servicedShare` absent (= 1). So M2's and M3's runs are unchanged. This is tested, and it is the golden-run argument for this milestone.
- **With it:** everything below runs. The save header gains `fiscal_sha256` (the three files together).
- **Actions owned by a system:** a tick step may declare `act(state, action)`. `step()` offers it every turn action that is not a core one (§5.1); an action that no step handles throws, as an unknown action does now. The project and team actions below are the finance step's. They are logged like zone actions and refused while an interrupting card is pending.

**State added by M4** (the Phase 1 subset of fiscal §3).
```ts
type AccountId = 'general' | 'land' | 'debt' | 'forex';      // forex is a quota to buy, in USD; never added to yuan
type TxType = 'tax' | 'grant' | 'land_fee' | 'obligation' | 'project' | 'loan' | 'retention' | 'import';
interface LedgerEntry { date: YM; type: TxType; account: AccountId; amount: number; ref: string }   // integer yuan (USD for forex)
interface Obligation { id: number; kind: 'payroll' | 'service' | 'maintenance' | 'transfer' | 'arrears';
  perMonth: number; index: 'none' | 'wages'; baseWage?: number; from: YM; until?: YM; createdBy: string }
interface Loan { id: number; kind: 'project' | 'short'; principal: number; rate: number;
  schedule: { date: YM; principal: number; interest: number }[]; taken: YM }
interface Project {
  id: number; template: string; kind: ProjectKind;          // from nextProjectId, never reused
  area: number; zone?: number; cells?: CellRuns;            // site preparation: the cells it services, fixed at commit
  budget: number; spent: number;                            // integer yuan; spending follows the work done
  crew: number; workTotal: number;                          // crew units at full pace; months of work at full pace
  workDone: number; crewBank: number;                       // integers (below)
  priority: 'high' | 'normal' | 'low'; contract?: number;   // a dedicated team contract
  committed: YM; completed?: YM;
  stage: 'committed' | 'building' | 'stalled' | 'done' | 'cancelled';
  waiting?: 'capacity' | 'finance' | 'mobilization' }        // why it did not get a full month this month
type ProjectKind = 'road' | 'water_main' | 'power_line' | 'site_preparation' | 'school';
interface TeamContract { id: number; team: string; mode: 'pool' | 'dedicated'; project?: number;
  crew: number; signed: YM; starts: YM; ends?: YM }          // starts after mobilisation; pool contracts end
interface FiscalState {
  regime: string; balances: Record<AccountId, number>; ledger: LedgerEntry[];
  obligations: Obligation[]; loans: Loan[]; projects: Project[]; contracts: TeamContract[];
  nextId: { obligation: number; loan: number; project: number; contract: number };
  projectLoan: 'not_offered' | 'offered' | 'declined' | 'taken';
  loanWanted: boolean;                                      // a commit this month left money for projects below zero
  deficit?: { turn: number; option?: DeficitOption };     // this quarter's card and its answer
  austerity: number;                                        // this month's cut share of the cuttable obligations
}
type DeficitOption = 'borrow_short' | 'use_land_money' | 'austerity';
// GameState gains: fiscal: FiscalState; servicedLand: CellRuns (serviced cells, sorted runs)
// SliceArea gains: roadKm (completed city roads in the area)
// Cohort gains: crewBank?: number (pool work banked toward the next month of work)
// History gains, per month: gdp, revenue, obligationsDue, baselineDue, obligationsPaid, projectSpend, reserve, debtOutstanding, austerity
```
- **Integer money.** Every ledger amount is a whole yuan, rounded once when the entry is written. So "Σ entries = Δ balance" holds exactly, per account.
- **The ledger is append-only.** `cloneState` copies the array and shares the entries. There is no compaction in Phase 1: 63 months write about a thousand entries.
- **No stock goes negative:** `general`, `land` and `debt` balances, the forex quota and loan principal outstanding are all ≥ 0 at the end of every step.

**Content.**
- `content/slice/fiscal_regimes.yaml`: `regime.county_1979` and `regime.contracting_1980s` (fiscal §11, `lead`). Each has its tax rates by ownership (placeholders), its retained share, its land-use fee schedule, whether land money may pay recurring spending (`sanctioned | grey | forbidden`), and the provincial grant schedule.
  - **The grant schedule is dated content citing claims** (fiscal §4.2): factor 1 from the start, 0.5 from 1983-01 (`phase1.fiscal.provincial_base.1983`), 0 from 1984-01 (`.1984`), unchanged through 1982 (`.1982`). The retained share of 1 cites `phase1.fiscal.contracting_retain`. All `fiscal_rule`, so the draft compile tags them `[UNVERIFIED]`.
  - **M4 applies the schedule.** The budget cards, the four-quarter warning and the switch to `regime.contracting_1980s` at the SEZ event are M5's (§7.1).
  - **Land-use fees** start at zero in the county regime. In the contracting regime they start from the land rules' in-force date (`phase1.event.land_rules_1981`); the rate is a placeholder, with the 1981 ranges as `design_note` (`land.regulations_1981`, lead).
- `content/slice/projects.yaml`: the project templates (who and what, names in both languages, claims). Their numbers are in `params/slice.yaml` under the same id, as for investors.
- `content/slice/teams.yaml`: the construction teams that can join (below).
- **Citations.** Content cites only claims that are in the store. The M4 research claims that are still waiting for intake (the Construction Bank loan, the ¥90/m² Luohu servicing estimate, the Lufeng crews, Guomao, the cultural programme, Shenzhen University) are named in this section and the research notes. They enter content when they are in the store.

**Revenue (tick step 11, posted to the ledger in this order).**
- **Taxes on the firms:** Σ firm value added × `tax.value_added_rate[ownership]` × `collection_efficiency` × `local_share`, to `general` (ref `tax.industry`).
- **The existing economy:** `county_base_revenue_per_month` to `general` (ref `tax.county_base`): the town's and the county's taxes and fees, flat in Phase 1.
- **The provincial base grant:** `provincial_base_grant_per_year ÷ 12 ×` the schedule's factor this month, to `general` (ref `grant.provincial_base`). It counts as recurring revenue.
- **Land-use fees:** each firm in a zone pays the regime's fee × its land (floor ÷ `industry.max_far`) ÷ 12, to `land` (ref `land_fee`).
- **Forex retention:** exports this month × `forex.retention_share` ÷ `forex.yuan_per_usd`, added to the quota (`forex`, USD, ref `retention`). The rule cites `forex.retention.start`; its share is a placeholder.

**Obligations (step 11).** Due this month:
- **Baselines** (fiscal §6.1), recomputed monthly: `county_base_obligations_per_month` + `admin_per_resident_month` × residents (Σ `stayedSixMonths`) + `police_per_present_month` × present + `sanitation_per_m2_month` × completed floor in the slice. Compulsory schooling waits for children in the pops (deferred).
- **Live obligations:** each record with `from ≤ date` and no `until` before it. `index: 'wages'` scales `perMonth` by the state wage now ÷ `baseWage`.
- **Debt service:** each loan's schedule entry for this month, principal plus interest.
- **Arrears** from last month.

**Paying, and the deficit rule** (fiscal §7.1). The month always closes, and closes balanced, before any card is answered (§5.1).
1. **The reserve:** pay what is due from `general`, up to its balance.
2. **A shortfall** is resolved in this order, each covering what it can:
   1. this quarter's deficit answer, if the card was answered;
   2. the default: short-term borrowing up to capacity, then austerity;
   3. arrears: whatever is still unpaid becomes an `arrears` obligation due next month (event `arrears`; unpaid payroll is flagged for M5's stability).
3. **The deficit card** (interrupting, once a quarter): when a month has a shortfall and no card has been raised this quarter, it is raised and the month's shortfall goes straight to arrears. The answer holds for the rest of the quarter. Options, the headless default first (so `firstOption` gives fiscal §7.1's default):
   - `borrow_short`: a short-term loan of the shortfall, up to borrowing capacity, at `short_loan.rate_month`, repaid in equal principal over `short_loan.term_months`. It lowers capacity;
   - `use_land_money`: pay from `land`. When the regime says `grey` or `forbidden`, the amount is recorded as event `land_for_recurring`, for M5's scrutiny;
   - `austerity`: leave unpaid up to `austerity_max_cut` of the cuttable obligations (baselines, payroll, service), split over the lines by largest remainder, so no line is cut by more than it owes. The cut is forgiven, not owed, and `fiscal.austerity` records the share for M5's service gaps and mood.
- **Borrowing capacity** (fiscal §7, simplified): `short_loan.revenue_multiple` × the last 12 months' recurring revenue − short-term principal outstanding, never below 0. The full debt-service-cover and collateral rule waits for a later phase.

**The state-bank project loan** (fiscal §11: one in the slice).
- **When it is offered:** when a project commit leaves *money for projects* below zero, and the loan is neither taken nor pending. The commit sets `loanWanted`, and step 11 raises the card at the end of the month. M5 adds the offer at the 1980-Q1 budget briefing (§2.1). The card is non-interrupting, with options `take` then `decline`, and expires after `loan.offer_months`, which must be above 3 so the offer outlives the quarter it is raised in (as for investors, §5.5). Cancelling the commit that wanted it, in the same turn, clears `loanWanted` when money for projects is no longer below zero. A declined or lapsed loan is offered again at the next such commit, until it is taken.
- **Its terms** are placeholders: `principal`, a monthly `rate`, interest only for `grace_months`, then equal principal over `term_months`. The proceeds go to `debt` and pay only for projects. Debt service comes due from `general`. So a loan taken early squeezes the years after its grace period, not the year it is taken. Cumulative guaranteed bank lending of the period (`phase1.fiscal.guaranteed_infrastructure_loans`) is context, not this loan's size.

**Projects** (fiscal §6.2).
- **Committing:** `{ type: 'commit_project'; template: string; area?: number; zone?: number; priority? }`. It is valid when:
  - the template exists;
  - the target fits its kind: a playable area for roads, mains, lines and schools, an existing zone for site preparation, which must have buildable cells that are neither serviced nor in a live site-preparation project;
  - the forex quota covers the template's `forex_usd`, which is drawn at once (`import`).

  An invalid commit throws, like an invalid zone. Money is not a validity test: an unfunded commit is allowed, shows as negative money for projects, and offers the loan.
- **Budget:** the template's `budget`, or for site preparation `budget_per_cell` × its cells. The cells are the zone's buildable cells outside `servicedLand` and outside every live site-preparation project at commit, frozen in the project. So land is never paid for, or maintained, twice.
- **Other actions:** `set_project_priority { project; priority }`; `cancel_project { project }`, which stops the work and books `cancel_penalty` × the unspent budget as a one-month `transfer` obligation. What was spent is sunk.
- **Spending follows the work.** A month's work on a city project costs its pro-rata share of the budget: spent after = round(budget × crew-units delivered so far ÷ (crew × workTotal)). So the total spent is exactly the budget at completion. It is paid from `debt`, then `land`, then `general`. `general` is drawn only down to `reserve_months` × last month's obligations due (in the first month, × this month's baselines), so the recurring side keeps its reserve.
- **Waiting for finance:** a project whose month cannot be paid gets no work that month (`stage: 'stalled'`, `waiting: 'finance'`) and resumes when money returns. `stalled` and `waiting` describe this month only: a project that waits for capacity is `committed` or `building`, never `stalled`. This is buildings §4's stall, for a city project that loses its funding.
- **Completion** applies the template's asset, then its obligations:
  - `road`: `roadKm` in its area (readiness reads it in M5);
  - `water_main`, `power_line`: `waterCap` or `powerCap` in its area (§5.5's spare utilities);
  - `site_preparation`: its cells join `servicedLand`;
  - `school`: `schoolPlaces` in its area, plus `payroll` (staff × the state wage, `index: 'wages'`) and `service` per place;
  - every kind: `maintenance` = budget × `maint_rate_year` ÷ 12.

**Serviced land (三通一平, the §5.5 hook).**
- **Serviced land is a property of the land, not of a zone.** `servicedLand` holds the serviced cells. In tick step 3, before names and offers, and again in step 4 once the month's work is done (so site preparation finished this month counts at once), each zone's `servicedShare` is set to its buildable cells in `servicedLand` ÷ its buildable cells (0 when it has none). Offers already raised keep their options; the next month's offers can site in the zone. So an edit that adds cells lowers the share until they are serviced, and removing a zone leaves its land serviced for the next. From R2, municipal works orders (`buildings-and-construction.md` §13.2) join the pool's queue as a third job type, and their unspent budgets count as commitments. Site preparation skips cells that have works.
- **The start:** `servicedLand` is empty. The 1979 town has no serviced industrial land (a placeholder, like the start utilities). The first contracts use existing premises (§5.5).
- **Connected is not supplied.** Site preparation adds floor capacity for new firms. It adds no water or power: a serviced zone can still have a utility bottleneck, which only mains and lines relieve (§5.5).
- **Rights and compensation** are not settled by levelling. Village compensation is part of readiness's serviced-land part in M5 (§7.1).
- **Evidence:** the 1979 report proposes that an outside contractor deliver "几通一平" for an export processing zone. Early Luohu–Shangbu works are described as "七通一平". [Construction capacity research](../../research/phase1-m4-construction-capacity.md). 三通一平 is the playable minimum, not a historical label for every site. The Luohu servicing estimate of ¥90 per m² of gross land (`phase1.fiscal.luohu.site_servicing_estimate.1980`, sourced, awaiting intake) is a five-connection package. It is the candidate for `budget_per_cell` once it is in the store.

**The construction-capacity pool.**
- **Units.** A *crew unit* is one organised worker-month of formal construction capacity. A job's `crew` is the crew units it uses a month at full pace. A firm's cohort has `crew = max(1, ceil(m² × capacity.crew_per_m2))`. A project's `crew` is a template param.
- **Work stays in months, and stays integer.** Each month a job is given an integer number of crew units, at most its crew. They go into its `crewBank`. Whenever the bank holds a full crew, `workDone` gains a month and the bank loses a crew. Completion is still `workDone ≥ workTotal`. A job given its full crew every month advances one month a month, exactly as in M3b. One given half advances every second month.
- **Supply each month:** `capacity.local_crew` (the county's own builders: a param, so the pool does not depend on this month's employment, which step 5 computes later) + the crew of every pool contract active this month.
- **Demand:** every firm cohort under construction, and every city project being built without a dedicated contract.
- **Allocation:** in priority order (`high`, `normal`, `low`; firm cohorts are `normal`), then by start month, then firm cohorts before projects, then by id. Each job takes min(its crew, what is left, the work it has left), so a job's last month passes any spare units down the queue. The last job served may get a partial share; later ones get none (`waiting: 'capacity'`). No proportional sharing: a queue finishes things, and the player sees what is waiting and why.
- **A firm's two cohorts are two jobs,** the factory first. Under scarcity the dormitory can finish later than the factory. The firm opens when its factory completes (§5.5), so a late factory opens late with no change to the firm code.
- **Outside the pool:**
  - **Village self-build** (§5.2): it keeps its month of work every month;
  - **a project with a dedicated contract:** its work comes from its contract's crew from the contract's `starts` month (`waiting: 'mobilization'` before it). A contract crew smaller than the project's crew makes the project slower. The contract waives the pool draw, not the project's cost or its time. Dedicated projects take their place in the same priority order, drawing only money, so when money is short a high-priority pooled project is paid before a low-priority dedicated one.
- **The labour market is unchanged:** construction jobs still come from m² under construction (§5.2). The pool limits how fast formal work advances, not how many jobs are posted. City projects post no construction jobs in M4; their crews' housing (works camps) is M5's (§8 `corps`).

**Teams that join** (`content/slice/teams.yaml`, numbers in `params.teams`).
- **A contract:** `{ type: 'contract_team'; team: string; mode: 'pool' | 'dedicated'; project?: number }`. A dedicated contract names a project that is not done and has no contract yet. The template lists the modes it allows. A team holds one live contract at a time.
- **Timing:** a contract starts `mobilization_months` after signing. A pool contract then lasts `duration_months`. A dedicated one lasts until its project is done or cancelled.
- **Cost:** a pool contract creates a `service` obligation of `cost_per_month` from signing to its end. A dedicated contract costs nothing extra: its work is paid through the project's budget.
- **One crew, one mode:** a contract is either a pool bonus or a project exemption, never both.
- **The Phase 1 teams** (names `lead`; each is a design category):
  - `team.county_crew` (外县施工队, contracted county crews), dedicated. The historical example is the Lufeng crews on the first Shennan Road section (`phase1.shennan.lufeng_crew`, `phase1.shennan.luoxi_arrival`, awaiting intake). Their two counts have different scopes. Neither is added to the other, and neither is the param;
  - `team.engineering_corps` (基建工程兵), pool. Its advance units and the 1982 deployment are M5's cards (`phase1.event.construction_corps_first_units`, `phase1.event.construction_corps_arrival`). In M4 it can be contracted by action, for tests and for the CLI;
  - `team.outside_soe` (外地国营建筑公司, an outside state construction company), dedicated or pool.

**Nominal GDP** (fiscal §8.2: production approach, nominal only in Phase 1).
- **GDP** = Σ value added this month:
  - **firms:** value added as in §5.5;
  - **the existing economy:** for each base job row, its base jobs × the row's fill rate × `gdp.base_va_per_job_month[sector]`;
  - **construction, as the work is done:** the value of the month's work × `gdp.construction_va_ratio`. The value is a city project's payment, a firm cohort's m² × `construction.cost_per_m2[archetype]` ÷ `workTotal` for each month of work it gains, and a village cohort's m² × `village_build.build_cost_per_m2` ÷ its duration.
- **Not in GDP:** the grant, loans, land fees, retention and transfers (fiscal §8.2).
- GDP needs only `params`, so it is computed with or without the fiscal content.
- **Timing:** firm value added is from step 6's output; the base rows' fill rates are read in step 13, after any staff the housing and migration steps took out (M3b's trims, §5.5). In a month with an outflow the two parts are measured a few steps apart. This is accepted for Phase 1; M6 checks whether it moves the calibration.

**Views** (fiscal §7). `fiscalViews(state, params)` is pure. Obligations by kind are this month's (the date in the state), the baselines included; recurring money is last month's series. It returns:
- **recurring money available:** last month's recurring revenue − obligations due, per month and ×12;
- **money for projects:** `general` above the reserve floor + `land` + `debt` − Σ unspent budget of live projects;
- **import access:** the forex quota in USD;
- **borrowing capacity** (shown inside the loan and deficit cards);
- **obligations by kind** and the loans' schedules.

**The preview** (fiscal §7.2, completing §5.5's). With fiscal content, `previewOffer` adds per site, still pure and with no RNG:
- **cash this quarter:** the land-use fees for its first three months in a zone (0 in existing premises and in the county regime);
- **retained tax per year** at full ramp: its yearly value added × the current regime's rate × collection × retained share. A scheduled regime change is a note, not computed;
- **new obligations per year:** for the people it brings (its jobs, counted as residents and present) × the admin and police baselines, plus sanitation on the floor it builds, ×12.

**Params** (`params/slice.yaml`, placeholders): `fiscal` (`start_regime`, `start_balances` (`general`, `land`, `debt`, `forex_usd`), `provincial_base_grant_per_year`, `county_base_revenue_per_month`, `county_base_obligations_per_month`, the per-head baselines, `collection_efficiency`, `reserve_months`, `forex`, `short_loan`, `austerity_max_cut`, `loan`, `cancel_penalty`), `capacity` (`local_crew`, `crew_per_m2`), `construction.cost_per_m2`, `projects` and `teams` by id, and `gdp`.
- **The grant's base** is tuned so that, at the start, revenue plus the grant covers the baselines with a small surplus. That is a balance choice, recorded in the params file, not a historical figure (fiscal §4.2).

**Deferred.**
- **To M5:** the regime switch at the SEZ and readiness from `roadKm`, `servicedLand` and the utilities are M5a's (§5.7). The budget cards and the grant warning; the co-financing offer and the loan's offer at the briefing; scrutiny from grey land money; service gaps and mood from austerity; works camps and the Corps' arrival cards are M5b's (§5.8).
- **Major projects as content:** Guomao (国贸), the first Shennan Road section, the cultural programme and the Shenzhen University card use this project mechanism, as templates with their own params. They wait for their claims to enter the store and for M5's cards. Where sources conflict (the SZU allocation, the cultural roster and its cost, the first segment's limits), the conflict records stay open and no figure is averaged. [M4 project research](../../research/phase1-m4-major-projects.md)
- **Later phases:** the full borrowing rule (debt-service cover and collateral), price indexation, ledger compaction.

**M4's tests:**
- **No effect without content:** without `fiscal`, M2's and M3's runs give the same state and history (GDP aside, which is new).
- **The ledger:**
  - per account, Σ entries = Δ balance, every month (a property test over seeds and random project commits);
  - no balance, quota or principal goes negative; obligations due = Σ live obligations + debt service + arrears;
  - no deadlock: with zero revenue, an empty reserve and no capacity, the month closes balanced, with the rest in arrears.
- **The deficit rule:** overbuilding (completed projects whose obligations exceed revenue) raises the deficit card once a quarter; each answer does what it says; `firstOption` gives the default.
- **The loan:** an unfunded commit offers it; taking it funds the project; recurring money after the grace period is lower than in the same run without the loan by the debt service.
- **The grant schedule:** the grant halves and ends on the content's dates, with no year in code.
- **Projects:** spending equals the budget at completion; a project stalls without money and resumes; completion applies the asset and its obligations; site preparation raises the zone's share, and an investor can then site in it.
- **The pool** (the research's three-way run): a road and a factory queued together on the local pool alone; the same with the road on a dedicated county-crew contract, where the factory finishes sooner and the road is neither instant nor free; the same with a pool contract added, where both finish sooner. Village self-build is the same in all three.
- **GDP:** positive at the start, from the existing economy; firm and construction value added add to it; the grant and loans don't.
- **The preview:** gains cash, retained tax and new obligations, and stays pure.
- **Determinism:** save, load and continue, and replay, with projects, contracts, loans and the deficit card. Input not changed.

### 5.7 Events, the SEZ chain, readiness and the first wave (M5a)
M5 is built in two parts. **M5a** (this section) is the investor arc: the events step, the guaranteed first contract, the SEZ chain with its new origins and incentives, readiness and the first wave, Shekou's capture of lost investors, and the deal-maker's shortcut. **M5b** (§5.8) builds the rest of §12's M5 row on top of it: the review and the sweep, the climate value, the remaining events and prologue beats, the budget cards and the closing visit.

**Content.**
```ts
createTickSteps(params, content?: { …; events?: EventContent })        // content/slice/events.yaml, compiled
createInitialState({ …, leaders?: LeaderContent[] })                    // content/slice/leaders.yaml: the pair's start
```
- **Without `events`:** no event fires, nothing is unlocked, and Shekou takes no one. **Without `leaders`:** no shortcut is offered. So M2's, M3's and M4's runs are unchanged. The new-origin archetypes are in `investors.yaml`, but they are gated *before* their arrival draw (below), so the `investment` stream draws exactly as in M3b. This is tested.
- **The save header gains** `events_sha256` and `leaders_sha256`.

**Events** (tick step 2, `content/slice/events.yaml`). Each record has an `id`, a `name` in both languages, a `family` (`anchor | scripted`, §7), one `trigger`, its `effects`, an optional `card` and `on_answer` effects, and `claims`.
```yaml
- id: event.sez_established
  family: anchor
  trigger: { date: 1980-08 }            # or { prologue_turn: 1 }: never a year in code
  card: { interrupting: true, options: [ { id: priority.industry, name: { zh: …, en: … } }, … ] }
  on_answer: [ { kind: sez_open }, { kind: set_regime, regime: regime.contracting_1980s }, { kind: unlock, key: investors.sez }, { kind: first_wave } ]
  claims: [ { id: phase1.event.sez_regulations, use: anchor_date } ]
```
- **Triggers.** `date: YYYY-MM` fires in the first month on or after it; it is dated content citing the anchor's claim. `prologue_turn: n` fires in the first month of turn n or later (turn 0 is the scenario's first quarter). Each event fires once, in content order. The fired events are recorded with their month, for the snapshot's declared facts (§9.1).
- **Effects** are a closed set of kinds, read by code; their numbers are in `params.events` under the event's id:
  - `offer { archetype }`: raise one investor card of that archetype with `params.events[id].jobs` jobs. A guaranteed offer draws nothing;
  - `readiness_check`: raise the readiness report card (below);
  - `unlock { key }`: add an unlock key. Systems read keys, never dates;
  - `set_regime { regime }`: switch `fiscal.regime`;
  - `sez_open`: record the SEZ's opening month, the priority answered and the readiness bar at that moment;
  - `first_wave`: raise the first wave (below).
- **Cards.** An event's `card` is raised when the event fires, with its options in content order, the headless default first. Its answer reaches the events step the next month through `answered` (§5.5), which applies `on_answer` in order, before any event fires that month. A non-interrupting event card expires at the end of its quarter; the events step removes it.
- **Validation** (`compileEvents`): every effect kind is known; an `offer` names an archetype and has its jobs in `params.events`; a `set_regime` names a regime of the fiscal content; `sez_open` and `first_wave` sit in an `on_answer` whose card's options are the keys of `params.sez.priorities`.

**The Phase 1 events of M5a** (`content/slice/events.yaml`):

| Event | Trigger | Effects | Claims |
|---|---|---|---|
| `event.first_processing_contract` (our first processing contract, 三来一补) | `prologue_turn: 1` (1979-Q2) | `offer` of `investor.hk_processing`, 120 jobs: it fits the existing premises of any area (`premises_jobs_per_area` 150), so it can be accepted on an empty map | `phase1.industry.processing_contract` (design_note) |
| `event.shekou_works` (Shekou breaks ground) | `date: 1979-07` | `unlock shekou.competes` | `phase1.event.shekou_works` (anchor_date) |
| `event.readiness_check` | `prologue_turn: 5` (1980-Q2) | `readiness_check` | design_note |
| `event.sez_established` (the announcement and the choice of first priorities, §7.1 steps 1–2) | `date: 1980-08` | its card, interrupting, with the three priorities; on answer: `sez_open`, `set_regime regime.contracting_1980s`, `unlock investors.sez`, `first_wave` | `phase1.event.sez_regulations` (anchor_date); `phase1.fiscal.sez_income_tax_1980` (design_note) |

- **The SEZ's timing.** The anchor's date (1980-08-26) falls in the second month of 1980-Q3. The card is raised in 1980-08 and pauses the quarter. The opening (§7.1 step 3) runs in the events step of the next month, 1980-09: the regime switches, the new origins unlock and the first wave arrives. Readiness is measured then, so work finished in August still counts.
- **The boundary.** Every playable area lies inside the 1980 zone in the slice (§3: the areas were chosen inside it, a design_note until period maps place the line). So M5a draws no per-cell boundary and every playable firm gets the SEZ terms. The zone's area figure stays out of content until it has its own claim.
- **Not in M5a:** attention from above (scrutiny, the first review targets, §7.1 step 4), the mandate, leasing to outside investors as a player action, and the other events of §7. They are M5b's.

**State added by M5a.**
```ts
type Ownership = 'hk_processing' | 'inland_soe' | 'joint_venture' | 'foreign_owned' | 'overseas_chinese';   // the last three from the SEZ
interface EventsState { fired: { id: string; date: YM }[]; unlocked: string[] }     // unlock keys in the order set
interface SezState { opened?: YM; priority?: string; readiness?: number; waveCards?: number }
interface ShekouState { captured: number; jobs: number; carry: number }             // investors Shekou took from the player
interface Leader {                                                                  // leadership §2.1, the Phase 1 subset
  id: string; name: LocalizedString; role: 'secretary' | 'mayor'; traits: string[];   // fictional composites (AGENTS.md)
  disciplineRisk: number; rapport: number }
interface LeadershipState { leaders: Leader[]; entangled: { leader: string; ref: string; date: YM }[] }   // accepted shortcuts
// Firm gains: terms?: { taxHolidayMonths?: number; landFeeFactor?: number; shortcut?: string }   // absent = no holiday, full fee
// GameState gains: events: EventsState; sez: SezState; shekou: ShekouState; leadership: LeadershipState
```

**Investor origins and incentives.**
- **New archetypes** (`investors.yaml`): `investor.joint_venture` (中外合资), `investor.foreign_owned` (外商独资) and `investor.overseas_chinese` (华侨、港澳投资), each with `requires: investors.sez`. An archetype with `requires` makes no arrival draw until its key is unlocked. The origins are design categories from §6.5 and the SEZ regulations' general opening to foreign investment; which firms came first is a research target. Their claims stay empty until sourced.
- **The tax incentive** is the regime: `regime.contracting_1980s` carries lower value-added rates for the three new ownerships. The 15% enterprise income tax (`phase1.fiscal.sez_income_tax_1980`) is cited as a `design_note`: it is an income-tax rate, and the slice taxes value added, so no rate is set from it.
- **The tax holiday:** an archetype's `tax_holiday_months` (params, absent = 0) is copied into the firm's `terms` when it is sited. Finance taxes no value added from a firm in its first `taxHolidayMonths` months open. The preview reads the same terms (below).

**Readiness** (§7.1). `readiness(state, params, buildable?)` is pure, like `fiscalViews`, and returns `{ roads, servicedLand, waterPower, bar, weakest, cells }`.
- **The readiness cells:** the buildable cells (§5.5's layer; every cell without it) of the playable areas in `readiness.areas` (1, 2, 3 and 7).
- **Roads and access.** M4's roads have no geometry, only `roadKm` per area (§5.6). So reach is counted, not traced: each completed km of city road reaches `(2 × road_reach_cells + 1) × 10` cells of its area (a 100 m grid has 10 cells per km), capped at the area's readiness cells. The part is the reached share ÷ `full_at.roads`, capped at 1. Every city road counts as connected to the Luohu crossing: the road template is the link toward it. The start has no city road, a placeholder until the 1979 network (§3.1) enters the start state.
- **Serviced land.** The share of readiness cells in `servicedLand` (§5.6) ÷ `full_at.serviced_land`, capped at 1. Site preparation's budget stands for clearing, surveying and compensation together. A compensation dispute is M5b's village petition event (§7).
- **Water and power.** The spare capacity of the readiness areas (each area's caps less the needs of every firm sited there, never below 0) against the needs of a standard first wave (`readiness.standard_wave`: jobs × that ownership's per-job needs). The part is the lower of the power and water ratios, capped at 1, as a factory's output is bound by the scarcer one (§5.5).
- **The bar** is the weighted mean of the three parts (`readiness.weights`). **The weakest part** is the lowest (ties in the order roads, serviced land, water and power).
- **The targets are shares, so the parts stay below 1 at the start:** the start has no roads and no serviced land, and the start utilities cover part of a standard wave (§5.5).

**The readiness check** (`event.readiness_check`, 1980-Q2). A non-interrupting report card (option `noted`) whose payload holds the three parts, the bar, the weakest part and the forecast: the first wave's size at today's bar. The SEZ card's payload holds the same report.

**The first wave** (`first_wave`, §7.1 step 3).
- **Its size:** `min_cards + round(bar × (max_cards − min_cards))` (`readiness.first_wave`), at the bar measured at the opening.
- **Its mix:** each card's archetype is drawn by weight from `params.sez.priorities[priority]` among the archetypes that are unlocked or need no key; its jobs are drawn from the archetype's range, as for an arrival. Both draws use the `events` stream.
- **The cards are ordinary investor cards** (§5.5): their options are the sites with room, so a wave that opens onto unserviced land has nowhere to go, and its investors decline or lapse to Shekou. That is §7.1's muddy field.

**Shekou captures lost investors** (§6.5). Once `shekou.competes` is unlocked, every investor that leaves without a firm (declined, lapsed or failed) adds `shekou.capture_share` to `shekou.carry`. Each time the carry reaches 1, Shekou takes one investor: `captured` and `jobs` grow, the carry falls by 1, and event `shekou_captured` records it. It is deterministic, with no draw, so it shifts no stream. Shekou stays card-only: its firms are a tally for the briefing and the verdict, not firms on the map.

**The leaders and the deal-maker's shortcut** (leadership §2.4–§2.5, §7).
- **The pair** comes from `content/slice/leaders.yaml`: a cautious Secretary and a deal-maker Mayor, fictional composites with fictional names. M5a uses `disciplineRisk` and `rapport` only. Standing, the mandate and falls from grace are M5b's.
- **When it is offered:** when a leader with the `deal_maker` trait leads, and a pending investor card has no zone site but an industrial zone would fit it on its buildable cells if they were all serviced, step 3 raises the Mayor's shortcut card, once per offer. It is non-interrupting and expires with its offer. Its payload names the offer card and copies the offer.
- **Its options:** `decline` first (the headless default, as for M4's deficit card), then `accept:zone:<id>` for each such zone, refreshed monthly like the offer's options.
- **Accepting** sites the firm in that zone now, on unserviced land, at a sweetheart price: its `terms` add `shortcut.extra_tax_holiday_months` to the archetype's holiday and set `landFeeFactor` to `shortcut.land_fee_factor`. The offer card is removed. The Mayor's `disciplineRisk` rises by `shortcut.discipline_weight`, and the decision is recorded in `entangled` (leadership §2.6 reads it in M5b).
  - **What it costs in the ledger:** the extra holiday is value-added tax the city does not collect once the firm opens, and the discount is land-use fee it does not collect once fees start (1982-01 in the contracting regime). Both show in the preview.
  - **The firm's land stays unserviced:** it uses the zone's floor capacity like any firm, so the zone takes no other firm until its land is serviced.
- **Declining** costs the Mayor `shortcut.rapport_on_decline` of `rapport`. The offer stays open on its own card.
- **Order in a call:** a shortcut accept needs its offer still pending. If the offer card is answered in the same call, the offer's answer wins and the shortcut fails (`offer_failed`). When an offer leaves (accepted, declined, lapsed or failed), its shortcut card is withdrawn.

**The preview** (§5.5, §5.6). `previewOffer` also takes a shortcut card. Each site gains `taxHolidayMonths` and `landFeeFactor` from the terms it would get. With the fiscal content, `cashThisQuarter` applies the fee factor, and `retainedTaxPerYear` is the rate at full ramp after the holiday, with the holiday shown beside it.

**Params** (`params/slice.yaml`, placeholders): `events` by event id (`jobs` for an `offer`); `readiness` (`areas`, `weights`, `road_reach_cells`, `full_at`, `standard_wave`, `first_wave`); `sez.priorities` (archetype weights by priority); `shekou.capture_share`; `shortcut` (`discipline_weight`, `rapport_on_decline`, `land_fee_factor`, `extra_tax_holiday_months`); and, per new ownership and archetype, the M3b fields, with `tax_holiday_months` on archetypes.

**M5a's tests:**
- **No effect without the content:** without `events` and `leaders`, M3b's and M4's runs give the same state and history; the new-origin archetypes never arrive; the `investment` stream draws as before.
- **The first contract:** raised in the first month of turn 1 for every seed, with 120 jobs and an `accept:premises` option on an empty map; accepting it opens a firm.
- **Triggers read content:** moving the SEZ record's date moves the chain, with no code change.
- **The SEZ chain:** the card is raised in the anchor's month and pauses; its answer, the next month, records the priority, switches the regime, unlocks the new origins and raises the first wave; `firstOption` picks industry.
- **Readiness:** each part is below 1 at the start; a road raises roads, site preparation in a readiness area raises serviced land, a power line raises water and power only up to the water ratio; the bar is the weighted mean and the weakest part is named.
- **Readiness changes the first wave:** an unprepared run gets `min_cards`; a prepared run, through an affordable prologue plan (the loan, a road, site preparation and a power line), gets more; the readiness check's forecast equals the wave that follows when nothing changes in between.
- **Incentives:** a new-origin firm pays no tax during its holiday, then pays at the contracting rate; the preview shows the holiday.
- **Shekou:** no capture before `shekou.competes`; after it, the captured count is `floor(capture_share × lost investors)`.
- **The shortcut:** offered only with a deal-maker and an unserviced zone that would fit; `decline` is first; accepting sites the firm on unserviced land with its terms, raises `disciplineRisk` and records the entanglement; declining lowers `rapport`; an offer answered in the same call wins; the card is withdrawn with its offer.
- **Determinism:** save, load and continue, and replay, through the SEZ chain with a shortcut, a capture and the wave. Input not changed.

### 5.8 Reviews, climate, the prologue and the closing visit (M5b)
M5b fills the slice's calendar on M5a's events step: the prologue beats, the remaining events of §7, the budget cards, the briefing's offers, the climate value, the annual review with its sweep, the fall from grace, and the closing visit with its verdict.

**Content.**
- `content/slice/events.yaml` gains the records below. `content/slice/targets.yaml` holds the annual reviews, passed to the tick as `targets` (the save header gains `targets_sha256`).
- **Without `events`:** the climate does not move, no review is held, and no card of this section is raised. So M2's, M3's and M4's runs are unchanged, as for M5a.

**The events step grows** (§5.7's mechanism, three additions):
- **More trigger kinds.** The families are `anchor`, `scripted`, `recurring`, `emergent` and `milestone`.
  - `{ month_of_year: m, recurring: true }`: every year in month m (0 = January). This is seasonality, like Spring Festival, not a year.
  - `{ hazard: p, months_of_year?: […], from_turn?: n, guaranteed_by_turn?: n, condition?: c }`: an emergent event with probability p a month, drawn from the `events` stream. A draw is made each month the event can fire: in season, from that turn, with its condition true. With `guaranteed_by_turn`, it fires in the last month of that turn if it has not fired by then (the "guaranteed emergent beat" of §2.1). An emergent event fires at most once unless `recurring`, and a recurring event at most once a month.
  - `{ condition: c }`: a milestone, the first month c holds. The conditions are `first_zone_firm_open` (a firm sited in a zone is open), `firm_open`, `shekou_captured` and `site_preparation_committed`.
  - **Gates:** `requires: <key>` (an unlock key must be set) and `until: <key>` (it must not be set yet). The SEZ's opening sets `investors.sez`.
- **Per-option effects.** An `on_answer` effect with `option: <id>` applies only when that option was chosen.
- **More effect kinds.** Their numbers are `params.events.<id>` (`scrutiny`, `cost`, `standing`, `factor` and `months`, `jobs`):
  - `scrutiny`: added at once, not scaled by the permit factor; the month's decay follows in step 12;
  - `cost`: a one-month `transfer` obligation (fiscal §6.1), so it goes through the ledger and the deficit rule;
  - `standing`: both leaders, clamped to 0..100;
  - `set_permit`: the answered option is a permit regime;
  - `commit_choice { area }`: the answered option is a project template, committed in that area. An option that is not a template commits nothing;
  - `offer_loan`: raise the project loan's card (§5.6) unless it is taken or pending;
  - `cofinance { template, area }`: commit that project with a budget of 0, paid by the investor: no forex, no spending, no maintenance. The next `offer` of the same answer carries the project: if that investor declines, lapses or fails, the project is withdrawn (cancelled, with no penalty);
  - `offer` gains `terms: true`: a concession (`params.events.<id>.tax_holiday_months`, `land_fee_factor`) carried in the offer's payload and given to its firm. It replaces the archetype's tax holiday;
  - `contract_team { team }`: sign a pool contract for that team (§5.6). A team marked `event_only` in `teams.yaml` (the corps' advance units) is contracted only this way, never by the player. If the team already has a live contract, nothing is signed;
  - `rush`: every live project becomes `high` priority;
  - `orders`: Hong Kong orders × `factor` for `months` months (`industry.order_index` × the factor in M3b's orders cap). The cap is never above a firm's jobs, so only a slump binds;
  - `budget_report`: the budget card's payload (below);
  - `sweep`: the sweep's campaign (below);
  - `veto { reason }`: that year's review fails (the fire's order check);
  - `end_run`: the scenario ends (`ended`), and the card carries the verdict. **The month stops at the events step:** steps 3–14 do not run and the date does not advance, so the final state is the previous month's, and no later step raises a card (no deficit card from the zero grant). Its cards can still be answered, as for the last turn (§5.1).
- **Cards.** A non-interrupting event card lapses at the start of the next turn, as M5a's. With `card.lapse: <option>`, a lapse takes that option's effects, so a crisis cannot be ignored for free (the typhoon lapses to `defer`; the fire, escapes and petition to `noted`). The prologue's decisions (the first project, the permit choice, the corps' advance, the co-financing, the readiness check) interrupt, so under quarterly turns each is answered in the quarter that raises it. A card that only reports offers `noted`.

**The prologue beats** (§2.1). Each prologue quarter raises at least one card whose options lead to different states:

| Turn | Beat | Its decision |
|---|---|---|
| 0 (1979-Q1) | `event.first_project`, scripted: meet the pair, choose the first project toward Luohu. `event.shenzhen_city` (anchor, 1979-03) is a declared fact | `project.road_link`, `project.water_main` or `later`, by `commit_choice` in area 2 |
| 1 (1979-Q2) | M5a's first contract. `event.shekou_command` (anchor, 1979-04) is a declared fact | accept a site or decline |
| 2 (1979-Q3) | `event.permit_choice`, scripted: the temporary-permit regime and the scrutiny gauge switch on. Shekou's works (M5a). The typhoon (emergent, guaranteed by turn 2) | `standard`, `loose` or `strict`, by `set_permit` |
| 3 (1979-Q4) | `event.corps_advance`, scripted: a pool contract for `team.corps_advance` (the advance units, a placeholder crew); the sweep card and the first, lightweight review | `quarters` (a cost) or `tents` (scrutiny); and the sweep |
| 4 (1980-Q1) | The budget card; `event.cofinancing`, scripted (the briefing): the loan's offer and the co-financing card. Accepting builds a co-financed power line in the market town (area 1) and raises the investor's Hong Kong processing offer with its concession | take the loan; `decline` or `accept` the co-financing |
| 5 (1980-Q2) | M5a's readiness check, now with `noted` or `rush` (a cost, and every live project to `high`) | `noted` or `rush` |

**The other events** (§7's table; all `content/slice/events.yaml`):
- **Anchors as cards** (non-interrupting, `noted`):
  - the Bamboo Garden Hotel opens (1981-01);
  - the land-use rules take effect (1982-01; the fees themselves are the regime's dated schedule, §5.6);
  - the second-line fence (1982-06);
  - the temporary-residence rules (1983-07). Its card offers `standard` or `strict` (`set_permit`).
- **The main Corps deployment:** an interrupting card on `date: 1982-09`. The claim's date is the year, and its summary says autumn, so the month is a design choice within that season: the event is `scripted` and cites the claim as a `design_note`, and the month needs a source before it can be an anchor. Options `accept` (a pool contract for `team.engineering_corps`, §5.6) or `decline`.
- **The first export processing zone opens:** a milestone on `first_zone_firm_open` (`event.first_zone`). It gives `standing`. After the SEZ, `event.mandate_met` (the same condition, `requires: investors.sez`) sets the mandate as met (`unlock mandate.met`).
- **Emergent events,** each a card with a choice unless it only reports:
  - Hong Kong orders surge (an extra processing `offer`) or slump (`orders`, a `noted` card);
  - a typhoon in Q3 (`cost` to repair, or scrutiny);
  - a fire in a mixed factory and dormitory (`cost`, scrutiny, and an order-check failure at that year's review);
  - escapes to Hong Kong before the SEZ (`cost` of patrols, or scrutiny). The escapes' population outflow is not modelled: it waits for an outflow channel in the migration step;
  - a village petition over compensation, once site preparation is committed (`cost`, or scrutiny);
  - Shekou poaching an investor: M5a's capture, shown as a card the first time it happens.
- **The budget card** (`event.budget`, `month_of_year: 0`, recurring): this year's grant factor and the recurring balance at last month's rate, with this month's grant in place of last month's (the card fires before this month's finance, so the year's first cut shows at once). It carries **the four-quarter warning** when the regime's grant schedule cuts the factor in the next 12 months (after this month, up to 12 months on): the coming factor, and the recurring balance at that factor's grant. Both are read from content (§6.7), so the warning appears on the 1982-Q1 card, and again in 1983-Q1.
- **The closing visit** (`event.deng_visit`, anchor `date: 1984-01`, `phase1.event.deng_first_visit`). It fires in the events step of 1984-01, before that month's finance. So its scorecard is read from the end-1983 state. Its effects are `end_run`, then an interrupting card (`noted`) that shows only the documented fact of the visit (§7.2, PLAN §11) beside the game's own verdict.

**State added by M5b.**
```ts
interface Climate { reformWind: number; scrutiny: number; overQuarters: number }   // §5; reformWind is params.climate.reform_wind
interface Sweep { until?: YM }                       // §5; active while date <= until
interface ReviewRecord { index: number; date: YM; lightweight: boolean; score: number; pass: boolean;
  caught: boolean; vetoed?: string; items: { indicator: string; value: number; score: number }[] }
interface FallRecord { date: YM; leader: string; replacedBy: string; entangled: boolean }
interface ReviewsState { held: ReviewRecord[]; vetoes: { date: YM; reason: string }[] }   // reasons: sweep_caught,
                                                                    //   order_check (the fire), leader_corruption
// Leader gains standing (0..100, start 50). LeadershipState gains bench: Leader[] (the replacements; a leaders.yaml
//   record with replacement_for: secretary | mayor is on the bench, not in the start pair).
// FiscalState gains frozenUntil?: YM. Project.waiting gains 'frozen'; Project gains cofinanced?: true (budget 0).
// GameState gains climate, sweep, reviews: ReviewsState, falls: FallRecord[], orders: { factor: number; until?: YM },
//   ended?: { date: YM; reason: 'failure' | 'visit' }.  isFinished(s) is also true once ended is set.
// content/slice/targets.yaml: a list of { id, lightweight: boolean, indicators: [{ indicator, weight > 0, floor,
//   target }] } with floor ≠ target. The save header's content gains targets_sha256.
```

**The climate** (§6.9; tick step 12, with the events content).
- **Scrutiny** each month: `scrutiny × (1 − decay) + permit_factor[regime] × gains`, clamped to 0..100.
- **The gains** (`params.climate.gain`):
  - `loose_permit` a month under the loose regime;
  - `illegal_share` × the real illegal-floor share;
  - `grey_land_per_100k` per ¥100,000 of land money used for recurring spending (M4's `land_for_recurring` event);
  - `shortcut` per accepted shortcut;
  - the `scrutiny` effects of events.
- **Reviews** move scrutiny too (below).
- **The gains are read from this month's events** (`land_for_recurring` when not sanctioned, `offer_accepted` with a shortcut), so they need no state.
- **The failure state:** at the end of each quarter, `overQuarters` counts the consecutive quarters ending above `failure_threshold`. At `failure_quarters` the run ends with `ended.reason = 'failure'` and the interrupting card `climate.failure` ("the experiment is declared a failure").

**The sweep** (§6.8, leadership §4.4).
- **The card:** `event.sweep`, a recurring event in October with options `no_sweep` (the default) or `sweep`. It interrupts, so its answer lands in November, before the review. Sweeping costs `sweep.cash_cost` (a one-month transfer) and lowers every migrant group's `mood` by `sweep.mood_penalty`.
- **What it hides:** from the month it is answered through `until = that month + campaign_months − 1`, the *visible* illegal-floor share is the real share × (1 − `sweep.visible_cut`). The block stocks and the real share do not change. A two-month sweep answered in November still covers December's review.
- **The unannounced team** at the review catches it with `p_caught = min(1, sweep.base_p × (real − visible))`, drawn from the `reviews` stream.

**The annual review** (§6.8, leadership §3; tick step 14, in December, with `targets`).
- **The review k** is the k-th entry of `targets.yaml`, so no year is read. Each entry is `lightweight` or not, with weighted indicators, each with a `floor` and a `target` (leadership §4.3's convention: when `floor > target`, lower is better).
- **The indicators** (trailing windows end at the last month the history recorded, so a view between turns reads the review's own values):
  - `exports_usd` and `forex_earned_usd` (the last 12 months);
  - `foreign_firm_jobs` (jobs posted now by firms of foreign or Hong Kong origin);
  - `projects_completed` (city projects finished in the last 12 months);
  - `order_check`: the *visible* illegal-floor share.
- **The score** = Σ w × clamp((value − floor) ÷ (target − floor), 0, 1) ÷ Σ w. It passes at `review.pass_mark`, unless:
  - the team caught a sweep;
  - a fire this year failed the order check;
  - a fall from grace this year touched an entangled shortcut (veto `leader_corruption`, leadership §2.6).
- **The first review is lightweight:** it scores and teaches, and always passes. It moves neither standing nor scrutiny.
- **The results:**
  - a pass gives both leaders `review.standing_pass` and takes `review.scrutiny_relief` off scrutiny;
  - a fail takes `review.standing_fail` and adds `review.scrutiny_fail`.
  - The report is a `noted` card, `review.annual`, with the record.

**The fall from grace** (leadership §2.6; tick step 14, monthly). For each leader with `disciplineRisk > 0`: `p_trip = base × sigmoid(k × (disciplineRisk − threshold))`, drawn from the `reviews` stream. When it trips:
- the leader is replaced by the bench record for that role in `leaders.yaml` (`replacement_for`; cautious, fictional), with risk 0. With no bench record left, the leader stays at risk 0;
- city projects freeze for the next `fall.freeze_months` months (`frozenUntil`; `waiting: 'frozen'`, no work, no spending);
- scrutiny rises by `fall.scrutiny`;
- that year's review is vetoed if any entangled shortcut is the fallen leader's;
- the fallen leader's pending shortcut cards are withdrawn in the next investment step.

A player who accepts no shortcut never trips: the risk stays 0.

**The verdict** (§7.2). `verdict(state, params, fiscal)` is pure. It returns:
- growth: residents and GDP over the first year's;
- the ledger's health: reserve, debt outstanding and arrears;
- the last review, scrutiny and the illegal-floor share;
- **the 1984 fiscal test:** 12 × (the last three months' recurring revenue without the grant, averaged: the ledger's `tax` lines) − the obligations due over the next 12 months (baselines at the current rate, live obligations at the current wage, debt service), with the grant at zero.
- **The visit's card interrupts.** Until it is answered, a step returns `paused`; once answered, `finished`.

**Policies** (§10), in `src/policies.ts`:
- `declineAll`: decline every investor, shortcut, co-financing and loan; otherwise the first option;
- `historicalPrologue`: a scripted plan for the 1980-Q2 snapshot (§9.1). It chooses the road toward Luohu as the first project; puts investors into existing premises when they fit, else declines them; takes the loan and accepts the co-financing; and in its first month draws a 12-cell industrial zone in Shangbu and commits a power line there and the zone's site preparation. It applies no template zone.

**The 1980-Q2 snapshot** (§9.1).
- **How it is made:** `historicalPrologue` with seed 1 for six quarters, saved with sim-core's save format.
- **The bands are checked by a test:**
  - the end-1979 checkpoint is checked at month 12;
  - the 1980-Q2 bands at month 18. Upper bounds are compared with the claims' values. The ratio bands use their tolerance. Trailing flows use the last 12 months.
  - The design bands are checked too: a processing contract is running; readiness is above zero in each part; the loan has been offered.
- **Where the values come from:** the claims are read from `data/evidence/claims/`, never copied into content.

**Params** (`params/slice.yaml`, placeholders): `climate` (`reform_wind`, `scrutiny_decay`, `failure_threshold`, `failure_quarters`, `permit_factor`, `gain`), `sweep` (`cash_cost`, `mood_penalty`, `campaign_months`, `visible_cut`, `base_p`), `review` (`pass_mark`, `standing_pass`, `standing_fail`, `scrutiny_relief`, `scrutiny_fail`), `fall` (`base`, `k`, `threshold`, `freeze_months`, `scrutiny`), each event's numbers under `events.<id>`, and `teams.team.corps_advance`. The review targets are `content/slice/targets.yaml`, placeholders calibrated so that `declineAll` fails every review after the first and `historicalPrologue` passes the second to fourth.

**M5b's tests:**
- **The prologue** (§10):
  - every prologue quarter raises a card for which two options give different states (no empty quarters);
  - under `declineAll`, the forex quota still covers one power line before the SEZ fires (no soft-lock);
  - the `historicalPrologue` run passes the snapshot's bands;
  - the typhoon fires in 1979-Q3 whatever the draws (the guaranteed beat).
- **Each year's review forces a trade-off:**
  - `declineAll` fails every review after the lightweight one, and the lightweight one passes anyway;
  - a run that passes a review carries more obligations due than `declineAll` at that review;
  - the sweep lowers the visible share, lowers migrant mood and can be caught, failing the review.
- **The climate:** scrutiny decays, rises with each gain and with events, and four quarters above the threshold end the run.
- **The fall from grace:** no shortcuts, no fall; a forced trip replaces the Mayor, freezes projects and vetoes the review when entangled.
- **The budget card and the warning:** the warning appears exactly on the cards whose next 12 months hold a grant cut, read from content.
- **The briefing:** the loan card and the co-financing card arrive in turn 4; accepting the co-financing builds a power line that costs the city nothing, and its investor's firm gets the concession.
- **The visit:** it fires in 1984-01 and ends the run, and the verdict's fiscal test equals its formula on the end-1983 state.
- **No effect without the content,** and determinism (save, load and continue, and replay, through a whole 21-quarter run).
- **The branches** (`test/m5b-branches.test.ts`): `runQuarter` through the whole slice, with each prologue decision answered in its quarter and the failure card pausing it; a lapsed crisis takes its lapse option; the budget card's numbers; declining the co-financing investor withdraws its power line; event-only teams; the milestones; an orders slump caps posts; a fire vetoes its review; the Corps deployment; the climate's event gains; a two-month sweep covers December; indicators between turns; and the compilers' error paths.

### 5.9 The headless runner, golden runs and the plausibility report (M6a)
M6 is built in three parts. **M6a** (this section) builds the instruments: one way to load the slice, the policies, the CLI, the golden runs, the plausibility report and the exit-criteria checks. It runs on M5's numbers and changes no balance. **M6b** is the balance pass, driven by M6a's report (§12). **M6c** is the 2D UI (§11).

The report says pass or fail honestly. A failing band is a finding for M6b, never a reason to widen a band or a tolerance.

**One way to load the slice** (`src/content.ts`, pure). Today the composition lives in `test/fixtures.ts`. M6a moves it into sim-core, so the tests, the CLI and the UI load the same slice.
- `SLICE_FILES`: the repo-relative path of every file the slice reads (the areas and buildable JSON, the scenario, start, params, precedents, investors, fiscal regimes, projects, teams, events, targets and leaders).
- `compileSlice(read, parse, hash)`: `read(path)` gives a file's text, `parse` is the caller's YAML parser, and `hash(text)` is the caller's sha256 of the text with LF endings. It returns:
  - `init`, the input of `createInitialState`;
  - `tick`, the full `TickContent`;
  - `params`;
  - `content`, the save header's hashes (§5.1).

  sim-core still does no IO and imports no parser or hash. The CLI passes Node's `fs` and `crypto`; the UI passes its bundled texts and a pure-JS hash.

**Measures and bands** (`src/calibration.ts`, pure).
- **Measures** are named reads of a state. Trailing flows sum the last 12 months the history recorded:
  - `slice.resident_pop`: Σ `stayedSixMonths` (常住);
  - `slice.resident_pop.nonlocal`: the same, for groups with `nonlocal` registration;
  - `slice.present_pop.temporary`: Σ `present` over `nonlocal` groups. This is the sim's analogue of the SEZ's temporary residents (暂住), a design choice. It is never added to usual residents;
  - `slice.employed`: Σ filled jobs;
  - `slice.gdp_nominal.year` (and `.trailing_4q`): trailing GDP;
  - `slice.exports_usd.year` (and `.trailing_4q`): trailing exports ÷ `fiscal.forex.yuan_per_usd`;
  - `city.general.spending_over_revenue.year` (and `.trailing_4q`): trailing (obligations paid + project spending) ÷ trailing revenue.
- **Band kinds** (the claims' values are resolved at check time and never copied):
  - `upper_bound`: value ≤ the claim;
  - `ratio_band`: value within the ratio of two claims × `tolerance`;
  - `between_ratios`: value within the two ratios' range × `tolerance`;
  - `growth`: the value's multiple over the base checkpoint, within (claim `to` ÷ claim `from`) × `growth_band`;
  - `upper_bound_and_growth`: both `upper_bound` (with `bound`) and `growth` (from `growth_from` to `bound`).
- **The base checkpoint** for growth is end-1979: the state after the scenario's twelfth month. A stock is read at that state; a flow is that state's trailing year.
- **Where bands are read at:** the `band.1979q4.*` bands after month 12, the `band.1980q2.*` bands after month 18, and the `band.1983q4.*` bands after month 60, the end of 1983-Q4 (the visit's state). A band's month is the end of the quarter its id names (`band.<year>q<n>.…`), counted from the scenario's start, so no year appears in code. A run that ends before a band's month fails it.
- **`checkBands(bands, claims, at)`** returns per band: the id, the measure, the kind, the value, the range, pass or fail, and each claim's status. A claim below `verified` is tagged `[UNVERIFIED]`, as in the draft compile.
- **The design bands** of §9.2 are records in `checkpoint_1983q4.yaml` (`applies_as: design_band`, a `check` id and its numbers). They are computed from the run's history:
  - `residents_multiply`: the end-1983 ÷ end-1979 residents multiple lies within `range`;
  - `exports_outgrow_gdp`: the last year's exports ÷ GDP is at least `factor` × the first year's (or the first year's is 0 and the last is above 0);
  - `village_outgrows_planned`: completed village rental floor grows more than planned housing (state flats and dormitories) between end-1979 and end-1983;
  - `deficit_before_visit`: some month before the visit has revenue below obligations due. The report names the year;
  - `readiness_moves_wave`: checked across runs. Golden runs whose readiness differs at the SEZ's opening also differ in first-wave cards;
  - `stall_after_credit`: **not checkable** in the slice, because step 1 has no credit series. The report shows it as `not_checkable` with that reason.

**Policies** (`src/policies.ts`; §10's names, used by the CLI):
- `default` is `firstOption`, `decline_all` is `declineAll`, and `historical_prologue` is `historicalPrologue` (§5.8).
- **`cautious`** never takes the project loan and never takes a grey option:
  - it declines the loan, the shortcut and the co-financing. The deficit rule may still borrow short when austerity does not cover a shortfall (§5.6);
  - investors go into existing premises, else into a zone already fully serviced, else they are declined;
  - permits are strict and enforcement high, there is no sweep, and a deficit card is answered `austerity`;
  - every other card takes its first option;
  - in its first month it draws the same 12-cell industrial zone in Shangbu as `historical_prologue` and commits its site preparation.
- **`aggressive(params)`** takes every grey option (it reads project budgets, so it is made from the params):
  - it takes the loan and the co-financing;
  - it accepts every investor and every shortcut at the first site;
  - permits are loose and enforcement low, it sweeps every October, and a deficit card is answered `borrow_short`;
  - in its first month it draws an industrial zone of the area's first 24 cells in Shangbu (area 7) and in Sungang (area 5), as `historical_prologue` draws its 12, and commits site preparation in both;
  - at each turn's start it commits the next project in a fixed list (`AGGRESSIVE_BUILDS`: a power line and a water main in areas 7 and 5, roads in areas 7, 5 and 2, then two more power lines in each zone's area), while money for projects is above that project's budget and the forex quota covers it;
  - it keeps `team.engineering_corps` and `team.outside_soe` under pool contracts while money for projects covers a year of their cost.
- **`randomPolicy(seed)`** answers each pending card with a uniformly random option. It draws from its own sfc32 generator, seeded from `seed`, never from the sim's streams, and takes no turn actions. It exists for the property tests.

A policy's turn actions are legal by construction: zones are clipped with `zoneCellsAllowed`, and a commit is made only when its checks pass.

**The CLI** (`apps/cli`, run with `npm run slice -- …`):
- **`slice run --seed N --quarters Q --policy P [--out DIR]`** plays Q quarters (21 by default) through `runQuarter`, the path the UI shares:
  - the policy answers the pending cards and gives its turn actions at each turn's start;
  - it answers each `paused` result's cards before the quarter continues;
  - the run stops at `finished`, or once the visit's card is answered.

  It writes two files to DIR (default `build/slice/<policy>-seed<N>/`):
  - `run.json`: the content hashes, the monthly series, the cards raised and answered per quarter, the reviews, the verdict, the bands and the exit-criteria checks. Its only input is seed, policy and content, so the same arguments give the same bytes;
  - `report.html`: one self-contained page with inline SVG charts (residents and present non-locals, GDP and exports, revenue against obligations due, the reserve and debt, scrutiny), the band table with `[UNVERIFIED]` tags, the exit-criteria table and the wall time of the run. The wall time is printed and shown in the report, never written to `run.json`.
- **`slice golden [--update]`** runs the golden set and compares each run with `data/golden/slice/<policy>-seed<N>.json`. With `--update` (`npm run golden:update`) it rewrites the files. It also prints the set's cross-run checks (`crossRunChecks`): criterion 1's response to choices, and `readiness_moves_wave`.
- The CLI reads claims with `@sz/evidence`'s loader and tags them with its `meetsMinimum` for `calibration_target`.

**Golden runs** (§10). The set is `default`, `cautious`, `aggressive`, `decline_all` and `historical_prologue`, each with seed 1, for 21 quarters through `runQuarter`.
- **Each file is a readable summary:**
  - the content hashes;
  - for each year end, and at the visit: residents, registered, present non-locals, migrants, firm jobs posted, the year's GDP, exports, revenue, obligations paid and project spending, the reserve, debt outstanding, arrears, scrutiny and the real illegal-floor share;
  - each review's score and result;
  - the SEZ's opening: its month, the readiness bar and the first-wave cards;
  - the verdict;
  - the events fired, with their months.

  Money and people are rounded to integers, and shares to four decimals.
- **The test** (`apps/cli/test/cli.test.ts`) recomputes each summary with the CLI's code and compares it whole. A change that moves a golden number regenerates the files with `npm run golden:update`, and its commit message says what moved and why (AGENTS.md).

**The exit-criteria checks** (§1). Criterion 6 is judged by playtests. Criteria 1–5 are checked by the CLI's report, over one run or the golden set, and by tests:

| # | Criterion | The check |
|---|---|---|
| 1 | Play all 21 quarters; the town grows plausibly in response to choices | The run reaches the visit through `runQuarter`. The end-1983 growth bands. Across the golden set, the policies end with different residents and GDP |
| 2 | A hard trade-off every year; a loan squeezes a later year | For each year after the lightweight review, the report shows two things: the review's result, and the ledger's tightest month (the lowest money for projects, and any deficit card, austerity or arrears). A year counts as one with a trade-off when it has both a review that failed or passed by less than `tradeoff_margin`, and a tight ledger. The margin is in the `check.tradeoff` record of `checkpoint_1983q4.yaml`, a design_note. The loan check reruns the policy with the loan declined, and compares debt service and money for projects in the years after the grace period |
| 3 | The plausibility bands and growth multiples at the 1980-Q2 snapshot and at end-1983 | `checkBands` over `snapshot_1980q2.yaml` and `checkpoint_1983q4.yaml`, plus the design bands |
| 4 | No empty quarters in the prologue | For each prologue turn, the cards raised in it with two or more options. That their options lead to different states is M5b's test |
| 5 | A headless run takes seconds; the invariants pass | The run's wall time (the test requires under 5 s for 21 quarters). The property tests below |

**M6a's tests:**
- **Content:** `compileSlice` gives the same `init`, `tick` and hashes as the old fixtures, so every M2–M5 run is unchanged.
- **Bands:** each band kind passes and fails at its edges on fixture values. A claim below `verified` is tagged. A measure that is unknown, or a band whose claim has no numeric value, throws.
- **Policies:** a whole run under each of `cautious`, `aggressive` and `randomPolicy(1..5)` reaches the visit, with no action thrown. `aggressive` takes the loan and accepts a shortcut. `cautious` never takes the project loan, and never accepts a shortcut or the co-financing.
- **Golden runs:** each summary matches its file.
- **Invariants** (§10), as property tests: for seeds 1–5, under `randomPolicy` and the three main policies, every month of a whole run passes M2's population and stock checks, M3b's firm sums and M4's ledger check.
- **Speed:** 21 quarters of `aggressive` under 5 s.
- **The CLI:** the same arguments give a byte-identical `run.json`; the report names every band.
- **The 1983 checkpoint's notes:** `aggressive` ends the fiscal test negative and `cautious` ends it above `aggressive`. This replaces the note's "cautious near or above zero", which is M6b's target.

### 5.10 The balance pass (M6b): findings
M6a's report and a diagnosis of the five golden runs (2026-11-24) show the slice **does not grow under any policy**:
- residents end 1983 between 30,340 and 31,084, against 30,340 at the start;
- GDP grows ×0.93 to ×1.01;
- spending ÷ revenue ends 1983 near 1.40;
- the reviews after the first fail for every policy except `historical_prologue`.

So the end-1983 growth bands fail, along with the spending-to-revenue band and two of the design bands. Four constraints hold the town flat. None is a single parameter, and together they set the slice's scale:

1. **Money.** The county base brings in about ¥2.9M a year against ¥3–4M of obligations. One road costs ¥600k, one power line ¥500k, and site preparation ¥100k a cell. Firm taxes stay small (value added × the rate, after tax holidays), and land fees start only in 1982. No policy can fund the utilities and crews that new firms need. Money for projects is negative from 1980 under `aggressive`, and from 1982 the arrears roll over and grow (M4's note).
2. **Construction capacity.** The pool is 120 local crew units, plus 60–200 for each team contracted. A firm's factory needs 0.02 crew units a m² at full pace, about 30–100 for a firm. Under `aggressive`, 22 firms are accepted by 1983, and 13 never finish building.
3. **Utilities.** Spare power is 40–300 kW per area, and a power line adds 500 kW. Firms need 0.5–1.0 kW a job, so the firms that open post only about 8% of their jobs, capped by `utilityShare`.
4. **Labour.** Matching runs each month from scratch (§5.2), so idle locals and service workers refill new factory posts before any migrant is pulled. Migrants come only once firm posts exceed that local slack. This is structural: changing it means changing §5.2's matching (for example, workers keep last month's job), not a parameter.

**What it needs: decisions on scale, not tuning.** The bands ask for about ×1.17 to ×3.5 residents by 1983 (the SEZ's ×2.33 × [0.5, 1.5]), that is, 5,000 to 75,000 more people in the slice. One investor card is one firm of 60–500 jobs, at about one card a quarter, so even if every firm opened, firm jobs would reach about 5,000. Each of these options changes several placeholder sections together, so the choice needs a person:
- **A. Scale a card.** A card is a batch of contracts: its jobs, floor, utilities and crews scale together. Alternatively, more cards arrive after the SEZ.
- **B. Let growth pay for itself.** Firm taxes, land fees and retention grow with the firms; arrears are capped or forgiven by a provincial transfer; project costs are set against the county's budget.
- **C. Fix the labour market.** Incumbency in matching, so a new post opens a vacancy that pulls migrants (a §5.2 change, with M2's rest test kept).

M6b's only change so far is `aggressive`'s build list and its pool contracts (§5.9). They move only `aggressive`'s golden run, and slightly: its GDP ends ×1.006 rather than ×0.979, and its arrears are higher. Without money it hires no team.

### 5.11 Jobs, labour and migration on the map (R4)
R4 answers §5.10's labour constraint (option C) and traces jobs from the map: construction jobs while works and builds are active, industrial jobs once floor is occupied, then service jobs as wages are spent. It replaces §5.2's from-scratch matching and its lost arrivals, and it adds the occupied city's revenue. Organic floor is buildings-and-construction §13.3's (R3).

**Jobs posted each month (tick step 5).** Each (area, sector) row is:
- its base jobs;
- **construction:** the m² under construction × `construction_jobs_per_m2`, as in M2. That covers firm, private, work-unit and village self-build. To it are added the crew units that projects and works orders used this month, × `labour.jobs_per_crew_unit`, posted in the area where the work was done:
  - a project's area;
  - a service order's zone's area, or the area of its first unfinished cell if the zone is gone;
  - the area of the road cell being built;
  - a structure's area.

  The construction step reports them as `crew` events, `{ area, units }`, so they need no state. Team crews are counted like local ones: their workers are hired through vacancies, as construction migrants.
- **factory:** the posts of the firms in the area. Organic firms are firms (§13.3), so occupied floor posts through `min(ramp, floor, utilities, orders)` (§5.5).
- **services:** service posts from spending, with `params.growth` and the start network only:
  - formal posts are `floor(occupied private shop m² in the area's zones ÷ growth.services.m2_per_job)`, from §13.3's derived occupancy;
  - informal posts are `floor(induced[a] × (1 − formal_share))`, where the spenders live, in the town and the villages.

  Both use §13.3's spending rule, from last month's matching. It counts wages earned outside services only, so service posts do not feed their own spending and the loop stays open. `labour.servicePosts` keeps this month's split for finance and GDP.

**The utility share, with placed sources.** For each area, the share is now `min(1, (area capacity + placed supply) ÷ the firms' need)`, the lower of power and water:
- the area capacity is `area.utilities`, the M-series ledger of spare capacity, which start content and M4's projects raise;
- the placed supply is what placed sources deliver to the area's zones, through `spatialViews(…).supply` (b&c §13.1). Each zone with open firms demands their need, spread evenly over its developable cells (largest remainder). Supply is allocated on the road components, and each zone's share is summed into its area.

A placed source never adds to `area.utilities`, so no capacity is counted twice. Without placed sources the share is M3b's. The R3 prospective test uses the same share.

**Matching keeps incumbents (replaces §5.2's matching).** `labour.held: { home, kind, area, sector, n }[]` records who holds which jobs. It is sorted by home area, kind, work area and sector in their state orders, and only rows with `n > 0` are kept. Each month:
1. **Layoffs.** A row whose holders exceed its jobs lays off the excess, split over its holders by largest remainder: pro rata, not last in, first out.
2. **Turnover.** Each row loses `round(migrant holders × labour.turnover_month)` of its migrant holders, split the same way. They quit to idle; they do not leave. Locals keep their jobs (work units and village enterprises), so turnover never hands a local's job to a migrant ahead of the fill order. A probe with every holder turning over broke M2's rent-settling test: migrants displaced locals a few a month, and the migrant stock grew for the whole run. At the slice's params turnover changes who holds a job only where idle locals stand ahead of the migrant holders in the fill order (services); elsewhere the quitters are rehired the same month, so it moves no golden run.
3. **Match the vacancies from idle workers only.** Idle means the labour force less what the group holds.
   - First within the area, in `fill_order`.
   - Then across the areas a worker can reach. Areas reach each other when a road component (start or built roads, rails excluded) has cells in both. An area that no road touches reaches only itself. Without the start network in the tick content every playable area reaches every other, as in M2.
   - Within each reach class the leftover vacancies take idle workers by §5.2's largest-remainder pairing, so no area is staffed first because of its id.
4. `filled`, `employed` and the firms' staffing are read off `held`.

A new post therefore stays a vacancy until an idle worker or a migrant takes it: no employed local is pulled across. When `held` is empty (the first month, or a loaded version 4 save) every worker is idle, so the month matches from scratch.

**Accessible vacancies** are the vacancies a migrant can take: those in a reach class that has an area with rental beds. The other vacancies are open, but no one can come for them. The `vacancies` series counts the accessible ones. `trimEmployed` (people leaving, §5.2) cuts `held` too. It cuts the group's home-area rows first, then the other rows in area order. No draw is made: turnover and layoffs are largest-remainder splits, so the labour step's RNG stream is unchanged.

**Migration (replaces §5.2's pull and its lost arrivals).**
- **Pull:** `migration.pull_sectors[kind]` lists the sectors whose vacancies pull that kind. Factory migrants answer factory and service vacancies (services list them in `fill_order`); construction migrants answer construction. `pull` reads the accessible vacancies in those sectors. The wage gap still reads `migration.sector[kind]`.
- **Allocation:** as in §5.2, except that an area's weight is its own pull vacancies, plus its free rental beds, plus its share of the accessible pull vacancies in its reach class's areas that have no free bed. That share is split over the class's areas with free beds by their free beds (largest remainder). Without such vacancies the weights are §5.2's.
- **Turned away:** arrivals who find no bed are no longer lost silently. They are split over the areas with rental beds by their accessible pull vacancies (largest remainder; with none anywhere, they go uncounted). A market with no rental beds takes none: its villagers' build test reads crowding, which stays 0 there and recorded as `housing[a].turnedAway`, this month's count, with a `turned_away` event and the `turnedAway` series. They are not people: no group grows.
- **Rents and building read them a month later:**
  - the rent target uses demand crowding, `(rental occupants + turnedAway) ÷ max(1, rental beds)`;
  - the village rule and the work units' dormitories add `turnedAway` to their unmet beds;
  - the dormitory test reads demand crowding.

  So crowding raises rents, and rents raise beds. The cap expulsion (§5.2) is unchanged.

**Fiscal (tick step 11).** Revenue grows with the occupied city:
- organic firms pay value-added tax and the land fee like any firm;
- formal service posts pay `growth.services.tax_rate` × `gdp.base_va_per_job_month.services` per staffed post. Staffed means the services row's fill ratio times its posts, times the collection efficiency and the local share;
- private shops and work-unit dormitories pay the land fee on their zone floor, as firms do (`floor ÷ max_far` × the regime's fee);
- informal posts pay nothing.

Finished works now owe maintenance: a done order adds `spent × works.maint_rate_year ÷ 12` a month from the next month (b&c §13.2).

**GDP.** Service posts add `base_va_per_job_month.services` × their staffed share, as base jobs do.

**State and saves.** `LabourMarket` gains `held` and `servicePosts: { area, formal, informal }[]`. `HousingMarket` gains `turnedAway`. `History` gains `vacancies`, `turnedAway`, `servicePosts` and `constructionPosts`. **Save version 5** adds them. The 4 → 5 migration sets `held` to empty and leaves `employed` and `filled` as saved, so the loaded game's next labour step matches once from scratch. It also sets `servicePosts` to empty, `turnedAway` to 0, and fills the new series with zeros.

**Params** (`params/slice.yaml`, placeholders):
- `labour.turnover_month`, `labour.jobs_per_crew_unit`;
- `migration.pull_sectors`;
- `growth.services.tax_rate`;
- `works.maint_rate_year`.

**R4's tests** (`test/jobs.test.ts`):
- **Construction jobs during works.** A funded works order raises its area's construction jobs while it works, and they go when it is done, with people and money conserved every month. (Idle locals within road reach take the crews' jobs at the start, so the departures are traced in the next test.)
- **Industrial jobs after occupancy.** Organic firms post jobs only once open. A placed power source on the zone's road raises the share and the posts.
- **Service jobs as wages are spent.** New factory wages raise service posts: formal posts on occupied shop floor, informal posts where the workers live.
- **Incumbents stay, layoffs and departures.** A job shock in one sector leaves the other sectors' holders in place and pulls migrants into the vacancy. When the posts go, their holders are laid off and the laid-off migrants leave, with people and money conserved every month.
- **Reach.** A vacancy in an area that no road joins to another is not filled from that other area.
- **Turned away.** With no free bed, arrivals are recorded and are no flow, and the next month's rent is higher than without them. Where the rent already passes the village build test, villages start rental floor for them alone.
- **Turnover.** With idle urban residents in an area where migrants hold service jobs, turnover hands some of those jobs to the locals; with `turnover_month` at 0 it hands none. The same seed gives the same holders.
- **Against an idle run.** A run that services and builds on connected land ends with more accessible vacancies, filled jobs, arrivals, rental beds and recurring revenue than the same start left idle.
- **Service posts stay bounded.** After a factory shock, service posts settle: they never exceed the induced jobs from non-service wages.
- **At rest, saves and determinism.** M2's rest test still holds. Save, load and continue matches an uninterrupted run, and a version 4 save loads.

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
  | **Roads and access** | Share of readiness cells within reach of a city road connected to the Luohu crossing. M4's roads have no geometry, so reach is counted per km of road in each area (§5.7) |
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
# M5a (§5.7): readiness, sez, shekou, shortcut and events are in params/slice.yaml in full (placeholder: true).
readiness: { weights: { roads: 0.3, serviced_land: 0.35, water_power: 0.35 }, road_reach_cells: 5,
             full_at: { roads: 0.3, serviced_land: 0.01 }, first_wave: { min_cards: 1, max_cards: 4 } }
shekou: { capture_share: 0.5 }                                  # replaces investors.shekou_capture_on_decline
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
3. **The save:** generated by running the prologue with the scripted `historicalPrologue` policy and a fixed seed, in sim-core's save format (§5.8). M5b's test generates it and checks the bands on every run. A save that fails the bands is not shipped. No save file is checked in yet, so the state body stays `placeholder: true`.

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
- **`apps/cli`**: `slice run --seed N --quarters 21 --policy default` writes a JSON series and a short HTML report (M6a, §5.9).
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
- **Golden runs:** fixed seeds for the three policies, plus `decline_all` and `historical_prologue` (§5.9). A change that moves their numbers must say so.
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

### 11.1 The browser app (M6c)
`apps/slice-ui` is a Vite app in plain TypeScript, the DOM and one canvas. Run it with `npm run slice:ui` (port 5174; Spike A keeps 5173).
- **The canvas:** it copies Spike A's technique rather than its code. Each layer is an offscreen ImageData at one pixel per 100 m cell, drawn under one pan-and-zoom transform. `apps/map-spike` stays as it is.
- **Loading:** the same `compileSlice` as the CLI and the tests (§5.9).
  - Vite imports each `SLICE_FILES` path as raw text.
  - It parses with `yaml` and hashes with a pure-JS sha256 (`src/sha256.ts`).
  - The browser's `slice.content` equals the node loader's.
- **The base map** draws from committed data only: the areas file (`data/starts/slice_areas.json`) and the buildable layer, fitted to the slice's bounding box.
  - Terrain and water draw under it only when the git-ignored Spike A grid (`apps/map-spike/public/grid/grid.bin`) is there. Without it the map draws on a flat ground.
  - The 1979 site register and the imagery stay in Spike A.

**The turn protocol** (`src/controller.ts`, pure, shaped like `playQuarters`). A session holds the state, the run's `Rng` (seed 1 unless the URL gives `?seed=`), the queued turn actions, and the state at the turn's start, for the briefing's deltas.
- **At a turn's start** (sub-step 0):
  - the player answers cards and queues turn actions;
  - **End turn** sends the answers and the queue to `runQuarter`.
- **`paused`:** a card that interrupts mid-quarter takes the screen. Only answers are sent, and **Continue** finishes the quarter. Turn actions are queued only at a turn's start. §5.1 refuses them while an interrupting card is pending, and the UI keeps them for the next turn's start.
- **`turn_end`:** the next turn's start. Cards from the quarter's last month are in the stack.
- **The end:** after the visit's month, the cards it raised are answered, and then the verdict screen shows `verdict()` and the reviews.
- **On every status the session adopts the returned state.** A call that throws (an illegal action) leaves the session as it was, and the error shows. The queue is kept, so the player can remove the action at fault.
- **Non-interrupting cards** wait in the stack until answered, or lapse (§5.8).
- **Nothing calls `step` to preview.** Previews use sim-core's pure functions:
  - `zoneCellsAllowed` for a drawn zone;
  - `previewOffer` on an investor or shortcut card;
  - `fiscalViews` and `moneyForProjects` for money;
  - the readiness card's payload for the report.
- **A zone drawn this turn** is known by the id it will get, `nextZoneId + k` for the k-th queued zone, as `cautious` does. Site preparation on it names that id.

**Strings and the language.** Content and data keep both languages (`LocalizedString` `{zh, en}`), and so do the views (`src/views.ts` returns `{zh, en}`). The UI shows one language, chosen at render time; choosing it is a display choice only.
- **The choice:** English (`en`) or Simplified Chinese (`zh`). The URL's `?lang=en|zh` wins, then the viewer's stored choice (`localStorage`, every access in try/catch), then English; the language a page opens in is stored, so a `?lang` visit is remembered. An in-app switch changes it: it stores the choice, rewrites `?lang` in place (keeping `?seed`) and re-renders. The language never enters the `Session`, so switching changes no sim state.
- **One language:** all the UI's chrome shows only the chosen language: the HUD, the panels and tabs, buttons, card titles, options and lines, ledger labels, the queue, the verdict screen, the map's hover readout and route key, the page's `<title>` and `<html lang>`, and the errors the UI writes.
- **Place labels stay bilingual** in both languages, wherever they appear (the map, the hover readout, panels, selects, card options and the queue): the names of areas, the 1979 sites, the routes, and precedent (historical) zones, e.g. 深圳火车站 Shenzhen Station. `place()` in `src/strings.ts` marks one: both its fields read `zh en`. A zone without a precedent name (`zoneLabel`'s `area · use #id`) is chrome and shows in one language.
- **The other exceptions:** the language switch names each language in its own script (English, 中文); ids (claim ids, the proxy's source id, card ids in a diagnostic), units (kW, USD, ¥) and numbers are not words of either language.
- **Content names come from content:** events and their options, investors, projects, teams, regimes, areas, leaders, and zones through `zoneLabel`.
- **The UI's own strings are in `src/strings.ts`,** each with an `en` and a `zh` entry: the system cards (investor, shortcut, loan, deficit, review, failure) and their options, the panel labels and the map's own words.
  - They describe mechanics, never history: no dates, figures, names or claims.
  - The briefing shows the sim's own deltas and content names only.
- **An option with an argument** (`accept:zone:<id>`, `accept:premises:<area>`) is labelled with that zone's label or area's name.
- **Errors:** the controller keeps an error as a string-table entry plus a detail and renders it in the chosen language, so a switch re-renders it. An error thrown by sim-core is a diagnostic: it shows as sim-core wrote it, in English, after "Could not apply" in the chosen language. sim-core's messages stay out of the string table.

**The screens** (`src/views.ts`, pure, tested, `{zh, en}`; `src/render.ts` turns them into HTML in the chosen language, pure and tested; `src/main.ts` only puts that on the page). The language switch sits on the turn screen and the verdict screen:
- **The turn screen:**
  - the briefing: the quarter, then residents, present non-locals, firm jobs, the quarter's GDP, money for projects and scrutiny, each with its change since the previous turn's start;
  - the card stack, each card with its options and, for investors, the preview;
  - the queued actions, each removable;
  - End turn or Continue.
- **The panels of §11:**
  - **the ledger:** `fiscalViews`' three views, obligations by kind, each loan's outstanding principal and schedule, and the forex quota;
  - **the area panel:** pops by kind, beds and occupants, jobs and filled posts by sector, utilities, facilities and the illegal floor share;
  - **the leaders panel:**
    - the mandate: the SEZ's chosen priority, named by its card's option in content, and whether content's `mandate.met` key is set;
    - for each leader: a placeholder portrait (the first character of the name), name, role, traits, rapport, standing, discipline risk shown as low, medium or high, and the shortcuts on record;
    - the falls, by name;
  - **the review panel:** this year's targets against `indicatorValue`, and each review held.
- **Controls:**
  - enforcement and the permit regime;
  - drawing a zone: pick a use, drag a rectangle, and the queue holds `zoneCellsAllowed`'s clip of it;
  - applying a zone of the historical template (`templateZoneAction`);
  - removing a zone;
  - committing a project to an area or a zone, at a priority;
  - cancelling a project;
  - contracting a team in pool mode.
- **Map overlays:**
  - land use (zones by use, the queued zones outlined);
  - the real illegal floor share, by area;
  - occupancy (rental crowding, by area);
  - the service gap;
  - buildable and serviced land.

  `serviceGap` is never set in Phase 1, so its overlay reads zero, and the area panel lists the facilities instead.
- **Out of M6c:** save and load, replay, renaming and editing zones (remove one and draw it again), the imagery layers, animation and phone layouts.

**Tests** (`apps/slice-ui/test/`):
- `sha256.ts` matches `node:crypto` on test vectors, and the browser loader's `slice.content` equals the node loader's.
- The controller, driven by each golden policy (its turn actions at each turn's start, its answers when paused), ends with a `runSummary` equal to its golden file.
- Every card and option raised in the golden policies, `aggressive` and `random`, over seeds 1–5, has a non-empty zh and en label. Every pending card in the controller's golden runs renders with each title, option and line label in both languages.
- **The language:**
  - every entry in `src/strings.ts` has a non-empty `en` with no Han character and a `zh` with one;
  - the pure renderers (`src/render.ts`), run in each language on every state of the controller's `default`, `aggressive` and `historical_prologue` runs, and on a queue holding every kind of order, show no string from the other language once place labels and the switch are removed: no Han character (or full-width punctuation) in English, and in Chinese no English string-table or content name and no Latin word but ids and shared units (kW, GDP, USD);
  - the golden runs, rendered in alternating languages at every step, still equal their golden files, and rendering leaves the session unchanged;
  - `resolveLang` takes the URL first, then the stored choice, then English.
- A drawn zone's preview equals the zone's runs after End turn. A throwing action leaves the session as it was.
- Each overlay's colour for a cell reads its area's value.

---

## 12. Build order (small commits, one system at a time)

**Map-first milestones (current order).** The M table below records the original demo. Keep its golden policies as a comparison while introducing the new loop; §5.10's growth shortfall is a baseline, not a target to reproduce.

| Step | Playable result and acceptance check |
|---|---|
| R1 · Spatial foundations | CLI and browser share point anchors and temporary road/rail placements. The planning view derives road frontage from committed zones; synthetic network checks cover interior reach, severed links and capacity shared across consumers. Each committed cell keeps its own work record (`planned → servicing → serviced`, with sunk work), and placed source and facility records sit in `GameState`. Both are saved at save version 2. `spatialViews` rebuilds frontage, reach and shared supply from loaded state. *Status:* done. No action or tick step writes the records yet, so M-series goldens are unchanged. Code: `packages/sim-core/src/{sites,network,works}.ts`; tests: `test/{start-sites,network,works}.test.ts`, which run interior reach, a severed link, shared capacity and identical views after save, load and a stepped quarter. |
| R2 · Placement and municipal works | Road/bridge paths, infrastructure placement and zone edits validate playable terrain and preview crew time and cost. Test that displaying a guide spends nothing; phasing it develops the first frontage without funding the whole guide; cancelling unstarted work and pausing a queue conserve funds and work. Spec: `buildings-and-construction.md` §13.2. *Status:* done, headless. Works orders share M4's crew pool and accounts; save version 3. The browser does not issue works actions yet (R5). Params are placeholders from the M4 templates' rates. Unfunded, a road commit raises the project-loan offer; that is left for R6 and not tuned. Golden runs: content hashes only. Code: `packages/sim-core/src/orders.ts`; tests: `test/orders.test.ts` |
| R3 · Organic growth | Under favourable policy, serviced I/C/R land can gain occupied floor without routine investor cards. Compare an isolated zone with connected land, and a pressured village with a quiet one. Charge stock, crews and costs to the responsible builder. Spec: `buildings-and-construction.md` §13.3. *Status:* done, headless. Small processing firms build and occupy their own factories with no card (`Firm.origin: 'organic'`), driven by orders and the fiscal regime and held back where the area's power and water could not supply them; private builders put up shops for worker spending, work units put up dormitories under rental pressure, and villages add informal shops. Builders pay their own way, with no ledger entry; private and work-unit crews take the pool at low priority. Routine card rates are cut to about a third. Save version 4. Golden runs (seed 1, end-1983 residents): historical_prologue 30,340 → 31,000 (12 organic firms in its Shangbu zone); aggressive 31,084 → 30,471 (rarer cards, and its card firms' power need leaves room for three organic firms); default, cautious and decline_all stay at 30,340 (no developable zone: default draws none, cautious never finishes its site preparation). Commercial tenants and informal shops post no jobs until R4. Code: `packages/sim-core/src/growth.ts`; tests: `test/growth.test.ts`. |
| R4 · Jobs and migration | Trace construction jobs during works, industrial jobs after occupancy, then service jobs as wages are spent. Compare accessible vacancies, arrivals, housing and recurring revenue against an idle run. Preserve population and money accounting through layoffs and departures. Spec: §5.11. *Status:* done, headless. Projects' and works orders' crews post construction jobs where they work; organic firms post once open, and placed sources raise their utility share through the spatial views; spending from non-service wages posts formal service jobs on occupied shop floor and informal ones where workers live. Matching keeps incumbents, with layoffs and migrant turnover, and fills vacancies only within an area or its road-reach class (areas 2, 4 and 6 have no road at the start). Migrants answer accessible vacancies; those who find no bed are recorded as turned away and raise rents and building a month later. Formal service posts pay tax, shops and work-unit dormitories pay the land fee, and finished works owe maintenance. Save version 5. Golden runs (seed 1, end-1983 migrants): default 320 → 769, cautious 320 → 591, aggressive 451 → 654, historical_prologue 998 → 1,517, decline_all 320 → 316 (its one project, a road link in area 2, which has no road, works a few months and stalls for money: its crew posts draw 2 construction migrants, and the layoffs when it stalls fall pro rata on all holders, so 6 start migrants leave). Most of the rise is incumbency: locals no longer move into new posts each month, so the posts pull migrants (each commit names its share). No growth multiplier is claimed: R6 measures it. Code: `packages/sim-core/src/systems/labour.ts`, `reach.ts`, `systems/migration.ts`; tests: `test/jobs.test.ts`. |
| R5 · Planning-map UI | Complete a quarter using map tools, read the limiting constraint at a cell and recognise the change at the next turn. Show sub-block detail at core zoom, network overlays, compact HUD, inspector and ledger/review drawers. |
| R6 · Calibration | Run phased headless policies at the §9 checkpoints. Report population definitions, occupied floor, vacancies, housing, servicing and debt by policy; explain changed goldens and evidence gaps. No growth multiplier is an achieved result until measured. |

**M-series build record:**
| Milestone | Contents | Done when |
|---|---|---|
| M1 | `sim-core` package: state, seeded RNG, `step()`, the action log, save and load. Also: `content/slice/areas.yaml` from whole proxy subdistricts, with the area invariant checked by `m1b_sites.py`; the map viewer's slice overlay synced to it (playable vs card-only, replacing the hard-coded Luohu + Shekou sets in `apps/map-spike/src/main.ts`) | The §5.1 tests pass (save, load and continue matches an uninterrupted 63-month run; replay from the log; the pause contract); the area invariant passes. *Status:* done. Rebuild the areas with `pipeline/m1_areas.py`, then run `pipeline/m1b_sites.py` (the invariant); sim-core's tests run in `npm run check` |
| M1b | The 1979 site register: candidate sites with claims, rough geometry, site flags on the map; start state compiled from it | Every site in the start state has a flag and a claim. *Status:* register and flags done; the start state is not compiled yet |
| M2 | Pops, labour, migration, housing (block stocks), village building (§5.2) | At rest, the start state holds still. Under a fixture job shock, the town fills with migrants and village rental floors on its own, illegal floors included. Without M3 there is no job growth, so the shock stands in for investors. M2's tests in §5.2 pass. *Status:* done, with placeholder numbers (`params/slice.yaml`, `content/slice/start_1979.yaml`). Tests: `packages/sim-core/test/m2.test.ts` |
| M3a | Zones, the historical template and historical names (§5.3) | The §5.3 tests pass: free zoning, the template applies, names attach by location, purpose and scale, and M2 runs are unchanged. *Status:* done. Names are labels only; the footprints are placeholder squares on present-day proxies. Code: `packages/sim-core/src/zones.ts`; tests: `packages/sim-core/test/zones.test.ts` |
| M3b | Industry, production, investors and the preview; investors locate in zones (§5.5) | Accepted investors create jobs, orders and housing demand. The §5.5 tests pass. *Status:* done, with placeholder numbers (`params/slice.yaml` `industry` and `investors`, the area utilities in `content/slice/start_1979.yaml`) and a placeholder buildable layer (rebuild with `pipeline/m3b_buildable.py`). Code: `packages/sim-core/src/investors.ts`, `src/systems/industry.ts`; tests: `test/m3b.test.ts`, `test/offers.test.ts` |
| M3c | Named emergence (§5.4) | Held until an in-window precedent is sourced. Then: a cluster emerges where conditions hold, takes its historical name only near its real place, and can emerge elsewhere under a generic name |
| M4 | Fiscal: ledger, obligations, projects, the loan, the deficit rule; nominal GDP; serviced land and the construction-capacity pool (§5.6) | Overbuilding forces a deficit card; the loan squeezes later years. The §5.6 tests pass. *Status:* done, with placeholder numbers (`params/slice.yaml` `fiscal`, `capacity`, `projects`, `teams`, `gdp`). M2 and M3 runs are unchanged without the fiscal content. Code: `packages/sim-core/src/fiscal.ts`, `src/systems/finance.ts`, `src/systems/projects.ts`; tests: `test/m4.test.ts` |
| M5a | The events step; the guaranteed first contract; the SEZ chain, its new origins and incentives; readiness, the 1980-Q2 check and the first wave; Shekou's capture; the leaders and the deal-maker's shortcut (§5.7) | Readiness visibly changes the first wave. The §5.7 tests pass. *Status:* done |
| M5b | The annual review and the sweep, the climate value, the remaining events and prologue beats, the budget cards and the grant warning, the briefing's loan and co-financing offers, and the closing visit (§5.8) | Each year's review forces a trade-off; the prologue tests pass; the 1980-Q2 snapshot is generated and passes its bands. *Status:* done. The snapshot is generated by the M5b test, not checked in as a file. The review targets, the climate and the event numbers are placeholders for M6's balance pass |
| M6 | The CLI, golden runs, the plausibility report; the 2D UI on the Spike A canvas. Built in three parts | All five exit criteria can be checked. *Status:* M6a and M6c done, so all five can be checked (the report, the golden runs, the UI); M6b held (§5.10) |
| M6a | One way to load the slice, the bands and measures, the `cautious`, `aggressive` and random policies, the CLI and its report, the golden runs, the property and speed tests (§5.9) | The §5.9 tests pass; the report checks criteria 1–5 on any run. No balance changes. *Status:* done. Run `npm run slice -- run --policy <name>` for a report and `npm run golden:update` after a change that moves a golden run. Code: `packages/sim-core/src/{content,calibration,play,summary,policies}.ts`, `apps/cli/`; tests: `test/m6a.test.ts`, `apps/cli/test/cli.test.ts` |
| M6b | The balance pass: named params only, with a tuning log, driven by M6a's report | The report's findings are fixed or recorded as structural. M5b's calibration properties still hold (§5.8). *Status:* findings recorded (§5.10); held for decisions on the slice's scale (options A–C) |
| M6c | The 2D UI on the Spike A canvas (§11, §11.1) | The §11.1 tests pass. A person can play all 21 quarters in the browser, from the first card to the visit's verdict. *Status:* done. Run `npm run slice:ui` (port 5174). Answering every card with its first option in the browser plays all 21 quarters and reproduces the default golden run's verdict. Code: `apps/slice-ui/src/` (`controller.ts`, `views.ts`, `render.ts`, `lang.ts`, `map.ts`, `main.ts`); tests: `apps/slice-ui/test/slice-ui.test.ts`, `lang.test.ts`. The UI shows English or Simplified Chinese (`?lang=`), and both play the default run to its golden verdict |
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
