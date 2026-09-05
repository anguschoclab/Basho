/**
 * npcAgentProjections.ts — surfaces NPC manager decisions from the event log.
 *
 * NPC oyakata (rival stable masters) make decisions that are logged as
 * NPC_MANAGER_DECISION events. This projection extracts recent decisions
 * for UI display, giving the player visibility into rival strategies.
 */
import type { WorldState } from "../engine/types/world";

export interface NPCDecisionDTO {
  heyaId: string;
  heyaName: string;
  category: string;
  decision: string;
  reasoning: string;
  week: number;
}

export interface NPCAgentProjection {
  decisions: NPCDecisionDTO[];
  hasRecentActivity: boolean;
  decisionsByHeya: Record<string, number>;
}

const MAX_DECISIONS = 20;

export function projectNPCAgentActivity(world: WorldState): NPCAgentProjection {
  const log = world.events?.log ?? [];
  const npcDecisions = log
    .filter(
      (e: { type: string; data: Record<string, unknown> }) =>
        e.type === "NPC_MANAGER_DECISION"
    )
    .slice(-MAX_DECISIONS)
    .reverse()
    .map((e: { data: Record<string, unknown>; week?: number }) => {
      const data = e.data ?? {};
      const heyaId = String(data.heyaId ?? "");
      const heya = world.heyas.get(heyaId);
      return {
        heyaId,
        heyaName: heya?.name ?? String(data.heyaName ?? "Unknown"),
        category: String(data.category ?? "general"),
        decision: String(data.decision ?? data.action ?? ""),
        reasoning: String(data.reasoning ?? data.reason ?? ""),
        week: Number(e.week ?? data.week ?? 0),
      };
    });

  const decisionsByHeya: Record<string, number> = {};
  for (const d of npcDecisions) {
    decisionsByHeya[d.heyaId] = (decisionsByHeya[d.heyaId] ?? 0) + 1;
  }

  return {
    decisions: npcDecisions,
    hasRecentActivity: npcDecisions.length > 0,
    decisionsByHeya,
  };
}
