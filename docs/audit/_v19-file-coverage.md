# v19 File Coverage Manifest

Generated 2026 from `git diff d04a55e8..HEAD --name-only` (delta-only review —
v18 already covered ~1,129 files; unchanged files were not re-read).
Legend: [x] = read/reviewed/touched this consolidation; [t] = exercised by test
suites only; [D] = deleted.

## Production source touched

- [x] src/engine/calendar/calendar.ts — S7-48 year-aware basho info
- [x] src/engine/calendar/schedule.ts — V19-N1 day threading
- [x] src/engine/calendar/scheduleHelpers.ts — V19-N1 + unused-import cleanup
- [x] src/engine/core/idIntegrity.ts — recordsBroken reader removed
- [x] src/engine/core/SimulationRunner.ts — SIM_FULL_BASHO chain cleanup
- [x] src/engine/economy/GlobalCupService.ts — recordsBroken init removed
- [x] src/engine/economy/economics.ts — handleInsolvency removed
- [x] src/engine/economy/koenkaiDemands.ts — S7-29 symmetric churn
- [x] src/engine/economy/loans.ts — S5-5 seed fix
- [x] src/engine/generation/CandidatePoolService.ts — S7-35 per-suitor deadlines
- [x] src/engine/generation/RecruitmentController.ts — S7-23/day threading
- [x] src/engine/generation/TalentPoolMaterialization.ts — pin-site
- [x] src/engine/generation/TalentPoolStateService.ts — injectRikishiAsCandidate removed
- [x] src/engine/governance/myosekiMarket.ts — S7-39 kabu list
- [x] src/engine/governance/services/GomenfudaService.ts — S7-31 persistent counter
- [x] src/engine/governance/services/YokozunaService.ts — S7-28 real records
- [x] src/engine/governance/services/governanceReview.ts — runRetirements wrapper removed
- [x] src/engine/health/RecoveryService.ts — purity refactor {recovered, rikishi}
- [x] src/engine/history/EraDriftService.ts — pin-site
- [D] src/engine/history/historyCache.ts — dead pairwise chain
- [x] src/engine/keshoMawashi/HeyaBrandGenerator.ts — getHeyaBrand removed
- [x] src/engine/lifecycle/BashoHistory.ts — pin-site
- [x] src/engine/matchmaking/DramaMatchmaker.ts — S7-44 canonical rewire
- [x] src/engine/matchmaking/SwissAlgorithm.ts — S7-44 call-site wiring
- [x] src/engine/npc/LeaguePerception.ts — pin-site
- [x] src/engine/recruitment/YouthAcademyService.ts — S7-38 cap + buildPromotedRikishi split
- [x] src/engine/recruitment/scoutingStore.ts — ensureScoutingTable removed
- [x] src/engine/simulation/AutoSimService.ts — S5-4 seed serial + V19-B1 stop-cond fix
- [x] src/engine/simulation/ChronicleService.ts — addRecord/recordsBroken removed
- [x] src/engine/training/MentorshipService.ts — S7-37 effective ceiling
- [x] src/engine/training/SparringService.ts — S7-36 injury pause + S7-37
- [x] src/engine/types/records.ts — ChronicleRecordEntry/recordsBroken removed
- [x] src/engine/types/world.ts — recordsBroken removed
- [x] src/engine/utils/math.ts — localClampInt removed
- [x] src/engine/utils/string.ts — formatShikona removed
- [x] src/engine/worldCircuit/WorldCircuitService.ts — S7-24 styleDrift clamp
- [D] src/engine/almanac/heyaRecord.ts — generateHeyaRecord fully dead
- [x] src/engine/almanac/index.ts — barrel cleanup
- [x] src/engine/almanac/snapshot.ts — stale comment fix
- [x] src/engine/persistence/MigrationService.ts — version-gate rewrite
- [x] src/engine/banzuke/banzukeOps.ts — allocateVacancies (#1201 payload)
- [x] src/engine/bard/domains/post_basho_press.json — coach_criticism dead key removed

## UI touched

- [x] src/components/scouting/perceptionComponents.tsx — S8-3d compliance labels
- [x] src/components/stable/InfrastructureSections.tsx — S8-3c canonical constant
- [x] src/pages/RecapPage.tsx — S8-3a route fix
- [x] src/pages/RegionalHubPage.tsx — V19-N4 dead statement removed
- [x] src/pages/SchedulePage.tsx — S8-3b selectedDay fix
- [x] src/state/game/bashoSlice.ts — SIM_FULL_BASHO removal
- [x] src/state/game/gameActions.ts — SIM_FULL_BASHO removal
- [x] src/state/game/gameReducer.ts — SIM_FULL_BASHO removal
- [x] src/state/game/gameTypes.ts — SIM_FULL_BASHO union member removed

## Tests touched

- [x] tests/unit/engine/consolidation/v19Regressions.test.ts — 21 pins
- [x] tests/slow/engine/simulation/v19BashoSeed.test.ts — S5-4 pin (relocated)
- [x] tests/unit/audit/unreferenced-exports.test.ts — classifications synced
- [x] tests/unit/audit/world-circuit-surface.test.ts — marker updated
- [x] tests/unit/audit/functionLengthBudget.test.ts — (gate held; promoteIntake split)
- [x] tests/unit/meta/factoryDiscipline.test.ts — S9-5 regex + allowlist
- [x] tests/slow/audit/knipGuard.test.ts — self-contained dead-file scan
- [x] tests/slow/audit/circularDependency.test.ts — stderr marker capture
- [x] tests/slow/audit/bundleBudget.test.ts — per-emitted-file budgets
- [x] tests/slow/audit/determinismDoubleRun.test.ts — year case added
- [x] tests/slow/engine/simulation/autoSimCoreLoop.test.ts — S7-23 semantics
- [x] tests/unit/engine/recruitment/v18Poaching.test.ts — per-suitor fixture
- [x] tests/unit/engine/systems/training/mentorshipTick.test.ts — ceiling contract
- [x] tests/unit/engine/systems/training/SparringService.test.ts — pause contract
- [x] tests/unit/components/game/perceptionComponents.test.tsx — label regex
- [x] tests/unit/engine/services/serviceObjects.characterization.test.ts — snapshot regen
- [D] tests/unit/engine/economics.test.ts — whole file pinned dead handleInsolvency
- [D] tests/unit/engine/storage/historyCache.test.ts — orphaned module test
- [x] tests/unit/engine/systems/generation/talentPoolService.test.ts — internal API repoint
- [x] tests/unit/engine/{lifecycle,governance} retirement tests — repointed to processAllRetirements
- [x] tests/unit/contexts/*bashoSlice*/gameReducer — dead-action blocks removed
- [x] tests/unit/engine/persistence/MigrationService* — rewritten to version-gate

## Manifests/housekeeping

- [x] .windsurf/audit/baseline-orphans.json — 176→171 (dead symbols pruned + ORPH-0578)
- [x] .windsurf/audit/orphan-tracker.csv — regenerated from baseline
- [D] scripts/sim/bard-warning-census.txt, population-flow-results.txt — tracked junk
- [x] docs/audit/test-timings.json — re-baselined
- [x] .gitignore — scripts/sim/*.txt rule added
