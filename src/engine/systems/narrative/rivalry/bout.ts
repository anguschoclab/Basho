import type { WorldState } from "../../../types/world";
import { EntityCollection } from "../../../core/EntityCollection";
import { RNGRegistry } from "../../../core/RNGRegistry";
import { applyBoutToPairState } from "../RivalryHeatService";
import { createImpactBuilder } from "../../../core/ImpactBuilder";
import type { StateImpact } from "../../../core/StateImpact";
import type { BoutResult } from "../../../types/basho";
import {
  BOUT_DURATION_CLOSENESS_DIVISOR,
  BOUT_DURATION_DOMINATION_DIVISOR,
  HEAT_SPIKE_THRESHOLDS,
} from "../../../../constants/engine/narrative";
import { BASHO_FINAL_DAY } from "../../../../constants/engine/calendar";
import {
  RIVALRY_CLOSENESS_DEFAULT,
  RIVALRY_DOMINATION_DEFAULT,
  HEYA_HEAT_GAIN_TITLE_STAKES,
  HEYA_HEAT_GAIN_NORMAL,
} from "../../../../constants/engine/rivalry";
import { ensureRivalriesState, makeRivalryKey, createFreshPair } from "./state";

/**
 * Authoritative Bout Hook.
 * Updates rivalry state based on bout results.
 * Returns StateImpact describing rivalry updates instead of mutating state directly.
 */
export function onBoutResolved(
  world: WorldState,
  args: { result: BoutResult; day?: number }
): StateImpact {
  const { result } = args;
  if (!result.winnerRikishiId || !result.loserRikishiId) {
    return createImpactBuilder("onBoutResolvedRivalries").build();
  }

  const builder = createImpactBuilder("onBoutResolvedRivalries");
  const state = ensureRivalriesState(world);
  const key = makeRivalryKey(result.winnerRikishiId, result.loserRikishiId);
  const week = world.calendar?.currentWeek || 0;

  const rng = RNGRegistry.getSystemRNG(world, "rivalry", `bout-${key}-${week}`);
  const existing =
    state.pairs[key] ?? createFreshPair(result.winnerRikishiId, result.loserRikishiId, world);

  // sameHeya is snapshotted at pair creation but rikishi can change stables
  // (mergers/closures) — refresh it from the live roster before applying.
  const rA = EntityCollection.getRikishiById(world, existing.aId);
  const rB = EntityCollection.getRikishiById(world, existing.bId);
  const sameHeya = !!rA && !!rB && rA.heyaId === rB.heyaId;
  const current = sameHeya === existing.sameHeya ? existing : { ...existing, sameHeya };

  const next = applyBoutToPairState(current, {
    rng,
    isWinForA: result.winnerRikishiId === existing.aId,
    isKinboshi: !!result.isKinboshi,
    isTitleStakes: !!result.isTitleStakes,
    closeness01: result.duration
      ? Math.min(1.0, result.duration / BOUT_DURATION_CLOSENESS_DIVISOR)
      : RIVALRY_CLOSENESS_DEFAULT,
    domination01: result.duration
      ? Math.max(0.0, 1.0 - result.duration / BOUT_DURATION_DOMINATION_DIVISOR)
      : RIVALRY_DOMINATION_DEFAULT,
    isUpset: !!result.upset,
    isFinalDay: args.day === BASHO_FINAL_DAY,
    isYushoRace: !!result.isYushoRace,
    week,
    kimarite: result.kimarite,
    winnerId: result.winnerRikishiId,
  });

  // Detection for heat spikes (crosses thresholds)
  const oldHeat = existing.heat;
  const newHeat = next.heat;
  const thresholds = HEAT_SPIKE_THRESHOLDS;
  const thresholdCrossed = thresholds.find((t) => oldHeat <= t && newHeat > t);

  if (thresholdCrossed) {
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
    const hKey = makeRivalryKey(heyaAId, heyaBId);
    const [sortedA, sortedB] = heyaAId < heyaBId ? [heyaAId, heyaBId] : [heyaBId, heyaAId];
    const existingH = updatedHeyaPairs[hKey] || {
      id: hKey,
      heyaAId: sortedA,
      heyaBId: sortedB,
      heat: 0,
      aWins: 0,
      bWins: 0,
    };

    const hHeatGain = result.isTitleStakes ? HEYA_HEAT_GAIN_TITLE_STAKES : HEYA_HEAT_GAIN_NORMAL;
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
}
