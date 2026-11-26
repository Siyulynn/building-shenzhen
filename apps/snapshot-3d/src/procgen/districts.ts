// Render-only interpretation envelopes. They are not additions to either GIS source.
import {ARCH, grove, parkGrounds, plots, railYard, settlement, villaCourt, worksite, type Arch, type Building, type Env, type Piece, type SettlementOpts} from './fabric';
import {poly,type P} from './geom';
import type {FrontageLayout,FrontageStudy} from './frontage';
import type {GroundTint} from './gis';
import {overlaps} from './tiles';
import {rng} from './rng';
import {DESIGN_GENERATED_ZONES,januaryAdjacentZone,januaryGroundAt,retainedField} from './january-ground';

export interface District {
  id:string;
  rect:GroundTint['rect'];
  surface?:'settlement'|'worksite'|'graded_ground'|'field';
  mix?:SettlementOpts['mix'];
  parcel?:number;
  compound?:boolean;
  heading?:number;
  form?:'villa-court'|'graded-yard'|'field-study'|'works-compound'|'grove'|'park'|'rail-yard';
  /** Require all new footprints to stay inside this source cover. */
  within?:string;
  /** For a partial rollback, suppress only the named September cover's fabric. */
  trim?:string;
  infill?:{arch:Arch;w:number;d:number;floors:number};
  frontage?:FrontageStudy;
  protectFields?:boolean;
  /** A generated patch must stay on the matching January design surface. */
  designSurface?:'settlement'|'graded_ground'|'civic_park'|'transport_land';
  /** A design-map-driven district stays strictly inside this January design zone. */
  designZone?:string;
  /** Hand-tuned frontage study envelopes that design-grid fill yields to. */
  excludeRects?:GroundTint['rect'][];
  /** Compiled once for overview and detailed tiles. */
  frontageLayout?:FrontageLayout;
}

export function districtFabric(d:District,env:Env):ReturnType<typeof settlement>&{pieces:Piece[]}{
  const {id,rect:[l,t,r,b]}=d;
  const area={id,poly:poly([[[l,t],[r,t],[r,b],[l,b]]])};
  if(d.infill){
    const x=(l+r)/2,z=(t+b)/2, {arch,w,d:depth,floors}=d.infill;
    const probes=yardProbes(d.rect);
    if(probes.some(([px,pz])=>env.blocked(px,pz)))return {buildings:[],trees:[],pieces:[]};
    const heights=probes.map(([px,pz])=>env.height(px,pz));
    const lo=Math.min(...heights),hi=Math.max(...heights);
    // A shallow local foundation/yard brings the mass off the field texture.
    // The common terrain, water and route grades are untouched.
    if(hi-lo>5)return {buildings:[],trees:[],pieces:[]};
    const top=hi+.15;
    const building:Building={key:id,parent:id,arch,x,z,a:0,w,d:depth,floors,base:top,foot:top-.45,tone:.52,
      masks:[]};
    const pad:Piece={key:id+'/yard',role:'registered-yard',x,z,a:0,w:r-l,d:b-t,y0:lo-.3,y1:top,
      c:d.surface==='graded_ground'?0xb18264:0xb8a98e,masks:[]};
    return {buildings:[building],trees:[],pieces:[pad]};
  }
  if(d.form==='villa-court')return villaCourt(area,env);
  if(d.form==='grove'){
    const density=d.designZone==='municipal-civic'?.45:.88;
    return {buildings:[],pieces:[],trees:grove(area,12,density,{lychee:5,banyan:1},env,'sz-january-orchard')};
  }
  if(d.form==='park')return parkGrounds(area,env,'sz-lizhi-park');
  const heading=(d.heading??0)*Math.PI/180;
  if(d.form==='rail-yard')return railYard(area,heading,env,'sz-rail-yard');
  if(d.form==='works-compound')return {...worksite(area,heading,env,'sz-works-compound',true),trees:[]};
  if(d.form==='field-study')return {buildings:[],trees:[],pieces:
    plots(area,heading,{kind:'field',strip:27,plot:56,ditchEvery:5},env,'sz-dachong-field-study')};
  const cut=d.frontageLayout&&d.frontage?.rect;
  const legacyEnv=cut?{...env,blocked:(x:number,z:number)=>
    (x>=cut[0]&&x<=cut[2]&&z>=cut[1]&&z<=cut[3])||env.blocked(x,z)}:env;
  const fabric=d.mix?settlement(area,heading,
    {parcel:d.parcel??80,lane:8,mix:d.mix,compound:d.compound},legacyEnv,'sz-district-study'):
    {buildings:[],trees:[],pieces:[]};
  const {pieces}=fabric;
  if(d.surface==='worksite'&&!d.mix){
    // Short graded benches and spoil strips, not foundations for completed factories.
    for(let z=t+19;z<b-19;z+=34)for(let x=l+35;x<r-35;x+=73){
      const samples=[x-30,x,x+30].flatMap(px=>[z-9,z+9].map(pz=>[px,pz] as const));
      if(samples.some(([px,pz])=>env.blocked(px,pz)))continue;
      const h=samples.map(([px,pz])=>env.height(px,pz)),lo=Math.min(...h),hi=Math.max(...h);
      if(hi-lo>4)continue;
      pieces.push({key:`${id}/${x},${z}/bench`,role:'earthwork-bench',x,z,a:0,w:60,d:18,y0:lo-.5,y1:hi+.32,c:0xbc9670,
        masks:env.masks(x,z,'fields')});
      pieces.push({key:`${id}/${x},${z}/spoil`,role:'earthwork-spoil',x,z:z-7,a:0,w:49,d:3,y0:hi+.32,y1:hi+1.35,c:0xae855d,
        masks:env.masks(x,z,'fields')});
    }
  }
  if(d.form==='graded-yard'){
    // Broken graded surfaces and low spoil on gentle ground only. No
    // survey grades, earthmoving of the DEM, or continuous retaining walls.
    const random=rng('sz-graded-yard',id);
    const active=d.surface==='worksite';
    for(let j=t+19;j<b-19;j+=30)for(let i=l+22;i<r-22;i+=46){
      const x=i+(random()-.5)*8,z=j+(random()-.5)*6,w=21+random()*16,d=10+random()*10;
      const samples=[x-w/2,x,x+w/2].flatMap(xx=>[z-d/2,z,z+d/2].map(zz=>[xx,zz] as const));
      if(samples.some(([x,z])=>env.blocked(x,z)))continue;
      const hs=samples.map(([x,z])=>env.height(x,z)),lo=Math.min(...hs),hi=Math.max(...hs);
      if(hi-lo>1.15)continue;
      const key=`${id}/${i},${j}`,masks=env.masks(x,z,'fields');
      pieces.push({key,role:'graded-pad',x,z,a:0,w,d,y0:lo-.25,y1:hi+.09,c:0xb7744d,masks});
      if(active&&random()<.28){
        const top=hi+.1;
        fabric.buildings.push({key:key+'/shed',parent:id,arch:'worksite_shed',x,z,a:0,w:14,d:6,
          floors:1,base:top,foot:top-.30,tone:random(),masks:env.masks(x,z,'buildings')});
      }
      if(random()<.52)pieces.push({key:key+'/spoil',role:'graded-spoil',x:x+w*.2,z:z-d*.27,a:0,w:w*.38,d:d*.21,
        y0:hi-.12,y1:hi+.5+random(),c:0xa85c39,masks});
    }
  }
  return {...fabric,pieces};
}

export function yardProbes([l,t,r,b]:District['rect']):P[]{
  return [l,(l+r)/2,r].flatMap(x=>[t,(t+b)/2,b].map(z=>[x,z] as P));
}

export const districtTints=(zones:District[])=>zones.flatMap(({surface,rect,protectFields,designSurface,designZone})=>
  surface&&!designSurface&&!designZone?[{kind:surface,rect,...(protectFields?{protectFields}: {})}]:[]);
export const districtRoofHeight=(b:ReturnType<typeof districtFabric>['buildings'][number])=>ARCH[b.arch].storey*b.floors;
export const districtHits=(zones:District[],rect:readonly number[],id:string)=>zones.some(z=>!z.designZone&&(!z.trim||z.trim===id)&&overlaps(z.rect,rect));

export function districtCoverBlocked(d:District,cover:{id:string;kind:string}|undefined,x:number,z:number,january:boolean){
  if(d.within!==undefined&&cover?.id!==d.within)return true;
  if(d.excludeRects?.some(([l,t,r,b])=>x>=l&&x<=r&&z>=t&&z<=b))return true;
  const cell=january?januaryGroundAt(x,z):undefined;
  const surface=cell?.surface;
  if(d.designZone){
    if(cover?.kind==='settlement')return true;
    const match=cell?.id===d.designZone||(!!cell?.inherited&&januaryAdjacentZone(x,z,d.designZone));
    return !match;
  }
  // Legacy districts yield to design-map-generated zones so blocks never double-stack.
  if(january&&!d.infill&&!d.within&&!d.frontage&&d.form!=='grove'&&d.form!=='park'&&cell&&DESIGN_GENERATED_ZONES.has(cell.id))return true;
  if(d.designSurface&&d.designSurface!==surface)return true;
  if(d.protectFields&&retainedField(cover?.kind,x,z,january))return true;
  return january&&d.surface==='settlement'&&!d.infill&&surface!==undefined&&surface!=='settlement'&&!d.within;
}

export function dryCover(kind:string|undefined){
  return kind!=='water'&&kind!=='pond_complex'&&kind!=='river_margin'&&kind!=='transport_land';
}
export function coreDry(b:{coverAt(x:number,z:number):{kind:string}|undefined},x:number,z:number){
  const a=b.coverAt(x,z);
  return dryCover(a?.kind);
}
