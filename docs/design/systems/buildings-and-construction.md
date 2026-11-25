# System spec: buildings and construction
**Status:** draft v0.2 (tiered records, stalled stage, minimal demolished records, bed-capacity fix). **Covers:** `PLAN.md` §3.1 (beneath the grid; title and rights), §3.4 (housing; the construction economy), §5 (compiling from evidence) and the rendering contract in §6.5. **Depends on:** fiscal-and-macro (land receipts, compensation, construction value added), pops and housing demand, enterprises (workplace demand), and the authority layer (enforcement, campaigns).

Fact references such as [V3] point to rows in `docs/research/verification-log-2026-11.md`. Numbers without a reference are starting parameters.

---

## 1. Purpose
The physical city has to:
- persist and stay recognisable for thirty years;
- explain itself (who built this, when, under what rights, and whether it is legal);
- supply the beds, workplaces and shop space that the economy uses;
- give the renderer everything it needs to draw the right building at the right date.

**Non-goals:**
- interior layouts;
- structural engineering;
- a separate economic actor for every landlord. Village households are aggregated per village, and builders choose parcels.

---

## 2. Data model

### 2.1 Layers
| Layer | Content | Source of truth? |
|---|---|---|
| **Road network** | Nodes and edges for arterials and streets: width, kind, build year, surface. Village alleys are generated for rendering, except on walkable routes, where they are traced and stored | Yes |
| **Parcels** | Footprint polygon, area, village, **title**, **rights**, controller. Stored individually inside tracked blocks. Elsewhere, title and rights are held as block-level summaries | Yes |
| **Tracked buildings** | Stable ID, parcel, footprint, floors by use, stage, occupancy, legality, alterations, provenance | Yes, for the tracked tier |
| **Block stocks** | For each untracked block: floor space by use × stage × legality × build-era cohort, plus a compact event log | Yes, for everything else |
| **Cells (100 m)** | Floor area by use, dominant title and archetype, median build year, share of illegal floor area | **No.** They are summaries, recomputed each month |
| **Areas** | Capacity totals (beds, workplaces, shop space) given to the economy | **No.** They are summaries |

### 2.1a Two tiers of buildings
Simulating every building in a 2,000 km² municipality costs memory, worker messages and save size, and buys nothing the economy uses. So there are two tiers:
- **Tracked buildings** get full records (§2.2). A block is tracked when it is:
  - on a walkable route, or a landmark;
  - covered by observed buildings in a compiled start;
  - under active redevelopment (block assembly, §6), or a public project;
  - the premises of a notable firm.

  The target is a few thousand, and at most about 2×10⁴.
- **Block stocks** cover everything else. Each holds floor space by use, stage, legality and build-era cohort, plus a compact event log: `{ date, kind: 'start'|'complete'|'add_floors'|'change_use'|'stall'|'resume'|'demolish'|'legalise'|'mark_illegal', use, m2, builder }`. Events older than 24 months are folded into the cohort totals.
- **Promotion:** when a block becomes tracked (usually because redevelopment starts), its stock is turned into tracked records by a deterministic generator seeded from `(blockId, event log)`. The records add up exactly to the stock. Promotion is decided by the sim alone, never by the camera.
- **Rendering untracked blocks:** the renderer generates individual buildings from `(blockId, event log)` on the fly, with the same seed every time. "A landlord added two floors, the shop downstairs is still there" survives as an `add_floors` event on the block.
- **The economy reads totals,** so it treats the two tiers the same way.

### 2.2 Records
```ts
interface Parcel {
  id: number; area: number; village?: number; footprint: Polygon; m2: number;
  title: 'state' | 'collective' | 'military' | 'reserved';
  rights: Right[];                 // who may build / who must be compensated
  controller: ActorId;             // household group, village company, developer, SOE, city, firm
  plannedUse?: LandUse; leaseEnds?: YM;
}
interface Right { holder: ActorId; kind: 'use' | 'develop' | 'compensation' | 'dividend' | 'house_plot';
  basis: string; value?: number; }   // basis: a policy or historical instrument id, e.g. 'conversion_2004'
interface Building {
  id: number;                       // never reused
  parcel: number; footprint: Polygon;
  floors: { use: 'residential_rental'|'residential_owner'|'dormitory'|'shop'|'workshop'|'factory'|'office'|'warehouse'|'public'|'vacant'; count: number }[];
  stage: 'planned' | 'under_construction' | 'stalled' | 'completed' | 'demolished';
  progress: number;                 // 0..1 while under construction
  occupancy: number;                // share of completed floor space in use
  legality: 'permitted' | 'unpermitted_tolerated' | 'marked_illegal' | 'condemned';
  builtYear: number; builder: ActorId;
  alterations: { date: YM; kind: 'add_floors'|'change_use'|'subdivide'|'facade'|'partial_demolish'|'repair'; detail: object }[];
  provenance: { kind: 'generated' } | { kind: 'observed'; observationIds: string[]; confidence: number };
  archetype: string;                // era kit for the renderer
}
interface BlockStock {
  blockId: number; cell: number; area: number; village?: number;
  cohorts: { era: number; use: FloorUse; stage: Stage; legality: Legality; m2: number;
             archetype: string;            // the era kit, as on Building; m² per bed and per job are keyed by it
             due?: YM }[];                 // completion month, for cohorts under construction
  events: { date: YM; kind: BlockEventKind; use?: FloorUse; m2: number; builder: ActorId }[];   // last 24 months
  rightsSummary: { title: Title; share: number }[];
}
interface DemolishedRecord { id: number; parcel: number; builtYear: number; demolishedYear: number; archetype: string }
interface PhysicalState {
  cells: CellSummaries;            // struct-of-arrays typed arrays, recomputed from the records below; never the source of truth
  roads: RoadNetwork;              // arterials and streets; route alleys are traced and stored
  parcels: Parcel[];               // tracked blocks only
  buildings: Building[];           // the tracked tier
  blocks: BlockStock[];            // everything else
  demolished: DemolishedRecord[];
}
```
Tracked records are stored as struct-of-arrays, with alterations in a side table.

**Demolished buildings** shrink to a `DemolishedRecord`: id, parcel, build year, demolition year and archetype. The polygon and floor arrays are dropped. This keeps the player's own city history (what stood here before) without doubling the save. The historical overlay doesn't need them, because it is drawn from `data/evidence/observations/`, not from the save.

---

## 3. Builders
| Builder | Typical behaviour | Speed | Constraint |
|---|---|---|---|
| **Village household (group)** | Adds floors or rebuilds a house plot for rental, as migrant rents rise | Months | House plot rights; enforcement risk; village rules |
| **Village joint-stock company** | Builds rental blocks, factories and markets on reserved land; pays dividends | 1–2 years | Village land left over; city approval or tolerance |
| **Developer** | Assembles parcels, clears them, builds commodity housing or offices | 2–5 years | Land access, finance, compensation bargaining |
| **State enterprise / danwei** | Builds staff housing and plants on allocated land | 1–3 years | Allocation; its parent's budget |
| **Foreign or Hong Kong investor** | Builds factories, dormitories and hotels on leased land | 1–2 years | The lease's terms |
| **City government** | Public works and public housing, through projects | Per project | Money for projects; mandates |
| **Informal builder** | Shacks and lean-tos; overnight additions | Weeks | Only where enforcement is weak |

### 3.1 Decision rule (monthly)
1. **Areas emit demand signals.** Each area reports unmet demand by use (beds, workplaces, shop space) and the current rents and prices for each use.
2. **The allocator picks candidates.** For each builder type, it ranks candidate parcels deterministically by feasibility, with a seeded tie-break:
   ```
   value     = Σ_use floor_m2 × expected_rent_or_price[use] × expected_occupancy[use]   (discounted over the builder's horizon)
   cost      = construction_cost[archetype, era] × floor_m2 + finance_cost(time, credit) + land_and_rights_cost(parcel)
   risk      = p_enforcement(parcel, legality_of_plan) × expected_loss + political_risk
   feasible  = value − cost − risk > hurdle[builder]
   ```
3. **Starts are capped.** Building starts per month are limited by the builder's capacity, construction labour and materials. Construction labour comes from pops, so a building boom pulls in migrants.
4. **Floors can only rise so far:**
   ```
   max_floors = min(zoning or plot rules, structural limit[era, method], what enforcement allows in practice)
   ```
   This is what produces handshake buildings: village plots, weak enforcement and high rents.

Economic decisions stay **area-level**. The allocator only decides *which parcel* receives the area's construction. That keeps the economy debuggable: if Gangxia has too many beds, the area signal tells you why.

---

## 4. The construction pipeline
```
planned ──► under_construction ──► completed ──► (occupied | vacant) ──► altered … ──► demolished
                  │      ▲
                  ▼      │ resume (same or new builder)
                stalled (烂尾 / 停工) ──► demolished
```
- **Stalling:** a building under construction stalls when its builder's finance fails (credit conditions tighten, developer cash runs out), when a city project is paused, or when a stop-work order is issued.
  - While stalled, it adds no construction value, its finance costs keep growing, and it counts toward **visible blight** in the title reviews and the hazard index.
  - It resumes if finance returns or another builder buys it, or it is demolished.
  - Stalls should cluster after credit shocks; the 1993–95 tightening and the 1997–98 crisis are the cases to calibrate against. The historical extent is `lead`.
- **Duration** = `base_months[archetype, builder] × era_speed × leader_modifier`. The infrastructure-patron trait shortens it and raises accident risk.
- **Value added from construction** is counted *as the work is done*, as monthly progress × contract value. It feeds the production loop and GDP in fiscal-and-macro §8.1–8.2.
- **Only completed floor space** supplies beds, workplaces or shop space.
- **Occupancy** comes from the housing and job markets each month. Vacancy feeds back into expected occupancy for future starts.
- **Programmes vs completions:** public housing programmes create *planned* records that move forward only when funded and started. The game should be able to reproduce a large gap between arranged and completed units. For example, only about 12% of the affordable units arranged in 2006–10 were completed by end-2010 [V3].

---

## 5. Alterations, legality and enforcement
- **Alterations** are dated entries. A landlord adding two floors keeps the building ID, the shop downstairs stays, and the renderer shows both.
- **Legality states:**
  - `permitted` → `unpermitted_tolerated` (the default for informal additions when enforcement is weak) → `marked_illegal` (served notice) → `condemned`.
  - A legalisation policy can move buildings back. The historical instruments for handling "illegal buildings left over from history" are **lead** and need sources before they are modelled by name.
- **Detection:** `p = base[enforcement budget, priority] × visibility(height, street frontage) × campaign_multiplier`. Leaders' traits and corruption can lower detection for certain controllers.
- **Campaigns** (see leadership-and-reviews):
  - A *cleanup* temporarily lowers the visible informality and can add `facade` alterations (穿衣戴帽). Activity then rebounds.
  - *Real investment* makes lasting changes, such as sewer connections, fire lanes and legalised floors.

---

## 6. Title, rights and compensation
- **Title is not rights.** Converting land changes `title` but keeps or creates `rights`. The 2004 urbanisation of Bao'an and Longgang moved collective land to state title, with compensation arrangements and village companies keeping claims (PLAN Appendix A ✓). This is modelled as the instrument `conversion_2004`, and the 1992 conversion inside the line as `conversion_1992`.
- **Compensation** for redeveloping a parcel = Σ over its rights of `claim_value(right, current land value, floor area including tolerated floors, policy)`. Whether *illegal* floor area is compensated is a policy lever with large effects.
- **Block assembly:** a redevelopment covers several parcels.
  - Each holder agrees, holds out or bargains.
  - The chance of agreeing rises with the offer relative to the claim value, and falls with expected future value and village leadership traits.
  - Holdouts delay the whole project, so it builds up finance costs.
- **Displacement:** demolition removes beds. The displaced pops go to the housing market, which is where neighbouring urban villages fill up.
- **Money:** compensation and clearance are paid from the project's funding and recorded **once** in the ledger (fiscal-and-macro §5).

---

## 7. What buildings supply to the economy
| Supply | Computed as | Consumed by |
|---|---|---|
| Bed capacity | Σ completed residential and dormitory floor space ÷ m² per bed[type, era] | The housing market. It sets occupancy (occupied beds ÷ capacity); occupancy is an output and never feeds back into capacity |
| Workplaces | Σ factory, workshop, office and shop floor space ÷ m² per job[sector] | The production loop (usable floor capacity) |
| Shop space | Σ shop floor space | Consumption supply |
| Hazard | Count of combined factory–warehouse–dormitory floors (三合一), fire-lane blockage, building density | The disaster probabilities and the title reviews |

Pops are **not** assigned to individual buildings in the sim. The renderer spreads people across buildings (tracked and generated) in proportion to occupancy, for its lighting and crowds.

---

## 8. Compiling from evidence
- **Observed buildings** come from `data/evidence/observations/buildings/` (see the evidence protocol). They carry `provenance.kind = 'observed'` and keep their observation IDs.
- **Block stocks** fill the gaps. They are compiled from area totals for the date, land cover and era archetypes. Observed buildings in a block make it tracked, and the rest of that block is generated, seeded from the parcel ID, so the same compile always gives the same buildings.
- **Proposed features** in an observation (from plans) become `planned` records or nothing. They never become `completed` ones.
- **Divergence:** the start save holds the compiled state. After that, only the simulation changes buildings. The overlay draws the observations for the current date, so the player can compare their city with what really stood there.

---

## 9. The rendering contract
- **Inputs** are the tracked building record, its parcel, the street edges in front of it and the date. For untracked blocks, the inputs are the block stock, its event log and the date, and buildings and alleys are generated from `(blockId, event log)`.
- **Facade generation** is deterministic and seeded from `building.id`, taking the alteration history into account. Added floors use the materials of their own era, on top of the original floors.
- **Level of detail:**
  - masses at citywide distance;
  - kit-of-parts facades at neighbourhood distance;
  - doors, signs, street furniture and collision only within walking range.
- **Route buildings** carry `provenance.observed` with confidence ≥ the route threshold. Hand-made overrides (signs, openings) live in `data/routes/<route>/overrides/`, keyed by building ID.

---

## 10. Scale and performance targets
| Item | Target | Check |
|---|---|---|
| Tracked building records | A few thousand; at most about 2×10⁴. **Measure it** in Spike B | Memory and save size |
| Block stocks | One per built-up block; at most about 10⁵ | Save size; event-log compaction |
| Sim road edges | About 10⁴ (alleys are generated, except on routes) | Load time |
| Monthly building update | Only tracked buildings with pending stages or alterations, plus the blocks the allocator touches | Under 50 ms per month in the worker |
| Worker → UI messages | Changed blocks and buildings only, never the whole store | Under 1 MB per turn |
| Recomputing cell summaries | Only dirty cells | — |

---

## 11. Invariants and tests
- **IDs are stable:** a building ID never changes or comes back once it has been used.
- **Supply is honest:** only completed floor space supplies capacity, and floor area ≥ 0 by use.
- **Stages move forward only,** except `under_construction` ⇄ `stalled`. `demolished` is final for that ID (rebuilding gets a new ID).
- **Capacity ignores occupancy:** a newly completed, empty building supplies its full bed capacity.
- **Promotion conserves floor space:** after promotion, the tracked records add up exactly to the block stock they replace.
- **Same seed, same buildings:** generating an untracked block twice gives identical buildings.
- **Summaries match:** the cell and area summaries equal the sum of their tracked buildings and block stocks, after every month.
- **Compensation is posted once:** for every completed redevelopment, there is exactly one ledger entry per claim.
- **The compile is deterministic:** the same observations and the same seed give an identical start save.
- **The route holds still:** a route building's ID and massing survive a full headless run when nothing in the sim touches it.

## 12. Calibration targets
| Target | Value | Status |
|---|---|---|
| End-2009 residential floor space per resident | 27 m² | sourced [V19] |
| End-2009 home-ownership rate, residents | 40% | sourced [V19] |
| End-2010 total housing floor space / units | 4.09亿 m² / about 810万 units | sourced [V19] |
| End-2010 commodity housing | 1.02亿 m² / about 110万 units | sourced [V19] |
| End-2010 affordable housing | about 0.27亿 m² / about 27万 units | sourced [V19] |
| Completion of the affordable housing arranged in 2006–10, by end-2010 | 12% of 169,018 units | sourced [V3] |
| Built-up area by year (1985–2009) | from GAIA, 30 m | dataset at `lead` (confirm the licence) [V17] |

## 13. Phase 1 subset
- **Block stocks** for the 8–12 slice areas, plus a handful of tracked landmarks. No promotion yet.
- **Builders:** village households, the city and Hong Kong investors.
- **Pipeline:** the stages, including `stalled`, with add-floor events.
- **Legality:** the states, with a single enforcement level.
- **Not yet:** block assembly and developers (they arrive in Phase 4).
- **Rendering:** none (2D only), but the records must already carry everything §9 needs.

### 13.1 Map-first Phase 1 spatial layers

| Layer | Authority and unit |
|---|---|
| Starting anchors (R1) | Read-only slice content, keyed by site ID, on the same `[x,y]` hectare grid as area runs. `town` and `village` identify settlements, `tracked_building` identifies a named landmark, other placed `land_use` is landscape. Sungang's village-and-farmland point marks a settlement without assigning all its land to housing. A point alone supplies no floor area, jobs, capacity or road edges. No new building serialization. |
| Physical state (R1–R3 target) | Sparse road/bridge cells and placed structure footprints; structures own utility capacity or facility places. Zone ID/use references its cells; each worked cell owns its stage and remaining municipal work. Completed, occupied and under-construction floor are block stocks. Existing village/town stock is not a player zone. Allocate the existing area totals when refining stock: do not count them twice. Save changes to plans, networks, works and stock. |
| Derived network and cell views | Four-neighbour road components, access from frontage through a bounded contiguous zone, reachable sources, allocated supply share, facility coverage and land value. Reach means a path exists; supply means connected capacity was allocated against demand. Recompute on topology, works, occupancy or capacity changes; caches and render geometry are never save authorities. |

**Network preview (R1).** `start_network.yaml` holds `max_frontage_depth` (including the first cell touching a road as depth 1) and `routes: [{site, placement: temporary, waypoints: [[x,y], …]}]`. Expand orthogonal segments to ordered, four-connected cells. Roads form components named by their lowest cell index; rails do not join them. Measure depth into each individual zone from its nearest frontage, breaking tied distances by lowest component ID. A road cell is transport land, not zone interior. This is a planning preview, not a declaration that works have finished.

For each utility independently, a placed source attaches at a road cell, and a consumer draws at a serviced cell with a frontage assignment. Pool integer capacity per road component and split it proportionally to demands, with remainder ties by cell index. A road connection can thus have zero supply. Until placed sources/loads exist, exercise allocation in headless fixtures; leave the M-series area ledger authoritative for monthly ticks. Start geometry and derived previews do not change save headers or golden hashes. Before any spatial input changes tick outcomes, include its content hash in saves/replays and version mutable state changes.

**Persistent records (R1).** Two sparse records join `GameState` (`packages/sim-core/src/works.ts`). Both start empty, so a new game and every M-series golden run are unchanged. Save version 2 adds them; the 1 → 2 migration defaults them to empty.

```ts
interface CellWork {          // GameState.cellWorks: one per committed cell, sorted by cell
  cell: number;               // y · width + x
  zone: number;               // the zone it was committed under, kept as a record if that zone is later edited or removed
  workTotal: number;          // integer work units, fixed at commit (≥ 1)
  workDone: number;           // sunk work, 0 ≤ workDone ≤ workTotal; never refunded or reset
  stage: 'planned' | 'servicing' | 'serviced';   // workDone = 0 | 0 < workDone < workTotal | workDone = workTotal
}
interface PlacedStructure {   // GameState.structures, id order; ids from GameState.nextStructureId, never reused
  id: number;
  kind: 'water_source' | 'power_source' | 'facility';
  cell: number;               // its one-cell footprint in R1, on a playable area
  attach: number;             // the road cell it connects at: its footprint or a four-neighbour of it
  capacity: number;           // integer ≥ 0: m³/day (water), kW (power) or places (facility)
  facility?: string;          // facility type key, facility only
  placed: YM;
}
```

- **Units, not yuan.** Work is counted in integer work units. The caller sets units per cell and units per month. R2 sets both from crews and cost params; R1 names no rate. Spending money on works is R2's job, and it goes through the ledger.
- **One authority for "serviced".** `servicedLand` stays the set of serviced cells that the M-series tick reads. When a work reaches `serviced`, its cell joins `servicedLand` in the same call. So every serviced work cell is in `servicedLand`, and this is tested. M4's site-preparation projects still add whole zones at completion, without works records.
- **Commit.** Commit takes the cells of one current zone that have no work and are not yet in `servicedLand`. Each new record starts at `planned`.
- **Advance.** Work units go to unfinished works with road reach, in this order: frontage depth (shallower first), then cell index. Each work is filled before the next one starts, so the first cell can finish while its neighbours wait. A work without reach (a removed zone, deeper than `max_frontage_depth`, or a severed road) keeps its stage and sunk work and takes no units. Units left over when nothing can take them are returned unused. R2 adds the queue's priority and pause and its order ahead of cell index, and it adds cancellation. The overlap with M4 is settled in §13.2: site preparation leaves out every cell that has works, so no project can service a cell whose work is unfinished.
- **Placement.** The footprint must lie on a playable area and the attach cell must be the footprint or one of its neighbours. Whether the attach cell is a road is checked only when supply is derived. A source whose road was severed keeps its record and supplies nothing. R2 adds terrain checks and footprints larger than one cell.
- **Not in the tick.** No action and no tick step reads or writes these records in R1. `step` and `cloneState` carry them unchanged, and saves round-trip them. R2's placement actions are the first writers in play, and the action log replays them like any other action.

**Derived views (R1).** `spatialViews(state, network, { roads?, demand? })` is one pure function of loaded state, the compiled `StartNetwork`, any extra road cells the caller supplies (`roads`; R2: built roads) and any demand. It never reads a cache.
- `roads`: the components over the start network's road cells, the built `roads` (R2) and the caller's extra roads (rails excluded).
- `frontage`: reach into each current zone from its nearest road frontage, up to `max_frontage_depth`.
- `sources`: integer capacity per utility, summed at each attach cell.
- `supply`: per utility, `allocateUtility` over caller-supplied demand (R3 derives it from occupancy). Only `serviced` cells can draw; any other cell that has demand gets 0.

The views are never saved. After save and load they must be identical, and they are rebuilt again after any change to topology, works, zones or structures.

### 13.2 Municipal works orders (R2)

The player's map edits become **works orders** in one queue (`packages/sim-core/src/works.ts`). An order is paid as its work is done, from the same accounts and crew pool as M4's projects (phase1-slice §5.6). Committing an order reserves nothing and pays nothing. Its unspent budget counts in `unspentCommitments`, so the project-loan offer sees it. A works commit that leaves `moneyForProjects` below zero sets `loanWanted`, as `commit_project` does, and a cancel that brings it back to zero or above clears the flag. M4's site preparation, for its part, leaves out every cell that has works.

```ts
interface WorksOrder {        // GameState.worksOrders, id order; ids from GameState.nextOrderId, never reused
  id: number;
  kind: 'service' | 'road' | 'structure';
  priority: Priority;         // phase1-slice §5.6's 'high' | 'normal' | 'low'
  paused: boolean;
  committed: YM; completed?: YM;
  stage: 'queued' | 'working' | 'done' | 'cancelled';
  waiting?: 'paused' | 'capacity' | 'finance' | 'access' | 'frozen';   // this month's reason it got less than its pace
  rateFactor?: number;                     // service, R8b (phase1-slice §5.3): the zone tier's cost ÷ work, times the yuan per unit; absent = 1
  unitsTotal: number; unitsDone: number;   // integer work units; unitsTotal shrinks only when cells are cancelled
  budget: number; spent: number;           // yuan; spent is sunk, budget − spent the commitment
  zone?: number;                           // service: its cells are the CellWork records with this order id
  path?: { cell: number; units: number; bridge: boolean }[];   // road: build order, nearest the network first
  placement?: StructurePlacement;          // structure: becomes a PlacedStructure when done
}
// CellWork gains `order?: number` (absent: committed outside the queue, as in R1's fixtures).
// GameState gains `roads: number[]`: built road cells, sorted. Start-network roads stay content.
```

**Actions.** Turn actions, validated when applied, logged and replayed like any other. They need the fiscal content and the compiled start network in the tick content. Without either, they are refused.

| Action | Validates | Creates |
|---|---|---|
| `commit_works { zone, cells?, priority? }` | The zone exists. The cells (all of the zone's eligible cells when absent) are in it, are on the buildable layer (as M4's site preparation: an unbuildable cell adds no capacity), are outside `servicedLand` and outside every live site-preparation project, and have no works or only detached works (below). | A `service` order and one `planned` CellWork per new cell. A detached work is adopted: it keeps its sunk work, and the order takes on only its remaining units. |
| `build_road { path, priority? }` | `path` holds orthogonal `[x,y]` waypoints, expanded like `start_network.yaml`. Cells that are already a road (start, built or in a live road order's path) are stripped anywhere along the path, not refused (R7), so a drag may start on a road, run along one or cross one. Every remaining cell is on a playable area and is not a structure footprint or a cell with works; the path does not cross itself. What remains is one or more segments, each a run of new cells; each segment's first or last cell touches a road or a live road order's path. (R8d, phase1-slice §5.12: `class?` picks the tier, and a built or start road of a lower class is upgraded rather than stripped.) When only its last does, the segment is reversed (R4.5), so it is always built from the network outward and a player can draw a road in either direction. Nothing remaining is refused with "that drag adds no new road". | One `road` order per segment, in drag order. A cell outside the buildable layer is a bridge. |
| `place_structure { kind, cell: [x,y], attach: [x,y], facility?, priority? }` | As `placeStructure` (§13.1). The footprint is not a road, nor another structure's or a live order's footprint. A facility names a type in params. | A `structure` order. Its params give its units, budget, capacity and any forex, which is drawn at commit as for a project. |
| `cancel_works { order, cells? }` | The order is live. | Removes its unstarted cells (all of them when `cells` is absent): their works, path cells or structure, and their units and budget. Started cells and sunk spending stay. An order left with nothing to do is `cancelled`, or `done` if its remaining work is finished. No penalty: nothing was contracted. A road path has no holes, so cancelling an unstarted path cell cancels the rest of the path beyond it. A started structure has nothing to cancel. Cancelling an unstarted structure returns the forex quota it drew at commit. |
| `set_works_paused { order, paused }` | The order is live. | A paused order takes no crew and no money. |
| `set_works_priority { order, priority }` | The order is live. | |

**Zone edits.** The construction step follows zone actions through `TickStep.afterAction`, which runs after every applied turn action. When an edit or removal takes a cell out of its work's zone, unstarted work on that cell is cancelled as above. Started work is **detached**: the CellWork keeps its sunk work and loses its `order`, and the order gives up that cell's remaining units and their budget. A later `commit_works` covering the cell adopts it. Any order with nothing left to do closes: `done` if it did some work, `cancelled` if not. So no order holds a commitment it can never spend.

**Monthly work (tick step 4).** The derived views are computed once at the start of the month's allocation, so a road cell finished this month gives reach from next month. Live, unpaused orders join `allocatePool`'s single queue as a third job type, after firm cohorts and projects with the same priority and start month.
- Each order wants up to `works.crew_per_order` units a month, no more than it can use. A service order can use units only on works with road reach; a road order, on its path; a structure, when its attach cell is a road or the footprint has reach.
- It is paid like a project. The cost of `k` units is `round(budget × (unitsDone + k) ÷ unitsTotal) − spent`. Payment comes from debt, then land, then general above the reserve floor, and it is posted as `project` with ref `works.<id>`. A fall from grace freezes orders as it freezes projects.
- A service order pours its units into its own cells, using `advanceCellWorks`' order. A road order builds its path in order, and each finished cell joins `roads` at once. A structure order becomes a `PlacedStructure` when its units are done.
- **A finished facility feeds its area (R4.5).** When a `facility` order's structure is placed, its capacity joins the area stock its type names, in the area of its footprint, as M4's school project does (phase1-slice §5.6). A `school` adds its capacity to `area.facilities.schoolPlaces`. From the next month it owes a payroll obligation of `staff × the state wage` (indexed to wages) and a service obligation of `capacity × service_per_place_month`, each only when above zero. Its maintenance is the done order's, as for every order (phase1-slice §5.11), so it is not added twice.
- Units an order cannot use pass down the queue.

**Credit in the M-series systems (R4.5).** Map works count where M4's projects count:
- readiness (phase1-slice §5.7) adds built road cells to each area's road km and placed sources to its spare capacity; serviced cells already join `servicedLand`;
- the annual review's `projects_completed` counts done orders (phase1-slice §5.8);
- the `site_preparation_committed` milestone holds for a live or done `service` order (phase1-slice §5.8).

**Preview.** `previewWorks(state, works, actions, apply)` applies the actions to a clone through `apply` (the turn-action path, `applyTurnAction` with the tick steps), so they go through the same validation, and reads off the orders they would create: cells, bridges, units, budget, forex, the most crew a month can take, and the months the work needs at full pace. The state is untouched, so showing a guide (a precedent's template) or previewing its cost spends nothing. A refused action comes back as its reason instead of an estimate.

**Params** (`params/slice.yaml` `works`): placeholders taken from the M4 templates' rates (phase1-slice §5.6), not sourced.
- `crew_per_order`;
- `service` and `road`: `units_per_cell` and `yuan_per_cell`;
- `bridge`: four times a road cell, a guess. Road and bridge must cost the same per unit (`validateParams` checks this), so the cost formula stays exact after a cancel;
- `structures.water_source` and `structures.power_source`: `units`, `yuan`, `capacity` and optional `forex_usd`;
- `facilities.<type>`: the same fields, plus optional `staff` and `service_per_place_month` (R4.5; from `project.school`'s). The type must be one whose area stock exists: only `school` in Phase 1 (`validateParams` refuses others).

**Not yet:**
- staffing obligations on finished works other than facilities. R4 adds their maintenance: a done order owes `spent × works.maint_rate_year ÷ 12` a month (phase1-slice §5.11);
- placed sources raising `area.utilities`, and built roads raising `area.roadKm` itself. Readiness counts both (above), and from R4 placed sources' supply reaches the firms' utility share through `spatialViews` (phase1-slice §5.11), not through the ledger, so neither is counted twice;
- footprints larger than one cell;
- removing a built road.

**Saves.** Version 3 adds `roads`, `worksOrders` and `nextOrderId`, and its migration defaults them to empty. Because spatial input now changes outcomes, the header's content gains `network_sha256` (`start_network.yaml`).

### 13.3 Organic growth (R3)

On serviced land that a road reaches, ordinary builders answer demand each month with no decision card (phase1-slice §1.1, "Occupy"). Three of them build on the player's zones; village households build on their own plots. **None is paid from the city's ledger.** Their crews come from the construction pool (phase1-slice §5.6) at `growth.pool_priority`, behind the city's work of a higher priority. Village self-build never draws on the pool, as in M2. The pass runs in tick step 4, after the month's cohort work and the village rental starts. It runs only when the tick content has `params.growth` and the compiled start network; without them, nothing in this section happens, so M2's no-content fixtures run as before.

**Developable land.** A zone's developable cells are its buildable cells (every cell, without the layer) that are in `servicedLand` and in `spatialViews(…).frontage`. The views are computed once, at the start of the pass. A zone's **room** is its developable cells × 10,000 m² × `growth.far[use]`, less the floor of the firms sited in it and of the organic cohorts that name it, in every stage. A zone with no developable cell takes nothing, so a zone serviced by M4's site preparation but out of a road's reach stays empty. Card siting is unchanged (phase1-slice §5.5's `zoneCapacityM2`), except that a zone's used floor now counts the organic cohorts that name it.

| Zone use | Builder | Demand | What it builds |
|---|---|---|---|
| industrial | small Hong Kong processing firms, which own and occupy their premises | orders and policy | a `Firm` with `origin: 'organic'`, through `createFirm` |
| commercial | private builders, who let shops | worker spending | `shop_market` cohorts, builder `private` |
| residential | work units (单位 danwei), for their staff and contract workers | rental pressure in the area | `dormitory` cohorts, builder `work_unit` |
| (village plots) | village households | worker spending in the area | `shop_market` cohorts, builder `village_household`: informal shops |

**Industrial.** Each month `growth.industrial.floor_m2_per_month` × `industry.order_index` × the order factor (phase1-slice §5.8) × `growth.industrial.regime_factor[regime]` m² of demand is added to `growth.carry`. The regime is `fiscal.regime`; one missing from the factors takes `default`. So the policy that favours firms is the regime the SEZ event switches to, never a date. While the carry covers one firm's floor, a firm is created in an industrial zone that has room for its floor and dormitory and whose area could still supply it: the area's utility share, with every firm sited there open and this one too, must be at least `growth.industrial.min_utility_share` (`prospectiveShare`). The firm has `growth.industrial.firm_jobs` jobs, of ownership `growth.industrial.ownership` and archetype `growth.industrial.archetype`: an id of its own, never an investor card's, whose build months, ramp and dormitory beds are `growth.industrial.firm`. It goes in the zone with the most room (ties: the lower id), and its floor is taken off the carry. When no zone fits, the carry is capped at one firm's floor: demand that finds no land is not banked. From then on the firm is like any other (phase1-slice §5.5–§5.7). Its factory and dormitory are built, and it opens when its factory completes. Its posts, utility share, output, taxes, tax holiday and land fee follow the usual rules, and its floor is occupied once it opens. Its cohorts draw on the pool at `growth.pool_priority`. **R9 backlog brake** (revision plan §4.5): a zone whose floor under construction (its firms' unfinished factory and dormitory cohorts) is above `growth.industrial.max_backlog_m2` (a placeholder, 40,000 m²: 15,000 held the aggressive run below its power and freight limits) takes no new organic firm. So capacity shows as no new starts in that zone, which the I/C/R cue reads as "backlog", not as an invisible queue. Investor cards are not braked: accepting one is the player's choice.

**Worker spending.** For each playable area a, spending is computed from last month's matching (the state before tick step 5):
```
spend[a]   = Σ groups living in a, Σ sectors but services: employed × wage[sector] × growth.spend_share
ref        = Σ base jobs outside services: jobs × wage_start[sector] × growth.spend_share
induced    = floor(max(0, Σₐ spend[a] − ref) ÷ growth.services.spend_per_job_month)   // service jobs the new spending supports
induced[a] = induced split over the playable areas by spend[a] (largest remainder)
```
At the start every base job is filled at its starting wage, so `induced` is 0 and the start stays at rest. From R4, service wages are left out of the spending (the basic-sector rule): service jobs are posted from spending (phase1-slice §5.11), so counting their own wages would close a loop whose gain grows with the service wage. A share `growth.services.formal_share` of the induced jobs wants formal shop floor; the rest is informal, in the town and the villages. R4 posts these jobs (phase1-slice §5.11). In R3 they only drive building.

**Commercial.** The target is Σₐ induced[a] × `formal_share` × `growth.services.m2_per_job` m² over the slice, since shoppers cross areas. The stock is the private shop floor, completed and under construction. Each month's starts are `floor(min(max(0, target − stock) × growth.response, room))`, where room is that of all commercial zones together. They are split over those zones by their room (largest remainder, ties to the lower id), one cohort per zone. **Occupancy is derived, never stored:** completed private shop floor is occupied up to the target, zone by zone in id order.

**Residential.** For each area with a residential zone that has room, when its rental crowding is at least `growth.residential.min_crowding`:
- unmet = rental occupants − rental beds − beds under construction in every rental archetype;
- starts = `floor(min(unmet × m2_per_bed.dormitory × growth.response, room))`;
- they are split over that area's residential zones by room.

The village rule (phase1-slice §5.2) now also counts dormitory beds under construction in its unmet beds, so two builders do not both answer the same shortfall. Flats wait for local housing pressure, which M2 reports but does not enforce.

**Village shops.** In each area with village plots and villagers:
- target = induced[a] × (1 − `formal_share`) × `growth.village_shops.m2_per_job`;
- the stock is the village shop floor, completed and under construction;
- starts = `floor(min(max(0, target − stock) × growth.response, plot room))`, where plot room is the footprint × max floors less the village floor, as for rental floors.

Legality and enforcement are as in M2: floor up to `legal_floors` is permitted, and floor above it is `unpermitted_tolerated`. **Village floor** now means the village archetypes plus any cohort built by `village_household`. That one definition gives the footprint cap, `illegalFloorShare` and `villageM2`. Shops take `village_build.duration_months` and no pool crew.

**Records.**
```ts
// Cohort (phase1-slice §5.2, §5.5) gains:
builder?: 'private' | 'work_unit' | 'village_household';   // an organic cohort's builder; absent: BUILDER_OF[archetype]
zone?: number;              // the zone an organic cohort was built in; kept if that zone is later edited or removed
// Firm (§5.5) gains:
origin?: 'organic';         // built with no card (R3); absent: an investor card or an event's offer
// GameState gains:
growth: { carry: number };  // m² of industrial demand banked toward the next organic firm
```
Completed cohorts merge only when their builder and zone match too. A block event names the cohort's builder. **Save version 4** adds `growth`; the 3 → 4 migration sets the carry to 0. The new cohort and firm fields are optional, so they need no migration.

**Costs are the builder's.** A cohort's value of work is its m² × `construction.cost_per_m2[archetype]` (village floor at `village_build.build_cost_per_m2`) ÷ its months. It is the builder's money: nothing is posted to the city's ledger. Each month's `work` event names its builder, and GDP's construction value counts it, as before.

**Investor cards.** The routine archetypes' `rate_per_quarter` values are cut to rarer, exceptional deals (params, placeholders). The guaranteed first contract, the first wave, the co-financing offer and every other event offer call `raiseOffer` directly, so they are unchanged.

**Not in R3:**
- commercial tenants, informal shops and active works post no jobs yet (R4, phase1-slice §5.11);
- placed sources supply no firm (R4);
- flats; developers; block assembly.

**R3's tests** (`test/growth.test.ts`):
- **An isolated zone against connected land.** Two serviced industrial zones, one fronting the temporary Guangshen road and one with no road in reach, under a favourable regime and with no investor content. Only the connected zone gains organic firms and floor.
- **Policy.** The same land under the county regime builds less than under the SEZ's regime.
- **Floor occupied with no cards.** Organic firms open and post jobs with no investor content.
- **Utilities.** No organic firm builds where its area's prospective utility share would fall below `min_utility_share`.
- **A pressured village against a quiet one.** With crowding and rent above the build test in one area only, only that area adds rental floor. Raised spending adds village shops, legal and tolerated, within the footprint cap.
- **The builder pays.** Private building posts nothing to the ledger. A city project of normal priority takes the pool ahead of an organic cohort.
- **At rest.** With no zones, 63 months build nothing organic.
- **Saves.** Save, load and continue matches an uninterrupted run, and a version 3 save loads.

## 14. Open questions
- How large the tracked tier needs to be, and whether block stocks are fine-grained enough for postcards (measured in Spike B).
- How to source m² per bed for dormitories and urban-village rentals by era.
- Which historical instruments to model by name for legalising informal buildings and compensating for them. All are `lead` for now.
