/**
 * Saves (PLAN §6.7, phase1-slice.md §5.1): a header, the state as JSON with typed arrays replaced by references,
 * and the named typed arrays. Compression and the file container belong to the caller.
 */
import { Rng, type RngState } from './rng.js';
import type { GameState } from './state.js';
import type { YM } from './ym.js';

export const SAVE_VERSION = 1;

export interface SaveHeader { format: 'sz-save'; version: number; date: YM; seed: number; content: { areas_sha256: string; params_sha256: string } }
export interface Save { header: SaveHeader; body: { state: unknown; rng: RngState }; arrays: Record<string, Uint32Array> }

/** Migration from version v to v + 1, keyed by v. Version 1 is the first: none yet. */
const MIGRATIONS: Record<number, (s: Save) => Save> = {};

/** JSON turns NaN and Infinity into null without a word: a save must fail instead. */
function finiteOnly(key: string, value: unknown): unknown {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`cannot save a non-finite number at "${key}": ${value}`);
  return value;
}

interface ArrayRef { $array: string }
const isRef = (v: unknown): v is ArrayRef => typeof v === 'object' && v !== null && '$array' in v;

export function saveGame(state: GameState, rng: Rng, content: { areas_sha256: string; params_sha256: string }): Save {
  const arrays: Record<string, Uint32Array> = {};
  const body = {
    ...state,
    areas: state.areas.map((a, i) => {
      const name = `areas.${i}.cells`;
      arrays[name] = a.cells.slice();
      return { ...a, cells: { $array: name } };
    }),
  };
  return {
    header: { format: 'sz-save', version: SAVE_VERSION, date: state.date, seed: rng.seed, content: { ...content } },
    body: { state: JSON.parse(JSON.stringify(body, finiteOnly)) as unknown, rng: rng.save() },
    arrays,
  };
}

export function loadGame(save: Save): { state: GameState; rng: Rng; header: SaveHeader } {
  if (save.header.format !== 'sz-save') throw new Error('not a save file');
  if (save.header.version > SAVE_VERSION) throw new Error(`save version ${save.header.version} is newer than ${SAVE_VERSION}`);
  let s = save;
  for (let v = s.header.version; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`no migration from save version ${v}`);
    s = m(s);
  }
  const raw = JSON.parse(JSON.stringify(s.body.state)) as GameState & { areas: { cells: unknown }[] };
  const state: GameState = {
    ...raw,
    areas: raw.areas.map((a) => {
      if (!isRef(a.cells)) throw new Error('area cells missing from the save');
      const arr = s.arrays[a.cells.$array];
      if (!arr) throw new Error(`save has no array ${a.cells.$array}`);
      return { ...a, cells: arr.slice() };
    }),
  };
  return { state, rng: Rng.load(s.body.rng), header: { ...s.header } };
}

// ---- canonical text form: sorted keys, arrays as little-endian base64 ----

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!, b1 = bytes[i + 1] ?? 0, b2 = bytes[i + 2] ?? 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '=';
    out += i + 2 < bytes.length ? B64[n & 63]! : '=';
  }
  return out;
}

function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let k = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const v = [0, 1, 2, 3].map((j) => (i + j < clean.length ? B64.indexOf(clean[i + j]!) : 0));
    if (v.some((x) => x < 0)) throw new Error('bad base64');
    const n = (v[0]! << 18) | (v[1]! << 12) | (v[2]! << 6) | v[3]!;
    if (k < out.length) out[k++] = (n >> 16) & 255;
    if (k < out.length) out[k++] = (n >> 8) & 255;
    if (k < out.length) out[k++] = n & 255;
  }
  return out;
}

function u32ToBytes(a: Uint32Array): Uint8Array {
  const out = new Uint8Array(a.length * 4);
  const dv = new DataView(out.buffer);
  a.forEach((v, i) => dv.setUint32(i * 4, v, true));
  return out;
}

function bytesToU32(b: Uint8Array): Uint32Array {
  if (b.length % 4) throw new Error('u32 array byte length is not a multiple of 4');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out = new Uint32Array(b.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = dv.getUint32(i * 4, true);
  return out;
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canonical(o[k])]));
  }
  return v;
}

/** The canonical text form: equal saves give equal strings. */
export function saveToJson(save: Save): string {
  const arrays = Object.fromEntries(Object.keys(save.arrays).sort()
    .map((k) => [k, { dtype: 'u32le', b64: toBase64(u32ToBytes(save.arrays[k]!)) }]));
  return JSON.stringify(canonical({ header: save.header, body: save.body, arrays }), finiteOnly) + '\n';
}

export function saveFromJson(text: string): Save {
  const d = JSON.parse(text) as { header: SaveHeader; body: Save['body']; arrays: Record<string, { dtype: string; b64: string }> };
  const arrays: Record<string, Uint32Array> = {};
  for (const [k, v] of Object.entries(d.arrays)) {
    if (v.dtype !== 'u32le') throw new Error(`unknown array dtype ${v.dtype}`);
    arrays[k] = bytesToU32(fromBase64(v.b64));
  }
  return { header: d.header, body: d.body, arrays };
}
