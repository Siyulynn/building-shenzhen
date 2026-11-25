/** Tick step 13: the month's series (phase1-slice.md §5.2). The three counts are filtered sums (PLAN §3.2). */
import { SECTORS, isMigrant } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { TickContext } from '../step.js';
import type { GameState } from '../state.js';
import { illegalShare, underConstructionM2, villageM2 } from './common.js';
import { industryTotals } from './industry.js';
import { principalOutstanding } from '../fiscal.js';
import { electricityMonthly } from '../power.js';
import { reachClasses } from '../reach.js';
import type { StartNetwork } from '../sites.js';
import { accessibleAreas } from './migration.js';
import type { Gateway } from '../freight.js';

/**
 * Nominal GDP at the state's current month (M4, §5.6): the firms' value added, base jobs and service posts at their
 * rows' fill, and `work` yuan of construction at `gdp.construction_va_ratio`. The series records it each month; R7's
 * briefing and chips read it with no work before the first month is recorded, so Turn 1 shows the starting economy.
 * Before any labour step (no job rows yet), the base jobs count as filled.
 */
export function gdpNow(s: GameState, p: SliceParams, work = 0): number {
  const t = industryTotals(s, p);
  let base = 0;
  // before the first labour step there are no job rows: the start's base jobs are held, as the first month fills them
  const unrun = s.labour.jobs.length === 0;
  for (const j of s.labour.baseJobs) {
    const row = s.labour.jobs.find((r) => r.area === j.area && r.sector === j.sector);
    if (row && row.jobs > 0) base += j.jobs * (row.filled / row.jobs) * p.gdp.base_va_per_job_month[j.sector];
    else if (!row && unrun) base += j.jobs * p.gdp.base_va_per_job_month[j.sector];
  }
  // R4 (§5.11): service posts add value as base jobs do, at the services row's fill
  for (const sp of s.labour.servicePosts) {
    const row = s.labour.jobs.find((r) => r.area === sp.area && r.sector === 'services');
    if (row && row.jobs > 0) base += (sp.formal + sp.informal) * (row.filled / row.jobs) * p.gdp.base_va_per_job_month.services;
  }
  return t.valueAdded + base + work * p.gdp.construction_va_ratio;
}

/** R9.3, R10a (§5.6, §5.13): a month's value added by sector; `construction` is a part of `secondary`, not added to it. */
export interface SectorGdp { primary: number; secondary: number; tertiary: number; construction: number }
/**
 * The month's GDP by sector (§5.13): primary is the base farming economy; secondary is the firms' value added
 * in factories (`firmVa.factory`), the base factory and construction jobs and the month's construction work value
 * added (`workVa`); tertiary is state, services, the service posts and the services firms' value added (R10c). Construction is the base construction jobs plus `workVa`.
 */
export function sectorValueAdded(s: GameState, p: SliceParams, firmVa: FirmVa, workVa: number): SectorGdp {
  const find = (area: number, sector: string) => s.labour.jobs.find((r) => r.area === area && r.sector === sector);
  let primary = 0, secondary = 0, tertiary = 0, construction = 0;
  for (const j of s.labour.baseJobs) {
    const r = find(j.area, j.sector);
    if (!r || r.jobs <= 0) continue;
    const v = j.jobs * (r.filled / r.jobs) * p.gdp.base_va_per_job_month[j.sector];
    if (j.sector === 'farming_fishing') primary += v;
    else if (j.sector === 'factory' || j.sector === 'construction') {
      secondary += v;
      if (j.sector === 'construction') construction += v;
    } else tertiary += v;
  }
  for (const sp of s.labour.servicePosts) {
    const r = find(sp.area, 'services');
    if (!r || r.jobs <= 0) continue;
    tertiary += (sp.formal + sp.informal) * (r.filled / r.jobs) * p.gdp.base_va_per_job_month.services;
  }
  secondary += firmVa.factory + workVa;
  tertiary += firmVa.services;                 // R10c (§5.13): trading firms' value added is tertiary
  construction += workVa;
  return { primary, secondary, tertiary, construction };
}

/** R10c (§5.13): the firms' value added this month, by their sector. */
export interface FirmVa { factory: number; services: number }
export function firmValueAdded(s: GameState, p: SliceParams): FirmVa {
  const out: FirmVa = { factory: 0, services: 0 };
  for (const f of s.firms) out[f.sector ?? 'factory'] += f.output * p.industry.by_ownership[f.ownership].value_added_ratio;
  return out;
}

/** Without params (the M1 pipeline) there are no firms, and the industry series are zero. */
export function statistics(p?: SliceParams, network?: StartNetwork, gateways?: readonly Gateway[]) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const h = s.history;
    const sum = (f: (g: (typeof s.pops)[number]) => number) => s.pops.reduce((a, g) => a + f(g), 0);
    h.months.push(s.date);
    h.registered.push(sum((g) => (g.registration === 'local' ? g.size : 0)));
    h.resident.push(sum((g) => g.stayedSixMonths));
    h.present.push(sum((g) => g.present));
    h.migrants.push(sum((g) => (isMigrant(g.kind) ? g.size : 0)));
    for (const sec of SECTORS) {
      h.jobs[sec].push(s.labour.jobs.reduce((a, r) => a + (r.sector === sec ? r.jobs : 0), 0));
      h.employed[sec].push(s.labour.jobs.reduce((a, r) => a + (r.sector === sec ? r.filled : 0), 0));
    }
    const beds = s.housing.reduce((a, m) => a + m.beds.rental, 0);
    const occupants = s.housing.reduce((a, m) => a + m.occupants.rental, 0);
    h.rentalBeds.push(beds);
    h.crowding.push(occupants / Math.max(1, beds));
    h.rent.push(beds > 0 ? s.housing.reduce((a, m) => a + m.rent * m.beds.rental, 0) / beds : 0);
    h.underConstructionM2.push(s.blocks.reduce((a, b) => a + underConstructionM2(b), 0));
    const vAll = s.blocks.reduce((a, b) => a + villageM2(b, ['completed']), 0);
    h.illegalShare.push(vAll > 0 ? s.blocks.reduce((a, b) => a + illegalShare(b) * villageM2(b, ['completed']), 0) / vAll : 0);
    let inflow = 0, outflow = 0;
    for (const e of ctx.events) if (e.kind === 'flow') { inflow += e.detail!.inflow as number; outflow += e.detail!.outflow as number; }
    h.inflow.push(inflow);
    h.outflow.push(outflow);
    const t = p ? industryTotals(s, p) : { output: 0, exports: 0, valueAdded: 0, posted: 0, staffed: 0 };
    h.firmJobs.push(t.posted);
    h.firmStaffed.push(t.staffed);
    h.output.push(t.output);
    h.exports.push(t.exports);
    h.valueAdded.push(t.valueAdded);
    h.electricity.push(p ? electricityMonthly(s, p) : 0);

    // M4 (§5.6): nominal GDP, and the finance step's month
    let work = 0, spend = 0;
    let fin: Record<string, number> | undefined;
    for (const e of ctx.events) {
      if (e.kind === 'work') work += e.detail!.value as number;
      else if (e.kind === 'project_paid') spend += e.detail!.amount as number;
      else if (e.step === 'finance' && e.kind === 'month') fin = e.detail as Record<string, number>;
    }
    h.gdp.push(p ? gdpNow(s, p, work) : 0);
    // R10a (§5.13): the month's value added by sector, with the month's construction work
    const sec = p ? sectorValueAdded(s, p, firmValueAdded(s, p), work * p.gdp.construction_va_ratio)
      : { primary: 0, secondary: 0, tertiary: 0, construction: 0 };
    for (const k of ['primary', 'secondary', 'tertiary', 'construction'] as const) h.gdpSector[k].push(sec[k]);
    h.revenue.push(fin?.revenue ?? 0);
    h.obligationsDue.push(fin?.due ?? 0);
    h.baselineDue.push(fin?.baseline ?? 0);
    h.obligationsPaid.push(fin?.paid ?? 0);
    h.austerity.push(fin?.austerity ?? 0);
    h.projectSpend.push(spend);
    h.reserve.push(s.fiscal.balances.general);
    h.debtOutstanding.push(s.fiscal.loans.reduce((a, l) => a + principalOutstanding(l, s.date + 1), 0));

    // R4 (§5.11): accessible vacancies, the turned away, service posts and the crews' construction posts
    const open = accessibleAreas(s, reachClasses(s, network));
    h.vacancies.push(s.labour.jobs.reduce((a, r) => a + (open.has(r.area) ? Math.max(0, r.jobs - r.filled) : 0), 0));
    h.turnedAway.push(s.housing.reduce((a, m) => a + m.turnedAway, 0));
    h.servicePosts.push(s.labour.servicePosts.reduce((a, x) => a + x.formal + x.informal, 0));
    const crew = new Map<number, number>();
    for (const e of ctx.events) if (e.step === 'construction' && e.kind === 'crew') {
      crew.set(e.detail!.area as number, (crew.get(e.detail!.area as number) ?? 0) + (e.detail!.units as number));
    }
    h.constructionPosts.push(p ? [...crew.values()].reduce((a, u) => a + Math.floor(u * p.labour.jobs_per_crew_unit), 0) : 0);
    // R8d (§5.12): unmet freight tonnes by gateway and direction, from the month's freight events
    if (gateways?.length) {
      const fu = h.freightUnmet ?? (h.freightUnmet = {});
      const unmet = new Map<string, number>();
      for (const e of ctx.events) if (e.kind === 'freight') {
        const k = `${e.detail!.gateway as string}:${e.detail!.dir as string}`;
        unmet.set(k, (unmet.get(k) ?? 0) + (e.detail!.demand as number) - (e.detail!.flow as number));
      }
      for (const g of gateways) for (const d of ['in', 'out']) {
        const k = `${g.id}:${d}`, row = fu[k] ?? (fu[k] = h.months.slice(0, -1).map(() => 0));
        row.push(Math.round(unmet.get(k) ?? 0));
      }
    }
  };
}
