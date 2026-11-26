// Publish the atlas to the gh-pages branch that GitHub Pages serves.
// Ships the prepared grid only: the reference photographs stay out of the site.
import {execFileSync, execSync} from 'node:child_process';
import {cpSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const app=import.meta.dirname, root=resolve(app,'../..');
const run=(cmd,args,cwd)=>execFileSync(cmd,args,{cwd,stdio:'inherit'});
const capture=(cmd,args,cwd)=>execFileSync(cmd,args,{cwd,encoding:'utf8'}).trim();

// 1. Build without the photo-viewpoint selector; the frames are not part of the site.
execSync('npm run build:atlas',{cwd:root,stdio:'inherit',env:{...process.env,VITE_PHOTO_REVIEW:'0'}});
const dist=join(app,'dist');

// 2. Remove the reference photographs and keep Pages from running Jekyll.
rmSync(join(dist,'photo-review'),{recursive:true,force:true});
writeFileSync(join(dist,'.nojekyll'),'');

// 3. Commit dist to an orphan gh-pages branch from a scratch repository.
const origin=capture('git',['remote','get-url','origin'],root);
if(!origin)throw Error('Add a git remote named origin before publishing.');
const scratch=mkdtempSync(join(tmpdir(),'bs-pages-'));
try{
  run('git',['init','-q'],scratch);
  run('git',['checkout','-q','-b','gh-pages'],scratch);
  cpSync(dist,scratch,{recursive:true});
  run('git',['add','-A'],scratch);
  run('git',['-c','user.name=atlas','-c','user.email=atlas@localhost','commit','-q','-m','Publish the January 1984 atlas'],scratch);
  run('git',['remote','add','origin',origin],scratch);
  run('git',['push','-f','origin','gh-pages'],scratch);
  console.log('Published',dist,'to',origin,'gh-pages');
}finally{
  rmSync(scratch,{recursive:true,force:true});
}
