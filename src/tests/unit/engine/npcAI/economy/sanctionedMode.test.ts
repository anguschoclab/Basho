/**
 * WS6 — Sanctioned/probation low-visibility mode.
 *
 * A heya under governance sanction keeps its head down: narrative/media
 * domain executions are suppressed and sabotage is impossible — while
 * legitimate governance action (pardon requests) still flows. The mode is
 * read from `heya.governanceStatus` at execution time.
 */
import { describe, it, expect } from "vitest";
import { executeAgentDecisions } from "@/engine/npcAI/execution";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { AgentDecisions } from "@/engine/npcAI/types";
import type { GovernanceStatus } from "@/engine/types/economy";
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
      shouldSabotageRival: true,
    },
    recruitment: { maxBid: 0, shouldBid: false, bidStrategy: "conservative" },
    rivalry: { escalateRivalry: false, deescalateRivalry: false, targetRivalForMatchmaking: [] },
    narrative: {
      shouldTriggerEvent: true,
      eventType: "underdog_victory",
      rikishiId: "r1",
      narrativeTone: "underdog",
    },
  };
}

function sanctionedWorld(status: GovernanceStatus): { world: WorldState; oya: Oyakata } {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const h = MockFactory.createHeya("h1", { oyakataId: "o1" });
  h.governanceStatus = status;
  world.heyas.set("h1", h);
  world.rikishi.set(
    "r1",
    MockFactory.createRikishi({ id: "r1", heyaId: "h1" })
  );
  const oya = {
    id: "o1",
    heyaId: "h1",
    archetype: "strategist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    shikona: "Oya",
    name: "Oya",
  } as unknown as Oyakata;
  world.oyakata.set("o1", oya);
  return { world, oya };
}

describe("executeAgentDecisions — sanctioned low-visibility mode", () => {
  it("suppressed: a sanctioned heya emits no narrative/media event", () => {
    const { world, oya } = sanctionedWorld("sanctioned");
    const impact = executeAgentDecisions(world, "h1", baseDecisions(), oya);
    const narrativeEvents = (impact.events ?? []).filter(
      (e) => e.category === "narrative" || e.type === "AWARD_CONFERRED"
    );
    expect(narrativeEvents.length).toBe(0);
  });

  it("suppressed: probation also enforces low visibility", () => {
    const { world, oya } = sanctionedWorld("probation");
    const impact = executeAgentDecisions(world, "h1", baseDecisions(), oya);
    const narrativeEvents = (impact.events ?? []).filter(
      (e) => e.category === "narrative" || e.type === "AWARD_CONFERRED"
    );
    expect(narrativeEvents.length).toBe(0);
  });

  it("control: a heya in good standing emits the narrative event", () => {
    const { world, oya } = sanctionedWorld("good_standing");
    const impact = executeAgentDecisions(world, "h1", baseDecisions(), oya);
    const narrativeEvents = (impact.events ?? []).filter(
      (e) => e.category === "narrative" || e.type === "AWARD_CONFERRED"
    );
    expect(narrativeEvents.length).toBeGreaterThan(0);
  });

  it("sabotage decisions are discarded entirely under sanction", () => {
    const { world, oya } = sanctionedWorld("sanctioned");
    const impact = executeAgentDecisions(world, "h1", baseDecisions(), oya);
    const sabotageEvents = (impact.events ?? []).filter((e) =>
      JSON.stringify(e.data ?? {}).toLowerCase().includes("sabotage")
    );
    expect(sabotageEvents.length).toBe(0);
  });
});
