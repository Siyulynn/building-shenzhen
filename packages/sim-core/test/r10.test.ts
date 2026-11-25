/**
 * R10's tests (phase1-slice.md §5.13). R10a: the construction line, the sector series, the population categories and
 * save version 9's unlock re-application, tested on a save built here and, when present, on the untracked version-5
 * save the pre-R8 code wrote (test/fixtures-data/save-v5.json).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  Rng, SAVE_VERSION, createTickSteps, gateRefusal, gdpBySector, historical, loadGame, playQuarters, popCategories, saveFromJson,
  saveGame, saveToJson, type GameState,
} from '../src/index.js';
import { ROOT, events, initial, params, slice } from './fixtures.js';

const STEPS = createTickSteps(params, slice.tick);
const FIXTURE = join(ROOT, 'packages/sim-core/test/fixtures-data/save-v5.json');
const run = (quarters: number) => {
  const rng = new Rng(1);
  return { rng, rec: playQuarters(initial(), rng, STEPS, historical(params, slice.tick), quarters) };
};
const played = run(8);

/** The fire-time unlock keys of a state's fired events, from the content. */
const firedKeys = (s: GameState) => s.events.fired.flatMap((f) =>
  (events.find((d) => d.id === f.id)?.effects ?? []).flatMap((e) => (e.kind === 'unlock' ? [e.key] : [])));

describe('R10a reporting (§5.13)', () => {
  it('the population categories are present people, non-overlapping: registered + temporary = totalPresent', () => {
    for (const s of [...played.rec.quarterEnds, played.rec.final]) {
      const c = popCategories(s);
      const t = c.temporary;
      expect(t.total).toBe(t.migrantConstruction + t.migrantFactory + t.other);
      expect(c.registered + t.total).toBe(c.totalPresent);
      expect(c.totalPresent).toBe(s.pops.reduce((a, g) => a + g.present, 0));
      expect(c.registered).toBe(s.pops.reduce((a, g) => a + (g.registration === 'local' ? g.present : 0), 0));
    }
    expect(popCategories(played.rec.final).temporary.total).toBeGreaterThan(0);
  });

  it('the sector series is aligned with the months; construction is a part of secondary; the sectors add to GDP', () => {
    const h = played.rec.final.history;
    for (const k of ['primary', 'secondary', 'tertiary', 'construction'] as const) expect(h.gdpSector[k]).toHaveLength(h.months.length);
    h.months.forEach((_, i) => {
      const { primary, secondary, tertiary, construction } = { primary: h.gdpSector.primary[i]!, secondary: h.gdpSector.secondary[i]!,
        tertiary: h.gdpSector.tertiary[i]!, construction: h.gdpSector.construction[i]! };
      expect(construction).toBeGreaterThanOrEqual(0);
      expect(construction).toBeLessThanOrEqual(secondary + 1e-6);
      expect(primary + secondary + tertiary).toBeCloseTo(h.gdp[i]!, 3);
    });
    expect(h.gdpSector.construction.some((x) => x > 0)).toBe(true);
  });

  it("gdpBySector's month matches the series' last month", () => {
    const s = played.rec.final, h = s.history, g = gdpBySector(s, params);
    expect(g.primary).toBeCloseTo(h.gdpSector.primary.at(-1)!, 3);
    expect(g.secondary).toBeCloseTo(h.gdpSector.secondary.at(-1)!, 3);
    expect(g.tertiary).toBeCloseTo(h.gdpSector.tertiary.at(-1)!, 3);
    expect(g.construction).toBeCloseTo(h.gdpSector.construction.at(-1)!, 3);
  });
});

/** A version-8 save as the pre-R10 code wrote one after a pre-R9 run: no sector series and none of R9's unlock keys. */
function builtV8(): string {
  const { rng, rec } = run(4);
  const save = saveGame(rec.final, rng, slice.content);
  const st = save.body.state as { history: Record<string, unknown>; events: { unlocked: string[] } };
  delete st.history.gdpSector;
  st.events.unlocked = st.events.unlocked.filter((k) => k === 'shekou.competes' || k === 'scrutiny.gauge');
  return saveToJson({ ...save, header: { ...save.header, version: 8 } });
}
const CASES: [string, () => string][] = [['a version-8 save built here', builtV8],
  ...(existsSync(FIXTURE) ? [['the version-5 save the pre-R8 code wrote', () => readFileSync(FIXTURE, 'utf8')] as [string, () => string]] : [])];

describe('R10a save version 9 (§5.13)', () => {
  it('is version 9', () => expect(SAVE_VERSION).toBe(9));

  it.each(CASES)('re-applies the unlock keys of the events already fired (%s)', (_n, text) => {
    const old = saveFromJson(text());
    const before = (old.body.state as { events: { unlocked: string[] } }).events.unlocked;
    const { state: s, header } = loadGame(old, { events });
    expect(header.version).toBe(SAVE_VERSION);
    const keys = firedKeys(s);
    expect(keys.length).toBeGreaterThan(before.length);
    for (const k of keys) expect(s.events.unlocked).toContain(k);
    for (const k of before) expect(s.events.unlocked).toContain(k);
    expect(new Set(s.events.unlocked).size).toBe(s.events.unlocked.length);       // each key once
    // the old keys first, in their order; then the new ones in firing order
    expect(s.events.unlocked.slice(0, before.length)).toEqual(before);
    // the province's rules fired before the save: Enforcement is open again
    expect(s.events.fired.map((f) => f.id)).toContain('event.permit_choice');
    expect(gateRefusal(s, slice.tick.gates!, { type: 'set_enforcement', level: 'high' })).toBeUndefined();
    // the sector series: zeros for the months the older run recorded
    for (const k of ['primary', 'secondary', 'tertiary', 'construction'] as const) {
      expect(s.history.gdpSector[k]).toEqual(s.history.months.map(() => 0));
    }
  });

  it.each(CASES)('without the events content, an older save (%s) does not load', (_n, text) => {
    expect(() => loadGame(saveFromJson(text()))).toThrow(/events content/);
  });

  it('a fired event no longer in the content is skipped; a current save loads without the events', () => {
    const old = saveFromJson(builtV8());
    const st = old.body.state as { events: { fired: { id: string; date: number }[] } };
    st.events.fired.push({ id: 'event.retired', date: st.events.fired.at(-1)!.date });
    expect(() => loadGame(old, { events })).not.toThrow();
    const now = saveGame(played.rec.final, new Rng(1), slice.content);
    expect(loadGame(saveFromJson(saveToJson(now))).state.events.unlocked).toEqual(played.rec.final.events.unlocked);
  });
});
