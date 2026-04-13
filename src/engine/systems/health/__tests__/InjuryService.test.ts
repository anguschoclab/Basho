import { describe, it, expect, vi } from "vitest";
import {
  calculateWeeklyInjuryChance,
  rollWeeklyInjury,
  tickWeekInjury,
  tickWeekRecovery,
  onBoutResolvedInjury,
  clearInjury,
  toInjuryEvent,
} from "../InjuryService";
import { SIMULATION_CONFIG } from "../../../core/SimulationConfig";
import { RNGRegistry } from "../../../core/RNGRegistry";
import { rngFromSeed, SeededRNG } from "../../../rng";
import { mockRikishi, makeMockWorld } from "../../../__tests__/utils";
import type { Rikishi } from "../../../types/rikishi";
import type { WorldState } from "../../../types/world";

// Mock config if needed or just use default.
describe("InjuryService", () => {
  describe("calculateWeeklyInjuryChance", () => {
    it("returns base chance when fatigue is 0 and durability is 60", () => {
      const rikishi = mockRikishi("r1", { durability: 60 } as any);
      const chance = calculateWeeklyInjuryChance(rikishi, 0);
      expect(chance).toBeCloseTo(SIMULATION_CONFIG.injuries.weeklyBaseChance * 0.75, 5); // 1.35 - 60/100 = 0.75
    });

    it("increases chance with high fatigue", () => {
      const rikishi = mockRikishi("r1", { durability: 60 } as any);
      const chance = calculateWeeklyInjuryChance(rikishi, 100);
      // fatigueMult = 1 + 100/200 = 1.5
      expect(chance).toBeCloseTo(SIMULATION_CONFIG.injuries.weeklyBaseChance * 1.5 * 0.75, 5);
    });

    it("clamps fatigue at 100", () => {
      const rikishi = mockRikishi("r1", { durability: 60 } as any);
      const chance1 = calculateWeeklyInjuryChance(rikishi, 100);
      const chance2 = calculateWeeklyInjuryChance(rikishi, 150);
      expect(chance1).toEqual(chance2);
    });

    it("clamps durability multiplier between 0.6 and 1.35", () => {
      const rikishiHighDur = mockRikishi("r1", { durability: 100 } as any); // 1.35 - 1.0 = 0.35, clamped to 0.6
      const chanceHigh = calculateWeeklyInjuryChance(rikishiHighDur, 0);
      expect(chanceHigh).toBeCloseTo(SIMULATION_CONFIG.injuries.weeklyBaseChance * 0.6, 5);

      const rikishiLowDur = mockRikishi("r2", { durability: -50 } as any); // 1.35 - (-0.5) = 1.85, clamped to 1.35
      const chanceLow = calculateWeeklyInjuryChance(rikishiLowDur, 0);
      expect(chanceLow).toBeCloseTo(SIMULATION_CONFIG.injuries.weeklyBaseChance * 1.35, 5);
    });
  });

  describe("rollWeeklyInjury", () => {
    it("returns null if rng rolls higher than chance", () => {
      const rng = { next: () => 0.99 } as SeededRNG;
      const rikishi = mockRikishi("r1");
      const result = rollWeeklyInjury({ rng, rikishi, fatigue: 0 });
      expect(result).toBeNull();
    });

    it("returns an injury if rng rolls lower than chance", () => {
      const rng = {
        next: vi.fn()
          .mockReturnValueOnce(0.0001) // pass chance check
          .mockReturnValueOnce(0.5)    // severity minor
          .mockReturnValueOnce(0.5)    // area
          .mockReturnValueOnce(0.5)    // type
          .mockReturnValueOnce(0.5)    // weeks
      } as unknown as SeededRNG;

      const rikishi = mockRikishi("r1");
      const result = rollWeeklyInjury({ rng, rikishi, fatigue: 100 });
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("minor");
    });

    it("returns serious injury correctly", () => {
      const rng = {
        next: vi.fn()
          .mockReturnValueOnce(0.0001) // pass chance check
          .mockReturnValueOnce(0.96)   // severity serious
          .mockReturnValueOnce(0.5)    // area
          .mockReturnValueOnce(0.5)    // type fracture
          .mockReturnValueOnce(0.9)    // max weeks
      } as unknown as SeededRNG;

      const rikishi = mockRikishi("r1");
      const result = rollWeeklyInjury({ rng, rikishi, fatigue: 100 });
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("serious");
      expect(result?.type).toBe("fracture");
      expect(result?.weeksOut).toBeGreaterThanOrEqual(1);
    });
  });

  describe("tickWeekInjury", () => {
    it("skips retired and already injured rikishi", () => {
      const world = makeMockWorld();
      world.rikishi.set("r1", mockRikishi("r1", { isRetired: true }));
      world.rikishi.set("r2", mockRikishi("r2", { injured: true }));

      const impact = tickWeekInjury(world);
      expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
    });

    it("applies injury to active rikishi if rolled", () => {
      const world = makeMockWorld();
      world.rikishi.set("r1", mockRikishi("r1", { fatigue: 100 }));

      // Force an injury
      vi.spyOn(RNGRegistry, "getSystemRNG").mockReturnValue({
        next: vi.fn()
          .mockReturnValueOnce(0.0001) // chance
          .mockReturnValueOnce(0.8)    // moderate
          .mockReturnValueOnce(0.5)
          .mockReturnValueOnce(0.5)
          .mockReturnValueOnce(0.5),
        uuid: () => "IJ-123"
      } as unknown as SeededRNG);

      const impact = tickWeekInjury(world);
      const updates = impact.entities?.rikishiUpdates?.get("r1");
      expect(updates).toBeDefined();
      expect(updates?.injured).toBe(true);
      expect(updates?.injuryWeeksRemaining).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });
  });

  describe("tickWeekRecovery", () => {
    it("skips retired and uninjured rikishi", () => {
      const world = makeMockWorld();
      world.rikishi.set("r1", mockRikishi("r1", { injured: false }));

      const impact = tickWeekRecovery(world);
      expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
    });

    it("processes recovery for injured rikishi", () => {
      const world = makeMockWorld();
      world.rikishi.set("r1", mockRikishi("r1", { injured: true, injuryWeeksRemaining: 1 }));

      const impact = tickWeekRecovery(world);
      const updates = impact.entities?.rikishiUpdates?.get("r1");
      expect(updates).toBeDefined();
      expect(updates?.injured).toBe(false);
      expect(updates?.injuryWeeksRemaining).toBe(0);
    });
  });

  describe("onBoutResolvedInjury", () => {
    it("returns empty impact if no result", () => {
      const world = makeMockWorld();
      const impact = onBoutResolvedInjury(world, { match: {}, result: null, east: null, west: null });
      expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
    });

    it("returns empty impact if loser is already injured", () => {
      const world = makeMockWorld();
      const east = mockRikishi("e1", { injured: true });
      const west = mockRikishi("w1", { injured: false });
      const result = { winner: "west", kimarite: "yorikiri" };

      const impact = onBoutResolvedInjury(world, { match: {}, result, east, west });
      expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
    });

    it("applies bout injury based on violent kimarite", () => {
      const world = makeMockWorld();
      const east = mockRikishi("e1", { injured: false });
      const west = mockRikishi("w1", { injured: false });
      const result = { winner: "west", kimarite: "uwatenage" }; // violent

      vi.spyOn(RNGRegistry, "getSystemRNG").mockReturnValue({
        next: vi.fn()
          .mockReturnValueOnce(0.01) // < 0.04 boutInjuryChance
          .mockReturnValueOnce(0.5), // weeks
        uuid: () => "IJ-123"
      } as unknown as SeededRNG);

      const impact = onBoutResolvedInjury(world, { match: {}, result, east, west });
      const updates = impact.entities?.rikishiUpdates?.get("e1");
      expect(updates).toBeDefined();
      expect(updates?.injured).toBe(true);
      expect(updates?.injuryWeeksRemaining).toBeGreaterThanOrEqual(1);

      vi.restoreAllMocks();
    });
  });

  describe("clearInjury", () => {
    it("creates impact to clear injury", () => {
      const impact = clearInjury("r1");
      const updates = impact.entities?.rikishiUpdates?.get("r1");
      expect(updates).toBeDefined();
      expect(updates?.injured).toBe(false);
      expect(updates?.injuryWeeksRemaining).toBe(0);
    });
  });

  describe("toInjuryEvent", () => {
    it("returns null if not injured or no currentInjury", () => {
      expect(toInjuryEvent({ injured: false })).toBeNull();
      expect(toInjuryEvent({ injured: true })).toBeNull();
    });

    it("returns formatted event when injured", () => {
      const rikishi = {
        id: "r1",
        injured: true,
        currentInjury: {
          severity: "moderate",
          weeksOut: 3
        }
      };

      const event = toInjuryEvent(rikishi);
      expect(event).toEqual({
        type: "INJURY",
        rikishiId: "r1",
        severity: "moderate",
        weeksOut: 3
      });
    });
  });
});
