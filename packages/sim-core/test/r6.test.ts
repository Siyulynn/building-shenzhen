/**
 * R6's tests (phase1-slice.md §5.9): the map-first policies play through the works queue, never through M4's
 * projects; their plans' actions are legal by construction; the historical plan reaches its template zone by road;
 * servicing is phased to the crew pool; and the historical run still passes the 1980-Q2 snapshot's bands.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  AGGRESSIVE_PLAN, CAUTIOUS_PLAN, HISTORICAL_PLAN, Rng, aggressive, cautious, cellsNearRoad, cellsOfRuns, checkBands,
  createInitialState, createTickSteps, historical, planZones, playQuarters, plannedRoads, stateAfter,
  type BandRecord, type ClaimInfo, type DecisionPolicy, type GameState, type PlayRecord, type PlayerAction,
} from '../src/index.js';
import { params, readRepo, slice, UNGATED } from './fixtures.js';

const STEPS = createTickSteps(params, UNGATED);
const fresh = () => createInitialState(slice.init);
/** Play a policy, recording every turn action it gives (answers aside). */
function play(policy: DecisionPolicy, seed = 1): { rec: PlayRecord; acts: PlayerAction[] } {
  const acts: PlayerAction[] = [];
  const spy: DecisionPolicy = (s, pending) => {
    const out = policy(s, pending);
    acts.push(...out.filter((a) => a.type !== 'answer_card'));
    return out;
  };
  return { rec: playQuarters(fresh(), new Rng(seed), STEPS, spy), acts };
}
const runs = {
  cautious: play(cautious(params, UNGATED)),
  aggressive: play(aggressive(params, UNGATED)),
  historical: play(historical(params, UNGATED)),
};

describe('R6: the map-first policies', () => {
  it.each(Object.entries(runs))('%s reaches the visit and gives no M4 project commit', (_name, { rec, acts }) => {
    expect(rec.final.ended?.reason).toBe('visit');
    expect(acts.some((a) => a.type === 'commit_project')).toBe(false);
    const logged = rec.final.actionLog.map((e) => e.action.type);
    expect(logged).not.toContain('commit_project');
  });

  it('aggressive and historical build roads, service cells and place sources through the works queue', () => {
    for (const { rec } of [runs.aggressive, runs.historical]) {
      const s = rec.final;
      expect(s.roads.length).toBeGreaterThan(0);
      expect(s.cellWorks.some((w) => w.stage === 'serviced')).toBe(true);
      expect(s.structures.some((x) => x.kind === 'power_substation')).toBe(true);
      expect(s.worksOrders.every((o) => o.kind === 'road' || o.kind === 'service' || o.kind === 'structure')).toBe(true);
    }
  });

  it('servicing is phased: no service order is larger than its crew share of a quarter', () => {
    for (const [plan, { rec }] of [[AGGRESSIVE_PLAN, runs.aggressive], [HISTORICAL_PLAN, runs.historical],
      [CAUTIOUS_PLAN, runs.cautious]] as const) {
      // R8a: a cell's units follow its land cover, so the cap is in units, not cells
      const cap = Math.floor(plan.crew_share * 3 * params.capacity.local_crew);
      for (const o of rec.final.worksOrders.filter((x) => x.kind === 'service')) {
        expect(o.unitsTotal).toBeLessThanOrEqual(cap);
      }
      // one service order at a time
      const live = (s: GameState) => s.worksOrders.filter((o) => o.kind === 'service' && (o.stage === 'queued' || o.stage === 'working'));
      for (const s of rec.quarterEnds) expect(live(s).length).toBeLessThanOrEqual(1);
    }
  });

  it('the historical plan draws the Shangbu template zone and the road reaches it', () => {
    const s = runs.historical.rec.final;
    const z = s.zones.find((x) => x.template === 'precedent.zone.shangbu_industrial')!;
    expect(z).toBeDefined();
    const roads = plannedRoads(s, UNGATED), w = s.grid.width;
    expect(cellsOfRuns(z.runs, s.grid).some((c) => [c - 1, c + 1, c - w, c + w].some((n) => roads.has(n)))).toBe(true);
    expect(s.firms.some((f) => f.zone === z.id && f.origin === 'organic')).toBe(true);
  });

  it('zones take the cells nearest a road, and no zone takes a plan road cell', () => {
    const s = fresh();
    const acts = planZones(s, UNGATED, AGGRESSIVE_PLAN);
    expect(acts.length).toBe(AGGRESSIVE_PLAN.zones.length);
    const roads = plannedRoads(s, UNGATED), w = s.grid.width;
    const first = cellsNearRoad(s, UNGATED, 7, 1, new Set())[0]!;
    expect([first - 1, first + 1, first - w, first + w].some((n) => roads.has(n))).toBe(true);
    const zoned = acts.flatMap((a) => (a.type === 'create_zone' ? cellsOfRuns(a.runs, s.grid) : []));
    expect(new Set(zoned).size).toBe(zoned.length);
    const [x0, y0] = AGGRESSIVE_PLAN.roads[0]![0]!;
    expect(zoned).not.toContain(y0 * w + x0);
  });

  it('cautious never takes the loan, so it builds only what its money covers', () => {
    const s = runs.cautious.rec.final;
    expect(s.fiscal.projectLoan).not.toBe('taken');
    expect(s.structures.length).toBeLessThanOrEqual(2 * CAUTIOUS_PLAN.utilities.max_sources);
  });

  it('the historical run passes the snapshot bands (§9.1), as historicalPrologue does', () => {
    const rec = runs.historical.rec;
    const bands = parse(readRepo('content/slice/snapshot_1980q2.yaml')) as BandRecord[];
    const claims = new Map<string, ClaimInfo>();
    for (const f of ['data/evidence/claims/phase1_statistics.yaml']) {
      for (const c of parse(readRepo(f)) as { id: string; value: number; status: string }[]) claims.set(c.id, { value: c.value, status: c.status });
    }
    const run = { at: (m: number) => stateAfter(rec, m), final: rec.final, params };
    const out = checkBands(bands, claims, run, { start: rec.final.scenario.start, baseMonths: 12 });
    expect(out.length).toBeGreaterThan(0);
    // the 1979 spending ratio is a fiscal band the policy's works do not set; the population, GDP and export bounds hold
    for (const b of out.filter((x) => !x.id.endsWith('spending_to_revenue'))) expect([b.id, b.result]).toEqual([b.id, 'pass']);
  });
});
