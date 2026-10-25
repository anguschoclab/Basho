## 2024-11-20 - [Performance] Removing intermediate array allocations in weekly NPC execution
**Learning:** Frequent array operations in the hot simulation loops (`execution.ts`) cause unnecessary GC pressure and CPU overhead from intermediate arrays.
**Action:** Replaced `.filter().sort()` and `.filter().sort().find()` chains with a manual, single-pass O(N) `for` loop to reduce algorithmic complexity and allocations in `applyFacilityUpgrade` and `tryMyosekiPurchase`.
