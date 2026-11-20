/**
 * eventHelpers.ts
 *
 * Helper functions for event generation.
 */

import { rngFromSeed } from "@/engine/core/rng";
import type { WorldState } from "@/engine/types/world";
import type { NarrativeContext } from "@/engine/types/events";
import type { SeededRNG } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";
import { logEngineEvent, type LogEngineEventParams } from "@/engine/events/events";
import { enrichEventContext } from "@/engine/events/domains/context";

/**
 * Builds the domain-scoped seeded RNG for an event emitter — salt + world year/week/seed under the `narrative`/`event` domain.
 */
export function createRngForEvent(world: WorldState, seedPrefix: string) {
  return rngFromSeed(
    `${seedPrefix}-${world.year}-${world.week}-${world.seed}`,
    "narrative",
    "event"
  );
}

/**
 * Resolves a title+summary template pair — the canonical "duo-line" idiom
 * duplicated across every events/domains/* emitter. The summary resolves
 * second by default; pass `summaryFirst` for legacy call sites whose draw
 * order resolves the summary template first (draw order is load-bearing
 * for determinism).
 */
export function resolveDuoLine(
  rng: SeededRNG,
  titlePath: string,
  summaryPath: string,
  ctx: NarrativeContext,
  summaryFirst = false
): { title: string; summary: string } {
  if (summaryFirst) {
    const summary = BardEngine.resolve(rng, summaryPath, ctx).text;
    const title = BardEngine.resolve(rng, titlePath, ctx).text;
    return { title, summary };
  }
  const title = BardEngine.resolve(rng, titlePath, ctx).text;
  const summary = BardEngine.resolve(rng, summaryPath, ctx).text;
  return { title, summary };
}

/**
 * The canonical events/domains emitter prologue: enrich ctx → seeded rng →
 * duo-line resolve → logEngineEvent, with the enriched ctx (plus any
 * post-merge `extraData`) recorded as `data`.
 *
 * Call sites supply the domain-specific `salt` and `event` fields; context
 * pre-merges (e.g. `{ heyaId, ...ctx }`) are constructed by the caller in
 * `ctx`. `summaryFirst` preserves the reversed draw order of legacy sites.
 */
export function logBardEvent(
  world: WorldState,
  spec: {
    /** Seed suffix fed to `createRngForEvent`. */
    salt: string;
    /** Raw narrative context — enriched inside via `enrichEventContext`. */
    ctx: NarrativeContext;
    /** Keys merged AFTER enrichment (e.g. winnerId/loserId aliases). */
    extraData?: NarrativeContext;
    titlePath: string;
    summaryPath: string;
    /** Resolve summary before title — preserves legacy draw order. */
    summaryFirst?: boolean;
    /** `logEngineEvent` fields minus title/summary/data. */
    event: Omit<LogEngineEventParams, "title" | "summary" | "data">;
  }
) {
  const ctx = { ...enrichEventContext(world, spec.ctx), ...spec.extraData };
  const rng = createRngForEvent(world, spec.salt);
  const { title, summary } = resolveDuoLine(
    rng,
    spec.titlePath,
    spec.summaryPath,
    ctx,
    spec.summaryFirst
  );
  return logEngineEvent(world, { ...spec.event, title, summary, data: ctx });
}
