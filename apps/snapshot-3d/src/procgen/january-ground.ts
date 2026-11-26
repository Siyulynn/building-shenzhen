import design from '../../../../docs/spikes/scene-review/zoning/core-basin-design-grid.json';
import {toWorld,type GroundTint} from './gis';
import type {District} from './districts';

export type DesignSurface='settlement'|'graded_ground'|'civic_park'|'transport_land'|'avenue_verge';
export interface DesignCell{id:string;surface:DesignSurface;inherited?:boolean}

const surfaces:Readonly<Record<string,DesignSurface>>={
  inherited_urban:'settlement',
  built_1984:'settlement',
  graded_works:'graded_ground',
  civic_park:'civic_park',
  transport_yard:'transport_land',
};
const {cell_m:cell,origin_top_left:origin}=design.grid;
const [left,top,right,bottom]=design.grid.box as [number,number,number,number];
const [x0,z0]=toWorld(origin);
const january=design.phases.visit;
const cells=new Map<number,DesignCell>();
const cuts:GroundTint['rect'][]=[];
/** Cells the design map explicitly keeps as 1984 farmland; avenues never turn these to verge. */
const retainedFarmCells=new Set<number>();
const index=(col:number,row:number)=>(row-top)*(right-left)+col-left;

for(const area of [...january.zones,...january.context_areas]){
  const surface=surfaces[area.ground_state];
  if(!surface){
    if(area.ground_state==='retained_farm')
      for(const [row,first,last] of area.runs as [number,number,number][])
        for(let col=first;col<=last;col++)retainedFarmCells.add(index(col,row));
    continue;
  }
  const tag:DesignCell={id:area.id,surface,...(area.ground_state==='inherited_urban'?{inherited:true}:{})};
  for(const [row,first,last] of area.runs as [number,number,number][]){
    cuts.push([x0+first*cell,z0+row*cell,x0+(last+1)*cell,z0+(row+1)*cell]);
    for(let col=first;col<=last;col++)cells.set(index(col,row),tag);
  }
}

// A mapped avenue cell bordering any 1984 urban, works, civic or inherited urban cell reads as
// a disturbed road verge rather than reverting to 1980 paddyfields. Inherited villages count:
// a paved road through a village is still road, not a field.
const developedCells=new Set(cells.keys());
const verge:DesignCell={id:'avenue-reserve',surface:'avenue_verge'};
for(const [row,first,last] of january.avenue_cells as [number,number,number][]){
  for(let col=first;col<=last;col++){
    if(cells.has(index(col,row)))continue;
    // Keep explicitly preserved farmland off the verge layer.
    if(retainedFarmCells.has(index(col,row)))continue;
    const touches=
      (col>left&&developedCells.has(index(col-1,row)))||
      (col<right-1&&developedCells.has(index(col+1,row)))||
      (row>top&&developedCells.has(index(col,row-1)))||
      (row<bottom-1&&developedCells.has(index(col,row+1)));
    if(!touches)continue;
    cells.set(index(col,row),verge);
    cuts.push([x0+col*cell,z0+row*cell,x0+(col+1)*cell,z0+(row+1)*cell]);
  }
}

export const januaryFieldCuts:readonly GroundTint['rect'][]=cuts;

export function januaryGroundAt(x:number,z:number):DesignCell|undefined{
  const col=Math.floor((x-x0)/cell),row=Math.floor((z-z0)/cell);
  if(col<left||col>=right||row<top||row>=bottom)return;
  return cells.get(index(col,row));
}

/** Check whether a stray inherited_urban cell (with no 1980 settlement fabric) sits immediately
 * beside a named January design zone so converted blocks don't leave empty holes. */
export function januaryAdjacentZone(x:number,z:number,zoneId:string):boolean{
  const col=Math.floor((x-x0)/cell),row=Math.floor((z-z0)/cell);
  if(col<left||col>=right||row<top||row>=bottom)return false;
  for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]] as const){
    const c=col+dc,r=row+dr;
    if(c>=left&&c<right&&r>=top&&r<bottom&&cells.get(index(c,r))?.id===zoneId)return true;
  }
  return false;
}

/** The grid resolves a design decision; fine-scale water and rail exclusions still win. */
export function retainedField(original:string|undefined,x:number,z:number,useJanuary:boolean){
  return original==='field'&&(!useJanuary||!januaryGroundAt(x,z));
}

type ZonePreset=Omit<District,'id'|'rect'|'designZone'|'excludeRects'>;
const ZONE_PRESETS:Readonly<Record<string,ZonePreset>>={
  'luohu-housing':{surface:'settlement',mix:{estate_slab:4,worker_dorm:3,danwei_slab:2},parcel:50,compound:true,heading:-9},
  'luohu-high':{surface:'settlement',mix:{early_highrise:3,danwei_slab:3,worker_dorm:1},parcel:48,compound:true,heading:-10},
  'luohu-support':{surface:'settlement',mix:{danwei_slab:3,worker_dorm:2,early_highrise:1},parcel:54,compound:true,heading:-10},
  'luohu-works':{surface:'worksite',form:'works-compound',heading:-10},
  'shangbu-factories':{surface:'settlement',mix:{standard_factory:4,factory_hall:3,worker_dorm:2},parcel:58,compound:true,heading:-4},
  'shangbu-housing':{surface:'settlement',mix:{estate_slab:4,worker_dorm:3,danwei_slab:1},parcel:54,compound:true,heading:-4},
  'shangbu-works':{surface:'worksite',form:'works-compound',heading:-4},
  'bagualing':{surface:'worksite',form:'graded-yard',heading:-4},
  'hubei-housing':{surface:'settlement',mix:{estate_slab:3,danwei_slab:2,worker_dorm:2},parcel:58,compound:true,heading:-9},
  'huangbeiling-works':{surface:'worksite',form:'works-compound',heading:-9},
  'municipal-civic':{form:'grove',designSurface:'civic_park'},
  'luohu-station-yard':{surface:'worksite',form:'rail-yard',designSurface:'transport_land',heading:-6},
  'sungang-yard':{surface:'worksite',form:'rail-yard',designSurface:'transport_land',heading:-6},
  'wenjindu-port':{surface:'worksite',form:'rail-yard',designSurface:'transport_land',heading:-12},
};

export const DESIGN_GENERATED_ZONES=new Set(Object.keys(ZONE_PRESETS));

/** Synthesize 3D districts directly from the resolved January 1984 design map so every
 * built, works, civic and yard zone receives coherent fabric in both overview and close tiles. */
export function januaryDesignDistricts(excludeRects:GroundTint['rect'][]):District[]{
  const out:District[]=[];
  for(const area of [...january.zones,...january.context_areas]){
    const preset=ZONE_PRESETS[area.id];
    if(!preset||!area.runs.length)continue;
    let c0=Infinity,r0=Infinity,c1=-Infinity,r1=-Infinity;
    for(const [row,first,last] of area.runs as [number,number,number][]){
      if(first<c0)c0=first;
      if(last>c1)c1=last;
      if(row<r0)r0=row;
      if(row>r1)r1=row;
    }
    // Expand by 1 cell margin on sides only to reach any adjacent stray inherited_urban hole
    // while districtCoverBlocked strictly enforces designZone / adjacent-hole membership.
    const rect:GroundTint['rect']=[x0+c0*cell,z0+r0*cell,x0+(c1+1)*cell,z0+(r1+1)*cell];
    out.push({
      ...preset,
      id:`design:${area.id}`,
      rect,
      designZone:area.id,
      ...(excludeRects.length?{excludeRects}:{}),
    });
  }
  return out;
}
