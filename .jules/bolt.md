## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.
## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** `.filter().length` in presenters and AI logic such as `projectMedicalUIDigest` or `runRetirements` allocates unnecessary intermediate arrays, adding O(N) allocations for properties.
**Action:** Replace `.filter().length` with direct `for...of` loops and a counter variable in projection logic and engine hooks to reduce GC pressure.
