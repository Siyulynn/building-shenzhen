/**
 * Persistent cell works and placed structures, and the spatial views derived from loaded state
 * (buildings-and-construction §13.1, R1). No action or tick step calls these in R1: they are the records and helpers
 * that R2's placement actions and crews will drive. Work is in integer units; money stays in the ledger (R2).
 */
import { addServicedLand } from './fiscal.js';
import { allocateUtility, roadNetwork, zoneFrontage, type Frontage, type RoadNetwork } from './network.js';
import type { Priority } from './fiscal.js';
import type { RoadClass } from './params.js';
import type { StartNetwork } from './sites.js';
import type { GameState } from './state.js';
import type { YM } from './ym.js';
import { cellsOfRuns, runsOfCells } from './zones.js';

export const WORK_STAGES = ['planned', 'servicing', 'serviced'] as const;
export type WorkStage = (typeof WORK_STAGES)[number];
export interface CellWork {
  cell: number;               // y · width + x
  zone: number;               // the zone it was committed under; kept if that zone is later edited or removed
  workTotal: number;          // integer work units, fixed at commit (≥ 1)
  workDone: number;           // sunk work, 0 ≤ workDone ≤ workTotal; never refunded or reset
  stage: WorkStage;
  order?: number;             // R2: the live works order that owns it; absent = detached, or committed outside the queue
}

export const STRUCTURE_KINDS = ['water_source', 'power_source', 'facility', 'power_substation', 'power_station'] as const;
export type StructureKind = (typeof STRUCTURE_KINDS)[number];
/**
 * The kinds a player or plan may order (R8c, phase1-slice §5.5): substations distribute the city pool, stations add to
 * it. Water and the one-quarter power source stay in STRUCTURE_KINDS so old saves load, but are not offered.
 */
export const OFFERED_STRUCTURES: readonly StructureKind[] = ['power_substation', 'power_station', 'facility'];
export interface PlacedStructure {
  id: number;
  kind: StructureKind;
  cell: number;               // one-cell footprint in R1, on a playable area
  attach: number;             // the road cell it connects at: its footprint or a four-neighbour of it
  capacity: number;           // integer ≥ 0: m³/day (water), kW (power) or places (facility)
  facility?: string;          // facility type key, facility only
  placed: YM;
}

export const ORDER_KINDS = ['service', 'road', 'structure'] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];
/** R8d (§5.12): `class` is the cell's class when done (absent: street); `upgrade` marks a road cell raised to it. */
export interface PathCell { cell: number; units: number; bridge: boolean; class?: RoadClass; upgrade?: boolean }
/** A municipal works order (b&c §13.2). */
export interface WorksOrder {
  id: number;
  kind: OrderKind;
  priority: Priority;
  paused: boolean;
  committed: YM; completed?: YM;
  stage: 'queued' | 'working' | 'done' | 'cancelled';
  waiting?: 'paused' | 'capacity' | 'finance' | 'access' | 'frozen';   // this month's reason it got less than its pace
  unitsTotal: number; unitsDone: number;   // integer work units; unitsTotal shrinks only when cells are cancelled or detached
  budget: number; spent: number;           // yuan; spent is sunk, budget − spent the commitment
  zone?: number;                           // service
  rateFactor?: number;                     // service, R8b (§5.3): its tier's cost ÷ work, times the yuan per unit; absent = 1
  path?: PathCell[];                       // road: build order, nearest the network first
  placement?: StructurePlacement;          // structure
  cofinanced?: true;                       // R9 (§5.8): an investor pays: rate 0, no forex, no maintenance
  pace?: Exclude<WorksPace, 'normal'>;     // R9 (§5.6): absent = normal
  paceBase?: { units: number; spent: number };   // R9: units done and spent when the pace last changed; later units at its rate
  crew?: number;                           // R11.2 (§5.6): this order's monthly crew allocation; absent = works.crew_per_order
}
/** R9 (§5.6): a works order's pace, the money-for-time lever. */
export const WORKS_PACES = ['normal', 'push', 'all_out'] as const;
export type WorksPace = (typeof WORKS_PACES)[number];
export const liveOrder = (o: WorksOrder) => o.stage === 'queued' || o.stage === 'working';
export const cloneOrder = (o: WorksOrder): WorksOrder => ({ ...o,
  ...(o.path ? { path: o.path.map((c) => ({ ...c })) } : {}), ...(o.placement ? { placement: { ...o.placement } } : {}),
  ...(o.paceBase ? { paceBase: { ...o.paceBase } } : {}) });

export const UTILITIES = ['water', 'power'] as const;
export type Utility = (typeof UTILITIES)[number];
/** The utilities that constrain firms in Phase 1 (R8c): power only. Water stays in the schema for a later phase. */
export const ACTIVE_UTILITIES: readonly Utility[] = ['power'];
/** The structures that distribute a utility along the roads; a placed R2 power_source counts as a substation. */
export const SOURCE_KINDS: Record<Utility, readonly StructureKind[]> = { water: ['water_source'], power: ['power_source', 'power_substation'] };

export const stageOf = (w: Pick<CellWork, 'workDone' | 'workTotal'>): WorkStage =>
  w.workDone === 0 ? 'planned' : w.workDone < w.workTotal ? 'servicing' : 'serviced';

const isCount = (n: unknown, min: number): n is number => Number.isSafeInteger(n) && (n as number) >= min;

function onGrid(s: GameState, cell: number): boolean {
  return Number.isSafeInteger(cell) && cell >= 0 && cell < s.grid.width * s.grid.height;
}

/** Binary search: an area's cells are sorted. */
function inSorted(sorted: Uint32Array, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, x = sorted[m]!;
    if (x === v) return true;
    if (x < v) lo = m + 1; else hi = m - 1;
  }
  return false;
}

/** Commit cells of one current zone to works, each at `planned`. Throws on a cell outside the zone, already
 * committed or already serviced, so a refused commit changes nothing. */
export function commitCellWorks(s: GameState, zoneId: number, cells: readonly number[], workPerCell: number): CellWork[] {
  if (!isCount(workPerCell, 1)) throw new Error(`invalid work per cell: ${workPerCell}`);
  const z = s.zones.find((q) => q.id === zoneId);
  if (!z) throw new Error(`no zone ${zoneId}`);
  const inZone = new Set(cellsOfRuns(z.runs, s.grid));
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  const taken = new Set(s.cellWorks.map((w) => w.cell));
  const fresh = [...new Set(cells)].sort((a, b) => a - b);
  for (const c of fresh) {
    if (!inZone.has(c)) throw new Error(`cell ${c} is not in zone ${zoneId}`);
    if (taken.has(c)) throw new Error(`cell ${c} already has works`);
    if (served.has(c)) throw new Error(`cell ${c} is already serviced`);
  }
  const added = fresh.map((cell): CellWork => ({ cell, zone: zoneId, workTotal: workPerCell, workDone: 0, stage: 'planned' }));
  s.cellWorks = [...s.cellWorks, ...added].sort((a, b) => a.cell - b.cell);
  return added;
}

/**
 * Pour `units` of work into unfinished works that have road reach: shallower frontage first, then cell index, each
 * filled before the next starts. A cell that finishes joins servicedLand in the same call. Returns the units nobody
 * could take. `frontage` is spatialViews(…).frontage for this state.
 */
export function advanceCellWorks(s: GameState, units: number, frontage: ReadonlyMap<number, Frontage>,
  only: (w: CellWork) => boolean = () => true): number {
  if (!isCount(units, 0)) throw new Error(`invalid work units: ${units}`);
  const order = s.cellWorks.filter((w) => w.stage !== 'serviced' && frontage.has(w.cell) && only(w))
    .sort((a, b) => frontage.get(a.cell)!.depth - frontage.get(b.cell)!.depth || a.cell - b.cell);
  const finished: number[] = [];
  for (const w of order) {
    if (units === 0) break;
    const take = Math.min(units, w.workTotal - w.workDone);
    w.workDone += take; units -= take;
    w.stage = stageOf(w);
    if (w.stage === 'serviced') finished.push(w.cell);
  }
  if (finished.length) addServicedLand(s, runsOfCells(finished.sort((a, b) => a - b), s.grid.width));
  return units;
}

export interface StructurePlacement { kind: StructureKind; cell: number; attach: number; capacity: number; facility?: string }

/** Record a placed source or facility. The attach cell's road is checked only when supply is derived. */
/** placeStructure's checks alone: throws on a bad placement, changes nothing. */
export function checkPlacement(s: GameState, p: StructurePlacement): void {
  if (!(STRUCTURE_KINDS as readonly string[]).includes(p.kind)) throw new Error(`unknown structure kind ${p.kind}`);
  if (!onGrid(s, p.cell) || !onGrid(s, p.attach)) throw new Error('structure cell off the grid');
  if (!s.areas.some((a) => a.access === 'playable' && inSorted(a.cells, p.cell))) throw new Error(`cell ${p.cell} is not playable land`);
  const w = s.grid.width, d = p.attach - p.cell;
  const adjacent = d === 0 || d === w || d === -w || (Math.abs(d) === 1 && Math.floor(p.attach / w) === Math.floor(p.cell / w));
  if (!adjacent) throw new Error(`attach cell ${p.attach} does not touch cell ${p.cell}`);
  if (!isCount(p.capacity, 0)) throw new Error(`invalid capacity: ${p.capacity}`);
  if ((p.kind === 'facility') !== (typeof p.facility === 'string' && p.facility.length > 0)) {
    throw new Error('a facility, and only a facility, names its facility type');
  }
}

export function placeStructure(s: GameState, p: StructurePlacement): PlacedStructure {
  checkPlacement(s, p);
  const x: PlacedStructure = { id: s.nextStructureId++, kind: p.kind, cell: p.cell, attach: p.attach, capacity: p.capacity,
    ...(p.kind === 'facility' ? { facility: p.facility } : {}), placed: s.date };
  s.structures = [...s.structures, x];
  return x;
}

export interface SpatialViews {
  roads: RoadNetwork;
  frontage: Map<number, Frontage>;              // every reached cell of every current zone
  sources: Record<Utility, Map<number, number>>;   // attach cell → summed capacity, by cell
  supply: Record<Utility, Map<number, number>>;    // demand cell → allocated supply, by cell
}
export interface SpatialInputs {
  roads?: Iterable<number>;                     // extra road cells beside the start network's and the built ones
  demand?: Partial<Record<Utility, ReadonlyMap<number, number>>>;   // per consumer cell (R3: from occupancy)
}

const sortedMap = (m: Map<number, number>) => new Map([...m].sort((a, b) => a[0] - b[0]));

/** The derived views (§13.1), from loaded state and content alone. Never saved; equal for equal inputs. */
export function spatialViews(s: GameState, network: StartNetwork, inputs: SpatialInputs = {}): SpatialViews {
  const roadCells = network.routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells);
  const roads = roadNetwork(s.grid, [...roadCells, ...s.roads, ...(inputs.roads ?? [])]);
  const frontage = new Map<number, Frontage>();
  for (const z of s.zones) {
    for (const [c, f] of zoneFrontage(roads, cellsOfRuns(z.runs, s.grid), network.maxFrontageDepth)) if (!frontage.has(c)) frontage.set(c, f);
  }
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  const sources = {} as SpatialViews['sources'], supply = {} as SpatialViews['supply'];
  for (const u of UTILITIES) {
    const cap = new Map<number, number>();
    for (const x of s.structures) if (SOURCE_KINDS[u].includes(x.kind)) cap.set(x.attach, (cap.get(x.attach) ?? 0) + x.capacity);
    sources[u] = sortedMap(cap);
    const demand = inputs.demand?.[u] ?? new Map<number, number>();
    for (const [c, n] of demand) if (!onGrid(s, c) || !isCount(n, 0)) throw new Error(`invalid ${u} demand at ${c}`);
    const out = allocateUtility(roads, frontage, cap, new Map([...demand].filter(([c]) => served.has(c))));
    for (const c of demand.keys()) if (!out.has(c)) out.set(c, 0);
    supply[u] = sortedMap(out);
  }
  return { roads, frontage: new Map([...frontage].sort((a, b) => a[0] - b[0])), sources, supply };
}
