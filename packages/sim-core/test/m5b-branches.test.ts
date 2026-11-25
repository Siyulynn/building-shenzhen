/**
 * M5b's branches and edge cases (phase1-slice.md §5.8): quarterly turns through the whole slice, lapsing crisis
 * cards, the budget card's numbers, the co-financing deal, event-only teams, the milestones, the orders slump, the
 * fire's veto, the Corps deployment, the climate's event gains, the sweep's clock, indicators between turns, and the
 * compilers' error paths.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Rng, climate, compileEvents, compileLeaders, compileTargets, createInitialState, createTickSteps, declineAll, fiscalViews,
  historicalPrologue, indicatorValue, isFinished, parseYM, runQuarter, step, sweepActive, validateParams,
  type CardInstance, type DecisionPolicy, type EventDef, type ReviewIndicator, type GameState, type PlayerAction, type SimEvent, type SliceParams,
} from '../src/index.js';
import {
  ROOT, areasJson, buildable, events, fiscal, investors, leaders, params, precedents, scenario, start, targets, UNGATED } from './fixtures.js';

const START = parseYM(scenario.start);
const monthOf = (d: string) => parseYM(d) - START;
const LAST = monthOf('1984-01');
const rawEvents = () => parse(readFileSync(join(ROOT, 'content/slice/events.yaml'), 'utf8')) as Record<string, any>[];
const stepsWith = (evs: readonly EventDef[] = events, p: SliceParams = params) =>
  createTickSteps(p, { precedents, buildable, fiscal, investors, events: evs, targets });
const STEPS = stepsWith();
const fresh = (p: SliceParams = params): GameState => createInitialState({ scenario, areas: areasJson, start, params: p, leaders });
const answer = (c: CardInstance, option: string): PlayerAction => ({ type: 'answer_card', instance: c.id, option });

function run(policy: DecisionPolicy, months: number, steps = STEPS, s0 = fresh(), edit?: (s: GameState, m: number) => void) {
  const rng = new Rng(1);
  let s = s0;
  const states: GameState[] = [], evs: SimEvent[][] = [];
  for (let m = 0; m < months && !isFinished(s); m++) {
    edit?.(s, m);
    const r = step(s, policy(s, s.pendingCards), rng, steps);
    if (r.status !== 'advanced') throw new Error(`month ${m}: ${r.status}`);
    s = r.state; states.push(s); evs.push(r.events);
  }
  return { state: s, states, events: evs };
}
/** Events compiled from content with some records changed. */
function eventsWith(change: (r: Record<string, any>) => void, p: SliceParams = params) {
  const raw = rawEvents();
  for (const r of raw) change(r);
  return compileEvents(raw, p, investors, fiscal);
}

describe('M5b: quarterly turns through the whole slice', () => {
  it('runQuarter runs 1979-Q1 to the visit; each prologue decision lands in its own quarter', () => {
    const rng = new Rng(1);
    let s = fresh();
    const answers: { card: string; turn: number; answeredAt: number }[] = [];
    for (let guard = 0; guard < 200; guard++) {
      const acts = declineAll(s, s.pendingCards);
      for (const c of s.pendingCards) answers.push({ card: c.card, turn: Math.floor((c.raisedAt - START) / 3), answeredAt: s.date });
      const r = runQuarter(s, acts, rng, STEPS);
      s = r.state;
      if (r.status === 'finished') break;
    }
    expect(s.ended).toEqual({ date: START + LAST, reason: 'visit' });
    for (const id of ['event.first_project', 'event.permit_choice', 'event.corps_advance', 'event.cofinancing', 'event.readiness_check']) {
      const a = answers.find((x) => x.card === id)!;
      expect(a, id).toBeDefined();
      expect(Math.floor((a.answeredAt - START) / 3), id).toBe(a.turn);   // answered in the quarter that raised it
    }
  });

  it('the failure card interrupts: runQuarter pauses on it, and answering it finishes the run', () => {
    const p = validateParams({ ...params, climate: { ...params.climate, scrutiny_decay: 0 } });
    let s = fresh(p);
    s.climate.scrutiny = 100;
    const rng = new Rng(1), steps = stepsWith(events, p);
    let last: ReturnType<typeof runQuarter> | undefined;
    for (let q = 0; q < 8; q++) {
      last = runQuarter(s, declineAll(s, s.pendingCards), rng, steps);
      s = last.state;
      if (s.ended) break;
    }
    expect(s.ended?.reason).toBe('failure');
    expect(last!.status).toBe('turn_end');
    expect(s.pendingCards.filter((c) => c.interrupting).map((c) => c.card)).toContain('climate.failure');
    expect(runQuarter(s, declineAll(s, s.pendingCards), rng, steps).status).toBe('finished');
  });
});

describe('M5b: a crisis card that lapses takes its lapse option', () => {
  it('an ignored typhoon is left unrepaired: scrutiny, and no cost', () => {
    const onlyInterrupting: DecisionPolicy = (s, pending) => declineAll(s, pending.filter((c) => c.interrupting));
    const r = run(onlyInterrupting, 12);
    const m = r.events.findIndex((ev) => ev.some((e) => e.kind === 'event_card_lapsed' && e.detail!.option === 'defer'));
    expect(m).toBeGreaterThan(0);
    expect(r.events[m]!.some((e) => e.kind === 'scrutiny' && e.detail!.by === 'event.typhoon')).toBe(true);
    expect(r.states[m]!.fiscal.obligations.some((o) => o.createdBy === 'event.typhoon')).toBe(false);
  });
});

describe('M5b: the budget card\'s numbers', () => {
  it('reports last month\'s balance with this month\'s grant, and the warning at the coming grant', () => {
    const r = run(declineAll, LAST + 1);
    const per = params.fiscal.provincial_base_grant_per_year / 12;
    for (const at of ['1982-01', '1983-01', '1984-01']) {
      const m = monthOf(at);
      const before = r.states[m - 1]!;                                   // the state the January step starts from
      const card = r.states[m]!.pendingCards.find((c) => c.card === 'event.budget' && c.raisedAt === START + m)!;
      const b = card.payload!.budget as { grantFactor: number; recurring: number; warning?: { factor: number; recurringAfter: number } };
      const lastGrant = before.fiscal.ledger.filter((e) => e.date === START + m - 1 && e.type === 'grant').reduce((a, e) => a + e.amount, 0);
      expect(b.recurring, at).toBeCloseTo(fiscalViews(before, params).recurring.available - lastGrant + per * b.grantFactor, 6);
      if (b.warning) expect(b.warning.recurringAfter, at).toBeCloseTo(b.recurring - per * b.grantFactor + per * b.warning.factor, 6);
    }
    // 1983-01: the halving shows at once, a full half-grant below December's balance
    const jan83 = monthOf('1983-01');
    const b83 = r.states[jan83]!.pendingCards.find((c) => c.card === 'event.budget' && c.raisedAt === START + jan83)!.payload!.budget as { recurring: number };
    expect(b83.recurring).toBeCloseTo(fiscalViews(r.states[jan83 - 1]!, params).recurring.available - per / 2, 6);
  });
});

describe('M5b: the co-financing deal', () => {
  it('declining the investor cancels its substation order (R9)', () => {
    const policy: DecisionPolicy = (s, pending) => declineAll(s, pending).map((a) => {
      const c = pending.find((x) => a.type === 'answer_card' && x.id === a.instance)!;
      return c.card === 'event.cofinancing' ? answer(c, 'accept') : a;     // the investor's own offer is declined
    });
    const r = run(policy, monthOf('1980-09'), createTickSteps(params, UNGATED));   // a works order needs the start network
    const x = r.state.worksOrders.find((q) => q.cofinanced)!;
    expect(x.stage).toBe('cancelled');
    expect(r.state.structures.some((q) => q.cell === x.placement!.cell)).toBe(false);
    expect(r.events.flat().some((e) => e.kind === 'cofinance_withdrawn' && e.detail!.order === x.id)).toBe(true);
  });

  it('an event-only team cannot be contracted by the player', () => {
    const s = fresh();
    expect(() => step(s, [{ type: 'contract_team', team: 'team.corps_advance', mode: 'pool' }], new Rng(1), STEPS))
      .toThrow(/only with its event/);
    const r = run(declineAll, monthOf('1979-11'));
    expect(r.state.fiscal.contracts.some((c) => c.team === 'team.corps_advance')).toBe(true);
  });
});

describe('M5b: milestones, orders, the fire, the Corps', () => {
  it('the first zone firm fires the milestone, and after the SEZ the mandate is met', () => {
    const zoneFirst: DecisionPolicy = (s, pending) => historicalPrologue(s, pending).map((a) => {
      const c = pending.find((x) => a.type === 'answer_card' && x.id === a.instance);
      const z = c?.options.find((o) => o.startsWith('accept:zone:'));
      return c && z && c.payload?.offer !== undefined && c.card !== 'leader.shortcut' ? answer(c, z) : a;
    });
    const r = run(zoneFirst, LAST + 1);
    const fired = (id: string) => r.state.events.fired.find((f) => f.id === id);
    expect(fired('event.first_zone')).toBeDefined();
    expect(fired('event.mandate_met')).toBeDefined();
    expect(fired('event.mandate_met')!.date).toBeGreaterThanOrEqual(r.state.sez.opened!);
    expect(r.state.events.unlocked).toContain('mandate.met');
    const declined = run(declineAll, LAST + 1);
    expect(declined.state.events.fired.some((f) => f.id === 'event.shekou_poach')).toBe(true);
    expect(declined.state.events.fired.some((f) => f.id === 'event.first_zone')).toBe(false);
  });

  it('an orders slump caps every open firm\'s posts at its factor', () => {
    const r = run(historicalPrologue, 18, STEPS, fresh(), (s, m) => {
      if (m === 17) s.orders = { factor: 0.5, until: s.date + 5 };
    });
    const s = r.state;
    const open = s.firms.filter((f) => f.opens !== undefined && f.opens < s.date - 1);
    expect(open.length).toBeGreaterThan(0);
    for (const f of open) expect(f.posted).toBeLessThanOrEqual(Math.floor(f.jobs * 0.5));
  });

  it('a fire vetoes that year\'s review on its order check', () => {
    const evs = eventsWith((r) => { if (r.id === 'event.fire') r.trigger = { hazard: 1, from_turn: 6, condition: 'firm_open' }; });
    const r = run(historicalPrologue, monthOf('1980-12') + 1, stepsWith(evs));
    expect(r.state.reviews.vetoes.some((v) => v.reason === 'order_check')).toBe(true);
    const review = r.state.reviews.held[1]!;
    expect(review.vetoed).toBe('order_check');
    expect(review.pass).toBe(false);
    expect(review.score).toBeGreaterThanOrEqual(params.review.pass_mark);       // it would have passed
  });

  it('accepting the Corps deployment signs a pool contract for the engineering corps', () => {
    const r = run(declineAll, monthOf('1982-10') + 1);
    const k = r.state.fiscal.contracts.find((c) => c.team === 'team.engineering_corps')!;
    expect(k.mode).toBe('pool');
    expect(k.signed).toBe(START + monthOf('1982-10'));
  });
});

describe('M5b: the climate\'s event gains, the sweep\'s clock, indicators between turns', () => {
  it('grey land money and an accepted shortcut add their gains', () => {
    const s = fresh();
    const evs: SimEvent[] = [
      { step: 'finance', kind: 'land_for_recurring', detail: { amount: 200000, status: 'grey' } },
      { step: 'investment', kind: 'offer_accepted', detail: { card: 'x', firm: 1, shortcut: 'leader.mayor' } },
      { step: 'investment', kind: 'offer_accepted', detail: { card: 'y', firm: 2 } },
    ];
    climate(params)({ state: s, rng: new Rng(1).stream('stability'), events: evs, raise: () => { throw new Error('no card'); } });
    const g = params.climate.gain;
    expect(s.climate.scrutiny).toBeCloseTo(params.climate.permit_factor.standard * (g.grey_land_per_100k * 2 + g.shortcut), 9);
  });

  it('a two-month sweep still covers December\'s review', () => {
    const p = validateParams({ ...params, sweep: { ...params.sweep, campaign_months: 2, base_p: 1000 } });
    const october = monthOf('1980-10');
    const policy: DecisionPolicy = (s, pending) => declineAll(s, pending).map((a) => {
      const c = pending.find((x) => a.type === 'answer_card' && x.id === a.instance);
      return c?.card === 'event.sweep' && c.raisedAt === START + october ? answer(c, 'sweep') : a;
    });
    const r = run(policy, october + 3, stepsWith(events, p), fresh(p), (s, m) => {
      if (m === october - 1) for (const b of s.blocks) for (const c of b.cohorts) {
        if (c.stage === 'completed' && c.archetype === 'village_rental') c.legality = 'unpermitted_tolerated';
      }
    });
    expect(sweepActive(r.states[october + 2]!)).toBe(false);   // over after December
    expect(r.state.reviews.held[1]!.caught).toBe(true);
  });

  it('between turns, an indicator is the value the review read', () => {
    const r = run(historicalPrologue, LAST + 1);
    for (const rec of r.state.reviews.held) {
      const after = r.states[rec.date - START]!;                  // the state after December: its date is January
      expect(after.date).toBe(rec.date + 1);
      for (const it of rec.items) expect(indicatorValue(after, params, it.indicator as ReviewIndicator), `${rec.index} ${it.indicator}`).toBeCloseTo(it.value, 9);
    }
  });
});

describe('M5b: the compilers refuse bad content', () => {
  const bad = (change: (r: Record<string, any>) => void) => () => eventsWith(change);
  it('events', () => {
    expect(bad((r) => { if (r.id === 'event.typhoon') r.card.lapse = 'nope'; })).toThrow(/lapse/);
    expect(bad((r) => { if (r.id === 'event.sweep') r.card.lapse = 'sweep'; })).toThrow(/never lapses/);
    expect(bad((r) => { if (r.id === 'event.typhoon') r.trigger.guaranteed_by_turn = 1; })).toThrow(/guaranteed_by_turn/);
    expect(bad((r) => { if (r.id === 'event.cofinancing') r.on_answer[1].archetype = 'investor.hk_processing'; })).not.toThrow();
    const noTerms = validateParams({ ...params, events: { ...params.events, 'event.cofinancing': { jobs: 150 } } });
    expect(() => eventsWith(() => {}, noTerms)).toThrow(/terms/);
    expect(bad((r) => { if (r.id === 'event.fire') r.trigger.condition = 'moon'; })).toThrow(/condition/);
  });
  it('leaders and targets', () => {
    const raw = parse(readFileSync(join(ROOT, 'content/slice/leaders.yaml'), 'utf8')) as Record<string, any>[];
    expect(() => compileLeaders(raw.map((l) => (l.replacement_for ? { ...l, replacement_for: 'secretary' } : l)))).toThrow(/own role/);
    expect(() => compileLeaders(raw.map((l) => (l.replacement_for ? { ...l, replacement_for: undefined } : l)))).toThrow(/more than one mayor/);
    const t = parse(readFileSync(join(ROOT, 'content/slice/targets.yaml'), 'utf8')) as Record<string, any>[];
    expect(() => compileTargets([{ ...t[0], indicators: [{ indicator: 'exports_usd', weight: 1, floor: 0, target: Infinity }] }])).toThrow();
    expect(() => compileTargets([{ ...t[0], indicators: [{ indicator: 'exports_usd', weight: Number.NaN, floor: 0, target: 1 }] }])).toThrow();
    expect(compileTargets(t)).toEqual(targets);
  });
});
