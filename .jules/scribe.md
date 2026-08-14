## 2024-08-14 - EntityService.ensureNestedState Map Initialization Warning
**Gap:** The comment says `CONTRACT / WARNING: This does NOT automatically detect Map vs POJO types.` but vaguely refers to an "allowlist array" without naming it.
**Truth:** If a new map field is added to `WorldState`, its key must be explicitly added to the hardcoded `isMapField` array inside `EntityService.ensureNestedState()`. Otherwise, it silently becomes an object `{}` and causes runtime crashes when map methods are called.
**Watch:** `src/engine/core/EntityService.ts` when adding any new `IdMapRuntime` fields to `WorldState`.
