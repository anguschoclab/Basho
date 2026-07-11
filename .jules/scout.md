## 2025-02-27 - Test TrainingMath deterministic functions
**Gap:** `TrainingMath.ts` has pure functions like `getStatCeiling`, `getEffectiveCeiling`, and `diminishingReturnsMult` that were almost totally uncovered by tests (except for one test asserting `getStatCeiling(95) > 80`). These calculate important boundaries for stat growth simulation and needed explicit assertions of their formula behaviors across edge cases.
**Learning:** These math functions are pure and easy to test without full simulation setups. `MockFactory` supplies enough partial states for `getEffectiveCeiling`.
**Pattern:** Directly assert deterministic formulas with exact boundary values (0, mid-range, exceeding max) rather than random property-based testing.
## 2025-02-27 - Test TrainingMath deterministic functions (Part 2)
**Gap:** `TrainingMath.ts` functions like `normalizeTrainingProfile`, `calculateFatigueDelta`, and `getCareerPhase` lacked unit test coverage.
**Learning:** Pure functions dictating threshold behavior (like `getCareerPhase` switching from prime to veteran) and complex multiplier stacking (like `calculateFatigueDelta` combining intensity, recovery, and focus multipliers) are straightforward to test without integration baggage.
**Pattern:** Directly assert numeric boundary outputs and specific combination calculations for deterministic math functions to lock in correct boundary and threshold behaviors.
