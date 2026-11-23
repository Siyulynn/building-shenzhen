/** Integer people (phase1-slice.md §5.2): seeded stochastic rounding and largest-remainder splits. */
import type { Stream } from './rng.js';

/** floor(x), plus 1 with probability frac(x). Always draws once, so the stream advances the same way. */
export function stochRound(x: number, rng: Stream): number {
  if (!Number.isFinite(x) || x < 0) throw new Error(`stochRound needs a finite x >= 0, got ${x}`);
  const f = Math.floor(x);
  return f + (rng.float() < x - f ? 1 : 0);
}

/** Split an integer total across weights by largest remainder; ties go to the lower index. All-zero weights give zeros. */
export function largestRemainder(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length]![1]]! += 1;
  return out;
}
