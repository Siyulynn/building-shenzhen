/** R12: saving and loading a session (src/saves.ts). */
import { describe, expect, it } from 'vitest';
import { policyNamed, saveGame, saveToJson, type GameState } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { choose, enqueue, newSession, submit, type Session } from '../src/controller.js';
import {
  canSave, deleteSlot, exportName, latestSlot, listSlots, readSlot, sessionFromSave, sessionToSave, writeSlot,
} from '../src/saves.js';

const slice = loadSlice();
const policy = policyNamed('historical_prologue', slice.params, 1, slice.tick);

/** Give the policy's answers and actions for the current pending cards, without submitting. */
function prepare(x: Session): Session {
  for (const a of policy(x.state, x.state.pendingCards)) {
    if (a.type === 'answer_card') x = choose(x, a.instance, a.option);
    else if (x.mode === 'turn') x = enqueue(x, a);
  }
  return x;
}
/** Play to the end from x, the policy deciding. */
function finish(x: Session): Session {
  for (let guard = 0; x.mode !== 'over' && guard < 200; guard++) x = submit(prepare(x));
  return x;
}
/** Play until the start of turn `turn`, with its choices made but not sent. */
function playTo(turn: number): Session {
  let x = newSession(slice, 1);
  for (let guard = 0; guard < 200 && !(x.mode === 'turn' && x.state.turn === turn); guard++) x = submit(prepare(x));
  return prepare(x);
}
const simText = (s: GameState, x: Session) => saveToJson(saveGame(s, x.rng, slice.content));

/** A Storage in memory, optionally full. */
function memory(full = false): () => Storage {
  const m = new Map<string, string>();
  const s = {
    get length() { return m.size; }, clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { if (full) throw new Error('QuotaExceededError'); m.set(k, v); },
  } as Storage;
  return () => s;
}

describe('R12 save and load', () => {
  it('round-trips a new game exactly', () => {
    const x = newSession(slice, 1);
    const { session, contentMatches } = sessionFromSave(slice, sessionToSave(x));
    expect(contentMatches).toBe(true);
    expect(simText(session.state, session)).toBe(simText(x.state, x));
    expect(session.mode).toBe('turn');
    expect(session.seed).toBe(1);
  });

  it('a game loaded mid-run plays on exactly as the original, unsent choices included', () => {
    const x = playTo(6);
    expect(x.queue.length + Object.keys(x.answers).length).toBeGreaterThan(0);
    const text = sessionToSave(x);
    const loaded = sessionFromSave(slice, text).session;
    expect(loaded.queue).toEqual(x.queue);
    expect(loaded.answers).toEqual(x.answers);
    const a = finish(submit(x)), b = finish(submit(loaded));
    expect(a.mode).toBe('over');
    expect(simText(b.state, b)).toBe(simText(a.state, a));
  });

  it('refuses to save mid-quarter or after the end, and refuses a file that is not a save', () => {
    const over = finish(newSession(slice, 1));
    expect(canSave(over)).toBe(false);
    expect(() => sessionToSave(over)).toThrow(/start of a turn/);
    expect(() => sessionFromSave(slice, 'not json')).toThrow(/not a save file/);
    expect(() => sessionFromSave(slice, '{"format":"other"}')).toThrow(/not a save file/);
  });

  it('flags a save made with other content', () => {
    const x = newSession(slice, 1);
    const d = JSON.parse(sessionToSave(x)) as { sim: string };
    const sim = JSON.parse(d.sim) as { header: { content: Record<string, string> } };
    sim.header.content.params_sha256 = 'other';
    const text = JSON.stringify({ ...d, sim: JSON.stringify(sim) });
    expect(sessionFromSave(slice, text).contentMatches).toBe(false);
  });

  it('keeps slots in storage, lists them newest first, and survives a full storage', () => {
    const store = memory();
    const x = newSession(slice, 1), y = playTo(2);
    expect(writeSlot(x, '1', '2026-01-01T10:00:00Z', store)).toBe(true);
    expect(writeSlot(y, 'auto', '2026-01-01T11:00:00Z', store)).toBe(true);
    expect(listSlots(slice, store).map((s) => s.slot)).toEqual(['auto', '1']);
    expect(latestSlot(slice, store)?.slot).toBe('auto');
    expect(listSlots(slice, store).find((s) => s.slot === 'auto')?.turn).toBe(2);
    const back = sessionFromSave(slice, readSlot('1', store)!).session;
    expect(simText(back.state, back)).toBe(simText(x.state, x));
    deleteSlot('1', store);
    expect(readSlot('1', store)).toBeUndefined();
    expect(writeSlot(x, '2', 'now', memory(true))).toBe(false);
    expect(listSlots(slice, memory(true))).toEqual([]);
  });

  it('names an export by the game date and turn', () => {
    expect(exportName(newSession(slice, 1).state)).toBe('shenzhen-1979-01-turn1.json');
  });
});

