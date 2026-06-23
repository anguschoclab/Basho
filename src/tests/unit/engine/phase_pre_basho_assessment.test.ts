import { describe, it, expect, vi } from "vitest";

vi.mock("@/engine/systems/media/MediaService", () => ({
  triggerPreBashoJournalism: () => ({ source: "mock", entities: {}, events: [] }),
}));

import { phase_pre_basho_assessment } from "@/engine/tick/phases/phase_pre_basho_assessment";
import { makeMockWorld, mockRikishi, makeMockHeya } from "./utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

function makeAssessmentWorld(rikishiOverrides: Record<string, unknown> = {}): WorldState {
  const rikishi = mockRikishi("r-test", {
    heyaId: "heya-test",
    ...rikishiOverrides,
  } as any);
  const heya = makeMockHeya("heya-test", { id: "heya-test" });

  const world = makeMockWorld({
    cyclePhase: "pre_basho",
    _interimDaysRemaining: 10,
    calendar: { currentWeek: 5, month: 1 },
    playerHeyaId: "heya-other",
  });

  world.rikishi.set("r-test", rikishi);
  world.heyas.set("heya-test", heya);

  return world;
}

describe("phase_pre_basho_assessment — falsy zero handling", () => {
  it("condition 0 applies full health penalty (not defaulted to 100)", () => {
    const world = makeAssessmentWorld({ condition: 0, fatigue: 0, injured: false });
    const impact = phase_pre_basho_assessment(world);
    const newWorld = resolveImpacts(world, [impact]);

    const assessment = newWorld._preBashoAssessment;
    expect(assessment).toBeDefined();
    const entry = assessment!.rikishiAssessments.get("r-test");
    expect(entry).toBeDefined();
    // condition=0 → penalty = (100 - 0) * 0.3 = 30 → healthScore = 70
    expect(entry!.healthScore).toBe(70);
  });

  it("stamina 0 applies full health penalty (not defaulted to 100)", () => {
    const world = makeAssessmentWorld({ stamina: 0, condition: 100, fatigue: 0, injured: false });
    const impact = phase_pre_basho_assessment(world);
    const newWorld = resolveImpacts(world, [impact]);

    const assessment = newWorld._preBashoAssessment;
    expect(assessment).toBeDefined();
    const entry = assessment!.rikishiAssessments.get("r-test");
    expect(entry).toBeDefined();
    // stamina=0 → penalty = (100 - 0) * 0.2 = 20 → healthScore = 80
    expect(entry!.healthScore).toBe(80);
  });

  it("injuryWeeksRemaining 0 does not default to 4 in medical certificate", () => {
    const rikishi = mockRikishi("r-injured", {
      heyaId: "heya-test",
      injured: true,
      injuryWeeksRemaining: 0,
      injuryStatus: {
        type: "muscle_strain" as any,
        severity: "serious" as any,
        isInjured: true,
      },
      condition: 100,
      fatigue: 0,
    });
    const heya = makeMockHeya("heya-test", { id: "heya-test" });

    const world = makeMockWorld({
      cyclePhase: "pre_basho",
      _interimDaysRemaining: 10,
      calendar: { currentWeek: 5, month: 1 },
      playerHeyaId: "heya-other",
    });

    world.rikishi.set("r-injured", rikishi);
    world.heyas.set("heya-test", heya);

    const impact = phase_pre_basho_assessment(world);
    const newWorld = resolveImpacts(world, [impact]);

    const updated = newWorld.rikishi.get("r-injured");
    expect(updated?.isKyujo).toBe(true);
    expect(updated?.medicalCertificate).toBeDefined();
    expect(updated!.medicalCertificate!.treatmentWeeks).toBe(0);
  });
});
