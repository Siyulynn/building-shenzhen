import * as T from 'three';
import type {Grid} from '../grid';
import {chainage, contains, densify, normals, poly, type P} from './geom';
import {corners} from './fabric';
import {loadBasin, toWorld, type GroundTint, type RawMap} from './gis';
import {designTones,relief,coverTone} from './mesh';
import {Corridors,pointAt} from './network';
import {coreDry,districtCoverBlocked,districtFabric,districtHits,districtRoofHeight,type District} from './districts';
import {overlaps,type TileCutouts} from './tiles';
import {januaryGroundAt,retainedField} from './january-ground';

export interface MunicipalFeature {
  id: string; kind: 'rail'|'road'|'river'|'settlement'|'field'; basis: 'estimated'|'interpreted'|'visible';
  name: [string,string]; claims: string[]; sources: string[]; reason: string; reasonZh?:string; searchHalfWidthM?: number;
  render_status?: 'aerial_candidate'|'review_required';
  /** Render-only reading of the 1984 street map's developed-block pattern. */
  urbanPreview?:'industrial'|'market'|'civic';
  roadProfile?:'local'|'service'|'works'|'arterial';
  geometry: {type:'LineString'; coordinates:number[][]} | {type:'Polygon'; coordinates:number[][][]};
  core_anchors: {core:string; end:'start'|'end'}[];
}
export interface ReservoirComparator {id:string;name:[string,string];cell:[number,number];cells:number;claims:string[];source:string}
export interface MunicipalMap {
  format:string; crs:string; units:string; date:string; bounds:number[];
  sources:Record<string,{id?:string;url?:string;locator:string}>;
  water_comparator:{date:string;reservoirs?:ReservoirComparator[]}; features:MunicipalFeature[]; open:{en:string;zh:string}[];
  package:{water_bytes:number};
}
const codes = new Set([0,1,2,3,4,255]);
export function validateMunicipal(map:MunicipalMap, water:Uint8Array, g:Grid, core:RawMap){
  const {meta:{width,height,cell_m,origin_top_left:[w,n]}}=g;
  const bounds=[w,n-height*cell_m,w+width*cell_m,n];
  if(map.format!=='sz-municipal-map-v1'||map.crs!==g.meta.crs||map.units!=='m'||map.date!==core.date||
    map.water_comparator.date!=='1979-10-19'||map.bounds.join()!==bounds.join()||
    water.length!==width*height||map.package.water_bytes!==water.length||!water.every(v=>codes.has(v)))
    throw Error('Municipal package does not match atlas registration');
  const reservoirs=map.water_comparator.reservoirs;
  if(reservoirs){
    const n=reservoirs.reduce((sum,r)=>sum+r.cells,0), seen=new Set<string>();
    if(n!==water.reduce((n,v)=>n+Number(v===3),0))throw Error('Reservoir components do not match water comparator');
    for(const {id,cell:[c,r],cells,name,claims,source} of reservoirs){
      if(seen.has(id)||!Number.isInteger(c)||!Number.isInteger(r)||c<0||r<0||c>=width||r>=height||
        water[r*width+c]!==3||!Number.isInteger(cells)||cells<=0||name.length!==2||!name.every(Boolean)||
        !claims.length||source!=='landsat_1979_10_19')throw Error('Invalid reservoir comparator: '+id);
      seen.add(id);
    }
  }
  const ids=new Set();
  for(const f of map.features){
    const validate=(p:number[])=>p.length===2&&p.every(Number.isFinite)&&
      p[0]!>=bounds[0]!&&p[0]!<=bounds[2]!&&p[1]!>=bounds[1]!&&p[1]!<=bounds[3]!;
    const geom=f.geometry;
    if(ids.has(f.id)||!(geom.type==='LineString'?geom.coordinates.every(validate):geom.coordinates.every(r=>r.every(validate)))||
      f.sources.some(id=>!(id in map.sources))||
      (f.basis==='estimated'&&(!f.claims.length||!(f.searchHalfWidthM!>0))))throw Error('Invalid municipal feature: '+f.id);
    for(const a of f.core_anchors){
      const c=core.layers.alignments!.find(r=>r.id===a.core);
      const v=c?.geometry.type==='LineString'?c.geometry.coordinates.at(a.end==='start'?0:-1):undefined;
      if(!v||geom.type!=='LineString'||![geom.coordinates[0],geom.coordinates.at(-1)].some(p=>p?.join()===v.join()))
        throw Error('Broken core portal: '+f.id);
    }
    ids.add(f.id);
  }
}

export type WaterLook='land'|'sea'|'reservoir'|'nearshore'|'isolated'|'modern-fallback'|'no-data';
export function waterLook(code:number,modern:number):WaterLook{
  switch(code){
    case 1:return 'sea';
    case 2:return 'nearshore';
    case 3:return 'reservoir';
    case 4:return 'isolated';
    case 255:return modern===1?'modern-fallback':'no-data';
    default:return 'land';
  }
}

export function dryAt(g:Grid,water:Uint8Array,x:number,z:number){
  const {meta:{width,height,cell_m}}=g, c=Math.round(x/cell_m), r=Math.round(z/cell_m);
  if(r<0||r>=height||c<0||c>=width)return false;
  return waterLook(water[r*width+c]!,g.modernWater[r*width+c]!)==='land';
}

/** Sample the exact triangles of the 400 m municipal terrain, not the invisible 100 m triangles. */
export function overviewHeight(g:Grid,x:number,z:number){
  const {width,height,cell_m:m}=g.meta;
  const c=T.MathUtils.clamp(x/m,0,width-1), r=T.MathUtils.clamp(z/m,0,height-1);
  const i=Math.min(Math.floor((width-2)/4)*4,Math.floor(c/4)*4);
  const j=Math.min(Math.floor((height-2)/4)*4,Math.floor(r/4)*4);
  const k=Math.min(i+4,width-1), l=Math.min(j+4,height-1), u=(c-i)/(k-i), v=(r-j)/(l-j);
  const v00=g.elevation[j*width+i]!,v10=g.elevation[j*width+k]!,v01=g.elevation[l*width+i]!,v11=g.elevation[l*width+k]!;
  return u+v<=1?v00*(1-u-v)+v10*u+v01*v:v11*(u+v-1)+v10*(1-v)+v01*(1-u);
}

type RenderKind='road'|'rail'|'river'|'works';
type RenderStyle='base'|'estimate'|'review';
interface Route {id:string; points:P[]; kind:RenderKind; style:RenderStyle; width:number}
interface Cluster {x:number;z:number;size:number;height:number;depth?:number;district?:string;angle?:number}
interface Cover {kind:string; poly:ReturnType<typeof poly>; dryOnly?:boolean; protectFields?:boolean}
export interface MunicipalPlan {
  routes:Route[];cover:Cover[];roofs:Cluster[];
  januaryDesign:boolean;
  dryCoverAt:(x:number,z:number)=>boolean;fieldAt:(x:number,z:number)=>boolean;
  designAt:(x:number,z:number)=>ReturnType<typeof januaryGroundAt>;
}

export function planMunicipal(map:MunicipalMap,core:RawMap,canBuild:(x:number,z:number)=>boolean,
  reserved:readonly (readonly number[])[]=[],groundTints:GroundTint[]=[],districts:District[]=[],januaryDesign=false):MunicipalPlan{
  const b=loadBasin(core,[]);
  const cover=b.cover.filter(a=>['settlement','field','upland_cover','worksite','pond_complex'].includes(a.kind));
  const regional=map.features.flatMap(f=>f.geometry.type==='Polygon'?[{id:f.id,kind:f.kind,
    preview:!!f.urbanPreview,dryOnly:!!f.urbanPreview,protectFields:!!f.urbanPreview,
    poly:poly(f.geometry.coordinates.map(r=>r.map(toWorld)))}]:[]);
  const tints=groundTints.map(({kind,rect:[l,t,r,b],ring,protectFields})=>({kind,dryOnly:true,protectFields,
    poly:poly([ring??[[l,t],[r,t],[r,b],[l,b],[l,t]]])}));
  const all=[...cover,...regional,...tints];
  const designAt=(x:number,z:number)=>{
    const area=januaryDesign?januaryGroundAt(x,z):undefined;
    if(area&&canBuild(x,z)&&coreDry(b,x,z))return area;
  };
  const fieldAt=(x:number,z:number)=>retainedField(b.coverAt(x,z)?.kind,x,z,!!designAt(x,z));
  const routes:Route[]=[];
  // Mesh widths are screen-legibility exaggerations at city scale, not historical widths.
  const widths={rail:108,road:130,works:115,river:112};
  const hasShennan=map.features.some(f=>f.roadProfile);
  for(const l of b.lines.values()){
    if(!(hasShennan&&l.id==='market-south-road')&&!['rail-main','shangbu-east-west-corridor','shangbu-southern-link','town-west-approach','south-transverse-road',
         'river-main-west','river-main-east','buji-lower'].includes(l.id))continue;
    const kind=l.kind==='water'?'river':!hasShennan&&l.id==='shangbu-east-west-corridor'?'works':l.kind==='rail'?'rail':'road';
    const shennan=hasShennan&&(l.id==='market-south-road'||l.id==='shangbu-east-west-corridor');
    routes.push({id:l.id,points:l.points,kind,style:'base',width:shennan?58:widths[kind]});
  }
  for(const f of map.features)if(f.geometry.type==='LineString'){
    const style=f.render_status==='review_required'?'review':f.basis==='estimated'?'estimate':'base';
    const kind=f.id==='shangbu-clearance-west'?'works':f.kind as RenderKind;
    routes.push({id:f.id,points:f.geometry.coordinates.map(toWorld),kind,style,
        width:style==='review'?2*f.searchHalfWidthM!:f.roadProfile==='arterial'?48:f.roadProfile==='service'?14:
          f.id.startsWith('m84.road.')?26:widths[kind]});
  }
  const roofs:Cluster[]=[];
  const hasPreview=regional.some(a=>a.preview);
  const roofExclusion=new Corridors(),streetCut=new Corridors();
  if(hasPreview)for(const r of routes){
    if(r.style!=='review')roofExclusion.add(r.points,r.kind==='river'?55:14,r.id);
    if(r.id.startsWith('m84.road.'))streetCut.add(r.points,r.width/2,r.id);
  }
  const footprints=districts.filter(d=>d.infill).map(d=>d.rect);
  for(const a of [...cover,...regional]){
    if(a.kind!=='settlement')continue;
    const preview='preview' in a&&a.preview;
    const [l,t,r,d]=a.poly.box, step=preview?126:96, size=preview?37:58;
    for(let z=Math.ceil(t/step)*step;z<d;z+=step)
      for(let x=Math.ceil(l/step)*step;x<r;x+=step){
        if(januaryDesign&&a.id==='south-sungang-envelope'){
          const cx=(l+r)/2,cz=(t+d)/2;
          if(Math.hypot((x-cx)/290,(z-cz)/340)+Math.sin(x/127+z/149)*0.32+Math.cos(x/91-z/113)*0.24>0.82)continue;
        }
         if(!reserved.some(r=>overlaps(r,[x-size/2-1,z-size/2-1,x+size/2+1,z+size/2+1]))&&
           !streetCut.hit(x,z,size*.71)&&
           !districtHits(districts,[x-size/2-1,z-size/2-1,x+size/2+1,z+size/2+1],a.id)&&
           [-1,0,1].every(i=>[-1,0,1].every(j=>{
             if(!preview&&(!i||!j))return true;
             const px=x+i*size/2,pz=z+j*size/2;
             const original=b.coverAt(px,pz)?.kind;
             return contains(a.poly,px,pz)&&canBuild(px,pz)&&(!preview||
                 (coreDry(b,px,pz)&&original!=='settlement'&&original!=='worksite'&&original!=='field'&&
                  !designAt(px,pz)&&!roofExclusion.hit(px,pz)));
           })))
          roofs.push({x,z,size,height:6+((Math.floor(x/step)*3+Math.floor(z/step)*7)%5)});
      }
  }
  const buildableDistrict=(d:District)=>d.frontageLayout||d.mix||d.form==='villa-court'||d.form==='works-compound'||
    d.form==='rail-yard'||d.infill||d.form==='graded-yard'&&d.surface==='worksite';
  if(districts.some(buildableDistrict)){
    const exclusion=new Corridors();
    for(const l of b.lines.values())if(['water','rail','road'].includes(l.kind))
      exclusion.add(l.points,l.kind==='water'?30:l.kind==='rail'?12:17,l.id);
    for(const f of map.features)if(f.geometry.type==='LineString'&&f.render_status!=='review_required')
      exclusion.add(f.geometry.coordinates.map(toWorld),f.kind==='river'?48:14,f.id);
      for(const d of districts)if(buildableDistrict(d)){
         const {buildings}=districtFabric(d,{height:()=>0,masks:()=>[],blocked:(x,z)=>{
           const cover=b.coverAt(x,z);
           const dry=coreDry(b,x,z)||d.designSurface==='transport_land'&&cover?.kind==='transport_land';
           return districtCoverBlocked(d,cover,x,z,januaryDesign)||
             !(cover?dry&&(!januaryDesign||canBuild(x,z)):canBuild(x,z))||
             !!exclusion.hit(x,z)||reserved.some(([l,t,r,b])=>x>=l!&&x<=r!&&z>=t!&&z<=b!);
         }});
       const clear=d.infill?reserved:[...reserved,...footprints];
        for(const b of buildings)if(!clear.some(r=>overlaps(r,[b.x-b.w/2,b.z-b.d/2,b.x+b.w/2,b.z+b.d/2])))
         roofs.push({x:b.x,z:b.z,size:b.w,depth:b.d,height:districtRoofHeight(b),district:d.id});
        for(const b of d.frontageLayout?.buildings??[])
          roofs.push({x:b.x,z:b.z,size:b.w,depth:b.d,height:districtRoofHeight(b),district:d.id,angle:b.a});
    }
  }
  return {routes,cover:all,roofs,januaryDesign,fieldAt,designAt,dryCoverAt:(x,z)=>coreDry(b,x,z)};
}

export function municipalTexture(g:Grid,water:Uint8Array,plan:MunicipalPlan){
  const {width:w,height:h,cell_m:m}=g.meta;
  const image=new Uint8Array(w*h*4), color=new T.Color();
  const waterColors:Partial<Record<WaterLook,T.Color>>={
    sea:new T.Color('#79a5a8'),reservoir:new T.Color('#689596'),nearshore:new T.Color('#9faa8d'),
    isolated:new T.Color('#9ba999'),'modern-fallback':new T.Color('#92aeb6'),
  };
  const shades=new Map<number,T.Color>();
  for(const a of plan.cover){
    const [l,t,r,b]=a.poly.box, tone=coverTone(a.kind);
    if(!tone)continue;
    const tint=new T.Color(tone);
    for(let y=Math.max(0,Math.ceil(t/m));y<h&&y<=b/m;y++)
      for(let x=Math.max(0,Math.ceil(l/m));x<w&&x<=r/m;x++)
        if(contains(a.poly,x*m,y*m)&&(!a.dryOnly||plan.dryCoverAt(x*m,y*m))&&
          (!a.protectFields||!plan.fieldAt(x*m,y*m)))shades.set(y*w+x,tint);
  }
  for(let i=0;i<w*h;i++){
    const tone=waterColors[waterLook(water[i]!,g.modernWater[i]!)];
    if(tone)color.copy(tone);else relief(g.elevation[i]!,color,plan.januaryDesign);
    if(!tone){
      const surface=plan.designAt(i%w*m,Math.floor(i/w)*m)?.surface;
      const shade=surface?designTones.get(surface):shades.get(i);
      if(shade)color.lerp(shade,.64);
    }
    color.convertLinearToSRGB();
    const k=i*4;
    image[k]=Math.round(255*color.r);image[k+1]=Math.round(255*color.g);image[k+2]=Math.round(255*color.b);image[k+3]=255;
  }
  const texture=new T.DataTexture(image,w,h);
  texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=true;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
  return texture;
}

const inks:Record<RenderKind,number>={rail:0x4c5051,road:0x8c644f,works:0xb89462,river:0x689b9e};
export function routeMesh(g:Grid,list:Route[],style:RenderStyle,at=(x:number,z:number)=>overviewHeight(g,x,z),lift=4){
  const pos:number[]=[], indices:number[]=[], colors:number[]=[];
  const push=(route:Route,pts:P[])=>{
    const n=normals(pts),base=pos.length/3,half=route.width/2;
    const color=new T.Color(style==='review'?0xb67d4e:inks[route.kind]);
    for(let i=0;i<pts.length;i++){
      const [x,z]=pts[i]!,[nx,nz]=n[i]!;
      for(const s of [-1,1]){
        const px=x+nx*half*s,pz=z+nz*half*s;
       pos.push(px,at(px,pz)+lift,pz);
        colors.push(color.r,color.g,color.b);
      }
      if(i){const a=base+2*(i-1);indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
  };
  for(const r of list.filter(r=>r.style===style)){
    const pts=densify(r.points,55);
    if(style==='base'){push(r,pts);continue;}
    const s=chainage(pts),len=s.at(-1)!;
    const preview=r.id.startsWith('m84.road.');
    const period=preview?140:style==='review'?900:540,dash=preview?96:style==='review'?540:350;
    let j=0;
    for(let lo=0;lo<len;lo+=period){
      const hi=Math.min(len,lo+dash);
      const between:P[]=[];
      while(j<s.length&&s[j]!<=lo)j++;
      while(j<s.length&&s[j]!<hi)between.push(pts[j++]!);
      push(r,[pointAt(pts,lo),...between,pointAt(pts,hi)]);
    }
    const lastDashEnd=Math.floor(len/period)*period+dash;
    if(style==='estimate'&&lastDashEnd<len){
      // The final dash meets an anchored portal, rather than ending in a dash gap.
      push(r,[pointAt(pts,Math.max(lastDashEnd,len-(preview?24:120))),pts.at(-1)!]);
    }
  }
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geom.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geom.setIndex(indices);
  const mesh=new T.Mesh(geom,new T.MeshBasicMaterial({side:T.DoubleSide,vertexColors:true,
    transparent:style==='review',opacity:style==='review'?.46:1,depthWrite:style!=='review',
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  mesh.name='municipal-'+style;
  return mesh;
}

export function buildMunicipal(g:Grid,plan:MunicipalPlan,cut?:TileCutouts){
  const group=new T.Group();group.name='municipal-lod0';
  const base=routeMesh(g,plan.routes,'base'), est=routeMesh(g,plan.routes,'estimate'), review=routeMesh(g,plan.routes,'review');
  group.add(base,est,review);
  const walls=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshLambertMaterial({color:'#c5ad8a'}),plan.roofs.length);
  const roofs=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshLambertMaterial({color:'#857660'}),plan.roofs.length);
  cut?.apply(base.material);cut?.apply(est.material);cut?.apply(review.material);
  cut?.apply(walls.material,true,false,true);cut?.apply(roofs.material,true,false,true);
  const obj=new T.Object3D();
  plan.roofs.forEach(({x,z,size,height,depth=size,angle=0},i)=>{
    const ys=corners(x,z,angle,size,depth).map(([px,pz])=>overviewHeight(g,px,pz));
    const lo=Math.min(...ys),hi=Math.max(...ys),rise=hi-lo+height+1;
    obj.rotation.y=-angle;
    obj.position.set(x,lo-1+rise/2,z);obj.scale.set(size,rise,depth);obj.updateMatrix();walls.setMatrixAt(i,obj.matrix);
    obj.position.y=hi+height+1;obj.scale.set(size+2,2,depth+2);obj.updateMatrix();roofs.setMatrixAt(i,obj.matrix);
  });
  group.add(walls,roofs);
  return {group, estimates:(on:boolean)=>{est.visible=on;review.visible=on;}};
}
