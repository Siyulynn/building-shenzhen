/** R4: jobs, labour and migration on the map (phase1-slice §5.11, §12 R4). */
import { describe, expect, it } from 'vitest';
import {
  Rng, SAVE_VERSION, addServicedLand, applyTurnAction, applyZoneAction, createTickSteps, inducedServiceJobs, loadGame, placeStructure,
  post, runMonths, saveFromJson, saveGame, saveToJson, type CellRuns, type GameState, type TickContent,
} from '../src/index.js';
import { content, initial, params, slice } from './fixtures.js';
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

describe('R4: matching keeps incumbents and reaches only by road', () => {
  /** Factory jobs added to an area's base jobs, as a stand-in for new posts. */
  const shock = (s: GameState, area: number, n: number) => { s.labour.baseJobs.find((j) => j.area === area && j.sector === 'factory')!.jobs += n; };
  const holders = (s: GameState, f: (h: GameState['labour']['held'][number]) => boolean) =>
    s.labour.held.reduce((n, h) => n + (f(h) ? h.n : 0), 0);

  it('a vacancy in an area no road joins to another is not filled from that area; without the network it is', () => {
    const s = run(initial(), 2);
    shock(s, 2, 500);                                                  // area 2 has no road at the start
    const onMap = run(s, 1);
    expect(holders(onMap, (h) => h.area === 2 && h.home !== 2)).toBe(0);
    const offMap = run(s, 1, createTickSteps(params));                 // M2's fixtures: every area reaches every other
    expect(holders(offMap, (h) => h.area === 2 && h.home !== 2)).toBeGreaterThan(0);
  });

  it("a job shock in one sector leaves the other sectors' holders in place and pulls migrants into the vacancy", () => {
    const s = run(initial(), 2);
    const before = (sec: string) => holders(s, (h) => h.area === 7 && h.sector === sec);
    shock(s, 7, 1500);
    let inflow = 0;
    const end = walk(s, 6, new Rng(2), STEPS, (b, a, e) => {
      checkInvariants(b, a, e); checkLedger(b, a);
      for (const x of e) if (x.kind === 'flow' && x.step === 'migration') inflow += (x.detail as { inflow: number }).inflow;
    });
    for (const sec of ['state', 'farming_fishing', 'services'] as const) {
      expect(holders(end, (h) => h.area === 7 && h.sector === sec)).toBe(before(sec));
    }
    expect(inflow).toBeGreaterThan(0);
    const migrantsIn = (t: GameState) => holders(t, (h) => h.area === 7 && h.sector === 'factory' && h.kind === 'migrant_factory');
    expect(migrantsIn(end)).toBeGreaterThan(migrantsIn(s));

    // the posts go: their holders are laid off, and the laid-off migrants leave, people and money conserved
    shock(end, 7, -1500);
    let outflow = 0;
    const later = walk(end, 12, new Rng(5), STEPS, (b, a, e) => {
      checkInvariants(b, a, e); checkLedger(b, a);
      for (const x of e) if (x.kind === 'flow' && x.step === 'migration') outflow += (x.detail as { outflow: number }).outflow;
    });
    const migrants = (t: GameState) => t.pops.reduce((n, g) => n + (g.kind === 'migrant_factory' ? g.size : 0), 0);
    expect(migrantsIn(later)).toBeLessThan(migrantsIn(end));
    expect(outflow).toBeGreaterThan(0);
    expect(migrants(later)).toBeLessThan(migrants(end));
  });

  it('turnover lets idle locals into jobs migrants held, ahead of them in the fill order; with none, migrants keep them', () => {
    // area 2 (no road): service jobs beyond its locals draw migrants; then idle urban residents arrive
    const s = run(initial(), 2);
    s.labour.baseJobs.find((j) => j.area === 2 && j.sector === 'services')!.jobs += 300;
    const t = run(s, 12);
    const migrantServices = (x: GameState) => holders(x, (h) => h.area === 2 && h.sector === 'services' && h.kind === 'migrant_factory');
    expect(migrantServices(t)).toBeGreaterThan(50);
    const g = t.pops.find((x) => x.area === 2 && x.kind === 'urban_resident')!;
    g.size += 600; g.stayedSixMonths += 600; g.present += 600;
    const still = createTickSteps({ ...params, labour: { ...params.labour, turnover_month: 0 } }, TICK);
    const churn = walk(t, 24, new Rng(8), STEPS, (b, a, e) => checkInvariants(b, a, e));
    const none = walk(t, 24, new Rng(8), still, (b, a, e) => checkInvariants(b, a, e));
    // without turnover the migrants keep their jobs (less those who leave); with it, idle locals take some of them
    expect(migrantServices(churn)).toBeLessThan(migrantServices(none));
    // deterministic: no draw, so the same seed gives the same holders
    expect(walk(t, 24, new Rng(8), STEPS, () => {}).labour.held).toEqual(churn.labour.held);
  });
});

describe('R4: arrivals who find no bed', () => {
  /** Every rental bed taken by idle construction migrants, and factory jobs open in area 7. */
  const full = () => {
    const s = run(initial(), 2);
    for (const m of s.housing) {
      const g = s.pops.find((x) => x.area === m.area && x.kind === 'migrant_construction');
      const here = s.pops.reduce((n, x) => n + (x.area === m.area && (x.kind === 'migrant_factory' || x.kind === 'migrant_construction') ? x.size : 0), 0);
      const add = Math.floor(params.housing.crowding_max * m.beds.rental) - here;
      if (!g || add <= 0) continue;
      g.size += add; g.stayedSixMonths += add; g.present += add;
    }
    s.labour.baseJobs.find((j) => j.area === 7 && j.sector === 'factory')!.jobs += 3000;
    return s;
  };

  it('are recorded, not people; the rent target and the villages answer them a month later', () => {
    let found: GameState | undefined;
    walk(full(), 6, new Rng(3), STEPS, (b, a, e) => {
      checkInvariants(b, a, e);                                        // the turned away are no flow
      if (!found && a.housing.some((m) => m.turnedAway > 0)) found = a;
    });
    expect(found).toBeDefined();
    const s = found!;
    expect(s.history.turnedAway.at(-1)).toBe(s.housing.reduce((n, m) => n + m.turnedAway, 0));
    const area = [...s.housing].sort((x, y) => y.turnedAway - x.turnedAway)[0]!.area;
    const none = structuredClone(s);
    for (const m of none.housing) m.turnedAway = 0;
    const a = run(s, 1, STEPS, 9), b = run(none, 1, STEPS, 9);
    const rent = (t: GameState) => t.housing.find((m) => m.area === area)!.rent;
    expect(rent(a)).toBeGreaterThan(rent(b));
  });

  it('villages build for them: the turned away are unmet beds', () => {
    // a market whose rent already passes the build test, with every occupant in a bed: only the turned away are unmet
    const s = run(initial(), 2);
    const m = s.housing.find((x) => x.area === 7)!;
    m.rent = 5; m.crowding = 1; m.occupants.rental = m.beds.rental;
    const none = structuredClone(s);
    m.turnedAway = 300;
    const starts = (t: GameState) => t.blocks.find((x) => x.area === 7)!.cohorts
      .reduce((n, c) => n + (c.archetype === 'village_rental' && c.stage === 'under_construction' ? c.m2 : 0), 0);
    const a = run(s, 1, STEPS, 9), b = run(none, 1, STEPS, 9);
    expect(starts(b)).toBe(starts(none));
    expect(starts(a)).toBeGreaterThan(starts(b));
  });
});

describe('R4: construction jobs during works', () => {
  const WORKS_STEPS = createTickSteps({ ...params, works: { ...params.works!, crew_per_order: 30 } }, TICK);

  it('a funded works order posts construction jobs where it works, and they go when it is done', () => {
    const s = initial();
    post(s, 'grant', 'general', 5_000_000, 'test.fund');
    applyZoneAction(s, { type: 'create_zone', use: 'industrial', runs: CONNECTED });
    applyTurnAction(s, { type: 'commit_works', zone: 1 }, WORKS_STEPS);
    const area = s.zones[0]!.area;
    const construction = (t: GameState) => t.labour.jobs.find((r) => r.area === area && r.sector === 'construction')!.jobs;
    let during = 0, after = -1, peak = 0;
    const builders = (t: GameState) => t.pops.reduce((n, g) => n + (g.kind === 'migrant_construction' ? g.size : 0), 0);
    const end = walk(s, 30, new Rng(1), WORKS_STEPS, (b, a, e) => {
      checkInvariants(b, a, e); checkLedger(b, a);
      peak = Math.max(peak, builders(a));
      const crew = e.filter((x) => x.kind === 'crew').reduce((n, x) => n + (x.detail!.area === area ? (x.detail!.units as number) : 0), 0);
      if (crew > 0) {
        expect(a.history.constructionPosts.at(-1)).toBeGreaterThanOrEqual(crew);
        during = Math.max(during, construction(a));
      } else if (a.worksOrders[0]!.stage === 'done' && after < 0) after = construction(a);
    });
    expect(end.worksOrders[0]!.stage).toBe('done');
    // finished works owe maintenance on what they cost (§5.11)
    const o = end.worksOrders[0]!;
    expect(end.fiscal.obligations.filter((x) => x.createdBy === `works.${o.id}`)).toMatchObject([
      { kind: 'maintenance', perMonth: Math.round((o.spent * params.works!.maint_rate_year) / 12), from: o.completed! + 1 }]);
    expect(during).toBeGreaterThan(after);
    expect(after).toBeGreaterThanOrEqual(0);
    // the crews' holders are laid off when the works end (idle locals within road reach took the jobs, so no
    // construction migrant came: the departures are traced in the job-shock test)
    expect(peak).toBeGreaterThanOrEqual(builders(s));
  });
});

describe('R4: at rest', () => {
  it('the start on the map stays at rest: no one moves, nobody is turned away, no post appears', () => {
    const s0 = initial();
    const end = walk(s0, 36, new Rng(6), createTickSteps(params, { network: TICK.network!, buildable: TICK.buildable! }), checkInvariants);
    expect(end.pops.map((g) => g.size)).toEqual(s0.pops.map((g) => g.size));
    expect(end.history.turnedAway.every((n) => n === 0)).toBe(true);
    expect(end.history.servicePosts.every((n) => n === 0)).toBe(true);
    expect(end.history.vacancies.every((n) => n === 0)).toBe(true);
    expect(end.labour.wage).toEqual(s0.labour.wage);
  });
});

describe('R4: saves', () => {
  it('save, load and continue matches an uninterrupted run; a version 4 save loads and rematches', () => {
    const s = landed([{ use: 'industrial', runs: CONNECTED }]);
    const rng = new Rng(7);
    const whole = runMonths(s, 20, rng, undefined, STEPS);
    const rngA = new Rng(7);
    const mid = runMonths(s, 9, rngA, undefined, STEPS);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rngA, content))));
    const cont = runMonths(loaded.state, 11, loaded.rng, undefined, STEPS);
    expect(saveToJson(saveGame(cont, loaded.rng, content))).toBe(saveToJson(saveGame(whole, rng, content)));

    const save = saveFromJson(saveToJson(saveGame(mid, new Rng(3), content)));
    const state = structuredClone(save.body.state) as Record<string, any>;
    delete state.labour.held; delete state.labour.servicePosts;
    for (const m of state.housing) delete m.turnedAway;
    for (const k of ['vacancies', 'turnedAway', 'servicePosts', 'constructionPosts']) delete state.history[k];
    const back = loadGame({ ...save, header: { ...save.header, version: 4 }, body: { ...save.body, state } });
    expect(back.state.labour.held).toEqual([]);
    expect(back.state.history.vacancies.length).toBe(back.state.history.months.length);
    // employment stays as saved until the next labour step, which matches once from scratch
    expect(back.state.pops.map((g) => g.employed)).toEqual(mid.pops.map((g) => g.employed));
    walk(back.state, 3, back.rng, STEPS, (b, a, e) => checkInvariants(b, a, e));
    expect(SAVE_VERSION).toBe(5);
  });
});

describe('R4: against an idle run', () => {
  const months = 60;
  const play = (s: GameState) => runMonths(s, months, new Rng(1), undefined, STEPS);
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const employed = (s: GameState) => s.labour.jobs.reduce((n, r) => n + r.filled, 0);
  /** Taxes and land fees posted in the last 12 months: the recurring revenue an occupied city adds. */
  const recurring = (s: GameState) => s.fiscal.ledger.filter((l) => l.date >= s.date - 12 && (l.type === 'tax' || l.type === 'land_fee'))
    .reduce((n, l) => n + l.amount, 0);

  it('servicing and building on connected land gives more accessible vacancies, jobs, arrivals, beds and revenue', () => {
    const busy = play(landed([{ use: 'industrial', runs: CONNECTED }, { use: 'commercial', runs: rect(365, 368, 347, 350) },
      { use: 'residential', runs: rect(369, 372, 347, 350) }]));
    const idle = play(landed([]));
    expect(total(busy.history.vacancies)).toBeGreaterThan(total(idle.history.vacancies));
    expect(employed(busy)).toBeGreaterThan(employed(idle));
    expect(total(busy.history.inflow)).toBeGreaterThan(total(idle.history.inflow));
    expect(busy.history.rentalBeds.at(-1)).toBeGreaterThan(idle.history.rentalBeds.at(-1)!);
    expect(recurring(busy)).toBeGreaterThan(recurring(idle));
    // the occupied city's own lines: land fees on the zones, taxes on formal service posts
    expect(busy.fiscal.ledger.some((l) => l.ref === 'land_fee')).toBe(true);
    expect(busy.history.servicePosts.some((n) => n > 0)).toBe(true);
  });

  it('formal service posts pay tax; informal posts pay nothing', () => {
    const s = landed([{ use: 'industrial', runs: CONNECTED }, { use: 'commercial', runs: rect(365, 368, 347, 350) }]);
    const end = play(s);
    expect(end.labour.servicePosts.some((x) => x.formal > 0)).toBe(true);
    expect(end.fiscal.ledger.filter((l) => l.ref === 'tax.services' && l.date === end.date - 1)).toHaveLength(1);
    // without formal posts there is no service tax
    const none = play(landed([{ use: 'industrial', runs: CONNECTED }]));
    expect(none.labour.servicePosts.every((x) => x.formal === 0)).toBe(true);
    expect(none.fiscal.ledger.filter((l) => l.ref === 'tax.services')).toEqual([]);
  });
});
