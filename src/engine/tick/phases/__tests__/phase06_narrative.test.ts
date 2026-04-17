/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any -- Test file with mock data */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { phase06_narrative } from "../phase06_narrative";
import type { WorldState } from "../../../types/world";
import { mockRikishi } from "../../../__tests__/utils";

describe("Phase 6: Narrative", () => {
  let world: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    world = {
      playerHeyaId: "heya-1",
      heyas: new Map([["heya-1", { id: "heya-1", name: "Test Heya", funds: 1000 } as any]]),
      rikishi: new Map([
        [
          "r1",
          mockRikishi("r1", { shikona: "Wrestler 1", injuryWeeksRemaining: 2, heyaId: "heya-1" }),
        ],
        ["r2", mockRikishi("r2", { shikona: "Wrestler 2", heyaId: "heya-1" })],
      ]),
      transientContext: {
        deltas: {
          revenue: 1000,
          expenses: 500,
          injuriesSustained: [],
          statChanges: {},
        },
      },
    } as unknown as WorldState;
  });

  it("returns StateImpact with empty events if deltas are missing", () => {
    world.transientContext!.deltas = undefined as any;
    const impact = phase06_narrative(world);
    expect(impact).toBeDefined();
    expect(impact.metadata?.source).toBe("phase06_narrative");
  });

  it("logs INJURY event via builder.logEvent", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.injuriesSustained = ["r1"];

    const impact = phase06_narrative(world);
    expect(impact.events).toBeDefined();
    expect(impact.events!.length).toBeGreaterThan(0);
    // Event should be logged for injury
    const injuryEvent = impact.events?.find((e: any) => e.type === "LIFECYCLE_EVENT");
    expect(injuryEvent).toBeDefined();
  });

  it("logs insolvency event if expenses > revenue AND funds < 0", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.revenue = 500;
    world.transientContext.deltas.expenses = 1000;
    world.heyas.get("heya-1")!.funds = -100;

    const impact = phase06_narrative(world);
    expect(impact.events).toBeDefined();
    // Event should be logged for insolvency
    const insolvencyEvent = impact.events?.find((e: any) => e.type === "FINANCIAL_ALERT");
    expect(insolvencyEvent).toBeDefined();
  });

  it("does NOT log FINANCIAL_CRISIS if expenses > revenue but funds >= 0", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.revenue = 500;
    world.transientContext.deltas.expenses = 1000;
    world.heyas.get("heya-1")!.funds = 100; // Positive funds

    const impact = phase06_narrative(world);
    // No financial alert event should be logged
    const financialEvent = impact.events?.find((e: any) => e.type === "FINANCIAL_ALERT");
    expect(financialEvent).toBeUndefined();
  });

  it("logs TRAINING_UPDATE for stat changes >= 1.0", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.statChanges = {
      r1: [
        { stat: "strength", amount: 1.5 },
        { stat: "speed", amount: 0.5 },
      ], // 1 milestone
      r2: [{ stat: "strength", amount: 0.9 }], // No milestone
    };

    const impact = phase06_narrative(world);
    expect(impact.events).toBeDefined();
    // Event should be logged for training milestone
    const milestoneEvent = impact.events?.find((e: any) => e.type === "TRAINING_UPDATE");
    expect(milestoneEvent).toBeDefined();
  });
});
