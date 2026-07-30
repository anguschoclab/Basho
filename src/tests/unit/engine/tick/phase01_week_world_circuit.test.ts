import { describe, it, expect } from "vitest";
import { phase01_week_world_circuit } from "@/engine/tick/phases/phase01_week_world_circuit";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("phase01_week_world_circuit", () => {
  it("does not apply style drift if enableStyleDrift is false", () => {
    const world = MockFactory.createWorld({
      settings: { archiveMode: "standard", enableStyleDrift: false },
      heyas: new Map([["h1", MockFactory.createHeya("h1")]])
    });

    const impact = phase01_week_world_circuit(world);

    // Impact should have no entity updates
    expect(impact.entities?.heyaUpdates).toBeUndefined();
  });
});
