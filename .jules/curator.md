## 2024-07-08 - Kinboshi Earned (Gold Stars)
**Data:** rikishi.stats.achievements.kinboshiEarned (passed as rikishi.achievements.kinboshiEarned in UIRikishi)
**Learning:** The simulation correctly tracks upsets against Yokozuna by Maegashira, but they were invisible in the UI except during retirement. Tracking them in the profile header adds prestige for long-serving rank-and-filers.
**Pattern:** Add conditional items to the RikishiProfileHeader stat array (e.g. condition: (rikishi.achievements?.kinboshiEarned ?? 0) > 0) to avoid cluttering the UI for wrestlers without these rare achievements.
## 2024-07-12 - Mochikyukin Points
**Data:** `rikishi.stats.achievements.mochikyukinPoints`
**Learning:** This value represents the cumulative JSA bonus points earned by sekitori for career accomplishments (like Kachi-Koshi, Yusho, Kinboshi). It directly dictates their bi-monthly bonus payout (¥4,000 per point). This helps players decide whether to keep an aging sekitori active for their passive income.
**Pattern:** Surface it in the `RikishiProfileHeader` alongside other career highlights (Elite Titles, Kinboshi) by adding it to the `achievements` object in the UI projection (`src/presenters/rikishiUI.ts`).
