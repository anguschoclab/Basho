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

import { EventBus } from "../../events";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { EntityCollection } from "../../core/EntityCollection";
import { RNGRegistry } from "../../core/RNGRegistry";
import { EntityService } from "../../core/EntityService";
import { clamp } from "../../utils/math";
import {
  type RivalriesState,
  type RivalryPairState,
  type RivalryKey,
  type RivalryTone,
  type RivalryTrigger
} from "./RivalryConstants";
import {
  applyBoutToPairState,
  deriveTone
} from "./RivalryHeatService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

/**
 * Unified Rivalry Service.
 */
export const RivalryService = {
  /**
   * Ensure rivalry state exists on world.
   */
  ensureRivalriesState(world: WorldState): RivalriesState {
    return EntityService.ensureState(
      world, 
      "rivalriesState", 
      () => ({ version: "1.0.0", pairs: {} })
    );
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
  onBoutResolved(world: WorldState, args: { result: any; day?: number }): StateImpact {
    const { result } = args;
    if (!result.winnerRikishiId || !result.loserRikishiId) {
      return createImpactBuilder('onBoutResolvedRivalries').build();
    }

    const builder = createImpactBuilder('onBoutResolvedRivalries');
    const state = this.ensureRivalriesState(world);
    const key = this.makeRivalryKey(result.winnerRikishiId, result.loserRikishiId);
    const week = world.calendar.currentWeek || 0;

    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `bout-${key}-${week}`);
    const existing = state.pairs[key] ?? this.createFreshPair(result.winnerRikishiId, result.loserRikishiId, world);

    const next = applyBoutToPairState(existing, {
      rng,
      isWinForA: result.winnerRikishiId === existing.aId,
      isLossForA: result.loserRikishiId === existing.aId,
      isKinboshi: !!result.isKinboshi,
      isTitleStakes: !!result.isTitleStakes,
      closeness01: result.duration ? Math.min(1.0, result.duration / 12) : 0.5,
      domination01: result.duration ? Math.max(0.0, 1.0 - (result.duration / 10)) : 0.2,
      isUpset: !!result.upset,
      week
    });

    // Detection for heat spikes (crosses thresholds 25, 50, 75)
    const oldHeat = existing.heat;
    const newHeat = next.heat;
    const thresholds = [25, 50, 75];
    const thresholdCrossed = thresholds.find(t => oldHeat <= t && newHeat > t);

    if (thresholdCrossed) {
      const rA = EntityCollection.getRikishiById(world, existing.aId);
      const rB = EntityCollection.getRikishiById(world, existing.bId);
      if (rA && rB) {
        builder.logEvent(
          'RIVALRY_HEAT_SPIKE',
          'rivalry',
          {
            shikona: rA.shikona,
            rival: rB.shikona,
            winner: result.winnerRikishiId === rA.id ? rA.shikona : rB.shikona,
            loser: result.loserRikishiId === rA.id ? rA.shikona : rB.shikona,
            heat: newHeat,
            threshold: thresholdCrossed
          },
          { importance: 'headline' }
        );
      }
    }

    // Build the updated rivalries state
    const updatedPairs = { ...state.pairs };

    // Cull very cold rivalries
    if (next.heat < 10 && next.meetings < 2 && week - next.lastMetWeek > 20) {
      delete updatedPairs[key];
    } else {
      updatedPairs[key] = next;
    }

    // Update the rivalriesState world field
    (builder as any).updateWorldField('rivalriesState', {
      version: state.version,
      pairs: updatedPairs
    });

    return builder.build();
  },

  /**
   * Weekly Decay Tick.
   * Returns StateImpact describing rivalry decay instead of mutating state directly.
   */
  applyWeeklyDecay(world: WorldState): StateImpact {
    const builder = createImpactBuilder('applyWeeklyDecay');
    const state = this.ensureRivalriesState(world);
    const week = world.calendar.currentWeek || 0;

    const updatedPairs = { ...state.pairs };

    for (const key in state.pairs) {
      const pair = state.pairs[key];
      const weeksSince = week - pair.lastMetWeek;
      const decay = weeksSince <= 4 ? 0.5 : weeksSince <= 12 ? 1.0 : 1.5;

      const updatedPair = {
        ...pair,
        heat: clamp(pair.heat - decay, 0, 100),
        closeness: clamp(pair.closeness - 0.25, 0, 100),
        spite: clamp(pair.spite - 0.35, 0, 100),
        tone: deriveTone(pair)
      };

      // Auto-cull
      if (updatedPair.heat < 5 && updatedPair.meetings < 2 && weeksSince > 30) {
        delete updatedPairs[key];
      } else {
        updatedPairs[key] = updatedPair;
      }
    }

    (builder as any).updateWorldField('rivalriesState', {
      version: state.version,
      pairs: updatedPairs
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
      lastMetWeek: world.calendar.currentWeek || 0,
      aWins: 0,
      bWins: 0,
      closeness: 0,
      spite: 0,
      tone: "respect",
      triggers: {},
      sameHeya: !!rA && !!rB && rA.heyaId === rB.heyaId
    };
  }
};
