import {BufferGeometry,Color,Float32BufferAttribute,OrthographicCamera,Vector3} from 'three';
import {describe,expect,it} from 'vitest';
import {bucket,MAX_TILES,neighbourhood,partitionSurface,pilotSelection,pilotTile,tileOf,tileRect} from '../src/procgen/tiles';
import {TileCache} from '../src/procgen/streamer';
import {poly} from '../src/procgen/geom';
import {settlement} from '../src/procgen/fabric';
import {ribbonGeometry} from '../src/procgen/mesh';

const noMask=new Set<string>();

describe('municipal tile streaming',()=>{
  it('keeps LOD hysteresis and stable half-open ownership at tile corners',()=>{
    expect([neighbourhood(false,4400,false),neighbourhood(true,4400,false),neighbourhood(true,4900,false)]).toEqual([false,true,false]);
    expect(tileOf(3200,3200)).toEqual([1,1]);
    const entries=Array.from({length:80},(_,i)=>({id:i,x:3100+3*i,z:3120+3*i}));
    const members=(xs:typeof entries)=>[...bucket(xs)].map(([key,v])=>[key,v.map(x=>x.id).sort((a,b)=>a-b)]).sort();
    const f=members(entries);
    expect(f).toEqual(members([...entries].reverse()));
    expect([...bucket(entries).values()].flat()).toHaveLength(entries.length);
    expect(tileRect([2,1])).toEqual([6400,3200,9600,6400]);
  });
  it('clips triangle surfaces into both neighbours at the exact same height and UV',()=>{
    const input=new BufferGeometry();
    input.setAttribute('position',new Float32BufferAttribute([3100,4,3060,3300,14,3060,3300,14,3120,3100,4,3120],3));
    input.setAttribute('uv',new Float32BufferAttribute([0,25,0,225,8,225,8,25],2));
    input.setIndex([0,1,2,0,2,3]);
    const fetch=partitionSurface(input), a=fetch([0,0])!, b=fetch([1,0])!;
    function seam(g:BufferGeometry){
      const p=g.getAttribute('position'),uv=g.getAttribute('uv'),out=new Set<string>();
      for(let i=0;i<p.count;i++)if(p.getX(i)===3200)out.add([p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i)].join());
      return [...out].sort();
    }
    expect(seam(a)).toEqual(seam(b));
    expect(seam(a)).toEqual(['9,3060,0,125','9,3090,4,125','9,3120,8,125']);
    expect(fetch([2,0])).toBeUndefined();
    input.dispose();a.dispose();b.dispose();
  });
  it('keeps height, normals and chainage on both sides of road, track and water seams',()=>{
    for(const cls of ['main','ballast','river']){
      const g=ribbonGeometry(()=>2,[{id:cls,cls,points:[[3000,3100],[3400,3150]],
        half:cls==='river'?20:2,ys:[4,7],skirt:[true,true],masked:[[],[]]}],noMask,()=>new Color(1),cls==='main');
      const get=partitionSurface(g), west=get([0,0])!,east=get([1,0])!;
      const edge=(mesh:BufferGeometry)=>{
        const p=mesh.getAttribute('position'),uv=mesh.getAttribute('uv'),n=mesh.getAttribute('normal');
        return Array.from({length:p.count},(_,i)=>i).filter(i=>p.getX(i)===3200)
          .map(i=>[p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i),n.getX(i),n.getY(i),n.getZ(i)].join()).sort();
      };
      expect(edge(west).length).toBeGreaterThanOrEqual(3);
      expect(edge(west)).toEqual(edge(east));
      [g,west,east].forEach(g=>g.dispose());
    }
  });
  it('regenerates the same rotated parcels and masks in either load order',()=>{
    const area={id:'seam',poly:poly([[[2940,2950],[3470,2960],[3470,3410],[2930,3430]]])};
    const env={height:()=>7,blocked:(x:number,z:number)=>x+z<6000,masks:(x:number)=>x<3200?['west']:[]};
    const opts={parcel:80,lane:6,mix:{village_row:1}};
    const tiles=[[0,0],[0,1],[1,0],[1,1]] as const;
    const get=(tile?:typeof tiles[number])=>settlement(area,.47,opts,env,'seam',tile&&tileRect(tile));
    const rows=(parts:ReturnType<typeof get>[])=>parts.flatMap(p=>[...p.buildings,...p.trees]).sort((a,b)=>a.key.localeCompare(b.key));
    const forward=rows(tiles.map(get));
    expect(forward.length).toBeGreaterThan(100);
    expect(new Set(forward.map(row=>row.key)).size).toBe(forward.length);
    expect(forward).toEqual(rows([get()]));
    expect(forward).toEqual(rows([...tiles].reverse().map(get)));
  });
  it('limits detailed rendering to the pilot corridors and existing core',()=>{
    for(const [x,z] of [[18500,37500],[19000,43700],[34350,38200],[38300,35100],[38900,31400],[42800,33500]] as const)
      expect(pilotTile(tileOf(x,z))).toBe(true);
    expect(pilotTile(tileOf(70000,38000))).toBe(false);
    expect(pilotTile(tileOf(38600,21000))).toBe(false);
  });
  it('keeps intersecting pilot detail when the camera target pans past the last pilot tile',()=>{
    const camera=new OrthographicCamera(-1600,1600,950,-950,1,18000);
    const meta={width:931,height:686,cell_m:100};
    const select=(x:number)=>{
      const target=new Vector3(x,0,43400);
      camera.position.copy(target).add(new Vector3(0,2000,800));
      camera.lookAt(target);
      return pilotSelection(meta,camera,target);
    };
    expect(pilotTile(tileOf(15950,43400))).toBe(false);
    expect(select(15950)).toContainEqual([5,13]);
    expect(select(13000)).toEqual([]);
  });
  it('evicts owned GPU data, preserves nearby entries and releases the rest once on clear',()=>{
    const cache=new TileCache<{dispose():void}>(), lost:number[]=[];
    const item=(i:number)=>({dispose:()=>lost.push(i)});
    const keep=new Set(['0']);
    for(let i=0;i<25;i++){
      cache.put(String(i),item(i),keep);
      expect(cache.count).toBeLessThanOrEqual(MAX_TILES);
    }
    expect(lost).toEqual([1,2,3,4,5,6,7,8,9]);
    expect(cache.touch('0')).toBeDefined();
    cache.clear();
    expect(cache.count).toBe(0);
    expect(lost).toHaveLength(25);
    expect(new Set(lost).size).toBe(25);
  });
});
