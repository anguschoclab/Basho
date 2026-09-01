## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.
## 2025-05-18 - Avoid Map Cloning in Pure Pipeline Phases
**Learning:** `createShallowSnapshot` in `pipelineRunner.ts` was falling back to cloning all explicitly tracked maps (e.g., heyas, rikishi) when `touches: []` was provided, or when `pure: true` was set but `touches` was not explicitly passed as `[]`. This caused unnecessary Map instantiations and garbage collection on every tick for read-only (pure) phases.
**Action:** When working with pipeline phases or reducers, ensure that explicitly defined empty change scopes (like `touches: []`) truly skip allocation, and verify that `pure` flags correctly propagate to skip snapshotting altogether.
