/**
 * digestTrainingTitle.test.ts
 *
 * Regression test for the mislabeled digest training section (audit H6).
 *
 * `digestProjections` builds the `id: "training"` section but resolves its
 * title with `ui.digest.sections.governance` — ui.json has no `training`
 * key — so training items display under "Governance & Compliance". The fix
 * adds a dedicated `ui.digest.sections.training` template and resolves it.
 */
import { describe, it, expect } from "vitest";
import { buildWeeklyDigest } from "@/presenters/projections/digestProjections";
import { makeMockWorld } from "../engine/utils";
import type { EngineEvent } from "@/engine/types/events";
import type { WorldState } from "@/engine/types/world";

function makeTrainingEvent(overrides: Partial<EngineEvent> = {}): EngineEvent {
  return {
    id: "ev-train-1",
    type: "TRAINING_SESSION_COMPLETED",
    year: 2025,
    week: 5,
    month: 1,
    day: 1,
    phase: "weekly",
    category: "training",
    importance: "minor",
    scope: "world",
    title: "Sparring focus shift",
    summary: "R1 worked on tachiai reps.",
    data: {},
    tags: [],
    ...overrides,
  } as EngineEvent;
}

function worldWithEvents(events: EngineEvent[]): WorldState {
  return makeMockWorld({
    week: 5,
    year: 2025,
    playerHeyaId: "h1",
    events: { version: "1.0.0", log: events, dedupe: {} } as any,
  });
}

describe("buildWeeklyDigest — training section title", () => {
  it("labels the training section with its own title, not the governance title", () => {
    const digest = buildWeeklyDigest(worldWithEvents([makeTrainingEvent()]));
    const training = digest!.sections.find((s) => s.id === "training");

    expect(training).toBeDefined();
    expect(training!.title).not.toBe("Governance & Compliance");
    expect(training!.title.toLowerCase()).toContain("train");
  });
});
