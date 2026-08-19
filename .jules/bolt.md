## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.
## 2025-05-18 - Optimize ImpactResolver map allocations
**Learning:** Hot paths like `mergeImpacts` get called frequently in the pipeline engine. Repeatedly creating arrays using `.map()` on inline arrays (e.g. `ENTITY_UPDATE_CONFIGS.map`) or `Array.from()` inside these loops adds significant garbage collection and CPU overhead.
**Action:** Replace intermediate array creation techniques (`.map`, `Array.from`) with direct `for...of` loops and pre-allocated arrays where necessary in high-frequency functions.
