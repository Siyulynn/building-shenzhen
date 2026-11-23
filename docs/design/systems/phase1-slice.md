# System spec: the Phase 1 slice ("Luohu and Shekou, 1980–1985")
**Status:** draft v0.1, for review. **Covers:** `PLAN.md` §10 Phase 1 and §14 step 3. **Uses the Phase 1 subsets of:** fiscal-and-macro §11, buildings-and-construction §13 and leadership-and-reviews §7. Those specs own their schemas, and this spec only says which parts the slice switches on and how they connect.

**Every number in this spec is a starting parameter** (in `params/slice.yaml`) unless it cites a claim. The start state uses placeholder values, flagged `placeholder: true`, until the slice's research targets (§9) are found. Evidence compiles in **draft mode** (evidence protocol §9), so the slice is allowed to run on `lead` and placeholder data, with every such value tagged `[UNVERIFIED]`.

---

## 1. What the slice must prove
Phase 1 tests the core triangle: **growth vs fiscal survival vs politics and reviews.** If it is fun in ugly 2D, the project is validated.

**Exit criteria** (from PLAN §10):
1. You can play 24 quarters, and the town grows plausibly in response to your choices.
2. Budget pressure and the review target force at least one hard trade-off a year. A loan taken today visibly squeezes a later year.
3. The slice is checked against its own Luohu–Shekou plausibility bands (§9), not whole-city totals.
4. A headless 24-quarter run takes seconds, and the invariant tests pass.
5. **You want to play it again.** This one is judged by playtests (§12), not tests.

**The three tensions the player should feel:**
- **Obligations, loans and import access.** Every school, road and loan commits future money. Forex quota decides whether you can import the crane or the generator at all.
- **Village building.** Villagers add rental floors faster than you can plan. It houses the workers your factories need, and it blights the review.
- **The Secretary–Mayor pair and the review.** The deal-maker's shortcut closes the investor today, and raises a risk that can sink you at the year-end review.

**Out of scope** (later phases): the authority layer beyond one climate value; villages as full actors; the informal economy beyond one illegal-floor value per area; block assembly and developers; reclamation; title reviews; rotation of leaders; 3D; strict evidence gating.

---

## 2. Time and turns
- **Start:** 1980-Q1. **End:** 1985-Q4. That is 24 quarterly turns of three monthly sub-steps each (PLAN §2).
- **Why 1980:** it places the SEZ's establishment inside the slice as its first national anchor. The date of the anchor is a claim to be created and sourced (Appendix A ✓, not yet in the store). Starting in 1979-Q1 is the alternative; see §13.
- **Quarter character** (PLAN §2): Q1 Spring Festival departures and the annual budget card; Q2 the construction peak; Q3 typhoon risk; Q4 the year-end review.
- **Turn flow:** briefing → cards → plan and build → govern → end turn. Interrupting cards pause the turn mid-quarter (PLAN §6.2).

---

## 3. The map
- **The grid** is the Spike A grid (`docs/spikes/spike-a-map.md`): 100 m cells in UTM 50N. Only cells inside the slice areas are playable. Everything else is drawn but locked.
- **The coastline** is the present-day DEM coastline until the 1979 coastline is traced. This overstates Shekou's land (reclamation started in this period). The map shows a caveat until it is fixed.
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

- **The Shekou flag:** the player cannot zone or lease land inside area 9. They negotiate with it through cards instead, and it competes with them for investors.

---

## 4. What the player can do
| Action | System | Notes |
|---|---|---|
| Paint a land-use plan on cells: industrial, residential, commercial, public, reserve | buildings §3.1 | The plan guides builders but does not bind village households |
| Lease a parcel by allocation or negotiation | fiscal §5 | Auctions are locked in the slice (the first one is a later milestone) |
| Build a road, water main, power line, school, clinic or police post | fiscal §6.2, §6.1 | Creates a project, then obligations once it is finished |
| Accept or decline an investor card | §6.5 | Shows the partial-equilibrium preview (fiscal §7.2) |
| Take the state-bank project loan; accept the co-financing offer | fiscal §11 | One of each in the slice |
| Answer the deficit card | fiscal §7.1 | Borrow, use land money, or cut |
| Set enforcement priority against illegal floors (low, medium, high) | buildings §5 | One enforcement level for the whole slice |
| Set the temporary-permit regime (loose, standard, strict) | §6.2 | Changes migrant inflow and the climate value |
| Accept or decline the leader's shortcut | leadership §2.5 | One shortcut card type (deal-maker) |
| Answer event cards | §7 | About 15 events |

---

## 5. State in the slice
The slice uses the schemas from the owning specs, switched to their Phase 1 subsets:
- **Physical** (buildings §2): `BlockStock` for every block in the slice areas; a handful of tracked `Building` records for landmarks (the station, the first hotel, the first industrial building in Shekou: names `lead`). No promotion. Stages include `stalled`.
- **Fiscal** (fiscal §3): accounts `general`, `land`, `debt` and a simplified `forex` quota. Regime `regime.contracting_1980s` (its terms are `lead`: placeholder parameters until sourced).
- **Leadership** (leadership §2.1): one Secretary and one Mayor, no rotation; the Mayor has the deal-maker trait.
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
- **About one investor card a quarter.** Fields: origin (Hong Kong, overseas Chinese, inland state unit), sector, jobs, floor needed, utilities needed, the terms asked (land price, tax holiday, labour terms, forex), and whether they bring forex.
- **The preview** (fiscal §7.2) shows cash this quarter, retained tax per year, jobs, beds needed and new obligations.
- **Declining** an investor sends some of them to Shekou, which competes for them.
- **The deal-maker's shortcut** can attach to a card: accept a sweetheart price to close it now (leadership §2.5).

### 6.6 Construction economy
- **Builders in the slice:** village households, the city (projects) and Hong Kong investors (factories, dormitories, the hotel). No developers or block assembly.
- **Stalls** happen when credit tightens or a city project loses its funding.

### 6.7 Fiscal
Exactly fiscal-and-macro §11, with the deficit rule (§7.1) and the investor preview (§7.2). The three views shown are recurring money, money for projects and import access. **The loan:** one state-bank project loan, which appears once the player has committed to a road or water project bigger than they can fund. **The co-financing offer:** one investor offers to pay for a power line in exchange for a long tax holiday and cheap land.

### 6.8 Leaders and the annual review
- **The pair:** a Secretary (fictional, cautious) and a Mayor (fictional, deal-maker). Mandate: "open the first export processing zone" (leadership §7). Briefings at inauguration, the Q1 budget and crises.
- **The annual review (Q4):** targets for exports, foreign investment used, forex earned and infrastructure built, plus one basic sanitation and order check that includes an unannounced team. The era framing of these targets is `lead` (leadership §3).
- **Results:** political capital and the leaders' standing, and the scrutiny value.
- **Discipline risk** comes from accepted shortcuts (leadership §2.6). A fall from grace in the slice freezes projects and replaces the Mayor with a cautious figure, and can fail that year's review if the case touches an accepted shortcut.

### 6.9 Climate (the one authority value)
- **Reform wind** is an exogenous series in the slice. Its shape for 1980–85 is a `design_note` until sourced.
- **Scrutiny** rises with grey choices (a loose permit regime, tolerated illegal floors, accepted shortcuts) and with disasters, and decays slowly.
- **The failure state:** if scrutiny stays above a threshold for four quarters, the run ends with "the experiment is declared a failure" (PLAN §3.8).

---

## 7. Content
```
content/slice/areas.yaml          # the ten areas: keys, names (en + zh), proxy subdistricts, flags
content/slice/start_1980.yaml     # start state: pops, blocks, facilities, ledger (placeholder: true until sourced)
content/slice/investors.yaml      # investor card templates
content/slice/events/*.yaml       # about 15 events
content/slice/targets.yaml        # annual review targets
params/slice.yaml                 # all tunable numbers
```
Every historical statement cites claim IDs (CLAUDE.md). Claims that don't exist yet are created as `lead` in the same change.

**The events** (about 15). *Anchor* dates are fixed in Historical mode; *milestones* are timed by the player; *emergent* events fire from sim conditions. The date column is the reference date, and none is sourced yet.

| # | Event | Family | Reference | Claim status |
|---|---|---|---|---|
| 1 | The SEZ is established | anchor | 1980-08 | to create (Appendix A ✓) |
| 2 | Land-use fee regulations | anchor | 1981-11 | `land.regulations_1981` (lead) |
| 3 | Forex retention: quotas to buy foreign exchange | anchor (in force at start) | 1979 | `forex.retention.start` (sourced) |
| 4 | The second-line fence goes up | anchor | 1982 | to create (Appendix A ✓) |
| 5 | A senior leader's inspection visit | anchor | 1984-01 | to create (Appendix A, verify) |
| 6 | The first processing contract signed | milestone | — | design_note |
| 7 | The first export processing zone opens (the mandate) | milestone | — | design_note |
| 8 | Shekou poaches an investor | emergent | — | design_note |
| 9 | Hong Kong orders surge, or slump | emergent | — | design_note |
| 10 | A typhoon (Q3) | emergent | — | design_note |
| 11 | A fire in a mixed factory and dormitory | emergent | — | design_note |
| 12 | Young villagers escape to Hong Kong | emergent | — | design_note |
| 13 | A village petitions over land compensation | emergent | — | design_note |
| 14 | Unannounced inspection team | emergent (Q4) | — | design_note |
| 15 | A crackdown on smuggling | emergent | — | design_note |

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
There are no sourced Luohu–Shekou series for 1980–85 in the evidence store yet. So the slice starts with **plausibility bands** (`design_note`), each replaced by a real target when a claim reaches `verified`:
- the resident population of the slice roughly multiplies over the period, rather than staying flat or exploding;
- processing exports grow much faster than local GDP;
- village rental floor grows faster than planned housing;
- the city runs at least one recurring deficit before 1985;
- at least one stalled building appears after a credit tightening.

**Research targets for the slice** (leads to open; record them as claims):
- population of Luohu and Shekou (or of the SEZ) by year, 1979–85, with registered and resident counts;
- Shekou Industrial Zone: firms, jobs and output by year;
- SEZ budget revenue and spending, and foreign investment used, 1980–85;
- the terms of the 1980s fiscal contracting arrangement (fiscal §13);
- period maps of the Luohu and Shekou areas, for the area boundaries and the 1979 coastline.

---

## 10. The headless runner and tests
- **`apps/cli`**: `slice run --seed N --quarters 24 --policy default` writes a JSON series and a short HTML report.
- **Decision policies:** `default` (first option), `cautious`, `aggressive`, plus scripted answers. Every card answer goes into the action log (PLAN §6.2).
- **Golden runs:** fixed seeds for the three policies. A change that moves their numbers must say so.
- **Invariants** (property tests over random seeds and policies):
  - population conservation: births + inflow − deaths − outflow = Δpop, for every kind and area;
  - the ledger balances every month (fiscal §10), and the month always closes (fiscal §7.1);
  - capacity ignores occupancy, and floor space is never negative (buildings §11);
  - the same seed and the same actions give the same run;
  - no code reads the calendar year for balance (a lint rule, PLAN §6.2).
- **Speed:** 24 quarters headless in under 5 seconds on a laptop.

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
| M1 | `sim-core` package: state, seeded RNG, `step()`, the action log, save and load; `content/slice/areas.yaml` drawn from proxies | A run of 72 empty months is deterministic |
| M2 | Pops, labour, migration, housing (block stocks), village building | The town fills with migrants and rental floors on its own |
| M3 | Industry blocks, production, investors and the preview | Accepted investors create jobs, orders and housing demand |
| M4 | Fiscal: ledger, obligations, projects, the loan, the deficit rule; nominal GDP | Overbuilding forces a deficit card; the loan squeezes later years |
| M5 | Leaders, the shortcut, the annual review, the climate value, the 15 events | Each year's review forces a trade-off |
| M6 | The CLI, golden runs, the plausibility report; the 2D UI on the Spike A canvas | All five exit criteria can be checked |
| Playtest | Several full playthroughs; notes in `docs/playtests/` | You want to play it again |

---

## 13. Open questions (defaults in bold)
1. **Start date:** **1980-Q1** (the SEZ is founded during play), or 1979-Q1 (the city is founded first).
2. **Ten areas**, as in §3, or fewer by merging the reservoir hills and Liantang.
3. **Include Shangbu**, which is outside present-day Luohu, because it was part of the early zone. Its role is `lead`.
4. **Shekou as a locked enclave** in Phase 1 (cards only), with full behaviour in Phase 2.
5. **Quarterly turns in the fast early years:** keep quarters, and judge in playtests whether they feel too coarse (PLAN §2).
