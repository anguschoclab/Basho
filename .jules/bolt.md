## 2024-03-24 - Use EntityCollection.getHeyaRoster for targeted active roster queries
**Learning:** Querying a heya's active roster by manually mapping and filtering the global `world.activeRikishiIds` array causes an O(N) performance bottleneck during frequent engine ticks.
**Action:** Always use the memoized `EntityCollection.getHeyaRoster(world, heyaId)` to retrieve the active roster of a heya to reduce algorithmic complexity.
