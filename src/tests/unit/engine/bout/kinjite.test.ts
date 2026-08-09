import { describe, it, expect } from "vitest";
import { calculateHansokuChance, tryHansoku } from "@/engine/bout/kinjite";
import { mockRikishi, makeMockBasho } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutUtils";

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-test-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

function makeBoutResult(winner: "east" | "west" = "east"): BoutResult {
  return {
    boutId: "bout-test-001",
    winner,
    winnerRikishiId: winner === "east" ? "r-east" : "r-west",
    loserRikishiId: winner === "east" ? "r-west" : "r-east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: winner,
    duration: 10,
    excitementScore: 50,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 5,
    inBoutInjury: null,
    isTimeout: false,
  };
}

describe("Kinjite (hansoku/DQ) — calculateHansokuChance", () => {
  it("returns 0 for high-technique rikishi (ratio < 1.4)", () => {
    const winner = mockRikishi("r-east", { aggression: 60, technique: 80 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    expect(calculateHansokuChance(winner, bout, basho)).toBe(0);
  });

  it("returns > 0 for high-aggression/low-technique on day 15 with 7-7", () => {
    const winner = mockRikishi("r-east", { aggression: 95, technique: 25 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    expect(calculateHansokuChance(winner, bout, basho)).toBeGreaterThan(0);
  });

  it("scales with desperation — day 15 + 7-7 > day 1", () => {
    const winner = mockRikishi("r-east", { aggression: 95, technique: 25 });

    const day15Bout = makeBoutContext({ day: 15 });
    const day15Basho = makeMockBasho({ day: 15 });
    day15Basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    const day1Bout = makeBoutContext({ day: 1 });
    const day1Basho = makeMockBasho({ day: 1 });
    day1Basho.standings = new Map([["r-east", { wins: 0, losses: 0 }]]);

    const day15Chance = calculateHansokuChance(winner, day15Bout, day15Basho);
    const day1Chance = calculateHansokuChance(winner, day1Bout, day1Basho);

    expect(day15Chance).toBeGreaterThan(day1Chance);
  });

  it("adds bonus for kadoban ozeki", () => {
    const winner = mockRikishi("r-east", {
      aggression: 95,
      technique: 25,
      rank: "ozeki",
    });

    const kadobanBout = makeBoutContext({ day: 12 });
    const kadobanBasho = makeMockBasho({ day: 12 });
    kadobanBasho.standings = new Map([["r-east", { wins: 5, losses: 6 }]]);

    const normalBout = makeBoutContext({ day: 12 });
    const normalBasho = makeMockBasho({ day: 12 });
    normalBasho.standings = new Map([["r-east", { wins: 9, losses: 2 }]]);

    const kadobanChance = calculateHansokuChance(winner, kadobanBout, kadobanBasho);
    const normalChance = calculateHansokuChance(winner, normalBout, normalBasho);

    expect(kadobanChance).toBeGreaterThan(normalChance);
  });

  it("caps at maximum probability", () => {
    const winner = mockRikishi("r-east", { aggression: 100, technique: 1 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    expect(calculateHansokuChance(winner, bout, basho)).toBeLessThanOrEqual(0.05);
  });
});

describe("Kinjite (hansoku/DQ) — tryHansoku", () => {
  it("does not fire for fusensho results", () => {
    const east = mockRikishi("r-east", { aggression: 95, technique: 25 });
    const west = mockRikishi("r-west", { technique: 70 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 7, losses: 7 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    const fusenshoResult: BoutResult = {
      ...makeBoutResult("east"),
      kimarite: "fusensho",
      kimariteName: "Fusensho",
      duration: 0,
    };

    const { result, fouledHeyaId } = tryHansoku(
      bout,
      fusenshoResult,
      east,
      west,
      basho,
      "test-seed"
    );
    expect(result.kimarite).toBe("fusensho");
    expect(fouledHeyaId).toBeNull();
  });

  it("does not fire for high-technique winner", () => {
    const east = mockRikishi("r-east", { aggression: 60, technique: 80 });
    const west = mockRikishi("r-west", { technique: 70 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 7, losses: 7 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    let dqFired = false;
    for (let i = 0; i < 200; i++) {
      const { result } = tryHansoku(bout, makeBoutResult("east"), east, west, basho, `seed-${i}`);
      if (result.kimarite === "hansoku") {
        dqFired = true;
        break;
      }
    }
    expect(dqFired).toBe(false);
  });

  it("flips result when DQ fires — original winner becomes loser", () => {
    const east = mockRikishi("r-east", { aggression: 95, technique: 25, heyaId: "heya-east" });
    const west = mockRikishi("r-west", { technique: 70, heyaId: "heya-west" });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 7, losses: 7 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    let dqFound = false;
    for (let i = 0; i < 500; i++) {
      const { result, fouledHeyaId } = tryHansoku(
        bout,
        makeBoutResult("east"),
        east,
        west,
        basho,
        `seed-hansoku-${i}`
      );
      if (result.kimarite === "hansoku") {
        dqFound = true;
        expect(result.winner).toBe("west");
        expect(result.winnerRikishiId).toBe("r-west");
        expect(result.loserRikishiId).toBe("r-east");
        expect(result.upset).toBe(true);
        expect(fouledHeyaId).toBe("heya-east");
        expect(result.kimariteName).toBe("Hansoku");
        break;
      }
    }
    expect(dqFound).toBe(true);
  });

  it("is deterministic given the same seed", () => {
    const east = mockRikishi("r-east", { aggression: 95, technique: 25 });
    const west = mockRikishi("r-west", { technique: 70 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 7, losses: 7 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    const seed = "deterministic-seed-12345";
    const call1 = tryHansoku(bout, makeBoutResult("east"), east, west, basho, seed);
    const call2 = tryHansoku(bout, makeBoutResult("east"), east, west, basho, seed);

    expect(call1.result.kimarite).toBe(call2.result.kimarite);
    expect(call1.result.winner).toBe(call2.result.winner);
  });
});
