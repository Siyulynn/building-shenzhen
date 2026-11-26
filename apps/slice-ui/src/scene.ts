/**
 * What the planning map draws (phase1-slice.md §11.2), as a pure function of the session, the UI's choices and the
 * gesture being drawn. No DOM: map.ts only paints this. Nothing here is saved, and the sim never reads it.
 */
import { cellsOfRuns, expandPath, liveOrder, type GameState, type PlayerAction, type Slice } from '@sz/sim-core';
import type { Session } from './controller.js';
import type { Plan } from './tools.js';
import {
  USE_COLOR, constraintContext, floorSpread, isBuildable, overlayRgba, villageFloors,
  type HistoricalPlan, type OverlayLayer, type RGBA,
} from './views.js';

const MEMO = new WeakMap<GameState, Map<string, Uint8ClampedArray>>();
/** One pixel array per state and layer, so a redraw with the same state reuses it. */
function memo(s: GameState, key: string, f: () => Uint8ClampedArray): Uint8ClampedArray {
  let m = MEMO.get(s);
  if (!m) { m = new Map(); MEMO.set(s, m); }
  let v = m.get(key);
  if (!v) { v = f(); m.set(key, v); }
  return v;
}

/** Zones by use, tinted by works stage: zoned faint, planned and servicing stronger, serviced solid. */
export function zonesRgba(s: GameState, slice: Slice): Uint8ClampedArray {
  const { width: W, height: H } = s.grid, px = new Uint8ClampedArray(W * H * 4);
  const k = constraintContext(s, slice);
  for (const [c, z] of k.zoneAt) {
    const use = USE_COLOR[z.use] ?? [255, 255, 255, 180];
    const w = k.works.get(c);
    const alpha = k.served.has(c) ? 215 : !w ? 70 : w.stage === 'planned' ? 120 : 120 + Math.round(80 * w.workDone / Math.max(1, w.workTotal));
    px.set([use[0], use[1], use[2], alpha], c * 4);
  }
  return px;
}

/** The cells the queued actions touch: their zones, road paths, structures and serviced cells. */
export function actionCells(s: GameState, queue: readonly PlayerAction[], actions: readonly PlayerAction[]): number[] {
  const zoneRuns = new Map(s.zones.map((z) => [z.id, z.runs]));
  let next = s.nextZoneId;
  for (const a of queue) if (a.type === 'create_zone') zoneRuns.set(next++, a.runs);
  const out: number[] = [];
  for (const a of actions) {
    if (a.type === 'create_zone') { out.push(...cellsOfRuns(a.runs, s.grid)); if (!queue.includes(a)) zoneRuns.set(next++, a.runs); }
    else if (a.type === 'build_road') { try { out.push(...expandPath(s, a.path)); } catch { /* refused */ } }
    else if (a.type === 'place_structure') out.push(a.cell[1] * s.grid.width + a.cell[0]);
    else if (a.type === 'commit_works') { const r = a.cells ?? zoneRuns.get(a.zone); if (r) out.push(...cellsOfRuns(r, s.grid)); }
    else if (a.type === 'cancel_works') {
      if (a.cells) out.push(...cellsOfRuns(a.cells, s.grid));
      else { const o = s.worksOrders.find((q) => q.id === a.order); if (o?.placement) out.push(o.placement.cell); }
    } else if (a.type === 'remove_zone') { const r = zoneRuns.get(a.zone); if (r) out.push(...cellsOfRuns(r, s.grid)); }
  }
  return [...new Set(out)];
}

export interface SceneInputs {
  layer: OverlayLayer; guide: boolean; selected: { x: number; y: number } | null; plan: Plan | null; previewCells?: readonly number[];
  tutorial?: { cells: readonly number[]; label: string } | null;
  historical?: HistoricalPlan | null;              // R11.2: the 1984 proposal replaces the two pink precedents
}

/** Everything map.ts draws, from the session and the UI's choices. */
export function sceneOf(x: Session, slice: Slice, ui: SceneInputs) {
  const s = x.state, k = constraintContext(s, slice);
  const floor = floorSpread(s, slice);
  const floorUse = new Map<number, string>();
  for (const c of floor.keys()) { const z = k.zoneAt.get(c); if (z) floorUse.set(c, z.use); }
  const building: { cell: number; bridge: boolean }[] = [];
  const structures: { cell: number; kind: string; built: boolean }[] = s.structures.map((q) => ({ cell: q.cell, kind: q.kind, built: true }));
  const built = new Set(s.roads);
  for (const o of s.worksOrders) {
    if (!liveOrder(o)) continue;
    if (o.path) for (const p of o.path) if (!built.has(p.cell)) building.push({ cell: p.cell, bridge: p.bridge });
    if (o.placement) structures.push({ cell: o.placement.cell, kind: o.placement.kind, built: false });
  }
  const plan = ui.plan;
  const previewCells = plan && plan.kind === 'actions' ? actionCells(s, x.queue, plan.actions) : ui.previewCells ?? [];
  const historical = ui.guide ? ui.historical ?? null : null;
  const guide = ui.guide && !historical ? (slice.tick.precedents ?? []).flatMap((p) => [...p.cells]) : null;
  return {
    state: s,
    overlay: memo(s, ui.layer, () => overlayRgba(s, slice, ui.layer)),
    zones: memo(s, '#zones', () => zonesRgba(s, slice)),
    planned: s.cellWorks.filter((w) => w.stage === 'planned').map((w) => w.cell),
    roads: s.roads,
    building,
    bridges: new Set(s.roads.filter((c) => !isBuildable(slice, c))),
    structures,
    queued: actionCells(s, x.queue, x.queue),
    preview: plan && plan.kind !== 'none' ? { cells: previewCells, ok: plan.kind !== 'refused' } : null,
    guide, historical: historical?.zones ?? null,
    selected: ui.selected,
    tutorial: ui.tutorial ?? null,
    floor, floorUse,
    villages: villageFloors(s),
  };
}
export type { RGBA };
