# Refactor Findings Registry — Phase 0

> Generated 2026-10-08. Sources: `function-lengths.csv` (AST scan, `scripts/measureFunctions.ts`), `duplication-inventory.md`, `wiring-inventory.md` (import-graph BFS), `design-violations.csv` (`scripts/designScan.ts`), prior orphan triage (`baseline-orphans.json`, `unreferenced-exports.test.ts` classification maps).
>
> Verdicts: `APPROVED` (sound, no action) · `REFACTOR` (split/restructure) · `DEDUPE` (merge/rename/delete dupes) · `WIRE` (connect to runtime/UI) · `DELETE` (dead) · `TOOL` (intentional dev/diagnostics infra).

## Headline measurements

| Metric | Value | Notes |
|---|---|---|
| Production files scanned | 881 | excludes `src/tests`, `*.test.*` |
| Functions/methods/arrows ≥150 LOC | **112** | was estimated 69 by pre-AST heuristic — methods were undercounted |
| `const-obj`/`const-arr` ≥150 LOC | 22 | service-object monoliths + data tables |
| Exported-name collisions | 77 (57 value, 20 type) | see duplication-inventory.md |
| Constants already **diverged in value** | 4 pairs | `NATURALIZATION_CAREER_WINS_THRESHOLD` 300/400, `SANCTION_RISK_THRESHOLD` 85/50, `BOUT_DURATION_DOMINATION_DIVISOR` 15/10, `BOUT_DURATION_CLOSENESS_DIVISOR` 30/12 |
| Files unreachable from app entries | 36 | incl. 16 dead barrels; `simulation/` = TOOL |
| Mechanical design-bible violations | 640 across 129 files | 182 hardcoded-palette, 87 hex, 26 rgb, 229 arbitrary text sizes, 20 glassmorphism, 18 gradients, 22 screaming-copy, 31 oversized-tracking, 21 italic-numerals, 4 banned-font |
| "retained for future wiring" boilerplate | 69 entries | banned by P4 gate |

## Engine domain registry

| Path | Verdict(s) | Evidence |
|---|---|---|
| `engine/bout/boutNarrative.ts` | REFACTOR | `generateBoutNarrative` 2623 LOC + nested arrow 427 → stage-pipeline split; largest fn in codebase |
| `engine/bout/` (rest) | REFACTOR+DEDUPE+DELETE | `applyBoutResult` 387, `resolveBout` 355; `KimariteSelectionEngine` obj 186; DELETE `honbasho.ts`, `kachiNokori.ts` (dead + divergent dup) |
| `engine/bout/physics/` | REFACTOR | `resolveTachiaiV2` 277, `tickBeltBattle` 241, `tickPushBattle` 231 |
| `engine/banzuke/` | REFACTOR | `publishBanzukeUpdate` 691 → movement/narrative/snapshot |
| `engine/` root (kimariteStrategies, EventBus, etc.) | REFACTOR | `KIMARITE_STRATEGIES` 959 const-arr → data module; `EventBus` 568 const-obj → handler-map modules; `updateBanzuke` 182 (banzuke.ts flat file — registry: complete flat→dir migration or barrel, verdict matches lifecycle/shikona pattern) |
| `engine/lifecycle/` + `lifecycle.ts` | REFACTOR | `concludeBashoCompetition` 305, `recordBashoHistory` 258, `distributePrizes` 173; `lifecycle.ts` flat file 407 LOC holds `_generateRookie` 173, `checkRetirement` — finish flat→dir migration |
| `engine/shikona/` + `shikona.ts` | REFACTOR | `shikona.ts` 147 LOC real code beside dir → complete migration; `generateCandidate` dup vs `CandidateGenerator` |
| `engine/npcAI/` | REFACTOR+WIRE | `makeNPCWeeklyDecision` 306, `executeAgentDecisions` 244, `PLAN_CATALOG` 243 obj; `contextBuilder.ts` dead — wire `buildAIContext` as canonical `AIContext` ctor at 4 hand-built sites OR delete (lean WIRE: call sites verified); `SponsorStrategy.ts` dead → DELETE |
| `engine/systems/training/` | REFACTOR | `applyWeeklyTraining` 359 + nested arrow 350; `SparringService` obj 159 |
| `engine/systems/narrative/` | REFACTOR | `PostBashoPressService` 529, `RivalryService` 438, `CrisisService` 325 const-objs → per-method extraction; `getRegistry` 270, `generateChampionLines` 220; `NarrativeBands` type dups (RivalryHeatBand, ReputationBand, ScandalBand) → rename/merge |
| `engine/systems/governance/` | REFACTOR+DEDUPE | `runGovernanceReview` 264, `evaluateActiveYokozuna` 212; `YokozunaService` 314 obj; `issueGovernanceRuling` dup vs world.ts const; `leaseMyoseki` dup vs `myosekiMarket.ts` |
| `engine/systems/economy/` | DEDUPE+REFACTOR | `KachiNokoriService` canonical vs dead bout impl; `GlobalCupService` 299, `InfrastructureService` 219 objs; `infrastructureValidation.ts` DELETE (no importer); sponsorship split across Service/Mutations/Queries — verify intentional layering in registry pass |
| `engine/systems/generation/` | DEDUPE+REFACTOR | 27 files; `generateCandidate`/`tickYear`/`DEBUT_AGE_BASE`/etc. dups; `CandidateGenerator` vs `shikona/generation.ts` overlap; `SponsorGenerator` was verified imported by WorldFactory (alive) |
| `engine/systems/media/` | APPROVED | facade pattern: all internals funnel through `MediaService.ts`, which is consumed by `SimulationRunner`, `naturalization`, `loans`, `mergers`, `BashoHistory`, `ScandalService` — subsystem is wired |
| `engine/systems/legacy/` | REFACTOR | `DynastyService` 308, `LegacyService` 160 objs |
| `engine/systems/recruitment/` | APPROVED | services wired (ScoutingService→uiDigest/worker, FogOfWar→generator) |
| `engine/systems/officials/`, `health/`, `keshoMawashi/`, `bookmark/`, `tutorial/` | APPROVED | wired via worker/WorldFactory; `KeshoMawashiFactory`/`Pipeline` confirmed consumed internally by `KeshoMawashiGenerator` → `banzuke.ts` |
| `engine/simulation/` | TOOL | dev harness (`bun run simulate`, diagnostic scripts, tests); REFACTOR still applies to `SimTuningService` 253 obj (test-exercised) — lower priority wave |
| `engine/worker/engine.worker.ts` | REFACTOR | `self.onmessage` 695 + `COMMAND_HANDLERS` 671 obj → dispatch table extraction |
| `engine/persistence/` | REFACTOR | `SerializationService` 340 const-obj |
| `engine/core/` | REFACTOR+DELETE | `_applyImpact` 206 (ImpactResolver); DELETE `EntityService.ts` (dead); `applyImpact` dup w/ gameHelpers — layered verdict pending |
| `engine/queries.ts` vs `utils/entityAccess.ts` vs `presenters/worldAccess.ts` | DEDUPE | identical bodies confirmed; canonical = `entityAccess.ts`; `queries.ts` re-export; `worldAccess` absorbed/re-export |
| `engine/selectors.ts` vs `presenters/selectors.ts` | DEDUPE | canonical = presenters/selectors.ts |
| `engine/matchmaking/` | REFACTOR | `scoreDrama` 255 |
| `engine/loop/` | REFACTOR (low) | `detectDueDecisions` 150 at threshold |
| `engine/tick/` | APPROVED | 30 phase files ≤199; dead `tick/index.ts` barrel → delete or adopt |
| `engine/types/`, `engine/bard/`, `engine/almanac/` | APPROVED | types/almanac barrel clean (but almanac `index.ts` has no importers — barrel-discipline decision) |
| `engine/utils/` | DELETE+DEDUPE | `collectionOperations.ts`, `jsonParser.ts` dead → DELETE; `seed.ts` `makeDeterministicSeed` dup vs `utils/engineUtils.ts` |
| `utils/` (src/utils) | DEDUPE | `engineUtils.ts` seed dup; `validatePath.ts` KEEP (electron/main.ts) |
| `engine/agents/` | APPROVED (mostly) | `spawnCrisisAgent` 168 borderline; agent spawn names collide across files (verified distinct domain constructors — not dups) |
| `engine/governance/` (root, 3 files) | OPEN | `governanceReview.ts` vs `systems/governance/` — layering check in registry pass |

## UI domain registry

| Path | Verdict(s) | Evidence |
|---|---|---|
| `pages/` (37 pages + helpers) | REFACTOR | 25 of 112 long functions live here: `GovernancePage` 700, `Dashboard` 512, `BashoPage` 456, `AlmanacPage` 375, `RecapPage` 374, `MainMenu` 362, `MyosekiMarketPage` 311, `OyakataPage` 307 → extract view-models/sub-sections; then P5 design pass |
| `contexts/GameContext.tsx` | REFACTOR | `GameProvider` 472 → slice extraction (`bashoSlice` 162 already a seam) |
| `components/game/boutReplay/` | REFACTOR | `useBoutReplay` 472; `boutCanvas/draw.ts` `getTargetState` 260, `drawRikishi` 259; `PHASE_LABELS` rename (dup w/ calendar) |
| `components/rikishi/` | REFACTOR+DEDUPE | `RikishiCareerTab` 604, `RikishiProfileHeader` 404, `RosterList` 220; `RankBadge` dup vs `layout/control-center/RankBadge`; 72 design violations (densest UI dir) |
| `components/game/` | REFACTOR+DELETE | `SaveLoadDialog` 333, `BoutNarrativeModal` 282, `KeshoEditor` 251; DELETE `media/PressConference` (dead), live variant here |
| `components/layout/` | REFACTOR | `AppSidebar` 333, `TopNavBar` 305, `EventLogPanel` 170; dead `layout/index.ts` barrel |
| `components/stable/` | DESIGN+REFACTOR | 82 dv (densest); `GlobalStrategicHub` 237, `ChronicleRoom` 199, `MOTIF_HANDLERS` obj 199, `renderCrestMotif` 208 |
| `components/ui/` | DEDUPE+DELETE | `Sparkline`, `colorMaps` (dead HEAT_CONFIG variant) → DELETE; 36-file shadcn dir APPROVED; dead `ui/index.ts` barrel |
| `components/dashboard/` | REFACTOR (low) | 3 borderline fns (156–169); 35 dv |
| `components/scouting/`, `recap/`, `training/`, `menu/`, `wizard/`, `onboarding/`, `kesho/`, `avatar/`, `economy/` | REFACTOR | per-fn targets in function-lengths.csv; RecruitingTab 371, NarrativeSummary 371, WeeklyDrillPlanner 308, SumoAvatar 293, TournamentCeremony 250, ExhibitionBout 248 |
| `presenters/` | DEDUPE | `projectTsukebito` dup (projections/ vs top-level); `worldAccess` absorption; `TsukebitoProjection`/`GovernanceSummary`/`StandingEntry`/`PerceptionSnapshot` type dups → merge or rename |
| `hooks/` | APPROVED | 17 files, no violations |
| `constants/` | DEDUPE | merge `*Extended`/`Transitions`/`Impact` bolt-ons; 21 verified-equal scalar dups + 4 diverged + 3 rename-candidates; DELETE `koreYoriSanyaku`, `narrativeFlavor`, `ui/kesho`, `ui/presenters` (dead) |
| `engine/tick`+`almanac`+misc `index.ts` barrels (16 files) | WIRE-or-DELETE | zero importers; decide public-API discipline (adopt) vs delete |

## Cross-cutting verdicts

| Finding | Verdict | Action |
|---|---|---|
| `calculateKachiNokori` divergence | DEDUPE (canonical=Service) | Phase 1 semantic pin → Phase 3 delete `bout/kachiNokori.ts` |
| `buildAIContext` | WIRE (confirmed) | signature `(world, heyaId, oyakataId?, leaguePerception?)` matches the hand-built `AIContext` literal at `phase01_week_npc_ai.ts:110` — canonical ctor adoption at 4 sites |
| `simulation/` subsystem | TOOL | keep; document in service-map; refactor wave optional |
| `validatePath.ts` | APPROVED | electron main consumer |
| 4 diverged constant pairs | DIVERGED | per-pair call-site review before canonical pick (Phase 3) |
| `BASHO_NAMES`, `PHASE_LABELS`, `HEAT_CONFIG` | RENAME | different shapes/domains |
| `gameActions` action creators | APPROVED (LAYERED) | not duplicates — allowlist in dup gate |
| Type-name collisions (20) | RENAME (likely) | same-name different-domain types; `PreBashoAssessment` interface vs component fn is the worst |

## Phase-2 wave order (refined from data)

1. `boutNarrative.ts` (2623) — biggest risk, first characterization
2. `BanzukePublisher.publishBanzukeUpdate` (691) + `worker COMMAND_HANDLERS`/`onmessage` (671/695)
3. Const-object services: EventBus 568 → PostBashoPressService 529 → RivalryService 438 → SerializationService 340 → CrisisService 325 → YokozunaService 314 → DynastyService 308 → GlobalCupService 299 → SimTuningService 253 → InfrastructureService 219 → MOTIF_HANDLERS 199 → KimariteSelectionEngine 186 → SparringService 159
4. Bout core: applyBoutResult 387, resolveBout 355, physics trio (277/241/231)
5. Engine long-fns: applyWeeklyTraining 359+350, concludeBashoCompetition 305, makeNPCWeeklyDecision 306, runGovernanceReview 264, recordBashoHistory 258, scoreDrama 255, getRegistry 270, executeAgentDecisions 244, generateChampionLines 220, _applyImpact 206, evaluateActiveYokozuna 212
6. Flat→dir finish: lifecycle.ts (407), shikona.ts (147), banzuke.ts (updateBanzuke 182)
7. Data tables → data modules: KIMARITE_STRATEGIES 959, GLOSSARY_TERMS 754, KIMARITE_ENRICHMENT 453, PLAN_CATALOG 243, AGGRESSION_SPEED_MULTIPLIER 389, MAKUSHITA_TIER_COUNT 627, IDB_NAME 307, PRESENCE_GAIN_PER_WIN 295
8. UI: GameProvider 472, useBoutReplay 472, RikishiCareerTab 604, GovernancePage 700, Dashboard 512, BashoPage 456 + remaining pages/components ≥150

## Open items requiring registry-pass verdicts (before implementation waves)

- ~~`engine/media*` five no-importer services~~ → RESOLVED: facade-wired via `MediaService.ts` (APPROVED)
- ~~`KeshoMawashiFactory`/`Pipeline` (0 importers)~~ → RESOLVED: consumed by `KeshoMawashiGenerator` internally (APPROVED)
- ~~`governanceReview.ts` root vs `systems/governance/` layering~~ → RESOLVED: `engine/governance/` holds only ceremony content (dohyoIri, kanreki, yokozunaAttendants) — wired via BanzukePublisher/ScandalService/phase01; `runGovernanceReview` lives in `systems/governance/`. No layering conflict.
- ~~`applyImpact` gameHelpers vs ImpactResolver~~ → RESOLVED: LAYERED — `gameHelpers.applyImpact(state: GameState)` wraps `resolveImpacts`; `ImpactResolver.applyImpact(world: WorldState)` is the engine impl → dup-gate allowlist
- ~~Barrel adoption policy~~ → RESOLVED: **delete zero-importer barrels** — deep imports are the established repo norm; 16 dead `index.ts` files get deleted in Phase 4, not adopted
- ~~`simulation/` refactor priority~~ → RESOLVED: TOOL — optional wave, lowest priority
