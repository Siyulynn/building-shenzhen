// Local dimensions are art parameters in metres. Origin is the centre of the ground contact.
type Form='box'|'roof'|'tree';
export interface Piece {form:Form; color:string; x:number;y:number;z:number;w:number;h:number;d:number; tilt:number; ground?:'base'|'tangent'|'footing'}
export function kit(kind:string):Piece[] {
  const p:Piece[]=[];
  function part(color:string,x:number,y:number,z:number,w:number,h:number,d:number,form:Form='box',tilt=0){
    p.push({form,color,x,y,z,w,h,d,tilt});
  }
  const wall='#e1d0a5',tile='#855e4c',cream='#efe1bb',dark='#445c5c',red='#b56d53',grass='#9eac73',earth='#c69e70';
  function shell(w:number,h:number,d:number,color=wall){
    part('#a49986',0,-0.65,0,w+0.6,2.5,d+0.6);
    part(color,0,h/2,0,w,h,d);
  }
  function windows(w:number,d:number,floors:number,bays:number){
    for(const side of [-1,1]) for(let f=0;f<floors;f++) for(let b=0;b<bays;b++) {
      part(dark,w*((b+0.5)/bays-0.5),2+f*3.15,side*(d/2+0.12),Math.min(2.5,w/bays*0.57),1.45,0.24);
    }
  }
  function tree(x:number,z:number){
    part('#81705b',x,1.7,z,0.7,4,0.7);part('#7f9264',x,4.6,z,3.6,3.0,3.6,'tree');
  }
  switch(kind){
    case 'cottage': case 'shop': {
      const shop=kind==='shop',w=shop?14:10,d=shop?11:7,h=shop?5:3.7;
      shell(w,h,d);part(tile,0,h,0,w+1.3,2.15,d+1.8,'roof');
      windows(w,d,1,2);
      part(dark,0,1.25,d/2+0.15,shop?4:1.6,2.5,0.3);
      if(shop){part(red,0,3.4,d/2+1.25,w,0.25,2.6);part('#775c43',0,4.3,d/2+0.2,6,0.85,0.3);}
      else tree(w/2+1,-2);
      break;
    }
    case 'market':
      for(const x of [-6,6]) for(const z of [-4,4]) part('#826c50',x,1.65,z,0.3,3.4,0.3);
      part('#9e8771',0,3.3,0,15,1.3,11,'roof');part(earth,0,0.9,0,12,1,3);break;
    case 'electronics-proxy': {
      const w=53,d=23,h=36,n=9;
      shell(w,h,d,'#d3cfbe');
      // The 1983 street frame suggests a darker blind end and continuous glazing.
      part('#929287',w/2+.025,h/2,0,.06,h,d);
      for(const side of [-1,1])for(let f=0;f<n;f++){
        const y=2.25+f*3.72;
        part('#4e6061',-2,y,side*(d/2+.08),45,1.68,.18);
        for(let x=-23;x<=20;x+=2.9)part('#969b90',x,y,side*(d/2+.17),.17,1.68,.10);
      }
      for(let f=0;f<n;f++)part('#495854',w/2+.08,2.25+f*3.72,2,.19,.75,4.6);
      part('#bcb7a6',0,3.95,d/2+1,13,.35,2.4);
      part('#a29e8f',0,h+.22,0,w+.25,.44,d+.25);break;
    }
    case 'civic-slab': case 'civic-wing': {
      // The storey count is evidence-informed; all spans, bays and heights are illustrative.
      const wing=kind==='civic-wing',w=wing?18:78,d=wing?14:19,n=wing?2:6,bay=3.2;
      const floor=3.2,h=n*floor+.35,bays=wing?4:22,band=bays*bay;
      shell(w,h,d,wing?'#cdc6b5':'#d9d3c2');
      part('#b7b1a1',0,h+.19,0,w+.6,.38,d+.6);
      for(const side of [-1,1])for(let f=0;f<n;f++){
        const z=side*(d/2+.09),y=2.1+f*floor;
        part('#52605d',0,y,z,band,1.42,.20);
        for(let b=0;b<=bays;b++)part('#92948a',b*bay-band/2,y,z+side*.11,.17,1.42,.12);
        part('#c4beaf',0,y-.78,z,band+.43,.16,.37);
      }
      if(!wing){
        part('#62665d',16,1.5,d/2+.21,5.6,2.95,.24);
        part('#c9c2b2',16,3.22,d/2+.95,8,.28,2.5);
        part('#b9b2a1',16,.14,d/2+.54,7,.28,1.6);
      }
      break;
    }
    case 'civic-portal': {
      part('#d4cebd',0,3.95,0,24,.62,4.1);
      part('#b9b0a0',0,3.63,0,23.2,.22,3.8);
      for(const x of [-10.3,-7.7,7.7,10.3])for(const z of [-1.32,1.32]){
        part('#c7c1b0',x,1.15,z,.61,4.76,.61);
        p[p.length-1]!.ground='footing';
      }
      break;
    }
    case 'civic-forecourt': {
      // Small grade-following sections meet the existing relief, not a new road or DEM cut.
      const placed=(c:string,x:number,y:number,z:number,w:number,h:number,d:number,ground:Piece['ground']='tangent')=>{
        part(c,x,y,z,w,h,d);p[p.length-1]!.ground=ground;
      };
      for(let z=-30;z<=10;z+=4)placed('#c0b49e',0,.04,z,8.4,.44,4.04);
      for(const x of [-22,-18,-14,-10,10,14,18,22]){
        placed('#b8b1a2',x,.36,2,4.05,.82,.48);
        placed('#858e68',x,.31,-.35,4.05,.72,1.28);
      }
      for(const x of [-13,13]){
        placed('#c3b398',x,.1,-13,7,.47,4.4);
        placed('#92946c',x,.29,-13,6.5,.26,3.9);
        for(const dx of [-2,0,2])placed('#a38470',x+dx,.46,-13,1.35,.28,.75);
      }
      for(const x of [-24,24]){
        tree(x,-15);
        for(const piece of p.slice(-2))piece.ground='base';
      }
      break;
    }
    case 'guoshang-proxy': {
      shell(44,7.1,30,'#bcb6a5');
      part('#cecbbd',0,31.2,-2,31.8,49,21);
      part('#d9d4c3',0,7.33,0,44.4,.46,30.4);
      part('#9f9a8e',0,55.9,-2,32.1,.72,21.3);
      part('#b8b3a4',4,57,-4,10,2.3,8);
      for(const side of [-1,1]){
        for(let f=0;f<15;f++)for(let b=0;b<8;b++)
          part('#53635f',-13.6+3.88*b,9.2+3.08*f,-2+side*10.57,2.2,1.42,.16);
        for(let f=0;f<15;f++)for(let b=0;b<5;b++)
          part('#68736a',side*15.98,9.2+3.08*f,-10+4*b,.16,1.42,2);
      }
      part('#d6cbb6',0,5.8,15.65,43,.28,1.5);
      for(let b=0;b<9;b++)part('#50605d',-18+4.5*b,3.2,15.08,3.15,4.1,.16);
      part('#77766a',0,3.1,15.27,6.3,3.9,.28);
      part('#bbb4a3',0,5.13,16.3,10,.30,2.9);
      part('#50605d',0,2.67,-15.09,7.8,3.5,.19);
      part('#bbb4a3',0,4.55,-15.9,11,.31,2.7);
      break;
    }
    case 'villa': case 'store': case 'factory': case 'dorm': case 'station': {
      const sizes:Record<string,[number,number,number,number]>={villa:[12,9,2,3],store:[30,19,3,7],factory:[52,22,4,10],dorm:[43,13,3,9],station:[58,15,1,11]};
      const [w,d,floors,bays]=sizes[kind]!,h=floors*3.15+0.6;
      shell(w,h,d,kind==='factory'?'#c8d2c6':cream);windows(w,d,floors,bays);
      for(let f=1;f<=floors;f++) part('#d3c4a8',0,f*3.15,0,w+0.7,0.28,d+0.7);
      part('#786f62',0,h+0.15,0,w+1.0,0.4,d+1.0);
      if(kind==='villa') {
        part('#dbc794',0,3.45,d/2+1.25,7,0.4,2.5);
        part('#ddd3b7',0,4.1,d/2+2.4,7,0.95,0.23);
        tree(-w/2-1,2);
      } else if(kind==='station') part('#7f9389',0,3,d/2+3,w+3,0.4,6);
      break;
    }
    case 'shed':
      shell(27,4.5,12,'#d1c6aa');part('#859995',0,4.5,0,29,2,14,'roof');
      part(dark,5,1.8,6.1,5,3.6,0.25); break;
    case 'field':case 'pond':{
      const pond=kind==='pond',w=pond?69:39,d=pond?42:20;
      part(pond?'#799f99':'#abaf79',0,0.17,0,w,0.45,d);
      for(const sign of [-1,1]){
        part(grass,0,0.46,sign*d/2,w+1,0.6,1.3);
        part(grass,sign*w/2,0.46,0,1.3,0.6,d+1);
      }
      if(!pond)for(let z=-7;z<9;z+=3) part('#879c66',0,0.48,z,w-3,0.37,1.35);
      break;
    }
    case 'laneEW':case 'laneNS':case 'road':{
      const ns=kind==='laneNS',road=kind==='road';
      part(road?'#aa9276':'#baaa8c',0,0.16,0,ns?5:72,0.45,ns?64:road?12:5);break;
    }
    case 'rail':
      part('#a89786',0,0.2,0,4.7,0.55,64);
      for(let z=-30;z<32;z+=4)part('#786a5d',0,0.54,z,3.1,0.25,0.55);
      for(const x of [-0.78,0.78])part('#687575',x,0.75,0,0.18,0.25,64);
      break;
    case 'crossing':
      part('#a99b86',0,1.8,0,10,2.1,43);
      for(const x of [-4.8,4.8])part(cream,x,3.4,0,0.5,1.2,43);
      part('#bda588',-8,2,-13,5,4,5);part(tile,-8,4,-13,6,1.2,6,'roof');break;
    case 'siteyard':
      part('#c99e78',0,0,0,114,0.46,47);
      for(let x=35;x<54;x+=4)part('#8e7464',x,0.75,13,2.5,1.45,12);
      break;
    case 'guomao': case 'guomao-overview': {
      // An open shaft with a working deck. Neither the height nor the visible number of decks is a January measurement.
      const top=69, overview=kind==='guomao-overview';
      part('#a99c8c',0,-.7,0,31,2.4,28);
      part('#a49e91',-1,top/2,0,11,top,9.5);
      for(let y=1;y<top-2;y+=overview?11.4:3.8)
        part('#c6bfac',0,y,0,29,.43,26);
      for(const x of [-12,0,12])for(const z of [-11,11])
        part('#a49e91',x,top/2,z,1.2,top,1.2);
      part('#b1a18a',0,top-.5,0,30,.65,27);
      for(const side of [-1,1]){
        part('#7b796a',0,top+1.1,side*13.5,29,.2,.22);
        part('#7b796a',side*14.7,top+1.1,0,.22,.2,27);
        if(!overview){
          for(let x=-13.5;x<=14;x+=3)part('#6e6a5b',x,top+.55,side*13.5,.18,2.0,.18);
          for(let z=-12;z<=12;z+=3)part('#6e6a5b',side*14.7,top+.55,z,.18,2.0,.18);
        }
      }
      for(const x of [17,20])part('#bc8b4c',x,41,0,.6,82,1.6);
      for(let y=4;y<82;y+=overview?12:4)part('#ba9057',18.5,y,0,.4,4.7,.7,'box',.68);
      part('#c09557',8,81,0,52,1.4,2);
      part('#666f65',30,80,0,7,3.5,3);
      part('#747769',-13,73.5,0,.25,14,.25);
      break;
    }
    default:throw Error('Unknown kit part: '+kind);
  }
  return p;
}
