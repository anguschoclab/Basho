/**
 * WS5 — Successor trait inheritance (canon §16.3) and the legacy modifier.
 *
 * A successor's persona is not random: the inheritance table shapes traits
 * from the successor's own career and the predecessor's reign, and the
 * predecessor's active plan family leaves a decaying legacyModifier on the
 * heya that biases (never forces) the successor's first plan.
 */

import { describe, it, expect } from "vitest";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
import { applyBashoTenure } from "@/engine/systems/legacy/tenure";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import type { AIContext } from "@/engine/ai/types";
import type { PerceptionSnapshot } from "@/engine/perception";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function successionWorld(opts: {
  successorRank?: string;
  successorAge?: number;
  predecessorTenure?: Partial<NonNullable<Oyakata["tenure"]>>;
  predecessorPlanId?: string;
}): { world: WorldState; oya: Oyakata; heir: Rikishi } {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const oya = {
    id: "o1",
    heyaId: "h1",
    archetype: "traditionalist",
    traits: { ...TRAITS },
    age: 66,
    yearsInCharge: 12,
    shikona: "Old Boss",
    name: "Old Boss",
    tenure: {
      startedYear: 0,
      bashoServed: 24,
      championships: 0,
      sekitoriProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
      ...opts.predecessorTenure,
    },
    memory: opts.predecessorPlanId
      ? { activePlan: { planId: opts.predecessorPlanId, startedWeek: 0 } }
      : undefined,
  } as unknown as Oyakata;
  world.oyakata.set("o1", oya);

  const heir = MockFactory.createRikishi({
    id: "heir1",
    heyaId: "h1",
    division: "makuuchi",
    rank: opts.successorRank ?? "maegashira",
    birthYear: world.year - (opts.successorAge ?? 30),
  } as Partial<Rikishi>);
  world.rikishi.set("heir1", heir);
  world.activeRikishiIds = new Set(["heir1"]);

  world.heyas.set("h1", MockFactory.createHeya("h1", { oyakataId: "o1", rikishiIds: ["heir1"] }));
  return { world, oya, heir };
}

describe("trait inheritance (§16.3)", () => {
  it("a yokozuna/ozeki successor inherits ambition", () => {
    const { world } = successionWorld({ successorRank: "ozeki" });
    const impact = DynastyService.triggerSuccession(world, "h1", "heir1");
    const next = resolveImpacts(world, [impact]);
    const newOya = next.oyakata.get("oyakata_promoted_heir1")!;
    expect(newOya.traits.ambition).toBeGreaterThan(50);
  });

  it("a journeyman successor inherits patience/tradition", () => {
    const { world } = successionWorld({ successorRank: "makushita" });
    // makushita isn't sekitori — ensure still eligible via the drought path OR
    // just assert the trait table applies when triggered directly.
    const impact = DynastyService.triggerSuccession(world, "h1", "heir1");
    const next = resolveImpacts(world, [impact]);
    const newOya = next.oyakata.get("oyakata_promoted_heir1")!;
    expect(newOya.traits.patience).toBeGreaterThan(50);
    expect(newOya.traits.tradition).toBeGreaterThan(50);
  });

  it("a decorated predecessor raises successor ambition; scandal tenure hardens tradition", () => {
    const { world } = successionWorld({
      predecessorTenure: { championships: 4, majorScandals: 1 },
    });
    const impact = DynastyService.triggerSuccession(world, "h1", "heir1");
    const next = resolveImpacts(world, [impact]);
    const newOya = next.oyakata.get("oyakata_promoted_heir1")!;
    expect(newOya.traits.ambition).toBeGreaterThan(50);
    expect(newOya.traits.tradition).toBeGreaterThan(50);
  });

  it("the successor starts a fresh tenure record", () => {
    const { world } = successionWorld({});
    const impact = DynastyService.triggerSuccession(world, "h1", "heir1");
    const next = resolveImpacts(world, [impact]);
    const newOya = next.oyakata.get("oyakata_promoted_heir1")!;
    expect(newOya.tenure?.bashoServed).toBe(0);
    expect(newOya.tenure?.startedYear).toBe(world.year);
  });
});

function ctxFor(world: WorldState, heyaId: string): AIContext {
  const perception: PerceptionSnapshot = {
    heyaId,
    heyaName: "Test",
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
    rivalryPressureBand: "dormant",
    rosterStrengthBand: "weak",
    rosterSize: 8,
    moraleBand: "content",
    rikishiPerceptions: [],
    alignmentScore: 50,
    styleBias: "neutral",
  };
  return {
    world,
    heyaId,
    oyakata: {
      id: "o1",
      archetype: "traditionalist",
      traits: { ...TRAITS },
      mood: "content",
    },
    perception,
    leaguePerception: buildLeaguePerception(world),
  };
}

describe("legacyModifier", () => {
  it("is written on the heya at succession from the predecessor's active plan", () => {
    const { world } = successionWorld({ predecessorPlanId: "rebuilding" });
    const next = resolveImpacts(world, [
      DynastyService.triggerSuccession(world, "h1", "heir1"),
    ]);
    expect(next.heyas.get("h1")!.legacyModifier?.planFamilyBias).toBe("rebuilding");
    expect(next.heyas.get("h1")!.legacyModifier?.bashoRemaining).toBeGreaterThan(0);
  });

  it("biases plan selection toward the predecessor's plan family", () => {
    const { world } = successionWorld({});
    const heya = world.heyas.get("h1")!;
    // Baseline: weak roster nurturer-ish context would not reach rebuilding
    // without the legacy nudge in a borderline fixture — assert the modifier
    // measurably shifts the choice.
    heya.legacyModifier = { planFamilyBias: "rebuilding", bashoRemaining: 3 };
    const plan = createPlan(ctxFor(world, "h1"));
    expect(plan?.planId).toBe("rebuilding");
  });

  it("cannot force a zero-scored plan — bonus is bounded", () => {
    const { world } = successionWorld({});
    const heya = world.heyas.get("h1")!;
    // A desperate runway demands financial_consolidation; a stale legacy
    // pointing at yokozuna_push must not override it.
    heya.legacyModifier = { planFamilyBias: "yokozuna_push", bashoRemaining: 3 };
    const ctx = ctxFor(world, "h1");
    ctx.perception!.runwayBand = "desperate";
    const plan = createPlan(ctx);
    expect(plan?.planId).not.toBe("yokozuna_push");
  });

  it("decays one basho at a time and clears at zero", () => {
    const { world } = successionWorld({});
    const heya = world.heyas.get("h1")!;
    heya.legacyModifier = { planFamilyBias: "rebuilding", bashoRemaining: 2 };
    world.rikishi.set("r1", MockFactory.createRikishi({ id: "r1", heyaId: "h1" }));
    const basho = {
      id: "b1",
      standings: new Map([["r1", { wins: 8, losses: 7 }]]),
      matches: [],
    } as unknown as BashoState;

    const b1 = createImpactBuilder("t");
    applyBashoTenure(world, b1, basho, "r1");
    const w1 = resolveImpacts(world, [b1.build()]);
    expect(w1.heyas.get("h1")!.legacyModifier?.bashoRemaining).toBe(1);

    const b2 = createImpactBuilder("t");
    applyBashoTenure(w1, b2, basho, "r1");
    const w2 = resolveImpacts(w1, [b2.build()]);
    expect(w2.heyas.get("h1")!.legacyModifier).toBeUndefined();
  });
});
