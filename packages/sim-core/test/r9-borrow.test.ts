/** R9 (phase1-slice §5.9): a map plan that borrows to build, raising the project loan from its first works. */
import { describe, expect, it } from 'vitest';
import { HISTORICAL_PLAN, moneyForProjects, planWorks, type GameState } from '../src/index.js';
import { initial, params, slice } from './fixtures.js';

const atTurn1 = (): GameState => { const s = initial(); s.turn = 1; return s; };
const roads = (plan: typeof HISTORICAL_PLAN) => planWorks(atTurn1(), slice.tick, params, plan).filter((a) => a.type === 'build_road');

describe('R9 borrow_until_turn (§5.9)', () => {
  it('commits the first road ahead of the money while the loan is unoffered, and not without it', () => {
    const s = atTurn1();
    expect(moneyForProjects(s, params)).toBeLessThan(900_000);              // the first road's cost
    expect(roads(HISTORICAL_PLAN).length).toBe(1);
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
