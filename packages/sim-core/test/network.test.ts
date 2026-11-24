import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { allocateUtility, compileStartNetwork, roadNetwork, SLICE_FILES, zoneFrontage } from '../src/index.js';
import { areasJson, readRepo, slice } from './fixtures.js';

describe('R1 temporary network', () => {
  it('shows the station on the rail segment but grants municipal frontage only from the road', () => {
    const { routes, maxFrontageDepth } = slice.startNetwork, grid = areasJson.grid;
    const station = slice.startSites.find((s) => s.id === 'site.shenzhen_station')!.cell;
    const stationCell = station[1] * grid.width + station[0];
    const rail = routes.find((r) => r.id === 'site.kcr_line')!, road = routes.find((r) => r.id === 'site.guangshen_road')!;
    expect(rail).toMatchObject({ kind: 'railway', placement: 'temporary' });
    expect(rail.cells).toContain(stationCell);
    expect(road).toMatchObject({ kind: 'road', placement: 'temporary' });
    const net = roadNetwork(grid, road.cells);
    expect(new Set(net.component.values()).size).toBe(1);
    expect(zoneFrontage(net, [stationCell - 1], maxFrontageDepth).size).toBe(0);
    const frontage = road.cells[0]! + grid.width;
    expect(zoneFrontage(net, [frontage], maxFrontageDepth).get(frontage)?.depth).toBe(1);
    expect(rail.claims).toContainEqual({ id: 'site.kcr_line.exists_1979', use: 'encyclopedia' });
  });

  it('rejects a snapped path off playable land rather than silently clipping at the edge', () => {
    const spec = parse(readRepo(SLICE_FILES.network));
    spec.routes[0].waypoints = [[385, 390], [385, 402]];
    expect(() => compileStartNetwork(spec, parse(readRepo(SLICE_FILES.sites)), areasJson)).toThrow(/leaves playable land/);
  });
});

describe('R1 road reach and supply', () => {
  it('splits connected capacity once; cutting a link leaves frontage but removes the remote supply', () => {
    const grid = { width: 7, height: 5 }, zone = [7, 14, 21, 12, 19];
    const supply = (cells: number[], capacity: number) => {
      const net = roadNetwork(grid, cells), reach = zoneFrontage(net, zone, 2);
      expect(reach.has(21)).toBe(false); // too deep
      expect(reach.get(19)?.depth).toBe(2);
      return allocateUtility(net, reach, new Map([[0, capacity]]), new Map([[19, 8], [14, 8], [21, 4]]));
    };
    expect(supply([5, 2, 4, 1, 3, 0], 9)).toEqual(new Map([[14, 5], [19, 4], [21, 0]]));
    expect(supply([0, 1, 3, 4, 5], 9)).toEqual(new Map([[14, 8], [19, 0], [21, 0]]));
    expect(supply([0, 1, 2, 3, 4, 5], 0).get(14)).toBe(0);
  });

  it('does not wrap rows, walk through gaps or join networks through the zone; ties go to the lower component', () => {
    const grid = { width: 5, height: 4 };
    expect(roadNetwork(grid, [4, 5]).component.get(5)).toBe(5);
    const net = roadNetwork(grid, [4, 0]);
    const reach = zoneFrontage(net, [4, 9, 8, 7, 6, 5, 12], 3);
    expect(reach.get(7)).toEqual({ component: 0, depth: 3 });
    expect(reach.get(8)).toEqual({ component: 4, depth: 2 });
    expect(reach.has(4)).toBe(false);
    expect(reach.has(12)).toBe(false);
    expect(zoneFrontage(net, [5, 7], 6).has(7)).toBe(false);
  });
});
