## 2026-10-17 - Optimize array search on append-only event logs
**Learning:** The world.events.log array in this codebase is append-only and can grow very large (10,000+ items). Using full array methods like .some(), .filter(), or .find() on it causes severe latency. Recent events are at the end.
**Action:** Use a backward iterating for-loop to search the events log to avoid O(N) operations.
