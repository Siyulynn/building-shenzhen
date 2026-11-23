# System spec: the Phase 1 slice ("Luohu and Shekou, 1979–1984")
**Status:** draft v0.2. Decisions taken: start 1979-Q1, end at the January 1984 visit, Shangbu included, Shekou by cards only, quarterly turns. **Covers:** `PLAN.md` §10 Phase 1 and §14 step 3. **Uses the Phase 1 subsets of:** fiscal-and-macro §11, buildings-and-construction §13 and leadership-and-reviews §7. Those specs own their schemas, and this spec only says which parts the slice switches on and how they connect.

**Every number in this spec is a starting parameter** (in `params/slice.yaml`) unless it cites a claim. The start state uses placeholder values, flagged `placeholder: true`, until the slice's research targets (§9) are found. Evidence compiles in **draft mode** (evidence protocol §9), so the slice is allowed to run on `lead` and placeholder data, with every such value tagged `[UNVERIFIED]`.

---

## 1. What the slice must prove
Phase 1 tests the core triangle: **growth vs fiscal survival vs politics and reviews.** If it is fun in ugly 2D, the project is validated.

**Exit criteria** (from PLAN §10):
1. You can play all 21 quarters (1979-Q1 to 1984-Q1), and the town grows plausibly in response to your choices.
2. Budget pressure and the review target force at least one hard trade-off a year. A loan taken today visibly squeezes a later year.
3. The slice is checked against its own Luohu–Shekou plausibility bands (§9), not whole-city totals.
4. A headless 21-quarter run takes seconds, and the invariant tests pass.
5. **You want to play it again.** This one is judged by playtests (§12), not tests.

**The three tensions the player should feel:**
- **Obligations, loans and import access.** Every school, road and loan commits future money. Forex quota decides whether you can import the crane or the generator at all.
- **Village building.** Villagers add rental floors faster than you can plan. It houses the workers your factories need, and it blights the review.
- **The Secretary–Mayor pair and the review.** The deal-maker's shortcut closes the investor today, and raises a risk that can sink you at the year-end review.

**Out of scope** (later phases): the authority layer beyond one climate value; villages as full actors; the informal economy beyond one illegal-floor value per area; block assembly and developers; reclamation; title reviews; rotation of leaders; 3D; strict evidence gating.

---

## 2. Time and turns
- **Start:** 1979-Q1, when the area is still Bao'an County. **End:** 1984-Q1, with the January 1984 visit by Deng Xiaoping as the closing event. That is 21 quarterly turns of three monthly sub-steps each (PLAN §2). Quarterly turns are kept.
- **The arc:** about six quarters before the SEZ exists, the SEZ's establishment as the major early event (§7.1), then about fourteen quarters of building the zone, ending with the visit as the slice's verdict (§7.2).
- **All anchor dates are `lead`** in the evidence store (`data/evidence/claims/anchors_1979_1984.yaml`) until sourced.
- **Quarter character** (PLAN §2): Q1 Spring Festival departures and the annual budget card; Q2 the construction peak; Q3 typhoon risk; Q4 the year-end review.
- **Turn flow:** briefing → cards → plan and build → govern → end turn. Interrupting cards pause the turn mid-quarter (PLAN §6.2).

---

## 3. The map
- **The grid** is the Spike A grid (`docs/spikes/spike-a-map.md`): 100 m cells in UTM 50N. Only cells inside the slice areas are playable. Everything else is drawn but locked.
- **The coastline.** The start-state baseline is the Landsat 3 MSS scene of 1979-10-19 (source `landsat_1979_10_19`; `pipeline/m1b_landsat_1979.py`, notes in `docs/spikes/m1b-sites.md`). An automatic near-infrared threshold gives a 1979 water mask per cell and a change layer: about 79 km² inside today's city was sea in 1979 and is land now. The mask is a `lead` observation (60 m pixels, tide unknown) until a person checks it, so the map keeps a caveat. Until then the playable land still comes from the present-day DEM.
- **1979 is not a blank map.** The start state is built from a register of sites that already existed (§3.1), each flagged on the map with its evidence status.
- **The SEZ boundary** does not exist at the start. It is drawn onto the map by the establishment event (§7.1), and only cells inside it get SEZ policies afterwards.
- **Slice areas.** Ten areas, as a **design proposal**. Their names and roles come from general knowledge and are `lead`. Their geometry starts as present-day OSM subdistricts used as proxies, and should be redrawn from period maps once those are found.

| # | Area (proposal) | Proxy geometry (present-day subdistrict) | Role in the slice | Status |
|---|---|---|---|---|
| 1 | 深圳墟 Shenzhen market town (Dongmen) | 东门 | Existing town: shops, state units, the first services | lead |
| 2 | 罗湖 border crossing and station | 桂园 (part) + 南湖 (part) | Border crossing, railway, hotels, Hong Kong traffic | lead |
| 3 | 蔡屋围 Caiwuwei | 桂园 (part) | Village land beside the town; an early high-rise site | lead |
| 4 | 渔民村 Yumin and 黄贝岭 Huangbeiling | 黄贝 | Fishing villages that turn to rental housing; the future walkable route | lead (V18) |
| 5 | 笋岗 Sungang | 笋岗 + 清水河 | Flat land north of the railway: warehousing and industry | lead |
| 6 | 东湖 reservoir hills | 东湖 + 东晓 | Water supply and hills: mostly not buildable | lead |
| 7 | 莲塘 Liantang | 莲塘 | Edge land toward the eastern border | lead |
| 8 | 上步 Shangbu | 华强北 + 园岭 | Early industrial zone west of the town (later Huaqiangbei) | lead |
| 9 | 蛇口工业区 Shekou Industrial Zone | 蛇口 + 招商 | **Flagged area, reduced control** (enclave behaviour arrives in Phase 2) | lead |
| 10 | 南头 Nantou | 南头 | Old county town near Shekou; villages and farmland | lead |

Areas 1–8 form the Luohu cluster, and 9–10 the Shekou cluster. The land between them (present-day Futian and Nanshan) is locked in Phase 1. A single road link joins the two clusters.

- **The Shekou flag:** the player cannot zone or lease land inside area 9 at any point in the slice. They deal with it only through cards, and it competes with them for investors. It becomes an enclave when Shekou's industrial zone begins (§7).

### 3.1 The 1979 site register: what already existed
Shenzhen in 1979 had a market town, a border crossing and railway, villages, farmland, fishponds, a reservoir, roads and state units. These are **researched and flagged**, never assumed. Each existing site is a record in `content/slice/sites_1979.yaml`:
```yaml
- id: site.shenzhen_market_town
  name: { zh: 深圳墟, en: Shenzhen market town }
  kind: town            # town | village | crossing | railway | road | reservoir | farmland | fishpond | state_unit | factory | school | clinic | military | border
  area: 1               # slice area (§3)
  geometry: { kind: point, lonlat: [114.1136, 22.5466], proxy: osm_shenzhen_places, confidence: 0.2 }
  # kind: point (a present-day proxy) | polygon (ref: data/evidence/observations/sites_1979/<id>.geojson) | unplaced
  in_start_state: block_stock      # tracked_building | block_stock | facility | road | land_use
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
- **Status (M1b, 2026-11-23):** 20 sites in the register, 16 with present-day OSM proxy points (source `osm_shenzhen_places`) and 4 unplaced (railway line, Guangzhou road, border fence, military land). All flags are red. The viewer shows what the 1979 Landsat scene has at each proxy point as a hint for placing it.
- **The key sources** are the Landsat scene of 1979-10-19 (now in hand, 60 m) for coastline, water and the largest built-up patches, and the USGS aerial imagery from 1969 and 1977 (V15). Georeferenced against the Spike A grid, it shows the footprints of villages, fields, ponds and roads (evidence protocol §5.5).

**Candidate sites to study** (all `lead`: from general knowledge, to be confirmed and located):

| Site | Area | Kind | What to establish |
|---|---|---|---|
| 深圳墟 Shenzhen market town (the Dongmen streets) | 1 | town | Extent, streets, the market, shops, state units |
| The county's offices and state units in the town | 1 | state_unit | Which units, where, how many staff |
| 罗湖桥 Luohu bridge and the border crossing | 2 | crossing | Facilities, daily crossings, checkpoint |
| The Kowloon–Canton railway and Shenzhen station | 2 | railway | Line, station site, freight sidings |
| The Guangzhou–Shenzhen road | 1, 5 | road | Route and condition |
| 蔡屋围 Caiwuwei village | 3 | village | Houses, fields, population, lineage |
| 渔民村 Yumin village | 4 | village | Houses, fishponds, boats, population (V18) |
| 黄贝岭 Huangbeiling village | 4 | village | Houses, fields, population |
| 湖贝, 向西 and other villages around the town | 1, 3 | village | Which villages, where |
| 笋岗 Sungang village and farmland | 5 | village, farmland | Extent of fields and ponds |
| 深圳水库 Shenzhen Reservoir and its water supply | 6 | reservoir | Capacity; supply commitments, including to Hong Kong |
| The Shenzhen River and the border fence | 2, 4, 7 | border | Fence line, patrol roads, restricted strip |
| 上步 Shangbu: what stood there before the industrial zone | 8 | farmland, village | Land use in 1979 |
| 南头古城 Nantou old town | 10 | town | Walls, streets, population |
| Villages and farmland around Nantou | 10 | village, farmland | Which villages, where |
| Shekou: fishing villages, the harbour, oyster beds | 9 | village, fishpond | Shown only through cards (Shekou is an enclave) |
| Small factories, schools and clinics in the slice | all | factory, school, clinic | Which existed, capacity |
| Military and restricted land | all | military | Where building was not allowed |


---

## 4. What the player can do
| Action | System | Notes |
|---|---|---|
| Paint a land-use plan on cells: industrial, residential, commercial, public, reserve | buildings §3.1 | The plan guides builders but does not bind village households |
| Lease a parcel by allocation or negotiation | fiscal §5 | Leasing to outside investors opens with the SEZ; land-use fees follow the 1981 regulations. Auctions are locked in the slice |
| Build a road, water main, power line, school, clinic or police post | fiscal §6.2, §6.1 | Creates a project, then obligations once it is finished |
| Accept or decline an investor card | §6.5 | Shows the partial-equilibrium preview (fiscal §7.2). Before the SEZ, only a few kinds of investor can be accepted (§6.5) |
| Take the state-bank project loan; accept the co-financing offer | fiscal §11 | One of each in the slice |
| Answer the deficit card | fiscal §7.1 | Borrow, use land money, or cut |
| Set enforcement priority against illegal floors (low, medium, high) | buildings §5 | One enforcement level for the whole slice |
| Set the temporary-permit regime (loose, standard, strict) | §6.2 | Changes migrant inflow and the climate value |
| Accept or decline the leader's shortcut | leadership §2.5 | One shortcut card type (deal-maker) |
| Prepare for the zone (before 1980-08): build roads, power and water near the border, survey land | §7.1 | Readiness decides the first wave of investors when the zone opens |
| Answer event cards | §7 | About 15 events |

---

## 5. State in the slice
The slice uses the schemas from the owning specs, switched to their Phase 1 subsets:
- **Physical** (buildings §2): `BlockStock` for every block in the slice areas; a handful of tracked `Building` records for landmarks (the station, the first hotel, the first industrial building in Shekou: names `lead`). No promotion. Stages include `stalled`.
- **Fiscal** (fiscal §3): accounts `general`, `land`, `debt` and a simplified `forex` quota. Two regimes: `regime.county_1979` before the SEZ (a county-level budget with little room) and `regime.contracting_1980s` after it. Both are `lead`, with placeholder parameters until sourced.
- **Leadership** (leadership §2.1): one Secretary and one Mayor, both fictional, no rotation; the Mayor has the deal-maker trait. From 1979-03 they lead the new city; before that, the county.
- **Reviews:** no title reviews. The annual performance review (leadership §3) runs with the slice's targets (§6.8).

**Phase-1-only state** (sketched here; moves to the pops and authority specs when they are written):
```ts
interface SliceArea { id: number; key: string; name: LocalizedString; cells: Uint32Array;
  locked: boolean; flag?: 'shekou_enclave';
  utilities: { waterCap: number; powerCap: number };    // from built mains and lines
  facilities: { schoolPlaces: number; clinicVisits: number; policePosts: number };
  illegalFloorShare: number;                              // summary of the block stocks
  serviceGap: number; }                                   // fiscal §6.1
type PopKind = 'villager' | 'urban_resident' | 'migrant_factory' | 'migrant_construction' | 'hk_manager';
interface PopGroup { area: number; kind: PopKind;
  registration: 'local' | 'nonlocal' | 'hmt';             // PLAN §3.2 attributes, fixed per kind in Phase 1
  stayedSixMonths: number;                                // count with 6+ months, the rest is under 6 months
  size: number; employed: Record<Sector, number>; wage: number; savings: number; mood: number; }
interface Climate { reformWind: number /* −1..1, exogenous series */; scrutiny: number /* 0..100 */ }
```
- **The five pop kinds** are fixed combinations of PLAN §3.2's attributes. Villagers hold local rural hukou and village membership. Urban residents hold local hukou (state units, the town). Factory and construction migrants hold non-local hukou. Hong Kong managers are `hmt`. The three population counts (registered, resident, present) are filtered sums, as in PLAN §3.2.
- **Six building archetypes:** village house, village rental block, standard factory (标准厂房), dormitory, state-unit flats, shop or market. Public facilities are tracked as facility capacity on the area.

---

## 6. Systems and the monthly tick
The tick follows PLAN §3.15's order. Steps marked *off* do nothing in the slice.

| # | Step | What it does in the slice |
|---|---|---|
| 1 | External and national state | Read exogenous series: Hong Kong order demand, reform wind, credit conditions, national prices |
| 2 | Events | Draw and fire events whose triggers hold (§7) |
| 3 | Investment decisions | Investors arrive as cards; accepted firms join the industry blocks |
| 4 | Construction | Builders allocate starts; the pipeline advances; stalls and resumes (buildings §3–§4) |
| 5 | Labour market | Match jobs to pops by area, with a simple commute penalty between clusters |
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
- **Matching:** within an area first, then within its cluster, with a commute penalty. The Luohu and Shekou clusters do not exchange daily commuters in Phase 1.
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
- **Before the SEZ:** Hong Kong processing contracts (三来一补) and inland state units only, a card every two quarters or so. That such contracts were allowed in 1979 is `lead`.
- **After the SEZ:** about one investor card a quarter, and the origins widen to overseas Chinese and foreign firms, with SEZ tax incentives. The first wave's size depends on readiness (§7.1). Fields: origin (Hong Kong, overseas Chinese, inland state unit), sector, jobs, floor needed, utilities needed, the terms asked (land price, tax holiday, labour terms, forex), and whether they bring forex.
- **The preview** (fiscal §7.2) shows cash this quarter, retained tax per year, jobs, beds needed and new obligations.
- **Declining** an investor sends some of them to Shekou, which competes for them.
- **The deal-maker's shortcut** can attach to a card: accept a sweetheart price to close it now (leadership §2.5).

### 6.6 Construction economy
- **Builders in the slice:** village households, the city (projects) and Hong Kong investors (factories, dormitories, the hotel). No developers or block assembly.
- **Stalls** happen when credit tightens or a city project loses its funding.

### 6.7 Fiscal
Exactly fiscal-and-macro §11, with the deficit rule (§7.1) and the investor preview (§7.2). The three views shown are recurring money, money for projects and import access. **The loan:** one state-bank project loan, which appears once the player has committed to a road or water project bigger than they can fund. **The co-financing offer:** one investor offers to pay for a power line in exchange for a long tax holiday and cheap land.

### 6.8 Leaders and the annual review
- **The pair:** a Secretary (fictional, cautious) and a Mayor (fictional, deal-maker). Mandate: "open the first export processing zone" (leadership §7), set when the SEZ is established. Briefings at inauguration, the Q1 budget and crises.
- **The annual review (Q4):** targets for exports, foreign investment used, forex earned and infrastructure built, plus one basic sanitation and order check that includes an unannounced team. The era framing of these targets is `lead` (leadership §3).
- **Results:** political capital and the leaders' standing, and the scrutiny value.
- **Discipline risk** comes from accepted shortcuts (leadership §2.6). A fall from grace in the slice freezes projects and replaces the Mayor with a cautious figure, and can fail that year's review if the case touches an accepted shortcut.

### 6.9 Climate (the one authority value)
- **Reform wind** is an exogenous series in the slice. Its shape for 1979–84 is a `design_note` until sourced.
- **Scrutiny** rises with grey choices (a loose permit regime, tolerated illegal floors, accepted shortcuts) and with disasters, and decays slowly.
- **The failure state:** if scrutiny stays above a threshold for four quarters, the run ends with "the experiment is declared a failure" (PLAN §3.8).

---

## 7. Content
```
content/slice/areas.yaml          # the ten areas: keys, names (en + zh), proxy subdistricts, flags
content/slice/sites_1979.yaml     # the 1979 site register (§3.1)
content/slice/start_1979.yaml     # start state compiled from the site register plus placeholders (placeholder: true until sourced)
content/slice/investors.yaml      # investor card templates
content/slice/events/*.yaml       # about 15 events
content/slice/targets.yaml        # annual review targets
params/slice.yaml                 # all tunable numbers
```
Every historical statement cites claim IDs (CLAUDE.md). Claims that don't exist yet are created as `lead` in the same change.

**The events** (about 15). *Anchor* dates are fixed in Historical mode; *milestones* are timed by the player; *emergent* events fire from sim conditions. Anchors need `verified` claims (protocol §4). The `phase1.*` claims below are `sourced` from the Phase 1 research (`docs/research/phase1-1979-1984.md`) and wait for a person's check. They replace the earlier `event.*` leads, which stay in the store with a note until a person marks them superseded.

| # | Event | Family | Reference | Claim |
|---|---|---|---|---|
| 1 | Bao'an County becomes Shenzhen City | anchor | 1979-03-05 | `phase1.event.shenzhen_city_approval` (sourced) |
| 2 | Shekou's construction headquarters set up; works begin in July (area 9 becomes a card-only enclave) | anchor | 1979-04-01, 1979-07 | `phase1.event.shekou_command`, `phase1.event.shekou_works` (sourced) |
| 3 | Forex retention: quotas to buy foreign exchange | anchor (in force at start) | 1979 | `forex.retention.start` (sourced) |
| 4 | **The SEZ is established** (a chain of cards, §7.1) | anchor | 1980-08-26 | `phase1.event.sez_regulations` (sourced) |
| 5 | Land-use rules: decided 1981-11-17, in force 1982-01-01 | anchor | 1982-01-01 | `phase1.event.land_rules_1981` (sourced) |
| 6 | The second-line fence goes up | anchor | 1982-06 | `phase1.event.second_line_construction` (sourced) |
| 7 | **Deng Xiaoping's visit** (the closing event, §7.2) | anchor | 1984-01-24 | `phase1.event.deng_first_visit` (sourced) |
| 7a | The Bamboo Garden Hotel opens | anchor (card) | 1981-01-25 | `phase1.event.bamboo_garden_opens` (sourced) |
| 7b | The construction corps arrives | anchor (card) | 1982 (autumn) | `phase1.event.construction_corps_arrival` (sourced) |
| 7c | Interim rules on residence and temporary-residence papers | anchor (card) | 1983-07-06 | `phase1.event.temporary_residence_documents` (sourced) |
| 8 | The first processing contract signed | milestone | — | design_note |
| 9 | The first export processing zone opens (the mandate) | milestone | — | design_note |
| 10 | Shekou poaches an investor | emergent | — | design_note |
| 11 | Hong Kong orders surge, or slump | emergent | — | design_note |
| 12 | A typhoon (Q3) | emergent | — | design_note |
| 13 | A fire in a mixed factory and dormitory | emergent | — | design_note |
| 14 | Young villagers escape to Hong Kong (strongest before the SEZ) | emergent | — | design_note |
| 15 | A village petitions over land compensation | emergent | — | design_note |
| 16 | Unannounced inspection team | emergent (Q4) | — | design_note |

### 7.1 The SEZ's establishment: the major early event
The quarters before August 1980 are a **prologue with a deadline**. The player knows a zone is coming, but not its terms.
- **Before it (1979-Q1 to 1980-Q3):**
  - the county becomes a city (event 1), which gives the player city powers and the leader pair;
  - Shekou's zone begins next door (event 2) and starts competing;
  - escapes to Hong Kong are a constant pressure (event 14);
  - the player can prepare: roads, power and water toward the border, land surveys, and talks with villages. **Readiness** is a score built from serviced land, utilities capacity and road access near the crossing.
- **The chain (1980-Q3):**
  1. *The announcement card:* the zone's boundary is drawn onto the map (327.5 km² in Appendix A, `lead`). Cells inside become eligible for SEZ policies.
  2. *A choice of first priorities:* industry and processing, the port and trade, or commerce and tourism. This sets the mix of the first investor wave and the mandate's emphasis.
  3. *The opening:* the first wave of investor cards arrives. Its size scales with readiness. SEZ tax incentives, foreign-owned firms and leasing to outside investors unlock. The fiscal regime switches to `regime.contracting_1980s`.
  4. *Attention from above:* scrutiny rises, and the first annual review targets are set.
- **What the player feels:** preparation pays off (a big first wave), or the zone opens to a muddy field and investors go to Shekou.

### 7.2 The January 1984 visit: the closing event
- **The visit ends the slice.** It is a historical anchor, and its date and itinerary are `lead` until sourced.
- **Real people** follow PLAN §11: national figures appear only through documented public actions and words, with sources. The game never invents what Deng said or thought. Any words shown are sourced quotes; until then the card shows only the documented fact of the visit, as a `[UNVERIFIED]` lead.
- **The slice's verdict** is the game's own scorecard, shown alongside the visit. It does not imply the visitor's judgement. It covers growth, the ledger's health, the year's review, scrutiny and the illegal-floor share, and compares the run with the plausibility bands (§9).

---

## 8. Parameters (sketch of `params/slice.yaml`)
```yaml
migration: { base: { migrant_factory: null, migrant_construction: null }, network_lag_months: 6,
             permit_factor: { loose: 1.3, standard: 1.0, strict: 0.6 }, spring_nonreturn: 0.1 }
housing: { m2_per_bed: { village_rental: null, dormitory: null, flats: null } }
production: { value_added_ratio: { processing_hk: 0.2 } }       # fiscal §12
climate: { scrutiny_decay: 0.05, failure_threshold: 80, failure_quarters: 4 }
review: { pass_mark: 0.6 }
investors: { cards_per_quarter: 1, shekou_capture_on_decline: 0.5 }
```
`null` means "no defensible starting guess yet": choose one during M2 and record why.

---

## 9. Calibration: plausibility bands, then targets
There are no sourced Luohu–Shekou series for 1979–84 in the evidence store yet. So the slice starts with **plausibility bands** (`design_note`), each replaced by a real target when a claim reaches `verified`:
- the resident population of the slice roughly multiplies over the period, rather than staying flat or exploding;
- processing exports grow much faster than local GDP;
- village rental floor grows faster than planned housing;
- the city runs at least one recurring deficit before 1984;
- readiness before the SEZ visibly changes the size of the first investor wave;
- at least one stalled building appears after a credit tightening.

**Research targets for the slice** (leads to open; record them as claims):
- **the 1979 site register (§3.1):** existence, location and size of each site, starting from the USGS 1969 and 1977 aerial imagery (V15);
- population of Luohu and Shekou (or of the SEZ) by year, 1979–84, with registered and resident counts;
- Shekou Industrial Zone: firms, jobs and output by year;
- county and city budget revenue and spending, and foreign investment used, 1979–84;
- the terms the SEZ opened with in 1980 (tax incentives, what foreign firms could do, leasing);
- the terms of the 1980s fiscal contracting arrangement (fiscal §13);
- period maps of the Luohu and Shekou areas, for the area boundaries and the 1979 coastline.

---

## 10. The headless runner and tests
- **`apps/cli`**: `slice run --seed N --quarters 21 --policy default` writes a JSON series and a short HTML report.
- **Decision policies:** `default` (first option), `cautious`, `aggressive`, plus scripted answers. Every card answer goes into the action log (PLAN §6.2).
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
| M1 | `sim-core` package: state, seeded RNG, `step()`, the action log, save and load; `content/slice/areas.yaml` drawn from proxies | A run of 63 empty months is deterministic |
| M1b | The 1979 site register: candidate sites as `lead` claims, rough geometry, site flags on the map; start state compiled from it | Every site in the start state has a flag and a claim |
| M2 | Pops, labour, migration, housing (block stocks), village building | The town fills with migrants and rental floors on its own |
| M3 | Industry blocks, production, investors and the preview | Accepted investors create jobs, orders and housing demand |
| M4 | Fiscal: ledger, obligations, projects, the loan, the deficit rule; nominal GDP | Overbuilding forces a deficit card; the loan squeezes later years |
| M5 | Leaders, the shortcut, the annual review, the climate value, the events, the SEZ chain and the closing visit | Each year's review forces a trade-off; readiness visibly changes the first wave |
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

**Still open (defaults in bold):**
1. **Ten areas**, or fewer by merging the reservoir hills and Liantang.
2. **Nantou in the slice** (area 10) as the Shekou cluster's playable land, or leave the Shekou cluster entirely to cards.
3. **Readiness** as one score, or one per priority (industry, port, commerce).
