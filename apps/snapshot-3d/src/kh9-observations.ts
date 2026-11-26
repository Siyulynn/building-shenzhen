import * as T from 'three';
import data from '../kh9-observations.json';
import {ground, type Grid} from './grid';

export const observations = data;
export type PhotoPlace = typeof observations.places[number];
export const observationColors: Record<string,string> = {
  water:'#73dff6', rail:'#ffcf79', road:'#ffabc5', field:'#c4e379',
  settlement:'#ead1fc', building:'#ffe7a8', hill:'#efc998',
};
export const placementLabels: Record<string,[string,string]> = {
  likely:['Likely identification','较可信辨认'],
  candidate:['Candidate location','候选位置'],
  context:['Historical search area','历史查找区'],
};

// Image-relative edge coordinates on the 2 m chip. World origin is the centre of grid cell (0, 0).
export function photoToWorld(x:number, y:number, cell:number):[number,number]{
  const [left,top]=observations.image.cellBox;
  const m=observations.image.metresPerPixel;
  return [(left!-.5)*cell+x*m,(top!-.5)*cell+y*m];
}

export function makeObservationOverlay(g:Grid){
  const group=new T.Group();
  const materials = new Map<string,T.LineBasicMaterial>();
  for (const f of observations.traces){
    const vertices=f.points.map(([x,y])=>{
      const [wx,wz]=photoToWorld(x!,y!,g.meta.cell_m);
      return new T.Vector3(wx,ground(g,wx,wz)+0.5,wz);
    });
    const geometry=new T.BufferGeometry().setFromPoints(vertices);
    const key=f.kind+'/'+f.basis;
    if (!materials.has(key)){
      const options={color:observationColors[f.kind],depthTest:false,depthWrite:false,toneMapped:false,
        transparent:true,opacity:.95};
      materials.set(key,f.basis==='visible'?new T.LineBasicMaterial(options):
        new T.LineDashedMaterial({...options,dashSize:21,gapSize:10}));
    }
    const line=new T.Line(geometry,materials.get(key)!);
    line.name=f.id;line.renderOrder=10;line.computeLineDistances();group.add(line);
  }
  return group;
}
