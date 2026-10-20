## 2026-10-20 - Single pass backward iteration in events log
**Learning:** Chaining array methods like .slice(), spread operator, .reverse(), and .find() on event arrays creates excessive GC pressure and O(N) operations.
**Action:** Replace multiple passes and allocations with a single backward iteration loop to optimize frequent pipeline execution.
