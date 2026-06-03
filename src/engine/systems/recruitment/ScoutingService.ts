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

import type { Rikishi } from "../../types/rikishi";
import {
  calculateScoutingLevel,
  getConfidenceLevel,
  resolveScoutedAttribute,
} from "./FogOfWarService";
import { type ScoutingInvestment } from "../../../constants/engine/recruitment";

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

/** Potential (PA) truth snapshot — revealed gradually via scouting. */
export interface ScoutedPotentialSnapshot {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  mental: number;
  stamina: number;
  adaptability: number;
  heightCm: number;
  weightKg: number;
  /** Development profile label — only revealed at high scouting */
  profile?: "prodigy" | "standard" | "late_bloomer" | "journeyman" | "early_peaker";
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
  potential?: ScoutedPotentialSnapshot;
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
        archetype: rikishi.archetype,
      },
      isOwned,
      timesObserved: observations,
      lastObservedWeek: currentWeek || 0,
      scoutingInvestment: investment,
      scoutingLevel: level,
      attributes: {
        power: rikishi.stats.power || 50,
        speed: rikishi.stats.speed || 50,
        balance: rikishi.stats.balance || 50,
        technique: rikishi.stats.technique || 50,
        aggression: rikishi.stats.aggression || 50,
        experience: rikishi.stats.experience || 50,
      },
      potential: rikishi.potential
        ? {
            power: rikishi.potential.stats.power,
            speed: rikishi.potential.stats.speed,
            balance: rikishi.potential.stats.balance,
            technique: rikishi.potential.stats.technique,
            mental: rikishi.potential.stats.mental,
            stamina: rikishi.potential.stats.stamina,
            adaptability: rikishi.potential.stats.adaptability,
            heightCm: rikishi.potential.heightCm,
            weightKg: rikishi.potential.weightKg,
            profile: rikishi.potential.profile,
          }
        : undefined,
    };
  },

  /**
   * Record a new observation.
   */
  recordObservation(scouted: ScoutedRikishi, currentWeek: number): ScoutedRikishi {
    const timesObserved = scouted.timesObserved + 1;
    const level = calculateScoutingLevel(
      scouted.isOwned,
      timesObserved,
      scouted.scoutingInvestment
    );

    return {
      ...scouted,
      timesObserved,
      lastObservedWeek: currentWeek,
      scoutingLevel: level,
    };
  },

  /**
   * Get displayable attributes for a scouted rikishi.
   */
  getScoutedAttributes(scouted: ScoutedRikishi, seed?: string) {
    const baseSeed = seed || `scout-${scouted.rikishiId}-${scouted.lastObservedWeek}`;
    const attr = scouted.attributes;

    const resolve = (name: string, val: number, type: "combat" | "physical" | "style") => {
      const conf = getConfidenceLevel(
        scouted.scoutingLevel,
        scouted.isOwned,
        scouted.timesObserved,
        type
      );
      return resolveScoutedAttribute(name, val, conf, `${baseSeed}-${name}`);
    };

    const current = {
      power: resolve("power", attr.power, "combat"),
      speed: resolve("speed", attr.speed, "combat"),
      balance: resolve("balance", attr.balance, "combat"),
      technique: resolve("technique", attr.technique, "combat"),
      aggression: resolve("aggression", attr.aggression, "combat"),
      experience: resolve("experience", attr.experience, "combat"),
    };

    if (!scouted.potential) return current;

    const pa = scouted.potential;
    const paResolve = (name: string, val: number) => {
      const conf = getConfidenceLevel(
        scouted.scoutingLevel,
        scouted.isOwned,
        scouted.timesObserved,
        "potential"
      );
      return resolveScoutedAttribute(name, val, conf, `${baseSeed}-pa-${name}`);
    };

    return {
      ...current,
      potential: {
        power: paResolve("power potential", pa.power),
        speed: paResolve("speed potential", pa.speed),
        balance: paResolve("balance potential", pa.balance),
        technique: paResolve("technique potential", pa.technique),
        mental: paResolve("mental potential", pa.mental),
        stamina: paResolve("stamina potential", pa.stamina),
        adaptability: paResolve("adaptability potential", pa.adaptability),
        // Physical ceilings revealed with combat confidence (easier to eyeball)
        heightCm: resolve("height ceiling", pa.heightCm, "combat"),
        weightKg: resolve("weight ceiling", pa.weightKg, "combat"),
        // Profile label only revealed at near-exhaustive scouting
        profile: scouted.scoutingLevel >= 90 || scouted.isOwned ? pa.profile : undefined,
      },
    };
  },

  /**
   * Human-readable label for scouting level.
   */
  describeScoutingLevel(level: number): string {
    if (level >= 90) return "Exhaustive";
    if (level >= 70) return "Professional";
    if (level >= 45) return "Detailed";
    if (level >= 20) return "Observation";
    return "Snapshot";
  },
};

// Named exports for legacy/external compatibility
export const createScoutedView = ScoutingService.createScoutedView;
export const recordObservation = ScoutingService.recordObservation;
export const getScoutedAttributes = ScoutingService.getScoutedAttributes;
export const describeScoutingLevel = ScoutingService.describeScoutingLevel;
