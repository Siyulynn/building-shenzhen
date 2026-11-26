import * as T from 'three';
import BasinWorker from './basin.worker?worker&inline';
import {tileBuilder,type PackedMesh,type TileInit,type TileReply,type TileRequest,type TileResult} from './tile-build';
import {fabricResources,type BuildOpts} from './mesh';
import type {Arch} from './fabric';
import {MAX_TILES,overlaps,tileKey,tileRect,type Tile,type TileBlend,type TileCutouts} from './tiles';

export {pilotNetwork} from './tile-source';

export class TileCache<T extends {dispose():void}> {
  private map=new Map<string,T>();
  get count(){return this.map.size;}
  has(k:string){return this.map.has(k);}
  touch(k:string){
    const entry=this.map.get(k);
    if(entry){this.map.delete(k);this.map.set(k,entry);}
    return entry;
  }
  drop(k:string){
    this.map.get(k)?.dispose();this.map.delete(k);
  }
  put(k:string,value:T,keep:ReadonlySet<string>){
    this.drop(k);this.map.set(k,value);
    while(this.map.size>MAX_TILES)this.drop([...this.map.keys()].find(id=>!keep.has(id))??this.map.keys().next().value!);
  }
  forEach(fn:(value:T,key:string)=>void){this.map.forEach(fn);}
  clear(){for(const k of this.map.keys())this.drop(k);}
}

function backend(){
  let worker:Worker|undefined, local:ReturnType<typeof tileBuilder>|undefined, id=0;
  let closed=false;
  let pending:{resolve:(r:TileResult)=>void;reject:(e:Error)=>void;id:number}|undefined;
  function stop(){
    worker?.terminate();worker=undefined;
    pending?.reject(Error('Tile worker stopped'));pending=undefined;
  }
  function send(request:TileRequest):Promise<TileResult>{
    if(local){
      try{return Promise.resolve(local(request).result);}catch(e){return Promise.reject(e);}
    }
    return new Promise((resolve,reject)=>{
      if(!worker)throw Error('Tile worker unavailable');
      if(pending)throw Error('Overlapping tile requests');
      pending={resolve,reject,id:++id};
      try{worker.postMessage({id,request});}catch(error){pending=undefined;reject(error);}
    });
  }
  return {async start(init:TileInit){
    try{
      worker=new BasinWorker();
      worker.onmessage=({data}:MessageEvent<TileReply>)=>{
        if(pending?.id!==data.id)return;
        const p=pending;pending=undefined;
        if('error' in data)p.reject(Error(data.error));else p.resolve(data.result);
      };
      worker.onerror=e=>{e.preventDefault();stop();};
      worker.onmessageerror=()=>stop();
      await send({init});
    }catch{
      if(closed)return;
      stop();local=tileBuilder();
      await send({init});
    }
  },send,close:()=>{closed=true;stop();local=undefined;},mode:()=>local?'fallback':'worker'};
}

const fadeMs=180;
const sphere=([x,y,z,r]:[number,number,number,number])=>new T.Sphere(new T.Vector3(x,y,z),r);
interface Entry {
  tile:Tile;group:T.Group;estimates:T.Object3D[];casts:T.Object3D[];
  detail:number;stamp:number;dispose():void;
}

export function createStreamer({init,material,textures,cutouts,onFrame}:{
  init:TileInit;material:T.Material;textures:BuildOpts['textures'];cutouts:TileCutouts;onFrame:()=>void
}){
  const group=new T.Group();group.name='municipal-lod1';
  const outlineGroup=new T.Group();group.add(outlineGroup);
  const cache=new TileCache<Entry>(), res=fabricResources(textures), builder=backend();
  const materials=new Map<string,T.Material>(), loader=new T.MaterialLoader();
  cutouts.apply(res.flat,true,true,true);res.walls.forEach(m=>cutouts.apply(m,true,true,true));
  let desired:Tile[]=[], wanted=new Set<string>(), active:TileBlend[]=[], est=true;
  let ready=false,failed=false,closed=false,busy=false,frame=0,configMs=0,workerMs=0,attachMs=0;
  let clear:string[]|undefined, revision=0, configured=-1;
  let prototype:readonly number[]|undefined;
  const [w,s,e,n]=init.map.bounds as [number,number,number,number];
  const {origin_top_left:[left,top],cell_m}=init.grid.meta,west=left+cell_m/2,north=top-cell_m/2;
  const core=[w-west,north-n,e-west,north-s];
  // All masked records and the joins of their clipped ribbons live in the
  // core. Allow a small overhang for widths and edge-centred pieces.
  const maskedCore=core.map((v,i)=>v+(i<2?-100:100));

  function unpack(m:PackedMesh){
    let o:T.Mesh|T.LineSegments;
    if(m.instances){
      const arch=m.name.startsWith('basin-walls-')?m.name.slice('basin-walls-'.length) as Arch:undefined;
      const g=m.name==='basin-roofs'?res.roof:m.name==='basin-canopy'?res.sphere:m.name==='basin-cones'?res.cone:res.box;
      const mesh=new T.InstancedMesh(g,arch?res.walls.get(arch)!:res.flat,0);
      mesh.count=m.instances.matrices.length/16;
      mesh.instanceMatrix=new T.InstancedBufferAttribute(m.instances.matrices,16);
      mesh.instanceColor=new T.InstancedBufferAttribute(m.instances.colors,3);
      mesh.boundingSphere=sphere(m.instances.bounds);
      o=mesh;
    }else{
      const geo=new T.BufferGeometry(), data=m.geometry!;
      for(const [k,a,sz] of data.attrs)geo.setAttribute(k,new T.BufferAttribute(a,sz));
      if(data.index)geo.setIndex(new T.BufferAttribute(data.index,1));
      geo.boundingSphere=sphere(data.bounds);
      let mat=m.name==='pilot-ground'?material:materials.get(m.name);
      if(!mat){
        mat=loader.parse(m.material!);
        if(mat instanceof T.MeshLambertMaterial&&(m.name==='pilot-estimated-track'||m.name==='basin-tracks'))mat.map=textures?.track??null;
        if(!m.line)cutouts.apply(mat,false,true);
        materials.set(m.name,mat);
      }
      o=m.line?new T.LineSegments(geo,mat):new T.Mesh(geo,mat);
      if(m.line)o.renderOrder=9;
    }
    o.name=m.name;o.receiveShadow=m.receives;
    return o;
  }
  function disposeMeshes(root:T.Group){
    for(const o of [...root.children]){
      if(o instanceof T.InstancedMesh)o.dispose();
      else if(o instanceof T.Mesh||o instanceof T.LineSegments)o.geometry.dispose();
      root.remove(o);
    }
  }
  function updateActive(){
    const now=performance.now();
    active=[];
    cache.forEach((e,k)=>{
      const t=(now-e.stamp)/fadeMs;
      const target=wanted.has(k)?1:0;
      e.detail=target===1?Math.min(1,e.detail+t):Math.max(0,e.detail-t);
      e.stamp=now;e.group.visible=e.detail>0;
      if(e.group.visible)active.push({tile:e.tile,detail:e.detail});
      for(const o of e.estimates)o.visible=est;
      // A visual cutout doesn't clip the depth pass. Let the authored patch
      // cast its own shadows rather than leaving ghosts of removed massing.
      const cast=e.detail>=1&&(!prototype||!overlaps(tileRect(e.tile),prototype));
      for(const o of e.casts)o.castShadow=cast;
    });
    outlineGroup.visible=desired.length>0&&configured===revision;
  }
  function setClear(next:string[]){
    if(clear?.join()===next.join())return;
    clear=next;revision++;
    cache.forEach(({tile},k)=>{if(overlaps(tileRect(tile),maskedCore))cache.drop(k);});
    disposeMeshes(outlineGroup);
    schedule();
  }
  function schedule(){
    if(frame||closed)return;
    let fades=false;
    cache.forEach((e,k)=>{if(e.detail!==(wanted.has(k)?1:0))fades=true;});
    const work=ready&&!busy&&!failed&&desired.length>0&&(configured!==revision||desired.some(t=>!cache.has(tileKey(t))));
    if(!fades&&!work)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      if(work&&!busy&&desired.length)void build();
      onFrame();
    });
  }
  async function build(){
    busy=true;
    const v=revision;
    try{
      if(configured!==v){
        const result=await builder.send({clear:clear??[]});
        if(closed||revision!==v||result.phase!=='configure')return;
        configured=v;configMs=result.ms;
        result.outlines.forEach(o=>outlineGroup.add(unpack(o)));
        return;
      }
      const tile=desired.find(t=>!cache.has(tileKey(t)));
      if(!tile)return;
      const result=await builder.send({tile});
      if(closed||result.phase!=='tile')return;
      workerMs=Math.max(workerMs,result.ms);
      const k=tileKey(tile);
      if(!wanted.has(k)||revision!==v&&overlaps(tileRect(tile),maskedCore))return;
      const start=performance.now(), part=new T.Group(), estimates:T.Object3D[]=[], casts:T.Object3D[]=[];
      for(const m of result.meshes){
        const o=unpack(m);part.add(o);
        if(m.estimate)estimates.push(o);
        if(m.casts)casts.push(o);
      }
      part.name='tile:'+k;group.add(part);
      cache.put(k,{tile,group:part,estimates,casts,detail:0,stamp:performance.now(),
        dispose:()=>{group.remove(part);disposeMeshes(part);}},wanted);
      attachMs=Math.max(attachMs,performance.now()-start);
    }catch{
      failed=true;
    }finally{
      busy=false;
      if(!closed)onFrame();
    }
  }
  void builder.start(init).then(()=>{if(!closed){ready=true;onFrame();}}).catch(()=>{if(!closed){failed=true;onFrame();}});
  return {group,setClear,update(tiles:Tile[],estimates:boolean,replaced?:readonly number[]){
    // Apply the time elapsed with the previous target before changing it.
    updateActive();
    desired=tiles;wanted=new Set(tiles.map(tileKey));est=estimates;prototype=replaced;
    tiles.forEach(t=>cache.touch(tileKey(t)));
    updateActive();schedule();
  },ready:()=>active,settled:()=>active.filter(t=>t.detail>=1&&wanted.has(tileKey(t.tile))).length,
  count:()=>cache.count,wanted:()=>desired.length,peakBuildMs:()=>workerMs,peakAttachMs:()=>attachMs,
  configMs:()=>configMs,mode:builder.mode,status:()=>failed?'failed':ready?'ready':'loading',dispose:()=>{
    closed=true;if(frame)cancelAnimationFrame(frame);builder.close();cache.clear();disposeMeshes(outlineGroup);
    res.dispose();materials.forEach(m=>m.dispose());
  }};
}
