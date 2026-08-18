## 2025-02-18 - Remove `as unknown` casts in LegacyService and EntityService
**Finding:** Found multiple `as unknown as Record<string, unknown>` and `as unknown as Parent[Key]` casts when mutating state generically.
**Learning:** These casts were bypassing type checks for assignment instead of using type-safe keys or `Object.assign`. In `LegacyService`, they casted an entire object to assign to a string key instead of establishing a strict union type for numeric keys (`NumericStatKey`).
**Constraint:** Avoid using `as unknown as Record<string, unknown>` to bypass assignment types. Use strict key subsets (`type NumericStatKey = ...`) to assert the exact union of expected keys, or `Object.assign` to safely set values on objects.
