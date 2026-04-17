/**
 * eventHelpers.ts
 *
 * Helper functions for event generation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { BardEngine } from "./narrative/BardEngine";
import { logEngineEvent } from "./events";

interface LogEngineEventParams {
  type: EngineEventType;
  category: EventCategory;
  phase?: EventPhase;
  importance?: EventImportance;
  scope?: EventScope;
  heyaId?: Id;
  rikishiId?: Id;
  title: string;
  summary: string;
  data: NarrativeContext;
  truthLevel?: "public" | "limited" | "private";
  tags?: string[];
  causalEventId?: Id;
  dedupeKey?: string;
}

export interface EventFactoryConfig {
  type: string;
  category: string;
  importance?: EventImportance;
  phase?: string;
  scope?: string;
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

  const params: LogEngineEventParams = {
    type: config.type as any,
    category: config.category as any,
    importance: config.importance,
    phase: config.phase as any,
    scope: config.scope as any,
    heyaId: config.heyaId,
    rikishiId: config.rikishiId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: config.tags,
  };

  return logEngineEvent(world, params);
}

export function createRngForEvent(world: WorldState, seedPrefix: string) {
  return rngFromSeed(`${seedPrefix}-${world.year}-${world.week}`, "narrative", "event");
}
