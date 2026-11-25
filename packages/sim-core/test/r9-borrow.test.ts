/** R9 (phase1-slice §5.9): a map plan that borrows to build, raising the project loan from its first works. */
import { describe, expect, it } from 'vitest';
import { HISTORICAL_PLAN, cautious, historical, moneyForProjects, planWorks, type GameState } from '../src/index.js';
import { initial, params, slice } from './fixtures.js';

const atTurn1 = (): GameState => { const s = initial(); s.turn = 1; return s; };
const roads = (plan: typeof HISTORICAL_PLAN, s = atTurn1()) => planWorks(s, slice.tick, params, plan).filter((a) => a.type === 'build_road');

describe('R9 borrow_until_turn (§5.9)', () => {
  it('commits the first road ahead of the money while the loan is unoffered, and not without it', () => {
    const s = atTurn1();
    expect(moneyForProjects(s, params)).toBeLessThan(900_000);              // the first road's cost
    // the Shangbu road, and beside it the Luohu street (roads_at_once 2)
    expect(roads(HISTORICAL_PLAN).map((a) => a.type === 'build_road' && a.path[0])).toEqual([[365, 353], [387, 384]]);
    const { borrow_until_turn: _, ...noBorrow } = HISTORICAL_PLAN;
    expect(roads(noBorrow).length).toBe(0);
  });

  it('stops after its turn, and once the loan has been offered', () => {
    const late = atTurn1();
    late.turn = HISTORICAL_PLAN.borrow_until_turn! + 1;
    expect(planWorks(late, slice.tick, params, HISTORICAL_PLAN).filter((a) => a.type === 'build_road').length).toBe(0);
    const offered = atTurn1();
    offered.fiscal.projectLoan = 'offered';
    expect(planWorks(offered, slice.tick, params, HISTORICAL_PLAN).filter((a) => a.type === 'build_road').length).toBe(0);
  });
});

describe('R9 roads_at_once and the first turn (§5.9)', () => {
  it('without roads_at_once, one road order at a time', () => {
    const { roads_at_once: _, ...one } = HISTORICAL_PLAN;
    expect(roads(one).length).toBe(1);
  });

  it('a borrowing plan orders its first roads in the first month, with its zones', () => {
    const s = initial();
    const first = historical(params, slice.tick)(s, []);
    expect(first.filter((a) => a.type === 'create_zone').length).toBeGreaterThan(0);
    expect(first.filter((a) => a.type === 'build_road').length).toBe(2);
    expect(cautious(params, slice.tick)(s, []).some((a) => a.type === 'build_road')).toBe(false);
  });
});
