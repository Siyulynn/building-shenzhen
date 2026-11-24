/**
 * Measures, plausibility bands and the exit-criteria checks (phase1-slice.md §5.9, §9). Pure: the caller reads the
 * band files and the claims; a claim's value is resolved here at check time and never copied into content.
 */
import { DEFICIT_CARD, debtServiceAt, moneyForProjects } from './fiscal.js';
import type { SliceParams } from './params.js';
import type { CardInstance, GameState } from './state.js';
import { formatYM, parseYM, type YM } from './ym.js';

// ---- measures ----

export const MEASURES = [
  'slice.resident_pop', 'slice.resident_pop.nonlocal', 'slice.present_pop.temporary', 'slice.employed',
  'slice.gdp_nominal.year', 'slice.gdp_nominal.trailing_4q', 'slice.exports_usd.year', 'slice.exports_usd.trailing_4q',
  'city.general.spending_over_revenue.year', 'city.general.spending_over_revenue.trailing_4q',
] as const;
export type Measure = (typeof MEASURES)[number];

const trailing = (xs: readonly number[]) => xs.slice(-12).reduce((a, x) => a + x, 0);
const last = (xs: readonly number[]) => xs[xs.length - 1] ?? 0;

/** A named read of a state (§5.9). Trailing flows sum the last 12 months the history recorded. */
export function measure(s: GameState, name: string, p: SliceParams): number {
  const h = s.history;
  switch (name as Measure) {
    case 'slice.resident_pop': return s.pops.reduce((a, g) => a + g.stayedSixMonths, 0);
    case 'slice.resident_pop.nonlocal':
      return s.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.stayedSixMonths : 0), 0);
    case 'slice.present_pop.temporary': return s.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.present : 0), 0);
    case 'slice.employed': return Object.values(h.employed).reduce((a, xs) => a + last(xs), 0);
    case 'slice.gdp_nominal.year': case 'slice.gdp_nominal.trailing_4q': return trailing(h.gdp);
    case 'slice.exports_usd.year': case 'slice.exports_usd.trailing_4q': return trailing(h.exports) / p.fiscal.forex.yuan_per_usd;
    case 'city.general.spending_over_revenue.year': case 'city.general.spending_over_revenue.trailing_4q': {
      const rev = trailing(h.revenue);
      return rev > 0 ? (trailing(h.obligationsPaid) + trailing(h.projectSpend)) / rev : 0;
    }
    default: throw new Error(`no measure ${name}`);
  }
}

// ---- band records (content/slice/snapshot_1980q2.yaml, checkpoint_1983q4.yaml) ----

interface Ratio { numerator: string; denominator: string }
export interface BandRecord {
  id: string; measure?: string; applies_as?: string; bound?: string; tolerance?: [number, number];
  ratio?: Ratio; from?: Ratio; to?: Ratio; growth?: { from: string; to: string }; growth_from?: string;
  check?: string; range?: [number, number]; factor?: number; margin?: number; growth_band?: [number, number];
  kind?: string; at_end_of?: string;
}
export interface ClaimInfo { value?: unknown; status: string }
export type Claims = ReadonlyMap<string, ClaimInfo>;

export const DESIGN_CHECKS = ['residents_multiply', 'exports_outgrow_gdp', 'village_outgrows_planned', 'deficit_before_visit',
  'readiness_moves_wave', 'stall_after_credit'] as const;
export type DesignCheck = (typeof DESIGN_CHECKS)[number];

export interface BandResult {
  id: string; kind: string; measure?: string;
  /** pass or fail; 'cross_run' when only a set of runs can decide it; 'not_checkable' with a note */
  result: 'pass' | 'fail' | 'cross_run' | 'not_checkable';
  value?: number;                        // the measure, or the multiple for a growth band
  range?: [number, number];              // the band the value must lie in (an upper bound has lo = -Infinity)
  base?: number;                         // a growth band's value at the base checkpoint
  note?: string;
  claims: { id: string; status: string; unverified: boolean }[];
}

const MEASURED_KINDS = ['upper_bound', 'ratio_band', 'between_ratios', 'growth', 'upper_bound_and_growth'];
/** A band record of a measured kind or a design band; facts, notes and checkpoint records are not bands. */
export const isBand = (r: BandRecord) =>
  r.id.startsWith('band.') && ((!!r.measure && MEASURED_KINDS.includes(r.applies_as ?? '')) || r.applies_as === 'design_band');

/** The months from the scenario's start to the end of the quarter a band id names (band.<year>q<n>.…). */
export function bandMonths(id: string, start: YM): number {
  const m = /^band\.(\d{4})q([1-4])\./.exec(id);
  if (!m) throw new Error(`${id}: a band id names its quarter (band.<year>q<n>.…)`);
  return parseYM(`${m[1]}-${String(3 * Number(m[2])).padStart(2, '0')}`) + 1 - start;
}

/** The value of a numeric claim; throws when the claim is missing or has no number. */
export function claimValue(claims: Claims, id: string): number {
  const v = claims.get(id)?.value;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`claim ${id} has no numeric value`);
  return v;
}

const claimIds = (r: BandRecord): string[] => {
  const ids = [r.bound, r.growth_from, r.ratio?.numerator, r.ratio?.denominator, r.from?.numerator, r.from?.denominator,
    r.to?.numerator, r.to?.denominator, r.growth?.from, r.growth?.to];
  return [...new Set(ids.filter((x): x is string => !!x))];
};

/** What a check reads: the state after `months` months, if the run got that far, and the run's other facts. */
export interface CheckRun {
  at(months: number): GameState | undefined;
  final: GameState;
  params: SliceParams;
}

const within = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;
const res = (ok: boolean): 'pass' | 'fail' => (ok ? 'pass' : 'fail');

/** Village rental floor and planned housing (state flats and dormitories), completed, in m². */
export function housingFloor(s: GameState): { village: number; planned: number } {
  let village = 0, planned = 0;
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage !== 'completed') continue;
    if (c.archetype === 'village_rental') village += c.m2;
    else if (c.archetype === 'state_flats' || c.archetype === 'dormitory') planned += c.m2;
  }
  return { village, planned };
}

function designBand(r: BandRecord, run: CheckRun, base: GameState | undefined, end: GameState): Omit<BandResult, 'claims' | 'id' | 'kind'> {
  const p = run.params;
  const check = r.check as DesignCheck;
  if (check === 'stall_after_credit') {
    return { result: 'not_checkable', note: 'tick step 1 has no credit series in the slice, so no credit tightening occurs' };
  }
  if (check === 'readiness_moves_wave') {
    return { result: 'cross_run', ...(end.sez.readiness !== undefined ? { value: end.sez.readiness } : {}),
      note: `readiness at the opening ${end.sez.readiness?.toFixed(3) ?? 'n/a'}, first-wave cards ${end.sez.waveCards ?? 'n/a'}` };
  }
  if (check === 'deficit_before_visit') {
    const h = end.history;
    const m = h.months.findIndex((_, i) => h.revenue[i]! < h.obligationsDue[i]!);
    return { result: res(m >= 0), note: m >= 0 ? `first in ${formatYM(h.months[m]!)}` : 'no month with revenue below obligations due' };
  }
  if (!base) return { result: 'fail', note: 'the run did not reach the base checkpoint' };
  if (check === 'residents_multiply') {
    if (!r.range) throw new Error(`${r.id}: residents_multiply needs a range`);
    const b = measure(base, 'slice.resident_pop', p), v = b > 0 ? measure(end, 'slice.resident_pop', p) / b : 0;
    return { result: res(within(v, r.range)), value: v, range: r.range, base: b };
  }
  if (check === 'exports_outgrow_gdp') {
    if (r.factor === undefined) throw new Error(`${r.id}: exports_outgrow_gdp needs a factor`);
    const share = (s: GameState) => { const g = trailing(s.history.gdp); return g > 0 ? trailing(s.history.exports) / g : 0; };
    const s0 = share(base), s1 = share(end);
    return { result: res(s0 === 0 ? s1 > 0 : s1 >= r.factor * s0), value: s0 > 0 ? s1 / s0 : (s1 > 0 ? Infinity : 0),
      range: [r.factor, Infinity], note: `exports ÷ GDP ${s0.toFixed(4)} → ${s1.toFixed(4)}` };
  }
  if (check === 'village_outgrows_planned') {
    const a = housingFloor(base), b = housingFloor(end);
    const dv = b.village - a.village, dp = b.planned - a.planned;
    return { result: res(dv > dp && dv > 0), value: dv, note: `village rental +${dv} m², planned housing +${dp} m²` };
  }
  throw new Error(`${r.id}: unknown design check ${r.check}`);
}

/**
 * Check bands against a run (§5.9). `base` is the growth bands' base checkpoint (end of the first year); a growth
 * band's `growth_band` is its own, else `growthBand`. A claim below verified is tagged unverified.
 */
export function checkBands(records: readonly BandRecord[], claims: Claims, run: CheckRun,
  opts: { start: YM; baseMonths: number; growthBand?: [number, number] }): BandResult[] {
  const out: BandResult[] = [];
  const base = run.at(opts.baseMonths);
  for (const r of records.filter(isBand)) {
    const tags = claimIds(r).map((id) => {
      const c = claims.get(id);
      if (!c) throw new Error(`${r.id}: no claim ${id}`);
      return { id, status: c.status, unverified: c.status !== 'verified' };
    });
    const kind = r.applies_as!;
    const months = bandMonths(r.id, opts.start);
    const s = run.at(months);
    if (kind === 'design_band') {
      out.push({ id: r.id, kind, ...designBand(r, run, base, s ?? run.final), claims: tags });
      continue;
    }
    if (!s) { out.push({ id: r.id, kind, measure: r.measure!, result: 'fail', note: `the run ended before month ${months}`, claims: tags }); continue; }
    const v = measure(s, r.measure!, run.params);
    const gb = r.growth_band ?? opts.growthBand;
    // a growth band: the value's multiple over the base checkpoint, against the claims' multiple × the growth band
    const growthOf = (from: string, to: string): { ok: boolean; fields: Pick<BandResult, 'value' | 'range' | 'base'> } => {
      if (!gb) throw new Error(`${r.id}: a growth band needs a growth_band`);
      const mult = claimValue(claims, to) / claimValue(claims, from);
      const range: [number, number] = [mult * gb[0], mult * gb[1]];
      if (!base) return { ok: false, fields: { range } };
      const b = measure(base, r.measure!, run.params);
      const value = b > 0 ? v / b : 0;
      return { ok: within(value, range), fields: { value, range, base: b } };
    };
    const row = { id: r.id, kind, measure: r.measure!, claims: tags };
    if (kind === 'upper_bound') {
      const hi = claimValue(claims, r.bound!);
      out.push({ ...row, result: res(v <= hi), value: v, range: [-Infinity, hi] });
    } else if (kind === 'ratio_band' || kind === 'between_ratios') {
      if (!r.tolerance) throw new Error(`${r.id}: ${kind} needs a tolerance`);
      const q = (x: Ratio) => claimValue(claims, x.numerator) / claimValue(claims, x.denominator);
      const [a, b] = kind === 'ratio_band' ? [q(r.ratio!), q(r.ratio!)] : [q(r.from!), q(r.to!)];
      const range: [number, number] = [Math.min(a, b) * r.tolerance[0], Math.max(a, b) * r.tolerance[1]];
      out.push({ ...row, result: res(within(v, range)), value: v, range });
    } else if (kind === 'growth') {
      const g = growthOf(r.growth!.from, r.growth!.to);
      out.push({ ...row, result: res(g.ok), ...g.fields });
    } else {
      const hi = claimValue(claims, r.bound!);
      const g = growthOf(r.growth_from!, r.bound!);
      out.push({ ...row, result: res(v <= hi && g.ok), ...g.fields,
        note: `level ${Math.round(v)} against the bound ${hi}${v <= hi ? '' : ' (above it)'}` });
    }
  }
  return out;
}

// ---- the exit-criteria helpers (§5.9's table) ----

/** Criterion 4: per prologue turn, the cards raised in it with two or more options. */
export function prologueDecisions(cards: readonly CardInstance[], start: YM, prologueTurns: number): { turn: number; cards: string[] }[] {
  return Array.from({ length: prologueTurns }, (_, turn) => ({
    turn,
    cards: [...new Set(cards.filter((c) => Math.floor((c.raisedAt - start) / 3) === turn && c.options.length >= 2).map((c) => c.card))],
  }));
}

export interface TradeoffYear {
  review: number; date: YM; score: number; pass: boolean; close: boolean;
  deficitCards: number; austerityMonths: number; arrearsCreated: number; minMoneyForProjects: number; tight: boolean; tradeoff: boolean;
}
/**
 * Criterion 2 (§5.9): for each review after the lightweight one, its result and the ledger's tightest point over the
 * 12 months it closes. `quarterEnds[k]` is the state after turn k; `cards` every card the run raised.
 */
export function tradeoffYears(final: GameState, quarterEnds: readonly GameState[], cards: readonly CardInstance[],
  p: SliceParams, margin: number): TradeoffYear[] {
  const cheapest = Math.min(...Object.values(p.projects).map((x) => x.budget ?? Infinity));
  return final.reviews.held.filter((r) => !r.lightweight).map((r) => {
    const from = r.date - 11, to = r.date;
    const inYear = (t: YM) => t >= from && t <= to;
    const h = final.history;
    const austerityMonths = h.months.filter((t, i) => inYear(t) && h.austerity[i]! > 0).length;
    const deficitCards = cards.filter((c) => c.card === DEFICIT_CARD && inYear(c.raisedAt)).length;
    const arrearsCreated = final.fiscal.obligations.filter((o) => o.kind === 'arrears' && inYear(o.from)).length;
    const ends = quarterEnds.filter((s) => inYear(s.date - 1));
    const minMoneyForProjects = ends.length ? Math.min(...ends.map((s) => moneyForProjects(s, p))) : 0;
    const close = !r.pass || r.score < p.review.pass_mark + margin;
    const tight = deficitCards > 0 || austerityMonths > 0 || arrearsCreated > 0 || minMoneyForProjects < cheapest;
    return { review: r.index, date: r.date, score: r.score, pass: r.pass, close, deficitCards, austerityMonths,
      arrearsCreated, minMoneyForProjects, tight, tradeoff: close && tight };
  });
}

export interface LoanYear { year: number; debtService: number; balance: number; balanceWithoutLoan: number }
/**
 * Criterion 2's loan check (§5.9): per scenario year, the project loan's debt service, and the recurring balance
 * (revenue − obligations due) with the loan and in the same policy's run with the loan declined. It squeezes a later
 * year when some year with debt service has a lower balance than without the loan.
 */
export function loanSqueeze(withLoan: GameState, withoutLoan: GameState): { took: boolean; years: LoanYear[]; squeezed: boolean } {
  const took = withLoan.fiscal.projectLoan === 'taken';
  const project = withLoan.fiscal.loans.filter((l) => l.kind === 'project');
  const a = withLoan.history, b = withoutLoan.history;
  const years: LoanYear[] = [];
  for (let y = 0; y * 12 < a.months.length; y++) {
    const months = a.months.slice(y * 12, y * 12 + 12);
    const bal = (h: typeof a) => months.reduce((t, _, i) => t + (h.revenue[y * 12 + i] ?? 0) - (h.obligationsDue[y * 12 + i] ?? 0), 0);
    const debtService = months.reduce((t, m) => t + project.reduce((x, l) => x + debtServiceAt(l, m), 0), 0);
    years.push({ year: y, debtService, balance: bal(a), balanceWithoutLoan: bal(b) });
  }
  return { took, years, squeezed: took && years.some((y) => y.debtService > 0 && y.balance < y.balanceWithoutLoan) };
}
