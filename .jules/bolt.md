## 2024-05-19 - Optimize Nakabi rikishi array allocation
**Learning:** Chaining array methods like `Array.from().map().filter()` in frequently executed tick phases creates unnecessary intermediate array allocations, causing memory pressure and latency.
**Action:** Use single-pass `for` loops in critical pipeline phases to minimize GC overhead and improve performance.
