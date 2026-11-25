/**
 * The map tools (phase1-slice.md §11.2): pure functions from the session, the tool's choices and a gesture to the
 * PlayerActions the gesture queues, with a preview. map.ts only turns pointer events into gestures; main.ts sends the
 * plan to the controller. Previews go through previewWorks on a clone (sim-core's own validation), never step.
 */
import {
  applyTurnAction, cellsOfRuns, expandPath, liveOrder, playableAreaOf, previewWorks, runsOfCells, templateZoneAction,
  type CellRuns, type GameState, type LandUse, type PlayerAction, type Precedent, type WorksEstimate,
} from '@sz/sim-core';
import { dequeue, enqueue, type Session } from './controller.js';
import * as S from './strings.js';
import type { L } from './strings.js';
import { actionLabel, clipZone, previewZone, queuedZoneIds } from './views.js';

export const TOOLS = ['select', 'road', 'zone', 'service', 'erase', 'water', 'power', 'facility'] as const;
export type Tool = (typeof TOOLS)[number];
/** The tools that build: off while a card interrupts the quarter, and after the end. */
export const BUILD_TOOLS: readonly Tool[] = ['road', 'zone', 'service', 'erase', 'water', 'power', 'facility'];
export interface ToolOptions { use: LandUse; planOnly: boolean; facility: string }
export type XY = readonly [number, number];
/** A press at `from` and a release at `to`; a click has the two equal. */
export interface Gesture { tool: Tool; from: XY; to: XY }

/** What a gesture would commit: the new orders' estimates, summed, and the land it covers. */
export interface GesturePreview {
  area: number; cells: number; orders: number; bridges: number; units: number; budget: number; forexUsd: number;
  crewPerMonth: number; months: number; note?: L;
}
export type Plan =
  | { kind: 'none' }
  | { kind: 'actions'; actions: PlayerAction[]; preview: GesturePreview }
  | { kind: 'dequeue'; index: number; label: L }
  | { kind: 'refused'; what: L; detail?: string };

const refused = (what: L, detail?: string): Plan => (detail === undefined ? { kind: 'refused', what } : { kind: 'refused', what, detail });
const idx = (s: GameState, [x, y]: XY) => y * s.grid.width + x;
const onGrid = (s: GameState, [x, y]: XY) => x >= 0 && y >= 0 && x < s.grid.width && y < s.grid.height;
const inRuns = (runs: CellRuns, x: number, y: number) => runs.some(([ry, x0, x1]) => ry === y && x >= x0 && x <= x1);

/** The orders the queue alone creates: cached per queue, since previewWorks clones the state. */
const BASE = new WeakMap<readonly PlayerAction[], { state: GameState; n: number; error?: string }>();
function previewOrders(x: Session, actions: readonly PlayerAction[]): { ok: true; orders: WorksEstimate[] } | { ok: false; error: string } {
  const works = x.slice.params.works;
  if (!works) return { ok: false, error: 'no works params' };
  const apply = (st: GameState, a: PlayerAction) => applyTurnAction(st, a, x.steps);
  let base = BASE.get(x.queue);
  if (!base || base.state !== x.state) {
    const p = previewWorks(x.state, works, x.queue, apply);
    base = p.ok ? { state: x.state, n: p.orders.length } : { state: x.state, n: 0, error: p.error };
    BASE.set(x.queue, base);
  }
  if (base.error !== undefined) return { ok: false, error: base.error };
  const p = previewWorks(x.state, works, [...x.queue, ...actions], apply);
  return p.ok ? { ok: true, orders: p.orders.slice(base.n) } : p;
}

/** The budgets of the orders this turn's queue would create (§11.2, R7): what the chips count as queued. */
const QUEUED = new WeakMap<readonly PlayerAction[], { state: GameState; budget: number }>();
export function queuedBudget(x: Session): number {
  const works = x.slice.params.works;
  if (!works || !x.queue.length) return 0;
  const hit = QUEUED.get(x.queue);
  if (hit && hit.state === x.state) return hit.budget;
  const p = previewWorks(x.state, works, x.queue, (st, a) => applyTurnAction(st, a, x.steps));
  const budget = p.ok ? p.orders.reduce((n, o) => n + o.budget, 0) : 0;
  QUEUED.set(x.queue, { state: x.state, budget });
  return budget;
}

function summarize(orders: readonly WorksEstimate[], area: number, cells: number, note?: L): GesturePreview {
  return {
    area, cells: cells || orders.reduce((n, o) => n + o.cells, 0), orders: orders.length,
    bridges: orders.reduce((n, o) => n + o.bridges, 0), units: orders.reduce((n, o) => n + o.units, 0),
    budget: orders.reduce((n, o) => n + o.budget, 0), forexUsd: orders.reduce((n, o) => n + o.forexUsd, 0),
    crewPerMonth: orders.reduce((n, o) => n + o.crewPerMonth, 0), months: orders.reduce((n, o) => Math.max(n, o.months), 0),
    ...(note ? { note } : {}),
  };
}

/** Try the actions on the queue; a refusal is sim-core's reason. */
function tryActions(x: Session, actions: PlayerAction[], area: number, cells = 0, note?: L): Plan {
  const p = previewOrders(x, actions);
  if (!p.ok) return refused(S.T.refused, p.error);
  return { kind: 'actions', actions, preview: summarize(p.orders, area, cells, note) };
}

/** The id the next queued create_zone will get (§11.1). */
const nextQueuedZone = (x: Session) => x.state.nextZoneId + x.queue.filter((a) => a.type === 'create_zone').length;

/** A zone and, unless Plan only, its servicing (§11.2). */
function zonePlan(x: Session, o: ToolOptions, a: PlayerAction & { type: 'create_zone' }): Plan {
  if (!a.runs.length) return refused(S.T.refused, 'no land here can be zoned');
  const zone = nextQueuedZone(x);
  const actions: PlayerAction[] = [a, ...(o.planOnly ? [] : [{ type: 'commit_works' as const, zone }])];
  const first = cellsOfRuns(a.runs, x.state.grid)[0]!;
  return tryActions(x, actions, playableAreaOf(x.state, first), cellsOfRuns(a.runs, x.state.grid).length);
}

/** Road cells now and this turn: the start network's, the built ones, live orders' paths and queued paths. */
function roadCells(x: Session): Set<number> {
  const s = x.state;
  const out = new Set<number>([...x.slice.startNetwork.routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells), ...s.roads]);
  for (const o of s.worksOrders) if (liveOrder(o) && o.path) for (const c of o.path) out.add(c.cell);
  for (const a of x.queue) if (a.type === 'build_road') { try { for (const c of expandPath(s, a.path)) out.add(c); } catch { /* refused later */ } }
  return out;
}

/** A road from A to B: across first, then down (§11.2). */
export function roadWaypoints(a: XY, b: XY): [number, number][] {
  const pts: [number, number][] = [[a[0], a[1]]];
  const corner: [number, number] = [b[0], a[1]];
  if (corner[0] !== a[0]) pts.push(corner);
  if (b[1] !== corner[1]) pts.push([b[0], b[1]]);
  return pts;
}

/** The attach cell for a structure at c: the first road four-neighbour in cell-index order, else c itself (§11.2). */
export function attachFor(x: Session, c: XY): { attach: [number, number]; road: boolean } {
  const s = x.state, W = s.grid.width, i = idx(s, c), roads = roadCells(x);
  const ns = [i - W, i - 1, i + 1, i + W].filter((n) => n >= 0 && n < W * s.grid.height
    && (n % W === i % W || Math.floor(n / W) === Math.floor(i / W)));
  const r = ns.find((n) => roads.has(n));
  return r === undefined ? { attach: [c[0], c[1]], road: false } : { attach: [r % W, Math.floor(r / W)], road: true };
}

/** The zones a gesture can name: the state's and those queued this turn, with their runs. */
function zonesNow(x: Session): { id: number; runs: CellRuns }[] {
  const ids = queuedZoneIds(x.state, x.queue);
  return [...x.state.zones.map((z) => ({ id: z.id, runs: z.runs })),
    ...x.queue.flatMap((a, k) => (a.type === 'create_zone' ? [{ id: ids.get(k)!, runs: a.runs }] : []))];
}

/** The queued action (latest first) that covers a cell, if any. */
function queuedAt(x: Session, c: XY): number | undefined {
  const s = x.state, zones = zonesNow(x);
  for (let k = x.queue.length - 1; k >= 0; k--) {
    const a = x.queue[k]!;
    if (a.type === 'create_zone' && inRuns(a.runs, c[0], c[1])) return k;
    if (a.type === 'place_structure' && a.cell[0] === c[0] && a.cell[1] === c[1]) return k;
    if (a.type === 'build_road') { try { if (expandPath(s, a.path).includes(idx(s, c))) return k; } catch { /* skip */ } }
    if (a.type === 'commit_works') {
      const z = zones.find((q) => q.id === a.zone);
      if (z && inRuns(a.cells ?? z.runs, c[0], c[1])) return k;
    }
  }
  return undefined;
}

/** Erase / Cancel (§11.2): this turn's action first, then unstarted work, then a zone with no works. */
function erasePlan(x: Session, c: XY): Plan {
  const s = x.state, i = idx(s, c);
  const k = queuedAt(x, c);
  if (k !== undefined) return { kind: 'dequeue', index: k, label: actionLabel(s, x.slice, x.queue, k) };
  const cell: CellRuns = [[c[1], c[0], c[0]]];
  const area = playableAreaOf(s, i);
  const w = s.cellWorks.find((q) => q.cell === i);
  const wo = w?.order !== undefined ? s.worksOrders.find((o) => o.id === w.order) : undefined;
  if (w && wo && liveOrder(wo)) {
    if (w.workDone > 0) return refused(S.T.startedWork);
    return tryActions(x, [{ type: 'cancel_works', order: wo.id, cells: cell }], area, 1);
  }
  for (const o of s.worksOrders) {
    if (!liveOrder(o)) continue;
    if (o.path) {
      let before = 0;
      for (const p of o.path) {
        if (p.cell === i) {
          if (before < o.unitsDone) return refused(S.T.startedWork);
          return tryActions(x, [{ type: 'cancel_works', order: o.id, cells: cell }], area);
        }
        before += p.units;
      }
    }
    if (o.placement?.cell === i) {
      if (o.unitsDone > 0) return refused(S.T.startedWork);
      return tryActions(x, [{ type: 'cancel_works', order: o.id }], area, 1);
    }
  }
  if (s.roads.includes(i)) return refused(S.T.builtRoad);
  if (x.slice.startNetwork.routes.some((r) => r.kind === 'road' && r.cells.includes(i))) return refused(S.T.startRoad);
  if (s.structures.some((q) => q.cell === i)) return refused(S.T.builtStructure);
  const z = s.zones.find((q) => inRuns(q.runs, c[0], c[1]));
  if (z) {
    const works = s.cellWorks.some((q) => q.zone === z.id) || s.fiscal.projects.some((p) => p.zone === z.id && p.cells);
    if (works) return refused(S.T.zoneHasWorks);
    return { kind: 'actions', actions: [{ type: 'remove_zone', zone: z.id }],
      preview: { area, cells: z.cellCount, orders: 0, bridges: 0, units: 0, budget: 0, forexUsd: 0, crewPerMonth: 0, months: 0 } };
  }
  if (x.slice.startSites.some((q) => q.layer === 'settlement' && q.cell[0] === c[0] && q.cell[1] === c[1])) return refused(S.T.existingStock);
  return refused(S.T.nothingToErase);
}

/** What a gesture with this tool would do at the turn's start. */
export function planGesture(x: Session, o: ToolOptions, g: Gesture): Plan {
  const s = x.state;
  if (g.tool === 'select') return { kind: 'none' };
  if (x.mode !== 'turn') return refused(S.T.turnStartOnly);
  if (!onGrid(s, g.from) || !onGrid(s, g.to)) return refused(S.T.refused, 'off the map');
  switch (g.tool) {
    case 'zone':
      return zonePlan(x, o, { type: 'create_zone', use: o.use, runs: previewZone(s, x.queue, g.from[0], g.from[1], g.to[0], g.to[1]) });
    case 'road': {
      const path = roadWaypoints(g.from, g.to);
      return tryActions(x, [{ type: 'build_road', path }], playableAreaOf(s, idx(s, g.from)));
    }
    case 'water': case 'power': case 'facility': {
      const { attach, road } = attachFor(x, g.to);
      const a: PlayerAction = g.tool === 'facility'
        ? { type: 'place_structure', kind: 'facility', facility: o.facility, cell: [g.to[0], g.to[1]], attach }
        : { type: 'place_structure', kind: g.tool === 'water' ? 'water_source' : 'power_source', cell: [g.to[0], g.to[1]], attach };
      return tryActions(x, [a], playableAreaOf(s, idx(s, g.to)), 1, road ? undefined : S.T.noAttachRoad);
    }
    case 'service': {
      const z = zonesNow(x).find((q) => inRuns(q.runs, g.from[0], g.from[1]));
      if (!z) return refused(S.T.notZoned);
      const click = g.from[0] === g.to[0] && g.from[1] === g.to[1];
      if (click) return tryActions(x, [{ type: 'commit_works', zone: z.id }], playableAreaOf(s, idx(s, g.from)));
      const [ax, bx] = [Math.min(g.from[0], g.to[0]), Math.max(g.from[0], g.to[0])];
      const [ay, by] = [Math.min(g.from[1], g.to[1]), Math.max(g.from[1], g.to[1])];
      const cells = cellsOfRuns(z.runs, s.grid).filter((c) => {
        const cx = c % s.grid.width, cy = Math.floor(c / s.grid.width);
        return cx >= ax && cx <= bx && cy >= ay && cy <= by;
      });
      if (!cells.length) return refused(S.T.nothingToService);
      return tryActions(x, [{ type: 'commit_works', zone: z.id, cells: runsOfCells(cells, s.grid.width) }], playableAreaOf(s, cells[0]!));
    }
    case 'erase': return erasePlan(x, g.to);
  }
}

/** Zone the historical template's footprint (§11.2's "zone the guide"), clipped as §11.1's, serviced unless Plan only. */
export function guidePlan(x: Session, o: ToolOptions, p: Precedent): Plan {
  if (x.mode !== 'turn') return refused(S.T.turnStartOnly);
  let a: PlayerAction & { type: 'create_zone' };
  try { a = templateZoneAction(x.state, p); } catch (e) { return refused(S.T.refused, (e as Error).message); }
  return zonePlan(x, o, { ...a, runs: clipZone(x.state, x.queue, a.runs) });
}

/** Put a plan into the session: queue its actions, or remove the queued action it names. */
export function applyPlan(x: Session, plan: Plan): Session {
  if (plan.kind === 'actions') { let y = x; for (const a of plan.actions) y = enqueue(y, a); return y; }
  if (plan.kind === 'dequeue') return dequeue(x, plan.index);
  if (plan.kind === 'refused') return { ...x, error: plan.detail === undefined ? { what: plan.what } : { what: plan.what, detail: plan.detail } };
  return x;
}
