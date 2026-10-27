# Reorg Move-Map — Phase 0 (2026-10-27)

Complete old→new mapping for the harmonization reorg. Every `git mv` +
import-rewrite derives from this file. Verified with multi-depth specifier
import counts (`from "@/engine/x"` + `(../)+x` + `./x`).

## A. Loose `src/engine/*.ts` files (54 → domain dirs)

| File | Importers | Destination | Notes |
|---|---|---|---|
| EventBus.ts | 2 | `engine/events/EventBus.ts` | facade over eventBus/* |
| almanac.ts | 10 | DELETE (barrel) | → `almanac/*` deep imports |
| archetype.ts | 8 | `engine/bout/archetype.ts` | CombatArchetype/Profile |
| archival.ts | 4 | `engine/history/archival.ts` | |
| avatarGenerator.ts | 16 | `engine/generation/avatarGenerator.ts` | |
| banzuke.ts | 32 | DISSOLVE → `engine/banzuke/` | fns: `compareBanzuke`, `updateBanzuke`, `computeVariableSanyakuCounts`; drop re-exports (incl. `economics_awards`, `keshoMawashi`) |
| calendar.ts | 9 | `engine/calendar/calendar.ts` | |
| descriptorBands.ts | 7 | `engine/narrative/descriptorBands.ts` | stat→text bands |
| economics.ts | 3 | `engine/economy/economics.ts` | verify vs FinanceCalculator (removed-API gate) |
| economics_awards.ts | 2 | `engine/economy/awards.ts` | |
| eventHelpers.ts | 5 | `engine/events/helpers.ts` | 12-line createRngForEvent |
| events.ts | 20 | `engine/events/events.ts` | logEngineEvent/queryEvents |
| facilities.ts | 4 | `engine/economy/facilities.ts` | |
| h2h.ts | 10 | `engine/bout/h2h.ts` | head-to-head |
| hallOfFame.ts | 4 | `engine/history/hallOfFame.ts` | |
| history.ts | 9 | `engine/history/history.ts` | |
| historyCache.ts | 2 | `engine/history/historyCache.ts` | |
| historyIndex.ts | 6 | `engine/history/historyIndex.ts` | |
| holiday.ts | 8 | `engine/calendar/holiday.ts` | off-season rest |
| kimarite.ts | 8 | DELETE (barrel) | → `bout/kimarite/*` + `kimarite{Registry,Strategies}` |
| kimariteEnrichment.ts | 1 | `engine/bout/kimarite/kimariteEnrichment.ts` | |
| kimariteRegistry.ts | 6 | `engine/bout/kimarite/kimariteRegistry.ts` | |
| kimariteStrategies.ts | 3 | `engine/bout/kimarite/kimariteStrategies.ts` | |
| lifecycle.ts | 5 | DELETE (barrel) | → `lifecycle/*` |
| lineage.ts | 10 | `engine/legacy/lineage.ts` | bloodline/dynasty cluster |
| loans.ts | 8 | `engine/economy/loans.ts` | |
| mergers.ts | 5→ | `engine/economy/mergers.ts` | heya mergers |
| myosekiMarket.ts | 5 | `engine/governance/myosekiMarket.ts` | sibling MyosekiTradingService |
| narrativeDescriptions.ts | 1 | `engine/narrative/narrativeDescriptions.ts` | |
| naturalization.ts | 2 | `engine/lifecycle/naturalization.ts` | SimulationRunner yearly call |
| npcAI.ts | 14 | DELETE (live barrel) | importers → `npc/*` deep paths |
| npcAIWorkers.ts | 5 | `engine/npc/npcAIWorkers.ts` | |
| npcRecruitmentStrategy.ts | 5 | `engine/npc/strategy/npcRecruitmentStrategy.ts` | |
| npcRetirementStrategy.ts | 2 | `engine/npc/strategy/npcRetirementStrategy.ts` | |
| npcSponsorStrategy.ts | 1 | `engine/npc/strategy/npcSponsorStrategy.ts` | |
| npcSponsorStrategyHelpers.ts | 2 | `engine/npc/strategy/npcSponsorStrategyHelpers.ts` | |
| overflow.ts | 2 | `engine/recruitment/overflow.ts` | roster-cap → talent pool (tick phase caller) |
| oyakataPersonalities.ts | 4 | `engine/npc/personas/oyakataPersonalities.ts` | |
| oyakataStylePreferences.ts | 6 | `engine/npc/personas/oyakataStylePreferences.ts` | |
| perception.ts | 25 | `engine/npc/perception.ts` | NPC-perception machinery |
| queries.ts | 137 | `engine/core/queries.ts` | WorldState query layer |
| records.ts | 7 | `engine/history/records.ts` | |
| rivalries.ts | 7 | DELETE (barrel+helpers) | helpers → `narrative/rivalry/state.ts` |
| rng.ts | 190 | `engine/core/rng.ts` | LARGEST rewire surface |
| saveload.ts | 11 | `engine/persistence/saveload.ts` | |
| schedule.ts | 5 | `engine/calendar/schedule.ts` | |
| scheduleHelpers.ts | 3 | `engine/calendar/scheduleHelpers.ts` | |
| scoutingStore.ts | 6 | `engine/recruitment/scoutingStore.ts` | |
| selectors.ts | 11 | `engine/core/selectors.ts` | engine-level selectors |
| shikona.ts | 7 | DELETE (barrel) | → `shikona/*` |
| staff.ts | 14 | `engine/economy/staff.ts` | staff hiring/salary |
| storageProvider.ts | 5 | `engine/persistence/storageProvider.ts` | |
| world.ts | 13 | `engine/core/world.ts` | game-flow orchestrator |

## B. `src/engine/` directory consolidation

| Current | Destination | Notes |
|---|---|---|
| `systems/*` (16 dirs, 105 files) | promoted → `engine/<name>/` | basho, bookmark, economy, generation, governance, health, keshoMawashi, legacy, media, meta(→history/), narrative, officials, recruitment, training, tutorial, welfare, worldCircuit |
| `systems/NPCPersonaService.ts` | `engine/npc/personas/` | loose file inside systems/ |
| `ai/types.ts` | `engine/npc/types.ts` | merge or personas/ — decide at impl |
| `advisor/` | `engine/npc/advisor/` | |
| `agents/` | `engine/npc/agents/` | |
| `loop/` | `engine/npc/decision/` | LoopDecisionEngine, shouldHaltAdvance |
| `npcAI/` (22 files) | `engine/npc/` | weekly/ → `npc/weekly/` |
| `rikishiAgency/` | `engine/npc/agency/` | |
| `strategy/` | `engine/npc/strategy/` | NPC*Calculator/Framework/Service |
| `actions/` | dissolved | InjuredEncouragement→`health/`, OyakataIntervention→`npc/` |
| `data/sumo_geography.ts` | `engine/generation/data/` | sole consumer: CandidateGenerator |
| `eventBus/` | `engine/events/domains/` | + context.ts |
| `governance/` | merged into `engine/governance/` | dohyoIri, kanrekiCeremony, yokozunaAttendants → `governance/ceremonies/` |
| `persistence/` + `storage/` | `engine/persistence/` | merged single dir |
| `prestige/prestigeSystem.ts` | `engine/history/prestige.ts` | |
| `training/WeightJourney.ts` | `engine/training/` | merge with systems/training |
| unchanged | almanac, banzuke, bard, bout, core, lifecycle, matchmaking, simulation, tick, types, utils, worker | bard kept path-stable for `autonomous-narrative.yml` |
| `_archive/` | `engine/_archive/` | on-demand; README.md manifest |

## C. `src/` top-level

| Current | Destination |
|---|---|
| `App.tsx, main.tsx, bootstrap.tsx, routes.tsx, routes-helpers.ts, index.css, vite-env.d.ts` | `src/app/` (+ `index.html` → `/src/app/main.tsx`; `tsconfig.node.json` include; eslint exception `src/routes.tsx`→`src/app/routes.tsx`) |
| `lib/` + `utils/` (6 files) | `src/lib/` merged: a11y, cn(utils), sortUtils, engineUtils, storageKeyValidation, validatePath — fix `electron/main.ts:18-19` relative imports `../src/utils/`→`../src/lib/` |
| `contexts/` (13) + `store/` (2) | `src/state/` → `state/game/` (GameContext, gameReducer, bashoSlice, gameActions, gameTypes, gameHelpers, gameContextInstance, useGame, electronStorageProvider, provider/) + `state/stores/` (gameStore — **fix Worker `new URL` to `../../engine/worker/engine.worker.ts`**, eventReadStore) |
| `presenters/` loose `*Projections.ts`/`*UI.ts`/domain files (~25) | `presenters/projections/`; root keeps uiDigest, uiDigestTypes, uiModels, uiFormatters, uiActions, uiUtilities, selectors, engineAccess, worldAccess, entityLinks, eraTone |
| `pages/`, `hooks/`, `constants/` | unchanged |

## D. `src/components/` root loose files (10)

| File | Destination |
|---|---|
| SplashScreen, ThemeProvider, ErrorBoundary, RequireWorld, PageLoader, TitleBar, OpfsQuotaListener | `components/app-shell/` |
| ClickableName, MentionText, EventDetailDialog | `components/shared/` |

## E. `src/components/game/` — 70 files, DISSOLVED

| Files | Destination |
|---|---|
| BoutCard, BoutLog, BoutNarrativeModal(+Sections), BoutPreMatchOverlay, BoutReplayViewer, BoutResultDisplay(+Sections), PbpLineText, MatchDayViewer, HoshitoriChart, KeyBoutsSection, CornerAdvicePanel, PlayoffBracket, boutCardComponents, boutCardTypes, boutModalConstants, boutReplay/ | `components/basho/` |
| BanzukeReveal(+Sections) | `components/banzuke/` |
| CrisisModal(+Sections), GomenfudaStatusBadge | `components/governance/` |
| FacilitiesManagementPanel(+Sections), InfrastructurePanel, facilityMeta, StableHealthPanel(+Sections), StableStatsTable, WelfarePanel(+Sections) | `components/stable/` |
| SponsorsPanel(+Sections), SponsorContractsPanel, GlobalCupBracket, GlobalCupParticipant, GlobalCupSections | `components/economy/` |
| HoFInductionCeremony, HoFTimeline, IntaiCeremony, NarrativeCeremonyDialog, YokozunaDeliberation | `components/ceremony/` (new) |
| SaveLoadDialog(+Components,+Sections), saveLoadDialogSignal | `components/menu/` |
| KeshoEditor(+Sections), keshoEditorData | `components/kesho/` |
| MentorAssignmentPanel, SparringPanel, ProgressionTracker, InjuryRecoveryPanel(+Sections) | `components/training/` |
| PerceptionOverview, perceptionComponents | `components/scouting/` |
| RecruitSigningDialog | `components/recruitment/` |
| RikishiCard(+Sections) | `components/rikishi/` |
| LineageTree | `components/history/` (new) |
| InboxNewsTicker | `components/media/` |
| decisionFeedback.ts, searchFocusSignal.ts, severityHelpers.tsx | `components/shared/` |

## F. Tests → `tests/` + `e2e/` → `tests/e2e/`

- `git mv src/tests tests`; `git mv e2e tests/e2e` (internal structure preserved).
- New alias `@tests/* → ./tests/*`: `tsconfig.json` paths; **`tsconfig.test.json` must redeclare BOTH `@/*` and `@tests/*`** (paths don't merge across extends); all 3 vitest configs' `resolve.alias`.
- Rewrites: `@/tests/*` → `@tests/*` (184 files); `tests/setup/setup.ts` `../../engine/*` → `../../src/engine/*`; `e2e/helpers.ts` `../src/*` → `../../src/*`.
- **~45 ROOT-constant files:** `join(__dirname|import.meta.dirname, "../../../..")` (+3 `../../`-variant) → normalize to `REPO_ROOT`/`SRC` from `tests/helpers/fsScan` (one hand-fix: fsScan's `REPO_ROOT = join(import.meta.dirname,"..","..","..")` → `"..",".."`).
- Config: 3 vitest configs (setupFiles/include/exclude + coverage exclude `src/tests`→`tests`), tsconfig.test include, tsconfig.app exclude cleanup, `slow-tests.yml`, `playwright.config.ts testDir`, meta-gate `join(SRC,"tests")` → tests root, `testTimingsBudget` message + regen `test-timings.json`, knipGuard `knownBarrelReExports` path, `testFixtures.ts` reference.
- `e2e/calibration-screenshots/` — untracked+unignored → inspect, likely delete + gitignore.

## G. `scripts/` grouping

| Destination | Files |
|---|---|
| `scripts/audit/` | audit-orphans, orphanTracker, engine-reviewer, find-dead-test-subjects, duplicateExports, measureFunctions, report-test-timings, perf-gate-check, designScan, check-jsdoc, purity-lint.sh |
| `scripts/measure/` | measure-{breakdown,events,growth,kimarite-distribution,rikishi}, bench-pipelines, compare-engines, verify-training-decay |
| `scripts/narrative/` | bard-orchestrator, analyzeNarrativeDeps, emitNarrativeModules, list-models |
| `scripts/sim/` | diagnostic-25yr-sim, determinism-double-run, repro-year, yokozuna_sim, test-agents |
| `scripts/` root | check-package-manager.mjs (preinstall), README.md |
| Updates | package.json (preinstall/test:timings/measure:kimarite), engineReviewerGate + ci-gates + orphan-audit (script paths), perf-gate.yml + autonomous-narrative.yml + slow-tests.yml, scripts/README.md |

## H. Root cleanup + config sync

- Delete gitignored: `.v7-p*.patch`×8, `simulation-results.json`, `test-list.txt`, `test-results.json`, `*.tsbuildinfo`, `coverage/`, `out/`, `playwright-report/`, `test-results/`.
- `vite.config.ts` + `electron.vite.config.ts` manualChunks patterns → new domain paths.
- `eslint.config.js` boundary globs (`@/contexts`→`@/state`, `src/routes.tsx`→`src/app/routes.tsx`).
- `vitest.config.ts` coverage include `src/{store,contexts,utils}`→`src/{state,lib}` + exclude `_archive/`.
- Regen: `docs/audit/test-timings.json`, `.windsurf/audit/baseline-orphans.json`, `orphan-tracker.csv`.
- Docs: CLAUDE.md Directory Map, TESTING.md, scripts/README.md, README.md, `.claude/skills/*/SKILL.md`, stale `.claude/plans/*` ref in CLAUDE.md.
