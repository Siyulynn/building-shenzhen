import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { compileStartSites, SLICE_FILES } from '../src/index.js';
import { areasJson, readRepo, sha256, slice } from './fixtures.js';

describe('R1: the lived-in start', () => {
  it('places only the core point proxies, without turning landscapes or planning guides into settlements', () => {
    const ids = (layer: string) => slice.startSites.filter((s) => s.layer === layer).map((s) => s.id).sort();
    expect(ids('settlement')).toEqual(['site.caiwuwei', 'site.huangbeiling', 'site.hubei', 'site.nigang',
      'site.shenzhen_market_town', 'site.shuibei', 'site.sungang', 'site.tianbei_lower', 'site.tianbei_upper',
      'site.xiangxi', 'site.yumin']);
    expect(ids('landmark')).toEqual(['site.luohu_crossing', 'site.peoples_hospital_inpatient',
      'site.shenzhen_middle_school', 'site.shenzhen_station', 'site.shenzhen_theatre', 'site.sungang_freight',
      'site.wenjindu_crossing']);
    expect(ids('landscape')).toEqual(['site.county_offices', 'site.shangbu_land', 'site.shenzhen_reservoir']);
    const station = slice.startSites.find((s) => s.id === 'site.shenzhen_station')!;
    expect(station).toMatchObject({ area: 2, cell: [385, 390], name: { zh: '深圳火车站', en: 'Shenzhen station' } });
    expect(station.claims).toContainEqual({ id: 'site.shenzhen_station.location', use: 'geometry' });
  });

  it('retains the crossing point even though its area is validated on the neighbouring land cell', () => {
    expect(slice.startSites.find((s) => s.id === 'site.luohu_crossing'))
      .toMatchObject({ area: 2, cell: [386, 395], landCell: [385, 395] });
    const register = readRepo(SLICE_FILES.sites);
    const projection = JSON.parse(readRepo(SLICE_FILES.siteCells));
    const compile = (text: string) => compileStartSites(parse(text), projection, areasJson, sha256(text));
    expect(() => compile(register + '\n')).toThrow(/stale site projection/);
    projection.placements['site.luohu_crossing'].landCell = [0, 0];
    expect(() => compile(register)).toThrow(/land cell outside registered area/);
  });
});
