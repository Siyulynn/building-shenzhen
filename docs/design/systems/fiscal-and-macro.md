# System spec: fiscal and macro
**Status:** draft v0.2 (baseline obligations, deficit rule, ledger scope, partial-equilibrium preview). **Covers:** `PLAN.md` §3.5 (production loop) and §3.6 (public finance and the macro model). **Depends on:** buildings-and-construction (floor space, construction work), enterprises, pops, the authority layer, and leaders.

The names of facts below refer to `docs/research/verification-log-2026-11.md`. Every number is either a **sourced fact** (marked with the row number from the log, such as [V10]) or a **starting parameter** (in `params/fiscal.yaml`, tuned by calibration). Nothing else.

---

## 1. Purpose
The player must be able to answer three questions:
- **"Why can't we afford this?"**
- **"What does this deal actually earn the city?"**
- **"What did that decision commit us to?"**

The system must also reproduce Shenzhen's published fiscal and GDP series in their own historical categories.

**Non-goals:**
- a national fiscal model (the centre and the province are exogenous rules);
- monetary policy (credit conditions are an exogenous series plus local collateral);
- simulating each household's taxes.

---

## 2. Core concepts

| Concept | Meaning |
|---|---|
| **Ledger** | The single source of truth: dated entries of the form `(type, account, amount, counterparty, ref)`. Every money movement is written exactly once |
| **Account** | A pool that entries post to: `general`, `land`, `debt`, `forex`, `city_companies` (off-budget). Accounts are bookkeeping, not player-facing spending rules |
| **Obligation** | A recurring future outflow created by a decision: payroll, service running costs, maintenance, debt service, mandated transfers. Each one stores its amount per month, an indexation rule, a start date, an optional end date, and the decision that created it |
| **Project** | A capital commitment: a budget, a schedule of spending, and the asset it produces when finished. When an asset is completed, it creates a maintenance obligation |
| **View** | A player-facing summary computed from the ledger and the obligations (§7) |
| **Reporting view** | A historical presentation of the ledger for calibration, which can differ by era. For example, land receipts sat inside the budget in 1994 and outside it from 1995 [V7] |
| **Fiscal regime** | A data file of rates, sharing rules, rebates and incentives, switched on by national anchor events |

**Scope.** The ledger models **consolidated citywide local finance (全市地方财政)**. District governments (Luohu, Futian, Nanshan, Bao'an, Longgang) are not simulated, and revenue is not split between districts. Municipal-level (市级) checkpoints, such as the 35.5% basic-construction share in 1994 [V5], are matched through a documented reporting view, `reporting/municipal_level.yaml`. It assigns each ledger type a municipal share, starting from the 1994 ratio of 50.08亿 municipal to 74.4亿 citywide revenue [V8].

---

## 3. State

```ts
interface FiscalState {
  regime: string;                          // id in content/fiscal_regimes/*.yaml
  ledger: LedgerEntry[];                   // append-only; compacted into monthly totals after 24 months
  obligations: Obligation[];
  projects: Project[];
  loans: Loan[];
  forex: { quotaUSD: number; swapRate: number; retentionRatio: number } | null; // null after the 1994 regime
  rebateBase?: { year: number; amount: number };   // set when the 1994 regime activates
  creditConditions: number;                // exogenous series × local factors
  priceIndex: { national: number; local: number; costOfLiving: number };
}
interface LedgerEntry { date: YM; type: TxType; account: AccountId; amount: number; ref?: string }
interface Obligation { kind: 'baseline'|'payroll'|'service'|'maintenance'|'debt_service'|'transfer'|'arrears';
  perMonth: number; index: 'none'|'wages'|'prices'; from: YM; until?: YM; createdBy: string }
interface Project { id: string; asset: AssetSpec; budget: number; spendCurve: number[]; spent: number;
  fundedBy: { account: AccountId; share: number }[]; stage: 'committed'|'building'|'done'|'cancelled' }
interface Loan { id: string; lender: 'state_bank'|'foreign_bank'|'investor'|'city_company';
  principal: number; rate: number; schedule: { date: YM; amount: number }[]; guaranteedByCity: boolean;
  collateral?: string; projectId?: string }
```

---

## 4. Revenue

### 4.1 Tax bases (computed each month from the other systems)

| Tax | Base | Comes from |
|---|---|---|
| VAT (from 1994) / product tax (before 1994) | Value added in goods-producing and goods-trading sectors | Production loop (§8) |
| Business tax (营业税) | Turnover in services, construction, real estate, finance and transport | Production loop; construction work done; property sales |
| Enterprise income tax | Profit by firm, less any incentive | Industry blocks and notable firms |
| Personal income tax | Wages above the threshold | Pops |
| Customs duty, consumption tax | Imports; specified goods | Trade flows (central only from 1994 [V10]) |
| Securities trading tax | Exchange turnover (from 1990) | Exogenous plus local market size |
| Land-use fees | Leased area × annual fee rate | Parcels (from 1981: industrial ¥10–30/m²/yr, commercial ¥70–200/m²/yr [V13]) |
| Land premiums (出让金) | Lease transactions | Land market (§5) |
| Fees and charges | Licences, permits, fines | Many systems |

**Collection efficiency** is a parameter for each tax. It falls with informality, with leader traits (leakage) and with weak enforcement, and rises with administrative capacity.

### 4.2 Sharing and retention by regime
Each regime file lists, for every tax:
- `central_share`;
- `provincial_share`;
- `local_share`;
- special rules such as exceptions, holidays and caps.

**1994 tax-sharing regime** (`regime.tax_sharing_1994`, sourced [V10]). Decided 1993-12-15, effective 1994-01-01.
- **Central only:**
  - customs duties;
  - consumption tax, and VAT and consumption tax collected at customs;
  - enterprise income tax of central enterprises;
  - enterprise income tax of local banks, foreign banks and non-bank financial firms;
  - tax paid centrally by the railways and by bank and insurance head offices (their business tax, income tax, profits and city maintenance tax).
- **Local only:**
  - business tax, apart from the central exceptions above;
  - enterprise income tax of local enterprises, apart from the financial firms above;
  - personal income tax;
  - urban land-use tax;
  - stamp duty, apart from securities trading;
  - and the other local taxes listed in the decision.
- **Shared:**
  - VAT, 75% central and 25% local;
  - securities trading tax, 50% central and 50% local, as the decision text assigns it.

  What was actually levied and shared in practice (securities trading stamp duty, 证券交易印花税, and any later shift of its split toward the centre) is `lead`. Until that is sourced, `params.securities_tax_central_share` defaults to 0.5.
- **Tax rebate (税收返还):**
  ```
  rebate(1994+) = base_1993 × Π(1 + 0.3 × g_t)
  ```
  Here `g_t` is the *national* average growth of VAT plus consumption tax in year t, an exogenous series, and the base is the 1993 amount [V10]. How `base_1993` is set for Shenzhen needs its own source. Until then, `params.rebate_base_1993` is computed from the simulated 1993 revenue the centre "took over".

  **A 1993 Q4 card (lead):** because 1993 sets the permanent rebate base, local governments are said to have rushed to collect as much tax as possible in late 1993 (突击收税). The card would offer: collect early or harder now (a higher base for good, but businesses are squeezed and scrutiny rises if it is noticed). It needs a source before Historical mode.
- **Later regimes** are still `lead` and need a source before activation:
  - `regime.income_tax_sharing_2002` (50/50 in 2002, 60/40 from 2003);
  - `regime.land_auction_mandate_2004`;
  - `regime.eit_unification_2008`.
- **Before 1994** (`regime.contracting_1980s`): the city keeps local revenue above a remittance formula. The formula's form and rates are **lead**. Model it as `remittance = max(0, base + rate × (revenue − base))`, with parameters.

### 4.3 The waterfall (always shown)
```
total collected in Shenzhen (全口径)  →  − central share  →  − provincial share  →  + rebates and transfers  →  = retained locally
```
Each line can be expanded by tax. Citywide (全市) and municipal-level (市级) figures are always labelled separately. In 1994 they were 74.4亿 and 50.08亿 of budgetary revenue respectively [V8].

---

## 5. Land finance
- **How land can be leased** depends on the regime:
  - administrative allocation;
  - a negotiated lease (with the minimum fee often waived in practice [V13a]);
  - a tender, auction or listing (from the 1987 local milestone; mandatory for commercial land under the 2004 regime once it is sourced).
- **The premium on a lease:**
  - For a negotiation, it is a negotiated value: `market_value × discount`. The discount comes from leader traits and from how urgently the investor is courted.
  - For an auction, it comes from a bidding model: `bids ~ f(expected rent or sale value, vacancy, credit conditions, number of bidders)`. Auctions can fail, or clear low.
- **Costs come off once,** when they are paid: compensation for every claim on the parcel (from buildings-and-construction §6), clearance and site servicing.
  ```
  net land receipts = premium − compensation − clearance − servicing
  ```
- **Where the money is reported depends on the reporting view:** inside the budget in 1994, in a separate development-income section from 1995 [V7]. The ledger entry is the same either way.

---

## 6. Spending

### 6.1 Obligations (recurring money)
**Baseline (statutory) obligations** exist whatever the player decides, and grow with the population. They are recomputed monthly:

| Baseline | Obligation |
|---|---|
| Municipal administration | `per_resident.admin × resident pop` |
| Basic public security | `per_present.police × present pop` (the actually-present count) |
| Compulsory schooling for eligible children | `per_pupil × eligible children`. Eligibility is set by the era's rules: hukou children always, non-hukou children only once a policy extends it |
| Basic sanitation and street cleaning | `per_m2_built × built floor space` |

The player can underfund a baseline (austerity, §7.1) but cannot remove it.

**Service gaps.** Facilities have capacity (school places, clinic visits, police posts). When capacity falls behind eligible demand in an area, `service_gap[area]` rises. It lowers mood, feeds stability, and counts in the annual performance review and the title-review indicators. A city that grows without building schools pays through scores and unrest, not through a free surplus.

**Obligations created by decisions:**

| Decision | Obligation it creates |
|---|---|
| Open a school, clinic or police post | `payroll` (staff ratio × wage index) plus `service` running costs. Both are in `params` |
| Extend services to non-hukou residents | `service`, scaled by the eligible pop |
| Complete a road, bridge, pipe or park | `maintenance` = `asset_value × maint_rate[asset_type]`. 1994 shows newly opened roads and bridges pushing maintenance spending up 47% [V6] |
| Draw a loan | `debt_service`, from the loan's schedule |
| A mandate from above | `transfer` (for example a mandated contribution) |
| A leader's prestige project (政绩工程, leadership-and-reviews §2.5) | The project's budget, then `maintenance` and `payroll` when it is finished. These outlast the leader who asked for it |

Payroll is indexed to wages, and service and maintenance costs to the price index.

### 6.2 Projects (money for projects)
- **Committing** to a project reserves its whole budget against *money for projects*. Spending then follows the project's spend curve.
- **Cancelling** a project recovers what hasn't been spent, minus a penalty. What has been spent is sunk.
- **Delays** follow from the builder's capacity, labour, materials and the Mayor's traits.

**Calibration point:** basic construction was 35.5% of municipal-level spending in 1994 [V5].

---

## 7. Player views

| View | Formula (per month, also shown per year) |
|---|---|
| **Recurring money available** | retained recurring revenue − Σ obligations due |
| **Money for projects** | accumulated recurring surplus + eligible grants + net land receipts − Σ remaining commitments on started projects |
| **Borrowing capacity** | min(lender limit from debt-service cover, collateral value × loan-to-value) − debt outstanding. Debt-service cover = (recurring surplus + project income) / debt service. Both thresholds are in `params`, and the lender's appetite moves with `creditConditions` |
| **Import access** (regime before 1994) | forex quota in USD, plus the yuan needed at the swap rate. Retention gives a *quota to buy* foreign exchange [V12]. Abolished when the 1994 regime activates [V12] |

### 7.1 Recurring deficits
If **recurring money available** goes negative in a month, the sim resolves it in this order, so it can never deadlock:
1. **The reserve:** draw on the accumulated recurring surplus.
2. **A deficit card** (once a quarter, if the reserve is empty). The player chooses:
   - **short-term borrowing** from a state bank or a city company. This costs a rate premium and lowers borrowing capacity;
   - **using land money for recurring spending.** Each era's regime data sets whether this is sanctioned, grey or forbidden. Grey or forbidden use raises scrutiny;
   - **austerity:** a proportional cut to service and payroll obligations. Service gaps open (§6.1), mood falls, and review scores drop.
3. **The default** (headless runs, or if the player declines): borrowing up to capacity, then austerity.
4. **Arrears:** anything still unpaid is booked as an `arrears` obligation due next month, and unpaid payroll triggers a stability event.

The month always closes with a balanced ledger.

### 7.2 The investor card's fiscal preview
The preview is a **partial-equilibrium 5-year projection**, not a simulation of the whole game:
- the firm's expected output path, from the ramp-up on its card;
- × its value-added ratio and the **current** regime's tax and sharing rules (regime changes already scheduled are shown as a note, not computed);
- plus the direct changes in jobs, beds needed and service obligations.

It does not copy the game state or feed back into prices, migration or the land market. It is a pure function of `(card, regime, current prices)`, so it is cheap and has no side effects. The card shows:
- cash this quarter (premium, fees, any co-financing);
- the recurring retained tax per year, after sharing, rebates and incentives;
- jobs created, by skill;
- the housing demand that follows (beds needed);
- new obligations, such as the services the city must provide.

---

## 8. Macro: production, GDP and prices

### 8.1 The production loop (monthly, for each industry block and notable firm)
```
output = min(orders, staffed_capacity, usable_floor_capacity, utility_capacity)
value_added = output × value_added_ratio[sector, ownership]
```
- **Orders** come from exogenous demand (world, Hong Kong, inland) plus local demand.
- **Staffed capacity** comes from the labour match.
- **Usable floor capacity** counts only *completed* floor space, from buildings.
- **Utility capacity** is the power and water allocated to the block.

A notable firm's figures are taken out of its block's totals before the blocks are added up.

### 8.2 GDP (production approach)
- **Definition:** value added = gross output − intermediate inputs, and GDP = Σ value added over sectors [V14].
- **Hong Kong processing contracts:** the gross shipment is written to *trade statistics*, and only the local processing activity (the value-added ratio) counts towards GDP.
- **Construction:** counted when the work is done (from the construction pipeline's monthly progress), not on completion or sale.
- **Real estate:** includes the imputed rent of owner-occupied housing.
- **Excluded from GDP:** lease premiums, loan proceeds and transfers. They are financial flows that go to the ledger only.

### 8.3 Nominal, real and the cost of living
- **Nominal GDP** is the sum of value added at current prices.
- **Real GDP** is nominal GDP divided by a deflator. The deflator combines the exogenous national deflator with local bottleneck inflation (housing, food, power). The yearbooks report both current-price and constant-price GDP [V14].
- **The household cost-of-living index** is weighted by rent and necessities. It feeds pop budgets (`PLAN.md` §3.14), so a housing boom can squeeze workers while output rises.

---

## 9. Reporting views and calibration
- **`reporting/era_*.yaml`** maps ledger types onto the historical categories of each era. Examples: 预算内财政收入, 地方一般预算收入, 全口径财政收入, 特区开发收入.
- **Targets** live in `data/targets/fiscal.csv`, and each row records its vintage, its geography and the claim ID it came from.

| Target | Value | Status |
|---|---|---|
| 1994 citywide budgetary revenue / spending | 74.4亿 / 74.6亿 | sourced [V8] |
| 1994 municipal-level revenue / spending | 50.08亿 / 48.21亿 | sourced [V8] |
| 1994 basic construction / municipal spending | 35.5% | sourced [V5] |
| 1994 land-transfer receipts (inside the budget) | 5.5亿 | sourced [V7] |
| End-1986 land-use fees / government revenue and / infrastructure capital investment | 1.5% and 6% | sourced [V13] |
| 2008 全口径 / central / local general-budget revenue | 2,830亿 / 2,029亿 / 800.4亿 | lead (search summary) |
| 2009 GDP | 8,201.32亿 | sourced [V4] |
| 2009 fiscal figures cited by the review | — | **unsourced**: the citation was wrong [V9] |

---

## 10. Invariants and tests
- **The ledger balances:** Σ entries = change in the account balances, every month.
- **Nothing is double-counted:**
  - compensation is deducted once, at payment;
  - notable firms are removed from their blocks before aggregation;
  - a lease premium never appears in GDP.
- **Obligations sum up:** obligations due this month = Σ live obligations for the month.
- **The rebate rule holds:** after 1994, the rebate grows exactly 0.3 × the national VAT-plus-consumption-tax growth.
- **Pure previews:** an investor-card preview is a pure function of `(card, regime, current prices)`. It never touches the game state and gives the same answer on a re-run.
- **No deadlock:** with any combination of negative recurring money, empty reserves and zero borrowing capacity, the month closes with a balanced ledger (§7.1).
- **Baselines grow:** if population grows and the player builds nothing, baseline obligations and service gaps both rise.
- **Golden-run tests** with a fixed seed check the 1994 municipal totals against the targets, within tolerance.

---

## 11. Phase 1 subset (Luohu and Shekou, 1980–1985; see phase1-slice.md)
- **Accounts:** a ledger with `general`, `land` and `debt` accounts, and a simplified `forex` quota.
- **Regime:** `regime.contracting_1980s` only, with SEZ tax incentives.
- **Land income:** land-use fees from the 1981 regulations [V13], and negotiated leases only.
- **Obligations:** the baselines, plus payroll, services and maintenance from decisions. The deficit rule in §7.1.
- **Projects:** the project mechanism.
- **Finance offers:** one state-bank project loan and one investor co-financing offer.
- **Views:** three player views (recurring, projects, import access), with borrowing shown inside the loan card.
- **Investor preview:** the partial-equilibrium preview (§7.2).
- **Production and GDP:** the production loop with value-added ratios, and nominal GDP only. The real/nominal split arrives in Phase 3.

---

## 12. Parameters (sketch of `params/fiscal.yaml`)
```yaml
collection_efficiency: { vat: 0.85, business_tax: 0.8, eit: 0.75, pit: 0.6 }   # starting guesses
maint_rate: { road: 0.02, bridge: 0.015, pipe: 0.02, school: 0.03, park: 0.04 } # per year, of asset value
staff_ratio: { school: 1/20, clinic: 1/400 }
per_resident: { admin: null }; per_present: { police: null }; per_pupil: null; per_m2_built: null   # starting params; calibrate
municipal_share: { from_1994_ratio: 0.673 }   # 50.08 / 74.4 [V8]; reporting view only
lender: { min_dscr: 1.3, max_ltv: 0.6 }
contracting_1980s: { base: null, rate: null }   # LEAD: needs a source
rebate_base_1993: derived
value_added_ratio: { processing_hk: 0.2, electronics_jv: 0.3, construction: 0.35 }  # starting guesses; calibrate
```

## 13. Open questions
- How the 1980s fiscal contracting arrangement for Shenzhen actually worked: base, rates and dates.
- How Shenzhen's 1993 rebate base was set, and whether the late-1993 rush to collect taxes (突击收税) happened in Shenzhen (lead).
- Which series of city-company and off-budget debt exist at all for 1980–2009.
- Whether to model the province as a separate actor with discretion, or as fixed rules.
