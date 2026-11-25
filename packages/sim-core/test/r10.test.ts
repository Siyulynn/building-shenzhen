/**
 * R10's tests (phase1-slice.md §5.13). R10a: the construction line, the sector series, the population categories and
 * save version 9's unlock re-application; R10b: the start composition; R10c: trading firms, customs and forex; R10d: the import quota; tested on a save built here and, when present, on the untracked version-5
 * save the pre-R8 code wrote (test/fixtures-data/save-v5.json).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  Rng, SAVE_VERSION, aggressive, applyTurnAction, cloneState, createTickSteps, firmFreight, firmValueAdded, firstOption, freightContent, gatewayAreas, gateRefusal,
  gdpBySector, historical, importsUsd, loadGame, playQuarters, popCategories, runMonths, saveFromJson, saveGame, saveToJson,
  validateParams, verdict, yearPoint, type GameState,
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

describe('R10b start composition and workshop-sized firms (§5.13)', () => {
  const G = params.growth!, C = G.collective!;
  const organic = (s: GameState, archetype: string) => s.firms.filter((f) => f.origin === 'organic' && f.archetype === archetype);

  it('organic processing firms are workshop-sized; collectives are smaller, sell at home and have no freight', () => {
    expect(G.industrial.firm_jobs).toBeGreaterThanOrEqual(100);
    expect(G.industrial.firm_jobs).toBeLessThanOrEqual(150);
    expect(C.firm_jobs).toBeLessThan(G.industrial.firm_jobs);
    expect(C.ownership).toBe('local_collective');
    const o = params.industry.by_ownership.local_collective;
    expect(o.export_share).toBeLessThan(0.5);
    expect(params.industry.by_ownership.hk_processing.export_share).toBe(1);          // processing stays 100% export (§4b.2 item 2)
    const s = played.rec.final;
    const coll = organic(s, C.archetype), proc = organic(s, G.industrial.archetype);
    expect(coll.length).toBeGreaterThan(0);
    expect(proc.length).toBeGreaterThan(0);
    expect(coll.every((f) => f.ownership === 'local_collective' && f.jobs === C.firm_jobs)).toBe(true);
    expect(proc.every((f) => f.jobs === G.industrial.firm_jobs)).toBe(true);
    expect(coll.every((f) => firmFreight(f, params.freight!) === undefined)).toBe(true);
  });

  it('the collectives bank their own demand, no more than one firm while no land fits', () => {
    const end = runMonths(initial(), 3, new Rng(1), undefined, STEPS);
    expect(end.firms.filter((f) => f.origin === 'organic')).toEqual([]);
    expect(end.growth.collectiveCarry).toBeGreaterThan(0);
    expect(end.growth.collectiveCarry!).toBeLessThanOrEqual(C.firm_jobs * params.industry.by_ownership.local_collective.floor_m2_per_job);
  });

  it('a collective stream needs an archetype of its own', () => {
    expect(() => validateParams({ ...params, growth: { ...G, collective: { ...C, archetype: G.industrial.archetype } } }))
      .toThrow(/collective.archetype must differ/);
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

describe('R10c trading firms, customs and forex (§5.13)', () => {
  const G = params.growth!, T = G.commercial!;
  const full = run(slice.init.scenario.turns);
  const ledger = (s: GameState, type: string, ref?: string) =>
    s.fiscal.ledger.filter((e) => e.type === type && (ref === undefined || e.ref === ref));

  it('trading firms are services firms on commercial zones, in areas a road reaches a Hong Kong gateway from', () => {
    const s = full.rec.final;
    const t = s.firms.filter((f) => f.archetype === T.archetype);
    expect(t.length).toBeGreaterThan(0);
    const reached = gatewayAreas(s, { network: slice.tick.network!, freight: freightContent(params, slice.tick.network!, slice.tick.gateways)! })!;
    for (const f of t) {
      expect(f.sector).toBe('services');
      expect(f.dormM2).toBe(0);
      expect(s.zones.find((z) => z.id === f.zone)!.use).toBe('commercial');
      expect(reached.has(f.area)).toBe(true);
    }
    expect(t.some((f) => f.posted > 0)).toBe(true);
    expect(s.firms.filter((f) => f.sector === 'services').every((f) => f.archetype === T.archetype)).toBe(true);
  });

  it("the services firms' value added is tertiary, the factories' secondary", () => {
    const s = full.rec.final, va = firmValueAdded(s, params);
    expect(va.services).toBeGreaterThan(0);
    let svc = 0;
    for (const f of s.firms) if (f.sector === 'services') svc += f.output * params.industry.by_ownership[f.ownership].value_added_ratio;
    expect(va.services).toBeCloseTo(svc, 6);
  });

  it('customs is general revenue; trade imports draw the forex quota, which never goes below zero', () => {
    const s = full.rec.final;
    const customs = ledger(s, 'customs');
    expect(customs.length).toBeGreaterThan(0);
    expect(customs.every((e) => e.account === 'general' && e.amount >= 0)).toBe(true);
    const imports = ledger(s, 'import', 'import.trade');
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.every((e) => e.account === 'forex' && e.amount < 0)).toBe(true);
    for (const q of full.rec.quarterEnds) expect(q.fiscal.balances.forex).toBeGreaterThanOrEqual(0);
  });

  it('with no forex quota, the trading firms sell nothing and nothing is imported', () => {
    const s0 = full.rec.quarterEnds.find((q) => q.firms.some((f) => f.sector === 'services' && f.posted > 0))!;
    const dry = cloneState(s0);
    dry.fiscal.balances.forex = 0;
    const before = dry.fiscal.ledger.length;
    const end = runMonths(dry, 1, new Rng(3), firstOption, STEPS);
    // retention arrives in step 11, after production: the month's trade was capped at the empty quota
    expect(end.firms.filter((f) => f.sector === 'services').every((f) => f.output === 0)).toBe(true);
    expect(end.fiscal.ledger.slice(before).some((e) => e.ref === 'import.trade')).toBe(false);
    expect(importsUsd(end, params)).toBe(0);
  });

  it('the SEZ\'s first priority steers the trading stream; a services ownership must build on commercial zones', () => {
    // from the same state, a trade priority builds more trading firms in a year than an industry priority
    const s1 = full.rec.quarterEnds.find((q) => q.firms.some((f) => f.sector === 'services'))!;
    const built = (priority: string) => {
      const s = cloneState(s1);
      s.sez.priority = priority as never;
      return runMonths(s, 12, new Rng(4), firstOption, STEPS).firms.filter((f) => f.sector === 'services').length;
    };
    expect(built('priority.trade')).toBeGreaterThan(built('priority.industry'));
    expect(T.priority_factor!['priority.trade']!).toBeGreaterThan(T.priority_factor!.default!);
    expect(T.priority_factor!['priority.commerce']!).toBeGreaterThan(T.priority_factor!.default!);
    expect(() => validateParams({ ...params, growth: { ...G, commercial: { ...T, zone_use: 'industrial' } } })).toThrow(/commercial zones/);
    expect(params.industry.by_ownership.trading_company.export_share).toBe(0);
    expect(params.trade!.customs.local_share).toBeGreaterThan(0);
  });

  it('the year points report customs, its share of revenue, and the forex the trade spends and the exports earn', () => {
    const y = full.rec.final;
    const last = yearPoint(y, params);
    expect(last.customsYear).toBeGreaterThan(0);
    expect(last.customsShare).toBeCloseTo(last.customsYear / last.revenue, 3);
    expect(last.importsUsdYear).toBeGreaterThan(0);
    expect(last.forexEarnedUsdYear).toBeGreaterThan(0);
    expect(last.forexUsd).toBe(Math.round(y.fiscal.balances.forex));
  });
});

describe('R10d the import quota (§5.13)', () => {
  const beat = 'news.1982q1.concession_material';
  // the state of the first quarter end with the quota's tool open and trading firms posting
  const full = run(slice.init.scenario.turns);
  const s0 = full.rec.quarterEnds.find((q) => q.events.unlocked.includes('tools.import_quota')
    && q.firms.some((f) => f.sector === 'services' && f.posted > 0))!;
  const from = (level: 'strict' | 'balanced' | 'open', months: number, steps = STEPS) => {
    const s = cloneState(s0);
    s.policy.importQuota = level;
    return runMonths(s, months, new Rng(5), firstOption, steps);
  };

  it('is gated by the February 1982 beat; an unknown level is refused', () => {
    expect(events.find((d) => d.id === beat)!.effects!.some((e) => e.kind === 'unlock' && e.key === 'tools.import_quota')).toBe(true);
    const before = full.rec.quarterEnds.find((q) => !q.events.unlocked.includes('tools.import_quota') && q.events.unlocked.includes('investors.sez'))!;
    expect(gateRefusal(before, slice.tick.gates!, { type: 'set_import_quota', level: 'open' })).toBeDefined();
    expect(gateRefusal(s0, slice.tick.gates!, { type: 'set_import_quota', level: 'open' })).toBeUndefined();
    const s = cloneState(s0);
    applyTurnAction(s, { type: 'set_import_quota', level: 'strict' }, STEPS);
    expect(s.policy.importQuota).toBe('strict');
    expect(() => applyTurnAction(cloneState(s0), { type: 'set_import_quota', level: 'lavish' as never }, STEPS)).toThrow(/unknown import quota/);
  });

  it('open sells more, collects more customs and burns more forex than balanced, and strict less', () => {
    const r = (['strict', 'balanced', 'open'] as const).map((l) => {
      const e = from(l, 12), y = yearPoint(e, params);
      return { tertiary: y.gdpSectorYear.tertiary, customs: y.customsYear, imports: y.importsUsdYear, forex: y.forexUsd };
    });
    for (const k of ['tertiary', 'customs', 'imports'] as const) {
      expect(r[0]![k]).toBeLessThan(r[1]![k]);
      expect(r[1]![k]).toBeLessThan(r[2]![k]);
    }
    expect(r[2]!.forex).toBeLessThan(r[1]!.forex);
    expect(r[1]!.forex).toBeLessThan(r[0]!.forex);
  });

  it('a month of imports uses only the setting\'s share of the quota', () => {
    const s = cloneState(s0);
    s.policy.importQuota = 'strict';
    s.fiscal.balances.forex = 1000;
    const end = runMonths(s, 1, new Rng(5), firstOption, STEPS);
    const drawn = -end.fiscal.ledger.filter((e) => e.date === s0.date && e.ref === 'import.trade').reduce((a, e) => a + e.amount, 0);
    expect(drawn).toBeLessThanOrEqual(1000 * params.trade!.import_quota!.strict.forex_share + 1);
  });

  it('open draws scrutiny while the quota is falling, and only then', () => {
    // without retention the quota only falls while trade imports
    const noRetention = validateParams({ ...params, fiscal: { ...params.fiscal, forex: { ...params.fiscal.forex, retention_share: 0 } } });
    const steps = createTickSteps(noRetention, slice.tick);
    const scrutiny = (l: 'balanced' | 'open', p = steps) => from(l, 1, p).climate.scrutiny;
    expect(scrutiny('open')).toBeGreaterThan(scrutiny('balanced'));
    expect(params.trade!.import_quota!.balanced.scrutiny_gain).toBe(0);
    // with all exports retained the quota rises: open draws nothing more than balanced
    const rising = createTickSteps(validateParams({ ...params, fiscal: { ...params.fiscal, forex: { ...params.fiscal.forex, retention_share: 1 } } }), slice.tick);
    expect(from('open', 1, rising).fiscal.balances.forex).toBeGreaterThan(s0.fiscal.balances.forex);
    expect(scrutiny('open', rising)).toBe(scrutiny('balanced', rising));
  });

  it('the aggressive player opens it once the beat fires; the verdict reports the forex burned', () => {
    const agg = playQuarters(initial(), new Rng(1), STEPS, aggressive(params, slice.tick), slice.init.scenario.turns).final;
    expect(agg.policy.importQuota).toBe('open');
    expect(full.rec.final.policy.importQuota).toBeUndefined();          // the historical player keeps the default
    const v = verdict(full.rec.final, params, slice.tick.fiscal!);
    const burned = -full.rec.final.fiscal.ledger.filter((e) => e.ref === 'import.trade').reduce((a, e) => a + e.amount, 0);
    expect(v.forex.burnedUsd).toBeCloseTo(burned, 6);
    expect(v.forex.burnedUsd).toBeGreaterThan(0);
    expect(v.forex.quotaUsd).toBe(full.rec.final.fiscal.balances.forex);
  });
});
