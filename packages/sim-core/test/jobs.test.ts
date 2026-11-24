/** R4: jobs, labour and migration on the map (phase1-slice §5.11, §12 R4). */
import { describe, expect, it } from 'vitest';
import {
  Rng, addServicedLand, applyZoneAction, createTickSteps, inducedServiceJobs, placeStructure, runMonths,
  type CellRuns, type GameState, type TickContent,
} from '../src/index.js';
import { initial, params, slice } from './fixtures.js';
import { checkInvariants, checkLedger, walk } from './invariants.js';

const SEZ = 'regime.contracting_1980s';
const TICK: TickContent = { network: slice.tick.network!, buildable: slice.tick.buildable!, fiscal: slice.tick.fiscal! };
const STEPS = createTickSteps(params, TICK);
const G = params.growth!;
const W = slice.init.areas.grid.width;
const cell = (x: number, y: number) => y * W + x;
const rect = (x0: number, x1: number, y0: number, y1: number): CellRuns => {
  const runs: CellRuns = [];
  for (let y = y0; y <= y1; y++) runs.push([y, x0, x1]);
  return runs;
};
// a 4 × 4 block just south of the temporary Guangshen road (row 346), in area 5 (as in R3's tests)
const CONNECTED = rect(361, 364, 347, 350);
const run = (s: GameState, months: number, steps = STEPS, seed = 1) => runMonths(s, months, new Rng(seed), undefined, steps);
const organic = (s: GameState) => s.firms.filter((f) => f.origin === 'organic');
const posted = (s: GameState) => organic(s).reduce((n, f) => n + f.posted, 0);

/** A start with serviced land in `zones`, under the SEZ regime, with ample utilities unless told otherwise. */
function landed(zones: { use: 'industrial' | 'commercial' | 'residential'; runs: CellRuns }[], ample = true): GameState {
  const s = initial();
  s.fiscal.regime = SEZ;
  if (ample) for (const a of s.areas) a.utilities = { powerCap: a.utilities.powerCap + 50_000, waterCap: a.utilities.waterCap + 10_000 };
  for (const z of zones) {
    applyZoneAction(s, { type: 'create_zone', use: z.use, runs: z.runs });
    addServicedLand(s, z.runs);
  }
  return s;
}

describe('R4: industrial jobs after occupancy', () => {
  const kw = G.industrial.firm_jobs * params.industry.by_ownership.hk_processing.power_kw_per_job;
  /** The connected zone, with power for two organic firms in the area's capacity. */
  const tight = () => {
    const s = landed([{ use: 'industrial', runs: CONNECTED }]);
    s.areas.find((a) => a.id === s.zones[0]!.area)!.utilities.powerCap = 2 * kw;
    return s;
  };

  it('posts organic firms\' jobs only once they open', () => {
    const s = run(tight(), 36);
    for (const f of organic(s)) {
      if (f.opens === undefined || f.opens > s.date - 1) expect(f.posted).toBe(0);
    }
    expect(posted(s)).toBeGreaterThan(0);
  });

  it('a placed power source on the zone\'s road raises the share and the posts, without adding to capacity', () => {
    const a = tight();
    const b = tight();
    placeStructure(b, { kind: 'power_source', cell: cell(361, 345), attach: cell(361, 346), capacity: 4 * kw });
    const ea = walk(a, 36, new Rng(1), STEPS, (x, y, e) => { checkInvariants(x, y, e); checkLedger(x, y); });
    const eb = walk(b, 36, new Rng(1), STEPS, (x, y, e) => { checkInvariants(x, y, e); checkLedger(x, y); });
    const area = (s: GameState) => s.areas.find((x) => x.id === s.zones[0]!.area)!;
    expect(area(eb).utilities.powerCap).toBe(area(ea).utilities.powerCap);   // no double count
    expect(organic(eb).length).toBeGreaterThan(organic(ea).length);
    expect(posted(eb)).toBeGreaterThan(posted(ea));
  });
});

describe('R4: service jobs as wages are spent', () => {
  // a commercial block east of the industrial one, on the same road
  const SHOPS = rect(365, 368, 347, 350);
  const sum = (s: GameState, k: 'formal' | 'informal') => s.labour.servicePosts.reduce((n, x) => n + x[k], 0);

  it('new factory wages raise service posts: formal on occupied shop floor, informal where the workers live', () => {
    let formal = 0, informal = 0;
    const end = walk(landed([{ use: 'industrial', runs: CONNECTED }, { use: 'commercial', runs: SHOPS }]), 60, new Rng(1), STEPS,
      (b, a, e) => {
        checkInvariants(b, a, e);
        // never more than the induced jobs from last month's non-service wages
        const induced = [...inducedServiceJobs(b, params).values()].reduce((x, y) => x + y, 0);
        expect(sum(a, 'formal') + sum(a, 'informal')).toBeLessThanOrEqual(induced);
        expect(sum(a, 'formal')).toBeLessThanOrEqual(Math.floor(induced * G.services.formal_share + 1e-9));
        formal = Math.max(formal, sum(a, 'formal')); informal = Math.max(informal, sum(a, 'informal'));
      });
    expect(posted(end)).toBeGreaterThan(0);
    expect(formal).toBeGreaterThan(0);
    expect(informal).toBeGreaterThan(0);
    // formal posts sit where the shops are: the commercial zone's area
    const shopArea = end.zones.find((z) => z.use === 'commercial')!.area;
    expect(end.labour.servicePosts.filter((x) => x.formal > 0).every((x) => x.area === shopArea)).toBe(true);
    // they are jobs: the services rows carry them
    for (const x of end.labour.servicePosts) {
      const base = end.labour.baseJobs.find((j) => j.area === x.area && j.sector === 'services')!.jobs;
      expect(end.labour.jobs.find((r) => r.area === x.area && r.sector === 'services')!.jobs).toBe(base + x.formal + x.informal);
    }
  });

  it('the idle start posts none', () => {
    const end = walk(initial(), 36, new Rng(1), STEPS, checkInvariants);
    expect(end.labour.servicePosts).toEqual([]);
  });
});
