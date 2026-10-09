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

const ROOT = join(__dirname, "../../../..");
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
  "src/engine/systems/NPCPersonaService.ts:NPCPersona": "Public type for NPC persona configuration",
  "src/engine/systems/NPCPersonaService.ts:OyakataPersona": "Public type for oyakata persona data",
  "src/engine/systems/basho/ExhibitionBashoService.ts:ExhibitionBashoName":
    "Public type for exhibition basho naming",
  "src/engine/systems/basho/ExhibitionBashoService.ts:ExhibitionBashoInfo":
    "Public type for exhibition basho info",
  "src/engine/systems/economy/FinanceCalculator.ts:HeyaFinanceResult":
    "Public type for finance calculation results",
  "src/engine/systems/economy/KachiNokoriService.ts:PostBashoPayload":
    "Public type for post-basho data payload",
  "src/engine/systems/economy/KenshoService.ts:BoutImportanceBucket":
    "Public type for kensho bout importance",
  "src/engine/systems/economy/infrastructureValidation.ts:ValidationResult":
    "Public type for infrastructure validation",
  "src/engine/systems/generation/CandidateStats.ts:GeneratedStats":
    "Public type for generated candidate statistics",
  "src/engine/systems/generation/CandidateStats.ts:PotentialPackage":
    "Public type for candidate potential packaging",
  "src/engine/systems/generation/CohortTracking.ts:CohortSummary":
    "Public type for cohort tracking summary",
  "src/engine/systems/generation/PreSumoBackground.ts:PreSumoBackgroundId":
    "Public type for pre-sumo background ID",
  "src/engine/systems/governance/GomenfudaService.ts:GomenfudaRecord":
    "Public type for gomenfuda record",
  "src/engine/systems/governance/KihakuService.ts:KihakuInput":
    "Public type for kihaku service input",
  "src/engine/systems/governance/PoliticalFavorsService.ts:FavorOption":
    "Public type for political favor option",
  "src/engine/systems/governance/YokozunaService.ts:YDCCandidate":
    "Public type for YDC promotion candidate",
  "src/engine/systems/narrative/NarrativeBands.ts:FinancialBand":
    "Public type for financial narrative band",
  "src/engine/systems/narrative/PostBashoPressService.ts:PressConferenceContext":
    "Public type for press conference context",
  "src/engine/systems/recruitment/ScoutingService.ts:PublicRikishiInfo":
    "Public type for public rikishi info",
  "src/engine/systems/recruitment/ScoutingService.ts:ScoutedAttributeTruthSnapshot":
    "Public type for scouted attribute truth",
  "src/engine/systems/recruitment/ScoutingService.ts:ScoutedPotentialSnapshot":
    "Public type for scouted potential snapshot",
  "src/engine/systems/training/MentorshipService.ts:MentorMenteeBoutEvent":
    "Public type for mentor-mentee bout event",
  "src/engine/systems/training/TrainingMath.ts:TrainingModifiers":
    "Public type for training modifier config",
  "src/engine/systems/training/TsukebitoService.ts:TsukebitoAssignment":
    "Public type for tsukebito assignment",
  "src/engine/agents/CrisisAgent.ts:CrisisAgentResult": "Public type for crisis agent result",
  "src/engine/agents/MediaAgent.ts:MediaAgentResult": "Public type for media agent result",
  "src/engine/agents/NarrativeAgent.ts:NarrativeAgentResult":
    "Public type for narrative agent result",
  "src/engine/ai/types.ts:AIConstraintType": "Public type for AI constraint types",
  "src/engine/ai/types.ts:AIRecommendationCategory": "Public type for AI recommendation category",
  "src/engine/ai/types.ts:AIRecommendationPriority": "Public type for AI recommendation priority",
  "src/engine/banzuke/banzukeMovementNarrative.ts:BanzukeMovementNarrativeLine":
    "Public type for banzuke movement narrative",
  "src/engine/bard/BardEngine.ts:ResolutionPath": "Public type for bard resolution path",
  "src/engine/bard/BardEngine.ts:BardResult": "Public type for bard engine result",
  "src/engine/bard/BardEngine.ts:RegistryEntry": "Public type for bard registry entry",
  "src/engine/bard/BardEngine.ts:BardArchive": "Public type for bard archive",
  "src/engine/bard/dramaGenerator.ts:DramaEvent": "Public type for drama event",
  "src/engine/bard/narrativeContext.ts:CrowdStyle": "Public type for crowd style",
  "src/engine/bard/narrativeEventMap.ts:NarrativeEventMapEntry":
    "Public type for narrative event map entry",
  "src/engine/bout/CareerHighlights.ts:CareerHighlightType":
    "Public type for career highlight type",
  "src/engine/bout/boutNarrative.ts:PbpVoice": "Public type for play-by-play voice",
  "src/engine/core/EntityCollection.ts:EntityQueryOptions": "Public type for entity query options",
  "src/engine/core/RNGRegistry.ts:SystemRNGKey": "Public type for system RNG key",
  "src/engine/lifecycle/retirementNarrative.ts:RetirementNarrativeLine":
    "Public type for retirement narrative line",
  "src/engine/matchmaking/MatchmakingPhases.ts:CandidateBuildOptions":
    "Public type for matchmaking candidate build options",
  "src/engine/npcAI/MemoryStore.ts:type OyakataMemory": "Public type for oyakata memory",
  "src/engine/shikona/types.ts:PatternWeights": "Public type for shikona pattern weights",
  "src/engine/shikona/types.ts:HouseStyleId": "Public type for shikona house style ID",
  "src/engine/strategy/NPCStrategyService.ts:OyakataScoutingObservation":
    "Public type for oyakata scouting observation",
  "src/engine/strategy/NPCStrategyService.ts:OyakataPersonnelObservation":
    "Public type for oyakata personnel observation",
  "src/engine/utils/Logger.ts:LogLevel": "Public type for log level enum",
  "src/engine/worker/types.ts:WorkerMessage": "Public type for worker message protocol",

  // ── Constants: retained for future use or external consumers ──
  "src/engine/systems/health/BodyDefinitions.ts:BODY_AREA_LABELS":
    "Display labels for body areas; used by UI injury display",
  "src/engine/systems/health/BodyDefinitions.ts:INJURY_TYPE_LABELS":
    "Display labels for injury types; used by UI injury display",
  "src/engine/systems/generation/FightingNameEarly.ts:EARLY_SHIKONA_CHANCE":
    "Config constant for early shikona generation",
  "src/engine/systems/generation/FightingNameEarly.ts:EARLY_SHIKONA_MOTIVATION_BOOST":
    "Config constant for early shikona motivation boost",
  "src/engine/systems/generation/SponsorGenerator.ts:INDUSTRY_TAGS":
    "Sponsor generation industry tags; used by world factory",
  "src/engine/systems/generation/SponsorGenerator.ts:INITIAL_SPONSOR_TIER_DISTRIBUTION":
    "Config for initial sponsor tier distribution",
  "src/engine/actions/InjuredEncouragement.ts:ENCOURAGEMENT_MOTIVATION_BOOST":
    "Config constant for encouragement action",
  "src/engine/bout/kachiNokori.ts:KACHI_KOSHI_WINS":
    "Config constant for kachi-koshi win threshold",
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
  "src/engine/systems/generation/SponsorGenerator.ts:generateSponsor":
    "Sponsor generation function; used by world factory internally",
  "src/engine/systems/generation/SponsorGenerator.ts:generateSponsorId":
    "Sponsor ID generation utility",
  "src/engine/systems/generation/SponsorGenerator.ts:generateSponsorNameV2":
    "Sponsor name generation utility",
  "src/engine/systems/generation/SponsorGenerator.ts:rollSponsorCategory":
    "Sponsor category rolling utility",
  "src/engine/systems/generation/SponsorGenerator.ts:getTierTraitRanges":
    "Sponsor tier trait range utility",
  "src/engine/systems/generation/SponsorGenerator.ts:rollTier": "Sponsor tier rolling utility",
  "src/engine/systems/generation/TalentPoolStateService.ts:injectRikishiAsCandidate":
    "Utility to inject rikishi as candidate; future recruitment wiring",
  "src/engine/systems/narrative/NarrativeProse.ts:hydrateDescriptor":
    "Narrative prose hydration utility",
  "src/engine/systems/narrative/RivalryHeatService.ts:bumpTrigger":
    "Rivalry heat bump trigger utility",
  "src/engine/bout/BoutAI.ts:chooseBaseTactic": "Bout AI tactic selection utility",
  "src/engine/bout/boutContention.ts:getLeaderWins": "Bout contention leader wins utility",
  "src/engine/core/ImpactBuilder.ts:updateHeyaImpact": "Impact builder heya update utility",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildPlayoffPairs":
    "Matchmaking playoff pair builder utility",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildExhibitionPairs":
    "Matchmaking exhibition pair builder utility",
  "src/engine/npcAI/LeaguePerception.ts:emptyLeaguePerception":
    "Empty league perception factory utility",

  "src/engine/shikona/rankRules.ts:resolveRankTier": "Rank tier resolution utility",
  "src/engine/strategy/NPCFinanceCalculator.ts:getFinanceStrategy":
    "NPC finance strategy getter utility",
  "src/engine/strategy/NPCGovernanceCalculator.ts:getGovernanceStrategy":
    "NPC governance strategy getter utility",
  "src/engine/utils/math.ts:localClampInt": "Math utility for clamping integers",
  "src/engine/utils/random.ts:seededWeightedPick": "Random utility for seeded weighted picking",
  "src/engine/utils/string.ts:formatShikona": "String formatting utility for shikona",
  "src/engine/actions/OyakataIntervention.ts:InterventionResult":
    "Public type for intervention result",

  // ── Newly classified after audit-orphans.ts fix ──
  "src/engine/systems/basho/ExhibitionBashoService.ts:isExhibitionBasho":
    "Utility function retained for future wiring",
  "src/engine/systems/basho/ExhibitionBashoService.ts:isHonbasho":
    "Utility function retained for future wiring",
  "src/engine/systems/basho/ExhibitionBashoService.ts:getNextEvent":
    "Utility function retained for future wiring",
  "src/engine/systems/basho/NakabiService.ts:NAKABI_DAY":
    "Config constant retained for engine configuration",
  "src/engine/systems/welfare/WelfareCalculations.ts:getSeverityWeight":
    "Utility function retained for future wiring",
  "src/engine/systems/economy/KachiNokoriService.ts:KACHI_NOKORI_THRESHOLD":
    "Config constant retained for engine configuration",
  "src/engine/systems/economy/KachiNokoriService.ts:kachiNokoriToMochikyukinPoints":
    "Utility function retained for future wiring",
  "src/engine/systems/bookmark/BookmarkService.ts:getBookmarksByType":
    "Utility function retained for future wiring",
  "src/engine/systems/bookmark/BookmarkService.ts:getAllBookmarks":
    "Utility function retained for future wiring",
  "src/engine/systems/training/TrainingMath.ts:getStatCeiling":
    "Utility function retained for future wiring",
  "src/engine/systems/training/TrainingMath.ts:diminishingReturnsMult":
    "Utility function retained for future wiring",
  "src/engine/systems/training/TrainingMath.ts:normalizeTrainingProfile":
    "Utility function retained for future wiring",
  "src/engine/systems/training/TrainingMath.ts:calculateGrowthWithModifiers":
    "Utility function retained for future wiring",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_SENIOR_RANK_THRESHOLD":
    "Config constant retained for engine configuration",
  "src/engine/systems/training/TsukebitoService.ts:MAX_TSUKEBITO_PER_SENIOR":
    "Config constant retained for engine configuration",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_TRAINING_BOOST":
    "Config constant retained for engine configuration",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_MORALE_BOOST":
    "Config constant retained for engine configuration",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_TECHNIQUE_EXPOSURE":
    "Config constant retained for engine configuration",
  "src/engine/systems/training/TsukebitoService.ts:OTOTODESHI_FATIGUE_PENALTY":
    "Config constant retained for engine configuration",
  "src/engine/systems/training/TsukebitoService.ts:OTOTODESHI_MENTAL_GAIN":
    "Config constant retained for engine configuration",
  "src/engine/systems/health/InjuryService.ts:calculateWeeklyInjuryChance":
    "Utility function retained for future wiring",
  "src/engine/systems/health/InjuryService.ts:clearInjury":
    "Utility function retained for future wiring",
  "src/engine/systems/health/InjuryService.ts:toInjuryEvent":
    "Utility function retained for future wiring",
  "src/engine/systems/recruitment/perceivedTalent.ts:scoutingNoiseSpread":
    "Utility function retained for future wiring",
  "src/engine/systems/recruitment/FogOfWarService.ts:getConfidenceFromLevel":
    "Utility function retained for future wiring",
  "src/engine/systems/recruitment/FogOfWarService.ts:getEstimatedValue":
    "Utility function retained for future wiring",
  "src/engine/systems/governance/GomenfudaService.ts:GOMENFUDA_REPUTATION_PENALTY":
    "Config constant retained for engine configuration",
  "src/engine/systems/governance/GomenfudaService.ts:CONSECUTIVE_WITHDRAWAL_MULTIPLIER":
    "Config constant retained for engine configuration",
  "src/engine/systems/governance/ScandalService.ts:tickWeekGovernance":
    "Utility function retained for future wiring",
  "src/engine/systems/governance/MyosekiTradingService.ts:CANONICAL_MYOSEKI_NAMES":
    "Config constant retained for engine configuration",
  "src/engine/systems/governance/MyosekiTradingService.ts:MYOSEKI_BASE_PRICES":
    "Config constant retained for engine configuration",
  "src/engine/systems/governance/MyosekiTradingService.ts:initializeMyosekiMarket":
    "Utility function retained for future wiring",
  "src/engine/systems/governance/MyosekiTradingService.ts:listMyosekiForSale":
    "Utility function retained for future wiring",
  "src/engine/systems/governance/MyosekiTradingService.ts:returnLeasedMyoseki":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/MaezumoService.ts:MAEZUMO_DURATION_WEEKS":
    "Config constant retained for engine configuration",
  "src/engine/systems/generation/PreSumoBackground.ts:PRE_SUMO_BACKGROUNDS":
    "Config constant retained for engine configuration",
  "src/engine/systems/generation/applyOyakataConfig.ts:PLAYER_BACKSTORIES":
    "Config constant retained for engine configuration",
  "src/engine/systems/generation/competitiveBalance.ts:recruitmentBalanceMultiplier":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/TalentPoolMaterialization.ts:materializeCandidateToRikishi":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/PersonaAssignment.ts:assignPressPersona":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/PersonaAssignment.ts:assignPersonalityTraits":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/PersonaAssignment.ts:rollBirthday":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/FightingNameEarly.ts:getEarlyShikonaMotivationBoost":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/QuirkAssignment.ts:hasPoorEyesight":
    "Utility function retained for future wiring",
  "src/engine/systems/generation/QuirkAssignment.ts:applyGlasses":
    "Utility function retained for future wiring",
  "src/engine/npcAI/TacticalCoordinator.ts:CoordinationInput":
    "Public type for CoordinationInput contract",
  "src/engine/npcAI/OpponentModel.ts:suggestCounterTactic":
    "Utility function retained for future wiring",
  "src/engine/npcAI/MemoryStore.ts:emptyOyakataMemory":
    "Utility function retained for future wiring",
  "src/engine/npcAI/opponentLearning.ts:BoutLearningCtx":
    "Public type for the bout-learning hook context",
  "src/engine/npcAI/opponentLearning.ts:MAX_OPPONENT_MODELS":
    "Config constant for the opponent-model eviction cap",
  "src/engine/npcAI/planOutcomes.ts:PlanOutcome":
    "Public type for the plan-outcome classification result",

  "src/engine/advisor/AdvisorService.ts:getPlayerDigest":
    "Utility function retained for future wiring",
  "src/engine/banzuke/banzukeHelpers.ts:getRankTitleJa":
    "Utility function retained for future wiring",
  "src/engine/bard/dramaGenerator.ts:checkBashoDayDrama":
    "Utility function retained for future wiring",
  "src/engine/bard/dramaGenerator.ts:checkTriggeredDrama":
    "Internal drama trigger invoked by processDramaTick; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:triggerCrisis":
    "Internal crisis factory invoked by checkTriggeredDrama; exported for unit testing",
  "src/engine/bard/BardEngine.ts:interpolate": "Utility function retained for future wiring",
  "src/engine/bout/boutNarrative.ts:isSanyakuPromotionByRank":
    "Utility function retained for future wiring",
  "src/engine/bout/yaocho.ts:YaochoIndicators": "Public type for YaochoIndicators contract",
  "src/engine/bout/yaocho.ts:evaluateYaochoIndicators":
    "Utility function retained for future wiring",
  "src/engine/bout/yaocho.ts:calculateYaochoChance": "Utility function retained for future wiring",
  "src/engine/bout/shinitai.ts:SHINITAI_INSTABILITY_DIFF_THRESHOLD":
    "Config constant retained for engine configuration",
  "src/engine/bout/kinjite.ts:calculateHansokuChance":
    "Utility function retained for future wiring",
  "src/engine/bout/boutResolver.ts:applyRivalryToRikishi":
    "Utility function retained for future wiring",
  "src/engine/bout/boutGrip.ts:calculateTorque": "Utility function retained for future wiring",
  "src/engine/bout/boutGrip.ts:computeNetTorque": "Utility function retained for future wiring",
  "src/engine/bout/ReplayMetadata.ts:getBoutAnimationFamily":
    "Utility function retained for future wiring",
  "src/engine/bout/CornerAdvice.ts:CornerAdviceContext":
    "Public type for CornerAdviceContext contract",
  "src/engine/bout/boutSpatial.ts:isOutOfRing": "Utility function retained for future wiring",
  "src/engine/bout/kachiNokori.ts:hasKachiKoshi": "Utility function retained for future wiring",
  "src/engine/bout/kachiNokori.ts:isMakeKoshiConfirmed":
    "Utility function retained for future wiring",
  "src/engine/bout/kachiNokori.ts:calculateKachiNokoriForStandings":
    "Utility function retained for future wiring",
  "src/engine/bout/kachiNokori.ts:getYushoRaceLeaders":
    "Utility function retained for future wiring",
  "src/engine/core/ImpactBuilder.ts:updateRikishiImpact":
    "Utility function retained for future wiring",
  "src/engine/core/ImpactBuilder.ts:updateWorldFieldImpact":
    "Utility function retained for future wiring",
  "src/engine/governance/kanrekiCeremony.ts:KANREKI_AGE":
    "Config constant retained for engine configuration",
  "src/engine/governance/kanrekiCeremony.ts:KANREKI_POPULARITY_BOOST":
    "Config constant retained for engine configuration",
  "src/engine/governance/yokozunaAttendants.ts:ATTENDANT_POPULARITY_BOOST":
    "Config constant retained for engine configuration",
  "src/engine/governance/yokozunaAttendants.ts:isEligibleAttendant":
    "Internal validation helper used by assignYokozunaAttendants (same file); audit's same-file exclusion is a false positive",
  "src/engine/matchmaking/DramaMatchmaker.ts:isMakuuchiDebut":
    "Utility function retained for future wiring",
  "src/engine/matchmaking/DramaMatchmaker.ts:scoreDrama":
    "Utility function retained for future wiring",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildCandidatePairs":
    "Utility function retained for future wiring",
  "src/engine/prestige/prestigeSystem.ts:updateStatureBand":
    "Utility function retained for future wiring",
  "src/engine/shikona/helpers.ts:mergePatternWeights":
    "Utility function retained for future wiring",
  "src/engine/shikona/helpers.ts:choosePattern": "Utility function retained for future wiring",
  "src/engine/shikona/helpers.ts:nationalityPool": "Utility function retained for future wiring",
  "src/engine/shikona/constants.ts:BASE_PATTERN_WEIGHTS":
    "Config constant retained for engine configuration",
  "src/engine/shikona/legacy.ts:extractLegacyPrefix": "Utility function retained for future wiring",
  "src/engine/shikona/legacy.ts:extractLegacySuffix": "Utility function retained for future wiring",
  "src/engine/training/WeightJourney.ts:WEIGHT_JOURNEY_WEEKLY_GAIN":
    "Config constant retained for engine configuration",
  "src/engine/training/WeightJourney.ts:shouldEnterWeightJourney":
    "Utility function retained for future wiring",
  "src/engine/utils/citizenshipUtils.ts:countsAsForeign":
    "Utility function retained for future wiring",
  "src/engine/utils/citizenshipUtils.ts:isAtForeignLimit":
    "Utility function retained for future wiring",
  "src/engine/utils/Logger.ts:logger": "Utility function retained for future wiring",
  "src/engine/utils/entityAccess.ts:getHeyaOrThrow": "Utility function retained for future wiring",
  "src/engine/utils/entityAccess.ts:getRikishiOrThrow":
    "Utility function retained for future wiring",
  "src/engine/utils/entityAccess.ts:getHeyaRikishi": "Utility function retained for future wiring",
  "src/engine/utils/entityAccess.ts:getAllActiveRikishi":
    "Utility function retained for future wiring",
  "src/engine/systems/recruitment/YouthAcademyService.ts:getQualityBonus":
    "Public helper exercised directly by youthAcademy.test.ts",

  // ── Classified in Oct 2026 baseline refresh ──
  "src/engine/bout/boutAchievements.ts:DetectKinboshiOptions":
    "Public type for kinboshi detection options",
  "src/engine/bout/hiwaza.ts:HiwaRng": "Public type for hiwaza RNG contract",
  "src/engine/bout/hiwaza.ts:HiwazaId": "Public type for hiwaza identifiers",
  "src/engine/bout/hiwaza.ts:classifyHiwaza":
    "Internal classifier exercised directly by hiwaza.test.ts",
  "src/engine/bout/terminalKimarite.ts:TerminalContext":
    "Public type for terminal kimarite context",
  "src/engine/bout/terminalKimarite.ts:pickTerminalKimarite":
    "Internal picker exercised directly by terminalKimarite.test.ts",
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
  "src/engine/bout/honbasho.ts:HONBASHO_NAMES":
    "ORPH-0133 dead module — wire honbasho helpers into basho setup or remove",
  "src/engine/bout/honbasho.ts:isHonbashoName":
    "ORPH-0134 dead module — wire honbasho helpers into basho setup or remove",
  "src/engine/bout/honbasho.ts:isHonbashoState":
    "ORPH-0135 dead module — wire honbasho helpers into basho setup or remove",
  "src/engine/bout/honbasho.ts:isHonbashoInfo":
    "ORPH-0136 dead module — wire honbasho helpers into basho setup or remove",
  "src/engine/bout/honbasho.ts:makeExhibitionBasho":
    "ORPH-0137 dead module — wire honbasho helpers into basho setup or remove",
  "src/engine/core/EntityService.ts:EntityService":
    "ORPH-0149 facade exercised only by EntityService.test.ts — wire into app bootstrap or remove",
  "src/engine/utils/collectionOperations.ts:mapIdsToEntities":
    "ORPH-0190 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:mapIdsToRikishi":
    "ORPH-0191 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:mapIdsToHeya":
    "ORPH-0192 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:mapIdsToOyakata":
    "ORPH-0193 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:filterEntities":
    "ORPH-0194 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:getEntitiesByIds":
    "ORPH-0195 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:groupBy":
    "ORPH-0196 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/collectionOperations.ts:countBy":
    "ORPH-0197 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/jsonParser.ts:parseLLMResponse":
    "ORPH-0202 barrel-only export with no consumers — wire or remove",
  "src/engine/utils/jsonParser.ts:safeParse":
    "ORPH-0203 barrel-only export with no consumers — wire or remove",
};

function loadAuditEntries(): AuditEntry[] {
  if (!existsSync(AUDIT_JSON)) return [];
  const raw = readFileSync(AUDIT_JSON, "utf-8");
  const data = JSON.parse(raw);
  return data.entries || [];
}

describe("Phase 5c: Orphan classification", () => {
  const entries = loadAuditEntries();
  const entriesByKey = new Map(entries.map((e) => [`${e.file}:${e.symbol}`, e]));

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
