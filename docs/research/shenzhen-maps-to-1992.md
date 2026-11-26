# Shenzhen maps to 1992 / 1992年以前的深圳地图目录

**Status:** web survey of 2026-11-25. This is a finding catalogue; most entries are leads or catalogue records. The [1984 public preview review](map-1984-previews-and-1979-anchors.md) separately records the images inspected and their use in the Phase 1 slice.

**Cut-off:** map editions and map content dated **1992 or earlier**. A 1993 printing of a 1991 edition may be noted, but it is not treated as a new map. The next city atlas identified after the cut-off is the 1997 《深圳市地图集》; it is listed only as a boundary marker.

**Why this pass:** the 1982 《深圳市区图》 proved that a single period sheet can carry labels, street hierarchy and a calibration check. Later phases need the same chain for 1985–1992: district formation, Futian, the airport, the port system, the second line and the build-out beyond Luohu. This register maps what exists before commissioning copies.

**Companion registers:**

- [`phase1-map-sources.md`](phase1-map-sources.md) — the Phase 1 acquisition register (KH-9, Landsat, 1977/1985 maps, GRS sheets).
- [`map-1982-labels-and-calibration.md`](map-1982-labels-and-calibration.md) — the 1982 sheet transcription and affine fit.
- [`shenzhenxu-map-register.md`](shenzhenxu-map-register.md) — pre-1979 town maps.
- Machine-readable index: [`shenzhen_maps_to_1992.csv`](../../data/evidence/observations/shenzhen_maps_to_1992.csv).

---

## 1. How to read the entries

| Field | Meaning |
|---|---|
| **Status** | `scan seen` = an image or reproduction was viewed; `catalogue` = a library or dealer record was viewed, but not the sheet; `lead` = only a secondary mention, holding or content unconfirmed. |
| **Reuse** | `reference_only` unless a licence is explicitly recorded. Published Chinese maps are copyrighted even when a library or dealer displays them. A CC licence on a photograph of a map covers the photograph, not the map. |
| **Map status** | Where the sheet is a map, `survey` (what existed), `plan` (what was proposed) or `schematic`. Commercial city and tourist maps are `schematic` unless a survey basis is confirmed. The CSV carries this as `map_status`; the tables say it in the notes where it matters. This follows the evidence protocol §5.4. |

No record is `verified`. Dates are the **edition or survey dates printed or catalogued**, not the date of a web page. Where a catalogue and a dealer disagree, both are kept and the disagreement is noted.

---

## 2. The strongest acquisitions, in order

1. **《深圳市自然资源与经济开发图集》 (1985)** — 43 thematic plates, including land use, population density, transport, industry, tourism, environment and a satellite image. The single best 1985 snapshot of the whole city.
2. **《深圳市交通运输图册》 (1990)** — 263-page street and transport atlas compiled by the Shenzhen Construction Bureau and the Wuhan Iron & Steel Design Institute Shenzhen branch. The best candidate for 1990 street-level geometry.
3. **《深圳市地名志》 (1987) district plates** — a map with each management-district section (Luohu, Shangbu, Nantou, Shatoujiao), plus the 1986 master-plan diagram. Good for district names and boundaries at the moment before the 1990 districts.
4. **《深圳街道图》 1:10,000 (1986)** — a large-scale commercial street plan; the 1986 counterpart to the 1982 sheet.
5. **1988 1:2,000 aerial survey** — cited in the 1989 land-acquisition rules as the basis for compensation. If a set survives in the municipal archive, it is the best large-scale geometry source before 1992.
6. **1984–1992 city and tourist maps** — a nearly annual series at 1:10,000–1:25,000. Cheap to acquire, good for street names, landmarks and change detection.
7. **1988 1:50,000 geological map** — not a street map, but useful for terrain, faults, quarries and the physical base of later districts.
8. **1988–1992 Landsat TM** — the only city-wide raster that can be compared directly with the 1984 Landsat and the 1980 KH-9.

---

## 3. Survey sheets, official base maps and aerial coverage

| ID | Sheet | Date / edition | Issuer, scale, format | Holding and access | What it adds | Status / reuse |
|---|---|---|---|---|---|---|
| `map.sz.1982.city` | 《深圳市区图》 | 1982, printed sheet | Unknown publisher; photographed folded sheet, no visible scale or imprint; 2000×1500 px copy | Local copy `data/raw/sources/phase1_1982_shenzhen_city_map/map_1982.jpg`; context at [jzda001](https://www.jzda001.com/index/index/details?type=1&id=4508) | 205 named features; streets, villages, planned works. Already transcribed and affine-fitted (≈200 m in-sample RMS). | `scan seen` · `reference_only` |
| `map.sz.1985.city` | 《深圳市区图》 (1985 city map) | 1985 | Published period map reproduction | [Image](https://img.jzda001.com/image/9401611823369398.png) · [context](https://www.jzda001.com/index/index/details?type=1&id=4508) | The 1985 city sheet used in the Phase 1 source note; compare street hierarchy and labels with 1982. | `scan seen` · `reference_only` |
| `map.sz.1986.street_1_10k` | 《深圳街道圖》 / Shenzhen Street Plan | 1986 | 廣東省測繪技術公司; 1:10,000 | University of Macau Library, call no. **ASI CHI 092**, [catalogue page](https://library.um.edu.mo/lib_info/collections/map_en?order=asc&order_by=no&page=21); NLA catalogues a Shenzhen street plan under a similar title ([catalog 1916919](https://catalogue.nla.gov.au/catalog/1916919)), but the edition needs checking | Street plan showing bus routes and stops, buildings, hospitals, railways, roads and boundaries. A direct 1986 comparator for the 1982 sheet. | `catalogue` · `reference_only` |
| `map.sz.1985.admin` | 《1985深圳行政区划图》 | 1985 | Unknown issuer; user-uploaded scan | Forum post and attachment, [xzqh.info](http://xzqh.info/lt/read.php?tid=117283&ds=1) | Management-district boundaries before the 1990 district reform; useful for validating the 1983–89 district polygons. | `lead` · `reference_only` |
| `map.sz.1988.aerial_1_2k` | 1:2,000 航测图 (1988 published) | Survey/publish 1988 | Municipal survey; cited as the basis for land-class compensation in the 123 km² development zone | Cited in 深府[1989]7号, art. 12, [Shenzhen gazette 1989 no. 1](https://www.sz.gov.cn/zfgb/1989/gb1/content/post_10028176.html) | A dated, official large-scale survey of the development zone. If the sheet set survives, it outranks every commercial map for 1988 geometry. Holding not yet located: ask the municipal archive and the planning bureau. | `lead` · `unknown` |
| `map.sz.1988.geology_1_50k` | 《深圳地质图》 / Geological map of Shenzhen | 1988, 1st ed. | 广东省地质矿产局区域地质调查大队; 1:50,000 | NLA [catalog 2993725](https://catalogue.nla.gov.au/catalog/2993725); Chinese/English | Geology, faults and sections. Useful for terrain, quarry and foundation context, not for streets. | `catalogue` · `reference_only` |
| `map.sz.1990.transport_atlas` | 《深圳市交通运输图册》 | 1990-10 | 深圳市建设局、武汉钢铁设计研究院深圳分院 主编; 广东省地图出版社; 263 pp., 38 cm, hardback; ISBN 9787805221168 | [Dushu record](https://www.dushu.com/book/10435224/) | A book-length transport atlas: the best candidate for 1990 street-level geometry, road hierarchy and bus/transport infrastructure. Top acquisition priority. | `catalogue` · `reference_only` |
| `map.sz.1992.guangdong_atlas` | 《广东省地图册》 | 1992-12, 1st ed. | 广东省地图出版社; 32开; ISBN 9787805221663 | [Kongfz listing](https://book.kongfz.com/1161300/10280724455/) | Provincial atlas; whether it contains a usable Shenzhen city plate is **unconfirmed**. The online table of contents circulating for this ISBN includes post-2005 districts, so it cannot be trusted as the 1992 contents. Buy or inspect before cataloguing the plates. | `lead` · `reference_only` |

**Hong Kong-side sheets.** The GRS 1:1,000 sheets already recorded in [`phase1-map-sources.md`](phase1-map-sources.md) §6 (`HKRS728-6-3`, sheet 2-NE-19A, map 448(841), revised April 1984, compiled February 1985; and `HKRS728-6-9`, map 448(847)) remain the best surveyed shoreline and cross-border detail. The Hong Kong Lands Department also publishes **Old Survey Sheets 1980–1990 (1:1,000)** as GeoTIFF: about 12,000 sheets, Hong Kong 1980 grid, [CSDI dataset](https://portal.csdi.gov.hk/csdi-webpage/dataset/landsd_rcd_1640047456225_68329). These are clipped to Hong Kong, but border sheets can show the Shenzhen River, Lo Wu and the frontier track. They are not a Shenzhen street source.

---

## 4. Plans, atlases and official documents

| ID | Document / plate | Date | Issuer | Holding and access | What it adds | Status / reuse |
|---|---|---|---|---|---|---|
| `map.sz.1979.hk_detail_map` | 《香港明细全图》 with Li Xiannian's pencil line | 1979-01-31 annotation | Hong Kong published base map | Original in the China Merchants Group archive; reproduced by [Shenzhen Archives](https://www.sz.gov.cn/szstory/202301/content/post_10379289.html) | The 2.14 km² Shekou site and the Nantou Peninsula context. Already in `phase1-map-sources.md` §6. | `scan seen` · `reference_only` |
| `map.sz.1980.shekou_layout` | 蛇口工业区总平面图 / General Layout of Shekou Industrial Zone | 1980-04 | Shekou Industrial Zone; reproduced as Fig. 3 in O'Donnell | Reproduction in [O'Donnell](https://www.cefc.com.hk/download.php?file=940a2960a39024ea9784a73b631035d9&id=100079686); original holding not stated | Intended layout, roads, quays and land reclamation in 1980. Already in `phase1-map-sources.md` §6. | `scan seen` · `reference_only` |
| `map.sz.1980.masterplan` | 《深圳市城市建设总体规划》 | 1980-05 | Shenzhen municipal government | No public sheet located; the first master-plan diagram is reproduced in [Southern+ / Dute](https://www.dutenews.com/p/150978.html); the 1986 museum record summarises the 1980 plan | The first city plan after the SEZ was created. A plan, not a survey. Request the drawing set from the municipal archive. | `lead` · `unknown` |
| `map.sz.1983.luohu_shangbu_detail` | 罗湖上步（20平方千米）详细规划 | 1983 | Shenzhen planning bureau | No public sheet located; listed in 《深圳城市规划简史》 (2022) | The detailed plan for the first 20 km² of urban build-out. The bridge between the 1982 outline and the 1986 master plan. | `lead` · `unknown` |
| `map.sz.1985.masterplan` | 《深圳经济特区总体规划图》 | 1985 | Shenzhen planning authorities; reproduced in 《深圳城市规划》 | Held by **Shenzhen Library**; discussed in [Sina, 2020-09-08](https://finance.sina.com.cn/roll/2020-09-08/doc-iivhuipp3075467.shtml) and [Shenzhen News](https://www.sznews.com/news/content/mb/2020-09/06/content_23528394.htm) | The 1985 master-plan graphic, including the “前海湾远景开发区” reservation. A published plan, not a survey. | `lead` · `reference_only` |
| `map.sz.1985.atlas.natural_resources` | 《深圳市自然资源与经济开发图集》 / Atlas of Natural Resources and Economic Development in Shenzhen | 1985-12 | 广州地理研究所 主编; 科学出版社; 220 pp., 43 plates; 书号 13031·3093 | Leiden University Libraries, [catalogue record](https://catalogue.leidenuniv.nl/discovery/fulldisplay/alma990026293910302711/31UKB_LEU:UBL_V1); plate list at [mtoou](https://mtoou.info/jueban/1041017.html) and [LexLib](https://lexlib.fi/book/39Jm4x6akw/%E6%B7%B1%E5%9C%B3%E5%B8%82%E8%87%AA%E7%84%B6%E8%B5%84%E6%BA%90%E4%B8%8E%E7%BB%8F%E6%B5%8E%E5%BC%80%E5%8F%91%E5%9B%BE%E9%9B%86.html) | 43 plates: administrative divisions, the second line and ports, the master-plan diagram, city growth, Bao'an county town history, Xixiang, terrain, geology, structure, seismicity, hydrogeology, Quaternary deposits, landforms, slope, climate, rivers, runoff, water works, soils, land types, land resources, **land use**, vegetation, wildlife, physical regionalisation, **population density**, **transport**, **economy**, foreign investment, **industry**, crops, fisheries/livestock/orchards, Guangming farm, **tourism**, **environmental quality**, and a **satellite image**. The best single 1985 thematic snapshot. | `catalogue` · `reference_only` |
| `map.sz.1986.masterplan` | 《深圳经济特区总体规划（1986—2000）》 | 1984–86; printed 1986 | 深圳市规划局 + 中国城市规划设计研究院 | Shenzhen Museum object, 29.7×21 cm, donated by 郭秉豪 in 1994, [record](https://www.shenzhenmuseum.com/worksDetail?id=1789588714905948160); exhibition photograph on [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:1986%E6%B7%B1%E5%9C%B3%E7%BB%8F%E6%B5%8E%E7%89%B9%E5%8C%BA%E6%80%BB%E4%BD%93%E8%A7%84%E5%88%92_3457.jpg) (CC BY-SA 4.0 for the photograph) | The approved “带状、多中心、组团式” plan: five groups, 123 km² of urban land, 1.1 million people by 2000, Futian reserved as the future centre. The museum record dates the compilation to 1984-11–1986-05; the exhibition label says 1984-10–1986-02. Keep the discrepancy. | `scan seen` · `reference_only` |
| `map.sz.1987.gazetteer_plates` | 《深圳市地名志》 district plates | 1987-01 | 蔡培茂 主编; 科学普及出版社广州分社 | Print; contents include 南头、上步、罗湖、沙头角 management-district sections with maps, per [Baidu Baike](https://baike.baidu.com/item/%E6%B7%B1%E5%9C%B3%E5%B8%82%E5%9C%B0%E5%90%8D%E5%BF%97/49766470); reproductions in [LOFT article](http://trueart.com/news/199190.html) | The 1986 master-plan diagram and a 1987 Shangbu district map are reproduced online; the Luohu, Nantou and Shatoujiao plates are likely in the same volume. Best district-level name source before 1990. The images were not inspected in this pass. | `lead` · `reference_only` |
| `map.sz.1988.territorial_plan` | 《深圳市国土规划》 | 1988 | Shenzhen municipal government | No public scan located; described as the city's first whole-territory plan in [深港规划 comparison](https://www.gc5.com/ylgc/ghsj/10004146.html) | The first plan to treat the whole municipality, not only the SEZ. A plan, not a survey. | `lead` · `unknown` |
| `map.sz.1988.futian_district_plan` | 福田分区规划 / 福田新市区规划 | 1988 | Shenzhen planning bureau | No public scan located. Described in 陈一新, 《深圳城市规划简史》 (2022), and in her [oral history](http://cppcc.china.com.cn/2018-11/01/content_68829933_0.htm); the 1988 “现状图” is mentioned there | The 1988 planning round that kept the central site empty for the future CBD. A plan, not a survey. Ask the municipal archive for the drawing set. | `lead` · `unknown` |
| `map.sz.1989.development_strategy` | 《深圳市城市发展策略》 | 1989 (some accounts say 1990) | Shenzhen municipal government | No public scan located; listed in 《深圳城市规划简史》 and [Wang Fuhai's oral history](https://www.szzx.gov.cn/szzx/zxzt/szkss/content/post_1239010.html) | A whole-city (not SEZ-only) development strategy, following the 1988 国土规划; the intellectual bridge from the 1986 master plan to the 1996 plan. Date conflict: 1989 in the book, 1990 in some official summaries. | `lead` · `unknown` |
| `map.sz.1990.standards` | 《深圳市城市规划标准与准则》 (trial) | 1989 adopted; 1990 trial | Shenzhen planning bureau | No map plate; described in [Huxiu](https://www.huxiu.com/article/378184.html) and 《深圳城市规划简史》 | Not a map, but it fixes the land-use, road and facility categories that later maps and plans use. Needed to read 1990–92 plans correctly. | `lead` · `unknown` |
| `map.sz.1991.rapid_road_plan` | 特区快速交通路网总规 | 1991 | Shenzhen planning bureau | No public scan located; listed in 《深圳城市规划简史》 | The rapid-road framework for the 1990s. A plan. | `lead` · `unknown` |
| `map.sz.1992.futian_cbd_plan` | 福田中心区详细规划 | 1992 | Shenzhen planning bureau / 中心区开发建设办公室 | No public scan located; described in 陈一新's [oral history](http://cppcc.china.com.cn/2018-11/01/content_68829933_0.htm) and 《深圳城市规划简史》 | The 1992 plan that fixed the CBD function for the 607 ha centre. A plan, not a survey. | `lead` · `unknown` |
| `map.sz.1992.baoang_longgang_plans` | 《宝安区城市总体规划》《龙岗区城市总体规划》 | 1992 | Bao'an and Longgang preparatory authorities | No public scan located; mentioned in [深港规划 comparison](https://www.gc5.com/ylgc/ghsj/10004146.html) | The first whole-district plans prepared for the 1993 split. Useful for the 1992 boundary and town system. | `lead` · `unknown` |

**Planning drawings held by design institutes.** A 2018 Southern+ feature reproduces ten surviving drawings from the Wuhan Iron & Steel Design Institute Shenzhen branch (中冶南方): the first SEZ master-plan diagram, Shangbu road network drawings, the Bagualing industrial-area layout, the second-line patrol road, the Shennan Road reconstruction, and later Futian CBD and Futian bonded-area plans. These are original design drawings, not published maps, and the holding is a company archive. [Southern+ / Dute](https://www.dutenews.com/p/150978.html). Treat as a **lead** for acquisition; do not trace from the web reproductions.

Two further plan documents are named in 《深圳城市规划简史》 but not separately catalogued here: the 1985 《深圳特区道路交通规划》 and the 1987 first Shenzhen urban-design study. Both are `lead`s until a drawing or report is located.

---

## 5. Commercial city, traffic and tourist maps, 1982–1992

The Guangdong Map Publishing House (广东省地图出版社, founded 1980) and Hong Kong's Tong Yong Books (通用图书) produced a near-annual city map. Edition history comes mainly from dealer listings and library records. Only the public previews of the May 1984 edition have been inspected in the follow-up. These maps are a practical source for street names, bus routes and landmarks, since they were revised frequently and sold in large print runs.

| ID | Title | Edition / printing | Publisher, scale, notes | Where recorded | Status / reuse |
|---|---|---|---|---|---|
| `map.sz.1982.tongyong_tourist` | 深圳 : 通用版最新旅游图 / Map of Shenzhen | 1982 | 通用图书有限公司 (Hong Kong), with 广东省地图出版社; 38×74 cm; ancillary maps of the city proper, Shenzhen Reservoir Park, Xili Reservoir holiday camp, Nantou and Shekou | NLA [catalog 7131815](https://catalogue.nla.gov.au/catalog/7131815) (catalogue snippet gives 1982); UM holds a 1985 edition, see next row | `catalogue` · `reference_only` |
| `map.sz.1985.tongyong_tourist` | 深圳通用版最新旅遊圖 / Map of Shenzhen | 1985 | 广东省地图出版社; tourist map | UM Library, call no. **ASI CHI 099**, [catalogue page](https://library.um.edu.mo/lib_info/collections/map_en?order=asc&order_by=no&page=21) | `catalogue` · `reference_only` |
| `map.sz.1984.traffic_tourist` | 《深圳最新交通游览图》 | 1984-05 1st ed.; 1984-06 1st printing | 广东省地图出版社; double-sided; front: city and regional context; back: **深圳市区图** and bus-stop list | [Public previews](http://www.txlzp.com/ditu/12126.html); [preview review and claims](map-1984-previews-and-1979-anchors.md) | `scan seen` (previews only) · `reference_only` |
| `map.sz.1985.traffic_tourist` | 《深圳市交通游览图》 | 1985-01 2nd ed. | 广东地图出版社; 100,000 copies | [bs168 listing](http://bs168.com/jiushu/jiushu-8.html); another dealer pairs the 1985 and 1987 sheets | `catalogue` · `reference_only` |
| `map.sz.1986.traffic_tourist` | 《深圳市交通游览图》 | 1986-03 1st ed. | 广东地图出版社; 书号 12250.24; 100,000 copies | [bs168 listing](http://bs168.com/jiushu/jiushu-8.html) | `catalogue` · `reference_only` |
| `map.sz.1987.traffic_tourist` | 《深圳交通游览图》 | 1987-05 1st ed. | 广东省地图出版社; 100,000 copies; ISBN 7-80522-7/K10; 统一书号 12550.74 | [bs168 listing](http://bs168.com/jiushu/jiushu-8.html) | `catalogue` · `reference_only` |
| `map.sz.1989.birdseye` | 《深圳鸟瞰图》 / Shenzhen bird's-eye map | 1989-01 1st ed.; 1989-03 2nd printing (a 1990-03 3rd printing is also listed) | 西安凡尔勘测技术开发部 编制; 陕西人民美术出版社; double-sided; one side **深圳交通图**, the other a large bird's-eye view. 600 dpi scan, 12,700×9,000 px | [Historical Map site](http://www.txlzp.com/ditu/11758.html); [bs168](http://bs168.com/jiushu/jiushu-8.html) lists the 1989/1990 printings as 书号 8199.1855 | `catalogue` · `reference_only` |
| `map.sz.1990.traffic_tourist` | 《深圳交通游览图》 | 1990-04 1st ed.; 1991-05 2nd ed. | 广东地图出版社; 300,000 / 100,000 copies | [bs168 listing](http://bs168.com/jiushu/jiushu-8.html) | `catalogue` · `reference_only` |
| `map.sz.1991.traffic_tourist` | 《深圳交通游览图》 | 1991-08 1st ed.; 1992-04 2nd printing | 广东省地图出版社; 100,000–200,000 copies; 统一书号 12550.159 / K.141 | [bs168 listing](http://bs168.com/jiushu/jiushu-8.html); a dealer labels the 1992 printing “1992年版” | `catalogue` · `reference_only` |
| `map.sz.1992.social_scan` | A social-media video captioned “这是1992年深圳市地图” | 1992 (caption only) | Unknown publisher; scan shown in a short video | [Toutiao video](https://m.toutiao.com/video/7657118217713811506/) | `lead` · `unknown` — not a usable source until the sheet, imprint and date are identified |

**Edition cautions.**

- The 1984, 1985 and 1986 entries are probably successive editions of one series, not three independent maps. The 1984 sheet calls itself “最新”; the 1985 entry is a “2nd edition”; the 1986 entry has a new 书号. Confirm the title and imprint on the sheet before treating them as a sequence.
- The 1989 bird's-eye and the 1989 “深圳交通图” in dealer lists are likely the same publication. The sheet is double-sided.
- The 1991 edition was reprinted in 1992 and again in 1993. Only the 1991 edition and the 1992 printing are inside the cut-off; the 1993 printing is not a new map.
- The 1982 Tong Yong date and the 1985 UM date may be two editions of one Hong Kong/Guangdong map. Do not average or collapse them; record both.

---

## 6. Imagery and remote sensing, 1977–1992

This is not a map section, but later phases will need a raster base that matches the map dates. The Phase 1 acquisitions are already recorded in [`phase1-map-sources.md`](phase1-map-sources.md); the post-1984 gaps are listed here.

| ID | Acquisition | Sensor / product | Coverage and use | Access | Status / reuse |
|---|---|---|---|---|---|
| `img.sz.1977.kh9` | 1977-09-10 / 1977-12-03 | KH-9 mapping camera / Declass 2 and 3 | Regional baseline; see `phase1-map-sources.md` §3 | EarthExplorer; local copies for A010/F010 | `scan seen` · US government, public domain (check product terms) |
| `img.sz.1980.kh9` | 1980-09-11 | KH-9, mission 1216-3, ops 662 | The Phase 1 baseline mosaic; A048/F047/F048 archived and checked | [EarthExplorer](https://earthexplorer.usgs.gov/) · [USGS Declass 3](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-3) | `scan seen` · public domain |
| `img.sz.1984.landsat` | 1984-11-22 | Landsat 5 MSS, path 121 row 044 | 60 m; partial coverage only (Luohu fill, Futian/Nanshan outside raster). See `phase1-map-sources.md` §2 | USGS; local bundle `LM51210441984327FFF03` | `scan seen` · public domain |
| `img.sz.1988.landsat` | 1988, 1989, 1992–96 | Landsat 5 TM, 30 m | City-wide true-colour and false-colour change series used by NASA SVS. A 1988 scene is the natural pair for the 1988 aerial survey and the 1988 district plan. | [NASA SVS 1057](https://svs.gsfc.nasa.gov/1057) (true colour 1988–96) · [NASA SVS 1061](https://svs.gsfc.nasa.gov/1061) (false colour) | `scan seen` (visualisation) · NASA/Landsat public domain |
| `img.sz.1990.commercial` | 1985–1995, vendor-selected | Landsat / SPOT, 20–60 m | A commercial “1990 Shenzhen satellite image” product; convenient but not a dated scene. Use only after the underlying scene ID and date are supplied. | [o-map vendor page](https://o-map.cn/places/city/gdsz-1990y-v3877.html) | `lead` · `licensed` |
| `img.sz.1984.helicopter` | 1984–85 | Oblique helicopter photography along Shennan Road | 何煌友's aerial series, held/displayed by Shenzhen Art Museum; useful for building heights and the Shennan corridor, not for geometry | [Exhibition note](https://art.icity.ly/events/m61lfje) | `lead` · `reference_only` |

**Scene selection note.** A Landsat WRS-2 path/row search for the Shenzhen area returns path 121 row 044 and path 122 row 044. The 1984 MSS bundle is path 121 row 044. For 1988–92, request the actual scene IDs and cloud cover rather than buying a vendor mosaic. The 1988 TM scene is the priority; 1992 is the second priority.

---

## 7. What is still missing

1. **A 1988–92 street-level official sheet.** The 1988 1:2,000 aerial survey is the best lead, but no holding is confirmed. The 1990 transport atlas may fill the gap commercially. Ask the municipal archive, the planning bureau and the surveying unit for a sheet index and a sample.
2. **A complete 1985 atlas.** Only the plate list and catalogue record were seen. Acquire the volume (or a scan) before using any plate; the land-use and satellite plates are the priority.
3. **The 1987 gazetteer's district plates.** Two plates are reproduced online; the Luohu, Nantou and Shatoujiao plates need the physical volume or a library scan.
4. **The 1988 Futian plan and the 1992 CBD plan.** No public scan. These are the key planning documents for the westward shift after 1988. Request the drawing sets from the municipal archive / planning bureau.
5. **A verified 1992 city map.** The social-media scan is not enough. The 1991 traffic-tourist map (1992 printing) and the 1992 provincial atlas are the best leads.
6. **The 1985 master-plan sheet.** Held by Shenzhen Library; only a small reproduction has circulated. Request a high-resolution copy and the plate's imprint.
7. **Rights.** Almost every map here is `reference_only`. The Wikimedia photograph of the 1986 plan is CC BY-SA, but that does not clear the underlying map. No map scan should become a game texture without a recorded licence.

---

## 8. Suggested acquisition order

| Priority | Item | Why | First action |
|---|---|---|---|
| 1 | 1985 atlas | 43 thematic plates, one volume, one date | Buy a copy or request a scan from Leiden / a Chinese library; check the plate list against the Phase 1 land-cover classes |
| 2 | 1990 transport atlas | 263 pages of street/transport detail at the end of the cut-off | Buy a copy; record the edition and ISBN; check whether it is a 1:2,000 or 1:5,000 series |
| 3 | 1986 1:10,000 street plan | Direct 1986 comparator to the 1982 sheet | Request a scan from UM or NLA; georeference against the 1980 KH-9 |
| 4 | 1984–87 traffic-tourist maps | Cheap, annual, street names and landmarks | Buy the sheets; scan at 600 dpi; record imprints and printings |
| 5 | 1987 gazetteer | District names and boundaries before 1990 | Buy the volume; scan the district plates |
| 6 | 1988 1:2,000 aerial survey | Best possible 1988 geometry | Ask the municipal archive / planning bureau for the sheet index |
| 7 | 1988–92 Landsat TM | City-wide raster pair for change detection | Order scene IDs from USGS; 1988 first, 1992 second |

---

## 9. Search log and limits

**Catalogues and libraries consulted:** University of Macau Library map list; National Library of Australia catalogue records (some pages are behind a bot check, so the snippets were used and the records are marked `catalogue`, not `scan seen`); Leiden University Libraries; WorldCat; Wikimedia Commons; Shenzhen Museum; Shenzhen Library (via press reports); Shenzhen government gazette; Dushu; Kongfz; bs168; Historical Map site (txlzp); NASA SVS; USGS EarthExplorer.

**What was not done:** no Chinese national library OPAC session; no Hong Kong GRS sheet order; no municipal archive request; no dealer purchase; no georeferencing; no OCR of a new sheet. Those are the next steps, not claims.

**Rule applied:** a library record or a dealer listing is enough to catalogue a map's existence and imprint, but not enough to date its content, trace its geometry or call it a survey. Those require the sheet.
