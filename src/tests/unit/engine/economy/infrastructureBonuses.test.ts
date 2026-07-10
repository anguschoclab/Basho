import { describe, it, expect } from "vitest";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Heya } from "@/engine/types/heya";
import type { InfrastructureState } from "@/engine/types/infrastructure";

function makeHeyaWithInfra(infra: Record<string, InfrastructureState>): Heya {
  return MockFactory.createHeya("heya_test", {
    infrastructure: infra,
  } as any);
}

describe("InfrastructureService.getHeyaBonuses", () => {
  it("aggregates statBuffs from multiple active facilities at level 1", () => {
    const heya = makeHeyaWithInfra({
      weights_room: { level: 1, status: "active" },
      video_lab: { level: 1, status: "active" },
    });

    const bonuses = InfrastructureService.getHeyaBonuses(heya);

    expect(bonuses.statBuffs.power).toBeCloseTo(1.15, 5);
    expect(bonuses.statBuffs.stamina).toBeCloseTo(1.05, 5);
    expect(bonuses.statBuffs.technique).toBeCloseTo(1.15, 5);
    expect(bonuses.statBuffs.adaptability).toBeCloseTo(1.2, 5);
  });

  it("scales statBuffs by facility level", () => {
    const heya = makeHeyaWithInfra({
      weights_room: { level: 3, status: "active" },
    });

    const bonuses = InfrastructureService.getHeyaBonuses(heya);

    expect(bonuses.statBuffs.power).toBeCloseTo(1 + (1.15 - 1) * 3, 5);
    expect(bonuses.statBuffs.stamina).toBeCloseTo(1 + (1.05 - 1) * 3, 5);
  });

  it("ignores non-active facilities", () => {
    const heya = makeHeyaWithInfra({
      weights_room: { level: 1, status: "under_construction" },
      video_lab: { level: 1, status: "active" },
    });

    const bonuses = InfrastructureService.getHeyaBonuses(heya);

    expect(bonuses.statBuffs.power).toBe(1);
    expect(bonuses.statBuffs.technique).toBeCloseTo(1.15, 5);
  });

  it("aggregates injuryHealMod, mediaMod, fatigueFloor", () => {
    const heya = makeHeyaWithInfra({
      medical_suite: { level: 2, status: "active" },
      media_studio: { level: 2, status: "active" },
      traditional_kitchen: { level: 1, status: "active" },
    });

    const bonuses = InfrastructureService.getHeyaBonuses(heya);

    expect(bonuses.injuryHealMod).toBeCloseTo(-3 * 2, 5);
    expect(bonuses.mediaMod).toBeCloseTo(1 + (1.25 - 1) * 2, 5);
    expect(bonuses.fatigueFloor).toBe(5);
  });

  it("returns identity bonuses for heya with no infrastructure", () => {
    const heya = MockFactory.createHeya("empty_heya");

    const bonuses = InfrastructureService.getHeyaBonuses(heya);

    expect(bonuses.statBuffs.power).toBe(1);
    expect(bonuses.statBuffs.speed).toBe(1);
    expect(bonuses.injuryHealMod).toBe(0);
    expect(bonuses.mediaMod).toBe(1);
    expect(bonuses.fatigueFloor).toBe(0);
  });

  it("returns identity bonuses for undefined heya", () => {
    const bonuses = InfrastructureService.getHeyaBonuses(undefined);

    expect(bonuses.statBuffs.power).toBe(1);
    expect(bonuses.injuryHealMod).toBe(0);
  });
});
