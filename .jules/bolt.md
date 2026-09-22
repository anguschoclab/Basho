## 2026-09-22 - Replacing chained array operations in hot loops
**Learning:** Engine loops iterating over rikishiIds frequently use `.filter(condition).length`. This creates intermediate O(N) array allocations just to find the length, which causes GC pressure.
**Action:** Replace `arr.filter(cond).length` with `for...of` manual counter loops to prevent O(N) memory allocations in algorithmic hot paths.
