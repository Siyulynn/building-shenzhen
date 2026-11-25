/**
 * The start's land-cover layer (phase1-slice.md §5.5, R8a): one class per 100 m cell of the playable areas, compiled from
 * data/starts/slice_landcover.json (pipeline/m3c_landcover.py). Content, never state. It replaces the boolean
 * buildable layer: the buildable cells are the formable classes' cells, site formation's work and cost follow the
 * class, and committing a cell owes a one-off land compensation. The layer is a placeholder, every class a lead.
 */
import type { LandCoverParams, SliceParams } from './params.js';
import type { AreasContent } from './state.js';
import { cellsOfRuns } from './zones.js';

export const LAND_COVER_CLASSES = ['water', 'tidal_flat', 'pond', 'hill', 'village', 'town', 'upland', 'lowland_farm'] as const;
export type LandCoverClass = (typeof LAND_COVER_CLASSES)[number];
/**
 * The classes site formation can work (decided, §5.5). Villages are not formable in Phase 1: development wraps around
 * them. Water and tidal flats need reclamation, hills terracing; neither is modelled.
 */
export const FORMABLE_CLASSES: readonly LandCoverClass[] = ['upland', 'lowland_farm', 'pond', 'town'];
/** Classes a road crosses as a bridge (§13.2): no land under it. */
export const BRIDGE_CLASSES: readonly LandCoverClass[] = ['water', 'tidal_flat'];
const NONE = 255;

/** data/starts/slice_landcover.json, parsed. */
export interface LandCoverContent {
  format: number; areas_sha256: string; placeholder: boolean; evidence_status: string;
  classes: string[];
  claims: { id: string; use: string }[];
  grid: { width: number; height: number };
  areas: { id: number; key: string; cell_count: number; counts: Record<string, number>; runs: Partial<Record<string, [number, number, number][]>> }[];
}

/** The compiled layer: a class index per grid cell (255 outside the playable areas) and the sorted formable cells. */
export interface LandCover {
  classOf: Uint8Array;
  width: number;
  formable: Uint32Array;
}

/**
 * Compile the layer. Fails unless it was compiled from these areas and this grid, and unless each playable area's
 * classes partition its cells exactly (no gap, no overlap, nothing outside it).
 */
export function compileLandCover(raw: LandCoverContent, areas: AreasContent): LandCover {
  if (raw.format !== 1) throw new Error(`landcover: unknown format ${raw.format}`);
  if (raw.areas_sha256 !== areas.areas_sha256) throw new Error('landcover: compiled from other areas; rerun pipeline/m3c_landcover.py');
  const { width, height } = areas.grid;
  if (raw.grid.width !== width || raw.grid.height !== height) throw new Error('landcover: grid size differs');
  if (raw.classes.length !== LAND_COVER_CLASSES.length || raw.classes.some((c, i) => c !== LAND_COVER_CLASSES[i])) {
    throw new Error(`landcover: classes must be ${LAND_COVER_CLASSES.join(', ')}, in that order`);
  }
  if (raw.placeholder !== true || raw.evidence_status !== 'lead') throw new Error('landcover: the layer is a placeholder at lead');
  const classOf = new Uint8Array(width * height).fill(NONE);
  for (const a of areas.areas) {
    if (a.access !== 'playable') continue;
    const rec = raw.areas.find((x) => x.id === a.id);
    if (!rec) throw new Error(`landcover: no classes for playable area ${a.id}`);
    const inside = new Set(cellsOfRuns(a.runs, areas.grid));
    let n = 0;
    for (const [k, cls] of LAND_COVER_CLASSES.entries()) {
      for (const c of cellsOfRuns(rec.runs[cls] ?? [], areas.grid)) {
        if (!inside.has(c)) throw new Error(`landcover: area ${a.id}'s ${cls} cell ${c} is outside the area`);
        if (classOf[c] !== NONE) throw new Error(`landcover: cell ${c} has two classes`);
        classOf[c] = k;
        n++;
      }
    }
    if (n !== inside.size) throw new Error(`landcover: area ${a.id} has ${inside.size - n} cells with no class`);
  }
  for (const k of Object.keys(raw.areas.flatMap((a) => Object.keys(a.runs)).reduce((o, c) => ({ ...o, [c]: 1 }), {}))) {
    if (!(LAND_COVER_CLASSES as readonly string[]).includes(k)) throw new Error(`landcover: unknown class ${k}`);
  }
  const formable: number[] = [];
  const fk = new Set(FORMABLE_CLASSES.map((c) => LAND_COVER_CLASSES.indexOf(c)));
  classOf.forEach((k, c) => { if (fk.has(k)) formable.push(c); });
  return { classOf, width, formable: Uint32Array.from(formable) };
}

/** The class of a cell, or undefined off the playable areas. */
export function landCoverAt(lc: LandCover, cell: number): LandCoverClass | undefined {
  const k = lc.classOf[cell];
  return k === undefined || k === NONE ? undefined : LAND_COVER_CLASSES[k];
}
export const isFormable = (lc: LandCover, cell: number) => {
  const c = landCoverAt(lc, cell);
  return c !== undefined && FORMABLE_CLASSES.includes(c);
};
export const needsBridge = (lc: LandCover, cell: number) => {
  const c = landCoverAt(lc, cell);
  return c !== undefined && BRIDGE_CLASSES.includes(c);
};

/** A formable class's multipliers (§5.5): 1 and 0 without the layer or params, so fixtures cost as before. */
export function coverFactors(p: SliceParams, lc: LandCover | undefined, cell: number): { cost: number; compensation: number } {
  const c = lc ? landCoverAt(lc, cell) : undefined;
  const f = c ? p.growth?.land_cover?.[c as keyof LandCoverParams] : undefined;
  return f ? { cost: f.cost, compensation: f.compensation } : { cost: 1, compensation: 0 };
}
