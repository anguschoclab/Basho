## 2024-05-18 - Avoid chained .filter() calls in hot paths
**Learning:** Chaining multiple `.map()` and `.filter()` calls creates intermediate array allocations that increase garbage collection pressure and slow down pipeline execution loops.
**Action:** Use single-pass `for...of` loops with manual pushing and early `continue` statements instead.
