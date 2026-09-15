## 2025-03-01 - [Single-Pass Loop over Multiple Filters]
**Learning:** Chained array allocations like `.filter()`, `.map()`, and `.filter().length` in projection components can trigger significant garbage collection pressure on large arrays.
**Action:** Use single-pass `for` loops (or `for...of` loops) with a manual counter to consolidate filtering logic and reduce garbage collection pressure in algorithmic hot paths.
