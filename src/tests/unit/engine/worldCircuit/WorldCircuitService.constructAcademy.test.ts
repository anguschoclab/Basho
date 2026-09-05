/**
 * WorldCircuitService.constructAcademy.test.ts — tests buildForeignAcademy (plan name: constructAcademy).
 * Plan Feature 11 Test-First Protocol item 2.
 */
import { describe, it, expect } from "vitest";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("WorldCircuitService.buildForeignAcademy (constructAcademy)", () => {
  it("is a function on WorldCircuitService", () => {
    expect(typeof WorldCircuitService.buildForeignAcademy).toBe("function");
  });

  it("returns a StateImpact when called", () => {
    const world = generateInitialWorld("build-academy-test");
    const heyaId = world.playerHeyaId;
    const impact = WorldCircuitService.buildForeignAcademy(world, heyaId ?? "", "Europe");
    expect(impact).toBeDefined();
  });

  it("getRegionVisibility is a function", () => {
    expect(typeof WorldCircuitService.getRegionVisibility).toBe("function");
  });
});
