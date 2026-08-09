import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../utils";
import { generateRecommendations, getPlayerDigest } from "@/engine/advisor/AdvisorService";

describe("Player advisor integration", () => {
  it("derives recommendations from world state only", () => {
    const world = makeMockWorld({ playerHeyaId: "player-heya" });
    world.heyas.set(
      "player-heya",
      makeMockHeya("player-heya", { runwayBand: "critical" as const })
    );
    const recs = generateRecommendations(world);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.reasoning.length > 0)).toBe(true);
  });

  it("returns empty recommendations when no player heya is present", () => {
    const world = makeMockWorld({ playerHeyaId: undefined });
    expect(generateRecommendations(world)).toEqual([]);
  });

  it("produces a digest that reflects the player's situation", () => {
    const world = makeMockWorld({ playerHeyaId: "player-heya" });
    world.heyas.set(
      "player-heya",
      makeMockHeya("player-heya", { runwayBand: "critical" as const })
    );
    const digest = getPlayerDigest(world);
    expect(digest).toBeDefined();
    expect(digest!.recommendations.length).toBeGreaterThan(0);
    expect(digest!.runwayBand).toBe("critical");
  });
});
