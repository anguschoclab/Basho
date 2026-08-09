import { describe, it, expect, vi } from "vitest";
import { phase01_week_health } from "@/engine/tick/phases/phase01_week_health";
import { applyImpact } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState, ActiveModifiers } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD } from "@/constants/engine/condition";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { SeededRNG } from "@/engine/rng";

describe("phase01_week_health", () => {
  describe("recoveryMultiplier wiring", () => {
    function makeActiveModifiers(recoveryMultiplier: number): ActiveModifiers {
      return {
        facilityGrowthMult: 1.0,
        nutritionMult: 1.0,
        degeikoMult: 1.0,
        styleDriftMults: {
          power: 1.0,
          speed: 1.0,
          technique: 1.0,
          balance: 1.0,
          stamina: 1.0,
          mental: 1.0,
        },
        recoveryMultiplier,
        financialPenalty: false,
        moraleBoost: false,
      };
    }

    function makeHeya(id: string): any {
      return {
        id,
        name: `${id} name`,
        oyakataId: `oy-${id}`,
        rikishiIds: [],
        bankBalance: 1000,
        funds: 1000,
        reputation: 50,
        prestige: 50,
        scandalScore: 0,
        statureBand: "mid",
        prestigeBand: "mid",
        facilitiesBand: "mid",
        koenkaiBand: "mid",
        runwayBand: "mid",
        facilities: { training: 50, recovery: 50, nutrition: 50 },
      };
    }

    function makeInjuredRikishi(id: string, heyaId: string, weeksRemaining: number): Rikishi {
      return MockFactory.createRikishi(id, {
        heyaId,
        birthYear: 2000,
        injured: true,
        injuryWeeksRemaining: weeksRemaining,
        injuryStatus: {
          type: "strain",
          severity: "moderate",
          weeksRemaining,
          weeksToHeal: weeksRemaining,
        } as any,
      } as any);
    }

    function buildWorldWithInjuredRikishi(
      recoveryMultiplier: number,
      weeksRemaining: number
    ): WorldState {
      const r = makeInjuredRikishi("r1", "heya-1", weeksRemaining);

      const rikishiMap = new Map<string, Rikishi>();
      rikishiMap.set("r1", r);

      const heyasMap = new Map<string, any>();
      heyasMap.set("heya-1", makeHeya("heya-1"));

      const w = MockFactory.createWorld({
        playerHeyaId: "heya-1",
        rikishi: rikishiMap,
        heyas: heyasMap,
        activeRikishiIds: new Set(["r1"]),
        year: 2026,
        week: 1,
        cyclePhase: "interim",
      });

      w.transientContext = { activeModifiers: makeActiveModifiers(recoveryMultiplier) };
      return w;
    }

    it("uses recoveryMultiplier from activeModifiers for recovery speed", () => {
      // With recoveryMultiplier = 1.0 (and staff medical default ~1.0),
      // recovery should reduce by 1 week (single week reduction)
      const w = buildWorldWithInjuredRikishi(1.0, 4);
      const impact = phase01_week_health(w);
      const updated = applyImpact(w, impact);

      const r = updated.rikishi.get("r1")!;
      expect(r.injuryWeeksRemaining).toBe(3); // 4 - 1 = 3
    });

    it("high recoveryMultiplier triggers double-week reduction", () => {
      // With recoveryMultiplier >= RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD (1.2),
      // combined with staff medical (~1.0), the effective mult should trigger double reduction.
      // We need effectiveRecoveryMult >= 1.2, so set recoveryMultiplier to 1.2
      // (staff medical defaults to 1.0 with no medical staff)
      const w = buildWorldWithInjuredRikishi(RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD, 4);
      const impact = phase01_week_health(w);
      const updated = applyImpact(w, impact);

      const r = updated.rikishi.get("r1")!;
      expect(r.injuryWeeksRemaining).toBe(2); // 4 - 2 = 3 (double reduction)
    });

    it("falls back to default when activeModifiers is not set", () => {
      const r = makeInjuredRikishi("r1", "heya-1", 4);
      const rikishiMap = new Map<string, Rikishi>();
      rikishiMap.set("r1", r);

      const heyasMap = new Map<string, any>();
      heyasMap.set("heya-1", makeHeya("heya-1"));

      const w = MockFactory.createWorld({
        playerHeyaId: "heya-1",
        rikishi: rikishiMap,
        heyas: heyasMap,
        activeRikishiIds: new Set(["r1"]),
        year: 2026,
        week: 1,
        cyclePhase: "interim",
      });

      // No transientContext.activeModifiers
      const impact = phase01_week_health(w);
      const updated = applyImpact(w, impact);

      const rUpdated = updated.rikishi.get("r1")!;
      expect(rUpdated.injuryWeeksRemaining).toBe(3); // Default: single week reduction
    });
  });

  describe("processInjuryRoll wiring", () => {
    function buildWorld(rikishi: Rikishi, cyclePhase = "interim"): WorldState {
      const rikishiMap = new Map<string, Rikishi>();
      rikishiMap.set(rikishi.id, rikishi);

      const heyasMap = new Map<string, any>();
      heyasMap.set(rikishi.heyaId, {
        id: rikishi.heyaId,
        facilities: { training: 50, recovery: 50, nutrition: 50 },
      });

      const w = MockFactory.createWorld({
        playerHeyaId: rikishi.heyaId,
        rikishi: rikishiMap,
        heyas: heyasMap,
        activeRikishiIds: new Set([rikishi.id]),
        year: 2026,
        week: 1,
        cyclePhase: cyclePhase as any,
      });
      return w;
    }

    it("applies new injury to uninjured rikishi when roll is successful (interim)", () => {
      const rikishi = MockFactory.createRikishi("r1", {
        heyaId: "heya-1",
        injured: false,
        fatigue: 100,
        durability: 50,
      } as any);

      const world = buildWorld(rikishi);

      vi.spyOn(RNGRegistry, "getSystemRNG").mockReturnValue({
        next: vi
          .fn()
          .mockReturnValueOnce(0.0) // passes chance check
          .mockReturnValueOnce(0.5) // severity minor
          .mockReturnValueOnce(0.5) // area
          .mockReturnValueOnce(0.5) // type
          .mockReturnValueOnce(0.5), // weeks
        uuid: () => "IJ-123",
      } as unknown as SeededRNG);

      const impact = phase01_week_health(world);
      const updated = applyImpact(world, impact);

      const rUpdated = updated.rikishi.get("r1")!;
      expect(rUpdated.injured).toBe(true);
      expect(rUpdated.injuryWeeksRemaining).toBeGreaterThan(0);
      expect(rUpdated.currentInjury).toBeDefined();
      expect(rUpdated.currentInjury?.id).toBe("IJ-123");

      vi.restoreAllMocks();
    });

    it("does not apply new injury when roll fails (interim)", () => {
      const rikishi = MockFactory.createRikishi("r1", {
        heyaId: "heya-1",
        injured: false,
        fatigue: 0,
      } as any);

      const world = buildWorld(rikishi);

      vi.spyOn(RNGRegistry, "getSystemRNG").mockReturnValue({
        next: vi.fn().mockReturnValue(0.99), // fails chance check
        uuid: () => "IJ-123",
      } as unknown as SeededRNG);

      const impact = phase01_week_health(world);
      const updated = applyImpact(world, impact);

      const rUpdated = updated.rikishi.get("r1")!;
      expect(rUpdated.injured).toBe(false);
      expect(rUpdated.currentInjury).toBeUndefined();

      vi.restoreAllMocks();
    });

    it("does not roll for injury during active_basho", () => {
      const rikishi = MockFactory.createRikishi("r1", {
        heyaId: "heya-1",
        injured: false,
        fatigue: 100,
      } as any);

      const world = buildWorld(rikishi, "active_basho");

      const getSystemRNGSpy = vi.spyOn(RNGRegistry, "getSystemRNG");

      const impact = phase01_week_health(world);
      const updated = applyImpact(world, impact);

      const rUpdated = updated.rikishi.get("r1")!;
      expect(rUpdated.injured).toBe(false);
      expect(rUpdated.currentInjury).toBeUndefined();

      // Should not even get the RNG since it skips the roll
      expect(getSystemRNGSpy).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });
});
