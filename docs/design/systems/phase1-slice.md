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

- **Plan.** Paint industrial, residential, commercial or reserve land, at an intensity (R8b); replace or cancel unworked cells. Developed settlements are existing stock, not freely erasable zoning. Lay outbound roads and place trunk utilities, facilities and approved landmarks. Internal lanes and distribution hookups are municipal work. A master plan such as Shangbu is a guide: showing it creates no order, reservation or bill. Only the cells the player commits enter the queue.
- **Build.** Each queued cell goes `planned → servicing → serviced`. Crews consume funded work on clearing, levelling, internal streets and hookups over months. Finish accessible frontage before advancing inward; break equal priorities by queue order then cell index. The first finished cell can develop while its neighbours wait. Show progress, pause and remaining cost by cell; record sunk work separately from future commitments.
- **Occupy.** On serviced, reachable land, ordinary private or public builders respond to policy and demand without a decision card. Industrial demand draws on orders and access; worker spending supports commercial premises; housing pressure attracts dormitories and flats. Existing villages can add rental floor and shops without a municipal servicing order. Keep cards for exceptional deals, major works, policy, crises and reviews.
- **Employ and finance.** Occupied floor and utility supply limit operating jobs; active builds post construction jobs. Match reachable vacancies after keeping incumbents. Wage income supports service jobs; vacancies pull migrants, who need beds. Crowding and tolerated additions carry review and fire costs. Taxes and land receipts compete with maintenance, payroll and debt. Headless comparisons must distinguish planned area from occupied floor and approved projects from active work.
- **Inspect.** The map is the primary workspace. A cell inspector distinguishes source/proxy location, proposed use, work remaining, road access, supplied share, jobs and beds. Keep the End Quarter control, demand and fiscal summary visible; detailed ledgers and political decisions can open over the map.

**R1 spatial contract.** `buildings-and-construction.md` §13.1 owns the layers. The first increment compiles `sites_1979.yaml` with `data/starts/slice_site_cells.json` through `compileSlice` for both CLI and browser. Each playable point has its register ID, bilingual name, kind, area, proxy source/confidence, claims with their uses, projected `[x,y]` and nearest in-city land `[x,y]` for area validation. Rebuild the projection with `python -I pipeline/m1b_sites.py` using the M1b inputs. Draw the projected point, even at the border; never treat the validation cell as a road, serviced hectare or extra population. Card-only sites have no playable marker. Unplaced sites stay in the register; no straight lines inferred between endpoints. `site.shangbu_land` is a landscape point, distinct from `precedent.zone.shangbu_industrial`. The second increment adds the persistent records: cell works with their stage and sunk work, and the placed water and power sources and facilities. It also rebuilds the derived views (road frontage, interior reach and shared utility supply) from loaded state on every call, and never saves them (§13.1 "Persistent records" and "Derived views").

**Temporary routes.** The researched alignments of `site.kcr_line`, `site.guangshen_road` and `site.jianshe_road` remain unplaced. For play, `content/slice/start_network.yaml` explicitly supplies temporary orthogonal waypoints for their core segments. Names and existence claims come from those register IDs; the waypoints carry no geometry claim. The map keys the two line styles as temporary. At the 3D branch merge replace these paths against the shared grid, keeping the IDs; importing a mesh is not required. The roads can demonstrate frontage in the planning view; the railway is a separate transport layer and confers no municipal utility access.
- **建设路 / Jianshe Road (R4.5)** joins Area 1 (the market town) to Area 2 (the station, the Luohu crossing and Yumin) at the start. It is a 1.3 km temporary path from `(386,378)`, beside the market-town cell `(387,377)` on the Guangshen route, south along the east side of the temporary railway to `(386,390)`, beside the station. (The research note's path starts on the market-town cell; its first two cells are already the Guangshen route's, so they are left out.) It runs through the R1 test fixture's zone, whose expectations were updated. The 1977 street sheet and a town memoir place a road between the town and the station before 1979 (`site.jianshe_road.exists_1979`, `site.jianshe_road.town_to_station`; [transport research](../../research/phase1-transport.md)). Without it, R4's reach rules (§5.11) cut Yumin's rental beds and the station off from the town on turn 1.
- **Areas 4 and 6 stay unlinked at the start.** The research also places a sand road from Dongmen to 文锦渡 (Area 4, `site.dongmen_wenjindu_road.exists_1979`); it is not in the start network yet. Area 6 (the reservoir hills) had no 1979 road. Both are reached only by roads the player builds.

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

**R9 framing (2026-11-25).** The beats above are the tutorial's mechanics. Four need reframing before R9.
The city is governed by a **市革命委员会** until the zone people's government of 1981-10-20 (renamed
深圳市人民政府 on 1981-12-21), so the opening uses the committee, not a mayoralty. The Q1 1979 "first
project" is the city's own survey; the documented Luohu formation package and loan are 1980. The 1980-Q1
co-financing should carry that formation package, not an undocumented Hong Kong power line. The Q3 1979
permit card is about applying the province's border and residence rules, not inventing a permit regime. A
non-blocking `news` layer adds the 1981–1983 political weather; see
`docs/design/systems/prologue-flavor-and-news.md` and `docs/research/phase1-political-calendar.md`.

**R9: the beats and the unlock schedule, as built** (revision plan §4.1, §4.4). The sim enforces each gate (§5.8, `content/slice/tools.yaml`). The rail shows a locked tool greyed, with the name of the event that opens it (§11.2).

| Turn | Beat (its card) | Opens: key → gates |
|---|---|---|
| start | — | industrial and reserve zones; low and standard intensity; `track` and `street` roads; Form site on one zone at a time; cards |
| 0 (1979-Q1) | `event.first_project`, the city's own survey: the two opening letters and a card that only reports. The first zone and road are drawn on the map | — |
| 1 (1979-Q2) | `event.first_processing_contract` (the offer) | `tools.formation_bulk` → `formation.bulk` |
| 2 (1979-Q3) | `event.permit_choice`: how strictly the city applies the province's border and residence rules | `tools.priorities` → `works.priority`, `policy.enforcement` (with `scrutiny.gauge`, as before) |
| 3 (1979-Q4) | `event.corps_advance`; the news `news.1979q4.provincial_city` (1979-11) | `tools.corps` → `zone.residential`, `structure.facility`, `team.contract`; `power.purchase` → `power.buy` |
| 4 (1980-Q1) | `event.cofinancing`: the loan, and a co-financed substation near Luohu | `power.substations` → `structure.power_substation` |
| 5 (1980-Q2) | `event.readiness_check` | — |
| 6 (1980-Q3) | `event.sez_established` (answered) | `investors.sez` → `zone.commercial`, `road.avenue`, `structure.power_station`, and the investor market |
| 1982-Q4 | the news `news.1982q4.storm_passes` (1982-12) | `intensity.high` → `zone.intensity.high` |

Capacity arrives alongside (revision plan §4.5, §5.6): the county core of 200 crew units from the start, +100 with the corps' advance (1979-Q4), +150 with the SEZ, and +900 with the 1982-09 deployment if accepted.

**When an opened tool can be used.** A scripted beat fires in its quarter's first month, after that turn's actions. An anchor or news record fires in its own month, and an `on_answer` unlock applies in the month of the answer. Turn actions are given at a turn's start. So a tool that a turn's beat opens can first be used at the **next** turn's start: the SEZ's from 1980-Q4, and high intensity from 1983-Q1. That is §4.1's "the tool the next beat needs". Only the turn-0 beat fires before the player's first action. The headless policies follow the same schedule: a map plan holds back each action until its gate opens (§5.9).

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
In the prologue the actions unlock one beat at a time (§2.1). R9's tool gates (§5.8, `content/slice/tools.yaml`) enforce the schedule in the sim. From the SEZ's establishment all of them are available, except high intensity, which opens in 1982-Q4.

| Action | System | Notes |
|---|---|---|
| Draw, edit, rename or remove zones (industrial, residential, commercial, reserve; R8b dropped public) at an intensity, on any playable cells; view the historical zone template, or apply one of its zones | §5.3, buildings §3.1 | Zoning is free. The plan guides investors and city builders (M3b) but does not bind village households. A zone close enough to a historical one in location, purpose and scale takes its name (§5.3) |
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
| Order site formation (三通一平) on a zone's cells: the **Form site** tool, a **site formation order** | §5.6, b&c §13.2 | Clearing, levelling, internal lanes, and the water and power connection at the plot edge. Each cell goes planned → forming → formed (§13, vocabulary) |
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
  | { type: 'create_zone'; use: LandUse; runs: CellRuns; template?: string; intensity?: Intensity } // M3a, §5.3; R8b intensity
  | { type: 'edit_zone'; zone: number; add?: CellRuns; remove?: CellRuns; use?: LandUse; intensity?: Intensity }
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
  - `header`: `{ format: 'sz-save', version, date, seed, content }`, where `content` holds each content file's hash (`SaveContent` in `save.ts`): areas, params, precedents, investors, land cover (R8a), fiscal, events, leaders, targets, the start network (R2) and the gateways (R8e). An older header keeps the hashes it was written with: a version-5 header has M3b's `buildable_sha256` and no `gateways_sha256`;
  - `body`: the state as JSON, with each typed array replaced by a reference;
  - `arrays`: the named typed arrays.
- `saveToJson` gives a canonical text form, with the arrays as base64.
- **Saving fails on NaN or Infinity**, which JSON would otherwise turn into `null` without warning.
- **Arrays are `u32le` only.** A milestone that keeps per-cell layers of another type adds its dtype (`u8`, `i16le`, `u16le`, `f32le`) here first.
- Compression and the file container belong to the caller, because no synchronous deflate exists without DOM or Node.
- Loading runs the migration table from the saved `version` up to the current one. Version 1 is the first. Version 2 (R1) adds `cellWorks`, `structures` and `nextStructureId`, and its migration defaults them to empty (`buildings-and-construction.md` §13.1). Version 3 (R2) adds `roads`, `worksOrders` and `nextOrderId`, and the header's content gains `network_sha256` (§13.2). Version 4 (R3) adds `growth.carry`; version 5 (R4) adds the held jobs, the service posts and their series (§5.11).
- **Version 6 (R8e)** covers all of Pass 2's state in one bump. Its migration, from version 5:

| Field | Version 5 | Version 6 | Migration |
|---|---|---|---|
| `Zone.use` (§5.3) | could be `public` | no `public` | `public` becomes `reserve`, in the zones and in the action log's `create_zone` and `edit_zone` |
| `Zone.intensity` (§5.3) | none | optional; absent = standard | nothing written: every version-5 zone is standard |
| `structures`, a live order's `placement` (§5.5) | `power_source` | `power_substation` | the same cell, attach cell and capacity. R8c already read a `power_source` as a substation, so supply is unchanged. The action log's `place_structure` follows |
| `requisitioned` (§5.5) | none | required, sorted cells | every cell with works, serviced land, or a site-preparation project's cells: land already taken owes no compensation |
| `power` (§5.5) | none | required: `{ purchases }` | `{ purchases: [] }`. A version-5 power purchase had already raised `area.utilities.powerCap`, which the save keeps |
| `roadClass` (§5.12) | none | optional overrides | nothing written: start routes keep their class, built roads are streets |
| `history.freightUnmet` (§5.12) | none | optional | nothing written: the first month run fills each row with zeros for the months before it |
| `WorksOrder.rateFactor` (§5.3) | none | optional; absent = 1 | nothing written: version-5 service orders were standard |
| header `gateways_sha256` | none | the gateways file's hash | not invented for an old header |

  `s.roads` keeps its name: the plan's `s.roads`→`s.roadClass` rename was not made (§5.12). The load test (`save-v6.test.ts`) builds a version-5 save: four quarters of the historical plan, written back in version 5's shape with a public zone and a placed power source. It migrates it, plays three months with the invariants, and round-trips as version 6. A save the pre-R8 code wrote is loaded the same way when present locally; it is not checked in.
- **Version 7 (R9)** adds `crew: { team, crew, from }[]` (§5.6, required). Its migration from 6 writes `crew: []`. A version-6 run's corps advance was a pool contract, which the save keeps, so its pool is unchanged. `events.modifiers` (§5.8) and `WorksOrder.pace` (§5.6) are optional, absent = none and normal, and need no migration.
- **Version 8 (R9.2)** adds `history.electricity: number[]` (§5.5, required). Its migration from 7 writes zeros for every month the run recorded: an older run never measured consumption.

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
type LandUse = 'industrial' | 'residential' | 'commercial' | 'reserve';   // buildings §2.2's plannedUse; R8b dropped 'public'
type Intensity = 'low' | 'standard' | 'high';                           // R8b: Zone.intensity, absent = standard
type CellRuns = [number, number, number][];   // [y, x0, x1], inclusive, sorted by y then x0, disjoint: plain JSON
interface Zone {
  id: number;                 // from nextZoneId, never reused
  use: LandUse;
  runs: CellRuns; cellCount: number;
  area: number;               // the playable area holding most of its cells (ties: lower id); recomputed on edit
  created: YM;
  template?: string;          // the precedent it was applied from: a record of what the player did, not of history
  servicedShare?: number;     // M3b hook (§5.5): the share of its buildable cells serviced (三通一平), 0–1; absent = 1
  intensity?: Intensity;      // R8b: absent = standard
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
| 上步工业区 Shangbu Industrial Zone | 7 | Centre of OSM way 588326736 (present-day `landuse=commercial`), 6 × 6 placeholder cells | `precedent.zone.shangbu_industrial.exists`. No. 1 factory completed in July 1983 (`phase1.zoning.shangbu.factory_1_completed`). |
| 八卦岭工业区 Bagualing Industrial Zone | 7 (Yuanling reference envelope) | Unplaced in the template. The later gazetteer identifies Yuanling and bounding roads (`phase1.zoning.bagualing.road_envelope_gazetteer`). | `precedent.zone.bagualing_industrial.exists`. October 1983 start and naming (`phase1.zoning.bagualing.first_works`). |
| 水贝工业区 Shuibei Industrial Zone | 1 | Placeholder square at the OSM 水贝社区 quarter point. The gazetteer describes a road envelope in Cuizhu (`phase1.zoning.shuibei.road_envelope_gazetteer`). | `precedent.zone.shuibei_industrial.exists`. Named in the September 1982 strategy (`phase1.zoning.shuibei.industrial_development_proposal`). |

- **Scale:** the paired figure (`phase1.housing.shangbu_bagualing.completed_industrial_floor.1984`, about 110,000 m² through end-1983) covers both zones together. It is not split. The template's scale is its placeholder cell count until each zone's extent is traced on period maps (§9).
- **Timing:** the September 1982 coordinated development decision, Bagualing's October 1983 construction start and Shuibei's proposal describe different milestones. The 1980-Q2 snapshot applies none (§9.1). Event gates remain a Phase 1 content decision when M5's events exist. [Zoning research](../../research/phase1-m3-zoning.md)

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

**Intensity (R8b).** "Tiered zones" means intensity in this slice. `Zone.intensity: 'low' | 'standard' | 'high'`, where absent means `standard`. `create_zone` and `edit_zone` take `intensity?`. Each tier pays for its floor differently, with factors from `growth.intensity[tier]` (placeholders, design_note):

| Tier | FAR × | Formation cost × | Formation work × | Firm power × |
|---|---|---|---|---|
| low | 0.6 | 0.7 | 0.5 | 0.8 |
| standard | 1.0 | 1.0 | 1.0 | 1.0 |
| high | 1.8 | 1.6 | 1.5 | 1.3 |

- **FAR.** The tier's factor multiplies `growth.far[use]` in `zoneRoomM2` (organic room) and `industry.max_far` in `zoneCapacityM2` (investor siting). It moves the room, not the demand.
- **Site formation.** A cell's units are multiplied by the work factor. The service order keeps one yuan-per-unit rate, multiplied by cost ÷ work and recorded on the order as `rateFactor`, so its pro-rata spending stays exact. Land compensation is about the land, not the tier, so it is unchanged. A detached work adopted by a new order keeps its units and is paid at that order's rate.
- **Formation is priced at the tier in force.** `edit_zone` refuses to raise a zone's tier once any of its cells is serviced or has works, so land formed cheaply at low cannot take a higher FAR. Lowering is allowed.
- **Known gap.** A player can still remove the zone and repaint a higher tier over its serviced land. Closing this needs each cell to record the tier it was formed at, which is left for later.
- **Power.** A firm sited in a zone takes `powerKw` × the tier's power factor when it is created. The R3 prospective test reads the same factor. Overbuilding high is how a player runs past the city pool (R8c).
- **No tier is cheapest per m² of floor on every count.** Low is cheapest in power and ties high in work, high is cheapest in money, and low also uses the most land. This is tested. The plan's low cost factor of 0.5 made low cheapest on all three counts, so it is 0.7 here.
- **High is gated.** It needs the unlock key `intensity.high`, which `news.1982q4.storm_passes` sets (R9, §2.1); with the tool gates, `zone.intensity.high` refuses it first, with the gate's reason (§5.8), and this check stays for content without gates. It also needs an avenue cell (R8d) 4-adjacent to one of the zone's cells. `create_zone`, `edit_zone` and `commit_works` check both and refuse with a named reason. Zone actions take the road check from the construction step, so it needs the works content.
- **Low and standard need no particular road class in R8b.** Frontage from any road serves both. The plan's "a street or better" for standard is not enforced, because it would refuse zones that today's plans draw ahead of their roads.
- **Migration.** Absent means standard, so a version-5 zone is a standard zone and its migration writes nothing (§5.1's table). A version-5 `public` zone (the starts have none) becomes `reserve` in R8e's migration. `FloorUse` drops `public`.
- **Later, not now:** zones that differ by firm or product type. This is an open design question for after Phase 1.

### 5.4 Named emergence (M3c, held)
A sketch, not built.
- **Generic emergent things:** enterprises, landmarks and clusters (an electronics market, a first supermarket) form from sim conditions at any location: firms by product line, shop floor, demand, with a seeded hazard. They are `emergent` events (PLAN §7).
- **Historical names attach by the zone rule:** a precedent of the same kind and archetype gives its name when the location, purpose and scale are close enough. Otherwise the thing gets a generic name, so other electronics hubs can emerge elsewhere under their own names.
- **Location preference:** a precedent may add a modest hazard multiplier (a param) at its real place, so history leans toward it without forcing it.
- **Historical candidates:** the SEG components market and the Wanjia retail lineages postdate the slice (`precedent.cluster.huaqiangbei_electronics`, `precedent.landmark.wanjia_first_store`, `phase1.zoning.vanke_wanjia_huaqiangbei.opened`). The Electronics Building / 电子大厦 and Friendship Department Store / 友谊商场 give in-window landmark candidates (`phase1.zoning.electronics_building.completed`, `phase1.zoning.friendship_store.opening_photo`). The [research note](../../research/phase1-m3-zoning.md#named-development-inside-the-slice--切片内的命名实例) also lists an early electronics firm.
- **Build dependency:** firms with product lines arrive in M3b. M3c remains held while candidate geometry and gameplay use are established.

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
- **Buildable cells** are the formable cells of the land-cover layer (below, R8a). Until R8 they came from `data/starts/slice_buildable.json` (`pipeline/m3b_buildable.py`, now superseded and kept for reference): land on the present-day DEM, not 1979 water, slope ≤ `slope_max_pct`.
  - **Zoning unbuildable cells stays legal** (§5.3). They add no capacity, and the inspector names the cell's class.
  - **The layer records the `areas_sha256` it was compiled from.** sim-core refuses a layer compiled from other areas or another grid.

**The land-cover layer (R8a).** One class per cell of the seven playable areas, in `data/starts/slice_landcover.json`, written by `pipeline/m3c_landcover.py` and compiled by `src/landcover.ts`. Content, never state; `landcover_sha256` replaces `buildable_sha256` in the save header (version 5 headers written after R8a carry it; §5.1). It is a **placeholder at `lead`**: the rule cites `phase1.map.landsat_1979`, `phase1.map.kh9_1980` and `phase1.map.shenzhenxu_refs` as `design_note`, and no claim is promoted by the derivation. The audit, its confusion tables and the caveats are in `docs/research/phase1-landcover.md`.
- **Eight classes**, first match wins, with fixed thresholds (never per-area quantiles; the numbers are in the file's `thresholds`):
  1. `water`: DEM water, or a 1979 water body of ≥ 50 cells (the reservoir and the river);
  2. `tidal_flat`: coast change 2 within two cells of 1979 water, or elevation < 3 m within two cells of DEM water;
  3. `pond`: inland water in 1979 that is land now, in a smaller body, at or below 50 m;
  4. `hill`: slope > 15%;
  5. `village`: within 5 cells of a village point, with built texture on KH-9 1980;
  6. `town`: within 6 cells of a town, state-unit or railway point, with built texture;
  7. `upland`: slope > 6%;
  8. `lowland_farm`: everything else.
  Two deviations from the plan's first wording, both forced by the inputs: every 1979 water cell in the playable areas is also coast change 3, so `water` takes only large bodies; and about a fifth of 1979 inland water lies on hills (shadow), so `pond` has an elevation ceiling.

- **The compiler checks** the classes and their order, the grid and the areas hash, and that each playable area's classes **partition** its cells: no gap, no overlap, nothing outside the area.
- **Formable classes** (decided): `upland`, `lowland_farm`, `pond`, `town`. **Villages are not formable**: development wraps around them and their `village_rental` floor keeps growing. `water`, `tidal_flat` and `hill` are not formable either (no reclamation or terracing in Phase 1). A road on a `water` or `tidal_flat` cell is a bridge (§5.6 works); a road may cross `hill` and `village` cells at the road rate.
- **Formation cost** (`growth.land_cover.<class>.cost`, placeholders): a formable cell's service work is `round(works.service.units_per_cell × cost)` units, at the order's one rate (`works.service.yuan_per_cell ÷ units_per_cell`), so work and money scale together: upland 1.6, lowland_farm 1.2, pond 1.8, town 1.2. A zone that spans classes has a mixed cost; the preview shows the total and the split by class.
- **Land compensation (征地补偿)** (`growth.land_cover.<class>.compensation`, a multiple of `works.service.yuan_per_cell`, placeholders: upland 0.25, lowland_farm 1.0, pond 1.25, town 1.5; half the revision plan's first table, which failed the 1983 spending band for both the historical and the aggressive plan, `m6-tuning-log.md`). `commit_works` on a service order posts **one** obligation of kind `compensation`, due the next month (`from` = `until` = the next month), for the committed cells not yet in `s.requisitioned`, and adds them to that sorted list. Cancelling refunds nothing; recommitting a requisitioned cell owes nothing. It is paid from `general` like every obligation, so money stays conserved, and it shows in the Budget drawer. Household income effects of requisition are out of scope in Phase 1.
- **`commit_works` refuses** a service order with no formable cell (`no formable land`); the unformable cells of a zone are left out of the order, as cells with works already are. Without the layer (fixtures), every cell is formable at factor 1 with no compensation.

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
- **The city power pool (R8c).** Power is one city pool, and water is not an active constraint: it still loads, and a firm's share no longer reads it.
  - `powerPool(s)` = the areas' local `powerCap` + purchased kW that has arrived + the capacity of every finished `power_station`.
  - An area can take its local `powerCap` plus what its `power_substation`s deliver along the roads (`spatialViews(…).supply`).
  - When the areas can take more than the pool holds, the pool is shared pro rata to what each can take (`poolShares`). An area's share is `min(1, its part ÷ its open firms' need)`.
  - The retired `water_source` and `power_source` kinds still load, and are counted as delivery, but are no longer ordered.
- **The electricity series (R9.2).** A reporting series, not a constraint: `history.electricity` records the month's kWh from `electricityMonthly(s, p)` = `hours_month × firm_load_factor ×` the open firms' staffed share of their connected kW, plus `present × kwh_person_month` (households) and the base economy's filled jobs `× kwh_job_month`. The four numbers are `power.consumption` placeholders; the checkpoint reports the series annualised (the month's value × 12). It exists so the 1979–82 all-society consumption claim can be read as a curve; it is not a band while the 1979 figure's conflict is open.

**The preview** (fiscal §7.2). `previewOffer(state, card, params, content)` is a pure function. For each site option it gives:
- jobs, the months until it opens (`build_months − 1` for a new factory, 1 in existing premises), the floor and dormitory built, and the zone's free floor or the area's free premises jobs;
- beds needed: jobs − dormitory beds, which is every job in existing premises;
- power and water needed, against what is free in the area;
- per year at full ramp: gross output, exports and value added.

**Deferred.**
- **To M4** (specified in §5.6):
  - the preview's cash this quarter, retained tax and new obligations. They need the fiscal regime.
  - **Serviced land (三通一平; "formed land" to the player since R7, §13 vocabulary):** M4's site-preparation projects set a zone's `servicedShare`, which M3b already reads: road access, water, power, and cleared, level ground. A connected site stays distinct from one with spare water and power to operate.
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
- **Bought power (R8c):** `{ type: 'buy_power'; kw }` is city-level; an old action's `area` is ignored.
  - The kW joins the pool after `fiscal.power_import.lead_months`, and from then owes a permanent monthly `service` obligation of `kw × yuan_per_kw_month`.
  - Purchases still pending count toward `max_kw`, the line's limit.
  - It needs no works order, but the power reaches firms only through substations or an area's local plant.
  - It is a finance action, logged and replayed like a project. The tariff, lead time and limit are placeholders: `phase1_power_supply.yaml` holds only leads.
  - A `power_station` (structure) is built at its own pace, `units ÷ build_months` a month, and joins the pool when it is finished.
- **Spending follows the work.** A month's work on a city project costs its pro-rata share of the budget: spent after = round(budget × crew-units delivered so far ÷ (crew × workTotal)). So the total spent is exactly the budget at completion. It is paid from `debt`, then `land`, then `general`. `general` is drawn only down to `reserve_months` × last month's obligations due (in the first month, × this month's baselines), so the recurring side keeps its reserve.
- **Waiting for finance:** a project whose month cannot be paid gets no work that month (`stage: 'stalled'`, `waiting: 'finance'`) and resumes when money returns. `stalled` and `waiting` describe this month only: a project that waits for capacity is `committed` or `building`, never `stalled`. This is buildings §4's stall, for a city project that loses its funding.
- **Completion** applies the template's asset, then its obligations:
  - `road`: `roadKm` in its area (readiness reads it in M5);
  - `water_main`, `power_line`: `waterCap` or `powerCap` in its area (§5.5's spare utilities);
  - `site_preparation`: its cells join `servicedLand`;
  - `school`: `schoolPlaces` in its area, plus `payroll` (staff × the state wage, `index: 'wages'`) and `service` per place;
  - every kind: `maintenance` = budget × `maint_rate_year` ÷ 12.

**Serviced land (三通一平, the §5.5 hook).** The player-facing English is *site formation* and *formed land* (R7, §13 vocabulary); `servicedLand` is the legacy internal key.
- **Serviced land is a property of the land, not of a zone.** `servicedLand` holds the serviced cells. In tick step 3, before names and offers, and again in step 4 once the month's work is done (so site preparation finished this month counts at once), each zone's `servicedShare` is set to its buildable cells in `servicedLand` ÷ its buildable cells (0 when it has none). Offers already raised keep their options; the next month's offers can site in the zone. So an edit that adds cells lowers the share until they are serviced, and removing a zone leaves its land serviced for the next. From R2, municipal works orders (`buildings-and-construction.md` §13.2) join the pool's queue as a third job type, and their unspent budgets count as commitments. Site preparation skips cells that have works.
- **The start:** `servicedLand` is empty. The 1979 town has no serviced industrial land (a placeholder, like the start utilities). The first contracts use existing premises (§5.5).
- **Connected is not supplied.** Site preparation adds floor capacity for new firms. It adds no water or power: a serviced zone can still have a utility bottleneck, which only mains and lines relieve (§5.5).
- **Rights and compensation** are not settled by levelling. Village compensation is part of readiness's serviced-land part in M5 (§7.1).
- **Evidence:** the 1979 report proposes that an outside contractor deliver "几通一平" for an export processing zone. Early Luohu–Shangbu works are described as "七通一平". [Construction capacity research](../../research/phase1-m4-construction-capacity.md). 三通一平 is the playable minimum, not a historical label for every site. The Luohu servicing estimate of ¥90 per m² of gross land (`phase1.fiscal.luohu.site_servicing_estimate.1980`, sourced, awaiting intake) is a five-connection package. It is the candidate for `budget_per_cell` once it is in the store.

**The construction-capacity pool.**
- **Units.** A *crew unit* is one organised worker-month of formal construction capacity. A job's `crew` is the crew units it uses a month at full pace. A firm's cohort has `crew = max(1, ceil(m² × capacity.crew_per_m2))`. A project's `crew` is a template param.
- **Work stays in months, and stays integer.** Each month a job is given an integer number of crew units, at most its crew. They go into its `crewBank`. Whenever the bank holds a full crew, `workDone` gains a month and the bank loses a crew. Completion is still `workDone ≥ workTotal`. A job given its full crew every month advances one month a month, exactly as in M3b. One given half advances every second month.
- **Supply each month:** `capacity.local_crew` (the county's own builders: a param, so the pool does not depend on this month's employment, which step 5 computes later) + the crew of every pool contract active this month.
- **R9: capacity arrives in waves (revision plan §4.5).** The supply is `crewPool(s, p)`: `capacity.local_crew` (the county's core, a placeholder kept at 600: the plan's 200 lowered 1979 spending further below its floor and stopped the aggressive run reaching its power and freight limits, so the core is set against the 1979 spending floor first, as the review note below says) + every arrival in `state.crew` from its `from` month + every live pool contract. The pool step, the map plans' phasing, the chip and the planning preview all read this one function.
  - **Arrivals** are permanent. They come only from the event effect `{ kind: crew_arrival, team }`, which appends `{ team, crew: params.teams[team].crew, from: date }` to `state.crew` (kept sorted by `from`, then team). Content carries no number.
  - **The schedule** (placeholders):
    - `event.corps_advance` (1979-Q4) brings `team.corps_advance` (+100), replacing its nine-month pool contract;
    - `event.sez_established` (any priority) brings `team.sez_builders` (+150), the zone's own construction companies (a composite, `design_note`);
    - `event.corps_deployment` (1982-09, `accept` only) brings `team.engineering_corps` (+900). Declining adds nothing.
  - **The corps and the zone's builders are `event_only`.** The player's `contract_team` (gated `team.contract`, from 1979-Q4's beat) hires `team.outside_soe` or a county crew: a hired company is a 12-month contract, and the corps is a stock.
  - **Review note (R9).** The core's cut lowers 1979–80 works spending, which pushes the 1979-Q4 and 1980-Q2 spending-to-revenue bands toward their *floors*. The wave raises 1983 crew, which could push the 1983 spending ratio toward its *ceiling* if city works took it. So the map plans size their servicing phase on the county core alone (`crew_share × 3 × capacity.local_crew`, unchanged). The waves then mostly serve the private builders' cohorts, which pay their own way (§4.6's free lever). The 1979 core is calibrated against the 1979 spending floor first.
- **R9: works pace (revision plan §4.6).** Each works order has a `pace`: `normal` (absent), `push` or `all_out`. It is chosen at commit (`pace` on `commit_works`, `build_road` and `place_structure`) and changed by `set_works_pace { order, pace }`; both are gated with `works.priority`.
  - **At pace k,** each crew unit the order takes does `1 ÷ works.pace[k].units` units of its work, and each unit of work costs `works.pace[k].money` × the normal rate. The placeholders are units {1, 0.75, 0.55} and money {1, 1.25, 1.6}. So an order's money scales by exactly its factor (the plan's `budget × b`), and its crew by about its factor (the plan's `unitsTotal × u`; a month's work is whole units, below).
  - **Not paced:** a power station, which is built at its own pace over `build_months`, and a co-financed order, which costs the city nothing. Pace is refused on both.
  - **The monthly draw is unchanged** (at most `crew_per_order` crew units), so a rushed order finishes sooner without starving the builders.
  - **Changing the step** re-prices only the unworked units; sunk work and money are never re-priced. The order's `budget` is recomputed as `spent` plus the remaining work at the new step.
  - **Priority stays** the crew-for-time lever and pace is the money-for-time lever. No global slider exists. The headless plans keep `normal`.
  - **Fractions.** The pool deals in whole crew units and an order in whole units of work. In a month an order at a step below 1 does `floor(crew ÷ units)` units and takes `ceil(units done × units)` crew, so the spare fraction of a crew unit passes down the queue. Its work is also capped by what it can reach and what the city can pay for, whatever crew it was given.
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
- **`gdpNow(state, params, work = 0)`** (R7, `systems/statistics.ts`) is this sum for the state's current month; step 13 records `gdpNow` with the month's work, and the UI reads it with no work before the first month is recorded. Before any labour step there are no job rows, so the base jobs count as filled (the first month fills them all at the start). The series is unchanged.
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

**Params** (`params/slice.yaml`, placeholders): `fiscal` (`start_regime`, `start_balances` (`general`, `land`, `debt`, `forex_usd`), `provincial_base_grant_per_year`, `county_base_revenue_per_month`, `county_base_obligations_per_month`, the per-head baselines, `collection_efficiency`, `reserve_months`, `forex`, `short_loan`, `austerity_max_cut`, `loan`, `cancel_penalty`, `power_import`), `capacity` (`local_crew`, `crew_per_m2`), `construction.cost_per_m2`, `projects` and `teams` by id, and `gdp`.
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

**Events** (tick step 2, `content/slice/events.yaml`). Each record has an `id`, a `name` in both languages, a `family` (`anchor | scripted`, §7), one `trigger`, its `effects`, an optional `card` and `on_answer` effects, and `claims`. A record with a card also has a `description: { zh, en }` (R7): two sentences, what happened and why it matters, with no number that belongs to params and no historical statement beyond what the record's claims support.
```yaml
- id: event.sez_established
  family: anchor
  trigger: { date: 1980-08 }            # or { prologue_turn: 1 }: never a year in code
  card: { interrupting: true, options: [ { id: priority.industry, name: { zh: …, en: … } }, … ] }
  on_answer: [ { kind: sez_open }, { kind: set_regime, regime: regime.contracting_1980s }, { kind: unlock, key: investors.sez }, { kind: first_wave } ]
  claims: [ { id: phase1.event.sez_regulations, use: anchor_date } ]
```
- **Triggers.** `date: YYYY-MM` fires in the first month on or after it; it is dated content citing the anchor's claim. `prologue_turn: n` fires in the first month of turn n or later (turn 0 is the scenario's first quarter). **Turn-0 beats fire at init (R7):** `createInitialState`, given the events (`slice.init.events`), fires every non-recurring `prologue_turn: 0` beat in content order, records it in `events.fired` at the start month and raises its card (`opening.ts`), so the opening card is pending before the player's first action and its answer lands in the start month with that turn's actions. Init has no RNG or tick, so `compileEvents` refuses a turn-0 beat with any effect but `unlock`. Without the events at init (bare test fixtures), the events step fires it in the first month as before. Each event fires once, in content order. The fired events are recorded with their month, for the snapshot's declared facts (§9.1).
- **Effects** are a closed set of kinds, read by code; their numbers are in `params.events` under the event's id:
  - `offer { archetype }`: raise one investor card of that archetype with `params.events[id].jobs` jobs. A guaranteed offer draws nothing;
  - `readiness_check`: raise the readiness report card (below);
  - `unlock { key }`: add an unlock key. Systems read keys, never dates;
  - `set_regime { regime }`: switch `fiscal.regime`;
  - `sez_open`: record the SEZ's opening month, the priority answered and the readiness bar at that moment;
  - `first_wave`: raise the first wave (below).
- **Cards.** An event's `card` is raised when the event fires, with its options in content order, the headless default first. Its answer reaches the events step the next month through `answered` (§5.5), which applies `on_answer` in order, before any event fires that month. A non-interrupting event card expires at the end of its quarter; the events step removes it.
- **Validation** (`compileEvents`): a `description`, when present, has a non-empty `zh` and `en` (the content test requires one on every card); every effect kind is known; an `offer` names an archetype and has its jobs in `params.events`; a `set_regime` names a regime of the fiscal content; `sez_open` and `first_wave` sit in an `on_answer` whose card's options are the keys of `params.sez.priorities`.

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
  - **Map-built roads count too (R4.5).** Each built road cell (`GameState.roads`, from `build_road`, b&c §13.2) adds 0.1 km to the `roadKm` of the area it lies in, for this count only; `area.roadKm` itself is unchanged. A built road is counted as reach whether or not its component joins the start network, as M4's roads are.
  - **The start network's routes do not count.** They are the inherited 1979 roads, and counting them would move the start's bar and the first wave of every M-series run. Readiness measures the city's new works.
- **Serviced land.** The share of readiness cells in `servicedLand` (§5.6) ÷ `full_at.serviced_land`, capped at 1. Site preparation's budget stands for clearing, surveying and compensation together. A compensation dispute is M5b's village petition event (§7). Cells a works `service` order finishes join `servicedLand` (b&c §13.2), so map servicing counts here with no extra rule.
- **Water and power (power only from R8c).** The spare power of the readiness areas (each area's `powerCap`, plus the capacity of every placed substation whose footprint lies in the area (R4.5), less the needs of every firm sited there, never below 0), no more than the pool's spare, against the power need of a standard first wave (`readiness.standard_wave`: jobs × that ownership's `power_kw_per_job`). Capped at 1. Water no longer counts. The key stays `waterPower` until R8e. A placed source exists only once its works order is done, which needs its attach cell on a road (b&c §13.2). Readiness is a forecast, so it does not check which road component the source feeds: the firms' utility share does (§5.11).
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
  - `{ condition: c }`: a milestone, the first month c holds. The conditions are `first_zone_firm_open` (a firm sited in a zone is open), `firm_open`, `shekou_captured`, `site_preparation_committed` and `village_works` (R9, below). `site_preparation_committed` holds when an M4 site-preparation project or a works `service` order (b&c §13.2) exists and is not cancelled (R4.5).
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
- **News (R9).** A record with `family: news`, `news: { desk, tone }` and `text: { zh, en }`, at least one claim, and **no card** (so no `on_answer`). `desk` is `beijing | province | city | hong_kong`; `tone` is `opening | warning | relief | texture`. Its trigger is a `date`, or `prologue_turn: 0` for the two opening letters, which fire at init with the turn-0 beats. It fires once and is recorded in `events.fired`; it never pauses a turn. Its `effects` may only be `unlock` and `modifier` (revision plan §4.4); any other effect kind, a card, or a `weather` field fails the compiler. The design note's hidden four-quarter `weather` sum is **not** built: R9's timed modifiers (below) replace it, so the weather is legible. Its text follows the flavour rule: every factual detail cites a `sourced` claim (`use: encyclopedia`), attributed speech keeps to the words in a claim's quote, and no number the sim owns appears. The calendar and the text are in `docs/design/systems/prologue-flavor-and-news.md`; how the briefing shows it is §11.2.
- **Timed modifiers (R9, revision plan §4.4).** Two effect kinds, each with its numbers in `params.events.<id>` (placeholders, cited `design_note`; the record's text states the political fact, never the number):
  - `{ kind: modifier, target, factor?, months? }`. `target` is `investor_rate`, `scrutiny_gain` or `cohort_crew` (below), nothing else (a new target is a spec change). `factor` and `months` name fields of `params.events.<id>`; they default to the target's own name and `months`. It pushes `{ source: <event id>, target, factor, until: date + months − 1 }` onto `state.events.modifiers`.
  - `{ kind: modifier_shift, source, months }`. It moves the `until` of every modifier from event `source` by `params.events.<id>.<months>` months (negative is sooner). One that now ends before this month is dropped.
  - A modifier is **live** while `date ≤ until`. The events step drops the expired ones at the start of each month, before it applies answers. Live modifiers on one target **multiply**.
  - `investor_rate` scales the monthly arrival draw: an archetype arrives when its draw is below `min(1, rate_per_quarter ÷ 3 × factor)`. The number of draws is unchanged, so the stream stays aligned. The first wave and the scripted offers are not scaled.
  - `scrutiny_gain` scales step 12's gains (before the permit factor). The `scrutiny` effect of a card is not scaled.
  - `cohort_crew` (R9, revision plan §4.6) scales a firm cohort's crew per m² (`cohortCrew`: `max(1, ceil(m² × crew_per_m2 × factor))`). It covers only the private builders' cohorts, never city works or projects. A factor below 1 makes the builders faster. (The plan calls this target `construction_pace`; the name follows what it multiplies.)
  - **State:** `EventsState` gains `modifiers?: { source: string; target: 'investor_rate' | 'scrutiny_gain' | 'cohort_crew'; factor: number; until: YM }[]`. Absent means none, and it is omitted when empty, so the save version stays 6; `cloneState` copies it.
- **Tool gates (R9, revision plan §4.4).** A gated turn action is refused by `applyTurnAction`, before it changes anything, while its gate's key is not in `events.unlocked`. So headless policies, replays and the UI keep one schedule. Gates are content, `content/slice/tools.yaml`: a list of `{ gate, requires, name: { zh, en } }`. A gate that is not listed is open.
  - **The gate ids** are `zone.<use>`, `zone.intensity.<tier>`, `road.<class>`, `structure.<kind>` (the kinds that can be ordered), `formation.bulk`, `works.priority`, `policy.enforcement`, `team.contract` and `power.buy`.
  - **Which action needs which gate.** `create_zone` needs its use and its tier, and `edit_zone` the use or tier it sets. `build_road` needs its class (absent: street). `place_structure` needs its kind. `set_enforcement` needs `policy.enforcement`, `contract_team` needs `team.contract` and `buy_power` needs `power.buy`. `works.priority` covers `set_works_priority`, `set_project_priority`, `set_works_pace`, a `priority` other than `normal` on `commit_works`, `build_road`, `place_structure` or `commit_project`, and a `pace` other than `normal` on the first three. `formation.bulk` covers `commit_works` while a live service order exists on another zone: without it, site formation runs on one zone at a time.
  - **The reason** reads "‹gate name› is locked: it opens with ‹opener›", where the opener is the event whose `unlock` sets the key.
  - **Event effects are not gated.** An event's own `contract_team`, `cofinance` or investor works go through whatever the schedule says.
  - **The compiler** (`compileTools`) refuses an unknown gate id, a duplicate gate, and a `requires` key that no event's `effects` or `on_answer` unlocks. It records each gate's opener (the first such event, in content order) for the rail.
  - **Without tools content nothing is gated,** as without events, so bare fixtures and M2–R8's tests are unchanged.
  - **R8b's `intensity.high` check** moves into the table: `zone.intensity.high` requires `intensity.high`.
  - **The schedule** is §2.1's R9 table. Each `unlock` that opens a gate sits in `effects`, not `on_answer`, so a player who declines the beat's card still gets the tool. The exception is the SEZ, whose every option opens it.
- **The petition (R9).** `event.petition`'s condition is `village_works`. It holds while a live works service order, or a live site-preparation project that is not co-financed, sits in a playable area with `village`-class cells, or once a land-compensation obligation (§5.5) exists. So the card arrives only for work the player did.
- **Co-financing a works order (R9).** `cofinance` takes `structure: power_substation` (with `area`) in place of `template`. It orders that structure as a **co-financed works order** (`cofinanced: true`): its budget, spending and forex are 0, and it owes no maintenance. Its crew units still come from the pool. The site is the area's lowest playable free cell four-adjacent to a road (start or built), not zoned, with no works or structure; its attach cell is its lowest road neighbour. With no such site nothing is ordered, an `event_action_failed` event is pushed, and the offer is raised without the link. The next `offer` of the same answer carries the order (`payload.cofinancedOrder`). If that investor declines, lapses or fails, the live order is cancelled: its sunk units are kept, and no structure is placed. The M4 `template` form stays for old content, but no slice record uses it.
- **The two political decisions (R9).** `event.1982q1.concession_storm` (date 1982-02, interrupting) follows its news record, `news.1982q1.concession_material`, which carries the storm's modifiers. Its options are postures, not outcomes:
  - `honest`: `modifier_shift` the storm 3 months sooner;
  - `public`: a `scrutiny` cost;
  - `numbers`: `modifier_shift` it 3 months later.

  `event.1983q4.rectification` (date 1983-10, interrupting) gives each of its options (`follow`, `strict`, `transmit`) its own `scrutiny_gain` modifier. The detailed effects of both wait for the politics pass.
- **Endorsing the slogan (R9, revision plan §4.6).** `event.1981q1.slogan` is a non-interrupting card that follows `news.1981q1.shekou_slogan` in 1981-03, the claim's month (the plan's 1981-Q3 has no dated hook). It lapses to `decline`.
  - `endorse`: a `cohort_crew` modifier (placeholder × 0.9 for 9 months) and `standing`.
  - `decline`: no effect.

  The plan's extra scrutiny "under a strict permit regime" is not built, as the effects have no condition.
- **`crew_arrival { team }`** (R9, §5.6): a permanent crew arrival. Its number is `params.teams[team].crew`, and the team must be `event_only`.

**The prologue beats** (§2.1). Each prologue quarter from turn 1 raises at least one card whose options lead to different states. Turn 0's decision is made on the map, the first zone and the first road (R9), so its card only reports:

| Turn | Beat | Its decision |
|---|---|---|
| 0 (1979-Q1) | `event.first_project`, scripted, reframed in R9 as **the city's own survey**: the two opening letters (news) and a card that only reports. `event.shenzhen_city` (anchor, 1979-03) is a declared fact | `noted`; the first zone and road on the map |
| 1 (1979-Q2) | M5a's first contract. `event.shekou_command` (anchor, 1979-04) is a declared fact | accept a site or decline |
| 2 (1979-Q3) | `event.permit_choice`, scripted: the temporary-permit regime and the scrutiny gauge switch on. Shekou's works (M5a). The typhoon (emergent, guaranteed by turn 2) | `standard`, `loose` or `strict`, by `set_permit` |
| 3 (1979-Q4) | `event.corps_advance`, scripted: a pool contract for `team.corps_advance` (the advance units, a placeholder crew); the sweep card and the first, lightweight review | `quarters` (a cost) or `tents` (scrutiny); and the sweep |
| 4 (1980-Q1) | The budget card; `event.cofinancing`, scripted (the briefing): the loan's offer and the co-financing card. R9: accepting orders a co-financed power substation near Luohu (area 2, a composite: the documented 1980 Luohu package is site formation with a bank loan) and raises the investor's Hong Kong processing offer with its concession. Before R9 it was a co-financed power line in the market town | take the loan; `decline` or `accept` the co-financing |
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
  - `projects_completed` (city projects finished in the last 12 months, plus works orders, b&c §13.2, that reached `done` in the same window (R4.5). Each done order counts as one, whatever its size: a one-cell road counts as a project, and so does an order closed `done` after a partial cancel. R6 decides whether orders need a minimum size or a weight);
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
- **The briefing:** the loan card and the co-financing card arrive in turn 4; accepting the co-financing orders a substation (R9; a power line before) that costs the city nothing, and its investor's firm gets the concession.
- **The visit:** it fires in 1984-01 and ends the run, and the verdict's fiscal test equals its formula on the end-1983 state.
- **No effect without the content,** and determinism (save, load and continue, and replay, through a whole 21-quarter run).
- **The branches** (`test/m5b-branches.test.ts`): `runQuarter` through the whole slice, with each prologue decision answered in its quarter and the failure card pausing it; a lapsed crisis takes its lapse option; the budget card's numbers; declining the co-financing investor withdraws its power line; event-only teams; the milestones; an orders slump caps posts; a fire vetoes its review; the Corps deployment; the climate's event gains; a two-month sweep covers December; indicators between turns; and the compilers' error paths.

### 5.9 The headless runner, golden runs and the plausibility report (M6a)
M6 is built in three parts. **M6a** (this section) builds the instruments: one way to load the slice, the policies, the CLI, the golden runs, the plausibility report and the exit-criteria checks. It runs on M5's numbers and changes no balance. **M6b** is the balance pass, driven by M6a's report (§12). **M6c** is the 2D UI (§11).

The report says pass or fail honestly. A failing band is a finding for M6b, never a reason to widen a band or a tolerance.

**One way to load the slice** (`src/content.ts`, pure). Today the composition lives in `test/fixtures.ts`. M6a moves it into sim-core, so the tests, the CLI and the UI load the same slice.
- `SLICE_FILES`: the repo-relative path of every file the slice reads (the areas and land-cover JSON (R8a; it replaced the buildable JSON), the site register and its cells, the start network, the gateways (R8d), the scenario, start, params, precedents, investors, fiscal regimes, projects, teams, events, targets and leaders).
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

**Policies** (`src/policies.ts`; §10's names, used by the CLI). Since R6 the three playing policies play the map-first loop of §1.1 through the works queue (b&c §13.2); none commits an M4 project from the area dropdown. `default` and `decline_all` stay idle: they answer cards and take no turn actions, so they are the idle comparison §12 asks for, and the UI's tests replay `default` card for card.
- `default` is `firstOption`, and `decline_all` is `declineAll`.
- **`cautious(params, tick)`** never takes the project loan and never takes a grey option:
  - it declines the loan, the shortcut and the co-financing. The deficit rule may still borrow short when austerity does not cover a shortfall (§5.6);
  - investors go into existing premises, else into a zone already fully serviced, else they are declined;
  - permits are strict and enforcement high, there is no sweep, and a deficit card is answered `austerity`;
  - every other card takes its first option;
  - its plan (`CAUTIOUS_PLAN`): a 12-cell industrial zone and a 4-cell residential zone in Shangbu, one short road east from the town toward area 4, a quarter of the crews, at most two sources of each kind, and ¥300,000 left unspent.
- **`aggressive(params, tick)`** takes every grey option:
  - it takes the loan and the co-financing;
  - it accepts every investor and every shortcut at the first site;
  - permits are loose and enforcement low, it sweeps every October, and a deficit card is answered `borrow_short`;
  - its plan (`AGGRESSIVE_PLAN`): the Shangbu template zone and a 16-cell industrial zone in Sungang (area 5), 8 residential cells in Shangbu and 4 commercial cells in the market town; roads south and around the Shangbu zone, so its sources have frontage; half the crews; power and water 300 jobs ahead, up to eight sources of each kind per zone; a school in the town; `team.engineering_corps` and `team.outside_soe`.
- **`historical(params, tick)`** is the CLI's `historical_prologue`. It answers cards as `historicalPrologue` does (§5.8: premises or decline, the loan, the co-financing, the road link as the first project). Its plan (`HISTORICAL_PLAN`): the Shangbu template zone (§5.3) with the road south that reaches it and the side roads its sources need, 6 residential cells beside the Shangbu road and 4 commercial cells in the town; a third of the crews; power and water 200 jobs ahead, up to eight sources each; a school; the engineering corps. `historicalPrologue` itself, with its M4 projects, stays the scripted prologue of M5b's tests (§5.8) and of the 1980-Q2 save.
- **`randomPolicy(seed)`** answers each pending card with a uniformly random option. It draws from its own sfc32 generator, seeded from `seed`, never from the sim's streams, and takes no turn actions. It exists for the property tests.

**The map plan** (`src/mapPlan.ts`, R6). A `MapPlan` is data: its zones, outbound roads (orthogonal waypoints), `crew_share`, `room_ahead_m2`, `utilities { headroom_jobs, max_sources }`, `facilities` ([type, area] pairs), `teams` and `reserve`. `mapPolicy(answers, plan, params, tick, first)` gives:
- **in the first month:** `first` (the enforcement level), then each zone of the plan: a precedent's template cells, or the area's `n` buildable cells nearest a road (steps through the area's cells, ties by cell index). No zone takes a cell another zone or a plan road takes;
- **at each later turn's start**, while money for projects less `reserve` covers each step:
  1. **roads:** the next plan road not yet built or queued, when no road order is live (R9: up to `roads_at_once` live together);
  2. **servicing, phased to the crews:** when no service order is live, the zone with the least developable room (and room below `room_ahead_m2`) gets its next cells with frontage, at most `floor(crew_share × 3 × capacity.local_crew ÷ works.service.units_per_cell)` of them a turn;
  3. **water and power:** for each industrial zone, the scarcer of the two first: a source is placed when the area's sited firms plus `headroom_jobs` organic jobs would need more than the area's capacity plus the zone's sources (those attached to a road cell beside it), up to `max_sources`; if the scarcer one cannot be paid for or its forex quota is short, the other waits too. A source sits on a free cell beside a road cell that touches the zone;
  4. **facilities**, once each, beside the first zone of their area;
  5. **teams**, under pool contracts, while money covers a year of their cost.

**R9: the gates.** Each action the plan would give is checked against the tool gates first (`gateRefusal`, §5.8), and one that is locked is held back to a later turn. So `first` (the enforcement level) is given once `policy.enforcement` opens. A plan zone is drawn at the first turn's start whose gates allow it, with no zone yet of its use in its area (or of its template), clipped against the zones drawn by then. Avenue upgrades, substations, purchases, the station, facilities and teams each wait for their gate. A plan's turn numbers (`import_from_turn`, `station_turn`, an upgrade's `from_turn`) are floors. The gates can push them later, never earlier.

**R9: borrowing to build (`borrow_until_turn`).** R9 retired the M4 road link (¥1.1m) that the old opening card committed. That commit was what raised the state-bank project loan in 1979. Through `borrow_until_turn`, while the loan is still `not_offered`, a plan counts the loan's principal (`fiscal.loan.principal`) in its money. So its first road and servicing commit ahead of the money and raise the loan, as a city that borrows to build. The historical and aggressive plans set it to 3 (the 1979 turns). Absent, a plan commits only what it has (cautious). The month's work still waits for cash (`waiting: 'finance'`) until the loan is taken.
- **The first month's road.** A borrowing plan also gives its turn works in the first month, with its zones, since Turn 0's decision is the first zone and the first road (§2.1). A plan without `borrow_until_turn` waits for turn 1, as before.
- **Roads at once (`roads_at_once`, default 1).** Up to this many road orders are live together. A turn commits the next plan roads in order, skipping one that does not yet touch the network, until the slots or the money run out.
  - Historical sets 2, so the Shangbu road and a Luohu street are built side by side.
  - Aggressive sets 3, with a second Luohu street.
  - The Luohu streets are design roads (design_note), not historical alignments. They run east from Jianshe Road into area 2, where the co-financed substation goes.
- **Why.** Together these restore the 1979 spending that the M4 road link carried before R9: historical 1.337 and aggressive 1.338, against the 1.295 floor (`m6-tuning-log.md`, R9).

A policy's turn actions are legal by construction: zones are clipped with `zoneCellsAllowed`, and each works action is given only when the checks of `orders.ts` would pass (playable cells, no road, works or structure in the way, frontage for servicing, the forex quota for a power source), so a run never throws. The plan keeps its unbuilt road cells free of sources, so a later road is not blocked by a station placed on its path.

**The CLI** (`apps/cli`, run with `npm run slice -- …`):
- **`slice run --seed N --quarters Q --policy P [--out DIR]`** plays Q quarters (21 by default) through `runQuarter`, the path the UI shares:
  - the policy answers the pending cards and gives its turn actions at each turn's start;
  - it answers each `paused` result's cards before the quarter continues;
  - the run stops at `finished`, or once the visit's card is answered.

  It writes two files to DIR (default `build/slice/<policy>-seed<N>/`):
  - `run.json`: the content hashes, the monthly series, the cards raised and answered per quarter, the reviews, the verdict, the bands and the exit-criteria checks. Its only input is seed, policy and content, so the same arguments give the same bytes;
  - `report.html`: one self-contained page with inline SVG charts (residents and present non-locals, GDP and exports, revenue against obligations due, the reserve and debt, scrutiny), the band table with `[UNVERIFIED]` tags, the exit-criteria table and the wall time of the run. The wall time is printed and shown in the report, never written to `run.json`.
- **`slice golden [--update]`** runs the golden set and compares each run with `data/golden/slice/<policy>-seed<N>.json`. With `--update` (`npm run golden:update`) it rewrites the files. It also prints the set's cross-run checks (`crossRunChecks`): criterion 1's response to choices, and `readiness_moves_wave`; and the checkpoint table by policy (R6).
- The CLI reads claims with `@sz/evidence`'s loader and tags them with its `meetsMinimum` for `calibration_target`.

**Golden runs** (§10). The set is `default`, `cautious`, `aggressive`, `decline_all` and `historical_prologue`, each with seed 1, for 21 quarters through `runQuarter`.
- **Each file is a readable summary:**
  - the content hashes;
  - for each year end, and at the visit: residents, registered, present non-locals, migrants, firm jobs posted, the year's GDP, exports, revenue, obligations paid and project spending, the reserve, debt outstanding, arrears, scrutiny and the real illegal-floor share;
  - each review's score and result;
  - the SEZ's opening: its month, the readiness bar and the first-wave cards;
  - the verdict;
  - the events fired, with their months;
  - the checkpoints (R6, below).

  Money and people are rounded to integers, and shares to four decimals.
- **The checkpoints** (R6, `checkpoints` in `summary.ts`): the run's state at each month the band ids name (§9: end-1979, 1980-Q2 and end-1983, months 12, 18 and 60), read off the state the run reached at that quarter's end. Each row has:
  - **population**, under each definition: registered, resident (stayed six months, 常住), present, present non-locals and migrants;
  - **land and floor**, by use (industrial, commercial, residential): planned cells (zoned), serviced cells, developable cells (serviced with frontage, §13.3) and floor. Industrial floor is the zones' firms' factory floor, built and occupied (open); commercial is completed private shop floor and its occupied share (§13.3's `shopOccupancy`); residential is completed work-unit dormitory floor;
  - **jobs:** firm jobs posted, all jobs filled, and the accessible vacancies (§5.11);
  - **housing and crowding:** rental beds and their occupants, crowding (occupants ÷ beds), last month's turned-away arrivals and completed village rental floor;
  - **works:** built road cells and the placed power and water sources and facilities;
  - **debt and the fiscal state:** the reserve, money for projects, debt outstanding, arrears, the trailing year's revenue and spending (obligations paid and project spending) and their ratio.

  `slice golden` prints the rows by policy, and writes them as `build/slice/checkpoints.md`; each run's `report.html` shows its own.
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
- **The 1983 checkpoint's notes:** after M6b both playing policies end the fiscal test positive; `cautious` ends it above `aggressive`. This replaces the old note's "aggressive negative, cautious near or above zero", which was an artefact of the pre-calibration deficit spiral.

### 5.10 The balance pass (M6b): findings
M6b calibrated with named parameters only, in `params/slice.yaml`, and with the headless plans' turn actions. The attempts and their numbers are in `docs/design/m6-tuning-log.md`; this section is the result and the structural record. No sim mechanic changed, apart from the tested `buy_power` contract noted below.

**Result (seed 1, the §9 checkpoints).** The two playing policies that take the loan and build at scale pass every measured band:

| Policy | Resident growth, end-1979 → end-1983 | GDP growth | 1983 spending ÷ revenue | Measured bands |
|---|---:|---:|---:|---|
| `historical_prologue` | ×1.64 | ×3.47 | 1.08 | 20 pass, 0 fail |
| `aggressive` | ×1.80 | ×3.95 | 1.17 | 20 pass, 0 fail |
| `cautious` | ×1.20 | ×1.76 | 0.71 | 15 pass, 5 fail, structural |
| `default` | ×1.02 | ×1.04 | 0.97 | growth/design fail, idle |
| `decline_all` | ×1.00 | ×0.97 | 0.73 | growth/design fail, idle |

- **Population.** The historical run ends with 49,813 residents (30,340 at end-1979), 30,000 registered, 53,638 present and 23,618 present non-locals. The aggressive run ends with 54,332 residents and 27,797 present non-locals. The resident band is the SEZ usual-resident multiple (×2.33 × [0.5, 1.5], or ×1.164–×3.491); both are inside it. Both are also inside the citywide growth band.
- **The bands are `[UNVERIFIED]`.** Their claims are `sourced`, not `verified`, so the draft compile tags every one. None of the §9 bands rests on a `lead` claim. The city and SEZ vintages stay separate, and no conflicting figures were averaged.
- **Structural failures.** `default` and `decline_all` take no turn actions by design and are the idle comparison. `cautious` is a 12-cell industrial plan with a quarter of the crews that declines the loan and the co-financing: 120,000 m² of industrial floor caps its GDP multiple below the citywide ×3.34 lower band, and its refusal to borrow is why it under-spends the 1979 and 1980-Q2 spending ratios. Its ×1.20 resident growth passes the §9 SEZ band but not the design band's ×1.5. These are policy choices, not parameter failures.

**What moved.** The binding constraints were the ones §5.10 named, and each is a named parameter:
- **Money and utilities.** Servicing a cell ¥100,000 → ¥30,000; a power source ¥500,000 / 500 kW → ¥200,000 / 1,000 kW; a water source ¥400,000 / 200 m³/day → ¥150,000 / 500 m³/day; the M4 road and site-preparation budgets keep the 1979 spending ratio in its band. The plans also ring the Shangbu zone with roads, so the sources have frontage and are not blocked by their own stations.
- **Construction capacity.** 120 → 600 local crew units, enough to finish the zone's firms within the slice.
- **Firm scale and services.** One organic firm 100 → 500 jobs; industrial demand 1,500 → 6,000 m² a month; processing output ¥400 → ¥520 a job-month; one service job per ¥100 → ¥60 of monthly spending.
- **Migration and housing.** The migrant base 600/300 → 2,000/1,000 a month, `K_vac` 500 → 200, the housing push 0.1 → 0.02 and `crowding_max` 1.6 → 2.5.
- **Fiscal.** County revenue ¥130,000 → ¥168,000 a month; county obligations ¥150,000 → ¥100,000; lower per-head baselines, collection 0.8 → 0.9, a larger and longer short loan. The historical and aggressive runs end with no arrears and a positive 1984 fiscal test.

**Bought power (R6 test).** `buy_power { area, kw }` is a finance action: it adds capacity at once and owes `kw × fiscal.power_import.yuan_per_kw_month` a month as a `service` obligation. It assumes the network reaches the area, so it needs no works order. In the test, buying 3,000 kW for area 7 every fourth turn from turn 8 raised GDP by 1.2% but pushed spending ÷ revenue from 0.96 to 1.32 and did not raise firm posts: the open firms were limited by floor, ramp and crews, not by power. No policy uses it. The action and its placeholder tariff stay for a later decision on the source (Hong Kong or Guangdong) and the network's limit.

**Power binds (R8c).** The finding above, that power never binds, no longer holds. With one city pool, the aggressive plan's firms outgrow local plant plus purchases before 1983, and a quarter's pool share falls below 1 (tested: `test/power.test.ts`). The plans buy power from a turn in chunks (`MapPlan.utilities.import_kw`) and order one station (`station_turn`). The R8c golden deltas are in the tuning log.

**Options A–C, retained as history.** R4's incumbency already answered C. The pass did not need A (a card as a batch of contracts) or B (a provincial transfer or arrears cap): the same firm archetypes and ordinary cards, at the calibrated scale, support the growth. The old finding that one card was one firm of 60–500 jobs remains true; the change is that many more organic firms now build on serviced land and that the crews and utilities can finish them.

**R9 (Pass 3).** With the gates, the reframed prologue, the modifiers and crew in waves, `historical_prologue` and `aggressive` pass all 20 bands again, with the 1982 storm included and no modifier softened.
- **What broke the 1979-Q4 spending floor.** The old opening card's M4 road link (¥1.1m, tuned in M6b to hold this band) is retired from the prologue, and the gates hold back 1979 tools. That took historical to 0.768 and aggressive to 0.632, against 1.295.
- **What restored it.** The map plans now borrow and build like the city they model (§5.9): `borrow_until_turn` raises the state-bank loan in 1979, the first road is ordered in the first month, and `roads_at_once` builds a Luohu street beside the Shangbu road.
- **The result.** 1979-Q4 at 1.337 and 1.338, a thin margin over the 1.295 floor. 1983 at 1.070 and 1.082, against the 1.204 ceiling. The attempts are in `docs/design/m6-tuning-log.md` (R9).

**R9.1: matching the yearly path (2026-11-25).** The claims store has annual values for 1980–84, not only 1979, 1980 and 1983. A calibration that checks only the endpoints can pass while the slice falls further behind every year, and that is what had happened: the slice's multiple of its end-1979 position, divided by the SEZ's (population) or the city's (GDP) multiple, drifted from 0.86 in 1980 to 0.74 in 1983 for residents and from 0.82 to 0.60 for GDP. The cause was a slow 1980–81 (demand and firm build time) and a four-quarter power cliff before the 1982-10 station.

The pass moved five named parameters: `growth.industrial.floor_m2_per_month` 6,000 → 8,000, the organic firm's build and ramp months 6/3 → 5/2, `migration.base` 2,000/1,000 → 2,300/1,150, `fiscal.power_import.max_kw` 3,000 → 4,500, and the county regime factor 0.3 → 0.4. The resident ratio now sits in a 0.79–0.91 band and the 1982 dip is gone; the GDP ratio settles at 0.66.

| End | Residents | Ratio to claim | GDP | Ratio to claim | Temporary | Spending ÷ revenue |
|---|---:|---:|---:|---:|---:|---:|
| 1979 | 30,338 | 1.00 | 8M | 1.00 | 566 | 1.34 |
| 1980 | 31,059 | 0.86 | 10M | 0.90 | 3,452 | 0.97 |
| 1981 | 38,307 | 0.91 | 21M | 0.97 | 13,887 | 1.29 |
| 1982 | 46,726 | 0.85 | 28M | 0.78 | 19,816 | 1.23 |
| 1983 | 55,451 | 0.79 | 37M | 0.66 | 31,085 | 1.11 |

- **The GDP ratio has a structural floor at about 0.66.** The Shangbu plan's 36 cells are full at end-1983; more FAR adds land, not finished firms. Construction capacity and labour set the 1983 output, and widening the plan trades against the 1979 and 1983 spending bands. Recorded, not forced.
- **Realism checks kept in the log:** 430 jobs and ~5,125 m² a firm, 45 W of industrial power a m², village rental outgrowing planned housing by 66,613 to 65,850 m² (thin), and rents of ¥3–10 a m² that follow crowding. Employment stays at 95–99% of the participating labour force: a town whose migrants come for jobs.
- **Goldens:** historical_prologue 52,360 → 55,451 residents and 33.6M → 37.4M GDP; aggressive 48,887 → 53,626 and 32.7M → 35.7M. All 20 bands stay green for both; `decline_all` moves only its hash. No band was widened.
- **One design check changed measure.** The m6a fiscal check now asserts a thinner *margin* rather than a smaller absolute 1984 balance: after R9 made the corps a free arrival, aggressive's tax base outruns its obligations (290,220 against cautious's 200,064), while its margin is still the thinner one (7.2% against 8.0%). Recorded in the tuning log.

**R9.2: the tempo and the electricity series (2026-11-25).** R9.1 matched the index; this pass matched the year-over-year rate and made electricity measurable.

| Year | Residents, model / claim | GDP, model / claim | Electricity 10^8 kWh |
|---|---:|---:|---:|
| 1980 | +5% / +19% | +32% / +38% | 0.16 |
| 1981 | +24% / +17% | +89% / +84% | 0.26 |
| 1982 | +16% / +31% | +40% / +67% | 0.36 |
| 1983 | +32% / +28% | +39% / +59% | 0.52 |

- **The index ratios are now 0.88 / 0.94 / 0.84 / 0.85** for residents and **0.96 / 0.99 / 0.82 / 0.74** for GDP, against 0.86 / 0.91 / 0.85 / 0.79 and 0.90 / 0.97 / 0.78 / 0.66 after R9.1. 1980 and 1983 improved; **1982 is the remaining gap**, because the model's boom is front-loaded (1981) while the historical series accelerates through 1982.
- **The lever was the plan's zone:** the historical plan now zones 54 industrial cells in Shangbu, not 36. A timed second wave (Sungang, 16 cells) was built and rejected: it splits servicing, opens too late to add 1982 output and breaks `village_outgrows_planned`.
- **The 1982 investment programme is content, not a parameter:** `event.investment_programme` (1982-Q1, interrupting) adds a 400-crew permanent corps, an `investor_rate` ×1.2 modifier and a ¥150,000 cost on acceptance. It moves 1982 GDP +36% → +40% and 1983 residents +30% → +32%; it cannot close 1982 because a firm accepted in 1982-Q1 ramps into 1983.
- **The electricity series** (`power.consumption`, `history.electricity`, save v8) is calibrated so 1979 reads 0.14×10^8 kWh, the slice's 43% share of the citywide 0.33. It grows +14% / +57% / +40% / +44%; the claim's 1980 jump (+65%) is as unreachable as the population one, and its ">60%/yr" is a demand claim, not energy (the arithmetic is +45%/yr from 33 to 100). The 1979 conflict (0.33 supply vs 0.4125 consumption) is left open; the series is reported, not banded.
- **Goldens:** historical 55,451 → 60,375 residents, 37.4M → 42.0M GDP, spending ÷ revenue 1.11 → 1.02. All 20 bands green; aggressive 53,661; `default` and `cautious` also accept the programme's first option, and `decline_all` gains a band (it accepts it too), which is recorded rather than special-cased.

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

**The utility share, with placed sources.** For each area, the share is now `min(1, (area capacity + placed supply) ÷ the firms' need)`, the lower of power and water. (From R8c it is power only, and the area's part comes from the city pool: §5.5.)
- the area capacity is `area.utilities`, the M-series ledger of spare capacity, which start content and M4's projects raise;
- the placed supply is what placed sources deliver to the area's zones, through `spatialViews(…).supply` (b&c §13.1). Each zone with open firms demands their need, spread evenly over its developable cells (largest remainder). Supply is allocated on the road components, and each zone's share is summed into its area.

A placed source never adds to `area.utilities`, so no capacity is counted twice. Without placed sources the share is M3b's. Because the placed supply is summed per area, one zone on a supplied road component lifts the share of every firm in the area, including firms on an unsupplied component; R5's per-cell supplied share can therefore differ from the area's posting (§11.2). The R3 prospective test uses the same share.

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

### 5.12 Road tiers and gateway freight (R8d)

One bottleneck, freight through the gateways, and no general traffic sim (`docs/design/phase1-revision-plan.md` §3.4). Every capacity and rate here is a **design setting, not a historical quantity**. Each is a placeholder cited `design_note`, and no hint or card states a historical volume.

**Road classes.** `RoadClass = 'track' | 'street' | 'avenue'`, one per road cell.
- `params.works.roads.classes[class]` gives `units_per_cell` and `capacity_t_month`. A class's cost is its units at `works.road`'s yuan per unit. Street keeps `works.road`'s units, so a street costs what every road cost before. A bridge cell of a class costs `works.bridge.units_per_cell × class units ÷ street units`.
- A cell's class is, in order:
  1. its entry in the override lists `GameState.roadClass?: { track, street, avenue }` (sorted cells);
  2. its start route's `class` in `start_network.yaml`;
  3. otherwise `street`.
- `s.roads` stays the list of built road cells. Upgrading a start-network cell writes only the override, so readiness and `roadKm` still count built cells only (§5.7). R8d loads version-5 saves unchanged (absent overrides mean `street`); R8e's version bump makes this formal.

**Building and upgrading.** `build_road { path; class?; priority? }`, where `class` defaults to `street`.
- Cells that are not yet road become new road cells of that class.
- A start or built road cell of a lower class becomes an **upgrade** cell, whose units are the difference between the two classes.
- Cells of the same or a higher class, and cells on a live order's path, are stripped and end the segment, as before.
- A segment may start at an upgrade cell, since it is already road. Otherwise one of its ends must touch a road (R4.5).
- A cell keeps its old class until its units are done. Then a new cell joins `s.roads` (and the override when it is not a street); an upgraded cell changes its override only.

**Gateways.** `content/slice/gateways.yaml`. Each record has:
- an id, a `{zh, en}` name and a site;
- a cell, taken from `at`: `site` (the site's cell in `slice_site_cells.json`) or `route_end: first | last` (the end cell of the site's start route);
- `faces: hong_kong | mainland`, `mode: rail | road` and `capacity_t_month: { in, out }`;
- claims: the site's claims, re-cited as `design_note`.

At most one gateway per face and mode. A gateway's **yard** is the set of road cells within `freight.yard_cells` (Manhattan) of its cell. A rail gateway counts only the road from an area to its yard. The start network reaches the yards of Luohu, the station and the Guangshen road, and this is tested. Wenjindu has no start road.

**Three flows.** All are derived from what the sim already computes, and recomputed from state each month, never stored.
- *Exports* (out, by `freight.by_archetype[archetype].mode`). The firm's posts before freight (the `min` of §5.5 and §5.11) × `output_per_job_month` × `export_share` × `t_per_yuan`. This uses the firm's potential this month, not last month's output, so a short month does not swing the next month's demand.
- *Firm inputs* (in, from Hong Kong). Exports × `input_ratio`. Processing trade brings its materials from Hong Kong, so in R8d inputs never come from the mainland. This departs from the plan's `input_from` split: it keeps the firm flows apart from the construction flow, and no gateway direction is shared between tick steps.
- *Construction materials* (in, from the mainland, by rail). Each job in the pool queue (works orders at their pace, firm and organic cohorts at their crew, pooled projects and dedicated contracts at their crew, never more than the work left) × `freight.t_per_crew_month`, summed for the job's area. Village self-build uses local materials and draws nothing. An order with no work area (§5.11) is not constrained.
- An archetype with no `by_archetype` entry has no freight. Firms in existing premises have none either: small contracts ship by the old ways (a stated simplification).

**Allocation.** This is computed for each gateway and direction. Each area's **access** is its road cells and the road cells within `max_frontage_depth` (Chebyshev) of its cells.
- The path capacity `P` comes from one widest-path (maximin) search per gateway from its yard, over road cells weighted by class capacity. `P` is the widest value over the area's access, and ties go to the lower cell.
- Route: an area's flow of a face goes to the face's gateway with the wider path `P` from the area, its own mode's on a tie, so a new road never narrows a flow. If neither is reached, the flow is **not constrained** (share 1, not reported). That way an unconnected area can still build the road that connects it.
- An area's flows into one gateway and direction are summed first, so together they never pass its weakest cell. Want `W = min(demand, P)`. If ΣW ≤ the gateway's capacity, each area gets its `W`. Otherwise the capacity (whole tonnes) is shared pro rata to `W`, by largest remainder in area order.
- Unmet = demand − flow.
- **Simplification:** two areas whose paths share a street do not share that street's capacity. Only gateways and each area's weakest link are capacities.

**Where the shortfall lands.**
- *Firms.* An area's freight share is the lower of its out and in shares, where each share is Σ flow ÷ Σ demand (1 with no demand). Each firm's post is `floor(posts before freight × share)`. Jobs, output, exports and value added fall through code that already exists.
- *Building.* An area's materials share sets a unit budget for the month: `floor(flow ÷ t_per_crew_month)` (unbounded when not constrained). In queue order, each job's units are capped by both the pool's `left` and its area's budget. Spare units pass down the queue, and nothing is lost or refunded: works and builds just advance more slowly.

**Report.** Each month, the construction and labour steps push `freight` events (gateway, direction, demand, flow). `history.freightUnmet` is `{ [gateway:direction]: number[] }`, unmet tonnes a month, starting at the first month freight is computed. The UI keeps its chips. The road flyout offers the tier before the drag. The Economy drawer lists each gateway's capacity and last month's unmet tonnes, and for each shipping area its path to the Hong Kong rail gateway and that path's weakest cell, so the fix is legible (§11.2).

**Calibration (R8d, recorded in `m6-tuning-log.md`).** Streets carry what the 1979 start and the prologue need, and the first SEZ factories in Shangbu outgrow the start streets to Luohu by 1982. The gateways sit above what the start network can carry, so roads bind first.
- The aggressive plan builds streets and meets the limit.
- The historical plan upgrades its corridor from Shangbu to Luohu to avenue, after its outbound roads (`MapPlan.upgrades`).
- If a §9 band fails because of freight, the capacities are raised, never the bands.

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
- **M4 landmark arc:** the Shenzhen International Trade Centre (国贸大厦 / Guomao) is the slice's major project. Fundraising, foundations and a rising structure are the historical comparison for the January 1984 visit. Shennan Road and the early cultural programme give the player competing commitments. The Shenzhen University (深圳大学) decision can fund temporary teaching and a future western campus. [M4 project research](../../research/phase1-m4-major-projects.md)
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
content/slice/tools.yaml          # R9: the tool gates and the unlock key each requires (§5.8)
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

**The political news layer (R9, 2026-11-25).** Twenty-four non-card `news` records carry the 1979–1984 political
weather: one lead item a quarter, eight with a small `weather` value, two with a decision card (the 1982-Q1
concession storm and the 1983-Q4 plenum). They are not "about 15 events" above; they are a separate, additive
layer. The selected list, the dropped list and the text are in
`docs/design/systems/prologue-flavor-and-news.md`; the evidence is in
`docs/research/phase1-political-calendar.md` and `data/evidence/claims/phase1_political_calendar.yaml`.

**As built (R9).** The records live in `content/slice/events.yaml`, after the anchors:
- **25 `news` records:**
  - the 22 news rows of the design note's calendar;
  - `news.1982q1.concession_material`, the storm card's paired record, which carries its modifiers;
  - the two opening letters (`news.1979q1.assignment`, `news.1979q1.office_note`, tone `opening`, fiction that carries cited facts).
- **The two decision cards:** `event.1982q1.concession_storm` and `event.1983q4.rectification`.

So the calendar's 24 rows are 22 news records and 2 cards. Its `weather` column is not built. Only the records in revision plan §4.4's table carry a modifier, or `news.1979q4.provincial_city`'s and `news.1982q4.storm_passes`'s unlocks; the rest are presentation only.

### 7.1 The SEZ's establishment: the major early event
The six prologue quarters (1979-Q1 to 1980-Q2, §2.1) are a **prologue with a deadline**. The player knows a zone is coming, but not its terms.
- **Before it:** the prologue beats (§2.1). The goal is plain: *get roads, water, power and cleared land ready near Luohu and Shangbu before August 1980.*
- **Readiness is one bar with three parts** (decided 2026-11-23), each 0–1 and measured over the readiness cells: the playable cells of areas 1, 2, 3 and 7 that are buildable.

  | Part | Measures |
  |---|---|
  | **Roads and access** | Share of readiness cells within reach of a city road connected to the Luohu crossing. M4's roads have no geometry, so reach is counted per km of road in each area, M4's and map-built (§5.7) |
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
- the period extents, serviced fractions and first operating firms of the Shangbu, Bagualing and Shuibei industrial zones (§5.3); address and camera checks for the in-window commercial and electronics candidates (§5.4). [Zoning research](../../research/phase1-m3-zoning.md)
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
  - the pure renderers (`src/render.ts`), run in each language on every state of the controller's `default`, `aggressive` and `historical_prologue` runs, and on a queue holding every kind of order, show no string from the other language once place labels and the switch are removed: no Han character (or full-width punctuation) in English, and in Chinese no English string-table or content name and no Latin word but ids, shared units (kW, GDP, USD) and sim-core's diagnostics, which the Errors rule above shows as written (R5 wraps them in a `lang="en"` span, and the test strips that span);
  - the golden runs, rendered in alternating languages at every step, still equal their golden files, and rendering leaves the session unchanged;
  - `resolveLang` takes the URL first, then the stored choice, then English.
- A drawn zone's preview equals the zone's runs after End turn. A throwing action leaves the session as it was.
- Each overlay's colour for a cell reads its area's value.

### 11.2 The planning-map HUD (R5)
R5 replaces M6c's side-by-side screens with a map-first HUD. It borrows the layout conventions of classic city builders: a tool rail, a stat strip and drawers. It doesn't borrow their look, and §11's "ugly on purpose" still holds. The rule is a clear first level: the map, five number pairs, the I/C/R demand cue and one button. Every other detail stays one click away.

**Layout** (the map fills the window; everything else floats over it):
- **The tool rail (left):** zones, roads, infrastructure (water and power sources, hookups), special buildings (facilities and approved landmarks), Form site and Erase. (R7: the tool called Service in R5 reads **Form site / 平整土地**; see §13's vocabulary.)
  - Each tool opens a small flyout. For example, the zones tool offers the four uses and "show the Shangbu guide".
  - While the player draws, a preview next to the cursor shows the area, the cost and the crew time. The preview uses the pure functions of §11.1 and never calls `step`.
  - **The map is the one build system (R4.5 decision).** Roads, servicing, sources and facilities are all built as works orders from the rail (b&c §13.2). The UI hides M4's area-dropdown `commit_project` controls. `commit_project` stays in sim-core, for tests and for the projects that events spawn.
  - **Zone painting queues servicing by default.** A drag with the Zones tool queues `create_zone` and then `commit_works` for the new zone, as one turn's pair of actions with one preview. A **Plan only** toggle in the Zones flyout queues `create_zone` alone.
  - **Form site** (a tool of its own; `service` in code): a click on an existing zone queues `commit_works` for its cells that have no works yet (the action's default when `cells` is absent). A drag limits it to the dragged cells.
  - **Erase / Cancel:** on a cell with unstarted work it queues `cancel_works` for that cell (a service cell, a road path cell and the rest of its path beyond, or an unstarted structure). Started work, built roads and built structures cannot be erased; the inspector says why. On a zone with no works it queues `remove_zone`.
- **The I/C/R demand cue (top centre, first level):** three short bars, derived in `views.ts` from R3/R4 state. They add no sim fields:
  - **I (industrial):** organic industrial demand (the growth pass's floor demand, `floor_m2_per_month × order_index × orderFactor × regime factor`, plus `growth.carry`, b&c §13.3) and the utility headroom (the lower of the power and water utility shares, §5.11, that a new organic firm would see in the areas with industrial zones). The bar is low when either is.
  - **C (commercial):** the shortfall of shop floor implied by spending: the formal service jobs that last month's spending supports (§13.3's induced jobs × `formal_share`) less the formal posts that have shop floor, as a share of the former.
  - **R (residential):** rental crowding (demand crowding, §5.11) and the people turned away last month.
  - Hovering a bar names its two inputs. The cue never shows a number on the first level.
  - Each bar is a level from 0 to 1, for display only, and reads **low** below ⅓ (the ladder's rung 8):
    - **I** = the lower of demand and headroom. Demand = min(1, (this month's floor demand + `growth.carry`) ÷ one organic firm's floor, from `sizeOffer`). Headroom = min(1, the best `prospectiveShare` of one more organic firm over the industrial zones, with `placedSupply` as the growth pass computes it, ÷ `min_utility_share`). With no industrial zone, it is the best over the playable areas, without placed supply.
    - **C** = the shortfall share: max(0, formal induced − formal posts) ÷ formal induced, where formal induced = Σ `inducedServiceJobs` × `formal_share` and formal posts = Σ `labour.servicePosts[].formal`. It is 0 when nothing is induced.
    - **R** = the higher of min(1, the highest demand crowding over the playable areas ÷ (2 × `min_crowding`)) and, when anyone was turned away last month, ⅔.
- **The quarter label (top left):** the year and quarter, and the turn out of 21.
- **The overlay switcher (top right):** one dropdown listing the overlays of §11.1 plus the road and utility networks.
- **The cell inspector (top right, under the switcher):** it opens when the player clicks a cell and shows:
  - the area;
  - use and stage;
  - work progress;
  - road reach;
  - power and water supplied share;
  - jobs and beds.

  It ends with one line, **"Held back by: …"**, naming the limiting constraint at that cell.

  The inspector keeps per-cell facts (works, road reach, supplied share) apart from the stocks it reads from the zone and the area (organic floor per zone, village stock per area), and labels which is which.
- **The constraint ladder.** One pure function, `cellConstraint(state, content, cell)` in `views.ts`, names the first constraint that applies at a cell, in this order:
  1. **unbuildable** (off the buildable layer, §5.5);
  2. **unzoned**;
  3. **not queued** (zoned, with no works and not serviced). R7 wording: "No site formation ordered";
  4. **order waiting**: its works order got less than its pace this month, with the order's `waiting` reason (paused, frozen, access, finance or capacity, b&c §13.2). A live site-preparation project covering the cell counts the same way, with the project's reason;
  5. **no road frontage** (not in `spatialViews(…).frontage`). R7 wording: "No road frontage: site formation cannot start";
  6. **being serviced**: its work is unfinished and its order is not waiting (R5: an unserviced cell has no supplied share, so rung 7 cannot apply yet). R7 wording: "Site formation under way";
  7. **utility shortfall** (the cell's supplied share of power or water is below 1; defined below). R7 wording: "Not enough power or water for its firms" — the supply a firm draws, not the plot-edge connection, which site formation already includes;
  8. **low demand or crowding** (its zone's use reads low on the I/C/R cue, or, for a residential zone, the area's demand crowding is below `growth.residential.min_crowding`, so work units build no dormitories there). Public and reserve zones have no organic builder and skip rungs 7 and 8;
  9. **building in progress** (a cohort or firm under construction in the zone);
  10. **active** (nothing holds it back).

  The inspector's "Held back by:" line and the briefing's "area most held back" both read it. The area most held back is the playable area with the most zoned cells whose constraint is earliest on the ladder (ties by area id), and the briefing names that constraint. Rungs 1 and 10 never name an area: an unbuildable cell inside a zone is not land the player can unlock, and an active cell holds nothing back. With every zoned cell on those rungs, the briefing says nothing is held back.

  The context the ladder reads (the spatial views, the supplied shares, the cue, the zones with building under way) is built once per state and reused for every cell, so the briefing's sweep over the zoned cells costs one build.
- **A cell's supplied share** (rung 7 and the inspector). A cell demands power and water only when it is a developable cell (§13.3) of a zone with open firms: the zone's open firms' needs, spread evenly over its developable cells, as `placedSupply` spreads them. Its share, for each utility, is `min(1, area capacity ÷ the area's open-firm need + the cell's placed supply ÷ the cell's demand)`. *From R8c the only active utility is power, and the area's part comes from the city pool (§5.5); water is not read.* The first term is the area's capacity (`area.utilities`) shared pro rata, so without placed sources the cell reads its area's `utilityShare`; the second is what `spatialViews` allocates to the cell from placed sources. The share is the lower of the active utilities (power alone from R8c). A cell with no demand reads "no demand", never a shortfall.
- **Floor at core zoom.** Organic floor is stored per zone and village stock per area (b&c §13.3, §5.2). At core zoom R5 draws a zone's floor over its developable cells, frontage first (lower frontage depth, then cell index), filling each cell to `growth.far` before the next. The spread is deterministic and for drawing only: it is never saved and the sim never reads it.
- **A known quirk (left as it is).** `placedSupply` (`growth.ts`) adds supply per road component into an area total, which the firms' utility share (`industry.ts`) reads. So one powered component lifts the whole area. The inspector's per-cell supplied share and the area's firm posting can therefore differ: a cell can read "utility shortfall" while the area's firms post fully. R5 shows both as they are and does not reconcile them.
- **The chip strip (bottom):** five chips. Each shows two stats and opens its drawer.
- **The bottom-right stack, from top to bottom:**
  - the queued orders (each removable);
  - Briefing, which reopens this turn's briefing;
  - Pending decisions, with the number of cards and how many must be answered;
  - End quarter. It becomes **Continue** while an interrupting card is pending (§11.1).

  Errors show as a toast above the stack.

**The chips** (a chip shows two stats, each under a visible caption; a stat may pair two figures with " / " or " · ", as R7's commitments do; drawers carry the §11.1 panel contents):

| Chip | Stat 1 · stat 2 | Drawer |
|---|---|---|
| Building 建设 | crews in use / total · committed (R7) — works running / stalled | works queue by cell with stage, progress and remaining cost; pause and cancel; team contracts (no project commits: the map builds) |
| Budget 预算 | money for projects — committed · funds after commitments (R7; the recurring balance stays in the drawer, per month and per year) | the ledger: `fiscalViews`' three views, obligations by kind, loans, forex quota |
| Population 人口 | residents · turned away | pops by kind, beds and occupancy, rental crowding |
| Economy 经济 | GDP this quarter · vacancies | jobs and filled posts by sector, firms, exports |
| Politics 政治 | scrutiny · review targets met | leaders, mandate, review targets against actuals, enforcement and permit regime |

"Net per quarter" and "review targets met" are derived in `views.ts` from existing state. They add no sim fields. **Committed and funds after commitments** (R7) come from existing exports, with no new sim fields: committed = sim-core's `unspentCommitments` (live orders' and projects' budget − spent) + the budgets of the orders this turn's queue would create (`previewWorks` on the queue) + the one-off obligations (those with an `until`) still due this quarter; funds after commitments = `moneyForProjects` − the queue − those one-offs (`moneyForProjects` already holds back the unspent budgets, so they are not subtracted twice). Recurring obligations stay against revenue in the drawer's net per quarter. A gesture queued this turn lowers the figure at once; the Budget drawer lists the same parts. **GDP this quarter** is the last three recorded months of `history.gdp`; before the first month is recorded (Turn 1) it is the quarter at the current month's rate, 3 × `gdpNow(state, params)` (R7), so the first screen shows the starting economy, not ¥0. The briefing's GDP row reads the same figure.

**Drawers:**
- **Placement:** a drawer floats over the map, so the map never resizes or jumps.
- **One at a time:** opening a drawer closes the previous one.
- **Closing:** ✕ or Esc.

**The briefing:**
- **When it shows:** at each turn's start, as a card over the dimmed map.
- **Contents:**
  - the §11.1 briefing deltas;
  - where work finished;
  - the area most held back, and the constraint holding it;
  - **R9, the news** (§5.8): the records fired since the previous turn's start (on Turn 1, those fired at init), grouped under their desk ("From Beijing", "From the province", "From the city", "From Hong Kong"):
    - `opening` records are shown first, in full, as letters marked as composed fiction;
    - then the lead (the first other record, in content order) in full;
    - then at most two more, as one-line headlines (their `name`).
    A record that fires mid-quarter is read at the next turn's briefing; a decision card it pairs with shows its own description at once;
  - **R9, the live modifiers:** each with its target in words, its factor ("Investor arrivals ×0.75") and the quarters left (`ceil((until − date + 1) ÷ 3)`), and its source's name.
- **Closing:** "To the map" or the first click on the map. The Briefing button reopens it until End quarter. If an interrupting card is still unanswered (on Turn 1, the opening card, R7), closing the briefing opens the decisions modal.
- **Where work finished:** compared with the previous turn's start, by playable area: cells newly serviced, road cells built, sources and facilities placed, works orders done, and firms opened.

**Cards that can be judged (R7).** An event card shows its title, its content `description`, then each option with its name and its **effect badges**. Badges are derived, never authored: a pure `effectBadges(def, slice, state)` in `views.ts` turns the `on_answer` effects that apply to an option (those with no `option`, and those naming it) into short `{zh, en}` strings, so a badge cannot disagree with what the option does. Effects applied when the event fired are not the option's, so they get no badge. Numbers come from params, as the effects read them: `cost` → "Cost ¥…" (`params.events[id].cost`); `scrutiny` and `standing` → "Scrutiny +…", "Standing +…"; `commit_choice` → the project template's name and its `params.projects` budget, or nothing for an option that is not a template; `set_permit` → the permit regime; `sweep` → its cash cost and months; `contract_team` and `cofinance` → the team or project by name; `unlock` → what it opens (`investors.*` reads "Unlocks investment"; R9: a key that opens tool gates reads "Opens ‹gate names›"); R9: `modifier` → its target, factor and months ("Investor arrivals ×0.75 for 9 months"); `modifier_shift` → "‹source›'s effects end 3 months sooner" (or later); `cofinance` with a structure → "Co-financed ‹structure›"; the rest by kind. An option with no effect reads "No effect". The switch is exhaustive over the effect kinds. Badges wrap, and none is told apart by colour alone. Cards raised by systems (investor offers, the loan, the deficit, the review) keep their §11.1 lines and get no badges.

**R5's build rules** (the details the layout above leaves open):
- **The rail, as built:** Select (inspect a cell), Roads, Zones (industrial, commercial, residential; Plan only; show the Shangbu guide; zone the guide), Form site, Erase, Water, Power and Facilities (the facility types in `works.facilities`). The guide is the historical template's footprint drawn over the map; showing it creates no action. "Zone the guide" queues `templateZoneAction`'s zone, clipped as §11.1's, with its `commit_works` unless Plan only is on. Tools are off while a card interrupts the quarter and after the end.
- **Gestures become actions in `src/tools.ts`,** a pure module (session, UI choices and gesture in, actions and a preview out), so the tests can play a quarter with the map tools alone. `map.ts` only turns pointer events into gestures.
  - **Zones:** a dragged rectangle, clipped by `previewZone`, gives `create_zone` and `commit_works { zone }`, the zone named by its queued id (§11.1).
  - **Roads:** a drag from cell A to cell B gives `build_road` with the waypoints A, (B.x, A.y), B, dropping repeats: horizontal first, then vertical. A click is a one-cell road.
  - **Water, Power, Facilities:** a click on cell c gives `place_structure { cell: c, attach }`. The attach cell is the first of c's four neighbours, in cell-index order, that is a road: start, built, in a live road order, or in a road queued this turn. With none it is c itself, and the inspector reads "no road at the attach cell".
  - **Service:** see above. A drag names the zone under its first cell.
  - **Erase:** an action queued this turn that covers the cell is removed from the queue first, since no order exists yet for `cancel_works` to name.
  - **Previews and refusals.** Every gesture's actions are tried with `previewWorks` on the turn's queue plus the gesture, through `applyTurnAction`, so they pass the same validation as End quarter. The preview shows the new orders' estimates (area, cells, bridges, cost, forex, crew a month and months at full pace). A refused gesture queues nothing and shows sim-core's reason. **R9:** the works flyout offers the pace (Normal, Push, All-out; greyed until `works.priority` opens). The preview then shows the months saved and the extra yuan against the same orders at normal pace (built), and the quarter's projected spending ÷ revenue (not built yet in R9, nor its warning). It warns, without refusing, when the ratio would cross the end-1983 band's ceiling.
- **Removing a queued action keeps the queue valid.** Removing a queued `create_zone` also removes the queued actions that name its zone (`commit_works`, `commit_project`, `edit_zone`, `remove_zone`), and renumbers the references to zones queued after it.
- **`public` is gone (R8b).** R7 showed it disabled; R8b removed it from `LAND_USES` and the flyout. Facilities are placed directly.
- **Locked tools (R9).** A tool, zone use, road class, tier or Govern control whose gate is locked (§5.8) is shown greyed, never hidden. Its title reads "Opens with ‹opener›", from the compiled gate's opener. A gesture that needs a locked gate is refused with sim-core's reason, as any refusal. The state of each gate is read from `events.unlocked` through the same `gateRefusal` predicate the sim uses.
- **Intensity (R8b).** The zones flyout offers low and standard after the use. It also offers high once `intensity.high` is unlocked, and shows it disabled with its reason until then. A drag carries the tier in `create_zone`.
- **The overlays:** areas; zones by use; works stage; the road network (components and frontage depth); utilities (sources and each cell's supplied share); held back (each zoned cell coloured by its ladder rung); demand (each zone coloured by its use's cue level); rental crowding; the illegal floor share (legality); the service gap; buildable and serviced land; the 1979 land cover (R8a, a lead). Zones, their works stages, roads, structures and the start anchors draw on every overlay.
- **The map draws** terrain and water from the Spike A grid when it is served, area outlines, the start anchors, the temporary routes in their keyed styles, roads autotiled from their four-neighbours, bridges (path cells off the buildable layer) with their own edge, and works stages: zoned (outline only), planned (hatched), servicing (filled to its share of work done) and serviced (solid). Queued, unsubmitted actions draw dashed.
- **Core zoom** (a cell at least 14 screen pixels wide) adds the floor spread above as roofs within each cell, and **village thickening**: each settlement anchor's roofs multiply with its area's village floor over its footprint (§5.2). The roof pattern is a hash of the cell index, never the RNG.
- **The chips' stats:** crews in use is last month's city works and project crew (the `constructionPosts` series ÷ `jobs_per_crew_unit`), and the total is `capacity.local_crew` plus the pool contracts active this month. Works running are live works orders and projects without a waiting reason; stalled are those with one. Net per quarter is 3 × `fiscalViews`' recurring balance. Review targets met counts this year's indicators whose value now reaches their target, out of all of them.
- **Code:** `apps/slice-ui/src/` (`views.ts` for the ladder, the cue, the chips, the floor spread and the overlays; `tools.ts`; `render.ts`; `map.ts`; `main.ts`). sim-core only exports `prospectiveShare` and `utilityShare`, which it already had. **Tests** (`apps/slice-ui/test/r5.test.ts`): a quarter played with map tools alone; each rung of the ladder reached and read in the inspector; the briefing naming the finished work and the change at the cell the next turn; the floor spread (deterministic, frontage first, filled to `far`, never more than the zone's floor); the network and utility overlays; five chips of two values each and a cue with no digits; every drawer in both languages (§11.1's language checks); removing a queued zone keeps the queue valid.

**Out of R5:**
- a minimap;
- an ecology stat (Phase 1 has no such value);
- the imagery layers;
- animation;
- phone layouts.

---

## 12. Build order (small commits, one system at a time)

**Map-first milestones (current order).** The M table below records the original demo. Keep its golden policies as a comparison while introducing the new loop; §5.10's growth shortfall is a baseline, not a target to reproduce.

| Step | Playable result and acceptance check |
|---|---|
| R1 · Spatial foundations | CLI and browser share point anchors and temporary road/rail placements. The planning view derives road frontage from committed zones; synthetic network checks cover interior reach, severed links and capacity shared across consumers. Each committed cell keeps its own work record (`planned → servicing → serviced`, with sunk work), and placed source and facility records sit in `GameState`. Both are saved at save version 2. `spatialViews` rebuilds frontage, reach and shared supply from loaded state. *Status:* done. No action or tick step writes the records yet, so M-series goldens are unchanged. Code: `packages/sim-core/src/{sites,network,works}.ts`; tests: `test/{start-sites,network,works}.test.ts`, which run interior reach, a severed link, shared capacity and identical views after save, load and a stepped quarter. |
| R2 · Placement and municipal works | Road/bridge paths, infrastructure placement and zone edits validate playable terrain and preview crew time and cost. Test that displaying a guide spends nothing; phasing it develops the first frontage without funding the whole guide; cancelling unstarted work and pausing a queue conserve funds and work. Spec: `buildings-and-construction.md` §13.2. *Status:* done, headless. Works orders share M4's crew pool and accounts; save version 3. The browser does not issue works actions yet (R5). Params are placeholders from the M4 templates' rates. Unfunded, a road commit raises the project-loan offer; that is left for R6 and not tuned. Golden runs: content hashes only. Code: `packages/sim-core/src/orders.ts`; tests: `test/orders.test.ts` |
| R3 · Organic growth | Under favourable policy, serviced I/C/R land can gain occupied floor without routine investor cards. Compare an isolated zone with connected land, and a pressured village with a quiet one. Charge stock, crews and costs to the responsible builder. Spec: `buildings-and-construction.md` §13.3. *Status:* done, headless. Small processing firms build and occupy their own factories with no card (`Firm.origin: 'organic'`), driven by orders and the fiscal regime and held back where the area's power and water could not supply them; private builders put up shops for worker spending, work units put up dormitories under rental pressure, and villages add informal shops. Builders pay their own way, with no ledger entry; private and work-unit crews take the pool at low priority. Routine card rates are cut to about a third. Save version 4. Golden runs (seed 1, end-1983 residents): historical_prologue 30,340 → 31,000 (12 organic firms in its Shangbu zone); aggressive 31,084 → 30,471 (rarer cards, and its card firms' power need leaves room for three organic firms); default, cautious and decline_all stay at 30,340 (no developable zone: default draws none, cautious never finishes its site preparation). Commercial tenants and informal shops post no jobs until R4. Code: `packages/sim-core/src/growth.ts`; tests: `test/growth.test.ts`. |
| R4 · Jobs and migration | Trace construction jobs during works, industrial jobs after occupancy, then service jobs as wages are spent. Compare accessible vacancies, arrivals, housing and recurring revenue against an idle run. Preserve population and money accounting through layoffs and departures. Spec: §5.11. *Status:* done, headless. Projects' and works orders' crews post construction jobs where they work; organic firms post once open, and placed sources raise their utility share through the spatial views; spending from non-service wages posts formal service jobs on occupied shop floor and informal ones where workers live. Matching keeps incumbents, with layoffs and migrant turnover, and fills vacancies only within an area or its road-reach class (areas 2, 4 and 6 have no road at the start). Migrants answer accessible vacancies; those who find no bed are recorded as turned away and raise rents and building a month later. Formal service posts pay tax, shops and work-unit dormitories pay the land fee, and finished works owe maintenance. Save version 5. Golden runs (seed 1, end-1983 migrants): default 320 → 769, cautious 320 → 591, aggressive 451 → 654, historical_prologue 998 → 1,517, decline_all 320 → 316 (its one project, a road link in area 2, which has no road, works a few months and stalls for money: its crew posts draw 2 construction migrants, and the layoffs when it stalls fall pro rata on all holders, so 6 start migrants leave). Most of the rise is incumbency: locals no longer move into new posts each month, so the posts pull migrants (each commit names its share). No growth multiplier is claimed: R6 measures it. Code: `packages/sim-core/src/systems/labour.ts`, `reach.ts`, `systems/migration.ts`; tests: `test/jobs.test.ts`. |
| R4.5 · Bridge to M4/M5 | Map-built works earn the M-series credit, roads draw in either direction, and the start joins Area 2 to Area 1. Spec: §5.7, §5.8, §1.1 and b&c §13.2; the R5 HUD decisions in §11.2. *Status:* done, headless. Readiness counts built road cells (0.1 km each) and placed sources; done works orders count as `projects_completed`; a works service order meets `site_preparation_committed`; a finished school facility adds `schoolPlaces` and owes payroll and service (`works.facilities.school` gains `staff` and `service_per_place_month`); `build_road` reverses a path whose end touches the network. A temporary 建设路 / Jianshe Road (1.3 km) joins the market town to the station, so Areas 1 and 2 share a reach class; Areas 4 and 6 stay unlinked. Golden runs (seed 1, end-1983 residents): default 30,778 → 30,780, cautious 30,574 → 30,575, aggressive 30,674 → 30,680, decline_all 30,336 → 30,334, historical_prologue 31,526 → 31,523. The bridge itself moves none (no policy builds from the map); the school params move `params_sha256` only; the moves come from the network, as Area 2's vacancies now draw idle town workers and its beds take the town's arrivals. Readiness and first-wave sizes are unchanged. Code: `packages/sim-core/src/readiness.ts`, `orders.ts`; tests: `test/bridge.test.ts`. **Evidence dependency:** `site.jianshe_road` cites `site.jianshe_road.exists_1979` and `site.jianshe_road.town_to_station`, which are in `data/evidence/claims/phase1_transport_network.yaml`, not yet committed; until that research bundle lands, `evidence:compile` on a clean checkout misses them. |
| R5 · Planning-map UI | Complete a quarter using map tools, read the limiting constraint at a cell and recognise the change at the next turn. Show sub-block detail at core zoom, network overlays, compact HUD, inspector and ledger/review drawers. Layout contract: §11.2 (tool rail, five chips with drawers, inspector naming the limiting constraint, start-of-turn briefing). *Status:* done. The browser builds from the map: zone drags queue `create_zone` and `commit_works` (or the zone alone with Plan only), and roads, sources, facilities, Service and Erase / Cancel emit the existing works actions, each previewed for cost and crew time by `previewWorks` on a clone. M4's project commits are hidden. One `cellConstraint()` ladder feeds the inspector, the held overlay and the briefing's area most held back. sim-core gains only the `prospectiveShare` and `utilityShare` exports; no sim state or mechanics change, and golden runs do not move. Checked in the browser in English and Chinese. Code: `apps/slice-ui/src/tools.ts`, `scene.ts`, `views.ts`, `render.ts`, `map.ts`; tests: `apps/slice-ui/test/r5.test.ts`, `lang.test.ts`. |
| R6 · Calibration | Run phased headless policies at the §9 checkpoints. Report population definitions, occupied floor, vacancies, housing, servicing and debt by policy; explain changed goldens and evidence gaps. No growth multiplier is an achieved result until measured. *Status:* done. The playing policies draw roads, phase servicing to the crews and place sources through the works queue; the report writes the §9 checkpoints by policy (`build/slice/checkpoints.md` and each `report.html`). `historical_prologue` and `aggressive` pass every measured band; `cautious` fails five structurally (small plan, no loan); `default` and `decline_all` are idle. The tuning log is `docs/design/m6-tuning-log.md`. |
| R7 · Clarity | A new player can read Turn 1, answer a decision and understand a chip without a doc (`docs/design/phase1-revision-plan.md` §2). *Status:* done, six commits. **Terms:** 三通一平 is "Site formation" (tool Form site, stages planned / forming / formed, "formed land"); the legacy internal keys are recorded in §13, not renamed; `public` is shown disabled in the zones flyout with its reason. **Roads:** a drag strips the cells that are already road anywhere along it and becomes one order per remaining segment (b&c §13.2). **Cards:** every event card has a `description`, and each option derived effect badges (`effectBadges`). **GDP:** `gdpNow` feeds the series unchanged and Turn 1's chip and briefing (3 × gdpNow before the first month). **Prologue:** turn-0 beats fire in `createInitialState`, so the opening card is pending at 1979-01 and answered with that turn's actions. **Chips:** each stat has a visible caption; Budget shows committed · funds after commitments, Building the committed figure, from existing exports. Golden runs (seed 1, end-1983 residents): default 30,863 → 30,861, cautious 36,265 → 36,266, aggressive 54,332 → 54,329, decline_all 30,335, historical_prologue 49,813 → 49,815; only the prologue commit moves them (the opening answer lands in 1979-01 with the turn's actions, a month earlier than the old mid-quarter pause, not a quarter as the revision plan expected), and the cards commit moves `events_sha256`. Readiness, the SEZ month, first-wave sizes and review pass flags are unchanged. Checked in the browser for Turns 1–3 (captioned chips, the described opening card with badges, a road dragged from an existing road and built). Code: `packages/sim-core/src/{orders,opening,events}.ts`, `systems/statistics.ts`; `apps/slice-ui/src/{strings,views,render,tools}.ts`; tests: `packages/sim-core/test/{orders,opening}.test.ts`, `apps/slice-ui/test/r7.test.ts`. |
| R8 · Land cover, power, freight, intensity | The ground prices formation; the city buys and builds power; roads carry freight to the gateways; zones choose an intensity; saves migrate (`docs/design/phase1-revision-plan.md` §3). *Status:* done, six commits: land cover (R8a), power (R8c), road classes and gateways (R8d, plus a freight fix), intensity (R8b), save version 6 (R8e). **Land cover** (§5.5): one class per cell, a lead; it prices formation, owes compensation and refuses villages, hills and water. **Power** (§5.5): a city pool of local, purchased and station kW, shared to areas through substations; water is not an active constraint. **Freight** (§5.12): track, street and avenue; four gateways; an area's exports and inputs are capped by its widest path and the gateway's share; both map plans upgrade the Shangbu–Luohu corridor. **Intensity** (§5.3): `public` is gone; low, standard and high zones, high locked until the SEZ beat and needing an avenue. **Saves** (§5.1): version 6, with a migration table and a load test from a pre-R8 version-5 save. historical_prologue and aggressive pass all 20 bands; the end-1983 goldens moved in R8a, R8c and R8d; R8b and R8e moved only hashes (`docs/design/m6-tuning-log.md`). *Left open:* the land cover stays a lead; materials are inert; the remove-and-repaint dodge of the formation tier; investor siting reads un-tiered power. |
| R9 · Guided prologue | The prologue teaches through history: news letters and headlines, tools that open with events, reframed 1979–80 cards, timed modifiers, crew in waves and works pace (`docs/design/phase1-revision-plan.md` §4). *Status:* done, twelve commits: news (25 records: 23 dated and the 2 opening letters), the gates (`content/slice/tools.yaml`, enforced by `applyTurnAction`, held back by the plans), the prologue cards (the survey, the province's rules, a co-financed substation), timed modifiers and three cards, crew waves (save version 7, `crewPool`, the backlog brake), works pace (and a fix), plan borrowing and roads at once, and the UI (locked tools with their opener, the pace flyout, news and modifiers in the briefing). historical_prologue and aggressive pass all 20 bands: the plans borrow in 1979, order their first road in the first month and build a Luohu street beside the Shangbu road (§5.9, §5.10, `m6-tuning-log.md` R9). *Left open:* a save from before R9 has none of R9's unlock keys, so a tool whose beat already fired stays locked after loading (a migration decision); the 1979-Q4 margin is thin (1.337 against 1.295); the pace preview's projected spending ratio; the crew core stays at 600, not 200; investor siting reads un-tiered power. |

**M-series build record:**
| Milestone | Contents | Done when |
|---|---|---|
| M1 | `sim-core` package: state, seeded RNG, `step()`, the action log, save and load. Also: `content/slice/areas.yaml` from whole proxy subdistricts, with the area invariant checked by `m1b_sites.py`; the map viewer's slice overlay synced to it (playable vs card-only, replacing the hard-coded Luohu + Shekou sets in `apps/map-spike/src/main.ts`) | The §5.1 tests pass (save, load and continue matches an uninterrupted 63-month run; replay from the log; the pause contract); the area invariant passes. *Status:* done. Rebuild the areas with `pipeline/m1_areas.py`, then run `pipeline/m1b_sites.py` (the invariant); sim-core's tests run in `npm run check` |
| M1b | The 1979 site register: candidate sites with claims, rough geometry, site flags on the map; start state compiled from it | Every site in the start state has a flag and a claim. *Status:* register and flags done; the start state is not compiled yet |
| M2 | Pops, labour, migration, housing (block stocks), village building (§5.2) | At rest, the start state holds still. Under a fixture job shock, the town fills with migrants and village rental floors on its own, illegal floors included. Without M3 there is no job growth, so the shock stands in for investors. M2's tests in §5.2 pass. *Status:* done, with placeholder numbers (`params/slice.yaml`, `content/slice/start_1979.yaml`). Tests: `packages/sim-core/test/m2.test.ts` |
| M3a | Zones, the historical template and historical names (§5.3) | The §5.3 tests pass: free zoning, the template applies, names attach by location, purpose and scale, and M2 runs are unchanged. *Status:* done. Names are labels only; the footprints are placeholder squares on present-day proxies. Code: `packages/sim-core/src/zones.ts`; tests: `packages/sim-core/test/zones.test.ts` |
| M3b | Industry, production, investors and the preview; investors locate in zones (§5.5) | Accepted investors create jobs, orders and housing demand. The §5.5 tests pass. *Status:* done, with placeholder numbers (`params/slice.yaml` `industry` and `investors`, the area utilities in `content/slice/start_1979.yaml`) and a placeholder buildable layer (rebuild with `pipeline/m3b_buildable.py`). Code: `packages/sim-core/src/investors.ts`, `src/systems/industry.ts`; tests: `test/m3b.test.ts`, `test/offers.test.ts` |
| M3c | Named emergence (§5.4) | Held while M3b and candidate placement are pending. A cluster emerges where conditions hold and takes its historical name when its location matches. |
| M4 | Fiscal: ledger, obligations, projects, the loan, the deficit rule; nominal GDP; serviced land and the construction-capacity pool (§5.6) | Overbuilding forces a deficit card; the loan squeezes later years. The §5.6 tests pass. *Status:* done, with placeholder numbers (`params/slice.yaml` `fiscal`, `capacity`, `projects`, `teams`, `gdp`). M2 and M3 runs are unchanged without the fiscal content. Code: `packages/sim-core/src/fiscal.ts`, `src/systems/finance.ts`, `src/systems/projects.ts`; tests: `test/m4.test.ts` |
| M5a | The events step; the guaranteed first contract; the SEZ chain, its new origins and incentives; readiness, the 1980-Q2 check and the first wave; Shekou's capture; the leaders and the deal-maker's shortcut (§5.7) | Readiness visibly changes the first wave. The §5.7 tests pass. *Status:* done |
| M5b | The annual review and the sweep, the climate value, the remaining events and prologue beats, the budget cards and the grant warning, the briefing's loan and co-financing offers, and the closing visit (§5.8) | Each year's review forces a trade-off; the prologue tests pass; the 1980-Q2 snapshot is generated and passes its bands. *Status:* done. The snapshot is generated by the M5b test, not checked in as a file. The review targets, the climate and the event numbers are placeholders for M6's balance pass |
| M6 | The CLI, golden runs, the plausibility report; the 2D UI on the Spike A canvas. Built in three parts | All five exit criteria can be checked. *Status:* M6a and M6c done, so all five can be checked (the report, the golden runs, the UI); M6b held (§5.10) |
| M6a | One way to load the slice, the bands and measures, the `cautious`, `aggressive` and random policies, the CLI and its report, the golden runs, the property and speed tests (§5.9) | The §5.9 tests pass; the report checks criteria 1–5 on any run. No balance changes. *Status:* done. Run `npm run slice -- run --policy <name>` for a report and `npm run golden:update` after a change that moves a golden run. Code: `packages/sim-core/src/{content,calibration,play,summary,policies}.ts`, `apps/cli/`; tests: `test/m6a.test.ts`, `apps/cli/test/cli.test.ts` |
| M6b | The balance pass: named params only, with a tuning log, driven by M6a's report | The report's findings are fixed or recorded as structural. M5b's calibration properties still hold (§5.8). *Status:* done for the playing policies. `historical_prologue` and `aggressive` pass the measured §9 bands; `cautious` and the idle policies' failures are structural, with reasons in §5.10 and `docs/design/m6-tuning-log.md`. Tuning log: `docs/design/m6-tuning-log.md`; report: `npm run slice -- golden`. |
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

**Vocabulary (decided 2026-11-24, R7).** 三通一平 is **site formation** in English, never "servicing", which the HUD keeps for the service sector ("Services"). It means clearing, levelling, internal lanes, and the water and power connection at the plot edge; the hint says the connections are already included, so the player does not buy them again by placing a source. The tool is **Form site / 平整土地**, the order a **site formation order**, the outcome **formed land / 已平整土地**, and a cell's stages read **planned / forming / formed** (已安排 / 平整中 / 已平整). The internal identifiers are legacy keys and are not renamed: `servicedLand`, `servicedShare`, `CellWork.stage: 'planned' | 'servicing' | 'serviced'`, `WorksOrder.kind: 'service'`, `commit_works`, `works.service` in params and the tool id `service`. A mechanical rename would touch about 40 files and every golden and buy the player nothing; any later cleanup may do it. The spec's older sections keep "serviced" where they describe those keys.

**Still open:**
1. The exact sequence and on-site headcount of the 1979 advance crews (§2.1). Period orders or transport records could reconcile the September account with the later eyewitness dates.
2. Whether the 1979 typhoon becomes an anchor (`phase1.event.typhoon_1979`, lead).
3. The provincial grant's base amount (fiscal §13).
4. **Named emergence in Phase 1** (§5.4): which in-window firm or landmark to place and whether its scope fits the slice after M3b.
5. The real extents of the three historical zones, which replace the placeholder squares (§5.3).
