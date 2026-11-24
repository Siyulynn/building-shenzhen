/**
 * R4 (phase1-slice.md §5.11): which playable areas a worker can reach. Areas reach each other when a road component
 * (start or built roads; rails excluded) has cells in both. An area no road touches reaches only itself. Without the
 * start network every playable area reaches every other, as in M2.
 */
import { roadNetwork } from './network.js';
import type { StartNetwork } from './sites.js';
import type { GameState } from './state.js';

function inSorted(sorted: Uint32Array, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, x = sorted[mid]!;
    if (x === v) return true;
    if (x < v) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}

/** Each playable area's reach class: the lowest area id it reaches (so classes are named in a stable way). */
export function reachClasses(s: GameState, network?: StartNetwork): Map<number, number> {
  const playable = s.areas.filter((a) => a.access === 'playable');
  const out = new Map<number, number>();
  if (!network) {
    const first = Math.min(...playable.map((a) => a.id));
    for (const a of playable) out.set(a.id, first);
    return out;
  }
  const roads = roadNetwork(s.grid, [...network.routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells), ...s.roads]);
  // union-find over area ids, joined through the components that touch them
  const parent = new Map<number, number>(playable.map((a) => [a.id, a.id]));
  const find = (x: number): number => { let r = x; while (parent.get(r)! !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  const unite = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(Math.max(ra, rb), Math.min(ra, rb)); };
  const areaOfComponent = new Map<number, number>();
  for (const [cell, comp] of roads.component) {
    const a = playable.find((x) => inSorted(x.cells, cell));
    if (!a) continue;
    const seen = areaOfComponent.get(comp);
    if (seen === undefined) areaOfComponent.set(comp, a.id); else unite(seen, a.id);
  }
  for (const a of playable) out.set(a.id, find(a.id));
  return out;
}
