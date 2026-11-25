/**
 * Power, one city pool (phase1-slice.md §5.5, R8c). Supply is the inherited local plant (each area's
 * `utilities.powerCap`, raised by M4's power lines), the purchased power that has arrived, and finished power stations.
 * Delivery to an area is its local plant plus what substations deliver to its zones along the roads (`placedSupply`).
 * When the areas' deliverable need is more than the pool, the pool is shared pro rata to it. Pure: derived each time
 * from state, never stored.
 */
import type { SliceParams } from './params.js';
import type { GameState, PlayerAction } from './state.js';
import { addObligation } from './fiscal.js';
import type { YM } from './ym.js';

/** The city's purchased power: each purchase joins the pool from `from` (R8c). Absent before R8c's saves. */
export interface PowerState { purchases: { kw: number; from: YM }[] }

/** Purchased kW that has arrived, and the kW still on order. */
export function importedKw(s: GameState): { arrived: number; pending: number } {
  let arrived = 0, pending = 0;
  for (const x of s.power?.purchases ?? []) { if (x.from <= s.date) arrived += x.kw; else pending += x.kw; }
  return { arrived, pending };
}

export interface PowerPool { local: number; imported: number; stations: number; total: number }
/** The city pool now (§5.5): local plant + arrived purchases + finished stations, in kW. */
export function powerPool(s: GameState): PowerPool {
  const local = s.areas.reduce((n, a) => n + a.utilities.powerCap, 0);
  const imported = importedKw(s).arrived;
  const stations = s.structures.reduce((n, x) => n + (x.kind === 'power_station' ? x.capacity : 0), 0);
  return { local, imported, stations, total: local + imported + stations };
}

/**
 * Each area's power share, 0..1 (§5.5): `need` is the area's firm kW, `delivered` what substations deliver to it.
 * An area can take at most its local plant plus its delivery; the pool is shared pro rata to what the areas can take.
 * An area with no need reads 1.
 */
export function poolShares(s: GameState, need: ReadonlyMap<number, number>,
  delivered?: ReadonlyMap<number, { power: number }>, pool = powerPool(s).total): Map<number, number> {
  const take = areaTakes(s, need, delivered);
  const f = poolFactor(take, pool);
  const out = new Map<number, number>();
  for (const [area, n] of need) out.set(area, n > 0 ? Math.min(1, ((take.get(area) ?? 0) * f) / n) : 1);
  return out;
}

/** What each area with need can take (§5.5): its need, at most its local plant plus its delivery. */
export function areaTakes(s: GameState, need: ReadonlyMap<number, number>,
  delivered?: ReadonlyMap<number, { power: number }>): Map<number, number> {
  const take = new Map<number, number>();
  for (const [area, n] of need) {
    if (!(n > 0)) continue;
    const a = s.areas.find((x) => x.id === area);
    take.set(area, Math.min(n, Math.max(0, (a?.utilities.powerCap ?? 0) + (delivered?.get(area)?.power ?? 0))));
  }
  return take;
}
/** The pool's pro-rata factor, 0..1 (§5.5): 1 while the areas' takes fit in the pool. */
export function poolFactor(take: ReadonlyMap<number, number>, pool: number): number {
  let sum = 0;
  for (const v of take.values()) sum += v;
  return sum > pool ? Math.max(0, pool) / sum : 1;
}

/**
 * `buy_power { kw }` (§5.6): a city purchase, arriving after `lead_months`, owing `kw × yuan_per_kw_month` a month
 * from then as a permanent `service` obligation. Refused past `max_kw`, counting purchases still on order. An old
 * action's `area` is ignored: purchased power is the city's.
 */
export function buyPower(s: GameState, p: SliceParams, a: PlayerAction & { type: 'buy_power' }): void {
  const I = p.fiscal.power_import;
  if (!Number.isInteger(a.kw) || a.kw <= 0) throw new Error('buy_power needs a whole kw > 0');
  const { arrived, pending } = importedKw(s);
  if (arrived + pending + a.kw > I.max_kw) {
    throw new Error(`the line carries at most ${I.max_kw} kW; ${arrived + pending} kW is bought or on order`);
  }
  const from = s.date + I.lead_months;
  s.power = { purchases: [...(s.power?.purchases ?? []), { kw: a.kw, from }] };
  const perMonth = Math.round(a.kw * I.yuan_per_kw_month);
  if (perMonth > 0) addObligation(s, { kind: 'service', perMonth, index: 'none', from, createdBy: 'power_import' });
}
