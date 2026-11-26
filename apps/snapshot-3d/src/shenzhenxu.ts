import * as T from 'three';
import layout from '../shenzhenxu-lod2.json';
import {bbox,chainage,type P} from './procgen/geom';
import {toWorld,type RawMap} from './procgen/gis';
import {pointAt} from './procgen/network';
import {epochEntries,type BuiltDate} from './epochs';

export const shenzhenxu=layout;
type Rect=[number,number,number,number];
type Height=(x:number,z:number)=>number;

/** Author in signed chainage along the two existing traces, not on a modern
 * street grid. R01 gives a camera composition, not a survey or a bearing. */
export function crossroads(map:RawMap){
  const lines=layout.alignments.map(id=>{
    const l=map.layers.alignments?.find(row=>row.id===id)?.geometry;
    if(l?.type!=='LineString')throw Error('Missing Shenzhenxu trace: '+id);
    return l.coordinates.map(toWorld);
  });
  const [east,south]=lines as [P[],P[]];
  const common=east.filter(([x,z])=>south.some(p=>p[0]===x&&p[1]===z));
  if(common.length!==1)throw Error('Expected one shared Shenzhenxu trace vertex');
  const at=common[0]!;
  const make=(line:P[])=>{
    const s=chainage(line);
    const zero=s[line.findIndex(([x,z])=>x===at[0]&&z===at[1])]!;
    return (d:number)=>pointAt(line,zero+d);
  };
  const u=make(east),v=make(south);
  const world=(a:number,b:number):P=>{
    const p=u(a),q=v(b);
    return [p[0]+q[0]-at[0],p[1]+q[1]-at[1]];
  };
  const bounds=(r:number[]):Rect=>{
    const [a,b,c,d]=r as Rect;
    return bbox([world(a,b),world(c,b),world(c,d),world(a,d),world(0,b),world(0,d)]);
  };
  return {at,world,patch:bounds(layout.patch),clear:bounds(layout.clear)};
}
type Crossroads=ReturnType<typeof crossroads>;

/** Same horizontal field of view as the authored reference frame, with a
 * fitted viewport so responsive resizing doesn't reframe the photograph. */
export function postcardViewport(w:number,h:number,a=layout.referenceFrame[0]!/layout.referenceFrame[1]!):Rect{
  const vw=Math.min(w,h*a),vh=vw/a;
  return [(w-vw)/2,(h-vh)/2,vw,vh];
}

const roofGeometry=()=>{
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([
    -.5,0,.5,.5,0,.5,-.5,0,-.5,.5,0,-.5,-.5,1,0,.5,1,0,
  ],3));
  g.setIndex([0,1,5,0,5,4,2,4,5,2,5,3,0,4,2,1,3,5]);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();
  return flat;
};
const plasters=[0xa39580,0xb3ac99,0x948b78,0xad9b82,0x9d9d91,0xafa595];
const masonry=[0x777268,0x878072,0x6f6a61,0x8c8372,0x827568,0x877e71];
const tiles=[0x61483d,0x67594b,0x705746,0x5a5048,0x72574b];
const beam=0x6b5341, timber=0x534a3e, dark=0x39382f, stone=0x918574;
type Shape='solid'|'trim'|'roof'|'wheel'|'round';
type Part={position:T.Vector3;scale:T.Vector3;rotation:T.Quaternion;colour:number};
type StreetView={eye:T.Vector3;look:T.Vector3;fov:number};

/** Procedural three-dimensional tone variation, evaluated in local metres.
 * No photo texture or scale-dependent UVs are used. */
function patina(mat:T.MeshLambertMaterial, amount:number){
  mat.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vXuMetres;\n'+s.vertexShader.replace('#include <project_vertex>',`
      vec4 xuPoint=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        xuPoint=instanceMatrix*xuPoint;
      #endif
      vXuMetres=xuPoint.xyz;
      #include <project_vertex>`);
    s.fragmentShader=`varying vec3 vXuMetres;
      float xuHash(vec3 p){
        p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
      }
      float xuNoise(vec3 p){
        vec3 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
        return mix(
          mix(mix(xuHash(i),xuHash(i+vec3(1,0,0)),f.x),mix(xuHash(i+vec3(0,1,0)),xuHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(xuHash(i+vec3(0,0,1)),xuHash(i+vec3(1,0,1)),f.x),mix(xuHash(i+vec3(0,1,1)),xuHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }\n`+s.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        float patina=(xuNoise(vXuMetres*vec3(1.12,0.48,1.12))-.5)*.84 +
                     (xuNoise(vXuMetres*38.)-.5)*.39;
        diffuseColor.rgb*=1.+patina*${amount.toFixed(2)};`);
  };
  mat.customProgramCacheKey=()=>`xu-patina-${amount}`;
  return mat;
}

/** Draw one deliberately small, reversible art patch. All dimensions, grade
 * lifts and facade colours are design values, including where the kit joins
 * the modern-surface proxy used for atlas terrain. */
export function shenzhenxuState(date:BuiltDate){
  if(date==='baseline')return {status:layout.status,rows:layout.rows,claims:layout.claims,note:undefined};
  const entry=epochEntries(date).find(e=>e.id===layout.id)!;
  return {...layout.bookends[date],rows:layout.continuityRows,claims:entry.claims,note:entry.state.note};
}

export function buildShenzhenxu(xr:Crossroads, ground:Height, date:BuiltDate='baseline', sharedStreets=false){
  const state=shenzhenxuState(date);
  const group=new T.Group(), world=xr.world;
  group.name=layout.id;
  group.userData={name_en:layout.name[0],name_zh:layout.name[1],status:state.status,
    origin:'ground_contact',claim_ids:state.claims.join(';')};
  group.position.set(xr.at[0],ground(...xr.at),xr.at[1]);
  const originY=group.position.y;
  const point=(u:number,y:number,v:number)=>{
    const [x,z]=world(u,v);return new T.Vector3(x-xr.at[0],y-originY,z-xr.at[1]);
  };
  const groundAt=(u:number,v:number)=>ground(...world(u,v));
  const surface=(u:number,v:number)=>{
    const [u0,v0,u1,v1]=layout.patch as Rect;
    const t=Math.max(0,Math.min(1,(u-u0)/6,(u1-u)/6,(v-v0)/6,(v1-v)/6));
    return groundAt(u,v)+.08+.52*t;
  };
  const batches=new Map<Shape,Part[]>();
  const yawAt=(u:number,v:number)=>{
    const [x,z]=world(u,v),[a,b]=world(u+.1,v);
    return -Math.atan2(b-z,a-x);
  };
  const part=(shape:Shape,position:T.Vector3,scale:T.Vector3,rotation:T.Quaternion,colour:number)=>{
    if(!batches.has(shape))batches.set(shape,[]);
    batches.get(shape)!.push({position,scale,rotation,colour});
  };
  function piece(u:number,y:number,v:number,w:number,h:number,d:number,colour:number,shape:Shape='solid'){
    part(shape,point(u,y,v),new T.Vector3(w,h,d),
      new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,yawAt(u,v)),colour);
  }
  const box=(u:number,y:number,v:number,w:number,h:number,d:number,c:number,trim=false)=>piece(u,y+h/2,v,w,h,d,c,trim?'trim':'solid');
  function rod(a:T.Vector3,b:T.Vector3,r:number,c:number){
    const d=b.clone().sub(a);
    part('round',a.clone().lerp(b,.5),new T.Vector3(r,d.length(),r),
      new T.Quaternion().setFromUnitVectors(T.Object3D.DEFAULT_UP,d.normalize()),c);
  }

  // A shaded, recessed ground floor, projecting upper storey, and pitched
  // roof per bay. Continuous cornices share the street perspective without
  // forcing identical repeated shopfronts.
  let bay=0;
  for(const row of state.rows){
    let u0=row.start;
    for(const [i,width] of row.bays.entries()){
      const u=u0+width/2, s=row.side, depth=row.depth,h=row.heights[i]!;
      const v=row.front*s, wear=bay%plasters.length, plaster=plasters[wear]!, brick=masonry[wear]!;
      const corner=row.style==='corner'&&i===0;
      const gallery=row.style==='gallery'&&i>=row.bays.length-2;
      const plain=row.style==='plain';
      const slab=3.15+(i%3)*.09, inset=plain?.26:corner?2.5:2.05;
      const floor=surface(u,v)+.13, rear=v+s*depth, insetFace=v+s*inset;
      const body=depth-inset;
      const bayWidth=width-.07;
      const low=Math.min(floor-1.65,...[u0,u0+width].flatMap(x=>[v,rear].map(z=>groundAt(x,z)-.35)));
      box(u,low,v+s*depth*.5,bayWidth,floor-low,depth,stone);
      box(u,floor,v+s*depth*.5,bayWidth,.16,depth+.32,stone);
      box(u,floor,insetFace+s*(body-.65)*.5,bayWidth,slab,body-.65,brick);
      box(u,floor+slab,v+s*depth*.5,bayWidth,h-slab,depth,plaster);
      box(u,floor+slab-.12,v+s*.08,bayWidth,.27,.42,stone);
      box(u,floor+h-.29,v+s*.01,bayWidth,.18,.36,plaster);
      box(u,floor+slab+.02,v+s*depth-.1,bayWidth,h-slab-.02,.24,brick);
      for(const uCol of plain?[]:[u0+.2]){
        box(uCol,floor,v+s*.16,.43,slab+.05,.49,plaster);
        box(uCol,floor-.02,v+s*.15,.55,.4,.61,stone,true);
        box(uCol,floor+slab-.23,v+s*.16,.52,.23,.55,plaster,true);
      }
      if(!plain&&i===row.bays.length-1)box(u0+width-.2,floor,v+s*.16,.43,slab+.05,.49,plaster);
      // At the first left return show a masonry gable with a taller, narrow
      // opening and quoins, instead of treating the corner as a generic bay.
      if(corner){
        box(u0+.08,floor,v+s*depth/2,.24,h-.2,depth,brick);
        box(u0-.06,floor+.05,v+s*depth/2,.052,2.92,depth-.12,0xa89e88);
        box(u0-.06,floor+3.98,v+s*4.6,.15,1.9,1.45,dark,true);
        box(u0-.12,floor+4.12,v+s*4.6,.06,1.6,.24,timber,true);
        box(u0-.11,floor+.45,v+s*1.02,.18,2.25,1.44,dark,true);
        for(let n=0;n<12;n++)box(u0-.065,floor+.48+n*.53,v+s*(n%2?.75:.62),.10,.14,.6,plaster,true);
      }
      // Shop openings and shutters are unnamed. Frontage glazing sits in
      // front of the recessed masonry, never painted onto the arcade piers.
      box(u+.24,floor+.19,insetFace-s*(plain?.03:.29),width*.67,2.38,.12,bay%3===0?timber:dark,true);
      box(u-.46,floor+.21,insetFace-s*.36,.10,2.37,.12,beam,true);
      box(u+.72,floor+.21,insetFace-s*.36,.07,2.37,.12,beam,true);
      if(bay%4===1)box(u,floor+2.72,insetFace-s*.39,width*.53,.31,.13,0x957a56,true);
      for(const f of [-.22,.22]){
        const a=u+width*f, wy=floor+slab+(h-slab-1.55)*.52;
        box(a,wy,v-s*.055,width*(gallery?.29:.22),1.55,.14,dark,true);
        box(a,wy-.05,v-s*.15,width*.28,.12,.15,stone,true);
        if(bay%4!==0||gallery){
          for(const t of [-.26,0,.26])box(a+t,wy+.08,v-s*.17,.09,1.4,.12,timber,true);
          box(a,wy+.66,v-s*.18,width*.23,.09,.11,beam,true);
        }
      }
      if(gallery){
        box(u,floor+slab-.06,v-s*.5,bayWidth,.23,1.08,0x88765d);
        for(let k=1;k<=8;k++)box(u0+width*k/9,floor+slab+.16,v-s*.98,.07,1.43,.07,timber,true);
        box(u,floor+slab+.96,v-s*.98,bayWidth,.09,.13,timber,true);
      }
      if((gallery||bay%8===2)&&!corner){
        box(u,floor+2.74,v-s*.7,bayWidth,.10,1.45,bay%2===0?0x7f6b51:0x938264);
      }
      const rise=.95+depth*.08, clay=tiles[bay%tiles.length]!;
      piece(u,floor+h,v+s*depth/2,width+.29,rise,depth+.74,clay,'roof');
      box(u,floor+h+rise-.045,v+s*depth/2,width+.35,.115,.18,0x78604d,true);
      box(u,floor+h-.07,v-s*.3,width+.35,.13,.16,0x766153,true);
      box(u,floor+h-.07,rear+s*.28,width+.28,.13,.16,clay,true);
      // Narrow cap shadows and weathered masonry accents; no image pixels.
      for(let k=1;k<=5;k++){
        const n=(k*17+bay*11)%23,a=u0+.42+(width-.84)*n/23;
        const y=floor+slab+.19+(h-slab-1.05)*((k*11+bay*7)%29)/29;
        box(a,y,v-s*.008,.07+((n+k)%4)*.043,.14+(n%4)*.11,.025,brick,true);
      }
      bay++;u0+=width;
    }
  }

  // All street geometry uses the same two trace axes, including the transverse
  // street in front of the camera. Subdivide on the junction to leave no cracks.
  const roadPositions:number[]=[],roadColours:number[]=[];
  const shade=new T.Color();
  function quad(u0:number,v0:number,u1:number,v1:number,offset:number,col:number){
    for(const [u,v] of [[u0,v0],[u0,v1],[u1,v0],[u1,v0],[u0,v1],[u1,v1]] as P[]){
      const p=point(u,surface(u,v)+offset,v);
      roadPositions.push(p.x,p.y,p.z);
      shade.setHex(col).multiplyScalar(.965+.065*(.5+.5*Math.sin(u*8.4+v*14.9)));
      roadColours.push(shade.r,shade.g,shade.b);
    }
  }
  const [a,b,c,d]=layout.patch as Rect, half=3.65;
  const axis=(a:number,b:number)=>{
    const n=Math.ceil((b-a)/3);
    return Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);
  };
  function grid(a:number,b:number,c:number,d:number,offset:number,ink:number){
    const us=axis(a,c),vs=axis(b,d);
    for(let i=1;i<us.length;i++)for(let j=1;j<vs.length;j++)quad(us[i-1]!,vs[j-1]!,us[i]!,vs[j]!,offset,ink);
  }
  // In the atlas, keep the exact streamed civil ribbons through the patch.
  // No second road surface, cut edge or competing grade at the join.
  if(!sharedStreets){
    for(const [l,r] of [[a,-half],[-half,0],[0,half],[half,c]] as const)grid(l,-half,r,half,0,0x9b9078);
    grid(-half,b,half,-half,0,0xa89b82);grid(-half,half,half,d,0,0xa79a80);
  }
  for(const k of [-1,1]){
    for(const [left,right] of [[a,-half-1.65],[half+1.65,c]] as const){
      const v0=k<0?-5.72:half,v1=k<0?-half:5.72;
      grid(left,v0,right,v1,.118,0x9e8a70);
      for(let x=left+.45;x<right;x+=.91){
        const z=k*half;
        box(x,surface(x,z)+.01,z,.89,.14,.16,stone,true);
      }
    }
  }
  const street=new T.BufferGeometry();
  street.setAttribute('position',new T.Float32BufferAttribute(roadPositions,3));
  street.setAttribute('color',new T.Float32BufferAttribute(roadColours,3));
  street.computeVertexNormals();
  const pavement=new T.Mesh(street,patina(new T.MeshLambertMaterial({vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),.32));
  pavement.name='crossroads-paving';pavement.receiveShadow=true;
  pavement.userData={group:'street',role:'road'};group.add(pavement);

  const pole=(u:number,v:number)=>{
    const y=surface(u,v),top=point(u,y+7.5,v);
    rod(point(u,y-.15,v),top,.14,0x685d4e);
    box(u,y+7.1,v,.88,.08,.15,beam,true);
    return top;
  };
  const poles=date==='baseline'?[pole(-9,5.4),pole(17,5.1),pole(48,5.1),pole(80,5.3)]:[];
  for(let i=1;i<poles.length;i++)for(const sag of [.2,.44]){
    const a=poles[i-1]!, b=poles[i]!;
    let before=a.clone().add(new T.Vector3(0,-sag,0));
    for(let k=1;k<=8;k++){
      const t=k/8,p=a.clone().lerp(b,t);
      p.y-=sag+2.5*t*(1-t);
      rod(before,p,.014,0x645a4c);before=p;
    }
  }
  for(const [u,v] of [[7.5,-5.2],[-7.6,4.95],[28,4.9]] as const){
    const y=surface(u,v)+.15;
    box(u,y,v,.49,.43,.39,0x796348);
    box(u+.35,y,v+.30,.41,.27,.4,0x8a6f48);
  }
  function bicycle(u:number,v:number,c:number,turn=0){
    const cs=Math.cos(turn),sn=Math.sin(turn);
    const q=(x:number,y:number,z:number)=>point(u+cs*x-sn*z,y,v+sn*x+cs*z);
    const y=surface(u,v)+.08,a=q(-.53,y+.32,0),b=q(.53,y+.32,0),dir=b.clone().sub(a).normalize();
    const rotation=new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,-Math.atan2(dir.z,dir.x));
    for(const p of [a,b]){
      part('wheel',p,new T.Vector3(1,1,1),rotation,dark);
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3,spoke=p.clone().addScaledVector(dir,Math.cos(angle)*.294);
        spoke.y+=Math.sin(angle)*.294;rod(p,spoke,.007,0x8c867a);
      }
    }
    const seat=q(-.19,y+.9,0),head=q(.34,y+.84,0),pedal=q(-.1,y+.33,0);
    for(const [from,to] of [[a,seat],[a,pedal],[seat,head],[seat,pedal],[head,pedal],[head,b]])rod(from!,to!,.025,c);
    rod(head,q(.39,y+1.04,0),.021,0x807466);
    rod(q(.39,y+1.04,-.18),q(.39,y+1.04,.18),.018,timber);
    box(u-.2,y+.89,v,.25,.09,.12,dark,true);
  }
  bicycle(-6.0,4.6,0x5a6859,.66);bicycle(11.4,-4.44,0x795449,.35);
  if(date==='baseline')bicycle(1.8,2.55,0x525a4e,1.15);

  const geos:Record<Shape,T.BufferGeometry>={
    solid:new T.BoxGeometry(),trim:new T.BoxGeometry(),roof:roofGeometry(),
    wheel:new T.TorusGeometry(.31,.023,5,16),round:new T.CylinderGeometry(1,1,1,6),
  };
  const matte=new T.MeshLambertMaterial(),renderPlaster=patina(new T.MeshLambertMaterial(),.68);
  const roles:Record<Shape,string>={solid:'villageWall',trim:'timber',roof:'villageRoof',wheel:'tyre',round:'steel'};
  const matrix=new T.Matrix4(), colour=new T.Color();
  let triangles=roadPositions.length/9;
  for(const [shape,parts] of batches){
    const mesh=new T.InstancedMesh(geos[shape],shape==='solid'||shape==='roof'?renderPlaster:matte,parts.length);
    mesh.name='crossroads-'+shape;
    mesh.userData={group:shape,role:roles[shape]};
    mesh.castShadow=shape==='solid'||shape==='roof';mesh.receiveShadow=true;
    parts.forEach(({position,rotation,scale,colour:c},i)=>{
      mesh.setMatrixAt(i,matrix.compose(position,rotation,scale));
      mesh.setColorAt(i,colour.setHex(c));
    });
    mesh.computeBoundingSphere();group.add(mesh);
    triangles+=((geos[shape].index?.count??geos[shape].getAttribute('position').count)/3)*parts.length;
  }
  const camera=():StreetView=>{
    const pose=layout.streetCamera;
    const toCamera=([u,v,h]:number[])=>point(u!,surface(u!,v!)+h!,v!).add(group.position);
    return {eye:toCamera(pose.eye),look:toCamera(pose.look),fov:pose.fov};
  };
  return {group,camera,bays:bay,triangles,dispose:()=>{
    for(const child of group.children)if(child instanceof T.InstancedMesh)child.dispose();
    Object.values(geos).forEach(g=>g.dispose());
    street.dispose();pavement.material.dispose();matte.dispose();renderPlaster.dispose();group.clear();
  }};
}
