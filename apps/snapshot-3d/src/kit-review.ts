// An unlocated sample parcel per card, drawn through the same instanced meshes as a streamed tile.
import * as T from 'three';
import {ARCH, settlement, type SettlementKit} from './procgen/fabric';
import {poly} from './procgen/geom';
import {buildingMeshes,buildingParts,fabricResources} from './procgen/mesh';
import {facadeTextures} from './procgen/textures';

const samples: [SettlementKit,string][] = [
  ['standard_factory','Standard factory · 标准厂房'],['factory_hall','Wide-span factory hall · 大跨厂房'],
  ['early_highrise','Early high-rise · 早期高层'],['tower_works','High-rise under construction · 高层施工阶段'],
  ['worker_dorm','Worker dormitory · 工人宿舍'],['estate_slab','Walk-up housing estate · 多层住宅组团'],
  ['lingnan_block','Arcaded shopfront · 骑楼店面'],
  ['village_villa','Two-storey village house · 村居小楼'],['danwei_slab','Reference: walk-up slab · 参照：单位住宅'],
];
const renderer=new T.WebGLRenderer({antialias:true}), res=fabricResources(facadeTextures());
renderer.shadowMap.enabled=true;
const scene=new T.Scene(); scene.background=new T.Color('#e4e4d7');
scene.add(new T.HemisphereLight(0xfff9ed,0xc8c4a8,2));
const sun=new T.DirectionalLight(0xfff6df,2); sun.position.set(-50,90,60); sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-65,right:65,top:80,bottom:-65}); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.mapSize.set(1024,1024); sun.shadow.normalBias=.05; scene.add(sun);
const plane=new T.Mesh(new T.PlaneGeometry(1000,1000),new T.MeshLambertMaterial({color:0xd1cfbb}));
plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;scene.add(plane);
const grid=new T.GridHelper(480,48,0xa8ac9c,0xbabdad);grid.position.y=.02;scene.add(grid);
const field=document.querySelector('section')!,angle=document.querySelector<HTMLInputElement>('#angle')!,
  parcel=document.querySelector<HTMLInputElement>('#parcel')!;
const cards=samples.map(([kit,title])=>{
  const area={id:'kit-review',poly:poly([[[0,0],[64,0],[64,64],[0,64]]])};
  const {buildings}=settlement(area,0,{parcel:64,lane:4,mix:{[kit]:1}},
    {height:()=>0,blocked:()=>false,masks:()=>[]},'sample-parcel');
   const first=buildings.find(b=>b.arcade)??buildings[0]!;
   const groups=[[first],buildings].map((bs,i)=>{
    const group=new T.Group(); group.add(...buildingMeshes(buildingParts(bs),res));
    group.position.set(i?-32:-first.x,0,i?-32:-first.z);return group;
  });
  const card=document.createElement('article'), canvas=document.createElement('canvas'), label=document.createElement('h2'),
    meta=document.createElement('small');label.textContent=title;
  meta.textContent=`${first.floors} F / 层 · ${(first.floors*ARCH[first.arch].storey).toFixed(1)} m · ${first.w.toFixed(1)} × ${first.d.toFixed(1)} m`;
  card.append(canvas,label,meta);field.append(card);
  return {canvas,groups};
});
function draw(){
  const a=Number(angle.value)*Math.PI/180;
  const camera=new T.OrthographicCamera(-56,56,37.33,-37.33,1,500);
  camera.position.set(140*Math.sin(a),75,140*Math.cos(a));camera.lookAt(0,24,0);
  for(const {canvas,groups} of cards){
    const w=Math.round(canvas.clientWidth*Math.min(devicePixelRatio,2)), h=Math.round(w/1.5);
    canvas.width=w;canvas.height=h;renderer.setSize(w,h,false);
    const group=groups[parcel.checked?1:0]!;scene.add(group);renderer.render(scene,camera);
    canvas.getContext('2d')!.drawImage(renderer.domElement,0,0);scene.remove(group);
  }
}
angle.oninput=parcel.onchange=draw;new ResizeObserver(draw).observe(field);draw();
