## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.
## 2025-06-15 - Remove inline array allocations in loops
**Learning:** Inline `.map()` operations inside high-frequency loop paths (like reducers) create intermediate arrays that pressure the garbage collector and cause performance hits.
**Action:** Iterate directly over the original collections and extract properties within the loop body.
