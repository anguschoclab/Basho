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

    // Cull very cold rivalries
    if (next.heat < 5 && next.meetings < 2 && result.duration && result.duration > 30) {
      const { [key as string]: _, ...remainingPairs } = updatedPairs;
      void _;
      // update the reference for further updates if any
      // but here we just pass it to updateWorldField
      builder.updateWorldField("rivalriesState", {
        version: state.version,
        pairs: remainingPairs,
        heyaRivalryPairs,
      });
    } else {
      updatedPairs[key] = next;
      builder.updateWorldField("rivalriesState", {
        version: state.version,
        pairs: updatedPairs,
        heyaRivalryPairs,
      });
    }

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
   */
  seedInitialRivalries(world: WorldState): void {
    const state = this.ensureRivalriesState(world);
    const makuuchiJuryo = Array.from(world.rikishi.values()).filter(
      (r) => !r.isRetired && (r.division === "makuuchi" || r.division === "juryo")
    );

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

    for (const { a, b } of toSeed) {
      const key = this.makeRivalryKey(a.id, b.id);
      const pair = this.createFreshPair(a.id, b.id, world);
      pair.heat = rng.int(20, 45); // Warm heat
      pair.tone = rng.pick(["grudge", "bad_blood", "public_hype", "respect"]);
      state.pairs[key] = pair;
    }

    world.rivalriesState = state;
  },
};