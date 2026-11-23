/**
 * M5a's tests (phase1-slice.md §5.7): no effect without the content; the guaranteed first contract; triggers read
 * content; the SEZ chain; readiness and the first wave; incentives; Shekou's capture; the deal-maker's shortcut;
 * determinism.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LOAN_CARD, Rng, SHORTCUT_CARD, cellsOfRuns, compileEvents, createFirm, createInitialState, createTickSteps, firstWaveCards,
  loadGame, parseYM, previewOffer, readiness, replay, runMonths, runsOfCells, saveFromJson, saveGame, saveToJson, sizeOffer,
  step, validateParams, type CardInstance, type DecisionPolicy, type GameState, type PlayerAction, type SimEvent,
  type SliceParams, type TickStep,
} from '../src/index.js';
import {
  ROOT, areasJson, buildable, content, eventsM5a as events, fiscal, initial, investors, leaders, params, precedents, scenario,
  start as startContent,
} from './fixtures.js';
import { checkInvariants } from './invariants.js';

const HK = 'investor.hk_processing', SOE = 'investor.inland_state_unit', JV = 'investor.joint_venture';
const SEZ_ARCHETYPES = [JV, 'investor.foreign_owned', 'investor.overseas_chinese'];
const ym = (s: string) => parseYM(s);
const START = ym(scenario.start);
const monthOf = (d: string) => ym(d) - START;                 // month index in the run
const SEZ_MONTH = monthOf('1980-08');

const stepsFor = (p: SliceParams = params, more: { events?: typeof events | null; investors?: typeof investors } = {}) =>
  createTickSteps(p, { precedents, buildable, fiscal, investors: more.investors ?? investors,
    ...(more.events === null ? {} : { events: more.events ?? events }) });
const STEPS = stepsFor();
const withLeaders = (): GameState => createInitialState({ scenario, areas: areasJson, start: startContent, params, leaders });

interface Run { state: GameState; events: SimEvent[][]; states: GameState[] }
/** Month by month: cards answered by `answer` (else the first option), scripted actions by month index. */
function go(s0: GameState, months: number, opts: { steps?: readonly TickStep[]; seed?: number;
  answer?: (c: CardInstance, s: GameState) => string | undefined; script?: Record<number, PlayerAction[]>; invariants?: boolean } = {}): Run {
  const rng = new Rng(opts.seed ?? 1), steps = opts.steps ?? STEPS;
  let s = s0;
  const evs: SimEvent[][] = [], states: GameState[] = [];
  for (let m = 0; m < months; m++) {
    const cards = s.pendingCards.map((c): PlayerAction => ({ type: 'answer_card', instance: c.id,
      option: opts.answer?.(c, s) ?? c.options[0]! }));
    const r = step(s, [...cards, ...(opts.script?.[m] ?? [])], rng, steps);
    if (r.status !== 'advanced') throw new Error(`month ${m}: ${r.status}`);
    if (opts.invariants) checkInvariants(s, r.state, r.events);
    s = r.state;
    evs.push(r.events);
    states.push(s);
  }
  return { state: s, events: evs, states };
}
const isInvestor = (c: CardInstance) => investors.some((a) => a.id === c.card);
/** Decline every investor and shortcut; take the loan; otherwise the first option. */
const declineInvestors = (c: CardInstance) =>
  isInvestor(c) || c.card === SHORTCUT_CARD ? 'decline' : c.card === LOAN_CARD ? 'take' : undefined;
const kinds = (r: Run, kind: string, step?: string) =>
  r.events.flatMap((ev, m) => ev.filter((e) => e.kind === kind && (!step || e.step === step)).map((e) => ({ m, e })));

/** The first n cells of an area, as zone runs (area 7 is all buildable). */
const areaRuns = (area: number, n: number) => {
  const a = areasJson.areas.find((x) => x.id === area)!;
  return runsOfCells(cellsOfRuns(a.runs, areasJson.grid).slice(0, n), areasJson.grid.width);
};

describe('M5a: no effect without the content', () => {
  it('the new origins make no draw without the SEZ: a run is the same as with the two pre-SEZ archetypes only', () => {
    const P = validateParams({ ...params, investors: { ...params.investors, archetypes: { ...params.investors.archetypes,
      [HK]: { ...params.investors.archetypes[HK]!, rate_per_quarter: 1.5 } } } });
    const two = investors.filter((a) => a.id === HK || a.id === SOE);
    const all = go(initial(), 36, { steps: stepsFor(P, { events: null }), seed: 4 });
    const pre = go(initial(), 36, { steps: stepsFor(P, { events: null, investors: two }), seed: 4 });
    expect(saveToJson(saveGame(all.state, new Rng(4), content))).toBe(saveToJson(saveGame(pre.state, new Rng(4), content)));
    expect(all.state.firms.length).toBeGreaterThan(0);
    expect(all.state.firms.every((f) => f.archetype === HK || f.archetype === SOE)).toBe(true);
    expect(all.state.events).toEqual({ fired: [], unlocked: [] });
    expect(all.state.shekou.captured).toBe(0);
  });
});

describe('M5a: the guaranteed first contract', () => {
  it('is raised in the first month of turn 1 for every seed, fits existing premises, and opens a firm', () => {
    for (const seed of [1, 2, 3, 7]) {
      const r = go(initial(), 4, { seed, answer: (c) => (isInvestor(c) ? 'decline' : undefined) });
      const raised = kinds(r, 'offer_raised', 'events');
      expect(raised).toHaveLength(1);
      expect(raised[0]!.m).toBe(3);                           // turn 1, sub-step 0
      expect(r.states[3]!.turn).toBe(1);
      expect(raised[0]!.e.detail!.jobs).toBe(params.events['event.first_processing_contract']!.jobs);
    }
    const r = go(initial(), 4, { answer: (c) => (isInvestor(c) ? 'decline' : undefined) });
    const s = r.states[3]!;
    const card = s.pendingCards.find((c) => c.id === kinds(r, 'offer_raised', 'events')[0]!.e.detail!.card)!;
    expect(s.zones).toHaveLength(0);
    expect(card.card).toBe(HK);
    expect(card.options).toContain('accept:premises:1');
    const r2 = step(s, [{ type: 'answer_card', instance: card.id, option: 'accept:premises:1' }], new Rng(1), STEPS);
    if (r2.status !== 'advanced') throw new Error();
    const f = r2.state.firms.find((x) => x.archetype === HK && x.premises === 'existing' && x.jobs === 120)!;
    expect(f).toBeDefined();
    expect(f.opens).toBe(s.date + 1);
  });
});

describe('M5a: the SEZ chain', () => {
  it('raises the card on the anchor month, pauses, and opens the next month with the answered priority', () => {
    const r = go(initial(), SEZ_MONTH + 1, { answer: declineInvestors });
    const s = r.state;
    expect(s.date).toBe(ym('1980-09'));
    const card = s.pendingCards.find((c) => c.card === 'event.sez_established')!;
    expect(card.interrupting).toBe(true);
    expect(card.options).toEqual(['priority.industry', 'priority.trade', 'priority.commerce']);
    expect(s.events.fired.find((f) => f.id === 'event.sez_established')!.date).toBe(ym('1980-08'));
    expect(step(s, [], new Rng(1), STEPS).status).toBe('paused');
    expect(s.fiscal.regime).toBe('regime.county_1979');
    expect(s.events.unlocked).toEqual(['shekou.competes']);

    const report = card.payload!.report as { bar: number; forecastCards: number };
    const r2 = step(s, [{ type: 'answer_card', instance: card.id, option: 'priority.trade' }], new Rng(9), STEPS);
    if (r2.status !== 'advanced') throw new Error();
    const t = r2.state;
    expect(t.sez).toMatchObject({ opened: ym('1980-09'), priority: 'priority.trade' });
    expect(t.fiscal.regime).toBe('regime.contracting_1980s');
    expect(t.events.unlocked).toContain('investors.sez');
    const wave = r2.events.filter((e) => e.step === 'events' && e.kind === 'offer_raised');
    expect(wave).toHaveLength(firstWaveCards(t.sez.readiness!, params));
    expect(t.sez.waveCards).toBe(wave.length);
    expect(wave.length).toBe(report.forecastCards);           // nothing changed between the card and the opening
  });

  it('firstOption picks industry, and the wave draws from the industry mix', () => {
    const r = go(initial(), SEZ_MONTH + 2, { answer: (c) => (isInvestor(c) ? 'decline' : undefined) });
    expect(r.state.sez.priority).toBe('priority.industry');
    const mix = params.sez.priorities['priority.industry']!;
    for (const { e } of kinds(r, 'offer_raised', 'events').slice(1)) {
      const card = r.states.flatMap((s) => s.pendingCards).find((c) => c.id === e.detail!.card)!;
      expect(mix[card.card]).toBeGreaterThan(0);
    }
  });

  it('reads its date from content: moving the record moves the chain, with no code change', () => {
    const raw = parse(readFileSync(join(ROOT, 'content/slice/events.yaml'), 'utf8')) as Record<string, any>[];
    raw.find((e) => e.id === 'event.sez_established')!.trigger = { date: '1980-11' };
    const moved = compileEvents(raw, params, investors, fiscal);
    const r = go(initial(), monthOf('1980-11') + 1, { steps: stepsFor(params, { events: moved }), answer: declineInvestors });
    const fired = r.state.events.fired.find((f) => f.id === 'event.sez_established')!;
    expect(fired.date).toBe(ym('1980-11'));
    expect(r.states[SEZ_MONTH]!.events.fired.some((f) => f.id === 'event.sez_established')).toBe(false);
  });

  it('new origins arrive only after the opening', () => {
    const r = go(initial(), 45, { answer: declineInvestors, seed: 3 });
    const opened = r.state.sez.opened!;
    const sezCards = r.states.flatMap((s) => s.pendingCards).filter((c) => SEZ_ARCHETYPES.includes(c.card));
    expect(sezCards.length).toBeGreaterThan(0);
    for (const c of sezCards) expect(c.raisedAt).toBeGreaterThanOrEqual(opened);
  });
});

describe('M5a: readiness', () => {
  it('starts with every part below 1, and each part rises with its own work', () => {
    const s = initial();
    const r0 = readiness(s, params, buildable);
    expect(r0.cells).toBe(484 + 266 + 230 + 539);
    expect(r0.roads).toBe(0);
    expect(r0.servicedLand).toBe(0);
    expect(r0.waterPower).toBeGreaterThan(0);
    expect(r0.waterPower).toBeLessThan(1);
    expect(r0.weakest).toBe('roads');

    const roads = initial();
    roads.areas.find((a) => a.id === 1)!.roadKm = 2;
    const reach = (2 * params.readiness.road_reach_cells + 1) * 10 * 2;
    expect(readiness(roads, params, buildable).roads).toBeCloseTo(reach / r0.cells / params.readiness.full_at.roads, 12);
    roads.areas.find((a) => a.id === 4)!.roadKm = 50;          // not a readiness area
    expect(readiness(roads, params, buildable).roads).toBeCloseTo(reach / r0.cells / params.readiness.full_at.roads, 12);

    const served = initial();
    served.servicedLand = areaRuns(7, 10);
    expect(readiness(served, params, buildable).servicedLand).toBeCloseTo(10 / r0.cells / params.readiness.full_at.serviced_land, 12);
    served.servicedLand = areaRuns(4, 10);                     // area 4 is outside the readiness areas
    expect(readiness(served, params, buildable).servicedLand).toBe(0);

    // water and power: the lower ratio binds
    const W = params.readiness.standard_wave, own = params.industry.by_ownership[W.ownership];
    const wp = initial();
    for (const a of wp.areas) a.utilities = { powerCap: 0, waterCap: 0 };
    wp.areas.find((a) => a.id === 7)!.utilities = { powerCap: 1e9, waterCap: 0.4 * W.jobs * own.water_m3_day_per_job };
    expect(readiness(wp, params, buildable).waterPower).toBeCloseTo(0.4, 12);
    wp.areas.find((a) => a.id === 7)!.utilities.waterCap = 1e9;
    expect(readiness(wp, params, buildable).waterPower).toBe(1);

    // the bar is the weighted mean; the weakest part is named
    const all = initial();
    all.areas.find((a) => a.id === 1)!.roadKm = 2;
    all.servicedLand = areaRuns(7, 10);
    const r = readiness(all, params, buildable);
    const w = params.readiness.weights;
    expect(r.bar).toBeCloseTo((w.roads * r.roads + w.serviced_land * r.servicedLand + w.water_power * r.waterPower)
      / (w.roads + w.serviced_land + w.water_power), 12);
    expect(r.weakest).toBe([['roads', r.roads], ['servicedLand', r.servicedLand], ['waterPower', r.waterPower]]
      .sort((a, b) => (a[1] as number) - (b[1] as number))[0]![0]);
  });

  it('visibly changes the first wave: an affordable prologue plan beats an unprepared start', () => {
    const zone: PlayerAction = { type: 'create_zone', use: 'industrial', runs: areaRuns(7, 12) };
    const plan: Record<number, PlayerAction[]> = {
      0: [zone,
        { type: 'commit_project', template: 'project.road_link', area: 1 },
        { type: 'commit_project', template: 'project.power_line', area: 7 },
        { type: 'commit_project', template: 'project.site_preparation', zone: 1 }],
    };
    const months = SEZ_MONTH + 2;
    const bare = go(initial(), months, { answer: declineInvestors });
    const ready = go(initial(), months, { answer: declineInvestors, script: plan });
    expect(ready.state.fiscal.projectLoan).toBe('taken');
    expect(ready.state.fiscal.projects.every((x) => x.stage === 'done')).toBe(true);
    const b = bare.state.sez, p = ready.state.sez;
    expect(b.waveCards).toBe(params.readiness.first_wave.min_cards);
    expect(p.readiness!).toBeGreaterThan(b.readiness! + 0.3);
    expect(p.waveCards!).toBeGreaterThan(b.waveCards!);
    // the readiness check's forecast is the wave that followed: nothing changed in between
    for (const run of [bare, ready]) {
      const check = run.states.flatMap((s) => s.pendingCards).find((c) => c.card === 'event.readiness_check')!;
      expect(check.raisedAt).toBe(START + 15);
      expect((check.payload!.report as { forecastCards: number }).forecastCards).toBe(run.state.sez.waveCards);
    }
  });
});

describe('M5a: incentives', () => {
  it('a new-origin firm pays no tax during its holiday, then pays at the contracting rate; the preview shows it', () => {
    const P = validateParams({ ...params, investors: { ...params.investors, archetypes: { ...params.investors.archetypes,
      [JV]: { ...params.investors.archetypes[JV]!, build_months: 2, ramp_months: 1, tax_holiday_months: 3 } } } });
    const steps = stepsFor(P, { events: null });
    const s = initial();
    s.fiscal.regime = 'regime.contracting_1980s';
    s.zones.push({ id: 1, use: 'industrial', runs: areaRuns(7, 4), cellCount: 4, area: 7, created: s.date, name: { kind: 'generic' } });
    s.nextZoneId = 2;
    s.servicedLand = areaRuns(7, 4);
    const f = createFirm(s, P, sizeOffer(P, JV, 'joint_venture', 100), { premises: 'new_factory', area: 7, zone: 1 });
    expect(f.terms).toEqual({ taxHolidayMonths: 3 });
    const r = go(s, 10, { steps });
    const firm = r.state.firms[0]!;
    const opens = firm.opens!;
    const taxed = new Set(r.state.fiscal.ledger.filter((e) => e.ref === 'tax.industry').map((e) => e.date));
    for (let d = opens; d < opens + 3; d++) expect(taxed.has(d)).toBe(false);
    expect(taxed.has(opens + 3)).toBe(true);
    const k = opens + 3 - s.date;                              // the run index of the first taxed month
    const after = r.states[k]!, prev = r.states[k - 1]!;
    const rate = fiscal.regimes.find((x) => x.id === 'regime.contracting_1980s')!.tax;
    const fOut = after.firms[0]!.output;
    const entry = after.fiscal.ledger.slice(prev.fiscal.ledger.length).find((e) => e.ref === 'tax.industry')!;
    expect(entry.amount).toBe(Math.round(fOut * P.industry.by_ownership.joint_venture.value_added_ratio
      * rate.value_added_rate.joint_venture * P.fiscal.collection_efficiency * rate.local_share));

    const card: CardInstance = { id: 'x', card: JV, options: ['accept:zone:1', 'decline'], interrupting: false, raisedAt: s.date,
      payload: { offer: sizeOffer(params, JV, 'joint_venture', 100) } };
    const pv = previewOffer(initial(), card, params, { investors, buildable, fiscal });
    expect(pv.sites).toHaveLength(0);                          // no zone in a fresh state
    const s2 = initial();
    s2.zones.push({ id: 1, use: 'industrial', runs: areaRuns(7, 4), cellCount: 4, area: 7, created: s2.date, name: { kind: 'generic' } });
    const pv2 = previewOffer(s2, card, params, { investors, buildable, fiscal });
    expect(pv2.sites[0]).toMatchObject({ taxHolidayMonths: params.investors.archetypes[JV]!.tax_holiday_months, landFeeFactor: 1, shortcut: false });
  });
});

describe('M5a: Shekou captures lost investors', () => {
  it('takes none before it competes, and capture_share of those lost after, with no draw', () => {
    const P = validateParams({ ...params, investors: { ...params.investors, archetypes: { ...params.investors.archetypes,
      [HK]: { ...params.investors.archetypes[HK]!, rate_per_quarter: 3 } } } });
    const r = go(initial(), 18, { steps: stepsFor(P), answer: declineInvestors, seed: 5 });
    const unlock = monthOf('1979-07');
    const lost = ['offer_declined', 'offer_lapsed', 'offer_failed'].flatMap((k) => kinds(r, k, 'investment'));
    const before = lost.filter((x) => x.m < unlock).length, after = lost.filter((x) => x.m >= unlock).length;
    expect(before).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(2);
    expect(kinds(r, 'shekou_captured').every((x) => x.m >= unlock)).toBe(true);
    expect(r.state.shekou.captured).toBe(Math.floor(P.shekou.capture_share * after));
    expect(r.state.shekou.jobs).toBe(kinds(r, 'shekou_captured').reduce((a, x) => a + (x.e.detail!.jobs as number), 0));
  });
});

describe('M5a: the deal-maker\'s shortcut', () => {
  const P = validateParams({ ...params, investors: { ...params.investors, archetypes: { ...params.investors.archetypes,
    [HK]: { ...params.investors.archetypes[HK]!, rate_per_quarter: 3, jobs: [50, 50] },
    [SOE]: { ...params.investors.archetypes[SOE]!, rate_per_quarter: 0 } } } });
  const steps = stepsFor(P, { events: null });
  const ONE: PlayerAction = { type: 'create_zone', use: 'industrial', runs: areaRuns(7, 1) };
  /** Run until a shortcut card is pending; return that state. */
  const untilShortcut = (s0: GameState) => {
    let s = s0;
    for (let m = 0; m < 12; m++) {
      const r = step(s, m === 0 ? [ONE] : [], new Rng(2), steps);
      if (r.status !== 'advanced') throw new Error();
      s = r.state;
      if (s.pendingCards.some((c) => c.card === SHORTCUT_CARD)) return s;
    }
    throw new Error('no shortcut offered');
  };

  it('is offered only with a deal-maker and an unserviced zone that would fit; decline comes first', () => {
    const s = untilShortcut(withLeaders());
    const sc = s.pendingCards.find((c) => c.card === SHORTCUT_CARD)!;
    expect(sc.options).toEqual(['decline', 'accept:zone:1']);
    const offer = s.pendingCards.find((c) => c.id === sc.payload!.offerCard)!;
    expect(offer.options.some((o) => o.startsWith('accept:zone:'))).toBe(false);
    expect(sc.expires).toBe(offer.expires);
    // once per offer
    const r = step(s, [], new Rng(2), steps);
    if (r.status !== 'advanced') throw new Error();
    expect(r.state.pendingCards.filter((c) => c.card === SHORTCUT_CARD && c.payload!.offerCard === offer.id)).toHaveLength(1);
    // no leaders, no shortcut
    let t = initial();
    for (let m = 0; m < 12; m++) {
      const q = step(t, m === 0 ? [ONE] : [], new Rng(2), steps);
      if (q.status !== 'advanced') throw new Error();
      t = q.state;
      expect(t.pendingCards.some((c) => c.card === SHORTCUT_CARD)).toBe(false);
    }
    expect(t.pendingCards.some((c) => c.card === HK)).toBe(true);
  });

  it('accepting sites the firm on unserviced land at a sweetheart price, with the risk recorded', () => {
    const s = untilShortcut(withLeaders());
    const sc = s.pendingCards.find((c) => c.card === SHORTCUT_CARD)!;
    const pv = previewOffer(s, sc, P, { investors, buildable, fiscal });
    expect(pv.sites[0]).toMatchObject({ option: 'accept:zone:1', shortcut: true, landFeeFactor: P.shortcut.land_fee_factor,
      taxHolidayMonths: P.shortcut.extra_tax_holiday_months, zoneFreeM2: 10_000 * P.industry.max_far });
    const r = step(s, [{ type: 'answer_card', instance: sc.id, option: 'accept:zone:1' }], new Rng(2), steps);
    if (r.status !== 'advanced') throw new Error();
    const t = r.state;
    const f = t.firms.find((x) => x.zone === 1)!;
    expect(f.terms).toEqual({ taxHolidayMonths: P.shortcut.extra_tax_holiday_months, landFeeFactor: P.shortcut.land_fee_factor,
      shortcut: 'leader.mayor' });
    expect(t.zones[0]!.servicedShare).toBe(0);
    expect(t.pendingCards.some((c) => c.id === sc.payload!.offerCard)).toBe(false);
    const mayor = t.leadership.leaders.find((l) => l.id === 'leader.mayor')!;
    expect(mayor.disciplineRisk).toBe(P.shortcut.discipline_weight);
    expect(t.leadership.entangled).toEqual([{ leader: 'leader.mayor', ref: `firm.${f.id}`, date: s.date }]);
    expect(r.events.some((e) => e.kind === 'offer_accepted' && e.detail!.shortcut === 'leader.mayor')).toBe(true);
  });

  it('declining costs rapport; an offer answered in the same call wins; the card leaves with its offer', () => {
    const s = untilShortcut(withLeaders());
    const sc = s.pendingCards.find((c) => c.card === SHORTCUT_CARD)!;
    const offerId = sc.payload!.offerCard as string;
    const d = step(s, [{ type: 'answer_card', instance: sc.id, option: 'decline' }], new Rng(2), steps);
    if (d.status !== 'advanced') throw new Error();
    expect(d.state.leadership.leaders.find((l) => l.id === 'leader.mayor')!.rapport).toBe(-P.shortcut.rapport_on_decline);
    expect(d.state.pendingCards.some((c) => c.id === offerId)).toBe(true);
    expect(d.state.leadership.entangled).toHaveLength(0);

    const both = step(s, [{ type: 'answer_card', instance: offerId, option: 'decline' },
      { type: 'answer_card', instance: sc.id, option: 'accept:zone:1' }], new Rng(2), steps);
    if (both.status !== 'advanced') throw new Error();
    expect(both.state.firms.some((f) => f.zone === 1)).toBe(false);
    expect(both.events.some((e) => e.kind === 'offer_declined' && e.detail!.card === offerId)).toBe(true);
    expect(both.events.some((e) => e.kind === 'offer_failed' && e.detail!.card === sc.id)).toBe(true);

    // the offer lapses: the shortcut is withdrawn with it
    let t = s;
    for (let m = 0; m < P.investors.offer_months + 1 && t.pendingCards.some((c) => c.id === offerId); m++) {
      const q = step(t, [], new Rng(2), steps);
      if (q.status !== 'advanced') throw new Error();
      t = q.state;
    }
    expect(t.pendingCards.some((c) => c.id === offerId)).toBe(false);
    expect(t.pendingCards.some((c) => c.card === SHORTCUT_CARD && c.payload!.offerCard === offerId)).toBe(false);
  });
});

describe('M5a: determinism', () => {
  /** Accept every shortcut (leaving its offer to it), the first site of every other offer, and take the loan. */
  const policy: DecisionPolicy = (_s, pending) => pending
    .filter((c) => !pending.some((x) => x.card === SHORTCUT_CARD && x.payload!.offerCard === c.id))
    .map((c) => ({ type: 'answer_card', instance: c.id,
      option: c.card === SHORTCUT_CARD ? c.options[c.options.length - 1]! : c.card === LOAN_CARD ? 'take' : c.options[0]! }));
  const script = (s: GameState): PlayerAction[] => s.date === START
    ? [{ type: 'create_zone', use: 'industrial', runs: areaRuns(7, 20) }] : [];
  const scripted: DecisionPolicy = (s, pending) => [...policy(s, pending), ...script(s)];
  const MONTHS = SEZ_MONTH + 8;

  it('saves, loads and continues, and replays, through the SEZ chain with shortcuts and captures', () => {
    const rng = new Rng(21);
    const full = runMonths(withLeaders(), MONTHS, rng, scripted, STEPS);
    expect(full.sez.opened).toBeDefined();
    expect(full.leadership.entangled.length).toBeGreaterThan(0);
    const text = saveToJson(saveGame(full, rng, content));
    for (const k of [5, SEZ_MONTH, SEZ_MONTH + 1]) {
      const r1 = new Rng(21);
      const mid = runMonths(withLeaders(), k, r1, scripted, STEPS);
      const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, r1, content))));
      const end = runMonths(loaded.state, MONTHS - k, loaded.rng, scripted, STEPS);
      expect(saveToJson(saveGame(end, loaded.rng, content))).toBe(text);
    }
    const again = replay(withLeaders(), full.actionLog, MONTHS, new Rng(21), STEPS);
    expect(saveToJson(saveGame(again, new Rng(0), content))).toBe(saveToJson(saveGame(full, new Rng(0), content)));
  });

  it('does not change its input, and keeps the invariants', () => {
    let s = withLeaders();
    const rng = new Rng(3);
    for (let m = 0; m < SEZ_MONTH + 3; m++) {
      const before = saveToJson(saveGame(s, new Rng(0), content));
      const r = step(s, scripted(s, s.pendingCards), rng, STEPS);
      if (r.status !== 'advanced') throw new Error(r.status);
      expect(saveToJson(saveGame(s, new Rng(0), content))).toBe(before);
      checkInvariants(s, r.state, r.events);
      s = r.state;
    }
  });
});
