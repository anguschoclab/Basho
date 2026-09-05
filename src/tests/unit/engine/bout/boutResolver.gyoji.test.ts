/**
 * boutResolver.gyoji.test.ts — tests boutResolver sets result.gyojiId when gyojiPool is populated.
 * Plan Feature 6 Test-First Protocol item 3.
 */
import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutContext } from "@/engine/bout/boutUtils";

function makeRikishi(id: string, shikona: string): Rikishi {
  return {
    id,
    shikona,
    heyaId: "h1",
    nationality: "Japan",
    birthYear: 1990,
    height: 180,
    weight: 120,
    momentum: 50,
    fatigue: 0,
    injured: false,
    injuryWeeksRemaining: 0,
    rank: "maegashira" as any,
    rankNumber: 10,
    stats: {
      technique: 60,
      speed: 60,
      strength: 60,
      stamina: 60,
      mental: 60,
      aggression: 50,
      flexibility: 50,
    },
    combatProfile: {
      archetype: "power" as any,
      preferredKimarite: ["oshi" as any],
    },
    careerRecord: { wins: 0, losses: 0, absences: 0 },
    h2h: {},
    rivalryIds: [],
  } as any;
}

function makeBout(east: Rikishi, west: Rikishi): BoutContext {
  return {
    id: "b1",
    day: 1,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
}

describe("boutResolver gyoji assignment", () => {
  it("sets result.gyojiId when gyojiPool is populated", () => {
    const world = generateInitialWorld("bout-gyoji-test");
    expect(world.gyojiPool).toBeDefined();
    expect(world.gyojiPool!.length).toBeGreaterThan(0);

    const east = makeRikishi("e1", "East");
    const west = makeRikishi("w1", "West");
    const bout = makeBout(east, west);
    const basho = {
      bashoId: "2026-01",
      year: 2026,
      month: 1,
      day: 1,
      phase: "active_basho",
    } as any;

    const { result } = resolveBout(bout, east, west, basho, undefined, world);
    expect(result.gyojiId).toBeDefined();
    expect(typeof result.gyojiId).toBe("string");
  });
});
