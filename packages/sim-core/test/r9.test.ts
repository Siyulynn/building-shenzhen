/**
 * R9, the guided prologue (phase1-slice §2.1, §5.8; revision plan §4): the petition's condition, the tool gates, the
 * news layer and the timed modifiers.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { cohortCrew } from '../src/systems/projects.js';
import {
  Rng, applyTurnAction, cloneState, compileEvents, compileTools, declineAll, isFinished, loadGame, modifierFactor, parseYM,
  saveFromJson, saveGame, saveToJson, step, conditionHolds, createTickSteps, gateRefusal, post, villageAreas, type GameState, type PlayerAction,
} from '../src/index.js';
import { UNGATED, initial, params, slice } from './fixtures.js';

const STEPS = createTickSteps(params, UNGATED);
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
  const gates = slice.tick.gates!;                                   // the slice's own schedule (§2.1)
  const GATED = createTickSteps(params, slice.tick);
  const act = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, GATED);
  const residential: PlayerAction = { type: 'create_zone', use: 'residential', runs: [[353, 366, 368]] };

  it("compiles: names each gate's opener, and refuses unknown gates, duplicates and keys no event sets", () => {
    expect(gates.find((g) => g.gate === 'zone.residential')!.opener.id).toBe('event.corps_advance');
    const ev = slice.tick.events;
    expect(() => compileTools([{ ...RAW[0], gate: 'zone.public' }], ev)).toThrow(/unknown gate/);
    expect(compileTools(RAW, ev).map((g) => g.opener.id)).toEqual(['event.corps_advance', 'event.first_processing_contract', 'event.permit_choice']);
    expect(() => compileTools([RAW[0], RAW[0]], ev)).toThrow(/duplicate/);
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
    expect(() => act(s, { type: 'commit_works', zone: 2 })).toThrow(/Forming several zones at once is locked/);
    s.events.unlocked.push('tools.formation_bulk');
    act(s, { type: 'commit_works', zone: 2 });
  });

  it('gates nothing without tools content', () => {
    const s = funded();
    apply(s, residential);
    expect(s.zones.at(-1)!.use).toBe('residential');
  });
});

describe('R9: the news layer (§5.8)', () => {
  const news = slice.tick.events!.filter((d) => d.family === 'news');
  const compile = (body: string) => compileEvents(parse(`- id: news.x
  name: { zh: 甲, en: X }
  family: news
${body}`), params, slice.tick.investors!, slice.tick.fiscal);
  const ok = `  trigger: { date: 1981-03 }
  news: { desk: city, tone: texture }
  text: { zh: 甲, en: X }
  claims: [ { id: phase1.local.shekou_slogan_1981, use: encyclopedia } ]`;

  it('has the 25 records, each with text in both languages and no card', () => {
    expect(news).toHaveLength(25);
    for (const d of news) {
      expect(d.text?.zh && d.text?.en, d.id).toBeTruthy();
      expect(d.card, d.id).toBeUndefined();
    }
  });

  it('each record fires once, in its month, and never raises a card or pauses', () => {
    let s = initial();
    const rng = new Rng(1);
    for (let m = 0; m < 60 && !isFinished(s); m++) {
      const r = step(s, declineAll(s, s.pendingCards), rng, STEPS);
      expect(r.state.pendingCards.some((c) => c.card.startsWith('news.'))).toBe(false);
      s = r.state;
    }
    for (const d of news) {
      const fired = s.events.fired.filter((f) => f.id === d.id);
      expect(fired, d.id).toHaveLength(1);
      if ('date' in d.trigger) expect(fired[0]!.date, d.id).toBe(d.trigger.date);
    }
  });

  it('the compiler accepts a plain record and refuses a card, a weather value or a non-unlock effect', () => {
    expect(compile(ok)[0]!.news).toEqual({ desk: 'city', tone: 'texture' });
    expect(() => compile(`${ok}\n  card: { options: [] }`)).toThrow(/no card/);
    expect(() => compile(ok.replace('tone: texture', 'tone: texture, weather: -2'))).toThrow(/weather/);
    expect(() => compile(`${ok}\n  effects: [ { kind: standing, delta: 1 } ]`)).toThrow(/effects may only/);
    expect(() => compile(ok.replace('desk: city', 'desk: moscow'))).toThrow(/desk/);
    expect(() => compile(ok.replace('claims: [ { id: phase1.local.shekou_slogan_1981, use: encyclopedia } ]', 'claims: []'))).toThrow(/claim/);
  });
});

describe('R9: timed modifiers (§5.8)', () => {
  const at = (ym: string) => slice.tick.events.find((d) => d.id === ym)!;
  /** Run declineAll month by month to a date; the states on the way. */
  function runTo(month: string, policy = declineAll, s0 = initial()) {
    let s = s0;
    const rng = new Rng(1), states: GameState[] = [];
    while (s.date < parseYM(month) && !isFinished(s)) { s = step(s, policy(s, s.pendingCards), rng, STEPS).state; states.push(s); }
    return { s, states };
  }

  it('the storm sets two modifiers for nine months, and they drop when they end', () => {
    // R10d (§5.13): the beat also opens the import quota
    expect(at('news.1982q1.concession_material').effects.map((e) => e.kind)).toEqual(['modifier', 'modifier', 'unlock']);
    const { s, states } = runTo('1983-01');
    const feb = states.find((x) => x.date === parseYM('1982-03'))!;   // the state after February's month
    const n = params.events['news.1982q1.concession_material']!;
    // declineAll answers the storm card `honest`: its modifiers end 3 months sooner
    const storm = (x: GameState) => (x.events.modifiers ?? []).filter((m) => m.source === 'news.1982q1.concession_material');
    expect(storm(feb).map((m) => m.target).sort()).toEqual(['investor_rate', 'scrutiny_gain']);
    expect(storm(feb)[0]!.until).toBe(parseYM('1982-02') + n.months! - 1);
    const mar = states.find((x) => x.date === parseYM('1982-04'))!;   // after March, when the answer applied
    expect(storm(mar)[0]!.until).toBe(parseYM('1982-02') + n.months! - 1 + params.events['event.1982q1.concession_storm']!.shift_honest!);
    expect(modifierFactor(mar, 'scrutiny_gain')).toBeCloseTo(n.scrutiny_gain!);
    expect(storm(s)).toEqual([]);                                    // ended by 1983-01
  });

  it('investor_rate scales the arrival chance, never the number of draws', () => {
    const base = runTo('1981-01').s;
    const arrivals = (factor?: number) => {
      let s = cloneState(base), n = 0;
      if (factor !== undefined) s.events.modifiers = [{ source: 'x', target: 'investor_rate', factor, until: s.date + 24 }];
      const rng = new Rng(7);
      for (let m = 0; m < 24; m++) {
        const r = step(s, declineAll(s, s.pendingCards), rng, STEPS);
        if (r.status === 'advanced') n += r.events.filter((e) => e.step === 'investment' && e.kind === 'offer_raised').length;
        s = r.state;
      }
      return n;
    };
    const none = arrivals(), zero = arrivals(1e-9), many = arrivals(50);
    expect(zero).toBe(0);
    expect(many).toBeGreaterThan(none);
  });

  it('live modifiers on a target multiply; an ended one scales nothing', () => {
    const s = initial();
    s.events.modifiers = [{ source: 'a', target: 'investor_rate', factor: 0.5, until: s.date + 2 },
      { source: 'b', target: 'investor_rate', factor: 0.8, until: s.date }, { source: 'c', target: 'scrutiny_gain', factor: 2, until: s.date - 1 }];
    expect(modifierFactor(s, 'investor_rate')).toBeCloseTo(0.4);
    expect(modifierFactor(s, 'scrutiny_gain')).toBe(1);
    expect(modifierFactor(s, 'cohort_crew')).toBe(1);
  });

  it('scrutiny_gain scales step 12 only while live, and by its factor', () => {
    const base = runTo('1981-01').s;
    base.policy.permitRegime = 'loose';                              // a known gain each month
    const plain = step(cloneState(base), declineAll(base, base.pendingCards), new Rng(3), STEPS).state.climate.scrutiny;
    const mod = cloneState(base);
    mod.events.modifiers = [{ source: 'x', target: 'scrutiny_gain', factor: 2, until: mod.date + 5 }];
    const doubled = step(mod, declineAll(mod, mod.pendingCards), new Rng(3), STEPS).state.climate.scrutiny;
    expect(doubled).toBeGreaterThan(plain);
    const ended = cloneState(base);
    ended.events.modifiers = [{ source: 'x', target: 'scrutiny_gain', factor: 2, until: ended.date - 1 }];
    expect(step(ended, declineAll(ended, ended.pendingCards), new Rng(3), STEPS).state.climate.scrutiny).toBe(plain);
  });

  it('cohortCrew scales by cohort_crew while live; save and load keep the modifiers', () => {
    const s = initial();
    const c = { m2: 1000 } as GameState['blocks'][number]['cohorts'][number];
    const plain = cohortCrew(c, params, s);
    s.events.modifiers = [{ source: 'event.1981q1.slogan', target: 'cohort_crew', factor: 0.5, until: s.date + 8 }];
    expect(cohortCrew(c, params, s)).toBe(Math.max(1, Math.ceil(1000 * params.capacity.crew_per_m2 * 0.5)));
    expect(cohortCrew(c, params, s)).toBeLessThan(plain);
    const back = loadGame(saveFromJson(saveToJson(saveGame(s, new Rng(1), slice.content)))).state;
    expect(back.events.modifiers).toEqual(s.events.modifiers);
    expect(cloneState(s).events.modifiers).toEqual(s.events.modifiers);
    expect(cloneState(s).events.modifiers).not.toBe(s.events.modifiers);
  });

  it('the compiler refuses an unknown target, a missing factor and a shift of an event with no modifier', () => {
    const one = (eff: string, pe: Record<string, number> = { investor_rate: 0.9, months: 3 }) => compileEvents(parse(`- id: news.y
  name: { zh: 乙, en: Y }
  family: news
  trigger: { date: 1981-03 }
  news: { desk: city, tone: texture }
  text: { zh: 乙, en: Y }
  effects: [ ${eff} ]
  claims: [ { id: phase1.local.shekou_slogan_1981, use: encyclopedia } ]`), { ...params, events: { ...params.events, 'news.y': pe } },
      slice.tick.investors!, slice.tick.fiscal);
    expect(one('{ kind: modifier, target: investor_rate }')[0]!.effects[0]).toEqual({ kind: 'modifier', target: 'investor_rate' });
    expect(() => one('{ kind: modifier, target: gdp }')).toThrow(/target must be one of/);
    expect(() => one('{ kind: modifier, target: scrutiny_gain }')).toThrow(/positive factor/);
    expect(() => one('{ kind: modifier, target: investor_rate }', { investor_rate: 0.9 })).toThrow(/positive integer/);
    expect(() => one('{ kind: standing }')).toThrow(/effects may only/);
  });
});
