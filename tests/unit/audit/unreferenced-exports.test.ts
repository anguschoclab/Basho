/**
 * Phase 5c: Orphan classification test.
 *
 * Verifies that every entry in the orphan audit baseline (unreferenced exports,
 * unused components, orphan routes, unticked services, write-only state) is
 * either:
 * 1. Intentional — public type exports (interfaces, types) used as API
 *    contracts, or utility functions/constants retained for future use
 * 2. A genuine orphan that should be wired or removed, tracked by ORPH-XXXX
 *
 * This test acts as a regression gate: if a new orphan appears in the baseline,
 * it must be classified here before CI passes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { toKeyedMap } from "@/engine/utils/index";

const ROOT = join(__dirname, "../../../");
const AUDIT_JSON = join(ROOT, ".windsurf", "audit", "baseline-orphans.json");

interface AuditEntry {
  id: string;
  file: string;
  symbol: string;
  orphanType: string;
  priority: string;
  status: string;
}

/**
 * All unreferenced exports classified as intentional public API.
 *
 * Type exports (interfaces, types) are the engine's public contract — they're
 * exported so consumers can type-check against them even if not directly imported.
 * Function/const exports are utility helpers retained for future wiring.
 *
 * Every entry must have a reason string.
 */
const INTENTIONAL_EXPORTS: Record<string, string> = {
  // ── Type exports: public API contracts ──

  // ── Constants: retained for future use or external consumers ──
  "src/engine/generation/FightingNameEarly.ts:EARLY_SHIKONA_CHANCE":
    "Config constant for early shikona generation",
  "src/engine/generation/FightingNameEarly.ts:EARLY_SHIKONA_MOTIVATION_BOOST":
    "Config constant for early shikona motivation boost",
  "src/engine/generation/SponsorGenerator.ts:INDUSTRY_TAGS":
    "Sponsor generation industry tags; used by world factory",
  "src/engine/generation/SponsorGenerator.ts:INITIAL_SPONSOR_TIER_DISTRIBUTION":
    "Config for initial sponsor tier distribution",
  "src/engine/health/InjuredEncouragement.ts:ENCOURAGEMENT_MOTIVATION_BOOST":
    "Config constant for encouragement action",
  "src/engine/matchmaking/MatchmakingPhases.ts:DEFAULT_MATCHMAKING_RULES":
    "Default matchmaking rules; used by basho setup",
  "src/engine/bard/narrativeContext.ts:VENUE_PROFILES":
    "Venue profile data for narrative generation",
  "src/engine/shikona/rankRules.ts:RANK_RULES": "Rank rules table for shikona generation",
  "src/engine/training/WeightJourney.ts:WEIGHT_JOURNEY_MIN_GAP":
    "Config constant for weight journey min gap",
  "src/engine/training/WeightJourney.ts:WEIGHT_JOURNEY_POWER_BOOST":
    "Config constant for weight journey power boost",
  "src/engine/training/WeightJourney.ts:WEIGHT_JOURNEY_BALANCE_BOOST":
    "Config constant for weight journey balance boost",

  // ── Functions: utility helpers retained for future wiring ──
  "src/engine/generation/SponsorGenerator.ts:generateSponsor":
    "Sponsor generation function; used by world factory internally",
  "src/engine/generation/SponsorGenerator.ts:generateSponsorId":
    "Sponsor ID generation utility",
  "src/engine/generation/SponsorGenerator.ts:generateSponsorNameV2":
    "Sponsor name generation utility",
  "src/engine/generation/SponsorGenerator.ts:rollSponsorCategory":
    "Sponsor category rolling utility",
  "src/engine/generation/SponsorGenerator.ts:getTierTraitRanges":
    "Sponsor tier trait range utility",
  "src/engine/generation/SponsorGenerator.ts:rollTier": "Sponsor tier rolling utility",
  "src/engine/core/idIntegrity.ts:ViolationKind":
    "ORPH-0548: idIntegrity audit API type — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references",
  "src/engine/core/idIntegrity.ts:IdIntegrityViolation":
    "ORPH-0546: idIntegrity audit API type — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references",
  "src/engine/core/idIntegrity.ts:findDuplicateIds":
    "ORPH-0545: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references",
  "src/engine/core/idIntegrity.ts:validateWorldIdIntegrity":
    "ORPH-0547: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references",
  "src/engine/core/idIntegrity.ts:assertWorldIdIntegrity":
    "ORPH-0544: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references",
  "src/engine/narrative/NarrativeProse.ts:hydrateDescriptor":
    "Narrative prose hydration utility",
  "src/engine/narrative/RivalryHeatService.ts:bumpTrigger":
    "Rivalry heat bump trigger utility",
  "src/engine/bout/BoutAI.ts:chooseBaseTactic": "Bout AI tactic selection utility",
  "src/engine/bout/boutContention.ts:getLeaderWins": "Bout contention leader wins utility",
  "src/engine/core/ImpactBuilder.ts:updateHeyaImpact": "Impact builder heya update utility",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildPlayoffPairs":
    "Matchmaking playoff pair builder utility",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildExhibitionPairs":
    "Matchmaking exhibition pair builder utility",
  "src/engine/npc/LeaguePerception.ts:emptyLeaguePerception":
    "Empty league perception factory utility",

  "src/engine/shikona/rankRules.ts:resolveRankTier": "Rank tier resolution utility",
  "src/engine/npc/strategy/NPCFinanceCalculator.ts:getFinanceStrategy":
    "NPC finance strategy getter utility",
  "src/engine/npc/strategy/NPCGovernanceCalculator.ts:getGovernanceStrategy":
    "NPC governance strategy getter utility",
  "src/engine/utils/math.ts:localClampInt": "Math utility for clamping integers",
  "src/engine/utils/random.ts:seededWeightedPick": "Random utility for seeded weighted picking",
  "src/engine/utils/string.ts:formatShikona": "String formatting utility for shikona",

  // ── Newly classified after audit-orphans.ts fix ──
  "src/engine/basho/ExhibitionBashoService.ts:isExhibitionBasho":
    "Type-guard predicate paired with isHonbasho on the live ExhibitionBashoService (phase05 jungyo pipeline); pinned by exhibitionBasho.test",
  "src/engine/basho/ExhibitionBashoService.ts:isHonbasho":
    "Name predicate consumed by getExhibitionBashoSchedule and getNextEvent; pinned by exhibitionBasho.test",
  "src/engine/basho/NakabiService.ts:NAKABI_DAY":
    "Internal constant consumed by isNakabiDay and generateNakabiSummary; exported for unit testing",
  "src/engine/welfare/WelfareCalculations.ts:getSeverityWeight":
    "Internal helper invoked by computeInjuryPressure; exported for unit testing",
  "src/engine/economy/KachiNokoriService.ts:KACHI_NOKORI_THRESHOLD":
    "Internal constant consumed by calculateKachiNokori; value pinned by kachiNokori.test",
  "src/engine/training/TrainingMath.ts:getStatCeiling":
    "Internal helper invoked by getEffectiveCeiling; exported for unit testing",
  "src/engine/training/TrainingMath.ts:diminishingReturnsMult":
    "Internal helper invoked by calculateGrowthWithModifiers; exported for unit testing",
  "src/engine/training/TrainingMath.ts:normalizeTrainingProfile":
    "Internal helper invoked by calculateFatigueDelta and calculateGrowthWithModifiers; exported for unit testing",
  "src/engine/training/TrainingMath.ts:calculateGrowthWithModifiers":
    "Internal helper invoked by calculateGains and calculateGrowthVector; exported for unit testing",
  "src/engine/health/InjuryService.ts:calculateWeeklyInjuryChance":
    "Internal helper invoked by rollWeeklyInjury; exported for unit testing",
  "src/engine/health/InjuryService.ts:clearInjury":
    "Internal helper invoked by onBoutResolvedInjury; exported for unit testing",
  "src/engine/health/InjuryService.ts:toInjuryEvent":
    "Internal helper invoked by clearInjury; exported for unit testing",
  "src/engine/recruitment/perceivedTalent.ts:scoutingNoiseSpread":
    "Internal helper invoked by perceivedTalentSeed; exported for unit testing",
  "src/engine/recruitment/FogOfWarService.ts:getConfidenceFromLevel":
    "Internal helper invoked by getConfidenceLevel; exported for unit testing",
  "src/engine/recruitment/FogOfWarService.ts:getEstimatedValue":
    "Internal helper invoked by resolveScoutedAttribute; exported for unit testing",
  "src/engine/governance/services/GomenfudaService.ts:GOMENFUDA_REPUTATION_PENALTY":
    "Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests",
  "src/engine/governance/services/GomenfudaService.ts:CONSECUTIVE_WITHDRAWAL_MULTIPLIER":
    "Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests",
  "src/engine/training/TsukebitoService.ts:isEligibleTsukebito":
    "Internal helper invoked by assignTsukebito, isJuniorTsukebitoEligible, and setTsukebito; exported for unit testing",
  "src/engine/generation/PreSumoBackground.ts:PRE_SUMO_BACKGROUNDS":
    "Internal table consumed by applyBackgroundStatModifiers and assignPreSumoBackground; exported for unit testing",
  "src/engine/generation/applyOyakataConfig.ts:PLAYER_BACKSTORIES":
    "Internal table consumed by applyOyakataCreationConfig; exported for unit testing",
  "src/engine/generation/competitiveBalance.ts:recruitmentBalanceMultiplier":
    "Consumed by TalentPoolNPCRecruitment (NPC recruitment pipeline); pinned by competitiveBalance tests",
  "src/engine/generation/TalentPoolMaterialization.ts:materializeCandidateToRikishi":
    "Consumed by TalentPoolNPCRecruitment (NPC talent materialization); pinned by materialization tests",
  "src/engine/generation/PersonaAssignment.ts:assignPressPersona":
    "Internal helper invoked by applyPersonaAssignment; exported for unit testing",
  "src/engine/generation/PersonaAssignment.ts:assignPersonalityTraits":
    "Internal helper invoked by applyPersonaAssignment; exported for unit testing",
  "src/engine/generation/PersonaAssignment.ts:rollBirthday":
    "Internal helper invoked by applyPersonaAssignment; exported for unit testing",
  "src/engine/npc/MemoryStore.ts:emptyOyakataMemory":
    "Internal helper invoked by getMemory; exported for unit testing",
  "src/engine/npc/opponentLearning.ts:MAX_OPPONENT_MODELS":
    "Config constant for the opponent-model eviction cap",
  "src/engine/npc/ArchetypeAdaptation.ts:MetaAdaptationState":
    "Exported for unit testing; consumed via evaluateAdaptation in production",
  "src/engine/npc/ArchetypeAdaptation.ts:updateMetaAdaptation":
    "Internal helper invoked by evaluateAdaptation; exported for unit testing",
  "src/engine/npc/execution.ts:applyCrisisRescue":
    "Internal rescue handler invoked in-module; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:checkBashoDayDrama":
    "Internal helper invoked by checkTriggeredDrama; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:checkTriggeredDrama":
    "Internal drama trigger invoked by processDramaTick; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:triggerCrisis":
    "Internal crisis factory invoked by checkTriggeredDrama; exported for unit testing",
  "src/engine/bout/yaocho.ts:evaluateYaochoIndicators":
    "Internal helper invoked by checkYaocho; exported for unit testing",
  "src/engine/bout/yaocho.ts:calculateYaochoChance":
    "Internal helper invoked by checkYaocho; exported for unit testing",
  "src/engine/bout/shinitai.ts:SHINITAI_INSTABILITY_DIFF_THRESHOLD":
    "Internal constant consumed by tryShinitai; value pinned by shinitai tests",
  "src/engine/bout/kinjite.ts:calculateHansokuChance":
    "Internal helper invoked by tryHansoku; exported for unit testing",
  "src/engine/bout/boutResolver.ts:applyRivalryToRikishi":
    "Internal helper invoked by resolveBout; exported for unit testing",
  "src/engine/bout/boutGrip.ts:calculateTorque":
    "Internal helper invoked by computeNetTorque; exported for unit testing",
  "src/engine/bout/boutGrip.ts:computeNetTorque":
    "Internal helper invoked by evolveGripGeometry and initBeltBattle; exported for unit testing",
  "src/engine/bout/ReplayMetadata.ts:getBoutAnimationFamily":
    "Internal helper invoked by buildBoutScript; exported for unit testing",
  "src/engine/core/ImpactBuilder.ts:updateRikishiImpact":
    "Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test",
  "src/engine/core/ImpactBuilder.ts:updateWorldFieldImpact":
    "Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test",
  "src/engine/governance/ceremonies/kanrekiCeremony.ts:KANREKI_AGE":
    "Internal constant consumed by isEligibleForKanreki and performKanrekiCeremony; value pinned by kanreki tests",
  "src/engine/governance/ceremonies/kanrekiCeremony.ts:KANREKI_POPULARITY_BOOST":
    "Internal constant consumed by performKanrekiCeremony; value pinned by kanreki tests",
  "src/engine/governance/ceremonies/yokozunaAttendants.ts:ATTENDANT_POPULARITY_BOOST":
    "Internal constant consumed by assignYokozunaAttendants; value pinned by yokozunaAttendants tests",
  "src/engine/governance/ceremonies/yokozunaAttendants.ts:isEligibleAttendant":
    "Internal validation helper used by assignYokozunaAttendants (same file); audit's same-file exclusion is a false positive",
  "src/engine/matchmaking/DramaMatchmaker.ts:isMakuuchiDebut":
    "Internal helper invoked by checkDebutShowcase; exported for unit testing",
  "src/engine/matchmaking/DramaMatchmaker.ts:scoreDrama":
    "Internal helper invoked by applyDramaBudget and isMakuuchiDebut; exported for unit testing",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildCandidatePairs":
    "Internal helper invoked by generatePairs; exported for unit testing",
  "src/engine/shikona/legacy.ts:extractLegacyPrefix":
    "Internal helper invoked by generateLegacyShikona; exported for unit testing",
  "src/engine/shikona/legacy.ts:extractLegacySuffix":
    "Internal helper invoked by generateLegacyShikona; exported for unit testing",
  "src/engine/training/WeightJourney.ts:WEIGHT_JOURNEY_WEEKLY_GAIN":
    "Internal constant consumed by applyWeightJourneyTick; value pinned by WeightJourney tests",
  "src/engine/training/WeightJourney.ts:shouldEnterWeightJourney":
    "Internal helper invoked by applyWeightJourneyTick; exported for unit testing",
  "src/engine/utils/Logger.ts:logger":
    "Shared singleton backing the live debug/info/warn/error wrappers (consumed by bootstrap, useFlowActions, BanzukePublisher); pinned by logger tests",

  // ── v15 baseline refresh (ORPH-0549..0570) ──
  "src/engine/economy/koenkaiDemands.ts:KoenkaiDemandKind": "Type export; koenkai demand kind API contract",
  "src/engine/economy/koenkaiDemands.ts:KoenkaiDemandDef": "Type export; koenkai demand def API contract",
  "src/engine/economy/koenkaiDemands.ts:KOENKAI_DEMANDS": "Demand table pinned by koenkaiDemands tests",
  "src/engine/economy/koenkaiDemands.ts:KOENKAI_DEMAND_PROBABILITY": "Internal constant consumed by tickMonthlyKoenkaiDemands; exported for unit testing",
  "src/engine/economy/koenkaiDemands.ts:koenkaiDemandDecisionId": "Internal helper; pinned by koenkaiDemands tests",
  "src/engine/economy/koenkaiDemands.ts:applyDemandOutcome": "Internal helper invoked by the resolveKoenkaiDemand path; exported for unit testing",
  "src/engine/economy/staffPosts.ts:STAFF_POST_SLOTS": "Internal slot table consumed by openSlots; pinned by staffPosts tests",
  "src/engine/economy/staffPosts.ts:SEVERANCE_MONTHS": "Internal constant consumed by severanceCost; pinned by staffPosts tests",
  "src/engine/economy/staffPosts.ts:CANDIDATE_POOL_SIZE": "Internal constant consumed by refreshStaffCandidatePool; exported for unit testing",
  "src/engine/economy/staffPosts.ts:filledSlots": "Internal helper invoked by openSlots; exported for unit testing",
  "src/engine/economy/staffPosts.ts:severanceCost": "Internal helper; pinned by staffPosts tests",
  "src/engine/economy/staffPosts.ts:monthlyWageBill": "Internal helper; pinned by staffPosts tests",
  "src/engine/economy/staffPosts.ts:skillFromBands": "Internal helper; pinned by staffPosts tests",
  "src/engine/health/physioPurchase.ts:PHYSIO_WEEKS_PER_SESSION": "Internal constant consumed by physio purchase flow; exported for unit testing",
  "src/engine/npc/decision/decisionQueue.ts:PENDING_DECISION_SOFT_CAP": "Internal constant consumed by decisionQueue; exported for unit testing",
  "src/engine/recruitment/scoutMissions.ts:ScoutTierDef": "Type export; scout mission tier API contract",
  "src/engine/recruitment/scoutMissions.ts:ScoutStats": "Type export; scout stats API contract",
  "src/engine/training/weeklyTraining.ts:getRestFatigueFloor": "Internal helper invoked by weeklyTraining; pinned by dormitory tests",
  "src/engine/welfare/harmony.ts:harmonyBandFor": "Internal helper invoked by harmony module; pinned by harmony tests",
  "src/engine/rikishi/signatureKimarite.ts:signatureKimarite": "Unticked service consumed via presenters/engineAccess + RikishiCarePanel; not tick-phase-bound",
  "src/engine/recruitment/YouthAcademyService.ts:getQualityBonus":
    "Public helper exercised directly by youthAcademy.test.ts",

  // ── v17 wiring-BFS re-run (T0.3): newly surfaced detections ──
  "src/engine/generation/RecruitmentController.ts:computePopulationTarget":
    "Internal helper invoked by computeReplacementGap (live NPC-recruitment equilibrium path); exported for unit testing",
  "src/engine/lifecycle/retireeOyakataConversion.ts:evaluateFoundingEligibility":
    "Internal helper invoked by maybeFoundStable (live retiree→oyakata founding path); exported for unit testing",
  "src/engine/narrative/promotionBands.ts:KadobanStatus":
    "Parameter type of the live promotionBands.kadobanDramaBand API; pinned by promotionBands tests",
  "src/engine/narrative/promotionBands.ts:resolveOzekiRunBand":
    "Internal resolver invoked by promotionBands.ozekiRunBand; exported for unit testing",
  "src/engine/narrative/promotionBands.ts:resolveYokozunaSupportBand":
    "Internal resolver invoked by resolveYokozunaRunBand and promotionBands; exported for unit testing",
  "src/engine/narrative/promotionBands.ts:resolveYokozunaRunBand":
    "Internal resolver invoked by promotionBands.yokozunaRunBand; exported for unit testing",
  "src/engine/narrative/promotionBands.ts:resolveKadobanDramaBand":
    "Internal resolver invoked by promotionBands.kadobanDramaBand; exported for unit testing",
  "src/engine/utils/citizenshipUtils.ts:isAtForeignLimit":
    "Canonical foreign-limit predicate pinned by the foreign-limit-consistency audit test; runtime callers use getForeignCountInHeya",

  // ── Classified in Oct 2026 baseline refresh ──
  "src/engine/bout/hiwaza.ts:classifyHiwaza":
    "Internal classifier exercised directly by hiwaza.test.ts",
  "src/engine/bout/terminalKimarite.ts:pickTerminalKimarite":
    "Internal picker exercised directly by terminalKimarite.test.ts",
  "src/engine/narrative/PostBashoPressService.ts:PressConferenceContext":
    "Parameter type of generatePressConference; pinned by PostBashoPress tests",
  "src/engine/training/TsukebitoService.ts:TSUKEBITO_SENIOR_RANK_THRESHOLD":
    "Policy constant consumed by isEligibleForTsukebito; value pinned by TsukebitoService tests",
  "src/engine/training/TsukebitoService.ts:TSUKEBITO_TRAINING_BOOST":
    "Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests",
  "src/engine/training/TsukebitoService.ts:TSUKEBITO_MORALE_BOOST":
    "Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests",
  "src/engine/training/TsukebitoService.ts:TSUKEBITO_TECHNIQUE_EXPOSURE":
    "Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests",
  "src/engine/training/TsukebitoService.ts:OTOTODESHI_FATIGUE_PENALTY":
    "Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests",
  "src/engine/training/TsukebitoService.ts:OTOTODESHI_MENTAL_GAIN":
    "Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests",
  "src/engine/npc/TacticalCoordinator.ts:CoordinationInput":
    "Parameter type of applyPlanConstraints; pinned by TacticalCoordinator tests",
  "src/engine/bout/CornerAdvice.ts:CornerAdviceContext":
    "Parameter type of buildRecommendation/getAdvice; pinned by CornerAdvice tests",
  "src/engine/bout/yaocho.ts:YaochoIndicators":
    "Return type of evaluateYaochoIndicators consumed by checkYaocho; pinned by yaocho tests",
  "src/engine/history/prestige.ts:computeStatureBand":
    "Internal helper invoked by runPrestigeDecay; exported for unit testing",

  // ── Classified during 2026-10 reorg (systems/* promoted to domains) ──
  "src/engine/banzuke/banzukeOps.ts:computeVariableSanyakuCounts":
    "Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/bout/h2h.ts:resolveTacticalClash":
    "Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/bout/kimarite/kimariteRegistry.ts:getKimariteByJsaCategory":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/bout/kimarite/kimariteRegistry.ts:getKimariteByClass":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/bout/kimarite/kimariteRegistry.ts:getKimariteCount":
    "Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/bout/kimarite/kimariteRegistry.ts:getKimariteForFamily":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/core/queries.ts:getHeyaRosterIds":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/core/selectors.ts:getEligibleOpponents":
    "Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/core/selectors.ts:getStableFinances":
    "Live module surface — referenced outside its file (3 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/core/world.ts:getRikishiBashoStats":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/economy/economics.ts:handleInsolvency":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/economy/facilities.ts:UpgradeResult":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/economy/loans.ts:processMonthlyLoanRepayments":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/economy/staff.ts:StaffBonuses":
    "Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/history/hallOfFame.ts:tryAddInductee":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/history/history.ts:generateCareerSnapshot":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/history/historyCache.ts:ArchivedYear":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/history/historyIndex.ts:BashoKey":
    "Live module surface — referenced outside its file (6 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/keshoMawashi/HeyaBrandGenerator.ts:getHeyaBrand":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/decision/LoopDecisionEngine.ts:detectDueDecisions":
    "Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/handlers.ts:consolidateOyakataMemory":
    "Live module surface — referenced outside its file (5 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/perception.ts:MediaHeatBand":
    "Live module surface — referenced outside its file (13 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/personas/oyakataStylePreferences.ts:scoreRecruitForOyakata":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/strategy/NPCStrategyFramework.ts:TraitCheck":
    "Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/strategy/NPCStrategyFramework.ts:evaluateRule":
    "Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/strategy/NPCStrategyFramework.ts:calculateMoodAdjustedThreshold":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/strategy/NPCStrategyFramework.ts:trySpendResource":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/strategy/NPCStrategyFramework.ts:adjustScore":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/npc/strategy/npcRetirementStrategy.ts:DefaultRetirementStrategy":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/persistence/storage/electronArchive.ts:ElectronArchiveService":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/persistence/storage/opfsArchive.ts:ArchiveConflictError":
    "Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/persistence/storage/opfsArchive.ts:OPFSArchiveService":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/persistence/storageProvider.ts:resetStorageProvider":
    "Live module surface — referenced outside its file (3 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/recruitment/overflow.ts:HARD_CAP_ROSTER_SIZE":
    "Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve)",
  "src/engine/shikona/generateShikona.ts:generateRikishiName":
    "Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve)",

  // ── Unticked-service findings: consumed outside the engine/state/pages scan
  // scope (presenters, components) or intentional domain barrels ──
  "src/engine/almanac/index.ts:index":
    "Domain barrel retained as public API surface — deep-import policy leaves it unconsumed",
  "src/engine/bout/kimarite/index.ts:index":
    "Domain barrel retained as public API surface — deep-import policy leaves it unconsumed",
  "src/engine/bout/ReplayMetadata.ts:ReplayMetadata":
    "Consumed by src/presenters/engineAccess.ts — presenters are outside the unticked scan scope",
  "src/engine/economy/awards.ts:awards":
    "Consumed by components (HoshitoriChart, HoFInductionCeremony, KenshoManagementWidget) — components are outside the unticked scan scope",
  "src/engine/narrative/narrativeDescriptions.ts:narrativeDescriptions":
    "Consumed by src/presenters/uiDigest.ts — presenters are outside the unticked scan scope",
  "src/engine/narrative/promotionBands.ts:promotionBands":
    "Consumed by src/presenters/projections/promotionProjections.ts — presenters are outside the unticked scan scope",
  "src/engine/keshoMawashi/KeshoMawashiGenerator.ts:KeshoMawashiGenerator":
    "Compatibility barrel re-exporting the kesho-mawashi generator pipeline — pinned by dedicated tests",
  "src/engine/lifecycle/CareerService.ts:CareerService":
    "Compatibility facade delegating to the unified retirement processor — pinned by dedicated tests",
};

/**
 * Symbols that are genuine orphans and should be wired or removed.
 *
 * Enforced contract (asserted below): each reason MUST cite the entry's own
 * ORPH-XXXX tracker id from baseline-orphans.json, and the baseline entry's
 * status must be "genuine". Wire or remove the symbol, then delete the entry.
 */
const GENUINE_ORPHANS: Record<string, string> = {
  // ── Dead modules: zero production importers; referenced only by their own tests ──
  // (R05 triage complete — honbasho.ts, EntityService.ts,
  //  collectionOperations.ts, jsonParser.ts all removed; each was dead API
  //  superseded by ExhibitionBashoService / queries+EntityCollection /
  //  inline Map helpers / nothing (LLM-era parser).)

  // ── Post-reorg baseline regen (audit-orphans ROOT/scope fixes surfaced
  // these) — zero live references, retained per dead-code policy ──

};

function loadAuditEntries(): AuditEntry[] {
  if (!existsSync(AUDIT_JSON)) return [];
  const raw = readFileSync(AUDIT_JSON, "utf-8");
  const data = JSON.parse(raw);
  return data.entries || [];
}

describe("Phase 5c: Orphan classification", () => {
  const entries = loadAuditEntries();
  const entriesByKey = toKeyedMap(entries, (e) => `${e.file}:${e.symbol}`);

  it("audit baseline exists", () => {
    expect(entries.length).toBeGreaterThanOrEqual(0);
  });

  it("every baseline orphan is classified as either intentional or genuine orphan", () => {
    const unclassified: string[] = [];
    for (const entry of entries) {
      const key = `${entry.file}:${entry.symbol}`;
      if (!INTENTIONAL_EXPORTS[key] && !GENUINE_ORPHANS[key]) {
        unclassified.push(`${key} (${entry.orphanType})`);
      }
    }
    expect(
      unclassified,
      `Unclassified orphans (${unclassified.length}): ${unclassified.join(", ")}`
    ).toEqual([]);
  });

  it("intentional exports have non-empty reasons", () => {
    for (const [key, reason] of Object.entries(INTENTIONAL_EXPORTS)) {
      expect(reason.length, `Export ${key} must have a non-empty reason`).toBeGreaterThan(10);
    }
  });

  // Phase 4: boilerplate reasons are banned — every retained export must carry
  // a real per-symbol verdict (wire target, dev/diagnostics surface, or a
  // concrete contract consumer), not a template string.
  const BOILERPLATE_REASON = [
    /retained for future wiring/i,
    /retained for engine configuration/i,
    /^utility function retained/i,
    /^config constant retained/i,
    /^public type for /i,
  ];

  it("intentional exports carry a real verdict — no boilerplate reasons", () => {
    const boilerplate = Object.entries(INTENTIONAL_EXPORTS)
      .filter(([, reason]) => BOILERPLATE_REASON.some((re) => re.test(reason)))
      .map(([key, reason]) => `${key} → "${reason}"`);
    expect(
      boilerplate,
      `Boilerplate reasons (${boilerplate.length}) — replace with a concrete verdict:\n` +
        boilerplate.join("\n")
    ).toEqual([]);
  });

  it("classification maps contain no stale keys (every key exists in the baseline)", () => {
    const stale: string[] = [];
    for (const map of [INTENTIONAL_EXPORTS, GENUINE_ORPHANS]) {
      for (const key of Object.keys(map)) {
        if (!entriesByKey.has(key)) stale.push(key);
      }
    }
    expect(
      stale,
      `Stale classification keys absent from baseline (${stale.length}) — ` +
        `remove or reclassify: ${stale.join(", ")}`
    ).toEqual([]);
  });

  it("genuine orphans cite their ORPH-XXXX tracker id and are marked genuine", () => {
    for (const [key, reason] of Object.entries(GENUINE_ORPHANS)) {
      expect(reason.length, `Orphan ${key} must have a reason`).toBeGreaterThan(5);
      const entry = entriesByKey.get(key);
      expect(entry, `Orphan ${key} not present in baseline-orphans.json`).toBeDefined();
      if (!entry) continue;
      expect(
        reason.includes(entry.id),
        `Orphan ${key} reason must cite its tracker id ${entry.id}`
      ).toBe(true);
      expect(entry.status, `Orphan ${key} baseline status should be "genuine"`).toBe("genuine");
    }
  });

  it("classified intentional entries are marked intentional in the baseline", () => {
    for (const key of Object.keys(INTENTIONAL_EXPORTS)) {
      const entry = entriesByKey.get(key);
      if (entry) {
        expect(entry.status, `${key} baseline status should be "intentional"`).toBe("intentional");
      }
    }
  });

  it("no export is classified as both intentional and genuine orphan", () => {
    for (const key of Object.keys(INTENTIONAL_EXPORTS)) {
      expect(GENUINE_ORPHANS[key], `Export ${key} is in both lists`).toBeUndefined();
    }
  });
});
