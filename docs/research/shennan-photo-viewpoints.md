# Catalogue frames and camera viewpoints, 1979-85 / 1979–85 年目录照片与视角

Publisher: [深圳老照片](http://www.szlzp.com/products.html), credited to 何煌友 on the individual pages.
Local copies are reference-only. `photo-catalogue.json` lists all **527** entries read from the public
listings; `photo-selection.json` records the **78** frames cached for this review with byte counts and
SHA-256; `public/photo-review/` holds the files. Claims are in
`data/evidence/claims/atlas_shennan_catalogue_views.yaml`.

**What is registered.** Every 1979–85 frame in the catalogue that shows a district, road or skyline rather
than a single interior or portrait, plus the undated Guomao frames whose rising tower places them inside the
1981–84 works. Portraits, ceremonies, factory interiors and post-1985 views are excluded; four 1988 Shennan
views and the 1976 Luohu views remain in the manifest but are not on this list.

**Cameras.** Each row gives a comparison camera in the atlas: an eye and look point in UTM 50N with eye
height, or — for `district` rows — a locality centre framed with the standard core-view angle. These are
reconstructions from the caption, the visible landmarks and the model's own street geometry. They are not
surveyed camera stations and must not be cited as such.

**Caption cautions found while reading.** The catalogue pairs images and captions inconsistently in a few
entries. `954` 渔民村1979 serves a bulldozer scene; `1453` 东湖丽苑（1981） serves a present-day photograph;
`957` and `958` duplicate the 1984 Nantou and 1985 Guomao frames. `1526` names 湖心酒店 but shows a
circular-top shaft that needs identity confirmation. Four Guomao frames (`1534`, `1535`, `1500`, `1536`)
carry no year: the first two show a rising shaft and belong to the works; the last two show a completed
tower and post-date the topping. `1541` 罗湖崛起 is undated and shows a full skyline, so it is probably later
than 1985. None of these is used to date a building.

**Rebuild.** From `build/3d-snapshots/jan84-stage-b/`: `..\..\..\pipeline\.venv\Scripts\python.exe szlzp-list.py`,
then `szlzp-download.py` (cached frames are skipped) and `szlzp-views.py`, which rewrites this table and the
atlas view list. `szlzp-intake.py` is the earlier all-entries downloader and is not needed for this list.

| Product | Year | Locality / view | Mode | Comparison camera (UTM 50N, height) | Confidence | Reading |
|---|---|---|---|---|---|---|
| [1554](http://www.szlzp.com/showProducts1554.html) | 1985 | Guomao / Renmin Road · 国贸／人民路 | camera | eye 202730, 2495900, 262 m → look 203560, 2496030 | medium | Long axis along Shennan East with the old town left and Guomao right. |
| [1557](http://www.szlzp.com/showProducts1557.html) | 1985 | Hongling / Shennan · 红岭路／深南路 | camera | eye 201985, 2495670, 260 m → look 202086, 2496420 | medium | North over the Hongling junction with Lizhi Park on the west side. |
| [1559](http://www.szlzp.com/showProducts1559.html) | 1985 | Yannan / Tongjianlou · 燕南路／统建楼地段 | camera | eye 200700, 2495945, 182 m → look 199887, 2495858 | medium | West along Shennan Middle past the Yannan frontage. |
| [1561](http://www.szlzp.com/showProducts1561.html) | 1985 | Huaqiang / Shennan Middle · 华强路／深南中路 | camera | eye 199934, 2495528, 245 m → look 199930, 2496375 | high | North over the Huaqiang junction; the caption puts Huaqiang Building west and SEG/Electronics east. |
| [1552](http://www.szlzp.com/showProducts1552.html) | 1983 | Huangbeiling / Yanhe Road · 黄贝岭／沿河路 | camera | eye 204955, 2496312, 236 m → look 205821, 2496529 | medium | East along Shennan East toward the Huangbeiling hills. |
| [1566](http://www.szlzp.com/showProducts1566.html) | 1983 | Dachong / Dasha River · 大冲／大沙河 | camera | eye 187028, 2495570, 238 m → look 187380, 2496800 | low | Up-valley toward the Dasha River crossing; the river and bridge are not modelled. |
| [1553](http://www.szlzp.com/showProducts1553.html) | 1983 | Hubei / Wenjing Road · 湖贝段／文静路 | camera | eye 204180, 2496030, 110 m → look 204520, 2496200 | low | East along the paving works with the old Hubei lane on the left. |
| [1567](http://www.szlzp.com/showProducts1567.html) | 1984 | Nantou / Zhongshanyuan Road · 南头段／中山园路 | camera | eye 184980, 2496120, 45 m → look 186300, 2495960 | medium | East along the Guangzhou-Shenzhen road; the sign gives 19 km to Shenzhen and 8 km to Shekou. |
| [1558](http://www.szlzp.com/showProducts1558.html) | 1985 | Shifu Road / Shangbu Road · 市府路／上步路 | camera | eye 200480, 2495480, 360 m → look 200520, 2496120 | high | North over the Shangbu junction and the compound frontages east of Shennan. |
| [1555](http://www.szlzp.com/showProducts1555.html) | 1985 | Caiwuwei / Heping Road · 蔡屋围／和平路 | camera | eye 202590, 2495390, 420 m → look 203230, 2495960 | low | Locality comparison. The foreground rail and receding road axis in the photo do not match this bearing. |
| [1541](http://www.szlzp.com/showProducts1541.html) | undated | Luohu from the south · 罗湖崛起 | camera | eye 203520, 2494180, 210 m → look 203380, 2495560 | low | Skyline across the river; many towers shown, so the frame is probably later than 1985. |
| [1506](http://www.szlzp.com/showProducts1506.html) | 1981 | Luohu town from the south · 建设中的罗湖 | camera | eye 202960, 2495990, 55 m → look 203160, 2496420 | medium | North over the old Dongmen roofs with new blocks and works in front. |
| [1520](http://www.szlzp.com/showProducts1520.html) | 1980 | Luohu site after filling · 罗湖小区五通一平 | camera | eye 202790, 2495120, 70 m → look 203360, 2495560 | medium | North-east over the levelled site; pond and low village in the foreground. |
| [1518](http://www.szlzp.com/showProducts1518.html) | 1980 | Luohu hill south slope · 开挖罗湖山南坡 | camera | eye 202880, 2494890, 85 m → look 203180, 2495330 | medium | North over the cut slope with the village foot and haul tracks. |
| [1521](http://www.szlzp.com/showProducts1521.html) | 1981 | Luohu works 1981 · 罗湖摆战场 | camera | eye 203120, 2495120, 60 m → look 203230, 2495680 | medium | North-west over the pile drivers with Luohu hill behind. |
| [1523](http://www.szlzp.com/showProducts1523.html) | 1984 | Haifengyuan and the works · 海丰苑与工地 | camera | eye 203460, 2495330, 85 m → look 203200, 2495760 | low | North-west over three finished towers, works and old roofs. |
| [1511](http://www.szlzp.com/showProducts1511.html) | 1985 | Heping Road / Luohu · 和平路／罗湖 | camera | eye 203010, 2495200, 95 m → look 203260, 2495770 | low | Locality comparison. The rail, street, river bend and left-hand ridge are not registered to this bearing. |
| [1526](http://www.szlzp.com/showProducts1526.html) | 1982 | Luohu towers 1982 · 湖心酒店一带 | camera | eye 203460, 2495520, 95 m → look 203230, 2495900 | low | West over completed and rising towers; the circular-top shaft needs identity confirmation. |
| [1529](http://www.szlzp.com/showProducts1529.html) | 1981 | Guoshang works 1981 · 国商大厦工地 | district | eye 203364.0, 2495164.0, 644.0 m → look 203280, 2495682 | medium | Pile frames and foundation pits on the Guoshang parcel. |
| [1530](http://www.szlzp.com/showProducts1530.html) | 1982 | Guoshang under construction · 国商承建 | camera | eye 203000, 2495560, 45 m → look 203250, 2495810 | medium | Two scaffolded slabs seen from the south-west, with haul roads in front. |
| [1522](http://www.szlzp.com/showProducts1522.html) | 1982 | Haifengyuan foundations · 海丰苑大厦动工 | camera | eye 203520, 2495360, 120 m → look 203250, 2495620 | low | Down over foundation mats and haul roads beside a new carriageway. |
| [1524](http://www.szlzp.com/showProducts1524.html) | 1982 | Luohu Building frontage · 罗湖大厦 | camera | eye 203120, 2495480, 25 m → look 203320, 2495620 | low | Street-level cluster of rising blocks with cranes. |
| [1462](http://www.szlzp.com/showProducts1462.html) | 1982 | Bagualing ground breaking · 八卦岭破土动工 | camera | eye 201420, 2497260, 35 m → look 201760, 2497600 | medium | Cleared ground in the fields with the northern hills behind. |
| [1460](http://www.szlzp.com/showProducts1460.html) | 1981 | Shangbu site works · 上步区大规模兴建 | district | eye 200444.0, 2495112.0, 1104.0 m → look 200300, 2496000 | medium | Earthmoving across the Shangbu fields; no fixed camera station. |
| [1470](http://www.szlzp.com/showProducts1470.html) | 1985 | Liantang works at dusk · 莲塘工业区动工 | camera | eye 206700, 2497000, 330 m → look 202700, 2496080 | medium | West over the border works toward the city and the bay. |
| [1385](http://www.szlzp.com/showProducts1385.html) | 1980 | Shekou peninsula 1980 · 蛇口开发初期 | camera | eye 182980, 2490060, 520 m → look 182500, 2490920 | medium | North-west over the cut hills, harbour and Deep Bay. |
| [1386](http://www.szlzp.com/showProducts1386.html) | 1985 | Shekou harbour 1985 · 蛇口填海码头 | camera | eye 183100, 2490200, 260 m → look 182350, 2490800 | medium | Over the filled quay, sheds, silos and berthed ships. |
| [1407](http://www.szlzp.com/showProducts1407.html) | 1981 | Chiwan harbour 1981 · 赤湾港初建 | camera | eye 180300, 2491700, 150 m → look 182300, 2491220 | low | Across the bay toward the new quay and the hill. |
| [1393](http://www.szlzp.com/showProducts1393.html) | 1981 | Shekou cargo quay · 蛇口货运码头 | camera | eye 182700, 2490600, 40 m → look 182400, 2490350 | low | Cranes and trucks at the quay. |
| [1502](http://www.szlzp.com/showProducts1502.html) | undated | Sea World waterfront · 海上世界 | camera | eye 182300, 2490400, 90 m → look 182010, 2490120 | medium | Along the Shekou waterfront with the Minghua berthed offshore. |
| [1469](http://www.szlzp.com/showProducts1469.html) | 1985 | Mawan port works · 妈湾港动工 | camera | eye 177400, 2494100, 220 m → look 178100, 2493760 | medium | Over the new peninsula works and barges. |
| [1503](http://www.szlzp.com/showProducts1503.html) | undated | Shenzhen Bay Hotel park · 深圳湾大酒店游乐场 | camera | eye 189700, 2494900, 90 m → look 189280, 2495230 | medium | Amusement park on the bay shore; undated but the park opened in 1984. |
| [966](http://www.szlzp.com/showProducts966.html) | 1984 | Luohu bridge 1984 · 罗湖桥 | camera | eye 203000, 2494180, 110 m → look 203120, 2494330 | high | Down on the rail bridge and river; the bridge axis is fixed by the rail. |
| [971](http://www.szlzp.com/showProducts971.html) | 1984 | Wenjindu port 1984 · 文锦渡口岸 | camera | eye 203760, 2494120, 240 m → look 203860, 2494560 | medium | Aerial over the checkpoint, the river and the border hills. |
| [974](http://www.szlzp.com/showProducts974.html) | 1981 | Wenjindu crossing 1981 · 文锦渡客货口岸 | camera | eye 203700, 2494270, 28 m → look 203880, 2494440 | medium | Across the checkpoint buildings with the far hills. |
| [978](http://www.szlzp.com/showProducts978.html) | 1982 | Sha Tau Kok 1982 · 沙头角远眺 | camera | eye 208900, 2496300, 150 m → look 209600, 2495600 | low | Across the fields and bay toward the far shore. |
| [1507](http://www.szlzp.com/showProducts1507.html) | 1979 | Dongmen street 1979 · 东门街景 | camera | eye 202930, 2496330, 9 m → look 203020, 2496400 | medium | Street level in the old town; the arcade rhythm is the useful comparison. |
| [1510](http://www.szlzp.com/showProducts1510.html) | 1980 | Renmin Road 1980 · 人民路 | camera | eye 203030, 2496100, 8 m → look 203030, 2496280 | medium | Street level on the north-south spine of the old town. |
