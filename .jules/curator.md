## 2024-07-08 - Kinboshi Earned (Gold Stars)
**Data:** rikishi.stats.achievements.kinboshiEarned (passed as rikishi.achievements.kinboshiEarned in UIRikishi)
**Learning:** The simulation correctly tracks upsets against Yokozuna by Maegashira, but they were invisible in the UI except during retirement. Tracking them in the profile header adds prestige for long-serving rank-and-filers.
**Pattern:** Add conditional items to the RikishiProfileHeader stat array (e.g. condition: (rikishi.achievements?.kinboshiEarned ?? 0) > 0) to avoid cluttering the UI for wrestlers without these rare achievements.
