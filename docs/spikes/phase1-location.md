# Where could a factory migrant live?

Run `npm run spike:location` from the repository root. This offline experiment compares the first-pass location weights in [Phase 1 §5.2](../design/systems/phase1-slice.md) using the seven playable areas and rental capacity in the placeholder start state. It holds the number of arrivals fixed and asks only **where** they could live.

| Method reference | What the experiment uses |
|---|---|
| A/B Street, Apache-2.0: [`Isochrone` / `times_from`](https://github.com/a-b-street/abstreet/blob/0964f29315820c91b171b585eb51e300164e9197/apps/fifteen_min/src/isochrone.rs) | Count opportunities reachable within a budget. Instead of timed street paths to amenities, count factory vacancies within zero or one playable-area boundary crossings. Adjacent cells must share an edge. |
| UrbanSim, BSD-3-Clause: [`mnl_probs`](https://github.com/UDST/urbansim/blob/1a9a68e9bfe34dd31c68bf9480c4fc65334663e0/urbansim/urbanchoice/mnl.py) | Normalize location utilities using max-shifted softmax. Here utility is `ln(free beds + reachable vacancies)`; areas without free beds are excluded. This choice reproduces the game's relative weights at zero hops by construction. |

Both calculations are independent TypeScript implementations. No upstream code, coefficients or map data are bundled.

**Result.** Give Shangbu 100 hypothetical factory vacancies and the other areas zero. Counting jobs one area away raises Caiwuwei’s share from 6.90% to 20.47% and Sungang’s from 4.60% to 18.90%; Shangbu’s falls from 32.41% to 22.20%. Area 6 has no spare beds and stays at zero. These are normalized weights before integer allocation or bed-cap redistribution, not observed residence shares.

**Decision:** keep the current allocator. The useful candidate is the *reachable vacancies* input: the same job opening can make housing across a boundary more attractive. The logit alone adds nothing with the chosen utility. Edge contact says nothing about bridges, road quality or commute time. Before changing play, compare the local and reachable variants using reviewed period connections and independent area-level residence or worker-flow observations at the slice checkpoints. Whole-SEZ totals cannot distinguish these alternatives.
