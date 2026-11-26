// Produce a network-independent, double-clickable copy of the production build.
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const dist=new URL('./dist/',import.meta.url);
let html=await readFile(new URL('index.html',dist),'utf8');
const script=html.match(/<script type="module"[^>]* src="([^"]+)"[^>]*><\/script>/);
const css=html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if(!script||!css)throw Error('Expected a single Vite entry and stylesheet. Run the production build first.');
const files={};
for(const file of ['grid.bin','water1979.bin','change_79_84.bin','landsat1979.png','landsat1984.png','kh9_1980.json','kh9_1980_slice.png','meta.json','sites.json','citations.json']){
  files[file]=gzipSync(await readFile(new URL('grid/'+file,dist))).toString('base64');
}
const relief=await readFile(new URL('grid/core-relief.json',dist)).catch(e=>{if(e.code!=='ENOENT')throw e;});
if(relief)files['core-relief.json']=gzipSync(relief).toString('base64');
for(const file of ['municipal-gis.json','municipal-water.bin']){
  files[file]=gzipSync(await readFile(new URL('grid/'+file,dist))).toString('base64');
}
const code=await readFile(new URL(script[1],dist),'utf8');
const style=await readFile(new URL(css[1],dist),'utf8');
const license=await readFile(new URL('./node_modules/three/LICENSE',import.meta.url),'utf8');
html=html.replace(css[0],()=>'<style>'+style+'</style>').replace(script[0],()=>'');
html=html.replace('</body>',()=>'<script type="text/plain" id="three-license">'+license+'</script><script>window.atlasFiles='+JSON.stringify(files)+'</script><script type="module">'+code.replace(/<\/script/gi,'<\\/script')+'</script></body>');
const target=new URL(process.argv[2]??'Shenzhen_January_1984_Shennan.html',dist);await writeFile(target,html);console.log(fileURLToPath(target));
