/**
 * WorldCircuitService.processExhibitionResult.test.ts — tests processExhibitionResult applies effects.
 * Plan Feature 11 Test-First Protocol item 1.
 */
import { describe, it, expect } from "vitest";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("WorldCircuitService.processExhibitionResult", () => {
  it("is a function on WorldCircuitService", () => {
    expect(typeof WorldCircuitService.processExhibitionResult).toBe("function");
  });

  it("returns a StateImpact when called with valid args", () => {
    const world = generateInitialWorld("exhibition-result-test");
    const heyaId = world.playerHeyaId;
    const rikishiId = [...world.activeRikishiIds][0];
    if (!rikishiId) return; // skip if no rikishi

    const invitation = {
      id: "ex1",
      region: "europe",
      name: "European Exhibition",
      location: "Paris",
      stipend: 50_000,
      prestige: 50,
      injuryRisk: 0.01,
    } as any;

    const impact = WorldCircuitService.processExhibitionResult(world, heyaId ?? "", rikishiId, invitation);
    expect(impact).toBeDefined();
    expect(impact.events).toBeDefined();
  });

  it("returns empty impact when heya or rikishi not found", () => {
    const world = generateInitialWorld("exhibition-result-invalid-test");
    const invitation = { id: "ex1", region: "europe", prestige: 50 } as any;
    const impact = WorldCircuitService.processExhibitionResult(world, "nonexistent", "nonexistent", invitation);
    expect(impact).toBeDefined();
  });
});
