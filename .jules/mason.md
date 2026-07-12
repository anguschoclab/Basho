## 2025-02-24 - [CombatArchetype UI Typings]
**Finding:** `CombatArchetype` was being cast to `any` in multiple UI components when passed to `getCombatArchetypeDescription()`.
**Learning:** The `UIRikishi` presenter object was discarding the raw `CombatArchetype` string union, forcing the UI to either guess or `as any` cast when passing to domain functions.
**Constraint:** When projecting domain entities to UI models, we should preserve strongly-typed union types if they are required as inputs to UI-layer helper functions.
## 2025-05-15 - Typed tone assignment in RivalryService

**Finding:** The variable `tone` was implicitly inferred as `string`, which required an unsafe `as any` cast when assigning it to `pair.tone` since the target type is the strict union `RivalryTone`.
**Learning:** By typing the initial variable `let tone: RivalryTone = "respect";`, the subsequent `.pick()` call and assignment can statically guarantee they conform to the literal union.
**Constraint:** All emotional or state-flavor enum-like string literals should be strongly typed at declaration rather than forcefully cast upon assignment.
