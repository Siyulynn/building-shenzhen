/**
 * The closing visit's verdict (phase1-slice.md §5.8, §7.2): pure, read from the state at the visit. That is the state
 * at the end of the slice's last full year, because the visit fires in the events step before that month's finance.
 */
import {
  baselineDue, constructionFinance, debtServiceAt, grantFactor, isLive, obligationDue, principalOutstanding, regimeOf,
  type FiscalContent,
} from './fiscal.js';
import { totalShedBeds } from './systems/common.js';
import type { SliceParams } from './params.js';
import type { GameState, ReviewRecord } from './state.js';

export interface Verdict {
  growth: { residents: number; gdp: number };              // over the first year's: end-of-year residents, a year's GDP
  ledger: { reserve: number; debtOutstanding: number; arrears: number };
  lastReview?: ReviewRecord;
  scrutiny: number;
  illegalShare: number;
  /** §7.2's fiscal test, with the grant at zero: a year of recurring revenue against the next 12 months' dues. */
  fiscalTest: { grantFactor: number; revenuePerYear: number; dueNext12: number; balance: number; debtService: number };
  /** R10d (§5.13): the forex the run's trade burned (its `import.trade` draws), what retention earned, the quota left. */
  forex: { burnedUsd: number; earnedUsd: number; quotaUsd: number };
  /** R11a (§5.14): the credit line's share of the trailing two years' construction, and debt ÷ revenue. */
  bankShare: number; debtToRevenue: number;
  /** R11a: the briefing loan as its own source: its principal still outstanding at the visit. */
  briefingLoan: number;
  /** R11b (§5.14): the factory monthly wage. */
  wageMonth: number;
  /** R11c (§5.14): the worksite shed beds the building supports. */
  shedBeds: number;
}

const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);
const last = (xs: readonly number[]) => xs[xs.length - 1] ?? 0;

/** Recurring revenue without the grant in month t: the tax lines of the ledger (customs is not counted: R10d, §5.13). */
export const taxRevenueAt = (s: GameState, t: number) =>
  s.fiscal.ledger.reduce((a, e) => a + (e.date === t && e.type === 'tax' ? e.amount : 0), 0);

/** The obligations due over the 12 months from `s.date`: baselines at the current rate, live obligations, debt service. */
export function dueNextYear(s: GameState, p: SliceParams): number {
  const base = baselineDue(s, p);
  let due = 0;
  for (let t = s.date; t < s.date + 12; t++) {
    due += base;
    for (const o of s.fiscal.obligations) if (isLive(o, t)) due += obligationDue(o, s);
    for (const l of s.fiscal.loans) due += debtServiceAt(l, t);
  }
  return due;
}
/** R11a (§5.14): the next 12 months' debt service, shown apart from the rest of the fiscal test. */
export function debtServiceNextYear(s: GameState): number {
  let due = 0;
  for (let t = s.date; t < s.date + 12; t++) for (const l of s.fiscal.loans) due += debtServiceAt(l, t);
  return due;
}

export function verdict(s: GameState, p: SliceParams, fc: FiscalContent): Verdict {
  const h = s.history;
  const firstYear = Math.min(12, h.months.length);
  const residents0 = h.resident[firstYear - 1] ?? 0;
  const gdp0 = sum(h.gdp.slice(0, firstYear)), gdp1 = sum(h.gdp.slice(-12));
  let arrears = 0;
  for (const o of s.fiscal.obligations) if (o.kind === 'arrears' && isLive(o, s.date)) arrears += obligationDue(o, s);
  const months = [s.date - 3, s.date - 2, s.date - 1];
  const revenuePerYear = 12 * (sum(months.map((t) => taxRevenueAt(s, t))) / months.length);
  const dueNext12 = dueNextYear(s, p);
  const lastReview = s.reviews.held[s.reviews.held.length - 1];
  const lastMonth = last(h.months);
  // R11a (§5.14): the verdict reports the programme years' bank share (the trailing two years), not one month's
  const bank = constructionFinance(s, lastMonth - 23, lastMonth);
  const annualRevenue = h.revenue.slice(-12).reduce((a, b) => a + b, 0);
  return {
    growth: { residents: residents0 > 0 ? last(h.resident) / residents0 : 0, gdp: gdp0 > 0 ? gdp1 / gdp0 : 0 },
    ledger: { reserve: s.fiscal.balances.general, debtOutstanding: last(h.debtOutstanding), arrears },
    ...(lastReview ? { lastReview } : {}),
    scrutiny: s.climate.scrutiny,
    illegalShare: last(h.illegalShare),
    fiscalTest: { grantFactor: grantFactor(regimeOf(s, fc), s.date), revenuePerYear, dueNext12,
      balance: revenuePerYear - dueNext12, debtService: debtServiceNextYear(s) },
    forex: {
      burnedUsd: -s.fiscal.ledger.reduce((a, e) => a + (e.type === 'import' && e.ref === 'import.trade' ? e.amount : 0), 0),
      earnedUsd: s.fiscal.ledger.reduce((a, e) => a + (e.type === 'retention' ? e.amount : 0), 0),
      quotaUsd: s.fiscal.balances.forex,
    },
    bankShare: Math.round(bank.share * 1e4) / 1e4,
    briefingLoan: Math.round(s.fiscal.loans.reduce((a, l) =>
      a + (l.kind === 'project' && (l.origin ?? 'briefing') === 'briefing' ? principalOutstanding(l, s.date) : 0), 0)),
    debtToRevenue: annualRevenue > 0 ? Math.round((last(h.debtOutstanding) / annualRevenue) * 1e4) / 1e4 : 0,
    wageMonth: s.labour.wage.factory,
    shedBeds: totalShedBeds(s, p),
  };
}
