/** Tick step 5: who is here (the Spring Festival), then jobs, matching and wages (phase1-slice.md §5.2; R4 §5.11). */
import { SECTORS, isMigrant, type PopKind, type Sector } from '../enums.js';
import type { SliceParams } from '../params.js';
import { reachClasses } from '../reach.js';
import type { StartNetwork } from '../sites.js';
import type { Firm, GameState, HeldJobs, JobRow, PopGroup } from '../state.js';
import { allocateFreight, areaShare, firmDemands, firmFreight, freightEvents, freightNetwork, type FreightContent } from '../freight.js';
import type { TickContext } from '../step.js';
import { largestRemainder, stochRound } from '../round.js';
import { labourForce, removeNewestFirst, sortHeld, underConstructionM2 } from './common.js';
import { firmPosts, isOpen, postFirmJobs, staffFirms } from './industry.js';
import { placedSupply, servicePosts } from '../growth.js';

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

type Held = Map<string, HeldJobs>;
const hkey = (home: number, kind: PopKind, area: number, sector: Sector) => `${home}|${kind}|${area}|${sector}`;

/** Cut `total` holders off some holdings, by largest remainder over them (layoffs and turnover, §5.11). */
function cutHolders(hs: HeldJobs[], total: number): void {
  const split = largestRemainder(total, hs.map((h) => h.n));
  hs.forEach((h, i) => { h.n -= split[i]!; });
}

/**
 * Incumbents first (§5.11): last month's holders keep their jobs, less layoffs where a row has fewer jobs than
 * holders, and less the month's turnover, who quit to idle. No draw: both are largest-remainder splits.
 */
function keepIncumbents(s: GameState, p: SliceParams, jobs: JobRow[], force: Map<PopGroup, number>): Held {
  const held: Held = new Map();
  const groups = new Set(s.pops.map((g) => `${g.area}|${g.kind}`));
  const rows = new Set(jobs.map((r) => `${r.area}|${r.sector}`));
  for (const h of s.labour.held) {
    if (h.n > 0 && groups.has(`${h.home}|${h.kind}`) && rows.has(`${h.area}|${h.sector}`)) {
      held.set(hkey(h.home, h.kind, h.area, h.sector), { ...h });
    }
  }
  const all = [...held.values()];
  // a group never holds more than its labour force: trimEmployed keeps this as people leave, and this guards the
  // rest (the Spring Festival's non-returners)
  for (const g of s.pops) {
    const mine = all.filter((h) => h.home === g.area && h.kind === g.kind);
    const over = mine.reduce((a, h) => a + h.n, 0) - force.get(g)!;
    if (over > 0) cutHolders(mine, over);
  }
  for (const r of jobs) {
    const hs = all.filter((h) => h.area === r.area && h.sector === r.sector && h.n > 0);
    const n = hs.reduce((a, h) => a + h.n, 0);
    if (n > r.jobs) cutHolders(hs, n - r.jobs);                                       // layoffs
    const movers = hs.filter((h) => isMigrant(h.kind));
    const quit = Math.round(movers.reduce((a, h) => a + h.n, 0) * p.labour.turnover_month);
    if (quit > 0) cutHolders(movers, quit);                                           // turnover, to idle
    r.filled = hs.reduce((a, h) => a + h.n, 0);
  }
  for (const [k, h] of held) if (h.n <= 0) held.delete(k);
  return held;
}

/**
 * The month's vacancies, from idle workers only (§5.11): within the area first, in `fill_order`; then within each
 * reach class, whose idle workers of each kind are shared across its remaining vacancies by largest remainder, so no
 * area is staffed first because of its id.
 */
function match(s: GameState, p: SliceParams, jobs: JobRow[], avail: Map<PopGroup, number>, held: Held,
  classOf: Map<number, number>): void {
  const L = p.labour;
  const playable = s.areas.filter((a) => a.access === 'playable').map((a) => a.id);
  const rowOf = (area: number, sec: Sector) => jobs.find((r) => r.area === area && r.sector === sec);
  const give = (row: JobRow, g: PopGroup, t: number) => {
    if (t <= 0) return;
    avail.set(g, avail.get(g)! - t);
    row.filled += t;
    const k = hkey(g.area, g.kind, row.area, row.sector);
    const h = held.get(k);
    if (h) h.n += t; else held.set(k, { home: g.area, kind: g.kind, area: row.area, sector: row.sector, n: t });
  };
  // pass 1: within the area
  for (const area of playable) for (const sec of SECTORS) {
    const row = rowOf(area, sec);
    if (!row) continue;
    for (const kind of L.fill_order[sec]) for (const g of s.pops) {
      if (g.area === area && g.kind === kind) give(row, g, Math.min(avail.get(g)!, row.jobs - row.filled));
    }
  }
  // pass 2: within each reach class
  for (const c of [...new Set(playable.map((a) => classOf.get(a)!))]) {
    const members = playable.filter((a) => classOf.get(a) === c);
    if (members.length < 2) continue;
    for (const sec of SECTORS) for (const kind of L.fill_order[sec]) {
      const rows = members.map((a) => rowOf(a, sec)).filter((r): r is JobRow => !!r && r.filled < r.jobs);
      const sources = s.pops.filter((g) => g.kind === kind && members.includes(g.area) && avail.get(g)! > 0);
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
}

export function labour(p: SliceParams, network?: StartNetwork, buildable?: { cells: Uint32Array }, fc?: FreightContent) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const L = p.labour;
    springFestival(ctx, p);

    // jobs this month: the start economy, construction work and the firms' posts (§5.5). Construction work is the
    // floor under construction and, from R4 (§5.11), the crew units projects and works orders used this month
    // R8d (§5.12): exports and inputs through the Hong Kong gateways, from the posts before freight
    const freight = fc ? (pre: ReadonlyMap<Firm, number>) => {
      const a = allocateFreight(fc, freightNetwork(s, fc), firmDemands(s, p, fc, pre));
      ctx.events.push(...freightEvents('labour', a));
      return (f: Firm) => firmFreight(f, fc.freight)
        ? Math.min(areaShare(a, f.area, 'out', 'hong_kong'), areaShare(a, f.area, 'in', 'hong_kong')) : 1;
    } : undefined;
    postFirmJobs(s, p, network ? placedSupply(s, { network, ...(buildable ? { buildable } : {}) }, (f) => isOpen(f, s.date)) : undefined, freight);
    const crew = new Map<number, number>();
    for (const e of ctx.events) {
      if (e.step === 'construction' && e.kind === 'crew') {
        const a = e.detail!.area as number;
        crew.set(a, (crew.get(a) ?? 0) + (e.detail!.units as number));
      }
    }
    // service posts from last month's spending (§5.11), with the growth params and the start network
    s.labour.servicePosts = p.growth && network ? servicePosts(s, p) : [];
    const jobs: JobRow[] = s.labour.baseJobs.map((j) => {
      // R10c (§5.13): services firms post in the services row, factories in the factory row
      let n = j.jobs + (j.sector === 'factory' || j.sector === 'services' ? firmPosts(s, j.area, j.sector) : 0);
      if (j.sector === 'services') {
        const sp = s.labour.servicePosts.find((x) => x.area === j.area);
        if (sp) n += sp.formal + sp.informal;
      }
      if (j.sector === 'construction') {
        const b = s.blocks.find((x) => x.area === j.area);
        if (b) n += Math.floor(underConstructionM2(b) * L.construction_jobs_per_m2);
        n += Math.floor((crew.get(j.area) ?? 0) * L.jobs_per_crew_unit);
      }
      return { area: j.area, sector: j.sector, jobs: n, filled: 0 };
    });

    // labour force per group, from usual residents: away workers keep their jobs (§5.2)
    const force = new Map<PopGroup, number>();
    for (const g of s.pops) force.set(g, labourForce(g, p));
    const held = keepIncumbents(s, p, jobs, force);
    const avail = new Map<PopGroup, number>();
    for (const g of s.pops) {
      let n = 0;
      for (const h of held.values()) if (h.home === g.area && h.kind === g.kind) n += h.n;
      avail.set(g, force.get(g)! - n);
    }
    match(s, p, jobs, avail, held, reachClasses(s, network));
    s.labour.jobs = jobs;
    s.labour.held = sortHeld(s, [...held.values()]);
    const groups = new Map(s.pops.map((g) => [`${g.area}|${g.kind}`, g]));
    for (const g of s.pops) for (const sec of SECTORS) g.employed[sec] = 0;
    for (const h of s.labour.held) groups.get(`${h.home}|${h.kind}`)!.employed[h.sector] += h.n;
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
