import { describe, it, expect, beforeEach, vi } from "vitest";
import { phase06_narrative } from "@/engine/tick/phases/phase06_narrative";
import type { WorldState } from "@/engine/types/world";
import { mockRikishi } from "../../utils";

describe("Phase 6: Narrative", () => {
  let world: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    world = {
      playerHeyaId: "heya-1",
      heyas: new Map<string, any>([["heya-1", { id: "heya-1", name: "Test Heya", funds: 1000 }]]),
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
    const injuryEvent = impact.events?.find((e) => e.type === "LIFECYCLE_EVENT");
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
    const insolvencyEvent = impact.events?.find((e) => e.type === "FINANCIAL_ALERT");
    expect(insolvencyEvent).toBeDefined();
  });

  it("does NOT log FINANCIAL_CRISIS if expenses > revenue but funds >= 0", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.revenue = 500;
    world.transientContext.deltas.expenses = 1000;
    world.heyas.get("heya-1")!.funds = 100; // Positive funds

    const impact = phase06_narrative(world);
    // No financial alert event should be logged
    const financialEvent = impact.events?.find((e) => e.type === "FINANCIAL_ALERT");
    expect(financialEvent).toBeUndefined();
  });

  it("logs TRAINING_UPDATE for stat changes >= 1.0", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.statChanges = {
      r1: [
        { stat: "power", amount: 1.5 },
        { stat: "speed", amount: 0.5 },
      ], // 1 milestone
      r2: [{ stat: "power", amount: 0.9 }], // No milestone
    };

    const impact = phase06_narrative(world);
    expect(impact.events).toBeDefined();
    // Event should be logged for training milestone
    const milestoneEvent = impact.events?.find((e) => e.type === "TRAINING_UPDATE");
    expect(milestoneEvent).toBeDefined();
  });

  it("handles empty statChanges without errors", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.statChanges = {};

    const impact = phase06_narrative(world);
    const trainingEvents = impact.events?.filter((e) => e.type === "TRAINING_UPDATE");
    expect(trainingEvents).toBeUndefined();
  });

  it("logs TRAINING_UPDATE for multiple rikishi with big gains", () => {
    if (!world.transientContext?.deltas) return;
    world.rikishi.set("r3", mockRikishi("r3", { shikona: "Wrestler 3", heyaId: "heya-1" }));
    world.transientContext.deltas.statChanges = {
      r1: [{ stat: "power", amount: 1.5 }],
      r2: [{ stat: "speed", amount: 2.0 }],
      r3: [{ stat: "technique", amount: 0.5 }], // No milestone
    };

    const impact = phase06_narrative(world);
    const trainingEvents = impact.events?.filter((e) => e.type === "TRAINING_UPDATE");
    expect(trainingEvents).toHaveLength(2);
    const ids = trainingEvents?.map((e) => e.rikishiId).sort();
    expect(ids).toEqual(["r1", "r2"]);
  });

  it("skips rikishi not found in world", () => {
    if (!world.transientContext?.deltas) return;
    world.transientContext.deltas.statChanges = {
      "ghost-id": [{ stat: "power", amount: 5.0 }],
      r1: [{ stat: "power", amount: 1.5 }],
    };

    const impact = phase06_narrative(world);
    const trainingEvents = impact.events?.filter((e) => e.type === "TRAINING_UPDATE");
    expect(trainingEvents).toHaveLength(1);
    expect(trainingEvents?.[0].rikishiId).toBe("r1");
  });

  it("does not iterate inherited prototype properties on statChanges", () => {
    if (!world.transientContext?.deltas) return;
    const proto = { inheritedKey: [{ stat: "power", amount: 99 }] };
    world.transientContext.deltas.statChanges = Object.create(proto) as any;
    world.transientContext.deltas.statChanges.r1 = [{ stat: "power", amount: 1.5 }];

    const impact = phase06_narrative(world);
    const trainingEvents = impact.events?.filter((e) => e.type === "TRAINING_UPDATE");
    expect(trainingEvents).toHaveLength(1);
    expect(trainingEvents?.[0].rikishiId).toBe("r1");
  });
});
