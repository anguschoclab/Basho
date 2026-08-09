import { describe, it, expect } from "vitest";
import {
  evaluateYaochoIndicators,
  calculateYaochoChance,
  checkYaocho,
  type YaochoIndicators,
} from "@/engine/bout/yaocho";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBoutResult(
  winnerId: string = "r-east",
  loserId: string = "r-west",
  overrides: Partial<BoutResult> = {}
): BoutResult {
  return {
    boutId: "bout-test-001",
    winner: "east",
    winnerRikishiId: winnerId,
    loserRikishiId: loserId,
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 10,
    excitementScore: 50,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 5,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  };
}

describe("Yaocho — evaluateYaochoIndicators", () => {
  it("detects same-heya bout", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });

    const indicators = evaluateYaochoIndicators(world, makeBoutResult(), basho, 15);
    expect(indicators.sameHeya).toBe(true);
  });

  it("detects different heya bout", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });

    const indicators = evaluateYaochoIndicators(world, makeBoutResult(), basho, 15);
    expect(indicators.sameHeya).toBe(false);
  });

  it("detects 7-7 loser on senshuraku", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 10, losses: 5 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    const indicators = evaluateYaochoIndicators(world, makeBoutResult(), basho, 15);
    expect(indicators.loserIs77OnSenshuraku).toBe(true);
  });

  it("does not flag 7-7 on non-senshuraku days", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 10 });
    basho.standings = new Map([
      ["r-east", { wins: 10, losses: 5 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    const indicators = evaluateYaochoIndicators(world, makeBoutResult(), basho, 10);
    expect(indicators.loserIs77OnSenshuraku).toBe(false);
  });

  it("detects suspiciously short bout", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });

    const result = makeBoutResult("r-east", "r-west", { duration: 2 });
    const indicators = evaluateYaochoIndicators(world, result, basho, 15);
    expect(indicators.suspiciouslyShort).toBe(true);
  });

  it("does not flag fusensho as suspiciously short", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });

    const result = makeBoutResult("r-east", "r-west", {
      duration: 0,
      kimarite: "fusensho",
    });
    const indicators = evaluateYaochoIndicators(world, result, basho, 15);
    expect(indicators.suspiciouslyShort).toBe(false);
  });
});

describe("Yaocho — calculateYaochoChance", () => {
  it("returns 0 when no indicators are present", () => {
    const indicators: YaochoIndicators = {
      sameHeya: false,
      loserIs77OnSenshuraku: false,
      h2hDominance: false,
      repeatedKimarite: false,
      suspiciouslyShort: false,
    };
    expect(calculateYaochoChance(indicators)).toBe(0);
  });

  it("increases with more indicators", () => {
    const none: YaochoIndicators = {
      sameHeya: false,
      loserIs77OnSenshuraku: false,
      h2hDominance: false,
      repeatedKimarite: false,
      suspiciouslyShort: false,
    };
    const one: YaochoIndicators = { ...none, sameHeya: true };
    const two: YaochoIndicators = { ...one, loserIs77OnSenshuraku: true };
    const three: YaochoIndicators = { ...two, suspiciouslyShort: true };

    expect(calculateYaochoChance(one)).toBeGreaterThan(0);
    expect(calculateYaochoChance(two)).toBeGreaterThan(calculateYaochoChance(one));
    expect(calculateYaochoChance(three)).toBeGreaterThan(calculateYaochoChance(two));
  });

  it("adds bonus for same-heya + 7-7 on senshuraku (classic yaocho pattern)", () => {
    const base: YaochoIndicators = {
      sameHeya: true,
      loserIs77OnSenshuraku: false,
      h2hDominance: false,
      repeatedKimarite: false,
      suspiciouslyShort: false,
    };
    const classic: YaochoIndicators = {
      ...base,
      loserIs77OnSenshuraku: true,
    };

    const baseChance = calculateYaochoChance(base);
    const classicChance = calculateYaochoChance(classic);
    // The classic pattern should be more than just adding one more indicator
    expect(classicChance).toBeGreaterThan(baseChance + 0.02);
  });

  it("caps at maximum chance", () => {
    const all: YaochoIndicators = {
      sameHeya: true,
      loserIs77OnSenshuraku: true,
      h2hDominance: true,
      repeatedKimarite: true,
      suspiciouslyShort: true,
    };
    expect(calculateYaochoChance(all)).toBeLessThanOrEqual(0.15);
  });
});

describe("Yaocho — checkYaocho", () => {
  it("skips fusensho results", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 7, losses: 7 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    const result = makeBoutResult("r-east", "r-west", {
      kimarite: "fusensho",
      duration: 0,
    });

    const impact = checkYaocho(world, result, basho, 15, "test-seed");
    expect(impact.events ?? []).toHaveLength(0);
  });

  it("does not trigger for clean bouts with no indicators", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 5 });
    basho.standings = new Map([
      ["r-east", { wins: 3, losses: 2 }],
      ["r-west", { wins: 2, losses: 3 }],
    ]);

    let triggered = false;
    for (let i = 0; i < 100; i++) {
      const impact = checkYaocho(world, makeBoutResult(), basho, 5, `seed-${i}`);
      if ((impact.events ?? []).length > 0) {
        triggered = true;
        break;
      }
    }
    expect(triggered).toBe(false);
  });

  it("can trigger for same-heya 7-7 senshuraku bout", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 8, losses: 6 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    let triggered = false;
    for (let i = 0; i < 500; i++) {
      const impact = checkYaocho(world, makeBoutResult(), basho, 15, `yaocho-${i}`);
      if ((impact.events ?? []).length > 0) {
        triggered = true;
        // Verify the event is a yaocho detection
        const event = (impact.events ?? []).find(
          (e) => (e.data as Record<string, unknown>)?.incident === "yaocho_detected"
        );
        expect(event).toBeDefined();
        break;
      }
    }
    expect(triggered).toBe(true);
  });

  it("is deterministic given the same seed", () => {
    const east = mockRikishi("r-east", { heyaId: "heya-1" });
    const west = mockRikishi("r-west", { heyaId: "heya-1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([
      ["r-east", { wins: 8, losses: 6 }],
      ["r-west", { wins: 7, losses: 7 }],
    ]);

    const seed = "deterministic-yaocho-12345";
    const impact1 = checkYaocho(world, makeBoutResult(), basho, 15, seed);
    const impact2 = checkYaocho(world, makeBoutResult(), basho, 15, seed);

    expect((impact1.events ?? []).length).toBe((impact2.events ?? []).length);
  });
});
