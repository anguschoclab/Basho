import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { scheduleDivisionDay } from "@/engine/calendar/schedule";
import { toKeyedMap } from "@/engine/utils/index";
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
    [
      "heya-req",
      MockFactory.createHeya("heya-req", { rikishiIds: ["req-0", "req-1", "req-2", "req-3"] }),
    ],
    [
      "heya-riv",
      MockFactory.createHeya("heya-riv", { rikishiIds: ["riv-0", "riv-1", "riv-2", "riv-3"] }),
    ],
    [
      "heya-neu",
      MockFactory.createHeya("heya-neu", { rikishiIds: ["neu-0", "neu-1", "neu-2", "neu-3"] }),
    ],
  ]);

  const basho = MockFactory.createBasho({
    day: 1,
    matches: [],
    standings: toKeyedMap(
      [...rikishi.keys()],
      (id) => id,
      () => ({ wins: 0, losses: 0 }) as never
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
      Object.prototype.hasOwnProperty.call(impact.worldFields ?? {}, "matchmakingOverride")
    ).toBe(true);
    expect(impact.worldFields?.matchmakingOverride).toBeUndefined();
  });

  it("characterization: equal-heat multi-rival schedule is pinned (rival-selection refactor must be byte-identical)", () => {
    // Pins the exact produced schedule for a two-rival tie composition. The
    // rival-selection equivalence (stable-sort first-max ≡ strict-> first-max)
    // is proven statically; this snapshot locks the observable output.
    const rikishi = new Map<string, Rikishi>();
    const mk = (id: string, heyaId: string) => {
      rikishi.set(
        id,
        MockFactory.createRikishi(id, { heyaId, division: "makuuchi", rank: "maegashira" })
      );
    };
    for (let i = 0; i < 6; i++) mk(`req-${i}`, "heya-req");
    for (let i = 0; i < 6; i++) mk(`rivA-${i}`, "heya-rivA");
    for (let i = 0; i < 6; i++) mk(`rivB-${i}`, "heya-rivB");

    const mkPair = (aId: string, bId: string, heat: number) =>
      ({ id: `${aId}|${bId}`, heyaAId: aId, heyaBId: bId, heat, aWins: 1, bWins: 1 }) as never;
    const world = MockFactory.createWorld({
      rikishi,
      heyas: new Map([
        ["heya-req", MockFactory.createHeya("heya-req", { rikishiIds: [...Array(6)].map((_, i) => `req-${i}`) })],
        ["heya-rivA", MockFactory.createHeya("heya-rivA", { rikishiIds: [...Array(6)].map((_, i) => `rivA-${i}`) })],
        ["heya-rivB", MockFactory.createHeya("heya-rivB", { rikishiIds: [...Array(6)].map((_, i) => `rivB-${i}`) })],
      ]),
      currentBasho: MockFactory.createBasho({
        day: 1,
        matches: [],
        standings: toKeyedMap([...rikishi.keys()], (id) => id, () => ({ wins: 0, losses: 0 }) as never),
      }),
      rivalriesState: {
        version: "1.0.0",
        pairs: {},
        heyaRivalryPairs: {
          "heya-req|heya-rivA": mkPair("heya-req", "heya-rivA", 90),
          "heya-req|heya-rivB": mkPair("heya-req", "heya-rivB", 90),
        },
      } as never,
      matchmakingOverride: { type: "avoid_rival", requesterId: "heya-req" } as never,
    });

    const { scheduled, impact } = scheduleDivisionDay({
      world,
      basho: world.currentBasho!,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    expect(scheduled.map((m) => `${m.eastRikishiId}v${m.westRikishiId}`)).toEqual([
      "req-0vrivA-0",
      "req-1vrivA-1",
      "req-2vrivA-2",
      "req-3vrivA-3",
      "req-4vrivA-4",
      "req-5vrivA-5",
    ]);
    expect(scheduled.every((m) => !(m.reasons ?? []).includes("favor_avoid_rival"))).toBe(true);
    // Override is still consumed even though no repair could fire.
    expect(impact.worldFields && "matchmakingOverride" in impact.worldFields).toBe(true);
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
