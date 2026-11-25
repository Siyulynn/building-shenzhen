# Phase 1 political calendar, 1979–1984 / 第一阶段政治年表

Research note for the R9 guided prologue and the proposed news layer. Status: **AI extraction, 2026-11-25.**
Every claim below is `sourced`, not `verified`; a person still has to open the page and sign it off. The
claims live in `data/evidence/claims/phase1_political_calendar.yaml`; the sources in
`data/evidence/sources/phase1_political_calendar.yaml`; the two open bibliographic conflicts in
`data/evidence/conflicts/phase1_political_calendar.yaml`.

This note does three things:

1. it sets out the political spine of the slice, with the dates the record actually supports;
2. it marks the places where the current R9 beats do not match the record;
3. it selects the events worth putting in front of a player, and says what was dropped and why.

The design that uses this note is `docs/design/systems/prologue-flavor-and-news.md`.

---

## 1. The one correction that matters most

The prologue opens in March 1979 and the plan calls the player's institution "the municipal government".
That is one step too early.

- The Guangdong Provincial Party Committee decided on **1979-01-23** to replace Bao'an County with
  Shenzhen City, but announced it internally first (`phase1.politics.province_decision_1979`).
- The State Council reply of **1979-03-05** says the new city's **市革命委员会** is seated at Shenzhen
  (`phase1.politics.city_reply_1979`). It does not create a people's government.
- The city stays under a **revolutionary committee** through the prologue and into the zone's second year.
  The Shenzhen Special Economic Zone People's Government is established on **1981-10-20**, and the
  longer name is changed to **深圳市人民政府** on **1981-12-21**
  (`phase1.local.sez_government_1981_10`, `phase1.local.sz_gov_rename_1981_12`).

So the opening is not "the county's revolutionary committee has just become a municipal government".
It is "the county's revolutionary committee has become the **city's** revolutionary committee, and the
people's government is still two and a half years away." That is a better story, not a worse one: the
player spends the prologue inside a transitional institution, and the 1981 change of form is a real
institutional beat in the post-SEZ years.

This also fixes a small anachronism in the plan's "meet the Secretary and the Mayor" line. In 1979 the
city has a Party secretary and a revolutionary committee director, not a mayor. The game's pair can stay
fictional and composite (PLAN §11), but the *office* the player holds should be the committee, not a
mayoralty.

---

## 2. The national spine

Dates are the event's own date. "Decision" and "circulated" are separated where the record does.

| Date | What the record supports | Claim | Precision / caveat |
|---|---|---|---|
| 1979-04-05 to 04-28 | Central work conference. Guangdong asks for authority; Deng endorses the zone and supplies the name: "还是叫特区好，陕甘宁开始就叫特区嘛！" | `phase1.politics.central_work_conference_1979` | Month precision in the claim; conference dates from the party-history entry. |
| 1979-07-15 (circulated 07-19) | Central Document 50 gives Guangdong and Fujian "special policies and flexible measures"; export zones first in Shenzhen and Zhuhai. | `phase1.politics.special_policies_1979` | The claim uses the decision date. The source is a provincial official's memoir (tier D); find the document text before verification. |
| 1980-05-16 | Central approval of the two-province meeting minutes: "广东应首先集中力量把深圳特区建设好". The name changes from "export zone" to "special economic zone". The minutes also say "特区主要是实行市场调节". | `phase1.politics.shenzhen_first_1980`, `phase1.politics.sez_market_1980` | The minutes themselves are dated 1980-03-30; the approval is 05-16. |
| 1980-08-26 | The NPC Standing Committee approves the Guangdong SEZ regulations. | existing `phase1.event.sez_regulations` | Already the SEZ anchor. |
| 1981-07-19 | Central Document 27: "我国特区是经济特区，不是政治特区." It also requires a zone people's government and the restoration of Bao'an County. | `phase1.politics.sez_not_concession_1981`, `phase1.politics.sez_government_1981` | Meeting 1981-05-27 to 06-14; minutes 07-12; approval 07-19. |
| 1981-12 | Chen Yun at the provincial first-secretaries' forum: the zones' first task is to sum up experience; no new zones. | `phase1.politics.chenyun_summary_1981` | Month only. The day (22 December) is in memoir literature, not in this source. This is the turn in the weather. |
| 1982-01-11 | Emergency notice on cadre smuggling and corruption; Guangdong is the named channel. | `phase1.politics.smuggling_notice_1982` | Day. |
| 1982-02-11 to 02-13 | Central Secretariat two-province forum. A Secretariat research-office compilation on the old concessions is circulated; Chen Yun instructs that it go to every province and that the zones be warned. | `phase1.politics.two_provinces_meeting_1982`, `phase1.politics.concession_material_1982`, `phase1.politics.chenyun_concession_warning_1982` | The material's title, medium and date are disputed; see §4.1. |
| 1982-03-01 | The forum minutes are circulated (Central Document 17): four cardinal principles; "planned economy first, market regulation supplementary". | `phase1.politics.march_1982_circular` | Day. |
| 1982-04-13 | Decision against serious economic crime (Central Document 22). It restates planned-economy-first, and insists the open-door policy will not change. | `phase1.politics.economic_crime_1982`, `phase1.politics.open_door_unchanged_1982` | Published in People's Daily 1982-04-14. |
| 1982-09-01 to 09-11 | Twelfth Party Congress: "走自己的道路，建设有中国特色的社会主义"; the report sets the quadrupling target. | `phase1.politics.12th_congress_1982`, `phase1.politics.output_target_1982` | Opening speech and report are distinct; the page carries both. |
| 1982-10-30 | Chen Yun approves Guangdong's trial-zone summary: "特区要办，必须不断总结经验，力求使特区办好." | `phase1.politics.chenyun_summary_1982` | Day. The signal that the storm will not end the zone. |
| 1982-12-03 | "New Document 50": the only central document devoted wholly to the zones in the 1980s. More autonomy; Shenzhen and Zhuhai are comprehensive zones. | `phase1.politics.new_50_1982`, `phase1.politics.sez_comprehensive_1982` | Minutes dated 1982-11-15; approval 12-03. |
| 1983-02-07 to 02-09 | Hu Yaobang visits Shenzhen. At the 02-08 briefing: "新事新办、特事特办、立场不变、方法全新." The trip is not publicly reported at the time. | `phase1.politics.hu_yaobang_1983` | Day for the quotation; visit dates from the same account. |
| 1983-06-25 | Gu Mu relays Deng's view: the zones "现在办得不错，中外承认，不存在抹掉不干的问题." | `phase1.politics.deng_via_gumu_1983` | Day; relayed quotation, not a direct Deng text. |
| 1983-08-25 | Decision on striking hard at serious crime: three campaigns, "从重从快，一网打尽". | `phase1.politics.strike_hard_1983` | Day. Distinct from the 1982 economic-crime campaign. |
| 1983-10-11 to 10-12 | Twelfth Central Committee, second plenum: the decision to rectify the party; Deng says the ideological front must not produce "spiritual pollution". | `phase1.politics.rectification_1983`, `phase1.politics.spiritual_pollution_1983` | Plenum dates. The campaign that followed was wound down in early 1984; do not collapse it into one day. |
| 1984-01-24 to 01-26 | Deng's first inspection of Shenzhen. He visits the International Commercial Building, Shangbu, Yumin, Shekou; he does not pronounce on the spot. The inscription is written in Guangzhou on 02-01 but dated 01-26. | existing `phase1.event.deng_first_visit` | The slice ends with the visit, not the inscription. |

---

## 3. The local spine

| Date | What the record supports | Claim | Use |
|---|---|---|---|
| 1979-01-23 | Provincial decision to create Shenzhen City; internal first. | `phase1.politics.province_decision_1979` | Background to the March opening. |
| 1979-03-05 | State Council reply; 市革命委员会 at Shenzhen. | `phase1.politics.city_reply_1979` | The opening letter. |
| 1979-08 | 61 municipal organs, 12 more than the county. | `phase1.local.city_organs_1979` | Texture: the machinery of a city. |
| 1979-11-26 | Upgraded to a prefecture-level provincial municipality under direct provincial leadership; plans on the provincial list from 1980-01-01. | `phase1.politics.provincial_city_1979` | A real authority gain; a good Q4 news item. |
| 1979-12-31 / 1980-01-01 | East Lake Garden: land for capital, 85:15 profits, 108 flats sold in Hong Kong. | `phase1.local.donghu_liyuan_contract_1979`, `phase1.local.donghu_liyuan_sales_1980` | Direct-involvement texture; ties to land fees. Signing date disputed; see §4.2. |
| 1981-03 / 1981-11 | Yuan Geng proposes the Shekou slogan; the board goes up in November. | `phase1.local.shekou_slogan_1981`, `phase1.local.shekou_slogan_sign_1981` | Political weather in one object; Shekou is off-map. |
| 1981-06-06 | First trial issue of the Shenzhen Special Zone Daily. | `phase1.local.sztqb_trial_1981` | Texture: the city gets a voice. |
| 1981-10-20 | Zone people's government established; revolutionary committee abolished. | `phase1.local.sez_government_1981_10` | Institutional beat; the end of the opening's form. |
| 1981-12-21 | Name changed to 深圳市人民政府. | `phase1.local.sz_gov_rename_1981_12` | Same beat, two months later. |
| 1982-05-24 | The paper is formally launched. | `phase1.local.sztqb_founded_1982` | Texture. |
| 1982-07-01 | Third national census. Citywide total 351,883. | `phase1.local.census_1982`, `phase1.local.census_total_1982` | Texture; do **not** put the total in a card or use it as a sim target. |
| 1983-09-27 | Shenzhen University opens with 216 students in four departments. | `phase1.local.szu_opens_1983` | Texture: civic prestige. |

---

## 4. The uncertain places

### 4.1 The 1982 "concession origins" material

The record supports the *fact* of a circulated compilation and Chen Yun's instruction. It does not
settle the title, the medium or the exact date.

- The municipal archive and Hu Qiaomu's 1982 remarks: **《旧中国租界的由来》**, a Secretariat
  research-office compilation (`书记处研究室编`), recommended at the 11–13 February forum
  (`phase1.politics.concession_material_1982`).
- Yu Guangyuan: a **January 1982** white-paper document from a Beijing unit titled
  **《上海租界的由来》** (`phase1.politics.concession_material_yuguangyuan_1982`).
- Cheng Kai: **《租界的由来》**, published in the **PLA Daily** and reprinted by Shanghai's
  **Wenhui Daily**, no month (`phase1.politics.concession_material_chengkai_1982`).

Resolution for the game: use **《旧中国租界的由来》**, call it a Secretariat research-office
compilation, date it to **February 1982**, and do not name a newspaper or a publication day. The
conflict record is `conflict.phase1.concession_material.1982`.

### 4.2 East Lake Garden's signing date

The archive dates the agreement to **1979-12-31**; Luo Jinxing, who signed it, recalls
**1980-01-01**. The one-day gap probably separates the document date from the public signing or the
company's founding on 1980-01-08. Resolution: use **1980-01** for a Q1 1980 news item, and keep both
days in the encyclopedia. Conflict: `conflict.phase1.donghu_liyuan.signing_date`.

### 4.3 Other precision notes

- **Document 50 of 1979:** dated 07-15, circulated 07-19. Use "July 1979" for the news item.
- **The 1980 minutes:** the meeting minutes are dated 1980-03-30; the central approval is 1980-05-16.
- **The 1981 minutes:** meeting 05-27 to 06-14; minutes 07-12; approval 07-19.
- **Chen Yun, December 1981:** month only. The 22 December day is memoir literature.
- **The 1981 government:** established 1981-10-20 under the name 深圳市经济特区人民政府; renamed
  1981-12-21. Do not use "1981-07" as the establishment date: that is the decision, not the
  institution.
- **Hu Yaobang's visit:** 1983-02-07 to 02-09; the quotation is from the 02-08 briefing. The visit was
  not publicly reported at the time.
- **Deng's visit and inscription:** visit 1984-01-24 to 01-26; inscription written in Guangzhou on
  1984-02-01 and dated 01-26. The slice ends with the visit; the inscription is a coda.
- **The 1982 census total:** 351,883 is the citywide 深圳市 count, not the special zone, and it is a
  different vintage from the game's population model. Use it as context only.

### 4.4 Leads not used

- **The April–May 1982 Beijing meeting on Guangdong/Shenzhen**, where the chairman is said to have
  called the 327 km² plan "大得无边" (Yu Guangyuan's recollection, quoted in a book excerpt). It is a
  vivid lead, but the source is a memoir inside a secondary excerpt and the date and speakers need
  the original record. Keep it as a `lead`, not an event.
- **The March 1981 elevation to deputy-provincial status.** Found only in encyclopaedia summaries
  (tier E). Not used.
- **The 1980-09 NPC session and the 1981-06 Resolution on Party History.** Important national facts,
  but they do not change the zone's room to manoeuvre. They belong in a single background line, not a
  card.
- **The 1982-12-04 constitution.** Same: background, not a zone decision.
- **The 1984-03 opening of fourteen coastal cities.** After the slice; use it in the epilogue only if
  the verdict needs a forward-looking line.

---

## 5. Selection

### 5.1 The rule

A political item earns a place in the slice only if at least one of these is true:

1. **It changes a decision.** The player's options are different after it (the 1982 forum, the 1982
   new Document 50, the 1983 plenum).
2. **It explains a mechanic.** It makes the land, power, forex or scrutiny rules legible (1979
   Document 50, 1981 Document 27, 1982 Document 17).
3. **It is directly about the city.** It names Shenzhen, its officials or its projects (East Lake
   Garden, the 1981 government, the 1982 census, the university).
4. **It is a weather vane the player can see.** It changes the mood around the zone without changing
   a rule (the Shekou slogan, the newspaper, the 1983 visit).

An item is dropped if it is only a party calendar entry, if it duplicates another item's effect, or if
the record cannot support a date at least to the month.

### 5.2 The selected twenty-four

The design doc carries the player-facing text and the quarter-by-quarter table. In summary, the
selection is:

- **1979:** the March city reply, the April "special zone" naming, the July Document 50, the August
  organs, the November provincial upgrade, the East Lake Garden contract.
- **1980:** the May "build Shenzhen first" approval, the August SEZ, the Shekou slogan.
- **1981:** the June newspaper trial, the July Document 27 ("not a political special zone"), the
  October people's government, the December Chen Yun turn.
- **1982:** the January smuggling notice, the February concession material and forum, the March
  Document 17, the April economic-crime decision, the May newspaper launch, the July census, the
  September Twelfth Congress, the October Chen Yun approval, the December new Document 50.
- **1983:** the February Hu Yaobang visit, the June Deng relay, the August strike-hard decision, the
  September university, the October plenum.
- **1984:** the January Deng visit (the existing closing event).

The list above is thematic, not the final count. The design doc's table has **twenty-four entries**; some
rows are one event with two claims, and some are combined into a single briefing line. The point of the
list is coverage, not a count.

### 5.3 The dropped

The dropped items are named for the selection argument, not as claims. Several are background facts that this
file does not claim; add a claim only if one of them becomes a card.

| Item | Why dropped |
|---|---|
| 1980-09 NPC: Hua Guofeng resigns as premier | National leadership change; no zone decision. One background line at most. |
| 1981-06 Sixth Plenum: Resolution on Party History | Settles the post-Mao legitimacy question, which the zone benefits from, but the player cannot act on it. Background. |
| 1981-03 deputy-provincial status | Tier-E sources only; do not use. |
| 1982-04/05 Beijing meeting on the "too big" plan | Memoir lead; date and speakers need the original record. Keep as a lead. |
| 1982-12-04 new constitution | Background; no zone mechanic. |
| 1983-10 to 1984-01 "spiritual pollution" campaign as a single event | It is a campaign with a start, a limit and a wind-down. Model it as the October plenum plus a later "the line is drawn" news item, not one card. |
| 1984-03 fourteen coastal cities | After the slice. Epilogue only. |
| Every annual plenum and party congress not listed | They do not change the zone's room to manoeuvre; including them would bury the four that do. |

---

## 6. What this means for R9

The beats are not wrong as a tutorial. They are wrong in three specific places, and thin in one
specific period:

1. **The institution.** Call it the 市革命委员会 in 1979, and make the 1981-10 people's government a
   beat. Do not call the player a mayor in 1979.
2. **The first project.** A Q1 1979 "first project toward Luohu" is a design device, not a documented
   decision. Keep it, but frame it as the city's own survey and preparation, and let the **1980-Q1
   loan/package** carry the historical weight of the Luohu works.
3. **The co-financing.** A Hong Kong investor building a power line is not the documented 1980 story.
   The documented story is the Luohu 0.8 km² formation package and the Construction Bank loan. Re-theme
   the co-financed order to **site formation/roads**, or keep a substation but label it a design
   composite, not history.
4. **The post-SEZ gap.** The plan jumps from the SEZ (1980-Q3) to the visit (1984-Q1) with only the
   budget, the sweep and a few anchors. The political spine above fills that gap without adding a
   second tutorial. The news layer is the right vehicle: one item a quarter, no pause, no card except
   the 1982 forum.

The design proposal, including the welcome letter, the mission cards and the twenty-four entries, is
in `docs/design/systems/prologue-flavor-and-news.md`.
