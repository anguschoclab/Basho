import type { WorldState } from "@/engine/types/world";
import type { NarrativeContext } from "@/engine/types/events";
import { logBardEvent } from "@/engine/events/helpers";

/**
 * Creates a basho status update event (e.g., start, end, day update).
 * @param world - Current world state
 * @param ctx - Narrative context containing status and day
 * @returns The logged engine event
 */
export function bashoStatus(world: WorldState, ctx: NarrativeContext) {
  return logBardEvent(world, {
    salt: `basho-status-${ctx.status}-${ctx.day}`,
    ctx: ctx,
    titlePath: "events.basho.status_title",
    summaryPath: "events.basho.status_summary",
    event: {
      type: "BASHO_STATUS",
      category: "basho",
      importance:
        ctx.status === "started" || ctx.status === "ended" || ctx.day === 15
          ? "headline"
          : "notable",
      phase: "basho_day",
      scope: "world",
      tags: ["basho", ctx.status as string],
    },
  });
}

/**
 * Creates a bout resolution event.
 * @param world - Current world state
 * @param data - Narrative context containing bout results (winner, loser, day, etc.)
 * @returns The logged engine event
 */
export function boutResolved(world: WorldState, data: NarrativeContext) {
  const rngKey = data.isDraw
    ? `bout-resolved-draw-${data.eastRikishiId}-${data.westRikishiId}-${data.day}`
    : `bout-resolved-${data.winnerRikishiId}-${data.loserRikishiId}-${data.day}`;

  return logBardEvent(world, {
    salt: rngKey,
    ctx: data,
    extraData: { winnerId: data.winnerRikishiId, loserId: data.loserRikishiId },
    titlePath: "events.basho.bout_title",
    summaryPath: "events.basho.bout_summary",
    event: {
      type: "BOUT_RESOLVED",
      category: "basho",
      importance: data.upset || data.isKinboshi ? "headline" : "notable",
      phase: "basho_day",
      scope: "world",
      tags: ["basho", "bout", "pbp"],
    },
  });
}

/**
 * Creates an award conferral event.
 * @param world - Current world state
 * @param ctx - Narrative context containing rikishi and award details
 * @returns The logged engine event
 */
export function awardConferred(world: WorldState, ctx: NarrativeContext) {
  return logBardEvent(world, {
    salt: `award-${ctx.rikishiId}-${ctx.status}`,
    ctx: ctx,
    titlePath: "events.awards.title",
    summaryPath: "events.awards.summary",
    event: {
      type: "AWARD_CONFERRED",
      category: "basho",
      importance: "headline",
      phase: "basho_wrap",
      scope: "rikishi",
      rikishiId: ctx.rikishiId,
      heyaId: ctx.heyaId,
      tags: ["basho", "award"],
    },
  });
}

/**
 * Creates an event for a rivalry heat spike.
 * @param world - Current world state
 * @param data - Narrative context containing rivalry details
 * @returns The logged engine event
 */
export function rivalryHeatSpike(world: WorldState, data: NarrativeContext) {
  return logBardEvent(world, {
    salt: `rivalry-heat-${data.winner}-${data.loser}`,
    ctx: data,
    extraData: {
      winnerId: data.winnerId || data.winnerRikishiId,
      loserId: data.loserId || data.loserRikishiId,
    },
    titlePath: "events.rivalry.title",
    summaryPath: "events.rivalry.press_rumors",
    summaryFirst: true,
    event: {
      type: "RIVALRY_HEAT_SPIKE",
      category: "rivalry",
      importance: (data.heat as number) > 75 ? "major" : "notable",
      scope: "world",
      tags: ["rivalry", "hype"],
    },
  });
}
