/**
 * WS5 — Ichimon faction postures and coordination.
 *
 * `world.factionPostures` gives each ichimon a league-visible posture elected
 * deterministically by its leader heya (highest political capital). Member
 * heyas' strategic planning gets a bounded alignment bonus — it can tilt a
 * borderline choice but never rescues a zero-scored plan.
 */

import { describe, it, expect } from "vitest";
import { electFactionPostures } from "@/engine/npcAI/factions";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { AIContext } from "@/engine/ai/types";
import type { PerceptionSnapshot } from "@/engine/perception";

function factionWorld(): WorldState {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  // Dewanoumi: leader h-lead (huge capital), member h-member.
  const lead = MockFactory.createHeya("h-lead", { ichimon: "Dewanoumi" });
  lead.politicalCapital = 90;
  const member = MockFactory.createHeya("h-member", { ichimon: "Dewanoumi" });
  member.politicalCapital = 30;
  const rival = MockFactory.createHeya("h-rival", { ichimon: "Nishonoseki" });
  rival.politicalCapital = 60;
  world.heyas.set("h-lead", lead);
  world.heyas.set("h-member", member);
  world.heyas.set("h-rival", rival);
  return world;
}

describe("electFactionPostures", () => {
  it("elects a deterministic posture per ichimon with a leader", () => {
    const world = factionWorld();
    const league = buildLeaguePerception(world);
    const a = electFactionPostures(world, league);
    const b = electFactionPostures(world, league);
    expect(a).toEqual(b);
    expect(a["Dewanoumi"]).toBeDefined();
    expect(["expansionist", "consolidating", "coordinated_pressure"]).toContain(
      a["Dewanoumi"]!.posture
    );
  });

  it("a dominant leader adopts coordinated_pressure aimed at a non-member", () => {
    const world = factionWorld();
    const league = buildLeaguePerception(world);
    const postures = electFactionPostures(world, league);
    const dewa = postures["Dewanoumi"]!;
    expect(dewa.posture).toBe("coordinated_pressure");
    expect(dewa.targetHeyaId).toBe("h-rival");
  });

  it("a fragile leader consolidates instead", () => {
    const world = factionWorld();
    world.heyas.get("h-lead")!.runwayBand = "desperate";
    const league = buildLeaguePerception(world);
    const postures = electFactionPostures(world, league);
    expect(postures["Dewanoumi"]!.posture).toBe("consolidating");
  });
});

function planCtx(world: WorldState, heyaId: string): AIContext {
  const perception: PerceptionSnapshot = {
    heyaId,
    heyaName: "Member",
    generatedAtWeek: world.week,
    generatedAtYear: world.year,
    statureBand: "established",
    prestigeBand: "respected",
    runwayBand: "comfortable",
    koenkaiBand: "moderate",
    welfareRiskBand: "safe",
    complianceState: "compliant",
    governancePressureBand: "none",
    stableMediaHeatBand: "cold",
    rivalryPressureBand: "simmering",
    rosterStrengthBand: "competitive",
    rosterSize: 10,
    moraleBand: "content",
    rikishiPerceptions: [],
    alignmentScore: 50,
    styleBias: "neutral",
  };
  return {
    world,
    heyaId,
    oyakata: {
      id: "o-member",
      archetype: "strategist",
      traits: { ambition: 55, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      mood: "content",
    },
    perception,
    leaguePerception: buildLeaguePerception(world),
  };
}

describe("faction plan alignment", () => {
  it("coordinated_pressure members lean into faction/rivalry plans", () => {
    const world = factionWorld();
    world.factionPostures = {
      Dewanoumi: {
        posture: "coordinated_pressure",
        targetHeyaId: "h-rival",
        setWeek: 10,
      },
    };
    const plan = createPlan(planCtx(world, "h-member"));
    expect(["faction_ascension", "rivalry_suppression"]).toContain(plan?.planId);
  });

  it("the bonus is bounded — it cannot override plan constraints or rescue junk", () => {
    const world = factionWorld();
    world.factionPostures = {
      Dewanoumi: {
        posture: "coordinated_pressure",
        targetHeyaId: "h-rival",
        setWeek: 10,
      },
    };
    const ctx = planCtx(world, "h-member");
    ctx.perception!.runwayBand = "desperate";
    const plan = createPlan(ctx);
    // Desperate runway still demands financial_consolidation.
    expect(plan?.planId).toBe("financial_consolidation");
  });
});
