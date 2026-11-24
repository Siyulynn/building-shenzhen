/**
 * M5b's tests (phase1-slice.md §5.8): the prologue's beats, the snapshot's bands, the annual review and its sweep,
 * the climate, the fall from grace, the budget card's warning, the briefing, the closing visit, no effect without the
 * content, and determinism through a whole run.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LOAN_CARD, REVIEW_CARD, Rng, baselineDue, createInitialState, createTickSteps, debtServiceAt, declineAll, dueNextYear,
  historicalPrologue, isFinished, isLive, loadGame, obligationDue, parseYM, readiness, realIllegalShare, regimeOf, replay,
  runMonths, runQuarter, saveFromJson, saveGame, saveToJson, step, sweepActive, validateParams, visibleIllegalShare, FAILURE_CARD,
  type CardInstance, type DecisionPolicy, type GameState, type PlayerAction, type SimEvent, type SliceParams, type TickStep,
} from '../src/index.js';
import {
  ROOT, areasJson, buildable, content, events, fiscal, investors, leaders, params, precedents, scenario, start, targets,
} from './fixtures.js';
import { checkInvariants } from './invariants.js';

const START = parseYM(scenario.start);
const monthOf = (d: string) => parseYM(d) - START;
const LAST = monthOf('1984-01');                     // the visit's month: the run's last
const stepsFor = (p: SliceParams = params, more: { events?: boolean; targets?: boolean } = {}) =>
  createTickSteps(p, { precedents, buildable, fiscal, investors, ...(more.events === false ? {} : { events }),
    ...(more.targets === false ? {} : { targets }) });
const STEPS = stepsFor();
const fresh = (p: SliceParams = params): GameState => createInitialState({ scenario, areas: areasJson, start, params: p, leaders });

interface Run { state: GameState; states: GameState[]; events: SimEvent[][] }
/** Month by month with a policy; states[m] is the state after month m. Stops when the run has ended. */
function run(policy: DecisionPolicy, months: number, opts: { s0?: GameState; steps?: readonly TickStep[]; seed?: number;
  edit?: (s: GameState, m: number) => void; invariants?: boolean } = {}): Run {
  const rng = new Rng(opts.seed ?? 1), steps = opts.steps ?? STEPS;
  let s = opts.s0 ?? fresh();
  const states: GameState[] = [], evs: SimEvent[][] = [];
  for (let m = 0; m < months && !isFinished(s); m++) {
    opts.edit?.(s, m);
    const r = step(s, policy(s, s.pendingCards), rng, steps);
    if (r.status !== 'advanced') throw new Error(`month ${m}: ${r.status}`);
    if (opts.invariants) checkInvariants(s, r.state, r.events);
    s = r.state;
    states.push(s);
    evs.push(r.events);
  }
  return { state: s, states, events: evs };
}
const answer = (c: CardInstance, option: string): PlayerAction => ({ type: 'answer_card', instance: c.id, option });
/** declineAll, but this card gets `option`. */
const overriding = (id: string, option: string): DecisionPolicy => (s, pending) =>
  declineAll(s, pending).map((a) => (a.type === 'answer_card' && a.instance === id ? { ...a, option } : a));
const comparable = (s: GameState) => JSON.stringify({ ...s, actionLog: [], answered: [] });

/** Mark a share of an area's completed village floor as unpermitted, so the illegal share is above zero. */
function makeIllegal(s: GameState, share: number): void {
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage === 'completed' && (c.archetype === 'village_house' || c.archetype === 'village_rental')) {
      const k = Math.round(c.m2 * share);
      if (k <= 0 || k >= c.m2) continue;
      b.cohorts.push({ ...c, m2: k, legality: 'unpermitted_tolerated' });
      c.m2 -= k;
    }
  }
}

const declined = run(declineAll, LAST + 1);
const historical = run(historicalPrologue, LAST + 1);

describe('M5b: no effect without the content', () => {
  it('without events the climate does not move, no review is held, and no M5b card is raised', () => {
    const r = run(declineAll, 24, { steps: stepsFor(params, { events: false }) });
    expect(r.state.climate.scrutiny).toBe(0);
    expect(r.state.reviews.held).toEqual([]);
    expect(r.states.flatMap((s) => s.pendingCards).some((c) => c.card.startsWith('event.') || c.card === REVIEW_CARD)).toBe(false);
    expect(r.state.ended).toBeUndefined();
  });
  it('without targets no review is held, and the rest of M5b still runs', () => {
    const r = run(declineAll, 24, { steps: stepsFor(params, { targets: false }) });
    expect(r.state.reviews.held).toEqual([]);
    expect(r.state.events.fired.some((f) => f.id === 'event.permit_choice')).toBe(true);
  });
});

describe('M5b: the prologue', () => {
  // the card of each prologue turn (§5.8's table) whose two options lead to different states
  const beats: [number, (c: CardInstance) => boolean, (c: CardInstance) => [string, string]][] = [
    [0, (c) => c.card === 'event.first_project', () => ['project.road_link', 'later']],
    [1, (c) => c.card === 'investor.hk_processing', (c) => [c.options[0]!, 'decline']],
    [2, (c) => c.card === 'event.permit_choice', () => ['standard', 'loose']],
    [3, (c) => c.card === 'event.corps_advance', () => ['quarters', 'tents']],
    [4, (c) => c.card === 'event.cofinancing', () => ['decline', 'accept']],
    [5, (c) => c.card === 'event.readiness_check', () => ['noted', 'rush']],
  ];
  it('every prologue quarter raises a card whose options lead to different states (no empty quarters)', () => {
    for (const [turn, is, opts] of beats) {
      const m = declined.states.findIndex((s) => s.pendingCards.some(is));
      expect(m, `turn ${turn}`).toBeGreaterThanOrEqual(0);
      const s = declined.states[m]!;
      const card = s.pendingCards.find(is)!;
      expect(Math.floor((card.raisedAt - START) / 3), `turn ${turn}`).toBe(turn);
      const [a, b] = opts(card);
      expect(card.options).toContain(a);
      expect(card.options).toContain(b);
      const next = (o: string) => step(s, overriding(card.id, o)(s, s.pendingCards), new Rng(9), STEPS).state;
      expect(comparable(next(a)), `turn ${turn}: ${a} vs ${b}`).not.toBe(comparable(next(b)));
    }
  });

  it('under declineAll the forex quota still covers one power line before the SEZ fires (no soft-lock)', () => {
    const sez = monthOf('1980-08');
    const before = declined.states[sez - 1]!;
    expect(before.events.fired.some((f) => f.id === 'event.sez_established')).toBe(false);
    expect(before.fiscal.balances.forex).toBeGreaterThanOrEqual(params.projects['project.power_line']!.forex_usd!);
  });

  it('the typhoon is a guaranteed beat of 1979-Q3 whatever the draws', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = run(declineAll, 9, { seed });
      const t = r.state.events.fired.find((f) => f.id === 'event.typhoon');
      expect(t, `seed ${seed}`).toBeDefined();
      expect(Math.floor((t!.date - START) / 3)).toBe(2);
    }
  });
});

// ---- the 1980-Q2 snapshot (§9.1) ----

type Claim = { id: string; value?: unknown };
const claims = new Map<string, Claim>();
for (const f of readdirSync(join(ROOT, 'data/evidence/claims'))) {
  if (!f.endsWith('.yaml')) continue;
  const doc = parse(readFileSync(join(ROOT, 'data/evidence/claims', f), 'utf8')) as Claim[] | { claims?: Claim[] };
  for (const c of Array.isArray(doc) ? doc : doc?.claims ?? []) if (c?.id) claims.set(c.id, c);
}
const claimValue = (id: string) => {
  const v = claims.get(id)?.value;
  if (typeof v !== 'number') throw new Error(`claim ${id} has no numeric value`);
  return v;
};
type Band = { id: string; measure?: string; applies_as?: string; bound?: string; tolerance?: [number, number];
  ratio?: { numerator: string; denominator: string }; from?: { numerator: string; denominator: string };
  to?: { numerator: string; denominator: string } };
const bands = (parse(readFileSync(join(ROOT, 'content/slice/snapshot_1980q2.yaml'), 'utf8')) as Band[])
  .filter((b) => b.id.startsWith('band.') && b.measure);

const trailing = (xs: number[]) => xs.slice(-12).reduce((a, x) => a + x, 0);
function measure(s: GameState, name: string): number {
  const h = s.history;
  switch (name) {
    case 'slice.resident_pop': return h.resident.at(-1)!;
    case 'slice.resident_pop.nonlocal': return s.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.stayedSixMonths : 0), 0);
    case 'slice.employed': return Object.values(h.employed).reduce((a, xs) => a + xs.at(-1)!, 0);
    case 'slice.gdp_nominal.year': case 'slice.gdp_nominal.trailing_4q': return trailing(h.gdp);
    case 'slice.exports_usd.year': case 'slice.exports_usd.trailing_4q': return trailing(h.exports) / params.fiscal.forex.yuan_per_usd;
    case 'city.general.spending_over_revenue.year': case 'city.general.spending_over_revenue.trailing_4q':
      return (trailing(h.obligationsPaid) + trailing(h.projectSpend)) / trailing(h.revenue);
    default: throw new Error(`no measure ${name}`);
  }
}
const ratio = (r: { numerator: string; denominator: string }) => claimValue(r.numerator) / claimValue(r.denominator);

describe('M5b: the 1980-Q2 snapshot', () => {
  const at = { '1979q4': historical.states[11]!, '1980q2': historical.states[17]! };

  it('the historical prologue passes the end-1979 checkpoint and the 1980-Q2 bands, read from the claims', () => {
    expect(bands.length).toBeGreaterThanOrEqual(10);
    for (const b of bands) {
      const s = b.id.startsWith('band.1979q4.') ? at['1979q4'] : at['1980q2'];
      const v = measure(s, b.measure!);
      if (b.applies_as === 'upper_bound') expect(v, b.id).toBeLessThanOrEqual(claimValue(b.bound!));
      else if (b.applies_as === 'ratio_band') {
        const r = ratio(b.ratio!);
        expect(v, b.id).toBeGreaterThanOrEqual(r * b.tolerance![0]);
        expect(v, b.id).toBeLessThanOrEqual(r * b.tolerance![1]);
      } else if (b.applies_as === 'between_ratios') {
        const r1 = ratio(b.from!), r2 = ratio(b.to!);
        expect(v, b.id).toBeGreaterThanOrEqual(Math.min(r1, r2) * b.tolerance![0]);
        expect(v, b.id).toBeLessThanOrEqual(Math.max(r1, r2) * b.tolerance![1]);
      } else throw new Error(`${b.id}: unknown band kind ${b.applies_as}`);
    }
  });

  it('meets the design bands: a processing contract runs, readiness is above zero in each part, the loan was offered', () => {
    const s = at['1980q2'];
    expect(s.firms.some((f) => f.ownership === 'hk_processing' && f.opens !== undefined && f.opens <= s.date)).toBe(true);
    const r = readiness(s, params, buildable);
    expect(r.roads).toBeGreaterThan(0);
    expect(r.servicedLand).toBeGreaterThan(0);
    expect(r.waterPower).toBeGreaterThan(0);
    expect(s.fiscal.projectLoan).not.toBe('not_offered');
    expect(s.events.fired.some((f) => f.id === 'event.sez_established')).toBe(false);
    expect(s.fiscal.obligations.some((o) => o.createdBy.startsWith('project.'))).toBe(true);
  });

  it('is generated with seed 1 over six quarters and round-trips through the save format', () => {
    const rng = new Rng(1);
    const s = runMonths(fresh(), 18, rng, historicalPrologue, STEPS);
    expect(comparable(s)).toBe(comparable(at['1980q2']));
    const text = saveToJson(saveGame(s, rng, content));
    const loaded = loadGame(saveFromJson(text));
    expect(saveToJson(saveGame(loaded.state, loaded.rng, content))).toBe(text);
  });
});

describe('M5b: each year\'s review forces a trade-off', () => {
  it('declineAll fails every review after the lightweight one, and the lightweight one passes anyway', () => {
    const held = declined.state.reviews.held;
    expect(held.length).toBe(targets.length);
    expect(held[0]!.lightweight).toBe(true);
    expect(held[0]!.pass).toBe(true);
    for (const r of held.slice(1)) expect(r.pass, `review ${r.index}`).toBe(false);
  });

  it('a run that passes a review carries more obligations due than declineAll at that review', () => {
    const passed = historical.state.reviews.held.filter((r) => r.pass && !r.lightweight);
    expect(passed.length).toBeGreaterThan(0);
    for (const r of passed) {
      const m = r.date - START;
      expect(historical.states[m]!.history.obligationsDue[m]!).toBeGreaterThan(declined.states[m]!.history.obligationsDue[m]!);
      expect(dueNextYear(historical.states[m]!, params)).toBeGreaterThan(dueNextYear(declined.states[m]!, params));
    }
  });

  it('the score is the weighted, clamped formula over the review\'s indicators', () => {
    for (const r of historical.state.reviews.held) {
      const t = targets[r.index]!;
      let num = 0, den = 0;
      for (const [i, x] of t.indicators.entries()) {
        const sc = Math.min(1, Math.max(0, (r.items[i]!.value - x.floor) / (x.target - x.floor)));
        expect(r.items[i]!.score).toBeCloseTo(sc, 12);
        num += x.weight * sc; den += x.weight;
      }
      expect(r.score).toBeCloseTo(num / den, 12);
    }
  });

  const october = monthOf('1980-10');            // the second sweep card: before a review that is not lightweight
  const sweepPolicy: DecisionPolicy = (s, pending) => declineAll(s, pending).map((a) => {
    const c = pending.find((x) => a.type === 'answer_card' && x.id === a.instance);
    return c?.card === 'event.sweep' && c.raisedAt === START + october ? { ...a, option: 'sweep' } as PlayerAction : a;
  });
  const sweepRun = (p: SliceParams) => run(sweepPolicy, october + 3, { s0: fresh(p), steps: stepsFor(p),
    edit: (s, m) => { if (m === october - 1) makeIllegal(s, 0.3); } });

  it('the sweep lowers the visible share and migrant mood, at a cost', () => {
    const r = sweepRun(params);
    const before = r.states[october]!, after = r.states[october + 1]!;
    expect(sweepActive(before)).toBe(false);
    expect(sweepActive(after)).toBe(true);
    expect(after.sweep.until).toBe(START + october + params.sweep.campaign_months);
    expect(realIllegalShare(after)).toBeGreaterThan(0);
    expect(visibleIllegalShare(after, params)).toBeCloseTo(realIllegalShare(after) * (1 - params.sweep.visible_cut), 12);
    for (const g of after.pops.filter((x) => x.registration === 'nonlocal')) {
      const was = before.pops.find((x) => x.area === g.area && x.kind === g.kind)!;
      expect(g.mood).toBeCloseTo(Math.max(0, was.mood - params.sweep.mood_penalty), 12);
    }
    expect(after.fiscal.obligations.some((o) => o.createdBy === 'event.sweep' && o.perMonth === params.sweep.cash_cost)).toBe(true);
  });

  it('a sweep can be caught by the unannounced team, failing the review', () => {
    const sure = validateParams({ ...params, sweep: { ...params.sweep, base_p: 1000 } });
    const caught = sweepRun(sure).state.reviews.held.at(-1)!;
    expect(caught.index).toBe(1);
    expect(caught.caught).toBe(true);
    expect(caught.vetoed).toBe('sweep_caught');
    expect(caught.pass).toBe(false);
    const never = validateParams({ ...params, sweep: { ...params.sweep, base_p: 0 } });
    expect(sweepRun(never).state.reviews.held.at(-1)!.caught).toBe(false);
  });
});

describe('M5b: the climate', () => {
  const one = (s0: GameState, p: SliceParams = params, policy: DecisionPolicy = declineAll) =>
    step(s0, policy(s0, s0.pendingCards), new Rng(3), stepsFor(p)).state;
  const quiet = () => declined.states[0]!;           // month 1: no review, no scrutiny event

  it('decays each month and rises with the loose permit, the illegal share and events', () => {
    const s = structuredClone(quiet());
    s.climate.scrutiny = 50;
    expect(one(s).climate.scrutiny).toBeCloseTo(50 * (1 - params.climate.scrutiny_decay), 9);
    const loose = structuredClone(quiet());
    loose.policy.permitRegime = 'loose';
    expect(one(loose).climate.scrutiny).toBeCloseTo(params.climate.permit_factor.loose * params.climate.gain.loose_permit, 9);
    const ill = structuredClone(quiet());
    makeIllegal(ill, 0.3);
    const share = realIllegalShare(ill);
    expect(share).toBeGreaterThan(0);
    expect(one(ill).climate.scrutiny).toBeCloseTo(params.climate.gain.illegal_share * share, 6);
    // the typhoon left unrepaired: the event's scrutiny
    const m = declined.states.findIndex((x) => x.pendingCards.some((c) => c.card === 'event.typhoon'));
    const t = declined.states[m]!;
    const card = t.pendingCards.find((c) => c.card === 'event.typhoon')!;
    const defer = one(t, params, overriding(card.id, 'defer'));
    const repair = one(t, params, overriding(card.id, 'repair'));
    // the event adds in step 2, and the month's decay follows in step 12
    expect(defer.climate.scrutiny - repair.climate.scrutiny)
      .toBeCloseTo(params.events['event.typhoon']!.scrutiny! * (1 - params.climate.scrutiny_decay), 6);
  });

  it('four quarters ending above the threshold end the run as a failure', () => {
    const p = validateParams({ ...params, climate: { ...params.climate, scrutiny_decay: 0 } });
    const s0 = fresh(p);
    s0.climate.scrutiny = 100;
    const r = run(declineAll, 30, { s0, steps: stepsFor(p) });
    expect(r.state.ended).toEqual({ date: START + 4 * 3 - 1, reason: 'failure' });
    expect(r.states.length).toBe(12);
    expect(r.state.pendingCards.some((c) => c.card === FAILURE_CARD)).toBe(true);
    expect(isFinished(r.state)).toBe(true);
  });
});

describe('M5b: the fall from grace', () => {
  it('no shortcuts, no fall', () => {
    for (const r of [declined, historical]) {
      expect(r.state.falls).toEqual([]);
      expect(r.state.leadership.leaders.every((l) => l.disciplineRisk === 0)).toBe(true);
    }
  });

  it('a forced trip replaces the Mayor, freezes projects and vetoes the review when entangled', () => {
    const p = validateParams({ ...params, fall: { ...params.fall, base: 1, k: 100, threshold: 0 } });
    const m0 = monthOf('1980-09');
    const r = run(declineAll, monthOf('1980-12') + 1, { s0: fresh(p), steps: stepsFor(p), edit: (s, m) => {
      if (m !== m0) return;
      s.leadership.leaders.find((l) => l.role === 'mayor')!.disciplineRisk = 10;
      s.leadership.entangled.push({ leader: 'leader.mayor', ref: 'firm.0', date: s.date });
      s.fiscal.projects.push({ id: s.fiscal.nextId.project++, template: 'project.road_link', kind: 'road', area: 1,
        budget: 100000, spent: 0, crew: 10, workTotal: 4, workDone: 0, crewBank: 0, priority: 'normal', committed: s.date,
        stage: 'committed' });
    } });
    const s = r.states[m0]!;
    expect(s.falls).toEqual([{ date: START + m0, leader: 'leader.mayor', replacedBy: 'leader.mayor_replacement', entangled: true }]);
    const mayor = s.leadership.leaders.find((l) => l.role === 'mayor')!;
    expect(mayor.id).toBe('leader.mayor_replacement');
    expect(mayor.disciplineRisk).toBe(0);
    expect(s.leadership.bench).toEqual([]);
    expect(s.fiscal.frozenUntil).toBe(START + m0 + p.fall.freeze_months);
    const next = r.states[m0 + 1]!;
    const x = next.fiscal.projects.at(-1)!;
    expect(x.waiting).toBe('frozen');
    expect(x.spent).toBe(0);
    expect(next.climate.scrutiny).toBeGreaterThanOrEqual(p.fall.scrutiny * (1 - p.climate.scrutiny_decay) - 1e-9);
    const review = r.state.reviews.held.at(-1)!;
    expect(review.index).toBe(1);
    expect(review.vetoed).toBe('leader_corruption');
    expect(review.pass).toBe(false);
  });
});

describe('M5b: the budget card and the warning', () => {
  it('the warning appears exactly on the cards whose next 12 months hold a grant cut, read from content', () => {
    const cards = declined.states.flatMap((s) => s.pendingCards).filter((c) => c.card === 'event.budget')
      .filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
    expect(cards.length).toBe(6);                    // every January, 1979 to 1984
    let warned = 0;
    for (const c of cards) {
      const s = declined.states[c.raisedAt - START]!;
      const r = regimeOf(s, fiscal);
      const now = r.grantSchedule.filter((e) => e.from <= c.raisedAt).at(-1)!.factor;
      const cut = r.grantSchedule.some((e) => e.from > c.raisedAt && e.from <= c.raisedAt + 12 && e.factor < now);
      const budget = c.payload!.budget as { grantFactor: number; recurring: number; warning?: { factor: number } };
      expect(budget.grantFactor).toBe(now);
      expect(Number.isFinite(budget.recurring), `card ${c.id}`).toBe(true);
      expect(budget.warning !== undefined, `card ${c.id}`).toBe(cut);
      if (cut) warned++;
    }
    expect(warned).toBe(2);
    // the first card comes before any history: it saves, with every number finite
    const first = declined.states[0]!;
    expect(first.pendingCards.some((c) => c.card === 'event.budget')).toBe(true);
    expect(() => saveToJson(saveGame(first, new Rng(0), content))).not.toThrow();
  });
});

describe('M5b: the briefing', () => {
  it('the loan card and the co-financing card arrive in turn 4', () => {
    for (const card of [LOAN_CARD, 'event.cofinancing']) {
      const c = declined.states.flatMap((s) => s.pendingCards).find((x) => x.card === card
        && (card !== LOAN_CARD || x.raisedAt >= START + 12))!;
      expect(Math.floor((c.raisedAt - START) / 3), card).toBe(4);
    }
  });

  it('accepting the co-financing builds a power line that costs the city nothing, and its firm gets the concession', () => {
    const accept: DecisionPolicy = (s, pending) => declineAll(s, pending).map((a) => {
      const c = pending.find((x) => a.type === 'answer_card' && x.id === a.instance)!;
      if (c.card === 'event.cofinancing') return answer(c, 'accept');
      if (c.payload?.terms) return answer(c, c.options[0]!);          // the co-financing investor's own offer
      return a;
    });
    const r = run(accept, monthOf('1980-12') + 1);
    const x = r.state.fiscal.projects.find((q) => q.cofinanced)!;
    expect(x.template).toBe('project.power_line');
    expect(x.budget).toBe(0);
    expect(x.spent).toBe(0);
    expect(x.stage).toBe('done');
    expect(r.state.areas.find((a) => a.id === 1)!.utilities.powerCap)
      .toBe(declined.states[r.states.length - 1]!.areas.find((a) => a.id === 1)!.utilities.powerCap + params.projects['project.power_line']!.power_kw!);
    expect(r.state.fiscal.obligations.some((o) => o.createdBy === `project.${x.id}`)).toBe(false);
    expect(r.state.fiscal.ledger.some((e) => e.ref === `project.${x.id}`)).toBe(false);
    const firm = r.state.firms.find((f) => f.terms?.taxHolidayMonths === params.events['event.cofinancing']!.tax_holiday_months)!;
    expect(firm).toBeDefined();
    expect(firm.terms!.landFeeFactor).toBe(params.events['event.cofinancing']!.land_fee_factor);
  });
});

describe('M5b: the closing visit', () => {
  it('fires in 1984-01 and ends the run; the verdict\'s fiscal test equals its formula on the end-1983 state', () => {
    for (const r of [declined, historical]) {
      expect(r.states.length).toBe(LAST + 1);
      expect(r.state.ended).toEqual({ date: START + LAST, reason: 'visit' });
      expect(isFinished(r.state)).toBe(true);
      // the visit's month stops at the events step: the final state is end-1983, with no card from later steps
      expect(r.state.date).toBe(START + LAST);
      expect(r.state.history.months.at(-1)).toBe(START + LAST - 1);
      expect(r.state.pendingCards.filter((c) => c.interrupting).map((c) => c.card)).toEqual(['event.deng_visit']);
      const card = r.state.pendingCards.find((c) => c.card === 'event.deng_visit')!;
      expect(card.interrupting).toBe(true);
      const v = card.payload!.verdict as { fiscalTest: { revenuePerYear: number; dueNext12: number; balance: number; grantFactor: number } };
      const s = r.states[LAST - 1]!;                      // end-1983: the state the visit's month starts from
      const tax = (t: number) => s.fiscal.ledger.reduce((a, e) => a + (e.date === t && e.type === 'tax' ? e.amount : 0), 0);
      const revenue = 12 * (tax(s.date - 3) + tax(s.date - 2) + tax(s.date - 1)) / 3;
      let due = 0;
      for (let t = s.date; t < s.date + 12; t++) {
        due += baselineDue(s, params);
        for (const o of s.fiscal.obligations) if (isLive(o, t)) due += obligationDue(o, s);
        for (const l of s.fiscal.loans) due += debtServiceAt(l, t);
      }
      expect(v.fiscalTest.grantFactor).toBe(0);
      expect(v.fiscalTest.revenuePerYear).toBeCloseTo(revenue, 6);
      expect(v.fiscalTest.dueNext12).toBeCloseTo(due, 6);
      expect(v.fiscalTest.balance).toBeCloseTo(revenue - due, 6);
      // no month is left: unanswered, the visit's card holds the run; answered, it is finished
      expect(step(r.state, [], new Rng(0), STEPS).status).toBe('paused');
      expect(() => step(r.state, [{ type: 'set_permit_regime', regime: 'strict' }], new Rng(0), STEPS)).toThrow(/ended/);
      expect(step(r.state, declineAll(r.state, r.state.pendingCards), new Rng(0), STEPS).status).toBe('finished');
    }
  });
});

describe('M5b: determinism', () => {
  it('saves, loads and continues, and replays, through a whole 21-quarter run', () => {
    const months = LAST + 1;
    const rng = new Rng(21);
    const full = runMonths(fresh(), months, rng, historicalPrologue, STEPS);
    expect(full.ended?.reason).toBe('visit');
    const text = saveToJson(saveGame(full, rng, content));
    for (const k of [7, 30, LAST]) {
      const r1 = new Rng(21);
      const mid = runMonths(fresh(), k, r1, historicalPrologue, STEPS);
      const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, r1, content))));
      const end = runMonths(loaded.state, months - k, loaded.rng, historicalPrologue, STEPS);
      expect(saveToJson(saveGame(end, loaded.rng, content))).toBe(text);
    }
    const again = replay(fresh(), full.actionLog, months, new Rng(21), STEPS);
    expect(saveToJson(saveGame(again, new Rng(0), content))).toBe(saveToJson(saveGame(full, new Rng(0), content)));
  });

  it('keeps the invariants through a whole run with every M5b card', () => {
    const r = run(historicalPrologue, LAST + 1, { invariants: true, seed: 4 });
    expect(r.state.ended?.reason).toBe('visit');
  });
});
