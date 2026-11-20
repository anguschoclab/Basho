import type { WorldState } from "@/engine/types/world";
import type { NarrativeContext } from "@/engine/types/events";
import {logBardEvent} from "@/engine/events/helpers";

/**
 * Creates a training update event.
 * @param world - Current world state
 * @param ctx - Narrative context containing training details
 * @returns The logged engine event
 */
export function trainingUpdate(world: WorldState, ctx: NarrativeContext) {
    return logBardEvent(world, {
    salt: `training-${ctx.rikishiId}`,
    ctx: ctx,
    titlePath: "events.training.title",
    summaryPath: "events.training.summary",
    event: {
    type: "TRAINING_UPDATE",
    category: "training",
    importance: "notable",
    scope: ctx.rikishiId ? "rikishi" : "heya",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    tags: ["training"]},
  });
}

/**
 * Creates an event when a new recruit is discovered.
 * @param world - Current world state
 * @param data - Narrative context containing recruit details
 * @returns The logged engine event
 */
export function recruitDiscovered(world: WorldState, data: NarrativeContext) {
    return logBardEvent(world, {
    salt: `recruit-${data.rikishiId}`,
    ctx: data,
    titlePath: "events.recruiting.title",
    summaryPath: "events.recruiting.scouting_reports",
    summaryFirst: true,
    event: {
    type: "RECRUIT_DISCOVERED",
    category: "scouting",
    importance: "notable",
    scope: "world",
    rikishiId: data.rikishiId,
    tags: ["scouting", "recruitment"]},
  });
}
