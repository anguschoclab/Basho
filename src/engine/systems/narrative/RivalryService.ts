// @ts-nocheck
/**
 * src/engine/systems/narrative/RivalryService.ts
 * ==============================================
 * Stateful orchestration for the Rivalry System.
 *
 * Responsibilities:
 * 1. State Hydration (ensureRivalriesState)
 * 2. Weekly Decay Tick (applyRivalryWeeklyDecay)
 * 3. Bout Hook Orchestration (updateRivalriesFromBout)
 *
 * Goal: Service-oriented architecture with clear dependencies.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { EntityCollection } from "../../core/EntityCollection";
import { RNGRegistry } from "../../core/RNGRegistry";
import { EntityService } from "../../core/EntityService";
import type { Rikishi } from "../../types/rikishi";
import { clamp } from "../../utils/math";
import { type RivalriesState, type RivalryPairState, type RivalryKey } from "./RivalryConstants";
import { applyBoutToPairState, deriveTone } from "./RivalryHeatService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { BoutResult } from "../../types/basho";

/**
 * Unified Rivalry Service.
 */
export const RivalryService = {
  /**
   * Ensure rivalry state exists on world.
   */
  ensureRivalriesState(world: WorldState): RivalriesState {
    return EntityService.ensureState(world, "rivalriesState", () => ({
      version: "1.0.0",
      pairs: {},
    }));
  },

  /**
   * Canonical Pair Key Generator.
   */
  makeRivalryKey(aId: Id, bId: Id): RivalryKey {
    return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
  },

  /**
   * Authoritative Bout Hook.
   * Returns StateImpact describing rivalry updates instead of mutating state directly.
   */
  onBoutResolved(world: WorldState, args: { result: BoutResult; day?: number }): StateImpact {
    const { result } = args;
    if (!result.winnerRikishiId || !result.loserRikishiId) {
      return createImpactBuilder("onBoutResolvedRivalries").build();
    }

    const builder = createImpactBuilder("onBoutResolvedRivalries");
    const state = this.ensureRivalriesState(world);
    const key = this.makeRivalryKey(result.winnerRikishiId, result.loserRikishiId);
    const week = world.calendar.currentWeek || 0;

    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `bout-${key}-${week}`);
    const existing =
      state.pairs[key] ??
      this.createFreshPair(result.winnerRikishiId, result.loserRikishiId, world);

    const next = applyBoutToPairState(existing, {
      rng,
      isWinForA: result.winnerRikishiId === existing.aId,
      isLossForA: result.loserRikishiId === existing.aId,
      isKinboshi: !!result.isKinboshi,
      isTitleStakes: !!result.isTitleStakes,
      closeness01: result.duration ? Math.min(1.0, result.duration / 12) : 0.5,
      domination01: result.duration ? Math.max(0.0, 1.0 - result.duration / 10) : 0.2,
      isUpset: !!result.upset,
      isFinalDay: args.day === 15,
      isYushoRace: !!result.isYushoRace,
      week,
    });

    // Detection for heat spikes (crosses thresholds 25, 50, 75)
    const oldHeat = existing.heat;
    const newHeat = next.heat;
    const thresholds = [25, 50, 75];
    const thresholdCrossed = thresholds.find((t) => oldHeat <= t && newHeat > t);

    if (thresholdCrossed) {
      const rA = EntityCollection.getRikishiById(world, existing.aId);
      const rB = EntityCollection.getRikishiById(world, existing.bId);
      if (rA && rB) {
        builder.logEvent(
          "RIVALRY_HEAT_SPIKE",
          "rivalry",
          {
            shikona: rA.shikona,
            rival: rB.shikona,
            winner: result.winnerRikishiId === rA.id ? rA.shikona : rB.shikona,
            loser: result.loserRikishiId === rA.id ? rA.shikona : rB.shikona,
            heat: newHeat,
            threshold: thresholdCrossed,
          },
          { importance: "headline" }
        );
      }
    }

    // Build the updated rivalries state
    const updatedPairs = { ...state.pairs };

    // Update pairs
    updatedPairs[key] = next;

    // --- STABLE RIVALRY MERGE ---
    const heyaAId = result.winnerHeyaId || "";
    const heyaBId = result.loserHeyaId || "";
    const updatedHeyaPairs = { ...(state.heyaRivalryPairs || {}) };

    if (heyaAId && heyaBId && heyaAId !== heyaBId) {
      const hKey = heyaAId < heyaBId ? `${heyaAId}|${heyaBId}` : `${heyaBId}|${heyaAId}`;
      const existingH = updatedHeyaPairs[hKey] || {
        id: hKey,
        heyaAId: heyaAId < heyaBId ? heyaAId : heyaBId,
        heyaBId: heyaAId < heyaBId ? heyaBId : heyaAId,
        heat: 0,
        aWins: 0,
        bWins: 0,
      };

      const hHeatGain = result.isTitleStakes ? 8 : 3;
      updatedHeyaPairs[hKey] = {
        ...existingH,
        heat: Math.min(100, existingH.heat + hHeatGain),
        aWins: existingH.aWins + (result.winnerHeyaId === existingH.heyaAId ? 1 : 0),
        bWins: existingH.bWins + (result.winnerHeyaId === existingH.heyaBId ? 1 : 0),
      };
    }

    builder.updateWorldField("rivalriesState", {
      version: state.version,
      pairs: updatedPairs,
      heyaRivalryPairs: updatedHeyaPairs,
    });

    return builder.build();
  },

  /**
   * Weekly Decay Tick.
   * Returns StateImpact describing rivalry decay instead of mutating state directly.
   */
  applyWeeklyDecay(world: WorldState): StateImpact {
    const builder = createImpactBuilder("applyWeeklyDecay");
    const state = this.ensureRivalriesState(world);
    const week = world.calendar?.currentWeek || 0;

    const finalPairs: Record<string, RivalryPairState> = {};

    for (const key in state.pairs) {
      const pair = state.pairs[key];
      const weeksSince = week - pair.lastMetWeek;
      const decay = weeksSince <= 4 ? 0.5 : weeksSince <= 12 ? 1.0 : 1.5;

      const updatedPair = {
        ...pair,
        heat: clamp(pair.heat - decay, 0, 100),
        closeness: clamp(pair.closeness - 0.25, 0, 100),
        spite: clamp(pair.spite - 0.35, 0, 100),
        tone: deriveTone(pair),
      };

      // Auto-cull
      if (!(updatedPair.heat < 5 && updatedPair.meetings < 2 && weeksSince > 30)) {
        finalPairs[key] = updatedPair;
      }
    }

    builder.updateWorldField("rivalriesState", {
      version: state.version,
      pairs: finalPairs,
    });

    return builder.build();
  },

  /**
   * Factory for a fresh pair.
   */
  createFreshPair(id1: Id, id2: Id, world: WorldState): RivalryPairState {
    const [aId, bId] = id1 < id2 ? [id1, id2] : [id2, id1];
    const rA = EntityCollection.getRikishiById(world, aId);
    const rB = EntityCollection.getRikishiById(world, bId);

    return {
      key: `${aId}|${bId}`,
      aId,
      bId,
      heat: 0,
      meetings: 0,
      lastMetWeek: world.calendar?.currentWeek || 0,
      aWins: 0,
      bWins: 0,
      closeness: 0,
      spite: 0,
      tone: "respect",
      triggers: {},
      sameHeya: !!rA && !!rB && rA.heyaId === rB.heyaId,
    };
  },

  /**
   * Seed Initial Rivalries (P0-C1).
   * Generates interesting initial grudges based on style clash and rank proximity.
   * Returns StateImpact describing initial rivalries.
   */
  seedInitialRivalries(world: WorldState): StateImpact {
    const builder = createImpactBuilder("seedInitialRivalries");
    const state = this.ensureRivalriesState(world);
    const makuuchiJuryo = Array.from(world.activeRikishiIds)
      .map((id) => world.rikishi.get(id))
      .filter((r): r is Rikishi => r !== undefined && (r.division === "makuuchi" || r.division === "juryo"));

    const candidates: Array<{ a: Rikishi; b: Rikishi; score: number }> = [];

    // Evaluate pairs
    for (let i = 0; i < makuuchiJuryo.length; i++) {
      for (let j = i + 1; j < makuuchiJuryo.length; j++) {
        const a = makuuchiJuryo[i];
        const b = makuuchiJuryo[j];

        if (a.heyaId === b.heyaId) continue;

        let score = 0;
        // Style clash: Push vs Belt is classic
        if (a.style !== b.style) score += 10;

        // Origin or Nationality clash
        if (a.nationality !== b.nationality) score += 5;

        // Rank proximity (same division, close rank numbers)
        if (a.division === b.division) {
          score += 5;
          const rankDiff = Math.abs((a.rankNumber ?? 1) - (b.rankNumber ?? 1));
          if (rankDiff <= 4) score += 15 - rankDiff * 2;
        }

        // Age proximity
        const ageDiff = Math.abs(a.birthYear - b.birthYear);
        if (ageDiff <= 2) score += 10 - ageDiff * 3;

        candidates.push({ a, b, score });
      }
    }

    // Sort descending by score
    candidates.sort((c1, c2) => c2.score - c1.score);

    // Seed top 12 pairs
    const toSeed = candidates.slice(0, 12);
    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `init`);

    const nextPairs = { ...state.pairs };
    for (const { a, b } of toSeed) {
      const key = this.makeRivalryKey(a.id, b.id);
      const pair = this.createFreshPair(a.id, b.id, world);
      pair.heat = rng.int(20, 45); // Warm heat
      pair.tone = rng.pick(["grudge", "bad_blood", "public_hype", "respect"]);
      nextPairs[key] = pair;
    }

    builder.updateWorldField("rivalriesState", {
      ...state,
      pairs: nextPairs,
    });

    return builder.build();
  },

  /**
   * Seed a rivalry from extended sparring partnership.
   *
   * Called when a sparring pair reaches 12+ weeks of activity.
   * Uses RNG to determine if a rivalry should be seeded (40% chance).
   * Initial rivalry heat depends on sparring chemistry (friction = higher heat).
   *
   * @param {WorldState} world - The current world state.
   * @param {string} aId - First rikishi ID.
   * @param {string} bId - Second rikishi ID.
   * @param {string} chemistry - Sparring chemistry state ("friction", "rut", "neutral").
   * @param {number} weeksActive - Number of weeks the pair has been sparring.
   * @returns {StateImpact} Impact describing rivalry seeding (or empty if no rivalry seeded).
   *
   * @example
   * ```ts
   * const impact = RivalryService.maybeSeedSparringRivalry(world, "r1", "r2", "friction", 12);
   * ```
   */
  maybeSeedSparringRivalry(
    world: WorldState,
    aId: string,
    bId: string,
    chemistry: string,
    weeksActive: number
  ): StateImpact {
    const builder = createImpactBuilder("maybeSeedSparringRivalry");

    // Only seed after 12+ weeks of sparring
    if (weeksActive < 12) return builder.build();

    const state = this.ensureRivalriesState(world);
    const key = this.makeRivalryKey(aId, bId);

    // Don't seed if rivalry already exists
    if (state.pairs[key]) return builder.build();

    // 40% chance to seed rivalry
    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `sparring-${key}-${weeksActive}`);
    if (rng.next() > 0.4) return builder.build();

    // Get rikishi for event logging
    const rA = EntityCollection.getRikishiById(world, aId);
    const rB = EntityCollection.getRikishiById(world, bId);
    if (!rA || !rB) return builder.build();

    // Calculate initial heat based on chemistry
    // Friction produces higher heat (40-60), neutral moderate (25-45), rut lower (15-35)
    let minHeat = 25;
    let maxHeat = 45;
    if (chemistry === "friction") {
      minHeat = 40;
      maxHeat = 60;
    } else if (chemistry === "rut") {
      minHeat = 15;
      maxHeat = 35;
    }

    const initialHeat = rng.int(minHeat, maxHeat);

    // Determine tone based on chemistry
    let tone = "respect";
    if (chemistry === "friction") {
      tone = rng.pick(["grudge", "bad_blood", "public_hype"]);
    } else if (chemistry === "rut") {
      tone = rng.pick(["respect", "mentor_student"]);
    } else {
      tone = rng.pick(["respect", "public_hype", "unstable"]);
    }

    // Create new rivalry pair
    const pair = this.createFreshPair(aId, bId, world);
    pair.heat = initialHeat;
    pair.tone = tone as any;
    pair.triggers.sparring = weeksActive;

    // Update rivalry state
    const updatedPairs = { ...state.pairs };
    updatedPairs[key] = pair;

    builder.updateWorldField("rivalriesState", {
      ...state,
      pairs: updatedPairs,
    });

    // Log event
    builder.logEvent(
      "SPARRING_RIVALRY_SEEDED",
      "rivalry",
      {
        shikona: rA.shikona,
        rival: rB.shikona,
        chemistry,
        weeksActive,
        heat: initialHeat,
        tone,
      },
      { importance: "notable" }
    );

    return builder.build();
  },
};
