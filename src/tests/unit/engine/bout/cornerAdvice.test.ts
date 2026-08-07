import { describe, it, expect } from "vitest";
import { mockRikishi } from "../utils";
import { getAdvice } from "@/engine/bout/CornerAdvice";
import type { CornerAdviceContext } from "@/engine/bout/CornerAdvice";

describe("getAdvice", () => {
  function makeCtx(overrides: Partial<CornerAdviceContext> = {}): CornerAdviceContext {
    return {
      playerRikishi: mockRikishi("p1", {
        stats: { power: 60, speed: 60, technique: 60, balance: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, experience: 50, aggression: 50 },
      }),
      opponent: mockRikishi("o1", {
        style: "yotsu",
        history: Array.from({ length: 8 }, () => ({
          opponentId: "x",
          win: true,
          kimarite: "yorikiri",
          bashoId: "b1",
          day: 1,
          year: 2025,
        })),
      }),
      bashoDay: 5,
      ...overrides,
    };
  }

  it("suggests a counter-tactic with RPS reasoning", () => {
    const ctx = makeCtx();
    const advice = getAdvice(ctx);
    expect(advice.length).toBeGreaterThanOrEqual(1);
    expect(advice[0].category).toBe("bout");
    expect(advice[0].suggestedAction).toBeDefined();
    expect(advice[0].reasoning.some((r) => r.includes("Opponent model"))).toBe(true);
  });

  it("warns when the player is fatigued and suggests a safer approach", () => {
    const ctx = makeCtx({
      playerRikishi: mockRikishi("p1", { fatigue: 85 }),
    });
    const advice = getAdvice(ctx);
    const warning = advice.find((a) => a.title.includes("Fatigue warning"));
    expect(warning).toBeDefined();
    expect(warning?.priority).toBe("high");
    expect(warning?.suggestedAction).toBe("STANDARD");
  });

  it("does not duplicate the fatigue warning when already suggesting STANDARD", () => {
    const ctx = makeCtx({
      playerRikishi: mockRikishi("p1", {
        fatigue: 85,
        stats: { power: 30, speed: 30, technique: 30, balance: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, experience: 50, aggression: 50 },
      }),
      opponent: mockRikishi("o1", {
        style: "oshi",
        history: Array.from({ length: 8 }, () => ({
          opponentId: "x",
          win: true,
          kimarite: "oshidashi",
          bashoId: "b1",
          day: 1,
          year: 2025,
        })),
      }),
    });
    const advice = getAdvice(ctx);
    const warnings = advice.filter((a) => a.title.includes("Fatigue warning"));
    expect(warnings.length).toBeLessThanOrEqual(1);
  });

  it("returns deterministic advice for the same inputs", () => {
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    expect(getAdvice(ctx1)).toEqual(getAdvice(ctx2));
  });
});
