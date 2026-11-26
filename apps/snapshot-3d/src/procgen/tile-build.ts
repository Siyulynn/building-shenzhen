import * as T from 'three';
import type {Grid} from '../grid';
import {readRelief,type ReliefPatch} from './ground';
import {planBasin,type GenCfg} from './plan';
import type {GroundTint,RawMap} from './gis';
import type {MunicipalMap,MunicipalPlan} from './municipal-lod0';
import {createTileSource} from './tile-source';
import type {Tile} from './tiles';
import type {District} from './districts';
import type {Ribbon} from './network';

export type TileInit={grid:Grid;map:RawMap;cfg:GenCfg;patch?:ReliefPatch;doc:MunicipalMap;
  water:Uint8Array;reviewRoutes:MunicipalPlan['routes'];track:boolean;reserved?:[number,number,number,number][];groundTints?:GroundTint[];
  districts?:District[];januaryDesign?:boolean;anchorAccess?:Ribbon[]};
export type TileRequest={init:TileInit}|{clear:string[]}|{tile:Tile};
type Attribute=[name:string,array:Float32Array,size:number];
type Bounds=[x:number,y:number,z:number,radius:number];
type Geometry={attrs:Attribute[];index?:Uint16Array|Uint32Array;bounds:Bounds};
export type PackedMesh={
  name:string;casts:boolean;receives:boolean;estimate:boolean;
  geometry?:Geometry;material?:T.MaterialJSON;line?:boolean;
  instances?:{matrices:Float32Array;colors:Float32Array;bounds:Bounds};
};
export type TileResult=
  {phase:'init'}|{phase:'configure';outlines:PackedMesh[];ms:number}|{phase:'tile';meshes:PackedMesh[];ms:number};
export type TileReply={id:number;result:TileResult}|{id:number;error:string};

const bounds=(s:T.Sphere):Bounds=>[s.center.x,s.center.y,s.center.z,s.radius];
function pack(obj:T.Mesh|T.LineSegments,estimate:boolean,transfer:Transferable[]):PackedMesh{
  const name=obj.name;
  const keep=<A extends Float32Array|Uint16Array|Uint32Array>(a:A):A=>{
    transfer.push(a.buffer as ArrayBuffer);return a;
  };
  if(obj instanceof T.InstancedMesh){
    obj.computeBoundingSphere();
    return {name,casts:obj.castShadow,receives:obj.receiveShadow,estimate,
      instances:{matrices:keep(obj.instanceMatrix.array as Float32Array),colors:keep(obj.instanceColor!.array as Float32Array),
        bounds:bounds(obj.boundingSphere!)}};
  }
  const g=obj.geometry as T.BufferGeometry,line=obj instanceof T.LineSegments;
  g.computeBoundingSphere();
  const attrs=Object.entries(g.attributes).map(([k,a]):Attribute=>{
    const array=a.array as Float32Array;
    return [k,keep(line?array.slice():array),a.itemSize];
  });
  const index=g.index?.array as Uint16Array|Uint32Array|undefined;
  const mat=obj.material as T.Material & {map?:T.Texture|null};
  // The worker's placeholder track texture only selects the same mesh colour
  // as the viewer; the viewer attaches its own texture to the shared material.
  const map=mat.map;if(map)mat.map=null;
  const material=name==='pilot-ground'?undefined:mat.toJSON();
  if(map)mat.map=map;
  return {name,casts:obj.castShadow,receives:obj.receiveShadow,estimate,
    geometry:{attrs,index:index&&keep(index),bounds:bounds(g.boundingSphere!)},material,line};
}

/** Same deterministic builders in the worker and the offline fallback. Only
 * typed render buffers come back; the large planning records stay here. */
export function tileBuilder(){
  let init:TileInit|undefined, plan:ReturnType<typeof planBasin>|undefined, source:ReturnType<typeof createTileSource>|undefined;
  const material=new T.MeshLambertMaterial(),track=new T.Texture();
  return (request:TileRequest):{result:TileResult;transfer:Transferable[]}=>{
    const transfer:Transferable[]=[], start=performance.now();
    if('init' in request){
      init=request.init;
      plan=planBasin(init.grid,init.map,init.cfg,init.patch?readRelief(init.patch):undefined);
      if(init.groundTints)plan.groundTints=init.groundTints;
      return {result:{phase:'init'},transfer};
    }
    if(!init||!plan)throw Error('Tile planner not initialised');
    if('clear' in request){
      source?.dispose();
      source=createTileSource({g:init.grid,plan,doc:init.doc,reviewRoutes:init.reviewRoutes,water:init.water,
        clear:new Set(request.clear),material,textures:init.track?{track}:undefined,reserved:init.reserved,districts:init.districts,
        januaryDesign:init.januaryDesign,anchorAccess:init.anchorAccess});
      const outlines=source.outlines.map(obj=>pack(obj,false,transfer));
      return {result:{phase:'configure',outlines,ms:performance.now()-start},transfer};
    }
    if(!source)throw Error('Tile source not configured');
    const tile=source.make(request.tile);
    const meshes=tile.group.children.map(m=>pack(m as T.Mesh,tile.estimates.includes(m as T.Mesh),transfer));
    tile.dispose();
    return {result:{phase:'tile',meshes,ms:performance.now()-start},transfer};
  };
}
