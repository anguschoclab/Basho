import { describe, it, expect } from "vitest";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { WorldState } from "@/engine/types/world";

function setPresence(world: WorldState, heyaId: string, region: string, value: number) {
  const heya = world.heyas.get(heyaId)!;
  heya.regionalPresence = { ...(heya.regionalPresence || {}), [region]: value };
}

describe("WorldCircuitService.buildForeignAcademy", () => {
  it("builds an academy when presence >= ACADEMY_THRESHOLD (80)", () => {
    const world = generateInitialWorld("academy-test-1");
    const heyaId = world.playerHeyaId ?? "";
    setPresence(world, heyaId, "Mongolia", 85);

    const impact = (WorldCircuitService as any).buildForeignAcademy(world, heyaId, "Mongolia");
    const updated = resolveImpacts(world, [impact]);

    const heya = updated.heyas.get(heyaId)!;
    expect(heya.foreignAcademies).toBeDefined();
    expect(heya.foreignAcademies!.length).toBeGreaterThan(0);
    expect(heya.foreignAcademies![0].region).toBe("Mongolia");
  });

  it("refuses to build when presence < ACADEMY_THRESHOLD", () => {
    const world = generateInitialWorld("academy-test-2");
    const heyaId = world.playerHeyaId ?? "";
    setPresence(world, heyaId, "Mongolia", 50);

    const impact = (WorldCircuitService as any).buildForeignAcademy(world, heyaId, "Mongolia");
    const updated = resolveImpacts(world, [impact]);

    const heya = updated.heyas.get(heyaId)!;
    expect(heya.foreignAcademies ?? []).toHaveLength(0);
  });

  it("refuses to build duplicate academy in same region", () => {
    const world = generateInitialWorld("academy-test-3");
    const heyaId = world.playerHeyaId ?? "";
    setPresence(world, heyaId, "Mongolia", 90);

    // Build first academy
    const impact1 = (WorldCircuitService as any).buildForeignAcademy(world, heyaId, "Mongolia");
    let current = resolveImpacts(world, [impact1]);
    expect(current.heyas.get(heyaId)!.foreignAcademies).toHaveLength(1);

    // Try to build again
    const impact2 = (WorldCircuitService as any).buildForeignAcademy(current, heyaId, "Mongolia");
    current = resolveImpacts(current, [impact2]);
    expect(current.heyas.get(heyaId)!.foreignAcademies).toHaveLength(1);
  });

  it("academy provides a candidate quality bonus", () => {
    const world = generateInitialWorld("academy-test-4");
    const heyaId = world.playerHeyaId ?? "";
    setPresence(world, heyaId, "Europe", 85);

    const impact = (WorldCircuitService as any).buildForeignAcademy(world, heyaId, "Europe");
    const updated = resolveImpacts(world, [impact]);

    const heya = updated.heyas.get(heyaId)!;
    expect(heya.foreignAcademies![0].candidateQualityBonus).toBeGreaterThan(0);
  });
});
