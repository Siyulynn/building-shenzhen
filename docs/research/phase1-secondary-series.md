# Secondary series: GDP by sector and foreign investment / 补充序列

Status: **lead**. Both pages are secondary aggregators (聚汇数据, gotohui.com) that cite 深圳市统计局 / the 2014
statistical yearbook. The GDP totals agree with the existing 2014-vintage claims in
`data/evidence/claims/phase1_statistics.yaml`, which is a useful corroboration but not a new source tier. The sector
detail and the foreign-investment series still need the yearbook pages or a primary release before any is `sourced`.

Accessed 2026-11-25.

- GDP: <https://gdp.gotohui.com/data-49>
- Foreign capital actually used: <https://www.gotohui.com/trade/show-209237>

## GDP by sector, 1979–1984 (亿元, current prices)

| Year | Total | Primary | Secondary | Tertiary | Industry | Construction | Real estate | Finance | Hotels/catering | Wholesale/retail | Transport |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1979 | 1.96 | 0.73 | 0.40 | 0.83 | 0.23 | 0.17 | 0.05 | 0.16 | 0.11 | 0.31 | 0.12 |
| 1980 | 2.70 | 0.78 | 0.70 | 1.22 | 0.37 | 0.33 | 0.07 | 0.23 | 0.15 | 0.43 | 0.18 |
| 1981 | 4.96 | 1.33 | 1.60 | 2.02 | 0.83 | 0.77 | 0.12 | 0.39 | 0.24 | 0.71 | 0.29 |
| 1982 | 8.26 | 1.90 | 3.14 | 3.22 | 0.95 | 2.19 | 0.19 | 0.63 | 0.36 | 1.08 | 0.49 |
| 1983 | 13.12 | 2.26 | 5.58 | 5.28 | 2.25 | 3.34 | 0.32 | 1.12 | 0.57 | 1.69 | 0.77 |
| 1984 | 23.42 | 2.59 | 10.66 | 10.16 | 5.18 | 5.48 | 0.63 | 2.29 | 1.01 | 2.99 | 1.49 |

The totals match `phase1.gdp.city.nominal.<year>`; the three-sector split matches
`phase1.gdp.city.primary/secondary/tertiary.<year>`. **Construction is the fastest-growing subsector** (0.17 → 5.48,
×32 in five years), and industry only ×22: the 1982–83 boom is a building boom. That is a design-relevant shape for
the slice, where construction value added is a small residual of the model's GDP.

## Shares (%)

| Year | Primary | Secondary | Tertiary |
|---|---:|---:|---:|
| 1979 | 37 | 20 | 43 |
| 1980 | 29 | 26 | 45 |
| 1981 | 27 | 32 | 41 |
| 1982 | 23 | 38 | 39 |
| 1983 | 17 | 43 | 40 |

## Foreign capital actually used (亿美元)

| Year | 1979 | 1980 | 1981 | 1982 | 1983 | 1984 |
|---|---:|---:|---:|---:|---:|---:|
| US$100m | 0.05 | 0.28 | 0.86 | 0.58 | 1.13 | 1.86 |

Year-on-year: +460%, +207%, −33%, +96%, +65%. The 1982 dip is worth a check against the concession storm; the series is
not smooth enough to be a growth band.

## What the model can and cannot use

- **By sector:** the model can split its own GDP into primary/secondary/tertiary (`gdpBySector`, §5.6) and compare
  shares. In 1983 it reads 4 / 76 / 20 against the city's 17 / 43 / 40: the slice is an industrial core with an
  under-modelled service sector, and its primary is small because the seven areas hold little farmland. A rebalance
  was tested (`services` and `state` value added 40/45 → 55, `hk_processing` value-added ratio 0.2 → 0.18): it moved
  the split only to 5 / 69 / 27, raised the 1979 base and cut the GDP multiple from 4.87 to 4.19 (aggressive 3.52,
  near the band floor), so it was reverted. The service sector needs a size model (producer services, government
  employment), not a ratio.
- **Construction:** the claim's construction share (25% of GDP in 1983) is not reproduced; the model's construction
  value added is the residual of recorded GDP over firms and base jobs, and is small. A construction-led 1982 is the
  missing shape behind the tempo gap in the tuning log.
- **FDI:** the model has no capital account. `foreignCapitalUsdYear` counts only the construction cost of foreign
  firms accepted in the year (0.45 / 4.95 / 8.55 / 5.85 / 7.65 US$m), an order of magnitude below the claim because
  equipment and working capital are absent. It is a direction-of-travel indicator, not a calibration target.
- **Land finance and debt:** the model's land fees are a ledger account; `landShare` = land revenue ÷ (recurring
  revenue + land revenue) reads 0 / 0 / 0 / 46% / 57% for 1979–83, and `debtToRevenue` 0.88 / 0.86 / 0.67 / 0.45 /
  0.31. The 1983 land share is high but plausible for a land-financed infrastructure push; the 1979 debt ratio is
  the ¥3m project loan against a small revenue base. Both are reported, not banded.
