import * as T from 'three';
import {epochEntries,type EpochModel} from './epochs';
import {buildLuohu,luohuCamera,luohuCorridor,luohuStudy} from './luohu';
import {coreDry,districtFabric,type District} from './procgen/districts';
import {loadBasin,toWorld,type RawMap} from './procgen/gis';
import type {GenCfg} from './procgen/plan';
import {nearest,type P} from './procgen/geom';

const shangbuStudy={
  name:['Shangbu roadworks and Electronics Building','上步道路工程与电子大厦'],
  anchors:['electronics-building','shangbu-industry','shangbu-east-west-corridor'],
  note:{
    en:'The 1983-captioned Electronics Building view shows a finished strip-window building, an unidentified scaffolded neighbour and exposed roadworks. This eye-level study reuses the atlas junction proxy and unfinished shell. The shallow cut, supplies and viewpoint are illustrative, not a measured trench or a photographic match.',
    zh:'标注为 1983 年的电子大厦照片可见已竣工的带窗楼、未辨名的脚手架楼体和道路施工。此街景沿用图集的路口示意与未完工体量；浅槽、物料和视点均为示意，不是实测沟槽或照片复拍。',
  },
  comparison:{
    en:'Same viewpoint, earlier atlas snapshot. The 1979 opening withholds the later works trace; September shows the interpreted clearing. The January roadside dressing is hidden. The comparison is not a dated excavation sequence.',
    zh:'保持视点，查看较早的图集时点。1979 年初不显示较晚的工程描线；九月显示判读的清理带。一月路侧细部已隐藏。对照并非确切定年的开挖过程。',
  },
} as const;
const yuminStudy={
  name:['Yumin New Village lane','渔民新村街巷'],
  anchors:['yumin-candidate-land'],
  note:{
    en:'A compact villa lane inspired by the publisher-attributed aerial and contemporary housing reports. Pale two-storey rows, concrete lanes, drains and planted yards reuse the atlas demonstration compound. The gates and spacing are illustrative; no house address, count or original camera bearing is established.',
    zh:'参考出版方标注的航片及同期住宅报道，示意紧凑的别墅巷。沿用图集内浅色两层排屋、水泥巷、边沟及绿化小院。院门、间距均为示意，不确定门牌、栋数或原始拍摄方位。',
  },
  comparison:{
    en:'Same viewpoint, earlier atlas snapshot. Low-rise context replaces the January demonstration compound; the ponds do not change. This does not establish the course of an earlier lane or the sequence of individual house replacements.',
    zh:'保持视点，查看较早的图集时点。此时显示低层聚落背景，不显示一月示意组团，水塘不变。不据此推定早期巷道位置或逐户改建顺序。',
  },
} as const;
export const streetStudies={
  luohu:luohuStudy,shangbu:shangbuStudy,yumin:yuminStudy,
  civic:{
    name:['Municipal government block','市政府大楼'],
    anchors:['municipal-government'],
    note:{
      en:'The old Bao’an county seat was at Caiwuwei. By the January snapshot, Party and government offices shared a six-storey block on the Shangbu rise near Tongxinling. This is a reconstruction of the building’s broad form, not of its exact parcel or the filmed view.',
      zh:'原宝安县城在蔡屋围。到一月时点，市委与市政府机关在通新岭一带的上步岭共用一座六层办公楼。此处仅示意楼体的大致形态，并不复原确切地块或影片视角。',
    },
    comparison:{
      en:'Same camera, earlier snapshot. The later government compound is withheld; the inherited ground and small-scale context do not establish what stood here.',
      zh:'保持视点，查看较早时点。不显示后来的市政府院落；沿用的地表和小尺度背景不代表此处原有建筑已有定论。',
    },
  },
  'yumin-pond':{
    ...yuminStudy,name:['Yumin pond edge','渔民村塘边'],
    note:{
      en:'A second view of the same demonstration compound from the pond margin. Water, lowland and the Luohu backdrop come from the atlas layers; neither the sightline nor the shoreline is a registered historical observation.',
      zh:'从塘边再看同一示意组团。水体、低地和罗湖远景均沿用图集，不将视线或岸缘视作已配准的历史观测。',
    },
  },
} as const;
export type StreetId=keyof typeof streetStudies;
export const streetEntries=['luohu','shangbu','yumin','civic'] as const;
export const isStreetId=(id:string|null):id is StreetId=>id!==null&&Object.hasOwn(streetStudies,id);
export const streetClaims=(id:StreetId)=>epochEntries('visit').filter(e=>streetStudies[id].anchors.some(key=>key===e.id));

type Height=(x:number,z:number)=>number;
type Pose={eye:T.Vector3;look:T.Vector3;fov:number};
type Detail={group:T.Group;dispose():void};
type Guide={id:string;label:string;at:P;height:number;proxy?:boolean};
interface StreetLayout{
  at:P; span:number; returnSpan:number; shadow:number; fog:[number,number];
  camera(ground:Height):Pose; build?(ground:Height):Detail; guides?:Guide[];
}

export function streetLayout(id:StreetId,map:RawMap,cfg:GenCfg,models:EpochModel[],districts:District[]):StreetLayout{
  if(id==='luohu'){
    const c=luohuCorridor(map,cfg,models);
    return {at:c.at,span:440,returnSpan:560,shadow:185,fog:[165,780],
      camera:at=>luohuCamera(c,at),build:at=>buildLuohu(c,at),guides:[
        {id:'guomao',label:'Guomao works · 国贸施工',at:c.guomao.at,height:80},
        {id:'guoshang',label:'Guoshang proxy · 国商（示意）',at:c.guoshang.at,height:58,proxy:true},
      ]};
  }
  if(id==='shangbu'){
    const b=loadBasin(map,[]),line=b.lines.get('shangbu-east-west-corridor'),landmark=models.find(m=>m.id==='electronics-building');
    const half=cfg.roads['shangbu-east-west-corridor']?.width;
    const works=districts.find(d=>d.id.startsWith('shangbu-industry/')&&d.form==='graded-yard');
    if(!line||!landmark||half===undefined||!works)throw Error('Missing Shangbu study anchors');
     const roadHalf=half/2, at=toWorld([199968,2495836]);
     const apron=works.rect;
    const groundFits=(x:number,z:number)=>coreDry(b,x,z)&&inside(apron,x,z)&&nearest(line.points,x,z).d>roadHalf+2&&
      !inside(landmark.clear,x,z);
    return {at,span:480,returnSpan:720,shadow:165,fog:[135,700],
       camera:ground=>pose(ground,toWorld([199938,2495768]),toWorld([199971,2495925]),1.68,17,46),
      build:ground=>shangbuDressing(ground,at,groundFits),
      guides:[{id:'electronics-building',label:'Electronics Bldg proxy · 电子大厦（示意）',at:landmark.at,height:38,proxy:true}]};
  }
  if(id==='civic'){
    const landmark=models.find(m=>m.id==='municipal-government');
    if(!landmark)throw Error('Missing civic study anchor');
    return {at:landmark.at,span:420,returnSpan:580,shadow:142,fog:[175,690],
      camera:ground=>pose(ground,toWorld([200971,2495847]),toWorld([201004,2495948]),3.2,11,44),
      guides:[{id:landmark.id,label:'Government block proxy · 市政府大楼（示意）',at:landmark.at,height:21,proxy:true}]};
  }
  const court=districts.find(d=>d.form==='villa-court'&&d.id.startsWith('yumin-candidate-land/'));
  if(!court)throw Error('Missing atlas villa court');
  const b=loadBasin(map,[]),[l,t,r,z]=court.rect,at:P=[(l+r)/2,(t+z)/2];
  const pond=id==='yumin-pond';
  return {at,span:370,returnSpan:445,shadow:97,fog:pond?[235,1500]:[55,460],
    camera:ground=>pond?pose(ground,[38115,38770],[38195,38730],2.6,4.8,46):
      pose(ground,[l-5,t+41.9],[l+68,t+41.7],1.68,2.85,50),
    build:ground=>yuminDressing(court,at,ground,(x,z)=>b.coverAt(x,z)?.id===court.within)};
}

const inside=(r:readonly number[],x:number,z:number)=>x>r[0]!&&x<r[2]!&&z>r[1]!&&z<r[3]!;
function pose(ground:Height,eye:P,target:P,eyeH:number,lookH:number,fov:number):Pose{
  const y=ground(...eye);
  return {eye:new T.Vector3(eye[0],y+eyeH,eye[1]),look:new T.Vector3(target[0],y+lookH,target[1]),fov};
}

/** One shared ground contact and small instanced material batches. Nothing
 * writes to the grade, roads, shoreline or the municipal parcel generator. */
function dressing(id:StreetId, at:P, ground:Height, fits:(x:number,z:number)=>boolean){
  const group=new T.Group(), mat=new T.MeshLambertMaterial({flatShading:true});
  group.name=id+'-lod2-dressing';
  group.userData={status:'illustrative-street-study',claim_ids:[...new Set(streetClaims(id).flatMap(e=>e.claims))].join(';')};
  group.position.set(at[0],ground(...at),at[1]);
  type Shape='box'|'round'|'leaf';
  const geos={box:new T.BoxGeometry(),round:new T.CylinderGeometry(.5,.5,1,9),leaf:new T.IcosahedronGeometry(.5,1)};
  const scratch=new T.Object3D(), ink=new T.Color();
  const bins=new Map<Shape,{matrix:T.Matrix4;ink:number}[]>();
  const xyz=(x:number,y:number,z:number)=>new T.Vector3(x-group.position.x,y-group.position.y,z-group.position.z);
  function part(x:number,z:number,w:number,h:number,d:number,c:number,bottom=0,yaw=0,shape:Shape='box'){
    const wc=(Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*d)/2,dc=(Math.abs(Math.cos(yaw))*d+Math.abs(Math.sin(yaw))*w)/2;
    if(![-1,1].every(i=>[-1,1].every(j=>fits(x+i*wc,z+j*dc))))return;
    scratch.position.copy(xyz(x,ground(x,z)+bottom+h/2,z));scratch.scale.set(w,h,d);scratch.rotation.set(0,yaw,0);scratch.updateMatrix();
    const bin=bins.get(shape)??[];
    bin.push({matrix:scratch.matrix.clone(),ink:c});bins.set(shape,bin);
  }
  function finish():Detail{
    for(const [shape,items] of bins){
      const mesh=new T.InstancedMesh(geos[shape],mat,items.length);
      mesh.name=`${id}-${shape}`;mesh.castShadow=mesh.receiveShadow=true;
      items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,ink.setHex(item.ink));});
      mesh.computeBoundingSphere();group.add(mesh);
    }
    return {group,dispose(){
      for(const child of group.children)if(child instanceof T.Mesh){
        if(child instanceof T.InstancedMesh)child.dispose();
        else {child.geometry.dispose();(child.material as T.Material).dispose();}
      }
      Object.values(geos).forEach(g=>g.dispose());mat.dispose();group.clear();
    }};
  }
  return {group,xyz,part,finish};
}

function shangbuDressing(ground:Height,at:P,fits:(x:number,z:number)=>boolean){
   const kit=dressing('shangbu',at,ground,fits);
   const dx=at[0]-35845,dz=at[1]-37937;
   const part:typeof kit.part=(x,z,...args)=>kit.part(x+dx,z+dz,...args);
  // A narrow cut between banks *above* the shared grade. Model section is
  // shallow; the photographed deep trench is not used as a measured section.
  const xyz:number[]=[],tints:number[]=[],shade=new T.Color();
  const marks=[[-3.45,.03],[-2.5,.76],[-1.35,.91],[-.76,.08],[.71,.08],[1.5,.94],[2.31,.81],[3.9,.035]] as const;
  const colors=[0x9e7957,0xbc9064,0xa17854,0x816d53,0x9f7954,0xbc956c,0xa47c56];
  function point(i:number,j:number){
     const [wx,h]=marks[j]!,z=37961-i*2.5+dz,x=35840+wx+(i%4)*.22-i*.16+dx;
    return [x,ground(x,z)+.025+h*Math.min(1,i/2,(15-i)/2),z] as const;
  }
  for(let i=0;i<15;i++)for(let k=0;k<marks.length-1;k++){
    const a=point(i,k),b=point(i,k+1),c=point(i+1,k),d=point(i+1,k+1);
    if(![a,b,c,d].every(([x,,z])=>fits(x,z)))continue;
    shade.setHex(colors[k]!).multiplyScalar(.93+.023*((i+2*k)%5));
    for(const p of [a,b,c,b,d,c]){const q=kit.xyz(...p);xyz.push(q.x,q.y,q.z);tints.push(shade.r,shade.g,shade.b);}
  }
  if(xyz.length){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
    g.setAttribute('color',new T.Float32BufferAttribute(tints,3));g.computeVertexNormals();
    // Use the same Lambert response as other atlas surfaces; vertex colour
    // provides the metre-scale variation, not sampled photo pixels.
    const mat=new T.MeshLambertMaterial({vertexColors:true,flatShading:true,side:T.DoubleSide});
    const mesh=new T.Mesh(g,mat);mesh.name='shangbu-shallow-cut';mesh.receiveShadow=true;kit.group.add(mesh);
  }
  for(const z of [37956,37950,37939,37929]){
    for(const x of [35835.6,35842.6])part(x,z,.13,1.07,.15,0x846e52);
    part(35835.6,z-.55,.10,.10,1.46,0xa07d54,.74);
  }
  // Unnamed construction supplies and a simple crossing plank group.
  for(let j=0;j<5;j++)part(35838.8,37947+j*.24,2.55,.11,.20,0xa18b67,.36);
  for(let j=0;j<5;j++)for(let i=0;i<3;i++)part(35847+j*.40,37955-i*.32,.36,.15,.30,0xa36f52,.07+i*.12);
  for(const [x,z] of [[35852,37945],[35849,37947.45],[35852.4,37944.9]] as const)
    part(x,z,.68,.92,.68,0x7f8067,0,0,'round');
  for(let i=0;i<25;i++){
    const q=(i*19%41)/41,p=(i*17%29)/29,k=.19+.42*q;
    part(35830+q*3.9,37958-p*5.5,k,k*.39,k*.88,i%3?0xb3a798:0x968f7e,-.04,p*3,'leaf');
  }
  return kit.finish();
}

function yuminDressing(court:District,at:P,ground:Height,dry:(x:number,z:number)=>boolean){
  const kit=dressing('yumin',at,ground,(x,z)=>inside(court.rect,x,z)&&dry(x,z)),{part}=kit;
  const {buildings}=districtFabric(court,{height:ground,blocked:(x,z)=>!dry(x,z),masks:()=>[]});
  for(const [i,b] of buildings.entries()){
    if(b.arch!=='village_villa')continue;
    const {x,z}=b,front=z+5.98;
    // Put walls behind the existing drain, never across the lane. The
    // opening is left clear even when viewed from the bank.
    for(const dx of [-2.76,2.6])part(x+dx,front,2.9,.53,.19,0xc2b7a0);
    for(const dx of [-1.12,1.12]){
      part(x+dx,front,.23,.77,.26,0xbaae99);
      part(x+dx,front,.36,.065,.36,0xd1c5ad,.76);
    }
    if(i%3===0){
      part(x-3.53,z+5.1,.77,.32,.75,0xb29b7d);
      part(x-3.53,z+5.1,.73,.61,.66,0x75845b,.27,0,'leaf');
      part(x-3.54,z+5.24,.36,.24,.35,0xa16155,.72,0,'leaf');
    }
  }
  return kit.finish();
}
