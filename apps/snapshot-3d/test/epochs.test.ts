import {describe,expect,it} from 'vitest';
import * as T from 'three';
import raw from '../core-basin-gis.json';
import gen from '../basin-gen.json';
import {deriveEpoch,epochEntries,epochRegister,modelTints} from '../src/epochs';
import {decode,type Meta} from '../src/grid';
import {models} from '../src/assembly';
import {kit} from '../src/parts';
import {crossroads,buildShenzhenxu,shenzhenxuState} from '../src/shenzhenxu';
import {loadBasin,toWorld,type RawMap} from '../src/procgen/gis';
import {basinGround,planBasin,type GenCfg} from '../src/procgen/plan';
import {planMunicipal,validateMunicipal,type MunicipalMap} from '../src/procgen/municipal-lod0';
import {fabricFits,pilotNetwork} from '../src/procgen/tile-source';
import {pilotTile,tileOf} from '../src/procgen/tiles';
import {tileBuilder} from '../src/procgen/tile-build';
import {coreDry,districtFabric,districtTints} from '../src/procgen/districts';
import {nearest} from '../src/procgen/geom';
import {buildLuohu,luohuCamera,luohuClaims,luohuCorridor,luohuStudy} from '../src/luohu';
import {isStreetId,streetClaims,streetLayout} from '../src/street-studies';

const core=raw as unknown as RawMap,cfg=gen as unknown as GenCfg;
const meta:Meta={width:931,height:686,cell_m:100,crs:'EPSG:32650',origin_top_left:[164400,2533900]};
const n=meta.width*meta.height;
const grid=()=>decode(meta,new ArrayBuffer(6*n),new ArrayBuffer(n),new ArrayBuffer(n));
const route=(id:string,coreAnchored=false):MunicipalMap['features'][number]=>({
  id,kind:coreAnchored?'road':'rail',basis:'estimated',name:['Corridor','走廊'],claims:['test.exists'],
  reason:'Test estimate',sources:['map'],searchHalfWidthM:150,
  render_status:coreAnchored?'aerial_candidate':'review_required',
  core_anchors:coreAnchored?[{core:'shangbu-east-west-corridor',end:'start'}]:[],
  geometry:{type:'LineString',coordinates:coreAnchored?[[198190,2495900],raw.layers.alignments.find(a=>a.id==='shangbu-east-west-corridor')!.geometry.coordinates[0]!]:
    [[202800,2499000],[202900,2502000]]},
});
const doc:MunicipalMap={
  format:'sz-municipal-map-v1',crs:meta.crs,units:'m',date:core.date,bounds:[164400,2465300,257500,2533900],
  sources:{map:{locator:'test'}},water_comparator:{date:'1979-10-19'},package:{water_bytes:n},open:[],
  features:[route('shangbu-clearance-west',true),route('kcr-buji-pinghu'),route('kcr-north-continuation')],
};

describe('municipal bookends',()=>{
  it('derives opening cover and removes unsupported rail and works without mutating September',()=>{
    const a=deriveEpoch('opening',core,cfg,doc), base=deriveEpoch('baseline',core,cfg,doc);
    expect(base.map).toBe(core);expect(base.cfg).toBe(cfg);expect(base.doc).toBe(doc);
    expect(a.map.layers.cover!.map(f=>f.id)).toEqual(core.layers.cover!.map(f=>f.id));
    const edits=a.map.layers.cover!.filter((f,i)=>f!==core.layers.cover![i]);
    expect(edits.filter(f=>f.kind==='field').map(f=>f.id).sort()).toEqual([
      'shangbu-clearing-east/1','shangbu-clearing-middle-edge/1','shangbu-clearing-west/1','shangbu-row-compound/1']);
    expect(edits.filter(f=>f.kind==='unknown').map(f=>f.id)).toEqual(expect.arrayContaining(['shangbu-south-apron/1','practice-ground-oval/1']));
    expect(edits.every(f=>f.basis==='epoch_interpretation')).toBe(true);
    expect(a.map.layers.alignments!.some(f=>f.id==='rail-main')).toBe(true);
    expect(a.map.layers.alignments!.some(f=>f.id==='rail-west-corridor')).toBe(false);
    expect(a.cfg.estimatedCrossings).not.toHaveProperty('west-approach-west-rail');
    expect(base.cfg.estimatedCrossings).toHaveProperty('west-approach-west-rail');
    expect(a.map.layers.area_picks).toBe(core.layers.area_picks);
    expect(a.map.date).toBe(epochRegister.baseline);
    expect(a.models).toEqual([]);
    expect(a.districts.map(z=>z.id)).toEqual(['opening-kh9-edge-review/0']);
    expect(base.districts).toEqual([]);
  });

  it('feeds the same edits into LOD0 and LOD1 and never turns the review bands into track',()=>{
    const g=grid(),a=deriveEpoch('opening',core,cfg,doc);
    const plan=planBasin(g,a.map,a.cfg);
    const lod0=planMunicipal(a.doc!,a.map,()=>true,[],[],a.districts);
    expect(()=>validateMunicipal(a.doc!,new Uint8Array(n),g,a.map)).not.toThrow();
    expect(lod0.routes.filter(r=>r.style==='review').map(r=>r.id)).toEqual(['kcr-buji-pinghu','kcr-north-continuation']);
    expect(lod0.routes.some(r=>r.id.startsWith('shangbu-clearance')||r.id==='shangbu-east-west-corridor')).toBe(false);
    expect(plan.net.tracks.map(r=>r.id)).toEqual(['rail-main@0']);
    expect(plan.pieces.some(p=>p.key.startsWith('shangbu-clearing-west/1/'))).toBe(true);
    const pilot=pilotNetwork(g,plan,a.doc!);
    expect(pilot.estimated).toEqual([]);
    expect(plan.lattice.at(...crossroads(core).at)).toBe(basinGround(g,core,cfg).l.at(...crossroads(core).at));
  },15000);

  it('places only opted-in January patches and replaces whole overlapping instances',()=>{
    const b=deriveEpoch('visit',core,cfg,doc), g=grid();
    const basin=planBasin(g,b.map,b.cfg);
    expect(b.models.map(p=>p.id)).toEqual(['electronics-building','municipal-government','guomao','guoshang']);
    expect(epochEntries('visit').find(f=>f.id==='friendship-store')?.state.status).toBe('unplaced');
    expect(b.doc!.water_comparator).toBe(doc.water_comparator);
    for(const {id,at:[x,z],clear:[l,t,r,d],parts} of b.models){
      expect(pilotTile(tileOf(x,z))).toBe(true);
      expect(tileOf(l,t)).toEqual(tileOf(r,d));
      expect(tileOf(x,z)).toEqual(tileOf(l,t));
      expect(loadBasin(b.map,[]).coverAt(x,z)?.kind).not.toBe('water');
      const clear=[l,t,r,d], slope=(a:number,c:number)=>9+(a-x)*.08+(c-z)*.03;
      const mesh=models(g,parts.map((p,i)=>({key:id+'/'+i,kind:p.kit,x:x+p.offset[0],z:z+p.offset[1],yaw:p.yaw*Math.PI/180})),slope,true);
      const box=new T.Box3().setFromObject(mesh,true);
      expect(box.min.x).toBeGreaterThan(l);expect(box.max.x).toBeLessThan(r);
      expect(box.min.z).toBeGreaterThan(t);expect(box.max.z).toBeLessThan(d);
      expect(box.min.y).toBeLessThan(slope(x,z));
      for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z]){
        expect(basin.net.water.hit(x,z)).toBeUndefined();
      }
      if(id!=='guomao')for(let x=box.min.x;x<=box.max.x;x+=3)for(let z=box.min.z;z<=box.max.z;z+=3)
        expect(basin.net.corridors.hit(x,z),id).toBeUndefined();
      expect(fabricFits([clear],l-4,z,12,8,Math.PI/4)).toBe(false);
      expect(fabricFits([clear],l-12,z,12,8,Math.PI/4)).toBe(true);
      mesh.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.dispose();}});
    }
  },15000);

  it('reserves only the January civic compound without moving the road, September cover or camera',()=>{
    const g=grid(),visit=deriveEpoch('visit',core,cfg,doc);
    const civic=visit.models.find(m=>m.id==='municipal-government')!;
    const street=streetLayout('civic',core,cfg,visit.models,visit.districts);
    const {b,l}=basinGround(g,core,cfg,(_x,z)=>17-(z-civic.at[1])*.08);
    const road=b.lines.get('shangbu-east-west-corridor')!, half=cfg.roads[road.id]!.width/2;
    const [w,n,e,s]=civic.clear;
    for(let x=w;x<=e;x+=1)for(let z=n;z<=s;z+=1){
      if(!coreDry(b,x,z)||nearest(road.points,x,z).d<=half)throw Error('Civic clear box reaches water or the road');
    }
    const pose=street.camera(l.at), camera=new T.PerspectiveCamera(pose.fov,16/9,.12,1800);
    expect(tileOf(pose.eye.x,pose.eye.z)).toEqual(tileOf(...civic.at));
    expect(nearest(road.points,pose.eye.x,pose.eye.z).d).toBeGreaterThan(half);
    camera.position.copy(pose.eye);camera.lookAt(pose.look);camera.updateMatrixWorld();
    const [cx,cz]=civic.at;
    for(const [x,y,z] of [[cx-39,l.at(cx,cz)+20,cz],[cx+39,l.at(cx,cz)+20,cz],[cx+19,l.at(cx+19,s),s]] as const){
      const p=new T.Vector3(x,y,z).project(camera);
      expect(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))).toBeLessThan(1);
    }
    for(const date of ['opening','baseline','visit'] as const){
      const epoch=date==='visit'?visit:deriveEpoch(date,core,cfg,doc);
      expect(epoch.models.some(m=>m.id===civic.id)).toBe(date==='visit');
      expect(modelTints(epoch.models).some(t=>t.rect===civic.clear)).toBe(date==='visit');
      if(date!=='opening')expect(epoch.map.layers.alignments!.find(f=>f.id===road.id)).toBe(road.raw);
    }
    expect(deriveEpoch('baseline',core,cfg,doc).map).toBe(core);
    expect(visit.map.layers.cover).toEqual(core.layers.cover);
    expect(streetClaims('civic').flatMap(e=>e.claims)).toEqual(expect.arrayContaining([
      'site.county_offices.exists_1979','phase1.site.municipal_government.1981_move',
      'phase1.site.municipal_government.occupation_early_1981','phase1.photo.1984.municipal_government_form',
    ]));
    // The normal worksite still supplies instances; the local mask drops only overlapping ones.
    const basin=planBasin(g,visit.map,visit.cfg);
    const work=basin.pieces.filter(p=>p.key.startsWith('shangbu-clearing-middle-edge/1/'));
    const outside=work.filter(p=>fabricFits([civic.clear],p.x,p.z,p.w,p.d,p.a));
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.length).toBeLessThan(work.length);
  },15000);

  it('keeps Guomao open-framed in both January models and Guoshang enclosed',()=>{
    const january=deriveEpoch('visit',core,cfg,doc);
    const guomao=january.models.find(m=>m.id==='guomao')!;
    const guoshang=january.models.find(m=>m.id==='guoshang')!;
    for(const id of [guomao.parts[0]!.kit,guomao.overviewKit!]){
      const parts=kit(id);
      expect(parts.some(p=>p.y>70&&p.w>=40)).toBe(true);
      expect(parts.filter(p=>p.y>5&&p.y<68&&p.h<1&&p.w>=28&&p.d>=25).length).toBeGreaterThan(3);
      expect(parts.some(p=>p.h>30&&p.w>15&&p.d>15)).toBe(false);
    }
    expect(kit(guoshang.parts[0]!.kit).some(p=>p.h>30&&p.w>15&&p.d>15)).toBe(true);
  });

  it('shows selective district growth in overview and packed tiles without writing back to September',()=>{
    const g=grid(), water=new Uint8Array(n), epoch=deriveEpoch('visit',core,cfg,doc);
    expect(epoch.map.layers.cover).toEqual(core.layers.cover);
    expect(epoch.map.layers.alignments!.filter(f=>f.id!=='market-south-road'))
      .toEqual(core.layers.alignments!.filter(f=>f.id!=='market-south-road'));
    expect(epoch.doc!.features).toEqual(doc.features);
    const reserved=epoch.models.map(m=>m.clear), groundTints=districtTints(epoch.districts);
    const overview=planMunicipal(epoch.doc!,epoch.map,()=>true,reserved,groundTints,epoch.districts);
    const builder=tileBuilder(), packed=new Map<string,ReturnType<typeof builder>['result']>();
    builder({init:{grid:g,water,map:epoch.map,cfg:epoch.cfg,doc:epoch.doc!,reviewRoutes:[],track:false,
      districts:epoch.districts,reserved,groundTints}});
    builder({clear:[]});
    function has(id:string,wall?:string){
      return epoch.districts.filter(z=>z.id.startsWith(id+'/')).some(({rect:[l,t,r,b]})=>{
        for(let j=Math.floor(t/3200);j<=Math.floor(b/3200);j++)for(let i=Math.floor(l/3200);i<=Math.floor(r/3200);i++){
          const key=`${i},${j}`;
          if(!packed.has(key))packed.set(key,builder({tile:[i,j]}).result);
          const result=packed.get(key)!;
          if(result.phase!=='tile')return false;
          for(const mesh of result.meshes){
            if(wall&&wall!=='tower_works'?mesh.name!==`basin-walls-${wall}`:mesh.name!=='basin-boxes')continue;
            const m=mesh.instances!.matrices;
            for(let a=0;a<m.length;a+=16)if(m[a+12]!>l&&m[a+12]!<r&&m[a+14]!>t&&m[a+14]!<b&&
              (wall==='tower_works'?m[a]!>22&&Math.abs(m[a+5]!-.32)<.001:wall||m[a]===60&&m[a+10]===18))return true;
          }
        }
        return false;
      });
    }
     for(const [id,wall] of [['luohu-development','worker_dorm'],['shangbu-industry','standard_factory'],
       ['shangbu-industry','factory_hall'],['shangbu-industry','estate_slab'],['luohu-development','estate_slab'],
      ['shangbu-industry','tower_works'],['hubei-huangbeiling-edge','danwei_slab'],
      ['shekou-frontage-envelope','standard_factory'],['shekou-frontage-envelope','worker_dorm'],['yumin-candidate-land','village_villa']] as const){
      expect(overview.roofs.some(b=>b.district?.startsWith(id+'/')),id).toBe(true);
      expect(has(id,wall),id+' '+wall).toBe(true);
    }
    for(const id of ['luohu-development','shangbu-industry']){
      const roofs=overview.roofs.filter(b=>b.district?.startsWith(id+'/'));
      expect(roofs.length,id).toBeGreaterThan(20);
      expect(Math.max(...roofs.map(b=>b.height)),id).toBeLessThanOrEqual(9*3.2);
      expect(has(id,'tower_works'),id).toBe(true);
    }
    expect(has('bagualing-earthworks')).toBe(true);
    expect(overview.roofs.some(b=>b.district?.startsWith('bagualing'))).toBe(false);
    const villas=overview.roofs.filter(b=>b.district?.startsWith('yumin'));
    expect(new Set(villas.map(b=>b.z)).size).toBeGreaterThanOrEqual(4);
    expect(villas.length).toBeGreaterThan(20); // Performance/packing check, not a historical house count.
    expect(overview.roofs.some(b=>b.district?.startsWith('nantou-approach'))).toBe(false);
    for(const p of overview.cover.filter(c=>c.kind==='graded_ground'))expect(p.dryOnly).toBe(true);
  },30000);

  it('lays out a compact Yumin court on candidate land without changing protected cover',()=>{
    const v=deriveEpoch('visit',core,cfg,doc),{map}=v;
    const b=loadBasin(map,[]), court=v.districts.find(d=>d.form==='villa-court')!;
    const env={height:(x:number,z:number)=>.002*x+.003*z,masks:()=>[],blocked:(x:number,z:number)=>
      !coreDry(b,x,z)||b.coverAt(x,z)?.id!==court.within};
    const built=districtFabric(court,env);
    expect(built.buildings.some(x=>x.arch==='worksite_shed')).toBe(true);
    const houses=built.buildings.filter(x=>x.arch==='village_villa');
    expect(new Set(houses.map(h=>h.z)).size).toBeGreaterThanOrEqual(4);
    expect(houses.every(h=>h.floors===2)).toBe(true);
    for(const h of houses) for(const [x,z] of [[h.x-h.w/2,h.z-h.d/2],[h.x+h.w/2,h.z+h.d/2]] as const)
      expect(b.coverAt(x,z)?.id).toBe(court.within);
    expect(built.pieces.some(p=>p.role==='villa-lane')).toBe(true);
    expect(built.pieces.some(p=>p.role==='villa-drain')).toBe(true);
    expect(built.trees.length).toBeGreaterThan(0);
    expect(coreDry(b,...toWorld([202430,2495210]))).toBe(false);
    expect(deriveEpoch('baseline',core,cfg,doc).map).toBe(core);
    expect(deriveEpoch('opening',core,cfg,doc).districts.every(d=>!d.form)).toBe(true);
  });

  it('retains one candidate junction and the same unnamed frontage at both bookends without transferring R01',()=>{
    const j=crossroads(core), states=(['opening','visit'] as const).map(shenzhenxuState);
    expect(tileOf(j.clear[0],j.clear[1])).toEqual(tileOf(j.clear[2],j.clear[3]));
    expect(states[0]!.rows).toBe(states[1]!.rows);
    expect(states[0]!.status).not.toBe(states[1]!.status);
    for(const date of ['opening','visit'] as const){
      const patch=buildShenzhenxu(j,()=>7,date,true);
      expect(patch.group.position.toArray()).toEqual([j.at[0],7,j.at[1]]);
      expect(patch.group.userData.claim_ids).not.toContain('atlas.shenzhenxu.r01');
      const walk=patch.group.getObjectByName('crossroads-paving') as T.Mesh;
      const p=walk.geometry.getAttribute('position');
      // Sidewalks only: no authored pavement through the candidate crossing.
      expect(Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getZ(i))).every(r=>r>3.5)).toBe(true);
      patch.dispose();
    }
  });

  it('frames both Luohu stages from one roadside eye and packs only bounded January dressing',()=>{
    const visit=deriveEpoch('visit',core,cfg,doc);
    const c=luohuCorridor(core,cfg,visit.models), g=grid(), grade=basinGround(g,visit.map,visit.cfg).l.at;
    for(const date of ['opening','baseline','visit'] as const){
      const {map}=deriveEpoch(date,core,cfg,doc);
      expect(map.layers.alignments!.find(f=>f.id===luohuStudy.road))
        .toBe(core.layers.alignments!.find(f=>f.id===luohuStudy.road));
    }
    expect(tileOf(...c.eye)).toEqual(tileOf(...c.at));
    expect(nearest(c.line,...c.eye).d).toBeCloseTo(c.half+2.2);
    const pose=luohuCamera(c,grade), camera=new T.PerspectiveCamera(pose.fov,16/9,.12,1800);
    expect(pose.eye.y-grade(...c.eye)).toBeCloseTo(1.68);
    camera.position.copy(pose.eye);camera.lookAt(pose.look);camera.updateMatrixWorld();
    for(const [m,y] of [[c.guomao,82],[c.guoshang,58]] as const){
      const [x,z]=m.at;
      expect(tileOf(x,z)).toEqual(tileOf(...c.at));
      for(const h of [0,y]){
        const p=new T.Vector3(x,grade(x,z)+h,z).project(camera);
        expect(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))).toBeLessThan(1);
      }
    }
    expect(luohuClaims().find(e=>e.id==='guomao')?.state.status).toBe('sourced-stage');
    expect(luohuClaims().find(e=>e.id==='guoshang')?.state.status).toBe('proxy');
    const patch=buildLuohu(c,grade), matrix=new T.Matrix4();
    expect(patch.group.userData.claim_ids).toContain('phase1.guoshang.commercial_building_completed');
    expect(patch.group.children.every(o=>o instanceof T.InstancedMesh)).toBe(true);
    patch.group.updateMatrixWorld();
    for(const mesh of patch.group.children as T.InstancedMesh[]){
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
        for(const a of [-.5,.5])for(const b of [-.5,.5])for(const y of [-.5,.5]){
          const p=new T.Vector3(a,y,b).applyMatrix4(matrix);
          expect(nearest(c.line,p.x,p.z).d,mesh.name).toBeGreaterThan(c.half);
          const pad=mesh.name==='luohu-work-yard'?c.guomao:mesh.name==='luohu-finished-entry'?c.guoshang:undefined;
          if(pad){
            const [l,t,r,d]=pad.clear;
            expect(p.x>l&&p.x<r&&p.z>t&&p.z<d,mesh.name).toBe(true);
          }
        }
      }
    }
    patch.dispose();
    expect(patch.group.children).toHaveLength(0);
  });

  it('frames the Shangbu proxy without paving or cutting its source road',()=>{
    const visit=deriveEpoch('visit',core,cfg,doc), b=loadBasin(core,[]);
    const s=streetLayout('shangbu',core,cfg,visit.models,visit.districts);
    const grade=(x:number,z:number)=>7+(z-37800)*.01+(x-35800)*.002;
    const pose=s.camera(grade), camera=new T.PerspectiveCamera(pose.fov,16/9,.12,1800);
    camera.position.copy(pose.eye);camera.lookAt(pose.look);camera.updateMatrixWorld();
    expect(pose.eye.y-grade(pose.eye.x,pose.eye.z)).toBeCloseTo(1.68);
    expect(tileOf(pose.eye.x,pose.eye.z)).toEqual(tileOf(...s.at));
    const landmark=visit.models.find(m=>m.id==='electronics-building')!,[x,z]=landmark.at;
    for(const h of [0,38]){
      const p=new T.Vector3(x,grade(x,z)+h,z).project(camera);
      expect(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))).toBeLessThan(1);
    }
    const {points}=b.lines.get('shangbu-east-west-corridor')!,half=cfg.roads['shangbu-east-west-corridor']!.width/2;
    const d=s.build!(grade), patch=d.group.getObjectByName('shangbu-shallow-cut') as T.Mesh;
    expect(streetClaims('shangbu').flatMap(e=>e.claims)).toContain('atlas.photo.electronics_section.caption_1983');
    d.group.updateMatrixWorld();
    const verts=patch.geometry.getAttribute('position');
    expect(verts.count).toBeGreaterThan(0);
    for(let i=0;i<verts.count;i++){
      const p=new T.Vector3().fromBufferAttribute(verts,i).applyMatrix4(patch.matrixWorld);
      expect(nearest(points,p.x,p.z).d).toBeGreaterThan(half+2);
      expect(p.y).toBeGreaterThan(grade(p.x,p.z));
    }
    for(const mesh of d.group.children.filter((x):x is T.InstancedMesh=>x instanceof T.InstancedMesh)){
      const mat=new T.Matrix4();
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,mat); mat.premultiply(mesh.matrixWorld);
        for(const x of [-.5,.5])for(const z of [-.5,.5]){
          const p=new T.Vector3(x,0,z).applyMatrix4(mat);
          expect(nearest(points,p.x,p.z).d).toBeGreaterThan(half+2);
        }
      }
    }
    d.dispose();
    expect(d.group.children).toHaveLength(0);
  });

  it('keeps Yumin fixtures inside the shared dry compound for both cameras',()=>{
    const visit=deriveEpoch('visit',core,cfg,doc), b=loadBasin(core,[]);
    const [lane,pond]=(['yumin','yumin-pond'] as const).map(id=>streetLayout(id,core,cfg,visit.models,visit.districts));
    const grade=()=>7, court=visit.districts.find(d=>d.form==='villa-court')!;
    expect(lane!.at).toEqual(pond!.at);
    expect(lane!.camera(grade).eye.toArray()).not.toEqual(pond!.camera(grade).eye.toArray());
    expect(isStreetId('yumin-pond')).toBe(true);expect(isStreetId('toString')).toBe(false);
    expect(streetClaims('yumin-pond')).toEqual(streetClaims('yumin'));
    expect(streetClaims('yumin').flatMap(e=>e.claims)).toContain('phase1.housing.yumin.site_layout.1984_02');
    for(const layout of [lane!,pond!]){
      const eye=layout.camera(grade).eye;
      expect(coreDry(b,eye.x,eye.z)).toBe(true);
      expect(tileOf(eye.x,eye.z)).toEqual(tileOf(...layout.at));
      const d=layout.build!(grade), matrix=new T.Matrix4();
      d.group.updateMatrixWorld();
      expect(d.group.children.length).toBeGreaterThan(0);
      for(const mesh of d.group.children as T.InstancedMesh[]){
        expect(mesh).toBeInstanceOf(T.InstancedMesh);
        for(let i=0;i<mesh.count;i++){
          mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
          for(const x of [-.5,.5])for(const z of [-.5,.5]){
            const p=new T.Vector3(x,0,z).applyMatrix4(matrix);
            expect(b.coverAt(p.x,p.z)?.id).toBe(court.within);
            const [l,t,r,d]=court.rect;
            expect(p.x>l&&p.x<r&&p.z>t&&p.z<d).toBe(true);
          }
        }
      }
      d.dispose();
    }
  });
});
