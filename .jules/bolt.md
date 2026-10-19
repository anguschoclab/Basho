## 2024-05-24 - [Replace .filter().sort()[0] with manual loop]
**Learning:** Found O(N log N) chain `.filter(...).sort(...)[0]` in AI weekly updates where a simple single-pass O(N) loop works.
**Action:** Replace chaining array methods with manual single-pass `for` loops to reduce algorithmic complexity from O(N log N) to O(N) in hotpaths.
## 2024-05-24 - [Replace .filter().sort()[0] with manual loop]
**Learning:** Found O(N log N) chain `.filter(...).sort(...)[0]` in AI weekly updates where a simple single-pass O(N) loop works. However, micro-optimizing small constant-sized arrays (e.g., 3 elements) with complex loops sacrifices readability without measurable benefit and is an anti-pattern.
**Action:** Replace chaining array methods with manual single-pass `for` loops in hotpaths for large variable datasets (like heya pairs or logs), but preserve `.filter().sort()` chains for small constant-sized structural arrays where readability is more important than imperceptible speed gains.
