import register from '../municipal-epochs.json';
import {toWorld,type Cover,type GroundTint,type RawMap} from './procgen/gis';
import type {P} from './procgen/geom';
import type {MunicipalMap} from './procgen/municipal-lod0';
import type {GenCfg} from './procgen/plan';
import type {District} from './procgen/districts';

export type BuiltDate='baseline'|'opening'|'visit';
type Names={en:string;zh:string};
export type Rect=[number,number,number,number];
type Model={
  at:P;clear:Rect;coarse:[number,number,number];
  overviewKit?:string;
  surface?:GroundTint['kind'];
  parts:{kit:string;offset:P;yaw:number}[];
};
export type Delta={
  status:'continuity'|'review'|'sourced-delta'|'sourced-stage'|'unplaced'|'proxy';
  note:Names;claims?:string[];omitCore?:string[];omitMunicipal?:string[];
  cover?:Record<string,Cover>;model?:Model;zones?:Omit<District,'id'>[];
  roadProfiles?:GenCfg['roads'];
  roadAlignments?:Record<string,P[]>;
};
type Feature={id:string;name:Names;claims:string[];states:Partial<Record<Exclude<BuiltDate,'baseline'>,Delta>>};
export const epochRegister={...register,features:register.features as Feature[]};
export const deltaLabels:Record<Delta['status'],string>={
  continuity:'Continuity assumption · 延续假设',review:'Alignment under review · 线位待核',
  'sourced-delta':'Sourced change, interpreted geometry · 文献支持变化，几何为判读',
  'sourced-stage':'Documented stage, illustrative geometry · 有据阶段，几何为示意',
  proxy:'District or junction proxy, not a surveyed parcel · 片区或路口示意，并非实测地块',
  unplaced:'Documented, not plotted · 有据未落图',
};
export function epochEntries(date:BuiltDate){
  return date==='baseline'?[]:epochRegister.features.flatMap(({id,name,states,claims})=>{
    const state=states[date];
    return state?[{id,name,state,claims:[...new Set([...claims,...state.claims??[]])]}]:[];
  });
}

export function deriveEpoch(date:BuiltDate,map:RawMap,cfg:GenCfg,doc?:MunicipalMap){
  if(map.date!==epochRegister.baseline||doc&&doc.date!==map.date)throw Error('Epoch register requires the September baseline');
  const entries=epochEntries(date);
  if(date==='baseline')return {map,cfg,doc,models:[],districts:[] as District[]};
  const omit=new Set(entries.flatMap(e=>e.state.omitCore??[]));
  const omitMunicipal=new Set(entries.flatMap(e=>e.state.omitMunicipal??[]));
  const cover=Object.assign({},...entries.map(e=>e.state.cover??{})) as Record<string,Cover>;
  const profiles=Object.assign({},...entries.map(e=>e.state.roadProfiles??{})) as GenCfg['roads'];
  const roadAlignments=Object.assign({},...entries.map(e=>e.state.roadAlignments??{})) as Record<string,P[]>;
  const ids=new Set(Object.values(map.layers).flat().map(f=>f.id));
  for(const id of omit)if(!ids.has(id))throw Error('Unknown core delta: '+id);
  for(const id of Object.keys(cover))if(omit.has(id)||!map.layers.cover!.some(f=>f.id===id))
    throw Error('Invalid cover delta: '+id);
  for(const id of Object.keys(profiles))if(omit.has(id)||!Object.hasOwn(cfg.roads,id))
    throw Error('Invalid road profile delta: '+id);
  for(const [id,points] of Object.entries(roadAlignments))if(!profiles[id]||points.length<2||
    points.some(([x,y])=>x<map.bounds[0]!||x>map.bounds[2]!||y<map.bounds[1]!||y>map.bounds[3]!))
    throw Error('Invalid render alignment: '+id);
  if(doc)for(const id of omitMunicipal)if(!doc.features.some(f=>f.id===id))throw Error('Unknown municipal delta: '+id);
  const layers={...map.layers};
  layers.cover=map.layers.cover!.map(f=>omit.has(f.id)||cover[f.id]?
    {...f,kind:cover[f.id]??'unknown',basis:'epoch_interpretation'}:f);
  layers.alignments=map.layers.alignments!.filter(f=>!omit.has(f.id)).map(f=>{
    const line=roadAlignments[f.id];
    return line?{...f,basis:'epoch_interpretation',geometry:{type:'LineString',coordinates:line}}:f;
  });
  layers.crossings=map.layers.crossings!.filter(f=>!omit.has(f.id)&&!f.links.some(id=>omit.has(id)));
  const crossings=new Set(layers.crossings.map(f=>f.id));
  const without=<T>(rows:Record<string,T>,test:(id:string)=>boolean)=>
    Object.fromEntries(Object.entries(rows).filter(([id])=>test(id)));
  const models=entries.flatMap(({id,name,state,claims})=>{
    const m=state.model;
    if(!m)return [];
    const [w,s,e,n]=m.clear,[l,t]=toWorld([w,n]),[r,b]=toWorld([e,s]);
    const at=toWorld(m.at);
    const [west,south,east,north]=map.bounds as Rect;
    if(!(w<e&&s<n&&w>=west&&s>=south&&e<=east&&n<=north&&at[0]>l&&at[0]<r&&at[1]>t&&at[1]<b))
      throw Error('Invalid authored patch: '+id);
    return [{...m,id,name,claims,at,clear:[l,t,r,b] as Rect}];
  });
  const districts=entries.flatMap(({id,state})=>(state.zones??[]).map((z,i):District|undefined=>{
    const [w,s,e,n]=z.rect,[l,t]=toWorld([w,n]),[r,b]=toWorld([e,s]);
    if(!(w<e&&s<n)||z.mix&&!Object.values(z.mix).some(weight=>weight>0)||
      (z.within||z.form==='villa-court')&&!map.layers.cover!.some(f=>f.id===z.within&&f.kind==='settlement')||
      z.form==='villa-court'&&(z.surface!=='settlement'||z.mix!==undefined)||
       z.form==='graded-yard'&&(z.surface!=='graded_ground'&&z.surface!=='worksite'||z.mix!==undefined)||
       z.form==='works-compound'&&(z.surface!=='worksite'||z.mix!==undefined)||
      z.form==='field-study'&&(z.surface!=='field'||z.mix!==undefined)||
      z.compound&&!z.mix||z.heading!==undefined&&!Number.isFinite(z.heading)||
      z.trim&&!map.layers.cover!.some(f=>f.id===z.trim&&f.kind==='settlement'))throw Error('Invalid district zone: '+id);
    const [west,south,east,north]=(doc?.bounds??map.bounds) as Rect;
    if(!(w>=west&&s>=south&&e<=east&&n<=north)){
      if(!doc)return undefined;
      throw Error('District zone outside atlas: '+id);
    }
    let frontage:District['frontage'];
    if(z.frontage){
      const [fw,fs,fe,fn]=z.frontage.rect;
      const expected=z.frontage.use==='commercial'?
        !z.mix&&(z.frontage.form==='block'?z.designSurface==='settlement':!!z.within):
        z.surface==='settlement'&&!!z.mix;
      if(!expected||
        !(fw>=w&&fs>=s&&fe<=e&&fn<=n&&fw<fe&&fs<fn))
        throw Error('Invalid frontage study: '+id);
      frontage={...z.frontage,rect:[...toWorld([fw,fn]),...toWorld([fe,fs])]};
    }
    return {...z,id:`${id}/${i}`,rect:[l,t,r,b] as Rect,frontage};
  }).filter((z):z is District=>!!z));
  return {
    // Keep the source date in both internal views: these are render-only
    // derivatives, not a new observed GIS handoff.
    map:{...map,layers},
    cfg:{...cfg,roads:{...without(cfg.roads,id=>!omit.has(id)),...profiles},rail:without(cfg.rail,id=>!omit.has(id)),
      bridges:without(cfg.bridges,id=>crossings.has(id)),
      estimatedCrossings:without(cfg.estimatedCrossings??{},id=>crossings.has(id))},
    doc:doc&&{...doc,features:doc.features.filter(f=>!omitMunicipal.has(f.id)&&!f.core_anchors.some(a=>omit.has(a.core)))},
    models,districts,
  };
}

export type EpochModel=ReturnType<typeof deriveEpoch>['models'][number];
export const modelTints=(models:EpochModel[])=>models.flatMap(m=>m.surface?[{kind:m.surface,rect:m.clear}]:[]);
