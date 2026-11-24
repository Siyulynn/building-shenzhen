/** R1's persistent records and derived views (buildings-and-construction §13.1; phase1-slice §12 R1). */
import { describe, expect, it } from 'vitest';
import {
  Rng, SAVE_VERSION, advanceCellWorks, applyZoneAction, cellsOfRuns, cloneState, commitCellWorks, createTickSteps, loadGame, placeStructure,
  runMonths, saveFromJson, saveGame, saveToJson, spatialViews, type GameState, type Save, type StartNetwork,
} from '../src/index.js';
import { content, initial, params, slice } from './fixtures.js';

const W = slice.init.areas.grid.width;
const at = (x: number, y: number) => y * W + x;
const NET = slice.startNetwork;
// The temporary Guangshen road runs along row 377 from x 384 to 387, then north up x 384 (start_network.yaml).
const ZONE_RUNS: [number, number, number][] = [[378, 383, 387], [379, 383, 387], [380, 383, 387], [381, 383, 387]];
// A built spur east of the road's end (R2 will lay these); LINK joins it to the trunk.
const LINK = at(388, 377), SPUR = [at(389, 377), at(390, 377)];

/** A non-trivial R1 state: one zone, every cell committed, some work sunk, a water source on the spur. */
function built(): { s: GameState; zone: number } {
  const s = initial();
  applyZoneAction(s, { type: 'create_zone', use: 'industrial', runs: ZONE_RUNS });
  const zone = s.zones[0]!.id;
  commitCellWorks(s, zone, cellsOfRuns(s.zones[0]!.runs, s.grid), 3);
  expect(advanceCellWorks(s, 7, spatialViews(s, NET).frontage)).toBe(0);
  placeStructure(s, { kind: 'water_source', cell: at(390, 376), attach: SPUR[1]!, capacity: 9 });
  placeStructure(s, { kind: 'facility', cell: at(383, 377), attach: at(384, 377), capacity: 40, facility: 'school' });
  return { s, zone };
}
const DEMAND = { water: new Map([[at(384, 378), 8], [at(385, 378), 8], [at(386, 378), 4]]) };

describe('R1 cell works', () => {
  it('services frontage first: the first cells finish and join servicedLand while their neighbours wait', () => {
    const { s } = built();
    const byCell = new Map(s.cellWorks.map((w) => [w.cell, w]));
    expect(byCell.get(at(384, 378))).toMatchObject({ stage: 'serviced', workDone: 3 });
    expect(byCell.get(at(385, 378))).toMatchObject({ stage: 'serviced', workDone: 3 });
    expect(byCell.get(at(386, 378))).toMatchObject({ stage: 'servicing', workDone: 1 });
    expect(byCell.get(at(383, 378))).toMatchObject({ stage: 'planned', workDone: 0 });   // depth 2: off the road's end
    expect(cellsOfRuns(s.servicedLand, s.grid)).toEqual([at(384, 378), at(385, 378)]);
    expect(s.cellWorks.map((w) => w.cell)).toEqual([...s.cellWorks.map((w) => w.cell)].sort((a, b) => a - b));
  });

  it('reaches the interior only to max_frontage_depth; unreachable works keep their stage and return the units', () => {
    const { s } = built();
    const shallow: StartNetwork = { ...NET, maxFrontageDepth: 2 };
    const reach = spatialViews(s, shallow).frontage;
    expect(reach.get(at(385, 378))?.depth).toBe(1);
    expect(reach.get(at(385, 379))?.depth).toBe(2);
    expect(reach.has(at(385, 380))).toBe(false);
    expect(spatialViews(s, NET).frontage.get(at(383, 381))?.depth).toBe(5);
    const left = advanceCellWorks(s, 1000, reach);
    const deep = s.cellWorks.filter((w) => !reach.has(w.cell));
    expect(deep.length).toBe(11);                           // rows 380–381, and (383,379) at depth 3
    expect(deep.every((w) => w.stage === 'planned' && w.workDone === 0)).toBe(true);
    expect(left).toBe(1000 - (9 * 3 - 7));                   // nine reached cells, 7 units already sunk
    const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
    for (const w of s.cellWorks) {
      expect(w.workDone).toBeGreaterThanOrEqual(0);
      expect(w.workDone).toBeLessThanOrEqual(w.workTotal);
      expect(served.has(w.cell)).toBe(w.stage === 'serviced');
    }
  });

  it('keeps sunk work when its zone is removed; the work then has no reach and takes nothing', () => {
    const { s, zone } = built();
    const before = s.cellWorks.map((w) => ({ ...w }));
    applyZoneAction(s, { type: 'remove_zone', zone });
    const views = spatialViews(s, NET);
    expect(views.frontage.size).toBe(0);
    expect(advanceCellWorks(s, 50, views.frontage)).toBe(50);
    expect(s.cellWorks).toEqual(before);
  });

  it('refuses a commit outside the zone, a second commit and a serviced cell, changing nothing', () => {
    const { s, zone } = built();
    const snapshot = JSON.stringify(s.cellWorks);
    expect(() => commitCellWorks(s, zone, [at(300, 300)], 3)).toThrow(/not in zone/);
    expect(() => commitCellWorks(s, zone, [at(386, 378)], 3)).toThrow(/already has works/);
    expect(() => commitCellWorks(s, zone, [at(384, 378)], 0)).toThrow(/work per cell/);
    expect(JSON.stringify(s.cellWorks)).toBe(snapshot);
  });

  it('places sources and facilities only on playable land, attached at the footprint or a four-neighbour', () => {
    const s = initial();
    const water = (cell: number, attach: number) => placeStructure(s, { kind: 'water_source', cell, attach, capacity: 1 });
    expect(() => water(0, 0)).toThrow(/not playable/);
    expect(() => water(at(386, 376), at(388, 376))).toThrow(/does not touch/);
    expect(() => water(at(386, 376), at(386, 376) + 1 - W)).toThrow(/does not touch/);   // diagonal
    expect(() => placeStructure(s, { kind: 'facility', cell: at(386, 376), attach: at(386, 377), capacity: 5 })).toThrow(/facility type/);
    expect(water(at(386, 376), at(386, 377))).toMatchObject({ id: 1, placed: s.date });
    expect(water(at(386, 376), at(386, 376)).id).toBe(2);
    expect(s.nextStructureId).toBe(3);
  });
});

describe('R1 derived views', () => {
  it('shares one source across connected serviced consumers; an unserviced cell draws nothing', () => {
    const { s } = built();
    const v = spatialViews(s, NET, { roads: [LINK, ...SPUR], demand: DEMAND });
    expect(v.sources.water).toEqual(new Map([[SPUR[1]!, 9]]));
    expect(v.sources.power.size).toBe(0);
    expect(v.supply.water).toEqual(new Map([[at(384, 378), 5], [at(385, 378), 4], [at(386, 378), 0]]));
    expect(v.roads.component.get(SPUR[1]!)).toBe(v.roads.component.get(at(384, 377)));
  });

  it('a severed link keeps the zone its frontage but cuts the remote source off', () => {
    const { s } = built();
    const linked = spatialViews(s, NET, { roads: [LINK, ...SPUR], demand: DEMAND });
    const cut = spatialViews(s, NET, { roads: SPUR, demand: DEMAND });
    expect(cut.frontage).toEqual(linked.frontage);
    expect(cut.roads.component.get(SPUR[1]!)).not.toBe(cut.roads.component.get(at(384, 377)));
    expect([...cut.supply.water.values()]).toEqual([0, 0, 0]);
    expect(spatialViews(s, NET, { demand: DEMAND }).supply.water.get(at(384, 378))).toBe(0);   // no spur road at all
  });

  it('rebuilds identical views after save and load, and again after a stepped quarter', () => {
    const { s } = built();
    // a power source on the start road itself: its split needs nothing beyond the save and the content
    placeStructure(s, { kind: 'power_source', cell: at(386, 376), attach: at(386, 377), capacity: 5 });
    const power = { power: new Map([[at(384, 378), 3], [at(385, 378), 3], [at(383, 378), 3]]) };
    const inputs = { roads: [LINK, ...SPUR], demand: DEMAND };
    const rng = new Rng(7);
    const text = saveToJson(saveGame(s, rng, content));
    const loaded = loadGame(saveFromJson(text));
    expect(loaded.state.cellWorks).toEqual(s.cellWorks);
    expect(loaded.state.structures).toEqual(s.structures);
    expect(loaded.state.nextStructureId).toBe(4);
    expect(spatialViews(loaded.state, NET, { demand: power }).supply.power)
      .toEqual(new Map([[at(383, 378), 0], [at(384, 378), 3], [at(385, 378), 2]]));   // (383,378) is still planned
    expect(spatialViews(loaded.state, NET, { demand: power })).toEqual(spatialViews(s, NET, { demand: power }));
    expect(spatialViews(loaded.state, NET, inputs)).toEqual(spatialViews(s, NET, inputs));

    const steps = createTickSteps(params, slice.tick);
    const a = runMonths(s, 3, rng, undefined, steps), b = runMonths(loaded.state, 3, loaded.rng, undefined, steps);
    expect(saveToJson(saveGame(b, loaded.rng, content))).toBe(saveToJson(saveGame(a, rng, content)));
    expect(a.cellWorks).toEqual(s.cellWorks);                 // no tick step writes works in R1
    expect(a.cellWorks).not.toBe(s.cellWorks);
    expect(a.cellWorks[0]).not.toBe(s.cellWorks[0]);
    expect(a.structures[0]).not.toBe(s.structures[0]);
    expect(spatialViews(b, NET, inputs)).toEqual(spatialViews(a, NET, inputs));
  });

  it('clones the records, so a stepped copy never writes through to its source', () => {
    const { s } = built();
    const c = cloneState(s);
    c.cellWorks[0]!.workDone = 2;
    c.structures[0]!.capacity = 0;
    expect(s.cellWorks[0]!.workDone).toBe(0);
    expect(s.structures[0]!.capacity).toBe(9);
  });

  it('migrates a version 1 save to empty records', () => {
    const s = initial();
    const save = saveFromJson(saveToJson(saveGame(s, new Rng(3), content)));
    expect(save.header.version).toBe(SAVE_VERSION);
    const state = { ...(save.body.state as Record<string, unknown>) };
    delete state.cellWorks; delete state.structures; delete state.nextStructureId;
    const v1: Save = { ...save, header: { ...save.header, version: 1 }, body: { ...save.body, state } };
    const back = loadGame(v1);
    expect(back.header.version).toBe(SAVE_VERSION);
    expect(back.state).toEqual(loadGame(save).state);
  });
});
