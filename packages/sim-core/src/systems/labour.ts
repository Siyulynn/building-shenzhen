/** Tick step 5, M2: jobs, matching and wages (phase1-slice.md §5.2). */
import { SECTORS, type Sector } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { JobRow, PopGroup } from '../state.js';
import type { TickContext } from '../step.js';
import { underConstructionM2 } from './common.js';

export function labour(p: SliceParams) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const L = p.labour;

    // jobs this month: the start economy plus construction work (M3 adds industry)
    const jobs: JobRow[] = s.labour.baseJobs.map((j) => {
      let n = j.jobs;
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
    const take = (row: JobRow, g: PopGroup) => {
      const t = Math.min(avail.get(g)!, row.jobs - row.filled);
      if (t <= 0) return;
      avail.set(g, avail.get(g)! - t);
      row.filled += t;
      g.employed[row.sector] += t;
    };
    const playable = s.areas.filter((a) => a.access === 'playable').map((a) => a.id);
    // pass 1: within the area
    for (const area of playable) for (const sec of SECTORS) {
      const row = jobs.find((r) => r.area === area && r.sector === sec);
      if (!row) continue;
      for (const kind of L.fill_order[sec]) for (const g of s.pops) if (g.area === area && g.kind === kind) take(row, g);
    }
    // pass 2: leftover vacancies take unemployed workers from the other playable areas
    for (const area of playable) for (const sec of SECTORS) {
      const row = jobs.find((r) => r.area === area && r.sector === sec);
      if (!row || row.filled >= row.jobs) continue;
      for (const kind of L.fill_order[sec]) for (const g of s.pops) if (g.area !== area && g.kind === kind) take(row, g);
    }
    s.labour.jobs = jobs;

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

/** A group's labour force: a stock, so rounded to the nearest person with no draw (§5.2). */
export const labourForce = (g: PopGroup, p: SliceParams): number => Math.round(g.size * p.labour.participation[g.kind]);

/** A group's unemployment rate, from the same labour force the matching used. */
export function unemploymentRate(g: PopGroup, p: SliceParams): number {
  const lf = labourForce(g, p);
  if (lf <= 0) return 0;
  const emp = SECTORS.reduce((a, sec: Sector) => a + g.employed[sec], 0);
  return Math.max(0, Math.min(1, 1 - emp / lf));
}
