 
import { describe, it, expect } from "vitest";
import { consolidateOyakataMemoryPure } from "@/engine/tick/phases/npc_ai/memory";
import { makeMockWorld } from "../../../utils";
import type { Oyakata } from "@/engine/types/oyakata";
import type { PerceptionSnapshot } from "@/engine/perception";

function makeOyakata(): Oyakata {
  return {
    id: "o1",
    heyaId: "h1",
    archetype: "mentor",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    mood: "content",
  } as unknown as Oyakata;
}

function makePerception(overrides: Partial<PerceptionSnapshot> = {}): PerceptionSnapshot {
  return {
    moraleBand: "stable",
    runwayBand: "comfortable",
    ...overrides,
  } as PerceptionSnapshot;
}

describe("Bug K: consolidateOyakataMemoryPure does not mutate input oyakata", () => {
  it("returns memory object without mutating the original oyakata", () => {
    const world = makeMockWorld({ week: 5 });
    const oyakata = makeOyakata();
    const originalMemory = oyakata.memory;

    const result = consolidateOyakataMemoryPure(world, oyakata, makePerception());

    // Original oyakata should NOT be mutated
    expect(oyakata.memory).toBe(originalMemory);
    // Result should be a new memory object
    expect(result).toBeDefined();
    expect(result).not.toBe(originalMemory);
    expect(result.observations).toBeDefined();
    expect(Array.isArray(result.observations)).toBe(true);
  });

  it("adds observation for mutinous morale", () => {
    const world = makeMockWorld({ week: 5 });
    const oyakata = makeOyakata();

    const result = consolidateOyakataMemoryPure(
      world,
      oyakata,
      makePerception({ moraleBand: "mutinous" })
    );

    const alignmentObs = result.observations.find((o) => o.type === "alignment");
    expect(alignmentObs).toBeDefined();
    expect(alignmentObs!.summary).toContain("morale collapse");
  });

  it("caps observations at 10", () => {
    const world = makeMockWorld({ week: 5 });
    const oyakata = makeOyakata();
    // Pre-fill with 12 observations
    const existingObs = Array.from({ length: 12 }, (_, i) => ({
      tick: i,
      type: "perception" as const,
      summary: `obs-${i}`,
      importance: 5,
    }));
    oyakata.memory = {
      observations: existingObs,
      coreDirectives: [],
      lastConsolidationTick: 0,
    };

    const result = consolidateOyakataMemoryPure(
      world,
      oyakata,
      makePerception({ moraleBand: "mutinous" })
    );

    expect(result.observations.length).toBeLessThanOrEqual(10);
  });
});
