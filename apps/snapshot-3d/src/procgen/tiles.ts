import * as T from 'three';

export const TILE=3200;
export const MAX_TILES=16;
export type Tile = readonly [number,number];
export const tileOf=(x:number,z:number):Tile=>[Math.floor(x/TILE),Math.floor(z/TILE)];
export const tileKey=(t:Tile)=>t.join(',');
export const tileRect=([x,z]:Tile) => [x*TILE,z*TILE,(x+1)*TILE,(z+1)*TILE] as const;
export const overlaps=(a:readonly number[],b:readonly number[])=>a[0]!<b[2]!&&a[2]!>b[0]!&&a[1]!<b[3]!&&a[3]!>b[1]!;
const PILOT=[
  [16600,36200,36600,41000], // Nantou–Futian–Shangbu
  [16600,40000,20200,44700], // Nantou–Shekou
  [34300,32500,43500,40300], // Core basin and reservoir
  [36900,30600,40100,36500], // Sungang–Buji
] as const;
export const pilotTile=(tile:Tile)=>PILOT.some(rect=>overlaps(rect,tileRect(tile)));
export function bucket<T extends {x:number;z:number}>(rows:readonly T[]){
  const out=new Map<string,T[]>();
  for(const r of rows){
    const k=tileKey(tileOf(r.x,r.z)), list=out.get(k)??[];
    list.push(r);out.set(k,list);
  }
  return out;
}
export function neighbourhood(current:boolean,span:number,core:boolean){
  return current?span<=(core?8400:4800):span<=(core?7600:4000);
}

export function pilotSelection(g:{width:number;height:number;cell_m:number},camera:T.Camera,target:T.Vector3){
  const [cx,cz]=tileOf(target.x,target.z);
  camera.updateMatrixWorld();
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const cols=Math.ceil((g.width-1)*g.cell_m/TILE), rows=Math.ceil((g.height-1)*g.cell_m/TILE);
  const bounds=new T.Box3(), tiles:{tile:Tile;d:number;seen:boolean}[]=[];
  for(let z=Math.max(0,cz-4);z<Math.min(rows,cz+5);z++)for(let x=Math.max(0,cx-4);x<Math.min(cols,cx+5);x++){
    const tile=[x,z] as const,[a,b,c,d]=tileRect(tile);
    if(!pilotTile(tile))continue;
    bounds.min.set(a-80,-35,b-80);bounds.max.set(c+80,1000,d+80);
    const seen=frustum.intersectsBox(bounds),dist=Math.hypot((a+c)/2-target.x,(b+d)/2-target.z);
    if(seen||dist<TILE*1.55)tiles.push({tile,d:dist,seen});
  }
  return tiles.some(t=>t.seen)?tiles.sort((a,b)=>Number(b.seen)-Number(a.seen)||a.d-b.d).slice(0,MAX_TILES).map(t=>t.tile):[];
}

/** Clip globally planned triangles, not centrelines. Normals and UVs are interpolated at seams. */
export function partitionSurface(geometry:T.BufferGeometry, clipMax?:readonly [number,number]){
  const names=['position','normal','uv','color'].filter(k=>geometry.hasAttribute(k));
  const attrs=names.map(k=>geometry.getAttribute(k)), p=attrs[0]!;
  const index=geometry.getIndex(), tris=new Map<string,number[]>();
  const offset=(i:number)=>index?.getX(i)??i;
  const triCount=index?.count??p.count;
  for(let f=0;f<triCount;f+=3){
    const a=offset(f),b=offset(f+1),c=offset(f+2);
    const xa=p.getX(a),xb=p.getX(b),xc=p.getX(c),za=p.getZ(a),zb=p.getZ(b),zc=p.getZ(c);
    const loX=Math.min(xa,xb,xc),loZ=Math.min(za,zb,zc);
    const x0=Math.floor(loX/TILE),z0=Math.floor(loZ/TILE);
    // A triangle whose edge lies exactly on a seam has only one interior owner.
    const x1=Math.floor(Math.max(loX,Math.max(xa,xb,xc)-1e-7)/TILE),
      z1=Math.floor(Math.max(loZ,Math.max(za,zb,zc)-1e-7)/TILE);
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
      const k=`${x},${z}`,arr=tris.get(k);
      if(arr)arr.push(a,b,c);else tris.set(k,[a,b,c]);
    }
  }
  function clip(vs:number[][],axis:number,edge:number,sign:number){
    const out:number[][]=[];
    for(let i=0;i<vs.length;i++){
      const a=vs[i]!, b=vs[(i+1)%vs.length]!, ax=a[axis]!,bx=b[axis]!;
      const inside=(ax-edge)*sign>=0;
      if(inside)out.push(a);
      if(inside!==((bx-edge)*sign>=0)){
        const t=(edge-ax)/(bx-ax), v=a.map((u,j)=>u+(b[j]!-u)*t);
        v[axis]=edge;out.push(v);
      }
    }
    return out;
  }
  function extract(tile:Tile){
    const rows=tris.get(tileKey(tile));if(!rows)return undefined;
    const [l,t,r,b]=tileRect(tile), right=Math.min(r,clipMax?.[0]??Infinity),bottom=Math.min(b,clipMax?.[1]??Infinity);
    const buffers=attrs.map(()=>[] as number[]), indices:number[]=[];
    const read=(i:number)=>{
      const out:number[]=[];
      for(const a of attrs)for(let j=0;j<a.itemSize;j++)out.push(a.getComponent(i,j));
      return out;
    };
    const original=new Map<number,number>();
    const inside=(i:number)=>p.getX(i)>=l&&p.getX(i)<=right&&p.getZ(i)>=t&&p.getZ(i)<=bottom;
    let vertex=0;
    const emit=(i:number)=>{
      let dst=original.get(i);
      if(dst===undefined){
        dst=vertex++;original.set(i,dst);
        for(let k=0;k<attrs.length;k++){
          const a=attrs[k]!,out=buffers[k]!;
          for(let j=0;j<a.itemSize;j++)out.push(a.getComponent(i,j));
        }
      }
      return dst;
    };
    for(let k=0;k<rows.length;k+=3){
      const a=rows[k]!,b=rows[k+1]!,c=rows[k+2]!;
      if(inside(a)&&inside(b)&&inside(c)){
        indices.push(emit(a),emit(b),emit(c));
        continue;
      }
      let vs=[read(a),read(b),read(c)];
      for(const [ax,edge,s] of [[0,l,1],[0,right,-1],[2,t,1],[2,bottom,-1]] as const){
        if(vs.some(v=>(v[ax]!-edge)*s<0))vs=clip(vs,ax,edge,s);
        if(vs.length<3)break;
      }
      if(vs.length<3)continue;
      for(const v of vs){
        let start=0;
        for(let j=0;j<attrs.length;j++){
          const size=attrs[j]!.itemSize; buffers[j]!.push(...v.slice(start,start+size));start+=size;
        }
      }
      for(let j=1;j<vs.length-1;j++)indices.push(vertex,vertex+j,vertex+j+1);
      vertex+=vs.length;
    }
    if(!indices.length)return undefined;
    const g=new T.BufferGeometry();
    names.forEach((k,i)=>g.setAttribute(k,new T.Float32BufferAttribute(buffers[i]!,attrs[i]!.itemSize)));
    g.setIndex(indices);
    return g;
  }
  return extract;
}

/** Distant surfaces are replaced only after their matching detail tiles are ready. */
export type TileBlend={tile:Tile;detail:number};
export class TileCutouts {
  private count={value:0};
  private rects={value:Array.from({length:MAX_TILES},()=>new T.Vector4())};
  private mix={value:new Float32Array(MAX_TILES)};
  private prototypeRect={value:new T.Vector4()};
  set(tiles:readonly TileBlend[]){
    this.count.value=Math.min(MAX_TILES,tiles.length);
    tiles.slice(0,MAX_TILES).forEach(({tile,detail},i)=>{
      this.rects.value[i]!.set(...tileRect(tile));this.mix.value[i]=detail;
    });
  }
  setPrototype(rect?:readonly number[]){
    if(rect)this.prototypeRect.value.set(rect[0]!,rect[1]!,rect[2]!,rect[3]!);
    else this.prototypeRect.value.set(0,0,0,0);
  }
  apply(mat:T.Material, owner=false, detailed=false, replacePrototype=false){
    const before=mat.onBeforeCompile, key=mat.customProgramCacheKey.bind(mat);
    const signature=key();
    mat.onBeforeCompile=(s,r)=>{
      before.call(mat,s,r);
      s.uniforms.tileRectCount=this.count;s.uniforms.tileRects=this.rects;s.uniforms.tileDetail=this.mix;
      if(replacePrototype)s.uniforms.prototypeRect=this.prototypeRect;
      const extent=replacePrototype&&owner;
      s.vertexShader=`varying vec2 vTileXZ;\n${extent?'varying vec2 vTileExtent;\n':''}`+s.vertexShader.replace('#include <project_vertex>',`
        vec4 tilePos=vec4(transformed,1.0);
        ${extent?'vTileExtent=vec2(0.);':''}
        #ifdef USE_INSTANCING
          tilePos=instanceMatrix*${owner?'vec4(0.,0.,0.,1.)':'tilePos'};
          ${extent?'mat4 tileWorld=modelMatrix*instanceMatrix; vTileExtent=.5*(abs(tileWorld[0].xz)+abs(tileWorld[2].xz));':''}
        #endif
        vTileXZ=(modelMatrix*tilePos).xz;
        #include <project_vertex>`);
      s.fragmentShader=`varying vec2 vTileXZ;
        ${extent?'varying vec2 vTileExtent;':''}
        uniform int tileRectCount;
        uniform vec4 tileRects[${MAX_TILES}];
        uniform float tileDetail[${MAX_TILES}];\n${replacePrototype?'uniform vec4 prototypeRect;':''}\n`+
      s.fragmentShader.replace('#include <clipping_planes_fragment>',`
        #include <clipping_planes_fragment>
        ${replacePrototype?`if(prototypeRect.z>prototypeRect.x&&all(greaterThanEqual(${extent?'vTileXZ+vTileExtent':'vTileXZ'},prototypeRect.xy))&&all(lessThan(${extent?'vTileXZ-vTileExtent':'vTileXZ'},prototypeRect.zw)))discard;`:''}
        for(int tileIdx=0;tileIdx<${MAX_TILES};++tileIdx){
          if(tileIdx>=tileRectCount)break;
          vec4 rect=tileRects[tileIdx];
          if(all(greaterThanEqual(vTileXZ,rect.xy))&&all(lessThan(vTileXZ,rect.zw))){
            float d=tileDetail[tileIdx];
            // Complementary screen-door fade keeps depth writes on for both
            // terrain representations and avoids transparent sorting.
            float threshold=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(0.06711056,0.00583715))));
            if(${detailed?'threshold>=d':'threshold<d'})discard;
            break;
          }
        }`);
    };
    mat.customProgramCacheKey=()=>signature+`:tile-cutouts:${owner}:${detailed}:${replacePrototype}`;
    mat.needsUpdate=true;
  }
}
