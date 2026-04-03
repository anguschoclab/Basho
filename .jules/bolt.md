## 2024-05-18 - Avoid Sorting Growing Collections of Inactive Entities
**Learning:** In continuous simulations where entities (like rikishi) retire but remain in the world state, applying O(N log N) sorting operations (like `stableSort(world.rikishi.values())`) directly on the entire collection causes linear degradation over time.
**Action:** Always filter out inactive/retired entities into a temporary array using a single-pass `for...of` loop *before* sorting, especially in highly repeated paths like `tickMonthly.ts` or `tickDaily.ts`.
## 2024-04-02 - Avoid `.filter()` in active collection array cleanups
**Learning:** Using `.filter()` to remove elements from frequently updated active arrays (like records or stats collections) causes an O(N) memory allocation per use. In hot engine pathways (like retirements that trigger cascade cleanups), this creates unnecessary garbage collection overhead and drops references needed for optimization.
**Action:** Use manual backwards `for`-loops combined with `for (let j = i; j < len - 1)` shifts and a final `list.pop()` for removal, bypassing closure and array allocation entirely.
