import * as T from 'three';
import {ground,type Grid} from '../grid';
import {terrainMesh} from '../terrain';
import {chainage,densify,offset,poly,principalAngle} from './geom';
import {inTint,masksAt,toWorld} from './gis';
import {coreDry,districtCoverBlocked,districtFabric,type District} from './districts';
import {buildScene,fabricResources,groundMesh,ribbonGeometry,type BuildOpts} from './mesh';
import {dryAt,overviewHeight,routeMesh,type MunicipalMap,type MunicipalPlan} from './municipal-lod0';
import {Corridors,openKerbAtJunctions,type Ribbon} from './network';
import {grove,settlement} from './fabric';
import type {BasinPlan,BasinRenderPlan} from './plan';
import {bucket,overlaps,partitionSurface,TILE,tileKey,tileRect,type Tile} from './tiles';
import {januaryGroundAt,januaryFieldCuts} from './january-ground';

const noMask=new Set<string>();
type Mode='always'|'estimated';
interface Surface {source:T.Mesh; tile:ReturnType<typeof partitionSurface>; mode:Mode}

/** Compile profiles once in world metres. A tile only sees interpolated pieces of these profiles. */
export function pilotNetwork(g:Grid,p:Pick<BasinRenderPlan,'basin'|'net'>,doc:MunicipalMap,at:(x:number,z:number)=>number= (x,z)=>ground(g,x,z)){
  const corridors=new Corridors(), base:Ribbon[]=[], estimated:Ribbon[]=[];
  for(const f of doc.features){
    if(f.geometry.type!=='LineString'||f.render_status==='review_required')continue;
    const pts=densify(f.geometry.coordinates.map(toWorld),25), s=chainage(pts);
    const isPreview=f.id.startsWith('m84.road.');
    const cls=f.kind==='river'?'river':f.kind==='rail'?'ballast':f.id==='shangbu-clearance-west'?'works':
      f.roadProfile?`preview-${f.roadProfile}`:isPreview?'preview-road':'main';
    const yr=pts.map(([x,z])=>at(x,z)+(f.kind==='river'?.38:f.roadProfile==='arterial'?.52:isPreview?.31:.55));
    const ys=yr.map((y,i)=>{
      if(isPreview)return y;
      const around=yr.slice(Math.max(0,i-2),i+3);
      return Math.max(y,around.reduce((a,b)=>a+b,0)/around.length);
    });
    const half=f.kind==='river'?43:f.kind==='rail'?4.5:cls==='works'?15:
      f.roadProfile==='arterial'?16.5:f.roadProfile==='local'?7:f.roadProfile==='service'?3.3:5;
    for(const a of f.core_anchors){
      const point=p.basin.lines.get(a.core)?.points.at(a.end==='start'?0:-1);
      if(!point)continue;
      const [x,z]=point;
      const i=pts[0]![0]===x&&pts[0]![1]===z?0:pts.length-1;
      if(pts[i]![0]!==x||pts[i]![1]!==z)continue;
      const river=p.net.rivers.find(r=>r.id===a.core);
      const civil=p.net.ribbons.find(r=>r.id===a.core&&r.points.some(([xx,zz])=>xx===x&&zz===z));
      const j=civil?.points.findIndex(([xx,zz])=>xx===x&&zz===z);
      const start=river?.level.at(a.end==='start'?0:-1)??(j!==undefined?civil?.ys[j]:undefined);
      if(start===undefined)continue;
      for(let k=0;k<ys.length;k++){
        const u=Math.min(1,Math.abs(s[k]!-s[i]!)/160);
        ys[k]=start*(1-u)+ys[k]!*u;
      }
    }
    // The estuary record runs downstream from the core portal. This visual
    // proxy cannot climb back uphill; it is not a surveyed water level.
    if(f.id==='shenzhen-river-estuary')
      for(let i=1;i<ys.length;i++)ys[i]=Math.min(ys[i-1]!,ys[i]!);
    // Switched independently of the evidence and visually distinguished from mapped core routes.
    const plan={id:f.id,cls,points:pts,ys,half,skirt:pts.map(()=>f.kind!=='river'),masked:pts.map(()=>[])};
    (f.basis==='estimated'?estimated:base).push(plan);
    corridors.add(pts,half+(f.roadProfile==='service'?2:5),f.id);
  }
  // Separate evidence records can share a portal (the two old-road legs at Nantou).
  // Join neighbouring proxy heights; never treat the join as a surveyed grade.
  const ends=new Map<string,{r:Ribbon;i:number}[]>();
  for(const r of [...base,...estimated].filter(r=>r.cls!=='river'))for(const i of [0,r.points.length-1]){
    const key=`${r.cls}:${r.points[i]!.join(',')}`, matches=ends.get(key)??[];
    matches.push({r,i});ends.set(key,matches);
  }
  for(const matches of ends.values())if(matches.length>1){
    const y=matches.reduce((h,{r,i})=>Math.max(h,r.ys[i]!),-Infinity);
    for(const {r,i} of matches)r.ys[i]=y;
  }
  return {base,estimated,corridors};
}

/** Use whole instance footprints, including roof/foliage overhang, so wall,
 * foundation and roof are not split into visible fragments around an infill. */
export function fabricFits(reserved:readonly (readonly number[])[],x:number,z:number,w:number,d:number,a=0){
  const c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),u=(c*w+s*d)/2,v=(s*w+c*d)/2;
  return !reserved.some(r=>overlaps(r,[x-u,z-v,x+u,z+v]));
}

export function tileGround(g:Grid,lattice:BasinPlan['lattice']){
  // Conform exterior 100 m terrain to the 400 m fallback at tile boundaries.
  // Honour the original core lattice at its outer seam, then mix over a short collar.
  const cell=g.meta.cell_m;
  const bounds=lattice.cells.map(v=>v*cell) as [number,number,number,number];
  const [x0,z0,x1,z1]=bounds;
  function vertex(x:number,z:number){
    const raw=ground(g,x,z);
    const edge=Math.min(x%TILE,z%TILE,TILE-x%TILE,TILE-z%TILE);
    const basinDist=Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1));
    const t=Math.min(1,edge/210);
    return raw+(overviewHeight(g,x,z)-raw)*(1-t*t*(3-2*t))*Math.min(1,basinDist/360);
  }
  function at(x:number,z:number){
    if(lattice.inside(x,z))return lattice.at(x,z);
    const m=g.meta.cell_m, a=Math.floor(x/m)*m,b=Math.floor(z/m)*m, u=(x-a)/m,v=(z-b)/m;
    return u+v<=1?vertex(a,b)*(1-u-v)+vertex(a+m,b)*u+vertex(a,b+m)*v:
      vertex(a+m,b+m)*(u+v-1)+vertex(a+m,b)*(1-v)+vertex(a,b+m)*(1-u);
  }
  return {vertex,at,bounds};
}

export function createTileSource({g,plan,doc,reviewRoutes,water,material,textures,clear,reserved=[],districts=[],januaryDesign=false,anchorAccess=[]}:{
  g:Grid;plan:BasinPlan;doc:MunicipalMap;water:Uint8Array;material:T.Material;
  reviewRoutes:MunicipalPlan['routes'];
  textures:BuildOpts['textures'];clear:ReadonlySet<string>;reserved?:[number,number,number,number][];districts?:District[];
  januaryDesign?:boolean;anchorAccess?:Ribbon[];
}){
  const res=fabricResources(textures);
  const coreMaterial=new T.MeshLambertMaterial({vertexColors:true});
  const coreRect=plan.lattice.cells;
  const hole={left:coreRect[0],top:coreRect[1],right:coreRect[2],bottom:coreRect[3]};
  const cell=g.meta.cell_m, maxX=(g.meta.width-1)*cell, maxZ=(g.meta.height-1)*cell;
  const {at,vertex,bounds:allCore}=tileGround(g,plan.lattice);
  const [x0,z0,x1,z1]=allCore;
  const network=pilotNetwork(g,plan,doc,at);
  const frontage=districts.flatMap(d=>d.frontageLayout?[d.frontageLayout]:[]);
  const junctionRoads=[...plan.net.ribbons.filter(r=>!r.id.includes('/')&&r.cls!=='ballast'),
    ...network.estimated.filter(r=>r.cls.startsWith('preview-'))];
  const ribbons=plan.net.ribbons.flatMap(r=>{
    if(r.cls!=='paved-edge')return [r];
    const avenue=junctionRoads.find(road=>road.cls==='arterial'&&r.id.startsWith(road.id+'/edge/')&&
      road.points.length===r.points.length&&Math.hypot(r.points[0]![0]-road.points[0]![0],r.points[0]![1]-road.points[0]![1])<=road.half);
    return avenue?openKerbAtJunctions(r,avenue,junctionRoads):[r];
  });
  const core=buildScene({...plan,net:{...plan.net,ribbons:[...ribbons,...frontage.flatMap(layout=>layout.access),...anchorAccess]}},
    {clear,textures,sections:'static',deferGround:true});
  const tint=(cls:string)=>new T.Color(cls==='river'?'#5f8d8e':cls==='works'?'#bb9b73':'#9c896d');
  const baseMesh=new T.Mesh(ribbonGeometry(at,network.base,noMask,tint,true),
    new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));
  const roadInk:Record<string,string>={ballast:'#856c4c','preview-road':'#9b7758','preview-works':'#aa825d',
    'preview-arterial':'#a29781','preview-local':'#a69b85','preview-service':'#9a917d'};
  const estMesh=new T.Mesh(ribbonGeometry(at,network.estimated,noMask,c=>new T.Color(roadInk[c]??'#b1956c'),true),
    new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));
  // Keep the Shennan continuation in the same palette as the core avenue.
  // District streets have narrow paved centres; service lanes and works stay compacted.
  const pavement=network.estimated.flatMap(r=>{
    const avenue=r.cls==='preview-arterial';
    if(!avenue&&r.cls!=='preview-local')return [];
    const top={...r,half:avenue?11.5:5.25,ys:r.ys.map(y=>y+.08)};
    if(!avenue)return [top];
    return [top,...[-1,1].flatMap(side=>openKerbAtJunctions({
      ...r,cls:'paved-edge',half:.43,points:offset(r.points,side*12.35),ys:r.ys.map(y=>y+.11),
    },r,junctionRoads))];
  });
  const regionalPavement=new T.Mesh(ribbonGeometry(at,pavement,noMask,
      cls=>new T.Color(cls==='paved-edge'?'#bdb099':'#706d62'),false),
    new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));
  regionalPavement.name='pilot-preview-pavement';
  const rail=network.estimated.filter(r=>r.cls==='ballast').map(r=>({...r,half:1.35,ys:r.ys.map(y=>y+.16)}));
  const estTrack=new T.Mesh(ribbonGeometry(at,rail,noMask,()=>new T.Color(textures?.track?'#c9bba6':'#514837'),false),
    new T.MeshLambertMaterial({vertexColors:true,map:textures?.track??null,side:T.DoubleSide}));
  const review=routeMesh(g,reviewRoutes,'review',at);
  // The modern surface hides parts of the downstream profile. Keep a narrow
  // alignment overlay for continuity without cutting a fictional channel
  // into the DEM or implying that its sides are historic banks.
  const estuary=network.base.filter(r=>r.id==='shenzhen-river-estuary')
    .map(r=>({id:r.id,points:r.points,kind:'river' as const,style:'base' as const,width:24}));
  const estuaryGuide=routeMesh(g,estuary,'base',at,.55);
  estuaryGuide.name='pilot-estuary-guide';
  baseMesh.name='pilot-base';estMesh.name='pilot-estimate';estTrack.name='pilot-estimated-track';
  const estMeshes=[estMesh,estTrack,review,regionalPavement], regional=[baseMesh,estuaryGuide,...estMeshes];
  const surfaces:Surface[]=[], outlines:T.LineSegments[]=[];
  for(const obj of [...core.group.children,...regional]){
    if(obj instanceof T.Mesh)surfaces.push({source:obj,tile:partitionSurface(obj.geometry,[maxX,maxZ]),
      mode:estMeshes.some(m=>m===obj)?'estimated':'always'});
    else if(obj instanceof T.LineSegments)outlines.push(obj);
  }
  const fits=(x:number,z:number,w:number,d:number,a=0)=>fabricFits(reserved,x,z,w,d,a);
  const ordinary=[...reserved,...districts.filter(d=>!d.trim&&!d.designZone).map(d=>d.rect)];
  const fieldCuts=[...reserved,...districts.filter(d=>!d.trim&&!d.protectFields&&!d.designSurface&&!d.designZone).map(d=>d.rect),
    ...(januaryDesign?januaryFieldCuts:[])];
  const designAt=januaryDesign?(x:number,z:number)=>{
    const area=januaryGroundAt(x,z);
    if(area&&dryAt(g,water,x,z)&&coreDry(plan.basin,x,z)&&!plan.net.water.hit(x,z))return area;
  }:undefined;
  const trims=districts.filter(d=>d.trim);
  const previewStreets=network.estimated.filter(r=>r.cls.startsWith('preview-'));
  const streetCut=new Corridors();
  for(const r of previewStreets)streetCut.add(r.points,r.half+3,r.id);
  const aprons=new Corridors();
  for(const r of anchorAccess)aprons.add(r.points,r.half,r.id);
  const clearOfAprons=(x:number,z:number,w:number,d:number,a=0)=>!aprons.hitsFootprint(x,z,w,d,a);
  const clearOfPreview=(x:number,z:number,w:number,d:number,a=0)=>
    !previewStreets.length||!streetCut.hitsFootprint(x,z,w,d,a);
  const ordinaryBuilding=({x,z,w,d,a,parent}:BasinRenderPlan['buildings'][number])=>
    fabricFits(ordinary,x,z,w+1.2,d+1.2,a)&&clearOfPreview(x,z,w+1.2,d+1.2,a)&&clearOfAprons(x,z,w+1.2,d+1.2,a)&&
    !trims.some(t=>t.trim===parent&&!fabricFits([t.rect],x,z,w+1.2,d+1.2,a));
  const ordinaryTree=({x,z,r}:BasinRenderPlan['trees'][number])=>fabricFits(ordinary,x,z,2*r,2*r)&&clearOfPreview(x,z,2*r,2*r);
  const fitsBuilding=({x,z,w,d,a}:BasinRenderPlan['buildings'][number])=>fits(x,z,w+1.2,d+1.2,a);
  const infillRects=districts.filter(d=>d.infill).map(d=>d.rect);
  const fitsInfill=({x,z,w,d,a}:Pick<BasinRenderPlan['buildings'][number],'x'|'z'|'w'|'d'|'a'>)=>
    fabricFits(infillRects,x,z,w+1.2,d+1.2,a);
  const overlays=districts.map(d=>districtFabric(d,{
    height:at,masks:(x,z,what)=>masksAt(plan.basin,x,z,what),blocked:(x,z)=>
       districtCoverBlocked(d,plan.basin.coverAt(x,z),x,z,januaryDesign)||
       !(plan.lattice.inside(x,z)?
         (coreDry(plan.basin,x,z)||d.designSurface==='transport_land'&&plan.basin.coverAt(x,z)?.kind==='transport_land')&&
           (!januaryDesign||dryAt(g,water,x,z)):dryAt(g,water,x,z))||
       !!plan.net.corridors.hit(x,z,6)||
       !!plan.net.water.hit(x,z)||!!network.corridors.hit(x,z,6)||!!aprons.hit(x,z),
  }));
  // Ground art may replace dry September fields, never pond cells, their
  // internal bunds or dry details belonging to a pond mosaic.
  const pondPrefixes=plan.basin.cover.filter(a=>a.kind==='pond_complex').map(a=>a.id+'/');
  const farmPrefixes=plan.basin.cover.filter(a=>a.kind==='field').map(a=>a.id+'/');
  const urbanTints=plan.groundTints?.filter(t=>t.ring&&!t.protectFields)??[];
  const layeredTrees=overlays.flatMap((a,i)=>
    districts[i]!.form==='villa-court'||districts[i]!.form==='grove'||districts[i]!.form==='park'||districts[i]!.compound?a.trees:[]);
  const buildings=bucket([...plan.buildings.filter(ordinaryBuilding),...overlays.flatMap((a,i)=>
      a.buildings.filter(b=>fitsBuilding(b)&&(districts[i]!.infill||fitsInfill(b)))),
      ...frontage.flatMap(layout=>layout.buildings)]),
    trees=bucket([...plan.trees.filter(ordinaryTree),...layeredTrees.filter(({x,z,r})=>
      fitsInfill({x,z,w:2*r,d:2*r,a:0})&&fits(x,z,2*r,2*r)),...frontage.flatMap(layout=>layout.trees)]),
    pieces=bucket([...plan.pieces.filter(p=>{
      if(pondPrefixes.some(id=>p.key.startsWith(id)))return true;
      const farm=farmPrefixes.some(id=>p.key.startsWith(id));
      return fabricFits(farm?fieldCuts:ordinary,p.x,p.z,p.w,p.d,p.a)&&clearOfPreview(p.x,p.z,p.w,p.d,p.a)&&
         clearOfAprons(p.x,p.z,p.w,p.d,p.a)&&
        !(farm&&urbanTints.some(t=>inTint(t,p.x,p.z)));
    }),
        ...overlays.flatMap((a,i)=>a.pieces.filter(p=>fits(p.x,p.z,p.w,p.d,p.a)&&
          (districts[i]!.infill||fitsInfill(p)))),...frontage.flatMap(layout=>layout.pieces)]);
  const bridges=new Map<string,typeof plan.net.bridges>();
  for(const b of plan.net.bridges)for(const [key,boxes] of bucket(b.boxes)){
    const list=bridges.get(key)??[];
    list.push({...b,boxes});bridges.set(key,list);
  }
  const villages=doc.features.flatMap(f=>{
    if(f.kind!=='settlement'||f.geometry.type!=='Polygon')return [];
    const area=poly(f.geometry.coordinates.map(r=>r.map(toWorld)));
    return [{id:f.id,poly:area,angle:principalAngle(area.rings[0]!),preview:f.urbanPreview}];
  });
  const env={height:at,blocked:(x:number,z:number)=>!dryAt(g,water,x,z)||!!network.corridors.hit(x,z,4),
    masks:()=>[]};
  const urbanEnv={...env,blocked:(x:number,z:number)=>{
    const cover=plan.basin.coverAt(x,z);
     return env.blocked(x,z)||!coreDry(plan.basin,x,z)||cover?.kind==='settlement'||cover?.kind==='worksite'||cover?.kind==='field'||
       !!designAt?.(x,z)||
      !!plan.net.water.hit(x,z)||!!plan.net.corridors.hit(x,z,6);
  }};
  const outerNormal=(x:number,z:number,n:T.Vector3)=>n.set(
    vertex(Math.max(0,x-cell),z)-vertex(Math.min(maxX,x+cell),z),2*cell,
    vertex(x,Math.max(0,z-cell))-vertex(x,Math.min(maxZ,z+cell))).normalize();
  const edgeA=new T.Vector3(),edgeB=new T.Vector3(),coarse=new T.Vector3();
  function collarNormal(x:number,z:number,n:T.Vector3){
    const distance=Math.min(x-x0,x1-x,z-z0,z1-z);
    if(distance>=160)return n;
    const a=Math.floor(x/cell)*cell,b=Math.floor(z/cell)*cell,u=(x-a)/cell,v=(z-b)/cell;
    // Match linearly interpolated exterior vertex normals along the common
    // edge and blend toward the core-lattice normals inside it.
    outerNormal(a,b,coarse).multiplyScalar((1-u)*(1-v));
    coarse.addScaledVector(outerNormal(a+cell,b,edgeA),u*(1-v));
    coarse.addScaledVector(outerNormal(a,b+cell,edgeB),(1-u)*v);
    coarse.addScaledVector(outerNormal(a+cell,b+cell,edgeA),u*v);
    return coarse.lerp(n,Math.max(0,distance/160));
  }
  function smoothLand(geo:T.BufferGeometry){
    const pos=geo.getAttribute('position'), normal=geo.getAttribute('normal'), n=new T.Vector3();
    for(let i=0;i<pos.count;i++){
      outerNormal(pos.getX(i),pos.getZ(i),n);normal.setXYZ(i,n.x,n.y,n.z);
    }
  }
  function make(tile:Tile){
    const k=tileKey(tile),rect=tileRect(tile);
    const fabric=villages.filter(a=>overlaps(a.poly.box,rect)).map(a=>{
      if(!a.preview){
        if(januaryDesign&&a.id==='south-sungang-envelope'){
          // Break up the coarse 750×900 m regional Sungang envelope into loose rural village clusters with orchard trees.
          const [bx0,bz0,bx1,bz1]=a.poly.box, cx=(bx0+bx1)/2, cz=(bz0+bz1)/2;
          const ruralEnv={...env,blocked:(x:number,z:number)=>{
            if(env.blocked(x,z))return true;
            const d=Math.hypot((x-cx)/290,(z-cz)/340);
            const n=Math.sin(x/127+z/149)*0.32+Math.cos(x/91-z/113)*0.24;
            return d+n>0.82;
          }};
          const s=settlement(a,a.angle,{parcel:92,lane:20,mix:{village_row:1}},ruralEnv,'sz-sungang-rural',rect);
          const gTrees=grove(a,18,.38,{lychee:3,banyan:1.2,bamboo:1.8},env,'sz-sungang-trees')
            .filter(t=>t.x>=rect[0]&&t.x<rect[2]&&t.z>=rect[1]&&t.z<rect[3]);
          return {...s,trees:[...s.trees,...gTrees]};
        }
        return settlement(a,a.angle,{parcel:80,lane:6,mix:{village_row:1}},env,'sz-municipal-1980',rect);
      }
      const mix=a.preview==='industrial'?{standard_factory:3,worker_dorm:1}:
        a.preview==='civic'?{danwei_slab:2,lingnan_block:1}:{lingnan_block:3,danwei_slab:1};
      return settlement(a,a.angle,{parcel:100,lane:14,mix},urbanEnv,'sz-urban-context-1984',rect);
    });
    const part=buildScene({...plan,buildings:[...buildings.get(k)??[],...fabric.flatMap(a=>a.buildings.filter(ordinaryBuilding))],
      trees:[...trees.get(k)??[],...fabric.flatMap(a=>a.trees.filter(ordinaryTree))],
      pieces:pieces.get(k)??[],net:{...plan.net,bridges:bridges.get(k)??[]}},{clear,shared:res,sections:'fabric'});
    const tileEst:T.Mesh[]=[], owned:T.BufferGeometry[]=[];
    const [l,t,r,b]=rect.map(v=>v/cell) as [number,number,number,number];
    const touchesCore=overlaps(rect,allCore);
    const land=terrainMesh(g,{left:l,top:t,right:Math.min(r,g.meta.width-1),bottom:Math.min(b,g.meta.height-1)},
      1,material,touchesCore?hole:undefined,vertex);
    land.name='pilot-ground';smoothLand(land.geometry);
    part.group.add(land);owned.push(land.geometry);
    if(touchesCore){
      const detailed=groundMesh(plan,rect,coreMaterial,collarNormal,designAt);
      part.group.add(detailed);owned.push(detailed.geometry);
    }
    for(const s of surfaces){
      const geo=s.tile(tile);if(!geo)continue;
      const mesh=new T.Mesh(geo,s.source.material);
      mesh.name=s.source.name;mesh.receiveShadow=s.source.receiveShadow;mesh.castShadow=s.source.castShadow;
      if(s.mode==='estimated')tileEst.push(mesh);
      owned.push(geo);part.group.add(mesh);
    }
    part.group.name='tile:'+k;
    return {group:part.group,tile,estimates:tileEst,dispose:()=>{
      owned.forEach(g=>g.dispose());part.dispose();
    }};
  }
  return {make,outlines,dispose:()=>{
    core.dispose();res.dispose();coreMaterial.dispose();
    regional.forEach(m=>{m.geometry.dispose();m.material.dispose();});
  }};
}
