## 2024-09-16 - Single-pass loop over chained maps/filters for state iteration
**Learning:** Chained `.map().filter()` calls on large collections like `world.activeRikishiIds` create multiple intermediate arrays, increasing garbage collection pressure and reducing execution speed in algorithmic hot paths.
**Action:** When filtering or mapping state arrays/sets, use a single-pass `for...of` loop to consolidate logic and eliminate redundant allocations.
