/**
 * src/engine/systems/recruitment/ScoutingService.ts
 * =================================================
 * Stateful orchestration for the Scouting System.
 * 
 * Responsibilities:
 * 1. View Generation (createScoutedView)
 * 2. Observation Recording (recordObservation)
 * 3. Display Logic (getScoutedAttributes)
 * 
 * Goal: Service-oriented architecture with clear dependencies.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi, RikishiStats } from "../../types/rikishi";
import { EntityCollection } from "../../core/EntityCollection";
import { RNGRegistry } from "../../core/RNGRegistry";
import { 
  calculateScoutingLevel, 
  getConfidenceLevel, 
  resolveScoutedAttribute 
} from "./FogOfWarService";
import { 
  type ScoutingInvestment, 
  type ConfidenceLevel 
} from "./RecruitmentConstants";

/** Defines the structure for public rikishi info. */
export interface PublicRikishiInfo {
  id: string;
  shikona: string;
  heyaId?: string;
  rank: string;
  rankNumber?: number;
  side?: string;
  height: number;
  weight: number;
  currentBashoWins?: number;
  currentBashoLosses?: number;
  style?: string;
  archetype?: string;
}

/** Defines the structure for scouted attribute truth snapshot. */
export interface ScoutedAttributeTruthSnapshot {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  aggression: number;
  experience: number;
}

/** Defines the structure for scouted rikishi. */
export interface ScoutedRikishi {
  rikishiId: string;
  publicInfo: PublicRikishiInfo;
  isOwned: boolean;
  timesObserved: number;
  lastObservedWeek: number;
  scoutingInvestment: ScoutingInvestment;
  scoutingLevel: number;
  attributes: ScoutedAttributeTruthSnapshot;
}

/**
 * Unified Scouting Service.
 */
export const ScoutingService = {
  /**
   * Create a snapshot of public and scouted info for a rikishi.
   */
  createScoutedView(
    currentWeek: number,
    rikishi: Rikishi,
    playerHeyaId: string | null,
    observations: number = 0,
    investment: ScoutingInvestment = "none"
  ): ScoutedRikishi {
    const isOwned = rikishi.heyaId === playerHeyaId;
    const level = calculateScoutingLevel(isOwned, observations, investment);

    return {
      rikishiId: rikishi.id,
      publicInfo: {
        id: rikishi.id,
        shikona: rikishi.shikona,
        heyaId: rikishi.heyaId,
        rank: rikishi.rank,
        rankNumber: rikishi.rankNumber || 1,
        side: rikishi.side || "east",
        height: rikishi.height,
        weight: rikishi.weight,
        currentBashoWins: rikishi.currentBashoWins || 0,
        currentBashoLosses: rikishi.currentBashoLosses || 0,
        style: rikishi.style,
        archetype: rikishi.archetype
      },
      isOwned,
      timesObserved: observations,
      lastObservedWeek: currentWeek || 0,
      scoutingInvestment: investment,
      scoutingLevel: level,
      attributes: {
        power: rikishi.power || 50,
        speed: rikishi.speed || 50,
        balance: rikishi.balance || 50,
        technique: rikishi.technique || 50,
        aggression: rikishi.aggression || 50,
        experience: rikishi.experience || 50
      }
    };
  },

  /**
   * Record a new observation.
   */
  recordObservation(scouted: ScoutedRikishi, currentWeek: number): ScoutedRikishi {
    const timesObserved = scouted.timesObserved + 1;
    const level = calculateScoutingLevel(scouted.isOwned, timesObserved, scouted.scoutingInvestment);

    return {
      ...scouted,
      timesObserved,
      lastObservedWeek: currentWeek,
      scoutingLevel: level
    };
  },

  /**
   * Get displayable attributes for a scouted rikishi.
   */
  getScoutedAttributes(scouted: ScoutedRikishi, seed?: string) {
    const baseSeed = seed || `scout-${scouted.rikishiId}-${scouted.lastObservedWeek}`;
    const attr = scouted.attributes;

    const resolve = (name: string, val: number, type: "combat" | "physical" | "style") => {
      const conf = getConfidenceLevel(scouted.scoutingLevel, scouted.isOwned, scouted.timesObserved, type);
      return resolveScoutedAttribute(name, val, conf, `${baseSeed}-${name}`);
    };

    return {
      power: resolve("power", attr.power, "combat"),
      speed: resolve("speed", attr.speed, "combat"),
      balance: resolve("balance", attr.balance, "combat"),
      technique: resolve("technique", attr.technique, "combat"),
      aggression: resolve("aggression", attr.aggression, "combat"),
      experience: resolve("experience", attr.experience, "combat")
    };
  },

  }
};
