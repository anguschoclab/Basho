/**
 * opponentLearning.ts
 * ====================
 * Post-bout learning hook: every resolved bout updates each participating
 * NPC heya's oyakata memory with a model of the opposing rikishi.
 *
 * Winner observations record the winning kimarite's tactical family;
 * loser observations record the family of the tactic they were resolved
 * with (they produced no kimarite, but their approach was still observed).
 *
 * Skips: fusensho walkovers (no combat observed), intra-heya bouts (a
 * stable does not scout itself), and the player-owned heya (the player's
 * oyakata slot has no AI memory).
 */

import type { WorldState } from "../types/world";
import type { BoutResult, MatchSchedule } from "../types/basho";
import type { Rikishi } from "../types/rikishi";
import type { Id } from "../types/common";
import { TACTIC_TO_FAMILY, type BoutTactic, type TacticalFamily } from "../types/combat";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { getMemory, getOpponentModel, recordOpponentModel } from "./MemoryStore";
import {
  buildOpponentModel,
  familyFromStyle,
  observeBoutResult,
  observeOpponentFamily,
} from "./OpponentModel";
import type { OpponentTacticModel } from "../ai/types";

/** Cap on learned models per oyakata; stalest entries are evicted. */
export const MAX_OPPONENT_MODELS = 40;

export interface BoutLearningCtx {
  match: MatchSchedule;
  result: BoutResult;
  east: Rikishi;
  west: Rikishi;
}

/**
 * Bound an opponentModels map to MAX_OPPONENT_MODELS by evicting the
 * stalest entries (lowest lastUpdated; id order breaks ties).
 */
function boundOpponentModels(
  models: Record<Id, OpponentTacticModel>
): Record<Id, OpponentTacticModel> {
  const keys = Object.keys(models);
  if (keys.length <= MAX_OPPONENT_MODELS) return models;
  const sorted = keys.sort((a, b) => {
    const diff = (models[a].lastUpdated ?? 0) - (models[b].lastUpdated ?? 0);
    return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
  });
  const evict = new Set(sorted.slice(0, keys.length - MAX_OPPONENT_MODELS));
  const next: Record<Id, OpponentTacticModel> = {};
  for (const key of keys) {
    if (!evict.has(key)) next[key] = models[key];
  }
  return next;
}

/**
 * Merge opponent-model updates for every NPC heya involved in the bout.
 * Called from applyBoutResult alongside the other onBoutResolved* hooks.
 */
export function onBoutResolvedOpponentModels(
  world: WorldState,
  ctx: BoutLearningCtx
): StateImpact {
  const builder = createImpactBuilder("opponentLearning");
  const { result, east, west } = ctx;

  if (result.kimarite === "fusensho") return builder.build();
  if (east.heyaId && east.heyaId === west.heyaId) return builder.build();

  const week = world.week ?? 0;
  const observations: [observer: Rikishi, observed: Rikishi, observedSide: "east" | "west"][] = [
    [east, west, "west"],
    [west, east, "east"],
  ];

  const processed = new Set<Id>();
  for (const [observer, observed, observedSide] of observations) {
    const heyaId = observer.heyaId;
    if (!heyaId || heyaId === world.playerHeyaId || processed.has(heyaId)) continue;
    processed.add(heyaId);

    const heya = world.heyas.get(heyaId);
    const oyakata = heya?.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
    if (!oyakata) continue;

    const memory = getMemory(oyakata, week);
    let model =
      getOpponentModel(memory, observed.id) ?? buildOpponentModel(observed, week);

    const observedWon = result.winner === observedSide;
    const resolvedTactic: BoutTactic | undefined = result.tactics?.[observedSide];
    if (observedWon) {
      model = observeBoutResult(model, observed.id, result.kimarite, week, resolvedTactic);
    } else {
      const family: TacticalFamily =
        (resolvedTactic && TACTIC_TO_FAMILY[resolvedTactic]) ||
        familyFromStyle(observed.style);
      model = observeOpponentFamily(model, observed.id, family, week, resolvedTactic);
    }

    const withModel = recordOpponentModel(memory, model);
    builder.updateOyakata(oyakata.id, {
      memory: { ...withModel, opponentModels: boundOpponentModels(withModel.opponentModels) },
    });
  }

  return builder.build();
}
