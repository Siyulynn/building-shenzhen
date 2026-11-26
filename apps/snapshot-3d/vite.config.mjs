import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

// Serve only the registered high-resolution chip on the local dev server. No private warps
// or new imagery are copied to dist or to the offline HTML.
const chip=fileURLToPath(new URL('../../../georef/kh9_1980_core_2m.png',import.meta.url));
export default defineConfig({
  // Keep the previous standalone atlas previews for direct comparison.
  build:{emptyOutDir:false},
  plugins:[{
    name:'local-kh9-review-chip',
    configureServer(server){
      server.middlewares.use(async (req,res,next)=>{
        if ((req.method!=='GET'&&req.method!=='HEAD') || req.url?.split('?')[0]!=='/review/kh9-core.png') return next();
        try {
          const {size}=await stat(chip);
          res.setHeader('Content-Type','image/png');
          res.setHeader('Content-Length',size);
          res.setHeader('Cache-Control','no-store');
          if (req.method==='HEAD') return res.end();
          const stream=createReadStream(chip);
          res.on('close',()=>stream.destroy());
          stream.on('error',()=>res.destroy());
          stream.pipe(res);
        } catch {
          res.statusCode=404;res.end('Local review chip not prepared');
        }
      });
    },
  }],
});
