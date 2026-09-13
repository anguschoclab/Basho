import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { scheduleDivisionDay } from "@/engine/schedule";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RivalriesState } from "@/constants/engine/rivalry";

/**
 * WS4 contract test — `world.matchmakingOverride` (written by
 * PoliticalFavorsService.requestFavor "matchmaking_avoid") must be CONSUMED by
 * day-1 schedule generation: the requester's rikishi must not be paired against
 * their hottest rival heya. Before this, the field was write-only.
 */

function buildMakuuchiWorld(withOverride: boolean): WorldState {
  // 12 makuuchi rikishi: 4 from requester heya, 4 from rival heya, 4 neutral.
  const rikishi = new Map<string, Rikishi>();
  const mk = (id: string, heyaId: string) => {
    rikishi.set(
      id,
      MockFactory.createRikishi(id, {
        heyaId,
        division: "makuuchi",
        rank: "maegashira",
      })
    );
  };
  for (let i = 0; i < 4; i++) mk(`req-${i}`, "heya-req");
  for (let i = 0; i < 4; i++) mk(`riv-${i}`, "heya-riv");
  for (let i = 0; i < 4; i++) mk(`neu-${i}`, "heya-neu");

  const rivalriesState: RivalriesState = {
    version: "1.0.0",
    pairs: {},
    heyaRivalryPairs: {
      "heya-req|heya-riv": {
        id: "heya-req|heya-riv",
        heyaAId: "heya-req",
        heyaBId: "heya-riv",
        heat: 90,
        aWins: 3,
        bWins: 3,
      } as never,
    },
  };

  const heyas = new Map([
    ["heya-req", MockFactory.createHeya("heya-req", { rikishiIds: ["req-0", "req-1", "req-2", "req-3"] })],
    ["heya-riv", MockFactory.createHeya("heya-riv", { rikishiIds: ["riv-0", "riv-1", "riv-2", "riv-3"] })],
    ["heya-neu", MockFactory.createHeya("heya-neu", { rikishiIds: ["neu-0", "neu-1", "neu-2", "neu-3"] })],
  ]);

  const basho = MockFactory.createBasho({
    day: 1,
    matches: [],
    standings: new Map(
      [...rikishi.keys()].map((id) => [id, { wins: 0, losses: 0 } as never])
    ),
  });

  return MockFactory.createWorld({
    rikishi,
    heyas,
    currentBasho: basho,
    rivalriesState,
    matchmakingOverride: withOverride
      ? { type: "avoid_rival", requesterId: "heya-req" }
      : undefined,
  });
}

describe("matchmakingOverride consumer", () => {
  it("day-1 schedule avoids pairing requester rikishi vs their hottest rival heya", () => {
    const world = buildMakuuchiWorld(true);
    const basho = world.currentBasho!;
    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });
    expect(scheduled.length).toBeGreaterThan(0);
    const heyaOf = (id: string) => world.rikishi.get(id)?.heyaId;
    for (const m of scheduled) {
      const pair = [heyaOf(m.eastRikishiId), heyaOf(m.westRikishiId)].sort();
      expect(pair).not.toEqual(["heya-req", "heya-riv"]);
    }
  });

  it("is a one-shot override — consumed override clears from world", () => {
    const world = buildMakuuchiWorld(true);
    const basho = world.currentBasho!;
    const { impact } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });
    expect(
      Object.prototype.hasOwnProperty.call(
        impact.worldFields ?? {},
        "matchmakingOverride"
      )
    ).toBe(true);
    expect(impact.worldFields?.matchmakingOverride).toBeUndefined();
  });

  it("without override, normal scheduling is unaffected", () => {
    const world = buildMakuuchiWorld(false);
    const basho = world.currentBasho!;
    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });
    expect(scheduled.length).toBeGreaterThan(0);
  });
});
