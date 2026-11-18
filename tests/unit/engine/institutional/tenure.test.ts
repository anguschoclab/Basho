/**
 * WS5 — Oyakata tenure instrumentation.
 *
 * `oyakata.tenure` records what actually happened during a reign so that
 * succession triggers (§16.1) and trait inheritance (§16.3) have real
 * measured inputs instead of vibes:
 *   { startedYear, bashoServed, championships, sekitoriProduced,
 *     insolvencyEvents, majorScandals, forcedMergers }
 *
 * Producers instrumented at their canonical sites:
 *   recordBashoHistory (bashoServed, championships, underperformance streak),
 *   applyNewRanks (sekitoriProduced), issueBailoutLoanIfNeeded
 *   (insolvencyEvents), reportScandal (majorScandals), executeMerger
 *   (forcedMergers).
 */

import { describe, it, expect } from "vitest";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { applyBashoTenure } from "@/engine/legacy/tenure";
import { applyNewRanks } from "@/engine/banzuke/publish/newRanks";
import { issueBailoutLoanIfNeeded } from "@/engine/economy/loans";
import { reportScandal } from "@/engine/governance/services/ScandalService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { toKeyedMap } from "@/engine/utils/index";
import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BanzukeEntry, MovementEvent, Division, Rank } from "@/engine/types/banzuke";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function tenureWorld(): { world: WorldState; oya: Oyakata } {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const oya = {
    id: "o1",
    heyaId: "h1",
    archetype: "traditionalist",
    traits: { ...TRAITS },
    yearsInCharge: 3,
    shikona: "Oya",
    name: "Oya",
  } as unknown as Oyakata;
  world.oyakata.set("o1", oya);
  world.heyas.set("h1", MockFactory.createHeya("h1", { oyakataId: "o1" }));
  return { world, oya };
}

function bashoWith(
  records: Record<string, { wins: number; losses: number; heyaId: string }>
): BashoState {
  const standings = toKeyedMap(
    Object.entries(records),
    ([id]) => id,
    ([, s]) => ({ wins: s.wins, losses: s.losses })
  );
  return {
    id: "b1",
    bashoName: "natsu",
    day: 15,
    matches: [],
    standings,
    isActive: false,
  } as unknown as BashoState;
}

describe("applyBashoTenure", () => {
  it("increments bashoServed for every heya with entrants", () => {
    const { world } = tenureWorld();
    const r = MockFactory.createRikishi({ id: "r1", heyaId: "h1" });
    world.rikishi.set("r1", r);
    const basho = bashoWith({ r1: { wins: 8, losses: 7, heyaId: "h1" } });

    const builder = createImpactBuilder("test");
    applyBashoTenure(world, builder, basho, "r1");
    const next = resolveImpacts(world, [builder.build()]);

    const oya = next.oyakata.get("o1")!;
    expect(oya.tenure?.bashoServed).toBe(1);
    expect(oya.tenure?.startedYear).toBe(world.year);
  });

  it("credits a championship to the yusho winner's oyakata", () => {
    const { world } = tenureWorld();
    world.rikishi.set("r1", MockFactory.createRikishi({ id: "r1", heyaId: "h1" }));
    const basho = bashoWith({ r1: { wins: 14, losses: 1, heyaId: "h1" } });

    const builder = createImpactBuilder("test");
    applyBashoTenure(world, builder, basho, "r1");
    const next = resolveImpacts(world, [builder.build()]);
    expect(next.oyakata.get("o1")!.tenure?.championships).toBe(1);
  });

  it("writes consecutiveUnderperformanceBasho — the counter the merger path reads", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi({
        id: "r1",
        heyaId: "h1",
        division: "makuuchi",
      } as Partial<Rikishi>)
    );
    // 2-13: a clear losing basho for a sekitori entrant.
    const basho = bashoWith({ r1: { wins: 2, losses: 13, heyaId: "h1" } });

    const builder = createImpactBuilder("test");
    applyBashoTenure(world, builder, basho, "r1");
    const next = resolveImpacts(world, [builder.build()]);
    expect(next.heyas.get("h1")!.consecutiveUnderperformanceBasho).toBe(1);

    // A strong basho resets the streak.
    const good = bashoWith({ r1: { wins: 11, losses: 4, heyaId: "h1" } });
    const b2 = createImpactBuilder("test");
    applyBashoTenure(next, b2, good, "r1");
    const after = resolveImpacts(next, [b2.build()]);
    expect(after.heyas.get("h1")!.consecutiveUnderperformanceBasho).toBe(0);
  });
});

describe("producer instrumentation", () => {
  it("issueBailoutLoanIfNeeded increments insolvencyEvents on the oyakata", () => {
    const { world } = tenureWorld();
    const heya = world.heyas.get("h1")!;
    heya.funds = -10_000_000; // below LOAN_ISSUANCE_THRESHOLD (-5M)
    const next = resolveImpacts(world, [issueBailoutLoanIfNeeded(world, "h1")]);
    expect(next.oyakata.get("o1")!.tenure?.insolvencyEvents).toBe(1);
  });

  it("reportScandal at major severity increments majorScandals", () => {
    const { world } = tenureWorld();
    const next = resolveImpacts(world, [reportScandal(world, "h1", "major", "violence incident")]);
    expect(next.oyakata.get("o1")!.tenure?.majorScandals).toBe(1);
  });

  it("minor scandals do not count", () => {
    const { world } = tenureWorld();
    const next = resolveImpacts(world, [reportScandal(world, "h1", "minor", "late night out")]);
    expect(next.oyakata.get("o1")!.tenure?.majorScandals ?? 0).toBe(0);
  });
});

function promoteEntry(rikishiId: string, division: Division, rank: Rank): BanzukeEntry {
  return {
    rikishiId,
    division,
    position: { rank, rankNumber: 1, side: "east" },
  } as BanzukeEntry;
}

function sanyakuPromotionEvent(rikishiId: string): MovementEvent {
  return {
    rikishiId,
    from: "maegashira",
    to: "komusubi",
    kind: "promotion",
    description: "Promoted: maegashira → komusubi",
    isSanyakuPromotion: true,
  } as MovementEvent;
}

function publishRanks(
  world: WorldState,
  entries: BanzukeEntry[],
  events: Map<string, MovementEvent> = new Map()
) {
  const lastBasho = MockFactory.createBasho({ bashoName: "hatsu" });
  const builder = createImpactBuilder("test");
  applyNewRanks(world, lastBasho, { newBanzuke: entries } as never, events, builder);
  return resolveImpacts(world, [builder.build()]);
}

describe("applyNewRanks promotion tenure accounting", () => {
  it("counts a first cross into san'yaku as sanyakuProduced", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", { heyaId: "h1", division: "makuuchi", rank: "maegashira" })
    );

    const next = publishRanks(
      world,
      [promoteEntry("r1", "makuuchi", "komusubi")],
      new Map([["r1", sanyakuPromotionEvent("r1")]])
    );
    expect(next.oyakata.get("o1")!.tenure?.sanyakuProduced).toBe(1);
  });

  it("counts a first-time ōzeki as ozekiProduced without re-counting sanyaku", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", {
        heyaId: "h1",
        division: "makuuchi",
        rank: "sekiwake",
        careerHistory: [{ rank: "komusubi" }],
      } as Partial<Rikishi>)
    );

    // Sekiwake → ōzeki: already san'yaku, so no sanyakuPromotion flag.
    const next = publishRanks(world, [promoteEntry("r1", "makuuchi", "ozeki")]);
    const oya = next.oyakata.get("o1")!;
    expect(oya.tenure?.ozekiProduced).toBe(1);
    expect(oya.tenure?.sanyakuProduced ?? 0).toBe(0);
  });

  it("does not double-count an ōzeki reclaim (ozeki already in career history)", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", {
        heyaId: "h1",
        division: "makuuchi",
        rank: "sekiwake",
        wasDemotedFromOzeki: true,
        careerHistory: [{ rank: "ozeki" }, { rank: "sekiwake" }],
      } as Partial<Rikishi>)
    );

    const next = publishRanks(world, [promoteEntry("r1", "makuuchi", "ozeki")]);
    expect(next.oyakata.get("o1")!.tenure?.ozekiProduced ?? 0).toBe(0);
  });

  it("counts a yokozuna promotion as yokozunaProduced", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", {
        heyaId: "h1",
        division: "makuuchi",
        rank: "ozeki",
        careerHistory: [{ rank: "sekiwake" }, { rank: "ozeki" }],
      } as Partial<Rikishi>)
    );

    const next = publishRanks(world, [promoteEntry("r1", "makuuchi", "yokozuna")]);
    const oya = next.oyakata.get("o1")!;
    expect(oya.tenure?.yokozunaProduced).toBe(1);
    expect(oya.tenure?.ozekiProduced ?? 0).toBe(0);
  });

  it("aggregates two same-heya sekitori promotions into one tenure write", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", { heyaId: "h1", division: "makushita", rank: "makushita" })
    );
    world.rikishi.set(
      "r2",
      MockFactory.createRikishi("r2", { heyaId: "h1", division: "makushita", rank: "makushita" })
    );

    const next = publishRanks(world, [
      promoteEntry("r1", "juryo", "juryo"),
      promoteEntry("r2", "juryo", "juryo"),
    ]);
    expect(next.oyakata.get("o1")!.tenure?.sekitoriProduced).toBe(2);
  });

  it("merges different counters from same-heya promotions in a single publish", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", { heyaId: "h1", division: "makushita", rank: "makushita" })
    );
    world.rikishi.set(
      "r2",
      MockFactory.createRikishi("r2", { heyaId: "h1", division: "makuuchi", rank: "maegashira" })
    );

    const next = publishRanks(
      world,
      [promoteEntry("r1", "juryo", "juryo"), promoteEntry("r2", "makuuchi", "komusubi")],
      new Map([["r2", sanyakuPromotionEvent("r2")]])
    );
    const oya = next.oyakata.get("o1")!;
    expect(oya.tenure?.sekitoriProduced).toBe(1);
    expect(oya.tenure?.sanyakuProduced).toBe(1);
  });

  it("credits each heya's oyakata only for his own rikishi", () => {
    const { world } = tenureWorld();
    world.oyakata.set("o2", MockFactory.createOyakata("o2", { heyaId: "h2" }));
    world.heyas.set("h2", MockFactory.createHeya("h2", { oyakataId: "o2" }));
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", { heyaId: "h1", division: "makushita", rank: "makushita" })
    );
    world.rikishi.set(
      "rB",
      MockFactory.createRikishi("rB", { heyaId: "h2", division: "makushita", rank: "makushita" })
    );

    const next = publishRanks(world, [
      promoteEntry("r1", "juryo", "juryo"),
      promoteEntry("rB", "juryo", "juryo"),
    ]);
    expect(next.oyakata.get("o1")!.tenure?.sekitoriProduced).toBe(1);
    expect(next.oyakata.get("o2")!.tenure?.sekitoriProduced).toBe(1);
  });

  it("does not count lateral sekitori movement", () => {
    const { world } = tenureWorld();
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi("r1", { heyaId: "h1", division: "juryo", rank: "juryo" })
    );

    const next = publishRanks(world, [promoteEntry("r1", "makuuchi", "maegashira")]);
    const tenure = next.oyakata.get("o1")!.tenure;
    expect(tenure?.sekitoriProduced ?? 0).toBe(0);
    expect(tenure?.sanyakuProduced ?? 0).toBe(0);
    expect(tenure?.ozekiProduced ?? 0).toBe(0);
    expect(tenure?.yokozunaProduced ?? 0).toBe(0);
  });
});
