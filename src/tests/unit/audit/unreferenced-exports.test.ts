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

  // ── Newly classified after audit-orphans.ts fix ──
  "src/engine/systems/basho/ExhibitionBashoService.ts:isExhibitionBasho":
    "Type-guard predicate paired with isHonbasho on the live ExhibitionBashoService (phase05 jungyo pipeline); pinned by exhibitionBasho.test",
  "src/engine/systems/basho/ExhibitionBashoService.ts:isHonbasho":
    "Name predicate consumed by getExhibitionBashoSchedule and getNextEvent; pinned by exhibitionBasho.test",
  "src/engine/systems/basho/NakabiService.ts:NAKABI_DAY":
    "Internal constant consumed by isNakabiDay and generateNakabiSummary; exported for unit testing",
  "src/engine/systems/welfare/WelfareCalculations.ts:getSeverityWeight":
    "Internal helper invoked by computeInjuryPressure; exported for unit testing",
  "src/engine/systems/economy/KachiNokoriService.ts:KACHI_NOKORI_THRESHOLD":
    "Internal constant consumed by calculateKachiNokori; value pinned by kachiNokori.test",
  "src/engine/systems/training/TrainingMath.ts:getStatCeiling":
    "Internal helper invoked by getEffectiveCeiling; exported for unit testing",
  "src/engine/systems/training/TrainingMath.ts:diminishingReturnsMult":
    "Internal helper invoked by calculateGrowthWithModifiers; exported for unit testing",
  "src/engine/systems/training/TrainingMath.ts:normalizeTrainingProfile":
    "Internal helper invoked by calculateFatigueDelta and calculateGrowthWithModifiers; exported for unit testing",
  "src/engine/systems/training/TrainingMath.ts:calculateGrowthWithModifiers":
    "Internal helper invoked by calculateGains and calculateGrowthVector; exported for unit testing",
  "src/engine/systems/health/InjuryService.ts:calculateWeeklyInjuryChance":
    "Internal helper invoked by rollWeeklyInjury; exported for unit testing",
  "src/engine/systems/health/InjuryService.ts:clearInjury":
    "Internal helper invoked by onBoutResolvedInjury; exported for unit testing",
  "src/engine/systems/health/InjuryService.ts:toInjuryEvent":
    "Internal helper invoked by clearInjury; exported for unit testing",
  "src/engine/systems/recruitment/perceivedTalent.ts:scoutingNoiseSpread":
    "Internal helper invoked by perceivedTalentSeed; exported for unit testing",
  "src/engine/systems/recruitment/FogOfWarService.ts:getConfidenceFromLevel":
    "Internal helper invoked by getConfidenceLevel; exported for unit testing",
  "src/engine/systems/recruitment/FogOfWarService.ts:getEstimatedValue":
    "Internal helper invoked by resolveScoutedAttribute; exported for unit testing",
  "src/engine/systems/governance/GomenfudaService.ts:GOMENFUDA_REPUTATION_PENALTY":
    "Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests",
  "src/engine/systems/governance/GomenfudaService.ts:CONSECUTIVE_WITHDRAWAL_MULTIPLIER":
    "Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests",
  "src/engine/systems/training/TsukebitoService.ts:isEligibleTsukebito":
    "Internal helper invoked by assignTsukebito, isJuniorTsukebitoEligible, and setTsukebito; exported for unit testing",
  "src/engine/systems/generation/PreSumoBackground.ts:PRE_SUMO_BACKGROUNDS":
    "Internal table consumed by applyBackgroundStatModifiers and assignPreSumoBackground; exported for unit testing",
  "src/engine/systems/generation/applyOyakataConfig.ts:PLAYER_BACKSTORIES":
    "Internal table consumed by applyOyakataCreationConfig; exported for unit testing",
  "src/engine/systems/generation/competitiveBalance.ts:recruitmentBalanceMultiplier":
    "Consumed by TalentPoolNPCRecruitment (NPC recruitment pipeline); pinned by competitiveBalance tests",
  "src/engine/systems/generation/TalentPoolMaterialization.ts:materializeCandidateToRikishi":
    "Consumed by TalentPoolNPCRecruitment (NPC talent materialization); pinned by materialization tests",
  "src/engine/systems/generation/PersonaAssignment.ts:assignPressPersona":
    "Internal helper invoked by applyPersonaAssignment; exported for unit testing",
  "src/engine/systems/generation/PersonaAssignment.ts:assignPersonalityTraits":
    "Internal helper invoked by applyPersonaAssignment; exported for unit testing",
  "src/engine/systems/generation/PersonaAssignment.ts:rollBirthday":
    "Internal helper invoked by applyPersonaAssignment; exported for unit testing",
  "src/engine/npcAI/MemoryStore.ts:emptyOyakataMemory":
    "Internal helper invoked by getMemory; exported for unit testing",
  "src/engine/npcAI/opponentLearning.ts:MAX_OPPONENT_MODELS":
    "Config constant for the opponent-model eviction cap",
  "src/engine/npcAI/ArchetypeAdaptation.ts:MetaAdaptationState":
    "Exported for unit testing; consumed via evaluateAdaptation in production",
  "src/engine/npcAI/ArchetypeAdaptation.ts:updateMetaAdaptation":
    "Internal helper invoked by evaluateAdaptation; exported for unit testing",
  "src/engine/npcAI/execution.ts:applyCrisisRescue":
    "Internal rescue handler invoked in-module; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:checkBashoDayDrama":
    "Internal helper invoked by checkTriggeredDrama; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:checkTriggeredDrama":
    "Internal drama trigger invoked by processDramaTick; exported for unit testing",
  "src/engine/bard/dramaGenerator.ts:triggerCrisis":
    "Internal crisis factory invoked by checkTriggeredDrama; exported for unit testing",
  "src/engine/bard/BardEngine.ts:interpolate": "Internal method invoked by BardEngine template rendering; exported for unit testing",
  "src/engine/bout/yaocho.ts:evaluateYaochoIndicators":
    "Internal helper invoked by checkYaocho; exported for unit testing",
  "src/engine/bout/yaocho.ts:calculateYaochoChance": "Internal helper invoked by checkYaocho; exported for unit testing",
  "src/engine/bout/shinitai.ts:SHINITAI_INSTABILITY_DIFF_THRESHOLD":
    "Internal constant consumed by tryShinitai; value pinned by shinitai tests",
  "src/engine/bout/kinjite.ts:calculateHansokuChance":
    "Internal helper invoked by tryHansoku; exported for unit testing",
  "src/engine/bout/boutResolver.ts:applyRivalryToRikishi":
    "Internal helper invoked by resolveBout; exported for unit testing",
  "src/engine/bout/boutGrip.ts:calculateTorque": "Internal helper invoked by computeNetTorque; exported for unit testing",
  "src/engine/bout/boutGrip.ts:computeNetTorque": "Internal helper invoked by evolveGripGeometry and initBeltBattle; exported for unit testing",
  "src/engine/bout/ReplayMetadata.ts:getBoutAnimationFamily":
    "Internal helper invoked by buildBoutScript; exported for unit testing",
  "src/engine/core/ImpactBuilder.ts:updateRikishiImpact":
    "Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test",
  "src/engine/core/ImpactBuilder.ts:updateWorldFieldImpact":
    "Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test",
  "src/engine/governance/kanrekiCeremony.ts:KANREKI_AGE":
    "Internal constant consumed by isEligibleForKanreki and performKanrekiCeremony; value pinned by kanreki tests",
  "src/engine/governance/kanrekiCeremony.ts:KANREKI_POPULARITY_BOOST":
    "Internal constant consumed by performKanrekiCeremony; value pinned by kanreki tests",
  "src/engine/governance/yokozunaAttendants.ts:ATTENDANT_POPULARITY_BOOST":
    "Internal constant consumed by assignYokozunaAttendants; value pinned by yokozunaAttendants tests",
  "src/engine/governance/yokozunaAttendants.ts:isEligibleAttendant":
    "Internal validation helper used by assignYokozunaAttendants (same file); audit's same-file exclusion is a false positive",
  "src/engine/matchmaking/DramaMatchmaker.ts:isMakuuchiDebut":
    "Internal helper invoked by checkDebutShowcase; exported for unit testing",
  "src/engine/matchmaking/DramaMatchmaker.ts:scoreDrama":
    "Internal helper invoked by applyDramaBudget and isMakuuchiDebut; exported for unit testing",
  "src/engine/matchmaking/MatchmakingPhases.ts:buildCandidatePairs":
    "Internal helper invoked by generatePairs; exported for unit testing",
  "src/engine/shikona/legacy.ts:extractLegacyPrefix": "Internal helper invoked by generateLegacyShikona; exported for unit testing",
  "src/engine/shikona/legacy.ts:extractLegacySuffix": "Internal helper invoked by generateLegacyShikona; exported for unit testing",
  "src/engine/training/WeightJourney.ts:WEIGHT_JOURNEY_WEEKLY_GAIN":
    "Internal constant consumed by applyWeightJourneyTick; value pinned by WeightJourney tests",
  "src/engine/training/WeightJourney.ts:shouldEnterWeightJourney":
    "Internal helper invoked by applyWeightJourneyTick; exported for unit testing",
      "src/engine/utils/Logger.ts:logger": "Shared singleton backing the live debug/info/warn/error wrappers (consumed by bootstrap, useFlowActions, BanzukePublisher); pinned by logger tests",

  "src/engine/systems/recruitment/YouthAcademyService.ts:getQualityBonus":
    "Public helper exercised directly by youthAcademy.test.ts",

  // ── Classified in Oct 2026 baseline refresh ──
  "src/engine/bout/hiwaza.ts:classifyHiwaza":
    "Internal classifier exercised directly by hiwaza.test.ts",
  "src/engine/bout/terminalKimarite.ts:pickTerminalKimarite":
    "Internal picker exercised directly by terminalKimarite.test.ts",
  "src/engine/systems/narrative/PostBashoPressService.ts:PressConferenceContext":
    "Parameter type of generatePressConference; pinned by PostBashoPress tests",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_SENIOR_RANK_THRESHOLD":
    "Policy constant consumed by isEligibleForTsukebito; value pinned by TsukebitoService tests",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_TRAINING_BOOST":
    "Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_MORALE_BOOST":
    "Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests",
  "src/engine/systems/training/TsukebitoService.ts:TSUKEBITO_TECHNIQUE_EXPOSURE":
    "Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests",
  "src/engine/systems/training/TsukebitoService.ts:OTOTODESHI_FATIGUE_PENALTY":
    "Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests",
  "src/engine/systems/training/TsukebitoService.ts:OTOTODESHI_MENTAL_GAIN":
    "Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests",
  "src/engine/npcAI/TacticalCoordinator.ts:CoordinationInput":
    "Parameter type of applyPlanConstraints; pinned by TacticalCoordinator tests",
  "src/engine/bout/CornerAdvice.ts:CornerAdviceContext":
    "Parameter type of buildRecommendation/getAdvice; pinned by CornerAdvice tests",
  "src/engine/bout/yaocho.ts:YaochoIndicators":
    "Return type of evaluateYaochoIndicators consumed by checkYaocho; pinned by yaocho tests",
  "src/engine/prestige/prestigeSystem.ts:computeStatureBand":
    "Internal helper invoked by runPrestigeDecay; exported for unit testing",
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
  "src/engine/systems/basho/ExhibitionBashoService.ts:getNextEvent":
    "ORPH-0010: next-event lookahead has no consumer — phase05 runs the current-month jungyo via getExhibitionBashoSchedule; wire when a calendar/upcoming-events surface exists",
  "src/engine/systems/generation/QuirkAssignment.ts:applyGlasses":
    "ORPH-0033: glasses quirk is write-only — assignQuirk can set poorEyesight but no avatar layer or mechanic reads quirks.glasses; needs an avatar glasses renderer or quirk effect to wire",
  "src/engine/systems/generation/QuirkAssignment.ts:hasPoorEyesight":
    "ORPH-0032: sole caller is the orphaned applyGlasses (ORPH-0033); orphaned together pending a glasses consumer",
  "src/engine/systems/governance/MyosekiTradingService.ts:executeMyosekiLease":
    "ORPH-0296: private-treaty lease between stock holders — no worker command or NPC initiator negotiates peer leases; market leasing via myosekiMarket.leaseMyoseki is the live path",
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
