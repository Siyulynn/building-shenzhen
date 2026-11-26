import {describe,expect,it} from 'vitest';
import {assemble,focuses,layouts,models,type Site} from '../src/assembly';
import {kit} from '../src/parts';
import {decode} from '../src/grid';
import {InstancedMesh,Matrix4} from 'three';
const anchors=[...new Set(Object.values(layouts).map(l=>l.anchor))];
const sites:Site[]=anchors.map((id,i)=>({id,name:{en:id,zh:id},cell:[i+3,i+3],claims:[]}));
function view(id:string,date:'opening'|'visit'){return assemble(focuses[id]!.epochs[date],sites,100);}
describe('illustrative physical assemblies',()=>{
  it('resolves every part and preserves stable placements between snapshots',()=>{
    for(const id of Object.keys(focuses)){
      const a=view(id,'opening'),b=view(id,'visit');
      expect(a.length).toBeGreaterThan(0);expect(b.length).toBeGreaterThan(0);
      const shared=b.filter(p=>a.some(v=>v.key===p.key));
      expect(shared.length).toBeGreaterThan(0);
      for(const p of shared)expect(a.find(v=>v.key===p.key)).toEqual(p);
      expect(assemble(focuses[id]!.epochs.visit,sites,100)).toEqual(b);
      for(const p of [...a,...b])for(const mesh of kit(p.kind)){
        expect(mesh.w*mesh.h*mesh.d).toBeGreaterThan(0);expect(Number.isFinite(p.x+p.z+mesh.h)).toBe(true);
      }
    }
  });
  it('keeps January construction and open evidence gaps explicit',()=>{
    expect(view('luohu','opening').some(p=>p.kind==='guomao')).toBe(false);
    expect(view('luohu','visit').filter(p=>p.kind==='guomao')).toHaveLength(1);
    expect(view('yumin','opening').some(p=>p.kind==='villa')).toBe(false);
    expect(view('yumin','visit').some(p=>p.kind==='villa')).toBe(true);
    expect(view('nantou','visit')).toEqual(view('nantou','opening'));
    expect(()=>assemble(['station'],[],100)).toThrow('Unplaced anchor');
  });
  it('batches the city kit and grounds all instances with finite matrices',()=>{
    const meta={crs:'EPSG:32650',width:24,height:24,cell_m:100,origin_top_left:[0,0] as [number,number]};
    const n=meta.width*meta.height;
    const g=decode(meta,new ArrayBuffer(n*6),new ArrayBuffer(n),new ArrayBuffer(n));
    const all=Object.values(focuses).flatMap(f=>f.epochs.visit);
    const result=models(g,assemble(all,sites,100));expect(result.children.length).toBeLessThanOrEqual(3);
    const m=new Matrix4();
    for(const batch of result.children as InstancedMesh[]){
      expect(batch.count).toBeGreaterThan(0);
      for(let i=0;i<batch.count;i++){batch.getMatrixAt(i,m);expect(m.elements.every(Number.isFinite)).toBe(true);}
    }
  });
});
