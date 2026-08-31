## 2023-11-20 - O(N) Array Find Optimization
**Learning:** In `boutResolver.ts`, the `.find()` method was used to search the `KIMARITE_REGISTRY` array on every single bout resolution. This is a hot path operation (O(N)) that can impact tournament simulation speeds.
**Action:** Replace `KIMARITE_REGISTRY.find(k => k.id === result.kimarite)` with `getKimarite(result.kimarite)` which utilizes a pre-computed Map lookup for O(1) performance.
