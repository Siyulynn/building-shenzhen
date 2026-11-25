/**
 * R8b's tests (phase1-slice.md §5.3): no public zone, and the zone intensity. FAR moves the room, not the demand;
 * high needs its unlock key and an avenue; absent means standard; and no tier is cheapest per m² of floor in money,
 * work and power at once.
 */
import { describe, expect, it } from 'vitest';
import {
  HIGH_INTENSITY_KEY, INTENSITIES, LAND_USES, Rng, applyTurnAction, cellsOfRuns, createFirm, createTickSteps,
  intensityOf, loadGame, post, roadClasses, runsOfCells, saveFromJson, saveGame, saveToJson, setRoadClass, sizeOffer,
  validateParams, zoneCapacityM2, zoneRoomM2,
  type CellRuns, type GameState, type PlayerAction, type Zone,
} from '../src/index.js';
import { content, initial, params, slice, UNGATED } from './fixtures.js';

const STEPS = createTickSteps(params, UNGATED);
const NO_WORKS = createTickSteps(params, {});
const apply = (s: GameState, a: PlayerAction, steps = STEPS) => applyTurnAction(s, a, steps);
const G = params.growth!;
const rect = (x0: number, x1: number, y0: number, y1: number): CellRuns => {
  const r: CellRuns = [];
  for (let y = y0; y <= y1; y++) r.push([y, x0, x1]);
  return r;
};
const SQUARE = rect(349, 354, 370, 375);   // the Shangbu template's square, in area 7
const zoneOf = (s: GameState): Zone => s.zones[s.zones.length - 1]!;
const unlocked = () => { const s = initial(); s.events.unlocked.push(HIGH_INTENSITY_KEY); return s; };

/** A 1-cell zone site 4-adjacent to a road cell, with that road cell: the first that a zone may take. */
function besideRoad(s: GameState): { road: number; runs: CellRuns } {
  const W = s.grid.width;
  for (const road of roadClasses(s, UNGATED.network!).keys()) {
    for (const n of [road - W, road + W, road - 1, road + 1]) {
      const t = initial();
      try { apply(t, { type: 'create_zone', use: 'industrial', runs: runsOfCells([n], W) }); } catch { continue; }
      return { road, runs: runsOfCells([n], W) };
    }
  }
  throw new Error('no zone site beside a road');
}

describe('R8b public is gone', () => {
  it('is not a land use, and a create_zone with it is refused', () => {
    expect(LAND_USES as readonly string[]).not.toContain('public');
    expect(() => apply(initial(), { type: 'create_zone', use: 'public' as 'reserve', runs: SQUARE })).toThrow(/land use/);
  });
});

describe('R8b intensity', () => {
  it('absent means standard: a zone made without it stores none, and its factors are 1', () => {
    const s = initial();
    apply(s, { type: 'create_zone', use: 'industrial', runs: SQUARE });
    expect(zoneOf(s).intensity).toBeUndefined();
    expect(intensityOf(G, zoneOf(s))).toEqual({ far: 1, formation_cost: 1, formation_work: 1, power: 1 });
    apply(s, { type: 'create_zone', use: 'industrial', runs: rect(349, 354, 377, 378), intensity: 'standard' });
    expect(zoneOf(s).intensity).toBeUndefined();
    // a save of standard zones carries no tier, and loads as standard zones (R8e tests the version-5 load)
    const back = loadGame(saveFromJson(saveToJson(saveGame(s, new Rng(1), content)))).state;
    expect(back.zones.every((z) => z.intensity === undefined)).toBe(true);
  });

  it('moves the room, not the demand: the same land holds 0.6, 1 and 1.8 times the floor', () => {
    const s = initial();
    apply(s, { type: 'create_zone', use: 'industrial', runs: SQUARE, intensity: 'low' });
    const z = zoneOf(s), n = cellsOfRuns(z.runs, s.grid).length;
    const room = (k: Zone['intensity']) => zoneRoomM2(s, { ...z, intensity: k }, n, G);
    const cap = (k: Zone['intensity']) => zoneCapacityM2(s, { ...z, intensity: k }, params);
    expect(room('low') / room(undefined)).toBeCloseTo(G.intensity!.low.far, 6);
    expect(room('high') / room(undefined)).toBeCloseTo(G.intensity!.high.far, 6);
    expect(room('high')).toBeGreaterThan(room(undefined));          // high on the same land yields more floor
    expect(cap('high') / cap(undefined)).toBeCloseTo(G.intensity!.high.far, 6);
    // the demand is the firm's offer, which knows no tier: only the power it draws once sited follows the zone
    const offer = sizeOffer(params, G.industrial.archetype, G.industrial.ownership, G.industrial.firm_jobs);
    const f = createFirm(s, params, offer, { premises: 'new_factory', area: z.area, zone: z.id });
    expect(f.floorM2).toBe(offer.floorM2);
    expect(f.jobs).toBe(offer.jobs);
    expect(f.powerKw).toBe(Math.round(offer.powerKw * G.intensity!.low.power));
  });

  it('scales site formation: the work by its factor, and the money by its own', () => {
    const units = (k?: 'low' | 'high') => {
      const s = unlocked();
      post(s, 'grant', 'general', 50_000_000, 'test.fund');
      if (k === 'high') {
        const { road, runs } = besideRoad(s);
        setRoadClass(s, road, 'avenue');
        apply(s, { type: 'create_zone', use: 'industrial', runs, intensity: 'high' });
      } else {
        apply(s, { type: 'create_zone', use: 'industrial', runs: besideRoad(s).runs, ...(k ? { intensity: k } : {}) });
      }
      apply(s, { type: 'commit_works', zone: zoneOf(s).id });
      const o = s.worksOrders[s.worksOrders.length - 1]!;
      return { units: o.unitsTotal, budget: o.budget };
    };
    const std = units(), low = units('low'), high = units('high');
    const I = G.intensity!;
    expect(low.units).toBe(Math.max(1, Math.round(std.units * I.low.formation_work)));
    expect(high.units).toBe(Math.max(1, Math.round(std.units * I.high.formation_work)));
    expect(low.budget).toBeCloseTo(std.budget * I.low.formation_cost, -1);
    expect(high.budget).toBeCloseTo(std.budget * I.high.formation_cost, -1);
  });

  it('per m² of floor, no tier is cheapest in money, work and power at once', () => {
    const I = G.intensity!;
    const per = (k: (typeof INTENSITIES)[number]) => ({
      money: I[k].formation_cost / I[k].far, work: I[k].formation_work / I[k].far, power: I[k].power,
    });
    for (const k of INTENSITIES) {
      const others = INTENSITIES.filter((o) => o !== k);
      // weakly: as cheap as every other tier on all three counts (a tie counts), which the plan's low cost of 0.5 was
      const dominates = (['money', 'work', 'power'] as const).every((m) => others.every((o) => per(k)[m] <= per(o)[m] + 1e-9));
      expect(dominates, k).toBe(false);
    }
  });
});

describe('R8b formation is priced at the tier in force', () => {
  it('refuses raising a zone once it has formed land; lowering it is allowed', () => {
    const s = initial();
    post(s, 'grant', 'general', 5_000_000, 'test.fund');
    apply(s, { type: 'create_zone', use: 'industrial', runs: besideRoad(s).runs, intensity: 'low' });
    const id = zoneOf(s).id;
    apply(s, { type: 'edit_zone', zone: id, intensity: 'standard' });    // nothing formed yet: free to change
    apply(s, { type: 'edit_zone', zone: id, intensity: 'low' });
    apply(s, { type: 'commit_works', zone: id });
    expect(() => apply(s, { type: 'edit_zone', zone: id, intensity: 'standard' })).toThrow(/can no longer be raised/);
    expect(zoneOf(s).intensity).toBe('low');
  });
});

describe('R8b high is gated', () => {
  it('needs the unlock key', () => {
    const s = initial();
    const { road, runs } = besideRoad(s);
    setRoadClass(s, road, 'avenue');
    expect(() => apply(s, { type: 'create_zone', use: 'industrial', runs, intensity: 'high' })).toThrow(/not available yet/);
    expect(s.zones).toHaveLength(0);
  });

  it('needs an avenue beside the zone, at create, edit and commit_works', () => {
    const s = unlocked();
    const { road, runs } = besideRoad(s);
    expect(() => apply(s, { type: 'create_zone', use: 'industrial', runs, intensity: 'high' })).toThrow(/avenue beside the zone/);
    expect(s.zones).toHaveLength(0);
    // a standard zone may not be raised to high either, and a refused edit changes nothing
    apply(s, { type: 'create_zone', use: 'industrial', runs });
    const id = zoneOf(s).id;
    expect(() => apply(s, { type: 'edit_zone', zone: id, intensity: 'high' })).toThrow(/avenue beside the zone/);
    expect(zoneOf(s).intensity).toBeUndefined();
    setRoadClass(s, road, 'avenue');
    apply(s, { type: 'edit_zone', zone: id, intensity: 'high' });
    expect(zoneOf(s).intensity).toBe('high');
    // the avenue taken back down: site formation is refused with the same reason
    setRoadClass(s, road, 'street');
    post(s, 'grant', 'general', 5_000_000, 'test.fund');
    expect(() => apply(s, { type: 'commit_works', zone: id })).toThrow(/avenue beside the zone/);
    // without the road network to check against, high is refused rather than assumed
    const t = unlocked();
    expect(() => apply(t, { type: 'create_zone', use: 'industrial', runs, intensity: 'high' }, NO_WORKS)).toThrow(/road network/);
  });

  it('refuses an unknown tier', () => {
    expect(() => apply(initial(), { type: 'create_zone', use: 'industrial', runs: SQUARE, intensity: 'dense' as 'low' }))
      .toThrow(/unknown intensity/);
  });
});

describe('R8b params', () => {
  it('validates the intensity block: standard is all 1s and every factor is positive', () => {
    const bad = (k: 'low' | 'standard', f: 'far' | 'power', v: number) => {
      const p = structuredClone(params);
      p.growth!.intensity![k][f] = v;
      return () => validateParams(p);
    };
    expect(bad('standard', 'far', 1.2)).toThrow(/standard.far must be 1/);
    expect(bad('low', 'power', 0)).toThrow(/low.power must be > 0/);
    expect(() => validateParams(structuredClone(params))).not.toThrow();
  });
});
