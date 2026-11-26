// Reusable block generators. Each takes a polygon, a grain angle, a seed and an environment, and returns
// placement records. They know nothing about the base-map file, so the same kits can fill any later area.
// All dimensions are art parameters in metres; no footprint, count, height or crop is an observation.
import {bbox, contains, densify, type P, type Poly} from './geom';
import {rng, weighted, type Rand} from './rng';
import type {Box} from './network';

export type Arch = 'village_row' | 'lingnan_block' | 'danwei_slab' | 'worksite_shed'
  | 'standard_factory' | 'factory_hall' | 'early_highrise' | 'worker_dorm' | 'estate_slab' | 'village_villa';
export type Roof = 'gable' | 'flat' | 'low';
/** Facade grid per archetype: one U repeat = one bay, one V repeat = one storey (protocol §UV). */
export const ARCH: Record<Arch, {bay: number; storey: number; roof: Roof}> = {
  village_row: {bay: 4, storey: 3.2, roof: 'gable'},
  lingnan_block: {bay: 4, storey: 3.4, roof: 'gable'},
  danwei_slab: {bay: 3.6, storey: 3.0, roof: 'flat'},
  worksite_shed: {bay: 6, storey: 4.5, roof: 'low'},
  standard_factory: {bay: 6, storey: 4.2, roof: 'flat'},
  factory_hall: {bay: 6, storey: 5.2, roof: 'low'},
  early_highrise: {bay: 3.2, storey: 3.2, roof: 'flat'},
  worker_dorm: {bay: 3.6, storey: 3.1, roof: 'flat'},
  estate_slab: {bay: 3.6, storey: 3.0, roof: 'flat'},
  village_villa: {bay: 3, storey: 3.4, roof: 'flat'},
};
export interface Building {
  key: string; parent: string; arch: Arch; x: number; z: number; a: number;
  w: number; d: number; floors: number; base: number; foot: number; tone: number; masks: string[];
  stage?: 'tower_works';
  /** Arcade opens toward the building's local +z side. */
  arcade?: true;
}
export interface Tree {key: string; kind: 'banyan' | 'lychee' | 'bamboo' | 'pine' | 'scrub'; x: number; z: number; base: number; h: number; r: number; tone: number; masks: string[]}
export interface Piece extends Box {key: string; role: string; masks: string[]}

export interface Env {
  height(x: number, z: number): number;
  /** True where nothing may be generated: corridors, water, other cover, outside the window. */
  blocked(x: number, z: number): boolean;
  /** Mask ids clearing `what` at this point. */
  masks(x: number, z: number, what: 'buildings' | 'trees' | 'fields' | 'ponds' | 'streets'): string[];
}
export interface Area {id: string; poly: Poly}

/** Rotated frame helpers: u along the grain, v across it. */
function frame(a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return {
    toWorld: (u: number, v: number): P => [u * c - v * s, u * s + v * c],
    toLocal: (x: number, z: number): P => [x * c + z * s, -x * s + z * c],
  };
}
function localBox(poly: Poly, f: ReturnType<typeof frame>) {
  return bbox(poly.rings[0]!.map(([x, z]) => f.toLocal(x, z)));
}
export const corners = (x: number, z: number, a: number, w: number, d: number): P[] => {
  const c = Math.cos(a), s = Math.sin(a), out: P[] = [];
  for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) out.push([x + c * i * w / 2 - s * j * d / 2, z + s * i * w / 2 + c * j * d / 2]);
  return out;
};
/** Corners plus perimeter samples every 3 m, so a narrow lane or ditch cannot slip between two corners. */
export function fits(area: Area, env: Env, pts: P[]) {
  const probe = pts.length >= 4 ? [...densify([...pts.slice(0, 4), pts[0]!], 3), ...pts.slice(4)] : pts;
  return probe.every(([x, z]) => contains(area.poly, x, z) && !env.blocked(x, z));
}
function maskUnion(env: Env, pts: P[], what: Parameters<Env['masks']>[2]) {
  return [...new Set(pts.flatMap(([x, z]) => env.masks(x, z, what)))];
}

// ---------------------------------------------------------------- settlement blocks

interface Rect {u: number; v: number; w: number; d: number; turn: boolean; floors: number; arch: Arch; stage?: Building['stage']; arcade?: true; flip?: true}
type Layout = (r: Rand, size: number) => {rects: Rect[]; trees: P[]};

/** 梳式 village rows: houses side by side in lines, narrow lanes between lines and columns. */
const villageRows: Layout = (r, size) => {
  const rects: Rect[] = [], trees: P[] = [];
  const depth = r() < 0.5 ? 10 : 12, laneV = 2 + r() * 1.2;
  for (let v = depth / 2; v + depth / 2 <= size; v += depth + laneV) {
    let u = 0;
    while (true) {
      const w = r() < 0.6 ? 12 : 8;
      if (u + w > size) break;
      const roll = r();
      if (roll < 0.1) trees.push([u + w / 2, v]);
      else if (roll > 0.04) rects.push({u: u + w / 2, v, w, d: depth, turn: false, floors: r() < 0.14 ? 2 : 1, arch: 'village_row'});
      u += w + (r() < 0.7 ? 1.4 : 3.2);
    }
  }
  return {rects, trees};
};
/** Lingnan market-town block: pitched-roof terraces on the four frontages, a few back rooms, open yards. */
const lingnanBlock: Layout = (r, size) => {
  const rects: Rect[] = [], trees: P[] = [];
  const depth = 12 + Math.floor(r() * 2) * 2;
  const floors = () => { const x = r(); return x < 0.15 ? 1 : x < 0.8 ? 2 : 3; };
  const terrace = (from: number, to: number, place: (c: number, w: number) => Omit<Rect, 'floors' | 'arch' | 'w'>) => {
    let c = from;
    while (true) {
      const w = r() < 0.55 ? 4 : 8;
      if (c + w > to) break;
      if (r() > 0.05) rects.push({...place(c + w / 2, w), w, floors: floors(), arch: 'lingnan_block', arcade:true});
      c += w;
    }
  };
  terrace(0, size, (c) => ({u: c, v: depth / 2, d: depth, turn: false, flip:true}));
  terrace(0, size, (c) => ({u: c, v: size - depth / 2, d: depth, turn: false}));
  terrace(depth + 1, size - depth - 1, (c) => ({u: depth / 2, v: c, d: depth, turn: true}));
  terrace(depth + 1, size - depth - 1, (c) => ({u: size - depth / 2, v: c, d: depth, turn: true, flip:true}));
  const inner = size - 2 * depth - 4;
  if (inner > 10) {
    for (let k = 0; k < 3; k++) if (r() < 0.55) {
      const w = 8, d = 6, u = depth + 2 + w / 2 + r() * (inner - w), v = depth + 2 + d / 2 + r() * (inner - d);
      if (!rects.some(q => Math.abs(q.u - u) < (q.w + w) / 2 + 1 && Math.abs(q.v - v) < (q.d + d) / 2 + 1))
        rects.push({u, v, w, d, turn: false, floors: 1, arch: 'lingnan_block'});
    }
    if (r() < 0.6) trees.push([size / 2 + (r() - 0.5) * inner * 0.6, size / 2 + (r() - 0.5) * inner * 0.6]);
  }
  return {rects, trees};
};
/** Danwei compound: parallel walk-up slabs with generous spacing, flat roofs. */
const danweiSlabs: Layout = (r, size) => {
  const rects: Rect[] = [], trees: P[] = [];
  const bay = ARCH.danwei_slab.bay, d = 11;
  const bays = Math.min(Math.floor((size - 4) / bay), 10 + Math.floor(r() * 6)), w = bays * bay;
  const gap = 15 + r() * 5;
  for (let v = 2 + d / 2; v + d / 2 <= size - 2; v += d + gap) {
    rects.push({u: size / 2 + (r() - 0.5) * (size - 4 - w), v, w, d, turn: false, floors: 3 + Math.floor(r() * 3), arch: 'danwei_slab'});
    trees.push([4 + r() * (size - 8), Math.min(size - 2, v + d / 2 + gap / 2)]);
  }
  return {rects, trees};
};
const factory: Layout = (r, size) => {
  const w = 6 * Math.min(Math.floor((size - 2) / 6), 7 + Math.floor(r() * 4)), d = 16 + 2 * Math.floor(r() * 4);
  const rects: Rect[] = [];
  if (w >= 42 && size >= d + 2) rects.push({u:size/2,v:size/2,w,d,turn:false,floors:4+Math.floor(r()*3),arch:'standard_factory'});
  return {rects,trees:[]};
};
const factoryHall: Layout = (r, size) => {
  const w = 6 * Math.min(Math.floor((size - 6) / 6), 6 + Math.floor(r() * 4));
  const d = Math.min(size * .54, 25 + Math.floor(r() * 3) * 3);
  const rects: Rect[] = w >= 30 && d >= 20 ?
    [{u:size/2,v:size*.51,w,d,turn:false,floors:1,arch:'factory_hall'}] : [];
  return {rects,trees:[]};
};
const tower = (works: boolean): Layout => (r, size) => {
  const w = 32 + 3.2 * Math.floor(r()*3), d = 22.4, rects: Rect[] = [];
  if (size >= w + 2) rects.push({u:size/2,v:size/2,w,d,turn:false,floors:(works?10:12)+Math.floor(r()*7),
    arch:'early_highrise',...(works?{stage:'tower_works' as const}:{})});
  return {rects,trees:[]};
};
const dorms: Layout = (r, size) => {
  const w = 3.6 * Math.min(Math.floor((size-4)/3.6), 9+Math.floor(r()*4)), d = 12;
  const rects: Rect[] = [];
  if (w >= 18) for (let v=2+d/2; v+d/2<=size-2; v+=d+15)
    rects.push({u:size/2,v,w,d,turn:false,floors:5+Math.floor(r()*3),arch:'worker_dorm'});
  return {rects,trees:[]};
};
/** One run of matching walk-ups, with a larger shared court between rows. */
const estate: Layout = (r, size) => {
  const w = 3.6 * Math.min(Math.floor((size-10)/3.6), 10+Math.floor(r()*4));
  const d = 11, floors = r()<.65 ? 5 : 6, rects: Rect[] = [], trees: P[] = [];
  if(w>=25)for(let v=13;v+d/2<=size-5;v+=24)
    rects.push({u:size/2,v,w,d,turn:false,floors,arch:'estate_slab'});
  if(rects.length>1)trees.push([6,22],[size-6,25],[7,29]);
  return {rects,trees};
};
const villas: Layout = (r, size) => {
  const w=r()<0.5?9:12, d=9, rects: Rect[]=[];
  for (let v=2+d/2; v+d/2<=size-2; v+=d+6)
    for (let u=2+w/2; u+w/2<=size-2; u+=w+4)
      rects.push({u,v,w,d,turn:false,floors:2,arch:'village_villa'});
  return {rects,trees:[]};
};
export type SettlementKit = Exclude<Arch, 'worksite_shed'> | 'tower_works';
const LAYOUTS: Record<SettlementKit, Layout> = {
  village_row: villageRows, lingnan_block: lingnanBlock, danwei_slab: danweiSlabs,
  standard_factory:factory, factory_hall:factoryHall, early_highrise:tower(false), tower_works:tower(true),
  worker_dorm:dorms, estate_slab:estate, village_villa:villas,
};

export interface SettlementOpts {parcel: number; lane: number; mix: Partial<Record<SettlementKit, number>>; compound?: boolean}

/** Parcels on a grain-aligned grid; each parcel takes one archetype layout. Footprints that leave the polygon or hit a corridor are dropped. */
export function settlement(area: Area, angle: number, opts: SettlementOpts, env: Env, seed: string,
  owner?: readonly [number, number, number, number]) {
  const f = frame(angle), [u0, v0, u1, v1] = localBox(area.poly, f), P = opts.parcel, S = P - opts.lane;
  const [l, t, r, b] = owner ? bbox([[owner[0],owner[1]],[owner[2],owner[1]],[owner[0],owner[3]],[owner[2],owner[3]]]
    .map(([x,z])=>f.toLocal(x!,z!))) : [u0,v0,u1,v1];
  const owns=(x:number,z:number)=>!owner||(x>=owner[0]&&x<owner[2]&&z>=owner[1]&&z<owner[3]);
  const buildings: Building[] = [], trees: Tree[] = [], pieces: Piece[] = [];
  for (let j = Math.floor(Math.max(v0,t) / P); j * P <= Math.min(v1,b); j++)
  for (let i = Math.floor(Math.max(u0,l) / P); i * P <= Math.min(u1,r); i++) {
    const probe = [[0, 0], [-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]].some(([a, b]) => {
      const [x, z] = f.toWorld(i * P + P / 2 + a! * P, j * P + P / 2 + b! * P);
      return contains(area.poly, x, z);
    });
    if (!probe) continue;
    const r = rng(seed, area.id, i, j), arch = weighted(r, opts.mix);
    const {rects, trees: tps} = LAYOUTS[arch](r, S);
    const ou = i * P + opts.lane / 2, ov = j * P + opts.lane / 2;
    const service=arch==='standard_factory'||arch==='factory_hall'||arch==='early_highrise'||arch==='tower_works';
    const court=opts.compound&&S>=44&&(service||arch==='estate_slab'||arch==='danwei_slab');
    if(court&&service&&rects.length){
      if(rects.every(q=>q.v+q.d/2+.9<=S-9.5))
        rects.push({u:S*.59,v:S-6,w:Math.min(30,S-14),d:7,turn:false,floors:1,arch:'worksite_shed'});
      tps.push([5,S*.15],[9,S*.22],[S-5,S*.17]);
    }
    const parcelKey=`${area.id}/${i},${j}`;
    let mainFits=false;
    rects.forEach((q, k) => {
      const [x, z] = f.toWorld(ou + q.u, ov + q.v);
      const a = angle + (q.turn ? Math.PI / 2 : 0) + (q.flip ? Math.PI : 0);
      const pts = corners(x, z, a, q.w+(court ? .6 : 0), q.d+(court ? 1.2 : 0));
      if (!fits(area, env, [...pts, [x, z]])) return;
      const hs = pts.map(([px, pz]) => env.height(px, pz)), hi = Math.max(...hs), lo = Math.min(...hs);
      if (hi - lo > 4) return;
      if(q.arch!=='worksite_shed')mainFits=true;
      // Consume the same parcel RNG even when another tile owns this record.
      const tone=r();
      const floors=opts.compound&&q.arch==='early_highrise'?Math.min(q.floors,q.stage?7:9):q.floors;
      if(owns(x,z))buildings.push({key: `${parcelKey}/${k}`, parent: area.id, arch: q.arch, x, z, a, w: q.w, d: q.d, floors,
        ...(q.stage?{stage:q.stage}:{}), ...(q.arcade?{arcade:true}:{}),
        base: hi + 0.3, foot: lo - 1.5, tone, masks: maskUnion(env, [...pts, [x, z]], 'buildings')});
    });
    if(court&&mainFits){
      const add=(role:string,u:number,v:number,w:number,d:number,height:number,c:number)=>{
        if(rects.some(q=>Math.abs(q.u-u)<(q.w+w)/2+.35&&Math.abs(q.v-v)<(q.d+d)/2+.6))return;
        const [x,z]=f.toWorld(ou+u,ov+v), pts=corners(x,z,angle,w,d);
        if(!owns(x,z)||!fits(area,env,[...pts,[x,z]]))return;
        const hs=pts.map(p=>env.height(...p)), hi=Math.max(...hs), lo=Math.min(...hs);
        if(hi-lo>1.35)return;
        pieces.push({key:`${parcelKey}/${role}/${u}`,role,x,z,a:angle,w,d,y0:lo-.15,y1:hi+height,c,
          masks:maskUnion(env,pts,'fields')});
      };
      add('service-court',S/2,service?S*.15:arch==='estate_slab'?25:20,S*.61,service?6:7,.065,0xb8ad97);
      if(service){
        add('gate-apron',S/2,S*.08,5,S*.12,.07,0xb8ad97);
        for(const side of [-1,1]){
          add('compound-wall',S/2+side*(S*.21+2.6),2,S*.42,.55,.95,0xc6bba3);
          add('gate-post',S/2+side*2.7,2,.65,.65,1.8,0xada28e);
        }
      }
    }
    tps.forEach(([u, v], k) => {
      const [x, z] = f.toWorld(ou + u, ov + v);
      if (!fits(area, env, [[x, z]])) return;
      if(court&&(!mainFits||rects.some(q=>Math.abs(q.u-u)<q.w/2+3&&Math.abs(q.v-v)<q.d/2+3)))return;
      const kind = arch === 'danwei_slab'||arch==='estate_slab' ? 'lychee' : r() < 0.35 ? 'banyan' : r() < 0.6 ? 'bamboo' : 'lychee';
      const record=tree(`${parcelKey}/t${k}`, kind, x, z, env, r);
      if(owns(x,z))trees.push(court?{...record,r:Math.min(record.r,4.7)}:record);
    });
  }
  return {buildings, trees, pieces};
}

export function tree(key: string, kind: Tree['kind'], x: number, z: number, env: Env, r: Rand): Tree {
  const size: Record<Tree['kind'], [number, number, number, number]> = {
    banyan: [9, 4, 7, 5], lychee: [6, 2, 3.5, 1.5], bamboo: [9, 3, 2.5, 1], pine: [8, 4, 2.4, 1], scrub: [2.4, 1.6, 2, 1.2],
  };
  const [h, dh, rad, dr] = size[kind];
  return {key, kind, x, z, base: env.height(x, z), h: h + r() * dh, r: rad + r() * dr, tone: r(), masks: env.masks(x, z, 'trees')};
}

/** A single aligned compound, not a repeated world-grid parcel. Dimensions
 * describe a model house, yard and lane, not a traced plot or a target count. */
export function villaCourt(area:Area, env:Env){
  const [l,t,r,b]=area.poly.box, buildings:Building[]=[], trees:Tree[]=[], pieces:Piece[]=[];
  const pitch=14.5,depth=13.65;
  for(let j=0,z=t+6.6;z+5.1<b;j++,z+=depth){
    for(let i=0,x=l+8;x+6<r;i++,x+=pitch){
      const key=`${area.id}/row${j}/${i}`,rand=rng('sz-villa-compound',key);
      const service=j===0&&x+pitch+6>=r; // One anonymous service mass at an edge, not a named workshop.
      const arch=service?'worksite_shed':'village_villa', w=service?11:9,d=8.4;
      const ps=corners(x,z,0,w+.55,d+.55);
      if(!fits(area,env,[...ps,[x,z]]))continue;
      const hs=ps.map(([x,z])=>env.height(x,z)),lo=Math.min(...hs),base=Math.max(...hs)+.18;
      if(base-lo>3)continue;
      buildings.push({key,parent:area.id,arch,x,z,a:0,w,d,floors:service?1:2,base,foot:lo-.45,
        tone:rand(),masks:maskUnion(env,ps,'buildings')});
      if(service)continue;
      for(const [role,zz,ww,dd,c] of [
        ['villa-garden',z+5.1,8.7,1.45,0x9c9e74],
        ['villa-lane',z+8.2,pitch-.05,3.36,0xb9b3a3],
        ['villa-drain',z+6.38,pitch-.05,.25,0x8d8d77],
      ] as const){
        const edge=corners(x,zz,0,ww,dd);
        if(!fits(area,env,edge))continue;
        const hs=edge.map(([x,z])=>env.height(x,z));
        pieces.push({key:key+'/'+role,role,x,z:zz,a:0,w:ww,d:dd,c,y0:Math.min(...hs)-.16,
          y1:Math.max(...hs)+.055,masks:maskUnion(env,edge,'fields')});
      }
      if(i%3===1&&j%2===0&&!env.blocked(x-4.6,z+5.3)){
        const planted=tree(key+'/tree','scrub',x-4.6,z+5.3,env,rand);
        trees.push({...planted,h:2.3+rand()*.7,r:1.25+rand()*.35});
      }
    }
  }
  return {buildings,trees,pieces};
}

// ---------------------------------------------------------------- fields and pond mosaics

export type Crop = 'paddy_late' | 'paddy_green' | 'paddy_ripe' | 'vegetable' | 'fallow' | 'flooded';
const CROP: Record<Crop, number> = {
  paddy_late: 0x9fae5c, paddy_green: 0x80a055, paddy_ripe: 0xbfb766, vegetable: 0x6d8d4b, fallow: 0xa8916c, flooded: 0x7f9d92,
};
export const LAND = {bund: 0x8c9d62, ditch: 0x5e8985, ridge: 0x5a7a3f, pond: 0x6c9996, bank: 0x93a06c, pad: 0xc59b6f};
const jitter = (seed: string, id: string, ...k: number[]) => rng(seed, id, 'j', ...k)() - 0.5;

export interface PlotOpts {
  kind: 'field' | 'ponds';
  strip: number; plot: number; ditchEvery: number;
  crops?: Partial<Record<Crop, number>>;
}
/** Grain-aligned strips subdivided into plots. Boundaries jitter per (strip, plot) so neighbours agree. */
export function plots(area: Area, angle: number, o: PlotOpts, env: Env, seed: string): Piece[] {
  const f = frame(angle), [u0, v0, u1, v1] = localBox(area.poly, f), out: Piece[] = [];
  const what = o.kind === 'field' ? 'fields' : 'ponds';
  const vb = (j: number) => j * o.strip + jitter(seed, area.id, j) * o.strip * 0.35;
  const ub = (j: number, k: number) => k * o.plot + jitter(seed, area.id, j, k) * o.plot * 0.45;
  const crops = o.crops ?? {paddy_late: 4, paddy_green: 2, paddy_ripe: 1.5, vegetable: 1.2, fallow: 0.6, flooded: 0.4};
  for (let j = Math.floor(v0 / o.strip) - 1; vb(j) <= v1; j++) for (let k = Math.floor(u0 / o.plot) - 1; ub(j, k) <= u1; k++) {
    const ditch = o.ditchEvery > 0 && j % o.ditchEvery === 0;
    const va = vb(j) + (ditch ? 1.4 : 0), vz = vb(j + 1), ua = ub(j, k), uz = ub(j, k + 1);
    const w = uz - ua, d = vz - va;
    if (w < 8 || d < 6) continue;
    const [x, z] = f.toWorld((ua + uz) / 2, (va + vz) / 2), pts = corners(x, z, angle, w, d);
    if (!fits(area, env, [...pts, [x, z]])) continue;
    const hs = pts.map(([px, pz]) => env.height(px, pz)), hi = Math.max(...hs), lo = Math.min(...hs);
    if (hi - lo > 3.5) continue;
    const r = rng(seed, area.id, 'p', j, k), key = `${area.id}/${j},${k}`, masks = maskUnion(env, pts, what);
    const top = hi + 0.12;
    const dry = o.kind === 'ponds' && r() < 0.16;
    const crop = o.kind === 'field' ? weighted(r, crops) : undefined;
    const color = o.kind === 'ponds' ? (dry ? CROP.vegetable : LAND.pond) : CROP[crop!];
    const role = o.kind === 'ponds' && !dry ? 'pond-cell' : 'plot';
    out.push({key, role, masks, x, z, y0: lo - 0.6, y1: top, w, d, a: angle, c: color});
    // Bunds sit inside each plot's own edge, so shared edges never overlap.
    const bw = o.kind === 'ponds' ? 2.2 : 0.9, bh = o.kind === 'ponds' ? 0.75 : 0.32;
    const edges = [[0, -(d - bw) / 2, w, bw], [0, (d - bw) / 2, w, bw], [-(w - bw) / 2, 0, bw, d - 2 * bw], [(w - bw) / 2, 0, bw, d - 2 * bw]] as const;
    for (const [side, [du, dv, bwid, bdep]] of edges.entries()) {
      const [bx, bz] = f.toWorld((ua + uz) / 2 + du, (va + vz) / 2 + dv);
      out.push({key: `${key}/b${side}`, role: 'bund', masks, x: bx, z: bz, y0: top - 0.3, y1: top + bh, w: bwid, d: bdep, a: angle,
        c: o.kind === 'ponds' ? LAND.bank : LAND.bund});
    }
    if (ditch) {
      const [dx, dz] = f.toWorld((ua + uz) / 2, vb(j) + 0.7);
      if (fits(area, env, corners(dx, dz, angle, w, 1.4))) out.push({key: key + '/d', role: 'ditch', masks, x: dx, z: dz, y0: lo - 1, y1: top - 0.3, w, d: 1.4, a: angle, c: LAND.ditch});
    }
    if (crop === 'vegetable') for (let v = va + 2, row = 0; v < vz - 1.6; v += 2.2, row++) {
      const [rx, rz] = f.toWorld((ua + uz) / 2, v);
      out.push({key: `${key}/r${row}`, role: 'ridge', masks, x: rx, z: rz, y0: top - 0.1, y1: top + 0.22, w: w - 2.4, d: 0.9, a: angle, c: LAND.ridge});
    }
  }
  return out;
}

// ---------------------------------------------------------------- trees and worksites

/** Jittered grid thinned by value noise, so trees gather into groves and leave clearings. */
export function grove(area: Area, spacing: number, density: number, kinds: Partial<Record<Tree['kind'], number>>, env: Env, seed: string): Tree[] {
  const [x0, z0, x1, z1] = area.poly.box, out: Tree[] = [];
  const noise = (x: number, z: number) => {
    const cell = 90, i = Math.floor(x / cell), j = Math.floor(z / cell), u = x / cell - i, v = z / cell - j;
    const n = (a: number, b: number) => rng(seed, 'grove', a, b)();
    const s = (t: number) => t * t * (3 - 2 * t);
    return (n(i, j) * (1 - s(u)) + n(i + 1, j) * s(u)) * (1 - s(v)) + (n(i, j + 1) * (1 - s(u)) + n(i + 1, j + 1) * s(u)) * s(v);
  };
  for (let j = Math.floor(z0 / spacing); j * spacing <= z1; j++) for (let i = Math.floor(x0 / spacing); i * spacing <= x1; i++) {
    const r = rng(seed, area.id, 't', i, j);
    const x = (i + r()) * spacing, z = (j + r()) * spacing;
    if (r() > density * (noise(x, z) * 1.6 - 0.25)) continue;
    if (!contains(area.poly, x, z) || env.blocked(x, z)) continue;
    out.push(tree(`${area.id}/g${i},${j}`, weighted(r, kinds), x, z, env, r));
  }
  return out;
}

/** Graded pads, temporary sheds and stockpiles on a works clearing. */
export function worksite(area: Area, angle: number, env: Env, seed: string, compound = false) {
  const f = frame(angle), [u0, v0, u1, v1] = localBox(area.poly, f), P = compound ? 42 : 56;
  const pieces: Piece[] = [], buildings: Building[] = [];
  // Centre the works grid in the interpreted envelope so a narrow site can hold one yard.
  const offset = (lo:number,hi:number)=>compound
    ? (lo+hi)/2-(Math.max(1,Math.floor((hi-lo+8)/P))%2 ? P/2 : 0)
    : 0;
  const ou=offset(u0,u1), ov=offset(v0,v1);
  for (let j = Math.floor((v0-ov) / P); ov+j*P <= v1; j++)
  for (let i = Math.floor((u0-ou) / P); ou+i*P <= u1; i++) {
    const r = rng(seed, area.id, i, j), key = `${area.id}/${i},${j}`;
    const jitter=compound ? 3 : 0;
    const u=ou+i*P+P/2+(compound ? (r()-.5)*jitter : 0);
    const v=ov+j*P+P/2+(compound ? (r()-.5)*jitter : 0);
    const [x, z] = f.toWorld(u,v), pw = compound ? 24+r()*10 : 30+r()*18, pd = compound ? 22+r()*10 : 26+r()*18;
    const pts = corners(x, z, angle, pw, pd);
    if ((!compound && r() < 0.25) || !fits(area, env, [...pts, [x, z]])) continue;
    const hs = pts.map(([px, pz]) => env.height(px, pz)), hi = Math.max(...hs), lo = Math.min(...hs);
    if (hi - lo > (compound ? 3.8 : 5)) continue;
    const masks = maskUnion(env, pts, 'buildings'), pad = hi + 0.15;
    if(compound){
      const put=(role:string,du:number,dv:number,w:number,d:number,y:number,h:number,c:number,da=0)=>{
        const [px,pz]=f.toWorld(u+du,v+dv);
        pieces.push({key:`${key}/${role}/${du},${dv}`,role,masks,x:px,z:pz,a:angle+da,w,d,y0:pad+y,y1:pad+y+h,c});
      };
      const kindRoll=r();
      // Vary yards across three realistic 1984 states: open earthworks, long workshop sheds, and walled foundations.
      put('work-yard',0,0,pw,pd,lo-pad-.16,pad-lo+.16,kindRoll<.28?0xb57c54:0xb48864);
      if(kindRoll<.28){
        // Open graded cut-and-fill earthwork lot with linear spoil mounds and stacked materials.
        put('graded-spoil',-pw*.16,-pd*.12,pw*.52,4.2,0,.7+r()*.65,0xa8653f,(r()-.5)*.14);
        put('graded-spoil',pw*.14,pd*.18,pw*.38,3.6,0,.55+r()*.55,0xb17249,(r()-.5)*.14);
        put('stockpile',pw*.18,-pd*.22,pw*.22,3.0,0,.7,0xb8a389);
        continue;
      }
      if(kindRoll<.72){
        // Long low workshop/construction sheds along a compacted gravel strip (as seen along Shennan East & Shangbu).
        put('work-haul',0,pd*.24,pw*.9,4.2,0,.04,0xa3957f);
        const sw=pw*(.68+r()*.18), sd=5.6+r()*1.4;
        const [sx,sz]=f.toWorld(u-(r()-.5)*2,v-pd*.16);
        buildings.push({key:key+'/shed',parent:area.id,arch:'worksite_shed',x:sx,z:sz,a:angle,w:sw,d:sd,floors:1,
          base:pad,foot:pad-.3,tone:r(),masks});
        if(pd>=27&&r()<.48){
          const [xx,zz]=f.toWorld(u+pw*.06,v+pd*.34);
          buildings.push({key:key+'/store',parent:area.id,arch:'worksite_shed',x:xx,z:zz,a:angle,w:pw*.44,d:4.6,floors:1,
            base:pad,foot:pad-.3,tone:r(),masks});
        }
        put('stockpile',-pw*.22,pd*.12,pw*.2,2.6,0,.75,0xb9a38b);
        continue;
      }
      // Active foundation compound with partial hoarding, pile frames and site hut.
      put('work-haul',pw*.30,0,4,pd,0,.035,0x9e8065);
      put('work-edge',0,pd/2-.55,pw-1,.4,0,1.3,0xa69979);
      put('work-edge',-pw*.14,-pd/2+.55,pw*.64,.4,0,1.3,0xa69979);
      const framed=r()<.7;
      put('work-foundation',-pw*.16,2,pw*.37,8,0,framed?.3:.09,framed?0x9c978a:0x97806d);
      if(framed)for(const du of [-.3,-.16,-.02])for(const dv of [-.8,4.8])
        put('pile-frame',pw*du,dv,.32,.32,.3,1.4,0x76675e);
      const [sx,sz]=f.toWorld(u-pw*.07,v-pd/2+4.1);
      buildings.push({key:key+'/shed',parent:area.id,arch:'worksite_shed',x:sx,z:sz,a:angle,w:pw*.55,d:5.4,floors:1,
        base:pad,foot:pad-.3,tone:r(),masks});
      put('stockpile',pw*.03,8,pw*.21,2.8,0,.75,0xb7a08a);
      continue;
    }
    pieces.push({key, role: 'pad', masks, x, z, y0: lo - 1, y1: pad, w: pw, d: pd, a: angle, c: LAND.pad});
    if (r() < 0.55) {
      const bays = 3 + Math.floor(r() * 4), w = bays * ARCH.worksite_shed.bay, d = 9;
      if (w < pw - 4) {
        const [sx, sz] = f.toWorld(u, v - pd / 2 + d / 2 + 2);
        buildings.push({key: key + '/shed', parent: area.id, arch: 'worksite_shed', x: sx, z: sz, a: angle, w, d, floors: 1,
          base: pad, foot: lo - 1.5, tone: r(), masks});
      }
    }
    const piles = 2 + Math.floor(r() * 4);
    for (let k = 0; k < piles; k++) {
      const [px, pz] = f.toWorld(u + (r() - 0.5) * (pw - 10), v + (r() * 0.4) * (pd - 10));
      const s = 3 + r() * 5;
      pieces.push({key: `${key}/s${k}`, role: 'stockpile', masks, x: px, z: pz, y0: pad - 0.2, y1: pad + 1 + r() * 2,
        w: s, d: s * (0.6 + r() * 0.6), a: angle + r() * 0.6, c: [0xd2b98c, 0x9b8f80, 0xa9654a, 0xc8c2b2][Math.floor(r() * 4)]!});
    }
  }
  return {pieces, buildings};
}

/** Compacted gravel/concrete freight aprons and long low rail/port sheds (Sungang, Luohu station, Wenjindu). */
export function railYard(area: Area, angle: number, env: Env, seed: string) {
  const f = frame(angle), [u0, v0, u1, v1] = localBox(area.poly, f);
  const stepU = 38, stepV = 62;
  const pieces: Piece[] = [], buildings: Building[] = [];
  for (let j = Math.floor(v0 / stepV); j * stepV <= v1; j++)
  for (let i = Math.floor(u0 / stepU); i * stepU <= u1; i++) {
    const r = rng(seed, area.id, i, j), key = `${area.id}/ry/${i},${j}`;
    const u = i * stepU + stepU / 2, v = j * stepV + stepV / 2;
    const pw = 28, pd = 48;
    const [x, z] = f.toWorld(u, v);
    const pts = corners(x, z, angle, pw, pd);
    if (!fits(area, env, [...pts, [x, z]])) continue;
    const hs = pts.map(([px, pz]) => env.height(px, pz)), hi = Math.max(...hs), lo = Math.min(...hs);
    if (hi - lo > 3.5) continue;
    const masks = maskUnion(env, pts, 'buildings'), pad = hi + 0.12;
    pieces.push({key: key + '/apron', role: 'rail-apron', masks, x, z, a: angle, w: pw, d: pd,
      y0: lo - 0.35, y1: pad, c: 0xb1aca0});
    if (r() < 0.72) {
      const sw = 9 + r() * 2.5, sd = 26 + r() * 14;
      const [sx, sz] = f.toWorld(u - 4, v);
      buildings.push({key: key + '/warehouse', parent: area.id, arch: 'worksite_shed', x: sx, z: sz,
        a: angle + Math.PI / 2, w: sd, d: sw, floors: 1, base: pad, foot: pad - 0.35, tone: r(), masks});
    } else {
      // Open gravel freight loading pad with low timber/crate stacks.
      for (const dv of [-10, 6]) {
        const [px, pz] = f.toWorld(u + 2, v + dv);
        pieces.push({key: `${key}/crate/${dv}`, role: 'stockpile', masks, x: px, z: pz, a: angle,
          w: 7, d: 10, y0: pad, y1: pad + 1.1, c: 0x9c9282});
      }
    }
  }
  return {pieces, buildings, trees: [] as Tree[]};
}

/** Subtropical urban park with a shallow hollow lake, lakeside promenade, paths and dense orchard canopy (Lizhi Park). */
export function parkGrounds(area: Area, env: Env, seed: string) {
  const [x0, z0, x1, z1] = area.poly.box;
  const cx = (x0 + x1) * 0.5 + 15, cz = (z0 + z1) * 0.5 + 25;
  const pieces: Piece[] = [], trees: Tree[] = [];
  // Two linked organic lobes form the hollow lake (荔枝湖) cited in phase1.site.municipal_government.site_choice.
  const lobes = [
    {x: cx - 32, z: cz + 16, rx: 72, rz: 46, a: -0.20},
    {x: cx + 44, z: cz - 14, rx: 68, rz: 44, a: 0.25},
  ];
  const inLobe = (x: number, z: number, pad = 0) => lobes.some(l => {
    const dx = x - l.x, dz = z - l.z, c = Math.cos(l.a), s = Math.sin(l.a);
    const lx = dx * c + dz * s, lz = -dx * s + dz * c;
    return (lx / (l.rx + pad)) ** 2 + (lz / (l.rz + pad)) ** 2 <= 1;
  });
  // Sample lake floor level across dry unblocked probes inside the hollow.
  const lakeProbes: P[] = [];
  for (let z = cz - 78; z <= cz + 78; z += 12)
    for (let x = cx - 122; x <= cx + 126; x += 12)
      if (inLobe(x, z, -4) && contains(area.poly, x, z) && !env.blocked(x, z)) lakeProbes.push([x, z]);
  if (lakeProbes.length >= 6) {
    const heights = lakeProbes.map(p => env.height(...p));
    const waterY = Math.min(...heights) + 0.65;
    // Render tiled water and grassy bank rim following local relief without cutting the DEM.
    for (let z = cz - 86; z <= cz + 86; z += 11)
    for (let x = cx - 130; x <= cx + 134; x += 11) {
      if (!contains(area.poly, x, z) || env.blocked(x, z)) continue;
      const inWater = inLobe(x, z, 0), inRim = !inWater && inLobe(x, z, 12);
      if (!inWater && !inRim) continue;
      const h = env.height(x, z), masks = env.masks(x, z, 'fields');
      if (inWater) {
        pieces.push({key: `${area.id}/lake/${x},${z}`, role: 'park-lake', x, z, a: 0, w: 13.6, d: 13.6,
          y0: Math.min(h, waterY) - 0.8, y1: Math.max(h + 0.28, waterY), c: 0x5c8b8e, masks});
      } else {
        pieces.push({key: `${area.id}/bank/${x},${z}`, role: 'park-bank', x, z, a: 0, w: 13.2, d: 13.2,
          y0: h - 0.4, y1: h + 0.22, c: 0x7b905a, masks});
      }
    }
    // Pale stone/gravel promenade loop encircling the lake plus west & south feeder walks.
    for (let k = 0; k < 48; k++) {
      const t = (k / 48) * Math.PI * 2;
      const px = cx + 6 + Math.cos(t) * 124, pz = cz + Math.sin(t) * 80;
      const nx = cx + 6 + Math.cos(t + 0.14) * 124, nz = cz + Math.sin(t + 0.14) * 80;
      if (inLobe(px, pz, 5) || !contains(area.poly, px, pz) || env.blocked(px, pz)) continue;
      const h = env.height(px, pz);
      pieces.push({key: `${area.id}/walk/${k}`, role: 'park-path', x: px, z: pz, a: Math.atan2(nz - pz, nx - px),
        w: 17, d: 3.8, y0: h - 0.25, y1: h + 0.20, c: 0xc5bda7, masks: env.masks(px, pz, 'fields')});
    }
    for (let x = cx - 122; x >= x0 + 18; x -= 12) {
      const pz = cz + 18;
      if (inLobe(x, pz, 5) || !contains(area.poly, x, pz) || env.blocked(x, pz)) continue;
      const h = env.height(x, pz);
      pieces.push({key: `${area.id}/westwalk/${x}`, role: 'park-path', x, z: pz, a: 0,
        w: 13, d: 3.6, y0: h - 0.25, y1: h + 0.20, c: 0xc5bda7, masks: env.masks(x, pz, 'fields')});
    }
    for (let z = cz + 82; z <= z1 - 14; z += 12) {
      const px = cx + 8;
      if (inLobe(px, z, 5) || !contains(area.poly, px, z) || env.blocked(px, z)) continue;
      const h = env.height(px, z);
      pieces.push({key: `${area.id}/southwalk/${z}`, role: 'park-path', x: px, z, a: Math.PI / 2,
        w: 13, d: 3.8, y0: h - 0.25, y1: h + 0.20, c: 0xc5bda7, masks: env.masks(px, z, 'fields')});
    }
    // Two small lakeside pavilions on opposite shores.
    for (const [idx, px, pz] of [[0, cx - 98, cz + 44], [1, cx + 104, cz - 42]] as const) {
      if (!contains(area.poly, px, pz) || env.blocked(px, pz)) continue;
      const h = env.height(px, pz), masks = env.masks(px, pz, 'buildings');
      pieces.push({key: `${area.id}/pav/${idx}/base`, role: 'park-pavilion', x: px, z: pz, a: 0.2,
        w: 6.4, d: 6.4, y0: h - 0.4, y1: h + 0.48, c: 0xc6bca6, masks});
      pieces.push({key: `${area.id}/pav/${idx}/roof`, role: 'park-pavilion', x: px, z: pz, a: 0.2,
        w: 7.6, d: 7.6, y0: h + 3.1, y1: h + 4.1, c: 0x7c5c4a, masks});
      for (const dx of [-2.2, 2.2]) for (const dz of [-2.2, 2.2])
        pieces.push({key: `${area.id}/pav/${idx}/col/${dx},${dz}`, role: 'park-pavilion', x: px + dx, z: pz + dz, a: 0.2,
          w: 0.35, d: 0.35, y0: h + 0.48, y1: h + 3.15, c: 0x8c4d3c, masks});
    }
  }
  // Dense, multi-toned subtropical lychee & banyan canopy around the lake and slopes, clear of water and paths.
  const parkEnv: Env = {
    ...env,
    blocked: (x, z) => env.blocked(x, z) || inLobe(x, z, 8),
  };
  trees.push(...grove(area, 10, 0.92, {lychee: 6, banyan: 2.2, bamboo: 1.5}, parkEnv, seed));
  return {buildings: [] as Building[], pieces, trees};
}
