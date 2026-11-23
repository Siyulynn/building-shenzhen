/** Tick step 8, M2: migrant inflow, outflow, the six-month queue and the Spring Festival (phase1-slice.md §5.2). */
import { MIGRANT_KINDS, isMigrant, type MigrantKind } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { GameState, PopGroup, Queue6 } from '../state.js';
import type { TickContext } from '../step.js';
import { largestRemainder, stochRound } from '../round.js';
import { groupFor, leave, removeNewestFirst } from './common.js';
import { unemploymentRate } from './labour.js';

type Flow = { inflow: number; outflow: number };

function vacanciesBy(s: GameState, sector: string, areas: number[]): number[] {
  return areas.map((a) => s.labour.jobs.filter((r) => r.area === a && r.sector === sector)
    .reduce((x, r) => x + Math.max(0, r.jobs - r.filled), 0));
}

export function migration(p: SliceParams) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const M = p.migration;
    const flows = new Map<PopGroup, Flow>();
    const flow = (g: PopGroup) => { let f = flows.get(g); if (!f) flows.set(g, f = { inflow: 0, outflow: 0 }); return f; };

    // 1. outflow from the migrants already here (newest first)
    for (const g of s.pops) {
      if (!isMigrant(g.kind) || g.size === 0) continue;
      const crowd = s.housing.find((m) => m.area === g.area)?.crowding ?? 0;
      const rate = M.base_exit + M.unemployment_push * unemploymentRate(g, p) + M.housing_push * Math.max(0, crowd - 1);
      flow(g).outflow += leave(g, stochRound(g.size * rate, ctx.rng));
    }

    // 2. ageing: the oldest under-six cohort becomes resident
    for (const g of s.pops) {
      g.stayedSixMonths += g.underSix[5];
      g.underSix = [0, g.underSix[0], g.underSix[1], g.underSix[2], g.underSix[3], g.underSix[4]] as Queue6;
    }

    // 3. inflow per migrant kind, slice-wide, then split across playable areas
    const areas = s.areas.filter((a) => a.access === 'playable' && s.housing.some((m) => m.area === a.id)).map((a) => a.id);
    // free rental beds under the cap, after this month's outflow
    const free = areas.map((a) => {
      const m = s.housing.find((x) => x.area === a)!;
      const occupants = s.pops.reduce((x, g) => x + (g.area === a && isMigrant(g.kind) ? g.size : 0), 0);
      return Math.max(0, Math.floor(p.housing.crowding_max * m.beds.rental) - occupants);
    });
    for (const k of MIGRANT_KINDS) {
      const sector = M.sector[k];
      const vac = vacanciesBy(s, sector, areas);
      const V = vac.reduce((a, b) => a + b, 0);
      const wage = s.labour.wage[sector];
      const gap = Math.max(0, (wage - M.inland_wage) / M.inland_wage);
      const pull = V / (V + M.K_vac);
      const lagged = s.migration.stockLag[k][0] ?? 0;
      const network = 1 + M.network_alpha * Math.log1p(lagged / M.K_net);
      const total = stochRound(M.base[k] * gap * pull * network * M.permit_factor[s.policy.permitRegime], ctx.rng);
      const alloc = largestRemainder(total, areas.map((_, i) => vac[i]! + free[i]!));
      areas.forEach((a, i) => {
        const n = Math.min(alloc[i]!, free[i]!);           // no bed under the cap: they do not come (lost, not stored)
        if (n <= 0) return;
        free[i]! -= n;
        const g = groupFor(s, a, k);
        g.underSix[0] += n; g.size += n; g.present += n;
        flow(g).inflow += n;
      });
    }

    // 4. the Spring Festival: away in away_months; on return, some do not come back
    const away = M.spring.away_months;
    const cur = s.date % 12, next = (s.date + 1) % 12;
    for (const g of s.pops) {
      if (!isMigrant(g.kind)) { g.present = g.size; continue; }
      const nowAway = away.includes(cur), nextAway = away.includes(next);
      if (nextAway && !nowAway) {
        g.present = g.size - Math.min(g.size, stochRound(g.size * M.spring.away_share, ctx.rng));
      } else if (nextAway && nowAway) {
        g.present = Math.min(g.present, g.size);
      } else if (!nextAway && nowAway) {
        const gone = g.size - g.present;
        const share = M.spring.nonreturn + M.spring.nonreturn_unemployment * unemploymentRate(g, p);
        const nonreturn = Math.min(gone, stochRound(gone * Math.min(1, share), ctx.rng));
        flow(g).outflow += removeNewestFirst(g, nonreturn);
        g.present = g.size;
      } else {
        g.present = g.size;
      }
    }

    // 5. the network's lagged stock, and the month's flows as events
    for (const k of MIGRANT_KINDS) {
      const stock = s.pops.filter((g) => g.kind === k).reduce((a, g) => a + g.size, 0);
      s.migration.stockLag[k as MigrantKind] = [...s.migration.stockLag[k].slice(1), stock];
    }
    for (const g of s.pops) {
      const f = flows.get(g);
      if (f && (f.inflow || f.outflow)) {
        ctx.events.push({ step: 'migration', kind: 'flow', detail: { area: g.area, pop: g.kind, inflow: f.inflow, outflow: f.outflow } });
      }
    }
  };
}
