import { describe, it, expect } from "vitest";
import { isYushoContention, isPlayoffScenario } from "@/engine/bout/boutContention";
import type { Rikishi } from "@/engine/types/rikishi";
import { makeMockBasho } from "../utils";

function makeRikishi(id: string, rank: string = "maegashira"): Rikishi {
  return {
    id,
    rank,
    stats: { aggression: 50, mental: 50, power: 50, speed: 50, technique: 50, balance: 50, stamina: 50 },
  } as unknown as Rikishi;
}

describe("boutContention", () => {
  describe("isYushoContention", () => {
    it("returns true when both rikishi within 2 wins of leader", () => {
      const standings = new Map([
        ["leader", { wins: 10, losses: 0 }],
        ["east", { wins: 9, losses: 1 }],
        ["west", { wins: 8, losses: 2 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }))).toBe(true);
    });

    it("returns false when one rikishi is more than 2 wins behind leader", () => {
      const standings = new Map([
        ["leader", { wins: 10, losses: 0 }],
        ["east", { wins: 9, losses: 1 }],
        ["west", { wins: 5, losses: 5 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }))).toBe(false);
    });

    it("returns true when both are leaders", () => {
      const standings = new Map([
        ["east", { wins: 10, losses: 0 }],
        ["west", { wins: 10, losses: 0 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }))).toBe(true);
    });

    it("returns false when standings is empty", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isYushoContention(east, west, makeMockBasho({ standings: new Map(), day: 10 }))).toBe(false);
    });

    it("returns false when standings is undefined", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const basho = { id: "test", day: 10, isActive: true, standings: undefined } as unknown as Parameters<typeof isYushoContention>[2];
      expect(isYushoContention(east, west, basho)).toBe(false);
    });

    it("handles rikishi not in standings (0 wins)", () => {
      const standings = new Map([
        ["leader", { wins: 10, losses: 0 }],
        ["east", { wins: 9, losses: 1 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }))).toBe(false);
    });
  });

  describe("isPlayoffScenario", () => {
    it("returns true on final day when both tied for lead", () => {
      const standings = new Map([
        ["east", { wins: 14, losses: 0 }],
        ["west", { wins: 14, losses: 0 }],
        ["other", { wins: 10, losses: 4 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings, day: 15 }))).toBe(true);
    });

    it("returns false on non-final day even if tied for lead", () => {
      const standings = new Map([
        ["east", { wins: 10, losses: 0 }],
        ["west", { wins: 10, losses: 0 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings, day: 10 }))).toBe(false);
    });

    it("returns false on final day when not tied", () => {
      const standings = new Map([
        ["east", { wins: 14, losses: 0 }],
        ["west", { wins: 12, losses: 2 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings, day: 15 }))).toBe(false);
    });

    it("returns false when standings is empty", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings: new Map(), day: 15 }))).toBe(false);
    });
  });
});
