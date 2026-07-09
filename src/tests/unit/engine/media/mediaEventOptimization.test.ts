import { describe, it, expect, beforeEach } from "vitest";
import { handleMediaEvent } from "@/engine/systems/media/MediaEventService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

describe("handleMediaEvent — for...in optimization safety", () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = {
      mediaState: {
        mediaHeat: { r1: 50, r2: 20 },
        heyaPressure: { h1: 60, h2: 10 },
      },
      governanceLog: [
        {
          id: "e1",
          heyaId: "h1",
          reason: "test",
          type: "warning",
          severity: "medium",
          effects: {},
        },
      ],
    } as any;
  });

  it("does not iterate inherited properties (prototype pollution safety)", () => {
    // Create an object with a custom prototype that has an enumerable "polluted" property.
    // This simulates a prototype pollution attack without modifying the global Object.prototype.
    const proto = { polluted: 999 };
    Object.defineProperty(proto, "polluted", { enumerable: true });
    const heatWithProto = Object.create(proto);
    heatWithProto.r1 = 50;
    heatWithProto.r2 = 20;
    mockWorld.mediaState!.mediaHeat = heatWithProto;

    const impact = handleMediaEvent(mockWorld, "e1", "apologize");
    const updated = resolveImpacts(mockWorld, [impact]);

    // Should only process r1 and r2, not inherited "polluted"
    expect(updated.mediaState!.mediaHeat["r1"]).toBe(45);
    expect(updated.mediaState!.mediaHeat["r2"]).toBe(15);
    expect(updated.mediaState!.mediaHeat["polluted"]).toBeUndefined();
  });

  it("handles empty mediaHeat object gracefully on apologize", () => {
    mockWorld.mediaState!.mediaHeat = {};

    const impact = handleMediaEvent(mockWorld, "e1", "apologize");
    const updated = resolveImpacts(mockWorld, [impact]);

    expect(updated.mediaState!.mediaHeat).toEqual({});
  });

  it("handles empty heyaPressure object gracefully on deny", () => {
    mockWorld.mediaState!.heyaPressure = {};

    const impact = handleMediaEvent(mockWorld, "e1", "deny");
    const updated = resolveImpacts(mockWorld, [impact]);

    expect(updated.mediaState!.heyaPressure).toEqual({});
  });
});
