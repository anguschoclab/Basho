## 2024-04-11 - Optimize OPFS Archive Directory Iteration
**Learning:** Sequential `for await` loops over `FileSystemDirectoryHandle.values()` cause unnecessary I/O blocking per iteration.
**Action:** Replaced sequential `for await` with a `Promise.all` batch chunking strategy in `getArchivedBoutIdsForSeason`, significantly improving parallelized iterator resolution speed while maintaining memory safety.

## 2026-04-12 - Combine array iterations into single useMemo hook in React Dashboard Widgets
**Learning:** Dashboard widgets often compute several derived metrics (like lengths, filtered subsets, and sliced top-N arrays) from a base array. When performed directly in the render function or across multiple separate useMemo hooks, this results in O(N*M) redundant iterations.
**Action:** Combine these calculations into a single `useMemo` block that iterates over the source lists once, returning an object containing all the derived metrics to ensure O(N) performance.
## 2026-04-16 - Avoid early conditional returns before useMemo hooks in React component refactors
**Learning:** Moving conditional early returns below hooks during refactors is vital. If a React component conditionally returns early (e.g. `if (!world) return null;`) before executing `useMemo` hooks, React will throw a severe runtime violation.
**Action:** When extracting data transformations into `useMemo` or `useCallback`, always check and gracefully handle undefined/null states within the hook's execution logic, allowing the hook execution order to remain consistent across all renders, and shift the conditional return strictly beneath them.
