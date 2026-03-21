## 2025-03-19 - Optimizing history slice in uiDigest
**Learning:** `Array.slice().reduce()` is significantly slower and generates more garbage compared to using a native `for` loop over specific elements, particularly when evaluating history slices within loops. In tight simulation functions like `getOzekiRunCandidates` that iterate through the massive rikisi maps, `history.slice(-3)` triggers small array allocations leading to GC overheads.
**Action:** Avoid intermediate arrays by caching the length of the array (`history.length`), starting the index at `Math.max(0, len - x)`, and directly accumulating properties inside a `for` loop instead of mapping and reducing.

## 2025-03-19 - Optimizing tickWeek event trimming dedupe key cleanup
**Learning:** When cleaning up a large number of events in a log, using `Object.keys()` on a large dedupe map inside a loop over the removed events results in O(N * K) time complexity (where N is the number of events removed and K is the number of dedupe keys). In my benchmarks this could take over 14 seconds for 50,000 events.
**Action:** Extract the search prefixes (e.g. `year|week|`) into a `Set` in the first pass over the events, and then perform a single O(K) pass over the dedupe keys, using `indexOf` to quickly extract the prefix for comparison against the `Set`. This reduces the complexity to O(N + K) and reduced execution time from 14s to 30ms in my benchmark.

## 2024-03-24 - React useMemo array allocations
**Learning:** In React components that subscribe to complex global state (like `useGame`), chaining `.values()` iterators into `Array.from()` to use `.reduce()` causes significant garbage collection overhead and temporary array allocations on every render.
**Action:** Always replace `Array.from(map.values()).reduce()` with direct `for...of` loops over `map.values()` inside `useMemo` blocks when iterating over large datasets like `sponsors` or `rikishi`.
