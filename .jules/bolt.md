## 2024-05-17 - Manual loop over Object.entries for performance
**Learning:** Replaced `.filter(...).sort(...).map(...)[0]` chaining with single-pass `for` loops in NPC weekly agent recruitment context.
**Action:** When working on performance, identifying chained higher-order array functions, especially those allocating new arrays or relying on `.sort()` only to extract one max element, can yield nice performance bumps by manually rewriting them into single-pass loops.
