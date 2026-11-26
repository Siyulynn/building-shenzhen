import * as T from 'three';
import {kit,type Piece} from './parts';
import {ground,type Grid} from './grid';
import data from '../atlas.json';
export type Epoch=keyof typeof data.epochs;
export interface Layout {anchor:string;offset:number[];claims:string[];parts:(string|number)[][]}
export interface Focus {name:string[];anchor:string;range:number;epochs:Record<Epoch,string[]>;notes:string[]}
export const layouts:Record<string,Layout>=data.layouts, focuses:Record<string,Focus>=data.focus;
export const epochs=data.epochs;
export interface Site {id:string;name:{en:string;zh:string};cell:[number,number]|null;claims:{id:string;use:string}[]}
export function origin(l:Layout,sites:Site[],cell:number):[number,number] {
  const anchor=sites.find(s=>s.id===l.anchor)?.cell;
  if(!anchor)throw Error('Unplaced anchor: '+l.anchor);
  return [anchor[0]*cell+l.offset[0]!,anchor[1]*cell+l.offset[1]!];
}
export interface Placement {key:string;kind:string;x:number;z:number;yaw:number}
export function assemble(names:string[],sites:Site[],cell:number):Placement[]{
  const placed:Placement[]=[];
  for(const id of new Set(names)){
    const l=layouts[id]!,[cx,cz]=origin(l,sites,cell);
    l.parts.forEach((row,index)=>{
      const [kind,dx,dz,nx,nz,sx,sz,angle]=row as [string,number,number,number,number,number,number,number];
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)placed.push({key:[id,index,j,i].join('/'),kind,
        x:cx+dx+(i-(nx-1)/2)*sx,z:cz+dz+(j-(nz-1)/2)*sz,yaw:angle*Math.PI/180});
    });
  }
  return placed;
}
function roofGeometry(){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5,-.5,1,0,.5,1,0],3));
  g.setIndex([0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2,0,1,2,0,2,3]);
  const flat=g.toNonIndexed();g.dispose(); flat.computeVertexNormals();return flat;
}
export function models(g:Grid,placed:Placement[],at=(x:number,z:number)=>ground(g,x,z),anchorToGrade=false) {
  const boxes=new T.BoxGeometry(), roof=roofGeometry(), canopy=new T.IcosahedronGeometry(1,0);
  const geos={box:boxes,roof,tree:canopy}, cache=new Map<string,Piece[]>();
  const buckets=new Map<Piece['form'],{matrix:T.Matrix4;color:T.Color}[]>();
  const o=new T.Object3D();
  for(const item of placed){
    const parts=cache.get(item.kind)??kit(item.kind);cache.set(item.kind,parts);
    const co=Math.cos(item.yaw),si=Math.sin(item.yaw);
    const base=at(item.x,item.z);
    const foundation=anchorToGrade?parts.find(p=>p.form==='box'&&p.y<0&&p.y+p.h/2>0):undefined;
    const onGrade=['field','pond','laneEW','laneNS','road','rail','siteyard'].includes(item.kind);
    for(const p of parts){
      const x=item.x+co*p.x+si*p.z,z=item.z-si*p.x+co*p.z;
      let y=(onGrade||p.ground==='base'||p.ground==='tangent'?at(x,z):base)+p.y,h=p.h;
      if(p===foundation||p.ground==='footing'){
        // Extend the plinth to the lowest contact without lifting the façade
        // or moving the kit's ground pin off the shared terrain.
        const min=Math.min(...[-1,1].flatMap(a=>[-1,1].map(b=>
          at(x+a*co*p.w/2+b*si*p.d/2,z-a*si*p.w/2+b*co*p.d/2))));
        const extra=Math.max(0,y-h/2-min+.35);
        y-=extra/2;h+=extra;
      }
      o.position.set(x,y,z);
      o.rotation.set(0,item.yaw,p.tilt,'YXZ');o.scale.set(p.w,h,p.d);
      if(onGrade||p.ground==='tangent'){
        // Fit flat civil pieces to the local DEM tangent, including long road sections.
        const dx=(at(x+2,z)-at(x-2,z))/4,dz=(at(x,z+2)-at(x,z-2))/4;
        o.rotation.x=-Math.atan(dx*si+dz*co);o.rotation.z=Math.atan(dx*co-dz*si);
      }
      o.updateMatrix();
      const bucket=buckets.get(p.form)??[];bucket.push({matrix:o.matrix.clone(),color:new T.Color(p.color)});buckets.set(p.form,bucket);
    }
  }
  const group=new T.Group(),mat=new T.MeshLambertMaterial({flatShading:true});
  for(const [form,records] of buckets){
    const batch=new T.InstancedMesh(geos[form],mat,records.length);
    records.forEach((r,i)=>{batch.setMatrixAt(i,r.matrix);batch.setColorAt(i,r.color);});
    batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();group.add(batch);
  }
  for(const key of Object.keys(geos) as Piece['form'][]) if(!buckets.has(key))geos[key].dispose();
  if(!buckets.size)mat.dispose();
  return group;
}
