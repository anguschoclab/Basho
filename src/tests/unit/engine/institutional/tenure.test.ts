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
import { applyBashoTenure } from "@/engine/systems/legacy/tenure";
import { issueBailoutLoanIfNeeded } from "@/engine/loans";
import { reportScandal } from "@/engine/systems/governance/ScandalService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";

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

function bashoWith(records: Record<string, { wins: number; losses: number; heyaId: string }>): BashoState {
  const standings = new Map(
    Object.entries(records).map(([id, s]) => [id, { wins: s.wins, losses: s.losses }])
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
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi({ id: "r1", heyaId: "h1" })
    );
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
      MockFactory.createRikishi({ id: "r1", heyaId: "h1", division: "makuuchi" } as Partial<Rikishi>)
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
    const next = resolveImpacts(world, [
      reportScandal(world, "h1", "major", "violence incident"),
    ]);
    expect(next.oyakata.get("o1")!.tenure?.majorScandals).toBe(1);
  });

  it("minor scandals do not count", () => {
    const { world } = tenureWorld();
    const next = resolveImpacts(world, [
      reportScandal(world, "h1", "minor", "late night out"),
    ]);
    expect(next.oyakata.get("o1")!.tenure?.majorScandals ?? 0).toBe(0);
  });
});
