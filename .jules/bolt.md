## 2025-03-09 - Avoid Redundant Array Creation on sort
**Learning:** `stableSort` destructures its input with `[...arr]`. When passing `Array.from(map.values())`, an unnecessary intermediate array is created. We can update `stableSort` to accept `Iterable<T>` to avoid this.
**Action:** Changed `stableSort` type to `Iterable<T> | T[]` and removed `Array.from` calls when calling `stableSort(map.values(), ...)`.
