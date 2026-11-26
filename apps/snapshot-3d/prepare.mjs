// Read the existing GIS pipeline outputs and copy just the layers used by this viewer.
import { readFile, readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--')) ?? join(here, '../../..'));
const out = join(here, 'public/grid');
const citationsOnly = process.argv.includes('--citations-only');
const grid = citationsOnly ? out : join(source, 'apps/map-spike/public/grid');
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const atlas = await read(join(here, 'atlas.json'));
const observations = await read(join(here, 'kh9-observations.json'));
const municipal = await read(join(here, 'basemap/municipal-picks.json'));
const shenzhenxu = await read(join(here, 'shenzhenxu-lod2.json'));
const bookends = await read(join(here, 'municipal-epochs.json'));
const stageB = await read(join(here, 'stage-b.json'));
const shennan = await read(join(here, 'shennan-review.json'));
const sites = (await read(join(grid, 'sites.json'))).sites;
const meta = await read(join(grid, 'meta.json'));
const n = meta.width * meta.height;
if (meta.crs !== 'EPSG:32650' || meta.cell_m !== 100) throw Error('Unexpected grid registration');
const layers = {'grid.bin':6, 'water1979.bin':1, 'change_79_84.bin':1};
for (const [file, stride] of Object.entries(layers)) {
  if ((await readFile(join(grid, file))).length !== n * stride) throw Error('Invalid layer size: ' + file);
}
const inventories = [...new Set([join(source,'data/evidence'),join(here,'../Shenzhen-step3/data/evidence')])];
const claims = new Map();
for(const evidence of inventories) {
  for (const file of await readdir(join(evidence,'claims'))) {
    if (!file.endsWith('.yaml')) continue;
    for (const c of parse(await readFile(join(evidence, 'claims', file),'utf8'))) {
      if(!claims.has(c.id)) claims.set(c.id,{c,evidence});
    }
  }
}
const ids = new Set([...Object.values(atlas.epochs).flatMap(e => e.claims),
  ...Object.values(atlas.layouts).flatMap(l => l.claims),
  ...observations.places.flatMap(p => p.claims),
  ...shenzhenxu.claims,
  ...bookends.context.claims,...Object.values(bookends.dates).flatMap(e=>e.claims),
   ...bookends.features.flatMap(f=>[...f.claims,...Object.values(f.states).flatMap(s=>s.claims??[])]),
   ...stageB.context,...[...stageB.sites,...stageB.roads,...stageB.extent].flatMap(f=>f.claims),
   ...shennan.views.map(view=>view.claim),...shennan.roads.flatMap(road=>road.claims),
  ...[...municipal.lines,...municipal.areas,...municipal.reservoirs].flatMap(f=>f.claims),
  ...sites.flatMap(s => s.claims.map(c => c.id))]);
const citations = {};
for (const id of ids) {
  const record = claims.get(id);
  if (!record) throw Error('Missing claim in research or atlas checkout: ' + id);
  const {c:claim,evidence}=record;
  const source = claim.source ? parse(await readFile(join(evidence,'sources', claim.source + '.yaml'), 'utf8')) : null;
  citations[id] = {status:claim.status, source:source?.title, url:source?.url, locator:claim.locator};
}
for (const [key, layout] of Object.entries(atlas.layouts)) {
  if (!sites.find(s => s.id === layout.anchor)?.cell) throw Error('Missing site anchor: ' + key);
}
await mkdir(out, {recursive:true});
for (const file of citationsOnly ? [] : ['meta.json','sites.json','landsat1979.png','landsat1984.png','kh9_1980.json','kh9_1980_slice.png', ...Object.keys(layers)]) {
  await copyFile(join(grid,file),join(out,file));
}
await writeFile(join(out,'citations.json'), JSON.stringify(citations));
console.log('Prepared', meta.width, '×', meta.height, 'cells and', ids.size, 'cited records.');
