/**
 * WS5 — Proactive crisis rescue (canon §14.8).
 *
 * Desperate NPCs no longer wait passively for the basho-end governance
 * review. The FinanceAgent elects a deterministic rescue menu from persona,
 * and execution applies it through canonical paths (loans / faction appeal /
 * sponsor drive).
 */

import { describe, it, expect } from "vitest";
import { spawnFinanceAgent } from "@/engine/agents/FinanceAgent";
import { applyCrisisRescue } from "@/engine/npcAI/execution";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Oyakata } from "@/engine/types/oyakata";
import type { WorldState } from "@/engine/types/world";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function oya(traits: Partial<typeof TRAITS>): Oyakata {
  return {
    id: "o1",
    heyaId: "h1",
    archetype: "traditionalist",
    traits: { ...TRAITS, ...traits },
    age: 55,
    yearsInCharge: 8,
    shikona: "Oya",
    name: "Oya",
  } as unknown as Oyakata;
}

function ctx(traits: Partial<typeof TRAITS>, runwayBand = "desperate") {
  const world = MockFactory.createWorld();
  return {
    oyakata: oya(traits),
    world,
    runwayBand,
    funds: -8_000_000,
    monthlyBurn: 1_000_000,
  };
}

describe("FinanceAgent rescue seeking", () => {
  it("desperate runway triggers shouldSeekRescue with a persona-chosen menu", () => {
    const res = spawnFinanceAgent(ctx({ ambition: 80 }));
    expect(res.shouldSeekRescue).toBe(true);
    expect(res.rescueMenu).toBe("sponsor_drive");
  });

  it("traditionalist favors the faction appeal path", () => {
    const res = spawnFinanceAgent(ctx({ tradition: 85, ambition: 20 }));
    expect(res.rescueMenu).toBe("faction_appeal");
  });

  it("default rescue is the bailout loan", () => {
    const res = spawnFinanceAgent(ctx({ ambition: 20, tradition: 20, risk: 20 }));
    expect(res.rescueMenu).toBe("bailout_loan");
  });

  it("comfortable runway never seeks rescue", () => {
    const res = spawnFinanceAgent(ctx({}, "comfortable"));
    expect(res.shouldSeekRescue).toBe(false);
  });
});

describe("applyCrisisRescue", () => {
  function rescueWorld(): WorldState {
    const world = MockFactory.createWorld({ week: 10, year: 5 });
    const h = MockFactory.createHeya("h1", { oyakataId: "o1" });
    h.funds = -8_000_000;
    world.heyas.set("h1", h);
    world.oyakata.set("o1", oya({}));
    return world;
  }

  it("bailout_loan applies a real loan via issueBailoutLoanIfNeeded", () => {
    const world = rescueWorld();
    const builder = createImpactBuilder("t");
    applyCrisisRescue(world, builder, world.heyas.get("h1")!, "bailout_loan");
    const next = resolveImpacts(world, [builder.build()]);
    expect((next.heyas.get("h1")!.activeLoans ?? []).length).toBe(1);
    expect(next.heyas.get("h1")!.funds).toBeGreaterThan(-8_000_000);
  });

  it("faction_appeal logs a canonical event without a loan", () => {
    const world = rescueWorld();
    const builder = createImpactBuilder("t");
    applyCrisisRescue(world, builder, world.heyas.get("h1")!, "faction_appeal");
    const impact = builder.build();
    const next = resolveImpacts(world, [impact]);
    expect((next.heyas.get("h1")!.activeLoans ?? []).length).toBe(0);
    expect(impact.events?.length ?? 0).toBeGreaterThan(0);
  });
});
