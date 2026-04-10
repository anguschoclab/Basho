import { stableTieBreak } from "../utils/sort";
import { phase02_context } from "../tick/phases/phase02_context";
import { 
  WorldState, 
  SerializedWorldState, 
  BashoState, 
  SerializedBashoState,
  Rikishi,
  Heya,
  Oyakata,
  Id,
  SerializedSponsorPoolFixed as SerializedSponsorPool
} from "../types";


import type { SponsorPool } from "../types/sponsors";

/**
 * Serialization Service handles the transformation between runtime Maps
 * and JSON-safe SerializedWorldState objects.
 */

export const SerializationService = {
  /**
   * Serializes a Map or Record to a sorted JSON-safe object.
   */
  mapToObject<T>(map: Map<string, T> | Record<string, T>): Record<string, T> {
    if (!(map instanceof Map)) return map;
    const obj: Record<string, T> = {};
    const keys = Array.from(map.keys()).sort(stableTieBreak);
    for (const key of keys) obj[key] = map.get(key)!;
    return obj;
  },

  /**
   * Deserializes a JSON object into a runtime Map with sorted keys.
   */
  objectToMap<T>(obj: Record<string, T | undefined>): Map<string, T> {
    const map = new Map<string, T>();
    if (!obj) return map;
    for (const key of Object.keys(obj).sort(stableTieBreak)) {
      const v = obj[key];
      if (v !== undefined) map.set(key, v);
    }
    return map;
  },

  /**
   * Serialize basho state.
   */
  serializeBashoState(basho: BashoState): SerializedBashoState {
    return {
      year: basho.year,
      bashoNumber: basho.bashoNumber,
      bashoName: basho.bashoName,
      day: basho.day,
      matches: basho.matches,
      standings: this.mapToObject(basho.standings)
    };
  },

  /**
   * Deserialize basho state.
   */
  deserializeBashoState(basho: SerializedBashoState): BashoState {
    return {
      year: basho.year,
      bashoNumber: basho.bashoNumber,
      bashoName: basho.bashoName,
      day: basho.day,
      matches: basho.matches,
      standings: this.objectToMap(basho.standings),
      isActive: true
    };
  },

  /**
   * Transform WorldState to SerializedWorldState.
   * NOTE: transientContext is intentionally excluded — it is ephemeral and
   * must be rebuilt by rebuildTransientContext() on load.
   */
  serializeWorld(world: WorldState): SerializedWorldState {
    // Destructure to explicitly drop transientContext before serialization
    const { transientContext: _dropped, ...persistableWorld } = world as any;
    void _dropped; // suppress unused-var lint
    return {
      seed: world.seed,
      year: world.year,
      week: world.week,
      cyclePhase: world.cyclePhase,
      currentBashoName: world.currentBashoName,
      heyas: this.mapToObject(world.heyas),
      closedHeyas: this.mapToObject(world.closedHeyas || new Map()),
      rikishi: this.mapToObject(world.rikishi),
      historicalRikishi: this.mapToObject(world.historicalRikishi || new Map()),
      oyakata: this.mapToObject(world.oyakata),
      staff: this.mapToObject(world.staff || new Map()),
      currentBasho: world.currentBasho ? this.serializeBashoState(world.currentBasho) : undefined,
      history: world.history || [],
      historyIndex: world.historyIndex,
      lineage: world.lineage || [],
      records: world.records,
      hallOfFame: world.hallOfFame,
      events: world.events,
      rivalriesState: world.rivalriesState,
      myosekiMarket: world.myosekiMarket,
      ftue: world.ftue,
      playerHeyaId: world.playerHeyaId,
      currentBanzuke: world.currentBanzuke,
      dayIndexGlobal: world.dayIndexGlobal,
      almanacSnapshots: world.almanacSnapshots || [],
      calendar: world.calendar,
      sponsorPool: this.serializeSponsorPool(world.sponsorPool),
      ozekiKadoban: world.ozekiKadoban || {},
      mediaState: world.mediaState,
      talentPool: world.talentPool,
      candidatePool: world.candidatePool,
      trainingState: this.mapToObject(world.trainingState || new Map()),
      settings: world.settings
    };
  },

  /**
   * Transform SerializedWorldState to live WorldState.
   * After reconstruction, rebuildTransientContext() is called so the UI
   * immediately has valid activeModifiers without requiring a tick.
   */
  deserializeWorld(serialized: SerializedWorldState): WorldState {
    const s = serialized;
    
    // Sanitization Pass
    const heyasObj = s.heyas || {};
    const rikishiObj = s.rikishi || {};
    for (const k of Object.keys(heyasObj)) this.sanitizeHeya(heyasObj[k]!);
    for (const k of Object.keys(rikishiObj)) this.sanitizeRikishi(rikishiObj[k]!);

    const liveWorld = {
      id: `world_${serialized.seed}`,
      seed: serialized.seed,
      year: serialized.year,
      week: serialized.week,
      dayIndexGlobal: serialized.dayIndexGlobal ?? 0,
      cyclePhase: serialized.cyclePhase || "interim",
      currentBashoName: serialized.currentBashoName,

      heyas: this.objectToMap(heyasObj),
      closedHeyas: this.objectToMap(s.closedHeyas || {}),
      rikishi: this.objectToMap(rikishiObj),
      historicalRikishi: this.objectToMap(s.historicalRikishi || {}),
      oyakata: this.objectToMap(s.oyakata || {}),
      staff: this.objectToMap(s.staff || {}),

      currentBasho: serialized.currentBasho ? this.deserializeBashoState(serialized.currentBasho) : undefined,
      history: serialized.history || [],
      historyIndex: s.historyIndex,
      lineage: s.lineage || [],
      records: s.records || {
        allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
        active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }
      },
      hallOfFame: s.hallOfFame,
      events: s.events || { version: "1.0.0", log: [], dedupe: {} },
      rivalriesState: s.rivalriesState,
      myosekiMarket: s.myosekiMarket,

      ftue: serialized.ftue,
      playerHeyaId: serialized.playerHeyaId,
      currentBanzuke: serialized.currentBanzuke,
      talentPool: s.talentPool,
      almanacSnapshots: s.almanacSnapshots || [],
      sponsorPool: this.deserializeSponsorPool(s.sponsorPool),
      ozekiKadoban: s.ozekiKadoban ?? {},
      mediaState: s.mediaState,
      trainingState: this.objectToMap(s.trainingState || {}),
      settings: s.settings || { archiveMode: "standard" },
      calendar: s.calendar || {
        year: serialized.year,
        month: 1,
        currentWeek: serialized.week || 1,
        currentDay: 1
      }
    };

    // Rebuild ephemeral transientContext so the UI has valid activeModifiers
    // immediately after a save is loaded, without requiring an advance.
    try {
      return phase02_context(liveWorld);
    } catch {
      // Non-fatal: UI falls back to raw multipliers if context rebuild fails
      return liveWorld;
    }
  },

  serializeSponsorPool(pool?: SponsorPool): SerializedSponsorPool | undefined {
    if (!pool) return undefined;
    return {
      sponsors: this.mapToObject(pool.sponsors || new Map()),
      koenkais: this.mapToObject(pool.koenkais || new Map()),
    };
  },

  deserializeSponsorPool(data?: SerializedSponsorPool): SponsorPool | undefined {
    if (!data) return undefined;
    return {
      sponsors: this.objectToMap(data.sponsors || {}),
      koenkais: this.objectToMap(data.koenkais || {}),
    };
  },


  sanitizeRikishi(r: Rikishi): void {
    if (r.economics) {
      const e = r.economics;
      if (typeof e.cash !== "number") e.cash = 0;
      if (typeof e.retirementFund !== "number") e.retirementFund = 0;
      if (typeof e.popularity !== "number") e.popularity = 30;
    }
    if (typeof r.talentSeed !== "number") {
      let hash = 0;
      const idStr = String(r.id || "");
      for (let i = 0; i < idStr.length; i++) hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;
      r.talentSeed = 30 + Math.abs(hash % 61);
    }
  },

  sanitizeHeya(h: Heya): void {
    if (typeof h.funds !== "number") h.funds = 0;
  }
};
