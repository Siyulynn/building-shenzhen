// Copy the September 1980 base-map export into the viewer as `core-basin-gis.json`.
// The export lives outside this repository (build/3d-snapshots/georef/), so the viewer keeps
// a checked-in copy with the source hash. Coordinates stay in UTM 50N metres; the viewer
// converts them to atlas world metres (x = E - 164450, z = 2533850 - N).
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(process.argv[2] ?? join(here, '../../../georef/core-basin-1980-09-11.json'));
const bytes = await readFile(input);
const map = JSON.parse(bytes.toString('utf8'));
const fail = message => { throw Error(`${input}: ${message}`); };
if (map.format !== 'sz-core-basin-map-v1') fail('unexpected format ' + map.format);
if (map.crs !== 'EPSG:32650' || map.units !== 'm') fail('expected UTM 50N metres');
const [w, s, e, n] = map.bounds;
if (w !== 198800 || s !== 2494100 || e !== 205600 || n !== 2497400) fail('bounds moved: ' + map.bounds);
if (map.grid_cell_edges.join() !== '344,365,412,398') fail('grid cell edges moved: ' + map.grid_cell_edges);
// Mesh inputs only. area_picks stay for mask references (pilot extent, envelopes);
// reference_lines duplicate the river and the eastern approach and are left out.
const keep = ['cover', 'alignments', 'area_picks', 'crossings', 'bank_spans', 'fabric_axes', 'places'];
for (const layer of keep) if (!Array.isArray(map.layers[layer])) fail('missing layer ' + layer);
const inside = ([x, y]) => x >= w - 1 && x <= e + 1 && y >= s - 1 && y <= n + 1;
const rings = g => g.type === 'Point' ? [[g.coordinates]] : g.type === 'LineString' ? [g.coordinates] : g.coordinates;
for (const layer of keep) for (const f of map.layers[layer]) {
  for (const ring of rings(f.geometry)) if (!ring.every(inside)) fail(`${f.id} leaves the window`);
}
const out = {
  format: map.format, crs: map.crs, units: map.units, date: map.date, status: map.status,
  bounds: map.bounds, grid_cell_edges: map.grid_cell_edges, registration: map.registration,
  source: {file: 'build/3d-snapshots/georef/core-basin-1980-09-11.json',
    sha256: createHash('sha256').update(bytes).digest('hex'), inputs: map.inputs},
  checks: map.checks,
  layers: Object.fromEntries(keep.map(k => [k, map.layers[k]])),
};
await writeFile(join(here, 'core-basin-gis.json'), JSON.stringify(out));
console.log('core-basin-gis.json:', keep.map(k => `${k} ${out.layers[k].length}`).join(', '));
