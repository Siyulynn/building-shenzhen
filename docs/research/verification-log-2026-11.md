# Source-checking pass, November 2026
This pass checked the figures and sources cited by the v0.3 review of `PLAN.md`, together with a few earlier leads. The method was the standard prompt in `evidence-protocol.md` §8: an AI agent fetched each page and reported SUPPORTS, CONTRADICTS or DOES NOT MENTION, with quotes.

Under the protocol, everything below is at most **`sourced`**. A person still has to sign each claim off before it becomes `verified`. Translations are the agents' own.

**Pending intake.** No source here has yet been registered in `data/evidence/sources/` or stored with a hash in `data/raw/sources/`. Read "sourced" below as *sourced, pending intake*. Intake is the first job of the evidence tooling (`PLAN.md` §14, step 7).

## Results

| # | Claim | Source opened | Result | Status |
|---|---|---|---|---|
| 1 | End-2009 resident (常住) population was **891.23万** | Shenzhen government, 深府办〔2011〕46号, *深圳市住房保障发展规划（2011—2015）*, signed 2011-05-12 ([link](https://www.sz.gov.cn/zfgb/2011/gb745/content/post_4983558.html)) | **Supports.** "2009年末，深圳市常住人口891.23万人". The same page gives end-2009 registered (户籍) population as **241.45万** (27.1% of residents) | sourced |
| 2 | End-2009 resident population was **995.01万** (2014 yearbook) | not reached | **Not checked.** It is probably the census-revised vintage (§Conflicts) | lead |
| 3 | Only **12%** of the affordable housing arranged in 2006–10 was completed by end-2010 | Same housing plan | **Supports, with a nuance.** "至2010年末，全市已竣工保障性住房约2万套（占"十一五"16.9万套的12%）". That is 12% of units *arranged* (169,018 in total) | sourced |
| 4 | 2009 GDP was 8,201亿元 | Same housing plan | **Supports:** 8201.32亿元 | sourced |
| 5 | Basic construction took **35.5%** of municipal-level spending in 1994 | *深圳市1994年预算执行情况和1995年预算（草案）的报告*, delivered 1995-05-18 ([link](https://www.sz.gov.cn/zfgb/1995/gb71/content/post_10056253.html)) | **Supports.** Basic construction spending was 171,171万元, "占市级财政支出的35.5%" | sourced |
| 6 | New roads and bridges pushed maintenance costs up | Same report | **Supports.** City maintenance spending was 20,922万元, up 47.36%, because many new roads and bridges came into use in 1994 | sourced |
| 7 | Land-transfer receipts were counted inside the 1994 budget, then presented differently from 1995 | Same report | **Supports.** In 1994: 国有土地使用权有偿转让收入 55,000万元 was inside the budget. For 1995: "国土使用权有偿出让收入不纳入预算" (moved to a separate 特区开发收入 section) | sourced |
| 8 | 1994 budget totals | Same report | Citywide budgetary revenue **74.4亿**, spending **74.6亿**. Municipal-level revenue **50.08亿**, spending **48.21亿**. Consistency check: 17.1171亿 / 48.21亿 = 35.5% ✓ | sourced |
| 9 | 2009 fiscal figures: ¥276.53bn originating in Shenzhen, ¥88.08bn local general-budget revenue, ¥100.08bn general-budget spending | The review's link turned out to be the **State Council tax-sharing decision (1993-12-15)** ([link](https://www.sz.gov.cn/zfgb/1994/gb49/content/post_10090769.html)), which has no 2009 data | **Citation mismatch confirmed.** These figures are unsourced. A search found only 2008 figures from the 2009 government work report (search summary only): 全口径 2,830亿, of which 2,029亿 went to the centre, and local general-budget revenue 800.4亿 | lead |
| 10 | 1994 tax sharing: VAT 75/25; consumption tax and customs central; business tax local | The same State Council decision | **Supports, with exceptions:** "增值税中央分享75%，地方分享25%". Business tax is local, *except* tax paid centrally by the railways, bank head offices and insurance head offices. Enterprise income tax follows the firm's affiliation; local banks, foreign banks and non-bank financial firms go to the centre. Personal income tax is local. **Securities trading tax (证券交易税) is split 50/50**; ordinary stamp duty is local. **Tax rebate:** 1993 is the base year, growing at 0.3 times the national growth of VAT and consumption tax | sourced |
| 11 | Shenzhen statistics separate hukou holders from those who usually live in the city | Statistics bureau reply, 2025-03-03 ([link](https://www.sz.gov.cn/hdjlpt/detail?pid=3102666&via=pc)) | **Supports.** "常住户籍人口…既是'户籍人口'又同时是'常住人口'的人"; "我局统计人口指标为常住人口口径" | sourced |
| 12 | Forex retention (外汇留成) was a quota to buy foreign exchange | SAFE, *外汇管理历史沿革*, 2018 ([link](https://www.safe.gov.cn/safe/2018/1109/10674.html)) | **Supports.** Retention began in **1979**: "给予出口企业购买外汇的额度". It was **abolished in early 1994**, when the bank settlement system and a single managed floating rate came in. No founding date is given for the swap centres | sourced |
| 13 | In 1986, land-use fees covered about **6%** of infrastructure capital investment, and not even the interest on bank borrowing | Shen & Xu, "China: Shenzhen Special Economic Zone as a Policy Reform Incubator", in X. Shen (ed.), *Untying the Land Knot*, World Bank 2012, pp. 90–91 ([PDF](https://documents1.worldbank.org/curated/en/622661468339570756/pdf/690730PUB0Publ067902B09780821389706.pdf)) | **Supports.** "By the end of 1986, the annual collection of land use fees was only 1.5 percent of the annual government revenue, or 6 percent of the capital investment for infrastructure." The same chapter gives the land regulations of November 1981 (land-use certificates for 20–50 years; industrial land ¥10–30/m²/yr, commercial ¥70–200/m²/yr), says free allocation was abolished in 1982, and describes an October 1986 task force on land reform | sourced (tier C) |
| 13a | Under negotiated leases, the minimum land-use fee was often waived | Same World Bank chapter | **Supports.** "A minimum land use fee was required, but it was usually much lower than the market value. Frequently, even this small fee was waived, as local officials were anxious to attract new investment projects." (Page to record at intake) | sourced (tier C) |
| 14 | GDP uses the production approach, with nominal and constant prices | National Bureau of Statistics, *国内（地区）生产总值概述*, 2024 ([link](https://www.stats.gov.cn/zs/tjws/zytjzbqs/gnsczz/202409/t20240909_1956324.html)) | **Supports.** "增加值＝总产出－中间投入"; "GDP核算分为现价核算和不变价核算" | sourced |
| 15 | Shenzhen University has 1977 aerial imagery | SZU exhibition notice, *鹏城图鉴*, 2021-12-14 ([link](https://saup.szu.edu.cn/info/1017/2206.htm)) | **Partly supports.** The exhibition showed "深港区域USGS航拍影像（1977年）" and USGS images from 1969 of Xin'an old town and Futian villages. The imagery is **credited to the USGS**, and the page does not say SZU holds the originals. **Follow-up:** look for the frames in the USGS archives | sourced |
| 16 | NASA has a Landsat sequence of Shenzhen for 1973–2001 | NASA Scientific Visualization Studio, items 2911, 2762, 2763 (search summary) | **Supports (search summary).** Nine Landsat scenes: 1973, 1975, 1977, 1979, 1988, 1992, 1995, 2000, 2001. Credits Darrel Williams (NASA) and Karen Seto (Stanford) | lead → open the pages |
| 17 | The GAIA dataset gives yearly change to impervious surface at 30 m from 1985 | Gong et al. 2020, *Remote Sensing of Environment* 236:111510. Earth Engine `Tsinghua/FROM-GLC/GAIA/v10` (search summary) | **Supports (search summary).** 1985–2018, 30 m, transition year per pixel; reported overall accuracy above 90%. The licence is listed as CC BY 4.0 on some catalogue language versions. **Confirm the licence** on the live page | lead → confirm licence |
| 18 | Yumin Village: about 0.25 km², shareholding company in 1992, redevelopment from 2001 | *Shenzhen Noted* article: **behind a login wall, not readable.** A search summary of a Sohu article mentions 渔丰实业股份有限公司 (1992), one of the first village joint-stock companies, and redevelopment starting in 2001 | **1992 and 2001 corroborated by a search summary only. The area is unconfirmed** | lead |
| 19 | Housing stock, end-2009 and end-2010 | Same housing plan as V1 | **Supports.** End-2009: "常住人口人均住房建筑面积27平方米"; 住房成套率84.2%; 住房自有率40%. End-2010: "全市住房总建筑面积4.09亿平方米，约810万套"; commodity housing 1.02亿 m², about 110万 units; affordable housing about 0.27亿 m² (6.6% of the total), about 27万 units | sourced |

## Imported into `data/evidence/` (2026-11-23)
These rows are now claim records. Under the protocol, `sourced` needs a locator **and a verbatim quote**. Eight claims the agents reported in their own words, without a verbatim sentence, were therefore imported as `lead`, pending a quote at intake:
- the registered population (V1);
- 2009 GDP (V4);
- the maintenance figures (V6);
- the 1994 land receipts (V7);
- the 1994 budget totals (V8);
- the business-tax exceptions, the rebate rule (both V10) and the abolition of retention (V12).

Run `npm run evidence:status` for the current list.

## Conflicts opened
- **`conflict.pop.resident.2009`**: 891.23万 (2011 housing plan) against 995.01万 (2014 yearbook, not yet opened). These are probably vintages from before and after the census revision. An implied figure from an earlier search (2009 GDP divided by per-capita GDP, about 884万) matches the earlier vintage. Decide on one vintage for calibration (see the protocol §6 example).

## Corrections to the plan this pass requires
- **The 2009 fiscal figures** in `PLAN.md` §3.6 are unsourced and can't be used as calibration examples until the 2009 budget report is found.
- **The 1994 State Council decision is a primary source for the fiscal regime.** It supersedes the review's summary and adds the business-tax exceptions. The decision text assigns *securities trading tax* (证券交易税) 50/50. The review said *stamp duty*, and it may well be right in substance: what was actually levied on share trades, and how its split moved later, is `lead` and needs its own source.
- **Rename the 1977 aerial imagery** to "USGS aerial imagery (1969, 1977), shown by SZU". The search target is the USGS archive.

## Sources seen only in search summaries this pass
- [NASA SVS 2911: urbanization around the Pearl River Estuary 1973–2001](https://svs.gsfc.nasa.gov/2911)
- [NASA SVS 2763: 20-year urbanization of Shenzhen](https://svs.gsfc.nasa.gov/2763)
- [Earth Engine catalogue: Tsinghua FROM-GLC GAIA v10](https://developers.google.com/earth-engine/datasets/catalog/Tsinghua_FROM-GLC_GAIA_v10)
- [Sohu article on Yumin Village](https://www.sohu.com/a/458940896_123753)
