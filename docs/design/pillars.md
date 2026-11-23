# Design pillars

Copied from `PLAN.md` §1. Every feature should serve at least one pillar. If this file and PLAN.md disagree, update both in the same change.

**Pitch:** SimCity meets *China: Mao's Legacy*. You are the *spirit of the city*. You start in 1979 in a border county of fields, fishing villages and a small market town opposite Hong Kong, and you shape it into a megacity. You work inside the limits Beijing and Guangzhou allow, and you deal with an economy, a migrant population and a shadow city that never fully obey you.

**Pillars.** Every feature should serve at least one of these:

1. **You plan; the city happens.** You zone, lease land, build infrastructure and set policy. Investors, villagers and migrants decide what actually gets built. The gap between your plan and reality (illegal construction, urban villages, informal trade) is the heart of the game, not a bug.
2. **Permission is a resource.** Every policy is *sanctioned*, *grey-zone* or *forbidden*. Going ahead of Beijing ("crossing the river by feeling the stones") pays off, but it builds up political exposure. Your timing against the national political climate is the main strategic skill.
3. **History is the tide, not the script.** You cannot stop 1989 or bring the 1992 Southern Tour forward. You decide how Shenzhen weathers them. Sandbox mode loosens this; Historical mode keeps it.
4. **People in aggregate, stories in particular.** The simulation runs on groups. The player meets individuals through short vignettes: a factory worker from Hunan, a village landlord, a cross-border truck driver, a demobilised soldier, a market stall owner.
5. **Every grey zone has a ledger.** Smuggling, vice, counterfeiting, illegal building and labour abuse each bring visible benefits (jobs, cheap housing, growth, know-how) and visible costs (fires, disease, crime, scandal, central scrutiny). Nothing is just a "bad tile".
6. **The city is always viewable, and its streets remember.**
   - On any turn you can stop and fly over the whole city in 3D, open a postcard of any area, or walk one of the reconstructed routes.
   - Buildings keep their identity across decades. You can recognise a street thirty years later: the landlord added two floors, but the shop downstairs is still there.
   - This works because the simulation never depends on the renderer.
7. **GDP is not the only scoreboard.** Honorary-title reviews, performance reviews and your leaders' careers pull against raw growth. The cheapest way to grow (dense illegal housing, tolerated informality) is also the fastest way to fail an inspection.

**Explicit non-goals:** simulating individual residents, simulating a full bureaucracy (two leaders, not dozens of bureaus), real-time traffic physics, a full national economy model, and letting the player rewrite national history in Historical mode.
