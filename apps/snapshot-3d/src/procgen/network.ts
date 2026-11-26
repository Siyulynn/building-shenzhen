// Civil ribbons, water levels and bridges. Pure data: no three.js.
import {bbox, chainage, contains, densify, nearest, offset, segDist, segmentMeeting, type P, type Poly} from './geom';
import type {Basin} from './gis';
import type {Lattice} from './ground';

/** A level, axis-aligned-in-its-own-frame box: centre (x, z), bottom y0, top y1, yaw `a` from +x toward +z. */
export interface Box {x: number; z: number; y0: number; y1: number; w: number; d: number; a: number; c: number}

/** Segment buckets for "is this point within r of any line of this class" queries. */
export class Corridors {
  private cell = 50;
  private map = new Map<number, {a: P; b: P; r: number; tag: string}[]>();
  add(points: P[], r: number, tag: string) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      const c0 = Math.floor((Math.min(a[0], b[0]) - r) / this.cell), c1 = Math.floor((Math.max(a[0], b[0]) + r) / this.cell);
      const r0 = Math.floor((Math.min(a[1], b[1]) - r) / this.cell), r1 = Math.floor((Math.max(a[1], b[1]) + r) / this.cell);
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        const k = rr * 100003 + cc, list = this.map.get(k) ?? [];
        list.push({a, b, r, tag}); this.map.set(k, list);
      }
    }
  }
  /** First tag whose buffer contains the point, or undefined. `pad` grows every buffer. */
  hit(x: number, z: number, pad = 0, except?: string): string | undefined {
    for(let r=Math.floor((z-pad)/this.cell); r<=Math.floor((z+pad)/this.cell); r++)
      for(let c=Math.floor((x-pad)/this.cell); c<=Math.floor((x+pad)/this.cell); c++)
    for (const s of this.map.get(r*100003+c) ?? []) {
      if(s.tag===except)continue;
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l = dx * dx + dz * dz;
      const t = l ? Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / l)) : 0;
      if (Math.hypot(x - s.a[0] - t * dx, z - s.a[1] - t * dz) < s.r + pad) return s.tag;
    }
    return undefined;
  }

  /** Compare the rotated footprint itself with buffered segments. */
  hitsFootprint(x:number,z:number,w:number,d:number,angle=0):boolean {
    const c=Math.cos(angle), s=Math.sin(angle), u=w/2, v=d/2;
    const local=([px,pz]:P):P=>[(px-x)*c+(pz-z)*s,-(px-x)*s+(pz-z)*c];
    const corners:P[]=[[-u,-v],[u,-v],[u,v],[-u,v]];
    const [l,t,r,b]=bbox(corners.map(([du,dv])=>[x+du*c-dv*s,z+du*s+dv*c]));
    const distanceToBox=([px,pz]:P)=>Math.hypot(Math.max(0,Math.abs(px)-u),Math.max(0,Math.abs(pz)-v));
    for(let row=Math.floor(t/this.cell);row<=Math.floor(b/this.cell);row++)
      for(let col=Math.floor(l/this.cell);col<=Math.floor(r/this.cell);col++)
        for(const segment of this.map.get(row*100003+col)??[]){
          const a=local(segment.a), end=local(segment.b);
          if(distanceToBox(a)<=segment.r||distanceToBox(end)<=segment.r||
            corners.some((p,i)=>segDist(...p,a,end)<=segment.r||
              segmentMeeting(p,corners[(i+1)%4]!,a,end)))return true;
        }
    return false;
  }
}

export interface River {id: string; points: P[]; s: number[]; level: number[]; half: number; widths: number[]; downstream: 'start' | 'end'}
export interface Ribbon {
  id: string; cls: string; points: P[]; ys: number[]; half: number;
  /** false where the ribbon spans water (bridge decks) and needs no embankment skirt. */
  skirt: boolean[];
  /** Mask ids that clear this vertex (streets only). */
  masked: string[][];
}
export interface Bridge {id: string; carries: string; over: string; at: P; deck: number; clearance: number; span: number; boxes: Box[]; name: string[]; basis: string}
export interface Gap {id: string; road: string; at: P; r: number}

export interface RiverCfg {width: number; downstream: 'start' | 'end'}
export interface RoadCfg {width: number; class: string; carriageway?: number}
export interface RailCfg {bed: number; tracks: number[]; clip?: string}
export interface BridgeCfg {carries: string; over: string; deck_width: number; clearance_m: number; pier_spacing_m: number}
export type CrossingEstimate = {type: 'level' | 'span'; reason: string};
export interface NetCfg {
  roads: Record<string, RoadCfg>; rail: Record<string, RailCfg | number>;
  rivers: Record<string, RiverCfg | number>; bridges: Record<string, BridgeCfg>;
  estimatedCrossings?: Record<string, CrossingEstimate>;
}

const LIFT: Record<string, number> = {main: 0.45, minor: 0.4, street: 0.38, lane: 0.34, works: 0.28, arterial:0.28, carriageway: 0.5};
const median = (xs: number[]) => [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)]!;

export function levelAt(r: River, x: number, z: number) {
  return interpolate(r.s,r.level,nearest(r.points,x,z).s);
}
function interpolate(chain: number[], values: number[], s: number) {
  let i = 1;
  while (i < chain.length - 1 && chain[i]! < s) i++;
  const t = Math.max(0, Math.min(1, (s - chain[i - 1]!) / ((chain[i]! - chain[i - 1]!) || 1)));
  return values[i - 1]! * (1 - t) + values[i]! * t;
}

/** River surfaces from the pre-carve lattice: windowed minimum, non-increasing downstream, tributaries no lower than the trunk. */
export function rivers(b: Basin, l: Lattice, cfg: NetCfg): River[] {
  const out: River[] = [];
  for (const [id, c] of Object.entries(cfg.rivers)) {
    if (typeof c === 'number') continue;
    const line = b.lines.get(id);
    if (!line) throw Error('River not in base map: ' + id);
    const points = densify(line.points, 10), s = chainage(points);
    const ground = points.map(([x, z]) => l.at(x, z));
    const level = ground.map((_, i) => {
      let m = Infinity;
      for (let k = Math.max(0, i - 10); k <= Math.min(points.length - 1, i + 10); k++) m = Math.min(m, ground[k]!);
      return m - 0.8;
    });
    if (c.downstream === 'start') for (let i = level.length - 2; i >= 0; i--) level[i] = Math.min(level[i]!, level[i + 1]!);
    else for (let i = 1; i < level.length; i++) level[i] = Math.min(level[i]!, level[i - 1]!);
    out.push({id, points, s, level, half: c.width / 2, widths:s.map(()=>c.width/2), downstream: c.downstream});
  }
  // Join pass: where a river's downstream end meets another river, the receiving river is no higher
  // than that end from the junction downstream. Lowering only the downstream part keeps both monotone.
  for (let pass = 0; pass < 2; pass++) for (const r of out) {
    const end = r.downstream === 'start' ? r.points[0]! : r.points.at(-1)!;
    const endLevel = r.downstream === 'start' ? r.level[0]! : r.level.at(-1)!;
    for (const q of out) {
      if (q === r) continue;
      const {d, s} = nearest(q.points, end[0], end[1]);
      if (d > 40) continue;
      q.level = q.level.map((v, i) => (q.downstream === 'start' ? q.s[i]! <= s + 1 : q.s[i]! >= s - 1) ? Math.min(v, endLevel) : v);
    }
  }
  // Match adjoining main reaches exactly; tributaries remain independent at their mouths.
  for (const a of out) for (const q of out) {
    if (a === q) continue;
    const head = a.downstream==='start'?0:a.points.length-1, tail = q.downstream==='start'?q.points.length-1:0;
    if (Math.hypot(a.points[head]![0]-q.points[tail]![0],a.points[head]![1]-q.points[tail]![1]) > .01) continue;
    const shared = (a.half+q.half)/2, level = Math.min(a.level[head]!,q.level[tail]!);
    for (const [r,k] of [[a,head],[q,tail]] as const) {
      r.widths = r.s.map(s=>shared+(r.half-shared)*Math.min(1,Math.abs(s-r.s[k]!)/120));
      r.level[k]=level;
    }
  }
  return out;
}

/** Visible water cells: one level per pond, from the lowest quarter of its boundary. */
export function ponds(b: Basin, l: Lattice) {
  return b.cover.filter(a => a.kind === 'water').map(a => {
    const edge = densify([...a.poly.rings[0]!, a.poly.rings[0]![0]!], 10).map(([x, z]) => l.at(x, z));
    const sorted = [...edge].sort((p, q) => p - q);
    return {id: a.id, parent: a.parent, poly: a.poly, level: sorted[Math.floor(sorted.length / 4)]! - 0.15};
  });
}

function profile(l: Lattice, points: P[], lift: number, radius: number) {
  const ground = points.map(([x, z]) => l.at(x, z) + lift);
  return ground.map((g, i) => {
    let s = 0, n = 0;
    for (let k = Math.max(0, i - radius); k <= Math.min(points.length - 1, i + radius); k++) { s += ground[k]!; n++; }
    return Math.max(g, s / n);
  });
}

export interface Network {
  rivers: River[]; ribbons: Ribbon[]; tracks: Ribbon[]; bridges: Bridge[]; gaps: Gap[];
  corridors: Corridors; water: Corridors;
}

export function network(b: Basin, l: Lattice, cfg: NetCfg, rs: River[]): Network {
  const ribbons: Ribbon[] = [], tracks: Ribbon[] = [], bridges: Bridge[] = [], gaps: Gap[] = [];
  const corridors = new Corridors(), water = new Corridors();
  const riverById = new Map(rs.map(r => [r.id, r]));
  const half = (id: string) => {
    const r = cfg.roads[id], q = cfg.rail[id], w = cfg.rivers[id];
    if (r) return r.width / 2;
    if (q && typeof q !== 'number') return q.bed / 2;
    if (w && typeof w !== 'number') return w.width / 2;
    return 4;
  };
  const bridgeCfgs = new Map(Object.entries(cfg.bridges));
  const levelByRoad = new Map<string,{at:P; rail:string}[]>();
  // Reviewed visual treatments never promote the underlying GIS crossing type.
  for (const id of Object.keys(cfg.estimatedCrossings ?? {}))
    if (!b.crossings.some(c => c.id === id && c.kind === 'crossing_undetermined')) throw Error('Estimated crossing not unresolved: '+id);
  for (const c of b.crossings.filter(c => c.kind === 'crossing_undetermined')) {
    const road = c.links.find(id => cfg.roads[id]), other = c.links.find(id => id !== road);
    const est = cfg.estimatedCrossings?.[c.id];
    if (!road || !other) { if (est) throw Error('Missing estimated crossing inputs: '+c.id); continue; }
    if (!est) { gaps.push({id: c.id, road, at: c.at, r: half(other) + 5}); continue; }
    if (!est.reason.trim()) throw Error('Missing estimated crossing rationale: '+c.id);
    if (est.type === 'span' && riverById.has(other))
      bridgeCfgs.set(c.id,{carries:road,over:other,deck_width:cfg.roads[road]!.width,clearance_m:2.6,pier_spacing_m:24});
    else if (est.type === 'level' && typeof cfg.rail[other] === 'object')
      (levelByRoad.get(road) ?? levelByRoad.set(road, []).get(road)!).push({at:c.at,rail:other});
    else throw Error('Invalid estimated crossing type: '+c.id);
  }
  // Bridges first: they set long-profile overrides on the lines they carry.
  const overrides = new Map<string, {s0: number; half: number; deck: number; grade: number}[]>();
  for (const [id, bc] of bridgeCfgs) {
    const spot = b.crossings.find(c => c.id === id), line = b.lines.get(bc.carries), river = riverById.get(bc.over);
    if (!spot || !line || !river) throw Error('Bridge inputs missing: ' + id);
    const pts = densify(line.points, 8), {s: s0} = nearest(pts, ...spot.at);
    const isRail = !!cfg.rail[bc.carries];
    // Use the crossing angle to fit the span to the apparent channel width.
    const q = nearest(river.points,...spot.at).s, a0 = pointAt(pts,s0-12), a1 = pointAt(pts,s0+12);
    const w0 = pointAt(river.points,q-12), w1 = pointAt(river.points,q+12);
    const dx = a1[0]-a0[0], dz = a1[1]-a0[1], wx = w1[0]-w0[0], wz = w1[1]-w0[1];
    const crossAngle = Math.max(.55, Math.abs(dx*wz-dz*wx)/(Math.hypot(dx,dz)*Math.hypot(wx,wz)||1));
    const span = 2 * (interpolate(river.s,river.widths,q)/crossAngle + 12);
    const at = (s: number): P => pointAt(pts, s);
    const lift = isRail ? 0.6 : 0.45;
    const level = levelAt(river, ...spot.at);
    const abut = Math.max(l.at(...at(s0 - span / 2)), l.at(...at(s0 + span / 2))) + lift;
    // Deck top: clearance above the water surface (structure depth included), never below the approaches.
    const deck = Math.max(level + bc.clearance_m, abut);
    (overrides.get(bc.carries) ?? overrides.set(bc.carries, []).get(bc.carries)!)
      .push({s0, half: span / 2, deck, grade: isRail ? 0.012 : 0.04});
    bridges.push({id, carries: bc.carries, over: bc.over, at: spot.at, deck, clearance: bc.clearance_m, span, name: [spot.raw.name_en, spot.raw.name_zh],
      basis: cfg.estimatedCrossings?.[id]?'estimated':spot.basis,
      boxes: bridgeBoxes(at(s0 - span / 2), at(s0 + span / 2), deck, level, bc, isRail)});
  }
  const lineProfile = (id: string, pts: P[], lift: number, radius: number) => {
    let ys = profile(l, pts, lift, radius);
    const skirt = pts.map(() => true), s = chainage(pts);
    for (const o of overrides.get(id) ?? []) ys = ys.map((y, i) => {
      const d = Math.abs(s[i]! - o.s0) - o.half;
      if (d <= 0) { skirt[i] = false; return o.deck; }
      return Math.max(y, o.deck - d * o.grade);
    });
    return {ys, skirt};
  };
  for (const [id, rc] of Object.entries(cfg.roads)) {
    const line = b.lines.get(id);
    if (!line) throw Error('Road not in base map: ' + id);
    const mine = gaps.filter(g => g.road === id);
    const pts = densify(line.points, 8);
    const {ys, skirt} = lineProfile(id, pts, LIFT[rc.class] ?? 0.4, 3);
    for (const est of levelByRoad.get(id) ?? []) {
      const rail = densify(b.lines.get(est.rail)!.points,8), s = chainage(rail);
      const heights = lineProfile(est.rail,rail,.6,6).ys, at = nearest(rail,...est.at).s;
      const y = interpolate(s,heights,at)+.17;
      const rd = chainage(pts), center = nearest(pts,...est.at).s, r = half(est.rail)+2;
      pts.forEach((_,i) => {
        const u = Math.max(0,Math.min(1,(Math.abs(rd[i]!-center)-r)/23)), w = u*u*(3-2*u);
        if (skirt[i]) ys[i]=y*(1-w)+ys[i]!*w;
      });
    }
    const masked = pts.map(([x, z]) => rc.class === 'street' || rc.class === 'lane'
      ? b.masks.filter(m => m.clears.includes('streets') && contains(m.poly, x, z)).map(m => m.id) : []);
    const keep = pts.map(([x, z]) => mine.every(g => Math.hypot(x - g.at[0], z - g.at[1]) > g.r));
    for (const run of indexRuns(keep)) ribbons.push(slice({id, cls: rc.class, points: pts, ys, half: rc.width / 2, skirt, masked}, run));
    if (rc.carriageway) {
      const cy = ys.map(y => y + LIFT.carriageway! - LIFT.works!);
      for (const run of indexRuns(keep)) ribbons.push(slice({id: id + '/carriageway', cls: rc.class==='arterial'?'pavement':'carriageway', points: pts, ys: cy,
        half: rc.carriageway / 2, skirt: skirt.map(() => false), masked}, run));
      if(rc.class==='arterial')for(const side of [-1,1]){
        const edge=offset(pts,side*(rc.carriageway/2+.85));
        const kerb=edge.map(([x,z],i)=>Math.max(l.at(x,z)+.15,ys[i]!+.20));
        for(const run of indexRuns(keep))ribbons.push(slice({id:`${id}/edge/${side}`,cls:'paved-edge',
          points:edge,ys:kerb,half:.43,skirt:skirt.map(()=>false),masked},run));
      }
    }
    corridors.add(line.points, rc.width / 2, 'road:' + id);
  }
  const main = b.lines.get('rail-main')!.points;
  const clearance = typeof cfg.rail.track_clearance_m === 'number' ? cfg.rail.track_clearance_m : 4.2;
  for (const [id, rc] of Object.entries(cfg.rail)) {
    if (typeof rc === 'number') continue;
    const line = b.lines.get(id);
    if (!line) throw Error('Rail not in base map: ' + id);
    const clip: Poly | undefined = rc.clip ? b.areaPicks.get(rc.clip)?.poly : undefined;
    if (rc.clip && !clip) throw Error('Clip area missing: ' + rc.clip);
    const pts = densify(line.points, 8);
    const bedLift = id === 'rail-main' || id === 'rail-west-corridor' ? 0.6 : 0.52;
    const {ys, skirt} = lineProfile(id, pts, bedLift, 6);
    const none = pts.map(() => [] as string[]);
    const inClip = (p: P) => !clip || contains(clip, p[0], p[1]);
    for (const run of indexRuns(pts.map(inClip))) ribbons.push(slice({id, cls: 'ballast', points: pts, ys, half: rc.bed / 2, skirt, masked: none}, run));
    for (const o of rc.tracks) {
      const tp = o ? offset(pts, o) : pts;
      const ok = tp.map(p => inClip(p) && (id === 'rail-main' || nearest(main, p[0], p[1]).d > clearance));
      for (const run of indexRuns(ok)) tracks.push(slice({id: `${id}@${o}`, cls: 'track', points: tp, ys: ys.map(y => y + 0.16),
        half: 1.35, skirt: skirt.map(() => false), masked: none}, run));
    }
    corridors.add(clip ? line.points.filter(inClip) : line.points, rc.bed / 2 + 3, 'rail:' + id);
  }
  return {rivers: rs, ribbons, tracks, bridges, gaps, corridors, water};
}

export function pointAt(pts: P[], s: number): P {
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (run + l >= s || i === pts.length - 1) {
      const t = Math.max(0, Math.min(1, (s - run) / (l || 1)));
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    run += l;
  }
  return pts[0]!;
}

/** Stop an avenue edge at side-road mouths, while keeping parallel roads and through joins intact. */
export function openKerbAtJunctions(edge:Ribbon, avenue:Ribbon, roads:readonly Ribbon[]):Ribbon[] {
  const mouths=new Corridors();
  const bounds=bbox(avenue.points);
  let junctions=0;
  for(const road of roads){
    if(road.id===avenue.id)continue;
    const [l,t,r,b]=bbox(road.points);
    if(l>bounds[2]||r<bounds[0]||t>bounds[3]||b<bounds[1])continue;
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1]!, end=road.points[i]!;
      for(let j=1;j<avenue.points.length;j++){
        const c=avenue.points[j-1]!, d=avenue.points[j]!;
        const ux=end[0]-a[0],uz=end[1]-a[1],vx=d[0]-c[0],vz=d[1]-c[1];
        if(Math.abs(ux*vz-uz*vx)<.25*Math.hypot(ux,uz)*Math.hypot(vx,vz))continue;
        const at=segmentMeeting(a,end,c,d);
        if(!at)continue;
        const s=nearest(road.points,...at).s, reach=avenue.half*4+road.half;
        // Take a local portion of the connected road, including both sides at a crossroad.
        const chain=chainage(road.points);
        const from=Math.max(0,s-reach),to=Math.min(chain.at(-1)!,s+reach);
        mouths.add([pointAt(road.points,from),...road.points.filter((_,i)=>chain[i]!>from&&chain[i]!<to),
          pointAt(road.points,to)],road.half+edge.half+.5,road.id);
        junctions++;
      }
    }
  }
  if(!junctions)return [edge];
  const points:P[]=[],ys:number[]=[],skirt:boolean[]=[],masked:string[][]=[];
  for(let i=1;i<edge.points.length;i++){
    const segment=densify([edge.points[i-1]!,edge.points[i]!],1);
    segment.forEach((p,j)=>{
      if(i>1&&j===0)return;
      const t=j/(segment.length-1);
      points.push(p);ys.push(edge.ys[i-1]!*(1-t)+edge.ys[i]!*t);
      skirt.push(false);masked.push(edge.masked[j===segment.length-1?i:i-1]!);
    });
  }
  return indexRuns(points.map(p=>!mouths.hit(...p))).map(run=>slice({...edge,points,ys,skirt,masked},run));
}
function indexRuns(keep: boolean[]) {
  const out: [number, number][] = [];
  let start = -1;
  keep.forEach((k, i) => {
    if (k && start < 0) start = i;
    if (!k && start >= 0) { if (i - start > 1) out.push([start, i]); start = -1; }
  });
  if (start >= 0 && keep.length - start > 1) out.push([start, keep.length]);
  return out;
}
function slice(r: Ribbon, [a, b]: [number, number]): Ribbon {
  return {...r, points: r.points.slice(a, b), ys: r.ys.slice(a, b), skirt: r.skirt.slice(a, b), masked: r.masked.slice(a, b)};
}

// Generic girder span: deck slab, edge girders, parapets, piers on the bed, abutments. Not a survey of either bridge.
function bridgeBoxes(a: P, b: P, deck: number, level: number, c: BridgeCfg, rail: boolean): Box[] {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, ux = Math.cos(ang), uz = Math.sin(ang);
  const out: Box[] = [];
  const at = (along: number, across: number): [number, number] => [cx + ux * along - uz * across, cz + uz * along + ux * across];
  const w = c.deck_width;
  out.push({x: cx, z: cz, y0: deck - 1.1, y1: deck - 0.04, w: len + 2, d: w, a: ang, c: 0x9a978c});
  for (const side of [-1, 1]) {
    const [x, z] = at(0, side * (w / 2 + 0.3));
    out.push({x, z, y0: deck - 1.6, y1: deck + (rail ? 0.5 : 0.9), w: len + 2, d: 0.6, a: ang, c: rail ? 0x5d6664 : 0xb9b4a4});
  }
  const piers = Math.max(1, Math.round(len / c.pier_spacing_m) - 1);
  for (let k = 1; k <= piers; k++) {
    const [x, z] = at(-len / 2 + k * len / (piers + 1), 0);
    out.push({x, z, y0: level - 2.5, y1: deck - 1.1, w: 1.8, d: w + 1.2, a: ang, c: 0x8f8b80});
  }
  for (const end of [-1, 1]) {
    const [x, z] = at(end * (len / 2 + 2), 0);
    out.push({x, z, y0: level - 2.5, y1: deck - 0.05, w: 5, d: w + 3, a: ang, c: 0xa49c8c});
  }
  return out;
}
