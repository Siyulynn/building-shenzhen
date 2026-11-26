/** R11 (phase1-slice.md §5.14): the construction credit line, the wage path and the worksite sheds. */
import { describe, expect, it } from 'vitest';
import {
  Rng, applyFiscalAction, constructionCreditRoom, constructionFinance, createTickSteps, drawConstructionCredit,
  gatesOf, runMonths, takeConstructionLoan, validateParams, type GameState,
} from '../src/index.js';
import { bedsByPool, totalShedBeds } from '../src/systems/common.js';
import { parseYM } from '../src/ym.js';
import { fiscal, initial, params } from './fixtures.js';

/** A 1982 state on the contracting regime with a year of revenue and one project payment behind it. */
function in1982(): GameState {
  const s = initial();
  s.fiscal.regime = 'regime.contracting_1980s';
  s.date = parseYM('1982-02');
  s.history.months = Array.from({ length: 13 }, (_, i) => parseYM('1981-02') + i);
  s.history.revenue = Array.from({ length: 13 }, () => 400_000);
  s.fiscal.ledger.push({ date: parseYM('1982-01'), type: 'project', account: 'general', amount: -100_000, ref: 'test' });
  return s;
}

describe('R11a: the construction credit line', () => {
  it('has no room before the line opens, and only the share of past spending after it', () => {
    const before = initial();
    before.history.revenue = Array.from({ length: 12 }, () => 400_000);
    expect(constructionCreditRoom(before, params, fiscal)).toBe(0);          // the county regime has no line

    const s = in1982();
    // the flow cap: 40% of the ¥100,000 project payment since the line opened (the ceiling is ¥7.2M)
    expect(constructionCreditRoom(s, params, fiscal)).toBe(40_000);
  });

  it('draws up to the room, posts debt and a loan, and refuses past the room', () => {
    const s = in1982();
    const drawn = drawConstructionCredit(s, params, fiscal, 100_000);
    expect(drawn).toBe(40_000);
    expect(s.fiscal.balances.debt).toBe(40_000);
    expect(s.fiscal.loans).toHaveLength(1);
    expect(s.fiscal.loans[0]!.principal).toBe(40_000);
    expect(constructionCreditRoom(s, params, fiscal)).toBe(0);
    expect(drawConstructionCredit(s, params, fiscal, 1)).toBe(0);
  });

  it('is a gated turn action', () => {
    const s = in1982();
    expect(gatesOf(s, { type: 'draw_credit', amount: 1 })).toEqual(['finance.credit']);
    expect(() => applyFiscalAction(s, params, fiscal, { type: 'draw_credit', amount: 1 }, undefined, false)).not.toThrow();
    expect(() => applyFiscalAction(s, params, fiscal, { type: 'draw_credit', amount: -1 }, undefined, false)).toThrow(/positive/);
  });

  it('the plan reports a bank share of the works it draws against', () => {
    // the credit's terms are content: no line before the dated entry, one after it
    const regime = fiscal.regimes.find((r) => r.id === 'regime.contracting_1980s')!;
    expect(regime.credit.length).toBe(1);
    expect(regime.credit[0]!.from).toBe(parseYM('1982-01'));
    expect(regime.credit[0]!.bankLoanShareMax).toBeGreaterThan(0);
  });

  it('keeps the briefing loan out of the bank share and reports it apart', () => {
    const s = in1982();
    takeConstructionLoan(s, 300_000, { rateMonth: 0.004, graceMonths: 0, termMonths: 60 }, 'briefing');
    drawConstructionCredit(s, params, fiscal, 40_000);
    const fin = constructionFinance(s, parseYM('1982-01'), parseYM('1982-12'));
    expect(fin.line).toBe(40_000);
    expect(fin.briefing).toBe(300_000);
    expect(fin.share).toBeCloseTo(0.4, 6);          // 40,000 of the 100,000 payment, never the briefing
    expect(fin.total).toBe(100_000);
  });
});

describe('R11b: the wage path', () => {
  const steps = createTickSteps(params);

  it('stays at its start without a wage-drift modifier', () => {
    const s = runMonths(initial(), 3, new Rng(1), undefined, steps);
    expect(s.labour.wage.factory).toBeCloseTo(params.labour.wage_start.factory, 6);
  });

  it('compounds a live wage_drift modifier month by month', () => {
    const s0 = initial();
    s0.events.modifiers = [{ source: 'test', target: 'wage_drift', factor: 1.01, until: s0.date + 2 }];
    const s = runMonths(s0, 3, new Rng(1), undefined, steps);
    expect(s.labour.wage.factory / params.labour.wage_start.factory).toBeCloseTo(1.01 ** 3, 2);
  });

  it('the split market speeds are optional and validated', () => {
    const base = params.labour;
    expect(() => validateParams({ ...params, labour: { ...base, wage_speed_up: -1 } })).toThrow(/wage_speed_up/);
    const { wage_speed_up: _u, wage_speed_down: _d, ...rest } = base;
    expect(() => validateParams({ ...params, labour: rest })).not.toThrow();   // the fallback covers it
  });
});

describe('R11c: worksite sheds', () => {
  const withSheds = params;
  const { sheds: _sheds, ...housingNoSheds } = params.housing;
  const withoutSheds = validateParams({ ...params, housing: housingNoSheds });

  it('adds derived rental beds from the block\'s own building, and nothing without the params', () => {
    const s = initial();
    const b = s.blocks[0]!;
    const m2 = 10_000;
    b.cohorts.push({ era: 0, use: 'workshop', stage: 'under_construction', m2, archetype: 'standard_factory', legality: 'permitted' });
    const jobs = Math.floor(m2 * params.labour.construction_jobs_per_m2);
    const beds = Math.floor(jobs * withSheds.housing.sheds!.beds_per_construction_job);
    expect(totalShedBeds(s, withSheds)).toBe(beds);
    expect(bedsByPool(b, withSheds).rental - bedsByPool(b, withoutSheds).rental).toBe(beds);
    expect(totalShedBeds(s, withoutSheds)).toBe(0);
  });
});
