// Offline comparison sheet; embeds only the procedural renderer, no atlas imagery or GIS.
import {build} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const local=p=>new URL(p,import.meta.url);
const {output}=await build({configFile:false,root:fileURLToPath(local('./')),publicDir:false,
  build:{target:'es2022',write:false,rollupOptions:{input:fileURLToPath(local('./src/kit-review.ts'))}}});
const html=await readFile(local('./kits.html'),'utf8'), license=await readFile(local('../../node_modules/three/LICENSE'),'utf8');
const script='<script type="module">'+output[0].code.replace(/<\/script/gi,'<\\/script')+'</script>';
await mkdir(local('./dist/'),{recursive:true});
const target=local('./dist/Shenzhen_Archetype_Study.html');
await writeFile(target,html.replace('<script type="module" src="./src/kit-review.ts"></script>',
  ()=>'<script type="text/plain" id="three-license">'+license+'</script>'+script));
console.log(fileURLToPath(target));
