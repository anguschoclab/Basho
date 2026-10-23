
## 2024-10-23 - Replace filter-map pipeline with single-pass loop
**Learning:** Using chained `.filter().map()` or `.map().filter()` on arrays in frequent execution paths (like tournament simulation and daily ticks) adds measurable overhead due to intermediate array allocations and multiple iterations.
**Action:** Always replace these pipelines with manual, single-pass `for` loops in core loops to minimize GC pressure and O(n) overhead.
