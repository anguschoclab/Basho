/**
 * contextBuilder.ts
 * =================
 * Assembles the AIContext object consumed by StrategicPlanner, TacticalCoordinator,
 * and other advanced AI modules. Keeps the construction logic in one place so
 * callers (e.g. weekly NPC AI phase) do not duplicate it.
 *
 * Callers pass the already persona-hydrated oyakata — memory consolidation
 * happens upstream so quirks/flags are visible to it.
 */

import type { Id } from "@/engine/types/common";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";
import type { AIContext, LeaguePerception } from "@/engine/npc/types";
import type { PerceptionSnapshot } from "@/engine/npc/perception";
import { buildPerceptionSnapshot } from "@/engine/npc/perception";
import { buildLeaguePerception } from "@/engine/npc/LeaguePerception";

/** Build an AI context for a single heya, optionally reusing precomputed views. */
export function buildAIContext(
  world: WorldState,
  heyaId: Id,
  oyakata?: Oyakata,
  leaguePerception?: LeaguePerception,
  perception?: PerceptionSnapshot
): AIContext {
  return {
    world,
    heyaId,
    oyakata: oyakata
      ? {
          id: oyakata.id,
          archetype: oyakata.archetype,
          traits: oyakata.traits,
          mood: oyakata.mood,
          grudges: oyakata.grudges,
        }
      : undefined,
    perception: perception ?? buildPerceptionSnapshot(world, heyaId),
    leaguePerception: leaguePerception ?? buildLeaguePerception(world),
    memory: oyakata?.memory,
  };
}
