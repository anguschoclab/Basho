## 2025-05-18 - Optimize Matchmaking Array Allocations
**Learning:** Hot paths, such as the matchmaking loop `scoreDrama` in `DramaMatchmaker.ts`, get called many times. Using `.filter(cond).length` causes O(N) intermediate array allocations that build up garbage collector pressure, increasing execution time in hot algorithms like Swiss matchmaking.
**Action:** Replace `.filter(cond).length` with direct `for...of` loops and a counter variable in all algorithmic hot paths.

## 2025-08-25 - Performance Micro-Optimizations vs Readability
**Learning:** Replacing `.filter(cond).length` with a `for...of` loop is a valid optimization on algorithmic hot paths (like Swiss Matchmaking) but is an anti-pattern when used on cold paths (like Governance review that happens once per basho, or UI render paths with small arrays like Roster sizes). Doing so creates a textbook micro-optimization that sacrifices declarative readability for zero measurable impact.
**Action:** Only apply `.filter(cond).length` loop optimizations to proven hot loops that iterate thousands of times per tick. For cold paths, prioritize readability.
