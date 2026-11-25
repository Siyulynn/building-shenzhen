/**
 * R8e's tests (phase1-slice.md §5.1): save version 6 and its migration from version 5. The version-5 save is built
 * here: four quarters of the historical plan, written back in version 5's shape (no requisitioned list, no power pool,
 * no gateways hash) with a public zone and a placed power source. When the untracked save that the pre-R8 code wrote
 * is present (test/fixtures-data/save-v5.json), the same checks also load it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  Rng, SAVE_VERSION, cellsOfRuns, createTickSteps, firstOption, historical, loadGame, placeStructure, playQuarters, saveFromJson, saveGame,
  saveToJson, step,
} from '../src/index.js';
import { ROOT, initial, params, slice, UNGATED } from './fixtures.js';
import { checkInvariants } from './invariants.js';

const STEPS = createTickSteps(params, UNGATED);
const FIXTURE = join(ROOT, 'packages/sim-core/test/fixtures-data/save-v5.json');

/** A version-5 save as the pre-R8 code wrote one, with what the migration has to change in it. */
function builtV5(): string {
  const rng = new Rng(5);
  const s = playQuarters(initial(), rng, STEPS, historical(params, UNGATED), 4).final;
  // the retired R2 source, placed as the old code could (the cell and attach road of jobs.test's fixture)
  const W = s.grid.width;
  placeStructure(s, { kind: 'power_source', cell: 345 * W + 361, attach: 346 * W + 361, capacity: 1000 });
  const save = saveGame(s, rng, slice.content);
  const st = save.body.state as Record<string, unknown> & {
    zones: { id: number; use: string }[]; structures: { kind: string }[]; actionLog: { action: Record<string, unknown> }[];
  };
  delete st.requisitioned; delete st.power; delete st.roadClass; delete (st.history as { freightUnmet?: unknown }).freightUnmet;
  const z = st.zones.find((q) => q.use !== 'industrial')!;
  z.use = 'public';
  const made = st.actionLog.filter((e) => e.action.type === 'create_zone')[z.id - 1];
  if (made) made.action.use = 'public';
  const { gateways_sha256: _, ...content } = save.header.content;
  return saveToJson({ ...save, header: { ...save.header, version: 5, content: content as typeof save.header.content } });
}
const CASES: [string, () => string][] = [['built here', builtV5],
  ...(existsSync(FIXTURE) ? [['written by the pre-R8 code', () => readFileSync(FIXTURE, 'utf8')] as [string, () => string]] : [])];

describe('R8e save version 6', () => {
  it('is version 6, and the header carries the gateways hash', () => {
    expect(SAVE_VERSION).toBe(6);
    const save = saveGame(initial(), new Rng(1), slice.content);
    expect(save.header.version).toBe(6);
    expect(save.header.content.gateways_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(save.header.content.landcover_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each(CASES)('migrates a version-5 save (%s): public to reserve, power source to substation, the land taken, the power pool', (_n, v5) => {
    const old = saveFromJson(v5());
    expect(old.header.version).toBe(5);
    const o = old.body.state as {
      zones: { use: string }[]; structures: { kind: string; cell: number; capacity: number }[];
      requisitioned?: unknown; power?: unknown; actionLog: { action: { type: string; use?: string; kind?: string } }[];
    };
    // the fixture holds what the migration has to change
    expect(o.zones.map((z) => z.use)).toContain('public');
    expect(o.structures.map((x) => x.kind)).toContain('power_source');
    expect(o.requisitioned).toBeUndefined();
    expect(o.power).toBeUndefined();

    const { state: s, header } = loadGame(old);
    expect(header.version).toBe(6);
    expect(s.zones.map((z) => z.use)).toEqual(o.zones.map((z) => (z.use === 'public' ? 'reserve' : z.use)));
    expect(s.zones.every((z) => z.intensity === undefined)).toBe(true);           // absent: standard
    // the same cell and capacity, as the substation that R8c already read it as
    expect(s.structures.map((x) => [x.kind, x.cell, x.capacity])).toEqual(o.structures.map((x) =>
      [x.kind === 'power_source' ? 'power_substation' : x.kind, x.cell, x.capacity]));
    expect(s.worksOrders.some((w) => w.placement?.kind === 'power_source')).toBe(false);
    // land already formed or forming owes no compensation: it is requisitioned, sorted
    const taken = new Set([...s.cellWorks.map((w) => w.cell), ...cellsOfRuns(s.servicedLand, s.grid)]);
    expect(taken.size).toBeGreaterThan(0);
    expect(s.requisitioned).toEqual([...s.requisitioned].sort((a, b) => a - b));
    for (const c of taken) expect(s.requisitioned).toContain(c);
    expect(s.power).toEqual({ purchases: [] });
    expect(s.roadClass).toBeUndefined();                                          // start class, else street
    expect(s.history.freightUnmet).toBeUndefined();                               // zeros from the first month run
    // the log says what the migrated state holds
    for (const e of s.actionLog) {
      expect((e.action as { use?: string }).use).not.toBe('public');
      expect((e.action as { kind?: string }).kind).not.toBe('power_source');
    }
  });

  it.each(CASES)('a migrated save (%s) plays on, keeps its invariants, and round-trips as version 6', (_n, v5) => {
    const { state, rng } = loadGame(saveFromJson(v5()));
    const months = state.history.months.length;
    let s = state;
    for (let m = 0; m < 3; m++) {
      const r = step(s, firstOption(s, s.pendingCards), rng, STEPS);
      if (r.status === 'paused') { s = r.state; m--; continue; }
      if (r.status !== 'advanced') throw new Error(r.status);
      checkInvariants(s, r.state, r.events);
      s = r.state;
    }
    expect(s.history.months.length).toBe(months + 3);
    for (const row of Object.values(s.history.freightUnmet ?? {})) expect(row).toHaveLength(months + 3);
    const text = saveToJson(saveGame(s, rng, slice.content));
    const back = loadGame(saveFromJson(text));
    expect(back.header.version).toBe(6);
    expect(saveToJson(saveGame(back.state, back.rng, slice.content))).toBe(text);
  });
});
