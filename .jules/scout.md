## 2025-02-27 - Test TrainingMath deterministic functions
**Gap:** `TrainingMath.ts` has pure functions like `getStatCeiling`, `getEffectiveCeiling`, and `diminishingReturnsMult` that were almost totally uncovered by tests (except for one test asserting `getStatCeiling(95) > 80`). These calculate important boundaries for stat growth simulation and needed explicit assertions of their formula behaviors across edge cases.
**Learning:** These math functions are pure and easy to test without full simulation setups. `MockFactory` supplies enough partial states for `getEffectiveCeiling`.
**Pattern:** Directly assert deterministic formulas with exact boundary values (0, mid-range, exceeding max) rather than random property-based testing.
