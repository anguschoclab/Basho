## 2024-03-24 - Tighten Type Casts in EntityService
**Finding:** `EntityService.ensureState` and `ensureNestedState` were bypassing compiler assignment checks using `(parent as unknown as Record<string, unknown>)[key as string] = value`.
**Learning:** Using `Object.assign(parent, { [key]: value })` safely handles property addition without violating generic constraints or needing brute-force type assertions like `as unknown`.
**Constraint:** Generic entity modification functions should prefer standard object mutation patterns (like `Object.assign`) rather than recasting the entire target object to a loose dictionary type.
