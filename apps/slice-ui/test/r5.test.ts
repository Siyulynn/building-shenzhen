/**
 * R5's acceptance checks (phase1-slice.md §11.2, the §12 R5 row): a quarter played with the map tools alone, the
 * limiting constraint read at a cell, the change recognised at the next turn, the core-zoom floor spread, the network
 * and utility overlays, the compact HUD, the inspector and the drawers, and a queue that stays valid when an action
 * is removed. Everything here goes through the pure tools, views and renderers; nothing calls step to preview.
 */
import { describe, expect, it } from 'vitest';
import {
  cellsOfRuns, createInitialState, playQuarters, playableAreaOf, policyNamed, Rng, zoneBuiltM2, type GameState, type Slice,
} from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { choose, enqueue, newSession, submit, type Session } from '../src/controller.js';
import {
  DRAWER_BODY, initialUi, renderBriefing, renderChips, renderCue, renderDrawer, renderInspector, renderStack, type View,
} from '../src/render.js';
import { sceneOf } from '../src/scene.js';
import { applyPlan, attachFor, planGesture, roadWaypoints, type Gesture, type Plan, type ToolOptions } from '../src/tools.js';
import { RUNG, T } from '../src/strings.js';
import {
  DRAWERS, RUNGS, RUNG_COLOR, chipsView, cellConstraint, constraintContext, depthColor, finishedWork, floorSpread, icrCue,
  isBuildable, mostHeldBack, overlayRgba, shareColor, type Rung,
} from '../src/views.js';

const slice: Slice = loadSlice();
const W = createInitialState(slice.init).grid.width;
const idx = (x: number, y: number) => y * W + x;
const OPTS: ToolOptions = { use: 'industrial', planOnly: false, facility: 'school' };

/** A session at the turn's start with every card answered by its first option (the decisions modal's job). */
function answered(x: Session): Session {
  for (const c of x.state.pendingCards) x = choose(x, c.id, c.options[0]);
  return x;
}
/** End quarter, then Continue through any card that interrupts it. */
function endQuarter(x: Session): Session {
  let y = submit(answered(x));
  expect(y.error).toBeUndefined();
  while (y.mode === 'paused') { y = submit(answered(y)); expect(y.error).toBeUndefined(); }
  return y;
}
const gesture = (x: Session, g: Gesture, o: ToolOptions = OPTS): Plan => planGesture(x, o, g);
const ok = (p: Plan) => { expect(p.kind, JSON.stringify(p).slice(0, 300)).toBe('actions'); return p as Extract<Plan, { kind: 'actions' }>; };

/** A 3 × 3 block just east of the temporary Guangshen road in Area 1, all buildable and unzoned. */
function guangshenBlock(s: GameState): [number, number] {
  const g = slice.startNetwork.routes.find((r) => r.id === 'site.guangshen_road')!;
  const roads = new Set(slice.startNetwork.routes.flatMap((r) => r.cells));
  for (const c of g.cells) {
    const [x0, y0] = [c % W + 1, Math.floor(c / W)];
    let fits = playableAreaOf(s, idx(x0, y0)) === 1;
    for (let dy = 0; dy < 3 && fits; dy++) for (let dx = 0; dx < 3 && fits; dx++) {
      const i = idx(x0 + dx, y0 + dy);
      fits = isBuildable(slice, i) && !roads.has(i) && playableAreaOf(s, i) > 0;
    }
    if (fits) return [x0, y0];
  }
  throw new Error('no free block beside the Guangshen road');
}

/** A road out of the start network: four cells west from a start road cell, refused nowhere. */
function roadOut(x: Session): Gesture {
  const roads = slice.startNetwork.routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells);
  for (const c of roads) {
    const [cx, cy] = [c % W, Math.floor(c / W)];
    const g: Gesture = { tool: 'road', from: [cx - 1, cy], to: [cx - 4, cy] };
    if (gesture(x, g).kind === 'actions') return g;
  }
  throw new Error('no road can be drawn out of the start network');
}

describe('R5: a quarter played with the map tools alone', () => {
  it('zones and services a block, draws a road and places a power source; End quarter runs them', () => {
    let x = answered(newSession(slice));
    const [bx, by] = guangshenBlock(x.state);
    const zone = ok(gesture(x, { tool: 'zone', from: [bx, by], to: [bx + 2, by + 2] }));
    expect(zone.actions.map((a) => a.type)).toEqual(['create_zone', 'commit_works']);   // servicing queued by default
    expect(zone.preview.cells).toBe(9);
    expect(zone.preview.budget).toBe(9 * slice.params.works!.service.yuan_per_cell);
    expect(zone.preview.crewPerMonth).toBe(slice.params.works!.crew_per_order);
    x = applyPlan(x, zone);
    const road = ok(gesture(x, roadOut(x)));
    x = applyPlan(x, road);
    // a power source beside the new road's first cell: its attach is that queued road cell
    const r0 = (road.actions[0] as { path: [number, number][] }).path[0]!;
    const at: [number, number] = [r0[0], r0[1] - 1];
    expect(attachFor(x, at).road).toBe(true);
    const power = ok(gesture(x, { tool: 'power', from: at, to: at }));
    x = applyPlan(x, power);
    expect(x.error).toBeUndefined();
    expect(x.queue.map((a) => a.type)).toEqual(['create_zone', 'commit_works', 'build_road', 'place_structure']);

    const before = x.state.nextOrderId;
    const y = endQuarter(x);
    expect(y.state.turn).toBe(1);
    const orders = y.state.worksOrders.filter((o) => o.id >= before);
    expect(orders.map((o) => o.kind)).toEqual(['service', 'road', 'structure']);
    // each preview's cost is what the commit charged
    expect(orders[0]!.budget).toBe(zone.preview.budget);
    expect(orders[1]!.budget).toBe(road.preview.budget);
    expect(orders[2]!.budget).toBe(power.preview.budget);
    expect(y.state.cellWorks.some((w) => w.stage !== 'planned')).toBe(true);
  });

  it('Plan only queues the zone alone; tools are refused mid-quarter and after the end', () => {
    const x = answered(newSession(slice));
    const [bx, by] = guangshenBlock(x.state);
    expect(ok(gesture(x, { tool: 'zone', from: [bx, by], to: [bx + 1, by] }, { ...OPTS, planOnly: true })).actions.map((a) => a.type))
      .toEqual(['create_zone']);
    expect(gesture({ ...x, mode: 'paused' }, { tool: 'zone', from: [bx, by], to: [bx, by] }).kind).toBe('refused');
    expect(gesture({ ...x, mode: 'over' }, { tool: 'road', from: [bx, by], to: [bx, by] }).kind).toBe('refused');
  });

  it('a road drag goes across, then down; a refused gesture queues nothing and gives sim-core\'s reason', () => {
    expect(roadWaypoints([1, 1], [4, 3])).toEqual([[1, 1], [4, 1], [4, 3]]);
    expect(roadWaypoints([1, 1], [1, 3])).toEqual([[1, 1], [1, 3]]);
    expect(roadWaypoints([2, 2], [2, 2])).toEqual([[2, 2]]);
    const x = answered(newSession(slice));
    const [bx, by] = guangshenBlock(x.state);
    const far = gesture(x, { tool: 'road', from: [bx + 8, by + 8], to: [bx + 10, by + 8] });
    expect(far.kind).toBe('refused');
    if (far.kind === 'refused') expect(far.detail.length).toBeGreaterThan(0);
    expect(applyPlan(x, far).queue).toEqual(x.queue);
  });
});

describe('R5: removing a queued action keeps the queue valid', () => {
  it('removing the first zone drops its servicing and renumbers the second', () => {
    let x = answered(newSession(slice));
    const [bx, by] = guangshenBlock(x.state);
    x = applyPlan(x, ok(gesture(x, { tool: 'zone', from: [bx, by], to: [bx, by + 2] })));
    x = applyPlan(x, ok(gesture(x, { tool: 'zone', from: [bx + 1, by], to: [bx + 2, by + 2] })));
    const n = x.state.nextZoneId;
    expect(x.queue.map((a) => (a.type === 'commit_works' ? a.zone : a.type))).toEqual(['create_zone', n, 'create_zone', n + 1]);
    // erase on a queued zone's cell undoes the latest action there: first its servicing, then the zone itself
    const erase = gesture(x, { tool: 'erase', from: [bx, by], to: [bx, by] });
    expect(erase.kind).toBe('dequeue');
    const once = applyPlan(x, erase);
    expect(once.queue.map((a) => (a.type === 'commit_works' ? a.zone : a.type))).toEqual(['create_zone', 'create_zone', n + 1]);
    const y = applyPlan(once, gesture(once, { tool: 'erase', from: [bx, by], to: [bx, by] }));
    expect(y.queue.map((a) => (a.type === 'commit_works' ? a.zone : a.type))).toEqual(['create_zone', n]);
    const z = endQuarter(y);
    expect(z.state.zones.map((q) => q.id)).toEqual([n]);
    expect(z.state.worksOrders.at(-1)!.zone).toBe(n);
  });

  it('erase cancels unstarted work, refuses started work and built roads, and removes a zone with no works', () => {
    let x = answered(newSession(slice));
    const [bx, by] = guangshenBlock(x.state);
    x = applyPlan(x, ok(gesture(x, { tool: 'zone', from: [bx, by], to: [bx + 2, by + 2] })));
    x = endQuarter(x);
    const started = x.state.cellWorks.find((w) => w.workDone > 0)!;
    const fresh = x.state.cellWorks.find((w) => w.workDone === 0)!;
    const xy = (c: number): [number, number] => [c % W, Math.floor(c / W)];
    expect(gesture(x, { tool: 'erase', from: xy(started.cell), to: xy(started.cell) })).toMatchObject({ kind: 'refused', what: T.startedWork });
    const cancel = ok(gesture(x, { tool: 'erase', from: xy(fresh.cell), to: xy(fresh.cell) }));
    expect(cancel.actions).toEqual([{ type: 'cancel_works', order: fresh.order, cells: [[xy(fresh.cell)[1], xy(fresh.cell)[0], xy(fresh.cell)[0]]] }]);
    const road = slice.startNetwork.routes.find((r) => r.kind === 'road')!.cells[3]!;
    expect(gesture(x, { tool: 'erase', from: xy(road), to: xy(road) })).toMatchObject({ kind: 'refused', what: T.startRoad });
    // a planned zone with no works is removed
    let p = applyPlan(x, ok(gesture(x, { tool: 'zone', from: [bx + 3, by], to: [bx + 3, by] }, { ...OPTS, planOnly: true })));
    p = endQuarter(p);
    const planned = p.state.zones.at(-1)!;
    const c0 = cellsOfRuns(planned.runs, p.state.grid)[0]!;
    expect(ok(gesture(p, { tool: 'erase', from: xy(c0), to: xy(c0) })).actions).toEqual([{ type: 'remove_zone', zone: planned.id }]);
  });
});

describe('R5: the limiting constraint at a cell, and the change at the next turn', () => {
  const held = (x: Session, c: number) => cellConstraint(x.state, slice, c).rung;
  const inspector = (x: Session, cx: number, cy: number, lang: 'en' | 'zh' = 'en') =>
    renderInspector({ slice, x, lang, ui: { ...initialUi(slice), selected: { x: cx, y: cy } } });

  it('climbs the ladder: unbuildable, unzoned, not queued, waiting, no frontage, servicing', () => {
    let x = answered(newSession(slice));
    const s0 = x.state;
    const off = s0.areas.find((a) => a.id === 1)!.cells.find((c) => !isBuildable(slice, c))!;
    expect(held(x, off)).toBe('unbuildable');
    const [bx, by] = guangshenBlock(s0);
    expect(held(x, idx(bx, by))).toBe('unzoned');
    expect(inspector(x, bx, by)).toContain(`${T.heldBackBy.en}:</b> ${RUNG.unzoned!.en}`);

    // plan only: zoned, not queued
    x = applyPlan(x, ok(gesture(x, { tool: 'zone', from: [bx, by], to: [bx + 2, by + 2] }, { ...OPTS, planOnly: true })));
    x = endQuarter(x);
    expect(held(x, idx(bx, by))).toBe('not_queued');
    // the Service tool on the zone, then a pause: the order waits, and says why
    x = applyPlan(x, ok(gesture(x, { tool: 'service', from: [bx, by], to: [bx, by] })));
    x = endQuarter(x);
    expect(held(x, idx(bx, by))).not.toBe('not_queued');
    const order = x.state.worksOrders.at(-1)!;
    x = endQuarter(enqueue(x, { type: 'set_works_paused', order: order.id, paused: true }));
    const unfinished = x.state.cellWorks.find((w) => w.order === order.id && w.stage !== 'serviced')!;
    expect(cellConstraint(x.state, slice, unfinished.cell)).toEqual({ rung: 'waiting', why: expect.objectContaining({ en: 'paused' }) });
    expect(inspector(x, unfinished.cell % W, Math.floor(unfinished.cell / W), 'zh')).toContain(RUNG.waiting!.zh);

    // a long strip running away from the road: its far cells have no frontage while the near ones are serviced
    let y = answered(newSession(slice));
    const depth = slice.startNetwork.maxFrontageDepth;
    const [sx, sy] = guangshenBlock(y.state);
    y = applyPlan(y, ok(gesture(y, { tool: 'zone', from: [sx, sy], to: [sx + depth + 2, sy] })));
    y = endQuarter(y);
    expect(held(y, idx(sx + depth + 1, sy))).toBe('no_frontage');
    const working = y.state.cellWorks.find((w) => w.stage !== 'serviced' && constraintContext(y.state, slice).spatial.frontage.has(w.cell));
    if (working) expect(held(y, working.cell)).toBe('servicing');
  });

  it('a developed zone reads utility shortfall, building or active, never a blanket shortfall without cause', () => {
    const rec = playQuarters(createInitialState(slice.init), new Rng(1), newSession(slice).steps, policyNamed('historical_prologue', slice.params, 1));
    const rungs = new Set<Rung>();
    for (const s of [...rec.quarterEnds, rec.final]) for (const z of s.zones) for (const c of cellsOfRuns(z.runs, s.grid)) {
      const k = cellConstraint(s, slice, c);
      rungs.add(k.rung);
      if (k.rung === 'utility') {
        // the shortfall is real: the area's firms post below full
        const sh = constraintContext(s, slice).shares.get(c)!;
        expect(Math.min(sh.power, sh.water)).toBeLessThan(1);
      }
    }
    expect(rungs.has('building')).toBe(true);
    expect(rungs.has('utility')).toBe(true);
    expect([...rungs].every((r) => RUNGS.includes(r))).toBe(true);
  });

  it('the next turn\'s briefing names where work finished and the area most held back', () => {
    let x = answered(newSession(slice));
    const [bx, by] = guangshenBlock(x.state);
    x = applyPlan(x, ok(gesture(x, { tool: 'zone', from: [bx, by], to: [bx + 2, by + 2] })));
    const before = cellConstraint(x.state, slice, idx(bx, by)).rung;
    expect(before).toBe('unzoned');
    const y = endQuarter(x);
    const fin = finishedWork(y.state, y.lastTurnStart);
    expect(fin.reduce((n, f) => n + f.serviced, 0)).toBeGreaterThan(0);
    const after = cellConstraint(y.state, slice, idx(bx, by)).rung;
    expect(RUNGS.indexOf(after)).toBeGreaterThan(RUNGS.indexOf('servicing'));   // serviced, and building or active
    const v: View = { slice, x: y, lang: 'en', ui: initialUi(slice) };
    const html = renderBriefing(v);
    expect(html).toContain(T.servicedCells.en);
    const mh = mostHeldBack(y.state, slice)!;
    expect(mh).toBeDefined();
    expect(html).toContain(RUNG[mh.constraint.rung]!.en);
    expect(renderBriefing({ ...v, lang: 'zh' })).toContain(T.heldBackArea.zh);
  });

  it('nothing is held back at the start: the briefing says so', () => {
    const x = newSession(slice);
    expect(mostHeldBack(x.state, slice)).toBeUndefined();
    expect(renderBriefing({ slice, x, lang: 'en', ui: initialUi(slice) })).toContain(T.nothingHeld.en);
  });
});

describe('R5: core zoom, overlays and the HUD', () => {
  const rec = playQuarters(createInitialState(slice.init), new Rng(1), newSession(slice).steps, policyNamed('historical_prologue', slice.params, 1));
  const s = rec.final;

  it('spreads each zone\'s floor over its developable cells, frontage first, filled to far, and changes nothing', () => {
    const before = JSON.stringify(s);
    const spread = floorSpread(s, slice);
    expect(spread.size).toBeGreaterThan(0);
    expect([...floorSpread(s, slice)]).toEqual([...spread]);                   // deterministic
    const k = constraintContext(s, slice);
    for (const z of s.zones) {
      const far = slice.params.growth!.far[z.use as 'industrial'];
      const cells = (k.developable.get(z.id) ?? []).filter((c) => spread.has(c));
      const drawn = cells.reduce((n, c) => n + spread.get(c)! * 10_000 * far, 0);
      expect(drawn).toBeLessThanOrEqual(zoneBuiltM2(s, z.id) + 1e-6);
      // every drawn cell but the last is full, and none is shallower than a cell drawn before it
      const order = [...cells].sort((a, b) => (k.spatial.frontage.get(a)!.depth - k.spatial.frontage.get(b)!.depth) || a - b);
      order.slice(0, -1).forEach((c) => expect(spread.get(c)).toBe(1));
      for (const c of k.developable.get(z.id) ?? []) {
        if (!spread.has(c)) for (const d of cells) expect(k.spatial.frontage.get(d)!.depth).toBeLessThanOrEqual(k.spatial.frontage.get(c)!.depth);
      }
    }
    sceneOf(newSession(slice), slice, { layer: 'network', guide: true, selected: null, plan: null });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('the network overlay paints roads and frontage depth; the utilities overlay paints shares and sources', () => {
    const net = overlayRgba(s, slice, 'network');
    const k = constraintContext(s, slice);
    const road = [...k.spatial.roads.component.keys()][0]!;
    expect(net[road * 4 + 3]).toBeGreaterThan(200);
    const [c, f] = [...k.spatial.frontage][0]!;
    expect([...net.subarray(c * 4, c * 4 + 4)]).toEqual(depthColor(f.depth, slice.startNetwork.maxFrontageDepth));
    const ut = overlayRgba(s, slice, 'utilities');
    const [sc, sh] = [...k.shares][0]!;
    expect([...ut.subarray(sc * 4, sc * 4 + 4)]).toEqual(shareColor(Math.min(sh.power, sh.water)));
    const heldPx = overlayRgba(s, slice, 'held');
    expect([...heldPx.subarray(sc * 4, sc * 4 + 4)]).toEqual(RUNG_COLOR[cellConstraint(s, slice, sc).rung]);
  });

  it('five chips of two values each, a cue with no numbers, and one drawer at a time', () => {
    const x = newSession(slice);
    const chips = chipsView(s, slice);
    expect(chips.map((c) => c.id)).toEqual([...DRAWERS]);
    for (const c of chips) expect(c.values.length).toBe(2);
    const v: View = { slice, x, lang: 'en', ui: initialUi(slice) };
    expect((renderChips(v).match(/class="chip/g) ?? []).length).toBe(5);
    const cueText = renderCue(v).replace(/<[^>]*>/g, ' ');
    expect(cueText).not.toMatch(/\d/);
    const cue = icrCue(s, slice);
    for (const b of [cue.i, cue.c, cue.r]) { expect(b.level).toBeGreaterThanOrEqual(0); expect(b.level).toBeLessThanOrEqual(1); }
    expect(Object.keys(DRAWER_BODY).sort()).toEqual([...DRAWERS].sort());
    for (const d of DRAWERS) expect(renderDrawer({ ...v, ui: { ...v.ui, drawer: d } })).toContain('data-act="closeDrawer"');
    expect(renderDrawer(v)).toBe('');
    // no project commits in the Building drawer: the map builds (§11.2)
    expect(renderDrawer({ ...v, ui: { ...v.ui, drawer: 'building' } })).not.toContain('data-act="commit"');
    expect(renderStack(v)).toContain(T.endQuarter.en);
  });
});
