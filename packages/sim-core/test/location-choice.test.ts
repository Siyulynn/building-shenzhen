/** Offline Phase 1 comparison; run with `npm run spike:location`. See docs/spikes/phase1-location.md. */
import { expect, test } from 'vitest';
import { initial, params } from './fixtures.js';

// An area crossing has unit cost. Four-neighbour contacts only; never wrap across grid rows.
function neighbours(areas: { id: number; cells: Uint32Array }[], width: number) {
  const owner = new Map<number, number>();
  const graph = new Map(areas.map(a => [a.id, new Set<number>()]));
  for (const a of areas) for (const c of a.cells) owner.set(c, a.id);
  for (const [c, id] of owner) {
    const next = [c + width];
    if ((c + 1) % width !== 0) next.push(c + 1);
    for (const cell of next) {
      const other = owner.get(cell);
      if (other === undefined || other === id) continue;
      graph.get(id)!.add(other);
      graph.get(other)!.add(id);
    }
  }
  return graph;
}

// A/B Street's within-budget opportunity count, with BFS for equal-cost edges.
function reachable(graph: Map<number, Set<number>>, origin: number, hops: number) {
  const seen = new Set([origin]);
  let frontier = [origin];
  for (let i = 0; i < hops && frontier.length; i++) {
    const next = [];
    for (const a of frontier) for (const b of graph.get(a)!) {
      if (!seen.has(b)) { seen.add(b); next.push(b); }
    }
    frontier = next;
  }
  return seen;
}

// UrbanSim MNL for one chooser. Unavailable locations have utility -Infinity.
function shares(utilities: number[]) {
  const max = Math.max(...utilities);
  if (max === -Infinity) return utilities.map(() => 0);
  const weights = utilities.map(x => Math.exp(x - max));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

test('edge contact excludes row wrap and diagonal contact; the hop budget includes its boundary', () => {
  const graph = neighbours([2, 3, 6, 7].map((c, id) => ({ id, cells: Uint32Array.of(c) })), 3);
  expect([...reachable(graph, 0, 2)]).toEqual([0]);
  expect([...reachable(graph, 1, 1)]).toEqual([1, 2]);
  expect([...reachable(graph, 1, 2)]).toEqual([1, 2, 3]);
  expect(shares([1000, 1000, -Infinity])).toEqual([0.5, 0.5, 0]);
  expect(shares([-Infinity])).toEqual([0]);
});

test('one hypothetical factory arrival: local-only logit recovers the game’s first-pass weights', () => {
  const state = initial();
  const playable = state.areas.filter(a => a.access === 'playable');
  const graph = neighbours(playable, state.grid.width);
  // A controlled shock, not a claim about Shangbu or an observed inflow.
  const vacancy = (id: number) => id === 7 ? 100 : 0;
  const market = playable.map(({ id }) => {
    const h = state.housing.find(x => x.area === id)!;
    return { id, free: Math.max(0, Math.floor(h.beds.rental * params.housing.crowding_max) - h.occupants.rental) };
  });
  const local = market.map(({ id, free }) => free ? free + vacancy(id) : 0);
  const total = local.reduce((a, b) => a + b, 0);
  const baseline = local.map(w => w / total);
  const compare = (hops: number) => shares(market.map(({ id, free }) => {
    const jobs = [...reachable(graph, id, hops)].reduce((n, area) => n + vacancy(area), 0);
    return free ? Math.log(free + jobs) : -Infinity;
  }));
  compare(0).forEach((p, i) => expect(p).toBeCloseTo(baseline[i]!, 12));
  const oneHop = compare(1);
  expect(oneHop.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  for (const [i, { free }] of market.entries()) if (!free) expect(oneHop[i]).toBe(0);
  if (process.env.npm_lifecycle_event === 'spike:location') {
    process.stdout.write('area\tfree beds\tlocal %\tone hop %\n' + market.map(({ id, free }, i) =>
      `${id}\t${free}\t${(100 * baseline[i]!).toFixed(2)}\t${(100 * oneHop[i]!).toFixed(2)}`).join('\n') + '\n');
  }
});
