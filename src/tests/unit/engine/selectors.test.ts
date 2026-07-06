import { describe, it, expect, beforeEach } from "vitest";
import { getEligibleOpponents, selectHeyasWithCriticalWelfare, selectMergerCandidates, selectRetiredRikishi, getActiveRikishi, getAvailableStables, getStableFinances } from "@/engine/selectors";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { WorldState } from "@/engine/types/world";

describe("selectors", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  describe("getActiveRikishi", () => {
    it("returns rikishi in activeRikishiIds map, caching on subsequent calls", () => {
      const r1 = MockFactory.createRikishi({ id: "r-1" });
      const r2 = MockFactory.createRikishi({ id: "r-2" });
      const r3 = MockFactory.createRikishi({ id: "r-3" }); // Not active

      world.rikishi.set("r-1", r1);
      world.rikishi.set("r-2", r2);
      world.rikishi.set("r-3", r3);

      world.activeRikishiIds = new Set(["r-1", "r-2"]);

      // Call 1 - populate cache
      const active1 = getActiveRikishi(world);
      expect(active1.length).toBe(2);
      expect(active1.some(r => r.id === "r-1")).toBe(true);

      // modify state directly, without updating cache dependencies
      world.activeRikishiIds.add("r-3");

      // Call 2 - use cache
      const active2 = getActiveRikishi(world);
      expect(active2.length).toBe(2); // Should be 2 because it's cached

      // update cache dependency
      world.dayIndexGlobal = (world.dayIndexGlobal || 0) + 1;
      const active3 = getActiveRikishi(world);
      expect(active3.length).toBe(3); // Should now be 3
    });
  });

  describe("getAvailableStables", () => {
    it("returns all heyas, caching on subsequent calls", () => {
      const h1 = MockFactory.createHeya("h-1");
      world.heyas.set("h-1", h1);

      const stables1 = getAvailableStables(world);
      expect(stables1.length).toBe(1);

      const h2 = MockFactory.createHeya("h-2");
      world.heyas.set("h-2", h2);

      const stables2 = getAvailableStables(world);
      expect(stables2.length).toBe(1); // Cached

      world.dayIndexGlobal = (world.dayIndexGlobal || 0) + 1;
      const stables3 = getAvailableStables(world);
      expect(stables3.length).toBe(2); // Cache invalidated
    });
  });

  describe("getEligibleOpponents", () => {
    it("filters out inactive, injured, and same-stable rikishi", () => {
      const heya1 = MockFactory.createHeya("heya-1");
      const heya2 = MockFactory.createHeya("heya-2");

      const r1 = MockFactory.createRikishi({ id: "r-1", heyaId: "heya-1" });
      const r2 = MockFactory.createRikishi({ id: "r-2", heyaId: "heya-1" }); // Same heya
      const r3 = MockFactory.createRikishi({ id: "r-3", heyaId: "heya-2", injured: true }); // Injured
      const r4 = MockFactory.createRikishi({ id: "r-4", heyaId: "heya-2" }); // Eligible
      const r5 = MockFactory.createRikishi({ id: "r-5", heyaId: "heya-2", isRetired: true }); // Retired but let's say they're still active in roster temporarily

      world.heyas.set("heya-1", heya1);
      world.heyas.set("heya-2", heya2);

      world.rikishi.set("r-1", r1);
      world.rikishi.set("r-2", r2);
      world.rikishi.set("r-3", r3);
      world.rikishi.set("r-4", r4);
      world.rikishi.set("r-5", r5);

      world.activeRikishiIds = new Set(["r-1", "r-2", "r-3", "r-4", "r-5"]);

      const eligible = getEligibleOpponents(world, "r-1");
      expect(eligible.length).toBe(2);
      expect(eligible.some(r => r.id === "r-4")).toBe(true);
      expect(eligible.some(r => r.id === "r-5")).toBe(true); // Retired flag doesn't affect getEligibleOpponents unless removed from active roster
    });

    it("returns empty array if searching for opponent of nonexistent rikishi", () => {
      const eligible = getEligibleOpponents(world, "missing");
      expect(eligible).toEqual([]);
    });
  });

  describe("selectRetiredRikishi", () => {
    it("returns rikishi marked as retired in the active map", () => {
      const r1 = MockFactory.createRikishi({ id: "r-1", isRetired: false });
      const r2 = MockFactory.createRikishi({ id: "r-2", isRetired: true });

      world.rikishi.set("r-1", r1);
      world.rikishi.set("r-2", r2);

      const retired = selectRetiredRikishi(world);
      expect(retired.length).toBe(1);
      expect(retired[0].id).toBe("r-2");
    });
  });

  describe("selectHeyasWithCriticalWelfare", () => {
    it("returns heyas with high welfare risk or critical compliance state", () => {
      const h1 = MockFactory.createHeya({ id: "h-1" });
      h1.id = "h-1";
      h1.welfareState = { welfareRisk: 20, complianceState: "compliant", stressPoints: 0, violations: [] };

      const h2 = MockFactory.createHeya({ id: "h-2" });
      h2.id = "h-2";
      h2.welfareState = { welfareRisk: 60, complianceState: "compliant", stressPoints: 0, violations: [] }; // High risk

      const h3 = MockFactory.createHeya({ id: "h-3" });
      h3.id = "h-3";
      h3.welfareState = { welfareRisk: 20, complianceState: "investigation", stressPoints: 0, violations: [] }; // Critical compliance

      const h4 = MockFactory.createHeya({ id: "h-4" }); // No welfareState
      h4.id = "h-4";

      world.heyas.set("h-1", h1);
      world.heyas.set("h-2", h2);
      world.heyas.set("h-3", h3);
      world.heyas.set("h-4", h4);

      const critical = selectHeyasWithCriticalWelfare(world);
      expect(critical.length).toBe(2);
      expect(critical.some(h => h.id === "h-2")).toBe(true);
      expect(critical.some(h => h.id === "h-3")).toBe(true);
    });
  });

  describe("selectMergerCandidates", () => {
    it("returns heyas with net debt and 3 or fewer active rikishi", () => {
      const h1 = MockFactory.createHeya({ id: "h-1" }); // Positive funds
      h1.id = "h-1";
      h1.funds = 100;
      h1.rikishiIds = ["r1"];

      const h2 = MockFactory.createHeya({ id: "h-2" }); // Debt but >3 rikishi
      h2.id = "h-2";
      h2.funds = -100;
      h2.rikishiIds = ["r1", "r2", "r3", "r4"];

      const h3 = MockFactory.createHeya({ id: "h-3" }); // Merger candidate
      h3.id = "h-3";
      h3.funds = -100;
      h3.rikishiIds = ["r1", "r2", "r3"];

      const h4 = MockFactory.createHeya({ id: "h-4" }); // Merger candidate
      h4.id = "h-4";
      h4.funds = -500;
      h4.rikishiIds = [];

      world.heyas.set("h-1", h1);
      world.heyas.set("h-2", h2);
      world.heyas.set("h-3", h3);
      world.heyas.set("h-4", h4);

      const candidates = selectMergerCandidates(world);
      expect(candidates.length).toBe(2);
      expect(candidates.some(h => h.id === "h-3")).toBe(true);
      expect(candidates.some(h => h.id === "h-4")).toBe(true);
    });
  });

  describe("getStableFinances", () => {
    it("returns stable funds if the stable exists", () => {
      const h1 = MockFactory.createHeya({ id: "h-1" });
      h1.id = "h-1";
      h1.funds = 12345;
      world.heyas.set("h-1", h1);

      expect(getStableFinances(world, "h-1")).toBe(12345);
    });

    it("returns 0 if the stable does not exist", () => {
      expect(getStableFinances(world, "nonexistent")).toBe(0);
    });
  });
});
