## 2025-03-02 - Cleaned up type casts in EntityService
**Finding:** `EntityService.ensureState` and `EntityService.ensureNestedState` heavily relied on `as unknown as Record<string, unknown>` to bypass TypeScript's type checking for assignment.
**Learning:** `Object.assign` provides a type-safe way to mutate objects dynamically without violating strict TypeScript constraints or needing double casting (`as unknown as Record<string, unknown>`). It safely updates properties dynamically.
**Constraint:** Use `Object.assign` for dynamic field initialization rather than bypassing the compiler with `as unknown as Record`.
