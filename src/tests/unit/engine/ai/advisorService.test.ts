import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi, makeMockHeya, makeMockBasho } from "../utils";
import { generateRecommendations, getPlayerDigest } from "@/engine/advisor/AdvisorService";

const PLAYER_HEYA_ID = "player-heya";

describe("generateRecommendations", () => {
  it("returns empty list when no player heya exists", () => {
    const world = makeMockWorld({ playerHeyaId: undefined });
    expect(generateRecommendations(world)).toEqual([]);
  });

  it("warns about critical runway", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const heya = makeMockHeya(PLAYER_HEYA_ID, { runwayBand: "critical" as const });
    world.heyas.set(PLAYER_HEYA_ID, heya);
    const recs = generateRecommendations(world);
    const financeRec = recs.find((r) => r.category === "finance" && r.priority === "critical");
    expect(financeRec).toBeDefined();
  });

  it("warns about an undermanned roster", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const heya = makeMockHeya(PLAYER_HEYA_ID, { rikishiIds: ["r1", "r2", "r3"] });
    world.heyas.set(PLAYER_HEYA_ID, heya);
    const recs = generateRecommendations(world);
    const rosterRec = recs.find((r) => r.id === "roster-undermanned");
    expect(rosterRec).toBeDefined();
    expect(rosterRec?.priority).toBe("high");
  });

  it("flags active heated rivalries", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const heya = makeMockHeya(PLAYER_HEYA_ID);
    world.heyas.set(PLAYER_HEYA_ID, heya);
    const r1 = mockRikishi("r1", { heyaId: PLAYER_HEYA_ID });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    world.rivalriesState = {
      pairs: {
        "r1-x": { aId: "r1", bId: "x", key: "r1-x", heat: 70, tone: "heated" },
      },
    } as unknown as import("@/engine/rivalries").RivalriesState;
    const recs = generateRecommendations(world);
    expect(recs.some((r) => r.id === "rivalry-heated")).toBe(true);
  });

  it("generates bout advice when player has a match today", () => {
    const world = makeMockWorld({
      cyclePhase: "active_basho",
      playerHeyaId: PLAYER_HEYA_ID,
    });
    const heya = makeMockHeya(PLAYER_HEYA_ID);
    const playerRikishi = mockRikishi("p1", { heyaId: PLAYER_HEYA_ID, style: "oshi" });
    const opponent = mockRikishi("o1", { heyaId: "h2", style: "yotsu" });
    world.heyas.set(PLAYER_HEYA_ID, heya);
    world.rikishi.set("p1", playerRikishi);
    world.rikishi.set("o1", opponent);
    heya.rikishiIds = ["p1"];

    const basho = makeMockBasho({ day: 1 });
    basho.matches = [
      {
        day: 1,
        eastRikishiId: "p1",
        westRikishiId: "o1",
        boutId: "b1",
      } as unknown as import("@/engine/types/basho").MatchSchedule,
    ];
    world.currentBasho = basho;

    const recs = generateRecommendations(world);
    const boutRecs = recs.filter((r) => r.category === "bout");
    expect(boutRecs.length).toBeGreaterThan(0);
    expect(boutRecs[0].relatedEntityId).toBe("o1");
  });
});

describe("getPlayerDigest", () => {
  it("summarizes the player's strategic situation", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const digest = getPlayerDigest(world);
    expect(digest).toBeDefined();
    expect(digest?.heyaId).toBe(PLAYER_HEYA_ID);
    expect(Array.isArray(digest?.recommendations)).toBe(true);
  });
});
