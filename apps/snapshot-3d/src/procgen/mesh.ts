// three.js meshing for a BasinPlan. Every repeated thing is one InstancedMesh per material role; every
// static ribbon or water surface is merged into one geometry. Masks filter records, they never re-seed.
import * as T from 'three';
import {normals} from './geom';
import {ARCH, type Arch, type Building, type Tree} from './fabric';
import {inTint} from './gis';
import type {Box, Ribbon} from './network';
import type {BasinRenderPlan} from './plan';
import type {januaryGroundAt} from './january-ground';

export interface BuildOpts {
  /** Mask ids whose areas are left empty for detailed models. */
  clear: ReadonlySet<string>;
  textures?: Partial<Record<Arch | 'track', T.Texture>>;
  sections?: 'static'|'fabric';
  shared?: FabricResources;
  deferGround?:boolean;
}

const live = (masks: string[], clear: ReadonlySet<string>) => !masks.some(m => clear.has(m));
const COVER: Record<string, string> = {
  settlement: '#c4b08c', field: '#98a565', pond_complex: '#8d9c6a', water: '#6a8d89', river_margin: '#9b9a78',
  upland_cover: '#7d9364', worksite: '#c99d6f', graded_ground: '#b46642', open_ground: '#b3b27f', transport_land: '#a89d88',
  civic_park: '#828d59',
};
export const coverTone = (kind: string) => COVER[kind];
export const designTones=new Map([
  ['settlement',new T.Color(COVER.settlement)],['graded_ground',new T.Color('#b2734f')],
  ['civic_park',new T.Color(COVER.civic_park)],['transport_land',new T.Color(COVER.transport_land)],
  ['avenue_verge',new T.Color('#b5a083')],
]);
const RIBBON: Record<string, string> = {
  main: '#b49d7f', minor: '#bba78a', street: '#b9a68c', lane: '#b3a587', works: '#c8a57a', carriageway: '#a8957b',
  arterial:'#a29781',pavement:'#706d62','paved-edge':'#bdb099','compound-drive':'#b8ad97',
  ballast: '#8e8578', bank: '#90a06a', dyke: '#94a16d',
};
const WALL: Record<Arch, number[]> = {
  village_row: [0xbab3a3, 0xaaa294, 0xc2b8a4], lingnan_block: [0xdbd0b6, 0xcfc1a4, 0xe2d8c0], danwei_slab: [0xd9d4c3, 0xcac8b8, 0xd7cdb6],
  worksite_shed: [0xc8c0aa, 0xa9a596],
  standard_factory:[0xc9c7b9,0xd8d3c2], factory_hall:[0xcfd0c7,0xc0c3b8], early_highrise:[0xdbd7c9,0xd1d1c6],
  worker_dorm:[0xe2ddca,0xdad8cc], estate_slab:[0xe5dfcc,0xe5ded6,0xe2d4bd], village_villa:[0xeae5d8,0xe4ddcd,0xe6e5d7],
};
const ROOF: Partial<Record<Arch, number[]>> = {
  village_row: [0x7c7870, 0x8a6b58, 0x726e66], lingnan_block: [0x6c6b65, 0x7a6a5c, 0x66655f],
  worksite_shed: [0x95a09d, 0x8d8f86],
  factory_hall: [0x567582, 0x63828e, 0x677578],
};

/** Same ramp as the atlas relief texture, in linear colour, so the lattice edge meets the DEM without a colour seam. */
const low = new T.Color('#dcd4ae'), hill = new T.Color('#92a889'), peak = new T.Color('#647f71');
const januaryHill=new T.Color('#6f8b63'), januaryPeak=new T.Color('#526f63');
export function relief(z: number, c = new T.Color(), january=false) {
  const shoulder=january?105:160;
  return c.copy(low).lerp(january?januaryHill:hill, Math.min(1, Math.max(0, z) / shoulder))
    .lerp(january?januaryPeak:peak, Math.max(0, Math.min(1, (z - shoulder) / 500)));
}

/** Mesh a slice of the existing core lattice; normals sample the same neighbours across ownership edges. */
export function groundMesh(p: BasinRenderPlan, rect?:readonly [number,number,number,number], material?:T.MeshLambertMaterial,
  blendNormal?:(x:number,z:number,n:T.Vector3)=>T.Vector3,
  designAt?:typeof januaryGroundAt) {
  const l=p.lattice;
  const ix=(x:number)=>Math.max(0,Math.min(l.cols-1,Math.round((x-l.x0)/l.step)));
  const iz=(z:number)=>Math.max(0,Math.min(l.rows-1,Math.round((z-l.z0)/l.step)));
  const [i0,j0,i1,j1]=rect?[ix(rect[0]),iz(rect[1]),ix(rect[2]),iz(rect[3])]:[0,0,l.cols-1,l.rows-1] as const;
  const cols=i1-i0+1,rows=j1-j0+1,count=cols*rows;
  const pos=new Float32Array(3*count),col=new Float32Array(3*count),normal=rect&&new Float32Array(3*count);
  const idx=count>65535?new Uint32Array((cols-1)*(rows-1)*6):new Uint16Array((cols-1)*(rows-1)*6);
  let k=0,f=0;
  const tint = new Map(Object.entries(COVER).map(([k, v]) => [k, new T.Color(v)]));
  const neutral = new T.Color('#a5a47b');
  const base=new T.Color(), avg=new T.Color(), n=new T.Vector3();
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = l.x0 + i * l.step, z = l.z0 + j * l.step, y = l.h[j * l.cols + i]!;
    pos[k]=x;pos[k+1]=y;pos[k+2]=z;
    relief(y,base,!!designAt);
    const kind = p.basin.coverAt(x, z)?.kind, c = kind ? tint.get(kind) : undefined;
    const edge = Math.min(i, j, l.cols - 1 - i, l.rows - 1 - j) * l.step, w = Math.min(1, edge / 200);
    if (c) base.lerp(c, w);
    else if (kind === 'unknown') {
      // Terrain tint only: no generated parcels, named cover or new density on unknown ground.
      const variation = .5+.24*Math.sin(x/317+z/463)+.17*Math.cos(x/163-z/182);
      base.lerp(neutral,w*(.12+variation*.24));
    }
    if(kind!=='water'&&kind!=='pond_complex'&&kind!=='river_margin'&&kind!=='transport_land')
    for(const tintZone of p.groundTints??[]){
      const {kind:surface,rect:[l,t,r,b]}=tintZone;
      const edge=Math.min(x-l,r-x,z-t,b-z),color=tint.get(surface);
      const grain=surface==='graded_ground'?.87+.09*Math.sin(x/42+z/63)+.04*Math.cos(x/13-z/19):1;
      if(!color||edge<0||!inTint(tintZone,x,z)||kind==='field'&&tintZone.protectFields||
        tintZone.ring&&(kind==='settlement'||kind==='worksite'))continue;
      // Adjoining January yards share a cut surface, including their common edge.
      if(surface==='graded_ground')base.copy(color).multiplyScalar(grain);
      else base.lerp(color,Math.min(1,edge/15));
    }
    if(designAt){
      // Soft 4-tap blend across 100 m cell edges so transitions follow relief smoothly.
      let hits=0,r=0,gr=0,bl=0,graded=0;
      for(const [dx,dz] of [[-14,-14],[14,-14],[-14,14],[14,14]] as const){
        const hit=designAt(x+dx,z+dz);
        if(!hit)continue;
        const c=designTones.get(hit.surface)!;
        hits++;r+=c.r;gr+=c.g;bl+=c.b;
        if(hit.surface==='graded_ground')graded++;
      }
      if(hits>0){
        const mix=(hits/4)*w;
        const soil=graded>0?.90+.07*Math.sin(x/37+z/49)+.04*Math.cos(x/15-z/21):.95+.03*Math.sin(x/43+z/53)+.02*Math.cos(x/17-z/23);
        avg.setRGB(r/hits,gr/hits,bl/hits).multiplyScalar(soil);
        base.lerp(avg,mix);
      }
    }
    col[k]=base.r;col[k+1]=base.g;col[k+2]=base.b;
    if(normal){
      const step=l.step;
      n.set(l.at(x-step,z)-l.at(x+step,z),2*step,l.at(x,z-step)-l.at(x,z+step)).normalize();
      const q=blendNormal?.(x,z,n)??n;
      normal[k]=q.x;normal[k+1]=q.y;normal[k+2]=q.z;
    }
    if(i<i1&&j<j1){
      const a=k/3,d=a+cols;
      idx[f++]=a;idx[f++]=d;idx[f++]=a+1;idx[f++]=a+1;idx[f++]=d;idx[f++]=d+1;
    }
    k+=3;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(pos,3));
  g.setAttribute('color',new T.BufferAttribute(col,3));
  g.setIndex(new T.BufferAttribute(idx,1));
  if(normal)g.setAttribute('normal',new T.BufferAttribute(normal,3));else g.computeVertexNormals();
  const m = new T.Mesh(g,material??new T.MeshLambertMaterial({vertexColors:true}));
  m.name = 'basin-ground'; m.receiveShadow = true;
  return m;
}

/** Merge ribbons into one geometry: flat top plus optional embankment skirts down to the lattice. */
export function ribbonGeometry(at: (x:number,z:number)=>number, list: Ribbon[], clear: ReadonlySet<string>, colour: (cls: string) => T.Color, skirts: boolean) {
  const pos: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const r0 of list) for (const r of splitMasked(r0, clear)) {
    const n = normals(r.points), c = colour(r.cls);
    let dist = 0;
    const base = pos.length / 3, stride = skirts ? 4 : 2;
    r.points.forEach(([x, z], i) => {
      if (i) dist += Math.hypot(x - r.points[i - 1]![0], z - r.points[i - 1]![1]);
      const [nx, nz] = n[i]!, y = r.ys[i]!, h = r.half;
      const lx = x + nx * h, lz = z + nz * h, rx = x - nx * h, rz = z - nz * h;
      pos.push(lx, y, lz, rx, y, rz);
      uv.push(0, dist, 2 * h, dist);
      if (skirts) {
        const drop = r.skirt[i] ? Math.max(0, y - Math.min(at(lx, lz), at(rx, rz))) : 0;
        const k = Math.min(r.cls==='ballast'?14:22, Math.max(0.6, drop * 1.4));
        const ox = x + nx * (h + k), oz = z + nz * (h + k), qx = x - nx * (h + k), qz = z - nz * (h + k);
        pos.push(ox, r.skirt[i] ? at(ox, oz) - 0.4 : y - 0.6, oz, qx, r.skirt[i] ? at(qx, qz) - 0.4 : y - 0.6, qz);
        uv.push(-k, dist, 2 * h + k, dist);
      }
      for (let k = 0; k < stride; k++) col.push(c.r, c.g, c.b);
      if (!i) return;
      const a = base + (i - 1) * stride, b = base + i * stride;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
      if (skirts) idx.push(a + 2, b + 2, a, a, b + 2, b, a + 1, b + 1, a + 3, a + 3, b + 1, b + 3);
    });
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function splitMasked(r: Ribbon, clear: ReadonlySet<string>): Ribbon[] {
  if (!clear.size || r.masked.every(m => !m.length)) return [r];
  const out: Ribbon[] = [];
  let start = -1;
  const push = (a: number, b: number) => {
    if (b - a > 1) out.push({...r, points: r.points.slice(a, b), ys: r.ys.slice(a, b), skirt: r.skirt.slice(a, b), masked: r.masked.slice(a, b)});
  };
  r.masked.forEach((m, i) => {
    const ok = live(m, clear);
    if (ok && start < 0) start = i;
    if (!ok && start >= 0) { push(start, i); start = -1; }
  });
  if (start >= 0) push(start, r.points.length);
  return out;
}

function waterGeometry(p: BasinRenderPlan) {
  const pos: number[] = [], idx: number[] = [];
  const dyke = 4;
  const joinedNormals = new Map<string, ReturnType<typeof normals>[number]>();
  for(const r of p.net.rivers) for(const q of p.net.rivers){
    if(r===q)continue;
    const end=r.points.at(-1)!,start=q.points[0]!;
    if(end[0]!==start[0]||end[1]!==start[1])continue;
    joinedNormals.set(end.join(),normals([r.points.at(-2)!,end,q.points[1]!])[1]!);
  }
  for (const r of p.net.rivers) {
    const n = normals(r.points), base = pos.length / 3;
    r.points.forEach(([x, z], i) => {
      const joined=i===0||i===r.points.length-1?joinedNormals.get([x,z].join()):undefined;
      const [nx, nz] = joined??n[i]!, y = r.level[i]!, h = r.widths[i]!+dyke*.6;
      pos.push(x + nx * h, y, z + nz * h, x - nx * h, y, z - nz * h);
      if (i) { const a = base + (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
  }
  for (const pd of p.ponds) {
    const ring = pd.ring.slice(0, pd.ring.at(-1)![0] === pd.ring[0]![0] && pd.ring.at(-1)![1] === pd.ring[0]![1] ? -1 : undefined);
    const base = pos.length / 3;
    for (const [x, z] of ring) pos.push(x, pd.level, z);
    for (const t of T.ShapeUtils.triangulateShape(ring.map(([x, z]) => new T.Vector2(x, z)), [])) idx.push(base + t[0]!, base + t[2]!, base + t[1]!);
  }
  if (p.reservoir) for (const [x0, z0, x1, z1] of p.reservoir.quads) {
    const base = pos.length / 3, y = p.reservoir.level;
    pos.push(x0, y, z0, x1, y, z0, x0, y, z1, x1, y, z1);
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const normal = new Float32Array(pos.length);
  for (let i = 1; i < normal.length; i += 3) normal[i] = 1;
  g.setAttribute('normal', new T.BufferAttribute(normal, 3));
  return g;
}

function unitBox() {
  const g = new T.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
}
function gableRoof() {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([-.5, 0, -.5, .5, 0, -.5, .5, 0, .5, -.5, 0, .5, -.5, 1, 0, .5, 1, 0], 3));
  g.setIndex([0, 4, 5, 0, 5, 1, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2, 0, 1, 2, 0, 2, 3]);
  const flat = g.toNonIndexed(); g.dispose(); flat.computeVertexNormals();
  return flat;
}

type Inst = {x:number;y:number;z:number;a:number;w:number;h:number;d:number;c:number};
const inst=(x:number,y:number,z:number,a:number,w:number,h:number,d:number,c:number):Inst=>({x,y,z,a,w,h,d,c});
const boxInst = (b: Box) => inst(b.x, b.y0, b.z, b.a, b.w, b.y1 - b.y0, b.d, b.c);
function batch(name: string, geo: T.BufferGeometry, mat: T.Material, list: Inst[], cast = true) {
  const m = new T.InstancedMesh(geo, mat, Math.max(1, list.length));
  const tmp=new T.Object3D(),color=new T.Color();
  list.forEach(({x,y,z,a,w,h,d,c},i)=>{
    tmp.position.set(x,y,z);tmp.rotation.set(0,-a,0);tmp.scale.set(w,Math.max(.01,h),d);tmp.updateMatrix();
    m.setMatrixAt(i,tmp.matrix);m.setColorAt(i,color.setHex(c));
  });
  m.count = list.length; m.name = name; m.castShadow = cast; m.receiveShadow = true;
  m.computeBoundingSphere();
  return m;
}

/**
 * Facade material: UVs come from the instance scale, so 1 U = 1 bay and 1 V = 1 storey on every building,
 * whatever its size. A 2 × 2 atlas holds a plain bay and a door bay for the ground floor and upper floors.
 */
export function facadeMaterial(arch: Arch, map?: T.Texture) {
  const {bay, storey} = ARCH[arch];
  const mat = new T.MeshLambertMaterial({map: map ?? null, flatShading: false});
  mat.onBeforeCompile = shader => {
    shader.uniforms.facadeBay = {value: bay};
    shader.uniforms.facadeStorey = {value: storey};
    shader.vertexShader = 'uniform float facadeBay, facadeStorey;\nvarying vec2 vFacade;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 facadeScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      #else
        vec3 facadeScale = vec3(1.0);
      #endif
      float facadeAlong = abs(normal.x) > 0.5 ? (position.z + 0.5) * facadeScale.z : (position.x + 0.5) * facadeScale.x;
      vFacade = vec2(facadeAlong / facadeBay, position.y * facadeScale.y / facadeStorey);`);
    shader.fragmentShader = 'varying vec2 vFacade;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        float facadeFloor = floor(vFacade.y + 1e-4);
        float facadeDoor = (facadeFloor < 0.5 && mod(floor(vFacade.x + 1e-4), 3.0) == 1.0) ? 0.5 : 0.0;
        vec2 facadeUv = vec2(facadeDoor + fract(vFacade.x) * 0.5, (facadeFloor < 0.5 ? 0.0 : 0.5) + fract(vFacade.y) * 0.5);
        vec2 facadeGrad = vFacade * 0.5;
        diffuseColor *= textureGrad(map, facadeUv, dFdx(facadeGrad), dFdy(facadeGrad));
      #endif`);
  };
  mat.customProgramCacheKey = () => 'facade:' + arch;
  return mat;
}

export interface BasinScene {group: T.Group; dispose(): void; counts: Record<string, number>}

export function fabricResources(textures?:BuildOpts['textures']){
  const box=unitBox(), roof=gableRoof(), sphere=new T.IcosahedronGeometry(0.5,1), cone=new T.ConeGeometry(0.5,1,7);
  cone.translate(0,0.5,0);
  const flat=new T.MeshLambertMaterial({flatShading:true});
  const walls=new Map((Object.keys(ARCH) as Arch[]).map(a=>[a,facadeMaterial(a,textures?.[a])]));
  return {box,roof,sphere,cone,flat,walls,dispose:()=>{
    [box,roof,sphere,cone].forEach(g=>g.dispose());flat.dispose();walls.forEach(m=>m.dispose());
  }};
}
export type FabricResources=ReturnType<typeof fabricResources>;

/** All offsets are local to the fitted rectangle; multipart silhouettes rotate with the parcel. */
export function buildingParts(buildings:readonly Building[], boxes:Inst[] = []) {
  const walls=new Map<Arch,Inst[]>(), roofs:Inst[]=[];
  for (const b of buildings) {
    const {w,d,floors}=b, spec=ARCH[b.arch], s=spec.storey, h=floors*s, top=b.base+h;
    const pick=(xs:number[])=>xs[Math.floor(b.tone*xs.length)%xs.length]!;
    const palette=pick(WALL[b.arch]), cos=Math.cos(b.a), sin=Math.sin(b.a);
    function part(list:Inst[],u:number,y:number,v:number,width:number,height:number,depth:number,color:number) {
      list.push(inst(b.x+cos*u-sin*v,b.base+y,b.z+sin*u+cos*v,b.a,width,height,depth,color));
    }
    const box=(u:number,y:number,v:number,w:number,h:number,d:number,c:number)=>part(boxes,u,y,v,w,h,d,c);
    function wall(u:number,y:number,v:number,w:number,h:number,d:number) {
      if(!walls.has(b.arch))walls.set(b.arch,[]);
      part(walls.get(b.arch)!,u,y,v,w,h,d,palette);
    }
    const concrete=0xb6b2a4, cap=0xa39f93, plaster=0xd2cdbb;
    boxes.push(inst(b.x,b.foot,b.z,b.a,w+.5,b.base-b.foot,d+.5,0x9c9585));
    if(b.arch==='early_highrise'){
      const sw=w-9.6, sd=d-6.4;
      if(b.stage==='tower_works'){
        // Open decks on continuous columns; two broader podium decks below the shaft.
        for(let f=1;f<=floors;f++)
          box(0,f*s-.32,0,f<=2?w:sw,.32,f<=2?d:sd,concrete);
        for(const u of [-1,0,1])for(const v of [-1,1])
          box(u*(sw/2-.8),0,v*(sd/2-.8),.85,h+.9,.85,0xa19e93);
        for(const u of [-1,1])for(const v of [-1,1])
          box(u*(w/2-.85),0,v*(d/2-.85),1,2*s,1,concrete);
        box(-sw*.18,0,0,4.6,h+1.5,4.2,0xa29c8c);
        const poles=0x6e6451;
        for(const v of [-sd/2-.62,sd/2+.62]){
          for(let u=-sw/2;u<=sw/2;u+=2.4)box(u,2*s,v,.16,h-2*s+.5,.16,poles);
          for(let y=2*s+1.05;y<h;y+=1.6)box(0,y,v,sw+.4,.12,.18,poles);
          box(0,h-.31,v,sw+.5,.28,.92,0xa79e85);
        }
        for(const u of [-sw/2-.62,sw/2+.62]){
          for(let v=-sd/2;v<=sd/2;v+=2.4)box(u,2*s,v,.16,h-2*s+.5,.16,poles);
          for(let y=2*s+1.05;y<h;y+=1.6)box(u,y,0,.18,.12,sd+.4,poles);
        }
        const mast=w*.28, craneTop=h+Math.min(8,2+s*floors*.25), ochre=0x9c8050;
        box(mast,0,0,.85,craneTop,.85,ochre);
        box(w*.07,craneTop-.34,0,w*.74,.48,.64,ochre);
        box(w*.07,craneTop+.4,0,w*.69,.23,.25,ochre);
        for(const u of [-.24,-.10,.04,.18,.32])box(w*u,craneTop,0,.16,.46,.16,ochre);
        box(w*.39,craneTop-.75,0,w*.13,.75,1.05,0x8b8170);
        box(-w*.19,h+.5,0,.09,craneTop-h-.65,.09,0x675f52);
      }else{
        wall(0,0,0,w,2*s,d); box(0,2*s-.2,0,w,.36,d,cap);
        wall(0,2*s,0,sw,h-2*s,sd);
        box(-sw*.29,2*s,sd/2,2.5,h-2*s+.6,.8,plaster);
        box(0,h,0,sw+.3,.45,sd+.3,cap);
        box(sw*.14,h+.4,0,sw*.46,s*.73,sd*.61,plaster);
        box(sw*.14,h+.4+s*.73,0,sw*.49,.26,sd*.64,cap);
      }
    }else if(b.arch==='standard_factory'){
      wall(0,0,-.35,w,h,d-.7);
      box(0,h,0,w,.38,d,cap);
      box(-w/2+3,0,d/2-.35,4.2,h,.7,plaster);
      box(-w/2+3,h,d/2-2,4.2,2.25,4,plaster);
    }else if(b.arch==='factory_hall'){
      wall(0,0,0,w,h,d);
      const colour=pick(ROOF.factory_hall!);
      for(const v of [-d/4,d/4]){
        part(roofs,0,h,v,w+.52,d*.082,d/2+.36,colour);
        for(let u=3-w/2;u<w/2;u+=6)part(roofs,u,h+.045,v,.16,d*.082,d/2+.36,0x647f85);
      }
      box(0,h-.08,0,w+.48,.15,.42,0x78807d);
      box(0,0,d/2-.28,w*.69,.18,1.0,concrete);
    }else if(b.arch==='estate_slab'){
      wall(0,0,-.42,w,h,d-.84);
      for(const u of [-w*.24,w*.24]){
        box(u,0,d/2-.38,1.8,h,.76,0xcac0ae);
        box(u,h,d*.1,2.3,1.64,3.4,plaster);
      }
      for(let f=1;f<floors;f++)for(const u of [-w*.37,0,w*.37]){
        box(u,f*s-.18,d/2-.38,w*.18,.19,.76,concrete);
        box(u,f*s,d/2-.09,w*.18,.77,.18,plaster);
      }
      box(0,h,0,w+.2,.32,d+.24,cap);
    }else if(b.arch==='worker_dorm'){
      // Set the long wall behind the gallery lip. Short return walls close each end.
      wall(0,0,-.7,w,h,d-1.4);
      for(const end of [-1,1]) box(end*(w/2-.18),0,d/2-.7,.36,h,1.4,plaster);
      for(let f=1;f<floors;f++){
        box(0,f*s-.18,d/2-.7,w,.2,1.4,concrete);
        box(0,f*s,d/2-.09,w,.9,.18,plaster);
      }
      box(0,h,0,w,.38,d,cap);
    }else if(b.arch==='village_villa'){
      wall(0,0,0,w,s,d);
      wall(0,s,-.8,w,s,d-1.6);
      box(0,s,d/2-.8,w,.12,1.6,concrete);
      box(0,s,d/2-.1,w,.85,.2,plaster);
      for(const end of [-1,1])box(end*(w/2-.1),s,d/2-.83,.2,.85,1.26,plaster);
      box(0,h,-.8,w,.25,d-1.6,cap);
    }else{
      if(b.arcade){
        const arcadeDepth=1.6;
        wall(0,0,-arcadeDepth/2,w,h,d-arcadeDepth);
        box(0,.01,d/2-arcadeDepth/2,w,.13,arcadeDepth,0xbfb29b);
        box(0,s-.36,d/2-arcadeDepth/2,w,.4,arcadeDepth+.15,plaster);
        if(floors>1)box(0,s,d/2-.68,w,.84,.77,palette);
        const bays=Math.max(1,Math.round(w/ARCH.lingnan_block.bay));
        for(let i=0;i<=bays;i++)box((w-.38)*(i/bays-.5),0,d/2-.24,.32,s-.28,.34,palette);
      }else wall(0,0,0,w,h,d);
      if (spec.roof === 'flat') {
        boxes.push(inst(b.x, top, b.z, b.a, w + 0.3, 0.7, d + 0.3, 0x9d998e));
        if (b.tone > 0.4) box(w*(b.tone-.7),h,0,4,2.6,4,0xb8b2a2);
      } else {
        const rise = spec.roof === 'low' ? d * 0.13 : d * 0.3;
        roofs.push(inst(b.x, top, b.z, b.a, w + 0.7, rise, d + 1.1, pick(ROOF[b.arch]!)));
      }
    }
  }
  return {boxes,walls,roofs};
}

export function buildingMeshes({boxes,walls,roofs}:ReturnType<typeof buildingParts>,res:FabricResources){
  const meshes:T.InstancedMesh[]=[];
  if(boxes.length)meshes.push(batch('basin-boxes',res.box,res.flat,boxes));
  for(const [arch,list] of walls)meshes.push(batch('basin-walls-'+arch,res.box,res.walls.get(arch)!,list));
  if(roofs.length)meshes.push(batch('basin-roofs',res.roof,res.flat,roofs));
  return meshes;
}

export function buildScene(p: BasinRenderPlan, o: BuildOpts): BasinScene {
  const group = new T.Group();
  group.name = 'procedural-basin';
  const materials: T.Material[] = [], geometries: T.BufferGeometry[] = [];
  const keepM = <M extends T.Material>(m: M) => (materials.push(m), m);
  const keepG = <G extends T.BufferGeometry>(g: G) => (geometries.push(g), g);
  const add = (o3: T.Object3D) => { group.add(o3); return o3; };

  if(o.sections!=='fabric'){
  if(!o.deferGround){
    const ground = groundMesh(p);
    keepG(ground.geometry); keepM(ground.material); add(ground);
  }

  const water = new T.Mesh(keepG(waterGeometry(p)), keepM(new T.MeshPhongMaterial({color: '#5f8d8e', specular: '#2a3a3a', shininess: 40,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2})));
  water.name = 'basin-water'; water.receiveShadow = true; add(water);

  const civilColour = (cls: string) => new T.Color(RIBBON[cls] ?? '#b0a088');
  const civil = new T.Mesh(keepG(ribbonGeometry(p.lattice.at, [...p.net.ribbons, ...p.banks, ...p.dykes], o.clear, civilColour, true)),
    keepM(new T.MeshLambertMaterial({vertexColors: true})));
  civil.name = 'basin-civil'; civil.receiveShadow = true; civil.castShadow = true; add(civil);

  const trackTex = o.textures?.track;
  const tracks = new T.Mesh(keepG(ribbonGeometry(p.lattice.at, p.net.tracks, o.clear, () => new T.Color(trackTex ? '#ffffff' : '#5d5650'), false)),
    keepM(new T.MeshLambertMaterial({vertexColors: true, map: trackTex ?? null, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1})));
  tracks.name = 'basin-tracks'; add(tracks);
  }

  // Boxes: land pieces, bridge parts, foundation skirts, flat-roof parapets, tree trunks.
  const boxes: Inst[] = [], canopy: Inst[] = [], cones: Inst[] = [];
  let roofCount=0;
  const buildings = o.sections==='static'?[]:p.buildings.filter(b => live(b.masks, o.clear));
  const trees = o.sections==='static'?[]:p.trees.filter(t => live(t.masks, o.clear));
  const own = o.sections!=='static'&&!o.shared?fabricResources(o.textures):undefined;
  if(o.sections!=='static'){
  const res=o.shared??own!;
  for (const pc of p.pieces) if (live(pc.masks, o.clear)) boxes.push(boxInst(pc));
  for (const br of p.net.bridges) for (const bx of br.boxes) boxes.push(boxInst(bx));
  const parts=buildingParts(buildings,boxes);
  roofCount=parts.roofs.length;
  const leaf: Record<Tree['kind'], number[]> = {
    banyan: [0x5f7a4c, 0x6a8452], lychee: [0x4f6b45, 0x5b7749], bamboo: [0x7d9a58, 0x88a35f], pine: [0x4d6648, 0x587250], scrub: [0x7d8d5e, 0x8a9864],
  };
  for (const t of trees) {
    const c = leaf[t.kind][t.tone < 0.5 ? 0 : 1]!, trunk = t.kind === 'bamboo' ? 0 : t.h * (t.kind === 'scrub' ? 0.15 : 0.35);
    if (trunk) boxes.push(inst(t.x, t.base - 0.5, t.z, t.tone * 3, 0.35 + t.r * 0.08, trunk + 0.5, 0.35 + t.r * 0.08, 0x6d5c49));
    if (t.kind === 'pine' || t.kind === 'bamboo') cones.push(inst(t.x, t.base + trunk * 0.6, t.z, t.tone * 6, t.r * 2, t.h - trunk * 0.6, t.r * 2, c));
    else canopy.push(inst(t.x, t.base + trunk + (t.h - trunk) / 2, t.z, t.tone * 6, t.r * 2, (t.h - trunk) * (t.kind === 'banyan' ? 0.7 : 0.95), t.r * 2, c));
  }
  buildingMeshes(parts,res).forEach(add);
  if(canopy.length)add(batch('basin-canopy',res.sphere,res.flat,canopy));
  if(cones.length)add(batch('basin-cones',res.cone,res.flat,cones));
  }

  // Mask outlines appear only while their areas are cleared for detailed models.
  const outlines: number[] = [];
  for (const m of p.basin.masks) if (o.sections!=='fabric'&&o.clear.has(m.id)) {
    const ring = m.poly.rings[0]!;
    ring.forEach(([x, z], i) => {
      const [x2, z2] = ring[(i + 1) % ring.length]!;
      outlines.push(x, p.lattice.at(x, z) + 1.5, z, x2, p.lattice.at(x2, z2) + 1.5, z2);
    });
  }
  if (outlines.length) {
    const g = keepG(new T.BufferGeometry());
    g.setAttribute('position', new T.Float32BufferAttribute(outlines, 3));
    const line = new T.LineSegments(g, keepM(new T.LineDashedMaterial({color: '#b0472f', dashSize: 14, gapSize: 8, depthTest: false, toneMapped: false})));
    line.computeLineDistances(); line.renderOrder = 9; line.name = 'basin-mask-outlines'; add(line);
  }
  const counts = {buildings: buildings.length, trees: trees.length, boxes: boxes.length, roofs: roofCount, meshes: group.children.length};
  return {group, counts, dispose: () => {
    group.traverse(x => { if (x instanceof T.InstancedMesh) x.dispose(); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());own?.dispose();
  }};
}
