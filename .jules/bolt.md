## 2025-04-03 - Optimize Naturalization Check Sorting

**Learning:** When sorting collections that contain both active and historical entities (like all rikishi in `world.rikishi.values()`), sorting the entire dataset before filtering out the relevant subset introduces severe $O(N \log N)$ overhead that scales poorly as the game progresses and the total number of rikishi grows indefinitely.

**Action:** Always filter large game state Maps/Iterables down to the targeted subset of entities *before* applying `stableSort`.
