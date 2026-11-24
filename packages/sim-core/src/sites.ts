/** Descriptive start content (phase1-slice §1.1), independent of mutable block stocks. */
import type { AreasContent, LocalizedString } from './state.js';

type CellXY = readonly [number, number];
interface Placement { cell: CellXY; landCell: CellXY }
interface Projection {
  format: number; register_sha256: string; grid: AreasContent['grid']; placements: Record<string, Placement>;
}
interface SiteRecord {
  id: string; name: LocalizedString; kind: string; area: number | null; in_start_state: string;
  geometry: { kind: 'unplaced' } | { kind: 'point'; proxy: string; confidence: number };
  claims: { id: string; use: string }[];
}
export interface StartSite extends Placement {
  id: string; name: LocalizedString; kind: string; area: number; layer: 'settlement' | 'landmark' | 'landscape';
  proxy: string; confidence: number; claims: readonly { id: string; use: string }[];
}

export interface StartRoute {
  id: string; name: LocalizedString; kind: 'road' | 'railway'; placement: 'temporary';
  claims: StartSite['claims']; cells: readonly number[];
}
export interface StartNetwork { maxFrontageDepth: number; routes: readonly StartRoute[] }

/** Join explicit prototype alignments to the register. An unplaced record alone never creates a route. */
export function compileStartNetwork(raw: unknown, register: unknown, areas: AreasContent): StartNetwork {
  const data = raw as { max_frontage_depth: number; routes: { site: string; placement: string; waypoints: CellXY[] }[] };
  if (!Number.isSafeInteger(data?.max_frontage_depth) || data.max_frontage_depth < 1 || !Array.isArray(data.routes)
    || !Array.isArray(register)) throw new Error('invalid start network');
  const seen = new Set<string>();
  const routes = data.routes.map((r): StartRoute => {
    const s = (register as SiteRecord[]).find((site) => site.id === r.site);
    if (!s || seen.has(s.id) || s.geometry.kind !== 'unplaced' || s.in_start_state !== 'road'
      || (s.kind !== 'road' && s.kind !== 'railway') || r.placement !== 'temporary'
      || !s.claims.some((c) => c.id && c.use === 'encyclopedia')) throw new Error(`invalid temporary route: ${r.site}`);
    seen.add(s.id);
    if (!Array.isArray(r.waypoints) || r.waypoints.length < 2) throw new Error(`${s.id}: missing waypoints`);
    const cells: number[] = [];
    const push = (x: number, y: number) => {
      if (!areas.areas.some((a) => a.access === 'playable' && a.runs.some(([row, lo, hi]) => row === y && x >= lo && x <= hi))) {
        throw new Error(`${s.id}: route leaves playable land at ${x},${y}`);
      }
      cells.push(y * areas.grid.width + x);
    };
    for (const [i, pt] of r.waypoints.entries()) {
      if (!Array.isArray(pt) || pt.length !== 2 || !pt.every(Number.isSafeInteger)) throw new Error(`${s.id}: invalid waypoint`);
      if (i === 0) { push(pt[0], pt[1]); continue; }
      let [x, y] = r.waypoints[i - 1]!;
      const dx = Math.sign(pt[0] - x), dy = Math.sign(pt[1] - y);
      if ((dx === 0) === (dy === 0)) throw new Error(`${s.id}: expected distinct orthogonal waypoints`);
      while (x !== pt[0] || y !== pt[1]) { x += dx; y += dy; push(x, y); }
    }
    return { id: s.id, name: s.name, claims: s.claims, kind: s.kind, placement: 'temporary', cells };
  });
  return { routes, maxFrontageDepth: data.max_frontage_depth };
}

export function compileStartSites(raw: unknown, projection: Projection, areas: AreasContent, digest: string): StartSite[] {
  const g = areas.grid, p = projection.grid;
  if (projection.format !== 1 || projection.register_sha256 !== digest || p.width !== g.width || p.height !== g.height
    || p.cell_m !== g.cell_m || p.crs !== g.crs || p.origin_top_left.some((v, i) => v !== g.origin_top_left[i])) {
    throw new Error('stale site projection: rebuild with pipeline/m1b_sites.py');
  }
  if (!Array.isArray(raw)) throw new Error('expected a site register');
  const validCell = (c: CellXY) => Array.isArray(c) && c.length === 2 && c.every(Number.isInteger)
    && c[0] >= 0 && c[0] < g.width && c[1] >= 0 && c[1] < g.height;
  const out: StartSite[] = [], seen = new Set<string>();
  for (const s of raw as SiteRecord[]) {
    if (seen.has(s.id)) throw new Error(`duplicate site: ${s.id}`);
    seen.add(s.id);
    const pos = projection.placements[s.id];
    if (s.geometry.kind === 'unplaced' && !pos) continue;
    if (s.geometry.kind !== 'point' || !pos || !validCell(pos.cell) || !validCell(pos.landCell)) {
      throw new Error(`${s.id}: inconsistent point placement`);
    }
    const a = areas.areas.find((a) => a.id === s.area);
    const [x, y] = pos.landCell;
    if (!a || !a.runs.some(([row, lo, hi]) => row === y && x >= lo && x <= hi)) {
      throw new Error(`${s.id}: land cell outside registered area`);
    }
    if ((a.access === 'card_only') !== (s.in_start_state === 'card_only')) throw new Error(`${s.id}: inconsistent access`);
    if (a.access === 'card_only') continue;
    if (!s.name.zh || !s.name.en || !s.geometry.proxy || !Number.isFinite(s.geometry.confidence)
      || !s.claims.some((c) => c.id && c.use === 'geometry') || !s.claims.some((c) => c.id && c.use === 'encyclopedia')) {
      throw new Error(`${s.id}: missing site label or evidence`);
    }
    out.push({ ...pos, id: s.id, name: s.name, kind: s.kind, area: a.id, claims: s.claims,
      proxy: s.geometry.proxy, confidence: s.geometry.confidence,
      layer: s.kind === 'town' || s.kind === 'village' ? 'settlement'
        : s.in_start_state === 'tracked_building' ? 'landmark' : 'landscape' });
  }
  for (const id of Object.keys(projection.placements)) if (!seen.has(id)) throw new Error(`unknown projected site: ${id}`);
  return out;
}
