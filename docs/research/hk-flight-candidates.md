# Hong Kong aerial-photo candidates over the Shenzhen core, 1975–1985 / 香港航拍候选

**Status:** lead screening only (2026-11-25). No scan has been ordered, received or georeferenced, and nothing here is a claim.

## Why this file

`historical-imagery-coverage.md` lists the January 1984 core view as the main gap and names "1976 and 1978" as search targets. The Hong Kong flight index answers both questions with catalogue records: which frames exist, when they flew, at what scale, and whether they are open or restricted. This file records those candidates so that an order, when it is placed, names exact photo numbers instead of a search area.

## How the candidates were found

- **Service.** `https://api.hkmapservice.gov.hk/oss/services/OneStop/FlightPaths/MapServer` is the public ArcGIS REST service behind the OneStop System's map-search page. Layer 2 (`APIX_POLY`) holds one footprint polygon per aerial photograph, with `PHOTONO`, `DATEFLIGHT`, `FLYING_HT`, `PHOTOSCALE`, `RESTRICTED` and the flight id (`FLID`). Queried 2026-11-25 with the key the public page itself publishes. The CSDI open copy of the flight index (`landsd_rcd_1638157809075_22117`) holds only 2016–2024 flight points, so the historical frames can only be read from the OneStop service.
- **Test.** For every flight in 1975–1985 the query returned footprints intersecting a box around the frontier. Each footprint was then tested for two HK80 points, projected from WGS84 through the same service's geometry server:
  - **Lo Wu station**: 829,738 E / 843,178 N (22.5283° N, 114.1134° E);
  - **Shenzhen town, Luohu north**: 830,212 E / 845,027 N (22.5450° N, 114.1180° E).
- **Result.** 149 frames in 23 flights contain one of the two points. The table below lists them by flight.
- **Previews.** A 240 × 220 px preview of each shortlisted frame is in `data/raw/download/hkmapservice-previews/`, with a manifest giving the hash, the footprint and the restricted flag. Previews confirm that a frame exists and roughly what it shows; they cannot support tracing.

## Findings

1. **No 1984 flight covers the mainland.** No frame flown in 1984 contains either point. The 7 August 1984 sortie, which includes the "Lo Wu 55873" frame cited in the Shatin to Central Link EIA, ends at about N 842,500 — some 0.7 km south of the Lo Wu point. So 55873 is a Hong Kong-side view at 4,000 ft, 1:8,000, and it should not be expected to show Shenzhen.
2. **The closest coverage before the January 1984 scene is 22 December 1983**, at 1:20,000 (three frames). Then 1 December 1983 at 1:40,000 (14 frames) and 30 November 1983 at 1:20,000 (three frames). All three sorties are marked restricted.
3. **The 1978 target now has names.** 6 January 1978 at 1:25,000 (five frames, one of which contains both points) and 15 December 1978 at 1:25,000 (seven frames). Both restricted.
4. **The 1976 target has an open, high-resolution candidate.** 24 November 1976 at 3,000 ft, 1:6,000: frames 16683–16687 are open and each contains Lo Wu, reaching about 400 m north of the station point; 16688R–16692R extend a little further north and are restricted. The 16687 preview shows the river, fish ponds, the rail alignment and village clusters, so the index footprint is reliable for this sortie.
5. **The only open frames at better than 1:10,000 near the core are 1976-11-24 (1:6,000) and 1982-12-29 (1:8,000, frames 46764 and 46765).** Both stop within a few hundred metres of the station point. Every frame that shows more of Shenzhen is restricted.
6. **1975 and 1976 wide shots exist but are restricted** (e.g. 23 November 1975 at 1:63,100, 24 November 1975 at 1:25,000).

## The method checks out

The Shatin to Central Link EIA cites four Lands Department frames by number. All four resolve in the index, and the years match the EIA's brackets exactly:

| EIA frame | Index date | Height | Scale | Restricted | North edge |
|---|---|---|---:|---|---:|
| 16704 | 1976-11-24 | 2,500 ft | 1:5,000 | no | 842,769 |
| 23411 | 1978-11-23 | 4,000 ft | 1:8,000 | no | 842,685 |
| 27048 | 1979-09-15 | 4,000 ft | 1:8,000 | no | 842,693 |
| 55873 | 1984-08-07 | 4,000 ft | 1:8,000 | no | 842,502 |

Lo Wu station is at N 843,178. All four frames stop 400–700 m south of it, which is why they are open: they photograph the Hong Kong side of the fence. The same pattern holds along the low-level frontier series (16683–16692, 46764/46765, 52938): frames that stop short of the station are open, and those that reach past it are restricted.

## Flights that contain Lo Wu or Shenzhen town

Footprints in HK80 metres: `E` and `N` are the extremes of the index polygon across the frames of that flight. `Frames` lists photo numbers (a trailing `R` is the index's restricted flag on that frame).

| Date | Height | Scale | Access | Frames | N max | E range | Photo numbers |
|---|---|---:|---|---:|---:|---|---|
| 1975-11-23 | 31,550 ft | 1:63,100 | restricted | 2 | 845,577 | 817,799–838,494 | 4R 5R |
| 1975-12-24 | 12,500 ft | 1:25,000 | restricted | 18 | 847,991 | 823,676–837,763 | 11847R 11865R 11866R 11867R 11868R … |
| 1976-11-23 | 12,500 ft | 1:25,000 | restricted | 20 | 846,986 | 823,262–837,046 | 16327R 16332R 16333R … |
| 1976-11-24 | 3,000 ft | 1:6,000 | mixed | 10 | 843,757 | 828,559–831,185 | 16683 16684 16685 16686 16687 16688R … |
| 1978-01-06 | 12,500 ft | 1:25,000 | restricted | 5 | 845,682 | 823,389–834,431 | 20596R 20602R 20609R 20619R 20620R |
| 1978-12-15 | 12,500 ft | 1:25,000 | restricted | 7 | 846,501 | 825,838–836,630 | 24461R 24462R 24463R 24464R 24465R 24490R 24491R |
| 1979-11-29 | 10,000 ft | 1:20,000 | restricted | 3 | 844,157 | 827,340–834,238 | 28363R 28364R 28365R |
| 1979-11-30 | 10,000 ft | 1:20,000 | restricted | 4 | 846,470 | 825,227–834,958 | 28441R 28442R 28443R 28444R |
| 1980-02-15 | 25,000 ft | 1:50,000 | restricted | 4 | 848,103 | 821,885–842,748 | 29228R 29229R 29230R 29231R |
| 1981-05-19 | 10,000 ft | 1:20,000 | restricted | 18 | 845,202 | 825,189–834,198 | 38043R … 38053R 38068R … 38074R |
| 1981-10-27 | 10,000 ft | 1:20,000 | restricted | 5 | 844,034 | 826,552–833,443 | 39333R–39337R |
| 1981-10-28 | 10,000 ft | 1:20,000 | mixed | 5 | 845,720 | 826,346–834,449 | 39392 39393 39478R 39492R 39493R |
| 1982-05-19 | 5,000 ft | 1:10,000 | restricted | 1 | 843,748 | 828,210–831,400 | 42255R |
| 1982-10-06 | 4,000 ft | 1:8,000 | restricted | 2 | 844,379 | 827,811–830,816 | 44151R 44152R |
| 1982-10-10 | 10,000 ft | 1:20,000 | restricted | 7 | 847,694 | 824,989–835,494 | 44734R 44735R 44736R 44737R 44762R–44764R |
| 1982-12-29 | 4,000 ft | 1:8,000 | mixed | 3 | 843,536 | 828,232–831,538 | **46764** **46765** 46766R |
| 1983-01-24 | 20,000 ft | 1:40,000 | restricted | 8 | 849,756 | 821,346–839,406 | 47012R–47017R 47064R 47065R |
| 1983-02-17 | 4,000 ft | 1:8,000 | restricted | 3 | 844,156 | 828,312–831,396 | 48018R 48019R 48020R |
| 1983-11-30 | 10,000 ft | 1:20,000 | restricted | 3 | 846,277 | 826,176–834,827 | 51441R 51442R 51443R |
| 1983-12-01 | 20,000 ft | 1:40,000 | restricted | 14 | 848,530 | 821,954–840,430 | 51570R 51572R 51573R 51619R–51627R 51651R 51652R |
| 1983-12-22 | 10,000 ft | 1:20,000 | restricted | 3 | 845,317 | 824,534–832,862 | 52327R 52328R 52329R |
| 1985-07-07 | 10,000 ft | 1:20,000 | restricted | 3 | 844,174 | 825,994–831,924 | A01862R A01863R A01864R |
| 1985-10-04 | 15,000 ft | 1:30,000 | restricted | 1 | 845,196 | 828,627–836,351 | A02826R |

No 1984 row exists: no 1984 frame contains either point.

## The December 1983 run, frame by frame

These are the end-1983 candidates. The `Lo Wu` column says whether the index footprint contains the station point; `SZ town` whether it contains the Shenzhen-town point.

| Photo | Date | Scale | Easting | Northing | Lo Wu | SZ town |
|---|---|---|---:|---:|---|---|
| 51441R | 1983-11-30 | 1:20,000 | 826,176–831,864 | 838,956–844,644 | yes | no |
| 51442R | 1983-11-30 | 1:20,000 | 827,509–833,691 | 839,209–845,391 | yes | no |
| 51443R | 1983-11-30 | 1:20,000 | 828,573–834,827 | 840,023–846,277 | yes | no |
| 51619R | 1983-12-01 | 1:40,000 | 828,840–838,561 | 837,940–847,661 | yes | yes |
| 51620R | 1983-12-01 | 1:40,000 | 826,188–836,412 | 837,488–847,712 | yes | yes |
| 51621R | 1983-12-01 | 1:40,000 | 825,758–835,642 | 837,558–847,442 | yes | yes |
| 51622R | 1983-12-01 | 1:40,000 | 824,987–835,714 | 837,137–847,864 | yes | yes |
| 51623R | 1983-12-01 | 1:40,000 | 824,737–835,464 | 837,037–847,764 | yes | yes |
| 51624R | 1983-12-01 | 1:40,000 | 825,320–834,480 | 837,820–846,980 | yes | yes |
| 51625R | 1983-12-01 | 1:40,000 | 825,070–834,230 | 837,820–846,980 | yes | yes |
| 51626R | 1983-12-01 | 1:40,000 | 824,870–834,030 | 837,820–846,980 | yes | yes |
| 51627R | 1983-12-01 | 1:40,000 | 824,620–833,780 | 837,820–846,980 | yes | yes |
| 51651R | 1983-12-01 | 1:40,000 | 829,370–840,430 | 837,470–848,530 | no | yes |
| 51652R | 1983-12-01 | 1:40,000 | 829,011–839,789 | 837,511–848,289 | yes | yes |
| 52327R | 1983-12-22 | 1:20,000 | 828,038–832,862 | 839,538–844,362 | yes | no |
| 52328R | 1983-12-22 | 1:20,000 | 825,849–831,201 | 839,349–844,701 | yes | no |
| 52329R | 1983-12-22 | 1:20,000 | 824,534–830,367 | 839,484–845,317 | yes | no |

Reading: the 22 December frames cover the Lo Wu corridor and reach N 845,317, about 2 km beyond the station point; the 1 December 1:40,000 frames cover the whole core and west, at a fifth of the detail.

## Access

- **Previews** are free at 240 × 220 px from `…/OneStopSystem/map-search/get_prod_thumbnail?itemId=DAP&sheetNo=<photo>`. They are for screening and cannot be displayed.
- **Scans** are ordered from the Lands Department through the same OneStop System (the aerial-photo product is `DAP`). The index prices are on the ordering page; nothing here records a price.
- **Restricted frames** (`RESTRICTED = 1`, photo numbers ending `R`) need approval before release. Expect a written request and a delay. No restricted frame has been requested yet.
- **Rights:** HKSAR Lands Department. Treat as `reference_only` until a licence or purchase record exists.
- **Terms:** the catalogue queries used the key that the public map-search page serves to browsers. If the department objects to that use, stop and ask it for an extract instead; nothing depends on the key beyond the screening already recorded here.

## What would settle it

1. Ask Lands Department whether the 22 December 1983 frames (52327R–52329R) and the 1 December 1983 1:40,000 run can be released, and whether a cloud-free print exists.
2. If they cannot, the 6 January 1978 and 15 December 1978 1:25,000 frames bracket the opening state and are also restricted; ask for those in the same request.
3. Order one open frame first (16687, 1976-11-24, 1:6,000) as a test of scan quality, price and turnaround before committing to a run.
4. On receipt, record the exact frame, date, scale, footprint, licence and hash in a source record, then register the scan as a `lead` observation before any tracing.
