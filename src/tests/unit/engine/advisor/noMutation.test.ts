import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../../engine/utils";
import { generateRecommendations, getPlayerDigest } from "@/engine/advisor/AdvisorService";

const PLAYER_HEYA_ID = "player-heya";

describe("AdvisorService does not mutate world state", () => {
  it("generateRecommendations returns recommendations without modifying the input world", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const heya = makeMockHeya(PLAYER_HEYA_ID, { runwayBand: "critical" as const });
    world.heyas.set(PLAYER_HEYA_ID, heya);
    const snapshot = JSON.stringify(world);

    const recs = generateRecommendations(world);
    expect(recs).toBeInstanceOf(Array);
    expect(JSON.stringify(world)).toBe(snapshot);
  });

  it("getPlayerDigest returns a digest without modifying the input world", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const snapshot = JSON.stringify(world);

    const digest = getPlayerDigest(world);
    expect(digest).toBeDefined();
    expect(JSON.stringify(world)).toBe(snapshot);
  });
});
