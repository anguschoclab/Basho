/**
 * V17-D02 — myoseki ownerId/holderId must never dangle after resolution.
 * Producers race on absolute `worldFields.myosekiMarket` writes (merge
 * last-wins), so a stale write can resurrect refs to oyakata that a
 * succession/merger already removed. The resolve-time sweep reconciles
 * dangling refs to the JSA pool regardless of merge order.
 */
import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { MyosekiMarket, MyosekiStock } from "@/engine/types/myoseki";
import type { Oyakata } from "@/engine/types/oyakata";

function stock(id: string, ownerId: string, holderId = ownerId): MyosekiStock {
  return {
    id,
    name: `Stock-${id}`,
    prestigeTier: "modest",
    ownerId,
    holderId,
    status: "held",
  } as unknown as MyosekiStock;
}

function worldWithMarket(oyakataIds: string[], stocks: MyosekiStock[]): WorldState {
  const world = makeMockWorld({
    heyas: new Map([["h1", makeMockHeya("h1", { oyakataId: "o-old" })]]),
  });
  world.oyakata = new Map(
    oyakataIds.map((id) => [id, { id, heyaId: "h1", name: id } as unknown as Oyakata])
  );
  world.myosekiMarket = {
    stocks: Object.fromEntries(stocks.map((s) => [s.id, s])),
    history: [],
  } as unknown as MyosekiMarket;
  return world;
}

describe("resolve-time myoseki ref sweep (V17-D02)", () => {
  it("sweeps a stock whose ownerId/holderId dangles after oyakata removal + stale market write", () => {
    const world = worldWithMarket(["o-old"], [stock("m1", "o-old")]);

    // Simulates the phase06 race: succession removes the oyakata while a
    // later producer's absolute market write (computed pre-succession)
    // resurrects the dangling ownerId via merge last-wins.
    const impact = createImpactBuilder("race")
      .build();
    impact.deletedEntities = { oyakataIds: ["o-old"] };
    impact.worldFields = {
      myosekiMarket: {
        ...world.myosekiMarket!,
        stocks: { m1: stock("m1", "o-old") },
      },
    } as never;

    const resolved = resolveImpacts(world, [impact]);
    const s = resolved.myosekiMarket!.stocks["m1"];
    expect(s.ownerId).toBe("JSA");
    expect(s.holderId).toBe("JSA");
    expect(s.status).toBe("available");
  });

  it("leaves stock owned by a live oyakata untouched", () => {
    const world = worldWithMarket(["o-live"], [stock("m1", "o-live")]);
    const resolved = resolveImpacts(world, [createImpactBuilder("noop").build()]);
    const s = resolved.myosekiMarket!.stocks["m1"];
    expect(s.ownerId).toBe("o-live");
    expect(s.status).toBe("held");
  });

  it("leaves JSA-owned stock untouched", () => {
    const world = worldWithMarket([], [stock("m1", "JSA")]);
    world.myosekiMarket!.stocks["m1"].status = "available";
    const resolved = resolveImpacts(world, [createImpactBuilder("noop").build()]);
    expect(resolved.myosekiMarket!.stocks["m1"].ownerId).toBe("JSA");
  });
});
