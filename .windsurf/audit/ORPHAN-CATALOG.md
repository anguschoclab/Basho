# Orphan Catalog — every entry, what it does, keep-or-kill notes

Generated from `orphan-tracker.csv` + source docstrings + the classification verdicts in
`tests/unit/audit/unreferenced-exports.test.ts`. See `ORPHAN-REPORT.md` for the how-to-read guide.

**Legend** — Status: `intentional` (kept on purpose, reason in the Verdict column) / `genuine` (confirmed dead, `ORPH-####` tracked). `What it does` is pulled from the symbol's own docstring.


## engine/npc — 46 entries (26 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0409 | `MetaAdaptationState` | intentional | Persisted on oyakata.memory — tracks the manager's meta-read over time. | Exported for unit testing; consumed via evaluateAdaptation in production |
| ORPH-0410 | `updateMetaAdaptation` | intentional | Advance the manager's meta-adaptation state by one weekly tick. | Internal helper invoked by evaluateAdaptation; exported for unit testing |
| ORPH-0417 | `emptyLeaguePerception` | intentional | Builds a league-wide derived view from the current WorldState. (module context) | Empty league perception factory utility |
| ORPH-0418 | `emptyOyakataMemory` | intentional | Build an empty memory object for a freshly generated oyakata. | Internal helper invoked by getMemory; exported for unit testing |
| ORPH-0456 | `CoordinationInput` | intentional | Reconciles a strategic plan with the proposals produced by operational AI (module context) | Parameter type of applyPlanConstraints; pinned by TacticalCoordinator tests |
| ORPH-0412 | `detectDueDecisions` | intentional | Pure: which decisions are due this tick for the player heya (no world mutation). | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0563 | `PENDING_DECISION_SOFT_CAP` | intentional | Max pending non-required decisions in the queue. Required (blocking) | Internal constant consumed by decisionQueue; exported for unit testing |
| ORPH-0414 | `applyCrisisRescue` | intentional | WS5 — apply a persona-chosen crisis rescue path (canon §14.8) through | Internal rescue handler invoked in-module; exported for unit testing |
| ORPH-0415 | `consolidateOyakataMemory` | intentional | `export function consolidateOyakataMemory(` | Live module surface — referenced outside its file (5 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0419 | `GlobalWorkerResult` | genuine | Worker logic for NPC AI decision making. (module context) | ORPH-0419: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0420 | `MAX_OPPONENT_MODELS` | intentional | Cap on learned models per oyakata; stalest entries are evicted. | Config constant for the opponent-model eviction cap |
| ORPH-0423 | `HealthBand` | genuine | Type representing health band. | ORPH-0423: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0428 | `WelfareRiskBand` | genuine | Type representing welfare risk band. | ORPH-0428: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0422 | `GovernancePressureBand` | genuine | Type representing governance pressure band. | ORPH-0422: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0424 | `MediaHeatBand` | intentional | Type representing media heat band. | Live module surface — referenced outside its file (13 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0426 | `RivalryPerceptionBand` | genuine | Type representing rivalry perception band. | ORPH-0426: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0427 | `RosterStrengthBand` | genuine | Type representing roster strength band. | ORPH-0427: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0425 | `MoraleBand` | genuine | Type representing morale band. | ORPH-0425: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0421 | `buildAllPerceptionSnapshots` | genuine | buildAllPerceptionSnapshots | ORPH-0421: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0429 | `scoreRecruitForOyakata` | intentional | Score a candidate for a given oyakata's preferences (0-100) | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0430 | `getFinanceStrategy` | intentional | Pure calculation logic for NPC financial decisions. (module context) | NPC finance strategy getter utility |
| ORPH-0431 | `getGovernanceStrategy` | intentional | Pure calculation logic for NPC governance decisions. (module context) | NPC governance strategy getter utility |
| ORPH-0454 | `TraitCheck` | intentional | Trait condition check | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0453 | `ThresholdCalculator` | genuine | Threshold calculator based on traits and state | ORPH-0453: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0451 | `StrategyAction` | genuine | Decision action that returns a state impact | ORPH-0451: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0452 | `StrategyEvent` | genuine | Event to emit on successful action | ORPH-0452: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0450 | `evaluateRule` | intentional | Evaluate a single strategy rule. | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0448 | `calculateMoodAdjustedThreshold` | intentional | ============================================================================ Common Threshold Calculators ============================================================================ | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0449 | `calculateTraitAdjustedThreshold` | genuine | Shared framework for all NPC strategy evaluations. (module context) | ORPH-0449: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0455 | `trySpendResource` | intentional | Attempt to spend a resource with bounds checking. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0447 | `adjustScore` | intentional | Adjust a numeric score within bounds. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0432 | `DefaultRecruitmentStrategy` | genuine | `export const DefaultRecruitmentStrategy: RecruitmentStrategy = {` | ORPH-0432: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0433 | `DefaultRetirementStrategy` | intentional | NPC retirement decision strategies. (module context) | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0434 | `DefaultSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0434: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0441 | `TraditionalistSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0441: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0438 | `ScientistSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0438: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0435 | `GamblerSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0435: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0437 | `NurturerSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0437: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0442 | `TyrantSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0442: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0439 | `StrategistSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0439: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0440 | `StrictSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0440: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0436 | `IndulgentSponsorStrategy` | genuine | per-archetype NPC sponsor recruitment strategies. (module context) | ORPH-0436: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0444 | `calculateRunwayMonths` | genuine | Helper functions for NPC sponsor strategy. (module context) | ORPH-0444: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0445 | `createSponsorRelationship` | genuine | Helper functions for NPC sponsor strategy. (module context) | ORPH-0445: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0443 | `addSponsorRelationship` | genuine | Helper functions for NPC sponsor strategy. (module context) | ORPH-0443: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0446 | `emitSponsorRecruitmentEvent` | genuine | Helper functions for NPC sponsor strategy. (module context) | ORPH-0446: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |

*File(s): `src/engine/npc/ArchetypeAdaptation.ts`, `src/engine/npc/LeaguePerception.ts`, `src/engine/npc/MemoryStore.ts`, `src/engine/npc/TacticalCoordinator.ts`, `src/engine/npc/decision/LoopDecisionEngine.ts`, `src/engine/npc/decision/decisionQueue.ts`, `src/engine/npc/execution.ts`, `src/engine/npc/handlers.ts`, `src/engine/npc/npcAIWorkers.ts`, `src/engine/npc/opponentLearning.ts`, `src/engine/npc/perception.ts`, `src/engine/npc/personas/oyakataStylePreferences.ts`, `src/engine/npc/strategy/NPCFinanceCalculator.ts`, `src/engine/npc/strategy/NPCGovernanceCalculator.ts`, `src/engine/npc/strategy/NPCStrategyFramework.ts`, `src/engine/npc/strategy/npcRecruitmentStrategy.ts`, `src/engine/npc/strategy/npcRetirementStrategy.ts`, `src/engine/npc/strategy/npcSponsorStrategy.ts`, `src/engine/npc/strategy/npcSponsorStrategyHelpers.ts`*

## engine/economy — 26 entries (7 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0340 | `KACHI_NOKORI_THRESHOLD` | intentional | Minimum wins for kachi-nokori to be positive (kachikoshi threshold for sekitori) | Internal constant consumed by calculateKachiNokori; value pinned by kachiNokori.test |
| ORPH-0335 | `generateSanshoLedgerEntry` | genuine | Generates the financial transaction ledger entry for a Sansho prize. | ORPH-0335: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0336 | `handleInsolvency` | intentional | Handles insolvency for a heya when its funds fall below the debt limit. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0337 | `runSponsorChurn` | genuine | Executes the post-basho sponsor churn checks according to Constitution Addendum D. | ORPH-0337: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0339 | `UpgradeResult` | intentional | Defines the structure for upgrade result. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0338 | `tickMonthlyFacilities` | genuine | Called at monthly boundary. For each heya: | ORPH-0338: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0554 | `KoenkaiDemandKind` | intentional | monthly interactive asks that surface (module context) | Type export; koenkai demand kind API contract |
| ORPH-0553 | `KoenkaiDemandDef` | intentional | monthly interactive asks that surface (module context) | Type export; koenkai demand def API contract |
| ORPH-0551 | `KOENKAI_DEMANDS` | intentional | monthly interactive asks that surface (module context) | Demand table pinned by koenkaiDemands tests |
| ORPH-0550 | `KOENKAI_DEMAND_PROBABILITY` | intentional | Monthly probability of a demand surfacing when the heya has a koenkai. | Internal constant consumed by tickMonthlyKoenkaiDemands; exported for unit testing |
| ORPH-0552 | `koenkaiDemandDecisionId` | intentional | monthly interactive asks that surface (module context) | Internal helper; pinned by koenkaiDemands tests |
| ORPH-0549 | `applyDemandOutcome` | intentional | Apply a demand outcome — shared by interactive resolution and autosim. | Internal helper invoked by the resolveKoenkaiDemand path; exported for unit testing |
| ORPH-0343 | `LoanTerms` | genuine | `export interface LoanTerms {` | ORPH-0343: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0342 | `determineLoanTerms` | genuine | `export function determineLoanTerms(` | ORPH-0342: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0341 | `createLoanObject` | genuine | `export function createLoanObject(` | ORPH-0341: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0344 | `processMonthlyLoanRepayments` | intentional | Process monthly loan repayments for all heyas. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0347 | `tickStaffYear` | genuine | Yearly tick for all staff members. | ORPH-0347: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0346 | `StaffBonuses` | intentional | Calculates aggregate staff bonuses for a specific heya. | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0561 | `STAFF_POST_SLOTS` | intentional | Default slot caps per post (P2). Unlisted roles are uncapped. | Internal slot table consumed by openSlots; pinned by staffPosts tests |
| ORPH-0558 | `SEVERANCE_MONTHS` | intentional | Staff posts & contracts (P2): per-role slot caps, wages, contract expiry, (module context) | Internal constant consumed by severanceCost; pinned by staffPosts tests |
| ORPH-0555 | `CANDIDATE_POOL_SIZE` | intentional | Staff posts & contracts (P2): per-role slot caps, wages, contract expiry, (module context) | Internal constant consumed by refreshStaffCandidatePool; exported for unit testing |
| ORPH-0556 | `filledSlots` | intentional | Filled count for a role (from staffIds when posts aren't tracked). | Internal helper invoked by openSlots; exported for unit testing |
| ORPH-0559 | `severanceCost` | intentional | Staff posts & contracts (P2): per-role slot caps, wages, contract expiry, (module context) | Internal helper; pinned by staffPosts tests |
| ORPH-0557 | `monthlyWageBill` | intentional | Monthly wage bill for a heya (0 for legacy staff without wages). | Internal helper; pinned by staffPosts tests |
| ORPH-0560 | `skillFromBands` | intentional | Skill score (0–10) derived from competence bands. | Internal helper; pinned by staffPosts tests |
| ORPH-0476 | `awards` | intentional | Handles specific economic calculations for Kinboshi stipends and Special Prizes (Sanshō). | Consumed by components (HoshitoriChart, HoFInductionCeremony, KenshoManagementWidget) — components are outside the unticked scan scope |

*File(s): `src/engine/economy/KachiNokoriService.ts`, `src/engine/economy/awards.ts`, `src/engine/economy/economics.ts`, `src/engine/economy/facilities.ts`, `src/engine/economy/koenkaiDemands.ts`, `src/engine/economy/loans.ts`, `src/engine/economy/staff.ts`, `src/engine/economy/staffPosts.ts`*

## engine/generation — 22 entries (4 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0352 | `EARLY_SHIKONA_CHANCE` | intentional | Chance of early shikona for lower-division rikishi | Config constant for early shikona generation |
| ORPH-0353 | `EARLY_SHIKONA_MOTIVATION_BOOST` | intentional | Motivation boost per weekly tick while in lower divisions with early shikona | Config constant for early shikona motivation boost |
| ORPH-0355 | `assignPressPersona` | intentional | Determines press persona based on behavior stats (discipline + mediaSavvy). | Internal helper invoked by applyPersonaAssignment; exported for unit testing |
| ORPH-0354 | `assignPersonalityTraits` | intentional | Weighted random selection of personality traits based on combat archetype | Internal helper invoked by applyPersonaAssignment; exported for unit testing |
| ORPH-0356 | `rollBirthday` | intentional | Rolls a random birth month (1-12) and day (1-28). | Internal helper invoked by applyPersonaAssignment; exported for unit testing |
| ORPH-0357 | `PRE_SUMO_BACKGROUNDS` | intentional | Assigns a pre-sumo athletic background to new rikishi at recruitment. (module context) | Internal table consumed by applyBackgroundStatModifiers and assignPreSumoBackground; exported for unit testing |
| ORPH-0359 | `hasPoorEyesight` | genuine | Checks whether a rikishi has the poor eyesight quirk. | ORPH-0359: sole caller is the orphaned applyGlasses (ORPH-0359); orphaned together pending a glasses consumer |
| ORPH-0358 | `applyGlasses` | genuine | Applies glasses to a rikishi with poor eyesight. | ORPH-0358: glasses quirk is write-only — assignQuirk can set poorEyesight but no avatar layer or mechanic reads quirks.glasses; needs an avatar glasses renderer or quirk effect to wire |
| ORPH-0569 | `computePopulationTarget` | intentional | Live demographic floor: all NPC stables × TARGET_ROSTER_SIZE, computed | Internal helper invoked by computeReplacementGap (live NPC-recruitment equilibrium path); exported for unit testing |
| ORPH-0364 | `INDUSTRY_TAGS` | intentional | `export const INDUSTRY_TAGS = [` | Sponsor generation industry tags; used by world factory |
| ORPH-0362 | `generateSponsorNameV2` | intentional | Procedural Sponsor Name Generator V2 (Authoritative) | Sponsor name generation utility |
| ORPH-0361 | `generateSponsorId` | intentional | `export function generateSponsorId(rng: SeededRNG): string {` | Sponsor ID generation utility |
| ORPH-0366 | `rollSponsorCategory` | intentional | `export function rollSponsorCategory(rng: SeededRNG): SponsorCategory {` | Sponsor category rolling utility |
| ORPH-0360 | `generateSponsor` | intentional | Generate a single sponsor. | Sponsor generation function; used by world factory internally |
| ORPH-0363 | `getTierTraitRanges` | intentional | `export function getTierTraitRanges(tier: SponsorTier) {` | Sponsor tier trait range utility |
| ORPH-0367 | `rollTier` | intentional | `export function rollTier(rng: SeededRNG, dist: Record<SponsorTier, number>): SponsorTier {` | Sponsor tier rolling utility |
| ORPH-0365 | `INITIAL_SPONSOR_TIER_DISTRIBUTION` | intentional | `export const INITIAL_SPONSOR_TIER_DISTRIBUTION: Record<SponsorTier, number> = {` | Config for initial sponsor tier distribution |
| ORPH-0368 | `materializeCandidateToRikishi` | intentional | Converts a signed candidate into a full Rikishi entity and adds them to the world. | Consumed by TalentPoolNPCRecruitment (NPC talent materialization); pinned by materialization tests |
| ORPH-0348 | `PLAYER_BACKSTORIES` | intentional | Pure function that applies the player's OyakataCreationConfig to the world state (module context) | Internal table consumed by applyOyakataCreationConfig; exported for unit testing |
| ORPH-0349 | `ResolveAvatarArgs` | genuine | --------------------------------------------------------------------------- Resolver + per-entity stage-input helpers --------------------------------------------------------------------------- | ORPH-0349: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0350 | `recruitmentBalanceMultiplier` | intentional | Multiplier applied to a stable's recruitment bid. Stronger-than-average stables | Consumed by TalentPoolNPCRecruitment (NPC recruitment pipeline); pinned by competitiveBalance tests |
| ORPH-0351 | `getRandomOrigin` | genuine | static geography data for rikishi generation. (module context) | ORPH-0351: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |

*File(s): `src/engine/generation/FightingNameEarly.ts`, `src/engine/generation/PersonaAssignment.ts`, `src/engine/generation/PreSumoBackground.ts`, `src/engine/generation/QuirkAssignment.ts`, `src/engine/generation/RecruitmentController.ts`, `src/engine/generation/SponsorGenerator.ts`, `src/engine/generation/TalentPoolMaterialization.ts`, `src/engine/generation/applyOyakataConfig.ts`, `src/engine/generation/avatarGenerator.ts`, `src/engine/generation/competitiveBalance.ts`, `src/engine/generation/data/sumo_geography.ts`*

## engine/narrative — 22 entries (12 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0405 | `hydrateDescriptor` | intentional | Hydrates a raw descriptor band (condition, morale, potential) with | Narrative prose hydration utility |
| ORPH-0406 | `PressConferenceContext` | intentional | Generates post-basho press conference PBP lines for NPC rikishi. (module context) | Parameter type of generatePressConference; pinned by PostBashoPress tests |
| ORPH-0407 | `bumpTrigger` | intentional | Helper to bump a trigger value. | Rivalry heat bump trigger utility |
| ORPH-0394 | `toAgeBand` | genuine | Public helper for resolving age (Backward compatible). | ORPH-0394: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0397 | `toExperienceBand` | genuine | Public helper for resolving experience (Backward compatible). | ORPH-0397: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0403 | `toWeightBand` | genuine | Public helper for resolving weight (Backward compatible). | ORPH-0403: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0398 | `toHeightBand` | genuine | Public helper for resolving height (Backward compatible). | ORPH-0398: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0402 | `toReputationBand` | genuine | Public helper for resolving reputation (Backward compatible). | ORPH-0402: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0399 | `toInjurySeverityBand` | genuine | Public helper for resolving injury severity (Backward compatible). | ORPH-0399: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0404 | `toWinRateBand` | genuine | Public helper for resolving win rate (Backward compatible). | ORPH-0404: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0395 | `toConditionDescriptor` | genuine | Public helper: condition (Iki/Koshi) → Japanese DescriptorBand. | ORPH-0395: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0400 | `toMoraleDescriptor` | genuine | Public helper: morale (Kiai) → Japanese DescriptorBand. | ORPH-0400: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0401 | `toPotentialDescriptor` | genuine | Public helper: potential (Soshitsu) → Japanese DescriptorBand. | ORPH-0401: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0393 | `DurationBand` | genuine | Status: REFACTORED / SERVICE-ORIENTED (module context) | ORPH-0393: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0396 | `toDurationBand` | genuine | Status: REFACTORED / SERVICE-ORIENTED (module context) | ORPH-0396: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0571 | `KadobanStatus` | intentional | Kadoban campaign state — structurally compatible with OzekiKadobanState. | Parameter type of the live promotionBands.kadobanDramaBand API; pinned by promotionBands tests |
| ORPH-0574 | `resolveOzekiRunBand` | intentional | Get the Ozeki-run narrative band for a candidate's recent win total. | Internal resolver invoked by promotionBands.ozekiRunBand; exported for unit testing |
| ORPH-0576 | `resolveYokozunaSupportBand` | intentional | Get the council-support band for a Yokozuna candidate's media heat. | Internal resolver invoked by resolveYokozunaRunBand and promotionBands; exported for unit testing |
| ORPH-0575 | `resolveYokozunaRunBand` | intentional | Get the Yokozuna-run narrative band from recent yusho/jun-yusho counts | Internal resolver invoked by promotionBands.yokozunaRunBand; exported for unit testing |
| ORPH-0573 | `resolveKadobanDramaBand` | intentional | Get the Kadoban narrative band for an Ozeki's make-koshi campaign. | Internal resolver invoked by promotionBands.kadobanDramaBand; exported for unit testing |
| ORPH-0484 | `narrativeDescriptions` | intentional | Status: REFACTORED / SERVICE-ORIENTED | Consumed by src/presenters/uiDigest.ts — presenters are outside the unticked scan scope |
| ORPH-0572 | `promotionBands` | intentional | Promotion narrative-state classification (Ozeki run, Yokozuna run, Kadoban | Consumed by src/presenters/projections/promotionProjections.ts — presenters are outside the unticked scan scope |

*File(s): `src/engine/narrative/NarrativeProse.ts`, `src/engine/narrative/PostBashoPressService.ts`, `src/engine/narrative/RivalryHeatService.ts`, `src/engine/narrative/descriptorBands.ts`, `src/engine/narrative/promotionBands.ts`, `src/engine/narrative/narrativeDescriptions.ts`*

## engine/bout — 21 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0122 | `chooseBaseTactic` | intentional | Original style/roll based CPU tactic selection. | Bout AI tactic selection utility |
| ORPH-0124 | `CornerAdviceContext` | intentional | Read-only, player-facing corner advice generated before a bout. The engine (module context) | Parameter type of buildRecommendation/getAdvice; pinned by CornerAdvice tests |
| ORPH-0125 | `getBoutAnimationFamily` | intentional | Maps a kimarite ID to its animation family via the engine's KimariteClass | Internal helper invoked by buildBoutScript; exported for unit testing |
| ORPH-0126 | `getLeaderWins` | intentional | Yusho contention and playoff scenario detection. (module context) | Bout contention leader wins utility |
| ORPH-0127 | `calculateTorque` | intentional | `export function calculateTorque(grip: HandGrip, force: number): number {` | Internal helper invoked by computeNetTorque; exported for unit testing |
| ORPH-0128 | `computeNetTorque` | intentional | `export function computeNetTorque(` | Internal helper invoked by evolveGripGeometry and initBeltBattle; exported for unit testing |
| ORPH-0131 | `applyRivalryToRikishi` | intentional | Applies temporary bout-only modifiers to a cloned rikishi: | Internal helper invoked by resolveBout; exported for unit testing |
| ORPH-0300 | `resolveTacticalClash` | intentional | Resolves the tactical clash modifiers between two rikishi. | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0212 | `classifyHiwaza` | intentional | Classify a bout finish as a hiwaza from the loser's terminal body state, | Internal classifier exercised directly by hiwaza.test.ts |
| ORPH-0302 | `getKimariteByJsaCategory` | intentional | Get kimarite by JSA category | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0301 | `getKimariteByClass` | intentional | Get kimarite by legacy KimariteClass | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0303 | `getKimariteCount` | intentional | --- Domain Models & Defaults --- (module context) | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0304 | `getKimariteForFamily` | intentional | Get kimarite for tactical family | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0143 | `calculateHansokuChance` | intentional | Calculates the probability that the winner of a bout commits a foul | Internal helper invoked by tryHansoku; exported for unit testing |
| ORPH-0144 | `SHINITAI_INSTABILITY_DIFF_THRESHOLD` | intentional | Instability difference below which shini-tai is invoked (simultaneous exit). | Internal constant consumed by tryShinitai; value pinned by shinitai tests |
| ORPH-0215 | `pickTerminalKimarite` | intentional | Pick one candidate, weights = real share × plausibility multiplier. | Internal picker exercised directly by terminalKimarite.test.ts |
| ORPH-0145 | `YaochoIndicators` | intentional | Match-fixing scandal trigger. (module context) | Return type of evaluateYaochoIndicators consumed by checkYaocho; pinned by yaocho tests |
| ORPH-0146 | `evaluateYaochoIndicators` | intentional | Evaluates yaocho indicators for a given bout result. | Internal helper invoked by checkYaocho; exported for unit testing |
| ORPH-0147 | `calculateYaochoChance` | intentional | Calculates the probability of yaocho detection based on indicators. | Internal helper invoked by checkYaocho; exported for unit testing |
| ORPH-0475 | `ReplayMetadata` | intentional | Engine-side logic for replay timing and metadata. | Consumed by src/presenters/engineAccess.ts — presenters are outside the unticked scan scope |
| ORPH-0473 | `index` | intentional | Barrel re-export for the kimarite subsystem. | Domain barrel retained as public API surface — deep-import policy leaves it unconsumed |

*File(s): `src/engine/bout/BoutAI.ts`, `src/engine/bout/CornerAdvice.ts`, `src/engine/bout/ReplayMetadata.ts`, `src/engine/bout/boutContention.ts`, `src/engine/bout/boutGrip.ts`, `src/engine/bout/boutResolver.ts`, `src/engine/bout/h2h.ts`, `src/engine/bout/hiwaza.ts`, `src/engine/bout/kimarite/kimariteRegistry.ts`, `src/engine/bout/kinjite.ts`, `src/engine/bout/shinitai.ts`, `src/engine/bout/terminalKimarite.ts`, `src/engine/bout/yaocho.ts`, `src/engine/bout/kimarite/index.ts`*

## engine/training — 17 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0323 | `getStatCeiling` | intentional | Derives the stat ceiling for a given attribute from talentSeed. | Internal helper invoked by getEffectiveCeiling; exported for unit testing |
| ORPH-0322 | `diminishingReturnsMult` | intentional | Quadratic diminishing returns for smooth capping. | Internal helper invoked by calculateGrowthWithModifiers; exported for unit testing |
| ORPH-0324 | `normalizeTrainingProfile` | intentional | Clamp every training-profile field to a valid key. A profile can arrive with a | Internal helper invoked by calculateFatigueDelta and calculateGrowthWithModifiers; exported for unit testing |
| ORPH-0321 | `calculateGrowthWithModifiers` | intentional | Core growth calculation using pre-extracted modifiers. No heya/world access. | Internal helper invoked by calculateGains and calculateGrowthVector; exported for unit testing |
| ORPH-0329 | `TSUKEBITO_SENIOR_RANK_THRESHOLD` | intentional | Minimum rank number to be eligible for tsukebito (sekiwake and above = rankNum <= 3) | Policy constant consumed by isEligibleForTsukebito; value pinned by TsukebitoService tests |
| ORPH-0331 | `TSUKEBITO_TRAINING_BOOST` | intentional | Training boost per tsukebito for the senior rikishi | Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests |
| ORPH-0328 | `TSUKEBITO_MORALE_BOOST` | intentional | Morale boost for being a tsukebito | Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests |
| ORPH-0330 | `TSUKEBITO_TECHNIQUE_EXPOSURE` | intentional | Technique exposure bonus for tsukebito | Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests |
| ORPH-0326 | `OTOTODESHI_FATIGUE_PENALTY` | intentional | Fatigue penalty for ototodeshi (chores) | Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests |
| ORPH-0327 | `OTOTODESHI_MENTAL_GAIN` | intentional | Mental toughness gain for ototodeshi | Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests |
| ORPH-0325 | `isEligibleTsukebito` | intentional | Check if a rikishi is eligible to be a tsukebito. | Internal helper invoked by assignTsukebito, isJuniorTsukebitoEligible, and setTsukebito; exported for unit testing |
| ORPH-0181 | `WEIGHT_JOURNEY_MIN_GAP` | intentional | Minimum gap (kg) between current and target weight to enter bulking | Config constant for weight journey min gap |
| ORPH-0182 | `WEIGHT_JOURNEY_WEEKLY_GAIN` | intentional | Weekly progress (kg) when nutrition is adequate | Internal constant consumed by applyWeightJourneyTick; value pinned by WeightJourney tests |
| ORPH-0183 | `WEIGHT_JOURNEY_POWER_BOOST` | intentional | Power bonus on breakthrough | Config constant for weight journey power boost |
| ORPH-0184 | `WEIGHT_JOURNEY_BALANCE_BOOST` | intentional | Balance bonus on breakthrough | Config constant for weight journey balance boost |
| ORPH-0185 | `shouldEnterWeightJourney` | intentional | Determines whether a rikishi should enter a weight journey. | Internal helper invoked by applyWeightJourneyTick; exported for unit testing |
| ORPH-0567 | `getRestFatigueFloor` | intentional | Resting fatigue floor (P3): residual fatigue a rikishi cannot shed during | Internal helper invoked by weeklyTraining; pinned by dormitory tests |

*File(s): `src/engine/training/TrainingMath.ts`, `src/engine/training/TsukebitoService.ts`, `src/engine/training/WeightJourney.ts`, `src/engine/training/weeklyTraining.ts`*

## engine/core — 14 entries (2 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0150 | `updateHeyaImpact` | intentional | Convenience function to create a simple heya update impact. | Impact builder heya update utility |
| ORPH-0151 | `updateRikishiImpact` | intentional | Convenience function to create a simple rikishi update impact. | Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test |
| ORPH-0152 | `updateWorldFieldImpact` | intentional | Convenience function to create a world field update impact. | Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test |
| ORPH-0548 | `ViolationKind` | intentional | World ID-integrity system. (module context) | ORPH-0548: idIntegrity audit API type — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0546 | `IdIntegrityViolation` | intentional | World ID-integrity system. (module context) | ORPH-0546: idIntegrity audit API type — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0545 | `findDuplicateIds` | intentional | All IDs that appear more than once in `ids` (each reported once). | ORPH-0545: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0547 | `validateWorldIdIntegrity` | intentional | Audit the world for ID-integrity violations. Pure — never mutates. | ORPH-0547: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0544 | `assertWorldIdIntegrity` | intentional | Throw if `world` has any ID-integrity violations. For tests and | ORPH-0544: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0305 | `getHeyaRosterIds` | intentional | Get the rikishi IDs for a heya, safely returning an empty array | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0306 | `getNPCHeyas` | genuine | Get all NPC-managed heyas (excludes the player heya). | ORPH-0306: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0307 | `getSelectorsActiveRikishi` | genuine | Get all active rikishi as an array. | ORPH-0307: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0308 | `getEligibleOpponents` | intentional | Returns all eligible opponents for a given rikishi. | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0309 | `getStableFinances` | intentional | Convenience selector to get stable finances. | Live module surface — referenced outside its file (3 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0310 | `getRikishiBashoStats` | intentional | Retrieves the basho statistics (wins, losses, absences) for a specific rikishi. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |

*File(s): `src/engine/core/ImpactBuilder.ts`, `src/engine/core/idIntegrity.ts`, `src/engine/core/queries.ts`, `src/engine/core/selectors.ts`, `src/engine/core/world.ts`*

## engine/history — 13 entries (8 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0378 | `tryAddInductee` | intentional | Attempts to add a rikishi to the Hall of Fame for a specific category. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0376 | `getInducteesByCategory` | genuine | Get inductees by category. | ORPH-0376: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0377 | `isInducted` | genuine | Is inducted. | ORPH-0377: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0379 | `generateCareerSnapshot` | intentional | Generates a career snapshot for a Rikishi based on their current state and the last basho's results. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0380 | `recordMilestones` | genuine | Detects and records milestones for a Rikishi. | ORPH-0380: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0381 | `ArchivedYear` | intentional | LRU Cache for Archived Historical Data. (module context) | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0382 | `BashoKey` | intentional | Canon key for a basho (unique). | Live module surface — referenced outside its file (6 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0387 | `RikishiHistoryEntry` | genuine | Minimal "what happened this basho" record for a rikishi | ORPH-0387: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0383 | `buildHistoryIndex` | genuine | Build index from world history array. | ORPH-0383: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0386 | `listBashoSummaries` | genuine | History Index System v1.0 (module context) | ORPH-0386: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0384 | `getBashoSummary` | genuine | History Index System v1.0 (module context) | ORPH-0384: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0385 | `getRikishiHistory` | genuine | History Index System v1.0 (module context) | ORPH-0385: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0388 | `computeStatureBand` | intentional | Compute stature band based on roster rank composition. | Internal helper invoked by runPrestigeDecay; exported for unit testing |

*File(s): `src/engine/history/hallOfFame.ts`, `src/engine/history/history.ts`, `src/engine/history/historyCache.ts`, `src/engine/history/historyIndex.ts`, `src/engine/history/prestige.ts`*

## engine/persistence — 9 entries (5 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0459 | `MigrationContext` | genuine | handles save-version upgrades. (module context) | ORPH-0459: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0460 | `MigrationResult` | genuine | handles save-version upgrades. (module context) | ORPH-0460: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0457 | `saveReplacer` | genuine | JSON replacer/reviver pair for save serialization. (module context) | ORPH-0457: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0458 | `saveReviver` | genuine | JSON replacer/reviver pair for save serialization. (module context) | ORPH-0458: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0461 | `ElectronArchiveService` | intentional | ElectronArchiveService — file system-based archive service for Electron. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0462 | `ArchiveConflictError` | intentional | Type guards to ensure parsed JSON matches the expected structure. (module context) | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0463 | `OPFSArchiveService` | intentional | Type guards to ensure parsed JSON matches the expected structure. (module context) | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0464 | `hasStorageProvider` | genuine | Check if a storage provider has been registered. | ORPH-0464: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0465 | `resetStorageProvider` | intentional | Reset the storage provider to null. Used in test cleanup to prevent state pollution. | Live module surface — referenced outside its file (3 consumer(s) via deep path or type-position import the auditor cannot resolve) |

*File(s): `src/engine/persistence/MigrationService.ts`, `src/engine/persistence/collectionCodec.ts`, `src/engine/persistence/storage/electronArchive.ts`, `src/engine/persistence/storage/opfsArchive.ts`, `src/engine/persistence/storageProvider.ts`*

## engine/governance — 7 entries (1 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0311 | `KANREKI_AGE` | intentional | Age at which kanreki occurs | Internal constant consumed by isEligibleForKanreki and performKanrekiCeremony; value pinned by kanreki tests |
| ORPH-0312 | `KANREKI_POPULARITY_BOOST` | intentional | Popularity boost for kanreki ceremony | Internal constant consumed by performKanrekiCeremony; value pinned by kanreki tests |
| ORPH-0313 | `ATTENDANT_POPULARITY_BOOST` | intentional | Popularity boost for being selected as an attendant | Internal constant consumed by assignYokozunaAttendants; value pinned by yokozunaAttendants tests |
| ORPH-0314 | `isEligibleAttendant` | intentional | Validate that a rikishi is eligible to be an attendant. | Internal validation helper used by assignYokozunaAttendants (same file); audit's same-file exclusion is a false positive |
| ORPH-0316 | `GOMENFUDA_REPUTATION_PENALTY` | intentional | Reputation penalty per gomenfuda | Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests |
| ORPH-0315 | `CONSECUTIVE_WITHDRAWAL_MULTIPLIER` | intentional | Reputation penalty multiplier for consecutive withdrawals | Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests |
| ORPH-0317 | `executeMyosekiLease` | genuine | Lease a myoseki stock — transfers holderId without transferring ownerId. | ORPH-0317: private-treaty lease between stock holders — no worker command or NPC initiator negotiates peer leases; market leasing via myosekiMarket.leaseMyoseki is the live path |

*File(s): `src/engine/governance/ceremonies/kanrekiCeremony.ts`, `src/engine/governance/ceremonies/yokozunaAttendants.ts`, `src/engine/governance/services/GomenfudaService.ts`, `src/engine/governance/services/MyosekiTradingService.ts`*

## engine/recruitment — 7 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0466 | `getConfidenceFromLevel` | intentional | Determine qualitative confidence from numerical level. | Internal helper invoked by getConfidenceLevel; exported for unit testing |
| ORPH-0467 | `getEstimatedValue` | intentional | Maps confidence to an estimated value with deterministic error. | Internal helper invoked by resolveScoutedAttribute; exported for unit testing |
| ORPH-0470 | `getQualityBonus` | intentional | Get the quality bonus for the academy based on its level. | Public helper exercised directly by youthAcademy.test.ts |
| ORPH-0468 | `HARD_CAP_ROSTER_SIZE` | intentional | h a r d_ c a p_ r o s t e r_ s i z e. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0469 | `scoutingNoiseSpread` | intentional | Computes the ± spread of scouting noise for a stable given its scouting investment. | Internal helper invoked by perceivedTalentSeed; exported for unit testing |
| ORPH-0565 | `ScoutTierDef` | intentional | local (module context) | Type export; scout mission tier API contract |
| ORPH-0564 | `ScoutStats` | intentional | Scout sub-stats derived from competence bands + skill (P2 staff field). | Type export; scout stats API contract |

*File(s): `src/engine/recruitment/FogOfWarService.ts`, `src/engine/recruitment/YouthAcademyService.ts`, `src/engine/recruitment/overflow.ts`, `src/engine/recruitment/perceivedTalent.ts`, `src/engine/recruitment/scoutMissions.ts`*

## engine/worker — 7 entries (7 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0543 | `labelForWorld` | genuine | Label for world. | ORPH-0543: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0540 | `buildInjurySection` | genuine | Build injury section for digest. | ORPH-0540: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0538 | `buildEventSections` | genuine | Build event sections for digest. | ORPH-0538: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0539 | `buildHeadline` | genuine | Build headline for digest. | ORPH-0539: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0541 | `buildMatchupItems` | genuine | Build matchup items for digest. | ORPH-0541: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0542 | `buildTrainingReportSection` | genuine | Build training report section from TRAINING_STAT_DELTA events. | ORPH-0542: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0537 | `buildAdvisorSection` | genuine | Build advisor recommendations section for digest. | ORPH-0537: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |

*File(s): `src/engine/worker/digestProjections.ts`*

## engine/lifecycle — 6 entries (4 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0479 | `KeyBoutLabel` | genuine | ── Types ─────────────────────────────────────────────────────────────────── | ORPH-0479: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0318 | `archiveRikishiToColdStorage` | genuine | Archive a retiring rikishi's full record to cold storage. | ORPH-0318: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0570 | `evaluateFoundingEligibility` | intentional | Pure eligibility predicate for stable founding — models the real JSA | Internal helper invoked by maybeFoundStable (live retiree→oyakata founding path); exported for unit testing |
| ORPH-0319 | `_generateRookie` | intentional | Internal function to generate a new rookie rikishi. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0478 | `CareerService` | genuine | Manages the life cycle of a rikishi's career, including retirement and legacy induction. (module context) | ORPH-0478: zero live references (comment mentions + own tests only) — retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0480 | `rookieFactory` | genuine | Creates new recruits with diverse origins and archetypes. | ORPH-0480: consumed only by its own tests — retained per reorg dead-code policy (archive candidate, not deleted) |

*File(s): `src/engine/lifecycle/keyBouts.ts`, `src/engine/lifecycle/processRetirements.ts`, `src/engine/lifecycle/retireeOyakataConversion.ts`, `src/engine/lifecycle/rookieFactory.ts`, `src/engine/lifecycle/CareerService.ts`*

## engine/matchmaking — 6 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0159 | `isMakuuchiDebut` | intentional | Drama-aware matchmaking post-processing for Swiss algorithm. (module context) | Internal helper invoked by checkDebutShowcase; exported for unit testing |
| ORPH-0160 | `scoreDrama` | intentional | Scores a pairing for narrative drama value. | Internal helper invoked by applyDramaBudget and isMakuuchiDebut; exported for unit testing |
| ORPH-0161 | `DEFAULT_MATCHMAKING_RULES` | intentional | d e f a u l t_ m a t c h m a k i n g_ r u l e s. | Default matchmaking rules; used by basho setup |
| ORPH-0163 | `buildCandidatePairs` | intentional | Build candidate pairs for a division. | Internal helper invoked by generatePairs; exported for unit testing |
| ORPH-0164 | `buildPlayoffPairs` | intentional | Build playoff pairs for a division. | Matchmaking playoff pair builder utility |
| ORPH-0165 | `buildExhibitionPairs` | intentional | Build exhibition pairs for demonstration. | Matchmaking exhibition pair builder utility |

*File(s): `src/engine/matchmaking/DramaMatchmaker.ts`, `src/engine/matchmaking/MatchmakingPhases.ts`*

## engine/health — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0372 | `ENCOURAGEMENT_MOTIVATION_BOOST` | intentional | Motivation boost applied to the recipient | Config constant for encouragement action |
| ORPH-0373 | `calculateWeeklyInjuryChance` | intentional | Calculates a weekly injury chance for a rikishi. | Internal helper invoked by rollWeeklyInjury; exported for unit testing |
| ORPH-0374 | `clearInjury` | intentional | Clears an active injury from a rikishi (UI action: doctor clearance). | Internal helper invoked by onBoutResolvedInjury; exported for unit testing |
| ORPH-0375 | `toInjuryEvent` | intentional | Converts a rikishi's current injury state to an engine event object for UI display. | Internal helper invoked by clearInjury; exported for unit testing |
| ORPH-0562 | `PHYSIO_WEEKS_PER_SESSION` | intentional | Max weeks a single session can remove. | Internal constant consumed by physio purchase flow; exported for unit testing |

*File(s): `src/engine/health/InjuredEncouragement.ts`, `src/engine/health/InjuryService.ts`, `src/engine/health/physioPurchase.ts`*

## engine/shikona — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0320 | `generateRikishiName` | intentional | Generates a basic Shikona (wrestler name) for a rikishi using a seed. | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0171 | `extractLegacyPrefix` | intentional | Legacy shikona generation functions. (module context) | Internal helper invoked by generateLegacyShikona; exported for unit testing |
| ORPH-0172 | `extractLegacySuffix` | intentional | Legacy shikona generation functions. (module context) | Internal helper invoked by generateLegacyShikona; exported for unit testing |
| ORPH-0173 | `RANK_RULES` | intentional | Rank rules for shikona generation system. (module context) | Rank rules table for shikona generation |
| ORPH-0174 | `resolveRankTier` | intentional | Rank rules for shikona generation system. (module context) | Rank tier resolution utility |

*File(s): `src/engine/shikona/generateShikona.ts`, `src/engine/shikona/legacy.ts`, `src/engine/shikona/rankRules.ts`*

## engine/utils — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0187 | `logger` | intentional | Export singleton instance | Shared singleton backing the live debug/info/warn/error wrappers (consumed by bootstrap, useFlowActions, BanzukePublisher); pinned by logger tests |
| ORPH-0577 | `isAtForeignLimit` | intentional | Determines the current citizenship status of a rikishi. (module context) | Canonical foreign-limit predicate pinned by the foreign-limit-consistency audit test; runtime callers use getForeignCountInHeya |
| ORPH-0204 | `localClampInt` | intentional | Standardizes the 'localClampInt' pattern used in banzuke logic. | Math utility for clamping integers |
| ORPH-0205 | `seededWeightedPick` | intentional | Standardizes 'weighted pick' for logic like injury types or archetypes. | Random utility for seeded weighted picking |
| ORPH-0206 | `formatShikona` | intentional | Standardizes rikshina/name formatting. | String formatting utility for shikona |

*File(s): `src/engine/utils/Logger.ts`, `src/engine/utils/citizenshipUtils.ts`, `src/engine/utils/math.ts`, `src/engine/utils/random.ts`, `src/engine/utils/string.ts`*

## engine/bard — 4 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0116 | `checkTriggeredDrama` | intentional | Generates "Drama Events" (Scandals, Grudges, Crises) based on world state. (module context) | Internal drama trigger invoked by processDramaTick; exported for unit testing |
| ORPH-0117 | `checkBashoDayDrama` | intentional | Basho-day-specific drama events. | Internal helper invoked by checkTriggeredDrama; exported for unit testing |
| ORPH-0118 | `triggerCrisis` | intentional | Generates "Drama Events" (Scandals, Grudges, Crises) based on world state. (module context) | Internal crisis factory invoked by checkTriggeredDrama; exported for unit testing |
| ORPH-0120 | `VENUE_PROFILES` | intentional | `export const VENUE_PROFILES: Record<` | Venue profile data for narrative generation |

*File(s): `src/engine/bard/dramaGenerator.ts`, `src/engine/bard/narrativeContext.ts`*

## engine/basho — 3 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0332 | `isExhibitionBasho` | intentional | Check if a basho name is an exhibition (jungyo) event | Type-guard predicate paired with isHonbasho on the live ExhibitionBashoService (phase05 jungyo pipeline); pinned by exhibitionBasho.test |
| ORPH-0333 | `isHonbasho` | intentional | Check if a basho name is a honbasho (official ranking tournament). | Name predicate consumed by getExhibitionBashoSchedule and getNextEvent; pinned by exhibitionBasho.test |
| ORPH-0334 | `NAKABI_DAY` | intentional | The basho day on which nakabi occurs (day 8 of 15) | Internal constant consumed by isNakabiDay and generateNakabiSummary; exported for unit testing |

*File(s): `src/engine/basho/ExhibitionBashoService.ts`, `src/engine/basho/NakabiService.ts`*

## engine/keshoMawashi — 3 entries (2 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0390 | `getHeyaBrand` | intentional | Get brand identity for a heya. | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0389 | `adjustBrandForOyakata` | genuine | Update tradition level based on oyakata archetype. | ORPH-0389: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0477 | `KeshoMawashiGenerator` | genuine | thin re-export barrel | ORPH-0477: consumed only by its own tests — retained per reorg dead-code policy (archive candidate, not deleted) |

*File(s): `src/engine/keshoMawashi/HeyaBrandGenerator.ts`, `src/engine/keshoMawashi/KeshoMawashiGenerator.ts`*

## engine/legacy — 2 entries (2 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0391 | `ensureLineage` | genuine | `export function ensureLineage(world: WorldState): LineageEdge[] {` | ORPH-0391: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |
| ORPH-0392 | `LineageTreeNode` | genuine | `export interface LineageTreeNode {` | ORPH-0392: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted) |

*File(s): `src/engine/legacy/lineage.ts`*

## engine/welfare — 2 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0471 | `getSeverityWeight` | intentional | Weights injury severity for welfare pressure. | Internal helper invoked by computeInjuryPressure; exported for unit testing |
| ORPH-0568 | `harmonyBandFor` | intentional | the headline "stable mood" metric (P2). Derived, never (module context) | Internal helper invoked by harmony module; pinned by harmony tests |

*File(s): `src/engine/welfare/WelfareCalculations.ts`, `src/engine/welfare/harmony.ts`*

## engine/banzuke — 1 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0299 | `computeVariableSanyakuCounts` | intentional | Computes the required counts for Sanyaku slots (Yokozuna, Ozeki, Sekiwake, Komusubi) based on performance. | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |

*File(s): `src/engine/banzuke/banzukeOps.ts`*

## engine/almanac — 1 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0472 | `index` | intentional | Tracks rikishi career records, heya records, and historical snapshots | Domain barrel retained as public API surface — deep-import policy leaves it unconsumed |

*File(s): `src/engine/almanac/index.ts`*

## engine/rikishi — 1 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict / note |
|---|---|---|---|---|
| ORPH-0566 | `signatureKimarite` | intentional | derived from `rikishi.history: MatchResultLog[]` | Unticked service consumed via presenters/engineAccess + RikishiCarePanel; not tick-phase-bound |

*File(s): `src/engine/rikishi/signatureKimarite.ts`*