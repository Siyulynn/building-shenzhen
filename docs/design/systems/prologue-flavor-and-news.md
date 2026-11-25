# The guided prologue: beats, voice and the news layer (R9) / 引导序章：节拍、语气与消息层

Status: **research and design proposal, 2026-11-25. No code, no content records yet.** This note answers
the R9 questions in `docs/design/phase1-revision-plan.md` §4 and proposes the political-weather layer that
the plan leaves open. The evidence is in `docs/research/phase1-political-calendar.md`; the claims are in
`data/evidence/claims/phase1_political_calendar.yaml`.

Scope: the playable slice, 1979-Q1 to 1984-Q1. No 3D, no archival tooling, no new simulation system. The
news layer is presentation plus, at most, a weather value read by existing steps.

---

## 0. The answer in one page

**Do the seven beats make narrative sense?** Yes, as a tutorial. Each quarter teaches one tool and the
SEZ is a real deadline. But four beats do not match the record cleanly:

1. **The institution is wrong by one step.** In March 1979 the city is governed by a **市革命委员会**, not
   a municipal people's government. The people's government arrives only in October–December 1981. The
   opening should use the committee, and the 1981 change of form should become a beat. The player is not a
   mayor in 1979.
2. **The Q1 1979 "first project toward Luohu" is a design device, not a documented decision.** Keep it, but
   frame it as the city's own survey and preparation. The documented Luohu works are the 1980 formation
   package and the Construction Bank loan, not a Q1 1979 road-or-water choice.
3. **The 1980-Q1 co-financing "Hong Kong investor builds a power line" is not the documented story.** The
   documented 1980 story is the Luohu 0.8 km² formation package and the ¥30m loan. Re-theme the
   co-financed order to site formation/roads, or keep a substation but label it a composite.
4. **The Q3 1979 "permit regime" is anachronistic as a city choice.** The 暂住证 rules are 1983. In 1979 the
   real issue is how strictly the city applies the provincial border and residence rules to the inflow of
   builders and would-be migrants. Reframe the card; keep the 1983 card as the formal rules.

**What is missing?** The political weather from 1981 to 1983. R9 jumps from the SEZ (1980-Q3) to the visit
(1984-Q1) with only the budget, the sweep and a few anchors. The zone's actual history in those years is a
fight over whether it is a concession, a smuggling channel or a model. That fight is the best material in
the slice, and it is exactly what the brief's 1982 《上海租界的由来》 instinct points at.

**What to add?** A **news layer**: one short item a quarter, no card, no pause, shown in the briefing.
Twenty-four entries cover 1979-Q1 to 1984-Q1. Nine carry a weather value between -2 and +2; the rest are
neutral. Two are decisions. The rest are colour. The player is not asked to attend every plenum.

**What to keep?** The corps beat, the first contract, the readiness device and the SEZ date are sound. The
corps beat is the strongest: the record actually has November–December 1979 arrivals, bamboo shelters at
Caiwuwei and Sungang, and supply difficulties.

---

## 1. Beat by beat

| Turn | R9 beat | What the record supports | Verdict | Fix |
|---|---|---|---|---|
| 1979-Q1 | Meet the pair; where does the first work go? Zones, roads. | Provincial decision 1979-01-23 (internal); State Council reply 1979-03-05; city under a **市革命委员会**; no documented "first project" decision in Q1; the Luohu package is 1980. | **Keep, reframe.** | Open with the reply and the committee. Make the first work a survey/preparation on the map, not a funded M4 project. Save the Luohu package for 1980-Q1/Q3. |
| 1979-Q2 | The first processing contract. | 1979 saw 133 三来一补 agreements citywide (`phase1.investment.city.processing_agreements.1979`, a retrospective); earlier pilots existed outside the city (a lead); the Shekou HQ is April. | **Keep, retitle.** | "A first processing contract" / "第一单来料加工", explicitly the player's, not the city's. Pair with the Shekou HQ anchor. |
| 1979-Q3 | The permit regime. | Document 50 (July); Shekou's first blast (July); the 1979 outflow (the escapes claim is a lead, `phase1.event.escapes_1979`); the 暂住证 rules are 1983-07. | **Reframe.** | The card is "how strictly do we apply the province's border and residence rules to the people arriving", not "we invent a permit regime". The 1983 card becomes the formal rules. |
| 1979-Q4 | The construction corps. | Nov–Dec 1979 arrivals; Caiwuwei and Sungang; bamboo shelters; vegetable and drainage difficulties. | **Keep — strongest beat.** | Bamboo shelters are the documented default; quarters are the counterfactual. Do not imply the city built quarters historically. Keep the first lightweight review as a design device. |
| 1980-Q1 | Co-financing: loan + a Hong Kong investor's power line. | Luohu 0.8 km² formation package, ~¥70m, ¥30m Construction Bank loan (July 1980 context; `phase1.fiscal.luohu.site_servicing_estimate.1980`, `phase1.fiscal.luohu.ccb_project_loan`); East Lake Garden (Dec 1979/Jan 1980); no documented HK-financed power line. | **Re-theme.** | Co-finance **site formation/roads** (the documented package), or a substation labelled a composite. Move the loan/package to 1980-Q3, or frame Q1 as the negotiation and Q3 as the close. |
| 1980-Q2 | The readiness check. | No such report; the SEZ is approved 1980-08-26; works continue after. | **Keep as a city device.** | Phrase it as the city's own readiness review before the zone opens, not a historical document or a hard historical deadline. |
| 1980-Q3 | The SEZ. | NPC approval 1980-08-26; the 1981 minutes define a **comprehensive** zone; land-use fees from 1982-01; the first auction is outside the slice. | **Keep, fix the unlocks.** | Unlock negotiated land-use certificates at the SEZ; unlock the fee schedule/lease at 1982-01. Do not present the three priorities as a historical choice. High intensity is a game abstraction. |

### 1.1 The three structural problems

**A. The office, not just the label.** The plan says "municipal government" and "Secretary and Mayor".
The record says 市革命委员会 until late 1981. This is not a pedantic point: the committee form explains
why the city can move so fast and why its authority is provisional. The opening letter should be from the
committee. The 1981-10 establishment of the people's government is a satisfying institutional beat, and it
costs one news item.

**B. The first project is doing two jobs.** R9 uses Q1 1979 to teach zoning and roads, and it uses the
"first project" card to give the player a goal. Historically, the big Luohu works are a 1980 story, and the
Q1 1979 city is still assembling its organs. Split the jobs: Q1 1979 is the survey and the first zone/road
(the tutorial); 1980-Q1 is the loan, the package and the first big obligation (the history). The player
then feels the difference between "we chose a site" and "we borrowed ¥30m to form it".

**C. The political weather is missing.** The zone's early years are not a smooth build-out. They are a
fight: 1981 "not a political special zone"; 1982 "is this a concession?"; the anti-smuggling campaign; the
1982 new Document 50; 1983 "new things, new methods"; 1983 rectification. A city-builder that omits this
turns the most distinctive thing about Shenzhen into a generic land-and-power game. The news layer fixes
that without turning the game into a politics simulator.

### 1.2 What to keep, and why

- **The corps beat.** It is the best-documented prologue event and it teaches housing, provisioning and
  construction capacity in one go. Keep the quarter (1979-Q4) and the choice. Make the bamboo shelters the
  default and the quarters the expensive, orderly alternative.
- **The first contract.** It teaches gross exports, the processing fee, the forex quota and the difference
  between an order and a factory. Keep it, but stop calling it the city's first.
- **The readiness check.** It is a good teaching device: roads, formed land, water and power, weakest link.
  Keep it as the city's own review, and let the 1980-08 SEZ card read the bar.
- **The SEZ date.** 1980-08-26 is right. The card's three priorities are a design choice; the historical
  zone was comprehensive, so the choice should be framed as "what do we push first", not "what is the zone".

---

## 2. The news layer

### 2.1 Why a separate layer

The current event system raises a **card** for every event with a `card` block. A card pauses the quarter
if it interrupts, and it competes for attention with the prologue's real decisions. If we put twenty
political items on cards, the player will drown, and the prologue's one-beat-per-quarter discipline will
collapse.

So: a new event family, **`news`**, with **no card**. It fires once, is recorded in `events.fired` like any
other event, and the briefing renders it in a "From Beijing / From the province / From the city" section.
It never pauses the turn. It has no options. The player reads it, or does not, and continues.

This is the difference between **weather** and **decisions**. Weather is what makes the world feel
historical; decisions are what the player does about it. The 1982 concession storm is the one item that
crosses from weather into a decision, because it directly asks the city to answer.

### 2.2 The shape of a news record

Proposed content shape (the spec change is in §2.5):

```yaml
- id: news.1982q1.concession_material
  family: news
  name: { zh: 旧中国租界的由来, en: "The origin of the old concessions" }
  trigger: { date: 1982-02 }
  news:
    desk: beijing          # beijing | province | city | hong_kong
    tone: warning          # opening | warning | relief | texture
    weather: -2            # optional, -2..+2; read by the investor and scrutiny steps
  text:
    zh: "一份关于旧中国租界的材料在各省市传阅。陈云同志批示：对于办经济特区，要警惕这类问题。"
    en: "A compilation on the old foreign concessions is circulating among the provinces. Chen Yun's instruction: in special-zone work, be on guard against this kind of problem."
  claims:
    - { id: phase1.politics.concession_material_1982, use: encyclopedia }
    - { id: phase1.politics.chenyun_concession_warning_1982, use: encyclopedia }
```

Rules:

- **One lead item per quarter.** The briefing shows the lead in full and up to two one-line items under
  it. That is the anti-bombardment rule.
- **No numbers the sim owns.** A news item may say "the census has been taken", not "351,883 people". The
  sim's population is the sim's; a historical figure would either contradict it or become a target.
- **No invented quotations.** The text paraphrases; it does not put words in a named person's mouth. Where
  a quotation is used, it is the documented one and it is short.
- **Every historical sentence cites a claim** in `claims:`. Use `use: encyclopedia` for the text, because
  the protocol requires `sourced` for flavour and `encyclopedia` is the use with that minimum. Use
  `design_note` only for the design framing, never for a fact.
- **The desk is visible.** "北京", "省委", "本市", "香港" tells the player where the news comes from. It also
  keeps the player from reading a national line as a local instruction.
- **No card, no lapse, no pause.** A news item cannot fail, be declined or be missed.

### 2.3 The weather value

The minimal mechanical hook, for later:

- `weather` is a number -2..+2 carried by the news record.
- The investor arrival step reads the sum of the weather values of the **last four quarters** (a simple
  moving window, no new state beyond `events.fired`, which already stores dates) and shifts the arrival
  probability or the card count by a small amount.
- The scrutiny step reads the same window for its decay or gain.
- The briefing shows the current weather as a word, not a number: "Open", "Watchful", "Cold", "Thaw".

This is deliberately thin. It does **not** model factions, elite politics, or a response tree. The brief
said the detailed politics can come later; this is the smallest hook that makes the news matter without
promising a system we have not designed.

If even that is too much for R9, ship the news as pure presentation first and add `weather` in a later
pass. The content records do not change.

### 2.4 Where it appears

The briefing (`apps/slice-ui/src/views.ts` `briefing()`) already renders a table of indicators. Add a
section above or below it:

```
From Beijing
  《旧中国租界的由来》 circulated at the two-province forum. Chen Yun: "be on guard against this kind of problem."
From the province
  The zone people's government is established; the revolutionary committee is abolished.
From the city
  East Lake Garden's first 108 flats sold in Hong Kong in three days.
```

The briefing is already the screen that opens at the start of a turn, so the news arrives where the player
already looks. No new modal, no new button, no interruption.

### 2.5 The spec change

Add to `phase1-slice.md` §5.8 (and the event compiler):

- `family` gains `news`.
- A `news` record requires `news: { desk, tone, weather? }`, `text: { zh, en }` and at least one claim.
- It has no `card`, no `on_answer`, no `effects`. The `effects` field is absent or empty.
- The trigger is `date` or `month_of_year`; no hazard, because news is not random.
- The save header's `events_sha256` covers it as usual. `events.fired` records it.
- The compiler validates the desk and tone enums and rejects a news record with a card or an effect.

This is a small, testable addition. It does not touch the sim's state beyond `events.fired`.

---

## 3. The voice

### 3.1 The device: two letters, two voices

The opening should not be a tutorial pop-up. It should be a **handover**: the province assigns the comrade,
and the outgoing county office leaves a note. The first voice is formal and a little grand; the second is
practical, wry and specific. Between them they teach the three things the first turn needs: you are in a new
city, the map is your instrument, and the money is short.

The letters are **fiction** and should be labelled as such in the codex. The facts they carry (the March
reply, the committee form, the provincial grant, the export-base language) are cited.

### 3.2 The opening letter (draft)

**Chinese:**

> **【省委组织部介绍信】**
>
> 兹介绍×××同志前往深圳市革命委员会工作。该同志政治可靠，熟悉财经与城建，请予接洽。
>
> 深圳市系新设省辖市，任务繁重。望到职后，依靠市委领导，团结原有干部，先把情况摸清，再定章程。
>
> 此致
> 革命敬礼
>
> 中共广东省委组织部
> 一九七九年三月

> **【市革委会办公室便笺】**
>
> 同志：
>
> 县里的印封了，市里的印还没刻好。你先用这张便条。
>
> 省里让我们先按“出口基地”做方案。“特区”这个名字，等北京定了再说，先不要对外讲。
>
> 眼下三件事：
>
> 一、把地图挂起来。罗湖、上步、深圳墟，哪块地是谁的，哪条路通哪里，先弄清楚。
> 二、选一块能开工的地。不要贪大，先把水、电、路通到地边。
> 三、账上只有省里的补助，没有余钱。花每一笔，都要想着明年省里少给怎么办。
>
> 饭堂在楼下，饭票自理。
>
> 此致
> 革命敬礼
>
> 市革委会办公室
> 一九七九年三月

**English:**

> **[Provincial Organization Department]**
>
> Comrade ××× is assigned to the Shenzhen Municipal Revolutionary Committee. Politically reliable, with
> experience in finance and construction. Please receive him.
>
> Shenzhen is a newly established provincial municipality with heavy duties. On arrival, work under the
> Municipal Party Committee, respect the cadres already here, and understand conditions before setting
> rules.
>
> With revolutionary greetings,
>
> Organization Department, CPC Guangdong Provincial Committee
> March 1979

> **[Note from the Municipal Revolutionary Committee office]**
>
> Comrade:
>
> The county seal is sealed up; the city's seal is not yet cut. Use this note for now.
>
> The province wants us to plan on the basis of an “export base”. The name “special zone” will wait for
> Beijing. Do not use it in public yet.
>
> Three things for now:
>
> 1. Hang the map. Find out who holds each plot in Luohu, Shangbu and the old market, and which road goes
>    where.
> 2. Choose one piece of land you can actually start on. Do not be ambitious: get water, power and road to
>    its edge first.
> 3. The account holds the provincial grant and little else. For every yuan you spend, ask what happens
>    when the grant is smaller next year.
>
> The canteen is downstairs. Meal tickets are your own.
>
> With revolutionary greetings,
>
> Office of the Municipal Revolutionary Committee
> March 1979

### 3.3 Why this teaches without a tutorial

- **"The seal is not cut yet"** says "new institution, incomplete capacity" better than a tooltip.
- **"Hang the map"** points at the map-first loop without naming a button.
- **"Water, power and road to the edge"** is 三通一平 in plain language, before the term appears.
- **"What happens when the grant is smaller next year"** plants the 1983 grant cliff in the first screen.
- **"Meal tickets are your own"** is the period's bureaucracy in one line; it also keeps the tone from
  becoming a civics poster.

### 3.4 The mission cards

A few beats should read as a **dispatch** from the province or Beijing, not as a game notification. These
are drafts; the final text goes through the Pass 1 description/badge work.

**1979-Q3 — Document 50 (news, no card)**

> 四月中央工作会议上，邓小平说：中央没有钱，可以给些政策，你们自己去搞。现在省委转发了中央50号文件：广东、福建实行“特殊政策、灵活措施”；出口特区先在深圳、珠海试办。
>
> At the April central work conference Deng Xiaoping said the centre had no money to give but could give policy. Now the province has forwarded Central Document 50: Guangdong and Fujian may use special policies and flexible measures; export zones will be tried first in Shenzhen and Zhuhai.

**1981-Q3 — Document 27 (news, no card)**

> 中发27号文件到了。文件里有一句话，值得记住：“我国特区是经济特区，不是政治特区。”
>
> 文件还要深圳成立特区人民政府，恢复宝安县。你的班子要换牌子，县里的同志要回去。
>
> Central Document 27 has arrived. One sentence is worth remembering: “Our special zones are economic
> special zones, not political special zones.”
>
> The document also requires a zone people's government in Shenzhen and the restoration of Bao'an County.
> Your team will change its sign; the county comrades will go back.

**1982-Q1 — the concession storm (decision card)**

> 中央书记处开两省座谈会，印了一份材料，叫《旧中国租界的由来》。陈云同志批示：此件发全国各省市。对于办经济特区，要警惕这类问题。
>
> 省里要你们写一份总结。写什么、怎么写，北京在看。
>
> The Central Secretariat has held the two-province forum and circulated a compilation, *The Origin of the
> Old Foreign Concessions*. Chen Yun's instruction: send it to every province; in special-zone work, be on
> guard against this kind of problem.
>
> The province wants your summary. What you write, and how, is being read in Beijing.

Proposed options (effects are for the later politics pass, not now):

- **如实写** / *Write it honestly*: the achievements and the problems. Scrutiny falls a little; standing
  holds; no investor boost.
- **公开反驳** / *Answer in public*: reject the concession analogy. Standing rises; scrutiny rises sharply;
  investors are reassured for a quarter.
- **只报数字** / *Send numbers only*: no argument, no confession. Scrutiny rises a little; standing falls.

The card should not pretend the player can settle the argument. It can only choose a posture. That is the
honest scale of a municipal government in 1982. The public-rebuttal option is a game counterfactual: the
historical city answered through its summary, not through a public polemic.

**1982-Q4 — the storm passes (news, no card)**

> 陈云同志看了广东的总结，批示：特区要办，必须不断总结经验，力求使特区办好。
>
> 十二月，中央发了新的50号文件：特区要有更多的自主权。
>
> Chen Yun has read Guangdong's summary and written that the zone must be run, with experience constantly
> summed up.
>
> In December a new Document 50 gives the zones more autonomy.

**1983-Q1 — Hu Yaobang (news, no card)**

> 胡耀邦同志视察深圳，题词：新事新办，特事特办，立场不变，方法全新。此行不作公开报道。
>
> Hu Yaobang has visited Shenzhen and written: new things handled in new ways, special things handled
> specially, the stand unchanged, the methods wholly new. The trip is not being publicly reported.

**1983-Q4 — the plenum (decision card)**

> 十二届二中全会决定整党。邓小平同志说，思想战线不能搞精神污染。省里要你们组织学习。
>
> The second plenum has decided to rectify the party. Deng Xiaoping says the ideological front must not
> produce spiritual pollution. The province wants you to organise the study.

Proposed options:

- **按规定学习** / *Follow the schedule*: a small scrutiny gain, no mood hit.
- **从严检查** / *Check strictly*: scrutiny falls, migrant mood and investor confidence fall.
- **只传达** / *Transmit only*: scrutiny rises, standing falls.

Again, the detailed effects wait. The card's job in R9 is to show that the weather reaches the city.

**1984-Q1 — the visit (existing closing card)**

Keep the closing card as it is, but add one line of framing to the verdict: the visit is 24–26 January;
the inscription is written in Guangzhou on 1 February and dated 26 January. The slice ends with the visit,
not with the inscription. The inscription belongs in the verdict's coda, as a documented outcome the player
did not live through.

---

## 4. The calendar

Twenty-four entries. **Desk** is where the player reads it. **Type** is `news` unless marked `decision`.
**W** is the optional weather value. The last column is the claim(s) the text cites; all are in
`phase1_political_calendar.yaml` unless marked *existing*.

| Turn | ID | Desk | Type | W | What the player reads (English; the Chinese is in the content record) | Claims |
|---|---|---|---|---|---|---|
| 1979-Q1 | `news.1979q1.city_reply` | province | news | 0 | The 5 March reply: Bao'an is now Shenzhen City; the municipal revolutionary committee sits at Shenzhen. | `city_reply_1979`, `province_decision_1979` |
| 1979-Q2 | `news.1979q2.zone_name` | beijing | news | +1 | The April work conference: Guangdong asks for authority; Deng says "call it a special zone". The name is in use before the document. | `central_work_conference_1979` |
| 1979-Q3 | `news.1979q3.document_50` | province | news | +1 | Document 50: special policies and flexible measures; export zones first in Shenzhen and Zhuhai. | `special_policies_1979` |
| 1979-Q3 | `news.1979q3.organs` | city | news | 0 | Sixty-one municipal organs, twelve more than the county. | `city_organs_1979` |
| 1979-Q4 | `news.1979q4.provincial_city` | province | news | +1 | Shenzhen becomes a prefecture-level provincial city; plans come straight from the province from 1 January. | `provincial_city_1979` |
| 1980-Q1 | `news.1980q1.east_lake` | city | news | 0 | East Lake Garden: land for capital, 85:15, 108 flats sold in Hong Kong in three days. Some call it renting land to capitalists. | `donghu_liyuan_contract_1979`, `donghu_liyuan_sales_1980` |
| 1980-Q2 | `news.1980q2.build_shenzhen_first` | beijing | news | +1 | The centre approves the two-province minutes: build Shenzhen first; "export zone" becomes "special economic zone". | `shenzhen_first_1980`, `sez_market_1980` |
| 1980-Q4 | `news.1980q4.newspaper_decision` | city | news | 0 | The Municipal Party Committee decides the city needs its own paper; it will be printed in Hong Kong. | `sztqb_decision_1980` |
| 1981-Q1 | `news.1981q1.shekou_slogan` | city | news | 0 | Shekou puts up "Time is money, efficiency is life"; some call it capitalist; the board comes down. | `shekou_slogan_1981`, `shekou_slogan_sign_1981` |
| 1981-Q2 | `news.1981q2.newspaper_trial` | city | news | 0 | The Shenzhen Special Zone Daily publishes a trial issue: red masthead, front-page advertising. | `sztqb_trial_1981` |
| 1981-Q3 | `news.1981q3.document_27` | beijing | news | +1 | Document 27: the zones are economic, not political, special zones; a zone government and Bao'an's restoration. | `sez_not_concession_1981`, `sez_government_1981` |
| 1981-Q4 | `news.1981q4.government` | city | news | 0 | The zone people's government is established; the revolutionary committee is abolished; the name becomes 深圳市人民政府 in December. | `sez_government_1981_10`, `sz_gov_rename_1981_12` |
| 1981-Q4 | `news.1981q4.chenyun` | beijing | news | -1 | Chen Yun: the zones' first task is to sum up experience; only these few for now. | `chenyun_summary_1981` |
| 1982-Q1 | `event.1982q1.concession_storm` | beijing | **decision** | — | The two-province forum; the concession compilation; Chen Yun's warning; the province wants a summary. | `smuggling_notice_1982`, `concession_material_1982`, `chenyun_concession_warning_1982`, `two_provinces_meeting_1982` |
| 1982-Q2 | `news.1982q2.economic_crime` | beijing | news | 0 | The decision against serious economic crime: the open policy is unchanged, planning remains primary. | `economic_crime_1982`, `open_door_unchanged_1982` |
| 1982-Q2 | `news.1982q2.newspaper_launch` | city | news | 0 | The Special Zone Daily is formally launched. | `sztqb_founded_1982` |
| 1982-Q3 | `news.1982q3.census` | city | news | 0 | The national census is taken; the city learns how many people it has. | `census_1982`, `census_total_1982` (context only) |
| 1982-Q3 | `news.1982q3.congress` | beijing | news | 0 | The Twelfth Congress: "socialism with Chinese characteristics"; quadruple output by the century's end. | `12th_congress_1982`, `output_target_1982` |
| 1982-Q4 | `news.1982q4.storm_passes` | beijing | news | +2 | Chen Yun approves the summary; the new Document 50 gives the zones more autonomy. | `chenyun_summary_1982`, `new_50_1982`, `sez_comprehensive_1982` |
| 1983-Q1 | `news.1983q1.hu_visit` | beijing | news | +1 | Hu Yaobang's visit and inscription; no public report. | `hu_yaobang_1983` |
| 1983-Q2 | `news.1983q2.deng_relay` | beijing | news | 0 | Gu Mu relays Deng: the zones are doing well, recognised at home and abroad, not to be wiped out. | `deng_via_gumu_1983` |
| 1983-Q3 | `news.1983q3.strike_hard` | beijing | news | 0 | The three-year campaign against serious crime. | `strike_hard_1983` |
| 1983-Q3 | `news.1983q3.university` | city | news | 0 | Shenzhen University opens: 216 students, four departments, a campus still building. | `szu_opens_1983` |
| 1983-Q4 | `event.1983q4.rectification` | beijing | **decision** | 0 | The plenum: rectify the party; no spiritual pollution on the ideological front. | `rectification_1983`, `spiritual_pollution_1983` |

The existing cards still fire in their quarters: the first contract (1979-Q2), the permit choice
(1979-Q3), the corps (1979-Q4), the budget/co-financing (1980-Q1), the readiness check (1980-Q2), the SEZ
(1980-Q3), the budget/sweep/reviews, the 1981-01 Bamboo Garden, the 1982-01 land rules, the 1982-06 second
line, the 1982-09 corps deployment, the 1983-07 residence rules, and the 1984-01 visit. The news layer is
additive; it does not replace them.

Claim ids in the table are shortened for width; the full ids are `phase1.politics.<id>` or
`phase1.local.<id>` as they appear in `data/evidence/claims/phase1_political_calendar.yaml`.

The 1982-Q1 decision is paired with `news.1982q1.concession_material`, which carries the -2 weather value; the
card itself chooses the response. The 1983-Q4 decision carries its own effects and no weather value.

### 4.1 What the player actually sees in a quarter

A typical quarter's briefing:

```
From Beijing
  The Twelfth Congress has opened. Deng Xiaoping says China will take its own road and build
  socialism with Chinese characteristics. The report sets a target of quadrupling output by the
  end of the century.

From the city
  The national census has been taken. For the first time Shenzhen knows how many people it
  actually has.

[the usual indicators table]
```

A crisis quarter:

```
From Beijing
  The Central Secretariat has held the two-province forum and circulated a compilation on the
  old foreign concessions. Chen Yun's instruction: send it to every province; in special-zone
  work, be on guard against this kind of problem.
  The province wants your summary. What you write, and how, is being read in Beijing.

[one decision card: Write it honestly / Answer in public / Send numbers only]
```

That is the whole design: one lead item, at most two one-liners, and a card only when the player can
actually do something.

---

## 5. What was dropped, and why

The full reasoning is in `docs/research/phase1-political-calendar.md` §5. The short version:

| Dropped | Why |
|---|---|
| The 1980-09 NPC session (Hua Guofeng resigns as premier) | A national leadership change; no zone decision. Background at most. |
| The 1981-06 Sixth Plenum and the Resolution on Party History | It settles the post-Mao legitimacy question, which helps the zone, but the player cannot act on it. Background. |
| The 1981-03 deputy-provincial status | Tier-E sources only. Do not use. |
| The April–May 1982 Beijing meeting on the "too big" plan | A memoir lead; the date and speakers need the original record. Keep as a `lead`, not an event. |
| The 1982-12 constitution | Background; no zone mechanic. |
| The 1983–84 spiritual-pollution campaign as one event | It has a start, a limit and a wind-down. Use the October plenum plus a later "the line is drawn" line only if the pass needs it. |
| The 1984-03 fourteen coastal cities | After the slice. Epilogue only. |
| Every other plenum and congress | It would bury the four that change the zone's room to manoeuvre. |

The rule is not "ignore politics". It is "spend the player's attention on the politics that changes what
the city can do".

---

## 6. Implementation order (when R9 is built)

1. **Spec first.** Add the `news` family, the `news` block and the briefing section to
   `phase1-slice.md` §5.8; add the twenty-four records to the §7 content table. Update §2.1's prologue
   table with the reframed beats.
2. **Content.** Add `content/slice/news.yaml` (or `events.yaml`, if the compiler keeps one file). Each
   record cites its claims. The draft compiler tags every historical sentence `[UNVERIFIED]`.
3. **Compiler.** `family: news` is accepted; `news` records cannot have a card or effects; the desk and
   tone enums are validated; `text` has both languages; `claims` is non-empty.
4. **Briefing.** Render the lead item and up to two one-liners in the existing briefing. No new modal.
5. **Tests.** A news record fires once and is recorded; it never pauses; the briefing shows the lead and
   the one-liners; save/load keeps the news archive; the 1982 card pauses and its answer applies; a news
   record with a card or an effect fails the compiler.
6. **Weather (optional, later).** Add the four-quarter window and the investor/scrutiny hook, with a test
   that +weather raises arrivals and -weather lowers them, deterministically.

Do **not** build a faction system, a response tree or a public-opinion model in R9. The brief's "later"
is the right call.

---

## 7. Open questions

1. **Does the news layer belong in `events.yaml` or its own `news.yaml`?** One file is simpler; a separate
   file makes the card load obvious. The compiler already reads one content file, so splitting is a
   content-loader decision, not a sim one.
2. **Is `weather` worth it in R9?** It gives the news teeth, but it also adds a hidden variable. A pure
   presentation layer is defensible for the first pass; the content is the same either way.
3. **How much of the 1982 argument should the card carry?** The card can offer a posture, but it cannot
   settle the argument. The three options above are deliberately modest. A later politics pass can add
   the consequences.
4. **Do we ever name a real leader in a card?** The existing content names Deng, Chen Yun, Hu Yaobang and
   Gu Mu in quotations. That is acceptable because the quotations are documented. The player's pair stays
   fictional. Do not put invented words in a real leader's mouth.
5. **The 1981 government beat and the 1981-12 Chen Yun beat are in the same quarter.** Is that too much
   for one briefing? One is city, one is Beijing; the contrast is the point. If it reads crowded, move
   Chen Yun to 1982-Q1 as the setup for the storm.
6. **The 1982-Q2 economic-crime item and the 1982-Q2 newspaper launch are in the same quarter.** The
   newspaper is a one-liner; it should not compete with the campaign. If it does, drop the newspaper launch
   to a codex entry.

---

## 8. What a person should check first

In order:

1. The 1982 concession material's title and medium (`conflict.phase1.concession_material.1982`). This is
   the one the brief named, and the record is genuinely unsettled.
2. The East Lake Garden signing date (`conflict.phase1.donghu_liyuan.signing_date`). One day, but it
   decides whether the news item is 1979-Q4 or 1980-Q1.
3. The 1979 Document 50 text and date. The current claim rests on a provincial memoir; the document
   itself should be found.
4. The 1981-12 Chen Yun day. Month precision is enough for the news layer, but a date would let the
   briefing be sharper.
5. The 1983-02 Hu Yaobang quotation and the "no public report" detail. The quotation is well attested;
   the reporting instruction is from a journalist's memoir.
