import {densify,length,nearest,type P} from './geom';
import {pointAt} from './network';

export interface RoadApproach {
  source: string;
  points: P[];
  allows: (p: P) => boolean;
}

/** Repair small gaps in illustrative approaches. Keep the reference roads and the input traces fixed. */
export function joinRoadApproaches<T extends RoadApproach>(approaches: readonly T[], reference: readonly P[][]) {
  const order = (a:P,b:P) => a[0]-b[0] || a[1]-b[1];
  const same = (a:P,b:P) => Math.hypot(a[0]-b[0],a[1]-b[1])<.001;
  const lineOrder = (a:P[],b:P[]) => {
    for(let i=0;i<Math.min(a.length,b.length);i++){
      const difference=order(a[i]!,b[i]!);
      if(difference)return difference;
    }
    return a.length-b.length;
  };
  const fixed=[...reference].sort(lineOrder);
  const inferred=[...approaches].sort((a,b)=>lineOrder(a.points,b.points));
  const decisions = approaches.map(road => {
    const targets = [...fixed, ...inferred.filter(other => other.source !== road.source).map(other => other.points)];
    return [true,false].map(start => {
      const end = road.points.at(start ? 0 : -1)!;
      const inside = pointAt(road.points, start ? 12 : length(road.points)-12);
      const ux = end[0]-inside[0], uz = end[1]-inside[1], approach = Math.hypot(ux,uz);
      if (!approach) return;
      let best: {distance:number; target:P; points:P[]; line:P[]} | undefined;
      for (const target of targets) {
        const {d,s} = nearest(target,...end);
        if (d < .05) return; // Already joined.
        if (d > 22 || d > (best?.distance ?? Infinity)) continue;
        const point = pointAt(target,s), dx = point[0]-end[0], dz = point[1]-end[1];
        if (best && d === best.distance && order(point,best.target) >= 0) continue;
        if (dx*ux+dz*uz < .5*d*approach) continue; // No sideways or backward hooks.
        if (s > 1 && s < length(target)-1) {
          const before = pointAt(target,s-1), after = pointAt(target,s+1);
          const vx = after[0]-before[0], vz = after[1]-before[1];
          if (Math.abs(vx*ux+vz*uz) > .87*approach*Math.hypot(vx,vz)) continue; // Parallel frontage.
        }
        const extension = densify([end,point],2).slice(1);
        if (extension.every(road.allows)) best = {distance:d, target:point, points:extension, line:target};
      }
      return best;
    });
  });
  const byLine = new Map(approaches.map((road,i)=>[road.points,decisions[i]!]));
  return approaches.map((road,i)=>{
    const extension = (index:number,end:P) => {
      const join = decisions[i]![index];
      if (!join) return [];
      // Reciprocal tips need one extension; otherwise they double back over one another.
      const reciprocal = byLine.get(join.line)?.some((other,j)=>other?.line===road.points &&
        same(other.target,end) && same(join.target,join.line.at(j===0 ? 0 : -1)!));
      return reciprocal && order(end,join.target)>0 ? [] : join.points;
    };
    return {...road,points:[...extension(0,road.points[0]!).slice().reverse(),...road.points,
      ...extension(1,road.points.at(-1)!)]};
  });
}
