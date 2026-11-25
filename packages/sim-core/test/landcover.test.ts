/** R8a: the land-cover layer, site formation by class and land compensation (phase1-slice §5.5). */
import { describe, expect, it } from 'vitest';
import {
  LAND_COVER_CLASSES, Rng, applyTurnAction, compileLandCover, createTickSteps, developableCells, firstOption, landCoverAt,
  loadGame, saveFromJson, step, saveGame, saveToJson, zoneCapacityM2, type GameState, type LandCoverClass,
  type LandCoverContent, type PlayerAction,
} from '../src/index.js';
import { areasJson, buildable, content, initial, params, readRepo, sha256, slice, UNGATED } from './fixtures.js';
import { checkInvariants } from './invariants.js';

const LC = UNGATED.landcover!;
const RAW = JSON.parse(readRepo('data/starts/slice_landcover.json')) as LandCoverContent;
const STEPS = createTickSteps(params, UNGATED);
const W = slice.init.areas.grid.width;
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);
const S = params.works!.service, F = params.growth!.land_cover!;
const ROUTES = new Set(slice.startNetwork.routes.flatMap((r) => r.cells));
/** The first cell of a class in a playable area, in cell order, off the start network's routes. */
function cellOf(k: LandCoverClass, area?: number): number {
  for (const a of slice.init.areas.areas) {
    if (a.access !== 'playable' || (area !== undefined && a.id !== area)) continue;
    const s = initial();
    const cells = s.areas.find((x) => x.id === a.id)!.cells;
    for (const c of cells) if (landCoverAt(LC, c) === k && !ROUTES.has(c)) return c;
  }
  throw new Error(`no ${k} cell`);
}
const oneCell = (c: number, use: 'industrial' | 'residential' = 'industrial'): PlayerAction =>
  ({ type: 'create_zone', use, runs: [[Math.floor(c / W), c % W, c % W]] });
const compensations = (s: GameState) => s.fiscal.obligations.filter((o) => o.kind === 'compensation');

describe('R8a: the land-cover layer', () => {
  it('partitions every playable area: each cell one class, no gaps, nothing outside', () => {
    const s = initial();
    for (const a of s.areas) {
      if (a.access !== 'playable') continue;
      const rec = RAW.areas.find((x) => x.id === a.id)!;
      expect(rec.cell_count).toBe(a.cells.length);
      for (const c of a.cells) expect(landCoverAt(LC, c)).toBeDefined();
      const counts = Object.fromEntries(LAND_COVER_CLASSES.map((k) => [k, 0]));
      for (const c of a.cells) counts[landCoverAt(LC, c)!]!++;
      expect(counts).toEqual(rec.counts);
    }
    // nothing outside the playable areas has a class
    const inside = new Uint8Array(LC.classOf.length);
    for (const a of s.areas) if (a.access === 'playable') for (const c of a.cells) inside[c] = 1;
    let stray = 0;
    for (let c = 0; c < LC.classOf.length; c++) if (!inside[c] && LC.classOf[c] !== 255) stray++;
    expect(stray).toBe(0);
    // the buildable cells are exactly the formable classes'
    expect([...buildable.cells]).toEqual([...LC.formable]);
    expect([...LC.formable].every((c) => ['upland', 'lowland_farm', 'pond', 'town'].includes(landCoverAt(LC, c)!))).toBe(true);
  });

  it('refuses a layer from other areas, with a gap, an overlap or a cell outside its area, or at a status above lead', () => {
    const clone = () => JSON.parse(JSON.stringify(RAW)) as LandCoverContent;
    expect(() => compileLandCover({ ...clone(), areas_sha256: 'x' }, areasJson)).toThrow(/other areas/);
    const gap = clone();
    gap.areas[0]!.runs.lowland_farm = gap.areas[0]!.runs.lowland_farm!.slice(1);
    expect(() => compileLandCover(gap, areasJson)).toThrow(/no class/);
    const overlap = clone();
    overlap.areas[0]!.runs.pond = [...(overlap.areas[0]!.runs.pond ?? []), overlap.areas[0]!.runs.lowland_farm![0]!];
    expect(() => compileLandCover(overlap, areasJson)).toThrow(/two classes/);
    const outside = clone();
    outside.areas[0]!.runs.water = [[0, 0, 0]];
    expect(() => compileLandCover(outside, areasJson)).toThrow(/outside the area/);
    expect(() => compileLandCover({ ...clone(), evidence_status: 'sourced' }, areasJson)).toThrow(/placeholder at lead/);
  });
});

describe('R8a: site formation by land cover', () => {
  it('a pond cell costs more work and money to form than a lowland_farm cell, at the order\'s one rate', () => {
    const s = initial();
    const pond = cellOf('pond'), farm = cellOf('lowland_farm');
    apply(s, oneCell(pond));
    apply(s, oneCell(farm));
    apply(s, { type: 'commit_works', zone: 1 });
    apply(s, { type: 'commit_works', zone: 2 });
    const [p, f] = s.worksOrders;
    expect(p!.unitsTotal).toBe(Math.round(S.units_per_cell * F.pond.cost));
    expect(f!.unitsTotal).toBe(Math.round(S.units_per_cell * F.lowland_farm.cost));
    expect(p!.budget).toBeGreaterThan(f!.budget);
    for (const o of [p!, f!]) expect(o.budget).toBe(Math.round(o.unitsTotal * S.yuan_per_cell / S.units_per_cell));
  });

  it('a village cell is legal to zone, adds no capacity, and refuses site formation with a named reason', () => {
    const s = initial();
    const v = cellOf('village');
    apply(s, oneCell(v));
    const z = s.zones[0]!;
    expect(zoneCapacityM2(s, z, params, buildable)).toBe(0);
    expect(developableCells(s, { network: slice.startNetwork, buildable }).get(z.id) ?? []).toEqual([]);
    expect(() => apply(s, { type: 'commit_works', zone: z.id })).toThrow(/no formable land/);
    expect(() => apply(s, { type: 'commit_works', zone: z.id, cells: z.runs })).toThrow(/land cover is village, which is not formable/);
    expect(s.worksOrders).toEqual([]);
    for (const k of ['water', 'hill'] as const) {
      const t = initial();
      apply(t, oneCell(cellOf(k)));
      expect(() => apply(t, { type: 'commit_works', zone: 1 })).toThrow(/no formable land/);
    }
  });

});

describe('R8a: land compensation', () => {
  it('is posted once, on commit, due the next month; cancel refunds nothing and a recommit owes nothing', () => {
    const s = initial();
    const farm = cellOf('lowland_farm'), town = cellOf('town');
    apply(s, { type: 'create_zone', use: 'industrial', runs: [[Math.floor(farm / W), farm % W, farm % W],
      [Math.floor(town / W), town % W, town % W]].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!) as [number, number, number][] });
    expect(compensations(s)).toEqual([]);
    apply(s, { type: 'commit_works', zone: 1 });
    const [c] = compensations(s);
    expect(compensations(s).length).toBe(1);
    expect(c).toMatchObject({ from: s.date + 1, until: s.date + 1, index: 'none', createdBy: `works.${s.worksOrders[0]!.id}`,
      perMonth: Math.round((F.lowland_farm.compensation + F.town.compensation) * S.yuan_per_cell) });
    expect(s.requisitioned).toEqual([farm, town].sort((a, b) => a - b));
    apply(s, { type: 'cancel_works', order: s.worksOrders[0]!.id });
    expect(compensations(s).length).toBe(1);                 // cancelling refunds nothing
    apply(s, { type: 'commit_works', zone: 1 });
    expect(compensations(s).length).toBe(1);                 // requisitioned land never owes again
    expect(s.requisitioned).toEqual([farm, town].sort((a, b) => a - b));
  });

  it('is paid from the reserve next month with money whole, and survives a save with the requisitioned list', () => {
    let s = initial();
    const farm = cellOf('lowland_farm');
    const rng = new Rng(3);
    for (let m = 0; m < 3; m++) {
      const acts: PlayerAction[] = [...firstOption(s, s.pendingCards), ...(m === 0 ? [oneCell(farm), { type: 'commit_works', zone: 1 } as PlayerAction] : [])];
      const r = step(s, acts, rng, STEPS);
      if (r.status !== 'advanced') throw new Error(r.status);
      checkInvariants(s, r.state, r.events);
      s = r.state;
    }
    const end = s;
    const ref = compensations(end)[0]!;
    expect(ref.perMonth).toBe(F.lowland_farm.compensation * S.yuan_per_cell);
    const paid = (d: number) => end.fiscal.ledger.filter((l) => l.type === 'obligation' && l.date === d && l.ref === ref.createdBy)
      .reduce((n, l) => n - l.amount, 0);
    expect(paid(ref.from)).toBe(ref.perMonth);
    expect(paid(ref.from + 1)).toBe(0);                        // once
    const back = loadGame(saveFromJson(saveToJson(saveGame(end, new Rng(1), content))));
    expect(back.state.requisitioned).toEqual([farm]);
    expect(back.header.content.landcover_sha256).toBe(sha256(readRepo('data/starts/slice_landcover.json')));
  });
});
