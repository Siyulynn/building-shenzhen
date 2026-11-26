# Shenzhen core basin KH-9 shortlist / 深圳核心盆地 KH-9 影像候选

The April, July and September 1979 passes are regional catalog leads for the opening snapshot, and the 1982 passes are regional leads for an intermediate view. Their coverage and scan quality still need screening. **Coverage correction:** the project’s follow-up footprint check found the November 1983 frames end at or west of 113.784°E; the core search area starts at 113.99°E. A reported October–December 1983 Declass 3 search over the core returned no hits. This is a catalog gap for that search, not proof no late-1983 image exists in other collections.

## Passes to screen / 候选过境批次

Frame suffixes in each row use the prefix shown. The 1979–83 rows come from the project's [EarthExplorer area inventory](phase1-usgs-inventory.csv). It covers a broader area than the core basin. The December 1977 row uses the catalog-corner check in the [Phase 1 map sources](phase1-map-sources.md#3-1977-shenzhenhong-kong-image--1977年深港区域影像).

| Acquisition | Prefix and frame suffixes | Value for the snapshot |
|---|---|---|
| 1977-12-03 | `D3C1213-400953` **A010**, **F010**, F009 | A010 and F010 contain the Luohu, Shangbu, Nantou and Shekou reference points. F009 contains Luohu and Shangbu. Pair a clear scan with the 1977 1:5,000 Shenzhenxu street map to corroborate older town fabric. |
| 1979-04-27 | `D3C1215-200344` A043–A046, F042–F046 | Earliest 1979 pass in the inventory. Best date to screen for the opening state's town edge, fields and road grid. |
| 1979-07-09 | `D3C1215-300935` A005–A008, F004–F007 | Second opening-year look. Screen as a fallback or to bracket features that change during 1979. |
| 1979-09-16 | `D3C1215-401476` A004–A008, F004–F007 | Closest listed KH-9 pass to the 1979-10-19 Landsat baseline. The NRO history places mission 1215's deorbit on September 22, while the USGS summary mission table says September 2. Preserve the inventory date as a lead and retain the individual frame's metadata with the scan. |
| 1980-06-21 | `D3C1216-100022` A021–A025, F020–F025 | Alternative view to check gaps or ambiguous features in the registered September 1980 mosaic. |
| 1982-08-30 | `D3C1217-301125` A021–A024, F020–F024 | Intermediate construction evidence, near the August 1982 Landsat midpoint in time. |
| 1982-10-10 | `D3C1217-401609` A003–A004, F003–F004 | Alternate autumn midpoint if it gives clearer basin coverage. |
| 1982-10-29 | `D3C1217-401845` A001–A004, F001–F003 | Latest listed 1982 pass. Screen first for earthworks, road widening and worksite blocks. |
| 1983-11-01 | `D3C1218-200853` A005–A006, F005–F006 | Excluded for the core: published footprints fall west of it. Do not order these for January 1984 placement. |

[USGS Declass 3 collection and mission table](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-3) · [NRO mission history](https://www.nro.gov/Portals/65/documents/history/csnr/gambhex/HEXAGON/The%20HEXAGON%20Story.pdf)

## Gaps to check / 待查时段

- **1978:** search 1978 directly. The working inventory starts in 1979, so its silence says nothing about 1978 coverage.
- **1981 and 1984:** the working inventory has no Declass 3 entries in these years. Independently query the basin for early 1984 under mission 1218 and summer to autumn 1984 under mission 1219. A confirmed 1984 frame can constrain changes after the snapshot. A positive feature observation in 1984 dates its presence to that acquisition. Use a separate source to place it by January.
- **1985:** the KH-9 mission chronology has no operational flight that year. Mission 1219 ended in 1984 and the 1986 launch failed. For later comparisons, use dated aerial photography or survey sheets. Jiang Shigao's 1984 Luohu overview and railway-station photograph are useful visual references with year-level dates. [NRO mission chronology](https://www.nro.gov/Portals/65/documents/history/csnr/articles/docs/gh%20journal_web.pdf) · [1984 photographs](https://static.nfnews.com/content/202009/02/c3983429.html)

## How to resolve coverage / 核查覆盖

The published KRIST metadata archive contains a Declass 3 footprint layer in `global_keyhole.zip`. Use `global_keyhole_full.gpkg` for the spatial shortlist and the free layer to identify already downloadable candidates. The archive's listing was reachable during this search. The GeoPackage contents and the individual EarthExplorer records were inaccessible, so the untested passes above have regional catalog status. NARA RG 537's mission spreadsheets and ONC indexes are another path to locating film if a scan is missing. [KRIST footprint archive](https://doi.org/10.6084/m9.figshare.30017944) · [National Archives finding aid](https://www.archives.gov/research/cartographic/aerial-photography/satellite-photography)

1. Intersect actual polygons with the core basin trace. Check the coverage separately at Dongmen/Shenzhenxu, Caiwuwei, Luohu/Guomao, Yumin, Shangbu and Sungang. Save acquisition date, camera, four corners, and both download flags for the shortlisted frames. The USGS fields distinguish the A/F surveillance cameras and scan availability. [USGS Declass 3 data dictionary](https://www.usgs.gov/centers/eros/science/declassified-satellite-imagery-3-data-dictionary)
2. Inspect the preview over the basin before ordering large scans. Prefer the clearest core segment for each date. Keep an overlapping A/F view where it covers an obscured area or provides a geometric check.
3. Register each selected scan locally against stable features and validate it with held-out points near the intended 3D blocks. The existing 1980 A048 c registration has 28.5 m spatial-block holdout RMSE relative to Landsat. Use that mosaic for basin structure and broad site extent. For street and building placement, use local control from dated maps and photographs and record the local fit. [M1c registration notes](../spikes/m1c-imagery.md) · [Shenzhenxu map register](shenzhenxu-map-register.md)

## Five GIS layers / 五类制图图层

The first-pass package uses the existing 4.9 × 3.3 km M3 review window around Shenzhenxu, Luohu and Yumin. This crop stops east of the Shangbu reference point and leaves the wider basin to a later tracing pass. Its vector dates describe the source scene, 1980-09-11. The traces are starting geometries for review before creating distinct 1979 and January 1984 snapshots. The relief is a modern surface proxy.

| Layer | Starting geometry | Best additional sources |
|---|---|---|
| **Transport / 交通** | Railway and town-road centrelines, plus the bridge anchor. | Use the 1977 1:5,000 sheet as a guide to names and layout; its trial warp did not pass the placement gate. Use September 1980 KH-9 for visible alignments. Use dated work records and photographs for extensions; the 1985 city map can identify later roads but cannot date them to January 1984. |
| **Water / 水系** | River and tributary centrelines, plus a draft pond area. | The 1979 Landsat water mask can corroborate broad water extent. Compare KH-9 dates for banks and fishpond edges. Hong Kong survey sheet HKRS728-6-3 was revised in April 1984 and covers part of the Shenzhen River. Hong Kong Lands Department flight records are an independent aerial search route for the border, with mainland-side coverage to check frame by frame. |
| **Agriculture / 农业** | Four interpreted field envelopes. | Use the registered 1980 chip for field blocks, ditches and banks. If any screened 1979 or 1982 frame covers the area, compare it for conversion into construction land. Keep crop type and parcel lines unknown where the evidence shows only a field envelope. |
| **Settlements / 聚落** | One interpreted market-town envelope. | Use the 1977 sheet for locality names and the dated KH-9 scans for built-up envelopes. Use dated street and oblique photographs for massing and construction stages. Jiang Shigao’s 1984 Luohu photographs can help identify features, with month and camera position to check. |
| **Relief & slopes / 地形与坡度** | Elevation and slope bands from the existing Copernicus GLO-30 inputs, sampled at 30 m in UTM 50N. | Use hill and ridge structure as a shared base. Cross-check valley bottoms, cut slopes and embankments with period contours or overlapping KH-9 views. The modern digital surface model includes built surfaces and post-period ground changes. |

[1977 map register](shenzhenxu-map-register.md) · [1985 city map and Luohu–Shangbu context](https://www.jzda001.com/index/index/details?id=4508&type=1) · [1984 survey sheet](https://search.grs.gov.hk/en/arcview.xhtml?eid=PZ82wxNVgspT287GSVihLA%3D%3D) · [Hong Kong aerial catalogue](https://www.landsd.gov.hk/en/survey-mapping/mapping/aerial-photo-photogrammetric-products/aerial-photo.html) · [Copernicus DEM](https://doi.org/10.5270/esa-c5d3d65)

Store pond geometry under Water and attach a fishpond use attribute when the evidence supports it. Keep roads and rail as centrelines until widths are sourced. Model a bridge as a transport crossing above the water layer. Preserve dates and uncertainty on individual features so a November 1983 or later observation cannot silently appear in the 1979 layout.
