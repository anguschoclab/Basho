import { describe, it, expect } from "vitest";
import { mockRikishi } from "../utils";
import { chooseTactic, chooseTacticForCPU } from "@/engine/bout/BoutAI";
import { SeededRNG } from "@/engine/rng";
import type { BoutAIContext } from "@/engine/bout/BoutAI";

describe("chooseTactic", () => {
  function makeCtx(seed = "test-seed", overrides: Partial<BoutAIContext> = {}): BoutAIContext {
    return {
      rng: new SeededRNG(seed),
      ...overrides,
    };
  }

  it("returns an override tactic for a make-koshi final-day precipice", () => {
    const cpu = mockRikishi("cpu", { style: "oshi" });
    const opp = mockRikishi("opp", { style: "yotsu" });
    const ctx = makeCtx("seed", {
      bashoDay: 15,
      cpuRecord: { wins: 6, losses: 7 },
      rivalryHeat: 0,
    });
    const tactic = chooseTactic(cpu, opp, ctx);
    expect(tactic).toBe("ALL_OUT");
  });

  it("falls back to style-based tactic when no override fires", () => {
    const cpu = mockRikishi("cpu", { style: "oshi" });
    const opp = mockRikishi("opp", { style: "yotsu" });
    const ctx = makeCtx("consistent", { bashoDay: 5 });
    const tactic = chooseTactic(cpu, opp, ctx);
    expect(["OSHI_THRUST", "STANDARD", "YOTSU_BELT", "HENKA", "NEKODAMASHI"]).toContain(tactic);
  });

  it("is deterministic for the same seed and context", () => {
    const cpu = mockRikishi("cpu", { style: "hybrid" });
    const opp = mockRikishi("opp", { style: "oshi" });
    const ctx1 = makeCtx("det", { bashoDay: 7 });
    const ctx2 = makeCtx("det", { bashoDay: 7 });
    expect(chooseTactic(cpu, opp, ctx1)).toBe(chooseTactic(cpu, opp, ctx2));
  });

  it("reduces intensity when CPU is fatigued", () => {
    const cpu = mockRikishi("cpu", {
      style: "oshi",
      fatigue: 90,
      stats: { power: 80, speed: 50, technique: 50, balance: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, experience: 50, aggression: 50 },
    });
    const opp = mockRikishi("opp", { style: "yotsu" });
    // Use a context where the base roll would produce an intensity tactic.
    const ctx = makeCtx("fatigue", { bashoDay: 5, fatigue: 90 });
    const tactic = chooseTactic(cpu, opp, ctx);
    expect(tactic).toBe("STANDARD");
  });

  it("counters a belt-dominant opponent model", () => {
    const cpu = mockRikishi("cpu", {
      style: "hybrid",
      stats: { power: 60, speed: 60, technique: 60, balance: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, experience: 50, aggression: 50 },
    });
    const opp = mockRikishi("opp", {
      style: "yotsu",
      history: Array.from({ length: 10 }, () => ({
        opponentId: "x",
        win: true,
        kimarite: "yorikiri",
        bashoId: "b1",
        day: 1,
        year: 2025,
      })),
    });
    const ctx = makeCtx("counter", {
      bashoDay: 5,
      opponentModel: {
        rikishiId: opp.id,
        sampleSize: 10,
        familyCounts: { push: 0, belt: 10, trick: 0, speed: 0 },
        lastUpdated: 1,
      },
    });
    const tactic = chooseTactic(cpu, opp, ctx);
    // With belt-dominant opponent, counter is HENKA (trick family). Given the 60% nudge, same seed should yield HENKA.
    expect(tactic).toBe("HENKA");
  });

  it("preserves original CPU-only behavior via wrapper", () => {
    const cpu = mockRikishi("cpu", { style: "yotsu" });
    const rng = new SeededRNG("compat");
    const tactic = chooseTacticForCPU(cpu, rng);
    expect(["YOTSU_BELT", "STANDARD", "OSHI_THRUST", "HENKA", "NEKODAMASHI"]).toContain(tactic);
  });
});
