1. **Analyze target `.sort()` calls for non-determinism:**
   - In `src/engine/overflow.ts`: `scoredCandidates.sort((a, b) => a.score - b.score);`. Needs deterministic tie-breaking (e.g., fallback to ID).
   - In `src/engine/mergers.ts`: `candidates.sort((a, b) => b.funds - a.funds);`. Needs fallback to ID.
   - In `src/engine/kimarite.ts`:
     - `.sort((a, b) => b.styleAffinity[style] - a.styleAffinity[style]);`
     - `.sort((a, b) => (b.archetypeBonus[archetype] ?? 0) - (a.archetypeBonus[archetype] ?? 0));`
     Needs fallback to ID.
   - In `src/engine/uiDigest.ts`: `candidates.sort((a, b) => b.recentWins - a.recentWins);`. Needs fallback to ID.
   - In `src/engine/uiModels.ts`: `rivalEntries.sort((a, b) => b.tb - a.tb);`. Needs fallback to ID.
   - In `src/engine/rivalries.ts`:
     - `rows.sort((x, y) => y.heat - x.heat || (y.meetings - x.meetings));`
     - `entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));`
     Needs fallback to ID (or key).

2. **Implement deterministic tie-breakers in target files:**
   - Modify the array sort functions to use `.localeCompare` or standard stable ID comparison when the primary metric is equal.
   - E.g., `(a, b) => a.score - b.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)` or use string comparisons.

3. **Verify determinism:**
   - Re-run `scripts/check-determinism.mjs` and the `determinism-test.mjs` to ensure the codebase still follows all rules.
   - Ensure `run_sim.mjs` generates matching state hashes.

4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**

5. **Submit the PR:**
   - PR title: 'refactor: enforce deterministic sorting across engine'
   - Commit the changes and open the PR.
