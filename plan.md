1. **Analyze `ENTITY_UPDATE_CONFIGS.map` in `src/engine/core/ImpactResolver.ts`**
   - The `.map()` call creates an intermediate array in the hot loop of `mergeImpacts`.
   - I'll replace it with a direct `for...of` loop over `ENTITY_UPDATE_CONFIGS` to avoid this allocation.

2. **Analyze `.map` in `Array.from(appendMap.entries()).map` in `src/engine/core/ImpactResolver.ts`**
   - We can just use a `for...of` loop to build `merged.arrayAppends`.

3. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Submit PR**
   - Submit PR titled "⚡ Bolt: Optimize ImpactResolver allocations" with impact details.
