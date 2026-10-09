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
  importance?: string;
  heyaId?: string;
  data?: Record<string, unknown>;
};

interface SurfacedRow {
  category: string;
  decision: string;
  reasoning: string;
  planId?: string;
}

/** NPC_MANAGER_DECISION rows — recruitment, sponsorship, meta, training. */
function surfaceManagerDecision(data: Record<string, unknown>): SurfacedRow {
  if (data.strategy === "recruitment_bidding") {
    // WS7 — foreign signings (and dual-citizen exemptions) are distinct
    // feed items per the §5.3–5.4 slot-policy contract.
    if (data.isForeign === true || data.dualCitizen === true) {
      return {
        category: "foreign_signing",
        decision: `Signed foreign recruit ${String(data.candidateName ?? "unknown")}${
          data.dualCitizen === true ? " (dual citizen — slot exempt)" : ""
        }`,
        reasoning: "",
      };
    }
    return {
      category: "recruitment",
      decision: `Bid on recruit ${String(data.candidateName ?? "unknown")}`,
      reasoning: "",
    };
  }
  if (data.action === "sponsor_recruited") {
    return {
      category: "sponsorship",
      decision: `Recruited sponsor ${String(data.sponsor ?? "")}`.trim(),
      reasoning: String(data.reasoning ?? ""),
    };
  }
  if (data.strategy === "rebuild") {
    return { category: "strategy", decision: "Shifted to a rebuild posture", reasoning: "" };
  }
  if (data.domain === "meta_adaptation") {
    return {
      category: "meta",
      decision: String(data.decision ?? "Adapted to the shifting meta"),
      reasoning: String(data.reasoning ?? ""),
    };
  }
  if (data.intensity !== undefined) {
    return {
      category: "training",
      decision: `Set ${String(data.intensity)} training${
        data.focus ? `, focus ${String(data.focus)}` : ""
      }`,
      reasoning: String(data.reasoning ?? ""),
    };
  }
  return {
    category: String(data.category ?? "general"),
    decision: String(data.decision ?? data.action ?? "Management decision"),
    reasoning: String(data.reasoning ?? data.reason ?? ""),
  };
}

/** GOVERNANCE_RULING rows — faction postures, appeals, succession events. */
function surfaceGovernanceRuling(data: Record<string, unknown>): SurfacedRow | null {
  switch (data.incident) {
    case "faction_posture":
      return {
        category: "faction",
        decision: String(
          data.reason ?? `The ${String(data.faction ?? "ichimon")} shifts to ${String(data.posture)}`
        ),
        reasoning: "",
      };
    case "faction_appeal":
      return {
        category: "rescue",
        decision: "Appealed to its ichimon for emergency support",
        reasoning: String(data.reason ?? ""),
      };
    case "forced_succession":
      return {
        category: "succession",
        decision: String(data.reason ?? "Forced succession"),
        reasoning: "",
      };
    case "succession_readiness_update":
      // Only surface real warnings — the yearly info-level tick is noise.
      if (data.status !== "warning") return null;
      return {
        category: "succession",
        decision: String(data.reason ?? "Succession readiness updated"),
        reasoning: "",
      };
    default:
      return null;
  }
}

/** LIFECYCLE_EVENT rows — oyakata promotion, rikishi request outcomes. */
function surfaceLifecycle(data: Record<string, unknown>): SurfacedRow | null {
  if (data.status === "oyakata_promotion") {
    return {
      category: "succession",
      decision: String(data.reason ?? "A new oyakata takes command"),
      reasoning: String(data.incident ?? ""),
    };
  }
  if (data.status === "request_granted" || data.status === "request_denied") {
    return {
      category: "rikishi_agency",
      decision: `Rikishi request ${data.status === "request_granted" ? "granted" : "denied"}: ${String(
        data.requestType ?? "unknown"
      )}`,
      reasoning: "",
    };
  }
  return null;
}

/** FINANCIAL_ALERT rows — loans and emergency fundraising as rescue signals. */
function surfaceFinancialAlert(data: Record<string, unknown>): SurfacedRow | null {
  if (data.incident === "loan_issued") {
    return {
      category: "rescue",
      decision: `Took an emergency loan${data.money ? ` (¥${Number(data.money).toLocaleString()})` : ""}`,
      reasoning: "",
    };
  }
  if (data.incident === "emergency_sponsor_drive") {
    return {
      category: "rescue",
      decision: "Emergency supporter drive raised stopgap funds",
      reasoning: "",
    };
  }
  return null;
}

/** Map an event to a feed row, or null when it isn't an NPC-AI surface. */
function surfaceEvent(e: LogEvent): SurfacedRow | null {
  const data = e.data ?? {};
  switch (e.type) {
    case "NPC_MANAGER_DECISION":
      return surfaceManagerDecision(data);
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
      if (data.vendetta === true) {
        return {
          category: "vendetta",
          decision: `Personal vendetta escalates the rivalry${
            data.rivalHeyaId ? ` vs ${String(data.rivalHeyaId)}` : ""
          }`,
          reasoning: "",
        };
      }
      return {
        category: "rivalry",
        decision: `Rival posture: ${String(data.posture ?? "unknown")}${
          data.rivalHeyaId ? ` vs ${String(data.rivalHeyaId)}` : ""
        }`,
        reasoning: "",
      };
    case "GOVERNANCE_RULING":
      return surfaceGovernanceRuling(data);
    case "LIFECYCLE_EVENT":
      return surfaceLifecycle(data);
    case "WELFARE_COMPLIANCE":
      if (data.status !== "stable_unrest") return null;
      return {
        category: "rikishi_agency",
        decision: "Stable unrest after ignored rikishi requests",
        reasoning: "",
      };
    case "FINANCIAL_ALERT":
      return surfaceFinancialAlert(data);
    case "MANAGEMENT_DECISION":
      // Weekly training directives — only surface the strategically
      // interesting ones (punishing/conservative shifts), not routine weeks.
      if (e.importance !== "notable" && e.importance !== "major" && e.importance !== "headline") {
        return null;
      }
      return {
        category: "training",
        decision: `Training shift: ${String(data.intensity ?? "unknown")}${
          data.focus ? ` · focus ${String(data.focus)}` : ""
        }`,
        reasoning: String(data.reasoningLog ?? ""),
      };
    case "MEDIA_RESPONSE":
      return {
        category: "media",
        decision: `Media response: ${String(data.response ?? "unknown")}`,
        reasoning: "",
      };
    case "WORLD_META_EVOLUTION":
      // League-level era headline — unattributed (no heyaId); the row renders
      // under a "Kyokai" attribution via the projection's fallback.
      return {
        category: "meta",
        decision: String(data.incident ?? "The era's dominant style has shifted"),
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
      const heyaId = String(data.heyaId ?? e.heyaId ?? "");
      const heya = world.heyas.get(heyaId);
      return {
        heyaId,
        // Unattributed league-level rows (e.g. WORLD_META_EVOLUTION) are
        // credited to the association, not a fabricated stable.
        heyaName: heya?.name ?? String(data.heyaName ?? (heyaId ? "Unknown" : "Kyokai")),
        category: row.category,
        decision: row.decision,
        reasoning: row.reasoning,
        week: Number(e.week ?? data.week ?? 0),
        planId: row.planId,
      };
    });

  // The feed is "rival oyakata activity" — shared event types (FINANCIAL_ALERT,
  // GOVERNANCE_RULING, LIFECYCLE_EVENT) also fire for the player's stable.
  const filtered = npcDecisions.filter(
    (d) => !world.playerHeyaId || d.heyaId !== world.playerHeyaId
  );

  const decisionsByHeya: Record<string, number> = {};
  for (const d of filtered) {
    decisionsByHeya[d.heyaId] = (decisionsByHeya[d.heyaId] ?? 0) + 1;
  }

  return {
    decisions: filtered,
    hasRecentActivity: filtered.length > 0,
    decisionsByHeya,
  };
}
