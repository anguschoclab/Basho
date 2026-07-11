## 2025-02-24 - [CombatArchetype UI Typings]
**Finding:** `CombatArchetype` was being cast to `any` in multiple UI components when passed to `getCombatArchetypeDescription()`.
**Learning:** The `UIRikishi` presenter object was discarding the raw `CombatArchetype` string union, forcing the UI to either guess or `as any` cast when passing to domain functions.
**Constraint:** When projecting domain entities to UI models, we should preserve strongly-typed union types if they are required as inputs to UI-layer helper functions.
