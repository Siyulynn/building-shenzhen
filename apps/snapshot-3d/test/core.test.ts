import {describe, expect, it} from 'vitest';
import {coreCells, coreColors, coreTrace, cropUv, reviewToWorld, type Kh9Meta} from '../src/core';
import {utm, type Meta} from '../src/grid';

const meta:Meta={width:931,height:686,cell_m:100,crs:'EPSG:32650',origin_top_left:[164400,2533900]};
const slice:Kh9Meta['slice']={file:'kh9_1980_slice.png',px_m:6.25,cell_box:[332,297,495,398]};

describe('M3.0 core review',()=>{
  it('registers crop edges and samples on the same pixel centres as the terrain',()=>{
    const {offset,scale}=cropUv(meta,slice,2608,1616);
    const map=(x:number,y:number)=>[(x/meta.width-offset[0])*scale[0],(y/meta.height-offset[1])*scale[1]];
    expect(map(332,297)).toEqual([0,0]);
    expect(map(495,398)[0]).toBeCloseTo(1);
    expect(map(495,398)[1]).toBeCloseTo(1);
    expect(map(332+1/32,297+1/32)[0]).toBeCloseTo(0.5/2608);
    expect(map(332+1/32,297+1/32)[1]).toBeCloseTo(0.5/1616);
    expect(()=>cropUv(meta,slice,2607,1616)).toThrow();
    expect(()=>cropUv(meta,{...slice,cell_box:[-1,297,162,398]},2608,1616)).toThrow();
  });
  it('keeps draft traces inside the review crop and closes town and land outlines',()=>{
    const [l,t,r,b]=coreCells;
    const w=(r-l)*coreTrace.reviewWindow.pixelsPerCell,h=(b-t)*coreTrace.reviewWindow.pixelsPerCell;
    expect(utm(meta,...reviewToWorld(0,0,100))).toEqual([200700,2497400]);
    expect(utm(meta,...reviewToWorld(w,h,100))).toEqual([205600,2494100]);
    expect(new Set(coreTrace.features.map(f=>f.id)).size).toBe(coreTrace.features.length);
    expect(coreTrace.status).toBe('lead');
    for(const f of coreTrace.features){
      expect(Object.hasOwn(coreColors,f.kind)).toBe(true);
      expect(['visible','interpreted']).toContain(f.basis);
      if(f.kind==='anchor') expect(f.points).toHaveLength(1);
      else expect(f.points.length).toBeGreaterThan(1);
      for(const [x,y] of f.points) {
        expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThan(w);
        expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThan(h);
      }
      if(f.kind==='town'||f.kind==='land') expect(f.points.at(-1)).toEqual(f.points[0]);
    }
  });
  it('shares the crossing vertex between both corridors and the point marker',()=>{
    const get=(id:string)=>coreTrace.features.find(f=>f.id===id)!.points;
    expect(get('rail')).toContainEqual(get('bridge')[0]);
    expect(get('river')).toContainEqual(get('bridge')[0]);
    expect(get('river')).toContainEqual(get('tributary').at(-1));
  });
});
