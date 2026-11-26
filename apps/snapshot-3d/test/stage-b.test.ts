import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import raw from '../core-basin-gis.json';
import gen from '../basin-gen.json';
import review from '../shennan-review.json';
import {deriveEpoch,modelTints} from '../src/epochs';
import {decode,type Meta} from '../src/grid';
import {applyStageB,previewGround,stageBRegister} from '../src/stage-b';
import {districtTints,yardProbes} from '../src/procgen/districts';
import {loadBasin,toWorld,type RawMap} from '../src/procgen/gis';
import {corners} from '../src/procgen/fabric';
import {densify,nearest,type P} from '../src/procgen/geom';
import {Corridors,openKerbAtJunctions,type Ribbon} from '../src/procgen/network';
import {readRelief,type ReliefPatch} from '../src/procgen/ground';
import {buildingParts} from '../src/procgen/mesh';
import {dryAt,planMunicipal,type MunicipalMap} from '../src/procgen/municipal-lod0';
import {planBasin,type GenCfg} from '../src/procgen/plan';
import {joinRoadApproaches} from '../src/procgen/road-approaches';
import {tileBuilder,type TileResult} from '../src/procgen/tile-build';
import {tileOf} from '../src/procgen/tiles';

const asset=(name:string)=>new URL(`../public/grid/${name}`,import.meta.url);
const json=<T>(name:string)=>JSON.parse(readFileSync(asset(name),'utf8')) as T;
const buffer=(name:string)=>Uint8Array.from(readFileSync(asset(name))).buffer;

it('joins a short forward road approach without crossing a barrier or hooking into a parallel street',()=>{
  const road={source:'side-street',points:[[-40,0],[-10,0]] as [number,number][],allows:()=>true};
  const crossStreet: [number,number][][]=[[[0,-25],[0,25]]];
  const [joined]=joinRoadApproaches([road],crossStreet);
  expect(joined?.points.at(-1)).toEqual([0,0]);
  expect(road.points.at(-1)).toEqual([-10,0]);
  const blocked={...road,allows:([x]:[number,number])=>x<=-5||x>=-2};
  expect(joinRoadApproaches([blocked],crossStreet)[0]?.points).toEqual(road.points);
  expect(joinRoadApproaches([road],[[[-35,3],[25,3]]])[0]?.points).toEqual(road.points);

  const opposite={...road,source:'continuation',points:[[0,0],[30,0]] as [number,number][]};
  const [first,second]=joinRoadApproaches([road,opposite],[]);
  expect(first?.points.at(-1)).toEqual(second?.points[0]);
  expect(second?.points).toEqual(opposite.points);
  expect(joinRoadApproaches([opposite,road],[]).reverse()).toEqual([first,second]);
  const left: P[][]=[[[0,0],[0,-25]],[[0,0],[0,25]]];
  expect(joinRoadApproaches([road],left)).toEqual(joinRoadApproaches([road],[...left].reverse()));
});

it('preserves tight clear frontages and catches a street crossing the full footprint',()=>{
  const streets=new Corridors();
  streets.add([[-100,0],[100,0]],5,'street');
  expect(streets.hitsFootprint(0,15,40,16)).toBe(false);
  expect(streets.hitsFootprint(0,15,40,16,Math.PI/6)).toBe(true);
  expect(streets.hitsFootprint(0,0,100,100)).toBe(true);
  expect(streets.hitsFootprint(0,0,40,16,Math.PI/4)).toBe(true);
});

it('opens only the incident kerb at a side-road mouth',()=>{
  const ribbon=(id:string,half:number,points:P[]):Ribbon=>({id,half,points,cls:'street',
    ys:points.map(()=>1),skirt:points.map(()=>false),masked:points.map(()=>[])});
  const avenue=ribbon('avenue',16,[[-100,0],[100,0]]);
  const street=ribbon('street',6,[[0,0],[0,60]]);
  const parallel=ribbon('parallel',6,[[-90,14],[90,14]]);
  const edge=ribbon('edge',.43,[[-100,12],[100,12]]);
  const opposite=ribbon('opposite',.43,[[-100,-12],[100,-12]]);
  const [west,east]=openKerbAtJunctions(edge,avenue,[parallel,street,avenue]);
  expect(west?.points.at(-1)?.[0]).toBeLessThan(-6);
  expect(east?.points[0]?.[0]).toBeGreaterThan(6);
  expect(openKerbAtJunctions(edge,avenue,[parallel])).toEqual([edge]);
  expect(openKerbAtJunctions(opposite,avenue,[street])[0]?.points.every(p=>p[1]===-12)).toBe(true);
});

it('draws the same safe site yards in the January overview and close tiles',()=>{
  const meta=json<Meta>('meta.json'), doc=json<MunicipalMap>('municipal-gis.json');
  const patch=json<ReliefPatch>('core-relief.json');
  const water=new Uint8Array(buffer('municipal-water.bin'));
  const g=decode(meta,buffer('grid.bin'),buffer('water1979.bin'),buffer('change_79_84.bin'));
  const january=deriveEpoch('visit',raw as unknown as RawMap,gen as unknown as GenCfg,doc);
  const staged=applyStageB(january,g,water,readRelief(patch));
  const dry=(x:number,z:number)=>dryAt(g,water,x,z);
  const {map,cfg,doc:overlay,districts,models}=staged;
  const reserved=models.map(m=>m.clear);
  const localTints=[...districtTints(districts),...modelTints(models)];
  const groundTints=[...previewGround(overlay),...localTints];
  const view=planMunicipal(overlay!,map,dry,reserved,localTints,districts,staged.januaryDesign);
  expect(staged.map).toBe(january.map);
  expect(overlay!.water_comparator).toBe(doc.water_comparator);
  expect(overlay!.features.slice(0,january.doc!.features.length)).toEqual(january.doc!.features);
  const corridors=new Set([...stageBRegister.roads.map(r=>r.id),...review.roads.map(r=>`m84.road.${r.id}`)]);
  expect(staged.stageBRoads).toBe(corridors.size);
  const older=deriveEpoch('baseline',raw as unknown as RawMap,gen as unknown as GenCfg,doc);
  expect(older.cfg.roads['market-south-road']?.carriageway).toBeUndefined();
  expect(older.districts.some(d=>d.frontage)).toBe(false);
  expect(cfg.roads['market-south-road']?.class).toBe('arterial');
  const avenue=view.routes.find(r=>r.id==='market-south-road')!;
  const pond=toWorld([203802,2496234]);
  expect(view.dryCoverAt(...pond)).toBe(false);
  expect(view.fieldAt(...toWorld([203750,2496050]))).toBe(true);
  const hubeiField=toWorld([203750,2496050]);
  expect(view.designAt(...hubeiField)).toBeUndefined();
  expect(view.designAt(...pond)).toBeUndefined();
  // Cells around Guomao (north row y=378 and enclosed village pixels 389,380..381) never revert to 1980 paddyfields.
  for(const [col,row] of [[389,378],[389,380],[389,381]] as const){
    const pt=toWorld([164400+(col+.5)*100,2533900-(row+.5)*100]);
    expect(view.fieldAt(...pt),`(${col},${row})`).toBe(false);
  }
  for(const zone of ['design:luohu-works','design:luohu-high','design:luohu-housing','design:shangbu-factories','design:shangbu-housing','design:shangbu-works','design:bagualing','design:hubei-housing','design:huangbeiling-works']){
    expect(view.roofs.filter(r=>r.district===zone).length,zone).toBeGreaterThan(10);
  }
  expect(districts.find(d=>d.id==='lizhi-orchard/0')?.form).toBe('park');
  expect(districts.find(d=>d.id==='design:sungang-yard')?.form).toBe('rail-yard');
  // Shangbu north trace stays north of Lizhi Park, matching the design map.
  for(const r of view.routes.filter(r=>r.id.startsWith('m84.road.shangbu-north/')))
    expect(r.points.every(([,z])=>z<=toWorld([201600,2496790])[1])).toBe(true);
  // Anchors sit on the right January surface; the Renmin Road proxy axis is a road verge.
  for(const [id,surfaces] of [
    ['guomao',['graded_ground','avenue_verge']],['guoshang',['settlement','avenue_verge']],
    ['electronics-building',['settlement']],['municipal-government',['civic_park']],
  ] as const){
    const model=models.find(m=>m.id===id)!;
    expect(surfaces as readonly string[]).toContain(view.designAt(...model.at)?.surface);
    expect(view.fieldAt(...model.at),id).toBe(false);
    expect(staged.anchorAccess.find(r=>r.id===id+'/apron')?.points.every(p=>dry(...p)),id).toBe(true);
  }
  // The works cell east of the avenue keeps its graded surface.
  const worksCell=toWorld([164400+390.5*100,2533900-380.5*100]);
  expect(view.designAt(...worksCell)?.surface).toBe('graded_ground');
  expect(planMunicipal(doc,older.map,dry).designAt(...models.find(m=>m.id==='guomao')!.at)).toBeUndefined();
  expect(view.cover.some(a=>a.protectFields)).toBe(true);
  expect(densify(avenue.points,5).every(([x,z])=>view.dryCoverAt(x,z))).toBe(true);
  const roadRoute=(id:string)=>view.routes.find(r=>r.id===`m84.road.${id}/1`)!.points;
  const shangbuService=roadRoute('shangbu-service');
  expect(nearest(roadRoute('huaqiang-north'),...shangbuService[0]!).d).toBeLessThan(.05);
  expect(shangbuService[0]).not.toEqual(toWorld(review.roads.find(r=>r.id==='shangbu-service')!.geometry[0]!));
  const easternApproach=roadRoute('shennan-huangbeiling');
  expect(easternApproach[0]).toEqual(avenue.points.at(-1));
  expect(nearest(roadRoute('yanhe-approach'),...easternApproach.at(-1)!).d).toBeLessThan(.05);
  for(const r of view.routes.filter(r=>r.id.startsWith('m84.road.hongling-link/')))
    expect(nearest(r.points,...roadRoute('hongling-approach').at(-1)!).d).toBeGreaterThan(22);
  const huaqiang=overlay!.features.find(f=>f.id==='m84.road.huaqiang-north/1');
  expect(huaqiang?.roadProfile).toBe('local');
  const electronics=models.find(m=>m.id==='electronics-building')!;
  expect(electronics.at).toEqual(toWorld([199976,2495932]));
  expect(previewGround(overlay)).toHaveLength(stageBRegister.extent.length);
  const roads=overlay!.features.filter(f=>f.id.startsWith('m84.road.'));
  for(const f of roads){
    expect(f.basis).toBe('estimated');
    if(f.geometry.type!=='LineString')throw Error(f.id);
    for(const [x,z] of f.geometry.coordinates.map(toWorld)){
      expect(dry(x,z),f.id).toBe(true);
      expect(view.dryCoverAt(x,z),f.id).toBe(true);
    }
  }
  const builder=tileBuilder();
  builder({init:{grid:g,water,map,cfg,doc:overlay!,patch,reviewRoutes:[],track:false,districts,reserved,groundTints,
    januaryDesign:staged.januaryDesign,anchorAccess:staged.anchorAccess}});
  builder({clear:[]});
  const tiles=new Map<string,TileResult>();
  // Verify the rendered crop instances, not just the land-cover lookup.
  const original=planBasin(g,map,cfg,readRelief(patch));
  const plots=original.pieces.filter(p=>p.key.startsWith('east-market-fields/1/'));
  const converted=plots.find(p=>view.designAt(p.x,p.z)?.id==='luohu-works')!;
  expect(converted).toBeDefined();
  const cropTile=builder({tile:tileOf(converted.x,converted.z)}).result;
  if(cropTile.phase!=='tile')throw Error('Expected converted plot tile');
  expect(cropTile.meshes.find(m=>m.name==='basin-boxes')?.instances?.matrices.some((x,i,a)=>
    i%16===12&&Math.abs(x-converted.x)<.01&&Math.abs(a[i+2]!-converted.z)<.01)).toBe(false);
  const yards=districts.filter(d=>d.infill&&!d.designSurface);
  expect(yards.length).toBeGreaterThan(75);
  expect(staged.stageBSites.find(s=>s.id==='b1984.m82_luohu_crafts_factory')).toMatchObject({plotted:false,withheld:'field'});
  expect(staged.stageBSites.find(s=>s.id==='m84.dongmen.xingye')?.withheld).not.toBe('field');
  for(const d of yards){
    const [x,z]=yardProbes(d.rect)[4]!,tile=tileOf(x,z),key=tile.join(',');
    expect(yardProbes(d.rect).every(([x,z])=>dry(x,z)&&view.dryCoverAt(x,z)),d.id).toBe(true);
    expect(view.roofs.some(r=>r.district===d.id),d.id).toBe(true);
    if(!tiles.has(key))tiles.set(key,builder({tile}).result);
    const result=tiles.get(key)!;
    if(result.phase!=='tile')throw Error(key);
    const walls=result.meshes.find(m=>m.name===`basin-walls-${d.infill!.arch}`)?.instances?.matrices;
    let found=false;
    for(let i=0;walls&&i<walls.length;i+=16){
      if(Math.abs(walls[i+12]!-x)<.01&&Math.abs(walls[i+14]!-z)<1)found=true;
    }
    expect(found,d.id).toBe(true);
  }

  const study=districts.find(d=>d.id==='shangbu-industry/3')!;
  const layout=study.frontageLayout!;
  const rebuilt=applyStageB(january,g,water,readRelief(patch));
  expect(districts.filter(d=>d.frontage)).toEqual(rebuilt.districts.filter(d=>d.frontage));
  expect(layout.buildings.map(b=>b.arch)).toEqual([
    'standard_factory','estate_slab','estate_slab','factory_hall','estate_slab','estate_slab',
  ]);
  expect(layout.access).toHaveLength(2);
  for(const drive of layout.access){
    expect(nearest(roadRoute('yannan-lane'),...drive.points[0]!).d).toBeLessThan(7);
    expect(drive.points.every(([x,z])=>dry(x,z)&&view.dryCoverAt(x,z))).toBe(true);
  }
  for(const role of ['loading-court','housing-court','compound-wall'])
    expect(layout.pieces.filter(p=>p.role===role)).toHaveLength(2);
  const arcade=districts.find(d=>d.id==='luohu-development/6')!;
  const avenueBlock=districts.find(d=>d.id==='luohu-development/7')!;
  expect(arcade.frontageLayout!.buildings.length).toBeGreaterThanOrEqual(16);
  expect(arcade.frontageLayout!.buildings.every(b=>b.arch==='lingnan_block'&&b.arcade&&b.floors<=3)).toBe(true);
  expect(avenueBlock.frontageLayout!.buildings.map(b=>[b.arch,b.floors])).toEqual([['early_highrise',5]]);
  expect(avenueBlock.frontageLayout!.pieces.map(p=>p.role)).toEqual(['commercial-forecourt']);
  const shangbuWest=districts.find(d=>d.id==='shangbu-industry/0')!;
  const housing=districts.find(d=>d.id==='hubei-huangbeiling-edge/2')!;
  const market=districts.find(d=>d.id==='luohu-development/8')!;
  const luohu=districts.find(d=>d.id==='luohu-development/9')!;
  expect(luohu.frontageLayout!.buildings.length).toBeGreaterThanOrEqual(3);
  expect(shangbuWest.frontageLayout!.access).toHaveLength(2);
  expect(housing.frontageLayout!.buildings.map(b=>b.arch)).toEqual(Array(4).fill('estate_slab'));
  expect(housing.frontageLayout!.access).toHaveLength(2);
  expect(market.frontageLayout!.buildings.length).toBeGreaterThan(20);
  expect([...shangbuWest.frontageLayout!.access,...housing.frontageLayout!.access].every(
    r=>r.points.every(([x,z])=>dry(x,z)&&!view.fieldAt(x,z)))).toBe(true);
  const basin=loadBasin(map,[]);
  for(const site of staged.stageBSites.filter(s=>s.plotted&&s.mode==='inferred'))
    expect(view.fieldAt(...site.world!),site.id).toBe(false);
  for(const d of [study,arcade,avenueBlock,shangbuWest,housing,market,luohu]){
    const road=basin.lines.get(d.frontage!.road)?.points??roadRoute('yannan-lane');
    for(const b of d.frontageLayout!.buildings){
      expect(corners(b.x,b.z,b.a,b.w,b.d).every(p=>!view.fieldAt(...p)),b.key).toBe(true);
      if(d.within){
        const outline=corners(b.x,b.z,b.a,b.w,b.d);
        expect(outline.every(([x,z])=>dry(x,z)&&basin.coverAt(x,z)?.id===d.within),b.key).toBe(true);
        const front:P=[b.x-Math.sin(b.a)*b.d/2,b.z+Math.cos(b.a)*b.d/2];
        expect(nearest(road,...front).d,b.key).toBeLessThan(nearest(road,b.x,b.z).d);
      }
      expect(view.roofs.some(r=>r.district===d.id&&r.x===b.x&&r.z===b.z&&r.angle===b.a)).toBe(true);
      const key=tileOf(b.x,b.z).join(',');
      if(!tiles.has(key))tiles.set(key,builder({tile:tileOf(b.x,b.z)}).result);
      const owner=tiles.get(key)!;
      if(owner.phase!=='tile')throw Error(b.key);
      const matrices=owner.meshes.find(m=>m.name===`basin-walls-${b.arch}`)?.instances?.matrices;
      const wall=buildingParts([b]).walls.get(b.arch)![0]!;
      expect(matrices?.some((x,i)=>i%16===12&&Math.abs(x-wall.x)<.01&&Math.abs(matrices[i+2]!-wall.z)<.01),b.key).toBe(true);
    }
  }
  for(const id of ['b1984.shenzhen_theatre','b1984.boya','b1984.xinan_restaurant','b1984.library_hongli'])
    expect(staged.stageBSites.find(s=>s.id===id)?.plotted,id).toBe(true);
},30000);
