# Phase 1 map sources, 1977–1985 / 第一阶段地图资料

Research checked 2026-11-23. This is an acquisition and evidence register for the Phase 1 map spike. The wider map search to 1992, including post-1984 city maps, plans and atlases, is in [`shenzhen-maps-to-1992.md`](shenzhen-maps-to-1992.md).

## 1. KH-9 on 11 September 1980 / 1980年9月11日影像

EarthExplorer Declass 3, mission 1216-3, operations 662. I read the four catalog corners for all ten requested frames and tested the following representative points in longitude, latitude order. These are approximate district reference points for testing scene coverage.

| Reference location | Longitude, latitude |
|---|---|
| Luohu / 罗湖 | 114.120, 22.540 |
| Shekou / 蛇口 | 113.920, 22.490 |
| Shangbu / 上步 | 114.085, 22.544 |
| Nantou / 南头 | 113.923, 22.534 |

| EarthExplorer frame suffix | Luohu | Shekou | Shangbu | Nantou | Bulk product |
|---|---|---|---|---|---|
| A045–A047, A049 | | | | | |
| **A048** | Yes | Yes | Yes | Yes | Standard Format, 1.42 GiB. Archived and checked. |
| F045, F046, F049 | | | | | |
| **F047** | Yes | | Yes | Yes | Standard Format, 1.92 GiB. Archived and checked. |
| **F048** | | Yes | | Yes | Standard Format, 1.51 GiB. Archived and checked. |

All suffixes take the prefix `D3C1216-300662`. The three ordered footprints are below, clockwise from the northwest corner.

| Suffix | NW | NE | SE | SW |
|---|---|---|---|---|
| A048 | 113.642, 22.660 | 114.933, 22.498 | 114.923, 22.330 | 113.664, 22.423 |
| F047 | 113.744, 22.750 | 114.993, 22.576 | 114.961, 22.411 | 113.666, 22.523 |
| F048 | 113.716, 22.595 | 114.964, 22.422 | 114.932, 22.256 | 113.638, 22.369 |

All three archives passed integrity checks and each contains four TIFF segments. The source records under `data/evidence/sources/kh9_1980_09_11_*.yaml` give the archive locations and SHA-256 checksums.

Start with A048 for an overview and use F047 for the Luohu–Shangbu corridor and F048 for Shekou and Nantou. Inspect cloud, frame edges, local contrast and geometry before tracing. The USGS catalog's 2–4 ft camera resolution is a camera classification. The usable ground detail and registration error will vary across each scan. The September 1980 images postdate the 1979 start state and Shekou's first construction works. Date observations to the image and require earlier corroboration for features seeded in 1979. [EarthExplorer](https://earthexplorer.usgs.gov/) · [USGS Declass 3 collection](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-3)

## 2. November 1984 Landsat / 1984年11月陆地卫星

The [USGS bulk order](https://dds.cr.usgs.gov/queue/orderlist/BulkDownload/Shenzhen%201980%20KH-9%20and%201984%20Landsat/1) contains the three KH-9 scans and the 29.09 MiB full Level-1 bundle for `LM05_L1TP_121044_19841122_20200902_02_T2` (entity ID `LM51210441984327FFF03`). The Landsat file is archived and hashed. Its metadata reports 0% scene and land cloud, 60 m pixels and 18.450 m geometric model RMSE.

The catalog's northwest and southwest corners are 114.50220°E, 24.11073°N and 114.09159°E, 22.34607°N. A check of the actual `QA_PIXEL` band found fill at the Luohu reference point and the Shekou, Shangbu and Nantou points outside the raster. Sampled at the 100 m grid cell centres, the QA fill mask leaves valid data over 43.7% of land cells in the current Shenzhen district mask, including 58.9% of present-day Luohu and zero in Futian and Nanshan. These percentages describe coverage on the current map spike, with a modern district and land mask.

USGS returned ten MSS scenes, all path 121, row 044, and zero Landsat 4–5 TM scenes for calendar year 1984 in the rectangle 113.73–114.65°E, 22.42–22.87°N. This search found no path 122/044 companion. The inventory does list four **1983-11-01 KH-9** candidates, `D3C1218-200853A005`, `A006`, `F005` and `F006`. Check their corners and image quality for a dated western fallback. [EarthExplorer](https://earthexplorer.usgs.gov/)

The Chinese National Earth System Science Data Center lists a separate **广州深圳湾Landsat1-5 MSS遥感影像数据集 (1973–1984)**. The full dataset requires application review. Request the scene manifest first and check 1984 dates, original path and row, Shenzhen Bay footprints and release rights. The listed access terms limit use to research. For qualitative comparison, the Hong Kong Environmental Protection Department reproduces a 1982 photograph of the Tsang Tsui part of Deep Bay in Figure AP1. Hong Kong's historical aerial-photo catalogue can be searched for a 1983–84 north-facing or cross-bay survey. [Chinese dataset](https://www.geodata.cn/data/datadetails.html?dataguid=52077218333731&docId=28509) · [1982 Fig. AP1](https://www.epd.gov.hk/eia/files/applications/en/pp_654/dir_1314/profile/dir294.pdf) · [Hong Kong historical aerial catalogue](https://open.hkmapservice.gov.hk/OneStopSystem/map-search?locale=zh_cn)

## 3. 1977 Shenzhen–Hong Kong image / 1977年深港区域影像

The Shenzhen University reproduction is a broad Shenzhen–Hong Kong crop. Its caption gives USGS and 1977. Inspection of the displayed crop found no frame markings. The following are EarthExplorer catalog matches by acquisition year and footprint. The exact exhibit attribution is open.

| Collection and acquisition | Main candidates | Reference points in the catalog footprint |
|---|---|---|
| Declass 2 KH-9 mapping camera, 1977-09-10 | **DZB1213-500164L003001** | All four. The catalog lists 20–30 ft camera resolution and two segments, giving the strongest single-frame candidate for a wide regional view. |
| Declass 3 KH-9, 1977-12-03 | **D3C1213-400953A010**, **D3C1213-400953F010** | Each contains all four reference points. |
| Declass 3 KH-9, 1977-12-03 | D3C1213-400953A011, D3C1213-400953F009 | A011 contains Shekou. F009 contains Luohu and Shangbu. |

The mapping-camera browse image is available for comparison. Request the uncropped image or the source identifier, date and segment list from the exhibition team. For baseline tracing, the December A010 and F010 scans can be evaluated on their own dated provenance. [Shenzhen University exhibit](https://saup.szu.edu.cn/info/1017/2206.htm) · [USGS L003001 browse](https://ims.cr.usgs.gov/browse/declassii/1213-5/00164/DZB1213-500164L003001-00067.jpg)

### December 1977 imagery intake / 1977年12月影像入库

The [acquisition register](https://chatgpt.com/library?file_id=libfile_b0e7fc4f3c60819189baf05bb69fae90&account_id=personal) records the USGS EROS M2M delivery and the original archive checksums. The numbered parts are local, and both reassembled archives passed the size and SHA-256 checks in `pipeline/m1c_kh9_1977.py`.

| Original archive | Expected bytes | Expected SHA-256 | Download parts |
|---|---:|---|---|
| `D3C1213-400953A010.tar.gz` | 2,101,540,928 | `62ddaedfec672ff1f6081f65e16ca9bfc77c25113bfb4c740dfc40f85aa6ace0` | [1](https://chatgpt.com/library?file_id=libfile_8f0bbc06ffa481918a8c5d6383740a05&account_id=personal) · [2](https://chatgpt.com/library?file_id=libfile_0ac8fe2aac588191bbb6dcc3478584e4&account_id=personal) · [3](https://chatgpt.com/library?file_id=libfile_f228d45c4b9481919507e2f4eb9aaecd&account_id=personal) · [4](https://chatgpt.com/library?file_id=libfile_4e959a9239d48191836e763525bd5c97&account_id=personal) · [5](https://chatgpt.com/library?file_id=libfile_71ab4803c704819183ced121d033115a&account_id=personal) |
| `D3C1213-400953F010.tar.gz` | 2,475,824,675 | `db8b15953f4bbe32d5f146abc1d22b526b70c7f4efa54c5fbb73fa2b0c6120c1` | [1](https://chatgpt.com/library?file_id=libfile_553ebdac233c819183cdc624e82e869e&account_id=personal) · [2](https://chatgpt.com/library?file_id=libfile_bb04002fbd188191aad3c575c410675d&account_id=personal) · [3](https://chatgpt.com/library?file_id=libfile_6871ceaf8b608191a2ee0f1aaa48cc55&account_id=personal) · [4](https://chatgpt.com/library?file_id=libfile_8e049f0dc3a48191a7573b7684e9b321&account_id=personal) · [5](https://chatgpt.com/library?file_id=libfile_04648b74b518819193177548355b0f8a&account_id=personal) · [6](https://chatgpt.com/library?file_id=libfile_999f31f6f1708191b22f1aca6901007d&account_id=personal) |

The [checksum manifest](https://chatgpt.com/library?file_id=libfile_06474e4d6f908191ba1f7828fac97548&account_id=personal) and ZIP parts are in `Shenzhen/Download Copies`. Extract the ZIPs and concatenate their payloads in numeric part order for each frame. Check the byte count and SHA-256 before recording the local copy.

| Source record | Intended local archive |
|---|---|
| [A010](../../data/evidence/sources/kh9_1977_12_03_a010.yaml) | `data/raw/sources/kh9_1977_12_03_a010/D3C1213-400953A010.tar.gz` |
| [F010](../../data/evidence/sources/kh9_1977_12_03_f010.yaml) | `data/raw/sources/kh9_1977_12_03_f010/D3C1213-400953F010.tar.gz` |

Segment A010/c passed a relative registration to the September 1980 KH-9 mosaic. No other A010 or F010 segment passed this trial. The original parts stay in `data/raw/download/`; unless the original archive is supplied at the path above, the pipeline reassembles it in temporary storage and retains only reduced scans and registration products under the source directory. See the [R8a follow-up](phase1-landcover.md#raster-first-follow-up) for rebuild instructions and coverage limits. The Shenzhen University exhibit crop still lacks an exact frame attribution.

## 4. Deep Bay tide at the 1979 overpass / 过境时刻潮位

The Landsat metadata gives scene centre time **1979-10-19 02:10:28 UTC**, equivalent to **10:10 Shenzhen and Hong Kong standard time**. Hong Kong civil clocks were still on summer time on October 19, making this **11:10 Hong Kong Summer Time**. Use UTC for the archive request and record the time convention used on the returned chart or readings. [Hong Kong Observatory summer time chronology](https://www.hko.gov.hk/en/gts/time/Summertime.htm)

Use the **Tsim Bei Tsui gauge / 尖鼻咀 (TBT)**, at 22°29′14″N, 114°00′51″E. The Hong Kong Observatory lists first operation on 1 December 1974 and the Drainage Services Department lists archived data from 1974. PSMSL station 1366 provides monthly and annual data. The overpass-time observation is still open. [HKO gauge list](https://www.weather.gov.hk/en/cis/stn.htm) · [Archived gauges, Table 7](https://www.dsd.gov.hk/EN/Files/Technical_Manual/technical_manuals/SDM_2018_5th.pdf) · [PSMSL station 1366](https://psmsl.org/data/obtaining/stations/1366.php)

Archive request text / 可供查询的文字

> Please provide the observed Tsim Bei Tsui (TBT) sea-level record for 19 October 1979, especially readings bracketing 02:10 UTC (10:10 Hong Kong Standard Time, 11:10 Hong Kong Summer Time). A gauge chart or hourly observations for the day would work. Please identify the time basis, vertical datum and any quality flags. If the observations are unavailable, please identify any contemporary astronomical predictions and their datum.

[Hong Kong Observatory data enquiries](https://www.weather.gov.hk/en/cis/reqform.htm) · [HKO tidal prediction notes](https://www.hko.gov.hk/en/tide/enotes.htm)

The offshore and river-mouth waterlines reflect local tidal phase and intertidal elevation. Once acquired, transform the gauge datum and compare the wet and dry mudflat margins in the imagery with period topography or bathymetry. The **78.7 km²** from the spike is the area mapped as water in the 1979 snapshot and land in the modern DEM mask. It is a candidate change area, with a mudflat component still to quantify.

## 5. Evidence for the 1979 site register / 1979年地点存在证据

The 20 claims are in `data/evidence/claims/sites_1979.yaml`. Seventeen now cite a passage and are `sourced` for the stated existence claim. Most are retrospective sources, including the official protected-name register, stable pre-1979 infrastructure histories and village accounts. These starters still need period map or image evidence for their exact placement. The five unplaced locations need a surveyed point, alignment or area before use on the historical map.

| Site / 地点 | Evidence located and next check |
|---|---|
| Shenzhen market town / 深圳墟 | Historical geography §05 places the old town around Dongmen. Trace the built-up extent on pre-1980 imagery. |
| County offices and state units / 县机关和国营单位 | Historical geography §§05–06 gives the relocation to Caiwuwei and 1979 municipal transition. Use the 1957–81 municipal archive release for individual office addresses and names. |
| Luohu crossing / 罗湖桥及口岸 | Protected names no. 63 describes pre-reform pedestrian crossing. Get the period bridge and checkpoint plans. |
| Shenzhen Station / 深圳站 | Luohu district railway chronology places the mainland station at the crossing by 1950 and names it 罗湖站 for the slice. Locate the period platforms and buildings. |
| Kowloon–Canton railway / 广九铁路 | KCRC history dates cross-border passenger service resumption to 1979. Trace the actual alignment and sidings. §7 adds the 1962 Sungang station, its 1977 rename to 深圳北站 and a May 1979 timetable with 25 intermediate stations; the alignment is still open. |
| Guangzhou–Shenzhen road / 广深公路 | Road history reports an existing alignment distinct from 1980 Shennan works. Digitise the connection to the town from period maps or photographs. |
| Wenjindu crossing / 文锦渡口岸 | Shenzhen port office records 1978 approval and fresh-goods traffic. The subsequent Hong Kong vehicle control point is a separate facility. Keep the opening of each facility and the bridge chronology distinct. |
| Caiwuwei / 蔡屋围 | Protected names no. 91 identifies the old and new village compounds. Locate the two historical cores. |
| Yumin / 渔民村 | Protected names no. 92 dates settlement to the 1950s, with a 1981 entry. Find the houses and fishponds at the river confluence. §7 adds a 1984 report of 35 villas and their drains, lanes, gardens and ponds; the 33-versus-35 building count remains a conflict. |
| Huangbeiling / 黄贝岭 | CNR recounts the historical village. The 1979 village label and outline still need a period record. |
| Hubei / 湖贝 | Protected names no. 20 cites the Qing Xin'an gazetteer. Seek the old village core around 湖贝南坊. |
| Xiangxi / 向西 | Retrospective village history describes the 1979 community and early land acquisition. Locate the pre-acquisition village core. |
| Sungang / 笋岗 | 深港家志 gives the 1979 affiliation and identifies 笋岗老围. Trace farm and pond extent separately. |
| Shenzhen Reservoir / 深圳水库 | Municipal archives cite the Dongjiang–Shenzhen water-supply gazetteer and provide historic photographs. The 1979 MSS can support an observed water outline. |
| Shenzhen River border fence / 深圳河边境围栏 | Hong Kong's Frontier Closed Area dates to 1951, with a 1962 boundary. A period plan or image of the fence and patrol track is still needed. It is a separate geography from the SEZ's internal management line. |
| Shangbu farmland and villages / 上步农田和村落 | The Huaqiang industrial history identifies paddy fields and thatched dwellings at the future industrial site. Verify the wider district's land use and villages independently. |
| Nantou old town / 南头古城 | Protected names no. 44 documents the old town. Shenzhen University's exhibit also reproduces a 1969 aerial of it. Check 1979 street and wall survival. §7 adds a measured 680 × 500 m walled extent, nine historical street names and 40-plus surviving Qing and Republican houses; none is a 1979 survey. |
| Shekou fishing villages and harbour / 蛇口渔村及避风塘 | The 6 January 1979 industrial zone submission identifies Shekou commune. District and local histories identify the fishing settlements and point to the old storm shelter, at today's Shekou Square. §7 adds the seven village names and a 2018 feature quoting 《蛇口志》 for the shelter location and its 1953 expansion. The original 《蛇口志》 pages and a period image identifying both the villages and the shelter remain outstanding. |
| Chiwan / 赤湾 | Protected names no. 16 documents the old village. The current proxy lies offshore in the 1979 MSS mask. Move the proxy only after locating the period shore and village. |
| Military and restricted land / 军事及限制用地 | Generic placeholder. Seek a named parcel, contemporary boundary and evidence of the restriction before using it as a constraint. |

[Municipal archive release, 1957–81](https://www.szdag.gov.cn/gzdt/gzdt/content/post_99105.html) · [First protected-name register](https://pnr.sz.gov.cn/attachment/1/1440/1440081/11261520.pdf) · [Shekou approval dossier](https://www.szdag.gov.cn/dawh/tqssn/content/post_931794.html) · [Shekou storm shelter account](https://www.sznews.com/news/content/2018-05/31/content_19233234_0.htm) · [Hong Kong Frontier Closed Area](https://www.info.gov.hk/gia/general/200511/03/P200511030004.htm)

## 6. Luohu, Shangbu and Nantou maps / 罗湖、上步及南头地图

| Area | Period material | Use and limits |
|---|---|---|
| Luohu / 罗湖 | **1985年的深圳市区图**, a published period map reproduction. Hong Kong GRS **HKRS728-6-3**, 1:1,000 sheet **2-NE-19A**, map no. **448(841)**, covers Guangdong and the Shenzhen River. Fully revised April 1984 and compiled February 1985. [1985 map reproduction](https://img.jzda001.com/image/9401611823369398.png) · [Survey sheet catalogue](https://search.grs.gov.hk/en/arcview.xhtml?eid=PZ82wxNVgspT287GSVihLA%3D%3D) | Use the city map for labels and routes. Obtain the survey sheet from GRS for mapped shoreline and details where coverage permits. Its original scan is outstanding. |
| Shangbu / 上步 | Same **1985 city map** and the **1982 SEZ planning outline** discussed by Mary Ann O'Donnell. The 1985 yearbook reports the Shangbu management area and the SEZ master plan's existing conditions. [City map context and 1982 outline](https://www.jzda001.com/index/index/details?id=4508&type=1) · [Yearbook Shangbu chapter](https://www.shenzhenshizhi.cn/book/8732df747f9b9aa1c47cfff5ea30c585/上步管理区经济发展概况_22.pdf) | Use the city map for street hierarchy and names. Treat the 1982 planning proposals as proposals. A survey-scale 1979–84 Shangbu village or land-use sheet is outstanding. |
| Nantou / 南头 | **《香港明细全图》**, a period base map used to mark the Nantou Peninsula and Shekou proposal in January 1979. Original in the China Merchants archive. Also the **April 1980 Shekou Industrial Zone General Layout**, Fig. 3 in O'Donnell. [1979 map and archival context](https://www.szdag.gov.cn/dawh/tqssn/content/post_931794.html) · [1980 layout reproduction](https://www.cefc.com.hk/download.php?file=940a2960a39024ea9784a73b631035d9&id=100079686) · [Opened Nantou commune and management district collections](https://www.szns.gov.cn/szsnsqrmzfbgswzgkml/szsnsqrmzfbgswzgkml/qt/tzgg/content/post_12333737.html) | Use the annotated map for coastline context and the official proposal's scope. The 1980 layout shows intended development. Request township-scale survey and land-use sheets from the Nantou commune and management district fonds. |
| Shenzhen River / 深圳河 | Companion GRS **HKRS728-6-9**, 1:1,000, map no. **448(847)**, covers the river and Seung Ma Lei Yue. Fully revised April 1984, compiled January 1985. [Survey sheet catalogue](https://search.grs.gov.hk/en/arcview.xhtml?eid=6FiSdr8P%2F1x02TSb7Yzxug%3D%3D) | Check exact sheet footprint before associating it with a site. |

Record the survey and publication dates separately. Use stable ground control away from reclaimed shorelines and road realignments. Record the residual error before using a historical geometry in the slice. Map reproductions and archive catalogues are research references pending confirmation of applicable reuse terms.

The [Shenzhenxu photo review and zoning research](phase1-m3-zoning.md) covers the manually added images, the early-reform Dongmen street network, and the later road envelopes for Bagualing and Shuibei. The [file inventory](../../data/evidence/observations/shenzhenxu_manual_references.csv) records the local copies and their caption leads.

## 7. 3D atlas follow-up, 2026-11-25 / 三维图集遗留问题补充

This pass answers four checks left open by the isolated 3D atlas: Shekou's villages and shelter, Nantou's old-town fabric, the northern rail corridor, and Yumin's villa layout and counts. The new claims are in [`phase1_atlas_open_questions.yaml`](../../data/evidence/claims/phase1_atlas_open_questions.yaml). The atlas's two district-photo claims and their catalogue source are now also in the main evidence store.

| Question | Source opened | What it adds | What remains open |
|---|---|---|---|
| Shekou villages and shelter | [深圳百科, 蛇口渔村从哪里来](http://szbaike.com/travel/t-summary/2026-04-02/11103.html) · [南方日报, 蛇口如何留住渔家乡愁？](https://www.sohu.com/a/233514110_161794) | Seven village names (湾下/湾厦, 南水/水湾, 渔一, 渔二, 海湾, 大铲, 后海); a pre-1979 fishing settlement; 蛇口圩 with 10-plus shops in 1947; the shelter between 蛇口山 and the coast south of it; 19,000 m² after the 1953 expansion; 53,000 m² after three later rounds; about 1,600 boats and 10,000 fishermen at the described peak; 1979 per-capita income by village. The shelter site became 蛇口广场 after 2000, so the modern 蛇口渔港 is not a safe proxy. | Village boundaries, the 1979 shoreline and the shelter outline; which villages or ponds appear in the October 1979 MSS; a dated plan for the 53,000 m² total. The 1,600-boat and 20,000-tonne figures are undated scale context. |
| Nantou old town | [人民日报海外版, 千年古城承载深港文化](http://paper.people.com.cn/rmrbhwb/html/2016-06/01/content_1684097.htm) · [深圳百科, 南头古城](http://szbaike.com/humanity/village/2024-12-31/10255.html) | A measured walled extent of about 680 m east-west by 500 m north-south, roughly 70,000 m²; the nine historical street names; eight streets surviving in the present conservation area; more than 40 Qing and Republican houses; wall-brick removal in the early reform period. | The 1979 wall condition, street widths, block subdivisions and building heights. The extent and survive counts are present-day measurements, not a 1979 survey or a georeferenced outline. |
| Northern rail corridor | [深圳百科全书, 广九铁路](http://www.szbaike.com/communication/sz-hk/e-relationship/2022-06-21/2526.html) · [维基百科, 笋岗站](https://zh.wikipedia.org/zh-hans/%E7%AD%8D%E5%B4%97%E7%AB%99) · [1979年5月全国铁路旅客列车时刻表](https://1435mm.info/2021/04/1979-timetable-guangzhou-shenzhen-kowloon/) | The 1911 station sequence inside Shenzhen (平湖, 李朗, 布吉, 深圳圩, 深圳); a February 1962 station between Shenzhen and Buji; its 1 January 1977 rename to 深圳北站 and role as the area's main freight station; a May 1979 timetable with 25 intermediate stations on the slow service, with Pinghu among the four still served in 2021. | The 1979 alignment, sidings, yard boundary and station condition. Existence and station sequence are supported; no line should be traced from this alone. |
| Yumin layout and counts | [人民日报, 1984-02-03](https://cn.govopendata.com/renminribao/1984/02/03/2/) · [人民日报海外版, 邓志标口述](http://paper.people.com.cn/rmrbhwb/html/2015-10/28/content_1626485.htm) · [中国新闻网, 春到渔村](https://www.chinanews.com.cn/m/gn/2018/05-23/8520484.shtml) | A second contemporary report of 35 villas, one per household; a 770,000-yuan collective building outlay; 200,000-plus yuan for drains, concrete lanes and roadside trees; a garden and goldfish pond in each courtyard. The oral history gives shore huts around 1953, flat-roofed houses around 1962, a fall from more than 70 households to about 30, and about 90 residents in the early 1980s. The 2018 feature pairs 35 households with 33 buildings. | The project register, row direction, lane widths, plot depth, pond edges and the aerial camera heading. The 33-versus-35 building count and the 1,500,000-versus-770,000-yuan cost remain open conflicts; neither is a geometry source. |
| Atlas district photos | [深圳老照片 catalogue](http://www.szlzp.com/products.html) | The live catalogue confirms the captions and years: 电子大厦段---深南中路，与华发路连接（1983）, image 1759220777.jpg; 罗湖工地的女钢工（1982）, image 1759218629.jpg, with the companion mud-work view 1759218621.jpg. | Negative dates, photographer credits and per-image reuse terms. The captions locate a road junction and a worksite, not a parcel. |
| 1984 photo gallery | [搜狐, 珍贵老照片！1984年的深圳](https://www.sohu.com/a/611925676_355785) | Eighteen distinct captioned views: unidentified street scenes, Shenzhen Theatre with 博雅 and 新安酒家, a 人民北路 snake restaurant, a 园岭 grain-shop queue, a 深南东路-area road view, Guomao's main structure and a topping scene, a Wutong Mountain view, Shenzhen University under construction, a Buji television CRT line, the 1984 slogan photograph credited to 徐佑珠, Deng Yingchao with television workers, and the Shekou Sanyo workshop. | Negative dates, archive IDs, most street locations and per-image rights. The generic street views cannot be geolocated; the Guomao topping caption names no component; the Buji caption contains a visible typo. The claims are in [`phase1_1984_photo_gallery.yaml`](../../data/evidence/claims/phase1_1984_photo_gallery.yaml). |
| 1984 dated photo set | [搜狐, 1984年的深圳老照片](https://www.sohu.com/a/512706135_120099886) | Twenty-two frames, many with a day and photographer (李长永, 刘玉生, 陈学思, 徐佑珠): city corners, the Shangbu Electronics Building, Shennan Avenue and its high-rises, the International Commercial Building, taxis, four Guomao construction stages plus the annex topping, Luohu high-rises, the Shekou shopping centre, Nanshan Hotel, office building, industrial zone, Industrial Avenue and Bitao Centre, and the Shenzhen Bay Hotel park. | No archive IDs or per-image rights; most street views are unidentified. The 30 May frame may duplicate the other gallery's main-structure view. The annex-topping caption helps explain, but does not resolve, the Guomao component conflict. Claims are in [`phase1_1984_photo_set_lonely.yaml`](../../data/evidence/claims/phase1_1984_photo_set_lonely.yaml). |
| 1985 silhouette gallery | [搜狐, 老照片 1985年深圳剪影](https://www.sohu.com/a/411470703_482071) | Six 1985 views and captions: a city corner; a traditional-character slogan board at the Shekou industrial-zone office; the Shenzhen Bay Hotel park at 60,000-plus m² with 19 large rides; a 600 m Shekou quay berthing 3,000-tonne barges and ships drawing under 5 m; the Minghua ship as a new sea park; and Chiwan port's 20,000-tonne berth plus a 300 m oil terminal. | These are post-slice context, not January 1984 geometry. The captions give no photographer, rights, footprint, completion date or berthed-ship count. Claims are in [`phase1_1985_shenzhen_silhouette.yaml`](../../data/evidence/claims/phase1_1985_shenzhen_silhouette.yaml). |

These records are `sourced` or `lead`, not `verified`. The Shekou and Nantou material still does not place a parcel or a surveyed outline. The rail records support existence and station sequence, not an alignment. The Yumin records sharpen the layout vocabulary but leave two open conflicts: [`phase1.yumin.early_villa_count`](../../data/evidence/conflicts/phase1.yumin.early_villa_count.yaml) and [`phase1.yumin.villa_project_cost`](../../data/evidence/conflicts/phase1.yumin.villa_project_cost.yaml). Do not use any of this to upgrade render geometry beyond `lead`.
