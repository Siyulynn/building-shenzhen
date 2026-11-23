# System spec: leadership and reviews
**Status:** draft v0.2 (discipline risk from shortcuts the player accepts, prestige-project mandates, monthly campaigns, one indicator convention). **Covers:** `PLAN.md` §3.8 (performance reviews), §3.9 (the Party Secretary and the Mayor) and §3.10 (honorary-title reviews). **Depends on:** the authority layer (climate, scrutiny, political capital), fiscal-and-macro, buildings-and-construction (illegal floor area, hazards), the informal economy, and stability.

Every trait number and threshold below is a **starting parameter** in `params/leadership.yaml` and `content/reviews/*.yaml`. Historical facts are marked with their status from the evidence protocol.

---

## 1. Purpose
- **Leaders** give politics a face and a rhythm. The player adapts to leaders they did not choose.
- **Performance reviews and honorary-title reviews** give the game scoreboards besides GDP. They put real pressure on illegal housing, informality and safety.

**Non-goals:**
- a bureaucracy of bureaus;
- playable real people;
- simulating elections or inner-party procedure.

---

## 2. Leaders

### 2.1 Data
```ts
interface Leader {
  id: string; name: LocalizedString;          // fictional composite
  role: 'secretary' | 'mayor' | 'both';
  background: 'parachuted' | 'local' | 'technocrat' | 'military' | 'enterprise';
  traits: TraitId[];                          // 2–3
  mandate: MandateId;                         // pet project declared at inauguration
  standing: number;                           // with superiors, 0..100 (affects promotion and protection)
  rapport: number;                            // with the player-city, -100..100
  disciplineRisk: number;                     // hidden, accumulates
  termStart: YM; expectedTermMonths: number;
}
interface LeadershipState { leaders: Leader[]; synergy: number /* -100..100, pair only */; vacancy?: YM }
```

### 2.2 Roles
| Area of effect | Party Secretary | Mayor |
|---|---|---|
| How fast political capital is earned; protection in campaigns | ✔ | |
| How much grey-zone exposure is tolerated before scrutiny rises | ✔ | |
| Relations with the centre and province; who wins mega-project quotas | ✔ | |
| Building speed and cost overruns | | ✔ |
| Investor negotiations (discounts, closing probability) | | ✔ |
| Tax collection efficiency; leakage from land leases | | ✔ |
| Which industries are favoured | | ✔ |

With `role: 'both'` (一肩挑) one leader applies both columns, `synergy` has no effect, and a fall from grace removes both posts at once. One such period is reported: one leader held both posts from May 1986 (lead: corroborated only by a search summary, Appendix A ✓).

### 2.3 Rotation
- **Terms:** `expectedTermMonths` is drawn from `params.term_months` (for example 36–72). Rotation is checked in Q4 of each year.
- **Early removal:** a fall from grace (§2.6), or promotion when `standing` is high.
- **The replacement** is drawn from a pool weighted by the national climate. A conservative wind favours cautious, parachuted and technocrat profiles.
- **Historical mode** may pin the *profile* of a leader for set periods, such as "a reformist from the centre, 1985", from sourced research. Names and personal details stay fictional.

### 2.4 Traits (examples; all numbers are starting parameters)
| Trait | Gain | Cost |
|---|---|---|
| **Deal-maker (政商通吃)** | +investor closing chance; faster land clearance | Offers shortcuts (§2.5). Accepting one: lease prices discounted ⇒ less land revenue, and disciplineRisk +r |
| **Infrastructure patron (大干快上)** | −construction time; easier credit | +cost overruns; +accident and collapse probability |
| **Parachuted cadre (空降干部)** | +protection; +mega-project quotas | −chance of agreement with villages; more holdouts |
| **Local networker (本土派)** | Better rapport with Hong Kong and villages; fewer holdouts | −protection when a campaign starts |
| **Clean technocrat (学者型)** | No leakage; bonus in inspections | Refuses grey-zone policies; slower deals |
| **Ideologue (cautious)** | −scrutiny gain | Grey policies need extra political capital |

The traits apply as modifiers in the systems that own each effect. The leadership system only exposes `modifier(effectId)`.

### 2.5 Mandates and briefings
- **The mandate** comes from a pool: win a named title; build a flagship CBD; open a port; hit an export target; clear a named urban village. Each has a deadline (the term) and a reward or penalty to `rapport` and `standing`.
- **Prestige projects (政绩工程)** make up part of the pool: a showcase boulevard, a plaza, a convention centre. They are fiscal projects with a large budget, and when finished they create permanent `maintenance` and `payroll` obligations (fiscal-and-macro §6.1). Pleasing the leader therefore eats into recurring money long after they leave.
- **Shortcuts** are cards that a leader with a corrupt-leaning trait offers: a fast-track sweetheart lease, their connected contractor for a big project, an inspection quietly buried. Accepting brings the gain now, raises `disciplineRisk`, and records the decision as *entangled* with that leader. Declining keeps the risk low, at the cost of a slower deal and lower `rapport`.
- **Briefings** are cards:
  - an inauguration (mandate and asks);
  - the annual budget (Q1: the leaders push their priorities);
  - a crisis (choosing the response);
  - a lobbying trip (spend political capital for a permission or quota, with the odds set by the Secretary's standing).
- **Friction** in a pair: when the leaders' preferences conflict on a decision, it is **delayed** one quarter unless the player spends political capital or accepts a rapport cost with one of them. `synergy` changes after each conflict.

### 2.6 Discipline risk and falls from grace (落马)
```
disciplineRisk += Σ accepted shortcuts × weight[shortcut]      // the main driver: the player's choices
               + drift[trait]                                 // small, bounded background from the leader's own conduct
p_trip(month) = sigmoid(k × (disciplineRisk − threshold)) × campaign_multiplier × disaster_multiplier
```
**When it trips:**
- the leader is removed and put under investigation;
- the projects they championed **freeze** for 1–2 quarters;
- `scrutiny` spikes;
- a cautious replacement arrives;
- if a review window is open, the title-review veto `leader_corruption` fires **only when the case touches a decision the player accepted** (an entangled shortcut). Otherwise the review only takes a scrutiny penalty.

With few accepted shortcuts, a fall is rare and costs little. 落马 becomes the price of a risk the player chose, not bad luck. All of this is fiction, attached only to fictional leaders (`PLAN.md` §11).

---

## 3. Annual performance reviews
- **When:** Q4 each year, plus a summary every five-year plan.
- **Targets** come from `content/targets/<era>.yaml`, a weighted set such as:
  - 1980s: exports, foreign investment used, forex earned, infrastructure built;
  - 1990s: GDP growth (real), fiscal contribution, stability;
  - 2000s: plus safety, environment and "quality" indicators.

  The era framing is **lead**. The target lists need sources (directives, work reports) before Historical mode relies on them.
- **Score** = Σ weight × clamp(actual / target). The result adjusts political capital, leader `standing`, `scrutiny` and the escalating powers (§3.8 of PLAN).

---

## 4. Honorary-title reviews

### 4.1 Lifecycle
```
locked ──(era and eligibility)──► eligible ──(player declares)──► campaigning ──► inspection ──► held ──► re-review … ──► delisted
                                                                      ╲──────────────────────────► failed (cooldown)
```
```ts
interface TitleReviewState { id: string;
  status: 'locked'|'eligible'|'campaigning'|'inspection'|'held'|'delisted'|'failed';
  composite: number; vetoesInWindow: string[]; nextInspection?: YM; cooldownUntil?: YM; }
```
- **Declaring** a campaign costs political capital and commits campaign obligations, such as sanitation staff and public works.
- **Inspection** combines a scheduled visit (announced) with random **unannounced inspection teams (暗访组)**.
- **A held title** is re-inspected on a cycle. It can be delisted (摘牌).

### 4.2 Titles (era and status per the evidence protocol)
| Title | Unlocks | Indicator groups | Historical status |
|---|---|---|---|
| National Sanitary City (国家卫生城市) | Early 1990s | Sanitation and waste capacity, sewage, wet markets, street vendors, epidemic readiness, hygiene in urban villages | Shenzhen's year is a **lead** |
| National Environmental Protection Model City (国家环境保护模范城市) | Late 1990s | River and air quality, separation of industry, green space, dirty processing in the core | **Lead** (1997, first batch?) |
| National Civilized City (全国文明城市) | 2005 | Illegal building share, vice and crime, traffic and street order, cultural facilities, migrant stability, safety | Shenzhen was in the first batch in 2005 (search summary; to source) |
| Optional: Garden City, public security, work-safety audits | Various | — | Lead |

### 4.3 Scoring
```
indicator_score_i = clamp((value_i − floor_i) / (target_i − floor_i), 0, 1)
composite = Σ w_i × indicator_score_i
pass = composite ≥ pass_mark  AND  all hard thresholds met  AND  no veto in window
```
- **Direction convention:** `floor` is the value that scores 0 and `target` is the value that scores 1. When `floor > target`, lower is better (for example illegal floor share, or a crime index). There is no `invert` flag, and the validator rejects `floor == target`.
- **Hard thresholds** apply to specific indicators, such as a maximum *visible* illegal floor share or a minimum sewage coverage.
- **Vetoes (一票否决)** fire within the review window:
  - a catastrophic fire (from the disaster system, for example three-in-one buildings);
  - a major mass incident;
  - an epidemic cover-up;
  - `leader_corruption`, only when entangled with a player decision (§2.6).

  The concept, and which vetoes applied historically, are **lead**.
- **Inspectors see visible values** only. Real values and visible values differ when the player uses cleanup campaigns (§4.4).

### 4.4 Real investment vs cleanup campaigns
| Action | Effect on real values | Effect on visible values | Side effects |
|---|---|---|---|
| **Real investment** (sewers and clinics in urban villages, formal markets, public housing, enforced codes) | Lasting improvement | Same as the real values | Obligations and money for projects (fiscal-and-macro); slower growth |
| **Cleanup campaign** (sweeping vendors, painting facades, temporarily closing workshops) | None, or a temporary dip in informal income | Better for `campaign_months` (2–3), then decays back month by month | Migrant mood −; informal GDP −; `facade` alterations recorded on buildings |

**Detection by an unannounced team:**
```
p_caught = base_p × (visible − real gap) × (1 − leader inspection bonus)
```
If caught, the review fails, scrutiny rises, and leader `standing` falls.

### 4.5 Rewards and penalties
- **Pass:** political capital, leader `standing`, and investor appeal for HQ and high-tech investors (a modifier in the investor generator).
- **Fail:** a cooldown before the next try, plus a loss of political capital.
- **Delisted:** a heavy penalty to political capital and leverage, a scrutiny spike, and a leader `standing` drop.

---

## 5. Content files
```
content/leaders/traits.yaml       # trait id → modifiers by effectId
content/leaders/mandates.yaml     # mandate pool with conditions, deadlines, rewards
content/leaders/profiles.yaml     # historical-mode profile pins (sourced research; fictional names)
content/targets/<era>.yaml        # annual performance-review targets
content/reviews/<title>.yaml      # unlock conditions, indicators, thresholds, vetoes, cycle, rewards
```
Example:
```yaml
id: national_civilized_city
unlock: { date_gte: 2005-01, requires_title: national_sanitary_city }
indicators:
  - { id: illegal_floor_share_visible, floor: 0.40, target: 0.15, weight: 0.2, hard_max: 0.30 }
  - { id: sewage_coverage, floor: 0.5, target: 0.9, weight: 0.15 }
  - { id: crime_rate_index, floor: 1.5, target: 0.8, weight: 0.15 }   # floor > target: lower is better
vetoes: [catastrophic_fire, mass_incident, epidemic_coverup, leader_corruption]
inspection: { scheduled: Q4, unannounced_per_year: 2, cycle_years: 3 }
claims: []   # claim ids from data/evidence/claims/; none yet (the era and indicators are lead)
# the compiler keeps this title out of Historical mode until its claims meet the minimum status (evidence protocol §4)
```

---

## 6. Invariants and tests
- **Never more than one** secretary and one mayor at a time, or exactly one `both`.
- **A vacancy** never lasts more than `params.max_vacancy_months`.
- **Pure modifiers:** a trait modifier applies only through `modifier(effectId)`, so systems never read traits directly.
- **The veto works:** any veto in the window makes `pass = false`, whatever the composite score is.
- **Direction:** an indicator with `floor > target` scores 1 at or below the target and 0 at or above the floor.
- **Agency:** a player who accepts no shortcuts never triggers the `leader_corruption` veto.
- **One time scale:** every duration is in months, quarters or years, never weeks.
- **Cleanups are cosmetic:** a cleanup campaign never changes real indicator values, only visible ones.
- **Deterministic:** the same seed and the same actions give the same leaders, rotations, trips and inspection results.

## 7. Phase 1 subset
- **One Secretary–Mayor pair**, with no rotation inside the slice period (or one scripted rotation).
- **Traits:** one perk and one corruption trade-off (deal-maker), with one shortcut card.
- **A mandate:** "open the first export processing zone".
- **One early review target:** an export and forex quota plus a basic sanitation and order check, inspected yearly and including one unannounced team.
- **One cleanup campaign (§4.4):** the pre-inspection sweep (突击整治) card in Q4. Its visible values, real values and `p_caught` are exactly as in §4.4. The only visible value it improves is the illegal-floor share.
- **Not yet:** the full title lifecycle (Phase 2 brings Sanitary City).

## 8. Open questions
- Whether leaders can ever refuse a player action outright, or only delay it and make it more expensive. The default is delay plus cost.
- How visible to make `disciplineRisk`: hidden, or hinted through rumours and vignettes. The default is hinted.
- The sources for which review indicators and vetoes applied historically in each campaign.
