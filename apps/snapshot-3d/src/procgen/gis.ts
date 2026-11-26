// The September 1980 base map in atlas world metres, plus the masks and lookups every generator shares.
import {contains, grownHull, nearest, poly, type P, type Poly} from './geom';

type Geometry = {type: 'Point'; coordinates: number[]} | {type: 'LineString'; coordinates: number[][]}
  | {type: 'Polygon'; coordinates: number[][][]};
export interface RawFeature {
  id: string; kind: string; basis: string; name_en: string; name_zh: string; note: string;
  claims: string[]; links: string[]; geometry: Geometry;
}
export interface RawMap {
  format: string; crs: string; bounds: number[]; layers: Record<string, RawFeature[]>;
  source?: {sha256: string}; date: string; status: string;
}
export type Cover = 'field' | 'open_ground' | 'pond_complex' | 'river_margin' | 'settlement' | 'transport_land'
  | 'unknown' | 'upland_cover' | 'water' | 'worksite';
export type GroundTint={kind:Cover|'graded_ground'|'civic_park'; rect:[number,number,number,number]; ring?:P[]; protectFields?:boolean};
export const inTint=(t:GroundTint,x:number,z:number)=>t.ring?
  contains({box:t.rect,rings:[t.ring]},x,z):
  x>=t.rect[0]&&z>=t.rect[1]&&x<=t.rect[2]&&z<=t.rect[3];
export interface Area {id: string; parent: string; kind: Cover; basis: string; poly: Poly; raw: RawFeature}
export interface Line {id: string; kind: string; basis: string; points: P[]; links: string[]; raw: RawFeature}
export interface Spot {id: string; kind: string; basis: string; at: P; links: string[]; raw: RawFeature}
export type Clear = 'buildings' | 'trees' | 'fields' | 'ponds' | 'streets';
export interface MaskDef {id: string; name: string[]; from: string[]; margin_m: number; radius_m?: number; clears: Clear[]}
export interface Mask extends MaskDef {poly: Poly}

/** UTM 50N metres → atlas world metres. The origin is the centre of grid cell (0, 0). */
export const toWorld = ([e, n]: number[]): P => [e! - 164450, 2533850 - n!];

export interface Basin {
  window: [number, number, number, number]; // world x0, z0, x1, z1
  cover: Area[]; areaPicks: Map<string, Area>; lines: Map<string, Line>;
  crossings: Spot[]; places: Map<string, Spot>; axes: Line[]; bankSpans: Line[];
  masks: Mask[]; coverAt(x: number, z: number): Area | undefined;
}

const parentOf = (id: string) => id.replace(/\/\d+$/, '');

export function loadBasin(map: RawMap, maskDefs: MaskDef[]): Basin {
  if (map.format !== 'sz-core-basin-map-v1' || map.crs !== 'EPSG:32650') throw Error('Unexpected base map / 底图格式不符');
  const [w, s, e, n] = map.bounds as [number, number, number, number];
  const [x0, z1] = toWorld([w, s]), [x1, z0] = toWorld([e, n]);
  const area = (f: RawFeature): Area => {
    if (f.geometry.type !== 'Polygon') throw Error('Expected polygon: ' + f.id);
    return {id: f.id, parent: parentOf(f.id), kind: f.kind as Cover, basis: f.basis, raw: f,
      poly: poly(f.geometry.coordinates.map(r => r.map(toWorld)))};
  };
  const line = (f: RawFeature): Line => {
    if (f.geometry.type !== 'LineString') throw Error('Expected line: ' + f.id);
    return {id: f.id, kind: f.kind, basis: f.basis, links: f.links, raw: f, points: f.geometry.coordinates.map(toWorld)};
  };
  const spot = (f: RawFeature): Spot => {
    if (f.geometry.type !== 'Point') throw Error('Expected point: ' + f.id);
    return {id: f.id, kind: f.kind, basis: f.basis, links: f.links, raw: f, at: toWorld(f.geometry.coordinates)};
  };
  const L = map.layers;
  const cover = L.cover!.map(area), areaPicks = new Map(L.area_picks!.map(f => [f.id, area(f)]));
  const lines = new Map(L.alignments!.map(f => [f.id, line(f)]));
  const crossings = L.crossings!.map(spot), places = new Map(L.places!.map(f => [f.id, spot(f)]));
  // 100 m bucket index over cover polygons. Cover is disjoint, so the first hit is the answer.
  const cell = 100, cols = Math.ceil((x1 - x0) / cell) + 1, rows = Math.ceil((z1 - z0) / cell) + 1;
  const buckets: Area[][] = Array.from({length: cols * rows}, () => []);
  for (const a of cover) {
    const [ax, az, bx, bz] = a.poly.box;
    for (let r = Math.max(0, Math.floor((az - z0) / cell)); r <= Math.min(rows - 1, Math.floor((bz - z0) / cell)); r++)
      for (let c = Math.max(0, Math.floor((ax - x0) / cell)); c <= Math.min(cols - 1, Math.floor((bx - x0) / cell)); c++)
        buckets[r * cols + c]!.push(a);
  }
  const coverAt = (x: number, z: number) => {
    const c = Math.floor((x - x0) / cell), r = Math.floor((z - z0) / cell);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return undefined;
    return buckets[r * cols + c]!.find(a => contains(a.poly, x, z));
  };
  const masks = maskDefs.map(def => {
    const pts: P[] = [];
    for (const id of def.from) {
      const src = areaPicks.get(id)?.poly.rings[0] ?? lines.get(id)?.points
        ?? [crossings.find(c => c.id === id)?.at ?? places.get(id)?.at].filter((p): p is P => !!p);
      if (!src.length) throw Error('Mask source not in base map: ' + id);
      if (src.length === 1 && def.radius_m) {
        const [x, z] = src[0]!;
        for (let k = 0; k < 16; k++) pts.push([x + Math.cos(k * Math.PI / 8) * def.radius_m, z + Math.sin(k * Math.PI / 8) * def.radius_m]);
      } else pts.push(...src);
    }
    return {...def, poly: poly([grownHull(pts, def.margin_m)])};
  });
  return {window: [x0, z0, x1, z1], cover, areaPicks, lines, crossings, places, masks, coverAt,
    axes: L.fabric_axes!.map(line), bankSpans: L.bank_spans!.map(line)};
}

export const inWindow = (b: Basin, x: number, z: number, pad = 0) =>
  x >= b.window[0] + pad && x <= b.window[2] - pad && z >= b.window[1] + pad && z <= b.window[3] - pad;

/** Masks that clear a class at this point. */
export function masksAt(b: Basin, x: number, z: number, what: Clear) {
  return b.masks.filter(m => m.clears.includes(what) && contains(m.poly, x, z)).map(m => m.id);
}

/** Field or settlement grain: a linked fabric axis, else the nearest one within 600 m, else the polygon's own axis. */
export function grainFor(b: Basin, parent: string, x: number, z: number): number | undefined {
  const linked = b.axes.find(a => a.links.includes(parent));
  const axis = linked ?? b.axes.map(a => ({a, d: nearest(a.points, x, z).d})).filter(o => o.d < 600)
    .sort((p, q) => p.d - q.d)[0]?.a;
  if (!axis) return undefined;
  const [[ax, az], [bx, bz]] = [axis.points[0]!, axis.points.at(-1)!];
  return Math.atan2(bz - az, bx - ax);
}
