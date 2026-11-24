/**
 * M6c's tests (phase1-slice.md §11.1): the browser loader, the controller against the golden runs, every card's
 * labels, zone previews, a throwing action, and the overlays.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cellsOfRuns, createInitialState, isFinished, playQuarters, policyNamed, runSummary, Rng,
  type CardInstance, type GameState, type PlayRecord, type Slice,
} from '@sz/sim-core';
import { GOLDEN_POLICIES, ROOT, goldenPath, goldenText, loadSlice as loadNode } from '../../cli/src/slice.js';
import { RAW, loadSlice } from '../src/load.js';
import { sha256 } from '../src/sha256.js';
import { choose, dequeue, enqueue, newSession, submit, type Session } from '../src/controller.js';
import {
  USE_COLOR, actionLabel, areaValue, briefing, cardStack, cardTitle, ledgerView, leadersView, optionLabel, overlayRgba,
  previewZone, projectCost, queuedZoneIds, ramp, reviewView, siteCells, verdictView, areaView,
} from '../src/views.js';

const nodeSha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const slice: Slice = loadSlice();

describe('M6c: the browser loader', () => {
  it('sha256 matches node:crypto', () => {
    for (const t of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), '深圳墟 Shenzhen\r\n', 'x'.repeat(1000)]) {
      expect(sha256(t)).toBe(nodeSha(t));
    }
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('bundles every slice file, and compiles the slice the node loader compiles', () => {
    const node = loadNode();
    expect(slice.content).toEqual(node.content);
    expect(JSON.stringify(slice.params)).toBe(JSON.stringify(node.params));
    expect(Object.keys(RAW)).toEqual(expect.arrayContaining(['params/slice.yaml', 'content/slice/events.yaml', 'data/starts/slice_areas.json']));
  });
});

/** Drive the controller as playQuarters drives runQuarter: the policy's actions at each turn's start, its answers when paused. */
function drive(policyName: string, seed = 1): { x: Session; rec: PlayRecord; viewed: number } {
  const policy = policyNamed(policyName, slice.params, seed);
  let x = newSession(slice, seed);
  const seen = new Map<string, CardInstance>();
  const see = (s: GameState) => { for (const c of s.pendingCards) if (!seen.has(c.id)) seen.set(c.id, c); };
  const quarterEnds: GameState[] = [];
  let viewed = 0;
  for (let guard = 0; x.mode !== 'over' && guard < 200; guard++) {
    see(x.state);
    for (const c of cardStack(x.state, slice)) {            // every pending card renders on a real state, all of it named
      viewed += 1;
      for (const l of [c.title, ...c.options.map((o) => o.label), ...c.lines.map((n) => n.label)]) {
        expect(l.zh.trim() && l.en.trim() && l.zh !== l.en, `${c.card}: ${l.en}`).toBeTruthy();
      }
    }
    for (const a of policy(x.state, x.state.pendingCards)) {
      if (a.type === 'answer_card') x = choose(x, a.instance, a.option);
      else if (x.mode === 'turn') x = enqueue(x, a);
      else throw new Error(`${policyName} gave a turn action mid-quarter`);
      expect(x.error).toBeUndefined();
    }
    const y = submit(x);
    expect(y.error).toBeUndefined();
    if (y.turnStart !== x.turnStart) quarterEnds.push(y.state);
    x = y;
    see(x.state);
  }
  return { x, rec: { final: x.state, quarterEnds, cards: [...seen.values()] }, viewed };
}

describe('M6c: the controller plays the golden runs', () => {
  for (const policy of GOLDEN_POLICIES) {
    it(`${policy}: the run's summary equals its golden file`, () => {
      const { x, rec, viewed } = drive(policy);
      expect(x.mode).toBe('over');
      expect(viewed).toBeGreaterThan(0);
      const o = { policy, seed: 1, quarters: slice.init.scenario.turns };
      const text = goldenText(runSummary(rec, o, slice.params, slice.tick.fiscal!, slice.content));
      expect(text).toBe(readFileSync(join(ROOT, goldenPath(policy)), 'utf8').replace(/\r\n/g, '\n'));
      expect(verdictView(x.state, slice)).toBeDefined();
    });
  }
});

describe('M6c: every card and option is named in both languages', () => {
  const filled = (l: { zh: string; en: string } | undefined) => !!l && l.zh.trim().length > 0 && l.en.trim().length > 0;
  const steps = newSession(slice).steps;
  for (const policy of [...GOLDEN_POLICIES, 'aggressive', 'random']) for (const seed of [1, 2, 3, 4, 5]) {
    it(`${policy}, seed ${seed}`, () => {
      const rec = playQuarters(createInitialState(slice.init), new Rng(seed), steps, policyNamed(policy, slice.params, seed));
      expect(rec.cards.length).toBeGreaterThan(0);
      for (const c of rec.cards) {
        expect(filled(cardTitle(slice, c.card)), c.card).toBe(true);
        for (const o of c.options) expect(filled(optionLabel(rec.final, slice, c.card, o)), `${c.card} ${o}`).toBe(true);
      }
    });
  }
});

describe('M6c: zones, a throwing action, the panels and the overlays', () => {
  const area7 = (s: GameState) => s.areas.find((a) => a.id === 7)!;
  const firstCell = (s: GameState) => { const c = area7(s).cells[0]!; return [c % s.grid.width, Math.floor(c / s.grid.width)] as const; };

  it('a drawn zone\'s preview equals the zone\'s runs after End turn; zones queued later are clipped by it', () => {
    let x = newSession(slice);
    const [cx, cy] = firstCell(x.state);
    const runs = previewZone(x.state, x.queue, cx - 2, cy, cx + 4, cy + 4);
    expect(runs.length).toBeGreaterThan(0);
    x = enqueue(x, { type: 'create_zone', use: 'industrial', runs });
    const again = previewZone(x.state, x.queue, cx - 2, cy, cx + 4, cy + 4);
    expect(again).toEqual([]);
    expect(actionLabel(x.state, slice, x.queue, 0).en).toContain(`#${x.state.nextZoneId}`);
    const zone = queuedZoneIds(x.state, x.queue).get(0)!;
    const cost = projectCost(slice, 'project.site_preparation', siteCells(x.state, slice, runs)).yuan;
    x = enqueue(x, { type: 'commit_project', template: 'project.site_preparation', zone });
    for (const c of x.state.pendingCards) x = choose(x, c.id, c.options[0]);
    const y = submit(x);
    expect(y.error).toBeUndefined();
    expect(y.state.zones.at(-1)!.runs).toEqual(runs);
    const site = y.state.fiscal.projects.find((p) => p.template === 'project.site_preparation')!;
    expect(site.zone).toBe(zone);
    expect(site.budget).toBe(cost);                            // the preview's cost is what the commit charges
    expect(cost).toBeGreaterThan(0);
  });

  it('a throwing action leaves the session as it was, with its Rng; removing it lets the turn go on', () => {
    let x = newSession(slice);
    for (const c of x.state.pendingCards) x = choose(x, c.id, c.options[0]);
    x = enqueue(x, { type: 'commit_project', template: 'project.nothing', area: 7 });
    const before = JSON.stringify(x.rng.save());
    const y = submit(x);
    expect(y.error).toMatch(/no project template/);
    expect(y.state).toBe(x.state);
    expect(y.queue).toEqual(x.queue);
    expect(JSON.stringify(y.rng.save())).toBe(before);
    let z = submit(dequeue(y, 0));
    expect(z.error).toBeUndefined();
    while (z.mode === 'paused') {                              // a card mid-quarter: answer it and Continue
      expect(enqueue(z, { type: 'set_enforcement', level: 'high' }).error).toMatch(/turn's start/);
      for (const c of z.state.pendingCards) z = choose(z, c.id, c.options[0]);
      z = submit(z);
    }
    expect(z.state.turn).toBe(1);
    expect(z.mode).toBe('turn');
    expect(briefing(z.state, slice, z.lastTurnStart).rows.every((r) => r.delta !== undefined)).toBe(true);
  });

  it('the panels read sim-core\'s own views', () => {
    const { x } = drive('historical_prologue');
    const s = x.state;
    const l = ledgerView(s, slice);
    expect(l.forexUsd).toBe(s.fiscal.balances.forex);
    expect(areaView(s, 7)!.pops.reduce((a, p) => a + p.size, 0)).toBe(s.pops.filter((g) => g.area === 7).reduce((a, g) => a + g.size, 0));
    expect(leadersView(s, slice).leaders.length).toBe(s.leadership.leaders.length);
    expect(reviewView(s, slice).held.length).toBe(s.reviews.held.length);
    const m = leadersView(s, slice).mandate;
    expect(m.priority).toBeDefined();                          // named by the SEZ card's option in content
    expect(m.met).toBe(s.events.unlocked.includes('mandate.met'));
    const named = [...ledgerView(s, slice).loans.map((l) => l.kind), ...leadersView(s, slice).falls.flatMap((f) => [f.leader, f.replacedBy])];
    expect(named.length).toBeGreaterThan(0);
    for (const l of named) expect(l.zh).not.toBe(l.en);         // a raw id would read the same in both
  });

  it('each overlay\'s colour for a cell reads its area\'s value; land use paints the zones', () => {
    const { x } = drive('default');
    const s = x.state;
    for (const layer of ['illegal', 'occupancy', 'service_gap'] as const) {
      const px = overlayRgba(s, slice, layer);
      for (const a of s.areas.filter((q) => q.access === 'playable')) {
        const i = a.cells[Math.floor(a.cells.length / 2)]!;
        expect([...px.subarray(i * 4, i * 4 + 4)], `${layer} area ${a.id}`).toEqual(ramp(areaValue(s, layer, a.id)));
      }
    }
    expect(areaValue(s, 'illegal', 1)).toBe(s.areas.find((a) => a.id === 1)!.illegalFloorShare);
    const lu = overlayRgba(s, slice, 'land_use');
    for (const z of s.zones) {
      const i = cellsOfRuns(z.runs, s.grid)[0]!;
      expect([...lu.subarray(i * 4, i * 4 + 4)]).toEqual(USE_COLOR[z.use]);
    }
    expect(isFinished(s)).toBe(true);
  });
});
