# The 1981 Lo Wu pedestrian bridge / 1981年罗湖人行桥

Check on the open note in `core_basin.luohu.bridge_parallel_deck`: was the 1981 deck parallel to the railway bridge, and where exactly did it sit? Short answer: **yes, parallel; a later history puts it 11 m east of the railway bridge, and a photo caption dates its opening to 15 January 1981.** The 11 m figure is single-source and unmeasured; deck width and approaches are still open.

Claims: `core_basin.luohu.bridge_parallel_deck` (existing), `core_basin.luohu.bridge_parallel_deck_offset`, `core_basin.luohu.pedestrian_bridge_opened_1981_01_15`. Sources: [`core_basin_luohu_bridge_interview`](../../data/evidence/sources/core_basin_luohu_bridge_interview.yaml), [`szbaike_2024_luohu_bridge`](../../data/evidence/sources/szbaike_2024_luohu_bridge.yaml), [`phase1_2020_pengcheng_shiji_luohu`](../../data/evidence/sources/phase1_2020_pengcheng_shiji_luohu.yaml).

## What each source says

| Source | Statement | Claim |
|---|---|---|
| 深圳特区报, 2024-10-05, port staff 黄荣胜 | "直到1981年，在铁路桥旁边兴建了一座人行桥，人车才分流。1985年……罗湖桥东侧建起一座全新的双层通道桥。" | `core_basin.luohu.bridge_parallel_deck` |
| 杨黎光, 《风雨罗湖桥》, 2024 | "1981年，在铁路桥东侧11米建起了一座专供旅客通关的人行桥，罗湖桥成了铁路桥和人行桥并行的口岸通道。" | `core_basin.luohu.bridge_parallel_deck_offset` |
| 甲骨文传媒, 《鹏城史记》⑭, 2020 | Photo caption: "1981年1月15日，中英合建的新罗湖行人桥新桥正式启用。" | `core_basin.luohu.pedestrian_bridge_opened_1981_01_15` |

The two 2024 accounts agree on the year and on "beside / east of" the railway bridge; only 杨黎光 gives the 11 m. The 2020 caption gives the day but not the offset. The 1985 double-deck bridge, which replaced the arrangement, is separately given as about 61 m long and 9.6 m wide, upper deck outbound and lower deck inbound (`phase1_2020_pengcheng_shiji_luohu`).

## What this fixes, and what it doesn't

**Fixed (to the standard of the sources):**
- The 1981 deck was a separate structure alongside the railway bridge, not a widening of it; pedestrians and trains were separated in 1981.
- "Parallel" is supported by 杨黎光's "并行" and by the 2024 account's "旁边"; it is not a surveyed alignment.
- A day for the opening, 15 January 1981, from a captioned photograph.
- The 1985 replacement was east of the old crossing and double-deck.

**Still open:**
- Whether 11 m is a centre-line offset, a clear gap between structures, or an approximate span. The source gives no method.
- Deck width, stair/ramp positions, and which bank each approach landed on.
- The exact plan position of the railway bridge in 1981, and therefore the deck's absolute coordinates.
- Whether the 1981 deck was rebuilt in place in 1985 or replaced by a new structure at a slightly different line. The 2024 port-staff interview says a new double-deck bridge was built east of the old crossing; 杨黎光 says the pedestrian bridge was "改造成" a double-deck bridge. Both agree it was double-deck and opened with the new terminal.
- Whether the 15 January 1981 opening caption refers to the same deck as the 11 m structure. Both are new pedestrian bridges dated 1981, but no source names both together.

## Why the imagery doesn't settle it

- The 1980-09-11 KH-9 frame predates the deck (it shows the railway crossing only).
- The 1984 Landsat scene has no band data over Luohu.
- The 1982 city map reproduced in the 2021 photo article is cut off at the Shenzhen River; the crossing falls on the paper edge, so the deck cannot be read from it.
- The Hong Kong 1983-12-22 flight (frames 52327R–52329R, 1:20,000) would cover the crossing but is restricted and no scan is in hand (`docs/research/hk-flight-candidates.md`).

## Next steps

- Obtain a 1982–84 survey plan or a 1983–85 aerial of the Luohu crossing; measure the two bridge centrelines and the gap.
- Ask 深圳口岸管理服务中心 or 深圳海关 for a 1981 opening photograph with a known camera position, and for the 1985 conversion drawings.
- If the game shows the January 1984 crossing, model the 1981 deck as a separate parallel footbridge east of the rail bridge, with 11 m as a design-note value only until measured.
