/** R9: works pace, the money-for-time lever (phase1-slice §5.6, revision plan §4.6). */
import { describe, expect, it } from 'vitest';
import {
  Rng, applyTurnAction, createTickSteps, firstOption, loadGame, post, previewWorks, runMonths, saveFromJson, saveGame,
  saveToJson, templateZoneAction, type GameState, type PlayerAction, type WorksOrder,
} from '../src/index.js';
import { content, initial, params, slice, UNGATED } from './fixtures.js';

const WORKS = { ...params.works!, crew_per_order: 30 };
const PARAMS = { ...params, works: WORKS };
const STEPS = createTickSteps(PARAMS, UNGATED);
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);
const SHANGBU = UNGATED.precedents!.find((p) => p.id === 'precedent.zone.shangbu_industrial')!;
const SPUR: [number, number][] = [[360, 347], [360, 369], [350, 369]];
const RATE = WORKS.road.yuan_per_cell / WORKS.road.units_per_cell;
const PACE = WORKS.pace!;

function funded(): GameState {
  const s = initial();
  post(s, 'grant', 'general', 5_000_000, 'test.fund');
  return s;
}
function play(s: GameState, months: number, rng: Rng, first: PlayerAction[] = []): GameState {
  let todo = first;
  return runMonths(s, months, rng, (st, cards) => { const a = [...firstOption(st, cards), ...todo]; todo = []; return a; }, STEPS);
}
const worksPaid = (s: GameState, id: number) => 0 - s.fiscal.ledger
  .filter((l) => l.ref === `works.${id}` && l.type === 'project').reduce((n, l) => n + l.amount, 0);
/** Months until the first order is done, from a road at this pace. */
function roadMonths(pace?: 'push' | 'all_out'): { months: number; o: WorksOrder; s: GameState } {
  const rng = new Rng(11);
  let s = play(funded(), 1, rng, [{ type: 'build_road', path: SPUR, priority: 'high', ...(pace ? { pace } : {}) }]);
  let months = 1;
  while (s.worksOrders[0]!.stage !== 'done' && months < 40) { s = play(s, 1, rng); months++; }
  return { months, o: s.worksOrders[0]!, s };
}

describe('R9 works pace (§5.6)', () => {
  it('a placeholder step trades crew-months for money, by exactly its factors', () => {
    expect(PACE.normal).toEqual({ units: 1, money: 1 });
    const normal = roadMonths(), push = roadMonths('push'), all = roadMonths('all_out');
    const units = normal.o.unitsTotal;
    expect(push.o.unitsTotal).toBe(units);                                     // the work is the same
    expect(normal.o.spent).toBe(Math.round(RATE * units));
    expect(push.o.spent).toBe(Math.round(RATE * PACE.push.money * units));
    expect(all.o.spent).toBe(Math.round(RATE * PACE.all_out.money * units));
    for (const r of [normal, push, all]) {
      expect(r.o.spent).toBe(r.o.budget);
      expect(worksPaid(r.s, r.o.id)).toBe(r.o.spent);
      expect(r.o.paceCarry).toBeUndefined();
    }
    // the monthly draw stays at crew_per_order, so the order finishes in about units × u ÷ crew months
    expect(normal.months).toBe(Math.ceil(units / 30));
    expect(push.months).toBe(Math.ceil(Math.ceil(units * PACE.push.units) / 30));
    expect(all.months).toBe(Math.ceil(Math.ceil(units * PACE.all_out.units) / 30));
    expect(all.months).toBeLessThan(push.months);
    expect(push.months).toBeLessThan(normal.months);
  });

  it('a crew unit does 1 ÷ units of work, and a partial unit waits in the carry', () => {
    const rng = new Rng(12);
    let s = play(funded(), 1, rng, [{ type: 'build_road', path: SPUR, priority: 'high', pace: 'all_out' }]);
    const first = s.worksOrders[0]!;
    expect(first.unitsDone).toBe(Math.floor(30 / PACE.all_out.units));       // 54 units for 30 crew
    expect(first.paceCarry).toBeCloseTo(30 - 54 * PACE.all_out.units, 9);
    s = play(s, 1, rng);
    expect(s.worksOrders[0]!.unitsDone).toBe(54 + Math.floor((30 + first.paceCarry!) / PACE.all_out.units));
  });

  it('changing the step re-prices only the unworked units', () => {
    const rng = new Rng(13);
    let s = play(funded(), 3, rng, [{ type: 'build_road', path: SPUR, priority: 'high' }]);
    const mid = { ...s.worksOrders[0]! };
    expect(mid.unitsDone).toBe(90);
    apply(s, { type: 'set_works_pace', order: mid.id, pace: 'push' });
    const o = s.worksOrders[0]!;
    expect(o).toMatchObject({ pace: 'push', spent: mid.spent, unitsDone: mid.unitsDone, paceBase: { units: 90, spent: mid.spent } });
    expect(o.budget).toBe(mid.spent + Math.round(RATE * PACE.push.money * (mid.unitsTotal - 90)));
    s = play(s, 20, rng);
    const done = s.worksOrders[0]!;
    expect(done.stage).toBe('done');
    expect(done.spent).toBe(o.budget);
    expect(worksPaid(s, done.id)).toBe(done.spent);
    // back to normal: the pushed units stay paid at push, the rest at the normal rate
    let t = play(funded(), 3, new Rng(13), [{ type: 'build_road', path: SPUR, priority: 'high', pace: 'push' }]);
    const p = { ...t.worksOrders[0]! };
    apply(t, { type: 'set_works_pace', order: p.id, pace: 'normal' });
    expect(t.worksOrders[0]!.pace).toBeUndefined();
    expect(t.worksOrders[0]!.budget).toBe(p.spent + Math.round(RATE * (p.unitsTotal - p.unitsDone)));
    t = play(t, 20, new Rng(14));
    expect(t.worksOrders[0]!.spent).toBe(t.worksOrders[0]!.budget);
  });

  it('a service order at pace forms its cells and keeps the works whole', () => {
    const rng = new Rng(15);
    const s0 = funded();
    const s = play(s0, 30, rng, [templateZoneAction(s0, SHANGBU), { type: 'build_road', path: SPUR, priority: 'high' },
      { type: 'commit_works', zone: 1, cells: [[370, 349, 354]], priority: 'high', pace: 'push' }]);
    const o = s.worksOrders[1]!;
    expect(o).toMatchObject({ stage: 'done', pace: 'push' });
    expect(o.spent).toBe(o.budget);
    expect(s.cellWorks.filter((w) => w.order === o.id).every((w) => w.stage === 'serviced')).toBe(true);
    expect(s.cellWorks.filter((w) => w.order === o.id).reduce((n, w) => n + w.workDone, 0)).toBe(o.unitsDone);
  });

  it('refuses an unknown pace, changing nothing', () => {
    const s = funded();
    const before = JSON.stringify(s);
    expect(() => apply(s, { type: 'build_road', path: SPUR, pace: 'sprint' as never })).toThrow(/unknown pace/);
    expect(JSON.stringify(s)).toBe(before);
    apply(s, { type: 'build_road', path: SPUR });
    expect(() => apply(s, { type: 'set_works_pace', order: s.worksOrders[0]!.id, pace: 'sprint' as never })).toThrow(/unknown pace/);
  });

  it('the preview gives crew a month and months at the pace', () => {
    const s = funded();
    const p = previewWorks(s, WORKS, [{ type: 'build_road', path: SPUR, pace: 'push' }], (c, a) => apply(c, a));
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const e = p.orders[0]!;
    expect(e.budget).toBe(Math.round(RATE * PACE.push.money * e.units));
    expect(e.months).toBe(Math.ceil(Math.ceil(e.units * PACE.push.units) / 30));
  });

  it('is gated with works.priority, with the opener named', () => {
    const steps = createTickSteps(PARAMS, slice.tick);
    const s = funded();
    expect(() => applyTurnAction(s, { type: 'build_road', path: SPUR, pace: 'push' }, steps)).toThrow(/locked: it opens with/);
    applyTurnAction(s, { type: 'build_road', path: SPUR }, steps);
    expect(() => applyTurnAction(s, { type: 'set_works_pace', order: s.worksOrders[0]!.id, pace: 'push' }, steps))
      .toThrow(/locked: it opens with/);
  });

  it('a paced order survives save and load mid-run, carry and base included', () => {
    const run = (k: number) => {
      const rng = new Rng(16);
      let s = play(funded(), 2, rng, [{ type: 'build_road', path: SPUR, priority: 'high', pace: 'all_out' }]);
      apply(s, { type: 'set_works_pace', order: s.worksOrders[0]!.id, pace: 'push' });
      s = play(s, k, rng);
      return { s, rng };
    };
    const full = run(8);
    const text = saveToJson(saveGame(full.s, full.rng, content));
    const half = run(2);
    expect(half.s.worksOrders[0]!.paceBase).toBeDefined();
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(half.s, half.rng, content))));
    const end = play(loaded.state, 6, loaded.rng);
    expect(saveToJson(saveGame(end, loaded.rng, content))).toBe(text);
  });
});
