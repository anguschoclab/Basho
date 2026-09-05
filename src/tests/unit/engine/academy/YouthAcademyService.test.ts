import { describe, it, expect } from "vitest";
import {
  buildYouthAcademy,
  upgradeYouthAcademy,
  generateYearlyIntake,
  applyWeeklyDevelopment,
  promoteIntake,
  investInAcademy,
  hireAcademyStaff,
  getYouthAcademy,
  getMaxProspects,
  getMaxStaff,
  getUpgradeCost,
  MAX_ACADEMY_LEVEL,
} from "@/engine/systems/recruitment/YouthAcademyService";
import type { WorldState } from "@/engine/types/world";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

function makeWorld(cash = 10_000_000): WorldState {
  return {
    seed: "academy-test",
    year: 2026,
    week: 1,
    heyas: new Map([
      ["h1", {
        id: "h1",
        name: "Test Heya",
        funds: cash,
        rikishiIds: [],
      } as any],
    ]),
    rikishi: new Map(),
    playerHeyaId: "h1",
    events: { log: [] },
  } as any;
}

function apply(world: WorldState, impacts: any[]): WorldState {
  return resolveImpacts(world, impacts);
}

describe("YouthAcademyService", () => {
  describe("buildYouthAcademy", () => {
    it("creates a level 1 academy with default budget and empty prospects", () => {
      const world = makeWorld();
      const impact = buildYouthAcademy(world, "h1");
      const next = apply(world, [impact]);
      const academy = getYouthAcademy(next.heyas.get("h1")!);
      expect(academy).not.toBeNull();
      expect(academy!.level).toBe(1);
      expect(academy!.prospects).toEqual([]);
      expect(academy!.totalGraduated).toBe(0);
      expect(academy!.budget).toBe(10_000);
      expect(academy!.staff).toEqual([]);
      expect(academy!.lastIntakeYear).toBe(0);
    });

    it("deducts the build cost from cash", () => {
      const world = makeWorld(200_000);
      const impact = buildYouthAcademy(world, "h1");
      const next = apply(world, [impact]);
      const cash = next.heyas.get("h1")!.funds ?? 0;
      expect(cash).toBe(200_000 - 50_000);
    });

    it("is a no-op when academy already exists", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [buildYouthAcademy(w1, "h1")]);
      const cash = w2.heyas.get("h1")!.funds ?? 0;
      // Should not deduct twice
      expect(cash).toBe(10_000_000 - 50_000);
    });

    it("is a no-op when insufficient cash", () => {
      const world = makeWorld(10_000);
      const impact = buildYouthAcademy(world, "h1");
      const next = apply(world, [impact]);
      expect(getYouthAcademy(next.heyas.get("h1")!)).toBeNull();
    });
  });

  describe("upgradeYouthAcademy", () => {
    it("upgrades to next level and deducts cost", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [upgradeYouthAcademy(w1, "h1")]);
      const academy = getYouthAcademy(w2.heyas.get("h1")!);
      expect(academy!.level).toBe(2);
      const cash = w2.heyas.get("h1")!.funds ?? 0;
      expect(cash).toBe(10_000_000 - 50_000 - 150_000);
    });

    it("is a no-op at max level", () => {
      const world = makeWorld();
      let w = apply(world, [buildYouthAcademy(world, "h1")]);
      for (let i = 0; i < 10; i++) {
        w = apply(w, [upgradeYouthAcademy(w, "h1")]);
      }
      const academy = getYouthAcademy(w.heyas.get("h1")!);
      expect(academy!.level).toBe(MAX_ACADEMY_LEVEL);
    });
  });

  describe("generateYearlyIntake", () => {
    it("produces 2-3 prospects on first intake", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const academy = getYouthAcademy(w2.heyas.get("h1")!);
      expect(academy!.prospects.length).toBeGreaterThanOrEqual(2);
      expect(academy!.prospects.length).toBeLessThanOrEqual(3);
      expect(academy!.lastIntakeYear).toBe(2026);
    });

    it("is a no-op when already generated this year", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const countBefore = getYouthAcademy(w2.heyas.get("h1")!)!.prospects.length;
      const w3 = apply(w2, [generateYearlyIntake(w2, "h1")]);
      const countAfter = getYouthAcademy(w3.heyas.get("h1")!)!.prospects.length;
      expect(countAfter).toBe(countBefore);
    });

    it("prospects have valid stats influenced by academy level", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const academy = getYouthAcademy(w2.heyas.get("h1")!);
      for (const p of academy!.prospects) {
        expect(p.potential).toBeGreaterThan(0);
        expect(p.potential).toBeLessThanOrEqual(95);
        expect(p.age).toBeGreaterThanOrEqual(15);
        expect(p.age).toBeLessThanOrEqual(17);
        expect(p.shikona.length).toBeGreaterThan(0);
      }
    });
  });

  describe("applyWeeklyDevelopment", () => {
    it("advances prospect ability toward potential ceiling", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const before = getYouthAcademy(w2.heyas.get("h1")!)!.prospects[0];
      const w3 = apply(w2, [applyWeeklyDevelopment(w2, "h1")]);
      const after = getYouthAcademy(w3.heyas.get("h1")!)!.prospects[0];
      expect(after.developmentPoints).toBeGreaterThanOrEqual(before.developmentPoints);
      expect(after.developmentHistory.length).toBeGreaterThan(0);
    });

    it("is a no-op when no prospects", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [applyWeeklyDevelopment(w1, "h1")]);
      const academy = getYouthAcademy(w2.heyas.get("h1")!);
      expect(academy!.prospects).toEqual([]);
    });
  });

  describe("promoteIntake", () => {
    it("removes prospect from academy and increments graduated count", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const prospect = getYouthAcademy(w2.heyas.get("h1")!)!.prospects[0];
      const w3 = apply(w2, [promoteIntake(w2, "h1", prospect.id)]);
      const academy = getYouthAcademy(w3.heyas.get("h1")!);
      expect(academy!.prospects.find((p) => p.id === prospect.id)).toBeUndefined();
      expect(academy!.totalGraduated).toBe(1);
    });

    it("creates a new rikishi in the world", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const prospect = getYouthAcademy(w2.heyas.get("h1")!)!.prospects[0];
      const w3 = apply(w2, [promoteIntake(w2, "h1", prospect.id)]);
      expect(w3.rikishi.has(prospect.id)).toBe(true);
    });

    it("adds the new rikishi to the heya roster", () => {
      const world = makeWorld();
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [generateYearlyIntake(w1, "h1")]);
      const prospect = getYouthAcademy(w2.heyas.get("h1")!)!.prospects[0];
      const w3 = apply(w2, [promoteIntake(w2, "h1", prospect.id)]);
      const heya = w3.heyas.get("h1")!;
      expect(heya.rikishiIds).toContain(prospect.id);
    });
  });

  describe("investInAcademy", () => {
    it("increases weekly budget and deducts cash", () => {
      const world = makeWorld(1_000_000);
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const before = getYouthAcademy(w1.heyas.get("h1")!)!.budget;
      const w2 = apply(w1, [investInAcademy(w1, "h1", 100_000)]);
      const after = getYouthAcademy(w2.heyas.get("h1")!)!.budget;
      expect(after).toBeGreaterThan(before);
      const cash = w2.heyas.get("h1")!.funds ?? 0;
      expect(cash).toBeLessThan(1_000_000 - 50_000);
    });

    it("is a no-op when insufficient cash", () => {
      const world = makeWorld(200_000);
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const before = getYouthAcademy(w1.heyas.get("h1")!)!.budget;
      const w2 = apply(w1, [investInAcademy(w1, "h1", 500_000)]);
      const after = getYouthAcademy(w2.heyas.get("h1")!)!.budget;
      expect(after).toBe(before);
    });
  });

  describe("hireAcademyStaff", () => {
    it("adds staff with the specified role", () => {
      const world = makeWorld(1_000_000);
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [hireAcademyStaff(w1, "h1", "head_coach")]);
      const academy = getYouthAcademy(w2.heyas.get("h1")!);
      expect(academy!.staff).toHaveLength(1);
      expect(academy!.staff[0].role).toBe("head_coach");
      expect(academy!.staff[0].quality).toBeGreaterThan(0);
    });

    it("deducts hire cost from cash", () => {
      const world = makeWorld(1_000_000);
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const cashBefore = w1.heyas.get("h1")!.funds ?? 0;
      const w2 = apply(w1, [hireAcademyStaff(w1, "h1", "head_coach")]);
      const cashAfter = w2.heyas.get("h1")!.funds ?? 0;
      expect(cashAfter).toBeLessThan(cashBefore);
    });

    it("rejects duplicate role", () => {
      const world = makeWorld(1_000_000);
      const w1 = apply(world, [buildYouthAcademy(world, "h1")]);
      const w2 = apply(w1, [hireAcademyStaff(w1, "h1", "head_coach")]);
      const w3 = apply(w2, [hireAcademyStaff(w2, "h1", "head_coach")]);
      const academy = getYouthAcademy(w3.heyas.get("h1")!);
      expect(academy!.staff.filter((s) => s.role === "head_coach")).toHaveLength(1);
    });
  });

  describe("helper functions", () => {
    it("getMaxProspects returns correct capacity per level", () => {
      expect(getMaxProspects({ level: 1, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(3);
      expect(getMaxProspects({ level: 3, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(8);
      expect(getMaxProspects({ level: 5, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(16);
    });

    it("getMaxStaff returns min(4, level)", () => {
      expect(getMaxStaff({ level: 1, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(1);
      expect(getMaxStaff({ level: 3, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(3);
      expect(getMaxStaff({ level: 5, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(4);
    });

    it("getUpgradeCost returns 0 at max level", () => {
      expect(getUpgradeCost({ level: MAX_ACADEMY_LEVEL, prospects: [], totalGraduated: 0, budget: 0, staff: [], lastIntakeYear: 0 })).toBe(0);
    });
  });
});
