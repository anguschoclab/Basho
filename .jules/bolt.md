## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.

## 2023-11-20 - O(N) Array Find Optimization
**Learning:** In `boutResolver.ts`, the `.find()` method was used to search the `KIMARITE_REGISTRY` array on every single bout resolution. This is a hot path operation (O(N)) that can impact tournament simulation speeds.
**Action:** Replace `KIMARITE_REGISTRY.find(k => k.id === result.kimarite)` with `getKimarite(result.kimarite)` which utilizes a pre-computed Map lookup for O(1) performance.
