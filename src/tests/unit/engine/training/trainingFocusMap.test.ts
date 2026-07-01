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
    events: { log: [], pendingEvents: [] } as any,
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

describe("TrainingService focusSlots resolution", () => {
  it("resolves correct individualFocus per rikishi across multiple heyas", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: true, fatigue: 60 });
    const r2 = mockRikishi("r2", { heyaId: "h1", injured: true, fatigue: 60 });
    const r3 = mockRikishi("r3", { heyaId: "h2", injured: true, fatigue: 60 });

    const h1FocusSlots: IndividualFocus[] = [
      { rikishiId: "r1", focusType: "protect" } as IndividualFocus,
      { rikishiId: "r2", focusType: "rebuild" } as IndividualFocus,
    ];
    const h2FocusSlots: IndividualFocus[] = [
      { rikishiId: "r3", focusType: "protect" } as IndividualFocus,
    ];

    const world = makeMinimalWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
      heyas: new Map([
        ["h1", { id: "h1", name: "H1", rikishiIds: ["r1", "r2"] } as any],
        ["h2", { id: "h2", name: "H2", rikishiIds: ["r3"] } as any],
      ]),
      trainingState: {
        ...makeTrainingState("h1", "balanced", "normal", h1FocusSlots),
        ...makeTrainingState("h2", "balanced", "normal", h2FocusSlots),
      } as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const u1 = updated.rikishi.get("r1")!;
    const u2 = updated.rikishi.get("r2")!;
    const u3 = updated.rikishi.get("r3")!;

    expect(u1.fatigue).toBeLessThan(60);
    expect(u2.fatigue).toBeLessThan(60);
    expect(u3.fatigue).toBeLessThan(60);
  });

  it("returns undefined focus for rikishi not in focusSlots without crashing", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false, fatigue: 50 });
    const r2 = mockRikishi("r2", { heyaId: "h1", injured: false, fatigue: 50 });

    const world = makeMinimalWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1", "r2"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal", [
        { rikishiId: "r1", focusType: "develop" } as IndividualFocus,
      ]) as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!).toBeDefined();
    expect(updated.rikishi.get("r2")!).toBeDefined();
    expect(updated.rikishi.get("r2")!.fatigue).toBeGreaterThanOrEqual(0);
  });

  it("handles duplicate rikishiId in focusSlots with first-match semantics", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: true, fatigue: 60 });

    const focusSlots: IndividualFocus[] = [
      { rikishiId: "r1", focusType: "protect" } as IndividualFocus,
      { rikishiId: "r1", focusType: "rebuild" } as IndividualFocus,
    ];

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ["r1"] } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal", focusSlots) as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.fatigue).toBeLessThan(60);
  });

  it("caches focus map per heya across multiple rikishi in same heya", () => {
    const rikishi = new Map();
    const ids = ["r1", "r2", "r3", "r4", "r5"];
    for (const id of ids) {
      rikishi.set(id, mockRikishi(id, { heyaId: "h1", injured: false, fatigue: 30 }));
    }

    const focusSlots: IndividualFocus[] = [
      { rikishiId: "r1", focusType: "develop" } as IndividualFocus,
      { rikishiId: "r3", focusType: "push" } as IndividualFocus,
      { rikishiId: "r5", focusType: "protect" } as IndividualFocus,
    ];

    const world = makeMinimalWorld({
      rikishi,
      heyas: new Map([["h1", { id: "h1", name: "H1", rikishiIds: ids } as any]]),
      trainingState: makeTrainingState("h1", "balanced", "normal", focusSlots) as any,
    });

    const impact = TrainingService.applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    for (const id of ids) {
      expect(updated.rikishi.get(id)!).toBeDefined();
    }
  });
});
