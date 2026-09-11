## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.
## 2025-02-14 - Optimize projectCohortStats by fusing loop passes
**Learning:** Calling `.filter(condition).length` after a `for...of` loop over the same items iterates the array twice and allocates a temporary array.
**Action:** Always check if a `.filter().length` call can simply be merged into an existing adjacent loop by adding a manual counter. This reduces O(N) allocations and halves array passes.
