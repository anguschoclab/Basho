 
import { describe, it, expect } from "vitest";
import {
  isEligibleForTsukebito,
  isEligibleTsukebito,
  assignTsukebito,
  applyWeeklyTsukebitoBenefits,
  applyWeeklyOtotodeshiEffects,
  TSUKEBITO_SENIOR_RANK_THRESHOLD,
  MAX_TSUKEBITO_PER_SENIOR,
  TSUKEBITO_TRAINING_BOOST,
  TSUKEBITO_MORALE_BOOST,
  TSUKEBITO_TECHNIQUE_EXPOSURE,
  OTOTODESHI_FATIGUE_PENALTY,
  OTOTODESHI_MENTAL_GAIN,
} from "@/engine/systems/training/TsukebitoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

function makeSenior(id: string, rankNum: number): Rikishi {
  return mockRikishi(id, {
    shikona: `Senior ${id}`,
    heyaId: "heya-1",
    rankNumber: rankNum,
    stats: { power: 60, speed: 60, technique: 60, balance: 60, stamina: 60, mental: 60, weight: 120, experience: 50, adaptability: 60, aggression: 50 } as any,
  });
}

function makeJunior(id: string, rankNum: number): Rikishi {
  return mockRikishi(id, {
    shikona: `Junior ${id}`,
    heyaId: "heya-1",
    rankNumber: rankNum,
    stats: { power: 40, speed: 40, technique: 40, balance: 40, stamina: 40, mental: 40, weight: 90, experience: 10, adaptability: 40, aggression: 50 } as any,
  });
}

describe("Tsukebito eligibility", () => {
  it("sekiwake and above are eligible for tsukebito", () => {
    const senior = makeSenior("s-1", 2);
    expect(isEligibleForTsukebito(senior)).toBe(true);
  });

  it("maegashira are not eligible for tsukebito", () => {
    const riki = makeSenior("r-1", 10);
    expect(isEligibleForTsukebito(riki)).toBe(false);
  });

  it("retired rikishi are not eligible", () => {
    const senior = makeSenior("s-1", 1);
    senior.isRetired = true;
    expect(isEligibleForTsukebito(senior)).toBe(false);
  });

  it("junior rikishi from same heya are eligible tsukebito", () => {
    const senior = makeSenior("s-1", 1);
    const junior = makeJunior("j-1", 15);
    expect(isEligibleTsukebito(junior, senior)).toBe(true);
  });

  it("rikishi from different heya are not eligible tsukebito", () => {
    const senior = makeSenior("s-1", 1);
    const junior = makeJunior("j-1", 15);
    junior.heyaId = "heya-2";
    expect(isEligibleTsukebito(junior, senior)).toBe(false);
  });

  it("senior cannot be their own tsukebito", () => {
    const senior = makeSenior("s-1", 1);
    expect(isEligibleTsukebito(senior, senior)).toBe(false);
  });
});

describe("Tsukebito assignment", () => {
  it("assigns up to MAX_TSUKEBITO_PER_SENIOR tsukebito", () => {
    const senior = makeSenior("s-1", 1);
    const juniors = [
      makeJunior("j-1", 15),
      makeJunior("j-2", 20),
      makeJunior("j-3", 25),
      makeJunior("j-4", 30),
    ];
    const world = makeMockWorld({});

    const assignment = assignTsukebito(world, senior, juniors);
    expect(assignment.seniorId).toBe("s-1");
    expect(assignment.tsukebitoIds.length).toBeLessThanOrEqual(MAX_TSUKEBITO_PER_SENIOR);
  });

  it("returns empty assignment for ineligible senior", () => {
    const senior = makeSenior("s-1", 10);
    const juniors = [makeJunior("j-1", 15)];
    const world = makeMockWorld({});

    const assignment = assignTsukebito(world, senior, juniors);
    expect(assignment.tsukebitoIds).toEqual([]);
  });

  it("returns empty assignment when no eligible juniors", () => {
    const senior = makeSenior("s-1", 1);
    const world = makeMockWorld({});

    const assignment = assignTsukebito(world, senior, []);
    expect(assignment.tsukebitoIds).toEqual([]);
  });

  it("assignment is deterministic given same world seed", () => {
    const senior = makeSenior("s-1", 1);
    const juniors = [
      makeJunior("j-1", 15),
      makeJunior("j-2", 20),
      makeJunior("j-3", 25),
    ];
    const world1 = makeMockWorld({});
    const world2 = makeMockWorld({});

    const a1 = assignTsukebito(world1, senior, juniors);
    const a2 = assignTsukebito(world2, senior, juniors);
    expect(a1.tsukebitoIds).toEqual(a2.tsukebitoIds);
  });
});

describe("Weekly tsukebito benefits", () => {
  it("senior gets technique boost from tsukebito", () => {
    const senior = makeSenior("s-1", 1);
    const junior = makeJunior("j-1", 15);
    const world = makeMockWorld({
      rikishi: new Map([
        [senior.id, senior],
        [junior.id, junior],
      ]),
    });

    const assignment = { seniorId: "s-1", tsukebitoIds: ["j-1"] };
    const impact = applyWeeklyTsukebitoBenefits(world, assignment, senior, [junior]);
    const updated = resolveImpacts(world, [impact]);

    const updatedSenior = updated.rikishi.get("s-1");
    const expectedTech = 60 + TSUKEBITO_TRAINING_BOOST;
    expect(updatedSenior?.stats?.technique).toBeCloseTo(expectedTech, 5);
  });

  it("tsukebito gets technique exposure and morale boost", () => {
    const senior = makeSenior("s-1", 1);
    const junior = makeJunior("j-1", 15);
    const world = makeMockWorld({
      rikishi: new Map([
        [senior.id, senior],
        [junior.id, junior],
      ]),
    });

    const assignment = { seniorId: "s-1", tsukebitoIds: ["j-1"] };
    const impact = applyWeeklyTsukebitoBenefits(world, assignment, senior, [junior]);
    const updated = resolveImpacts(world, [impact]);

    const updatedJunior = updated.rikishi.get("j-1");
    expect(updatedJunior?.stats?.technique).toBeGreaterThan(40);
    expect(updatedJunior?.stats?.mental).toBeGreaterThan(40);
  });

  it("no benefits when assignment is empty", () => {
    const senior = makeSenior("s-1", 1);
    const world = makeMockWorld({
      rikishi: new Map([[senior.id, senior]]),
    });

    const assignment = { seniorId: "s-1", tsukebitoIds: [] };
    const impact = applyWeeklyTsukebitoBenefits(world, assignment, senior, []);
    const updated = resolveImpacts(world, [impact]);

    // No changes
    expect(updated.rikishi.get("s-1")?.stats?.technique).toBe(60);
  });
});

describe("Ototodeshi effects", () => {
  it("junior-most rikishi get fatigue penalty and mental gain", () => {
    const riki1 = makeJunior("j-1", 40);
    const riki2 = makeJunior("j-2", 35);
    const world = makeMockWorld({
      rikishi: new Map([
        [riki1.id, riki1],
        [riki2.id, riki2],
      ]),
    });

    const impact = applyWeeklyOtotodeshiEffects(world, "heya-1", [riki1, riki2]);
    const updated = resolveImpacts(world, [impact]);

    const updatedR1 = updated.rikishi.get("j-1");
    expect(updatedR1?.fatigue).toBeGreaterThan(0);
    expect(updatedR1?.stats?.mental).toBeGreaterThan(40);
  });

  it("higher-ranked rikishi are not affected by ototodeshi", () => {
    const senior = makeSenior("s-1", 5);
    const junior = makeJunior("j-1", 40);
    const world = makeMockWorld({
      rikishi: new Map([
        [senior.id, senior],
        [junior.id, junior],
      ]),
    });

    const impact = applyWeeklyOtotodeshiEffects(world, "heya-1", [senior, junior]);
    const updated = resolveImpacts(world, [impact]);

    // Senior should not be affected
    expect(updated.rikishi.get("s-1")?.fatigue ?? 0).toBe(0);
  });

  it("rikishi from other heya are not affected", () => {
    const riki = makeJunior("j-1", 40);
    riki.heyaId = "heya-2";
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
    });

    const impact = applyWeeklyOtotodeshiEffects(world, "heya-1", [riki]);
    const updated = resolveImpacts(world, [impact]);

    // No change since riki is from heya-2
    expect(updated.rikishi.get("j-1")?.fatigue ?? 0).toBe(0);
  });
});
