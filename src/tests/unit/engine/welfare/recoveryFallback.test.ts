import { describe, it, expect } from "vitest";
import { handleInvestigationTransition } from "@/engine/tick/phases/welfare/transitions";
import { makeMockWorld, makeMockHeya } from "../utils";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WelfareState } from "@/engine/types/economy";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/engine/types/world";

function makeWelfareState(overrides: Partial<WelfareState> = {}): WelfareState {
  return {
    complianceState: "investigation",
    welfareRisk: 50,
    weeksInState: 1,
    investigation: {
      openedWeek: 0,
      severity: "low",
      triggers: [],
      progress: 0,
    },
    ...overrides,
  } as WelfareState;
}

describe("welfare recovery fallback — falsy zero handling", () => {
  it("facilities.recovery 0 does not default to 50 in progress gain", () => {
    const heya = makeMockHeya("heya-zero-recovery", {
      facilities: { training: 50, recovery: 0, nutrition: 50 },
    });
    const world = makeMockWorld({
      calendar: { currentWeek: 10, month: 3 },
    });
    world.heyas.set(heya.id, heya);

    const state = makeWelfareState();
    const builder = createImpactBuilder("test");
    const mediaPressureChanges: Record<string, number> = {};

    handleInvestigationTransition(
      world as WorldState,
      heya as Heya,
      state,
      [],
      builder,
      mediaPressureChanges,
      0
    );

    // recovery=0: progressGain = clamp(round(4 + 0/30), 2, 12) = 4
    expect(state.investigation!.progress).toBe(4);
  });

  it("facilities.recovery 50 produces progress gain of 6", () => {
    const heya = makeMockHeya("heya-mid-recovery", {
      facilities: { training: 50, recovery: 50, nutrition: 50 },
    });
    const world = makeMockWorld({
      calendar: { currentWeek: 10, month: 3 },
    });
    world.heyas.set(heya.id, heya);

    const state = makeWelfareState();
    const builder = createImpactBuilder("test");
    const mediaPressureChanges: Record<string, number> = {};

    handleInvestigationTransition(
      world as WorldState,
      heya as Heya,
      state,
      [],
      builder,
      mediaPressureChanges,
      0
    );

    // recovery=50: progressGain = clamp(round(4 + 50/30), 2, 12) = clamp(6, 2, 12) = 6
    expect(state.investigation!.progress).toBe(6);
  });

  it("undefined facilities defaults recovery to 50, producing progress gain of 6", () => {
    const heya = makeMockHeya("heya-no-facilities", {});
    delete (heya as any).facilities;
    const world = makeMockWorld({
      calendar: { currentWeek: 10, month: 3 },
    });
    world.heyas.set(heya.id, heya);

    const state = makeWelfareState();
    const builder = createImpactBuilder("test");
    const mediaPressureChanges: Record<string, number> = {};

    handleInvestigationTransition(
      world as WorldState,
      heya as Heya,
      state,
      [],
      builder,
      mediaPressureChanges,
      0
    );

    // facilities undefined → recovery ?? 50 → same as recovery=50 → progress=6
    expect(state.investigation!.progress).toBe(6);
  });

  it("recovery at extreme high value clamps progress gain to max (12)", () => {
    const heya = makeMockHeya("heya-max-recovery", {
      facilities: { training: 50, recovery: 300, nutrition: 50 },
    });
    const world = makeMockWorld({
      calendar: { currentWeek: 10, month: 3 },
    });
    world.heyas.set(heya.id, heya);

    const state = makeWelfareState();
    const builder = createImpactBuilder("test");
    const mediaPressureChanges: Record<string, number> = {};

    handleInvestigationTransition(
      world as WorldState,
      heya as Heya,
      state,
      [],
      builder,
      mediaPressureChanges,
      0
    );

    // recovery=300: progressGain = clamp(round(4 + 300/30), 2, 12) = clamp(14, 2, 12) = 12
    expect(state.investigation!.progress).toBe(12);
  });
});
