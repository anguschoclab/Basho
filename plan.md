1. **Target**: `needsScheduleForDay` in `src/engine/calendar/scheduleHelpers.ts`
   - **Current State**: Very terse JSDoc (`/** Check if a specific day needs scheduling for a division. */`).
   - **Action**: Replace it with a robust JSDoc specifying the contract. Outline units (1-indexed days), valid ranges ([1, 15]), determinism/purity (pure function without side effects), and logic constraints (lower divisions only fight on odd days up to day 13).
2. **Update Persona Journal**: `.jules/scribe.md`
   - Document a specific codebase learning: the implicit 1-based indexing for basho days in scheduling functions.
3. **Verify**: Use `cat` on `.jules/scribe.md` to confirm the update.
4. **Pre-commit Steps**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
5. **Submit Change**: Submit a PR titled "📜 Scribe: document needsScheduleForDay contract" detailing what was clarified, the contract gaps filled, and verification approach.
