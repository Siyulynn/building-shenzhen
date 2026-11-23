/** M3a's tests (phase1-slice.md §5.3): zone validity, the template, historical names, no economic effect, determinism. */
import { describe, expect, it } from 'vitest';
import {
  Rng, assignZoneNames, compilePrecedents, createTickSteps, loadGame, playableAreaOf, replay, runMonths, saveFromJson,
  saveGame, saveToJson, step, templateZoneAction, validateParams, zoneCellsAllowed, zoneLabel,
  type CellRuns, type GameState, type PlayerAction, type TickStep, type Zone,
} from '../src/index.js';
import { areasJson, content, initial, params, precedents } from './fixtures.js';

const STEPS = createTickSteps(params, precedents);
const P = (key: string) => precedents.find((p) => p.id === `precedent.zone.${key}`)!;
const SHANGBU = 'precedent.zone.shangbu_industrial';
const SHUIBEI = 'precedent.zone.shuibei_industrial';

/** A rectangle of runs: x0..x1 by y0..y1, inclusive. */
const rect = (x0: number, x1: number, y0: number, y1: number): CellRuns => {
  const r: CellRuns = [];
  for (let y = y0; y <= y1; y++) r.push([y, x0, x1]);
  return r;
};
// The Shangbu template is x 349–354 by y 370–375, all in area 7 (centroid [351.5, 372.5]).
const SHANGBU_SQUARE = rect(349, 354, 370, 375);

/** Apply actions and run one month; throws unless it advanced. */
function month(s: GameState, actions: PlayerAction[] = [], steps: readonly TickStep[] = STEPS, rng = new Rng(1)): GameState {
  const r = step(s, actions, rng, steps);
  if (r.status !== 'advanced') throw new Error(r.status);
  return r.state;
}
const zone = (s: GameState, id: number): Zone => s.zones.find((z) => z.id === id)!;
const nameOf = (s: GameState, id: number) => {
  const n = zone(s, id).name;
  return n.kind === 'precedent' ? n.precedent : n.kind;
};
const create = (runs: CellRuns, use: Zone['use'] = 'industrial'): PlayerAction => ({ type: 'create_zone', use, runs });

describe('M3a precedents', () => {
  it('compiles the template: placed squares clipped to the grid, the unplaced one empty', () => {
    expect(P('shangbu_industrial').cells).toHaveLength(36);
    expect(P('shangbu_industrial').centroid).toEqual([351.5, 372.5]);
    expect(P('bagualing_industrial').cells).toHaveLength(0);
    expect(P('bagualing_industrial').centroid).toBeNull();
    const s = initial();
    expect(new Set(P('shangbu_industrial').cells.map((c) => playableAreaOf(s, c)))).toEqual(new Set([7]));
    const edge = compilePrecedents([{ id: 'p.edge', kind: 'zone', name: { zh: '边', en: 'Edge' }, use: 'public',
      geometry: { kind: 'square', cell: [0, 0], side: 6 } }], areasJson);
    expect(edge[0]!.cells).toHaveLength(16);                       // x and y 0..3: the rest is off the grid
  });

  it('refuses bad precedent records', () => {
    const ok = { id: 'p.a', kind: 'zone', name: { zh: '甲', en: 'A' }, use: 'industrial', geometry: { kind: 'unplaced' } };
    expect(() => compilePrecedents([ok, ok], areasJson)).toThrow(/duplicate/);
    expect(() => compilePrecedents([{ ...ok, kind: 'landmark' }], areasJson)).toThrow(/not supported/);
    expect(() => compilePrecedents([{ ...ok, use: 'farm' }], areasJson)).toThrow(/land use/);
    expect(() => compilePrecedents([{ ...ok, name: { zh: '甲' } }], areasJson)).toThrow(/zh and en/);
    expect(() => compilePrecedents([{ ...ok, geometry: { kind: 'circle' } }], areasJson)).toThrow(/geometry/);
    expect(() => compilePrecedents([{ ...ok, geometry: { kind: 'square', cell: [5000, 5000], side: 2 } }], areasJson))
      .toThrow(/no cell inside the grid/);
  });

  it('validates the zoning params', () => {
    const z = params.zoning.names;
    expect(() => validateParams({ ...params, zoning: { names: { ...z, max_scale_ratio: 1 } } })).toThrow(/max_scale_ratio/);
    expect(() => validateParams({ ...params, zoning: { names: { ...z, min_overlap: 0 } } })).toThrow(/min_overlap/);
    expect(() => validateParams({ ...params, zoning: undefined })).toThrow(/zoning/);
  });
});

describe('M3a zone validity', () => {
  it('creates a zone with runs, a cell count, the majority area and the next id', () => {
    const s = month(initial(), [create(SHANGBU_SQUARE)]);
    expect(s.zones).toHaveLength(1);
    expect(zone(s, 1)).toMatchObject({ id: 1, use: 'industrial', cellCount: 36, area: 7, created: initial().date });
    expect(zone(s, 1).runs).toEqual(SHANGBU_SQUARE);
    expect(s.nextZoneId).toBe(2);
    // the Shuibei square is 30 cells in area 1 and 6 in area 5
    const t = month(initial(), [templateZoneAction(initial(), P('shuibei_industrial'))]);
    expect(zone(t, 1).area).toBe(1);
    expect(zone(t, 1).template).toBe(SHUIBEI);
  });

  it('refuses cells in a card-only area or outside every area, overlaps, malformed runs and empty zones', () => {
    const s0 = initial();
    const shekou = s0.areas.find((a) => a.id === 8)!.cells[0]!;
    const at = (c: number): CellRuns => [[Math.floor(c / s0.grid.width), c % s0.grid.width, c % s0.grid.width]];
    expect(playableAreaOf(s0, shekou)).toBe(0);
    expect(() => step(s0, [create(at(shekou))], new Rng(1), STEPS)).toThrow(/not in a playable area/);
    expect(s0.areas.some((a) => a.cells.includes(0))).toBe(false);
    expect(() => step(s0, [create([[0, 0, 0]])], new Rng(1), STEPS)).toThrow(/not in a playable area/);
    for (const bad of [[[370, 354, 349]], [[370, 349]], [[370.5, 349, 350]], [[9999, 0, 0]], 'runs']) {
      expect(() => step(s0, [create(bad as CellRuns)], new Rng(1), STEPS)).toThrow(/run/);
    }
    expect(() => step(s0, [create([])], new Rng(1), STEPS)).toThrow(/at least one cell/);
    expect(() => step(s0, [{ type: 'create_zone', use: 'farm' as 'industrial', runs: SHANGBU_SQUARE }], new Rng(1), STEPS))
      .toThrow(/land use/);
    const s1 = month(s0, [create(SHANGBU_SQUARE)]);
    expect(() => step(s1, [create(rect(354, 356, 370, 371))], new Rng(1), STEPS)).toThrow(/another zone/);
    expect(() => step(s1, [{ type: 'edit_zone', zone: 1, remove: SHANGBU_SQUARE }], new Rng(1), STEPS)).toThrow(/empty/);
    expect(() => step(s1, [{ type: 'edit_zone', zone: 9, use: 'public' }], new Rng(1), STEPS)).toThrow(/no zone 9/);
    expect(() => step(s1, [{ type: 'remove_zone', zone: 9 }], new Rng(1), STEPS)).toThrow(/no zone 9/);
    expect(() => step(s1, [{ type: 'rename_zone', zone: 1, name: { zh: '', en: 'X' } }], new Rng(1), STEPS)).toThrow(/zh and en/);
    // an edit may not take another zone's cells, and a refused action changes nothing
    const s2 = month(s1, [create(rect(355, 358, 370, 373))]);
    expect(() => step(s2, [{ type: 'edit_zone', zone: 2, add: rect(353, 354, 370, 370) }], new Rng(1), STEPS)).toThrow(/another zone/);
    expect(s2.zones.map((z) => z.cellCount)).toEqual([36, 16]);
  });

  it('edits add and remove cells, change the use and recompute the area; ids are never reused', () => {
    let s = month(initial(), [create(SHANGBU_SQUARE)]);
    s = month(s, [{ type: 'edit_zone', zone: 1, add: rect(355, 356, 370, 375), remove: rect(349, 349, 370, 375), use: 'commercial' }]);
    expect(zone(s, 1)).toMatchObject({ use: 'commercial', cellCount: 42 });
    expect(zone(s, 1).runs).toEqual(rect(350, 356, 370, 375));
    // adding its own cells changes nothing
    s = month(s, [{ type: 'edit_zone', zone: 1, add: rect(350, 351, 370, 371) }]);
    expect(zone(s, 1).cellCount).toBe(42);
    // row 365: x 369–372 is area 7 and x 373–376 area 3. A tie goes to the lower id; an edit recomputes the area
    let t = month(initial(), [create([[365, 369, 376]])]);
    expect(zone(t, 1).area).toBe(3);
    t = month(t, [{ type: 'edit_zone', zone: 1, remove: [[365, 376, 376]] }]);
    expect(zone(t, 1).area).toBe(7);
    s = month(s, [{ type: 'remove_zone', zone: 1 }, create(SHANGBU_SQUARE)]);
    expect(s.zones.map((z) => z.id)).toEqual([2]);
    expect(s.nextZoneId).toBe(3);
  });

  it('clips a stroke to playable cells in no other zone', () => {
    const s = month(initial(), [create(SHANGBU_SQUARE)]);
    // x 340–356 on row 370: area 7 starts at x 349, and 349–354 are zoned
    expect(zoneCellsAllowed(s, [[370, 340, 356]])).toEqual([[370, 355, 356]]);
    expect(zoneCellsAllowed(s, [[370, 340, 356]], 1)).toEqual([[370, 349, 356]]);
  });
});

describe('M3a historical names', () => {
  it('names an applied template zone after its precedent, with a generic label otherwise', () => {
    const s0 = initial();
    const s = month(s0, [templateZoneAction(s0, P('shangbu_industrial')), create(rect(365, 370, 355, 360))]);
    expect(nameOf(s, 1)).toBe(SHANGBU);
    expect(zoneLabel(s, zone(s, 1), precedents)).toEqual({ zh: '上步工业区', en: 'Shangbu Industrial Zone' });
    expect(nameOf(s, 2)).toBe('generic');
    expect(zoneLabel(s, zone(s, 2), precedents)).toEqual({ zh: '上步 · 工业区 #2', en: 'Shangbu · industrial zone #2' });
  });

  it('names a zone drawn shifted within the offset or resized within the ratio', () => {
    const shifted = month(initial(), [create(rect(354, 359, 370, 375))]);     // 5 cells east, overlap 1/6
    expect(nameOf(shifted, 1)).toBe(SHANGBU);
    const larger = month(initial(), [create(rect(351, 359, 368, 376))]);      // 81 cells: 2.25 × the template
    expect(nameOf(larger, 1)).toBe(SHANGBU);
    const smaller = month(initial(), [create(rect(350, 352, 371, 375))]);     // 15 cells
    expect(nameOf(smaller, 1)).toBe(SHANGBU);
  });

  it('gives no name for the wrong use, too far, too large or too small, and never for an unplaced precedent', () => {
    const s = month(initial(), [
      create(SHANGBU_SQUARE, 'residential'),
      create(rect(365, 370, 355, 360)),                       // 22 cells from the centroid, no overlap
    ]);
    expect(s.zones.map((z) => z.name.kind)).toEqual(['generic', 'generic']);
    const large = month(initial(), [create(rect(355, 366, 365, 374))]);       // 120 cells, 9.5 cells away
    expect(nameOf(large, 1)).toBe('generic');
    const small = month(initial(), [create(rect(350, 352, 371, 373))]);       // 9 cells: under a third
    expect(nameOf(small, 1)).toBe('generic');
    expect(() => templateZoneAction(initial(), P('bagualing_industrial'))).toThrow(/unplaced/);
  });

  it('gives each name to one zone; the first keeps it; a broken match frees it; a custom name opts out', () => {
    // zone 1: a weaker match drawn first (6 cells east, no overlap)
    let s = month(initial(), [create(rect(355, 360, 370, 375))]);
    expect(nameOf(s, 1)).toBe(SHANGBU);
    // zone 2: exactly the template, a better score, drawn later: zone 1 keeps the name
    s = month(s, [templateZoneAction(s, P('shangbu_industrial'))]);
    expect(zone(s, 2).cellCount).toBe(36);
    expect([nameOf(s, 1), nameOf(s, 2)]).toEqual([SHANGBU, 'generic']);
    // breaking zone 1's match frees the name for zone 2
    s = month(s, [{ type: 'edit_zone', zone: 1, use: 'residential' }]);
    expect([nameOf(s, 1), nameOf(s, 2)]).toEqual(['generic', SHANGBU]);
    // a custom name takes zone 2 out of matching; null puts it back
    s = month(s, [{ type: 'edit_zone', zone: 1, use: 'industrial' },
      { type: 'rename_zone', zone: 2, name: { zh: '电子城', en: 'Electronics Town' } }]);
    expect(zone(s, 2).name).toEqual({ kind: 'custom', zh: '电子城', en: 'Electronics Town' });
    expect(zoneLabel(s, zone(s, 2), precedents)).toEqual({ zh: '电子城', en: 'Electronics Town' });
    expect(nameOf(s, 1)).toBe(SHANGBU);
    s = month(s, [{ type: 'rename_zone', zone: 2, name: null }]);
    expect([nameOf(s, 1), nameOf(s, 2)]).toEqual([SHANGBU, 'generic']);      // zone 1 kept it meanwhile
  });

  it('breaks score ties by the lower zone id, and names two template zones independently', () => {
    const s0 = initial();
    const s = month(s0, [templateZoneAction(s0, P('shuibei_industrial')), templateZoneAction(s0, P('shangbu_industrial'))]);
    expect([nameOf(s, 1), nameOf(s, 2)]).toEqual([SHUIBEI, SHANGBU]);
    expect(zone(s, 1).area).toBe(1);
    // two mirror-image zones, 6 cells west and east of a test precedent: the same score, so the lower id wins
    const test = compilePrecedents([{ id: 'p.mid', kind: 'zone', name: { zh: '中', en: 'Mid' }, use: 'industrial',
      geometry: { kind: 'square', cell: [361, 372], side: 4 } }], areasJson);
    const t = month(s0, [create(rect(354, 357, 371, 374)), create(rect(366, 369, 371, 374))], STEPS);
    assignZoneNames(t, test, params);
    expect(t.zones.map((z) => (z.name.kind === 'precedent' ? z.name.precedent : z.name.kind))).toEqual(['p.mid', 'generic']);
  });
});

describe('M3a has no effect on the economy', () => {
  const plan = (s: GameState): PlayerAction[] => [
    templateZoneAction(s, P('shangbu_industrial')), templateZoneAction(s, P('shuibei_industrial')),
    create(rect(365, 370, 355, 360), 'residential'),
  ];
  const shock = (base: readonly TickStep[]): TickStep[] => base.map((st) => st.name !== 'investment' ? st : {
    name: 'investment', run: (ctx) => {
      st.run(ctx);
      if (ctx.state.history.months.length === 6) {
        ctx.state.labour.baseJobs.find((r) => r.area === 7 && r.sector === 'factory')!.jobs += 3000;
      }
    } });
  const econ = (s: GameState) => ({ pops: s.pops, blocks: s.blocks, labour: s.labour, housing: s.housing,
    history: s.history, migration: s.migration, villagePlots: s.villagePlots });

  it.each([['at rest', STEPS], ['under a job shock', shock(STEPS)]] as const)('%s: zones change no pops, blocks or history', (_n, steps) => {
    const run = (zoned: boolean) => {
      const rng = new Rng(7);
      const first = step(initial(), zoned ? plan(initial()) : [], rng, steps);
      if (first.status !== 'advanced') throw new Error(first.status);
      return runMonths(first.state, 23, rng, undefined, steps);
    };
    const zoned = run(true), bare = run(false);
    expect(zoned.zones).toHaveLength(3);
    expect(econ(zoned)).toEqual(econ(bare));
  });
});

describe('M3a determinism', () => {
  const plays: Record<number, PlayerAction[]> = {
    0: [templateZoneAction(initial(), P('shangbu_industrial')), create(rect(365, 370, 355, 360), 'residential')],
    4: [{ type: 'edit_zone', zone: 2, add: rect(371, 372, 355, 360), use: 'commercial' }],
    7: [{ type: 'rename_zone', zone: 1, name: { zh: '我的工业区', en: 'My industrial zone' } }],
    9: [{ type: 'remove_zone', zone: 2 }, create(rect(354, 359, 376, 379))],
  };
  const play = (s0: GameState, months: number, rng: Rng, from = 0) => {
    let s = s0;
    for (let m = from; m < from + months; m++) s = month(s, plays[m] ?? [], STEPS, rng);
    return s;
  };

  it('save, load and continue, and replay, give the same game with zone actions in the log', () => {
    const rng = new Rng(11);
    const end = play(initial(), 12, rng);
    expect(end.actionLog.map((e) => e.action.type)).toEqual(['create_zone', 'create_zone', 'edit_zone', 'rename_zone',
      'remove_zone', 'create_zone']);
    // zone 1's custom name freed Shangbu's; zone 3, 7 cells south of the template, takes it
    expect(end.zones.map((z) => [z.id, z.name.kind])).toEqual([[1, 'custom'], [3, 'precedent']]);
    const text = saveToJson(saveGame(end, rng, content));

    const rngA = new Rng(11);
    const mid = play(initial(), 6, rngA);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rngA, content))));
    expect(loaded.header.content.precedents_sha256).toBe(content.precedents_sha256);
    const cont = play(loaded.state, 6, loaded.rng, 6);
    expect(saveToJson(saveGame(cont, loaded.rng, content))).toBe(text);

    const rngB = new Rng(11);
    const again = replay(initial(), end.actionLog, 12, rngB, STEPS);
    expect(saveToJson(saveGame(again, rngB, content))).toBe(text);
  });

  it('keeps its own copy of a logged action', () => {
    const a = create(rect(365, 370, 355, 360));
    const s = month(initial(), [a]);
    (a as { runs: CellRuns }).runs[0]![1] = 0;
    expect((s.actionLog[0]!.action as { runs: CellRuns }).runs[0]).toEqual([355, 365, 370]);
  });

  it('refuses zone actions while an interrupting card is unanswered', () => {
    const raise: TickStep[] = STEPS.map((st) => st.name !== 'events' ? st : { name: 'events', run: (ctx) => {
      if (ctx.state.history.months.length === 0) ctx.raise({ card: 'fixture.stop', options: ['a'], interrupting: true });
    } });
    const rng = new Rng(3);
    const r1 = step(initial(), [], rng, raise);
    const card = r1.state.pendingCards[0]!;
    const paused = step(r1.state, [create(SHANGBU_SQUARE)], rng, raise);
    expect(paused.status).toBe('paused');
    expect(paused.state.zones).toHaveLength(0);
    expect(paused.state.nextZoneId).toBe(1);
    const ok = step(r1.state, [create(SHANGBU_SQUARE), { type: 'answer_card', instance: card.id, option: 'a' }], rng, raise);
    expect(ok.status).toBe('advanced');
    expect(ok.state.zones).toHaveLength(1);
  });
});
