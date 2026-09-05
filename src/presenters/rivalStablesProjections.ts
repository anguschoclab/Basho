/**
 * rivalStablesProjections.ts — projects rival stable data for UI.
 *
 * Avoids direct world.heyas access from pages by wrapping it in a presenter.
 */
import type { WorldState } from "../engine/types/world";
import type { NPCDecisionDTO } from "./npcAgentProjections";

export interface RivalStableDTO {
  heyaId: string;
  heyaName: string;
  ichimon?: string;
  legacyTier?: string;
  decisionCount: number;
  recentDecisions: NPCDecisionDTO[];
}

export interface RivalStablesProjection {
  rivals: RivalStableDTO[];
  hasRivals: boolean;
}

export function projectRivalStables(
  world: WorldState,
  npcDecisions: NPCDecisionDTO[],
  decisionsByHeya: Record<string, number>
): RivalStablesProjection {
  const rivals: RivalStableDTO[] = [];

  for (const heya of world.heyas.values()) {
    if (heya.id === world.playerHeyaId || heya.isPlayer) continue;
    const recentDecisions = npcDecisions.filter((d) => d.heyaId === heya.id);
    rivals.push({
      heyaId: heya.id,
      heyaName: heya.name,
      ichimon: heya.ichimon,
      legacyTier: heya.legacyTier,
      decisionCount: decisionsByHeya[heya.id] ?? 0,
      recentDecisions,
    });
  }

  return {
    rivals,
    hasRivals: rivals.length > 0,
  };
}
