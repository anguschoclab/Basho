## 2025-02-24 - [CombatArchetype UI Typings]
**Finding:** `CombatArchetype` was being cast to `any` in multiple UI components when passed to `getCombatArchetypeDescription()`.
**Learning:** The `UIRikishi` presenter object was discarding the raw `CombatArchetype` string union, forcing the UI to either guess or `as any` cast when passing to domain functions.
**Constraint:** When projecting domain entities to UI models, we should preserve strongly-typed union types if they are required as inputs to UI-layer helper functions.
## 2025-05-15 - Typed tone assignment in RivalryService

**Finding:** The variable `tone` was implicitly inferred as `string`, which required an unsafe `as any` cast when assigning it to `pair.tone` since the target type is the strict union `RivalryTone`.
**Learning:** By typing the initial variable `let tone: RivalryTone = "respect";`, the subsequent `.pick()` call and assignment can statically guarantee they conform to the literal union.
**Constraint:** All emotional or state-flavor enum-like string literals should be strongly typed at declaration rather than forcefully cast upon assignment.
## 2025-02-28 - Tighten updateWorldField types
**Finding:** The `updateWorldField` in `src/engine/core/ImpactBuilder.ts` was missing the `lineage` field, leading to a weak type cast `builder.updateWorldField("lineage" as any, currentLineage);` in `src/engine/lineage.ts`.
**Learning:** The ImpactBuilder types are tightly bound to a subset of WorldState fields. When new fields are added to WorldState and mutated via ImpactBuilder, the ImpactBuilder type definitions must be explicitly updated.
**Constraint:** Any future top-level WorldState fields that are modified via ImpactBuilder must be added to the generic type constraints in `updateWorldField` and `updateWorldFieldImpact`.
