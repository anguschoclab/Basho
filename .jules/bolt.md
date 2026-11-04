
## $(date +%Y-%m-%d) - [AdvisorService Roster Lookup Optimization]
**Learning:** Manually mapping and filtering `world.activeRikishiIds` to find a specific heya's roster is an O(N) operation over all active rikishi, whereas `EntityCollection.getHeyaRoster(world, heyaId)` leverages a memoized query which is much faster.
**Action:** Always prefer `EntityCollection.getHeyaRoster(world, heyaId)` (or `queries.getHeyaRoster` if you need to include retired rikishi) over filtering global arrays.
