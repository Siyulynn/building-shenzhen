/** Tick step 4, M2: village households complete and start rental floors (phase1-slice.md §5.2, buildings §3.1). */
import { BUILDER_OF, USE_OF } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { BlockStock, Cohort } from '../state.js';
import type { TickContext } from '../step.js';
import { bedsByPool, illegalShare, villageM2 } from './common.js';

const EVENT_KEEP_MONTHS = 24;
const BUILDER = BUILDER_OF.village_rental;

function mergeCompleted(b: BlockStock): void {
  const out: Cohort[] = [];
  for (const c of b.cohorts) {
    const same = c.stage === 'completed'
      ? out.find((o) => o.stage === 'completed' && o.era === c.era && o.use === c.use && o.legality === c.legality && o.archetype === c.archetype)
      : undefined;
    if (same) same.m2 += c.m2; else out.push(c);
  }
  b.cohorts = out;
}

export function construction(p: SliceParams) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const vb = p.village_build;
    for (const b of s.blocks) {
      // 1. a month of work on every cohort under construction; completions when the work is done (§5.5).
      //    M4 will make the month's work depend on construction capacity, and stall cohorts.
      for (const c of b.cohorts) {
        if (c.stage !== 'under_construction') continue;
        c.workDone = (c.workDone ?? 0) + 1;
        if (c.workDone >= (c.workTotal ?? 0)) {
          c.stage = 'completed';
          if (c.firm !== undefined && c.archetype === 'standard_factory') {
            const f = s.firms.find((x) => x.id === c.firm);
            if (f) f.opens = s.date;
          }
          delete c.due; delete c.workDone; delete c.workTotal; delete c.firm;
          b.events.push({ date: s.date, kind: 'complete', use: c.use, m2: c.m2, builder: BUILDER_OF[c.archetype] });
        }
      }
      mergeCompleted(b);

      // 2. village households decide on starts, from last month's housing market
      const market = s.housing.find((m) => m.area === b.area);
      const plot = s.villagePlots.find((v) => v.area === b.area);
      const villagers = s.pops.find((g) => g.area === b.area && g.kind === 'villager')?.size ?? 0;
      if (market && plot && plot.footprintM2 > 0 && villagers > 0) {
        const value = market.rent * Math.min(1, market.crowding) * vb.horizon_months;
        const cost = vb.build_cost_per_m2;
        const risk = vb.p_enforce[s.policy.enforcement] * cost;
        if (value - cost - risk > vb.hurdle * cost) {
          const perBed = p.housing.m2_per_bed.village_rental;
          const pipelineBeds = Math.floor(b.cohorts.reduce((a, c) =>
            a + (c.stage === 'under_construction' && c.archetype === 'village_rental' ? c.m2 : 0), 0) / perBed);
          const unmet = Math.max(0, market.occupants.rental - bedsByPool(b, p).rental - pipelineBeds);
          const want = Math.min(villagers * vb.max_start_m2_per_villager_month, unmet * perBed * vb.response);
          const era = b.cohorts[0]?.era ?? 0;              // M2 has one era (§5.2); era changes arrive with content
          const maxFloors = Math.min(p.eras[era]!.structural_max_floors, vb.enforcement_max_floors[s.policy.enforcement]);
          const now = villageM2(b, ['completed', 'under_construction']);
          const start = Math.floor(Math.min(want, Math.max(0, plot.footprintM2 * maxFloors - now)));
          if (start > 0) {
            const permitted = Math.min(start, Math.max(0, Math.floor(plot.footprintM2 * vb.legal_floors - now)));
            const due = s.date + vb.duration_months;
            for (const [m2, legality] of [[permitted, 'permitted'], [start - permitted, 'unpermitted_tolerated']] as const) {
              if (m2 <= 0) continue;
              b.cohorts.push({ era, use: USE_OF.village_rental, stage: 'under_construction', legality, m2, archetype: 'village_rental', due,
                workDone: 0, workTotal: vb.duration_months });
              b.events.push({ date: s.date, kind: 'start', use: USE_OF.village_rental, m2, builder: BUILDER });
            }
          }
        }
      }
      b.events = b.events.filter((e) => e.date > s.date - EVENT_KEEP_MONTHS);
      const area = s.areas.find((a) => a.id === b.area);
      if (area) area.illegalFloorShare = illegalShare(b);
    }
  };
}
