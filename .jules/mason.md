# Mason Learnings Log

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

## 2025-02-28 - [Tighten Type in SimulationRunner vacancies extraction]

**Finding:** `vacanciesByHeyaId` was extracted from `retirementImpact.metadata` using an intermediate `as unknown` cast.
**Learning:** `metadata` property on `StateImpact` is typed as `{ source: string, timestamp?: number, [key: string]: unknown }` which already allows index-signature access for any property like `vacanciesByHeyaId`. No intermediate `as unknown as Record<string, unknown>` is needed.
**Constraint:** Use the existing index signature in `metadata` directly rather than polluting the code with unneeded and unsafe type casts.

## 2025-07-22 - Remove redundant type casts in CandidateBuilder and phase01_daily_welfare

**Finding:** Found multiple uses of `as unknown as Rikishi` in `src/engine/systems/generation/CandidateBuilder.ts` and `as unknown as import("../../types/rikishi").Rikishi` in `src/engine/tick/phases/phase01_daily_welfare.ts`.
**Learning:** These casts were redundant and unsafe. By using `as Rikishi`, we tighten the types and ensure compile-time checks without changing behavior.
**Constraint:** Future object construction should conform to the expected types instead of relying on `as unknown as Type` to bypass validation.

## 2025-05-23 - [Tighten Rikishi descriptor type]

**Finding:** `Rikishi["descriptor"]` was loosely typed as an object with `[key: string]: unknown`, leading to a weak `as unknown as Rikishi["descriptor"]` cast in `phase01_daily_welfare.ts` when assigning `toRikishiDescriptor()`.
**Learning:** By importing the concrete `RikishiDescriptor` interface from `descriptorBands.ts` into the main `rikishi.ts` types, we remove the need for intermediate casts and correctly surface the structure to presenters.
**Constraint:** Shared types used for complex entity states (like descriptor strings) must be defined properly and linked instead of relying on loose inline objects and casting.

## 2025-10-25 - Tighten EngineCommand payload types

**Finding:** `HIRE_STAFF` and `SET_TRAINING_STATE` actions inside `src/engine/worker/types.ts` accepted their payloads as `any` instead of `StaffRole` and `HeyaTrainingState`.
**Learning:** The EngineCommand is a critical boundary between the UI and worker threads. Typing its payloads strongly ensures type checking flows through the serialization boundary safely.
**Constraint:** Payloads sent via the worker message bridge (`EngineCommand`) must use strongly-typed definitions via inline imports, avoiding `any` completely.
