/**
 * M4's tests (phase1-slice.md §5.6): the ledger and the deficit rule, the project loan and the grant schedule,
 * projects and serviced land, the construction-capacity pool, nominal GDP, the preview and determinism.
 */
import { describe, expect, it } from 'vitest';
import {
  ACCOUNTS, DEFICIT_CARD, LOAN_CARD, Rng, createFirm, createTickSteps, debtServiceAt, fiscalViews, firstOption,
  loadGame, parseYM, previewOffer, principalOutstanding, replay, runMonths, saveFromJson, saveGame, saveToJson,
  sizeOffer, step, validateParams, type DecisionPolicy, type GameState, type PlayerAction, type SimEvent, type SliceParams,
  type TickStep,
} from '../src/index.js';
import { buildable, content, fiscal, initial, investors, params, precedents } from './fixtures.js';

const HK = 'investor.hk_processing', SOE = 'investor.inland_state_unit';
const BUILD = params.investors.archetypes[HK]!.build_months;
/** Params with some fiscal fields replaced. */
const withFiscal = (f: Partial<SliceParams['fiscal']>, extra: Partial<SliceParams> = {}) =>
  validateParams({ ...params, ...extra, fiscal: { ...params.fiscal, ...f } });
const stepsFor = (p: SliceParams = params, more: { investors?: boolean } = {}) =>
  createTickSteps(p, { precedents, buildable, fiscal, ...(more.investors ? { investors } : {}) });
const STEPS = stepsFor();
const start = (p: SliceParams = params): GameState => {
  const s = initial();
  const b = p.fiscal.start_balances;
  s.fiscal.balances = { general: b.general, land: b.land, debt: b.debt, forex: b.forex_usd };
  return s;
};

/** No stock negative, and per account Σ new entries = Δ balance (§5.6). */
function checkLedger(before: GameState, after: GameState): void {
  const added = after.fiscal.ledger.slice(before.fiscal.ledger.length);
  for (const acc of ACCOUNTS) {
    const sum = added.reduce((a, e) => a + (e.account === acc ? e.amount : 0), 0);
    expect(after.fiscal.balances[acc] - before.fiscal.balances[acc]).toBe(sum);
    expect(after.fiscal.balances[acc]).toBeGreaterThanOrEqual(0);
  }
  for (const e of added) expect(Number.isInteger(e.amount) && e.amount !== 0).toBe(true);
  for (const l of after.fiscal.loans) expect(principalOutstanding(l, after.date)).toBeGreaterThanOrEqual(0);
}

interface Run { state: GameState; events: SimEvent[][] }
/** Run month by month: scripted actions by month index, cards answered by `answers` (else the first option). */
function go(s0: GameState, months: number, opts: { steps?: readonly TickStep[]; script?: Record<number, PlayerAction[]>;
  answers?: Record<string, string>; seed?: number; check?: boolean } = {}): Run {
  const steps = opts.steps ?? STEPS, rng = new Rng(opts.seed ?? 1);
  let s = s0;
  const events: SimEvent[][] = [];
  for (let m = 0; m < months; m++) {
    const cards = s.pendingCards.map((c): PlayerAction => ({ type: 'answer_card', instance: c.id,
      option: opts.answers?.[c.card] ?? c.options[0]! }));
    const r = step(s, [...cards, ...(opts.script?.[m] ?? [])], rng, steps);
    if (r.status !== 'advanced') throw new Error(`month ${m}: ${r.status}`);
    if (opts.check !== false) checkLedger(s, r.state);
    s = r.state;
    events.push(r.events);
  }
  return { state: s, events };
}
const commit = (template: string, target: { area?: number; zone?: number }, priority?: 'high' | 'normal' | 'low'): PlayerAction =>
  ({ type: 'commit_project', template, ...target, ...(priority ? { priority } : {}) });
const raised = (r: Run, card: string) => r.events.map((ev, m) => ev.some((e) => e.kind === 'card_raised'
  && String(e.detail!.instance).startsWith(`${card}@`)) ? m : -1).filter((m) => m >= 0);
const ONE_CELL: PlayerAction = { type: 'create_zone', use: 'industrial', runs: [[360, 372, 372]] };   // area 7, buildable

describe('M4: no effect without the fiscal content', () => {
  const withFirm = () => {
    const s = initial();
    createFirm(s, params, sizeOffer(params, HK, 'hk_processing', 200), { premises: 'new_factory', area: 7, zone: 1 });
    return s;
  };

  it('leaves the physical economy as in M3b when the pool has room', () => {
    const bare = runMonths(withFirm(), 24, new Rng(2), () => [], createTickSteps(params, { precedents }));
    const fisc = runMonths(withFirm(), 24, new Rng(2), firstOption, STEPS);
    for (const k of ['pops', 'blocks', 'firms', 'labour', 'housing'] as const) expect(fisc[k]).toEqual(bare[k]);
    for (const k of ['registered', 'resident', 'present', 'migrants', 'rentalBeds', 'crowding', 'rent', 'underConstructionM2',
      'firmJobs', 'output', 'valueAdded', 'gdp'] as const) expect(fisc.history[k]).toEqual(bare.history[k]);
    expect(fisc.firms[0]!.opens).toBe(withFirm().date + BUILD - 1);
  });

  it('refuses project and team actions, and keeps zones serviced', () => {
    const plain = createTickSteps(params, { precedents });
    expect(() => step(initial(), [commit('project.road_link', { area: 7 })], new Rng(1), plain)).toThrow(/unknown action/);
    const z = step(initial(), [ONE_CELL], new Rng(1), plain).state.zones[0]!;
    expect(z.servicedShare).toBeUndefined();
    const f = step(initial(), [ONE_CELL], new Rng(1), STEPS).state.zones[0]!;
    expect(f.servicedShare).toBe(0);                        // with the fiscal content, new land starts unserviced
  });
});

describe('M4: the ledger', () => {
  it('balances every month and keeps every stock non-negative, under random commits (property)', () => {
    const templates = ['project.road_link', 'project.water_main', 'project.school', 'project.site_preparation', 'project.power_line'];
    for (const seed of [1, 2, 3]) {
      const pick = new Rng(seed * 101).stream('script');
      const script: Record<number, PlayerAction[]> = { 0: [ONE_CELL, { type: 'create_zone', use: 'industrial', runs: [[351, 372, 375]] }] };
      let zone = 0;
      for (let m = 1; m < 63; m++) {
        if (pick.float() >= 0.2) continue;
        const t = templates[pick.int(templates.length)]!;
        if (t === 'project.site_preparation') { if (zone < 2) script[m] = [commit(t, { zone: ++zone })]; }
        else if (t !== 'project.power_line' || m < 20) script[m] = [commit(t, { area: 1 + pick.int(7) })];
      }
      const r = go(start(), 63, { steps: stepsFor(params, { investors: true }), script, seed });
      const F = r.state.fiscal;
      // obligations due = baselines + live obligations + debt service (+ arrears, which are obligations)
      expect(r.state.history.obligationsDue.every((d) => Number.isInteger(d) && d >= 0)).toBe(true);
      expect(F.ledger.filter((e) => e.account === 'general').reduce((a, e) => a + e.amount, params.fiscal.start_balances.general))
        .toBe(F.balances.general);
    }
  });

  it('never deadlocks: with no revenue, no reserve and no capacity, the month closes in arrears', () => {
    const p = withFiscal({ county_base_revenue_per_month: 0, provincial_base_grant_per_year: 0,
      start_balances: { general: 0, land: 0, debt: 0, forex_usd: 0 }, short_loan: { ...params.fiscal.short_loan, revenue_multiple: 0 },
      austerity_max_cut: 0 });
    const r = go(start(p), 6, { steps: stepsFor(p) });
    const h = r.state.history;
    expect(h.obligationsPaid.every((x) => x === 0)).toBe(true);
    for (let m = 0; m < 6; m++) {
      const arrears = r.events[m]!.find((e) => e.kind === 'arrears')!;
      expect(arrears.detail!.amount).toBe(h.obligationsDue[m]);     // unpaid in full, and owed next month
    }
    expect(h.obligationsDue[1]).toBe(h.obligationsDue[0]! + h.baselineDue[1]!);
    expect(raised(r, DEFICIT_CARD)).toEqual([0, 3]);               // once a quarter
  });
});

describe('M4: the deficit rule', () => {
  // no grant and an empty reserve: a shortfall from the first month
  const P = withFiscal({ provincial_base_grant_per_year: 0, start_balances: { general: 0, land: 1_000_000, debt: 0, forex_usd: 0 } });
  const S = stepsFor(P);
  const run = (option: string, months = 3) => go(start(P), months, { steps: S, answers: { [DEFICIT_CARD]: option } });

  it('raises the card once a quarter, sends the month of the card to arrears, and defaults to borrowing', () => {
    expect(fiscalViews(start(P), P).borrowingCapacity).toBe(0);
    const r = run('borrow_short', 6);
    expect(raised(r, DEFICIT_CARD)).toEqual([0, 3]);
    expect(r.events[0]!.some((e) => e.kind === 'arrears')).toBe(true);
    const card = r.events[0]!.find((e) => e.kind === 'card_raised')!;
    expect(String(card.detail!.instance)).toMatch(/^fiscal\.deficit@/);
    // the answer applies next month: borrowing up to capacity, a quarter of the last year's recurring revenue
    const short = r.state.fiscal.loans.filter((l) => l.kind === 'short');
    expect(short[0]!.principal).toBe(Math.floor(0.25 * P.fiscal.county_base_revenue_per_month));
    expect(short[0]!.taken).toBe(start(P).date + 1);
    // firstOption gives fiscal §7.1's default
    const d = go(start(P), 2, { steps: S });
    expect(d.state.fiscal.deficit?.option).toBe('borrow_short');
  });

  it('pays from land money when told to, and flags it as grey under the county regime', () => {
    const r = run('use_land_money');
    const m1 = r.events[1]!;
    expect(m1.some((e) => e.kind === 'arrears')).toBe(false);
    expect(m1.find((e) => e.kind === 'land_for_recurring')!.detail).toMatchObject({ status: 'grey' });
    expect(r.state.fiscal.ledger.some((e) => e.account === 'land' && e.type === 'obligation')).toBe(true);
    expect(r.state.fiscal.loans).toHaveLength(0);
  });

  it('cuts the cuttable obligations under austerity, forgiven rather than owed', () => {
    const r = run('austerity');
    const h = r.state.history;
    expect(h.austerity[1]).toBeCloseTo(P.fiscal.austerity_max_cut, 4);
    expect(r.state.fiscal.loans.length).toBeGreaterThan(0);      // then the default chain borrows
    const paid = h.obligationsPaid[1]!, due = h.obligationsDue[1]!;
    const arrears = (r.events[1]!.find((e) => e.kind === 'arrears')?.detail?.amount as number) ?? 0;
    expect(paid + arrears).toBeLessThan(due);                    // the cut is neither paid nor owed
  });

  it('comes from overbuilding: schools and roads bring the first card years earlier than building nothing', () => {
    const steps = stepsFor(params);
    const nothing = go(start(), 63, { steps });
    const built = go(start(), 63, { steps, script: { 0: [commit('project.school', { area: 1 }), commit('project.school', { area: 2 }),
      commit('project.school', { area: 3 }), commit('project.road_link', { area: 7 }), commit('project.road_link', { area: 5 })] } });
    const first = (r: Run) => raised(r, DEFICIT_CARD)[0] ?? 99;
    expect(first(built)).toBeLessThan(first(nothing));
    expect(first(nothing)).toBeGreaterThanOrEqual(parseYM('1983-01') - start().date);   // the grant cliff, not before
  });
});

describe('M4: the project loan', () => {
  // five roads in one month: more than money for projects, and what the reserve and the loan can pay for
  const FIVE = [1, 2, 3, 4, 5].map((a) => commit('project.road_link', { area: a }));

  it('is offered by an unfunded commit, funds the projects, and squeezes the years after its grace period', () => {
    const took = go(start(), 40, { script: { 0: FIVE }, answers: { [LOAN_CARD]: 'take' } });
    expect(raised(took, LOAN_CARD)).toEqual([0]);
    const F = took.state.fiscal;
    expect(F.projectLoan).toBe('taken');
    const loan = F.loans.find((l) => l.kind === 'project')!;
    expect(loan.principal).toBe(params.fiscal.loan.principal);
    expect(F.projects.every((x) => x.stage === 'done' && x.spent === x.budget)).toBe(true);
    // interest only in the grace period, then the instalments: the due line jumps by one instalment
    const g = loan.taken + 1 + params.fiscal.loan.grace_months - start().date;
    const L = params.fiscal.loan, at = (m: number) => debtServiceAt(loan, start().date + m);
    expect(at(g) - at(g - 1)).toBe(Math.floor(L.principal / L.term_months));
    const month = (m: number) => took.events[m]!.find((e) => e.kind === 'month')!.detail as { due: number; baseline: number };
    expect(month(g).due - month(g).baseline).toBeGreaterThanOrEqual(at(g));        // the instalment is on the month's bill
    expect(debtServiceAt(loan, start().date + 5)).toBe(Math.round(params.fiscal.loan.principal * params.fiscal.loan.rate_month));

    // declined: the projects wait for money; another unfunded commit offers it again
    const dec = go(start(), 12, { script: { 0: FIVE, 6: [commit('project.water_main', { area: 1 })] }, answers: { [LOAN_CARD]: 'decline' } });
    expect(raised(dec, LOAN_CARD)).toEqual([0, 6]);
    expect(dec.state.fiscal.projects.some((x) => x.waiting === 'finance' && x.stage === 'stalled')).toBe(true);
    expect(dec.state.fiscal.loans).toHaveLength(0);
  });

  it('lets a stalled project resume when the money comes', () => {
    const P = withFiscal({ start_balances: { general: 0, land: 0, debt: 0, forex_usd: 0 } });
    const r = go(start(P), 3, { steps: stepsFor(P), script: { 0: [commit('project.road_link', { area: 7 })] },
      answers: { [LOAN_CARD]: 'decline' } });
    expect(r.state.fiscal.projects[0]).toMatchObject({ stage: 'stalled', waiting: 'finance', workDone: 0, spent: 0 });
    // the loan arrives with the next unfunded commit
    const r2 = go(r.state, 10, { steps: stepsFor(P), script: { 0: [commit('project.water_main', { area: 7 })] },
      answers: { [LOAN_CARD]: 'take' } });
    expect(r2.state.fiscal.projects.map((x) => x.stage)).toEqual(['done', 'done']);
  });
});

describe('M4: the grant schedule', () => {
  it('halves and ends on the content dates', () => {
    const r = go(start(), 63);
    const grant = (ym: string) => r.state.fiscal.ledger.filter((e) => e.ref === 'grant.provincial_base' && e.date === parseYM(ym))
      .reduce((a, e) => a + e.amount, 0);
    const full = params.fiscal.provincial_base_grant_per_year / 12;
    expect(grant('1979-01')).toBe(full);
    expect(grant('1982-12')).toBe(full);
    expect(grant('1983-01')).toBe(full / 2);
    expect(grant('1984-01')).toBe(0);
  });
});

describe('M4: projects', () => {
  const RICH = withFiscal({ start_balances: { general: 300_000, land: 5_000_000, debt: 0, forex_usd: 50_000 } });
  const S = stepsFor(RICH);

  it('spends its budget as the work is done and applies its asset and obligations on completion', () => {
    const pp = params.projects['project.power_line']!;
    const r = go(start(RICH), pp.work_months + 1, { steps: S, script: { 0: [commit('project.power_line', { area: 7 })] } });
    const x = r.state.fiscal.projects[0]!;
    expect(x).toMatchObject({ stage: 'done', spent: pp.budget, workDone: pp.work_months, completed: start().date + pp.work_months - 1 });
    expect(r.state.history.projectSpend.slice(0, pp.work_months).every((v) => v > 0)).toBe(true);
    expect(r.state.areas.find((a) => a.id === 7)!.utilities.powerCap).toBe(120 + pp.power_kw!);
    expect(r.state.fiscal.balances.forex).toBeLessThan(RICH.fiscal.start_balances.forex_usd);
    expect(r.state.fiscal.obligations).toEqual([expect.objectContaining({ kind: 'maintenance',
      perMonth: Math.round((pp.budget! * pp.maint_rate_year) / 12), from: x.completed! + 1 })]);
    // construction value added counts as the work is done
    const g = go(start(RICH), 1, { steps: S, script: { 0: [commit('project.power_line', { area: 7 })] } }).state.history.gdp[0]!;
    expect(g - go(start(RICH), 1, { steps: S }).state.history.gdp[0]!).toBeCloseTo(Math.round(pp.budget! / pp.work_months) * params.gdp.construction_va_ratio, 6);
  });

  it('opens a school with its payroll, indexed to the state wage, and its running costs', () => {
    const pp = params.projects['project.school']!;
    const r = go(start(RICH), pp.work_months + 1, { steps: S, script: { 0: [commit('project.school', { area: 3 })] } });
    expect(r.state.areas.find((a) => a.id === 3)!.facilities.schoolPlaces).toBe(pp.school_places);
    const kinds = r.state.fiscal.obligations.map((o) => o.kind).sort();
    expect(kinds).toEqual(['maintenance', 'payroll', 'service']);
    const pay = r.state.fiscal.obligations.find((o) => o.kind === 'payroll')!;
    expect(pay).toMatchObject({ index: 'wages', perMonth: pp.staff! * params.labour.wage_start.state });
  });

  it('services a zone: its share rises, and an investor can then site in it', () => {
    const P = validateParams({ ...RICH, investors: { ...RICH.investors, archetypes: {
      [HK]: { ...RICH.investors.archetypes[HK]!, rate_per_quarter: 3, jobs: [100, 100] },
      [SOE]: { ...RICH.investors.archetypes[SOE]!, rate_per_quarter: 0 } } } });
    const steps = stepsFor(P, { investors: true });
    const pp = params.projects['project.site_preparation']!;
    const r = go(start(P), pp.work_months + 1, { steps, script: { 0: [ONE_CELL], 1: [commit('project.site_preparation', { zone: 1 })] },
      answers: { [HK]: 'decline' } });
    expect(r.state.fiscal.projects[0]).toMatchObject({ stage: 'done', budget: pp.budget_per_cell, cells: [[360, 372, 372]] });
    expect(r.state.servicedLand).toEqual([[360, 372, 372]]);
    const offers = (s: GameState) => s.pendingCards.filter((c) => c.card === HK).map((c) => c.options);
    expect(offers(go(start(P), 2, { steps, script: { 0: [ONE_CELL] }, answers: { [HK]: 'decline' } }).state)
      .every((o) => !o.includes('accept:zone:1'))).toBe(true);
    const next = go(r.state, 1, { steps, answers: { [HK]: 'decline' } }).state;
    expect(next.zones[0]!.servicedShare).toBe(1);
    expect(offers(next).some((o) => o.includes('accept:zone:1'))).toBe(true);
    // serviced land belongs to the land: adding a cell halves the share; there is nothing left to service twice
    const grown = go(next, 1, { steps, script: { 0: [{ type: 'edit_zone', zone: 1, add: [[360, 373, 373]] }] }, answers: { [HK]: 'decline' } }).state;
    expect(grown.zones[0]!.servicedShare).toBe(0.5);
    expect(() => step(go(start(P), 1, { steps, script: { 0: [ONE_CELL] } }).state, [commit('project.site_preparation', { zone: 1 }),
      commit('project.site_preparation', { zone: 1 })], new Rng(1), steps)).not.toThrow();
    expect(() => step(next, [commit('project.site_preparation', { zone: 1 })], new Rng(1), steps)).toThrow(/nothing|no buildable/);
  });

  it('refuses invalid commits and contracts, and cancels with a penalty', () => {
    const s = start(RICH);
    expect(() => step(s, [commit('project.nope', { area: 1 })], new Rng(1), S)).toThrow(/template/);
    expect(() => step(s, [commit('project.road_link', { area: 8 })], new Rng(1), S)).toThrow(/playable/);
    expect(() => step(s, [commit('project.site_preparation', { zone: 9 })], new Rng(1), S)).toThrow(/zone/);
    const poor = start(withFiscal({ start_balances: { ...RICH.fiscal.start_balances, forex_usd: 0 } }));
    expect(() => step(poor, [commit('project.power_line', { area: 7 })], new Rng(1), S)).toThrow(/forex/);
    expect(() => step(s, [{ type: 'contract_team', team: 'team.county_crew', mode: 'pool' }], new Rng(1), S)).toThrow(/mode/);
    expect(() => step(s, [{ type: 'contract_team', team: 'team.county_crew', mode: 'dedicated' }], new Rng(1), S)).toThrow(/project/);
    const r = go(s, 2, { steps: S, script: { 0: [commit('project.road_link', { area: 7 })], 1: [{ type: 'cancel_project', project: 1 }] } });
    const x = r.state.fiscal.projects[0]!;
    expect(x.stage).toBe('cancelled');
    expect(r.state.fiscal.obligations).toEqual([expect.objectContaining({ kind: 'transfer',
      perMonth: Math.round(RICH.fiscal.cancel_penalty * (x.budget - x.spent)) })]);
  });
});

describe('M4: the construction-capacity pool', () => {
  // a small local pool, money to spare, and a road queued ahead of a factory (the research note's three-way run)
  const P = withFiscal({ start_balances: { general: 300_000, land: 5_000_000, debt: 0, forex_usd: 50_000 } },
    { capacity: { ...params.capacity, local_crew: 50 } });
  const S = stepsFor(P);
  const ROAD = commit('project.road_link', { area: 7 }, 'high');
  const withFirm = () => {
    const s = start(P);
    createFirm(s, P, sizeOffer(P, HK, 'hk_processing', 200), { premises: 'new_factory', area: 7, zone: 1 });
    return s;
  };
  const three = (extra: PlayerAction[]) => go(withFirm(), 24, { steps: S, script: { 0: [ROAD, ...extra] } }).state;
  const local = three([]);
  const dedicated = three([{ type: 'contract_team', team: 'team.county_crew', mode: 'dedicated', project: 1 }]);
  const pooled = three([{ type: 'contract_team', team: 'team.engineering_corps', mode: 'pool' }]);
  const road = (s: GameState) => s.fiscal.projects[0]!;
  const t0 = start().date;

  it('runs the queue: the road first at full pace, the factory on what is left', () => {
    expect(road(local).completed).toBe(t0 + params.projects['project.road_link']!.work_months - 1);
    expect(local.firms[0]!.opens!).toBeGreaterThan(t0 + BUILD - 1);
  });

  it('a dedicated county crew frees the pool for the factory, without making the road instant or free', () => {
    expect(dedicated.firms[0]!.opens).toBe(t0 + BUILD - 1);           // as if the pool had room: M3b's timing
    const tm = params.teams['team.county_crew']!.mobilization_months;
    expect(road(dedicated).completed).toBe(t0 + tm + params.projects['project.road_link']!.work_months - 1);
    expect(road(dedicated).spent).toBe(road(dedicated).budget);
    expect(road(local).spent).toBe(road(local).budget);
  });

  it('a pool contract adds capacity once mobilised, and the waiting factory finishes sooner', () => {
    expect(pooled.firms[0]!.opens!).toBeLessThan(local.firms[0]!.opens!);
    expect(road(pooled).completed!).toBeLessThanOrEqual(road(local).completed!);
    expect(pooled.fiscal.obligations.some((o) => o.kind === 'service' && o.createdBy === 'contract.1')).toBe(true);
  });

  it('shows why a job waits, and keeps village self-build outside the pool', () => {
    const empty = withFiscal({}, { capacity: { ...params.capacity, local_crew: 0 } });
    const s = withFirm();
    const b = s.blocks.find((x) => x.area === 1)!;
    b.cohorts.push({ era: 0, use: 'residential_rental', stage: 'under_construction', legality: 'permitted', m2: 700,
      archetype: 'village_rental', due: s.date + 3, workDone: 0, workTotal: 4 });
    const r = go(s, 4, { steps: stepsFor(empty), script: { 0: [ROAD] } }).state;
    expect(r.blocks.find((x) => x.area === 1)!.cohorts.find((c) => c.archetype === 'village_rental' && c.m2 === 700)).toBeUndefined();
    expect(r.blocks.find((x) => x.area === 1)!.events.some((e) => e.kind === 'complete' && e.m2 === 700)).toBe(true);
    expect(r.blocks.find((x) => x.area === 7)!.cohorts.filter((c) => c.firm === 1).every((c) => c.workDone === 0)).toBe(true);
    expect(road(r)).toMatchObject({ stage: 'committed', waiting: 'capacity', workDone: 0 });
  });
});

describe('M4: nominal GDP', () => {
  it('starts positive from the existing economy, and leaves out the grant', () => {
    const r = go(start(), 1);
    const s = r.state;
    let base = 0;
    for (const j of s.labour.baseJobs) {
      const row = s.labour.jobs.find((x) => x.area === j.area && x.sector === j.sector)!;
      base += j.jobs * (row.filled / row.jobs) * params.gdp.base_va_per_job_month[j.sector];
    }
    expect(s.history.gdp[0]).toBeCloseTo(base, 6);
    expect(base).toBeGreaterThan(0);
    const noGrant = withFiscal({ provincial_base_grant_per_year: 0 });
    expect(go(start(noGrant), 24, { steps: stepsFor(noGrant) }).state.history.gdp).toEqual(go(start(), 24).state.history.gdp);
  });
});

describe('M4: the preview', () => {
  it('adds cash this quarter, retained tax and new obligations, and stays pure', () => {
    const P = validateParams({ ...params, investors: { ...params.investors, archetypes: {
      [HK]: { ...params.investors.archetypes[HK]!, rate_per_quarter: 3, jobs: [100, 100] },
      [SOE]: { ...params.investors.archetypes[SOE]!, rate_per_quarter: 0 } } } });
    const steps = stepsFor(P, { investors: true });
    const s = go(start(P), 1, { steps, script: { 0: [ONE_CELL] } }).state;
    s.servicedLand = [[360, 372, 372]];
    s.zones[0]!.servicedShare = 1;
    const card = s.pendingCards.find((c) => c.card === HK)!;
    card.options = ['accept:zone:1', 'accept:premises:1', 'decline'];
    const before = saveToJson(saveGame(s, new Rng(1), content));
    const v = previewOffer(s, card, P, { investors, buildable, fiscal });
    expect(saveToJson(saveGame(s, new Rng(1), content))).toBe(before);
    const [zone, prem] = v.sites;
    const F = P.fiscal;
    expect(zone!.fiscal).toEqual({ cashThisQuarter: 0,
      retainedTaxPerYear: Math.round(zone!.perYear.valueAdded * 0.1 * F.collection_efficiency),
      newObligationsPerYear: Math.round(12 * (100 * (F.admin_per_resident_month + F.police_per_present_month)
        + (zone!.floorM2 + zone!.dormM2) * F.sanitation_per_m2_month)) });
    expect(prem!.fiscal!.newObligationsPerYear).toBe(Math.round(12 * 100 * (F.admin_per_resident_month + F.police_per_present_month)));
    expect(previewOffer(s, card, P, { investors }).sites[0]!.fiscal).toBeUndefined();
    // land-use fees under the contracting regime, once the land rules are in force
    const later = { ...s, date: parseYM('1982-01'), fiscal: { ...s.fiscal, regime: 'regime.contracting_1980s' } };
    const land = (zone!.floorM2 + zone!.dormM2) / P.industry.max_far;
    expect(previewOffer(later, card, P, { investors, fiscal }).sites[0]!.fiscal!.cashThisQuarter).toBe(Math.round(3 * (15 * land) / 12));
  });
});

describe('M4 determinism', () => {
  const script: Record<number, PlayerAction[]> = {
    0: [ONE_CELL, commit('project.road_link', { area: 7 }, 'high')],
    1: [commit('project.site_preparation', { zone: 1 }), { type: 'contract_team', team: 'team.county_crew', mode: 'dedicated', project: 1 }],
    2: [{ type: 'contract_team', team: 'team.engineering_corps', mode: 'pool' }, ...[1, 2, 3, 4, 5].map((a) => commit('project.school', { area: a }))],
    5: [{ type: 'set_project_priority', project: 3, priority: 'low' }],
  };
  const P = withFiscal({ provincial_base_grant_per_year: 600_000 });     // deficits early, so the card is in the run
  const steps = stepsFor(P, { investors: true });
  const policy = (): DecisionPolicy => {
    const t0 = start().date;
    return (s, pending) => [...firstOption(s, pending), ...(script[s.date - t0] ?? [])];
  };

  it('save, load and continue, and replay, give the same game with projects, contracts, loans and deficit cards', () => {
    const rng = new Rng(11);
    const end = runMonths(start(P), 30, rng, policy(), steps);
    expect(end.fiscal.loans.length).toBeGreaterThan(1);
    expect(end.actionLog.some((a) => a.action.type === 'answer_card' && a.action.instance.startsWith(DEFICIT_CARD))).toBe(true);
    const text = saveToJson(saveGame(end, rng, content));
    const rngA = new Rng(11);
    const mid = runMonths(start(P), 13, rngA, policy(), steps);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rngA, content))));
    const t0 = start().date;
    const cont = runMonths(loaded.state, 17, loaded.rng, (s, pending) => [...firstOption(s, pending), ...(s.date - t0 > 12 ? script[s.date - t0] ?? [] : [])], steps);
    expect(saveToJson(saveGame(cont, loaded.rng, content))).toBe(text);
    const rngB = new Rng(11);
    expect(saveToJson(saveGame(replay(start(P), end.actionLog, 30, rngB, steps), rngB, content))).toBe(text);
  });

  it('changes no input state, and applies no project action while an interrupting card is pending', () => {
    const s0 = go(start(P), 3, { steps, script }).state;
    const before = saveToJson(saveGame(s0, new Rng(5), content));
    step(s0, s0.pendingCards.map((c) => ({ type: 'answer_card', instance: c.id, option: c.options[0]! })), new Rng(5), steps);
    expect(saveToJson(saveGame(s0, new Rng(5), content))).toBe(before);
    const blocked = { ...s0, pendingCards: [...s0.pendingCards, { id: 'fixture.stop@0', card: 'fixture.stop', options: ['ok'],
      interrupting: true, raisedAt: s0.date }] };
    const r = step(blocked, [commit('project.road_link', { area: 1 })], new Rng(5), steps);
    expect(r.status).toBe('paused');
    expect(r.state.fiscal.projects.length).toBe(s0.fiscal.projects.length);
  });
});
