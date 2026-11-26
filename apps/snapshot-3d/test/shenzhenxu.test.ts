import * as T from 'three';
import {describe,expect,it} from 'vitest';
import {buildShenzhenxu,crossroads,postcardViewport,shenzhenxu} from '../src/shenzhenxu';
import {nearest} from '../src/procgen/geom';
import {toWorld,type RawMap} from '../src/procgen/gis';
import map from '../core-basin-gis.json';

const raw=map as unknown as RawMap;
const place=crossroads(raw);

describe('Shenzhenxu crossroads prototype',()=>{
  it('locks both centre lines to the traced candidate junction',()=>{
    expect(place.at).toEqual(toWorld([203178,2496372]));
    expect(place.world(0,0)).toEqual(place.at);
    const lines=shenzhenxu.alignments.map(id=>{
      const l=raw.layers.alignments!.find(f=>f.id===id)!.geometry;
      if(l.type!=='LineString')throw Error('Missing trace');
      return l.coordinates.map(toWorld);
    });
    for(const [d,axis] of [[-25,0],[5,0],[82,0],[-25,1],[27,1]] as const){
      const p=axis===0?place.world(d,0):place.world(0,d);
      expect(nearest(lines[axis]!,...p).d).toBeCloseTo(0,7);
    }
  });
  it('keeps the photo-study crop on wide and tall screens',()=>{
    for(const [w,h] of [[1000,650],[390,700],[1000,1000]] as const){
      const [x,y,width,height]=postcardViewport(w,h);
      expect(width/height).toBeCloseTo(864/587);
      expect(x+width/2).toBeCloseTo(w/2);
      expect(y+height/2).toBeCloseTo(h/2);
      expect(width).toBeLessThanOrEqual(w);
      expect(height).toBeLessThanOrEqual(h+.0001);
    }
  });
  it('builds a small grounded scene with explicit prototype provenance and no image textures',()=>{
    const scene=buildShenzhenxu(place,()=>8);
    expect(scene.group.userData.status).toBe('stylized_prototype');
    expect(scene.group.userData.claim_ids.split(';')).toEqual(shenzhenxu.claims);
    expect(scene.bays).toBe(shenzhenxu.rows.flatMap(r=>r.bays).length);
    expect(scene.group.children.length).toBeLessThanOrEqual(7);
    expect(scene.triangles).toBeLessThan(30000);
    expect(scene.camera().eye.y).toBeCloseTo(10.28);
    const bounds=new T.Box3().setFromObject(scene.group);
    expect(bounds.min.y).toBeLessThan(8);
    expect(bounds.max.y).toBeGreaterThan(15);
    for(const item of scene.group.children){
      expect(item.userData.role).toBeTruthy();
      const o=item as T.Mesh<T.BufferGeometry,T.MeshLambertMaterial>;
      expect(o.material.map).toBeNull();
      expect(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
    }
    scene.dispose();
  });
});
