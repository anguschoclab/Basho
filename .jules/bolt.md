## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.
## 2025-10-24 - Array allocation optimizations in hot paths
**Learning:** Replaced chained higher order functions like .filter and .reduce inside loops or hot paths with standard for...of loops.
**Action:** Always favor standard for loops in areas of the engine like ImpactResolver and PlayoffResolver where intermediate O(N) array allocation from higher order functions could slow down tick loops.
