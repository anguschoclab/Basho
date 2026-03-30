1. **Understand the Goal**: The task requires adding a unit test for `createDefaultMediaState` in `src/engine/media.ts`. The missing test is highlighted as a gap in test coverage.

2. **Identify Existing Testing Patterns**: Looking at `src/engine/__tests__`, I see many `.test.ts` files using `vitest` (e.g., `import { describe, it, expect } from 'vitest';`).

3. **Plan the Test File**: Create `src/engine/__tests__/media.test.ts`.

4. **Plan the Tests**:
   - Import `createDefaultMediaState` from `../media`.
   - Test that `createDefaultMediaState` returns the correct shape and initial values:
     - `version` is "1.0.0"
     - `headlines` is an empty array `[]`
     - `mediaHeat` is an empty object `{}`
     - `heyaPressure` is an empty object `{}`
     - `bashoStreaks` is an empty object `{}`
     - `streakHeadlinesFired` is an empty object `{}`
     - `promoWatchFired` is an empty object `{}`
     - `retirementWatchFired` is an empty object `{}`
     - `titleRaceDayFired` is an empty object `{}`
     - `injuryWithdrawalFired` is an empty object `{}`
     - `mediaHeatHistory` is an empty object `{}`
   - Ensure the objects are independent references (i.e. fresh objects).

5. **Run Pre-commit Checks**: Run vitest `bun test src/engine/__tests__/media.test.ts` and ensure it passes. Pre-commit instructions as usual.

6. **Submit PR**: Write the commit message as described.
