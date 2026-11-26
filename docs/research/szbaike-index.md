# SZBAIKE research index / 深圳百科资料索引

**Status:** crawl and first sort, 2026-11-23. The index covers **10,416 catalogue rows** across **47 sections with article records** (48 navigation entries), **1,078 full-text articles** scored as relevant, and **1,454 candidate factual sentences**. Everything here is a **lead**, not a verified fact. The site is a compilation with mixed provenance, and many of its articles are recent retrospectives.

**Browse:** [interactive index](szbaike/index.html) · **Data:** [`articles.csv`](../../data/research/szbaike/articles.csv) (10,416 rows) · [`useful.csv`](../../data/research/szbaike/useful.csv) (1,078 analysed articles) · [`candidate-facts.csv`](../../data/research/szbaike/candidate-facts.csv) (300 sentences).

Run the viewer from the repository root:

```powershell
npx vite --host 127.0.0.1 --port 5180 --strictPort
```

Then open `http://localhost:5180/docs/research/szbaike/`.

---

## 1. What was crawled

- **Catalogue:** 47 sections with article records, 446 listing pages, 10,416 unique article records. Each record keeps title, section, date, URL, score, years and M3 tags.
- **Full text:** 1,078 articles with a relevance score of 18 or more. The parser extracts the title, author, source, date, body text, years, place names and topic tags.
- **Candidate facts:** 1,454 sentences that contain a 1949–2009 year plus a place or a construction/event term. The viewer and CSV show the top 300; the full set stays in the git-ignored `data/raw/szbaike/`.
- **Not fetched:** articles scoring below 18, most of `social/culture` (2,064 records, largely literary works), and non-Shenzhen syndicated content. They remain in the catalogue CSV so a later search can reach them.

The scoring rewards Shenzhen place names, M3 areas, the 1979–2009 window, planning/construction/industry/housing/transport topics, and named book or oral-history sources. It penalises non-Shenzhen places and literary genres. The score is a finding aid, not a judgement of historical reliability.

## 2. Provenance and quality

The site rarely states a licence. Treat every page as `reference_only` until a specific article is checked. The most common named sources in the 1,078 analysed articles:

| Named source | Articles | Note |
|---|---:|---|
| 《深圳百科全书》 | 438 | The largest single block; encyclopedia entries, often short and factual. |
| 《难忘那些春天的故事 口述罗湖 1979—2019. 上》 | 81 | Oral-history series; strong on Luohu, Caiwuwei, Yumin, Sungang and the crossing. |
| 发现另一个深圳：深圳 78 街“全景画像” | 116 (all series) | 2024–25 street portraits; useful for present-day street context and some historical background, not for dated geometry. |
| 深圳风物志（地名密码卷、传统建筑卷、村落往事、风土人情卷） | 80+ | Place-name, village and building essays; often cites older gazetteers. |
| 《敢闯敢试：改革开放以来深圳创造的全国“率先”》 | 35 | “First in the country” claims; useful leads, often need a second source. |
| 深圳政府在线 | 34 | Official pages; still secondary for historical facts. |
| 深圳通史（近代卷） | 29 | Republican-era and late-Qing context. |
| 《南山掌故》 | 25 | Nantou and Nanshan detail. |

Source-type tags in the data: **book** 690, **street portrait** 116, **oral** 94, **government** 40, **web** 26, **other** 112. “Book” means the article names a book or gazetteer; it does not mean we have checked the book.

## 3. Coverage of the M3 core

“Catalogue” counts title/summary mentions across all 10,416 rows. “Tagged” counts the 1,078 analysed articles whose title or body repeatedly mentions the area; one article can carry several tags.

| M3 area | Catalogue mentions | Tagged articles | Best entry point |
|---|---:|---:|---|
| 渔民村 Yumin | 7 | 11 | 《渔民村改造规划》 + 吴颂球 oral history |
| 深圳墟 / 东门 Shenzhenxu | 19 (深圳墟 4, 东门 15) | 49 | 深圳墟何以称“东门”; 1875–1970 深圳墟 |
| 罗湖 / 国贸 Luohu–Guomao | 165 (罗湖 150, 国贸 3, 罗湖桥 12) | 214 | 罗湖桥 oral history; 国贸大厦建设 |
| 蔡屋围 Caiwuwei | 8 | 15 | 蔡屋围 + 蔡洪亮 oral history |
| 上步 / 华强北 Shangbu | 30 (上步 3, 华强北 23, 八卦岭 4) | 37 | 上步/八卦岭工业区规划; 华强北 |
| 蛇口 Shekou | 60 | 81 | 蛇口工业区规划; 蛇口风云 |
| 南头 Nantou | 29 | 80 | 南头; 南头古城; 一甲村 |
| 黄贝岭 / 文锦渡 Huangbeiling | 4 (黄贝岭 2, 文锦渡 2) | 15 | 黄贝岭村 + 张氏族谱; thin on 文锦渡 |
| 笋岗 / 清水河 Sungang | 28 (笋岗 20, 清水河 8) | 38 | 笋岗仓库; 李八一 oral history |
| 东湖 / 莲塘 Donghu–Liantang | 20 (莲塘 9, 深圳水库 11) | 42 | 深圳水库; 东湖公园; 莲塘 street portraits |

**Finding:** by catalogue mentions the site is strongest on **Luohu/Guomao, Shekou, Nantou and Huaqiangbei**, moderate on **Sungang, Dongmen/Shenzhenxu, Caiwuwei and Donghu–Liantang**, and thin on **Yumin, Huangbeiling and Wenjindu**. It complements the 1977 street map and the 1987 gazetteer plate rather than replacing them.

## 4. Best entry points by area

### 4.1 渔民村 Yumin

| Article | Source | Why it matters |
|---|---|---|
| [《渔民村改造规划》](http://szbaike.com/social/construction/city-planning/2022-03-19/1602.html) | 深圳百科全书 | Places the village at the Shenzhen–Buji river confluence; mentions the 1984 visit, 1992 handshake buildings and the 2001 rebuild. |
| [深圳渔民村：中国第一个万元户村](http://szbaike.com/course/system/reform-collection/2023-01-11/3953.html) | 敢闯敢试 | The “first 万元户 village” claim; dates differ inside the article (1980 vs 1981), so open a conflict. |
| [吴颂球：渔民村蝶变史是改革开放精彩样本（一）](http://szbaike.com/course/dictation/2024-09-04/8964.html) | 口述罗湖 | Resident oral history, four parts; the closest thing to a village voice. |
| [南湖精神·深圳速度特区标签（南湖街道）](http://szbaike.com/travel/m-culture/2025-01-03/10490.html) | 78街 罗湖 | Street-level context for the Yumin/Luohu edge. |
| [《渔农村改造规划》](http://szbaike.com/social/construction/city-planning/2022-03-19/1603.html) | 深圳百科全书 | Adjacent village redevelopment; useful comparison. |

### 4.2 深圳墟 / 东门 Shenzhenxu

| Article | Source | Why it matters |
|---|---|---|
| [深圳墟何以称“东门”](http://szbaike.com/humanity/place-name/2023-06-16/6527.html) | 深圳风物志·风土人情卷 | The name shift, the 1953 county seat move and the 1996/1999 redevelopment. |
| [1875—1970年，深圳墟：昔日繁华如烟云](http://szbaike.com/humanity/h-events/m-deeds/2023-01-06/3784.html) | 岁月山河 | Late-Qing and Republican market town; includes the 1899 British occupation. |
| [罗湖东门旧城改造规划](http://szbaike.com/social/construction/city-planning/2022-03-17/1537.html) | 深圳百科全书 | Planning frame for the old-town rebuild. |
| [民国前期的深圳地区：社会经济-广九铁路与深圳墟](http://szbaike.com/humanity/h-events/m-deeds/2024-07-10/8421.html) | 深圳通史（近代卷） | Railway–market relationship before 1949. |
| [东门老街的变迁](http://szbaike.com/humanity/h-events/m-deeds/2023-03-28/5622.html) | 深圳历史文化 | Short account of the street’s change. |
| [深港交流融合之门（东门街道）](http://szbaike.com/travel/m-culture/2025-01-03/10463.html) | 78街 罗湖 | Present-day street portrait; use for context, not dated geometry. |

### 4.3 罗湖 / 国贸 Luohu–Guomao

| Article | Source | Why it matters |
|---|---|---|
| [陈焕：罗湖桥上快门声声见证口岸变迁（一）](http://szbaike.com/course/dictation/2024-09-26/9307.html) | 口述罗湖 | Photographer’s account; 1979–80 footbridge, 1985 building, 2003 bridge move. |
| [1949—1979年，深圳火车站：说尽百年闲废兴](http://szbaike.com/humanity/h-events/m-deeds/2023-01-06/3802.html) | 岁月山河 | Station moved from 东门老街 to the Luohu site in 1950. |
| [深圳速度：国贸大厦建设](http://szbaike.com/course/c-summary/2023-01-06/3795.html) | 潮卷南海 | Construction sequence and the “三天一层楼” story. |
| [国贸大厦](http://szbaike.com/social/construction/construction-col/2022-03-18/1586.html) | 深圳百科全书 | Short building entry; dates need checking against the oral history. |
| [罗湖口岸及火车站地区综合规划设计](http://szbaike.com/social/construction/city-planning/2022-03-18/1542.html) | 深圳百科全书 | Planning frame for the station/crossing district. |
| [罗湖中心区](http://szbaike.com/social/construction/city-planning/2022-03-17/1533.html) | 深圳百科全书 | District-scale planning context. |

### 4.4 蔡屋围 Caiwuwei

| Article | Source | Why it matters |
|---|---|---|
| [蔡屋围](http://szbaike.com/humanity/place-name/2022-12-30/3646.html) | 深圳风物志·地名密码卷 | Place-name and village background. |
| [蔡洪亮：从“洗脚上田”到“洗脑进城”（一）](http://szbaike.com/course/dictation/2024-09-14/9126.html) | 口述罗湖 | 1975 cross-border cultivation, 1979 water supply; five parts. |
| [《蔡屋围新十坊改造规划》](http://szbaike.com/social/construction/city-planning/2022-03-19/1601.html) | 深圳百科全书 | 1999 urban-village redevelopment plan. |
| [百年蔡屋围（桂园街道）](http://szbaike.com/travel/m-culture/2025-01-03/10479.html) | 78街 罗湖 | Long-run street portrait; 1920s strike and later development. |

### 4.5 上步 / 华强北 / 八卦岭 Shangbu

| Article | Source | Why it matters |
|---|---|---|
| [上步工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1581.html) | 深圳百科全书 | The industrial-district plan behind the Shangbu grid. |
| [八卦岭工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1582.html) | 深圳百科全书 | 1982 start, 2.5 km², electronics/garment/printing mix. |
| [园岭住宅区](http://szbaike.com/social/construction/construction-col/2022-03-18/1560.html) | 深圳百科全书 | Early work-unit housing; compare with the 1980s street fabric. |
| [滨河住宅区](http://szbaike.com/social/construction/construction-col/2022-03-18/1561.html) | 深圳百科全书 | 1985 completion; housing block at the Shangbu edge. |
| [华强北街道](http://szbaike.com/humanity/place-name/2024-12-20/10051.html) | 78街 福田 | Present-day street context and the electronics market. |
| [深圳电子大厦](http://szbaike.com/travel/t-summary/2022-12-27/3572.html) | 中国电子第一街：华强北 | Building-scale lead for the electronics district. |

### 4.6 蛇口 Shekou

| Article | Source | Why it matters |
|---|---|---|
| [蛇口工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1580.html) | 深圳百科全书 | 1979-01 establishment, first open area, 2004 transfer to Nanshan. |
| [蛇口街道](http://szbaike.com/humanity/place-name/2022-12-30/3637.html) | 深圳风物志·地名密码卷 | Place-name and district background. |
| [深圳蛇口设立国内首家工业园区环保监测机构](http://szbaike.com/social/construction/e-protection/2023-03-31/5687.html) | 敢闯敢试 | 1979-01-31 approval and 1979-04-01 command; concrete dates. |
| [蛇口风云](http://szbaike.com/humanity/h-events/m-deeds/2023-03-28/5619.html) | 深圳历史文化 | Narrative account of the industrial zone. |
| [又一个蛇口模式：华侨城开发区](http://szbaike.com/course/c-summary/2023-01-06/3811.html) | 潮卷南海 | Comparison case for later development zones. |
| [蛇口自来水厂](http://szbaike.com/social/construction/water-management/2022-03-30/1833.html) | 深圳百科全书 | Infrastructure detail for the industrial town. |

### 4.7 南头 Nantou

| Article | Source | Why it matters |
|---|---|---|
| [南头](http://szbaike.com/humanity/place-name/2022-12-30/3634.html) | 深圳风物志·地名密码卷 | Place-name and old-town background. |
| [南头古城](http://szbaike.com/travel/h-architecture/2022-01-12/560.html) | 深圳百科全书 | Walled-town entry. |
| [《南头古城保护规划》](http://szbaike.com/travel/block/2022-03-18/1559.html) | 深圳百科全书 | Later conservation frame; not 1979 geometry. |
| [南头街道：一甲村](http://szbaike.com/humanity/village/2023-04-19/5806.html) | 南山掌故 | Village-level detail. |
| [南头古城报德祠](http://szbaike.com/humanity/relic/ruins/2023-04-10/5708.html) | 南山掌故 | Built fabric and heritage. |

### 4.8 黄贝岭 / 文锦渡 Huangbeiling–Wenjindu

| Article | Source | Why it matters |
|---|---|---|
| [黄贝岭——深圳宝藏打卡地](http://szbaike.com/humanity/village/2023-03-17/5525.html) | 深圳i百科 | Village background and present-day fabric. |
| [深圳黄贝岭村张氏族谱](http://szbaike.com/humanity/h-events/classics/2022-12-20/3457.html) | 海天出版社 | Lineage source; useful for village names, not geometry. |
| [深圳河畔，口岸林立](http://szbaike.com/humanity/h-events/m-deeds/2024-10-09/9327.html) | 奔腾的深圳河 | Crossing sequence along the river; includes Wenjindu context. |
| [罗湖区行政区划](http://szbaike.com/course/politics/regions/2022-01-14/671.html) | 罗湖政府在线 | Administrative frame for Huangbeiling/Wenjindu. |

**Gap:** the site has only two catalogue mentions of 文锦渡. Use the 1977 street map and the KH-9 mosaic for its geometry.

### 4.9 笋岗 / 清水河 Sungang–Qingshuihe

| Article | Source | Why it matters |
|---|---|---|
| [深圳笋岗仓库：中国出口监管第一仓](http://szbaike.com/industry/tertiary/foreign-trade/2023-01-17/4390.html) | 敢闯敢试 | Warehouse and export-supervision story. |
| [笋岗—清水河物流园区](http://szbaike.com/industry/traffic/t-summary/2022-02-28/1076.html) | 深圳百科全书 | Logistics district frame. |
| [李八一：“中国第一仓”在笋岗拔地而起（一）](http://szbaike.com/course/dictation/2024-09-06/9027.html) | 口述罗湖 | Oral history, four parts. |
| [笋岗村](http://szbaike.com/humanity/village/2022-04-01/1896.html) | 深圳风物志·村落往事 | Village background beneath the warehouses. |
| [交通线：从“三趟快车”驶向“交通枢纽”的清水河街道](http://szbaike.com/industry/traffic/t-summary/2025-01-03/10467.html) | 78街 罗湖 | Rail/freight context for the Qingshuihe corridor. |

### 4.10 东湖 / 莲塘 Donghu–Liantang

| Article | Source | Why it matters |
|---|---|---|
| [流到香江的水：建设深圳水库向香港输水](http://szbaike.com/humanity/h-events/m-deeds/2023-01-05/3751.html) | 潮卷南海 | Shenzhen Reservoir and the Hong Kong supply. |
| [1959—1978年，深圳水库：东江之水越山来](http://szbaike.com/humanity/h-events/m-deeds/2023-01-09/3838.html) | 岁月山河 | Reservoir chronology before 1979. |
| [东湖自来水厂](http://szbaike.com/social/construction/water-management/2022-03-30/1829.html) | 深圳百科全书 | Water infrastructure at the Donghu edge. |
| [深圳市东湖公园](http://szbaike.com/travel/t-summary/2022-12-28/3590.html) | 东湖公园菊花志 | Park history; later landscape context. |
| [莲盛业兴 初创摇篮（莲塘街道）](http://szbaike.com/travel/m-culture/2025-01-06/10520.html) | 78街 罗湖 | Present-day Liantang context. |

## 5. Cross-cutting themes

| Theme | Strong starting points |
|---|---|
| **Place names** | [深圳墟何以称“东门”](http://szbaike.com/humanity/place-name/2023-06-16/6527.html), [从宝安县到深圳市](http://szbaike.com/humanity/place-name/2024-09-14/9105.html), [蛇口街道](http://szbaike.com/humanity/place-name/2022-12-30/3637.html), [南头](http://szbaike.com/humanity/place-name/2022-12-30/3634.html), [蔡屋围](http://szbaike.com/humanity/place-name/2022-12-30/3646.html), [布吉](http://szbaike.com/humanity/place-name/2022-12-30/3629.html), [沙头角](http://szbaike.com/humanity/place-name/2022-12-30/3650.html) |
| **Villages** | [笋岗村](http://szbaike.com/humanity/village/2022-04-01/1896.html), [一甲村](http://szbaike.com/humanity/village/2023-04-19/5806.html), [黄贝岭](http://szbaike.com/humanity/village/2023-03-17/5525.html), [渔民村 oral history](http://szbaike.com/course/dictation/2024-09-04/8964.html), [蔡屋围 oral history](http://szbaike.com/course/dictation/2024-09-14/9126.html) |
| **Events and chronology** | [1949–1979 深圳火车站](http://szbaike.com/humanity/h-events/m-deeds/2023-01-06/3802.html), [1875–1970 深圳墟](http://szbaike.com/humanity/h-events/m-deeds/2023-01-06/3784.html), [深圳河畔，口岸林立](http://szbaike.com/humanity/h-events/m-deeds/2024-10-09/9327.html), [清水河大爆炸](http://szbaike.com/humanity/h-events/m-deeds/2024-10-16/9484.html) |
| **Planning and construction** | [上步工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1581.html), [八卦岭工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1582.html), [蛇口工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1580.html), [罗湖东门旧城改造规划](http://szbaike.com/social/construction/city-planning/2022-03-17/1537.html), [渔民村改造规划](http://szbaike.com/social/construction/city-planning/2022-03-19/1602.html), [笋岗地区法定图则](http://szbaike.com/social/construction/city-planning/2022-03-17/1521.html) |
| **Transport** | [广深铁路](http://szbaike.com/industry/traffic/railway/2023-11-02/7712.html), [海港运输](http://szbaike.com/industry/traffic/water-transport/2022-02-28/1087.html), [深圳宝安国际机场](http://szbaike.com/industry/traffic/aviation/2023-01-30/4786.html), [梅观高速](http://szbaike.com/social/construction/city-management/2022-03-25/1689.html), [机荷高速](http://szbaike.com/social/construction/city-management/2022-03-25/1688.html), [广深高速](http://szbaike.com/social/construction/city-management/2022-03-25/1695.html) |
| **Industry** | [八卦岭工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1582.html), [上步工业区规划](http://szbaike.com/social/construction/city-planning/2022-03-18/1581.html), [笋岗仓库](http://szbaike.com/industry/tertiary/foreign-trade/2023-01-17/4390.html), [深圳电子大厦](http://szbaike.com/travel/t-summary/2022-12-27/3572.html), [华强北](http://szbaike.com/course/c-summary/2025-01-02/10400.html) |
| **Housing and population** | [园岭住宅区](http://szbaike.com/social/construction/construction-col/2022-03-18/1560.html), [滨河住宅区](http://szbaike.com/social/construction/construction-col/2022-03-18/1561.html), [渔民村改造规划](http://szbaike.com/social/construction/city-planning/2022-03-19/1602.html), [蔡屋围新十坊](http://szbaike.com/social/construction/city-planning/2022-03-19/1601.html), [蔡屋围 oral history](http://szbaike.com/course/dictation/2024-09-14/9126.html) |
| **Oral history** | The 口述罗湖 series: [陈焕 on 罗湖桥](http://szbaike.com/course/dictation/2024-09-26/9307.html), [蔡洪亮 on 蔡屋围](http://szbaike.com/course/dictation/2024-09-14/9126.html), [吴颂球 on 渔民村](http://szbaike.com/course/dictation/2024-09-04/8964.html), [李八一 on 笋岗](http://szbaike.com/course/dictation/2024-09-06/9027.html), [李传芳 on 国贸](http://szbaike.com/course/dictation/2024-09-05/8983.html) |
| **Buildings and heritage** | [国贸大厦](http://szbaike.com/social/construction/construction-col/2022-03-18/1586.html), [深圳改革开放十大历史性建筑](http://szbaike.com/travel/h-architecture/2022-03-18/1585.html), [深圳传统建筑：宝安（本地）型](http://szbaike.com/travel/h-architecture/2023-06-19/6534.html), [南头古城](http://szbaike.com/travel/h-architecture/2022-01-12/560.html) |
| **Maps and imagery** | [深圳 78 街“全景画像”](http://szbaike.com/humanity/h-events/classics/2024-12-19/10039.html), [岁月山河](http://szbaike.com/humanity/h-events/m-deeds/2023-01-06/3784.html), [深圳通史（近代卷）](http://szbaike.com/humanity/h-events/m-deeds/2024-07-10/8421.html) |

## 6. Candidate facts and conflicts

The 300 candidate sentences are short verbatim snippets for verification, with the article link. They are not claims yet. The highest-value ones cluster around:

- **罗湖桥/口岸:** 1979–80 footbridge east of the old bridge; 1982-06 monitoring system; 1985-06-14 new joint-check building (70,623 m², 12 floors); 2003-09-28 old bridge moved 18 m.
- **国贸:** 1982 start; 1984-09-04 main structure completed at 160 m; completion dates differ between the encyclopedia entry and the oral history.
- **渔民村:** “first 万元户 village” appears as 1980 in one article and 1981 in another; 1992 handshake buildings; 2001 rebuild.
- **深圳墟:** 1953 county seat move; 1996 demolition; 1999 pedestrian street.
- **1980 SEZ:** 327.5 km², the four present-day districts.
- **Port throughput:** a 1979–2006 series for cargo and containers, useful for calibration leads but needing the original statistical source.

Open a conflict record before using any of these in content. The full candidate list is in [`candidate-facts.csv`](../../data/research/szbaike/candidate-facts.csv); the viewer shows the same 300.

## 7. How to use this index

1. **Search the viewer** by M3 area, era, source type or keyword. The table sorts by score, candidate-fact count or date.
2. **Read the article** at its URL. Check the named source and the article’s own date; many are 2022–25 retrospectives.
3. **Promote only what you use.** Create a source record in `data/evidence/sources/` with the article URL, title, author, date and `tier: D`, `reuse: reference_only`. Use the article URL plus a paragraph locator in the claim. Do not copy article text into the repository.
4. **Prefer the named book or oral history** over the website’s own summary. If the article cites 《深圳百科全书》 or a gazetteer, try to open that source; the website is a finding aid, not the authority.
5. **Do not treat catalogue counts as evidence.** A place with 150 mentions is well covered by the site, not necessarily well documented in 1979.

## 8. Limits

- **Tier D carrier.** The site is a compilation; article quality ranges from encyclopedia entries to personal essays. Tier D is the honest level until a specific article’s source is checked.
- **Recent retrospectives.** Many articles were written in 2022–25 and use present-day district names. They can mislead on 1979 boundaries and building counts.
- **Mixed content.** Some sections carry non-Shenzhen syndicated material (for example 永泰庄寨, 新县粉条, 松阳建筑). The scorer penalises these, but the catalogue still contains them.
- **No geometry.** The site has almost no maps or measured footprints. Use the 1977 street map, the 1987 gazetteer plate and the KH-9 mosaic for geometry.
- **No verification.** No claim from this index is `verified`. Candidate sentences are leads; dates and figures may conflict.
- **Rights.** Treat every article as `reference_only`. The site says some articles are authorised and others come from the web; do not redistribute text or images.
