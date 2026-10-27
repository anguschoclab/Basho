/**
 * advisorProjections.ts — presenter-facing wrapper around the advisor engine.
 *
 * Pages consume advisor output through this module rather than importing
 * engine services directly.
 */
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { AIRecommendation } from "@/engine/npc/types";
import { generateRecommendations } from "@/engine/npc/advisor/AdvisorService";

/** Recommendations for the player heya, sorted by priority. */
export function projectAdvisorRecommendations(
  world: WorldState,
  playerHeyaId?: Id
): AIRecommendation[] {
  return generateRecommendations(world, playerHeyaId);
}
