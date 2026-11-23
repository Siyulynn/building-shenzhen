/** Tick step 7, M2: beds, crowding, the cap and rents (phase1-slice.md §5.2). */
import { isMigrant } from '../enums.js';
import type { SliceParams } from '../params.js';
import type { TickContext } from '../step.js';
import { largestRemainder } from '../round.js';
import { bedsByPool, groupsIn, leave } from './common.js';

export function housing(p: SliceParams) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const H = p.housing;
    for (const m of s.housing) {
      const b = s.blocks.find((x) => x.area === m.area);
      m.beds = b ? bedsByPool(b, p) : { local: 0, rental: 0 };
      const groups = groupsIn(s, m.area);
      const migrants = groups.filter((g) => isMigrant(g.kind));
      let rental = migrants.reduce((a, g) => a + g.size, 0);           // usual residents: away migrants keep their beds

      // above the cap, the excess leave this month (an outflow), newest arrivals first
      const cap = Math.floor(H.crowding_max * m.beds.rental);
      if (rental > cap) {
        const split = largestRemainder(rental - cap, migrants.map((g) => g.size));
        migrants.forEach((g, i) => {
          const n = leave(g, split[i]!);
          if (n <= 0) return;
          ctx.events.push({ step: 'housing', kind: 'flow', detail: { area: g.area, pop: g.kind, inflow: 0, outflow: n, reason: 'crowding_cap' } });
        });
        rental = migrants.reduce((a, g) => a + g.size, 0);
      }
      m.occupants = { local: groups.filter((g) => !isMigrant(g.kind)).reduce((a, g) => a + g.size, 0), rental };
      m.crowding = rental / Math.max(1, m.beds.rental);
      const target = H.base_rent * Math.pow(Math.max(m.crowding, H.crowding_floor), H.rent_elasticity);
      m.rent += H.rent_speed * (target - m.rent);
    }
  };
}
