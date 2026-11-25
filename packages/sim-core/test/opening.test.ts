/** R7 (phase1-slice.md §5.8): the turn-0 beats fire in createInitialState, so the opening card is pending at init. */
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  Rng, compileEvents, createInitialState, createTickSteps, playQuarters, policyNamed, step, type GameState,
} from '../src/index.js';
import { areasJson, params, scenario, slice, start } from './fixtures.js';

const STEPS = createTickSteps(params, slice.tick);
const START = createInitialState(slice.init).date;
const opening = (s: GameState) => s.pendingCards.filter((c) => c.card === 'event.first_project');

describe('R7: the opening beat fires at init', () => {
  it('the initial state has exactly one pending interrupting card, the opening one, dated the start month', () => {
    const s = createInitialState(slice.init);
    expect(s.pendingCards.filter((c) => c.interrupting)).toHaveLength(1);
    expect(opening(s)).toEqual([expect.objectContaining({ interrupting: true, raisedAt: START, id: 'event.first_project@1979-01.0' })]);
    // R9: the two opening letters (news, §5.8) fire at init with it; they raise no card
    expect(s.events.fired).toEqual([{ id: 'event.first_project', date: START }, { id: 'news.1979q1.assignment', date: START }, { id: 'news.1979q1.office_note', date: START }]);
    expect(s.date).toBe(START);
    expect(s.turn).toBe(0);
    expect(createInitialState(slice.init)).toEqual(s);            // deterministic: init has no RNG
  });

  it('the first step applies its answer in the start month and does not fire it again', () => {
    const s0 = createInitialState(slice.init);
    const paused = step(s0, [], new Rng(1), STEPS);
    expect(paused.status).toBe('paused');                        // an interrupting card is answered before the month
    const r = step(s0, [{ type: 'answer_card', instance: opening(s0)[0]!.id, option: 'noted' }], new Rng(1), STEPS);
    expect(r.status).toBe('advanced');
    expect(opening(r.state)).toEqual([]);
    expect(r.state.events.fired.filter((f) => f.id === 'event.first_project')).toHaveLength(1);
    // R9: the survey only reports; its answer is logged in the start month (before R7: after month 1's pause)
    expect(r.state.actionLog.find((e) => e.action.type === 'answer_card')!.date).toBe(START);
    expect(r.state.fiscal.projects).toEqual([]);
  });

  it("a policy's turn-0 actions still land in the start month, beside its answer", () => {
    const rec = playQuarters(createInitialState(slice.init), new Rng(1), STEPS, policyNamed('historical_prologue', params, 1, slice.tick), 1);
    const first = rec.final.actionLog.filter((e) => e.date === START);
    expect(first.some((e) => e.action.type === 'answer_card')).toBe(true);
    expect(first.some((e) => e.action.type !== 'answer_card')).toBe(true);
  });

  it('without the events at init, the beat fires in the first month as before', () => {
    const s = createInitialState({ scenario, areas: areasJson, start, params });
    expect(s.pendingCards).toEqual([]);
    const r = step(s, [], new Rng(1), STEPS);
    expect(opening(r.state)).toHaveLength(1);
  });

  it('compileEvents refuses a turn-0 beat whose effects need the tick', () => {
    const raw = parse(`- id: event.x
  name: { zh: 甲, en: X }
  family: scripted
  trigger: { prologue_turn: 0 }
  effects: [ { kind: offer, archetype: investor.hk_processing } ]
  claims: []`);
    expect(() => compileEvents(raw, params, slice.tick.investors!, slice.tick.fiscal)).toThrow(/turn-0 beat/);
  });
});
