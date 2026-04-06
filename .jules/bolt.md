## 2025-02-28 - Optimize Array Chaining in Presenters
**Learning:** Chained array methods (like `.map().filter().map()`) create intermediate array allocations that degrade performance, especially on hot paths like UI state projections.
**Action:** Consolidate these operations into a single pass using `.reduce()` or a standard `for` loop to avoid intermediate allocations and achieve significant speedups (e.g., 85% improvement).
## 2024-03-24 - React Context Memoization
**Learning:** Providing inline objects to Context values (like `value={{ theme, setTheme }}`) forces re-renders for all context consumers on every provider render.
**Action:** Wrap context objects in `useMemo` with stable dependencies to prevent unnecessary render cascades.
