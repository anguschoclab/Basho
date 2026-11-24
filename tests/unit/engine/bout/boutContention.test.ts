import { describe, it, expect } from "vitest";
import { isYushoContention, isPlayoffScenario } from "@/engine/bout/boutContention";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import { makeMockBasho } from "@tests/unit/engine/utils";

function makeRikishi(
  id: string,
  rank: string = "maegashira",
  division: Rikishi["division"] = "makuuchi"
): Rikishi {
  return {
    id,
    rank,
    division,
    stats: {
      aggression: 50,
      mental: 50,
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      stamina: 50,
    },
  } as unknown as Rikishi;
}

// Standings resolve ids → rikishi via world.rikishi for division scoping.
// `extra` seeds standings-only rikishi (e.g. a "leader" with no bout slot).
function mkWorld(rikishi: Rikishi[], extraIds: string[] = []): WorldState {
  const map = new Map<string, Rikishi>();
  for (const r of rikishi) map.set(r.id, r);
  for (const id of extraIds) if (!map.has(id)) map.set(id, makeRikishi(id));
  return { rikishi: map } as unknown as WorldState;
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
      const world = mkWorld([east, west], ["leader"]);
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }), world)).toBe(
        true
      );
    });

    it("returns false when one rikishi is more than 2 wins behind leader", () => {
      const standings = new Map([
        ["leader", { wins: 10, losses: 0 }],
        ["east", { wins: 9, losses: 1 }],
        ["west", { wins: 5, losses: 5 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west], ["leader"]);
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }), world)).toBe(
        false
      );
    });

    it("returns true when both are leaders", () => {
      const standings = new Map([
        ["east", { wins: 10, losses: 0 }],
        ["west", { wins: 10, losses: 0 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west]);
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }), world)).toBe(
        true
      );
    });

    it("returns false when standings is empty", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west]);
      expect(
        isYushoContention(east, west, makeMockBasho({ standings: new Map(), day: 10 }), world)
      ).toBe(false);
    });

    it("returns false when standings is undefined", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west]);
      const basho = {
        id: "test",
        day: 10,
        isActive: true,
        standings: undefined,
      } as unknown as Parameters<typeof isYushoContention>[2];
      expect(isYushoContention(east, west, basho, world)).toBe(false);
    });

    it("handles rikishi not in standings (0 wins)", () => {
      const standings = new Map([
        ["leader", { wins: 10, losses: 0 }],
        ["east", { wins: 9, losses: 1 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west], ["leader"]);
      expect(isYushoContention(east, west, makeMockBasho({ standings, day: 10 }), world)).toBe(
        false
      );
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
      const world = mkWorld([east, west], ["other"]);
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings, day: 15 }), world)).toBe(
        true
      );
    });

    it("returns false on non-final day even if tied for lead", () => {
      const standings = new Map([
        ["east", { wins: 10, losses: 0 }],
        ["west", { wins: 10, losses: 0 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west]);
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings, day: 10 }), world)).toBe(
        false
      );
    });

    it("returns false on final day when not tied", () => {
      const standings = new Map([
        ["east", { wins: 14, losses: 0 }],
        ["west", { wins: 12, losses: 2 }],
      ]);
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west]);
      expect(isPlayoffScenario(east, west, makeMockBasho({ standings, day: 15 }), world)).toBe(
        false
      );
    });

    it("returns false when standings is empty", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west]);
      expect(
        isPlayoffScenario(east, west, makeMockBasho({ standings: new Map(), day: 15 }), world)
      ).toBe(false);
    });
  });

  describe("leader-wins derivation invalidation", () => {
    it("recomputes when the standings Map object is replaced (next-bout standings)", () => {
      const east = makeRikishi("east");
      const west = makeRikishi("west");
      const world = mkWorld([east, west], ["leader"]);

      // Bout N: leader at 10, east at 9 — in window.
      const standingsN = new Map([
        ["leader", { wins: 10, losses: 0 }],
        ["east", { wins: 9, losses: 1 }],
        ["west", { wins: 9, losses: 1 }],
      ]);
      const bashoN = makeMockBasho({ standings: standingsN, day: 10 });
      expect(isYushoContention(east, west, bashoN, world)).toBe(true);

      // Bout N+1: standings object replaced with east now 4 behind — out of window.
      const standingsN1 = new Map([
        ["leader", { wins: 11, losses: 0 }],
        ["east", { wins: 7, losses: 4 }],
        ["west", { wins: 9, losses: 2 }],
      ]);
      const bashoN1 = makeMockBasho({ standings: standingsN1, day: 10 });
      expect(isYushoContention(east, west, bashoN1, world)).toBe(false);
    });
  });
});
