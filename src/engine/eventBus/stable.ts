import type { WorldState } from "../types/world";
import type { EventImportance, NarrativeContext } from "../types/events";
import type { Id } from "../types/common";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import { createRngForEvent } from "../eventHelpers";
import { logEngineEvent } from "../events";
import { enrichEventContext } from "./context";

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
  const enrichedCtx = enrichEventContext(world, { heyaId, ...ctx });
  const rng = createRngForEvent(world, `gov-${heyaId}-${ctx.incident}`);
  const titleRes = BardEngine.resolve(rng, "events.governance.title", enrichedCtx);
  const summaryRes = BardEngine.resolve(rng, "events.governance.summary", enrichedCtx);

  return logEngineEvent(world, {
    type: "GOVERNANCE_RULING",
    category: "discipline",
    importance,
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: enrichedCtx,
    tags: ["governance", "discipline"],
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
  ctx = enrichEventContext(world, { heyaId, ...ctx });
  const rng = createRngForEvent(world, `welfare-${heyaId}-${ctx.status}`);
  const titleRes = BardEngine.resolve(rng, "events.welfare.title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.welfare.summary", ctx);

  return logEngineEvent(world, {
    type: "WELFARE_COMPLIANCE",
    category: "welfare",
    importance: ctx.status === "sanctioned" ? "headline" : "major",
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["welfare", ctx.status as string],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = createRngForEvent(world, `mood-${heyaId}`);
  const titleRes = BardEngine.resolve(rng, "events.narrative.mood_shift_title", data);
  const summaryRes = BardEngine.resolve(rng, "events.narrative.mood_shift_summary", data);

  return logEngineEvent(world, {
    type: "OYAKATA_MOOD_SHIFT",
    category: "narrative",
    importance: "major",
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["narrative", "mood"],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = createRngForEvent(world, `mgmt-${heyaId}`);
  const titleRes = BardEngine.resolve(rng, "events.management.decision_title", data);
  const summaryRes = BardEngine.resolve(rng, "events.management.decision_summary", data);

  return logEngineEvent(world, {
    type: "NPC_MANAGER_DECISION",
    category: "training",
    importance,
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["management", "strategy"],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = createRngForEvent(world, `strategy-${heyaId}`);
  const titleRes = BardEngine.resolve(rng, "events.narrative.strategy_shift_title", data);
  const summaryRes = BardEngine.resolve(rng, "events.narrative.strategy_shift_summary", data);

  return logEngineEvent(world, {
    type: "NARRATIVE_STRATEGY_SHIFT",
    category: "narrative",
    importance: "major",
    scope: "world",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["narrative", "strategy"],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = rngFromSeed(`facility-${heyaId}-${type}`, "narrative", "event");
  const path = type === "UPGRADED" ? "events.facility.upgraded" : "events.facility.degraded";
  const titleRes = BardEngine.resolve(rng, `${path}_title`, data);
  const summaryRes = BardEngine.resolve(rng, `${path}_summary`, data);

  return logEngineEvent(world, {
    type: type === "UPGRADED" ? "FACILITY_UPGRADED" : "FACILITY_DEGRADED",
    category: "facility",
    importance: "notable",
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["facility", type.toLowerCase()],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = rngFromSeed(`roster-${heyaId}-${data.rikishiId}`, "narrative", "event");
  const titleRes = BardEngine.resolve(rng, "events.management.roster_overflow_title", data);
  const summaryRes = BardEngine.resolve(rng, "events.management.roster_overflow_summary", data);

  return logEngineEvent(world, {
    type: "ROSTER_OVERFLOW_RELEASE",
    category: "career",
    importance: "major",
    scope: "heya",
    heyaId,
    rikishiId: data.rikishiId as Id,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["roster", "release"],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = createRngForEvent(world, `prestige-${heyaId}`);
  const titleRes = BardEngine.resolve(rng, "events.narrative.prestige_title", data);
  const summaryRes = BardEngine.resolve(rng, "events.narrative.prestige_summary", data);

  return logEngineEvent(world, {
    type: "AWARD_CONFERRED",
    category: "milestone",
    importance: "notable",
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["prestige", "milestone"],
  });
}
