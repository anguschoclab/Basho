import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { generateRecommendations } from "@/engine/advisor/AdvisorService";
import type { WorldState } from "@/engine/types/world";

/**
 * WS6 contract tests — league-aware advisor recommendations:
 * rival title challenges, contested recruits, and opponent-model intel.
 */

function baseWorld(): WorldState {
  const oyakata = MockFactory.createOyakata("oya-p", { heyaId: "heya-p" });
  const player = MockFactory.createHeya("heya-p", {
    oyakataId: "oya-p",
    isPlayerOwned: true,
    rikishiIds: [],
    funds: 100_000_000,
    runwayBand: "secure",
  });
  const rival = MockFactory.createHeya("heya-r", { rikishiIds: [], funds: 100_000_000 });
  return MockFactory.createWorld({
    heyas: new Map([
      ["heya-p", player],
      ["heya-r", rival],
    ]),
    oyakata: new Map([["oya-p", oyakata]]),
    playerHeyaId: "heya-p",
  });
}

describe("league-aware advisor recommendations", () => {
  it("warns when a rival leads the yusho race over the player's sekitori", () => {
    const world = baseWorld();
    const mine = MockFactory.createRikishi("r-p", {
      heyaId: "heya-p",
      division: "makuuchi",
      rank: "maegashira",
    });
    const theirs = MockFactory.createRikishi("r-r", {
      heyaId: "heya-r",
      division: "makuuchi",
      rank: "ozeki",
    });
    world.rikishi.set("r-p", mine);
    world.rikishi.set("r-r", theirs);
    world.heyas.get("heya-p")!.rikishiIds = ["r-p"];
    world.heyas.get("heya-r")!.rikishiIds = ["r-r"];
    world.cyclePhase = "active_basho";
    world.currentBasho = MockFactory.createBasho({
      day: 10,
      standings: new Map([
        ["r-r", { wins: 10, losses: 0 } as never],
        ["r-p", { wins: 8, losses: 2 } as never],
      ]),
      matches: [],
    });

    const recs = generateRecommendations(world, "heya-p");
    const rec = recs.find((r) => r.id === "rival-yusho-leader");
    expect(rec).toBeDefined();
    expect(rec!.priority === "high" || rec!.priority === "critical").toBe(true);
  });

  it("flags a contested top recruit when rivals have vacancies", () => {
    const world = baseWorld();
    // Rival has a nearly empty roster → vacancies.
    world.heyas.get("heya-r")!.rikishiIds = ["x1"];
    world.rikishi.set("x1", MockFactory.createRikishi("x1", { heyaId: "heya-r" }));
    // Talent pool with a visible top recruit.
    world.talentPool = {
      candidates: {
        "cand-1": {
          candidateId: "cand-1",
          availabilityState: "available",
          isEmergentProdigy: true,
          tags: ["amateur_star"],
        } as never,
      },
      pools: {
        high_school: { candidatesVisible: ["cand-1"] },
        university: { candidatesVisible: [] },
        foreign: { candidatesVisible: [] },
      },
    } as never;

    const recs = generateRecommendations(world, "heya-p");
    const rec = recs.find((r) => r.id === "contested-recruit");
    expect(rec).toBeDefined();
  });

  it("surfaces opponent-model intel for today's opponent", () => {
    const world = baseWorld();
    const mine = MockFactory.createRikishi("r-p", {
      heyaId: "heya-p",
      division: "makuuchi",
      rank: "maegashira",
    });
    const theirs = MockFactory.createRikishi("r-r", {
      heyaId: "heya-r",
      division: "makuuchi",
      rank: "maegashira",
    });
    world.rikishi.set("r-p", mine);
    world.rikishi.set("r-r", theirs);
    world.heyas.get("heya-p")!.rikishiIds = ["r-p"];
    world.heyas.get("heya-r")!.rikishiIds = ["r-r"];
    world.cyclePhase = "active_basho";
    world.currentBasho = MockFactory.createBasho({
      day: 5,
      standings: new Map(),
      matches: [
        {
          boutId: "b1",
          day: 5,
          eastRikishiId: "r-p",
          westRikishiId: "r-r",
        } as never,
      ],
    });
    // Player oyakata has a learned model of the opponent.
    const oya = world.oyakata.get("oya-p")!;
    oya.memory = {
      observations: [],
      coreDirectives: [],
      lastConsolidationTick: 0,
      planHistory: [],
      decisionHistory: [],
      opponentModels: {
        "r-r": {
          rikishiId: "r-r",
          sampleSize: 6,
          familyCounts: { push: 4, belt: 1, trick: 1, speed: 0 },
          mostUsedTactic: "OSHI_THRUST",
          lastUpdated: 9,
        },
      },
    };

    const recs = generateRecommendations(world, "heya-p");
    const rec = recs.find((r) => r.id === "opponent-model-b1");
    expect(rec).toBeDefined();
    expect(rec!.detail).toContain("push");
  });
});
