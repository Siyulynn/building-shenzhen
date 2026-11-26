# Power supply in early Shenzhen, 1979–1984
**Session:** 2026-11-24. **Scope:** evidence only. This note does not change the sim, the slice spec or any parameter. It answers what the record supports about where early Shenzhen's electricity came from, how much there was, and whether a "buy power" function is historically sound.

All claims below are `sourced` (extracted from a page opened that day), not `verified`. Records: `data/evidence/claims/phase1_power_supply.yaml`; sources: `data/evidence/sources/phase1_power_*.yaml` and `phase1_liang_lingguang_power.yaml`.

---

## 1. The finding in one paragraph

Early Shenzhen did not make most of its own power. From August 1965 to 1987 the provincial grid (`省网`) was the city's main source, and local generation was small, with oil-fired plants appearing only after 1978 (`phase1.power.source_mix.provincial_grid.1965_1987`, `phase1.power.local_fuel_plants.1979_1987`). In March 1979 the Guangdong grid agreed to buy electricity from Hong Kong's China Light & Power, and the first link landed at the Shuibei 110 kV substation **inside Shenzhen** but fed the provincial grid, not a Shenzhen city contract (`phase1.power.hk_purchase.agreement.1979_03`, `phase1.power.hk_link.route.1979`). Shekou is the exception: it asked for its own submarine cable from Hong Kong because the provincial bureau objected, and the governor approved it (`phase1.power.shekou.hk_cable.approval`).

So a "purchase electricity" mechanic is not a design convenience. It describes the actual supply relationship: the city bought bulk power through the provincial system, and the provincial system bought some of it from Hong Kong. What the record does **not** give is a 1979–84 tariff, the volume of the Guangdong–CLP contract, or the capacity of the tie that served Luohu and Shangbu.

---

## 2. Timeline the sources support

| Date | What the sources say | Claim |
|---|---|---|
| 1965-08 | Provincial-grid power becomes Shenzhen's main source, and remains so until 1987 | `phase1.power.source_mix.provincial_grid.1965_1987` |
| 1979-03 | Guangdong grid agrees to buy power from China Light & Power | `phase1.power.hk_purchase.agreement.1979_03` |
| 1979 | First Guangdong–Hong Kong link: double-circuit 66 kV, Fanling → Shuibei 110 kV, into the Guangdong grid | `phase1.power.hk_link.route.1979` |
| 1979-04 | Guangdong connects to the Kowloon grid and begins importing | `phase1.power.hk_link.commissioned.1979_04` |
| 1979 | City grid at the bureau's formation: 1 × 110 kV substation, 1 × 110 kV line (and, in a later passage, 6 × 35 kV lines); 25.8 MVA of main transformers | `phase1.power.grid.110kv_substations.1979`; existing `phase1.power.shenzhen_grid.transformer_capacity.1979` |
| 1979-08 | 深圳供电局 formally established (a conflicting account says 1979 renaming, 1980 name) | `phase1.power.bureau.founded.1979_08`; conflict `conflict.phase1.power.bureau_founding` |
| 1979 | 0.33亿 kWh, labelled supply by the city portal and all-society consumption by two other accounts; 0.4125亿 consumption in a 2020 深圳新闻网 statistical feature | conflict `conflict.phase1.shenzhen.electricity_consumption.1979` |
| 1979 | Maximum load 0.5万千瓦 (5 MW) | `phase1.power.city.max_load.1979` |
| 1980 | 4 substations in total, one of them 110 kV (the article's 110 kV count starts at 1); consumption 0.5434亿 kWh | `phase1.power.grid.substations.1980`, `phase1.power.city.annual_consumption.1980` |
| 1980 onward | Supply and consumption growing more than 60% a year | `phase1.power.demand.growth.1980_on` |
| 1982 | All-society consumption passes 1亿 kWh | `phase1.power.city.annual_consumption.1982` |
| 1983–85 | Shekou's cable request approved; the memoir dates it only to Liang Lingguang's governorship | `phase1.power.shekou.hk_cable.approval` |
| 1984 | A severe shortage begins; 1985–86 gap 48%, 1988–90 gap 40%; household quotas and fines | `phase1.power.shortage.1984_1990`, `phase1.power.shortage.gap.*`, `phase1.power.rationing.1984_1990` |
| 1984 | Shajiao B BOT agreed: 2 × 350 MW, US$500m, 15 years, 0.114 HKD/kWh | `phase1.power.shajiao_b.tariff.1984` |
| 1987 | Shajiao B operates; the provincial grid remains the main source to this year | `phase1.power.source_mix.provincial_grid.1965_1987` |
| 1996 | Guangdong stops buying Hong Kong power, except Shekou | `phase1.power.hk_purchase.end.1996` |

The Hong Kong–Shenzhen story in the 2025 文匯報 feature (`phase1.power.wenweipo.1979_link`) is consistent with this, but its dated assets are the 1992 500 kV channel and 1996 mutual supply. Its 1979 sentence does not establish a city-owned Shenzhen–Hong Kong purchase.

---

## 3. What the numbers imply (arithmetic, not evidence)

| Year | Annual energy | Average load over 8,760 h |
|---|---:|---:|
| 1979 | 33 GWh (supply label) | 3.8 MW |
| 1979 | 41.25 GWh (consumption label) | 4.7 MW |
| 1980 | 54.34 GWh | 6.2 MW |
| 1982 | ≥100 GWh | ≥11.4 MW |

- The 1979 maximum load of 5 MW against 25.8 MVA of transformers means the **network was not the binding constraint in 1979**; at unity power factor, 5 MW is under a fifth of the rating. Supply was the constraint.
- By 1982 the average load alone is 11.4 MW, so the peak pressed the same 25.8 MVA rating. That matches the former director's "substations overload as soon as they are built" (`phase1.power.demand.growth.1980_on` notes). **This is the shift the slice should feel: scarce energy at the start, scarce network by the end.**
- The 60% growth statement fits 33M → 54.34M (+65%) but not 41.25M → 54.34M (+32%). That is an argument for treating 33M as the 1979 base of the growth series. It is not a resolution of the labels: the conflict stays open.

These are order-of-magnitude checks. They cannot set a per-area feeder limit.

---

## 4. Does a purchase-electricity function belong in Phase 1?

**The mechanism already exists.** `buy_power` is a fiscal action (`packages/sim-core/src/fiscal.ts`): it adds `kw` to an area's spare power capacity at once and creates a permanent monthly service obligation at `fiscal.power_import.yuan_per_kw_month` (8 in `params/slice.yaml`). It assumes the network already reaches the area. The spec describes it in §5.6 and says its tariff and the source's limit are placeholders "until the source (Hong Kong or Guangdong) and the network's capacity have claims". The M6b log records that no policy uses it because floor, ramp and crews bound output before power does.

So the task is not to add the function. It is to decide whether the function's **shape** survives the evidence, and to replace its placeholders when the numbers arrive.

What the evidence supports:

1. **Buying was normal, not a fallback.** Provincial-grid purchase was the main supply for the whole slice. A card that offers "buy 500 kW from the grid" is more historically typical than one that offers a municipal generator.
2. **The seller is the province, not Hong Kong.** For 1979–84 the city's counterparty was the provincial grid. Hong Kong is the province's upstream source. Shekou is the one place with a direct Hong Kong arrangement. A design that lets the player buy "from Hong Kong" directly should say it is modelling the province's import and the city's allocation, or restrict it to Shekou.
3. **The network limit is real but later.** In 1979 the transformers had headroom; by 1982 they did not. A per-area tie limit is defensible, but it can start loose and tighten, rather than binding on turn 1.
4. **A monthly capacity charge is a reasonable abstraction.** The one documented purchase price is per kWh (0.114 HKD at Shajiao B, 1984), but a monthly turn needs a capacity-like charge. ¥8/kW-month is equivalent to 2.7–5.3 fen/kWh at 300–150 utilisation hours a month, which brackets the 3.8 fen/kWh implied by 0.114 HKD at the excerpt's 3 HKD ≈ ¥1. That is a **plausibility check, not a calibration**: the Shajiao B price is from 1984 and a different seller.
5. **Do not add a forex cost yet.** The record does not say whether Shenzhen's or Guangdong's purchases were settled in RMB or foreign currency. The 1979–84 provincial purchase probably sat inside the state plan; Shekou's Hong Kong cable is the case most likely to need forex. Flag it as open, do not invent it.
6. **Rationing is a later-phase consequence.** The 48%/40% gaps and household quotas begin in 1984 and belong to the post-slice arc. Phase 1 ends at 1984-Q1, so at most this is a closing-card warning, not a mechanic.

Recommended Phase 1 position: **keep `buy_power` as a finance action, keep the rate labelled a placeholder, add no network model.** When a 1979–84 tariff or the tie capacity is found, replace the rate and add a per-area kW ceiling. Phase 2 owns feeders, substations and the physical network.

---

## 5. Open leads (in priority order)

1. **CLP annual reports, 1979–1990.** A listed-company report is tier B and should give GWh sold to Guangdong and to Shekou, with revenue — enough to derive an average price. Start with the years around the 1979 agreement and the 1986 Shekou contract.
2. **A 1979–84 Shenzhen or Guangdong tariff schedule.** The Liang Lingguang excerpt gives a 1 fen/kWh provincial surcharge and a dual-track "old plant old price, new plant new price" system (`phase1.power.tariff.surcharge.early_1980s`), but no retail or bulk tariff. Look for 广东省物价局/电力工业局 notices and 深圳供电局 tariff tables.
3. **The 1985 yearbook page image, p. 326** (`特区电力管理与供电状况_85.pdf`). The existing claims come from its text layer; the founding month and the start-of-period supply description need a page-image check. This is also the likely place for an annual 供电量 table.
4. **Feeder and substation capacity serving Luohu and Shangbu, 1979–84.** The 25.8 MVA figure is a system total. A 110 kV feeder rating or a substation load record would let the game set a per-area ceiling.
5. **Shekou's supply before 1986.** When did the cable run, who paid, and what did it carry? The 2023 memoir gives approval, not commissioning. A Hong Kong yearbook lead places CLP's 20-year Shekou and Chiwan contract at end-1986, which is later than the slice; that lead still needs a page.
6. **The 1984–85 shortage inside the SEZ.** Did the 48% provincial gap translate into SEZ quotas, and when? This would tell us whether the slice's final quarters should already feel a cut.

---

## 6. Sources added this session

| Source | Tier | What it gave | Local copy |
|---|---|---|---|
| `phase1_power_szepta_2019` | D | 1979 inventory, August founding, >60% growth, 1982 threshold, 25.8 MVA | hashed |
| `phase1_power_sznews_2021` | D | provincial grid as main source 1965–87; local oil plants; Shajiao B 1987 | hashed |
| `phase1_power_sasac_2020` | D | 0.33亿 as consumption, 5 MW peak, 1979 renaming / 1980 bureau name | hashed |
| `phase1_power_nea_2012` | D | March 1979 Guangdong–CLP agreement; Fanling–Shuibei 66 kV route | hashed |
| `phase1_power_wenweipo_2025` | D | 1979 origin sentence; 1992 channel, 1996 mutual supply | hashed |
| `phase1_liang_lingguang_power` | C | provincial capacity and rationing, Shekou cable, April 1979 link, Shajiao B tariff, surcharge | hashed |
| `phase1_power_sohu_2010` | D | 1980 4 substations / 0.5434亿 kWh, 1984–90 shortage and gaps | hashed |
| `phase1_power_rmrb_2022` | D | 1979 purchase start, 1996 end, Shekou exception | hashed |

All eight were opened on 2026-11-24 and saved under `data/raw/sources/<id>/page.html` with a SHA-256 in the source record. Seven are journalistic retrospectives (tier D), and one is a book excerpt (tier C). None is a primary statistical table. The 1985 yearbook remains the only tier-A power source in the store, and it is a scanned PDF whose text layer is already in use.

---

## 7. What this session did not do

- It did not verify any claim. Every record is `sourced` and waits for a person.
- It did not change `params/slice.yaml`, the spec or the sim. The ¥8/kW-month rate and the "network assumed" simplification stand, now with a documented evidence gap.
- It did not resolve the 1979 consumption label, the bureau's founding month or the 35 kV/110 kV contradiction. Each has an open conflict record.
