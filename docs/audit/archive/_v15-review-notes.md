# v15 Review Working Notes (findings feed consolidation-verdict-v15.md)

Buckets: BUG (fix now, test-first) / DEBT (defer, prioritized) / VERIFIED-GOOD / DISPROVED

## Validated-during-planning (carried from plan-f8972b591e49b532 Validation Record)
- V1 #1170: arrayAppends missing from isStateImpact — real gap (StateImpact.ts:297-313), but guard has NO production callers (pipelineRunner.ts:133 uses inline `"metadata" in result`). Fix = completeness, not dropped-impact bug.
- V13 NEW-DEBT: pipelineRunner detects impacts via `"metadata" in result`; a metadata-less hand-built impact would be treated as WorldState and clobber it. Latent (ImpactBuilder ctor always sets metadata via createEmptyImpact).
- V7 NEW-DEBT: needsScheduleForDay (scheduleHelpers.ts:99-110) does not enforce day>=1 for upper divisions; doc's "strictly 1-indexed" is convention not enforcement.
- V5 nit: pre-existing inline `import("@/engine/types/rikishi")` type at phase01_week_npc_ai.ts:281 → hoist to import type.

## T-hunt results on baseline HEAD 7dafc74c

### T1 determinism — mostly clean
- No Math.random in engine. `new Date(year,month,1)` calendar.ts:250 deterministic; formatters.ts:25 formats given ISO (deterministic).
- DEBT-cosmetic: Logger.ts:51 `new Date()` timestamp — verify it never writes into world/digest state.
- DEBT-cosmetic: MigrationService.ts:55 `new Date().toISOString()` — fills createdAtISO on migration only (save metadata, not sim state).

### T5 silent failure — clean-ish
- Zero empty catches. 3 catch→fallback: opfsArchive.ts:348,396 (IO boundary, return []/null — defensible), KimariteSelectionEngine.ts:218 (return false — check logging).

### T6 casts — clean
- `as any`: 0 real (3 comment-word hits). `as unknown`: 15 sites — boundary casts; MigrationService×6 defensible; RecruitingTabSections.tsx:378-379 `as unknown as UIRikishi` (v14 DEBT, still present).
- ts-ignore/ts-expect-error/eslint-disable: 0.

### T8 test quality
- 1 conditional skip (electronStorageProvider.test.ts:285, env-gated — legit). No .skip/.todo debt found at top level.

### T4 orphans (audit-orphans.ts) — see below
- duplicateExports: 0. designScan: 0 violations.
🔍 Running orphan audit...

  Unreferenced exports: 241
  Orphan routes: 0
  Unticked services: 9
  Unused components: 0
  Write-only state fields: 0

📄 JSON report: .windsurf/audit/baseline-orphans.json
📊 CSV tracker: .windsurf/audit/orphan-tracker.csv

────────────────────────────────────────────────────────────
TOTAL ORPHANS: 250
────────────────────────────────────────────────────────────

Unreferenced Exports (241):
  [P3] src/engine/banzuke/banzukeOps.ts → computeVariableSanyakuCounts
  [P3] src/engine/bard/BardEngine.ts → interpolate
  [P3] src/engine/bard/dramaGenerator.ts → checkTriggeredDrama
  [P3] src/engine/bard/dramaGenerator.ts → checkBashoDayDrama
  [P3] src/engine/bard/dramaGenerator.ts → triggerCrisis
  [P3] src/engine/bard/narrativeContext.ts → VENUE_PROFILES
  [P3] src/engine/basho/ExhibitionBashoService.ts → isExhibitionBasho
  [P3] src/engine/basho/ExhibitionBashoService.ts → isHonbasho
  [P3] src/engine/basho/NakabiService.ts → NAKABI_DAY
  [P3] src/engine/bout/BoutAI.ts → chooseBaseTactic
  ... and 231 more

Unticked Services (9):
  [P3] src/engine/almanac/index.ts → index
  [P3] src/engine/bout/ReplayMetadata.ts → ReplayMetadata
  [P3] src/engine/bout/kimarite/index.ts → index
  [P0] src/engine/economy/awards.ts → awards
  [P3] src/engine/keshoMawashi/KeshoMawashiGenerator.ts → KeshoMawashiGenerator
  [P3] src/engine/lifecycle/CareerService.ts → CareerService
  [P3] src/engine/lifecycle/rookieFactory.ts → rookieFactory
  [P1] src/engine/narrative/narrativeDescriptions.ts → narrativeDescriptions
  [P3] src/engine/rikishi/signatureKimarite.ts → signatureKimarite

✅ Audit complete.

### T4 orphans (full head)
🔍 Running orphan audit...

  Unreferenced exports: 241
  Orphan routes: 0
  Unticked services: 9
  Unused components: 0
  Write-only state fields: 0

📄 JSON report: .windsurf/audit/baseline-orphans.json
📊 CSV tracker: .windsurf/audit/orphan-tracker.csv

────────────────────────────────────────────────────────────
TOTAL ORPHANS: 250
────────────────────────────────────────────────────────────

Unreferenced Exports (241):
  [P3] src/engine/banzuke/banzukeOps.ts → computeVariableSanyakuCounts
  [P3] src/engine/bard/BardEngine.ts → interpolate
  [P3] src/engine/bard/dramaGenerator.ts → checkTriggeredDrama
  [P3] src/engine/bard/dramaGenerator.ts → checkBashoDayDrama
  [P3] src/engine/bard/dramaGenerator.ts → triggerCrisis
  [P3] src/engine/bard/narrativeContext.ts → VENUE_PROFILES
  [P3] src/engine/basho/ExhibitionBashoService.ts → isExhibitionBasho
  [P3] src/engine/basho/ExhibitionBashoService.ts → isHonbasho
  [P3] src/engine/basho/NakabiService.ts → NAKABI_DAY
  [P3] src/engine/bout/BoutAI.ts → chooseBaseTactic
  ... and 231 more

Unticked Services (9):
  [P3] src/engine/almanac/index.ts → index
  [P3] src/engine/bout/ReplayMetadata.ts → ReplayMetadata
  [P3] src/engine/bout/kimarite/index.ts → index
  [P0] src/engine/economy/awards.ts → awards
  [P3] src/engine/keshoMawashi/KeshoMawashiGenerator.ts → KeshoMawashiGenerator
  [P3] src/engine/lifecycle/CareerService.ts → CareerService
  [P3] src/engine/lifecycle/rookieFactory.ts → rookieFactory
  [P1] src/engine/narrative/narrativeDescriptions.ts → narrativeDescriptions
  [P3] src/engine/rikishi/signatureKimarite.ts → signatureKimarite

✅ Audit complete.

## File census
    1087

### Logger usage — does it write to world?
src/engine/utils/Logger.ts:2: * Logger.ts — Centralized logging utility for the engine.
src/engine/utils/Logger.ts:17:export class Logger {
src/engine/utils/Logger.ts:18:  private static instance: Logger;
src/engine/utils/Logger.ts:25:  static getInstance(): Logger {
src/engine/utils/Logger.ts:26:    if (!Logger.instance) {
src/engine/utils/Logger.ts:27:      Logger.instance = new Logger();
src/engine/utils/Logger.ts:29:    return Logger.instance;
src/engine/utils/Logger.ts:45:  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {

### uiWorldRevision sync — world writes in slices
src/state/game/gameHelpers.ts:88:  return { ...state, world: resolveImpacts(state.world, [impact]) };
src/state/game/gameHelpers.ts:94:  return { ...state, world: resolveImpacts(state.world, impacts) };
src/state/game/gameTypes.ts:99:  world: null,
src/state/game/bashoSlice.ts:64:        world: {
src/state/game/provider/useWorkerSync.ts:86:    sendCommand({ type: "LOAD_WORLD", world: state.world });
src/state/game/gameReducer.ts:20:        world: action.world,
src/state/game/gameReducer.ts:30:        world: action.world,

### Orphan-classification findings (V15-B01/B02 candidates)
- baseline-orphans.json regen: 234→250 total (exports 226→241, unticked 8→9). 22 new candidates, 6 resolved.
- koenkaiDemands.ts: module IS wired (LoopDecisionEngine.ts:22, phase05_monthly_boundary.ts:30); 6 aux exports orphaned: 2 types (intentional), KOENKAI_DEMANDS+koenkaiDemandDecisionId (test-pinned→intentional), KOENKAI_DEMAND_PROBABILITY+applyDemandOutcome (in-file used→intentional).
- staffPosts.ts: module live; 7 internal helpers test-pinned→intentional; ensureStaffPosts+postVacant DEAD (zero refs incl. in-file; ensureStaffPosts also buggy—builds unattached object) → REMOVE in Phase 5.
- physioPurchase/staffPosts/decisionQueue/scoutMissions/weeklyTraining/harmony constants+helpers → intentional (test-pinned or in-file used).
- signatureKimarite.ts:signatureKimarite = unticked-service entry (filename-as-symbol); module consumed via engineAccess+RikishiCarePanel → intentional.
- Stale map keys to remove: staff.ts:generateStaff, BodyDefinitions×2, types.ts:RikishiLoyaltyBand, LoopDecisionEngine×2.

### Misc
- Header-doc gap: 1 files lack header comment (mostly pages/presenters/state).
- applyImpacts/applyImpactToGameState (gameHelpers.ts:88,94): zero prod callers → orphan-candidates (already in baseline?).
- uiWorldRevision: all slice world-writes bump; UPDATE_WORLD correctly doesn't (worker→UI echo protection).
