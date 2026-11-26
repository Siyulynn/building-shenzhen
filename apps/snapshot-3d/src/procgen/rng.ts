// Seeded hashing. Every random draw is keyed by (seed, parent feature id, local cell), so adding,
// removing or masking one feature never reshuffles another.
export function hash(...parts: (string | number)[]) {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= 0x9e; h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
export function rng(...parts: (string | number)[]) {
  let a = hash(...parts) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rand = ReturnType<typeof rng>;
export const pick = <T>(r: Rand, items: readonly T[]) => items[Math.floor(r() * items.length)]!;
export function weighted<K extends string>(r: Rand, mix: Partial<Record<K, number>>): K {
  const entries = Object.entries(mix) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let t = r() * total;
  for (const [k, w] of entries) { t -= w; if (t <= 0) return k; }
  return entries.at(-1)![0];
}
