/**
 * Saves (PLAN §6.7, phase1-slice.md §5.1): a header, the state as JSON with typed arrays replaced by references,
 * and the named typed arrays. Compression and the file container belong to the caller.
 */
import { Rng, type RngState } from './rng.js';
import type { GameState } from './state.js';
import type { YM } from './ym.js';
import type { EventContent } from './events.js';

export const SAVE_VERSION = 9;

/** The content a migration may read (R10a, §5.13): the events, for the unlock keys of events already fired. */
export interface MigrationContent { events?: EventContent }

/** The content a save was made with (§5.1, §5.3). */
export interface SaveContent {
  areas_sha256: string; params_sha256: string; precedents_sha256: string;
  investors_sha256: string;                             // M3b, §5.5
  landcover_sha256: string;                             // R8a, §5.5: replaces M3b's buildable_sha256 (older headers keep it)
  fiscal_sha256: string;                                  // M4, §5.6: regimes, projects and teams together
  events_sha256: string; leaders_sha256: string;          // M5a, §5.7
  targets_sha256: string;                                 // M5b, §5.8
  network_sha256: string;                                 // R2, b&c §13.2: content/slice/start_network.yaml
  gateways_sha256: string;                                // R8e, §5.12: content/slice/gateways.yaml (older headers lack it)
  tools_sha256?: string;                                  // R9, §5.8: content/slice/tools.yaml (older headers lack it)
}
export interface SaveHeader { format: 'sz-save'; version: number; date: YM; seed: number; content: SaveContent }
export interface Save { header: SaveHeader; body: { state: unknown; rng: RngState }; arrays: Record<string, Uint32Array> }

/** Migration from version v to v + 1, keyed by v. */
const MIGRATIONS: Record<number, (s: Save, c: MigrationContent) => Save> = {
  // R1 (buildings-and-construction §13.1): cell works and placed structures, empty before they existed
  1: (s) => ({ ...s, header: { ...s.header, version: 2 },
    body: { ...s.body, state: { ...(s.body.state as object), cellWorks: [], structures: [], nextStructureId: 1 } } }),
  // R2 (§13.2): built roads and works orders. A version 2 header has no network hash: the start network then was R1's
  2: (s) => ({ ...s, header: { ...s.header, version: 3 },
    body: { ...s.body, state: { ...(s.body.state as object), roads: [], worksOrders: [], nextOrderId: 1 } } }),
  // R3 (§13.3): the organic firms' banked demand. The new cohort and firm fields are optional
  3: (s) => ({ ...s, header: { ...s.header, version: 4 },
    body: { ...s.body, state: { ...(s.body.state as object), growth: { carry: 0 } } } }),
  // R4 (phase1-slice §5.11): who holds which jobs (empty, so the next labour step matches once from scratch),
  // the month's service posts, no one turned away, and the new series as zeros
  4: (s) => {
    const st = s.body.state as { labour: object; housing: object[]; history: { months: unknown[] } };
    const zeros = () => st.history.months.map(() => 0);
    return { ...s, header: { ...s.header, version: 5 },
      body: { ...s.body, state: { ...st, labour: { ...st.labour, held: [], servicePosts: [] },
        housing: st.housing.map((m) => ({ ...m, turnedAway: 0 })),
        history: { ...st.history, vacancies: zeros(), turnedAway: zeros(), servicePosts: zeros(), constructionPosts: zeros() } } } };
  },
  // R8 (phase1-slice §5.1's table): no public zone, the retired power source, the land already taken, the power pool
  5: (s) => {
    type Runs = [number, number, number][];
    type Kinded = { kind: string };
    const st = s.body.state as {
      grid: { width: number }; zones: { use: string }[]; structures: Kinded[];
      worksOrders: { placement?: Kinded }[]; cellWorks: { cell: number }[]; servicedLand: Runs;
      fiscal: { projects: { cells?: Runs }[] }; actionLog: { action: Record<string, unknown> }[];
      requisitioned?: number[]; power?: unknown;
    };
    const use = (u: unknown) => (u === 'public' ? 'reserve' : u);
    const kind = <T extends Kinded>(x: T): T => (x.kind === 'power_source' ? { ...x, kind: 'power_substation' } : x);
    const cells = (r: Runs) => r.flatMap(([y, x0, x1]) => Array.from({ length: x1 - x0 + 1 }, (_, i) => y * st.grid.width + x0 + i));
    const taken = new Set([...st.cellWorks.map((w) => w.cell), ...cells(st.servicedLand),
      ...st.fiscal.projects.flatMap((p) => (p.cells ? cells(p.cells) : []))]);
    const action = (a: Record<string, unknown>) => {
      if ((a.type === 'create_zone' || a.type === 'edit_zone') && a.use === 'public') return { ...a, use: 'reserve' };
      if (a.type === 'place_structure' && a.kind === 'power_source') return { ...a, kind: 'power_substation' };
      return a;
    };
    return { ...s, header: { ...s.header, version: 6 },
      body: { ...s.body, state: { ...st,
        zones: st.zones.map((z) => ({ ...z, use: use(z.use) })),
        structures: st.structures.map(kind),
        worksOrders: st.worksOrders.map((o) => (o.placement ? { ...o, placement: kind(o.placement) } : o)),
        requisitioned: st.requisitioned ?? [...taken].sort((a, b) => a - b),
        power: st.power ?? { purchases: [] },
        actionLog: st.actionLog.map((e) => ({ ...e, action: action(e.action) })) } } };
  },
  // R9 (phase1-slice §5.6): crew arrivals. A version-6 run's corps advance was a pool contract, which it keeps
  6: (s) => ({ ...s, header: { ...s.header, version: 7 }, body: { ...s.body, state: { ...(s.body.state as object), crew: [] } } }),
  // R9.2 (§5.5): the electricity series. An older run never recorded it: zeros keep the series aligned.
  7: (s) => {
    const st = s.body.state as { history: { months: unknown[] } };
    return { ...s, header: { ...s.header, version: 8 },
      body: { ...s.body, state: { ...st, history: { ...st.history, electricity: st.history.months.map(() => 0) } } } };
  },
  // R10a (§5.13): the sector series as zeros, and the unlock keys of the events already fired (revision plan §4b.2
  // item 7): each fire-time `unlock` of a fired event still in the content, in firing order, once
  8: (s, c) => {
    if (!c.events) throw new Error('loading a save older than version 9 needs the events content (its unlock keys)');
    const st = s.body.state as { history: { months: unknown[]; gdpSector?: unknown };
      events: { fired: { id: string }[]; unlocked: string[] } };
    const zeros = () => st.history.months.map(() => 0);
    const unlocked = [...st.events.unlocked];
    for (const f of st.events.fired) {
      const d = c.events.find((x) => x.id === f.id);
      for (const e of d?.effects ?? []) if (e.kind === 'unlock' && !unlocked.includes(e.key)) unlocked.push(e.key);
    }
    return { ...s, header: { ...s.header, version: 9 },
      body: { ...s.body, state: { ...st, events: { ...st.events, unlocked },
        history: { ...st.history,
          gdpSector: st.history.gdpSector ?? { primary: zeros(), secondary: zeros(), tertiary: zeros(), construction: zeros() } } } } };
  },
};

/** JSON turns NaN and Infinity into null without a word: a save must fail instead. */
function finiteOnly(key: string, value: unknown): unknown {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`cannot save a non-finite number at "${key}": ${value}`);
  return value;
}

interface ArrayRef { $array: string }
const isRef = (v: unknown): v is ArrayRef => typeof v === 'object' && v !== null && '$array' in v;

export function saveGame(state: GameState, rng: Rng, content: SaveContent): Save {
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

/** Load a save, migrating it to this version. A save older than version 9 needs `content.events` (§5.13). */
export function loadGame(save: Save, content: MigrationContent = {}): { state: GameState; rng: Rng; header: SaveHeader } {
  if (save.header.format !== 'sz-save') throw new Error('not a save file');
  if (save.header.version > SAVE_VERSION) throw new Error(`save version ${save.header.version} is newer than ${SAVE_VERSION}`);
  let s = save;
  for (let v = s.header.version; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`no migration from save version ${v}`);
    s = m(s, content);
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
