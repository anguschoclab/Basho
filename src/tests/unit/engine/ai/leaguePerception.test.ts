import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi, makeMockHeya, makeMockBasho } from "../utils";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import type { RivalriesState } from "@/engine/rivalries";

describe("buildLeaguePerception", () => {
  it("returns empty pressure data outside active basho", () => {
    const world = makeMockWorld({ cyclePhase: "interim" });
    const result = buildLeaguePerception(world);
    expect(result.generatedAtWeek).toBe(world.week);
    expect(Object.keys(result.divisionPressures)).toHaveLength(6);
    expect(result.yushoRace.leaders).toEqual([]);
    expect(result.financiallyFragileHeyas).toEqual([]);
  });

  it("computes division leaders from basho standings", () => {
    const world = makeMockWorld({ cyclePhase: "active_basho" });
    const basho = makeMockBasho({ day: 5, standings: new Map() });

    const leader = mockRikishi("r1", { division: "makuuchi", shikona: "Leader" });
    const chaser = mockRikishi("r2", { division: "makuuchi", shikona: "Chaser" });
    const injured = mockRikishi("r3", { division: "makuuchi", shikona: "Injured" });

    world.rikishi.set("r1", leader);
    world.rikishi.set("r2", chaser);
    world.rikishi.set("r3", injured);
    basho.standings.set("r1", { wins: 5, losses: 0 });
    basho.standings.set("r2", { wins: 4, losses: 1 });
    basho.standings.set("r3", { wins: 1, losses: 4 });
    world.currentBasho = basho;

    const result = buildLeaguePerception(world);
    const makuuchi = result.divisionPressures["makuuchi"];
    expect(makuuchi.leaders).toHaveLength(3);
    expect(makuuchi.leaders[0].rikishiId).toBe("r1");
    expect(makuuchi.leaders[0].wins).toBe(5);
    expect(makuuchi.relegationLine.at(-1)?.rikishiId).toBe("r3");
    expect(makuuchi.daysRemaining).toBe(10);
  });

  it("detects an active yusho race when leaders are within one win", () => {
    const world = makeMockWorld({ cyclePhase: "active_basho" });
    const basho = makeMockBasho({ day: 10, standings: new Map() });

    const r1 = mockRikishi("r1", { division: "makuuchi" });
    const r2 = mockRikishi("r2", { division: "makuuchi" });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    basho.standings.set("r1", { wins: 8, losses: 2 });
    basho.standings.set("r2", { wins: 7, losses: 3 });
    world.currentBasho = basho;

    const result = buildLeaguePerception(world);
    expect(result.yushoRace.leaders).toHaveLength(2);
    expect(result.yushoRace.isClinched).toBe(false);
    expect(result.divisionPressures["makuuchi"].hasActiveYushoRace).toBe(true);
  });

  it("reports yusho clinched on day 15 with a clear leader", () => {
    const world = makeMockWorld({ cyclePhase: "active_basho" });
    const basho = makeMockBasho({ day: 15, standings: new Map() });

    const r1 = mockRikishi("r1", { division: "makuuchi" });
    const r2 = mockRikishi("r2", { division: "makuuchi" });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    basho.standings.set("r1", { wins: 14, losses: 1 });
    basho.standings.set("r2", { wins: 12, losses: 3 });
    world.currentBasho = basho;

    const result = buildLeaguePerception(world);
    expect(result.yushoRace.isClinched).toBe(true);
  });

  it("detects financially fragile heyas via perception cache", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { funds: 1_000_000 });
    world.heyas.set("h1", heya);
    world.perceptionCache = {
      h1: {
        runwayBand: "critical",
      } as unknown as import("@/engine/perception").PerceptionSnapshot,
    };

    const result = buildLeaguePerception(world);
    expect(result.financiallyFragileHeyas).toContain("h1");
  });

  it("falls back to funds heuristic when perception cache is missing", () => {
    const world = makeMockWorld();
    const rich = makeMockHeya("h1", { funds: 500_000_000 });
    const poor = makeMockHeya("h2", { funds: 1_000_000 });
    world.heyas.set("h1", rich);
    world.heyas.set("h2", poor);

    const result = buildLeaguePerception(world);
    expect(result.financiallyFragileHeyas).toContain("h2");
    expect(result.financiallyFragileHeyas).not.toContain("h1");
  });

  it("detects rivalry clusters above heat 40", () => {
    const world = makeMockWorld();
    world.rivalriesState = {
      pairs: {
        "r1-r2": { aId: "r1", bId: "r2", key: "r1-r2", heat: 65, tone: "heated" },
        "r1-r3": { aId: "r1", bId: "r3", key: "r1-r3", heat: 50, tone: "bitter" },
        "r4-r5": { aId: "r4", bId: "r5", key: "r4-r5", heat: 20, tone: "mild" },
      },
    } as unknown as RivalriesState;

    const result = buildLeaguePerception(world);
    const cluster = result.rivalryClusters.find((c) => c.keyRikishiId === "r1");
    expect(cluster).toBeDefined();
    expect(cluster?.rivalIds).toContain("r2");
    expect(cluster?.rivalIds).toContain("r3");
    expect(cluster?.averageHeat).toBeGreaterThan(0);
  });

  it("reports top recruit available when a prodigy exists", () => {
    const world = makeMockWorld();
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: world.year,
      candidates: {
        c1: {
          candidateId: "c1",
          isEmergentProdigy: true,
        } as unknown as import("@/engine/types/talent").TalentCandidate,
      },
      pools: {} as unknown as import("@/engine/types/talent").TalentPoolWorldState["pools"],
    };

    const result = buildLeaguePerception(world);
    expect(result.topRecruitAvailable).toBe(true);
  });

  it("reports no top recruit when candidates lack prodigy or amateur star tags", () => {
    const world = makeMockWorld();
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: world.year,
      candidates: {
        c1: {
          candidateId: "c1",
          tags: [],
        } as unknown as import("@/engine/types/talent").TalentCandidate,
      },
      pools: {} as unknown as import("@/engine/types/talent").TalentPoolWorldState["pools"],
    };

    const result = buildLeaguePerception(world);
    expect(result.topRecruitAvailable).toBe(false);
  });
});
