/**
 * M3b's firms (phase1-slice.md §5.5, fiscal §8.1): siting a firm, its posts in tick step 5, its staffing, and its
 * production in tick step 6. output = min(orders, staffed, floor, utilities): staffed ≤ posted ≤ each cap.
 */
import { BUILDER_OF, USE_OF, type Ownership } from '../enums.js';
import type { SliceParams } from '../params.js';
import { poolShares } from '../power.js';
import { largestRemainder } from '../round.js';
import type { Firm, FirmTerms, GameState, JobRow } from '../state.js';
import type { TickContext } from '../step.js';

/** What an offer brings, at full ramp: drawn when the offer arrives, so the card and the preview can show it. */
export interface FirmOffer {
  archetype: string; ownership: Ownership;
  jobs: number; floorM2: number; dormM2: number; powerKw: number; waterM3Day: number;
}
export type FirmSite = { premises: 'new_factory'; area: number; zone: number } | { premises: 'existing'; area: number };

/** A firm archetype's numbers: an investor card's, or the organic firm's (b&c §13.3). */
const archetypeParams = (p: SliceParams, id: string): { dorm_beds_per_job: number; build_months: number; ramp_months: number;
  tax_holiday_months?: number } => {
  const a = p.investors.archetypes[id] ?? (p.growth?.industrial.archetype === id ? p.growth.industrial.firm : undefined);
  if (!a) throw new Error(`params: no firm archetype ${id} in investors.archetypes or growth.industrial`);
  return a;
};

/** An offer of `jobs` jobs: its floor, dormitory and utility needs from the params (§5.5). */
export function sizeOffer(p: SliceParams, archetype: string, ownership: Ownership, jobs: number): FirmOffer {
  const o = p.industry.by_ownership[ownership];
  const a = archetypeParams(p, archetype);
  return {
    archetype, ownership, jobs,
    floorM2: Math.round(jobs * o.floor_m2_per_job),
    dormM2: Math.round(jobs * a.dorm_beds_per_job * p.housing.m2_per_bed.dormitory),
    powerKw: jobs * o.power_kw_per_job,
    waterM3Day: jobs * o.water_m3_day_per_job,
  };
}

/**
 * A firm's terms (§5.7): the archetype's tax holiday, plus the shortcut's sweetheart price when a leader's shortcut
 * sited it. Undefined when there is nothing to record, so firms without incentives look as in M3b.
 */
export function firmTerms(p: SliceParams, archetype: string, shortcut?: string, concession?: FirmTerms): FirmTerms | undefined {
  // a concession carried in the offer (§5.8) replaces the archetype's holiday and sets its land fee
  const base = concession?.taxHolidayMonths ?? archetypeParams(p, archetype).tax_holiday_months ?? 0;
  const t: FirmTerms = {};
  const holiday = base + (shortcut ? p.shortcut.extra_tax_holiday_months : 0);
  if (holiday > 0) t.taxHolidayMonths = holiday;
  if (concession?.landFeeFactor !== undefined) t.landFeeFactor = concession.landFeeFactor;
  if (shortcut) { t.landFeeFactor = Math.min(t.landFeeFactor ?? 1, p.shortcut.land_fee_factor); t.shortcut = shortcut; }
  return Object.keys(t).length ? t : undefined;
}

/**
 * Create a firm at a site (§5.5). In a new factory it starts its factory and dormitory floor under construction in
 * its area's block, needing build_months of work; work begins this month, and the firm opens when its factory
 * completes (construction.ts). In existing premises it builds nothing and opens the next month. `shortcut` names
 * the leader whose shortcut sited it (§5.7).
 */
export function createFirm(s: GameState, p: SliceParams, offer: FirmOffer, site: FirmSite, shortcut?: string,
  concession?: FirmTerms): Firm {
  const a = archetypeParams(p, offer.archetype);
  const existing = site.premises === 'existing';
  const terms = firmTerms(p, offer.archetype, shortcut, concession);
  const f: Firm = {
    id: s.nextFirmId, archetype: offer.archetype, ownership: offer.ownership, sector: 'factory',
    area: site.area, ...(site.premises === 'new_factory' ? { zone: site.zone } : {}), premises: site.premises,
    jobs: offer.jobs, floorM2: existing ? 0 : offer.floorM2, dormM2: existing ? 0 : offer.dormM2,
    powerKw: offer.powerKw, waterM3Day: offer.waterM3Day,
    accepted: s.date, ...(existing ? { opens: s.date + 1 } : {}),
    posted: 0, staffed: 0, output: 0,
    ...(terms ? { terms } : {}),
  };
  if (!existing) {
    const b = s.blocks.find((x) => x.area === site.area);
    if (!b) throw new Error(`area ${site.area} has no block stock`);
    const era = b.cohorts[0]?.era ?? 0;
    for (const [archetype, m2] of [['standard_factory', f.floorM2], ['dormitory', f.dormM2]] as const) {
      if (m2 <= 0) continue;
      b.cohorts.push({ era, use: USE_OF[archetype], stage: 'under_construction', legality: 'permitted', m2, archetype,
        due: s.date + a.build_months - 1, workDone: 0, workTotal: a.build_months, firm: f.id });
      b.events.push({ date: s.date, kind: 'start', use: USE_OF[archetype], m2, builder: BUILDER_OF[archetype] });
    }
  }
  s.nextFirmId += 1;
  s.firms.push(f);
  return f;
}

export const isOpen = (f: Firm, date: number) => f.opens !== undefined && date >= f.opens;

/**
 * The area's utility share for its open firms: min(1, (capacity + placed supply) ÷ needs), the lower of power and
 * water. The placed supply is what placed sources deliver to the area's zones (§5.11); it never adds to capacity.
 */
export function utilityShare(s: GameState, area: number, supply?: ReadonlyMap<number, { power: number }>): number {
  return utilityShares(s, supply).get(area) ?? 1;
}
/**
 * Every area's utility share for its open firms (R8c, §5.5): power only, from the city pool (`poolShares`). Firms in
 * existing premises have no substation: they draw on their area's local plant, which every area's delivery includes.
 */
export function utilityShares(s: GameState, supply?: ReadonlyMap<number, { power: number }>): Map<number, number> {
  const need = new Map<number, number>();
  for (const f of s.firms) if (isOpen(f, s.date)) need.set(f.area, (need.get(f.area) ?? 0) + f.powerKw);
  return poolShares(s, need, supply);
}

/**
 * The utility share an area's firms would have if every firm sited there were open and one more of `kw` and `m3`
 * opened too: the test an organic firm makes before it builds (b&c §13.3).
 */
export function prospectiveShare(s: GameState, area: number, kw: number, _m3: number,
  supply?: ReadonlyMap<number, { power: number }>): number {
  // R8c: water is not an active constraint (§5.5); `_m3` stays in the signature for its callers
  const need = new Map<number, number>([[area, kw]]);
  for (const f of s.firms) need.set(f.area, (need.get(f.area) ?? 0) + f.powerKw);
  return poolShares(s, need, supply).get(area) ?? 1;
}

/** Hong Kong orders this month (§5.8): an event's surge or slump while it lasts, else 1. */
export const orderFactor = (s: GameState) =>
  s.orders.until !== undefined && s.date <= s.orders.until ? s.orders.factor : 1;

/** Tick step 5, before matching: each open firm posts min(ramp, floor, utilities, orders) jobs (§5.5). */
export function postFirmJobs(s: GameState, p: SliceParams, supply?: ReadonlyMap<number, { power: number }>): void {
  const shares = new Map<number, number>();
  for (const f of s.firms) {
    f.staffed = 0;
    if (!isOpen(f, s.date)) { f.posted = 0; continue; }
    if (!shares.size) for (const [a, v] of utilityShares(s, supply)) shares.set(a, v);
    const monthsOpen = s.date - f.opens! + 1;
    const ramp = Math.floor(f.jobs * Math.min(1, monthsOpen / archetypeParams(p, f.archetype).ramp_months));
    const floor = f.jobs;                                    // an open firm's floor is complete (or existing)
    const utilities = Math.floor(f.jobs * (shares.get(f.area) ?? 1));
    const orders = Math.floor(f.jobs * p.industry.order_index * orderFactor(s));
    f.posted = Math.max(0, Math.min(ramp, floor, utilities, orders));
  }
}

/** The firms' posts in an area and sector, added to that labour row (tick step 5). */
export const firmPosts = (s: GameState, area: number, sector: Firm['sector']) =>
  s.firms.reduce((a, f) => a + (f.area === area && f.sector === sector ? f.posted : 0), 0);

/** After matching: a row's filled jobs are shared between its base jobs and its firms by largest remainder. */
export function staffFirms(s: GameState, rows: readonly JobRow[]): void {
  for (const r of rows) {
    const firms = s.firms.filter((f) => f.area === r.area && f.sector === r.sector && f.posted > 0);
    if (!firms.length) continue;
    // also called after people leave (trimEmployed): the row's filled jobs are shared out again
    const base = r.jobs - firms.reduce((a, f) => a + f.posted, 0);
    const split = largestRemainder(r.filled, [base, ...firms.map((f) => f.posted)]);
    firms.forEach((f, i) => { f.staffed = split[i + 1]!; });
  }
}

/** Tick step 6: each firm's gross output this month (§5.5). Exports and value added follow from the ownership. */
export function production(p: SliceParams) {
  return (ctx: TickContext): void => {
    const I = p.industry;
    for (const f of ctx.state.firms) {
      const factor = f.premises === 'existing' ? I.premises_output_factor : 1;
      f.output = f.staffed * I.by_ownership[f.ownership].output_per_job_month * factor;
    }
  };
}

/** True while a firm is in its tax holiday (§5.7): from opening, for its terms' months. */
export const inTaxHoliday = (f: Firm, date: number) =>
  !!f.terms?.taxHolidayMonths && f.opens !== undefined && date < f.opens + f.terms.taxHolidayMonths;

/** This month's industry totals: output, exports and value added, in nominal yuan. */
export function industryTotals(s: GameState, p: SliceParams) {
  let output = 0, exports = 0, valueAdded = 0, posted = 0, staffed = 0;
  for (const f of s.firms) {
    const o = p.industry.by_ownership[f.ownership];
    output += f.output; exports += f.output * o.export_share; valueAdded += f.output * o.value_added_ratio;
    posted += f.posted; staffed += f.staffed;
  }
  return { output, exports, valueAdded, posted, staffed };
}
