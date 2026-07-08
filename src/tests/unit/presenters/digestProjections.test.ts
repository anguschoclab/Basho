/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { buildWeeklyDigest } from "@/presenters/projections/digestProjections";
import { makeMockWorld } from "../engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { EngineEvent } from "@/engine/types/events";

function makeEvent(overrides: Partial<EngineEvent> & { id: string; type: string }): EngineEvent {
  const { id, type, ...rest } = overrides;
  return {
    id,
    type,
    year: 2025,
    week: 5,
    month: 1,
    day: 1,
    phase: "weekly",
    category: "training",
    importance: "minor",
    scope: "world",
    title: "",
    summary: "",
    data: {},
    truthLevel: "public",
    tags: [],
    ...rest,
  } as EngineEvent;
}

function makeWorldWithEvents(
  events: EngineEvent[],
  overrides: Partial<WorldState> = {}
): WorldState {
  const world = makeMockWorld({
    week: 5,
    year: 2025,
    playerHeyaId: "h1",
    events: { version: "1.0.0", log: events, dedupe: {} } as any,
    ...overrides,
  });
  return world;
}

describe("buildWeeklyDigest — Training Report section", () => {
  it("includes training-report section when TRAINING_STAT_DELTA events exist for player's heya this week", () => {
    const events = [
      makeEvent({
        id: "ev1",
        type: "TRAINING_STAT_DELTA",
        week: 5,
        heyaId: "h1",
        rikishiId: "r1",
        title: "Wrestler-r1 — Training Gains",
        summary: "power +0.3, speed +0.2",
        data: {
          shikona: "Wrestler-r1",
          title: "Wrestler-r1 — Training Gains",
          summary: "power +0.3, speed +0.2",
        },
      }),
    ];

    const world = makeWorldWithEvents(events);
    const digest = buildWeeklyDigest(world);

    expect(digest).not.toBeNull();
    const section = digest!.sections.find((s) => s.id === "training-report");
    expect(section).toBeDefined();
    expect(section!.title).toBe("Training Report");
    expect(section!.items).toHaveLength(1);
    expect(section!.items[0].kind).toBe("training");
    expect(section!.items[0].title).toBe("Wrestler-r1");
    expect(section!.items[0].detail).toContain("power +0.3");
  });

  it("excludes TRAINING_STAT_DELTA events from other heyas", () => {
    const events = [
      makeEvent({
        id: "ev1",
        type: "TRAINING_STAT_DELTA",
        week: 5,
        heyaId: "h1",
        rikishiId: "r1",
        title: "R1 — Training Gains",
        summary: "power +0.3",
        data: { shikona: "R1", title: "R1 — Training Gains", summary: "power +0.3" },
      }),
      makeEvent({
        id: "ev2",
        type: "TRAINING_STAT_DELTA",
        week: 5,
        heyaId: "h2",
        rikishiId: "r2",
        title: "R2 — Training Gains",
        summary: "power +0.5",
        data: { shikona: "R2", title: "R2 — Training Gains", summary: "power +0.5" },
      }),
    ];

    const world = makeWorldWithEvents(events);
    const digest = buildWeeklyDigest(world);

    const section = digest!.sections.find((s) => s.id === "training-report");
    expect(section).toBeDefined();
    expect(section!.items).toHaveLength(1);
    expect(section!.items[0].title).toBe("R1");
  });

  it("excludes TRAINING_STAT_DELTA events from prior weeks", () => {
    const events = [
      makeEvent({
        id: "ev1",
        type: "TRAINING_STAT_DELTA",
        week: 5,
        heyaId: "h1",
        rikishiId: "r1",
        title: "R1 — Training Gains",
        summary: "power +0.3",
        data: { shikona: "R1", title: "R1 — Training Gains", summary: "power +0.3" },
      }),
      makeEvent({
        id: "ev2",
        type: "TRAINING_STAT_DELTA",
        week: 4,
        heyaId: "h1",
        rikishiId: "r2",
        title: "R2 — Training Gains",
        summary: "speed +0.4",
        data: { shikona: "R2", title: "R2 — Training Gains", summary: "speed +0.4" },
      }),
    ];

    const world = makeWorldWithEvents(events);
    const digest = buildWeeklyDigest(world);

    const section = digest!.sections.find((s) => s.id === "training-report");
    expect(section).toBeDefined();
    expect(section!.items).toHaveLength(1);
    expect(section!.items[0].title).toBe("R1");
  });

  it("does not duplicate TRAINING_STAT_DELTA in generic training section", () => {
    const events = [
      makeEvent({
        id: "ev1",
        type: "TRAINING_STAT_DELTA",
        week: 5,
        heyaId: "h1",
        rikishiId: "r1",
        title: "R1 — Training Gains",
        summary: "power +0.3",
        data: { shikona: "R1", title: "R1 — Training Gains", summary: "power +0.3" },
      }),
      makeEvent({
        id: "ev2",
        type: "TRAINING_UPDATE",
        week: 5,
        heyaId: "h1",
        rikishiId: "r2",
        title: "R2 milestone",
        summary: "Power threshold crossed",
        data: { shikona: "R2", title: "R2 milestone", summary: "Power threshold crossed" },
      }),
    ];

    const world = makeWorldWithEvents(events);
    const digest = buildWeeklyDigest(world);

    const trainingReport = digest!.sections.find((s) => s.id === "training-report");
    expect(trainingReport).toBeDefined();
    expect(trainingReport!.items).toHaveLength(1);
    expect(trainingReport!.items[0].title).toBe("R1");

    const genericTraining = digest!.sections.find((s) => s.id === "training");
    if (genericTraining) {
      const hasDelta = genericTraining.items.some((i) => i.title.includes("R1"));
      expect(hasDelta).toBe(false);
    }
  });

  it("counts.trainingEvents includes TRAINING_STAT_DELTA", () => {
    const events = [
      makeEvent({
        id: "ev1",
        type: "TRAINING_STAT_DELTA",
        week: 5,
        heyaId: "h1",
        rikishiId: "r1",
        title: "R1 — Training Gains",
        summary: "power +0.3",
        data: { shikona: "R1", title: "R1 — Training Gains", summary: "power +0.3" },
      }),
      makeEvent({
        id: "ev2",
        type: "TRAINING_UPDATE",
        week: 5,
        heyaId: "h1",
        rikishiId: "r2",
        title: "R2 milestone",
        summary: "Power threshold crossed",
        data: { shikona: "R2", title: "R2 milestone", summary: "Power threshold crossed" },
      }),
    ];

    const world = makeWorldWithEvents(events);
    const digest = buildWeeklyDigest(world);

    expect(digest!.counts.trainingEvents).toBeGreaterThanOrEqual(2);
  });

  it("no training-report section when no TRAINING_STAT_DELTA events", () => {
    const world = makeWorldWithEvents([]);
    const digest = buildWeeklyDigest(world);

    const section = digest!.sections.find((s) => s.id === "training-report");
    expect(section).toBeUndefined();
  });
});
