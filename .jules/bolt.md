## 2026-10-13 - Prevent array allocations on large event log
**Learning:** Chaining .filter() and .map() on world.events.log (which can hold 10k+ items) causes massive intermediate array allocations in projections.
**Action:** Iterate backwards over events.log with a single for loop and a break condition to find the newest events safely without O(N) overhead.
