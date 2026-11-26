import * as T from 'three';
import {axis, surface, type Grid} from './grid';

type Rect = {left:number;top:number;right:number;bottom:number};
export function terrainMesh(g:Grid, area:Rect, step:number, material:T.Material, hole?:Rect, at?:(x:number,z:number)=>number) {
  const {width,height,cell_m}=g.meta;
  const cols=axis(area.left,area.right,step), rows=axis(area.top,area.bottom,step);
  const points:number[]=[], uv:number[]=[], indices:number[]=[];
  for (const [j,r] of rows.entries()) for (const [i,c] of cols.entries()) {
    points.push(c*cell_m,at?at(c*cell_m,r*cell_m):g.elevation[r*width+c]!,r*cell_m);
    uv.push((c+0.5)/width,(r+0.5)/height);
    if (i+1===cols.length || j+1===rows.length) continue;
    if (hole && c>=hole.left && c<hole.right && r>=hole.top && r<hole.bottom) continue;
    const a=j*cols.length+i, b=a+1, d=a+cols.length;
    indices.push(a,d,b,b,d,d+1);
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geo.setIndex(indices); geo.computeVertexNormals();
  const result=new T.Mesh(geo,material); result.receiveShadow=true;
  return result;
}

// Colour is a separate, replaceable raster. No water hypothesis changes DEM vertices.
export function terrainTexture(g:Grid, layer:string) {
  const {width,height}=g.meta;
  const data=new Uint8Array(width*height*4);
  const ramp=new T.Color(), low=new T.Color('#dcd4ae'), hill=new T.Color('#92a889'), peak=new T.Color('#647f71');
  const water=new T.Color('#77a8ad'), missing=new T.Color('#c9c3b3'), outside=new T.Color('#cfc8b8');
  const clearer=new T.Color('#bd8860'), greener=new T.Color('#859d76'), emerged=new T.Color('#dec48a');
  for(let i=0;i<width*height;i++) {
    const z=g.elevation[i]!, s=surface(g,i,layer);
    ramp.copy(low).lerp(hill,Math.min(1,Math.max(0,z)/160)).lerp(peak,Math.max(0,Math.min(1,(z-160)/500)));
    if (!g.district[i]) ramp.lerp(outside,0.48);
    if (s==='water' || (s==='base' && g.modernWater[i])) ramp.copy(water);
    if (s==='clearing') ramp.copy(clearer);
    if (s==='greener') ramp.copy(greener);
    if (s==='emerged') ramp.copy(emerged);
    if (s==='unknown') ramp.lerp(missing,0.65);
    ramp.convertLinearToSRGB();
    const k=i*4;
    data[k]=Math.round(ramp.r*255); data[k+1]=Math.round(ramp.g*255); data[k+2]=Math.round(ramp.b*255); data[k+3]=255;
  }
  const texture=new T.DataTexture(data,width,height);
  texture.colorSpace=T.SRGBColorSpace; texture.generateMipmaps=true;
  texture.minFilter=T.LinearMipmapLinearFilter; texture.magFilter=layer==='base'?T.LinearFilter:T.NearestFilter; texture.needsUpdate=true;
  return texture;
}

export type {Rect};
/**
 * `extra` widens the full-resolution patch (kept on the 32-cell tile grid); `hole` leaves quads out of it
 * where another surface (the procedural basin lattice) replaces the DEM exactly along its vertex lines.
 */
export function buildTerrain(g:Grid, material:T.Material, focus?:[number,number], extra?:Rect, hole?:Rect) {
  const all={left:0,top:0,right:g.meta.width-1,bottom:g.meta.height-1};
  const group=new T.Group();
  if (!focus) { group.add(terrainMesh(g,all,4,material)); return group; }
  const tile=32, cx=Math.floor(focus[0]/tile)*tile, cy=Math.floor(focus[1]/tile)*tile;
  const snap=(v:number,up:boolean)=>(up?Math.ceil(v/tile):Math.floor(v/tile))*tile;
  const patch={left:Math.max(0,Math.min(cx-tile,extra?snap(extra.left,false):Infinity)),
    top:Math.max(0,Math.min(cy-tile,extra?snap(extra.top,false):Infinity)),
    right:Math.min(all.right,Math.max(cx+2*tile,extra?snap(extra.right,true):-Infinity)),
    bottom:Math.min(all.bottom,Math.max(cy+2*tile,extra?snap(extra.bottom,true):-Infinity))};
  group.add(terrainMesh(g,all,4,material,patch));
  // Two tiles per chunk keeps the draw-call count down when the patch is widened.
  for(let r=patch.top;r<patch.bottom;r+=2*tile) for(let c=patch.left;c<patch.right;c+=2*tile) {
    group.add(terrainMesh(g,{left:c,top:r,right:Math.min(c+2*tile,patch.right),bottom:Math.min(r+2*tile,patch.bottom)},1,material,hole));
  }
  // Match the coarse triangle edges exactly along the perimeter of the full-resolution patch.
  for(const child of group.children.slice(1)) {
    const geo=(child as T.Mesh<T.BufferGeometry>).geometry, p=geo.getAttribute('position');
    for(let k=0;k<p.count;k++) {
      const c=Math.round(p.getX(k)/g.meta.cell_m), r=Math.round(p.getZ(k)/g.meta.cell_m);
      const rowEdge=r===patch.top||r===patch.bottom, colEdge=c===patch.left||c===patch.right;
      if (!rowEdge && !colEdge) continue;
      const v=rowEdge?c:r, start=Math.floor(v/4)*4, end=Math.min(start+4,rowEdge?all.right:all.bottom);
      if (end===start) continue;
      const at=(a:number)=>g.elevation[rowEdge?r*g.meta.width+a:a*g.meta.width+c]!;
      p.setY(k,T.MathUtils.lerp(at(start),at(end),(v-start)/(end-start)));
    }
    geo.computeVertexNormals();
  }
  return group;
}
