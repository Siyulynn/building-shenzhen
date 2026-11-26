import {describe, expect, it} from 'vitest';
import {coreCells,cropUv} from '../src/core';
import {makeObservationOverlay, observations, observationColors, photoToWorld, placementLabels} from '../src/kh9-observations';
import {decode, utm, type Meta} from '../src/grid';

const meta:Meta={width:931,height:686,cell_m:100,crs:'EPSG:32650',origin_top_left:[164400,2533900]};
const image=observations.image;
const area=(points:number[][])=>points.slice(1).reduce((sum,[x,y],i)=>{
  const [u,v]=points[i]!;
  return sum+u!*y!-v!*x!;
},0)/2;

describe('September 1980 observation layer',()=>{
  it('matches the core image at pixel edges without shifting the KH-9 grid',()=>{
    expect(image.cellBox).toEqual(coreCells);
    expect(utm(meta,...photoToWorld(0,0,100))).toEqual([200700,2497400]);
    expect(utm(meta,...photoToWorld(image.width,image.height,100))).toEqual([205600,2494100]);
    expect(utm(meta,...photoToWorld(.5,.5,100))).toEqual([200701,2497399]);
    const {offset,scale}=cropUv(meta,{file:'review',px_m:2,cell_box:coreCells},image.width,image.height);
    expect(scale[0]*(coreCells[2]/meta.width-offset[0])).toBeCloseTo(1);
    expect(scale[1]*(coreCells[3]/meta.height-offset[1])).toBeCloseTo(1);
  });
  it('keeps physical outlines and named placements distinct and within the chip',()=>{
    expect(image.date).toBe('1980-09-11');
    const all=[...observations.traces,...observations.places];
    expect(new Set(all.map(x=>x.id)).size).toBe(all.length);
    for(const f of all){
      expect(f.name).toHaveLength(2);
      expect(Object.hasOwn(observationColors,f.kind)).toBe(true);
      for(const [x,y] of 'points' in f?f.points:[f.at]){
        expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThanOrEqual(image.width);
        expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThanOrEqual(image.height);
      }
      if('points' in f){
        if(f.form==='area'){
          expect(f.points[0]).toEqual(f.points.at(-1));
          expect(Math.abs(area(f.points))).toBeGreaterThan(0);
        }else expect(f.points.length).toBeGreaterThan(1);
      }else{
        expect(f.claims.length).toBeGreaterThan(0);
        expect(f.note).toHaveLength(2);
        expect(Object.hasOwn(placementLabels,f.basis)).toBe(true);
      }
    }
  });
  it('uses shared vertices for interpreted junctions without inventing a link across the eastern gap',()=>{
    const trace=(id:string)=>observations.traces.find(f=>f.id===id)!.points;
    const mark=(id:string)=>observations.places.find(f=>f.id===id)!.at;
    expect(trace('rail-main')).toContainEqual(mark('luohu-bridge'));
    expect(trace('shenzhen-river-west')).toContainEqual(mark('luohu-bridge'));
    expect(trace('shenzhen-river-west')).toContainEqual(trace('buji-lower').at(-1));
    expect(trace('shenzhen-river-west').at(-1)).not.toEqual(trace('shenzhen-river-east')[0]);
  });
  it('builds only display lines, one object per trace',()=>{
    const n=meta.width*meta.height;
    const g=decode(meta,new ArrayBuffer(n*6),new ArrayBuffer(n),new ArrayBuffer(n));
    const overlay=makeObservationOverlay(g);
    expect(overlay.children.map(c=>c.name)).toEqual(observations.traces.map(f=>f.id));
  });
});
