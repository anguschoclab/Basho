import { describe, it, expect } from "vitest";
import {
  detectDueDecisions,
  applyDecisionEffect,
  resolveLoopDecision,
  autonomouslyResolveDecisions,
} from "@/engine/loop/LoopDecisionEngine";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types/rikishi";
import { makeMockBasho } from "../utils";

function makeWorld(overrides: Record<string, unknown> = {}): WorldState {
  return {
    seed: "test",
    year: 1,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    events: { log: [], headlines: [] } as unknown as WorldState["events"],
    activeRikishiIds: new Set(),
    historicalRikishi: new Map(),
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
    ...overrides,
  } as unknown as WorldState;
}

function makeHeya(id: string, rikishiIds: string[] = []): Heya {
  return { id, name: "Test Heya", oyakataId: "oy1", rikishiIds, funds: 100000 } as unknown as Heya;
}

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Wrestler-${id}`,
    heyaId: "h1",
    nationality: "Mongolia",
    birthYear: 1995,
    height: 185,
    weight: 150,
    momentum: 50,
    fatigue: 30,
    injured: false,
    injuryWeeksRemaining: 0,
    isKyujo: false,
    style: "yotsu",
    division: "makushita",
    rank: "makushita",
    side: "east",
    stats: {
      power: 50,
      technique: 50,
      speed: 50,
      weight: 150,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      balance: 50,
      aggression: 50,
      experience: 50,
    },
    ...overrides,
  } as unknown as Rikishi;
}

function makeMatch(day: number, eastId: string, westId: string, result: unknown = null): unknown {
  return {
    day,
    eastRikishiId: eastId,
    westRikishiId: westId,
    result,
  };
}

describe("kyujo_decision detection", () => {
  it("fires during active_basho with injured player rikishi scheduled today", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    const kyujo = decisions.filter((d) => d.type === "kyujo_decision");
    expect(kyujo.length).toBe(1);
    expect(kyujo[0].required).toBe(true);
    expect(kyujo[0].id).toContain("kyujo_r1_5");
  });

  it("does NOT fire during interim phase", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: makeMockBasho({ day: 5 }),
    });

    const decisions = detectDueDecisions(world);
    expect(decisions.filter((d) => d.type === "kyujo_decision")).toHaveLength(0);
  });

  it("does NOT fire for minor injuries", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 1,
      injuryStatus: { type: "bruise", severity: "minor", weeksRemaining: 1 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    expect(decisions.filter((d) => d.type === "kyujo_decision")).toHaveLength(0);
  });

  it("does NOT fire if rikishi is already isKyujo", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      isKyujo: true,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    expect(decisions.filter((d) => d.type === "kyujo_decision")).toHaveLength(0);
  });

  it("does NOT fire if no player rikishi is in today's matches", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r3", "r4") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    expect(decisions.filter((d) => d.type === "kyujo_decision")).toHaveLength(0);
  });

  it("does NOT duplicate if decision already pending", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
      pendingDecisions: [
        {
          id: "kyujo_r1_5",
          type: "kyujo_decision",
          description: "test",
          deadlineWeek: 1,
          required: true,
          options: [],
        },
      ],
    });

    const decisions = detectDueDecisions(world);
    expect(decisions.filter((d) => d.type === "kyujo_decision")).toHaveLength(0);
  });

  it("fires for west-side player rikishi", () => {
    const r = makeRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r2", "r1") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    const kyujo = decisions.filter((d) => d.type === "kyujo_decision");
    expect(kyujo.length).toBe(1);
    expect(kyujo[0].id).toContain("kyujo_r1_5");
  });
});

describe("kyujo_decision applyDecisionEffect", () => {
  it("withdraw sets isKyujo and kyujoReason", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "kyujo_decision", "withdraw", "kyujo_r1_5");
    const impact = builder.build();
    const upd = impact.entities?.rikishiUpdates?.get("r1");
    expect(upd).toBeDefined();
    expect(upd?.isKyujo).toBe(true);
    expect(upd?.kyujoReason).toBe("injury");
  });

  it("withdraw sets medicalCertificate with injury details", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "kyujo_decision", "withdraw", "kyujo_r1_5");
    const impact = builder.build();
    const upd = impact.entities?.rikishiUpdates?.get("r1");
    expect(upd?.medicalCertificate).toBeDefined();
    expect((upd?.medicalCertificate as { injury: string }).injury).toBe("muscle");
    expect((upd?.medicalCertificate as { severity: string }).severity).toBe("serious");
  });

  it("compete writes dailyInjuryRiskOverrides to transientContext", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "kyujo_decision", "compete", "kyujo_r1_5");
    const impact = builder.build();
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    expect(tc?.dailyInjuryRiskOverrides?.["r1"]).toBe(2.0);
  });

  it("compete uses 1.5 multiplier for moderate severity", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "kyujo_decision", "compete", "kyujo_r1_5");
    const impact = builder.build();
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    expect(tc?.dailyInjuryRiskOverrides?.["r1"]).toBe(1.5);
  });
});

describe("kyujo_decision resolveLoopDecision", () => {
  it("threads decisionId and resolves withdraw", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      pendingDecisions: [
        {
          id: "kyujo_r1_5",
          type: "kyujo_decision",
          description: "test",
          deadlineWeek: 1,
          required: true,
          options: [
            { id: "withdraw", label: "Withdraw", impact: "test" },
            { id: "compete", label: "Compete", impact: "test" },
          ],
        },
      ],
    });

    const impact = resolveLoopDecision(world, "kyujo_r1_5", "withdraw");
    const upd = impact.entities?.rikishiUpdates?.get("r1");
    expect(upd?.isKyujo).toBe(true);
    const remaining = impact.worldFields?.pendingDecisions as Array<{ id: string }>;
    expect(remaining).toEqual([]);
  });
});

describe("kyujo_decision autonomous resolution", () => {
  it("conservative policy picks withdraw", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const impact = autonomouslyResolveDecisions(world, "conservative");
    const upd = impact.entities?.rikishiUpdates?.get("r1");
    expect(upd?.isKyujo).toBe(true);
  });

  it("aggressive policy picks compete", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const impact = autonomouslyResolveDecisions(world, "aggressive");
    const upd = impact.entities?.rikishiUpdates?.get("r1");
    expect(upd?.isKyujo).toBeUndefined();
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    expect(tc?.dailyInjuryRiskOverrides?.["r1"]).toBe(1.5);
  });
});

describe("kyujo_decision — additional edge cases", () => {
  it("generates separate decisions for two injured player rikishi on the same day", () => {
    const r1 = makeRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const r2 = makeRikishi("r2", {
      heyaId: "h1",
      injured: true,
      injuryWeeksRemaining: 4,
      injuryStatus: { type: "sprain", severity: "serious", weeksRemaining: 4 } as never,
    });
    const heya = makeHeya("h1", ["r1", "r2"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r3") as never, makeMatch(5, "r2", "r4") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    const kyujo = decisions.filter((d) => d.type === "kyujo_decision");
    expect(kyujo.length).toBe(2);
    const ids = kyujo.map((d) => d.id);
    expect(ids).toContain("kyujo_r1_5");
    expect(ids).toContain("kyujo_r2_5");
  });

  it("description includes ~20% risk for moderate severity", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    const kyujo = decisions.find((d) => d.type === "kyujo_decision");
    expect(kyujo?.description).toContain("20%");
  });

  it("description includes ~40% risk for serious severity", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const basho = makeMockBasho({
      day: 5,
      matches: [makeMatch(5, "r1", "r2") as never],
    });
    const world = makeWorld({
      cyclePhase: "active_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
      currentBasho: basho,
    });

    const decisions = detectDueDecisions(world);
    const kyujo = decisions.find((d) => d.type === "kyujo_decision");
    expect(kyujo?.description).toContain("40%");
  });

  it("compete uses 2.0 multiplier for serious severity", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "kyujo_decision", "compete", "kyujo_r1_5");
    const impact = builder.build();
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    expect(tc?.dailyInjuryRiskOverrides?.["r1"]).toBe(2.0);
  });
});
