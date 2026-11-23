/** Helpers shared by the M2 systems (phase1-slice.md §5.2). */
import {
  BUILDING_ARCHETYPES, HOUSING_ARCHETYPES, POOL, POP_KINDS, SECTORS, VILLAGE_ARCHETYPES, type BuildingArchetype, type PopKind,
} from '../enums.js';
import { largestRemainder } from '../round.js';
import { staffFirms } from './industry.js';
import type { SliceParams } from '../params.js';
import { REGISTRATION } from '../enums.js';
import type { BlockStock, GameState, PopGroup, Queue6, Stage } from '../state.js';

export function m2ByArchetype(b: BlockStock, stages: readonly Stage[]): Record<BuildingArchetype, number> {
  const out = Object.fromEntries(BUILDING_ARCHETYPES.map((a) => [a, 0])) as Record<BuildingArchetype, number>;
  for (const c of b.cohorts) if (stages.includes(c.stage)) out[c.archetype] += c.m2;
  return out;
}

/** Beds by pool from completed floor (buildings §7): per archetype, floor(m² ÷ m² per bed). */
export function bedsByPool(b: BlockStock, p: SliceParams): { local: number; rental: number } {
  const m2 = m2ByArchetype(b, ['completed']);
  const beds = { local: 0, rental: 0 };
  for (const a of HOUSING_ARCHETYPES) beds[POOL[a]] += Math.floor(m2[a] / p.housing.m2_per_bed[a]);
  return beds;
}

export function villageM2(b: BlockStock, stages: readonly Stage[]): number {
  const m2 = m2ByArchetype(b, stages);
  return VILLAGE_ARCHETYPES.reduce((s, a) => s + m2[a], 0);
}

/** Illegal share of completed village floor (buildings §5); 0 when there is none. */
export function illegalShare(b: BlockStock): number {
  let all = 0, illegal = 0;
  for (const c of b.cohorts) {
    if (c.stage !== 'completed' || !VILLAGE_ARCHETYPES.includes(c.archetype)) continue;
    all += c.m2;
    if (c.legality !== 'permitted') illegal += c.m2;
  }
  return all > 0 ? illegal / all : 0;
}

export const underConstructionM2 = (b: BlockStock) =>
  b.cohorts.reduce((s, c) => s + (c.stage === 'under_construction' ? c.m2 : 0), 0);

export const groupsIn = (s: GameState, area: number) => s.pops.filter((g) => g.area === area);

/** The group for (area, kind), created empty in (area order, kind order) position if missing. */
export function groupFor(s: GameState, area: number, kind: PopKind): PopGroup {
  const found = s.pops.find((g) => g.area === area && g.kind === kind);
  if (found) return found;
  const areaIdx = (a: number) => s.areas.findIndex((x) => x.id === a);
  const key = (g: { area: number; kind: PopKind }) => areaIdx(g.area) * 10 + POP_KINDS.indexOf(g.kind);
  const g: PopGroup = { area, kind, registration: REGISTRATION[kind], size: 0, stayedSixMonths: 0,
    underSix: [0, 0, 0, 0, 0, 0] as Queue6, present: 0,
    employed: { state: 0, farming_fishing: 0, factory: 0, construction: 0, services: 0 }, wage: 0, savings: 0, mood: 0.5 };
  const at = s.pops.findIndex((x) => key(x) > key(g));
  if (at < 0) s.pops.push(g); else s.pops.splice(at, 0, g);
  return g;
}

/** A group's labour force: a stock, so rounded to the nearest person with no draw (§5.2). */
export const labourForce = (g: PopGroup, p: SliceParams): number => Math.round(g.size * p.labour.participation[g.kind]);

/**
 * Keep employment whole after people leave (§5.2): the unemployed left first, so trim only what exceeds the labour
 * force, by largest remainder over sectors, and take the same workers out of the job rows (home area first).
 */
export function trimEmployed(s: GameState, g: PopGroup, p: SliceParams): void {
  const excess = SECTORS.reduce((a, sec) => a + g.employed[sec], 0) - labourForce(g, p);
  if (excess <= 0) return;
  const cut = largestRemainder(excess, SECTORS.map((sec) => g.employed[sec]));
  SECTORS.forEach((sec, i) => {
    let left = cut[i]!;
    if (left <= 0) return;
    g.employed[sec] -= left;
    const rows = s.labour.jobs.filter((r) => r.sector === sec);
    for (const r of [...rows.filter((r) => r.area === g.area), ...rows.filter((r) => r.area !== g.area)]) {
      const t = Math.min(left, r.filled);
      r.filled -= t; left -= t;
      if (t > 0) staffFirms(s, [r]);          // the firms' share of the row shrinks with it (§5.5)
      if (left <= 0) break;
    }
  });
}

/** n usual residents leave, newest first; `present` falls in proportion and employment stays whole. */
export function leave(s: GameState, g: PopGroup, n: number, p: SliceParams): number {
  const before = g.size;
  const out = removeNewestFirst(g, n);
  if (out > 0) {
    g.present = Math.max(0, Math.min(g.size, g.present - Math.round((out * g.present) / before)));
    trimEmployed(s, g, p);
  }
  return out;
}

/** Remove n people, newest arrivals first, then the six-month stayers. Returns how many were removed. */
export function removeNewestFirst(g: PopGroup, n: number): number {
  let left = Math.min(n, g.size);
  const removed = left;
  for (let k = 0; k < 6 && left > 0; k++) {
    const t = Math.min(left, g.underSix[k]!);
    g.underSix[k] = g.underSix[k]! - t; left -= t;
  }
  const t = Math.min(left, g.stayedSixMonths);
  g.stayedSixMonths -= t; left -= t;
  g.size -= removed;
  return removed;
}
