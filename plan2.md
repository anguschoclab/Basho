1. **Apply deterministic tie-breakers to array sorts in specific files**
   I will use `read_file` or inspect earlier tool outputs to locate and fix all specific `.sort()` calls by injecting a reliable tie-breaker (like ID comparisons or alphabetical sorting).
   - In `src/engine/overflow.ts`: Update `scoredCandidates.sort((a, b) => a.score - b.score)` to `scoredCandidates.sort((a, b) => a.score - b.score || (a.rikishi.id < b.rikishi.id ? -1 : a.rikishi.id > b.rikishi.id ? 1 : 0))`
   - In `src/engine/mergers.ts`: Update `candidates.sort((a, b) => b.funds - a.funds)` to `candidates.sort((a, b) => b.funds - a.funds || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))`
   - In `src/engine/kimarite.ts`:
     - Update `.sort((a, b) => b.styleAffinity[style] - a.styleAffinity[style])` to `.sort((a, b) => b.styleAffinity[style] - a.styleAffinity[style] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))`
     - Update `.sort((a, b) => (b.archetypeBonus[archetype] ?? 0) - (a.archetypeBonus[archetype] ?? 0))` to `.sort((a, b) => (b.archetypeBonus[archetype] ?? 0) - (a.archetypeBonus[archetype] ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))`
   - In `src/engine/uiDigest.ts`: Update `candidates.sort((a, b) => b.recentWins - a.recentWins)` to `candidates.sort((a, b) => b.recentWins - a.recentWins || (a.rikishi.id < b.rikishi.id ? -1 : a.rikishi.id > b.rikishi.id ? 1 : 0))`
   - In `src/engine/uiModels.ts`: Update `rivalEntries.sort((a, b) => b.tb - a.tb)` to `rivalEntries.sort((a, b) => b.tb - a.tb || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))`
   - In `src/engine/rivalries.ts`:
     - Update `rows.sort((x, y) => y.heat - x.heat || (y.meetings - x.meetings))` to `rows.sort((x, y) => y.heat - x.heat || (y.meetings - x.meetings) || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))`
     - Update `entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))` to `entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))`

2. **Run verifications**
   - Run `bun run scripts/check-determinism.mjs`.
   - Run my custom deterministic validation script `run_sim.mjs` ensuring identical hash output across runs.
   - Run targeted test sweeps: `bun test src/engine/`

3. Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.

4. Submit the codebase changes via the `submit` tool.
