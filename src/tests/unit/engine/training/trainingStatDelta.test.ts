/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { TrainingService } from "@/engine/systems/training/TrainingService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { HeyaTrainingState, IndividualFocus } from "@/engine/types/training";

function makeMinimalWorld(overrides: Partial<WorldState> = {}): WorldState {
  const rikishiMap = overrides.rikishi || new Map();
  return {
    rikishi: rikishiMap,
    historicalRikishi: new Map(),
    activeRikishiIds: new Set(Array.from(rikishiMap.keys())),
    heyas: new Map(),
    staff: new Map(),
    oyakata: new Map(),
    events: { version: "1.0.0" as any, log: [], pendingEvents: [] } as any,
    history: [],
    ftue: {} as any,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    id: "world-test",
    seed: "test",
    cyclePhase: "interim",
    records: {} as any,
    settings: { archiveMode: "standard" },
    ...overrides,
  } as unknown as WorldState;
}

function makeTrainingState(
  heyaId: string,
  intensity: string,
  recovery: string,
  focusSlots: IndividualFocus[] = []
): Record<string, HeyaTrainingState> {
  return {
    [heyaId]: {
      heyaId,
      activeProfile: {
        id: "default",
        name: "Default",
        intensity,
        recovery,
        volume: "normal",
        focus: "neutral",
      } as any,
      focusSlots,
      weeklyHistory: [],
    } as unknown as HeyaTrainingState,
  };
}

describe("TrainingService TRAINING_STAT_DELTA events", () => {
  it("emits TRAINING_STAT_DELTA when stats change by >= 0.05", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      fatigue: 20,
      birthYear: 2000,
      power: 30,
      speed: 30,
      technique: 30,
      balance: 30,
      mental: 30,
      adaptability: 30,
      stamina: 50,
    });

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal") as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const deltaEvents = updated.events.log.filter((e: any) => e.type === "TRAINING_STAT_DELTA");
    expect(deltaEvents.length).toBeGreaterThan(0);

    const ev = deltaEvents[0];
    expect(ev.category).toBe("training");
    expect(ev.importance).toBe("minor");
    expect(ev.rikishiId).toBe("r1");
    expect(ev.heyaId).toBe("h1");
    expect(ev.title).toContain("Wrestler-r1");
    expect(ev.summary).toMatch(/(power|speed|technique|balance|stamina|adaptability|mental)\s+[+-]/);
    expect(ev.data.statDeltas).toBeDefined();
    expect(typeof ev.data.statDeltas).toBe("object");
  });

  it("statDeltas only includes stats with |delta| >= 0.05", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      fatigue: 20,
      birthYear: 2000,
      power: 30,
      speed: 30,
      technique: 30,
      balance: 30,
      mental: 30,
      adaptability: 30,
      stamina: 50,
    });

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal") as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const ev = updated.events.log.find(
      (e: any) => e.type === "TRAINING_STAT_DELTA" && e.rikishiId === "r1"
    );
    expect(ev).toBeDefined();
    const deltas = ev!.data.statDeltas as Record<string, number>;
    for (const [, delta] of Object.entries(deltas)) {
      expect(Math.abs(delta)).toBeGreaterThanOrEqual(0.05);
    }
  });

  it("does not emit TRAINING_STAT_DELTA for injured rikishi", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      fatigue: 20,
      birthYear: 2000,
      power: 30,
      speed: 30,
      technique: 30,
      balance: 30,
      mental: 30,
      adaptability: 30,
      stamina: 50,
    });

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal") as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const deltaEvents = updated.events.log.filter(
      (e: any) => e.type === "TRAINING_STAT_DELTA" && e.rikishiId === "r1"
    );
    expect(deltaEvents).toHaveLength(0);
  });

  it("still emits TRAINING_UPDATE milestone alongside TRAINING_STAT_DELTA", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      fatigue: 20,
      birthYear: 2000,
      power: 9.5,
      speed: 30,
      technique: 30,
      balance: 30,
      mental: 30,
      adaptability: 30,
      stamina: 50,
    });

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal") as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const deltaEvents = updated.events.log.filter(
      (e: any) => e.type === "TRAINING_STAT_DELTA" && e.rikishiId === "r1"
    );
    const milestoneEvents = updated.events.log.filter(
      (e: any) => e.type === "TRAINING_UPDATE" && e.rikishiId === "r1"
    );
    expect(deltaEvents.length).toBeGreaterThan(0);
    expect(milestoneEvents.length).toBeGreaterThan(0);
  });

  it("TRAINING_STAT_DELTA summary format is 'stat +value, stat +value'", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      fatigue: 20,
      birthYear: 2000,
      power: 30,
      speed: 30,
      technique: 30,
      balance: 30,
      mental: 30,
      adaptability: 30,
      stamina: 50,
    });

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal") as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const ev = updated.events.log.find(
      (e: any) => e.type === "TRAINING_STAT_DELTA" && e.rikishiId === "r1"
    );
    expect(ev).toBeDefined();
    const summary = ev!.summary;
    const parts = summary.split(", ");
    for (const part of parts) {
      expect(part).toMatch(/^[a-z]+\s+[+-]\d+(\.\d+)?$/);
    }
  });
});
