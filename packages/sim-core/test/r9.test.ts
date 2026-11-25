/**
 * R9, the guided prologue (phase1-slice §2.1, §5.8; revision plan §4): the petition's condition, the tool gates, the
 * news layer and the timed modifiers.
 */
import { describe, expect, it } from 'vitest';
import {
  applyTurnAction, compileTools, conditionHolds, createTickSteps, gateRefusal, post, villageAreas, type GameState, type PlayerAction,
} from '../src/index.js';
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

describe('R9: tool gates (§5.8)', () => {
  const RAW = [
    { gate: 'zone.residential', requires: 'tools.corps', name: { zh: '住宅区', en: 'Residential zones' } },
    { gate: 'formation.bulk', requires: 'tools.formation_bulk', name: { zh: '批量平整', en: 'Bulk site formation' } },
    { gate: 'policy.enforcement', requires: 'tools.priorities', name: { zh: '执法', en: 'Enforcement' } },
  ];
  const gates = compileTools(RAW, slice.tick.events.map((d) => d.id === 'event.corps_advance'
    ? { ...d, effects: [...d.effects, { kind: 'unlock' as const, key: 'tools.corps' }] }
    : d.id === 'event.first_processing_contract' ? { ...d, effects: [...d.effects, { kind: 'unlock' as const, key: 'tools.formation_bulk' }] }
    : d.id === 'event.permit_choice' ? { ...d, effects: [...d.effects, { kind: 'unlock' as const, key: 'tools.priorities' }] } : d));
  const GATED = createTickSteps(params, { ...slice.tick, gates });
  const act = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, GATED);
  const residential: PlayerAction = { type: 'create_zone', use: 'residential', runs: [[353, 366, 368]] };

  it("compiles: names each gate's opener, and refuses unknown gates, duplicates and keys no event sets", () => {
    expect(gates.find((g) => g.gate === 'zone.residential')!.opener.id).toBe('event.corps_advance');
    const ev = slice.tick.events;
    expect(() => compileTools([{ ...RAW[0], gate: 'zone.public' }], ev)).toThrow(/unknown gate/);
    expect(() => compileTools([RAW[0], RAW[0]], ev.map((d) => d.id === 'event.corps_advance'
      ? { ...d, effects: [{ kind: 'unlock' as const, key: 'tools.corps' }] } : d))).toThrow(/duplicate/);
    expect(() => compileTools([{ ...RAW[0], requires: 'nobody.sets.this' }], ev)).toThrow(/no event unlocks/);
  });

  it('refuses a gated action with a named reason until its key is set, and changes nothing', () => {
    const s = funded();
    const before = JSON.stringify(s.zones);
    expect(() => act(s, residential)).toThrow('Residential zones is locked: it opens with');
    expect(JSON.stringify(s.zones)).toBe(before);
    expect(gateRefusal(s, gates, { type: 'set_enforcement', level: 'high' })).toMatch(/Enforcement is locked/);
    s.events.unlocked.push('tools.corps');
    act(s, residential);
    expect(s.zones.at(-1)!.use).toBe('residential');
  });

  it('forms one zone at a time until bulk formation opens', () => {
    const s = funded();
    act(s, { type: 'create_zone', use: 'industrial', runs: [[353, 366, 368]] });
    act(s, { type: 'create_zone', use: 'industrial', runs: [[354, 366, 368]] });
    act(s, { type: 'commit_works', zone: 1, cells: [[353, 366, 367]] });
    act(s, { type: 'commit_works', zone: 1, cells: [[353, 368, 368]] });   // the same zone again is not bulk
    expect(() => act(s, { type: 'commit_works', zone: 2 })).toThrow(/Bulk site formation is locked/);
    s.events.unlocked.push('tools.formation_bulk');
    act(s, { type: 'commit_works', zone: 2 });
  });

  it('gates nothing without tools content', () => {
    const s = funded();
    apply(s, residential);
    expect(s.zones.at(-1)!.use).toBe('residential');
  });
});
