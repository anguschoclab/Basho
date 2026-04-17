1. **Refactor `src/engine/npcRetirementStrategy.ts` to DRY up retirement execution**
   - Extract a `executeRetirement(world, heya, rikishi, reason)` helper function to encapsulate the repeated logic of emitting the lifecycle event, removing the rikishi from the heya, and deleting the rikishi from the world.
   - Update all `evaluateRetirements` methods (`TraditionalistRetirementStrategy`, `ScientistRetirementStrategy`, `GamblerRetirementStrategy`, etc.) to use this new helper.

2. **Refactor `src/engine/npcSponsorStrategy.ts` to DRY up sponsor recruitment**
   - Extract shared calculations into pure functions: `getRunwayMonths(heya)` and `getCurrentSponsorCount(pool, heya)`.
   - Extract a `executeSponsorRecruitment(world, heya, oyakata, selectedSponsor, strength, reasoning)` helper to encapsulate creating the relationship, updating the sponsor, and emitting the `managementDecision` event.
   - Update all `evaluateSponsorRecruitment` methods (`TraditionalistSponsorStrategy`, `ScientistSponsorStrategy`, etc.) to use these helpers.

3. **Verify the refactoring**
   - Use `run_in_bash_session` to execute the full test suite (`bun run test`) to ensure no existing functionality was altered.
   - Use `npx jscpd src/engine src/components --min-lines 15` to verify the cloned logic was eliminated.

4. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

5. **Submit a "Refactor: DRY Consolidation" PR**
   - Commit the changes and submit the pull request with appropriate title and description.
