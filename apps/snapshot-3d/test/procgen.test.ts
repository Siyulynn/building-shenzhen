import {existsSync, readFileSync} from 'node:fs';
import {beforeAll, describe, expect, it} from 'vitest';
import {InstancedMesh, Mesh} from 'three';
import {decode, ground, utm, type Grid, type Meta} from '../src/grid';
import {contains, hull} from '../src/procgen/geom';
import {inWindow, toWorld, type RawMap} from '../src/procgen/gis';
import {levelAt} from '../src/procgen/network';
import {lattice,readRelief, type ReliefPatch} from '../src/procgen/ground';
import {crossroads} from '../src/shenzhenxu';
import {planBasin, type BasinPlan, type GenCfg} from '../src/procgen/plan';
import {buildingParts,buildScene,groundMesh} from '../src/procgen/mesh';
import {settlement, plots, worksite, type Env} from '../src/procgen/fabric';
import {bucket,tileOf,tileKey,tileRect} from '../src/procgen/tiles';
import {pilotNetwork} from '../src/procgen/streamer';
import type {MunicipalMap} from '../src/procgen/municipal-lod0';
import map from '../core-basin-gis.json';
import gen from '../basin-gen.json';

const raw = map as unknown as RawMap, cfg = gen as unknown as GenCfg;
const meta: Meta = {width: 931, height: 686, cell_m: 100, crs: 'EPSG:32650', origin_top_left: [164400, 2533900]};
// The prepared grid is git-ignored, so every check also runs on a synthetic relief: a flat delta with
// rolling hills and one water blob at the reservoir cell. The real grid adds a second run when present.
function synthetic(): Grid {
  const n = meta.width * meta.height, g = decode(meta, new ArrayBuffer(n * 6), new ArrayBuffer(n), new ArrayBuffer(n));
  for (let r = 0; r < meta.height; r++) for (let c = 0; c < meta.width; c++) {
    const hill = Math.max(0, Math.sin(c / 9) * Math.cos(r / 7)) * 45 + Math.max(0, 360 - r) * 0.4;
    g.elevation[r * meta.width + c] = Math.round(3 + hill);
    if (Math.hypot(c - 428, r - 335) < 9) { g.water79[r * meta.width + c] = 1; g.elevation[r * meta.width + c] = 28; }
  }
  return g;
}
const gridFile = (f: string) => new URL('../public/grid/' + f, import.meta.url);
function real(): Grid {
  const file = (f: string) => { const b = readFileSync(gridFile(f)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); };
  return decode(JSON.parse(readFileSync(gridFile('meta.json'), 'utf8')) as Meta, file('grid.bin'), file('water1979.bin'), file('change_79_84.bin'));
}
const grids: [string, () => Grid][] = [['synthetic grid', synthetic]];
if (existsSync(gridFile('grid.bin'))) grids.push(['prepared grid', real]);
const patchFile=gridFile('core-relief.json');
const relief=existsSync(patchFile)?readRelief(JSON.parse(readFileSync(patchFile,'utf8')) as ReliefPatch):undefined;

describe.each(grids)('procedural basin on the %s', (name, make) => {
let g: Grid, plan: BasinPlan;
const proxy=name==='prepared grid'?relief:undefined;
beforeAll(() => { g = make(); plan = planBasin(g, raw, cfg, proxy); }, 60000);

describe('procedural basin · base-map input', () => {
  it('maps UTM to atlas world metres the same way as the grid', () => {
    for (const p of [[198800, 2494100], [205600, 2497400], [203010, 2494318]]) {
      const [x, z] = toWorld(p);
      expect(utm(g.meta, x, z)).toEqual(p);
    }
  });
  it('keeps the lattice on DEM vertex lines and meets the DEM exactly at its edge', () => {
    const l = plan.lattice;
    expect(l.x0 % 100).toBe(0); expect(l.z0 % 100).toBe(0);
    for (let i = 0; i < l.cols; i += 7) {
      for (const j of [0, l.rows - 1]) {
        const x = l.x0 + i * l.step, z = l.z0 + j * l.step;
        expect(l.h[j * l.cols + i]).toBeCloseTo(ground(g, x, z), 3);
      }
    }
    for (let j = 0; j < l.rows; j += 7) for (const i of [0, l.cols - 1]) {
      expect(l.h[j * l.cols + i]).toBeCloseTo(ground(g, l.x0 + i * l.step, l.z0 + j * l.step), 3);
    }
  });
});

describe('procedural basin · placement', () => {
  it('generates every kind of fabric the handoff asks for', () => {
    const arch = new Set(plan.buildings.map(b => b.arch)), roles = new Set(plan.pieces.map(p => p.role));
    expect(arch).toEqual(new Set(['village_row', 'lingnan_block', 'danwei_slab', 'worksite_shed']));
    for (const r of ['plot', 'bund', 'ditch', 'ridge', 'pond-cell', 'pad', 'stockpile']) expect(roles).toContain(r);
    expect(new Set(plan.trees.map(t => t.kind)).size).toBeGreaterThanOrEqual(4);
    expect(plan.net.bridges.map(b => b.id).sort()).toEqual(['east-bridge-candidate', 'luohu-rail-bridge','south-transverse-buji']);
    expect(plan.net.tracks.filter(t => t.id.startsWith('yard-')).length).toBeGreaterThanOrEqual(4);
    expect(plan.reservoir?.cells).toBeGreaterThan(100);
  });
  it('keeps each building inside its own settlement or worksite polygon and the window', () => {
    const byId = new Map(plan.basin.cover.map(a => [a.id, a]));
    for (const b of plan.buildings) {
      const a = byId.get(b.parent)!;
      expect(['settlement', 'worksite']).toContain(a.kind);
      expect(contains(a.poly, b.x, b.z)).toBe(true);
      expect(inWindow(plan.basin, b.x, b.z)).toBe(true);
      expect(b.foot).toBeLessThanOrEqual(b.base - 1.5);
    }
  });
  it('puts nothing in water, river margins, transport land, unknown cover or road and rail buffers', () => {
    const banned = new Set(['water', 'river_margin', 'transport_land', 'unknown']);
    const check = (x: number, z: number) => {
      const kind = plan.basin.coverAt(x, z)?.kind;
      expect(kind && banned.has(kind)).toBeFalsy();
      expect(plan.net.corridors.hit(x, z)).toBeUndefined();
      expect(plan.net.water.hit(x, z)).toBeUndefined();
    };
    for (const b of plan.buildings) check(b.x, b.z);
    for (const t of plan.trees) check(t.x, t.z);
    for (const p of plan.pieces) check(p.x, p.z);
  });
  it('never floats a building: every footprint corner is above its skirt and below its floor', () => {
    for (const b of plan.buildings.slice(0, 4000)) {
      const c = Math.cos(b.a), s = Math.sin(b.a);
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const y = plan.lattice.at(b.x + c * i! * b.w / 2 - s * j! * b.d / 2, b.z + s * i! * b.w / 2 + c * j! * b.d / 2);
        expect(y).toBeGreaterThan(b.foot);
        expect(y).toBeLessThan(b.base + 1e-6);
      }
    }
  });
  it('is deterministic for a seed and changes with it', () => {
    const again = planBasin(g, raw, cfg,proxy);
    expect(again.buildings.map(b => b.key + b.x.toFixed(3))).toEqual(plan.buildings.map(b => b.key + b.x.toFixed(3)));
    const other = planBasin(g, raw, {...cfg, seed: 'another'},proxy);
    expect(other.buildings.map(b => b.key).join()).not.toEqual(plan.buildings.map(b => b.key).join());
  });
});

describe('procedural basin · focus masks', () => {
  it('tags generated items inside a mask and nothing outside it', () => {
    for (const m of plan.basin.masks) {
      const tagged = plan.buildings.filter(b => b.masks.includes(m.id));
      if (m.clears.includes('buildings') && m.id !== 'luohu') expect(tagged.length).toBeGreaterThan(0);
      for (const b of tagged) {
        const c = Math.cos(b.a), s = Math.sin(b.a);
        const pts = [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [b.x + c * i! * b.w / 2 - s * j! * b.d / 2, b.z + s * i! * b.w / 2 + c * j! * b.d / 2]);
        expect(pts.some(([x, z]) => contains(m.poly, x!, z!))).toBe(true);
      }
    }
  });
  it('clearing one mask leaves every other generated item identical', () => {
    const all = buildScene(plan, {clear: new Set()}), some = buildScene(plan, {clear: new Set(['shenzhenxu'])});
    const removed = plan.buildings.filter(b => b.masks.includes('shenzhenxu')).length;
    expect(all.counts.buildings - some.counts.buildings).toBe(removed);
    // Masking filters records; it never regenerates them.
    expect(planBasin(g, raw, {...cfg, masks: []},proxy).buildings.map(b => b.key)).toEqual(plan.buildings.map(b => b.key));
    all.dispose(); some.dispose();
  });
  it('builds masks around the traced features they protect', () => {
    const sz = plan.basin.masks.find(m => m.id === 'shenzhenxu')!;
    for (const [x, z] of plan.basin.areaPicks.get('pilot-extent')!.poly.rings[0]!) expect(contains(sz.poly, x, z)).toBe(true);
    const lh = plan.basin.masks.find(m => m.id === 'luohu')!;
    expect(contains(lh.poly, ...plan.basin.crossings.find(c => c.id === 'luohu-rail-bridge')!.at)).toBe(true);
  });
});

describe('procedural basin · water and civil works', () => {
  it('keeps river surfaces non-increasing downstream and no tributary below its receiving reach', () => {
    for (const r of plan.net.rivers) {
      const lv = r.downstream === 'start' ? [...r.level].reverse() : r.level;
      for (let i = 1; i < lv.length; i++) expect(lv[i]!).toBeLessThanOrEqual(lv[i - 1]! + 1e-9);
    }
    const west = plan.net.rivers.find(r => r.id === 'river-main-west')!, buji = plan.net.rivers.find(r => r.id === 'buji-lower')!;
    const east = plan.net.rivers.find(r => r.id === 'river-main-east')!;
    expect(east.widths[0]).toBe(west.widths.at(-1));
    expect(east.level[0]).toBe(west.level.at(-1));
    const [x, z] = buji.points.at(-1)!;
    expect(buji.level.at(-1)!).toBeGreaterThanOrEqual(levelAt(west, x, z) - 1e-9);
  });
  it('carves the ground below every river and pond surface', () => {
    for (const r of plan.net.rivers) r.points.forEach(([x, z], i) => {
      if (inWindow(plan.basin, x, z, 30)) expect(plan.lattice.at(x, z)).toBeLessThan(r.level[i]!);
    });
    for (const p of plan.ponds) {
      const cx = p.ring.reduce((s, q) => s + q[0], 0) / p.ring.length, cz = p.ring.reduce((s, q) => s + q[1], 0) / p.ring.length;
      if (contains({rings: [p.ring], box: [-1e9, -1e9, 1e9, 1e9]}, cx, cz)) expect(plan.lattice.at(cx, cz)).toBeLessThan(p.level);
    }
  });
  it('holds bridge decks clear above the water and carries the line across on them', () => {
    for (const b of plan.net.bridges) {
      const river = plan.net.rivers.find(r => b.over === r.id)!;
      expect(b.deck).toBeGreaterThanOrEqual(levelAt(river, ...b.at) + b.clearance - 1e-6);
      // The soffit (deck slab underside) stays above the water too.
      expect(Math.min(...b.boxes.filter(x => x.w > 20).map(x => x.y0))).toBeGreaterThan(levelAt(river, ...b.at) + 0.5);
      const deckline = plan.net.ribbons.find(r => r.id === b.carries && r.skirt.some(s => !s))!;
      expect(deckline.ys.filter((_, i) => !deckline.skirt[i]).every(y => y === b.deck)).toBe(true);
    }
  });
  it('preserves unselected gaps and renders only explicitly configured crossing estimates', () => {
    expect(plan.net.gaps.map(g=>g.id)).toEqual(['west-approach-buji']);
    for(const c of raw.layers.crossings!.filter(c=>cfg.estimatedCrossings?.[c.id])) {
      expect(c.kind).toBe('crossing_undetermined');
      const est=cfg.estimatedCrossings![c.id]!;
      if(est.type==='span') expect(plan.net.bridges.find(b=>b.id===c.id)?.basis).toBe('estimated');
      else {
        const road=c.links.find(id=>cfg.roads[id])!, [x,z]=toWorld(c.geometry.coordinates as number[]);
        expect(plan.net.ribbons.some(r=>r.id===road && r.points.some(([px,pz])=>Math.hypot(px-x,pz-z)<8))).toBe(true);
      }
    }
    for (const gap of plan.net.gaps) for (const r of plan.net.ribbons.filter(r => r.id === gap.road)) {
      for (const [x, z] of r.points) expect(Math.hypot(x - gap.at[0], z - gap.at[1])).toBeGreaterThan(gap.r - 1e-6);
    }
  });
  it('keeps yard tracks inside the yard envelope', () => {
    const yard = plan.basin.areaPicks.get('yard-envelope')!.poly;
    for (const t of plan.net.tracks.filter(t => t.id.startsWith('yard-'))) for (const [x, z] of t.points) expect(contains(yard, x, z)).toBe(true);
  });
});

it('decodes a 30 m relief patch with centre registration, interpolation and an explicit out-of-range fallback',()=>{
  const bytes=new ArrayBuffer(8), view=new DataView(bytes);
  [200,400,600,1000].forEach((v,i)=>view.setInt16(i*2,v,true));
  const sample=readRelief({format:'sz-core-relief-v1',crs:'EPSG:32650',origin_center:[164450,2533850],
    spacing_m:30,width:2,height:2,scale_m:.01,source:'copernicus_dem_glo30',
    samples_i16le_b64:Buffer.from(bytes).toString('base64')});
  expect([sample(0,0),sample(30,30),sample(15,15),sample(-1,0)]).toEqual([2,10,5.5,undefined]);
});

describe('procedural basin · meshing', () => {
  it('preserves every core record in exactly one owner tile',()=>{
    for(const records of [plan.buildings,plan.trees,plan.pieces] as const){
      const seen=new Set<string>();
      for(const [key,owned] of bucket<{key:string;x:number;z:number}>(records)) for(const r of owned){
        if(seen.has(r.key)||tileKey(tileOf(r.x,r.z))!==key)throw Error('Invalid owner: '+r.key);
        seen.add(r.key);
      }
      expect(seen.size).toBe(records.length);
    }
  });
  it('uses the same dry ground at the authored Shenzhenxu patch as municipal LOD1',()=>{
    const x=crossroads(raw), p=lattice(g,plan.basin,cfg.lattice_m,cfg.smooth_radius_cells,cfg.edge_blend_m,proxy);
    for(let u=-29;u<=91;u+=4)for(let v=-30;v<=29;v+=4){
      const [a,b]=x.world(u,v);
      expect(p.at(a,b)).toBeCloseTo(plan.lattice.at(a,b),6);
    }
  });
  it('anchors the pilot long profiles to core heights without promoting review bands',()=>{
    if(!existsSync(gridFile('municipal-gis.json')))return;
    const doc=JSON.parse(readFileSync(gridFile('municipal-gis.json'),'utf8')) as MunicipalMap;
    const {base,estimated}=pilotNetwork(g,plan,doc);
    expect(estimated.map(r=>r.id)).not.toContain('kcr-buji-pinghu');
    expect(estimated.map(r=>r.id)).not.toContain('kcr-north-continuation');
    const river=plan.net.rivers.find(r=>r.id==='river-main-west')!;
    const estuary=base.find(r=>r.id==='shenzhen-river-estuary')!;
    expect(estuary.ys[0]).toBe(river.level[0]);
    expect(estuary.ys.every((y,i)=>!i||y<=estuary.ys[i-1]!)).toBe(true);
    const rail=plan.net.ribbons.find(r=>r.id==='rail-main')!;
    expect(estimated.find(r=>r.id==='kcr-sungang-buji')!.ys[0]).toBe(rail.ys[0]);
    const town=estimated.find(r=>r.id==='guangshen-nantou-town')!;
    const west=estimated.find(r=>r.id==='guangshen-northwest')!;
    expect(town.points[0]).toEqual(west.points[0]);
    expect(town.ys[0]).toBe(west.ys[0]);
  });
  it('meshes both sides of a four-tile core seam from identical lattice samples and normals',()=>{
    const tiles=[[11,11],[12,11],[11,12],[12,12]] as const;
    const junction=tiles.map(t=>{
      const m=groundMesh(plan,tileRect(t)), p=m.geometry.getAttribute('position'),n=m.geometry.getAttribute('normal');
      const i=Array.from({length:p.count},(_,j)=>j).find(i=>p.getX(i)===38400&&p.getZ(i)===38400)!;
      const point=[p.getY(i),n.getX(i),n.getY(i),n.getZ(i)];
      m.material.dispose();m.geometry.dispose();
      return point;
    });
    expect(junction[0]!.every(Number.isFinite)).toBe(true);
    expect(junction).toEqual(Array(4).fill(junction[0]));
  });
  it('stays within the neighbourhood draw-call budget and instances every repeated part', () => {
    const s = buildScene(plan, {clear: new Set()});
    expect(s.group.children.length).toBeLessThanOrEqual(20);
    const instanced = s.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    expect(instanced.reduce((n, m) => n + m.count, 0)).toBeGreaterThan(50000);
    for (const m of s.group.children.filter((c): c is Mesh => c instanceof Mesh)) {
      const p = m.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i += 97) expect(Number.isFinite(p.getY(i))).toBe(true);
    }
    s.dispose();
  });
});

});

describe('procedural kits are reusable without the base map', () => {
  const flat: Env = {height: () => 5, blocked: () => false, masks: () => []};
  const square = {id: 'test', poly: {rings: [hull([[0, 0], [300, 0], [300, 200], [0, 200]])], box: [0, 0, 300, 200] as [number, number, number, number]}};
  it.each([
    ['standard_factory',4,6],['factory_hall',1,1],['early_highrise',12,20],['tower_works',8,16],
    ['worker_dorm',5,7],['estate_slab',5,6],['lingnan_block',1,3],['village_villa',2,2],
  ] as const)('keeps %s on grade and inside its rotated parcel, including balconies and podiums',(kit,min,max)=>{
    const opts={parcel:64,lane:4,mix:{[kit]:1}}, angle=.41;
    const env={...flat,height:(x:number,z:number)=>5+.015*x+.009*z};
    const get=(owner?:[number,number,number,number])=>settlement(square,angle,opts,env,'review',owner).buildings;
    const buildings=get();
    expect(buildings.length).toBeGreaterThan(1);
    expect([...get([150,0,300,200]),...get([0,0,150,200])].sort((a,b)=>a.key.localeCompare(b.key)))
      .toEqual([...buildings].sort((a,b)=>a.key.localeCompare(b.key)));
    for(const b of buildings){
      expect(b.arch).toBe(kit==='tower_works'?'early_highrise':kit);
      expect(b.stage).toBe(kit==='tower_works'?kit:undefined);
      expect(b.floors).toBeGreaterThanOrEqual(min);expect(b.floors).toBeLessThanOrEqual(max);
       const {boxes,walls,roofs}=buildingParts([b]), ca=Math.cos(b.a),sa=Math.sin(b.a);
       expect(walls.has(b.arch)).toBe(kit!=='tower_works');
       if(kit==='factory_hall')expect(roofs.filter(p=>p.w>1)).toHaveLength(2);
       if(kit==='lingnan_block'&&b.arcade)expect(walls.get(b.arch)![0]!.d).toBeLessThan(b.d);
      for(const p of [...boxes,...walls.values()].flat()){
        const dx=p.x-b.x,dz=p.z-b.z;
        expect(Math.abs(dx*ca+dz*sa)+p.w/2).toBeLessThanOrEqual(b.w/2+.251);
        expect(Math.abs(dz*ca-dx*sa)+p.d/2).toBeLessThanOrEqual(b.d/2+.251);
        expect(p.h).toBeGreaterThan(0);
      }
      const foundation=boxes[0]!;
      expect(foundation.y).toBeLessThan(env.height(b.x,b.z));
      expect(foundation.y+foundation.h).toBeCloseTo(b.base);
    }
  });
  it('keeps the components of a works compound inside its dry pad',()=>{
    const built=worksite(square,0,flat,'compound',true);
    const pads=built.pieces.filter(p=>p.role==='work-yard');
    expect(pads.length).toBeGreaterThan(1);
    expect(built.pieces.some(p=>p.role==='pile-frame')).toBe(true);
    const fitsPad=({x,z,w,d}:{x:number;z:number;w:number;d:number})=>pads.some(p=>
      Math.abs(x-p.x)+w/2<=p.w/2+1e-6&&Math.abs(z-p.z)+d/2<=p.d/2+1e-6);
    expect([...built.buildings,...built.pieces].every(fitsPad)).toBe(true);
    const barrier={...flat,blocked:(x:number)=>x>100&&x<180};
    const clipped=worksite(square,0,barrier,'compound',true);
    expect(clipped.pieces.filter(p=>p.role==='work-yard').length).toBeLessThan(pads.length);
    expect(clipped.pieces.every(p=>p.x+p.w/2<=100||p.x-p.w/2>=180)).toBe(true);
  });
  it('fills any polygon with the chosen archetype and grain', () => {
    const s = settlement(square, 0.3, {parcel: 64, lane: 4, mix: {danwei_slab: 1}}, flat, 'x');
    expect(s.buildings.length).toBeGreaterThan(5);
    expect(s.buildings.every(b => b.arch === 'danwei_slab' && Math.abs(b.a - 0.3) < 1e-9 && b.base === 5.3)).toBe(true);
    const f = plots(square, 0, {kind: 'field', strip: 22, plot: 44, ditchEvery: 5}, flat, 'x');
    expect(f.filter(p => p.role === 'plot').length).toBeGreaterThan(20);
  });
});
