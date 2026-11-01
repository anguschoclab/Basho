
## 2024-05-18 - Avoid array allocation for Sets using spread syntax in frequent game loops
**Learning:** Using `[...set].some(...)` to check conditions inside game tick updates causes unnecessary O(N) allocations for arrays when the same could be done with a manual loop or iterator directly against the Set. This causes undue GC pressure in tight simulation loops.
**Action:** Iterate directly over Sets with `for (const x of set)` instead of converting them to arrays when we just need to search or count elements.
