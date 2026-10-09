import type { WorldState } from "../types/world";
import type { NarrativeContext } from "../types/events";
import { BardEngine } from "../bard/BardEngine";
import { createRngForEvent } from "../eventHelpers";
import { logEngineEvent } from "../events";
import { enrichEventContext } from "./context";

/**
 * Creates a training update event.
 * @param world - Current world state
 * @param ctx - Narrative context containing training details
 * @returns The logged engine event
 */
export function trainingUpdate(world: WorldState, ctx: NarrativeContext) {
  ctx = enrichEventContext(world, ctx);
  const rng = createRngForEvent(world, `training-${ctx.rikishiId}`);
  const titleRes = BardEngine.resolve(rng, "events.training.title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.training.summary", ctx);

  return logEngineEvent(world, {
    type: "TRAINING_UPDATE",
    category: "training",
    importance: "notable",
    scope: ctx.rikishiId ? "rikishi" : "heya",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["training"],
  });
}

/**
 * Creates an event when a new recruit is discovered.
 * @param world - Current world state
 * @param data - Narrative context containing recruit details
 * @returns The logged engine event
 */
export function recruitDiscovered(world: WorldState, data: NarrativeContext) {
  data = enrichEventContext(world, data);
  const rng = createRngForEvent(world, `recruit-${data.rikishiId}`);
  const res = BardEngine.resolve(rng, "events.recruiting.scouting_reports", data);
  const titleRes = BardEngine.resolve(rng, "events.recruiting.title", data);

  return logEngineEvent(world, {
    type: "RECRUIT_DISCOVERED",
    category: "scouting",
    importance: "notable",
    scope: "world",
    rikishiId: data.rikishiId,
    title: titleRes.text,
    summary: res.text,
    data,
    tags: ["scouting", "recruitment"],
  });
}
