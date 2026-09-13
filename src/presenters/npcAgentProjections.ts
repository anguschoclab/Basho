/**
 * npcAgentProjections.ts — surfaces NPC manager decisions from the event log.
 *
 * NPC oyakata (rival stable masters) make decisions that are logged as
 * NPC_MANAGER_DECISION events. This projection extracts recent decisions
 * for UI display, giving the player visibility into rival strategies.
 *
 * WS6: also surfaces plan shifts (ai_plan_change), crisis responses,
 * rival postures, and NPC media responses.
 */
import type { WorldState } from "../engine/types/world";

export interface NPCDecisionDTO {
  heyaId: string;
  heyaName: string;
  category: string;
  decision: string;
  reasoning: string;
  week: number;
  /** Strategic plan associated with the entry, when applicable. */
  planId?: string;
}

export interface NPCAgentProjection {
  decisions: NPCDecisionDTO[];
  hasRecentActivity: boolean;
  decisionsByHeya: Record<string, number>;
}

const MAX_DECISIONS = 20;

type LogEvent = {
  type: string;
  category?: string;
  week?: number;
  data?: Record<string, unknown>;
};

interface SurfacedRow {
  category: string;
  decision: string;
  reasoning: string;
  planId?: string;
}

/** Map an event to a feed row, or null when it isn't an NPC-AI surface. */
function surfaceEvent(e: LogEvent): SurfacedRow | null {
  const data = e.data ?? {};
  switch (e.type) {
    case "NPC_MANAGER_DECISION":
      return {
        category: String(data.category ?? "general"),
        decision: String(data.decision ?? data.action ?? ""),
        reasoning: String(data.reasoning ?? data.reason ?? ""),
      };
    case "STRATEGY_SHIFT":
      if (e.category !== "ai_plan_change") return null;
      return {
        category: "plan_shift",
        decision: data.planId
          ? `New strategic plan: ${String(data.planId)}`
          : `Strategy shift: ${String(data.intensity ?? "unknown")}`,
        reasoning: String(data.reasoning ?? ""),
        planId: data.planId ? String(data.planId) : undefined,
      };
    case "CRISIS_RESPONSE":
      return {
        category: "crisis",
        decision: `Crisis response: ${String(data.choiceId ?? "unknown")}`,
        reasoning: "",
      };
    case "RIVAL_POSTURE":
      return {
        category: "rivalry",
        decision: `Rival posture: ${String(data.posture ?? "unknown")}${
          data.rivalHeyaId ? ` vs ${String(data.rivalHeyaId)}` : ""
        }`,
        reasoning: "",
      };
    case "MEDIA_RESPONSE":
      return {
        category: "media",
        decision: `Media response: ${String(data.response ?? "unknown")}`,
        reasoning: "",
      };
    default:
      return null;
  }
}

export function projectNPCAgentActivity(world: WorldState): NPCAgentProjection {
  const log = world.events?.log ?? [];
  const npcDecisions = (log as LogEvent[])
    .map((e) => ({ e, row: surfaceEvent(e) }))
    .filter((x): x is { e: LogEvent; row: SurfacedRow } => x.row !== null)
    .slice(-MAX_DECISIONS)
    .reverse()
    .map(({ e, row }) => {
      const data = e.data ?? {};
      const heyaId = String(data.heyaId ?? "");
      const heya = world.heyas.get(heyaId);
      return {
        heyaId,
        heyaName: heya?.name ?? String(data.heyaName ?? "Unknown"),
        category: row.category,
        decision: row.decision,
        reasoning: row.reasoning,
        week: Number(e.week ?? data.week ?? 0),
        planId: row.planId,
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
