import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

function makeBashoWorldForPromotion(opts: {
  ozekiId: string;
  currentWins: number;
  currentLosses: number;
  prevYusho?: boolean;
  prevJunYusho?: boolean;
  prevWins?: number;
  isYushoThisBasho?: boolean;
  isJunYushoThisBasho?: boolean;
  hasActiveYokozuna?: boolean;
}): WorldState {
  const world = makeMockWorld({
    cyclePhase: "post_basho",
    history: [],
  });

  world.currentBasho = makeMockBasho({
    bashoName: "hatsu",
    standings: new Map([
      [opts.ozekiId, { wins: opts.currentWins, losses: opts.currentLosses, absences: 0 }],
    ]),
  });

  world.history.push({
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: opts.isYushoThisBasho ? opts.ozekiId : "someone-else",
    junYusho: opts.isJunYushoThisBasho ? [opts.ozekiId] : [],
    ginoSho: "none",
    shukunsho: "none",
    kantosho: "none",
    stats: [],
    id: "basho-1",
  } as any);

  const ozeki = mockRikishi(opts.ozekiId, {
    rank: "ozeki",
    division: "makuuchi",
    heyaId: "heya-1",
    shikona: `Ozeki-${opts.ozekiId}`,
    careerHistory: [
      {
        id: "prev-basho",
        bashoId: "kyushu-2024",
        year: 2024,
        month: 0,
        bashoName: "kyushu",
        rank: "ozeki",
        division: "makuuchi",
        rankNumber: 1,
        side: "east",
        wins: opts.prevWins ?? 13,
        losses: 2,
        absences: 0,
        isYusho: opts.prevYusho ?? false,
        isJunYusho: opts.prevJunYusho ?? false,
        specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
        weight: 140,
        momentum: 0,
      },
    ] as any,
  });
  world.rikishi.set(opts.ozekiId, ozeki);
  world.activeRikishiIds.add(opts.ozekiId);

  if (!opts.hasActiveYokozuna) {
    // No yokozuna in the world — vacancy scenario
  } else {
    const yoko = mockRikishi("yoko-1", {
      rank: "yokozuna",
      division: "makuuchi",
      heyaId: "heya-1",
      shikona: "ExistingYokozuna",
    });
    world.rikishi.set("yoko-1", yoko);
    world.activeRikishiIds.add("yoko-1");
  }

  return world;
}

describe("yokozuna promotion Case 2 — 1 yusho + 1 jun-yusho (13+ wins both)", () => {
  it("promotes ozeki to yokozuna with prev yusho + current jun-yusho (13+ wins)", () => {
    const world = makeBashoWorldForPromotion({
      ozekiId: "oz-1",
      currentWins: 13,
      currentLosses: 2,
      prevYusho: true,
      prevWins: 14,
      isJunYushoThisBasho: true,
      hasActiveYokozuna: true,
    });

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const updated = newWorld.rikishi.get("oz-1");
    expect(updated).toBeDefined();
    expect(updated!.rank).toBe("yokozuna");
  });

  it("promotes ozeki to yokozuna with prev jun-yusho + current yusho (13+ wins)", () => {
    const world = makeBashoWorldForPromotion({
      ozekiId: "oz-2",
      currentWins: 14,
      currentLosses: 1,
      prevJunYusho: true,
      prevWins: 13,
      isYushoThisBasho: true,
      hasActiveYokozuna: true,
    });

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const updated = newWorld.rikishi.get("oz-2");
    expect(updated).toBeDefined();
    expect(updated!.rank).toBe("yokozuna");
  });

  it("does NOT promote ozeki with jun-yusho but < 13 wins", () => {
    const world = makeBashoWorldForPromotion({
      ozekiId: "oz-3",
      currentWins: 12,
      currentLosses: 3,
      prevYusho: true,
      prevWins: 14,
      isJunYushoThisBasho: true,
      hasActiveYokozuna: true,
    });

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const updated = newWorld.rikishi.get("oz-3");
    expect(updated).toBeDefined();
    expect(updated!.rank).toBe("ozeki");
  });
});
