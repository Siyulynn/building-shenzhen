/**
 * R9, the guided prologue (phase1-slice §2.1, §5.8; revision plan §4): the petition's condition, the tool gates, the
 * news layer and the timed modifiers.
 */
import { describe, expect, it } from 'vitest';
import { applyTurnAction, conditionHolds, createTickSteps, post, villageAreas, type GameState, type PlayerAction } from '../src/index.js';
import { initial, params, slice } from './fixtures.js';

const STEPS = createTickSteps(params, slice.tick);
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);
function funded(): GameState {
  const s = initial();
  post(s, 'grant', 'general', 5_000_000, 'test.fund');
  return s;
}

describe('R9: the petition comes only for the player\'s works (§5.8)', () => {
  it('needs works in a village area, or a compensation obligation', () => {
    const s = funded();
    const villages = villageAreas(s, slice.tick.landcover);
    expect(villages.size).toBeGreaterThan(0);
    expect(conditionHolds(s, 'village_works', villages)).toBe(false);
    // Shangbu (area 7): formed cells owe compensation, so the petition can follow
    apply(s, { type: 'create_zone', use: 'industrial', runs: [[353, 366, 368]] });
    expect(conditionHolds(s, 'village_works', villages)).toBe(false);   // a zone alone is no works
    apply(s, { type: 'commit_works', zone: 1 });
    expect(s.fiscal.obligations.some((o) => o.kind === 'compensation')).toBe(true);
    expect(conditionHolds(s, 'village_works', villages)).toBe(true);
  });

  it('ignores a co-financed site-preparation project', () => {
    const s = funded();
    const villages = villageAreas(s, slice.tick.landcover);
    const area = [...villages][0]!;
    s.zones.push({ id: 99, use: 'industrial', area, runs: [], cellCount: 0 } as unknown as GameState['zones'][number]);
    s.fiscal.projects.push({ id: 1, template: 'project.site_preparation', kind: 'site_preparation', zone: 99, budget: 0, spent: 0,
      crew: 0, workTotal: 1, workDone: 0, crewBank: 0, priority: 'normal', committed: s.date, stage: 'committed', cofinanced: true } as unknown as GameState['fiscal']['projects'][number]);
    expect(conditionHolds(s, 'village_works', villages)).toBe(false);
    delete s.fiscal.projects[0]!.cofinanced;
    expect(conditionHolds(s, 'village_works', villages)).toBe(true);
  });
});
