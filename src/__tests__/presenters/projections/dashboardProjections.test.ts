/**
 * dashboardProjections.test.ts
 *
 * Tests for dashboard projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  projectDashboardUIDigest,
  projectBanzukeUIDigest,
} from "../../../presenters/projections/dashboardProjections";
import { createMockWorldState, createMockHeya, createMockRikishi } from "../../utils/testHelpers";

describe("dashboardProjections", () => {
  describe("projectDashboardUIDigest", () => {
    it("should return null when player heya not set", () => {
      const world = createMockWorldState({ playerHeyaId: undefined }) as any;
      const result = projectDashboardUIDigest(world);
      expect(result).toBeNull();
    });

    it("should return null when player heya not found", () => {
      const world = createMockWorldState({ playerHeyaId: "non-existent" }) as any;
      const result = projectDashboardUIDigest(world);
      expect(result).toBeNull();
    });

    it("should return dashboard data when player heya exists", () => {
      const world = createMockWorldState({ playerHeyaId: "heya-1" }) as any;
      const heya = createMockHeya({ id: "heya-1" });
      world.heyas.set("heya-1", heya);

      const result = projectDashboardUIDigest(world);
      expect(result).not.toBeNull();
      expect(result?.heya).toBeDefined();
      expect(result?.stats).toBeDefined();
    });

    describe("finances.status thresholds", () => {
      it("status is stable when funds > 10_000_000", () => {
        const world = createMockWorldState({ playerHeyaId: "h1" }) as any;
        world.heyas.set("h1", createMockHeya({ id: "h1", funds: 10_000_001 }));
        expect(projectDashboardUIDigest(world)?.finances.status).toBe("stable");
      });

      it("status is normal when funds = 0", () => {
        const world = createMockWorldState({ playerHeyaId: "h1" }) as any;
        world.heyas.set("h1", createMockHeya({ id: "h1", funds: 0 }));
        expect(projectDashboardUIDigest(world)?.finances.status).toBe("normal");
      });

      it("status is critical when funds < 0", () => {
        const world = createMockWorldState({ playerHeyaId: "h1" }) as any;
        world.heyas.set("h1", createMockHeya({ id: "h1", funds: -1 }));
        expect(projectDashboardUIDigest(world)?.finances.status).toBe("critical");
      });

      it("status boundary: funds exactly 10_000_000 is normal not stable", () => {
        const world = createMockWorldState({ playerHeyaId: "h1" }) as any;
        world.heyas.set("h1", createMockHeya({ id: "h1", funds: 10_000_000 }));
        expect(projectDashboardUIDigest(world)?.finances.status).toBe("normal");
      });
    });

    it("forwards transientContext.deltas to weeklyIncome and weeklyExpense", () => {
      const world = createMockWorldState({
        playerHeyaId: "h1",
        transientContext: { deltas: { revenue: 42_000, expenses: 15_000 } },
      }) as any;
      world.heyas.set("h1", createMockHeya({ id: "h1" }));
      const result = projectDashboardUIDigest(world);
      expect(result?.finances.weeklyIncome).toBe(42_000);
      expect(result?.finances.weeklyExpense).toBe(15_000);
    });

    it("weeklyIncome and weeklyExpense default to 0 when transientContext is absent", () => {
      const world = createMockWorldState({
        playerHeyaId: "h1",
        transientContext: undefined,
      }) as any;
      world.heyas.set("h1", createMockHeya({ id: "h1" }));
      const result = projectDashboardUIDigest(world);
      expect(result?.finances.weeklyIncome).toBe(0);
      expect(result?.finances.weeklyExpense).toBe(0);
    });

    it("injuredCount counts only rikishi with injured: true", () => {
      const world = createMockWorldState({ playerHeyaId: "h1" }) as any;
      const heya = createMockHeya({ id: "h1", rikishiIds: ["r1", "r2", "r3"] });
      world.heyas.set("h1", heya);
      world.rikishi.set("r1", createMockRikishi({ id: "r1", heyaId: "h1", injured: true }));
      world.rikishi.set("r2", createMockRikishi({ id: "r2", heyaId: "h1", injured: false }));
      world.rikishi.set("r3", createMockRikishi({ id: "r3", heyaId: "h1", injured: true }));
      world.activeRikishiIds = new Set(["r1", "r2", "r3"]);
      const result = projectDashboardUIDigest(world);
      expect(result?.stats.injuredCount).toBe(2);
    });
  });

  describe("projectBanzukeUIDigest", () => {
    it("should return banzuke data", () => {
      const world = createMockWorldState({ year: 2025 }) as any;
      const result = projectBanzukeUIDigest(world);
      expect(result).toBeDefined();
      expect(result.year).toBe(2025);
      expect(result.divisions).toBeDefined();
    });

    it("hasPrevBasho is false when history is empty", () => {
      const world = createMockWorldState({ history: [] }) as any;
      const result = projectBanzukeUIDigest(world);
      expect(result.hasPrevBasho).toBe(false);
    });

    it("kadobanMap defaults to empty object when ozekiKadoban is absent", () => {
      const world = createMockWorldState({ ozekiKadoban: undefined }) as any;
      const result = projectBanzukeUIDigest(world);
      expect(result.kadobanMap).toEqual({});
    });

    it("heyaNameMap contains heya id to name mapping", () => {
      const world = createMockWorldState() as any;
      world.heyas.set("h1", createMockHeya({ id: "h1", name: "Miyagino Stable" }));
      world.heyas.set("h2", createMockHeya({ id: "h2", name: "Arashio Stable" }));
      const result = projectBanzukeUIDigest(world);
      expect(result.heyaNameMap.get("h1")).toBe("Miyagino Stable");
      expect(result.heyaNameMap.get("h2")).toBe("Arashio Stable");
    });
  });
});
