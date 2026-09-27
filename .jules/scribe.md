## $(date +%Y-%m-%d) - H2HRecord.streak Directionality
**Gap:** The `H2HRecord.streak` property's specific directionality (positive for active winning streaks, negative for active losing streaks) and its behavior on breaking a streak (resetting directly to 1 or -1, bypassing 0) was undocumented in the type definition, leading to potential confusion for UI/AI consumers.
**Truth:** The `H2HRecord.streak` property uses its sign to encode directionality. A positive value means an active winning streak, and a negative value means an active losing streak. When a streak breaks, it resets directly to 1 or -1. This drives narrative evaluation mapping to `winning_streak` or `losing_streak` templates.
**Watch:** `src/engine/h2h.ts` and `src/engine/types/records.ts`
## 2023-10-27 - Pipeline Phase Snapshot Immunity for Pure Phases
**Gap:** The documentation on `PipelinePhaseMetadata.pure` was slightly hidden in `pipelineRunner.ts` and the `pure: true` contract wasn't fully documented directly on the type where consumers define their pipeline phases.
**Truth:** In `src/engine/tick/pipelineRunner.ts`, the `pure` flag in `PipelinePhaseMetadata` is correctly honored by the runner (passing `touches: []`), which successfully skips snapshotting during `createShallowSnapshot` without triggering a fallback. Consequently, pure phases have zero rollback protection and are completely vulnerable to state corruption if they illegally mutate state in-place before throwing an error.
**Watch:** `src/engine/tick/pipelineRunner.ts`
