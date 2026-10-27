/**
 * Avatar propagation — shallow presenter DTOs that name a person must carry a
 * resolved `avatar` (or the entity's `avatarConfig`) so components can render
 * SumoAvatar without reaching back into the engine.
 */

import { describe, it, expect } from "vitest";
import { projectTsukebito } from "@/presenters/projections/tsukebitoProjections";
import { projectNakabi } from "@/presenters/projections/nakabiProjections";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

function rikishi(id: string, over: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi({
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "h1",
    nationality: "Japan",
    birthYear: 2000,
    age: 25,
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    height: 180,
    weight: 140,
    injured: false,
    stats: { aggression: 50 } as any,
    history: [],
    avatarConfig: generateAvatarIdentity({ seed: id, nationality: "Japan", role: "rikishi" }),
    ...over,
  });
}

function worldWith(rikishiList: Rikishi[], extra: Partial<WorldState> = {}): WorldState {
  return MockFactory.createWorld({
    seed: "avatar-prop",
    year: 2025,
    week: 8,
    rikishi: new Map(rikishiList.map((r) => [r.id, r])),
    heyas: new Map([
      [
        "h1",
        MockFactory.createHeya("h1", {
          name: "Test Heya",
          rikishiIds: rikishiList.map((r) => r.id),
        }),
      ],
    ]),
    currentBasho: { day: 8 } as WorldState["currentBasho"],
    ...extra,
  });
}

describe("projectTsukebito — avatar propagation", () => {
  const senior = rikishi("sen1", { rank: "sekiwake", rankNumber: 3, tsukebitoIds: ["jun1"] });
  const junior = rikishi("jun1", { rankNumber: 20 });
  const world = worldWith([senior, junior]);

  it("carries resolved avatars on assignment rows, seniors, and juniors", () => {
    const projection = projectTsukebito(world, "h1");

    expect(projection.assignments[0].seniorAvatar?.identity.seed).toBe("sen1");
    expect(projection.assignments[0].tsukebito[0].avatar?.identity.seed).toBe("jun1");
    expect(projection.eligibleSeniors[0].avatar?.identity.seed).toBe("sen1");
    expect(projection.eligibleJuniors[0].avatar?.identity.seed).toBe("jun1");
  });
});

describe("projectNakabi — avatar propagation", () => {
  it("enriches notable performers with resolved avatars from the roster", () => {
    const performer = rikishi("perf1");
    const world = worldWith([performer], {
      events: {
        log: [
          {
            type: "BASHO_STATUS",
            data: {
              status: "nakabi_checkpoint",
              bashoName: "hatsu",
              year: 2025,
              leaderId: "perf1",
              leaderWins: 8,
              leaderLosses: 0,
              undefeatedCount: 1,
              notablePerformers: [
                { rikishiId: "perf1", shikona: "Rikishi-perf1", wins: 8, losses: 0, note: "Leading" },
              ],
            },
          },
        ],
      } as any,
    });

    const { summary } = projectNakabi(world);
    expect(summary?.notablePerformers[0].avatar?.identity.seed).toBe("perf1");
  });
});
