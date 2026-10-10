import type { WorldState } from "../types/world";
import type { NarrativeContext } from "../types/events";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import { createRngForEvent } from "../eventHelpers";
import { logEngineEvent } from "../events";
import { enrichEventContext } from "./context";

/**
 * Creates a basho status update event (e.g., start, end, day update).
 * @param world - Current world state
 * @param ctx - Narrative context containing status and day
 * @returns The logged engine event
 */
export function bashoStatus(world: WorldState, ctx: NarrativeContext) {
  ctx = enrichEventContext(world, ctx);
  const rng = rngFromSeed(`basho-status-${ctx.status}-${ctx.day}`, "narrative", "event");
  const titleRes = BardEngine.resolve(rng, "events.basho.status_title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.basho.status_summary", ctx);

  return logEngineEvent(world, {
    type: "BASHO_STATUS",
    category: "basho",
    importance:
      ctx.status === "started" || ctx.status === "ended" || ctx.day === 15 ? "headline" : "notable",
    phase: "basho_day",
    scope: "world",
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["basho", ctx.status as string],
  });
}

/**
 * Creates a bout resolution event.
 * @param world - Current world state
 * @param data - Narrative context containing bout results (winner, loser, day, etc.)
 * @returns The logged engine event
 */
export function boutResolved(world: WorldState, data: NarrativeContext) {
  const rng = rngFromSeed(
    `bout-resolved-${data.winnerRikishiId}-${data.loserRikishiId}-${data.day}`,
    "narrative",
    "event"
  );
  data = {
    ...enrichEventContext(world, data),
    winnerId: data.winnerRikishiId,
    loserId: data.loserRikishiId,
  };
  const titleRes = BardEngine.resolve(rng, "events.basho.bout_title", data);
  const summaryRes = BardEngine.resolve(rng, "events.basho.bout_summary", data);

  return logEngineEvent(world, {
    type: "BOUT_RESOLVED",
    category: "basho",
    importance: data.upset || data.isKinboshi ? "headline" : "notable",
    phase: "basho_day",
    scope: "world",
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["basho", "bout", "pbp"],
  });
}

/**
 * Creates an award conferral event.
 * @param world - Current world state
 * @param ctx - Narrative context containing rikishi and award details
 * @returns The logged engine event
 */
export function awardConferred(world: WorldState, ctx: NarrativeContext) {
  ctx = enrichEventContext(world, ctx);
  const rng = createRngForEvent(world, `award-${ctx.rikishiId}-${ctx.status}`);
  const titleRes = BardEngine.resolve(rng, "events.awards.title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.awards.summary", ctx);

  return logEngineEvent(world, {
    type: "AWARD_CONFERRED",
    category: "basho",
    importance: "headline",
    phase: "basho_wrap",
    scope: "rikishi",
    rikishiId: ctx.rikishiId,
    heyaId: ctx.heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["basho", "award"],
  });
}

/**
 * Creates an event for a rivalry heat spike.
 * @param world - Current world state
 * @param data - Narrative context containing rivalry details
 * @returns The logged engine event
 */
export function rivalryHeatSpike(world: WorldState, data: NarrativeContext) {
  const rng = createRngForEvent(world, `rivalry-heat-${data.winner}-${data.loser}`);
  const enrichedData = {
    ...enrichEventContext(world, data),
    winnerId: data.winnerId || data.winnerRikishiId,
    loserId: data.loserId || data.loserRikishiId,
  };
  const res = BardEngine.resolve(rng, "events.rivalry.press_rumors", enrichedData);
  const titleRes = BardEngine.resolve(rng, "events.rivalry.title", enrichedData);

  return logEngineEvent(world, {
    type: "RIVALRY_HEAT_SPIKE",
    category: "rivalry",
    importance: (data.heat as number) > 75 ? "major" : "notable",
    scope: "world",
    title: titleRes.text,
    summary: res.text,
    data: enrichedData,
    tags: ["rivalry", "hype"],
  });
}
