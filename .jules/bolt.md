## 2024-10-25 - [Performance] Single-pass loops over chained filter/maps
**Learning:** Chaining `.map().filter()` or multiple `.filter()` calls on arrays creates unnecessary intermediate array allocations, adding up memory pressure that the garbage collector has to clean up.
**Action:** When filtering and mapping over datasets in hot paths or tick phases (like `phase05_monthly_boundary`), use single-pass `for...of` loops and pre-allocate the result array to avoid redundant allocations.
