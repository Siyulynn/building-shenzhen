/**
 * R12's tests (phase1-slice.md §5.9): a map plan may draw the visit's design-map zones on their own cells. The cells
 * are generated from the design grid (designPlan.ts), match the reference layer the UI draws, and are drawn once, never
 * on a road, and only when their turn and gates allow.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DESIGN_PLAN_ZONES, HISTORICAL_PLAN, cellsOfRuns, createInitialState, planZones, plannedRoads,
  type GameState, type MapPlan, type PlayerAction,
} from '../src/index.js';
import { slice, UNGATED } from './fixtures.js';

const layer = JSON.parse(readFileSync(new URL('../../../data/starts/slice_historical_zones.json', import.meta.url), 'utf8')) as {
  zones: { id: string; use: string; intensity: string; runs: number[][] }[];
};
const fresh = (): GameState => createInitialState(slice.init);
const plan = (zones: MapPlan['zones']): MapPlan => ({
  zones, roads: [], crew_share: 0.3, room_ahead_m2: 0, facilities: [], teams: [], reserve: 0,
  utilities: { headroom_jobs: 0, max_sources: 0, import_kw: 0, import_from_turn: 99 },
});
const zoneOf = (id: string) => DESIGN_PLAN_ZONES.find((z) => z.id === id)!;
const created = (acts: PlayerAction[]) => acts.filter((a): a is PlayerAction & { type: 'create_zone' } => a.type === 'create_zone');

describe('R12 design-map zones', () => {
  it('designPlan.ts matches the reference layer, zone for zone', () => {
    expect(DESIGN_PLAN_ZONES.map((z) => [z.id, z.use, z.intensity, z.runs]))
      .toEqual(layer.zones.map((z) => [z.id, z.use, z.intensity, z.runs]));
  });

  it('draws a design zone on its own cells, minus the road cells', () => {
    const s = fresh(), z = zoneOf('luohu-support');
    const roads = plannedRoads(s, UNGATED);
    const [a] = created(planZones(s, UNGATED, plan([{ id: z.id, use: z.use, runs: z.runs }])));
    const own = cellsOfRuns(z.runs, s.grid);
    expect(own.filter((c) => roads.has(c))).toHaveLength(7);
    expect(cellsOfRuns(a!.runs, s.grid)).toEqual(own.filter((c) => !roads.has(c)));
    expect(a!.use).toBe('commercial');
  });

  it('waits for its turn and its gates, and is drawn only once', () => {
    const s = fresh(), z = zoneOf('shangbu-factories');
    const p = plan([{ id: z.id, use: z.use, runs: z.runs, from_turn: 2 }]);
    expect(created(planZones(s, UNGATED, p, true))).toHaveLength(0);           // turn 0 < from_turn
    const later = { ...s, turn: 2 };
    const [a] = created(planZones(later, UNGATED, p, true));
    expect(cellsOfRuns(a!.runs, s.grid)).toHaveLength(70);
    const drawn = { ...later, zones: [{ ...s.zones[0]!, ...{ id: 1, use: 'industrial' as const, runs: a!.runs } }] } as GameState;
    expect(created(planZones(drawn, UNGATED, p, true))).toHaveLength(0);
    // high intensity waits for its unlock under the real gates
    const high = zoneOf('luohu-high');
    expect(created(planZones(fresh(), slice.tick, plan([{ id: high.id, use: high.use, intensity: 'high', runs: high.runs }])))).toHaveLength(0);
  });
});

describe('R12 the historical plan follows the design map', () => {
  const s = fresh(), w = s.grid.width;
  const cellsOf = (path: readonly (readonly [number, number])[]) => {
    const out: number[] = [];
    path.forEach(([x, y], i) => {
      if (i === 0) { out.push(y * w + x); return; }
      let [px, py] = path[i - 1]!;
      while (px !== x || py !== y) { px += Math.sign(x - px); py += Math.sign(y - py); out.push(py * w + px); }
    });
    return out;
  };
  const playable = (c: number) => s.areas.some((a) => a.access === 'playable' && a.cells.includes(c));
  const designCells = new Set(DESIGN_PLAN_ZONES.flatMap((z) => cellsOfRuns(z.runs, s.grid)));
  const planRoads = new Set(HISTORICAL_PLAN.roads.flatMap(cellsOf));
  const network = plannedRoads(s, slice.tick);

  it('lays every plan road on playable cells off the design zones and off the start network', () => {
    for (const r of HISTORICAL_PLAN.roads) for (const c of cellsOf(r)) {
      expect(playable(c), `${c % w},${Math.floor(c / w)}`).toBe(true);
      expect(network.has(c), `${c % w},${Math.floor(c / w)} on the network`).toBe(false);
    }
    // the two avenues may cross zones: Shennan West one row north of its line, Shennan East along its line at Huangbeiling
    const shennanWest = [...cellsOf(HISTORICAL_PLAN.roads[0]!), ...cellsOf(HISTORICAL_PLAN.roads[1]!)];
    for (const c of planRoads) if (!shennanWest.includes(c)) expect(designCells.has(c), `${c % w},${Math.floor(c / w)}`).toBe(false);
  });

  it('gives every zone it draws a road beside it', () => {
    const roads = new Set([...planRoads, ...network]);
    for (const z of HISTORICAL_PLAN.zones) {
      if (!('runs' in z) || z.use === 'reserve') continue;
      const cells = cellsOfRuns(z.runs, s.grid).filter((c) => !roads.has(c));
      expect(cells.some((c) => [c - w, c + w, c - 1, c + 1].some((n) => roads.has(n))), z.id).toBe(true);
    }
  });

  it('draws every design zone but the Shuibei candidate', () => {
    expect(HISTORICAL_PLAN.zones.map((z) => ('runs' in z ? z.id : '')).sort())
      .toEqual(DESIGN_PLAN_ZONES.map((z) => z.id).filter((id) => id !== 'shuibei').sort());
  });
});
