import register from '../stage-b.json';
import shennan from '../shennan-review.json';
import type {Grid} from './grid';
import type {deriveEpoch} from './epochs';
import {coreDry,districtCoverBlocked,yardProbes,type District} from './procgen/districts';
import type {Arch,Env} from './procgen/fabric';
import {densify,length,nearest,poly,segmentMeeting,type P} from './procgen/geom';
import {masksAt,toWorld,type GroundTint} from './procgen/gis';
import {commercialFrontage,housingFrontage,industrialFrontage} from './procgen/frontage';
import type {HeightProxy} from './procgen/ground';
import {dryAt,validateMunicipal,type MunicipalFeature,type MunicipalMap} from './procgen/municipal-lod0';
import {Corridors,pointAt,type Ribbon} from './procgen/network';
import {basinGround,basinNetwork} from './procgen/plan';
import {joinRoadApproaches} from './procgen/road-approaches';
import {fabricFits,pilotNetwork,tileGround} from './procgen/tile-source';
import {overlaps} from './procgen/tiles';
import {januaryDesignDistricts,januaryGroundAt,retainedField} from './procgen/january-ground';

type Epoch=ReturnType<typeof deriveEpoch>;
type Site=(typeof register.sites)[number];
type SiteReview=Site&{plotted:boolean;world?:P;withheld?:'water'|'field'|'conflict'};
type Rect=GroundTint['rect'];
export const stageBRegister=register;
export const shennanViews=shennan.views;
const worldOrigin=toWorld([0,0]);
const fromWorld=([x,z]:P)=>[x-worldOrigin[0],worldOrigin[1]-z];

// Art dimensions only. A dot on the source map supplies neither size nor height.
type Kit=[arch:Arch,width:number,depth:number,floors:number];
const kits:Record<string,Kit>={
  industrial:['standard_factory',29,19,2], utility:['danwei_slab',16,11,2],
  commercial:['danwei_slab',22,15,3], office:['danwei_slab',19,12,3],
  office_tower:['early_highrise',23,19,6], government:['danwei_slab',21,12,3],
  hospital:['danwei_slab',31,15,3], school:['danwei_slab',36,12,3],
  residential:['worker_dorm',27,10,3], library:['danwei_slab',20,13,2],
  theatre:['danwei_slab',24,18,2], civic:['danwei_slab',24,17,2],
  hotel:['danwei_slab',24,13,4], railway:['danwei_slab',31,11,2],
  transport:['standard_factory',21,13,1], research:['danwei_slab',21,13,2],
  retail:['lingnan_block',12,9,2], restaurant:['lingnan_block',13,10,2],
};
const workKit:Kit=['worksite_shed',12,8,1];
const fallback:Kit=['danwei_slab',16,10,2];
const compareKey=(s:Site)=>s.mode==='dated'?0:s.mode==='works'?1:s.id.startsWith('m84.')?2:3;

function splitRoads(points:P[],ok:(p:P)=>boolean){
  const result:P[][]=[];
  let run:P[]=[];
  const flush=()=>{
    if(run.length>=3&&length(run)>=35)result.push(run);
    run=[];
  };
  for(const p of densify(points,8)){
    if(ok(p))run.push(p);
    else flush();
  }
  flush();
  return result;
}

export function applyStageB(epoch:Epoch,g:Grid,water:Uint8Array,relief?:HeightProxy){
  const doc=epoch.doc;
  if(!doc)return {...epoch,stageBSites:[],stageBRoads:0,januaryDesign:false,anchorAccess:[] as Ribbon[]};
  const base=basinGround(g,epoch.map,epoch.cfg,relief), {b:basin,l:lattice}=base;
  const localNet=basinNetwork(base,epoch.cfg);
  const {at}=tileGround(g,lattice);
  const reserved=epoch.models.map(m=>m.clear);
  const dry=(x:number,z:number)=>coreDry(basin,x,z)&&dryAt(g,water,x,z);
  const barriers=new Corridors(), coreRoads=new Corridors();
  for(const line of basin.lines.values()){
    if(line.kind==='water')barriers.add(line.points,line.id.includes('river-main')?95:37,line.id);
    if(line.kind==='rail')barriers.add(line.points,18,line.id);
    if(line.kind==='road'&&line.id in epoch.cfg.roads)coreRoads.add(line.points,18,line.id);
  }
  for(const f of doc.features){
    if(f.geometry.type!=='LineString'||f.render_status==='review_required')continue;
    const buffer=f.kind==='river'?54:f.kind==='rail'?17:f.id==='shangbu-clearance-west'?26:18;
    (f.kind==='road'?coreRoads:barriers).add(f.geometry.coordinates.map(toWorld),buffer,f.id);
  }
  const source='preview-1984';
  const sources:MunicipalMap['sources']={...doc.sources,[source]:{id:'phase1_1984_shenzhen_traffic_map_previews',
    url:'http://www.txlzp.com/ditu/12126.html',locator:'3-2.jpg, 5-2.jpg and 6.jpg; street skeleton and developed-block patterns'},
    shennan:{id:'atlas_szlzp_catalogue',url:'http://www.szlzp.com/products.html',locator:'Shennan aerial study; inferred street profiles'}};
  const reviewedRoads=shennan.roads.map(r=>({...r,id:`m84.road.${r.id}`}));
  const ids=new Set(reviewedRoads.map(r=>r.id));
  const inputs=[
    ...register.roads.filter(r=>!ids.has(r.id)).map(r=>{
      // Match the design map: keep the May-map Shangbu north trace north of Lizhi Park
      // (meeting shangbu-grid-north), since Hongling Road already frames the park's east side.
      const geometry=r.id==='m84.road.shangbu-north'?r.geometry.filter(p=>p[1]!>=2496800):r.geometry;
      return {...r,geometry,profile:undefined};
    }),
    ...reviewedRoads,
  ];
  const approaches=inputs.flatMap(road=>{
    const half=road.profile==='arterial'?17:road.profile==='service'?5:13;
    const allows=([x,z]:P)=>!barriers.hit(x,z,half)&&
      !localNet.water.hit(x,z,half)&&!reserved.some(r=>overlaps(r,[x-half,z-half,x+half,z+half]))&&
      [-half,0,half].every(dx=>[-half,0,half].every(dz=>dry(x+dx,z+dz)));
    return splitRoads(road.geometry.map(toWorld),allows).map((points,i)=>({road,i,source:road.id,points,allows}));
  });
  const referenceRoads=[
    ...localNet.ribbons.filter(r=>r.id in epoch.cfg.roads).map(r=>r.points),
    ...doc.features.flatMap(f=>f.kind==='road'&&f.geometry.type==='LineString'&&f.render_status!=='review_required'
      ?[f.geometry.coordinates.map(toWorld)]:[]),
  ];
  const tracedRoads:MunicipalFeature[]=joinRoadApproaches(approaches,referenceRoads).map(({road,i,points})=>(
    {id:`${road.id}/${i+1}`,kind:'road',name:road.name as [string,string],basis:'estimated',
      claims:road.claims,sources:[road.profile?'shennan':source],searchHalfWidthM:Math.round(register.overviewFit.leaveOneOutRmsM),
      roadProfile:road.profile as MunicipalFeature['roadProfile'],
      reason:road.profile?'Photo-informed junction or service route. Its exact January centreline, width and surface are illustrative.':
        'Spring-edition street trace, clipped to dry approaches; short illustrative junction joins; January alignment and opening uncertain.',
      reasonZh:road.profile?'参照照片示意路口或地块服务道；精确的一月线位、宽度和路面均未确定。':
        '春季版面道路描线，仅保留干燥路段，短距离接路属示意；一月线位和启用状态待核。',
      render_status:'aerial_candidate',core_anchors:[],
      geometry:{type:'LineString',coordinates:points.map(fromWorld)}}));
  const stageBRoads=new Set(tracedRoads.map(f=>f.id.split('/')[0])).size;

  const extents:MunicipalFeature[]=register.extent.map(f=>({
    id:f.id,name:f.name as [string,string],kind:'settlement',basis:'interpreted',claims:f.claims,
    sources:[source],core_anchors:[],geometry:{type:'Polygon',coordinates:[f.geometry]},
    urbanPreview:f.kind as MunicipalFeature['urbanPreview'],
    reason:'Developed-block pattern interpreted from the spring preview and adjacent named facilities; approximate January context.',
    reasonZh:'据春季预览及邻近设施推断开发片区，仅作一月场景背景。'
  }));
  const footprintCuts:Rect[]=[];
  const districts:District[]=[];
  const stagedDoc={...doc,sources,features:[...doc.features,...tracedRoads,...extents]};
  const pilot=pilotNetwork(g,{basin,net:localNet},stagedDoc,at), {corridors}=pilot;
  const fieldAt=(x:number,z:number)=>retainedField(basin.coverAt(x,z)?.kind,x,z,true);
  const blocked=(x:number,z:number)=>!dry(x,z)||!!barriers.hit(x,z)||!!coreRoads.hit(x,z)||
    !!localNet.water.hit(x,z)||!!localNet.corridors.hit(x,z,6)||!!corridors.hit(x,z,6);
  const order=[...register.sites].sort((a,b)=>compareKey(a)-compareKey(b));
  const stageBSites=order.map<SiteReview>(site=>{
    if(!site.at||site.mode==='existing'||site.mode==='reference')return {...site,plotted:false};
    const [arch,w,d,floors]=site.mode==='works'?workKit:kits[site.kind]??fallback;
    const [ax,az]=toWorld(site.at);
    // Do not move a wet point to a different shoreline. Other misses get a small same-block search.
    if(!dry(ax,az))return {...site,plotted:false,withheld:'water'};
    const inferred=site.mode==='inferred';
    // A schematic or later map pin alone doesn't justify converting interpreted farm cover.
    if(inferred&&fieldAt(ax,az))return {...site,plotted:false,withheld:'field'};
    const allowsInferred=(x:number,z:number)=>{
      const ground=januaryGroundAt(x,z)?.surface;
      return !fieldAt(x,z)&&(!ground||ground==='settlement');
    };
    for(const r of [0,12,24,36,48,60]){
      for(let i=0;i<(r===0?1:8);i++){
        const theta=Math.PI*i/4,x=ax+r*Math.cos(theta),z=az+r*Math.sin(theta);
        const padX=w/2+7,padZ=d/2+7;
        const rect:Rect=[x-padX,z-padZ,x+padX,z+padZ];
        if(reserved.some(p=>overlaps(rect,p))||footprintCuts.some(p=>overlaps(rect,p)))continue;
        const samples=yardProbes(rect);
        if(samples.some(([px,pz])=>blocked(px,pz)||inferred&&!allowsInferred(px,pz)))continue;
        if(densify([[ax,az],[x,z]],8).some(([px,pz])=>!dry(px,pz)||!!barriers.hit(px,pz)||inferred&&fieldAt(px,pz)))continue;
        const grades=samples.map(([px,pz])=>at(px,pz));
        if(Math.max(...grades)-Math.min(...grades)>5)continue;
        footprintCuts.push(rect);
        districts.push({id:site.id,rect,surface:site.mode==='works'?'graded_ground':'settlement',
          infill:{arch,w,d,floors}});
        return {...site,plotted:true,world:[x,z] as P};
      }
    }
    return {...site,plotted:false,withheld:'conflict'};
  });
  const allReserved=[...reserved,...footprintCuts];
  const avenues=localNet.ribbons.filter(r=>r.cls==='arterial');
  const datedDistricts=epoch.districts.flatMap(original=>{
    const d=original.surface&&original.surface!=='field'?{...original,protectFields:true}:original;
    const study=d.frontage;
    if(!study)return [d];
    const industry=study.use==='industrial';
    const lane=study.use==='commercial'&&study.form==='lane';
    const block=study.use==='commercial'&&study.form==='block';
    const road=industry?
      pilot.estimated.find(r=>r.id===study.road&&r.cls==='preview-local')??avenues.find(r=>r.id===study.road):
      localNet.ribbons.find(r=>r.id===study.road&&(block||r.cls===(lane?'street':'arterial')))??(
        block?pilot.estimated.find(r=>r.id===study.road):undefined);
    // Industry needs a local approach connected to an avenue. Commercial frontage
    // either sits directly on an avenue or fills an inherited market lane.
    const serviced=road&&(!industry||road.cls==='arterial'||avenues.some(r=>
      [road.points[0]!,road.points.at(-1)!].some(p=>nearest(r.points,...p).d<.05)||
      road.points.some((p,i)=>i>0&&r.points.some((q,j)=>j>0&&segmentMeeting(road.points[i-1]!,p,r.points[j-1]!,q)))));
    if(!road||!serviced)return d.mix?[{...d,frontageLayout:{buildings:[],trees:[],pieces:[],access:[]}}]:[];
    const otherRoads=new Corridors();
    for(const r of [...pilot.base,...pilot.estimated])if(r.id!==road.id)
      otherRoads.add(r.points,r.half+5,r.id);
    const landBlocked=(x:number,z:number)=>{
      const cover=basin.coverAt(x,z);
      return !dry(x,z)||fieldAt(x,z)||districtCoverBlocked(d,cover,x,z,true);
    };
    const accessBlocked=(x:number,z:number)=>landBlocked(x,z)||
      !!barriers.hit(x,z)||!!localNet.water.hit(x,z)||
      !!localNet.corridors.hit(x,z,industry?4:.8,industry?`road:${road.id}`:undefined)||
      !!otherRoads.hit(x,z)||!fabricFits(allReserved,x,z,0,0);
    const env:Env={
      height:at,blocked:(x,z)=>accessBlocked(x,z)||!!corridors.hit(x,z)||
        (industry&&!!localNet.corridors.hit(x,z,4)),
      masks:(x,z,what)=>masksAt(basin,x,z,what),
    };
    const footprintBlocked=(x:number,z:number,w:number,depth:number,a:number)=>!fabricFits(allReserved,x,z,w,depth,a)||
      barriers.hitsFootprint(x,z,w,depth,a)||localNet.corridors.hitsFootprint(x,z,w,depth,a)||
      otherRoads.hitsFootprint(x,z,w,depth,a);
    if(study.use==='industrial')return [{...d,frontageLayout:industrialFrontage(d.id,study,road,env,accessBlocked,footprintBlocked)}];
    if(study.use==='residential')return [{...d,frontageLayout:housingFrontage(d.id,study,road,env,footprintBlocked)}];
    const frontageLayout=commercialFrontage(d.id,study,road,env,footprintBlocked);
    return frontageLayout.buildings.length?[{...d,trim:d.within,frontageLayout}]:[];
  });
  // Short graded approaches from the illustrative gates to the existing shoulder.
  // Their alignments are site dressing, not new streets or through routes.
  const anchorAccess:Ribbon[]=[];
  for(const [id,roadId,dx,dz,half] of [
    ['guomao','south-transverse-road',-12.5,24,3.3],
    ['guoshang','south-transverse-road',0,-16.5,3],
    ['electronics-building','shangbu-east-west-corridor',0,13,3],
    ['municipal-government','shangbu-east-west-corridor',19,52,4],
  ] as const){
    const model=epoch.models.find(m=>m.id===id),road=localNet.ribbons.find(r=>r.id===roadId);
    if(!model||!road)continue;
    const start:P=[model.at[0]+dx,model.at[1]+dz], {s,d}=nearest(road.points,...start);
    if(d<=road.half||d>95)continue;
    const centre=pointAt(road.points,s);
    const stop:P=[centre[0]+(start[0]-centre[0])*road.half/d,centre[1]+(start[1]-centre[1])*road.half/d];
    const points=densify([start,stop],3);
    const [ux,uz]=[(stop[0]-start[0])/(d-road.half),(stop[1]-start[1])/(d-road.half)];
    const otherPads=[...allReserved.filter(r=>r!==model.clear),...datedDistricts.flatMap(d=>
      d.frontageLayout?.buildings.map(b=>[b.x-b.w/2,b.z-b.d/2,b.x+b.w/2,b.z+b.d/2])??[])];
    if(points.some(([x,z])=>[-half,0,half].some(side=>{
      const px=x-uz*side,pz=z+ux*side;
      return !dry(px,pz)||fieldAt(px,pz)&&nearest(road.points,px,pz).d>road.half+15||!!barriers.hit(px,pz)||
        !!localNet.water.hit(px,pz)||!!corridors.hit(px,pz)||!fabricFits(otherPads,px,pz,0,0);
    })))continue;
    anchorAccess.push({id:`${id}/apron`,cls:'compound-drive',half,points,
      ys:points.map(p=>at(...p)+.18),skirt:points.map(()=>false),masked:points.map(()=>[])});
  }
  const frontageRects=datedDistricts.flatMap(d=>d.frontageLayout?.buildings.length&&d.frontage?[d.frontage.rect]:[]);
  const designDistricts=januaryDesignDistricts(frontageRects);
  validateMunicipal(stagedDoc,water,g,epoch.map);
  return {...epoch,doc:stagedDoc,districts:[...datedDistricts,...designDistricts,...districts],stageBSites,stageBRoads,januaryDesign:true,anchorAccess};
}

export function previewGround(doc:Epoch['doc']):GroundTint[]{
  return (doc?.features??[]).flatMap(f=>{
    if(!f.urbanPreview||f.geometry.type!=='Polygon')return [];
    const shape=poly(f.geometry.coordinates.map(r=>r.map(toWorld)));
    return [{kind:'settlement',rect:shape.box,ring:shape.rings[0],protectFields:true}];
  });
}
