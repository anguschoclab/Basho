import type { WorldState } from "@/engine/types/world";
import type { EventImportance, NarrativeContext } from "@/engine/types/events";
import {logBardEvent} from "@/engine/events/helpers";

/**
 * Creates a medical report event for a rikishi.
 * @param world - Current world state
 * @param ctx - Narrative context containing rikishiId and status
 * @param importance - Importance level of the event
 * @returns The logged engine event
 */
export function medicalReportBase(
  world: WorldState,
  ctx: NarrativeContext,
  importance: EventImportance
) {
    return logBardEvent(world, {
    salt: `medical-${ctx.rikishiId}-${ctx.status}`,
    ctx: ctx,
    titlePath: "events.medical.title",
    summaryPath: "events.medical.summary",
    event: {
    type: "MEDICAL_REPORT",
    category: "injury",
    importance,
    scope: "rikishi",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    tags: ["medical", ctx.status as string]},
  });
}

/**
 * Creates a lifecycle event (e.g., retirement) for a rikishi.
 * @param world - Current world state
 * @param ctx - Narrative context containing rikishi and status details
 * @returns The logged engine event
 */
export function lifecycleEvent(world: WorldState, ctx: NarrativeContext) {
    return logBardEvent(world, {
    salt: `lifecycle-${ctx.rikishiId}-${ctx.status}`,
    ctx: ctx,
    titlePath: "events.lifecycle.title",
    summaryPath: "events.lifecycle.summary",
    event: {
    type: "LIFECYCLE_EVENT",
    category: "career",
    importance: ctx.status === "retirement" ? "major" : "notable",
    scope: "rikishi",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    tags: ["career", ctx.status as string]},
  });
}

/**
 * Creates an event for a lifecycle action (naturalization or merger).
 * @param world - Current world state
 * @param data - Narrative context containing entity details
 * @param type - Type of action ("naturalization" or "merger")
 * @returns The logged engine event
 */
export function lifecycleAction(
  world: WorldState,
  data: NarrativeContext,
  type: "naturalization" | "merger"
) {
  return logBardEvent(world, {
    salt: `lifecycle-${type}-${data.rikishiId || data.heyaId}`,
    ctx: data,
    titlePath: `events.lifecycle.${type}_title`,
    summaryPath: `events.lifecycle.${type}_summary`,
    event: {
      type: "LIFECYCLE_EVENT",
      category: "career",
      importance: "major",
      scope: data.rikishiId ? "rikishi" : "heya",
      rikishiId: data.rikishiId,
      heyaId: data.heyaId,
      tags: ["lifecycle", type],
    },
  });
}
