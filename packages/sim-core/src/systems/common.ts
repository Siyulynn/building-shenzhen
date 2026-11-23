/** Helpers shared by the M2 systems (phase1-slice.md §5.2). */
import { ARCHETYPES, POOL, POP_KINDS, VILLAGE_ARCHETYPES, type HousingArchetype, type PopKind } from '../enums.js';
import type { SliceParams } from '../params.js';
import { REGISTRATION } from '../enums.js';
import type { BlockStock, GameState, PopGroup, Queue6, Stage } from '../state.js';

export function m2ByArchetype(b: BlockStock, stages: readonly Stage[]): Record<HousingArchetype, number> {
  const out = Object.fromEntries(ARCHETYPES.map((a) => [a, 0])) as Record<HousingArchetype, number>;
  for (const c of b.cohorts) if (stages.includes(c.stage)) out[c.archetype] += c.m2;
  return out;
}

/** Beds by pool from completed floor (buildings §7): per archetype, floor(m² ÷ m² per bed). */
export function bedsByPool(b: BlockStock, p: SliceParams): { local: number; rental: number } {
  const m2 = m2ByArchetype(b, ['completed']);
  const beds = { local: 0, rental: 0 };
  for (const a of ARCHETYPES) beds[POOL[a]] += Math.floor(m2[a] / p.housing.m2_per_bed[a]);
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

/** n usual residents leave, newest first, and `present` falls in proportion. Returns how many left. */
export function leave(g: PopGroup, n: number): number {
  const before = g.size;
  const out = removeNewestFirst(g, n);
  if (out > 0) g.present = Math.max(0, Math.min(g.size, g.present - Math.round((out * g.present) / before)));
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
