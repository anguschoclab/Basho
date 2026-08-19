## 2025-02-23 - Show Kinboshi Conceded for Yokozuna
**Data:** `rikishi.stats.achievements.kinboshiConceded`
**Learning:** This is already calculated by the engine and tracked for each Yokozuna. It indicates how many times they have been defeated by a Maegashira. It represents a negative metric for Yokozuna but is an interesting insight into their vulnerability.
**Pattern:** Add a new stat block in `RikishiProfileHeader.tsx` that displays `kinboshiConceded` if the rikishi is a Yokozuna and the value is greater than 0. The block will be styled with `text-destructive` to show it's a negative stat.
