/**
 * R8c's tests (phase1-slice.md §5.5, §5.6): one city power pool. Local plant, purchases that arrive after their lead
 * time, and finished power stations make the pool; substations deliver it along the roads; when the areas can take
 * more than the pool holds, it is shared pro rata. Water is not an active constraint.
 */
import { describe, expect, it } from 'vitest';
import {
  Rng, aggressive, parseYM, applyTurnAction, cloneState, createInitialState, createTickSteps, firstOption, importedKw, placedSupply,
  playQuarters, poolShares, post, powerPool, runMonths, step, utilityShares,
  type GameState, type PlayerAction,
} from '../src/index.js';
import { initial, params, slice, UNGATED } from './fixtures.js';
import { checkInvariants, checkLedger } from './invariants.js';

const STEPS = createTickSteps(params, UNGATED);
const I = params.fiscal.power_import;
const ST = params.works!.structures.power_station;
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);
const isOpen = (f: GameState['firms'][number], t: number) => f.opens !== undefined && f.opens <= t;
const growth = { network: slice.startNetwork, buildable: UNGATED.buildable! };
const funded = () => { const s = initial(); post(s, 'grant', 'general', 5_000_000, 'test.fund'); return s; };

describe('R8c the pool shares', () => {
  it('gives an area its local plant plus its delivery, and shares a short pool pro rata to what each area can take', () => {
    const s = initial();
    for (const a of s.areas) a.utilities.powerCap = 0;
    s.areas.find((a) => a.id === 7)!.utilities.powerCap = 400;
    s.areas.find((a) => a.id === 1)!.utilities.powerCap = 1100;
    const need = new Map([[7, 1000], [1, 500], [2, 0]]);
    // the pool (1500 kW) covers the takes (400 + 500): area 7 is short of delivery, area 1 is whole, area 2 has no need
    expect(poolShares(s, need)).toEqual(new Map([[7, 0.4], [1, 1], [2, 1]]));
    // a substation's delivery raises only the area it reaches
    expect(poolShares(s, need, new Map([[7, { power: 600 }]]))).toEqual(new Map([[7, 1], [1, 1], [2, 1]]));
    // the takes (1000 + 500) exceed a pool of 750: each area gets half of what it could take
    expect(poolShares(s, need, new Map([[7, { power: 600 }]]), 750)).toEqual(new Map([[7, 0.5], [1, 0.5], [2, 1]]));
  });

  it('never lets water block a firm', () => {
    const rec = playQuarters(createInitialState(slice.init), new Rng(1), STEPS, aggressive(params, UNGATED), 12);
    const s = cloneState(rec.final);
    expect(s.firms.some((f) => isOpen(f, s.date))).toBe(true);
    const before = utilityShares(s, placedSupply(s, growth, (f) => isOpen(f, s.date)));
    for (const a of s.areas) a.utilities.waterCap = 0;
    expect(utilityShares(s, placedSupply(s, growth, (f) => isOpen(f, s.date)))).toEqual(before);
  });
});

describe('R8c buy_power', () => {
  it('joins the pool after its lead time and owes one monthly service line from then, with no works order', () => {
    const s = initial();
    const pool = powerPool(s).total;
    const r = step(s, [{ type: 'buy_power', kw: 1000 }], new Rng(1), STEPS);
    let t = r.state;
    expect(t.worksOrders).toEqual([]);
    expect(importedKw(t)).toEqual({ arrived: 0, pending: 1000 });
    expect(powerPool(t).total).toBe(pool);
    expect(t.fiscal.obligations).toEqual([expect.objectContaining({ kind: 'service', index: 'none',
      perMonth: Math.round(1000 * I.yuan_per_kw_month), from: s.date + I.lead_months, createdBy: 'power_import' })]);
    t = runMonths(t, I.lead_months - 1, new Rng(1), firstOption, STEPS);
    expect(powerPool(t).imported).toBe(1000);
    expect(importedKw(t).pending).toBe(0);
  });

  it('refuses past the line limit, counting power still on order, and a bad amount', () => {
    const s = initial();
    apply(s, { type: 'buy_power', kw: I.max_kw - 100 });
    expect(() => apply(s, { type: 'buy_power', kw: 200 })).toThrow(/at most/);
    apply(s, { type: 'buy_power', kw: 100, area: 7 });          // an old action's area is ignored
    expect(importedKw(s).pending).toBe(I.max_kw);
    expect(() => apply(initial(), { type: 'buy_power', kw: 0 })).toThrow(/kw/);
    expect(() => apply(initial(), { type: 'buy_power', kw: 1.5 })).toThrow(/kw/);
  });
});

describe('R8c structures', () => {
  it('no longer orders a water source or a one-quarter power source', () => {
    const s = funded();
    expect(() => apply(s, { type: 'place_structure', kind: 'water_source', cell: [356, 345], attach: [356, 346] })).toThrow(/no longer built/);
    expect(() => apply(s, { type: 'place_structure', kind: 'power_source', cell: [356, 345], attach: [356, 346] })).toThrow(/no longer built/);
  });

  it('builds a power station at its own pace, and adds it to the pool only when it is finished', () => {
    let s = funded();
    const pool = powerPool(s).total;
    const first: PlayerAction[] = [{ type: 'place_structure', kind: 'power_station', cell: [356, 345], attach: [356, 346], priority: 'high' }];
    const rng = new Rng(3);
    const pace = Math.ceil(ST.units / ST.build_months);
    let prev = 0;
    for (let m = 0; m < ST.build_months + 2; m++) {
      const r = step(s, [...firstOption(s, s.pendingCards), ...(m === 0 ? first : [])], rng, STEPS);
      if (r.status !== 'advanced') throw new Error(r.status);
      checkInvariants(s, r.state, r.events);
      checkLedger(s, r.state);
      s = r.state;
      const o = s.worksOrders[0]!;
      expect(o.unitsDone - prev).toBeLessThanOrEqual(pace);
      prev = o.unitsDone;
      expect(powerPool(s).stations).toBe(o.stage === 'done' ? ST.capacity : 0);
    }
    expect(s.worksOrders[0]!.stage).toBe('done');
    expect(powerPool(s).total).toBe(pool + ST.capacity);
  });
});

describe('R8c power binds', () => {
  // the aggressive plan outgrows its power: a quarter where the pool shares fall below 1, by the 1982 report
  const rec = playQuarters(createInitialState(slice.init), new Rng(1), STEPS, aggressive(params, UNGATED));
  const short = rec.quarterEnds.findIndex((s) =>
    [...utilityShares(s, placedSupply(s, growth, (f) => isOpen(f, s.date))).values()].some((v) => v < 0.99));

  it('binds in the aggressive run by the end of the 1982 turns', () => {
    expect(short).toBeGreaterThanOrEqual(0);
    expect(rec.quarterEnds[short]!.date).toBeLessThanOrEqual(parseYM('1982-12'));
  });

  it('a counterfactual with power to spare posts more jobs over the next quarter', () => {
    const s0 = rec.quarterEnds[short - 1]!;
    const rich = cloneState(s0);
    rich.power = { purchases: [...(rich.power?.purchases ?? []), { kw: 1_000_000, from: rich.date }] };
    const posts = (s: GameState) => {
      let n = 0;
      for (let m = 0; m < 3; m++) { s = runMonths(s, 1, new Rng(9 + m), firstOption, STEPS); n += s.firms.reduce((k, f) => k + f.posted, 0); }
      return n;
    };
    expect(posts(rich)).toBeGreaterThan(posts(cloneState(s0)));
  });
});
