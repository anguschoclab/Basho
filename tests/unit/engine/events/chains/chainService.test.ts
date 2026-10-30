import { describe, it, expect, beforeAll } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { BardEngine } from "@/engine/bard/BardEngine";
import {
  tickWeekEventChains,
  resolveChainStage,
  chainDecisionId,
} from "@/engine/events/chains/chainService";
import {
  applyExpiredQueueDefaults,
  resolveLoopDecision,
} from "@/engine/npc/decision/LoopDecisionEngine";
import { getChainDef } from "@/engine/events/chains/chainRegistry";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types/rikishi";

function makeWorld(): { world: WorldState; heya: Heya; rikishi: Rikishi[] } {
  const heya = MockFactory.createHeya("h1", { funds: 5_000_000 });
  heya.welfareState = { welfareRisk: 20, complianceState: "compliant", weeksInState: 0, morale: 60, activeDiet: "maintenance" };
  const rikishi = Array.from({ length: 6 }, (_, i) =>
    MockFactory.createRikishi(`r${i}`, { heyaId: "h1", division: "makuuchi" })
  );
  const world = MockFactory.createWorld({
    week: 10,
    playerHeyaId: "h1",
    heyas: new Map([["h1", heya]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: new Set(rikishi.map((r) => r.id)),
    activeChains: {
      "chain-bullying-y0-w5": {
        chainId: "bullying",
        stageIdx: 0,
        heyaId: "h1",
        rikishiId: "r0",
        nextStageDueWeek: 10,
      },
    },
  });
  return { world, heya, rikishi };
}

describe("tickWeekEventChains", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["chains"]);
  });

  it("emits a chain_stage pendingDecision for a due stage", () => {
    const { world } = makeWorld();
    const impact = tickWeekEventChains(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      id: string;
      type: string;
      description: string;
      options: Array<{ id: string; label: string }>;
    }>;
    const d = decisions?.find((x) => x.type === "chain_stage");
    expect(d, "expected a chain_stage decision").toBeTruthy();
    expect(d!.id).toBe("chain_chain-bullying-y0-w5");
    expect(d!.description).toContain("Chapter 1/5");
    expect(d!.options.length).toBeGreaterThanOrEqual(2);
    expect(d!.options.every((o) => o.label.length > 2)).toBe(true);
  });

  it("does not double-emit when the decision already exists", () => {
    const { world } = makeWorld();
    world.pendingDecisions = [
      {
        id: "chain_chain-bullying-y0-w5",
        type: "chain_stage",
        description: "already",
        deadlineWeek: 11,
        options: [],
        required: false,
      },
    ];
    const impact = tickWeekEventChains(world);
    const decisions = (impact.worldFields?.pendingDecisions ?? []) as Array<{ id: string }>;
    expect(decisions.filter((d) => d.id === "chain_chain-bullying-y0-w5").length).toBe(1);
  });

  it("suppresses decisions in autonomous sims but still advances chains", () => {
    const { world } = makeWorld();
    world._autonomousSim = true;
    const impact = tickWeekEventChains(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
    // bullying stage0 first option ("intervene") advances to "confrontation"
    const active = impact.worldFields?.activeChains as Record<
      string,
      { chainId: string; stageIdx: number }
    >;
    expect(active["chain-bullying-y0-w5"].stageIdx).toBe(1);
  });

  it("serializes activeChains cleanly (plain record, no closures)", () => {
    const { world } = makeWorld();
    const impact = tickWeekEventChains(world);
    const active = impact.worldFields?.activeChains;
    expect(() => structuredClone(active)).not.toThrow();
    expect(() => JSON.stringify(active)).not.toThrow();
  });
});

describe("resolveChainStage", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["chains"]);
  });

  it("applies option effects and advances to nextStage", () => {
    const { world } = makeWorld();
    const builder = createImpactBuilder("test");
    resolveChainStage(world, builder, "chain_chain-bullying-y0-w5", "intervene");
    const impact = builder.build();
    const active = impact.worldFields?.activeChains as Record<
      string,
      { stageIdx: number; nextStageDueWeek: number }
    >;
    // "intervene" → stage "confrontation" (idx 1), delay 1 week
    expect(active["chain-bullying-y0-w5"].stageIdx).toBe(1);
    expect(active["chain-bullying-y0-w5"].nextStageDueWeek).toBe(11);
    // morale +3 / welfareRisk −4 on heya
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { welfareState?: { morale: number; welfareRisk: number } };
    expect(heyaUp?.welfareState?.morale).toBe(63);
    expect(heyaUp?.welfareState?.welfareRisk).toBe(16);
  });

  it("completes the chain and starts its cooldown on terminal options", () => {
    const { world } = makeWorld();
    world.activeChains = {
      "chain-bullying-y0-w5": {
        chainId: "bullying",
        stageIdx: 4, // aftermath_quiet — terminal
        heyaId: "h1",
        rikishiId: "r0",
        nextStageDueWeek: 10,
      },
    };
    const builder = createImpactBuilder("test");
    resolveChainStage(world, builder, "chain_chain-bullying-y0-w5", "rebuild");
    const impact = builder.build();
    const active = impact.worldFields?.activeChains as Record<string, unknown>;
    expect(active["chain-bullying-y0-w5"]).toBeUndefined();
    const cd = impact.worldFields?.chainCooldowns as Record<string, number>;
    expect(cd["bullying"]).toBe(10);
  });

  it("falls back to a free option when the paid option is unaffordable", () => {
    const { world } = makeWorld();
    world.heyas.get("h1")!.funds = 10; // can't afford ¥200,000 apology
    world.activeChains = {
      "chain-bullying-y0-w5": {
        chainId: "bullying",
        stageIdx: 3, // blowup — apology costs 200k, stonewall free
        heyaId: "h1",
        rikishiId: "r0",
        nextStageDueWeek: 10,
      },
    };
    const builder = createImpactBuilder("test");
    resolveChainStage(world, builder, "chain_chain-bullying-y0-w5", "public_apology");
    const impact = builder.build();
    const events = impact.events ?? [];
    const resolved = events.find((e) => e.type === "CHAIN_STAGE_RESOLVED");
    expect(resolved).toBeTruthy();
    expect((resolved!.data as { optionId: string }).optionId).toBe("stonewall");
  });

  it("sets causalEventId on the outcome event (W19 — first real producer)", () => {
    const { world } = makeWorld();
    const builder = createImpactBuilder("test");
    resolveChainStage(world, builder, "chain_chain-bullying-y0-w5", "intervene");
    const events = builder.build().events ?? [];
    const resolved = events.find((e) => e.type === "CHAIN_STAGE_RESOLVED");
    expect(resolved?.causalEventId).toBe("chain_chain-bullying-y0-w5");
  });

  it("charges the fee for paid options", () => {
    const { world } = makeWorld();
    world.activeChains = {
      "chain-bullying-y0-w5": {
        chainId: "bullying",
        stageIdx: 3,
        heyaId: "h1",
        rikishiId: "r0",
        nextStageDueWeek: 10,
      },
    };
    const builder = createImpactBuilder("test");
    resolveChainStage(world, builder, "chain_chain-bullying-y0-w5", "public_apology");
    const heyaUp = builder.build().entities?.heyaUpdates?.get("h1") as { funds?: number };
    expect(heyaUp?.funds).toBe(5_000_000 - 200_000);
  });
});

describe("chain_stage integration with LoopDecisionEngine", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["chains"]);
  });

  it("resolveLoopDecision routes chain_stage decisions through the registry", () => {
    const { world } = makeWorld();
    world.pendingDecisions = [
      {
        id: "chain_chain-bullying-y0-w5",
        type: "chain_stage",
        description: "Whispers",
        deadlineWeek: 11,
        required: false,
        options: [
          { id: "intervene", label: "Intervene", impact: "" },
          { id: "observe", label: "Observe", impact: "" },
        ],
      },
    ];
    const impact = resolveLoopDecision(world, "chain_chain-bullying-y0-w5", "intervene");
    const decisions = impact.worldFields?.pendingDecisions as Array<{ id: string }>;
    expect(decisions.length).toBe(0);
    const active = impact.worldFields?.activeChains as Record<string, { stageIdx: number }>;
    expect(active["chain-bullying-y0-w5"].stageIdx).toBe(1);
  });

  it("applyExpiredQueueDefaults resolves an expired chain decision via default", () => {
    const { world } = makeWorld();
    world.pendingDecisions = [
      {
        id: "chain_chain-bullying-y0-w5",
        type: "chain_stage",
        description: "Whispers",
        deadlineWeek: 9, // expired (current week 10)
        required: false,
        options: [
          { id: "intervene", label: "Intervene", impact: "" },
          { id: "observe", label: "Observe", impact: "" },
        ],
      },
    ];
    const impact = applyExpiredQueueDefaults(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ id: string }>;
    expect(decisions.length).toBe(0);
    // "first" default → option[0] = intervene → advances to stage 1
    const active = impact.worldFields?.activeChains as Record<string, { stageIdx: number }>;
    expect(active["chain-bullying-y0-w5"].stageIdx).toBe(1);
  });

  it("chain registry def shapes stage sequence deterministically", () => {
    const def = getChainDef("bullying")!;
    expect(def.stages[0].id).toBe("whispers");
    expect(def.stages[0].options[0].nextStage?.stageId).toBe("confrontation");
  });
});
