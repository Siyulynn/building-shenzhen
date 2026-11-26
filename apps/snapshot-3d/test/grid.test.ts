import {describe,expect,it} from 'vitest';
import {axis,decode,ground,surface,utm} from '../src/grid';
import {buildTerrain} from '../src/terrain';
import {Mesh,MeshBasicMaterial} from 'three';
const meta={width:6,height:4,cell_m:100,crs:'EPSG:32650',origin_top_left:[1000,2000] as [number,number]};
const n=24;
function fixture(){return decode(meta,new ArrayBuffer(n*6),new ArrayBuffer(n),new ArrayBuffer(n));}
describe('registered snapshots',()=>{
  it('keeps the final partial stride and registers pixel centres in metres',()=>{
    expect(axis(0,5,4)).toEqual([0,4,5]); expect(utm(meta,100,200)).toEqual([1150,1750]);
    expect(()=>decode(meta,new ArrayBuffer(n),new ArrayBuffer(n),new ArrayBuffer(n))).toThrow();
  });
  it('preserves terrain elevations under all dated overlays',()=>{
    const g=fixture(); g.elevation[7]=40; g.water79.set([255,1]); g.water79[7]=1;
    g.change.set([0,4,5,6,3,2,1]);
    expect(surface(g,7,'oct79')).toBe('unknown');
    expect([0,1].map(i=>surface(g,i,'oct79'))).toEqual(['unknown','water']);
    expect([0,1,2,3,4,5,6].map(i=>surface(g,i,'nov84'))).toEqual(['unknown','emerged','water','water','clearing','greener','land']);
    expect(ground(g,25,25)).toBe(0); expect(ground(g,75,75)).toBe(20);
    expect(ground(g,100,100)).toBe(40);
  });
  it('builds finite relief reaching the last row and column',()=>{
    const g=fixture(), mat=new MeshBasicMaterial();
    for(const view of [undefined,[2,1] as [number,number]]) {
      const group=buildTerrain(g,mat,view);
      const positions=(group.children[0] as Mesh).geometry.getAttribute('position');
      expect(positions.getX(positions.count-1)).toBe(500); expect(positions.getZ(positions.count-1)).toBe(300);
    }
  });
});
