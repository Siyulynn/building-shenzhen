/**
 * Readiness (phase1-slice.md §5.7, §7.1): one bar of three parts, roads and access, serviced land, and water and
 * power, over the readiness cells (the buildable cells of params.readiness.areas). Pure: no state change, no RNG.
 */
import type { SliceParams } from './params.js';
import type { GameState } from './state.js';
import { cellsOfRuns } from './zones.js';

export const READINESS_PARTS = ['roads', 'servicedLand', 'waterPower'] as const;
export type ReadinessPart = (typeof READINESS_PARTS)[number];
export interface Readiness {
  roads: number; servicedLand: number; waterPower: number;   // each 0..1
  bar: number;                                               // their weighted mean
  weakest: ReadinessPart;                                    // the lowest (ties in part order)
  cells: number;                                             // the readiness cells
}

const CELLS_PER_KM = 10;                                     // a 100 m grid (§3)

/** How many of a sorted cell list are in a sorted buildable layer (all of them without one). */
function countBuildable(cells: Uint32Array, buildable?: { cells: Uint32Array }): number {
  if (!buildable) return cells.length;
  const b = buildable.cells;
  let i = 0, j = 0, n = 0;
  while (i < cells.length && j < b.length) {
    if (cells[i] === b[j]) { n++; i++; j++; } else if (cells[i]! < b[j]!) i++; else j++;
  }
  return n;
}
const inSorted = (sorted: Uint32Array, v: number) => {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, x = sorted[m]!; if (x === v) return true; if (x < v) lo = m + 1; else hi = m - 1; }
  return false;
};

/** The readiness bar now (§5.7). */
export function readiness(s: GameState, p: SliceParams, buildable?: { cells: Uint32Array }): Readiness {
  const R = p.readiness;
  const areas = s.areas.filter((a) => a.access === 'playable' && R.areas.includes(a.id));
  const reachPerKm = (2 * R.road_reach_cells + 1) * CELLS_PER_KM;
  let cells = 0, reached = 0, freePower = 0, freeWater = 0;
  for (const a of areas) {
    const n = countBuildable(a.cells, buildable);
    cells += n;
    reached += Math.min(n, a.roadKm * reachPerKm);
    let pw = 0, w = 0;
    for (const f of s.firms) if (f.area === a.id) { pw += f.powerKw; w += f.waterM3Day; }
    freePower += Math.max(0, a.utilities.powerCap - pw);
    freeWater += Math.max(0, a.utilities.waterCap - w);
  }
  // serviced readiness cells: in servicedLand, in a readiness area, and buildable
  let served = 0;
  for (const c of cellsOfRuns(s.servicedLand, s.grid)) {
    if ((!buildable || inSorted(buildable.cells, c)) && areas.some((a) => inSorted(a.cells, c))) served++;
  }
  const share = (n: number) => (cells > 0 ? n / cells : 0);
  const own = p.industry.by_ownership[R.standard_wave.ownership];
  const needP = R.standard_wave.jobs * own.power_kw_per_job, needW = R.standard_wave.jobs * own.water_m3_day_per_job;
  const ratio = (free: number, need: number) => (need > 0 ? free / need : 1);
  const part = {
    roads: Math.min(1, share(reached) / R.full_at.roads),
    servicedLand: Math.min(1, share(served) / R.full_at.serviced_land),
    waterPower: Math.min(1, ratio(freePower, needP), ratio(freeWater, needW)),
  };
  const W = R.weights;
  const bar = (W.roads * part.roads + W.serviced_land * part.servicedLand + W.water_power * part.waterPower)
    / (W.roads + W.serviced_land + W.water_power);
  let weakest: ReadinessPart = 'roads';
  for (const k of READINESS_PARTS) if (part[k] < part[weakest]) weakest = k;
  return { ...part, bar, weakest, cells };
}

/** The first wave's size at a readiness bar (§5.7). */
export function firstWaveCards(bar: number, p: SliceParams): number {
  const W = p.readiness.first_wave;
  return W.min_cards + Math.round(Math.min(1, Math.max(0, bar)) * (W.max_cards - W.min_cards));
}
