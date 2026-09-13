import { describe, it, expect, vi, afterEach } from "vitest";
import { phase01_week_world_circuit } from "@/engine/tick/phases/phase01_week_world_circuit";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";

describe("phase01_week_world_circuit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies style drift when enableStyleDrift is true", () => {
    const world = MockFactory.createWorld({
      settings: { archiveMode: "standard", enableStyleDrift: true },
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1")],
        ["h2", MockFactory.createHeya("h2")]
      ]),
    });

    const mockImpact1 = { metadata: { source: "test" }, entities: { heyaUpdates: new Map([["h1", { styleDrift: { strength: 0.1 } }]]) } };
    const mockImpact2 = { metadata: { source: "test" }, entities: { heyaUpdates: new Map([["h2", { styleDrift: { technique: -0.1 } }]]) } };

    vi.spyOn(WorldCircuitService, "applyStyleDrift")
      .mockReturnValueOnce(mockImpact1 as any)
      .mockReturnValueOnce(mockImpact2 as any);

    const impact = phase01_week_world_circuit(world);

    expect(WorldCircuitService.applyStyleDrift).toHaveBeenCalledTimes(2);
    expect(impact.entities?.heyaUpdates?.size).toBe(2);
    expect(impact.entities?.heyaUpdates?.get("h1")).toBeDefined();
    expect(impact.entities?.heyaUpdates?.get("h2")).toBeDefined();
  });

  it("does not apply style drift if enableStyleDrift is false", () => {
    const world = MockFactory.createWorld({
      settings: { archiveMode: "standard", enableStyleDrift: false },
      heyas: new Map([["h1", MockFactory.createHeya("h1")]]),
    });

    const impact = phase01_week_world_circuit(world);

    // Impact should have no entity updates
    expect(impact.entities?.heyaUpdates).toBeUndefined();
  });
});
