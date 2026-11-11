1. **Optimize `src/engine/events/chains/chainService.ts`**
   - Use `replace_with_git_merge_diff` to replace manual iteration with `EntityCollection.getHeyaRoster(world, heyaId)`:
     ```
     <<<<<<< SEARCH
       if (effects.rosterFatigue && heyaId) {
         for (const rid of world.activeRikishiIds) {
           const r = world.rikishi.get(rid);
           if (!r || r.heyaId !== heyaId || r.isRetired) continue;
           builder.updateRikishi(rid, {
             fatigue: Math.max(0, (r.fatigue ?? 0) + effects.rosterFatigue),
           });
         }
       }
     =======
       if (effects.rosterFatigue && heyaId) {
         const roster = EntityCollection.getHeyaRoster(world, heyaId);
         for (const r of roster) {
           builder.updateRikishi(r.id, {
             fatigue: Math.max(0, (r.fatigue ?? 0) + effects.rosterFatigue),
           });
         }
       }
     >>>>>>> REPLACE
     ```

2. **Optimize `src/engine/narrative/crisisRegistry.ts`**
   - Use `replace_with_git_merge_diff` to replace manual iteration with `EntityCollection.getHeyaRoster(world, heyaId)`:
     ```
     <<<<<<< SEARCH
     function applyRosterFatigue(
       b: ImpactBuilder,
       world: WorldState,
       heyaId: string,
       delta: number
     ): void {
       for (const rid of world.activeRikishiIds) {
         const r = world.rikishi.get(rid);
         if (!r || r.heyaId !== heyaId || r.isRetired) continue;
         b.updateRikishi(rid, { fatigue: Math.max(0, (r.fatigue ?? 0) + delta) });
       }
     }
     =======
     function applyRosterFatigue(
       b: ImpactBuilder,
       world: WorldState,
       heyaId: string,
       delta: number
     ): void {
       const roster = EntityCollection.getHeyaRoster(world, heyaId);
       for (const r of roster) {
         b.updateRikishi(r.id, { fatigue: Math.max(0, (r.fatigue ?? 0) + delta) });
       }
     }
     >>>>>>> REPLACE
     ```

3. **Verify updated files**
   - Execute `cat src/engine/events/chains/chainService.ts` and `cat src/engine/narrative/crisisRegistry.ts` to ensure the correct usage of `EntityCollection.getHeyaRoster`.

4. **Lint and Type Check**
   - Execute `bun run lint` and `bun run type-check`.

5. **Run targeted tests**
   - Execute `bun x vitest run tests/unit/engine/events/chains/ tests/unit/engine/bard/dramaGenerator.crisis.test.ts tests/unit/engine/npcAI/crisisAgent.test.ts tests/unit/engine/npcAI/economy/crisisRescue.test.ts tests/unit/engine/loop/crisisSerialization.test.ts` to test both `chainService` and `crisisRegistry`.

6. **Run full tests**
   - Execute `bun run test` to verify no regressions were introduced.

7. **Update Bolt's Journal**
   - Execute the following command to update `.jules/bolt.md`:
     ```bash
     mkdir -p .jules && cat << 'EOF' >> .jules/bolt.md
     ## 2024-03-24 - Use EntityCollection.getHeyaRoster for targeted active roster queries
     **Learning:** Querying a heya's active roster by manually mapping and filtering the global `world.activeRikishiIds` array causes an O(N) performance bottleneck during frequent engine ticks.
     **Action:** Always use the memoized `EntityCollection.getHeyaRoster(world, heyaId)` to retrieve the active roster of a heya to reduce algorithmic complexity.
     EOF
     ```

8. **Verify Bolt's Journal Update**
   - Run `cat .jules/bolt.md` to verify the journal entry was correctly appended.

9. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

10. **Submit PR**
   - Submit the PR with:
     - Branch name: `bolt-roster-query-opt`
     - Title: `⚡ Bolt: Optimize heya roster queries`
     - Description:
       ```
       💡 What: Replaced O(N) iteration over `world.activeRikishiIds` with memoized O(1) `EntityCollection.getHeyaRoster(world, heyaId)` in `chainService` and `crisisRegistry`.
       🎯 Why: Filtering the entire global active rikishi list down to a specific heya creates a performance bottleneck during frequent engine ticks.
       📊 Impact: Reduces algorithmic complexity from O(N) (total active rikishi) to O(1) (memoized query lookup).
       🔬 Measurement: Run full simulation workload and verify engine tick duration.
       ```
