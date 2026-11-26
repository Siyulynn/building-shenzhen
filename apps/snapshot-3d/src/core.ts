import * as T from 'three';
import {ground, type Grid, type Meta} from './grid';
import trace from '../core-trace.json';

type Pair = [number, number];
export type CellBox = [number, number, number, number];
export type Kh9Meta = {slice: {file: string; px_m: number; cell_box: CellBox}};
export const coreTrace = trace;
export const coreCells = trace.reviewWindow.cellBox as CellBox;
export const coreColors = {
  water: '#6ce5f2', rail: '#ffd17e', anchor: '#ffd17e', road: '#f6acbb',
  town: '#f6acbb', land: '#d3e79b',
} as const;

export function cropUv(meta:Meta, slice:Kh9Meta['slice'], width:number, height:number) {
  const [left, top, right, bottom] = slice.cell_box;
  if (slice.cell_box.length !== 4 || !slice.cell_box.every(Number.isInteger)
    || left < 0 || top < 0 || right > meta.width || bottom > meta.height || right <= left || bottom <= top
     || ![6.25,2].includes(slice.px_m) || width !== (right-left)*meta.cell_m/slice.px_m || height !== (bottom-top)*meta.cell_m/slice.px_m) {
    throw Error('Unregistered KH-9 crop / KH-9 影像配准不匹配');
  }
  return {
    offset: [left/meta.width, top/meta.height] as Pair,
    scale: [meta.width/(right-left), meta.height/(bottom-top)] as Pair,
  };
}

// Review-image pixel coordinates measure from a cell edge; scene zero is a cell centre.
export function reviewToWorld(x:number, y:number, cell:number):Pair {
  const [left,top] = coreCells, px = trace.reviewWindow.pixelsPerCell;
  return [(left+x/px-0.5)*cell, (top+y/px-0.5)*cell];
}

export function buildCoreTrace(g:Grid) {
  const root = new T.Group();
  const styles = new Map<string,T.LineBasicMaterial | T.LineDashedMaterial>();
  for (const {id, kind, basis, points} of trace.features) {
    const key = `${kind}:${basis}`;
    const color = coreColors[kind as keyof typeof coreColors];
    if (!styles.has(key)) {
      const settings = {color, depthTest:false, depthWrite:false, toneMapped:false};
      styles.set(key, basis==='visible' ? new T.LineBasicMaterial(settings)
        : new T.LineDashedMaterial({...settings, dashSize:22, gapSize:13}));
    }
    const vertices = points.map(([px,py]) => {
      const [x,z] = reviewToWorld(px!,py!,g.meta.cell_m);
      return new T.Vector3(x,ground(g,x,z)+0.5,z);
    });
    if (kind==='anchor') {
      const p=vertices[0]!;
      vertices.splice(0,1,...[[0,-34],[34,0],[0,34],[-34,0],[0,-34]].map(([dx,dz])=>
        new T.Vector3(p.x+dx!,p.y,p.z+dz!)));
    }
    const line = new T.Line(new T.BufferGeometry().setFromPoints(vertices),styles.get(key)!);
    line.name=id;
    line.renderOrder=10;
    line.computeLineDistances();
    root.add(line);
  }
  return root;
}
