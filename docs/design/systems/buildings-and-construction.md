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
  cohorts: { era: number; use: FloorUse; stage: Stage; legality: Legality; m2: number }[];
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

## 14. Open questions
- How large the tracked tier needs to be, and whether block stocks are fine-grained enough for postcards (measured in Spike B).
- How to source m² per bed for dormitories and urban-village rentals by era.
- Which historical instruments to model by name for legalising informal buildings and compensating for them. All are `lead` for now.
