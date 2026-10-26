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
      heyas: new Map([
        ["h1", { id: "h1", rikishiIds: ["r1"] }],
        ["h2", { id: "h2", rikishiIds: ["r2"] }],
      ]),
      playerHeyaId: "h1",
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

    // r1 (h1 roster) is cooled; r2 belongs to h2 and stays; "polluted" untouched.
    expect(updated.mediaState!.mediaHeat["r1"]).toBe(45);
    expect(updated.mediaState!.mediaHeat["r2"]).toBe(20);
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

    // Denial scopes to the responding heya — a missing entry starts from 0.
    expect(updated.mediaState!.heyaPressure).toEqual({ h1: 5 });
  });
});
