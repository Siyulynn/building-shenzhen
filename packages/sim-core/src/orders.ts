/**
 * Municipal works orders (buildings-and-construction §13.2, R2): the six works actions, zone-edit detaching, the
 * monthly work inside the construction pool, and the preview. Orders are paid as their work is done, through the
 * ledger, at one yuan-per-unit rate per order: the cost of k more units is round(rate × (unitsDone + k)) − spent.
 */
import {
  PRIORITIES, addObligation, liveProject, moneyForProjects, payProject, post, projectFunds, type Priority,
} from './fiscal.js';
import { FACILITY_STOCK, ROAD_CLASSES, intensityOf, type CellWorksParams, type RoadClass, type SliceParams, type StructureWorksParams, type WorksParams } from './params.js';
import { roadClasses, setRoadClass, type FreightContent } from './freight.js';
import type { StartNetwork } from './sites.js';
import { cloneState, type GameState, type PlayerAction } from './state.js';
import type { SimEvent, TickStep } from './step.js';
import {
  OFFERED_STRUCTURES, advanceCellWorks, checkPlacement, liveOrder, placeStructure, spatialViews, STRUCTURE_KINDS, type CellWork, type PathCell,
  type PlacedStructure, type StructureKind, type StructurePlacement, type WorksOrder,
} from './works.js';
import { cellsOfRuns, checkHigh, type AvenueAt } from './zones.js';
import { coverFactors, landCoverAt, needsBridge, type LandCover, type LandCoverClass } from './landcover.js';

export interface WorksContent {
  params: SliceParams; works: WorksParams; network: StartNetwork; buildable?: { cells: Uint32Array };
  landcover?: LandCover;                  // R8a (§5.5): a cell's formation units and compensation, and which roads bridge
  freight?: FreightContent;               // R8d (§5.12): construction materials through the mainland gateways
}

const WORKS_ACTIONS: readonly string[] = ['commit_works', 'build_road', 'place_structure', 'cancel_works', 'set_works_paused',
  'set_works_priority'];
export const isWorksAction = (a: PlayerAction) => WORKS_ACTIONS.includes(a.type);

// ---- shared lookups ----

function inSorted(sorted: Uint32Array, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, x = sorted[m]!;
    if (x === v) return true;
    if (x < v) lo = m + 1; else hi = m - 1;
  }
  return false;
}
const playable = (s: GameState, c: number) => s.areas.some((a) => a.access === 'playable' && inSorted(a.cells, c));
const neighbours = (c: number, w: number, h: number) => {
  const out: number[] = [], x = c % w;
  if (x > 0) out.push(c - 1);
  if (x + 1 < w) out.push(c + 1);
  if (c >= w) out.push(c - w);
  if (c < w * (h - 1)) out.push(c + w);
  return out;
};

/** Road cells that exist now: the start network's and the built ones. */
function roadSet(s: GameState, net: StartNetwork): Set<number> {
  return new Set([...net.routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells), ...s.roads]);
}
const queuedPath = (s: GameState) => new Set(s.worksOrders.filter((o) => liveOrder(o) && o.path).flatMap((o) => o.path!.map((p) => p.cell)));
const footprints = (s: GameState) => new Set([...s.structures.map((x) => x.cell),
  ...s.worksOrders.filter((o) => liveOrder(o) && o.placement).map((o) => o.placement!.cell)]);

function structureParams(w: WorksParams, kind: StructureKind, facility?: string): StructureWorksParams {
  if (kind === 'facility') {
    const f = facility !== undefined ? w.facilities[facility] : undefined;
    if (!f) throw new Error(`no facility type ${facility}`);
    return f;
  }
  return w.structures[kind];
}
const cellRate = (c: CellWorksParams) => c.yuan_per_cell / c.units_per_cell;
/** The order's yuan per unit, from params by its kind (§13.2). */
function rateOf(o: WorksOrder, w: WorksParams): number {
  if (o.cofinanced) return 0;                // R9 (§5.8): an investor pays for it
  if (o.kind === 'service') return cellRate(w.service) * (o.rateFactor ?? 1);
  if (o.kind === 'road') return cellRate(w.road);
  const sp = structureParams(w, o.placement!.kind, o.placement!.facility);
  return sp.yuan / sp.units;
}
const costTo = (o: WorksOrder, w: WorksParams, units: number) => Math.round(rateOf(o, w) * units);

function findOrder(s: GameState, id: number): WorksOrder {
  const o = s.worksOrders.find((q) => q.id === id);
  if (!o) throw new Error(`no works order ${id}`);
  if (!liveOrder(o)) throw new Error(`works order ${id} is ${o.stage}`);
  return o;
}
function checkPriority(p: Priority | undefined): Priority {
  if (p !== undefined && !(PRIORITIES as readonly string[]).includes(p)) throw new Error(`unknown priority ${p}`);
  return p ?? 'normal';
}
const toCell = (s: GameState, xy: unknown): number => {
  if (!Array.isArray(xy) || xy.length !== 2 || !xy.every(Number.isSafeInteger)) throw new Error('expected an [x,y] cell');
  const [x, y] = xy as [number, number];
  if (x < 0 || y < 0 || x >= s.grid.width || y >= s.grid.height) throw new Error(`cell ${x},${y} is off the grid`);
  return y * s.grid.width + x;
};

/** Expand orthogonal [x,y] waypoints into ordered, four-connected cells, as start_network.yaml's are. */
export function expandPath(s: GameState, waypoints: unknown): number[] {
  if (!Array.isArray(waypoints) || waypoints.length < 1) throw new Error('a road path needs waypoints');
  const cells = [toCell(s, waypoints[0])];
  for (let i = 1; i < waypoints.length; i++) {
    toCell(s, waypoints[i]);
    let [x, y] = waypoints[i - 1] as [number, number];
    const [tx, ty] = waypoints[i] as [number, number];
    const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
    if ((dx === 0) === (dy === 0)) throw new Error('road waypoints must be distinct and orthogonal');
    while (x !== tx || y !== ty) { x += dx; y += dy; cells.push(y * s.grid.width + x); }
  }
  return cells;
}

// ---- closing, detaching and the loan flag ----

/** Close an order with nothing left to do: done if it worked, cancelled if not. */
function settle(s: GameState, o: WorksOrder, w: WorksParams): void {
  if (o.unitsDone < o.unitsTotal) return;
  o.stage = o.unitsDone > 0 ? 'done' : 'cancelled';
  delete o.waiting;
  if (o.stage !== 'done') return;
  o.completed = s.date;
  // R4 (phase1-slice §5.11): finished works owe maintenance on what they cost, from the next month
  const maint = (o.spent * w.maint_rate_year) / 12;
  if (Math.round(maint) > 0) addObligation(s, { kind: 'maintenance', perMonth: maint, index: 'none', from: s.date + 1,
    createdBy: `works.${o.id}` });
}
/** Take `units` of unstarted or remaining work off an order, with their budget. */
function shrink(s: GameState, o: WorksOrder, w: WorksParams, units: number): void {
  o.unitsTotal -= units;
  o.budget = costTo(o, w, o.unitsTotal);
  settle(s, o, w);
}
function afterCommit(s: GameState, p: SliceParams): void {
  if (moneyForProjects(s, p) < 0 && s.fiscal.projectLoan !== 'taken') s.fiscal.loanWanted = true;
}
function afterCancel(s: GameState, p: SliceParams): void {
  if (s.fiscal.loanWanted && moneyForProjects(s, p) >= 0) s.fiscal.loanWanted = false;
}

/**
 * After a zone edit or removal: a service work whose cell left its zone is cancelled if unstarted, detached if
 * started (it keeps its sunk work; the order gives up its remaining units and their budget).
 */
export function syncWorksToZones(s: GameState, wc: WorksContent): void {
  const zoneCells = new Map(s.zones.map((z) => [z.id, new Set(cellsOfRuns(z.runs, s.grid))]));
  const touched = new Set<WorksOrder>();
  const keep: CellWork[] = [];
  for (const w of s.cellWorks) {
    const o = w.order !== undefined ? s.worksOrders.find((q) => q.id === w.order) : undefined;
    if (!o || !liveOrder(o) || zoneCells.get(w.zone)?.has(w.cell)) { keep.push(w); continue; }
    o.unitsTotal -= w.workTotal - w.workDone;
    touched.add(o);
    if (w.workDone === 0) continue;                       // cancelled: the record goes
    delete w.order;                                       // detached: sunk work stays on the land
    keep.push(w);
  }
  s.cellWorks = keep;
  for (const o of touched) { o.budget = costTo(o, wc.works, o.unitsTotal); settle(s, o, wc.works); }
  if (touched.size) afterCancel(s, wc.params);
}

// ---- the actions ----

function commitWorks(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'commit_works' }): WorksOrder {
  const z = s.zones.find((q) => q.id === a.zone);
  if (!z) throw new Error(`no zone ${a.zone}`);
  const priority = checkPriority(a.priority);
  const inZone = cellsOfRuns(z.runs, s.grid);
  if (z.intensity === 'high') checkHigh(s, inZone, avenueAt(wc));   // R8b (§5.3): the avenue may have gone since
  const tier = intensityOf(wc.params.growth, z);
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  for (const x of s.fiscal.projects) if (x.cells && liveProject(x)) for (const c of cellsOfRuns(x.cells, s.grid)) served.add(c);
  const roads = roadSet(s, wc.network), queued = queuedPath(s);
  const live = new Set(s.worksOrders.filter(liveOrder).map((o) => o.id));
  const works = new Map(s.cellWorks.map((w) => [w.cell, w]));
  const eligible = (c: number) => {
    const w = works.get(c);
    return !served.has(c) && !roads.has(c) && !queued.has(c) && (!w || (w.stage !== 'serviced' && (w.order === undefined || !live.has(w.order))));
  };
  // as M4's site preparation: an unbuildable cell adds no capacity, so it is never serviced (§5.5, §13.2). With the
  // land-cover layer (R8a), the buildable cells are the formable classes'; a village, hill or water cell is refused
  const buildable = (c: number) => !wc.buildable || inSorted(wc.buildable.cells, c);
  const why = (c: number) => {
    const k = wc.landcover ? landCoverAt(wc.landcover, c) : undefined;
    return k ? `its land cover is ${k}, which is not formable` : 'site formation there adds no capacity';
  };
  let cells: number[];
  if (a.cells !== undefined) {
    const zc = new Set(inZone);
    cells = [...new Set(cellsOfRuns(a.cells, s.grid))].sort((x, y) => x - y);
    for (const c of cells) {
      if (!zc.has(c)) throw new Error(`cell ${c} is not in zone ${z.id}`);
      if (!buildable(c)) throw new Error(`cell ${c} is not buildable: ${why(c)}`);
      if (!eligible(c)) throw new Error(`cell ${c} is already formed, a road, or already has works`);
    }
  } else {
    if (wc.landcover && !inZone.some(buildable)) throw new Error(`zone ${z.id} has no formable land`);
    cells = inZone.filter((c) => buildable(c) && eligible(c));
  }
  if (!cells.length) throw new Error(`zone ${z.id} has no cells left for site formation`);
  const id = s.nextOrderId++;
  let units = 0;
  const added: CellWork[] = [];
  for (const c of cells) {
    const w = works.get(c);
    if (w) { w.order = id; w.zone = z.id; units += w.workTotal - w.workDone; continue; }   // adopt a detached work
    // R8a (§5.5): the class scales the cell's units, so its money too, at the order's one rate
    // R8b (§5.3): the tier scales its work; the order's rate carries the tier's money per unit of that work
    const u = Math.max(1, Math.round(wc.works.service.units_per_cell * coverFactors(wc.params, wc.landcover, c).cost * tier.formation_work));
    added.push({ cell: c, zone: z.id, workTotal: u, workDone: 0, stage: 'planned', order: id });
    units += u;
  }
  s.cellWorks = [...s.cellWorks, ...added].sort((x, y) => x.cell - y.cell);
  const o: WorksOrder = { id, kind: 'service', priority, paused: false, committed: s.date, stage: 'queued',
    unitsTotal: units, unitsDone: 0, budget: 0, spent: 0, zone: z.id,
    ...(tier.formation_cost !== tier.formation_work ? { rateFactor: tier.formation_cost / tier.formation_work } : {}) };
  o.budget = costTo(o, wc.works, units);
  s.worksOrders.push(o);
  requisition(s, wc, cells, `works.${id}`);
  return o;
}

/**
 * Land compensation (征地补偿, R8a §5.5): one obligation due next month for the committed cells not yet requisitioned,
 * which join the sorted list. Cancelling refunds nothing, and a requisitioned cell never owes again.
 */
function requisition(s: GameState, wc: WorksContent, cells: readonly number[], ref: string): void {
  if (!wc.landcover) return;
  const have = new Set(s.requisitioned);
  const fresh = cells.filter((c) => !have.has(c));
  if (!fresh.length) return;
  const owed = fresh.reduce((n, c) => n + coverFactors(wc.params, wc.landcover, c).compensation * wc.works.service.yuan_per_cell, 0);
  s.requisitioned = [...have, ...fresh].sort((a, b) => a - b);
  if (Math.round(owed) > 0) addObligation(s, { kind: 'compensation', perMonth: owed, index: 'none', from: s.date + 1, until: s.date + 1, createdBy: ref });
}

/**
 * A road drag (b&c §13.2, R7): cells that are already a road (start, built or in a live road order's path) are
 * stripped anywhere along it, so a drag may start on, run along or cross a road. What is left is one or more
 * segments; each becomes its own `road` order, built from the network outward.
 */
function buildRoad(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'build_road' }): WorksOrder[] {
  const priority = checkPriority(a.priority);
  const k = a.class ?? 'street';
  if (!(ROAD_CLASSES as readonly string[]).includes(k)) throw new Error(`unknown road class ${k}`);
  if (k !== 'street' && !wc.works.roads) throw new Error('road classes need works.roads in the params');
  const cells = expandPath(s, a.path);
  const roads = roadSet(s, wc.network), queued = queuedPath(s), feet = footprints(s);
  const classes = roadClasses(s, wc.network), upgrades = new Set<number>();
  const works = new Set(s.cellWorks.map((w) => w.cell));
  const seen = new Set<number>();
  const segments: number[][] = [];
  let run: number[] = [];
  for (const c of cells) {
    if (seen.has(c)) throw new Error(`the road path crosses itself at cell ${c}`);
    seen.add(c);
    // R8d (§5.12): a built or start road of a lower class is upgraded; any other road, or a queued cell, is stripped
    if (roads.has(c) && !queued.has(c) && rank(classes.get(c) ?? 'street') < rank(k)) { upgrades.add(c); run.push(c); continue; }
    if (roads.has(c) || queued.has(c)) {               // already a road: stripped, and it ends the segment
      if (run.length) segments.push(run);
      run = [];
      continue;
    }
    if (!playable(s, c)) throw new Error(`cell ${c} is not playable land`);
    if (feet.has(c)) throw new Error(`cell ${c} holds a structure`);
    if (works.has(c)) throw new Error(`cell ${c} has works`);
    run.push(c);
  }
  if (run.length) segments.push(run);
  if (!segments.length) throw new Error('that drag adds no new road');
  // either end of each segment may touch the network (R4.5): one drawn toward it is reversed, so it is built outward
  const touches = (c: number) => neighbours(c, s.grid.width, s.grid.height).some((n) => roads.has(n) || queued.has(n));
  const oriented = segments.map((seg) => {
    if (upgrades.has(seg[0]!) || touches(seg[0]!)) return seg;
    if (upgrades.has(seg[seg.length - 1]!) || touches(seg[seg.length - 1]!)) return [...seg].reverse();
    throw new Error('a new road must start or end next to a road');
  });
  const W = wc.works;
  return oriented.map((seg) => {
    const path: PathCell[] = seg.map((cell) => {
      // R8a (§5.5): with the land-cover layer only water and tidal flats bridge; a hill or village cell is road
      const bridge = wc.landcover ? needsBridge(wc.landcover, cell) : wc.buildable !== undefined && !inSorted(wc.buildable.cells, cell);
      if (!upgrades.has(cell)) return { cell, bridge, units: classUnits(W, k, bridge), ...(k !== 'street' ? { class: k } : {}) };
      return { cell, bridge, units: classUnits(W, k, bridge) - classUnits(W, classes.get(cell)!, bridge), class: k, upgrade: true };
    });
    const units = path.reduce((n, c) => n + c.units, 0);
    const o: WorksOrder = { id: s.nextOrderId++, kind: 'road', priority, paused: false, committed: s.date, stage: 'queued',
      unitsTotal: units, unitsDone: 0, budget: 0, spent: 0, path };
    o.budget = costTo(o, W, units);
    s.worksOrders.push(o);
    return o;
  });
}

const rank = (k: RoadClass) => ROAD_CLASSES.indexOf(k);
/** A road cell's units in class `k` (§5.12): the class's units, and a bridge's scaled as street is to works.bridge. */
function classUnits(W: WorksParams, k: RoadClass, bridge: boolean): number {
  const u = W.roads ? W.roads.classes[k].units_per_cell : W.road.units_per_cell;
  return bridge ? Math.round((W.bridge.units_per_cell * u) / W.road.units_per_cell) : u;
}

function orderStructure(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'place_structure' }): WorksOrder {
  const priority = checkPriority(a.priority);
  if (!(STRUCTURE_KINDS as readonly string[]).includes(a.kind)) throw new Error(`unknown structure kind ${a.kind}`);
  // R8c (§5.5): water is not an active constraint and the one-quarter power source is retired; both load, neither is ordered
  if (!OFFERED_STRUCTURES.includes(a.kind)) throw new Error(`a ${a.kind} is no longer built: power comes from substations and stations`);
  const cell = toCell(s, a.cell), attach = toCell(s, a.attach);
  const sp = structureParams(wc.works, a.kind, a.facility);
  const placement: StructurePlacement = { kind: a.kind, cell, attach, capacity: sp.capacity,
    ...(a.kind === 'facility' ? { facility: a.facility } : {}) };
  checkPlacement(s, placement);
  if (roadSet(s, wc.network).has(cell) || queuedPath(s).has(cell)) throw new Error(`cell ${cell} is a road`);
  if (footprints(s).has(cell)) throw new Error(`cell ${cell} already holds a structure`);
  const fx = sp.forex_usd ?? 0;
  if (fx > s.fiscal.balances.forex) throw new Error(`the structure needs ${fx} USD of forex quota; ${s.fiscal.balances.forex} is left`);
  const id = s.nextOrderId++;
  if (fx > 0) post(s, 'import', 'forex', -fx, `works.${id}`);
  const o: WorksOrder = { id, kind: 'structure', priority, paused: false, committed: s.date, stage: 'queued',
    unitsTotal: sp.units, unitsDone: 0, budget: 0, spent: 0, placement };
  o.budget = costTo(o, wc.works, sp.units);
  s.worksOrders.push(o);
  return o;
}

/**
 * R9 (§5.8): a co-financed structure order in an area: the lowest playable free cell four-adjacent to a road (start or
 * built), not zoned, with no works, path or structure; attached to its lowest road neighbour. Budget, spending and
 * forex 0; its crew comes from the pool. Undefined, ordering nothing, when the area has no such cell.
 */
export function orderCofinanced(s: GameState, w: WorksParams, net: StartNetwork, kind: StructureKind, area: number): WorksOrder | undefined {
  const a = s.areas.find((x) => x.id === area && x.access === 'playable');
  if (!a) return undefined;
  const roads = roadSet(s, net), path = queuedPath(s), feet = footprints(s);
  const zoned = new Set(s.zones.flatMap((z) => cellsOfRuns(z.runs, s.grid)));
  const works = new Set(s.cellWorks.map((x) => x.cell));
  const sp = structureParams(w, kind);
  for (const cell of a.cells) {                                    // area cells are sorted
    if (roads.has(cell) || path.has(cell) || feet.has(cell) || zoned.has(cell) || works.has(cell)) continue;
    const attach = neighbours(cell, s.grid.width, s.grid.height).filter((c) => roads.has(c)).sort((x, y) => x - y)[0];
    if (attach === undefined) continue;
    const placement: StructurePlacement = { kind, cell, attach, capacity: sp.capacity };
    checkPlacement(s, placement);
    const o: WorksOrder = { id: s.nextOrderId++, kind: 'structure', priority: 'normal', paused: false, committed: s.date,
      stage: 'queued', unitsTotal: sp.units, unitsDone: 0, budget: 0, spent: 0, placement, cofinanced: true };
    s.worksOrders.push(o);
    return o;
  }
  return undefined;
}
/** R9 (§5.8): cancel a live co-financed order whose investor walked away; its sunk units stay, no structure is placed. */
export function withdrawCofinancedOrder(s: GameState, id: number): boolean {
  const o = s.worksOrders.find((q) => q.id === id);
  if (!o || !o.cofinanced || !liveOrder(o)) return false;
  o.stage = 'cancelled';
  delete o.waiting;
  return true;
}

function cancelWorks(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'cancel_works' }): void {
  const o = findOrder(s, a.order);
  const only = a.cells !== undefined ? new Set(cellsOfRuns(a.cells, s.grid)) : undefined;
  let units = 0;
  if (o.kind === 'service') {
    s.cellWorks = s.cellWorks.filter((w) => {
      const drop = w.order === o.id && w.workDone === 0 && (!only || only.has(w.cell));
      if (drop) units += w.workTotal;
      return !drop;
    });
  } else if (o.kind === 'road') {
    // a path has no holes: cancelling an unstarted cell cancels the rest of the path beyond it
    let before = 0, cut = o.path!.length;
    for (const [i, c] of o.path!.entries()) {
      if (before >= o.unitsDone && (!only || only.has(c.cell))) { cut = i; break; }
      before += c.units;
    }
    for (const c of o.path!.slice(cut)) units += c.units;
    o.path = o.path!.slice(0, cut);
  } else if (o.unitsDone === 0 && (!only || only.has(o.placement!.cell))) {
    units = o.unitsTotal;
    // nothing was contracted: the forex quota drawn at commit goes back
    const fx = -s.fiscal.ledger.filter((l) => l.ref === `works.${o.id}` && l.account === 'forex').reduce((n, l) => n + l.amount, 0);
    if (fx > 0) post(s, 'import', 'forex', fx, `cancel:works.${o.id}`);
  }
  if (units === 0) throw new Error(`works order ${o.id} has no unstarted work to cancel there`);
  shrink(s, o, wc.works, units);
  afterCancel(s, wc.params);
}

/** Validate and apply a works action; throws on an invalid one, changing nothing. */
export function applyWorksAction(s: GameState, wc: WorksContent, a: PlayerAction): void {
  if (a.type === 'commit_works') { commitWorks(s, wc, a); afterCommit(s, wc.params); }
  else if (a.type === 'build_road') { buildRoad(s, wc, a); afterCommit(s, wc.params); }
  else if (a.type === 'place_structure') { orderStructure(s, wc, a); afterCommit(s, wc.params); }
  else if (a.type === 'cancel_works') cancelWorks(s, wc, a);
  else if (a.type === 'set_works_paused') {
    if (typeof a.paused !== 'boolean') throw new Error('paused must be true or false');
    findOrder(s, a.order).paused = a.paused;
  } else if (a.type === 'set_works_priority') {
    const o = findOrder(s, a.order);
    if (a.priority === undefined) throw new Error('a priority is needed');
    o.priority = checkPriority(a.priority);
  } else throw new Error(`not a works action: ${a.type}`);
}

// ---- monthly work (tick step 4, inside allocatePool) ----

export interface OrderMonth {
  /** Units this order can use this month (0 = waiting for access). */
  usable(o: WorksOrder): number;
  /** Do `units` of work: pay, then progress. Returns the units used. */
  work(o: WorksOrder, units: number, events: SimEvent[]): number;
  /** The most of `units` the city can pay for now. */
  affordable(o: WorksOrder, units: number): number;
}

/** The month's works pass: views computed once, at the start (§13.2). */
export function orderMonth(s: GameState, wc: WorksContent): OrderMonth {
  const views = spatialViews(s, wc.network);
  const roads = new Set(views.roads.component.keys());
  const W = wc.works;
  const remainingPath = (o: WorksOrder) => {
    let before = 0;
    for (const [i, c] of o.path!.entries()) { if (before + c.units > o.unitsDone) return i; before += c.units; }
    return o.path!.length;
  };
  return {
    usable(o) {
      const left = o.unitsTotal - o.unitsDone;
      if (o.kind === 'service') {
        return s.cellWorks.reduce((n, w) => n + (w.order === o.id && w.stage !== 'serviced' && views.frontage.has(w.cell)
          ? w.workTotal - w.workDone : 0), 0);
      }
      if (o.kind === 'road') {
        const i = remainingPath(o);
        if (i >= o.path!.length) return 0;
        const next = o.path![i]!.cell;
        const started = i > 0 || o.unitsDone > 0 || o.path![i]!.upgrade === true;
        return started || neighbours(next, s.grid.width, s.grid.height).some((n) => roads.has(n)) ? left : 0;
      }
      const pl = o.placement!;
      if (!roads.has(pl.attach) && !views.frontage.has(pl.cell)) return 0;
      // R8c (§5.5): a power station is built at its own pace, over build_months, whatever the pool could give it
      const st = pl.kind === 'power_station' ? W.structures.power_station : undefined;
      return st ? Math.min(left, Math.ceil(st.units / st.build_months)) : left;
    },
    affordable(o, units) {
      const rate = rateOf(o, W);
      if (rate === 0) return units;
      const f = projectFunds(s, wc.params), cash = f.debt + f.land + f.general;
      let u = Math.min(units, Math.max(0, Math.floor((cash + o.spent) / rate) - o.unitsDone + 1));
      while (u > 0 && costTo(o, W, o.unitsDone + u) - o.spent > cash) u--;
      return u;
    },
    work(o, units, events) {
      if (units <= 0) return 0;
      const area = workArea(s, o);                       // R4 (phase1-slice §5.11): where this month's crew works
      let used = units;
      if (o.kind === 'service') {
        const left = advanceCellWorks(s, units, views.frontage, (w) => w.order === o.id);
        used = units - left;
      }
      const pay = costTo(o, W, o.unitsDone + used) - o.spent;
      if (pay > 0) {
        payProject(s, wc.params, pay, `works.${o.id}`);
        events.push({ step: 'construction', kind: 'project_paid', detail: { order: o.id, amount: pay } });
        events.push({ step: 'construction', kind: 'work', detail: { value: pay } });
      }
      o.spent += pay;
      const before = o.unitsDone;
      o.unitsDone += used;
      o.stage = 'working';
      if (o.kind === 'road') {
        // each path cell joins the roads once its cumulative units are done
        // R8d (§5.12): an upgraded cell changes class only; a new cell of another class than street records it
        let acc = 0;
        const built: number[] = [];
        for (const c of o.path!) {
          acc += c.units;
          if (!(acc > before && acc <= o.unitsDone)) continue;
          if (!c.upgrade) built.push(c.cell);
          if (c.upgrade || (c.class !== undefined && c.class !== 'street')) setRoadClass(s, c.cell, c.class ?? 'street');
        }
        if (built.length) s.roads = [...s.roads, ...built].sort((a, b) => a - b);
      } else if (o.kind === 'structure' && o.unitsDone === o.unitsTotal) {
        const x = placeStructure(s, o.placement!);
        if (x.kind === 'facility') feedFacility(s, W, o, x);
      }
      settle(s, o, W);
      if (used > 0 && area !== undefined) events.push({ step: 'construction', kind: 'crew', detail: { area, units: used } });
      return used;
    },
  };
}

/**
 * A finished facility joins its area's stock, as M4's school project does (b&c §13.2, R4.5): its capacity, then a
 * payroll of staff × the state wage and a service cost per place, from next month. Maintenance is the order's (settle).
 */
function feedFacility(s: GameState, w: WorksParams, o: WorksOrder, x: PlacedStructure): void {
  const area = s.areas.find((a) => a.access === 'playable' && inSorted(a.cells, x.cell))!;
  const fp = structureParams(w, 'facility', x.facility);
  area.facilities[FACILITY_STOCK[x.facility as keyof typeof FACILITY_STOCK]] += x.capacity;
  const wage = s.labour.wage.state, ref = `works.${o.id}`;
  if ((fp.staff ?? 0) > 0) addObligation(s, { kind: 'payroll', perMonth: fp.staff! * wage, index: 'wages', baseWage: wage,
    from: s.date + 1, createdBy: ref });
  if (x.capacity * (fp.service_per_place_month ?? 0) > 0) addObligation(s, { kind: 'service',
    perMonth: x.capacity * fp.service_per_place_month!, index: 'none', from: s.date + 1, createdBy: ref });
}

/**
 * The area an order's crew works in this month (phase1-slice §5.11): a service order's zone's area (or that of its
 * first unfinished cell if the zone is gone), the road cell being built, or the structure's cell.
 */
export function workArea(s: GameState, o: WorksOrder): number | undefined {
  const areaOf = (c: number) => s.areas.find((a) => a.access === 'playable' && inSorted(a.cells, c))?.id;
  if (o.kind === 'service') {
    const z = s.zones.find((x) => x.id === o.zone);
    if (z) return z.area;
    const w = s.cellWorks.find((x) => x.order === o.id && x.stage !== 'serviced');
    return w ? areaOf(w.cell) : undefined;
  }
  if (o.kind === 'road') {
    let before = 0;
    for (const c of o.path!) { if (before + c.units > o.unitsDone) return areaOf(c.cell); before += c.units; }
    return undefined;
  }
  return areaOf(o.placement!.cell);
}

// ---- the step hooks and the preview ----

/** The construction step's act and afterAction for works (§13.2): present only with works params, fiscal and network. */
/** Whether an avenue cell is 4-adjacent to one of the cells (§5.3): the check behind a high zone. */
export const avenueAt = (wc: WorksContent): AvenueAt => (s, cells) => {
  const k = roadClasses(s, wc.network), w = s.grid.width;
  return cells.some((c) => [c - w, c + w, ...(c % w ? [c - 1] : []), ...((c + 1) % w ? [c + 1] : [])]
    .some((n) => k.get(n) === 'avenue'));
};

export function worksHooks(wc: WorksContent | undefined): Pick<TickStep, 'act' | 'afterAction' | 'avenueAt'> {
  if (!wc) return {};
  return {
    avenueAt: avenueAt(wc),
    act: (s, a) => { if (!isWorksAction(a)) return false; applyWorksAction(s, wc, a); return true; },
    afterAction: (s, a) => {
      if (a.type === 'edit_zone' || a.type === 'remove_zone') syncWorksToZones(s, wc);
    },
  };
}

export interface WorksEstimate {
  order: number; kind: WorksOrder['kind'];
  cells: number; bridges: number;           // path or service cells; bridge cells of a road
  units: number; budget: number; forexUsd: number;
  compensation: number;                     // R8a (§5.5): the one-off land compensation it owes next month
  byClass?: Partial<Record<LandCoverClass, number>>;   // a service order's cells by land-cover class, with the layer
  crewPerMonth: number; months: number;     // at full pace: no more than crew_per_order a month
}
export type WorksPreview = { ok: true; orders: WorksEstimate[] } | { ok: false; error: string };

/**
 * What these actions would commit (§13.2), from a clone through the same validation: the state is untouched, so a
 * preview never spends. `apply` is the turn-action path (step.ts applyTurnAction).
 */
export function previewWorks(s: GameState, w: WorksParams, actions: readonly PlayerAction[],
  apply: (state: GameState, a: PlayerAction) => void, landcover?: LandCover): WorksPreview {
  const c = cloneState(s);
  try { for (const a of actions) apply(c, a); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const forex = (id: number) => c.fiscal.ledger.filter((l) => l.ref === `works.${id}` && l.account === 'forex')
    .reduce((n, l) => n - l.amount, 0);
  return { ok: true, orders: c.worksOrders.filter((o) => o.id >= s.nextOrderId).map((o): WorksEstimate => ({
    order: o.id, kind: o.kind,
    cells: o.kind === 'service' ? c.cellWorks.filter((x) => x.order === o.id).length : o.kind === 'road' ? o.path!.length : 1,
    bridges: o.path?.filter((p) => p.bridge).length ?? 0,
    units: o.unitsTotal, budget: o.budget, forexUsd: forex(o.id),
    compensation: c.fiscal.obligations.filter((x) => x.kind === 'compensation' && x.createdBy === `works.${o.id}`)
      .reduce((n, x) => n + x.perMonth, 0),
    ...(landcover && o.kind === 'service' ? { byClass: c.cellWorks.filter((x) => x.order === o.id).reduce((m, x) => {
      const k = landCoverAt(landcover, x.cell);
      if (k) m[k] = (m[k] ?? 0) + 1;
      return m;
    }, {} as Partial<Record<LandCoverClass, number>>) } : {}),
    crewPerMonth: Math.min(w.crew_per_order, o.unitsTotal), months: Math.ceil(o.unitsTotal / w.crew_per_order),
  })) };
}

