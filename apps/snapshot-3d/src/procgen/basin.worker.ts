import {tileBuilder,type TileRequest,type TileReply} from './tile-build';

const build=tileBuilder();
self.onmessage=({data:{id,request}}:MessageEvent<{id:number;request:TileRequest}>)=>{
  try{
    const {result,transfer}=build(request);
    self.postMessage({id,result} satisfies TileReply,{transfer});
  }catch(error){
    self.postMessage({id,error:(error as Error).message} satisfies TileReply);
  }
};
