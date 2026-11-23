/**
 * M3b's firms (phase1-slice.md §5.5, fiscal §8.1): siting a firm, its posts in tick step 5, its staffing, and its
 * production in tick step 6. output = min(orders, staffed, floor, utilities): staffed ≤ posted ≤ each cap.
 */
import { BUILDER_OF, USE_OF, type Ownership } from '../enums.js';
import type { SliceParams } from '../params.js';
import { largestRemainder } from '../round.js';
import type { Firm, FirmTerms, GameState, JobRow } from '../state.js';
import type { TickContext } from '../step.js';

/** What an offer brings, at full ramp: drawn when the offer arrives, so the card and the preview can show it. */
export interface FirmOffer {
  archetype: string; ownership: Ownership;
  jobs: number; floorM2: number; dormM2: number; powerKw: number; waterM3Day: number;
}
export type FirmSite = { premises: 'new_factory'; area: number; zone: number } | { premises: 'existing'; area: number };

const archetypeParams = (p: SliceParams, id: string) => {
  const a = p.investors.archetypes[id];
  if (!a) throw new Error(`params: investors.archetypes has no ${id}`);
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
export function firmTerms(p: SliceParams, archetype: string, shortcut?: string): FirmTerms | undefined {
  const base = archetypeParams(p, archetype).tax_holiday_months ?? 0;
  const t: FirmTerms = {};
  const holiday = base + (shortcut ? p.shortcut.extra_tax_holiday_months : 0);
  if (holiday > 0) t.taxHolidayMonths = holiday;
  if (shortcut) { t.landFeeFactor = p.shortcut.land_fee_factor; t.shortcut = shortcut; }
  return Object.keys(t).length ? t : undefined;
}

/**
 * Create a firm at a site (§5.5). In a new factory it starts its factory and dormitory floor under construction in
 * its area's block, needing build_months of work; work begins this month, and the firm opens when its factory
 * completes (construction.ts). In existing premises it builds nothing and opens the next month. `shortcut` names
 * the leader whose shortcut sited it (§5.7).
 */
export function createFirm(s: GameState, p: SliceParams, offer: FirmOffer, site: FirmSite, shortcut?: string): Firm {
  const a = archetypeParams(p, offer.archetype);
  const existing = site.premises === 'existing';
  const terms = firmTerms(p, offer.archetype, shortcut);
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

/** The area's utility share for its open firms: min(1, capacity ÷ needs), the lower of power and water. */
export function utilityShare(s: GameState, area: number): number {
  const a = s.areas.find((x) => x.id === area);
  let power = 0, water = 0;
  for (const f of s.firms) if (f.area === area && isOpen(f, s.date)) { power += f.powerKw; water += f.waterM3Day; }
  const share = (cap: number, need: number) => (need > 0 ? Math.min(1, Math.max(0, cap) / need) : 1);
  return Math.min(share(a?.utilities.powerCap ?? 0, power), share(a?.utilities.waterCap ?? 0, water));
}

/** Tick step 5, before matching: each open firm posts min(ramp, floor, utilities, orders) jobs (§5.5). */
export function postFirmJobs(s: GameState, p: SliceParams): void {
  const shares = new Map<number, number>();
  for (const f of s.firms) {
    f.staffed = 0;
    if (!isOpen(f, s.date)) { f.posted = 0; continue; }
    if (!shares.has(f.area)) shares.set(f.area, utilityShare(s, f.area));
    const monthsOpen = s.date - f.opens! + 1;
    const ramp = Math.floor(f.jobs * Math.min(1, monthsOpen / archetypeParams(p, f.archetype).ramp_months));
    const floor = f.jobs;                                    // an open firm's floor is complete (or existing)
    const utilities = Math.floor(f.jobs * shares.get(f.area)!);
    const orders = Math.floor(f.jobs * p.industry.order_index);
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
