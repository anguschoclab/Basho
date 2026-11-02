## 2024-11-01 - Avoid chained array methods in AI Workers
**Learning:** Chaining `.map().filter().sort()[0]` on large datasets in frequent engine ticks causes unnecessary allocations and O(N log N) complexity.
**Action:** Replaced with single-pass manual for loops to achieve O(N) complexity and reduce GC pressure.
