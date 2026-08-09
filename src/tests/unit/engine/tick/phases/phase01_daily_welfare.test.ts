// @vitest-environment node
import { describe, it, expect } from "vitest";
import { phase01_daily_welfare } from "@/engine/tick/phases/phase01_daily_welfare";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types/rikishi";
import {
  WEIGHT_LOSS_STARVATION,
  WEIGHT_GAIN_HIGH_CALORIE,
  WEIGHT_GAIN_MODERATE,
  MENTAL_LOSS_STARVATION,
  MENTAL_LOSS_POOR,
  MENTAL_GAIN_GOOD,
  FATIGUE_RECOVERY_GOOD,
} from "@/constants/engine/condition";

function makeWorldWithDiet(
  diet: string,
  rikishiOverrides: Partial<Rikishi> = {}
): {
  world: WorldState;
  heya: Heya;
  rikishi: Rikishi;
} {
  const heya = MockFactory.createHeya("heya_test", {
    welfareState: {
      welfareRisk: "low",
      complianceState: "compliant",
      weeksInState: 0,
      lastReviewedWeek: 0,
      activeDiet: diet,
    } as any,
  });
  const rikishi = MockFactory.createRikishi("rikishi_test", {
    heyaId: heya.id,
    weight: 140,
    fatigue: 10,
    injured: false,
    isRetired: false,
    condition: 80,
    stats: {
      power: 50,
      technique: 50,
      speed: 50,
      weight: 140,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      balance: 50,
      aggression: 50,
      experience: 50,
    },
    ...rikishiOverrides,
  });

  const world = MockFactory.createWorld({
    heyas: new Map([[heya.id, heya]]),
    rikishi: new Map([[rikishi.id, rikishi]]),
    activeRikishiIds: new Set([rikishi.id]),
    cyclePhase: "pre_basho",
  });

  return { world, heya, rikishi };
}

function getRikishiUpdate(world: WorldState, id: string): Rikishi | undefined {
  const impact = phase01_daily_welfare(world);
  return impact.entities?.rikishiUpdates?.get(id) as Rikishi | undefined;
}

describe("phase01_daily_welfare", () => {
  it("applies austerity diet: reduces weight, reduces mental", () => {
    const { world, rikishi } = makeWorldWithDiet("austerity");
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.weight).toBeCloseTo(140 - WEIGHT_LOSS_STARVATION, 5);
    expect(update!.stats!.mental).toBeCloseTo(50 - MENTAL_LOSS_STARVATION, 5);
  });

  it("applies heavy_bulk diet: increases weight, reduces mental", () => {
    const { world, rikishi } = makeWorldWithDiet("heavy_bulk");
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.weight).toBeCloseTo(140 + WEIGHT_GAIN_HIGH_CALORIE, 5);
    expect(update!.stats!.mental).toBeCloseTo(50 - MENTAL_LOSS_POOR, 5);
  });

  it("applies premium diet: increases weight, increases mental, recovers fatigue", () => {
    const { world, rikishi } = makeWorldWithDiet("premium", { fatigue: 10 });
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.weight).toBeCloseTo(140 + WEIGHT_GAIN_MODERATE, 5);
    expect(update!.stats!.mental).toBeCloseTo(50 + MENTAL_GAIN_GOOD, 5);
    // Premium recovers 1 fatigue + base recovery of 0.3
    expect(update!.fatigue).toBeLessThan(10);
  });

  it("applies maintenance diet: no weight change", () => {
    const { world, rikishi } = makeWorldWithDiet("maintenance", { fatigue: 0 });
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.weight).toBe(140);
  });

  it("recovers base fatigue for non-injured rikishi", () => {
    const { world, rikishi } = makeWorldWithDiet("maintenance", { fatigue: 10 });
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.fatigue).toBeCloseTo(Math.max(0, 10 - FATIGUE_RECOVERY_GOOD), 5);
  });

  it("does not recover fatigue for injured rikishi", () => {
    const { world, rikishi } = makeWorldWithDiet("maintenance", { fatigue: 10, injured: true });
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.fatigue).toBe(10);
  });

  it("syncs descriptor via toRikishiDescriptor", () => {
    const { world, rikishi } = makeWorldWithDiet("maintenance");
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.descriptor).toBeDefined();
  });

  it("applies tickCondition based on cyclePhase", () => {
    const { world, rikishi } = makeWorldWithDiet("maintenance", { condition: 80, fatigue: 0 });
    // pre_basho → slow recovery (0.5)
    const update = getRikishiUpdate(world, rikishi.id);

    expect(update).toBeDefined();
    expect(update!.condition).toBeCloseTo(80.5, 2);
  });

  it("caches heya diets for performance", () => {
    const heya = MockFactory.createHeya("heya_cache", {
      welfareState: {
        welfareRisk: "low",
        complianceState: "compliant",
        weeksInState: 0,
        lastReviewedWeek: 0,
        activeDiet: "premium",
      } as any,
    });
    const r1 = MockFactory.createRikishi("r1", { heyaId: heya.id, fatigue: 5 });
    const r2 = MockFactory.createRikishi("r2", { heyaId: heya.id, fatigue: 5 });

    const world = MockFactory.createWorld({
      heyas: new Map([[heya.id, heya]]),
      rikishi: new Map([
        [r1.id, r1],
        [r2.id, r2],
      ]),
      activeRikishiIds: new Set([r1.id, r2.id]),
      cyclePhase: "pre_basho",
    });

    const impact = phase01_daily_welfare(world);

    // Both rikishi should get premium diet effects
    const u1 = impact.entities?.rikishiUpdates?.get(r1.id) as Rikishi | undefined;
    const u2 = impact.entities?.rikishiUpdates?.get(r2.id) as Rikishi | undefined;

    expect(u1).toBeDefined();
    expect(u2).toBeDefined();
    expect(u1!.weight).toBeCloseTo(140 + WEIGHT_GAIN_MODERATE, 5);
    expect(u2!.weight).toBeCloseTo(140 + WEIGHT_GAIN_MODERATE, 5);
  });
});
