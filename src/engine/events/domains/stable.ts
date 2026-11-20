import type { WorldState } from "@/engine/types/world";
import type { EventImportance, NarrativeContext } from "@/engine/types/events";
import type { Id } from "@/engine/types/common";
import { logBardEvent } from "@/engine/events/helpers";

/**
 * Creates a governance ruling event for a heya.
 * @param world - Current world state
 * @param heyaId - ID of the heya involved
 * @param ctx - Narrative context containing incident details
 * @param importance - Importance level (defaults to "major")
 * @returns The logged engine event
 */
export function governanceRuling(
  world: WorldState,
  heyaId: Id,
  ctx: NarrativeContext,
  importance: EventImportance = "major"
) {
  return logBardEvent(world, {
    salt: `gov-${heyaId}-${ctx.incident}`,
    ctx: { heyaId, ...ctx },
    titlePath: "events.governance.title",
    summaryPath: "events.governance.summary",
    event: {
      type: "GOVERNANCE_RULING",
      category: "discipline",
      importance,
      scope: "heya",
      heyaId,
      tags: ["governance", "discipline"],
    },
  });
}

/**
 * Creates a welfare compliance event.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param ctx - Narrative context containing compliance status
 * @returns The logged engine event
 */
export function welfareCompliance(world: WorldState, heyaId: Id, ctx: NarrativeContext) {
  return logBardEvent(world, {
    salt: `welfare-${heyaId}-${ctx.status}`,
    ctx: { heyaId, ...ctx },
    titlePath: "events.welfare.title",
    summaryPath: "events.welfare.summary",
    event: {
      type: "WELFARE_COMPLIANCE",
      category: "welfare",
      importance: ctx.status === "sanctioned" ? "headline" : "major",
      scope: "heya",
      heyaId,
      tags: ["welfare", ctx.status as string],
    },
  });
}

/**
 * Creates an event for an oyakata's mood shift.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing mood details
 * @returns The logged engine event
 */
export function oyakataMoodShift(world: WorldState, heyaId: Id, data: NarrativeContext) {
  return logBardEvent(world, {
    salt: `mood-${heyaId}`,
    ctx: { heyaId, ...data },
    titlePath: "events.narrative.mood_shift_title",
    summaryPath: "events.narrative.mood_shift_summary",
    event: {
      type: "OYAKATA_MOOD_SHIFT",
      category: "narrative",
      importance: "major",
      scope: "heya",
      heyaId,
      tags: ["narrative", "mood"],
    },
  });
}

/**
 * Creates an event for a management decision.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing decision details
 * @param importance - Importance level (defaults to "minor")
 * @returns The logged engine event
 */
export function managementDecision(
  world: WorldState,
  heyaId: Id,
  data: NarrativeContext,
  importance: EventImportance = "minor"
) {
  return logBardEvent(world, {
    salt: `mgmt-${heyaId}`,
    ctx: { heyaId, ...data },
    titlePath: "events.management.decision_title",
    summaryPath: "events.management.decision_summary",
    event: {
      type: "NPC_MANAGER_DECISION",
      category: "training",
      importance,
      scope: "heya",
      heyaId,
      tags: ["management", "strategy"],
    },
  });
}

/**
 * Creates an event for a narrative strategy shift.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing strategy details
 * @returns The logged engine event
 */
export function strategyShift(world: WorldState, heyaId: Id, data: NarrativeContext) {
  return logBardEvent(world, {
    salt: `strategy-${heyaId}`,
    ctx: { heyaId, ...data },
    titlePath: "events.narrative.strategy_shift_title",
    summaryPath: "events.narrative.strategy_shift_summary",
    event: {
      type: "NARRATIVE_STRATEGY_SHIFT",
      category: "narrative",
      importance: "major",
      scope: "world",
      heyaId,
      tags: ["narrative", "strategy"],
    },
  });
}

/**
 * Creates an event for a facility update (upgrade/degrade).
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing facility details
 * @param type - Type of update ("UPGRADED" or "DEGRADED")
 * @returns The logged engine event
 */
export function facilityUpdate(
  world: WorldState,
  heyaId: Id,
  data: NarrativeContext,
  type: "UPGRADED" | "DEGRADED"
) {
  const path = type === "UPGRADED" ? "events.facility.upgraded" : "events.facility.degraded";

  return logBardEvent(world, {
    salt: `facility-${heyaId}-${type}`,
    ctx: { heyaId, ...data },
    titlePath: `${path}_title`,
    summaryPath: `${path}_summary`,
    event: {
      type: type === "UPGRADED" ? "FACILITY_UPGRADED" : "FACILITY_DEGRADED",
      category: "facility",
      importance: "notable",
      scope: "heya",
      heyaId,
      tags: ["facility", type.toLowerCase()],
    },
  });
}

/**
 * Creates an event for a roster change (e.g., release).
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing rikishi details
 * @returns The logged engine event
 */
export function rosterEvent(world: WorldState, heyaId: Id, data: NarrativeContext) {
  return logBardEvent(world, {
    salt: `roster-${heyaId}-${data.rikishiId}`,
    ctx: { heyaId, ...data },
    titlePath: "events.management.roster_overflow_title",
    summaryPath: "events.management.roster_overflow_summary",
    event: {
      type: "ROSTER_OVERFLOW_RELEASE",
      category: "career",
      importance: "major",
      scope: "heya",
      heyaId,
      rikishiId: data.rikishiId as Id,
      tags: ["roster", "release"],
    },
  });
}

/**
 * Creates an event for a prestige milestone.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing prestige details
 * @returns The logged engine event
 */
export function prestigeEvent(world: WorldState, heyaId: Id, data: NarrativeContext) {
  return logBardEvent(world, {
    salt: `prestige-${heyaId}`,
    ctx: { heyaId, ...data },
    titlePath: "events.narrative.prestige_title",
    summaryPath: "events.narrative.prestige_summary",
    event: {
      type: "AWARD_CONFERRED",
      category: "milestone",
      importance: "notable",
      scope: "heya",
      heyaId,
      tags: ["prestige", "milestone"],
    },
  });
}
