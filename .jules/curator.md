## 2024-07-08 - Kinboshi Earned (Gold Stars)

**Data:** rikishi.stats.achievements.kinboshiEarned (passed as rikishi.achievements.kinboshiEarned in UIRikishi)
**Learning:** The simulation correctly tracks upsets against Yokozuna by Maegashira, but they were invisible in the UI except during retirement. Tracking them in the profile header adds prestige for long-serving rank-and-filers.
**Pattern:** Add conditional items to the RikishiProfileHeader stat array (e.g. condition: (rikishi.achievements?.kinboshiEarned ?? 0) > 0) to avoid cluttering the UI for wrestlers without these rare achievements.

## 2024-07-12 - Mochikyukin Points

**Data:** `rikishi.stats.achievements.mochikyukinPoints`
**Learning:** This value represents the cumulative JSA bonus points earned by sekitori for career accomplishments (like Kachi-Koshi, Yusho, Kinboshi). It directly dictates their bi-monthly bonus payout (¥4,000 per point). This helps players decide whether to keep an aging sekitori active for their passive income.
**Pattern:** Surface it in the `RikishiProfileHeader` alongside other career highlights (Elite Titles, Kinboshi) by adding it to the `achievements` object in the UI projection (`src/presenters/rikishiUI.ts`).

## 2024-07-25 - Ginboshi (Silver Stars)

**Data:** rikishi.stats.achievements.ginboshiEarned and ginboshiConceded
**Learning:** Ozeki concedes and Maegashira ginboshi wins were tracked but barely surfaced in the UI. Exposing them in the profile, retirement narrative, and Ozeki cards gives context to giant-killing achievements for Maegashira and upset vulnerabilities for Ozeki.
**Pattern:** Similar to Kinboshi, conditional display items in RikishiProfileHeader and RikishiCard were added, avoiding clutter when values are 0.

## 2024-07-26 - Career Absences & Yokozuna Warnings

**Data:** `rikishi.careerAbsences` and `rikishi.councilWarnings`
**Learning:** Absences drastically affect rikishi value (injury proneness) but were hidden from the primary career stat. Similarly, YDC Warnings silently debuffed Yokozunas without UI context.
**Pattern:** Surface `careerAbsences` dynamically in `careerRecord` strings (W-L-A) only if > 0 to not clutter the standard W-L display. Surface warnings as a conditional badge on `RikishiProfileHeader`.
