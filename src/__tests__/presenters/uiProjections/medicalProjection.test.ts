/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from "vitest";
import { clearQueryCaches } from "../../../engine/queries";
import { projectMedicalUIDigest } from "../../../presenters/uiProjections/medicalProjection";
import { createMockWorldState, createMockHeya, createMockRikishi } from "../../utils/testHelpers";

function makeWorld(heyaOverrides: Record<string, any> = {}, rikishi: any[] = [], worldOverrides: Record<string, any> = {}) {
  const heya = createMockHeya({ id: "player-heya-1", name: "Test Stable", ...heyaOverrides });
  const rikishiMap = new Map<string, any>();
  const ids: string[] = [] as string[];
  for (const r of rikishi) {
    rikishiMap.set(r.id, r);
    ids.push(r.id);
  }
  if (!heyaOverrides.rikishiIds) (heya as any).rikishiIds = ids;
  return createMockWorldState({
    playerHeyaId: "player-heya-1",
    heyas: new Map([["player-heya-1", heya]]),
    rikishi: rikishiMap,
    activeRikishiIds: new Set(ids),
    ...worldOverrides,
  });
}

describe("projectMedicalUIDigest", () => {
  beforeEach(() => {
    clearQueryCaches();
  });
  it("returns null when playerHeyaId is absent", () => {
    const world = createMockWorldState({ playerHeyaId: undefined });
    expect(projectMedicalUIDigest(world as any)).toBeNull();
  });

  it("returns null when player heya is not in map", () => {
    const world = createMockWorldState({ playerHeyaId: "ghost", heyas: new Map() });
    expect(projectMedicalUIDigest(world as any)).toBeNull();
  });

  it("returns a digest with empty arrays for a basic heya with no roster", () => {
    const world = makeWorld();
    const result = projectMedicalUIDigest(world as any);
    expect(result).not.toBeNull();
    expect(result?.injuredRikishi).toEqual([]);
    expect(result?.perception.rikishiHealthPerceptions).toEqual([]);
  });

  it("welfare.activeDiet defaults to maintenance when welfareState absent", () => {
    const world = makeWorld({ welfareState: undefined });
    expect(projectMedicalUIDigest(world as any)?.welfare.activeDiet).toBe("maintenance");
  });

  it("welfare.complianceState defaults to compliant when welfareState absent", () => {
    const world = makeWorld({ welfareState: undefined });
    expect(projectMedicalUIDigest(world as any)?.welfare.complianceState).toBe("compliant");
  });

  it("welfare.welfareRisk defaults to 0 when welfareState absent", () => {
    const world = makeWorld({ welfareState: undefined });
    expect(projectMedicalUIDigest(world as any)?.welfare.welfareRisk).toBe(0);
  });

  it("facilityLevel comes from heya.facilities.recovery ?? 50", () => {
    const world = makeWorld({ facilities: { recovery: 72, training: 50, nutrition: 50 } });
    expect(projectMedicalUIDigest(world as any)?.facilityLevel).toBe(72);
  });

  it("facilityLevel defaults to 50 when facilities absent", () => {
    const world = makeWorld({ facilities: undefined });
    expect(projectMedicalUIDigest(world as any)?.facilityLevel).toBe(50);
  });

  it("facilityLabel is a non-empty string", () => {
    const world = makeWorld({ facilities: { recovery: 80, training: 50, nutrition: 50 } });
    const label = projectMedicalUIDigest(world as any)?.facilityLabel;
    expect(typeof label).toBe("string");
    expect(label!.length).toBeGreaterThan(0);
  });

  describe("welfareRiskBand thresholds (medicalProjection.ts — NOT perception.ts)", () => {
    const cases: [number, string][] = [
      [0, "safe"],
      [24, "safe"],
      [25, "cautious"],
      [49, "cautious"],
      [50, "elevated"],
      [74, "elevated"],
      [75, "critical"],
      [100, "critical"],
    ];
    for (const [risk, expected] of cases) {
      it(`welfareRisk=${risk} → "${expected}"`, () => {
        const world = makeWorld({ welfareState: { welfareRisk: risk, complianceState: "compliant", weeksInState: 0 } });
        expect(projectMedicalUIDigest(world as any)?.perception.welfareRiskBand).toBe(expected);
      });
    }
  });

  describe("moraleBand thresholds", () => {
    const cases: [number, string][] = [
      [80, "inspired"],
      [79, "content"],
      [60, "content"],
      [59, "neutral"],
      [40, "neutral"],
      [39, "disgruntled"],
      [20, "disgruntled"],
      [19, "mutinous"],
      [0, "mutinous"],
    ];
    for (const [morale, expected] of cases) {
      it(`morale=${morale} → "${expected}"`, () => {
        const world = makeWorld({ welfareState: { welfareRisk: 0, morale, complianceState: "compliant", weeksInState: 0 } });
        expect(projectMedicalUIDigest(world as any)?.perception.moraleBand).toBe(expected);
      });
    }

    it("morale defaults to 50 when welfareState absent → neutral", () => {
      const world = makeWorld({ welfareState: undefined });
      expect(projectMedicalUIDigest(world as any)?.perception.moraleBand).toBe("neutral");
    });
  });

  describe("rosterStrengthBand", () => {
    function worldWithSekitori(sekitoriCount: number, extraNonSekitori = 0) {
      const rikishiList: any[] = [];
      for (let i = 0; i < sekitoriCount; i++) {
        rikishiList.push(createMockRikishi({ id: `s${i}`, heyaId: "player-heya-1", division: "makuuchi" }));
      }
      for (let i = 0; i < extraNonSekitori; i++) {
        rikishiList.push(createMockRikishi({ id: `ns${i}`, heyaId: "player-heya-1", division: "jonokuchi" }));
      }
      return makeWorld({}, rikishiList);
    }

    it("0 sekitori + rosterSize < 5 → weak", () => {
      const world = worldWithSekitori(0, 2);
      expect(projectMedicalUIDigest(world as any)?.perception.rosterStrengthBand).toBe("weak");
    });

    it("0 sekitori + rosterSize >= 5 → developing", () => {
      const world = worldWithSekitori(0, 5);
      expect(projectMedicalUIDigest(world as any)?.perception.rosterStrengthBand).toBe("developing");
    });

    it("2 sekitori → competitive", () => {
      const world = worldWithSekitori(2);
      expect(projectMedicalUIDigest(world as any)?.perception.rosterStrengthBand).toBe("competitive");
    });

    it("4 sekitori → strong", () => {
      const world = worldWithSekitori(4);
      expect(projectMedicalUIDigest(world as any)?.perception.rosterStrengthBand).toBe("strong");
    });

    it("6 sekitori → dominant", () => {
      const world = worldWithSekitori(6);
      expect(projectMedicalUIDigest(world as any)?.perception.rosterStrengthBand).toBe("dominant");
    });

    it("juryo counts as sekitori", () => {
      const r = createMockRikishi({ id: "j1", heyaId: "player-heya-1", division: "juryo" });
      const r2 = createMockRikishi({ id: "j2", heyaId: "player-heya-1", division: "juryo" });
      const world = makeWorld({}, [r, r2]);
      expect(projectMedicalUIDigest(world as any)?.perception.rosterStrengthBand).toBe("competitive");
    });
  });

  describe("injuredRikishi", () => {
    it("includes rikishi with injured: true", () => {
      const injured = createMockRikishi({
        id: "r-inj",
        heyaId: "player-heya-1",
        injured: true,
        injuryWeeksRemaining: 3,
        injuryStatus: { type: "muscle_strain", severity: "minor", weeksRemaining: 3, weeksToHeal: 5, isInjured: true, location: "shoulder" },
      });
      const world = makeWorld({}, [injured]);
      const result = projectMedicalUIDigest(world as any);
      expect(result?.injuredRikishi).toHaveLength(1);
      expect(result?.injuredRikishi[0].id).toBe("r-inj");
    });

    it("excludes rikishi with injured: false", () => {
      const healthy = createMockRikishi({ id: "r-ok", heyaId: "player-heya-1", injured: false });
      const world = makeWorld({}, [healthy]);
      expect(projectMedicalUIDigest(world as any)?.injuredRikishi).toHaveLength(0);
    });

    it("recoveryProgress is clamped between 0 and 100", () => {
      const r = createMockRikishi({
        id: "ri",
        heyaId: "player-heya-1",
        injured: true,
        injuryWeeksRemaining: 0,
        injuryStatus: { type: "muscle_strain", severity: "minor", weeksRemaining: 0, weeksToHeal: 5, isInjured: true },
      });
      const world = makeWorld({}, [r]);
      const progress = projectMedicalUIDigest(world as any)?.injuredRikishi[0].recoveryProgress;
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it("facilityBonus = round((recoveryFacility - 50) / 10)", () => {
      const r = createMockRikishi({
        id: "ri",
        heyaId: "player-heya-1",
        injured: true,
        injuryWeeksRemaining: 2,
      });
      const world = makeWorld({ facilities: { recovery: 70, training: 50, nutrition: 50 } }, [r]);
      const bonus = projectMedicalUIDigest(world as any)?.injuredRikishi[0].facilityBonus;
      expect(bonus).toBe(2);
    });

    it("facilityBonus is negative for below-50 facility", () => {
      const r = createMockRikishi({ id: "ri", heyaId: "player-heya-1", injured: true, injuryWeeksRemaining: 2 });
      const world = makeWorld({ facilities: { recovery: 30, training: 50, nutrition: 50 } }, [r]);
      const bonus = projectMedicalUIDigest(world as any)?.injuredRikishi[0].facilityBonus;
      expect(bonus).toBe(-2);
    });
  });

  describe("rikishiHealthPerceptions condition bands", () => {
    const cases: [number, string][] = [
      [100, "peak"],
      [90, "peak"],
      [89, "good"],
      [70, "good"],
      [69, "fair"],
      [50, "fair"],
      [49, "worn"],
      [30, "worn"],
      [29, "fragile"],
      [0, "fragile"],
    ];
    for (const [condition, expected] of cases) {
      it(`condition=${condition} → healthBand="${expected}"`, () => {
        const r = createMockRikishi({ id: "r1", heyaId: "player-heya-1", condition });
        const world = makeWorld({}, [r]);
        const perceptions = projectMedicalUIDigest(world as any)?.perception.rikishiHealthPerceptions;
        expect(perceptions![0].healthBand).toBe(expected);
      });
    }
  });
});
