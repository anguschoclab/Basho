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
## 2026-07-27 - Tighten Rikishi stat types in boutUtils
**Finding:** `h2hConfidence`, `tachiaiPowerWithMatchupPenalty`, and `stat` used `as unknown as Record<string, unknown>` to bypass types and read properties like `h2h` and `style`.
**Learning:** These properties are formally typed on the `Rikishi` interface now, making the `unknown` casting redundant and weakening type safety.
**Constraint:** Directly access properties (`r.h2h`, `opponent.style`, `r.weakAgainstStyles`) and limit casts to explicit valid subsets (like `Record<string, unknown>` for dynamic reads) instead of fully breaking the type chain.
## 2025-08-01 - [Tighten CandidateDigestEntry and engine worker command types]

**Finding:** Used `as any` when passing `comparisonPair.a` and `comparisonPair.b` to `<CompareModePanel>` where `CompareModePanel` expected `UIRikishi` but `comparisonPair` contained objects deriving from `CandidateDigestEntry`. The worker script also casted `command` to `any` when invoking the message handler.
**Learning:** `CandidateDigestEntry` differs structurally from `UIRikishi` (it doesn't map 1-to-1 to core Rikishi properties, but is a partial proxy for UI purposes). Using `unknown` as an intermediate cast (e.g. `as unknown as UIRikishi`) bridges the type safely for UI projection without dropping `strictNullChecks` or masking underlying object shapes with `any`. In the worker, the message handler was weakly typed due to how TS infers generic union discrimination inside an object literal (`COMMAND_HANDLERS`); assigning an explicit function type `((cmd: EngineCommand) => void)` tightens it and removes the need for `any`.
**Constraint:** Avoid `as any` in React prop passing, even for cross-domain representations. Use `as unknown as TargetType` if structural compatibility is guaranteed but mathematically unprovable by TS. In generic dispatch tables, explicitly type the handler lookup to preserve union constraints.

## 2025-07-29 - [Tighten Type in UI Projections]

**Finding:** Numerous properties were accessed in UI projections (`medicalProjection.ts`, `governanceProjections.ts`, `stableProjections.ts`) by blindly type-casting domains objects to `unknown` and then arbitrary records (e.g. `(heya as unknown as Record<string, unknown>).scandalScore as number`).
**Learning:** Properties like `scandalScore`, `governanceStatus`, `politicalCapital` on `Heya` and `condition` on `Rikishi` are already strictly typed in the domain types. Type-gymnastics via `unknown` weaken downstream validation. We can directly access these properties (and use `??` for nullable ones).
**Constraint:** Avoid redundant `unknown` casting for UI projection files if the domain entity correctly exposes the field. Let TypeScript validate property access naturally.
## 2024-08-04 - Tighten WelfareState in medicalProjection
**Finding:** `heya.welfareState` was being cast with `as unknown as { morale?: number }` to extract a `morale` property that isn't actually part of the `WelfareState` type in `src/engine/types/economy.ts`.
**Learning:** `WelfareState` track compliance and risk metrics (welfareRisk, activeDiet, complianceState, weeksInState) but doesn't have a `morale` property. The medical projection used this hallucinated type cast, meaning the `morale` would always effectively fall back to the default `50` at runtime, providing a false sense of a working feature.
**Constraint:** If `morale` needs to be tracked on a stable level, it must be added to the appropriate engine state types (like `WelfareState` or `Heya` directly) rather than relying on an unsafe cast that hides its non-existence. Currently, falling back safely via optional chaining (`?.morale`) causes a type error since it doesn't exist, so this will be corrected to either properly define it in types or safely ignore it until implemented.
