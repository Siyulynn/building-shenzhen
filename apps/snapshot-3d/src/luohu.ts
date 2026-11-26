import * as T from 'three';
import {chainage,nearest,segDist,type P} from './procgen/geom';
import {pointAt} from './procgen/network';
import {toWorld,type RawMap} from './procgen/gis';
import type {GenCfg} from './procgen/plan';
import {epochEntries,type EpochModel} from './epochs';

export const luohuStudy={
  name:['Luohu commercial corridor','罗湖商业走廊'],
  road:'south-transverse-road',
  anchors:['guomao','guoshang','luohu-development'],
  note:{
    en:'An illustrative eye-level view, not a matched photograph. Guomao is still under construction; Guoshang is the separate, completed building shown as a junction proxy. The work yard, podium details, road edges and camera position are illustrative.',
    zh:'视平线街景仅为示意，并非照片复拍。国贸仍在施工；国商是另一座已竣工建筑，以路口示意表现。工地、裙房细部、道路边缘与视点均为示意。',
  },
  comparison:{
    en:'Same camera, earlier atlas snapshot. The January-only street dressing is hidden. The view does not establish when individual parcels changed.',
    zh:'保持同一视角，查看较早的图集时点。一月专用街景细部已隐藏；此图不能确定各地块的变化时间。',
  },
} as const;

export const luohuClaims=()=>epochEntries('visit').filter(e=>luohuStudy.anchors.some(id=>e.id===id));
type Height=(x:number,z:number)=>number;

/** The viewpoint and curb are authored in metres against an existing September
 * trace. Its unchanged streamed road ribbon is the only carriageway. */
export function luohuCorridor(map:RawMap,cfg:GenCfg,models:EpochModel[]){
  const f=map.layers.alignments?.find(f=>f.id===luohuStudy.road);
  const road=cfg.roads[luohuStudy.road];
  const guomao=models.find(m=>m.id==='guomao'),guoshang=models.find(m=>m.id==='guoshang');
  if(f?.geometry.type!=='LineString'||!road||!guomao||!guoshang)throw Error('Missing Luohu street study anchors');
  const line=f.geometry.coordinates.map(toWorld),half=road.width/2;
  const zero=nearest(line,...toWorld([203100,2495690])).s;
  function point(u:number,v:number):P{
    const [x,z]=pointAt(line,zero+u), [a,b]=pointAt(line,zero+u-.1),[c,d]=pointAt(line,zero+u+.1);
    const len=Math.hypot(c-a,d-b);
    return [x-(d-b)/len*v,z+(c-a)/len*v];
  }
  const eye=point(0,half+2.2),look=point(140,-33),at=point(111,0);
  return {line,half,point,eye,look,at,guomao,guoshang,vertices:chainage(line).map(s=>s-zero)};
}
type Corridor=ReturnType<typeof luohuCorridor>;

export function luohuCamera(c:Corridor,ground:Height){
  const y=ground(...c.eye);
  return {eye:new T.Vector3(c.eye[0],y+1.68,c.eye[1]),look:new T.Vector3(c.look[0],y+19,c.look[1]),fov:46};
}

/** Only add street-scale dressing. The two visible landmark shells are the
 * same atlas batches as in the overhead view, not duplicate models. */
export function buildLuohu(c:Corridor,ground:Height){
  const group=new T.Group();
  group.name='luohu-corridor-lod2';
  group.userData={status:'illustrative-street-study',claim_ids:[...new Set(luohuClaims().flatMap(e=>e.claims))].join(';')};
  group.position.set(c.at[0],ground(...c.at),c.at[1]);
  const o=new T.Object3D(),color=new T.Color();
  type Batch=[T.Matrix4,number][];
  const curbs:Batch=[],verge:Batch=[],yard:Batch=[],entry:Batch=[],drums:Batch=[];
  function part(batch:Batch,x:number,y:number,z:number,w:number,h:number,d:number,tint:number,yaw=0){
    o.position.set(x-group.position.x,y-group.position.y,z-group.position.z);
    o.scale.set(w,h,d);o.rotation.set(0,yaw,0);o.updateMatrix();
    batch.push([o.matrix.clone(),tint]);
  }
  function vergePart(u:number,v:number,bottom:number,w:number,h:number,d:number,tint:number,batch=verge){
    const [x,z]=c.point(u,v),[a,b]=c.point(u+.2,v);
    box(batch,x,z,bottom,w,h,d,tint,-Math.atan2(b-z,a-x));
  }
  function box(batch:Batch,x:number,z:number,bottom:number,w:number,h:number,d:number,tint:number,yaw=0){
    part(batch,x,ground(x,z)+bottom+h/2,z,w,h,d,tint,yaw);
  }
  const [gx,gz]=c.guomao.at,[sx,sz]=c.guoshang.at;

  // A short, broken run of verge kerbs. The setback leaves the network's
  // road edges and grades alone; each premade block follows local relief.
  const ranges=[[-12,37],[48,89],[108,153]] as const;
  for(const side of [-1,1])for(const [start,end] of ranges){
    const v=side*(c.half+(side<0?1.0:1.45));
    for(let s=start;s<end;s+=1.55){
      if(c.vertices.some(u=>Math.abs(u-s)<1.2))continue;
      const [x,z]=c.point(s,v),[nx,nz]=c.point(s+.2,v);
      if(c.line.slice(1).some((b,i)=>segDist(x,z,c.line[i]!,b)<c.half+.62))continue;
      box(curbs,x,z,-.08,1.47,.49,.23,s%3<1?0xa29b88:0xb2a791,-Math.atan2(nz-z,nx-x));
    }
  }
  // Roadside foreground: intermittent paving, low concrete posts and a
  // hand-stacked supply pallet. None extends onto the streamed carriageway.
  for(let u=1;u<32;u+=1.2)for(const lane of [0,1]){
    const i=Math.round(u/1.2);
    if((i+lane*3)%13===0)continue;
    const tone=[0xa79b83,0xafa58f,0xa89c87,0xaaa18d][(i+lane*5)%4]!;
    vergePart(u+.59*lane,c.half+2.28+lane*1.08,-.11,1.18,.30,1.05,tone);
  }
  for(const u of [9,20,31,44])for(const side of [-1,1]){
    const v=side*(c.half+(side>0?4.45:1.95));
    vergePart(u,v,-.07,.24,.84,.24,0xa59a84);
    vergePart(u,v,.54,.245,.16,.245,0xbdb49c);
  }
  const palletV=c.half+6.2;
  for(let j=-2;j<=2;j++)vergePart(15.7+j*.24,palletV,.1,.21,.08,.97,0x857459);
  for(const d of [-.34,.34])vergePart(15.7,palletV+d,-.01,1.17,.16,.16,0x6e604c);
  for(const [u,v,tint] of [[15.39,palletV-.18,0x7d7d61],[15.99,palletV+.18,0x8e7961],[16.8,palletV+.68,0x6d7869]] as const){
    const bottom=u<16?.16:-.03;
    vergePart(u,v,bottom,.54,.84,.54,tint,drums);
    for(const h of [.14,.64])vergePart(u,v,bottom+h,.561,.046,.561,0x6f6654,drums);
  }

  // Low site enclosure, interrupted at the yard gate. It is inside the
  // existing reserved work pad, not an outline of the historic plot.
  for(const [from,to] of [[-38,-17],[-8,27]] as const){
    for(let x=from;x<to;x+=1.12){
      box(yard,gx+x+.50,gz+24,-.12,1.09,2.0+(x%3)*.019,.13,x%4<1?0x777a67:0x858873);
      if(Math.round((x-from)/1.12)%3===0)box(yard,gx+x,gz+24.15,-.17,.12,2.20,.18,0x695d4d);
    }
  }
  for(const x of [-17,-8])box(yard,gx+x,gz+24,-.22,.21,2.63,.24,0x82705a);
  // A small site hut and stacks inside the pad, clear of the tower shell.
  const hutY=ground(gx-28,gz+15);
  part(yard,gx-28,hutY+1.19,gz+15,7.5,2.78,4.8,0xa9987c);
  part(yard,gx-28,hutY+2.64,gz+15,8,.19,5.18,0x73796d);
  part(yard,gx-26.4,hutY+1.14,gz+17.42,.88,2.16,.10,0x665d4d);
  for(const i of [-1,0,1])part(yard,gx-29.8+i*.52,hutY+1.64,gz+17.44,.39,.58,.11,0x515d57);
  for(let n=0;n<3;n++)for(let j=0;j<9;j++){
    box(yard,gx+8+(j-4)*.36,gz+18,.06+n*.20,.28,.18,5.3,n%2===0?0x917152:0xa18561);
  }

  // Scaffold on the visible west face. Its spacing and extent do not
  // calibrate the tower's January slab count or crane height.
  const base=ground(gx,gz),west=gx-15.55;
  for(const x of [west,west-1.54])for(let j=0;j<=6;j++)
    part(yard,x,base+9.5,gz-12+j*4,.13,20,.13,0x766654);
  for(let tier=0;tier<6;tier++){
    const y=base+1.1+tier*3.15;
    for(const x of [west,west-1.54])part(yard,x,y,gz,.10,.09,24.2,0x786452);
    if(tier%2===0)part(yard,west-.77,y-.15,gz,1.34,.10,24,0x9b8567);
  }
  for(let tier=0;tier<5;tier++)for(const z of [-10,-2,6]){
    const h=3.15,d=4;
    // Rotate a beam about X so the diagonal lies in the west elevation.
    o.position.set(west-1.58-group.position.x,base+2.68+tier*h-group.position.y,gz+z-group.position.z);
    o.scale.set(.085,Math.hypot(d,h),.085);o.rotation.set((tier%2===0?1:-1)*Math.atan2(d,h),0,0);
    o.updateMatrix();yard.push([o.matrix.clone(),0x776653]);
  }

  // Small shaded entrance to suggest the finished podium without changing
  // the silhouette of the Guoshang junction proxy.
  const sy=ground(sx,sz);
  part(entry,sx-22.08,sy+1.85,sz-3,.16,3.54,13.6,0x515e5b);
  part(entry,sx-23.2,sy+3.7,sz-3,2.7,.32,14.4,0xc6bca5);
  for(let i=-3;i<=3;i++)part(entry,sx-22.2,sy+1.85,sz-3+i*1.92,.14,3.55,.12,0x928e7d);
  for(const v of [-6.6,6.6])part(entry,sx-24.14,sy+1.8,sz-3+v,.26,3.8,.26,0xb6ae99);
  const step=Math.min(ground(sx-24.5,sz-3)+.14,sy+.25);
  for(let i=0;i<3;i++)part(entry,sx-22.48-i*.64,step+.22*(1-i),sz-3,.74,.65,14.2,0x9a9181);

  const geo=new T.BoxGeometry(),round=new T.CylinderGeometry(.5,.5,1,12),mat=new T.MeshLambertMaterial();
  for(const [name,batch] of [['kerb',curbs],['verge',verge],['supply-drums',drums],['work-yard',yard],['finished-entry',entry]] as const){
    const mesh=new T.InstancedMesh(name==='supply-drums'?round:geo,mat,batch.length);
    mesh.name='luohu-'+name;mesh.castShadow=name!=='kerb';mesh.receiveShadow=true;
    batch.forEach(([matrix,tint],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.setHex(tint));});
    mesh.computeBoundingSphere();group.add(mesh);
  }
  return {group,dispose:()=>{
    for(const child of group.children)if(child instanceof T.InstancedMesh)child.dispose();
    geo.dispose();round.dispose();mat.dispose();group.clear();
  }};
}
