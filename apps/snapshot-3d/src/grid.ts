export interface Meta {
  width:number; height:number; cell_m:number; crs:string; origin_top_left:[number,number];
}
export interface Grid {
  meta:Meta; elevation:Int16Array; modernWater:Uint8Array; district:Uint8Array;
  water79:Uint8Array; change:Uint8Array;
}
export function decode(meta:Meta, raw:ArrayBuffer, water:ArrayBuffer, change:ArrayBuffer):Grid {
  const n = meta.width * meta.height;
  if (!Number.isInteger(n) || meta.width < 2 || meta.height < 2 || meta.crs !== 'EPSG:32650'
    || meta.cell_m !== 100 || raw.byteLength !== n*6 || water.byteLength !== n || change.byteLength !== n) {
    throw Error('Incompatible grid / 网格格式不匹配');
  }
  return {meta, elevation:new Int16Array(raw,0,n), modernWater:new Uint8Array(raw,2*n,n),
    district:new Uint8Array(raw,3*n,n), water79:new Uint8Array(water), change:new Uint8Array(change)};
}
// Local x=z=0 is the centre of pixel (0,0). GIS origin is its north-west corner.
export function utm(meta:Meta, x:number, z:number) {
  return [meta.origin_top_left[0]+meta.cell_m/2+x, meta.origin_top_left[1]-meta.cell_m/2-z];
}
export function axis(first:number,last:number,step:number) {
  const values:number[]=[];
  for (let p=first;p<last;p+=step) values.push(p);
  values.push(last);
  return values;
}
// Interpolate the two triangles actually drawn by the terrain renderer.
export function ground(g:Grid,x:number,z:number) {
  const {width,height,cell_m}=g.meta;
  const c=Math.max(0,Math.min(width-1,x/cell_m)), r=Math.max(0,Math.min(height-1,z/cell_m));
  const i=Math.min(width-2,Math.floor(c)), j=Math.min(height-2,Math.floor(r));
  const u=c-i,v=r-j,k=j*width+i, e=g.elevation;
  if (u+v<=1) return e[k]!*(1-u-v)+e[k+1]!*u+e[k+width]!*v;
  return e[k+width+1]!*(u+v-1)+e[k+width]!*(1-u)+e[k+1]!*(1-v);
}
export type Surface = 'base'|'land'|'water'|'unknown'|'clearing'|'greener'|'emerged';
export function surface(g:Grid,i:number,layer:string):Surface {
  if (layer==='base') return 'base';
  if (layer==='oct79') {
    if (g.water79[i]===255 || (g.water79[i]===1 && g.elevation[i]!>20)) return 'unknown';
    return g.water79[i]===1 ? 'water':'land';
  }
  switch (g.change[i]) {
    case 1:return 'land';
    case 2:return 'greener';
    case 3:return 'clearing';
    case 4:return 'emerged';
    case 5:case 6:return g.elevation[i]!<=20 ? 'water':'unknown';
    default:return 'unknown';
  }
}
