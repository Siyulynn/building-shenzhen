import {corners,fits,tree,type Arch,type Area,type Building,type Env,type Piece,type Tree} from './fabric';
import {contains,densify,length,nearest,poly,segmentMeeting,type P} from './geom';
import {pointAt,type Ribbon} from './network';
import {rng} from './rng';

export type FrontageStudy = {
  rect:[number,number,number,number];
  road:string;
  side:'left'|'right';
  intensity:'standard';
} & ({use:'industrial';setback?:number}|{use:'residential'}|{use:'commercial';form:'lane'|'avenue'|'block'});
export interface FrontageLayout {buildings:Building[]; trees:Tree[]; pieces:Piece[]; access:Ribbon[]}

type FootprintBlock = (x:number,z:number,w:number,d:number,a:number)=>boolean;

function* streetLots(id:string,study:FrontageStudy,road:Ribbon,pitch:number,look:number) {
  const side=study.side==='left'?1:-1;
  const roadLength=length(road.points);
  for(let i=0,s=pitch/2;s<=roadLength-pitch/2;i++,s+=pitch){
    const at=pointAt(road.points,s);
    const a=pointAt(road.points,s-look), end=pointAt(road.points,s+look);
    const dx=end[0]-a[0], dz=end[1]-a[1], span=Math.hypot(dx,dz);
    if(!span)continue;
    const u:P=[dx/span,dz/span], inward:P=[-u[1]*side,u[0]*side];
    const angle=Math.atan2(u[1],u[0]);
    const point=(along:number,depth:number):P=>[
      at[0]+along*u[0]+depth*inward[0],at[1]+along*u[1]+depth*inward[1],
    ];
    yield {i,key:`${id}/frontage/${i}`,angle,point,towardStreet:side===-1?angle:angle+Math.PI};
  }
}

function studyArea(id:string,[l,t,r,b]:FrontageStudy['rect']):Area {
  return {id,poly:poly([[[l,t],[r,t],[r,b],[l,b]]])};
}

function fitBuilding(area:Area,env:Env,blocked:FootprintBlock,building:Omit<Building,'base'|'foot'|'masks'|'tone'>,tone:()=>number):Building|undefined {
  const {x,z,w,d,a}=building, outline=corners(x,z,a,w+1.2,d+1.2);
  const probes=[...outline,[x,z] as P];
  if(!fits(area,env,probes)||blocked(x,z,w+1.2,d+1.2,a))return;
  const heights=outline.map(p=>env.height(...p));
  const lo=Math.min(...heights),hi=Math.max(...heights);
  if(hi-lo>4)return;
  return {...building,base:hi+.3,foot:lo-1.5,tone:tone(),masks:env.masks(x,z,'buildings')};
}

/** A standard industrial frontage, with walk-ups behind the factory and a shared gated drive. */
export function industrialFrontage(id:string,study:Extract<FrontageStudy,{use:'industrial'}>,road:Ribbon,env:Env,
  accessBlocked:Env['blocked'],footprintBlocked:FootprintBlock):FrontageLayout {
  const buildings:Building[]=[],trees:Tree[]=[],pieces:Piece[]=[],access:Ribbon[]=[];
  const area=studyArea(id,study.rect), front=road.half+(study.setback??6);
  for(const {i,key,angle,point,towardStreet} of streetLots(id,study,road,76,18)){
    // Keep the interior lot together with its street-side drive.
    const lotProbes=[
      point(-34,front),point(34,front),point(34,front+121),point(-34,front+121),point(0,front+60),
    ];
    if(!fits(area,env,lotProbes))continue;
    const random=rng('sz-frontage',key);
    const serviceX=26, gateAt=point(serviceX,front);
    const join=pointAt(road.points,nearest(road.points,...gateAt).s);
    const approach:[P,P]=[point(serviceX,front+2),join];
    const angleToRoad=Math.atan2(join[1]-approach[0][1],join[0]-approach[0][0]);
    const driveLength=Math.hypot(join[0]-approach[0][0],join[1]-approach[0][1]);
    const apronDepth=driveLength-road.half+.5;
    if(apronDepth<=0)continue;
    const apron:P=[approach[0][0]+Math.cos(angleToRoad)*apronDepth/2,approach[0][1]+Math.sin(angleToRoad)*apronDepth/2];
    const apronProbes=corners(...apron,angleToRoad,apronDepth,5);
    // The short apron may pass through a dry verge outside the building envelope.
    if([...densify([...apronProbes,apronProbes[0]!],3),apron].some(p=>accessBlocked(...p)))continue;
    const driveEnd=point(serviceX,front+116);
    if(!fits(area,env,corners(...point(serviceX,front+58),angle,5,116)))continue;
    const roadside:P=[approach[0][0]+Math.cos(angleToRoad)*apronDepth,approach[0][1]+Math.sin(angleToRoad)*apronDepth];
    const accessPoints=densify([roadside,approach[0],driveEnd],3);

    const place=(role:string,arch:Arch,along:number,depth:number,w:number,d:number,floors:number,
      facing:number):Building|undefined=>{
      const [x,z]=point(along,front+depth);
      return fitBuilding(area,env,footprintBlocked,{key:`${key}/${role}`,parent:id,arch,x,z,a:facing,w,d,floors},random);
    };
    const hall=i%2===0;
    const factory=place('factory',hall?'factory_hall':'standard_factory',-7,29,hall?42:48,hall?28:19,hall?1:5,towardStreet);
    const frontHouse=place('walk-up-front','estate_slab',-7,78,39.6,11,5,towardStreet+Math.PI);
    const backHouse=place('walk-up-back','estate_slab',-7,108,39.6,11,5,towardStreet);
    if(!factory||!frontHouse||!backHouse)continue;

    const compound:Piece[]=[];
    const add=(role:string,center:P,w:number,d:number,h:number,c:number)=>{
      const outline=corners(...center,angle,w,d);
      if(!fits(area,env,[...outline,center])||footprintBlocked(...center,w,d,angle))return;
      const heights=outline.map(p=>env.height(...p)), lo=Math.min(...heights),hi=Math.max(...heights);
      if(hi-lo>2.5)return;
      const [x,z]=center;
      compound.push({key:`${key}/${role}`,role,x,z,a:angle,w,d,y0:lo-.12,y1:hi+h,c,masks:env.masks(x,z,'fields')});
    };
    add('loading-court',point(-1,front+9),51,9,.06,0xb8ad97);
    add('housing-court',point(-1,front+93),51,11,.06,0xb8ad97);
    add('compound-wall',point(-4,front+2),53,.6,1,0xc6bba3);
    for(const offset of [-3,3]){
      add(`gate-post/${offset}`,point(serviceX+offset,front+2),.7,.7,1.8,0xada28e);
    }
    for(const along of [-27,10]){
      const p=point(along,front+98);
      if(!env.blocked(...p))trees.push(tree(`${key}/plant/${along}`,'lychee',...p,env,random));
    }
    buildings.push(factory,frontHouse,backHouse);
    pieces.push(...compound);
    access.push({id:`${key}/drive`,cls:'compound-drive',points:accessPoints,half:2.5,
      ys:accessPoints.map((p,j)=>env.height(...p)+(j===0?.33:.15)),
      skirt:accessPoints.map(()=>false),masked:accessPoints.map(([x,z])=>env.masks(x,z,'streets'))});
  }
  return {buildings,trees,pieces,access};
}

/** Inherited shop bays stay low. Avenue frontage can carry a larger podium and a shallow forecourt. */
export function commercialFrontage(id:string,study:Extract<FrontageStudy,{use:'commercial'}>,road:Ribbon,
  env:Env,blocked:FootprintBlock):FrontageLayout {
  const area=studyArea(id,study.rect), buildings:Building[]=[], pieces:Piece[]=[];
  const occupied:ReturnType<typeof poly>[]=[];
  const lane=study.form==='lane';
  const block=study.form==='block';
  const arch=lane?'lingnan_block':block?'danwei_slab':'early_highrise';
  const w=lane?4:block?29:32, d=lane?12:18;
  const front=road.half+(lane?2.2:block?9:7.5);
  for(const {i,key,towardStreet,point} of streetLots(id,study,road,lane?4.2:44,lane?2.1:12)){
    // Leave narrow entries between groups of shops without cutting a new road.
    if(lane&&i%10===9)continue;
    const random=rng('sz-frontage',key), [x,z]=point(0,front+d/2);
    const building=fitBuilding(area,env,blocked,{key,parent:id,arch,x,z,a:towardStreet,w,d,
      floors:lane?(random()<.7?2:3):block?4+i%3:5,...(lane?{arcade:true}:{})},random);
    if(!building)continue;
    const depth=lane?.8:3.8;
    const lot=poly([corners(...point(0,front+(d-depth)/2),towardStreet,w,d+depth)]);
    // At a bend the trailing corner of one bay can clip its neighbour even at regular chainage.
    if(occupied.some(other=>lotsOverlap(lot,other)))continue;
    // Fill the setback with a narrow paved apron so the door side reads from the street.
    const [px,pz]=point(0,front-depth/2);
    const outline=corners(px,pz,towardStreet,w,depth);
    if(!fits(area,env,[...outline,[px,pz]])||blocked(px,pz,w,depth,towardStreet))continue;
    const grades=outline.map(p=>env.height(...p));
    const y0=Math.min(...grades), y1=Math.max(...grades);
    if(y1-y0>1.5)continue;
    buildings.push(building);
    occupied.push(lot);
    pieces.push({key:key+'/apron',role:lane?'shop-apron':'commercial-forecourt',x:px,z:pz,a:towardStreet,
      w,d:depth,y0:y0-.08,y1:y1+.06,c:0xb8ab93,masks:env.masks(px,pz,'fields')});
  }
  return {buildings,trees:[],pieces,access:[]};
}

/** Paired walk-ups flank a small shared court with pedestrian access from the avenue shoulder. */
export function housingFrontage(id:string,study:FrontageStudy,road:Ribbon,env:Env,blocked:FootprintBlock):FrontageLayout {
  const area=studyArea(id,study.rect), buildings:Building[]=[], trees:Tree[]=[], access:Ribbon[]=[];
  const front=road.half+9;
  for(const {key,angle,point,towardStreet} of streetLots(id,study,road,64,14)){
    const random=rng('sz-frontage',key);
    const row=(name:string,setback:number,facing:number)=>{
      const [x,z]=point(-4,front+setback);
      return fitBuilding(area,env,blocked,{key:`${key}/${name}`,parent:id,arch:'estate_slab',
        x,z,a:facing,w:36,d:11,floors:4},random);
    };
    const outer=row('outer',7,towardStreet+Math.PI), inner=row('inner',33,towardStreet);
    if(!outer||!inner)continue;
    const near=road.half+1.6, far=front+21, width=2.6;
    const walk=point(19,(near+far)/2);
    const court=point(0,far);
    const walkProbes=corners(...walk,angle,width,far-near), courtProbes=corners(...court,angle,38,width);
    if(!fits(area,env,walkProbes)||!fits(area,env,courtProbes)||
      blocked(...walk,width,far-near,angle)||blocked(...court,38,width,angle))continue;
    const path=densify([point(19,near),point(19,far),point(-19,far)],2);
    access.push({id:key+'/walk',cls:'compound-drive',half:width/2,points:path,
      ys:path.map(p=>env.height(...p)+.15),skirt:path.map(()=>false),masked:path.map(([x,z])=>env.masks(x,z,'streets'))});
    const plant=point(-11,far-4);
    if(!env.blocked(...plant))trees.push(tree(`${key}/court-tree`,'lychee',...plant,env,random));
    buildings.push(outer,inner);
  }
  return {buildings,trees,pieces:[],access};
}

function lotsOverlap(a:ReturnType<typeof poly>,b:ReturnType<typeof poly>) {
  if(a.box[2]<=b.box[0]||b.box[2]<=a.box[0]||a.box[3]<=b.box[1]||b.box[3]<=a.box[1])return false;
  const x=a.rings[0]!,y=b.rings[0]!;
  return x.some(p=>contains(b,...p))||y.some(p=>contains(a,...p))||
    x.some((p,i)=>y.some((q,j)=>segmentMeeting(p,x[(i+1)%x.length]!,q,y[(j+1)%y.length]!)));
}
