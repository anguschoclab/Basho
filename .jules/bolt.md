## 2023-10-25 - Prevent intermediate array allocations in monthly boundary
**Learning:** Found an instance in `phase05_monthly_boundary.ts` where multiple `.filter()` and `.map()` calls were chained on `world.activeRikishiIds` (which contains hundreds of items) to collect sekitori participants for the exhibition basho (jungyo).
**Action:** Replaced the chained operations with a single `for...of` loop to prevent unnecessary intermediate array allocations, significantly reducing garbage collection pressure on the monthly tick boundary.
