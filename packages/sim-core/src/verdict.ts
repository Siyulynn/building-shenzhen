/**
 * The closing visit's verdict (phase1-slice.md §5.8, §7.2): pure, read from the state at the visit. That is the state
 * at the end of the slice's last full year, because the visit fires in the events step before that month's finance.
 */
import {
  baselineDue, debtServiceAt, grantFactor, isLive, obligationDue, regimeOf, type FiscalContent,
} from './fiscal.js';
import type { SliceParams } from './params.js';
import type { GameState, ReviewRecord } from './state.js';

export interface Verdict {
  growth: { residents: number; gdp: number };              // over the first year's: end-of-year residents, a year's GDP
  ledger: { reserve: number; debtOutstanding: number; arrears: number };
  lastReview?: ReviewRecord;
  scrutiny: number;
  illegalShare: number;
  /** §7.2's fiscal test, with the grant at zero: a year of recurring revenue against the next 12 months' dues. */
  fiscalTest: { grantFactor: number; revenuePerYear: number; dueNext12: number; balance: number };
  /** R10d (§5.13): the forex the run's trade burned (its `import.trade` draws), what retention earned, the quota left. */
  forex: { burnedUsd: number; earnedUsd: number; quotaUsd: number };
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
  return {
    growth: { residents: residents0 > 0 ? last(h.resident) / residents0 : 0, gdp: gdp0 > 0 ? gdp1 / gdp0 : 0 },
    ledger: { reserve: s.fiscal.balances.general, debtOutstanding: last(h.debtOutstanding), arrears },
    ...(lastReview ? { lastReview } : {}),
    scrutiny: s.climate.scrutiny,
    illegalShare: last(h.illegalShare),
    fiscalTest: { grantFactor: grantFactor(regimeOf(s, fc), s.date), revenuePerYear, dueNext12,
      balance: revenuePerYear - dueNext12 },
    forex: {
      burnedUsd: -s.fiscal.ledger.reduce((a, e) => a + (e.type === 'import' && e.ref === 'import.trade' ? e.amount : 0), 0),
      earnedUsd: s.fiscal.ledger.reduce((a, e) => a + (e.type === 'retention' ? e.amount : 0), 0),
      quotaUsd: s.fiscal.balances.forex,
    },
  };
}
