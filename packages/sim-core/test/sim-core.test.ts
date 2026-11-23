import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import {
  Rng, TICK_STEPS, createInitialState, isFinished, loadGame, parseYM, replay, runMonths, saveFromJson, saveGame,
  saveToJson, step, type AreasContent, type DecisionPolicy, type GameState, type ScenarioContent, type TickStep,
} from '../src/index.js';

const ROOT = resolve(__dirname, '../../..');
const areasJson = JSON.parse(readFileSync(join(ROOT, 'data/starts/slice_areas.json'), 'utf8')) as AreasContent;
const scenario = parse(readFileSync(join(ROOT, 'content/slice/scenario.yaml'), 'utf8')) as ScenarioContent;
const content = { areas_sha256: areasJson.areas_sha256 };
const initial = (): GameState => createInitialState({ scenario, areas: areasJson });

/** Fixture tick: the events step sometimes raises an interrupting card whose options come from the RNG. */
const FIXTURE_STEPS: TickStep[] = TICK_STEPS.map((s) => s.name !== 'events' ? s : {
  name: 'events',
  run: (ctx) => {
    if (ctx.rng.float() < 0.3) {
      const n = 2 + ctx.rng.int(3);
      ctx.raise({ card: 'fixture.choice', options: Array.from({ length: n }, (_, i) => `o${i}_${ctx.rng.int(1000)}`), interrupting: true });
    }
    if (ctx.rng.float() < 0.2) ctx.raise({ card: 'fixture.note', options: ['ok'], interrupting: false });
  },
});
/** Deterministic but not always the first option, so the log carries information. */
const hashPolicy: DecisionPolicy = (_s, pending) => pending.map((c) => {
  const h = [...c.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return { type: 'answer_card', instance: c.id, option: c.options[h % c.options.length]! };
});
const MONTHS = scenario.turns * scenario.months_per_turn;

describe('content', () => {
  it('builds the start state from the compiled areas', () => {
    const s = initial();
    expect(s.date).toBe(parseYM(scenario.start));
    expect(s.areas).toHaveLength(9);
    expect(s.areas.filter((a) => a.access === 'playable')).toHaveLength(7);
    expect(s.areas.find((a) => a.key === 'shekou')?.flag).toBe('shekou_enclave');
    for (const [k, a] of s.areas.entries()) expect(a.cells.length).toBe(areasJson.areas[k]!.cell_count);
    const cells = s.areas.flatMap((a) => [...a.cells]);
    expect(new Set(cells).size).toBe(cells.length);            // no cell in two areas
  });

  it('was compiled from the current areas.yaml', () => {
    const yaml = readFileSync(join(ROOT, 'content/slice/areas.yaml'), 'utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(yaml, 'utf8').digest('hex')).toBe(areasJson.areas_sha256);
  });
});

describe('rng', () => {
  it('gives known values for a seed and stream', () => {
    const r = new Rng(42);
    const a = r.stream('events');
    expect([a.next(), a.next(), a.next(), a.next()]).toEqual(KNOWN_EVENTS_42);
  });

  it('keeps streams independent', () => {
    const r1 = new Rng(7), r2 = new Rng(7);
    r1.stream('labour').next(); r1.stream('labour').next();
    expect(r1.stream('migration').next()).toBe(r2.stream('migration').next());
  });

  it('continues identically after save and load', () => {
    const r = new Rng(99);
    r.stream('x').next();
    const copy = Rng.load(JSON.parse(JSON.stringify(r.save())));
    expect(copy.stream('x').next()).toBe(r.stream('x').next());
    expect(copy.stream('y').float()).toBe(r.stream('y').float());
  });
});

describe('step', () => {
  it('runs the 63 empty months of the slice and then stops', () => {
    const s = runMonths(initial(), MONTHS, new Rng(1));
    expect(s.turn).toBe(scenario.turns);
    expect(s.history.months).toHaveLength(MONTHS);
    expect(s.date).toBe(parseYM(scenario.start) + MONTHS);
    expect(isFinished(s)).toBe(true);
    expect(() => step(s, [], new Rng(1))).toThrow(/ended/);
  });

  it('pauses on an interrupting card until it is answered, and logs the answer', () => {
    const raiseOnce: TickStep[] = [{ name: 'events', run: (ctx) => {
      if (ctx.state.history.months.length === 0) ctx.raise({ card: 'fixture.stop', options: ['a', 'b'], interrupting: true });
    } }, TICK_STEPS.find((s) => s.name === 'statistics')!];
    const rng = new Rng(3);
    const r1 = step(initial(), [], rng, raiseOnce);
    expect(r1.status).toBe('advanced');
    const card = r1.state.pendingCards[0]!;
    const r2 = step(r1.state, [], rng, raiseOnce);
    expect(r2.status).toBe('paused');
    expect(r2.state.date).toBe(r1.state.date);
    expect(() => step(r1.state, [{ type: 'answer_card', instance: card.id, option: 'zzz' }], rng, raiseOnce)).toThrow(/no option/);
    expect(() => step(r1.state, [{ type: 'answer_card', instance: 'nope', option: 'a' }], rng, raiseOnce)).toThrow(/no pending/);
    const r3 = step(r1.state, [{ type: 'answer_card', instance: card.id, option: 'b' }], rng, raiseOnce);
    expect(r3.status).toBe('advanced');
    expect(r3.state.pendingCards).toHaveLength(0);
    expect(r3.state.actionLog).toEqual([{ date: r1.state.date, subStep: 1, action: { type: 'answer_card', instance: card.id, option: 'b' } }]);
  });

  it('does not pause for a non-interrupting card, which waits until answered', () => {
    const note: TickStep[] = [{ name: 'events', run: (ctx) => {
      if (ctx.state.history.months.length === 0) ctx.raise({ card: 'fixture.note', options: ['ok'], interrupting: false });
    } }, TICK_STEPS.find((s) => s.name === 'statistics')!];
    const rng = new Rng(4);
    const r1 = step(initial(), [], rng, note);
    const r2 = step(r1.state, [], rng, note);
    expect(r2.status).toBe('advanced');
    expect(r2.state.pendingCards.map((c) => c.card)).toEqual(['fixture.note']);
    const id = r2.state.pendingCards[0]!.id;
    const r3 = step(r2.state, [{ type: 'answer_card', instance: id, option: 'ok' }], rng, note);
    expect(r3.state.pendingCards).toHaveLength(0);
    expect(r3.state.actionLog).toHaveLength(1);
  });

  it('does not change the state it was given', () => {
    const s0 = initial();
    const before = saveToJson(saveGame(s0, new Rng(5), content));
    step(s0, [], new Rng(5), FIXTURE_STEPS);
    expect(saveToJson(saveGame(s0, new Rng(5), content))).toBe(before);
  });
});

describe('determinism and saves', () => {
  const full = (seed: number) => {
    const rng = new Rng(seed);
    const s = runMonths(initial(), MONTHS, rng, hashPolicy, FIXTURE_STEPS);
    return { s, rng, text: saveToJson(saveGame(s, rng, content)) };
  };

  it('uses the randomness: the fixture raises and logs cards, and seeds differ', () => {
    const a = full(11), b = full(12);
    expect(a.s.actionLog.length).toBeGreaterThan(5);
    expect(a.text).not.toBe(b.text);
    expect(full(11).text).toBe(a.text);
  });

  it('matches an uninterrupted run after save, load and continue, byte for byte', () => {
    const a = full(11);
    for (const k of [1, 20, 62]) {
      const rng = new Rng(11);
      const mid = runMonths(initial(), k, rng, hashPolicy, FIXTURE_STEPS);
      const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rng, content))));
      expect(loaded.header.content.areas_sha256).toBe(content.areas_sha256);
      const end = runMonths(loaded.state, MONTHS - k, loaded.rng, hashPolicy, FIXTURE_STEPS);
      expect(saveToJson(saveGame(end, loaded.rng, content))).toBe(a.text);
    }
  });

  it('replays from the seed and the action log', () => {
    const a = full(11);
    const rng = new Rng(11);
    const r = replay(initial(), a.s.actionLog, MONTHS, rng, FIXTURE_STEPS);
    expect(saveToJson(saveGame(r, rng, content))).toBe(a.text);
  });

  it('keeps typed arrays through the text form', () => {
    const s = initial();
    const back = loadGame(saveFromJson(saveToJson(saveGame(s, new Rng(2), content)))).state;
    s.areas.forEach((a, i) => expect([...back.areas[i]!.cells]).toEqual([...a.cells]));
    expect(back.areas[0]!.cells).toBeInstanceOf(Uint32Array);
  });

  it('refuses a save from a newer version', () => {
    const sv = saveGame(initial(), new Rng(2), content);
    expect(() => loadGame({ ...sv, header: { ...sv.header, version: 99 } })).toThrow(/newer/);
  });
});

describe('sim-core source rules (PLAN §6.2)', () => {
  const dir = resolve(__dirname, '../src');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  it.each(files)('%s has no wall clock, Math.random, Node or app imports, or year literals', (f) => {
    const src = readFileSync(join(dir, f), 'utf8');
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/\bDate\b/);
    expect(src).not.toMatch(/performance\.now/);
    expect(src).not.toMatch(/from ['"]node:/);
    expect(src).not.toMatch(/from ['"][^'"]*(apps|render)\//);
    expect(src).not.toMatch(/\b(19[5-9]\d|20[0-4]\d)\b/);       // no calendar years: dates live in content
  });
});

/** Pinned output of seed 42, stream "events". If this changes, every golden run changes: say so in the commit. */
const KNOWN_EVENTS_42 = [1401814167, 3735017994, 3711899082, 447700565];
