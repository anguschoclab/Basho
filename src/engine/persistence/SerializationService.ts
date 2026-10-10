import { stableTieBreak } from "../utils/sort";
import { phase02_context } from "../tick/phases/phase02_context";
import { resolveImpacts } from "../core/ImpactResolver";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import type { SerializedBashoState, RikishiAssessmentEntry } from "../types/save";
import type { SponsorPool } from "../types/sponsors";
import type { SerializedSponsorPool } from "../types/save";
import type { SerializedWorldState } from "../types/save";
import type { Rikishi } from "../types/rikishi";
import type { Heya } from "../types/heya";
import { resetImpactTimestampCounter } from "../core/StateImpact";
import { RANK_HIERARCHY } from "../banzuke";
import { warn } from "../utils/Logger";

/**
 * Serialization Service handles the transformation between runtime Maps
 * and JSON-safe SerializedWorldState objects.
 */

/**
 * Serializes a Map or Record to a sorted JSON-safe object.
 */
function mapToObject<T>(map: Map<string, T> | Record<string, T>): Record<string, T> {
  if (!(map instanceof Map)) return map;
  const obj: Record<string, T> = {};
  const keys = Array.from(map.keys()).sort(stableTieBreak);
  for (const key of keys) {
    const value = map.get(key);
    if (value !== undefined) obj[key] = value;
  }
  return obj;
}

/**
 * Deserializes a JSON object into a runtime Map with sorted keys.
 */
function objectToMap<T>(obj: Record<string, T | undefined>): Map<string, T> {
  const map = new Map<string, T>();
  if (!obj) return map;
  for (const key of Object.keys(obj).sort(stableTieBreak)) {
    const v = obj[key];
    if (v !== undefined) map.set(key, v);
  }
  return map;
}

/**
 * Serialize basho state.
 */
function serializeBashoState(basho: BashoState): SerializedBashoState {
  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    day: basho.day,
    matches: basho.matches,
    standings: mapToObject(basho.standings),
    ...(basho.kinboshiThisBasho ? { kinboshiThisBasho: basho.kinboshiThisBasho } : {}),
  };
}

/**
 * Deserialize basho state.
 */
function deserializeBashoState(basho: SerializedBashoState): BashoState {
  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    day: basho.day,
    matches: basho.matches,
    standings: objectToMap(basho.standings),
    ...(basho.kinboshiThisBasho ? { kinboshiThisBasho: basho.kinboshiThisBasho } : {}),
    isActive: true,
  };
}

/**
 * Transform WorldState to SerializedWorldState.
 * NOTE: transientContext is intentionally excluded — it is ephemeral and
 * must be rebuilt by rebuildTransientContext() on load.
 */
function serializeWorld(world: WorldState): SerializedWorldState {
  // transientContext is intentionally excluded — it is ephemeral
  return {
    seed: world.seed,
    year: world.year,
    week: world.week,
    cyclePhase: world.cyclePhase,
    currentBashoName: world.currentBashoName,
    heyas: mapToObject(world.heyas),
    closedHeyas: mapToObject(world.closedHeyas || new Map()),
    rikishi: mapToObject(world.rikishi),
    historicalRikishi: mapToObject(world.historicalRikishi || new Map()),
    activeRikishiIds: Array.from(world.activeRikishiIds),
    oyakata: mapToObject(world.oyakata),
    staff: mapToObject(world.staff || new Map()),
    currentBasho: world.currentBasho ? serializeBashoState(world.currentBasho) : undefined,
    history: world.history || [],
    historyIndex: world.historyIndex,
    lineage: world.lineage || [],
    records: world.records,
    hallOfFame: world.hallOfFame,
    events: world.events,
    rivalriesState: world.rivalriesState,
    myosekiMarket: world.myosekiMarket,
    playerHeyaId: world.playerHeyaId,
    currentBanzuke: world.currentBanzuke,
    dayIndexGlobal: world.dayIndexGlobal,
    almanacSnapshots: world.almanacSnapshots || [],
    sponsorPool: serializeSponsorPool(world.sponsorPool),
    ozekiKadoban: world.ozekiKadoban || {},
    mediaState: world.mediaState,
    talentPool: world.talentPool,
    candidatePool: world.candidatePool,
    trainingState: mapToObject(world.trainingState || new Map()),
    settings: world.settings,
    ftue: world.ftue,

    globalCup: world.globalCup,
    chronicle: world.chronicle,

    calendar: world.calendar,
    _interimDaysRemaining: world._interimDaysRemaining,
    _postBashoDays: world._postBashoDays,
    _daysSinceLastWeeklyTick: world._daysSinceLastWeeklyTick,

    meta: world.meta,
    globalKimariteStats: world.globalKimariteStats,
    allTimeKimariteStats: world.allTimeKimariteStats,

    playerKnowledge: world.playerKnowledge,
    tutorialState: world.tutorialState,
    boutTactics: world.boutTactics,

    governanceLog: world.governanceLog,
    factions: world.factions,
    gyojiPool: world.gyojiPool,
    shimpanPool: world.shimpanPool,

    awardLog: world.awardLog,
    bloodlineRegistry: world.bloodlineRegistry,
    yokozunaVacancyStreak: world.yokozunaVacancyStreak,
    planetRating: world.planetRating,

    sparringPairs: world.sparringPairs ? mapToObject(world.sparringPairs) : undefined,
    heyaBrandIdentities: world.heyaBrandIdentities
      ? mapToObject(world.heyaBrandIdentities)
      : undefined,
    customKeshoConfigs: world.customKeshoConfigs,
    encouragementLog: world.encouragementLog,

    pendingCrisis: world.pendingCrisis,
    pendingDecisions: world.pendingDecisions,
    pendingRikishiRequests: world.pendingRikishiRequests,
    pendingExhibitions: world.pendingExhibitions,
    matchmakingOverride: world.matchmakingOverride,
    lastBoutResult: world.lastBoutResult,

    npcScoutingPriorities: world.npcScoutingPriorities,
    npcBidPolicies: world.npcBidPolicies,
    bashoNpcPosture: world.bashoNpcPosture,
    factionPostures: world.factionPostures,
    _populationTarget: world._populationTarget,
    _recruitmentWindow: world._recruitmentWindow,
    _postBashoMeta: world._postBashoMeta,
    // Convert the nested Map explicitly — JSON.stringify would otherwise
    // reduce rikishiAssessments to {} and crash PreBashoAssessment on load.
    _preBashoAssessment: world._preBashoAssessment
      ? {
          ...world._preBashoAssessment,
          rikishiAssessments: mapToObject(world._preBashoAssessment.rikishiAssessments),
        }
      : undefined,
    isInitialSeed: world.isInitialSeed,
  };
}

/**
 * Transform SerializedWorldState to live WorldState.
 * After reconstruction, rebuildTransientContext() is called so the UI
 * immediately has valid activeModifiers without requiring a tick.
 */
function deserializeWorld(serialized: SerializedWorldState): WorldState {
  // Reset impact timestamp counter for deterministic simulation when loading saved world
  resetImpactTimestampCounter();
  const s = serialized;

  // Sanitization Pass
  const heyasObj = s.heyas || {};
  const rikishiObj = s.rikishi || {};
  for (const k of Object.keys(heyasObj)) {
    const heya = heyasObj[k];
    if (heya) sanitizeHeya(heya);
  }
  for (const k of Object.keys(rikishiObj)) {
    const rikishi = rikishiObj[k];
    if (rikishi) sanitizeRikishi(rikishi);
  }

  const liveWorld = {
    id: `world_${serialized.seed}`,
    seed: serialized.seed,
    year: serialized.year,
    week: serialized.week,
    dayIndexGlobal: serialized.dayIndexGlobal ?? 0,
    cyclePhase: serialized.cyclePhase || "interim",
    currentBashoName: serialized.currentBashoName,

    heyas: objectToMap(heyasObj),
    closedHeyas: objectToMap(s.closedHeyas || {}),
    rikishi: objectToMap(rikishiObj),
    historicalRikishi: objectToMap(s.historicalRikishi || {}),
    activeRikishiIds: new Set(s.activeRikishiIds || []),
    oyakata: objectToMap(s.oyakata || {}),
    staff: objectToMap(s.staff || {}),

    currentBasho: serialized.currentBasho
      ? deserializeBashoState(serialized.currentBasho)
      : undefined,
    history: serialized.history || [],
    historyIndex: s.historyIndex,
    lineage: s.lineage || [],
    records: s.records || {
      allTime: {
        careerWins: [],
        makuuchiWins: [],
        yusho: [],
        consecutiveYusho: [],
        kinboshi: [],
      },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    },
    hallOfFame: s.hallOfFame,
    events: s.events || { version: "1.0.0", log: [], dedupe: {} },
    rivalriesState: s.rivalriesState,
    myosekiMarket: s.myosekiMarket,

    ftue: serialized.ftue,
    // Restore era drift rather than resetting it — a loaded save must continue
    // the metagame it was saved in, not revert to a fresh "classic" era.
    meta: s.meta ?? { tone: "classic" as const, drift: {} },
    globalKimariteStats: s.globalKimariteStats ?? {},
    allTimeKimariteStats: s.allTimeKimariteStats ?? {},
    playerHeyaId: serialized.playerHeyaId,
    currentBanzuke: serialized.currentBanzuke,
    talentPool: s.talentPool,
    candidatePool: s.candidatePool,
    almanacSnapshots: s.almanacSnapshots || [],
    sponsorPool: deserializeSponsorPool(s.sponsorPool),
    ozekiKadoban: s.ozekiKadoban ?? {},
    mediaState: s.mediaState,
    trainingState: objectToMap(s.trainingState || {}),
    settings: s.settings || { archiveMode: "standard" },

    globalCup: s.globalCup,
    chronicle: s.chronicle,

    calendar: s.calendar,
    _interimDaysRemaining: s._interimDaysRemaining,
    _postBashoDays: s._postBashoDays,
    _daysSinceLastWeeklyTick: s._daysSinceLastWeeklyTick,

    playerKnowledge: s.playerKnowledge,
    tutorialState: s.tutorialState,
    boutTactics: s.boutTactics,

    governanceLog: s.governanceLog,
    factions: s.factions,
    gyojiPool: s.gyojiPool,
    shimpanPool: s.shimpanPool,

    awardLog: s.awardLog,
    bloodlineRegistry: s.bloodlineRegistry,
    yokozunaVacancyStreak: s.yokozunaVacancyStreak,
    planetRating: s.planetRating,

    sparringPairs: s.sparringPairs ? objectToMap(s.sparringPairs) : undefined,
    heyaBrandIdentities: s.heyaBrandIdentities ? objectToMap(s.heyaBrandIdentities) : undefined,
    customKeshoConfigs: s.customKeshoConfigs,
    encouragementLog: s.encouragementLog,

    pendingCrisis: s.pendingCrisis,
    pendingDecisions: s.pendingDecisions,
    pendingRikishiRequests: s.pendingRikishiRequests,
    pendingExhibitions: s.pendingExhibitions,
    matchmakingOverride: s.matchmakingOverride,
    lastBoutResult: s.lastBoutResult,

    npcScoutingPriorities: s.npcScoutingPriorities,
    npcBidPolicies: s.npcBidPolicies,
    bashoNpcPosture: s.bashoNpcPosture,
    factionPostures: s.factionPostures,
    _populationTarget: s._populationTarget,
    _recruitmentWindow: s._recruitmentWindow,
    _postBashoMeta: s._postBashoMeta,
    // rikishiAssessments arrives as: a live Map (collection-codec reviver),
    // a Record (explicit mapToObject on serialize), or a legacy {} husk.
    _preBashoAssessment: s._preBashoAssessment
      ? {
          ...s._preBashoAssessment,
          rikishiAssessments:
            s._preBashoAssessment.rikishiAssessments instanceof Map
              ? s._preBashoAssessment.rikishiAssessments
              : objectToMap(
                  (s._preBashoAssessment.rikishiAssessments ?? {}) as Record<
                    string,
                    RikishiAssessmentEntry
                  >
                ),
        }
      : undefined,
    isInitialSeed: s.isInitialSeed,
  };

  // Rebuild ephemeral transientContext so the UI has valid activeModifiers
  // immediately after a save is loaded, without requiring an advance.
  try {
    const contextImpact = phase02_context(liveWorld);
    return resolveImpacts(liveWorld, [contextImpact]);
  } catch {
    // Non-fatal: UI falls back to raw multipliers if context rebuild fails
    return liveWorld;
  }
}

function serializeSponsorPool(pool?: SponsorPool): SerializedSponsorPool | undefined {
  if (!pool) return undefined;
  return {
    sponsors: mapToObject(pool.sponsors || new Map()),
    koenkais: mapToObject(pool.koenkais || new Map()),
  };
}

function deserializeSponsorPool(data?: SerializedSponsorPool): SponsorPool | undefined {
  if (!data) return undefined;
  return {
    sponsors: objectToMap(data.sponsors || {}),
    koenkais: objectToMap(data.koenkais || {}),
  };
}

function sanitizeRikishi(r: Rikishi): void {
  if (r.economics) {
    const e = r.economics;
    if (typeof e.cash !== "number") e.cash = 0;
    if (typeof e.retirementFund !== "number") e.retirementFund = 0;
    if (typeof e.popularity !== "number") e.popularity = 30;
    if (typeof e.careerKenshoWon !== "number") e.careerKenshoWon = 0;
    if (typeof e.kinboshiCount !== "number") e.kinboshiCount = 0;
    if (typeof e.totalEarnings !== "number") e.totalEarnings = 0;
    if (typeof e.currentBashoEarnings !== "number") e.currentBashoEarnings = 0;
  }
  if (typeof r.talentSeed !== "number") {
    let hash = 0;
    const idStr = String(r.id || "");
    for (let i = 0; i < idStr.length; i++) hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;
    r.talentSeed = 30 + Math.abs(hash % 61);
  }
  if (!RANK_HIERARCHY[r.rank]) {
    warn(
      `Rikishi ${r.id} has invalid rank '${r.rank}', resetting to jonokuchi`,
      "SerializationService"
    );
    r.rank = "jonokuchi";
    r.division = RANK_HIERARCHY.jonokuchi.division;
  }
}

function sanitizeHeya(h: Heya): void {
  if (typeof h.funds !== "number") h.funds = 0;
  if (Array.isArray(h.rikishiIds)) {
    h.rikishiIds = [...new Set(h.rikishiIds)];
  }
}

/**
 * Namespace preserving the public SerializationService.* surface.
 */
export const SerializationService = {
  mapToObject,
  objectToMap,
  serializeBashoState,
  deserializeBashoState,
  serializeWorld,
  deserializeWorld,
  serializeSponsorPool,
  deserializeSponsorPool,
  sanitizeRikishi,
  sanitizeHeya,
};
