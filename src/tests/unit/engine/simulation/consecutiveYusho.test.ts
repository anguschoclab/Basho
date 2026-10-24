import { describe, it, expect } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";

/**
 * consecutiveYusho contract (V13-B01).
 *
 * persistBashoState increments the yusho winner's streak but never resets
 * anyone else's — every rikishi who does NOT win the basho must have their
 * streak cleared, including kyujo / non-sekitori rikishi absent from
 * `standings` (the sweep must cover the full rikishi map, not just
 * participants).
 */
function mkWorld(streaks: Record<string, number>, boostedIds: string[]) {
  const world = MockFactory.createWorld();
  const heyas = ["h1", "h2", "h3", "h4"].map((h) => MockFactory.createHeya(h as Id, {}));
  for (const h of heyas) world.heyas.set(h.id, h);
  const rikishi = new Map<Id, Rikishi>();
  for (let i = 0; i < 14; i++) {
    const id = `r${i}` as Id;
    const isBoosted = boostedIds.includes(id);
    const r = MockFactory.createRikishi(id, {
      heyaId: heyas[i % 4].id,
      division: "makuuchi",
      rank: i < 2 ? "ozeki" : "maegashira",
      rankNumber: Math.floor(i / 2) + 1,
      side: i % 2 === 0 ? "east" : "west",
      consecutiveYusho: streaks[id] ?? 0,
      ...(isBoosted
        ? {
            condition: 100,
            motivation: 100,
            stats: {
              power: 95,
              technique: 95,
              speed: 95,
              balance: 95,
              stamina: 85,
              mental: 85,
            } as Rikishi["stats"],
          }
        : {
            stats: {
              power: 30,
              technique: 30,
              speed: 30,
              balance: 30,
              stamina: 30,
              mental: 30,
            } as Rikishi["stats"],
          }),
    });
    rikishi.set(id, r);
  }
  // A non-sekitori rikishi carrying a stale streak — never appears in
  // `standings` but must still be reset by the sweep.
  const fringe = MockFactory.createRikishi("fringe1" as Id, {
    heyaId: heyas[0].id,
    division: "jonokuchi",
    rank: "jonokuchi",
    consecutiveYusho: streaks["fringe1"] ?? 0,
  });
  rikishi.set("fringe1" as Id, fringe);
  world.rikishi = rikishi;
  world.activeRikishiIds = new Set(rikishi.keys());
  return world;
}

describe("consecutiveYusho lifecycle", () => {
  it("increments the yusho winner's streak by exactly 1", () => {
    const world = mkWorld({ r0: 2 }, ["r0"]);
    const res = simulateEntireBasho(world, "hatsu", "streak-seed-1");

    const winner = res.finalWorld.rikishi.get(res.yushoWinner.id as Id);
    expect(winner).toBeDefined();
    // Whoever won, their streak = their previous streak + 1.
    const prevStreaks: Record<string, number> = { r0: 2 };
    expect(winner!.consecutiveYusho).toBe((prevStreaks[res.yushoWinner.id] ?? 0) + 1);
    expect(res.yushoWinner.id).toBe("r0");
  });

  it("a winner with no prior streak starts at 1", () => {
    const streaks: Record<string, number> = { r0: 0, r1: 5 };
    const world = mkWorld(streaks, ["r0"]);
    const res = simulateEntireBasho(world, "hatsu", "streak-seed-2");

    const winner = res.finalWorld.rikishi.get(res.yushoWinner.id as Id);
    expect(winner!.consecutiveYusho).toBe((streaks[res.yushoWinner.id] ?? 0) + 1);
  });

  it("resets every non-winner's streak to 0 when the basho concludes", () => {
    const world = mkWorld({ r0: 1, r1: 4, r2: 2, r5: 7, fringe1: 3 }, ["r0"]);
    const res = simulateEntireBasho(world, "hatsu", "streak-seed-3");

    for (const [id, r] of res.finalWorld.rikishi) {
      if (id === res.yushoWinner.id) {
        expect(r.consecutiveYusho).toBeGreaterThan(0);
      } else {
        expect(r.consecutiveYusho).toBe(0);
      }
    }
  });

  it("resets a streaking rikishi who did not participate (kyujo / non-sekitori)", () => {
    const world = mkWorld({ fringe1: 5 }, ["r0"]);
    const res = simulateEntireBasho(world, "hatsu", "streak-seed-4");

    // fringe1 is jonokuchi — never enters `standings` — but its stale
    // streak must still be swept by the map-wide reset.
    const fringe = res.finalWorld.rikishi.get("fringe1" as Id);
    expect(fringe).toBeDefined();
    expect(fringe!.consecutiveYusho).toBe(0);
  });
});
