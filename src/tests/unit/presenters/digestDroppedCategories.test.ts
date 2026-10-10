/**
 * digestDroppedCategories.test.ts
 *
 * Regression test for R07 — the weekly digest silently dropped most event
 * categories. `selectRecentEvents` collected eight buckets but
 * `buildEventSections` rendered only training/scouting/economy (+narrative,
 * +injuries) — career, rivalry, governance, welfare, and media events were
 * bucketed then discarded, and basho/milestone/facility events were never
 * bucketed at all.
 */
import { describe, it, expect } from "vitest";
import { buildWeeklyDigest } from "@/presenters/projections/digestProjections";
import { makeMockWorld } from "../engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { EngineEvent, EventCategory } from "@/engine/types/events";

function makeEvent(id: string, category: EventCategory, type = "GENERIC"): EngineEvent {
  return {
    id,
    type,
    year: 2025,
    week: 5,
    month: 1,
    day: 1,
    phase: "weekly",
    category,
    importance: "notable",
    scope: "world",
    title: `${category} event`,
    summary: `a ${category} thing happened`,
    data: {},
    tags: [],
  } as EngineEvent;
}

function worldWith(events: EngineEvent[]): WorldState {
  return makeMockWorld({
    week: 5,
    year: 2025,
    playerHeyaId: "h1",
    events: { version: "1.0.0", log: events, dedupe: {} } as never,
  });
}

describe("buildWeeklyDigest — dropped categories surface", () => {
  it.each<[EventCategory, string]>([
    ["career", "career"],
    ["rivalry", "rivalry"],
    ["discipline", "governance"],
    ["welfare", "welfare"],
    ["media", "media"],
    ["basho", "basho"],
    ["match", "basho"],
    ["milestone", "milestone"],
    ["facility", "facility"],
  ])("category %s lands in a digest section (%s)", (category, sectionId) => {
    const digest = buildWeeklyDigest(worldWith([makeEvent("e1", category)]));
    const ids = digest!.sections.map((s) => s.id);
    expect(
      ids,
      `category "${category}" is dropped — expected a "${sectionId}" section in [${ids}]`
    ).toContain(sectionId);
  });
});
