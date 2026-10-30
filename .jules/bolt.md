## 2024-05-18 - Optimize array allocations in npc ticks
**Learning:** Frequent use of `[...new Set(array)]` in high-volume engine ticks like `phase01_week_npc_ai` creates unnecessary garbage collection pressure by allocating temporary arrays and spread operations.
**Action:** Use manual single-pass `for` loops combined with a `Set` to deduplicate and iterate simultaneously without intermediate array allocations.
