import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../WorldFactory";
import { applyOyakataCreationConfig, PLAYER_BACKSTORIES } from "../applyOyakataConfig";

describe("applyOyakataCreationConfig", () => {
  const world = generateInitialWorld("test-seed-apply");
  const [firstHeyaId] = [...world.heyas.keys()];
  const heya = world.heyas.get(firstHeyaId)!;

  it("sets oyakata name from config", () => {
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "ozeki_legend",
    });
    expect(result.oyakata.get(heya.oyakataId)?.name).toBe("Testoyama");
  });

  it("sets backstoryId on oyakata", () => {
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "sanyaku_veteran",
    });
    expect(result.oyakata.get(heya.oyakataId)?.backstoryId).toBe("sanyaku_veteran");
  });

  it("applies fund bonus to heya", () => {
    const backstory = PLAYER_BACKSTORIES.find((b) => b.id === "yokozuna_champion")!;
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "yokozuna_champion",
    });
    const updatedHeya = result.heyas.get(firstHeyaId)!;
    expect(updatedHeya.funds).toBe(heya.funds + backstory.bonuses.funds);
  });

  it("sets highestRank from backstory", () => {
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "yokozuna_champion",
    });
    expect(result.oyakata.get(heya.oyakataId)?.highestRank).toBe("Yokozuna");
  });

  it("clamps traits to [0, 100]", () => {
    // council_elder has patience +15 — ensure no value exceeds 100
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "council_elder",
    });
    const traits = result.oyakata.get(heya.oyakataId)!.traits;
    Object.values(traits).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it("applies ichimon from config to heya", () => {
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "ozeki_legend",
      ichimon: "Takasago",
    });
    expect(result.heyas.get(firstHeyaId)?.ichimon).toBe("Takasago");
  });

  it("returns world unchanged when heyaId is unknown", () => {
    const result = applyOyakataCreationConfig(world, "nonexistent-heya", {
      name: "Testoyama",
      backstoryId: "ozeki_legend",
    });
    expect(result).toBe(world); // same reference — no mutation
  });

  it("does not mutate the original world", () => {
    const originalFunds = heya.funds;
    applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "yokozuna_champion",
    });
    expect(world.heyas.get(firstHeyaId)?.funds).toBe(originalFunds);
  });

  it("all 7 backstory IDs apply without throwing", () => {
    PLAYER_BACKSTORIES.forEach((backstory) => {
      expect(() =>
        applyOyakataCreationConfig(world, firstHeyaId, {
          name: "Testoyama",
          backstoryId: backstory.id,
        })
      ).not.toThrow();
    });
  });

  it("sets shikona to the chosen name", () => {
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Osakaumi",
      backstoryId: "maegashira_lifer",
    });
    expect(result.oyakata.get(heya.oyakataId)?.shikona).toBe("Osakaumi");
  });

  it("adds a memory directive referencing the backstory label", () => {
    const backstory = PLAYER_BACKSTORIES.find((b) => b.id === "injury_comeback")!;
    const result = applyOyakataCreationConfig(world, firstHeyaId, {
      name: "Testoyama",
      backstoryId: "injury_comeback",
    });
    const memory = result.oyakata.get(heya.oyakataId)?.memory;
    expect(memory).toBeDefined();
    expect(memory!.coreDirectives.some((d) => d.includes(backstory.label))).toBe(true);
  });
});
