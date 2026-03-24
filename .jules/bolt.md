## 2025-03-24 - Unnecessary O(N log N) deterministic sorts for UI projection and non-mutation iterators
**Learning:** Found multiple places in `tickDaily.ts` where arrays created from `.values()` (like `rikishiArr` and `heyaArr`) were being unnecessarily sorted with `stableSort` just for iterating over them without producing any ordered side-effects or mutations that require deterministic tie-breaking to avoid non-determinism. Specifically:
`for (const r of stableSort(rikishiArr, x => (x as any).id || String(x)))` instead of `for (const r of world.rikishi.values())`.
Because order doesn't affect the independent logic in the loop, we are incurring a high O(N log N) cost per tick.
**Action:** Replace `stableSort` with direct `.values()` iterator loops when iterating over independent simulation objects, to achieve O(N) iteration instead.

## 2025-03-24 - O(n^3) matchmaking bottleneck
**Learning:** In `src/engine/matchmaking.ts`, the `buildCandidatePairs` function iterates over pairs of rikishi using a nested loop (`O(N^2)`). For each pair, it calls `scorePairing()`, which in turn calls `haveFacedThisBasho()`. The latter function iterates over all matches in the `basho.matches` array (`O(M)`). Thus, the time complexity of `buildCandidatePairs` is `O(N^2 * M)`, which creates a serious performance bottleneck for tournament-wide matchmaking schedules.
**Action:** Replace the `O(M)` repeated array lookup with an `O(1)` `Set` lookup. Before starting the `N^2` pairwise generation loop in `buildCandidatePairs`, precompute a `Set` of previously matched rikishi IDs. This reduces the time complexity from `O(N^2 * M)` to `O(N^2 + M)`, delivering a ~500x speedup in that inner loop according to `mitata` benchmarks.
