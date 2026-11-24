/**
 * Municipal works orders (buildings-and-construction §13.2, R2): the six works actions, zone-edit detaching, the
 * monthly work inside the construction pool, and the preview. Orders are paid as their work is done, through the
 * ledger, at one yuan-per-unit rate per order: the cost of k more units is round(rate × (unitsDone + k)) − spent.
 */
import {
  PRIORITIES, liveProject, moneyForProjects, payProject, post, projectFunds, type Priority,
} from './fiscal.js';
import type { CellWorksParams, SliceParams, StructureWorksParams, WorksParams } from './params.js';
import type { StartNetwork } from './sites.js';
import { cloneState, type GameState, type PlayerAction } from './state.js';
import type { SimEvent, TickStep } from './step.js';
import {
  advanceCellWorks, checkPlacement, liveOrder, placeStructure, spatialViews, STRUCTURE_KINDS, type CellWork, type PathCell,
  type StructureKind, type StructurePlacement, type WorksOrder,
} from './works.js';
import { cellsOfRuns } from './zones.js';

export interface WorksContent { params: SliceParams; works: WorksParams; network: StartNetwork; buildable?: { cells: Uint32Array } }

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
  if (o.kind === 'service') return cellRate(w.service);
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
function settle(s: GameState, o: WorksOrder): void {
  if (o.unitsDone < o.unitsTotal) return;
  o.stage = o.unitsDone > 0 ? 'done' : 'cancelled';
  if (o.stage === 'done') o.completed = s.date;
  delete o.waiting;
}
/** Take `units` of unstarted or remaining work off an order, with their budget. */
function shrink(s: GameState, o: WorksOrder, w: WorksParams, units: number): void {
  o.unitsTotal -= units;
  o.budget = costTo(o, w, o.unitsTotal);
  settle(s, o);
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
  for (const o of touched) { o.budget = costTo(o, wc.works, o.unitsTotal); settle(s, o); }
  if (touched.size) afterCancel(s, wc.params);
}

// ---- the actions ----

function commitWorks(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'commit_works' }): WorksOrder {
  const z = s.zones.find((q) => q.id === a.zone);
  if (!z) throw new Error(`no zone ${a.zone}`);
  const priority = checkPriority(a.priority);
  const inZone = cellsOfRuns(z.runs, s.grid);
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  for (const x of s.fiscal.projects) if (x.cells && liveProject(x)) for (const c of cellsOfRuns(x.cells, s.grid)) served.add(c);
  const roads = roadSet(s, wc.network), queued = queuedPath(s);
  const live = new Set(s.worksOrders.filter(liveOrder).map((o) => o.id));
  const works = new Map(s.cellWorks.map((w) => [w.cell, w]));
  const eligible = (c: number) => {
    const w = works.get(c);
    return !served.has(c) && !roads.has(c) && !queued.has(c) && (!w || (w.stage !== 'serviced' && (w.order === undefined || !live.has(w.order))));
  };
  let cells: number[];
  if (a.cells !== undefined) {
    const zc = new Set(inZone);
    cells = [...new Set(cellsOfRuns(a.cells, s.grid))].sort((x, y) => x - y);
    for (const c of cells) {
      if (!zc.has(c)) throw new Error(`cell ${c} is not in zone ${z.id}`);
      if (!eligible(c)) throw new Error(`cell ${c} is serviced, a road, or already has works`);
    }
  } else cells = inZone.filter(eligible);
  if (!cells.length) throw new Error(`zone ${z.id} has no cells left to service`);
  const id = s.nextOrderId++;
  let units = 0;
  const added: CellWork[] = [];
  for (const c of cells) {
    const w = works.get(c);
    if (w) { w.order = id; w.zone = z.id; units += w.workTotal - w.workDone; continue; }   // adopt a detached work
    added.push({ cell: c, zone: z.id, workTotal: wc.works.service.units_per_cell, workDone: 0, stage: 'planned', order: id });
    units += wc.works.service.units_per_cell;
  }
  s.cellWorks = [...s.cellWorks, ...added].sort((x, y) => x.cell - y.cell);
  const o: WorksOrder = { id, kind: 'service', priority, paused: false, committed: s.date, stage: 'queued',
    unitsTotal: units, unitsDone: 0, budget: 0, spent: 0, zone: z.id };
  o.budget = costTo(o, wc.works, units);
  s.worksOrders.push(o);
  return o;
}

function buildRoad(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'build_road' }): WorksOrder {
  const priority = checkPriority(a.priority);
  const cells = expandPath(s, a.path);
  const roads = roadSet(s, wc.network), queued = queuedPath(s), feet = footprints(s);
  const works = new Set(s.cellWorks.map((w) => w.cell));
  const seen = new Set<number>();
  for (const c of cells) {
    if (seen.has(c)) throw new Error(`the road path crosses itself at cell ${c}`);
    seen.add(c);
    if (!playable(s, c)) throw new Error(`cell ${c} is not playable land`);
    if (roads.has(c) || queued.has(c)) throw new Error(`cell ${c} is already a road`);
    if (feet.has(c)) throw new Error(`cell ${c} holds a structure`);
    if (works.has(c)) throw new Error(`cell ${c} has works`);
  }
  if (!neighbours(cells[0]!, s.grid.width, s.grid.height).some((n) => roads.has(n) || queued.has(n))) {
    throw new Error('a new road must start next to a road');
  }
  const W = wc.works;
  const path: PathCell[] = cells.map((cell) => {
    const bridge = wc.buildable !== undefined && !inSorted(wc.buildable.cells, cell);
    return { cell, bridge, units: (bridge ? W.bridge : W.road).units_per_cell };
  });
  const units = path.reduce((n, c) => n + c.units, 0);
  const o: WorksOrder = { id: s.nextOrderId++, kind: 'road', priority, paused: false, committed: s.date, stage: 'queued',
    unitsTotal: units, unitsDone: 0, budget: 0, spent: 0, path };
  o.budget = costTo(o, W, units);
  s.worksOrders.push(o);
  return o;
}

function orderStructure(s: GameState, wc: WorksContent, a: PlayerAction & { type: 'place_structure' }): WorksOrder {
  const priority = checkPriority(a.priority);
  if (!(STRUCTURE_KINDS as readonly string[]).includes(a.kind)) throw new Error(`unknown structure kind ${a.kind}`);
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
  } else if (o.unitsDone === 0 && (!only || only.has(o.placement!.cell))) units = o.unitsTotal;
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
        const started = i > 0 || o.unitsDone > 0;
        return started || neighbours(next, s.grid.width, s.grid.height).some((n) => roads.has(n)) ? left : 0;
      }
      const pl = o.placement!;
      return roads.has(pl.attach) || views.frontage.has(pl.cell) ? left : 0;
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
        let acc = 0;
        const built: number[] = [];
        for (const c of o.path!) {
          acc += c.units;
          if (acc > before && acc <= o.unitsDone) built.push(c.cell);
        }
        if (built.length) s.roads = [...s.roads, ...built].sort((a, b) => a - b);
      } else if (o.kind === 'structure' && o.unitsDone === o.unitsTotal) {
        placeStructure(s, o.placement!);
      }
      settle(s, o);
      return used;
    },
  };
}

// ---- the step hooks and the preview ----

/** The construction step's act and afterAction for works (§13.2): present only with works params, fiscal and network. */
export function worksHooks(wc: WorksContent | undefined): Pick<TickStep, 'act' | 'afterAction'> {
  if (!wc) return {};
  return {
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
  crewPerMonth: number; months: number;     // at full pace: no more than crew_per_order a month
}
export type WorksPreview = { ok: true; orders: WorksEstimate[] } | { ok: false; error: string };

/**
 * What these actions would commit (§13.2), from a clone through the same validation: the state is untouched, so a
 * preview never spends. `apply` is the turn-action path (step.ts applyTurnAction).
 */
export function previewWorks(s: GameState, w: WorksParams, actions: readonly PlayerAction[],
  apply: (state: GameState, a: PlayerAction) => void): WorksPreview {
  const c = cloneState(s);
  try { for (const a of actions) apply(c, a); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const forex = (id: number) => c.fiscal.ledger.filter((l) => l.ref === `works.${id}` && l.account === 'forex')
    .reduce((n, l) => n - l.amount, 0);
  return { ok: true, orders: c.worksOrders.filter((o) => o.id >= s.nextOrderId).map((o): WorksEstimate => ({
    order: o.id, kind: o.kind,
    cells: o.kind === 'service' ? c.cellWorks.filter((x) => x.order === o.id).length : o.kind === 'road' ? o.path!.length : 1,
    bridges: o.path?.filter((p) => p.bridge).length ?? 0,
    units: o.unitsTotal, budget: o.budget, forexUsd: forex(o.id),
    crewPerMonth: Math.min(w.crew_per_order, o.unitsTotal), months: Math.ceil(o.unitsTotal / w.crew_per_order),
  })) };
}

