/** M2's tests (phase1-slice.md §5.2): rest, a fixture job shock, stability, invariants and determinism. */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Rng, VILLAGE_ARCHETYPES, createInitialState, createTickSteps, isMigrant, largestRemainder, loadGame, replay, runMonths, saveFromJson,
  saveGame, saveToJson, step, stochRound, validateParams, type GameState, type SimEvent, type StartContent, type TickStep,
} from '../src/index.js';
import { bedsByPool, illegalShare, villageM2 } from '../src/systems/common.js';
import { labourForce, unemploymentRate } from '../src/systems/labour.js';
import { MONTHS, ROOT, areasJson, content, initial, params, scenario, start } from './fixtures.js';

const STEPS = createTickSteps(params);
const SHOCK_MONTH = 6;
const SHOCK = { 7: 3000, 2: 1000 } as const;          // factory jobs added to baseJobs: a stand-in for M3's investors

/** The fixture shock: the investment step adds factory jobs once, at SHOCK_MONTH. */
const shocked = (jobs: Readonly<Record<number, number>> = SHOCK, at = SHOCK_MONTH): TickStep[] => STEPS.map((s) =>
  s.name !== 'investment' ? s : { name: 'investment', run: (ctx) => {
    if (ctx.state.history.months.length !== at) return;
    for (const [area, n] of Object.entries(jobs)) {
      ctx.state.labour.baseJobs.find((r) => r.area === Number(area) && r.sector === 'factory')!.jobs += n;
    }
  } });

const withTurns = (turns: number, mut?: (s: GameState) => void) => {
  const s = createInitialState({ scenario: { ...scenario, turns }, areas: areasJson, start, params });
  mut?.(s);
  return s;
};
const migrantsOf = (s: GameState) => s.pops.reduce((a, g) => a + (isMigrant(g.kind) ? g.size : 0), 0);
const startMigrants = migrantsOf(initial());
const shockJobs = Object.values(SHOCK).reduce((a, b) => a + b, 0);

/** Run month by month, calling check after each with the month's events. */
function walk(s0: GameState, months: number, rng: Rng, steps: readonly TickStep[],
  check: (before: GameState, after: GameState, events: SimEvent[]) => void): GameState {
  let s = s0;
  for (let i = 0; i < months; i++) {
    const r = step(s, [], rng, steps);
    if (r.status !== 'advanced') throw new Error(`month ${i}: ${r.status}`);
    check(s, r.state, r.events);
    s = r.state;
  }
  return s;
}

describe('M2 params and start', () => {
  it('rejects nulls, non-finite numbers and bad keys', () => {
    const raw = () => parse(readFileSync(join(ROOT, 'params/slice.yaml'), 'utf8')) as Record<string, any>;
    expect(() => validateParams(raw())).not.toThrow();
    const a = raw(); a.migration.K_vac = null;
    expect(() => validateParams(a)).toThrow(/K_vac is not set/);
    const b = raw(); b.housing.base_rent = Number.NaN;
    expect(() => validateParams(b)).toThrow(/finite/);
    const c = raw(); delete c.labour.participation.villager;
    expect(() => validateParams(c)).toThrow(/missing/);
    const d = raw(); d.housing.m2_per_bed.dormitory = 0;
    expect(() => validateParams(d)).toThrow(/> 0/);
    const e = raw(); e.migration.spring.away_months = [12];
    expect(() => validateParams(e)).toThrow(/0\.\.11/);
    const f = raw(); f.housing.crowding_max = 0.9;
    expect(() => validateParams(f)).toThrow(/crowding_max/);
    const g = raw(); g.village_build.duration_months = 2.5;
    expect(() => validateParams(g)).toThrow(/duration_months/);
  });

  it('builds the start from start_1979.yaml, with the housing market at rest', () => {
    const s = initial();
    for (const a of start.areas) for (const [kind, n] of Object.entries(a.pops)) {
      expect(s.pops.find((g) => g.area === a.area && g.kind === kind)?.size ?? 0).toBe(n);
    }
    for (const g of s.pops) {
      expect(g.stayedSixMonths).toBe(g.size);
      expect(g.present).toBe(g.size);
    }
    const H = params.housing;
    for (const m of s.housing) {
      const b = s.blocks.find((x) => x.area === m.area)!;
      expect(m.beds).toEqual(bedsByPool(b, params));
      expect(m.rent).toBeCloseTo(H.base_rent * Math.max(m.crowding, H.crowding_floor) ** H.rent_elasticity, 12);
    }
  });

  it('rounds people to integers with a seeded draw, and splits totals by largest remainder', () => {
    const r = new Rng(5).stream('x');
    const draws = Array.from({ length: 2000 }, () => stochRound(2.25, r));
    expect(new Set(draws)).toEqual(new Set([2, 3]));
    expect(draws.reduce((a, b) => a + b, 0) / draws.length).toBeCloseTo(2.25, 1);
    expect(() => stochRound(-1, r)).toThrow();
    expect(largestRemainder(10, [1, 1, 1])).toEqual([4, 3, 3]);     // the tie goes to the lower index
    expect(largestRemainder(5, [0, 0])).toEqual([0, 0]);
  });
});

describe('M2 at rest', () => {
  it.each([1, 2, 3])('holds still for 63 months without a shock (seed %i)', (seed) => {
    const s = runMonths(initial(), MONTHS, new Rng(seed), undefined, STEPS);
    const h = s.history;
    const within = (xs: number[], tol: number) => {
      for (const x of xs) expect(Math.abs(x - xs[0]!)).toBeLessThanOrEqual(tol * Math.abs(xs[0]!));
    };
    within(h.registered, 0.02);
    within(h.resident, 0.02);
    within(h.migrants, 0.02);
    within(h.rent, 0.02);
    within(h.crowding, 0.02);
    expect(Math.max(...h.underConstructionM2)).toBe(0);
    expect(h.inflow.every((x) => x === 0) && h.outflow.every((x) => x === 0)).toBe(true);
    expect(s.blocks.every((b) => b.events.length === 0)).toBe(true);
  });

  it('takes the Spring Festival away from present, not from usual residence', () => {
    const s = runMonths(initial(), MONTHS, new Rng(1), undefined, STEPS);
    const h = s.history;
    const size = h.registered[0]! + h.migrants[0]! + s.pops.filter((g) => g.kind === 'hk_manager').reduce((a, g) => a + g.size, 0);
    const away = params.migration.spring.away_months;
    // the festival runs before matching, so each away month's record shows the dip, the start month included
    h.months.forEach((ym, i) => {
      if (away.includes(ym % 12)) expect(h.present[i]!).toBeLessThan(size);
      else expect(h.present[i]).toBe(size);
      expect(h.migrants[i]).toBe(h.migrants[0]);
    });
  });
});

describe('M2 fixture job shock', () => {
  const run = (seed: number, mut?: (s: GameState) => void) => {
    const s0 = withTurns(scenario.turns, mut);
    return runMonths(s0, MONTHS, new Rng(seed), undefined, shocked());
  };

  it('runs the loop: jobs, then migrants, then crowding and rent, then village floors', () => {
    const s = run(1);
    const h = s.history;
    const first = (xs: number[], f: (x: number) => boolean) => xs.findIndex(f);
    const jobsUp = first(h.jobs.factory, (x) => x > h.jobs.factory[0]!);
    const inflow = first(h.inflow, (x) => x > 0);
    const crowded = first(h.crowding, (x) => x > 1);
    const building = first(h.underConstructionM2, (x) => x > 0);
    const moreBeds = first(h.rentalBeds, (x) => x > h.rentalBeds[0]!);
    expect(jobsUp).toBe(SHOCK_MONTH);
    expect(inflow).toBe(SHOCK_MONTH);
    expect(crowded).toBeGreaterThanOrEqual(inflow);   // occupancy is refreshed at the end of migration
    expect(building).toBeGreaterThan(crowded);
    expect(moreBeds).toBeGreaterThanOrEqual(building + params.village_build.duration_months);
    expect(Math.max(...h.rent)).toBeGreaterThan(1.5 * h.rent[0]!);
    expect(h.migrants[MONTHS - 1]!).toBeGreaterThan(10 * startMigrants);
    expect(h.rentalBeds[MONTHS - 1]!).toBeGreaterThan(5 * h.rentalBeds[0]!);
    expect(s.labour.wage.factory).toBeGreaterThan(params.labour.wage_start.factory);
  });

  it('builds unpermitted floors above the legal height when enforcement is low, and none when it is high', () => {
    const low = run(1, (s) => { s.policy.enforcement = 'low'; });
    const lowIllegal = low.blocks.flatMap((b) => b.cohorts.filter((c) => c.stage === 'completed' && c.legality === 'unpermitted_tolerated'));
    expect(lowIllegal.length).toBeGreaterThan(0);
    expect(Math.max(...low.areas.map((a) => a.illegalFloorShare))).toBeGreaterThan(0);   // where depends on spillover
    // permitted village floor stays within the legal height (unless the start already exceeded it)
    for (const b of low.blocks) {
      const plot = low.villagePlots.find((v) => v.area === b.area)!;
      const permitted = b.cohorts.filter((c) => VILLAGE_ARCHETYPES.includes(c.archetype) && c.legality === 'permitted'
        && (c.stage === 'completed' || c.stage === 'under_construction')).reduce((a, c) => a + c.m2, 0);
      const startVillage = villageM2(initial().blocks.find((x) => x.area === b.area)!, ['completed']);
      expect(permitted).toBeLessThanOrEqual(Math.max(startVillage, plot.footprintM2 * params.village_build.legal_floors));
    }
    const high = run(1, (s) => { s.policy.enforcement = 'high'; });
    expect(params.village_build.enforcement_max_floors.high).toBeLessThanOrEqual(params.village_build.legal_floors);
    expect(high.blocks.every((b) => b.cohorts.every((c) => c.legality === 'permitted'))).toBe(true);
    expect(high.areas.every((a) => a.illegalFloorShare === 0)).toBe(true);
  });
});

describe('M2 stability', () => {
  it('draws migrants into a slice that starts with none', () => {
    const none: StartContent = { ...start, areas: start.areas.map((a) => ({
      ...a, pops: { ...a.pops, migrant_factory: 0, migrant_construction: 0 } })) };
    const s0 = createInitialState({ scenario, areas: areasJson, start: none, params });
    expect(migrantsOf(s0)).toBe(0);
    const s = runMonths(s0, 18, new Rng(1), undefined, shocked());
    expect(s.history.inflow.slice(SHOCK_MONTH, SHOCK_MONTH + 3).some((x) => x > 0)).toBe(true);
    expect(migrantsOf(s)).toBeGreaterThan(100);
  });

  it.each([1, 2, 3, 4, 5])('keeps the migrant stock bounded by beds and jobs under the shock (seed %i)', (seed) => {
    const cap = params.housing.crowding_max;
    walk(initial(), MONTHS, new Rng(seed), shocked(), (_b, s) => {
      for (const m of s.housing) {
        const here = s.pops.reduce((a, g) => a + (g.area === m.area && isMigrant(g.kind) ? g.size : 0), 0);
        expect(here).toBeLessThanOrEqual(Math.floor(cap * m.beds.rental));
      }
      // the jobs ceiling: the start stock plus the shock's workers and a margin for construction crews
      expect(migrantsOf(s)).toBeLessThanOrEqual(startMigrants + Math.ceil(1.15 * shockJobs / params.labour.participation.migrant_factory));
    });
  });

  it('settles rent after the shock, without growing swings', () => {
    const months = 240;
    const s = runMonths(withTurns(months / 3), months, new Rng(1), undefined, shocked());
    const rent = s.history.rent;
    const final = rent[months - 1]!;
    for (let i = 120; i < months; i++) expect(Math.abs(rent[i]! - final)).toBeLessThan(0.01 * final);
    const swing = (a: number, b: number) => Math.max(...rent.slice(a + 1, b).map((x, i) => Math.abs(x - rent[a + i]!)));
    expect(swing(180, 240)).toBeLessThanOrEqual(swing(60, 120));
    expect(Math.abs(s.history.crowding[months - 1]! - 1)).toBeLessThan(0.1);
  });
});

/** Hard rule 5 for one month: people conserved through flow events, and every stock whole. */
function checkInvariants(before: GameState, s: GameState, events: SimEvent[]): void {
  const flows = new Map<string, number>();
  for (const e of events) if (e.kind === 'flow') {
    const d = e.detail as { area: number; pop: string; inflow: number; outflow: number };
    const k = `${d.area}:${d.pop}`;
    flows.set(k, (flows.get(k) ?? 0) + d.inflow - d.outflow);
  }
  for (const g of s.pops) {
    const was = before.pops.find((x) => x.area === g.area && x.kind === g.kind)?.size ?? 0;
    expect(g.size - was).toBe(flows.get(`${g.area}:${g.kind}`) ?? 0);
    expect(g.size).toBe(g.stayedSixMonths + g.underSix.reduce((a, b) => a + b, 0));
    for (const n of [g.size, g.stayedSixMonths, g.present, ...g.underSix, ...Object.values(g.employed)]) {
      expect(Number.isInteger(n) && n >= 0).toBe(true);
    }
    expect(g.present).toBeLessThanOrEqual(g.size);
    expect(Object.values(g.employed).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(labourForce(g, params));
    if (!isMigrant(g.kind)) expect(g.size).toBe(was);              // births and deaths are zero in M2
  }
  for (const r of s.labour.jobs) expect(r.jobs >= 0 && r.filled >= 0 && r.filled <= r.jobs).toBe(true);
  for (const sec of Object.keys(s.labour.wage) as (keyof typeof s.labour.wage)[]) {
    const filled = s.labour.jobs.reduce((a, r) => a + (r.sector === sec ? r.filled : 0), 0);
    expect(s.pops.reduce((a, g) => a + g.employed[sec], 0)).toBe(filled);
  }
  for (const b of s.blocks) {
    for (const c of b.cohorts) expect(c.m2).toBeGreaterThan(0);
    const m = s.housing.find((x) => x.area === b.area)!;
    expect(m.beds).toEqual(bedsByPool(b, params));
    expect(s.areas.find((a) => a.id === b.area)!.illegalFloorShare).toBe(illegalShare(b));
    const plot = s.villagePlots.find((v) => v.area === b.area)!;
    const maxFloors = Math.min(params.eras[0]!.structural_max_floors, params.village_build.enforcement_max_floors[s.policy.enforcement]);
    const startVillage = villageM2(initial().blocks.find((x) => x.area === b.area)!, ['completed']);
    expect(villageM2(b, ['completed', 'under_construction'])).toBeLessThanOrEqual(Math.max(startVillage, plot.footprintM2 * maxFloors));
  }
}

/** Factory-job changes through the investment step: [month index, area, delta]. */
const jobChanges = (changes: [number, number, number][], base: readonly TickStep[]): TickStep[] => base.map((s) =>
  s.name !== 'investment' ? s : { name: 'investment', run: (ctx) => {
    for (const [at, area, n] of changes) if (ctx.state.history.months.length === at) {
      const row = ctx.state.labour.baseJobs.find((r) => r.area === area && r.sector === 'factory')!;
      row.jobs = Math.max(0, row.jobs + n);
    }
  } });

describe('M2 invariants', () => {
  it.each([1, 2, 3, 4, 5])('conserves people through flows and keeps every stock whole (seed %i)', (seed) => {
    walk(withTurns(scenario.turns, (s) => { if (seed % 2) s.policy.enforcement = 'low'; }), MONTHS, new Rng(seed), shocked(),
      checkInvariants);
  });

  it('conserves people when every exit fires: base exit, festival non-return, unemployment after a job cut', () => {
    // the start params set both exit rates to 0 (§5.2); turn them on so these branches run
    const churn = validateParams({ ...params, migration: { ...params.migration, base_exit: 0.01,
      spring: { ...params.migration.spring, nonreturn: 0.1 } } });
    const away = churn.migration.spring.away_months;
    const returnMonth = away.map((m) => (m + 1) % 12).find((m) => !away.includes(m))!;   // the first month after
    const steps = jobChanges([[SHOCK_MONTH, 7, 3000], [SHOCK_MONTH, 2, 1000], [36, 7, -2500]], createTickSteps(churn));
    const out = { ret: [] as number[], other: [] as number[] };
    let unemployed = 0;
    walk(initial(), MONTHS, new Rng(7), steps, (before, s, events) => {
      checkInvariants(before, s, events);
      const o = events.reduce((a, e) => a + (e.kind === 'flow' ? (e.detail!.outflow as number) : 0), 0);
      (s.history.months.at(-1)! % 12 === returnMonth ? out.ret : out.other).push(o);
      unemployed = Math.max(unemployed, ...s.pops.filter((g) => isMigrant(g.kind)).map((g) => unemploymentRate(g, churn)));
    });
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(out.other)).toBeGreaterThan(0);                       // base exit
    expect(mean(out.ret)).toBeGreaterThan(2 * mean(out.other));       // the festival's non-return on top
    expect(unemployed).toBeGreaterThan(0.1);                          // the cut leaves migrants out of work
  });

  it('sends the excess above crowding_max away as an outflow, newest arrivals first', () => {
    const s0 = initial();
    const m = s0.housing.find((x) => x.area === 1)!;
    const cap = Math.floor(params.housing.crowding_max * m.beds.rental);
    const migrants = (s: GameState) => s.pops.filter((x) => x.area === 1 && isMigrant(x.kind));
    const g = migrants(s0).find((x) => x.kind === 'migrant_factory')!;
    const stayed = g.stayedSixMonths;
    const extra = cap + 200 - migrants(s0).reduce((a, x) => a + x.size, 0);
    g.size += extra; g.underSix[0] += extra; g.present += extra;      // newcomers, well over the cap
    const r = step(s0, [], new Rng(3), STEPS);
    if (r.status !== 'advanced') throw new Error(r.status);
    expect(r.events.some((e) => e.kind === 'flow' && e.detail?.reason === 'crowding_cap')).toBe(true);
    checkInvariants(s0, r.state, r.events);
    expect(migrants(r.state).reduce((a, x) => a + x.size, 0)).toBeLessThanOrEqual(cap);
    expect(migrants(r.state).find((x) => x.kind === 'migrant_factory')!.stayedSixMonths).toBe(stayed);
  });
});

describe('M2 determinism under the shock', () => {
  const steps = shocked();
  const full = (seed: number) => {
    const rng = new Rng(seed);
    const s = runMonths(initial(), MONTHS, rng, undefined, steps);
    return { s, rng, text: saveToJson(saveGame(s, rng, content)) };
  };

  it('gives the same run for the same seed, and a different one for another', () => {
    expect(full(21).text).toBe(full(21).text);
    expect(full(21).text).not.toBe(full(22).text);
  });

  it('matches an uninterrupted run after save, load and continue', () => {
    const a = full(21);
    for (const k of [5, 7, 30, 62]) {
      const rng = new Rng(21);
      const mid = runMonths(initial(), k, rng, undefined, steps);
      const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rng, content))));
      expect(loaded.header.content.params_sha256).toBe(content.params_sha256);
      const end = runMonths(loaded.state, MONTHS - k, loaded.rng, undefined, steps);
      expect(saveToJson(saveGame(end, loaded.rng, content))).toBe(a.text);
    }
  });

  it('replays from the seed and an empty action log', () => {
    const a = full(21);
    const rng = new Rng(21);
    expect(saveToJson(saveGame(replay(initial(), [], MONTHS, rng, steps), rng, content))).toBe(a.text);
  });

  it('does not change the state it was given, mid-boom', () => {
    const mid = runMonths(initial(), 30, new Rng(4), undefined, steps);
    const before = saveToJson(saveGame(mid, new Rng(4), content));
    step(mid, [], new Rng(4), steps);
    expect(saveToJson(saveGame(mid, new Rng(4), content))).toBe(before);
  });
});

describe('M2 labour and allocation fairness', () => {
  it('shares cross-area workers across areas by vacancies, not by area id', () => {
    // equal new services vacancies in areas 1 and 7, more than the slice's idle workers can fill: first-come
    // would staff area 1 fully and leave area 7 all the shortage
    const s0 = initial();
    for (const a of [1, 7]) s0.labour.baseJobs.find((r) => r.area === a && r.sector === 'services')!.jobs += 400;
    const r = step(s0, [], new Rng(1), STEPS);
    if (r.status !== 'advanced') throw new Error(r.status);
    const vacant = (a: number) => {
      const row = r.state.labour.jobs.find((x) => x.area === a && x.sector === 'services')!;
      return row.jobs - row.filled;
    };
    expect(vacant(1)).toBeGreaterThan(0);
    expect(vacant(7)).toBeGreaterThan(0);
    expect(vacant(7)).toBeLessThan(400);                        // area 7 got cross-area workers too
    expect(Math.abs(vacant(1) - vacant(7))).toBeLessThan(0.25 * 400);
  });

  it('sends migrants who find no bed in a full area to the other areas with free beds', () => {
    const s0 = initial();
    const m = s0.housing.find((x) => x.area === 7)!;
    const g = s0.pops.find((x) => x.area === 7 && x.kind === 'migrant_factory')!;
    const fill = Math.floor(params.housing.crowding_max * m.beds.rental) - s0.pops
      .filter((x) => x.area === 7 && isMigrant(x.kind)).reduce((a, x) => a + x.size, 0);
    g.size += fill; g.stayedSixMonths += fill; g.present += fill;     // area 7 is full to the cap
    const r = step(s0, [], new Rng(1), shocked({ 7: 3000 }, 0));
    if (r.status !== 'advanced') throw new Error(r.status);
    const arrivals = r.events.filter((e) => e.kind === 'flow' && (e.detail!.inflow as number) > 0);
    const into = (f: (a: number) => boolean) => arrivals.reduce((a, e) => a + (f(e.detail!.area as number) ? (e.detail!.inflow as number) : 0), 0);
    // area 7 has the vacancies but only the beds its outflow just freed: most newcomers live elsewhere
    expect(into((a) => a !== 7)).toBeGreaterThan(into((a) => a === 7));
  });
});

describe('M2 policy actions', () => {
  it('applies and logs enforcement and permit actions, and replays them', () => {
    const rng = new Rng(2);
    const r = step(initial(), [{ type: 'set_enforcement', level: 'low' }, { type: 'set_permit_regime', regime: 'loose' }], rng, shocked());
    if (r.status !== 'advanced') throw new Error(r.status);
    expect(r.state.policy).toEqual({ enforcement: 'low', permitRegime: 'loose' });
    expect(r.state.actionLog.map((e) => e.action.type)).toEqual(['set_enforcement', 'set_permit_regime']);
    const end = runMonths(r.state, 10, rng, undefined, shocked());
    const rng2 = new Rng(2);
    const again = replay(initial(), end.actionLog, 11, rng2, shocked());
    expect(saveToJson(saveGame(again, rng2, content))).toBe(saveToJson(saveGame(end, rng, content)));
    expect(() => step(initial(), [{ type: 'set_enforcement', level: 'none' as 'low' }], new Rng(1), STEPS)).toThrow(/enforcement/);
  });

  it('applies no turn action while an interrupting card is unanswered', () => {
    const raise: TickStep[] = STEPS.map((st) => st.name !== 'events' ? st : { name: 'events', run: (ctx) => {
      if (ctx.state.history.months.length === 0) ctx.raise({ card: 'fixture.stop', options: ['a'], interrupting: true });
    } });
    const rng = new Rng(3);
    const r1 = step(initial(), [], rng, raise);
    const card = r1.state.pendingCards[0]!;
    const paused = step(r1.state, [{ type: 'set_enforcement', level: 'high' }], rng, raise);
    expect(paused.status).toBe('paused');
    expect(paused.state.policy.enforcement).toBe(initial().policy.enforcement);
    expect(paused.state.actionLog).toHaveLength(0);
    const ok = step(r1.state, [{ type: 'set_enforcement', level: 'high' }, { type: 'answer_card', instance: card.id, option: 'a' }], rng, raise);
    expect(ok.status).toBe('advanced');
    expect(ok.state.policy.enforcement).toBe('high');
    expect(ok.state.actionLog.map((e) => e.action.type)).toEqual(['answer_card', 'set_enforcement']);   // answers first
  });

  it('draws more migrants under a loose permit regime than a strict one, while beds are free; residence follows after six months', () => {
    const run = (regime: 'loose' | 'strict') => {
      const rng = new Rng(5);
      const first = step(initial(), [{ type: 'set_permit_regime', regime }], rng, shocked());
      if (first.status !== 'advanced') throw new Error(first.status);
      return runMonths(first.state, 23, rng, undefined, shocked()).history;
    };
    const loose = run('loose'), strict = run('strict');
    // the first month of the shock, before the beds bind (later both fill every bed under the cap)
    expect(loose.inflow[SHOCK_MONTH]!).toBeGreaterThan(strict.inflow[SHOCK_MONTH]!);
    // newcomers count as resident only after six months in the queue
    const gap = (i: number) => loose.resident[i]! - strict.resident[i]!;
    expect(Math.abs(gap(SHOCK_MONTH + 5))).toBeLessThan(20);           // only outflow differences so far
    expect(gap(SHOCK_MONTH + 6)).toBeGreaterThan(Math.abs(gap(SHOCK_MONTH + 5)) + 20);
  });
});
