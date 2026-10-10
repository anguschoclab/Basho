import type { WorldState } from "../types/world";
import type { EventImportance, NarrativeContext } from "../types/events";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import { createRngForEvent } from "../eventHelpers";
import { logEngineEvent } from "../events";
import { enrichEventContext } from "./context";

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
  ctx = enrichEventContext(world, ctx);
  const rng = createRngForEvent(world, `medical-${ctx.rikishiId}-${ctx.status}`);
  const titleRes = BardEngine.resolve(rng, "events.medical.title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.medical.summary", ctx);

  return logEngineEvent(world, {
    type: "MEDICAL_REPORT",
    category: "injury",
    importance,
    scope: "rikishi",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["medical", ctx.status as string],
  });
}

/**
 * Creates a lifecycle event (e.g., retirement) for a rikishi.
 * @param world - Current world state
 * @param ctx - Narrative context containing rikishi and status details
 * @returns The logged engine event
 */
export function lifecycleEvent(world: WorldState, ctx: NarrativeContext) {
  ctx = enrichEventContext(world, ctx);
  const rng = createRngForEvent(world, `lifecycle-${ctx.rikishiId}-${ctx.status}`);
  const titleRes = BardEngine.resolve(rng, "events.lifecycle.title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.lifecycle.summary", ctx);

  return logEngineEvent(world, {
    type: "LIFECYCLE_EVENT",
    category: "career",
    importance: ctx.status === "retirement" ? "major" : "notable",
    scope: "rikishi",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["career", ctx.status as string],
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
  data = enrichEventContext(world, data);
  const rng = rngFromSeed(
    `lifecycle-${type}-${data.rikishiId || data.heyaId}`,
    "narrative",
    "event"
  );
  const titleRes = BardEngine.resolve(rng, `events.lifecycle.${type}_title`, data);
  const summaryRes = BardEngine.resolve(rng, `events.lifecycle.${type}_summary`, data);

  return logEngineEvent(world, {
    type: "LIFECYCLE_EVENT",
    category: "career",
    importance: "major",
    scope: data.rikishiId ? "rikishi" : "heya",
    rikishiId: data.rikishiId,
    heyaId: data.heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["lifecycle", type],
  });
}
