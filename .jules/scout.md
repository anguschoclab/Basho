## 2025-02-27 - Test Fix for MediaStateService

**Gap:** The media tests failed when we introduced `welfareState` to the `Heya` type without updating `MockFactory`.
**Learning:** When altering core engine types that are used implicitly via `MockFactory`, all upstream tests that depend on the complete object topology might fail.
**Pattern:** For core system objects like `Heya`, always update `MockFactory.createHeya` with sensible defaults when adding new required nested objects (like `welfareState`).

## 2025-02-27 - Test Fix for Oyakata Personalities

**Gap:** The tests for `OyakataStylePreferences` and `OyakataPersonalities` threw runtime TypeError because they relied on a missing mock generator (`MockFactory.createOyakata`).
**Learning:** While some modules might appear independent, they often assume standard engine state factories exist.
**Pattern:** Ensure `MockFactory` is complete for all entity types (`Rikishi`, `Heya`, `Oyakata`, `Staff`, etc.) before writing tests that construct interconnected objects.

## 2024-05-24 - WelfareCalculations Coverage

**Gap:** The pure math module `WelfareCalculations.ts` lacked tests, leaving injury severity weighting, negligence detection, and welfare delta accumulation untested.
**Learning:** Pure functions containing key simulation constants and game logic require coverage even if they only map state properties. The simulation math must be explicitly locked in.
**Pattern:** For engine rules like `WelfareCalculations.ts`, we mock `WorldState` and `Heya` with `MockFactory`, push state overrides, and verify specific numerical rules/strings out (like `reasons` delta arrays).

## 2025-02-27 - Test Fix for NPCGovernanceCalculator

**Gap:** The `NPCGovernanceCalculator.ts` file lacked explicit unit tests for the pure calculation logic of NPC governance decisions, leaving the specific thresholds, conditions, and StateImpact patch generations unverified against regression.
**Learning:** Pure calculation modules for NPC strategy (like governance) manage complex conditionals involving traits and threshold values. Because they interact dynamically via `StateImpact`, changes in `createImpactBuilder` or core NPC entity definitions could silently break specific strategy actions if not explicitly tested.
**Pattern:** For NPC strategy calculation modules, construct an isolated `StrategyContext` using `MockFactory` to scaffold the `WorldState`, target `Heya`, and target `Oyakata`. Systematically mutate the context parameters (e.g., `scandalScore`, `politicalCapital`, `archetype`, `temperament`) and verify that `evaluateGovernanceStrategy` generates the expected `heyaUpdates` patches and `events` in its returned `StateImpact`.

## 2025-02-27 - Scout: test TrainingMath core growth calculations

**Gap:** The primary math functions `calculateGrowthVector`, `calculateGains`, and `calculateAgeDecay` in `TrainingMath.ts` were previously completely untested, which represents significant risk since this dictates core progression mechanics.
**Learning:** The testing context in `calculateGrowthVector` takes many nested mock properties (factions, rivalries), so ensuring these are explicitly set using `MockFactory` is necessary.
**Pattern:** Construct `WorldState` and `Heya` using `MockFactory.createWorld` and `createHeya` with appropriate overrides for nested faction/rivalry data. `import` statements at the top level are preferable.

## 2025-02-27 - Test Fix for citizenshipUtils.ts

**Gap:** The utility functions in `citizenshipUtils.ts` (e.g., `getCitizenshipStatus`, `countsAsForeign`, `yearsUntilNaturalization`, `getHeyaForeignUsage`, `isAtForeignLimit`) lacked unit tests, leaving the core rules around foreign recruitment and naturalization untested against regressions.
**Learning:** These utility functions contain complex boundary checks related to joined dates and specific string comparisons (e.g., "Japan" vs "Japanese"). Modifying these functions without tests could easily break foreign recruitment rules in the game.
**Pattern:** Construct `Rikishi` objects using `MockFactory.createRikishi` with specific combinations of `nationality`, `citizenshipStatus`, and `joinedHeyaDate` to verify all possible permutations of citizenship status and boundary conditions for naturalization.

## 2025-02-27 - Test naturalization eligibility and RNG chance logic

**Gap:** `checkNaturalizations` in `naturalization.ts` was entirely untested. This core logic handles when and if foreign rikishi gain Japanese citizenship, which unlocks their stable's foreign slot (a major strategic constraint).
**Learning:** `checkNaturalizations` relies on `rngFromSeed` which uses the rikishi's ID and the current year. To deterministically test the ~5% chance passing or failing, specific IDs that yield passing (`< 5`) or failing (`> 5`) RNG outputs must be brute-forced or hardcoded (`rikishi_24` passes in `2025`). Also, `createImpactBuilder` stores patches in `impact.entities.rikishiUpdates` map, not a flat object.
**Pattern:** For modules relying on rare RNG chances tied to entity IDs, write a small scratchpad script to find an ID that yields a passing roll for a given seed setup. For state verification, check `impact.entities.rikishiUpdates.get(id)` instead of expecting direct mutation.
