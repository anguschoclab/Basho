## 2024-05-18 - Optimize PROMOTION_DELIBERATION search in actionQueue
**Learning:** Scanning the append-only `events.log` with array methods like `.some()` or `.filter()` causes massive overhead on large logs (~10k items) because it allocates intermediate arrays or has high function call overhead.
**Action:** Always iterate backwards from the end of the `events.log` array with a `for` loop to collect matches and break early.
