import { describe, it, expect, beforeEach } from "vitest";
import { handleMediaEvent } from "@/engine/media/MediaService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

describe("handleMediaEvent", () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = {
      mediaState: {
        mediaHeat: { rikishi1: 50, rikishi2: 20 },
        heyaPressure: { heya1: 60, heya2: 10 },
      },
      governanceLog: [
        {
          id: "event1",
          heyaId: "heya1",
          reason: "Test event",
          type: "warning",
          severity: "medium",
          effects: {},
        },
      ],
      // Choice effects are scoped to the responding heya (ruling.heyaId):
      // apology cools that heya's roster only, denial pressures only that heya.
      heyas: new Map([
        ["heya1", { id: "heya1", rikishiIds: ["rikishi1"] }],
        ["heya2", { id: "heya2", rikishiIds: ["rikishi2"] }],
      ]),
      playerHeyaId: "heya1",
    } as any;
  });

  it("updates governance log with player choice", () => {
    const impact = handleMediaEvent(mockWorld, "event1", "apologize");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    const ruling = updatedWorld.governanceLog![0];
    expect(ruling.playerChoice).toBe("apologize");
    expect(ruling.playerResponse).toBe("Player chose: apologize");
  });

  it("decreases heat when apologizing", () => {
    const impact = handleMediaEvent(mockWorld, "event1", "apologize");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    // Scoped to the responding heya's roster — rikishi2 (heya2) untouched.
    expect(updatedWorld.mediaState!.mediaHeat["rikishi1"]).toBe(45);
    expect(updatedWorld.mediaState!.mediaHeat["rikishi2"]).toBe(20);
    expect(updatedWorld.mediaState!.heyaPressure["heya1"]).toBe(55);
  });

  it("does not decrease heat below 0 when apologizing", () => {
    mockWorld.mediaState!.mediaHeat["rikishi1"] = 3;
    const impact = handleMediaEvent(mockWorld, "event1", "apologize");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    expect(updatedWorld.mediaState!.mediaHeat["rikishi1"]).toBe(0);
  });

  it("increases pressure when denying", () => {
    const impact = handleMediaEvent(mockWorld, "event1", "deny");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    expect(updatedWorld.mediaState!.heyaPressure["heya1"]).toBe(65);
    expect(updatedWorld.mediaState!.heyaPressure["heya2"]).toBe(10);
  });

  it("does not increase pressure above 100 when denying", () => {
    mockWorld.mediaState!.heyaPressure["heya1"] = 98;
    const impact = handleMediaEvent(mockWorld, "event1", "deny");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    expect(updatedWorld.mediaState!.heyaPressure["heya1"]).toBe(100);
  });

  it("does not immediately change heat or pressure when ignoring", () => {
    const impact = handleMediaEvent(mockWorld, "event1", "ignore");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    expect(updatedWorld.mediaState!.mediaHeat["rikishi1"]).toBe(50);
    expect(updatedWorld.mediaState!.heyaPressure["heya1"]).toBe(60);
  });

  it("rejects an unknown eventId without touching the player's stable (V18-S7-25)", () => {
    // Every id the UI can dispatch is a governanceLog entry (PendingMediaCard).
    // A stale/unknown id must be a no-op — NOT fall back to playerHeyaId,
    // where 'apologize' would cool the player's own roster and 'deny'
    // would raise the player's own pressure for a story that doesn't exist.
    const impact = handleMediaEvent(mockWorld, "stale-ruling-id", "apologize");
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    expect(updatedWorld.mediaState).toEqual(mockWorld.mediaState);
    expect(updatedWorld.governanceLog).toEqual(mockWorld.governanceLog);

    const denyImpact = handleMediaEvent(mockWorld, "stale-ruling-id", "deny");
    const denyWorld = resolveImpacts(mockWorld, [denyImpact]);
    expect(denyWorld.mediaState).toEqual(mockWorld.mediaState);
  });
});
