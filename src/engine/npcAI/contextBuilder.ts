/**
 * contextBuilder.ts
 * =================
 * Assembles the AIContext object consumed by StrategicPlanner, TacticalCoordinator,
 * and other advanced AI modules. Keeps the construction logic in one place so
 * callers (e.g. weekly NPC AI phase) do not duplicate it.
 */

import type { Id } from "../types/common";
import type { WorldState } from "../types/world";
import type { Oyakata } from "../types/oyakata";
import type { AIContext } from "../ai/types";
import { buildPerceptionSnapshot } from "../perception";
import { buildLeaguePerception } from "../npcAI/LeaguePerception";
import { consolidateOyakataMemoryPure } from "../tick/phases/npc_ai/memory";

/** Build an AI context for a single heya, optionally reusing a precomputed league view. */
export function buildAIContext(
  world: WorldState,
  heyaId: Id,
  oyakataId?: Id,
  leaguePerception?: ReturnType<typeof buildLeaguePerception>
): AIContext {
  const perception = buildPerceptionSnapshot(world, heyaId);
  const league = leaguePerception ?? buildLeaguePerception(world);

  const rawOyakata: Oyakata | undefined = oyakataId
    ? world.oyakata.get(oyakataId)
    : undefined;

  const memory = rawOyakata
    ? consolidateOyakataMemoryPure(world, rawOyakata, perception)
    : undefined;

  return {
    world,
    heyaId,
    oyakata: rawOyakata
      ? {
          id: rawOyakata.id,
          archetype: rawOyakata.archetype,
          traits: rawOyakata.traits,
          mood: rawOyakata.mood,
        }
      : undefined,
    perception,
    leaguePerception: league,
    memory,
  };
}
