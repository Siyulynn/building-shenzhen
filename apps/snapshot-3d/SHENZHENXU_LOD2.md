# Step 5A: Shenzhenxu crossroads / 深圳墟十字街口精模试点

Open [the offline atlas](../../../Shenzhen_Shenzhenxu_LOD2.html), keep **September 1980** and **Relief reference** selected, then choose **Shenzhenxu crossroads → Street view / 深圳墟十字街口 → 街景**. Switch to **Aerial detail / 俯视精模** to orbit the same geometry, or **Return to map / 返回地图** to restore the procedural neighbourhood. Direct review routes on the dev viewer are `?focus=core&lod2=shenzhenxu` and `?focus=core&lod2=shenzhenxu-aerial`. The [street review plate](../../../Step5_Shenzhenxu_Street.jpg) and [aerial review plate](../../../Step5_Shenzhenxu_Aerial.jpg) show the render only.

## Evidence and placement / 证据与定位

| Input / 输入 | What it constrains / 约束 |
|---|---|
| September KH‑9 trace pair | `town-cross-east-west` and `town-cross-north-south` share a vertex at **203178 E / 2496372 N**, UTM 50N. The model's two road axes reuse these candidate traces. It is not a surveyed intersection and the road-name attribution is not independently fixed to metre precision. Claim: `phase1.map.dongmen.crossroads_early_reform`. |
| Annotated local R01 frame | The road arrows label the transverse Renmin and receding Jiefang. Use the left gable/return, ground-floor recesses, right-hand gallery and arcade rhythm, and height changes as relative cues. The camera looks toward the east-going trace as one **hypothesis**. The capture date, author, compass bearing, crop and original negative remain open. Claim: `atlas.shenzhenxu.r01.frontage_reference`. |
| Leroy W. Demery Jr., 17 July 1980 | Inspected the dated Dongmen colour scan. It supports district-level brick/plaster, tile roofs, utility wires and cycles. It is a different frame and has not been tied to the R01 corner. Claim: `atlas.shenzhenxu.dongmen_july_1980`. |
| Published crossroads caption | A republication captions a frame “1980年，深圳，解放路与人民路口。” The linked image was unavailable for a frame match, so its year is not assigned to R01 or used to date any façade. Claim: `atlas.shenzhenxu.paper_crossroads_1980_caption`. |

The model is a **stylized prototype**. Widths, opening sizes, grades, material colour, props and all back elevations are design values. No shop names, street numbers, theatre, market boundary, or Friendship Department Store footprint are assigned. The paved study spans about **120 × 59 m** in signed road chainage and samples the same modern relief lattice as LOD1. A local reversible replacement removes only nearby coarse fabric in detail mode; the September terrain and outer neighbourhood remain. The 1979/January 1984 study kits and acquisition-dated KH‑9 view are unchanged. Neither colour photograph is embedded or used as a texture.

## Review and next pass / 检查与下一步

- The fixed perspective frame uses R01's image aspect and is a composition match, not a solved calibrated camera. The apex of the receding street, the across-frame Renmin crossing, and the relative masses on the two sides were the first checks. Distant continuation, exact corner setbacks and façade count are not matches to measured controls.
- On the checked Chromium viewport (604 × 664 CSS pixels), the settled street and aerial views used **40 and 37 draw calls** respectively. The offline review passed resetting and leaving the study, toggling both bookends, and switching to KH‑9 and back (17 place controls, zero browser console errors, zero HTTP resource loads). The tests check matching ground samples against the prepared and synthetic LOD1 plans, anchor reuse, camera crop, finite geometry, instancing budget and absence of photo textures.
- Next, locate and compare the actual published 1980 frame plus a second dated angle (the gazetteer's 1983 view and Li Huangwen's 1985 series are comparisons, not September or January controls). Resolve the camera side and use an independent scale anchor before turning any storefront or footprint into a dated reconstruction. Keep Nantang, the theatre and Friendship Store as separate search areas until then.
- Step 5 bookends remain a separate pass. Record sourced changes and explicitly labelled continuity hypotheses from the September baseline; do not transfer this prototype to 1979 or January 1984 by default.

## Rebuild / 重建

Prepare the registered grid, modern relief and municipal package per [Step 4B–4C](MUNICIPAL_STEP4BC.md), including `npm run prepareData -w @sz/snapshot-3d -- 'C:/Building Shenzhen'` to pack the new citations. Then, from the isolated atlas worktree:

```powershell
npm run check
npm run build -w @sz/snapshot-3d
node apps/snapshot-3d/portable.mjs
```

The current standalone file is `apps/snapshot-3d/dist/Shenzhen_Shenzhenxu_LOD2.html`. The archived Step 4B–4C export is not overwritten.
