/** Tick step 13: the month's series (phase1-slice.md §5.2). The three counts are filtered sums (PLAN §3.2). */
import { SECTORS, isMigrant } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { TickContext } from '../step.js';
import { illegalShare, underConstructionM2, villageM2 } from './common.js';
import { industryTotals } from './industry.js';
import { principalOutstanding } from '../fiscal.js';
import { reachClasses } from '../reach.js';
import type { StartNetwork } from '../sites.js';
import { accessibleAreas } from './migration.js';

/** Without params (the M1 pipeline) there are no firms, and the industry series are zero. */
export function statistics(p?: SliceParams, network?: StartNetwork) {
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

    // M4 (§5.6): nominal GDP, and the finance step's month
    let work = 0, spend = 0;
    let fin: Record<string, number> | undefined;
    for (const e of ctx.events) {
      if (e.kind === 'work') work += e.detail!.value as number;
      else if (e.kind === 'project_paid') spend += e.detail!.amount as number;
      else if (e.step === 'finance' && e.kind === 'month') fin = e.detail as Record<string, number>;
    }
    let base = 0;
    if (p) for (const j of s.labour.baseJobs) {
      const row = s.labour.jobs.find((r) => r.area === j.area && r.sector === j.sector);
      if (row && row.jobs > 0) base += j.jobs * (row.filled / row.jobs) * p.gdp.base_va_per_job_month[j.sector];
    }
    // R4 (§5.11): service posts add value as base jobs do, at the services row's fill
    if (p) for (const sp of s.labour.servicePosts) {
      const row = s.labour.jobs.find((r) => r.area === sp.area && r.sector === 'services');
      if (row && row.jobs > 0) base += (sp.formal + sp.informal) * (row.filled / row.jobs) * p.gdp.base_va_per_job_month.services;
    }
    h.gdp.push(p ? t.valueAdded + base + work * p.gdp.construction_va_ratio : 0);
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
  };
}
