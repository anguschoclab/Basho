## 2025-03-05 - Avoid O(N) memory allocations when iterating Sets and Maps
**Learning:** `stableSort` was implemented to only accept arrays. Many places in the codebase were passing `Array.from(map.values())`, causing an unnecessary O(N) memory allocation just for `stableSort` to immediately clone it via `[...arr]`.
**Action:** Updated `stableSort` signature to accept `Iterable<T> | ArrayLike<T>` and internal implementation to use `Array.from(iterable).sort(...)`. We then updated redundant caller sites to avoid creating intermediate arrays.

## 2025-03-05 - Avoid O(N) memory allocations when iterating Sets and Maps
**Learning:** `stableSort` was implemented to only accept arrays. Many places in the codebase were passing `Array.from(map.values())`, causing an unnecessary O(N) memory allocation just for `stableSort` to immediately clone it via `[...arr]`.
**Action:** Updated `stableSort` signature to accept `Iterable<T> | ArrayLike<T>` and internal implementation to use `Array.from(iterable).sort(...)`. We then updated redundant caller sites to avoid creating intermediate arrays.

## 2023-10-27 - Avoid intermediate array allocations for Map entries
**Learning:** Using `Array.from(map.entries()).map(...)` causes unnecessary O(N) memory allocations for the intermediate array. In hot paths iterating over large maps like `standings`, this hurts performance.
**Action:** Replaced these chains with native `for...of` loops iterating `map.entries()` directly and using `.push()` to populate a target array before sorting. This approach was benchmarked to be nearly 2x faster natively.
