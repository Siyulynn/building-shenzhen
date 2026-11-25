# 深圳市国民经济和社会统计资料 1979–1985: extraction / 统计资料提取

Status: **lead**. `data/raw/深圳市国民经济和社会统计资料 1979-1985 (深圳市统计局).pdf` is a 283-page scan with no
text layer; the tables below were read by OCR (RapidOCR, 2× render) from the pages named, and checked against the
running totals where the table prints them. The book is the Statistical Bureau's own 1987 compilation, so it is a
stronger source than the gotohui aggregator, but **nothing here is `sourced` or `verified` until a person checks the
scans**. OCR confuses 0/8, 1/7 and column order; values below carry ⚠ where the reading is uncertain.

The second file, `data/raw/Shenzhen 1984.pdf`, is 王碩's 2013 article on the 1984–85 debate over the SEZ, not a
statistical source. Its useful figures are quoted in §6 as leads.

Page numbers: printed page = PDF page − 13 for the 综合/人口/工业 sections, and −16 for 对外经济. The contents are on
PDF 11–15.

## 1. Population (万人)

| Year | Total | Registered (常住) | Temporary (暂住) | SEZ total | SEZ registered | SEZ temporary | Birth ‰ | Death ‰ | Natural ‰ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1979 | 31.41 | 31.26 | 0.15 | 7.14 | 7.09 | 0.05 | 24.6 | 5.7 | 18.9 |
| 1980 | 33.29 | 32.09 | 1.20 | 9.41 | 8.41 | 1.00 | 21.4 | 5.6 | 15.8 |
| 1981 | 36.69 | 33.39 | 3.30 | 13.13 | 9.83 | 3.30 | 23.0 | 5.3 | 17.8 |
| 1982 | 44.95 | 35.45 | 9.50 | 19.86 | 12.86 | 7.00 | 20.3 | 5.0 | 15.3 |
| 1983 | 59.52 | 40.52 | 19.00 | 28.50 | 16.50 | 12.00 | 13.9 | 4.7 | 9.20 |
| 1984 | 74.13 | 43.52 | 30.61 | 33.75 | 19.14 | 14.61 | 11.50 | 3.69 | 8.09 |
| 1985 | 88.15 | 47.86 | 40.29 | 46.98 | 23.19 | 23.79 | 12.27 | 3.36 | 8.91 |

Read: population growth is migration, not births. The birth rate halves over the period and the natural increase falls
from 18.9 to 8.9 per thousand, while the temporary population goes from 0.5% of the total to 46%. In the SEZ the
temporary share is 42% by 1983 and 51% by 1985.

## 2. GDP and its composition (万元, current prices)

| Year | GDP | Primary | Secondary | Tertiary | Primary % | Secondary % | Tertiary % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1979 | 19,638 | 7,273 | 4,017 | 8,348 | 37.04 | 20.46 | 42.50 |
| 1980 | 27,012 | 7,803 | 7,036 | 12,173 | 28.89 | 26.05 | 45.06 |
| 1981 | 49,576 | 13,343 | 16,019 | 20,214 | 26.91 | 32.31 | 40.78 |
| 1982 | 82,573 | 18,960 | 31,439 | 32,174 | 22.96 | 38.07 | 38.97 |
| 1983 | 131,212 | 22,614 | 55,848 | 52,750 | 17.23 | 42.56 | 40.21 |
| 1984 | 234,161 | 25,932 | 106,606 | 101,623 | 11.07 | 45.53 | 43.40 |
| 1985 | 332,445 | 26,111 | 155,477 | 150,857 | 7.85 | 46.77 | 45.38 |

**The SEZ's own split is the right target for the slice**, not the city's:

| Year | SEZ GDP | Primary % | Secondary % | Tertiary % |
|---|---:|---:|---:|---:|
| 1980 | 14,626 | 11.93 | 38.04 | 50.03 |
| 1981 | 30,226 | 7.29 | 48.76 | 43.95 |
| 1982 | 55,491 | 5.00 | 50.84 | 44.16 |
| 1983 | 96,542 | 4.77 | 50.34 | 44.89 |
| 1984 | 179,103 | 2.09 | 48.63 | 49.28 |
| 1985 | 270,413 | 1.21 | 47.98 | 50.81 |

The slice's 1983 GDP (42M yuan) is 43% of the SEZ's 96.5M — the same share as its 1979 population. Its split should
be compared with 5 / 50 / 45, not 17 / 43 / 40.

**Social output and national income** (万元): social output 29,097 / 44,265 / 90,319 / 156,162 / 254,024 / 488,501 /
731,528; construction output 5,651 / 14,147 / 30,635 / 71,678 / 103,198 / 185,434 / 294,891 (construction's share of
social output rises from 19.4% to 40.3%, and is the largest single branch from 1982); national income 15,977 / 22,104 /
41,971 / 67,706 / 107,538 / 202,189 / 263,724.

## 3. Employment and wages

| Year | Employees (万人) | State (全民) | Collective | Joint (合营) | Average wage (元/yr) | SEZ wage |
|---|---:|---:|---:|---:|---:|---:|
| 1979 | 4.02 | 3.37 | 0.65 | — | 769 | 833 |
| 1980 | 4.86 | 4.05 | 0.81 | — | 979 | 1,133 |
| 1981 | 5.31 | 4.51 | 0.80 | — | 1,132 | 1,196 |
| 1982 | 8.28 | 7.00 | 1.28 | — | 1,366 | 1,408 |
| 1983 | 12.57 | 10.10 | 1.22 | 1.25 | 1,545 | 1,610 |
| 1984 | 18.27 | 14.09 | 2.15 | 2.03 | 2,179 | 2,266 |
| 1985 | 22.66 | 16.84 | 2.60 | 3.22 | 2,418 | 2,524 |

- **State employment dominates to 1983**; joint ventures appear in the table only in 1983 and reach 3.22万 by 1985.
- **Nominal wages ×2.8 in five years** (769 → 2,179; SEZ 833 → 2,266). The model's factory wage is 60 a month
  (720 a year) and barely moves, so it misses the wage inflation that drove migration, rents and services.
- Industrial enterprises: 224 (1979) → 907 (1985). Industrial employment in 1980 is about 0.95万 over 241
  enterprises, i.e. **~40 workers an enterprise** — far from the model's 500-job organic firm.

## 4. Investment and its financing

Social fixed-asset investment (万元): 5,938 / 12,877 / 27,425 / 73,750 / 108,320 / 194,572 / 333,235 (1979–85).
Capital construction: 4,988 / 12,487 / 27,039 / 63,265 / 88,593 / 155,466 / 276,125.

**Sources of capital construction (万元):**

| Year | Total | Foreign | Budget | Self-raised | Domestic loans | State | Central/provincial |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1979 | 4,988 | 547 | 625 | 207 | 703 | 2,385 | 1,224 |
| 1980 | 12,487 | 5,392 | 964 | 812 | 3,163 | 3,300 | 1,316 |
| 1981 | 27,039 | 13,533 | 3,339 | 1,996 |  | 2,274 | 2,444 |
| 1982 | 63,265 | 19,138 | 6,396 | 5,000 | 20,291 | 4,738 |  |
| 1983 | 88,593 | 22,212 | 7,802 | 9,706 | 33,405 | 4,370 |  |
| 1984 | 155,466 | 26,498 | 21,294 | 21,748 | 63,971 | 2,106 |  |
| 1985 | 276,125 | 36,065 | 45,013 | 73,271 | 56,351 | 4,285 |  |

- **Domestic bank loans rise from nothing to 41% of 1984 capital construction** (63,971 / 155,466); the 2013 article
  says 44%. Foreign capital falls from 50% (1981) to 17% (1984); the state grant falls from 48% (1979) to 1% (1984).
- **Construction workforce** (including temporary): 40,844 (1980) → 66,764 (1982) → 104,330 (1984) → 135,750 (1985).

## 5. Fiscal and foreign capital

Budget revenue and the customs line (万元):

| Year | Revenue | Customs (海关代征) | Customs share | Expenditure | Capital construction grant |
|---|---:|---:|---:|---:|---:|
| 1979 | 1,721 | 679 | 39% | 2,970 | 892 |
| 1980 | 3,043 | 1,627 | 53% | 4,003 | 1,813 |
| 1981 | 8,787 ⚠ | 6,224 | 71% | 8,411 | 4,194 |
| 1982 | 9,163 | 3,618 | 39% | 8,816 | 3,292 |
| 1983 | 15,605 | 6,017 | 39% | 15,025 | 5,752 |
| 1984 | 29,435 | 14,624 | 50% | 27,954 | 11,468 |
| 1985 | 62,894 | 28,402 | 45% | 58,655 ⚠ | 31,297 |

**Customs is the largest revenue line throughout, 39–71%.** Land revenue is not a line in this table.

Foreign capital (万美元), actual:

| Year | Total actual | FDI | SEZ total |
|---|---:|---:|---:|
| 1979 | 1,537 | 548 | 939 |
| 1980 | 3,264 | 2,755 | 2,657 |
| 1981 | 11,282 | 8,618 | 9,756 |
| 1982 | 7,379 |  | 6,690 |
| 1983 | 14,393 |  | 11,841 |
| 1984 | 23,013 |  | 22,624 |
| 1985 | 32,925 |  | 32,427 |

The gap between the total and FDI is **commodity credit** (989万 in 1979, 2,664万 in 1981) and, from 1982, other
forms. This explains the earlier apparent conflict with gotohui: its 0.05亿美元 (500万) is FDI, not total foreign
capital. **Do not average the two.** Contracted capital: 2,984 / 27,122 / 86,360 / 18,028 / 33,451 / 64,564 / 102,647.

## 6. The 1984 paper (lead)

王碩, 〈中國經濟特區成敗：1980年代中期的辯論與抉擇〉, 《二十一世紀》2013年10月號. Facts quoted:

- **1984: bank loans were 44% of capital construction** (§4 above gives 41% for the yearbook's narrower base).
- 1984 construction ¥1.6bn; the 1985 target was ¥2.5bn, then cut by ¥2.57bn, 804 projects halted, 51 high-rises.
- 1987: exports $725m; self-produced industrial exports 45% of industrial output (51% including processing).
- The 1985 critique: the SEZ earned the interior's money by importing and reselling domestically, consumed foreign
  exchange, and over-built hotels and factories (hotel occupancy 20–40%).
- Policy targets ("three main"): foreign capital ≥50% of industrial investment, exports ≥70% of enterprise output,
  forex balanced.

## 7. What this means for the model

1. **Construction is a sector, not a residual.** It is the largest branch of social output from 1982, 25% of 1983 GDP,
   and it employs 100,000+ by 1984. The model's construction value added is a small remainder on works spend and it has
   no construction labour or financing. Add construction output, employment and its financing mix.
2. **Bank loans finance the boom.** Domestic loans go 0 → 41% of capital construction; foreign capital and the state
   grant fall. The model's `debt` is a project loan and a short loan, not a construction-finance market. Add a
   construction financing mix (budget / foreign / self-raised / bank) and let a credit squeeze bite.
3. **Customs is the revenue base.** 39–71% of budget revenue is customs, tied to imports. The model's revenue is a
   county base plus land and firm taxes; it has no import channel and no customs line. The import-for-resale trade
   is the mechanism behind both the revenue and the 1985 critique.
4. **Temporary population is the majority of the growth.** City temporary 0.15 → 30.61万 (41% of 1984); SEZ 12万 vs 16.5万
   usual in 1983 (73%). The model's `present nonlocal` 32,309 of 62,329 is in the right range for the slice but the
   categories overlap: it needs registered / usual / temporary kept apart, and construction migrants housed in sheds
   and dormitories.
5. **Wages nearly triple.** 769 → 2,179 a year (SEZ 833 → 2,266). The model's wages are near-static, so its migration
   pull, rents and service demand are all too flat.
6. **Firms are small and mostly state or collective until 1983.** 224 industrial enterprises in 1979 (about 40 workers
   each), joint ventures appear only in 1983. The model's 500-job HK firm is a different animal; it needs a size
   distribution and a state/collective sector.
7. **Services are half the SEZ economy.** SEZ 1983: 4.8 / 50.3 / 44.9; the slice reads 4 / 76 / 20. Retail, transport,
   producer services and government employment need a size model, not an induced-post residual.
8. **The slice's share is consistent.** 42M of the SEZ's 96.5M in 1983 is 43%, the same as the 1979 population share;
   the level is defensible, the composition is not.
