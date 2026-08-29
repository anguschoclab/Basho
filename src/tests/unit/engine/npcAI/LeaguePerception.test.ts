import { describe, it, expect } from "vitest";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import { NPC_FALLBACK_MONTHLY_BURN_ESTIMATE } from "@/constants/engine/economic";

describe("LeaguePerception", () => {
  it("identifies financially fragile heyas based on funds and burn estimate when perception cache is missing", () => {
    const world = MockFactory.createWorld();

    // Create a heya with plenty of funds (safe, > 2 months runway)
    const richHeya = MockFactory.createHeya("heya_rich");
    richHeya.funds = NPC_FALLBACK_MONTHLY_BURN_ESTIMATE * 3;

    // Create a heya with low funds (fragile - less than 2 months runway)
    const poorHeya = MockFactory.createHeya("heya_poor");
    poorHeya.funds = NPC_FALLBACK_MONTHLY_BURN_ESTIMATE * 1;

    world.heyas.set("heya_rich", richHeya);
    world.heyas.set("heya_poor", poorHeya);

    const perception = buildLeaguePerception(world);

    expect(perception.financiallyFragileHeyas).not.toContain("heya_rich");
    expect(perception.financiallyFragileHeyas).toContain("heya_poor");
  });

  it("calculates the yusho race leaders correctly during an active basho", () => {
    const world = MockFactory.createWorld({ cyclePhase: "active_basho" });
    const basho = MockFactory.createBasho();
    basho.day = 13;
    world.currentBasho = basho;

    // Create makuuchi rikishi with different records
    const r1 = MockFactory.createRikishi("r1", { division: "makuuchi" });
    const r2 = MockFactory.createRikishi("r2", { division: "makuuchi" });
    const r3 = MockFactory.createRikishi("r3", { division: "juryo" }); // Shouldn't be in yusho race

    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);
    world.rikishi.set(r3.id, r3);

    basho.standings.set("r1", { wins: 12, losses: 1 });
    basho.standings.set("r2", { wins: 11, losses: 2 });
    basho.standings.set("r3", { wins: 13, losses: 0 });

    const perception = buildLeaguePerception(world);

    expect(perception.yushoRace.leaders.length).toBe(2);
    expect(perception.yushoRace.leaders[0].rikishiId).toBe("r1");
    expect(perception.yushoRace.leaders[0].wins).toBe(12);
    expect(perception.yushoRace.leaders[1].rikishiId).toBe("r2");
    expect(perception.yushoRace.isClinched).toBe(false);
  });
});
