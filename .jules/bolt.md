## 2024-04-11 - Optimize OPFS Archive Directory Iteration
**Learning:** Sequential `for await` loops over `FileSystemDirectoryHandle.values()` cause unnecessary I/O blocking per iteration.
**Action:** Replaced sequential `for await` with a `Promise.all` batch chunking strategy in `getArchivedBoutIdsForSeason`, significantly improving parallelized iterator resolution speed while maintaining memory safety.

## 2026-04-12 - Combine array iterations into single useMemo hook in React Dashboard Widgets
**Learning:** Dashboard widgets often compute several derived metrics (like lengths, filtered subsets, and sliced top-N arrays) from a base array. When performed directly in the render function or across multiple separate useMemo hooks, this results in O(N*M) redundant iterations.
**Action:** Combine these calculations into a single `useMemo` block that iterates over the source lists once, returning an object containing all the derived metrics to ensure O(N) performance.
## 2026-04-16 - Avoid early conditional returns before useMemo hooks in React component refactors
**Learning:** Moving conditional early returns below hooks during refactors is vital. If a React component conditionally returns early (e.g. `if (!world) return null;`) before executing `useMemo` hooks, React will throw a severe runtime violation.
**Action:** When extracting data transformations into `useMemo` or `useCallback`, always check and gracefully handle undefined/null states within the hook's execution logic, allowing the hook execution order to remain consistent across all renders, and shift the conditional return strictly beneath them.

## 2024-03-24 - [O(n) instead of O(n^2) for ID lookup]
**Learning:** `npcRecruitmentStrategy.ts` was doing `Object.values(world.talentPool?.candidates || {}).find((c) => c.candidateId === candidateId)` to look up a candidate by ID inside a method (`calculateMaxBid`) that can be called repeatedly during recruitment simulation loops. Since `candidates` is an object keyed by `candidateId` (of type `Record<Id, TalentCandidate>`), `Object.values().find(...)` unnecessarily iterates over all candidates, causing an O(N) lookup that could easily be O(1) by accessing the record directly.
**Action:** Replace `Object.values(record).find(obj => obj.id === id)` with direct record access `record?.[id]` to avoid O(N) lookups in loops.
## 2026-04-19 - Use singular useMemo hook to prevent redundant array loops
**Learning:** Found a specific bottleneck where `sekitoriCount` was repeatedly filtering `.filter(...)` the exact same `rikishiIds` array inline in the `render` output of `Dashboard.tsx`, while another `useMemo` right above it was already heavily parsing through that identical `rikishiIds` array to construct the `rosterRows`.
**Action:** Migrated the isolated loop counting into the primary `useMemo` block using an accumulator. Extracted `rosterRows` to be `rosterData.rows` and the `sekitoriCount` integer to safely and quickly render derived data efficiently in O(N) instead of 2 * O(N).
## 2024-05-18 - Nested Loop Bottleneck in Banzuke Calculation
**Learning:** Found an O(N*M) lookup where `Array.from(heyaMap.values()).find(h => h.rikishiIds?.includes(rikishiId))` is called inside a `.map` over the entire Banzuke. Since Banzuke can contain hundreds of rikishi and there are many heyas, this scales poorly.
**Action:** Replace `Array.from(heyaMap.values()).find(...)` inside loops with a pre-calculated mapping from `rikishiId` to `heya` (e.g., `rikishiToHeyaMap: Map<string, Heya>`) created once outside the loop to change O(N*M) to O(N).
## 2026-05-18 - Avoid O(N*M) Dictionary Trimming in Loops
**Learning:** The original `tickWeekEvents` created massive overhead by fully rebuilding the `eventsState.dedupe` object using `Object.keys().filter()` *inside* a loop for every single pruned event. This (N^2)$ algorithm completely blocked simulation determinism scripts.
**Action:** Optimized large state object trimming by switching to a two-pass approach. First pass: loop over the log and collect all `prefix`es to prune into a `Set<string>`. Second pass: construct a `newDedupe` object via a single `for...in` loop outside the main event loop, discarding any keys that match the collected prefixes, and assign it back to state immutably.
## 2024-05-18 - [Array Method Chaining Optimization]
**Learning:** Chained array methods (like `.map().filter().map()`) in hot paths of the simulation engine (such as tick phases running over the roster) cause performance degradation due to multiple redundant iterations and the creation of intermediate arrays.
**Action:** Replace chained array methods with a single loop (like `for...of`) when iterating over large collections to eliminate intermediate array allocations and reduce iteration overhead.
## 2024-05-18 - [Array Method Chaining Optimization]
**Learning:** Chained array methods (like `.map().filter().map()`) in hot paths of the simulation engine (such as tick phases running over the roster) cause performance degradation due to multiple redundant iterations and the creation of intermediate arrays.
**Action:** Replace chained array methods with a single loop (like `for...of`) when iterating over large collections to eliminate intermediate array allocations and reduce iteration overhead.

## 2025-01-20 - ⚡ Bolt: Optimize buildAndSortActiveSponsors with WeakMap cache
**Learning:** React UI projections recalculating nested collections every render can become a significant bottleneck if the dataset is large (e.g. iterating over all sponsors and their relationships `O(S*R)` inside `projectSponsorUIDigest`).
**Action:** Implemented a module-level `WeakMap` cache keyed on the immutable / semi-immutable underlying data structure (in this case `sponsorPool.sponsors`), reversing the relationships to a `targetId -> Array<{sponsor, rel}>` lookup for O(1) performance per projection call.
