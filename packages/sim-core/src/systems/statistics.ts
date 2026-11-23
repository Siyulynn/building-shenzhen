/** Tick step 13: the month's series (phase1-slice.md §5.2). The three counts are filtered sums (PLAN §3.2). */
import { SECTORS, isMigrant } from '../enums.js';
import type { TickContext } from '../step.js';
import { illegalShare, underConstructionM2, villageM2 } from './common.js';

export function statistics() {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const h = s.history;
    const sum = (f: (g: (typeof s.pops)[number]) => number) => s.pops.reduce((a, g) => a + f(g), 0);
    h.months.push(s.date);
    h.registered.push(sum((g) => (g.registration === 'local' ? g.size : 0)));
    h.resident.push(sum((g) => g.stayedSixMonths));
    h.present.push(sum((g) => g.present));
    h.migrants.push(sum((g) => (isMigrant(g.kind) ? g.size : 0)));
    for (const sec of SECTORS) {
      h.jobs[sec].push(s.labour.jobs.reduce((a, r) => a + (r.sector === sec ? r.jobs : 0), 0));
      h.employed[sec].push(s.labour.jobs.reduce((a, r) => a + (r.sector === sec ? r.filled : 0), 0));
    }
    const beds = s.housing.reduce((a, m) => a + m.beds.rental, 0);
    const occupants = s.housing.reduce((a, m) => a + m.occupants.rental, 0);
    h.rentalBeds.push(beds);
    h.crowding.push(occupants / Math.max(1, beds));
    h.rent.push(beds > 0 ? s.housing.reduce((a, m) => a + m.rent * m.beds.rental, 0) / beds : 0);
    h.underConstructionM2.push(s.blocks.reduce((a, b) => a + underConstructionM2(b), 0));
    const vAll = s.blocks.reduce((a, b) => a + villageM2(b, ['completed']), 0);
    h.illegalShare.push(vAll > 0 ? s.blocks.reduce((a, b) => a + illegalShare(b) * villageM2(b, ['completed']), 0) / vAll : 0);
    let inflow = 0, outflow = 0;
    for (const e of ctx.events) if (e.kind === 'flow') { inflow += e.detail!.inflow as number; outflow += e.detail!.outflow as number; }
    h.inflow.push(inflow);
    h.outflow.push(outflow);
  };
}
