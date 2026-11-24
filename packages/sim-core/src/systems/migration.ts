/** Tick step 8: migrant outflow, the six-month queue and inflow (phase1-slice.md §5.2; R4 §5.11). The Spring Festival is in step 5. */
import { MIGRANT_KINDS, isMigrant, type MigrantKind } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { GameState, PopGroup, Queue6 } from '../state.js';
import type { TickContext } from '../step.js';
import { largestRemainder, stochRound } from '../round.js';
import { groupFor, leave } from './common.js';
import { reachClasses } from '../reach.js';
import type { StartNetwork } from '../sites.js';
import { unemploymentRate } from './labour.js';

type Flow = { inflow: number; outflow: number };

/** Vacancies by area in some sectors, after this month's matching and outflow. */
function vacanciesBy(s: GameState, sectors: readonly string[], areas: number[]): number[] {
  return areas.map((a) => s.labour.jobs.filter((r) => r.area === a && sectors.includes(r.sector))
    .reduce((x, r) => x + Math.max(0, r.jobs - r.filled), 0));
}

/**
 * The playable areas whose vacancies a migrant can take (§5.11): those in a reach class with an area that has rental
 * beds, where a migrant could live.
 */
export function accessibleAreas(s: GameState, classOf: ReadonlyMap<number, number>): Set<number> {
  const bedded = new Set<number>();
  for (const m of s.housing) if (m.beds.rental > 0 && classOf.has(m.area)) bedded.add(classOf.get(m.area)!);
  return new Set([...classOf].filter(([, c]) => bedded.has(c)).map(([a]) => a));
}

export function migration(p: SliceParams, network?: StartNetwork) {
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
      flow(g).outflow += leave(s, g, stochRound(g.size * rate, ctx.rng), p);
    }

    // 2. ageing: the oldest under-six cohort becomes resident
    for (const g of s.pops) {
      g.stayedSixMonths += g.underSix[5];
      g.underSix = [0, g.underSix[0], g.underSix[1], g.underSix[2], g.underSix[3], g.underSix[4]] as Queue6;
    }

    // 3. inflow per migrant kind, slice-wide, then split across playable areas
    for (const m of s.housing) m.turnedAway = 0;                 // this month's count (§5.11)
    const classOf = reachClasses(s, network);
    const open = accessibleAreas(s, classOf);
    const playable = s.areas.filter((a) => a.access === 'playable').map((a) => a.id);
    const areas = playable.filter((a) => s.housing.some((m) => m.area === a));
    // free rental beds under the cap, after this month's outflow
    const free = areas.map((a) => {
      const m = s.housing.find((x) => x.area === a)!;
      const occupants = s.pops.reduce((x, g) => x + (g.area === a && isMigrant(g.kind) ? g.size : 0), 0);
      return Math.max(0, Math.floor(p.housing.crowding_max * m.beds.rental) - occupants);
    });
    for (const k of MIGRANT_KINDS) {
      const sector = M.sector[k];
      // accessible vacancies in the sectors that pull this kind
      const vacAll = vacanciesBy(s, M.pull_sectors[k], playable).map((v, i) => (open.has(playable[i]!) ? v : 0));
      const V = vacAll.reduce((a, b) => a + b, 0);
      const wage = s.labour.wage[sector];
      const gap = Math.max(0, (wage - M.inland_wage) / M.inland_wage);
      const pull = V / (V + M.K_vac);
      const lagged = s.migration.stockLag[k][0] ?? 0;
      const network = 1 + M.network_alpha * Math.log1p(lagged / M.K_net);
      const total = stochRound(M.base[k] * gap * pull * network * M.permit_factor[s.policy.permitRegime], ctx.rng);
      // an area's weight: its own pull vacancies, its free beds, and its share (by free beds) of the accessible
      // vacancies in its reach class's areas that have no free bed
      const vac = areas.map((a) => vacAll[playable.indexOf(a)]!);
      const orphan = areas.map(() => 0);
      for (const c of [...new Set(playable.map((a) => classOf.get(a)!))]) {
        const bedless = playable.filter((a) => classOf.get(a) === c && !(free[areas.indexOf(a)]! > 0));
        const n = bedless.reduce((x, a) => x + vacAll[playable.indexOf(a)]!, 0);
        const hosts = areas.map((a, i) => (classOf.get(a) === c && free[i]! > 0 ? free[i]! : 0));
        largestRemainder(n, hosts).forEach((x, i) => { orphan[i]! += x; });
      }
      // water-filling: an area's overflow above its free beds goes again to the areas that still have beds
      const placed = areas.map(() => 0);
      let left = total;
      while (left > 0) {
        const w = areas.map((_, i) => (free[i]! > 0 ? vac[i]! + free[i]! + orphan[i]! : 0));
        if (w.every((x) => x === 0)) break;
        const alloc = largestRemainder(left, w);
        let moved = 0;
        areas.forEach((_, i) => {
          const n = Math.min(alloc[i]!, free[i]!);
          placed[i]! += n; free[i]! -= n; moved += n;
        });
        left -= moved;
        if (moved === 0) break;
      }
      areas.forEach((a, i) => {
        const n = placed[i]!;
        if (n <= 0) return;
        const g = groupFor(s, a, k);
        g.underSix[0] += n; g.size += n; g.present += n;
        flow(g).inflow += n;
      });
      // whoever finds no bed is turned away (§5.11): recorded where the vacancies are, for rents and building next
      // month, but not a person; with no accessible vacancy in an area with a market, they go uncounted
      if (left > 0) {
        largestRemainder(left, vac).forEach((n, i) => {
          if (n <= 0) return;
          s.housing.find((m) => m.area === areas[i])!.turnedAway += n;
          ctx.events.push({ step: 'migration', kind: 'turned_away', detail: { area: areas[i]!, pop: k, n } });
        });
      }
    }

    // 4. the market's occupants and crowding at the end of the month (rent stays as step 7 set it)
    for (const m of s.housing) {
      m.occupants.rental = s.pops.reduce((x, g) => x + (g.area === m.area && isMigrant(g.kind) ? g.size : 0), 0);
      m.crowding = m.occupants.rental / Math.max(1, m.beds.rental);
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
