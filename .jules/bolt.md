## 2025-01-20 - [Optimize memory consolidation loop]
**Learning:** Intermediate array allocations in heavy simulation paths like `consolidateOyakataMemoryPure` can cause GC pressure when doing simple filtering/mapping.
**Action:** Used single pass manual `for` loop instead of `filter().map()` to reduce algorithmic complexity and allocations.
