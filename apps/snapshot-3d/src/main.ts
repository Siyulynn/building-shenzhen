/// <reference types="vite/client" />
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {decode,ground,utm,type Meta} from './grid';
import {buildTerrain,terrainTexture} from './terrain';
import {assemble,epochs,focuses,layouts,models,origin,type Site} from './assembly';
import {bytes,json} from './io';
import {coreCells, cropUv, type Kh9Meta} from './core';
import {makeObservationOverlay, observations, observationColors, photoToWorld, placementLabels, type PhotoPlace} from './kh9-observations';
import {basinGround,planBasin, type BasinRenderPlan, type GenCfg} from './procgen/plan';
import {buildScene, type BasinScene} from './procgen/mesh';
import {facadeTextures} from './procgen/textures';
import {readRelief, type ReliefPatch} from './procgen/ground';
import {toWorld,type RawMap} from './procgen/gis';
import {buildMunicipal, dryAt, municipalTexture, overviewHeight, planMunicipal, validateMunicipal, type MunicipalMap, type MunicipalPlan} from './procgen/municipal-lod0';
import {createStreamer} from './procgen/streamer';
import {neighbourhood,pilotSelection,tileKey,tileOf,TileCutouts} from './procgen/tiles';
import {buildShenzhenxu,crossroads,postcardViewport,shenzhenxu,shenzhenxuState} from './shenzhenxu';
import {deltaLabels,deriveEpoch,epochEntries,epochRegister,modelTints,type BuiltDate,type EpochModel} from './epochs';
import {districtTints} from './procgen/districts';
import {comparisonDate,comparisonShortcut,dateLabels} from './comparison';
import {isStreetId,streetClaims,streetEntries,streetLayout,streetStudies,type StreetId} from './street-studies';
import {applyStageB,previewGround,shennanViews,stageBRegister} from './stage-b';
import {layoutBuildingLabels} from './building-labels';
import basinMap from '../core-basin-gis.json';
import basinCfg from '../basin-gen.json';
import './style.css';

const el=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const elem=(tag:string,txt:string)=>{const e=document.createElement(tag);e.textContent=txt;return e;};
const isPhotoLayer=(key:string)=>key==='kh9' || key==='kh9-core';
type Citation={status:string;source?:string;url?:string;locator?:string};
type Vignette={id:'shenzhenxu';mode:'street'|'aerial'}|{id:StreetId;mode:'street'};
type LegendItem=[color:string,label:string,mark?:'line'|'dash'|'band'|'proxy'];
async function start(){
  const params=new URLSearchParams(location.search);
  const showStageB=params.get('stageb')!=='0';
  const [meta,raw,water,change,sitesData,citations,reliefInput]=await Promise.all([
    json<Meta>('meta.json'),bytes('grid.bin'),bytes('water1979.bin'),bytes('change_79_84.bin'),
    json<{sites:Site[]}>('sites.json'),json<Record<string,Citation>>('citations.json'),
    json<ReliefPatch>('core-relief.json').then(patch=>({patch,relief:readRelief(patch)})).catch(()=>undefined)
  ]);
  const g=decode(meta,raw,water,change),sites=sitesData.sites,cell=g.meta.cell_m;
  const coreMap=basinMap as unknown as RawMap, junction=crossroads(coreMap);
  const cfg=basinCfg as unknown as GenCfg, relief=reliefInput?.relief;
  const municipalInput=await Promise.all([json<MunicipalMap>('municipal-gis.json'),bytes('municipal-water.bin')])
    .then(([doc,bin])=>{
      const classes=new Uint8Array(bin);validateMunicipal(doc,classes,g,coreMap);
      return {doc,classes};
    }).catch(()=>undefined);
  const map=el('map'),focusSelect=el<HTMLSelectElement>('focus'),layerSelect=el<HTMLSelectElement>('layer');
  const traceToggle=el<HTMLInputElement>('core-trace'), placesToggle=el<HTMLInputElement>('show-photo-places');
  const images:Record<string,string>={mss79:'landsat1979.png',mss84:'landsat1984.png'};
  layerSelect.add(new Option('19 Oct 1979 · MSS 影像','mss79'));
  layerSelect.add(new Option('22 Nov 1984 · MSS 影像','mss84'));
  layerSelect.add(new Option('11 Sep 1980 · KH-9 航天影像','kh9'));
  if(import.meta.env.DEV && !window.atlasFiles)
    layerSelect.add(new Option('11 Sep 1980 · KH-9 core at 2 m / 核心区 2 米采样','kh9-core'));
  const scene=new T.Scene(),atlasSky=new T.Color('#e6e9de'),streetSky=new T.Color('#bfcdd0');scene.background=atlasSky;
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.type=T.PCFSoftShadowMap;
  map.prepend(renderer.domElement);
  const camera=new T.OrthographicCamera(-1,1,1,-1,0.5,250000);
  const streetCamera=new T.PerspectiveCamera(43,1,.12,1800);
  const reviewCamera=new T.PerspectiveCamera(53,1,1,28000);
  const controls=new OrbitControls(camera,renderer.domElement);
  renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('aria-label','Atlas map, arrow keys pan · 图集地图，方向键平移');
  controls.listenToKeyEvents(renderer.domElement);
  controls.maxPolarAngle=Math.PI*0.47;controls.minPolarAngle=0.03;
  controls.screenSpacePanning=false;controls.enableDamping=false;
  const ambient=new T.HemisphereLight('#fcf5df','#c1c9b7',1.9);scene.add(ambient);
  const sun=new T.DirectionalLight('#fff2d7',2.05);
  scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=0.3;
  const textures=new Map<string,T.Texture>(), terrainMat=new T.MeshLambertMaterial();
  const fineMat=new T.MeshLambertMaterial(),tileCutouts=new TileCutouts();
  tileCutouts.apply(fineMat,false,true);
  const core=makeObservationOverlay(g);
  core.visible=false;
  scene.add(core);
  const clearToggle=el<HTMLInputElement>('clear-focus');
  const estimates=el<HTMLInputElement>('municipal-estimates');
  const buildingNames=el<HTMLInputElement>('building-names');
  const overlappingNames=el<HTMLInputElement>('overlapping-names');
  const nameDetails=el<HTMLDetailsElement>('building-name-details');
  const photoReview=el<HTMLSelectElement>('photo-review');
  for(const shot of shennanViews)photoReview.add(new Option(`${shot.name.join(' · ')} (${shot.year})`,shot.id));
  let aerial:(typeof shennanViews)[number]|undefined;
  let plan:BasinRenderPlan|undefined, basinScene:BasinScene|undefined, basinKey='', basinTextures:ReturnType<typeof facadeTextures>|undefined;
  let municipalScene:ReturnType<typeof buildMunicipal>|undefined;
  let stageScene:T.Group|undefined, sceneDate:BuiltDate|undefined;
  let reviewRoutes:MunicipalPlan['routes']=[];
  let streamer:ReturnType<typeof createStreamer>|undefined, streaming=false;
  let hero:ReturnType<typeof buildShenzhenxu>|undefined;
  let streetHero:{id:StreetId;detail:ReturnType<NonNullable<ReturnType<typeof streetLayout>['build']>>}|undefined;
  let vignette:Vignette|undefined;
  const layoutsByStreet=new Map<StreetId,ReturnType<typeof streetLayout>>();
  let streamInitMs=0, shadowKey='', framing=false;
  const derived=new Map<BuiltDate,ReturnType<typeof applyStageB>>();
  const localGrades=new Map<BuiltDate,ReturnType<typeof basinGround>['l']>();
  function getEpoch(which=date){
    if(!derived.has(which)){
      const base=deriveEpoch(which,coreMap,cfg,municipalInput?.doc);
      derived.set(which,which==='visit'&&showStageB&&municipalInput?
        applyStageB(base,g,municipalInput.classes,relief):
         {...base,districts:base.districts.filter(d=>!d.designSurface&&(!d.frontage||d.mix)),stageBSites:[],stageBRoads:0,
           januaryDesign:false,anchorAccess:[]});
    }
    return derived.get(which)!;
  }
  function localGrade(which=date){
    if(!localGrades.has(which)){
      const {map,cfg}=getEpoch(which);localGrades.set(which,basinGround(g,map,cfg,relief).l);
    }
    return localGrades.get(which)!.at;
  }
  const getPlan=()=>plan??=planBasin(g,coreMap,cfg,relief);
  function getStreet(id:StreetId){
    if(!layoutsByStreet.has(id)){
      const {models,districts}=getEpoch('visit');
      layoutsByStreet.set(id,streetLayout(id,coreMap,cfg,models,districts));
    }
    return layoutsByStreet.get(id)!;
  }
  const selectedStreet=()=>vignette&&vignette.id!=='shenzhenxu'?vignette.id:undefined;
  const yuminStreet=(id:string|undefined)=>id==='yumin'||id==='yumin-pond';
  const baselineSupported=()=>focus==='core'||!!municipalInput;
  const basinOn=()=>focus==='core'&&layerSelect.value==='base'&&(!!municipalInput||date==='baseline');
  const municipalOn=()=>!!municipalInput&&layerSelect.value==='base';
  const canStream=municipalOn;
  const maskSelection=()=>clearToggle.checked?cfg.masks.filter(m=>
    !(vignette?.id==='shenzhenxu'&&m.id==='shenzhenxu'||yuminStreet(vignette?.id)&&m.id==='yumin')).map(m=>m.id):[];
  function disposeStreet(){
    if(!streetHero)return;
    scene.remove(streetHero.detail.group);streetHero.detail.dispose();streetHero=undefined;
  }
  function syncVignette(){
    if(vignette?.id==='shenzhenxu'&&!hero){
      hero=buildShenzhenxu(junction,localGrade(),date,canStream()||!clearToggle.checked);
      scene.add(hero.group);
    }
    const id=selectedStreet();
    if(streetHero&&streetHero.id!==id)disposeStreet();
    if(id&&date==='visit'&&!streetHero){
      const detail=getStreet(id).build?.(localGrade());
      if(detail){streetHero={id,detail};scene.add(detail.group);}
    }
  }
  function stageModels(patches:EpochModel[]){
    const group=new T.Group(),at=patches.length?localGrade():undefined;
    group.name='authored-epoch-models';
    for(const {id,at:[x,z],parts,coarse:[w,d,h],overviewKit} of patches){
      const fine=models(g,parts.map((p,i)=>({key:id+'/'+i,kind:p.kit,x:x+p.offset[0],z:z+p.offset[1],yaw:p.yaw*Math.PI/180})),at,true);
      fine.name=id;
      const mats=new Set<T.Material>();
      for(const child of fine.children)if(child instanceof T.Mesh)mats.add(child.material as T.Material);
      mats.forEach(m=>tileCutouts.apply(m,false,true));
      let proxy:T.Object3D;
      if(overviewKit){
        proxy=models(g,[{key:id,kind:overviewKit,x,z,yaw:0}],(px,pz)=>overviewHeight(g,px,pz),true);
        const materials=new Set<T.Material>();
        proxy.traverse(child=>{if(child instanceof T.Mesh)materials.add(child.material as T.Material);});
        materials.forEach(m=>tileCutouts.apply(m));
      }else{
        const top=overviewHeight(g,x,z),lo=Math.min(top,...[-1,1].flatMap(a=>[-1,1].map(b=>overviewHeight(g,x+a*w/2,z+b*d/2))))-1;
        const mat=new T.MeshLambertMaterial({color:'#b3a38f'});
        const box=new T.Mesh(new T.BoxGeometry(w,top+h-lo,d),mat);
        box.position.set(x,(lo+top+h)/2,z);proxy=box;
        tileCutouts.apply(mat);
      }
      proxy.name=id+'-overview';
      group.add(proxy,fine);
      stagePairs.push({fine,proxy,tile:tileKey(tileOf(x,z))});
    }
    return group;
  }
  const stagePairs:{fine:T.Group;proxy:T.Object3D;tile:string}[]=[];
  function syncBasin(){
    const regional=canStream();
    const on=basinOn();
    if(!on&&!regional){vignette=undefined;controls.enabled=true;}
    const clear=maskSelection();
    if(sceneDate!==date){
      if(municipalScene){disposeGroup(municipalScene.group,true);municipalScene=undefined;}
      if(stageScene){disposeGroup(stageScene,true);stageScene=undefined;stagePairs.length=0;}
      if(hero){scene.remove(hero.group);hero.dispose();hero=undefined;}
      disposeStreet();
      sceneDate=date;
    }
    syncVignette();
    if(regional&&!municipalScene){
      const {classes}=municipalInput!, {doc,map,models,districts,januaryDesign}=getEpoch();
      const p=planMunicipal(doc!,map,(x,z)=>dryAt(g,classes,x,z),models.map(m=>m.clear),
        [...districtTints(districts),...modelTints(models)],districts,januaryDesign);
      reviewRoutes=p.routes.filter(r=>r.style==='review');
      municipalScene=buildMunicipal(g,p,tileCutouts);scene.add(municipalScene.group);
      if(!textures.has('municipal:'+date))textures.set('municipal:'+date,municipalTexture(g,classes,p));
      stageScene=stageModels(models);scene.add(stageScene);
    }
    if(regional&&fineMat.map!==textures.get('municipal:'+date)){
      fineMat.map=textures.get('municipal:'+date)!;fineMat.needsUpdate=true;
    }
    if(municipalScene){municipalScene.group.visible=regional;municipalScene.estimates(estimates.checked);}
    if(stageScene)stageScene.visible=regional;
    const tex=textures.get(regional?'municipal:'+date:isPhotoLayer(layerSelect.value)?'base':layerSelect.value);
    if(tex&&tex!==terrainMat.map){terrainMat.map=tex;terrainMat.needsUpdate=true;}
    if(layerSelect.value==='base'){
      const items:LegendItem[]=regional?[
        ['#79a5a8','Oct 1979 water · 1979 年 10 月水体'],['#92aeb6','Modern water fallback · 现代水体参考'],
        ['#b49d7f','Mapped road · 底图道路','line'],['#746756','Mapped rail · 底图铁路','line'],
        ...(estimates.checked?[
          ['#bd9067','Estimated route · 估计线路','dash'],['#b67d4e','Rail search band, not track · 铁路待核带，并非轨道','band'],
        ] as LegendItem[]:[]),
        ...(date==='visit'?[
          ['#b3845e','Illustrative works ground · 施工地面示意'],
          ['#b8895e','District / junction proxy · 片区／路口示意','proxy'],
        ] as LegendItem[]:[]),
         ...(date==='visit'&&showStageB?[
           ['#c4b08c','January design: built blocks · 一月设计：建成街区'],
           ['#ad7654','January design: graded works · 一月设计：平整工地'],
           ['#828d59','January design: civic grounds · 一月设计：机关绿地'],
          ...(estimates.checked?[['#8c644f','May map street trace · 五月地图道路描线','dash'] as LegendItem]:[]),
        ] as LegendItem[]:[]),
      ]:[['#77a8ad','Water · 水'],['#92a889','Relief · 地形']];
       setLegend('Relief & built scene · 地形与建成场景',regional?
         getEpoch().januaryDesign?'The 100 m design map guides January land cover. Grades, building layouts and parcel edges are illustrative. 百米设计图指导一月地表。标高、建筑布局和地块边界为示意。':
           'Shared modern relief and water references. Building layouts are illustrative. 各时点共用现代地形及水体参考，建筑布局均为示意。':
        '2011–15 surface relief at 100 m; modern water. 2011–15 年地表高程（100 米）与现代水体。',items);
      el('layer-note').textContent=regional?
        'Modern relief and shared water references; not a historical grade or shoreline. 现代地形和共用水体参考，不代表历史标高或岸线。':'Modern relief and water. 现代地形及水体。';
    }
    el('municipal-option').hidden=!regional;
    el('photo-review-option').hidden=!regional||!showStageB;
    el('clear-focus-option').hidden=!on;
    el('basin-option').hidden=!on;
    const key=regional?'regional:'+date:on?'on:'+clear.join():'off';
    if(key===basinKey)return;
    basinKey=key;
    if(basinScene){scene.remove(basinScene.group);basinScene.dispose();basinScene=undefined;}
    if(streamer){scene.remove(streamer.group);streamer.dispose();streamer=undefined;}
    streaming=false;streamInitMs=0;shadowKey='';tileCutouts.set([]);
    scene.fog=on?new T.Fog('#e6e9de',8000,18000):null;
    if(on&&!regional){
      basinTextures??=facadeTextures();
      basinScene=buildScene(getPlan(),{clear:new Set(clear),textures:basinTextures});
      const instancedMaterials=new Set<T.Material>();
      basinScene.group.traverse(o=>{if(o instanceof T.InstancedMesh)instancedMaterials.add(o.material as T.Material);});
      instancedMaterials.forEach(m=>tileCutouts.apply(m,true,true,true));
      scene.add(basinScene.group);
    }
    refreshTerrain();
  }
  const kh9 = {
    photo:{value:null as T.Texture | null},
    offset:{value:new T.Vector2()},
    scale:{value:new T.Vector2()},
    enabled:{value:false},
  };
  type PhotoTexture={texture:T.Texture;offset:[number,number];scale:[number,number]};
  const photoTextures=new Map<string,Promise<PhotoTexture>>();
  terrainMat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{kh9Photo:kh9.photo,kh9Offset:kh9.offset,kh9Scale:kh9.scale,kh9Enabled:kh9.enabled});
    shader.fragmentShader=`
      uniform sampler2D kh9Photo;
      uniform vec2 kh9Offset, kh9Scale;
      uniform bool kh9Enabled;
    `+shader.fragmentShader.replace('#include <map_fragment>',`
      #include <map_fragment>
      if (kh9Enabled) {
        vec2 p = (vMapUv - kh9Offset) * kh9Scale;
        if (all(greaterThanEqual(p, vec2(0.0))) && all(lessThanEqual(p, vec2(1.0)))) {
          vec4 photo = texture2D(kh9Photo, p);
          diffuseColor.rgb = mix(diffuseColor.rgb, photo.rgb, photo.a);
        }
      }
    `);
  };
  tileCutouts.apply(terrainMat);
  let terrain=new T.Group(),fabric=new T.Group(),focus='city',date:BuiltDate='baseline',span=1,fitCoreWidth=false,fitCityWidth=true,terrainKey='';
  let selectedPlace:PhotoPlace|undefined, previousDate:BuiltDate|undefined;
  const pinDefs:{button:HTMLButtonElement;target:T.Vector3;dx:number;dy:number;street?:boolean}[]=[];
  let buildingPins:{button:HTMLButtonElement;target:T.Vector3;width:number;height:number}[]=[];
  let buildingLines:SVGPathElement|undefined, buildingDots:SVGPathElement|undefined;
  const buildingHud=['map-actions','map-tools','locator','map-legend'].map(id=>el(id));
  const place=(id:string)=>origin(layouts[id]!,sites,cell);
  function focusAt(key:string,anchor:string):[number,number]{
    if(municipalInput&&key==='market')return junction.at;
    const id=key==='yumin'?'yumin-candidate-land':key==='luohu'&&anchor==='tower'?'guomao':undefined;
    if(municipalInput&&id){
      const visit=getEpoch('visit');
      const model=visit.models.find(m=>m.id===id);
      if(model)return model.at;
      const zone=visit.districts.find(z=>z.id.startsWith(id+'/'));
      if(zone){const [l,t,r,b]=zone.rect;return [(l+r)/2,(t+b)/2];}
    }
    return place(anchor);
  }
  const label=(k:string)=>k==='core'?'Core basin · 核心区':focuses[k]!.name.join(' · ');
  // Frame the whole September 1980 base-map window (Shangbu to the eastern uplands), not the older core crop.
  const [bx0,bz0,bx1,bz1]=(()=>{const [w,s,e,n]=basinMap.bounds as number[];return [w!-164450,2533850-n!,e!-164450,2533850-s!];})();
  const coreCentre:[number,number]=[(bx0+bx1)/2,(bz0+bz1)/2];
  const photoCentre=photoToWorld(observations.image.width/2,observations.image.height/2,cell);
  focusSelect.add(new Option(label('core'),'core'));
  for(const k of Object.keys(focuses)) focusSelect.add(new Option(label(k),k));
  function disposeGroup(group:T.Group,disposeMaterials:boolean){
    scene.remove(group);
    const materials=new Set<T.Material>();
    group.traverse(o=>{
      if(o instanceof T.Mesh){o.geometry.dispose();if(o instanceof T.InstancedMesh)o.dispose();
        if(disposeMaterials)materials.add(o.material);}
    });
    materials.forEach(m=>m.dispose());
  }
  function paint(){
    const w=map.clientWidth,h=map.clientHeight;
    if(!w||!h)return;
    const regional=canStream();
    const view=Math.max(camera.top-camera.bottom,(camera.right-camera.left)*.56)/camera.zoom;
    const tiles=regional&&neighbourhood(streaming,view,focus==='core')?pilotSelection(g.meta,camera,controls.target):[];
    streaming=tiles.length>0;
    if(streaming&&!streamer){
      const start=performance.now();
      basinTextures??=facadeTextures();
      const {map,cfg,doc,models,districts,januaryDesign,anchorAccess}=getEpoch();
      streamer=createStreamer({init:{grid:g,map,cfg,patch:reliefInput?.patch,doc:doc!,
        water:municipalInput!.classes,reviewRoutes,track:!!basinTextures.track,reserved:models.map(m=>m.clear),
        groundTints:[...previewGround(doc),...districtTints(districts),...modelTints(models)],districts,januaryDesign,anchorAccess},
        textures:basinTextures,material:fineMat,cutouts:tileCutouts,onFrame:paint});
      scene.add(streamer.group);
      streamInitMs=performance.now()-start;
    }
    streamer?.setClear(maskSelection());
    const xin=vignette?.id==='shenzhenxu', id=selectedStreet(), study=id&&getStreet(id);
    const heroAt=xin?junction.at:study?study.at:undefined;
    const heroTile=heroAt&&tileKey(tileOf(...heroAt));
    const heroRequested=!!(heroAt&&basinOn()&&(xin?hero:regional));
    streamer?.update(tiles,estimates.checked,xin&&heroRequested?junction.clear:undefined);
    const active=streamer?.ready()??[];
    const amounts=new Map(active.map(t=>[tileKey(t.tile),t.detail]));
    for(const {fine,proxy,tile} of stagePairs){
      const amount=amounts.get(tile)??0;fine.visible=amount>0;proxy.visible=amount<1;
      fine.traverse(o=>{if(o instanceof T.InstancedMesh)o.castShadow=amount>=1;});
    }
    // Reveal the infill and hide overlapping fabric in the same frame, after
    // the matching LOD1 grade (and the streets it carries) has fully arrived.
    const showHero=heroRequested&&(!regional||amounts.get(heroTile!)===1);
    // Keep the perspective view while the comparison tile is replaced;
    // don't flash back to the orthographic camera between dates.
    const street=heroRequested&&vignette?.mode==='street';
    const waitingForHero=heroRequested&&!showHero&&(street||tiles.some(t=>tileKey(t)===heroTile));
    const activeCamera=aerial?reviewCamera:street?streetCamera:camera;
    const viewport=aerial?postcardViewport(w,h,1.52):street?postcardViewport(w,h,study?16/9:undefined):[0,0,w,h] as const;
    tileCutouts.setPrototype(xin&&showHero?junction.clear:undefined);
    if(hero)hero.group.visible=xin&&showHero;
    if(streetHero)streetHero.detail.group.visible=id===streetHero.id&&showHero;
    ambient.intensity=showHero?(study?1.7:1.48):1.9;
    scene.background=street?streetSky:atlasSky;
    controls.enabled=!street&&!aerial;
    el('zoom-in').hidden=el('zoom-out').hidden=street||!!aerial;
    el('photo-review-exit').hidden=!aerial;
    el('map-legend').hidden=street||!el('legend-title').textContent;
    tileCutouts.set(active);
    renderer.shadowMap.enabled=showHero||(regional?active.length>0:focus!=='city'&&!kh9.enabled.value);
    renderer.shadowMap.autoUpdate=!regional;
    if(regional){
      if(active.length||showHero){
        scene.fog??=new T.Fog('#e6e9de',8000,18000);
        const r=showHero?(study?study.shadow:68):Math.min(2500,Math.max(600,view*.65));
        const next=[...controls.target.toArray(),r,vignette?.id,vignette?.mode,...active.filter(t=>t.detail>=1).map(t=>tileKey(t.tile))].join('|');
        if(next!==shadowKey){
          shadowKey=next;
          sun.target.position.copy(controls.target);
          sun.position.copy(controls.target).add(new T.Vector3(-.6*r,1.4*r,.82*r));
          Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:4*r});
          sun.shadow.camera.updateProjectionMatrix();
          renderer.shadowMap.needsUpdate=true;
        }
      }else{scene.fog=null;shadowKey='';}
    }
    if(scene.fog instanceof T.Fog){
      const d=camera.position.distanceTo(controls.target), view=(camera.top-camera.bottom)/camera.zoom;
      scene.fog.near=d+view*.4;scene.fog.far=d+view*2.8;
      if(street){[scene.fog.near,scene.fog.far]=study?study.fog:[65,240];}
      if(aerial){scene.fog.near=4200;scene.fog.far=26000;}
      scene.fog.color.copy(street?streetSky:atlasSky);
    }
    if(street){
      streetCamera.aspect=viewport[2]/viewport[3];streetCamera.updateProjectionMatrix();
      renderer.setViewport(viewport[0],viewport[1],viewport[2],viewport[3]);
    }
    if(aerial){
      reviewCamera.aspect=viewport[2]/viewport[3];
      reviewCamera.updateProjectionMatrix();
      renderer.setViewport(viewport[0],viewport[1],viewport[2],viewport[3]);
    }
    renderer.render(scene,activeCamera);
    if(street||aerial)renderer.setViewport(0,0,w,h);
    const hudRects=()=>{
      const bounds=map.getBoundingClientRect();
      return buildingHud.filter(e=>!e.hidden).map(e=>{
        const {left,top,width,height}=e.getBoundingClientRect();
        return {left:left-bounds.left,top:top-bounds.top,width,height};
      });
    };
    const landmarks=pinDefs.flatMap(({button,target,dx,dy,street:streetPin})=>{
      const p=target.clone().project(activeCamera);
      button.hidden=!!streetPin!==street||(street&&!showHero)||!Number.isFinite(p.x)||Math.abs(p.x)>1||Math.abs(p.y)>1||Math.abs(p.z)>1;
      if(button.hidden)return [];
      const x=viewport[0]+viewport[2]*(p.x+1)/2+dx,y=h-viewport[1]-viewport[3]*(p.y+1)/2+dy;
      if(button.classList.contains('landmark-pin'))return [{button,x,y,width:button.offsetWidth,height:button.offsetHeight}];
      button.style.left=`${x}px`;button.style.top=`${y}px`;
      return [];
    });
    const obstacles=landmarks.length||buildingLines?hudRects():[];
    const positioned=layoutBuildingLabels(landmarks,w,h,obstacles,false);
    for(let i=0;i<landmarks.length;i++){
      const {button}=landmarks[i]!, rect=positioned[i];
      button.hidden=!rect;
      if(!rect)continue;
      button.style.left=`${rect.left}px`;button.style.top=`${rect.top}px`;
      obstacles.push(rect);
    }
    if(!street&&buildingLines&&buildingDots){
      const p=new T.Vector3();
      const visible=buildingPins.flatMap(pin=>{
        p.copy(pin.target).project(activeCamera);
        if(!Number.isFinite(p.x)||Math.abs(p.x)>1||Math.abs(p.y)>1||Math.abs(p.z)>1){
          pin.button.hidden=true;
          return [];
        }
        return [{...pin,x:viewport[0]+viewport[2]*(p.x+1)/2,y:h-viewport[1]-viewport[3]*(p.y+1)/2}];
      });
      const layout=layoutBuildingLabels(visible,w,h,obstacles,overlappingNames.checked);
      const lines:string[]=[],dots:string[]=[];
      for(let i=0;i<visible.length;i++){
        const {button,x,y}=visible[i]!,rect=layout[i];
        dots.push(`M${x.toFixed(1)} ${y.toFixed(1)}h.01`);
        button.hidden=!rect;
        if(!rect)continue;
        const {left,top,width,height}=rect;
        button.style.left=`${left}px`;button.style.top=`${top}px`;
        const endX=Math.max(left,Math.min(left+width,x)),endY=Math.max(top,Math.min(top+height,y));
        lines.push(`M${x.toFixed(1)} ${y.toFixed(1)}L${endX.toFixed(1)} ${endY.toFixed(1)}`);
      }
      buildingLines.setAttribute('d',lines.join(''));
      buildingDots.setAttribute('d',dots.join(''));
      const count=el('building-name-count'), extra=visible.length-lines.length;
      const text=extra?`${extra} crowded names shown as dots. Zoom in or show overlapping names. ${extra} 个拥挤地点以圆点表示，可放大或显示重叠名称。`:'';
      if(count.textContent!==text)count.textContent=text;
      count.hidden=!text;
    }
    const mPerPx=(camera.right-camera.left)/(camera.zoom*w);
    const size=10**Math.floor(Math.log10(Math.max(1,mPerPx*85)));
    const metres=[5,2,1].map(v=>v*size).find(v=>v<=mPerPx*85)??size;
    const scale=el('scale');scale.hidden=street||!!aerial;scale.style.width=(metres/mPerPx)+'px';
    scale.textContent=metres>=1000?(metres/1000)+' km':metres+' m';
    const tileCount=streamer?.settled()??0;
    const status=streamer?.status()??'idle';
    const streetStatus=el('street-status');
    streetStatus.hidden=!(street&&waitingForHero);
    const waiting=status==='failed'?'Street detail unavailable · 无法加载街景细部':'Preparing the same street view… · 正在准备同一视角…';
    if(!streetStatus.hidden&&streetStatus.textContent!==waiting)streetStatus.textContent=waiting;
    el('metrics').textContent=renderer.info.render.calls+' draw calls · 绘制调用'+
      (showHero?'　LOD2 · 精模':streaming?(status==='failed'?'　Detail unavailable · 街区无法加载':
         status==='ready'&&!waitingForHero?`　${tileCount}/${streamer!.wanted()} tiles · 分块`:'　Preparing detail · 正在准备街区'):'');
    el('metrics').dataset.cached=String(streamer?.count()??0);
    el('metrics').dataset.lod=showHero?'2':regional?(streaming?'1':'0'):'legacy';
    el('metrics').dataset.lod2View=showHero?vignette!.mode:'';
    el('metrics').dataset.vignette=vignette?.id??'';
    el('metrics').dataset.photoReview=aerial?.id??'';
    el('metrics').dataset.streetDressing=streetHero?.detail.group.visible?streetHero.id:'';
    el('metrics').dataset.cameraPose=[...activeCamera.position.toArray(),...activeCamera.quaternion.toArray(),activeCamera.zoom].join(',');
    el('metrics').dataset.epoch=date;
    el('metrics').dataset.ready=String(tileCount);
    el('metrics').dataset.activeTiles=active.map(t=>tileKey(t.tile)).join(' ');
    el('metrics').dataset.fading=String(active.filter(t=>t.detail<1).length);
    el('metrics').dataset.wanted=String(streamer?.wanted()??0);
    el('metrics').dataset.tileBuildMs=(streamer?.peakBuildMs()??0).toFixed(1);
    el('metrics').dataset.tileAttachMs=(streamer?.peakAttachMs()??0).toFixed(1);
    el('metrics').dataset.workerConfigMs=(streamer?.configMs()??0).toFixed(1);
    el('metrics').dataset.tileMode=streamer?.mode()??'';
    el('metrics').dataset.streamInitMs=streamInitMs.toFixed(1);
    el('metrics').dataset.planStatus=status;
    el('metrics').dataset.geometries=String(renderer.info.memory.geometries);
  }
  function resize(){
    const w=map.clientWidth,h=map.clientHeight,aspect=w/Math.max(1,h);
    // Fit the long axis of the regional sheet even on a portrait display.
    const view=fitCityWidth?Math.max(span,101000/aspect):fitCoreWidth?Math.max(span,(bx1-bx0+300)/aspect):span;
    camera.left=-view*aspect/2;camera.right=-camera.left;camera.top=view/2;camera.bottom=-camera.top;
    camera.updateProjectionMatrix();renderer.setSize(w,h,false);paint();
  }
  function frame(at?:[number,number],size?:number,keepPhotoReview=false){
    if(aerial&&!keepPhotoReview){
      setPhotoReview();pins();viewName();
    }
    framing=true;
    const city=focus==='city',f=focuses[focus];
    const corridor=focus==='luohu' && !at;
    fitCoreWidth=focus==='core' && !at;
    fitCityWidth=city&&!at;
    const [x,z]=at??(city?[(meta.width-1)*cell/2,(meta.height-1)*cell/2]:
      focus==='core'?(kh9.enabled.value?photoCentre:coreCentre):corridor?place('station'):focusAt(focus,f!.anchor));
    span=size??(city?64000:focus==='core'?(kh9.enabled.value?3500:3200):corridor?1850:f!.range);
    const y=ground(g,x,z);
    controls.target.set(x,y,z);
    if(city)camera.position.set(x,y+span*1.33,z+span*.77);
    else if(kh9.enabled.value)camera.position.set(x,y+span*1.65,z+span*0.051);
    else if(focus==='core')camera.position.set(x+span*0.12,y+span*0.92,z+span*0.74);
    else camera.position.set(x+span*0.65,y+span*0.8,z+span*0.93);
    camera.zoom=1;controls.minZoom=city?0.75:0.3;controls.maxZoom=city&&municipalInput?40:city?5:12;
    const lightRange=city?60000:Math.max(650,span);
    sun.position.set(x-lightRange*0.6,y+lightRange*1.4,z+lightRange*0.82);
    sun.target.position.set(x,y,z);
    Object.assign(sun.shadow.camera,{left:-lightRange,right:lightRange,top:lightRange,bottom:-lightRange,near:1,far:lightRange*4});
    sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.enabled=!city&&!kh9.enabled.value;
    controls.update();framing=false;resize();
  }
  function enterVignette(next:Vignette){
    if(next.id!=='shenzhenxu'?!municipalOn():!(municipalOn()||basinOn()))return;
    setPhotoReview();
    vignette=next;
    focus=focusSelect.value='core';
    syncBasin();
    const study=next.id==='shenzhenxu'?undefined:getStreet(next.id);
    const pose=study?study.camera(localGrade('visit')):hero!.camera();
    streetCamera.position.copy(pose.eye);streetCamera.fov=pose.fov;streetCamera.lookAt(pose.look);
    pins();frame(study?.at??junction.at,study?.span??180);
    updateAssembly();
    renderer.domElement.focus({preventScroll:true});
  }
  function exitVignette(){
    if(!vignette)return;
    const id=selectedStreet(),study=id?getStreet(id):undefined;
    vignette=undefined;controls.enabled=true;
    syncBasin();pins();
    frame(study?.at??junction.at,study?.returnSpan??520);
    updateAssembly();
    if(id&&date==='visit')el((yuminStreet(id)?'yumin':id)+'-street').focus();
    else if(!id)el('shenzhenxu-street').focus();
    else renderer.domElement.focus();
  }
  function setPhotoReview(shot?:(typeof shennanViews)[number]){
    aerial=shot;
    photoReview.value=shot?.id??'';
    el('photo-review-note').hidden=!shot;
    const meta=el('photo-review-meta');
    meta.hidden=!shot;
    if(shot){
      const source=el<HTMLAnchorElement>('photo-review-source');
      source.href=`http://www.szlzp.com/${shot.page}`;
      source.target='_blank';source.rel='noopener';
      source.textContent=`Source photo · 原照片 ${shot.image}`;
      const year=shot.year==='undated'?'Undated caption · 目录未注年份':`${shot.year}`;
      meta.textContent=`${year} · ${shot.mode==='camera'?'comparison camera':'locality frame'} · ${shot.confidence} confidence — ${shot.reading}`;
    }
  }
  function enterPhotoReview(id:string){
    const shot=shennanViews.find(view=>view.id===id);
    if(!shot){selectFocus(focus);return;}
    if(!municipalOn()||!showStageB)return;
    vignette=undefined;
    setPhotoReview(shot);
    focus=focusSelect.value='core';
    const target=toWorld(shot.mode==='camera'?shot.look!:shot.target);
    if(shot.eye&&shot.look){
      const eye=toWorld(shot.eye);
      reviewCamera.fov=shot.fov;
      reviewCamera.position.set(eye[0],ground(g,...eye)+shot.eye[2]!,eye[1]);
      reviewCamera.lookAt(target[0],ground(g,...target)+(shot.look[2]??0),target[1]);
      syncBasin();pins();frame(target,shot.span,true);
    }else{
      syncBasin();pins();frame(target,shot.span);
    }
    updateAssembly();
  }
  function addButton(host:HTMLElement,name:string,click:()=>void){
    const b=elem('button',name) as HTMLButtonElement;b.onclick=click;host.append(b);return b;
  }
  function placeInfo(place?:PhotoPlace){
    const info=el('photo-place-info');info.replaceChildren();
    if(!place){
      info.append(elem('p','Select a number or find a place. Pins locate candidates, not surveyed footprints. 点击编号或查找地点。定位不是实测轮廓。'));
      return;
    }
    info.append(elem('strong',place.name.join(' · ')),Object.assign(elem('p',placementLabels[place.basis]!.join(' · ')),{className:'placement'}),
      elem('p',place.note[0]!),Object.assign(elem('p',place.note[1]!),{className:'zh'}));
    for(const id of place.claims){
      const c=citations[id];
      if(!c)throw Error('Missing evidence: '+id);
      const a=elem('a',c.source??id) as HTMLAnchorElement;
      if(c.url && /^https?:\/\//.test(c.url)){a.href=c.url;a.target='_blank';a.rel='noopener';}
      a.title=`${id} [${c.status}] ${c.locator??''}`;
      const p=elem('p','');p.append(a);info.append(p);
    }
  }
  function inspectPlace(place:PhotoPlace){
    if(focus==='city') selectFocus('core');
    selectedPlace=place;placeInfo(place);pins();
    frame(photoToWorld(place.at[0]!,place.at[1]!,cell),place.basis==='context'?820:620);
  }
  const index=el('photo-place-index');
  for(const [i,place] of observations.places.entries()){
    const b=addButton(index,`${i+1}. ${place.name.join(' · ')}`,()=>inspectPlace(place));
    b.dataset.place=place.id;b.title=placementLabels[place.basis]!.join(' · ');
    b.style.setProperty('--pin-color',observationColors[place.kind]!);
  }
  placeInfo();
  function epochTargets(){
    const {models,districts}=getEpoch();
    return epochEntries(date).flatMap(({id,name,state})=>{
      const model=models.find(m=>m.id===id);
      if(model)return [{id,name,at:model.at,span:480,proxy:state.status==='proxy'}];
      const rects=districts.filter(d=>d.id.startsWith(id+'/')).map(d=>d.rect);
      if(rects.length&&state.status==='proxy'){
        const l=Math.min(...rects.map(r=>r[0])),t=Math.min(...rects.map(r=>r[1])),
          r=Math.max(...rects.map(r=>r[2])),b=Math.max(...rects.map(r=>r[3]));
        const at:[number,number]=[(l+r)/2,(t+b)/2];
        return [{id,name,at,span:Math.max(id==='yumin-candidate-land'?350:550,(r-l)*.75,b-t)*1.18,proxy:true}];
      }
      return [];
    });
  }
  function pins(){
    pinDefs.length=0;const host=el('pins');host.replaceChildren();
    buildingPins=[];buildingLines=buildingDots=undefined;
    const namedView=showStageB&&municipalOn()&&date==='visit'&&!vignette;
    el('building-names-option').hidden=!namedView;
    nameDetails.hidden=!buildingNames.checked;
    if(namedView&&buildingNames.checked){
      const epoch=getEpoch(), authored=new Map(epochTargets().map(site=>[site.id,site.at]));
      const svgNs='http://www.w3.org/2000/svg';
      const svg=document.createElementNS(svgNs,'svg');
      svg.classList.add('building-leaders');svg.setAttribute('aria-hidden','true');
      buildingLines=document.createElementNS(svgNs,'path');
      buildingDots=document.createElementNS(svgNs,'path');
      buildingDots.classList.add('building-dots');
      svg.append(buildingLines,buildingDots);host.append(svg);
      const index=el('building-name-index');index.replaceChildren();
      const atGrade=localGrade();
      const labels=epoch.stageBSites.flatMap(site=>{
        const at=site.world??(site.existing?authored.get(site.existing):undefined)??(site.at?toWorld(site.at):undefined);
        if(!at)return [];
        const name=`${site.name.en} · ${site.name.zh}`;
        const reference=!(site.plotted||site.mode==='existing');
        return [{id:site.id,name,at,reference}];
      });
      el('building-name-summary').textContent=`All ${labels.length} located sites · 全部 ${labels.length} 个已定位地点`;
      const buttons=labels.map(({id,name,at,reference})=>{
        const zoom=()=>frame(at,360);
        const title=reference?`${name} — location only · 仅标地点`:name;
        const button=addButton(host,name,zoom);
        button.className='building-pin';button.dataset.building=id;button.title=title;
        const target=new T.Vector3(at[0],atGrade(...at)+1,at[1]);
        const entry=addButton(index,name,zoom);
        entry.title=title;
        if(reference){button.classList.add('building-reference');entry.classList.add('building-reference');}
        return {button,target};
      });
      buildingPins=buttons.map(({button,target})=>({button,target,width:button.offsetWidth,height:button.offsetHeight}));
      return;
    }
    const street=selectedStreet();
    if(street){
      if(date==='visit'){
        const at=localGrade();
        for(const {id,label:name,at:[x,z],height:h,proxy} of getStreet(street).guides??[]){
          const button=addButton(host,name,()=>{
            el<HTMLDetailsElement>('citations').open=true;
            el('evidence-'+id).scrollIntoView({block:'nearest'});
          });
           button.className='street-pin landmark-pin';button.dataset.landmark=id;
          if(proxy)button.classList.add('proxy-pin');
          pinDefs.push({button,target:new T.Vector3(x,at(x,z)+h,z),dx:0,dy:0,street:true});
        }
      }
      return;
    }
    if(kh9.enabled.value && focus!=='city'){
      if(!placesToggle.checked)return;
      for(const [i,place] of observations.places.entries()){
        const [x,z]=photoToWorld(place.at[0]!,place.at[1]!,cell);
        const name=place.name.join(' · '), active=place.id===selectedPlace?.id;
        const button=addButton(host,active?name:String(i+1),()=>inspectPlace(place));
        button.className='photo-pin';
        button.dataset.place=place.id;button.dataset.basis=place.basis;
        button.title=`${name} — ${placementLabels[place.basis]!.join(' · ')}`;
        button.setAttribute('aria-label',button.title);
        button.setAttribute('aria-pressed',String(active));
        button.style.setProperty('--pin-color',observationColors[place.kind]!);
        pinDefs.push({button,target:new T.Vector3(x,ground(g,x,z),z),dx:0,dy:0});
      }
      return;
    }
    if(focus!=='city'){
      if(municipalOn()&&!vignette&&date==='visit'){
        const labels:Record<string,string>={
          guoshang:'Guoshang · 国商（示意）','electronics-building':'Electronics Bldg · 电子大厦（示意）',
          'bagualing-earthworks':'Bagualing works · 八卦岭土方（示意）',
          'lizhi-orchard':'Lizhi Park · 荔枝公园（示意）',
        };
        if(aerial?.id==='guomao')labels.guomao='Guomao works · 国贸施工';
        for(const {id,name,at,span} of epochTargets().filter(p=>p.id in labels)){
          const [x,z]=at;
          const button=addButton(host,labels[id]!,()=>frame(at,span));
          button.className='proxy-pin landmark-pin';button.dataset.epochProxy=id;button.title=`${name.en} · ${name.zh}`;
          const top=id==='guomao'?70:id==='guoshang'?58:id==='electronics-building'?38:id==='lizhi-orchard'?14:1;
          pinDefs.push({button,target:new T.Vector3(x,ground(g,x,z)+top,z),dx:0,dy:-12});
        }
      }
      return;
    }
    // A regional label opens a close view. The full index includes each nearby settlement.
    for(const [key,text,dx,dy] of [[municipalOn()?'core':'market',municipalOn()?'Core basin · 核心区':'Luohu · 罗湖',39,-13],['shangbu','Shangbu · 上步',-17,-47],
      ['nantou','Nantou · 南头',-9,-16],['shekou','Shekou · 蛇口',0,21]] as const){
      const [x,z]=key==='core'?coreCentre:place(focuses[key]!.anchor);
      pinDefs.push({button:addButton(host,text,()=>selectFocus(key)),target:new T.Vector3(x,ground(g,x,z),z),dx,dy});
    }
  }
  function selectFocus(key:string){
    setPhotoReview();
    vignette=undefined;controls.enabled=true;
    focus=key;focusSelect.value=key;
    syncBasin();refreshTerrain();
    if(kh9.enabled.value)surfaceLegend(layerSelect.value);
    pins();updateAssembly();frame();
  }
  function refreshTerrain(){
    const regional=canStream();
    const p=regional||focus==='city'?undefined:(focus==='core'?coreCentre:place(focuses[focus]!.anchor)).map(v=>Math.round(v/cell)) as [number,number];
    const b=basinOn()&&!regional?getPlan():undefined;
    const key=regional?'regional':focus+(b?':basin':'');
    if(key===terrainKey)return;
    terrainKey=key;disposeGroup(terrain,false);
    // With the basin on, the full-resolution patch also covers the reservoir and leaves an exact hole for the lattice.
    const [c0,r0,c1,r1]=b?b.lattice.cells:[0,0,0,0], res=(basinCfg.reservoir.search_cells) as number[];
    terrain=buildTerrain(g,terrainMat,p,b?{left:Math.min(c0,res[0]!),top:Math.min(r0,res[1]!),right:Math.max(c1,res[2]!),bottom:Math.max(r1,res[3]!)}:undefined,
      b?{left:c0,top:r0,right:c1,bottom:r1}:undefined);
    scene.add(terrain);
  }
  function viewName(){
    const name=focus==='city'?'Shenzhen · 深圳':label(focus);
    const epoch=dateLabels[date];
    const surface=layerSelect.value;
    const text=aerial?`${aerial.name.join(' · ')}　${epoch}`:
      vignette?`${(vignette.id==='shenzhenxu'?shenzhenxu:streetStudies[vignette.id]).name.join(' · ')}　${epoch}`:
      kh9.enabled.value?`${name}　KH-9 · 1980-09-11`:
      surface!=='base'?`${name}　${['mss79','oct79'].includes(surface)?'Oct 1979 · 1979 年 10 月':'Nov 1984 · 1984 年 11 月'}`:
      `${name}　${epoch}`;
    const view=el('view-name');
    if(view.textContent!==text)view.textContent=text;
  }
  const canPick=(k:BuiltDate)=>k===date||k!=='baseline'||baselineSupported();
  function syncDates(){
    document.querySelectorAll<HTMLButtonElement>('[data-date]').forEach(b=>{
      const k=b.dataset.date as BuiltDate;
      b.setAttribute('aria-pressed',String(k===date));
      b.disabled=!canPick(k);
    });
    const other=comparisonDate(date,previousDate);
    const flip=el<HTMLButtonElement>('epoch-flip');
    flip.disabled=!canPick(other);
    flip.title=layerSelect.value==='base'?`Same camera → ${dateLabels[other]} [F]`:
      `Built snapshot only; imagery unchanged · 仅切换建成时点，影像不变 [F]`;
    el('flip-label').textContent=`Flip to ${other==='opening'?1979:other==='baseline'?1980:1984} · 切换时点`;
  }
  function updateAssembly(){
    const coreKeys=['market','luohu','yumin'];
    const fs=focus==='city'?Object.values(focuses):focus==='core'?coreKeys.map(k=>focuses[k]!):[focuses[focus]!];
    const built=basinOn()||municipalOn(), fallback=date!=='baseline'&&layerSelect.value==='base'&&!built;
    // Keep old stand-alone study kits as a fallback only, never over the derived atlas.
    const legacyDate=date==='baseline'?undefined:date;
    const names=fallback&&legacyDate?Object.values(focuses).flatMap(f=>f.epochs[legacyDate]):[];
    disposeGroup(fabric,true);fabric=models(g,assemble(names,sites,cell));scene.add(fabric);
    syncDates();
    viewName();
    const xuView=vignette?.id==='shenzhenxu',street=selectedStreet(),study=street?streetStudies[street]:undefined;
    el('heading').textContent=study?study.name.join(' · '):xuView?shenzhenxu.name.join(' · '):focus==='city'?'Municipality · 全市':label(focus);
    el('nav-hint').textContent=vignette?.mode==='street'?
      'Fixed street camera · 固定街景视角　 Esc: return to map · 返回地图':
      'Drag to orbit · 拖动旋转　 Shift + drag or arrow keys to pan · 平移　 Scroll to zoom · 滚轮缩放';
    el('basin-option').hidden=!!vignette||layerSelect.value!=='base'||focus!=='core';
    el('shenzhenxu-option').hidden=!!study||!(municipalOn()||basinOn());
    el('shenzhenxu-aerial').hidden=!xuView;
    el('shenzhenxu-exit').hidden=!xuView;
    el('shenzhenxu-street').setAttribute('aria-pressed',String(xuView&&vignette?.mode==='street'));
    el('shenzhenxu-aerial').setAttribute('aria-pressed',String(xuView&&vignette?.mode==='aerial'));
    for(const id of streetEntries)el(id+'-street').hidden=!!vignette||!municipalOn()||date!=='visit';
    el('street-exit').hidden=!vignette;
    const desc=el('description'),detail=el('detail');desc.replaceChildren();detail.replaceChildren();
    const xu=shenzhenxuState(date);
    const note=study?Object.values(date==='visit'?study.note:study.comparison):
      xuView?xu.note?[xu.note.en,xu.note.zh]:
       ['A short frontage study anchored to two September street traces. R01 informs the corner and arcades but has no confirmed capture date. No shop identities or historic grades are assigned.','以九月影像的两条街道描绘为定位依据。转角和骑楼构图参考 R01，但拍摄日期未确认。不标定商铺身份或历史标高。']
       :layerSelect.value!=='base'?['The built snapshot is hidden while you inspect the dated surface. Select relief to return to the selected built date.','查看此定年地表图层时隐藏三维场景。切回地形底图可返回所选建成时点。']
       :built&&date!=='baseline'?[epochRegister.dates[date].note.en,epochRegister.dates[date].note.zh]
       :municipalOn()?['Zoom in along the west or north pilot corridor, or choose a pilot camera below. Elsewhere the atlas stays in the municipal overview. Building shapes are illustrative; warmer ribbons mark estimated routes and wide dashed bands mark unresolved rail.','沿西部或北部试点走廊放大，或选择下方试点视角。其他地区保留市域远景。建筑为示意模型；暖色带为估计线路，宽虚线带为待核铁路。']
      :focus==='city'?['The grid covers the municipality. The 1979 and January 1984 models are still limited to six illustrative study locations.','地形覆盖全市。1979 年初及 1984 年 1 月模型仍仅覆盖六处示意组景。']
       :date==='baseline'?['Procedural September 1980 baseline from Shangbu to the eastern uplands. Cover envelopes, alignments and crossings come from the KH-9 base map; every building, plot, tree, width and bridge structure is illustrative.','上步至东部丘陵的 1980 年 9 月程序化基准。地类范围、线位与交叉取自 KH-9 底图；建筑、田块、树木、宽度及桥梁结构均为示意。']
      :focus==='core'?['Read Shenzhenxu, Luohu/Guomao and Yumin in the same view. The optional sketch traces features on the September 1980 image, not the selected built snapshot.','同一视图查看深圳墟、罗湖国贸与渔民村。可选草图依据 1980 年 9 月影像，不代表当前建成时点。']:focuses[focus]!.notes;
    desc.append(elem('p',note[0]!),Object.assign(elem('p',note[1]!),{className:'zh'}));
    detail.append(Object.assign(elem('p','Illustrative massing · 布局、体量及数量均为示意'),{className:'inference'}));
    if(yuminStreet(street)){
      const other=street==='yumin'?'yumin-pond':'yumin';
      const b=addButton(detail,streetStudies[other].name.join(' · '),()=>enterVignette({id:other,mode:'street'}));
      b.dataset.streetAlternate=other;
    }else if(!study&&focus==='city'){
      const nav=elem('div','');nav.className='places';
      for(const k of ['core',...Object.keys(focuses)])addButton(nav,label(k),()=>selectFocus(k));
      if(municipalOn()){
        addButton(nav,'West corridor · 西部走廊',()=>frame([26800,37900],11200));
        addButton(nav,'North corridor · 北部走廊',()=>frame([38800,32900],12700));
        addButton(nav,'Shangbu–Futian seam · 上步—福田衔接',()=>frame([34350,38200],2900));
        addButton(nav,'Nantou neighbourhood · 南头街区',()=>frame([18500,37500],2700));
        addButton(nav,'Shekou neighbourhood · 蛇口街区',()=>frame([19000,43700],2700));
        addButton(nav,'Sungang neighbourhood · 笋岗街区',()=>frame([38300,35100],2700));
        addButton(nav,'Buji approach · 布吉引道',()=>frame([38900,31400],2850));
      }
      detail.append(nav);
    } else if(!study&&focus==='core'){
      for(const k of coreKeys)addButton(detail,label(k),()=>selectFocus(k));
    } else if(focus==='luohu'){
      for(const [key,name] of [['tower','Guomao site · 国贸地段'],['station','Station · 车站'],['crossing','Crossing · 口岸']] as const)
        addButton(detail,name,()=>frame(focusAt('luohu',key),280));
    }
    const e=el('evidence');e.replaceChildren();
    const appendClaims=(host:HTMLElement,ids:string[])=>{
      for(const id of ids){
        const c=citations[id], a=elem('a',c?.source??id) as HTMLAnchorElement;
        if(c?.url&&/^https?:\/\//.test(c.url)){a.href=c.url;a.target='_blank';a.rel='noopener';}
        a.title=`${id} [${c?.status??'not packaged'}] ${c?.locator??''}`;const p=elem('p','');p.append(a);host.append(p);
      }
    };
    if(street){
      if(date==='visit')for(const {id,name,state,claims} of streetClaims(street)){
        const section=elem('section','');section.id='evidence-'+id;
        section.append(elem('strong',`${name.en} · ${name.zh}`),elem('p',deltaLabels[state.status]),
          elem('p',state.note.en),elem('p',state.note.zh));
        appendClaims(section,claims);e.append(section);
      }else e.append(elem('p','January evidence applies to the January study only. 一月资料仅用于一月街景。'));
      paint();return;
    }
    if(xuView){
      const [east,north]=utm(meta,...junction.at);
      e.append(elem('p',`Candidate junction · 候选路口：UTM 50N ${east} E / ${north} N`));
      if(date==='baseline')e.append(elem('p','A published 1980 caption could not be matched to R01. The two bookends use a separate, unnamed frontage model. 出版物的 1980 年题注尚未与 R01 核对；前后两个时点另用无名街屋模型。'));
      for(const id of xu.claims){
        const c=citations[id], section=elem('section','');
        const a=elem('a',c?.source??id) as HTMLAnchorElement;
        if(c?.url&&/^https?:\/\//.test(c.url)){a.href=c.url;a.target='_blank';a.rel='noopener';}
        section.append(elem('strong',`${id} [${c?.status??'not packaged'}]`),elem('br',''),a,elem('p',c?.locator??''));
        e.append(section);
      }
      paint();return;
    }
    if(built&&date!=='baseline'){
      const {context,dates}=epochRegister, selected=dates[date];
      e.append(elem('p',`Cutoff · 截止日期：${selected.cutoff}`),elem('p',context.note.en),elem('p',context.note.zh));
      appendClaims(e,[...selected.claims,...context.claims]);
      for(const {name,state,claims} of epochEntries(date)){
        const section=elem('section','');
        section.append(elem('strong',`${name.en} · ${name.zh}`),elem('p',deltaLabels[state.status]),
          elem('p',state.note.en),elem('p',state.note.zh));
        appendClaims(section,claims);e.append(section);
      }
      for(const p of epochTargets())
        addButton(detail,`${p.name.en} · ${p.name.zh}${p.proxy&&!p.name.en.includes('proxy')?' — district proxy · 片区示意':''}`,()=>{
          const target=p.id.startsWith('shekou')?'shekou':p.id.startsWith('nantou')?'nantou':p.id.startsWith('yumin')?'yumin':'core';
          if(focus!==target)selectFocus(target);
          frame(p.at,p.span);
        });
    }
    if(municipalOn()){
      const {doc,stageBSites,stageBRoads}=getEpoch();
      if(!doc)return;
      if(stageBSites.length){
        const review=elem('details','');
        const masses=stageBSites.filter(s=>s.plotted).length;
        review.id='stage-b-register';
        review.dataset.masses=String(masses);
        review.dataset.roads=String(stageBRoads);
        review.append(elem('summary',`Stage B: ${masses} site masses, ${stageBRoads} road traces · B阶段：${masses} 处建筑示意，${stageBRoads} 条道路描线`),
          elem('p','May edition (printed in June); survey cutoff unknown. Map-only buildings, road traces and urban blocks are inferred. The Caiwuwei grade separation is left unfinished.'),
          elem('p','地图为五月版，六月印刷，测绘截止时间不详。仅见于地图的建筑、道路和街区均为推定。蔡屋围立交保留未建成状态。'));
        appendClaims(review,stageBRegister.context);
        for(const s of stageBSites){
          const entry=elem('section',''), label=`${s.name.en} · ${s.name.zh}`;
          const state=s.withheld==='water'?'Water or protected corridor at map proxy · 示意点落在水体或保护通道':
            s.withheld==='field'?'Interpreted fields at the map proxy; location only · 示意点落在判读农田内，仅标地点':
            s.withheld==='conflict'?'No clear parcel near the proxy · 示意点周边无合适地块':
            s.mode==='existing'?'Existing study · 已有模型':s.mode==='reference'?'Reference only · 仅供参考':
            s.mode==='works'?'Documented works, illustrative yard · 有据工程，场坪示意':
            s.mode==='dated'?'Dated site, illustrative mass · 地点有年代依据，楼体为示意':
            'Inferred site mass · 推定楼体';
          if(s.world){
            const at=s.world;
            addButton(entry,label,()=>frame(at,380));
          }else entry.append(elem('strong',label));
          entry.append(elem('p',state),elem('p',s.note.en),elem('p',s.note.zh));
          appendClaims(entry,s.claims);
          review.append(entry);
        }
        e.append(review);
      }
      e.append(elem('p','Modern terrain and the October 1979 water comparator are shared across dates. Estimated routes are dashed from afar and warm-toned up close. Wide dashes are review bands, not track. 各时点共用现代地形和 1979 年 10 月水体对照。估计线路远看为虚线，近看为暖色。宽虚线带并非实际轨道。'));
      e.append(elem('p','At close range a thin estuary guide stays visible where modern terrain hides the illustrative water profile. It is not a bank survey or tide level. 近景中，细线指示被现代地形遮挡的河口示意水面；不代表实测河岸或潮位。'));
      const pockets=doc.features.filter(f=>f.reasonZh&&f.geometry.type==='Polygon');
      for(const f of pockets){
        if(f.geometry.type!=='Polygon')continue;
        const entry=elem('section',''), coords=f.geometry.coordinates[0]!, count=coords.length;
        const [west,north]=g.meta.origin_top_left;
        const x=coords.reduce((s,v)=>s+v[0]!,0)/count-west-cell/2,z=north-cell/2-coords.reduce((s,v)=>s+v[1]!,0)/count;
         if(f.urbanPreview||focus==='city')addButton(detail,f.name.join(' · '),()=>frame([x,z],f.urbanPreview?1500:2600));
        entry.append(elem('strong',f.name.join(' · ')),elem('p',f.reason),elem('p',f.reasonZh!));
        appendClaims(entry,f.claims);e.append(entry);
      }
      if(doc.water_comparator.reservoirs?.length){
        const entry=elem('section','');
        entry.append(elem('strong','October 1979 reservoir components · 1979年10月水库对照'),
          elem('p','Connected water pixels, not dam footprints or historical water levels. 水体连通像元，不代表坝体范围或历史水位。'));
        for(const r of doc.water_comparator.reservoirs){
          const [c,row]=r.cell;
          addButton(entry,r.name.join(' · '),()=>frame([c*cell,row*cell],5000));
          appendClaims(entry,r.claims);
        }
        e.append(entry);
      }
      for(const f of doc.features.filter(f=>f.geometry.type==='LineString')){
        const entry=elem('section','');
        const state=f.render_status==='review_required'?'Review required · 待核':f.basis==='estimated'?'Estimated · 估计':'Interpreted · 判读';
        const uncertainty=f.searchHalfWidthM?(f.id.startsWith('m84.road.')?
          ` · fit guide: ~${f.searchHalfWidthM} m / 配准参考约 ${f.searchHalfWidthM} 米`:
          ` · ±${f.searchHalfWidthM} m search band / 搜索范围`):'';
        entry.append(elem('strong',f.name.join(' · ')),elem('p',state+uncertainty+
          (f.basis==='estimated'&&!estimates.checked?' · Hidden / 已隐藏':'')));
        if(f.id.startsWith('m84.road.'))entry.append(elem('p',f.reason),elem('p',f.reasonZh??''));
        appendClaims(entry,f.claims);
        entry.append(elem('p',f.sources.map(id=>doc.sources[id]!.id??id).join(' · ')));
        e.append(entry);
      }
      paint();return;
    }else if(focus==='city'){
      e.append(elem('p','Municipality-wide historical building coverage is incomplete. Unplaced register entries remain unplotted. 全市历史建筑覆盖不完整，未定位条目不落图。'));
      if(!municipalInput)e.append(elem('p','Municipal input missing or invalid. Prepare the GIS and water package to enable the September overview. 市域输入缺失或无效；请准备底图和水体数据。'));
      for(const s of sites.filter(s=>!s.cell))e.append(elem('p',s.name.en+' · '+s.name.zh));
    }else if(basinOn()){
      e.append(elem('p',`Base map 11 Sep 1980, status ${basinMap.status}: KH-9 A048/c registered to Landsat at ~25 m RMS, not survey accuracy. Relief uses ${relief?'the 30 m modern surface patch':'the 100 m modern grid fallback'}, not historic grades. The reservoir outline is the 19 Oct 1979 MSS water mask; no dam is modelled. 底图配准误差约 25 米；地形基于${relief?'30 米现代地表':'100 米现代地形备用网格'}，非历史标高；水库轮廓取自 1979 年 10 月水体掩膜，未建坝体。`));
      e.append(elem('p','Detail areas reserved for hand-built models · 精模预留区'));
      for(const m of cfg.masks)e.append(elem('p',m.name.join(' · ')));
      e.append(elem('p','Some crossings use estimated model-only decks or level approaches; the rest stay open. The KH-9 record is unchanged. 部分交叉仅在模型中推定桥面或平交，其余留空。影像记录不变。'));
      const estimates=basinCfg.estimatedCrossings as Record<string,{type:string}>;
      for(const f of basinMap.layers.crossings.filter(c=>Object.hasOwn(estimates,c.id)))
        e.append(elem('p',`${f.name_en} · ${f.name_zh} — ${estimates[f.id]!.type==='span'?'Estimated deck · 推定桥面':'Estimated level crossing · 推定平交'}`));
      paint();return;
    }else if(focus==='core'){
      e.append(elem('p','KH-9 A048/c, 11 Sep 1980. Lines and areas were picked from the image. The 1977 map and 1987 composite plate guide names and relationships; pin positions are not surveyed. 线面描绘来自 1980 年 9 月 KH-9；1977 年街图及 1987 年综合图仅用于地名与关系判读。'));
      for(const f of observations.traces)e.append(elem('p',f.name.join(' · ')));
    }else{
      const [x,z]=place(focuses[focus]!.anchor),[east,north]=utm(meta,x,z);
      e.append(elem('p','Reference position · 参考位置　UTM 50N '+east+' E / '+north+' N'));
    }
    const all=fs.flatMap(f=>[...f.epochs.opening,...f.epochs.visit]);
    const ids=new Set([...(date==='baseline'?[]:epochs[date].claims),...all.flatMap(k=>{
      const l=layouts[k]!,site=sites.find(s=>s.id===l.anchor)!;
      return [...l.claims,...site.claims.filter(c=>c.use==='geometry').map(c=>c.id)];
    })]);
    for(const id of ids){
      const c=citations[id];if(!c)throw Error('Missing evidence: '+id);
      const section=elem('section','');section.append(elem('strong',id+' ['+c.status+']'));
      const a=elem('a',c.source??id) as HTMLAnchorElement;
      if(c.url && /^https?:\/\//.test(c.url)){a.href=c.url;a.target='_blank';a.rel='noopener';}
      section.append(elem('br',''),a,elem('p',c.locator??''));e.append(section);
    }
    paint();
  }
  async function photoTexture(key:string):Promise<PhotoTexture>{
    let slice:Kh9Meta['slice'],blob:Blob;
    if(key==='kh9-core'){
      const r=await fetch('./review/kh9-core.png');
      if(!r.ok || !r.headers.get('content-type')?.startsWith('image/png')) throw Error('Local 2 m chip not prepared');
      slice={file:'kh9-core.png',px_m:observations.image.metresPerPixel,cell_box:coreCells};
      blob=await r.blob();
    } else {
      slice=(await json<Kh9Meta>('kh9_1980.json')).slice;
      blob=new Blob([await bytes(slice.file)],{type:'image/png'});
    }
    const image=await createImageBitmap(blob,{imageOrientation:'none',premultiplyAlpha:'none'});
    try {
      const registration=cropUv(meta,slice,image.width,image.height);
      const texture=new T.Texture(image);
      texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.needsUpdate=true;
      return {texture,...registration};
    } catch (error) {image.close();throw error;}
  }
  function syncPhoto(){
    const on=kh9.enabled.value;
    core.visible=on&&traceToggle.checked;
    el('photo-observations').hidden=!on;
    fabric.visible=!on;
    if(!municipalOn())setPhotoReview();
    syncBasin();
    if(layerSelect.value!=='base')surfaceLegend(layerSelect.value);
    pins();updateAssembly();
  }
  async function layer(){
    const k=layerSelect.value, isPhoto=isPhotoLayer(k);
    let photo:PhotoTexture|undefined;
    if(isPhoto){
      if(!photoTextures.has(k)) photoTextures.set(k,photoTexture(k).catch(error=>{photoTextures.delete(k);throw error;}));
      photo=await photoTextures.get(k);
    }
    if(images[k] && !textures.has(k)){
      const blob=new Blob([await bytes(images[k]!)],{type:'image/png'});
      const image=await createImageBitmap(blob,{imageOrientation:'none',premultiplyAlpha:'none'});
      if(image.width!==meta.width*2 || image.height!==meta.height*2)throw Error('Unregistered MSS image');
      const tex=new T.Texture(image);
      tex.colorSpace=T.SRGBColorSpace;tex.flipY=false;tex.needsUpdate=true;textures.set(k,tex);
    }
    if(k!==layerSelect.value)return;
    if(photo){
      kh9.photo.value=photo.texture;
      kh9.offset.value.set(...photo.offset);kh9.scale.value.set(...photo.scale);
    }
    const base=isPhoto?'base':k;
    if(!textures.has(base))textures.set(base,terrainTexture(g,base));
    terrainMat.map=textures.get(base)!;terrainMat.needsUpdate=true;
    const changeMode=kh9.enabled.value!==isPhoto;
    kh9.enabled.value=isPhoto;
    syncPhoto();
    if(changeMode && focus!=='city')frame();
    else paint();
  }
  function surfaceLegend(k:string){
    const reports:Record<string,[title:string,note:string,items:LegendItem[]]>={
      mss79:['Landsat MSS · 1979-10-19','False colour; black marks missing imagery. 假彩色卫星影像，黑色为缺测。',[]],
      mss84:['Landsat MSS · 1984-11-22','False colour; black marks missing imagery. This image postdates January 1984. 假彩色影像，黑色为缺测；影像晚于 1984 年 1 月。',[]],
      oct79:['MSS water · 水体对照 · 1979-10-19','Estimated lowland water; tide and shadows introduce uncertainty. 低地水体推测，受潮汐与阴影影响。',[['#77a8ad','Water · 水'],['#c9c3b3','Unknown · 未判定']]],
      nov84:['MSS change · 变化对照 · 1984-11-22','Compared with Oct 1979; cleared pixels may be bare fields. 与 1979 年 10 月对照，清理地表可能为裸田。',[['#77a8ad','Water · 水'],['#dec48a','Water → land · 出露'],['#bd8860','Cleared · 清理'],['#859d76','Greener · 增绿'],['#c9c3b3','No comparison · 无对照']]],
    };
    let entry=reports[k];
    if(isPhotoLayer(k)){
      const traces:LegendItem[]=traceToggle.checked?[
        [observationColors.water!,'Water · 水系','line'],[observationColors.rail!,'Rail · 铁路','line'],
        [observationColors.road!,'Road · 道路','line'],[observationColors.field!,'Fields · 田块','line'],
        [observationColors.settlement!,'Built-up trace · 建成区','line'],
      ]:[];
      entry=['KH-9 · 1980-09-11',[
        k==='kh9-core'?'Local 2 m sample; relief beyond the chip. 本地 2 米采样，影像范围外为地形。':'6.25 m sample. 采样间距 6.25 米。',
        ...(traces.length?['Solid = legible in image; dashed = interpretation. Neither is a survey. 实线为影像可辨，虚线为判读；均非测绘。']:[]),
        ...(placesToggle.checked&&focus!=='city'?['Numbered pins = locality candidates. 编号标记为候选地点。']:[]),
      ].join(' '),traces];
    }
    if(entry)setLegend(...entry);
    el('layer-note').textContent='Acquisition date is independent of the selected built snapshot. 影像获取日期独立于所选建成时点。';
  }
  function setLegend(title:string,note:string,legend:LegendItem[]){
    el('legend-title').textContent=title;el('legend-note').textContent=note;
    const host=el('legend');host.replaceChildren();host.hidden=!legend.length;
    for(const [color,name,mark] of legend){
      const row=elem('li',name);row.dataset.mark=mark??'area';row.style.setProperty('--swatch',color);host.append(row);
    }
  }
  controls.addEventListener('change',()=>{if(!framing)paint();});
  traceToggle.onchange=()=>{syncPhoto();paint();};
  placesToggle.onchange=()=>{surfaceLegend(layerSelect.value);pins();paint();};
  clearToggle.onchange=()=>{syncBasin();paint();};
  estimates.onchange=()=>{syncBasin();updateAssembly();};
  buildingNames.onchange=()=>{nameDetails.open=buildingNames.checked;pins();paint();};
  overlappingNames.onchange=()=>paint();
  focusSelect.onchange=()=>selectFocus(focusSelect.value);
  photoReview.onchange=()=>enterPhotoReview(photoReview.value);
  el('photo-review-exit').onclick=()=>selectFocus(focus);
  el('shenzhenxu-street').onclick=()=>enterVignette({id:'shenzhenxu',mode:'street'});
  el('shenzhenxu-aerial').onclick=()=>enterVignette({id:'shenzhenxu',mode:'aerial'});
  for(const id of streetEntries)el(id+'-street').onclick=()=>enterVignette({id,mode:'street'});
  el('shenzhenxu-exit').onclick=el('street-exit').onclick=exitVignette;
  let appliedLayer='base';
  async function applyLayer(){
    const requested=layerSelect.value;
    try{
      await layer();
      if(requested===layerSelect.value)appliedLayer=requested;
    } catch(error){
      if(requested!==layerSelect.value)return;
      layerSelect.value=appliedLayer;
      syncPhoto();
      el('layer-note').textContent='Layer unavailable · 图层无法加载：'+(error as Error).message;
    }
  }
  layerSelect.onchange=()=>{void applyLayer();};
  function selectDate(k:BuiltDate){
    if(k===date||!canPick(k))return;
    previousDate=date;
    date=k;
    syncBasin();pins();
    updateAssembly();
  }
  const flipDate=()=>selectDate(comparisonDate(date,previousDate));
  el('epoch-flip').onclick=flipDate;
  document.querySelectorAll<HTMLButtonElement>('[data-date]').forEach(b=>b.onclick=()=>selectDate(b.dataset.date as BuiltDate));
  document.addEventListener('keydown',e=>{
    if(!el('loading').hidden||e.target instanceof HTMLElement&&e.target.closest('input,select,textarea,[contenteditable]'))return;
    const action=comparisonShortcut(e);
    if(action==='exit'&&aerial){e.preventDefault();selectFocus(focus);return;}
    if(!action||action==='exit'&&!vignette)return;
    e.preventDefault();
    if(action==='flip')flipDate();
    else if(action==='exit')exitVignette();
    else selectDate(action);
  });
  el('home').onclick=()=>{
    if(vignette){enterVignette(vignette);return;}
    if(kh9.enabled.value){selectedPlace=undefined;placeInfo();pins();}
    frame();
  };
  for(const [id,d] of [['zoom-in',1.5],['zoom-out',1/1.5]] as const)el(id).onclick=()=>{
    camera.zoom=T.MathUtils.clamp(camera.zoom*d,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();paint();};
  const requestedDate=params.get('epoch');
  const requestedStreet=params.get('lod2');
  if(requestedDate==='visit'||requestedDate==='opening')date=requestedDate;
  else if(params.get('basin')==='0')date='opening';
  else if(requestedDate!=='baseline')date='visit';
  const surface=params.get('layer');if(surface && Array.from(layerSelect.options).some(o=>o.value===surface))layerSelect.value=surface;
  const selected=params.get('focus');
  traceToggle.checked=params.get('trace')!=='0';
  placesToggle.checked=params.get('places')!=='0';
  estimates.checked=params.get('estimates')!=='0';
  overlappingNames.checked=params.get('buildings')==='all';
  buildingNames.checked=nameDetails.open=overlappingNames.checked||params.get('buildings')==='1';
  clearToggle.checked=params.get('clear')==='1';
  if(layerSelect.value!=='base'){
    const desired=layerSelect.value;
    layerSelect.value='base';
    await layer();
    layerSelect.value=desired;
  }
  await applyLayer();
  selectFocus(selected&&(selected==='core'||Object.hasOwn(focuses,selected))?selected:(isPhotoLayer(layerSelect.value)||date==='visit'?'core':'city'));
  // Matched review frames: ?at=x,z (atlas world metres) &span=metres.
  const at=params.get('at')?.split(',').map(Number);
  if(at?.length===2&&at.every(Number.isFinite))frame([at[0]!,at[1]!],Number(params.get('span'))||400);
  if(requestedStreet==='shenzhenxu'||requestedStreet==='shenzhenxu-aerial')
    enterVignette({id:'shenzhenxu',mode:requestedStreet==='shenzhenxu'?'street':'aerial'});
  else if(isStreetId(requestedStreet))enterVignette({id:requestedStreet,mode:'street'});
  const requestedReview=params.get('review');
  if(requestedReview)enterPhotoReview(requestedReview);
  el('loading').hidden=true;new ResizeObserver(resize).observe(map);
}
start().catch(error=>{el('loading').textContent='Viewer unavailable · 无法加载：'+error.message;console.error(error);});
