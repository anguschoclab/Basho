## 2025-02-22 - Replacing Multiple Filters with Single Pass Loop in Welfare Tick Phase
**Learning:** Chaining array methods like `.filter()` or filtering twice over the same list (e.g. to split active vs injured) causes unnecessary intermediate array allocations, slowing down performance in simulation tick phases.
**Action:** Replace multiple `.filter()` statements on the same collection with a single `for...of` loop that separates or transforms the data directly in one pass.
