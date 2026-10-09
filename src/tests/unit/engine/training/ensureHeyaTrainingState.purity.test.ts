/**
 * ensureHeyaTrainingState.purity.test.ts
 *
 * Regression test for hydration-helper mutation (audit V3).
 *
 * `ensureHeyaTrainingState`'s docblock promises "never writes into
 * world.trainingState", but when a partial entry exists it mutates the live
 * map entry in place (`state.activeProfile = {...}`). On a worker-owned world
 * that is a silent divergence from the authoritative copy.
 */
import { describe, it, expect } from "vitest";
import { ensureHeyaTrainingState } from "@/engine/systems/training/TrainingService";
import { makeMockWorld } from "../utils";

describe("ensureHeyaTrainingState purity", () => {
  it("does not mutate an existing partial entry in world.trainingState", () => {
    const world = makeMockWorld({});
    const partial = {
      heyaId: "h1",
      activeProfile: { intensity: "high" },
      focusSlots: [],
    } as any;
    world.trainingState = new Map([["h1", partial]]);

    const resolved = ensureHeyaTrainingState(world, "h1");

    // Returned state must have merged defaults…
    expect(resolved.activeProfile).toBeDefined();
    // …but the stored entry must be untouched — callers that want to persist
    // must go through an impact, not a read helper side-effect.
    expect(world.trainingState.get("h1")!.activeProfile).toEqual({ intensity: "high" });
  });

  it("does not add a map entry for an unknown heya", () => {
    const world = makeMockWorld({});
    world.trainingState = new Map();

    const resolved = ensureHeyaTrainingState(world, "h9");

    expect(resolved.heyaId).toBe("h9");
    expect(world.trainingState.has("h9")).toBe(false);
  });
});
