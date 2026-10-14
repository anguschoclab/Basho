## 2026-10-14 - O(1) backward scans for events.log
**Learning:** In the Bard engine, `world.events.log` is an append-only, chronologically ordered array that can grow large. Chaining array methods like `.map()`, `.filter()`, `.slice()`, `.some()`, and `.sort()` on the entire log causes massive intermediate array allocations and severe latency.
**Action:** Iterate backwards from the end of the array with a `for` loop to collect matches and break early instead of using array methods.
