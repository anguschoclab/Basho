import { describe, it, expect } from "vitest";
import { FACILITY_REGISTRY } from "@/engine/types/infrastructure";
import { InfrastructureService } from "@/engine/economy/InfrastructureService";
import {
  tickFacilityCondition,
  repairFacility,
  repairCostFor,
} from "@/engine/economy/facilityWear";
import {
  getRestFatigueFloor,
  processRikishiWeekly,
} from "@/engine/training/weeklyTraining";
import { REST_FATIGUE_FLOOR_BASE } from "@/constants/engine/training";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { HeyaTrainingState } from "@/engine/types/training";
import type { Id } from "@/engine/types/common";

describe("dormitory facility (P3)", () => {
  it("is a valid registered FacilityId with coherent costs and bonuses", () => {
    const dorm = FACILITY_REGISTRY.dormitory;
    expect(dorm).toBeTruthy();
    expect(dorm.id === "dormitory").toBe(true);
    expect(dorm.baseCost).toBeGreaterThan(0);
    expect(dorm.maintenanceCost).toBeGreaterThan(0);
    expect(dorm.buildTimeBasho).toBeGreaterThanOrEqual(1);
    // Rest benefit: lowers the resting fatigue floor per level.
    expect(dorm.bonuses.fatigueFloor).toBeLessThan(0);
    // Quarters benefit: lifts heya morale per level.
    expect(dorm.bonuses.moraleBonus).toBeGreaterThan(0);
  });
});

function makeRecoveryWorld(dormLevel: number | null) {
  const heya = MockFactory.createHeya("heya_1", {
    infrastructure:
      dormLevel === null ? {} : { dormitory: { level: dormLevel, status: "active" } },
  });
  const rikishi = MockFactory.createRikishi("r1", {
    heyaId: "heya_1" as Id,
    fatigue: 10,
    injured: true,
  });
  const trainingState: HeyaTrainingState = {
    heyaId: "heya_1",
    activeProfile: {
      intensity: "conservative",
      focus: "neutral",
      recovery: "high",
      styleBias: "neutral",
    },
    focusSlots: [{ rikishiId: "r1", focusType: "protect" }],
    weeklyPlan: { r1: { 1: "none", 2: "none", 3: "none", 4: "none", 5: "none", 6: "none" } },
  } as HeyaTrainingState;
  const world = MockFactory.createWorld({
    rikishi: new Map([["r1", rikishi]]),
    heyas: new Map([["heya_1", heya]]),
    trainingState: new Map([["heya_1", trainingState]]),
  });
  return { world, rikishi };
}

describe("resting fatigue floor (dormitory/kitchen)", () => {
  it("getRestFatigueFloor reflects the base and dormitory-lowered floors", () => {
    const { world: noDorm } = makeRecoveryWorld(null);
    expect(getRestFatigueFloor(noDorm, "heya_1")).toBe(REST_FATIGUE_FLOOR_BASE);

    const { world: dorm1 } = makeRecoveryWorld(1);
    expect(getRestFatigueFloor(dorm1, "heya_1")).toBe(REST_FATIGUE_FLOOR_BASE - 4);
  });

  it("recovery sheds to the base floor without facilities and deeper with a dormitory", () => {
    // conservative + high recovery + protect focus nets a negative weekly
    // delta; injured rikishi on protect shed fatigue toward the rest floor.
    const { world, rikishi } = makeRecoveryWorld(null);
    const builder = createImpactBuilder("test");
    processRikishiWeekly(rikishi, world, new Map(), builder);
    const updates = builder.build().entities?.rikishiUpdates?.get("r1") as
      | { fatigue?: number }
      | undefined;
    expect(updates?.fatigue).toBe(REST_FATIGUE_FLOOR_BASE);

    const { world: dormWorld, rikishi: dormRikishi } = makeRecoveryWorld(1);
    const dormBuilder = createImpactBuilder("test");
    processRikishiWeekly(dormRikishi, dormWorld, new Map(), dormBuilder);
    const dormUpdates = dormBuilder.build().entities?.rikishiUpdates?.get("r1") as
      | { fatigue?: number }
      | undefined;
    expect(dormUpdates?.fatigue).toBeLessThan(REST_FATIGUE_FLOOR_BASE);
    // Shed amount (−5) is the binding limit once the floor drops below it.
    expect(dormUpdates?.fatigue).toBe(5);
  });

  it("aggregates dormitory moraleBonus per level", () => {
    const heya = MockFactory.createHeya("heya_m", {
      infrastructure: { dormitory: { level: 2, status: "active" } },
    });
    expect(InfrastructureService.getHeyaBonuses(heya).moraleBonus).toBe(6);
  });
});

describe("facility condition (deferred wear item)", () => {
  const mkInfraWorld = (condition?: number) => {
    const heya = MockFactory.createHeya("heya_c", {
      funds: 10_000_000,
      infrastructure: {
        dormitory: {
          level: 1,
          status: "active",
          ...(condition != null ? { condition } : {}),
        },
      },
    });
    return MockFactory.createWorld({ heyas: new Map([["heya_c", heya]]) });
  };
  const heyaUpdate = (impact: ReturnType<typeof tickFacilityCondition>) =>
    impact.entities?.heyaUpdates?.get("heya_c") as
      | { funds?: number; infrastructure?: Record<string, { condition?: number }> }
      | undefined;

  it("decays active facilities monthly, defaulting missing condition to 100", () => {
    const worn = heyaUpdate(tickFacilityCondition(mkInfraWorld(80)));
    expect(worn?.infrastructure?.dormitory?.condition).toBe(75);
    const fresh = heyaUpdate(tickFacilityCondition(mkInfraWorld()));
    expect(fresh?.infrastructure?.dormitory?.condition).toBe(95);
  });

  it("wear scales facility bonuses", () => {
    const worn = MockFactory.createHeya("h", {
      infrastructure: { dormitory: { level: 2, status: "active", condition: 50 } },
    });
    expect(InfrastructureService.getHeyaBonuses(worn).moraleBonus).toBeCloseTo(3);
    expect(InfrastructureService.getHeyaBonuses(worn).fatigueFloor).toBeCloseTo(-4);
  });

  it("repair restores condition for a fee and is funds-gated", () => {
    const world = mkInfraWorld(50);
    const cost = repairCostFor(FACILITY_REGISTRY.dormitory, 50);
    expect(cost).toBeGreaterThan(0);
    const up = heyaUpdate(repairFacility(world, "heya_c", "dormitory"));
    expect(up?.infrastructure?.dormitory?.condition).toBe(100);
    expect(up?.funds).toBe(10_000_000 - cost);

    const broke = mkInfraWorld(50);
    broke.heyas.get("heya_c")!.funds = 0;
    const denied = heyaUpdate(repairFacility(broke, "heya_c", "dormitory"));
    expect(denied?.funds).toBeUndefined();
    expect(denied?.infrastructure?.dormitory?.condition).toBeUndefined();
  });
});
