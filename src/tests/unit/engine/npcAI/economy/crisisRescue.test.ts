/**
 * WS6 — Crisis rescue through the weekly execution layer (canon §14.8).
 *
 * The agent decision (`finance.shouldSeekRescue` + `rescueMenu`) must reach
 * `executeAgentDecisions` and produce real world effects — a loan, a faction
 * appeal event, or a sponsor-drive injection — subject to the rescue-domain
 * cooldown like every other executed domain.
 */
import { describe, it, expect } from "vitest";
import { executeAgentDecisions } from "@/engine/npcAI/execution";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { AgentDecisions } from "@/engine/npcAI/types";
import type { Oyakata } from "@/engine/types/oyakata";
import type { WorldState } from "@/engine/types/world";

function baseDecisions(): AgentDecisions {
  return {
    finance: {
      shouldBuyMyoseki: false,
      shouldInvestInFacilities: false,
      shouldBuildReserves: false,
      riskLevel: "conservative",
    },
    governance: {
      shouldReduceScandal: false,
      shouldUsePoliticalFavor: false,
      shouldSabotageRival: false,
    },
    recruitment: { maxBid: 0, shouldBid: false, bidStrategy: "conservative" },
    rivalry: { escalateRivalry: false, deescalateRivalry: false, targetRivalForMatchmaking: [] },
    narrative: { shouldTriggerEvent: false, narrativeTone: "neutral" },
  };
}

function desperateWorld(): { world: WorldState; oya: Oyakata } {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const h = MockFactory.createHeya("h1", { oyakataId: "o1", runwayBand: "desperate" });
  h.funds = -8_000_000;
  world.heyas.set("h1", h);
  const oya = {
    id: "o1",
    heyaId: "h1",
    archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    shikona: "Oya",
    name: "Oya",
  } as unknown as Oyakata;
  world.oyakata.set("o1", oya);
  return { world, oya };
}

describe("executeAgentDecisions — crisis rescue", () => {
  it("bailout_loan menu produces a real loan through the weekly tick", () => {
    const { world, oya } = desperateWorld();
    const decisions = baseDecisions();
    decisions.finance.shouldSeekRescue = true;
    decisions.finance.rescueMenu = "bailout_loan";

    const impact = executeAgentDecisions(world, "h1", decisions, oya);
    const next = resolveImpacts(world, [impact]);
    expect((next.heyas.get("h1")!.activeLoans ?? []).length).toBe(1);
  });

  it("faction_appeal emits a canonical governance event and no loan", () => {
    const { world, oya } = desperateWorld();
    const decisions = baseDecisions();
    decisions.finance.shouldSeekRescue = true;
    decisions.finance.rescueMenu = "faction_appeal";

    const impact = executeAgentDecisions(world, "h1", decisions, oya);
    const next = resolveImpacts(world, [impact]);
    expect((next.heyas.get("h1")!.activeLoans ?? []).length).toBe(0);
    expect(
      (impact.events ?? []).some(
        (e) => e.type === "GOVERNANCE_RULING" && e.data?.incident === "faction_appeal"
      )
    ).toBe(true);
  });

  it("rescue domain respects the weekly cooldown", () => {
    const { world, oya } = desperateWorld();
    const decisions = baseDecisions();
    decisions.finance.shouldSeekRescue = true;
    decisions.finance.rescueMenu = "sponsor_drive";

    const first = executeAgentDecisions(world, "h1", decisions, oya);
    const after1 = resolveImpacts(world, [first]);
    const fundsAfterFirst = after1.heyas.get("h1")!.funds;

    // Same week, cooldown stamped on oyakata memory — must not double-apply.
    const oyaAfter = after1.oyakata.get("o1")!;
    const second = executeAgentDecisions(after1, "h1", decisions, oyaAfter);
    const after2 = resolveImpacts(after1, [second]);
    expect(after2.heyas.get("h1")!.funds).toBe(fundsAfterFirst);
  });
});
