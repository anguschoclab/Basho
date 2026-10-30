import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  tickMonthlyKoenkaiDemands,
  resolveKoenkaiDemand,
  koenkaiDemandDecisionId,
  KOENKAI_DEMANDS,
} from "@/engine/economy/koenkaiDemands";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { Koenkai } from "@/engine/types/sponsors";

function makeWorld(withKoenkai = true) {
  const heya = MockFactory.createHeya("h1", { funds: 5_000_000 });
  heya.koenkaiId = "k1";
  const koenkai: Koenkai = {
    koenkaiId: "k1",
    heyaId: "h1",
    strengthBand: "medium" as Koenkai["strengthBand"],
    members: [
      { relId: "rel1", sponsorId: "s1", targetType: "heya", targetId: "h1", role: "koenkai_member", strength: 5, startedAtTick: 0 },
      { relId: "rel2", sponsorId: "s2", targetType: "heya", targetId: "h1", role: "koenkai_member", strength: 1, startedAtTick: 0 },
    ],
    createdAtTick: 0,
    lastChangedTick: 0,
  };
  const sponsors = new Map([
    ["s1", { sponsorId: "s1", satisfaction: 60 } as never],
    ["s2", { sponsorId: "s2", satisfaction: 40 } as never],
  ]);
  const world = MockFactory.createWorld({
    week: 10,
    playerHeyaId: "h1",
    heyas: new Map([["h1", heya]]),
    sponsorPool: withKoenkai
      ? ({ koenkais: new Map([["k1", koenkai]]), sponsors } as never)
      : undefined,
  });
  return { world, heya, koenkai };
}

describe("tickMonthlyKoenkaiDemands", () => {
  it("emits at most one koenkai_demand decision when it fires", () => {
    // run across several weeks — at least one week must produce a demand
    let saw = false;
    for (let w = 1; w <= 20; w++) {
      const { world } = makeWorld();
      world.week = w;
      const impact = tickMonthlyKoenkaiDemands(world);
      const dec = (impact.worldFields?.pendingDecisions ?? []).filter(
        (d: { type: string }) => d.type === "koenkai_demand"
      );
      if (dec.length > 0) {
        saw = true;
        expect(dec.length).toBe(1);
        expect(dec[0].options.map((o: { id: string }) => o.id)).toEqual(["comply", "decline"]);
      }
    }
    expect(saw).toBe(true);
  });

  it("suppresses demands in autonomous sims", () => {
    const { world } = makeWorld();
    world._autonomousSim = true;
    const impact = tickMonthlyKoenkaiDemands(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
  });
});

describe("resolveKoenkaiDemand", () => {
  it("comply: deducts fee and raises member satisfaction", () => {
    const { world } = makeWorld();
    const id = koenkaiDemandDecisionId("tickets", world);
    const builder = createImpactBuilder("t");
    resolveKoenkaiDemand(world, builder, id, "comply");
    const impact = builder.build();
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number };
    expect(heyaUp?.funds).toBe(5_000_000 - KOENKAI_DEMANDS.tickets.feeYen);
    const sp = impact.entities?.sponsorUpdates?.get("s1") as { satisfaction?: number };
    expect(sp?.satisfaction).toBe(60 + KOENKAI_DEMANDS.tickets.complySatisfaction);
  });

  it("decline: lowers satisfaction and can churn the weakest member", () => {
    const { world } = makeWorld();
    const id = koenkaiDemandDecisionId("gala", world); // churnPct 4 — may or may not churn
    const builder = createImpactBuilder("t");
    resolveKoenkaiDemand(world, builder, id, "decline");
    const impact = builder.build();
    const sp = impact.entities?.sponsorUpdates?.get("s2") as { satisfaction?: number };
    expect(sp?.satisfaction).toBe(40 + KOENKAI_DEMANDS.gala.declineSatisfaction);
    // funds untouched on decline
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number } | undefined;
    expect(heyaUp?.funds ?? 5_000_000).toBe(5_000_000);
  });
});
