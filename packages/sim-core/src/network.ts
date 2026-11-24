/** Sparse, derived planning views (buildings-and-construction §13.1). No RNG or monthly stocks. */
import { largestRemainder } from './round.js';
import type { GameState } from './state.js';

type Grid = GameState['grid'];
export interface RoadNetwork { grid: Grid; component: ReadonlyMap<number, number> }
export interface Frontage { component: number; depth: number }

function neighbours(cell: number, { width, height }: Grid): number[] {
  const x = cell % width, out: number[] = [];
  if (x > 0) out.push(cell - 1);
  if (x + 1 < width) out.push(cell + 1);
  if (cell >= width) out.push(cell - width);
  if (cell < width * (height - 1)) out.push(cell + width);
  return out;
}

function checkCell(cell: number, grid: Grid) {
  if (!Number.isSafeInteger(cell) || cell < 0 || cell >= grid.width * grid.height) throw new Error(`invalid network cell ${cell}`);
}

/** Connected components of completed road cells. Minimum cell index is stable under input reordering. */
export function roadNetwork(grid: Grid, roadCells: Iterable<number>): RoadNetwork {
  const roads = new Set(roadCells), component = new Map<number, number>();
  for (const first of [...roads].sort((a, b) => a - b)) {
    checkCell(first, grid);
    if (component.has(first)) continue;
    const queue = [first];
    component.set(first, first);
    for (let i = 0; i < queue.length; i++) for (const c of neighbours(queue[i]!, grid)) {
      if (roads.has(c) && !component.has(c)) { component.set(c, first); queue.push(c); }
    }
  }
  return { grid, component };
}

/** Multi-source BFS within ONE zone. Frontages are seeded in tie-break order at depth one. */
export function zoneFrontage(roads: RoadNetwork, zoneCells: Iterable<number>, maxDepth: number): Map<number, Frontage> {
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1) throw new Error('invalid frontage depth');
  const zone = new Set(zoneCells), reached = new Map<number, Frontage>();
  for (const c of zone) {
    checkCell(c, roads.grid);
    if (roads.component.has(c)) { zone.delete(c); continue; }
    const components = neighbours(c, roads.grid).flatMap((n) => roads.component.has(n) ? [roads.component.get(n)!] : []);
    if (components.length) reached.set(c, { component: Math.min(...components), depth: 1 });
  }
  const queue = [...reached.keys()].sort((a, b) => reached.get(a)!.component - reached.get(b)!.component || a - b);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!, { component, depth } = reached.get(cell)!;
    if (depth >= maxDepth) continue;
    for (const c of neighbours(cell, roads.grid)) if (zone.has(c) && !reached.has(c)) {
      reached.set(c, { component, depth: depth + 1 }); queue.push(c);
    }
  }
  return reached;
}

/** One commodity at a time. Sources keyed by road attachment, demands by serviced consumer cell.
 * Missing frontage/source yields zero; caller supplies frontage derived from the same road topology. */
export function allocateUtility(roads: RoadNetwork, frontage: ReadonlyMap<number, Frontage>,
  sources: ReadonlyMap<number, number>, demand: ReadonlyMap<number, number>): Map<number, number> {
  const capacity = new Map<number, number>(), loads = new Map<number, number[]>(), supplied = new Map<number, number>();
  const checkAmount = (n: number) => { if (!Number.isSafeInteger(n) || n < 0) throw new Error('invalid utility amount'); };
  for (const [cell, amount] of sources) {
    checkAmount(amount); checkCell(cell, roads.grid);
    const id = roads.component.get(cell);
    if (id !== undefined) capacity.set(id, (capacity.get(id) ?? 0) + amount);
  }
  for (const [cell, amount] of demand) {
    checkAmount(amount); checkCell(cell, roads.grid); supplied.set(cell, 0);
    const id = frontage.get(cell)?.component;
    if (id === undefined || !capacity.has(id)) continue;
    if (!loads.has(id)) loads.set(id, []);
    loads.get(id)!.push(cell);
  }
  for (const [id, cells] of loads) {
    cells.sort((a, b) => a - b);
    const weights = cells.map((c) => demand.get(c)!);
    const portions = largestRemainder(Math.min(capacity.get(id)!, weights.reduce((a, b) => a + b, 0)), weights);
    cells.forEach((c, i) => supplied.set(c, portions[i]!));
  }
  return supplied;
}
