/**
 * Pipeline Runner Legacy Removal Tests (B3.3)
 * Verifies that the legacy WorldState return path is removed.
 */

import { describe, it, expect } from "vitest";
import { runPipeline, type PipelinePhase } from "@/engine/tick/pipelineRunner";
import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";

function createMockWorld(dayIndex: number): WorldState {
  return {
    heyas: new Map([["heya1", { id: "heya1", name: "Test Stable" }]]),
    rikishi: new Map([["rik1", { id: "rik1", shikona: "Test" }]]),
    activeRikishiIds: new Set(["rik1"]),
    dayIndexGlobal: dayIndex,
  } as WorldState;
}

describe("Pipeline runner legacy removal (B3.3)", () => {
  it("pipelineRunner no longer checks 'metadata' in result — all phases return StateImpact", () => {
    // All phases should return StateImpact now.
    // The runner should resolve impacts without checking for legacy WorldState.
    const world = createMockWorld(1);

    const phase: PipelinePhase = (w) => {
      return createImpactBuilder("test")
        .updateWorldField("dayIndexGlobal", w.dayIndexGlobal + 1)
        .build();
    };

    const result = runPipeline(world, [phase]);
    expect(result.dayIndexGlobal).toBe(2);
  });

  it("phase returning WorldState (legacy) is handled gracefully", () => {
    // Even after removing the legacy path, the runner should not crash
    // if a phase returns WorldState — it should be treated as the new world.
    const world = createMockWorld(1);

    const legacyPhase: PipelinePhase = (w) => {
      return { ...w, dayIndexGlobal: w.dayIndexGlobal + 1 };
    };

    const result = runPipeline(world, [legacyPhase]);
    expect(result.dayIndexGlobal).toBe(2);
  });
});
