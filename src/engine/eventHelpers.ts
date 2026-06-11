/**
 * eventHelpers.ts
 *
 * Helper functions for event generation.
 */

import { rngFromSeed } from "./rng";
import type { WorldState } from "./types/world";
import type {
  NarrativeContext,
  EventImportance,
  EventPhase,
  EventScope,
  EventCategory,
  EngineEventType,
} from "./types/events";
import type { Id } from "./types/common";
import { BardEngine } from "./bard/BardEngine";
import { logEngineEvent } from "./events";

export interface EventFactoryConfig {
  type: EngineEventType;
  category: EventCategory;
  importance?: EventImportance;
  phase?: EventPhase;
  scope?: EventScope;
  heyaId?: Id;
  rikishiId?: Id;
  titleKey: string;
  summaryKey?: string;
  tags?: string[];
}

export function createEventWithNarrative(
  world: WorldState,
  seedPrefix: string,
  ctx: NarrativeContext,
  config: EventFactoryConfig
) {
  const rng = rngFromSeed(`${seedPrefix}-${world.year}-${world.week}`, "narrative", "event");
  const titleRes = BardEngine.resolve(rng, config.titleKey, ctx);
  const summaryRes = config.summaryKey
    ? BardEngine.resolve(rng, config.summaryKey, ctx)
    : { text: "" };

  return logEngineEvent(world, {
    type: config.type,
    category: config.category,
    importance: config.importance,
    phase: config.phase,
    scope: config.scope,
    heyaId: config.heyaId,
    rikishiId: config.rikishiId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: config.tags,
  });
}

export function createRngForEvent(world: WorldState, seedPrefix: string) {
  return rngFromSeed(`${seedPrefix}-${world.year}-${world.week}`, "narrative", "event");
}
