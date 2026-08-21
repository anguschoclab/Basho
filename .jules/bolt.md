## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.

## 2025-05-18 - Optimize tick phase array allocations
**Learning:** `.map(...).filter(...)` operations in hot paths cause O(N) array allocations, increasing garbage collection pressure.
**Action:** Replaced intermediate `.map(...).filter(...)` array allocations with direct `for...of` loops in `phase01_week_training.ts` to reduce temporary array allocations during the weekly training phase calculation.
