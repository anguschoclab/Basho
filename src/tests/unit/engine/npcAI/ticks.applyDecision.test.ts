import { describe, it, expect } from "vitest";
import { makeMockWorld } from "../utils";
import { applyNPCDecision } from "@/engine/npcAI/ticks";
import { TrainingService } from "@/engine/systems/training/TrainingService";
import type { NPCWeeklyDecision } from "@/engine/npcAI/types";

describe("applyNPCDecision", () => {
  it("updates training state with the decision's profile and focus slots", () => {
    const world = makeMockWorld();
    world.trainingState = new Map();
    TrainingService.ensureHeyaTrainingState(world, "h1");

    const decision: NPCWeeklyDecision = {
      heyaId: "h1",
      archetype: "traditionalist",
      trainingIntensity: "intensive",
      trainingFocus: "power",
      recovery: "high",
      scoutingPriority: "passive",
      individualProtects: ["r1"],
      individualPushes: ["r2"],
      individualDevelops: ["r3"],
      reasoning: [],
      impact: { events: [], metadata: { resolvedBy: "test", source: "test" } },
    };

    const impact = applyNPCDecision(world, decision);
    const updatedState = impact.entities?.trainingStateUpdates?.get("h1");

    expect(updatedState).toBeDefined();
    expect(updatedState?.activeProfile!.intensity).toBe("intensive");
    expect(updatedState?.activeProfile!.focus).toBe("power");
    expect(updatedState?.activeProfile!.recovery).toBe("high");

    expect(updatedState?.focusSlots).toContainEqual({ rikishiId: "r1", focusType: "protect" });
    expect(updatedState?.focusSlots).toContainEqual({ rikishiId: "r2", focusType: "push" });
    expect(updatedState?.focusSlots).toContainEqual({ rikishiId: "r3", focusType: "develop" });
  });

  it("removes managed ids from existing focus slots but keeps others", () => {
    const world = makeMockWorld();
    world.trainingState = new Map();
    const state = TrainingService.ensureHeyaTrainingState(world, "h1");
    state.focusSlots = [
      { rikishiId: "r1", focusType: "develop" },
      { rikishiId: "r_keep", focusType: "push" },
    ];

    const decision: NPCWeeklyDecision = {
      heyaId: "h1",
      archetype: "traditionalist",
      trainingIntensity: "balanced",
      trainingFocus: "technique",
      recovery: "normal",
      scoutingPriority: "none",
      individualProtects: ["r1"],
      individualPushes: [],
      individualDevelops: [],
      reasoning: [],
      impact: { events: [], metadata: { resolvedBy: "test", source: "test" } },
    };

    const impact = applyNPCDecision(world, decision);
    const updatedState = impact.entities?.trainingStateUpdates?.get("h1");

    expect(updatedState?.focusSlots).toContainEqual({ rikishiId: "r_keep", focusType: "push" });
    expect(updatedState?.focusSlots).toContainEqual({ rikishiId: "r1", focusType: "protect" });
    expect(updatedState?.focusSlots).not.toContainEqual({ rikishiId: "r1", focusType: "develop" });
  });
});
