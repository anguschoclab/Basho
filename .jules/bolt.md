## 2024-04-11 - Optimize OPFS Archive Directory Iteration
**Learning:** Sequential `for await` loops over `FileSystemDirectoryHandle.values()` cause unnecessary I/O blocking per iteration.
**Action:** Replaced sequential `for await` with a `Promise.all` batch chunking strategy in `getArchivedBoutIdsForSeason`, significantly improving parallelized iterator resolution speed while maintaining memory safety.

## 2026-04-12 - Combine array iterations into single useMemo hook in React Dashboard Widgets
**Learning:** Dashboard widgets often compute several derived metrics (like lengths, filtered subsets, and sliced top-N arrays) from a base array. When performed directly in the render function or across multiple separate useMemo hooks, this results in O(N*M) redundant iterations.
**Action:** Combine these calculations into a single `useMemo` block that iterates over the source lists once, returning an object containing all the derived metrics to ensure O(N) performance.
