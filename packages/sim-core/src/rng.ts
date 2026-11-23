/**
 * Seeded randomness (phase1-slice.md §5.1): sfc32, one named stream per tick step.
 * Each stream is seeded by splitmix32 from the run's seed and the stream's name, so a system added later
 * draws from its own stream and never shifts another system's draws.
 */
export type StreamState = [number, number, number, number];
export interface RngState { seed: number; streams: Record<string, StreamState> }

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export class Stream {
  constructor(private readonly s: StreamState) {}

  /** A uniform 32-bit unsigned integer (sfc32). */
  next(): number {
    const s = this.s;
    let [a, b, c, d] = s;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    s[0] = a; s[1] = b; s[2] = c; s[3] = d;
    return t >>> 0;
  }

  /** Uniform in [0, 1). */
  float(): number {
    return this.next() / 4294967296;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    if (!Number.isInteger(n) || n <= 0) throw new Error(`int(n) needs a positive integer, got ${n}`);
    return Math.floor(this.float() * n);
  }
}

export class Rng {
  private readonly streams = new Map<string, StreamState>();

  constructor(readonly seed: number, saved?: Record<string, StreamState>) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed must be a uint32, got ${seed}`);
    for (const [name, st] of Object.entries(saved ?? {})) this.streams.set(name, [...st] as StreamState);
  }

  /** The named stream, created on first use. */
  stream(name: string): Stream {
    let st = this.streams.get(name);
    if (!st) {
      const sm = splitmix32((this.seed ^ fnv1a(name)) >>> 0);
      st = [sm() | 0, sm() | 0, sm() | 0, sm() | 0];
      const warm = new Stream(st);
      for (let i = 0; i < 12; i++) warm.next();
      this.streams.set(name, st);
    }
    return new Stream(st);
  }

  /** Plain numbers, streams in name order: goes into the save. */
  save(): RngState {
    const streams: Record<string, StreamState> = {};
    for (const name of [...this.streams.keys()].sort()) streams[name] = [...this.streams.get(name)!] as StreamState;
    return { seed: this.seed, streams };
  }

  static load(state: RngState): Rng {
    return new Rng(state.seed, state.streams);
  }
}
