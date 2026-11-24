/**
 * M6a's tests (phase1-slice.md §5.9): one way to load the slice, the measures and band kinds, the policies, the
 * invariants as property tests over seeds and policies, and the speed of a whole run.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  COFINANCING_CARD, LOAN_CARD, Rng, SHORTCUT_CARD, aggressive, cautious, checkBands, claimValue, compileSlice, createInitialState,
  createTickSteps, declineAll, firstOption, historicalPrologue, isFinished, measure, playQuarters, prologueTurns,
  randomPolicy, stateAfter, step, type BandRecord, type ClaimInfo, type DecisionPolicy, type GameState, type PlayRecord,
} from '../src/index.js';
import { buildable, events, params, readRepo, sha256, slice } from './fixtures.js';
import { checkInvariants, checkLedger } from './invariants.js';

const STEPS = createTickSteps(params, slice.tick);
const fresh = () => createInitialState(slice.init);
const play = (policy: DecisionPolicy, seed = 1): PlayRecord => playQuarters(fresh(), new Rng(seed), STEPS, policy);
const answersTo = (s: GameState, card: string) => s.actionLog.flatMap((e) =>
  e.action.type === 'answer_card' && e.action.instance.startsWith(`${card}@`) ? [e.action.option] : []);

describe('M6a: one way to load the slice', () => {
  it('hashes each file with LF endings, as the save header always has', () => {
    expect(slice.content.params_sha256).toBe(sha256(readRepo('params/slice.yaml')));
    expect(slice.content.events_sha256).toBe(sha256(readRepo('content/slice/events.yaml')));
    expect(slice.content.fiscal_sha256).toBe(sha256(['fiscal_regimes', 'projects', 'teams']
      .map((f) => readRepo(`content/slice/${f}.yaml`)).join('\n---\n')));
    expect(slice.content.areas_sha256).toBe(slice.init.areas.areas_sha256);
  });
  it('gives the tick every content module, and the start its leaders', () => {
    for (const k of ['precedents', 'investors', 'buildable', 'fiscal', 'events', 'targets'] as const) expect(slice.tick[k]).toBeDefined();
    expect(slice.init.leaders.length).toBeGreaterThan(0);
    expect(slice.tick.buildable).toBe(buildable);
  });
  it('line endings never change the slice', () => {
    const crlf = (p: string) => readRepo(p).replace(/\r?\n/g, '\r\n');
    const again = compileSlice(crlf, parse, sha256);
    expect(again.content).toEqual(slice.content);
  });
});

// ---- bands on a real run, with claims made up around the measured values ----

describe('M6a: measures and band kinds', () => {
  const rec = play(historicalPrologue);
  const START = rec.final.scenario.start;
  const run = { at: (m: number) => stateAfter(rec, m), final: rec.final, params };
  const s12 = stateAfter(rec, 12)!, s18 = stateAfter(rec, 18)!, s60 = stateAfter(rec, 60)!;
  const res = (s: GameState) => measure(s, 'slice.resident_pop', params);
  const claims = (vals: Record<string, number>, status = 'sourced') =>
    new Map<string, ClaimInfo>(Object.entries(vals).map(([id, value]) => [id, { value, status }]));
  const check = (records: BandRecord[], c: Map<string, ClaimInfo>) =>
    checkBands(records, c, run, { start: START, baseMonths: 12, growthBand: [0.5, 1.5] });

  it('reads each measure from the state at its checkpoint', () => {
    expect(res(s12)).toBe(s12.pops.reduce((a, g) => a + g.stayedSixMonths, 0));
    expect(measure(s18, 'slice.present_pop.temporary', params))
      .toBe(s18.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.present : 0), 0));
    expect(measure(s18, 'slice.exports_usd.year', params) * params.fiscal.forex.yuan_per_usd)
      .toBeCloseTo(s18.history.exports.slice(-12).reduce((a, x) => a + x, 0), 6);
    expect(() => measure(s18, 'slice.nothing', params)).toThrow(/no measure/);
  });

  it('upper_bound passes at its edge and fails just above it; claims below verified are tagged', () => {
    const v = res(s12);
    const band: BandRecord = { id: 'band.1979q4.x', measure: 'slice.resident_pop', applies_as: 'upper_bound', bound: 'c.hi' };
    expect(check([band], claims({ 'c.hi': v }))[0]).toMatchObject({ result: 'pass', value: v,
      claims: [{ id: 'c.hi', status: 'sourced', unverified: true }] });
    expect(check([band], claims({ 'c.hi': v - 1 }))[0]!.result).toBe('fail');
    expect(check([band], claims({ 'c.hi': v }, 'verified'))[0]!.claims[0]!.unverified).toBe(false);
  });

  it('ratio_band and between_ratios use the tolerance around the claims\' ratios', () => {
    const v = measure(s18, 'city.general.spending_over_revenue.trailing_4q', params);
    const ratio: BandRecord = { id: 'band.1980q2.r', measure: 'city.general.spending_over_revenue.trailing_4q',
      applies_as: 'ratio_band', ratio: { numerator: 'n', denominator: 'd' }, tolerance: [0.5, 2] };
    expect(check([ratio], claims({ n: v * 2, d: 1 }))[0]!.result).toBe('pass');          // v = 2v × 0.5
    expect(check([ratio], claims({ n: v * 2.01, d: 1 }))[0]!.result).toBe('fail');
    const between: BandRecord = { ...ratio, applies_as: 'between_ratios', ratio: undefined,
      from: { numerator: 'a', denominator: 'd' }, to: { numerator: 'b', denominator: 'd' }, tolerance: [1, 1] };
    expect(check([between], claims({ a: v * 0.5, b: v, d: 1 }))[0]!.result).toBe('pass');
    expect(check([between], claims({ a: v * 0.5, b: v * 0.99, d: 1 }))[0]!.result).toBe('fail');
  });

  it('growth compares the multiple over end-1979 with the claims\' multiple × the growth band', () => {
    const mult = res(s60) / res(s12);
    const g: BandRecord = { id: 'band.1983q4.g', measure: 'slice.resident_pop', applies_as: 'growth', growth: { from: 'f', to: 't' } };
    const r = check([g], claims({ f: 1, t: mult / 1.5 }))[0]!;            // the upper edge: mult = (mult / 1.5) × 1.5
    expect(r).toMatchObject({ result: 'pass', base: res(s12) });
    expect(r.value).toBeCloseTo(mult, 12);
    expect(check([g], claims({ f: 1, t: mult / 1.51 }))[0]!.result).toBe('fail');          // just past it
    const both: BandRecord = { id: 'band.1983q4.b', measure: 'slice.resident_pop', applies_as: 'upper_bound_and_growth',
      bound: 'hi', growth_from: 'lo' };
    expect(check([both], claims({ hi: res(s60), lo: res(s60) / mult }))[0]!.result).toBe('pass');
    expect(check([both], claims({ hi: res(s60) - 1, lo: (res(s60) - 1) / mult }))[0]!.result).toBe('fail');   // level above
  });

  it('a band past the run\'s end fails; a missing or non-numeric claim throws; design bands report', () => {
    const short = playQuarters(fresh(), new Rng(1), STEPS, historicalPrologue, 6);
    const band: BandRecord = { id: 'band.1983q4.x', measure: 'slice.resident_pop', applies_as: 'upper_bound', bound: 'c' };
    const r = checkBands([band], claims({ c: 1e9 }), { at: (m) => stateAfter(short, m), final: short.final, params },
      { start: START, baseMonths: 12 });
    expect(r[0]!.result).toBe('fail');
    expect(() => check([band], claims({}))).toThrow(/no claim c/);
    expect(() => claimValue(new Map([['c', { value: 'x', status: 'lead' }]]), 'c')).toThrow(/no numeric value/);
    const design = (check: string, more: Partial<BandRecord> = {}): BandRecord =>
      ({ id: `band.1983q4.design.${check}`, applies_as: 'design_band', check, ...more });
    const d = check([design('residents_multiply', { range: [0.5, 5] }), design('stall_after_credit'),
      design('readiness_moves_wave'), design('deficit_before_visit')], claims({}));
    expect(d.map((b) => b.result)).toEqual(['pass', 'not_checkable', 'cross_run', 'pass']);
    expect(() => check([design('nonsense')], claims({}))).toThrow(/unknown design check/);
  });
});

describe('M6a: the policies', () => {
  const runs = { cautious: play(cautious), aggressive: play(aggressive(params)) };
  it('every policy plays the whole slice to the visit through runQuarter', () => {
    for (const rec of [runs.cautious, runs.aggressive, ...[1, 2, 3, 4, 5].map((k) => play(randomPolicy(k), k))]) {
      expect(rec.final.ended?.reason).toBe('visit');
      expect(isFinished(rec.final)).toBe(true);
      expect(rec.quarterEnds.length).toBe(rec.final.scenario.turns - 1);
    }
  });
  it('aggressive takes the loan and the co-financing, and accepts a shortcut', () => {
    const s = runs.aggressive.final;
    expect(s.fiscal.projectLoan).toBe('taken');
    expect(answersTo(s, COFINANCING_CARD)).toEqual(['accept']);
    expect(answersTo(s, SHORTCUT_CARD).some((o) => o.startsWith('accept:'))).toBe(true);
    expect(s.zones.length).toBeGreaterThanOrEqual(2);
  });
  it('cautious never takes the project loan, a shortcut or the co-financing', () => {
    const s = runs.cautious.final;
    expect(s.fiscal.projectLoan).not.toBe('taken');
    expect(answersTo(s, LOAN_CARD).every((o) => o === 'decline')).toBe(true);
    expect(answersTo(s, SHORTCUT_CARD).every((o) => o === 'decline')).toBe(true);
    expect(answersTo(s, COFINANCING_CARD)).toEqual(['decline']);
    expect(s.policy.permitRegime).toBe('strict');
  });
  it('the 1983 checkpoint note: aggressive ends the fiscal test negative, cautious above it', async () => {
    const { verdict } = await import('../src/verdict.js');
    const va = verdict(runs.aggressive.final, params, slice.tick.fiscal!), vc = verdict(runs.cautious.final, params, slice.tick.fiscal!);
    expect(va.fiscalTest.balance).toBeLessThan(0);
    expect(vc.fiscalTest.balance).toBeGreaterThan(va.fiscalTest.balance);
  });
  it('a random policy is reproducible from its seed and never touches the sim\'s streams', () => {
    expect(JSON.stringify(play(randomPolicy(3), 3).final)).toBe(JSON.stringify(play(randomPolicy(3), 3).final));
    expect(JSON.stringify(play(randomPolicy(3), 3).final)).not.toBe(JSON.stringify(play(randomPolicy(4), 3).final));
  });
  it('every prologue turn raises a decision (criterion 4), counted from the events content', () => {
    expect(prologueTurns(events)).toBe(6);
  });
});

describe('M6a: the invariants hold over seeds and policies (§10)', () => {
  const policies: [string, (seed: number) => DecisionPolicy][] = [
    ['random', (k) => randomPolicy(k)], ['default', () => firstOption], ['decline_all', () => declineAll],
    ['cautious', () => cautious], ['aggressive', () => aggressive(params)],
  ];
  for (const [name, make] of policies) for (const seed of [1, 2, 3, 4, 5]) {
    it(`${name}, seed ${seed}: every month conserves people and money and keeps stocks whole`, () => {
      const policy = make(seed), rng = new Rng(seed);
      let s = fresh();
      for (let m = 0; !isFinished(s); m++) {
        const r = step(s, policy(s, s.pendingCards), rng, STEPS);
        if (r.status !== 'advanced') throw new Error(`month ${m}: ${r.status}`);
        checkInvariants(s, r.state, r.events);
        checkLedger(s, r.state);
        s = r.state;
      }
      expect(s.ended?.reason).toBe('visit');
    });
  }
});

describe('M6a: speed', () => {
  it('21 quarters of aggressive take under 5 seconds', () => {
    const t0 = performance.now();
    const rec = play(aggressive(params));
    expect(rec.final.ended?.reason).toBe('visit');
    expect(performance.now() - t0).toBeLessThan(5000);
  });
});
