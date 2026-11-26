// Software-render the actual scene meshes for matched-camera review on machines without WebGL.
// Run from this workspace with "npx tsx plates.ts OUTPUT_DIR". Produces RGB PPMs (P6).
import * as T from 'three';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {decode,ground,type Meta} from './src/grid';
import {buildTerrain,terrainTexture} from './src/terrain';
import {assemble,focuses,layouts,models,origin,type Epoch,type Site} from './src/assembly';

const read=(f:string)=>readFileSync(new URL('./public/grid/'+f,import.meta.url));
const buf=(f:string)=>Uint8Array.from(read(f)).buffer;
const meta:Meta=JSON.parse(read('meta.json').toString()),sites:Site[]=JSON.parse(read('sites.json').toString()).sites;
const grid=decode(meta,buf('grid.bin'),buf('water1979.bin'),buf('change_79_84.bin'));
const output=resolve(process.argv[2]??'dist/plates');mkdirSync(output,{recursive:true});
const width=760,height=420, light=new T.Vector3(-0.65,1,0.72).normalize();
const point=(key:string)=>origin(layouts[key]!,sites,meta.cell_m);
for(const epoch of ['opening','visit'] as Epoch[]){
  const assembly=models(grid,assemble(Object.values(focuses).flatMap(f=>f.epochs[epoch]),sites,meta.cell_m));
  for(const key of ['city',...Object.keys(focuses)]){
    const city=key==='city', focus=focuses[key],anchor=city?[46500,34250]:point(focus!.anchor);
    // In the Guomao plate show the same building site in both frames.
    const cx=anchor[0]!,cz=anchor[1]!,span=city?65000:key==='luohu'?260:focus!.range*0.74;
    const cy=ground(grid,cx,cz),aspect=width/height;
    const cam=new T.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,0.1,250000);
    if(city)cam.position.set(cx,85000,cz+49000);else cam.position.set(cx+span*0.65,cy+span*0.8,cz+span*0.93);
    cam.lookAt(cx,cy,cz);cam.updateMatrixWorld();
    const rgba=new Uint8Array(width*height*3),depth=new Float32Array(width*height).fill(Infinity);
    for(let i=0;i<rgba.length;i+=3)rgba.set([229,232,220],i);
    const layer=city?(epoch==='opening'?'oct79':'nov84'):'base';
    const tex=terrainTexture(grid,layer),pixels=tex.image.data as Uint8Array;
    const terrain=buildTerrain(grid,new T.MeshBasicMaterial(),city?undefined:[Math.round(cx/meta.cell_m),Math.round(cz/meta.cell_m)]);
    const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));
    for(const obj of [...terrain.children,...assembly.children] as T.Mesh[]){
      if(!frustum.intersectsObject(obj))continue;
      const geo=obj.geometry,pos=geo.getAttribute('position'),idx=geo.index;
      const inst=obj instanceof T.InstancedMesh, matrix=new T.Matrix4(),base=new T.Color();
      for(let ii=0;ii<(inst?obj.count:1);ii++){
        if(inst){
          obj.getMatrixAt(ii,matrix);obj.getColorAt(ii,base);
          geo.computeBoundingSphere();
          if(!frustum.intersectsSphere(geo.boundingSphere!.clone().applyMatrix4(matrix)))continue;
        }
        const world:T.Vector3[]=[], screen:T.Vector3[]=[];
        for(let j=0;j<pos.count;j++){
          const v=new T.Vector3().fromBufferAttribute(pos,j).applyMatrix4(matrix);world.push(v);
          const s=v.clone().project(cam);s.set((s.x+1)*width/2,(1-s.y)*height/2,s.z);screen.push(s);
        }
        const triCount=idx?.count??pos.count;
        for(let j=0;j<triCount;j+=3){
          const ia=idx?.getX(j)??j,ib=idx?.getX(j+1)??j+1,ic=idx?.getX(j+2)??j+2;
          const a=screen[ia]!,b=screen[ib]!,c=screen[ic]!;
          const det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
          if(det>=-0.0001)continue;
          const xmin=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),xmax=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
          const ymin=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),ymax=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
          if(xmin>xmax||ymin>ymax)continue;
          const A=world[ia]!,B=world[ib]!,C=world[ic]!;
          const norm=new T.Vector3().subVectors(B,A).cross(new T.Vector3().subVectors(C,A)).normalize();
          const shade=0.80+0.23*norm.dot(light);
          const color=base.clone().convertLinearToSRGB(),rgb=[color.r*255,color.g*255,color.b*255];
          for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
            const u=((b.y-c.y)*(x+0.5-c.x)+(c.x-b.x)*(y+0.5-c.y))/det;
            const v=((c.y-a.y)*(x+0.5-c.x)+(a.x-c.x)*(y+0.5-c.y))/det,t=1-u-v;
            if(u<0||v<0||t<0)continue;
            const d=u*a.z+v*b.z+t*c.z,i=y*width+x;if(d>=depth[i]!)continue;depth[i]=d;
            if(!inst){
              const col=Math.max(0,Math.min(meta.width-1,Math.round((u*A.x+v*B.x+t*C.x)/meta.cell_m)));
              const row=Math.max(0,Math.min(meta.height-1,Math.round((u*A.z+v*B.z+t*C.z)/meta.cell_m)));
              const src=4*(row*meta.width+col);
              rgb[0]=pixels[src]!;rgb[1]=pixels[src+1]!;rgb[2]=pixels[src+2]!;
            }
            for(let k=0;k<3;k++)rgba[3*i+k]=Math.round(Math.min(255,rgb[k]!*shade));
          }
        }
      }
    }
    writeFileSync(join(output,key+'-'+epoch+'.ppm'),Buffer.concat([Buffer.from('P6\n'+width+' '+height+'\n255\n'),rgba]));
    tex.dispose();console.log(key,epoch);
  }
}
