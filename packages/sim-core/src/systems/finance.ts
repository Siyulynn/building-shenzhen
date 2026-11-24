/**
 * Tick step 11 (phase1-slice.md §5.6, fiscal-and-macro §4, §6.1, §7.1): the month's revenue, obligations and debt
 * service, paid from the reserve, with the deficit rule for any shortfall; the state-bank project loan's card.
 * The month always closes with a balanced ledger before any card is answered.
 */
import {
  DEFICIT_CARD, DEFICIT_OPTIONS, LOAN_CARD, addObligation, baselineDue, borrowingCapacity, debtServiceAt, grantFactor, isLive,
  landFeeRate, loanSchedule, obligationDue, post, regimeOf, type AccountId, type DeficitOption, type FiscalContent,
  type ObligationKind,
} from '../fiscal.js';
import type { SliceParams } from '../params.js';
import { largestRemainder } from '../round.js';
import type { GameState } from '../state.js';
import type { TickContext } from '../step.js';
import { inTaxHoliday } from './industry.js';

type LineKind = ObligationKind | 'baseline' | 'debt_service';
interface Line { ref: string; kind: LineKind; amount: number }
/** Paying order: debt service, arrears and payroll first, so unpaid payroll is the last resort. */
const ORDER: readonly LineKind[] = ['debt_service', 'arrears', 'payroll', 'baseline', 'service', 'maintenance', 'transfer'];
const CUTTABLE: readonly LineKind[] = ['baseline', 'payroll', 'service'];

function takeLoan(s: GameState, kind: 'project' | 'short', principal: number, p: SliceParams): void {
  const F = s.fiscal;
  const L = kind === 'project' ? p.fiscal.loan : { ...p.fiscal.short_loan, grace_months: 0 };
  const id = F.nextId.loan++;
  F.loans.push({ id, kind, principal, rate: L.rate_month, taken: s.date,
    schedule: loanSchedule(principal, L.rate_month, s.date + 1, L.grace_months, L.term_months) });
  post(s, 'loan', kind === 'project' ? 'debt' : 'general', principal, `loan.${id}`);
}

/** Raise the project loan's card unless it is taken or already pending (§5.6; M5b's briefing, §5.8). */
export function offerProjectLoan(ctx: TickContext, p: SliceParams): boolean {
  const s = ctx.state, F = s.fiscal, L = p.fiscal.loan;
  if (F.projectLoan === 'taken' || s.pendingCards.some((c) => c.card === LOAN_CARD)) return false;
  const inst = ctx.raise({ card: LOAN_CARD, options: ['take', 'decline'], interrupting: false });
  inst.payload = { principal: L.principal, rate_month: L.rate_month, grace_months: L.grace_months, term_months: L.term_months };
  inst.expires = s.date + L.offer_months;
  F.projectLoan = 'offered';
  return true;
}

export function finance(p: SliceParams, fc: FiscalContent) {
  return (ctx: TickContext): void => {
    const s = ctx.state, F = s.fiscal, P = p.fiscal;
    const ev = (kind: string, detail: Record<string, unknown>) => ctx.events.push({ step: 'finance', kind, detail });

    // answers: the deficit card holds for the quarter it is answered in; the loan is taken or declined
    for (const { card, option } of s.answered) {
      if (card.card === DEFICIT_CARD) F.deficit = { turn: s.turn, option: option as DeficitOption };
      else if (card.card === LOAN_CARD && F.projectLoan === 'offered') {
        if (option === 'take') { takeLoan(s, 'project', P.loan.principal, p); F.projectLoan = 'taken'; ev('loan_taken', {}); }
        else { F.projectLoan = 'declined'; ev('loan_declined', {}); }
      }
    }
    s.pendingCards = s.pendingCards.filter((c) => {
      if (c.card !== LOAN_CARD || c.expires === undefined || s.date < c.expires) return true;
      F.projectLoan = 'declined';
      ev('loan_lapsed', { card: c.id });
      return false;
    });

    // 1. revenue
    const r = regimeOf(s, fc);
    let tax = 0;
    for (const f of s.firms) {
      if (inTaxHoliday(f, s.date)) continue;                // M5a's incentive (§5.7)
      tax += f.output * p.industry.by_ownership[f.ownership].value_added_ratio * r.tax.value_added_rate[f.ownership];
    }
    let revenue = post(s, 'tax', 'general', tax * P.collection_efficiency * r.tax.local_share, 'tax.industry');
    // R4 (§5.11): staffed formal service posts pay tax on their value added; informal posts pay nothing
    if (p.growth) {
      let staffed = 0;
      for (const sp of s.labour.servicePosts) {
        const row = s.labour.jobs.find((x) => x.area === sp.area && x.sector === 'services');
        if (row && row.jobs > 0) staffed += sp.formal * (row.filled / row.jobs);
      }
      revenue += post(s, 'tax', 'general', staffed * p.gdp.base_va_per_job_month.services * p.growth.services.tax_rate
        * P.collection_efficiency * r.tax.local_share, 'tax.services');
    }
    revenue += post(s, 'tax', 'general', P.county_base_revenue_per_month, 'tax.county_base');
    revenue += post(s, 'grant', 'general', (P.provincial_base_grant_per_year / 12) * grantFactor(r, s.date), 'grant.provincial_base');
    const fee = landFeeRate(r, s.date);
    if (fee > 0) {
      let land = 0;
      for (const f of s.firms) {
        if (f.zone !== undefined) land += ((f.floorM2 + f.dormM2) / p.industry.max_far) * (f.terms?.landFeeFactor ?? 1);
      }
      // R4 (§5.11): private shops and work-unit dormitories on zone land pay the fee as firms do
      for (const b of s.blocks) for (const c of b.cohorts) {
        if (c.zone !== undefined && c.firm === undefined && (c.builder === 'private' || c.builder === 'work_unit')
          && c.stage !== 'demolished') land += c.m2 / p.industry.max_far;
      }
      post(s, 'land_fee', 'land', (fee * land) / 12, 'land_fee');
    }
    let exports = 0;
    for (const f of s.firms) exports += f.output * p.industry.by_ownership[f.ownership].export_share;
    post(s, 'retention', 'forex', (exports * P.forex.retention_share) / P.forex.yuan_per_usd, 'retention');

    // 2. what is due
    const baseline = baselineDue(s, p);
    const lines: Line[] = [{ ref: 'baseline', kind: 'baseline', amount: baseline }];
    for (const o of F.obligations) if (isLive(o, s.date)) lines.push({ ref: o.createdBy, kind: o.kind, amount: obligationDue(o, s) });
    for (const l of F.loans) {
      const d = debtServiceAt(l, s.date);
      if (d > 0) lines.push({ ref: `loan.${l.id}`, kind: 'debt_service', amount: d });
    }
    lines.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    const due = lines.reduce((a, l) => a + l.amount, 0);

    // 3. the reserve, then the deficit rule
    let short = Math.max(0, due - F.balances.general);
    let fromLand = 0, cut = 0;
    if (short > 0) {
      const answered = F.deficit?.turn === s.turn ? F.deficit.option : undefined;
      if (F.deficit?.turn !== s.turn) {
        // no card yet this quarter: raise it; this month's shortfall goes to arrears
        const inst = ctx.raise({ card: DEFICIT_CARD, options: [...DEFICIT_OPTIONS], interrupting: true });
        inst.payload = { shortfall: short, capacity: borrowingCapacity(s, p) };
        F.deficit = { turn: s.turn };
      } else {
        const chain = [...new Set<DeficitOption>([...(answered ? [answered] : []), 'borrow_short', 'austerity'])];
        const cuttable = lines.reduce((a, l) => a + (CUTTABLE.includes(l.kind) ? l.amount : 0), 0);
        for (const opt of chain) {
          if (short <= 0) break;
          if (opt === 'borrow_short') {
            const amt = Math.min(short, borrowingCapacity(s, p));
            if (amt > 0) { takeLoan(s, 'short', amt, p); short -= amt; ev('short_borrowing', { amount: amt }); }
          } else if (opt === 'use_land_money') {
            const amt = Math.min(short, F.balances.land);
            if (amt > 0) {
              fromLand = amt; short -= amt;
              if (r.landForRecurring !== 'sanctioned') ev('land_for_recurring', { amount: amt, status: r.landForRecurring });
            }
          } else {
            const amt = Math.min(short, Math.floor(P.austerity_max_cut * cuttable));
            if (amt > 0) { cut = amt; short -= amt; }
          }
        }
      }
    }

    // 4. pay: the cut comes off the cuttable lines in proportion; the rest is paid from general, then land
    const cuttable = lines.filter((l) => CUTTABLE.includes(l.kind));
    const cuttableSum = cuttable.reduce((a, l) => a + l.amount, 0);
    // largest remainder: each line's cut is between 0 and its amount, and the cuts add up to the cut (cut <= cuttableSum)
    const split = largestRemainder(cut, cuttable.map((l) => l.amount));
    const cutOf = new Map<Line, number>(cuttable.map((l, i) => [l, split[i]!]));
    let landLeft = fromLand, paid = 0, unpaid = 0, payrollUnpaid = 0;
    for (const l of lines) {
      let owe = l.amount - (cutOf.get(l) ?? 0);
      for (const acc of ['general', 'land'] as AccountId[]) {
        const room = acc === 'general' ? F.balances.general : landLeft;
        const take = Math.min(owe, room);
        if (take > 0) {
          post(s, 'obligation', acc, -take, l.ref);
          if (acc === 'land') landLeft -= take;
          owe -= take; paid += take;
        }
      }
      if (owe > 0) { unpaid += owe; if (l.kind === 'payroll') payrollUnpaid += owe; }
    }
    if (unpaid > 0) {
      addObligation(s, { kind: 'arrears', perMonth: unpaid, index: 'none', from: s.date + 1, until: s.date + 1, createdBy: 'arrears' });
      ev('arrears', { amount: unpaid, payroll: payrollUnpaid });
    }
    F.austerity = cuttableSum > 0 ? cut / cuttableSum : 0;

    // 5. the project loan's card, when a commit left money for projects below zero
    if (F.loanWanted) {
      F.loanWanted = false;
      offerProjectLoan(ctx, p);
    }
    ev('month', { revenue, due, baseline, paid, austerity: F.austerity });
  };
}
