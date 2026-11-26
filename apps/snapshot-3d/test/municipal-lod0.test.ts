import {readFileSync,existsSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Mesh} from 'three';
import {decode,type Meta} from '../src/grid';
import {buildMunicipal,dryAt,municipalTexture,overviewHeight,planMunicipal,validateMunicipal,waterLook,
  type MunicipalMap} from '../src/procgen/municipal-lod0';
import type {RawMap} from '../src/procgen/gis';
import coreData from '../core-basin-gis.json';
const core=coreData as unknown as RawMap;

const meta:Meta={width:931,height:686,cell_m:100,crs:'EPSG:32650',origin_top_left:[164400,2533900]};
const n=meta.width*meta.height;
const grid=()=>decode(meta,new ArrayBuffer(6*n),new ArrayBuffer(n),new ArrayBuffer(n));
const map:MunicipalMap={
  format:'sz-municipal-map-v1',crs:meta.crs,units:'m',date:core.date,
  bounds:[164400,2465300,257500,2533900],sources:{map:{locator:'test'}},
  water_comparator:{date:'1979-10-19'},package:{water_bytes:n},open:[],
  features:[
    {id:'rail-approach',kind:'rail',basis:'estimated',name:['Rail','铁路'],claims:['site.kcr_line.exists_1979'],
      reason:'Test route',sources:['map'],searchHalfWidthM:190,render_status:'aerial_candidate',
      core_anchors:[{core:'rail-main',end:'start'}],geometry:{type:'LineString',coordinates:[[202736,2497400],[202800,2499000]]}},
    {id:'rail-review',kind:'rail',basis:'estimated',name:['Rail review','铁路待核'],claims:['site.kcr_line.exists_1979'],
      reason:'Test route review',sources:['map'],searchHalfWidthM:600,render_status:'review_required',
      core_anchors:[],geometry:{type:'LineString',coordinates:[[202800,2499000],[202900,2502000]]}},
  ],
};

describe('municipal overview',()=>{
  it('keeps eastern modern-water fallback limited to unknown comparator cells',()=>{
    expect([0,1,2,3,4,255].map(k=>waterLook(k,1))).toEqual(
      ['land','sea','nearshore','reservoir','isolated','modern-fallback']);
    expect(waterLook(255,0)).toBe('no-data');
    const g=grid(),water=new Uint8Array(n);
    g.modernWater[0]=1;water[1]=3;water[2]=255;
    expect([0,1,2].map(i=>dryAt(g,water,i*100,0))).toEqual([true,false,false]);
    const tex=municipalTexture(g,water,planMunicipal(map,core,()=>true));
    const rgba=tex.image.data as Uint8Array;
    expect(rgba.slice(0,4)).not.toEqual(rgba.slice(4,8));
    expect(rgba.slice(4,8)).not.toEqual(rgba.slice(8,12));
    tex.dispose();
  });
  it('samples the 400 m mesh triangles, including its partial outer cells',()=>{
    const g=grid();
    g.elevation.fill(500);
    for(const [r,a,b] of [[0,0,80],[4,120,240],[684,120,320],[685,220,420]] as const){
      g.elevation[r*meta.width+928]=a;g.elevation[r*meta.width+930]=b;
    }
    expect(overviewHeight(g,92900,200)).toBe(100);
    expect(overviewHeight(g,93000,68500)).toBe(420);
    expect(overviewHeight(g,92900,68450)).toBe(270);
  });
  it('validates exact core anchors, class codes and claim metadata',()=>{
    const g=grid(), water=new Uint8Array(n);
    expect(()=>validateMunicipal(map,water,g,core)).not.toThrow();
    const broken=structuredClone(map);
    (broken.features[0]!.geometry.coordinates[0] as number[])[0]!+=1;
    expect(()=>validateMunicipal(broken,water,g,core)).toThrow('Broken core portal');
    broken.features[0]!.claims=[];
    expect(()=>validateMunicipal(broken,water,g,core)).toThrow('Invalid municipal feature');
    water[5]=42;
    expect(()=>validateMunicipal(map,water,g,core)).toThrow('registration');
  });
  it('batches skyline clusters and toggles estimated geometry without touching traced routes',()=>{
    const g=grid(), plan=planMunicipal(map,core,()=>true);
    expect(plan.roofs.length).toBeGreaterThan(10);
    expect(plan.roofs.length).toBeLessThan(1000);
    expect(planMunicipal(map,core,()=>false).roofs).toEqual([]);
    const scene=buildMunicipal(g,plan);
    expect(scene.group.children).toHaveLength(5);
    expect(scene.group.children.every(o=>!o.castShadow)).toBe(true);
    scene.estimates(false);
    expect(scene.group.getObjectByName('municipal-base')?.visible).toBe(true);
    expect(scene.group.getObjectByName('municipal-estimate')?.visible).toBe(false);
    expect(scene.group.getObjectByName('municipal-review')?.visible).toBe(false);
    scene.estimates(true);
    expect(scene.group.getObjectByName('municipal-estimate')?.visible).toBe(true);
    scene.group.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
  });
  it('rejects reservoir index metadata that disagrees with the dated raster',()=>{
    const g=grid(),water=new Uint8Array(n),m=structuredClone(map);
    m.water_comparator.reservoirs=[{id:'test-reservoir',name:['Test','测试'],cell:[2,3],cells:1,
      claims:['test.reservoir'],source:'landsat_1979_10_19'}];
    expect(()=>validateMunicipal(m,water,g,core)).toThrow('components do not match');
    water[1]=3;
    expect(()=>validateMunicipal(m,water,g,core)).toThrow('Invalid reservoir comparator');
    water[1]=0;water[3*meta.width+2]=3;
    expect(()=>validateMunicipal(m,water,g,core)).not.toThrow();
  });
  it('accepts the real handoff when prepared',()=>{
    const dir=new URL('../public/grid/',import.meta.url);
    const gis=new URL('municipal-gis.json',dir), water=new URL('municipal-water.bin',dir);
    if(!existsSync(gis)&&!existsSync(water))return;
    const m=JSON.parse(readFileSync(gis,'utf8')) as MunicipalMap;
    expect(()=>validateMunicipal(m,readFileSync(water),grid(),core)).not.toThrow();
    expect(m.features.filter(f=>f.render_status==='review_required').map(f=>f.id)).toEqual(['kcr-buji-pinghu','kcr-north-continuation']);
    if(m.water_comparator.reservoirs){
      expect(m.water_comparator.reservoirs.map(r=>r.id)).toEqual(['shenzhen-reservoir','tiegang-reservoir','xili-reservoir','shiyan-reservoir']);
      const coast=m.features.filter(f=>f.id.endsWith('-coast-pocket'));
      const g=grid(), classes=readFileSync(water);
      expect(coast).toHaveLength(2);
      for(const f of coast){
        const a=planMunicipal({...m,features:[f]},core,(x,z)=>dryAt(g,classes,x,z));
        const onlyCore=planMunicipal({...m,features:[]},core,(x,z)=>dryAt(g,classes,x,z));
        expect(a.roofs.length).toBeGreaterThan(onlyCore.roofs.length);
      }
    }
  });
});
