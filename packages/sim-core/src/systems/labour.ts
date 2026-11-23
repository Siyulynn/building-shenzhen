/** Tick step 5, M2: who is here (the Spring Festival), then jobs, matching and wages (phase1-slice.md §5.2). */
import { SECTORS, isMigrant, type Sector } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { GameState, JobRow, PopGroup } from '../state.js';
import type { TickContext } from '../step.js';
import { largestRemainder, stochRound } from '../round.js';
import { labourForce, removeNewestFirst, underConstructionM2 } from './common.js';
import { firmPosts, postFirmJobs, staffFirms } from './industry.js';

export { labourForce };

/** A group's unemployment rate, from the same labour force the matching used. */
export function unemploymentRate(g: PopGroup, p: SliceParams): number {
  const lf = labourForce(g, p);
  if (lf <= 0) return 0;
  const emp = SECTORS.reduce((a, sec: Sector) => a + g.employed[sec], 0);
  return Math.max(0, Math.min(1, 1 - emp / lf));
}

/**
 * The Spring Festival, before matching: migrants leave in the first away month and come back in the first month
 * after; some do not come back, the jobless most (last month's matching). Usual residence does not change while away.
 */
function springFestival(ctx: TickContext, p: SliceParams): void {
  const s = ctx.state;
  const S = p.migration.spring;
  const cur = s.date % 12, prev = (s.date + 11) % 12;
  const nowAway = S.away_months.includes(cur), wasAway = S.away_months.includes(prev);
  for (const g of s.pops) {
    if (!isMigrant(g.kind) || g.size === 0) { g.present = g.size; continue; }
    if (nowAway && !wasAway) {
      g.present = g.size - Math.min(g.size, stochRound(g.size * S.away_share, ctx.rng));
    } else if (nowAway) {
      g.present = Math.min(g.present, g.size);
    } else if (wasAway) {
      const gone = g.size - g.present;
      const share = Math.min(1, S.nonreturn + S.nonreturn_unemployment * unemploymentRate(g, p));
      const n = removeNewestFirst(g, Math.min(gone, stochRound(gone * share, ctx.rng)));
      g.present = g.size;
      if (n > 0) ctx.events.push({ step: 'labour', kind: 'flow', detail: { area: g.area, pop: g.kind, inflow: 0, outflow: n, reason: 'spring_nonreturn' } });
    } else {
      g.present = g.size;
    }
  }
}

function match(s: GameState, p: SliceParams, jobs: JobRow[], avail: Map<PopGroup, number>): void {
  const L = p.labour;
  const playable = s.areas.filter((a) => a.access === 'playable').map((a) => a.id);
  const rowOf = (area: number, sec: Sector) => jobs.find((r) => r.area === area && r.sector === sec);
  const give = (row: JobRow, g: PopGroup, t: number) => {
    if (t <= 0) return;
    avail.set(g, avail.get(g)! - t);
    row.filled += t;
    g.employed[row.sector] += t;
  };
  // pass 1: within the area
  for (const area of playable) for (const sec of SECTORS) {
    const row = rowOf(area, sec);
    if (!row) continue;
    for (const kind of L.fill_order[sec]) for (const g of s.pops) {
      if (g.area === area && g.kind === kind) give(row, g, Math.min(avail.get(g)!, row.jobs - row.filled));
    }
  }
  // pass 2: the slice's idle workers of each kind are shared across the remaining vacancies by largest remainder,
  // so no area is staffed first because of its id
  for (const sec of SECTORS) for (const kind of L.fill_order[sec]) {
    const rows = playable.map((a) => rowOf(a, sec)).filter((r): r is JobRow => !!r && r.filled < r.jobs);
    const sources = s.pops.filter((g) => g.kind === kind && avail.get(g)! > 0);
    const vac = rows.map((r) => r.jobs - r.filled);
    const idle = sources.map((g) => avail.get(g)!);
    const take = Math.min(vac.reduce((a, b) => a + b, 0), idle.reduce((a, b) => a + b, 0));
    if (take <= 0) continue;
    const toRow = largestRemainder(take, vac);
    const fromGroup = largestRemainder(take, idle);
    // pair them in state order; pass 1 left no idle worker of this kind in an area with a vacancy it could fill
    let gi = 0;
    rows.forEach((r, ri) => {
      let need = toRow[ri]!;
      while (need > 0 && gi < sources.length) {
        const t = Math.min(need, fromGroup[gi]!);
        give(r, sources[gi]!, t);
        fromGroup[gi]! -= t; need -= t;
        if (fromGroup[gi] === 0) gi++;
      }
    });
  }
}

export function labour(p: SliceParams) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const L = p.labour;
    springFestival(ctx, p);

    // jobs this month: the start economy, construction work and the firms' posts (§5.5)
    postFirmJobs(s, p);
    const jobs: JobRow[] = s.labour.baseJobs.map((j) => {
      let n = j.jobs + (j.sector === 'factory' ? firmPosts(s, j.area, j.sector) : 0);
      if (j.sector === 'construction') {
        const b = s.blocks.find((x) => x.area === j.area);
        if (b) n += Math.floor(underConstructionM2(b) * L.construction_jobs_per_m2);
      }
      return { area: j.area, sector: j.sector, jobs: n, filled: 0 };
    });

    // labour force per group, from usual residents: away workers keep their jobs (§5.2)
    const avail = new Map<PopGroup, number>();
    const force = new Map<PopGroup, number>();
    for (const g of s.pops) {
      const lf = labourForce(g, p);
      avail.set(g, lf); force.set(g, lf);
      for (const sec of SECTORS) g.employed[sec] = 0;
    }
    match(s, p, jobs, avail);
    s.labour.jobs = jobs;
    staffFirms(s, jobs);

    // wages move toward clearing, never below the floor
    for (const sec of SECTORS) {
      let nJobs = 0, nFilled = 0, lf = 0, idle = 0;
      for (const r of jobs) if (r.sector === sec) { nJobs += r.jobs; nFilled += r.filled; }
      for (const g of s.pops) if (L.fill_order[sec].includes(g.kind)) { lf += force.get(g)!; idle += avail.get(g)!; }
      const vacancyRate = nJobs > 0 ? (nJobs - nFilled) / nJobs : 0;
      const unemploymentRate = lf > 0 ? idle / lf : 0;
      const w = s.labour.wage[sec];
      s.labour.wage[sec] = Math.max(L.wage_floor[sec], w + L.wage_speed * w * (vacancyRate - unemploymentRate));
    }
    for (const g of s.pops) {
      const n = SECTORS.reduce((a, sec) => a + g.employed[sec], 0);
      g.wage = n > 0 ? SECTORS.reduce((a, sec) => a + g.employed[sec] * s.labour.wage[sec], 0) / n : 0;
    }
  };
}
