import { describe, it, expect, beforeEach } from "vitest";
import { bandIndex, updateStatureBand, runPrestigeDecay } from "@/engine/prestige/prestigeSystem";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import { mockRikishi } from "../utils";
import { clearQueryCaches } from "@/engine/queries";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

describe("Prestige System", () => {
  let world: WorldState;
  let heya: Heya;

  beforeEach(() => {
    clearQueryCaches(); // Clear memoization cache between tests
    world = {
      id: "world-1",
      heyas: new Map(),
      rikishi: new Map(),
      history: [],
      dayIndexGlobal: 0,
    } as unknown as WorldState;
    heya = {
      id: "heya-1",
      name: "Test Heya",
      statureBand: "new",
      prestigeBand: "unknown",
      reputation: 50,
      funds: 10000,
      oyakataId: "oyakata-1",
      isActive: true,
      facilities: { level: 1, condition: 100 },
      fanbase: 100,
      monthlyExpenses: 1000,
      rikishiIds: [],
    } as unknown as Heya;
    world.heyas.set(heya.id, heya);
  });

  describe("bandIndex", () => {
    it("returns correct indices for prestige bands", () => {
      expect(bandIndex("unknown")).toBe(0);
      expect(bandIndex("struggling")).toBe(1);
      expect(bandIndex("modest")).toBe(2);
      expect(bandIndex("respected")).toBe(3);
      expect(bandIndex("elite")).toBe(4);
      expect(bandIndex("nonexistent" as any)).toBe(-1);
    });
  });

  describe("updateStatureBand", () => {
    it('sets stature to "new" for empty or small rosters (<3)', () => {
      const r1 = mockRikishi("r1", { heyaId: heya.id, rank: "jonokuchi" });
      world.rikishi.set(r1.id, r1);
      heya.rikishiIds = [r1.id];
      updateStatureBand(world, heya);
      expect(heya.statureBand).toBe("new");
    });

    it('sets stature to "fragile" for basic small rosters (>=3, low score)', () => {
      for (let i = 0; i < 3; i++) {
        const r = mockRikishi(`r${i}`, { heyaId: heya.id, rank: "jonokuchi" });
        world.rikishi.set(r.id, r);
        heya.rikishiIds?.push(r.id);
      }
      updateStatureBand(world, heya);
      expect(heya.statureBand).toBe("fragile");
    });

    it('sets stature to "rebuilding" for average score >= 10', () => {
      for (let i = 0; i < 3; i++) {
        const r = mockRikishi(`r${i}`, { heyaId: heya.id, rank: "juryo" }); // weight 15
        world.rikishi.set(r.id, r);
        heya.rikishiIds?.push(r.id);
      }
      updateStatureBand(world, heya);
      expect(heya.statureBand).toBe("rebuilding");
    });

    it('sets stature to "established" for average score >= 20', () => {
      for (let i = 0; i < 3; i++) {
        const r = mockRikishi(`r${i}`, { heyaId: heya.id, rank: "maegashira" }); // weight 30
        world.rikishi.set(r.id, r);
        heya.rikishiIds?.push(r.id);
      }
      updateStatureBand(world, heya);
      expect(heya.statureBand).toBe("established");
    });

    it('sets stature to "powerful" for max weight >= 60 and average score >= 30', () => {
      world.rikishi.set("r1", mockRikishi("r1", { heyaId: heya.id, rank: "sekiwake" })); // weight 60
      world.rikishi.set("r2", mockRikishi("r2", { heyaId: heya.id, rank: "maegashira" })); // weight 30
      heya.rikishiIds = ["r1", "r2"];
      // avg = 45
      updateStatureBand(world, heya);
      expect(heya.statureBand).toBe("powerful");
    });

    it('sets stature to "legendary" for max weight >= 100 and average score >= 40', () => {
      world.rikishi.set("r1", mockRikishi("r1", { heyaId: heya.id, rank: "yokozuna" })); // weight 100
      world.rikishi.set("r2", mockRikishi("r2", { heyaId: heya.id, rank: "maegashira" })); // weight 30
      heya.rikishiIds = ["r1", "r2"];
      // avg = 65
      updateStatureBand(world, heya);
      expect(heya.statureBand).toBe("legendary");
    });
  });

  describe("runPrestigeDecay", () => {
    it("does nothing if there is no basho history", () => {
      world.history = [];
      const initialBand = heya.prestigeBand;
      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      expect(resolvedWorld.heyas.get(heya.id)!.prestigeBand).toBe(initialBand);
    });

    it("increases prestige for yusho", () => {
      heya.prestigeBand = "modest";
      const r1 = mockRikishi("r1", {
        heyaId: heya.id,
        currentBashoWins: 15,
        currentBashoLosses: 0,
      });
      world.rikishi.set(r1.id, r1);
      heya.rikishiIds = [r1.id];

      world.history = [
        {
          year: 2024,
          month: 1,
          yusho: r1.id,
          junYusho: [],
          ginoSho: null,
          kantosho: null,
          shukunsho: null,
          bouts: [],
        } as any,
      ];

      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      const resolvedHeya = resolvedWorld.heyas.get(heya.id)!;
      expect(resolvedHeya.prestigeBand).toBe("elite"); // Shift +2: modest(2) -> elite(4)
      expect(resolvedHeya.reputation).toBe(60); // 50 + 10
    });

    it("increases prestige for jun-yusho", () => {
      heya.prestigeBand = "struggling";
      const r1 = mockRikishi("r1", {
        heyaId: heya.id,
        currentBashoWins: 14,
        currentBashoLosses: 1,
      });
      world.rikishi.set(r1.id, r1);
      heya.rikishiIds = [r1.id];

      world.history = [
        {
          year: 2024,
          month: 1,
          yusho: "other",
          junYusho: [r1.id],
          ginoSho: null,
          kantosho: null,
          shukunsho: null,
          bouts: [],
        } as any,
      ];

      // Small roster < 5 penalty applies (-1). Junyusho gives (+1). Net shift: 0
      // Let's add 4 more so small roster penalty doesn't apply
      for (let i = 2; i <= 5; i++) {
        const r = mockRikishi(`r${i}`, {
          heyaId: heya.id,
          currentBashoWins: 8,
          currentBashoLosses: 7,
        });
        world.rikishi.set(r.id, r);
        heya.rikishiIds.push(r.id);
      }
      heya.prestigeBand = "struggling"; // Reset

      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      const resolvedHeya = resolvedWorld.heyas.get(heya.id)!;

      // Shift +1: struggling(1) -> modest(2)
      // total bouts = 15 + 4*15 = 75. win rate = 46/75 > 0.55
      expect(resolvedHeya.prestigeBand).toBe("modest");
    });

    it("decreases prestige for terrible basho (<0.3 win rate)", () => {
      heya.prestigeBand = "respected";
      for (let i = 1; i <= 5; i++) {
        const r = mockRikishi(`r${i}`, {
          heyaId: heya.id,
          currentBashoWins: 3,
          currentBashoLosses: 12,
        });
        world.rikishi.set(r.id, r);
        heya.rikishiIds?.push(r.id);
      }

      world.history = [
        {
          year: 2024,
          month: 1,
          yusho: "other",
          junYusho: [],
          ginoSho: null,
          kantosho: null,
          shukunsho: null,
          bouts: [],
        } as any,
      ];

      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      const resolvedHeya = resolvedWorld.heyas.get(heya.id)!;

      // Win rate: 15 / 75 = 0.2
      // Penalty: < 0.4 (-1), < 0.3 (-1) => -2
      expect(resolvedHeya.prestigeBand).toBe("struggling"); // respected(3) -> struggling(1)
      expect(resolvedHeya.reputation).toBe(40); // 50 - 10
    });

    it("erodes elite prestige for average performance without titles", () => {
      heya.prestigeBand = "elite";
      // Make them sekitori so they don't fail the sekitori check
      for (let i = 1; i <= 5; i++) {
        const r = mockRikishi(`r${i}`, {
          heyaId: heya.id,
          currentBashoWins: 7,
          currentBashoLosses: 8,
          division: "makuuchi",
        });
        world.rikishi.set(r.id, r);
        heya.rikishiIds?.push(r.id);
      }

      world.history = [
        {
          year: 2024,
          month: 1,
          yusho: "other",
          junYusho: [],
          ginoSho: null,
          kantosho: null,
          shukunsho: null,
          bouts: [],
        } as any,
      ];

      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      const resolvedHeya = resolvedWorld.heyas.get(heya.id)!;

      // Win rate: 35 / 75 = 0.46
      // < 0.55 (-1) for elite without yusho/jun-yusho
      expect(resolvedHeya.prestigeBand).toBe("respected");
    });

    it("severely erodes elite prestige if no sekitori", () => {
      heya.prestigeBand = "elite";
      // Non-sekitori
      for (let i = 1; i <= 5; i++) {
        const r = mockRikishi(`r${i}`, {
          heyaId: heya.id,
          currentBashoWins: 8,
          currentBashoLosses: 7,
          division: "makushita",
        });
        world.rikishi.set(r.id, r);
        heya.rikishiIds?.push(r.id);
      }

      world.history = [
        {
          year: 2024,
          month: 1,
          yusho: "other",
          junYusho: [],
          ginoSho: null,
          kantosho: null,
          shukunsho: null,
          bouts: [],
        } as any,
      ];

      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      const resolvedHeya = resolvedWorld.heyas.get(heya.id)!;

      // Win rate: 40 / 75 = 0.53
      // Elite penalty: no sekitori (-1), winRate < 0.55 (-1) -> net -2
      expect(resolvedHeya.prestigeBand).toBe("modest");
    });

    it("penalizes small rosters", () => {
      heya.prestigeBand = "respected";
      // Only 2 wrestlers
      for (let i = 1; i <= 2; i++) {
        const r = mockRikishi(`r${i}`, {
          heyaId: heya.id,
          currentBashoWins: 8,
          currentBashoLosses: 7,
        });
        world.rikishi.set(r.id, r);
        heya.rikishiIds.push(r.id);
      }

      world.history = [
        {
          year: 2024,
          month: 1,
          yusho: "other",
          junYusho: [],
          ginoSho: null,
          kantosho: null,
          shukunsho: null,
          bouts: [],
        } as any,
      ];

      const impact = runPrestigeDecay(world);
      const resolvedWorld = resolveImpacts(world, [impact]);
      const resolvedHeya = resolvedWorld.heyas.get(heya.id)!;

      // Small roster < 5 penalty (-1)
      expect(resolvedHeya.prestigeBand).toBe("modest");
    });
  });
});
