import { describe, it, expect } from "vitest";
import { getActiveRikishi, getEligibleOpponents, getAvailableStables, getStableFinances, selectRetiredRikishi, selectHeyasWithCriticalWelfare, selectMergerCandidates } from "@/engine/selectors";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

describe("Selectors", () => {
  describe("getActiveRikishi", () => {
    it("should return only active rikishi and memoize result", () => {
      const world = MockFactory.createWorld();

      const r1 = MockFactory.createRikishi("r1");
      const r2 = MockFactory.createRikishi("r2", { isRetired: true });
      const r3 = MockFactory.createRikishi("r3");

      world.rikishi.set("r1", r1);
      world.rikishi.set("r2", r2 as Rikishi); // Retired, not active
      world.rikishi.set("r3", r3);

      const active1 = getActiveRikishi(world);
      expect(active1.length).toBe(2);
      expect(active1.find(r => r.id === "r1")).toBeDefined();
      expect(active1.find(r => r.id === "r2")).toBeUndefined();

      const active2 = getActiveRikishi(world);
      expect(active1).toBe(active2); // Should return cached reference

      world.dayIndexGlobal = 1; // Invalidate cache
      const active3 = getActiveRikishi(world);
      expect(active3).not.toBe(active1); // Should return new reference
    });
  });

  describe("getEligibleOpponents", () => {
    it("should exclude injured, retired, and same-stable rikishi", () => {
      const world = MockFactory.createWorld();

      const me = MockFactory.createRikishi("me", { heyaId: "heya1" });
      const sameHeya = MockFactory.createRikishi("sameHeya", { heyaId: "heya1" });
      const injured = MockFactory.createRikishi("injured", { heyaId: "heya2", injured: true });
      const eligible = MockFactory.createRikishi("eligible", { heyaId: "heya2" });

      world.rikishi.set("me", me);
      world.rikishi.set("sameHeya", sameHeya);
      world.rikishi.set("injured", injured);
      world.rikishi.set("eligible", eligible);

      const opponents = getEligibleOpponents(world, "me");

      expect(opponents.length).toBe(1);
      expect(opponents[0].id).toBe("eligible");
    });
  });

  describe("selectHeyasWithCriticalWelfare", () => {
    it("should return heyas with welfare risk >= 55 or critical compliance", () => {
      const world = MockFactory.createWorld();

      const normal = MockFactory.createHeya("normal");
      normal.welfareState = { welfareRisk: 20, recentIncidents: [], complianceState: "compliant", stressPoints: 0, resilienceScore: 0 };

      const risky = MockFactory.createHeya("risky");
      risky.welfareState = { welfareRisk: 60, recentIncidents: [], complianceState: "compliant", stressPoints: 0, resilienceScore: 0 };

      const sanctioned = MockFactory.createHeya("sanctioned");
      sanctioned.welfareState = { welfareRisk: 10, recentIncidents: [], complianceState: "sanctioned", stressPoints: 0, resilienceScore: 0 };

      world.heyas.set("normal", normal);
      world.heyas.set("risky", risky);
      world.heyas.set("sanctioned", sanctioned);

      const result = selectHeyasWithCriticalWelfare(world);

      expect(result.length).toBe(2);
      expect(result.map(h => h.id)).toContain("risky");
      expect(result.map(h => h.id)).toContain("sanctioned");
    });
  });
});
