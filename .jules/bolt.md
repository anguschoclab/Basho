## 2024-05-18 - Avoid chained array methods in hot paths
**Learning:** Chained `.filter()` methods in performance-critical areas like `queryEvents` cause significant O(N) array allocation overhead per filter step.
**Action:** Replace multiple chained `.filter()` or `.map()` methods with single-pass `for` or `for...of` loops to instantiate only one output array.
## 2024-05-18 - Avoid chained array methods in hot paths
**Learning:** Chained `.filter()` methods in performance-critical areas like `queryEvents` cause significant O(N) array allocation overhead per filter step.
**Action:** Replace multiple chained `.filter()` or `.map()` methods with single-pass `for` or `for...of` loops to instantiate only one output array.
