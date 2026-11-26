declare global { interface Window { atlasFiles?: Record<string,string> } }
// The portable build embeds precisely the same bytes as the served viewer.
export async function bytes(file:string) {
  const packed=window.atlasFiles?.[file];
  if(packed) {
    const compressed=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
    return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  const r=await fetch('./grid/'+file);
  if(!r.ok)throw Error(file+' · HTTP '+r.status);
  return r.arrayBuffer();
}
export async function json<T>(file:string):Promise<T>{
  return JSON.parse(new TextDecoder().decode(await bytes(file)));
}
