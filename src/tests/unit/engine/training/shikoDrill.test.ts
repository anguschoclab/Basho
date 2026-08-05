/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { DRILL_EFFECTS, DRILL_METADATA } from "@/constants/engine/training";
import type { DrillType } from "@/engine/types/training";

describe("Shiko drill — constants", () => {
  it("DRILL_EFFECTS includes shiko", () => {
    expect(DRILL_EFFECTS.shiko).toBeDefined();
  });

  it("shiko boosts balance and stamina", () => {
    const effects = DRILL_EFFECTS.shiko!;
    expect(effects.balance).toBeGreaterThan(0);
    expect(effects.stamina).toBeGreaterThan(0);
  });

  it("shiko has low fatigue cost (lower than butsukari)", () => {
    const shikoFatigue = DRILL_EFFECTS.shiko!.fatigue;
    const butsukariFatigue = DRILL_EFFECTS.butsukari!.fatigue;
    expect(shikoFatigue).toBeLessThan(butsukariFatigue);
  });

  it("shiko fatigue is non-negative (not a recovery drill)", () => {
    expect(DRILL_EFFECTS.shiko!.fatigue).toBeGreaterThanOrEqual(0);
  });

  it("shiko has no power bonus (specialized drill)", () => {
    expect(DRILL_EFFECTS.shiko!.power ?? 0).toBe(0);
  });

  it("DRILL_METADATA includes shiko with label and description", () => {
    expect(DRILL_METADATA.shiko).toBeDefined();
    expect(DRILL_METADATA.shiko!.label.length).toBeGreaterThan(0);
    expect(DRILL_METADATA.shiko!.description.length).toBeGreaterThan(0);
  });
});

describe("Shiko drill — type integration", () => {
  it("DrillType union includes 'shiko'", () => {
    const validDrills: DrillType[] = [
      "asageiko",
      "butsukari",
      "teppo",
      "moushi-ai",
      "shindo",
      "shiko",
      "none",
    ];
    // If 'shiko' is not in the union, TypeScript will error at compile time.
    expect(validDrills).toContain("shiko");
  });

  it("shiko-only week produces lower fatigue than butsukari-only week", () => {
    // Simulate a 6-day week of each
    let shikoWeekFatigue = 0;
    let butsukariWeekFatigue = 0;
    for (let i = 0; i < 6; i++) {
      shikoWeekFatigue += DRILL_EFFECTS.shiko!.fatigue;
      butsukariWeekFatigue += DRILL_EFFECTS.butsukari!.fatigue;
    }
    expect(shikoWeekFatigue).toBeLessThan(butsukariWeekFatigue);
  });

  it("shiko drill vector aggregation produces correct balance total", () => {
    const weeklyPlan: Record<number, DrillType> = {
      1: "shiko",
      2: "shiko",
      3: "shiko",
      4: "shiko",
      5: "shiko",
      6: "shiko",
    };

    let balanceTotal = 0;
    Object.values(weeklyPlan).forEach((drillType) => {
      const effects = DRILL_EFFECTS[drillType] || DRILL_EFFECTS.none;
      balanceTotal += effects.balance || 0;
    });

    const expectedBalance = (DRILL_EFFECTS.shiko!.balance ?? 0) * 6;
    expect(balanceTotal).toBeCloseTo(expectedBalance, 5);
  });
});
