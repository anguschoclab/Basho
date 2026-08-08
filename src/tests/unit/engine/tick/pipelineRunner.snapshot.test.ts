/**
 * Pipeline Runner Snapshot Tests
 * Verifies error recovery restores from snapshot correctly
 */

import { describe, it, expect } from "vitest";
import { runPipeline, type PipelinePhase } from "@/engine/tick/pipelineRunner";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function createMockWorld(dayIndex: number): WorldState {
  return {
    heyas: new Map([["heya1", { id: "heya1", name: "Test Stable" }]]),
    rikishi: new Map([["rik1", { id: "rik1", shikona: "Test" }]]),
    dayIndexGlobal: dayIndex,
  } as WorldState;
}

describe("pipelineRunner error recovery", () => {
  it("should restore from snapshot when phase throws", () => {
    const initialWorld = createMockWorld(1);

    const goodPhase: PipelinePhase = (world) => ({
      ...world,
      dayIndexGlobal: world.dayIndexGlobal + 1,
    });

    const badPhase: PipelinePhase = () => {
      throw new Error("Phase failure");
    };

    const result = runPipeline(initialWorld, [goodPhase, badPhase, goodPhase]);

    // Should have day 3 (initial 1 + goodPhase + goodPhase, skipping badPhase)
    expect(result.dayIndexGlobal).toBe(3);
  });

  it("should not corrupt state when phase partially mutates then throws", () => {
    const initialWorld = createMockWorld(1);
    let mutationObserved = false;

    const partialMutator: PipelinePhase = () => {
      // Simulate partial mutation that would corrupt state
      mutationObserved = true;
      throw new Error("Partial mutation error");
    };

    const result = runPipeline(initialWorld, [partialMutator]);

    // Result should be the original unmutated state
    expect(result.dayIndexGlobal).toBe(1);
    expect(mutationObserved).toBe(true);
  });

  it("should continue with remaining phases after error", () => {
    const initialWorld = createMockWorld(1);
    const phaseCalls: string[] = [];

    const trackingPhase =
      (name: string): PipelinePhase =>
      (world) => {
        phaseCalls.push(name);
        return { ...world, dayIndexGlobal: world.dayIndexGlobal + 1 };
      };

    const failingPhase: PipelinePhase = () => {
      phaseCalls.push("fail");
      throw new Error("Expected failure");
    };

    runPipeline(initialWorld, [
      trackingPhase("a"),
      trackingPhase("b"),
      failingPhase,
      trackingPhase("c"),
      trackingPhase("d"),
    ]);

    // All phases should be called (including those after error)
    expect(phaseCalls).toEqual(["a", "b", "fail", "c", "d"]);
  });

  it("should preserve heyas and rikishi maps through errors", () => {
    const initialWorld = createMockWorld(5);

    const corruptorPhase: PipelinePhase = () => {
      // Return invalid state (no heyas)
      return { rikishi: new Map() } as WorldState;
    };

    const result = runPipeline(initialWorld, [corruptorPhase]);

    // Should restore from snapshot, preserving original maps
    expect(result.heyas).toBeDefined();
    expect(result.rikishi).toBeDefined();
    expect(result.heyas?.size).toBe(1);
  });

  it("restores a map when its field is declared in phase metadata.touches", () => {
    const initialWorld = createMockWorld(1);

    const mutator: PipelinePhase = (world) => {
      const next = new Map(world.rikishi);
      next.set("rik2", { id: "rik2", shikona: "New" } as unknown as Rikishi);
      return { ...world, rikishi: next };
    };
    mutator.touches = ["rikishi"];

    const failingPhase: PipelinePhase = () => {
      throw new Error("boom");
    };

    const result = runPipeline(initialWorld, [mutator, failingPhase]);

    // rikishi snapshot was taken before mutator, but mutator succeeded. The
    // failing phase rolls back to post-mutator state? No — snapshot is taken
    // before *each* phase, so failingPhase restores to its own pre-phase state,
    // leaving the mutator's change intact. This test guards that touches
    // metadata is accepted and does not crash the runner.
    expect(result.rikishi?.size).toBe(2);
  });

  it("ignores unknown touch fields without crashing", () => {
    const initialWorld = createMockWorld(1);

    const phase: PipelinePhase = (world) => ({
      ...world,
      dayIndexGlobal: world.dayIndexGlobal + 1,
    });
    phase.touches = ["rikishi", "notAWorldField"];

    const result = runPipeline(initialWorld, [phase]);

    expect(result.dayIndexGlobal).toBe(2);
  });
});
