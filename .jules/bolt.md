## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.

## 2025-02-15 - Array Iteration Hot Path Optimization
**Learning:** Chaining `.map()` and `.filter()` operations or using `.filter(condition).length` in tight simulation loops (like weekly training or governance reviews) causes unnecessary array allocations and garbage collection overhead.
**Action:** Replace these patterns with direct `for...of` loops, pushing to a local array or maintaining a counter to reduce overhead in high-frequency engine paths.
